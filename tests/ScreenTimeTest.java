package nz.gobeyond.tv;

import java.util.Calendar;

/** Screen time (ADR 0060): the same cases as tests/screentime.test.js, so the TV and the web app agree. */
public class ScreenTimeTest {
    private static int failed, passed;

    private static void check(String name, boolean ok) {
        if (ok) passed++;
        else {
            failed++;
            System.out.println("FAIL " + name);
        }
    }

    private static long at(int y, int mo, int d, int h, int mi) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(y, mo - 1, d, h, mi, 0);
        return c.getTimeInMillis();
    }

    public static void main(String[] args) {
        long H = 3600_000L, M = 60_000L, evening = at(2026, 11, 23, 18, 0);
        check("choices start with no limit", ScreenTime.CHOICES[0] == 0 && ScreenTime.CHOICES[2] == 60);
        check("day is local", ScreenTime.day(evening).equals("2026-11-23"));

        check("an hour away counts an hour", ScreenTime.counted(evening - H, evening) == H);
        check("nothing for no stretch", ScreenTime.counted(0, evening) == 0 && ScreenTime.counted(evening, evening) == 0);
        check("a long stretch counts 3 hours at most", ScreenTime.counted(evening - 5 * H, evening) == 3 * H);
        check("hours away (TV off) counts nothing", ScreenTime.counted(evening - 7 * H, evening) == 0);
        long justAfter = at(2026, 11, 24, 0, 20);
        check("only today counts after midnight", ScreenTime.counted(justAfter - H, justAfter) == 20 * M);

        ScreenTime.Day d = new ScreenTime.Day();
        d.limits.put("p3", 60);
        d = ScreenTime.fresh(d, evening);
        check("a fresh day keeps the limits", d.limits.get("p3") == 60 && d.day.equals("2026-11-23"));
        check("no limit is endless", ScreenTime.minutesLeft(d, "p4") == Integer.MAX_VALUE);
        check("a full hour left", ScreenTime.minutesLeft(d, "p3") == 60);
        d.used.put("p3", 45 * M + 10_000);
        check("rounds up what is left", ScreenTime.minutesLeft(d, "p3") == 15);
        d.used.put("p3", 2 * H);
        check("never below zero", ScreenTime.minutesLeft(d, "p3") == 0);
        d.extra.put("p3", 15);
        check("a grown-up's extra minutes", ScreenTime.minutesLeft(d, "p3") == 0);
        d.used.put("p3", 60 * M);
        check("extra on top of the limit", ScreenTime.minutesLeft(d, "p3") == 15);
        ScreenTime.Day tomorrow = ScreenTime.fresh(d, evening + 24 * H);
        check("a new day starts fresh", tomorrow.day.equals("2026-11-24") && !tomorrow.used.containsKey("p3")
                && !tomorrow.extra.containsKey("p3") && tomorrow.limits.get("p3") == 60);

        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }
}
