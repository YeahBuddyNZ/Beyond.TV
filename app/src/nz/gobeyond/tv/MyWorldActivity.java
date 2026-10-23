package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * Make it yours: a kid sets up their own profile on the TV with the remote, no grown-up needed. A buddy (their face),
 * a colour, a world (what the home screen looks like behind the apps), the things they love, then a little party.
 * Back goes a step back; nothing is saved until the party. It only changes how the profile watching looks: never the
 * name, the shelf, the PIN or whether it's a kids' profile, so it needs no PIN. Same as web/myworld.js: change one,
 * change both.
 */
public class MyWorldActivity extends Activity {
    static final String[] BUDDIES = {"🦖", "🦕", "🦄", "🐉", "🦁", "🐯", "🐼", "🐨", "🦊", "🐶", "🐱", "🐰", "🐸", "🐵",
            "🦉", "🐧", "🐬", "🐙", "🦈", "🐢", "🦋", "🐝", "🚀", "🛸", "🤖", "👾", "🧚", "🧙", "🦸", "⚽", "🏉", "🎸",
            "🎨", "🛹", "🏎️", "🌈"};

    static final int[] COLOURS = {0xFF2F7D6D, 0xFF3FA796, 0xFF378ADD, 0xFF2457B8, 0xFF7A4FD0, 0xFFB04FD0, 0xFFD6589A,
            0xFFE8577A, 0xFFD85A30, 0xFFE8A33D, 0xFFE8C53D, 0xFF55534B};

    /** A world: its sky (top and bottom), the things that drift across it, and its name. */
    static final class World {
        final String id, pt, en, es;
        final int top, bottom;
        final String[] things;

        World(String id, int top, int bottom, String[] things, String pt, String en, String es) {
            this.id = id;
            this.top = top;
            this.bottom = bottom;
            this.things = things;
            this.pt = pt;
            this.en = en;
            this.es = es;
        }

        String name() { return Ui.tr(pt, en, es); }
    }

    static final World[] WORLDS = {
        new World("ocean", 0xFF0E5C8A, 0xFF0A2A4A, new String[] {"🐠", "🐙", "🐬", "🐳", "🐢", "🐡"}, "Fundo do mar", "Under the sea", "Bajo el mar"),
        new World("space", 0xFF1B1446, 0xFF05040F, new String[] {"🪐", "⭐", "🌙", "🚀", "☄️", "👽"}, "Espaço", "Outer space", "El espacio"),
        new World("forest", 0xFF2F7D6D, 0xFF123A2F, new String[] {"🌿", "🍄", "🦉", "🦔", "🌲", "🐞"}, "Floresta", "The bush", "El bosque"),
        new World("volcano", 0xFFB8452A, 0xFF2A0F0A, new String[] {"🌋", "🦖", "🔥", "🦕", "🪨", "🥚"}, "Vulcão", "Dino volcano", "Volcán"),
        new World("candy", 0xFFE77BB0, 0xFF7A4FD0, new String[] {"🍭", "🧁", "🍬", "🌈", "🍩", "🦄"}, "Doces", "Candy land", "Dulces"),
        new World("snow", 0xFF7FB2D9, 0xFF2C4B6E, new String[] {"❄️", "⛄", "🐧", "🏔️", "🧣", "🐻"}, "Neve", "Snow day", "Nieve"),
        new World("sport", 0xFF3E9A4A, 0xFF174A22, new String[] {"⚽", "🏉", "🏆", "🏀", "🥅", "🏏"}, "Esporte", "Game day", "Deportes"),
        new World("beach", 0xFFF2B45A, 0xFF2A8FB0, new String[] {"🏖️", "🐚", "🦀", "🌺", "🏄", "☀️"}, "Praia", "The beach", "La playa")
    };

    static World world(String id) {
        if (id == null) return null;
        for (World w : WORLDS) if (w.id.equals(id)) return w;
        return null;
    }

    // MARK: - A world behind the home screen

    /** Fixed spots on a 1920 x 1080 screen, so it looks the same every time: spread out, never under the clock. */
    private static final int[][] SPOTS = {{120, 240}, {1640, 180}, {980, 120}, {420, 620}, {1460, 560}, {760, 420},
            {1780, 760}, {260, 860}, {1180, 300}, {600, 180}, {1320, 860}, {80, 520}};

    /** The world's things with the loved things mixed in, so a dino kid's ocean still has a dinosaur in it. */
    static String[] things(World w, List<String> loves) {
        List<String> out = new ArrayList<>();
        if (w != null) java.util.Collections.addAll(out, w.things);
        if (loves != null) {
            for (String id : loves) {
                for (String[] l : KidPicks.LIKES) if (l[0].equals(id)) out.add(l[1]);
            }
        }
        return out.toArray(new String[0]);
    }

    /** One paint per spot, at that spot's size. Made once, so drawing a world allocates nothing. */
    static Paint[] paints(float k) {
        Paint[] out = new Paint[SPOTS.length];
        for (int i = 0; i < out.length; i++) {
            out[i] = Ui.text(Ui.regular, (64 + (i * 37) % 70) * k, 0xFFFFFFFF);
            out[i].setTextAlign(Paint.Align.CENTER);
        }
        return out;
    }

    /** The world's sky, top to bottom, for a screen this tall. */
    static Shader sky(World w, int height) {
        return new LinearGradient(0, 0, 0, height, w.top, w.bottom, Shader.TileMode.CLAMP);
    }

    /** Draws the sky (bg holds sky()) and its things, drifting slowly. alpha fades the things. */
    static void draw(Canvas c, int width, int height, Paint bg, String[] things, Paint[] paints, float k, float seconds, float alpha) {
        c.drawRect(0, 0, width, height, bg);
        if (things.length == 0) return;
        for (int i = 0; i < SPOTS.length; i++) {
            Paint p = paints[i];
            p.setAlpha(Math.round(255 * 0.85f * alpha));
            float t = seconds * (0.11f + 0.03f * (i % 4)) + i * 1.7f;
            float x = SPOTS[i][0] * k + (float) Math.sin(t) * 18 * k, y = SPOTS[i][1] * k + (float) Math.cos(t * 0.8f) * 14 * k;
            c.drawText(things[i % things.length], x, y, p);
        }
    }

    // MARK: - The steps

    private static final String OFFERED = "myworld.offered";

    /** Opens Make it yours for whoever is watching. */
    static void open(Context c) {
        c.startActivity(new Intent(c, MyWorldActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    /** A kid who hasn't made it theirs yet is asked once, the first time they pick their face. */
    static void offer(Context c, People.Person p) {
        if (p == null || !p.kid || p.together()) return;
        android.content.SharedPreferences sp = c.getSharedPreferences("people", Context.MODE_PRIVATE);
        java.util.Set<String> seen = new java.util.HashSet<>(sp.getStringSet(OFFERED, new java.util.HashSet<>()));
        if (!seen.add(p.id) || !p.world.isEmpty()) return;
        sp.edit().putStringSet(OFFERED, seen).apply();
        open(c);
    }

    private float k;
    private FrameLayout root;
    private Sky sky;
    private People.Person me;
    // What they're picking: saved only at the party.
    private String emoji, worldId;
    private int colour;
    private final List<String> loves = new ArrayList<>();
    private int step;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        me = People.current(this);
        if (me == null || me.together()) {
            finish();
            return;
        }
        emoji = me.emoji == null ? "" : me.emoji;
        colour = me.colour;
        worldId = me.world == null ? "" : me.world;
        loves.addAll(me.loves);
        root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        sky = new Sky(this);
        root.addView(sky, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        show(0);
    }

    @Override public void onBackPressed() {
        if (step == 4 || step == 0) finish();
        else show(step - 1);
    }

    private void show(int n) {
        step = n;
        sky.set(world(worldId), things(world(worldId), loves));
        while (root.getChildCount() > 2) root.removeViewAt(2);
        if (n == 4) {
            party();
            return;
        }
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(70 * k);
        root.addView(column, lp);

        LinearLayout head = new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        TextView face = faceView(160);
        head.addView(face, new LinearLayout.LayoutParams(Math.round(160 * k), Math.round(160 * k)));
        LinearLayout words = new LinearLayout(this);
        words.setOrientation(LinearLayout.VERTICAL);
        words.setPadding(Math.round(36 * k), 0, 0, 0);
        TextView stepWord = FeedbackActivity.text(this, Ui.tr("Passo ", "Step ", "Paso ") + (n + 1) + Ui.tr(" de 4", " of 4", " de 4"),
                Ui.semibold, 24 * k, 0xCCFFFFFF);
        stepWord.setGravity(Gravity.START);
        words.addView(stepWord);
        TextView title = FeedbackActivity.text(this, title(n), Ui.displaySemibold, 54 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.START);
        words.addView(title);
        TextView sub = FeedbackActivity.text(this, sub(n), Ui.regular, 28 * k, 0xDDFFFFFF);
        sub.setGravity(Gravity.START);
        words.addView(sub);
        head.addView(words);
        column.addView(head);

        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        grid.setGravity(Gravity.CENTER_HORIZONTAL);
        grid.setPadding(0, Math.round(40 * k), 0, Math.round(30 * k));
        column.addView(grid, new LinearLayout.LayoutParams(-2, -2));
        View first = fill(n, grid, face);

        LinearLayout foot = new LinearLayout(this);
        foot.setGravity(Gravity.CENTER);
        column.addView(foot, new LinearLayout.LayoutParams(-1, -2));
        if (n > 0) foot.addView(button(Ui.tr("Voltar", "Back", "Atrás"), false, v -> show(n - 1)), footParams());
        foot.addView(button(n == 3 ? Ui.tr("Pronto!", "I'm done!", "¡Listo!") : Ui.tr("Próximo", "Next", "Siguiente"), true,
                v -> show(n + 1)), footParams());
        if (first != null) first.requestFocus();
    }

    private String title(int n) {
        switch (n) {
            case 0: return Ui.tr("Oi, ", Prefs.kupu() ? "Kia ora, " : "Hello, ", "Hola, ") + me.name + "!";
            case 1: return Ui.tr("Qual é a sua cor?", "What's your colour?", "¿Cuál es tu color?");
            case 2: return Ui.tr("Escolha o seu mundo", "Choose your world", "Elige tu mundo");
            default: return Ui.tr("O que você ama?", "What do you love?", "¿Qué te encanta?");
        }
    }

    private String sub(int n) {
        switch (n) {
            case 0: return Ui.tr("Escolha seu parceiro. Ele é você na TV.", "Pick your buddy. They'll be you on the TV.",
                    "Elige a tu compañero. Serás tú en la TV.");
            case 1: return Ui.tr("Sua cor aparece em tudo que é seu.", "Your colour shows on everything that is yours.",
                    "Tu color sale en todo lo tuyo.");
            case 2: return Ui.tr("Ele fica atrás dos seus apps.", "It lives behind your apps on the home screen.",
                    "Vive detrás de tus apps.");
            default: return Ui.tr("Escolha quantos quiser.", "Pick as many as you like.", "Elige todos los que quieras.");
        }
    }

    /** The step's choices, in rows; returns the one to focus first. */
    private View fill(int n, LinearLayout grid, TextView face) {
        List<View> all = new ArrayList<>();
        View first = null;
        int cols, size, count;
        switch (n) {
            case 0: cols = 12; size = 104; count = BUDDIES.length; break;
            case 1: cols = 6; size = 140; count = COLOURS.length; break;
            case 2: cols = 4; size = 300; count = WORLDS.length; break;
            default: cols = 6; size = 180; count = KidPicks.LIKES.length; break;
        }
        LinearLayout row = null;
        for (int i = 0; i < count; i++) {
            if (i % cols == 0) {
                row = new LinearLayout(this);
                grid.addView(row);
            }
            final int at = i;
            TextView c;
            if (n == 0) {
                c = choice(BUDDIES[i], 54);
            } else if (n == 1) {
                c = choice(emoji, 48);
            } else if (n == 2) {
                World w = WORLDS[i];
                c = choice(w.things[0] + " " + w.things[1] + " " + w.things[2] + "\n" + w.name(), 34);
            } else {
                String[] l = KidPicks.LIKES[i];
                c = choice(l[1] + "\n" + Ui.tr(l[2], l[3], l[4]), 30);
            }
            c.setOnClickListener(v -> {
                pick(n, at);
                for (int j = 0; j < all.size(); j++) paint(all.get(j), n, j);
                face.setText(emoji.isEmpty() ? initial() : emoji);
                ((GradientDrawable) face.getBackground()).setColor(colour);
                sky.set(world(worldId), things(world(worldId), loves));
                v.animate().scaleX(1.12f).scaleY(1.12f).setDuration(110).withEndAction(
                        () -> v.animate().scaleX(1).scaleY(1).setDuration(160).start()).start();
                // One answer per step, so OK moves on; the loves take as many as they like.
                if (n < 3) v.postDelayed(() -> { if (step == n && !isFinishing()) show(n + 1); }, 320);
            });
            int h = n == 2 ? 190 : size;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Math.round(size * k), Math.round(h * k));
            int gap = Math.round(size * 0.14f * k);
            lp.setMargins(gap, gap, gap, gap);
            row.addView(c, lp);
            all.add(c);
            paint(c, n, i);
            if (first == null && on(n, i)) first = c;
        }
        return first != null ? first : all.isEmpty() ? null : all.get(0);
    }

    private void pick(int n, int i) {
        if (n == 0) emoji = BUDDIES[i];
        else if (n == 1) colour = COLOURS[i];
        else if (n == 2) worldId = WORLDS[i].id;
        else {
            String id = KidPicks.LIKES[i][0];
            if (!loves.remove(id)) loves.add(id);
        }
    }

    private boolean on(int n, int i) {
        if (n == 0) return BUDDIES[i].equals(emoji);
        if (n == 1) return COLOURS[i] == colour;
        if (n == 2) return WORLDS[i].id.equals(worldId);
        return loves.contains(KidPicks.LIKES[i][0]);
    }

    /** A choice's look: its own fill, a white ring when focused, an ember ring when it's the one picked. */
    private void paint(View v, int n, int i) {
        float r = n == 2 ? 28 * k : 999;
        int fill = n == 1 ? COLOURS[i] : n == 2 ? WORLDS[i].bottom : 0x33FFFFFF;
        boolean picked = on(n, i);
        StateListDrawable s = new StateListDrawable();
        s.addState(new int[] {android.R.attr.state_focused}, ring(fill, r, 0xFFFFFFFF, 7 * k));
        s.addState(new int[] {}, picked ? ring(fill, r, 0xFFE8A33D, 6 * k) : ring(fill, r, 0, 0));
        v.setBackground(s);
        if (n == 1) ((TextView) v).setText(emoji);
    }

    private static GradientDrawable ring(int fill, float radius, int stroke, float width) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(radius);
        if (width > 0) d.setStroke(Math.round(width), stroke);
        return d;
    }

    private TextView choice(String text, float px) {
        TextView t = FeedbackActivity.text(this, text, Ui.semibold, px * k, 0xFFFFFFFF);
        t.setFocusable(true);
        t.setClickable(true);
        t.setLineSpacing(0, 0.95f);
        return t;
    }

    private TextView faceView(int size) {
        TextView f = FeedbackActivity.text(this, emoji.isEmpty() ? initial() : emoji, Ui.displaySemibold, size * 0.5f * k, 0xFFFFFFFF);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(colour);
        f.setBackground(g);
        return f;
    }

    private String initial() {
        return me.name == null || me.name.isEmpty() ? "?" : me.name.substring(0, me.name.offsetByCodePoints(0, 1)).toUpperCase();
    }

    private Button button(String label, boolean primary, View.OnClickListener run) {
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setOnClickListener(run);
        return b;
    }

    private LinearLayout.LayoutParams footParams() {
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.leftMargin = bp.rightMargin = Math.round(12 * k);
        return bp;
    }

    /** Saves it, tells Beyond Family, and has a little party. */
    private void party() {
        List<People.Person> people = People.list(this);
        People.Person saved = People.find(people, me.id);
        if (saved != null) {
            saved.emoji = emoji;
            saved.colour = colour;
            saved.world = worldId;
            saved.loves.clear();
            saved.loves.addAll(loves);
            People.save(this, people);
            if (Family.linked(this)) Family.pushLook(this, saved);
        }
        FrameLayout layer = new FrameLayout(this);
        root.addView(layer, new FrameLayout.LayoutParams(-1, -1));
        String[] bits = things(world(worldId), loves);
        List<String> all = new ArrayList<>();
        all.add(emoji.isEmpty() ? "⭐" : emoji);
        java.util.Collections.addAll(all, bits);
        all.add("✨");
        all.add("🎉");
        all.add("⭐");
        float cx = getResources().getDisplayMetrics().widthPixels / 2f, cy = 420 * k;
        for (int i = 0; i < 28; i++) {
            TextView b = FeedbackActivity.text(this, all.get(i % all.size()), Ui.regular, 70 * k, 0xFFFFFFFF);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(120 * k), Math.round(120 * k));
            lp.leftMargin = Math.round(cx - 60 * k);
            lp.topMargin = Math.round(cy - 60 * k);
            layer.addView(b, lp);
            double a = i / 28.0 * Math.PI * 2;
            float r = (380 + (i % 4) * 90) * k;
            float dy = (float) Math.sin(a) * r * 0.62f;
            if (dy > 150 * k) dy = -dy * 0.8f;   // the words and the button sit below the face: keep the bits off them
            b.setScaleX(0.2f);
            b.setScaleY(0.2f);
            b.animate().translationX((float) Math.cos(a) * r).translationY(dy).scaleX(1).scaleY(1)
                    .setStartDelay(60 + (i % 7) * 40).setDuration(900).start();
        }
        TextView face = faceView(260);
        FrameLayout.LayoutParams fp = new FrameLayout.LayoutParams(Math.round(260 * k), Math.round(260 * k), Gravity.CENTER_HORIZONTAL);
        fp.topMargin = Math.round(cy - 130 * k);
        layer.addView(face, fp);
        face.setScaleX(0.6f);
        face.setScaleY(0.6f);
        face.animate().scaleX(1).scaleY(1).setDuration(500).start();
        TextView title = FeedbackActivity.text(this, Ui.tr("Esta TV agora é sua, ", "This TV is yours now, ", "Esta tele ya es tuya, ")
                + me.name + "!", Ui.displaySemibold, 60 * k, 0xFFFFFFFF);
        FrameLayout.LayoutParams tp = new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER_HORIZONTAL);
        tp.topMargin = Math.round(cy + 180 * k);
        layer.addView(title, tp);
        Button go = button(Ui.tr("Vamos!", "Let's go!", "¡Vamos!"), true, v -> finish());
        FrameLayout.LayoutParams gp = new FrameLayout.LayoutParams(-2, Math.round(84 * k), Gravity.CENTER_HORIZONTAL);
        gp.topMargin = Math.round(cy + 300 * k);
        layer.addView(go, gp);
        go.requestFocus();
    }

    /** The chosen world behind the steps, so they see it as they pick. */
    private final class Sky extends View {
        private final Paint bg = new Paint();
        private final Paint[] paints;
        private final long born = SystemClock.uptimeMillis();
        private World world;
        private String[] things = new String[0];

        Sky(Context c) {
            super(c);
            paints = paints(k);
        }

        void set(World w, String[] t) {
            world = w;
            things = t;
            if (w != null && getHeight() > 0) bg.setShader(sky(w, getHeight()));
            setVisibility(w == null ? GONE : VISIBLE);
            invalidate();
        }

        @Override protected void onSizeChanged(int w, int h, int ow, int oh) {
            if (world != null) bg.setShader(sky(world, h));
        }

        @Override protected void onDraw(Canvas c) {
            if (world == null) return;
            MyWorldActivity.draw(c, getWidth(), getHeight(), bg, things, paints, k, (SystemClock.uptimeMillis() - born) / 1000f, 1);
            postInvalidateDelayed(66);
        }
    }
}
