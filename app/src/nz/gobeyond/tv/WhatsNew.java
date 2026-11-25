package nz.gobeyond.tv;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * What's new (ADR 0076): docs/whats-new.json on GitHub Pages, the newest thing first. The home screen says the newest
 * one in Today at home until someone opens What's new (WhatsNewActivity, in the drawer's shortcuts), for three weeks
 * at most. Fetched at most twice a day, off the UI thread, and kept for when the internet is down. Nothing is sent.
 * Same rules as web/whatsnew.js (tests/whatsnew.test.js).
 */
final class WhatsNew {
    private WhatsNew() {}

    static final String URL = "https://yeahbuddynz.github.io/Beyond.TV/whats-new.json";
    static final int FRESH_DAYS = 21;
    static final int SHOW = 6;
    private static final long EVERY = 12 * 3600_000L;
    private static final long DAY = 86_400_000L;

    static final class Item {
        String id, date, title, line;
    }

    private static volatile boolean fetching;

    private static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences("whatsnew", Context.MODE_PRIVATE);
    }

    /** Fetches the list again in the background if it's been half a day. Cheap to call often. */
    static void refresh(Context c) {
        final SharedPreferences sp = sp(c);
        if (fetching || System.currentTimeMillis() - sp.getLong("at", 0) < EVERY) return;
        fetching = true;
        new Thread(() -> {
            try {
                String json = Http.get(URL + "?d=" + System.currentTimeMillis() / EVERY, "application/json", 256 * 1024);
                if (!parse(json).isEmpty()) sp.edit().putString("json", json).apply();
            } catch (Exception e) {
                AppLog.w("What's new: fetch failed, " + e.getClass().getSimpleName());
            } finally {
                sp.edit().putLong("at", System.currentTimeMillis()).apply();
                fetching = false;
            }
        }, "whatsnew").start();
    }

    /** The kept list, newest first, in the TV's language (English where a language is missing). */
    static List<Item> items(Context c) {
        String json = sp(c).getString("json", "");
        // Read every 15 s by the home screen: parsed again only when the list or the language changed.
        synchronized (WhatsNew.class) {
            if (!json.equals(keptJson) || !Ui.language.equals(keptLang)) {
                kept = parse(json);
                keptJson = json;
                keptLang = Ui.language;
            }
            return new ArrayList<>(kept);
        }
    }

    private static List<Item> kept = new ArrayList<>();
    private static String keptJson = null, keptLang = "";

    private static List<Item> parse(String json) {
        List<Item> out = new ArrayList<>();
        try {
            JSONArray list = new JSONObject(json).getJSONArray("items");
            for (int i = 0; i < list.length(); i++) {
                JSONObject x = list.optJSONObject(i);
                if (x == null) continue;
                String id = x.optString("id", ""), date = x.optString("date", "");
                JSONArray w = x.optJSONArray(Ui.language);
                if (w == null || w.optString(0, "").isEmpty()) w = x.optJSONArray("en");
                if (id.isEmpty() || !date.matches("\\d{4}-\\d{2}-\\d{2}") || w == null || w.optString(0, "").isEmpty()) continue;
                Item it = new Item();
                it.id = id;
                it.date = date;
                it.title = w.optString(0, "");
                it.line = w.optString(1, "");
                out.add(it);
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    /** The Today at home row ({emoji, what, more, symbol}), or null: the newest, unseen, under three weeks old. */
    static String[] row(Context c) {
        List<Item> list = items(c);
        if (list.isEmpty()) return null;
        Item top = list.get(0);
        if (top.id.equals(sp(c).getString("seen", ""))) return null;
        long age = System.currentTimeMillis() - day(top);
        if (age < -DAY || age > FRESH_DAYS * DAY) return null;
        return new String[] {"✨", Ui.tr("Novo", "New", "Nuevo") + ": " + top.title, top.line, ""};
    }

    /** Opening What's new counts as seen, so the home screen line goes. */
    static void seen(Context c) {
        List<Item> list = items(c);
        if (!list.isEmpty()) sp(c).edit().putString("seen", list.get(0).id).apply();
    }

    /** Midday on the item's date, on the TV's clock. */
    private static long day(Item it) {
        String[] p = it.date.split("-");
        Calendar at = Calendar.getInstance();
        at.clear();
        at.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 12, 0, 0);
        return at.getTimeInMillis();
    }

    /** "24/11/2026". */
    static String date(Item it) {
        String[] p = it.date.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
    }
}
