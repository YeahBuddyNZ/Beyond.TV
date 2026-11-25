// Learn chess (web/chesscoach.js) and How to play (web/guides.js), without a screen:
// node tests/learn.test.js
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
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console, Infinity: Infinity
};
sandbox.window.I18N = sandbox.I18N;
vm.createContext(sandbox);
['sfx.js', 'table.js', 'chess.js', 'chesscoach.js', 'guides.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var R = sandbox.Chess.rules, Coach = sandbox.ChessCoach, Guides = sandbox.Guides;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

// Every lesson on the board can be passed with the moves the board allows.
function blacks(s) {
  var n = 0;
  for (var i = 0; i < 64; i++) if (s.b[i] && R.sideOf(s.b[i]) === 'b' && R.kindOf(s.b[i]) !== 'k') n++;
  return n;
}
/** Take every black piece in at most depth moves, White moving every time (as the lesson board does). */
function clears(s, depth) {
  if (!blacks(s)) return true;
  if (!depth) return false;
  var moves = R.legal(s);
  for (var i = 0; i < moves.length; i++) {
    var u = R.make(s, moves[i]);
    s.turn = 'w'; var ep = s.ep; s.ep = -1;
    var ok = clears(s, depth - 1);
    s.ep = ep; s.turn = 'b';
    R.unmake(s, moves[i], u);
    if (ok) return true;
  }
  return false;
}
Coach.lessons.forEach(function (l) {
  check(l.id + ' has words in all five languages', l.title.length === 5 && l.text.every(function (t) { return t.length === 5; }));
  if (!l.fen) return;
  var s = R.fromFen(l.fen);
  check(l.id + ' starts with White to move', s.turn === 'w');
  check(l.id + ' has a task in all five languages', l.task && l.task.length === 5);
  if (l.all) { check(l.id + ' can take every pawn', clears(s, 5)); return; }
  var moves = R.legal(s), right = 0, wrong = 0;
  moves.forEach(function (m) {
    var u = R.make(s, m);
    if (l.goal(m, s)) right++; else wrong++;
    R.unmake(s, m, u);
  });
  check(l.id + ' has a right answer', right > 0);
  check(l.id + ' has a wrong answer to learn from', wrong > 0);
});

// The stalemate lesson says stalemate when it is one.
var st = Coach.lessons.filter(function (l) { return l.id === 'stalemate'; })[0];
var s2 = R.fromFen(st.fen), qb6 = R.legal(s2).filter(function (m) { return m.p === 'Q' && R.name(m.to) === 'b6'; })[0];
R.make(s2, qb6);
check('queen b6 is stalemate', R.status(s2) === 'stalemate' && /Stalemate!/.test(st.wrong(qb6, s2)));

// The coach: a queen thrown away is a big mistake, with a better move; a free queen taken is great.
var s3 = R.fromFen('4k3/8/8/4p3/8/8/3Q4/4K3 w - - 0 1');
var blunder = R.legal(s3).filter(function (m) { return R.name(m.from) === 'd2' && R.name(m.to) === 'd4'; })[0];
var r3 = Coach.review(s3, blunder);
check('a queen left where a pawn takes it is a big mistake', r3.grade === 'oops' && !!r3.better && /can be taken/.test(r3.text) && /^Careful/.test(r3.text));
var s4 = R.fromFen('4k3/8/8/3q4/8/8/3Q4/4K3 w - - 0 1');
var grab = R.legal(s4).filter(function (m) { return R.name(m.to) === 'd5'; })[0];
var r4 = Coach.review(s4, grab);
check('taking a free queen is great', r4.grade === 'great' && /takes a queen, worth 9/.test(r4.text));
check('a missed checkmate is called out', /checkmate/.test(Coach.review(R.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'),
  R.legal(R.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1')).filter(function (m) { return R.name(m.to) === 'a2'; })[0]).text));
var h = Coach.hint(R.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'));
check('the hint finds checkmate', h && R.name(h.m.to) === 'a8' && /checkmate/.test(h.text));
check('the board knows what is in danger', Coach.danger(R.fromFen('4k3/8/8/3p4/4Q3/8/8/4K3 w - - 0 1'), 'w').length === 1);
var s5 = R.newGame(), e4 = R.legal(s5).filter(function (m) { return R.name(m.from) === 'e2' && R.name(m.to) === 'e4'; })[0];
check('e4 takes the middle', Coach.why(s5, e4).good.some(function (t) { return /middle/.test(t); }));
var nf3 = R.legal(s5).filter(function (m) { return R.name(m.from) === 'g1' && R.name(m.to) === 'f3'; })[0];
check('knight f3 brings a piece out', Coach.why(s5, nf3).good.some(function (t) { return /into the game/.test(t); }));
check('the coach leaves the board as it was', R.legal(s5).length === 20);

// How to play: every game has a guide, every line in all five languages, and none of them uses an em dash.
Guides.order.forEach(function (id) { check('a guide for ' + id, Guides.has(id)); });
var all = JSON.stringify(Guides.all) + JSON.stringify(Coach.lessons);
check('no em dashes', all.indexOf('—') < 0);
Object.keys(Guides.all).forEach(function (id) {
  var g = Guides.all[id];
  check(id + ' name in five languages', g.name.length === 5);
  g.pages.forEach(function (p, i) {
    check(id + ' page ' + i + ' title in five languages', p.title.length === 5);
    p.lines.forEach(function (line, j) { check(id + ' page ' + i + ' line ' + j + ' in five languages', line.length === 5 && line.every(function (t) { return t && t.length > 1; })); });
  });
});

// Every English line on the screens around them has its German and Russian in strings.js.
var strings = fs.readFileSync(path.join(__dirname, '..', 'web', 'strings.js'), 'utf8');
var german = strings.slice(strings.indexOf('var german'), strings.indexOf('var russian'));
var russian = strings.slice(strings.indexOf('var russian'));
['guides.js', 'chesscoach.js', 'chess.js'].forEach(function (f) {
  var src = fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8');
  var re = /(?:tr|Table\.say)\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g, m;
  while ((m = re.exec(src))) {
    var en = JSON.stringify(m[2].replace(/\\'/g, '\''));
    check(f + ': German for ' + en, german.indexOf(en + ':') >= 0);
    check(f + ': Russian for ' + en, russian.indexOf(en + ':') >= 0);
  }
});

// Kea the coach (ADR 0075): every game on the Games screen (web and Google TV) has a guide, or is a shelf of games
// with its own How to play inside.
var SHELVES = ['table', 'silly', 'arcade', 'guides'];
var gamesJs = fs.readFileSync(path.join(__dirname, '..', 'web', 'games.js'), 'utf8');
var gamesJava = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'nz', 'gobeyond', 'tv', 'GamesActivity.java'), 'utf8');
var tiles = [], tm, tre = /\[\s*'(\w+)', tr\(/g;
while ((tm = tre.exec(gamesJs))) tiles.push(tm[1]);
var jre = /\{"(\w+)", Ui\.tr\(/g;
while ((tm = jre.exec(gamesJava))) if (tiles.indexOf(tm[1]) < 0) tiles.push(tm[1]);
check('found the Games tiles', tiles.length >= 19);
tiles.forEach(function (id) { check('Kea has a guide for ' + id, SHELVES.indexOf(id) >= 0 || Guides.has(id)); });
var native = /NATIVE = [^(]*\(java\.util\.Arrays\.asList\(([^)]*)\)/.exec(gamesJava)[1].match(/"(\w+)"/g).map(function (q) { return q.slice(1, -1); });
native.forEach(function (id) { check('native ' + id + ' has a guide', Guides.has(id)); });
check('the dinner question uses the question guide', Guides.guideOf('dinner') === 'question');

// Every guide has tips for Kea, and today's tip changes with the day.
Object.keys(Guides.all).forEach(function (id) {
  check(id + ' has a tip', /^Kea's tip: ./.test(Guides.tip(id, 0)));
});
check('tips turn over', Guides.tip('ludo', 0) !== Guides.tip('ludo', 1));

// First time: Kea offers the guide and the game waits; Let's play starts it; after that it starts at once, with
// one tip a day.
var opened = [], toasts = [];
sandbox.UI.open = function (o) {
  var adds = [], api = {add: function (n, fn) { adds.push(fn); return n; }, close: function () { if (o.closed) o.closed(); }, rebuild: function () {}, focusNode: function () {}};
  o.build({}, api);
  opened.push({cls: o.cls, adds: adds, api: api});
  return api;
};
sandbox.UI.el = function () { return {style: {}}; };
sandbox.UI.heading = function () {};
sandbox.UI.button = function () { return {}; };
sandbox.UI.toast = function (t) { toasts.push(t); };
var played = 0;
Guides.coach('tidy', function () { played++; });
check('first time, Kea asks before the game', played === 0 && opened.length === 1 && /bt-coach/.test(opened[0].cls));
opened[0].adds[1]();
check("Let's play starts the game", played === 1 && Guides.met('tidy'));
Guides.coach('tidy', function () { played++; });
check('second time it starts at once', played === 2 && opened.length === 1);
check('a tip the first day back', toasts.length === 1 && /^Kea's tip: /.test(toasts[0]));
Guides.coach('tidy', function () { played++; });
check('only one tip a day', played === 3 && toasts.length === 1);
Guides.coach('dinner', function () { played++; });
opened[1].adds[0]();
check('Show me how opens the guide, then the game', opened.length === 3 && /bt-guide/.test(opened[2].cls) && played === 3);
opened[2].api.close();
check('the game starts after the guide', played === 4 && Guides.met('question'));
Guides.coach('table', function () { played++; });
check('a shelf of games starts at once', played === 5);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
