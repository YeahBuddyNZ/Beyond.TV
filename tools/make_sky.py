"""Builds the star chart's data (web/skydata.js and app/assets/sky.json) from d3-celestial's catalogue.

Usage: python3 -I tools/make_sky.py DATA_DIR
DATA_DIR holds stars.6.json, starnames.json, constellations.json and constellations.lines.json from
github.com/ofrohn/d3-celestial (data/, BSD licence, LICENSE-d3-celestial.txt). Stars come from the Hipparcos
catalogue (XHIP). Positions are J2000 right ascension and declination in degrees.

Kept small for old TVs: stars to magnitude 5, positions to a hundredth of a degree, every constellation's lines,
the names of the brightest stars, the main constellations' names, and Matariki at Alcyone, the brightest of the
Pleiades.
"""
import json
import os
import sys

MAG = 5.0          # the faintest star drawn: about what a suburban sky shows
NAMED = 1.7        # stars this bright get their name
# The constellations named on the chart: the big ones (d3-celestial's rank 1) and the Southern Cross.
EXTRA = {"Cru"}
# The name people know better.
ALIAS = {"Rigil Kentaurus": "Alpha Centauri"}


def ra(x):
    return round(x % 360, 2)


def main():
    src = sys.argv[1]
    load = lambda name: json.load(open(os.path.join(src, name), encoding="utf-8"))
    stars, names = load("stars.6.json"), load("starnames.json")
    cons, lines = load("constellations.json"), load("constellations.lines.json")

    flat, labels = [], []
    for f in stars["features"]:
        mag = f["properties"]["mag"]
        if mag > MAG:
            continue
        lon, dec = f["geometry"]["coordinates"]
        flat += [ra(lon), round(dec, 2), round(mag, 2)]
        name = names.get(str(f["id"]), {}).get("name", "")
        if name == "Alcyone":
            labels.append([ra(lon), round(dec, 2), "Matariki", -9])
        elif name and mag <= NAMED and name != "Toliman":   # Toliman sits on top of Rigil Kentaurus
            labels.append([ra(lon), round(dec, 2), ALIAS.get(name, name), mag])

    # Brightest first: the chart names them in this order and skips a name with no room.
    labels = [l[:3] for l in sorted(labels, key=lambda l: l[3])]

    out_lines = []
    for f in lines["features"]:
        for part in f["geometry"]["coordinates"]:
            pts = []
            for lon, dec in part:
                pts += [ra(lon), round(dec, 2)]
            out_lines.append(pts)

    out_cons = []
    for f in cons["features"]:
        p = f["properties"]
        if p["rank"] == "1" or f["id"] in EXTRA:
            lon, dec = f["geometry"]["coordinates"]
            name = "Southern Cross" if f["id"] == "Cru" else p["name"]
            out_cons.append([ra(lon), round(dec, 2), name])

    data = {"stars": flat, "lines": out_lines, "names": labels, "cons": out_cons}
    text = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    with open(os.path.join(root, "app", "assets", "sky.json"), "w", encoding="utf-8") as f:
        f.write(text)
    with open(os.path.join(root, "web", "skydata.js"), "w", encoding="utf-8") as f:
        f.write("/* The star chart's data, made by tools/make_sky.py from d3-celestial (BSD, LICENSE-d3-celestial.txt). */\n")
        f.write("var SKY_DATA = " + text + ";\n")
    print("%d stars, %d lines, %d names, %d constellations, %d bytes" % (len(flat) // 3, len(out_lines), len(labels), len(out_cons), len(text)))


if __name__ == "__main__":
    main()
