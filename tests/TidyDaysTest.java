package nz.gobeyond.tv;

import java.util.Calendar;
import java.util.TimeZone;

/** The tidy-up alarm's days, a time away and the 5 minute turn-off (TidyDays.java, ADR 0064). */
public class TidyDaysTest {
    private static int failed, passed;

    private static void check(String name, boolean ok) {
        if (ok) passed++;
        else { failed++; System.out.println("FAIL " + name); }
    }

    private static Calendar at(int y, int m, int d, int h, int min) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("Pacific/Auckland"));
        c.clear();
        c.set(y, m - 1, d, h, min, 0);
        return c;
    }

    public static void main(String[] args) {
        boolean[] every = TidyDays.days(null), weekdays = TidyDays.days(new int[] {1, 2, 3, 4, 5});
        // Monday 23/11/2026, 6pm.
        Calendar mon = at(2026, 11, 23, 18, 0);
        check("every day: tonight", TidyDays.next(mon, 19, 15, every, null) == at(2026, 11, 23, 19, 15).getTimeInMillis());
        check("past the time: tomorrow", TidyDays.next(at(2026, 11, 23, 20, 0), 19, 15, every, null)
                == at(2026, 11, 24, 19, 15).getTimeInMillis());
        check("firing doesn't book itself again", TidyDays.next(at(2026, 11, 23, 19, 15), 19, 15, every, null)
                == at(2026, 11, 24, 19, 15).getTimeInMillis());
        // Friday 27/11, after the time: weekdays skip to Monday 30/11.
        check("weekdays skip the weekend", TidyDays.next(at(2026, 11, 27, 20, 0), 19, 15, weekdays, null)
                == at(2026, 11, 30, 19, 15).getTimeInMillis());
        check("weekends only", TidyDays.next(mon, 9, 0, TidyDays.days(new int[] {0, 6}), null)
                == at(2026, 11, 28, 9, 0).getTimeInMillis());
        check("away up to and including the 25th", TidyDays.next(mon, 19, 15, every, "2026-11-25")
                == at(2026, 11, 26, 19, 15).getTimeInMillis());
        check("away in the past changes nothing", TidyDays.next(mon, 19, 15, every, "2026-11-01")
                == at(2026, 11, 23, 19, 15).getTimeInMillis());
        check("goesOff on a ticked day", TidyDays.goesOff(mon, weekdays, null));
        check("not on Saturday", !TidyDays.goesOff(at(2026, 11, 28, 19, 15), weekdays, null));
        check("not while away", !TidyDays.goesOff(mon, every, "2026-11-23"));
        check("empty days is every day", TidyDays.days(new int[0])[3]);
        check("bad numbers are ignored", !TidyDays.days(new int[] {9})[0]);
        check("no day at all: none", TidyDays.next(mon, 19, 15, new boolean[7], null) == 0);
        check("five minutes to turn off", TidyDays.OFF_AFTER == 300_000L);
        check("day string", TidyDays.day(mon).equals("2026-11-23"));
        System.out.println("TidyDays: " + passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }
}
