package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.app.SearchManager;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Ask Beyond and the notes from Beyond Family (ADR 0025), on Google TV. The orb, the answer cards and the notes wall
 * are the web app's own files (web/ask.js, notes.js), which build.sh puts in the APK's assets with web/ask.html, so
 * there is one of each to change. This WebView shows them and does what the page can't: asks Beyond Family as this
 * TV, looks up a card's picture on TMDB (the key stays in Java), and opens the app a pick is on.
 *
 * Find (web/find.js, ADR 0062) runs here too: the TV's own voice search hears what was said (the remote's microphone),
 * and this says what's on the TV to match it against (the games, the channels, the apps) and opens what's picked. A
 * show goes to the TV's own search, or to Ask Beyond when Beyond Family is linked; a kid's only to Ask Beyond.
 */
public class AskActivity extends Activity {
    static final String ASK = "ask", NOTES = "notes", FIND = "find";
    private static final int LISTEN = 7;

    /** Find; listen: start listening straight away (the remote's microphone or search button). */
    static void find(Context c, boolean listen) {
        open(c, FIND, listen ? "listen" : "", "");
    }

    /** mode: ASK (the orb; `text` asks straight away) or NOTES (the notes wall). `from`: who asked from a phone. */
    static void open(Context c, String mode, String text, String from) {
        c.startActivity(new Intent(c, AskActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("mode", mode).putExtra("text", text == null ? "" : text).putExtra("from", from == null ? "" : from));
    }

    private WebView web;
    private String mode = ASK, text = "", from = "";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        read(getIntent());
        try {
            web = new WebView(this);
        } catch (Throwable t) {
            // No WebView on this TV (it's switched off or missing).
            Toast.makeText(this, Ui.tr("Isso precisa do Android System WebView.", "This needs Android System WebView.",
                    "Esto necesita Android System WebView."), Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        web.setBackgroundColor(0xFF0D0C18);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        // The page is drawn on a 1920 x 1080 stage (its viewport tag): without these the WebView lays it out at the
        // screen's width in dp (960 on a 1080p TV), so everything came out twice the size and ran off the right.
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setTextZoom(100);
        web.setFocusable(false);
        web.addJavascriptInterface(new Bridge(), "BeyondAsk");
        setContentView(web);
        web.loadUrl("file:///android_asset/ask.html");
    }

    /** Asked again from a phone while it's open: the page starts over with the new question. */
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        read(intent);
        if (web != null) web.evaluateJavascript("window.AskHost && AskHost.start()", null);
    }

    /** The TV's voice search answering Find: what it heard (a few guesses, best first), or nothing. */
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != LISTEN || web == null) return;
        ArrayList<String> heard = result == RESULT_OK && data != null ? data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS) : null;
        JSONArray out = new JSONArray();
        if (heard != null) for (String h : heard) if (h != null && !h.trim().isEmpty() && out.length() < 5) out.put(h);
        web.evaluateJavascript("window.AskHost && AskHost.heard(" + out + ")", null);
    }

    /** Runs a step of Find on the UI thread and leaves Find behind (what it opened is on top). */
    private void openAndGo(Runnable r) {
        runOnUiThread(() -> {
            try {
                r.run();
            } catch (RuntimeException e) {
                AppLog.w("find: " + e);
            }
            finish();
        });
    }

    private void read(Intent i) {
        String m = i.getStringExtra("mode");
        mode = NOTES.equals(m) ? NOTES : FIND.equals(m) ? FIND : ASK;
        text = i.getStringExtra("text") == null ? "" : i.getStringExtra("text");
        from = i.getStringExtra("from") == null ? "" : i.getStringExtra("from");
    }

    private void done(final String id, final int status, final String json) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("AskHost.done(" + JSONObject.quote(id) + "," + status + "," + json + ")", null);
        });
    }

    /** What the page asks of the TV. Runs on the WebView's own thread. */
    private final class Bridge {
        @JavascriptInterface public String mode() { return mode; }

        @JavascriptInterface public String text() { return text; }

        @JavascriptInterface public String from() { return from; }

        @JavascriptInterface public String language() { return Ui.language; }

        @JavascriptInterface public boolean sounds() { return Prefs.sounds(); }

        @JavascriptInterface public boolean lowEnd() { return Ui.LEGACY; }

        @JavascriptInterface public boolean linked() { return Family.linked(AskActivity.this); }

        /** Who's watching: kid or not, Family (everyone together) or not, and their Beyond Family member id. */
        @JavascriptInterface public String watcher() {
            People.Person p = People.current(AskActivity.this);
            JSONObject out = new JSONObject();
            try {
                out.put("id", p.id == null ? "" : p.id).put("kid", p.kid).put("together", p.together());
                if (p.member() != null) out.put("member", p.member());
            } catch (JSONException ignored) {
            }
            return out.toString();
        }

        @JavascriptInterface public String notes() {
            JSONArray n = Family.notes();
            return n == null ? "[]" : n.toString();
        }

        /** The apps Ask Beyond may point at: a kid's own shelf, or every app on the TV for a grown-up. Names only. */
        @JavascriptInterface public String apps() {
            JSONArray out = new JSONArray();
            Context c = AskActivity.this;
            if (People.kid(c)) {
                for (HomeApps.Item it : HomeApps.shelf(c, false)) if (out.length() < 40) out.put(it.label);
            } else {
                for (String[] app : HomeApps.shelfCandidates(c)) if (out.length() < 40) out.put(app[1]);
            }
            return out.toString();
        }

        /** Opens the app a pick is on, by its name. False when it isn't on this TV. */
        @JavascriptInterface public boolean openApp(String title) {
            String want = title == null ? "" : title.trim().toLowerCase(Locale.ROOT);
            if (want.isEmpty()) return false;
            String pkg = null;
            List<String[]> all = HomeApps.shelfCandidates(AskActivity.this);
            for (String[] app : all) if (app[1] != null && app[1].trim().toLowerCase(Locale.ROOT).equals(want)) { pkg = app[0]; break; }
            if (pkg == null) pkg = HomeApps.packageFor(AskActivity.this, want);
            final Intent intent = pkg == null ? null : HomeApps.launchIntent(getPackageManager(), pkg);
            if (intent == null) return false;
            runOnUiThread(() -> {
                try {
                    startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    finish();
                } catch (RuntimeException e) {
                    AppLog.here("ask: couldn't open " + intent + ": " + e);
                }
            });
            return true;
        }

        /** Beyond Family, as this TV: answers AskHost.done(id, status, json) on the page; status 0 when it didn't get there. */
        @JavascriptInterface public void call(final String id, final String method, final String path, final String body) {
            // Only the TV's own Ask Beyond and notes routes: the page can't use this TV's secret for anything else.
            if (!"/tv/ask".equals(path) && !path.matches("/tv/notes/[0-9a-f-]{36}/(heart|down)")) {
                done(id, 400, "{}");
                return;
            }
            new Thread(() -> {
                try {
                    JSONObject res = Family.call(AskActivity.this, method, path, body == null || body.isEmpty() ? null : new JSONObject(body), 40_000);
                    done(id, 200, res.toString());
                } catch (Family.Fail f) {
                    done(id, f.status, "{}");
                } catch (IOException | JSONException e) {
                    done(id, 0, "{}");
                }
            }, "beyond-ask").start();
        }

        /** A card's picture: the first TMDB match's backdrop (or poster) path, "" without a key or a match. */
        @JavascriptInterface public void backdrop(final String id, final String title, final int year, final boolean show) {
            new Thread(() -> {
                String path = "";
                try {
                    path = tmdbBackdrop(title, year, show);
                } catch (Exception ignored) {
                }
                done(id, 200, JSONObject.quote(path));
            }, "beyond-ask-tmdb").start();
        }

        /** The TV's own voice search can be asked (the remote's microphone). */
        @JavascriptInterface public boolean canListen() {
            return !getPackageManager().queryIntentActivities(new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH), 0).isEmpty();
        }

        /** Find: listens through the TV's voice search; the answer comes to AskHost.heard. */
        @JavascriptInterface public void listen() {
            runOnUiThread(() -> {
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                        .putExtra(RecognizerIntent.EXTRA_PROMPT, Ui.tr("Diga um jogo, um canal ou uma série", "Say a game, a channel or a show", "Di un juego, un canal o una serie"));
                try {
                    startActivityForResult(i, LISTEN);
                } catch (RuntimeException e) {
                    if (web != null) web.evaluateJavascript("window.AskHost && AskHost.heard([])", null);
                }
            });
        }

        /** Find: the Games screen's list, {id, name}, the same as GamesActivity. */
        @JavascriptInterface public String games() {
            JSONArray out = new JSONArray();
            try {
                for (Object[][] group : GamesActivity.groups(AskActivity.this)) {
                    for (int i = 1; i < group.length; i++) out.put(new JSONObject().put("id", group[i][0]).put("name", group[i][1]));
                }
            } catch (JSONException ignored) {
            }
            return out.toString();
        }

        @JavascriptInterface public void openGame(String id) {
            openAndGo(() -> GamesActivity.start(AskActivity.this, id));
        }

        /** Find: Tonight's sky or Live TV. */
        @JavascriptInterface public void openThing(String id) {
            openAndGo(() -> {
                if ("sky".equals(id)) SkyActivity.open(AskActivity.this);
                else if ("live".equals(id)) LiveTvActivity.open(AskActivity.this);
            });
        }

        /** Find: the channels that play here, {id, name} (a kid's are the kids' ones). */
        @JavascriptInterface public String channels() {
            JSONArray out = new JSONArray();
            try {
                for (String[] c : LiveTvActivity.playable(AskActivity.this)) {
                    out.put(new JSONObject().put("id", c[LiveTvActivity.ID]).put("name", c[LiveTvActivity.NAME]));
                }
            } catch (JSONException ignored) {
            }
            return out.toString();
        }

        @JavascriptInterface public void openChannel(String id) {
            openAndGo(() -> LiveTvActivity.play(AskActivity.this, id));
        }

        /**
         * Find: a show, by name. The TV's own search (it looks across every app on Google TV), else YouTube's search.
         * False when neither is here.
         */
        @JavascriptInterface public boolean shows(String query) {
            String q = query == null ? "" : query.trim();
            if (q.isEmpty()) return false;
            List<Intent> tries = new ArrayList<>();
            tries.add(new Intent(SearchManager.INTENT_ACTION_GLOBAL_SEARCH).putExtra(SearchManager.QUERY, q));
            tries.add(new Intent(Intent.ACTION_SEARCH).setPackage("com.google.android.youtube.tv").putExtra(SearchManager.QUERY, q));
            for (Intent i : tries) {
                if (getPackageManager().resolveActivity(i, 0) == null) continue;
                final Intent go = i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                openAndGo(() -> startActivity(go));
                return true;
            }
            return false;
        }

        @JavascriptInterface public void chime() { Chime.play(); }

        @JavascriptInterface public void talk() {
            runOnUiThread(() -> {
                FeedbackActivity.open(AskActivity.this);
                finish();
            });
        }

        @JavascriptInterface public void toast(String t) {
            runOnUiThread(() -> Toast.makeText(AskActivity.this, t, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface public void close() { runOnUiThread(AskActivity.this::finish); }
    }

    /** Same search as web/data.js backdropFor, with the key from config.properties (a v3 key or a v4 token). */
    private static String tmdbBackdrop(String title, int year, boolean show) throws IOException, JSONException {
        String key = Config.TMDB_KEY.trim();
        if (key.isEmpty() || title == null || title.isEmpty()) return "";
        boolean bearer = key.startsWith("eyJ");
        String url = "https://api.themoviedb.org/3/search/" + (show ? "tv" : "movie") + "?query=" + URLEncoder.encode(title, "UTF-8")
                + "&include_adult=false" + (year > 0 ? (show ? "&first_air_date_year=" : "&year=") + year : "")
                + (bearer ? "" : "&api_key=" + URLEncoder.encode(key, "UTF-8"));
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        c.setRequestProperty("Accept", "application/json");
        if (bearer) c.setRequestProperty("Authorization", "Bearer " + key);
        try {
            if (c.getResponseCode() != 200) return "";
            JSONArray results = new JSONObject(new String(Family.readAll(c.getInputStream()), "UTF-8")).optJSONArray("results");
            JSONObject r = results == null ? null : results.optJSONObject(0);
            if (r == null) return "";
            String path = r.isNull("backdrop_path") ? "" : r.optString("backdrop_path");
            return path.isEmpty() && !r.isNull("poster_path") ? r.optString("poster_path") : path;
        } finally {
            c.disconnect();
        }
    }

    /** The remote straight to the page: arrows, OK and Back, as the LG and Samsung key codes ask.js expects. */
    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int js;
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_DPAD_LEFT: js = 37; break;
            case KeyEvent.KEYCODE_DPAD_UP: js = 38; break;
            case KeyEvent.KEYCODE_DPAD_RIGHT: js = 39; break;
            case KeyEvent.KEYCODE_DPAD_DOWN: js = 40; break;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_BUTTON_A: js = 13; break;
            case KeyEvent.KEYCODE_BACK:
            case KeyEvent.KEYCODE_ESCAPE: js = 4; break;
            default: return super.dispatchKeyEvent(e);
        }
        if (web != null && e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
            web.evaluateJavascript("window.AskHost && AskHost.key(" + js + ")", null);
        }
        return true;
    }

    @Override protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
