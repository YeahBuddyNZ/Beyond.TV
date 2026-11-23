package nz.gobeyond.tv;

import java.util.Calendar;

/**
 * When the tidy-up alarm goes off next (ADR 0064): at its time, on the days a grown-up ticked in Beyond Family, never
 * on a day while they're away. Plain Java, no Android, so tests/TidyDaysTest.java runs it. Same rules as web/tidy.js
 * (Tidy.rules).
 */
final class TidyDays {
    /** Nobody pressed a button this long after the alarm: the TV turns itself back off. */
    static final long OFF_AFTER = 5 * 60_000L;

    private TidyDays() {}

    /** Ticked days, 0 Sunday to 6 Saturday (Beyond Family's numbers). Null or empty means every day: older settings. */
    static boolean[] days(int[] list) {
        boolean[] on = new boolean[7];
        if (list == null || list.length == 0) {
            java.util.Arrays.fill(on, true);
            return on;
        }
        for (int d : list) if (d >= 0 && d <= 6) on[d] = true;
        return on;
    }

    /** 2026-11-23 for a Calendar's own day. */
    static String day(Calendar c) {
        return String.format(java.util.Locale.ROOT, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** True when the alarm goes off on that Calendar's day: a ticked day, and after any time away. */
    static boolean goesOff(Calendar c, boolean[] days, String awayUntil) {
        if (!days[c.get(Calendar.DAY_OF_WEEK) - 1]) return false;   // Calendar.SUNDAY is 1
        return awayUntil == null || awayUntil.isEmpty() || day(c).compareTo(awayUntil) > 0;
    }

    /**
     * The next alarm after `now` (a moment later counts as next, so firing doesn't book itself again), or 0 when none
     * falls in the next year. `now` is a Calendar in the TV's own time zone; it isn't changed.
     */
    static long next(Calendar now, int hour, int minute, boolean[] days, String awayUntil) {
        Calendar c = (Calendar) now.clone();
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        long after = now.getTimeInMillis() + 5_000;
        for (int i = 0; i < 400; i++) {
            if (c.getTimeInMillis() > after && goesOff(c, days, awayUntil)) return c.getTimeInMillis();
            c.add(Calendar.DAY_OF_MONTH, 1);
            c.set(Calendar.HOUR_OF_DAY, hour);   // the same time of day through a clock change
            c.set(Calendar.MINUTE, minute);
        }
        return 0;
    }
}
