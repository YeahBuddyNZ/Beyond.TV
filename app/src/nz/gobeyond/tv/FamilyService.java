package nz.gobeyond.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Waits for Beyond Family while this TV is linked: one long look at /tv/sync after another (each up to 20 seconds, so
 * a press on the phone lands at once), applying the household's people and doing each command. A foreground service
 * in :home, because the remote is for when somebody else's app has the screen and a cached process can be frozen.
 * Its notification sits in the TV's quiet list; it stops by itself when the TV is unlinked.
 */
public class FamilyService extends Service {
    private static final String CHANNEL = "family";
    private volatile boolean running;
    private Thread loop;

    /** Starts the wait when the TV is linked. Safe to call often (home screen, settings, boot). */
    static void start(Context c) {
        if (!Family.linked(c)) return;
        try {
            c.startForegroundService(new Intent(c, FamilyService.class));
        } catch (Throwable t) {
            // Android 12+ refuses from the background; the next time the home screen shows, it starts.
            AppLog.w("family: couldn't start the service: " + t);
        }
    }

    static void stop(Context c) {
        try {
            c.stopService(new Intent(c, FamilyService.class));
        } catch (Throwable ignored) {
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(1, notification());
        if (!Family.linked(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (loop == null || !loop.isAlive()) {
            running = true;
            loop = new Thread(this::waitForFamily, "beyond-family");
            loop.start();
        }
        return START_STICKY;
    }

    private Notification notification() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Beyond Family", NotificationManager.IMPORTANCE_MIN);
        ch.setShowBadge(false);
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
        return new Notification.Builder(this, CHANNEL)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle("Beyond Family")
                .setContentText(Ui.tr("Ouvindo o controle e os recados da família", "Listening for the family's remote and messages"))
                .setOngoing(true)
                .build();
    }

    private void waitForFamily() {
        long backoff = 0;
        while (running && Family.linked(this)) {
            try {
                JSONObject res = Family.call(this, "GET", "/tv/sync?wait=20", null, 26_000);
                backoff = 0;
                if (!res.optBoolean("paired", true)) {
                    unlinked(null);
                    return;
                }
                Family.apply(this, res.optJSONObject("home"));
                JSONArray list = res.optJSONArray("commands");
                for (int i = 0; list != null && i < list.length(); i++) {
                    JSONObject cmd = list.optJSONObject(i);
                    if (cmd != null) Family.run(this, cmd);
                }
                Thread.sleep(250);
            } catch (Family.Fail f) {
                if (f.status == 401) {
                    unlinked(Ui.tr("O Beyond Family desligou esta TV", "Beyond Family unlinked this TV"));
                    return;
                }
                backoff = Math.min(60_000, backoff == 0 ? 3_000 : backoff * 2);
                if (!nap(backoff)) return;
            } catch (Throwable t) {
                AppLog.w("family: " + t);
                backoff = Math.min(60_000, backoff == 0 ? 3_000 : backoff * 2);
                if (!nap(backoff)) return;
            }
        }
        stopSelf();
    }

    private boolean nap(long ms) {
        try {
            Thread.sleep(ms);
            return true;
        } catch (InterruptedException e) {
            return false;
        }
    }

    private void unlinked(final String why) {
        Family.forget(this);
        running = false;
        if (why != null) {
            final Context app = getApplicationContext();
            new android.os.Handler(getMainLooper()).post(() -> Toast.makeText(app, why, Toast.LENGTH_LONG).show());
        }
        stopSelf();
    }

    @Override public void onDestroy() {
        running = false;
        if (loop != null) loop.interrupt();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
