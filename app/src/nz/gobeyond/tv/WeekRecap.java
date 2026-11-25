package nz.gobeyond.tv;

import java.util.Calendar;
import java.util.Locale;

/**
 * When Our week, the Sunday family recap (web/week.js in TableActivity, ADR 0077), shows: its star button on the home
 * screen on Sundays and Monday mornings, and opening by itself the first time the home screen shows on a Sunday
 * between 4 and 9 at night, once a week. The twin of Week.rules.button and Week.rules.due: change one, change both.
 * Plain Java, so the tests run it off a TV.
 */
final class WeekRecap {
    private WeekRecap() {}

    static final int FROM = 16, UNTIL = 21, MONDAY_UNTIL = 12;

    /** The star button: Sundays, and Monday mornings for the week just gone. */
    static boolean button(Calendar now) {
        int d = now.get(Calendar.DAY_OF_WEEK), h = now.get(Calendar.HOUR_OF_DAY);
        return d == Calendar.SUNDAY || (d == Calendar.MONDAY && h < MONDAY_UNTIL);
    }

    /** Open by itself now? Sunday evening, when it's on, there's a family here and it hasn't this week. */
    static boolean due(Calendar now, boolean auto, String shownWeek, boolean family) {
        int h = now.get(Calendar.HOUR_OF_DAY);
        return family && auto && now.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY && h >= FROM && h < UNTIL && !weekOf(now).equals(shownWeek);
    }

    /** The Monday a day falls in, as YYYY-MM-DD: the scoreboard's weeks, Monday to Sunday. */
    static String weekOf(Calendar now) {
        Calendar c = (Calendar) now.clone();
        int back = (c.get(Calendar.DAY_OF_WEEK) + 5) % 7;
        c.add(Calendar.DAY_OF_MONTH, -back);
        return String.format(Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }
}
