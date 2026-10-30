/*
 * Tonight's sky: a star chart for where the TV is, and the moon (ADR 0023).
 *
 * The chart is the whole sky overhead: the middle is straight up, the edge is the horizon, north at the top and east
 * on the left, as when you lie on your back with your head to the north. Stars to magnitude 5 (what a suburban sky
 * shows), the constellation lines, the brightest stars' names and Matariki. Beside it the moon: its phase drawn the
 * way it looks from here (in the southern hemisphere a waxing moon is lit on the left), how much is lit, moonrise and
 * moonset, and the next full and new moon. Left and right move the sky an hour; OK comes back to now. In the daytime
 * it opens on tonight, once it's dark.
 *
 * Everything is worked out on the TV from the clock and the location (Place), no internet: star positions from
 * SKY_DATA (tools/make_sky.py), the sun and moon from the low-precision formulas in the Astronomical Almanac (about a
 * quarter of a degree for the moon, a minute or two for its rise and set). Same as SkyActivity.java: change one,
 * change both. Plain ES5; the chart is a canvas drawn once per hour moved, nothing animates.
 */
var Sky = (function () {
  'use strict';

  var D = Math.PI / 180, R = 440;  // the chart's radius, in px at 1920 wide

  function sin(x) { return Math.sin(x * D); }
  function cos(x) { return Math.cos(x * D); }
  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  /** Days since J2000.0 (12:00 UT, 1 January 2000). */
  function days(ms) { return ms / 86400000 + 2440587.5 - 2451545; }

  function equatorial(lon, lat, n) {
    var e = 23.439 - 0.0000004 * n;
    var ra = Math.atan2(sin(lon) * cos(e) - Math.tan(lat * D) * sin(e), cos(lon)) / D;
    return {ra: norm(ra), dec: Math.asin(sin(lat) * cos(e) + cos(lat) * sin(e) * sin(lon)) / D, lon: norm(lon)};
  }

  function sun(ms) {
    var n = days(ms), g = norm(357.528 + 0.9856003 * n);
    return equatorial(norm(280.460 + 0.9856474 * n) + 1.915 * sin(g) + 0.020 * sin(2 * g), 0, n);
  }

  /** The moon: position, its ecliptic longitude and its parallax (degrees). */
  function moon(ms) {
    var n = days(ms), t = n / 36525;
    var lon = 218.32 + 481267.881 * t + 6.29 * sin(135.0 + 477198.87 * t) - 1.27 * sin(259.3 - 413335.36 * t)
      + 0.66 * sin(235.7 + 890534.22 * t) + 0.21 * sin(269.9 + 954397.74 * t) - 0.19 * sin(357.5 + 35999.05 * t)
      - 0.11 * sin(186.5 + 966404.03 * t);
    var lat = 5.13 * sin(93.3 + 483202.02 * t) + 0.28 * sin(228.2 + 960400.89 * t) - 0.28 * sin(318.3 + 6003.15 * t)
      - 0.17 * sin(217.6 - 407332.21 * t);
    var par = 0.9508 + 0.0518 * cos(135.0 + 477198.87 * t) + 0.0095 * cos(259.3 - 413335.36 * t)
      + 0.0078 * cos(235.7 + 890534.22 * t) + 0.0028 * cos(269.9 + 954397.74 * t);
    var m = equatorial(norm(lon), lat, n);
    m.lat = lat;
    m.par = par;
    return m;
  }

  /** Local sidereal time, in degrees. */
  function sidereal(ms, lon) { return norm(280.46061837 + 360.98564736629 * days(ms) + lon); }

  /** Altitude and azimuth (from north, through east), in degrees. */
  function horizon(ra, dec, lst, lat) {
    var h = lst - ra;
    var alt = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(h)) / D;
    var az = Math.atan2(-sin(h) * cos(dec), sin(dec) * cos(lat) - cos(dec) * cos(h) * sin(lat)) / D;
    return {alt: alt, az: norm(az)};
  }

  function place() { return {lat: parseFloat(Place.lat), lon: parseFloat(Place.lon)}; }

  function sunAlt(ms, p) { var s = sun(ms); return horizon(s.ra, s.dec, sidereal(ms, p.lon), p.lat).alt; }

  /** The sun from the ground, {az, alt}. */
  function sunPlace(ms, p) { var s = sun(ms); return horizon(s.ra, s.dec, sidereal(ms, p.lon), p.lat); }

  /** The moon from the ground: the parallax lowers it by up to a degree. */
  function moonAt(ms, p) {
    var m = moon(ms), h = horizon(m.ra, m.dec, sidereal(ms, p.lon), p.lat);
    h.alt -= m.par * cos(h.alt);
    return h;
  }

  /** The first times between from and to that alt(ms) rises through and sets through h0. */
  function riseSet(alt, h0, from, to) {
    var out = {}, step = 600000, a = alt(from) - h0;
    for (var t = from + step; t <= to && !(out.rise && out.set); t += step) {
      var b = alt(t) - h0;
      if (a < 0 && b >= 0 && !out.rise) out.rise = t - step * b / (b - a);
      if (a >= 0 && b < 0 && !out.set) out.set = t - step * b / (b - a);
      a = b;
    }
    return out;
  }

  /** How far the moon is ahead of the sun along the ecliptic: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  function age(ms) { return norm(moon(ms).lon - sun(ms).lon); }

  function phase(ms) {
    var m = moon(ms), d = norm(m.lon - sun(ms).lon);
    var elong = Math.acos(cos(d) * cos(m.lat)) / D;
    return {age: d, lit: (1 - cos(elong)) / 2, waxing: d < 180, name: NAMES[Math.round(d / 45) % 8]};
  }

  /** When the moon's age next reaches target (0 for new, 180 for full), to the minute. */
  function next(ms, target) {
    function gap(t) { return norm(age(t) - target + 180) - 180; }  // -180..180, rising through 0 at the moment
    var step = 6 * 3600000, a = gap(ms), t = ms;
    for (var i = 0; i < 130; i++) {
      var b = gap(t + step);
      if (a < 0 && b >= 0 && b - a < 90) {
        var lo = t, hi = t + step;
        while (hi - lo > 60000) { var mid = (lo + hi) / 2; if (gap(mid) < 0) lo = mid; else hi = mid; }
        return hi;
      }
      t += step;
      a = b;
    }
    return 0;
  }

  var NAMES = [];
  function names() {
    NAMES = [
      tr('Lua nova', 'New moon', 'Luna nueva'), tr('Lua crescente', 'Waxing crescent', 'Luna creciente'),
      tr('Quarto crescente', 'First quarter', 'Cuarto creciente'), tr('Crescente gibosa', 'Waxing gibbous', 'Gibosa creciente'),
      tr('Lua cheia', 'Full moon', 'Luna llena'), tr('Minguante gibosa', 'Waning gibbous', 'Gibosa menguante'),
      tr('Quarto minguante', 'Last quarter', 'Cuarto menguante'), tr('Lua minguante', 'Waning crescent', 'Luna menguante')
    ];
  }

  /** N, NE, E and so on, in the TV's language. */
  function compass(az) {
    var en = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    var all = {pt: ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'], es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
      de: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'], ru: ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']};
    return (all[I18N.lang] || en)[Math.round(norm(az) / 45) % 8];
  }

  // MARK: - Drawing

  /** The moon's face, lit the way it looks from here. */
  function drawMoon(c, x, y, r, ph, south) {
    c.save();
    c.translate(x, y);
    c.fillStyle = '#2C2A40';
    c.beginPath();
    c.arc(0, 0, r, 0, 2 * Math.PI);
    c.fill();
    // Lit on the right while waxing in the north; the southern hemisphere sees it the other way round.
    if (ph.waxing === south) c.scale(-1, 1);
    var k = ph.lit;
    c.fillStyle = '#F2EEDF';
    c.beginPath();
    c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    c.scale(Math.max(0.001, Math.abs(1 - 2 * k)), 1);
    c.arc(0, 0, r, Math.PI / 2, -Math.PI / 2, k < 0.5);
    c.fill();
    c.restore();
  }

  function chart(canvas, ms, p) {
    var c = canvas.getContext('2d'), w = canvas.width, cx = w / 2, cy = w / 2, lst = sidereal(ms, p.lon);
    function at(ra, dec) {
      var h = horizon(ra, dec, lst, p.lat), r = R * (90 - h.alt) / 90;
      return {alt: h.alt, az: h.az, x: cx - r * sin(h.az), y: cy - r * cos(h.az)};
    }
    c.clearRect(0, 0, w, w);

    // The sky's disc, darker overhead, and the horizon.
    var g = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, '#070A1C');
    g.addColorStop(1, '#16193A');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, R, 0, 2 * Math.PI);
    c.fill();
    c.strokeStyle = 'rgba(247, 246, 242, 0.08)';
    c.lineWidth = 1;
    for (var ring = 1; ring <= 2; ring++) { c.beginPath(); c.arc(cx, cy, R * ring / 3, 0, 2 * Math.PI); c.stroke(); }
    c.save();
    c.beginPath();
    c.arc(cx, cy, R, 0, 2 * Math.PI);
    c.clip();

    // Constellation lines.
    var lines = SKY_DATA.lines;
    c.strokeStyle = 'rgba(158, 123, 255, 0.45)';
    c.lineWidth = 1.5;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i], prev = null;
      for (var j = 0; j < l.length; j += 2) {
        var pt = at(l[j], l[j + 1]);
        if (prev && prev.alt > -3 && pt.alt > -3) {
          c.beginPath();
          c.moveTo(prev.x, prev.y);
          c.lineTo(pt.x, pt.y);
          c.stroke();
        }
        prev = pt;
      }
    }

    // Stars: brighter is bigger.
    var s = SKY_DATA.stars;
    c.fillStyle = '#F7F6F2';
    for (var k = 0; k < s.length; k += 3) {
      var st = at(s[k], s[k + 1]);
      if (st.alt < 0) continue;
      var mag = s[k + 2], size = Math.max(0.9, 4.6 - 0.78 * mag);
      c.globalAlpha = mag < 3 ? 1 : 0.95 - (mag - 3) * 0.22;
      c.beginPath();
      c.arc(st.x, st.y, size, 0, 2 * Math.PI);
      c.fill();
    }
    c.globalAlpha = 1;

    // The moon, when it's up, then the names: the brightest stars and Matariki first, then the main
    // constellations, softly. A name that would land on one already written is left off.
    var placed = [];
    function label(text, x, y, font, colour) {
      c.font = font;
      var w = c.measureText(text).width, box = {l: x - w / 2 - 6, r: x + w / 2 + 6, t: y - 22, b: y + 6};
      for (var i = 0; i < placed.length; i++) {
        var o = placed[i];
        if (box.l < o.r && o.l < box.r && box.t < o.b && o.t < box.b) return;
      }
      placed.push(box);
      c.fillStyle = colour;
      c.fillText(text, x, y);
    }
    c.textAlign = 'center';
    var mp = moonAt(ms, p);
    if (mp.alt > -0.5) {
      var mr = R * (90 - mp.alt) / 90, mx = cx - mr * sin(mp.az), my = cy - mr * cos(mp.az);
      drawMoon(c, mx, my, 16, phase(ms), p.lat < 0);
      label(tr('Lua', 'Moon', 'Luna'), mx, my + 40, '600 21px Inter, Arial, sans-serif', '#F2EEDF');
    }
    // The Southern Cross before the stars' names: from Aotearoa it's the one people look for.
    var cons = SKY_DATA.cons, cross = '600 19px Inter, Arial, sans-serif', soft = 'rgba(190, 172, 255, 0.7)';
    for (var n = 0; n < cons.length; n++) {
      var cp = at(cons[n][0], cons[n][1]);
      if (cons[n][2] === 'Southern Cross' && cp.alt > 3) label(tr('Cruzeiro do Sul', 'Southern Cross', 'Cruz del Sur').toUpperCase(), cp.x, cp.y - 34, cross, soft);
    }
    var named = SKY_DATA.names;
    for (var q = 0; q < named.length; q++) {
      var np = at(named[q][0], named[q][1]), matariki = named[q][2] === 'Matariki';
      if (np.alt < 6) continue;
      label(matariki ? matarikiName() : named[q][2], np.x, np.y + 28, matariki ? '600 22px Inter, Arial, sans-serif' : '500 21px Inter, Arial, sans-serif',
        matariki ? '#E8A33D' : 'rgba(247, 246, 242, 0.85)');
    }
    for (var m = 0; m < cons.length; m++) {
      var mp2 = at(cons[m][0], cons[m][1]);
      if (cons[m][2] !== 'Southern Cross' && mp2.alt > 12) label(cons[m][2].toUpperCase(), mp2.x, mp2.y, cross, soft);
    }
    c.restore();

    // The horizon's edge and the four directions.
    c.strokeStyle = 'rgba(247, 246, 242, 0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, R, 0, 2 * Math.PI);
    c.stroke();
    c.fillStyle = 'rgba(247, 246, 242, 0.8)';
    c.font = '700 28px Sora, Inter, Arial, sans-serif';
    c.textBaseline = 'middle';
    c.fillText(compass(0), cx, cy - R - 26);
    c.fillText(compass(180), cx, cy + R + 26);
    c.fillText(compass(90), cx - R - 30, cy);
    c.fillText(compass(270), cx + R + 30, cy);
    c.textBaseline = 'alphabetic';
  }

  /** The Pleiades are Matariki in Aotearoa, and in te reo whatever the language. */
  function matarikiName() {
    return Place.country === 'NZ' || (window.Prefs && Prefs.kupu && Prefs.kupu()) ? 'Matariki' : tr('Plêiades', 'Pleiades', 'Pléyades');
  }

  /** The brightest named stars well up in the sky: [name, compass point, altitude]. */
  function bright(ms, p, count) {
    var lst = sidereal(ms, p.lon), out = [], named = SKY_DATA.names;
    for (var i = 0; i < named.length && out.length < count; i++) {
      if (named[i][2] === 'Matariki') continue;
      var h = horizon(named[i][0], named[i][1], lst, p.lat);
      if (h.alt > 15) out.push([named[i][2], compass(h.az), Math.round(h.alt)]);
    }
    return out;
  }

  // MARK: - The screen

  function day(ms) {
    var d = new Date(ms), dm = d.getDate() + '/' + (d.getMonth() + 1), wd = '';
    try { wd = d.toLocaleDateString(I18N.locale(), {weekday: 'long'}); } catch (e) { wd = ''; }
    return (wd ? wd.charAt(0).toUpperCase() + wd.slice(1) + ' ' : '') + dm;
  }

  /** In the daytime, the first time tonight that it's properly dark (the sun 12° down), to the hour. */
  function tonight(now, p) {
    if (sunAlt(now, p) < -6) return now;
    for (var t = now; t < now + 86400000; t += 600000) {
      if (sunAlt(t, p) < -12) { var d = new Date(t); d.setMinutes(0, 0, 0); return d.getTime() + 3600000; }
    }
    return now;
  }

  function open() {
    names();
    var p = place(), now = Date.now(), start = tonight(now, p), at = start;
    var canvas, side, hintBox;

    function render() {
      chart(canvas, at, p);
      side.innerHTML = '';
      hintBox.innerHTML = '';
      var live = Math.abs(at - Date.now()) < 1800000;
      UI.heading(side, tr('Céu de hoje à noite', 'Tonight\'s sky', 'El cielo de esta noche'),
        (Place.city ? Place.city + '  ·  ' : '') + (live ? tr('Agora', 'Now', 'Ahora') + ', ' : '') + Data.time(at)
        + (new Date(at).getDate() !== new Date().getDate() ? '  ·  ' + day(at) : ''));

      var ph = phase(at), moonBox = UI.el('div', 'moon', side), face = UI.el('canvas', 'face', moonBox);
      face.width = face.height = 200;
      drawMoon(face.getContext('2d'), 100, 100, 92, ph, p.lat < 0);
      var words = UI.el('div', 'words', moonBox);
      UI.el('div', 'name', words, ph.name);
      UI.el('div', 'lit', words, Math.round(ph.lit * 100) + '% ' + tr('iluminada', 'lit', 'iluminada'));
      var midnight = new Date(at); midnight.setHours(12, 0, 0, 0);
      var noon = midnight.getTime() - (new Date(at).getHours() < 12 ? 86400000 : 0);
      var ms = riseSet(function (t) { return moonAt(t, p).alt; }, 0.125, noon, noon + 86400000);
      var ss = riseSet(function (t) { return sunAlt(t, p); }, -0.833, noon, noon + 86400000);
      var rows = UI.el('div', 'rows', side);
      function row(label, value) {
        if (!value) return;
        var r = UI.el('div', 'row', rows);
        UI.el('span', 'label', r, label);
        UI.el('span', 'value', r, value);
      }
      row(tr('Nascer da lua', 'Moonrise', 'Salida de la luna'), ms.rise ? Data.time(ms.rise) : '');
      row(tr('Pôr da lua', 'Moonset', 'Puesta de la luna'), ms.set ? Data.time(ms.set) : '');
      row(tr('Pôr do sol', 'Sunset', 'Puesta del sol'), ss.set ? Data.time(ss.set) : '');
      row(tr('Nascer do sol', 'Sunrise', 'Salida del sol'), ss.rise ? Data.time(ss.rise) : '');
      var full = next(at, 180), fresh = next(at, 0);
      row(NAMES[4], full ? day(full) : '');
      row(NAMES[0], fresh ? day(fresh) : '');

      var stars = bright(at, p, 3);
      if (stars.length) {
        UI.el('div', 'bt-label', side, tr('Estrelas brilhantes', 'Bright stars', 'Estrellas brillantes'));
        var list = UI.el('div', 'stars', side);
        for (var i = 0; i < stars.length; i++) {
          var s = UI.el('div', 'star', list);
          UI.el('b', '', s, stars[i][0]);
          UI.el('span', '', s, stars[i][1] + '  ·  ' + stars[i][2] + '°');
        }
      }
      UI.el('div', 'hint', hintBox, tr('◀ ▶ uma hora por vez  ·  OK para agora  ·  ▼ olhar em volta', '◀ ▶ an hour at a time  ·  OK for now  ·  ▼ look around', '◀ ▶ una hora a la vez  ·  OK para ahora  ·  ▼ mirar alrededor'));
    }

    function move(hours) { at += hours * 3600000; render(); }

    return UI.open({
      cls: 'bt-sky',
      build: function (layer, a) {
        canvas = UI.el('canvas', 'chart', layer);
        canvas.width = canvas.height = 2 * R + 120;
        side = UI.el('div', 'side', layer);
        hintBox = UI.el('div', 'hints', layer);
        a.add(UI.el('div', 'hold', layer), function () { at = start === now ? Date.now() : tonight(Date.now(), p); render(); },
          {first: true, left: function () { move(-1); }, right: function () { move(1); }});
        if (window.SkyLook) a.add(UI.button(UI.el('div', 'lookbox', layer), tr('Olhar em volta', 'Look around', 'Mirar alrededor'), null), function () { SkyLook.open(); });
        render();
      }
    });
  }

  /** For the home screen's Tonight card: the moon's phase now, {name, lit (0..1), emoji}. */
  function moonNow() {
    names();
    var ph = phase(Date.now()), south = parseFloat(Place.lat) < 0;
    // The emoji are drawn as the north sees them; south of the equator the waxing ones look like the waning ones.
    var north = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'], i = Math.round(ph.age / 45) % 8;
    return {name: ph.name, lit: ph.lit, emoji: north[south ? (8 - i) % 8 : i]};
  }

  /** What Look around (skylook.js) builds on: the same sun, moon and star positions, so there is one set of sums. */
  var core = {init: names, place: place, sidereal: sidereal, horizon: horizon, moonAt: moonAt, sunAlt: sunAlt, sunPlace: sunPlace,
    phase: phase, drawMoon: drawMoon, compass: compass, matarikiName: matarikiName, tonight: tonight};

  return {open: open, moon: moonNow, core: core, _test: {sun: sun, moon: moon, phase: phase, next: next, riseSet: riseSet, moonAt: moonAt, sunAlt: sunAlt}};
})();
