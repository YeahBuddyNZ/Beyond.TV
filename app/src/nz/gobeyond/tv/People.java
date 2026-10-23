package nz.gobeyond.tv;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Who's watching: the people on this TV, the same idea as the LG and Samsung app's profiles (web/profiles.js).
 *  - Family comes first: everyone together. Family-friendly picks only, and the grown-up buttons stay.
 *  - A kids' profile (★) gets the kids' apps on its shelf, family-friendly picks, no HDMI inputs, and needs the
 *    grown-up PIN for Settings, for managing people and for switching to Family or a grown-up.
 *  - From Beyond Family, each person's face (an emoji) and colour come with them, and somebody from another home can
 *    sign in as a visitor (Family.java).
 *  - Kept in the :home process's own preferences. A change bumps Prefs.version, so the home screen draws again.
 */
final class People {
    private People() {}

    static final String FAMILY = "together";
    /** Beyond's people colours (the same as Beyond Family's member swatches and the web app's). */
    static final int[] COLOURS = {0xFF2F7D6D, 0xFFD85A30, 0xFF378ADD, 0xFFE8A33D, 0xFF7A4FD0, 0xFFD6589A, 0xFF2A9DA8, 0xFF55534B};
    /** Apps a kids' profile keeps on its shelf, by package. */
    private static final Pattern KID_APPS = Pattern.compile("youtube\\.tvkids|disney|netflix|plex|abc.*kids|tvnz|nick|cartoon|pbskids|kidoodle|sesame",
            Pattern.CASE_INSENSITIVE);
    /** What a teen gets on top of the kids' apps: YouTube itself (13 is its own minimum age) and music. */
    private static final Pattern TEEN_APPS = Pattern.compile("youtube|spotify|music|tidal|soundcloud", Pattern.CASE_INSENSITIVE);

    static final class Person {
        String id, name;
        /** Their face from Beyond Family (an emoji), drawn instead of the initial. Empty: the initial. */
        String emoji = "";
        int colour;
        boolean kid;
        /** A kid of 13 or more (always also kid): Beyond Family works it out from their birthday and sends only this. */
        boolean teen;
        /** Make it yours: their world behind the home screen (MyWorldActivity.WORLDS id, empty for none), and the
         *  things they love (KidPicks.LIKES ids). */
        String world = "";
        java.util.List<String> loves = new ArrayList<>();
        /** Signed in here from another home through Beyond Family. */
        boolean visitor;

        boolean together() { return FAMILY.equals(id); }

        /** The Beyond Family member id, for people who came from Beyond Family. */
        String member() { return id != null && id.startsWith("bf-") ? id.substring(3) : null; }

        String initial() {
            if (emoji != null && !emoji.isEmpty()) return emoji;
            return name == null || name.isEmpty() ? "?" : name.substring(0, 1).toUpperCase(Locale.ROOT);
        }
    }

    private static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences("people", Context.MODE_PRIVATE);
    }

    /** Everyone on this TV, in order. Never empty: a new TV starts with one grown-up, "Me". */
    static List<Person> list(Context c) {
        List<Person> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(sp(c).getString("list", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Person p = new Person();
                p.id = o.getString("id");
                p.name = o.optString("name");
                p.colour = o.optInt("colour", COLOURS[i % COLOURS.length]);
                p.kid = o.optBoolean("kid");
                p.teen = p.kid && o.optBoolean("teen");
                p.emoji = o.optString("emoji");
                p.world = o.optString("world");
                JSONArray loves = o.optJSONArray("loves");
                for (int j = 0; loves != null && j < loves.length(); j++) p.loves.add(loves.optString(j));
                p.visitor = o.optBoolean("visitor");
                out.add(p);
            }
        } catch (Exception ignored) {
        }
        if (out.isEmpty()) {
            Person me = new Person();
            me.id = "p1";
            me.name = Ui.tr("Eu", "Me");
            me.colour = COLOURS[0];
            out.add(me);
        }
        return out;
    }

    static void save(Context c, List<Person> people) {
        try {
            JSONArray a = new JSONArray();
            for (Person p : people) {
                JSONObject o = new JSONObject().put("id", p.id).put("name", p.name).put("colour", p.colour).put("kid", p.kid);
                if (p.kid && p.teen) o.put("teen", true);
                if (p.emoji != null && !p.emoji.isEmpty()) o.put("emoji", p.emoji);
                if (p.world != null && !p.world.isEmpty()) o.put("world", p.world);
                if (!p.loves.isEmpty()) o.put("loves", new JSONArray(p.loves));
                if (p.visitor) o.put("visitor", true);
                a.put(o);
            }
            SharedPreferences.Editor e = sp(c).edit().putString("list", a.toString());
            String who = sp(c).getString("who", "");
            if (!FAMILY.equals(who) && find(people, who) == null) e.putString("who", people.get(0).id);
            e.apply();
        } catch (Exception ignored) {
        }
        Prefs.version++;
    }

    /** The same people as now, in the same order: nothing for the home screen to redraw. */
    static boolean sameAs(Context c, List<Person> people) {
        List<Person> now = list(c);
        if (now.size() != people.size()) return false;
        for (int i = 0; i < now.size(); i++) {
            Person a = now.get(i), b = people.get(i);
            if (!a.id.equals(b.id) || !a.name.equals(b.name) || a.colour != b.colour || a.kid != b.kid || a.teen != b.teen
                    || !String.valueOf(a.emoji).equals(String.valueOf(b.emoji)) || a.visitor != b.visitor
                    || !String.valueOf(a.world).equals(String.valueOf(b.world)) || !a.loves.equals(b.loves)) return false;
        }
        return true;
    }

    static Person family() {
        Person f = new Person();
        f.id = FAMILY;
        f.name = Ui.tr("Família", "Family");
        f.colour = Glow.VIOLET;
        return f;
    }

    /** Family, then each person: what "Who's watching?" offers (Family only once there's more than one person). */
    static List<Person> choices(Context c) {
        List<Person> people = list(c);
        if (people.size() > 1) people.add(0, family());
        return people;
    }

    static Person find(List<Person> people, String id) {
        for (Person p : people) if (p.id.equals(id)) return p;
        return null;
    }

    static Person current(Context c) {
        List<Person> people = list(c);
        String who = sp(c).getString("who", "");
        if (FAMILY.equals(who) && people.size() > 1) return family();
        Person p = find(people, who);
        return p != null ? p : people.get(0);
    }

    static void use(Context c, String id) {
        sp(c).edit().putString("who", id).putLong("chosenAt", System.currentTimeMillis()).apply();
        Prefs.version++;
    }

    /** They were asked and kept whoever it was. */
    static void asked(Context c) { sp(c).edit().putLong("chosenAt", System.currentTimeMillis()).apply(); }

    static int count(Context c) { return list(c).size(); }

    static boolean kid(Context c) { return current(c).kid; }

    static boolean teen(Context c) {
        Person p = current(c);
        return p.kid && p.teen;
    }

    static boolean together(Context c) { return current(c).together(); }

    /** Family-friendly picks only: a kid watching, or the whole family together. */
    static boolean gentle(Context c) {
        Person p = current(c);
        return p.kid || p.together();
    }

    /** When somebody last picked who's watching (0 = never), so the home screen can ask again after a long break. */
    static long chosenAt(Context c) { return sp(c).getLong("chosenAt", 0); }

    static String newId(List<Person> people) {
        int n = 1;
        while (find(people, "p" + n) != null) n++;
        return "p" + n;
    }

    // MARK: - The grown-up PIN

    static String pin(Context c) { return sp(c).getString("pin", ""); }

    static boolean hasPin(Context c) { return !pin(c).isEmpty(); }

    static void setPin(Context c, String pin) { sp(c).edit().putString("pin", pin == null ? "" : pin).apply(); }

    // MARK: - The kids' shelf

    static boolean kidApp(String pkg) { return pkg != null && KID_APPS.matcher(pkg).find(); }

    /** A teen's shelf: the kids' apps plus YouTube and music. */
    static boolean teenApp(String pkg) { return kidApp(pkg) || pkg != null && TEEN_APPS.matcher(pkg).find(); }
}
