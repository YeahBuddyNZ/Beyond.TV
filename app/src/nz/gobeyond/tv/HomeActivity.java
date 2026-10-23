package nz.gobeyond.tv;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * The Beyond TV home screen (Android's "Home" role in Beyond TV mode). It runs in the :home process: if it crashes,
 * the safety net in the main process keeps working. On the 3rd crash within 5 min, the Watchdog gives the home screen
 * back to the TV's original one.
 */
public class HomeActivity extends Activity implements Family.Screen {
    private HomeView home;
    private View message;   // Beyond Family's message over the home screen, while it shows
    private static final long ASK_AGAIN_AFTER = 4 * 3600_000L;
    private int prefsVersion = Prefs.version;   // settings changed while we were away: start over
    private boolean justOn = true;   // the TV started or woke: ask who's watching

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        if (Watchdog.crashedTooOften(this)) {
            // Don't try to draw again: only show a notice while the main process restores the original home screen.
            HomeMode.requestRevertHome(this);
            TextView t = new TextView(this);
            t.setText(Ui.tr("O Início do Beyond™ TV teve um problema.\nVoltando para o Início original da TV…",
                    "Beyond™ TV's home screen ran into a problem.\nGoing back to the TV's original home screen…"));
            t.setTextColor(Color.WHITE);
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
            t.setGravity(Gravity.CENTER);
            t.setBackgroundColor(Color.rgb(7, 11, 30));
            setContentView(t);
            return;
        }
        Ui.init(this);
        home = new HomeView(this);
        setContentView(home);
        // Waking from standby isn't a boot, so the boot notice never comes: look for an update then too.
        registerReceiver(woke, new IntentFilter(Intent.ACTION_SCREEN_ON));
        getWindow().setBackgroundDrawable(null);
    }

    @Override protected void onResume() {
        super.onResume();
        if (prefsVersion != Prefs.version) {
            prefsVersion = Prefs.version;
            HomeData.get(this).settingsChanged();
            recreate();   // a new language or city: draw everything again
            return;
        }
        if (home != null) {
            home.resume();
            Updater.homeShowing(this, true);
            Updater.maybeCheck(this);
            Updater.offer(this);
            Checkin.opened(this);
            Checkin.maybeSend(this);
            FamilyService.start(this);
            Family.screen = this;
            // Beyond Family changed who's here, or who's watching: draw again, as coming back from Settings does.
            Family.onChange = () -> {
                if (prefsVersion != Prefs.version) {
                    prefsVersion = Prefs.version;
                    recreate();
                }
            };
            // Who's watching? When there's more than one person: whenever the TV comes on, and after a long break.
            boolean on = justOn;
            justOn = false;
            if (Tidy.takeDue(this)) {
                TidyActivity.open(this, Tidy.minutes(this));   // the tidy-up alarm woke the TV, or sent it home
                return;
            }
            if (on) Chime.play();   // hello: the TV just came on
            if (People.count(this) > 1 && (on || System.currentTimeMillis() - People.chosenAt(this) > ASK_AGAIN_AFTER)) {
                People.asked(this);
                WhoActivity.open(this, null);
            }
        }
    }

    @Override protected void onPause() {
        if (Family.screen == this) Family.screen = null;
        Family.onChange = null;
        hideMessage();
        Updater.homeShowing(this, false);
        if (home != null) home.pause();
        super.onPause();
    }

    /** Home button pressed on the home screen: back to the entry state (focus on the first app, sheet closed). */
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (home != null) home.reset(true);
        // Home pressed by the tidy-up alarm while the home screen was already up.
        if (home != null && Tidy.takeDue(this)) TidyActivity.open(this, Tidy.minutes(this));
    }

    private final BroadcastReceiver woke = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent intent) {
            Updater.onStart(c);
            justOn = true;
        }
    };

    @Override protected void onDestroy() {
        if (home != null) {
            home.destroy();
            try { unregisterReceiver(woke); } catch (IllegalArgumentException ignored) {}
        }
        super.onDestroy();
    }

    @Override public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= TRIM_MEMORY_COMPLETE) Recs.get(this).trim();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        // The first press puts a message away, as on LG and Samsung.
        if (message != null) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) hideMessage();
            return true;
        }
        if (RemoteKeys.onKey(this, event)) return true;
        if (home != null && home.onKey(event)) return true;
        return super.dispatchKeyEvent(event);
    }

    // MARK: - A message from Beyond Family

    private final Handler handler = new Handler(Looper.getMainLooper());

    /** A card over the home screen: the icon in the message's colour, the words, who it's from. 15 seconds, or a key. */
    @Override public boolean say(String text, int colour, String icon, String from) {
        if (home == null || isFinishing()) return false;
        hideMessage();
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;
        LinearLayout card = new LinearLayout(this);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(Math.round(30 * k), Math.round(26 * k), Math.round(48 * k), Math.round(26 * k));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF2161618);
        bg.setCornerRadius(36 * k);
        bg.setStroke(Math.round(4 * k), colour);
        card.setBackground(bg);
        card.setElevation(24 * k);
        TextView badge = FeedbackActivity.text(this, icon, Ui.regular, 52 * k, 0xFFFFFFFF);
        GradientDrawable dot = new GradientDrawable();
        dot.setShape(GradientDrawable.OVAL);
        dot.setColor(colour);
        badge.setBackground(dot);
        card.addView(badge, new LinearLayout.LayoutParams(Math.round(104 * k), Math.round(104 * k)));
        LinearLayout words = new LinearLayout(this);
        words.setOrientation(LinearLayout.VERTICAL);
        words.setPadding(Math.round(30 * k), 0, 0, 0);
        TextView t = FeedbackActivity.text(this, text, Ui.semibold, 44 * k, 0xFFFFFFFF);
        t.setGravity(Gravity.START);
        t.setMaxWidth(Math.round(1100 * k));
        words.addView(t);
        TextView f = FeedbackActivity.text(this, (from == null || from.isEmpty() ? "" : Ui.tr("De ", "From ") + from + " · ")
                + Ui.tr("agora", "just now"), Ui.regular, 26 * k, 0x99FFFFFF);
        f.setGravity(Gravity.START);
        words.addView(f);
        card.addView(words);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(70 * k);
        addContentView(card, lp);
        card.setAlpha(0f);
        card.setTranslationY(-40 * k);
        card.animate().alpha(1f).translationY(0).setDuration(320).start();
        message = card;
        handler.postDelayed(this::hideMessage, 15_000);
        return true;
    }

    private void hideMessage() {
        handler.removeCallbacksAndMessages(null);
        final View card = message;
        message = null;
        if (card == null) return;
        card.animate().alpha(0f).setDuration(300).withEndAction(() -> {
            if (card.getParent() instanceof ViewGroup) ((ViewGroup) card.getParent()).removeView(card);
        }).start();
    }
}
