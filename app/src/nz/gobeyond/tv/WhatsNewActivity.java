package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.KeyEvent;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.List;

/**
 * What's new (ADR 0076): the last six things on Beyond TV, newest first, each with its date. From Shortcuts in the
 * drawer. Got it or Back closes it; opening it counts as seen, so the "New: ..." line leaves Today at home.
 * Same screen as open() in web/whatsnew.js.
 */
public class WhatsNewActivity extends Activity {

    static void open(Context c) {
        c.startActivity(new Intent(c, WhatsNewActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        float k = getResources().getDisplayMetrics().widthPixels / 1920f;
        List<WhatsNew.Item> items = WhatsNew.items(this);
        WhatsNew.seen(this);

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        root.addView(column, new FrameLayout.LayoutParams(Math.round(1520 * k), -2, Gravity.CENTER));

        TextView head = FeedbackActivity.text(this, Ui.tr("Novidades", "What's new", "Novedades"), Ui.displaySemibold, 64 * k, 0xFFFFFFFF);
        head.setGravity(Gravity.START);
        column.addView(head, new LinearLayout.LayoutParams(-1, -2));
        TextView sub = FeedbackActivity.text(this, Ui.tr("As coisas mais novas da sua TV.", "The newest things on your TV.",
                "Lo más nuevo de tu tele."), Ui.regular, 30 * k, 0xA6FFFFFF);
        sub.setGravity(Gravity.START);
        sub.setPadding(0, Math.round(10 * k), 0, Math.round(36 * k));
        column.addView(sub, new LinearLayout.LayoutParams(-1, -2));

        if (items.isEmpty()) {
            TextView none = FeedbackActivity.text(this, Ui.tr("Nada novo agora. Confira de novo mais tarde.",
                    "Nothing new just now. Have another look later.", "Nada nuevo por ahora. Vuelve a mirar más tarde."),
                    Ui.regular, 32 * k, 0xCCFFFFFF);
            none.setGravity(Gravity.START);
            column.addView(none, new LinearLayout.LayoutParams(-1, -2));
        }
        for (int i = 0; i < items.size() && i < WhatsNew.SHOW; i++) {
            WhatsNew.Item it = items.get(i);
            LinearLayout row = new LinearLayout(this);
            row.setPadding(0, Math.round(16 * k), 0, Math.round(16 * k));
            TextView when = FeedbackActivity.text(this, WhatsNew.date(it), Ui.semibold, 24 * k, Glow.LILAC);
            when.setGravity(Gravity.START);
            row.addView(when, new LinearLayout.LayoutParams(Math.round(190 * k), -2));
            LinearLayout words = new LinearLayout(this);
            words.setOrientation(LinearLayout.VERTICAL);
            TextView what = FeedbackActivity.text(this, it.title, Ui.displaySemibold, 34 * k, 0xFFFFFFFF);
            what.setGravity(Gravity.START);
            words.addView(what, new LinearLayout.LayoutParams(-1, -2));
            if (!it.line.isEmpty()) {
                TextView more = FeedbackActivity.text(this, it.line, Ui.regular, 26 * k, 0xB3FFFFFF);
                more.setGravity(Gravity.START);
                more.setSingleLine(true);
                more.setEllipsize(TextUtils.TruncateAt.END);
                words.addView(more, new LinearLayout.LayoutParams(-1, -2));
            }
            row.addView(words, new LinearLayout.LayoutParams(0, -2, 1));
            column.addView(row, new LinearLayout.LayoutParams(-1, -2));
        }

        Button ok = FeedbackActivity.button(this, "✓  " + Ui.tr("Entendi", "Got it", "Entendido"), k, true);
        ok.setOnClickListener(v -> finish());
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(100 * k));
        bp.topMargin = Math.round(40 * k);
        column.addView(ok, bp);
        setContentView(root);
        ok.requestFocus();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP) finish();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }
}
