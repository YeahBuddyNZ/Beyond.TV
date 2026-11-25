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
    /** After the PIN: 15 more minutes of screen time for the kid watching (TimeUpActivity, ADR 0060). */
    static final String THEN_MORE_TIME = "more-time";
    /** Straight to adding people: the end of Getting started, for a house with kids (SetupActivity, ADR 0078). */
    static final String THEN_PEOPLE = "people";

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
        if (THEN_MORE_TIME.equals(then)) {
            ScreenTimeService.more(this, People.current(this).id, ScreenTime.MORE);
            android.widget.Toast.makeText(this, Ui.tr("Mais 15 minutos.", "15 more minutes.", "15 minutos más."), android.widget.Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        if (THEN_PEOPLE.equals(then)) {
            manage();
            return;
        }
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
        stopWarm();
        stopAsking();
        typing = null;
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

    /** Faces per row: one row while they fit at a readable size, then two or three rows, so nobody needs a scroll. */
    static int perRow(int n) {
        int rows = n <= 7 ? 1 : n <= 14 ? 2 : 3;
        return (n + rows - 1) / rows;
    }

    /** How big each face is drawn: room to spare for a few, smaller so a whole row fits the 1800 px it has. */
    static float fit(int n, float most) {
        int across = perRow(n), rows = (n + across - 1) / Math.max(1, across);
        float wide = 1800f / (across * 300f), tall = rows == 1 ? most : rows == 2 ? 0.72f : 0.5f;
        return Math.max(0.45f, Math.min(most, Math.min(wide, tall)));
    }

    /** The faces in rows that fit the screen. Rows come back in order; fill each with up to perRow(n) faces. */
    private LinearLayout[] faceRows(LinearLayout parent, int n, float big) {
        int across = perRow(n), count = (n + across - 1) / Math.max(1, across);
        LinearLayout[] rows = new LinearLayout[Math.max(1, count)];
        for (int i = 0; i < rows.length; i++) {
            LinearLayout r = new LinearLayout(this);
            r.setGravity(Gravity.CENTER);
            r.setClipChildren(false);
            // Room above for a focused face to grow into.
            r.setPadding(Math.round(60 * k), Math.round((i == 0 ? 70 : 24) * k * Math.max(big, 0.6f)), Math.round(60 * k), 0);
            parent.addView(r, new LinearLayout.LayoutParams(-1, -2));
            rows[i] = r;
        }
        return rows;
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
        People.Person now = People.current(this);
        Face first = null;
        java.util.List<People.Person> choices = People.choices(this);
        // A few faces get the room a few faces deserve; a big family gets smaller faces, then rows, all on one screen.
        // Smaller than before (ADR 0066), to leave room under them for the warm notes.
        int n = choices.size();
        float big = fit(n, n <= 2 ? 1.05f : n <= 4 ? 0.9f : 0.78f) * (n > 7 ? 0.9f : 1f);
        LinearLayout[] rows = faceRows(c, n, big);
        java.util.List<People.Person> noted = new java.util.ArrayList<>();
        java.util.List<Face> notedFaces = new java.util.ArrayList<>();
        for (int i = 0; i < n; i++) {
            People.Person p = choices.get(i);
            // Under the name: Everyone together for Family, a kid's newest award for a fortnight (ADR 0072).
            Face f = face(rows[i / perRow(n)], p, p.together() ? Ui.tr("Todos juntos", "Everyone together") : badge(p), v -> choose(p), big);
            if (p.id.equals(now.id)) first = f;
            if (!p.together() && !p.visitor) {
                noted.add(p);
                notedFaces.add(f);
            }
        }
        warmNotes(c, noted, notedFaces);
        LinearLayout foot = row(c, 24);
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

    // MARK: - Warm notes (ADR 0066)

    private TextView warm;
    private WarmNotes.Memory warmMemory;
    private final java.util.Random dice = new java.util.Random();
    private final Runnable warmNext = this::showWarm;
    private java.util.List<People.Person> warmPeople;
    private java.util.List<Face> warmFaces;

    /** One kind line at a time under the faces, each person in turn, big enough to read from the couch. */
    private void warmNotes(LinearLayout c, java.util.List<People.Person> people, java.util.List<Face> faces) {
        handler.removeCallbacks(warmNext);
        warmPeople = people;
        warmFaces = faces;
        warm = FeedbackActivity.text(this, "", Ui.displaySemibold, 46 * k, 0xFFFFFFFF);
        warm.setSingleLine(true);
        warm.setEllipsize(android.text.TextUtils.TruncateAt.END);
        warm.setShadowLayer(18 * k, 0, 4 * k, 0x66000000);
        warm.setAlpha(0f);
        LinearLayout.LayoutParams wp = new LinearLayout.LayoutParams(-1, Math.round(110 * k));
        wp.topMargin = Math.round(18 * k);
        c.addView(warm, wp);
        if (people.isEmpty()) return;
        // Shuffled (ADR 0072) and remembered between visits, so opening the screen again carries on.
        warmMemory = loadWarm();
        handler.postDelayed(warmNext, 900);
    }

    private void showWarm() {
        if (warm == null || warmPeople == null || warmPeople.isEmpty()) return;
        int n = warmPeople.size();
        WarmNotes.Who[] cast = new WarmNotes.Who[n];
        for (int i = 0; i < n; i++) {
            People.Person p = warmPeople.get(i);
            cast[i] = new WarmNotes.Who(p.name, p.kid, p.school(), p.kid ? awards(p) : null, p.parent);
        }
        String lang = Ui.de ? "de" : Ui.ru ? "ru" : Ui.es ? "es" : Ui.en ? "en" : "pt";
        WarmNotes.Note note = WarmNotes.next(cast, warmMemory, dice::nextDouble, lang);
        if (note == null) return;
        saveWarm(warmMemory);
        People.Person who = warmPeople.get(note.who);
        // A dot in their colour, so it's clear whose note it is, then the words.
        android.text.SpannableString line = new android.text.SpannableString("\u25CF  " + note.text);
        line.setSpan(new android.text.style.ForegroundColorSpan(who.colour | 0xFF000000), 0, 1, 0);
        warm.animate().cancel();
        warm.setText(line);
        warm.setTranslationY(26 * k);
        warm.setAlpha(0f);
        warm.animate().alpha(1f).translationY(0).setDuration(700).setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
        // Their face gives a little hop (unless it's the one lifted for focus).
        Face f = warmFaces.get(note.who);
        if (!f.isFocused()) {
            f.animate().translationY(-16 * k).setDuration(260).withEndAction(() -> f.animate().translationY(0).setDuration(420)
                    .setInterpolator(new android.view.animation.BounceInterpolator()).start()).start();
        }
        handler.postDelayed(() -> { if (warm != null) warm.animate().alpha(0f).translationY(-14 * k).setDuration(500).start(); }, 5600);
        handler.postDelayed(warmNext, 6400);
    }

    /** A kid's awards as the notes want them: {title, from, note}, newest first. */
    private static String[][] awards(People.Person p) {
        try {
            org.json.JSONArray a = new org.json.JSONArray(p.awards == null || p.awards.isEmpty() ? "[]" : p.awards);
            String[][] out = new String[a.length()][];
            for (int i = 0; i < a.length(); i++) {
                org.json.JSONObject o = a.getJSONObject(i);
                out[i] = new String[] {o.optString("title"), o.optString("from"), o.optString("note")};
            }
            return out;
        } catch (Exception e) {
            return null;
        }
    }

    /** The newest award under a kid's name, for a fortnight (ADR 0072), or null. */
    private static String badge(People.Person p) {
        if (!p.kid || p.awards == null || p.awards.isEmpty()) return null;
        try {
            org.json.JSONObject a = new org.json.JSONArray(p.awards).getJSONObject(0);
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ROOT).format(new java.util.Date());
            String b = WarmNotes.badge(a.optString("title"), a.optString("emoji"), a.optString("on"), today);
            return b.isEmpty() ? null : b;
        } catch (Exception e) {
            return null;
        }
    }

    private WarmNotes.Memory loadWarm() {
        WarmNotes.Memory m = new WarmNotes.Memory();
        try {
            org.json.JSONObject o = new org.json.JSONObject(getSharedPreferences("people", MODE_PRIVATE).getString("warm", "{}"));
            org.json.JSONArray bag = o.optJSONArray("bag"), recent = o.optJSONArray("recent");
            for (int i = 0; bag != null && i < bag.length(); i++) m.bag.add(bag.optString(i));
            for (int i = 0; recent != null && i < recent.length(); i++) m.recent.add(recent.optString(i));
            m.last = o.optString("last");
            m.tone = o.optString("tone");
        } catch (Exception ignored) {
        }
        return m;
    }

    private void saveWarm(WarmNotes.Memory m) {
        try {
            String o = new org.json.JSONObject().put("bag", new org.json.JSONArray(m.bag)).put("recent", new org.json.JSONArray(m.recent))
                    .put("last", m.last).put("tone", m.tone).toString();
            getSharedPreferences("people", MODE_PRIVATE).edit().putString("warm", o).apply();
        } catch (Exception ignored) {
        }
    }

    private void stopWarm() {
        handler.removeCallbacks(warmNext);
        warm = null;
    }

    private void choose(People.Person p) {
        People.Person now = People.current(this);
        Runnable go = () -> {
            People.use(this, p.id);
            // A kid's first time: make it yours. Otherwise, have the pets been fed?
            if (!MyWorldActivity.offer(this, p)) PetsActivity.offer(this, p);
            finish();
        };
        // A grown-up with their own PIN (ADR 0066): theirs, typed on the remote or allowed from their phone.
        if (!p.together() && !p.kid && !p.id.equals(now.id) && People.hasOwnPin(this, p)) askOwnPin(p, go);
        // A kid moving to Family or a grown-up needs the PIN; anyone moving to a kid's profile doesn't.
        else if (now.kid && !p.kid && People.hasPin(this)) askPin(Ui.tr("PIN de adulto", "Grown-up PIN"), go);
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
        List<People.Person> list = People.list(this);
        int n = list.size() + 1;
        float big = fit(n, 1f);
        LinearLayout[] rows = faceRows(c, n, big);
        Face first = null;
        for (int i = 0; i < list.size(); i++) {
            People.Person p = list.get(i);
            Face f = face(rows[i / perRow(n)], p, Ui.tr("Editar", "Edit"), v -> edit(p), big);
            if (first == null) first = f;
        }
        People.Person plus = new People.Person();
        plus.id = "+";
        plus.name = "+";
        plus.colour = 0x33FFFFFF;
        face(rows[(n - 1) / perRow(n)], plus, Ui.tr("Adicionar", "Add someone"), v -> edit(null), big);
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
            p.teen = person.teen;
            p.emoji = person.emoji;
            p.visitor = person.visitor;
            p.stage = person.stage;
            p.parent = person.parent;
            p.stageHere = person.stageHere;
        }
        // Screen time a day (ADR 0060): kept on this TV by ScreenTimeService, saved with the rest.
        final int[] limit = {isNew ? 0 : ScreenTimeService.limit(this, p.id)};
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
                + (!p.kid ? Ui.tr("não", "off") : p.teen ? Ui.tr("adolescente, com YouTube", "teen, with YouTube") : Ui.tr("sim", "on")));
        kidLabel.run();
        final Button time = add(kidRow, "", false, null);
        Runnable timeLabel = () -> {
            time.setText(Ui.tr("Tempo de tela por dia: ", "Screen time a day: ", "Pantalla al día: ") + ScreenTimeService.label(limit[0]));
            time.setVisibility(p.kid ? View.VISIBLE : View.GONE);
        };
        timeLabel.run();
        time.setOnClickListener(v -> {
            int at = 0;
            for (int i = 0; i < ScreenTime.CHOICES.length; i++) if (ScreenTime.CHOICES[i] == limit[0]) at = i;
            limit[0] = ScreenTime.CHOICES[(at + 1) % ScreenTime.CHOICES.length];
            timeLabel.run();
        });
        // Who they are and their own PIN for a grown-up; kindy, school or college for a kid (ADR 0066).
        LinearLayout moreRow = row(c, 16);
        final Button parent = add(moreRow, "", false, null);
        final Button ownPin = add(moreRow, "", false, null);
        final Button stage = add(moreRow, "", false, null);
        Runnable moreLabels = () -> {
            parent.setText(Ui.tr("Quem é: ", "Who they are: ", "Quién es: ") + ("mum".equals(p.parent) ? Ui.tr("Mãe", "Mum", "Mamá")
                    : "dad".equals(p.parent) ? Ui.tr("Pai", "Dad", "Papá") : Ui.tr("Adulto", "Grown-up", "Adulto")));
            ownPin.setText(Ui.tr("PIN próprio: ", "Their own PIN: ", "PIN propio: ") + (People.hasOwnPin(this, p) ? Ui.tr("sim", "on") : Ui.tr("não", "off")));
            String at = p.school();
            stage.setText(Ui.tr("Estuda: ", "At: ", "Estudia: ") + (WarmNotes.KINDY.equals(at) ? Ui.tr("escolinha", "kindy", "kínder")
                    : WarmNotes.SCHOOL.equals(at) ? Ui.tr("escola", "school", "cole") : WarmNotes.COLLEGE.equals(at) ? Ui.tr("ensino médio", "college", "instituto")
                    : Ui.tr("não marcado", "not set", "sin marcar")));
            parent.setVisibility(p.kid ? View.GONE : View.VISIBLE);
            ownPin.setVisibility(p.kid || isNew ? View.GONE : View.VISIBLE);
            stage.setVisibility(p.kid ? View.VISIBLE : View.GONE);
        };
        moreLabels.run();
        parent.setOnClickListener(v -> {
            p.parent = "".equals(p.parent) || p.parent == null ? "mum" : "mum".equals(p.parent) ? "dad" : "";
            moreLabels.run();
        });
        stage.setOnClickListener(v -> {
            // Kindy, school, college, then not set, then back to whatever Beyond Family says.
            String at = p.school();
            p.stageHere = WarmNotes.KINDY.equals(at) ? WarmNotes.SCHOOL : WarmNotes.SCHOOL.equals(at) ? WarmNotes.COLLEGE
                    : WarmNotes.COLLEGE.equals(at) ? "none" : p.stage != null && !p.stage.isEmpty() && "none".equals(p.stageHere) ? "" : WarmNotes.KINDY;
            moreLabels.run();
        });
        ownPin.setOnClickListener(v -> ownPin(person, () -> edit(person)));
        kid.setOnClickListener(v -> {
            if (!p.kid && !isNew && !person.kid && grownUps(people) <= 1) {
                note(Ui.tr("Precisa de pelo menos um adulto.", "There needs to be at least one grown-up."));
                return;
            }
            // Off, then kids, then teen (YouTube and music on the shelf), then off again.
            if (!p.kid) p.kid = true;
            else if (!p.teen) p.teen = true;
            else p.kid = p.teen = false;
            kidLabel.run();
            timeLabel.run();
            moreLabels.run();
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
            People.setExtra(this, p.id, "parent", p.kid ? "" : p.parent);
            People.setExtra(this, p.id, "stage", p.kid ? p.stageHere : "");
            ScreenTimeService.setLimit(this, p.id, p.kid ? limit[0] : 0);
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

    // MARK: - PINs

    /** Four numbers on the remote. then runs when they match the PIN. */
    private void askPin(String heading, Runnable then) {
        pinPage(heading, Ui.tr("Digite os quatro números.", "Type the four numbers."), typed -> {
            if (typed.equals(People.pin(this))) {
                then.run();
                return true;
            }
            return false;
        }, null);
    }

    /**
     * A grown-up's own PIN (ADR 0066): typed with the remote's numbers or the pad on screen, or, when they're in
     * Beyond Family, allowed with one tap on their phone. Either way then runs.
     */
    private void askOwnPin(People.Person p, Runnable then) {
        boolean phone = p.member() != null && Family.listening(this);
        pinPage(p.name, phone ? Ui.tr("Digite seu PIN, ou permita pelo celular.", "Type your PIN, or allow it from your phone.", "Escribe tu PIN, o permítelo desde tu móvil.")
                : Ui.tr("Digite seu PIN.", "Type your PIN.", "Escribe tu PIN."), typed -> {
            if (People.ownPinIs(this, p, typed)) {
                then.run();
                return true;
            }
            return false;
        }, phone ? foot -> {
            Button ask = add(foot, Ui.tr("Permitir pelo meu celular", "Allow from my phone", "Permitir desde mi móvil"), false, null);
            ask.setOnClickListener(v -> {
                ask.setEnabled(false);
                ask.setText(Ui.tr("Perguntando ao seu celular…", "Asking your phone…", "Preguntando a tu móvil…"));
                stopAsking();
                asking = Family.unlock(this, p.member(), state -> {
                    if ("allowed".equals(state)) {
                        asking = null;
                        then.run();
                        return;
                    }
                    if ("asked".equals(state)) {
                        ask.setText(Ui.tr("Olhe o celular e toque em Permitir", "Look at your phone and tap Allow", "Mira el móvil y toca Permitir"));
                        return;
                    }
                    asking = null;
                    ask.setEnabled(true);
                    ask.setText(Ui.tr("Perguntar de novo", "Ask again", "Preguntar otra vez"));
                    note("no".equals(state) ? Ui.tr("Seu celular disse que não era você.", "Your phone said that wasn't you.", "Tu móvil dijo que no eras tú.")
                            : "late".equals(state) ? Ui.tr("O celular não respondeu. Digite seu PIN.", "No answer from your phone. Type your PIN instead.", "El móvil no respondió. Escribe tu PIN.")
                            : Ui.tr("Não deu para falar com o celular. Digite seu PIN.", "Couldn't reach your phone. Type your PIN instead.", "No se pudo llegar a tu móvil. Escribe tu PIN."));
                });
            });
        } : null);
    }

    private Runnable asking;

    private void stopAsking() {
        if (asking != null) asking.run();
        asking = null;
    }

    private void setPin() {
        Runnable choose = () -> pinPage(Ui.tr("Novo PIN de adulto", "New grown-up PIN"),
                Ui.tr("Quatro números que as crianças não sabem.", "Four numbers the kids don't know."), first -> {
                    handler.post(() -> pinPage(Ui.tr("Digite de novo", "Type it again"), null, again -> {
                        if (!again.equals(first)) return false;
                        People.setPin(this, first);
                        manage();
                        return true;
                    }, null));
                    return true;
                }, null);
        if (People.hasPin(this)) askPin(Ui.tr("PIN atual", "Current PIN"), () -> handler.post(choose));
        else choose.run();
    }

    /** A grown-up's own PIN: set it (twice), or with one already, type it first to change or remove it. */
    private void ownPin(People.Person p, Runnable back) {
        Runnable choose = () -> pinPage(p.name, Ui.tr("Quatro números só seus.", "Four numbers that are only yours.", "Cuatro números que son solo tuyos."), first -> {
            handler.post(() -> pinPage(Ui.tr("Digite de novo", "Type it again"), null, again -> {
                if (!again.equals(first)) return false;
                People.setOwnPin(this, p, first);
                handler.post(back);
                return true;
            }, null));
            return true;
        }, null);
        if (!People.hasOwnPin(this, p)) {
            choose.run();
            return;
        }
        pinPage(Ui.tr("PIN atual", "Current PIN"), p.name, typed -> {
            if (!People.ownPinIs(this, p, typed)) return false;
            handler.post(() -> {
                LinearLayout c = page(p.name, Ui.tr("O que fazer com o seu PIN?", "What would you like to do with your PIN?", "¿Qué quieres hacer con tu PIN?"));
                LinearLayout r = row(c, 50);
                Button change = add(r, Ui.tr("Mudar o PIN", "Change my PIN", "Cambiar el PIN"), true, v -> choose.run());
                add(r, Ui.tr("Tirar o PIN", "Take my PIN off", "Quitar el PIN"), false, v -> {
                    People.setOwnPin(this, p, "");
                    back.run();
                });
                add(r, Ui.tr("Voltar", "Back"), false, v -> back.run());
                change.requestFocus();
            });
            return true;
        }, null);
    }

    interface Check { boolean ok(String typed); }

    interface Extra { void add(LinearLayout foot); }

    /** What's been typed on the PIN page showing now, or null when it isn't. */
    private StringBuilder typing;
    private TextView dots;
    private Check checking;

    /**
     * Four dots and a number pad on screen, so the remote's arrows and OK are all it takes. A remote with numbers can
     * type them straight in. extra adds buttons under the pad (Allow from my phone).
     */
    private void pinPage(String heading, String sub, Check check, Extra extra) {
        LinearLayout c = page(heading, sub);
        typing = new StringBuilder();
        checking = check;
        dots = FeedbackActivity.text(this, "", Ui.displaySemibold, 64 * k, 0xFFFFFFFF);
        dots.setLetterSpacing(0.35f);
        LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(-2, -2);
        dp.topMargin = Math.round(34 * k);
        dp.gravity = Gravity.CENTER_HORIZONTAL;
        c.addView(dots, dp);
        paintDots();
        String[] keys = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "\u232B", "0", ""};
        Button five = null;
        for (int r = 0; r < 4; r++) {
            LinearLayout line = row(c, r == 0 ? 26 : 10);
            for (int i = 0; i < 3; i++) {
                String key = keys[r * 3 + i];
                Button b = FeedbackActivity.button(this, key, k, false);
                b.setPadding(0, 0, 0, 0);
                b.setTextSize(TypedValue.COMPLEX_UNIT_PX, 40 * k);
                LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(Math.round(150 * k), Math.round(84 * k));
                bp.leftMargin = bp.rightMargin = Math.round(10 * k);
                line.addView(b, bp);
                if (key.isEmpty()) {
                    b.setVisibility(View.INVISIBLE);
                    continue;
                }
                b.setContentDescription("\u232B".equals(key) ? Ui.tr("Apagar", "Delete") : key);
                b.setOnClickListener(v -> press(key));
                if ("5".equals(key)) five = b;
            }
        }
        if (extra != null) extra.add(row(c, 26));
        if (five != null) five.requestFocus();
    }

    private void paintDots() {
        if (dots == null || typing == null) return;
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 4; i++) b.append(i < typing.length() ? "\u25CF" : "\u25CB");
        dots.setText(b);
    }

    private void press(String key) {
        if (typing == null) return;
        if ("\u232B".equals(key)) {
            if (typing.length() > 0) typing.setLength(typing.length() - 1);
            paintDots();
            return;
        }
        if (typing.length() >= 4) return;
        typing.append(key);
        paintDots();
        if (typing.length() < 4) return;
        final StringBuilder mine = typing;
        final String typed = mine.toString();
        handler.postDelayed(() -> {
            if (typing != mine) return;   // already moved on
            if (!checking.ok(typed) && typing == mine) {
                mine.setLength(0);
                paintDots();
                note(Ui.tr("Não é esse. Tente de novo.", "That's not it. Try again."));
            }
        }, 160);
    }

    @Override public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        if (typing != null && keyCode >= android.view.KeyEvent.KEYCODE_0 && keyCode <= android.view.KeyEvent.KEYCODE_9) {
            press(String.valueOf(keyCode - android.view.KeyEvent.KEYCODE_0));
            return true;
        }
        if (typing != null && keyCode == android.view.KeyEvent.KEYCODE_DEL) {
            press("\u232B");
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onDestroy() {
        stopAsking();
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
                // Family's line in grey; a kid's award in ember, because it was earned.
                ink.setColor(p.together() ? 0x99FFFFFF : 0xFFE8A33D);
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
