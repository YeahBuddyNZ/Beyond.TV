package nz.gobeyond.tv;

import android.content.Context;
import android.content.pm.PackageManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Picks for kids: for a kid watching, the cards are good shows and films matched to what they're into, instead of
 * whatever is trending. What they're into comes from Beyond Family (what a grown-up set, then what the kid picked
 * themselves). A short list chosen by hand of shows that are each service's own, so they stay put: no TMDB key needed,
 * and only the ones on an app the TV has. Same lists and order as web/kidpicks.js: change one, change both.
 */
final class KidPicks {
    private KidPicks() {}

    /** id, emoji, then the name in Portuguese, English and Spanish. The same ids as Beyond Family's TV_LIKES. */
    static final String[][] LIKES = {
        {"animals", "🐾", "Animais", "Animals", "Animales"},
        {"dinos", "🦖", "Dinossauros", "Dinosaurs", "Dinosaurios"},
        {"space", "🚀", "Espaço", "Space", "El espacio"},
        {"sport", "⚽", "Esporte", "Sport", "Deporte"},
        {"music", "🎵", "Música", "Music", "Música"},
        {"drawing", "🎨", "Desenhar", "Drawing", "Dibujar"},
        {"games", "🎮", "Jogos", "Games", "Juegos"},
        {"magic", "✨", "Magia", "Magic", "Magia"},
        {"cars", "🏎️", "Carros", "Cars", "Coches"},
        {"funny", "😂", "Coisas engraçadas", "Funny stuff", "Cosas graciosas"},
        {"building", "🧱", "Construir", "Building", "Construir"},
        {"ocean", "🐳", "O mar", "The ocean", "El mar"}
    };

    /** title, kind, app, then the likes it suits. */
    private static final String[][] SHOWS = {
        {"Bluey", "tv", "disney", "funny", "animals"},
        {"Gigantosaurus", "tv", "disney", "dinos"},
        {"The Good Dinosaur", "movie", "disney", "dinos", "animals"},
        {"Finding Nemo", "movie", "disney", "ocean", "animals", "funny"},
        {"Moana", "movie", "disney", "ocean", "music", "magic"},
        {"Luca", "movie", "disney", "ocean", "magic"},
        {"Secrets of the Whales", "tv", "disney", "ocean", "animals"},
        {"Cars", "movie", "disney", "cars", "sport", "funny"},
        {"Cars on the Road", "tv", "disney", "cars", "funny"},
        {"Toy Story", "movie", "disney", "funny", "building"},
        {"WALL-E", "movie", "disney", "space", "building"},
        {"Lightyear", "movie", "disney", "space"},
        {"Encanto", "movie", "disney", "music", "magic"},
        {"Coco", "movie", "disney", "music", "drawing"},
        {"Frozen", "movie", "disney", "magic", "music"},
        {"Zootopia", "movie", "disney", "animals", "funny"},
        {"Big Hero 6", "movie", "disney", "building", "games"},
        {"Wreck-It Ralph", "movie", "disney", "games", "cars", "funny"},
        {"Inside Out", "movie", "disney", "funny"},
        {"Cool Runnings", "movie", "disney", "sport", "funny"},
        {"The Mighty Ducks: Game Changers", "tv", "disney", "sport"},
        {"Jurassic World: Camp Cretaceous", "tv", "netflix", "dinos"},
        {"Ridley Jones", "tv", "netflix", "dinos", "animals"},
        {"Octonauts: Above & Beyond", "tv", "netflix", "ocean", "animals"},
        {"Our Planet", "tv", "netflix", "animals", "ocean"},
        {"StoryBots: Answer Time", "tv", "netflix", "space", "funny", "music"},
        {"The Magic School Bus Rides Again", "tv", "netflix", "space", "building", "magic"},
        {"Ada Twist, Scientist", "tv", "netflix", "building", "space"},
        {"Hilda", "tv", "netflix", "magic", "drawing", "animals"},
        {"Gabby's Dollhouse", "tv", "netflix", "magic", "drawing"},
        {"Karma's World", "tv", "netflix", "music"},
        {"Spirit Riding Free", "tv", "netflix", "animals", "sport"},
        {"Sonic Prime", "tv", "netflix", "games"},
        {"Leo", "movie", "netflix", "animals", "funny", "music"},
        {"The Mitchells vs. the Machines", "movie", "netflix", "funny", "games", "cars"},
        {"Klaus", "movie", "netflix", "magic", "drawing"},
        {"The Sea Beast", "movie", "netflix", "ocean", "magic"},
        {"Over the Moon", "movie", "netflix", "space", "music"},
        {"Chicken Run: Dawn of the Nugget", "movie", "netflix", "funny", "animals", "building"},
        {"Pete the Cat", "tv", "prime", "music", "funny", "animals"},
        {"Tumble Leaf", "tv", "prime", "building", "animals"},
        {"If You Give a Mouse a Cookie", "tv", "prime", "funny", "animals"},
        {"Snoopy in Space", "tv", "appletv", "space", "funny"},
        {"The Snoopy Show", "tv", "appletv", "funny", "animals", "sport"},
        {"Fraggle Rock: Back to the Rock", "tv", "appletv", "music", "funny"},
        {"Helpsters", "tv", "appletv", "building"},
        {"Wolfwalkers", "movie", "appletv", "magic", "animals", "drawing"}
    };

    /** The app for each service, with Sony's own Apple TV build as a second choice. */
    private static final String[][] APPS = {
        {"disney", "com.disney.disneyplus"},
        {"netflix", "com.netflix.ninja"},
        {"prime", "com.amazon.amazonvideo.livingroom"},
        {"appletv", "com.apple.atve.androidtv.appletv"},
        {"appletv", "com.apple.atve.sony.appletv"}
    };

    private static String[] like(String id) {
        for (String[] l : LIKES) if (l[0].equals(id)) return l;
        return null;
    }

    /** "animals" after "Because you love "; German keeps its nouns capitalised. */
    private static String name(String[] like) {
        String n = Ui.tr(like[2], like[3], like[4]);
        return Ui.de ? n : n.toLowerCase(Ui.locale());
    }

    /** A number that changes once a day, so the order shifts each morning but holds all day. */
    private static long spin(String text, long day) {
        long h = day;
        for (int i = 0; i < text.length(); i++) h = (h * 31 + text.charAt(i)) % 100003;
        return h;
    }

    /**
     * The cards for a kid watching, or null when it isn't a kid or nobody has said what they're into (then the usual
     * picks show). kind: "movie", "tv" or null for both.
     */
    static List<Recs.Pick> cards(Context c, String kind) {
        People.Person me = People.current(c);
        if (me == null || !me.kid) return null;
        List<String> likes = new ArrayList<>();
        for (String id : Family.likes(me.id)) if (like(id) != null && !likes.contains(id)) likes.add(id);
        if (likes.isEmpty()) return null;
        long now = System.currentTimeMillis();
        long day = (now + TimeZone.getDefault().getOffset(now)) / 86400000L;
        Map<String, String> apps = new HashMap<>();
        PackageManager pm = c.getPackageManager();
        for (String[] a : APPS) {
            if (!apps.containsKey(a[0]) && HomeApps.launchIntent(pm, a[1]) != null) apps.put(a[0], a[1]);
        }
        List<Recs.Pick> list = new ArrayList<>();
        List<Long> scores = new ArrayList<>();
        for (String[] s : SHOWS) {
            String pkg = apps.get(s[2]);
            if (pkg == null || (kind != null && !kind.equals(s[1]))) continue;
            List<String> hits = new ArrayList<>();
            for (int j = 3; j < s.length; j++) if (likes.contains(s[j])) hits.add(s[j]);
            if (hits.isEmpty()) continue;
            // Every like gets a turn at the front: the one this card is "because of" rotates by the day.
            String[] why = like(hits.get((int) (day % hits.size())));
            Recs.Pick p = new Recs.Pick();
            p.id = ("kid:" + s[0]).hashCode();
            p.kind = s[1];
            p.title = s[0];
            p.app = s[2];
            p.pkg = pkg;
            p.gentle = true;
            p.emoji = why[1];
            p.colour = me.colour;
            p.meta = Ui.tr("Porque você gosta de ", "Because you love ", "Porque te gusta ")
                    + name(why) + " · " + Recs.serviceName(p);
            long score = hits.size() * 1000L + spin(s[0], day) % 1000;
            int at = 0;
            while (at < scores.size() && scores.get(at) >= score) at++;
            scores.add(at, score);
            list.add(at, p);
        }
        return list.isEmpty() ? null : new ArrayList<>(list.subList(0, Math.min(3, list.size())));
    }

    /** Whether a kid watching has picks of their own, so the picks tabs show even without a TMDB key. */
    static boolean any(Context c) {
        return cards(c, null) != null;
    }
}
