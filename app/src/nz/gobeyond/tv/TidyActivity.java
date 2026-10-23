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
 * The tidy-up race: a big clock counting down, and everyone's face. Whoever is done grabs the remote and presses OK on
 * their face: first, second, third. When everybody's done, or the time is up, the TV says so, kindly. Same as
 * web/tidy.js. Opened by the nightly alarm (Tidy), a "tidy" command from Beyond Family, or the home screen when the
 * alarm couldn't open it itself.
 */
public class TidyActivity extends Activity {
    private static final String MINUTES = "minutes";
    private static final int EMBER = 0xFFE8A33D;

    static void open(Context c, int minutes) {
        c.startActivity(new Intent(c, TidyActivity.class).putExtra(MINUTES, minutes)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private float k;
    private long ends;
    private boolean over;
    private TextView clock, title, sub;
    private LinearLayout faces;
    private Button close;
    private ToneGenerator tone;
    private final List<Racer> racers = new ArrayList<>();
    private final List<Racer> order = new ArrayList<>();

    private static final class Racer {
        People.Person person;
        TextView place;
        View face;
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        Tidy.clearDue(this);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        int minutes = Math.max(1, Math.min(30, getIntent().getIntExtra(MINUTES, 10)));
        ends = SystemClock.uptimeMillis() + minutes * 60_000L;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(90 * k);
        root.addView(column, lp);

        title = FeedbackActivity.text(this, "🧺  " + Ui.tr("Corrida da arrumação!", "Tidy-up race!", "¡Carrera de ordenar!"),
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

        close = FeedbackActivity.button(this, Ui.tr("Fechar", "Close", "Cerrar"), k, false);
        close.setOnClickListener(v -> finish());
        close.setVisibility(View.GONE);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.topMargin = Math.round(50 * k);
        column.addView(close, bp);

        setContentView(root);
        if (faces.getChildCount() > 0) faces.getChildAt(0).requestFocus();
        Chime.play();
        try {
            if (Prefs.sounds()) tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 60);
        } catch (RuntimeException ignored) {
            // No sound to be had: the race works without it.
        }
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
            long left = Math.max(0, ends - SystemClock.uptimeMillis());
            long s = (left + 999) / 1000;
            clock.setText(String.format(java.util.Locale.ROOT, "%d:%02d", s / 60, s % 60));
            clock.setTextColor(s <= 60 ? EMBER : 0xFFFFFFFF);
            if (left == 0) {
                end(false);
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
        f.setOnClickListener(v -> done(r));
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
        r.place.setText(n == 1 ? "🏆 " + Ui.tr("1º", "1st", "1º") : n == 2 ? Ui.tr("2º", "2nd", "2º") : n == 3 ? Ui.tr("3º", "3rd", "3º")
                : "✓ " + Ui.tr("Pronto", "Done", "Listo"));
        r.face.setAlpha(0.85f);
        r.face.animate().scaleX(1.12f).scaleY(1.12f).setDuration(160).withEndAction(() ->
                r.face.animate().scaleX(1).scaleY(1).setDuration(220).start()).start();
        beep(ToneGenerator.TONE_PROP_ACK, 250);
        if (order.size() == racers.size()) {
            end(true);
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

    private void end(boolean everyone) {
        if (over) return;
        over = true;
        handler.removeCallbacks(tick);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Chime.play();
        if (everyone) {
            clock.setText("🎉");
            title.setText(Ui.tr("Tudo arrumado!", "All tidy!", "¡Todo ordenado!"));
            sub.setText(racers.size() > 1 ? Ui.tr("Mais rápido: ", "Fastest tonight: ", "El más rápido: ") + order.get(0).person.name
                    : Ui.tr("Muito bem!", "Well done!", "¡Muy bien!"));
        } else {
            clock.setText("0:00");
            title.setText(Ui.tr("Acabou o tempo!", "Time's up!", "¡Se acabó el tiempo!"));
            StringBuilder names = new StringBuilder();
            for (Racer r : order) names.append(names.length() == 0 ? "" : ", ").append(r.person.name);
            sub.setText(order.isEmpty() ? Ui.tr("Quase lá. Mais um pouquinho e pronto!", "Nearly there. A little more and it's done!",
                    "Casi. ¡Un poco más y listo!")
                    : Ui.tr("Muito bem, ", "Well done, ", "¡Muy bien, ") + names + Ui.tr(". Os outros, quase lá!", ". Everyone else, nearly there!",
                    ". ¡Los demás, casi!"));
        }
        close.setVisibility(View.VISIBLE);
        close.requestFocus();
        handler.postDelayed(this::finish, 90_000);
    }

    private void beep(int which, int ms) {
        try {
            if (tone != null) tone.startTone(which, ms);
        } catch (RuntimeException ignored) {
            // Sound is a nicety.
        }
    }
}
