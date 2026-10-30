package nz.gobeyond.tv;

import android.content.Context;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Once a day the TV tells Beyond it is out there and how it is getting on, so a problem on one make of TV can be fixed
 * for everybody before anybody has to ask. It sends a made-up id, the city (to about 10km), the make and model, the
 * versions, which home screen is on, how often it opened and crashed, and its own last errors. Never what anybody
 * watches, never an address, never a name. Home Settings > Help fix problems turns it off and asks Beyond to forget
 * this TV. Files in files/checkin/ (shared by the processes, so no SharedPreferences).
 */
final class Checkin {
    private Checkin() {}

    static final String URL_BASE = "https://beyondfamily.app/api/tv/checkin";
    private static final String FEEDBACK = "https://beyondfamily.app/api/tv/feedback",
            MESSAGES = "https://beyondfamily.app/api/tv/messages", LOG = URL_BASE + "/log";
    private static final long DAY = 24L * 60 * 60 * 1000, HOUR = 60L * 60 * 1000;
    private static final int KEEP = 20, LOG_LINES = 300;
    private static final Object LOCK = new Object();

    private static File dir(Context c) {
        File d = new File(c.getFilesDir(), "checkin");
        //noinspection ResultOfMethodCallIgnored
        d.mkdirs();
        return d;
    }

    private static File file(Context c, String name) { return new File(dir(c), name); }

    static boolean on(Context c) { return !new File(c.getFilesDir(), "checkin-off").exists(); }

    /** Off forgets: the TV's row at Beyond is deleted and this TV's id, counts and errors go too. */
    static void setOn(Context c, boolean on) {
        final Context app = c.getApplicationContext();
        File off = new File(app.getFilesDir(), "checkin-off");
        if (on) {
            //noinspection ResultOfMethodCallIgnored
            off.delete();
            maybeSend(app);
            return;
        }
        try { new FileOutputStream(off).close(); } catch (IOException ignored) {}
        final String id = read(file(app, "id")).trim();
        synchronized (LOCK) {
            File[] files = dir(app).listFiles();
            if (files != null) for (File f : files) //noinspection ResultOfMethodCallIgnored
                f.delete();
        }
        if (id.isEmpty()) return;
        new Thread(() -> {
            try {
                post(URL_BASE + "/forget", new JSONObject().put("id", id).toString());
            } catch (Throwable t) {
                AppLog.w("checkin: forget failed: " + t);
            }
        }, "beyond-tv-forget").start();
    }

    /** Something went wrong that we would want to know about. Cheap, any process, any thread. */
    static void error(Context c, String where, String text) {
        if (c == null || !on(c)) return;
        String line = System.currentTimeMillis() + "\t" + clean(where, 40) + "\t" + clean(text, 300) + "\n";
        synchronized (LOCK) {
            File f = file(c, "errors.txt");
            try (FileOutputStream out = new FileOutputStream(f, true)) {
                out.write(line.getBytes(StandardCharsets.UTF_8));
            } catch (IOException ignored) {
                return;
            }
            if (f.length() > 16 * 1024) write(f, String.join("", last(lines(f), KEEP)));
        }
    }

    static void crashed(Context c, Throwable t) {
        if (!on(c)) return;
        bump(c, "crashes");
        StackTraceElement ours = null;
        for (StackTraceElement e : t.getStackTrace()) {
            if (e.getClassName().startsWith("nz.gobeyond.tv")) { ours = e; break; }
        }
        error(c, "crash", t + (ours == null ? "" : " at " + ours.getClassName().replace("nz.gobeyond.tv.", "")
                + "." + ours.getMethodName() + ":" + ours.getLineNumber()));
    }

    /** The home screen came up. */
    static void opened(Context c) {
        if (on(c)) bump(c, "opens");
    }

    /** From the home screen or settings: sends when a day has passed, or an hour after something went wrong. */
    static void maybeSend(Context c) {
        final Context app = c.getApplicationContext();
        if (!on(app)) return;
        long now = System.currentTimeMillis(), since = now - file(app, "sent").lastModified();
        boolean errors = file(app, "errors.txt").length() > 0;
        final boolean checkin = since >= DAY || (errors && since > HOUR);
        // The log goes more often than the check-in, so Beyond can read a TV's day while it is still that day.
        final boolean log = now - file(app, "log-sent").lastModified() >= 3 * HOUR && AppLog.file(app).length() > 0;
        if (!checkin && !log) return;
        new Thread(() -> {
            try {
                if (checkin) sendNow(app);
            } catch (Throwable t) {
                AppLog.w("checkin: " + t);
            }
            sendLog(app, checkin ? "checkin" : "every few hours");
        }, "beyond-tv-checkin").start();
    }

    private static void sendNow(Context c) throws Exception {
        File sent = file(c, "sent");
        touch(sent);   // one try a day even when Beyond can't be reached
        String opens, crashes;
        List<String> errors;
        synchronized (LOCK) {
            opens = read(file(c, "opens")).trim();
            crashes = read(file(c, "crashes")).trim();
            errors = last(lines(file(c, "errors.txt")), KEEP);
        }
        JSONObject body = new JSONObject()
                .put("id", id(c))
                .put("platform", "android")
                .put("brand", cut(Build.BRAND, 40))
                .put("model", cut(Build.MODEL, 60))
                .put("version", cut(c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName, 30))
                .put("os", cut(Build.VERSION.RELEASE, 20))
                .put("opens", Math.min(10_000, number(opens)))
                .put("crashes", Math.min(10_000, number(crashes)));
        String city = Prefs.city();
        if (!city.isEmpty()) body.put("city", cut(city, 60));
        String region = Config.TMDB_REGION.trim();
        if (region.length() == 2) body.put("country", region.toUpperCase(java.util.Locale.ROOT));
        Double lat = roughly(Prefs.latitude()), lng = roughly(Prefs.longitude());
        if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) body.put("lat", lat).put("lng", lng);
        JSONObject state = HomeMode.state(c);
        String mode = state.optString("mode", "");
        if (HomeMode.FREE.equals(mode) || HomeMode.ORIGINAL.equals(mode)) body.put("mode", mode);
        body.put("homeReverted", state.optBoolean("homeReverted"));
        JSONArray list = new JSONArray();
        for (String line : errors) {
            String[] p = line.trim().split("\t", 3);
            if (p.length < 3) continue;
            long at = number(p[0]);
            if (at > 0) list.put(new JSONObject().put("at", at).put("where", p[1]).put("text", p[2]));
        }
        body.put("errors", list);

        post(URL_BASE, body.toString());
        // Counted and told: start again, minus anything that came in while we were sending.
        synchronized (LOCK) {
            subtract(file(c, "opens"), number(opens));
            subtract(file(c, "crashes"), number(crashes));
            List<String> now = lines(file(c, "errors.txt"));
            now.removeAll(errors);
            write(file(c, "errors.txt"), String.join("", now));
        }
        AppLog.w("checkin: sent");
    }

    // MARK: - The log

    /**
     * The TV's own log (AppLog), the last few hundred lines, so Beyond can see what went wrong without a cable. Only
     * the app's own lines: never which app was opened (AppLog.here keeps those on the TV), and addresses, links'
     * queries and anything shaped like a key are taken out here as well. Blocking: call it off the UI thread.
     */
    static void sendLog(Context c, String reason) {
        if (!on(c)) return;
        try {
            touch(file(c, "log-sent"));
            List<String> lines;
            synchronized (AppLog.class) {
                lines = last(lines(AppLog.file(c)), LOG_LINES);
            }
            if (lines.isEmpty()) return;
            JSONArray list = new JSONArray();
            for (String line : lines) {
                String[] p = line.trim().split("\t", 3);
                if (p.length < 3) continue;
                long at = number(p[0]);
                if (at > 0) list.put(new JSONObject().put("at", at).put("process", cut(p[1], 12)).put("text", scrub(p[2])));
            }
            JSONObject body = new JSONObject()
                    .put("id", id(c))
                    .put("reason", cut(reason, 30))
                    .put("version", cut(c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName, 30))
                    .put("lines", list);
            post(LOG, body.toString());
        } catch (Throwable t) {
            android.util.Log.i("BeyondTV", "log: " + t);   // not AppLog.w: a failed send must not grow the log it sends
        }
    }

    /** Keeps the newest half of the log file, from a line's start. Called under AppLog's lock. */
    static void trimLog(File f, int keep) {
        String all = read(f);
        if (all.length() <= keep) return;
        String tail = all.substring(all.length() - keep);
        int nl = tail.indexOf('\n');
        write(f, nl < 0 ? "" : tail.substring(nl + 1));
    }

    private static final java.util.regex.Pattern ADDRESS =
            java.util.regex.Pattern.compile("\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d+)?\\b"),
            QUERY = java.util.regex.Pattern.compile("(https?://[^\\s?#]+)[?#]\\S*"),
            SECRET = java.util.regex.Pattern.compile("[A-Za-z0-9_\\-]{32,}");

    static String scrub(String text) {
        String s = ADDRESS.matcher(text).replaceAll("(address)");
        s = QUERY.matcher(s).replaceAll("$1?…");
        s = SECRET.matcher(s).replaceAll("(hidden)");
        return cut(s, 300);
    }

    // MARK: - Talk to Beyond

    /**
     * A line from the feedback button, against this TV's made-up id, so Beyond can answer this TV. Sent because
     * somebody pressed Send, so it goes even with the daily check-in off. Blocking: call it off the UI thread.
     */
    static boolean feedback(Context c, String text) {
        try {
            JSONObject body = new JSONObject()
                    .put("id", id(c))
                    .put("text", cut(text, 1000))
                    .put("platform", "android")
                    .put("brand", cut(Build.BRAND, 40))
                    .put("model", cut(Build.MODEL, 60))
                    .put("version", cut(c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName, 30));
            String city = Prefs.city();
            if (!city.isEmpty()) body.put("city", cut(city, 60));
            post(FEEDBACK, body.toString());
            touch(file(c, "talked"));
            if (on(c)) sendLog(c, "feedback");   // what the TV was doing when somebody spoke up
            return true;
        } catch (Throwable t) {
            AppLog.w("feedback: " + t);
            return false;
        }
    }

    interface Replies {
        void heard(List<String> lines);
    }

    /**
     * Beyond's answers to this TV's feedback, each handed over once. Only TVs that have said something ask, at most
     * every 10 minutes and for two weeks after, so nobody else's TV ever polls. `then` runs on a background thread.
     */
    static void maybeHear(Context c, final Replies then) {
        final Context app = c.getApplicationContext();
        File talked = file(app, "talked");
        if (!talked.exists() || System.currentTimeMillis() - talked.lastModified() > 14 * DAY) return;
        File heard = file(app, "heard");
        if (System.currentTimeMillis() - heard.lastModified() < 10 * 60_000L) return;
        new Thread(() -> {
            try {
                touch(heard);
                String json = get(MESSAGES + "?id=" + id(app));
                JSONArray list = new JSONObject(json).optJSONArray("messages");
                List<String> out = new ArrayList<>();
                for (int i = 0; list != null && i < list.length(); i++) {
                    String t = list.optJSONObject(i) == null ? "" : list.optJSONObject(i).optString("text").trim();
                    if (!t.isEmpty()) out.add(t);
                }
                if (!out.isEmpty()) then.heard(out);
            } catch (Throwable t) {
                AppLog.w("feedback replies: " + t);
            }
        }, "beyond-tv-replies").start();
    }

    private static String get(String url) throws IOException {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        try {
            h.setConnectTimeout(10_000);
            h.setReadTimeout(20_000);
            h.setRequestProperty("User-Agent", "BeyondTV");
            int code = h.getResponseCode();
            if (code / 100 != 2) throw new IOException("HTTP " + code);
            try (InputStream in = h.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int n;
                while ((n = in.read(buffer)) > 0 && out.size() < 64 * 1024) out.write(buffer, 0, n);
                return out.toString(StandardCharsets.UTF_8.name());
            }
        } finally {
            h.disconnect();
        }
    }

    // MARK: - Helpers

    private static String id(Context c) {
        File f = file(c, "id");
        String id = read(f).trim();
        if (id.isEmpty()) {
            id = UUID.randomUUID().toString();
            write(f, id);
        }
        return id;
    }

    /** To 0.1 degree, about 10km: the town, never the street. */
    private static Double roughly(String degrees) {
        try {
            return Math.round(Double.parseDouble(degrees.trim()) * 10) / 10.0;
        } catch (Exception e) {
            return null;
        }
    }

    private static void post(String url, String json) throws IOException {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        try {
            h.setConnectTimeout(10_000);
            h.setReadTimeout(20_000);
            h.setRequestMethod("POST");
            h.setDoOutput(true);
            h.setRequestProperty("Content-Type", "application/json");
            h.setRequestProperty("User-Agent", "BeyondTV");
            try (OutputStream out = h.getOutputStream()) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
            }
            int code = h.getResponseCode();
            if (code / 100 != 2) throw new IOException("HTTP " + code);
        } finally {
            h.disconnect();
        }
    }

    private static void bump(Context c, String name) {
        synchronized (LOCK) {
            File f = file(c, name);
            write(f, Long.toString(number(read(f).trim()) + 1));
        }
    }

    private static void subtract(File f, long n) {
        write(f, Long.toString(Math.max(0, number(read(f).trim()) - n)));
    }

    private static long number(String s) {
        try { return Long.parseLong(s); } catch (NumberFormatException e) { return 0; }
    }

    private static String clean(String s, int max) {
        return cut(s == null ? "" : s.replace('\t', ' ').replace('\n', ' ').replace('\r', ' '), max);
    }

    private static String cut(String s, int max) {
        if (s == null) return "";
        s = s.trim();
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static List<String> lines(File f) {
        List<String> out = new ArrayList<>();
        for (String line : read(f).split("\n")) if (!line.trim().isEmpty()) out.add(line + "\n");
        return out;
    }

    private static List<String> last(List<String> list, int n) {
        return new ArrayList<>(list.subList(Math.max(0, list.size() - n), list.size()));
    }

    private static String read(File f) {
        if (!f.isFile()) return "";
        try (InputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) > 0 && out.size() < 64 * 1024) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            return "";
        }
    }

    private static void write(File f, String text) {
        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
        } catch (IOException ignored) {
        }
    }

    private static void touch(File f) throws IOException {
        if (!f.exists()) new FileOutputStream(f).close();
        //noinspection ResultOfMethodCallIgnored
        f.setLastModified(System.currentTimeMillis());
    }
}
