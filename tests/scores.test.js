// The family scoreboard (web/scores.js), Daily chores (web/chores.js) and Candy Land's Star Stall without a screen:
// weeks run Monday to Sunday, every person who scored gets an award, chores give and take back stars and points,
// the daily challenge pays once, the tidy-up race ticks Tidy my room, and stars are only spent once.
// node tests/scores.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var kids = [{id: 'k1', name: 'Aroha', kid: true, colour: '#D85A30'}, {id: 'k2', name: 'Nikau', kid: true, colour: '#378ADD'},
  {id: 'g1', name: 'Mum', colour: '#2F7D6D'}, {id: 'together', together: true, name: 'Family'}];
var watching = {id: 'together', together: true};
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  I18N: {lang: 'en'},
  tr: function (pt, en) { return en; },
  TV: {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 461}},
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console, setTimeout: setTimeout,
  Profiles: {list: function () { return kids.slice(); }, current: function () { return watching; }}
};
sandbox.window.I18N = sandbox.I18N;
sandbox.window.Profiles = sandbox.Profiles;
vm.createContext(sandbox);
['sfx.js', 'scores.js', 'chores.js', 'candy.js', 'guides.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
['Scores', 'Chores', 'Candy'].forEach(function (k) { sandbox.window[k] = sandbox[k]; });
var Scores = sandbox.Scores, S = Scores.rules, Chores = sandbox.Chores, C = Chores.rules, R = sandbox.Candy.rules, Guides = sandbox.Guides;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function five(t) { return Array.isArray(t) && t.length === 5 && t.every(function (s) { return typeof s === 'string' && s.length > 1; }); }
function noDash(t) { return t.every(function (s) { return s.indexOf('\u2014') < 0 && s.indexOf('\u2013') < 0; }); }
function at(y, m, d, h) { return new Date(y, m - 1, d, h || 12).getTime(); }

// Words: all five languages, no dashes, and How to play guides for both.
S.words().forEach(function (w, i) { check('scoreboard word ' + i + ' in five languages', five(w) && noDash(w)); });
C.words().forEach(function (w, i) { check('chores word ' + i + ' in five languages', five(w) && noDash(w)); });
Object.keys(S.GAMES).forEach(function (g) { check(g + ' has a name and an award', five(S.GAMES[g].name) && five(S.GAMES[g].award) && noDash(S.GAMES[g].award)); });
C.LIST.forEach(function (c) { check(c.id + ' chore in five languages', five(c.name) && noDash(c.name)); });
C.LIST.forEach(function (c) { check(c.id + ' chore has a picture', fs.existsSync(path.join(__dirname, '..', 'web', 'games', 'chore-' + c.id + '.jpg'))); });
R.WARES.forEach(function (w) { check(w.id + ' ware in five languages', five(w.name) && five(w.about) && five(w.got) && noDash(w.got)); });
['chores', 'scores'].forEach(function (id) {
  check('a How to play guide for ' + id, Guides.has(id) && Guides.order.indexOf(id) >= 0);
  check(id + ' has a Games picture', fs.existsSync(path.join(__dirname, '..', 'web', 'games', id + '.jpg')));
});

// Weeks: Monday to Sunday on the TV's clock.
check('a Monday starts its own week', S.weekOf(at(2026, 11, 23)) === '2026-11-23');
check('Sunday night is still that week', S.weekOf(at(2026, 11, 29, 23)) === '2026-11-23');
check('the next Monday is a new week', S.weekOf(at(2026, 11, 30, 0)) === '2026-11-30');
check('the week before', S.weekBefore('2026-11-23') === '2026-11-16' && S.weekBefore('2026-01-05') === '2025-12-29');
check('seven days left on a Monday, one on a Sunday', S.daysLeft(at(2026, 11, 23)) === 7 && S.daysLeft(at(2026, 11, 29)) === 1);

// Tally and awards: most first, everyone's own best thing, the champion (joint when level).
var log = [
  {p: 'k1', name: 'Aroha', g: 'arcade', n: 3, t: at(2026, 11, 23)},
  {p: 'k1', name: 'Aroha', g: 'chores', n: 1, t: at(2026, 11, 24)},
  {p: 'k2', name: 'Nikau', g: 'road', n: 2, t: at(2026, 11, 24)},
  {p: 'k2', name: 'Nikau', g: 'town', n: 2, t: at(2026, 11, 25)},
  {p: 'g1', name: 'Mum', g: 'ludo', n: 1, t: at(2026, 11, 25)},
  {p: 'k1', name: 'Aroha', g: 'arcade', n: 9, t: at(2026, 11, 16)},
  {p: 'k2', name: 'Nikau', g: 'chores', n: -1, t: at(2026, 11, 26)}];
var rows = S.tally(log, '2026-11-23');
check('three people scored this week', rows.length === 3);
check('level on points, whoever got there first leads', rows[0].p === 'k1' && rows[0].total === 4 && rows[1].p === 'k2' && rows[1].total === 3);
check('an untick takes a point back', rows[1].games.chores === -1);
check('Build it counts as one', rows[1].games.build === 4);
check('board games count as one', rows[2].games.table === 1);
var aw = S.awards(rows);
check('everyone gets an award', aw.length === 3 && aw.every(function (a) { return five(a.award); }));
check('each award is their best thing', aw[0].best === 'arcade' && aw[1].best === 'build' && aw[2].best === 'table');
check('one champion', aw.filter(function (a) { return a.champion; }).length === 1 && aw[0].champion);
var tie = S.awards(S.tally([{p: 'a', g: 'tidy', n: 3, t: at(2026, 11, 23)}, {p: 'b', g: 'tidy', n: 3, t: at(2026, 11, 24)}], '2026-11-23'));
check('level at the top: joint champions', tie.length === 2 && tie[0].champion && tie[1].champion);
check('last week is its own', S.tally(log, '2026-11-16').length === 1);
check('nobody scores for nothing', S.tally([{p: 'a', g: 'chores', n: 1, t: at(2026, 11, 23)}, {p: 'a', g: 'chores', n: -1, t: at(2026, 11, 23)}], '2026-11-23').length === 0);

// add: Family, guests, robots and visitors score nothing; people do.
check('Family scores nothing', !Scores.add({id: 'together', together: true}, 'arcade', 3));
check('a guest scores nothing', !Scores.add({id: 'x', guest: true}, 'arcade', 3));
check('a robot scores nothing', !Scores.add({id: 'r', robot: true}, 'table', 3));
check('a person scores', Scores.add(kids[0], 'arcade', 3) && S.load().log.length === 1);
// A game for one on the Family profile: nobody until someone is picked.
check('a game for one on Family needs a player', !Scores.solo('arcade', 1));
Scores.setPlayer(kids[1]);
check('the picked player gets the points', Scores.solo('candy', 1) && Scores.who().id === 'k2');
Scores.setPlayer(null);
watching = kids[0];
check('watching as yourself, you get the points', Scores.solo('arcade', 1) && Scores.who().id === 'k1');
watching = {id: 'together', together: true};
// Old points fall off after ten weeks.
store = {};
Scores.add(kids[0], 'arcade', 1, at(2026, 1, 5));
Scores.add(kids[0], 'arcade', 1, at(2026, 11, 23));
check('ten weeks are kept', S.load().log.length === 1);

// Chores: a star and a point a tick, the challenge pays two more once, an untick takes it back.
store = {};
var day = at(2026, 11, 23, 8), s = C.load(day);
check('five chores to start', s.on.length === 5 && s.on.join() === C.DEFAULT.join());
var r1 = C.toggle(s, kids[0], 'bed', day);
check('a tick is a star', r1.ticked && r1.stars === 1 && !r1.bonus);
['dressed', 'teeth', 'room'].forEach(function (id) { C.toggle(s, kids[0], id, day); });
var r2 = C.toggle(s, kids[0], 'clothes', day);
check('all of today is the challenge: two more', r2.bonus && r2.stars === 7 && C.allDone(s, 'k1'));
var r3 = C.toggle(s, kids[0], 'clothes', day);
check('untick takes the star and the challenge back', !r3.ticked && r3.stars === 4 && !s.bonus.k1);
var r4 = C.toggle(s, kids[0], 'clothes', day);
check('tick it again: the challenge pays again, once', r4.bonus && r4.stars === 7);
C.store(s);
var pts = S.tally(S.load().log, S.weekOf(day));
check('chore points reach the scoreboard and match the stars', pts.length === 1 && pts[0].total === 7 && pts[0].games.chores === 7);
check('stars never go below none', (function () { var t = C.load(day); t.stars.k2 = 0; t.done.k2 = ['bed']; return C.toggle(t, kids[1], 'bed', day).stars === 0; })());
var next = C.load(at(2026, 11, 24, 8));
check('a new day: fresh ticks, stars kept', !next.done.k1 && next.stars.k1 === 7);
// The tidy-up race ticks Tidy my room, once.
store = {};
Scores.add(kids[1], 'tidy', 3, at(2026, 11, 23, 19));
var t1 = C.load(at(2026, 11, 23, 19));
check('the tidy-up race ticks Tidy my room', C.fromTidy(t1, kids) && t1.done.k2.indexOf('room') >= 0 && t1.stars.k2 === 1);
C.toggle(t1, kids[1], 'room', at(2026, 11, 23, 19));
check('only once, even after an untick', !C.fromTidy(t1, kids) && t1.done.k2.indexOf('room') < 0);
// Spending.
store = {};
var w = C.load(day); w.stars.k1 = 3; C.store(w);
check('spend what you have', Chores.spend('k1', 2) && Chores.stars('k1') === 1);
check('not more than you have', !Chores.spend('k1', 2) && Chores.stars('k1') === 1);

// The Star Stall in Candy Land: seven places, opens straight from Daily chores, buys once.
check('seven places, the stall last', R.PLACES.length === 7 && R.PLACES[6].id === 'stall');
store = {};
w = C.load(Date.now()); w.stars.k1 = 9; C.store(w);
Scores.setPlayer(kids[0]);
R.begin('stall');
check('Spend in Candy Land opens the stall', R.state().scene === 'stall' && R.state().here === 6);
var sp = R.state().save.sparkles;
R.press(13); // the sparkle shower, 1 star
check('a sparkle shower: 10 sparkles for a star', R.state().save.sparkles === sp + 10 && Chores.stars('k1') === 8);
R.press(39); R.press(13); // magic rain with nothing planted
check('magic rain waits for a plant, free', Chores.stars('k1') === 8);
R.press(39); R.press(13); // the star crown, 4
check('the star crown is bought and worn', R.state().save.starCrown === 1 && Chores.stars('k1') === 4 && R.state().save.look.head === R.PARTS[5].options.length - 1);
R.press(13);
check('bought once: OK again only wears it', Chores.stars('k1') === 4);
R.press(39); R.press(13); // star wings, 4
check('star wings are bought', R.state().save.starWings === 1 && Chores.stars('k1') === 0);
R.press(39); R.press(13);
check('no stars: nothing bought, nothing lost', Chores.stars('k1') === 0 && R.state().save.sparkles >= sp + 10);
check('Back from the stall goes to the map', R.back() === true && (R.state().scene === 'map' || R.state().scene === 'friend'));
// Without a player, the stall asks whose stars.
Scores.setPlayer(null);
R.begin('stall');
check('on Family the stall lets you pick whose stars', R.state().stall.pick && R.state().stall.who.length === 2);
R.press(38); R.press(39);
check('▲ then ▶ picks the next kid', R.state().stall.at === 1 && R.state().stall.row === 0);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
