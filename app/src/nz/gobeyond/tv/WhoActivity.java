package nz.gobeyond.tv;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.List;

/**
 * Who's watching? Family first (everyone together), then each person. Also where people are added, changed and
 * removed, and where the grown-up PIN is set and asked for. One screen at a time inside the same breathing backdrop
 * as Talk to Beyond. What a kid may do follows People: the PIN stands between a kids' profile and anything grown-up.
 */
public class WhoActivity extends Activity {
    static final String THEN = "then";
    /** After the PIN: open Beyond TV's settings, or the TV's own. */
    static final String THEN_SETTINGS = "settings", THEN_TV_SETTINGS = "tv-settings";

    private FrameLayout root;
    private LinearLayout column;
    private float k;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        String then = getIntent().getStringExtra(THEN);
        // Settings for a kid: the grown-up PIN, or with no PIN set, switching to a grown-up first.
        if (then != null && !People.kid(this)) openThen();
        else if (then != null && People.hasPin(this)) askPin(Ui.tr("PIN de adulto", "Grown-up PIN"), this::openThen);
        else pick();
    }

    private void openThen() {
        String then = getIntent().getStringExtra(THEN);
        SettingsActivity.unlock();
        Intent i = THEN_TV_SETTINGS.equals(then) ? new Intent(Settings.ACTION_SETTINGS)
                : new Intent().setComponent(new ComponentName(this, SettingsActivity.class));
        try {
            startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Exception ignored) {
        }
        finish();
    }

    /** Clears the screen for the next step and returns the column to fill. */
    private LinearLayout page(String heading, String sub) {
        if (column != null) root.removeView(column);
        column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        column.setClipChildren(false);
        root.setClipChildren(false);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER);
        lp.topMargin = Math.round(80 * k);
        root.addView(column, lp);
        column.addView(FeedbackActivity.text(this, heading, Ui.displaySemibold, 60 * k, 0xFFFFFFFF));
        if (sub != null) {
            TextView t = FeedbackActivity.text(this, sub, Ui.regular, 28 * k, 0xCCFFFFFF);
            t.setPadding(Math.round(200 * k), Math.round(14 * k), Math.round(200 * k), 0);
            column.addView(t);
        }
        return column;
    }

    private LinearLayout row(LinearLayout parent, float top) {
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        r.setPadding(0, Math.round(top * k), 0, 0);
        parent.addView(r, new LinearLayout.LayoutParams(-1, -2));
        return r;
    }

    private Button add(LinearLayout row, String label, boolean primary, View.OnClickListener run) {
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setOnClickListener(run);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.leftMargin = bp.rightMargin = Math.round(12 * k);
        row.addView(b, bp);
        return b;
    }

    /** A row of faces that scrolls sideways when there are many people. */
    private LinearLayout faces(LinearLayout parent) {
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.setClipChildren(false);
        scroll.setClipToPadding(false);
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        r.setClipChildren(false);
        r.setPadding(Math.round(60 * k), Math.round(70 * k), Math.round(60 * k), Math.round(30 * k));
        scroll.addView(r, new FrameLayout.LayoutParams(-2, -2));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        parent.addView(scroll, lp);
        return r;
    }

    private Face face(LinearLayout row, People.Person p, String under, View.OnClickListener run) {
        return face(row, p, under, run, 1f);
    }

    /** big: 1 for a full row, more when there are only a few faces and the screen has room for them. */
    private Face face(LinearLayout row, People.Person p, String under, View.OnClickListener run, float big) {
        Face f = new Face(this, p, under, k * big);
        f.setOnClickListener(run);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Math.round(260 * k * big), Math.round(380 * k * big));
        lp.leftMargin = lp.rightMargin = Math.round(20 * k * big);
        row.addView(f, lp);
        return f;
    }

    // MARK: - Who's watching?

    private void pick() {
        LinearLayout c = page(Ui.tr("Quem está assistindo?", "Who's watching?"), null);
        LinearLayout row = faces(c);
        People.Person now = People.current(this);
        Face first = null;
        java.util.List<People.Person> choices = People.choices(this);
        // A few faces get the room a few faces deserve; a full house keeps them at the size that fits a row.
        float big = choices.size() <= 2 ? 1.35f : choices.size() <= 4 ? 1.15f : 1f;
        for (People.Person p : choices) {
            Face f = face(row, p, p.together() ? Ui.tr("Todos juntos", "Everyone together") : null, v -> choose(p), big);
            if (p.id.equals(now.id)) first = f;
        }
        LinearLayout foot = row(c, 40);
        if (now.kid && !now.together()) {
            // Their buddy, colour, world and loves: theirs to change, no PIN.
            add(foot, Ui.tr("Do seu jeito", "Make it yours", "A tu manera"), true, v -> {
                MyWorldActivity.open(this);
                finish();
            });
        }
        add(foot, Ui.tr("Gerenciar pessoas", "Manage people"), false, v -> guard(this::manage));
        if (!Family.linked(this)) {
            // On its own, a TV only knows "Me". Linked, it shows everyone in the family, in their own faces.
            add(foot, Ui.tr("Trazer a família do Beyond Family", "Bring in your family from Beyond Family"), false,
                    v -> guard(() -> LinkActivity.open(this)));
        }
        // Your own face from Beyond Family, on this TV or anybody's. Linked, the family is already here: it's for visitors.
        add(foot, Family.linked(this) ? Ui.tr("Visitando? Entre aqui", "Visiting? Sign in here")
                : Ui.tr("Entrar com o Beyond Family", "Sign in with Beyond Family"), false, v -> {
            LinkActivity.visit(this);
            finish();
        });
        if (first != null) first.requestFocus();
    }

    private void choose(People.Person p) {
        People.Person now = People.current(this);
        Runnable go = () -> {
            People.use(this, p.id);
            MyWorldActivity.offer(this, p);   // a kid's first time: make it yours
            finish();
        };
        // A kid moving to Family or a grown-up needs the PIN; anyone moving to a kid's profile doesn't.
        if (now.kid && !p.kid && People.hasPin(this)) askPin(Ui.tr("PIN de adulto", "Grown-up PIN"), go);
        else go.run();
    }

    /** Runs then straight away for grown-ups (or with no PIN set), else after the PIN. */
    private void guard(Runnable then) {
        if (!People.kid(this) || !People.hasPin(this)) then.run();
        else askPin(Ui.tr("PIN de adulto", "Grown-up PIN"), then);
    }

    @Override public void onBackPressed() {
        People.asked(this);   // asked, and they kept whoever it was: don't ask again straight away
        super.onBackPressed();
    }

    // MARK: - Managing people

    private void manage() {
        LinearLayout c = page(Ui.tr("Pessoas", "People"), Ui.tr("Escolha alguém para mudar, ou adicione alguém.",
                "Pick someone to change, or add someone."));
        LinearLayout row = faces(c);
        Face first = null;
        for (People.Person p : People.list(this)) {
            Face f = face(row, p, Ui.tr("Editar", "Edit"), v -> edit(p));
            if (first == null) first = f;
        }
        People.Person plus = new People.Person();
        plus.id = "+";
        plus.name = "+";
        plus.colour = 0x33FFFFFF;
        face(row, plus, Ui.tr("Adicionar", "Add someone"), v -> edit(null));
        LinearLayout foot = row(c, 40);
        add(foot, People.hasPin(this) ? Ui.tr("Mudar o PIN de adulto", "Change the grown-up PIN")
                : Ui.tr("Criar um PIN de adulto", "Set a grown-up PIN"), false, v -> setPin());
        add(foot, Ui.tr("Pronto", "Done"), true, v -> pick());
        if (first != null) first.requestFocus();
    }

    private void edit(People.Person person) {
        final List<People.Person> people = People.list(this);
        final boolean isNew = person == null;
        final People.Person p = new People.Person();
        if (isNew) {
            p.id = People.newId(people);
            p.name = "";
            p.colour = People.COLOURS[people.size() % People.COLOURS.length];
        } else {
            p.id = person.id;
            p.name = person.name;
            p.colour = person.colour;
            p.kid = person.kid;
            p.emoji = person.emoji;
            p.visitor = person.visitor;
        }
        LinearLayout c = page(isNew ? Ui.tr("Adicionar alguém", "Add someone") : p.name, null);

        EditText name = new EditText(this);
        name.setTypeface(Ui.regular);
        name.setTextSize(TypedValue.COMPLEX_UNIT_PX, 34 * k);
        name.setTextColor(0xFFFFFFFF);
        name.setHintTextColor(0x80FFFFFF);
        name.setHint(Ui.tr("Nome", "Name"));
        name.setText(p.name);
        name.setSingleLine(true);
        name.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        name.setImeOptions(EditorInfo.IME_ACTION_DONE);
        name.setFilters(new android.text.InputFilter[] {new android.text.InputFilter.LengthFilter(20)});
        int pad = Math.round(22 * k);
        name.setPadding(pad, pad, pad, pad);
        name.setBackground(FeedbackActivity.pill(0x33FFFFFF, 0x5CFFFFFF, 20 * k, 2 * k, Glow.LILAC));
        LinearLayout.LayoutParams np = new LinearLayout.LayoutParams(Math.round(700 * k), -2);
        np.topMargin = Math.round(40 * k);
        np.gravity = Gravity.CENTER_HORIZONTAL;
        c.addView(name, np);

        LinearLayout swatches = row(c, 34);
        for (int colour : People.COLOURS) {
            Swatch s = new Swatch(this, colour, k);
            s.setSelected(colour == p.colour);
            s.setOnClickListener(v -> {
                p.colour = colour;
                for (int i = 0; i < swatches.getChildCount(); i++) swatches.getChildAt(i).setSelected(swatches.getChildAt(i) == v);
            });
            LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(Math.round(84 * k), Math.round(84 * k));
            sp.leftMargin = sp.rightMargin = Math.round(10 * k);
            swatches.addView(s, sp);
        }

        LinearLayout kidRow = row(c, 30);
        final Button kid = add(kidRow, "", false, null);
        Runnable kidLabel = () -> kid.setText((p.kid ? "★ " : "") + Ui.tr("Perfil infantil: ", "Kids' profile: ")
                + (p.kid ? Ui.tr("sim", "on") : Ui.tr("não", "off")));
        kidLabel.run();
        kid.setOnClickListener(v -> {
            if (!p.kid && !isNew && !person.kid && grownUps(people) <= 1) {
                note(Ui.tr("Precisa de pelo menos um adulto.", "There needs to be at least one grown-up."));
                return;
            }
            p.kid = !p.kid;
            kidLabel.run();
        });

        LinearLayout actions = row(c, 30);
        add(actions, Ui.tr("Salvar", "Save"), true, v -> {
            String n = name.getText().toString().trim();
            if (n.isEmpty()) {
                name.requestFocus();
                return;
            }
            p.name = n;
            boolean found = false;
            for (int i = 0; i < people.size(); i++) {
                if (people.get(i).id.equals(p.id)) {
                    people.set(i, p);
                    found = true;
                }
            }
            if (!found) people.add(p);
            People.save(this, people);
            // A colour chosen here is theirs on every TV.
            if (!isNew && p.member() != null && p.colour != person.colour) Family.pushColour(this, p.member(), p.colour);
            manage();
        });
        if (!isNew && p.visitor && p.member() != null) {
            add(actions, Ui.tr("Sair desta TV", "Sign out of this TV"), false, v -> {
                Family.signOut(this, p.member());
                for (int i = people.size() - 1; i >= 0; i--) if (people.get(i).id.equals(p.id)) people.remove(i);
                People.save(this, people);
                manage();
            });
        } else if (!isNew && people.size() > 1) {
            add(actions, Ui.tr("Remover", "Remove"), false, v -> {
                if (!person.kid && grownUps(people) <= 1) {
                    note(Ui.tr("Precisa de pelo menos um adulto.", "There needs to be at least one grown-up."));
                    return;
                }
                for (int i = people.size() - 1; i >= 0; i--) if (people.get(i).id.equals(p.id)) people.remove(i);
                People.save(this, people);
                manage();
            });
        }
        add(actions, Ui.tr("Voltar", "Back"), false, v -> manage());
        if (isNew) name.requestFocus();
        else swatches.getChildAt(0).requestFocus();
    }

    private static int grownUps(List<People.Person> people) {
        int n = 0;
        for (People.Person p : people) if (!p.kid) n++;
        return n;
    }

    private TextView noteView;

    private void note(String s) {
        if (noteView != null && noteView.getParent() == column) column.removeView(noteView);
        noteView = FeedbackActivity.text(this, s, Ui.medium, 28 * k, Glow.LILAC);
        noteView.setPadding(0, Math.round(24 * k), 0, 0);
        column.addView(noteView);
    }

    // MARK: - The grown-up PIN

    /** Four numbers on the remote. then runs when they match the PIN. */
    private void askPin(String heading, Runnable then) {
        pinPage(heading, Ui.tr("Digite os quatro números.", "Type the four numbers."), typed -> {
            if (typed.equals(People.pin(this))) {
                then.run();
                return true;
            }
            return false;
        });
    }

    private void setPin() {
        Runnable choose = () -> pinPage(Ui.tr("Novo PIN de adulto", "New grown-up PIN"),
                Ui.tr("Quatro números que as crianças não sabem.", "Four numbers the kids don't know."), first -> {
                    handler.post(() -> pinPage(Ui.tr("Digite de novo", "Type it again"), null, again -> {
                        if (!again.equals(first)) return false;
                        People.setPin(this, first);
                        manage();
                        return true;
                    }));
                    return true;
                });
        if (People.hasPin(this)) askPin(Ui.tr("PIN atual", "Current PIN"), () -> handler.post(choose));
        else choose.run();
    }

    interface Check { boolean ok(String typed); }

    private void pinPage(String heading, String sub, Check check) {
        LinearLayout c = page(heading, sub);
        EditText digits = new EditText(this);
        digits.setTypeface(Ui.displaySemibold);
        digits.setTextSize(TypedValue.COMPLEX_UNIT_PX, 64 * k);
        digits.setTextColor(0xFFFFFFFF);
        digits.setGravity(Gravity.CENTER);
        digits.setLetterSpacing(0.6f);
        digits.setSingleLine(true);
        digits.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        digits.setFilters(new android.text.InputFilter[] {new android.text.InputFilter.LengthFilter(4)});
        int pad = Math.round(20 * k);
        digits.setPadding(pad, pad, pad, pad);
        digits.setBackground(FeedbackActivity.pill(0x33FFFFFF, 0x5CFFFFFF, 20 * k, 2 * k, Glow.LILAC));
        LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(Math.round(420 * k), -2);
        dp.topMargin = Math.round(50 * k);
        dp.gravity = Gravity.CENTER_HORIZONTAL;
        c.addView(digits, dp);
        digits.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int d) {}
            @Override public void onTextChanged(CharSequence s, int a, int b, int d) {}
            @Override public void afterTextChanged(android.text.Editable s) {
                if (s.length() < 4) return;
                String typed = s.toString();
                handler.post(() -> {
                    if (!check.ok(typed)) {
                        digits.setText("");
                        note(Ui.tr("Não é esse. Tente de novo.", "That's not it. Try again."));
                    }
                });
            }
        });
        digits.requestFocus();
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    static void open(Context c, String then) {
        Intent i = new Intent(c, WhoActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (then != null) i.putExtra(THEN, then);
        c.startActivity(i);
    }

    // MARK: - Faces and swatches

    /** A person: a disc in their colour with their initial (Family wears the four dots), their name below. */
    private static final class Face extends View {
        private final People.Person p;
        private final String under;
        private final float k;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG), ink = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final String initial;

        Face(Context c, People.Person p, String under, float k) {
            super(c);
            this.p = p;
            this.under = under;
            this.k = k;
            initial = "+".equals(p.id) ? "+" : p.initial();
            setFocusable(true);
            setClickable(true);
            ink.setTextAlign(Paint.Align.CENTER);
            setOnFocusChangeListener((v, has) -> {
                float s = has ? 1.1f : 1f;
                animate().scaleX(s).scaleY(s).translationY(has ? -12 * k : 0).setDuration(160).start();
                invalidate();
            });
        }

        @Override protected void onDraw(Canvas c) {
            // Room above the ring, so lifted and grown on focus it never meets the edge of the view.
            float cx = getWidth() / 2f, r = 100 * k, cy = 46 * k + r;
            if (isFocused()) {
                paint.setColor(0xFFFFFFFF);
                c.drawCircle(cx, cy, r + 10 * k, paint);
                paint.setColor(0xFF0D0C18);
                c.drawCircle(cx, cy, r + 5 * k, paint);
            }
            paint.setColor(p.colour);
            c.drawCircle(cx, cy, r, paint);
            if (p.together()) {
                Breath.mark(c, ink, cx, cy, 80 * k, -1, 10, 1);
                ink.setShader(null);
            } else {
                ink.setColor(0xFFFFFFFF);
                ink.setTypeface(Ui.displaySemibold);
                ink.setTextSize(88 * k);
                c.drawText(initial, cx, cy - (ink.ascent() + ink.descent()) / 2, ink);
            }
            if (p.kid) {
                paint.setColor(0xFFE8A33D);
                c.drawCircle(cx + r * 0.72f, cy + r * 0.72f, 26 * k, paint);
                ink.setColor(0xFF22221F);
                ink.setTextSize(30 * k);
                c.drawText("★", cx + r * 0.72f, cy + r * 0.72f + 11 * k, ink);
            }
            ink.setColor(isFocused() ? 0xFFFFFFFF : 0xBFFFFFFF);
            ink.setTypeface(Ui.semibold);
            ink.setTextSize(34 * k);
            String name = "+".equals(p.id) ? "" : p.name;
            c.drawText(name, cx, cy + r + 60 * k, ink);
            if (under != null) {
                ink.setColor(0x99FFFFFF);
                ink.setTypeface(Ui.regular);
                ink.setTextSize(24 * k);
                c.drawText(under, cx, cy + r + (name.isEmpty() ? 60 : 96) * k, ink);
            }
        }
    }

    /** A colour to pick, ringed when chosen and lifted when focused. */
    private static final class Swatch extends View {
        private final int colour;
        private final float k;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        Swatch(Context c, int colour, float k) {
            super(c);
            this.colour = colour;
            this.k = k;
            setFocusable(true);
            setClickable(true);
            setOnFocusChangeListener((v, has) -> {
                animate().scaleX(has ? 1.18f : 1f).scaleY(has ? 1.18f : 1f).setDuration(140).start();
                invalidate();
            });
        }

        @Override protected void onDraw(Canvas c) {
            float cx = getWidth() / 2f, cy = getHeight() / 2f, r = getWidth() / 2f - 8 * k;
            if (isSelected() || isFocused()) {
                paint.setColor(isFocused() ? 0xFFFFFFFF : 0x99FFFFFF);
                c.drawCircle(cx, cy, r + 6 * k, paint);
                paint.setColor(0xFF0D0C18);
                c.drawCircle(cx, cy, r + 2 * k, paint);
            }
            paint.setColor(colour);
            c.drawCircle(cx, cy, r, paint);
        }

        @Override public void setSelected(boolean selected) {
            super.setSelected(selected);
            invalidate();
        }
    }
}
