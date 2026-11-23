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
 * Live TV (ADR 0042, tiles and live videos ADR 0053, now and next and favourites ADR 0058, channels ADR 0065).
 * Beyond™ TV Channels (ADR 0065): one numbered line-up you surf like a real TV. Live TV plays the channel last watched,
 * full screen, straight away; up and down (and CH+ and CH-) change channel, the number keys jump to one, OK opens the
 * guide over the picture and Back goes home. The line-up, in order, only with what this TV has: the aerial and the
 * Freeview, TVNZ+ and ThreeNow apps (a full screen card: OK opens the app); NZ News, NZ Music, NZ Shows and NZ Sport,
 * our own mix channels of official NZ YouTube channels' latest videos, picked by the clock so they feel live; Featured,
 * World news, Weather, space and music, and kids' channels, which stream free on YouTube around the clock; then Plex,
 * Samsung TV Plus, Sky Sport Now and Neon (their apps). Kids get the aerial, the NZ apps and the kids' channels.
 * Channels play here in YouTube's web player with the moving backdrop off; "Open channels in the YouTube app" (in
 * Choose channels, on by itself on Android 8, where the web player lagged on a Sony) plays a live channel in the TV's
 * YouTube app instead. Choose channels turns off the ones a person doesn't watch, kept on the TV for each person.
 * The list comes from our website (docs/live/channels.json), kept for next time, with this copy until then; now.json
 * beside it says which video each channel streams right now and which videos each mix plays (tools/live_now.py,
 * hourly), and the logos sit in live/logos/. Each tile says what is on now and the corner what is on next for the
 * focused one. Holding OK on a channel in the guide pins it to "Your favourites". What was last watched leads Keep
 * watching on the home screen, and Continue there opens it again (extra PLAY).
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

    /** The channels on this person's line-up, in order, from the copy kept on the TV, without the ones turned off. */
    static List<String[]> playable(Context c) {
        String[][] channels = onAir(kept(c), keptNow(c), System.currentTimeMillis());
        boolean kid = People.kid(c);
        List<String> off = kid ? new ArrayList<>() : offOf(prefs(c).getString("off", "{}"), People.current(c).id);
        List<String[]> play = new ArrayList<>();
        for (String g : kid ? new String[] {"kids"} : GROUPS) for (String[] ch : inGroup(channels, g)) if (!off.contains(ch[ID])) play.add(ch);
        return play;
    }

    private static final String SITE = "https://yeahbuddynz.github.io/Beyond.TV/live/";
    private static final String LIST_URL = SITE + "channels.json", NOW_URL = SITE + "now.json";
    private static final String YOUTUBE = "com.google.android.youtube.tv";
    /** How long now.json is trusted: a 24/7 stream keeps its video for weeks, an hourly file is never this old. */
    private static final long NOW_FOR = 3L * 24 * 3600 * 1000;
    private static final Pattern VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9-]{1,40}$");
    /** The line-up's order: our NZ mixes, then featured, world news, the rest, kids. */
    static final String[] GROUPS = {"nz", "featured", "news", "more", "kids"};
    // Fields of a channel. A mix has no YT, its official channels in MIX (comma separated) and its videos in VIDEOS.
    static final int ID = 0, NAME = 1, FROM = 2, YT = 3, GROUP = 4, COLOUR = 5, VIDEO = 6, NOW = 7, NEXT = 8, NEXT_AT = 9,
            MIX = 10, VIDEOS = 11, FIELDS = 12;
    /** How long after the last number key the TV goes to that channel. */
    private static final long TYPE_MS = 1600;
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

    /** Apps by what they are: row, name on the button, matches the app's name or package, key. Same as APPS in livetv.js. */
    private static final Object[][] APPS = {
            {"nz", "Freeview", Pattern.compile("freeview", Pattern.CASE_INSENSITIVE), "freeview"},
            {"nz", "TVNZ+", Pattern.compile("tvnz", Pattern.CASE_INSENSITIVE), "tvnz"},
            {"nz", "ThreeNow", Pattern.compile("threenow", Pattern.CASE_INSENSITIVE), "threenow"},
            {"free", "Plex", Pattern.compile("plex", Pattern.CASE_INSENSITIVE), "plex"},
            {"free", "Samsung TV Plus", Pattern.compile("samsung tv plus|tvplus", Pattern.CASE_INSENSITIVE), "tvplus"},
            {"paid", "Sky Sport Now", Pattern.compile("sky ?sport ?now", Pattern.CASE_INSENSITIVE), "skysportnow"},
            {"paid", "Neon", Pattern.compile("neon|nz\\.co\\.lightbox", Pattern.CASE_INSENSITIVE), "neon"},
    };

    /** One place on the line-up: the aerial, an app ({package, name, key}) or a channel. */
    static final class Entry {
        int num;
        final String key, kind, name;
        final String[] app, channel;

        Entry(String key, String kind, String name, String[] app, String[] channel) {
            this.key = key;
            this.kind = kind;
            this.name = name;
            this.app = app;
            this.channel = channel;
        }

        boolean isChannel() {
            return channel != null;
        }
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private View backdrop, list, help, chooser;
    private LinearLayout card;
    private WebView web;
    private TextView hint;
    /** The banner while surfing: number, logo, name, what's on now and next. */
    private LinearLayout banner;
    private TextView bannerNum, bannerWho, bannerNow, bannerNext;
    private ImageView bannerLogo;
    /** What's on now and next for the focused channel, in the top right corner. */
    private LinearLayout nowBar;
    private TextView nowWho, nowLine, nextLine;
    /** After pinning: the channel whose tile gets the focus back, in its own row. */
    private String keepOn;
    private View keepTile;
    /** The channels on air; the whole line-up; what is shown of it (without what was turned off). */
    private String[][] channels = new String[0][];
    private List<Entry> full = new ArrayList<>(), line = new ArrayList<>();
    /** Where on the line-up the TV is (-1 before anything plays), and the number being typed. */
    private int at = -1;
    private String typed = "";
    /** What is loaded full screen here (null when nothing is); away: a channel went to the YouTube app or an app opened. */
    private String playing;
    private boolean away;
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
        String[][] shownList = onAir(kept(this), keptNow(this), System.currentTimeMillis());
        setChannels(shownList);
        list = buildList();
        list.setVisibility(View.INVISIBLE);
        root.addView(list, new FrameLayout.LayoutParams(-1, -1));
        root.addView(buildNowBar(), nowBarParams());
        // The corner follows the focus: a channel's now and next, nothing for an app or a button.
        root.getViewTreeObserver().addOnGlobalFocusChangeListener((was, now) ->
                showNow(now == null ? null : (String[]) now.getTag(R_CHANNEL)));
        setContentView(root);
        // Straight into a channel: the one asked for (Continue, Find), else the one last watched.
        int start = startAt(line, getIntent().getStringExtra(PLAY), prefs(this).getString("last", ""));
        if (start >= 0) handler.post(() -> { if (!gone) watchAt(start, false); });
        else showGuide();
        refresh(getApplicationContext(), () -> {
            // The website had something newer: use it, keeping the TV where it is.
            String[][] fresh = onAir(kept(this), keptNow(this), System.currentTimeMillis());
            if (gone || same(fresh, shownList)) return;
            String was = at >= 0 && at < line.size() ? line.get(at).key : null;
            setChannels(fresh);
            relist(was);
            if (help == null && chooser == null && list.getVisibility() != View.VISIBLE) rebuildList(false);
        });
    }

    /** The line-up from these channels and this TV's apps, and what is shown of it for whoever is watching. */
    private void setChannels(String[][] on) {
        channels = on;
        List<String[]> nzApps = new ArrayList<>(), free = new ArrayList<>(), paid = new ArrayList<>();
        sources(this, nzApps, free, paid);
        boolean kid = People.kid(this);
        full = lineup(on, nzApps, free, paid, HomeApps.liveTv(this) != null ? Ui.tr("Antena", "Your aerial", "Tu antena") : null, kid);
        line = shown(full, kid ? new ArrayList<>() : offOf(prefs(this).getString("off", "{}"), People.current(this).id));
    }

    /** After the line-up changed: the same entry when it is still on, else the one now in its place. */
    private void relist(String key) {
        if (at < 0) return;
        for (int i = 0; i < line.size(); i++) {
            if (line.get(i).key.equals(key)) {
                at = i;
                return;
            }
        }
        at = Math.min(at, line.size() - 1);
        if (list.getVisibility() != View.VISIBLE) watchAt(at, false);
    }

    private void rebuildList(boolean show) {
        int index = root.indexOfChild(list);
        root.removeView(list);
        list = buildList();
        list.setVisibility(show ? View.VISIBLE : View.INVISIBLE);
        if (show) list.setBackgroundColor(at >= 0 ? 0xED0D0C18 : 0);
        root.addView(list, index, new FrameLayout.LayoutParams(-1, -1));
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
        if (c == null || list.getVisibility() != View.VISIBLE || help != null || chooser != null) {
            nowBar.setVisibility(View.INVISIBLE);
            return;
        }
        nowWho.setText(c[NAME] + (c[FROM].isEmpty() ? "" : "  ·  " + c[FROM]));
        android.text.SpannableString now = new android.text.SpannableString(Ui.tr("Agora", "Now", "Ahora") + "  "
                + (nowOf(c, System.currentTimeMillis()) != null ? nowOf(c, System.currentTimeMillis()) : Ui.tr("Ao vivo", "Live", "En vivo")));
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

    /** The guide: every entry on the line-up in rows of tiles, each with its number. */
    private View buildList() {
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

        firstTile = null;
        keepTile = null;
        java.util.Map<String, Entry> on = new java.util.HashMap<>();
        List<String[]> onList = new ArrayList<>();
        for (Entry e : line) {
            on.put(e.key, e);
            if (e.isChannel()) onList.add(e.channel);
        }
        List<String[]> pinned = favourites(onList.toArray(new String[0][]), favs(this, People.current(this).id));
        // Your favourites first: the channels this person pinned by holding OK.
        channelRow(column, Ui.tr("Seus favoritos", "Your favourites", "Tus favoritos"), pinned, on, true, true, pinned);
        appRow(column, nz() ? Ui.tr("Nova Zelândia", "Here in Aotearoa", "Nueva Zelanda") : Ui.tr("Na sua TV", "On your TV", "En tu TV"),
                "aerial|freeview|tvnz|threenow");
        if (kid) {
            channelRow(column, Ui.tr("Para crianças", "For kids", "Para niños"), inGroup(channels, "kids"), on, true, false, pinned);
        } else {
            channelRow(column, Ui.tr("Feito em Aotearoa", "Made in Aotearoa", "Hecho en Aotearoa"), inGroup(channels, "nz"), on, true, false, pinned);
            channelRow(column, Ui.tr("Em destaque", "Featured", "Destacados"), inGroup(channels, "featured"), on, true, false, pinned);
            channelRow(column, Ui.tr("Notícias do mundo, grátis", "World news, free", "Noticias del mundo, gratis"), inGroup(channels, "news"), on, false, false, pinned);
            channelRow(column, Ui.tr("Clima, espaço e música", "Weather, space and music", "Clima, espacio y música"), inGroup(channels, "more"), on, false, false, pinned);
            channelRow(column, Ui.tr("Para crianças", "For kids", "Para niños"), inGroup(channels, "kids"), on, false, false, pinned);
            appRow(column, Ui.tr("Mais canais grátis", "More free channels", "Más canales gratis"), "plex|tvplus");
            appRow(column, Ui.tr("Extras pagos", "Paid extras", "Extras de pago"), "skysportnow|neon");
            LinearLayout buttons = new LinearLayout(this);
            buttons.setOrientation(LinearLayout.HORIZONTAL);
            buttons.setClipChildren(false);
            chooseButton = quietButton(buttons, Ui.tr("Escolher canais", "Choose channels", "Elegir canales"), this::choose);
            if (nz()) quietButton(buttons, Ui.tr("Quais canais eu tenho?", "Which channels can I get?", "¿Qué canales tengo?"), this::explain);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
            lp.topMargin = Math.round(30 * k);
            column.addView(buttons, lp);
        }
        boolean nzApps = false;
        for (Entry e : line) nzApps |= e.key.matches("freeview|tvnz|threenow");
        if (!nzApps) {
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
        return scroll;
    }

    private View chooseButton;

    private View quietButton(LinearLayout row, String label, Runnable run) {
        Button b = FeedbackActivity.button(this, label, k, false);
        b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 27 * k);
        b.setPadding(Math.round(30 * k), 0, Math.round(30 * k), 0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setOnClickListener(v -> run.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, Math.round(76 * k));
        lp.rightMargin = Math.round(20 * k);
        row.addView(b, lp);
        if (firstTile == null) firstTile = b;
        return b;
    }

    /** The aerial and apps on the line-up whose keys match, as tiles that open them. */
    private void appRow(LinearLayout column, String label, String keys) {
        LinearLayout row = null;
        for (Entry e : line) {
            if (e.isChannel() || !e.key.matches(keys)) continue;
            if (row == null) row = section(column, label);
            View t = entryTile(e, false);
            add(row, t, () -> openEntry(e));
            t.setTag(R_KEY, e.key);
            if (e.key.equals(keepOn)) keepTile = t;
        }
    }

    /** An entry's tile with its number: the aerial, an app's banner, or a channel's logo. */
    private View entryTile(Entry e, boolean off) {
        View t;
        if ("aerial".equals(e.kind)) t = tile(e.name, "", null, Ui.emoji("📡"), 0xFF6E3DDB, false, true);
        else if (!e.isChannel()) t = appTile(e.app);
        else {
            String[] c = e.channel;
            t = tile(c[NAME], nowOf(c, System.currentTimeMillis()) != null ? nowOf(c, System.currentTimeMillis()) : c[FROM],
                    logoFile(this, c[ID]), c[NAME], colourOf(c), false, false);
            loadLogo(t, c[ID]);
        }
        number(t, e.num);
        if (off) ((LinearLayout) t).getChildAt(0).setAlpha(0.35f);
        return t;
    }

    private static int colourOf(String[] c) {
        try {
            return Color.parseColor(c[COLOUR]);
        } catch (RuntimeException ignored) {
            return 0xFF2C2458;
        }
    }

    /** The channel number in the top left of a tile's picture. */
    private void number(View tile, int num) {
        FrameLayout face = (FrameLayout) ((LinearLayout) tile).getChildAt(0);
        TextView n = FeedbackActivity.text(this, String.valueOf(num), Ui.semibold, 20 * k, 0xFFF7F6F2);
        n.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xC70D0C18);
        bg.setCornerRadius(12 * k);
        n.setBackground(bg);
        n.setPadding(Math.round(9 * k), Math.round(1 * k), Math.round(9 * k), Math.round(1 * k));
        n.setMinWidth(Math.round(42 * k));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, -2, Gravity.START | Gravity.TOP);
        lp.leftMargin = lp.topMargin = Math.round(10 * k);
        face.addView(n, face.getChildCount() - 1, lp);
    }

    private void channelRow(LinearLayout column, String label, List<String[]> cs, java.util.Map<String, Entry> on, boolean big,
                            boolean favRow, List<String[]> pinned) {
        List<Entry> l = new ArrayList<>();
        for (String[] c : cs) {
            Entry e = on.get(c[ID]);
            if (e != null && e.isChannel()) l.add(e);
        }
        if (l.isEmpty()) return;
        LinearLayout row = section(column, label);
        for (Entry e : l) {
            String[] c = e.channel;
            String now = nowOf(c, System.currentTimeMillis());
            View t = tile(c[NAME], now != null ? now : c[FROM], logoFile(this, c[ID]), c[NAME], colourOf(c), big, false);
            number(t, e.num);
            if (favRow || pinned.contains(c)) star(t);
            loadLogo(t, c[ID]);
            add(row, t, () -> {
                hideGuide();
                watchAt(line.indexOf(e), true);
            });
            // Holding OK pins the channel for whoever is watching (or takes it off).
            t.setOnLongClickListener(v -> {
                pin(c);
                return true;
            });
            t.setTag(R_CHANNEL, c);
            t.setTag(R_KEY, e.key);
            if (!favRow && c[ID].equals(keepOn)) keepTile = t;
        }
    }

    /** Keys for the channel and the line-up entry on a tile (any ids unique to this app do). */
    private static final int R_CHANNEL = 0x7f0b0001, R_KEY = 0x7f0b0002;

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
        rebuildList(true);
        focusKept();
    }

    /** The focus back on the tile kept (the channel playing, or the one just pinned), else the first. */
    private void focusKept() {
        final View f = keepTile != null ? keepTile : firstTile;
        keepOn = null;
        if (f != null) handler.post(f::requestFocus);
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

    /** The installed apps for each row, in APPS order, each app once: {package, name on the button, key}. */
    static void sources(Context c, List<String[]> nzApps, List<String[]> free, List<String[]> paid) {
        List<String[]> installed = HomeApps.launchable(c);
        Set<String> used = new HashSet<>();
        for (Object[] want : APPS) {
            Pattern p = (Pattern) want[2];
            for (String[] app : installed) {
                if (used.contains(app[0])) continue;
                if (p.matcher(app[1] == null ? "" : app[1]).find() || p.matcher(app[0]).find()) {
                    used.add(app[0]);
                    String[] s = {app[0], (String) want[1], (String) want[3]};
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
                        "NZ News, NZ Music, NZ Shows, NZ Sport. " + Ui.tr("Notícias 24 horas: ", "News around the clock: ", "Noticias las 24 horas: ") + "Sky News, ABC News, NBC News NOW, Al Jazeera, LiveNOW from FOX " + more},
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

    // MARK: - Surfing

    private void openEntry(Entry e) {
        if ("aerial".equals(e.kind)) openAerial();
        else if (e.app != null) {
            openApp(e.app[0], e.app[1]);
            if ("plex".equals(e.key)) Toast.makeText(this, Ui.tr("Escolha TV ao vivo no Plex", "Pick Live TV in Plex",
                    "Elige TV en vivo en Plex"), Toast.LENGTH_LONG).show();
        }
    }

    /** Keep watching on the home screen: this channel, ready to open again with one press. Kept on the TV only. */
    private void remember(String[] c) {
        Watched.add(this, "beyond:live:" + c[ID], c[NAME], "", "", "");
    }

    /** Plays a live channel in the TV's YouTube app, when that is on (Choose channels) and the TV has it. */
    private boolean inYouTube(String video) {
        if (!youTubeApp(this)) return false;
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

    /** "Open channels in the YouTube app": on by itself on Android 8, where YouTube's web player lagged on a Sony. */
    static boolean youTubeApp(Context c) {
        return prefs(c).getBoolean("youtube_app", android.os.Build.VERSION.SDK_INT < 28);
    }

    /** The player's views, made the first time something plays: the web player, an app's card, the banner, the hint. */
    @SuppressLint("SetJavaScriptEnabled")
    private boolean player() {
        if (banner != null) return web != null;
        try {
            web = new WebView(this);
            web.setBackgroundColor(Color.BLACK);
            WebSettings ws = web.getSettings();
            ws.setJavaScriptEnabled(true);
            ws.setDomStorageEnabled(true);
            ws.setMediaPlaybackRequiresUserGesture(false);
            web.setFocusable(false);
            web.setVisibility(View.GONE);
            root.addView(web, 1, new FrameLayout.LayoutParams(-1, -1));
        } catch (Throwable t) {
            web = null;   // No WebView on this TV: channels open in the YouTube app.
        }
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER);
        c.setVisibility(View.GONE);
        card = c;
        root.addView(card, root.indexOfChild(list), new FrameLayout.LayoutParams(-1, -1));

        banner = new LinearLayout(this);
        banner.setOrientation(LinearLayout.HORIZONTAL);
        banner.setGravity(Gravity.CENTER_VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xDB0D0C18);
        bg.setCornerRadius(26 * k);
        banner.setBackground(bg);
        banner.setPadding(Math.round(26 * k), Math.round(22 * k), Math.round(34 * k), Math.round(22 * k));
        bannerNum = FeedbackActivity.text(this, "", Ui.displaySemibold, 60 * k, Glow.LILAC);
        bannerNum.setMinWidth(Math.round(86 * k));
        banner.addView(bannerNum);
        bannerLogo = new ImageView(this);
        bannerLogo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        bannerLogo.setClipToOutline(true);
        GradientDrawable round = new GradientDrawable();
        round.setCornerRadius(20 * k);
        bannerLogo.setBackground(round);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Math.round(96 * k), Math.round(96 * k));
        lp.leftMargin = Math.round(14 * k);
        lp.rightMargin = Math.round(24 * k);
        banner.addView(bannerLogo, lp);
        LinearLayout words = new LinearLayout(this);
        words.setOrientation(LinearLayout.VERTICAL);
        bannerWho = FeedbackActivity.text(this, "", Ui.displaySemibold, 36 * k, 0xFFFFFFFF);
        bannerNow = FeedbackActivity.text(this, "", Ui.regular, 24 * k, 0xD9FFFFFF);
        bannerNext = FeedbackActivity.text(this, "", Ui.regular, 24 * k, 0x99FFFFFF);
        for (TextView t : new TextView[] {bannerWho, bannerNow, bannerNext}) {
            t.setGravity(Gravity.START);
            t.setSingleLine(true);
            t.setEllipsize(android.text.TextUtils.TruncateAt.END);
            words.addView(t, new LinearLayout.LayoutParams(-2, -2));
        }
        banner.addView(words, new LinearLayout.LayoutParams(Math.round(900 * k), -2));
        FrameLayout.LayoutParams bp = new FrameLayout.LayoutParams(-2, -2, Gravity.START | Gravity.BOTTOM);
        bp.leftMargin = bp.bottomMargin = Math.round(60 * k);
        root.addView(banner, root.indexOfChild(list), bp);

        hint = FeedbackActivity.text(this, Ui.tr("▲ ▼ muda o canal   ·   OK guia", "▲ ▼ change channel   ·   OK for the guide",
                "▲ ▼ cambia de canal   ·   OK guía"), Ui.regular, 26 * k, 0xB3FFFFFF);
        FrameLayout.LayoutParams hp = new FrameLayout.LayoutParams(-2, -2, Gravity.END | Gravity.TOP);
        hp.rightMargin = Math.round(48 * k);
        hp.topMargin = Math.round(36 * k);
        root.addView(hint, root.indexOfChild(list), hp);
        return web != null;
    }

    /**
     * Goes to a place on the line-up: a channel plays full screen here (or in the YouTube app when that is on and
     * picked is true, so surfing past a channel never leaves Live TV), an app or the aerial shows its card.
     */
    private void watchAt(int i, boolean picked) {
        if (line.isEmpty()) return;
        at = Math.max(0, Math.min(i, line.size() - 1));
        Entry e = line.get(at);
        prefs(this).edit().putString("last", e.key).apply();
        boolean here = player();
        // The moving backdrop would keep drawing under the video for nothing.
        backdrop.setVisibility(View.GONE);
        if (e.isChannel()) {
            String[] c = e.channel;
            remember(c);
            card.setVisibility(View.GONE);
            if ((picked || !here) && c[VIDEO] != null && inYouTube(c[VIDEO])) {
                away = true;
                playing = null;
                return;
            }
            if (!here) {
                away = true;
                playing = null;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(c[YT].isEmpty()
                            ? "https://www.youtube.com/watch?v=" + firstVideo(c) : "https://www.youtube.com/channel/" + c[YT] + "/live"))
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (RuntimeException ignored) {
                }
                return;
            }
            web.setVisibility(View.VISIBLE);
            web.loadDataWithBaseURL(BASE, page(c, System.currentTimeMillis()), "text/html", "utf-8", null);
        } else {
            if (web != null) {
                web.loadUrl("about:blank");
                web.setVisibility(View.GONE);
            }
            card.removeAllViews();
            View t = entryTile(e, false);
            t.setFocusable(false);
            ((LinearLayout) t).getChildAt(1).setVisibility(View.GONE);
            card.addView(t);
            TextView press = FeedbackActivity.text(this, Ui.tr("Aperte OK para abrir ", "Press OK to open ", "Pulsa OK para abrir ") + e.name,
                    Ui.regular, 34 * k, 0xA6FFFFFF);
            press.setPadding(0, Math.round(24 * k), 0, 0);
            card.addView(press);
            card.setVisibility(View.VISIBLE);
        }
        playing = e.key;
        showBanner();
    }

    private void showBanner() {
        if (banner == null || at < 0 || at >= line.size()) return;
        Entry e = line.get(at);
        bannerNum.setText(typed.isEmpty() ? String.valueOf(e.num) : typed + "_");
        bannerWho.setText(e.name);
        bannerLogo.setImageDrawable(null);
        bannerLogo.setVisibility(View.GONE);
        if (e.isChannel()) {
            File f = logoFile(this, e.channel[ID]);
            Bitmap b = f != null && f.isFile() ? BitmapFactory.decodeFile(f.getPath()) : null;
            if (b != null) {
                bannerLogo.setImageBitmap(b);
                bannerLogo.setVisibility(View.VISIBLE);
            }
            String now = nowOf(e.channel, System.currentTimeMillis());
            android.text.SpannableString line1 = new android.text.SpannableString(Ui.tr("Agora", "Now", "Ahora") + "  "
                    + (now != null ? now : e.channel[FROM]));
            int end = Ui.tr("Agora", "Now", "Ahora").length();
            line1.setSpan(new android.text.style.ForegroundColorSpan(Glow.LILAC), 0, end, 0);
            line1.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD), 0, end, 0);
            bannerNow.setText(line1);
            String next = nextText(e.channel, System.currentTimeMillis());
            bannerNext.setText(next);
            bannerNext.setVisibility(next.isEmpty() ? View.GONE : View.VISIBLE);
        } else {
            bannerNow.setText("aerial".equals(e.kind) ? Ui.tr("Os canais da antena", "The channels from your aerial", "Los canales de tu antena")
                    : Ui.tr("Um app na sua TV", "An app on your TV", "Una app en tu TV"));
            bannerNext.setVisibility(View.GONE);
        }
        banner.setVisibility(View.VISIBLE);
        hint.setVisibility(View.VISIBLE);
        banner.animate().cancel();
        hint.animate().cancel();
        banner.setAlpha(1);
        hint.setAlpha(1);
        handler.removeCallbacks(fade);
        handler.postDelayed(fade, 5000);
    }

    private final Runnable fade = () -> {
        if (banner != null) banner.animate().alpha(0).setDuration(600);
        if (hint != null) hint.animate().alpha(0).setDuration(600);
    };

    /** A number typed on the remote: shown as it is typed, then the TV goes there. */
    private void type(int d) {
        typed = (typed + d).length() > 3 ? (typed + d).substring(1) : typed + d;
        showBanner();
        handler.removeCallbacks(go);
        handler.postDelayed(go, TYPE_MS);
    }

    private final Runnable go = () -> {
        int n = typed.isEmpty() ? -1 : Integer.parseInt(typed), i = byNumber(line, n);
        typed = "";
        if (i >= 0) watchAt(i, false);
        else {
            showBanner();
            Toast.makeText(this, Ui.tr("Não há canal ", "There's no channel ", "No hay canal ") + n, Toast.LENGTH_SHORT).show();
        }
    };

    /** The guide over the picture (or on its own before anything plays), the focus on the channel playing. */
    private void showGuide() {
        if (banner != null) {
            handler.removeCallbacks(fade);
            banner.setVisibility(View.INVISIBLE);
            hint.setVisibility(View.INVISIBLE);
        }
        keepOn = at >= 0 && at < line.size() ? line.get(at).key : null;
        rebuildList(true);
        if (at < 0) backdrop.setVisibility(View.VISIBLE);
        focusKept();
    }

    private void hideGuide() {
        list.setVisibility(View.INVISIBLE);
        if (nowBar != null) nowBar.setVisibility(View.INVISIBLE);
    }

    /** The video the channel streams now when we know it, else its live stream, in YouTube's own player, ads and all. */
    static String page(String[] c, long time) {
        return "<!doctype html><html><head><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head>"
                + "<body><iframe allow='autoplay; encrypted-media' allowfullscreen src='" + embedUrl(c, time) + "'></iframe></body></html>";
    }

    /** YouTube's own player: the live video, or a mix from where it is at this moment and on round its videos. */
    static String embedUrl(String[] c, long time) {
        String opts = "autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3";
        List<Object[]> videos = c.length > VIDEOS ? videosOf(c[VIDEOS]) : new ArrayList<>();
        if (!videos.isEmpty()) {
            int[] m = mixAt(videos, time);
            StringBuilder rest = new StringBuilder();
            for (int i = 1; i < videos.size(); i++) {
                if (rest.length() > 0) rest.append(',');
                rest.append(videos.get((m[0] + i) % videos.size())[0]);
            }
            return "https://www.youtube.com/embed/" + videos.get(m[0])[0] + "?start=" + m[1]
                    + (rest.length() > 0 ? "&playlist=" + rest + "&loop=1" : "") + "&" + opts;
        }
        if (c.length > VIDEO && c[VIDEO] != null) return "https://www.youtube.com/embed/" + c[VIDEO] + "?" + opts;
        return "https://www.youtube.com/embed/live_stream?channel=" + c[YT] + "&" + opts;
    }

    private static String firstVideo(String[] c) {
        List<Object[]> v = videosOf(c[VIDEOS]);
        return v.isEmpty() ? "" : (String) v.get(mixAt(v, System.currentTimeMillis())[0])[0];
    }

    static int step(int i, int by, int n) {
        return n == 0 ? 0 : ((i + by) % n + n) % n;
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        boolean guide = list.getVisibility() == View.VISIBLE;
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() != KeyEvent.ACTION_UP) return true;
            if (chooser != null) closeChooser();
            else if (help != null) closeHelp();
            else if (guide && at >= 0) {
                // Back to the channel: still playing under the guide, or played again when it went elsewhere.
                hideGuide();
                if (at < line.size() && line.get(at).key.equals(playing)) showBanner();
                else watchAt(at, false);
            } else finish();
            return true;
        }
        if (help != null || chooser != null) return super.dispatchKeyEvent(e);
        boolean digit = code >= KeyEvent.KEYCODE_0 && code <= KeyEvent.KEYCODE_9;
        boolean chUp = code == KeyEvent.KEYCODE_CHANNEL_UP, chDown = code == KeyEvent.KEYCODE_CHANNEL_DOWN;
        // Numbers and CH+ / CH- work in the guide too: straight to that channel.
        if (guide && at >= 0 && (digit || chUp || chDown) && e.getAction() == KeyEvent.ACTION_DOWN) hideGuide();
        else if (guide) return super.dispatchKeyEvent(e);
        if (e.getAction() != KeyEvent.ACTION_DOWN) return true;
        if (digit) type(code - KeyEvent.KEYCODE_0);
        else if (code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_RIGHT || chUp) watchAt(step(at, 1, line.size()), false);
        else if (code == KeyEvent.KEYCODE_DPAD_DOWN || code == KeyEvent.KEYCODE_DPAD_LEFT || chDown) watchAt(step(at, -1, line.size()), false);
        else if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER) {
            if (at >= 0 && at < line.size() && !line.get(at).isChannel()) openEntry(line.get(at));
            else showGuide();
        } else return super.dispatchKeyEvent(e);
        return true;
    }

    @Override protected void onResume() {
        super.onResume();
        // Back from the YouTube app: the guide, on the channel it was on.
        if (away) {
            away = false;
            if (list.getVisibility() != View.VISIBLE && help == null && chooser == null) showGuide();
        }
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

    // MARK: - Choose channels

    /**
     * Every entry on the line-up, on or off for whoever is watching (kept on the TV): off ones are left out of the guide
     * and surfing skips them. At least one stays on. Also the switch for playing channels in the YouTube app.
     */
    private void choose() {
        lastFocus = getCurrentFocus();
        int focus = 0;
        if (chooser != null) {
            View f = getCurrentFocus();
            Object key = f == null ? null : f.getTag(R_KEY);
            for (int i = 0; key != null && i < full.size(); i++) if (full.get(i).key.equals(key)) focus = i;
            root.removeView(chooser);
        }
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xFF0D0C18);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.setClipChildren(false);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setClipChildren(false);
        box.setPadding(Math.round(140 * k), Math.round(70 * k), Math.round(140 * k), Math.round(80 * k));
        scroll.addView(box, new ScrollView.LayoutParams(-1, -2));
        TextView title = FeedbackActivity.text(this, Ui.tr("Escolher canais", "Choose channels", "Elegir canales"), Ui.displaySemibold, 56 * k, 0xFFFFFFFF);
        title.setGravity(Gravity.START);
        box.addView(title);
        TextView sub = FeedbackActivity.text(this, Ui.tr("Desligue os que vocês não assistem. ▲ ▼ pula esses.",
                "Turn off the ones you don't watch. Changing channel skips them.", "Apaga los que no ves. Al cambiar de canal se saltan."),
                Ui.regular, 30 * k, 0xA6FFFFFF);
        sub.setGravity(Gravity.START);
        box.addView(sub);
        Button yt = FeedbackActivity.button(this, (youTubeApp(this) ? "✓ " : "") + Ui.tr("Abrir canais no app do YouTube (mais suave em TVs antigas)",
                "Open channels in the YouTube app (smoother on older TVs)", "Abrir canales en la app de YouTube (más fluido en TVs antiguas)"), k, false);
        yt.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, 26 * k);
        yt.setPadding(Math.round(30 * k), 0, Math.round(30 * k), 0);
        yt.setMinHeight(0);
        yt.setMinimumHeight(0);
        yt.setOnClickListener(v -> {
            prefs(this).edit().putBoolean("youtube_app", !youTubeApp(this)).apply();
            choose();
        });
        LinearLayout.LayoutParams yp = new LinearLayout.LayoutParams(-2, Math.round(72 * k));
        yp.topMargin = Math.round(26 * k);
        box.addView(yt, yp);
        List<String> off = offOf(prefs(this).getString("off", "{}"), People.current(this).id);
        LinearLayout row = null;
        View first = null;
        for (int i = 0; i < full.size(); i++) {
            Entry e = full.get(i);
            if (i % 7 == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setClipChildren(false);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2);
                rp.topMargin = Math.round(30 * k);
                box.addView(row, rp);
            }
            boolean isOff = off.contains(e.key);
            View t = e.isChannel() ? tile(e.name, "", logoFile(this, e.channel[ID]), e.name, colourOf(e.channel), false, false)
                    : "aerial".equals(e.kind) ? tile(e.name, "", null, Ui.emoji("📡"), 0xFF6E3DDB, false, true)
                    : tile(e.name, "", null, e.name, 0xFF2A2A2E, false, false);
            number(t, e.num);
            TextView state = (TextView) ((LinearLayout) t).getChildAt(2);
            state.setText(isOff ? Ui.tr("Desligado", "Off", "Apagado") : Ui.tr("Ligado", "On", "Encendido"));
            state.setTextColor(isOff ? 0xFFE8A33D : 0x8CFFFFFF);
            state.setVisibility(View.VISIBLE);
            if (isOff) ((LinearLayout) t).getChildAt(0).setAlpha(0.35f);
            t.setTag(R_KEY, e.key);
            t.setOnClickListener(v -> {
                String[] out = new String[1];
                toggledOff(prefs(this).getString("off", "{}"), People.current(this).id, e.key, out);
                List<String> nextOff = offOf(out[0], People.current(this).id);
                int on = 0;
                for (Entry x : full) if (!nextOff.contains(x.key)) on++;
                if (on == 0) {
                    Toast.makeText(this, Ui.tr("Deixe pelo menos um canal ligado", "Keep at least one channel on", "Deja al menos un canal encendido"),
                            Toast.LENGTH_SHORT).show();
                    return;
                }
                prefs(this).edit().putString("off", out[0]).apply();
                choose();
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
            lp.rightMargin = Math.round(30 * k);
            row.addView(t, lp);
            if (i == focus) first = t;
        }
        chooser = scroll;
        root.addView(chooser, new FrameLayout.LayoutParams(-1, -1));
        list.setVisibility(View.INVISIBLE);
        if (nowBar != null) nowBar.setVisibility(View.INVISIBLE);
        final View f = first;
        if (f != null) handler.post(f::requestFocus);
    }

    private void closeChooser() {
        if (chooser == null) return;
        root.removeView(chooser);
        chooser = null;
        String was = at >= 0 && at < line.size() ? line.get(at).key : null;
        setChannels(channels);
        relist(was);
        rebuildList(true);
        // Back on the Choose channels button in the guide built again.
        final View b = chooseButton != null ? chooseButton : firstTile;
        if (b != null) handler.post(b::requestFocus);
    }

    // MARK: - The list, and what is on air

    /** The good channels in a list file ({channels: [...]}), or null when there are none. Each: the fields above. */
    static String[][] goodOf(String json) {
        try {
            JSONArray l = new JSONObject(json).getJSONArray("channels");
            List<String[]> out = new ArrayList<>();
            for (int i = 0; i < l.length() && out.size() < 60; i++) {
                JSONObject c = l.optJSONObject(i);
                if (c == null) continue;
                String name = c.optString("name", ""), id = c.optString("youtube", ""), slug = c.optString("id", "");
                String[] row = new String[FIELDS];
                row[ID] = slug;
                row[NAME] = name;
                row[FROM] = c.optString("from", "");
                row[YT] = id;
                row[GROUP] = c.optString("group", "news");
                row[COLOUR] = c.optString("colour", "#2C2458");
                if (name.isEmpty()) continue;
                if (CHANNEL_ID.matcher(id).matches()) out.add(row);
                else if (SLUG.matcher(slug).matches() && c.optJSONArray("mix") != null) {
                    // One of our mixes (ADR 0065): the official channels whose videos it plays.
                    StringBuilder mix = new StringBuilder();
                    JSONArray m = c.optJSONArray("mix");
                    for (int j = 0; j < m.length(); j++) {
                        String x = m.optString(j, "");
                        if (!CHANNEL_ID.matcher(x).matches()) continue;
                        if (mix.length() > 0) mix.append(',');
                        mix.append(x);
                    }
                    if (mix.length() == 0) continue;
                    row[YT] = "";
                    row[MIX] = mix.toString();
                    out.add(row);
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
        JSONObject live = null, mixes = null;
        try {
            JSONObject now = new JSONObject(nowJson);
            long t = parseTime(now.optString("at", ""));
            if (t > 0 && time - t < NOW_FOR && time - t > -3600 * 1000) {
                live = now.getJSONObject("channels");
                mixes = now.optJSONObject("mixes");
            }
        } catch (Exception ignored) {
        }
        List<String[]> out = new ArrayList<>();
        for (String[] c : channels) {
            String[] copy = new String[FIELDS];
            System.arraycopy(c, 0, copy, 0, Math.min(c.length, VIDEO));
            if (c.length > MIX) copy[MIX] = c[MIX];
            // A mix plays only the videos now.json lists for it: none, and it is off air.
            if (copy[YT] == null || copy[YT].isEmpty()) {
                JSONArray v = mixes == null ? null : mixes.optJSONArray(copy[ID]);
                if (v == null || videosOf(v.toString()).isEmpty()) continue;
                copy[VIDEOS] = cleanVideos(v.toString());
                out.add(copy);
                continue;
            }
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

    /** A mix's videos: {id, title, seconds}, with a good id, a title and a length (a minute to four hours), at most 60. */
    static List<Object[]> videosOf(String json) {
        List<Object[]> out = new ArrayList<>();
        try {
            JSONArray l = new JSONArray(json);
            for (int i = 0; i < l.length() && out.size() < 60; i++) {
                JSONObject x = l.optJSONObject(i);
                if (x == null) continue;
                Object t = x.opt("t"), sec = x.opt("s");
                String v = x.optString("v", "");
                if (!VIDEO_ID.matcher(v).matches() || !(t instanceof String) || !(sec instanceof Number)) continue;
                double secs = ((Number) sec).doubleValue();
                if (secs < 30 || secs > 4 * 3600) continue;
                out.add(new Object[] {v, cut((String) t), (int) secs});
            }
        } catch (Exception ignored) {
            // A broken list is empty.
        }
        return out;
    }

    private static String cleanVideos(String json) {
        JSONArray out = new JSONArray();
        try {
            for (Object[] v : videosOf(json)) out.put(new JSONObject().put("v", v[0]).put("t", v[1]).put("s", v[2]));
        } catch (Exception ignored) {
        }
        return out.toString();
    }

    /**
     * Where a mix is at this moment: {the video, seconds into it}. The videos go round one after another from midnight
     * UTC on 01/01/1970, so every TV is at the same place, as on a real channel.
     */
    static int[] mixAt(List<Object[]> videos, long time) {
        long total = 0;
        for (Object[] v : videos) total += (Integer) v[2];
        if (total == 0) return new int[] {0, 0};
        long pos = (time / 1000) % total;
        for (int i = 0; i < videos.size(); i++) {
            int len = (Integer) videos.get(i)[2];
            if (pos < len) return new int[] {i, (int) pos};
            pos -= len;
        }
        return new int[] {0, 0};
    }

    /** What's on a channel now: the live video's title, or the mix's video at this moment; null when unknown. */
    static String nowOf(String[] c, long time) {
        if (c == null) return null;
        if (c.length > VIDEOS && c[VIDEOS] != null) {
            List<Object[]> v = videosOf(c[VIDEOS]);
            if (!v.isEmpty()) return (String) v.get(mixAt(v, time)[0])[1];
        }
        return c.length > NOW ? c[NOW] : null;
    }

    // MARK: - The line-up (ADR 0065)

    /**
     * The numbered line-up: the aerial (when aerial is its name) and the NZ apps first, then the channels in GROUPS
     * order, then the other apps. A kid gets the aerial, the NZ apps and the kids' channels. Numbers come before
     * anything is turned off, so a channel keeps its number.
     */
    static List<Entry> lineup(String[][] channels, List<String[]> nzApps, List<String[]> free, List<String[]> paid, String aerial, boolean kid) {
        List<Entry> out = new ArrayList<>();
        if (aerial != null) out.add(new Entry("aerial", "aerial", aerial, null, null));
        for (String[] a : nzApps) out.add(new Entry(a[2], "app", a[1], a, null));
        for (String g : kid ? new String[] {"kids"} : GROUPS) for (String[] c : inGroup(channels, g)) out.add(new Entry(c[ID], "channel", c[NAME], null, c));
        if (!kid) {
            for (String[] a : free) out.add(new Entry(a[2], "app", a[1], a, null));
            for (String[] a : paid) out.add(new Entry(a[2], "app", a[1], a, null));
        }
        for (int i = 0; i < out.size(); i++) out.get(i).num = i + 1;
        return out;
    }

    /** The line-up without what was turned off; never empty while there is anything at all. */
    static List<Entry> shown(List<Entry> full, List<String> off) {
        List<Entry> out = new ArrayList<>();
        for (Entry e : full) if (!off.contains(e.key)) out.add(e);
        return out.isEmpty() ? new ArrayList<>(full) : out;
    }

    /** Where in the list a number goes, or -1. */
    static int byNumber(List<Entry> list, int n) {
        for (int i = 0; i < list.size(); i++) if (list.get(i).num == n) return i;
        return -1;
    }

    /** Where surfing starts: the channel asked for, else the one last watched, else the first channel (not an app). */
    static int startAt(List<Entry> list, String play, String last) {
        for (int i = 0; play != null && i < list.size(); i++) if (list.get(i).key.equals(play)) return i;
        for (int i = 0; last != null && !last.isEmpty() && i < list.size(); i++) if (list.get(i).key.equals(last)) return i;
        for (int i = 0; i < list.size(); i++) if (list.get(i).isChannel()) return i;
        return list.isEmpty() ? -1 : 0;
    }

    /** The line-up entries one person turned off in Choose channels (ids, "aerial" or an app's key). */
    static List<String> offOf(String json, String who) {
        return listOf(json, who, 120);
    }

    /** Turns an entry off for one person, or back on; out[0] is the new store. True when it is off now. */
    static boolean toggledOff(String json, String who, String key, String[] out) {
        JSONObject store;
        try {
            store = new JSONObject(json);
        } catch (Exception e) {
            store = new JSONObject();
        }
        List<String> l = offOf(store.toString(), who);
        boolean off = !l.remove(key);
        if (off) l.add(key);
        try {
            store.put(who, new JSONArray(l));
        } catch (Exception ignored) {
        }
        out[0] = store.toString();
        return off;
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
        return listOf(json, who, MAX_FAVS);
    }

    /** One person's list of ids from a store kept on the TV ({who: [ids]}): good ids only, each once, at most max. */
    static List<String> listOf(String json, String who, int max) {
        List<String> out = new ArrayList<>();
        try {
            JSONArray l = new JSONObject(json).optJSONArray(who);
            for (int i = 0; l != null && i < l.length() && out.size() < max; i++) {
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
