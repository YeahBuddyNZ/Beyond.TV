package nz.gobeyond.tv;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Karaoke's Take turns (ADR 0057): the same cases as tests/karaoke.test.js, so the TV and the web app agree. */
public class KaraokeTurnsTest {
    private static int failed, passed;

    private static void check(String name, boolean ok) {
        if (ok) passed++;
        else {
            failed++;
            System.out.println("FAIL " + name);
        }
    }

    private static KaraokeTurns.Request r(String name, String title) { return new KaraokeTurns.Request(name, title); }

    private static String names(List<KaraokeTurns.Request> list) {
        StringBuilder b = new StringBuilder();
        for (KaraokeTurns.Request x : list) b.append(b.length() == 0 ? "" : " ").append(x.name.isEmpty() ? "*" : x.name).append(':').append(x.title);
        return b.toString();
    }

    private static List<KaraokeTurns.Request> list(KaraokeTurns.Request... rs) {
        List<KaraokeTurns.Request> l = new ArrayList<>();
        for (KaraokeTurns.Request x : rs) l.add(x);
        return l;
    }

    public static void main(String[] args) {
        Map<String, Integer> none = new HashMap<>();
        check("empty list has no next", KaraokeTurns.nextIndex(new ArrayList<>(), none) == -1);
        List<KaraokeTurns.Request> asked = list(r("Aroha", "Royals"), r("Aroha", "Happy"), r("Aroha", "Poi E"), r("Nikau", "Let It Go"),
                r("Mum", "Dancing Queen"));
        check("nobody sings twice until everyone has", names(KaraokeTurns.order(asked, none))
                .equals("Aroha:Royals Nikau:Let It Go Mum:Dancing Queen Aroha:Happy Aroha:Poi E"));
        Map<String, Integer> had = new HashMap<>();
        had.put("aroha", 2);
        had.put("nikau", 1);
        check("whoever has sung least goes first", names(KaraokeTurns.order(asked, had))
                .equals("Mum:Dancing Queen Nikau:Let It Go Aroha:Royals Aroha:Happy Aroha:Poi E"));
        Map<String, Integer> tie = new HashMap<>();
        tie.put("nikau", 1);
        tie.put("mum", 1);
        check("ties go to whoever asked first", KaraokeTurns.nextIndex(list(r("Nikau", "A"), r("Mum", "B")), tie) == 0);
        check("names match whatever the case", names(KaraokeTurns.order(list(r("aroha", "A"), r("Aroha", "B"), r("Nikau", "C")), none))
                .equals("aroha:A Nikau:C Aroha:B"));
        check("everyone together is a singer of its own", names(KaraokeTurns.order(list(r("", "Sing-along"), r("", "Another"), r("Dad", "Royals")), none))
                .equals("*:Sing-along Dad:Royals *:Another"));

        List<KaraokeTurns.Request> night = new ArrayList<>();
        Map<String, Integer> sung = new HashMap<>();
        KaraokeTurns.Request a = r("Aroha", "Royals"), b = r("Aroha", "Happy"), c = r("Nikau", "Let It Go"), d = r("Mum", "Dancing Queen");
        night.add(a);
        check("first one asked is up next", KaraokeTurns.place(night, sung, a) == 1);
        night.add(b);
        check("a second song by the same singer waits", KaraokeTurns.place(night, sung, b) == 2);
        night.add(c);
        check("somebody new goes ahead of a second song", KaraokeTurns.place(night, sung, c) == 2);
        KaraokeTurns.Request first = KaraokeTurns.take(night, sung);
        check("take gives the next turn", first == a);
        night.add(d);
        check("a latecomer goes ahead of a second go", KaraokeTurns.place(night, sung, d) == 2
                && names(KaraokeTurns.order(night, sung)).equals("Nikau:Let It Go Mum:Dancing Queen Aroha:Happy"));
        KaraokeTurns.drop(night, sung, 1);
        check("drop takes out the one picked", names(KaraokeTurns.order(night, sung)).equals("Nikau:Let It Go Aroha:Happy"));
        KaraokeTurns.take(night, sung);
        KaraokeTurns.take(night, sung);
        check("empty once everyone has sung", KaraokeTurns.take(night, sung) == null && night.isEmpty());

        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }
}
