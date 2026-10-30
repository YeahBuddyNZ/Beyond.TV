// Look around (web/skylook.js) without a screen: the projection that turns the sky into a window, and what counts as
// "in the middle of the screen":
// node tests/skylook.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {}, tr: function (pt, en) { return en; }, UI: {}, Math: Math, Date: Date, JSON: JSON, console: console,
  Place: {lat: '-36.8485', lon: '174.7633', city: 'Auckland', country: 'NZ'}, I18N: {lang: 'en', locale: function () { return 'en-NZ'; }}};
vm.createContext(sandbox);
['skydata.js', 'sky.js', 'skylook.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var T = sandbox.SkyLook._test, core = sandbox.Sky.core;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 0.01); }

// The three directions the screen is built from stand at right angles to each other, for any way of looking.
[[0, 0], [180, 38], [90, -6], [270, 89], [45, 60]].forEach(function (v) {
  var f = T.frame(v[0], v[1]);
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  check('frame is square ' + v, near(dot(f.f, f.r), 0, 1e-9) && near(dot(f.f, f.u), 0, 1e-9) && near(dot(f.r, f.u), 0, 1e-9)
    && near(dot(f.f, f.f), 1, 1e-9) && near(dot(f.r, f.r), 1, 1e-9) && near(dot(f.u, f.u), 1, 1e-9));
});

// What you look at is in the middle.
var look = T.frame(200, 30), mid = T.project(look, T.vec(200, 30));
check('the middle is the middle', near(mid.x, 960, 0.001) && near(mid.y, 540, 0.001));

// Facing north, east is on the right and west on the left, and up is up.
var north = T.frame(0, 0);
check('east is right', T.project(north, T.vec(30, 0)).x > 960);
check('west is left', T.project(north, T.vec(-30, 0)).x < 960);
check('up is up', T.project(north, T.vec(0, 20)).y < 540);
check('down is down', T.project(north, T.vec(0, -20)).y > 540);
check('the horizon is level when looking at it', near(T.project(north, T.vec(25, 0)).y, 540, 0.001));

// About 55 degrees to the side reaches the edge of the screen: the view is a wide one.
var edge = T.project(north, T.vec(55, 0));
check('55 degrees is about the edge', edge.x > 1850 && edge.x < 1930);

// Something behind us isn't drawn.
check('behind is dropped', T.project(north, T.vec(180, 0)) === null);

// Directions and angles.
check('angle between', near(T.between(T.vec(0, 0), T.vec(90, 0)), 90, 1e-6) && near(T.between(T.vec(10, 20), T.vec(10, 20)), 0, 1e-6));
var h = T.toHorizon(T.vec(123, 45));
check('there and back', near(h.az, 123, 1e-6) && near(h.alt, 45, 1e-6));
check('az wraps into 0 to 360', T.toHorizon(T.vec(-30, 10)).az > 329.9);

// What counts as being in the middle: the closest thing, by how much of its own reach it is using.
var list = [
  {kind: 'star', name: 'A', key: 'A', v: T.vec(10, 20), reach: 5},
  {kind: 'constellation', name: 'B', key: 'B', v: T.vec(10, 26), reach: 13}
];
check('nothing near, nothing named', T.nearest(list, T.vec(100, 20)) === null);
check('a star right there wins', T.nearest(list, T.vec(10, 20)).name === 'A');
check('a big constellation reaches further', T.nearest(list, T.vec(10, 30)).name === 'B');
check('a star outside its reach is missed', T.nearest([list[0]], T.vec(10, 27)) === null);
check('a sun under the horizon is never named', T.nearest([{kind: 'sun', name: 'Sun', key: 'Sun', v: T.vec(0, -30), reach: 7}], T.vec(0, -30)) === null);

// Daylight puts the stars out.
check('night is dark', T.darkness(-30) === 1 && T.darkness(10) === 0 && T.darkness(-8) > 0 && T.darkness(-8) < 1);

// The sums are sky.js's own: the sun is where it should be in Auckland, 30/10/2026, around noon NZ time.
core.init();
var p = core.place(), noon = Date.UTC(2026, 9, 29, 23, 0, 0);
check('the sun is high at noon', core.sunPlace(noon, p).alt > 55);
check('the sun is down at midnight', core.sunPlace(noon + 12 * 3600000, p).alt < -20);
check('the sun is north of the zenith in the south', Math.abs(core.sunPlace(noon, p).az - 0) < 40 || Math.abs(core.sunPlace(noon, p).az - 360) < 40);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
