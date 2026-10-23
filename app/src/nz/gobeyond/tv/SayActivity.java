package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * A message from Beyond Family ("5 minutes to dinner"), full screen and big enough to read from the couch, over
 * whatever is on, YouTube included. It stays until somebody presses OK (Kyle: "they have to accept to close"); Back
 * does nothing. A newer message replaces the one showing. Same as say in web/family.js (ADR 0018).
 */
public class SayActivity extends Activity {
    private static final String TEXT = "text", COLOUR = "colour", ICON = "icon", FROM = "from";
    private TextView icon, words, from;

    static Intent intent(Context c, String text, int colour, String icon, String from) {
        return new Intent(c, SayActivity.class).putExtra(TEXT, text).putExtra(COLOUR, colour).putExtra(ICON, icon).putExtra(FROM, from)
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

        icon = FeedbackActivity.text(this, "", Ui.regular, 96 * k, 0xFFFFFFFF);
        int size = Math.round(180 * k);
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(size, size);
        ip.bottomMargin = Math.round(50 * k);
        column.addView(icon, ip);
        words = FeedbackActivity.text(this, "", Ui.displaySemibold, 96 * k, 0xFFFFFFFF);
        words.setLineSpacing(0, 1.05f);
        column.addView(words, new LinearLayout.LayoutParams(-1, -2));
        from = FeedbackActivity.text(this, "", Ui.regular, 34 * k, 0xA6FFFFFF);
        from.setPadding(0, Math.round(26 * k), 0, Math.round(70 * k));
        column.addView(from, new LinearLayout.LayoutParams(-1, -2));

        Button ok = FeedbackActivity.button(this, "✓  " + Ui.tr("OK, entendi", "OK, got it", "OK, entendido"), k, true);
        ok.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 38 * k);
        ok.setOnClickListener(v -> finish());
        column.addView(ok, new LinearLayout.LayoutParams(-2, Math.round(100 * k)));

        setContentView(root);
        show(getIntent());
        ok.requestFocus();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        show(intent);
    }

    private void show(Intent i) {
        String who = i.getStringExtra(FROM);
        icon.setText(Ui.emoji(i.getStringExtra(ICON)));
        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        disc.setColor(i.getIntExtra(COLOUR, Glow.VIOLET));
        icon.setBackground(disc);
        words.setText(i.getStringExtra(TEXT));
        from.setText((who == null || who.isEmpty() ? "" : Ui.tr("De ", "From ", "De ") + who + " · ") + Ui.tr("agora", "just now", "ahora"));
    }

    /** Only OK puts the message away: Back would let it be skipped without anyone reading it. */
    @Override public void onBackPressed() {}

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) return true;
        return super.dispatchKeyEvent(e);
    }
}
