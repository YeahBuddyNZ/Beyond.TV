package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.SearchManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Karaoke night (ADR 0020, 0022): a line-up of turns, each a singer's first name and colour, a song, and a YouTube
 * video id or a search. A turn shows who's up, full screen over whatever is on, and counts down from five (OK starts
 * now); then the karaoke version plays in Beyond TV's own player, and when it ends the next turn comes up by itself.
 * The line-up is a playlist, one song picked on the remote, or tonight's queue in Beyond Family, which is asked for
 * the next singer when the songs run out. Without a video id Beyond Family finds the best one (Sing King and Lost
 * Panda first); only when there is none does it fall back to the YouTube app. The words come from the video: Beyond
 * never keeps lyrics. Same as web/karaoke.js.
 *
 * Take turns (ADR 0059): the TV's own list of requests, anyone's song added from the remote, sung in a fair order so
 * nobody sings twice until everyone who asked has had a go (KaraokeTurns). No phone needed.
 */
public class KaraokeActivity extends Activity {
    private static final String TURNS = "turns", LIST = "list", QUEUE = "queue", FAIR = "fair";
    private static final String YOUTUBE = "com.google.android.youtube.tv";
    private static final int COUNT_FROM = 5;
    /** The page the player says it is on: YouTube's embeds want a real address behind them. */
    private static final String BASE = "https://yeahbuddynz.github.io/Beyond.TV/";

    private final Handler tick = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private LinearLayout card;
    private TextView list, mic, who, song, count, after;
    private Button go, more, skip, finish;
    private WebView web;
    private JSONArray turns = new JSONArray();
    private String listName = "";
    private boolean queue;
    /** Take turns: each next turn comes from the TV's own list. */
    private boolean fair;
    /** Gone to add a song (KaraokePickActivity); empty: it was the end-of-list card that asked. */
    private boolean adding, addingFromEmpty;
    private int at, left;
    /** Counts each song played, so a late "ended" from the last one can't move the night on twice. */
    private int playing;
    private final Runnable step = new Runnable() {
        @Override public void run() {
            if (--left <= 0) {
                sing();
                return;
            }
            count.setText(counting());
            tick.postDelayed(this, 1000);
        }
    };

    /** One turn, from Beyond Family's Next singer or the remote: tonight's queue carries on after it. */
    static Intent intent(Context c, String name, int colour, String title, String artist, String videoId, String query, String after) {
        JSONArray one = new JSONArray();
        try {
            JSONObject t = new JSONObject().put("name", name == null ? "" : name).put("colour", hex(colour)).put("title", title)
                    .put("artist", artist == null ? "" : artist).put("query", query == null ? "" : query);
            if (videoId != null && !videoId.isEmpty()) t.put("videoId", videoId);
            if (after != null && !after.isEmpty()) t.put("after", after);
            one.put(t);
        } catch (JSONException ignored) {
        }
        return night(c, one, "", true);
    }

    /** A line-up of turns: a playlist (with its name), or the start of tonight's queue (queue true). */
    static Intent night(Context c, JSONArray turns, String name, boolean queue) {
        return new Intent(c, KaraokeActivity.class).putExtra(TURNS, turns.toString()).putExtra(LIST, name == null ? "" : name)
                .putExtra(QUEUE, queue).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    /** Take turns: the TV's own list, fairly, until nobody's waiting. */
    static Intent turns(Context c) {
        return new Intent(c, KaraokeActivity.class).putExtra(TURNS, "[]").putExtra(FAIR, true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    static String hex(int colour) {
        return String.format("#%06X", colour & 0xFFFFFF);
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(card, new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER));

        list = FeedbackActivity.text(this, "", Ui.regular, 30 * k, 0xB3FFFFFF);
        list.setPadding(0, 0, 0, Math.round(24 * k));
        card.addView(list, new LinearLayout.LayoutParams(-1, -2));
        mic = FeedbackActivity.text(this, "🎤", Ui.regular, 96 * k, 0xFFFFFFFF);
        int size = Math.round(180 * k);
        LinearLayout.LayoutParams mp = new LinearLayout.LayoutParams(size, size);
        mp.bottomMargin = Math.round(40 * k);
        card.addView(mic, mp);
        who = FeedbackActivity.text(this, "", Ui.displaySemibold, 110 * k, 0xFFFFFFFF);
        card.addView(who, new LinearLayout.LayoutParams(-1, -2));
        song = FeedbackActivity.text(this, "", Ui.regular, 52 * k, 0xE6FFFFFF);
        song.setPadding(0, Math.round(20 * k), 0, 0);
        card.addView(song, new LinearLayout.LayoutParams(-1, -2));
        count = FeedbackActivity.text(this, "", Ui.regular, 36 * k, 0xA6FFFFFF);
        count.setPadding(0, Math.round(40 * k), 0, Math.round(50 * k));
        card.addView(count, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_HORIZONTAL);
        go = FeedbackActivity.button(this, "", k, true);
        go.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 38 * k);
        more = FeedbackActivity.button(this, "＋  " + Ui.tr("Adicionar música", "Add a song", "Añadir canción"), k, false);
        more.setOnClickListener(v -> addSong(false));
        skip = FeedbackActivity.button(this, "", k, false);
        finish = FeedbackActivity.button(this, Ui.tr("Terminar", "Finish", "Terminar"), k, false);
        finish.setOnClickListener(v -> finish());
        for (Button b : new Button[] {go, more, skip, finish}) {
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(100 * k));
            bp.leftMargin = bp.rightMargin = Math.round(12 * k);
            row.addView(b, bp);
        }
        card.addView(row, new LinearLayout.LayoutParams(-1, -2));
        after = FeedbackActivity.text(this, "", Ui.regular, 32 * k, 0x8CFFFFFF);
        after.setPadding(0, Math.round(40 * k), 0, 0);
        card.addView(after, new LinearLayout.LayoutParams(-1, -2));

        setContentView(root);
        begin(getIntent());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        begin(intent);
    }

    /** A new night: whatever was playing stops. */
    private void begin(Intent i) {
        stopVideo();
        try {
            turns = new JSONArray(i.getStringExtra(TURNS));
        } catch (Exception e) {
            turns = new JSONArray();
        }
        listName = i.getStringExtra(LIST) == null ? "" : i.getStringExtra(LIST);
        queue = i.getBooleanExtra(QUEUE, false);
        fair = i.getBooleanExtra(FAIR, false);
        at = 0;
        finish.setText(Ui.tr("Terminar", "Finish", "Terminar"));
        if (fair) {
            listName = Ui.tr("Revezar", "Take turns", "Por turnos");
            nextFair();
            return;
        }
        if (turns.length() == 0) {
            finish();
            return;
        }
        showCard();
    }

    /** Take turns: the next one off the TV's list, or the end-of-list card. */
    private void nextFair() {
        Turns t = Turns.load(this);
        KaraokeTurns.Request r = KaraokeTurns.take(t.requests, t.sung);
        t.save(this);
        if (r == null) {
            empty();
            return;
        }
        turns.put(Turns.json(r));
        at = turns.length() - 1;
        showCard();
    }

    /** Somebody wants a turn: the countdown waits, and comes back to whoever was up (or the next one, from the end). */
    private void addSong(boolean fromEmpty) {
        tick.removeCallbacks(step);
        adding = true;
        addingFromEmpty = fromEmpty;
        startActivity(KaraokePickActivity.adding(this));
    }

    /** Nobody's waiting: another round, or that's the night. */
    private void empty() {
        wrap();
        mic.setText("🎉");
        who.setText(Ui.tr("Todo mundo cantou!", "Everyone's had a go!", "¡Todos han cantado!"));
        song.setText(Ui.tr("Mais uma rodada?", "Another round?", "¿Otra ronda?"));
        song.setVisibility(View.VISIBLE);
        go.setText("＋  " + Ui.tr("Adicionar música", "Add a song", "Añadir canción"));
        go.setOnClickListener(v -> addSong(true));
        go.requestFocus();
    }

    private JSONObject turn() {
        JSONObject t = turns.optJSONObject(at);
        return t == null ? new JSONObject() : t;
    }

    private static String text(JSONObject o, String key) {
        return o.isNull(key) ? "" : o.optString(key, "");
    }

    /** Who's up, then a countdown. */
    private void showCard() {
        card.setVisibility(View.VISIBLE);
        JSONObject t = turn();
        list.setText(fair ? "🔁 " + listName + "  ·  " + inLine(Turns.load(this).waiting().size())
                : listName.isEmpty() ? "" : "🎶 " + listName + "  ·  " + (at + 1) + " / " + turns.length());
        list.setVisibility(listName.isEmpty() ? View.GONE : View.VISIBLE);
        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        disc.setColor(Family.colour(text(t, "colour"), Glow.VIOLET));
        mic.setBackground(disc);
        mic.setText("🎤");
        String name = text(t, "name");
        who.setText(name.isEmpty() ? Ui.tr("Todo mundo junto!", "Everyone together!", "¡Todos juntos!")
                : Ui.tr("Vez de " + name + "!", name + "'s up!", "¡Le toca a " + name + "!"));
        String artist = text(t, "artist");
        song.setText(text(t, "title") + (artist.isEmpty() ? "" : " · " + artist));
        song.setVisibility(View.VISIBLE);
        after.setText(afterLine(t));
        go.setText("🎤  " + Ui.tr("Cantar agora", "Sing now", "Cantar ahora"));
        go.setOnClickListener(v -> sing());
        skip.setText(Ui.tr("Pular", "Skip this one", "Saltar"));
        skip.setOnClickListener(v -> {
            tick.removeCallbacks(step);
            onward();
        });
        skip.setVisibility(View.VISIBLE);
        more.setVisibility(fair ? View.VISIBLE : View.GONE);
        tick.removeCallbacks(step);
        left = COUNT_FROM;
        count.setText(counting());
        count.setVisibility(View.VISIBLE);
        tick.postDelayed(step, 1000);
        go.requestFocus();
    }

    /** "After that: Aroha · Royals": the line-up's next turn, or what Beyond Family said comes next in the queue. */
    private String afterLine(JSONObject t) {
        JSONObject next = turns.optJSONObject(at + 1);
        String line;
        if (fair) {
            List<KaraokeTurns.Request> waiting = Turns.load(this).waiting();
            KaraokeTurns.Request r = waiting.isEmpty() ? null : waiting.get(0);
            line = r == null ? "" : (r.name.isEmpty() ? Ui.tr("todo mundo", "everyone", "todos") : r.name) + " · " + r.title;
        } else if (next != null) {
            String n = text(next, "name");
            line = (n.isEmpty() ? Ui.tr("todo mundo", "everyone", "todos") : n) + " · " + text(next, "title");
        } else {
            line = text(t, "after");
            JSONObject said = t.optJSONObject("next");
            if (line.isEmpty() && said != null) line = text(said, "name") + " · " + text(said, "title");
        }
        return line.isEmpty() ? "" : Ui.tr("Depois: ", "After that: ", "Después: ") + line;
    }

    private String counting() {
        return Ui.tr("Começa em ", "Starting in ", "Empieza en ") + left;
    }

    /** "3 more waiting" (or nobody yet). */
    static String inLine(int n) {
        if (n == 0) return Ui.tr("ninguém na fila", "nobody else waiting yet", "nadie más en la fila");
        return n == 1 ? Ui.tr("mais 1 na fila", "1 more waiting", "1 más en la fila")
                : Ui.tr("mais " + n + " na fila", n + " more waiting", n + " más en la fila");
    }

    /** The song in our own player. Without a video id, Beyond Family finds the best one first. */
    private void sing() {
        tick.removeCallbacks(step);
        final JSONObject t = turn();
        String id = text(t, "videoId");
        if (id.matches("[A-Za-z0-9_-]{11}")) {
            playVideo(id);
            return;
        }
        if (Family.linked(this)) {
            count.setText(Ui.tr("Preparando a música…", "Getting the song ready…", "Preparando la canción…"));
            final int night = playing;
            Family.findVideo(this, text(t, "title"), text(t, "artist"), found -> {
                if (isFinishing() || night != playing) return;
                if (found != null) {
                    try {
                        t.put("videoId", found);
                    } catch (JSONException ignored) {
                    }
                    playVideo(found);
                } else outside(t);
            });
            return;
        }
        outside(t);
    }

    /** No video to play here: the YouTube app's search. The night stops, since we can't tell when the song ends. */
    private void outside(JSONObject t) {
        String q = text(t, "query");
        if (!play(this, text(t, "videoId"), q.isEmpty() ? text(t, "title") + " karaoke" : q)) {
            Toast.makeText(this, Ui.tr("Abra o YouTube para cantar", "Open YouTube to sing", "Abre YouTube para cantar"), Toast.LENGTH_LONG).show();
        }
        finish();
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void playVideo(String id) {
        ++playing;
        try {
            if (web == null) {
                web = new WebView(this);
                web.setBackgroundColor(Color.BLACK);
                WebSettings ws = web.getSettings();
                ws.setJavaScriptEnabled(true);
                ws.setDomStorageEnabled(true);
                ws.setMediaPlaybackRequiresUserGesture(false);
                web.addJavascriptInterface(new Object() {
                    // The page is blanked whenever a song stops, so whatever speaks is the song playing now.
                    @JavascriptInterface public void ended() { tick.post(() -> done(playing, "ended")); }
                    @JavascriptInterface public void failed(int code) { tick.post(() -> done(playing, code == 0 ? "noapi" : "error")); }
                }, "Beyond");
                root.addView(web, new FrameLayout.LayoutParams(-1, -1));
            }
        } catch (Throwable t) {
            // No WebView on this TV: the YouTube app it is.
            web = null;
            outside(turn());
            return;
        }
        card.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
        web.loadDataWithBaseURL(BASE, page(id), "text/html", "utf-8", null);
        web.requestFocus();
    }

    /** YouTube's own player, told to say when the song ends or won't play here. */
    private static String page(String id) {
        return "<!doctype html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{width:100%;height:100%}</style></head>"
                + "<body><div id=p></div><script>"
                + "var s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';"
                + "s.onerror=function(){Beyond.failed(0)};document.head.appendChild(s);"
                + "function onYouTubeIframeAPIReady(){new YT.Player('p',{host:'https://www.youtube-nocookie.com',videoId:'" + id + "',"
                + "width:'100%',height:'100%',playerVars:{autoplay:1,rel:0,modestbranding:1,playsinline:1,controls:0,iv_load_policy:3,fs:0,"
                + "origin:'https://yeahbuddynz.github.io'},events:{onReady:function(e){e.target.playVideo()},"
                + "onStateChange:function(e){if(e.data===0)Beyond.ended()},onError:function(e){Beyond.failed(e.data||1)}}})}"
                + "</script></body></html>";
    }

    /** The song is over, stopped with Back, or won't play here. */
    private void done(int which, String why) {
        if (which != playing || isFinishing()) return;
        if ("noapi".equals(why)) {
            // YouTube's player script didn't load: the plain embed still plays, and Back moves on.
            web.loadUrl("https://www.youtube-nocookie.com/embed/" + text(turn(), "videoId") + "?autoplay=1&rel=0&modestbranding=1");
            return;
        }
        if ("error".equals(why)) {
            Toast.makeText(this, Ui.tr("Essa não toca aqui. Vamos para a próxima.", "That one won't play here. On to the next.",
                    "Esa no suena aquí. Vamos a la siguiente."), Toast.LENGTH_LONG).show();
        }
        stopVideo();
        onward();
    }

    private void stopVideo() {
        playing++;
        if (web != null) {
            web.loadUrl("about:blank");
            web.setVisibility(View.GONE);
        }
    }

    /** The next turn: the line-up's, tonight's queue's, or the end of the night. */
    private void onward() {
        if (fair) {
            nextFair();
            return;
        }
        at++;
        if (at < turns.length()) {
            showCard();
            return;
        }
        if (queue && Family.linked(this)) {
            final int night = playing;
            Family.nextTurn(this, t -> {
                if (isFinishing() || night != playing) return;
                if (t != null && !text(t, "title").isEmpty()) {
                    turns.put(t);
                    showCard();
                } else wrap();
            });
            return;
        }
        wrap();
    }

    /** The end of the night. */
    private void wrap() {
        tick.removeCallbacks(step);
        card.setVisibility(View.VISIBLE);
        list.setVisibility(View.GONE);
        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        disc.setColor(Glow.VIOLET);
        mic.setBackground(disc);
        mic.setText("🎉");
        who.setText(Ui.tr("Que noite!", "That's a wrap!", "¡Qué noche!"));
        song.setVisibility(View.GONE);
        count.setVisibility(View.GONE);
        after.setText("");
        go.setText("🎤  " + Ui.tr("Cantar outra", "Sing another", "Cantar otra"));
        go.setOnClickListener(v -> {
            KaraokePickActivity.open(this);
            finish();
        });
        skip.setVisibility(View.GONE);
        more.setVisibility(View.GONE);
        finish.setText(Ui.tr("Pronto", "Done", "Listo"));
        go.requestFocus();
    }

    static boolean play(Context c, String videoId, String query) {
        Intent[] tries;
        if (videoId != null && !videoId.isEmpty()) {
            tries = new Intent[] {
                    new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=" + videoId)).setPackage(YOUTUBE),
                    new Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:" + videoId)),
            };
        } else {
            String q = query == null ? "karaoke" : query;
            tries = new Intent[] {
                    new Intent(Intent.ACTION_SEARCH).setPackage(YOUTUBE).putExtra(SearchManager.QUERY, q),
                    new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(q))).setPackage(YOUTUBE),
            };
        }
        for (Intent t : tries) {
            try {
                c.startActivity(t.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (ActivityNotFoundException | SecurityException ignored) {
            }
        }
        Intent app = c.getPackageManager().getLeanbackLaunchIntentForPackage(YOUTUBE);
        if (app == null) return false;
        c.startActivity(app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return false;
    }

    @Override protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (adding) {
            // Back from adding a song: the same singer is still up, or from the end of the list, the next one.
            adding = false;
            if (addingFromEmpty) {
                if (!Turns.load(this).requests.isEmpty()) nextFair();
            } else if (at >= 0 && at < turns.length()) showCard();
        }
    }

    /** Take turns' list, kept in this TV's preferences for the night; KaraokeTurns has the rules. */
    static final class Turns {
        final List<KaraokeTurns.Request> requests = new ArrayList<>();
        final Map<String, Integer> sung = new HashMap<>();

        private static android.content.SharedPreferences sp(Context c) {
            return c.getApplicationContext().getSharedPreferences("karaoke", Context.MODE_PRIVATE);
        }

        static Turns load(Context c) {
            Turns t = new Turns();
            try {
                JSONObject o = new JSONObject(sp(c).getString("turns", "{}"));
                if (System.currentTimeMillis() - o.optLong("at") > KaraokeTurns.FRESH_FOR) return t;
                JSONArray a = o.optJSONArray("requests");
                for (int i = 0; a != null && i < a.length(); i++) {
                    JSONObject j = a.optJSONObject(i);
                    if (j == null || text(j, "title").isEmpty()) continue;
                    KaraokeTurns.Request r = new KaraokeTurns.Request(text(j, "name"), text(j, "title"));
                    r.colour = text(j, "colour");
                    r.artist = text(j, "artist");
                    r.videoId = text(j, "videoId");
                    r.query = text(j, "query");
                    t.requests.add(r);
                }
                JSONObject s = o.optJSONObject("sung");
                if (s != null) {
                    for (Iterator<String> it = s.keys(); it.hasNext(); ) {
                        String key = it.next();
                        t.sung.put(key, s.optInt(key));
                    }
                }
            } catch (Exception ignored) {
            }
            return t;
        }

        void save(Context c) {
            try {
                JSONArray a = new JSONArray();
                for (KaraokeTurns.Request r : requests) a.put(json(r));
                JSONObject s = new JSONObject();
                for (Map.Entry<String, Integer> e : sung.entrySet()) s.put(e.getKey(), e.getValue());
                sp(c).edit().putString("turns", new JSONObject().put("at", System.currentTimeMillis()).put("requests", a).put("sung", s).toString()).apply();
            } catch (JSONException ignored) {
            }
        }

        /** Still waiting, in order. */
        List<KaraokeTurns.Request> waiting() { return KaraokeTurns.order(requests, sung); }

        /** Adds a request; its place in the line (1 is next), or 0 when the list is full. */
        int add(KaraokeTurns.Request r) {
            if (requests.size() >= KaraokeTurns.MOST) return 0;
            requests.add(r);
            return KaraokeTurns.place(requests, sung, r);
        }

        /** A turn as KaraokeActivity plays it. */
        static JSONObject json(KaraokeTurns.Request r) {
            JSONObject t = new JSONObject();
            try {
                t.put("name", r.name).put("colour", r.colour).put("title", r.title).put("artist", r.artist).put("query", r.query);
                if (!r.videoId.isEmpty()) t.put("videoId", r.videoId);
            } catch (JSONException ignored) {
            }
            return t;
        }
    }

    @Override protected void onDestroy() {
        tick.removeCallbacks(step);
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() != KeyEvent.ACTION_UP) return true;
            if (web != null && web.getVisibility() == View.VISIBLE) {
                // Back during a song: on to the next singer.
                stopVideo();
                onward();
            } else finish();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
