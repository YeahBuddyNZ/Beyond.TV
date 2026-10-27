package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.net.URL;

/**
 * The family's own music on the TV (ADR 0027): Beyond Music's own TV screens (albums, radio, the player, all driven by
 * the remote), full screen in a WebView.
 *
 * The app keeps cleartext off, so the WebView never asks the home network over plain http itself. It asks a small
 * relay on 127.0.0.1 (the only address the network rules let it reach without https), which passes each request to
 * the music server over its own socket, checked to be on the home network like LocalHttp. The relay lives only while
 * this screen is open and only ever talks to that one server.
 */
public class MusicActivity extends Activity {
    private WebView web;
    private MusicRelay relay;

    static void open(Activity a) {
        if (Music.base() == null) {
            Toast.makeText(a, Ui.tr("A sua música não está respondendo agora. O computador onde ela fica está ligado?",
                    "Your music isn't answering right now. Is the computer it's on switched on?", "Tu música no responde ahora. ¿Está encendido el ordenador donde está?"), Toast.LENGTH_LONG).show();
            return;
        }
        a.startActivity(new Intent(a, MusicActivity.class));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        String base = Music.base();
        try {
            if (base == null) throw new Exception("not found");
            relay = new MusicRelay(new URL(base));
            relay.start();
            web = new WebView(this);
        } catch (Throwable t) {
            if (relay != null) relay.close();
            Toast.makeText(this, Ui.tr("Não deu para abrir a sua música.", "Couldn't open your music.", "No se pudo abrir tu música."),
                    Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        web.setBackgroundColor(Color.BLACK);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        // "BeyondTV" turns on Beyond Music's remote control mode (arrows, OK, Back).
        ws.setUserAgentString(ws.getUserAgentString() + " BeyondTV");
        web.setWebViewClient(new WebViewClient());
        setContentView(web);
        web.loadUrl("http://127.0.0.1:" + relay.port() + "/?tv");
        web.requestFocus();
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
        if (relay != null) relay.close();
        super.onDestroy();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (web != null && (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE)) {
            if (e.getAction() != KeyEvent.ACTION_UP) return true;
            // Beyond Music closes what is open (a menu, an album) first; at its first screen, Back comes home.
            web.evaluateJavascript("window.beyondBack ? beyondBack() : false", r -> {
                if (!"true".equals(r)) {
                    if (web != null && web.canGoBack()) web.goBack();
                    else finish();
                }
            });
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
