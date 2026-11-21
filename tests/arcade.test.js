// The arcade (web/arcade.js) without a screen: the maze, the turning rules, and each game played by random presses
// on a stand-in canvas, to be sure none of them throws, ends, or gets stuck:
// node tests/arcade.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  tr: function (pt, en) { return en; },
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console
};
vm.createContext(sandbox);
['sfx.js', 'arcade.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var A = sandbox.Arcade.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

// A canvas that accepts anything and draws nothing.
var ctx = {measureText: function () { return {width: 100}; }, save: function () {}, restore: function () {}};
['beginPath', 'moveTo', 'lineTo', 'arc', 'closePath', 'fill', 'stroke', 'fillRect', 'fillText', 'quadraticCurveTo', 'bezierCurveTo',
  'translate', 'scale', 'rotate'].forEach(function (m) { ctx[m] = function () {}; });
ctx.createLinearGradient = function () { return {addColorStop: function () {}}; };
A.useContext(ctx);

// The maze: every row the same length, every open square reachable, dots to eat and room for everyone to start.
var M = A.MAZE, width = M[0].length, open = 0;
check('maze rows are all the same length', M.every(function (r) { return r.length === width; }));
M.forEach(function (r) { for (var i = 0; i < r.length; i++) if (r.charAt(i) !== '#') open++; });
check('every open square can be reached', A.reachable(M, 10, 11) === open);
check('the player starts on a dot square', A.open(M, 10, 11));
check('the ghosts start on open squares', [[8, 7], [9, 7], [11, 7], [12, 7]].every(function (p) { return A.open(M, p[0], p[1]); }));
check('there are big dots', M.join('').indexOf('o') >= 0);

// The eel can't double back on itself, and the board wraps.
check('no turning back on yourself', !A.canTurn({x: 1, y: 0}, {x: -1, y: 0}) && A.canTurn({x: 1, y: 0}, {x: 0, y: 1}));
var w = A.wrap({x: 31, y: 0}, {x: 1, y: 0}, 32, 18);
check('the board wraps right to left', w.x === 0 && w.y === 0);
w = A.wrap({x: 0, y: 0}, {x: 0, y: -1}, 32, 18);
check('the board wraps top to bottom', w.y === 17);

// The paddle sends the ball by where it hit.
check('dead centre goes straight', A.bounce(60, 0, 60, 500) === 0);
check('the top edge goes up and the bottom edge goes down', A.bounce(0, 0, 60, 500) === -500 && A.bounce(120, 0, 60, 500) === 500);
check('a miss past the edge is held to the steepest', A.bounce(400, 0, 60, 500) === 500);

// The jellies speed up as they thin out, and as the waves go on, but never faster than every second tick.
check('fewer jellies step quicker', A.jellyEvery(4, 36, 1) < A.jellyEvery(36, 36, 1));
check('a later wave steps quicker', A.jellyEvery(36, 36, 3) < A.jellyEvery(36, 36, 1));
check('never quicker than every 2 ticks', A.jellyEvery(1, 36, 9) === 2);

// Each game played by random presses: it must draw, take every key, and end or keep going without throwing.
var KEYS = [37, 38, 39, 40, 13];
['eel', 'paddle', 'guard', 'dots', 'crew'].forEach(function (id) {
  var ended = 0, threw = false;
  for (var game = 0; game < 6; game++) {
    var g = A.make(id);
    try {
      for (var t = 0; t < 4000 && !g.over; t++) {
        if (t % 9 === 0) g.key(KEYS[Math.floor(Math.random() * KEYS.length)]);
        g.update();
        if (t % 50 === 0) g.draw();
      }
      g.draw();
      if (g.over) ended++;
      if (typeof g.endText() !== 'string') threw = true;
    } catch (e) { console.log(id, e.stack); threw = true; }
  }
  check(id + ' plays without a problem', !threw);
  if (id !== 'paddle' && id !== 'crew') check(id + ' can be lost by playing badly', ended > 0);
});

// Eel: eating grows it, hitting itself ends it.
(function () {
  var g = A.make('eel');
  var start = g.score;
  for (var i = 0; i < 2000 && g.score === start && !g.over; i++) { g.update(); }
  check('the eel can swim on without dying straight away', i > 5);
})();

// Paddle: a player who never moves loses, and the robot gets a bit quicker for the next game only when beaten.
(function () {
  var g = A.make('paddle');
  for (var t = 0; t < 20000 && !g.over; t++) g.update();
  check('a still paddle loses to the robot', g.over && !g.won);
  check('losing does not make the robot quicker', (JSON.parse(store['btv.arcade'] || '{}').paddle || 1) === 1);
})();

// Launch Crew: four scams and four real messages, each with words; the gauge, the stars and the lanes.
(function () {
  var m = A.crewMessages();
  check('Launch Crew has four scams and four real messages', m.filter(function (x) { return x.scam; }).length === 4 && m.length === 8);
  check('every scam says why, every real one says who from', m.every(function (x) { return x.scam ? !!x.why : !!x.from; }));
  var top = 0, low = 100;
  for (var t = 0; t < 400; t++) { top = Math.max(top, A.crewFuel(t)); low = Math.min(low, A.crewFuel(t)); }
  check('the fuel needle sweeps the whole gauge', top >= 99 && low <= 1);
  check('the green is near the top but not over', A.crewFuelOk(90) && !A.crewFuelOk(60) && !A.crewFuelOk(100));
  check('stars: 3 for 7 or more, 2 for 5 or 6, never none', A.crewStars(8) === 3 && A.crewStars(7) === 3 && A.crewStars(5) === 2 && A.crewStars(0) === 1);
  var same = false;
  for (var i = 0; i < 300; i++) { var last = i % 3; if (A.crewLane(last, Math.random()) === last) same = true; }
  check('a message never drops down the same lane as the one before', !same);
})();

// Launch Crew played well: board everyone, fuel in the green, fix every spark, then zap only the scams.
(function () {
  var g = A.make('crew'), t;
  for (t = 0; t < 400; t++) { g.key(13); g.update(); }
  for (t = 0; t < 3000 && !g.over; t++) {
    g.update();
    g.draw();
  }
  check('a crew left alone never takes off', !g.over);

  g = A.make('crew');
  var p, n = 0;
  for (t = 0; t < 6000 && !g.over; t++) {
    p = g.peek();
    if (p.phase === 'board' && t % 3 === 0) g.key(13);
    else if (p.phase === 'fuel' && A.crewFuelOk(p.fuel) && p.fuel < 95) g.key(13);
    else if (p.phase === 'fix' && p.spark) g.key(p.spark);
    else if (p.phase === 'fly') {
      var scam = null;
      p.fallers.forEach(function (f) { if (f.m.scam && f.y > 100) scam = f; });
      if (scam && scam.lane < p.lane) g.key(37);
      else if (scam && scam.lane > p.lane) g.key(39);
      else if (scam) g.key(13);
      else if (p.fallers.some(function (f) { return !f.m.scam && f.lane === p.lane; })) g.key(p.lane < 2 ? 39 : 37);
    }
    g.update();
    if (t % 25 === 0) g.draw();
  }
  check('a crew played well reaches the Moon', g.over && g.won);
  check('and handles every message right', g.score === 8);
  check('which earns three stars', g.scoreText().indexOf('★★★') === 0);
})();

// The remote in a game (Kyle, 21/11/2026: Back and OK did nothing in Sky Guard). Back must reach back(), which
// pauses a game being played and leaves one that's paused, ready or over; OK starts and carries on.
(function () {
  var screens = [], adds = [];
  sandbox.TV = {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 4}};
  sandbox.setInterval = function () { return 1; };
  sandbox.clearInterval = function () {};
  sandbox.UI = {
    el: function () { return {}; }, heading: function () {}, button: function (row, label) { return {label: label}; },
    open: function (spec) {
      screens.push(spec);
      if (!spec.key) spec.build({}, {add: function (node, run) { adds.push({label: node.label, run: run}); }});
      return {};
    }
  };
  sandbox.Arcade.open();
  var guard = adds.filter(function (a) { return /Sky Guard/.test(a.label); })[0];
  check('the arcade lists Sky Guard', !!guard);
  guard.run();
  var game = screens[screens.length - 1];
  A.useContext(ctx);
  [4, 461, 10009, 27, 8].forEach(function (k) { check('Back (' + k + ') is not swallowed by the game', game.key(k) === false); });
  check('Back before starting leaves', game.back() === false);
  check('OK starts the game', game.key(13) === true);
  check('Back while playing pauses', game.back() === true);
  check('Back while paused leaves', game.back() === false);
  game.key(13);
  check('OK carries on after a pause', game.back() === true);
  game.key(13);
  check('OK is taken while playing', game.key(13) === true);
})();

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
