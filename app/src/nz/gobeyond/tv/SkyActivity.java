package nz.gobeyond.tv;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

/**
 * Tonight's sky: a star chart for where the TV is, and the moon (ADR 0023). Same as web/sky.js on LG and Samsung:
 * change one, change both.
 *
 * The chart is the whole sky overhead: the middle is straight up, the edge is the horizon, north at the top and east
 * on the left, as when you lie on your back with your head to the north. Stars to magnitude 5, the constellation
 * lines, the brightest stars' names, the Southern Cross and Matariki. Beside it the moon: its phase drawn the way it
 * looks from here (in the southern hemisphere a waxing moon is lit on the left), how much is lit, moonrise and
 * moonset, sunset and sunrise, and the next full and new moon. Left and right move the sky an hour; OK comes back to
 * now. In the daytime it opens on tonight, once it's dark.
 *
 * Worked out on the TV from the clock and the location, no internet: stars from assets/sky.json (tools/make_sky.py,
 * d3-celestial's catalogue), the sun and moon from the Astronomical Almanac's low-precision formulas. Drawn once per
 * change, nothing animates.
 */
public class SkyActivity extends Activity {
    static void open(Context c) {
        c.startActivity(new Intent(c, SkyActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private Chart chart;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Watchdog.install(this);
        Ui.init(this);
        chart = new Chart(this);
        setContentView(chart);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        if (code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) return super.dispatchKeyEvent(e);
        if (e.getAction() != KeyEvent.ACTION_DOWN) return true;
        if (code == KeyEvent.KEYCODE_DPAD_LEFT) chart.move(-1);
        else if (code == KeyEvent.KEYCODE_DPAD_RIGHT) chart.move(1);
        else if (code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER) chart.now();
        return true;
    }

    // MARK: - The sun and the moon

    private static final double D = Math.PI / 180;

    private static double sin(double x) { return Math.sin(x * D); }
    private static double cos(double x) { return Math.cos(x * D); }
    private static double norm(double x) { x = x % 360; return x < 0 ? x + 360 : x; }

    /** Days since J2000.0 (12:00 UT, 1 January 2000). */
    private static double days(long ms) { return ms / 86400000.0 + 2440587.5 - 2451545; }

    /** {right ascension, declination, ecliptic longitude}, in degrees. */
    private static double[] equatorial(double lon, double lat, double n) {
        double e = 23.439 - 0.0000004 * n;
        double ra = Math.atan2(sin(lon) * cos(e) - Math.tan(lat * D) * sin(e), cos(lon)) / D;
        return new double[] {norm(ra), Math.asin(sin(lat) * cos(e) + cos(lat) * sin(e) * sin(lon)) / D, norm(lon)};
    }

    private static double[] sun(long ms) {
        double n = days(ms), g = norm(357.528 + 0.9856003 * n);
        return equatorial(norm(280.460 + 0.9856474 * n) + 1.915 * sin(g) + 0.020 * sin(2 * g), 0, n);
    }

    /** {right ascension, declination, ecliptic longitude, ecliptic latitude, parallax}, in degrees. */
    private static double[] moon(long ms) {
        double n = days(ms), t = n / 36525;
        double lon = 218.32 + 481267.881 * t + 6.29 * sin(135.0 + 477198.87 * t) - 1.27 * sin(259.3 - 413335.36 * t)
                + 0.66 * sin(235.7 + 890534.22 * t) + 0.21 * sin(269.9 + 954397.74 * t) - 0.19 * sin(357.5 + 35999.05 * t)
                - 0.11 * sin(186.5 + 966404.03 * t);
        double lat = 5.13 * sin(93.3 + 483202.02 * t) + 0.28 * sin(228.2 + 960400.89 * t) - 0.28 * sin(318.3 + 6003.15 * t)
                - 0.17 * sin(217.6 - 407332.21 * t);
        double par = 0.9508 + 0.0518 * cos(135.0 + 477198.87 * t) + 0.0095 * cos(259.3 - 413335.36 * t)
                + 0.0078 * cos(235.7 + 890534.22 * t) + 0.0028 * cos(269.9 + 954397.74 * t);
        double[] m = equatorial(norm(lon), lat, n);
        return new double[] {m[0], m[1], m[2], lat, par};
    }

    /** Local sidereal time, in degrees. */
    private static double sidereal(long ms, double lon) { return norm(280.46061837 + 360.98564736629 * days(ms) + lon); }

    /** {altitude, azimuth from north through east}, in degrees. */
    private static double[] horizon(double ra, double dec, double lst, double lat) {
        double h = lst - ra;
        double alt = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(h)) / D;
        double az = Math.atan2(-sin(h) * cos(dec), sin(dec) * cos(lat) - cos(dec) * cos(h) * sin(lat)) / D;
        return new double[] {alt, norm(az)};
    }

    private static double lat() { return number(Prefs.latitude(), -36.8485); }
    private static double lon() { return number(Prefs.longitude(), 174.7633); }

    private static double number(String s, double fallback) {
        try { return Double.parseDouble(s.trim()); } catch (Exception e) { return fallback; }
    }

    private static double sunAlt(long ms, double lat, double lon) {
        double[] s = sun(ms);
        return horizon(s[0], s[1], sidereal(ms, lon), lat)[0];
    }

    /** The moon from the ground: the parallax lowers it by up to a degree. */
    private static double[] moonAt(long ms, double lat, double lon) {
        double[] m = moon(ms), h = horizon(m[0], m[1], sidereal(ms, lon), lat);
        h[0] -= m[4] * cos(h[0]);
        return h;
    }

    private interface Altitude { double at(long ms); }

    /** The first times between from and to that the altitude rises through and sets through h0: {rise, set}, 0 for none. */
    private static long[] riseSet(Altitude alt, double h0, long from, long to) {
        long[] out = new long[2];
        long step = 600_000;
        double a = alt.at(from) - h0;
        for (long t = from + step; t <= to && (out[0] == 0 || out[1] == 0); t += step) {
            double b = alt.at(t) - h0;
            if (a < 0 && b >= 0 && out[0] == 0) out[0] = Math.round(t - step * b / (b - a));
            if (a >= 0 && b < 0 && out[1] == 0) out[1] = Math.round(t - step * b / (b - a));
            a = b;
        }
        return out;
    }

    /** How far the moon is ahead of the sun along the ecliptic: 0 new, 90 first quarter, 180 full, 270 last quarter. */
    private static double age(long ms) { return norm(moon(ms)[2] - sun(ms)[2]); }

    /** {age, lit (0..1)}. */
    private static double[] phase(long ms) {
        double[] m = moon(ms);
        double d = norm(m[2] - sun(ms)[2]), elong = Math.acos(cos(d) * cos(m[3])) / D;
        return new double[] {d, (1 - cos(elong)) / 2};
    }

    private static String phaseName(double age) {
        switch ((int) Math.round(age / 45) % 8) {
            case 0: return Ui.tr("Lua nova", "New moon", "Luna nueva");
            case 1: return Ui.tr("Lua crescente", "Waxing crescent", "Luna creciente");
            case 2: return Ui.tr("Quarto crescente", "First quarter", "Cuarto creciente");
            case 3: return Ui.tr("Crescente gibosa", "Waxing gibbous", "Gibosa creciente");
            case 4: return Ui.tr("Lua cheia", "Full moon", "Luna llena");
            case 5: return Ui.tr("Minguante gibosa", "Waning gibbous", "Gibosa menguante");
            case 6: return Ui.tr("Quarto minguante", "Last quarter", "Cuarto menguante");
            default: return Ui.tr("Lua minguante", "Waning crescent", "Luna menguante");
        }
    }

    /** When the moon's age next reaches target (0 for new, 180 for full), to the minute; 0 if not found. */
    private static long next(long ms, double target) {
        long step = 6 * 3_600_000L, t = ms;
        double a = gap(ms, target);
        for (int i = 0; i < 130; i++) {
            double b = gap(t + step, target);
            if (a < 0 && b >= 0 && b - a < 90) {
                long lo = t, hi = t + step;
                while (hi - lo > 60_000) {
                    long mid = (lo + hi) / 2;
                    if (gap(mid, target) < 0) lo = mid; else hi = mid;
                }
                return hi;
            }
            t += step;
            a = b;
        }
        return 0;
    }

    private static double gap(long ms, double target) { return norm(age(ms) - target + 180) - 180; }

    /** N, NE, E and so on, in the TV's language. */
    private static String compass(double az) {
        String[] dirs = Ui.ru ? new String[] {"С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"}
                : Ui.de ? new String[] {"N", "NO", "O", "SO", "S", "SW", "W", "NW"}
                : Ui.es ? new String[] {"N", "NE", "E", "SE", "S", "SO", "O", "NO"}
                : Ui.en ? new String[] {"N", "NE", "E", "SE", "S", "SW", "W", "NW"}
                : new String[] {"N", "NE", "L", "SE", "S", "SO", "O", "NO"};
        return dirs[(int) Math.round(norm(az) / 45) % 8];
    }

    /** The Pleiades are Matariki in Aotearoa, and in te reo whatever the language. */
    private static String matariki() {
        return "NZ".equalsIgnoreCase(Config.TMDB_REGION.trim()) || Prefs.kupu() ? "Matariki" : Ui.tr("Plêiades", "Pleiades", "Pléyades");
    }

    /** For the home screen's Tonight card at night: {emoji, "Full moon, 99% lit", where to find the chart}. */
    static String[] moonRow() {
        double[] ph = phase(System.currentTimeMillis());
        int i = (int) Math.round(ph[0] / 45) % 8;
        // The emoji are drawn as the north sees them; south of the equator the waxing ones look like the waning ones.
        String[] north = {"🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"};
        return new String[] {north[lat() < 0 ? (8 - i) % 8 : i],
                phaseName(ph[0]) + ", " + Math.round(ph[1] * 100) + "% " + Ui.tr("iluminada", "lit", "iluminada"),
                Ui.tr("O botão da estrela, lá em cima", "The star button, up the top", "El botón de la estrella, arriba"), ""};
    }

    // MARK: - The stars

    private static float[] stars;               // ra, dec, magnitude
    private static float[][] lines;             // ra, dec, ra, dec...
    private static float[] namePos, consPos;    // ra, dec
    private static String[] names, cons;

    private static synchronized void load(Context c) {
        if (stars != null) return;
        try (InputStream in = c.getAssets().open("sky.json")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            JSONObject o = new JSONObject(out.toString("UTF-8"));
            JSONArray s = o.getJSONArray("stars"), l = o.getJSONArray("lines"), nm = o.getJSONArray("names"), cn = o.getJSONArray("cons");
            float[] st = new float[s.length()];
            for (int i = 0; i < st.length; i++) st[i] = (float) s.getDouble(i);
            lines = new float[l.length()][];
            for (int i = 0; i < lines.length; i++) {
                JSONArray p = l.getJSONArray(i);
                lines[i] = new float[p.length()];
                for (int j = 0; j < p.length(); j++) lines[i][j] = (float) p.getDouble(j);
            }
            namePos = new float[nm.length() * 2];
            names = new String[nm.length()];
            for (int i = 0; i < names.length; i++) {
                JSONArray p = nm.getJSONArray(i);
                namePos[2 * i] = (float) p.getDouble(0);
                namePos[2 * i + 1] = (float) p.getDouble(1);
                names[i] = p.getString(2);
            }
            consPos = new float[cn.length() * 2];
            cons = new String[cn.length()];
            for (int i = 0; i < cons.length; i++) {
                JSONArray p = cn.getJSONArray(i);
                consPos[2 * i] = (float) p.getDouble(0);
                consPos[2 * i + 1] = (float) p.getDouble(1);
                cons[i] = p.getString(2);
            }
            stars = st;
        } catch (Exception e) {
            Checkin.error(c, "sky", String.valueOf(e));
            stars = new float[0];
            lines = new float[0][];
            namePos = consPos = new float[0];
            names = cons = new String[0];
        }
    }

    // MARK: - The screen

    private static final class Chart extends View {
        private final float k;
        private final double lat = lat(), lon = lon();
        private final long start;
        private long at;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG), text = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();
        private final RectF oval = new RectF();
        private final List<RectF> placed = new ArrayList<>();

        Chart(Context c) {
            super(c);
            k = c.getResources().getDisplayMetrics().widthPixels / 1920f;
            load(c);
            start = tonight(System.currentTimeMillis());
            at = start;
            setBackgroundColor(0xFF05071A);
        }

        /** In the daytime, the first hour tonight that it's properly dark (the sun 12° down). */
        private long tonight(long now) {
            if (sunAlt(now, lat, lon) < -6) return now;
            for (long t = now; t < now + 86_400_000L; t += 600_000) {
                if (sunAlt(t, lat, lon) < -12) {
                    Calendar c = Calendar.getInstance();
                    c.setTimeInMillis(t);
                    c.set(Calendar.MINUTE, 0);
                    c.set(Calendar.SECOND, 0);
                    c.set(Calendar.MILLISECOND, 0);
                    return c.getTimeInMillis() + 3_600_000L;
                }
            }
            return now;
        }

        void move(int hours) {
            at += hours * 3_600_000L;
            invalidate();
        }

        void now() {
            at = tonight(System.currentTimeMillis());
            invalidate();
        }

        private String day(long ms) {
            Calendar c = Calendar.getInstance();
            c.setTimeInMillis(ms);
            String wd = new SimpleDateFormat("EEEE", Ui.locale()).format(new Date(ms));
            if (!wd.isEmpty()) wd = wd.substring(0, 1).toUpperCase(Ui.locale()) + wd.substring(1) + " ";
            return wd + c.get(Calendar.DAY_OF_MONTH) + "/" + (c.get(Calendar.MONTH) + 1);
        }

        @Override protected void onDraw(Canvas c) {
            drawChart(c);
            drawSide(c);
        }

        // The chart: centre (540, 520), radius 440, at 1920 wide.
        private float cx, cy, r;
        private double lst;

        /** Where a star lands: {x, y, altitude}. */
        private float[] at(double ra, double dec) {
            double[] h = horizon(ra, dec, lst, lat);
            float rr = (float) (r * (90 - h[0]) / 90);
            return new float[] {cx - rr * (float) sin(h[1]), cy - rr * (float) cos(h[1]), (float) h[0]};
        }

        private void drawChart(Canvas c) {
            cx = 540 * k;
            cy = 520 * k;
            r = 440 * k;
            lst = sidereal(at, lon);
            placed.clear();

            paint.setStyle(Paint.Style.FILL);
            paint.setShader(new RadialGradient(cx, cy, r, 0xFF070A1C, 0xFF16193A, Shader.TileMode.CLAMP));
            c.drawCircle(cx, cy, r, paint);
            paint.setShader(null);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(1, k));
            paint.setColor(0x14F7F6F2);
            c.drawCircle(cx, cy, r / 3, paint);
            c.drawCircle(cx, cy, r * 2 / 3, paint);

            c.save();
            path.reset();
            path.addCircle(cx, cy, r, Path.Direction.CW);
            c.clipPath(path);

            // Constellation lines.
            paint.setColor(0x739E7BFF);
            paint.setStrokeWidth(1.5f * k);
            for (float[] l : lines) {
                float[] prev = null;
                for (int j = 0; j + 1 < l.length; j += 2) {
                    float[] p = at(l[j], l[j + 1]);
                    if (prev != null && prev[2] > -3 && p[2] > -3) c.drawLine(prev[0], prev[1], p[0], p[1], paint);
                    prev = p;
                }
            }

            // Stars: brighter is bigger.
            paint.setStyle(Paint.Style.FILL);
            for (int i = 0; i + 2 < stars.length; i += 3) {
                float[] p = at(stars[i], stars[i + 1]);
                if (p[2] < 0) continue;
                float mag = stars[i + 2];
                paint.setColor(0xFFF7F6F2);
                paint.setAlpha(Math.round(255 * (mag < 3 ? 1 : Math.max(0.3f, 0.95f - (mag - 3) * 0.22f))));
                c.drawCircle(p[0], p[1], Math.max(0.9f, 4.6f - 0.78f * mag) * k, paint);
            }

            // The moon when it's up, then the names: the Southern Cross, the brightest stars and Matariki, then the
            // main constellations, softly. A name that would land on one already written is left off.
            text.setTextAlign(Paint.Align.CENTER);
            double[] mp = moonAt(at, lat, lon);
            if (mp[0] > -0.5) {
                float rr = (float) (r * (90 - mp[0]) / 90);
                float mx = cx - rr * (float) sin(mp[1]), my = cy - rr * (float) cos(mp[1]);
                drawMoon(c, mx, my, 16 * k, phase(at));
                label(c, Ui.tr("Lua", "Moon", "Luna"), mx, my + 40 * k, Ui.semibold, 21, 0xFFF2EEDF);
            }
            for (int i = 0; i < cons.length; i++) {
                float[] p = at(consPos[2 * i], consPos[2 * i + 1]);
                if ("Southern Cross".equals(cons[i]) && p[2] > 3) {
                    label(c, Ui.tr("Cruzeiro do Sul", "Southern Cross", "Cruz del Sur").toUpperCase(Ui.locale()), p[0], p[1] - 34 * k, Ui.semibold, 19, 0xB3BEACFF);
                }
            }
            for (int i = 0; i < names.length; i++) {
                float[] p = at(namePos[2 * i], namePos[2 * i + 1]);
                if (p[2] < 6) continue;
                boolean m = "Matariki".equals(names[i]);
                label(c, m ? matariki() : names[i], p[0], p[1] + 28 * k, m ? Ui.semibold : Ui.medium, m ? 22 : 21, m ? 0xFFE8A33D : 0xD9F7F6F2);
            }
            for (int i = 0; i < cons.length; i++) {
                float[] p = at(consPos[2 * i], consPos[2 * i + 1]);
                if (!"Southern Cross".equals(cons[i]) && p[2] > 12) label(c, cons[i].toUpperCase(Ui.locale()), p[0], p[1], Ui.semibold, 19, 0xB3BEACFF);
            }
            c.restore();

            // The horizon and the four directions.
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2 * k);
            paint.setColor(0x59F7F6F2);
            c.drawCircle(cx, cy, r, paint);
            text.setTypeface(Ui.displaySemibold);
            text.setTextSize(28 * k);
            text.setColor(0xCCF7F6F2);
            float mid = -(text.ascent() + text.descent()) / 2;
            c.drawText(compass(0), cx, cy - r - 26 * k + mid, text);
            c.drawText(compass(180), cx, cy + r + 26 * k + mid, text);
            c.drawText(compass(90), cx - r - 30 * k, cy + mid, text);
            c.drawText(compass(270), cx + r + 30 * k, cy + mid, text);
        }

        private void label(Canvas c, String s, float x, float y, android.graphics.Typeface face, float px, int colour) {
            text.setTypeface(face);
            text.setTextSize(px * k);
            float w = text.measureText(s);
            RectF box = new RectF(x - w / 2 - 6 * k, y - 22 * k, x + w / 2 + 6 * k, y + 6 * k);
            for (RectF o : placed) if (RectF.intersects(o, box)) return;
            placed.add(box);
            text.setColor(colour);
            c.drawText(s, x, y, text);
        }

        /** The moon's face, lit the way it looks from here. */
        private void drawMoon(Canvas c, float x, float y, float rad, double[] ph) {
            boolean waxing = ph[0] < 180, south = lat < 0;
            float lit = (float) ph[1];
            c.save();
            c.translate(x, y);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0xFF2C2A40);
            c.drawCircle(0, 0, rad, paint);
            // Lit on the right while waxing in the north; the southern hemisphere sees it the other way round.
            if (waxing == south) c.scale(-1, 1);
            path.reset();
            oval.set(-rad, -rad, rad, rad);
            path.arcTo(oval, -90, 180, true);
            float e = Math.max(0.001f, Math.abs(1 - 2 * lit)) * rad;
            oval.set(-e, -rad, e, rad);
            // From the bottom back to the top: through the right for a crescent, through the left past half.
            path.arcTo(oval, 90, lit < 0.5f ? -180 : 180, false);
            path.close();
            paint.setColor(0xFFF2EEDF);
            c.drawPath(path, paint);
            c.restore();
        }

        private void drawSide(Canvas c) {
            float x = 1100 * k, right = 1860 * k;
            boolean live = Math.abs(at - System.currentTimeMillis()) < 1_800_000L;
            text.setTextAlign(Paint.Align.LEFT);
            text.setTypeface(Ui.displaySemibold);
            text.setTextSize(52 * k);
            text.setColor(0xFFF7F6F2);
            c.drawText(Ui.tr("Céu de hoje à noite", "Tonight's sky", "El cielo de esta noche"), x, 150 * k, text);
            String city = Prefs.city();
            boolean otherDay = !sameDay(at, System.currentTimeMillis());
            String sub = (city == null || city.isEmpty() ? "" : city + "  ·  ") + (live ? Ui.tr("Agora", "Now", "Ahora") + ", " : "")
                    + Ui.time(at) + (otherDay ? "  ·  " + day(at) : "");
            text.setTypeface(Ui.medium);
            text.setTextSize(28 * k);
            text.setColor(0x9EF7F6F2);
            c.drawText(sub, x, 198 * k, text);

            double[] ph = phase(at);
            drawMoon(c, x + 100 * k, 340 * k, 92 * k, ph);
            text.setTypeface(Ui.displaySemibold);
            text.setTextSize(44 * k);
            text.setColor(0xFFF7F6F2);
            c.drawText(phaseName(ph[0]), x + 240 * k, 335 * k, text);
            text.setTypeface(Ui.regular);
            text.setTextSize(28 * k);
            text.setColor(0x9EF7F6F2);
            c.drawText(Math.round(ph[1] * 100) + "% " + Ui.tr("iluminada", "lit", "iluminada"), x + 240 * k, 380 * k, text);

            // Tonight runs from midday to midday, so the moon and sun rows cover the whole night.
            Calendar noon = Calendar.getInstance();
            noon.setTimeInMillis(at);
            boolean morning = noon.get(Calendar.HOUR_OF_DAY) < 12;
            noon.set(Calendar.HOUR_OF_DAY, 12);
            noon.set(Calendar.MINUTE, 0);
            noon.set(Calendar.SECOND, 0);
            noon.set(Calendar.MILLISECOND, 0);
            long from = noon.getTimeInMillis() - (morning ? 86_400_000L : 0);
            long[] ms = riseSet(t -> moonAt(t, lat, lon)[0], 0.125, from, from + 86_400_000L);
            long[] ss = riseSet(t -> sunAlt(t, lat, lon), -0.833, from, from + 86_400_000L);
            long full = next(at, 180), fresh = next(at, 0);
            List<String[]> rows = new ArrayList<>();
            if (ms[0] != 0) rows.add(new String[] {Ui.tr("Nascer da lua", "Moonrise", "Salida de la luna"), Ui.time(ms[0])});
            if (ms[1] != 0) rows.add(new String[] {Ui.tr("Pôr da lua", "Moonset", "Puesta de la luna"), Ui.time(ms[1])});
            if (ss[1] != 0) rows.add(new String[] {Ui.tr("Pôr do sol", "Sunset", "Puesta del sol"), Ui.time(ss[1])});
            if (ss[0] != 0) rows.add(new String[] {Ui.tr("Nascer do sol", "Sunrise", "Salida del sol"), Ui.time(ss[0])});
            if (full != 0) rows.add(new String[] {phaseName(180), day(full)});
            if (fresh != 0) rows.add(new String[] {phaseName(0), day(fresh)});
            float y = 500 * k;
            paint.setStyle(Paint.Style.FILL);
            for (String[] row : rows) {
                text.setTypeface(Ui.regular);
                text.setTextAlign(Paint.Align.LEFT);
                text.setColor(0x9EF7F6F2);
                c.drawText(row[0], x, y + 10 * k, text);
                text.setTypeface(Ui.semibold);
                text.setTextAlign(Paint.Align.RIGHT);
                text.setColor(0xFFF7F6F2);
                c.drawText(row[1], right, y + 10 * k, text);
                paint.setColor(0x14F7F6F2);
                c.drawRect(x, y + 25 * k, right, y + 26 * k, paint);
                y += 51 * k;
            }

            // The brightest named stars well up in the sky.
            y += 40 * k;
            List<String[]> up = new ArrayList<>();
            for (int i = 0; i < names.length && up.size() < 3; i++) {
                if ("Matariki".equals(names[i])) continue;
                double[] h = horizon(namePos[2 * i], namePos[2 * i + 1], lst, lat);
                if (h[0] > 15) up.add(new String[] {names[i], compass(h[1]) + "  ·  " + Math.round(h[0]) + "°"});
            }
            text.setTextAlign(Paint.Align.LEFT);
            if (!up.isEmpty()) {
                text.setTypeface(Ui.semibold);
                text.setTextSize(22 * k);
                text.setLetterSpacing(0.08f);
                text.setColor(0x8CF7F6F2);
                c.drawText(Ui.tr("Estrelas brilhantes", "Bright stars", "Estrellas brillantes").toUpperCase(Ui.locale()), x, y, text);
                text.setLetterSpacing(0);
                text.setTextSize(28 * k);
                y += 50 * k;
                for (String[] s : up) {
                    text.setTypeface(Ui.semibold);
                    text.setColor(0xFFF7F6F2);
                    c.drawText(s[0], x, y, text);
                    float w = text.measureText(s[0] + "  ");
                    text.setTypeface(Ui.regular);
                    text.setColor(0x9EF7F6F2);
                    c.drawText(s[1], x + w, y, text);
                    y += 46 * k;
                }
            }
            text.setTypeface(Ui.regular);
            text.setTextSize(24 * k);
            text.setColor(0x73F7F6F2);
            c.drawText(Ui.tr("◀ ▶ uma hora por vez  ·  OK para agora", "◀ ▶ an hour at a time  ·  OK for now", "◀ ▶ una hora a la vez  ·  OK para ahora"),
                    x, 1025 * k, text);
        }

        private static boolean sameDay(long a, long b) {
            Calendar x = Calendar.getInstance(), y = Calendar.getInstance();
            x.setTimeInMillis(a);
            y.setTimeInMillis(b);
            return x.get(Calendar.YEAR) == y.get(Calendar.YEAR) && x.get(Calendar.DAY_OF_YEAR) == y.get(Calendar.DAY_OF_YEAR);
        }
    }
}
