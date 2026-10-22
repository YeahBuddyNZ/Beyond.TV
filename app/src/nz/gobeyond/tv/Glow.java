package nz.gobeyond.tv;

import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;

/**
 * Beyond's breathing background, for every TV (it needs no shaders, so Android 8 gets it too): a gradient from
 * near-black to deep violet, or paper to the faintest lilac by day, with three soft violet lights drifting under it
 * that swell on the in-breath and fade on the out-breath. Gradients are made once per size; drawing allocates nothing.
 */
final class Glow {
    static final int INK = 0xFF0D0C18, PLUM = 0xFF2C2458, VIOLET = 0xFF6E3DDB, VIOLET_TEXT = 0xFF6135D6,
            LILAC = 0xFF9E7BFF, PAPER = 0xFFF7F6F2, MIST = 0xFFEDE8F8;

    // Each light: colour, resting place (fractions of the screen), radius (of the height), drift and its speed.
    private static final int[] COLOR = {VIOLET, LILAC, 0xFF7B4FE0};
    private static final float[][] AT = {{0.16f, 0.88f}, {0.84f, 0.16f}, {0.58f, 0.62f}};
    private static final float[] RADIUS = {0.95f, 0.8f, 0.6f}, DRIFT = {0.07f, 0.06f, 0.09f}, SPEED = {0.021f, 0.017f, 0.027f};

    private final Paint base = new Paint(Paint.DITHER_FLAG);
    private final Paint light = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
    private final RadialGradient[] lights = new RadialGradient[3];
    private final Matrix m = new Matrix();
    private LinearGradient day, dark;
    private int w, h;

    Glow() {
        for (int i = 0; i < 3; i++) {
            lights[i] = new RadialGradient(0, 0, 1, new int[] {COLOR[i], Ui.alpha(COLOR[i], 0.45f), COLOR[i] & 0xFFFFFF},
                    new float[] {0, 0.45f, 1}, Shader.TileMode.CLAMP);
        }
    }

    void setSize(int width, int height) {
        if (width == w && height == h) return;
        w = Math.max(1, width);
        h = Math.max(1, height);
        // Top left to bottom right, like the Beyond™ card.
        dark = new LinearGradient(0, 0, w * 0.6f, h, INK, PLUM, Shader.TileMode.CLAMP);
        day = new LinearGradient(0, 0, w * 0.6f, h, PAPER, MIST, Shader.TileMode.CLAMP);
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
        float glow = strength * (0.14f + 0.36f * night) * (0.62f + 0.38f * breath);
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
    }
}
