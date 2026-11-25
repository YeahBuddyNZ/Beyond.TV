package nz.gobeyond.tv;

import java.util.Calendar;

/** When Our week shows (WeekRecap, ADR 0075): the same cases as tests/week.test.js, so the twins agree. */
public class WeekRecapTest {
    static int failed, passed;

    static void check(String name, boolean ok) {
        if (ok) passed++;
        else { failed++; System.out.println("FAIL " + name); }
    }

    static Calendar at(int y, int m, int d, int h) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(y, m - 1, d, h, 0, 0);
        return c;
    }

    public static void main(String[] args) {
        Calendar sun5 = at(2026, 11, 29, 17), sun3 = at(2026, 11, 29, 15), sun9 = at(2026, 11, 29, 21);
        Calendar sat5 = at(2026, 11, 28, 17), mon9 = at(2026, 11, 30, 9), mon12 = at(2026, 11, 30, 12);
        check("Sunday 5 pm opens by itself", WeekRecap.due(sun5, true, "", true));
        check("not before 4", !WeekRecap.due(sun3, true, "", true));
        check("not from 9", !WeekRecap.due(sun9, true, "", true));
        check("only on Sundays", !WeekRecap.due(sat5, true, "", true));
        check("not when turned off", !WeekRecap.due(sun5, false, "", true));
        check("not for one person on their own", !WeekRecap.due(sun5, true, "", false));
        check("once a week", !WeekRecap.due(sun5, true, "2026-11-23", true) && WeekRecap.due(sun5, true, "2026-11-16", true));
        check("a Sunday's week starts the Monday before", WeekRecap.weekOf(sun5).equals("2026-11-23"));
        check("a Monday is its own week", WeekRecap.weekOf(mon9).equals("2026-11-30"));
        check("button on Sundays", WeekRecap.button(sun3) && WeekRecap.button(sun9));
        check("button on Monday mornings", WeekRecap.button(mon9) && !WeekRecap.button(mon12));
        check("no button on a Saturday", !WeekRecap.button(sat5));
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }
}
