package nz.gobeyond.tv;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.media.tv.TvInputManager;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;
import android.view.Choreographer;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityManager;
import android.view.accessibility.AccessibilityNodeProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.WeakHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * The home screen, styled after the Apple TV app with the macOS 27 glass:
 *  - at the top left, "Kia ora, Mum", one line with the time, the date and the weather, and the te reo word of the
 *    day in a chip; at the top right, icon-only glass buttons (Live TV, HDMI Inputs, Settings), with the focused
 *    one's name below it;
 *  - tabs (Keep watching, Explore, Movies, Shows) over three little TV screens: what was last opened from here
 *    (Watched), or the titles recommended for right now (Recs, from TMDB); the background is the first one's photo,
 *    heavily blurred and almost white (Backdrop); without one, a light gradient. With neither, a big clock;
 *  - "Tonight at home" at the right: Beyond Family's badge when the TV is linked, and the weather;
 *  - at the bottom, the glass shelf with the apps (icons in each brand's color, like the tvOS Dock; the focused one
 *    grows);
 *  - ↓ on the shelf: everything moves up and the bottom drawer appears (inputs, shortcuts, weather for the next hours
 *    and quotes with the 24 h change); the background lightens (darkens at night). ↑ or Back closes it;
 *  - from sunset to sunrise, a night look: dark background, smoked glass and white text.
 * Measurements are in a 1920×1080 space (k = width / 1920). The screen is split into layers so the TV's weak GPU only
 * redraws what changed.
 */
final class HomeView extends ViewGroup implements Choreographer.FrameCallback, HomeData.Listener, Recs.Listener {
    // tvOS grid (Human Interface Guidelines): content inside the safe area, 80 px from the sides and 60 from top and
    // bottom; 40 px between items; 7 columns of 217 px (the apps). The shelf glass extends 36 px past the tiles (the
    // same padding on all four sides) and the tile corners are concentric with it (glass radius = radius + padding).
    private static final float MARGIN = 80, CONTENT_R = 1840;
    // Hero, anchored at the bottom (a two-line title grows upward).
    private static final float HERO_TITLE_W = 900;
    // Shelf: tiles with corners concentric with the glass (glass radius = tile radius + padding).
    // Shelf like the tvOS 27 Dock: icons in each brand's color, 48 apart, and the glass bar hugging them with 40 of
    // padding (the focused icon grows 20% without touching its edge). The icons are square, like an iPad's home
    // screen, with each app's name under it: up to 132 × 132, smaller only when they would not fit across.
    private static final float SHELF_PAD = 32, TILE_GAP = 52;
    private static final float TILE_RADIUS = 30;
    private static final float L_TILE_SIDE = 132, L_TILE_NAME = 38, L_PLATTER_BOTTOM = 1020;
    // Tile focus (Apple TV style): it grows from the center and its shadow drops (it "rises" toward the viewer).
    private static final float FOCUS_GROW = 0.2f;
    // Corner capsule.
    // Corner capsule: the height and top offset of the tvOS tab bar (68 and 46).
    private static final float CAPSULE_TOP = 46, CAPSULE_H = 68, BUTTON = 56;
    // Bottom drawer (measured with it open; everything moves up by SHIFT).
    private static final float SHIFT = 560, ROW_TITLE = 518, ROW_TOP = 540, ROW_H = 126, CARDS_TOP = 708, CARDS_H = 300;
    // "All Apps" sheet.
    private static final int COLUMNS = 5, VISIBLE_ROWS = 3;
    private static final float GRID_W = 300, GRID_H = 169, GRID_GAP = 40, GRID_ROW = 239, GRID_TOP = 196, GRID_RADIUS = 22;
    private static final int SMOKE = 0xFF121210, INK = 0xFF22221F, WHITE = 0xFFF7F6F2;
    private static final int UP_COLOR = 0xFF30D158, DOWN_COLOR = 0xFFFF453A;
    private static final long TOAST_MS = 6000, FADE_MS = 800;
    /** Blur radii of the shadow and shadowDeep paints (Shadows needs them to draw the same blur on older TVs). */
    private static final float SHADOW_BLUR = 26, DEEP_BLUR = 30;
    private static final int SKY = 0, HERO = 1, STATUS = 2, PLATTER = 3, TILES = 4, DRAWER = 5, SHEET = 6, TOAST = 7;
    private static final int Z_STATUS = 0, Z_HERO = 1, Z_SHELF = 2, Z_DRAWER = 3;
    private static final ExecutorService LOADER = Executors.newSingleThreadExecutor();
    // Light design (the L_ constants): greeting, info line, kupu chip, tab bar, three little TV screens, Tonight at
    // home and the shelf. The same layout as web/home.css.
    private static final float L_TITLE_BASE = 130, L_INFO_BASE = 196, L_KUPU_TOP = 214, L_KUPU_H = 50;
    private static final float L_TABBAR_TOP = 296, L_TABBAR_H = 68, L_CARDS_TOP = 384, L_CARD_W = 360, L_CARD_H = 203;
    private static final float L_CARD_STEP = 400, L_BEZEL = 6, L_BUTTON = 68, L_BUTTON_GAP = 20, L_BUTTON_CY = 103;
    private static final float L_CLOCK_BASE = 530, L_QUOTES_BASE = 694, L_TONIGHT_X = 1300, L_TONIGHT_W = 540;
    private static final int BEZEL = 0xFF15131F, PURPLE = 0xFF6E3DDB, PAPER = 0xFFF7F6F2;
    private static final int L_INK = 0xFF22221F, L_DIM = 0xFF55534B, L_FAINT = 0xFF8A877D;
    private static final String[] TABS = {"Explorar", "Filmes", "Séries"};
    private static final String[] TABS_RU = {"Обзор", "Фильмы", "Сериалы"};
    private static final String[] TABS_EN = {"Explore", "Movies", "Shows"};
    private static final String[] TABS_ES = {"Explorar", "Películas", "Series"};
    private static final String[] TABS_DE = {"Entdecken", "Filme", "Serien"};
    private static final int Z_TOP = 4, Z_CARDS = 5;

    private final Activity activity;
    private final Scene scene = new Scene();
    private final HomeData data;
    private final Recs recs;
    private final Click click;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final SharedPreferences ui;
    private final TvInputManager tvInputs;
    private final Spoken spoken = new Spoken(this, new Spoken.Source() {
        @Override public void items(List<Integer> out) { a11yItems(out); }
        @Override public String text(int id) { return a11yText(id); }
        @Override public boolean bounds(int id, Rect out) { return a11yBounds(id, out); }
        @Override public int focused() { return a11yFocused(); }
        @Override public void focus(int id) { a11yFocus(id); }
        @Override public void click(int id) { activate(); }
        @Override public boolean clickable(int id) { return (id - 1) / 1000 != WIDGETS; }
    });
    private final RectF a11yRect = new RectF();
    private final Layer sky, heroLayer, status, platter, tiles, drawerLayer, sheetLayer, toastLayer;
    private int zone = Z_SHELF;

    // Night look (like Apple's "Automatic" appearance): darker from sunset to sunrise, with a 2 s transition.
    private static final long NIGHT_MS = 2000;
    private boolean nightTarget;
    /** The dark look: at night, or while a kid's world is behind the home screen (its skies are dark). */
    private boolean darkTarget;
    /** Make it yours: the watcher's world behind the apps, or null for the usual sky. */
    private MyWorldActivity.World world;
    private String[] worldThings = new String[0];
    private final Paint worldSky = new Paint();
    private Paint[] worldPaints;
    private float night, nightFrom;     // 0 = day, 1 = night
    private long nightAt;
    private final int[] glassNight = new int[Backdrop.GW * Backdrop.GH], frostNight = new int[Backdrop.FW * Backdrop.FH];
    private final int[] neutralGlassPx = new int[Backdrop.GW * Backdrop.GH], neutralFrostPx = new int[Backdrop.FW * Backdrop.FH];
    private boolean nightPair;          // the glass holds both photos (day and night), blended by `night`
    // Without a photo: Beyond's violet background, breathing (Glow, Breath). Redrawn ~15 times a second (10 on the
    // older GPUs), only the sky layer, and only while nothing else needs the frames.
    private final Glow glow = new Glow();
    private final Breath.Clock breathClock = new Breath.Clock();
    private final Paint veilPaint = new Paint(), markPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private static final long BREATH_FRAME = Ui.LEGACY ? 100 : 66;
    private long bornAt, lastBreath;

    // At the top: the tabs (0 to kinds - 1), then the icon-only buttons; the three screens
    private int tab, topIndex, cardIndex;
    /** The tabs shown: "watching" (Keep watching), then "all", "movie" and "tv" when there are picks. */
    private final List<String> kinds = new ArrayList<>();
    private String[] tabLabels = new String[0];
    /** Each screen's words, worked out off the frame loop: its name, its line under it, and how long ago. */
    private final String[] cardName = new String[3], cardMeta = new String[3], cardWhen = new String[3];
    private final float[] cardWhenW = new float[3];
    private final HomeApps.Item[] cardApp = new HomeApps.Item[3];
    // The jobs tile, worked out in cardWords: each kid's first name (cut to fit), colour, jobs done and jobs in all.
    private final String[][] jobKid = new String[3][3];
    private final int[][] jobKidColour = new int[3][3], jobDone = new int[3][3], jobAll = new int[3][3];
    // The line under the greeting and the kupu chip, as drawn.
    private String infoTime = "", infoRest = "";
    private float infoTimeW;
    private String kupuWord = "", kupuRest = "";
    private float kupuWordW, kupuRestW;
    // Tonight at home, as drawn.
    private final RectF tonightRect = new RectF();
    private boolean tonightOn, tonightLinked;
    private String tonightHead = "", tonightHome = "", tonightKey = "";
    private final List<People.Person> tonightFaces = new ArrayList<>();
    private final List<String[]> tonightRows = new ArrayList<>();   // {emoji or "", what, more, weather symbol or ""}
    private int widgetIndex;    // with TalkBack on, the drawer's weather (0) or quotes (1) card can take the focus
    private List<Recs.Pick> cards = new ArrayList<>();
    // The tabs (up to four), then the round buttons (five today). Room to spare: one past the end would crash the home
    // screen, the way a 13th row crashed Home Settings.
    private final Spring[] topFocus = new Spring[20];   // tabs (up to 6) and corner buttons (up to 7): room to grow
    private final RectF[] topRects = new RectF[20];
    private final Spring[] cardFocus = new Spring[3];
    private final RectF[] cardRects = new RectF[3];
    private final List<HomeApps.Item> lightButtons = new ArrayList<>();
    /** Who's watching, read once (a change to the people recreates the home screen), and the title it gives. */
    private People.Person watcher;
    private String helloLine = "", watcherInitial = "";
    private final Paint personInk = new Paint(Paint.ANTI_ALIAS_FLAG), personName = new Paint(Paint.ANTI_ALIAS_FLAG);
    /** The name on the Who's watching button: a face alone meant nothing to a child, their name beside it does. */
    private String watcherLabel = "";
    private Paint lTileName;
    private String[] tileNames = new String[0];   // each shelf app's name, cut to fit under its icon
    private Paint lPickEmoji, lJobKid;
    private final Paint jobRing = new Paint(Paint.ANTI_ALIAS_FLAG);
    private Paint lTitle, lTab, lTabOn, lCardTitle, lCardMeta, lQuote, lTip, lClock, lClockQuote;
    private Paint lInfo, lInfoTime, lKupu, lKupuWord, lWhen, lHead, lRowWhat, lRowMore, lBadge, lBadgeHome, lEmoji, lFace;

    // Shelf
    private List<HomeApps.Item> shelf = new ArrayList<>();
    private Spring[] tileFocus = new Spring[0];
    private RectF[] tileRects = new RectF[0];
    private final RectF banner = new RectF();
    private final Map<String, Bitmap> crispLogos = new HashMap<>();   // logos already sized for the focused tile
    /** Each app's tile like its Apple TV icon: brand colors (top, bottom) and logo (0 = as is, 1 = white, 2 = dark). */
    private static final Map<String, int[]> TILE_STYLE = new HashMap<>();
    static {
        TILE_STYLE.put("netflix", new int[] {0xFF0A0A0A, 0xFF000000, 0});
        TILE_STYLE.put("youtube", new int[] {0xFF1C1C1E, 0xFF09090A, 0});
        TILE_STYLE.put("globoplay", new int[] {0xFFFF8A1F, 0xFFFF2D5A, 1});
        TILE_STYLE.put("prime", new int[] {0xFF2AA8FF, 0xFF0A68D4, 1});
        TILE_STYLE.put("disney", new int[] {0xFF173584, 0xFF08143F, 0});
        TILE_STYLE.put("max", new int[] {0xFF5C30E8, 0xFF221684, 0});
        TILE_STYLE.put("appletv", new int[] {0xFF1C1C1E, 0xFF000000, 0});
    }
    private final android.graphics.PorterDuffColorFilter whiteLogo =
            new android.graphics.PorterDuffColorFilter(0xFFFFFFFF, android.graphics.PorterDuff.Mode.SRC_IN);
    private final RectF platterRect = new RectF();
    private int shelfIndex;

    // Moving apps on the shelf (as on Apple TV): hold OK on a tile, then ← → move it, OK drops it, Back cancels. The
    // lifted tile wiggles; the others slide to their new places (each slot's x offset is a spring that returns to 0).
    private static final long HOLD_MS = 500, WIGGLE_MS = 300;
    private static final float LIFT_GROW = 0.08f, WIGGLE_DEG = 1.5f;
    private boolean reordering, reorderAnim, okHeld, holdArmed;
    private int liftIndex = -1;
    private long reorderAt;
    private float wiggle;
    private Spring[] tileSlide = new Spring[0];
    private final Spring moveLift = new Spring(0.3f, 0.72f, 0);
    private List<HomeApps.Item> reorderOrigin;
    private final Runnable holdStart = () -> { if (this.okDown && this.holdArmed) startReorder(); };

    // Corner capsule
    private List<HomeApps.Item> statusItems = new ArrayList<>();
    private Spring[] statusFocus = new Spring[0];
    private RectF[] statusRects = new RectF[0];
    private final RectF capsuleRect = new RectF();
    private float capsuleInfoW;
    private int statusIndex;

    // Hero and background
    private List<Recs.Pick> picks = new ArrayList<>();
    private int pickIndex, heroSlide = 1;
    private Hero hero, heroFrom;
    private long heroFadeAt, bgFadeAt;
    private final Spring heroFocus = new Spring(0.28f, 0.85f, 0);
    private final RectF heroButton = new RectF();
    private Backdrop bgFrom, bgTo;     // null = gradient (no photo)
    private final int[] frostMix = new int[Backdrop.FW * Backdrop.FH];

    // Bottom drawer
    private List<HomeApps.Item> drawerItems = new ArrayList<>();
    private int drawerInputs;          // how many leading items are inputs (the rest are shortcuts)
    private Spring[] drawerFocus = new Spring[0];
    private RectF[] drawerRects = new RectF[0];
    private final RectF weatherCard = new RectF(), quotesCard = new RectF();
    private final Spring drawer = new Spring(0.46f, 0.92f, 0);
    private boolean drawerOpen;
    private int drawerIndex;

    // "All Apps" sheet
    private List<HomeApps.Item> others = new ArrayList<>();
    private Spring[] gridFocus = new Spring[0];
    private String[] gridLabels;
    private final Spring sheet = new Spring(0.38f, 0.9f, 0);
    private final Spring scroll = new Spring(0.34f, 1f, 0);
    private final RectF focusedCell = new RectF();
    private boolean sheetOpen;
    private int gridIndex;

    // Toasts
    private final ArrayDeque<String> toasts = new ArrayDeque<>();
    private StaticLayout toast;
    private long toastAt;

    // Frames
    private boolean running, tilesDirty, statusDirty, heroDirty, drawerDirty, gridDirty, motionDirty = true;
    private boolean drawerWasMoving, idle;
    private long lastNanos, resumedAt, lastStep;
    private int w, h;
    private float k = 1;
    private String clockText = "", dateText = "";
    private long clockMinute = -1;
    private boolean okDown, backDown;

    private Paint labelPaint, metaPaint, clockPaint, buttonPaint, capsuleText, tipPaint, quotePaint, staleQuote;
    private Paint rowTitle, drawerLabel, cardTitle, cardText, cardDim, cardDimRight, bigTemp, hourPaint, hourTemp;
    private Paint pricePaint, changePaint, sheetTitle;
    private TextPaint titlePaint, gridLabel, toastPaint;
    private final Paint bitmapPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint imagePaint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
    private final Paint shadow = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint shadowSoft = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint shadowDeep = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint halo = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Shadows shadows = new Shadows();
    private final Map<Bitmap, BitmapShader> imageShaders = new WeakHashMap<>();
    private final Matrix imageMatrix = new Matrix();
    private final Paint imageFill = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint border = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint rim = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint sheen = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint veil = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint tileFill = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path clip = new Path();
    private final RectF tmp = new RectF(), cell = new RectF(), screen = new RectF();
    private final Path play = new Path();
    private final TextPaint fitPaint = new TextPaint();
    private final RectF gridCell = new RectF();
    private LinearGradient[] tileShaders = new LinearGradient[0];
    private LinearGradient tileGlow, cardSheen;
    private float tileShaderH, cardSheenH;
    private LinearGradient[] lightSheens = new LinearGradient[0], lightRims = new LinearGradient[0];
    private float[] lightShaderW = new float[0];
    private android.graphics.ColorFilter veilFilter;
    private float veilAmount = -1;
    private int veilColor;
    private HomeData.Weather textWeather;
    private long textPricesAt = -1, textMinute = -1;
    private int textPrefs = -1;
    private String textLanguage;
    private String weatherTitle, nowTemp, highLow, sunriseText, sunsetText, staleText;
    private final String[] hourText = new String[6], hourTempText = new String[6];
    private final String[] priceText = new String[HomeData.COINS.length], changeText = new String[HomeData.COINS.length];

    /** What the hero shows: a recommendation or, without any, the date, the time and the weather. */
    private static final class Hero {
        String label = "", title = "", meta = "";
        boolean clock, button;
        int dots, dot;
        StaticLayout titleLayout;

        boolean sameText(Hero o) {
            return o != null && clock == o.clock && label.equals(o.label) && title.equals(o.title) && meta.equals(o.meta);
        }
    }

    /** One layer of the screen. It draws in full-screen coordinates: the glass needs each pixel's real position. */
    private final class Layer extends View {
        private final int kind;

        Layer(Context c, int kind) {
            super(c);
            this.kind = kind;
        }

        @Override protected void onDraw(Canvas c) {
            if (labelPaint == null) return;
            c.translate(-getLeft(), -getTop());
            // The layer may be shifted (bottom drawer): the glass reads the background from where it really is. The
            // drawer and the top buttons are always drawn as if resting in place (they are only visible there and are
            // not redrawn while they move).
            scene.setOffset(0, kind == DRAWER || kind == STATUS ? 0 : getTranslationY());
            switch (kind) {
                case SKY: drawSky(c); break;
                case HERO: drawLightTop(c); break;
                case STATUS: drawLightButtons(c); break;
                case PLATTER: drawPlatter(c); break;
                case TILES: drawTiles(c); break;
                case DRAWER: drawDrawer(c); break;
                case SHEET: drawSheet(c); break;
                default: drawToast(c); break;
            }
            scene.setOffset(0, 0);
        }
    }

    private final Runnable reloadSoon = this::reload;

    private final TvInputManager.TvInputCallback inputCallback = new TvInputManager.TvInputCallback() {
        @Override public void onInputStateChanged(String inputId, int state) { reloadSoon(); }
        @Override public void onInputAdded(String inputId) { reloadSoon(); }
        @Override public void onInputRemoved(String inputId) { reloadSoon(); }
    };

    private void reloadSoon() {
        handler.removeCallbacks(reloadSoon);
        handler.postDelayed(reloadSoon, 500);
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!running) return;
            wake();
            data.refreshIfStale();
            recs.refreshIfStale();
            checkNotices();
            updatePalette();
            checkNight(true);
            updatePicks();      // three new ones every hour
            HomeHub.start(getContext());   // a Beyond Home box switched on later is found (it asks at most every ten minutes)
            handler.postDelayed(this, 15_000);
        }
    };

    HomeView(Activity a) {
        super(a);
        activity = a;
        data = HomeData.get(a);
        recs = Recs.get(a);
        click = new Click(a);
        ui = a.getSharedPreferences("home-ui", Context.MODE_PRIVATE);
        tvInputs = (TvInputManager) a.getSystemService(Context.TV_INPUT_SERVICE);
        setFocusable(true);
        sky = new Layer(a, SKY);
        heroLayer = new Layer(a, HERO);
        status = new Layer(a, STATUS);
        platter = new Layer(a, PLATTER);
        tiles = new Layer(a, TILES);
        drawerLayer = new Layer(a, DRAWER);
        sheetLayer = new Layer(a, SHEET);
        toastLayer = new Layer(a, TOAST);
        // Hardware layers on the GPU: only the one that changed is redrawn; moving, fading and scaling stay cheap.
        // Not on Android 9 to 11: on older GPUs (a Mi Box 3's Mali-450) redrawing and compositing a big layer on every
        // frame cost more than drawing straight to the screen (measured: focus on the picks 33 → 12 ms a frame, the
        // drawer 19 → 17 ms).
        for (View v : new View[] {heroLayer, status, platter, tiles, drawerLayer, sheetLayer}) v.setLayerType(Ui.LEGACY ? LAYER_TYPE_NONE : LAYER_TYPE_HARDWARE, null);
        for (View v : new View[] {sky, heroLayer, status, platter, tiles, drawerLayer, sheetLayer, toastLayer}) {
            v.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);   // TalkBack reads the items (Spoken)
            addView(v);
        }
        setContentDescription("Beyond™ TV");
        drawerLayer.setVisibility(INVISIBLE);
        for (int i = 0; i < topFocus.length; i++) {
            topFocus[i] = new Spring(0.26f, 0.85f, 0);
            topRects[i] = new RectF();
        }
        for (int i = 0; i < 3; i++) {
            cardFocus[i] = new Spring(0.32f, 0.78f, 0);
            cardRects[i] = new RectF();
        }
        makeLightButtons();
        recs.setLight(true);
        checkNight(false);
        sheetLayer.setVisibility(INVISIBLE);
        scene.setMotion(0.6f, 0f);
        updatePalette();
        // First time: right away (a cold start opens with the apps already there); missing logos come from reload().
        setShelf(HomeApps.shelf(a, false));
        setStatusItems(statusList(a));
        setDrawerItems(drawerList(a));
    }

    // MARK: - Lifecycle (called by HomeActivity)

    void resume() {
        if (running) return;
        running = true;
        checkNight(false);
        resumedAt = SystemClock.uptimeMillis();
        lastNanos = 0;
        lastStep = 0;
        data.addListener(this);
        recs.addListener(this);
        data.refreshIfStale();
        recs.refreshIfStale();
        if (tvInputs != null) tvInputs.registerCallback(inputCallback, handler);
        handler.postDelayed(tick, 15_000);
        handler.post(camTick);
        HomeHub.onChange = () -> { if (running) { updateCards(); cardWords(); invalidateAll(); } };
        HomeHub.start(getContext());
        HomeHub.pace(false);
        checkNotices();
        reload();
        updatePalette();
        tab = 0;            // back from an app: what was just opened leads Keep watching
        updatePicks();
        if (sheetOpen) closeSheet();
        sheet.snap(sheet.target);
        motionDirty = true;
        invalidateAll();
        idle = false;
        Choreographer.getInstance().postFrameCallback(this);
        spoken.readAgain();
    }

    void pause() {
        if (!running) return;
        running = false;
        cancelReorder(true);
        handler.removeCallbacks(holdStart);
        okHeld = holdArmed = false;
        Choreographer.getInstance().removeFrameCallback(this);
        handler.removeCallbacks(tick);
        handler.removeCallbacks(camTick);
        HomeHub.stop();
        HomeHub.onChange = null;
        handler.removeCallbacks(reloadSoon);
        data.removeListener(this);
        recs.removeListener(this);
        if (tvInputs != null) tvInputs.unregisterCallback(inputCallback);
    }

    void destroy() {
        pause();
        click.release();
    }

    /** Starting state (Home pressed while the home screen is showing): first app focused, drawer and sheet closed. */
    void reset(boolean animated) {
        wake();
        cancelReorder(!animated);
        zone = Z_SHELF;
        shelfIndex = 0;
        sheetOpen = false;
        drawerOpen = false;
        if (animated) {
            sheet.target = 0;
            drawer.target = 0;
        } else {
            sheet.snap(0);
            drawer.snap(0);
        }
        if (pickIndex != 0 && !picks.isEmpty()) {
            pickIndex = 0;
            updatePicks();
        }
        if (tab != 0) selectTab(0);
        retarget(!animated);
        motionDirty = true;
    }

    /** The three corner buttons, with their names in the current language. */
    private void makeLightButtons() {
        lightButtons.clear();
        watcher = People.current(getContext());
        String hello = Ui.hello();
        helloLine = watcher.together() ? hello + Ui.tr(", família", Prefs.kupu() ? ", whānau" : ", everyone", ", familia")
                : People.count(getContext()) > 1 ? hello + ", " + watcher.name : hello;
        watcherInitial = watcher.initial();
        world = MyWorldActivity.world(watcher.world);
        worldThings = MyWorldActivity.things(world, watcher.loves);
        if (world != null && h > 0) worldSky.setShader(MyWorldActivity.sky(world, h));
        personInk.setTypeface(Ui.semibold);
        personInk.setColor(0xFFFFFFFF);
        personInk.setTextAlign(Paint.Align.CENTER);
        personName.setTypeface(Ui.semibold);
        String label = watcher.together() ? Ui.tr("Família", "Family", "Familia") : watcher.name == null ? "" : watcher.name;
        watcherLabel = label.length() > 12 ? label.substring(0, 11) + "…" : label;
        boolean kid = watcher.kid;   // kids get fewer: no feedback, no HDMI inputs
        // Bedtime breathing, at night: a night light that breathes, then fades to dark.
        if (nightTarget) lightButtons.add(HomeApps.action(HomeApps.BEDTIME, "bedtime", Ui.tr("Respirar para dormir", "Bedtime breathing", "Respirar para dormir"), "bedtime"));
        // Talk to Beyond: the four dots, breathing. Feedback, spoken or typed (FeedbackActivity).
        if (!kid) lightButtons.add(HomeApps.action(HomeApps.FEEDBACK, "feedback", Ui.tr("Fale com a Beyond", "Talk to Beyond"), "dots"));
        lightButtons.add(HomeApps.action(HomeApps.LIVE_TV, "live", Ui.tr("TV aberta", "Live TV"), "live_tv"));
        if (!kid) lightButtons.add(HomeApps.action(HomeApps.INPUTS, "inputs", Ui.tr("Entradas HDMI", "HDMI Inputs"), "hdmi"));
        // Party mode, for anyone with the remote: no phone needed (PartyPickActivity).
        lightButtons.add(HomeApps.action(HomeApps.PARTY, "party", Ui.tr("Hora da festa!", "Party time!", "¡Hora de la fiesta!"), "party"));
        if (!kid) lightButtons.add(HomeApps.action(HomeApps.SETTINGS, "settings", Ui.tr("Configurações", "Settings"), "settings"));
        // Who's watching: their face and name (Family wears the four dots). Opens the picker (WhoActivity).
        lightButtons.add(HomeApps.action(HomeApps.PEOPLE, "people", Ui.tr("Trocar quem está assistindo", "Change who's watching", "Cambiar quién mira"), "person"));
    }

    private static String[] tabs() {
        return Ui.ru ? TABS_RU : Ui.es ? TABS_ES : Ui.de ? TABS_DE : Ui.en ? TABS_EN : TABS;
    }

    private static String tabName(String kind) {
        switch (kind) {
            case "watching": return Ui.tr("Continuar assistindo", "Keep watching", "Seguir viendo");
            case "pinned": return Ui.tr("Fixados", "Pinned", "Fijados");
            case "home": return Ui.tr("Sua casa", "Your home", "Tu casa");
            case "movie": return tabs()[1];
            case "tv": return tabs()[2];
            default: return tabs()[0];
        }
    }

    private int tabCount() {
        return kinds.size();
    }

    /** Keep watching once something was opened from here; then the picks, when there is a TMDB key. */
    private List<String> tabKinds() {
        List<String> out = new ArrayList<>();
        // Pinned: the tiles the household chose in Beyond Family, first because somebody picked them on purpose.
        JSONArray pinned = Family.widgets();
        if (pinned != null && pinned.length() > 0) out.add("pinned");
        if (!Watched.list(getContext(), 1).isEmpty()) out.add("watching");
        // Your home: the rooms from the family's Beyond Home box, once there is one on this network. Not for kids.
        if (!"none".equals(HomeHub.status()) && !People.kid(getContext())) out.add("home");
        if (picksOn()) {
            out.add("all");
            out.add("movie");
            out.add("tv");
        }
        return out;
    }

    @Override public void onData() {
        wake();
        updatePalette();
        checkNight(true);
        updateInfo();
        updateTonight();
        layoutStatus();
        heroDirty = statusDirty = drawerDirty = true;
        platter.invalidate();
    }

    @Override public void onRecs() {
        wake();
        updatePicks();
    }

    private void invalidateAll() {
        for (View v : new View[] {sky, heroLayer, status, platter, tiles, drawerLayer}) v.invalidate();
    }

    // MARK: - Size and layers

    @Override protected void onMeasure(int widthSpec, int heightSpec) {
        int width = MeasureSpec.getSize(widthSpec), height = MeasureSpec.getSize(heightSpec);
        float kk = width / 1920f;
        measure(sky, width, height);
        measure(heroLayer, width, Math.round(790 * kk));
        measure(status, Math.round(1160 * kk), Math.round(760 * kk));   // the round buttons and Tonight at home
        // Sized to what they draw (the glass and its shadow; the grown tiles and their shadows): smaller layers are
        // cheaper for the GPU to composite on every frame of the drawer animation.
        measure(platter, width, Math.round(320 * kk));
        measure(tiles, width, Math.round(270 * kk));
        measure(drawerLayer, width, Math.round(600 * kk));
        measure(sheetLayer, width, height);
        measure(toastLayer, Math.round(1000 * kk), Math.round(220 * kk));
        setMeasuredDimension(width, height);
    }

    private static void measure(View v, int width, int height) {
        v.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY));
    }

    @Override protected void onLayout(boolean changed, int l, int t, int r, int b) {
        int width = r - l, height = b - t;
        float kk = width / 1920f;
        sky.layout(0, 0, width, height);
        place(heroLayer, 0, 0);
        place(status, width - status.getMeasuredWidth(), 0);
        place(platter, 0, Math.round(750 * kk));
        place(tiles, 0, Math.round(790 * kk));
        place(drawerLayer, 0, Math.round(470 * kk));
        sheetLayer.layout(0, 0, width, height);
        sheetLayer.setPivotX(width / 2f);
        sheetLayer.setPivotY(height / 2f);
        place(toastLayer, (width - toastLayer.getMeasuredWidth()) / 2, 0);
    }

    private static void place(View v, int x, int y) {
        v.layout(x, y, x + v.getMeasuredWidth(), y + v.getMeasuredHeight());
    }

    @Override protected void onSizeChanged(int width, int height, int oldWidth, int oldHeight) {
        w = width;
        h = height;
        k = w / 1920f;
        screen.set(0, 0, w, h);
        worldPaints = MyWorldActivity.paints(k);
        if (world != null) worldSky.setShader(MyWorldActivity.sky(world, h));
        scene.setSize(w, h);
        glow.setSize(w, h);
        makePaints();
        gridLabels = null;
        clockMinute = -1;
        updateClock();
        layoutShelf();
        layoutStatus();
        layoutDrawer();
        layoutLight();
        hero = null;
        heroFrom = null;
        updatePicks();
        motionDirty = true;
        wake();
    }

    private void makePaints() {
        labelPaint = Ui.text(Ui.medium, 25 * k, 0xC7FFFFFF);
        labelPaint.setLetterSpacing(0.1f);
        titlePaint = new TextPaint(Ui.text(Ui.displayMedium, 76 * k, 0xFFFFFFFF));
        titlePaint.setLetterSpacing(0.005f);
        metaPaint = Ui.text(Ui.medium, 29 * k, 0xD1FFFFFF);
        metaPaint.setLetterSpacing(0.014f);
        clockPaint = Ui.numbers(Ui.thin, 176 * k, 0xFFFFFFFF);
        clockPaint.setLetterSpacing(-0.01f);
        for (Paint p : new Paint[] {labelPaint, titlePaint, metaPaint, clockPaint}) p.setShadowLayer(22 * k, 0, 2 * k, 0x59000000);
        lTitle = Ui.text(Ui.displaySemibold, 76 * k, L_INK);
        lTitle.setLetterSpacing(0.004f);
        lTab = Ui.text(Ui.medium, 30 * k, L_DIM);
        lTabOn = Ui.text(Ui.semibold, 30 * k, L_INK);
        lCardTitle = Ui.text(Ui.semibold, 28 * k, L_INK);
        lCardTitle.setLetterSpacing(0.012f);
        lCardMeta = Ui.text(Ui.medium, 23 * k, L_DIM);
        lQuote = Ui.numbers(Ui.regular, 21 * k, L_FAINT);
        lTip = Ui.text(Ui.semibold, 25 * k, L_INK);
        lTip.setTextAlign(Paint.Align.CENTER);
        lClock = Ui.numbers(Ui.light, 160 * k, L_INK);
        lClock.setLetterSpacing(-0.01f);
        lInfo = Ui.text(Ui.medium, 31 * k, L_DIM);
        lInfoTime = Ui.numbers(Ui.semibold, 31 * k, L_INK);
        lKupu = Ui.text(Ui.medium, 24 * k, L_DIM);
        lKupuWord = Ui.text(Ui.semibold, 24 * k, L_INK);
        lWhen = Ui.text(Ui.semibold, 19 * k, 0xFFFFFFFF);
        lPickEmoji = Ui.text(Ui.regular, 96 * k, 0xFFFFFFFF);
        lJobKid = Ui.text(Ui.semibold, 26 * k, 0xFFFFFFFF);
        jobRing.setStyle(Paint.Style.STROKE);
        jobRing.setStrokeWidth(2.5f * k);
        jobRing.setColor(0x99FFFFFF);
        lPickEmoji.setTextAlign(Paint.Align.CENTER);
        lHead = Ui.text(Ui.displaySemibold, 32 * k, L_INK);
        lRowWhat = Ui.text(Ui.semibold, 26 * k, L_INK);
        lRowMore = Ui.text(Ui.medium, 21 * k, L_DIM);
        lBadge = Ui.text(Ui.displaySemibold, 27 * k, L_INK);
        lBadgeHome = Ui.text(Ui.medium, 20 * k, L_DIM);
        lEmoji = Ui.text(Ui.regular, 28 * k, L_INK);
        lEmoji.setTextAlign(Paint.Align.CENTER);
        lFace = Ui.text(Ui.semibold, 20 * k, 0xFFFFFFFF);
        lFace.setTextAlign(Paint.Align.CENTER);
        lClockQuote = Ui.numbers(Ui.medium, 28 * k, L_DIM);
        lTileName = Ui.text(Ui.medium, 21 * k, L_DIM);
        lTileName.setTextAlign(Paint.Align.CENTER);
        tileNames = new String[0];
        buttonPaint = Ui.text(Ui.semibold, 29 * k, INK);
        capsuleText = Ui.numbers(Ui.medium, 29 * k, 0xF2FFFFFF);
        tipPaint = Ui.text(Ui.semibold, 25 * k, 0xF2FFFFFF);
        tipPaint.setTextAlign(Paint.Align.CENTER);
        tipPaint.setShadowLayer(16 * k, 0, 1 * k, 0x99000000);
        // Quotes: a subtle detail, smaller and dimmer than the rest.
        quotePaint = Ui.numbers(Ui.regular, 21 * k, 0xB8FFFFFF);
        quotePaint.setShadowLayer(14 * k, 0, 1 * k, 0x99000000);
        staleQuote = Ui.text(Ui.medium, 21 * k, 0x99FFFFFF);
        staleQuote.setTextAlign(Paint.Align.RIGHT);
        rowTitle = Ui.text(Ui.semibold, 25 * k, 0xB3FFFFFF);
        drawerLabel = Ui.text(Ui.medium, 23 * k, 0xEBFFFFFF);
        drawerLabel.setTextAlign(Paint.Align.CENTER);
        cardTitle = Ui.text(Ui.semibold, 25 * k, 0xB3FFFFFF);
        cardText = Ui.text(Ui.medium, 29 * k, 0xF2FFFFFF);
        cardDim = Ui.numbers(Ui.medium, 23 * k, 0xADFFFFFF);
        cardDimRight = Ui.text(Ui.medium, 21 * k, 0x99FFFFFF);
        cardDimRight.setTextAlign(Paint.Align.RIGHT);
        bigTemp = Ui.numbers(Ui.light, 100 * k, 0xFFFFFFFF);
        hourPaint = Ui.numbers(Ui.medium, 22 * k, 0xADFFFFFF);
        hourPaint.setTextAlign(Paint.Align.CENTER);
        hourTemp = Ui.numbers(Ui.medium, 26 * k, 0xF2FFFFFF);
        hourTemp.setTextAlign(Paint.Align.CENTER);
        pricePaint = Ui.numbers(Ui.medium, 26 * k, 0xF2FFFFFF);
        pricePaint.setTextAlign(Paint.Align.RIGHT);
        changePaint = Ui.numbers(Ui.semibold, 21 * k, 0xFFFFFFFF);
        changePaint.setTextAlign(Paint.Align.CENTER);
        sheetTitle = Ui.text(Ui.displaySemibold, 40 * k, 0xFFFFFFFF);
        sheetTitle.setTextAlign(Paint.Align.CENTER);
        gridLabel = new TextPaint(Ui.text(Ui.medium, 24 * k, 0x99FFFFFF));
        gridLabel.setTextAlign(Paint.Align.CENTER);
        toastPaint = new TextPaint(Ui.text(Ui.medium, 26 * k, 0xF2FFFFFF));
        shadow.setMaskFilter(new BlurMaskFilter(SHADOW_BLUR * k, BlurMaskFilter.Blur.NORMAL));
        shadowSoft.setMaskFilter(new BlurMaskFilter(12 * k, BlurMaskFilter.Blur.NORMAL));
        shadowDeep.setMaskFilter(new BlurMaskFilter(DEEP_BLUR * k, BlurMaskFilter.Blur.NORMAL));
        halo.setMaskFilter(new BlurMaskFilter(22 * k, BlurMaskFilter.Blur.NORMAL));
        border.setStyle(Paint.Style.STROKE);
        border.setStrokeWidth(2 * k);
        rim.setStyle(Paint.Style.STROKE);
        rim.setStrokeWidth(2.5f * k);
    }

    // MARK: - Frames: 60 per second while something moves; nothing is redrawn when still

    @Override public void doFrame(long frameTimeNanos) {
        if (!running) return;
        float dt = lastNanos == 0 ? 1 / 60f : Math.min(0.05f, (frameTimeNanos - lastNanos) / 1e9f);
        lastNanos = frameTimeNanos;
        long up = SystemClock.uptimeMillis();

        boolean tilesMoving = step(tileFocus, dt);
        if (reorderAnim) tilesMoving |= stepReorder(dt, up);
        boolean statusMoving = step(statusFocus, dt);
        boolean heroMoving = heroFocus.step(dt);
        boolean topMoving = step(topFocus, dt), cardsMoving = step(cardFocus, dt);
        if (topMoving) status.invalidate();
        heroMoving |= topMoving | cardsMoving;
        boolean drawerItemsMoving = step(drawerFocus, dt);
        boolean gridMoving = step(gridFocus, dt) | scroll.step(dt);
        boolean drawerMoving = drawer.step(dt);
        boolean sheetMoving = sheet.step(dt);
        boolean toastFading = tickToast(up);
        boolean heroFading = tickHeroFade(up);
        boolean bgFading = tickBackgroundFade(up);
        boolean nightMoving = tickNight(up);

        if (drawerMoving || sheetMoving || motionDirty) updateMotion();
        // Opening and closing the drawer only moves the cached layers: redrawing the glass on every frame made the TV
        // drop frames (measured: ~50 ms of GPU per frame). The app tiles have no glass; the top buttons fade out as
        // they rise; the drawer is drawn resting in place; the glass shelf is redrawn once the drawer stops, so the
        // glass shows the background where it ended up.
        if (tilesMoving || tilesDirty) tiles.invalidate();
        if (statusMoving || statusDirty || bgFading) status.invalidate();
        if (heroMoving || heroDirty || heroFading) heroLayer.invalidate();
        if (drawerItemsMoving || drawerDirty || bgFading) drawerLayer.invalidate();
        if (gridMoving || gridDirty) sheetLayer.invalidate();
        if (drawerMoving || bgFading) sky.invalidate();
        if (bgFading || (drawerWasMoving && !drawerMoving)) platter.invalidate();
        drawerWasMoving = drawerMoving;
        tilesDirty = statusDirty = heroDirty = drawerDirty = gridDirty = motionDirty = false;
        if (updateClock()) {
            layoutStatus();
            status.invalidate();
            if (hero != null && hero.clock) {
                refreshHero(false);
                heroLayer.invalidate();
            }
            updateInfo();
            heroLayer.invalidate();
        }

        // Busy: something is moving, or the sheet or the drawer is open.
        boolean busy = tilesMoving || statusMoving || heroMoving || drawerItemsMoving || gridMoving || drawerMoving
                || sheetMoving || toastFading || heroFading || bgFading || nightMoving || sheetOpen || sheet.value > 0.001f
                || drawerOpen || drawer.value > 0.001f || toast != null || !toasts.isEmpty();
        idle = !busy;
        // Breathing: the sky alone, a few times a second, while nothing else is moving.
        boolean breathing = (bgTo == null && bgFadeAt == 0) || world != null;
        if (breathing && !busy && up - lastBreath >= BREATH_FRAME - 8) {
            lastBreath = up;
            sky.invalidate();
        }
        if (busy) Choreographer.getInstance().postFrameCallback(this);
        else Choreographer.getInstance().postFrameCallbackDelayed(this, breathing ? BREATH_FRAME : 1000);
    }

    private void wake() {
        if (!running || !idle) return;
        idle = false;
        lastNanos = 0;
        Choreographer.getInstance().removeFrameCallback(this);
        Choreographer.getInstance().postFrameCallback(this);
    }

    private static boolean step(Spring[] springs, float dt) {
        boolean moving = false;
        for (Spring s : springs) moving |= s.step(dt);
        return moving;
    }

    /** Drawer and sheet: the layers' positions and opacity (without redrawing their content). */
    private void updateMotion() {
        float d = drawer.value, dc = Ui.clamp(d), s = Ui.clamp(sheet.value);
        float home = 1 - s, top = home * (1 - smoothstep(0, 0.32f, dc));
        float shift = SHIFT * k;
        float lift = -d * shift;
        show(heroLayer, top, lift);
        show(status, top, lift);
        show(platter, home, lift);
        show(tiles, home, lift);
        float da = home * smoothstep(0.1f, 0.6f, dc);
        drawerLayer.setTranslationY((1 - d) * shift);
        drawerLayer.setAlpha(da);
        drawerLayer.setVisibility(da > 0.002f ? VISIBLE : INVISIBLE);
        sheetLayer.setVisibility(s > 0.001f || sheetOpen ? VISIBLE : INVISIBLE);
        sheetLayer.setAlpha(s);
        float scale = 1.04f - 0.04f * s;
        sheetLayer.setScaleX(scale);
        sheetLayer.setScaleY(scale);
    }

    private static void show(View v, float alpha, float translationY) {
        v.setAlpha(alpha);
        v.setTranslationY(translationY);
        v.setVisibility(alpha > 0.002f ? VISIBLE : INVISIBLE);
    }

    private boolean updateClock() {
        long now = System.currentTimeMillis();
        long minute = now / 60_000;
        if (minute == clockMinute || clockPaint == null) return false;
        clockMinute = minute;
        clockText = Ui.clock(now);
        dateText = Ui.date(now);
        return true;
    }

    private void updatePalette() {
        HomeData.Weather wx = data.weather;
        Shaders.sky(scene.palette, System.currentTimeMillis(), wx.sunrise, wx.sunset);
        scene.applyPalette();
    }

    // MARK: - Recommendations: hero and background

    private Recs.Pick currentPick() {
        return picks.isEmpty() ? null : picks.get(Math.min(pickIndex, picks.size() - 1));
    }

    /** This hour's picks: the cards and the background image (called when Recs notifies and every 15 s). */
    private void updatePicks() {
        if (labelPaint == null) return;
        updateCards();
    }

    private static boolean samePicks(List<Recs.Pick> a, List<Recs.Pick> b) {
        if (a.size() != b.size()) return false;
        for (int i = 0; i < a.size(); i++) if (!Recs.key(a.get(i)).equals(Recs.key(b.get(i)))) return false;
        return true;
    }

    /**
     * Rebuilds the hero. With `animate`, a different title slides in while the previous one slides out; details that
     * arrive later (genre, runtime) just appear.
     */
    private void refreshHero(boolean animate) {
        Hero next = makeHero();
        if (next.sameText(hero) && hero.dots == next.dots && hero.dot == next.dot && hero.button == next.button) return;
        boolean other = hero != null && (hero.clock != next.clock || !hero.title.equals(next.title));
        if (animate && other) {
            heroFrom = hero;
            heroFadeAt = SystemClock.uptimeMillis();
        }
        boolean layoutChanged = hero == null || hero.clock != next.clock;
        hero = next;
        heroDirty = true;
        if (layoutChanged) layoutStatus();
    }

    private Hero makeHero() {
        Hero h = new Hero();
        Recs.Pick p = currentPick();
        if (p == null) {
            h.clock = true;
            h.label = Ui.date(System.currentTimeMillis()).toUpperCase(Ui.locale());
            return h;
        }
        h.label = Recs.periodLabel();
        h.title = p.title == null ? "" : p.title;
        h.meta = p.meta == null ? "" : p.meta;
        h.button = p.pkg != null;
        h.dots = picks.size();
        h.dot = pickIndex;
        h.titleLayout = StaticLayout.Builder.obtain(h.title, 0, h.title.length(), titlePaint, Math.max(1, Math.round(HERO_TITLE_W * k)))
                .setMaxLines(2)
                .setEllipsize(TextUtils.TruncateAt.END)
                .setLineSpacing(0, 0.94f)
                .setIncludePad(false)
                .build();
        return h;
    }

    /** ←/→ on the hero: the next (or previous) of this hour's picks. */
    private boolean browse(int dir) {
        if (picks.size() < 2) return false;
        int next = pickIndex;
        for (int i = 0; i < picks.size(); i++) {
            next = (next + dir + picks.size()) % picks.size();
            if (zone != Z_HERO || picks.get(next).pkg != null) break;
        }
        if (next == pickIndex) return false;
        pickIndex = next;
        heroSlide = dir;
        refreshHero(true);
        Backdrop b = recs.backdrop(currentPick());
        if (b != null) showBackdrop(b);
        spoken.focusMoved();
        return true;
    }

    /** Swaps the background with a cross-fade (from one image to another, from the gradient to an image, or back). */
    private void showBackdrop(Backdrop b) {
        if (b == bgTo) return;
        long up = SystemClock.uptimeMillis();
        // In the middle of another swap, start from whichever is more visible.
        if (bgFadeAt == 0 || fadeEase(bgFadeAt, up) >= 0.5f) bgFrom = bgTo;
        bgTo = b;
        bgFadeAt = up;
        nightPair = false;
        if (b == null || glassOf(b) == null) return;
        if (bgFrom == null || glassOf(bgFrom) == null) {
            scene.setFrost(frostOf(b));
            scene.setGlassImage(glassOf(b));
        } else {
            scene.setGlassImages(glassOf(bgFrom), glassOf(b));
        }
    }

    /** What the glass shows: the photo lightened (by day), darkened (at night) or blended in between. */
    private int[] glassOf(Backdrop b) {
        if (b.nightGlass == null || night <= 0.001f) return b.lightGlass;
        if (night >= 0.999f) return b.nightGlass;
        // During the transition, the blend (only for the current background; a photo fading in uses the nearer side).
        if (b != bgTo) return night < 0.5f ? b.lightGlass : b.nightGlass;
        for (int i = 0; i < glassNight.length; i++) glassNight[i] = mix(b.lightGlass[i], b.nightGlass[i], night);
        return glassNight;
    }

    /** No photo: the glass reads the background's own gray (not Scene's default aurora, which isn't on screen). */
    private void neutralGlass() {
        int color = blend(0xFFEBE3FA, 0xFF1E1A3A, night);     // Glow's lilac and plum, as the glass would see them
        java.util.Arrays.fill(neutralFrostPx, color);
        java.util.Arrays.fill(neutralGlassPx, color);
        scene.setFrost(neutralFrostPx);
        scene.setGlassImage(neutralGlassPx);
        nightPair = false;
    }

    /** What the frosted glass shows (drawer, toasts): the blurred photo, darkened at night. */
    private int[] frostOf(Backdrop b) {
        if (b.nightFrost == null || night <= 0.001f) return b.frost;
        if (night >= 0.999f) return b.nightFrost;
        if (b != bgTo) return night < 0.5f ? b.frost : b.nightFrost;
        for (int i = 0; i < frostNight.length; i++) frostNight[i] = mix(b.frost[i], b.nightFrost[i], night);
        return frostNight;
    }

    // MARK: - Night look

    /** Day or night right now (from the sun at your location); `animate`: with the transition. */
    private void checkNight(boolean animate) {
        boolean want = data.isNight(System.currentTimeMillis());
        if (want != nightTarget) {
            nightTarget = want;
            // The moon button comes at night and goes in the morning.
            makeLightButtons();
            layoutLight();
            int top = tabCount() + lightButtons.size();
            if (zone == Z_TOP && topIndex >= top) topIndex = Math.max(0, top - 1);
        }
        want = want || world != null;
        if (want == darkTarget) return;
        darkTarget = want;
        if (animate && running) {
            nightFrom = night;
            nightAt = SystemClock.uptimeMillis();
        } else {
            night = want ? 1 : 0;
            nightAt = 0;
            nightChanged();
        }
    }

    /** Advances the day ⇄ night transition; true while it runs. */
    private boolean tickNight(long up) {
        if (nightAt == 0) return false;
        float t = Ui.clamp((up - nightAt) / NIGHT_MS), to = darkTarget ? 1 : 0;
        night = nightFrom + (to - nightFrom) * t * t * (3 - 2 * t);
        if (t >= 1) {
            night = to;
            nightAt = 0;
        }
        nightChanged();
        return true;
    }

    /** Redraws for the current night value (the glass now reads the lightened, blended or darkened photo). */
    private void nightChanged() {
        if (bgFadeAt == 0 && bgTo != null && bgTo.lightGlass != null) {
            scene.setFrost(frostOf(bgTo));
            if (nightAt != 0 && bgTo.nightGlass != null) {
                if (!nightPair) {
                    scene.setGlassImages(bgTo.lightGlass, bgTo.nightGlass);
                    nightPair = true;
                }
                scene.setGlassMix(night);
            } else {
                scene.setGlassImage(glassOf(bgTo));
                nightPair = false;
            }
        } else if (bgFadeAt == 0 && bgTo == null) {
            neutralGlass();
        }
        heroDirty = statusDirty = tilesDirty = drawerDirty = true;
        sky.invalidate();
        platter.invalidate();
    }

    /** How dark it is: 0 = day, 1 = night (in between during the transition). */
    private float dark() {
        return night;
    }

    /** The day color or the night color, depending on the night value (blended during the transition). */
    private int tone(int onLight, int onDark) {
        return blend(onLight, onDark, dark());
    }

    private float tone(float onLight, float onDark) {
        return onLight + (onDark - onLight) * dark();
    }

    /** Text colors for the current night value (dark by day, white at night). */
    private void applyTone() {
        lTitle.setColor(tone(L_INK, WHITE));
        lTab.setColor(tone(L_DIM, 0xFF8E8E93));
        lTabOn.setColor(tone(L_INK, WHITE));
        lCardTitle.setColor(tone(L_INK, WHITE));
        lCardMeta.setColor(tone(L_DIM, 0xFF98989D));
        lQuote.setColor(tone(L_FAINT, 0xB8FFFFFF));
        lTip.setColor(tone(L_INK, WHITE));
        lClock.setColor(tone(L_INK, WHITE));
        lInfo.setColor(tone(L_DIM, 0xC7F7F6F2));
        lInfoTime.setColor(tone(L_INK, WHITE));
        lKupu.setColor(tone(L_DIM, 0xB8F7F6F2));
        lKupuWord.setColor(tone(L_INK, WHITE));
        lHead.setColor(tone(L_INK, WHITE));
        lRowWhat.setColor(tone(L_INK, WHITE));
        lRowMore.setColor(tone(L_DIM, 0x9EF7F6F2));
        lBadge.setColor(tone(L_INK, WHITE));
        lBadgeHome.setColor(tone(L_DIM, 0x9EF7F6F2));
        lEmoji.setColor(tone(L_INK, WHITE));
        lClockQuote.setColor(tone(L_DIM, 0xFF98989D));
        staleQuote.setColor(tone(L_FAINT, 0x99FFFFFF));
    }

    private boolean tickBackgroundFade(long up) {
        if (bgFadeAt == 0) return false;
        float e = fadeEase(bgFadeAt, up);
        if (bgTo != null && bgFrom != null && glassOf(bgFrom) != null && glassOf(bgTo) != null) {
            if (drawerLayer.getVisibility() == VISIBLE || toast != null) {
                int[] from = frostOf(bgFrom), to = frostOf(bgTo);
                for (int i = 0; i < frostMix.length; i++) frostMix[i] = mix(from[i], to[i], e);
                scene.setFrost(frostMix);
            }
            scene.setGlassMix(e);
        }
        if (e >= 1) {
            bgFadeAt = 0;
            bgFrom = null;
            if (bgTo == null) {
                neutralGlass();
            } else {
                scene.setFrost(frostOf(bgTo));
                if (glassOf(bgTo) != null) scene.setGlassImage(glassOf(bgTo));
            }
        }
        return true;
    }

    private boolean tickHeroFade(long up) {
        if (heroFadeAt == 0) return false;
        if (fadeEase(heroFadeAt, up) >= 1) {
            heroFadeAt = 0;
            heroFrom = null;
        }
        return true;
    }

    private float fadeEase(long start, long up) {
        return fadeEase(start, up, FADE_MS);
    }

    private static float fadeEase(long start, long up, float duration) {
        float t = Ui.clamp((up - start) / duration);
        return t * t * (3 - 2 * t);
    }

    private static int mix(int a, int b, float f) {
        int r = Math.round(((a >> 16) & 255) * (1 - f) + ((b >> 16) & 255) * f);
        int g = Math.round(((a >> 8) & 255) * (1 - f) + ((b >> 8) & 255) * f);
        int bl = Math.round((a & 255) * (1 - f) + (b & 255) * f);
        return 0xFF000000 | (r << 16) | (g << 8) | bl;
    }

    // MARK: - Background

    private void drawSky(Canvas c) {
        drawLightSky(c);
    }

    /** Blends a color on top (the drawer's veil) as part of drawing the image, without another layer. */
    private android.graphics.ColorFilter veil(float amount, int color) {
        if (amount <= 0.002f) return null;
        amount = Math.round(amount * 255) / 255f;
        if (amount == veilAmount && color == veilColor) return veilFilter;
        veilAmount = amount;
        veilColor = color;
        float keep = 1 - amount;
        return veilFilter = new android.graphics.ColorMatrixColorFilter(new float[] {
            keep, 0, 0, 0, ((color >> 16) & 255) * amount,
            0, keep, 0, 0, ((color >> 8) & 255) * amount,
            0, 0, keep, 0, (color & 255) * amount,
            0, 0, 0, 1, 0});
    }

    private void drawImage(Canvas c, Bitmap image, float alpha) {
        if (image == null || alpha <= 0.004f) return;
        imagePaint.setAlpha(Math.round(255 * Math.min(1, alpha)));
        c.drawBitmap(image, null, screen, imagePaint);
    }

    // MARK: - Hero

    private static void text(Canvas c, String s, float x, float y, Paint p, int color, float alpha) {
        if (s == null || s.isEmpty()) return;
        p.setColor(Ui.alpha(color, alpha));
        c.drawText(s, x, y, p);
    }

    // MARK: - Corner capsule: time and weather (when the hero shows a recommendation) and icon-only buttons

    /** Live TV, the inputs with a device on, All Apps and Settings. */
    private static List<HomeApps.Item> statusList(Context c) {
        List<HomeApps.Item> list = new ArrayList<>();
        list.addAll(HomeApps.shortcuts(c));
        list.add(HomeApps.settings());
        return list;
    }

    private void setStatusItems(List<HomeApps.Item> list) {
        boolean same = list.size() == statusItems.size();
        for (int i = 0; same && i < list.size(); i++) same = list.get(i).key.equals(statusItems.get(i).key);
        String focusedKey = statusIndex < statusItems.size() ? statusItems.get(statusIndex).key : null;
        statusItems = list;
        if (!same || statusFocus.length != list.size()) {
            statusFocus = new Spring[list.size()];
            statusRects = new RectF[list.size()];
            int index = Math.min(statusIndex, Math.max(0, list.size() - 1));
            for (int i = 0; i < statusFocus.length; i++) {
                statusFocus[i] = new Spring(0.26f, 0.85f, 0);
                statusRects[i] = new RectF();
                if (list.get(i).key.equals(focusedKey)) index = i;   // a device came on: keep focus on the same button
            }
            statusIndex = index;
            if (zone == Z_STATUS && list.isEmpty()) zone = Z_SHELF;
            aim(statusFocus, zone == Z_STATUS ? statusIndex : -1, true);   // only the capsule's springs
            statusDirty = true;
        }
        layoutStatus();
    }

    private boolean showInfo() {
        return hero != null && !hero.clock;
    }

    private void layoutStatus() {
        if (capsuleText == null) return;
        int n = statusItems.size();
        float b = BUTTON * k, gap = 4 * k, pad = 6 * k;
        float info = 0;
        if (showInfo()) {
            info = 26 * k + capsuleText.measureText(clockText);
            HomeData.Weather wx = data.weather;
            if (!Double.isNaN(wx.temp) && Prefs.weather()) {
                info += 22 * k + Symbols.width(getContext(), Symbols.weather(wx.code, wx.isDay), 24 * k) + 8 * k
                        + capsuleText.measureText(HomeData.degrees(wx.temp));
            }
            info += 22 * k;
        }
        capsuleInfoW = info;
        float buttons = n * b + Math.max(0, n - 1) * gap;
        float right = CONTENT_R * k, top = CAPSULE_TOP * k;
        float left = right - pad - buttons - (info > 0 ? info + 12 * k : pad);
        capsuleRect.set(left, top, right, top + CAPSULE_H * k);
        float x = right - pad - buttons, cy = capsuleRect.centerY();
        for (int i = 0; i < n; i++) {
            statusRects[i].set(x, cy - b / 2, x + b, cy + b / 2);
            x += b + gap;
        }
        statusDirty = true;
    }

    // MARK: - Quotes and shelf

    private void setShelf(List<HomeApps.Item> list) {
        wake();
        cancelReorder(true);    // the list changed under the move (an app installed or removed)
        tileShaders = new LinearGradient[0];
        boolean same = list.size() == shelf.size();
        for (int i = 0; same && i < list.size(); i++) same = list.get(i).key.equals(shelf.get(i).key);
        shelf = list;
        if (!same || tileFocus.length != list.size()) {
            tileFocus = new Spring[list.size()];
            tileSlide = new Spring[list.size()];
            tileRects = new RectF[list.size()];
            for (int i = 0; i < tileFocus.length; i++) {
                tileFocus[i] = new Spring(0.34f, 0.74f, 0);
                tileSlide[i] = new Spring(0.32f, 0.86f, 0);
                tileRects[i] = new RectF();
            }
            shelfIndex = Math.min(shelfIndex, Math.max(0, list.size() - 1));
            retarget(true);
            layoutShelf();
        }
        tilesDirty = true;
        platter.invalidate();
    }

    private void layoutShelf() {
        int n = shelf.size();
        float pad = SHELF_PAD * k, gap = TILE_GAP * k;
        float full = (CONTENT_R - MARGIN) * k;
        // Square icons with the name under each, like an iPad. The glass keeps its bottom edge.
        float tw = Math.min(L_TILE_SIDE * k, (full - Math.max(0, n - 1) * gap) / Math.max(1, n));
        float th = tw;
        float width = n * tw + Math.max(0, n - 1) * gap, left = (w - width) / 2f;
        float bottom = L_PLATTER_BOTTOM * k, top = bottom - th - L_TILE_NAME * k - 2 * pad;
        platterRect.set(left - pad, top, left + width + pad, bottom);
        float x = left, y = top + pad;
        for (int i = 0; i < n; i++) {
            tileRects[i].set(x, y, x + tw, y + th);
            x += tw + gap;
        }
        crispLogos.clear();
        tileNames = new String[0];
    }

    /** Shelf layer: the glass bar and its shadow (it only changes with the background). */
    private void drawPlatter(Canvas c) {
        if (shelf.isEmpty()) return;
        float radius = (TILE_RADIUS + SHELF_PAD) * k;
        tmp.set(platterRect);
        tmp.offset(0, 18 * k);
        shadow.setColor(tone(0x1F000000, 0x52000000));
        shadows.draw(c, tmp, radius, SHADOW_BLUR * k, shadow);
        // White glass by day; smoked glass at night.
        scene.liquid(c, platterRect, radius, tone(0xFFFFFFFF, SMOKE), tone(0.42f, 0.12f), tone(0.03f, 0.08f),
                tone(30, 34) * k, tone(22, 28) * k, tone(0.65f, 0.95f), 1);
    }

    /** The quotes row's text and sizes, for one set of coins, prices and text size. */
    private final class Quotes {
        final int[] coins;
        final double[] prices;
        final float size, cap, halfCap;
        final String[] values;
        final float[] glyphs, widths;

        Quotes(int[] coins, double[] all, Paint text) {
            this.coins = coins;
            size = text.getTextSize();
            cap = Ui.cap(text);
            halfCap = Ui.halfCap(text);
            int n = coins.length;
            prices = new double[n];
            values = new String[n];
            glyphs = new float[n];
            widths = new float[n];
            for (int i = 0; i < n; i++) {
                prices[i] = all[coins[i]];
                values[i] = HomeData.compact(prices[i]);
                glyphs[i] = Glyphs.width(getContext(), HomeData.COINS[coins[i]], cap);
                widths[i] = text.measureText(values[i]);
            }
        }

        boolean matches(int[] now, double[] all, float textSize) {
            if (now != coins || textSize != size) return false;
            for (int i = 0; i < coins.length; i++) if (Double.compare(all[coins[i]], prices[i]) != 0) return false;
            return true;
        }
    }

    private Quotes quotes;

    // Today's te reo word, looked up once a minute and measured once a day: never worked out in the frame loop.
    private float kupuSize;
    private long kupuDay = Long.MIN_VALUE, kupuChecked;
    private String kupuLanguage = "";

    private void kupuFor() {
        long now = System.currentTimeMillis();
        if (kupuDay != Long.MIN_VALUE && now - kupuChecked < 60_000L && lKupu.getTextSize() == kupuSize
                && Ui.language.equals(kupuLanguage)) return;
        kupuChecked = now;
        long day = Kupu.day(now);
        if (day == kupuDay && lKupu.getTextSize() == kupuSize && Ui.language.equals(kupuLanguage)) return;
        kupuDay = day;
        kupuSize = lKupu.getTextSize();
        kupuLanguage = Ui.language;
        String[] w = Kupu.today(now);
        kupuWord = w[0];
        kupuRest = w[1] + " · " + Ui.tr("palavra do dia em te reo", "te reo word of the day", "palabra del día en te reo");
        kupuWordW = lKupuWord.measureText(kupuWord);
        kupuRestW = lKupu.measureText(kupuRest);
    }

    /** The te reo word of the day in its own chip under the info line: the kupu in bold, then what it means. */
    private void drawKupu(Canvas c) {
        if (!Prefs.kupu()) return;
        kupuFor();
        float pad = 24 * k, gap = 12 * k, left = (MARGIN - 4) * k, top = L_KUPU_TOP * k, hh = L_KUPU_H * k;
        cell.set(left, top, left + pad + kupuWordW + gap + kupuRestW + pad, top + hh);
        fill.setShader(null);
        fill.setColor(Ui.alpha(0xFFFFFFFF, tone(0.55f, 0.07f)));
        c.drawRoundRect(cell, hh / 2, hh / 2, fill);
        border.setColor(Ui.alpha(0xFFFFFFFF, tone(0.7f, 0.12f)));
        c.drawRoundRect(cell, hh / 2, hh / 2, border);
        float base = cell.centerY() + Ui.halfCap(lKupu);
        c.drawText(kupuWord, cell.left + pad, base, lKupuWord);
        c.drawText(kupuRest, cell.left + pad + kupuWordW + gap, base, lKupu);
    }

    /** The time (when the screens are up), the date and the weather outside, on one line under the greeting. */
    private void updateInfo() {
        if (lInfo == null) return;
        long now = System.currentTimeMillis();
        String date = Ui.date(now);
        if (!date.isEmpty()) date = date.substring(0, 1).toUpperCase(Ui.locale()) + date.substring(1);
        StringBuilder rest = new StringBuilder();
        infoTime = tabCount() > 0 ? Ui.clock(now) : "";
        if (!infoTime.isEmpty()) rest.append("  ·  ");
        rest.append(date);
        HomeData.Weather wx = data.weather;
        if (Prefs.weather() && !Double.isNaN(wx.temp)) {
            String city = Prefs.city();
            rest.append("  ·  ");
            if (!city.isEmpty()) rest.append(city).append(' ');
            rest.append(HomeData.degrees(wx.temp)).append(", ").append(condition(wx));
        }
        infoRest = rest.toString();
        infoTimeW = lInfoTime.measureText(infoTime);
    }

    /** The weather in words, lower case in English as it reads mid-sentence. */
    private static String condition(HomeData.Weather wx) {
        String text = HomeData.condition(wx.code, wx.isDay);
        return Ui.en ? text.toLowerCase(Locale.ENGLISH) : text;
    }

    private void drawInfo(Canvas c) {
        float x = MARGIN * k, base = L_INFO_BASE * k;
        if (!infoTime.isEmpty()) c.drawText(infoTime, x, base, lInfoTime);
        c.drawText(infoRest, x + infoTimeW, base, lInfo);
    }

    /** Coin logo + price in the configured currency: on the tab row, left of Tonight at home; under the clock without tabs. */
    private void drawQuotes(Canvas c) {
        boolean clock = tabCount() == 0;
        float right = tonightOn ? (L_TONIGHT_X - 40) * k : platterRect.isEmpty() ? CONTENT_R * k : platterRect.right - SHELF_PAD * k;
        applyTone();
        Paint text = clock ? lClockQuote : lQuote;
        int n = HomeData.coinCount();
        if (n == 0) return;
        // Measured once per set of prices: this row is redrawn on every frame of the cards' focus animation, and
        // measuring text there cost ~3 ms a frame on a Mi Box 3.
        int[] coins = HomeData.active();
        Quotes q = quotes;
        if (q == null || !q.matches(coins, data.prices, text.getTextSize())) {
            q = quotes = new Quotes(coins, data.prices, text);
        }
        float base = clock ? L_QUOTES_BASE * k : (L_TABBAR_TOP + L_TABBAR_H / 2) * k + q.halfCap;
        float cap = q.cap, gap = (clock ? 8 : 6) * k, spacing = (clock ? 32 : 24) * k;
        float total = spacing * (n - 1);
        for (int i = 0; i < n; i++) total += q.glyphs[i] + gap + q.widths[i];
        float x = clock ? MARGIN * k : right - total;
        int coinColor = clock ? text.getColor() : tone(0xB38E8E93, 0x8CFFFFFF);
        for (int i = 0; i < n; i++) {
            Glyphs.coin(getContext(), c, HomeData.COINS[coins[i]], x + q.glyphs[i] / 2, base - cap / 2, cap, coinColor);
            x += q.glyphs[i] + gap;
            c.drawText(q.values[i], x, base, text);
            x += q.widths[i] + spacing;
        }
        String stale = HomeData.staleness(data.pricesAt, 5 * 60_000L);
        if (stale.isEmpty()) return;
        if (clock) c.drawText(stale, x - spacing + 24 * k + staleQuote.measureText(stale), base, staleQuote);
        else c.drawText(stale, right - total - 24 * k, base, staleQuote);
    }

    private void drawTiles(Canvas c) {
        // The focused one last: it grows over its neighbors without being covered by them.
        int top = -1;
        float most = 0.02f;
        for (int i = 0; i < shelf.size(); i++) {
            if (tileFocus[i].value > most) {
                most = tileFocus[i].value;
                top = i;
            }
        }
        if (liftIndex >= 0 && liftIndex < shelf.size() && moveLift.value > 0.02f) top = liftIndex;
        for (int pass = 0; pass < 2; pass++) {
            for (int i = 0; i < shelf.size(); i++) {
                if ((pass == 0) == (i == top)) continue;
                // Moving apps: the tile slides from where it was and the lifted one wiggles (only then: no extra work
                // otherwise).
                float dx = i < tileSlide.length ? tileSlide[i].value : 0;
                float angle = i == liftIndex ? wiggle * moveLift.value : 0;
                if (dx == 0 && angle == 0) {
                    drawShelfTile(c, i);
                    continue;
                }
                c.save();
                c.translate(dx, 0);
                c.rotate(angle, tileRects[i].centerX(), tileRects[i].centerY());
                drawShelfTile(c, i);
                c.restore();
            }
        }
    }

    /**
     * App icon like the ones in the tvOS 27 Dock: the brand color edge to edge (a soft gradient) with the logo.
     * Focused: it grows 20% from the center, with a deep shadow (it "rises" toward the viewer) and a subtle glow at the
     * top. No border and no reflection, as Apple does it.
     */
    private void drawShelfTile(Canvas c, int i) {
        HomeApps.Item it = shelf.get(i);
        // Lifted to be moved: a little bigger than focused, with a deeper shadow.
        float l = i == liftIndex ? Math.max(0, moveLift.value) : 0;
        float f = tileFocus[i].value, fc = Ui.clamp(f), s = 1 + FOCUS_GROW * f + LIFT_GROW * l;
        RectF base = tileRects[i];
        float bw = base.width(), bh = base.height(), r0 = TILE_RADIUS * k;
        float cx = base.centerX(), cy = base.centerY();
        cell.set(cx - bw * s / 2, cy - bh * s / 2, cx + bw * s / 2, cy + bh * s / 2);
        float r = r0 * s;
        // Shadow at the resting icon size, enlarged by the transform (so the blur stays cached): short at rest, deep
        // and lower when focused.
        c.save();
        c.translate(cx, cy);
        c.scale(s, s);
        tmp.set(-bw / 2, -bh / 2, bw / 2, bh / 2);
        tmp.offset(0, (4 + 14 * f + 6 * l) * k);
        shadowDeep.setColor(Ui.alpha(0xFF000000, tone(0.14f, 0.3f) + tone(0.18f, 0.3f) * fc + 0.14f * Ui.clamp(l)));
        shadows.draw(c, tmp, r0, DEEP_BLUR * k, shadowDeep);
        c.restore();
        int[] style = TILE_STYLE.get(it.key);
        if (it.logo != null && style != null) {
            if (tileShaders.length != shelf.size() || tileShaderH != bh) {
                tileShaders = new LinearGradient[shelf.size()];
                tileShaderH = bh;
                tileGlow = new LinearGradient(0, -bh / 2, 0, 0, 0x14FFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP);
            }
            if (tileShaders[i] == null) {
                tileShaders[i] = new LinearGradient(0, -bh / 2, 0, bh / 2, style[0], style[1], Shader.TileMode.CLAMP);
            }
            c.save();
            c.translate(cx, cy);
            c.scale(s, s);
            tmp.set(-bw / 2, -bh / 2, bw / 2, bh / 2);
            tileFill.setShader(tileShaders[i]);
            tileFill.setAlpha(255);
            c.drawRoundRect(tmp, r0, r0, tileFill);
            if (fc > 0.01f) {
                tileFill.setShader(tileGlow);
                tileFill.setAlpha(Math.round(255 * fc));
                c.drawRoundRect(tmp, r0, r0, tileFill);
                tileFill.setAlpha(255);
            }
            tileFill.setShader(null);
            c.restore();
            drawLogo(c, it, cell, s, style[2]);
        } else if (it.logo != null) {
            tileFill.setShader(null);
            tileFill.setColor(0xFF161618);
            c.drawRoundRect(cell, r, r, tileFill);
            drawLogo(c, it, cell, s, 0);
        } else if (it.tile != null) {
            // The app's own TV banner is 16:9: on a dark square, full width, so it is never stretched.
            tileFill.setShader(null);
            tileFill.setColor(0xFF161618);
            c.drawRoundRect(cell, r, r, tileFill);
            float bh2 = cell.width() * 9f / 16 / 2;
            banner.set(cell.left, cell.centerY() - bh2, cell.right, cell.centerY() + bh2);
            roundImage(c, it.tile, banner, r * 0.4f);
        }
        drawTileName(c, i, cell.bottom, fc);
    }

    /** The app's name under its icon, like an iPad: soft at rest, full ink when focused (it moves down as it grows). */
    private void drawTileName(Canvas c, int i, float iconBottom, float focus) {
        if (lTileName == null) return;
        if (tileNames.length != shelf.size()) {
            tileNames = new String[shelf.size()];
            float room = tileRects.length > 0 ? tileRects[0].width() + TILE_GAP * k * 0.8f : 100;
            for (int j = 0; j < shelf.size(); j++) {
                String name = shelf.get(j).label == null ? "" : shelf.get(j).label;
                tileNames[j] = android.text.TextUtils.ellipsize(name, new TextPaint(lTileName), room,
                        android.text.TextUtils.TruncateAt.END).toString();
            }
        }
        lTileName.setColor(blend(tone(L_DIM, 0xB8FFFFFF), tone(L_INK, WHITE), focus));
        c.drawText(tileNames[i], tileRects[i].centerX(), iconBottom + 28 * k, lTileName);
    }

    /**
     * `image` stretched over `cell`, with corners of radius `r`. Android 12+ clips to the rounded shape; on Android 9 to
     * 11 that anti-aliased clip costs the GPU a mask on every frame of a focus animation (measured on a Mi Box 3: most of
     * a 49 ms frame), so there the image is the shader of a rounded rectangle instead, which looks the same.
     */
    private void roundImage(Canvas c, Bitmap image, RectF cell, float r) {
        if (!Ui.LEGACY) {
            clip.reset();
            clip.addRoundRect(cell, r, r, Path.Direction.CW);
            c.save();
            c.clipPath(clip);
            c.drawBitmap(image, null, cell, bitmapPaint);
            c.restore();
            return;
        }
        BitmapShader shader = imageShaders.get(image);
        if (shader == null) {
            shader = new BitmapShader(image, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
            imageShaders.put(image, shader);
        }
        imageMatrix.setScale(cell.width() / image.getWidth(), cell.height() / image.getHeight());
        imageMatrix.postTranslate(cell.left, cell.top);
        shader.setLocalMatrix(imageMatrix);
        imageFill.setShader(shader);
        c.drawRoundRect(cell, r, r, imageFill);
        imageFill.setShader(null);
    }

    /**
     * Logo at its "optical" size (all with the same amount of ink, plus each one's own adjustment, never past 80% × 62%
     * of the tile), centered and already filtered down to the focused tile size and to the resting one: focused or at
     * rest it is drawn pixel for pixel, without resampling (on a 720p UI, shrinking at draw time made it look jagged).
     */
    private void drawLogo(Canvas c, HomeApps.Item it, RectF box, float s, int mode) {
        boolean rest = s < 1 + FOCUS_GROW / 2;
        Bitmap logo = crispLogo(it, mode == 2 && it.logoDark != null, rest);
        if (logo == null) return;
        float scale = rest ? s : s / (1 + FOCUS_GROW);
        float dw = logo.getWidth() * scale, dh = logo.getHeight() * scale;
        float left = box.centerX() - dw / 2, top = box.centerY() - dh / 2;
        if (rest ? Math.abs(scale - 1) < 0.002f : scale > 0.998f) {
            left = Math.round(left);
            top = Math.round(top);
        }
        tmp.set(left, top, left + dw, top + dh);
        bitmapPaint.setColorFilter(mode == 1 ? whiteLogo : null);
        c.drawBitmap(logo, null, tmp, bitmapPaint);
        bitmapPaint.setColorFilter(null);
    }

    private Bitmap crispLogo(HomeApps.Item it, boolean dark, boolean rest) {
        Bitmap src = dark ? it.logoDark : it.logo;
        if (tileRects.length == 0) return src;
        String key = it.key + "@" + System.identityHashCode(src) + "@" + Math.round(tileRects[0].width()) + (rest ? "@rest" : "");
        Bitmap cached = crispLogos.get(key);
        if (cached != null) return cached;
        float bw = tileRects[0].width() * (1 + FOCUS_GROW), bh = tileRects[0].height() * (1 + FOCUS_GROW);
        float lw = src.getWidth(), lh = src.getHeight();
        float scale = (float) Math.sqrt(bw * bh * 0.1f / (lw * lh * Math.max(0.08f, it.logoInk))) * it.logoScale;
        scale = Math.min(scale, Math.min(bw * 0.76f / lw, bh * 0.58f / lh));
        if (rest) scale /= 1 + FOCUS_GROW;
        Bitmap out = downscale(src, Math.round(lw * scale), Math.round(lh * scale));
        crispLogos.put(key, out);
        return out;
    }

    /** Halves the size while it can (a 2×2 average, no aliasing), then finishes at the exact size. */
    private static Bitmap downscale(Bitmap src, int w, int h) {
        w = Math.max(1, w);
        h = Math.max(1, h);
        Bitmap b = src;
        while (b.getWidth() / 2 >= w && b.getHeight() / 2 >= h) {
            Bitmap half = Bitmap.createScaledBitmap(b, b.getWidth() / 2, b.getHeight() / 2, true);
            if (b != src) b.recycle();
            b = half;
        }
        Bitmap out = Bitmap.createScaledBitmap(b, w, h, true);
        if (b != src && b != out) b.recycle();
        return out;
    }

    // MARK: - Bottom drawer

    private static List<HomeApps.Item> drawerList(Context c) {
        List<HomeApps.Item> list = HomeApps.allInputs(c);
        if (People.kid(c)) {   // kids get Live TV, not the HDMI inputs or the TV's settings
            List<HomeApps.Item> kept = new ArrayList<>();
            for (HomeApps.Item it : list) if (it.kind == HomeApps.LIVE_TV) kept.add(it);
            list = kept;
        }
        // Settings of either kind are for grown-ups: a kid switches to a grown-up first.
        for (HomeApps.Item it : HomeApps.drawerShortcuts()) if (!People.kid(c)) list.add(it);
        return list;
    }

    private void setDrawerItems(List<HomeApps.Item> list) {
        int inputs = 0;
        while (inputs < list.size() && (list.get(inputs).kind == HomeApps.INPUT || list.get(inputs).kind == HomeApps.LIVE_TV)) inputs++;
        boolean same = list.size() == drawerItems.size();
        for (int i = 0; same && i < list.size(); i++) {
            same = list.get(i).key.equals(drawerItems.get(i).key) && list.get(i).connected == drawerItems.get(i).connected;
        }
        drawerItems = list;
        drawerInputs = inputs;
        if (drawerFocus.length != list.size()) {
            drawerFocus = new Spring[list.size()];
            drawerRects = new RectF[list.size()];
            for (int i = 0; i < drawerFocus.length; i++) {
                drawerFocus[i] = new Spring(0.28f, 0.85f, 0);
                drawerRects[i] = new RectF();
            }
            drawerIndex = Math.min(drawerIndex, Math.max(0, list.size() - 1));
            retarget(true);
        }
        layoutDrawer();
        if (!same) drawerDirty = true;
    }

    private void layoutDrawer() {
        int n = drawerItems.size();
        float left = MARGIN * k, right = CONTENT_R * k;
        float gap = 18 * k, groupGap = 56 * k;
        int groups = drawerInputs > 0 && drawerInputs < n ? 2 : 1;
        float tw = Math.min(230 * k, (right - left - Math.max(0, n - groups) * gap - (groups - 1) * groupGap) / Math.max(1, n));
        float x = left, top = ROW_TOP * k;
        for (int i = 0; i < n; i++) {
            if (i == drawerInputs && i > 0) x += groupGap - gap;
            drawerRects[i].set(x, top, x + tw, top + ROW_H * k);
            x += tw + gap;
        }
        float cardsTop = CARDS_TOP * k, split = left + (right - left) * 0.585f;
        boolean wx = Prefs.weather(), qt = Prefs.quotes() && HomeData.active().length > 0;
        // A card that is off gives its room to the other one.
        weatherCard.set(left, cardsTop, qt ? split - 16 * k : right, cardsTop + CARDS_H * k);
        quotesCard.set(wx ? split + 16 * k : left, cardsTop, right, cardsTop + CARDS_H * k);
        drawerDirty = true;
    }

    private void openDrawer() {
        if (drawerItems.isEmpty()) return;
        drawerOpen = true;
        drawer.target = 1;
        zone = Z_DRAWER;
        drawerIndex = shelf.isEmpty() ? 0 : nearest(drawerRects, tileRects[shelfIndex].centerX());
        for (int i = 0; i < drawerFocus.length; i++) drawerFocus[i].snap(i == drawerIndex ? 1 : 0);
        drawerDirty = true;
    }

    private void closeDrawer() {
        drawerOpen = false;
        drawer.target = 0;
        zone = Z_SHELF;
        for (Spring f : drawerFocus) f.snap(0);   // the drawer goes away: its focus doesn't need to animate
        if (!shelf.isEmpty() && drawerIndex < drawerRects.length) shelfIndex = nearest(tileRects, drawerRects[drawerIndex].centerX());
    }

    /** Color for the drawer's text and symbols: dark by day, white at night. */
    private int drawerInk(float alpha) {
        return Ui.alpha(tone(L_INK, 0xFFFFFFFF), alpha);
    }

    /** Glass for a drawer card or button: white by day, smoked at night (both during the transition). */
    private void drawerGlass(Canvas c, RectF r, float radius, float lightTint, int shadowColor, float drop) {
        float dk = dark();
        if (dk < 0.999f) {
            tmp.set(r);
            tmp.offset(0, drop);
            shadow.setColor(Ui.alpha(shadowColor, 1 - dk));
            shadows.draw(c, tmp, radius, SHADOW_BLUR * k, shadow);
            scene.glass(c, r, radius, 0xFFFFFFFF, lightTint, 0, 0, 0.02f, 1, 1 - dk);
        }
        if (dk > 0.001f) scene.glass(c, r, radius, SMOKE, 0.4f, 0, 0, 0.02f, 1, dk);
    }

    private void drawerCard(Canvas c, RectF r) {
        drawerGlass(c, r, 30 * k, 0.72f, 0x1A000000, 10 * k);
    }

    private void drawDrawer(Canvas c) {
        if (drawerItems.isEmpty()) return;
        rowTitle.setColor(tone(L_DIM, 0xB3FFFFFF));
        cardTitle.setColor(tone(L_DIM, 0xB3FFFFFF));
        cardText.setColor(drawerInk(0.95f));
        cardDim.setColor(tone(L_DIM, 0xADFFFFFF));
        cardDimRight.setColor(tone(L_FAINT, 0x99FFFFFF));
        bigTemp.setColor(drawerInk(1));
        hourPaint.setColor(tone(L_DIM, 0xADFFFFFF));
        hourTemp.setColor(drawerInk(0.95f));
        pricePaint.setColor(drawerInk(0.95f));
        float titleBase = ROW_TITLE * k;
        if (drawerInputs > 0) c.drawText(Ui.tr("Entradas", "Inputs"), drawerRects[0].left + 4 * k, titleBase, rowTitle);
        if (drawerInputs < drawerItems.size()) c.drawText(Ui.tr("Atalhos", "Shortcuts"), drawerRects[drawerInputs].left + 4 * k, titleBase, rowTitle);
        int top = -1;
        for (int i = 0; i < drawerItems.size(); i++) if (drawerFocus[i].value > 0.02f && (top < 0 || drawerFocus[i].value > drawerFocus[top].value)) top = i;
        for (int i = 0; i < drawerItems.size(); i++) if (i != top) drawDrawerTile(c, i);
        if (top >= 0) drawDrawerTile(c, top);
        if (Prefs.weather()) drawWeatherCard(c, weatherCard);
        if (Prefs.quotes() && HomeData.active().length > 0) drawQuotesCard(c, quotesCard);
    }

    /** Square drawer button: symbol and name; an input with no device is dimmed. Focused: white, with dark text. */
    private void drawDrawerTile(Canvas c, int i) {
        HomeApps.Item it = drawerItems.get(i);
        float f = Ui.clamp(drawerFocus[i].value), s = 1 + 0.07f * f;
        RectF base = drawerRects[i];
        float cx = base.centerX(), cy = base.centerY();
        cell.set(cx - base.width() * s / 2, cy - base.height() * s / 2, cx + base.width() * s / 2, cy + base.height() * s / 2);
        float r = 20 * k * s;
        if (f > 0.01f) {
            tmp.set(cell);
            tmp.offset(0, 12 * k * f);
            shadow.setColor(Ui.alpha(0xFF000000, 0.45f * f));
            shadows.draw(c, tmp, r, SHADOW_BLUR * k, shadow);
        }
        if (f < 0.99f) drawerGlass(c, cell, r, 0.7f, 0x14000000, 6 * k);
        if (f > 0.01f) {
            fill.setShader(null);
            fill.setColor(Ui.alpha(WHITE, f));
            c.drawRoundRect(cell, r, r, fill);
        }
        boolean off = it.kind == HomeApps.INPUT && !it.connected;
        int ink = blend(tone(off ? 0xFF8E8E93 : L_INK, off ? 0x6BFFFFFF : 0xF2FFFFFF), INK, f);
        Symbols.draw(getContext(), c, it.symbol, cx, cell.top + cell.height() * 0.4f, 34 * k * s, ink);
        drawerLabel.setColor(ink);
        drawerLabel.setTextSize(23 * k * s);
        float room = cell.width() - 16 * k, wide = drawerLabel.measureText(it.label);
        // A long name ("Home Settings", an input you renamed) shrinks a little before it gets cut.
        if (wide > room) drawerLabel.setTextSize(Math.max(18 * k * s, 23 * k * s * room / wide));
        fitPaint.set(drawerLabel);
        String label = TextUtils.ellipsize(it.label, fitPaint, room, TextUtils.TruncateAt.END).toString();
        c.drawText(label, cx, cell.top + cell.height() * 0.8f, drawerLabel);
        drawerLabel.setTextSize(23 * k);
    }

    /** Weather for your location: now (large), the next 6 hours, and sunrise and sunset. */
    private void drawWeatherCard(Canvas c, RectF r) {
        drawerCard(c, r);
        if (Ui.LEGACY) weatherSnapshot.draw(c, r, drawerCardsKey(), cc -> drawWeather(cc, r));
        else drawWeather(c, r);
    }

    private void drawWeather(Canvas c, RectF r) {
        refreshDrawerText();
        float x = r.left + 34 * k;
        c.drawText(weatherTitle, x, r.top + 54 * k, cardTitle);
        HomeData.Weather wx = textWeather;
        if (Double.isNaN(wx.temp)) {
            c.drawText(Ui.tr("Sem dados do clima agora.", "No weather data right now."), x, r.top + 120 * k, cardDim);
            return;
        }
        String symbol = Symbols.weather(wx.code, wx.isDay);
        float sw = Symbols.width(getContext(), symbol, 52 * k);
        Symbols.draw(getContext(), c, symbol, x + sw / 2, r.top + 132 * k, 52 * k, drawerInk(0.95f));
        c.drawText(nowTemp, x + sw + 18 * k - Ui.leftBearing(bigTemp, nowTemp), r.top + 170 * k, bigTemp);
        c.drawText(HomeData.condition(wx.code, wx.isDay), x, r.top + 220 * k, cardText);
        c.drawText(highLow, x, r.top + 258 * k, cardDim);
        float split = r.left + 392 * k;
        fill.setShader(null);
        fill.setColor(tone(0x1A000000, 0x24FFFFFF));
        c.drawRoundRect(split - k, r.top + 34 * k, split + k, r.bottom - 34 * k, k, k, fill);
        float hx = split + 30 * k, hw = (r.right - 30 * k - hx) / 6;
        for (int i = 0; i < wx.hours.size() && i < 6; i++) {
            float hc = hx + hw * (i + 0.5f);
            c.drawText(hourText[i], hc, r.top + 96 * k, hourPaint);
            Symbols.draw(getContext(), c, Symbols.weather(wx.hourCode.get(i), wx.hourDay.get(i)), hc, r.top + 142 * k, 30 * k, drawerInk(0.9f));
            c.drawText(hourTempText[i], hc, r.top + 196 * k, hourTemp);
        }
        float sx = hx, base = r.top + 258 * k;
        if (wx.sunrise != 0) sx = sunItem(c, "sunrise", sunriseText, sx, base) + 36 * k;
        if (wx.sunset != 0) sunItem(c, "sunset", sunsetText, sx, base);
    }

    private void refreshDrawerText() {
        HomeData.Weather wx = data.weather;
        boolean settings = Prefs.version != textPrefs || !Ui.language.equals(textLanguage);
        textPrefs = Prefs.version;
        textLanguage = Ui.language;
        if (wx != textWeather || settings) {
            textWeather = wx;
            weatherTitle = Prefs.city().isEmpty() ? Ui.tr("Clima", "Weather") : Prefs.city();
            nowTemp = HomeData.degrees(wx.temp);
            highLow = Ui.ru ? "Макс. " + HomeData.degrees(wx.max) + "   Мин. " + HomeData.degrees(wx.min)
                    : Ui.en ? "H:" + HomeData.degrees(wx.max) + "   L:" + HomeData.degrees(wx.min)
                    : Ui.de ? "H:" + HomeData.degrees(wx.max) + "   T:" + HomeData.degrees(wx.min)
                    : "Máx. " + HomeData.degrees(wx.max) + "   Mín. " + HomeData.degrees(wx.min);
            for (int i = 0; i < wx.hours.size() && i < 6; i++) {
                hourText[i] = HomeData.hour(wx.hours.get(i));
                hourTempText[i] = HomeData.degrees(wx.hourTemp.get(i));
            }
            sunriseText = Ui.tr("Nascer ", "Sunrise ") + Ui.time(wx.sunrise);
            sunsetText = Ui.tr("Pôr do sol ", "Sunset ") + Ui.time(wx.sunset);
        }
        long minute = System.currentTimeMillis() / 60_000;
        if (data.pricesAt != textPricesAt || minute != textMinute || settings) {
            textPricesAt = data.pricesAt;
            textMinute = minute;
            String stale = HomeData.staleness(data.pricesAt, 5 * 60_000L);
            staleText = stale.isEmpty() ? Ui.tr("variação em 24 h", "24h change") : Ui.tr("de ", "", "de ") + stale;
            for (int i = 0; i < HomeData.COINS.length; i++) {
                priceText[i] = HomeData.brl(data.prices[i]);
                changeText[i] = HomeData.change(data.changes[i]);
            }
        }
    }

    private float sunItem(Canvas c, String symbol, String label, float x, float base) {
        float size = 22 * k, sw = Symbols.width(getContext(), symbol, size);
        Symbols.draw(getContext(), c, symbol, x + sw / 2, base - Ui.halfCap(cardDim), size, tone(L_DIM, 0xB3FFFFFF));
        c.drawText(label, x + sw + 10 * k, base, cardDim);
        return x + sw + 10 * k + cardDim.measureText(label);
    }

    /** Prices in the configured currency with the 24 h change (green/red, like Apple's Stocks app). */
    private void drawQuotesCard(Canvas c, RectF r) {
        drawerCard(c, r);
        if (Ui.LEGACY) quotesSnapshot.draw(c, r, drawerCardsKey(), cc -> drawPrices(cc, r));
        else drawPrices(c, r);
    }

    /**
     * What the drawer cards show depends on: the data, the settings, the language, day or night, and the minute (the
     * sunrise and sunset, "12 min ago").
     */
    private String drawerCardsKey() {
        return data.weatherAt + "|" + data.pricesAt + "|" + Prefs.version + "|" + Ui.language + "|"
                + Float.floatToIntBits(dark()) + "|" + System.currentTimeMillis() / 60_000;
    }

    /**
     * Android 9 to 11: a drawer card's content (its text and symbols, not its glass) kept as a bitmap. The drawer is
     * redrawn on every frame of its focus animation, and laying that text out again took ~15 ms a frame on a Mi Box 3.
     */
    private static final class Snapshot {
        private Bitmap bitmap;
        private String key = "";

        void draw(Canvas c, RectF r, String key, Consumer<Canvas> content) {
            int left = Math.round(r.left), top = Math.round(r.top);
            int w = Math.max(1, Math.round(r.right) - left), h = Math.max(1, Math.round(r.bottom) - top);
            if (bitmap == null || bitmap.getWidth() != w || bitmap.getHeight() != h) {
                bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                this.key = "";
            }
            if (!key.equals(this.key)) {
                bitmap.eraseColor(0);
                Canvas cc = new Canvas(bitmap);
                cc.translate(-left, -top);
                content.accept(cc);
                this.key = key;
            }
            c.drawBitmap(bitmap, left, top, null);
        }
    }

    private final Snapshot weatherSnapshot = new Snapshot(), quotesSnapshot = new Snapshot();

    private void drawPrices(Canvas c, RectF r) {
        float x = r.left + 34 * k, right = r.right - 34 * k;
        refreshDrawerText();
        c.drawText(Ui.tr("Cotações", "Crypto"), x, r.top + 54 * k, cardTitle);
        c.drawText(staleText, right, r.top + 54 * k, cardDimRight);
        float cap = Ui.cap(cardText);
        int[] coins = HomeData.active();
        for (int j = 0; j < coins.length; j++) {
            int i = coins[j];
            float base = r.top + (110 + 52 * j) * k, mid = base - cap / 2;
            float gw = Glyphs.width(getContext(), HomeData.COINS[i], cap);
            Glyphs.coin(getContext(), c, HomeData.COINS[i], x + 14 * k, mid, cap, tone(L_DIM, 0xCCFFFFFF));
            c.drawText(HomeData.coinName(i), x + Math.max(gw, 28 * k) / 2 + 30 * k, base, cardText);
            c.drawText(priceText[i], right - 128 * k, base, pricePaint);
            double change = data.changes[i];
            if (Double.isNaN(change)) continue;
            int color = change >= 0 ? tone(0xFF248A3D, UP_COLOR) : tone(0xFFD70015, DOWN_COLOR);
            tmp.set(right - 108 * k, mid - 17 * k, right, mid + 17 * k);
            fill.setShader(null);
            fill.setColor(Ui.alpha(color, 0.2f));
            c.drawRoundRect(tmp, 17 * k, 17 * k, fill);
            changePaint.setColor(color);
            c.drawText(changeText[i], tmp.centerX(), mid + Ui.halfCap(changePaint), changePaint);
        }
    }

    // MARK: - Focus

    /** Sets the springs' targets from the current focus (snap: no animation). */
    private void retarget(boolean snap) {
        // Only the group whose focus changed is redrawn (moving along the shelf doesn't redraw the hero or capsule).
        boolean tilesChanged = aim(tileFocus, !sheetOpen && zone == Z_SHELF ? shelfIndex : -1, snap);
        boolean statusChanged = aim(statusFocus, !sheetOpen && zone == Z_STATUS ? statusIndex : -1, snap);
        boolean drawerChanged = aim(drawerFocus, !sheetOpen && zone == Z_DRAWER ? drawerIndex : -1, snap);
        boolean heroChanged = heroFocus.target != (!sheetOpen && zone == Z_HERO ? 1 : 0);
        heroFocus.target = !sheetOpen && zone == Z_HERO ? 1 : 0;
        if (snap) heroFocus.snap(heroFocus.target);
        boolean topChanged = aim(topFocus, !sheetOpen && zone == Z_TOP ? topIndex : -1, snap);
        heroChanged |= aim(cardFocus, !sheetOpen && zone == Z_CARDS ? cardIndex : -1, snap) | topChanged;
        statusChanged |= topChanged;
        tilesDirty |= snap || tilesChanged;
        statusDirty |= snap || statusChanged;
        heroDirty |= snap || heroChanged;
        drawerDirty |= snap || drawerChanged;
        spoken.focusMoved();
    }

    /** Aims a group's springs (only `focused` at 1); returns true if any target changed. */
    private static boolean aim(Spring[] springs, int focused, boolean snap) {
        boolean changed = false;
        for (int i = 0; i < springs.length; i++) {
            float target = i == focused ? 1 : 0;
            changed |= springs[i].target != target;
            springs[i].target = target;
            if (snap) springs[i].snap(target);
        }
        return changed;
    }

    // MARK: - "All Apps" sheet

    private void setOthers(List<HomeApps.Item> list) {
        others = list;
        gridFocus = new Spring[list.size()];
        for (int i = 0; i < gridFocus.length; i++) gridFocus[i] = new Spring(0.3f, 0.82f, 0);
        gridLabels = null;
        gridIndex = Math.min(gridIndex, Math.max(0, list.size() - 1));
        retargetGrid(true);
        gridDirty = true;
    }

    private void openSheet() {
        sheetOpen = true;
        gridIndex = 0;
        scroll.snap(0);
        retargetGrid(true);
        retarget(false);
        sheet.target = 1;
        gridDirty = true;
    }

    private void closeSheet() {
        sheetOpen = false;
        sheet.target = 0;
        retarget(false);
    }

    private void retargetGrid(boolean snap) {
        for (int i = 0; i < gridFocus.length; i++) {
            gridFocus[i].target = sheetOpen && i == gridIndex ? 1 : 0;
            if (snap) gridFocus[i].snap(gridFocus[i].target);
        }
        int rows = Math.max(1, (others.size() + COLUMNS - 1) / COLUMNS);
        int visible = Math.min(rows, VISIBLE_ROWS);
        int r = gridIndex / COLUMNS;
        float target = scroll.target;
        if (r < target) target = r;
        else if (r > target + visible - 1) target = r - visible + 1;
        scroll.target = Math.max(0, Math.min(rows - visible, target));
        if (snap) scroll.snap(scroll.target);
        spoken.focusMoved();
    }

    private void drawSheet(Canvas c) {
        c.drawColor(0xA8000000);
        float shift = scroll.value * GRID_ROW * k;
        c.drawText(Ui.tr("Todos os Apps", "All Apps"), w / 2f, 124 * k - shift, sheetTitle);
        int n = others.size();
        if (gridLabels == null || gridLabels.length != n) {
            gridLabels = new String[n];
            for (int i = 0; i < n; i++) {
                gridLabels[i] = TextUtils.ellipsize(others.get(i).label, gridLabel, (GRID_W - 10) * k, TextUtils.TruncateAt.END).toString();
            }
        }
        float gridWidth = COLUMNS * GRID_W + (COLUMNS - 1) * GRID_GAP;
        float left = (1920 - gridWidth) / 2 * k;
        float gridTop = GRID_TOP * k;
        for (int i = 0; i < n; i++) {
            int r = i / COLUMNS, col = i % COLUMNS;
            float y = gridTop + r * GRID_ROW * k - shift;
            if (y > h || y + GRID_ROW * k < 0) continue;
            float x = left + col * (GRID_W + GRID_GAP) * k;
            gridCell.set(x, y, x + GRID_W * k, y + GRID_H * k);
            float f = gridFocus[i].value;
            drawCard(c, others.get(i).tile, gridCell, GRID_RADIUS * k, f, 0.08f);
            if (sheetOpen && i == gridIndex) focusedCell.set(cell);
            gridLabel.setColor(blend(0x99FFFFFF, 0xFFFFFFFF, Ui.clamp(f)));
            c.drawText(gridLabels[i], gridCell.centerX(), gridCell.bottom + (40 + 6 * f) * k, gridLabel);
        }
    }

    /** 16:9 sheet card. Focused (the shelf's subtle focus): it grows, with a shadow, a soft sheen and a thin border. */
    private void drawCard(Canvas c, Bitmap image, RectF base, float radius, float f, float grow) {
        float s = 1 + grow * f;
        float cx = base.centerX(), cy = base.centerY();
        cell.set(cx - base.width() * s / 2, cy - base.height() * s / 2, cx + base.width() * s / 2, cy + base.height() * s / 2);
        float r = radius * s;
        float fc = Ui.clamp(f);
        if (f > 0.01f) {
            tmp.set(cell);
            tmp.offset(0, 16 * k * f);
            shadow.setColor(Ui.alpha(0xFF000000, 0.55f * fc));
            shadows.draw(c, tmp, r, SHADOW_BLUR * k, shadow);
        }
        if (image != null) roundImage(c, image, cell, r);
        if (f > 0.01f) {
            float bh = base.height();
            if (cardSheen == null || cardSheenH != bh) {
                cardSheen = new LinearGradient(0, -bh / 2, 0, 0, 0x1AFFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP);
                cardSheenH = bh;
            }
            c.save();
            c.translate(cx, cy);
            c.scale(s, s);
            tmp.set(-base.width() / 2, -bh / 2, base.width() / 2, bh / 2);
            sheen.setShader(cardSheen);
            sheen.setAlpha(Math.round(255 * fc));
            c.drawRoundRect(tmp, radius, radius, sheen);
            sheen.setAlpha(255);
            c.restore();
        }
        if (fc < 0.99f) {
            veil.setColor(Ui.alpha(0xFF000000, 0.08f * (1 - fc)));
            c.drawRoundRect(cell, r, r, veil);
        }
        border.setColor(0x14FFFFFF);
        c.drawRoundRect(cell, r, r, border);
        if (f > 0.01f) {
            rim.setShader(null);
            rim.setColor(Ui.alpha(0xFFFFFFFF, 0.4f * fc));
            rim.setStrokeWidth(1.5f * k);
            c.drawRoundRect(cell, r, r, rim);
            rim.setStrokeWidth(2.5f * k);
        }
    }

    // MARK: - Toasts

    void showToast(String text) {
        toasts.add(text);
        announceForAccessibility(text);
        wake();
    }

    /** Advances the toast queue; returns true while a toast fades in or out (animation). */
    private boolean tickToast(long up) {
        if (toast != null && up - toastAt > TOAST_MS) {
            toast = null;
            toastLayer.invalidate();
        }
        if (toast == null && toastPaint != null) {
            String next = toasts.poll();
            if (next != null) {
                toast = layout(next);
                toastAt = up;
            }
        }
        if (toast == null) return false;
        long age = up - toastAt;
        boolean fading = age < 350 || age > TOAST_MS - 450;
        if (fading) toastLayer.invalidate();
        return fading;
    }

    private void drawToast(Canvas c) {
        if (toast == null) return;
        float age = (SystemClock.uptimeMillis() - toastAt) / 1000f;
        float a = Math.min(Ui.clamp(age / 0.3f), Ui.clamp((TOAST_MS / 1000f - age) / 0.4f));
        if (a <= 0) return;
        float padX = 28 * k, padY = 18 * k, icon = 30 * k, iconW = icon;
        float tw = toast.getWidth() + iconW + 16 * k, th = toast.getHeight();
        float toastTop = 64 * k - (1 - a) * 16 * k;
        tmp.set((w - tw) / 2f - padX, toastTop, (w + tw) / 2f + padX, toastTop + th + 2 * padY);
        int save = c.saveLayerAlpha(tmp.left - 4, tmp.top - 4, tmp.right + 4, tmp.bottom + 4, Math.round(255 * a));
        // Beyond's own voice: plum glass and the four dots, so a notice reads as the TV talking, not an error.
        scene.glass(c, tmp, Math.min(tmp.height() / 2, 32 * k), Glow.PLUM, 0.62f, 0, 0, 0.02f, 1);
        Breath.mark(c, markPaint, tmp.left + padX + iconW / 2, tmp.centerY(), icon, -1, 10, 1);
        c.translate(tmp.left + padX + iconW + 16 * k, tmp.top + padY);
        toast.draw(c);
        c.restoreToCount(save);
    }

    private StaticLayout layout(String text) {
        int max = Math.round(720 * k);
        int width = (int) Math.min(max, Math.ceil(Layout.getDesiredWidth(text, toastPaint)));
        return StaticLayout.Builder.obtain(text, 0, text.length(), toastPaint, Math.max(1, width))
                .setMaxLines(2)
                .setEllipsize(TextUtils.TruncateAt.END)
                .build();
    }

    /** New notices from the main process (mode switches, the check after the TV boots): those from the last 24 h. */
    private void checkNotices() {
        final Context c = getContext().getApplicationContext();
        // Beyond's answers to this TV's feedback, if it ever gave any.
        Checkin.maybeHear(c, lines -> handler.post(() -> {
            for (String t : lines) showToast("Beyond: " + t);
        }));
        LOADER.execute(() -> {
            JSONArray list = HomeMode.state(c).optJSONArray("notices");
            if (list == null) return;
            long seen = ui.getLong("seenNotice", 0), newest = seen;
            long cutoff = System.currentTimeMillis() - 24 * 3600_000L;
            final List<String> fresh = new ArrayList<>();
            for (int i = list.length() - 1; i >= 0; i--) {   // the list comes newest first
                JSONObject o = list.optJSONObject(i);
                if (o == null) continue;
                long at = o.optLong("at");
                if (at <= seen || at < cutoff) continue;
                fresh.add(o.optString("text"));
                newest = Math.max(newest, at);
            }
            if (newest > seen) ui.edit().putLong("seenNotice", newest).apply();
            if (!fresh.isEmpty()) handler.post(() -> { for (String t : fresh) showToast(t); });
        });
    }

    // MARK: - Lists (in the background, so returning to the home screen isn't delayed)

    private void reload() {
        final Context c = getContext().getApplicationContext();
        LOADER.execute(() -> {
            final List<HomeApps.Item> s = HomeApps.shelf(c, true);
            final List<HomeApps.Item> st = statusList(c);
            final List<HomeApps.Item> d = drawerList(c);
            final List<HomeApps.Item> o = HomeApps.others(c);
            handler.post(() -> {
                setShelf(s);
                setStatusItems(st);
                setDrawerItems(d);
                if (!sheetOpen) setOthers(o);
            });
        });
    }

    // MARK: - Keys: only the arrows, OK and Back (system keys pass through to the system)

    boolean onKey(KeyEvent e) {
        wake();
        boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
        if (reordering) return reorderKey(e, down);
        int code = e.getKeyCode();
        if (down && code != KeyEvent.KEYCODE_DPAD_CENTER && code != KeyEvent.KEYCODE_ENTER
                && code != KeyEvent.KEYCODE_NUMPAD_ENTER) {
            holdArmed = false;      // another key while OK is held: no move mode
            handler.removeCallbacks(holdStart);
        }
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (down) move(-1, 0);
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (down) move(1, 0);
                return true;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (down) move(0, -1);
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (down) move(0, 1);
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
                // Opens on release, and only if the press happened here: the release of an OK pressed inside another
                // app opens nothing.
                // Held on a shelf app (~0.5 s): move mode. A timer, since not every remote repeats a held key, or the
                // long-press repeat, whichever comes first; the release after a hold opens nothing.
                if (down) {
                    if (e.getRepeatCount() == 0) {
                        okDown = true;
                        okHeld = false;
                        handler.removeCallbacks(holdStart);
                        holdArmed = canReorder();
                        if (holdArmed) handler.postDelayed(holdStart, HOLD_MS);
                    } else if (okDown && holdArmed && e.isLongPress()) {
                        startReorder();
                    }
                } else {
                    holdArmed = false;
                    handler.removeCallbacks(holdStart);
                    if (okDown && !okHeld && !e.isCanceled() && spoken.keyClick()) activate();
                    okDown = okHeld = false;
                }
                return true;
            case KeyEvent.KEYCODE_BACK:
                if (down) {
                    if (e.getRepeatCount() == 0) backDown = true;
                } else {
                    if (backDown && !e.isCanceled()) back();
                    backDown = false;
                }
                return true;
            default:
                return false;
        }
    }

    private void back() {
        if (sheetOpen) {
            closeSheet();
        } else if (zone == Z_DRAWER || zone == WIDGETS) {
            closeDrawer();
            retarget(false);
        } else if (zone != Z_SHELF) {
            zone = Z_SHELF;
            retarget(false);
        } else {
            return;
        }
        click.move();
    }

    private void move(int dx, int dy) {
        if (sheetOpen) {
            moveGrid(dx, dy);
            return;
        }
        if (moveLight(dx, dy)) return;
        switch (zone) {
            case Z_SHELF:
                if (dx != 0) {
                    int next = Math.max(0, Math.min(shelf.size() - 1, shelfIndex + dx));
                    if (next == shelfIndex) return;
                    shelfIndex = next;
                } else if (dy < 0) {
                    if (hero != null && hero.button) {
                        zone = Z_HERO;
                    } else if (!statusItems.isEmpty()) {
                        zone = Z_STATUS;
                        statusIndex = shelf.isEmpty() ? 0 : nearest(statusRects, tileRects[shelfIndex].centerX());
                    } else {
                        return;
                    }
                } else {
                    if (drawerItems.isEmpty()) return;
                    openDrawer();
                }
                break;
            case Z_HERO:
                if (dx != 0) {
                    if (!browse(dx)) return;
                } else if (dy < 0) {
                    if (statusItems.isEmpty()) return;
                    zone = Z_STATUS;
                    statusIndex = 0;
                } else {
                    zone = Z_SHELF;
                }
                break;
            case Z_STATUS:
                if (dx != 0) {
                    int next = Math.max(0, Math.min(statusItems.size() - 1, statusIndex + dx));
                    if (next == statusIndex) return;
                    statusIndex = next;
                } else if (dy > 0) {
                    if (hero != null && hero.button) {
                        zone = Z_HERO;
                    } else {
                        zone = Z_SHELF;
                        if (!shelf.isEmpty()) shelfIndex = nearest(tileRects, statusRects[statusIndex].centerX());
                    }
                } else {
                    return;
                }
                break;
            case WIDGETS: {
                List<Integer> on = widgets();
                int at = on.indexOf(widgetIndex);
                if (dy < 0 || at < 0) {
                    zone = Z_DRAWER;
                } else if (dx != 0 && at + dx >= 0 && at + dx < on.size()) {
                    widgetIndex = on.get(at + dx);
                } else {
                    return;
                }
                break;
            }
            default:
                if (dx != 0) {
                    int next = Math.max(0, Math.min(drawerItems.size() - 1, drawerIndex + dx));
                    if (next == drawerIndex) return;
                    drawerIndex = next;
                } else if (dy < 0) {
                    closeDrawer();
                } else if (talkBack() && !widgets().isEmpty()) {
                    // Only with TalkBack: the widgets are there to be read, and this is how it gets to them.
                    zone = WIDGETS;
                    widgetIndex = widgets().get(0);
                } else {
                    return;
                }
                break;
        }
        retarget(false);
        click.move();
    }

    private static int nearest(RectF[] rects, float x) {
        int best = 0;
        float bestDistance = Float.MAX_VALUE;
        for (int i = 0; i < rects.length; i++) {
            float d = Math.abs(rects[i].centerX() - x);
            if (d < bestDistance) {
                bestDistance = d;
                best = i;
            }
        }
        return best;
    }

    private void moveGrid(int dx, int dy) {
        int n = others.size();
        if (n == 0) return;
        int r = gridIndex / COLUMNS, col = gridIndex % COLUMNS;
        int rows = (n + COLUMNS - 1) / COLUMNS;
        int next = gridIndex;
        if (dx != 0) {
            int candidate = gridIndex + dx;
            if (candidate >= 0 && candidate < n && candidate / COLUMNS == r) next = candidate;
        } else {
            int targetRow = r + dy;
            if (targetRow >= 0 && targetRow < rows) next = Math.min(n - 1, targetRow * COLUMNS + col);
        }
        if (next == gridIndex) return;
        gridIndex = next;
        retargetGrid(false);
        click.move();
        gridDirty = true;
    }

    private void activate() {
        wake();
        if (reordering) {   // TalkBack's click while moving an app: drop it
            dropReorder();
            return;
        }
        HomeApps.Item it;
        RectF r;
        Recs.Pick from = null;   // the screen it was opened from: remembered for Keep watching with its show
        if (!sheetOpen && zone == WIDGETS) return;   // a widget is only read
        if (sheetOpen) {
            if (others.isEmpty()) return;
            it = others.get(gridIndex);
            r = focusedCell;
        } else if (zone == Z_HERO) {
            Recs.Pick p = currentPick();
            if (p == null || p.pkg == null) return;
            it = HomeApps.app(p.pkg, Recs.serviceName(p), p.link);
            r = heroButton;
        } else if (zone == Z_STATUS) {
            if (statusItems.isEmpty()) return;
            it = statusItems.get(statusIndex);
            r = statusRects[statusIndex];
        } else if (zone == Z_DRAWER) {
            if (drawerItems.isEmpty()) return;
            it = drawerItems.get(drawerIndex);
            r = drawerRects[drawerIndex];
        } else if (zone == Z_TOP) {
            if (topIndex < tabCount()) {
                selectTab(topIndex);
                return;
            }
            it = lightButtons.get(topIndex - tabCount());
            r = topRects[topIndex];
        } else if (zone == Z_CARDS) {
            Recs.Pick p = cardIndex < cards.size() ? cards.get(cardIndex) : null;
            if (p != null && "house".equals(p.tile)) {
                RoomActivity.open(activity, p.room);
                return;
            }
            if (p != null && p.camera != null) {
                CameraActivity.open(activity, p.title, p.camera);
                return;
            }
            if (p != null && "jobs".equals(p.tile)) {
                showToast(jobsSummary(p.kids));
                return;
            }
            if (p != null && p.tile != null && p.pkg == null) {
                showToast(Ui.tr("Esse app não está nesta TV", "That app isn't on this TV", "Esa app no está en este TV"));
                return;
            }
            if (p == null || p.pkg == null) return;
            it = p.tile != null ? HomeApps.app(p.pkg, p.app, null) : HomeApps.app(p.pkg, p.watchedAt != 0 ? p.app : Recs.serviceName(p), p.link);
            if ("show".equals(p.tile)) {
                android.widget.Toast.makeText(getContext(), Ui.tr("Abrindo ", "Opening ", "Abriendo ") + p.app
                        + Ui.tr(". Procure ", ": look for ", ". Busca ") + p.title, android.widget.Toast.LENGTH_LONG).show();
            }
            r = cardRects[cardIndex];
            from = "app".equals(p.tile) ? null : p;
            if (p.emoji != null) {
                // A TV app can't be asked for one show by name: say what to look for.
                android.widget.Toast.makeText(getContext(), Ui.tr("Abrindo ", "Opening ", "Abriendo ") + Recs.serviceName(p)
                        + Ui.tr(". Procure ", ": look for ", ". Busca ") + p.title, android.widget.Toast.LENGTH_LONG).show();
            }
        } else {
            if (shelf.isEmpty()) return;
            it = shelf.get(shelfIndex);
            r = tileRects[shelfIndex];
        }
        click.open();
        if (it.kind == HomeApps.ALL_APPS) {
            openSheet();
            return;
        }
        if (it.kind == HomeApps.FEEDBACK) {
            FeedbackActivity.open(activity);
            return;
        }
        if (it.kind == HomeApps.SLEEP) {
            Context ctx = getContext();
            showToast(Sleep.set(ctx, Sleep.next(ctx)));
            return;
        }
        if (it.kind == HomeApps.PEOPLE) {
            WhoActivity.open(activity, null);
            return;
        }
        if (it.kind == HomeApps.BEDTIME) {
            BedtimeActivity.open(activity, 15);
            return;
        }
        if (it.kind == HomeApps.PARTY) {
            PartyPickActivity.open(activity);
            return;
        }
        if ((it.kind == HomeApps.SETTINGS || it.kind == HomeApps.ANDROID_SETTINGS) && People.kid(activity)) {
            // A kids' profile: the grown-up PIN first, or with no PIN, a grown-up's profile.
            WhoActivity.open(activity, it.kind == HomeApps.SETTINGS ? WhoActivity.THEN_SETTINGS : WhoActivity.THEN_TV_SETTINGS);
            return;
        }
        if (it.kind == HomeApps.INPUTS) {
            openDrawer();
            for (int i = 0; i < drawerItems.size(); i++) {
                if (drawerItems.get(i).kind == HomeApps.INPUT) {
                    drawerIndex = i;
                    break;
                }
            }
            retarget(false);
            return;
        }
        // Earn your screen: a kid with jobs left sees them instead.
        if ((it.kind == HomeApps.APP || it.kind == HomeApps.LIVE_TV) && JobsActivity.first(activity)) return;
        boolean opened = HomeApps.open(activity, it, this, Math.round(r.left), Math.round(r.top),
                Math.round(r.width()), Math.round(r.height()));
        if (!opened) {
            showToast(Ui.tr("Não deu para abrir ", "Couldn't open ") + it.label + ".");
        } else if (it.kind == HomeApps.APP) {
            // Keep watching: an app, or the show it was opened for (a pick, or one already in Keep watching).
            boolean show = from != null && (from.watchedAt == 0 || !from.meta.isEmpty());
            Watched.add(activity, it.pkg, from != null && from.watchedAt != 0 ? from.app : it.label, show ? from.title : "",
                    show ? from.backdrop : "", show ? from.link : "");
        }
    }

    // MARK: - Moving apps on the shelf

    private boolean canReorder() {
        if (sheetOpen || zone != Z_SHELF || shelfIndex >= shelf.size() || shelf.size() < 2) return false;
        if (People.kid(getContext())) return false;   // the kids' shelf is picked for them
        HomeApps.Item it = shelf.get(shelfIndex);
        return it.kind == HomeApps.APP && it.pkg != null;
    }

    private void startReorder() {
        handler.removeCallbacks(holdStart);
        holdArmed = false;
        if (reordering || !canReorder()) return;
        wake();
        reordering = reorderAnim = okHeld = true;
        reorderOrigin = new ArrayList<>(shelf);
        liftIndex = shelfIndex;
        reorderAt = SystemClock.uptimeMillis();
        moveLift.target = 1;
        click.open();
        showToast(Ui.tr("← → para mover · OK para soltar · Voltar para cancelar",
                "← → to move · OK to drop · Back to cancel"));
        retarget(false);    // TalkBack reads "Moving <app>, position i of n"
    }

    /** Keys while moving an app: nothing else on the home screen gets them (system keys still go to the system). */
    private boolean reorderKey(KeyEvent e, boolean down) {
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (down) shiftReorder(e.getKeyCode() == KeyEvent.KEYCODE_DPAD_LEFT ? -1 : 1);
                return true;
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
                // The press that lifted the app is still held: its repeats and release do nothing; a new press drops it.
                if (down && e.getRepeatCount() == 0) {
                    okDown = okHeld = false;
                    dropReorder();
                } else if (!down) {
                    okDown = okHeld = false;
                }
                return true;
            case KeyEvent.KEYCODE_BACK:
                if (down) {
                    if (e.getRepeatCount() == 0) backDown = true;
                } else {
                    if (backDown && !e.isCanceled()) {
                        cancelReorder(false);
                        click.move();
                    }
                    backDown = false;
                }
                return true;
            default:
                return false;
        }
    }

    /** Swaps the lifted app with its neighbor; both slide from where they are to their new slots. */
    private void shiftReorder(int dx) {
        int i = shelfIndex, j = i + dx;
        if (j < 0 || j >= shelf.size()) return;
        HomeApps.Item it = shelf.get(i);
        shelf.set(i, shelf.get(j));
        shelf.set(j, it);
        Spring f = tileFocus[i];
        tileFocus[i] = tileFocus[j];
        tileFocus[j] = f;
        Spring s = tileSlide[i];
        tileSlide[i] = tileSlide[j];
        tileSlide[j] = s;
        float d = tileRects[i].left - tileRects[j].left;
        tileSlide[j].value += d;
        tileSlide[i].value -= d;
        if (tileShaders.length == shelf.size()) {
            LinearGradient g = tileShaders[i];
            tileShaders[i] = tileShaders[j];
            tileShaders[j] = g;
        }
        shelfIndex = liftIndex = j;
        reorderAnim = true;
        wake();
        retarget(false);
        click.move();
    }

    /** OK: drops the app where it is and saves the shelf's new order. */
    private void dropReorder() {
        if (!reordering) return;
        reordering = false;
        moveLift.target = 0;
        boolean changed = false;
        for (int i = 0; i < shelf.size() && !changed; i++) changed = shelf.get(i) != reorderOrigin.get(i);
        reorderOrigin = null;
        click.open();
        retarget(false);
        if (!changed) return;
        final List<String> order = new ArrayList<>();
        for (HomeApps.Item it : shelf) order.add(it.pkg);
        final Context c = getContext().getApplicationContext();
        LOADER.execute(() -> {
            // The saved list may hold more than the shelf shows (apps not installed, past the limit): the shown ones
            // take their new order in the same slots, the others stay where they were.
            List<String> all = HomeApps.shelfPackages(c), out = new ArrayList<>(all);
            int next = 0;
            for (int s = 0; s < out.size() && next < order.size(); s++) {
                if (order.contains(out.get(s))) out.set(s, order.get(next++));
            }
            if (next < order.size()) {
                out = new ArrayList<>(order);
                for (String p : all) if (!order.contains(p)) out.add(p);
            }
            final List<String> save = out;
            handler.post(() -> Prefs.setShelf(save));
        });
    }

    /** Back, or leaving the home screen: the original order comes back (sliding, unless `snap`). */
    private void cancelReorder(boolean snap) {
        if (!reordering && !reorderAnim) return;
        if (reordering) {
            reordering = false;
            moveLift.target = 0;
            int n = shelf.size();
            if (reorderOrigin != null && reorderOrigin.size() == n) {
                HomeApps.Item lifted = shelf.get(shelfIndex);
                Spring[] focus = new Spring[n], slide = new Spring[n];
                LinearGradient[] shaders = tileShaders.length == n ? new LinearGradient[n] : tileShaders;
                for (int a = 0; a < n; a++) {
                    int b = shelf.indexOf(reorderOrigin.get(a));
                    focus[a] = tileFocus[b];
                    slide[a] = tileSlide[b];
                    slide[a].value += tileRects[b].left - tileRects[a].left;
                    if (shaders != tileShaders) shaders[a] = tileShaders[b];
                }
                shelf = reorderOrigin;
                tileFocus = focus;
                tileSlide = slide;
                tileShaders = shaders;
                shelfIndex = liftIndex = shelf.indexOf(lifted);
            }
            reorderOrigin = null;
            retarget(snap);
        }
        if (snap) {
            moveLift.snap(0);
            for (Spring s : tileSlide) s.snap(0);
            wiggle = 0;
            liftIndex = -1;
            reorderAnim = false;
            tilesDirty = true;
        } else {
            wake();
        }
    }

    /** One frame of the move: the slides, the lift and the wiggle. Returns true while any of them moves. */
    private boolean stepReorder(float dt, long up) {
        boolean moving = step(tileSlide, dt) | moveLift.step(dt);
        if (reordering || moveLift.value > 0.001f) {
            wiggle = WIGGLE_DEG * (float) Math.sin((up - reorderAt) * (2 * Math.PI / WIGGLE_MS));
            moving = true;
        } else {
            wiggle = 0;
        }
        reorderAnim = moving;
        return moving;
    }

    // MARK: - TalkBack: every reachable item as a virtual node (Spoken). Id = group * 1000 + index + 1.

    /** The drawer's weather (0) and quotes (1) cards: read by TalkBack, never focused by the remote. */
    private static final int GRID = 9, WIDGETS = 8;

    private static int a11yId(int group, int index) {
        return group * 1000 + index + 1;
    }

    @Override public AccessibilityNodeProvider getAccessibilityNodeProvider() {
        return spoken;
    }

    private void a11yItems(List<Integer> out) {
        if (sheetOpen) {
            for (int i = 0; i < others.size(); i++) out.add(a11yId(GRID, i));
            return;
        }
        for (int i = 0; i < tabCount() + lightButtons.size(); i++) out.add(a11yId(Z_TOP, i));
        for (int i = 0; i < Math.min(3, cards.size()); i++) out.add(a11yId(Z_CARDS, i));
        for (int i = 0; i < shelf.size(); i++) out.add(a11yId(Z_SHELF, i));
        for (int i = 0; i < drawerItems.size(); i++) out.add(a11yId(Z_DRAWER, i));
        if (drawerOpen && Prefs.weather()) out.add(a11yId(WIDGETS, 0));
        if (drawerOpen && Prefs.quotes() && HomeData.active().length > 0) out.add(a11yId(WIDGETS, 1));
    }

    private String a11yText(int id) {
        int group = (id - 1) / 1000, i = (id - 1) % 1000;
        switch (group) {
            case GRID:
                if (i >= others.size()) return "";
                return label(others, i) + ", " + (i + 1) + Ui.tr(" de ", " of ") + others.size();
            case Z_TOP:
                if (i >= tabCount()) return label(lightButtons, i - tabCount());
                return tabName(kinds.get(i)) + Ui.tr(", aba ", ", tab ") + (i + 1) + Ui.tr(" de ", " of ") + tabCount();
            case Z_CARDS: return i < cards.size() ? pickText(cards.get(i)) : "";
            case Z_SHELF:
                if (reordering && i == shelfIndex) {
                    return Ui.tr("Movendo ", "Moving ", "Moviendo ") + label(shelf, i)
                            + Ui.tr(", posição ", ", position ", ", posición ") + (i + 1) + Ui.tr(" de ", " of ") + shelf.size();
                }
                return label(shelf, i);
            case Z_DRAWER: return label(drawerItems, i);
            case WIDGETS: return i == 0 ? weatherText() : quotesText();
            default: return "";
        }
    }

    /**
     * Where the item is now. Items off screen (the closed drawer, the sheet's hidden rows, the top while the drawer is
     * open) get a thin strip at that edge, so TalkBack's arrows can still reach them; going there brings them in.
     */
    private boolean a11yBounds(int id, Rect out) {
        int group = (id - 1) / 1000, i = (id - 1) % 1000;
        float dy;
        switch (group) {
            case GRID: {
                if (!sheetOpen || i >= others.size()) return false;
                float gridWidth = COLUMNS * GRID_W + (COLUMNS - 1) * GRID_GAP;
                float x = ((1920 - gridWidth) / 2 + (i % COLUMNS) * (GRID_W + GRID_GAP)) * k;
                float y = (GRID_TOP + (i / COLUMNS - scroll.target) * GRID_ROW) * k;
                a11yRect.set(x, y, x + GRID_W * k, y + GRID_H * k);
                dy = 0;
                break;
            }
            case Z_TOP:
                if (i >= tabCount() + lightButtons.size()) return false;
                a11yRect.set(topRects[i]);
                dy = (i < tabCount() ? heroLayer : status).getTranslationY();
                break;
            case Z_CARDS:
                if (i >= Math.min(3, cards.size())) return false;
                a11yRect.set(cardRects[i]);
                dy = heroLayer.getTranslationY();
                break;
            case Z_SHELF:
                if (i >= tileRects.length) return false;
                a11yRect.set(tileRects[i]);
                dy = tiles.getTranslationY();
                break;
            case Z_DRAWER:
                if (i >= drawerRects.length) return false;
                a11yRect.set(drawerRects[i]);
                dy = drawerOpen ? 0 : h;
                break;
            case WIDGETS:
                if (!drawerOpen) return false;
                a11yRect.set(i == 0 ? weatherCard : quotesCard);
                dy = 0;
                break;
            default:
                return false;
        }
        a11yRect.offset(0, dy);
        float edge = 24 * k;
        if (a11yRect.top >= h - edge) a11yRect.set(a11yRect.left, h - edge, a11yRect.right, h);
        else if (a11yRect.bottom <= edge) a11yRect.set(a11yRect.left, 0, a11yRect.right, edge);
        a11yRect.round(out);
        return out.width() > 0 && out.height() > 0;
    }

    private int a11yFocused() {
        if (sheetOpen) return others.isEmpty() ? -1 : a11yId(GRID, gridIndex);
        switch (zone) {
            case Z_TOP: return a11yId(Z_TOP, topIndex);
            case Z_CARDS: return cardIndex < cards.size() ? a11yId(Z_CARDS, cardIndex) : -1;
            case Z_SHELF: return shelf.isEmpty() ? -1 : a11yId(Z_SHELF, shelfIndex);
            case Z_DRAWER: return drawerItems.isEmpty() ? -1 : a11yId(Z_DRAWER, drawerIndex);
            case WIDGETS: return a11yId(WIDGETS, widgetIndex);
            default: return -1;
        }
    }

    /** The drawer's widgets that are on (0 weather, 1 quotes), with the drawer open. */
    private List<Integer> widgets() {
        List<Integer> out = new ArrayList<>();
        if (!drawerOpen) return out;
        if (Prefs.weather()) out.add(0);
        if (Prefs.quotes() && HomeData.active().length > 0) out.add(1);
        return out;
    }

    /** A spoken-feedback service (TalkBack) is on. */
    private boolean talkBack() {
        AccessibilityManager am = (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
        return am != null && am.isEnabled()
                && !am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_SPOKEN).isEmpty();
    }

    /** TalkBack moved to an item: the remote's focus goes there (opening or closing the drawer on the way). */
    private void a11yFocus(int id) {
        wake();
        int group = (id - 1) / 1000, i = (id - 1) % 1000;
        if (group == GRID) {
            if (!sheetOpen || i >= others.size()) return;
            gridIndex = i;
            retargetGrid(false);
            gridDirty = true;
            click.move();
            return;
        }
        if (sheetOpen || reordering) return;
        switch (group) {
            case Z_DRAWER:
                if (i >= drawerItems.size()) return;
                if (!drawerOpen) openDrawer();
                drawerIndex = i;
                break;
            case WIDGETS:
                if (!widgets().contains(i)) return;
                widgetIndex = i;
                break;
            case Z_TOP:
                if (i >= tabCount() + lightButtons.size()) return;
                if (drawerOpen) closeDrawer();
                topIndex = i;
                if (i < tabCount()) selectTab(i);
                break;
            case Z_CARDS:
                if (i >= cards.size()) return;
                if (drawerOpen) closeDrawer();
                cardIndex = i;
                break;
            case Z_SHELF:
                if (i >= shelf.size()) return;
                if (drawerOpen) closeDrawer();
                shelfIndex = i;
                break;
            default:
                return;
        }
        zone = group;
        retarget(false);
        click.move();
    }

    private static String label(List<HomeApps.Item> list, int i) {
        return i >= 0 && i < list.size() && list.get(i).label != null ? list.get(i).label : "";
    }

    /** A recommendation: title, details and the app that plays it. */
    private static String pickText(Recs.Pick p) {
        if (p == null) return "";
        StringBuilder s = new StringBuilder(p.title == null ? "" : p.title);
        if (p.meta != null && !p.meta.isEmpty()) s.append(", ").append(p.meta);
        String app = Recs.serviceName(p);
        if (app != null && !app.isEmpty()) s.append(". App: ").append(app);
        return s.toString();
    }

    /** The weather card as TalkBack reads it: what it shows, in the same words and units. */
    private String weatherText() {
        StringBuilder s = new StringBuilder(Prefs.city().isEmpty() ? Ui.tr("Clima", "Weather") : Prefs.city());
        HomeData.Weather wx = data.weather;
        if (Double.isNaN(wx.temp)) return s.append(". ").append(Ui.tr("Sem dados do clima agora.", "No weather data right now.")).toString();
        s.append(". ").append(HomeData.degrees(wx.temp)).append(", ").append(HomeData.condition(wx.code, wx.isDay))
                .append(Ui.tr(". Máxima ", ". High ")).append(HomeData.degrees(wx.max))
                .append(Ui.tr(", mínima ", ", low ")).append(HomeData.degrees(wx.min)).append('.');
        int hours = Math.min(6, wx.hours.size());
        if (hours > 0) s.append(Ui.tr(" Próximas horas: ", " Next hours: "));
        for (int i = 0; i < hours; i++) {
            s.append(HomeData.hour(wx.hours.get(i))).append(' ').append(HomeData.degrees(wx.hourTemp.get(i))).append(i < hours - 1 ? ", " : ".");
        }
        if (wx.sunrise != 0) s.append(Ui.tr(" Nascer do sol ", " Sunrise ")).append(Ui.time(wx.sunrise)).append('.');
        if (wx.sunset != 0) s.append(Ui.tr(" Pôr do sol ", " Sunset ")).append(Ui.time(wx.sunset)).append('.');
        return s.toString();
    }

    /** The quotes card as TalkBack reads it: each coin with its price and 24 h change. */
    private String quotesText() {
        StringBuilder s = new StringBuilder(Ui.tr("Cotações", "Crypto"));
        String stale = HomeData.staleness(data.pricesAt, 5 * 60_000L);
        s.append(", ").append(stale.isEmpty() ? Ui.tr("variação em 24 h", "24h change") : Ui.tr("de ", "", "de ") + stale).append('.');
        for (int i : HomeData.active()) {
            s.append(' ').append(HomeData.coinName(i)).append(' ').append(HomeData.brl(data.prices[i]));
            if (!Double.isNaN(data.changes[i])) s.append(", ").append(HomeData.change(data.changes[i]));
            s.append('.');
        }
        return s.toString();
    }

    // MARK: - Light design: greeting, tabs, little TV screens, Tonight at home and icon-only buttons

    private void layoutLight() {
        if (lTab == null) return;
        // Text tabs; the focus pill extends 26 px past the text (the first tab's text starts at the margin).
        int n = tabCount();
        tabLabels = new String[n];
        float pad = 26 * k, tabTop = L_TABBAR_TOP * k, tabBottom = (L_TABBAR_TOP + L_TABBAR_H) * k;
        float x = MARGIN * k - pad;
        for (int i = 0; i < n; i++) {
            tabLabels[i] = tabName(kinds.get(i));
            float tw = Math.max(lTabOn.measureText(tabLabels[i]), lTab.measureText(tabLabels[i]));
            topRects[i].set(x, tabTop, x + tw + 2 * pad, tabBottom);
            x = topRects[i].right + 4 * k;
        }
        float b = L_BUTTON * k, right = CONTENT_R * k, cy = L_BUTTON_CY * k;
        personName.setTextSize(26 * k);
        for (int i = lightButtons.size() - 1; i >= 0; i--) {
            // Who's watching is a pill: the face, then the name.
            float wide = "person".equals(lightButtons.get(i).symbol) && !watcherLabel.isEmpty()
                    ? b + 10 * k + personName.measureText(watcherLabel) + 26 * k : b;
            topRects[n + i].set(right - wide, cy - b / 2, right, cy + b / 2);
            right -= wide + L_BUTTON_GAP * k;
        }
        // Three little TV screens on stands, like the Beyond mark.
        for (int i = 0; i < 3; i++) {
            float left = (MARGIN + i * L_CARD_STEP) * k, top = L_CARDS_TOP * k;
            cardRects[i].set(left, top, left + L_CARD_W * k, top + L_CARD_H * k);
        }
        cardWords();
        updateInfo();
        tonightKey = "";
        updateTonight();
        heroDirty = statusDirty = true;
    }

    /** The current tab's screens (Keep watching, or the picks) and the background taken from the first photo. */
    private void updateCards() {
        List<String> next = tabKinds();
        if (!next.equals(kinds)) {
            String was = tab < kinds.size() ? kinds.get(tab) : null;
            int before = kinds.size();
            kinds.clear();
            kinds.addAll(next);
            tab = Math.max(0, kinds.indexOf(was));
            if (zone == Z_TOP) topIndex = topIndex < before ? (kinds.isEmpty() ? 0 : tab) : topIndex - before + kinds.size();
            layoutLight();
            retarget(true);
        }
        String kind = tab < kinds.size() ? kinds.get(tab) : null;
        List<Recs.Pick> list = kind == null ? new ArrayList<>()
                : "pinned".equals(kind) ? pinnedCards() : "home".equals(kind) ? homeCards() : "watching".equals(kind) ? watchingCards() : picksFor("all".equals(kind) ? null : kind);
        if (!samePicks(list, cards)) {
            cards = list;
            cardIndex = Math.min(cardIndex, Math.max(0, list.size() - 1));
            if (zone == Z_CARDS && list.isEmpty()) {
                zone = Z_SHELF;
                retarget(false);
            }
        }
        cardWords();    // "2 hours ago" moves on
        for (Recs.Pick p : recs.wanted()) recs.backdrop(p);   // every tab preloaded: switching tabs is instant
        Recs.Pick first = null;
        for (Recs.Pick p : cards) {
            recs.backdrop(p);   // a show in Keep watching brings its photo back
            if (first == null && p.backdrop != null) first = p;
        }
        Backdrop b = first == null ? null : recs.backdrop(first);
        if (first == null || b != null) showBackdrop(b);
        updateTonight();
        heroDirty = true;
        spoken.focusMoved();    // new picks under the focused card
    }

    /** A kid watching gets their own picks (KidPicks) when they have any; everyone else this hour's picks. */
    private List<Recs.Pick> picksFor(String kind) {
        List<Recs.Pick> kid = KidPicks.cards(getContext(), kind);
        return kid != null ? kid : recs.now(kind);
    }

    /**
     * The tiles pinned in Beyond Family, as screens: an app (left off when this TV hasn't got it), a show on an app,
     * the kids' jobs for today, a camera on the home network. The first three, the screens there are. Same as
     * pinnedCards() in web/home.js.
     */
    private List<Recs.Pick> pinnedCards() {
        List<Recs.Pick> out = new ArrayList<>();
        JSONArray tiles = Family.widgets();
        java.util.Set<String> cams = new java.util.HashSet<>();
        for (int i = 0; tiles != null && i < tiles.length() && out.size() < 3; i++) {
            JSONObject w = tiles.optJSONObject(i);
            if (w == null) continue;
            String kind = w.optString("kind");
            HomeApps.Item app = appByShelf(w.optString("app"));
            Recs.Pick p = new Recs.Pick();
            p.kind = "pin";
            p.tile = kind;
            if ("app".equals(kind) && app != null) {
                p.title = p.app = app.label;
                p.pkg = app.pkg;
                p.meta = Ui.tr("App", "App", "App");
            } else if ("show".equals(kind)) {
                p.title = w.optString("title");
                p.app = app != null ? app.label : null;
                p.pkg = app != null ? app.pkg : null;
                p.meta = app != null ? app.label : Ui.tr("Não está nesta TV", "Not on this TV", "No está en este TV");
            } else if ("jobs".equals(kind)) {
                p.title = Ui.tr("Tarefas de hoje", "Jobs today", "Tareas de hoy");
                p.kids = w.optJSONArray("kids");
                p.meta = jobsLine(p.kids);
                p.colour = 0xFF2F7D6D;
            } else if ("camera".equals(kind) && !w.optString("url").isEmpty()) {
                p.title = w.optString("name");
                p.camera = w.optString("url");
                p.meta = Ui.tr("Câmera", "Camera", "Cámara");
                cams.add(p.camera);
            } else {
                continue;
            }
            p.id = (w.toString() + "|" + p.meta).hashCode();
            out.add(p);
        }
        Cameras.keep(cams, camWidth());
        return out;
    }

    /**
     * Your home: a screen for each room of the Beyond Home box (the first three, the screens there are), or one to
     * connect the box. Same as homeCards() in web/home.js.
     */
    private List<Recs.Pick> homeCards() {
        List<Recs.Pick> out = new ArrayList<>();
        if (!"paired".equals(HomeHub.status())) {
            Recs.Pick p = new Recs.Pick();
            p.kind = "pin";
            p.tile = "house";
            p.title = Ui.tr("Conectar o Beyond Home", "Connect Beyond Home", "Conectar Beyond Home");
            p.meta = "waiting".equals(HomeHub.status()) ? Ui.tr("Código ", "Code ", "Código ") + HomeHub.code()
                    : Ui.tr("Achamos o seu na rede", "We found yours on the network", "Encontramos el tuyo en la red");
            p.id = ("pair|" + p.meta).hashCode();
            out.add(p);
            return out;
        }
        JSONArray rooms = HomeHub.rooms();
        for (int i = 0; i < rooms.length() && out.size() < 3; i++) {
            JSONObject r = rooms.optJSONObject(i);
            if (r == null) continue;
            Recs.Pick p = new Recs.Pick();
            p.kind = "pin";
            p.tile = "house";
            p.room = r.optString("id");
            p.title = r.optString("name");
            p.meta = r.optString("line");
            JSONArray things = r.optJSONArray("things");
            List<Boolean> ons = new ArrayList<>();
            for (int j = 0; things != null && j < things.length() && ons.size() < 10; j++) {
                JSONObject t = things.optJSONObject(j);
                if (t != null && !t.optBoolean("away")) ons.add(t.optBoolean("on"));
            }
            p.ons = new boolean[ons.size()];
            for (int j = 0; j < p.ons.length; j++) p.ons[j] = ons.get(j);
            p.id = r.toString().hashCode();
            out.add(p);
        }
        return out;
    }

    /** A room: a little house, and a dot for each thing, lit when it's on. Nothing allocated. */
    private void drawHouse(Canvas c, Recs.Pick p, RectF cell, float r0) {
        fill.setColor(0xFF2C2458);
        c.drawRoundRect(cell, r0, r0, fill);
        Symbols.draw(getContext(), c, p.room == null ? "sync" : "home", cell.centerX(), cell.centerY() - 14 * k, 64 * k, PAPER);
        if (p.ons == null) return;
        float gap = 24 * k, x = cell.centerX() - (p.ons.length - 1) * gap / 2, y = cell.bottom - 26 * k;
        for (boolean on : p.ons) {
            if (on) {
                fill.setColor(0xFFE8A33D);
                c.drawCircle(x, y, 7 * k, fill);
            } else {
                fill.setColor(0x80FFFFFF);
                c.drawCircle(x, y, 7 * k, fill);
                fill.setColor(0xFF2C2458);
                c.drawCircle(x, y, 5 * k, fill);
            }
            x += gap;
        }
    }

    /** The app on this TV with this shelf name ("t:netflix"), the same name Beyond Family keeps. */
    private HomeApps.Item appByShelf(String name) {
        if (name == null || name.isEmpty()) return null;
        for (List<HomeApps.Item> list : java.util.Arrays.asList(shelf, others)) {
            for (HomeApps.Item it : list) {
                if (it.kind == HomeApps.APP && it.label != null
                        && name.equals("t:" + it.label.toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]", ""))) return it;
            }
        }
        return null;
    }

    /** "2 of 3 done", "All done!" or "No jobs today", over every kid. */
    private static String jobsLine(JSONArray kids) {
        int done = 0, all = 0;
        for (int i = 0; kids != null && i < kids.length(); i++) {
            JSONArray jobs = kids.optJSONObject(i) == null ? null : kids.optJSONObject(i).optJSONArray("jobs");
            for (int j = 0; jobs != null && j < jobs.length(); j++) {
                all++;
                if (jobs.optJSONObject(j) != null && jobs.optJSONObject(j).optBoolean("done")) done++;
            }
        }
        if (all == 0) return Ui.tr("Nenhuma tarefa hoje", "No jobs today", "Sin tareas hoy");
        if (done == all) return Ui.tr("Tudo feito!", "All done!", "¡Todo hecho!");
        return Ui.tr(done + " de " + all + " feitas", done + " of " + all + " done", done + " de " + all + " hechas");
    }

    /** "Mia: 1 of 2 done. Ari: all done!" for the jobs tile. */
    private static String jobsSummary(JSONArray kids) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; kids != null && i < kids.length(); i++) {
            JSONObject kid = kids.optJSONObject(i);
            if (kid == null) continue;
            JSONArray one = new JSONArray().put(kid);
            if (out.length() > 0) out.append("  ·  ");
            out.append(kid.optString("name")).append(": ").append(jobsLine(one));
        }
        return out.length() == 0 ? jobsLine(null) : out.toString();
    }

    private int camWidth() {
        return Math.max(1, Math.round(L_CARD_W * k));
    }

    /** The cameras on the Pinned tab, a fresh picture every five seconds while the home screen is showing them. */
    private final Runnable camTick = new Runnable() {
        @Override public void run() {
            if (!running) return;
            String kind = tab < kinds.size() ? kinds.get(tab) : null;
            if ("pinned".equals(kind)) {
                for (Recs.Pick p : cards) if (p.camera != null) Cameras.refresh(p.camera, camWidth(), HomeView.this::invalidateAll);
            }
            handler.postDelayed(this, 5000);
        }
    };

    /** Keep watching as screens: the show and its app when it came from a pick, otherwise just the app. */
    private List<Recs.Pick> watchingCards() {
        List<Recs.Pick> out = new ArrayList<>();
        for (Watched.Item x : Watched.list(getContext(), 3)) {
            HomeApps.Item app = appFor(x.pkg);
            String name = app != null ? app.label : x.name;
            Recs.Pick p = new Recs.Pick();
            p.kind = "watched";
            p.id = (x.pkg + "|" + x.title + "|" + x.at).hashCode();
            p.title = x.title.isEmpty() ? name : x.title;
            p.meta = x.title.isEmpty() ? "" : name;
            p.app = name;
            p.pkg = x.pkg;
            p.backdrop = x.backdrop.isEmpty() ? null : x.backdrop;
            p.link = x.link.isEmpty() ? null : x.link;
            p.watchedAt = x.at;
            out.add(p);
        }
        return out;
    }

    /** The app on the shelf or in All Apps with this package, for its logo. */
    private HomeApps.Item appFor(String pkg) {
        for (List<HomeApps.Item> list : java.util.Arrays.asList(shelf, others)) {
            for (HomeApps.Item it : list) if (it.kind == HomeApps.APP && pkg.equals(it.pkg)) return it;
        }
        return null;
    }

    /** Each screen's name, line and "how long ago", cut to fit: worked out here, never in the frame loop. */
    private void cardWords() {
        if (lCardTitle == null) return;
        float bw = L_CARD_W * k;
        for (int i = 0; i < 3; i++) {
            Recs.Pick p = i < cards.size() ? cards.get(i) : null;
            cardApp[i] = p != null && (p.watchedAt != 0 || p.tile != null) && p.pkg != null ? appFor(p.pkg) : null;
            cardName[i] = cardMeta[i] = cardWhen[i] = null;
            if (p == null) continue;
            fitPaint.set(lCardTitle);
            cardName[i] = TextUtils.ellipsize(p.title == null ? "" : p.title, fitPaint, bw, TextUtils.TruncateAt.END).toString();
            if (p.meta != null && !p.meta.isEmpty()) {
                fitPaint.set(lCardMeta);
                cardMeta[i] = TextUtils.ellipsize(p.meta, fitPaint, bw, TextUtils.TruncateAt.END).toString();
            }
            for (int j = 0; j < 3; j++) jobKid[i][j] = null;
            for (int j = 0; p.kids != null && j < p.kids.length() && j < 3; j++) {
                JSONObject kid = p.kids.optJSONObject(j);
                JSONArray jobs = kid == null ? null : kid.optJSONArray("jobs");
                if (jobs == null) continue;
                fitPaint.set(lJobKid);
                jobKid[i][j] = TextUtils.ellipsize(kid.optString("name"), fitPaint, 110 * k, TextUtils.TruncateAt.END).toString();
                jobKidColour[i][j] = colourOr(kid.optString("colour"), 0xFF2F7D6D);
                jobAll[i][j] = Math.min(8, jobs.length());
                jobDone[i][j] = 0;
                for (int n = 0; n < jobAll[i][j]; n++) if (jobs.optJSONObject(n) != null && jobs.optJSONObject(n).optBoolean("done")) jobDone[i][j]++;
            }
            if (p.watchedAt != 0) {
                cardWhen[i] = Watched.when(p.watchedAt);
                cardWhenW[i] = lWhen.measureText(cardWhen[i]);
            }
        }
    }

    private void selectTab(int index) {
        if (index == tab) return;
        tab = index;
        HomeHub.pace(index < kinds.size() && "home".equals(kinds.get(index)));
        updateCards();
        heroDirty = true;
    }

    /**
     * Background: the first card's photo, heavily blurred and almost white; without it, a light gradient. At night, the
     * same photo almost black (or a dark gradient), drawn on top during the transition.
     */
    private void drawLightSky(Canvas c) {
        long up = SystemClock.uptimeMillis();
        float e = bgFadeAt == 0 ? 1 : fadeEase(bgFadeAt, up);
        boolean fading = bgFadeAt != 0;
        if (world != null && worldPaints != null) {
            // Make it yours: their world instead of the sky, its things drifting slowly.
            if (bornAt == 0) bornAt = up;
            MyWorldActivity.draw(c, w, h, worldSky, worldThings, worldPaints, k, (up - bornAt) / 1000f, 1);
            float veilAmount = 0.42f * Ui.clamp(drawer.value);
            if (veilAmount > 0.002f) {
                veilPaint.setColor(Ui.alpha(0xFF000000, veilAmount));
                c.drawRect(screen, veilPaint);
            }
            return;
        }
        // Drawer open: the background lightens (by day) or darkens (at night), as a filter on the drawing itself.
        android.graphics.ColorFilter v = veil(tone(0.32f, 0.42f) * Ui.clamp(drawer.value), blend(0xFFFFFFFF, 0xFF000000, night));
        if (bgTo == null || (fading && bgFrom == null)) {
            if (bornAt == 0) bornAt = up;
            float seconds = (up - bornAt) / 1000f;
            glow.draw(c, seconds, breathClock.at(seconds, Breath.period(night, false)), night, 1);
            float veilAmount = tone(0.32f, 0.42f) * Ui.clamp(drawer.value);
            if (veilAmount > 0.002f) {
                veilPaint.setColor(Ui.alpha(blend(0xFFFFFFFF, 0xFF000000, night), veilAmount));
                c.drawRect(screen, veilPaint);
            }
        }
        imagePaint.setColorFilter(v);
        if (fading && bgFrom != null) drawLightImage(c, bgFrom, bgTo == null ? 1 - e : 1);
        if (bgTo != null) drawLightImage(c, bgTo, fading ? e : 1);
        imagePaint.setColorFilter(null);
    }

    private void drawLightImage(Canvas c, Backdrop b, float alpha) {
        if (night < 0.999f || b.nightImage == null) drawImage(c, b.lightImage, alpha);
        if (night > 0.001f) drawImage(c, b.nightImage, alpha * night);
    }

    private void drawLightTop(Canvas c) {
        applyTone();
        c.drawText(helloLine, MARGIN * k - Ui.leftBearing(lTitle, helloLine), L_TITLE_BASE * k, lTitle);
        drawInfo(c);
        drawKupu(c);
        int n = tabCount();
        if (n == 0 || tabLabels.length != n) {
            // Nothing opened from here yet and no picks: a big clock where the screens go.
            c.drawText(clockText, MARGIN * k - Ui.leftBearing(lClock, clockText), L_CLOCK_BASE * k, lClock);
            drawQuotes(c);
            return;
        }
        // Text tabs (the selected one in bold, in the main text color); with focus on the tabs, the selected one gets
        // the white pill with a shadow and grows a little (the tvOS focus).
        float focus = Ui.clamp(topFocus[tab].value);
        for (int i = 0; i < n; i++) {
            RectF r = topRects[i];
            if (i == tab && focus > 0.01f) {
                float s = 1 + 0.05f * focus;
                cell.set(r.centerX() - r.width() * s / 2, r.centerY() - r.height() * s / 2,
                        r.centerX() + r.width() * s / 2, r.centerY() + r.height() * s / 2);
                float rr = cell.height() / 2;
                tmp.set(cell);
                tmp.offset(0, 8 * k * focus);
                shadow.setColor(Ui.alpha(0xFF000000, tone(0.22f, 0.4f) * focus));
                shadows.draw(c, tmp, rr, SHADOW_BLUR * k, shadow);
                fill.setShader(null);
                fill.setColor(Ui.alpha(0xFFFFFFFF, focus));
                c.drawRoundRect(cell, rr, rr, fill);
            }
            Paint p = i == tab ? lTabOn : lTab;
            if (i == tab) lTabOn.setColor(blend(tone(L_INK, WHITE), L_INK, focus));   // always dark on the white pill
            c.drawText(tabLabels[i], r.centerX() - p.measureText(tabLabels[i]) / 2, r.centerY() + Ui.halfCap(p), p);
        }
        int top = -1;
        for (int i = 0; i < 3; i++) if (cardFocus[i].value > 0.02f && (top < 0 || cardFocus[i].value > cardFocus[top].value)) top = i;
        for (int i = 0; i < 3; i++) if (i != top) drawLightCard(c, i);
        if (top >= 0) drawLightCard(c, top);
        drawQuotes(c);
    }

    /** Picks show with a TMDB key, or for a kid watching who has picks of their own (KidPicks, no key needed). */
    private boolean picksOn() {
        return Recs.hasKey(getContext()) || KidPicks.any(getContext());
    }

    /**
     * A little TV screen on a stand: a dark bezel round the title's photo (already at the focused size, so it stays
     * sharp), or round the app's logo for an app opened plainly. Focused, it grows 6%, rises, and gets the paper and
     * purple ring with a soft glow and a play button. Below it, the title and its line (the app, or genre · runtime).
     */
    private void drawLightCard(Canvas c, int i) {
        Recs.Pick p = i < cards.size() ? cards.get(i) : null;
        if (p == null) return;
        RectF base = cardRects[i];
        float v = cardFocus[i].value, f = Ui.clamp(v), s = 1 + 0.06f * v;
        float bw = base.width(), bh = base.height(), r0 = 16 * k, bez = L_BEZEL * k;
        c.save();
        c.translate(base.centerX(), base.centerY() - 6 * k * v);
        c.scale(s, s);
        tmp.set(-bw / 2 - bez, -bh / 2 - bez, bw / 2 + bez, bh / 2 + bez);
        tmp.offset(0, (14 + 10 * f) * k);
        shadowDeep.setColor(Ui.alpha(0xFF000000, tone(0.2f, 0.34f) + 0.12f * f));
        shadows.draw(c, tmp, r0 + bez, DEEP_BLUR * k, shadowDeep);
        fill.setShader(null);
        if (f > 0.01f) {
            float ring = bez + 8 * k;
            tmp.set(-bw / 2 - ring, -bh / 2 - ring, bw / 2 + ring, bh / 2 + ring);
            halo.setColor(Ui.alpha(0xFF9E7BFF, 0.5f * f));
            c.drawRoundRect(tmp, r0 + ring, r0 + ring, halo);
            fill.setColor(Ui.alpha(PURPLE, f));
            c.drawRoundRect(tmp, r0 + ring, r0 + ring, fill);
            ring = bez + 4 * k;
            tmp.set(-bw / 2 - ring, -bh / 2 - ring, bw / 2 + ring, bh / 2 + ring);
            fill.setColor(Ui.alpha(PAPER, f));
            c.drawRoundRect(tmp, r0 + ring, r0 + ring, fill);
        }
        // The stand, then the bezel.
        fill.setColor(Ui.alpha(BEZEL, tone(0.55f, 0.8f)));
        tmp.set(-48 * k, bh / 2 + 10 * k, 48 * k, bh / 2 + 20 * k);
        c.drawRoundRect(tmp, 5 * k, 5 * k, fill);
        fill.setColor(BEZEL);
        tmp.set(-bw / 2 - bez, -bh / 2 - bez, bw / 2 + bez, bh / 2 + bez);
        c.drawRoundRect(tmp, r0 + bez, r0 + bez, fill);
        cell.set(-bw / 2, -bh / 2, bw / 2, bh / 2);
        Backdrop b = p.backdrop == null ? null : recs.backdrop(p);
        HomeApps.Item app = cardApp[i];
        Bitmap cam = p.camera == null ? null : Cameras.shot(p.camera, camWidth());
        if (p.camera != null) {
            // A camera: its latest picture, with a live light (grey while there's no picture).
            fill.setColor(BEZEL);
            c.drawRoundRect(cell, r0, r0, fill);
            if (cam != null) roundImage(c, cam, cell, r0);
            fill.setColor(cam != null ? 0xFFD85A30 : 0xFF55534B);
            c.drawCircle(cell.left + 18 * k, cell.top + 18 * k, 6 * k, fill);
        } else if ("jobs".equals(p.tile)) {
            drawJobsTile(c, i, cell, r0);
        } else if ("house".equals(p.tile)) {
            drawHouse(c, p, cell, r0);
        } else if (b != null && b.screen != null) {
            roundImage(c, b.screen, cell, r0);
        } else if (app != null && (app.logo != null || app.tile != null)) {
            int[] style = TILE_STYLE.get(app.key);
            fill.setColor(style != null ? style[1] : 0xFF161618);
            c.drawRoundRect(cell, r0, r0, fill);
            if (app.logo != null) drawLogo(c, app, cell, 1, style != null ? style[2] : 0);
            else roundImage(c, app.tile, cell, r0);
        } else if (p.emoji != null) {
            // A kid's pick: what it's "because of", big, on their colour.
            fill.setColor(p.colour);
            c.drawRoundRect(cell, r0, r0, fill);
            fill.setColor(0x33000000);
            c.drawRoundRect(cell, r0, r0, fill);
            c.drawText(p.emoji, cell.centerX(), cell.centerY() - (lPickEmoji.ascent() + lPickEmoji.descent()) / 2, lPickEmoji);
        } else {
            fill.setColor(0xFF2C2458);
            c.drawRoundRect(cell, r0, r0, fill);
        }
        if (cardWhen[i] != null) {
            float ch = 36 * k;
            tmp.set(cell.left + 14 * k, cell.top + 14 * k, cell.left + 14 * k + cardWhenW[i] + 28 * k, cell.top + 14 * k + ch);
            fill.setColor(0xB80D0C18);
            c.drawRoundRect(tmp, ch / 2, ch / 2, fill);
            c.drawText(cardWhen[i], tmp.left + 14 * k, tmp.centerY() + Ui.halfCap(lWhen), lWhen);
        }
        if (f > 0.01f && p.camera == null && !"jobs".equals(p.tile) && !"house".equals(p.tile)) {
            float pr = 29 * k, px = cell.right - 16 * k - pr, py = cell.bottom - 16 * k - pr;
            fill.setColor(Ui.alpha(0xFFFFFFFF, f));
            c.drawCircle(px, py, pr, fill);
            play.reset();
            play.moveTo(px - 6 * k, py - 11 * k);
            play.lineTo(px + 11 * k, py);
            play.lineTo(px - 6 * k, py + 11 * k);
            play.close();
            fill.setColor(Ui.alpha(0xFF6135D6, f));
            c.drawPath(play, fill);
        }
        c.restore();
        if (cardName[i] != null) c.drawText(cardName[i], base.left, base.top + 268 * k, lCardTitle);
        if (cardMeta[i] != null) c.drawText(cardMeta[i], base.left, base.top + 304 * k, lCardMeta);
    }

    private static int colourOr(String hex, int fallback) {
        try {
            return android.graphics.Color.parseColor(hex);
        } catch (RuntimeException e) {
            return fallback;
        }
    }

    /** The jobs tile: each kid's colour and name, then a dot per job, filled amber once it's done. */
    private void drawJobsTile(Canvas c, int i, RectF cell, float r0) {
        fill.setColor(0xFF2C2458);
        c.drawRoundRect(cell, r0, r0, fill);
        float y = cell.top + 40 * k;
        for (int j = 0; j < 3; j++) {
            if (jobKid[i][j] == null) continue;
            fill.setColor(jobKidColour[i][j]);
            c.drawCircle(cell.left + 30 * k, y, 8 * k, fill);
            c.drawText(jobKid[i][j], cell.left + 48 * k, y + Ui.halfCap(lJobKid), lJobKid);
            float x = cell.left + 178 * k;
            fill.setColor(0xFFE8A33D);
            for (int n = 0; n < jobAll[i][j]; n++, x += 22 * k) {
                if (n < jobDone[i][j]) c.drawCircle(x, y, 7 * k, fill);
                else c.drawCircle(x, y, 6 * k, jobRing);
            }
            y += 52 * k;
        }
    }

    // MARK: - Tonight at home

    /**
     * The card at the right: Beyond Family's badge when the TV is linked (the four dots, the household and its faces),
     * then today: the weather, and an invitation to link Beyond Family when it isn't. Worked out here (every 15 s and
     * when the weather comes), drawn as it is.
     */
    private void updateTonight() {
        if (lHead == null) return;
        Context ctx = getContext();
        // Earn your screen: the last job ticked off in Beyond Family.
        boolean jobsLeft = watcher != null && watcher.kid && !Family.jobs(watcher.id).isEmpty();
        String who = watcher == null ? "" : watcher.id;
        if (hadJobs && !jobsLeft && who.equals(jobsWho)) showToast(Ui.tr("Tudo feito! As telas estão abertas.", "All done! Screens are open.", "¡Todo listo! Las pantallas están abiertas."));
        hadJobs = jobsLeft;
        jobsWho = who;
        boolean linked = Family.linked(ctx), kid = watcher != null && watcher.kid;
        List<String[]> rows = new ArrayList<>();
        JSONObject board = linked ? Family.board() : null;
        if (board != null) boardRows(board, rows);
        HomeData.Weather wx = data.weather;
        if (Prefs.weather() && !Double.isNaN(wx.temp)) {
            String more = Ui.en ? "High " + HomeData.degrees(wx.max) + ", low " + HomeData.degrees(wx.min)
                    : Ui.tr("Máx. ", "High ", "Máx. ") + HomeData.degrees(wx.max) + "  " + Ui.tr("Mín. ", "Low ", "Mín. ") + HomeData.degrees(wx.min);
            rows.add(new String[] {"", HomeData.degrees(wx.temp) + ", " + condition(wx), more, Symbols.weather(wx.code, wx.isDay)});
        }
        if (nightTarget) {
            rows.add(new String[] {"🌙", Ui.tr("Respirar para dormir", "Bedtime breathing", "Respirar para dormir"),
                    Ui.tr("No botão da lua, lá em cima", "The moon button, up the top", "En el botón de la luna, arriba"), ""});
        }
        if (!linked && !kid) {
            rows.add(new String[] {"✨", Ui.tr("Conecte o Beyond Family", "Link Beyond Family", "Conecta Beyond Family"),
                    Ui.tr("O controle no celular e recados na TV", "A remote on your phone, and messages on the TV",
                            "El control en el móvil y mensajes en la tele"), ""});
        }
        String head = nightTarget ? Ui.tr("Hoje à noite em casa", "Tonight at home", "Esta noche en casa")
                : Ui.tr("Hoje em casa", "Today at home", "Hoy en casa");
        List<People.Person> faces = new ArrayList<>();
        if (linked) {
            for (People.Person p : People.list(ctx)) if (!p.together() && !p.visitor && faces.size() < 5) faces.add(p);
        }
        String home = linked ? Family.homeName(ctx) : "";
        StringBuilder key = new StringBuilder(head).append('|').append(linked).append('|').append(home).append('|').append(k);
        for (People.Person p : faces) key.append('|').append(p.initial()).append(p.colour);
        for (String[] r : rows) key.append('|').append(r[1]).append(r[2]).append(r[3]);
        if (key.toString().equals(tonightKey)) return;
        tonightKey = key.toString();
        tonightLinked = linked;
        tonightHead = head;
        fitPaint.set(lBadgeHome);
        tonightHome = TextUtils.ellipsize(home.isEmpty() ? Ui.tr("Conectado", "Linked", "Conectado") : home, fitPaint,
                (L_TONIGHT_W - 60 - 72 - 150) * k, TextUtils.TruncateAt.END).toString();
        tonightFaces.clear();
        tonightFaces.addAll(faces);
        tonightRows.clear();
        float textW = (L_TONIGHT_W - 60 - 72) * k;
        for (int i = 0; i < rows.size() && i < (linked ? 3 : 4); i++) {
            String[] r = rows.get(i);
            fitPaint.set(lRowWhat);
            String what = TextUtils.ellipsize(r[1], fitPaint, textW, TextUtils.TruncateAt.END).toString();
            fitPaint.set(lRowMore);
            String more = TextUtils.ellipsize(r[2], fitPaint, textW, TextUtils.TruncateAt.END).toString();
            tonightRows.add(new String[] {r[0], what, more, r[3]});
        }
        tonightOn = linked || !tonightRows.isEmpty();
        float h = 26 + (linked ? 100 : 0) + 52 + 76 * tonightRows.size() + 14;
        tonightRect.set(L_TONIGHT_X * k, L_TABBAR_TOP * k, (L_TONIGHT_X + L_TONIGHT_W) * k, (L_TABBAR_TOP + h) * k);
        statusDirty = heroDirty = true;
        wake();
    }

    /** What's on at home today from Beyond Family's noticeboard: birthdays, tea, the calendar, notes. As on the web. */
    private static void boardRows(JSONObject b, List<String[]> rows) {
        JSONArray birthdays = b.optJSONArray("birthdays");
        for (int i = 0; birthdays != null && i < birthdays.length(); i++) {
            rows.add(new String[] {"🎂", Ui.tr("Feliz aniversário, ", "Happy birthday, ", "¡Feliz cumpleaños, ") + birthdays.optString(i) + "!", "", ""});
        }
        String tea = b.optString("tea");
        if (!tea.isEmpty()) rows.add(new String[] {"🍲", tea, Ui.tr("Jantar", "Tea tonight", "Cena"), ""});
        JSONArray events = b.optJSONArray("events");
        for (int i = 0; events != null && i < events.length(); i++) {
            JSONObject e = events.optJSONObject(i);
            if (e == null || e.optString("title").isEmpty()) continue;
            StringBuilder more = new StringBuilder(e.optString("time").length() >= 5 ? clockText(e.optString("time"))
                    : Ui.tr("O dia todo", "All day", "Todo el día"));
            for (String part : new String[] {e.optString("who"), e.optString("where")}) if (!part.isEmpty()) more.append(" · ").append(part);
            rows.add(new String[] {"📅", e.optString("title"), more.toString(), ""});
        }
        JSONArray notes = b.optJSONArray("notes");
        for (int i = 0; notes != null && i < notes.length(); i++) {
            JSONObject n = notes.optJSONObject(i);
            if (n != null && !n.optString("text").isEmpty()) rows.add(new String[] {"💬", n.optString("text"), n.optString("from"), ""});
        }
    }

    /** "18:30" from the calendar, told the way the rest of the home screen tells the time. */
    private static String clockText(String hm) {
        try {
            java.util.Calendar at = java.util.Calendar.getInstance();
            at.set(java.util.Calendar.HOUR_OF_DAY, Integer.parseInt(hm.substring(0, 2)));
            at.set(java.util.Calendar.MINUTE, Integer.parseInt(hm.substring(3, 5)));
            at.set(java.util.Calendar.SECOND, 0);
            at.set(java.util.Calendar.MILLISECOND, 0);
            return Ui.time(at.getTimeInMillis());
        } catch (Exception e) {
            return hm;
        }
    }

    private boolean hadJobs;
    private String jobsWho = "";

    private void drawTonight(Canvas c) {
        if (!tonightOn) return;
        RectF r = tonightRect;
        float rad = 36 * k;
        tmp.set(r);
        tmp.offset(0, 14 * k);
        shadow.setColor(Ui.alpha(0xFF000000, tone(0.12f, 0.32f)));
        shadows.draw(c, tmp, rad, SHADOW_BLUR * k, shadow);
        scene.liquid(c, r, rad, tone(0xFFFFFFFF, SMOKE), tone(0.6f, 0.4f), tone(0.03f, 0.06f), 24 * k, 16 * k,
                tone(0.6f, 0.8f), 1);
        float x = r.left + 30 * k, y = r.top + 26 * k;
        fill.setShader(null);
        if (tonightLinked) {
            fill.setColor(0xFF2FBF71);
            c.drawCircle(x + 6 * k, y + 31 * k, 6 * k, fill);
            Breath.mark(c, markPaint, x + 46 * k, y + 32 * k, 34 * k, -1, 10, 1);
            c.drawText("Beyond Family", x + 72 * k, y + 30 * k, lBadge);
            c.drawText(tonightHome, x + 72 * k, y + 58 * k, lBadgeHome);
            int n = tonightFaces.size();
            float fx = r.right - 30 * k - (44 + 34 * (n - 1)) * k + 22 * k, fy = y + 32 * k;
            for (int j = 0; j < n; j++) {
                People.Person p = tonightFaces.get(j);
                float cx = fx + 34 * k * j;
                fill.setColor(tone(0xFFFFFFFF, 0xFF1B1A26));
                c.drawCircle(cx, fy, 25 * k, fill);
                fill.setColor(p.colour);
                c.drawCircle(cx, fy, 22 * k, fill);
                String face = p.initial();
                c.drawText(face, cx, fy - (lFace.ascent() + lFace.descent()) / 2, lFace);
            }
            fill.setColor(tone(0x1A22221F, 0x1AFFFFFF));
            c.drawRect(x, y + 82 * k, r.right - 30 * k, y + 83 * k, fill);
            y += 100 * k;
        }
        c.drawText(tonightHead, x, y + 32 * k, lHead);
        y += 52 * k;
        for (String[] row : tonightRows) {
            tmp.set(x, y + 6 * k, x + 54 * k, y + 60 * k);
            fill.setColor(tone(0x0F22221F, 0x14FFFFFF));
            c.drawRoundRect(tmp, 16 * k, 16 * k, fill);
            if (!row[0].isEmpty()) {
                c.drawText(row[0], tmp.centerX(), tmp.centerY() - (lEmoji.ascent() + lEmoji.descent()) / 2, lEmoji);
            } else if (!row[3].isEmpty()) {
                Symbols.draw(getContext(), c, row[3], tmp.centerX(), tmp.centerY(), 30 * k, lRowWhat.getColor());
            }
            c.drawText(row[1], x + 72 * k, y + 34 * k, lRowWhat);
            if (!row[2].isEmpty()) c.drawText(row[2], x + 72 * k, y + 62 * k, lRowMore);
            y += 76 * k;
        }
    }

    /**
     * Live TV, HDMI Inputs and Settings: icon-only glass circles (light by day, smoked at night); the focused one turns
     * white with a dark icon (the tvOS focus) and its name appears below it.
     */
    private void drawLightButtons(Canvas c) {
        applyTone();
        drawTonight(c);
        int n = tabCount();
        for (int i = 0; i < lightButtons.size(); i++) {
            RectF r = topRects[n + i];
            float f = Ui.clamp(topFocus[n + i].value), s = 1 + 0.1f * f, rad = r.height() / 2 * s, across = r.width() / 2 * s;
            cell.set(r.centerX() - across, r.centerY() - rad, r.centerX() + across, r.centerY() + rad);
            tmp.set(cell);
            tmp.offset(0, (6 + 8 * f) * k);
            shadow.setColor(Ui.alpha(0xFF000000, tone(0.1f, 0.3f) + tone(0.14f, 0.2f) * f));
            shadows.draw(c, tmp, rad, SHADOW_BLUR * k, shadow);
            scene.liquid(c, cell, rad, tone(0xFFFFFFFF, SMOKE), tone(0.55f, 0.5f), tone(0.02f, 0.01f), 12 * k, 8 * k,
                    tone(0.6f, 0.45f), 1 - f);
            if (f > 0.01f) {
                fill.setShader(null);
                fill.setColor(Ui.alpha(0xFFFFFFFF, f));
                c.drawRoundRect(cell, rad, rad, fill);
            }
            if ("dots".equals(lightButtons.get(i).symbol)) {
                Breath.mark(c, markPaint, cell.centerX(), cell.centerY(), 30 * k * s, -1, 10, 1);
            } else if ("person".equals(lightButtons.get(i).symbol)) {
                // Their face: a disc in their colour with their initial; Family wears the four dots. Then their name.
                float fx = cell.left + rad;
                fill.setShader(null);
                fill.setColor(watcher.colour);
                c.drawCircle(fx, cell.centerY(), rad - 6 * k, fill);
                if (watcher.together()) {
                    Breath.mark(c, markPaint, fx, cell.centerY(), 28 * k * s, -1, 10, 1);
                } else {
                    personInk.setTextSize(30 * k * s);
                    c.drawText(watcherInitial, fx, cell.centerY() - (personInk.ascent() + personInk.descent()) / 2, personInk);
                }
                if (!watcherLabel.isEmpty()) {
                    personName.setTextSize(26 * k * s);
                    personName.setColor(blend(tone(L_INK, 0xEBFFFFFF), L_INK, f));
                    c.drawText(watcherLabel, fx + rad + 10 * k * s, cell.centerY() - (personName.ascent() + personName.descent()) / 2, personName);
                }
            } else {
                Symbols.draw(getContext(), c, lightButtons.get(i).symbol, cell.centerX(), cell.centerY(), 27 * k * s,
                        blend(tone(L_INK, 0xEBFFFFFF), L_INK, f));
            }
            if (f > 0.01f) {
                String label = lightButtons.get(i).label;
                float half = lTip.measureText(label) / 2;
                float x = Math.min(r.centerX(), CONTENT_R * k - half);
                lTip.setAlpha(Math.round(255 * f));
                c.drawText(label, x, r.bottom + (40 + 4 * f) * k, lTip);
            }
        }
    }

    private boolean moveLight(int dx, int dy) {
        int n = tabCount();
        switch (zone) {
            case Z_SHELF:
                // Up from an empty shelf too: move()'s older zones (the hero, the corner capsule) aren't drawn any more.
                if (dy >= 0) return false;
                if (cards.isEmpty()) {
                    zone = Z_TOP;
                    topIndex = n > 0 ? tab : 0;
                } else {
                    zone = Z_CARDS;
                    cardIndex = nearest(cardRects, cards.size(), shelf.isEmpty() ? w / 2f : tileRects[shelfIndex].centerX());
                }
                break;
            case Z_CARDS:
                if (dx != 0) {
                    int next = Math.max(0, Math.min(cards.size() - 1, cardIndex + dx));
                    if (next == cardIndex) return true;
                    cardIndex = next;
                } else if (dy < 0) {
                    zone = Z_TOP;
                    topIndex = tab;     // as on Apple TV: moving up to the tabs focuses the selected tab
                } else {
                    zone = Z_SHELF;
                    if (!shelf.isEmpty()) shelfIndex = nearest(tileRects, tileRects.length, cardRects[cardIndex].centerX());
                }
                break;
            case Z_TOP:
                if (dx != 0) {
                    int next = Math.max(0, Math.min(n - 1 + lightButtons.size(), topIndex + dx));
                    if (next == topIndex) return true;
                    topIndex = next;
                    if (topIndex < n) selectTab(topIndex);   // like Apple TV tabs: focusing a tab selects it
                } else if (dy > 0 && topIndex >= n && n > 0) {
                    topIndex = tab;     // down from the buttons in the corner: back to the tabs
                } else if (dy > 0) {
                    if (cards.isEmpty()) {
                        zone = Z_SHELF;
                    } else {
                        zone = Z_CARDS;
                        cardIndex = topIndex < n ? 0 : cards.size() - 1;
                    }
                } else if (topIndex < n && !lightButtons.isEmpty()) {
                    topIndex = n;       // up from the tabs: the buttons in the corner (Live TV, Settings, who's watching)
                } else {
                    return true;
                }
                break;
            default:
                return false;
        }
        retarget(false);
        click.move();
        return true;
    }

    private static int nearest(RectF[] rects, int count, float x) {
        int best = 0;
        float bestDistance = Float.MAX_VALUE;
        for (int i = 0; i < Math.min(count, rects.length); i++) {
            float d = Math.abs(rects[i].centerX() - x);
            if (d < bestDistance) {
                bestDistance = d;
                best = i;
            }
        }
        return best;
    }

    // MARK: - Helpers

    private static float smoothstep(float e0, float e1, float x) {
        float t = Ui.clamp((x - e0) / (e1 - e0));
        return t * t * (3 - 2 * t);
    }

    private static int blend(int a, int b, float f) {
        int aa = a >>> 24, ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        int ba = b >>> 24, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(aa + (ba - aa) * f) << 24) | (Math.round(ar + (br - ar) * f) << 16)
                | (Math.round(ag + (bg - ag) * f) << 8) | Math.round(ab + (bb - ab) * f);
    }
}
