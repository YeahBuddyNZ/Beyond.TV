package nz.gobeyond.tv;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Karaoke's Take turns (ADR 0059), the rules only: requests in the order they were asked for, and how many turns each
 * singer has had tonight. The next turn goes to whoever has sung least; between them, whoever asked first. Everyone
 * together is a singer of its own. Plain Java, no Android, so tests/KaraokeTurnsTest.java runs it. Same rules as
 * Turns in web/karaoke.js. Kept on the TV by KaraokeActivity.Turns.
 */
final class KaraokeTurns {
    private KaraokeTurns() {}

    /** Most requests waiting at once. */
    static final int MOST = 60;
    /** A list nobody has touched for this long starts fresh. */
    static final long FRESH_FOR = 8 * 3600_000L;

    static final class Request {
        String name = "", colour = "", title = "", artist = "", videoId = "", query = "";

        Request() {}

        Request(String name, String title) {
            this.name = name == null ? "" : name;
            this.title = title == null ? "" : title;
        }
    }

    static String who(Request r) {
        return r == null || r.name == null || r.name.isEmpty() ? "*" : r.name.toLowerCase(Locale.ROOT);
    }

    /** Which request is next: its index, or -1 when the list is empty. */
    static int nextIndex(List<Request> requests, Map<String, Integer> sung) {
        Map<String, Integer> first = new HashMap<>();
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            String k = who(requests.get(i));
            if (!first.containsKey(k)) {
                first.put(k, i);
                keys.add(k);
            }
        }
        int best = -1, bestCount = 0;
        for (String k : keys) {
            Integer had = sung.get(k);
            int count = had == null ? 0 : had;
            int at = first.get(k);
            if (best < 0 || count < bestCount || (count == bestCount && at < best)) {
                best = at;
                bestCount = count;
            }
        }
        return best;
    }

    /** Everyone still waiting, in the order they'll sing. */
    static List<Request> order(List<Request> requests, Map<String, Integer> sung) {
        List<Request> left = new ArrayList<>(requests), out = new ArrayList<>();
        Map<String, Integer> had = new HashMap<>(sung);
        while (!left.isEmpty()) {
            int i = nextIndex(left, had);
            Request r = left.remove(i);
            out.add(r);
            Integer n = had.get(who(r));
            had.put(who(r), n == null ? 1 : n + 1);
        }
        return out;
    }

    /** Where r stands in the line (1 is next), or 0 if it isn't waiting. */
    static int place(List<Request> requests, Map<String, Integer> sung, Request r) {
        List<Request> all = order(requests, sung);
        for (int i = 0; i < all.size(); i++) if (all.get(i) == r) return i + 1;
        return 0;
    }

    /** Takes the next turn off the list and counts it as that singer's go; null when nobody's waiting. */
    static Request take(List<Request> requests, Map<String, Integer> sung) {
        int i = nextIndex(requests, sung);
        if (i < 0) return null;
        Request r = requests.remove(i);
        Integer n = sung.get(who(r));
        sung.put(who(r), n == null ? 1 : n + 1);
        return r;
    }

    /** Takes out the n-th one waiting (0 is next). */
    static void drop(List<Request> requests, Map<String, Integer> sung, int n) {
        List<Request> all = order(requests, sung);
        if (n >= 0 && n < all.size()) requests.remove(all.get(n));
    }
}
