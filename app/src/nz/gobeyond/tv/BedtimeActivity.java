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
import android.content.SharedPreferences;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Random;

/**
 * Bedtime (bedtime mode, ADR 0063): a night light that breathes with the kids as they wind down, a calm sound, then
 * the TV turns itself off. Same as web/bedtime.js on LG and Samsung.
 *
 * First a short pick on the remote: a sound (rain, waves, a fan, or quiet, heard as it's picked) and how long (15, 30
 * or 45 minutes), then Goodnight; the choice is kept for next time. A soft violet light in the middle of a black
 * screen grows as you breathe in and shrinks as you breathe out. It starts at six breaths a minute and slows to about
 * four and a half, because a body follows a slow rhythm down; the waves rise and fall with it. The words stay for the
 * first few breaths, then the light is on its own. Over the last part the light and the sound fade, and when the time
 * is up the TV turns off through its own ADB, like the sleep timer (Sleep.offNow). Any key before then brings the
 * home screen back. The sounds are made here (filtered noise in an AudioTrack): nothing downloaded, nothing licensed.
 *
 * Opened from the moon button on the home screen at night, Games or Find (the pick), or by a "bedtime" command from
 * Beyond Family, which says how long and gets the sound picked last.
 */
public class BedtimeActivity extends Activity {
    private static final String MINUTES = "minutes";
    private static final float FAST = 10_000, SLOW = 13_300;   // one breath: six a minute, slowing to four and a half
    private static final int WORDS_FOR = 6;                     // breaths with the words before the light is alone
    private static final float DIM_FROM = 0.6f;                 // the last 40% of the time, the light and sound fade
    private static final float INHALE = 0.4f;                   // of each breath
    static final String[] SOUNDS = {"rain", "waves", "fan", "quiet"};
    static final int[] LENGTHS = {15, 30, 45};

    /** minutes > 0 starts straight away (Beyond Family); 0 asks first: a sound and how long. */
    static void open(Context c, int minutes) {
        c.startActivity(new Intent(c, BedtimeActivity.class).putExtra(MINUTES, minutes)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
    }

    private float k;
    private Light light;
    private Calm calm, preview;
    private String sound;
    private int minutes;
    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable endPreview = () -> {
        if (preview != null) preview.finish();
        preview = null;
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        SharedPreferences p = getSharedPreferences("bedtime", MODE_PRIVATE);
        sound = p.getString("sound", "rain");
        if (indexOf(SOUNDS, sound) < 0) sound = "rain";
        minutes = p.getInt("minutes", 15);
        if (indexOf(LENGTHS, minutes) < 0) minutes = 15;
        int asked = getIntent().getIntExtra(MINUTES, 0);
        if (asked > 0) begin(Math.max(5, Math.min(60, asked)));
        else pick();
    }

    private static int indexOf(String[] a, String v) {
        for (int i = 0; i < a.length; i++) if (a[i].equals(v)) return i;
        return -1;
    }

    private static int indexOf(int[] a, int v) {
        for (int i = 0; i < a.length; i++) if (a[i] == v) return i;
        return -1;
    }

    private static String soundName(String s) {
        switch (s) {
            case "rain": return Ui.tr("Chuva", "Rain", "Lluvia");
            case "waves": return Ui.tr("Ondas", "Waves", "Olas");
            case "fan": return Ui.tr("Ventilador", "Fan", "Ventilador");
            default: return Ui.tr("Silêncio", "Quiet", "Silencio");
        }
    }

    // MARK: - The pick

    /** A sound (heard as it's picked), how long, then Goodnight. Same as Bedtime.choose in web/bedtime.js. */
    private void pick() {
        pick(null);
    }

    private void pick(String focus) {
        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1500 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(120 * k);
        root.addView(column, lp);

        column.addView(FeedbackActivity.text(this, Ui.emoji("🌙") + " " + Ui.tr("Hora de dormir", "Bedtime", "Hora de dormir"),
                Ui.displaySemibold, 64 * k, 0xFFFFFFFF));
        TextView sub = FeedbackActivity.text(this, Ui.tr("A tela escurece, um som calmo toca e a TV se desliga sozinha.",
                "The screen dims, a calm sound plays, then the TV turns itself off.",
                "La pantalla se oscurece, suena algo tranquilo y la tele se apaga sola."), Ui.regular, 32 * k, 0xCCFFFFFF);
        sub.setPadding(0, Math.round(16 * k), 0, Math.round(20 * k));
        column.addView(sub);

        View want = null;
        LinearLayout sounds = row(column, Ui.tr("Som", "Sound", "Sonido"));
        for (String s : SOUNDS) {
            Button b = choice(sounds, soundName(s), s.equals(sound));
            b.setOnClickListener(v -> {
                sound = s;
                hear(s);
                pick("s:" + s);
            });
            if (("s:" + s).equals(focus)) want = b;
        }
        LinearLayout lengths = row(column, Ui.tr("Por quanto tempo", "For how long", "Cuánto tiempo"));
        for (int m : LENGTHS) {
            Button b = choice(lengths, m + " min", m == minutes);
            b.setOnClickListener(v -> {
                minutes = m;
                pick("m:" + m);
            });
            if (("m:" + m).equals(focus)) want = b;
        }
        Button go = FeedbackActivity.button(this, Ui.tr("Boa noite", "Goodnight", "Buenas noches"), k, true);
        go.setOnClickListener(v -> {
            getSharedPreferences("bedtime", MODE_PRIVATE).edit().putString("sound", sound).putInt("minutes", minutes).apply();
            begin(minutes);
        });
        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(-2, Math.round(88 * k));
        gp.topMargin = Math.round(60 * k);
        column.addView(go, gp);
        setContentView(root);
        (want != null ? want : go).requestFocus();
    }

    private LinearLayout row(LinearLayout column, String label) {
        TextView l = FeedbackActivity.text(this, label, Ui.semibold, 28 * k, 0xB3FFFFFF);
        l.setPadding(0, Math.round(40 * k), 0, Math.round(18 * k));
        column.addView(l);
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_HORIZONTAL);
        column.addView(row, new LinearLayout.LayoutParams(-1, -2));
        return row;
    }

    /** The one picked carries a tick. */
    private Button choice(LinearLayout row, String label, boolean picked) {
        Button b = FeedbackActivity.button(this, (picked ? "✓  " : "") + label, k, false);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(80 * k));
        bp.leftMargin = bp.rightMargin = Math.round(10 * k);
        row.addView(b, bp);
        return b;
    }

    private void hear(String s) {
        handler.removeCallbacks(endPreview);
        if (preview != null) preview.finish();
        preview = Calm.make(s);
        if (preview == null) return;
        preview.level(0.8f);
        handler.postDelayed(endPreview, 3500);
    }

    // MARK: - Bedtime

    private void begin(int minutes) {
        handler.removeCallbacks(endPreview);
        endPreview.run();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        calm = Calm.make(sound);
        if (calm != null) calm.level(0.5f);
        light = new Light(this, minutes * 60_000L);
        setContentView(light);
    }

    /** The time is up: quiet, dark, and the TV off. */
    private void end() {
        if (calm != null) calm.finish();
        calm = null;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Sleep.offNow(getApplicationContext(), "bedtime", null);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        recreate();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        // The pick is a screen like any other; once bedtime has begun, any key brings the TV back.
        if (light == null) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_UP) finish();
        return true;
    }

    @Override protected void onStop() {
        super.onStop();
        // Gone from the screen (Home, or the TV asleep): no sound left playing behind.
        handler.removeCallbacks(endPreview);
        endPreview.run();
        if (calm != null) calm.finish();
        calm = null;
        if (light != null) finish();
    }

    /**
     * Calm sounds made here: a 22 kHz stream of noise, shaped by a soft low-pass. Rain is pink noise, waves and the fan
     * brown noise (deeper); the level glides to what Bedtime asks (the waves follow each breath). Same sounds as
     * calm() in web/bedtime.js.
     */
    static final class Calm extends Thread {
        private static final int RATE = 22_050;
        private static final float LOUD = 0.32f;
        private final String kind;
        private volatile float want;
        private volatile boolean stop;

        static Calm make(String kind) {
            if (kind == null || "quiet".equals(kind) || indexOf(SOUNDS, kind) < 0) return null;
            Calm c = new Calm(kind);
            c.start();
            return c;
        }

        private Calm(String kind) {
            super("bedtime-sound");
            this.kind = kind;
            setDaemon(true);
        }

        /** 0 to 1; the sound glides there in about half a second. */
        void level(float v) { want = Ui.clamp(v); }

        /** Fades out and stops. */
        void finish() { stop = true; }

        @Override public void run() {
            AudioTrack t;
            try {
                int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
                t = new AudioTrack(AudioManager.STREAM_MUSIC, RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT,
                        Math.max(min, 8192), AudioTrack.MODE_STREAM);
                if (t.getState() != AudioTrack.STATE_INITIALIZED) {
                    t.release();
                    return;
                }
                t.play();
            } catch (RuntimeException e) {
                AppLog.w("bedtime sound: " + e.getMessage());
                return;
            }
            boolean rain = "rain".equals(kind);
            float cut = rain ? 0.8f : "waves".equals(kind) ? 0.3f : 0.16f;
            short[] buf = new short[1024];
            Random r = new Random();
            float b0 = 0, b1 = 0, b2 = 0, brown = 0, lp = 0, level = 0;
            try {
                while (!stop || level > 0.002f) {
                    float target = stop ? 0 : want;
                    for (int i = 0; i < buf.length; i++) {
                        float w = r.nextFloat() * 2 - 1, x;
                        if (rain) {
                            b0 = 0.99765f * b0 + w * 0.0990460f;
                            b1 = 0.96300f * b1 + w * 0.2965164f;
                            b2 = 0.57000f * b2 + w * 1.0526913f;
                            x = (b0 + b1 + b2 + w * 0.1848f) * 0.16f;
                        } else {
                            brown = (brown + 0.02f * w) / 1.02f;
                            x = brown * 3.2f;
                        }
                        lp += cut * (x - lp);
                        level += (target - level) * (stop ? 0.0003f : 0.00008f);
                        buf[i] = (short) Math.max(-32767, Math.min(32767, lp * level * LOUD * 32767));
                    }
                    t.write(buf, 0, buf.length);
                }
            } finally {
                try {
                    t.stop();
                } catch (RuntimeException ignored) {
                }
                t.release();
            }
        }
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
            if (calm != null) calm.level("waves".equals(sound) ? bright * (0.35f + 0.65f * f) : bright);
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
                end();
                return;
            }
            period = FAST + (SLOW - FAST) * Math.min(1, done / DIM_FROM);
            bright = done < DIM_FROM ? 1 : Math.max(0, 1 - (done - DIM_FROM) / (1 - DIM_FROM));
            breathAt = now;
            breaths++;
        }
    }
}
