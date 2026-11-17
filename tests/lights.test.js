// The light show (web/lights.js) without a screen: the bands, the beat, the made-up beat, the shuffle, the light mode,
// and every look drawn many frames on a stand-in canvas, loud and silent, so none of them throws:
// node tests/lights.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {}, navigator: {}, tr: function (pt, en) { return en; }, UI: {}, Math: Math, Date: Date, JSON: JSON,
  Uint8Array: Uint8Array, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'lights.js'), 'utf8'), sandbox, {filename: 'lights.js'});
var L = sandbox.Lights.core;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

function filled(v) { var a = new Uint8Array(256); for (var i = 0; i < a.length; i++) a[i] = v; return a; }

// Bands: silence is nothing, full is everything, and a kick drum is the lows.
var b = L.bands(filled(0));
check('silence is all zero', b.bass === 0 && b.mid === 0 && b.high === 0 && b.level === 0);
b = L.bands(filled(255));
check('flat out is all one', b.bass === 1 && b.mid === 1 && b.high === 1 && b.level === 1);
var kick = filled(0);
for (var i = 0; i < 10; i++) kick[i] = 255;
b = L.bands(kick);
check('a kick is the lows only', b.bass > 0.9 && b.mid < 0.2 && b.high === 0);

// The beat: a jump in the lows is a beat, but not twice in a quarter second, and not in a quiet room.
var beat = L.beats(), t = 0;
for (i = 0; i < 30; i++) beat(0.1, t += 33);
check('a jump in the lows is a beat', beat(0.8, t += 33));
check('not again straight away', !beat(0.9, t += 33));
for (i = 0; i < 30; i++) beat(0.1, t += 33);
check('and again after a rest', beat(0.8, t += 33));
var quiet = L.beats(); t = 0;
var any = false;
for (i = 0; i < 200; i++) any = quiet(i % 10 ? 0.02 : 0.2, t += 33) || any;
check('a quiet room never flashes', !any);

// Just lights: always 0 to 255, it moves, and it has a beat of its own.
var out = new Uint8Array(256), okRange = true, beats = 0, fb = L.beats(), first = null, moved = false;
for (t = 0; t < 10000; t += 33) {
  L.fake(t, out);
  for (i = 0; i < out.length; i++) if (out[i] < 0 || out[i] > 255) okRange = false;
  if (first === null) first = out[3]; else if (out[3] !== first) moved = true;
  if (fb(L.bands(out).bass, t)) beats++;
}
check('the made-up levels stay 0 to 255', okRange);
check('the made-up levels move', moved);
check('the made-up beat is near 112 a minute (about 18 in 10 seconds)', beats >= 12 && beats <= 22);

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

// Every look, full and light, loud and silent, many frames: none throws.
var calls = 0;
var ctx = {setTransform: function () {}};
['beginPath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'closePath', 'fill', 'stroke', 'fillRect'].forEach(function (m) { ctx[m] = function () { calls++; }; });
[false, true].forEach(function (lightMode) {
  L.LOOKS.forEach(function (look) {
    L.useContext(ctx, lightMode);
    var lb = L.beats(), threw = null, levels = new Uint8Array(256);
    try {
      for (var f = 0; f < 600; f++) {
        var now = f * 16;
        if (f < 300) L.fake(now, levels); else levels = filled(f % 2 ? 0 : 255);
        var bb = L.bands(levels);
        look.draw(levels, bb, now, lb(bb.bass, now));
      }
    } catch (e) { threw = e; }
    check(look.id + (lightMode ? ' (light)' : '') + ' draws without throwing' + (threw ? ': ' + threw : ''), !threw);
  });
});
check('the looks drew something', calls > 1000);
check('every look has a name', L.LOOKS.every(function (l) { return typeof l.name() === 'string' && l.name().length > 0; }));

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
