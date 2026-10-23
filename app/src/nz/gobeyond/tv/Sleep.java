package nz.gobeyond.tv;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * The sleep timer: the TV turns itself off after 15, 30, 60 or 90 minutes. Each press of Sleep Timer in the drawer
 * moves to the next choice and back to off. A minute before, a note says so; then the TV's own ADB sends the sleep key
 * (the power key on TVs that ignore it). The time is kept in a file, so both processes read the same answer.
 */
final class Sleep {
    static final int[] CHOICES = {0, 15, 30, 60, 90};
    private static final String WARN = "nz.gobeyond.tv.SLEEP_WARN", NOW = "nz.gobeyond.tv.SLEEP_NOW";

    private Sleep() {}

    /** When the TV turns off (System.currentTimeMillis()), or 0 when the timer is off. */
    static long at(Context c) {
        long at = stored(c);
        return at > System.currentTimeMillis() ? at : 0;
    }

    /** What the file says, even once that time has passed (0 = turned off). */
    private static long stored(Context c) {
        try {
            byte[] b = java.nio.file.Files.readAllBytes(file(c).toPath());
            return Long.parseLong(new String(b, StandardCharsets.UTF_8).trim());
        } catch (Exception | LinkageError e) {
            return 0;
        }
    }

    /** Minutes left, rounded up (0 when off). */
    static int minutesLeft(Context c) {
        long at = at(c);
        return at == 0 ? 0 : (int) Math.ceil((at - System.currentTimeMillis()) / 60_000.0);
    }

    /** The next choice after what is set now: off, then 15, 30, 60, 90, then off again. */
    static int next(Context c) {
        int left = minutesLeft(c);
        for (int m : CHOICES) if (m > left) return m;
        return 0;
    }

    /** Sets the timer (0 turns it off) and says what it did, in words for a toast. */
    static String set(Context c, int minutes) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent warn = pending(c, WARN), now = pending(c, NOW);
        am.cancel(warn);
        am.cancel(now);
        long at = minutes > 0 ? System.currentTimeMillis() + minutes * 60_000L : 0;
        write(c, at);
        if (minutes == 0) return Ui.tr("Timer de desligar desligado.", "Sleep timer off.");
        // Inexact alarms with a short window: no exact-alarm permission needed, and never more than 30 s late.
        am.setWindow(AlarmManager.RTC_WAKEUP, at - 60_000L, 30_000L, warn);
        am.setWindow(AlarmManager.RTC_WAKEUP, at, 30_000L, now);
        return Ui.tr("A TV desliga em ", "The TV turns off in ", "La TV se apaga en ") + minutes + " min.";
    }

    private static PendingIntent pending(Context c, String action) {
        Intent i = new Intent(c, Receiver.class).setAction(action);
        return PendingIntent.getBroadcast(c, action.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static File file(Context c) {
        return new File(c.getFilesDir(), "sleep.txt");
    }

    private static void write(Context c, long at) {
        try (FileOutputStream out = new FileOutputStream(file(c))) {
            out.write(Long.toString(at).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            AppLog.w("sleep: " + e.getMessage());
        }
    }

    public static final class Receiver extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent intent) {
            if (stored(c) == 0) return;   // turned off since
            if (WARN.equals(intent.getAction())) {
                Toast.makeText(c, Ui.tr("A TV desliga em um minuto. Timer de desligar no menu para parar.",
                        "The TV turns off in a minute. Sleep Timer in the menu stops it."), Toast.LENGTH_LONG).show();
                return;
            }
            if (!NOW.equals(intent.getAction())) return;
            write(c, 0);
            final PendingResult done = goAsync();
            final Context app = c.getApplicationContext();
            new Thread(() -> {
                try (Adb adb = Adb.connect(app, 0, null)) {
                    // 223 is the sleep key; a TV that ignores it gets the power key, which always turns it off.
                    adb.shell("input keyevent 223");
                    Thread.sleep(2500);
                    if (awake(adb)) adb.shell("input keyevent 26");
                } catch (Throwable t) {
                    Checkin.error(app, "sleep", String.valueOf(t.getMessage()));
                } finally {
                    done.finish();
                }
            }, "sleep").start();
        }
    }

    /** True while the screen is still on (dumpsys power says so on every Android TV we have tried). */
    static boolean awake(Adb adb) {
        try {
            String s = adb.shell("dumpsys power | grep -E 'mWakefulness=|Display Power: state='");
            return s.contains("Awake") || s.contains("state=ON");
        } catch (Exception e) {
            return false;
        }
    }
}
