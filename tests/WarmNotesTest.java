package nz.gobeyond.tv;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.DoubleSupplier;

/** Warm notes (ADRs 0066 and 0072): the same cases as tests/warm.test.js, so the TV and the web app agree. */
public class WarmNotesTest {
    private static int failed, passed;

    private static void check(String name, boolean ok) {
        if (ok) passed++;
        else {
            failed++;
            System.out.println("FAIL " + name);
        }
    }

    /** The same dice as warm.test.js. */
    private static DoubleSupplier dice(int start) {
        int[] seed = {start};
        return () -> {
            seed[0] = (seed[0] * 1103515245 + 12345) & 0x7fffffff;
            return seed[0] / 2147483648.0;
        };
    }

    private static WarmNotes.Who who(String name, boolean kid, String stage, String[][] awards) {
        return new WarmNotes.Who(name, kid, stage, awards);
    }

    // What warm.test.js says with dice(2026): the two must match.
    static final String WEB_TWIN = "Mum gave you the Reading star award, Aroha / Kind, clever and brave, that's you, Nikau / Put your feet up, Mum. You've earned it / You're doing a great job, Dad / Keep up the great work at school, Aroha / You're doing a great job, Mum / Put your feet up, Dad. You've earned it / Keep up the good work at kindy, Nikau / You got the Reading star award, Aroha / Thanks for all you do, Mum / Kind helper! Well done, Nikau / You make this home a happy one, Dad";

    public static void main(String[] args) {
        WarmNotes.Who[] house = {who("Dad", false, "", null), new WarmNotes.Who("Mum", false, "", null, "mum"), who("Aroha", true, "school", null),
            who("Nikau", true, "kindy", null), who("Tama", true, "", null)};

        check("order: Mum first", WarmNotes.rank(false, "mum", false) < WarmNotes.rank(false, "", false));
        check("order: grown-ups before kids", WarmNotes.rank(false, "dad", false) < WarmNotes.rank(true, "", false));
        check("order: visitors last", WarmNotes.rank(true, "", false) < WarmNotes.rank(false, "mum", true));

        WarmNotes.Memory mem = new WarmNotes.Memory();
        DoubleSupplier roll = dice(7);
        int prev = -1;
        String prevText = "";
        Set<String> firsts = new HashSet<>();
        Map<String, Set<String>> lines = new HashMap<>();
        for (int r = 0; r < 200; r++) {
            Set<Integer> seen = new HashSet<>();
            for (int s = 0; s < house.length; s++) {
                WarmNotes.Note note = WarmNotes.next(house, mem, roll, "en");
                String name = house[note.who].name;
                if (s == 0) firsts.add(name);
                check("nobody twice in a row", note.who != prev);
                check("never the same line back to back", !note.text.equals(prevText));
                prev = note.who;
                prevText = note.text;
                seen.add(note.who);
                check("names them", note.text.contains(name));
                for (int k = 0; k < house.length; k++) {
                    if (k != note.who && house[k].kid) check("no other kid in " + note.text, !note.text.contains(house[k].name));
                }
                check("no em dash", note.text.indexOf((char) 0x2014) < 0);
                check("nothing left to fill", note.text.indexOf('{') < 0);
                lines.computeIfAbsent(name, x -> new HashSet<>()).add(note.text.replace(name, "*"));
            }
            check("everyone once in round " + r, seen.size() == house.length);
        }
        check("a different person starts the rounds", firsts.size() == house.length);
        check("school line for Aroha", lines.get("Aroha").contains("You're doing amazing at school, *"));
        check("kindy line for Nikau", lines.get("Nikau").contains("Keep up the good work at kindy, *"));
        check("no school line without a stage", !lines.get("Tama").contains("You're doing amazing at school, *"));
        check("a grown-up loves them", lines.get("Tama").contains("Mum loves you, *") && lines.get("Tama").contains("Dad loves you, *"));
        for (String n : new String[] {"Aroha", "Nikau", "Tama"}) {
            Set<String> l = lines.get(n);
            check(n + " gets every kind line", l.contains("Your family loves you heaps, *") && l.contains("We're so proud of you, *")
                    && l.contains("A great big hug for you today, *") && l.contains("High five, *!"));
            check(n + " never gets a grown-up line", !l.contains("You're doing a great job, *"));
        }
        check("Mum is the queen of the house", lines.get("Mum").contains("Queen of the house: *"));
        check("only Mum gets the mum lines", !lines.get("Dad").contains("Queen of the house: *"));
        check("grown-ups get thanks", lines.get("Mum").contains("Thanks for all you do, *"));

        WarmNotes.Who[] awarded = {who("Dad", false, "", null), who("Mum", false, "", null),
            who("Aroha", true, "school", new String[][] {{"Reading star", "Mum", "So proud of all that reading"}}),
            who("Nikau", true, "kindy", new String[][] {{"Kind helper", "", ""}})};
        WarmNotes.Memory mem4 = new WarmNotes.Memory();
        DoubleSupplier r4 = dice(11);
        Set<String> got = new HashSet<>();
        for (int a = 0; a < 400; a++) got.add(WarmNotes.next(awarded, mem4, r4, "en").text);
        check("award line", got.contains("You got the Reading star award, Aroha"));
        check("award from Mum", got.contains("Mum gave you the Reading star award, Aroha"));
        check("award note", got.contains("Aroha, from Mum: So proud of all that reading"));
        check("award with nobody named", got.contains("Kind helper! Well done, Nikau"));

        check("badge", WarmNotes.badge("Reading star", "\uD83D\uDCDA", "2026-11-20", "2026-11-24").equals("\uD83D\uDCDA Reading star"));
        check("badge without emoji", WarmNotes.badge("Kind helper", "", "2026-11-24", "2026-11-24").equals("\uD83C\uDFC5 Kind helper"));
        check("old badge goes", WarmNotes.badge("Reading star", "", "2026-11-01", "2026-11-24").isEmpty());

        WarmNotes.Memory twin = new WarmNotes.Memory();
        DoubleSupplier r5 = dice(2026);
        StringBuilder said = new StringBuilder();
        for (int q = 0; q < 12; q++) said.append(q == 0 ? "" : " / ").append(WarmNotes.next(awarded, twin, r5, "en").text);
        check("same as the web app: " + said, said.toString().equals(WEB_TWIN));
        check("nobody, no note", WarmNotes.next(new WarmNotes.Who[0], new WarmNotes.Memory(), dice(1), "en") == null);

        System.out.println(passed + " passed" + (failed > 0 ? ", " + failed + " failed" : ""));
        if (failed > 0) System.exit(1);
    }
}
