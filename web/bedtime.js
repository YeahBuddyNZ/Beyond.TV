/*
 * Bedtime (bedtime mode, ADR 0060): a night light that breathes with the kids as they wind down, a calm sound, then
 * the TV turns itself off.
 *
 * First a short pick, all on the remote: a sound (rain, waves, a fan, or quiet) and how long (15, 30 or 45 minutes),
 * then Goodnight. The choice is kept for next time. A soft violet light in the middle of a black screen grows as you
 * breathe in and shrinks as you breathe out. It starts at six breaths a minute, the pace of the home screen's own
 * breathing, and slows to about four and a half by the end, because a body follows a slow rhythm down. The waves rise
 * and fall with the light. The words "Breathe in" and "Breathe out" stay for the first few breaths and then leave the
 * light on its own. Over the last part the light and the sound fade, and when the time is up the TV turns off (on LG;
 * Samsung lets no app do that, so there the screen stays dark and quiet). Any key before then brings the TV back.
 *
 * The sounds are made here with Web Audio (filtered noise, nothing to download, nothing licensed); a TV without Web
 * Audio gets the light alone. Started from the moon at the top of the home screen in the evening, Games, Find, or the
 * Beyond Family app (which says how long, and gets the sound picked last). Same as BedtimeActivity.java.
 * Plain ES5, and only transform and opacity animate, like the rest of web/.
 */
var Bedtime = (function () {
  'use strict';

  var FAST = 10000, SLOW = 13300;  // one breath: six a minute, slowing to about four and a half
  var WORDS_FOR = 6;                // breaths with the words before the light is on its own
  var DIM_FROM = 0.6;               // the last 40% of the time, the light and the sound fade to nothing
  var SOUNDS = ['rain', 'waves', 'fan', 'quiet'], LENGTHS = [15, 30, 45];
  var KEY = 'bt.bedtime';
  var LOUD = 0.32;                  // the sound's level before it fades; the TV's own volume does the rest
  var open = null, picking = null;

  /** The sound and length picked last time: {sound, minutes}. */
  function last() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    v = v || {};
    return {sound: SOUNDS.indexOf(v.sound) >= 0 ? v.sound : 'rain', minutes: LENGTHS.indexOf(v.minutes) >= 0 ? v.minutes : 15};
  }

  function keep(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  // MARK: - Calm sounds

  /**
   * A loop of four seconds of noise, shaped: rain is pink noise with the top softened, waves and the fan are brown
   * noise (deeper), the fan steady and the waves rising and falling with each breath (Bedtime moves the level).
   * The loop's end is blended into its start, so there's no click each time round. Null where there's no Web Audio.
   */
  function calm(kind) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || SOUNDS.indexOf(kind) < 0 || kind === 'quiet') return null;
    var ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    try {
      var rate = ctx.sampleRate, fade = Math.round(rate * 0.25), len = rate * 4;
      var raw = new Array(len + fade), b0 = 0, b1 = 0, b2 = 0, brown = 0, i;
      for (i = 0; i < raw.length; i++) {
        var w = Math.random() * 2 - 1;
        if (kind === 'rain') {
          b0 = 0.99765 * b0 + w * 0.0990460;
          b1 = 0.96300 * b1 + w * 0.2965164;
          b2 = 0.57000 * b2 + w * 1.0526913;
          raw[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
        } else {
          brown = (brown + 0.02 * w) / 1.02;
          raw[i] = brown * 3.2;
        }
      }
      var buf = ctx.createBuffer(1, len, rate), d = buf.getChannelData(0);
      for (i = 0; i < len; i++) d[i] = i < fade ? raw[i] * (i / fade) + raw[len + i] * (1 - i / fade) : raw[i];
      var src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = kind === 'rain' ? 5200 : kind === 'waves' ? 1100 : 600;
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      if (src.start) src.start(0); else src.noteOn(0);
    } catch (e) {
      try { ctx.close(); } catch (e2) {}
      return null;
    }
    var stopped = false;
    return {
      kind: kind,
      /** Moves the level to v (0 to 1 of LOUD) over secs. */
      level: function (v, secs) {
        if (stopped) return;
        var g = gain.gain, now = ctx.currentTime;
        try {
          g.cancelScheduledValues(now);
          g.setValueAtTime(g.value, now);
          g.linearRampToValueAtTime(Math.max(0, Math.min(1, v)) * LOUD, now + Math.max(0.05, secs));
        } catch (e) { g.value = v * LOUD; }
      },
      stop: function () {
        if (stopped) return;
        this.level(0, 0.6);
        stopped = true;
        setTimeout(function () {
          try { if (src.stop) src.stop(0); else src.noteOff(0); } catch (e) {}
          try { if (ctx.close) ctx.close(); } catch (e) {}
        }, 800);
      }
    };
  }

  // MARK: - The pick

  function soundName(s) {
    return s === 'rain' ? tr('Chuva', 'Rain', 'Lluvia') : s === 'waves' ? tr('Ondas', 'Waves', 'Olas')
      : s === 'fan' ? tr('Ventilador', 'Fan', 'Ventilador') : tr('Silêncio', 'Quiet', 'Silencio');
  }

  /** The pick before bedtime: a sound (heard as it's picked), how long, then Goodnight. */
  function choose() {
    if (picking) picking.close();
    var pick = last(), preview = null, previewEnd = 0, go = null;
    function hear(kind) {
      if (preview) preview.stop();
      clearTimeout(previewEnd);
      preview = calm(kind);
      if (!preview) return;
      preview.level(0.8, 0.4);
      previewEnd = setTimeout(function () { if (preview) { preview.stop(); preview = null; } }, 3500);
    }
    var api = UI.open({
      cls: 'bt-bed-pick',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'moon', box, '🌙');
        UI.heading(box, tr('Hora de dormir', 'Bedtime', 'Hora de dormir'),
          tr('A tela escurece, um som calmo toca e a TV se desliga sozinha.', 'The screen dims, a calm sound plays, then the TV turns itself off.',
            'La pantalla se oscurece, suena algo tranquilo y la tele se apaga sola.'));
        var sounds = UI.el('div', 'bt-room-row', box);
        UI.el('div', 'bt-room-label', sounds, tr('Som', 'Sound', 'Sonido'));
        for (var i = 0; i < SOUNDS.length; i++) (function (s) {
          var b = UI.button(sounds, soundName(s), s === pick.sound ? 'check' : null, s === pick.sound ? 'chosen' : '');
          a.add(b, function () { pick.sound = s; hear(s); a.rebuild(); });
        })(SOUNDS[i]);
        var lengths = UI.el('div', 'bt-room-row', box);
        UI.el('div', 'bt-room-label', lengths, tr('Por quanto tempo', 'For how long', 'Cuánto tiempo'));
        for (var j = 0; j < LENGTHS.length; j++) (function (m) {
          a.add(UI.button(lengths, m + ' min', m === pick.minutes ? 'check' : null, m === pick.minutes ? 'chosen' : ''),
            function () { pick.minutes = m; a.rebuild(); });
        })(LENGTHS[j]);
        var row = UI.el('div', 'bt-buttons', box);
        go = a.add(UI.button(row, tr('Boa noite', 'Goodnight', 'Buenas noches'), 'bedtime', 'primary'), function () {
          keep(pick);
          a.close();
          start(pick.minutes, pick.sound);
        }, {first: true});
      },
      closed: function () {
        clearTimeout(previewEnd);
        if (preview) { preview.stop(); preview = null; }
        picking = null;
      }
    });
    picking = api;
    return api;
  }

  // MARK: - Bedtime

  /** Bedtime now: minutes (5 to 60) and a sound (the last one picked when not given, as from Beyond Family). */
  function start(minutes, sound) {
    if (open) open.close();
    minutes = Math.max(5, Math.min(60, minutes || last().minutes));
    if (SOUNDS.indexOf(sound) < 0) sound = last().sound;
    var total = minutes * 60000, began = Date.now(), timers = [], breaths = 0;
    var light, glow, words, api, snd = calm(sound);

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function transition(node, ms, ease) {
      var t = 'transform ' + ms + 'ms ' + ease + ', opacity ' + ms + 'ms ' + ease;
      node.style.webkitTransition = t.replace(/transform/g, '-webkit-transform');
      node.style.transition = t;
    }

    function scale(node, s) { node.style.webkitTransform = node.style.transform = 'translate(-50%, -50%) scale(' + s + ')'; }

    /** The time is up: dark, quiet, and the TV off where it can be. */
    function end() {
      light.style.opacity = '0'; glow.style.opacity = '0'; words.style.opacity = '0';
      if (snd) { snd.stop(); snd = null; }
      if (window.TV && TV.powerOff) TV.powerOff(function () {});
    }

    function breathe() {
      var done = (Date.now() - began) / total;
      if (done >= 1) { end(); return; }
      var period = FAST + (SLOW - FAST) * Math.min(1, done / DIM_FROM);
      var bright = done < DIM_FROM ? 1 : Math.max(0, 1 - (done - DIM_FROM) / (1 - DIM_FROM));
      var inhale = period * 0.4, exhale = period - inhale;
      var say = breaths < WORDS_FOR;
      breaths++;

      transition(light, inhale, 'ease-in-out');
      transition(glow, inhale, 'ease-in-out');
      scale(light, 1);
      scale(glow, 1.15);
      light.style.opacity = (0.95 * bright).toFixed(3);
      glow.style.opacity = (0.55 * bright).toFixed(3);
      // The waves come in with the breath in and go out with the breath out; rain and the fan stay level.
      if (snd) snd.level(bright, snd.kind === 'waves' ? inhale / 1000 : 2);
      if (say) showWords(tr('Inspire', 'Breathe in', 'Inhala'));
      else words.style.opacity = '0';

      later(function () {
        transition(light, exhale, 'ease-in-out');
        transition(glow, exhale, 'ease-in-out');
        scale(light, 0.62);
        scale(glow, 0.7);
        light.style.opacity = (0.55 * bright).toFixed(3);
        glow.style.opacity = (0.25 * bright).toFixed(3);
        if (snd && snd.kind === 'waves') snd.level(bright * 0.35, exhale / 1000);
        if (say) showWords(tr('Expire', 'Breathe out', 'Exhala'));
      }, inhale);
      later(breathe, period);
    }

    function showWords(text) {
      words.style.opacity = '0';
      later(function () { words.textContent = text; words.style.opacity = '0.75'; }, 400);
    }

    api = UI.open({
      cls: 'bt-bed',
      build: function (layer, a) {
        glow = UI.el('div', 'glow', layer);
        light = UI.el('div', 'light', layer);
        words = UI.el('div', 'words', layer);
        scale(light, 0.62);
        scale(glow, 0.7);
        // One invisible node so the layer has focus and OK does what Back does.
        a.add(UI.el('div', 'hold', layer), function () { a.close(); }, {first: true});
      },
      key: function () { api.close(); return true; },
      closed: function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
        if (snd) { snd.stop(); snd = null; }
        open = null;
      }
    });
    open = api;
    if (snd) snd.level(0.5, 4);
    later(breathe, 1200);
    return api;
  }

  return {
    choose: choose,
    start: start,
    on: function () { return !!open; },
    stop: function () { if (open) open.close(); },
    rules: {last: last, SOUNDS: SOUNDS, LENGTHS: LENGTHS}
  };
})();
