package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * NZ election results, live (ADR 0039): Beyond's results page for TVs (gobeyond.nz/election/live/tv) full screen in a
 * WebView. The page is dark, has no site header and updates itself as new numbers land, so this only shows it; Back
 * comes home. The screen stays on while it is open, so the screensaver doesn't cover the count.
 *
 * The home screen's button shows on TVs set to New Zealand time, until the official results on 27/11/2026, then goes
 * by itself. Same as web/home.js (electionOn): change one, change both.
 */
public class ElectionActivity extends Activity {
    static final String URL = "https://www.gobeyond.nz/election/live/tv";

    static void open(Context c) {
        c.startActivity(new Intent(c, ElectionActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    /** The button shows on New Zealand TVs up to the end of 27/11/2026, New Zealand time. */
    static boolean showing() {
        String zone = TimeZone.getDefault().getID();
        if (!"Pacific/Auckland".equals(zone) && !"Pacific/Chatham".equals(zone) && !"NZ".equals(zone)) return false;
        Calendar end = Calendar.getInstance(TimeZone.getTimeZone("Pacific/Auckland"));
        end.clear();
        end.set(2026, Calendar.NOVEMBER, 28, 0, 0, 0);
        return System.currentTimeMillis() < end.getTimeInMillis();
    }

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        try {
            web = new WebView(this);
        } catch (Throwable t) {
            // No WebView on this TV (it's switched off or missing): nothing to show the page in.
            Toast.makeText(this, Ui.tr("Os resultados precisam do Android System WebView.", "The election results need Android System WebView.",
                    "Los resultados necesitan Android System WebView."), Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        web.setBackgroundColor(0xFF0B0B0F);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        // The page is laid out for a 1920 x 1080 screen: without these the WebView lays it out at the screen's width
        // in dp (960 on a 1080p TV), and everything comes out twice the size.
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            /** Links stay in here: nothing on the page should open the TV's browser. */
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request == null || !request.isForMainFrame()) return;
                Toast.makeText(ElectionActivity.this, Ui.tr("Sem internet agora. Tente de novo daqui a pouco.",
                        "Can't reach the results just now. Check the internet and try again.",
                        "No se pueden cargar los resultados ahora. Revisa internet y vuelve a intentarlo."), Toast.LENGTH_LONG).show();
            }
        });
        web.setFocusable(false);
        setContentView(web);
        web.loadUrl(URL);
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
