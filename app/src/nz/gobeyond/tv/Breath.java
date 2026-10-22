package nz.gobeyond.tv;

import android.graphics.Canvas;
import android.graphics.Paint;

/**
 * The one rhythm everything on Beyond™ TV moves to: a slow breath, in for four tenths and out for six, the way a
 * resting person breathes. Six breaths a minute by day, slowing through the evening and slower again on the
 * screensaver, so the TV settles down with the house. The background, the four dots and the focus glow all read it,
 * so they rise and fall together instead of each doing its own thing.
 */
final class Breath {
    private Breath() {}

    /** Seconds per breath: 10 by day (six a minute), 13 at night, 16 on the screensaver. */
    static float period(float night, boolean dreaming) {
        return dreaming ? 16f : 10f + 3f * Ui.clamp(night);
    }

    /**
     * How full the breath is at `seconds`, 0 (out) to 1 (in). In is quicker than out and both ease at the turn, so it
     * never looks like a pulse. For a period that changes (dusk), use a Clock so the breath doesn't jump.
     */
    static float at(float seconds, float period) {
        float t = seconds / period;
        t -= (float) Math.floor(t);
        if (t < 0.4f) return (1 - (float) Math.cos(Math.PI * t / 0.4f)) / 2;
        return (1 + (float) Math.cos(Math.PI * (t - 0.4f) / 0.6f)) / 2;
    }

    /** Keeps the breath continuous when the period changes: integrates breaths rather than dividing the clock. */
    static final class Clock {
        private float phase, last = -1;

        /** Breath (0 to 1) at `seconds`, breathing at `period` since the last call. */
        float at(float seconds, float period) {
            if (last >= 0 && seconds > last) phase += (seconds - last) / period;
            last = seconds;
            phase -= (float) Math.floor(phase);
            return Breath.at(phase, 1);
        }
    }

    // MARK: - The four dots

    static final int MOSS = 0xFF2F7D6D, EMBER = 0xFFE8A33D, CORAL = 0xFFD85A30, BLUE = 0xFF378ADD;
    private static final int[] DOTS = {MOSS, EMBER, CORAL, BLUE};   // reading order: top left, top right, bottom...
    // ...but the breath goes round the square (top left, top right, bottom right, bottom left), like a held hand.
    private static final int[] ROUND = {0, 1, 3, 2};

    /**
     * Beyond's mark: four dots in a square, `size` across, centred on (cx, cy). Each dot breathes a little behind the
     * one before, so a breath travels round the square. `seconds` < 0 draws it still.
     */
    static void mark(Canvas c, Paint p, float cx, float cy, float size, float seconds, float period, float alpha) {
        float r = size * 0.22f, step = size * 0.56f / 2;
        p.setStyle(Paint.Style.FILL);
        for (int i = 0; i < 4; i++) {
            float b = seconds < 0 ? 0.5f : at(seconds - ROUND[i] * period * 0.09f, period);
            float x = cx + (i % 2 == 0 ? -step : step), y = cy + (i < 2 ? -step : step);
            // A soft halo first, only on the in-breath.
            if (b > 0.05f) {
                p.setColor(Ui.alpha(DOTS[i], 0.22f * b * alpha));
                c.drawCircle(x, y, r * (1.25f + 0.35f * b), p);
            }
            p.setColor(Ui.alpha(DOTS[i], alpha));
            c.drawCircle(x, y, r * (0.9f + 0.12f * b), p);
        }
    }
}
