package nz.gobeyond.tv;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * The app's log (adb logcat -s BeyondTV). Never logs keys. While Help fix problems is on, each line from w() is also
 * kept in files/checkin/log.txt (the last few hundred, every process) and goes to Beyond with the check-in, so a
 * problem on a TV can be read without a cable (ADR 0034). A line that names an app somebody opened goes through
 * here() instead, which stays on the TV: what anybody watches never leaves it.
 */
final class AppLog {
    private AppLog() {}

    private static final int MAX = 48 * 1024;
    private static volatile Context app;
    private static String process = "";

    static void init(Context c, String processName) {
        app = c.getApplicationContext();
        int colon = processName == null ? -1 : processName.indexOf(':');
        process = colon < 0 ? "" : processName.substring(colon);
    }

    static void w(String message) {
        Log.i("BeyondTV", message);
        keep(message);
    }

    /** Only in logcat, never sent: lines that say which app was opened, or what is on the TV. */
    static void here(String message) {
        Log.i("BeyondTV", message);
    }

    static File file(Context c) { return new File(new File(c.getFilesDir(), "checkin"), "log.txt"); }

    private static void keep(String message) {
        Context c = app;
        if (c == null || !Checkin.on(c)) return;
        String text = message == null ? "" : message.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
        if (text.length() > 300) text = text.substring(0, 300);
        String line = System.currentTimeMillis() + "\t" + process + "\t" + text + "\n";
        File f = file(c);
        synchronized (AppLog.class) {
            try {
                //noinspection ResultOfMethodCallIgnored
                f.getParentFile().mkdirs();
                try (FileOutputStream out = new FileOutputStream(f, true)) {
                    out.write(line.getBytes(StandardCharsets.UTF_8));
                }
                if (f.length() > MAX) Checkin.trimLog(f, MAX / 2);
            } catch (IOException ignored) {
            }
        }
    }
}
