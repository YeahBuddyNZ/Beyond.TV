package nz.gobeyond.tv;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Keep watching: what each person last opened from Beyond TV, newest first. Streaming apps don't share where you're up
 * to, so this is what was opened from here and when (and the show, when it was opened from a pick). Kept on the TV
 * only, per person, never sent anywhere. Same rules as web/watched.js.
 */
final class Watched {
    private static final int KEEP = 30, SHOW_DAYS = 14;

    static final class Item {
        String who = "", pkg = "", name = "", title = "", backdrop = "", link = "";
        long at;
    }

    private Watched() {}

    private static SharedPreferences sp(Context c) {
        return c.getSharedPreferences("watched", Context.MODE_PRIVATE);
    }

    private static List<Item> all(Context c) {
        List<Item> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(sp(c).getString("list", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Item x = new Item();
                x.who = o.optString("who");
                x.pkg = o.optString("pkg");
                x.name = o.optString("name");
                x.title = o.optString("title");
                x.backdrop = o.optString("backdrop");
                x.link = o.optString("link");
                x.at = o.optLong("at");
                if (!x.pkg.isEmpty()) out.add(x);
            }
        } catch (Exception ignored) {
            // A broken list is started again.
        }
        return out;
    }

    /** Something opened: an app (title empty), or a show from a pick with its photo and link. */
    static void add(Context c, String pkg, String name, String title, String backdrop, String link) {
        if (pkg == null || pkg.isEmpty()) return;
        String me = People.current(c).id, t = title == null ? "" : title;
        List<Item> list = all(c);
        JSONArray out = new JSONArray();
        try {
            JSONObject first = new JSONObject();
            first.put("who", me).put("pkg", pkg).put("name", name == null ? "" : name).put("title", t)
                    .put("backdrop", backdrop == null ? "" : backdrop).put("link", link == null ? "" : link)
                    .put("at", System.currentTimeMillis());
            out.put(first);
            for (Item x : list) {
                if (out.length() >= KEEP) break;
                if (x.who.equals(me) && x.pkg.equals(pkg) && x.title.equals(t)) continue;
                out.put(new JSONObject().put("who", x.who).put("pkg", x.pkg).put("name", x.name).put("title", x.title)
                        .put("backdrop", x.backdrop).put("link", x.link).put("at", x.at));
            }
        } catch (Exception e) {
            return;
        }
        sp(c).edit().putString("list", out.toString()).apply();
    }

    /** The current person's last few, from the last fortnight. An app opened plainly is shown once, under its newest. */
    static List<Item> list(Context c, int max) {
        String me = People.current(c).id;
        long since = System.currentTimeMillis() - SHOW_DAYS * 86_400_000L;
        List<Item> out = new ArrayList<>();
        Set<String> apps = new HashSet<>();
        for (Item x : all(c)) {
            if (out.size() >= max) break;
            if (!x.who.equals(me) || x.at < since) continue;
            if (x.title.isEmpty() && !apps.add(x.pkg)) continue;
            out.add(x);
        }
        return out;
    }

    /** "Just now", "2 hours ago", "Last night", "Yesterday", "Tuesday", then the date (DD/MM). */
    static String when(long at) {
        long now = System.currentTimeMillis(), mins = Math.round((now - at) / 60_000.0);
        Calendar day = Calendar.getInstance();
        day.setTimeInMillis(now);
        day.set(Calendar.HOUR_OF_DAY, 0);
        day.set(Calendar.MINUTE, 0);
        day.set(Calendar.SECOND, 0);
        day.set(Calendar.MILLISECOND, 0);
        long startToday = day.getTimeInMillis();
        if (mins < 45) return Ui.tr("Agora há pouco", "Just now", "Hace un momento");
        if (at >= startToday) {
            long h = Math.max(1, Math.round(mins / 60.0));
            return h == 1 ? Ui.tr("Há 1 hora", "An hour ago", "Hace 1 hora")
                    : Ui.tr("Há " + h + " horas", h + " hours ago", "Hace " + h + " horas");
        }
        Calendar then = Calendar.getInstance();
        then.setTimeInMillis(at);
        if (at >= startToday - 86_400_000L) {
            return then.get(Calendar.HOUR_OF_DAY) >= 17 ? Ui.tr("Ontem à noite", "Last night", "Anoche") : Ui.tr("Ontem", "Yesterday", "Ayer");
        }
        if (at >= startToday - 6 * 86_400_000L) {
            String d = new SimpleDateFormat("EEEE", Ui.locale()).format(new Date(at));
            return d.isEmpty() ? d : d.substring(0, 1).toUpperCase(Ui.locale()) + d.substring(1);
        }
        return new SimpleDateFormat("dd/MM", Ui.locale()).format(new Date(at));
    }
}
