/*
 * Light show (ADR 0041, made a real visualiser by ADR 0044): the room's music drawn as light, full screen, started
 * from Games with the remote. It only moves to real sound: the family's own music (Beyond Music, shuffled), the room
 * through a microphone where the TV has one (a USB microphone or webcam usually), or on Google TV the TV's own sound,
 * so music playing in Spotify or YouTube Music can be drawn. With no sound the looks lie flat and still and say what
 * would wake them. Calm lights is the one choice with no sound at all: Beyond's four dots drifting slowly, no beat.
 * The sound is only read as how loud each pitch is and the shape of the wave, frame by frame, on the TV: never
 * recorded, kept or sent.
 *
 * Eleven looks, changed with left and right: Bars, Sound wave, Ring of light, Shooting stars, and since ADR 0070
 * Fireworks, Dance floor, Tunnel, Kaleidoscope, Lava lamp and Galaxy, and Piano notes (ADR 0071). Up hearts a look for whoever is watching (their
 * favourites come first), down shows every look in a row. OK skips to the next song, Back leaves. A TV that can't keep up drops to the light mode by itself (half the pixels, fewer bars, no glow);
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

  /**
   * The note being played (ADR 0071): the strongest pitch from 60 Hz to 2.1 kHz in one gated frame (each bin helped by
   * its second and third harmonics, so a note isn't taken for its own overtone), made exact from the wave by
   * autocorrelation. Its frequency in Hz, or 0 when nothing is clear enough to name.
   */
  var ACF = new Float32Array(160);
  function pitch(lv, len, nyq, wave) {
    var per = nyq / len, lo = Math.max(1, Math.floor(60 / per)), hi = Math.min(len - 2, Math.ceil(2100 / per)), best = 0, at = 0;
    for (var k = lo; k <= hi; k++) {
      var v = lv[k];
      if (v < 0.15) continue;
      var sc = v + (2 * k < len ? 0.6 * lv[2 * k] : 0) + (3 * k < len ? 0.4 * lv[3 * k] : 0);
      if (sc > best) { best = sc; at = k; }
    }
    if (!at) return 0;
    var a = lv[at - 1], b = lv[at], c = lv[at + 1], d = a - 2 * b + c;
    var f = (at + (d ? 0.5 * (a - c) / d : 0)) * per;
    if (!wave || wave.length < 256) return f;
    // The wave: the lag of the strongest echo near one cycle of that pitch gives the pitch to a fraction of a semitone.
    var sr = nyq * 2, n = wave.length, lag0 = sr / f, l0 = Math.max(2, Math.floor(lag0 * 0.94)), l1 = Math.min(n >> 1, Math.ceil(lag0 * 1.06));
    var bl = 0, bv = -1e18, vals = ACF;
    for (var lag = l0; lag <= l1; lag++) {
      var sum = 0;
      for (var i = 0; i + lag < n; i++) sum += (wave[i] - 128) * (wave[i + lag] - 128);
      sum /= n - lag;
      if (lag - l0 < vals.length) vals[lag - l0] = sum;
      if (sum > bv) { bv = sum; bl = lag; }
    }
    if (bv <= 0 || bl === l0 || bl === l1 || bl - l0 + 1 >= vals.length) return f;
    var j = bl - l0, p0 = vals[j - 1], p1 = vals[j], p2 = vals[j + 1], dd = p0 - 2 * p1 + p2;
    return sr / (bl + (dd ? 0.5 * (p0 - p2) / dd : 0));
  }

  /** A frequency as a note: {midi, step (0 is C), octave}, the nearest semitone to A 440. */
  function noteOf(f) {
    if (!(f > 0)) return null;
    var midi = Math.round(69 + 12 * Math.log(f / 440) / Math.LN2);
    return {midi: midi, step: ((midi % 12) + 12) % 12, octave: Math.floor(midi / 12) - 1};
  }

  /** The twelve note names in the language on screen (C to B; German says H for B, Portuguese and Spanish Do Re Mi). */
  function noteNames() {
    return say('Dó,Dó♯,Ré,Ré♯,Mi,Fá,Fá♯,Sol,Sol♯,Lá,Lá♯,Si', 'C,C♯,D,D♯,E,F,F♯,G,G♯,A,A♯,B', 'Do,Do♯,Re,Re♯,Mi,Fa,Fa♯,Sol,Sol♯,La,La♯,Si').split(',');
  }

  /**
   * A microphone that's asleep (ADR 0050): true once it has given exact silence for three seconds from the start. A
   * real microphone always hisses a little, even in a quiet room; the remote's gives nothing at all unless its button
   * is held. peak is the loudest sample lately, 0 to 1, or below 0 when this TV can't say (then never asleep).
   */
  function sleepy() {
    var start = null, heard = false;
    return function (peak, now) {
      if (heard || peak < 0) return false;
      if (start === null) start = now;
      if (peak > 0.0001) { heard = true; return false; }
      return now - start >= 3000;
    };
  }

  var SLOW = 60, FAST = 180;
  function steady(bpm) { return Math.max(SLOW, Math.min(FAST, Math.round(bpm))); }

  /**
   * Tap along (Keep the beat): each OK press is a tap; from the second, the speed of the last few taps in beats a
   * minute, else 0. A pause of over two seconds starts counting again.
   */
  function tapper() {
    var taps = [];
    return function (now) {
      if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
      taps.push(now);
      if (taps.length > 5) taps.shift();
      if (taps.length < 2) return 0;
      return steady(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    };
  }

  // Keep the beat's chords, two bars each: A minor, G, F, G.
  var CHORDS = [[220, 262, 330], [196, 247, 294], [175, 220, 262], [196, 247, 294]];

  /**
   * Keep the beat (ADR 0050): a made-up band for TVs with nothing to hear, picked on purpose and kept in time by the
   * person tapping OK. ms since the first beat at bpm fills freq (0 to 255 per pitch, bins up to nyq Hz) and wave the
   * way real music would: a kick on every beat, a snare on two and four, a hi-hat on every half beat, and a chord that
   * moves every two bars. Every look reads it like any other sound.
   */
  function beatFrame(ms, bpm, freq, wave, bins, nyq) {
    var pos = ms * bpm / 60000, n = Math.floor(pos), ph = pos - n, half = pos * 2 % 1;
    var kick = Math.exp(-ph * 7), snare = n % 2 ? Math.exp(-ph * 9) : 0, hat = Math.exp(-half * 16), pad = Math.exp(-half * 3);
    var notes = CHORDS[Math.floor(pos / 8) % CHORDS.length], per = nyq / bins, i, k, v, f;
    for (k = 0; k < bins; k++) {
      f = k * per; v = 0;
      if (f > 30 && f < 170) v = 250 * kick * (1 - Math.abs(Math.log(f / 60)) * 0.35);
      if (f > 180 && f < 3000 && snare) v = Math.max(v, 205 * snare * (0.65 + Math.random() * 0.35));
      if (f > 4000 && f < 13000) v = Math.max(v, 185 * hat * (0.55 + Math.random() * 0.45));
      for (i = 0; i < notes.length; i++) {
        var d = Math.abs(f - notes[i]) / per, d2 = Math.abs(f - notes[i] * 2) / per;
        if (d < 2) v = Math.max(v, 175 * pad * (1 - d / 2.5));
        if (d2 < 2) v = Math.max(v, 130 * pad * (1 - d2 / 2.5));
      }
      freq[k] = v > 255 ? 255 : v > 0 ? v : 0;
    }
    var t0 = ms / 1000, step = 1 / (nyq * 2);
    for (i = 0; i < wave.length; i++) {
      var t = t0 + i * step;
      var s = Math.sin(2 * Math.PI * 55 * t) * kick * 0.7 + Math.sin(2 * Math.PI * notes[0] * t) * pad * 0.2
        + (snare ? (Math.random() - 0.5) * snare * 0.3 : 0);
      wave[i] = Math.max(0, Math.min(255, Math.round(128 + s * 127)));
    }
  }

  /**
   * Movement in front of the camera (ADR 0050): two small grey frames (w by h, 0 to 255) compared cell by cell in a
   * cols by rows grid. Fills out with each cell's change, 0 to 1 (0 under the noise a still room gives), and returns
   * how much of the picture moved, 0 to 1. Mirrored, so a hand waved on the left ripples the left of the screen.
   */
  function motion(prev, cur, w, h, cols, rows, out) {
    var cw = w / cols, ch = h / rows, moved = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x0 = Math.floor(c * cw), x1 = Math.floor((c + 1) * cw), y0 = Math.floor(r * ch), y1 = Math.floor((r + 1) * ch), s = 0, n = 0;
        for (var y = y0; y < y1; y++) {
          for (var x = x0; x < x1; x++) {
            var d = cur[y * w + x] - prev[y * w + x];
            s += d < 0 ? -d : d; n++;
          }
        }
        var v = n ? s / n : 0, cell = r * cols + (cols - 1 - c);
        // Camera noise and a flickering light stay under 14 levels in a cell; a hand goes well over.
        out[cell] = v > 14 ? Math.min(1, (v - 14) / 40) : 0;
        if (out[cell]) moved++;
      }
    }
    return moved / (cols * rows);
  }

  // MARK: - Sound

  var actx = null, analyser = null, audio = null, mic = null, source = '';
  var songs = [], at = 0, base = null, beat = null, hush = null, onSong = null, tvAt = 0;
  // Listen to the room: on Google TV the app reads the microphone itself (roomNative); elsewhere the browser does.
  var roomNative = false, micKind = '', fbuf = null, asleep = null;
  // Keep the beat: how fast, and when its first beat fell.
  var bpm = 120, beatStart = 0, tap = null;
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
    var b = window.BeyondTable;
    if (b && b.roomStart) {
      allowed(function () {
        var got = '';
        try { got = b.roomStart() || ''; } catch (e) { got = ''; }
        if (!got) { done(false); return; }
        micKind = got;
        try { nyq = b.roomNyquist() || 24000; } catch (e) { nyq = 24000; }
        bins = FFT / 2;
        freq = new Uint8Array(bins);
        wave = new Uint8Array(FFT);
        tvAt = 0;
        roomNative = true;
        source = 'room';
        done(true);
      }, done);
      return;
    }
    allowed(function () {
      getMic(function (stream) {
        var c = context();
        // Never to the speakers: the room is already loud enough, and it would howl.
        if (!c || !hook(c.createMediaStreamSource(stream), false)) { stopStream(stream); done(false); return; }
        mic = stream;
        source = 'room';
        fbuf = analyser.getFloatTimeDomainData ? new Float32Array(analyser.fftSize) : null;
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

  /** The loudest sample lately, 0 to 1, for telling an asleep microphone from a quiet room; -1 when we can't tell. */
  function micPeak() {
    if (roomNative) { try { return window.BeyondTable.roomPeak(); } catch (e) { return -1; } }
    if (!analyser || !fbuf) return -1;
    analyser.getFloatTimeDomainData(fbuf);
    var p = 0;
    for (var i = 0; i < fbuf.length; i++) { var v = fbuf[i] < 0 ? -fbuf[i] : fbuf[i]; if (v > p) p = v; }
    return p;
  }

  /** Keep the beat: the made-up band takes over, at the speed last set. */
  function keepBeat() {
    silence();
    bins = FFT / 2; freq = new Uint8Array(bins); wave = new Uint8Array(FFT); nyq = 22050;
    source = 'beat';
    beatStart = Date.now();
    tap = tapper();
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
    if (roomNative) { try { window.BeyondTable.roomStop(); } catch (e) {} }
    audio = null; mic = null; analyser = null; songs = []; source = ''; onSong = null; roomNative = false; fbuf = null; micKind = '';
    if (actx && actx.suspend) { try { actx.suspend(); } catch (e) {} }
  }

  /** This frame's sound into freq and wave. Nothing to hear gives silence: zeros, and a flat wave. */
  function hear(now) {
    var i;
    if (source === 'beat') { beatFrame(now - beatStart, bpm, freq, wave, bins, nyq); return; }
    if (analyser) {
      analyser.getByteFrequencyData(freq);
      analyser.getByteTimeDomainData(wave);
      return;
    }
    if (source === 'tv' || roomNative) {
      // The Visualizer only has a new frame about 20 times a second: no point asking the bridge more often.
      if (now - tvAt < 30) return;
      tvAt = now;
      var b = window.BeyondTable, n = 0, m = 0;
      try {
        if (roomNative) { n = unpack(b.roomFft(), freq); m = unpack(b.roomWave(), wave); }
        else { n = unpack(b.tvFft(), freq); m = unpack(b.tvWave(), wave); }
      } catch (e) {}
      // The TV says how many pitches it measures (half its capture size); the bins spread over those only.
      if (n) bins = n;
      for (i = n; i < freq.length; i++) freq[i] = 0;
      for (i = m; i < wave.length; i++) wave[i] = 128;
      return;
    }
    for (i = 0; i < freq.length; i++) freq[i] = 0;
    for (i = 0; i < wave.length; i++) wave[i] = 128;
  }

  // MARK: - Wave to make ripples (ADR 0050)

  // The camera's picture is shrunk to 64 by 36 grey dots and compared with the one before, in a 16 by 9 grid. Nothing
  // is shown, kept or sent: two tiny frames live in memory and each is overwritten by the next.
  var CAM_W = 64, CAM_H = 36, COLS = 16, ROWS = 9;
  var waveOn = false, cam = null, camVideo = null, camCanvas = null, camCtx = null, camPrev = null, camCur = null, camAt = 0,
    camFilled = false, camAsked = null, camSeen = false;
  var cells = new Float32Array(COLS * ROWS), cellAt = [], ripples = [];

  // LG and Samsung: whether a camera is plugged in, asked once without opening it (no question on screen).
  try {
    if (!window.BeyondTable && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(function (list) {
        for (var i = 0; i < list.length; i++) if (list[i].kind === 'videoinput') camSeen = true;
      }, function () {});
    }
  } catch (e) {}

  /** A camera to wave at: Google TV says itself; elsewhere one showed up in the browser's list. */
  function canWatch() {
    var b = window.BeyondTable;
    if (b) return !!(b.canWatch && b.canWatch());
    return camSeen;
  }

  // Google TV's answer to its own "Allow Beyond TV to take pictures and record video?" (TableActivity).
  function cameraAnswer(yes) { if (camAsked) camAsked(!!yes); }

  function startCamera(done) {
    var b = window.BeyondTable;
    function go() {
      var md = navigator.mediaDevices, want = {audio: false, video: {width: 320, height: 180, facingMode: 'user'}};
      function ok(stream) {
        if (!layer) { stopStream(stream); return; }
        cam = stream;
        camVideo = document.createElement('video');
        camVideo.muted = true;
        camVideo.setAttribute('playsinline', '');
        camVideo.className = 'li-cam';
        if ('srcObject' in camVideo) camVideo.srcObject = stream;
        else camVideo.src = (window.URL || window.webkitURL).createObjectURL(stream);
        layer.appendChild(camVideo);
        try { var p = camVideo.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        camCanvas = document.createElement('canvas');
        camCanvas.width = CAM_W; camCanvas.height = CAM_H;
        camCtx = camCanvas.getContext('2d');
        camPrev = new Uint8Array(CAM_W * CAM_H); camCur = new Uint8Array(CAM_W * CAM_H); camFilled = false;
        done(true);
      }
      if (md && md.getUserMedia) md.getUserMedia(want).then(ok, function () { done(false); });
      else if (navigator.webkitGetUserMedia) navigator.webkitGetUserMedia(want, ok, function () { done(false); });
      else done(false);
    }
    if (b && b.askCamera) { camAsked = function (yes) { camAsked = null; if (yes) go(); else done(false); }; b.askCamera(); }
    else go();
  }

  function stopCamera() {
    if (cam) stopStream(cam);
    if (camVideo && camVideo.parentNode) camVideo.parentNode.removeChild(camVideo);
    cam = null; camVideo = null; camCtx = null; camCanvas = null; camPrev = null; camCur = null; ripples = []; cellAt = [];
  }

  /** About twelve times a second: the newest small frame against the last, and a ripple where a hand moved. */
  function watch(now) {
    if (!camCtx || !camVideo || camVideo.readyState < 2 || now - camAt < 80) return;
    camAt = now;
    var px;
    try {
      camCtx.drawImage(camVideo, 0, 0, CAM_W, CAM_H);
      px = camCtx.getImageData(0, 0, CAM_W, CAM_H).data;
    } catch (e) { return; }
    var swap = camPrev; camPrev = camCur; camCur = swap;
    for (var i = 0, j = 0; i < camCur.length; i++, j += 4) camCur[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    if (!camFilled) { camFilled = true; return; }
    motion(camPrev, camCur, CAM_W, CAM_H, COLS, ROWS, cells);
    var born = 0, most = light ? 12 : 28;
    for (var c = 0; c < cells.length && born < 2 && ripples.length < most; c++) {
      if (!cells[c] || now - (cellAt[c] || 0) < 350) continue;
      cellAt[c] = now;
      born++;
      ripples.push({x: (c % COLS + 0.5) * W / COLS, y: (Math.floor(c / COLS) + 0.5) * H / ROWS, r: 8, life: 1, v: cells[c], c: DOTS[c % 4]});
    }
  }

  /** The ripples over whatever look is on: they spread faster and wider the louder the music, and flash on a beat. */
  function drawRipples(f) {
    if (!ripples.length) return;
    var lvl = f.b.level;
    c2.globalCompositeOperation = 'source-over';
    for (var i = ripples.length - 1; i >= 0; i--) {
      var p = ripples[i];
      p.r += 5 + lvl * 22 + (f.hit ? 10 : 0);
      p.life -= 0.016;
      if (p.life <= 0) { ripples.splice(i, 1); continue; }
      var wide = (3 + p.v * 8) * (0.7 + lvl);
      c2.beginPath();
      c2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (!light) {
        c2.globalAlpha = p.life * 0.22;
        c2.strokeStyle = p.c;
        c2.lineWidth = wide * 4;
        c2.stroke();
      }
      c2.globalAlpha = p.life * 0.9;
      c2.strokeStyle = f.hit ? EMBER : p.c;
      c2.lineWidth = wide;
      c2.stroke();
    }
    c2.globalAlpha = 1;
  }

  // MARK: - The looks

  var c2 = null, light = false, stars = [], spin = 0, flash = 0;
  // The newer looks: rockets, the tunnel's frames, a shared counter for colours, and how far a look has turned or flown.
  var rockets = [], rings = [], count = 0, twist = 0, gap = 0;
  // Piano notes: the note on show, one that may replace it, how long it has held, the fade, the last few, the names.
  var keyNow = null, keyNext = null, keyHeld = 0, keyFade = 0, keyTrail = [], keyNames = null;
  function resetLooks() { stars = []; rockets = []; rings = []; twist = 0; gap = 0; keyNow = null; keyNext = null; keyHeld = 0; keyFade = 0; keyTrail = []; keyNames = null; }

  // The lava lamp's blobs and the galaxy's stars, laid out once (a fixed seed, so every TV draws the same galaxy).
  var BLOBS = [], GALAXY = [];
  (function () {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var cs = [DOTS[0], DOTS[1], DOTS[2], DOTS[3], VIOLET, LILAC];
    for (var i = 0; i < 6; i++) BLOBS.push({x: 260 + i * 280, sp: 0.6 + rnd() * 0.8, ph: rnd() * 6.28, r: 90 + rnd() * 70, c: cs[i]});
    for (i = 0; i < 360; i++) GALAXY.push({arm: i % 4, t: rnd(), ja: (rnd() - 0.5) * 0.5, jr: (rnd() - 0.5) * 40});
  })();
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
    {id: 'bars', icon: '📊', name: function () { return say('Barras', 'Bars', 'Barras'); }, draw: function (f) {
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
    {id: 'wave', icon: '〰️', name: function () { return say('Onda sonora', 'Sound wave', 'Onda sonora'); }, draw: function (f) {
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
    {id: 'ring', icon: '⭕', name: function () { return say('Anel de luz', 'Ring of light', 'Anillo de luz'); }, draw: function (f) {
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
    {id: 'stars', icon: '🌠', name: function () { return say('Estrelas cadentes', 'Shooting stars', 'Estrellas fugaces'); }, draw: function (f) {
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
    }},

    // ADR 0070: six more, each its own idea, all still in silence like the four above.
    {id: 'fireworks', icon: '🎆', name: function () { return say('Fogos de artifício', 'Fireworks', 'Fuegos artificiales'); }, draw: function (f) {
      clear(light ? 0.45 : 0.2);
      var b = f.b, max = light ? 160 : 420, i, p;
      // A rocket goes up on each beat, now and then another while it's loud; none in silence.
      if ((f.hit || (b.level > 0.4 && Math.random() < b.level * 0.04)) && rockets.length < (light ? 3 : 6)) {
        rockets.push({x: 260 + Math.random() * (W - 520), y: H + 10, vy: -(16 + Math.random() * 5 + b.bass * 8),
          top: H * (0.14 + Math.random() * 0.3), c: DOTS[count++ % 4]});
      }
      for (i = rockets.length - 1; i >= 0; i--) {
        p = rockets[i];
        p.y += p.vy;
        if (p.y <= p.top) {
          // The burst: a ring of sparks in the rocket's colour, a few paper ones, wider the louder the music.
          var n = light ? 22 : 44, pow = 3 + b.level * 5;
          for (var s = 0; s < n && stars.length < max; s++) {
            var a = s / n * Math.PI * 2 + Math.random() * 0.2, sp = pow * (0.55 + Math.random() * 0.6);
            stars.push({x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: s % 7 ? p.c : PAPER, r: 2.5 + Math.random() * 2});
          }
          rockets.splice(i, 1);
          continue;
        }
        c2.globalAlpha = 0.5;
        c2.strokeStyle = p.c;
        c2.lineWidth = 4;
        c2.beginPath();
        c2.moveTo(p.x, p.y);
        c2.lineTo(p.x, p.y - p.vy * 3);
        c2.stroke();
        c2.globalAlpha = 1;
        disc(p.x, p.y, 5, PAPER);
      }
      for (i = stars.length - 1; i >= 0; i--) {
        p = stars[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.013;
        if (p.life <= 0) { stars.splice(i, 1); continue; }
        if (!light) { c2.globalAlpha = p.life * 0.2; disc(p.x, p.y, p.r * 3, p.c); }
        c2.globalAlpha = p.life;
        disc(p.x, p.y, p.r * (0.5 + p.life), p.c);
      }
      c2.globalAlpha = 1;
    }},
    {id: 'disco', icon: '💃', name: function () { return say('Pista de dança', 'Dance floor', 'Pista de baile'); }, draw: function (f) {
      clear(1);
      // Tiles in columns: the lows in the middle, the highs out to the sides, lit from the floor up. The colours step
      // round on every beat.
      var cols = 14, half = cols / 2, rows = 6, left = 90, top = 130, tw = (W - left * 2) / cols, th = (H - top - 180) / rows;
      bars(f, half);
      if (f.hit) count++;
      for (var c = 0; c < cols; c++) {
        var k = c < half ? half - 1 - c : c - half, v = val[k], lit = v * rows;
        for (var r = 0; r < rows; r++) {
          var up = rows - 1 - r, on = up < lit, x = left + c * tw, y = top + r * th;
          c2.fillStyle = DOTS[(k + up + count) % 4];
          // A lit tile glows brighter and pops out a little.
          var glow = on ? Math.min(1, lit - up) : 0, pad = 10 - glow * 6;
          c2.globalAlpha = on ? 0.45 + 0.55 * glow : 0.07;
          c2.fillRect(x + pad, y + pad, tw - pad * 2, th - pad * 2);
          if (on && !light) {
            c2.globalAlpha = 0.35;
            c2.fillStyle = PAPER;
            c2.fillRect(x + 6, y + 6, tw - 12, 6);
          }
        }
      }
      c2.globalAlpha = 1;
    }},
    {id: 'tunnel', icon: '🌀', name: function () { return say('Túnel', 'Tunnel', 'Túnel'); }, draw: function (f) {
      clear(light ? 1 : 0.35);
      var b = f.b, sp = b.level * 0.03 + (f.hit ? 0.02 : 0), cx = W / 2, cy = H / 2;
      if (!rings.length) for (var z0 = 0.1; z0 < 1.1; z0 += 0.12) rings.push({z: z0, c: DOTS[count++ % 4]});
      // Frames fly out of the middle as fast as the music is loud, turning a little: still in silence.
      gap += sp;
      if (gap > 0.12) { gap -= 0.12; rings.push({z: 0, c: DOTS[count++ % 4]}); }
      twist += b.level * 0.012;
      c2.lineJoin = 'round';
      for (var i = rings.length - 1; i >= 0; i--) {
        var g = rings[i];
        g.z += sp * (0.4 + g.z * 1.6);
        if (g.z > 1.15) { rings.splice(i, 1); continue; }
        var s = g.z * g.z, hw = 30 + s * W * 0.62, hh = hw * 0.5625, a = twist + g.z * 0.7, cs = Math.cos(a), sn = Math.sin(a);
        c2.globalAlpha = Math.min(1, g.z * 3) * (0.55 + b.level * 0.45);
        c2.strokeStyle = g.c;
        c2.lineWidth = 2 + s * (light ? 14 : 22);
        c2.beginPath();
        for (var k = 0; k < 5; k++) {
          var px = (k === 1 || k === 2) ? hw : -hw, py = k >= 2 && k < 4 ? hh : -hh;
          var x = cx + px * cs - py * sn, y = cy + px * sn + py * cs;
          if (k) c2.lineTo(x, y); else c2.moveTo(x, y);
        }
        c2.stroke();
      }
      c2.globalAlpha = 1;
      mark(cx, cy, 34, b);
    }},
    {id: 'kaleido', icon: '🔮', name: function () { return say('Caleidoscópio', 'Kaleidoscope', 'Caleidoscopio'); }, draw: function (f) {
      clear(light ? 1 : 0.25);
      var n = light ? 12 : 24, seg = light ? 6 : 8, cx = W / 2, cy = H / 2, step = Math.PI * 2 / seg;
      bars(f, n);
      twist += f.b.level * 0.008;
      // Each pitch a dot at its own distance, mirrored round the middle so the pattern is always even.
      for (var i = 0; i < n; i++) {
        var v = val[i], rad = 60 + i / n * 460, off = i * 0.35 + twist * (i % 2 ? 1 : -1), size = 4 + v * 36;
        c2.globalAlpha = 0.25 + v * 0.75;
        for (var s = 0; s < seg; s++) {
          var a = s * step + off, a2 = s * step - off;
          disc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, size, DOTS[i % 4]);
          disc(cx + Math.cos(a2) * rad, cy + Math.sin(a2) * rad, size, v > 0.85 ? EMBER : (i % 2 ? LILAC : VIOLET));
        }
      }
      c2.globalAlpha = 1;
      mark(cx, cy, 50, f.b);
    }},
    {id: 'lava', icon: '💧', name: function () { return say('Lâmpada de lava', 'Lava lamp', 'Lámpara de lava'); }, draw: function (f) {
      clear(1);
      var b = f.b, i, k;
      // Big soft blobs that drift up and down as the music plays, and swell on the lows.
      twist += b.level * 0.02 + (f.hit ? 0.01 : 0);
      for (i = 0; i < BLOBS.length; i++) {
        k = BLOBS[i];
        var x = k.x + Math.sin(twist * 0.7 * k.sp + k.ph * 2) * 140, y = H / 2 + Math.sin(twist * k.sp + k.ph) * H * 0.34;
        var r = k.r * (0.8 + b.bass * 0.5 + (i % 2 ? b.mid : b.high) * 0.3);
        if (!light) { c2.globalAlpha = 0.1; disc(x, y, r * 1.9, k.c); c2.globalAlpha = 0.2; disc(x, y, r * 1.35, k.c); }
        c2.globalAlpha = 0.8;
        disc(x, y, r, k.c);
      }
      c2.globalAlpha = 1;
    }},
    {id: 'piano', icon: '🎹', name: function () { return say('Notas de piano', 'Piano notes', 'Notas de piano'); }, draw: function (f) {
      clear(1);
      // The note heard, named big, and lit on a three octave keyboard (C3 to B5; higher and lower notes light the same
      // key an octave in). A new note shows only once it has held for three frames, so a passing overtone doesn't flash.
      var nt = noteOf(pitch(f.lv, f.len, f.nyq, f.wave));
      if (nt && (!keyNow || nt.midi !== keyNow.midi)) {
        if (keyNext && keyNext.midi === nt.midi) keyHeld++; else { keyNext = nt; keyHeld = 1; }
        if (keyHeld >= 3) { keyNow = nt; keyFade = 1; keyTrail.push(nt); if (keyTrail.length > 12) keyTrail.shift(); }
      } else if (nt) keyFade = 1;
      else if (keyFade > 0) keyFade = Math.max(0, keyFade - 0.02);
      if (!keyNames) keyNames = noteNames();
      var left = 150, kw = (W - left * 2) / 21, top = 590, kh = 280, i, x, lit = -1;
      if (keyNow && keyFade > 0) lit = ((keyNow.midi - 48) % 36 + 36) % 36;
      var colour = keyNow ? DOTS[keyNow.step % 4] : LILAC;
      // White keys, then the black ones over them.
      var white = [0, 2, 4, 5, 7, 9, 11], wi = 0;
      for (i = 0; i < 36; i++) {
        if (white.indexOf(i % 12) < 0) continue;
        x = left + wi * kw;
        c2.globalAlpha = 1;
        c2.fillStyle = i === lit ? colour : PAPER;
        if (i === lit) c2.globalAlpha = 0.4 + 0.6 * keyFade;
        c2.fillRect(x + 3, top, kw - 6, kh);
        wi++;
      }
      wi = 0;
      for (i = 0; i < 36; i++) {
        if (white.indexOf(i % 12) >= 0) { wi++; continue; }
        x = left + wi * kw - kw * 0.32;
        c2.globalAlpha = i === lit ? 0.4 + 0.6 * keyFade : 1;
        c2.fillStyle = i === lit ? colour : '#22221F';
        c2.fillRect(x, top, kw * 0.64, kh * 0.62);
      }
      c2.globalAlpha = 1;
      // The last notes, small, along the top: a tune shows as it's played.
      c2.textAlign = 'center';
      c2.textBaseline = 'middle';
      c2.font = '600 40px Sora, Inter, Arial, sans-serif';
      for (i = 0; i < keyTrail.length; i++) {
        c2.globalAlpha = 0.25 + 0.6 * (i + 1) / keyTrail.length;
        c2.fillStyle = DOTS[keyTrail[i].step % 4];
        c2.fillText(keyNames[keyTrail[i].step], W / 2 + (i - keyTrail.length + 1) * 110 + 550, 150);
      }
      if (keyNow) {
        // A soft glow behind the name that breathes with how loud it is.
        c2.globalAlpha = 0.12 + 0.2 * keyFade;
        disc(W / 2, 360, 140 + f.b.level * 90, colour);
        c2.globalAlpha = 0.25 + 0.75 * keyFade;
        c2.fillStyle = colour;
        c2.font = '800 240px Sora, Inter, Arial, sans-serif';
        c2.fillText(keyNames[keyNow.step], W / 2, 370);
        c2.font = '600 40px Sora, Inter, Arial, sans-serif';
        c2.fillStyle = PAPER;
        c2.fillText(keyNow.midi === 60 ? say('Dó central', 'Middle C', 'Do central') : keyNames[keyNow.step] + keyNow.octave, W / 2, 530);
      } else {
        c2.globalAlpha = 0.35;
        c2.fillStyle = PAPER;
        c2.font = '800 200px Sora, Inter, Arial, sans-serif';
        c2.fillText('♪', W / 2, 370);
      }
      c2.globalAlpha = 1;
    }},
    {id: 'galaxy', icon: '🌌', name: function () { return say('Galáxia', 'Galaxy', 'Galaxia'); }, draw: function (f) {
      clear(light ? 1 : 0.3);
      var b = f.b, cx = W / 2, cy = H / 2, by = light ? 3 : 1;
      bars(f, 16);
      // Four arms in the four dots' colours, the middle turning faster: the lows light the middle, the highs the edge.
      twist += b.level * 0.012 + (f.hit ? 0.01 : 0);
      for (var i = 0; i < GALAXY.length; i += by) {
        var g = GALAXY[i], v = val[Math.min(15, Math.floor(g.t * 16))], rad = 30 + g.t * 500;
        var a = g.arm * Math.PI / 2 + g.t * 4.2 + twist * (1.4 - g.t) + g.ja;
        c2.globalAlpha = 0.3 + v * 0.7;
        disc(cx + Math.cos(a) * (rad + g.jr) * 1.45, cy + Math.sin(a) * (rad + g.jr) * 0.8, 1.5 + v * 7 + (1 - g.t) * 2, DOTS[g.arm]);
      }
      c2.globalAlpha = 0.5;
      disc(cx, cy, 30 + b.bass * 50, PAPER);
      c2.globalAlpha = 1;
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
  var kind = '', hushed = false, deafSince = 0, toldDeaf = false, note = null, noteAt = 0, runAt = 0;
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

  /** A long line in the middle for a while, for what needs saying in more than a toast. */
  function tell(text, ms) {
    note.textContent = text;
    UI.setClass(note, 'shown', true);
    noteAt = Date.now() + (ms || 12000);
  }

  /**
   * Listen to the room heard exact silence for three seconds: the microphone is asleep (on most TVs it's in the remote,
   * which only listens while its button is held). Say so plainly and keep the beat instead, so the show still moves.
   */
  function checkAsleep(now) {
    if (!asleep || kind !== 'room') return;
    if (now - runAt > 4500) { asleep = null; return; }
    if (!asleep(micPeak(), now)) return;
    asleep = null;
    var usb = micKind === 'usb';
    keepBeat();
    kind = 'beat';
    help.textContent = helpText();
    UI.setClass(hint, 'shown', false);
    hushed = false;
    tell(usb
      ? say('O microfone não está ouvindo nada. Ele está bem conectado? Por enquanto, aperte OK no ritmo da música.',
        "The microphone isn't hearing anything. Is it plugged in properly? For now, tap OK in time with the music.",
        'El micrófono no oye nada. ¿Está bien conectado? Por ahora, pulsa OK al ritmo de la música.')
      : say('O microfone desta TV fica no controle e só ouve enquanto você segura o botão, então não ouve a sala. Uma webcam ou microfone USB ligado na TV ouve. Por enquanto, aperte OK no ritmo da música.',
        "This TV's microphone is in the remote, and it only listens while you hold its button, so it can't hear the room. A USB webcam or microphone plugged into the TV can. For now, tap OK in time with the music.",
        'El micrófono de esta tele está en el mando y solo escucha mientras mantienes pulsado su botón, así que no oye la sala. Una webcam o un micrófono USB conectado a la tele sí. Por ahora, pulsa OK al ritmo de la música.'), 16000);
  }

  function helpText() {
    if (kind === 'music') return say('◀ ▶ outro visual  ·  ▲ ♥ favorito  ·  ▼ todos  ·  OK próxima música  ·  Voltar para sair', '◀ ▶ another look  ·  ▲ ♥ favourite  ·  ▼ all the looks  ·  OK next song  ·  Back to leave', '◀ ▶ otro efecto  ·  ▲ ♥ favorito  ·  ▼ todos  ·  OK siguiente canción  ·  Atrás para salir');
    if (kind === 'lights') return say('Voltar para sair', 'Back to leave', 'Atrás para salir');
    if (kind === 'beat') return say('◀ ▶ outro visual  ·  ▲ ♥ favorito  ·  ▼ todos  ·  OK no ritmo  ·  Voltar para sair', '◀ ▶ another look  ·  ▲ ♥ favourite  ·  ▼ all the looks  ·  OK in time with the music  ·  Back to leave', '◀ ▶ otro efecto  ·  ▲ ♥ favorito  ·  ▼ todos  ·  OK al ritmo  ·  Atrás para salir');
    return say('◀ ▶ outro visual  ·  ▲ ♥ favorito  ·  ▼ todos  ·  Voltar para sair', '◀ ▶ another look  ·  ▲ ♥ favourite  ·  ▼ all the looks  ·  Back to leave', '◀ ▶ otro efecto  ·  ▲ ♥ favorito  ·  ▼ todos  ·  Atrás para salir');
  }

  function bpmText() { return bpm + ' ' + say('batidas por minuto', 'beats a minute', 'golpes por minuto'); }

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
    if (cam) { watch(now); drawRipples(f); }
    if (kind !== 'lights' && kind !== 'beat' && f.quiet !== hushed) { hushed = f.quiet; UI.setClass(hint, 'shown', hushed); }
    checkDeaf(now);
    checkAsleep(now);
    if (noteAt && now > noteAt) { noteAt = 0; UI.setClass(note, 'shown', false); }
    if (hideAt && now > hideAt) { hideAt = 0; UI.setClass(help, 'shown', false); UI.setClass(label, 'shown', false); }
    raf = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (fn) { return setTimeout(fn, 33); })(frame);
  }

  function setLight(on) {
    light = on;
    var s = on ? 0.5 : 1;
    canvas.width = W * s; canvas.height = H * s;
    c2.setTransform(s, 0, 0, s, 0, 0);
    resetLooks();
    times = [];
  }

  /** The song or the look's name, for a few seconds. */
  function show(text) {
    label.textContent = text;
    UI.setClass(label, 'shown', true);
    hideAt = Date.now() + 5000;
  }

  // MARK: - Favourites and the row of looks (ADR 0070)

  var FAVE_KEY = 'bt-lights-faves', faves = [], shelf = null;

  /** Who's watching, for their own favourites; the whole family when nobody is picked. */
  function whoId() {
    try { var p = window.Profiles && Profiles.current && Profiles.current(); return p && p.id ? String(p.id) : 'together'; } catch (e) { return 'together'; }
  }

  /** The looks in the order ◀ ▶ and the row go through: favourites first, each group in the usual order. */
  function order(favs) {
    var first = [], rest = [];
    for (var i = 0; i < LOOKS.length; i++) (favs.indexOf(LOOKS[i].id) >= 0 ? first : rest).push(i);
    return first.concat(rest);
  }

  /** A favourite on or off: a new list, never more than the looks there are, and only real looks. */
  function toggled(favs, id) {
    var out = [];
    for (var i = 0; i < favs.length; i++) if (favs[i] !== id && known(favs[i])) out.push(favs[i]);
    if (favs.indexOf(id) < 0 && known(id)) out.push(id);
    return out;
  }

  function known(id) { for (var i = 0; i < LOOKS.length; i++) if (LOOKS[i].id === id) return true; return false; }

  /** Everybody's favourites, kept on this TV: {person: [look ids]}. */
  function allFaves() {
    try { var v = JSON.parse(window.localStorage.getItem(FAVE_KEY)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }

  function loadFaves(who) {
    var list = allFaves()[who], out = [];
    if (list && list.length) for (var i = 0; i < list.length; i++) if (known(list[i]) && out.indexOf(list[i]) < 0) out.push(list[i]);
    return out;
  }

  function saveFaves(who, list) {
    var all = allFaves();
    all[who] = list;
    try { window.localStorage.setItem(FAVE_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function isFave(i) { return faves.indexOf(LOOKS[i].id) >= 0; }
  function lookName(i) { return (isFave(i) ? '♥  ' : '') + LOOKS[i].name(); }

  /** ◀ ▶: the next look in the favourites-first order. */
  function turn(dir) {
    var ord = order(faves), at2 = ord.indexOf(look), n = ord.length;
    look = ord[((at2 < 0 ? 0 : at2) + dir + n) % n];
    resetLooks();
    clear(1);
    show(lookName(look));
    if (shelf) drawShelf();
  }

  /** ▲: this look in or out of the favourites of whoever is watching. */
  function favourite() {
    var id = LOOKS[look].id;
    faves = toggled(faves, id);
    saveFaves(whoId(), faves);
    show(isFave(look)
      ? '♥  ' + LOOKS[look].name() + '  ·  ' + say('nos seus favoritos', 'in your favourites', 'en tus favoritos')
      : LOOKS[look].name() + '  ·  ' + say('fora dos favoritos', 'out of your favourites', 'fuera de tus favoritos'));
    if (shelf) drawShelf();
  }

  /** ▼: every look in a row along the bottom, favourites first; ◀ ▶ try them, ▲ hearts one, OK or ▼ closes it. */
  function openShelf() {
    shelf = UI.el('div', 'li-shelf', layer);
    drawShelf();
    UI.setClass(help, 'shown', false);
    UI.setClass(label, 'shown', false);
    hideAt = 0;
  }

  function drawShelf() {
    while (shelf.firstChild) shelf.removeChild(shelf.firstChild);
    UI.el('div', 'li-shelf-title', shelf, say('Todos os visuais  ·  ▲ ♥ favorito  ·  OK pronto',
      'All the looks  ·  ▲ ♥ favourite  ·  OK done', 'Todos los efectos  ·  ▲ ♥ favorito  ·  OK listo'));
    var row = UI.el('div', 'li-shelf-row', shelf), ord = order(faves);
    for (var i = 0; i < ord.length; i++) {
      var j = ord[i], tile = UI.el('div', 'li-tile' + (j === look ? ' focus' : '') + (isFave(j) ? ' fave' : ''), row);
      UI.el('div', 'li-tile-icon', tile, LOOKS[j].icon || '✨');
      UI.el('div', 'li-tile-name', tile, LOOKS[j].name());
      if (isFave(j)) UI.el('div', 'li-tile-heart', tile, '♥');
    }
  }

  function closeShelf() {
    if (shelf && shelf.parentNode) shelf.parentNode.removeChild(shelf);
    shelf = null;
    show(lookName(look));
  }

  function shelfKey(k) {
    if (k === TV.keys.left || k === TV.keys.right) { turn(k === TV.keys.right ? 1 : -1); return true; }
    if (k === TV.keys.up) { favourite(); return true; }
    if (k === TV.keys.ok || k === TV.keys.down) { closeShelf(); return true; }
    return false;
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
        note = UI.el('div', 'li-note', l, '');
        help = UI.el('div', 'li-help shown', l, helpText());
      },
      key: function (k) {
        if (shelf) return shelfKey(k);
        if (kind !== 'lights' && k === TV.keys.up) { favourite(); return true; }
        if (kind !== 'lights' && k === TV.keys.down) { openShelf(); return true; }
        if (kind === 'beat' && k === TV.keys.ok) {
          var now = Date.now(), t = tap(now);
          // The beat lands on each tap, so it locks to the music after one press; the speed from the second.
          beatStart = now;
          if (t) bpm = t;
          show(bpmText());
          return true;
        }
        if ((k === TV.keys.left || k === TV.keys.right) && kind !== 'lights') {
          turn(k === TV.keys.right ? 1 : -1);
          return true;
        }
        if (k === TV.keys.ok) {
          if (source === 'music') next();
          else show(kind === 'lights' ? CALM.name() : lookName(look));
          UI.setClass(help, 'shown', true);
          hideAt = Date.now() + 5000;
          return true;
        }
        return k === TV.keys.up || k === TV.keys.down || k === TV.keys.left || k === TV.keys.right;
      },
      back: function () {
        if (!shelf) return false;
        closeShelf();
        return true;
      },
      closed: stop
    });
    faves = loadFaves(whoId());
    if (faves.length) look = order(faves)[0];
    var b = window.BeyondTable;
    setLight(!!(b && b.lowPower && b.lowPower()));
    beat = beats();
    hush = quiet();
    clean = gate(bins);
    hushed = false; deafSince = 0; toldDeaf = false; spin = 0; rangeKey = ''; noteAt = 0;
    asleep = which === 'room' ? sleepy() : null;
    runAt = Date.now();
    prev = 0;
    hideAt = Date.now() + 6000;
    clear(1);
    if (which === 'music') {
      onSong = function (s) { show((s.title || '') + (s.artist ? '  ·  ' + s.artist : '')); };
      if (songs.length) onSong(songs[at % songs.length]);
    } else if (which === 'beat') {
      tell(say('Aperte OK no ritmo da música e as luzes acompanham.',
        'Tap OK in time with the music and the lights will keep the beat.',
        'Pulsa OK al ritmo de la música y las luces lo seguirán.'), 8000);
      show(bpmText());
    } else show(which === 'lights' ? CALM.name() : lookName(look));
    if (waveOn) {
      startCamera(function (ok) {
        if (!layer) return;
        if (ok) show(say('Acene para a câmera 👋', 'Wave at the camera 👋', 'Saluda a la cámara 👋'));
        else UI.toast(say('A câmera não ligou. Uma webcam USB ligada na TV funciona na maioria das TVs Google.',
          "The camera didn't start. A USB webcam plugged into the TV works on most Google TVs.",
          'La cámara no se encendió. Una webcam USB conectada a la tele funciona en la mayoría de las Google TV.'));
      });
    }
    frame();
  }

  function stop() {
    if (raf) { (window.cancelAnimationFrame || window.webkitCancelAnimationFrame || clearTimeout)(raf); raf = null; }
    silence();
    stopCamera();
    asleep = null; noteAt = 0;
    c2 = null; canvas = null; layer = null; shelf = null; resetLooks(); kind = '';
    bins = FFT / 2; freq = new Uint8Array(bins); wave = new Uint8Array(FFT); nyq = 22050;
  }

  function start(which, pick) {
    if (which === 'lights') { pick.close(); run('lights'); return; }
    if (which === 'beat') { pick.close(); keepBeat(); run('beat'); return; }
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

  function waveLabel() {
    return '👋  ' + (waveOn ? say('Acenar faz ondas: ligado', 'Wave to make ripples: on', 'Saludar hace ondas: sí') : say('Acenar faz ondas: desligado', 'Wave to make ripples: off', 'Saludar hace ondas: no'));
  }

  /**
   * Which microphone the room would be heard through: "usb" for one plugged in, "tv" for one built in (on Google TV
   * usually the remote's), "" for none. LG and Samsung can't say before asking, so "usb" when the browser can listen.
   */
  function micHere() {
    var b = window.BeyondTable;
    if (b && b.micKind) { try { return b.micKind() || (canListen() ? 'tv' : ''); } catch (e) { return ''; } }
    return canListen() ? 'usb' : '';
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
        add('🥁', say('Manter o ritmo', 'Keep the beat', 'Llevar el ritmo'), 'beat');
        add('🌙', say('Luzes calmas', 'Calm lights', 'Luces tranquilas'), 'lights');
        if (canWatch()) {
          var waveBtn = UI.button(row, waveLabel());
          a.add(waveBtn, function () { waveOn = !waveOn; waveBtn.lastChild.textContent = waveLabel(); });
        }
        if (window.Guides) a.add(UI.button(row, '📖  ' + say('Como jogar', 'How to play', 'Cómo jugar')), function () { Guides.show('lights'); });
        var mk = micHere();
        if (mk !== 'usb') UI.el('div', 'bt-sub', box, mk === ''
          ? say('Esta TV não tem microfone para ouvir a sala. Ligue uma webcam ou microfone USB na TV, ou escolha Manter o ritmo.',
            "This TV has no microphone to hear the room. Plug a USB webcam or microphone into the TV, or pick Keep the beat.",
            'Esta tele no tiene micrófono para oír la sala. Conecta una webcam o un micrófono USB a la tele, o elige Llevar el ritmo.')
          : say('O microfone do controle não ouve a sala. Uma webcam ou microfone USB ligado na TV ouve.',
            "A remote's microphone can't hear the room. A USB webcam or microphone plugged into the TV can.",
            'El micrófono del mando no oye la sala. Una webcam o un micrófono USB conectado a la tele sí.'));
        UI.el('div', 'bt-sub', box, say(
          'O microfone, o som da TV e a câmera só são medidos, aqui na TV. Nada é gravado, mostrado nem enviado.',
          "The microphone, the TV's sound and the camera are only measured, here on the TV. Nothing is recorded, shown or sent.",
          'El micrófono, el sonido de la tele y la cámara solo se miden, aquí en la tele. Nada se graba, se muestra ni se envía.'));
      }
    });
  }

  return {open: open, answer: answer, cameraAnswer: cameraAnswer, core: {gate: gate, bands: bands, logBands: logBands, barLevels: barLevels, follow: follow,
    beats: beats, quiet: quiet, shuffle: shuffle, tooSlow: tooSlow, unpack: unpack, LOOKS: LOOKS, CALM: CALM,
    sleepy: sleepy, tapper: tapper, order: order, toggled: toggled, pitch: pitch, noteOf: noteOf, loadFaves: loadFaves, saveFaves: saveFaves, beatFrame: beatFrame, motion: motion, drawRipples: function (f, list) { ripples = list; drawRipples(f); return ripples; },
    // For the tests: a stand-in canvas to draw on, and light mode without one.
    useContext: function (c, lightMode) { c2 = c; light = !!lightMode; resetLooks(); rangeKey = ''; spin = 0; },
    spin: function () { return spin; }}};
})();
