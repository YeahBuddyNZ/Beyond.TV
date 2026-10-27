package nz.gobeyond.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Your home: the rooms, Moments and the one remote from the family's Beyond Home box (the Beyond Home app on their
 * Home Assistant box), which answers TVs on port 8098 of the home network. Same as web/homehub.js.
 *
 * Finding it: the address found last, then Home Assistant's own announcement on the network (_home-assistant._tcp),
 * then the names it uses (homeassistant.local, homeassistant). Nothing found, nothing shows.
 * Pairing: the box gives this TV a secret (kept here, never shown) and a code that somebody types in the Beyond Home
 * app (Settings, TVs). The TV only ever asks for named things in a room; the box works out the rest and checks it.
 * Plain http over LocalHttp's own socket, home network only. In the :home process; main thread for everything but IO.
 */
final class HomeHub {
    private HomeHub() {}

    private static final int PORT = 8098;
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    /** Runs on the main thread when something changed: found, paired, the rooms. Set by the home screen. */
    static Runnable onChange;

    private static SharedPreferences prefs;
    private static String base, id, secret, code;
    private static boolean found, looking;
    private static JSONArray rooms;
    private static long lastLook;
    private static boolean fast;

    private static void load(Context c) {
        if (prefs != null) return;
        prefs = c.getApplicationContext().getSharedPreferences("homehub", Context.MODE_PRIVATE);
        base = prefs.getString("base", null);
        id = prefs.getString("id", null);
        secret = prefs.getString("secret", null);
        code = prefs.getString("code", "");
    }

    private static void save() {
        prefs.edit().putString("base", base).putString("id", id).putString("secret", secret).putString("code", code).apply();
    }

    private static void tell() {
        if (onChange != null) onChange.run();
    }

    /** "none" (no box on this network), "found" (not paired), "waiting" (code on screen), "paired". */
    static String status() {
        return !found ? "none" : rooms != null ? "paired" : id != null ? "waiting" : "found";
    }

    static String code() { return code == null ? "" : code; }

    /** The box's address on the home network ("192.168.1.20") once found, else null: Music looks there too. */
    static String host() {
        if (!found || base == null) return null;
        try {
            return new java.net.URL(base).getHost();
        } catch (Exception e) {
            return null;
        }
    }

    static JSONArray rooms() { return rooms == null ? new JSONArray() : rooms; }

    static JSONObject room(String roomId) {
        for (int i = 0; rooms != null && i < rooms.length(); i++) {
            JSONObject r = rooms.optJSONObject(i);
            if (r != null && roomId.equals(r.optString("id"))) return r;
        }
        return null;
    }

    // MARK: - Finding the box

    /** Starts looking (at most every ten minutes while nothing answers), then keeps the rooms fresh. */
    static void start(Context c) {
        load(c);
        if (found) { refresh(); return; }
        if (looking || (lastLook != 0 && System.currentTimeMillis() - lastLook < 10 * 60_000L)) return;
        looking = true;
        lastLook = System.currentTimeMillis();
        final List<String> tries = new ArrayList<>();
        if (base != null) tries.add(base);
        announced(c, host -> IO.execute(() -> {
            if (host != null) tries.add(tries.isEmpty() ? 0 : 1, "http://" + host + ":" + PORT);
            tries.add("http://homeassistant.local:" + PORT);
            tries.add("http://homeassistant:" + PORT);
            String hit = null;
            for (String t : tries) {
                String b = resolved(t);
                if (b != null && hello(b)) { hit = b; break; }
            }
            final String got = hit;
            MAIN.post(() -> {
                looking = false;
                if (got == null) { found = false; tell(); return; }
                if (!got.equals(base)) { base = got; id = secret = null; code = ""; save(); }
                found = true;
                if (id != null) refresh(); else tell();
            });
        }));
    }

    interface Host { void got(String host); }

    /** Home Assistant's own announcement on the network, for up to three seconds; null when nothing says so. */
    private static void announced(Context c, final Host done) {
        final NsdManager nsd = (NsdManager) c.getApplicationContext().getSystemService(Context.NSD_SERVICE);
        if (nsd == null) { done.got(null); return; }
        final boolean[] over = {false};
        final NsdManager.DiscoveryListener[] holder = new NsdManager.DiscoveryListener[1];
        final Runnable finish = () -> {
            if (over[0]) return;
            over[0] = true;
            try { nsd.stopServiceDiscovery(holder[0]); } catch (Exception ignored) {}
        };
        holder[0] = new NsdManager.DiscoveryListener() {
            @Override public void onStartDiscoveryFailed(String t, int e) { if (!over[0]) { over[0] = true; done.got(null); } }
            @Override public void onStopDiscoveryFailed(String t, int e) {}
            @Override public void onDiscoveryStarted(String t) {}
            @Override public void onDiscoveryStopped(String t) {}
            @Override public void onServiceLost(NsdServiceInfo s) {}
            @Override public void onServiceFound(NsdServiceInfo s) {
                if (over[0]) return;
                MAIN.post(finish);
                try {
                    nsd.resolveService(s, new NsdManager.ResolveListener() {
                        @Override public void onResolveFailed(NsdServiceInfo i, int e) { done.got(null); }
                        @Override public void onServiceResolved(NsdServiceInfo i) {
                            InetAddress a = i.getHost();
                            done.got(a != null && LocalHttp.home(a) ? a.getHostAddress() : null);
                        }
                    });
                } catch (Exception e) {
                    done.got(null);
                }
            }
        };
        try {
            nsd.discoverServices("_home-assistant._tcp", NsdManager.PROTOCOL_DNS_SD, holder[0]);
        } catch (Exception e) {
            over[0] = true;
            done.got(null);
            return;
        }
        MAIN.postDelayed(() -> { if (!over[0]) { finish.run(); done.got(null); } }, 3000);
    }

    /** A name turned into its address on the home network ("http://192.168.1.20:8098"), or null. */
    private static String resolved(String address) {
        try {
            java.net.URL u = new java.net.URL(address);
            InetAddress a = InetAddress.getByName(u.getHost());
            return LocalHttp.home(a) ? "http://" + a.getHostAddress() + ":" + PORT : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean hello(String b) {
        try {
            LocalHttp.Answer a = LocalHttp.request("GET", b + "/tv/hi", null, null, 3000);
            return a.status == 200 && "home".equals(new JSONObject(a.text()).optString("beyond"));
        } catch (Exception e) {
            return false;
        }
    }

    // MARK: - The rooms

    private static String auth() {
        return id != null && secret != null ? "Bearer " + id + "." + secret : null;
    }

    /** Asks for the rooms (or, while waiting, whether the code was typed yet). */
    static void refresh() {
        if (!found || id == null) return;
        final String b = base, a = auth();
        IO.execute(() -> {
            int status;
            JSONObject json = null;
            try {
                LocalHttp.Answer ans = LocalHttp.request("GET", b + "/tv/snapshot", a, null, 6000);
                status = ans.status;
                if (status == 200 || status == 202) json = new JSONObject(ans.text());
            } catch (Exception e) {
                status = 0;
            }
            final int st = status;
            final JSONObject j = json;
            MAIN.post(() -> {
                if (!b.equals(base)) return;
                if (st == 401) { forget(); return; }
                if (st == 0 || j == null) { found = false; rooms = null; lastLook = 0; tell(); return; }
                if (st == 202) { code = j.optString("code"); rooms = null; save(); tell(); return; }
                if (!code.isEmpty()) { code = ""; save(); }
                rooms = j.optJSONArray("rooms");
                if (rooms == null) rooms = new JSONArray();
                tell();
            });
        });
    }

    /** Taken off in the app: back to a TV that only knows where the box is. */
    private static void forget() {
        id = secret = null;
        code = "";
        rooms = null;
        save();
        tell();
    }

    interface Done { void done(boolean ok, String why); }

    /** Says hello to the box; the code to type in the app comes back in code(). */
    static void pair(final Done done) {
        if (!found) { done.done(false, null); return; }
        final String b = base, name = android.os.Build.MANUFACTURER == null ? "TV"
                : capital(android.os.Build.MANUFACTURER) + " TV";
        IO.execute(() -> {
            JSONObject j = null;
            try {
                LocalHttp.Answer ans = LocalHttp.request("POST", b + "/tv/hello", null, new JSONObject().put("name", name).toString(), 6000);
                if (ans.status == 200) j = new JSONObject(ans.text());
            } catch (Exception ignored) {
                // Off, or not answering: say so.
            }
            final JSONObject got = j;
            MAIN.post(() -> {
                if (got == null || got.optString("id").isEmpty()) { done.done(false, null); return; }
                id = got.optString("id");
                secret = got.optString("secret");
                code = got.optString("code");
                save();
                done.done(true, null);
                tell();
            });
        });
    }

    private static String capital(String s) {
        return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(java.util.Locale.ROOT) + s.substring(1);
    }

    /** One named thing in a room: {room, do, moment?, thing?}. */
    static void act(final JSONObject ask, final Done done) {
        if (rooms == null) { done.done(false, null); return; }
        final String b = base, a = auth();
        IO.execute(() -> {
            int status;
            String why = null;
            try {
                LocalHttp.Answer ans = LocalHttp.request("POST", b + "/tv/act", a, ask.toString(), 8000);
                status = ans.status;
                if (status != 200) why = new JSONObject(ans.text()).optString("error", null);
            } catch (Exception e) {
                status = 0;
            }
            final int st = status;
            final String w = why;
            MAIN.post(() -> {
                if (st == 401) { forget(); done.done(false, null); return; }
                done.done(st == 200, w);
                if (st == 200) MAIN.postDelayed(HomeHub::refresh, 700);
            });
        });
    }

    // MARK: - Pace

    private static final Runnable tick = new Runnable() {
        @Override public void run() {
            refresh();
            MAIN.postDelayed(this, fast ? 4000 : 60_000);
        }
    };

    /** Every few seconds while somebody looks at the rooms, every minute otherwise; stop() when nobody does. */
    static void pace(boolean quick) {
        fast = quick;
        MAIN.removeCallbacks(tick);
        MAIN.postDelayed(tick, quick ? 4000 : 60_000);
    }

    static void stop() {
        MAIN.removeCallbacks(tick);
    }
}
