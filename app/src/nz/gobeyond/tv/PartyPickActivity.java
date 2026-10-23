package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Party mode from the remote, for whoever hasn't got a phone: the Party button on the home screen asks what kind
 * (a disco, or somebody's birthday) and starts PartyActivity, the same as a "party" command from Beyond Family.
 * Same as Party.choose in web/party.js (ADR 0017).
 */
public class PartyPickActivity extends Activity {
    static final int MINUTES = 30;

    static void open(Context c) {
        c.startActivity(new Intent(c, PartyPickActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1200 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(150 * k);
        root.addView(column, lp);

        TextView title = FeedbackActivity.text(this, Ui.emoji("🎉") + " " + Ui.tr("Hora da festa!", "Party time!", "¡Hora de la fiesta!"),
                Ui.displaySemibold, 64 * k, 0xFFFFFFFF);
        column.addView(title);
        TextView sub = FeedbackActivity.text(this, Ui.tr("Que tipo de festa?", "What kind of party?", "¿Qué tipo de fiesta?"),
                Ui.regular, 32 * k, 0xCCFFFFFF);
        sub.setPadding(0, Math.round(16 * k), 0, Math.round(48 * k));
        column.addView(sub);

        Button disco = FeedbackActivity.button(this, Ui.emoji("🕺") + "  " + Ui.tr("Discoteca", "Disco", "Disco"), k, true);
        disco.setOnClickListener(v -> start("disco", null));
        column.addView(disco, new LinearLayout.LayoutParams(-2, Math.round(88 * k)));

        // A birthday for anyone on this TV: their name on the screen and the Happy Birthday tune first.
        LinearLayout row = null;
        int inRow = 0;
        for (People.Person p : People.list(this)) {
            if (p.name == null || p.name.trim().isEmpty()) continue;
            if (row == null || inRow == 4) {
                if (row == null) {
                    TextView or = FeedbackActivity.text(this, Ui.tr("Ou o aniversário de alguém", "Or someone's birthday", "O el cumpleaños de alguien"),
                            Ui.regular, 30 * k, 0xCCFFFFFF);
                    or.setPadding(0, Math.round(56 * k), 0, Math.round(24 * k));
                    column.addView(or);
                }
                row = new LinearLayout(this);
                row.setGravity(Gravity.CENTER_HORIZONTAL);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
                rp.bottomMargin = Math.round(20 * k);
                column.addView(row, rp);
                inRow = 0;
            }
            final String name = p.name.trim();
            Button b = FeedbackActivity.button(this, Ui.emoji("🎂") + "  " + name, k, false);
            b.setOnClickListener(v -> start("birthday", name));
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
            bp.leftMargin = bp.rightMargin = Math.round(10 * k);
            row.addView(b, bp);
            inRow++;
        }

        setContentView(root);
        disco.requestFocus();
    }

    private void start(String style, String name) {
        PartyActivity.open(this, style, name, MINUTES);
        finish();
    }
}
