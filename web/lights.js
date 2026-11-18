/*
 * Light show (ADR 0041, made a real visualiser by ADR 0044): the room's music drawn as light, full screen, started
 * from Games with the remote. It only moves to real sound: the family's own music (Beyond Music, shuffled), the room
 * through a microphone where the TV has one (a USB microphone or webcam usually), or on Google TV the TV's own sound,
 * so music playing in Spotify or YouTube Music can be drawn. With no sound the looks lie flat and still and say what
 * would wake them. Calm lights is the one choice with no sound at all: Beyond's four dots drifting slowly, no beat.
 * The sound is only read as how loud each pitch is and the shape of the wave, frame by frame, on the TV: never
 * recorded, kept or sent.
 *
 * Four looks, changed with left and right: Bars, Sound wave, Ring of light and Shooting stars. OK skips to the next
 * song, Back leaves. A TV that can't keep up drops to the light mode by itself (half the pixels, fewer bars, no glow);
 * Google TV says so up front on its older and 1 GB TVs.
 *
 * LG and Samsung run it on the home screen; Google TV in TableActivity's WebView (start "lights"), where the music
 * comes through the TV's own relay (BeyondTable.music), the microphone and the TV's sound are asked for by the app
 * (BeyondTable.ask) and the TV's sound comes from Android's Visualizer (TvSound.java, BeyondTable.tvFft and tvWave).
 * Plain ES5, one canvas.
 */
var Lights = (function () {
  'use strict';

  var W = 1920, H = 1080;
  var VOID = '#0D0C18', PAPER = '#F7F6F2', VIOLET = '#6E3DDB', LILAC = '#9E7BFF', EMBER = '#E8A33D';
  // Beyond's four dots: moss, ember, coral and blue.
  var DOTS = ['#2F7D6D', '#E8A33D', '#D85A30', '#378ADD'];
  var FFT = 2048;
  // Under this (0 to 1, after the steady hum is taken away) a pitch counts as nothing: hiss and a quiet room stay dark.
  var GATE = 0.12;
  // How fast the steady hum is learnt (per frame), and the most of it ever taken away.
  var CREEP = 0.0004, HUM_MAX = 0.25;

  function say(pt, en, es) { return typeof tr === 'function' ? tr(pt, en, es) : en; }

  // MARK: - The sums, apart from the screen (tests/lights.test.js)

  /**
   * The noise gate: turns one frame of 0 to 255 levels into 0 to 1, taking away what stays the same frame after frame
   * (a fridge, the TV's own hiss, learnt slowly per pitch) and anything under GATE. Silence gives zeros, flat out gives
   * ones. One per sound, since it remembers the hum.
   */
  function gate(n) {
    var hum = new Float32Array(n), out = new Float32Array(n);
    return function (raw, len) {
      len = Math.min(len || raw.length, n);
      for (var i = 0; i < len; i++) {
        var v = raw[i] / 255, h = hum[i] + CREEP;
        if (v < h) h = v;
        hum[i] = h;
        var take = (h < HUM_MAX ? h : HUM_MAX) + GATE, x = v - take;
        out[i] = x > 0 ? x / (1 - take) : 0;
      }
      return out;
    };
  }

  /** The average of bins a to b (fractions allowed), or nothing. */
  function span(lv, a, b) {
    a = Math.max(0, Math.floor(a)); b = Math.max(a + 1, Math.ceil(b));
    var s = 0;
    for (var i = a; i < b; i++) s += lv[i] || 0;
    return s / (b - a);
  }

  /**
   * How loud the lows (30 to 250 Hz), the middle (to 2 kHz) and the highs (to 10 kHz) are, each 0 to 1, from one gated
   * frame of len bins spread evenly up to nyq Hz.
   */
  function bands(lv, len, nyq) {
    var k = len / nyq;
    var bass = span(lv, 30 * k, 250 * k), mid = span(lv, 250 * k, 2000 * k), high = span(lv, 2000 * k, Math.min(len, 10000 * k));
    return {bass: bass, mid: mid, high: high, level: (bass * 2 + mid + high) / 4};
  }

  /**
   * The bars' pitches, spaced the way ears hear them (each bar the same step in pitch, from lo to hi Hz), as bin
   * ranges {a, b} plus the middle bin c, for len bins up to nyq Hz. Low bars narrower than a bin read between bins.
   */
  function logBands(len, nyq, count, lo, hi) {
    lo = lo || 40; hi = Math.min(hi || 14000, nyq);
    var out = [], k = len / nyq, ratio = hi / lo;
    for (var i = 0; i < count; i++) {
      var f0 = lo * Math.pow(ratio, i / count), f1 = lo * Math.pow(ratio, (i + 1) / count);
      var a = f0 * k, b = f1 * k;
      out.push({a: Math.floor(a), b: Math.max(Math.floor(a) + 1, Math.ceil(b)), c: Math.min(len - 1, (a + b) / 2), narrow: b - a < 1.5});
    }
    return out;
  }

  /** Each bar's level, 0 to 1: the loudest bin in its range, or for a narrow low bar the level between its bins. */
  function barLevels(lv, ranges, out) {
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i], v = 0;
      if (r.narrow) {
        var j = Math.floor(r.c), f = r.c - j;
        v = (lv[j] || 0) * (1 - f) + (lv[j + 1] || 0) * f;
      } else {
        for (var x = r.a; x < r.b; x++) if (lv[x] > v) v = lv[x];
      }
      out[i] = v;
    }
    return out;
  }

  /** Bars that jump up with the music and fall back gently, with a peak cap that hangs, then drops. */
  function follow(val, peak, target) {
    for (var i = 0; i < target.length; i++) {
      var t = target[i], v = val[i];
      val[i] = v + (t - v) * (t > v ? 0.6 : 0.16);
      peak[i] = val[i] > peak[i] ? val[i] : Math.max(0, peak[i] - 0.012);
    }
  }

  /**
   * A beat: the lows jump well above their recent average. Never twice inside a quarter of a second, and never in
   * near silence, so a quiet room doesn't flash.
   */
  function beats() {
    var avg = 0, last = -1e9;
    return function (bass, now) {
      var hit = bass > 0.2 && bass > avg * 1.35 + 0.05 && now - last > 250;
      avg = avg * 0.92 + bass * 0.08;
      if (hit) last = now;
      return hit;
    };
  }

  /** Quiet: true once there has been next to no sound for two seconds; any real sound ends it straight away. */
  function quiet() {
    var since = null;
    return function (level, now) {
      if (level > 0.03) { since = null; return false; }
      if (since === null) since = now;
      return now - since >= 2000;
    };
  }

  /** A fair shuffle (Fisher and Yates). rand is Math.random unless a test gives its own. */
  function shuffle(list, rand) {
    rand = rand || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1)), x = a[i];
      a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  /** Light mode once the frames take too long: the average of the last ones over 24 ms (under about 40 a second). */
  function tooSlow(times) {
    if (times.length < 60) return false;
    var s = 0;
    for (var i = 0; i < times.length; i++) s += times[i];
    return s / times.length > 24;
  }

  /** A Java string of chars 0 to 255 (BeyondTable.tvFft and tvWave) into bytes; the length it filled. */
  function unpack(s, out) {
    var n = Math.min(s ? s.length : 0, out.length);
    for (var i = 0; i < n; i++) out[i] = s.charCodeAt(i) & 255;
    return n;
  }

  // MARK: - Sound

  var actx = null, analyser = null, audio = null, mic = null, source = '';
  var songs = [], at = 0, base = null, beat = null, hush = null, onSong = null, tvAt = 0;
  // This frame's sound: raw levels and wave, how many bins, and the top pitch they reach.
  var freq = new Uint8Array(FFT / 2), wave = new Uint8Array(FFT), bins = FFT / 2, nyq = 22050, clean = null;

  function context() {
    if (actx) return actx;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { actx = new C(); } catch (e) { actx = null; }
    return actx;
  }

  function hook(node, toSpeakers) {
    var c = context();
    if (!c) return false;
    analyser = c.createAnalyser();
    analyser.fftSize = FFT;
    analyser.smoothingTimeConstant = 0.78;
    // The same scale as TvSound.fft, so every look reads the same whichever way the sound comes in.
    analyser.minDecibels = -85;
    analyser.maxDecibels = -20;
    bins = analyser.frequencyBinCount;
    freq = new Uint8Array(bins);
    wave = new Uint8Array(analyser.fftSize);
    nyq = c.sampleRate / 2;
    node.connect(analyser);
    if (toSpeakers) analyser.connect(c.destination);
    if (c.state === 'suspended' && c.resume) c.resume();
    return true;
  }

  /** Where Beyond Music answers: Google TV's relay, or the address the home screen found. */
  function musicBase() {
    var b = window.BeyondTable;
    if (b && b.music) return b.music() || null;
    return window.Music && Music.base ? Music.base() : null;
  }

  function hasMusic() { return !!musicBase(); }

  /** A microphone this TV might let us listen with. Google TV says itself; elsewhere, whether the browser can ask. */
  function canListen() {
    var b = window.BeyondTable;
    if (b) return !!(b.canListen && b.canListen());
    return !!((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.webkitGetUserMedia);
  }

  /** The TV's own sound: Google TV only. */
  function canHearTv() {
    var b = window.BeyondTable;
    return !!(b && b.canHearTv && b.canHearTv());
  }

  function getJson(url, done) {
    var x = new XMLHttpRequest(), over = false;
    try { x.open('GET', url, true); } catch (e) { done(null); return; }
    x.timeout = 8000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || over) return;
      over = true;
      var json = null;
      try { json = JSON.parse(x.responseText); } catch (e) {}
      done(x.status === 200 ? json : null);
    };
    x.ontimeout = x.onerror = function () { if (!over) { over = true; done(null); } };
    x.send(null);
  }

  function playMusic(done) {
    base = musicBase();
    if (!base) { done(false); return; }
    getJson(base + '/api/library', function (lib) {
      var tracks = lib && lib.tracks || [];
      if (!tracks.length) { done(false); return; }
      songs = shuffle(tracks).slice(0, 300);
      at = 0;
      audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.onended = function () { next(); };
      audio.onerror = function () { setTimeout(next, 500); };
      var c = context();
      if (!c || !hook(c.createMediaElementSource(audio), true)) { done(false); return; }
      source = 'music';
      play();
      done(true);
    });
  }

  function play() {
    if (!audio || !songs.length) return;
    var s = songs[at % songs.length];
    audio.src = base + '/api/play/' + s.id;
    try { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    if (onSong) onSong(s);
  }

  function next() {
    if (source !== 'music') return;
    at = (at + 1) % songs.length;
    play();
  }

  function getMic(ok, fail) {
    var md = navigator.mediaDevices;
    var want = {audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}, video: false};
    if (md && md.getUserMedia) md.getUserMedia(want).then(ok, fail);
    else if (navigator.webkitGetUserMedia) navigator.webkitGetUserMedia({audio: true}, ok, fail);
    else fail();
  }

  /** Google TV asks "Allow Beyond TV to record audio?" first; then go(). Elsewhere go() straight away. */
  function allowed(go, done) {
    var b = window.BeyondTable;
    if (b && b.ask) { asked = function (yes) { asked = null; if (yes) go(); else done(false); }; b.ask(); }
    else go();
  }

  function listen(done) {
    allowed(function () {
      getMic(function (stream) {
        var c = context();
        // Never to the speakers: the room is already loud enough, and it would howl.
        if (!c || !hook(c.createMediaStreamSource(stream), false)) { stopStream(stream); done(false); return; }
        mic = stream;
        source = 'room';
        done(true);
      }, function () { done(false); });
    }, done);
  }

  function hearTv(done) {
    allowed(function () {
      var b = window.BeyondTable, ok = false;
      try { ok = !!b.tvStart(); } catch (e) { ok = false; }
      if (!ok) { done(false); return; }
      bins = FFT / 2;
      freq = new Uint8Array(bins);
      wave = new Uint8Array(FFT);
      try { nyq = b.tvNyquist() || 22050; } catch (e) { nyq = 22050; }
      tvAt = 0;
      source = 'tv';
      done(true);
    }, done);
  }

  // Google TV's answer to its own "Allow Beyond TV to record audio?" (TableActivity calls Lights.answer).
  var asked = null;
  function answer(yes) { if (asked) asked(!!yes); }

  function stopStream(s) {
    try { var t = s.getTracks(); for (var i = 0; i < t.length; i++) t[i].stop(); } catch (e) {}
  }

  function silence() {
    if (audio) { try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) {} }
    if (mic) stopStream(mic);
    if (analyser) { try { analyser.disconnect(); } catch (e) {} }
    if (source === 'tv') { try { window.BeyondTable.tvStop(); } catch (e) {} }
    audio = null; mic = null; analyser = null; songs = []; source = ''; onSong = null;
    if (actx && actx.suspend) { try { actx.suspend(); } catch (e) {} }
  }

  /** This frame's sound into freq and wave. Nothing to hear gives silence: zeros, and a flat wave. */
  function hear(now) {
    var i;
    if (analyser) {
      analyser.getByteFrequencyData(freq);
      analyser.getByteTimeDomainData(wave);
      return;
    }
    if (source === 'tv') {
      // The Visualizer only has a new frame about 20 times a second: no point asking the bridge more often.
      if (now - tvAt < 30) return;
      tvAt = now;
      var b = window.BeyondTable, n = 0, m = 0;
      try { n = unpack(b.tvFft(), freq); m = unpack(b.tvWave(), wave); } catch (e) {}
      // The TV says how many pitches it measures (half its capture size); the bins spread over those only.
      if (n) bins = n;
      for (i = n; i < freq.length; i++) freq[i] = 0;
      for (i = m; i < wave.length; i++) wave[i] = 128;
      return;
    }
    for (i = 0; i < freq.length; i++) freq[i] = 0;
    for (i = 0; i < wave.length; i++) wave[i] = 128;
  }

  // MARK: - The looks

  var c2 = null, light = false, stars = [], spin = 0, flash = 0;
  var val = null, peak = null, target = null, ranges = null, rangeKey = '';

  function clear(alpha) {
    c2.globalCompositeOperation = 'source-over';
    c2.globalAlpha = 1;
    c2.fillStyle = alpha >= 1 ? VOID : 'rgba(13,12,24,' + alpha + ')';
    c2.fillRect(0, 0, W, H);
  }

  function disc(x, y, r, fill) {
    c2.beginPath();
    c2.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
    c2.fillStyle = fill;
    c2.fill();
  }

  /** Beyond's four dots in the middle, each breathing with its own part of the sound; still in silence. */
  function mark(x, y, size, b) {
    var parts = [b.bass, b.mid, b.high, b.level], gap = size * 1.25;
    for (var i = 0; i < 4; i++) {
      var dx = (i % 2 ? 1 : -1) * gap / 2, dy = (i < 2 ? -1 : 1) * gap / 2;
      disc(x + dx, y + dy, size * (0.42 + parts[i] * 0.5), DOTS[i]);
    }
  }

  /** count bars for this frame, followed and with their peaks, in val and peak. */
  function bars(f, count) {
    var key = count + ':' + f.len + ':' + f.nyq;
    if (key !== rangeKey) {
      rangeKey = key;
      ranges = logBands(f.len, f.nyq, count);
      val = new Float32Array(count); peak = new Float32Array(count); target = new Float32Array(count);
    }
    follow(val, peak, barLevels(f.lv, ranges, target));
  }

  var LOOKS = [
    {id: 'bars', name: function () { return say('Barras', 'Bars', 'Barras'); }, draw: function (f) {
      clear(1);
      var n = light ? 32 : 64, left = 120, slot = (W - left * 2) / n, w = slot * 0.72, mid = H * 0.64, tall = H * 0.52;
      bars(f, n);
      for (var i = 0; i < n; i++) {
        var v = val[i], h = Math.max(4, v * tall), x = left + i * slot + (slot - w) / 2;
        // A soft reflection under the line, then the bar, its top lighter, then the cap.
        c2.globalAlpha = 0.18;
        c2.fillStyle = VIOLET;
        c2.fillRect(x, mid + 6, w, h * 0.4);
        c2.globalAlpha = 0.4 + v * 0.6;
        c2.fillRect(x, mid - h, w, h);
        c2.fillStyle = LILAC;
        c2.fillRect(x, mid - h, w, Math.min(h, 6 + h * 0.18));
        if (peak[i] > 0.02) {
          c2.globalAlpha = 0.9;
          c2.fillStyle = peak[i] > 0.85 ? EMBER : PAPER;
          c2.fillRect(x, mid - peak[i] * tall - 14, w, 6);
        }
      }
      c2.globalAlpha = 1;
    }},
    {id: 'wave', name: function () { return say('Onda sonora', 'Sound wave', 'Onda sonora'); }, draw: function (f) {
      clear(light ? 1 : 0.55);
      var wv = f.wave, n = wv.length, span = n >> 1, step = light ? 8 : 4, cy = H / 2, from = 0, i, x, y;
      // Start where the wave rises through the middle, like an oscilloscope, so it holds still instead of jittering.
      for (i = 1; i < n - span; i++) if (wv[i - 1] < 128 && wv[i] >= 128) { from = i; break; }
      // Flat in silence however the microphone hisses; full height once there's music.
      var amp = H * 0.36 * Math.min(1, f.b.level * 5);
      if (f.hit) flash = f.t;
      function path() {
        c2.beginPath();
        for (x = 0; x <= W; x += step) {
          y = cy + Math.max(-1, Math.min(1, (wv[from + Math.floor(x / W * (span - 1))] - 128) / 128)) * amp;
          if (x === 0) c2.moveTo(x, y); else c2.lineTo(x, y);
        }
      }
      c2.lineCap = 'round';
      c2.lineJoin = 'round';
      if (!light) {
        c2.globalAlpha = 0.3;
        c2.strokeStyle = VIOLET;
        c2.lineWidth = 24;
        path();
        c2.stroke();
      }
      c2.globalAlpha = 1;
      c2.strokeStyle = f.t - flash < 140 ? EMBER : LILAC;
      c2.lineWidth = 6;
      path();
      c2.stroke();
    }},
    {id: 'ring', name: function () { return say('Anel de luz', 'Ring of light', 'Anillo de luz'); }, draw: function (f) {
      clear(light ? 1 : 0.32);
      var half = light ? 24 : 48, n = half * 2, cx = W / 2, cy = H / 2, r0 = 200 + f.b.bass * 60, step = Math.PI * 2 / n;
      bars(f, half);
      // It turns only as fast as the music is loud: still in silence.
      spin += f.b.level * 0.01;
      c2.lineCap = 'round';
      c2.lineWidth = light ? 14 : 10;
      for (var i = 0; i < n; i++) {
        // The lows at the top, the highs at the bottom, the same down both sides so the ring is even.
        var k = i < half ? i : n - 1 - i, v = val[k], len = 6 + v * 320;
        var a = i * step - Math.PI / 2 + spin, cos = Math.cos(a), sin = Math.sin(a);
        c2.strokeStyle = v > 0.82 ? EMBER : (i % 2 ? LILAC : VIOLET);
        c2.globalAlpha = 0.35 + v * 0.65;
        c2.beginPath();
        c2.moveTo(cx + cos * r0, cy + sin * r0);
        c2.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len));
        c2.stroke();
      }
      c2.globalAlpha = 1;
      if (f.hit && !light) { c2.strokeStyle = 'rgba(247,246,242,0.5)'; c2.lineWidth = 4; c2.beginPath(); c2.arc(cx, cy, r0 - 20, 0, Math.PI * 2); c2.stroke(); }
      mark(cx, cy, 110, f.b);
    }},
    {id: 'stars', name: function () { return say('Estrelas cadentes', 'Shooting stars', 'Estrellas fugaces'); }, draw: function (f) {
      clear(light ? 0.5 : 0.18);
      var b = f.b, max = light ? 90 : 260;
      // Stars only come from the music: a burst on each beat, a few more while it's loud.
      var born = f.hit ? (light ? 14 : 34) : (b.level > 0.35 && Math.random() < b.level ? 1 : 0);
      for (var n = 0; n < born && stars.length < max; n++) {
        var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 10 + b.bass * 14;
        stars.push({x: W / 2, y: H / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: DOTS[Math.floor(Math.random() * 4)], r: 3 + Math.random() * 6});
      }
      var lift = 1 + b.high * 0.6;
      for (var i = stars.length - 1; i >= 0; i--) {
        var s = stars[i];
        s.x += s.vx * lift; s.y += s.vy * lift; s.vx *= 1.015; s.vy *= 1.015; s.life -= 0.012;
        if (s.life <= 0 || s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) { stars.splice(i, 1); continue; }
        c2.globalAlpha = Math.max(0, s.life);
        disc(s.x, s.y, s.r * (0.6 + s.life), s.c);
      }
      c2.globalAlpha = 1;
      mark(W / 2, H / 2, 70 + b.bass * 40, b);
    }}
  ];

  /** Calm lights, the one with no sound: the four dots drifting slowly round the middle, about a minute a lap. */
  var CALM = {id: 'calm', name: function () { return say('Luzes calmas', 'Calm lights', 'Luces tranquilas'); }, draw: function (f) {
    clear(1);
    var t = f.t, cx = W / 2, cy = H / 2;
    for (var i = 0; i < 4; i++) {
      var a = t / 9500 + i * Math.PI / 2, wob = Math.sin(t / 7000 + i * 1.3);
      var x = cx + Math.cos(a) * (300 + wob * 60), y = cy + Math.sin(a) * (190 + wob * 40), r = 90 + Math.sin(t / 4200 + i) * 18;
      if (!light) { c2.globalAlpha = 0.14; disc(x, y, r * 2.4, DOTS[i]); }
      c2.globalAlpha = 0.85;
      disc(x, y, r, DOTS[i]);
    }
    c2.globalAlpha = 1;
  }};

  // MARK: - The screen

  var raf = null, look = 0, layer = null, label = null, help = null, hint = null, canvas = null, times = [], prev = 0, hideAt = 0;
  var kind = '', hushed = false, deafSince = 0, toldDeaf = false;
  var frameData = {lv: null, len: 0, nyq: 22050, wave: null, b: null, t: 0, hit: false, quiet: false};

  /** What would wake the looks, for each sound. */
  function wakeText() {
    if (kind === 'tv') return say('Comece a música num app como o Spotify e depois volte aqui.', 'Start music in an app like Spotify, then come back here.', 'Pon música en una app como Spotify y luego vuelve aquí.');
    if (kind === 'room') return say('Toque uma música na sala e as luzes acompanham.', 'Play some music in the room and the lights will follow.', 'Pon música en la sala y las luces la seguirán.');
    return say('Esperando a música…', 'Waiting for music…', 'Esperando la música…');
  }

  /**
   * Beyond Music playing but nothing to hear: the browser was refused the song's sound (a server without the right
   * header). Said once, and reported, since the show would sit still.
   */
  function checkDeaf(now) {
    if (kind !== 'music' || toldDeaf || !audio) return;
    var playing = !audio.paused && audio.currentTime > 3, silent = true;
    for (var i = 0; i < 32 && silent; i++) if (freq[i]) silent = false;
    if (!(playing && silent)) { deafSince = 0; return; }
    if (!deafSince) { deafSince = now; return; }
    if (now - deafSince < 4000) return;
    toldDeaf = true;
    UI.toast(say('A música está tocando, mas as luzes não conseguem ouvi-la nesta TV.', "Your music is playing, but the lights can't hear it on this TV.", 'Tu música suena, pero las luces no la oyen en esta tele.'));
    if (window.Checkin && Checkin.error) Checkin.error('lights', 'Beyond Music plays but the analyser hears nothing (CORS?)');
  }

  function frame() {
    raf = null;
    if (!c2) return;
    // The wall clock, not requestAnimationFrame's own: the label and help fade by it too.
    var now = Date.now();
    if (prev) { times.push(now - prev); if (times.length > 90) times.shift(); }
    prev = now;
    if (!light && tooSlow(times)) setLight(true);
    var f = frameData;
    hear(now);
    f.lv = clean(freq, bins); f.len = bins; f.nyq = nyq; f.wave = wave; f.t = now;
    f.b = bands(f.lv, bins, nyq);
    f.hit = beat(f.b.bass, now);
    f.quiet = hush(f.b.level, now);
    if (kind === 'lights') CALM.draw(f); else LOOKS[look].draw(f);
    if (kind !== 'lights' && f.quiet !== hushed) { hushed = f.quiet; UI.setClass(hint, 'shown', hushed); }
    checkDeaf(now);
    if (hideAt && now > hideAt) { hideAt = 0; UI.setClass(help, 'shown', false); UI.setClass(label, 'shown', false); }
    raf = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (fn) { return setTimeout(fn, 33); })(frame);
  }

  function setLight(on) {
    light = on;
    var s = on ? 0.5 : 1;
    canvas.width = W * s; canvas.height = H * s;
    c2.setTransform(s, 0, 0, s, 0, 0);
    stars = [];
    times = [];
  }

  /** The song or the look's name, for a few seconds. */
  function show(text) {
    label.textContent = text;
    UI.setClass(label, 'shown', true);
    hideAt = Date.now() + 5000;
  }

  function run(which) {
    kind = which;
    UI.open({
      cls: 'bt-lights',
      build: function (l) {
        layer = l;
        canvas = document.createElement('canvas');
        canvas.className = 'li-canvas';
        l.appendChild(canvas);
        c2 = canvas.getContext('2d');
        label = UI.el('div', 'li-label', l, '');
        hint = UI.el('div', 'li-hint', l, wakeText());
        help = UI.el('div', 'li-help shown', l, which === 'music'
          ? say('◀ ▶ outro visual  ·  OK próxima música  ·  Voltar para sair', '◀ ▶ another look  ·  OK next song  ·  Back to leave', '◀ ▶ otro efecto  ·  OK siguiente canción  ·  Atrás para salir')
          : which === 'lights' ? say('Voltar para sair', 'Back to leave', 'Atrás para salir')
            : say('◀ ▶ outro visual  ·  Voltar para sair', '◀ ▶ another look  ·  Back to leave', '◀ ▶ otro efecto  ·  Atrás para salir'));
      },
      key: function (k) {
        if ((k === TV.keys.left || k === TV.keys.right) && kind !== 'lights') {
          look = (look + (k === TV.keys.right ? 1 : LOOKS.length - 1)) % LOOKS.length;
          stars = [];
          clear(1);
          show(LOOKS[look].name());
          return true;
        }
        if (k === TV.keys.ok) {
          if (source === 'music') next();
          else show(kind === 'lights' ? CALM.name() : LOOKS[look].name());
          UI.setClass(help, 'shown', true);
          hideAt = Date.now() + 5000;
          return true;
        }
        return k === TV.keys.up || k === TV.keys.down || k === TV.keys.left || k === TV.keys.right;
      },
      closed: stop
    });
    var b = window.BeyondTable;
    setLight(!!(b && b.lowPower && b.lowPower()));
    beat = beats();
    hush = quiet();
    clean = gate(bins);
    hushed = false; deafSince = 0; toldDeaf = false; spin = 0; rangeKey = '';
    prev = 0;
    hideAt = Date.now() + 6000;
    clear(1);
    if (which === 'music') {
      onSong = function (s) { show((s.title || '') + (s.artist ? '  ·  ' + s.artist : '')); };
      if (songs.length) onSong(songs[at % songs.length]);
    } else show(which === 'lights' ? CALM.name() : LOOKS[look].name());
    frame();
  }

  function stop() {
    if (raf) { (window.cancelAnimationFrame || window.webkitCancelAnimationFrame || clearTimeout)(raf); raf = null; }
    silence();
    c2 = null; canvas = null; layer = null; stars = []; kind = '';
    bins = FFT / 2; freq = new Uint8Array(bins); wave = new Uint8Array(FFT); nyq = 22050;
  }

  function start(which, pick) {
    if (which === 'lights') { pick.close(); run('lights'); return; }
    UI.toast(say('Um momento…', 'Just a moment…', 'Un momento…'));
    (which === 'music' ? playMusic : which === 'tv' ? hearTv : listen)(function (ok) {
      if (ok) { pick.close(); run(which); return; }
      silence();
      UI.toast(which === 'music'
        ? say('A sua música não está respondendo agora. O computador onde ela fica está ligado?', "Your music isn't answering right now. Is the computer it's on switched on?", 'Tu música no responde ahora. ¿Está encendido el ordenador donde está?')
        : which === 'tv'
          ? say('Esta TV não compartilha o som com apps. Experimente Ouvir a sala.', "This TV doesn't share its sound with apps. Try Listen to the room instead.", 'Esta tele no comparte su sonido con las apps. Prueba Escuchar la sala.')
          : say('Esta TV não deixou ouvir a sala. Um microfone USB ou uma webcam funcionam na maioria das TVs.', "This TV didn't let us listen to the room. A USB microphone or webcam works on most TVs.", 'Esta tele no nos dejó escuchar la sala. Un micrófono USB o una webcam funcionan en la mayoría.'));
    });
  }

  /** The Light show button in Games: where the sound comes from. */
  function open() {
    UI.open({
      cls: 'bt-outside bt-party-pick bt-games bt-lights-pick',
      build: function (l, a) {
        var box = UI.el('div', 'bt-box', l);
        UI.el('div', 'sun', box, '✨');
        UI.heading(box, say('Show de luzes', 'Light show', 'Show de luces'), say('A música da casa, desenhada em luz.', "The room's music, drawn in light.", 'La música de casa, dibujada con luz.'));
        var row = UI.el('div', 'bt-buttons cakes', box), first = true;
        function add(icon, text, which) {
          a.add(UI.button(row, icon + '  ' + text, null, first ? 'primary' : ''), function () { start(which, a); }, {first: first});
          first = false;
        }
        if (hasMusic()) add('🎵', say('A nossa música', 'Our music', 'Nuestra música'), 'music');
        if (canHearTv()) add('📺', say('O som da TV', "The TV's sound", 'El sonido de la tele'), 'tv');
        if (canListen()) add('🎙', say('Ouvir a sala', 'Listen to the room', 'Escuchar la sala'), 'room');
        add('🌙', say('Luzes calmas', 'Calm lights', 'Luces tranquilas'), 'lights');
        if (window.Guides) a.add(UI.button(row, '📖  ' + say('Como jogar', 'How to play', 'Cómo jugar')), function () { Guides.show('lights'); });
        UI.el('div', 'bt-sub', box, say(
          'O microfone e o som da TV só são medidos, aqui na TV. Nada é gravado nem enviado.',
          "The microphone and the TV's sound are only measured, here on the TV. Nothing is recorded or sent.",
          'El micrófono y el sonido de la tele solo se miden, aquí en la tele. Nada se graba ni se envía.'));
      }
    });
  }

  return {open: open, answer: answer, core: {gate: gate, bands: bands, logBands: logBands, barLevels: barLevels, follow: follow,
    beats: beats, quiet: quiet, shuffle: shuffle, tooSlow: tooSlow, unpack: unpack, LOOKS: LOOKS, CALM: CALM,
    // For the tests: a stand-in canvas to draw on, and light mode without one.
    useContext: function (c, lightMode) { c2 = c; light = !!lightMode; stars = []; rangeKey = ''; spin = 0; },
    spin: function () { return spin; }}};
})();
