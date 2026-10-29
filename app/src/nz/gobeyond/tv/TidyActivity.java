package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * The tidy-up race: a big clock counting up from 0:00, and everyone's face. Whoever is done grabs the remote and presses
 * OK on their face: first, second, third, with their time. When everybody's done the TV says who was fastest. Kyle
 * (29/10/2026): a count up, not a count down, so nobody runs out of time. Left open an hour, it closes. First, with
 * more than one face, Who's tidying?: everyone ticked, OK takes someone out, then Go. Same as web/tidy.js. Opened by
 * the nightly alarm (Tidy), a "tidy" command from Beyond Family, or the home screen when the alarm couldn't open it.
 */
public class TidyActivity extends Activity {
    private static final String MINUTES = "minutes";
    private static final int EMBER = 0xFFE8A33D;
    /** Nobody pressed anything for an hour: the race was forgotten, so it ends. */
    private static final long LONGEST = 60 * 60_000L;

    static void open(Context c, int minutes) {
        c.startActivity(new Intent(c, TidyActivity.class).putExtra(MINUTES, minutes)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private float k;
    private long started;
    private boolean over, picking;
    private TextView clock, title, sub;
    private LinearLayout faces;
    private Button close, go;
    private ToneGenerator tone;
    private final List<Racer> racers = new ArrayList<>();
    private final List<Racer> order = new ArrayList<>();

    private static final class Racer {
        People.Person person;
        TextView place;
        boolean out;
        View face;
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        Tidy.clearDue(this);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        // The minutes from Beyond Family no longer set an end: the clock counts up.
        started = SystemClock.uptimeMillis();

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(90 * k);
        root.addView(column, lp);

        // No basket emoji: Android 8's font has none and drew a box.
        title = FeedbackActivity.text(this, Ui.tr("Corrida da arrumação!", "Tidy-up race!", "¡Carrera de ordenar!"),
                Ui.displaySemibold, 56 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.CENTER);
        column.addView(title, new LinearLayout.LayoutParams(-1, -2));
        clock = FeedbackActivity.text(this, "", Ui.displaySemibold, 200 * k, 0xFFFFFFFF);
        clock.setGravity(Gravity.CENTER);
        column.addView(clock, new LinearLayout.LayoutParams(-1, -2));
        sub = FeedbackActivity.text(this, Ui.tr("Prontos, já! Quem terminar, aperte OK no seu rosto.",
                "Ready, set, go! When you're done, press OK on your face.", "¡Preparados, listos, ya! Cuando termines, pulsa OK en tu cara."),
                Ui.regular, 32 * k, 0xCCFFFFFF);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 0, 0, Math.round(50 * k));
        column.addView(sub, new LinearLayout.LayoutParams(-1, -2));

        faces = new LinearLayout(this);
        faces.setGravity(Gravity.CENTER);
        column.addView(faces, new LinearLayout.LayoutParams(-1, -2));
        for (People.Person p : racing(this)) faces.addView(face(p));
        picking = racers.size() > 1;

        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        gp.topMargin = Math.round(50 * k);
        go = FeedbackActivity.button(this, Ui.tr("Vai!", "Go!", "¡Ya!"), k, true);
        go.setOnClickListener(v -> go());
        go.setVisibility(picking ? View.VISIBLE : View.GONE);
        column.addView(go, gp);

        close = FeedbackActivity.button(this, Ui.tr("Fechar", "Close", "Cerrar"), k, false);
        close.setOnClickListener(v -> finish());
        close.setVisibility(View.GONE);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.topMargin = Math.round(50 * k);
        column.addView(close, bp);

        setContentView(root);
        if (faces.getChildCount() > 0) faces.getChildAt(0).requestFocus();
        try {
            if (Prefs.sounds()) tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 60);
        } catch (RuntimeException ignored) {
            // No sound to be had: the race works without it.
        }
        if (picking) {
            title.setText(Ui.tr("Quem vai arrumar?", "Who's tidying?", "¿Quién ordena?"));
            sub.setText(Ui.tr("Tire quem não vai, depois aperte Vai!", "Untick anyone who's out, then press Go!",
                    "Quita a quien no juegue y pulsa ¡Ya!"));
            clock.setText(time(0));
            clock.setAlpha(0.35f);
            for (Racer r : racers) r.place.setText("✓");
            handler.postDelayed(this::finish, LONGEST);   // nobody pressed Go
        } else {
            Chime.play();
            tick.run();
        }
    }

    /** Who's tidying is settled: the ones still ticked race, and the clock starts. */
    private void go() {
        if (!picking) return;
        List<Racer> in = new ArrayList<>();
        for (Racer r : racers) if (!r.out) in.add(r);
        if (in.isEmpty()) return;
        handler.removeCallbacksAndMessages(null);
        for (Racer r : racers) {
            if (r.out) faces.removeView(r.face);
            else r.place.setText(" ");
        }
        racers.clear();
        racers.addAll(in);
        picking = false;
        title.setText(Ui.tr("Corrida da arrumação!", "Tidy-up race!", "¡Carrera de ordenar!"));
        sub.setText(Ui.tr("Prontos, já! Quem terminar, aperte OK no seu rosto.",
                "Ready, set, go! When you're done, press OK on your face.", "¡Preparados, listos, ya! Cuando termines, pulsa OK en tu cara."));
        clock.setAlpha(1f);
        go.setVisibility(View.GONE);
        racers.get(0).face.requestFocus();
        started = SystemClock.uptimeMillis();
        Chime.play();
        tick.run();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (tone != null) tone.release();
        super.onDestroy();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        recreate();   // a new race
    }

    /** The kids (or, with no kids, everybody), never visitors. Nobody at all: one face for the whole family. */
    static List<People.Person> racing(Context c) {
        List<People.Person> kids = new ArrayList<>(), all = new ArrayList<>();
        for (People.Person p : People.list(c)) {
            if (p.visitor) continue;
            all.add(p);
            if (p.kid) kids.add(p);
        }
        if (!kids.isEmpty()) return kids;
        if (!all.isEmpty()) return all;
        List<People.Person> one = new ArrayList<>();
        one.add(People.family());
        return one;
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (over) return;
            long gone = SystemClock.uptimeMillis() - started;
            clock.setText(time(gone));
            if (gone >= LONGEST) {
                finish();   // forgotten: nobody is racing any more
                return;
            }
            handler.postDelayed(this, 250);
        }
    };

    private View face(People.Person p) {
        final Racer r = new Racer();
        r.person = p;
        LinearLayout f = new LinearLayout(this);
        f.setOrientation(LinearLayout.VERTICAL);
        f.setGravity(Gravity.CENTER_HORIZONTAL);
        f.setFocusable(true);
        f.setClickable(true);
        int pad = Math.round(18 * k);
        f.setPadding(pad, pad, pad, pad);
        f.setBackground(FeedbackActivity.pill(0, 0, 32 * k, 0, 0xFFFFFFFF));
        int size = Math.round(150 * k);
        TextView dot = FeedbackActivity.text(this, p.initial(), Ui.displaySemibold, 62 * k, 0xFFFFFFFF);
        dot.setGravity(Gravity.CENTER);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(p.colour | 0xFF000000);
        dot.setBackground(g);
        f.addView(dot, new LinearLayout.LayoutParams(size, size));
        TextView name = FeedbackActivity.text(this, p.name, Ui.medium, 32 * k, 0xFFFFFFFF);
        name.setPadding(0, Math.round(14 * k), 0, 0);
        f.addView(name);
        r.place = FeedbackActivity.text(this, " ", Ui.semibold, 30 * k, EMBER);
        f.addView(r.place);
        r.face = f;
        f.setOnClickListener(v -> {
            if (!picking) {
                done(r);
                return;
            }
            r.out = !r.out;
            r.place.setText(r.out ? " " : "✓");
            f.setAlpha(r.out ? 0.4f : 1f);
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.leftMargin = lp.rightMargin = Math.round(14 * k);
        f.setLayoutParams(lp);
        racers.add(r);
        return f;
    }

    private void done(Racer r) {
        if (over || order.contains(r)) return;
        order.add(r);
        int n = order.size();
        String at = time(SystemClock.uptimeMillis() - started);
        r.place.setText((n == 1 ? "🏆 " + Ui.tr("1º", "1st", "1º") : n == 2 ? Ui.tr("2º", "2nd", "2º") : n == 3 ? Ui.tr("3º", "3rd", "3º")
                : "✓") + "  " + at);
        r.face.setAlpha(0.85f);
        r.face.animate().scaleX(1.12f).scaleY(1.12f).setDuration(160).withEndAction(() ->
                r.face.animate().scaleX(1).scaleY(1).setDuration(220).start()).start();
        beep(ToneGenerator.TONE_PROP_ACK, 250);
        if (order.size() == racers.size()) {
            end();
            return;
        }
        // On to the next face still tidying.
        for (Racer o : racers) {
            if (!order.contains(o)) {
                o.face.requestFocus();
                break;
            }
        }
    }

    /** Everybody's done. */
    private void end() {
        if (over) return;
        over = true;
        handler.removeCallbacks(tick);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Chime.play();
        clock.setText("🎉");
        title.setText(Ui.tr("Tudo arrumado!", "All tidy!", "¡Todo ordenado!"));
        sub.setText(racers.size() > 1 ? Ui.tr("Mais rápido: ", "Fastest tonight: ", "El más rápido: ") + order.get(0).person.name
                : Ui.tr("Muito bem!", "Well done!", "¡Muy bien!"));
        close.setVisibility(View.VISIBLE);
        close.requestFocus();
        handler.postDelayed(this::finish, 90_000);
    }

    /** 2:31, or 1:02:05 past the hour. */
    static String time(long ms) {
        long s = Math.max(0, ms) / 1000;
        return s >= 3600 ? String.format(java.util.Locale.ROOT, "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60)
                : String.format(java.util.Locale.ROOT, "%d:%02d", s / 60, s % 60);
    }

    private void beep(int which, int ms) {
        try {
            if (tone != null) tone.startTone(which, ms);
        } catch (RuntimeException ignored) {
            // Sound is a nicety.
        }
    }
}
