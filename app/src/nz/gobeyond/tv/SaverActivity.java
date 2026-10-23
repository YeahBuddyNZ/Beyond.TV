package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;

/**
 * The screensaver over the home screen after a few quiet minutes (Prefs.saverAfter, chosen in Beyond™ TV Settings).
 * The same picture as the system's screensaver (DreamView), started by the home screen itself, so the TV's own
 * screensaver and standby timings stay as they were. Any key goes back to the home screen.
 */
public class SaverActivity extends Activity {
    private DreamView view;

    static void open(Context c) {
        try {
            c.startActivity(new Intent(c, SaverActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Exception ignored) {
        }
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        view = new DreamView(this);
        setContentView(view);
    }

    @Override protected void onResume() {
        super.onResume();
        view.start();
    }

    @Override protected void onPause() {
        view.stop();
        super.onPause();
        finish();   // left for another app or standby: next time the home screen starts a fresh one
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_UP) finish();
        return true;   // the key that wakes it does nothing else
    }

    @Override public boolean dispatchTouchEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_UP) finish();
        return true;
    }
}
