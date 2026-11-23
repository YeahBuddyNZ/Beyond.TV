package nz.gobeyond.tv;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * The family's own photos and the kids' art for the screensaver (ADR 0061). Each one arrives from a phone through
 * PhotoDrop and is drawn once, at the screensaver's photo size, then kept in the app's own files: a photo fills the
 * screen (a portrait one sits over a soft, dark copy of itself), a drawing hangs on a purple wall in a white mat with
 * the artist's name under it. They stay on the TV and never go anywhere else. Speaks Recs.Pick like Art, so DreamView
 * only swaps the source.
 */
final class FamilyPhotos {
    /** The most kept; past it, the oldest goes. */
    static final int MOST = 300;
    /** A drawing after every this many photos. */
    static final int ART_EVERY = 2;
    private static final int W = 2112, H = 1188;

    private static File dir(Context c) {
        File d = new File(c.getFilesDir(), "photos");
        d.mkdirs();
        return d;
    }

    private static File[] files(Context c) {
        File[] all = dir(c).listFiles((d, n) -> n.endsWith(".jpg"));
        if (all == null) return new File[0];
        Arrays.sort(all, (a, b) -> a.getName().compareTo(b.getName()));
        return all;
    }

    /** How many, remembered in this process so Settings can show it in every frame without reading the folder. */
    private static volatile int known = -1;

    static int count(Context c) {
        if (known < 0) known = files(c).length;
        return known;
    }

    static synchronized void clear(Context c) {
        for (File f : files(c)) f.delete();
        known = 0;
    }

    /** Photos with the art mixed in. Each pick's id is its place in the list, so a drawing shown twice is two slides. */
    static List<Recs.Pick> showcase(Context c) {
        List<File> photos = new ArrayList<>(), art = new ArrayList<>();
        for (File f : files(c)) (f.getName().startsWith("a-") ? art : photos).add(f);
        List<File> order = PhotoDrop.mix(photos, art, ART_EVERY);
        List<Recs.Pick> out = new ArrayList<>();
        for (int i = 0; i < order.size(); i++) {
            File f = order.get(i);
            Recs.Pick p = new Recs.Pick();
            p.id = i;
            p.kind = f.getName().startsWith("a-") ? "art" : "photo";
            p.title = "";
            p.backdrop = f.getAbsolutePath();
            out.add(p);
        }
        return out;
    }

    static File readyImage(Recs.Pick p) {
        if (p.backdrop == null) return null;
        File f = new File(p.backdrop);
        return f.exists() ? f : null;
    }

    /** Draws and keeps one picture from a phone; false if it isn't a picture. Runs on PhotoDrop's thread. */
    static synchronized boolean save(Context c, byte[] picture, boolean art, String by) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(picture, 0, picture.length, o);
        if (o.outWidth <= 0 || o.outHeight <= 0) return false;
        int sample = 1;
        while (o.outWidth / (sample * 2) >= W && o.outHeight / (sample * 2) >= H) sample *= 2;
        o = new BitmapFactory.Options();
        o.inSampleSize = sample;
        Bitmap source;
        try {
            source = BitmapFactory.decodeByteArray(picture, 0, picture.length, o);
        } catch (OutOfMemoryError e) {
            return false;
        }
        if (source == null) return false;
        Bitmap out = null;
        try {
            out = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(out);
            if (art) hang(canvas, source, by);
            else fill(canvas, source);
            File f = new File(dir(c), (art ? "a-" : "p-") + System.currentTimeMillis() + ".jpg");
            try (FileOutputStream os = new FileOutputStream(f)) {
                out.compress(Bitmap.CompressFormat.JPEG, 88, os);
            }
            File[] all = files(c);
            for (int i = 0; i < all.length - MOST; i++) all[i].delete();
            known = Math.min(all.length, MOST);
            return true;
        } catch (Exception | OutOfMemoryError e) {
            AppLog.w("family photos: " + e.getMessage());
            return false;
        } finally {
            source.recycle();
            if (out != null) out.recycle();
        }
    }

    /** A photo fills the screen; a tall one is fitted over a blurred, darkened copy of itself. */
    private static void fill(Canvas c, Bitmap s) {
        Paint p = new Paint(Paint.FILTER_BITMAP_FLAG);
        float ratio = s.getWidth() / (float) s.getHeight();
        if (ratio >= 1.3f) {
            c.drawBitmap(s, crop(s.getWidth(), s.getHeight(), W / (float) H), new Rect(0, 0, W, H), p);
            return;
        }
        // The soft background: very small, then stretched back up, is a cheap blur.
        Bitmap tiny = Bitmap.createScaledBitmap(s, 32, Math.max(1, Math.round(32 / ratio)), true);
        c.drawBitmap(tiny, crop(tiny.getWidth(), tiny.getHeight(), W / (float) H), new Rect(0, 0, W, H), p);
        tiny.recycle();
        c.drawColor(0x8C000000);
        float h = H, w = h * ratio;
        c.drawBitmap(s, null, new RectF((W - w) / 2, 0, (W + w) / 2, h), p);
    }

    /** A drawing on the wall: violet, a white mat with a soft shadow, and who drew it underneath. */
    private static void hang(Canvas c, Bitmap s, String by) {
        Paint wall = new Paint();
        wall.setShader(new LinearGradient(0, 0, 0, H, 0xFF2C2458, 0xFF0D0C18, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, W, H, wall);
        boolean named = by != null && !by.trim().isEmpty();
        float boxW = 1500, boxH = named ? 860 : 940, mat = 44;
        float ratio = s.getWidth() / (float) s.getHeight();
        float w = boxW, h = w / ratio;
        if (h > boxH) {
            h = boxH;
            w = h * ratio;
        }
        float top = (H - h - (named ? 110 : 0)) / 2;
        RectF picture = new RectF((W - w) / 2, top, (W + w) / 2, top + h);
        RectF frame = new RectF(picture.left - mat, picture.top - mat, picture.right + mat, picture.bottom + mat);
        Paint shadow = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadow.setColor(0x99000000);
        shadow.setMaskFilter(new BlurMaskFilter(36, BlurMaskFilter.Blur.NORMAL));
        c.drawRect(frame.left, frame.top + 24, frame.right, frame.bottom + 24, shadow);
        Paint white = new Paint();
        white.setColor(0xFFF7F6F2);
        c.drawRect(frame, white);
        c.drawBitmap(s, null, picture, new Paint(Paint.FILTER_BITMAP_FLAG));
        if (named) {
            Paint label = new Paint(Paint.ANTI_ALIAS_FLAG);
            label.setColor(0xFFF7F6F2);
            label.setTextSize(52);
            label.setTypeface(Ui.displaySemibold != null ? Ui.displaySemibold : Typeface.DEFAULT_BOLD);
            label.setTextAlign(Paint.Align.CENTER);
            c.drawText(byLine(by.trim()), W / 2f, frame.bottom + 96, label);
        }
    }

    static String byLine(String name) {
        return Ui.tr("Por " + name, "By " + name, "Por " + name);
    }

    /** The middle part of a w×h picture with the given shape. */
    private static Rect crop(int w, int h, float shape) {
        if (w / (float) h > shape) {
            int cw = Math.round(h * shape);
            return new Rect((w - cw) / 2, 0, (w + cw) / 2, h);
        }
        int ch = Math.round(w / shape);
        return new Rect(0, (h - ch) / 2, w, (h + ch) / 2);
    }
}
