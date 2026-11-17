package nz.gobeyond.tv;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Board and card games against the robots (ADR 0024): Ludo, Sheep, Penguin, Volcano, and Snap. The games are the same
 * files LG and Samsung run (web/table.js, ludo.js, snap.js), which build.sh puts in the APK's assets with
 * web/table.html, so there is one set of rules and one robot to change. This WebView shows them; the remote's keys go
 * straight to the page (TableHost.key), and the page reads who's playing from People. Each person's levels and tips
 * stay in files/table.json on this TV and are never sent anywhere.
 */
public class TableActivity extends Activity {
    static void open(Context c) { open(c, null); }

    /** start: "silly" opens the silly games (web/laughs.js), "lunch" school lunches (web/lunch.js), "arcade" the arcade (web/arcade.js), "sky" Look around (web/skylook.js) and "lights" the light show (web/lights.js), rather than the board and card games. */
    static void open(Context c, String start) {
        c.startActivity(new Intent(c, TableActivity.class).putExtra("start", start).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    /** The screen showing Look around, if there is one: a phone's compass (Family, ADR 0040) turns its view. */
    private static volatile TableActivity sky;

    /** True while Look around is showing, so a second Point the sky does not stack another screen on it. */
    static boolean skyOpen() { return sky != null; }

    /** Turns Look around to where a phone is pointing. Nothing happens when it isn't showing, so a stray update never opens a screen. */
    static void look(double az, double alt) {
        TableActivity a = sky;
        if (a == null || Double.isNaN(az) || Double.isNaN(alt)) return;
        final String js = String.format(java.util.Locale.ROOT, "if(window.SkyLook)SkyLook.look(%.1f,%.1f)", az, alt);
        a.runOnUiThread(() -> { if (a.web != null) a.web.evaluateJavascript(js, null); });
    }

    private static final String FILE = "table.json";
    private static final int ASK_MIC = 41;
    private WebView web;
    // The light show's way to Beyond Music (ADR 0027's relay on 127.0.0.1), started the first time the page asks.
    private MusicRelay relay;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        try {
            web = new WebView(this);
        } catch (Throwable t) {
            // No WebView on this TV (it's switched off or missing): nothing to play the games in.
            Toast.makeText(this, Ui.tr("Os jogos precisam do Android System WebView.", "The games need Android System WebView.",
                    "Los juegos necesitan Android System WebView."), Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        web.setBackgroundColor(0xFF0D0C18);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);   // the games make their sounds without a tap
        // The page is drawn on a 1920 x 1080 stage (its viewport tag): without these the WebView lays it out at the
        // screen's width in dp (960 on a 1080p TV), so everything came out twice the size and ran off the right.
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setTextZoom(100);
        web.setFocusable(false);
        web.addJavascriptInterface(new Bridge(), "BeyondTable");
        // The light show's "Listen to the room" (ADR 0041): only the microphone, only for our own page, and only once
        // the person has said yes to Android's own question. The sound is read as levels on the TV, never kept.
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest r) {
                boolean ours = r.getOrigin() != null && "file".equals(r.getOrigin().getScheme());
                boolean micOnly = r.getResources().length == 1 && PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r.getResources()[0]);
                if (ours && micOnly && micAllowed()) r.grant(r.getResources()); else r.deny();
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/table.html");
        if ("sky".equals(getIntent().getStringExtra("start"))) sky = this;
    }

    /** What the page asks of the TV. Runs on the WebView's own thread. */
    private final class Bridge {
        @JavascriptInterface public String people() {
            JSONArray out = new JSONArray();
            for (People.Person p : People.list(TableActivity.this)) {
                try {
                    out.put(new JSONObject().put("id", p.id).put("name", p.name == null ? "" : p.name)
                            .put("emoji", p.emoji == null ? "" : p.emoji).put("colour", String.format("#%06X", p.colour & 0xFFFFFF))
                            .put("kid", p.kid).put("teen", p.teen));
                } catch (JSONException ignored) {
                }
            }
            return out.toString();
        }

        @JavascriptInterface public String current() {
            People.Person p = People.current(TableActivity.this);
            return p == null || p.id == null ? "" : p.id;
        }

        @JavascriptInterface public String language() { return Ui.language; }

        /** Where the TV is, for the sky: latitude and longitude as set in Home Settings, the city and the country. */
        @JavascriptInterface public String place() {
            try {
                return new JSONObject().put("lat", Prefs.latitude()).put("lon", Prefs.longitude()).put("city", Prefs.city())
                        .put("country", Config.TMDB_REGION.trim().toUpperCase(java.util.Locale.ROOT)).toString();
            } catch (JSONException e) {
                return "";
            }
        }

        /** Which games to open: "silly" for the silly games, "arcade" for the arcade, otherwise the board and card games. */
        @JavascriptInterface public String start() {
            String s = getIntent().getStringExtra("start");
            return s == null ? "" : s;
        }

        /** Beyond Music through this TV's relay, for the light show, or "" when there's no music to be found. */
        @JavascriptInterface public String music() {
            synchronized (TableActivity.this) {
                if (relay != null) return "http://127.0.0.1:" + relay.port();
                String base = Music.base();
                if (base == null) return "";
                try {
                    relay = new MusicRelay(new URL(base));
                    relay.start();
                    return "http://127.0.0.1:" + relay.port();
                } catch (Exception e) {
                    relay = null;
                    return "";
                }
            }
        }

        /** Whether this TV has a microphone at all (built in, or a USB one or webcam plugged in). */
        @JavascriptInterface public boolean canListen() {
            return getPackageManager().hasSystemFeature(PackageManager.FEATURE_MICROPHONE);
        }

        /** Asks Android for the microphone; the answer comes back as Lights.answer(true or false). */
        @JavascriptInterface public void ask() {
            runOnUiThread(() -> {
                if (micAllowed()) answer(true);
                else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, ASK_MIC);
            });
        }

        /** Older TVs (Android 9 to 11) and 1 GB ones: the light show starts in its light mode. */
        @JavascriptInterface public boolean lowPower() {
            ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            return Ui.LEGACY || (am != null && am.isLowRamDevice());
        }

        /** A kid watching with a grown-up PIN set: grown-up things (Start fresh) wait for a grown-up. */
        @JavascriptInterface public boolean locked() { return People.kid(TableActivity.this) && People.hasPin(TableActivity.this); }

        @JavascriptInterface public String load() {
            File f = new File(getFilesDir(), FILE);
            if (!f.exists()) return "";
            try (FileInputStream in = new FileInputStream(f)) {
                byte[] b = new byte[(int) Math.min(f.length(), 512 * 1024)];
                int n = 0, r;
                while (n < b.length && (r = in.read(b, n, b.length - n)) > 0) n += r;
                return new String(b, 0, n, StandardCharsets.UTF_8);
            } catch (IOException e) {
                return "";
            }
        }

        @JavascriptInterface public void save(String json) {
            if (json == null || json.length() > 512 * 1024) return;
            File tmp = new File(getFilesDir(), FILE + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
            } catch (IOException e) {
                return;
            }
            if (!tmp.renameTo(new File(getFilesDir(), FILE))) tmp.delete();
        }

        @JavascriptInterface public void toast(String text) {
            runOnUiThread(() -> Toast.makeText(TableActivity.this, text, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface public void close() { runOnUiThread(TableActivity.this::finish); }
    }

    private boolean micAllowed() {
        return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void answer(boolean yes) {
        if (web != null) web.evaluateJavascript("window.Lights && Lights.answer(" + yes + ")", null);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (code == ASK_MIC) answer(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
    }

    /** The remote straight to the page: arrows, OK and Back, as the LG and Samsung key codes the games expect. */
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
        // One press, one key: a held OK must not slap over and over.
        if (web != null && e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
            web.evaluateJavascript("window.TableHost && TableHost.key(" + js + ")", null);
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
        if (sky == this) sky = null;
        synchronized (this) {
            if (relay != null) relay.close();
            relay = null;
        }
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
