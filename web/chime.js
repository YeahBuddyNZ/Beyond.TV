/*
 * Beyond's start chime: four soft notes, one for each of the four dots, rising over a low hum. Played when Beyond TV
 * opens (or comes back after hours away) and when the tidy-up race starts, while Home Settings > Sounds is on.
 * Same notes as Chime.java (ADR 0012): hum G3 196 Hz; notes G4 392, B4 493.88, D5 587.33, F#5 739.99 Hz at 0.10,
 * 0.34, 0.58 and 0.82 s, each a sine with its octave at 0.15, up to 0.12 in 0.05 s, dying away over 2.2 s.
 * Plain ES5, like the rest of web/. Old TVs without Web Audio just stay quiet.
 */
var Chime = (function () {
  'use strict';

  var NOTES = [392.00, 493.88, 587.33, 739.99], AT = [0.10, 0.34, 0.58, 0.82], ctx = null;

  function tone(c, freq, start, peak, attack, tau, length) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + attack);
    if (tau) g.gain.setTargetAtTime(0, start + attack, tau);
    else g.gain.setValueAtTime(peak, start + length - 0.8);
    g.gain.linearRampToValueAtTime(0, start + length);
    o.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + length + 0.05);
  }

  function play() {
    if (window.Prefs && Prefs.sounds && !Prefs.sounds()) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctx = ctx || new Ctx();
      if (ctx.resume) ctx.resume();
      var now = ctx.currentTime + 0.05;
      tone(ctx, 196.00, now, 0.05, 0.5, 0, 3.0);
      for (var i = 0; i < NOTES.length; i++) {
        tone(ctx, NOTES[i], now + AT[i], 0.12, 0.05, 0.45, 2.2);
        tone(ctx, NOTES[i] * 2, now + AT[i], 0.018, 0.05, 0.45, 2.2);
      }
    } catch (e) {}
  }

  return {play: play};
})();
