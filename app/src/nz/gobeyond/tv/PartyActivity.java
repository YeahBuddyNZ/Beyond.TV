package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Party mode: a disco or a birthday. Coloured lights sweep the screen and pulse on the beat of music the TV makes
 * itself (PartyMusic), with a mirror ball's sparkles. A birthday opens with the Happy Birthday tune, the person's
 * name and a cake. Same as web/party.js on LG and Samsung (ADR 0016).
 *
 * With a Beyond Home box, the room's lights join in: the TV asks for the Party moment at every chord change (every
 * two seconds), passing the beat so the colours move on, and for Party over when it ends. The room is the first one
 * with a Party moment, which is the one with this TV in it on most houses (the box lists rooms with a TV first).
 *
 * Started by a "party" command from Beyond Family; "party-end" or any key stops it, and so does its time running out.
 */
public class PartyActivity extends Activity {
    private static final String STYLE = "style", NAME = "name", MINUTES = "minutes";
    /** The same colours the box gives the lights (PARTY_COLOURS in Beyond Home's lib.js). */
    static final int[] COLOURS = {0xFFFF00A0, 0xFF00C8FF, 0xFFFFBE00, 0xFF78FF00, 0xFFA03CFF, 0xFFFF5028};
    private static PartyActivity showing;

    static void open(Context c, String style, String name, int minutes) {
        c.startActivity(new Intent(c, PartyActivity.class).putExtra(STYLE, style).putExtra(NAME, name).putExtra(MINUTES, minutes)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
    }

    static void end() {
        if (showing != null) showing.finish();
    }

    private final PartyMusic music = new PartyMusic();
    private boolean birthday;
    private long until;
    private int chord = -1;
    private String room;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        showing = this;
        birthday = "birthday".equals(getIntent().getStringExtra(STYLE));
        int minutes = Math.max(5, Math.min(120, getIntent().getIntExtra(MINUTES, 30)));
        String name = getIntent().getStringExtra(NAME);
        until = SystemClock.uptimeMillis() + minutes * 60_000L + Math.round(PartyMusic.introLength(birthday) * 1000);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        String title = birthday ? Ui.tr("Feliz aniversário", "Happy birthday", "Feliz cumpleaños")
                : Ui.tr("Hora da festa!", "Party time!", "¡Hora de la fiesta!");
        setContentView(new Floor(this, title, birthday && name != null && !name.isEmpty() ? name : null));
        HomeHub.start(this);
        music.start(birthday);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        recreate();
    }

    @Override protected void onPause() {
        super.onPause();
        if (isFinishing()) wrapUp();
    }

    @Override protected void onStop() {
        super.onStop();
        // Another app took the screen: the party's over, so nothing keeps playing behind it.
        if (!isFinishing()) finish();
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        wrapUp();
        if (showing == this) showing = null;
    }

    private boolean wrapped;

    private void wrapUp() {
        if (wrapped) return;
        wrapped = true;
        music.stop();
        if (room != null) ask("party-over", 0);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getAction() == KeyEvent.ACTION_UP) finish();
        return true;
    }

    /** The room whose lights join in, or null without a Beyond Home box. */
    private static String partyRoom() {
        JSONArray rooms = HomeHub.rooms();
        for (int i = 0; i < rooms.length(); i++) {
            JSONObject r = rooms.optJSONObject(i);
            JSONArray moments = r == null ? null : r.optJSONArray("moments");
            for (int j = 0; moments != null && j < moments.length(); j++) {
                JSONObject m = moments.optJSONObject(j);
                if (m != null && "party".equals(m.optString("id"))) return r.optString("id");
            }
        }
        return null;
    }

    private void ask(String moment, int beat) {
        try {
            JSONObject q = new JSONObject().put("room", room).put("do", "moment").put("moment", moment);
            if (beat > 0) q.put("beat", beat);
            HomeHub.act(q, (ok, why) -> {});
        } catch (Exception ignored) {
            // The lights are a nicety.
        }
    }

    /** Called from the frame loop with the music's own clock: a new chord asks the lights to move on. */
    private void onChord(int c) {
        if (c == chord) return;
        chord = c;
        if (!"paired".equals(HomeHub.status())) return;
        if (room == null) room = partyRoom();
        if (room != null) ask("party", c);
    }

    private final class Floor extends View {
        private final float k;
        private final String title, name;
        private final Paint beam = new Paint(Paint.ANTI_ALIAS_FLAG), spark = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint big, small, hint;
        private final RadialGradient[] shaders = new RadialGradient[COLOURS.length];
        private final float[] sx = new float[70], sy = new float[70], sp = new float[70];
        private final long began = SystemClock.uptimeMillis();
        private final float intro = PartyMusic.introLength(birthday);
        private final String stopWords = Ui.tr("Qualquer tecla para parar", "Any key to stop", "Cualquier tecla para parar");

        Floor(Context c, String title, String name) {
            super(c);
            this.title = name == null ? title : Ui.emoji("🎂") + " " + title;
            this.name = name;
            k = c.getResources().getDisplayMetrics().widthPixels / 1920f;
            setBackgroundColor(0xFF0D0C18);
            beam.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SCREEN));
            big = Ui.text(Ui.displaySemibold, (name == null ? 120 : 96) * k, Color.WHITE);
            big.setTextAlign(Paint.Align.CENTER);
            big.setShadowLayer(30 * k, 0, 0, 0xAA000000);
            small = Ui.text(Ui.displaySemibold, 150 * k, Color.WHITE);
            small.setTextAlign(Paint.Align.CENTER);
            small.setShadowLayer(30 * k, 0, 0, 0xAA000000);
            hint = Ui.text(Ui.regular, 30 * k, 0x99FFFFFF);
            hint.setTextAlign(Paint.Align.CENTER);
            // Sparkles from a mirror ball, in places that are the same every party.
            java.util.Random r = new java.util.Random(4);
            for (int i = 0; i < sx.length; i++) {
                sx[i] = r.nextFloat();
                sy[i] = r.nextFloat();
                sp[i] = r.nextFloat();
            }
            setKeepScreenOn(true);
        }

        @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
            for (int i = 0; i < COLOURS.length; i++) {
                int c = COLOURS[i];
                shaders[i] = new RadialGradient(0, 0, 520 * k, new int[] {Color.argb(150, Color.red(c), Color.green(c), Color.blue(c)),
                        Color.argb(0, Color.red(c), Color.green(c), Color.blue(c))}, null, Shader.TileMode.CLAMP);
            }
        }

        @Override protected void onDraw(Canvas c) {
            long now = SystemClock.uptimeMillis();
            if (now >= until) {
                finish();
                return;
            }
            float heard = music.heard();
            if (heard < 0) heard = (now - began) / 1000f;
            float time = heard - intro;                       // seconds into the dancing (negative during the tune)
            float beatPhase = time >= 0 ? (time / PartyMusic.BEAT) % 1 : 0;
            float pulse = time >= 0 ? (float) Math.exp(-beatPhase * 4) : 0.35f;
            if (time >= 0) onChord(1 + (int) (time / (PartyMusic.BEAT * 4)));
            float w = getWidth(), h = getHeight(), t = heard;

            // The beams: each sweeps its own slow loop and flares on the beat.
            for (int i = 0; i < shaders.length; i++) {
                float x = w * (0.5f + 0.42f * (float) Math.sin(t * (0.31f + 0.07f * i) + i * 1.7f));
                float y = h * (0.5f + 0.40f * (float) Math.cos(t * (0.23f + 0.05f * i) + i * 2.3f));
                float s = 0.8f + 0.5f * pulse * (i % 2 == (int) (time / PartyMusic.BEAT) % 2 ? 1 : 0.4f);
                beam.setShader(shaders[i]);
                beam.setAlpha(Math.round(255 * (0.55f + 0.45f * pulse)));
                c.save();
                c.translate(x, y);
                c.scale(s, s);
                c.drawCircle(0, 0, 520 * k, beam);
                c.restore();
            }

            // The mirror ball's sparkles drift round slowly and twinkle.
            for (int i = 0; i < sx.length; i++) {
                float x = ((sx[i] + t * 0.02f) % 1) * w, y = sy[i] * h;
                float tw = 0.5f + 0.5f * (float) Math.sin(t * (2 + 3 * sp[i]) + i);
                spark.setColor(Color.argb(Math.round(220 * tw * tw), 255, 255, 255));
                c.drawCircle(x, y, (2 + 3 * sp[i]) * k, spark);
            }

            float grow = 1 + 0.05f * pulse;
            c.save();
            c.translate(w / 2, h / 2);
            c.scale(grow, grow);
            if (name == null) c.drawText(title, 0, 40 * k, big);
            else {
                c.drawText(title, 0, -50 * k, big);
                c.drawText(name, 0, 120 * k, small);
            }
            c.restore();
            if (now - began < 8000) c.drawText(stopWords, w / 2, h - 80 * k, hint);
            postInvalidateOnAnimation();
        }
    }
}
