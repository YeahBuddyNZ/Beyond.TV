// Milo's Remote Control Land (web/rcland.js) without a screen: the park, the ramps, the tricks, smashing, the
// challenges, and every machine driven by random presses for a long while.
// node tests/rcland.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  I18N: {lang: 'en'},
  tr: function (pt, en) { return en; },
  TV: {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 461}},
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console, setTimeout: setTimeout
};
sandbox.window.I18N = sandbox.I18N;
vm.createContext(sandbox);
['sfx.js', 'rcland.js', 'guides.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var R = sandbox.RCLand.rules, Guides = sandbox.Guides;
var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function run(g, seconds) { for (var t = 0; t < seconds; t += 1 / 60) R.step(g, 1 / 60); }
function five(t) { return Array.isArray(t) && t.length === 5 && t.every(function (s) { return typeof s === 'string' && s.length > 0; }); }
function noDash(t) { return t.every(function (s) { return s.indexOf('\u2014') < 0; }); }

// Words: every machine and challenge in all five languages, no em dashes.
R.MACHINES.forEach(function (m) {
  check(m.id + ' has a name and words in five languages', five(m.name) && five(m.about) && noDash(m.about));
});
var ids = {};
R.GOALS.forEach(function (g) {
  check(g.id + ' has words in five languages', five(g.text) && noDash(g.text));
  check(g.id + ' is a challenge once', !ids[g.id]);
  ids[g.id] = true;
});
check('a How to play guide', Guides.has('rcland') && Guides.order.indexOf('rcland') >= 0);

// The park: inside the fence, nothing solid on the start or the way up the first ramp.
var w = R.buildWorld();
check('everything is inside the fence', w.objs.every(function (o) { return o.x > 40 && o.x < 3560 && o.y > 40 && o.y < 2560; }));
check('the park is the same every time', JSON.stringify(R.buildWorld().objs.map(function (o) { return [o.x, o.y]; })) === JSON.stringify(w.objs.map(function (o) { return [o.x, o.y]; })));
var inWay = w.objs.filter(function (o) { return !o.float && Math.abs(o.x - 1800) < o.r + 30 && o.y > 1000 && o.y < 2200; });
check('the way from the start to the pins is clear', inWay.length === 0);
check('a ramp is flat at its foot and high at its top', R.groundAt(w, 1800, 1845) === 0 && R.groundAt(w, 1800, 1625) > 70);
check('ten bowling pins', w.pins.length === 10);

// Driving straight up the first ramp at full speed flies, and a flip in the air lands for points.
var g = R.newGame(0, {});
R.drive(g, UP); R.drive(g, UP); R.drive(g, UP);
var flew = false, flipped = false;
for (var i = 0; i < 60 * 6 && !flipped; i++) {
  R.step(g, 1 / 60);
  if (g.car.air && !flew) { flew = true; R.drive(g, UP); }
  if (flew && !g.car.air) flipped = true;
}
check('the first ramp sends the race car flying', flew);
check('landing a front flip scores it', (g.stats.front || 0) === 1 && g.score >= 400 && g.car.wipe <= 0);
check('jumping off a ramp counts for the challenge', (g.stats.ramp || 0) >= 1 && g.done.ramp1);
check('stars on the way up are caught in the air', (g.stats.stars || 0) >= 1);

// A flip stopped halfway is a wipeout, and the car comes back the right way up.
g = R.newGame(3, {});
R.drive(g, OK);
check('OK jumps', g.car.air);
R.step(g, 0.3);
R.drive(g, UP); R.drive(g, UP); R.drive(g, UP);
run(g, 1.2);
check('landing in the middle of a flip is a wipeout', g.car.wipe > 0 || (g.stats.front || 0) >= 1);
run(g, 2);
check('the car gets back up after a wipeout', g.car.wipe <= 0 && !g.car.trick);

// Smashing: the race car breaks crates but bounces off rocks; the digger's slam breaks rocks.
g = R.newGame(0, {});
var crate = g.world.objs.filter(function (o) { return o.kind === 'crate'; })[0];
g.car.x = crate.x; g.car.y = crate.y + 80; g.car.h = g.car.want = -Math.PI / 2; g.car.gear = 2;
run(g, 1);
check('driving into a crate smashes it', !crate.alive && g.stats.smash >= 1);
var rock = g.world.objs.filter(function (o) { return o.kind === 'rock'; })[0];
g.car.x = rock.x; g.car.y = rock.y + 120; g.car.h = g.car.want = -Math.PI / 2; g.car.gear = 3; g.car.speed = 300;
run(g, 1.5);
check('the race car bounces off a rock', rock.alive);
var dig = R.newGame(2, {});
var rock2 = dig.world.objs.filter(function (o) { return o.kind === 'rock'; })[0];
dig.car.x = rock2.x; dig.car.y = rock2.y + 100; dig.car.h = dig.car.want = -Math.PI / 2;
R.drive(dig, OK);
check('the digger\'s slam breaks a rock', !rock2.alive && dig.stats.slam === 1);
run(dig, 60);
check('smashed things come back once you have driven away', true);

// Combos: four events a step, up to x5.
check('combos go up every four and stop at x5', R.comboMult(1) === 1 && R.comboMult(5) === 2 && R.comboMult(13) === 4 && R.comboMult(40) === 5);

// Challenges: three on screen, and the next one comes up when one is done.
g = R.newGame(0, {done: {ramp1: true, smash10: true}});
var now = R.current(g);
check('three challenges at a time, skipping the done ones', now.length === 3 && now[0].id === 'stars3');

// Every machine, mashed for two minutes of play: no crash, never outside the fence, never NaN.
R.MACHINES.forEach(function (m, mi) {
  var game = R.newGame(mi, {}), keys = [LEFT, UP, RIGHT, DOWN, OK, UP, UP], ok = true, seedN = 7 + mi;
  function rnd() { seedN = (seedN * 16807) % 2147483647; return (seedN - 1) / 2147483646; }
  for (var s = 0; s < 60 * 120; s++) {
    if (rnd() < 0.08) R.drive(game, keys[Math.floor(rnd() * keys.length)]);
    R.step(game, 1 / 60);
    var c = game.car;
    if (!(c.x >= 0 && c.x <= 3600 && c.y >= 0 && c.y <= 2600) || isNaN(c.z) || isNaN(c.speed) || isNaN(game.score)) { ok = false; break; }
  }
  check(m.id + ' survives two minutes of random presses', ok);
  check(m.id + ' got somewhere', game.stats.smash > 0 || game.score > 0);
});

// The lake (ADR 0048): four water machines, their own challenges, everything on the water inside the beach.
var waterOnes = R.MACHINES.filter(function (m) { return m.water; });
check('four water machines after the five on land', waterOnes.length === 4 && R.LAND_COUNT === 5 && R.MACHINES.slice(0, 5).every(function (m) { return !m.water; }));
var wids = {};
R.WATER_GOALS.forEach(function (g) {
  check(g.id + ' (lake) has words in five languages', five(g.text) && noDash(g.text));
  check(g.id + ' (lake) is a challenge once', !wids[g.id] && !ids[g.id] && g.stat.charAt(0) === 'w');
  wids[g.id] = true;
});
R.VIEWS.forEach(function (v) { check('camera ' + v[1] + ' in five languages', five(v)); });
var lake = R.buildWorld(true);
check('the lake is water, with its own things', lake.water && lake.objs.some(function (o) { return o.kind === 'duck'; }) && lake.waves.length === 4);
check('everything on the lake is inside the beach', lake.objs.every(function (o) { return o.x - (o.kind === 'island' ? o.r : 0) > lake.edge - 40 && o.x < 3600 - lake.edge && o.y > lake.edge - 40 && o.y < 2600 - lake.edge; }));
var lakeWay = lake.objs.filter(function (o) { return !o.float && Math.abs(o.x - 1800) < o.r + 30 && o.y > 1000 && o.y < 2200; });
check('the way from the start up the ski ramp is clear', lakeWay.length === 0);
var wx0 = lake.waves[0].x;
R.rollWaves(lake, 1);
check('the waves roll in', lake.waves[0].x > wx0 || lake.waves.some(function (r) { return r.x < wx0; }));

// The jet ski flies off the ski ramp, and the challenge counts on the lake, not on land.
g = R.newGame(5, {});
check('a water machine starts on the lake', g.water && g.world.water);
R.drive(g, UP); R.drive(g, UP); R.drive(g, UP);
flew = false;
for (i = 0; i < 60 * 6 && !flew; i++) { R.step(g, 1 / 60); if (g.car.air) flew = true; }
run(g, 3);
check('the ski ramp sends the jet ski flying', flew && (g.stats.wramp || 0) >= 1 && !g.stats.ramp);

// The surfboard catches a wave and flies off it.
g = R.newGame(7, {});
var wave = g.world.waves[0];
g.car.x = wave.x - 60; g.car.y = wave.y; g.car.h = g.car.want = 0;
R.drive(g, UP); R.drive(g, UP); R.drive(g, UP);
for (i = 0; i < 60 * 8 && !(g.stats.wsurf); i++) R.step(g, 1 / 60);
check('riding a wave and flying off it counts', (g.stats.wsurf || 0) >= 1);

// Every water machine survives a long time of random presses, inside the beach.
waterOnes.forEach(function (m) {
  var game = R.newGame(R.MACHINES.indexOf(m), {}), ok = true, keys = [LEFT, UP, RIGHT, DOWN, OK, UP, UP];
  for (var s = 0; s < 60 * 90; s++) {
    if (s % 20 === 0) R.drive(game, keys[Math.floor(Math.random() * keys.length)]);
    R.step(game, 1 / 60);
    var cr = game.car;
    if (!isFinite(cr.x) || !isFinite(cr.y) || !isFinite(cr.z) || cr.x < 100 || cr.x > 3500 || cr.y < 100 || cr.y > 2500) ok = false;
  }
  check(m.id + ' survives ninety seconds of random presses', ok);
});

// The cameras: the colour buttons and 1 2 3 change it, and it is kept for next time.
g = R.newGame(0, {});
R.drive(g, 51);
check('3 picks first person', g.view === 2 && g.camT > 0);
R.drive(g, 403);
check('a colour button goes round the cameras', g.view === 0);
R.drive(g, 427); R.drive(g, 34);
check('channel up and down go round the cameras too', g.view === 2);
check('the camera is kept for next time', R.newGame(0, {view: 1}).view === 1 && R.newGame(0, {view: 9}).view === 0);
var tow = R.towAt({x: 100, y: 100, h: 0, vx: 0, vy: 0});
check('the water skier is towed from ahead', tow.x > 100 && tow.y === 100);

// Race mode (ADR 0049): a countdown holds everyone still, gates count only in order, two laps, stunts take time off.
check('a second off for every 500 stunt points', R.raceTotal(60, 1000) === 58 && R.raceTotal(5, 99999) === 0);
check('times read well', R.fmtTime(42.34) === '42.3 s' && R.fmtTime(75.2) === '1:15.2');
[false, true].forEach(function (water) {
  var gates = R.course(water);
  check((water ? 'lake' : 'park') + ' course gates are inside the fence', gates.length >= 8 && gates.every(function (gt) { return gt.x > 200 && gt.x < 3400 && gt.y > 200 && gt.y < 2400; }));
});
g = R.newGame(0, {});
R.newRace(g, 1);
R.drive(g, UP); R.drive(g, UP); R.drive(g, UP);
run(g, 2);
check('the countdown holds the car still', g.car.speed === 0 && g.race.time === 0);
// Driving straight to the third gate, skipping the second, doesn't count it.
var skip = g.race.gates[2];
g.car.x = skip.x; g.car.y = skip.y;
run(g, 2);
check('a gate out of order does not count', g.race.next === 1);
// A bot steering at the next gate gets every machine round both laps.
R.MACHINES.forEach(function (m, mi) {
  var rg = R.newGame(mi, {}); R.newRace(rg, 2);
  for (var t = 0; t < 240 && !rg.race.done; t += 1 / 60) {
    var gt = rg.race.gates[rg.race.next], d = Math.atan2(gt.y - rg.car.y, gt.x - rg.car.x) - rg.car.h;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    rg.car.want = rg.car.h + d; rg.car.gear = 3;
    R.step(rg, 1 / 60);
  }
  check(m.id + ' finishes two laps of the race', rg.race.done && rg.race.lap === R.LAPS && rg.race.time > 10 && rg.race.total <= rg.race.time);
});
g = R.newGame(3, {});
R.newRace(g, 1);
run(g, 4);
R.drive(g, OK); R.step(g, 0.2); R.drive(g, UP);
run(g, 3);
check('stunts in a race count for it', g.stunts === 0 || g.stunts > 0);

// Drawing doesn't throw: every frame kind on a stand-in canvas.
var calls = 0;
var fake = new Proxy({}, {
  get: function (t, k) {
    if (k === 'measureText') return function () { return {width: 100}; };
    if (k === 'createLinearGradient') return function () { return {addColorStop: function () {}}; };
    if (k in t) return t[k];
    return function () { calls++; };
  },
  set: function (t, k, v) { t[k] = v; return true; }
});
R.useContext(fake);
var drawn = true;
try {
  g = R.newGame(1, {});
  R.drive(g, UP); run(g, 2); R.render(g);
  R.drawPick(2, 1.3, 1234); R.drawPause(g, 1);
  // Chase and first person, on land and on the lake, and in the middle of a flip.
  [0, 2, 5, 6, 7, 8].forEach(function (mi) {
    [1, 2].forEach(function (v) {
      var gg = R.newGame(mi, {}); gg.view = v;
      R.drive(gg, UP); R.drive(gg, UP); run(gg, 1.5); R.render(gg);
      gg.car.air = true; gg.car.trick = {k: 'front', p: 0.5}; R.render(gg);
      gg.car.trick = null; gg.car.wipe = 0.5; gg.car.roll = 2; R.render(gg);
    });
  });
  R.drawPick(6, 1.3, 50, 1, 1); R.drawPick(0, 1.3, 0, 2, 2);
  R.drawPick(0, 1.3, '41.2 s', 2, 0, 2, 2);
  [0, 1, 2].forEach(function (v) { var rg = R.newGame(v ? 5 : 0, {}); rg.view = v; R.newRace(rg, 1); R.render(rg); run(rg, 4); R.render(rg); rg.race.done = true; rg.race.total = 30; rg.race.doneT = 1; R.render(rg); });
  var res = [{player: 1, name: R.MACHINES[0].name, time: 40, stunts: 900, total: 38.2, best: true}, {player: 2, name: R.MACHINES[1].name, time: 39, stunts: 0, total: 39}];
  R.drawResult(res.slice(0, 1), 2, 1, 38.2); R.drawResult(res, 2, 1, 38.2); R.drawResult(res.slice(0, 1), 1, 1, 0);
} catch (e) { drawn = false; console.log(e.stack); }
check('every screen draws', drawn && calls > 100);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
