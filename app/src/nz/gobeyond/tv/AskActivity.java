package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
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
import java.util.List;
import java.util.Locale;

/**
 * Ask Beyond and the notes from Beyond Family (ADR 0025), on Google TV. The orb, the answer cards and the notes wall
 * are the web app's own files (web/ask.js, notes.js), which build.sh puts in the APK's assets with web/ask.html, so
 * there is one of each to change. This WebView shows them and does what the page can't: asks Beyond Family as this
 * TV, looks up a card's picture on TMDB (the key stays in Java), and opens the app a pick is on.
 */
public class AskActivity extends Activity {
    static final String ASK = "ask", NOTES = "notes";

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

    private void read(Intent i) {
        String m = i.getStringExtra("mode");
        mode = NOTES.equals(m) ? NOTES : ASK;
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
                    AppLog.w("ask: couldn't open " + intent + ": " + e);
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
