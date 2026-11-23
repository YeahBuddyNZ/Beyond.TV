package nz.gobeyond.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.Iterator;
import java.util.Map;

/**
 * Screen time on Google TV (ADR 0060). A grown-up sets each kid's daily limit in Manage people (behind the PIN). While
 * a kid with a limit is watching and the TV is on, this foreground service in :home counts every half minute that
 * isn't on the home screen (apps, and Beyond TV's own games and players), says kindly when 5 minutes are left, and when
 * the time is used up opens TimeUpActivity over the app. The home screen shows what's left by the greeting, and
 * opening an app with no time left shows TimeUpActivity instead. Kept in this TV's preferences, never sent anywhere.
 * ScreenTime has the sums; web/screentime.js is the same on LG and Samsung.
 */
public class ScreenTimeService extends Service {
    private static final String CHANNEL = "screentime";
    private static final long TICK_MS = 30_000;
    /** The home screen is up (HomeActivity), or the screensaver: neither counts. */
    static volatile boolean homeInFront, dreaming;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long last;
    private long shownAt;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!step()) {
                stopSelf();
                return;
            }
            handler.postDelayed(this, TICK_MS);
        }
    };

    // MARK: - Kept on this TV

    private static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences("screentime", Context.MODE_PRIVATE);
    }

    static synchronized ScreenTime.Day load(Context c) {
        ScreenTime.Day d = new ScreenTime.Day();
        try {
            JSONObject o = new JSONObject(sp(c).getString("day", "{}"));
            d.day = o.optString("day");
            ints(o.optJSONObject("limits"), d.limits);
            ints(o.optJSONObject("extra"), d.extra);
            JSONObject used = o.optJSONObject("used");
            if (used != null) for (Iterator<String> it = used.keys(); it.hasNext(); ) {
                String k = it.next();
                d.used.put(k, used.optLong(k));
            }
            JSONObject warned = o.optJSONObject("warned");
            if (warned != null) for (Iterator<String> it = warned.keys(); it.hasNext(); ) {
                String k = it.next();
                d.warned.put(k, warned.optBoolean(k));
            }
        } catch (Exception ignored) {
        }
        return ScreenTime.fresh(d, System.currentTimeMillis());
    }

    private static void ints(JSONObject o, Map<String, Integer> into) {
        if (o == null) return;
        for (Iterator<String> it = o.keys(); it.hasNext(); ) {
            String k = it.next();
            into.put(k, o.optInt(k));
        }
    }

    static synchronized void save(Context c, ScreenTime.Day d) {
        try {
            JSONObject o = new JSONObject().put("day", d.day).put("limits", new JSONObject(d.limits)).put("extra", new JSONObject(d.extra))
                    .put("used", new JSONObject(d.used)).put("warned", new JSONObject(d.warned));
            sp(c).edit().putString("day", o.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    static int limit(Context c, String id) {
        Integer v = load(c).limits.get(id);
        return v == null ? 0 : v;
    }

    /** Sets a kid's daily limit (0: none), and lets the kind card open over apps (Android 10 and up) once. */
    static void setLimit(Context c, String id, int minutes) {
        ScreenTime.Day d = load(c);
        if (minutes > 0) d.limits.put(id, minutes);
        else d.limits.remove(id);
        save(c, d);
        if (minutes > 0) allowOverApps(c);
    }

    /** The watcher, when they're a kid with a limit; else null. */
    static People.Person limited(Context c) {
        People.Person me = People.current(c);
        if (me == null || !me.kid || me.together()) return null;
        return limit(c, me.id) > 0 ? me : null;
    }

    static int minutesLeft(Context c, String id) {
        return ScreenTime.minutesLeft(load(c), id);
    }

    /** "1 h 30 min", "45 min"; 0 is "no limit". */
    static String label(int min) {
        if (min <= 0) return Ui.tr("sem limite", "no limit", "sin límite");
        int h = min / 60, m = min % 60;
        String mins = " " + Ui.tr("min", "min", "min"), hours = " " + Ui.tr("h", "h", "h");
        if (h == 0) return m + mins;
        return h + hours + (m > 0 ? " " + m + mins : "");
    }

    /** "⏳ 40 min of screen time left", for the line under the greeting; empty for anyone without a limit. */
    static String line(Context c) {
        People.Person me = limited(c);
        if (me == null) return "";
        int left = minutesLeft(c, me.id);
        if (left <= 0) return Ui.tr("tela encerrada por hoje", "screen time done for today", "pantalla terminada por hoy");
        return Ui.tr("⏳ " + label(left) + " de tela", "⏳ " + label(left) + " of screen time left", "⏳ " + label(left) + " de pantalla");
    }

    /** Before an app opens from the home screen: a kid with no time left gets the kind card instead. */
    static boolean blocked(Context c) {
        People.Person me = limited(c);
        if (me == null || minutesLeft(c, me.id) > 0) return false;
        c.startActivity(TimeUpActivity.intent(c));
        return true;
    }

    /** A grown-up's extra minutes, for today. */
    static void more(Context c, String id, int minutes) {
        ScreenTime.Day d = load(c);
        Integer had = d.extra.get(id);
        d.extra.put(id, (had == null ? 0 : had) + minutes);
        d.warned.remove(id);
        save(c, d);
    }

    /** The kind card over another app needs Android's say-so from 10 up: the TV's own ADB gives it, never asking. */
    private static void allowOverApps(Context c) {
        if (Build.VERSION.SDK_INT < 29 || android.provider.Settings.canDrawOverlays(c)) return;
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try (Adb adb = Adb.connect(app, 0, null)) {
                adb.shell("appops set " + app.getPackageName() + " SYSTEM_ALERT_WINDOW allow");
            } catch (Throwable t) {
                AppLog.w("screen time: couldn't allow the card over apps: " + t.getMessage());
            }
        }, "screentime-allow").start();
    }

    // MARK: - Counting

    /** Leaving the home screen: counts while a kid with a limit is watching. Safe to call often. */
    static void start(Context c) {
        if (limited(c) == null) return;
        try {
            c.startForegroundService(new Intent(c, ScreenTimeService.class));
        } catch (Throwable t) {
            AppLog.w("screen time: couldn't start counting: " + t);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(2, notification());
        handler.removeCallbacks(tick);
        last = System.currentTimeMillis();
        handler.postDelayed(tick, TICK_MS);
        return START_STICKY;
    }

    private Notification notification() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Screen time", NotificationManager.IMPORTANCE_MIN);
        ch.setShowBadge(false);
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
        return new Notification.Builder(this, CHANNEL)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle("Beyond™ TV")
                .setContentText(Ui.tr("Contando o tempo de tela", "Counting screen time", "Contando el tiempo de pantalla"))
                .setOngoing(true)
                .build();
    }

    /** Half a minute more, if it counts. False once there's nobody to count for. */
    private boolean step() {
        long now = System.currentTimeMillis(), gap = now - last;
        last = now;
        People.Person me = limited(this);
        if (me == null) return false;
        PowerManager pm = getSystemService(PowerManager.class);
        boolean on = pm == null || pm.isInteractive();
        if (!on || homeInFront || dreaming || TimeUpActivity.showing || gap > 2 * TICK_MS + 5_000) return true;
        ScreenTime.Day d = load(this);
        Long used = d.used.get(me.id);
        d.used.put(me.id, (used == null ? 0 : used) + gap);
        int left = ScreenTime.minutesLeft(d, me.id);
        boolean warn = left > 0 && left <= ScreenTime.WARN && !Boolean.TRUE.equals(d.warned.get(me.id));
        if (warn) d.warned.put(me.id, true);
        save(this, d);
        if (warn) {
            Toast.makeText(this, Ui.tr(me.name + ", faltam " + left + " min de tela hoje. Hora de achar um bom lugar para parar.",
                    left + " minutes of screen time left, " + me.name + ". Time to find a good place to stop.",
                    me.name + ", quedan " + left + " min de pantalla hoy. Hora de buscar un buen momento para parar."), Toast.LENGTH_LONG).show();
        }
        // Time's up: the kind card over whatever is on, and again a minute later if they slipped back into the app.
        if (left <= 0 && now - shownAt > 60_000) {
            shownAt = now;
            boolean canOpen = Build.VERSION.SDK_INT < 29 || android.provider.Settings.canDrawOverlays(this);
            try {
                if (canOpen) startActivity(TimeUpActivity.intent(this));
                else Toast.makeText(this, Ui.tr("Por hoje é só, " + me.name + ".", "That's screen time for today, " + me.name + ".",
                        "Eso es todo por hoy, " + me.name + "."), Toast.LENGTH_LONG).show();
            } catch (RuntimeException e) {
                AppLog.w("screen time: couldn't show the card: " + e.getMessage());
            }
        }
        return true;
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(tick);
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) {
        return null;
    }
}
