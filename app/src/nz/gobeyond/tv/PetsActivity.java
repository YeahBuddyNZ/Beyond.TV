package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Have the pets been fed? When a kid picks their face on Who's watching and the household's pets in Beyond Family
 * still want a meal, the TV asks. "Yes" ticks them fed in Beyond Family (the same record as the Family page's fed
 * button, with the kid's name); "Not yet" sends them off to do it, and the TV asks again half an hour on.
 * Same as web/pets.js: change one, change both.
 */
public class PetsActivity extends Activity {
    private static final String ASKED = "pets.asked";
    private static final long AGAIN = 30 * 60_000L, WAIT = 60_000L;
    /** A kid picked their face before the pets had come from Beyond Family: ask once they do, within a minute. */
    private static volatile long wanted;

    /** "Betty", "Betty and Chimmy", "Betty, Chimmy and Rex". */
    static String names(List<JSONObject> pets) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < pets.size(); i++) {
            if (i > 0) b.append(i == pets.size() - 1 ? Ui.tr(" e ", " and ", " y ") : ", ");
            b.append(pets.get(i).optString("name"));
        }
        return b.toString();
    }

    /** A kid of this household (never a visitor from another home), on a TV linked to Beyond Family. */
    private static boolean kid(Context c, People.Person p) {
        return p != null && p.kid && !p.together() && !p.visitor && p.member() != null && Family.linked(c);
    }

    /** Called when somebody picks their face. True when it opened. */
    static boolean offer(Context c, People.Person p) {
        if (!kid(c, p)) return false;
        SharedPreferences sp = c.getSharedPreferences("people", Context.MODE_PRIVATE);
        if (System.currentTimeMillis() - sp.getLong(ASKED, 0) < AGAIN) return false;
        if (!Family.havePets()) {
            wanted = System.currentTimeMillis();
            return false;
        }
        wanted = 0;
        if (Family.petsDue().isEmpty()) return false;
        sp.edit().putLong(ASKED, System.currentTimeMillis()).apply();
        c.startActivity(new Intent(c, PetsActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return true;
    }

    /** The pets came from Beyond Family: if a kid picked their face just before, ask now. */
    static void arrived(Context c) {
        long w = wanted;
        wanted = 0;
        if (w != 0 && System.currentTimeMillis() - w < WAIT) offer(c, People.current(c));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        final People.Person me = People.current(this);
        final List<JSONObject> hungry = Family.petsDue();
        if (!kid(this, me) || hungry.isEmpty()) {
            finish();
            return;
        }
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(column, new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER));

        LinearLayout faces = new LinearLayout(this);
        faces.setGravity(Gravity.CENTER);
        int size = Math.round(160 * k);
        for (int i = 0; i < hungry.size() && i < 5; i++) {
            JSONObject pet = hungry.get(i);
            LinearLayout one = new LinearLayout(this);
            one.setOrientation(LinearLayout.VERTICAL);
            one.setGravity(Gravity.CENTER_HORIZONTAL);
            TextView face = FeedbackActivity.text(this, Ui.emoji(pet.optString("face", "🐾")), Ui.regular, 84 * k, 0xFFFFFFFF);
            GradientDrawable disc = new GradientDrawable();
            disc.setShape(GradientDrawable.OVAL);
            disc.setColor(Family.colour(pet.optString("colour"), Glow.VIOLET));
            face.setBackground(disc);
            face.setGravity(Gravity.CENTER);
            one.addView(face, new LinearLayout.LayoutParams(size, size));
            TextView name = FeedbackActivity.text(this, pet.optString("name"), Ui.displaySemibold, 34 * k, 0xFFFFFFFF);
            name.setPadding(0, Math.round(14 * k), 0, 0);
            one.addView(name, new LinearLayout.LayoutParams(-2, -2));
            LinearLayout.LayoutParams op = new LinearLayout.LayoutParams(-2, -2);
            op.leftMargin = op.rightMargin = Math.round(24 * k);
            faces.addView(one, op);
        }
        LinearLayout.LayoutParams fp = new LinearLayout.LayoutParams(-2, -2);
        fp.bottomMargin = Math.round(50 * k);
        column.addView(faces, fp);

        final String names = names(hungry);
        TextView words = FeedbackActivity.text(this, Ui.tr("Já deram comida para ", "Did ", "¿Ya le dieron de comer a ") + names
                + Ui.tr(" hoje?", " get fed today?", " hoy?"), Ui.displaySemibold, 84 * k, 0xFFFFFFFF);
        words.setLineSpacing(0, 1.05f);
        column.addView(words, new LinearLayout.LayoutParams(-1, -2));
        TextView sub = FeedbackActivity.text(this, Ui.tr("Oi, ", "Hey ", "Hola, ") + me.name
                + Ui.tr("! O Beyond Family fica sabendo também.", ", Beyond Family will know too.", ". Beyond Family también se entera."),
                Ui.regular, 34 * k, 0xA6FFFFFF);
        sub.setPadding(0, Math.round(26 * k), 0, Math.round(70 * k));
        column.addView(sub, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setGravity(Gravity.CENTER);
        Button yes = FeedbackActivity.button(this, "✓  " + Ui.tr("Sim, já comeram", "Yes, they're fed", "Sí, ya comieron"), k, true);
        Button notYet = FeedbackActivity.button(this, Ui.tr("Ainda não", "Not yet", "Todavía no"), k, false);
        for (Button b : new Button[] {yes, notYet}) {
            b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 38 * k);
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(100 * k));
            bp.leftMargin = bp.rightMargin = Math.round(16 * k);
            buttons.addView(b, bp);
        }
        column.addView(buttons, new LinearLayout.LayoutParams(-2, -2));

        final Context app = getApplicationContext();
        final String name = me.name;
        yes.setOnClickListener(v -> {
            finish();
            Family.petsFed(app, new ArrayList<>(hungry), me.member(), error -> Toast.makeText(app, error != null ? error
                    : Ui.tr("Obrigado, ", "Thanks, ", "¡Gracias, ") + name
                    + Ui.tr("! Está marcado no Beyond Family.", "! It's ticked off in Beyond Family.", "! Quedó marcado en Beyond Family."),
                    Toast.LENGTH_LONG).show());
        });
        notYet.setOnClickListener(v -> {
            finish();
            Toast.makeText(app, Ui.tr("Vai lá! ", "Off you go! ", "¡Anda! ") + names
                    + Ui.tr(" estão com fome.", " would love some food.", " tienen hambre."), Toast.LENGTH_LONG).show();
        });

        setContentView(root);
        yes.requestFocus();
    }
}
