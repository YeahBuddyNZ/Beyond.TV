package nz.gobeyond.tv;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Art mode, like a Samsung Frame: the screensaver shows paintings from the Art Institute of Chicago's public domain
 * collection (free, no key), filling the whole screen with nothing written on it. Only paintings about the screen's
 * shape are picked, so filling crops only the edges. Once a day a new set of up to 24 comes from the kind chosen in
 * Home Settings (KINDS; Mixed changes theme each day); each is downloaded once, cropped to 16:9 once and kept on disk,
 * so the screensaver treats it like any other photo. Same kinds and ids as web/art.js. It speaks the same Recs.Pick and listener shape, so DreamView only swaps the source.
 */
final class Art {
    private static final String API = "https://api.artic.edu/api/v1/artworks/search";
    private static final String IIIF = "https://www.artic.edu/iiif/2/";
    /** Our own seasonal art (Halloween, Christmas...), drawn by us and served from the website: docs/art. */
    static final String SEASONS = "https://yeahbuddynz.github.io/Beyond.TV/art/";
    private static final String[] THEMES = {"landscape", "sea", "garden", "flowers", "mountains", "river", "sky",
            "autumn", "harbour", "trees", "impressionism", "still life"};
    /** The kinds to pick from in Home Settings: {id, the museum searches behind it}. Mixed is THEMES, one a day. */
    static final String[][] KINDS = {
            {"mixed"},
            {"landscapes", "landscape", "countryside", "river"},
            {"sea", "sea", "harbour", "coast"},
            {"gardens", "garden", "flowers"},
            {"mountains", "mountains", "alps", "valley"},
            {"impressionism", "impressionism", "Monet"},
            {"still life", "still life"}};
    private static final int KEEP = 24;
    /** The framed picture's size: the screensaver's photo size (10% larger than the screen, for the slow zoom). */
    private static final int W = 2112, H = 1188;

    private static Art instance;
    private final Context context;
    private final File dir, listFile, kindFile;
    private final List<Recs.Pick> picks = new ArrayList<>();
    private final List<Recs.Listener> listeners = new ArrayList<>();
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean fetching;
    private long failedAt;

    static synchronized Art get(Context c) {
        if (instance == null) instance = new Art(c.getApplicationContext());
        return instance;
    }

    private Art(Context c) {
        context = c;
        dir = new File(c.getCacheDir(), "art");
        dir.mkdirs();
        listFile = new File(c.getFilesDir(), "art.json");
        kindFile = new File(c.getFilesDir(), "art-kind.txt");
        load();
    }

    void addListener(Recs.Listener l) { if (!listeners.contains(l)) listeners.add(l); }
    void removeListener(Recs.Listener l) { listeners.remove(l); }

    /** The paintings already framed on disk, in today's order. */
    List<Recs.Pick> showcase() {
        List<Recs.Pick> out = new ArrayList<>();
        synchronized (picks) {
            for (Recs.Pick p : picks) if (file(p).exists()) out.add(p);
        }
        return out;
    }

    File readyImage(Recs.Pick p) {
        File f = file(p);
        return f.exists() ? f : null;
    }

    /** A new set once a day; then frames whatever isn't on disk yet, one at a time, in the background. */
    void refresh() {
        if (fetching) return;
        long sinceFail = System.currentTimeMillis() - failedAt;
        if (failedAt != 0 && sinceFail >= 0 && sinceFail < 10 * 60_000L) return;
        fetching = true;
        io.execute(() -> {
            try {
                if (stale()) fetchList();
                List<Recs.Pick> todo;
                synchronized (picks) { todo = new ArrayList<>(picks); }
                int done = 0;
                for (Recs.Pick p : todo) {
                    if (file(p).exists()) continue;
                    try {
                        frame(p);
                        if (++done % 2 == 1) notifyListeners();   // the first one shows as soon as it is ready
                    } catch (Exception | OutOfMemoryError e) {
                        AppLog.w("art: " + p.title + ": " + e.getMessage());
                    }
                }
                tidy();
            } catch (Exception e) {
                failedAt = System.currentTimeMillis();
                AppLog.w("art: " + e.getMessage());
            } finally {
                fetching = false;
                notifyListeners();
            }
        });
    }

    private boolean stale() {
        synchronized (picks) { if (picks.isEmpty()) return true; }
        if (!Prefs.artKind().equals(readKind())) return true;   // they picked another kind of art
        // A new set each day, at midnight on the TV's own clock, so a season starts on its first morning.
        java.text.SimpleDateFormat day = new java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.ROOT);
        return !day.format(new java.util.Date(listFile.lastModified())).equals(day.format(new java.util.Date()));
    }

    // MARK: - The list

    private void fetchList() throws Exception {
        long day = System.currentTimeMillis() / 86_400_000L;
        String[] kind = kind();
        if (kind.length == 1) {   // Mixed: a season's own art when one is on
            try {
                if (fetchSeason(day)) return;
            } catch (Exception e) {
                AppLog.w("art: seasons: " + e.getMessage());   // no season art today: the museum, as always
            }
        }
        String theme = kind.length > 1 ? kind[1 + (int) (day % (kind.length - 1))] : THEMES[(int) (day % THEMES.length)];
        String q = "q=" + URLEncoder.encode(theme, "UTF-8")
                + "&query%5Bterm%5D%5Bis_public_domain%5D=true&limit=100"
                + "&fields=id,title,artist_title,image_id,date_display,artwork_type_title,thumbnail";
        JSONArray data = new JSONObject(read(API + "?" + q)).getJSONArray("data");
        List<Recs.Pick> found = new ArrayList<>(), other = new ArrayList<>();
        for (int i = 0; i < data.length(); i++) {
            JSONObject o = data.getJSONObject(i);
            String image = o.optString("image_id", "");
            String type = o.optString("artwork_type_title", "");
            // Paintings and drawings only: photographs of vases and coins don't make a Frame.
            if (image.isEmpty() || o.isNull("image_id") || !(type.equals("Painting") || type.equals("Drawing and Watercolor"))) continue;
            Recs.Pick p = new Recs.Pick();
            p.kind = "art";
            p.id = o.optInt("id");
            p.title = o.optString("title", "");
            p.backdrop = image;
            String artist = o.isNull("artist_title") ? "" : o.optString("artist_title", "");
            String date = o.isNull("date_display") ? "" : o.optString("date_display", "");
            p.meta = artist.isEmpty() ? date : date.isEmpty() ? artist : artist + " · " + date;
            p.gentle = true;
            (shaped(o.optJSONObject("thumbnail")) ? found : other).add(p);
        }
        // Filling a 16:9 screen crops a tall painting badly: wide ones only, unless there are too few.
        if (found.size() < 8) found.addAll(other);
        if (found.isEmpty()) throw new Exception("no paintings for " + theme);
        Collections.shuffle(found, new Random(day));
        while (found.size() > KEEP) found.remove(found.size() - 1);
        synchronized (picks) {
            picks.clear();
            picks.addAll(found);
        }
        save();
    }

    /** About the screen's shape (from 5:4 to 12:5), so filling it crops only the edges. */
    private static boolean shaped(JSONObject t) {
        if (t == null) return false;
        double w = t.optDouble("width", 0), h = t.optDouble("height", 0);
        return w > 0 && h > 0 && w / h >= 1.25 && w / h <= 2.4;
    }

    /** The chosen kind of art: {id, searches...}; Mixed when the setting is unknown. */
    private static String[] kind() {
        String id = Prefs.artKind();
        for (String[] k : KINDS) if (k[0].equals(id)) return k;
        return KINDS[0];
    }

    private String readKind() {
        try {
            return new String(java.nio.file.Files.readAllBytes(kindFile.toPath()), StandardCharsets.UTF_8);
        } catch (Exception | LinkageError e) {
            return "mixed";
        }
    }

    /** In a season (Halloween, Christmas...), its pictures instead of the museum's. False when no season is on. */
    private boolean fetchSeason(long day) throws Exception {
        JSONArray seasons = new JSONObject(read(SEASONS + "seasons.json")).getJSONArray("seasons");
        java.util.Calendar now = java.util.Calendar.getInstance();
        String today = String.format(java.util.Locale.ROOT, "%02d-%02d", now.get(java.util.Calendar.MONTH) + 1,
                now.get(java.util.Calendar.DAY_OF_MONTH));
        for (int i = 0; i < seasons.length(); i++) {
            JSONObject s = seasons.getJSONObject(i);
            if (!inSeason(today, s.optString("from"), s.optString("to"))) continue;
            JSONArray art = s.getJSONArray("art");
            List<Recs.Pick> found = new ArrayList<>();
            for (int j = 0; j < art.length(); j++) {
                JSONObject o = art.getJSONObject(j);
                String file = o.optString("file", "");
                if (file.isEmpty()) continue;
                Recs.Pick p = new Recs.Pick();
                p.kind = "art";
                p.id = file.hashCode() & 0x7FFFFFFF;
                p.title = o.optString("title", "");
                p.backdrop = SEASONS + file;
                p.meta = o.optString("by", "Beyond™ TV");
                p.gentle = true;
                found.add(p);
            }
            if (found.isEmpty()) return false;
            Collections.shuffle(found, new Random(day));
            synchronized (picks) {
                picks.clear();
                picks.addAll(found);
            }
            save();
            return true;
        }
        return false;
    }

    /** MM-DD strings compare in date order; a season may run over New Year (from after to). */
    static boolean inSeason(String today, String from, String to) {
        if (from.length() != 5 || to.length() != 5) return false;
        return from.compareTo(to) <= 0 ? today.compareTo(from) >= 0 && today.compareTo(to) <= 0
                : today.compareTo(from) >= 0 || today.compareTo(to) <= 0;
    }

    private void save() {
        JSONArray a = new JSONArray();
        try {
            synchronized (picks) {
                for (Recs.Pick p : picks) {
                    a.put(new JSONObject().put("id", p.id).put("title", p.title).put("image", p.backdrop).put("meta", p.meta));
                }
            }
            try (FileOutputStream out = new FileOutputStream(listFile)) {
                out.write(a.toString().getBytes(StandardCharsets.UTF_8));
            }
            try (FileOutputStream out = new FileOutputStream(kindFile)) {
                out.write(kind()[0].getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            AppLog.w("art: save: " + e.getMessage());
        }
    }

    private void load() {
        try {
            JSONArray a = new JSONArray(new String(java.nio.file.Files.readAllBytes(listFile.toPath()), StandardCharsets.UTF_8));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Recs.Pick p = new Recs.Pick();
                p.kind = "art";
                p.id = o.optInt("id");
                p.title = o.optString("title");
                p.backdrop = o.optString("image");
                p.meta = o.optString("meta");
                p.gentle = true;
                picks.add(p);
            }
        } catch (Exception | LinkageError e) {
            // Nothing yet: the first refresh fills it.
        }
    }

    /** Framed pictures no longer in today's set are deleted, so the cache never grows. */
    private void tidy() {
        java.util.Set<String> keep = new java.util.HashSet<>();
        synchronized (picks) { for (Recs.Pick p : picks) keep.add(file(p).getName()); }
        File[] all = dir.listFiles();
        if (all != null) for (File f : all) if (!keep.contains(f.getName())) f.delete();
    }

    private File file(Recs.Pick p) {
        // "-fill": the paintings filling the screen (the ones on a wall are tidied away and drawn again).
        return new File(dir, p.id + "-fill.jpg");
    }

    // MARK: - Framing

    /** Downloads the painting (or a season's picture) and crops it to fill the screen, saved as a 16:9 JPEG. */
    private void frame(Recs.Pick p) throws Exception {
        byte[] bytes;
        if (p.backdrop.startsWith("http")) {
            bytes = download(p.backdrop);
        } else {
            try {
                bytes = download(IIIF + p.backdrop + "/full/1686,/0/default.jpg");
            } catch (Exception e) {
                bytes = download(IIIF + p.backdrop + "/full/843,/0/default.jpg");   // the size the museum always serves
            }
        }
        fill(p, bytes);
    }

    /** Scaled to fill the screen, centred, the edges cropped. */
    private void fill(Recs.Pick p, byte[] bytes) throws Exception {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inPreferredConfig = Bitmap.Config.RGB_565;
        Bitmap art = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o);
        if (art == null) throw new Exception("unreadable image");
        Bitmap out = Bitmap.createBitmap(W, H, Bitmap.Config.RGB_565);
        try {
            float scale = Math.max((float) W / art.getWidth(), (float) H / art.getHeight());
            float aw = art.getWidth() * scale, ah = art.getHeight() * scale;
            new Canvas(out).drawBitmap(art, null, new RectF((W - aw) / 2f, (H - ah) / 2f, (W + aw) / 2f, (H + ah) / 2f),
                    new Paint(Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG));
            File f = file(p), tmp = new File(dir, p.id + ".part");
            try (FileOutputStream fo = new FileOutputStream(tmp)) {
                out.compress(Bitmap.CompressFormat.JPEG, 90, fo);
            }
            if (!tmp.renameTo(f)) throw new Exception("could not save");
        } finally {
            art.recycle();
            out.recycle();
        }
    }

    private static String read(String url) throws Exception {
        return new String(download(url), StandardCharsets.UTF_8);
    }

    private static byte[] download(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15_000);
        c.setReadTimeout(30_000);
        // The museum asks API users to say who they are.
        c.setRequestProperty("AIC-User-Agent", "Beyond TV (gobeyond.co.nz)");
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                for (int n; (n = in.read(buf)) > 0; ) b.write(buf, 0, n);
                return b.toByteArray();
            }
        } finally {
            c.disconnect();
        }
    }

    private void notifyListeners() {
        main.post(() -> { for (Recs.Listener l : new ArrayList<>(listeners)) l.onRecs(); });
    }
}
