package nz.gobeyond.tv;

import android.app.Application;
import android.os.Build;

/** Gives Prefs and the log a context in every process. */
public class App extends Application {
    @Override public void onCreate() {
        super.onCreate();
        Prefs.init(this);
        String name = Build.VERSION.SDK_INT >= 28 ? Application.getProcessName() : processName();
        AppLog.init(this, name);
        String version = "";
        try { version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception ignored) {}
        AppLog.w("started " + version + " on Android " + Build.VERSION.RELEASE);
    }

    /** Android 8 has no getProcessName: the kernel's name for this process. */
    private static String processName() {
        try (java.io.FileInputStream in = new java.io.FileInputStream("/proc/self/cmdline")) {
            byte[] b = new byte[256];
            int n = in.read(b), end = 0;
            while (end < n && b[end] != 0) end++;
            return new String(b, 0, Math.max(0, end), "UTF-8");
        } catch (Exception e) {
            return "";
        }
    }
}
