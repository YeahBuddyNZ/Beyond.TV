/*
 * The games' sounds, made on the TV with Web Audio (nothing to download, nothing licensed): Snap's card, match and
 * slap, Ludo's dice and hops, and the arcade's. Quiet when Home Settings > Sounds is off, and on old TVs without Web
 * Audio. ADR 0031. Plain ES5, like the rest of web/.
 */
var Sfx = (function () {
  'use strict';

  var ctx = null;
  function beep(freq, at, length, type, peak, slide) {
    var o = ctx.createOscillator(), v = ctx.createGain(), t = ctx.currentTime + 0.02 + at;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + length);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(peak || 0.15, t + 0.01);
    v.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(v);
    v.connect(ctx.destination);
    o.start(t);
    o.stop(t + length + 0.05);
  }
  function play(kind) {
    if (window.Prefs && Prefs.sounds && !Prefs.sounds()) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctx = ctx || new Ctx();
      if (ctx.resume) ctx.resume();
      if (kind === 'flip') { beep(1400, 0, 0.05, 'triangle', 0.08, 700); beep(500, 0.02, 0.06, 'sine', 0.06); }
      else if (kind === 'match') { beep(784, 0, 0.12, 'square', 0.07); beep(1047, 0.1, 0.18, 'square', 0.07); }
      else if (kind === 'slap') beep(160, 0, 0.14, 'triangle', 0.3, 70);
      else if (kind === 'robot') beep(220, 0, 0.1, 'triangle', 0.18, 110);
      else if (kind === 'pile') { beep(440, 0, 0.18, 'sine', 0.12, 330); beep(330, 0.16, 0.26, 'sine', 0.12, 220); }
      else if (kind === 'oops') beep(180, 0, 0.32, 'sawtooth', 0.07, 120);
      else if (kind === 'dice') beep(900 + Math.random() * 500, 0, 0.03, 'square', 0.05);
      else if (kind === 'hop') beep(660, 0, 0.06, 'triangle', 0.08);
      else if (kind === 'six') { beep(659, 0, 0.1, 'triangle', 0.12); beep(988, 0.09, 0.16, 'triangle', 0.12); }
      else if (kind === 'home') { beep(523, 0, 0.12, 'sine', 0.14); beep(659, 0.1, 0.12, 'sine', 0.14); beep(784, 0.2, 0.25, 'sine', 0.14); }
      else if (kind === 'capture') { beep(600, 0, 0.25, 'square', 0.08, 150); }
      else if (kind === 'point') beep(880, 0, 0.08, 'square', 0.08);
      else if (kind === 'place') { beep(240, 0, 0.07, 'triangle', 0.16, 140); beep(1200, 0, 0.02, 'square', 0.03); }
      else if (kind === 'check') { beep(988, 0, 0.09, 'square', 0.07); beep(988, 0.13, 0.09, 'square', 0.07); }
      else if (kind === 'lose') { beep(392, 0, 0.2, 'triangle', 0.12); beep(330, 0.18, 0.2, 'triangle', 0.12); beep(262, 0.36, 0.4, 'triangle', 0.12); }
      else if (kind === 'win') { var n = [523, 659, 784, 1047]; for (var i = 0; i < n.length; i++) beep(n[i], i * 0.12, 0.3, 'triangle', 0.14); }
    } catch (e) {}
  }

  return {play: play};
})();
