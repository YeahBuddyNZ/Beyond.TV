package nz.gobeyond.tv;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Points for the family scoreboard (web/scores.js, ADR 0057) from the parts of the app that aren't in TableActivity's
 * WebView: the tidy-up race (TidyActivity). Kept in files/scores.json on this TV, about ten weeks of it, never sent
 * anywhere. The scoreboard reads them through BeyondTable.scores and adds each one to its own log once.
 */
final class ScoreLog {
    private ScoreLog() {}

    private static final String FILE = "scores.json";
    private static final int MAX = 300;
    private static final long KEEP = 10L * 7 * 24 * 60 * 60 * 1000;

    /** Points for someone in a game. Family, visitors and nobody score nothing. */
    static synchronized void add(Context c, People.Person p, String game, int points) {
        if (p == null || p.id == null || People.FAMILY.equals(p.id) || p.visitor || points == 0) return;
        long now = System.currentTimeMillis();
        JSONArray old = read(c), out = new JSONArray();
        for (int i = 0; i < old.length(); i++) {
            JSONObject e = old.optJSONObject(i);
            if (e != null && now - e.optLong("t") < KEEP) out.put(e);
        }
        try {
            out.put(new JSONObject().put("p", p.id).put("name", p.name == null ? "" : p.name).put("g", game).put("n", points).put("t", now));
        } catch (JSONException e) {
            return;
        }
        JSONArray kept = new JSONArray();
        for (int i = Math.max(0, out.length() - MAX); i < out.length(); i++) kept.put(out.opt(i));
        File tmp = new File(c.getFilesDir(), FILE + ".tmp");
        try (FileOutputStream f = new FileOutputStream(tmp)) {
            f.write(kept.toString().getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            return;
        }
        if (!tmp.renameTo(new File(c.getFilesDir(), FILE))) tmp.delete();
    }

    /** Everything kept, as a JSON array of {p, name, g, n, t}. */
    static synchronized String all(Context c) { return read(c).toString(); }

    private static JSONArray read(Context c) {
        File f = new File(c.getFilesDir(), FILE);
        if (!f.exists()) return new JSONArray();
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] b = new byte[(int) Math.min(f.length(), 256 * 1024)];
            int n = 0, r;
            while (n < b.length && (r = in.read(b, n, b.length - n)) > 0) n += r;
            return new JSONArray(new String(b, 0, n, StandardCharsets.UTF_8));
        } catch (IOException | JSONException e) {
            return new JSONArray();
        }
    }
}
