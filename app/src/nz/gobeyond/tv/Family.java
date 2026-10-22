package nz.gobeyond.tv;

import android.app.Instrumentation;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.view.KeyEvent;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
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
import java.util.Locale;

/**
 * Beyond Family on the TV: link this TV to the household, and do what the family app asks. The same as the LG and
 * Samsung app's web/family.js, and the same server (beyondfamily.app, /api/tv/*).
 *
 * Linking: the TV says hello and gets back its own secret (kept here, never shown) and a six-letter code (shown big by
 * LinkActivity). A grown-up types the code into Beyond Family › TVs on their phone, and the TV is the household's.
 * From then on the household's people are the TV's people (first names, colours and whether they are a kid, nothing
 * else), and FamilyService waits for things to do: a remote press, an app to open, someone to switch to, or a message
 * for the screen. Unpaired in the app, it hears within 20 seconds and forgets.
 *
 * Remote presses go in through the TV's own ADB (the same key Beyond TV mode uses, never asking from here), so they
 * work inside Netflix too. Without that key they only reach Beyond TV's own screens.
 *
 * Kept in files/family.json, because the boot receiver (main process) asks whether the TV is linked and the rest
 * lives in :home. Commands run on the :home main thread unless they touch ADB.
 */
final class Family {
    private Family() {}

    static final String API = "https://beyondfamily.app/api";
    private static final Object LOCK = new Object();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    /** An answer from Beyond Family that wasn't a yes. Status 0: it couldn't be reached at all. */
    static final class Fail extends IOException {
        final int status;

        Fail(int status, String message) {
            super(message == null ? "HTTP " + status : message);
            this.status = status;
        }
    }

    // MARK: - What this TV knows

    private static File file(Context c) { return new File(c.getFilesDir(), "family.json"); }

    static JSONObject state(Context c) {
        synchronized (LOCK) {
            try (InputStream in = new FileInputStream(file(c))) {
                return new JSONObject(new String(readAll(in), StandardCharsets.UTF_8));
            } catch (Exception e) {
                return new JSONObject();
            }
        }
    }

    private static void save(Context c, JSONObject s) {
        synchronized (LOCK) {
            File f = file(c), tmp = new File(f.getPath() + ".tmp");
            try (OutputStream out = new FileOutputStream(tmp)) {
                out.write(s.toString().getBytes(StandardCharsets.UTF_8));
            } catch (IOException e) {
                return;
            }
            //noinspection ResultOfMethodCallIgnored
            tmp.renameTo(f);
        }
    }

    /** Has an id, a secret and a household: the server said yes. */
    static boolean linked(Context c) {
        JSONObject s = state(c);
        return !s.optString("id").isEmpty() && s.optJSONObject("home") != null;
    }

    /** Linked, or somebody from Beyond Family is signed in here as a visitor: either way the TV keeps listening. */
    static boolean listening(Context c) {
        JSONObject s = state(c);
        return !s.optString("id").isEmpty() && (s.optJSONObject("home") != null || s.optBoolean("visiting"));
    }

    static String homeName(Context c) {
        JSONObject home = state(c).optJSONObject("home");
        return home == null ? "" : home.optString("name", "Beyond Family");
    }

    /** Back to a TV that knows nobody. The people from Beyond Family stay as plain people on the TV. */
    static void forget(Context c) {
        synchronized (LOCK) {
            //noinspection ResultOfMethodCallIgnored
            file(c).delete();
        }
        lastPeople = "";
    }

    // MARK: - Talking to Beyond Family

    static JSONObject call(Context c, String method, String path, JSONObject body, int timeoutMs) throws IOException {
        return call(state(c), method, path, body, timeoutMs);
    }

    /** As this TV, with the id and secret in `s`. */
    private static JSONObject call(JSONObject s, String method, String path, JSONObject body, int timeoutMs) throws IOException {
        HttpURLConnection http = (HttpURLConnection) new URL(API + path).openConnection();
        try {
            http.setRequestMethod(method);
            http.setConnectTimeout(10_000);
            http.setReadTimeout(timeoutMs);
            http.setRequestProperty("Accept", "application/json");
            if (!s.optString("id").isEmpty()) {
                http.setRequestProperty("Authorization", "Bearer " + s.optString("id") + "." + s.optString("secret"));
            }
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                http.setDoOutput(true);
                http.setRequestProperty("Content-Type", "application/json");
                http.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = http.getOutputStream()) {
                    out.write(bytes);
                }
            }
            int status;
            try {
                status = http.getResponseCode();
            } catch (IOException e) {
                throw new Fail(0, String.valueOf(e));
            }
            InputStream in = status >= 400 ? http.getErrorStream() : http.getInputStream();
            String text = in == null ? "" : new String(readAll(in), StandardCharsets.UTF_8);
            JSONObject json;
            try {
                json = text.isEmpty() ? new JSONObject() : new JSONObject(text);
            } catch (Exception e) {
                json = new JSONObject();
            }
            if (status < 200 || status >= 300) throw new Fail(status, json.optString("error", null));
            return json;
        } catch (Fail f) {
            throw f;
        } catch (IOException e) {
            throw new Fail(0, String.valueOf(e));
        } finally {
            http.disconnect();
        }
    }

    /**
     * A code to show: a new TV says hello (and keeps its secret), one that already has an id asks for a fresh code. A
     * TV Beyond Family no longer knows starts over. Answers {paired: true} when it was linked meanwhile.
     */
    static JSONObject code(Context c) throws IOException {
        JSONObject s = state(c);
        if (s.optString("id").isEmpty()) {
            try {
                JSONObject res = call(c, "POST", "/tv/hello", new JSONObject().put("name", tvName()), 15_000);
                save(c, new JSONObject().put("id", res.getString("id")).put("secret", res.getString("secret")));
                return res;
            } catch (JSONException e) {
                throw new Fail(0, "an answer without an id: " + e);
            }
        }
        try {
            return call(c, "POST", "/tv/code", new JSONObject(), 15_000);
        } catch (Fail f) {
            if (f.status != 401) throw f;
            forget(c);
            return code(c);
        }
    }

    /** One look, without waiting: linked yet? Applies the household when it is. */
    static JSONObject check(Context c) throws IOException {
        JSONObject res = call(c, "GET", "/tv/sync?wait=0", null, 15_000);
        apply(c, res.optBoolean("paired") ? res.optJSONObject("home") : null, res.optJSONArray("visitors"));
        return res;
    }

    // MARK: - Your face on any TV

    /**
     * A code for somebody to sign in here from their own Beyond Family (TVs › On somebody else's TV). Any TV may show
     * one, linked or not; a TV with no id says hello first.
     */
    static JSONObject visitCode(Context c) throws IOException {
        if (state(c).optString("id").isEmpty()) {
            try {
                JSONObject res = call(c, "POST", "/tv/hello", new JSONObject().put("name", tvName()), 15_000);
                save(c, new JSONObject().put("id", res.getString("id")).put("secret", res.getString("secret")));
            } catch (JSONException e) {
                throw new Fail(0, "an answer without an id: " + e);
            }
        }
        try {
            return call(c, "POST", "/tv/visit/code", new JSONObject(), 15_000);
        } catch (Fail f) {
            if (f.status != 401) throw f;
            forget(c);
            return visitCode(c);
        }
    }

    /** Signs a visitor out of this TV, on a thread. They're gone from the TV's people already. */
    static void signOut(Context c, String member) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try {
                call(app, "POST", "/tv/visit/bye", new JSONObject().put("member", member), 10_000);
            } catch (Throwable ignored) {
            }
        }, "beyond-family-visit-bye").start();
    }

    /** A Beyond Family person's new colour, chosen here: kept with them, so their other TVs get it too. */
    static void pushColour(Context c, String member, int colour) {
        final Context app = c.getApplicationContext();
        final String hex = String.format(Locale.ROOT, "#%06X", colour & 0xFFFFFF);
        new Thread(() -> {
            try {
                call(app, "POST", "/tv/people/" + member, new JSONObject().put("colour", hex), 10_000);
            } catch (Throwable ignored) {
            }
        }, "beyond-family-profile").start();
    }

    /** Unlink from the TV's side. Forgets here at once, whether or not Beyond Family hears it. */
    static void bye(Context c) {
        final JSONObject was = state(c);
        forget(c);
        new Thread(() -> {
            try {
                call(was, "POST", "/tv/bye", new JSONObject(), 10_000);
            } catch (Throwable ignored) {
            }
        }, "beyond-family-bye").start();
    }

    /** "TCL TV", "Sony TV": what the TV is called in the family's list of TVs. */
    private static String tvName() {
        String brand = Build.BRAND == null || Build.BRAND.isEmpty() ? Build.MANUFACTURER : Build.BRAND;
        if (brand == null || brand.isEmpty()) return "Google TV";
        String b = brand.length() <= 4 ? brand.toUpperCase(Locale.ROOT) : brand.substring(0, 1).toUpperCase(Locale.ROOT) + brand.substring(1);
        return (b + " TV").substring(0, Math.min(40, b.length() + 3));
    }

    // MARK: - The household

    private static String lastPeople = "";

    static void apply(Context c, JSONObject home) { apply(c, home, null); }

    /**
     * Beyond Family's people become the TV's people: the household's when linked, plus anybody signed in here from
     * another home. On a TV that isn't linked, its own people stay and the visitors join them. Only when they changed,
     * so nobody's screen jumps.
     */
    static void apply(Context c, JSONObject home, JSONArray visitorsIn) {
        final JSONArray visitors = visitorsIn == null ? new JSONArray() : visitorsIn;
        try {
            JSONObject s = state(c);
            JSONObject was = s.optJSONObject("home");
            boolean visiting = visitors.length() > 0;
            if (home != null && (was == null || !home.optString("name").equals(was.optString("name")))) {
                s.put("home", new JSONObject().put("name", home.optString("name", "Beyond Family")));
                save(c, s.put("visiting", visiting));
            } else if (s.optBoolean("visiting") != visiting && !s.optString("id").isEmpty()) {
                save(c, s.put("visiting", visiting));
            }
        } catch (Exception ignored) {
        }
        final JSONArray people = home == null ? null : home.optJSONArray("people");
        if (home != null && (people == null || people.length() == 0)) return;
        String sig = (people == null ? "" : people.toString()) + "|" + visitors;
        if (sig.equals(lastPeople)) return;
        lastPeople = sig;
        final Context app = c.getApplicationContext();
        MAIN.post(() -> {
            List<People.Person> list = new ArrayList<>();
            if (people != null) {
                for (int i = 0; i < people.length(); i++) {
                    People.Person p = person(people.optJSONObject(i), i);
                    if (p != null) list.add(p);
                }
            } else {
                // Not linked: this TV's own people stay.
                for (People.Person p : People.list(app)) if (!p.visitor) list.add(p);
            }
            for (int i = 0; i < visitors.length(); i++) {
                People.Person p = person(visitors.optJSONObject(i), list.size());
                if (p == null) continue;
                p.visitor = true;
                list.add(p);
            }
            if (list.isEmpty() || People.sameAs(app, list)) return;
            People.save(app, list);
            changed();
        });
    }

    /** One of Beyond Family's people, with their face and colour on Beyond TV when they've chosen them. */
    private static People.Person person(JSONObject p, int i) {
        if (p == null || p.optString("id").isEmpty()) return null;
        People.Person person = new People.Person();
        person.id = "bf-" + p.optString("id");
        person.name = p.optString("name", "?");
        person.colour = colour(p.optString("colour"), People.COLOURS[i % People.COLOURS.length]);
        person.kid = p.optBoolean("kid");
        JSONObject look = p.optJSONObject("profile");
        if (look != null) {
            person.colour = colour(look.optString("colour"), person.colour);
            String e = look.optString("emoji");
            if (e.length() <= 16) person.emoji = e;
        }
        return person;
    }

    private static int colour(String hex, int fallback) {
        try {
            return hex == null || hex.isEmpty() ? fallback : Color.parseColor(hex) | 0xFF000000;
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    // MARK: - The home screen listens

    /** Set by the home screen while it is showing: something it draws changed (people, who's watching). */
    static Runnable onChange;

    /** Set by the home screen while it is showing: draws a message over it. False when it can't. */
    interface Screen {
        boolean say(String text, int colour, String icon, String from);
    }

    static Screen screen;

    private static void changed() {
        if (onChange != null) onChange.run();
    }

    // MARK: - Doing what the app asks

    private static Handler adbThread;
    private static Adb adb;

    /** One command from /tv/sync. Called on the service's thread. */
    static void run(Context c, JSONObject cmd) {
        final Context app = c.getApplicationContext();
        String kind = cmd.optString("kind");
        switch (kind) {
            case "say":
                final String text = cmd.optString("text"), tone = cmd.optString("tone", "info"), from = cmd.optString("from", "");
                if (!text.isEmpty()) MAIN.post(() -> say(app, text, tone, from));
                break;
            case "key":
                final int code = keyCode(cmd.optString("key"));
                if (code != 0) adb().post(() -> press(app, code));
                break;
            case "launch":
                final String id = cmd.optString("app");
                adb().post(() -> launch(app, id));
                break;
            case "profile":
                final String member = "bf-" + cmd.optString("memberId");
                MAIN.post(() -> {
                    People.Person p = People.find(People.list(app), member);
                    if (p == null) return;
                    People.use(app, p.id);
                    Toast.makeText(app, Ui.tr("Agora: ", "Now watching: ") + p.name, Toast.LENGTH_SHORT).show();
                    changed();
                });
                break;
            default:
                // Watching together, reactions, bedtime breathing and the dinner question are on LG and Samsung so far.
                break;
        }
    }

    private static synchronized Handler adb() {
        if (adbThread == null) {
            HandlerThread t = new HandlerThread("beyond-family-adb");
            t.start();
            adbThread = new Handler(t.getLooper());
        }
        return adbThread;
    }

    private static int keyCode(String key) {
        switch (key) {
            case "up": return KeyEvent.KEYCODE_DPAD_UP;
            case "down": return KeyEvent.KEYCODE_DPAD_DOWN;
            case "left": return KeyEvent.KEYCODE_DPAD_LEFT;
            case "right": return KeyEvent.KEYCODE_DPAD_RIGHT;
            case "ok": return KeyEvent.KEYCODE_DPAD_CENTER;
            case "back": return KeyEvent.KEYCODE_BACK;
            case "home": return KeyEvent.KEYCODE_HOME;
            case "playpause": return KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            default: return 0;
        }
    }

    /** The TV's own ADB, kept open between presses. Never asks to be allowed: null when it isn't. */
    private static Adb openAdb(Context c) {
        if (adb != null) return adb;
        try {
            adb = Adb.connect(c, 0, null);
        } catch (Throwable t) {
            adb = null;
        }
        return adb;
    }

    private static boolean shell(Context c, String command) {
        for (int attempt = 0; attempt < 2; attempt++) {
            Adb a = openAdb(c);
            if (a == null) return false;
            try {
                a.shell(command);
                return true;
            } catch (Throwable t) {
                try { a.close(); } catch (Throwable ignored) {}
                adb = null;   // the connection went stale: one more go with a fresh one
            }
        }
        return false;
    }

    /** On the ADB thread. Through ADB it works in any app; without it, only on Beyond TV's own screens. */
    private static void press(Context c, int code) {
        if (shell(c, "input keyevent " + code)) return;
        if (code == KeyEvent.KEYCODE_HOME) {
            MAIN.post(() -> {
                try {
                    c.startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception ignored) {
                }
            });
            return;
        }
        try {
            new Instrumentation().sendKeyDownUpSync(code);   // only lands when one of our screens is in front
        } catch (Throwable ignored) {
        }
    }

    /** An app by its Beyond TV id ("netflix", "neon", "tvnz"), the same ids the LG and Samsung app uses. */
    private static void launch(Context c, String id) {
        String pkg = HomeApps.packageFor(c, id);
        Intent intent = pkg == null ? null : HomeApps.launchIntent(c.getPackageManager(), pkg);
        if (intent == null) {
            MAIN.post(() -> Toast.makeText(c, Ui.tr("Esse app não está nesta TV", "That app isn't on this TV"), Toast.LENGTH_SHORT).show());
            return;
        }
        ComponentName comp = intent.getComponent();
        if (comp != null && shell(c, "am start -a android.intent.action.MAIN -f 0x10000000 -n " + comp.flattenToShortString())) return;
        MAIN.post(() -> {
            try {
                c.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (Exception e) {
                AppLog.w("family: couldn't open " + pkg + ": " + e);
            }
        });
    }

    // MARK: - Messages on the screen

    private static int toneColour(String tone) {
        switch (tone) {
            case "dinner": return 0xFFE8A33D;
            case "tidy": case "alarm": case "security": return 0xFFD85A30;
            case "bedtime": return 0xFF7A4FD0;
            case "call": return 0xFF378ADD;
            default: return 0xFF2F7D6D;
        }
    }

    private static String toneIcon(String tone) {
        switch (tone) {
            case "dinner": return "🍽";
            case "tidy": return "🧺";
            case "bedtime": return "🌙";
            case "alarm": return "⏰";
            case "security": return "🔔";
            case "call": return "📞";
            default: return "✦";
        }
    }

    /** Over the home screen when it's showing; over anything else as a long toast (another app has the screen). */
    private static void say(Context c, String text, String tone, String from) {
        chime();
        if (screen != null && screen.say(text, toneColour(tone), toneIcon(tone), from)) return;
        Toast.makeText(c, (from.isEmpty() ? "" : from + ": ") + text, Toast.LENGTH_LONG).show();
    }

    /** Two soft notes, like the LG and Samsung app's. */
    private static void chime() {
        new Thread(() -> {
            try {
                int rate = 44100, len = (int) (rate * 0.84f);
                short[] pcm = new short[len];
                float[] notes = {660, 880};
                for (int n = 0; n < notes.length; n++) {
                    int start = (int) (rate * 0.18f * n), dur = (int) (rate * 0.65f);
                    for (int i = 0; i < dur && start + i < len; i++) {
                        float t = i / (float) rate;
                        float env = t < 0.03f ? t / 0.03f : (float) Math.exp(-(t - 0.03f) * 7);
                        pcm[start + i] += (short) (Math.sin(2 * Math.PI * notes[n] * t) * env * 0.18f * Short.MAX_VALUE);
                    }
                }
                AudioTrack track = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                        .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                        .setTransferMode(AudioTrack.MODE_STATIC).setBufferSizeInBytes(len * 2).build();
                track.write(pcm, 0, len);
                track.play();
                Thread.sleep(1000);
                track.release();
            } catch (Throwable ignored) {
            }
        }, "beyond-family-chime").start();
    }

    // MARK: - Pieces

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }
}
