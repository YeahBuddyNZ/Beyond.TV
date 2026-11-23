package nz.gobeyond.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
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
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * Live TV (ADR 0042, tiles and live videos ADR 0053): the Live TV button opens one screen of free channels, so a family
 * that drops Sky still has the news and the NZ channels from the remote. Rows of logo tiles, each only with what this
 * TV has: the aerial and the Freeview, TVNZ+ and ThreeNow apps; Featured, World news, and Weather, space and music,
 * channels that stream free on YouTube around the clock; Plex's free channels and the like; Sky Sport Now and Neon.
 * Kids get the first row and the kids' channels. A channel plays in the TV's YouTube app when it has one (smooth, the
 * TV's own video decoder), else full screen here in YouTube's web player (up and down change channel).
 * The list comes from our website (docs/live/channels.json), kept for next time, with this copy until then; now.json
 * beside it says which video each channel streams right now (tools/live_now.py, hourly), and the logos sit in
 * live/logos/. Now and next, favourites (ADR 0058): each tile says what is on now (the live video's title, from
 * now.json) and the corner says what is on next for the focused one, when the channel has scheduled it. Holding OK on a
 * channel pins it to "Your favourites", the first row, for whoever is watching; kept on the TV only. What was last
 * watched leads Keep watching on the home screen, and Continue there opens it again (extra PLAY).
 * Same as web/livetv.js: change one, change both.
 */
public class LiveTvActivity extends Activity {
    static void open(Context c) {
        c.startActivity(new Intent(c, LiveTvActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    /** Continue on the home screen: Live TV, straight into this channel when it's still on air. */
    static void play(Context c, String id) {
        c.startActivity(new Intent(c, LiveTvActivity.class).putExtra(PLAY, id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    static final String PLAY = "play";
    /** Favourites each person can pin; holding OK again takes one off. */
    static final int MAX_FAVS = 12;

    private static final String SITE = "https://yeahbuddynz.github.io/Beyond.TV/live/";
    private static final String LIST_URL = SITE + "channels.json", NOW_URL = SITE + "now.json";
    private static final String YOUTUBE = "com.google.android.youtube.tv";
    /** How long now.json is trusted: a 24/7 stream keeps its video for weeks, an hourly file is never this old. */
    private static final long NOW_FOR = 3L * 24 * 3600 * 1000;
    private static final Pattern VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9-]{1,40}$");
    static final String[] GROUPS = {"featured", "news", "more", "kids"};
    // Fields of a channel
    static final int ID = 0, NAME = 1, FROM = 2, YT = 3, GROUP = 4, COLOUR = 5, VIDEO = 6, NOW = 7, NEXT = 8, NEXT_AT = 9;
    /** YouTube's embeds want a real address behind them, as in KaraokeActivity. */
    private static final String BASE = "https://yeahbuddynz.github.io/Beyond.TV/";
    private static final Pattern CHANNEL_ID = Pattern.compile("^UC[A-Za-z0-9_-]{22}$");

    /** id, name, where from, the channel's own YouTube channel, row, tile colour. Same list as NEWS in web/livetv.js. */
    static final String[][] NEWS = {
            {"sky-news", "Sky News", "UK", "UCoMdktPbSTixAyNGwb-UYkQ", "featured", "#FFFFFF"},
            {"abc-us", "ABC News Live", "USA", "UCBi2mrWuNuyYy4gbM6fU18Q", "featured", "#FFFFFF"},
            {"nbc-now", "NBC News NOW", "USA", "UCeY0bbntWzzVIaj2z3QigXg", "featured", "#082038"},
            {"aljazeera", "Al Jazeera", "Qatar", "UCNye-wNBqNL5ZzHSJj3l8Bg", "featured", "#A8312D"},
            {"livenow-fox", "LiveNOW from FOX", "USA", "UCJg9wBPyKMNA5sRDnvzmkdg", "featured", "#FFFFFF"},
            {"abc-au", "ABC News", "Australia", "UCVgO39Bk5sMo66-6o6Spn6Q", "featured", "#1E5AEC"},
            {"cnn", "CNN Headlines", "USA", "UCupvZG-5ko_eiXAupbDfxWw", "news", "#CC0001"},
            {"dw", "DW News", "Germany", "UCknLrEdhRCp1aegoMqRaCZg", "news", "#06A7F7"},
            {"france24", "France 24", "France", "UCQfwfsi5VrQ8yKZ-UWmAEFg", "news", "#FFFFFF"},
            {"nhk", "NHK World", "Japan", "UCSPEjw8F2nQDtmUKPFNF7_A", "news", "#FFFFFF"},
            {"cna", "CNA", "Singapore", "UC83jt4dlz1Gjl58fzQrrKZg", "news", "#FFFFFF"},
            {"euronews", "Euronews", "Europe", "UCSrZ3UV4jOidv8ppoVuvW9Q", "news", "#0173F0"},
            {"bloomberg", "Bloomberg", "USA", "UCIALMKvObZNtJ6AmdCLP7Lg", "news", "#FFFFFF"},
            {"trt", "TRT World", "Turkey", "UC7fWeaHhqgM4Ry-RMpM2YYw", "news", "#14B5C9"},
            {"wion", "WION", "India", "UC_gUM8rL-Lrg6O3adPW9K1g", "news", "#FFFFFF"},
            {"gb-news", "GB News", "UK", "UC0vn8ISa4LKMunLbzaXLnOQ", "news", "#CFDCE4"},
            {"fox-weather", "FOX Weather", "USA", "UC1FbPiXx59_ltnFVx7IxWow", "more", "#FFFFFF"},
            {"nasa", "NASA", "Space station", "UCLA_DiR1FfKNvjuUpBHmylQ", "more", "#FFFFFF"},
            {"lofi", "Lofi Girl", "Music", "UCSJ4gkVC6NrvII8umztf0Ow", "more", "#FFFFFF"},
            {"pbs-kids", "PBS KIDS", "Kids", "UCrNnk0wFBnCS1awGjq_ijGQ", "kids", "#FFFFFF"},
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
    private View backdrop, list, help;
    private WebView web;
    private TextView channelName, hint;
    /** What's on now and next for the focused channel, in the top right corner. */
    private LinearLayout nowBar;
    private TextView nowWho, nowLine, nextLine;
    /** After pinning: the channel whose tile gets the focus back, in its own row. */
    private String keepOn;
    private View keepTile;
    /** The channels on air, in row order (what up and down go through while watching). */
    private String[][] playable = new String[0][];
    private int at = -1;
    private float k;
    private boolean gone;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        k = getResources().getDisplayMetrics().widthPixels / 1920f;

        root = new FrameLayout(this);
        backdrop = new FeedbackActivity.Backdrop(this);
        root.addView(backdrop, new FrameLayout.LayoutParams(-1, -1));
        String[][] shown = onAir(kept(this), keptNow(this), System.currentTimeMillis());
        list = buildList(shown);
        root.addView(list, new FrameLayout.LayoutParams(-1, -1));
        root.addView(buildNowBar(), nowBarParams());
        // The corner follows the focus: a channel's now and next, nothing for an app or a button.
        root.getViewTreeObserver().addOnGlobalFocusChangeListener((was, now) ->
                showNow(now == null ? null : (String[]) now.getTag(R_CHANNEL)));
        setContentView(root);
        String play = getIntent().getStringExtra(PLAY);
        if (play != null) {
            for (int i = 0; i < playable.length; i++) {
                if (play.equals(playable[i][ID])) {
                    final int at0 = i;
                    handler.post(() -> { if (!gone) watch(at0); });
                    break;
                }
            }
        }
        refresh(getApplicationContext(), () -> {
            // The website had something newer: show it, unless somebody has moved on from the first tile already.
            String[][] fresh = onAir(kept(this), keptNow(this), System.currentTimeMillis());
            if (gone || at >= 0 || help != null || same(fresh, shown)) return;
            View focus = getCurrentFocus();
            if (focus != null && focus != firstTile) return;
            root.removeView(list);
            list = buildList(fresh);
            root.addView(list, 1, new FrameLayout.LayoutParams(-1, -1));
        });
    }

    /** The corner card: the channel's name and where from, Now and its title, then Up next with its time. */
    private View buildNowBar() {
        nowBar = new LinearLayout(this);
        nowBar.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xDB0D0C18);
        bg.setCornerRadius(24 * k);
        nowBar.setBackground(bg);
        nowBar.setElevation(10 * k);
        nowBar.setPadding(Math.round(28 * k), Math.round(20 * k), Math.round(28 * k), Math.round(22 * k));
        nowWho = FeedbackActivity.text(this, "", Ui.displaySemibold, 28 * k, 0xFFFFFFFF);
        nowLine = FeedbackActivity.text(this, "", Ui.regular, 22 * k, 0xD9FFFFFF);
        nextLine = FeedbackActivity.text(this, "", Ui.regular, 22 * k, 0x99FFFFFF);
        for (TextView t : new TextView[] {nowWho, nowLine, nextLine}) {
            t.setGravity(Gravity.START);
            t.setMaxLines(2);
            t.setEllipsize(android.text.TextUtils.TruncateAt.END);
            nowBar.addView(t, new LinearLayout.LayoutParams(-1, -2));
        }
        nowWho.setSingleLine(true);
        nowLine.setPadding(0, Math.round(8 * k), 0, 0);
        nextLine.setPadding(0, Math.round(6 * k), 0, 0);
        nowBar.setVisibility(View.INVISIBLE);
        return nowBar;
    }

    private FrameLayout.LayoutParams nowBarParams() {
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.round(696 * k), -2, Gravity.END | Gravity.TOP);
        lp.rightMargin = Math.round(140 * k);
        lp.topMargin = Math.round(64 * k);
        return lp;
    }

    private void showNow(String[] c) {
        if (nowBar == null) return;
        if (c == null || at >= 0 || help != null) {
            nowBar.setVisibility(View.INVISIBLE);
            return;
        }
        nowWho.setText(c[NAME] + (c[FROM].isEmpty() ? "" : "  ·  " + c[FROM]));
        android.text.SpannableString now = new android.text.SpannableString(Ui.tr("Agora", "Now", "Ahora") + "  "
                + (c[NOW] != null ? c[NOW] : Ui.tr("Ao vivo", "Live", "En vivo")));
        int end = Ui.tr("Agora", "Now", "Ahora").length();
        now.setSpan(new android.text.style.ForegroundColorSpan(Glow.LILAC), 0, end, 0);
        now.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD), 0, end, 0);
        nowLine.setText(now);
        String next = nextText(c, System.currentTimeMillis());
        nextLine.setText(next);
        nextLine.setVisibility(next.isEmpty() ? View.GONE : View.VISIBLE);
        nowBar.setVisibility(View.VISIBLE);
    }

    /** "Up next 7:00 PM: Mornings with Ridge and Frost" while it hasn't started, else empty. */
    static String nextText(String[] c, long time) {
        long nextAt = nextAt(c);
        if (nextAt <= time) return "";
        return Ui.tr("A seguir", "Up next", "A continuación") + " " + Ui.time(nextAt) + ": " + c[NEXT];
    }

    static long nextAt(String[] c) {
        if (c.length <= NEXT_AT || c[NEXT] == null || c[NEXT_AT] == null) return 0;
        try {
            return Long.parseLong(c[NEXT_AT]);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    static boolean nz() {
        String z = TimeZone.getDefault().getID();
        return "Pacific/Auckland".equals(z) || "Pacific/Chatham".equals(z) || "NZ".equals(z);
    }

    private View firstTile, lastFocus;

    private void restoreFocus() {
        if (lastFocus != null && lastFocus.isAttachedToWindow()) lastFocus.requestFocus();
        else if (firstTile != null) firstTile.requestFocus();
    }

    private View buildList(String[][] channels) {
        boolean kid = People.kid(this);
        ScrollView scroll = new ScrollView(this);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.setClipChildren(false);
        scroll.setSmoothScrollingEnabled(true);
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setClipChildren(false);
        column.setPadding(Math.round(140 * k), Math.round(70 * k), Math.round(140 * k), Math.round(80 * k));
        scroll.addView(column, new ScrollView.LayoutParams(-1, -2));

        TextView title = FeedbackActivity.text(this, Ui.emoji("📺") + " " + Ui.tr("TV ao vivo", "Live TV", "TV en vivo"),
                Ui.displaySemibold, 60 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.START);
        column.addView(title);
        TextView sub = FeedbackActivity.text(this, kid ? Ui.tr("Escolha um canal", "Pick a channel", "Elige un canal")
                : Ui.tr("Canais grátis, sem assinatura", "Free channels, no subscription", "Canales gratis, sin suscripción"),
                Ui.regular, 30 * k, 0xA6FFFFFF);
        sub.setGravity(Gravity.START);
        column.addView(sub);
        TextView pinTip = FeedbackActivity.text(this, Ui.tr("Segure OK num canal para fixá-lo no topo.", "Hold OK on a channel to pin it to the top.",
                "Mantén OK en un canal para fijarlo arriba."), Ui.regular, 24 * k, 0x8CFFFFFF);
        pinTip.setGravity(Gravity.START);
        pinTip.setPadding(0, Math.round(4 * k), 0, 0);
        column.addView(pinTip, new LinearLayout.LayoutParams(Math.round(900 * k), -2));

        List<String[]> nzApps = new ArrayList<>(), free = new ArrayList<>(), paid = new ArrayList<>();
        sources(this, nzApps, free, paid);
        firstTile = null;
        boolean aerial = HomeApps.liveTv(this) != null;

        List<String[]> play = new ArrayList<>();
        for (String g : kid ? new String[] {"kids"} : new String[] {"featured", "news", "more"}) play.addAll(inGroup(channels, g));
        playable = play.toArray(new String[0][]);
        List<String[]> pinned = favourites(playable, favs(this, People.current(this).id));
        keepTile = null;
        // Your favourites first: the channels this person pinned by holding OK.
        channelRow(column, Ui.tr("Seus favoritos", "Your favourites", "Tus favoritos"), pinned, true, true, pinned);

        if (aerial || !nzApps.isEmpty()) {
            LinearLayout row = section(column, nz() ? Ui.tr("Nova Zelândia", "Here in Aotearoa", "Nueva Zelanda")
                    : Ui.tr("Na sua TV", "On your TV", "En tu TV"));
            if (aerial) add(row, tile(Ui.tr("Antena", "Your aerial", "Tu antena"), "", null, Ui.emoji("📡"), 0xFF6E3DDB, false, true), this::openAerial);
            for (String[] a : nzApps) add(row, appTile(a), () -> openApp(a[0], a[1]));
        }
        if (kid) {
            channelRow(column, Ui.tr("Para crianças", "For kids", "Para niños"), inGroup(channels, "kids"), true, false, pinned);
        } else {
            channelRow(column, Ui.tr("Em destaque", "Featured", "Destacados"), inGroup(channels, "featured"), true, false, pinned);
            channelRow(column, Ui.tr("Notícias do mundo, grátis", "World news, free", "Noticias del mundo, gratis"), inGroup(channels, "news"), false, false, pinned);
            channelRow(column, Ui.tr("Clima, espaço e música", "Weather, space and music", "Clima, espacio y música"), inGroup(channels, "more"), false, false, pinned);
            if (!free.isEmpty()) {
                LinearLayout more = section(column, Ui.tr("Mais canais grátis", "More free channels", "Más canales gratis"));
                for (String[] a : free) add(more, appTile(a), () -> {
                    openApp(a[0], a[1]);
                    if ("Plex".equals(a[1])) Toast.makeText(this, Ui.tr("Escolha TV ao vivo no Plex", "Pick Live TV in Plex",
                            "Elige TV en vivo en Plex"), Toast.LENGTH_LONG).show();
                });
            }
            if (!paid.isEmpty()) {
                LinearLayout extras = section(column, Ui.tr("Extras pagos", "Paid extras", "Extras de pago"));
                for (String[] a : paid) add(extras, appTile(a), () -> openApp(a[0], a[1]));
            }
            if (nz()) {
                Button b = FeedbackActivity.button(this, Ui.tr("Quais canais eu tenho?", "Which channels can I get?", "¿Qué canales tengo?"), k, false);
                b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 27 * k);
                b.setPadding(Math.round(30 * k), 0, Math.round(30 * k), 0);
                b.setMinHeight(0);
                b.setMinimumHeight(0);
                b.setOnClickListener(v -> explain());
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Math.round(76 * k));
                lp.topMargin = Math.round(30 * k);
                column.addView(b, lp);
                if (firstTile == null) firstTile = b;
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
        // Pinned or unpinned: the focus stays on that channel in its own row.
        final View f = keepTile != null ? keepTile : firstTile;
        keepOn = null;
        if (f != null) handler.post(f::requestFocus);
        return scroll;
    }

    private void channelRow(LinearLayout column, String label, List<String[]> channels, boolean big, boolean favRow, List<String[]> pinned) {
        if (channels.isEmpty()) return;
        LinearLayout row = section(column, label);
        for (String[] c : channels) {
            int colour = 0xFF2C2458;
            try {
                colour = Color.parseColor(c[COLOUR]);
            } catch (RuntimeException ignored) {
            }
            View t = tile(c[NAME], c[NOW] != null ? c[NOW] : c[FROM], logoFile(this, c[ID]), c[NAME], colour, big, false);
            if (favRow || pinned.contains(c)) star(t);
            loadLogo(t, c[ID]);
            add(row, t, () -> watch(indexOf(playable, c)));
            // Holding OK pins the channel for whoever is watching (or takes it off).
            t.setOnLongClickListener(v -> {
                pin(c);
                return true;
            });
            t.setTag(R_CHANNEL, c);
            if (!favRow && c[ID].equals(keepOn)) keepTile = t;
        }
    }

    /** A key for the channel id on its tile (any id unique to this app does). */
    private static final int R_CHANNEL = 0x7f0b0001;

    /** The star on a pinned channel's picture. */
    private void star(View tile) {
        FrameLayout face = (FrameLayout) ((LinearLayout) tile).getChildAt(0);
        TextView s = FeedbackActivity.text(this, "\u2605", Ui.semibold, 24 * k, 0xFFFFFFFF);
        s.setGravity(Gravity.CENTER);
        GradientDrawable dot = new GradientDrawable();
        dot.setColor(0xFF6E3DDB);
        dot.setShape(GradientDrawable.OVAL);
        s.setBackground(dot);
        int d = Math.round(40 * k);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(d, d, Gravity.END | Gravity.TOP);
        lp.rightMargin = lp.topMargin = Math.round(10 * k);
        face.addView(s, face.getChildCount() - 1, lp);
    }

    /** Pins or unpins a channel for whoever is watching, says so, and draws the rows again. */
    private void pin(String[] c) {
        boolean pinned = toggleFav(this, People.current(this).id, c[ID]);
        Toast.makeText(this, pinned ? Ui.tr("Fixado nos seus favoritos", "Pinned to your favourites", "Fijado en tus favoritos")
                : Ui.tr("Tirado dos seus favoritos", "Taken out of your favourites", "Quitado de tus favoritos"), Toast.LENGTH_SHORT).show();
        keepOn = c[ID];
        root.removeView(list);
        list = buildList(onAir(kept(this), keptNow(this), System.currentTimeMillis()));
        root.addView(list, 1, new FrameLayout.LayoutParams(-1, -1));
    }

    private static int indexOf(String[][] l, String[] c) {
        for (int i = 0; i < l.length; i++) if (l[i] == c) return i;
        return 0;
    }

    /** A row's label and its strip of tiles, which slides sideways under the focus. */
    private LinearLayout section(LinearLayout column, String label) {
        TextView t = FeedbackActivity.text(this, label.toUpperCase(Ui.locale()), Ui.semibold, 22 * k, 0x8CFFFFFF);
        t.setGravity(Gravity.START);
        t.setLetterSpacing(0.08f);
        t.setPadding(0, Math.round(34 * k), 0, 0);
        column.addView(t);
        HorizontalScrollView strip = new HorizontalScrollView(this);
        strip.setHorizontalScrollBarEnabled(false);
        strip.setClipChildren(false);
        strip.setClipToPadding(false);
        strip.setSmoothScrollingEnabled(true);
        // Room around the tiles for the focused one to grow into.
        int pad = Math.round(30 * k);
        strip.setPadding(pad, pad, pad, 0);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setClipChildren(false);
        strip.addView(row, new HorizontalScrollView.LayoutParams(-2, -2));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.leftMargin = lp.rightMargin = -pad;
        column.addView(strip, lp);
        return row;
    }

    private void add(LinearLayout row, View tile, Runnable run) {
        tile.setOnClickListener(v -> run.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
        lp.rightMargin = Math.round(30 * k);
        row.addView(tile, lp);
        if (firstTile == null) firstTile = tile;
    }

    /**
     * A tile: a square picture (the channel's logo), or a 16:9 card (an app's own TV banner), with its name and where
     * it's from underneath. The picture grows with a lilac ring when the tile has the focus, as on the Games screen.
     */
    private View tile(String name, String from, File pic, String word, int colour, boolean big, boolean emoji) {
        return tile(name, from, pic, word, colour, Math.round((big ? 220 : 176) * k), Math.round((big ? 220 : 176) * k), emoji);
    }

    private View tile(String name, String from, File pic, String word, int colour, int w, int h, boolean emoji) {
        LinearLayout t = new LinearLayout(this);
        t.setOrientation(LinearLayout.VERTICAL);
        t.setFocusable(true);
        t.setClickable(true);
        t.setClipChildren(false);
        float radius = (w == h ? 28 : 22) * k * (h / (176 * k));
        FrameLayout face = new FrameLayout(this);
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(colour);
        shape.setCornerRadius(radius);
        face.setBackground(shape);
        face.setClipToOutline(true);
        face.setElevation(4 * k);
        TextView label = FeedbackActivity.text(this, word, Ui.semibold, (emoji ? 84 : 26) * k, 0xFFFFFFFF);
        label.setGravity(Gravity.CENTER);
        label.setPadding(Math.round(10 * k), 0, Math.round(10 * k), 0);
        face.addView(label, new FrameLayout.LayoutParams(-1, -1));
        ImageView img = new ImageView(this);
        img.setScaleType(ImageView.ScaleType.CENTER_CROP);
        img.setVisibility(View.GONE);
        face.addView(img, new FrameLayout.LayoutParams(-1, -1));
        GradientDrawable ring = new GradientDrawable();
        ring.setColor(0);
        ring.setCornerRadius(radius);
        ring.setStroke(Math.round(5 * k), Glow.LILAC);
        View over = new View(this);
        over.setBackground(ring);
        over.setVisibility(View.INVISIBLE);
        face.addView(over, new FrameLayout.LayoutParams(-1, -1));
        t.addView(face, new LinearLayout.LayoutParams(w, h));
        TextView n = FeedbackActivity.text(this, name, Ui.semibold, 24 * k, 0xD9FFFFFF);
        n.setGravity(Gravity.START);
        n.setSingleLine(true);
        n.setEllipsize(android.text.TextUtils.TruncateAt.END);
        n.setPadding(0, Math.round(22 * k), 0, 0);
        t.addView(n, new LinearLayout.LayoutParams(w, -2));
        TextView f = FeedbackActivity.text(this, from, Ui.regular, 20 * k, 0x8CFFFFFF);
        f.setGravity(Gravity.START);
        f.setSingleLine(true);
        f.setEllipsize(android.text.TextUtils.TruncateAt.END);
        if (from.isEmpty()) f.setVisibility(View.GONE);
        t.addView(f, new LinearLayout.LayoutParams(w, -2));
        t.setOnFocusChangeListener((v, focused) -> {
            over.setVisibility(focused ? View.VISIBLE : View.INVISIBLE);
            face.animate().scaleX(focused ? 1.12f : 1).scaleY(focused ? 1.12f : 1).setDuration(160).start();
            face.setElevation((focused ? 14 : 4) * k);
            n.setTextColor(focused ? 0xFFFFFFFF : 0xD9FFFFFF);
        });
        t.setTag(img);
        if (pic != null && pic.isFile()) show(t, BitmapFactory.decodeFile(pic.getPath()));
        return t;
    }

    /** Puts a picture on a tile (and hides the name drawn there for when there is none). */
    private static void show(View tile, Bitmap b) {
        if (b == null) return;
        ImageView img = (ImageView) tile.getTag();
        img.setImageBitmap(b);
        img.setVisibility(View.VISIBLE);
    }

    /** An app's tile: its own TV banner (or icon) as on the home screen's shelf, made off the UI thread. */
    private View appTile(String[] app) {
        View t = tile(app[1], "", null, app[1], 0xFF2A2A2E, Math.round(312 * k), Math.round(176 * k), false);
        Context c = getApplicationContext();
        new Thread(() -> {
            Bitmap b = null;
            try {
                b = HomeApps.appTile(c, null, app[0], 0);
            } catch (RuntimeException ignored) {
            }
            final Bitmap ready = b;
            handler.post(() -> { if (!gone) show(t, ready); });
        }, "beyond-live-app").start();
        return t;
    }

    /** The channel's logo from our website, kept a week in the cache. */
    static File logoFile(Context c, String id) {
        return SLUG.matcher(id).matches() ? new File(new File(c.getCacheDir(), "live"), id + ".jpg") : null;
    }

    private void loadLogo(View tile, String id) {
        File f = logoFile(this, id);
        if (f == null || (f.isFile() && System.currentTimeMillis() - f.lastModified() < 7L * 24 * 3600 * 1000)) return;
        boolean had = f.isFile();
        new Thread(() -> {
            try {
                f.getParentFile().mkdirs();
                File part = new File(f.getPath() + ".part");
                Http.download(SITE + "logos/" + id + ".jpg", part, 300 * 1024);
                Bitmap b = BitmapFactory.decodeFile(part.getPath());
                if (b == null || !part.renameTo(f)) return;
                if (!had) handler.post(() -> { if (!gone) show(tile, b); });
            } catch (Exception e) {
                AppLog.w("live tv logo: " + e.getMessage());
            }
        }, "beyond-live-logo").start();
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
        if (JobsActivity.first(this) || ScreenTimeService.blocked(this)) return;
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
        if (JobsActivity.first(this) || ScreenTimeService.blocked(this)) return;
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
        lastFocus = getCurrentFocus();
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
                        Ui.tr("Notícias 24 horas: ", "News around the clock: ", "Noticias las 24 horas: ") + "Sky News, ABC News, NBC News NOW, Al Jazeera, LiveNOW from FOX " + more},
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
        restoreFocus();
    }

    // MARK: - Watching

    /** In the TV's YouTube app when there is one and we know the live video, else full screen here. */
    private void watch(int i) {
        if (playable.length == 0) return;
        String[] c = playable[i];
        if (c[VIDEO] != null && inYouTube(c[VIDEO])) {
            remember(c);
            return;
        }
        watchHere(i);
    }

    /** Keep watching on the home screen: this channel, ready to open again with one press. Kept on the TV only. */
    private void remember(String[] c) {
        Watched.add(this, "beyond:live:" + c[ID], c[NAME], "", "", "");
    }

    private boolean inYouTube(String video) {
        try {
            if (getPackageManager().getLaunchIntentForPackage(YOUTUBE) == null
                    && getPackageManager().getLeanbackLaunchIntentForPackage(YOUTUBE) == null) return false;
            startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://www.youtube.com/watch?v=" + video))
                    .setPackage(YOUTUBE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void watchHere(int i) {
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
                startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://www.youtube.com/channel/" + playable[i][YT] + "/live"))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (RuntimeException ignored) {
            }
            return;
        }
        if (at < 0) lastFocus = getCurrentFocus();
        at = i;
        String[] c = playable[i];
        list.setVisibility(View.INVISIBLE);
        if (nowBar != null) nowBar.setVisibility(View.INVISIBLE);
        remember(c);
        // The moving backdrop would keep drawing under the video for nothing.
        backdrop.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
        channelName.setVisibility(View.VISIBLE);
        hint.setVisibility(View.VISIBLE);
        web.loadDataWithBaseURL(BASE, page(c), "text/html", "utf-8", null);
        String line = c[NOW] != null ? c[NOW] : c[FROM];
        channelName.setText(c[NAME] + (line.isEmpty() ? "" : "  ·  " + line));
        channelName.setAlpha(1);
        hint.setAlpha(1);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> {
            if (channelName != null) channelName.animate().alpha(0).setDuration(600);
            if (hint != null) hint.animate().alpha(0).setDuration(600);
        }, 4000);
    }

    /** The video the channel streams now when we know it, else its live stream, in YouTube's own player, ads and all. */
    static String page(String[] c) {
        return "<!doctype html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head>"
                + "<body><iframe allow='autoplay; encrypted-media' allowfullscreen src='" + embedUrl(c) + "'></iframe></body></html>";
    }

    static String embedUrl(String[] c) {
        String opts = "autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3";
        if (c.length > VIDEO && c[VIDEO] != null) return "https://www.youtube.com/embed/" + c[VIDEO] + "?" + opts;
        return "https://www.youtube.com/embed/live_stream?channel=" + c[YT] + "&" + opts;
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
        backdrop.setVisibility(View.VISIBLE);
        list.setVisibility(View.VISIBLE);
        restoreFocus();
        View f = getCurrentFocus();
        showNow(f == null ? null : (String[]) f.getTag(R_CHANNEL));
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
            if (code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_CHANNEL_UP) watchHere(step(at, 1, playable.length));
            else if (code == KeyEvent.KEYCODE_DPAD_DOWN || code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_CHANNEL_DOWN) watchHere(step(at, -1, playable.length));
            else if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER) watchHere(at);
            else return super.dispatchKeyEvent(e);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override protected void onDestroy() {
        gone = true;
        handler.removeCallbacksAndMessages(null);
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // MARK: - The list, and what is on air

    /** The good channels in a list file ({channels: [...]}), or null when there are none. Each: the fields above. */
    static String[][] goodOf(String json) {
        try {
            JSONArray l = new JSONObject(json).getJSONArray("channels");
            List<String[]> out = new ArrayList<>();
            for (int i = 0; i < l.length() && out.size() < 40; i++) {
                JSONObject c = l.optJSONObject(i);
                if (c == null) continue;
                String name = c.optString("name", ""), id = c.optString("youtube", "");
                if (!name.isEmpty() && CHANNEL_ID.matcher(id).matches()) {
                    out.add(new String[] {c.optString("id", ""), name, c.optString("from", ""), id,
                            c.optString("group", "news"), c.optString("colour", "#2C2458")});
                }
            }
            return out.isEmpty() ? null : out.toArray(new String[0][]);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * The channels to show, each with the video it streams now (field VIDEO) when now.json is recent. A channel
     * now.json doesn't have is off air: left out, so nobody lands on "Video not found". Without a recent now.json,
     * every channel shows and plays by its channel id.
     */
    static String[][] onAir(String[][] channels, String nowJson, long time) {
        JSONObject live = null;
        try {
            JSONObject now = new JSONObject(nowJson);
            long t = parseTime(now.optString("at", ""));
            if (t > 0 && time - t < NOW_FOR && time - t > -3600 * 1000) live = now.getJSONObject("channels");
        } catch (Exception ignored) {
        }
        List<String[]> out = new ArrayList<>();
        for (String[] c : channels) {
            String[] copy = new String[NEXT_AT + 1];
            System.arraycopy(c, 0, copy, 0, Math.min(c.length, VIDEO));
            if (live != null) {
                JSONObject n = live.optJSONObject(c[YT]);
                String v = n == null ? "" : n.optString("video", "");
                if (!VIDEO_ID.matcher(v).matches()) continue;
                copy[VIDEO] = v;
                // Now and next (ADR 0058): text only, cut to a length a tile can carry.
                Object title = n.opt("title");
                if (title instanceof String && !((String) title).isEmpty()) copy[NOW] = cut((String) title);
                JSONObject next = n.optJSONObject("next");
                Object nt = next == null ? null : next.opt("title");
                long at = next == null ? 0 : parseTime(next.optString("at", ""));
                if (nt instanceof String && !((String) nt).isEmpty() && at > 0) {
                    copy[NEXT] = cut((String) nt);
                    copy[NEXT_AT] = Long.toString(at);
                }
            }
            out.add(copy);
        }
        return out.toArray(new String[0][]);
    }

    private static String cut(String s) {
        return s.length() > 120 ? s.substring(0, 120) : s;
    }

    // MARK: - Favourites (ADR 0058), per person, kept on the TV only

    /** One person's pinned channel ids, newest first. */
    static List<String> favs(Context c, String who) {
        return favsOf(prefs(c).getString("fav", "{}"), who);
    }

    static List<String> favsOf(String json, String who) {
        List<String> out = new ArrayList<>();
        try {
            JSONArray l = new JSONObject(json).optJSONArray(who);
            for (int i = 0; l != null && i < l.length() && out.size() < MAX_FAVS; i++) {
                Object id = l.opt(i);
                if (id instanceof String && SLUG.matcher((String) id).matches() && !out.contains(id)) out.add((String) id);
            }
        } catch (Exception ignored) {
            // A broken store is empty.
        }
        return out;
    }

    /** Pins a channel for one person, or unpins it if it was pinned. True when it is pinned now. */
    static boolean toggleFav(Context c, String who, String id) {
        String[] out = new String[1];
        boolean pinned = toggled(prefs(c).getString("fav", "{}"), who, id, out);
        prefs(c).edit().putString("fav", out[0]).apply();
        return pinned;
    }

    static boolean toggled(String json, String who, String id, String[] out) {
        JSONObject store;
        try {
            store = new JSONObject(json);
        } catch (Exception e) {
            store = new JSONObject();
        }
        List<String> l = favsOf(store.toString(), who);
        boolean pinned = !l.remove(id);
        if (pinned) l.add(0, id);
        while (l.size() > MAX_FAVS) l.remove(l.size() - 1);
        try {
            store.put(who, new JSONArray(l));
        } catch (Exception ignored) {
        }
        out[0] = store.toString();
        return pinned;
    }

    /** The pinned channels that are on air, in the order they were pinned. */
    static List<String[]> favourites(String[][] channels, List<String> ids) {
        List<String[]> out = new ArrayList<>();
        for (String id : ids) {
            for (String[] c : channels) {
                if (id.equals(c[ID])) {
                    out.add(c);
                    break;
                }
            }
        }
        return out;
    }

    private static long parseTime(String iso) {
        try {
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.ROOT);
            f.setTimeZone(TimeZone.getTimeZone("UTC"));
            return f.parse(iso).getTime();
        } catch (Exception e) {
            return 0;
        }
    }

    /** The channels in one row; anything without a row we know is news. */
    static List<String[]> inGroup(String[][] channels, String group) {
        List<String[]> out = new ArrayList<>();
        for (String[] c : channels) {
            String g = c[GROUP];
            boolean known = false;
            for (String x : GROUPS) known |= x.equals(g);
            if ((known ? g : "news").equals(group)) out.add(c);
        }
        return out;
    }

    private static boolean same(String[][] a, String[][] b) {
        if (a.length != b.length) return false;
        for (int i = 0; i < a.length; i++) if (!java.util.Arrays.equals(a[i], b[i])) return false;
        return true;
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("live", Context.MODE_PRIVATE);
    }

    /** The last good list from the website, else ours. */
    static String[][] kept(Context c) {
        String[][] l = goodOf(prefs(c).getString("channels", ""));
        return l != null ? l : NEWS;
    }

    static String keptNow(Context c) {
        return prefs(c).getString("now", "");
    }

    /** Reads the website's list and what's on air in the background; then() runs on the UI thread when either changed. */
    private void refresh(Context app, Runnable then) {
        new Thread(() -> {
            boolean changed = false;
            try {
                String json = Http.get(LIST_URL, "application/json", 256 * 1024);
                if (goodOf(json) != null && !json.equals(prefs(app).getString("channels", ""))) {
                    prefs(app).edit().putString("channels", json).apply();
                    changed = true;
                }
            } catch (Exception e) {
                AppLog.w("live tv list: " + e.getMessage());
            }
            try {
                String json = Http.get(NOW_URL, "application/json", 256 * 1024);
                JSONObject now = new JSONObject(json);
                if (now.has("channels") && parseTime(now.optString("at", "")) > 0 && !json.equals(keptNow(app))) {
                    prefs(app).edit().putString("now", json).apply();
                    changed = true;
                }
            } catch (Exception e) {
                AppLog.w("live tv now: " + e.getMessage());
            }
            if (changed) handler.post(then);
        }, "beyond-live-list").start();
    }
}
