package nz.gobeyond.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The family's own music: the Beyond Music server (YeahBuddyNZ/Beyond-Music) on a Mac, a Raspberry Pi or the Beyond
 * Home box, which answers GET /api/hello on port 8097 with {app: "beyond-music"}. Found, a Music button shows on the
 * home screen and opens it in MusicActivity. Nothing found, nothing shows. Same as web/music.js (ADR 0027).
 *
 * Finding it: the address found last, then beyond-music.local (asked on the network ourselves, because Android doesn't
 * always answer .local names), then the Beyond Home box's own address. Plain http over LocalHttp's own socket, home
 * network only. In the :home process; main thread for everything but IO.
 */
final class Music {
    private Music() {}

    static final int PORT = 8097;
    static final String NAME = "beyond-music.local";
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    /** Runs on the main thread when the music is found or lost. Set by the home screen. */
    static Runnable onChange;

    private static SharedPreferences prefs;
    private static String base;
    private static boolean found, looking, told;
    private static long lastLook;

    /** The music server's address ("http://192.168.1.20:8097") while it answers, else null. */
    static String base() { return found ? base : null; }

    static boolean found() { return found; }

    /** Looks for it: at once the first time, then at most every five minutes (a Mac switched on later is found). */
    static void start(Context c) {
        if (prefs == null) {
            prefs = c.getApplicationContext().getSharedPreferences("music", Context.MODE_PRIVATE);
            base = prefs.getString("base", null);
            told = prefs.getBoolean("told", false);
        }
        if (looking || (lastLook != 0 && System.currentTimeMillis() - lastLook < 5 * 60_000L)) return;
        looking = true;
        lastLook = System.currentTimeMillis();
        final String last = base, box = HomeHub.host();
        IO.execute(() -> {
            List<String> tries = new ArrayList<>();
            if (last != null) tries.add(last);
            String asked = Mdns.ask(NAME, 2000);
            if (asked != null) tries.add("http://" + asked + ":" + PORT);
            if (box != null) tries.add("http://" + box + ":" + PORT);
            String hit = null;
            for (String t : tries) if (hello(t)) { hit = t; break; }
            final String got = hit;
            MAIN.post(() -> {
                looking = false;
                boolean was = found;
                found = got != null;
                if (found && !got.equals(base)) { base = got; prefs.edit().putString("base", base).apply(); }
                if (was != found && onChange != null) onChange.run();
            });
        });
    }

    /** True once: the first time this TV finds the music, so the home screen can say so. */
    static boolean firstTime() {
        if (!found || told) return false;
        told = true;
        prefs.edit().putBoolean("told", true).apply();
        return true;
    }

    private static boolean hello(String b) {
        try {
            LocalHttp.Answer a = LocalHttp.request("GET", b + "/api/hello", null, null, 3000);
            return a.status == 200 && "beyond-music".equals(new JSONObject(a.text()).optString("app"));
        } catch (Exception e) {
            return false;
        }
    }
}
