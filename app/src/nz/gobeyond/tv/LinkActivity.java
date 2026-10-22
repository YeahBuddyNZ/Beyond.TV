package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

/**
 * Settings › Beyond Family. Not linked: a six-letter code, big, for a grown-up to type into Beyond Family on their
 * phone; it checks every few seconds and closes itself once the family says yes. Linked: which household, and a way to
 * unlink. Already behind the grown-up PIN for a kid, because Settings is.
 *
 * With VISIT (Who's watching › Sign in with Beyond Family): a code for somebody to sign in here from their own Beyond
 * Family, on this TV or anybody's, so their face comes across. Closes itself once they're here, watching.
 */
public class LinkActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private LinearLayout column;
    private TextView code, note;
    private float k;
    private volatile boolean open;
    private static final String VISIT = "visit";
    private final java.util.Set<String> before = new java.util.HashSet<>();

    static void open(Context c) {
        c.startActivity(new Intent(c, LinkActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    static void visit(Context c) {
        c.startActivity(new Intent(c, LinkActivity.class).putExtra(VISIT, true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
    }

    @Override protected void onResume() {
        super.onResume();
        open = true;
        if (getIntent().getBooleanExtra(VISIT, false)) visit();
        else if (Family.linked(this)) manage();
        else link();
    }

    @Override protected void onPause() {
        open = false;
        handler.removeCallbacksAndMessages(null);
        super.onPause();
    }

    private LinearLayout page(String heading, String sub) {
        if (column != null) root.removeView(column);
        column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER);
        lp.topMargin = Math.round(80 * k);
        root.addView(column, lp);
        TextView mark = FeedbackActivity.text(this, "Beyond Family", Ui.semibold, 30 * k, 0xCCFFFFFF);
        mark.setPadding(0, 0, 0, Math.round(18 * k));
        column.addView(mark);
        column.addView(FeedbackActivity.text(this, heading, Ui.displaySemibold, 60 * k, 0xFFFFFFFF));
        if (sub != null) {
            TextView t = FeedbackActivity.text(this, sub, Ui.regular, 28 * k, 0xCCFFFFFF);
            t.setPadding(Math.round(260 * k), Math.round(14 * k), Math.round(260 * k), 0);
            column.addView(t);
        }
        return column;
    }

    private Button button(LinearLayout row, String label, boolean primary, View.OnClickListener run) {
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setOnClickListener(run);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.leftMargin = bp.rightMargin = Math.round(12 * k);
        row.addView(b, bp);
        return b;
    }

    private LinearLayout buttons(LinearLayout parent) {
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        r.setPadding(0, Math.round(50 * k), 0, 0);
        parent.addView(r, new LinearLayout.LayoutParams(-1, -2));
        return r;
    }

    // MARK: - Linking

    private void link() {
        LinearLayout c = page(Ui.tr("Ligue esta TV à família", "Link this TV to your family"),
                Ui.tr("No celular, abra Beyond Family › Família › TVs › Adicionar TV, e digite",
                        "On your phone, open Beyond Family › Family › TVs › Add a TV, and type"));
        code = FeedbackActivity.text(this, "", Ui.displaySemibold, 150 * k, 0xFFFFFFFF);
        code.setLetterSpacing(0.12f);
        code.setPadding(0, Math.round(40 * k), 0, Math.round(10 * k));
        c.addView(code);
        note = FeedbackActivity.text(this, "", Ui.regular, 26 * k, 0x99FFFFFF);
        c.addView(note);
        button(buttons(c), Ui.tr("Cancelar", "Cancel"), false, v -> finish()).requestFocus();
        hello();
    }

    private void hello() {
        code.setText("");
        note.setText(Ui.tr("Falando com o Beyond Family…", "Talking to Beyond Family…"));
        final Context app = getApplicationContext();
        new Thread(() -> {
            try {
                JSONObject res = Family.code(app);
                handler.post(() -> {
                    if (!open) return;
                    if (res.optBoolean("paired")) { check(0); return; }
                    String c = res.optString("code");
                    code.setText(c.length() == 6 ? c.substring(0, 3) + " " + c.substring(3) : c);
                    note.setText(Ui.tr("O código vale por ", "The code lasts ") + res.optInt("minutes", 10) + " min.");
                    check(3000);
                });
            } catch (Exception e) {
                handler.post(() -> {
                    if (!open) return;
                    note.setText(Ui.tr("Não deu para falar com o Beyond Family. Veja a internet da TV e tente de novo.",
                            "Couldn't reach Beyond Family. Check the TV's internet and try again."));
                    handler.postDelayed(this::hello, 10_000);
                });
            }
        }, "beyond-family-link").start();
    }

    private void check(long delay) {
        handler.postDelayed(() -> {
            if (!open) return;
            final Context app = getApplicationContext();
            new Thread(() -> {
                JSONObject res;
                try {
                    res = Family.check(app);
                } catch (Family.Fail f) {
                    handler.post(() -> { if (!open) return; if (f.status == 401) hello(); else check(5000); });
                    return;
                } catch (Exception e) {
                    handler.post(() -> check(5000));
                    return;
                }
                handler.post(() -> {
                    if (!open) return;
                    if (!res.optBoolean("paired")) {
                        if (res.optBoolean("expired")) hello(); else check(3000);
                        return;
                    }
                    FamilyService.start(app);
                    Toast.makeText(app, Ui.tr("Ligada a ", "Linked to ") + Family.homeName(app), Toast.LENGTH_LONG).show();
                    finish();
                });
            }, "beyond-family-check").start();
        }, delay);
    }

    // MARK: - Signing in as a visitor

    private void visit() {
        before.clear();
        for (People.Person p : People.list(this)) before.add(p.id);
        LinearLayout c = page(Ui.tr("Entre com o seu Beyond Family", "Sign in with your Beyond Family"),
                Ui.tr("No celular, abra Beyond Family › Família › TVs › Na TV de outra pessoa, e digite",
                        "On your phone, open Beyond Family › Family › TVs › On somebody else's TV, and type"));
        code = FeedbackActivity.text(this, "", Ui.displaySemibold, 150 * k, 0xFFFFFFFF);
        code.setLetterSpacing(0.12f);
        code.setPadding(0, Math.round(40 * k), 0, Math.round(10 * k));
        c.addView(code);
        note = FeedbackActivity.text(this, "", Ui.regular, 26 * k, 0x99FFFFFF);
        c.addView(note);
        if (Family.linked(this)) {
            TextView t = FeedbackActivity.text(this, Ui.tr("A sua família já está nesta TV. Isto é para quem é de outra casa.",
                    "Your family is on this TV already. This is for somebody from another home."), Ui.regular, 26 * k, 0x99FFFFFF);
            t.setPadding(0, Math.round(10 * k), 0, 0);
            c.addView(t);
        }
        button(buttons(c), Ui.tr("Cancelar", "Cancel"), false, v -> finish()).requestFocus();
        visitCode();
    }

    private void visitCode() {
        code.setText("");
        note.setText(Ui.tr("Falando com o Beyond Family…", "Talking to Beyond Family…"));
        final Context app = getApplicationContext();
        new Thread(() -> {
            try {
                JSONObject res = Family.visitCode(app);
                handler.post(() -> {
                    if (!open) return;
                    String c = res.optString("code");
                    code.setText(c.length() == 6 ? c.substring(0, 3) + " " + c.substring(3) : c);
                    note.setText(Ui.tr("O código vale por ", "The code lasts ") + res.optInt("minutes", 10) + " min.");
                    arrived(3000);
                });
            } catch (Exception e) {
                handler.post(() -> {
                    if (!open) return;
                    note.setText(Ui.tr("Não deu para falar com o Beyond Family. Veja a internet da TV e tente de novo.",
                            "Couldn't reach Beyond Family. Check the TV's internet and try again."));
                    handler.postDelayed(this::visitCode, 10_000);
                });
            }
        }, "beyond-family-visit").start();
    }

    /** Looks for somebody new among the TV's people: the one who just signed in. */
    private void arrived(long delay) {
        handler.postDelayed(() -> {
            if (!open) return;
            final Context app = getApplicationContext();
            new Thread(() -> {
                try {
                    Family.check(app);
                } catch (Exception ignored) {
                }
                // apply() hands the people to the main thread; look after it has.
                handler.postDelayed(() -> {
                    if (!open) return;
                    People.Person fresh = null;
                    for (People.Person p : People.list(app)) if (p.visitor && !before.contains(p.id)) fresh = p;
                    if (fresh == null) {
                        arrived(3000);
                        return;
                    }
                    FamilyService.start(app);
                    People.use(app, fresh.id);
                    Toast.makeText(app, Ui.hello() + ", " + fresh.name, Toast.LENGTH_LONG).show();
                    finish();
                }, 300);
            }, "beyond-family-visit-check").start();
        }, delay);
    }

    // MARK: - Linked

    private void manage() {
        FamilyService.start(this);
        LinearLayout c = page(Family.homeName(this),
                Ui.tr("Esta TV mostra as pessoas da família, obedece ao controle no celular e mostra os recados.",
                        "This TV shows your family's people, follows the remote on your phone and shows the family's messages."));
        LinearLayout row = buttons(c);
        button(row, Ui.tr("Pronto", "Done"), true, v -> finish()).requestFocus();
        button(row, Ui.tr("Desligar esta TV", "Unlink this TV"), false, v -> {
            Family.bye(this);
            FamilyService.stop(this);
            Toast.makeText(this, Ui.tr("Desligada do Beyond Family", "Unlinked from Beyond Family"), Toast.LENGTH_LONG).show();
            finish();
        });
    }
}
