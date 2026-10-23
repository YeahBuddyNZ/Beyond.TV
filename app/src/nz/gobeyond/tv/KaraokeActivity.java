package nz.gobeyond.tv;

import android.app.Activity;
import android.app.SearchManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Karaoke night (ADR 0020): who's up, full screen over whatever is on, then that song's karaoke version on YouTube.
 * Beyond Family sends the singer's first name and colour, the song, and a YouTube video id or a search. It counts
 * down from five; OK starts now and Back puts it away. The words come from the video: Beyond never keeps lyrics.
 * Same as karaoke in web/family.js.
 */
public class KaraokeActivity extends Activity {
    private static final String NAME = "name", COLOUR = "colour", TITLE = "title", ARTIST = "artist", VIDEO = "video",
            QUERY = "query", AFTER = "after";
    private static final String YOUTUBE = "com.google.android.youtube.tv";
    private static final int COUNT_FROM = 5;

    private final Handler tick = new Handler(Looper.getMainLooper());
    private TextView mic, who, song, count, after;
    private int left;
    private final Runnable step = new Runnable() {
        @Override public void run() {
            if (--left <= 0) {
                sing();
                return;
            }
            count.setText(counting());
            tick.postDelayed(this, 1000);
        }
    };

    static Intent intent(Context c, String name, int colour, String title, String artist, String videoId, String query, String after) {
        return new Intent(c, KaraokeActivity.class).putExtra(NAME, name).putExtra(COLOUR, colour).putExtra(TITLE, title)
                .putExtra(ARTIST, artist).putExtra(VIDEO, videoId).putExtra(QUERY, query).putExtra(AFTER, after)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(column, new FrameLayout.LayoutParams(Math.round(1600 * k), -2, Gravity.CENTER));

        mic = FeedbackActivity.text(this, "🎤", Ui.regular, 96 * k, 0xFFFFFFFF);
        int size = Math.round(180 * k);
        LinearLayout.LayoutParams mp = new LinearLayout.LayoutParams(size, size);
        mp.bottomMargin = Math.round(40 * k);
        column.addView(mic, mp);
        who = FeedbackActivity.text(this, "", Ui.displaySemibold, 110 * k, 0xFFFFFFFF);
        column.addView(who, new LinearLayout.LayoutParams(-1, -2));
        song = FeedbackActivity.text(this, "", Ui.regular, 52 * k, 0xE6FFFFFF);
        song.setPadding(0, Math.round(20 * k), 0, 0);
        column.addView(song, new LinearLayout.LayoutParams(-1, -2));
        count = FeedbackActivity.text(this, "", Ui.regular, 36 * k, 0xA6FFFFFF);
        count.setPadding(0, Math.round(40 * k), 0, Math.round(50 * k));
        column.addView(count, new LinearLayout.LayoutParams(-1, -2));

        Button go = FeedbackActivity.button(this, "🎤  " + Ui.tr("Cantar agora", "Sing now", "Cantar ahora"), k, true);
        go.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 38 * k);
        go.setOnClickListener(v -> sing());
        column.addView(go, new LinearLayout.LayoutParams(-2, Math.round(100 * k)));
        after = FeedbackActivity.text(this, "", Ui.regular, 32 * k, 0x8CFFFFFF);
        after.setPadding(0, Math.round(40 * k), 0, 0);
        column.addView(after, new LinearLayout.LayoutParams(-1, -2));

        setContentView(root);
        show(getIntent());
        go.requestFocus();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        show(intent);
    }

    private void show(Intent i) {
        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        disc.setColor(i.getIntExtra(COLOUR, Glow.VIOLET));
        mic.setBackground(disc);
        String name = i.getStringExtra(NAME);
        who.setText(name == null || name.isEmpty() ? Ui.tr("Sua vez!", "You're up!", "¡Te toca!")
                : Ui.tr("Vez de " + name + "!", name + "'s up!", "¡Le toca a " + name + "!"));
        String title = i.getStringExtra(TITLE), artist = i.getStringExtra(ARTIST);
        song.setText(title + (artist == null || artist.isEmpty() ? "" : " · " + artist));
        String next = i.getStringExtra(AFTER);
        after.setText(next == null || next.isEmpty() ? "" : Ui.tr("Depois: ", "After that: ", "Después: ") + next);
        tick.removeCallbacks(step);
        left = COUNT_FROM;
        count.setText(counting());
        tick.postDelayed(step, 1000);
    }

    private String counting() {
        return Ui.tr("Começa em ", "Starting in ", "Empieza en ") + left;
    }

    /** The karaoke version on YouTube: the video when Beyond Family knows it, otherwise YouTube's own search. */
    private void sing() {
        tick.removeCallbacks(step);
        Intent i = getIntent();
        if (!play(this, i.getStringExtra(VIDEO), i.getStringExtra(QUERY))) {
            android.widget.Toast.makeText(this, Ui.tr("Abra o YouTube para cantar", "Open YouTube to sing", "Abre YouTube para cantar"),
                    android.widget.Toast.LENGTH_LONG).show();
        }
        finish();
    }

    static boolean play(Context c, String videoId, String query) {
        Intent[] tries;
        if (videoId != null && !videoId.isEmpty()) {
            tries = new Intent[] {
                    new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=" + videoId)).setPackage(YOUTUBE),
                    new Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:" + videoId)),
            };
        } else {
            String q = query == null ? "karaoke" : query;
            tries = new Intent[] {
                    new Intent(Intent.ACTION_SEARCH).setPackage(YOUTUBE).putExtra(SearchManager.QUERY, q),
                    new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(q))).setPackage(YOUTUBE),
            };
        }
        for (Intent t : tries) {
            try {
                c.startActivity(t.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (ActivityNotFoundException | SecurityException ignored) {
            }
        }
        Intent app = c.getPackageManager().getLeanbackLaunchIntentForPackage(YOUTUBE);
        if (app == null) return false;
        c.startActivity(app.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return false;
    }

    @Override protected void onDestroy() {
        tick.removeCallbacks(step);
        super.onDestroy();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if ((code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) && e.getAction() == KeyEvent.ACTION_UP) {
            finish();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
