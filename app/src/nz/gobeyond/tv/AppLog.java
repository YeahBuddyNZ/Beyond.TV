package nz.gobeyond.tv;

import android.util.Log;

/** The app's log (adb logcat -s BeyondTV). Never logs keys. */
final class AppLog {
    private AppLog() {}

    static void w(String message) {
        Log.i("BeyondTV", message);
    }
}
