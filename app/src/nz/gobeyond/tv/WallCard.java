package nz.gobeyond.tv;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The family wall on the screensaver (ADR 0067), as web/wall.js draws it there: one sticky or one of the week's wins at
 * a time, a card in the top left over the photo or the painting. Drawn once into a bitmap off the UI thread when the
 * photo changes, so the screensaver's frame loop only draws a bitmap. Null when the wall is empty.
 */
final class WallCard {
    private WallCard() {
    }

    /** The i-th thing on the wall (stickies first, then wins), drawn at scale k, or null. */
    static Bitmap render(int i, float k) {
        JSONObject all = null;
        try { all = new JSONObject(Family.wallJson()).optJSONObject("wall"); } catch (Exception ignored) { }
        if (all == null) return null;
        JSONArray stickies = all.optJSONArray("stickies"), wins = all.optJSONArray("wins");
        int ns = stickies == null ? 0 : stickies.length(), nw = wins == null ? 0 : wins.length();
        if (ns + nw == 0) return null;
        int at = Math.floorMod(i, ns + nw);
        JSONObject item = at < ns ? stickies.optJSONObject(at) : wins.optJSONObject(at - ns);
        if (item == null) return null;
        boolean sticky = at < ns;

        int bg, ink;
        String label;
        if (sticky) {
            String colour = item.optString("colour", "ember");
            bg = "moss".equals(colour) ? 0xFF2F7D6D : "ink".equals(colour) ? 0xFFF7F6F2 : 0xFFE8A33D;
            ink = "moss".equals(colour) ? 0xFFF7F6F2 : 0xFF22221F;
            label = "";
        } else {
            bg = 0xE62C2458;
            ink = 0xFFF7F6F2;
            String kind = item.optString("kind");
            label = "green".equals(kind) ? Ui.tr("Lá fora", "Outside", "Afuera")
                    : "bonus".equals(kind) ? Ui.tr("Sem ninguém pedir", "Without being asked", "Sin que nadie lo pida")
                    : "award".equals(kind) ? Ui.tr("Prêmio", "Award", "Premio") : Ui.tr("Feito", "Done", "Hecho");
        }
        String words = item.optString("text");
        String who = sticky ? "" : item.optString("name");

        float width = 560 * k, pad = 30 * k;
        TextPaint head = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        head.setTypeface(Ui.semibold);
        head.setTextSize(22 * k);
        head.setLetterSpacing(0.06f);
        head.setColor(0xB3F7F6F2);
        head.setShadowLayer(10 * k, 0, 2 * k, 0x99000000);
        TextPaint big = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        big.setTypeface(Ui.displaySemibold);
        big.setTextSize(34 * k);
        big.setColor(ink);
        TextPaint small = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        small.setTypeface(Ui.semibold);
        small.setTextSize(21 * k);
        small.setColor(sticky ? ink : 0xFF9E7BFF);

        int textW = Math.round(width - 2 * pad);
        StaticLayout text = StaticLayout.Builder.obtain(words, 0, words.length(), big, textW)
                .setMaxLines(3).setEllipsize(TextUtils.TruncateAt.END).setAlignment(Layout.Alignment.ALIGN_NORMAL).setIncludePad(false).build();
        float headH = 40 * k, labelH = label.isEmpty() ? 0 : 36 * k, whoH = who.isEmpty() ? 0 : 44 * k;
        float cardH = pad + labelH + text.getHeight() + whoH + pad;
        Bitmap out = Bitmap.createBitmap(Math.round(width + 40 * k), Math.round(headH + cardH + 40 * k), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(out);
        c.drawText(Ui.tr("NO MURAL", "ON THE WALL", "EN EL MURO"), 0, 24 * k, head);

        Paint card = new Paint(Paint.ANTI_ALIAS_FLAG);
        card.setColor(bg);
        card.setShadowLayer(30 * k, 0, 14 * k, 0x59000000);
        RectF r = new RectF(0, headH, width, headH + cardH);
        c.save();
        if (sticky) c.rotate(-1f, r.centerX(), r.centerY());
        c.drawRoundRect(r, 26 * k, 26 * k, card);
        c.restore();

        float y = headH + pad;
        if (!label.isEmpty()) {
            small.setColor(0xFF9E7BFF);
            c.drawText(label.toUpperCase(java.util.Locale.ROOT), pad, y + 22 * k, small);
            y += labelH;
        }
        c.save();
        c.translate(pad, y);
        text.draw(c);
        c.restore();
        y += text.getHeight();
        if (!who.isEmpty()) {
            Paint dot = new Paint(Paint.ANTI_ALIAS_FLAG);
            dot.setColor(Family.colour(item.optString("colour"), 0xFF6E3DDB));
            c.drawCircle(pad + 7 * k, y + 22 * k, 7 * k, dot);
            small.setColor(ink);
            c.drawText(who, pad + 24 * k, y + 30 * k, small);
        }
        return out;
    }
}
