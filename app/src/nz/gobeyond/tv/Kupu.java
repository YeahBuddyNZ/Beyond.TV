package nz.gobeyond.tv;

import java.util.Calendar;

/**
 * Te reo word of the day: one kupu on the home screen and the screensaver each day, with what it means. Everyday words
 * a family uses, so it turns up in conversation at tea. The same list and the same day as web/kupu.js, so an LG and a
 * Google TV in one house show the same word.
 */
final class Kupu {
    private Kupu() {}

    // {kupu, meaning}. Everyday words only, macrons where they belong. Keep in step with web/kupu.js.
    private static final String[][] WORDS = {
        {"kia ora", "hello, thanks"}, {"mōrena", "good morning"}, {"aroha", "love"}, {"whānau", "family"},
        {"kai", "food"}, {"wai", "water"}, {"whare", "house"}, {"kura", "school"}, {"tamariki", "children"},
        {"pō mārie", "good night"}, {"ka pai", "well done"}, {"tino pai", "very good"}, {"haere mai", "welcome"},
        {"ka kite anō", "see you again"}, {"moana", "sea"}, {"maunga", "mountain"}, {"awa", "river"},
        {"ngahere", "forest, bush"}, {"rākau", "tree"}, {"manu", "bird"}, {"kererū", "wood pigeon"},
        {"pīwakawaka", "fantail"}, {"kōtuku", "white heron"}, {"ika", "fish"}, {"kurī", "dog"}, {"ngeru", "cat"},
        {"rā", "sun, day"}, {"marama", "moon, month"}, {"whetū", "star"}, {"ua", "rain"}, {"hau", "wind"},
        {"rangi", "sky"}, {"whenua", "land"}, {"tangata", "person"}, {"kōrero", "talk, story"}, {"waiata", "song"},
        {"tākaro", "play"}, {"moe", "sleep"}, {"pukapuka", "book"}, {"hoa", "friend"}, {"māmā", "mum"},
        {"pāpā", "dad"}, {"kuia", "grandmother, elder"}, {"koro", "grandfather, elder"}, {"pēpi", "baby"},
        {"parakuihi", "breakfast"}, {"tina", "lunch"}, {"ata", "morning"}, {"ahiahi", "evening"}, {"kaha", "strong"},
        {"māia", "brave"}, {"harikoa", "happy"}, {"pōuri", "sad"}, {"ngenge", "tired"}, {"hiakai", "hungry"},
        {"matewai", "thirsty"}, {"āporo", "apple"}, {"miraka", "milk"}, {"parāoa", "bread"}, {"kākahu", "clothes"},
        {"hū", "shoes"}, {"pōtae", "hat"}, {"waka", "canoe, car"}, {"ara", "path"}, {"tatari", "wait"},
        {"āwhina", "help"}, {"whakarongo", "listen"}, {"titiro", "look"}, {"noho", "sit, stay"}, {"tū", "stand"},
        {"oma", "run"}, {"kanikani", "dance"}, {"kata", "laugh"}, {"ngā mihi", "thanks, regards"}
    };

    static int count() { return WORDS.length; }

    /** Days since 1 January 1970 by the TV's own calendar: the word changes at local midnight. */
    static long day(long now) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        Calendar u = Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"));
        u.clear();
        u.set(c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH));
        return Math.floorDiv(u.getTimeInMillis(), 86_400_000L);
    }

    /** Today's {kupu, meaning}. */
    static String[] today(long now) {
        return WORDS[(int) Math.floorMod(day(now), (long) WORDS.length)];
    }

    /** "whetū · star", as the home screen shows it. */
    static String line(long now) {
        String[] w = today(now);
        return w[0] + " · " + w[1];
    }
}
