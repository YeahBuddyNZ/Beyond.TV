#!/usr/bin/env python3
"""Draws the tiles for our own mix channels (ADR 0065) into docs/live/logos/<id>.jpg: the channel's colour, Beyond's
four dots and its name in Sora. live_now.py keeps the other logos (each channel's own picture from YouTube).

Usage: python3 tools/mix_logos.py docs/live
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

DOTS = ['#2F7D6D', '#E8A33D', '#D85A30', '#378ADD']
FONT = os.path.join(os.path.dirname(__file__), '..', 'app', 'assets', 'fonts', 'SoraVariable.ttf')


def draw(name, colour, path, size=352):
    big = size * 3
    img = Image.new('RGB', (big, big), colour)
    d = ImageDraw.Draw(img)
    light = sum(int(colour[i:i + 2], 16) for i in (1, 3, 5)) > 600
    ink = '#22221F' if light else '#FFFFFF'
    r, gap = big // 26, big // 11
    x0, y0 = big // 2 - int(1.5 * gap), int(big * 0.27)
    for i, c in enumerate(DOTS):
        d.ellipse([x0 + i * gap - r, y0 - r, x0 + i * gap + r, y0 + r], fill=c)
    font = ImageFont.truetype(FONT, big // 6)
    try:
        font.set_variation_by_axes([700])
    except Exception:
        pass
    words = name.split(' ', 1)
    y = int(big * 0.42)
    for w in words:
        box = d.textbbox((0, 0), w, font=font)
        d.text(((big - (box[2] - box[0])) / 2 - box[0], y), w, font=font, fill=ink)
        y += int(big * 0.2)
    img.resize((size, size), Image.LANCZOS).save(path, quality=90)


def main(folder):
    for c in json.load(open(os.path.join(folder, 'channels.json')))['channels']:
        if c.get('mix'):
            draw(c['name'], c.get('colour', '#2C2458'), os.path.join(folder, 'logos', c['id'] + '.jpg'))


if __name__ == '__main__':
    main(sys.argv[1])
