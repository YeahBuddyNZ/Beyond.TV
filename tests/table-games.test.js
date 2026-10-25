// The rules of the board and card games (web/ludo.js, web/snap.js, web/table.js), without a screen:
// node tests/table-games.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  tr: function (pt, en) { return en; },
  TV: {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 461}},
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console
};
vm.createContext(sandbox);
['table.js', 'ludo.js', 'snap.js'].forEach(function (f) {
  // Top-level `var X = ...` in a script becomes a property of the context.
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var Ludo = sandbox.Ludo.rules, Snap = sandbox.Snap.rules, Table = sandbox.Table;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

// Ludo: getting out, getting home.
var kid = {id: 'p1', name: 'Talia', kid: true}, robot = {id: 'robot-kea', name: 'Kea', robot: true};
var s = Ludo.newGame([kid, robot], 2);
check('a token at home needs a six', Ludo.legal(s, 0, 5).length === 0 && Ludo.legal(s, 0, 6).length === 2);
s.players[0].tokens = [54, -1];
check('home takes the exact number', Ludo.legal(s, 0, 3).length === 0 && Ludo.legal(s, 0, 2).length === 1);
var home = Ludo.move(s, 0, 0, 2);
check('getting home rolls again', home.home && home.again);

// Ludo: catching, and stars being safe. Seat 0 starts on square 0, seat 2 (the second player) on square 26.
s = Ludo.newGame([kid, robot], 2);
s.players[0].tokens = [3, -1];
s.players[1].tokens = [(5 - 26 + 52) % 52, -1]; // the robot sits on main square 5
check('the robot is on square 5', Ludo.square(2, s.players[1].tokens[0]) === 5);
var caught = Ludo.move(s, 0, 0, 2);
check('landing on someone sends them home', caught.captured && s.players[1].tokens[0] === -1 && caught.again);
s.players[0].tokens = [5, -1];
s.players[1].tokens = [(8 - 26 + 52) % 52, -1]; // the robot on the star at square 8
var safe = Ludo.move(s, 0, 0, 3);
check('a token on a star is safe', !safe.captured && s.players[1].tokens[0] === (8 - 26 + 52) % 52);

// Ludo: danger is counted from tokens up to six behind.
s = Ludo.newGame([kid, robot], 2);
s.players[1].tokens = [(10 - 26 + 52) % 52, -1]; // the robot on square 10
check('two squares ahead of the robot is in danger', Ludo.danger(s, 12, 0) === 1);
check('seven squares ahead is not', Ludo.danger(s, 17, 0) === 0);

// Ludo robots: at the top level they take the catch; at the bottom they sometimes don't.
s = Ludo.newGame([robot, kid], 2);
s.players[0].tokens = [3, 30]; // seat 0: one token can catch the kid on square 5 with a 2
s.players[1].tokens = [(5 - 26 + 52) % 52, -1];
var picks = {top: 0, bottom: 0};
for (var i = 0; i < 200; i++) {
  if (Ludo.robotPick(s, 0, 2, 10) === 0) picks.top++;
  if (Ludo.robotPick(s, 0, 2, 1) === 0) picks.bottom++;
}
check('a level 10 robot always takes the catch', picks.top === 200);
check('a level 1 robot misses it sometimes', picks.bottom < 200 && picks.bottom > 40);
check('the weighing sees the catch', !!Ludo.weigh(s, 0, 0, 2).capture);

// Snap.
check('chant: the card is the word', Snap.isMatch(true, 2, 2) && !Snap.isMatch(true, 2, 3));
check('snap: the card is the one under it', Snap.isMatch(false, 4, 0, 4) && !Snap.isMatch(false, 4, 0, 5) && !Snap.isMatch(false, 4, 0, undefined));
var players = [{who: kid}, {who: robot}, {who: {id: 'robot-tui', robot: true}}];
check('the person who didn\'t slap takes the pile', Snap.loser(players, [{pi: 1, ms: 500}, {pi: 2, ms: 600}]) === 0);
check('else the slowest takes it', Snap.loser(players, [{pi: 0, ms: 400}, {pi: 2, ms: 600}, {pi: 1, ms: 900}]) === 1);
check('robots get quicker with the level', Snap.reaction(10, function () { return 0.5; }) < Snap.reaction(1, function () { return 0.5; }));
check('and miss less', Snap.missChance(10) < Snap.missChance(1));
var cards = Snap.deck(true);
check('the chant deck has ten of each of five', cards.length === 50 && cards.filter(function (c) { return c === 3; }).length === 10);
var hands = Snap.deal([1, 2, 3], cards);
check('dealt evenly', hands[0].length === 17 && hands[2].length === 16);

// Levels: a win pushes the robots up, a loss eases them off, never far below the best.
var talia = {id: 'p9', name: 'Talia', kid: true};
var start = Table.record(talia, 'ludo').level;
check('looking doesn\'t save anything', !store['bt.table']);
var won = Table.learn(talia, 'ludo', 1);
check('a win raises the level', won.after > start);
check('and it is kept on this TV', JSON.parse(store['bt.table']).people.p9.ludo.played === 1);
for (var w = 0; w < 20; w++) Table.learn(talia, 'ludo', 1);
var peak = Table.record(talia, 'ludo').level;
for (var l = 0; l < 30; l++) Table.learn(talia, 'ludo', 0);
var after = Table.record(talia, 'ludo').level;
check('losing eases off', after < peak);
check('but never more than one and a half below the best', after >= peak - 1.5 - 1e-9);
check('the level stays between 1 and 10', peak <= 10 && after >= 1);
var guest = {id: 'guest', guest: true};
Table.learn(guest, 'snap', 1);
check('guests are never kept', !JSON.parse(store['bt.table']).people.guest);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
