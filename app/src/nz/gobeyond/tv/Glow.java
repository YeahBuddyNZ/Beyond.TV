package nz.gobeyond.tv;

import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;

/**
 * Beyond's breathing background, for every TV (it needs no shaders, so Android 8 gets it too): a gradient from
 * near-black to deep violet, or soft white to lilac by day, with three violet lights drifting under it that swell on
 * the in-breath and fade on the out-breath, and a scatter of tiny sparkles rising slowly and twinkling, like dust in a
 * sunbeam by day and stars at night. Gradients are made once per size; drawing allocates nothing.
 */
final class Glow {
    static final int INK = 0xFF0D0C18, PLUM = 0xFF2C2458, VIOLET = 0xFF6E3DDB, VIOLET_TEXT = 0xFF6135D6,
            LILAC = 0xFF9E7BFF, PAPER = 0xFFF7F6F2, MIST = 0xFFEDE8F8;
    // By day: near white at the top left, lilac at the bottom right. Light enough that ink text stays easy to read.
    private static final int DAY_FROM = 0xFFF6F2FF, DAY_TO = 0xFFD3C2F7;
    private static final int SPARKS = 42;

    // Each light: colour, resting place (fractions of the screen), radius (of the height), drift and its speed.
    private static final int[] COLOR = {VIOLET, LILAC, 0xFF7B4FE0};
    private static final float[][] AT = {{0.16f, 0.88f}, {0.84f, 0.16f}, {0.58f, 0.62f}};
    private static final float[] RADIUS = {0.95f, 0.8f, 0.6f}, DRIFT = {0.07f, 0.06f, 0.09f}, SPEED = {0.021f, 0.017f, 0.027f};

    private final Paint base = new Paint(Paint.DITHER_FLAG);
    private final Paint light = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
    private final Paint spark = new Paint(Paint.ANTI_ALIAS_FLAG);
    // Each sparkle: where it starts (fractions), size (of the height), how fast it rises and twinkles, its phase.
    private final float[] sx = new float[SPARKS], sy = new float[SPARKS], size = new float[SPARKS],
            rise = new float[SPARKS], twinkle = new float[SPARKS], phase = new float[SPARKS];
    private final RadialGradient[] lights = new RadialGradient[3];
    private final Matrix m = new Matrix();
    private LinearGradient day, dark;
    private int w, h;

    Glow() {
        for (int i = 0; i < 3; i++) {
            lights[i] = new RadialGradient(0, 0, 1, new int[] {COLOR[i], Ui.alpha(COLOR[i], 0.45f), COLOR[i] & 0xFFFFFF},
                    new float[] {0, 0.45f, 1}, Shader.TileMode.CLAMP);
        }
        // The same sky every time (a fixed seed): a few bigger ones, most of them tiny.
        java.util.Random r = new java.util.Random(23);
        for (int i = 0; i < SPARKS; i++) {
            sx[i] = r.nextFloat();
            sy[i] = r.nextFloat();
            float big = r.nextFloat();
            size[i] = big > 0.88f ? 0.0045f : big > 0.6f ? 0.0028f : 0.0017f;
            rise[i] = 0.004f + r.nextFloat() * 0.008f;
            twinkle[i] = 0.25f + r.nextFloat() * 0.5f;
            phase[i] = r.nextFloat() * 6.2832f;
        }
    }

    void setSize(int width, int height) {
        if (width == w && height == h) return;
        w = Math.max(1, width);
        h = Math.max(1, height);
        // Top left to bottom right, like the Beyond™ card.
        dark = new LinearGradient(0, 0, w * 0.6f, h, INK, PLUM, Shader.TileMode.CLAMP);
        day = new LinearGradient(0, 0, w * 0.6f, h, DAY_FROM, DAY_TO, Shader.TileMode.CLAMP);
    }

    /** night: 0 = the paper look, 1 = the dark one; breath: 0 to 1 (Breath); strength scales the lights (0 to 1). */
    void draw(Canvas c, float seconds, float breath, float night, float strength) {
        if (dark == null) return;
        night = Ui.clamp(night);
        base.setAlpha(255);
        if (night < 0.999f) {
            base.setShader(day);
            c.drawRect(0, 0, w, h, base);
        }
        if (night > 0.001f) {
            base.setShader(dark);
            base.setAlpha(Math.round(255 * night));
            c.drawRect(0, 0, w, h, base);
        }
        float glow = strength * (0.42f + 0.08f * night) * (0.62f + 0.38f * breath);
        for (int i = 0; i < 3; i++) {
            float t = seconds * SPEED[i] * 6.2832f;
            float x = w * (AT[i][0] + DRIFT[i] * (float) Math.sin(t)), y = h * (AT[i][1] + DRIFT[i] * (float) Math.cos(t * 0.83f + i));
            float r = h * RADIUS[i] * (1 + 0.07f * breath);
            m.setScale(r, r);
            m.postTranslate(x, y);
            lights[i].setLocalMatrix(m);
            light.setShader(lights[i]);
            light.setAlpha(Math.round(255 * Ui.clamp(glow)));
            c.drawCircle(x, y, r, light);
        }
        drawSparkles(c, seconds, breath, night, strength);
    }

    /** Violet specks by day, white and lilac at night; each fades in and out on its own and drifts up off the top. */
    private void drawSparkles(Canvas c, float seconds, float breath, float night, float strength) {
        int dayColour = VIOLET, nightColour = 0xFFFFFFFF;
        float most = strength * (0.55f + 0.35f * night) * (0.8f + 0.2f * breath);
        for (int i = 0; i < SPARKS; i++) {
            float y = sy[i] - seconds * rise[i];
            y -= (float) Math.floor(y);
            float x = sx[i] + 0.012f * (float) Math.sin(seconds * 0.11f + phase[i]);
            float tw = 0.5f + 0.5f * (float) Math.sin(seconds * twinkle[i] + phase[i]);
            // Fade in from the bottom edge and out at the top, so nothing pops.
            float edge = Math.min(1, Math.min(y, 1 - y) * 8);
            float a = most * tw * tw * edge;
            if (a < 0.02f) continue;
            spark.setColor(i % 5 == 0 ? LILAC : night > 0.5f ? nightColour : dayColour);
            spark.setAlpha(Math.round(255 * Ui.clamp(a)));
            float px = x * w, py = y * h, rad = size[i] * h * (0.8f + 0.4f * tw);
            c.drawCircle(px, py, rad, spark);
            if (size[i] > 0.004f) {
                // The bigger ones get a little four-point glint.
                spark.setAlpha(Math.round(255 * Ui.clamp(a * 0.6f)));
                spark.setStrokeWidth(Math.max(1, rad * 0.35f));
                c.drawLine(px - rad * 3.2f, py, px + rad * 3.2f, py, spark);
                c.drawLine(px, py - rad * 3.2f, px, py + rad * 3.2f, spark);
            }
        }
    }
}
