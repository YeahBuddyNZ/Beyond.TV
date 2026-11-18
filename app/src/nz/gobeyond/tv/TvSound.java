package nz.gobeyond.tv;

import android.media.audiofx.Visualizer;

/**
 * The light show's "The TV's sound" on Google TV (ADR 0044): Android's Visualizer on the TV's whole output (session
 * 0), so music playing in another app (Spotify, YouTube Music, a radio app) can be drawn. It only ever gives levels: the
 * loudness of each pitch and the shape of the wave, a few hundred numbers a frame, read on the TV and never kept or
 * sent. Needs RECORD_AUDIO, asked once when someone picks it.
 *
 * The page asks for a frame each time it draws (fft() and wave()), as strings of chars 0 to 255, which cross the
 * WebView's bridge without any encoding. Some TVs refuse session 0: start() then says so and the page offers the room's microphone instead.
 */
final class TvSound {
    private Visualizer vis;
    private byte[] fftRaw, waveRaw;
    private float[] smooth;
    private char[] fftOut, waveOut;

    /** True when the TV let us listen to its output. */
    synchronized boolean start() {
        if (vis != null) return true;
        try {
            Visualizer v = new Visualizer(0);
            int[] range = Visualizer.getCaptureSizeRange();
            int size = Math.max(range[0], Math.min(range[1], 1024));
            v.setEnabled(false);
            v.setCaptureSize(size);
            v.setScalingMode(Visualizer.SCALING_MODE_NORMALIZED);
            v.setEnabled(true);
            vis = v;
            fftRaw = new byte[size];
            waveRaw = new byte[size];
            smooth = new float[size / 2];
            fftOut = new char[size / 2];
            waveOut = new char[size];
            return true;
        } catch (Throwable t) {
            stop();
            return false;
        }
    }

    synchronized boolean on() { return vis != null; }

    synchronized void stop() {
        if (vis != null) {
            try { vis.setEnabled(false); } catch (Throwable ignored) {}
            try { vis.release(); } catch (Throwable ignored) {}
        }
        vis = null;
    }

    /** Half the sampling rate in Hz, so the page can place its bars by pitch. */
    synchronized int nyquist() {
        try { return vis == null ? 22050 : vis.getSamplingRate() / 2000; } catch (Throwable t) { return 22050; }
    }

    /**
     * How loud each pitch is, 0 to 255 on the same decibel scale the browser's AnalyserNode uses (-85 to -20 dB), with
     * the same smoothing, so the looks work the same whichever way the sound comes in.
     */
    synchronized String fft() {
        if (vis == null) return "";
        try {
            if (vis.getFft(fftRaw) != Visualizer.SUCCESS) return "";
        } catch (Throwable t) {
            return "";
        }
        int n = smooth.length;
        for (int k = 0; k < n; k++) {
            float re, im;
            if (k == 0) { re = fftRaw[0]; im = 0; } else { re = fftRaw[2 * k]; im = fftRaw[2 * k + 1]; }
            float mag = (float) Math.sqrt(re * re + im * im) / 128f;
            smooth[k] = smooth[k] * 0.78f + mag * 0.22f;
            double db = 20 * Math.log10(smooth[k] + 1e-6);
            int v = (int) Math.round((db + 85) / 65 * 255);
            fftOut[k] = (char) Math.max(0, Math.min(255, v));
        }
        return new String(fftOut);
    }

    /** The wave itself, 0 to 255 with silence at 128, like the browser's getByteTimeDomainData. */
    synchronized String wave() {
        if (vis == null) return "";
        try {
            if (vis.getWaveForm(waveRaw) != Visualizer.SUCCESS) return "";
        } catch (Throwable t) {
            return "";
        }
        for (int i = 0; i < waveRaw.length; i++) waveOut[i] = (char) (waveRaw[i] & 0xFF);
        return new String(waveOut);
    }
}
