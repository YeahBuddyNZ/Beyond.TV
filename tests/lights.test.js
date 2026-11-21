// The light show (web/lights.js) without a screen: the noise gate, the bands, the bars by pitch, the beat, quiet,
// the shuffle, the light mode, and every look drawn many frames on a stand-in canvas, with music and in silence, so
// none of them throws and none of them moves without sound:
// node tests/lights.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {}, navigator: {}, tr: function (pt, en) { return en; }, UI: {}, Math: Math, Date: Date, JSON: JSON,
  Uint8Array: Uint8Array, Float32Array: Float32Array, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'lights.js'), 'utf8'), sandbox, {filename: 'lights.js'});
var L = sandbox.Lights.core;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

var BINS = 1024, NYQ = 22050;
function filled(v, n) { var a = new Uint8Array(n || BINS); for (var i = 0; i < a.length; i++) a[i] = v; return a; }
function max(a) { var m = 0; for (var i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }

// The gate: silence is nothing, flat out is everything, hiss is nothing, and a steady hum fades away.
var g = L.gate(BINS);
check('silence through the gate is zero', max(g(filled(0), BINS)) === 0);
check('flat out through the gate is one', Math.abs(g(filled(255), BINS)[5] - 1) < 1e-6);
g = L.gate(BINS);
check('soft hiss through the gate is zero', max(g(filled(25), BINS)) === 0);
g = L.gate(BINS);
var hum = filled(60), first = g(hum, BINS)[3], lv;
for (var i = 0; i < 600; i++) lv = g(hum, BINS);
check('a steady hum is there at first', first > 0);
check('and gone after ten seconds', lv[3] === 0);
var song = filled(60);
for (i = 0; i < 40; i++) song[i] = 230;
check('music over the hum still comes through', g(song, BINS)[10] > 0.8);

// Bands by pitch: a kick drum (under 150 Hz) is the lows only.
var kick = filled(0), k = BINS / NYQ;
for (i = 1; i < Math.ceil(150 * k); i++) kick[i] = 255;
var b = L.bands(L.gate(BINS)(kick, BINS), BINS, NYQ);
check('a kick is mostly the lows', b.bass > 0.5 && b.mid === 0 && b.high === 0);
b = L.bands(L.gate(BINS)(filled(0), BINS), BINS, NYQ);
check('silence is no bands at all', b.bass === 0 && b.mid === 0 && b.high === 0 && b.level === 0);
b = L.bands(L.gate(BINS)(filled(255), BINS), BINS, NYQ);
check('flat out is every band full', b.bass > 0.99 && b.mid > 0.99 && b.high > 0.99 && b.level > 0.99);

// Bars by pitch: in order, inside the bins, the low ones narrow, and a high note lights only high bars.
var r = L.logBands(BINS, NYQ, 64), ordered = true, inside = true;
for (i = 0; i < r.length; i++) {
  if (i && r[i].c < r[i - 1].c) ordered = false;
  if (r[i].a < 0 || r[i].b > BINS || r[i].b <= r[i].a) inside = false;
}
check('64 bars', r.length === 64);
check('the bars go up in pitch', ordered);
check('every bar reads inside the bins', inside);
check('the lowest bars read between bins', r[0].narrow && !r[63].narrow);
var note = filled(0), at = Math.round(5000 * k);
note[at] = 255; note[at + 1] = 255;
var bl = L.barLevels(L.gate(BINS)(note, BINS), r, new Float32Array(64)), lowQuiet = true;
for (i = 0; i < 32; i++) if (bl[i] > 0) lowQuiet = false;
check('a 5 kHz note leaves the low bars dark', lowQuiet);
check('and lights a high bar', max(bl) > 0.9);
var r720 = L.logBands(512, 24000, 32);
check('the TV sound\'s 512 bins work too', r720.length === 32 && r720[31].b <= 512);

// Following: up fast, down gently, the cap hangs then drops.
var val = new Float32Array(1), pk = new Float32Array(1), t1 = new Float32Array([1]), t0 = new Float32Array([0]);
L.follow(val, pk, t1);
check('a bar jumps up', val[0] > 0.5);
for (i = 0; i < 5; i++) L.follow(val, pk, t1);
L.follow(val, pk, t0);
check('and falls back gently', val[0] > 0.7);
check('the cap stays above the bar', pk[0] >= val[0]);
for (i = 0; i < 200; i++) L.follow(val, pk, t0);
check('and both rest at the bottom in the end', val[0] < 0.01 && pk[0] === 0);

// The beat: a jump in the lows is a beat, but not twice in a quarter second, and not in a quiet room.
var beat = L.beats(), t = 0;
for (i = 0; i < 30; i++) beat(0.1, t += 33);
check('a jump in the lows is a beat', beat(0.8, t += 33));
check('not again straight away', !beat(0.9, t += 33));
for (i = 0; i < 30; i++) beat(0.1, t += 33);
check('and again after a rest', beat(0.8, t += 33));
var quietRoom = L.beats(); t = 0;
var any = false;
for (i = 0; i < 200; i++) any = quietRoom(i % 10 ? 0.02 : 0.15, t += 33) || any;
check('a quiet room never flashes', !any);
var dead = L.beats(); any = false;
for (i = 0; i < 300; i++) any = dead(0, i * 33) || any;
check('silence never beats', !any);

// Quiet: after two seconds of nothing, and over the moment the music comes back.
var q = L.quiet();
check('not quiet straight away', !q(0, 0));
check('quiet after two seconds', q(0, 2100));
check('music ends it at once', !q(0.4, 2133));

// The TV's sound arrives as strings of chars 0 to 255.
var bytes = new Uint8Array(4);
check('a Java string unpacks', L.unpack(String.fromCharCode(0, 128, 255, 7), bytes) === 4 && bytes[1] === 128 && bytes[2] === 255);
check('nothing unpacks to nothing', L.unpack('', bytes) === 0);

// The shuffle keeps every song once.
var songs = [];
for (i = 0; i < 50; i++) songs.push({id: 's' + i});
var mixed = L.shuffle(songs), ids = mixed.map(function (s) { return s.id; }).sort().join();
check('the shuffle keeps every song once', mixed.length === 50 && ids === songs.map(function (s) { return s.id; }).sort().join());
check('the shuffle leaves the list it was given alone', songs[0].id === 's0' && songs[49].id === 's49');

// Light mode: only once there are enough frames, and only when they're slow.
var fast = [], slow = [];
for (i = 0; i < 90; i++) { fast.push(16); slow.push(33); }
check('quick frames stay full', !L.tooSlow(fast));
check('slow frames go light', L.tooSlow(slow));
check('a few slow frames are not enough', !L.tooSlow(slow.slice(0, 10)));

// A stand-in canvas that records where everything was drawn, so a still screen can be told from a moving one.
var calls = 0, trace = [];
var ctx = {setTransform: function () {}};
['beginPath', 'closePath', 'fill', 'stroke'].forEach(function (m) { ctx[m] = function () { calls++; }; });
['moveTo', 'lineTo', 'arc', 'ellipse', 'fillRect'].forEach(function (m) {
  ctx[m] = function () { calls++; trace.push(m + Array.prototype.slice.call(arguments, 0, 4).map(function (v) { return Math.round(v); }).join(',')); };
});

/** A frame of music: a kick every half second and a moving melody, like a song. */
function music(f, raw, wv) {
  var beatOn = f % 30 < 4;
  for (var j = 0; j < raw.length; j++) {
    var hz = j / raw.length * NYQ;
    raw[j] = hz < 150 ? (beatOn ? 250 : 120) : hz < 4000 ? 90 + ((f * 7 + j * 13) % 120) : 70;
  }
  for (j = 0; j < wv.length; j++) wv[j] = 128 + Math.round(Math.sin(j / 9 + f) * (beatOn ? 110 : 60));
}

function draw(look, frames, loud) {
  var gt = L.gate(BINS), bt = L.beats(), raw = new Uint8Array(BINS), wv = new Uint8Array(2048), last = '';
  for (var f = 0; f < frames; f++) {
    if (loud) music(f, raw, wv); else { raw = filled(0); for (var j = 0; j < wv.length; j++) wv[j] = 128; }
    var lv = gt(raw, BINS), bb = L.bands(lv, BINS, NYQ), now = f * 16;
    trace = [];
    look.draw({lv: lv, len: BINS, nyq: NYQ, wave: wv, b: bb, t: now, hit: bt(bb.bass, now), quiet: !loud});
    last = trace.join('|');
  }
  return last;
}

// Every look, full and light, with music and in silence, many frames: none throws, and in silence none moves.
[false, true].forEach(function (lightMode) {
  L.LOOKS.forEach(function (look) {
    var threw = null, a, b2, loudA, loudB;
    try {
      L.useContext(ctx, lightMode);
      loudA = draw(look, 300, true);
      loudB = draw(look, 7, true);
      L.useContext(ctx, lightMode);
      draw(look, 200, false);
      a = draw(look, 1, false);
      b2 = draw(look, 30, false);
    } catch (e) { threw = e; }
    var tag = look.id + (lightMode ? ' (light)' : '');
    check(tag + ' draws without throwing' + (threw ? ': ' + threw : ''), !threw);
    if (threw) return;
    check(tag + ' moves with music', loudA !== loudB);
    check(tag + ' stays still in silence', a === b2);
  });
});
check('the ring does not turn in silence', (function () { L.useContext(ctx, false); draw(L.LOOKS[2], 120, false); return L.spin() === 0; })());

// Calm lights: drawn without sound, slow (a second moves the dots only a little).
L.useContext(ctx, false);
var calmThrew = null;
try {
  trace = []; L.CALM.draw({t: 0}); var c0 = trace.slice();
  trace = []; L.CALM.draw({t: 1000});
  var moved = 0;
  for (i = 0; i < trace.length; i++) if (trace[i] !== c0[i]) moved++;
  check('calm lights drift', moved > 0);
} catch (e) { calmThrew = e; }
check('calm lights draw without throwing' + (calmThrew ? ': ' + calmThrew : ''), !calmThrew);

check('the looks drew something', calls > 1000);
check('every look has a name', L.LOOKS.concat([L.CALM]).every(function (l) { return typeof l.name() === 'string' && l.name().length > 0; }));
check('four looks', L.LOOKS.length === 4);

// ADR 0050. An asleep microphone (the remote's, exact silence) against a quiet room (a real one always hisses).
var sl = L.sleepy();
check('not asleep straight away', !sl(0, 0));
check('exact silence for three seconds is asleep', sl(0, 3100));
sl = L.sleepy();
sl(0, 0); sl(0.0004, 500);
check('a quiet room that hisses is awake', !sl(0, 3500));
sl = L.sleepy();
check('a TV that can\'t say is never asleep', !sl(-1, 0) && !sl(-1, 5000));

// Tap along: the speed of the taps, kept between 60 and 180, starting again after a pause.
var tp = L.tapper();
check('one tap gives no speed yet', tp(1000) === 0);
check('two taps half a second apart are 120', tp(1500) === 120);
check('more taps keep averaging', tp(2000) === 120);
tp = L.tapper();
tp(0);
check('very slow taps stay at 60 or more', tp(1900) === 60);
tp = L.tapper();
tp(0);
check('very quick taps stay at 180 or less', tp(100) === 180);
tp = L.tapper();
tp(0); tp(500);
check('a long pause starts counting again', tp(4000) === 0);

// Keep the beat: a kick right on the beat, quiet just before the next one, and every look moves to it.
var bf = filled(0), bw = filled(128, 2048);
L.beatFrame(0, 120, bf, bw, BINS, NYQ);
var onBeat = L.bands(L.gate(BINS)(bf, BINS), BINS, NYQ);
check('the made-up kick is in the lows', onBeat.bass > 0.5);
check('and moves the wave', max(bw) > 160);
L.beatFrame(480, 120, bf, bw, BINS, NYQ);
check('and has died away just before the next beat', L.bands(L.gate(BINS)(bf, BINS), BINS, NYQ).bass < onBeat.bass * 0.3);
var kb = L.beats(), hits = 0;
for (i = 0; i < 120; i++) {
  L.beatFrame(i * 33, 120, bf, bw, BINS, NYQ);
  if (kb(L.bands(L.gate(BINS)(bf, BINS), BINS, NYQ).bass, i * 33)) hits++;
}
check('about two beats a second are heard as beats', hits >= 6 && hits <= 10);

// Movement: a still picture is nothing, noise is nothing, a hand on the left lights the left (mirrored on screen).
var CW = 64, CH = 36, cellsOut = new Float32Array(16 * 9);
function frameOf(v) { var a = new Uint8Array(CW * CH); for (var q = 0; q < a.length; q++) a[q] = v; return a; }
var still = frameOf(100);
check('a still room has no movement', L.motion(still, frameOf(100), CW, CH, 16, 9, cellsOut) === 0);
var noisy = frameOf(100);
for (i = 0; i < noisy.length; i++) noisy[i] = 100 + (i % 7) - 3;
check('camera noise is not movement', L.motion(still, noisy, CW, CH, 16, 9, cellsOut) === 0);
var hand = frameOf(100);
for (var y = 10; y < 20; y++) for (var x = 0; x < 8; x++) hand[y * CW + x] = 220;
var amount = L.motion(still, hand, CW, CH, 16, 9, cellsOut);
check('a hand moving is movement', amount > 0 && amount < 0.1);
check('on the camera\'s left it ripples the right of the picture, as in a mirror', cellsOut[3 * 16 + 15] > 0.5 && cellsOut[3 * 16 + 0] === 0);

// Ripples: drawn over a look, spread faster with music, and gone in the end.
L.useContext(ctx, false);
var rp = [{x: 100, y: 100, r: 8, life: 1, v: 1, c: '#fff'}], loudF = {b: {level: 0.8}, hit: false}, quietF = {b: {level: 0}, hit: false};
L.drawRipples(loudF, rp);
var rq = [{x: 100, y: 100, r: 8, life: 1, v: 1, c: '#fff'}];
L.drawRipples(quietF, rq);
check('ripples spread faster with music', rp[0].r > rq[0].r);
for (i = 0; i < 100; i++) L.drawRipples(quietF, rq);
check('and fade away', rq.length === 0);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
