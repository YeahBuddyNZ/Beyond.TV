package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;

/**
 * Bedtime breathing: a night light that breathes with the kids as they wind down, then fades to dark. Same as
 * web/bedtime.js on LG and Samsung.
 *
 * A soft violet light in the middle of a black screen grows as you breathe in and shrinks as you breathe out. It
 * starts at six breaths a minute and slows to about four and a half, because a body follows a slow rhythm down. The
 * words stay for the first few breaths, then the light is on its own. Over the last part it dims, and when the time is
 * up the screen is dark and the TV may sleep. Any key brings the home screen back.
 *
 * Opened from the moon button on the home screen at night, or by a "bedtime" command from Beyond Family.
 */
public class BedtimeActivity extends Activity {
    private static final String MINUTES = "minutes";
    private static final float FAST = 10_000, SLOW = 13_300;   // one breath: six a minute, slowing to four and a half
    private static final int WORDS_FOR = 6;                     // breaths with the words before the light is alone
    private static final float DIM_FROM = 0.6f;                 // the last 40% of the time, the light dims to nothing
    private static final float INHALE = 0.4f;                   // of each breath

    static void open(Context c, int minutes) {
        c.startActivity(new Intent(c, BedtimeActivity.class).putExtra(MINUTES, minutes)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        int minutes = Math.max(5, Math.min(60, getIntent().getIntExtra(MINUTES, 15)));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(new Light(this, minutes * 60_000L));
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        recreate();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getAction() == KeyEvent.ACTION_UP) finish();
        return true;
    }

    private final class Light extends View {
        private final long total, began = SystemClock.uptimeMillis() + 1200;
        private final float k;
        private final Paint light = new Paint(Paint.ANTI_ALIAS_FLAG), glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint words = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final String in = Ui.tr("Inspire", "Breathe in", "Inhala"), out = Ui.tr("Expire", "Breathe out", "Exhala");
        // The breath we're in: when it started, how long it is, how bright, and which one.
        private long breathAt;
        private float period, bright;
        private int breaths;
        private boolean dark;

        Light(Context c, long total) {
            super(c);
            this.total = total;
            k = c.getResources().getDisplayMetrics().widthPixels / 1920f;
            setBackgroundColor(Color.BLACK);
            words.setTypeface(Ui.light);
            words.setTextSize(40 * k);
            words.setTextAlign(Paint.Align.CENTER);
            words.setLetterSpacing(0.04f);
            setKeepScreenOn(true);
        }

        @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
            // Drawn at full size and scaled, so the gradients are made once.
            light.setShader(new RadialGradient(0, 0, 210 * k,
                    new int[] {Color.argb(242, 196, 170, 255), Color.argb(191, 122, 79, 208), Color.argb(0, 110, 61, 219)},
                    new float[] {0, 0.45f / 0.72f, 1}, Shader.TileMode.CLAMP));
            glow.setShader(new RadialGradient(0, 0, 550 * k * 0.65f,
                    new int[] {Color.argb(89, 122, 79, 208), Color.argb(0, 110, 61, 219)}, null, Shader.TileMode.CLAMP));
        }

        /** Smooth both ways, like CSS ease-in-out. */
        private float ease(float t) {
            t = Ui.clamp(t);
            return t * t * (3 - 2 * t);
        }

        @Override protected void onDraw(Canvas c) {
            long now = SystemClock.uptimeMillis();
            if (now < began) {
                postInvalidateOnAnimation();
                return;
            }
            if (breathAt == 0 || now - breathAt >= period) nextBreath(now);
            if (dark) return;
            float t = (now - breathAt) / period;
            // 0 = breathed out (small, dim), 1 = breathed in (big, bright).
            float f = t < INHALE ? ease(t / INHALE) : 1 - ease((t - INHALE) / (1 - INHALE));
            float cx = getWidth() / 2f, cy = getHeight() / 2f;
            glow.setAlpha(Math.round(255 * bright * (0.25f + 0.30f * f)));
            float gs = 0.7f + 0.45f * f;
            c.save();
            c.translate(cx, cy);
            c.scale(gs, gs);
            c.drawCircle(0, 0, 550 * k * 0.65f, glow);
            c.restore();
            light.setAlpha(Math.round(255 * bright * (0.55f + 0.40f * f)));
            float ls = 0.62f + 0.38f * f;
            c.save();
            c.translate(cx, cy);
            c.scale(ls, ls);
            c.drawCircle(0, 0, 210 * k, light);
            c.restore();
            if (breaths <= WORDS_FOR) {
                // Each word fades in a moment after its half of the breath starts.
                boolean inhaling = t < INHALE;
                float since = (inhaling ? t : t - INHALE) * period;
                float a = Ui.clamp((since - 400) / 800) * 0.75f;
                words.setColor(Color.argb(Math.round(255 * a), 0xD9, 0xCC, 0xFF));
                c.drawText(inhaling ? in : out, cx, getHeight() - 170 * k, words);
            }
            postInvalidateOnAnimation();
        }

        private void nextBreath(long now) {
            float done = (now - began) / (float) total;
            if (done >= 1) {
                dark = true;
                setKeepScreenOn(false);
                BedtimeActivity.this.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                return;
            }
            period = FAST + (SLOW - FAST) * Math.min(1, done / DIM_FROM);
            bright = done < DIM_FROM ? 1 : Math.max(0, 1 - (done - DIM_FROM) / (1 - DIM_FROM));
            breathAt = now;
            breaths++;
        }
    }
}
