package nz.gobeyond.tv;

import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

/**
 * Screen time (ADR 0060), the sums only: each kid's daily limit, what they've used today and a grown-up's extra
 * minutes. A new day starts fresh at midnight on the TV's clock; the limits stay. Plain Java, no Android, so
 * tests/ScreenTimeTest.java runs it. Same rules as ScreenTime.rules in web/screentime.js: change one, change both.
 * Kept on the TV by ScreenTimeService.
 */
final class ScreenTime {
    private ScreenTime() {}

    /** The limits a grown-up can pick, in minutes (0: no limit). */
    static final int[] CHOICES = {0, 30, 60, 90, 120, 180};
    /** The kind warning comes this many minutes before the end; a grown-up's PIN adds MORE. */
    static final int WARN = 5, MORE = 15;
    /** Away longer than this, the TV was most likely off: none of it counts. */
    static final long GAP = 6 * 3600_000L;
    /** The most one stretch can count. */
    static final long STRETCH = 3 * 3600_000L;

    /** One day's record. Times used are in ms; limits and extra in minutes. */
    static final class Day {
        String day = "";
        final Map<String, Integer> limits = new HashMap<>(), extra = new HashMap<>();
        final Map<String, Long> used = new HashMap<>();
        final Map<String, Boolean> warned = new HashMap<>();
    }

    static String day(long t) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(t);
        return String.format(java.util.Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    static long midnight(long t) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(t);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /** Starts a new day when the date has changed (the limits stay). */
    static Day fresh(Day d, long now) {
        if (d == null) d = new Day();
        String today = day(now);
        if (!today.equals(d.day)) {
            d.day = today;
            d.used.clear();
            d.extra.clear();
            d.warned.clear();
        }
        return d;
    }

    /** What a stretch from `from` to `to` counts, in ms: only today's part, none if it was hours (the TV was off). */
    static long counted(long from, long to) {
        if (from <= 0 || to <= from || to - from > GAP) return 0;
        return Math.min(to - Math.max(from, midnight(to)), STRETCH);
    }

    /** Minutes left today: Integer.MAX_VALUE without a limit, never below 0. */
    static int minutesLeft(Day d, String id) {
        Integer limit = d.limits.get(id);
        if (limit == null || limit <= 0) return Integer.MAX_VALUE;
        Integer more = d.extra.get(id);
        Long used = d.used.get(id);
        long ms = (limit + (more == null ? 0 : more)) * 60_000L - (used == null ? 0 : used);
        return (int) Math.max(0, (ms + 59_999) / 60_000);
    }
}
