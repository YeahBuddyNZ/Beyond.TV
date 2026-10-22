package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Your home: one room from the Beyond Home box (its Moments, the one remote, each thing on or off), or, with no room,
 * the code to connect the box. Follows the box every few seconds while it's open. Same as openRoom() and
 * openPairing() in web/home.js.
 */
public class RoomActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private LinearLayout column;
    private String roomId, shown = "";
    private float k;

    static void open(Context c, String roomId) {
        Intent i = new Intent(c, RoomActivity.class);
        if (roomId != null) i.putExtra("room", roomId);
        c.startActivity(i);
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        roomId = getIntent().getStringExtra("room");
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        FrameLayout root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(1560 * k), -2, Gravity.CENTER_HORIZONTAL);
        lp.topMargin = Math.round(roomId == null ? 220 * k : 130 * k);
        root.addView(column, lp);
        setContentView(root);
        if (roomId == null && "found".equals(HomeHub.status())) {
            HomeHub.pair((ok, why) -> {
                if (!ok) {
                    Toast.makeText(this, Ui.tr("O Beyond Home não respondeu. Tente de novo.", "Beyond Home didn't answer. Try again.",
                            "Beyond Home no respondió. Inténtalo de nuevo."), Toast.LENGTH_LONG).show();
                    finish();
                    return;
                }
                fill();
            });
        }
        fill();
    }

    @Override protected void onResume() {
        super.onResume();
        HomeHub.onChange = this::fill;
        HomeHub.pace(true);
        HomeHub.refresh();
    }

    @Override protected void onPause() {
        if (HomeHub.onChange != null) HomeHub.onChange = null;
        HomeHub.stop();
        super.onPause();
    }

    /** Draws the room (or the code) again when it changed, keeping the focus where it was. */
    private void fill() {
        if (roomId == null) {
            if ("paired".equals(HomeHub.status())) {
                Toast.makeText(this, Ui.tr("Beyond Home conectado", "Beyond Home is on the TV now", "Beyond Home conectado"), Toast.LENGTH_LONG).show();
                finish();
                return;
            }
            String key = "code:" + HomeHub.code();
            if (key.equals(shown)) return;
            shown = key;
            column.removeAllViews();
            heading(Ui.tr("Conectar o Beyond Home", "Connect Beyond Home", "Conectar Beyond Home"),
                    Ui.tr("No app Beyond Home, vá em Ajustes, TVs, e digite este código.", "In the Beyond Home app, go to Settings, TVs, and type this code.",
                            "En la app Beyond Home, ve a Ajustes, TVs, y escribe este código."));
            String c = HomeHub.code();
            TextView code = FeedbackActivity.text(this, c.isEmpty() ? "······" : c.replaceAll("(.)", "$1 ").trim(), Ui.displaySemibold, 110 * k, 0xFFFFFFFF);
            int pad = Math.round(18 * k);
            code.setPadding(Math.round(48 * k), pad, Math.round(48 * k), pad);
            code.setBackground(FeedbackActivity.pill(0x14FFFFFF, 0x29FFFFFF, 28 * k, 2 * k, 0));
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-2, -2);
            cp.topMargin = Math.round(30 * k);
            column.addView(code, cp);
            return;
        }
        JSONObject r = HomeHub.room(roomId);
        if (r == null) { finish(); return; }
        String key = r.toString();
        if (key.equals(shown)) return;
        shown = key;
        View had = getCurrentFocus();
        int at = had == null ? -1 : had.getId();
        column.removeAllViews();
        heading(r.optString("name"), r.optString("line"));
        int n = 1;

        JSONArray moments = r.optJSONArray("moments");
        if (moments != null && moments.length() > 0) {
            LinearLayout row = row();
            for (int i = 0; i < moments.length(); i++) {
                JSONObject m = moments.optJSONObject(i);
                if (m == null) continue;
                final String mid = m.optString("id");
                final String[] words = momentWords(mid, m.optString("name"), m.optString("lead"));
                Button b = add(row, words[0], "movie".equals(mid), n++);
                b.setOnClickListener(v -> {
                    ask("moment", "moment", mid);
                    Toast.makeText(this, words[0] + ": " + words[1], Toast.LENGTH_SHORT).show();
                });
            }
        }

        JSONObject rem = r.optJSONObject("remote");
        if (rem != null) {
            boolean on = rem.optBoolean("on"), muted = rem.optBoolean("muted");
            String label = rem.optString("name") + (on ? (rem.isNull("volume") ? "" : " · " + rem.optInt("volume"))
                    + (muted ? " · " + Ui.tr("mudo", "muted", "silencio") : "") : " · " + Ui.tr("desligado", "off", "apagado"));
            TextView l = FeedbackActivity.text(this, label, Ui.semibold, 28 * k, 0xB3FFFFFF);
            LinearLayout.LayoutParams llp = new LinearLayout.LayoutParams(-2, -2);
            llp.topMargin = Math.round(36 * k);
            column.addView(l, llp);
            LinearLayout row = row();
            ((LinearLayout.LayoutParams) row.getLayoutParams()).topMargin = Math.round(16 * k);
            add(row, Ui.tr("Mais baixo", "Quieter", "Más bajo"), false, n++).setOnClickListener(v -> ask("volume_down", null, null));
            add(row, Ui.tr("Mais alto", "Louder", "Más alto"), false, n++).setOnClickListener(v -> ask("volume_up", null, null));
            add(row, muted ? Ui.tr("Com som", "Unmute", "Con sonido") : Ui.tr("Mudo", "Mute", "Silencio"), false, n++)
                    .setOnClickListener(v -> ask("mute", null, null));
            add(row, on ? Ui.tr("Desligar", "Turn off", "Apagar") : Ui.tr("Ligar", "Turn on", "Encender"), false, n++)
                    .setOnClickListener(v -> ask("power", null, null));
        }

        JSONArray things = r.optJSONArray("things");
        LinearLayout row = null;
        int count = 0;
        for (int i = 0; things != null && i < things.length() && count < 12; i++) {
            JSONObject t = things.optJSONObject(i);
            if (t == null || t.optBoolean("away")) continue;
            if (count % 3 == 0) {
                row = row();
                ((LinearLayout.LayoutParams) row.getLayoutParams()).topMargin = Math.round((count == 0 ? 44 : 14) * k);
            }
            count++;
            final String tid = t.optString("id");
            boolean on = t.optBoolean("on");
            Button b = FeedbackActivity.button(this, (on ? "●  " : "○  ") + t.optString("name") + "\n"
                    + (on ? Ui.tr("Ligado", "On", "Encendido") : Ui.tr("Desligado", "Off", "Apagado")), k, false);
            b.setId(n++);
            b.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
            b.setSingleLine(false);
            b.setMaxLines(2);
            b.setEllipsize(android.text.TextUtils.TruncateAt.END);
            android.graphics.drawable.StateListDrawable bg = new android.graphics.drawable.StateListDrawable();
            bg.addState(new int[] {android.R.attr.state_focused}, FeedbackActivity.pill(0xFFFFFFFF, 0, 26 * k, 0, 0));
            bg.addState(new int[] {}, FeedbackActivity.pill(on ? 0x40E8A33D : 0x1FFFFFFF, 0, 26 * k, 0, 0));
            b.setBackground(bg);
            LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(Math.round(490 * k), Math.round(112 * k));
            bp.leftMargin = bp.rightMargin = Math.round(10 * k);
            row.addView(b, bp);
            b.setOnClickListener(v -> ask("toggle", "thing", tid));
        }
        if (n == 1) {
            TextView none = FeedbackActivity.text(this, Ui.tr("Nada para controlar neste cômodo ainda.", "Nothing to work in this room yet.",
                    "Nada que controlar en esta habitación aún."), Ui.regular, 30 * k, 0x9EFFFFFF);
            column.addView(none);
        }
        View back = at > 0 ? column.findViewById(at) : null;
        if (back == null) back = column.findViewById(1);
        if (back != null) back.requestFocus();
    }

    private void heading(String title, String sub) {
        TextView t = FeedbackActivity.text(this, title, Ui.displaySemibold, 60 * k, 0xFFFFFFFF);
        column.addView(t);
        if (sub != null && !sub.isEmpty()) {
            TextView s = FeedbackActivity.text(this, sub, Ui.regular, 30 * k, 0x9EFFFFFF);
            s.setPadding(0, Math.round(12 * k), 0, 0);
            column.addView(s);
        }
    }

    private LinearLayout row() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_HORIZONTAL);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.topMargin = Math.round(40 * k);
        column.addView(row, lp);
        return row;
    }

    private Button add(LinearLayout row, String label, boolean primary, int viewId) {
        Button b = FeedbackActivity.button(this, label, k, primary);
        b.setId(viewId);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        bp.leftMargin = bp.rightMargin = Math.round(10 * k);
        row.addView(b, bp);
        return b;
    }

    private void ask(String what, String field, String value) {
        try {
            JSONObject q = new JSONObject().put("room", roomId).put("do", what);
            if (field != null) q.put(field, value);
            HomeHub.act(q, (ok, why) -> {
                if (!ok) Toast.makeText(this, why != null ? why : Ui.tr("Não deu agora. Tente de novo.", "That didn't work. Try again.",
                        "No funcionó. Inténtalo de nuevo."), Toast.LENGTH_SHORT).show();
            });
        } catch (Exception ignored) {
            // A JSONObject with plain strings doesn't throw.
        }
    }

    /** A Moment's name and what it does, in the TV's language; the box's own words for one this TV doesn't know. */
    static String[] momentWords(String id, String name, String lead) {
        switch (id) {
            case "movie": return new String[] {Ui.tr("Noite de filme", "Movie night", "Noche de cine"),
                    Ui.tr("TV e som ligados, luzes baixas", "TV and sound on, lights down", "TV y sonido encendidos, luces bajas")};
            case "morning": return new String[] {Ui.tr("Manhã", "Morning", "Mañana"), Ui.tr("Luzes acesas", "Lights up", "Luces encendidas")};
            case "bedtime": return new String[] {Ui.tr("Hora de dormir", "Bedtime", "Hora de dormir"),
                    Ui.tr("Telas e luzes apagadas", "Screens and lights off", "Pantallas y luces apagadas")};
            case "off": return new String[] {Ui.tr("Desligar tudo", "Everything off", "Apagar todo"),
                    Ui.tr("O cômodo todo desligado", "The whole room off", "Toda la habitación apagada")};
            default: return new String[] {name, lead};
        }
    }
}
