"""Draws the app icon, the TV banner and the site's images (Pillow). Usage: python3 tools/make_art.py

The mark is Beyond's four dots (moss, ember, coral, blue) on an ink screen with a small stand, so it reads as the
Beyond family of apps and as a TV at a glance. The wordmark is Sora, the same face Beyond Family uses.
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORA = os.path.join(ROOT, "app/assets/fonts/SoraVariable.ttf")
INK = (34, 34, 31)
PAPER = (247, 246, 242)
DOTS = [(47, 125, 109), (232, 163, 61), (216, 90, 48), (55, 138, 221)]   # moss, ember, coral, blue


def dots(d, cx, cy, r, gap):
    """The four brand dots in a 2 x 2 grid centred on (cx, cy)."""
    off = r + gap / 2
    for i, c in enumerate(DOTS):
        x = cx + (off if i % 2 else -off)
        y = cy + (off if i // 2 else -off)
        d.ellipse((x - r, y - r, x + r, y + r), fill=c + (255,))


def mark(size, bg=True):
    """The app icon: the dots on an ink squircle with a paper stand (bg), or the dots and stand alone."""
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * 0.23), fill=INK + (255,))
    dots(d, s * 0.5, s * 0.45, s * 0.125, s * 0.05)
    stand = PAPER if bg else INK
    d.rounded_rectangle((s * 0.34, s * 0.78, s * 0.66, s * 0.815), radius=int(s * 0.0175), fill=stand + (255,))
    return img.resize((size, size), Image.LANCZOS)


def font(px, weight=700):
    f = ImageFont.truetype(SORA, px)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def banner(w=640, h=360):
    """Android TV's launcher banner: the dots and "Beyond™ TV" in paper on ink, the ™ small and raised."""
    s = 4
    img = Image.new("RGBA", (w * s, h * s), INK + (255,))
    d = ImageDraw.Draw(img)
    size = int(h * 0.16 * s)
    f, small = font(size), font(int(size * 0.38))
    parts = [("Beyond", f, 0), ("\u2122", small, -0.42 * size), (" TV", f, 0)]
    widths = [d.textlength(t, font=pf) for t, pf, _ in parts]
    box = d.textbbox((0, 0), "Beyond TV", font=f)
    r, gap = h * 0.055 * s, h * 0.022 * s
    mark_w = 4 * r + gap
    space = int(w * 0.045 * s)
    total = mark_w + space + sum(widths)
    x = (w * s - total) / 2
    dots(d, x + mark_w / 2, h * s / 2, r, gap)
    y = (h * s - (box[3] - box[1])) / 2 - box[1]
    tx = x + mark_w + space - box[0]
    base = y + f.getmetrics()[0]
    for (t, pf, lift), tw in zip(parts, widths):
        d.text((tx, base + lift), t, font=pf, fill=PAPER + (255,), anchor="ls")
        tx += tw
    return img.resize((w, h), Image.LANCZOS)


if __name__ == "__main__":
    res = os.path.join(ROOT, "app/res/drawable-nodpi")
    os.makedirs(res, exist_ok=True)
    mark(192).save(os.path.join(res, "icon.png"))
    banner().save(os.path.join(res, "banner.png"))
    mark(80).save(os.path.join(ROOT, "webos/icon.png"))
    mark(130).save(os.path.join(ROOT, "webos/largeIcon.png"))
    mark(512).save(os.path.join(ROOT, "tizen/icon.png"))
    site = os.path.join(ROOT, "docs/assets")
    os.makedirs(site, exist_ok=True)
    mark(512).save(os.path.join(site, "icon-512.png"))
    mark(180).save(os.path.join(site, "apple-touch-icon.png"))
    mark(64).save(os.path.join(site, "favicon-64.png"))
    banner(1280, 720).save(os.path.join(site, "banner.png"))
    print("ok")
