/*
 * Light show (ADR 0041): the room's music drawn as light, full screen, started from Games with the remote. The sound
 * comes from the family's own music (Beyond Music, shuffled), from the room through a microphone where the TV has
 * one (a USB microphone or webcam usually), or from nothing at all ("Just lights", a made-up beat). The sound is only
 * read as how loud each pitch is, frame by frame, on the TV: never recorded, kept or sent.
 *
 * Four looks, changed with left and right: Ring of light, Northern lights, Shooting stars and Dancing dots. OK skips
 * to the next song, Back leaves. A TV that can't keep up drops to the light mode by itself (half the pixels, fewer
 * stars, no glow); Google TV says so up front on its older and 1 GB TVs.
 *
 * LG and Samsung run it on the home screen; Google TV in TableActivity's WebView (start "lights"), where the music
 * comes through the TV's own relay (BeyondTable.music) and the microphone is asked for by the app (BeyondTable.ask).
 * Web only: there is no Java twin. Plain ES5, one canvas.
 */
var Lights = (function () {
  'use strict';

  var W = 1920, H = 1080;
  var VOID = '#0D0C18', PAPER = '#F7F6F2', VIOLET = '#6E3DDB', LILAC = '#9E7BFF', EMBER = '#E8A33D';
  // Beyond's four dots: moss, ember, coral and blue.
  var DOTS = ['#2F7D6D', '#E8A33D', '#D85A30', '#378ADD'];
  var BINS = 256;

  function say(pt, en, es) { return typeof tr === 'function' ? tr(pt, en, es) : en; }

  // MARK: - The sums, apart from the screen (tests/lights.test.js)

  /** How loud the lows, the middle and the highs are, each 0 to 1, from one frame of 0 to 255 levels. */
  function bands(data, n) {
    n = n || data.length;
    var lowEnd = Math.max(2, Math.round(n * 0.04)), midEnd = Math.round(n * 0.25), highEnd = Math.round(n * 0.7);
    function avg(a, b) {
      var s = 0;
      for (var i = a; i < b; i++) s += data[i];
      return b > a ? s / (b - a) / 255 : 0;
    }
    var bass = avg(0, lowEnd), mid = avg(lowEnd, midEnd), high = avg(midEnd, highEnd);
    return {bass: bass, mid: mid, high: high, level: (bass * 2 + mid + high) / 4};
  }

  /**
   * A beat: the lows jump well above their recent average. Never twice inside a quarter of a second, and never in
   * near silence, so a quiet room doesn't flash.
   */
  function beats() {
    var avg = 0, last = -1e9;
    return function (bass, now) {
      var hit = bass > 0.25 && bass > avg * 1.3 + 0.04 && now - last > 250;
      avg = avg * 0.92 + bass * 0.08;
      if (hit) last = now;
      return hit;
    };
  }

  /** "Just lights": a made-up spectrum for time t (ms), a kick at 112 beats a minute and some drifting melody. */
  function fake(t, out) {
    var beat = (t / (60000 / 112)) % 1, kick = Math.pow(1 - beat, 4);
    for (var i = 0; i < out.length; i++) {
      var f = i / out.length;
      var v = kick * Math.max(0, 1 - f * 12) * 230 +
        (0.5 + 0.5 * Math.sin(t / 700 + i * 0.21)) * (1 - f) * 110 +
        (0.5 + 0.5 * Math.sin(t / 310 + i * 0.07)) * 40;
      out[i] = Math.max(0, Math.min(255, Math.round(v)));
    }
    return out;
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

  // MARK: - Sound

  var actx = null, analyser = null, data = null, audio = null, mic = null, source = '', fakeData = null;
  var songs = [], at = 0, base = null, beat = null, onSong = null;

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
    analyser.fftSize = BINS * 2;
    analyser.smoothingTimeConstant = 0.78;
    data = new Uint8Array(analyser.frequencyBinCount);
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

  function listen(done) {
    function go() {
      getMic(function (stream) {
        var c = context();
        // Never to the speakers: the room is already loud enough, and it would howl.
        if (!c || !hook(c.createMediaStreamSource(stream), false)) { stopStream(stream); done(false); return; }
        mic = stream;
        source = 'room';
        done(true);
      }, function () { done(false); });
    }
    var b = window.BeyondTable;
    if (b && b.ask) { asked = function (yes) { asked = null; if (yes) go(); else done(false); }; b.ask(); }
    else go();
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
    audio = null; mic = null; analyser = null; data = null; songs = []; source = ''; onSong = null;
    if (actx && actx.suspend) { try { actx.suspend(); } catch (e) {} }
  }

  /** This frame's levels: the analyser's, or the made-up ones for Just lights. */
  function levels(t) {
    if (analyser && data) { analyser.getByteFrequencyData(data); return data; }
    if (!fakeData) fakeData = new Uint8Array(BINS);
    return fake(t, fakeData);
  }

  // MARK: - The looks

  var c2 = null, light = false, stars = [], hue = 0;

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

  /** Beyond's four dots in the middle, each breathing with its own part of the sound. */
  function mark(x, y, size, b) {
    var parts = [b.bass, b.mid, b.high, b.level], gap = size * 1.25;
    for (var i = 0; i < 4; i++) {
      var dx = (i % 2 ? 1 : -1) * gap / 2, dy = (i < 2 ? -1 : 1) * gap / 2;
      disc(x + dx, y + dy, size * (0.42 + parts[i] * 0.5), DOTS[i]);
    }
  }

  var LOOKS = [
    {id: 'ring', name: function () { return say('Anel de luz', 'Ring of light', 'Anillo de luz'); }, draw: function (d, b, t, hit) {
      clear(light ? 1 : 0.32);
      var n = light ? 48 : 96, cx = W / 2, cy = H / 2, r0 = 210 + b.bass * 70, step = Math.PI * 2 / n;
      c2.lineCap = 'round';
      c2.lineWidth = light ? 14 : 10;
      for (var i = 0; i < n; i++) {
        // Mirror the lows round both sides, so the ring is even.
        var k = i < n / 2 ? i : n - 1 - i;
        var v = d[Math.floor(k * (BINS * 0.6) / (n / 2))] / 255, len = 20 + v * 300;
        var a = i * step + t / 9000, cos = Math.cos(a), sin = Math.sin(a);
        c2.strokeStyle = v > 0.82 ? EMBER : (i % 2 ? LILAC : VIOLET);
        c2.globalAlpha = 0.45 + v * 0.55;
        c2.beginPath();
        c2.moveTo(cx + cos * r0, cy + sin * r0);
        c2.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len));
        c2.stroke();
      }
      c2.globalAlpha = 1;
      if (hit && !light) { c2.strokeStyle = 'rgba(247,246,242,0.5)'; c2.lineWidth = 4; c2.beginPath(); c2.arc(cx, cy, r0 - 20, 0, Math.PI * 2); c2.stroke(); }
      mark(cx, cy, 120, b);
    }},
    {id: 'aurora', name: function () { return say('Aurora', 'Northern lights', 'Aurora'); }, draw: function (d, b, t) {
      clear(light ? 1 : 0.45);
      // Ribbons of light across the sky, each its own part of the sound: it swells as that part gets louder.
      var layers = light ? 3 : 5, cols = [VIOLET, LILAC, '#2F7D6D', '#378ADD', EMBER], stepX = light ? 64 : 32, x, y;
      for (var l = 0; l < layers; l++) {
        var part = l === 0 ? b.bass : l === 1 ? b.mid : l === 2 ? b.high : b.level;
        var baseY = H * (0.22 + l * 0.13), amp = 50 + part * 180, thick = 50 + part * 170;
        c2.globalAlpha = 0.35 + part * 0.45;
        c2.fillStyle = cols[l];
        c2.beginPath();
        for (x = 0; x <= W; x += stepX) {
          y = baseY + Math.sin(x / (300 + l * 80) + t / (1600 + l * 450) + l * 1.7) * amp - d[Math.floor(x / W * BINS * 0.5)] / 255 * 60;
          if (x === 0) c2.moveTo(x, y); else c2.lineTo(x, y);
        }
        for (x = W; x >= 0; x -= stepX) {
          y = baseY + Math.sin(x / (300 + l * 80) + t / (1600 + l * 450) + l * 1.7) * amp + thick * (0.6 + 0.4 * Math.sin(x / 210 + t / 900 + l));
          c2.lineTo(x, y);
        }
        c2.closePath();
        c2.fill();
      }
      c2.globalAlpha = 1;
    }},
    {id: 'stars', name: function () { return say('Estrelas cadentes', 'Shooting stars', 'Estrellas fugaces'); }, draw: function (d, b, t, hit) {
      clear(light ? 0.5 : 0.18);
      var max = light ? 90 : 260, born = hit ? (light ? 14 : 34) : (b.level > 0.3 ? 1 : 0);
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
    {id: 'dots', name: function () { return say('Pontos dançantes', 'Dancing dots', 'Puntos que bailan'); }, draw: function (d, b, t, hit) {
      clear(light ? 1 : 0.3);
      var parts = [b.bass, b.mid, b.high, b.level], floor = H * 0.72, gap = W / 5;
      c2.fillStyle = 'rgba(247,246,242,0.08)';
      c2.fillRect(gap * 0.6, floor + 90, W - gap * 1.2, 4);
      for (var i = 0; i < 4; i++) {
        var x = gap * (i + 1), jump = parts[i] * 420, r = 70 + parts[i] * 60, y = floor - jump;
        // A shadow on the floor that shrinks as the dot goes up.
        c2.globalAlpha = 0.25;
        c2.fillStyle = DOTS[i];
        c2.beginPath();
        c2.ellipse ? c2.ellipse(x, floor + 92, r * (1 - parts[i] * 0.6), 12, 0, 0, Math.PI * 2) : c2.arc(x, floor + 92, 12, 0, Math.PI * 2);
        c2.fill();
        c2.globalAlpha = 1;
        disc(x, y, r, DOTS[i]);
        if (hit && i === 0 && !light) { c2.strokeStyle = 'rgba(232,163,61,0.6)'; c2.lineWidth = 6; c2.beginPath(); c2.arc(x, y, r + 30, 0, Math.PI * 2); c2.stroke(); }
      }
    }}
  ];

  // MARK: - The screen

  var timer = null, raf = null, look = 0, layer = null, label = null, help = null, canvas = null, times = [], prev = 0, hideAt = 0;

  function frame(now) {
    raf = null;
    if (!c2) return;
    now = now || Date.now();
    if (prev) { times.push(now - prev); if (times.length > 90) times.shift(); }
    prev = now;
    if (!light && tooSlow(times)) setLight(true);
    var d = levels(now), b = bands(d, BINS), hit = beat(b.bass, now);
    LOOKS[look].draw(d, b, now, hit);
    if (hideAt && now > hideAt) { hideAt = 0; UI.setClass(help, 'shown', false); UI.setClass(label, 'shown', false); }
    raf = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (f) { return setTimeout(f, 33); })(frame);
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

  function run(kind) {
    UI.open({
      cls: 'bt-lights',
      build: function (l) {
        layer = l;
        canvas = document.createElement('canvas');
        canvas.className = 'li-canvas';
        l.appendChild(canvas);
        c2 = canvas.getContext('2d');
        label = UI.el('div', 'li-label', l, '');
        help = UI.el('div', 'li-help shown', l, kind === 'music'
          ? say('◀ ▶ outro visual  ·  OK próxima música  ·  Voltar para sair', '◀ ▶ another look  ·  OK next song  ·  Back to leave', '◀ ▶ otro efecto  ·  OK siguiente canción  ·  Atrás para salir')
          : say('◀ ▶ outro visual  ·  Voltar para sair', '◀ ▶ another look  ·  Back to leave', '◀ ▶ otro efecto  ·  Atrás para salir'));
      },
      key: function (k) {
        if (k === TV.keys.left || k === TV.keys.right) {
          look = (look + (k === TV.keys.right ? 1 : LOOKS.length - 1)) % LOOKS.length;
          stars = [];
          clear(1);
          show(LOOKS[look].name());
          return true;
        }
        if (k === TV.keys.ok) {
          if (source === 'music') next();
          else show(LOOKS[look].name());
          UI.setClass(help, 'shown', true);
          return true;
        }
        return k === TV.keys.up || k === TV.keys.down;
      },
      closed: stop
    });
    var b = window.BeyondTable;
    setLight(!!(b && b.lowPower && b.lowPower()));
    beat = beats();
    prev = 0;
    hideAt = Date.now() + 6000;
    clear(1);
    if (kind === 'music') {
      onSong = function (s) { show((s.title || '') + (s.artist ? '  ·  ' + s.artist : '')); };
      if (songs.length) onSong(songs[at % songs.length]);
    } else show(LOOKS[look].name());
    frame();
  }

  function stop() {
    if (raf) { (window.cancelAnimationFrame || window.webkitCancelAnimationFrame || clearTimeout)(raf); raf = null; }
    silence();
    c2 = null; canvas = null; layer = null; stars = [];
  }

  function start(kind, pick) {
    if (kind === 'lights') { pick.close(); run('lights'); return; }
    var busy = say('Um momento…', 'Just a moment…', 'Un momento…');
    UI.toast(busy);
    (kind === 'music' ? playMusic : listen)(function (ok) {
      if (ok) { pick.close(); run(kind); return; }
      silence();
      UI.toast(kind === 'music'
        ? say('A sua música não está respondendo agora. O computador onde ela fica está ligado?', "Your music isn't answering right now. Is the computer it's on switched on?", 'Tu música no responde ahora. ¿Está encendido el ordenador donde está?')
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
        function add(icon, text, kind) {
          a.add(UI.button(row, icon + '  ' + text, null, first ? 'primary' : ''), function () { start(kind, a); }, {first: first});
          first = false;
        }
        if (hasMusic()) add('🎵', say('A nossa música', 'Our music', 'Nuestra música'), 'music');
        if (canListen()) add('🎙', say('Ouvir a sala', 'Listen to the room', 'Escuchar la sala'), 'room');
        add('✨', say('Só luzes', 'Just lights', 'Solo luces'), 'lights');
        if (window.Guides) a.add(UI.button(row, '📖  ' + say('Como jogar', 'How to play', 'Cómo jugar')), function () { Guides.show('lights'); });
        UI.el('div', 'bt-sub', box, say(
          'Ouvir a sala só mede o volume, aqui na TV. Nada é gravado nem enviado.',
          'Listening to the room only measures how loud it is, here on the TV. Nothing is recorded or sent.',
          'Escuchar la sala solo mide el volumen, aquí en la tele. Nada se graba ni se envía.'));
      }
    });
  }

  return {open: open, answer: answer, core: {bands: bands, beats: beats, fake: fake, shuffle: shuffle, tooSlow: tooSlow, LOOKS: LOOKS,
    // For the tests: a stand-in canvas to draw on, and light mode without one.
    useContext: function (c, lightMode) { c2 = c; light = !!lightMode; stars = []; }}};
})();
