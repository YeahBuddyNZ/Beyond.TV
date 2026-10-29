// The rules of the board and card games (web/ludo.js, web/chess.js, web/snap.js, web/table.js) and the silly games' lines
// (web/laughs.js), without a screen:
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
['sfx.js', 'table.js', 'ludo.js', 'chess.js', 'snap.js', 'laughs.js'].forEach(function (f) {
  // Top-level `var X = ...` in a script becomes a property of the context.
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var Chess = sandbox.Chess.rules, Ludo = sandbox.Ludo.rules, Snap = sandbox.Snap.rules, Table = sandbox.Table;

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
var round = Snap.deal([1, 2, 3], [10, 11, 12, 13], 2);
check('dealt from the first to turn, so the pile follows the deck', round[2][0] === 10 && round[0][0] === 11 && round[1][0] === 12 && round[2][1] === 13);
var pairs = 0, snaps = 0;
for (var d = 0; d < 200; d++) {
  var sd = Snap.deck(false);
  for (var c = 1; c < sd.length; c++) if (sd[c] === sd[c - 1]) pairs++;
  snaps += sd.length - 1;
}
check('snap comes round often: about one card in four', pairs / snaps > 0.25 && pairs / snaps < 0.4);
check('slower than before, slower still at level 1', Snap.pace(10) >= 1700 && Snap.pace(1) > Snap.pace(10));

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

// Silly games: every line in all five languages, no dashes, and nothing grown-up when a kid is playing.
var Laughs = sandbox.Laughs;
function lines(list) { var out = []; list.forEach(function (t) { if (typeof t[0] === 'string') out.push(t); else out.push(t[0], t[1]); }); return out; }
var all = lines(Laughs.LIKELY).concat(lines(Laughs.LIKELY_GROWN), lines(Laughs.RATHER), lines(Laughs.RATHER_GROWN), lines(Laughs.DARES), lines(Laughs.DARES_GROWN));
check('every silly line is in five languages', all.every(function (t) { return t.length === 5 && t.every(function (x) { return typeof x === 'string' && x.length > 1; }); }));
check('no dashes in the silly lines', all.every(function (t) { return t.join(' ').indexOf('\u2014') < 0; }));
check('lots of silly lines', Laughs.LIKELY.length >= 40 && Laughs.RATHER.length >= 25 && Laughs.DARES.length >= 30);
var withKid = Laughs.deck([{id: 'a'}, {id: 'k', kid: true}], Laughs.LIKELY, Laughs.LIKELY_GROWN);
check('a kid playing gets the family set only', withKid.length === Laughs.LIKELY.length && withKid.every(function (t) { return Laughs.LIKELY_GROWN.indexOf(t) < 0; }));
var grown = Laughs.deck([{id: 'a'}, {id: 'b'}], Laughs.DARES, Laughs.DARES_GROWN);
check('grown-ups get the extras too', grown.length === Laughs.DARES.length + Laughs.DARES_GROWN.length);
check('only guests counts as maybe kids', Laughs.deck([{id: 'g', guest: true}], Laughs.RATHER, Laughs.RATHER_GROWN).length === Laughs.RATHER.length);

// Chess: counting every move a few deep from known positions catches any rule that's wrong (castling, en passant,
// pins, checks). Pawns here always become queens, so these positions have no pawn about to reach the end.
function perft(st, d) {
  if (!d) return 1;
  var ms = Chess.legal(st), n = 0;
  for (var i = 0; i < ms.length; i++) { var u = Chess.make(st, ms[i]); n += perft(st, d - 1); Chess.unmake(st, ms[i], u); }
  return n;
}
check('chess: 20 first moves, 8,902 three deep', Chess.legal(Chess.newGame()).length === 20 && perft(Chess.newGame(), 3) === 8902);
var kiwi = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
check('chess: a busy middle game counts right', perft(Chess.fromFen(kiwi), 2) === 2039);
check('chess: an end game with en passant and pins counts right', perft(Chess.fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 3) === 2812);
var cs = Chess.fromFen(kiwi);
var unmoved = JSON.stringify(cs.b);
perft(cs, 2);
check('chess: trying moves puts the board back', JSON.stringify(cs.b) === unmoved && cs.turn === 'w' && cs.castle === 'KQkq');

function playAll(st, list) {
  list.forEach(function (w) {
    var m = Chess.legal(st).filter(function (x) { return Chess.name(x.from) + Chess.name(x.to) === w; })[0];
    if (!m) throw new Error('not legal: ' + w);
    Chess.play(st, m);
  });
  return st;
}
var fool = playAll(Chess.newGame(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
check('chess: fool\'s mate is checkmate', Chess.status(fool) === 'mate');
check('chess: a king with no move and no check is stalemate', Chess.status(Chess.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')) === 'stalemate');
check('chess: king against king is a draw', Chess.status(Chess.fromFen('8/8/4k3/8/8/3K4/8/8 w - - 0 1')) === 'material');
var rep = playAll(Chess.newGame(), ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
check('chess: the same position three times is a draw', Chess.status(rep) === 'repeat');
var fresh = playAll(Chess.newGame(), ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
check('chess: different positions are not a repeat', Chess.status(fresh) === '' && Object.keys(fresh.seen).length === 5);
var ep = playAll(Chess.newGame(), ['e2e4', 'a7a6', 'e4e5', 'd7d5']);
var epMove = Chess.legal(ep).filter(function (x) { return x.ep; })[0];
check('chess: en passant takes the pawn beside', epMove && Chess.name(epMove.to) === 'd6' && (Chess.play(ep, epMove), ep.b[Chess.sq('d5')] === ''));
var castle = Chess.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
check('chess: castling both ways', Chess.legal(castle).filter(function (x) { return x.castle; }).length === 2);
function castles(fen) { return Chess.legal(Chess.fromFen(fen)).filter(function (x) { return x.castle; }).map(function (x) { return x.castle; }).join(''); }
check('chess: no castling out of check', castles('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1') === '');
check('chess: no castling through check', castles('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1') === 'Q');
var queen = Chess.legal(Chess.fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1')).filter(function (x) { return x.promo; });
check('chess: a pawn at the end becomes a queen', queen.length === 1 && queen[0].promo === 'Q');

// Chess robots: the top level always takes a mate in one and a free queen; the bottom looks only one move ahead.
function noRandom() { return 0.99; }
var mateIn1 = Chess.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
var m1 = Chess.robotPick(mateIn1, 10, noRandom);
check('chess: the top robot finds mate in one', Chess.name(m1.from) + Chess.name(m1.to) === 'a1a8');
var freeQueen = Chess.fromFen('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1');
var fq = Chess.robotPick(freeQueen, 10, noRandom);
check('chess: the top robot takes a free queen', Chess.name(fq.to) === 'd5');
check('chess: robots look further as the level goes up', Chess.depthFor(1) === 1 && Chess.depthFor(4) === 2 && Chess.depthFor(9) === 3);
var slips = 0;
for (var sl = 0; sl < 40; sl++) {
  var rolls = sl % 2 ? [0.1, 0.9] : [0.99, 0];
  var pick = Chess.robotPick(Chess.fromFen('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1'), 1, function () { return rolls.shift(); });
  if (Chess.name(pick.to) !== 'd5') slips++;
}
check('chess: the bottom robot slips sometimes', slips > 0 && slips < 40);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
