package nz.gobeyond.tv;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;

/**
 * The light show's "Listen to the room" on Google TV (ADR 0050): the room's music through a microphone, read by the
 * app itself rather than the WebView, so it can pick the right one. A USB microphone or webcam comes first, then a
 * microphone built into the TV, then whatever Android offers. The WebView always took Android's default, which on most
 * Google TVs is the remote's microphone: that one only listens while its button is held, so the show heard nothing.
 *
 * Only levels leave this class: how loud each pitch is and the shape of the wave, the same strings TvSound gives, plus
 * the loudest sample of the last moment so the page can tell a microphone that's asleep (exact digital silence) from a
 * quiet room (a real microphone always hisses a little). The sound itself is never kept, written or sent: each block
 * is read into the same small buffer and overwritten by the next. Needs RECORD_AUDIO, asked once when someone picks it.
 */
final class RoomSound {
    private static final int N = 2048;

    private AudioRecord rec;
    private Thread reader;
    private volatile boolean running;
    private int rate = 48000;
    private String kind = "";

    // Written by the reader thread, read by the page's thread: guarded by this.
    private final float[] ring = new float[N];
    private int ringAt;
    private float peak;
    private final float[] smooth = new float[N / 2];
    private final float[] re = new float[N], im = new float[N], window = new float[N];
    private final char[] fftOut = new char[N / 2], waveOut = new char[N / 2];

    RoomSound() {
        // Blackman, as the browser's AnalyserNode uses, so the looks read the same whichever way the sound comes in.
        for (int i = 0; i < N; i++) {
            double x = 2 * Math.PI * i / (N - 1);
            window[i] = (float) (0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x));
        }
    }

    /** Which microphone to use: USB first, then the TV's own, then null for Android's default. */
    static AudioDeviceInfo best(Context c) {
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return null;
        AudioDeviceInfo usb = null, builtIn = null;
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
            int t = d.getType();
            if (usb == null && (t == AudioDeviceInfo.TYPE_USB_DEVICE || t == AudioDeviceInfo.TYPE_USB_HEADSET)) usb = d;
            else if (builtIn == null && t == AudioDeviceInfo.TYPE_BUILTIN_MIC) builtIn = d;
        }
        return usb != null ? usb : builtIn;
    }

    /** Whether any microphone could be there: one built in (often the remote's) or one plugged in. */
    static boolean any(Context c) {
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return false;
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) {
            int t = d.getType();
            if (t == AudioDeviceInfo.TYPE_USB_DEVICE || t == AudioDeviceInfo.TYPE_USB_HEADSET || t == AudioDeviceInfo.TYPE_BUILTIN_MIC
                    || t == AudioDeviceInfo.TYPE_WIRED_HEADSET || t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) return true;
        }
        return false;
    }

    /** Starts listening; "usb", "tv" or "other" for the microphone it got, or "" when the TV wouldn't let us. */
    synchronized String start(Context c) {
        if (rec != null) return kind;
        AudioDeviceInfo dev = best(c);
        int[] rates = {48000, 44100, 16000};
        for (int r : rates) {
            int min = AudioRecord.getMinBufferSize(r, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            if (min <= 0) continue;
            AudioRecord a = null;
            try {
                a = new AudioRecord(MediaRecorder.AudioSource.MIC, r, AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT, Math.max(min, N * 4));
                if (a.getState() != AudioRecord.STATE_INITIALIZED) { a.release(); continue; }
                if (dev != null) a.setPreferredDevice(dev);
                a.startRecording();
                if (a.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) { a.release(); continue; }
            } catch (Throwable t) {
                if (a != null) try { a.release(); } catch (Throwable ignored) {}
                continue;
            }
            rec = a;
            rate = r;
            kind = dev == null ? "other" : dev.getType() == AudioDeviceInfo.TYPE_BUILTIN_MIC ? "tv" : "usb";
            peak = 0;
            ringAt = 0;
            java.util.Arrays.fill(ring, 0);
            java.util.Arrays.fill(smooth, 0);
            running = true;
            final AudioRecord mine = a;
            reader = new Thread(() -> read(mine), "BeyondTV-room");
            reader.start();
            return kind;
        }
        return "";
    }

    private void read(AudioRecord a) {
        short[] buf = new short[512];
        while (running) {
            int n;
            try { n = a.read(buf, 0, buf.length); } catch (Throwable t) { break; }
            if (n <= 0) { if (n < 0) break; continue; }
            synchronized (this) {
                float p = 0;
                for (int i = 0; i < n; i++) {
                    float v = buf[i] / 32768f;
                    ring[ringAt] = v;
                    ringAt = (ringAt + 1) % N;
                    float abs = v < 0 ? -v : v;
                    if (abs > p) p = abs;
                }
                // The loudest of the last few blocks, so a single quiet block doesn't hide the room.
                peak = Math.max(p, peak * 0.9f);
            }
        }
    }

    synchronized boolean on() { return rec != null; }

    synchronized void stop() {
        running = false;
        if (rec != null) {
            try { rec.stop(); } catch (Throwable ignored) {}
            try { rec.release(); } catch (Throwable ignored) {}
        }
        rec = null;
        reader = null;
        kind = "";
    }

    synchronized int nyquist() { return rate / 2; }

    /** The loudest sample lately, 0 to 1. Exactly 0 means the microphone is giving nothing at all. */
    synchronized float peak() { return peak; }

    /**
     * How loud each pitch is, 0 to 255 on the AnalyserNode's scale (-85 to -20 dB, smoothing 0.78), from the last 2048
     * samples.
     */
    synchronized String fft() {
        if (rec == null) return "";
        for (int i = 0; i < N; i++) { re[i] = ring[(ringAt + i) % N] * window[i]; im[i] = 0; }
        fftInPlace(re, im);
        for (int k = 0; k < N / 2; k++) {
            float mag = (float) Math.sqrt(re[k] * re[k] + im[k] * im[k]) / N;
            smooth[k] = smooth[k] * 0.78f + mag * 0.22f;
            double db = 20 * Math.log10(smooth[k] + 1e-9);
            int v = (int) Math.round((db + 85) / 65 * 255);
            fftOut[k] = (char) Math.max(0, Math.min(255, v));
        }
        return new String(fftOut);
    }

    /** The shape of the wave, the last 1024 samples as 0 to 255 with 128 the middle. */
    synchronized String wave() {
        if (rec == null) return "";
        int n = waveOut.length;
        for (int i = 0; i < n; i++) {
            float v = ring[(ringAt + N - n + i) % N];
            int b = Math.round(128 + v * 127);
            waveOut[i] = (char) Math.max(0, Math.min(255, b));
        }
        return new String(waveOut);
    }

    /** Radix-2, in place, n a power of two. */
    static void fftInPlace(float[] re, float[] im) {
        int n = re.length;
        for (int i = 1, j = 0; i < n; i++) {
            int bit = n >> 1;
            for (; (j & bit) != 0; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                float t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }
        for (int len = 2; len <= n; len <<= 1) {
            double ang = -2 * Math.PI / len;
            float wr = (float) Math.cos(ang), wi = (float) Math.sin(ang);
            for (int i = 0; i < n; i += len) {
                float cr = 1, ci = 0;
                for (int k = 0; k < len / 2; k++) {
                    int a = i + k, b = a + len / 2;
                    float xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
                    re[b] = re[a] - xr; im[b] = im[a] - xi;
                    re[a] += xr; im[a] += xi;
                    float nr = cr * wr - ci * wi;
                    ci = cr * wi + ci * wr;
                    cr = nr;
                }
            }
        }
    }
}
