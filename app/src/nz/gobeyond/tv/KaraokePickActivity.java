package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Karaoke night from the remote (ADR 0021): who's singing, then which song, then KaraokeActivity counts down and plays
 * the karaoke version on YouTube. The songs are the family's own from Beyond Family, then a few everybody knows, and
 * "Find another song" for anything else (it goes on the family's list too). Only titles and artists: the words come
 * from the video, Beyond never keeps lyrics. Same as Karaoke.choose in web/karaoke.js.
 */
public class KaraokePickActivity extends Activity {
    /** Songs most families can sing, for a TV with no list of its own yet. Titles and artists only. */
    static final String[][] STARTERS = {
            {"Bohemian Rhapsody", "Queen"},
            {"Don't Stop Believin'", "Journey"},
            {"Shake It Off", "Taylor Swift"},
            {"Let It Go", "Idina Menzel"},
            {"How Far I'll Go", "Auli'i Cravalho"},
            {"We Don't Talk About Bruno", "Encanto"},
            {"Dancing Queen", "ABBA"},
            {"I Want It That Way", "Backstreet Boys"},
            {"Sweet Caroline", "Neil Diamond"},
            {"Happy", "Pharrell Williams"},
            {"Can't Stop the Feeling!", "Justin Timberlake"},
            {"Royals", "Lorde"},
            {"Poi E", "Pātea Māori Club"},
            {"Slice of Heaven", "Dave Dobbyn"},
            {"Livin' on a Prayer", "Bon Jovi"},
    };

    static void open(Context c) {
        c.startActivity(new Intent(c, KaraokePickActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private float k;
    private LinearLayout column;
    private TextView title, sub;
    private LinearLayout list;
    private ScrollView scroll;
    /** Who's singing: null while choosing, "" for everyone together. */
    private String singer;
    private int colour = Glow.VIOLET;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1300 * k), -1, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(90 * k);
        lp.bottomMargin = Math.round(60 * k);
        root.addView(column, lp);

        title = FeedbackActivity.text(this, "🎤 " + Ui.tr("Noite de karaokê", "Karaoke night", "Noche de karaoke"), Ui.displaySemibold, 64 * k, 0xFFFFFFFF);
        column.addView(title);
        sub = FeedbackActivity.text(this, "", Ui.regular, 32 * k, 0xCCFFFFFF);
        sub.setPadding(0, Math.round(14 * k), 0, Math.round(36 * k));
        column.addView(sub);
        scroll = new ScrollView(this);
        scroll.setClipToPadding(false);
        scroll.setPadding(0, Math.round(12 * k), 0, Math.round(12 * k));
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setGravity(Gravity.CENTER_HORIZONTAL);
        scroll.addView(list, new FrameLayout.LayoutParams(-1, -2));
        column.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(root);
        whoSings();
    }

    /** Step one: whose turn. Everyone on this TV, and everybody together for a sing-along. */
    private void whoSings() {
        singer = null;
        sub.setText(Ui.tr("Quem vai cantar?", "Who's singing?", "¿Quién canta?"));
        list.removeAllViews();
        LinearLayout row = null;
        int inRow = 0;
        Button first = null;
        List<Object[]> choices = new ArrayList<>();
        for (People.Person p : People.list(this)) {
            if (p.together() || p.name == null || p.name.trim().isEmpty()) continue;
            choices.add(new Object[] {p.initial().length() > 1 ? p.initial() + "  " + p.name.trim() : p.name.trim(), p.name.trim(), p.colour});
        }
        choices.add(new Object[] {"🎶  " + Ui.tr("Todo mundo junto", "Everyone together", "Todos juntos"), "", Glow.VIOLET});
        for (Object[] c : choices) {
            if (row == null || inRow == 3) {
                row = new LinearLayout(this);
                row.setGravity(Gravity.CENTER_HORIZONTAL);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
                rp.bottomMargin = Math.round(20 * k);
                list.addView(row, rp);
                inRow = 0;
            }
            final String name = (String) c[1];
            final int col = (Integer) c[2];
            Button b = FeedbackActivity.button(this, (String) c[0], k, first == null);
            b.setOnClickListener(v -> {
                singer = name;
                colour = col;
                songs();
            });
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
            bp.leftMargin = bp.rightMargin = Math.round(10 * k);
            row.addView(b, bp);
            if (first == null) first = b;
            inRow++;
        }
        scroll.scrollTo(0, 0);
        first.requestFocus();
    }

    /** Step two: the song. The family's own first, then the ones everybody knows, then any song at all. */
    private void songs() {
        sub.setText(singer.isEmpty() ? Ui.tr("O que vamos cantar?", "What are we singing?", "¿Qué cantamos?")
                : Ui.tr("O que " + singer + " vai cantar?", "What's " + singer + " singing?", "¿Qué canta " + singer + "?"));
        list.removeAllViews();
        Button find = FeedbackActivity.button(this, "🔎  " + Ui.tr("Achar outra música", "Find another song", "Buscar otra canción"), k, true);
        find.setOnClickListener(v -> findSong());
        list.addView(find, new LinearLayout.LayoutParams(-2, Math.round(84 * k)));

        JSONArray ours = Family.songs();
        List<String> seen = new ArrayList<>();
        if (ours != null && ours.length() > 0) {
            heading(Ui.tr("As músicas da família", "The family's songs", "Las canciones de la familia"));
            for (int i = 0; i < ours.length(); i++) {
                JSONObject s = ours.optJSONObject(i);
                if (s == null || s.optString("title").isEmpty()) continue;
                String artist = s.isNull("artist") ? "" : s.optString("artist");
                String video = s.isNull("videoId") ? null : s.optString("videoId", null);
                song(s.optString("title"), artist, video);
                seen.add(s.optString("title").toLowerCase(java.util.Locale.ROOT));
            }
        }
        heading(Ui.tr("Todo mundo sabe", "Everybody knows these", "Todos se las saben"));
        for (String[] s : STARTERS) {
            if (!seen.contains(s[0].toLowerCase(java.util.Locale.ROOT))) song(s[0], s[1], null);
        }
        scroll.scrollTo(0, 0);
        find.requestFocus();
    }

    private void heading(String text) {
        TextView h = FeedbackActivity.text(this, text, Ui.semibold, 28 * k, 0xA6FFFFFF);
        h.setPadding(0, Math.round(36 * k), 0, Math.round(14 * k));
        list.addView(h, new LinearLayout.LayoutParams(-1, -2));
    }

    private void song(String name, String artist, String video) {
        Button b = FeedbackActivity.button(this, name + (artist.isEmpty() ? "" : "  ·  " + artist), k, false);
        b.setOnClickListener(v -> sing(name, artist, video));
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(80 * k));
        bp.bottomMargin = Math.round(14 * k);
        list.addView(b, bp);
    }

    /** Any song at all: typed or said into the TV's own keyboard, then YouTube's search finds the karaoke version. */
    private void findSong() {
        sub.setText(Ui.tr("Diga ou digite a música e quem canta", "Say or type the song and who sings it", "Di o escribe la canción y quién la canta"));
        list.removeAllViews();
        EditText field = new EditText(this);
        field.setSingleLine(true);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        field.setImeOptions(EditorInfo.IME_ACTION_GO);
        field.setTextSize(TypedValue.COMPLEX_UNIT_PX, 40 * k);
        field.setTextColor(0xFFFFFFFF);
        field.setHintTextColor(0x80FFFFFF);
        field.setHint(Ui.tr("ex. Royals Lorde", "e.g. Royals Lorde", "p. ej. Royals Lorde"));
        field.setGravity(Gravity.CENTER);
        list.addView(field, new LinearLayout.LayoutParams(Math.round(1000 * k), -2));
        Button go = FeedbackActivity.button(this, "🎤  " + Ui.tr("Cantar", "Sing it", "Cantar"), k, true);
        Runnable send = () -> {
            String words = field.getText().toString().trim();
            if (words.isEmpty()) return;
            Family.addSong(this, words, null);
            sing(words, "", null);
        };
        go.setOnClickListener(v -> send.run());
        field.setOnEditorActionListener((v, action, e) -> {
            send.run();
            return true;
        });
        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        gp.topMargin = Math.round(30 * k);
        list.addView(go, gp);
        field.requestFocus();
    }

    private void sing(String name, String artist, String video) {
        String query = name + (artist.isEmpty() ? "" : " " + artist) + " karaoke";
        startActivity(KaraokeActivity.intent(this, singer, colour, name, artist, video, query, null));
        finish();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if ((code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) && e.getAction() == KeyEvent.ACTION_UP && singer != null) {
            View f = getCurrentFocus();
            if (f instanceof EditText) {
                songs();
                return true;
            }
            whoSings();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
