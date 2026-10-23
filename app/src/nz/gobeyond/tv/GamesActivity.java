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
import android.widget.Toast;

/**
 * Games, from the remote (ADR 0021): every game and family activity starts here on the TV, no phone needed. Karaoke,
 * a party, quiz night, the dinner question, the tidy-up race and bedtime breathing. Quiz night and the dinner question
 * need Beyond Family, because everyone answers on their phones. Same as Games.open in web/games.js.
 */
public class GamesActivity extends Activity {
    static void open(Context c) {
        c.startActivity(new Intent(c, GamesActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private boolean busy;

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
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1400 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(130 * k);
        root.addView(column, lp);

        column.addView(FeedbackActivity.text(this, Ui.emoji("🎮") + " " + Ui.tr("Jogos", "Games", "Juegos"),
                Ui.displaySemibold, 64 * k, 0xFFFFFFFF));
        TextView sub = FeedbackActivity.text(this, Ui.tr("O que vamos fazer?", "What shall we do?", "¿Qué hacemos?"),
                Ui.regular, 32 * k, 0xCCFFFFFF);
        sub.setPadding(0, Math.round(16 * k), 0, Math.round(48 * k));
        column.addView(sub);

        boolean linked = Family.linked(this);
        Object[][] games = {
                {"🎤", Ui.tr("Karaokê", "Karaoke", "Karaoke"), (Runnable) () -> go(() -> KaraokePickActivity.open(this))},
                {"🎉", Ui.tr("Festa", "Party", "Fiesta"), (Runnable) () -> go(() -> PartyPickActivity.open(this))},
                {"🏆", Ui.tr("Quiz da noite", "Quiz night", "Noche de quiz"), (Runnable) () -> family("quiz")},
                {"🍽", Ui.tr("Pergunta do jantar", "Dinner question", "Pregunta de la cena"), (Runnable) () -> family("question")},
                {"🧹", Ui.tr("Corrida da arrumação", "Tidy-up race", "Carrera de ordenar"), (Runnable) () -> go(() -> TidyActivity.open(this, 10))},
                {"🌙", Ui.tr("Respirar para dormir", "Bedtime breathing", "Respirar para dormir"), (Runnable) () -> go(() -> BedtimeActivity.open(this, 15))},
        };
        LinearLayout row = null;
        Button first = null;
        for (int i = 0; i < games.length; i++) {
            if (i % 3 == 0) {
                row = new LinearLayout(this);
                row.setGravity(Gravity.CENTER_HORIZONTAL);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
                rp.bottomMargin = Math.round(22 * k);
                column.addView(row, rp);
            }
            final Runnable run = (Runnable) games[i][2];
            Button b = FeedbackActivity.button(this, Ui.emoji((String) games[i][0]) + "  " + games[i][1], k, i == 0);
            b.setOnClickListener(v -> run.run());
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(Math.round(400 * k), Math.round(96 * k));
            bp.leftMargin = bp.rightMargin = Math.round(11 * k);
            row.addView(b, bp);
            if (first == null) first = b;
        }
        if (!linked) {
            TextView hint = FeedbackActivity.text(this, Ui.tr(
                    "Quiz da noite e a pergunta do jantar precisam do Beyond Family: todos respondem no celular. Conecte em Configurações.",
                    "Quiz night and the dinner question need Beyond Family, because everyone answers on their phone. Link it in Settings.",
                    "La noche de quiz y la pregunta de la cena necesitan Beyond Family: todos responden en el teléfono. Conéctalo en Ajustes."),
                    Ui.regular, 26 * k, 0xA6FFFFFF);
            hint.setGravity(Gravity.CENTER);
            hint.setPadding(0, Math.round(26 * k), 0, 0);
            column.addView(hint, new LinearLayout.LayoutParams(-1, -2));
        }

        setContentView(root);
        first.requestFocus();
    }

    private void go(Runnable open) {
        open.run();
        finish();
    }

    /** Quiz night or the dinner question: Beyond Family starts it, and its command opens the game on every TV. */
    private void family(String kind) {
        if (!Family.linked(this)) {
            Toast.makeText(this, Ui.tr("Conecte o Beyond Family primeiro, em Configurações.",
                    "Link Beyond Family first, in Settings.", "Conecta Beyond Family primero, en Ajustes."), Toast.LENGTH_LONG).show();
            return;
        }
        if (busy) return;
        busy = true;
        Family.game(this, kind, "start", err -> {
            busy = false;
            if (err != null) Toast.makeText(this, err, Toast.LENGTH_SHORT).show();
            else finish();
        });
    }
}
