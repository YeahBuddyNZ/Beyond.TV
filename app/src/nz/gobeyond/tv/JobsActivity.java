package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.List;

/**
 * Earn your screen: a kid with jobs still to do today (switched on in Beyond Family) sees what's left instead of the
 * app. Ticking them off in Beyond Family opens the screens by itself; this list follows along and closes when the last
 * one is done. Same as jobsFirst in web/home.js.
 */
public class JobsActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private LinearLayout list;
    private TextView sub;
    private float k;
    private String shown = "";

    /** True when the person watching has jobs left, and the list is now showing instead of what they asked for. */
    static boolean first(Context c) {
        People.Person me = People.current(c);
        if (me == null || !me.kid || Family.jobs(me.id).isEmpty()) return false;
        c.startActivity(new Intent(c, JobsActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return true;
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;

        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(900 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(140 * k);
        root.addView(column, lp);

        TextView title = FeedbackActivity.text(this, Ui.tr("Primeiro as tarefas", "Jobs first, then screens", "Primero las tareas"),
                Ui.displaySemibold, 56 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.CENTER);
        column.addView(title);
        sub = FeedbackActivity.text(this, "", Ui.regular, 30 * k, 0xCCFFFFFF);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, Math.round(18 * k), 0, Math.round(44 * k));
        column.addView(sub, new LinearLayout.LayoutParams(-1, -2));
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        column.addView(list, new LinearLayout.LayoutParams(-1, -2));

        Button ok = FeedbackActivity.button(this, Ui.tr("Combinado", "On it", "Vale"), k, true);
        ok.setOnClickListener(v -> finish());
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.topMargin = Math.round(44 * k);
        column.addView(ok, bp);

        setContentView(root);
        fill();
        ok.requestFocus();
    }

    @Override protected void onResume() {
        super.onResume();
        handler.post(follow);
    }

    @Override protected void onPause() {
        handler.removeCallbacks(follow);
        super.onPause();
    }

    /** Every few seconds: a job ticked off in Beyond Family comes off the list; the last one closes it. */
    private final Runnable follow = new Runnable() {
        @Override public void run() {
            if (!fill()) return;
            handler.postDelayed(this, 3000);
        }
    };

    /** The jobs left; false when there are none and the screen has closed. */
    private boolean fill() {
        People.Person me = People.current(this);
        List<String> left = me == null ? java.util.Collections.<String>emptyList() : Family.jobs(me.id);
        if (left.isEmpty()) {
            finish();
            return false;
        }
        String key = left.toString();
        if (key.equals(shown)) return true;
        shown = key;
        sub.setText(left.size() == 1
                ? Ui.tr("Só falta uma! Marque no Beyond Family e a TV abre sozinha.",
                        "Just one to go! Tick it off in Beyond Family and the TV opens by itself.",
                        "¡Solo falta una! Márcala en Beyond Family y el TV se abre solo.")
                : Ui.tr("Faltam " + left.size() + ". Marque no Beyond Family e a TV abre sozinha.",
                        left.size() + " to go. Tick them off in Beyond Family and the TV opens by itself.",
                        "Faltan " + left.size() + ". Márcalas en Beyond Family y el TV se abre solo."));
        list.removeAllViews();
        for (String job : left) {
            TextView row = FeedbackActivity.text(this, "○  " + job, Ui.medium, 36 * k, 0xFFFFFFFF);
            int pad = Math.round(22 * k);
            row.setPadding(Math.round(32 * k), pad, Math.round(32 * k), pad);
            row.setBackground(FeedbackActivity.pill(0x1FFFFFFF, 0, 24 * k, 0, 0));
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
            rp.bottomMargin = Math.round(14 * k);
            list.addView(row, rp);
        }
        return true;
    }
}
