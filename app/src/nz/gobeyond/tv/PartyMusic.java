package nz.gobeyond.tv;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

import java.util.Random;

/**
 * Party mode's music, made here as sound rather than shipped as a file, so there is nothing to license. Same tune as
 * web/party.js (ADR 0016):
 *
 *   An 8 second loop at 120 beats a minute: four bars, A minor, F, C, G.
 *   kick   every beat, a sine falling from 150 to 45 Hz, dying away over 0.12 s
 *   clap   beats 2 and 4, a burst of noise over 0.06 s
 *   hat    every off-beat eighth, sharpened noise over 0.015 s
 *   bass   every off-beat eighth, the chord's root, a sine and its octave at half, 0.2 s
 *   arp    every sixteenth, up and down the chord an octave above, soft, 0.12 s
 *
 * A birthday starts with the Happy Birthday tune (the melody is out of copyright; no words) on a music box, then the
 * loop. Off the main thread. Plays whatever Sounds says: a party is music.
 */
final class PartyMusic {
    static final int RATE = 22050;
    static final float BEAT = 0.5f, STEP = BEAT / 4;
    static final int STEPS = 64;                                  // four bars of sixteenths
    static final float LOOP = STEPS * STEP;                       // 8 s
    static final float[] ROOTS = {110.00f, 87.31f, 130.81f, 98.00f};
    static final float[][] ARP = {
            {440.00f, 523.25f, 659.25f, 523.25f},
            {349.23f, 440.00f, 523.25f, 440.00f},
            {392.00f, 523.25f, 659.25f, 523.25f},
            {392.00f, 493.88f, 587.33f, 493.88f},
    };
    // Happy Birthday in C: notes in Hz and their lengths in beats of 0.6 s.
    static final float[] TUNE = {
            392.00f, 392.00f, 440.00f, 392.00f, 523.25f, 493.88f,
            392.00f, 392.00f, 440.00f, 392.00f, 587.33f, 523.25f,
            392.00f, 392.00f, 783.99f, 659.25f, 523.25f, 493.88f, 440.00f,
            698.46f, 698.46f, 659.25f, 523.25f, 587.33f, 523.25f};
    static final float[] TUNE_BEATS = {
            0.75f, 0.25f, 1, 1, 1, 2,
            0.75f, 0.25f, 1, 1, 1, 2,
            0.75f, 0.25f, 1, 1, 1, 1, 2,
            0.75f, 0.25f, 1, 1, 1, 3};
    static final float TUNE_BEAT = 0.6f;

    private static short[] loop, tune;

    /** Seconds of tune before the loop starts: 0 for a disco. */
    static float introLength(boolean birthday) {
        if (!birthday) return 0;
        float beats = 0;
        for (float b : TUNE_BEATS) beats += b;
        return beats * TUNE_BEAT + 0.4f;
    }

    private static float soft(float x) {
        // Rounds off peaks rather than clipping them.
        if (x > 3) return 1;
        if (x < -3) return -1;
        return x * (27 + x * x) / (27 + 9 * x * x);
    }

    private static short[] pcm(float[] mix) {
        short[] out = new short[mix.length];
        for (int i = 0; i < mix.length; i++) out[i] = (short) Math.round(soft(mix[i] * 0.8f) * Short.MAX_VALUE);
        return out;
    }

    /** One tone added into mix: a sine with an overtone, attack then dying away with time constant tau. */
    private static void tone(float[] mix, float at, float freq, int over, float overAmp, float amp, float tau, float len) {
        int start = Math.round(at * RATE), n = Math.round(len * RATE);
        for (int i = 0; i < n; i++) {
            int j = (start + i) % mix.length;
            float t = i / (float) RATE;
            float env = t < 0.005f ? t / 0.005f : (float) Math.exp(-t / tau);
            if (t > len - 0.01f) env *= (len - t) / 0.01f;
            double w = 2 * Math.PI * freq * t;
            mix[j] += (float) ((Math.sin(w) + overAmp * Math.sin(over * w)) * amp * env);
        }
    }

    static synchronized short[] loop() {
        if (loop != null) return loop;
        float[] mix = new float[Math.round(LOOP * RATE)];
        Random noise = new Random(16);
        for (int s = 0; s < STEPS; s++) {
            int bar = s / 16, inBeat = s % 4, inBar = s % 16;
            float at = s * STEP;
            if (inBeat == 0) {
                // Kick: the pitch falls fast, so the phase is added up sample by sample.
                int start = Math.round(at * RATE), n = Math.round(0.3f * RATE);
                double phase = 0;
                for (int i = 0; i < n; i++) {
                    float t = i / (float) RATE;
                    phase += 2 * Math.PI * (45 + 105 * Math.exp(-t / 0.03)) / RATE;
                    mix[(start + i) % mix.length] += (float) (Math.sin(phase) * 0.9 * Math.exp(-t / 0.12));
                }
            }
            if (inBar == 4 || inBar == 12) {
                int start = Math.round(at * RATE), n = Math.round(0.2f * RATE);
                for (int i = 0; i < n; i++) {
                    float t = i / (float) RATE;
                    mix[(start + i) % mix.length] += (float) ((noise.nextFloat() * 2 - 1) * 0.35 * Math.exp(-t / 0.06));
                }
            }
            if (inBeat == 2) {
                int start = Math.round(at * RATE), n = Math.round(0.06f * RATE);
                float prev = 0;
                for (int i = 0; i < n; i++) {
                    float t = i / (float) RATE, x = noise.nextFloat() * 2 - 1;
                    mix[(start + i) % mix.length] += (float) ((x - prev) * 0.12 * Math.exp(-t / 0.015));
                    prev = x;
                }
                tone(mix, at, ROOTS[bar], 2, 0.5f, 0.2f, 0.12f, 0.2f);
            }
            tone(mix, at, ARP[bar][s % 4], 3, 0.25f, 0.06f, 0.08f, 0.12f);
        }
        loop = pcm(mix);
        return loop;
    }

    static synchronized short[] tune() {
        if (tune != null) return tune;
        float[] mix = new float[Math.round(introLength(true) * RATE)];
        float at = 0.1f;
        for (int i = 0; i < TUNE.length; i++) {
            float len = Math.min(TUNE_BEATS[i] * TUNE_BEAT, 1.2f) + 0.3f;
            tone(mix, at, TUNE[i], 2, 0.3f, 0.18f, 0.35f, Math.min(len, mix.length / (float) RATE - at));
            at += TUNE_BEATS[i] * TUNE_BEAT;
        }
        tune = pcm(mix);
        return tune;
    }

    private volatile boolean playing;
    private volatile AudioTrack track;

    /** Plays the tune (for a birthday) then the loop until stop(). */
    void start(final boolean birthday) {
        playing = true;
        new Thread(() -> {
            AudioTrack t = null;
            try {
                short[] l = loop(), b = birthday ? tune() : null;
                int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
                t = new AudioTrack.Builder()
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                        .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                        .setTransferMode(AudioTrack.MODE_STREAM).setBufferSizeInBytes(Math.max(min, RATE)).build();
                track = t;
                t.play();
                if (b != null) write(t, b);
                while (playing) write(t, l);
            } catch (Throwable ignored) {
                // Music is a nicety: the lights carry on without it.
            } finally {
                track = null;
                if (t != null) {
                    try { t.stop(); } catch (Throwable ignored) {}
                    t.release();
                }
            }
        }, "beyond-party").start();
    }

    private void write(AudioTrack t, short[] s) {
        for (int off = 0; off < s.length && playing; ) {
            int n = t.write(s, off, Math.min(4096, s.length - off));
            if (n <= 0) return;
            off += n;
        }
    }

    /** Seconds of music heard so far, or -1 before it starts; the lights dance to this. */
    float heard() {
        AudioTrack t = track;
        if (t == null) return -1;
        try {
            return t.getPlaybackHeadPosition() / (float) RATE;
        } catch (Throwable e) {
            return -1;
        }
    }

    void stop() { playing = false; }
}
