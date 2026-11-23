package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Screen time is used up for today (ADR 0058): kind words in the kid's own colour, full screen over the app, never a
 * telling-off. OK goes back to the home screen; a grown-up's PIN adds 15 minutes; or someone else can watch.
 * Same as timeUp in web/screentime.js.
 */
public class TimeUpActivity extends Activity {
    static volatile boolean showing;

    static Intent intent(Context c) {
        return new Intent(c, TimeUpActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;
        People.Person me = People.current(this);

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(column, new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER));

        TextView moon = FeedbackActivity.text(this, "🌙", Ui.regular, 96 * k, 0xFFFFFFFF);
        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        disc.setColor(me.colour == 0 ? Glow.VIOLET : me.colour);
        moon.setBackground(disc);
        int size = Math.round(180 * k);
        LinearLayout.LayoutParams mp = new LinearLayout.LayoutParams(size, size);
        mp.bottomMargin = Math.round(44 * k);
        column.addView(moon, mp);
        String name = me.name == null ? "" : me.name.trim();
        TextView words = FeedbackActivity.text(this, Ui.tr("Por hoje é só, " + name, "That's screen time for today, " + name,
                "Eso es todo por hoy, " + name), Ui.displaySemibold, 76 * k, 0xFFFFFFFF);
        column.addView(words, new LinearLayout.LayoutParams(-1, -2));
        TextView kind = FeedbackActivity.text(this, Ui.tr("Que bom que você assistiu! Que tal um jogo, um livro ou brincar lá fora?",
                "Great watching! How about a game, a book, or a run around outside?",
                "¡Qué bien lo pasaste! ¿Qué tal un juego, un libro o jugar fuera?"), Ui.regular, 40 * k, 0xE6FFFFFF);
        kind.setPadding(0, Math.round(24 * k), 0, 0);
        column.addView(kind, new LinearLayout.LayoutParams(-1, -2));
        TextView later = FeedbackActivity.text(this, Ui.tr("Amanhã tem mais.", "More tomorrow.", "Mañana hay más."), Ui.regular, 34 * k, 0xA6FFFFFF);
        later.setPadding(0, Math.round(30 * k), 0, Math.round(56 * k));
        column.addView(later, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_HORIZONTAL);
        Button ok = FeedbackActivity.button(this, "✓  " + Ui.tr("Combinado", "OK", "Vale"), k, true);
        ok.setOnClickListener(v -> home());
        Button more = FeedbackActivity.button(this, Ui.tr("Adulto: mais 15 min", "Grown-up: 15 more minutes", "Adulto: 15 min más"), k, false);
        more.setOnClickListener(v -> {
            if (People.hasPin(this)) {
                // The grown-up PIN first; WhoActivity adds the minutes once it's right.
                WhoActivity.open(this, WhoActivity.THEN_MORE_TIME);
            } else {
                ScreenTimeService.more(this, me.id, ScreenTime.MORE);
                Toast.makeText(this, Ui.tr("Mais 15 minutos.", "15 more minutes.", "15 minutos más."), Toast.LENGTH_LONG).show();
            }
            finish();
        });
        Button other = FeedbackActivity.button(this, Ui.tr("Trocar quem assiste", "Switch who's watching", "Cambiar quién ve"), k, false);
        other.setOnClickListener(v -> {
            WhoActivity.open(this, null);
            finish();
        });
        for (Button b : new Button[] {ok, more, other}) {
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(100 * k));
            bp.leftMargin = bp.rightMargin = Math.round(12 * k);
            row.addView(b, bp);
        }
        column.addView(row, new LinearLayout.LayoutParams(-1, -2));
        setContentView(root);
        ok.requestFocus();
    }

    /** Back to the home screen, where the apps wait until tomorrow (or a grown-up's minutes). */
    private void home() {
        try {
            startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (RuntimeException ignored) {
        }
        finish();
    }

    @Override protected void onResume() {
        super.onResume();
        showing = true;
    }

    @Override protected void onPause() {
        showing = false;
        super.onPause();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP) home();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
