package nz.gobeyond.tv;

import java.util.HashSet;
import java.util.Set;

/** Warm notes (ADR 0066): the same cases as tests/warm.test.js, so the TV and the web app agree. */
public class WarmNotesTest {
    private static int failed, passed;

    private static void check(String name, boolean ok) {
        if (ok) passed++;
        else {
            failed++;
            System.out.println("FAIL " + name);
        }
    }

    public static void main(String[] args) {
        String[] names = {"Dad", "Mum", "Aroha", "Nikau", "Tama"};
        boolean[] kid = {false, false, true, true, true};
        String[] stage = {"", "", "school", "kindy", ""};

        check("order: Mum first", WarmNotes.rank(false, "mum", false) < WarmNotes.rank(false, "", false));
        check("order: grown-ups before kids", WarmNotes.rank(false, "dad", false) < WarmNotes.rank(true, "", false));
        check("order: visitors last", WarmNotes.rank(true, "", false) < WarmNotes.rank(false, "mum", true));

        for (int start = 0; start < 40; start += 5) {
            Set<Integer> seen = new HashSet<>();
            for (int s = start; s < start + names.length; s++) seen.add(WarmNotes.next(names, kid, stage, s, 7, "en").who);
            check("everyone gets a turn from " + start, seen.size() == names.length);
        }
        Set<String> aroha = new HashSet<>(), nikau = new HashSet<>(), tama = new HashSet<>();
        for (int s = 0; s < 500; s++) {
            WarmNotes.Note note = WarmNotes.next(names, kid, stage, s, s / 60, "en");
            String who = names[note.who];
            check("names them " + s, note.text.contains(who));
            for (int k = 0; k < names.length; k++) {
                if (k != note.who && kid[k]) check("no other kid in " + note.text, !note.text.contains(names[k]));
            }
            check("no em dash", note.text.indexOf((char) 0x2014) < 0);
            check("nothing left to fill", note.text.indexOf('{') < 0);
            String line = note.text.replace(who, "*");
            if (note.who == 2) aroha.add(line);
            if (note.who == 3) nikau.add(line);
            if (note.who == 4) tama.add(line);
        }
        check("school line for Aroha", aroha.contains("You're doing amazing at school, *"));
        check("kindy line for Nikau", nikau.contains("Keep up the good work at kindy, *"));
        check("no school line without a stage", !tama.contains("You're doing amazing at school, *"));
        check("a grown-up loves them", tama.contains("Mum loves you, *") && tama.contains("Dad loves you, *"));
        for (Set<String> lines : new Set[] {aroha, nikau, tama}) {
            check("every kind line", lines.contains("Your family loves you heaps, *") && lines.contains("We're so proud of you, *")
                    && lines.contains("A great big hug for you today, *"));
        }
        check("same as the web app", WarmNotes.next(names, kid, stage, 7, 3, "en").text.equals(webNote7));
        check("nobody, no note", WarmNotes.next(new String[0], new boolean[0], new String[0], 0, 0, "en") == null);

        System.out.println(passed + " passed" + (failed > 0 ? ", " + failed + " failed" : ""));
        if (failed > 0) System.exit(1);
    }

    /** What web/warm.js says for step 7, day 3 with the same people (checked by hand against node). */
    private static final String webNote7 = "Keep up the great work at school, Aroha";
}
