package nz.gobeyond.tv;

/**
 * Warm notes on Who's watching (ADR 0066): one kind line at a time, for one person at a time, so the screen says
 * something lovely while somebody picks. Plain Java with no Android in it, so CI runs it (tests/WarmNotesTest.java).
 * The twin is web/warm.js: change one, change both.
 *
 * Fair by design: everyone gets a turn in order before anybody gets a second, and every kid draws from the same kind
 * lines, so no child is ever singled out over another. A kid at kindy, school or college also gets lines about that.
 * "{n}" is the person, "{g}" a grown-up of the house (each in turn), never invented.
 */
final class WarmNotes {
    private WarmNotes() {}

    static final String KINDY = "kindy", SCHOOL = "school", COLLEGE = "college";

    /** One note: whose it is (an index into the people given) and what it says. */
    static final class Note {
        final int who;
        final String text;

        Note(int who, String text) {
            this.who = who;
            this.text = text;
        }
    }

    // Each line in Portuguese, English, Spanish, German and Russian, in that order.
    private static final String[][] KID = {
        {"Sua família te ama muito, {n}", "Your family loves you heaps, {n}", "Tu familia te quiere muchísimo, {n}",
            "Deine Familie hat dich riesig lieb, {n}", "Твоя семья очень тебя любит, {n}"},
        {"Temos muito orgulho de você, {n}", "We're so proud of you, {n}", "Estamos muy orgullosos de ti, {n}",
            "Wir sind so stolz auf dich, {n}", "Мы так гордимся тобой, {n}"},
        {"Você deixa esta casa mais feliz, {n}", "You make this home brighter, {n}", "Haces este hogar más alegre, {n}",
            "Mit dir ist unser Zuhause heller, {n}", "С тобой наш дом светлее, {n}"},
        {"Gentil, esperto e corajoso: assim é você, {n}", "Kind, clever and brave, that's you, {n}", "Amable, listo y valiente, así eres tú, {n}",
            "Lieb, klug und mutig, das bist du, {n}", "Добрый, умный и смелый, это ты, {n}"},
        {"Um abraço bem grande para você hoje, {n}", "A great big hug for you today, {n}", "Un abrazo enorme para ti hoy, {n}",
            "Eine riesige Umarmung für dich heute, {n}", "Крепко обнимаем тебя сегодня, {n}"},
    };
    /** Only when the house has a grown-up to name. */
    private static final String[] LOVED_BY = {"{g} te ama, {n}", "{g} loves you, {n}", "{g} te quiere, {n}",
        "{g} hat dich lieb, {n}", "{g} любит тебя, {n}"};
    private static final String[][] AT_KINDY = {
        {"Continue o ótimo trabalho na escolinha, {n}", "Keep up the good work at kindy, {n}", "Sigue así de bien en el kínder, {n}",
            "Mach weiter so toll im Kindergarten, {n}", "Так держать в садике, {n}"},
        {"Você está aprendendo tanto na escolinha, {n}", "You're learning so much at kindy, {n}", "Estás aprendiendo muchísimo en el kínder, {n}",
            "Du lernst so viel im Kindergarten, {n}", "Ты столькому учишься в садике, {n}"},
    };
    private static final String[][] AT_SCHOOL = {
        {"Você está indo muito bem na escola, {n}", "You're doing amazing at school, {n}", "Lo estás haciendo genial en el cole, {n}",
            "Du machst das super in der Schule, {n}", "Ты отлично справляешься в школе, {n}"},
        {"Continue o ótimo trabalho na escola, {n}", "Keep up the great work at school, {n}", "Sigue con el buen trabajo en el cole, {n}",
            "Mach weiter so in der Schule, {n}", "Так держать в школе, {n}"},
    };
    private static final String[][] AT_COLLEGE = {
        {"Orgulho de como você se esforça na escola, {n}", "Proud of how hard you work at college, {n}", "Orgullosos de lo mucho que te esfuerzas en el instituto, {n}",
            "Stolz, wie fleißig du in der Schule bist, {n}", "Гордимся тем, как ты стараешься в школе, {n}"},
        {"Você consegue, {n}. Estamos com você", "You've got this, {n}. We're right behind you", "Tú puedes, {n}. Estamos contigo",
            "Du schaffst das, {n}. Wir stehen hinter dir", "У тебя всё получится, {n}. Мы с тобой"},
    };
    private static final String[][] GROWN_UP = {
        {"Obrigado por tudo que você faz, {n}", "Thanks for all you do, {n}", "Gracias por todo lo que haces, {n}",
            "Danke für alles, was du tust, {n}", "Спасибо за всё, что ты делаешь, {n}"},
        {"Você está fazendo um ótimo trabalho, {n}", "You're doing a great job, {n}", "Lo estás haciendo genial, {n}",
            "Du machst das großartig, {n}", "Ты отлично справляешься, {n}"},
        {"Esta família tem sorte de ter você, {n}", "This family is lucky to have you, {n}", "Esta familia tiene suerte de tenerte, {n}",
            "Diese Familie hat Glück, dich zu haben, {n}", "Этой семье повезло, что ты есть, {n}"},
    };

    private static int lang(String language) {
        if ("en".equals(language)) return 1;
        if ("es".equals(language)) return 2;
        if ("de".equals(language)) return 3;
        if ("ru".equals(language)) return 4;
        return "pt".equals(language) ? 0 : 1;
    }

    /**
     * The note for this step. names, kid and stage describe the people in the order they're shown (Family left out).
     * step counts up by one for each note; day is any number that changes once a day, so the lines move on daily.
     * Returns null when there's nobody to write to.
     */
    static Note next(String[] names, boolean[] kid, String[] stage, int step, int day, String language) {
        int n = names == null ? 0 : names.length;
        if (n == 0) return null;
        step = Math.max(0, step);
        int who = step % n, round = step / n, l = lang(language);
        String name = names[who];
        if (!kid[who]) {
            String[] line = GROWN_UP[Math.floorMod(round + day + who, GROWN_UP.length)];
            return new Note(who, line[l].replace("{n}", name));
        }
        // Grown-ups of the house to name in "{g} loves you", each in turn.
        int grownUps = 0;
        for (int i = 0; i < n; i++) if (!kid[i]) grownUps++;
        String[][] at = KINDY.equals(stage[who]) ? AT_KINDY : SCHOOL.equals(stage[who]) ? AT_SCHOOL
                : COLLEGE.equals(stage[who]) ? AT_COLLEGE : new String[0][];
        int pool = KID.length + at.length + (grownUps > 0 ? 1 : 0);
        int pick = Math.floorMod(round + day + who, pool);
        String text;
        if (pick < KID.length) text = KID[pick][l];
        else if (pick < KID.length + at.length) text = at[pick - KID.length][l];
        else {
            int g = Math.floorMod(round + who, grownUps), seen = 0;
            String grown = "";
            for (int i = 0; i < n; i++) {
                if (kid[i]) continue;
                if (seen++ == g) grown = names[i];
            }
            text = LOVED_BY[l].replace("{g}", grown);
        }
        return new Note(who, text.replace("{n}", name));
    }

    /**
     * Who's watching order: grown-ups first with Mum leading, then the kids, and visitors from other homes after the
     * household. Sort by this, stably, so otherwise nobody jumps about. Twin of Warm.order in web/warm.js.
     */
    static int rank(boolean kid, String parent, boolean visitor) {
        return (visitor ? 3 : 0) + (kid ? 2 : "mum".equals(parent) ? 0 : 1);
    }
}
