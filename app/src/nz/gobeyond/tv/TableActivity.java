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

    /** start: "silly" opens the silly games (web/laughs.js), "lunch" school lunches (web/lunch.js), "arcade" the arcade (web/arcade.js), "rcland" Milo's Remote Control Land (web/rcland.js), "candy" London's Candy Land (web/candy.js), "road" Build a road, "bridge" Build a bridge and "town" Plan a town (web/builder.js), "chores" Daily chores (web/chores.js), "wall" the family wall and to-dos (web/wall.js), "scores" the family scoreboard (web/scores.js), "sky" Look around (web/skylook.js), "lights" the light show (web/lights.js) and "guides" How to play (web/guides.js), rather than the board and card games. */
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
    private static final int ASK_MIC = 41, ASK_CAMERA = 42;
    private WebView web;
    // The light show's way to Beyond Music (ADR 0027's relay on 127.0.0.1), started the first time the page asks.
    private MusicRelay relay;
    // The light show's "The TV's sound" (ADR 0044): Android's Visualizer on the TV's output, only while it's on screen.
    private final TvSound tvSound = new TvSound();
    private boolean tvWasOn, roomWasOn;
    // The light show's "Listen to the room" (ADR 0050): a USB or built-in microphone picked by the app, not the WebView.
    private final RoomSound roomSound = new RoomSound();

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
                // The light show's "Wave to make ripples" (ADR 0050): the camera, only once Android's own question said
                // yes. Its pictures are only compared on the TV, a few small grey frames at a time, never kept or sent.
                if (ours && r.getResources().length == 1) {
                    String want = r.getResources()[0];
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(want) && micAllowed()) { r.grant(r.getResources()); return; }
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(want) && cameraAllowed()) { r.grant(r.getResources()); return; }
                }
                r.deny();
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/table.html");
        if ("sky".equals(getIntent().getStringExtra("start"))) sky = this;
    }

    /** Answers the page's n-th question to Beyond Family (wall.js). On the main thread, where Family calls back. */
    private void answer(int n, boolean ok) {
        if (web != null) web.evaluateJavascript("window.Wall && Wall.answer(" + n + ", " + ok + ")", null);
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

        /** The family wall and everyone's to-dos (web/wall.js, ADR 0067): {wall, todos}. */
        @JavascriptInterface public String wall() { return Family.wallJson(); }

        /** Ticks a to-do in Beyond Family; the answer comes back as Wall.answer(n, ok). */
        @JavascriptInterface public void tick(int n, String id, String member, boolean on) {
            Family.tickTodo(TableActivity.this, id, member, on, ok -> answer(n, ok));
        }

        /** Puts a sticky on the family wall; the answer comes back as Wall.answer(n, ok). */
        @JavascriptInterface public void sticky(int n, String text, String colour, String member) {
            Family.sticky(TableActivity.this, text, colour, member, ok -> answer(n, ok));
        }

        /** The tidy-up race's places for the family scoreboard (ScoreLog, ADR 0057). */
        @JavascriptInterface public String scores() { return ScoreLog.all(TableActivity.this); }

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

        /** Whether this TV has a microphone at all (built in, often only in the remote, or a USB one or webcam plugged in). */
        @JavascriptInterface public boolean canListen() {
            return getPackageManager().hasSystemFeature(PackageManager.FEATURE_MICROPHONE) || RoomSound.any(TableActivity.this);
        }

        /** "usb" when a USB microphone or webcam is plugged in, "tv" for one built in (often the remote's), else "". */
        @JavascriptInterface public String micKind() {
            android.media.AudioDeviceInfo d = RoomSound.best(TableActivity.this);
            if (d == null) return "";
            return d.getType() == android.media.AudioDeviceInfo.TYPE_BUILTIN_MIC ? "tv" : "usb";
        }

        /** Starts listening to the room after ask() said yes: "usb", "tv" or "other" for the microphone, or "". */
        @JavascriptInterface public String roomStart() { return micAllowed() ? roomSound.start(TableActivity.this) : ""; }

        @JavascriptInterface public String roomFft() { return roomSound.fft(); }

        @JavascriptInterface public String roomWave() { return roomSound.wave(); }

        @JavascriptInterface public int roomNyquist() { return roomSound.nyquist(); }

        @JavascriptInterface public float roomPeak() { return roomSound.peak(); }

        @JavascriptInterface public void roomStop() { roomSound.stop(); }

        /** A camera is plugged in or built in right now, for "Wave to make ripples". */
        @JavascriptInterface public boolean canWatch() {
            try {
                android.hardware.camera2.CameraManager cm = (android.hardware.camera2.CameraManager) getSystemService(Context.CAMERA_SERVICE);
                return cm != null && cm.getCameraIdList().length > 0;
            } catch (Throwable t) {
                return false;
            }
        }

        /** Asks Android for the camera; the answer comes back as Lights.cameraAnswer(true or false). */
        @JavascriptInterface public void askCamera() {
            runOnUiThread(() -> {
                if (cameraAllowed()) cameraAnswer(true);
                else requestPermissions(new String[]{Manifest.permission.CAMERA}, ASK_CAMERA);
            });
        }

        /** Asks Android for the microphone; the answer comes back as Lights.answer(true or false). */
        @JavascriptInterface public void ask() {
            runOnUiThread(() -> {
                if (micAllowed()) answer(true);
                else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, ASK_MIC);
            });
        }

        /** The TV's own sound can be drawn: Visualizer needs the microphone permission and an audio output. */
        @JavascriptInterface public boolean canHearTv() {
            return getPackageManager().hasSystemFeature(PackageManager.FEATURE_AUDIO_OUTPUT);
        }

        /** Starts listening to the TV's output, after ask() said yes; false when this TV won't share it. */
        @JavascriptInterface public boolean tvStart() { return micAllowed() && tvSound.start(); }

        @JavascriptInterface public String tvFft() { return tvSound.fft(); }

        @JavascriptInterface public String tvWave() { return tvSound.wave(); }

        @JavascriptInterface public int tvNyquist() { return tvSound.nyquist(); }

        @JavascriptInterface public void tvStop() { tvSound.stop(); }

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

    private boolean cameraAllowed() {
        return checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private void cameraAnswer(boolean yes) {
        if (web != null) web.evaluateJavascript("window.Lights && Lights.cameraAnswer(" + yes + ")", null);
    }

    private void answer(boolean yes) {
        if (web != null) web.evaluateJavascript("window.Lights && Lights.answer(" + yes + ")", null);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (code == ASK_MIC) answer(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
        if (code == ASK_CAMERA) cameraAnswer(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
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
            case KeyEvent.KEYCODE_ESCAPE:
            case KeyEvent.KEYCODE_BUTTON_B: js = 4; break;
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
        // Let go of the TV's sound while someone is off changing the song in Spotify; back on when they return.
        tvWasOn = tvSound.on();
        tvSound.stop();
        roomWasOn = roomSound.on();
        roomSound.stop();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (tvWasOn) tvSound.start();
        tvWasOn = false;
        if (roomWasOn) roomSound.start(this);
        roomWasOn = false;
    }

    @Override protected void onDestroy() {
        if (sky == this) sky = null;
        tvSound.stop();
        roomSound.stop();
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
