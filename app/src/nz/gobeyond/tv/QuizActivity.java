package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Quiz night: ten questions on the TV, everyone buzzes in on their phones in Beyond Family. The TV learns who's in
 * (never what they picked), then the right answer and the scores when a grown-up reveals it, then the final scores.
 * Same as quiz() in web/family.js. Everything here runs on the main thread of :home.
 */
public class QuizActivity extends Activity {
    private static final String[] LETTERS = {"A", "B", "C", "D"};
    private static Game game;
    private static QuizActivity showing;

    private static final class Person {
        final String name, colour;
        final int score;
        final boolean first;

        Person(String name, String colour, int score, boolean first) {
            this.name = name;
            this.colour = colour;
            this.score = score;
            this.first = first;
        }
    }

    private static final class Game {
        final String id, text;
        final int round, total;
        final String[] choices;
        final List<Person> answered = new ArrayList<>();
        int answer = -1;
        List<Person> right = new ArrayList<>(), scores;
        boolean done;

        Game(String id, int round, int total, String text, String[] choices) {
            this.id = id;
            this.round = round;
            this.total = total;
            this.text = text;
            this.choices = choices;
        }
    }

    /** A quiz, quiz-answered, quiz-reveal or quiz-end command from Beyond Family. */
    static void command(Context c, JSONObject cmd) {
        String kind = cmd.optString("kind"), id = cmd.optString("quiz");
        if (kind.equals("quiz")) {
            String text = cmd.optString("question");
            JSONArray a = cmd.optJSONArray("choices");
            if (text.isEmpty() || a == null || a.length() != 4) return;
            String[] choices = new String[4];
            for (int i = 0; i < 4; i++) choices[i] = a.optString(i);
            game = new Game(id, cmd.optInt("round"), cmd.optInt("total"), text, choices);
        } else if (game == null || !game.id.equals(id)) {
            return;
        } else if (kind.equals("quiz-answered")) {
            if (cmd.optInt("round") != game.round) return;
            String name = cmd.optString("name");
            for (Person p : game.answered) if (p.name.equals(name)) return;
            game.answered.add(new Person(name, cmd.optString("colour"), 0, false));
        } else if (kind.equals("quiz-reveal")) {
            if (cmd.optInt("round") != game.round) return;
            game.answer = cmd.optInt("answer", -1);
            game.right = people(cmd.optJSONArray("right"));
            game.scores = people(cmd.optJSONArray("scores"));
        } else if (kind.equals("quiz-end")) {
            game.done = true;
            List<Person> s = people(cmd.optJSONArray("scores"));
            if (!s.isEmpty() || game.scores == null) game.scores = s;
            Chime.play();
        } else {
            return;
        }
        if (showing != null) {
            showing.fill();
            return;
        }
        try {
            c.startActivity(new Intent(c, QuizActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (RuntimeException e) {
            Toast.makeText(c, Ui.tr("Quiz da noite: ", "Quiz night: ", "Noche de quiz: ") + game.text, Toast.LENGTH_LONG).show();
        }
    }

    private static List<Person> people(JSONArray a) {
        List<Person> out = new ArrayList<>();
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || o.optString("name").isEmpty()) continue;
            out.add(new Person(o.optString("name"), o.optString("colour"), o.optInt("score"), o.optBoolean("first")));
        }
        return out;
    }

    private float k;
    private TextView title, question, sub;
    private LinearLayout body;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(80 * k);
        root.addView(column, lp);

        title = FeedbackActivity.text(this, "", Ui.semibold, 30 * k, 0xFFE8A33D);
        title.setGravity(Gravity.CENTER);
        column.addView(title);
        question = FeedbackActivity.text(this, "", Ui.displaySemibold, 58 * k, 0xFFFFFFFF);
        question.setGravity(Gravity.CENTER);
        question.setPadding(0, Math.round(18 * k), 0, Math.round(30 * k));
        column.addView(question, new LinearLayout.LayoutParams(-1, -2));
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setGravity(Gravity.CENTER_HORIZONTAL);
        column.addView(body, new LinearLayout.LayoutParams(-1, -2));
        sub = FeedbackActivity.text(this, "", Ui.regular, 30 * k, 0xCCFFFFFF);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, Math.round(24 * k), 0, 0);
        column.addView(sub, new LinearLayout.LayoutParams(-1, -2));

        // Run from the remote (ADR 0021): show the answer, the next question, finish. Phones only buzz in.
        LinearLayout buttons = new LinearLayout(this);
        buttons.setGravity(Gravity.CENTER);
        act = FeedbackActivity.button(this, "", k, true);
        act.setOnClickListener(v -> step(game != null && game.answer < 0 ? "reveal" : "next"));
        end = FeedbackActivity.button(this, Ui.tr("Terminar o quiz", "Finish the quiz", "Terminar el quiz"), k, false);
        end.setOnClickListener(v -> step("end"));
        Button ok = FeedbackActivity.button(this, Ui.tr("Fechar", "Close", "Cerrar"), k, false);
        ok.setOnClickListener(v -> finish());
        for (Button b : new Button[] {act, end, ok}) {
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(80 * k));
            bp.leftMargin = bp.rightMargin = Math.round(10 * k);
            buttons.addView(b, bp);
        }
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, -2);
        bp.topMargin = Math.round(30 * k);
        column.addView(buttons, bp);

        setContentView(root);
        showing = this;
        fill();
        (act.getVisibility() == View.VISIBLE ? act : ok).requestFocus();
    }

    private Button act, end;
    private boolean busy;

    /** Ask Beyond Family to move the quiz on; the screen changes when its command comes back. */
    private void step(String action) {
        if (busy || game == null) return;
        busy = true;
        Family.game(this, "quiz", action, err -> {
            busy = false;
            if (err != null) Toast.makeText(this, err, Toast.LENGTH_SHORT).show();
        });
    }

    @Override protected void onDestroy() {
        if (showing == this) showing = null;
        if (game != null && game.done) game = null;
        super.onDestroy();
    }

    private void fill() {
        if (game == null) {
            finish();
            return;
        }
        body.removeAllViews();
        boolean linked = Family.linked(this);
        act.setVisibility(linked && !game.done ? View.VISIBLE : View.GONE);
        end.setVisibility(linked && !game.done ? View.VISIBLE : View.GONE);
        act.setText(game.answer < 0 ? Ui.tr("Mostrar a resposta", "Show the answer", "Mostrar la respuesta")
                : game.round >= game.total ? Ui.tr("Ver o placar", "See the scores", "Ver la puntuación")
                : Ui.tr("Próxima pergunta", "Next question", "Siguiente pregunta"));
        String name = Ui.tr("Quiz da noite", "Quiz night", "Noche de quiz");
        if (game.done) {
            title.setText("🏆  " + name);
            question.setText(Ui.tr("Placar final", "Final scores", "Puntuación final"));
            sub.setText("");
            scores(true);
            return;
        }
        title.setText("🏆  " + name + " · " + game.round + " / " + game.total);
        question.setText(game.text);
        LinearLayout row = null;
        for (int i = 0; i < 4; i++) {
            if (i % 2 == 0) {
                row = new LinearLayout(this);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
                rp.bottomMargin = Math.round(16 * k);
                body.addView(row, rp);
            }
            View choice = choice(i);
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(0, -2, 1);
            if (i % 2 == 0) cp.rightMargin = Math.round(8 * k);
            else cp.leftMargin = Math.round(8 * k);
            row.addView(choice, cp);
        }
        if (game.answer < 0) {
            sub.setText(Ui.tr("Responda no Beyond Family. Vale o primeiro toque.",
                    "Buzz in on Beyond Family on your phone. The first tap counts.",
                    "Responde en Beyond Family. Cuenta el primer toque."));
            HorizontalScrollView scroll = new HorizontalScrollView(this);
            scroll.setHorizontalScrollBarEnabled(false);
            LinearLayout faces = new LinearLayout(this);
            faces.setGravity(Gravity.CENTER);
            scroll.addView(faces);
            for (Person p : game.answered) faces.addView(face(p));
            LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-2, -2);
            sp.topMargin = Math.round(20 * k);
            body.addView(scroll, sp);
            return;
        }
        StringBuilder got = new StringBuilder();
        for (Person p : game.right) got.append(got.length() > 0 ? ", " : "").append(p.name).append(p.first ? " ⚡" : "");
        sub.setText(got.length() > 0 ? Ui.tr("Acertaram: ", "Got it: ", "Acertaron: ") + got
                : Ui.tr("Ninguém acertou essa.", "Nobody got that one.", "Nadie acertó esa."));
        scores(false);
    }

    private View choice(int i) {
        boolean shown = game.answer >= 0, right = game.answer == i;
        LinearLayout c = new LinearLayout(this);
        c.setGravity(Gravity.CENTER_VERTICAL);
        int pad = Math.round(22 * k);
        c.setPadding(Math.round(30 * k), pad, Math.round(30 * k), pad);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(right ? 0xFF2F7D6D : 0x1FFFFFFF);
        bg.setCornerRadius(26 * k);
        c.setBackground(bg);
        TextView letter = FeedbackActivity.text(this, LETTERS[i], Ui.displaySemibold, 38 * k, right ? 0xFFF7F6F2 : 0x99F7F6F2);
        c.addView(letter, new LinearLayout.LayoutParams(Math.round(64 * k), -2));
        c.addView(FeedbackActivity.text(this, game.choices[i], Ui.semibold, 38 * k, 0xFFFFFFFF));
        if (shown && !right) c.setAlpha(0.35f);
        return c;
    }

    private void scores(boolean last) {
        if (game.scores == null) return;
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        for (int i = 0; i < game.scores.size() && i < 8; i++) {
            Person p = game.scores.get(i);
            LinearLayout c = new LinearLayout(this);
            c.setOrientation(LinearLayout.VERTICAL);
            int pad = Math.round(16 * k);
            c.setPadding(Math.round(26 * k), pad, Math.round(26 * k), pad);
            c.setBackground(FeedbackActivity.pill(0x1FFFFFFF, colour(p.colour), 22 * k, 4 * k, 0));
            c.addView(FeedbackActivity.text(this, (last && i == 0 && p.score > 0 ? "🏆 " : "") + p.name, Ui.semibold, 26 * k, 0xCCFFFFFF));
            c.addView(FeedbackActivity.text(this, String.valueOf(p.score), Ui.displaySemibold, (last ? 56 : 44) * k, 0xFFFFFFFF));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Math.round((last ? 260 : 190) * k), -2);
            lp.leftMargin = lp.rightMargin = Math.round(10 * k);
            row.addView(c, lp);
        }
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-2, -2);
        rp.topMargin = Math.round((last ? 30 : 20) * k);
        body.addView(row, rp);
    }

    private View face(Person p) {
        LinearLayout f = new LinearLayout(this);
        f.setOrientation(LinearLayout.VERTICAL);
        f.setGravity(Gravity.CENTER_HORIZONTAL);
        int size = Math.round(96 * k);
        TextView dot = FeedbackActivity.text(this, initial(p.name), Ui.displaySemibold, 40 * k, 0xFFFFFFFF);
        dot.setGravity(Gravity.CENTER);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(colour(p.colour));
        dot.setBackground(g);
        f.addView(dot, new LinearLayout.LayoutParams(size, size));
        TextView name = FeedbackActivity.text(this, p.name, Ui.medium, 24 * k, 0xFFFFFFFF);
        name.setPadding(0, Math.round(10 * k), 0, 0);
        f.addView(name);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.leftMargin = lp.rightMargin = Math.round(18 * k);
        f.setLayoutParams(lp);
        return f;
    }

    private static String initial(String name) {
        return name.isEmpty() ? "?" : name.substring(0, name.offsetByCodePoints(0, 1)).toUpperCase();
    }

    private static int colour(String hex) {
        try {
            return Color.parseColor(hex);
        } catch (RuntimeException e) {
            return 0xFF2F7D6D;
        }
    }
}
