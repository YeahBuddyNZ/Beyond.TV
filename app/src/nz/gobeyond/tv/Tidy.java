package nz.gobeyond.tv;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;

/**
 * The tidy-up alarm, at the time and on the days a grown-up set in Beyond Family (TV > Tidy-up alarm), never while
 * they're away (ADR 0064, TidyDays). At that time the TV turns itself on if it was asleep (when they said so), and the
 * race starts (TidyActivity). If nobody presses a button within 5 minutes the TV turns itself back off, unless they
 * switched that off. Same as web/tidy.js.
 *
 * The time comes from Beyond Family and is kept in a file here, so the alarm still goes off with the internet down and
 * after a restart. Turning on uses the TV's own ADB with the key it already allowed (never asking from here), as the
 * sleep timer does. Opening the race: straight away on Android 8 and 9; from Android 10, Android only lets a screen
 * open from the front, so the TV goes to its home screen (Beyond TV, in Beyond TV mode), which sees the race is due.
 */
final class Tidy {
    static final int[] MINUTES = {5, 10, 15, 20};
    private static final String ACTION = "nz.gobeyond.tv.TIDY";
    /** A race is due for this long after its alarm, for the home screen to pick up. */
    private static final long DUE_FOR = 3 * 60_000L;

    private Tidy() {}

    private static File file(Context c, String name) { return new File(c.getFilesDir(), name); }

    /** What Beyond Family said ({at: "19:15", minutes, wake, days, awayUntil, offIfNobody}), or null when it's off. */
    static JSONObject settings(Context c) {
        try {
            JSONObject t = new JSONObject(read(file(c, "tidy.json")));
            return t.optString("at").matches("\\d\\d:\\d\\d") ? t : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** From Beyond Family's sync: keeps the setting and books the alarm, only when it changed. */
    static void apply(Context c, JSONObject t) {
        String now = t == null ? "" : t.toString(), was = read(file(c, "tidy.json"));
        if (now.equals(was)) return;
        write(file(c, "tidy.json"), now);
        schedule(c);
    }

    /** Books the next race (or cancels it). At boot too, since alarms don't survive a restart. */
    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = PendingIntent.getBroadcast(c, ACTION.hashCode(), new Intent(c, Receiver.class).setAction(ACTION),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        JSONObject t = settings(c);
        if (t == null) return;
        String at = t.optString("at");
        long next = TidyDays.next(Calendar.getInstance(), Integer.parseInt(at.substring(0, 2)),
                Integer.parseInt(at.substring(3, 5)), days(t), away(t));
        if (next == 0) return;
        // Inexact with a short window: no exact-alarm permission needed, and never more than 30 s late.
        am.setWindow(AlarmManager.RTC_WAKEUP, next, 30_000L, pi);
    }

    private static boolean[] days(JSONObject t) {
        org.json.JSONArray a = t.optJSONArray("days");
        if (a == null) return TidyDays.days(null);
        int[] list = new int[a.length()];
        for (int i = 0; i < list.length; i++) list[i] = a.optInt(i, -1);
        return TidyDays.days(list);
    }

    private static String away(JSONObject t) {
        return t.isNull("awayUntil") ? null : t.optString("awayUntil", null);
    }

    /** Turn the TV back off when nobody comes to the alarm: on unless a grown-up switched it off (ADR 0064). */
    static boolean offIfNobody(Context c) {
        JSONObject t = settings(c);
        return t == null || t.optBoolean("offIfNobody", true);
    }

    static int minutes(Context c) {
        JSONObject t = settings(c);
        int m = t == null ? 10 : t.optInt("minutes", 10);
        return Math.max(5, Math.min(20, m));
    }

    /** True once, within a few minutes of the alarm: the home screen opens the race. */
    static boolean takeDue(Context c) {
        File f = file(c, "tidy-due");
        if (!f.exists()) return false;
        boolean fresh = System.currentTimeMillis() - f.lastModified() < DUE_FOR;
        //noinspection ResultOfMethodCallIgnored
        f.delete();
        return fresh;
    }

    static void clearDue(Context c) {
        //noinspection ResultOfMethodCallIgnored
        file(c, "tidy-due").delete();
    }

    public static final class Receiver extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent intent) {
            if (!ACTION.equals(intent.getAction())) return;
            schedule(c);   // tomorrow's
            final JSONObject t = settings(c);
            if (t == null) return;
            // Booked before a change of days or a time away: not today after all.
            if (!TidyDays.goesOff(Calendar.getInstance(), days(t), away(t))) return;
            write(file(c, "tidy-due"), Long.toString(System.currentTimeMillis()));
            final PendingResult done = goAsync();
            final Context app = c.getApplicationContext();
            new Thread(() -> {
                try {
                    boolean wake = t.optBoolean("wake", true);
                    boolean old = Build.VERSION.SDK_INT < 29;
                    if (wake || !old) {
                        try (Adb adb = Adb.connect(app, 0, null)) {
                            if (wake && !Sleep.awake(adb)) {
                                adb.shell("input keyevent 224");   // wake up
                                Thread.sleep(2500);
                                if (!Sleep.awake(adb)) adb.shell("input keyevent 26");   // TVs that only know power
                                Thread.sleep(3000);
                            }
                            if (!old && Sleep.awake(adb)) adb.shell("input keyevent 3");   // home: Beyond TV opens the race
                        }
                    }
                    if (old) TidyActivity.open(app, minutes(app), true);
                } catch (Throwable e) {
                    Checkin.error(app, "tidy", String.valueOf(e.getMessage()));
                    if (Build.VERSION.SDK_INT < 29) {
                        try { TidyActivity.open(app, minutes(app), true); } catch (RuntimeException ignored) {}
                    }
                } finally {
                    done.finish();
                }
            }, "tidy").start();
        }
    }

    private static String read(File f) {
        try {
            return new String(java.nio.file.Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8).trim();
        } catch (Exception | LinkageError e) {
            return "";
        }
    }

    private static void write(File f, String text) {
        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            AppLog.w("tidy: " + e.getMessage());
        }
    }
}
