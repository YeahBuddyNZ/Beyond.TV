/*
 * The games' sounds, made on the TV with Web Audio (nothing to download, nothing licensed): Snap's card, match and
 * slap, Ludo's dice and hops, the arcade's, and Remote Control Land's crashes, jumps and motor (ADR 0045). Quiet when
 * Home Settings > Sounds is off, and on old TVs without Web Audio. ADR 0031. Plain ES5, like the rest of web/.
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
  /** A burst of filtered noise (crashes, splashes, dust), cut from one second of noise made once. */
  var hiss = null;
  function noise(at, length, peak, freq, q) {
    if (!hiss) {
      hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = hiss.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain(), t = ctx.currentTime + 0.02 + at;
    s.buffer = hiss;
    f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = q || 0.7;
    v.gain.setValueAtTime(peak || 0.2, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + length);
    s.connect(f); f.connect(v); v.connect(ctx.destination);
    s.start(t, Math.random() * 0.4, length + 0.05);
  }
  function ready() {
    if (window.Prefs && Prefs.sounds && !Prefs.sounds()) return false;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    ctx = ctx || new Ctx();
    if (ctx.resume) ctx.resume();
    return true;
  }
  function play(kind) {
    try {
      if (!ready()) return;
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
      // Remote Control Land (rcland.js)
      else if (kind === 'smash') { noise(0, 0.22, 0.35, 700, 0.6); beep(140, 0, 0.16, 'triangle', 0.2, 60); }
      else if (kind === 'crunch') { noise(0, 0.45, 0.45, 400, 0.5); beep(90, 0, 0.35, 'sawtooth', 0.12, 40); noise(0.08, 0.2, 0.2, 2200, 1.5); }
      else if (kind === 'pop') { noise(0, 0.06, 0.4, 2500, 1); beep(900, 0, 0.08, 'square', 0.06, 300); }
      else if (kind === 'star') { beep(1319, 0, 0.1, 'triangle', 0.1); beep(1760, 0.07, 0.18, 'triangle', 0.1); }
      else if (kind === 'jump') beep(280, 0, 0.22, 'triangle', 0.14, 620);
      else if (kind === 'land') { noise(0, 0.14, 0.25, 300, 0.8); beep(110, 0, 0.12, 'sine', 0.2, 60); }
      else if (kind === 'trick') { beep(784, 0, 0.07, 'square', 0.06); beep(1175, 0.06, 0.1, 'square', 0.06); }
      else if (kind === 'crash') { noise(0, 0.6, 0.4, 500, 0.5); beep(200, 0, 0.5, 'sawtooth', 0.1, 50); }
      else if (kind === 'bonk') beep(150, 0, 0.12, 'square', 0.12, 80);
      else if (kind === 'boost') { beep(200, 0, 0.5, 'sawtooth', 0.08, 900); noise(0, 0.4, 0.15, 1500, 0.8); }
      else if (kind === 'splash') { noise(0, 0.5, 0.35, 1200, 0.4); noise(0.1, 0.3, 0.2, 3000, 1); }
      else if (kind === 'slam') { noise(0, 0.5, 0.5, 250, 0.5); beep(70, 0, 0.4, 'sine', 0.35, 35); }
      else if (kind === 'combo') { beep(1047, 0, 0.08, 'triangle', 0.1); beep(1568, 0.05, 0.14, 'triangle', 0.1); }
    } catch (e) {}
  }

  /** Remote Control Land's motor: a low hum that follows the speed (level 0 to 1). 0 hushes it, stop() ends it. */
  var motorOsc = null, motorGain = null;
  function motor(level) {
    try {
      if (!level || !ready()) { if (motorGain) motorGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05); return; }
      if (!motorOsc) {
        var f = ctx.createBiquadFilter();
        motorOsc = ctx.createOscillator(); motorGain = ctx.createGain();
        motorOsc.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420;
        motorGain.gain.value = 0;
        motorOsc.connect(f); f.connect(motorGain); motorGain.connect(ctx.destination);
        motorOsc.start();
      }
      motorOsc.frequency.setTargetAtTime(48 + level * 120, ctx.currentTime, 0.08);
      motorGain.gain.setTargetAtTime(0.03 + level * 0.025, ctx.currentTime, 0.08);
    } catch (e) {}
  }
  function stop() {
    try { if (motorOsc) { motorOsc.stop(); motorOsc.disconnect(); } } catch (e) {}
    motorOsc = null; motorGain = null;
  }

  return {play: play, motor: motor, stop: stop};
})();
