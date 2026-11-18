package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * Live TV (ADR 0042): the Live TV button opens one screen of free channels, so a family that drops Sky still has the
 * news and the NZ channels from the remote. Rows, each only with what this TV has: the aerial and the Freeview, TVNZ+
 * and ThreeNow apps; world news that streams free on YouTube, played full screen here in YouTube's own player (up and
 * down change channel); Plex's free channels and the like; Sky Sport Now and Neon. Kids get the first row only.
 * The news list comes from our website (docs/live/channels.json), kept for next time, with this copy until then.
 * Same as web/livetv.js: change one, change both.
 */
public class LiveTvActivity extends Activity {
    static void open(Context c) {
        c.startActivity(new Intent(c, LiveTvActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private static final String LIST_URL = "https://yeahbuddynz.github.io/Beyond.TV/live/channels.json";
    /** YouTube's embeds want a real address behind them, as in KaraokeActivity. */
    private static final String BASE = "https://yeahbuddynz.github.io/Beyond.TV/";
    private static final Pattern CHANNEL_ID = Pattern.compile("^UC[A-Za-z0-9_-]{22}$");

    /** Name, where from, the channel's own YouTube channel. Same list as NEWS in web/livetv.js. */
    static final String[][] NEWS = {
            {"ABC News", "Australia", "UCVgO39Bk5sMo66-6o6Spn6Q"},
            {"Sky News", "UK", "UCoMdktPbSTixAyNGwb-UYkQ"},
            {"Al Jazeera", "Qatar", "UCNye-wNBqNL5ZzHSJj3l8Bg"},
            {"DW News", "Germany", "UCknLrEdhRCp1aegoMqRaCZg"},
            {"France 24", "France", "UCQfwfsi5VrQ8yKZ-UWmAEFg"},
            {"NHK World", "Japan", "UCSPEjw8F2nQDtmUKPFNF7_A"},
            {"CNA", "Singapore", "UC83jt4dlz1Gjl58fzQrrKZg"},
            {"LiveNOW from FOX", "USA", "UCJg9wBPyKMNA5sRDnvzmkdg"},
            {"Euronews", "Europe", "UCSrZ3UV4jOidv8ppoVuvW9Q"},
            {"Bloomberg", "USA", "UCIALMKvObZNtJ6AmdCLP7Lg"},
    };

    /** Apps by what they are: row, name on the button, matches the app's name or package. Same as APPS in livetv.js. */
    private static final Object[][] APPS = {
            {"nz", "Freeview", Pattern.compile("freeview", Pattern.CASE_INSENSITIVE)},
            {"nz", "TVNZ+", Pattern.compile("tvnz", Pattern.CASE_INSENSITIVE)},
            {"nz", "ThreeNow", Pattern.compile("threenow", Pattern.CASE_INSENSITIVE)},
            {"free", "Plex", Pattern.compile("plex", Pattern.CASE_INSENSITIVE)},
            {"free", "Samsung TV Plus", Pattern.compile("samsung tv plus|tvplus", Pattern.CASE_INSENSITIVE)},
            {"paid", "Sky Sport Now", Pattern.compile("sky ?sport ?now", Pattern.CASE_INSENSITIVE)},
            {"paid", "Neon", Pattern.compile("neon|nz\\.co\\.lightbox", Pattern.CASE_INSENSITIVE)},
    };

    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private View list, help;
    private WebView web;
    private TextView channelName, hint;
    private String[][] channels = NEWS;
    private int at = -1;
    private float k;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;
        channels = kept(this);
        refresh(getApplicationContext());

        root = new FrameLayout(this);
        root.addView(new FeedbackActivity.Backdrop(this), new FrameLayout.LayoutParams(-1, -1));
        list = buildList();
        root.addView(list, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
    }

    static boolean nz() {
        String z = TimeZone.getDefault().getID();
        return "Pacific/Auckland".equals(z) || "Pacific/Chatham".equals(z) || "NZ".equals(z);
    }

    private View buildList() {
        boolean kid = People.kid(this);
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(Math.round(140 * k), Math.round(70 * k), Math.round(140 * k), 0);

        TextView title = FeedbackActivity.text(this, Ui.emoji("📺") + " " + Ui.tr("TV ao vivo", "Live TV", "TV en vivo"),
                Ui.displaySemibold, 60 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.START);
        column.addView(title);
        TextView sub = FeedbackActivity.text(this, kid ? Ui.tr("Escolha um canal", "Pick a channel", "Elige un canal")
                : Ui.tr("Canais grátis, sem assinatura", "Free channels, no subscription", "Canales gratis, sin suscripción"),
                Ui.regular, 30 * k, 0xA6FFFFFF);
        sub.setGravity(Gravity.START);
        column.addView(sub);

        List<String[]> nzApps = new ArrayList<>(), free = new ArrayList<>(), paid = new ArrayList<>();
        sources(this, nzApps, free, paid);
        Button[] first = {null};
        boolean aerial = HomeApps.liveTv(this) != null;

        if (aerial || !nzApps.isEmpty()) {
            LinearLayout row = section(column, nz() ? Ui.tr("Nova Zelândia", "Here in Aotearoa", "Nueva Zelanda")
                    : Ui.tr("Na sua TV", "On your TV", "En tu TV"));
            if (aerial) add(row, first, Ui.emoji("📡") + "  " + Ui.tr("Antena", "Your aerial", "Tu antena"), this::openAerial);
            for (String[] a : nzApps) add(row, first, a[1], () -> openApp(a[0], a[1]));
        }
        if (!kid) {
            LinearLayout row = null;
            for (int i = 0; i < channels.length; i++) {
                if (i == 0) row = section(column, Ui.tr("Notícias do mundo, grátis", "World news, free", "Noticias del mundo, gratis"));
                else if (i % 6 == 0) row = moreRow(column);
                final int n = i;
                add(row, first, channels[i][0], () -> watch(n));
            }
            if (!free.isEmpty()) {
                LinearLayout more = section(column, Ui.tr("Mais canais grátis", "More free channels", "Más canales gratis"));
                for (String[] a : free) add(more, first, a[1], () -> {
                    openApp(a[0], a[1]);
                    if ("Plex".equals(a[1])) Toast.makeText(this, Ui.tr("Escolha TV ao vivo no Plex", "Pick Live TV in Plex",
                            "Elige TV en vivo en Plex"), Toast.LENGTH_LONG).show();
                });
            }
            if (!paid.isEmpty()) {
                LinearLayout extras = section(column, Ui.tr("Extras pagos", "Paid extras", "Extras de pago"));
                for (String[] a : paid) add(extras, first, a[1], () -> openApp(a[0], a[1]));
            }
            if (nz()) {
                LinearLayout row2 = moreRow(column);
                ((LinearLayout.LayoutParams) row2.getLayoutParams()).topMargin = Math.round(14 * k);
                add(row2, first, Ui.tr("Quais canais eu tenho?", "Which channels can I get?", "¿Qué canales tengo?"), this::explain);
            }
        }
        if (!aerial && nzApps.isEmpty()) {
            TextView tip = FeedbackActivity.text(this, kid
                    ? Ui.tr("Peça a um adulto para instalar o Freeview.", "Ask a grown-up to add the Freeview app.", "Pide a un adulto que instale Freeview.")
                    : Ui.tr("Sem antena? O app Freeview Streaming TV tem os canais grátis da Nova Zelândia.",
                    "No aerial? The Freeview Streaming TV app has every free NZ channel. Find it in the TV's app store.",
                    "¿Sin antena? La app Freeview Streaming TV tiene los canales gratis de Nueva Zelanda."),
                    Ui.regular, 28 * k, 0xA6FFFFFF);
            tip.setGravity(Gravity.START);
            tip.setPadding(0, Math.round(30 * k), 0, 0);
            if (nz() || kid) column.addView(tip);
        }
        if (first[0] != null) {
            final Button f = first[0];
            handler.post(f::requestFocus);
        }
        return column;
    }

    private LinearLayout section(LinearLayout column, String label) {
        TextView t = FeedbackActivity.text(this, label.toUpperCase(Ui.locale()), Ui.semibold, 22 * k, 0x8CFFFFFF);
        t.setGravity(Gravity.START);
        t.setLetterSpacing(0.08f);
        t.setPadding(0, Math.round(30 * k), 0, Math.round(12 * k));
        column.addView(t);
        return moreRow(column);
    }

    private LinearLayout moreRow(LinearLayout column) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Math.round(76 * k));
        lp.bottomMargin = Math.round(16 * k);
        column.addView(row, lp);
        return row;
    }

    private void add(LinearLayout row, Button[] first, String label, Runnable run) {
        Button b = FeedbackActivity.button(this, label, k, first[0] == null);
        b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 27 * k);
        b.setPadding(Math.round(30 * k), 0, Math.round(30 * k), 0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setMaxLines(1);
        b.setOnClickListener(v -> run.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -1);
        lp.rightMargin = Math.round(18 * k);
        row.addView(b, lp);
        if (first[0] == null) first[0] = b;
    }

    /** The installed apps for each row, in APPS order, each app once: {package, name on the button}. */
    static void sources(Context c, List<String[]> nzApps, List<String[]> free, List<String[]> paid) {
        List<String[]> installed = HomeApps.launchable(c);
        Set<String> used = new HashSet<>();
        for (Object[] want : APPS) {
            Pattern p = (Pattern) want[2];
            for (String[] app : installed) {
                if (used.contains(app[0])) continue;
                if (p.matcher(app[1] == null ? "" : app[1]).find() || p.matcher(app[0]).find()) {
                    used.add(app[0]);
                    String[] s = {app[0], (String) want[1]};
                    if ("nz".equals(want[0])) nzApps.add(s);
                    else if ("free".equals(want[0])) free.add(s);
                    else paid.add(s);
                    break;
                }
            }
        }
    }

    private void openAerial() {
        if (JobsActivity.first(this)) return;
        Intent i = HomeApps.liveTv(this);
        try {
            if (i != null) {
                startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                finish();
                return;
            }
        } catch (RuntimeException ignored) {
        }
        Toast.makeText(this, Ui.tr("Não deu para abrir ", "Couldn't open ") + Ui.tr("TV aberta", "Live TV") + ".", Toast.LENGTH_SHORT).show();
    }

    private void openApp(String pkg, String label) {
        if (JobsActivity.first(this)) return;
        Intent i = HomeApps.launchIntent(getPackageManager(), pkg);
        try {
            if (i != null) {
                startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED));
                finish();
                return;
            }
        } catch (RuntimeException ignored) {
        }
        Toast.makeText(this, Ui.tr("Não deu para abrir ", "Couldn't open ") + label + ".", Toast.LENGTH_SHORT).show();
    }

    // MARK: - Which channels can I get?

    private void explain() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackgroundColor(0xFF0D0C18);
        box.setPadding(Math.round(140 * k), Math.round(160 * k), Math.round(140 * k), 0);
        TextView title = FeedbackActivity.text(this, Ui.tr("Quais canais eu tenho?", "Which channels can I get?", "¿Qué canales tengo?"),
                Ui.displaySemibold, 56 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.START);
        box.addView(title);
        String more = Ui.tr("e mais", "and more", "y más");
        String[][] lines = {
                {Ui.tr("Grátis, com antena ou o app Freeview", "Free, with an aerial or the Freeview app", "Gratis, con antena o la app Freeview"),
                        "TVNZ 1, TVNZ 2, Three, Sky Open, Whakaata Māori, DUKE, eden " + more},
                {Ui.tr("Grátis, aqui no Beyond TV", "Free, right here in Beyond™ TV", "Gratis, aquí en Beyond™ TV"),
                        Ui.tr("Notícias 24 horas: ", "News around the clock: ", "Noticias las 24 horas: ") + "ABC News, Sky News, Al Jazeera, DW, LiveNOW from FOX " + more},
                {Ui.tr("Pagos, só na Sky", "Paid, only from Sky", "De pago, solo en Sky"),
                        "Sky Sport, Fox News, History, Jones!, Living. " + Ui.tr("Para esportes sem a caixa da Sky: Sky Sport Now.",
                        "For sport without a Sky box: Sky Sport Now.", "Para deportes sin la caja de Sky: Sky Sport Now.")},
        };
        for (String[] l : lines) {
            TextView what = FeedbackActivity.text(this, l[0], Ui.displaySemibold, 38 * k, 0xFFFFFFFF);
            what.setGravity(Gravity.START);
            what.setPadding(0, Math.round(44 * k), 0, Math.round(8 * k));
            box.addView(what);
            TextView detail = FeedbackActivity.text(this, l[1], Ui.regular, 28 * k, 0xA6FFFFFF);
            detail.setGravity(Gravity.START);
            box.addView(detail);
        }
        Button ok = FeedbackActivity.button(this, Ui.tr("Entendi", "Got it", "Entendido"), k, true);
        ok.setOnClickListener(v -> closeHelp());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Math.round(84 * k));
        lp.topMargin = Math.round(60 * k);
        box.addView(ok, lp);
        help = box;
        root.addView(help, new FrameLayout.LayoutParams(-1, -1));
        list.setVisibility(View.INVISIBLE);
        ok.requestFocus();
    }

    private void closeHelp() {
        if (help == null) return;
        root.removeView(help);
        help = null;
        list.setVisibility(View.VISIBLE);
        list.requestFocus();
    }

    // MARK: - World news, full screen

    @SuppressLint("SetJavaScriptEnabled")
    private void watch(int i) {
        try {
            if (web == null) {
                web = new WebView(this);
                web.setBackgroundColor(Color.BLACK);
                WebSettings ws = web.getSettings();
                ws.setJavaScriptEnabled(true);
                ws.setDomStorageEnabled(true);
                ws.setMediaPlaybackRequiresUserGesture(false);
                web.setFocusable(false);
                root.addView(web, new FrameLayout.LayoutParams(-1, -1));
                channelName = FeedbackActivity.text(this, "", Ui.semibold, 34 * k, 0xFFFFFFFF);
                channelName.setBackgroundColor(0xD10D0C18);
                channelName.setPadding(Math.round(34 * k), Math.round(18 * k), Math.round(34 * k), Math.round(18 * k));
                FrameLayout.LayoutParams np = new FrameLayout.LayoutParams(-2, -2, Gravity.START | Gravity.BOTTOM);
                np.leftMargin = np.bottomMargin = Math.round(60 * k);
                root.addView(channelName, np);
                hint = FeedbackActivity.text(this, Ui.tr("▲ ▼ muda o canal", "▲ ▼ to change channel", "▲ ▼ cambia de canal"),
                        Ui.regular, 26 * k, 0xB3FFFFFF);
                FrameLayout.LayoutParams hp = new FrameLayout.LayoutParams(-2, -2, Gravity.END | Gravity.TOP);
                hp.rightMargin = Math.round(48 * k);
                hp.topMargin = Math.round(36 * k);
                root.addView(hint, hp);
            }
        } catch (Throwable t) {
            // No WebView on this TV: the channel in the YouTube app.
            web = null;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://www.youtube.com/channel/" + channels[i][2] + "/live"))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (RuntimeException ignored) {
            }
            return;
        }
        at = i;
        list.setVisibility(View.INVISIBLE);
        web.setVisibility(View.VISIBLE);
        channelName.setVisibility(View.VISIBLE);
        hint.setVisibility(View.VISIBLE);
        web.loadDataWithBaseURL(BASE, page(channels[i][2]), "text/html", "utf-8", null);
        channelName.setText(channels[i][0] + (channels[i][1].isEmpty() ? "" : "  ·  " + channels[i][1]));
        channelName.setAlpha(1);
        hint.setAlpha(1);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> {
            if (channelName != null) channelName.animate().alpha(0).setDuration(600);
            if (hint != null) hint.animate().alpha(0).setDuration(600);
        }, 4000);
    }

    /** The channel's live stream in YouTube's own player, ads and all. */
    static String page(String channel) {
        return "<!doctype html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head>"
                + "<body><iframe allow='autoplay; encrypted-media' allowfullscreen src='https://www.youtube.com/embed/live_stream?channel="
                + channel + "&autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3'></iframe></body></html>";
    }

    private void stopWatching() {
        at = -1;
        handler.removeCallbacksAndMessages(null);
        if (web != null) {
            web.loadUrl("about:blank");
            web.setVisibility(View.GONE);
            channelName.setVisibility(View.GONE);
            hint.setVisibility(View.GONE);
        }
        list.setVisibility(View.VISIBLE);
        list.requestFocus();
    }

    static int step(int i, int by, int n) {
        return n == 0 ? 0 : ((i + by) % n + n) % n;
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        boolean watching = at >= 0;
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() != KeyEvent.ACTION_UP) return true;
            if (watching) stopWatching();
            else if (help != null) closeHelp();
            else finish();
            return true;
        }
        if (watching) {
            if (e.getAction() != KeyEvent.ACTION_DOWN) return true;
            if (code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_CHANNEL_UP) watch(step(at, 1, channels.length));
            else if (code == KeyEvent.KEYCODE_DPAD_DOWN || code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_CHANNEL_DOWN) watch(step(at, -1, channels.length));
            else if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER) watch(at);
            else return super.dispatchKeyEvent(e);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // MARK: - The news list

    /** The good channels in a list file ({channels: [...]}), or null when there are none. */
    static String[][] goodOf(String json) {
        try {
            JSONArray l = new JSONObject(json).getJSONArray("channels");
            List<String[]> out = new ArrayList<>();
            for (int i = 0; i < l.length() && out.size() < 40; i++) {
                JSONObject c = l.optJSONObject(i);
                if (c == null) continue;
                String name = c.optString("name", ""), id = c.optString("youtube", "");
                if (!name.isEmpty() && CHANNEL_ID.matcher(id).matches()) out.add(new String[] {name, c.optString("from", ""), id});
            }
            return out.isEmpty() ? null : out.toArray(new String[0][]);
        } catch (Exception e) {
            return null;
        }
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("live", Context.MODE_PRIVATE);
    }

    /** The last good list from the website, else ours. */
    static String[][] kept(Context c) {
        String[][] l = goodOf(prefs(c).getString("channels", ""));
        return l != null ? l : NEWS;
    }

    /** Reads the website's list in the background, for the next time Live TV opens. */
    private static void refresh(Context app) {
        new Thread(() -> {
            try {
                String json = Http.get(LIST_URL, "application/json", 256 * 1024);
                if (goodOf(json) != null) prefs(app).edit().putString("channels", json).apply();
            } catch (Exception e) {
                AppLog.w("live tv list: " + e.getMessage());
            }
        }, "beyond-live-list").start();
    }
}
