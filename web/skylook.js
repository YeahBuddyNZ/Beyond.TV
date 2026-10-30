/*
 * Look around (ADR 0036): the sky as you'd see it standing outside. Tonight's sky (sky.js) is the whole sky flattened
 * onto a disc; this is a window onto it. The arrows turn the view (left and right a step round the compass, up and
 * down tilt it) and it glides there; the horizon, the four directions, the stars, the constellation lines, the moon
 * and the sun are all drawn where they really are from here. Whatever sits in the middle of the screen is named, with
 * where it is and a line about it. OK opens Find, which turns the view to something: the Moon, the Southern Cross,
 * Matariki or the brightest star up, or moves the time. Later a phone's compass can point the view too (aim).
 *
 * The maths is sky.js's (Sky.core), so there is one sun, one moon and one set of star positions; this file only
 * projects them. Plain ES5; the canvas is redrawn only while the view is moving or the time has moved on.
 */
var SkyLook = (function () {
  'use strict';

  var D = Math.PI / 180, W = 1920, H = 1080, SCALE = 900;
  var STEP_AZ = 20, STEP_ALT = 12, MIN_ALT = -6, MAX_ALT = 90;

  function sin(x) { return Math.sin(x * D); }
  function cos(x) { return Math.cos(x * D); }
  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  /** A direction in the horizon's frame: x east, y north, z up. */
  function vec(az, alt) { return [cos(alt) * sin(az), cos(alt) * cos(az), sin(alt)]; }

  /** The way the view is turned, as the three directions the screen is built from: forward, right and up. */
  function frame(az, alt) {
    return {
      f: [cos(alt) * sin(az), cos(alt) * cos(az), sin(alt)],
      r: [cos(az), -sin(az), 0],
      u: [-sin(alt) * sin(az), -sin(alt) * cos(az), cos(alt)]
    };
  }

  /** A stereographic projection: a direction → a point on the 1920 × 1080 stage, or null when it's behind us. */
  function project(fr, v) {
    var d = v[0] * fr.f[0] + v[1] * fr.f[1] + v[2] * fr.f[2];
    if (d < -0.4) return null;
    var k = 2 * SCALE / (1 + d);
    return {
      x: W / 2 + k * (v[0] * fr.r[0] + v[1] * fr.r[1] + v[2] * fr.r[2]),
      y: H / 2 - k * (v[0] * fr.u[0] + v[1] * fr.u[1] + v[2] * fr.u[2]),
      d: d
    };
  }

  /** The angle between two directions, in degrees. */
  function between(a, b) { return Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)) / D; }

  /** Where a direction is, as {az, alt}. */
  function toHorizon(v) { return {az: norm(Math.atan2(v[0], v[1]) / D), alt: Math.asin(clamp(v[2], -1, 1)) / D}; }

  // MARK: - What's up there

  var BLURBS = null;

  function blurbs() {
    BLURBS = {
      'Southern Cross': tr('Quatro estrelas em forma de pipa. Siga o braço longo cerca de quatro vezes e meia o seu comprimento e você encontra o sul.',
        'Four bright stars like a kite. Follow its long arm about four and a half times its length and you are looking at due south.',
        'Cuatro estrellas brillantes como una cometa. Sigue su brazo largo unas cuatro veces y media y mirarás al sur.'),
      'Matariki': tr('Um aglomerado de estrelas. Em Aotearoa, a sua subida no meio do inverno marca o ano novo maori.',
        'A tight cluster of stars. In Aotearoa its rising in midwinter starts the Māori new year.',
        'Un cúmulo de estrellas. En Aotearoa, su salida en pleno invierno comienza el año nuevo maorí.'),
      'Pleiades': tr('Um aglomerado de estrelas, as Sete Irmãs, a olho nu.',
        'A tight cluster of stars, the Seven Sisters, easy to see without a telescope.',
        'Un cúmulo de estrellas, las Siete Hermanas, fácil de ver a simple vista.'),
      'Orion': tr('Procure as três estrelas em fila, o cinturão. No sul ele aparece de cabeça para baixo.',
        'Look for the three stars in a row, the belt. From the south he stands on his head.',
        'Busca las tres estrellas en fila, el cinturón. Desde el sur se ve boca abajo.'),
      'Scorpius': tr('Um gancho de estrelas com Antares, vermelha, no coração. Sobe alto no inverno do sul.',
        'A hook of stars with red Antares at its heart. It rides high in the southern winter.',
        'Un gancho de estrellas con la roja Antares en el corazón. Sube alto en el invierno del sur.'),
      'Sirius': tr('A estrela mais brilhante de toda a noite.', 'The brightest star in the whole night sky.',
        'La estrella más brillante de toda la noche.'),
      'Canopus': tr('A segunda mais brilhante da noite, muito baixa no norte e alta no sul.',
        'The second brightest star of the night, and high up from down here.',
        'La segunda estrella más brillante de la noche, y alta desde aquí.'),
      'Alpha Centauri': tr('A estrela mais próxima do nosso sol, a pouco mais de quatro anos-luz.',
        'The closest star to our sun, a little over four light years away.',
        'La estrella más cercana a nuestro sol, a poco más de cuatro años luz.'),
      'Sun': tr('Nunca olhe direto para ele.', 'Never look straight at it.', 'Nunca lo mires directamente.')
    };
  }

  /** The kind of thing, in words. */
  function kindName(kind) {
    return {star: tr('Estrela', 'Star', 'Estrella'), cluster: tr('Aglomerado', 'Star cluster', 'Cúmulo'),
      constellation: tr('Constelação', 'Constellation', 'Constelación'), moon: tr('Lua', 'Moon', 'Luna'),
      sun: tr('Sol', 'Sun', 'Sol')}[kind] || '';
  }

  /** The things worth naming, with the direction each is in at this moment. */
  function things(ms, p) {
    var core = Sky.core, lst = core.sidereal(ms, p.lon), out = [], i, h;
    function add(kind, name, ra, dec, reach, key) {
      h = core.horizon(ra, dec, lst, p.lat);
      out.push({kind: kind, name: name, key: key || name, v: vec(h.az, h.alt), reach: reach});
    }
    var named = SKY_DATA.names;
    for (i = 0; i < named.length; i++) {
      var m = named[i][2] === 'Matariki';
      add(m ? 'cluster' : 'star', m ? core.matarikiName() : named[i][2], named[i][0], named[i][1], m ? 6 : 5, m ? (core.matarikiName() === 'Matariki' ? 'Matariki' : 'Pleiades') : named[i][2]);
    }
    var cons = SKY_DATA.cons;
    for (i = 0; i < cons.length; i++) {
      var south = cons[i][2] === 'Southern Cross';
      add('constellation', south ? tr('Cruzeiro do Sul', 'Southern Cross', 'Cruz del Sur') : cons[i][2], cons[i][0], cons[i][1], south ? 9 : 13, cons[i][2]);
    }
    var mn = core.moonAt(ms, p), sn = core.sunPlace(ms, p);
    out.push({kind: 'moon', name: tr('Lua', 'Moon', 'Luna'), key: 'Moon', v: vec(mn.az, mn.alt), reach: 7});
    out.push({kind: 'sun', name: tr('Sol', 'Sun', 'Sol'), key: 'Sun', v: vec(sn.az, sn.alt), reach: 7});
    return out;
  }

  /** The line that goes with a thing: what the moon looks like tonight, or the line about it. */
  function aboutText(t, ms) {
    if (t.kind === 'moon') {
      var ph = Sky.core.phase(ms);
      return ph.name + '  ·  ' + Math.round(ph.lit * 100) + '% ' + tr('iluminada', 'lit', 'iluminada');
    }
    return BLURBS[t.key] || '';
  }

  /** "South-west, 34° up". */
  function whereText(v) {
    var h = toHorizon(v);
    return Sky.core.compass(h.az) + '  ·  ' + (h.alt >= 0 ? Math.round(h.alt) + '° ' + tr('acima do horizonte', 'up', 'sobre el horizonte')
      : tr('abaixo do horizonte', 'below the horizon', 'bajo el horizonte'));
  }

  /** The thing the middle of the screen is closest to, if any is close enough: the nearest by how much of its reach is used. */
  function nearest(list, f) {
    var best = null, bestScore = 1;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.kind === 'sun' && t.v[2] < -0.02) continue;
      var score = between(f, t.v) / t.reach;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  /** How dark it is: 0 in daylight to 1 at night, from the sun's height. */
  function darkness(sunAlt) { return clamp((-2 - sunAlt) / 12, 0, 1); }

  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  /** The time as the TV shows it, for the corner. */
  function timeText(ms) {
    try { return new Date(ms).toLocaleTimeString(I18N.locale(), {hour: 'numeric', minute: '2-digit'}); } catch (e) { return ''; }
  }

  // MARK: - The screen

  function open() {
    var core = Sky.core;
    core.init();
    blurbs();
    var p = core.place(), real = Date.now(), at = core.tonight(real, p), live = at === real;
    var az = 180, alt = 38, toAz = az, toAlt = alt;
    var canvas, c, card, corner, timer = null, dirty = true, cacheAt = -1, cache = null, shown = '';

    /** Everything that only changes with the time: where each star is, as a direction. Rebuilt every half minute at most. */
    function refresh() {
      var lst = core.sidereal(at, p.lon), s = SKY_DATA.stars, i, j, h;
      var stars = [], mags = [], lines = [];
      for (i = 0; i < s.length; i += 3) {
        h = core.horizon(s[i], s[i + 1], lst, p.lat);
        stars.push(vec(h.az, h.alt));
        mags.push(s[i + 2]);
      }
      var l = SKY_DATA.lines;
      for (i = 0; i < l.length; i++) {
        var one = [];
        for (j = 0; j < l[i].length; j += 2) {
          h = core.horizon(l[i][j], l[i][j + 1], lst, p.lat);
          one.push(vec(h.az, h.alt));
        }
        lines.push(one);
      }
      var sunAlt = core.sunAlt(at, p), mn = core.moonAt(at, p), sn = core.sunPlace(at, p);
      cache = {stars: stars, mags: mags, lines: lines, things: things(at, p), sunAlt: sunAlt, dark: darkness(sunAlt),
        moon: vec(mn.az, mn.alt), sun: vec(sn.az, sn.alt), phase: core.phase(at)};
      cacheAt = at;
    }

    function draw() {
      if (cacheAt !== at || (live && Date.now() - cacheAt > 30000)) { if (live) at = Date.now(); refresh(); }
      var fr = frame(az, alt), dark = cache.dark, i, j, pt, prev;
      // The sky, from deep night to day, and the ground below the horizon.
      c.fillStyle = mix([52, 112, 190], [5, 7, 26], dark);
      c.fillRect(0, 0, W, H);
      var glow = c.createLinearGradient(0, 0, 0, H);
      glow.addColorStop(0, 'rgba(0,0,0,0.35)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, W, H);

      // Constellation lines and stars. Stars fade out with the daylight.
      if (dark > 0.02) {
        c.globalAlpha = dark;
        c.strokeStyle = 'rgba(158, 123, 255, 0.5)';
        c.lineWidth = 2;
        for (i = 0; i < cache.lines.length; i++) {
          prev = null;
          for (j = 0; j < cache.lines[i].length; j++) {
            pt = project(fr, cache.lines[i][j]);
            if (prev && pt && cache.lines[i][j][2] > -0.05 && cache.lines[i][j - 1][2] > -0.05) {
              c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(pt.x, pt.y); c.stroke();
            }
            prev = pt;
          }
        }
        c.fillStyle = '#F7F6F2';
        for (i = 0; i < cache.stars.length; i++) {
          var sv = cache.stars[i];
          if (sv[2] < 0) continue;
          pt = project(fr, sv);
          if (!pt || pt.x < -20 || pt.x > W + 20 || pt.y < -20 || pt.y > H + 20) continue;
          var mag = cache.mags[i], size = Math.max(1.2, 6.2 - 1.05 * mag);
          c.globalAlpha = dark * (mag < 3 ? 1 : 0.95 - (mag - 3) * 0.2);
          c.beginPath(); c.arc(pt.x, pt.y, size, 0, 2 * Math.PI); c.fill();
        }
        c.globalAlpha = 1;
      }

      // The ground: everything below the horizon, with the directions along its edge.
      var edge = [];
      for (var a = -88; a <= 88; a += 2) {
        pt = project(fr, vec(az + a, 0));
        if (pt) edge.push(pt);
      }
      if (edge.length > 1) {
        c.beginPath();
        c.moveTo(edge[0].x, edge[0].y);
        for (i = 1; i < edge.length; i++) c.lineTo(edge[i].x, edge[i].y);
        c.lineTo(edge[edge.length - 1].x, H + 60);
        c.lineTo(edge[0].x, H + 60);
        c.closePath();
        c.fillStyle = mix([40, 62, 52], [8, 9, 20], dark);
        c.fill();
        c.strokeStyle = 'rgba(247, 246, 242, 0.4)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(edge[0].x, edge[0].y);
        for (i = 1; i < edge.length; i++) c.lineTo(edge[i].x, edge[i].y);
        c.stroke();
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (var d = 0; d < 360; d += 15) {
        pt = project(fr, vec(d, 0));
        if (!pt || pt.d < 0.1) continue;
        if (d % 45 === 0) {
          c.fillStyle = 'rgba(247, 246, 242, 0.9)';
          c.font = '700 34px Sora, Inter, Arial, sans-serif';
          c.fillText(core.compass(d), pt.x, pt.y + 44);
        }
        c.fillStyle = 'rgba(247, 246, 242, 0.5)';
        c.fillRect(pt.x - 1, pt.y - (d % 45 === 0 ? 14 : 7), 2, d % 45 === 0 ? 14 : 7);
      }

      // The names: the stars and Matariki first, then the constellations, softly. One that would land on another is left off.
      var placed = [];
      function label(text, x, y, font, colour) {
        c.font = font;
        var w = c.measureText(text).width, box = {l: x - w / 2 - 8, r: x + w / 2 + 8, t: y - 26, b: y + 8};
        for (var q = 0; q < placed.length; q++) {
          var o = placed[q];
          if (box.l < o.r && o.l < box.r && box.t < o.b && o.t < box.b) return;
        }
        if (x < 20 || x > W - 20 || y < 20 || y > H - 20) return;
        placed.push(box);
        c.fillStyle = colour;
        c.fillText(text, x, y);
      }
      if (dark > 0.3) {
        c.globalAlpha = dark;
        var order = ['cluster', 'star', 'constellation'], k, t;
        for (k = 0; k < order.length; k++) {
          for (i = 0; i < cache.things.length; i++) {
            t = cache.things[i];
            if (t.kind !== order[k] || t.v[2] < 0.06) continue;
            pt = project(fr, t.v);
            if (!pt) continue;
            if (t.kind === 'constellation') label(t.name.toUpperCase(), pt.x, pt.y, '600 22px Inter, Arial, sans-serif', 'rgba(190, 172, 255, 0.78)');
            else label(t.name, pt.x, pt.y + 34, t.kind === 'cluster' ? '600 26px Inter, Arial, sans-serif' : '500 24px Inter, Arial, sans-serif',
              t.kind === 'cluster' ? '#E8A33D' : 'rgba(247, 246, 242, 0.88)');
          }
        }
        c.globalAlpha = 1;
      }

      // The sun and the moon, where they are, drawn big enough to see.
      if (cache.sun[2] > -0.05) {
        pt = project(fr, cache.sun);
        if (pt) {
          var sg = c.createRadialGradient(pt.x, pt.y, 8, pt.x, pt.y, 90);
          sg.addColorStop(0, 'rgba(255, 238, 170, 0.95)');
          sg.addColorStop(1, 'rgba(255, 238, 170, 0)');
          c.fillStyle = sg;
          c.beginPath(); c.arc(pt.x, pt.y, 90, 0, 2 * Math.PI); c.fill();
          c.fillStyle = '#FFF3B8';
          c.beginPath(); c.arc(pt.x, pt.y, 30, 0, 2 * Math.PI); c.fill();
        }
      }
      if (cache.moon[2] > -0.05) {
        pt = project(fr, cache.moon);
        if (pt) {
          core.drawMoon(c, pt.x, pt.y, 34, cache.phase, p.lat < 0);
          c.textAlign = 'center';
          label(tr('Lua', 'Moon', 'Luna'), pt.x, pt.y + 68, '600 24px Inter, Arial, sans-serif', '#F2EEDF');
        }
      }

      // The middle of the screen, and what's in it.
      c.strokeStyle = 'rgba(247, 246, 242, 0.55)';
      c.lineWidth = 3;
      c.beginPath(); c.arc(W / 2, H / 2, 30, 0, 2 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(247, 246, 242, 0.55)';
      c.fillRect(W / 2 - 1.5, H / 2 - 52, 3, 14); c.fillRect(W / 2 - 1.5, H / 2 + 38, 3, 14);
      c.fillRect(W / 2 - 52, H / 2 - 1.5, 14, 3); c.fillRect(W / 2 + 38, H / 2 - 1.5, 14, 3);
      c.textBaseline = 'alphabetic';

      var hit = nearest(cache.things, fr.f);
      card.style.opacity = hit ? '1' : '0';
      var sig = hit ? hit.key + '|' + Math.round(at / 60000) + '|' + hit.v[2].toFixed(2) : '';
      if (hit && sig !== shown) {
        shown = sig;
        card.innerHTML = '';
        UI.el('div', 'kind', card, kindName(hit.kind));
        UI.el('div', 'name', card, hit.name);
        UI.el('div', 'where', card, whereText(hit.v));
        var about = aboutText(hit, at);
        if (about) UI.el('div', 'about', card, about);
      }
      var look = toHorizon(fr.f);
      corner.textContent = core.compass(look.az) + ' ' + Math.round(look.az) + '°  ·  ' + Math.round(look.alt) + '°  ·  '
        + (live ? tr('Agora', 'Now', 'Ahora') + ' ' : '') + timeText(at);
    }

    /** Glide the view towards where it was asked to go, a fraction each frame, then stop drawing. */
    function frameTick() {
      timer = null;
      var dz = ((toAz - az + 540) % 360) - 180, da = toAlt - alt;
      if (Math.abs(dz) < 0.15 && Math.abs(da) < 0.15) { az = norm(toAz); alt = toAlt; dirty = true; }
      else { az = norm(az + dz * 0.22); alt += da * 0.22; dirty = true; }
      if (dirty) { dirty = false; draw(); }
      if (Math.abs(((toAz - az + 540) % 360) - 180) >= 0.15 || Math.abs(toAlt - alt) >= 0.15) timer = setTimeout(frameTick, 33);
    }

    function go() { if (!timer) timer = setTimeout(frameTick, 0); }

    /** Turn the view to a direction, by the shortest way round. */
    function aim(newAz, newAlt) {
      toAz = norm(newAz);
      toAlt = clamp(newAlt, MIN_ALT, MAX_ALT);
      go();
    }

    function moveTime(ms) { at = ms; live = Math.abs(at - Date.now()) < 60000; dirty = true; draw(); }

    /** Find: turn to something, or move the time. */
    function find() {
      UI.open({
        cls: 'bt-outside bt-party-pick bt-games bt-skyfind',
        build: function (layer, api) {
          var box = UI.el('div', 'bt-box', layer);
          UI.el('div', 'sun', box, '🔭');
          UI.heading(box, tr('Encontrar', 'Find', 'Buscar'), tr('Vire para algo, ou mude a hora.', 'Turn to something, or change the time.', 'Gira hacia algo, o cambia la hora.'));
          var row = UI.el('div', 'bt-buttons cakes', box), first = true;
          function item(label, run) {
            api.add(UI.button(row, label, null, first ? 'primary' : ''), function () { api.close(); run(); }, {first: first});
            first = false;
          }
          function turnTo(key) {
            for (var i = 0; i < cache.things.length; i++) {
              if (cache.things[i].key !== key) continue;
              var h = toHorizon(cache.things[i].v);
              aim(h.az, Math.max(h.alt, 8));
              return;
            }
          }
          if (cache.moon[2] > -0.05) item('🌙  ' + tr('Lua', 'Moon', 'Luna'), function () { turnTo('Moon'); });
          if (cache.sun[2] > 0) item('☀️  ' + tr('Sol', 'Sun', 'Sol'), function () { turnTo('Sun'); });
          item('✚  ' + tr('Cruzeiro do Sul', 'Southern Cross', 'Cruz del Sur'), function () { turnTo('Southern Cross'); });
          item('✦  ' + core.matarikiName(), function () { turnTo(core.matarikiName() === 'Matariki' ? 'Matariki' : 'Pleiades'); });
          item('★  ' + tr('Estrela mais brilhante', 'Brightest star up', 'Estrella más brillante'), function () {
            var best = null;
            for (var i = 0; i < SKY_DATA.names.length; i++) {
              var nm = SKY_DATA.names[i][2];
              if (nm === 'Matariki') continue;
              for (var j = 0; j < cache.things.length; j++) {
                if (cache.things[j].key === nm && cache.things[j].v[2] > 0.17) { best = cache.things[j]; break; }
              }
              if (best) break;
            }
            if (best) turnTo(best.key); else UI.toast(tr('Nenhuma ainda.', 'None up yet.', 'Ninguna todavía.'));
          });
          item('🕘  ' + tr('Uma hora depois', 'An hour later', 'Una hora después'), function () { moveTime(at + 3600000); });
          item('🕗  ' + tr('Uma hora antes', 'An hour earlier', 'Una hora antes'), function () { moveTime(at - 3600000); });
          item('🌌  ' + tr('Esta noite', 'Tonight', 'Esta noche'), function () { moveTime(core.tonight(Date.now(), p)); });
          item('⏱  ' + tr('Agora', 'Now', 'Ahora'), function () { moveTime(Date.now()); });
        }
      });
    }

    var api = UI.open({
      cls: 'bt-skylook',
      build: function (layer, a) {
        canvas = UI.el('canvas', 'look', layer);
        canvas.width = W; canvas.height = H;
        c = canvas.getContext('2d');
        card = UI.el('div', 'lookcard', layer);
        corner = UI.el('div', 'corner', layer);
        UI.el('div', 'hint', layer, tr('◀ ▶ girar  ·  ▲ ▼ inclinar  ·  OK encontrar', '◀ ▶ turn  ·  ▲ ▼ tilt  ·  OK to find', '◀ ▶ girar  ·  ▲ ▼ inclinar  ·  OK buscar'));
        draw();
      },
      key: function (k) {
        if (k === TV.keys.left) { aim(toAz - STEP_AZ, toAlt); return true; }
        if (k === TV.keys.right) { aim(toAz + STEP_AZ, toAlt); return true; }
        if (k === TV.keys.up) { aim(toAz, toAlt + STEP_ALT); return true; }
        if (k === TV.keys.down) { aim(toAz, toAlt - STEP_ALT); return true; }
        if (k === TV.keys.ok) { find(); return true; }
        return false;
      },
      closed: function () { if (timer) clearTimeout(timer); timer = null; }
    });
    return {aim: aim, close: function () { api.close(); }};
  }

  return {open: open, _test: {frame: frame, project: project, between: between, toHorizon: toHorizon, vec: vec, nearest: nearest, darkness: darkness}};
})();
