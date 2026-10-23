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
 * Karaoke night from the remote (ADR 0021, 0022). Linked to Beyond Family it opens on the family's playlists: play
 * one, change one (add songs, move them, take them out) or make a new one; or sing one song now. Then who's singing,
 * then which song, and KaraokeActivity counts down and plays it. The songs are the family's own from Beyond Family,
 * then a few everybody knows, and "Find another song" for anything else (it goes on the family's list too). Only
 * titles and artists: the words come from the video, Beyond never keeps lyrics. Same as Karaoke.choose in
 * web/karaoke.js.
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
    /** Their Beyond Family member id, or null (everyone, or somebody only on this TV). */
    private String member;
    /** The playlist being looked at or built: {id, name, items: [{songId, memberId}]}, or null. */
    private JSONObject playlist;
    /** True while who and song add to the playlist instead of singing. */
    private boolean building;
    private boolean deleting;
    /** Where Back goes from the screen showing now; null closes. */
    private Runnable back;
    private static final int PLAYLIST_MOST = 40;

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
        if (Family.linked(this)) start();
        else whoSings();
    }

    private LinearLayout row;
    private int inRow;

    private void clear(String subtitle) {
        sub.setText(subtitle);
        list.removeAllViews();
        row = null;
        inRow = 0;
        scroll.scrollTo(0, 0);
    }

    /** A button in rows of three. */
    private Button add(String label, boolean primary, View.OnClickListener click) {
        if (row == null || inRow == 3) {
            row = new LinearLayout(this);
            row.setGravity(Gravity.CENTER_HORIZONTAL);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
            rp.bottomMargin = Math.round(20 * k);
            list.addView(row, rp);
            inRow = 0;
        }
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setOnClickListener(click);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.leftMargin = bp.rightMargin = Math.round(10 * k);
        row.addView(b, bp);
        inRow++;
        return b;
    }

    /** A button on its own line, for lists. */
    private Button line(String label, boolean primary, View.OnClickListener click) {
        row = null;
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setOnClickListener(click);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(80 * k));
        bp.bottomMargin = Math.round(14 * k);
        list.addView(b, bp);
        return b;
    }

    /** First, linked to Beyond Family: one song now, or a playlist. */
    private void start() {
        title.setText("🎤 " + Ui.tr("Noite de karaokê", "Karaoke night", "Noche de karaoke"));
        playlist = null;
        building = false;
        deleting = false;
        back = null;
        clear(Ui.tr("Uma música agora, ou uma playlist?", "One song now, or a playlist?", "¿Una canción ahora, o una lista?"));
        Button first = add("🎤  " + Ui.tr("Cantar uma música", "Sing a song", "Cantar una canción"), true, v -> whoSings());
        JSONArray lists = Family.playlists();
        for (int i = 0; lists != null && i < lists.length(); i++) {
            final JSONObject p = lists.optJSONObject(i);
            if (p == null) continue;
            JSONArray items = p.optJSONArray("items");
            add("🎶  " + p.optString("name") + "  ·  " + (items == null ? 0 : items.length()), false, v -> {
                try {
                    playlist = new JSONObject(p.toString());
                } catch (Exception e) {
                    return;
                }
                showList();
            });
        }
        add("＋  " + Ui.tr("Nova playlist", "New playlist", "Nueva lista"), false, v -> nameList());
        first.requestFocus();
    }

    /** A new playlist's name, typed or said. */
    private void nameList() {
        back = this::start;
        clear(Ui.tr("Como se chama a playlist?", "What's the playlist called?", "¿Cómo se llama la lista?"));
        EditText field = field(Ui.tr("ex. Sexta à noite", "e.g. Friday night", "p. ej. Viernes"));
        Runnable make = () -> {
            String words = field.getText().toString().trim();
            if (words.isEmpty()) return;
            try {
                playlist = new JSONObject().put("name", words.length() > 40 ? words.substring(0, 40) : words).put("items", new JSONArray());
            } catch (Exception e) {
                return;
            }
            save(this::showList);
        };
        Button go = FeedbackActivity.button(this, Ui.tr("Criar", "Make it", "Crear"), k, true);
        go.setOnClickListener(v -> make.run());
        field.setOnEditorActionListener((v, action, e) -> {
            make.run();
            return true;
        });
        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        gp.topMargin = Math.round(30 * k);
        list.addView(go, gp);
        field.requestFocus();
    }

    private void save(Runnable then) {
        Family.savePlaylist(this, playlist, saved -> {
            if (isFinishing()) return;
            if (saved == null) {
                android.widget.Toast.makeText(this, Ui.tr("Não deu certo. Tente de novo.", "That didn't work. Try again.",
                        "No funcionó. Inténtalo de nuevo."), android.widget.Toast.LENGTH_LONG).show();
            } else {
                playlist = saved;
            }
            then.run();
        });
    }

    private JSONArray items() {
        JSONArray a = playlist.optJSONArray("items");
        if (a == null) {
            a = new JSONArray();
            try {
                playlist.put("items", a);
            } catch (Exception ignored) {
            }
        }
        return a;
    }

    /** The family's song by id, or null. */
    private static JSONObject songById(String id) {
        JSONArray ours = Family.songs();
        for (int i = 0; ours != null && i < ours.length(); i++) {
            JSONObject s = ours.optJSONObject(i);
            if (s != null && s.optString("id").equals(id)) return s;
        }
        return null;
    }

    private People.Person personOf(String member) {
        if (member == null || member.isEmpty() || "null".equals(member)) return null;
        for (People.Person p : People.list(this)) if (member.equals(p.member())) return p;
        return null;
    }

    private String itemLabel(int n) {
        JSONObject it = items().optJSONObject(n);
        if (it == null) return "";
        JSONObject s = songById(it.optString("songId"));
        People.Person p = personOf(it.isNull("memberId") ? null : it.optString("memberId"));
        return (n + 1) + ".  " + (p == null ? Ui.tr("Todos", "Everyone", "Todos") : p.name.trim()) + "  ·  " + (s == null ? "?" : s.optString("title"));
    }

    /** A playlist: play it, add songs, delete it, or pick a song to move or take out. */
    private void showList() {
        back = this::start;
        building = false;
        JSONArray its = items();
        title.setText("🎶 " + playlist.optString("name"));
        clear(its.length() > 0 ? Ui.tr("Toque numa música para mudar ou tirar", "Pick a song to move it or take it out", "Elige una canción para moverla o quitarla")
                : Ui.tr("Ainda vazia. Adicione músicas.", "Empty so far. Add some songs.", "Vacía. Añade canciones."));
        Button first = null;
        if (its.length() > 0) first = add("▶  " + Ui.tr("Tocar", "Play it", "Reproducir"), true, v -> playList());
        Button more = add("＋  " + Ui.tr("Adicionar música", "Add a song", "Añadir canción"), first == null, v -> {
            if (items().length() >= PLAYLIST_MOST) return;
            building = true;
            whoSings();
        });
        if (first == null) first = more;
        add(deleting ? Ui.tr("Apertar de novo para apagar", "Press again to delete", "Pulsa otra vez para borrar")
                : Ui.tr("Apagar playlist", "Delete playlist", "Borrar lista"), false, v -> {
            if (!deleting) {
                deleting = true;
                showList();
                return;
            }
            deleting = false;
            Family.dropPlaylist(this, playlist.optString("id"), ok -> {
                if (!isFinishing()) start();
            });
        });
        for (int i = 0; i < its.length(); i++) {
            final int n = i;
            line(itemLabel(i), false, v -> showItem(n));
        }
        first.requestFocus();
    }

    /** One song in the playlist: move it up or down, or take it out. */
    private void showItem(int n) {
        back = this::showList;
        clear(itemLabel(n));
        Button first = null;
        if (n > 0) first = add("⬆  " + Ui.tr("Subir", "Move up", "Subir"), true, v -> move(n, -1));
        if (n < items().length() - 1) {
            Button down = add("⬇  " + Ui.tr("Descer", "Move down", "Bajar"), first == null, v -> move(n, 1));
            if (first == null) first = down;
        }
        Button out = add("✕  " + Ui.tr("Tirar", "Take it out", "Quitar"), first == null, v -> {
            items().remove(n);
            save(this::showList);
        });
        if (first == null) first = out;
        add(Ui.tr("Pronto", "Done", "Listo"), false, v -> showList());
        first.requestFocus();
    }

    private void move(int n, int by) {
        JSONArray its = items();
        int j = n + by;
        if (j < 0 || j >= its.length()) return;
        try {
            Object a = its.get(n), b = its.get(j);
            its.put(n, b);
            its.put(j, a);
        } catch (Exception ignored) {
        }
        save(() -> showItem(j));
    }

    /** The playlist as turns: first names and colours, songs no longer on the list left out. */
    private void playList() {
        JSONArray turns = new JSONArray(), its = items();
        for (int i = 0; i < its.length(); i++) {
            JSONObject it = its.optJSONObject(i);
            JSONObject s = it == null ? null : songById(it.optString("songId"));
            if (s == null) continue;
            People.Person p = personOf(it.isNull("memberId") ? null : it.optString("memberId"));
            String artist = s.isNull("artist") ? "" : s.optString("artist");
            try {
                JSONObject t = new JSONObject().put("name", p == null ? "" : p.name.trim())
                        .put("colour", KaraokeActivity.hex(p == null ? Glow.VIOLET : p.colour)).put("title", s.optString("title"))
                        .put("artist", artist).put("query", s.optString("title") + (artist.isEmpty() ? "" : " " + artist) + " karaoke");
                if (!s.isNull("videoId")) t.put("videoId", s.optString("videoId"));
                turns.put(t);
            } catch (Exception ignored) {
            }
        }
        if (turns.length() == 0) return;
        startActivity(KaraokeActivity.night(this, turns, playlist.optString("name"), false));
        finish();
    }

    /** Step one: whose turn. Everyone on this TV, and everybody together for a sing-along. In a playlist, only the
     *  household's own people (it keeps them by their Beyond Family id). */
    private void whoSings() {
        singer = null;
        back = building ? this::showList : Family.linked(this) ? this::start : null;
        clear(building ? Ui.tr("Quem canta essa?", "Who sings this one?", "¿Quién canta esta?") : Ui.tr("Quem vai cantar?", "Who's singing?", "¿Quién canta?"));
        Button first = null;
        for (People.Person p : People.list(this)) {
            if (p.together() || p.name == null || p.name.trim().isEmpty()) continue;
            if (building && p.member() == null) continue;
            final String name = p.name.trim(), id = p.member();
            final int col = p.colour;
            Button b = add(p.initial().length() > 1 ? p.initial() + "  " + name : name, first == null, v -> {
                singer = name;
                colour = col;
                member = id;
                songs();
            });
            if (first == null) first = b;
        }
        Button all = add("🎶  " + Ui.tr("Todo mundo junto", "Everyone together", "Todos juntos"), first == null, v -> {
            singer = "";
            colour = Glow.VIOLET;
            member = null;
            songs();
        });
        if (first == null) first = all;
        first.requestFocus();
    }

    /** Step two: the song. The family's own first, then the ones everybody knows, then any song at all. */
    private void songs() {
        back = this::whoSings;
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
                song(s.optString("title"), artist, video, s.optString("id"));
                seen.add(s.optString("title").toLowerCase(java.util.Locale.ROOT));
            }
        }
        heading(Ui.tr("Todo mundo sabe", "Everybody knows these", "Todos se las saben"));
        for (String[] s : STARTERS) {
            if (!seen.contains(s[0].toLowerCase(java.util.Locale.ROOT))) song(s[0], s[1], null, null);
        }
        scroll.scrollTo(0, 0);
        find.requestFocus();
    }

    private void heading(String text) {
        TextView h = FeedbackActivity.text(this, text, Ui.semibold, 28 * k, 0xA6FFFFFF);
        h.setPadding(0, Math.round(36 * k), 0, Math.round(14 * k));
        list.addView(h, new LinearLayout.LayoutParams(-1, -2));
    }

    private void song(String name, String artist, String video, String songId) {
        Button b = FeedbackActivity.button(this, name + (artist.isEmpty() ? "" : "  ·  " + artist), k, false);
        b.setOnClickListener(v -> picked(name, artist, video, songId, false));
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(80 * k));
        bp.bottomMargin = Math.round(14 * k);
        list.addView(b, bp);
    }

    private EditText field(String hint) {
        EditText field = new EditText(this);
        field.setSingleLine(true);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        field.setImeOptions(EditorInfo.IME_ACTION_GO);
        field.setTextSize(TypedValue.COMPLEX_UNIT_PX, 40 * k);
        field.setTextColor(0xFFFFFFFF);
        field.setHintTextColor(0x80FFFFFF);
        field.setHint(hint);
        field.setGravity(Gravity.CENTER);
        list.addView(field, new LinearLayout.LayoutParams(Math.round(1000 * k), -2));
        return field;
    }

    /** Any song at all: typed or said into the TV's own keyboard. It goes on the family's list too. */
    private void findSong() {
        back = this::songs;
        clear(Ui.tr("Diga ou digite a música e quem canta", "Say or type the song and who sings it", "Di o escribe la canción y quién la canta"));
        EditText field = field(Ui.tr("ex. Royals Lorde", "e.g. Royals Lorde", "p. ej. Royals Lorde"));
        Button go = FeedbackActivity.button(this, building ? Ui.tr("Adicionar", "Add it", "Añadir") : "🎤  " + Ui.tr("Cantar", "Sing it", "Cantar"), k, true);
        Runnable send = () -> {
            String words = field.getText().toString().trim();
            if (!words.isEmpty()) picked(words, "", null, null, true);
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

    /** A song was picked: into the playlist being built, or sung now. typed: it goes on the family's list too. */
    private void picked(String name, String artist, String video, String songId, boolean typed) {
        if (building) {
            java.util.function.Consumer<String> put = id -> {
                if (isFinishing()) return;
                if (id == null || id.isEmpty()) {
                    android.widget.Toast.makeText(this, Ui.tr("Não deu certo. Tente de novo.", "That didn't work. Try again.",
                            "No funcionó. Inténtalo de nuevo."), android.widget.Toast.LENGTH_LONG).show();
                    return;
                }
                try {
                    items().put(new JSONObject().put("songId", id).put("memberId", member == null ? JSONObject.NULL : member));
                } catch (Exception ignored) {
                }
                building = false;
                save(this::showList);
            };
            if (songId != null && !songId.isEmpty()) put.accept(songId);
            else Family.addSong(this, name, artist, s -> put.accept(s == null ? null : s.optString("id")));
            return;
        }
        if (typed) Family.addSong(this, name, null);
        sing(name, artist, video);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if ((code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) && back != null) {
            if (e.getAction() == KeyEvent.ACTION_UP) back.run();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
