/*
 * Party mode: a disco or a birthday. Coloured lights sweep the screen and pulse on the beat of music the TV makes
 * itself, with a mirror ball's sparkles. A birthday opens with the Happy Birthday tune (the melody is out of
 * copyright; no words), the person's name and a cake. Same as PartyActivity.java and PartyMusic.java (ADR 0016):
 *
 *   An 8 second loop at 120 beats a minute: four bars, A minor, F, C, G.
 *   kick every beat (a sine falling 150 to 45 Hz), clap on 2 and 4, hat and bass on the off-beat eighths,
 *   and an arpeggio up and down the chord on every sixteenth.
 *
 * With a Beyond Home box the room's lights join in: the Party moment at every chord change (every two seconds), with
 * the beat so the colours move on, and Party over at the end. Started by a "party" command from Beyond Family;
 * "party-end", any key or the time running out stops it. Plain ES5; only transform and opacity animate. TVs without
 * Web Audio get the lights and no music.
 */
var Party = (function () {
  'use strict';

  var RATE = 22050, BEAT = 0.5, STEP = BEAT / 4, STEPS = 64, LOOP = STEPS * STEP;
  var ROOTS = [110.00, 87.31, 130.81, 98.00];
  var ARP = [[440.00, 523.25, 659.25, 523.25], [349.23, 440.00, 523.25, 440.00], [392.00, 523.25, 659.25, 523.25], [392.00, 493.88, 587.33, 493.88]];
  var TUNE = [392.00, 392.00, 440.00, 392.00, 523.25, 493.88, 392.00, 392.00, 440.00, 392.00, 587.33, 523.25,
    392.00, 392.00, 783.99, 659.25, 523.25, 493.88, 440.00, 698.46, 698.46, 659.25, 523.25, 587.33, 523.25];
  var TUNE_BEATS = [0.75, 0.25, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 3];
  var TUNE_BEAT = 0.6;
  /** The colours the box gives the lights (PARTY_COLOURS in Beyond Home's lib.js). */
  var COLOURS = ['255,0,160', '0,200,255', '255,190,0', '120,255,0', '160,60,255', '255,80,40'];

  var ctx = null, loopBuf = null, tuneBuf = null, open = null;

  function introLength(birthday) {
    if (!birthday) return 0;
    var beats = 0;
    for (var i = 0; i < TUNE_BEATS.length; i++) beats += TUNE_BEATS[i];
    return beats * TUNE_BEAT + 0.4;
  }

  function soft(x) {
    if (x > 3) return 1;
    if (x < -3) return -1;
    return x * (27 + x * x) / (27 + 9 * x * x);
  }

  function tone(mix, at, freq, over, overAmp, amp, tau, len) {
    var start = Math.round(at * RATE), n = Math.round(len * RATE), w0 = 2 * Math.PI * freq;
    for (var i = 0; i < n; i++) {
      var t = i / RATE, env = t < 0.005 ? t / 0.005 : Math.exp(-t / tau);
      if (t > len - 0.01) env *= (len - t) / 0.01;
      var w = w0 * t;
      mix[(start + i) % mix.length] += (Math.sin(w) + overAmp * Math.sin(over * w)) * amp * env;
    }
  }

  function makeLoop() {
    var mix = new Float32Array(Math.round(LOOP * RATE)), s, i, t, start, n;
    for (s = 0; s < STEPS; s++) {
      var bar = Math.floor(s / 16), inBeat = s % 4, inBar = s % 16, at = s * STEP;
      if (inBeat === 0) {
        start = Math.round(at * RATE); n = Math.round(0.3 * RATE);
        var phase = 0;
        for (i = 0; i < n; i++) {
          t = i / RATE;
          phase += 2 * Math.PI * (45 + 105 * Math.exp(-t / 0.03)) / RATE;
          mix[(start + i) % mix.length] += Math.sin(phase) * 0.9 * Math.exp(-t / 0.12);
        }
      }
      if (inBar === 4 || inBar === 12) {
        start = Math.round(at * RATE); n = Math.round(0.2 * RATE);
        for (i = 0; i < n; i++) mix[(start + i) % mix.length] += (Math.random() * 2 - 1) * 0.35 * Math.exp(-i / RATE / 0.06);
      }
      if (inBeat === 2) {
        start = Math.round(at * RATE); n = Math.round(0.06 * RATE);
        var prev = 0;
        for (i = 0; i < n; i++) {
          var x = Math.random() * 2 - 1;
          mix[(start + i) % mix.length] += (x - prev) * 0.12 * Math.exp(-i / RATE / 0.015);
          prev = x;
        }
        tone(mix, at, ROOTS[bar], 2, 0.5, 0.2, 0.12, 0.2);
      }
      tone(mix, at, ARP[bar][s % 4], 3, 0.25, 0.06, 0.08, 0.12);
    }
    return mix;
  }

  function makeTune() {
    var mix = new Float32Array(Math.round(introLength(true) * RATE)), at = 0.1;
    for (var i = 0; i < TUNE.length; i++) {
      var len = Math.min(TUNE_BEATS[i] * TUNE_BEAT, 1.2) + 0.3;
      tone(mix, at, TUNE[i], 2, 0.3, 0.18, 0.35, Math.min(len, mix.length / RATE - at));
      at += TUNE_BEATS[i] * TUNE_BEAT;
    }
    return mix;
  }

  function buffer(mix) {
    var b = ctx.createBuffer(1, mix.length, RATE), d = b.getChannelData(0);
    for (var i = 0; i < mix.length; i++) d[i] = soft(mix[i] * 0.8);
    return b;
  }

  /** Starts the music; returns the stop function and when the loop starts on the audio clock (or null). */
  function music(birthday) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = ctx || new Ctx();
      if (ctx.resume) ctx.resume();
      loopBuf = loopBuf || buffer(makeLoop());
      if (birthday) tuneBuf = tuneBuf || buffer(makeTune());
      var now = ctx.currentTime + 0.1, sources = [];
      var play = function (buf, at, loop) {
        var src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = loop;
        src.connect(ctx.destination);
        (src.start || src.noteOn).call(src, at);
        sources.push(src);
      };
      if (birthday) play(tuneBuf, now, false);
      var loopAt = now + introLength(birthday);
      play(loopBuf, loopAt, true);
      return {
        loopAt: loopAt,
        stop: function () {
          for (var i = 0; i < sources.length; i++) try { (sources[i].stop || sources[i].noteOff).call(sources[i], 0); } catch (e) {}
        }
      };
    } catch (e) {
      return null;
    }
  }

  /** The room whose lights join in: the first with a Party moment. */
  function partyRoom() {
    if (!window.HomeHub || HomeHub.status() !== 'paired') return null;
    var rooms = HomeHub.rooms ? HomeHub.rooms() : [];
    for (var i = 0; i < rooms.length; i++) {
      var ms = rooms[i].moments || [];
      for (var j = 0; j < ms.length; j++) if (ms[j].id === 'party') return rooms[i].id;
    }
    return null;
  }

  function lights(room, moment, beat) {
    if (!room) return;
    var q = {room: room, do: 'moment', moment: moment};
    if (beat) q.beat = beat;
    HomeHub.act(q, function () {});
  }

  function start(c) {
    if (open) open.close();
    var birthday = c.style === 'birthday', name = birthday && c.name ? String(c.name).slice(0, 30) : '';
    var minutes = Math.max(5, Math.min(120, c.minutes || 30));
    var intro = introLength(birthday), began = Date.now(), timers = [], song = null, room = null, chord = 0, api;

    function sweepers(layer) {
      for (var i = 0; i < COLOURS.length; i++) {
        var path = UI.el('div', 'sweep s' + i, layer);
        var beam = UI.el('div', 'beam' + (i % 2 ? ' odd' : ''), path);
        // Old WebKit only knows the prefixed form; a newer one takes the second and keeps it.
        beam.style.background = '-webkit-radial-gradient(center, circle, rgba(' + COLOURS[i] + ',0.6) 0%, rgba(' + COLOURS[i] + ',0) 70%)';
        beam.style.background = 'radial-gradient(circle, rgba(' + COLOURS[i] + ',0.6) 0%, rgba(' + COLOURS[i] + ',0) 70%)';
      }
      for (var s = 0; s < 40; s++) {
        var dot = UI.el('div', 'spark', layer);
        dot.style.left = ((s * 37) % 100) + '%';
        dot.style.top = ((s * 61 + 13) % 100) + '%';
        dot.style.webkitAnimationDelay = dot.style.animationDelay = ((s * 0.37) % 3).toFixed(2) + 's';
      }
    }

    function dance() {
      if (open !== api) return;
      api.root.className += ' dancing';
      var tick = function () {
        if (open !== api) return;
        var t = song ? ctx.currentTime - song.loopAt : (Date.now() - began) / 1000 - intro;
        var now = 1 + Math.floor(Math.max(0, t) / (BEAT * 4));
        if (now !== chord) {
          chord = now;
          if (!room) room = partyRoom();
          lights(room, 'party', chord);   // the box moves each light's colour on one place
        }
        timers.push(setTimeout(tick, 250));
      };
      tick();
    }

    api = UI.open({
      cls: 'bt-party',
      build: function (layer, a) {
        sweepers(layer);
        var words = UI.el('div', 'words', layer);
        if (name) {
          UI.el('div', 'title', words).textContent = '🎂 ' + tr('Feliz aniversário', 'Happy birthday', 'Feliz cumpleaños');
          UI.el('div', 'name', words).textContent = name;
        } else UI.el('div', 'title big', words).textContent = tr('Hora da festa!', 'Party time!', '¡Hora de la fiesta!');
        var hint = UI.el('div', 'hint', layer);
        hint.textContent = tr('Qualquer tecla para parar', 'Any key to stop', 'Cualquier tecla para parar');
        timers.push(setTimeout(function () { hint.style.opacity = '0'; }, 8000));
        a.add(UI.el('div', 'hold', layer), function () { a.close(); }, {first: true});
      },
      key: function () { api.close(); return true; },
      closed: function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
        if (song) song.stop();
        if (room) lights(room, 'party-over', 0);
        open = null;
      }
    });
    open = api;
    song = music(birthday);
    // The beat starts with the loop: right after the tune on a birthday, at once for a disco.
    var wait = song ? Math.max(0, (song.loopAt - ctx.currentTime) * 1000) : intro * 1000;
    timers.push(setTimeout(dance, wait));
    timers.push(setTimeout(function () { if (open === api) api.close(); }, wait + minutes * 60000));
    return api;
  }

  /**
   * Party mode from the remote, for whoever hasn't got a phone: the Party button on the home screen asks what kind (a
   * disco, or the birthday of anyone on this TV) and starts it for 30 minutes. Same as PartyPickActivity.java.
   */
  function choose() {
    UI.open({
      cls: 'bt-outside bt-party-pick',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '🎉');
        UI.heading(box, tr('Hora da festa!', 'Party time!', '¡Hora de la fiesta!'), tr('Que tipo de festa?', 'What kind of party?', '¿Qué tipo de fiesta?'));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, '🕺  ' + tr('Discoteca', 'Disco', 'Disco'), null, 'primary'), function () {
          a.close();
          start({style: 'disco', minutes: 30});
        }, {first: true});
        var people = Profiles.list(), names = [];
        for (var i = 0; i < people.length; i++) if (people[i].name && !people[i].together) names.push(people[i].name);
        if (!names.length) return;
        UI.el('div', 'bt-sub or', box, tr('Ou o aniversário de alguém', "Or someone's birthday", 'O el cumpleaños de alguien'));
        var cakes = UI.el('div', 'bt-buttons cakes', box);
        for (var j = 0; j < names.length; j++) (function (name) {
          a.add(UI.button(cakes, '🎂  ' + name), function () {
            a.close();
            start({style: 'birthday', name: name, minutes: 30});
          });
        })(names[j]);
      }
    });
  }

  return {
    start: start,
    choose: choose,
    on: function () { return !!open; },
    stop: function () { if (open) open.close(); }
  };
})();
