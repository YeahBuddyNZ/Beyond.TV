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
        board = null;
        widgets = null;
        songs = null;
        notes = null;
        playlists = null;
        jobs = java.util.Collections.emptyMap();
        likes = java.util.Collections.emptyMap();
        pets = null;
        wall = null;
        todos = new JSONObject();
        wallSeen = "";
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

    /** Make it yours, chosen here: a Beyond Family person's face, colour, world and loves, kept with them. */
    static void pushLook(Context c, People.Person p) {
        final String member = p.member();
        if (member == null) return;
        final Context app = c.getApplicationContext();
        final JSONObject look = new JSONObject();
        try {
            look.put("emoji", p.emoji == null ? "" : p.emoji)
                    .put("colour", String.format(Locale.ROOT, "#%06X", p.colour & 0xFFFFFF))
                    .put("loves", new JSONArray(p.loves));
            if (p.world != null && !p.world.isEmpty()) look.put("world", p.world);
        } catch (Exception e) {
            return;
        }
        new Thread(() -> {
            try {
                call(app, "POST", "/tv/people/" + member, look, 10_000);
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

    /** The house noticeboard (only when the household turned it on): today's calendar, birthdays, tea, notes. Kept in
     *  memory only, never saved; the home screen reads it every 15 seconds. Same as web/family.js. */
    private static volatile JSONObject board;

    static JSONObject board() { return board; }

    /** Tiles pinned to the home screen in Beyond Family (apps, shows, the kids' jobs, cameras). In memory only. */
    private static volatile JSONArray widgets;

    static JSONArray widgets() { return widgets; }

    /** The family's karaoke songs from Beyond Family: title, artist and a YouTube video id when known. In memory only. */
    private static volatile JSONArray songs;

    static JSONArray songs() { return songs; }

    /** Notes left on the TV from a phone (ADR 0025): newest first, the ones still up, ink and all. In memory only. */
    private static volatile JSONArray notes;
    private static volatile String notesSeen = "";

    static JSONArray notes() { return notes; }

    /** Whoever is watching, as their Beyond Family member id, or null (Family, or somebody only on this TV). */
    static String watcherMember(Context c) {
        return People.current(c).member();
    }

    /**
     * A game started or moved on from the remote (quiz or question: start, reveal, next, end). Beyond Family sends the
     * same commands a phone would, so every TV at home follows. Calls `done` on the main thread with null, or what
     * went wrong in words.
     */
    static void game(Context c, String kind, String action, java.util.function.Consumer<String> done) {
        final Context app = c.getApplicationContext();
        final String member = watcherMember(c);
        new Thread(() -> {
            String error = null;
            try {
                JSONObject body = new JSONObject().put("action", action);
                if (member != null) body.put("memberId", member);
                call(app, "POST", "/tv/" + kind, body, 15_000);
            } catch (Throwable t) {
                error = Ui.tr("Não deu certo. Tente de novo.", "That didn't work. Try again.", "No funcionó. Inténtalo de nuevo.");
            }
            final String e = error;
            if (done != null) MAIN.post(() -> done.accept(e));
        }, "beyond-family-game").start();
    }

    /**
     * Tap to allow (ADR 0066): a grown-up with their own PIN can let themselves in from the Beyond Family app instead
     * of typing it, through Beyond Family's requests (the same as a kid asking for more time). The TV asks, their phone shows "Is this you on the TV?", and a tap on Allow opens their profile.
     * `update` hears, on the main thread: "asked" (their phone was told), "allowed", "no" (they said it wasn't them),
     * "late" (two minutes went by) or "failed". Returns something to run to stop asking (the PIN page closed).
     */
    static Runnable unlock(Context c, String member, java.util.function.Consumer<String> update) {
        final Context app = c.getApplicationContext();
        final java.util.concurrent.atomic.AtomicBoolean stop = new java.util.concurrent.atomic.AtomicBoolean();
        new Thread(() -> {
            String end = "failed";
            try {
                JSONObject asked = call(app, "POST", "/tv/requests", new JSONObject().put("kind", "unlock").put("memberId", member), 15_000);
                String id = asked.optString("id");
                if (id.isEmpty()) throw new IOException("no id");
                MAIN.post(() -> { if (!stop.get()) update.accept("asked"); });
                long until = System.currentTimeMillis() + 120_000;
                end = "late";
                while (!stop.get() && System.currentTimeMillis() < until) {
                    Thread.sleep(2000);
                    if (stop.get()) break;
                    String status = call(app, "GET", "/tv/requests/" + id, null, 10_000).optString("status");
                    if ("yes".equals(status)) { end = "allowed"; break; }
                    if ("no".equals(status)) { end = "no"; break; }
                    if ("gone".equals(status)) break;
                }
            } catch (Throwable t) {
                end = "failed";
            }
            final String e = end;
            MAIN.post(() -> { if (!stop.get()) update.accept(e); });
        }, "beyond-family-unlock").start();
        return () -> stop.set(true);
    }

    /** A song found on the TV goes on the family's list too, so it shows on everybody's phone. Best effort. */
    static void addSong(Context c, String title, String artist) {
        addSong(c, title, artist, null);
    }

    /** As above, then `done` on the main thread with the song ({id, title, artist, videoId}) or null. */
    static void addSong(Context c, String title, String artist, java.util.function.Consumer<JSONObject> done) {
        if (!linked(c)) {
            if (done != null) done.accept(null);
            return;
        }
        final Context app = c.getApplicationContext();
        final String member = watcherMember(c);
        new Thread(() -> {
            JSONObject song = null;
            try {
                JSONObject body = new JSONObject().put("title", title);
                if (artist != null && !artist.isEmpty()) body.put("artist", artist);
                if (member != null) body.put("memberId", member);
                song = call(app, "POST", "/tv/karaoke/songs", body, 15_000).optJSONObject("song");
                if (song != null) {
                    JSONArray now = songs == null ? new JSONArray() : new JSONArray(songs.toString());
                    songs = now.put(song);
                }
            } catch (Throwable ignored) {
            }
            final JSONObject s = song;
            if (done != null) MAIN.post(() -> done.accept(s));
        }, "beyond-family-song").start();
    }

    /** The family's karaoke playlists: [{id, name, items: [{songId, memberId}]}]. In memory only. */
    private static volatile JSONArray playlists;
    // A save on its way: a sync arriving meanwhile must not put the old list back.
    private static volatile boolean playlistBusy;

    static JSONArray playlists() { return playlists; }

    /** The best karaoke video for a song (Sing King and Lost Panda first), or null. `done` on the main thread. */
    static void findVideo(Context c, String title, String artist, java.util.function.Consumer<String> done) {
        if (!linked(c)) {
            done.accept(null);
            return;
        }
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            String id = null;
            try {
                JSONObject body = new JSONObject().put("title", title);
                if (artist != null && !artist.isEmpty()) body.put("artist", artist);
                String found = text(call(app, "POST", "/tv/karaoke/find", body, 8_000), "videoId");
                if (found.matches("[A-Za-z0-9_-]{11}")) id = found;
            } catch (Throwable ignored) {
            }
            final String v = id;
            MAIN.post(() -> done.accept(v));
        }, "beyond-family-find").start();
    }

    /** Tonight's next singer from the queue, taken off it, or null. `done` on the main thread. */
    static void nextTurn(Context c, java.util.function.Consumer<JSONObject> done) {
        if (!linked(c)) {
            done.accept(null);
            return;
        }
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            JSONObject turn = null;
            try {
                turn = call(app, "POST", "/tv/karaoke/next", new JSONObject(), 15_000).optJSONObject("turn");
            } catch (Throwable ignored) {
            }
            final JSONObject t = turn;
            MAIN.post(() -> done.accept(t));
        }, "beyond-family-next").start();
    }

    /** Makes (no id) or saves a playlist. `done` on the main thread with the saved one, or null. */
    static void savePlaylist(Context c, JSONObject list, java.util.function.Consumer<JSONObject> done) {
        final Context app = c.getApplicationContext();
        playlistBusy = true;
        new Thread(() -> {
            JSONObject saved = null;
            try {
                String id = list.optString("id", "");
                JSONObject body = new JSONObject().put("name", list.optString("name")).put("items", list.optJSONArray("items"));
                saved = call(app, id.isEmpty() ? "POST" : "PUT", "/tv/karaoke/playlists" + (id.isEmpty() ? "" : "/" + id), body, 15_000)
                        .optJSONObject("playlist");
                if (saved != null) {
                    JSONArray now = new JSONArray();
                    boolean put = false;
                    JSONArray was = playlists == null ? new JSONArray() : playlists;
                    for (int i = 0; i < was.length(); i++) {
                        JSONObject p = was.optJSONObject(i);
                        if (p != null && p.optString("id").equals(saved.optString("id"))) {
                            now.put(saved);
                            put = true;
                        } else if (p != null) now.put(p);
                    }
                    if (!put) now.put(saved);
                    playlists = now;
                }
            } catch (Throwable ignored) {
            }
            playlistBusy = false;
            final JSONObject s = saved;
            MAIN.post(() -> done.accept(s));
        }, "beyond-family-playlist").start();
    }

    static void dropPlaylist(Context c, String id, java.util.function.Consumer<Boolean> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            boolean ok = false;
            try {
                call(app, "DELETE", "/tv/karaoke/playlists/" + id, null, 15_000);
                JSONArray now = new JSONArray(), was = playlists == null ? new JSONArray() : playlists;
                for (int i = 0; i < was.length(); i++) {
                    JSONObject p = was.optJSONObject(i);
                    if (p != null && !p.optString("id").equals(id)) now.put(p);
                }
                playlists = now;
                ok = true;
            } catch (Throwable ignored) {
            }
            final boolean o = ok;
            MAIN.post(() -> done.accept(o));
        }, "beyond-family-playlist").start();
    }

    /** Earn your screen: each kid's jobs still to do today (only when the household turned it on), by person id. In
     *  memory only, from every sync. */
    private static volatile java.util.Map<String, List<String>> jobs = java.util.Collections.emptyMap();
    /** What each kid is into (person id → like ids): what a grown-up set, then their own loves. For KidPicks. */
    private static volatile java.util.Map<String, List<String>> likes = java.util.Collections.emptyMap();

    /** What this person is into, or an empty list. */
    static List<String> likes(String personId) {
        List<String> l = personId == null ? null : likes.get(personId);
        return l == null ? java.util.Collections.<String>emptyList() : l;
    }

    static List<String> jobs(String personId) {
        List<String> left = jobs.get(personId);
        return left == null ? java.util.Collections.<String>emptyList() : left;
    }

    /** The household's living pets from Beyond Family ({id, name, face, colour, due}), or null before the first sync. */
    private static volatile JSONArray pets;

    static boolean havePets() { return pets != null; }

    /** The pets still wanting a meal (Beyond Family works out `due`: one from the morning, the rest from 3pm). */
    static List<JSONObject> petsDue() {
        List<JSONObject> due = new ArrayList<>();
        JSONArray all = pets;
        for (int i = 0; all != null && i < all.length(); i++) {
            JSONObject p = all.optJSONObject(i);
            if (p != null && p.optBoolean("due") && !p.optString("id").isEmpty()) due.add(p);
        }
        return due;
    }

    /**
     * A kid said the pets are fed: Beyond Family ticks them off in its feeding record, with the kid's name. Calls
     * `done` on the main thread with null, or what went wrong in words.
     */
    static void petsFed(Context c, List<JSONObject> fed, String member, java.util.function.Consumer<String> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            String error = null;
            try {
                JSONArray ids = new JSONArray();
                for (JSONObject p : fed) ids.put(p.optString("id"));
                JSONObject body = new JSONObject().put("petIds", ids);
                if (member != null) body.put("memberId", member);
                call(app, "POST", "/tv/pets/fed", body, 15_000);
                // Not asked about again before the next sync says otherwise.
                for (JSONObject p : fed) p.put("due", false);
            } catch (Throwable t) {
                error = Ui.tr("Não deu para avisar o Beyond Family agora.", "Couldn't tell Beyond Family just now.",
                        "No se pudo avisar a Beyond Family ahora.");
            }
            final String e = error;
            if (done != null) MAIN.post(() -> done.accept(e));
        }, "beyond-family-pets").start();
    }

    // MARK: - Ask a grown-up and the Morning board (ADR 0069)

    /**
     * A kid asks the grown-ups' phones for more screen time ("time", 15 or 30 minutes) or one more game ("game").
     * Calls `done` on the main thread with words for the kid: who was asked, or what went wrong. The yes or not now
     * comes back as a "request-answer" command.
     */
    static void request(Context c, String kind, String member, int minutes, java.util.function.Consumer<String> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            String words;
            try {
                JSONObject body = new JSONObject().put("kind", kind).put("memberId", member);
                if ("time".equals(kind)) body.put("minutes", minutes == 30 ? 30 : 15);
                JSONObject out = call(app, "POST", "/tv/requests", body, 15_000);
                String who = names(out.optJSONArray("asked"));
                words = Ui.tr("Pedido enviado para " + who + ". A TV avisa quando responderem.",
                        "Asked " + who + ". The TV will tell you when they answer.",
                        "Pedido enviado a " + who + ". La TV te avisa cuando respondan.");
            } catch (Fail f) {
                words = f.status == 429 ? Ui.tr("Você já pediu bastante. Tente mais tarde.", "You've asked a lot already. Try again later.",
                        "Ya pediste bastante. Inténtalo más tarde.")
                        : f.status == 409 ? Ui.tr("Nenhum adulto tem o app Beyond Family ainda.", "No grown-ups have the Beyond Family app yet.",
                        "Ningún adulto tiene la app Beyond Family todavía.")
                        : Ui.tr("Não deu para pedir agora. Peça pessoalmente!", "Couldn't ask just now. Go and ask in person!",
                        "No se pudo pedir ahora. ¡Pídelo en persona!");
            } catch (Throwable t) {
                words = Ui.tr("Não deu para pedir agora. Peça pessoalmente!", "Couldn't ask just now. Go and ask in person!",
                        "No se pudo pedir ahora. ¡Pídelo en persona!");
            }
            final String w = words;
            if (done != null) MAIN.post(() -> done.accept(w));
        }, "beyond-family-ask").start();
    }

    /** "Mum and Dad", "Mum, Dad and Nana", or the grown-ups. */
    static String names(JSONArray list) {
        List<String> n = new ArrayList<>();
        for (int i = 0; list != null && i < list.length(); i++) if (!list.optString(i).isEmpty()) n.add(list.optString(i));
        if (n.isEmpty()) return Ui.tr("os adultos", "the grown-ups", "los adultos");
        if (n.size() == 1) return n.get(0);
        return android.text.TextUtils.join(", ", n.subList(0, n.size() - 1)) + Ui.tr(" e ", " and ", " y ") + n.get(n.size() - 1);
    }

    /**
     * Today for the Morning board (web/morning.js through TableActivity): the household's name, its people with their
     * to-dos, the jobs tile, the noticeboard and the weather, in the shape morning.js reads.
     */
    static JSONObject morning(Context c) {
        JSONObject out = new JSONObject();
        try {
            boolean on = linked(c);
            out.put("linked", on);
            if (!on) return out;
            out.put("home", homeName(c));
            // To-dos come from the family wall's copy, by member id, so a tick on either screen shows on both.
            JSONObject lists = todos;
            JSONArray people = new JSONArray();
            for (People.Person p : People.list(c)) {
                if (p.id == null || p.visitor || p.together()) continue;
                JSONObject o = new JSONObject().put("id", p.id).put("name", p.name == null ? "" : p.name).put("kid", p.kid)
                        .put("emoji", p.emoji == null ? "" : p.emoji).put("colour", String.format("#%06X", p.colour & 0xFFFFFF));
                if (p.id.startsWith("bf-")) o.put("family", p.id.substring(3));
                if (p.id.startsWith("bf-") && lists.optJSONArray(p.id.substring(3)) != null) o.put("todos", lists.optJSONArray(p.id.substring(3)));
                people.put(o);
            }
            out.put("people", people);
            if (board != null) out.put("board", board);
            JSONArray tiles = widgets;
            for (int i = 0; tiles != null && i < tiles.length(); i++) {
                JSONObject t = tiles.optJSONObject(i);
                if (t != null && "jobs".equals(t.optString("kind"))) out.put("tile", t.optJSONArray("kids"));
            }
            HomeData.Weather w = HomeData.get(c).weather;
            if (w != null && !Double.isNaN(w.temp) && Prefs.weather()) {
                out.put("weather", new JSONObject().put("temp", HomeData.degrees(w.temp)).put("max", HomeData.degrees(w.max))
                        .put("min", HomeData.degrees(w.min)).put("code", w.code).put("day", w.isDay)
                        .put("cond", HomeData.condition(w.code, w.isDay)).put("city", Prefs.city()));
            }
        } catch (JSONException ignored) {
        }
        return out;
    }

    /** A grown-up answered a kid's ask from their phone: the minutes on a yes, kind words either way. */
    private static void answered(Context app, JSONObject cmd) {
        if ("unlock".equals(cmd.optString("ask"))) return;
        String who = cmd.optString("who"), by = cmd.optString("by");
        if (by.isEmpty()) by = Ui.tr("Um adulto", "A grown-up", "Un adulto");
        int minutes = cmd.optInt("minutes");
        String words;
        if (cmd.optBoolean("yes") && minutes > 0 && !cmd.optString("member").isEmpty()) {
            ScreenTimeService.more(app, "bf-" + cmd.optString("member"), minutes);
            words = Ui.tr(by + " disse sim! Mais " + minutes + " minutos, " + who + ".", by + " said yes! " + minutes + " more minutes, " + who + ".",
                    "¡" + by + " dijo que sí! " + minutes + " minutos más, " + who + ".");
        } else if (!cmd.optBoolean("yes")) {
            words = Ui.tr("Agora não, " + who + ". " + by + " disse que fica para amanhã.", "Not this time, " + who + ". " + by + " said maybe tomorrow.",
                    "Ahora no, " + who + ". " + by + " dijo que mañana.");
        } else {
            return;
        }
        android.widget.Toast.makeText(app, words, android.widget.Toast.LENGTH_LONG).show();
    }

    static void apply(Context c, JSONObject home) { apply(c, home, null); }

    /**
     * Beyond Family's people become the TV's people: the household's when linked, plus anybody signed in here from
     * another home. On a TV that isn't linked, its own people stay and the visitors join them. Only when they changed,
     * so nobody's screen jumps.
     */
    static void apply(Context c, JSONObject home, JSONArray visitorsIn) {
        final JSONArray visitors = visitorsIn == null ? new JSONArray() : visitorsIn;
        board = home == null ? null : home.optJSONObject("board");
        Tidy.apply(c, home == null ? null : home.optJSONObject("tidy"));
        widgets = home == null ? null : home.optJSONArray("widgets");
        songs = home == null ? null : home.optJSONArray("songs");
        notes = home == null ? null : home.optJSONArray("notes");
        // The home screen's note button comes and goes with them.
        String seen = notes == null ? "" : notes.toString();
        if (!seen.equals(notesSeen)) {
            notesSeen = seen;
            MAIN.post(Family::changed);
        }
        if (!playlistBusy) playlists = home == null ? null : home.optJSONArray("playlists");
        jobs = jobsOf(home == null ? null : home.optJSONArray("people"));
        wallFrom(home);
        likes = likesOf(home == null ? null : home.optJSONArray("people"));
        pets = home == null ? null : home.optJSONArray("pets");
        if (pets != null) MAIN.post(() -> PetsActivity.arrived(c.getApplicationContext()));
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
        String sig = withoutTodos(people) + "|" + visitors;
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

    // MARK: - The family wall and to-dos (web/wall.js in TableActivity, ADR 0067)

    /** {stickies, wins} from the sync, or null. */
    private static volatile JSONObject wall;
    /** Each person's to-dos for today by member id: {member: [{id, title, done, points}]}. */
    private static volatile JSONObject todos = new JSONObject();
    private static volatile String wallSeen = "";
    /** The household's name, for the top of the Family wall (as on Family HQ). */
    private static volatile String wallName = "";

    private static void wallFrom(JSONObject home) {
        JSONObject w = home == null ? null : home.optJSONObject("wall");
        wallName = home == null ? "" : home.optString("name", "");
        JSONObject t = new JSONObject();
        JSONArray people = home == null ? null : home.optJSONArray("people");
        for (int i = 0; people != null && i < people.length(); i++) {
            JSONObject p = people.optJSONObject(i);
            JSONArray list = p == null ? null : p.optJSONArray("todos");
            if (list == null || list.length() == 0) continue;
            try { t.put(p.optString("id"), list); } catch (JSONException ignored) { }
        }
        String seen = (w == null ? "" : w.toString()) + "|" + t;
        wall = w;
        todos = t;
        if (!seen.equals(wallSeen)) {
            wallSeen = seen;
            MAIN.post(Family::changed);
        }
    }

    /** Whether the wall has anything up, or anybody has to-dos: the home screen's wall button shows then. */
    static boolean hasWall() {
        JSONObject w = wall;
        return todos.length() > 0 || (w != null && (w.optJSONObject("hq") != null || w.optJSONArray("stickies") != null && w.optJSONArray("stickies").length() > 0
                || w.optJSONArray("wins") != null && w.optJSONArray("wins").length() > 0));
    }

    /** A line for Today at home, as web/wall.js homeRow: {icon, words, more, symbol}, or null. */
    static String[] wallRow(People.Person p) {
        String member = p == null ? null : p.member();
        JSONArray list = member == null ? null : todos.optJSONArray(member);
        if (list != null && list.length() > 0) {
            int left = 0;
            for (int i = 0; i < list.length(); i++) if (list.optJSONObject(i) != null && !list.optJSONObject(i).optBoolean("done")) left++;
            String words = left > 0 ? Ui.tr("Faltam " + left + " · tarefas de hoje", left + " to go · to-dos today", "Quedan " + left + " · tareas de hoy")
                    : Ui.tr("Tudo feito hoje!", "All done today!", "¡Todo hecho hoy!");
            return new String[] {"✅", words, Ui.tr("Mural da família", "Family wall", "Muro de la familia"), ""};
        }
        JSONObject w = wall;
        JSONArray stickies = w == null ? null : w.optJSONArray("stickies");
        if (stickies != null && stickies.length() > 0 && stickies.optJSONObject(0) != null) {
            return new String[] {"📌", stickies.optJSONObject(0).optString("text"), Ui.tr("No mural", "On the wall", "En el muro"), ""};
        }
        return null;
    }

    /** What web/wall.js reads in TableActivity: {wall, todos, name}. */
    static String wallJson() {
        try {
            return new JSONObject().put("wall", wall == null ? JSONObject.NULL : wall).put("todos", todos).put("name", wallName).toString();
        } catch (JSONException e) {
            return "{}";
        }
    }

    /** People's own signature, without the to-dos, so a tick never makes Who's watching save again. */
    private static String withoutTodos(JSONArray people) {
        if (people == null) return "";
        JSONArray out = new JSONArray();
        for (int i = 0; i < people.length(); i++) {
            JSONObject p = people.optJSONObject(i);
            if (p == null) continue;
            try {
                JSONObject q = new JSONObject(p.toString());
                q.remove("todos");
                out.put(q);
            } catch (JSONException ignored) {
            }
        }
        return out.toString();
    }

    /** Ticks one of somebody's to-dos in Beyond Family, or unticks it. `done` on the main thread with whether it went. */
    static void tickTodo(Context c, String id, String member, boolean on, java.util.function.Consumer<Boolean> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            boolean ok;
            try {
                call(app, "POST", "/tv/todos/" + android.net.Uri.encode(id) + "/tick", new JSONObject().put("memberId", member).put("done", on), 15_000);
                ok = true;
                // Kept here too, so the wall opened again before the next sync shows the tick.
                JSONArray list = todos.optJSONArray(member);
                for (int i = 0; list != null && i < list.length(); i++) {
                    JSONObject t = list.optJSONObject(i);
                    if (t != null && id.equals(t.optString("id"))) t.put("done", on);
                }
            } catch (Throwable t) {
                ok = false;
            }
            final boolean went = ok;
            if (done != null) MAIN.post(() -> done.accept(went));
        }, "beyond-family-tick").start();
    }

    /** Puts a sticky on the family wall from the remote. `done` on the main thread with whether it went up. */
    static void sticky(Context c, String text, String colour, String member, java.util.function.Consumer<Boolean> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            boolean ok;
            try {
                JSONObject body = new JSONObject().put("text", text.length() > 120 ? text.substring(0, 120) : text);
                if (colour != null && !colour.isEmpty()) body.put("colour", colour);
                if (member != null && !member.isEmpty()) body.put("memberId", member);
                call(app, "POST", "/tv/wall/sticky", body, 15_000);
                ok = true;
            } catch (Throwable t) {
                ok = false;
            }
            final boolean went = ok;
            if (done != null) MAIN.post(() -> done.accept(went));
        }, "beyond-family-sticky").start();
    }

    // MARK: - Family HQ on the TV (web/wall.js, ADR 0079)

    /** Ticks an item on one of the household's HQ lists, or unticks it. `done` on the main thread with whether it went. */
    static void tickList(Context c, String id, boolean on, java.util.function.Consumer<Boolean> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            boolean ok;
            try {
                call(app, "POST", "/tv/hq/" + android.net.Uri.encode(id) + "/tick", new JSONObject().put("done", on), 15_000);
                ok = true;
                // Kept here too, so the wall opened again before the next sync shows the tick.
                JSONObject w = wall, hq = w == null ? null : w.optJSONObject("hq"), lists = hq == null ? null : hq.optJSONObject("lists");
                for (String kind : new String[] {"todo", "wishlist", "broken"}) {
                    JSONArray list = lists == null ? null : lists.optJSONArray(kind);
                    for (int i = 0; list != null && i < list.length(); i++) {
                        JSONObject item = list.optJSONObject(i);
                        if (item != null && id.equals(item.optString("id"))) item.put("done", on);
                    }
                }
            } catch (Throwable t) {
                ok = false;
            }
            final boolean went = ok;
            if (done != null) MAIN.post(() -> done.accept(went));
        }, "beyond-family-list-tick").start();
    }

    /** Adds something to one of the household's HQ lists from the remote. `done` on the main thread with whether it went. */
    static void addToList(Context c, String kind, String text, java.util.function.Consumer<Boolean> done) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            boolean ok;
            try {
                JSONObject res = call(app, "POST", "/tv/hq/lists", new JSONObject().put("kind", kind).put("text", text.length() > 80 ? text.substring(0, 80) : text), 15_000);
                ok = true;
                // Up on the list straight away, after the ones still to do, rather than at the next sync.
                JSONObject item = res == null ? null : res.optJSONObject("item");
                JSONObject w = wall, hq = w == null ? null : w.optJSONObject("hq"), lists = hq == null ? null : hq.optJSONObject("lists");
                if (item != null && lists != null) {
                    JSONArray list = lists.optJSONArray(kind), out = new JSONArray();
                    boolean put = false;
                    for (int i = 0; list != null && i < list.length(); i++) {
                        JSONObject x = list.optJSONObject(i);
                        if (!put && x != null && x.optBoolean("done")) { out.put(item); put = true; }
                        out.put(x);
                    }
                    if (!put) out.put(item);
                    lists.put(kind, out);
                }
            } catch (Throwable t) {
                ok = false;
            }
            final boolean went = ok;
            if (done != null) MAIN.post(() -> done.accept(went));
        }, "beyond-family-list-add").start();
    }

    private static java.util.Map<String, List<String>> likesOf(JSONArray people) {
        java.util.Map<String, List<String>> out = new java.util.HashMap<>();
        for (int i = 0; people != null && i < people.length(); i++) {
            JSONObject p = people.optJSONObject(i);
            if (p == null) continue;
            JSONObject look = p.optJSONObject("profile");
            List<String> list = new ArrayList<>();
            for (JSONArray a : new JSONArray[] {p.optJSONArray("likes"), look == null ? null : look.optJSONArray("loves")}) {
                for (int j = 0; a != null && j < a.length(); j++) {
                    String id = a.optString(j);
                    if (!id.isEmpty() && !list.contains(id)) list.add(id);
                }
            }
            if (!list.isEmpty()) out.put("bf-" + p.optString("id"), list);
        }
        return out;
    }

    private static java.util.Map<String, List<String>> jobsOf(JSONArray people) {
        java.util.Map<String, List<String>> out = new java.util.HashMap<>();
        for (int i = 0; people != null && i < people.length(); i++) {
            JSONObject p = people.optJSONObject(i);
            JSONArray left = p == null ? null : p.optJSONArray("jobs");
            if (left == null || left.length() == 0) continue;
            List<String> list = new ArrayList<>();
            for (int j = 0; j < left.length(); j++) if (!left.optString(j).isEmpty()) list.add(left.optString(j));
            if (!list.isEmpty()) out.put("bf-" + p.optString("id"), list);
        }
        return out;
    }

    private static String cut(String s, int most) {
        return s == null ? "" : s.length() <= most ? s : s.substring(0, most);
    }

    /** One of Beyond Family's people, with their face and colour on Beyond TV when they've chosen them. */
    private static People.Person person(JSONObject p, int i) {
        if (p == null || p.optString("id").isEmpty()) return null;
        People.Person person = new People.Person();
        person.id = "bf-" + p.optString("id");
        person.name = p.optString("name", "?");
        person.colour = colour(p.optString("colour"), People.COLOURS[i % People.COLOURS.length]);
        person.kid = p.optBoolean("kid");
        person.teen = person.kid && p.optBoolean("teen");
        String stage = p.optString("stage");
        if (person.kid && (WarmNotes.KINDY.equals(stage) || WarmNotes.SCHOOL.equals(stage) || WarmNotes.COLLEGE.equals(stage))) person.stage = stage;
        // Awards a grown-up gave them (ADR 0072): the newest few, trimmed, for the warm notes and the badge.
        JSONArray won = person.kid ? p.optJSONArray("awards") : null;
        if (won != null) {
            JSONArray keep = new JSONArray();
            for (int j = 0; j < won.length() && keep.length() < 3; j++) {
                JSONObject a = won.optJSONObject(j);
                String title = a == null ? "" : a.optString("title").trim();
                if (title.isEmpty()) continue;
                try {
                    keep.put(new JSONObject().put("title", cut(title, 40)).put("emoji", cut(a.optString("emoji"), 8))
                            .put("from", cut(a.optString("from"), 30)).put("note", cut(a.optString("note"), 60))
                            .put("on", a.optString("on").matches("\\d{4}-\\d{2}-\\d{2}") ? a.optString("on") : ""));
                } catch (Exception ignored) {
                }
            }
            if (keep.length() > 0) person.awards = keep.toString();
        }
        JSONObject look = p.optJSONObject("profile");
        if (look != null) {
            person.colour = colour(look.optString("colour"), person.colour);
            String e = look.optString("emoji");
            if (e.length() <= 16) person.emoji = e;
            if (MyWorldActivity.world(look.optString("world")) != null) person.world = look.optString("world");
            JSONArray loves = look.optJSONArray("loves");
            for (int j = 0; loves != null && j < loves.length() && j < 12; j++) {
                String id = loves.optString(j);
                if (!id.isEmpty() && !person.loves.contains(id)) person.loves.add(id);
            }
        }
        return person;
    }

    private static String text(JSONObject o, String key) {
        return o.isNull(key) ? "" : o.optString(key, "");
    }

    /** A phone's ask: {member, kid} for ask.js (ADR 0068), or "" when the command doesn't say. */
    private static String askerOf(JSONObject cmd) {
        String member = text(cmd, "memberId");
        boolean kid = cmd.optBoolean("kid", false);
        if (member.isEmpty() && !kid) return "";
        try {
            JSONObject o = new JSONObject().put("kid", kid);
            if (!member.isEmpty()) o.put("member", member);
            return o.toString();
        } catch (JSONException e) {
            return "";
        }
    }

    static int colour(String hex, int fallback) {
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
                // Over another app, Android 10 and up wants Beyond TV allowed to show over apps: the TV's own ADB says so.
                if (!text.isEmpty()) adb().post(() -> {
                    allowOverApps(app);
                    MAIN.post(() -> say(app, text, tone, from));
                });
                break;
            case "key":
                final int code = keyCode(cmd.optString("key"));
                if (code != 0) adb().post(() -> press(app, code));
                break;
            case "launch":
                final String id = cmd.optString("app");
                adb().post(() -> launch(app, id));
                break;
            case "wake":
                // Turned on from a phone (ADR 0026): the TV's own ADB wakes the screen, then opens what was asked for.
                final String openAfter = text(cmd, "app");
                adb().post(() -> {
                    wake(app);
                    if (!openAfter.isEmpty()) launch(app, openAfter);
                });
                break;
            case "request-answer":
                // A grown-up's yes or not now to a kid's ask (ADR 0069).
                MAIN.post(() -> answered(app, cmd));
                break;
            case "sky":
                // Look around (ADR 0036), opened from a phone's Point the sky (ADR 0040).
                MAIN.post(() -> { if (!TableActivity.skyOpen()) TableActivity.open(app, "sky"); });
                break;
            case "sky-look":
                TableActivity.look(cmd.optDouble("az", Double.NaN), cmd.optDouble("alt", Double.NaN));
                break;
            case "sleep":
                // Turned off from a phone (ADR 0037): the sleep key through the TV's own ADB, then power if it ignored it.
                adb().post(() -> sleep(app));
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
            case "bedtime":
                final int minutes = cmd.optInt("minutes", 15);
                MAIN.post(() -> {
                    try {
                        BedtimeActivity.open(app, minutes);
                    } catch (RuntimeException e) {
                        // Android may not let us open a screen over another app: say it instead.
                        say(app, Ui.tr("Hora de dormir", "Time for bed", "Hora de dormir"), "bedtime", "");
                    }
                });
                break;
            case "tidy":
                final int tidyFor = cmd.optInt("minutes", Tidy.minutes(app));
                MAIN.post(() -> {
                    try {
                        TidyActivity.open(app, tidyFor);
                    } catch (RuntimeException e) {
                        say(app, Ui.tr("Hora de arrumar!", "Tidy-up time!", "¡A ordenar!"), "tidy", "");
                    }
                });
                break;
            case "party":
                final String style = cmd.optString("style", "disco"), whose = cmd.optString("name", "");
                final int partyFor = cmd.optInt("minutes", 30);
                MAIN.post(() -> {
                    try {
                        PartyActivity.open(app, style, whose, partyFor);
                    } catch (RuntimeException e) {
                        say(app, Ui.tr("Hora da festa!", "Party time!", "¡Hora de la fiesta!"), "info", "");
                    }
                });
                break;
            case "karaoke":
                // A JSON null reads as "null" through optString on Android, so the missing ones are looked at first.
                final String singer = text(cmd, "name"), song = text(cmd, "title"), by = text(cmd, "artist");
                final int singerColour = colour(cmd.optString("colour"), Glow.VIOLET);
                final String video = text(cmd, "videoId"), asked = text(cmd, "query"), query = asked.isEmpty() ? song + " karaoke" : asked;
                JSONObject following = cmd.optJSONObject("next");
                final String then = following == null ? "" : text(following, "name") + " · " + text(following, "title");
                if (song.isEmpty()) break;
                // Over whatever is on, Android 10 and up wants Beyond TV allowed to show over apps.
                adb().post(() -> {
                    allowOverApps(app);
                    MAIN.post(() -> {
                        try {
                            app.startActivity(KaraokeActivity.intent(app, singer, singerColour, song, by, video, query, then));
                        } catch (RuntimeException e) {
                            KaraokeActivity.play(app, video, query);
                        }
                    });
                });
                break;
            case "karaoke-set":
                // A playlist played from a phone: every song in turn, in Beyond TV's own player.
                final JSONArray turns = cmd.optJSONArray("turns");
                final String listName = text(cmd, "playlist");
                if (turns == null || turns.length() == 0) break;
                adb().post(() -> {
                    allowOverApps(app);
                    MAIN.post(() -> {
                        try {
                            app.startActivity(KaraokeActivity.night(app, turns, listName, false));
                        } catch (RuntimeException ignored) {
                        }
                    });
                });
                break;
            case "note":
                // A note arrived from a phone: big for a moment, only while the home screen is in front. Over another app
                // it waits on the home screen (ADR 0025): a note never takes over what's on.
                MAIN.post(() -> {
                    if (screen == null || notes == null || notes.length() == 0) return;
                    try {
                        Chime.play();
                        AskActivity.open(app, AskActivity.NOTES, "", "");
                    } catch (RuntimeException ignored) {
                    }
                });
                break;
            case "ask":
                // Asked from a phone in Beyond Family: the TV asks it with its own apps, and the answer comes up here.
                final String question = text(cmd, "text"), asker = text(cmd, "from");
                // Whose phone it was, and whether they're a kid (ADR 0068): a kid's question is checked and logged.
                final String who = askerOf(cmd);
                if (question.isEmpty()) break;
                adb().post(() -> {
                    allowOverApps(app);
                    MAIN.post(() -> {
                        try {
                            AskActivity.open(app, AskActivity.ASK, question, asker, who);
                        } catch (RuntimeException ignored) {
                        }
                    });
                });
                break;
            case "party-end":
                MAIN.post(PartyActivity::end);
                break;
            case "question":
            case "question-answered":
            case "question-reveal":
            case "question-end":
                final JSONObject q = cmd;
                MAIN.post(() -> DinnerActivity.command(app, q));
                break;
            case "quiz":
            case "quiz-answered":
            case "quiz-reveal":
            case "quiz-end":
                final JSONObject quiz = cmd;
                MAIN.post(() -> QuizActivity.command(app, quiz));
                break;
            default:
                // Watching together and reactions are on LG and Samsung so far.
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

    /** On the ADB thread. Wakes the screen when it's dark, the same way the tidy-up race does (Tidy.Receiver). */
    private static void wake(Context c) {
        Adb a = openAdb(c);
        if (a == null || Sleep.awake(a)) return;
        try {
            shell(c, "input keyevent 224");   // wake up
            Thread.sleep(2500);
            if (!Sleep.awake(a)) shell(c, "input keyevent 26");   // TVs that only know power
            Thread.sleep(3000);
        } catch (InterruptedException ignored) {
        }
    }

    /** On the ADB thread. Puts the TV to sleep, the same way the sleep timer does (Sleep.Receiver), only when it's on. */
    private static void sleep(Context c) {
        Adb a = openAdb(c);
        if (a == null) {
            Checkin.error(c, "sleep", "no adb");
            return;
        }
        if (!Sleep.awake(a)) return;   // already dark: a power press now would turn it back on
        try {
            shell(c, "input keyevent 223");   // sleep
            Thread.sleep(2500);
            if (Sleep.awake(a)) shell(c, "input keyevent 26");   // TVs that only know power
        } catch (InterruptedException ignored) {
        }
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
                AppLog.here("family: couldn't open " + pkg + ": " + e);
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

    /**
     * Full screen over whatever is on until somebody presses OK (SayActivity, ADR 0018). Where Android won't let a
     * screen open over another app (10 and up, before the TV's ADB has allowed it), a long toast instead.
     */
    private static void say(Context c, String text, String tone, String from) {
        chime();
        boolean canOpen = Build.VERSION.SDK_INT < 29 || screen != null || android.provider.Settings.canDrawOverlays(c);
        if (canOpen) {
            try {
                c.startActivity(SayActivity.intent(c, text, toneColour(tone), toneIcon(tone), from));
                return;
            } catch (RuntimeException ignored) {
                // falls through to the toast
            }
        }
        Toast.makeText(c, (from.isEmpty() ? "" : from + ": ") + text, Toast.LENGTH_LONG).show();
    }

    /** On the ADB thread: lets Beyond TV open a message over another app (Android 10 and up), once. */
    private static void allowOverApps(Context c) {
        if (Build.VERSION.SDK_INT < 29 || android.provider.Settings.canDrawOverlays(c)) return;
        shell(c, "appops set " + c.getPackageName() + " SYSTEM_ALERT_WINDOW allow");
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

    static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }
}
