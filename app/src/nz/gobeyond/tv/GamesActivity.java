package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;

/**
 * Games, from the remote (ADR 0021): every game and family activity starts here on the TV, no phone needed. Karaoke,
 * board and card games against the robots, silly party games, Milo's Remote Control Land, London's Candy Land, Build it and the light show (all TableActivity), a party, quiz night, the dinner
 * question, the tidy-up race, bedtime breathing and How to play. Quiz night and the dinner question need Beyond Family, because everyone answers on their
 * phones. Same as Games.open in web/games.js: a picture for each, in groups (ADR 0047; four since Build it, ADR 0052, so they scroll). A game opens on top of
 * this screen and it stays open, so Back from a game comes back here, one step, not out to the home screen.
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
        // The four dots beside the heading, as on LG and Samsung, so the pictures have the whole screen below.
        root.addView(new FeedbackActivity.Backdrop(this, 160, 92, 50), new FrameLayout.LayoutParams(-1, -1));
        TextView title = FeedbackActivity.text(this, Ui.tr("Jogos", "Games", "Juegos"), Ui.displaySemibold, 60 * k, 0xFFFFFFFF);
        FrameLayout.LayoutParams tp = new FrameLayout.LayoutParams(-2, -2);
        tp.leftMargin = Math.round(206 * k);
        tp.topMargin = Math.round(52 * k);
        root.addView(title, tp);

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setClipChildren(false);
        column.setClipToPadding(false);
        column.setPadding(Math.round(126 * k), Math.round(44 * k), 0, Math.round(40 * k));
        // Four groups since Build it (ADR 0052), more than a screen: the list scrolls to the focused row by itself.
        ScrollView scroll = new ScrollView(this);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.setFillViewport(true);
        scroll.addView(column, new FrameLayout.LayoutParams(-1, -2));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-1, -1);
        lp.topMargin = Math.round(124 * k);
        root.addView(scroll, lp);
        root.setClipChildren(false);

        boolean linked = Family.linked(this);
        // The groups, in the same order as Games.open in web/games.js (ADR 0047). Each: picture (web/games/<id>.jpg), name, what it opens.
        Object[][][] groups = {
                {{Ui.tr("Vamos jogar", "Let's play", "¡A jugar!")},
                        // Milo's Remote Control Land (web/rcland.js, ADR 0046), in TableActivity's WebView like the arcade.
                        {"rcland", Ui.tr("Terra do Controle Remoto do Milo", "Milo's Remote Control Land", "La Tierra Teledirigida de Milo"), (Runnable) () -> TableActivity.open(this, "rcland")},
                        // London's Candy Land (web/candy.js, ADR 0053), in the same WebView.
                        {"candy", Ui.tr("A Terra dos Doces da London", "London's Candy Land", "La Tierra de los Dulces de London"), (Runnable) () -> TableActivity.open(this, "candy")},
                        {"arcade", Ui.tr("Fliperama", "Arcade", "Arcade"), (Runnable) () -> TableActivity.open(this, "arcade")},
                        {"table", Ui.tr("Jogos de tabuleiro e cartas", "Board and card games", "Juegos de mesa y cartas"), (Runnable) () -> TableActivity.open(this)},
                        {"silly", Ui.tr("Jogos bobos", "Silly games", "Juegos locos"), (Runnable) () -> TableActivity.open(this, "silly")},
                        // A guide to every game (web/guides.js, ADR 0043), read in TableActivity's WebView like the board games.
                        {"guides", Ui.tr("Como jogar", "How to play", "Cómo jugar"), (Runnable) () -> TableActivity.open(this, "guides")}},
                // Build it (web/builder.js, ADR 0052): real building jobs with the machines, in TableActivity's WebView.
                {{Ui.tr("Construir", "Build it", "A construir")},
                        {"road", Ui.tr("Construir uma estrada", "Build a road", "Construir una carretera"), (Runnable) () -> TableActivity.open(this, "road")},
                        {"bridge", Ui.tr("Construir uma ponte", "Build a bridge", "Construir un puente"), (Runnable) () -> TableActivity.open(this, "bridge")}},
                {{Ui.tr("Hora da festa", "Party time", "Hora de fiesta")},
                        {"karaoke", Ui.tr("Karaokê", "Karaoke", "Karaoke"), (Runnable) () -> KaraokePickActivity.open(this)},
                        {"party", Ui.tr("Festa", "Party", "Fiesta"), (Runnable) () -> PartyPickActivity.open(this)},
                        {"lights", Ui.tr("Show de luzes", "Light show", "Show de luces"), (Runnable) () -> TableActivity.open(this, "lights")},
                        {"quiz", Ui.tr("Quiz da noite", "Quiz night", "Noche de quiz"), (Runnable) () -> family("quiz")},
                        {"dinner", Ui.tr("Pergunta do jantar", "Dinner question", "Pregunta de la cena"), (Runnable) () -> family("question")}},
                {{Ui.tr("Em casa", "Round the house", "En casa")},
                        {"lunch", Ui.tr("Lanches da escola", "School lunches", "Almuerzos del cole"), (Runnable) () -> TableActivity.open(this, "lunch")},
                        {"tidy", Ui.tr("Corrida da arrumação", "Tidy-up race", "Carrera de ordenar"), (Runnable) () -> TidyActivity.open(this, 10)},
                        {"bedtime", Ui.tr("Respirar para dormir", "Bedtime breathing", "Respirar para dormir"), (Runnable) () -> BedtimeActivity.open(this, 15)}},
        };
        View first = null;
        int tw = Math.round(316 * k), th = Math.round(178 * k);
        for (Object[][] group : groups) {
            TextView name = FeedbackActivity.text(this, (String) group[0][0], Ui.displaySemibold, 30 * k, 0xBFFFFFFF);
            name.setGravity(Gravity.START);
            name.setPadding(Math.round(6 * k), 0, 0, Math.round(14 * k));
            column.addView(name, new LinearLayout.LayoutParams(-2, -2));
            LinearLayout row = new LinearLayout(this);
            row.setClipChildren(false);
            row.setClipToPadding(false);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, th);
            rp.bottomMargin = Math.round(40 * k);
            column.addView(row, rp);
            for (int i = 1; i < group.length; i++) {
                View tile = tile((String) group[i][0], (String) group[i][1], k);
                final Runnable run = (Runnable) group[i][2];
                tile.setOnClickListener(v -> run.run());
                LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(tw, th);
                bp.rightMargin = Math.round(22 * k);
                row.addView(tile, bp);
                if (first == null) first = tile;
            }
        }
        if (!linked) {
            // In the list after the last group, so it scrolls with them and never covers a row.
            TextView hint = FeedbackActivity.text(this, Ui.tr(
                    "Quiz da noite e a pergunta do jantar precisam do Beyond Family: todos respondem no celular. Conecte em Configurações.",
                    "Quiz night and the dinner question need Beyond Family, because everyone answers on their phone. Link it in Settings.",
                    "La noche de quiz y la pregunta de la cena necesitan Beyond Family: todos responden en el teléfono. Conéctalo en Ajustes."),
                    Ui.regular, 24 * k, 0x99FFFFFF);
            hint.setGravity(Gravity.START);
            hint.setPadding(Math.round(6 * k), 0, Math.round(132 * k), 0);
            column.addView(hint, new LinearLayout.LayoutParams(-1, -2));
        }

        setContentView(root);
        first.requestFocus();
    }

    /** One game: its picture, its name over the bottom, a little bigger with a lilac ring when it has the focus. */
    private View tile(String id, String label, float k) {
        FrameLayout tile = new FrameLayout(this);
        float radius = 22 * k;
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(0xFF2C2458);
        shape.setCornerRadius(radius);
        tile.setBackground(shape);
        tile.setClipToOutline(true);
        tile.setFocusable(true);
        tile.setClickable(true);
        ImageView pic = new ImageView(this);
        pic.setScaleType(ImageView.ScaleType.CENTER_CROP);
        try (InputStream in = getAssets().open("games/" + id + ".jpg")) {
            pic.setImageBitmap(BitmapFactory.decodeStream(in));
        } catch (IOException ignored) { /* the name still shows */ }
        tile.addView(pic, new FrameLayout.LayoutParams(-1, -1));
        TextView name = FeedbackActivity.text(this, label, Ui.semibold, 24 * k, 0xFFFFFFFF);
        name.setGravity(Gravity.START | Gravity.BOTTOM);
        name.setMaxLines(2);
        name.setLineSpacing(0, 0.95f);
        name.setPadding(Math.round(16 * k), Math.round(34 * k), Math.round(16 * k), Math.round(12 * k));
        name.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] {0x000D0C18, 0xD90D0C18}));
        tile.addView(name, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));
        // The ring sits on top of the picture, inside the rounded corners.
        GradientDrawable ring = new GradientDrawable();
        ring.setColor(0);
        ring.setCornerRadius(radius);
        ring.setStroke(Math.round(5 * k), Glow.LILAC);
        View over = new View(this);
        over.setBackground(ring);
        over.setVisibility(View.INVISIBLE);
        tile.addView(over, new FrameLayout.LayoutParams(-1, -1));
        tile.setOnFocusChangeListener((v, focused) -> {
            over.setVisibility(focused ? View.VISIBLE : View.INVISIBLE);
            v.animate().scaleX(focused ? 1.1f : 1).scaleY(focused ? 1.1f : 1).setDuration(160).start();
            v.setElevation(focused ? 12 * k : 0);
        });
        return tile;
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
