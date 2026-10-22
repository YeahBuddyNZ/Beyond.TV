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
 * The dinner question: one question on the TV, everyone answers on their phones in Beyond Family. Until a grown-up
 * reveals them the TV only learns who has answered, so the faces fill in as people answer, then the answers come up
 * together. Same as dinner() in web/family.js. Everything here runs on the main thread of :home.
 */
public class DinnerActivity extends Activity {
    /** The question being asked, or null. */
    private static Ask ask;
    /** The screen while it is showing. */
    private static DinnerActivity showing;

    private static final class Person {
        final String name, colour, answer;

        Person(String name, String colour, String answer) {
            this.name = name;
            this.colour = colour;
            this.answer = answer;
        }
    }

    private static final class Ask {
        final String id, text;
        final List<Person> answered = new ArrayList<>();
        List<Person> answers;

        Ask(String id, String text) {
            this.id = id;
            this.text = text;
        }
    }

    /** A question, question-answered, question-reveal or question-end command from Beyond Family. */
    static void command(Context c, JSONObject cmd) {
        String kind = cmd.optString("kind"), id = cmd.optString("question");
        if (kind.equals("question")) {
            String text = cmd.optString("text");
            if (text.isEmpty()) return;
            ask = new Ask(id, text);
        } else if (ask == null || !ask.id.equals(id)) {
            return;
        } else if (kind.equals("question-end")) {
            ask = null;
            if (showing != null) showing.finish();
            return;
        } else if (kind.equals("question-answered")) {
            String name = cmd.optString("name");
            for (Person p : ask.answered) if (p.name.equals(name)) return;
            ask.answered.add(new Person(name, cmd.optString("colour"), ""));
            if (showing == null) {
                Toast.makeText(c, name + Ui.tr(" respondeu à pergunta do jantar", " answered the dinner question",
                        " respondió la pregunta de la cena"), Toast.LENGTH_SHORT).show();
                return;
            }
        } else if (kind.equals("question-reveal")) {
            List<Person> came = people(cmd.optJSONArray("answers"));
            if (cmd.optBoolean("more") && ask.answers != null && !came.isEmpty()) {
                // One person changed or added their answer after the reveal.
                Person a = came.get(0);
                boolean found = false;
                for (int i = 0; i < ask.answers.size(); i++) {
                    if (ask.answers.get(i).name.equals(a.name)) {
                        ask.answers.set(i, a);
                        found = true;
                    }
                }
                if (!found) ask.answers.add(a);
            } else {
                ask.answers = came;
            }
        } else {
            return;
        }
        if (showing != null) {
            showing.fill();
            return;
        }
        try {
            c.startActivity(new Intent(c, DinnerActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (RuntimeException e) {
            // Android may not let us open a screen over another app: say it instead.
            Toast.makeText(c, Ui.tr("Pergunta do jantar: ", "Dinner question: ", "Pregunta de la cena: ") + ask.text,
                    Toast.LENGTH_LONG).show();
        }
    }

    private static List<Person> people(JSONArray a) {
        List<Person> out = new ArrayList<>();
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || o.optString("name").isEmpty()) continue;
            out.add(new Person(o.optString("name"), o.optString("colour"), o.optString("answer")));
        }
        return out;
    }

    private float k;
    private TextView question, sub;
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
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1500 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(120 * k);
        root.addView(column, lp);

        TextView title = FeedbackActivity.text(this, "🍽  " + Ui.tr("Pergunta do jantar", "Dinner question", "Pregunta de la cena"),
                Ui.semibold, 30 * k, 0xFFE8A33D);
        title.setGravity(Gravity.CENTER);
        column.addView(title);
        question = FeedbackActivity.text(this, "", Ui.displaySemibold, 64 * k, 0xFFFFFFFF);
        question.setGravity(Gravity.CENTER);
        question.setPadding(0, Math.round(20 * k), 0, Math.round(16 * k));
        column.addView(question, new LinearLayout.LayoutParams(-1, -2));
        sub = FeedbackActivity.text(this, "", Ui.regular, 30 * k, 0xCCFFFFFF);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 0, 0, Math.round(44 * k));
        column.addView(sub, new LinearLayout.LayoutParams(-1, -2));
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setGravity(Gravity.CENTER_HORIZONTAL);
        column.addView(body, new LinearLayout.LayoutParams(-1, -2));

        Button ok = FeedbackActivity.button(this, Ui.tr("Fechar", "Close", "Cerrar"), k, false);
        ok.setOnClickListener(v -> finish());
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.topMargin = Math.round(44 * k);
        column.addView(ok, bp);

        setContentView(root);
        showing = this;
        fill();
        ok.requestFocus();
    }

    @Override protected void onDestroy() {
        if (showing == this) showing = null;
        super.onDestroy();
    }

    private void fill() {
        if (ask == null) {
            finish();
            return;
        }
        question.setText(ask.text);
        body.removeAllViews();
        if (ask.answers == null) {
            sub.setText(Ui.tr("Responda no Beyond Family, no seu celular. As respostas aparecem juntas.",
                    "Answer in Beyond Family on your phone. The answers come up together.",
                    "Responde en Beyond Family en tu teléfono. Las respuestas salen juntas."));
            HorizontalScrollView scroll = new HorizontalScrollView(this);
            scroll.setHorizontalScrollBarEnabled(false);
            LinearLayout faces = new LinearLayout(this);
            faces.setGravity(Gravity.CENTER);
            scroll.addView(faces);
            for (Person p : ask.answered) faces.addView(face(p));
            body.addView(scroll, new LinearLayout.LayoutParams(-2, -2));
            return;
        }
        sub.setText("");
        int i = 0;
        LinearLayout row = null;
        for (Person p : ask.answers) {
            if (i % 2 == 0) {
                row = new LinearLayout(this);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
                rp.bottomMargin = Math.round(18 * k);
                body.addView(row, rp);
            }
            View card = card(p);
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(0, -2, 1);
            if (i % 2 == 0) cp.rightMargin = Math.round(9 * k);
            else cp.leftMargin = Math.round(9 * k);
            row.addView(card, cp);
            // The answers come up one after another.
            card.setAlpha(0);
            card.setTranslationY(24 * k);
            card.animate().alpha(1).translationY(0).setStartDelay(250 + i * 450L).setDuration(400).start();
            i++;
        }
    }

    private View face(Person p) {
        LinearLayout f = new LinearLayout(this);
        f.setOrientation(LinearLayout.VERTICAL);
        f.setGravity(Gravity.CENTER_HORIZONTAL);
        int size = Math.round(110 * k);
        TextView dot = FeedbackActivity.text(this, initial(p.name), Ui.displaySemibold, 44 * k, 0xFFFFFFFF);
        dot.setGravity(Gravity.CENTER);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(colour(p.colour));
        dot.setBackground(g);
        f.addView(dot, new LinearLayout.LayoutParams(size, size));
        TextView name = FeedbackActivity.text(this, p.name, Ui.medium, 26 * k, 0xFFFFFFFF);
        name.setPadding(0, Math.round(12 * k), 0, 0);
        f.addView(name);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.leftMargin = lp.rightMargin = Math.round(20 * k);
        f.setLayoutParams(lp);
        return f;
    }

    private View card(Person p) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        int pad = Math.round(26 * k);
        c.setPadding(Math.round(32 * k), pad, Math.round(32 * k), pad);
        c.setBackground(FeedbackActivity.pill(0x1FFFFFFF, colour(p.colour), 24 * k, 4 * k, 0));
        c.addView(FeedbackActivity.text(this, p.name, Ui.semibold, 28 * k, colour(p.colour) | 0xFF000000));
        TextView a = FeedbackActivity.text(this, p.answer, Ui.medium, 36 * k, 0xFFFFFFFF);
        a.setPadding(0, Math.round(8 * k), 0, 0);
        c.addView(a);
        return c;
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
