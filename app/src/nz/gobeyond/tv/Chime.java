package nz.gobeyond.tv;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

/**
 * Beyond's start chime: four soft notes, one for each of the four dots, rising over a low hum. Warm and slow, so the TV
 * coming on feels like a hello rather than an alert. Played when the TV comes on and when the tidy-up race starts,
 * only while Home Settings > Sounds is on. The same notes as web/chime.js and Spaces' screens (ADR 0012):
 *
 *   hum   G3 196.00 Hz, up to 0.05 over 0.5 s, fades out by 3.0 s
 *   notes G4 392.00, B4 493.88, D5 587.33, F#5 739.99 Hz at 0.10, 0.34, 0.58 and 0.82 s
 *         each a sine with its octave at 0.15, rising to 0.12 in 0.05 s, then dying away (time constant 0.45 s)
 *         over 2.2 s
 *
 * Made here as sound, not shipped as a file. Off the main thread.
 */
final class Chime {
    private Chime() {}

    static final int RATE = 44100;
    static final float[] NOTES = {392.00f, 493.88f, 587.33f, 739.99f};
    static final float[] AT = {0.10f, 0.34f, 0.58f, 0.82f};
    private static short[] pcm;

    /** The chime as 16-bit mono samples, made once. */
    static synchronized short[] samples() {
        if (pcm != null) return pcm;
        int len = Math.round(RATE * 3.2f);
        float[] mix = new float[len];
        for (int i = 0; i < len; i++) {
            float t = i / (float) RATE;
            float hum = t < 0.5f ? t / 0.5f : t > 2.2f ? Math.max(0, (3.0f - t) / 0.8f) : 1;
            mix[i] += (float) (Math.sin(2 * Math.PI * 196.00 * t) * 0.05f * hum);
        }
        for (int n = 0; n < NOTES.length; n++) {
            int start = Math.round(RATE * AT[n]), dur = Math.round(RATE * 2.2f);
            for (int i = 0; i < dur && start + i < len; i++) {
                float t = i / (float) RATE;
                float env = t < 0.05f ? t / 0.05f : (float) Math.exp(-(t - 0.05f) / 0.45f);
                if (t > 2.1f) env *= (2.2f - t) / 0.1f;   // no click at the end
                double w = 2 * Math.PI * NOTES[n] * t;
                mix[start + i] += (float) ((Math.sin(w) + 0.15 * Math.sin(2 * w)) * 0.12f * env);
            }
        }
        pcm = new short[len];
        for (int i = 0; i < len; i++) pcm[i] = (short) Math.round(Math.max(-1, Math.min(1, mix[i])) * Short.MAX_VALUE);
        return pcm;
    }

    /** Plays it once, when Sounds is on. */
    static void play() {
        if (!Prefs.sounds()) return;
        new Thread(() -> {
            AudioTrack track = null;
            try {
                short[] s = samples();
                track = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                        .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                        .setTransferMode(AudioTrack.MODE_STATIC).setBufferSizeInBytes(s.length * 2).build();
                track.write(s, 0, s.length);
                track.play();
                Thread.sleep(3400);
            } catch (Throwable ignored) {
                // Sound is a nicety.
            } finally {
                if (track != null) track.release();
            }
        }, "beyond-chime").start();
    }
}
