package nz.gobeyond.tv;

import java.util.ArrayList;
import java.util.List;
import java.util.function.DoubleSupplier;

/**
 * Warm notes on Who's watching (ADR 0066, shuffled by ADR 0072): one kind line at a time, for one person at a time,
 * so the screen says something lovely while somebody picks. Plain Java with no Android in it, so CI runs it
 * (tests/WarmNotesTest.java). The twin is web/warm.js: change one, change both.
 *
 * Shuffled, and still fair: everyone gets a turn before anybody gets a second, but in a new order each round, and
 * never the same person twice in a row. Each person's line is picked at random from their own kind lines, skipping
 * the ones they saw lately and the tone of the note just before, so it never says the same thing back to back. The
 * caller keeps the Memory between visits, so opening the screen again carries on instead of starting over.
 *
 * Every kid draws from the same kind lines, so no child is ever singled out over another. A kid at kindy, school or
 * college also gets lines about that, and an award a grown-up gave them in Beyond Family gets lines of its own (and
 * comes up more often while it's new). "{n}" is the person, "{g}" a grown-up of the house, never invented.
 */
final class WarmNotes {
    private WarmNotes() {}

    static final String KINDY = "kindy", SCHOOL = "school", COLLEGE = "college";
    /** How many lines the memory keeps, so a line doesn't come back for a good while. */
    static final int REMEMBER = 60;

    /** One note: whose it is (an index into the people given) and what it says. */
    static final class Note {
        final int who;
        final String text;

        Note(int who, String text) {
            this.who = who;
            this.text = text;
        }
    }

    /** One person as the notes see them. awards: newest first, each {title, from, note} (from and note may be ""). */
    static final class Who {
        final String name, stage, parent;
        final boolean kid;
        final String[][] awards;

        Who(String name, boolean kid, String stage, String[][] awards) {
            this(name, kid, stage, awards, "");
        }

        /** parent: "mum", "dad" or "", as set on this TV. */
        Who(String name, boolean kid, String stage, String[][] awards, String parent) {
            this.parent = parent == null ? "" : parent;
            this.name = name == null ? "" : name;
            this.kid = kid;
            this.stage = stage == null ? "" : stage;
            this.awards = awards == null ? new String[0][] : awards;
        }
    }

    /** What the notes remember between notes and visits: whose turn is left this round, lines said lately, the last
     *  person and the last tone. Only first names in it. */
    static final class Memory {
        final List<String> bag = new ArrayList<>(), recent = new ArrayList<>();
        String last = "", tone = "";
    }

    // Each line: a tone (Love, Proud, Fun, Cheer), then the words in Portuguese, English, Spanish, German and Russian.
    private static final String[][] KID = {
        {"L", "Sua família te ama muito, {n}", "Your family loves you heaps, {n}", "Tu familia te quiere muchísimo, {n}",
            "Deine Familie hat dich riesig lieb, {n}", "Твоя семья очень тебя любит, {n}"},
        {"P", "Temos muito orgulho de você, {n}", "We're so proud of you, {n}", "Estamos muy orgullosos de ti, {n}",
            "Wir sind so stolz auf dich, {n}", "Мы так гордимся тобой, {n}"},
        {"L", "Você deixa esta casa mais feliz, {n}", "You make this home brighter, {n}", "Haces este hogar más alegre, {n}",
            "Mit dir ist unser Zuhause heller, {n}", "С тобой наш дом светлее, {n}"},
        {"P", "Gentil, esperto e corajoso: assim é você, {n}", "Kind, clever and brave, that's you, {n}", "Amable, listo y valiente, así eres tú, {n}",
            "Lieb, klug und mutig, das bist du, {n}", "Добрый, умный и смелый, это ты, {n}"},
        {"L", "Um abraço bem grande para você hoje, {n}", "A great big hug for you today, {n}", "Un abrazo enorme para ti hoy, {n}",
            "Eine riesige Umarmung für dich heute, {n}", "Крепко обнимаем тебя сегодня, {n}"},
        {"F", "Seu sorriso ilumina a sala, {n}", "Your smile lights up the room, {n}", "Tu sonrisa ilumina la sala, {n}",
            "Dein Lächeln macht den ganzen Raum hell, {n}", "Твоя улыбка освещает комнату, {n}"},
        {"F", "Toca aqui, {n}!", "High five, {n}!", "¡Choca esos cinco, {n}!", "Gib mir fünf, {n}!", "Дай пять, {n}!"},
        {"F", "Você é uma estrela, {n}", "You're a superstar, {n}", "Eres una superestrella, {n}", "Du bist ein Superstar, {n}", "Ты суперзвезда, {n}"},
        {"P", "Não existe ninguém igual a você, {n}", "There's nobody quite like you, {n}", "No hay nadie como tú, {n}",
            "Es gibt niemanden wie dich, {n}", "Таких, как ты, больше нет, {n}"},
        {"C", "Cada dia você fica um pouco mais corajoso, {n}", "Every day you grow a little braver, {n}", "Cada día eres un poco más valiente, {n}",
            "Jeden Tag wirst du ein bisschen mutiger, {n}", "С каждым днём ты всё смелее, {n}"},
        {"C", "Hoje vai ser um ótimo dia, {n}", "Today's going to be a great day, {n}", "Hoy va a ser un gran día, {n}",
            "Heute wird ein toller Tag, {n}", "Сегодня будет отличный день, {n}"}
    };
    /** One for each grown-up of the house, so every one of them gets to say it. */
    private static final String[] LOVED_BY = {"L", "{g} te ama, {n}", "{g} loves you, {n}", "{g} te quiere, {n}", "{g} hat dich lieb, {n}", "{g} любит тебя, {n}"};
    private static final String[][] AT_KINDY = {
        {"C", "Continue o ótimo trabalho na escolinha, {n}", "Keep up the good work at kindy, {n}", "Sigue así de bien en el kínder, {n}",
            "Mach weiter so toll im Kindergarten, {n}", "Так держать в садике, {n}"},
        {"P", "Você está aprendendo tanto na escolinha, {n}", "You're learning so much at kindy, {n}", "Estás aprendiendo muchísimo en el kínder, {n}",
            "Du lernst so viel im Kindergarten, {n}", "Ты столькому учишься в садике, {n}"},
        {"F", "A escolinha tem sorte de ter você, {n}", "Kindy is lucky to have you, {n}", "El kínder tiene suerte de tenerte, {n}",
            "Der Kindergarten hat Glück mit dir, {n}", "Садику повезло с тобой, {n}"}
    };
    private static final String[][] AT_SCHOOL = {
        {"P", "Você está indo muito bem na escola, {n}", "You're doing amazing at school, {n}", "Lo estás haciendo genial en el cole, {n}",
            "Du machst das super in der Schule, {n}", "Ты отлично справляешься в школе, {n}"},
        {"C", "Continue o ótimo trabalho na escola, {n}", "Keep up the great work at school, {n}", "Sigue con el buen trabajo en el cole, {n}",
            "Mach weiter so in der Schule, {n}", "Так держать в школе, {n}"},
        {"L", "Adoramos ouvir sobre o seu dia na escola, {n}", "We love hearing about your school day, {n}", "Nos encanta oír cómo te fue en el cole, {n}",
            "Wir hören so gern von deinem Schultag, {n}", "Нам так нравится слушать про твой день в школе, {n}"}
    };
    private static final String[][] AT_COLLEGE = {
        {"P", "Orgulho de como você se esforça na escola, {n}", "Proud of how hard you work at college, {n}", "Orgullosos de lo mucho que te esfuerzas en el instituto, {n}",
            "Stolz, wie fleißig du in der Schule bist, {n}", "Гордимся тем, как ты стараешься в школе, {n}"},
        {"C", "Você consegue, {n}. Estamos com você", "You've got this, {n}. We're right behind you", "Tú puedes, {n}. Estamos contigo",
            "Du schaffst das, {n}. Wir stehen hinter dir", "У тебя всё получится, {n}. Мы с тобой"},
        {"L", "Orgulho da pessoa que você está se tornando, {n}", "Proud of the person you're becoming, {n}", "Orgullosos de la persona en la que te estás convirtiendo, {n}",
            "Stolz auf den Menschen, der du wirst, {n}", "Гордимся тем, каким человеком ты становишься, {n}"}
    };
    private static final String[][] GROWN_UP = {
        {"L", "Obrigado por tudo que você faz, {n}", "Thanks for all you do, {n}", "Gracias por todo lo que haces, {n}",
            "Danke für alles, was du tust, {n}", "Спасибо за всё, что ты делаешь, {n}"},
        {"P", "Você está fazendo um ótimo trabalho, {n}", "You're doing a great job, {n}", "Lo estás haciendo genial, {n}",
            "Du machst das großartig, {n}", "Ты отлично справляешься, {n}"},
        {"L", "Esta família tem sorte de ter você, {n}", "This family is lucky to have you, {n}", "Esta familia tiene suerte de tenerte, {n}",
            "Diese Familie hat Glück, dich zu haben, {n}", "Этой семье повезло, что ты есть, {n}"},
        {"F", "Ponha os pés para cima, {n}. Você merece", "Put your feet up, {n}. You've earned it", "Pon los pies en alto, {n}. Te lo has ganado",
            "Leg die Füße hoch, {n}. Du hast es dir verdient", "Отдохни, {n}. Ты это заслужил(а)"},
        {"C", "Tire um momento só para você hoje, {n}", "Take a moment just for you tonight, {n}", "Tómate un momento solo para ti hoy, {n}",
            "Nimm dir heute einen Moment nur für dich, {n}", "Найди сегодня минутку для себя, {n}"},
        {"P", "Você deixa esta casa feliz, {n}", "You make this home a happy one, {n}", "Haces de este hogar un lugar feliz, {n}",
            "Du machst dieses Zuhause zu einem glücklichen, {n}", "С тобой в этом доме счастье, {n}"}
    };
    /** Mum (set on the TV under Manage people) is to be celebrated: her own lines, on top of the grown-ups' ones. */
    private static final String[][] MUM = {
        {"P", "Rainha da casa: {n}", "Queen of the house: {n}", "La reina de la casa: {n}", "Die Königin des Hauses: {n}", "Королева этого дома: {n}"},
        {"L", "A melhor mãe do mundo, {n}", "Best mum in the world, {n}", "La mejor mamá del mundo, {n}", "Die beste Mama der Welt, {n}", "Лучшая мама на свете, {n}"},
        {"L", "Esta família funciona com o seu amor, {n}", "This family runs on your love, {n}", "Esta familia funciona con tu amor, {n}",
            "Diese Familie lebt von deiner Liebe, {n}", "Эта семья держится на твоей любви, {n}"},
        {"F", "Viva a rainha, {n}!", "All hail the queen, {n}!", "¡Viva la reina, {n}!", "Hoch lebe die Königin, {n}!", "Да здравствует королева, {n}!"},
        {"C", "Você merece o mundo, {n}", "You deserve the world, {n}", "Te mereces el mundo, {n}", "Du verdienst die ganze Welt, {n}", "Ты заслуживаешь весь мир, {n}"},
        {"P", "O coração desta casa, {n}", "The heart of this home, {n}", "El corazón de este hogar, {n}", "Das Herz dieses Zuhauses, {n}", "Сердце этого дома, {n}"}
    };
    // Awards from Beyond Family: "{a}" is the award, "{g}" who gave it, "{m}" their short note.
    private static final String[] AWARD = {"P", "Você ganhou o prêmio {a}, {n}", "You got the {a} award, {n}", "Ganaste el premio {a}, {n}",
    "Du hast die Auszeichnung {a} bekommen, {n}", "У тебя награда «{a}», {n}"};
    private static final String[] AWARD_WOW = {"F", "{a}! Muito bem, {n}", "{a}! Well done, {n}", "¡{a}! Muy bien, {n}", "{a}! Super gemacht, {n}", "{a}! Молодец, {n}"};
    private static final String[] AWARD_FROM = {"L", "{g} te deu o prêmio {a}, {n}", "{g} gave you the {a} award, {n}", "{g} te dio el premio {a}, {n}",
    "{g} hat dir die Auszeichnung {a} gegeben, {n}", "Награда «{a}» от {g}, {n}"};
    private static final String[] AWARD_NOTE = {"L", "{n}, de {g}: {m}", "{n}, from {g}: {m}", "{n}, de {g}: {m}", "{n}, von {g}: {m}", "{n}, от {g}: {m}"};

    private static int lang(String language) {
        if ("pt".equals(language)) return 1;
        if ("es".equals(language)) return 3;
        if ("de".equals(language)) return 4;
        if ("ru".equals(language)) return 5;
        return 2;
    }

    private static String clean(String s) {
        return s == null ? "" : s.replace("{", "").replace("}", "").trim();
    }

    private static final class Line {
        final String key, tone, text;

        Line(String key, String tone, String text) {
            this.key = key;
            this.tone = tone;
            this.text = text;
        }
    }

    /** Fills a line: a, g, m in that order (as in warm.js), then the person's name. */
    private static Line line(String key, String[] words, int l, String name, String a, String g, String m) {
        String t = words[l];
        if (a != null) t = t.replace("{a}", a);
        if (g != null) t = t.replace("{g}", g);
        if (m != null) t = t.replace("{m}", m);
        return new Line(key, words[0], t.replace("{n}", name));
    }

    /** Everything that could be said to this person, always in the same order. */
    private static List<Line> lines(Who p, Who[] people, int l) {
        List<Line> out = new ArrayList<>();
        if (!p.kid) {
            if ("mum".equals(p.parent)) for (int i = 0; i < MUM.length; i++) out.add(line("m" + i, MUM[i], l, p.name, null, null, null));
            for (int i = 0; i < GROWN_UP.length; i++) out.add(line("g" + i, GROWN_UP[i], l, p.name, null, null, null));
            return out;
        }
        for (int i = 0; i < KID.length; i++) out.add(line("k" + i, KID[i], l, p.name, null, null, null));
        String[][] at = KINDY.equals(p.stage) ? AT_KINDY : SCHOOL.equals(p.stage) ? AT_SCHOOL
                : COLLEGE.equals(p.stage) ? AT_COLLEGE : new String[0][];
        for (int i = 0; i < at.length; i++) out.add(line(p.stage + i, at[i], l, p.name, null, null, null));
        for (Who g : people) {
            if (!g.kid && !g.name.isEmpty()) out.add(line("by:" + g.name, LOVED_BY, l, p.name, null, g.name, null));
        }
        return out;
    }

    /** The lines about a person's awards, newest first. */
    private static List<Line> awardLines(Who p, int l) {
        List<Line> out = new ArrayList<>();
        for (int i = 0; i < p.awards.length && i < 3; i++) {
            String[] aw = p.awards[i];
            String a = clean(aw.length > 0 ? aw[0] : ""), g = clean(aw.length > 1 ? aw[1] : ""), m = clean(aw.length > 2 ? aw[2] : "");
            if (a.isEmpty()) continue;
            out.add(line("a:" + a + ":aw", AWARD, l, p.name, a, g, m));
            out.add(line("a:" + a + ":wow", AWARD_WOW, l, p.name, a, g, m));
            if (!g.isEmpty()) out.add(line("a:" + a + ":from", AWARD_FROM, l, p.name, a, g, m));
            if (!g.isEmpty() && !m.isEmpty()) out.add(line("a:" + a + ":note", AWARD_NOTE, l, p.name, a, g, m));
        }
        return out;
    }

    /**
     * The next note, or null for nobody. people: in the order they're shown (Family left out). mem is changed in
     * place; rand gives numbers from 0 up to 1.
     */
    static Note next(Who[] people, Memory mem, DoubleSupplier rand, String language) {
        int n = people == null ? 0 : people.length;
        if (n == 0) return null;
        int l = lang(language);
        List<String> names = new ArrayList<>();
        for (Who p : people) names.add(p.name);
        mem.bag.retainAll(names);
        if (mem.bag.isEmpty()) {
            // A new round: everyone once, in a fresh order, and not starting with whoever went last.
            List<String> bag = new ArrayList<>(names);
            for (int i = bag.size() - 1; i > 0; i--) {
                int j = (int) Math.floor(rand.getAsDouble() * (i + 1));
                String t = bag.get(i);
                bag.set(i, bag.get(j));
                bag.set(j, t);
            }
            if (bag.size() > 1 && bag.get(0).equals(mem.last)) {
                String t = bag.get(0);
                bag.set(0, bag.get(1));
                bag.set(1, t);
            }
            mem.bag.addAll(bag);
        }
        String name = mem.bag.remove(0);
        int who = names.indexOf(name);
        Who p = people[who];
        // A fresh award comes up about half the time, the rest of the time it's one of the everyday lines.
        List<Line> won = awardLines(p, l), pool;
        if (!won.isEmpty() && rand.getAsDouble() < 0.5) pool = won;
        else {
            pool = lines(p, people, l);
            pool.addAll(won);
        }
        List<Line> fresh = new ArrayList<>();
        for (Line x : pool) if (!mem.recent.contains(name + "|" + x.key)) fresh.add(x);
        if (fresh.isEmpty()) fresh = pool;
        List<Line> toned = new ArrayList<>();
        for (Line x : fresh) if (!x.tone.equals(mem.tone)) toned.add(x);
        if (!toned.isEmpty()) fresh = toned;
        Line pick = fresh.get(Math.min(fresh.size() - 1, (int) Math.floor(rand.getAsDouble() * fresh.size())));
        mem.recent.add(name + "|" + pick.key);
        while (mem.recent.size() > REMEMBER) mem.recent.remove(0);
        mem.last = name;
        mem.tone = pick.tone;
        return new Note(who, pick.text);
    }

    /**
     * Who's watching order: grown-ups first with Mum leading, then the kids, and visitors from other homes after the
     * household. Sort by this, stably, so otherwise nobody jumps about. Twin of Warm.order in web/warm.js.
     */
    static int rank(boolean kid, String parent, boolean visitor) {
        return (visitor ? 3 : 0) + (kid ? 2 : "mum".equals(parent) ? 0 : 1);
    }

    /** The award under a kid's name on Who's watching: their newest {title, emoji, on}, if from the last fortnight.
     *  today and on are YYYY-MM-DD. Twin of Warm.badge. */
    static String badge(String title, String emoji, String on, String today) {
        title = clean(title);
        if (title.isEmpty()) return "";
        if (on != null && on.length() == 10 && today != null && today.length() == 10) {
            try {
                long days = java.time.LocalDate.parse(on).until(java.time.LocalDate.parse(today), java.time.temporal.ChronoUnit.DAYS);
                if (days > 14) return "";
            } catch (Exception ignored) {
            }
        }
        String e = clean(emoji);
        return (e.isEmpty() ? "\uD83C\uDFC5" : e) + " " + title;
    }
}
