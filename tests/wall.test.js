// The family wall and to-dos (web/wall.js, ADR 0067) without a screen: who a profile is in Beyond Family, stickies
// before wins, a person's to-dos left, a tick that gives a star and a scoreboard point and an untick that takes them
// back, the words in five languages with no dashes, and the home screen's line.
// node tests/wall.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var people = [{id: 'bf-m1', family: 'm1', name: 'Aroha', kid: true, colour: '#D85A30'}, {id: 'bf-m2', family: 'm2', name: 'Mum', colour: '#2F7D6D'},
  {id: 'p9', name: 'Guest'}, {id: 'together', together: true, name: 'Family'}];
var todos = {m1: [{id: 't1', title: 'Feed the cat', done: false, points: 5}, {id: 't2', title: 'Make my bed', done: true, points: 5}]};
var wall = {stickies: [{id: 's1', text: 'Tea at 6 (Mum)', colour: 'moss'}], wins: [{id: 'job-1', kind: 'job', text: 'Fed the cat', name: 'Aroha', date: '2026-11-24'}]};
var ticks = [], stickies = [];
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  I18N: {lang: 'en'},
  tr: function (pt, en) { return en; },
  TV: {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 461}},
  UI: {toast: function () {}}, Math: Math, Date: Date, JSON: JSON, console: console, setTimeout: setTimeout,
  Profiles: {list: function () { return people.slice(); }, current: function () { return people[0]; }},
  Family: {
    linked: function () { return true; }, wall: function () { return wall; }, todos: function () { return todos; },
    tickTodo: function (id, m, on, done) { ticks.push([id, m, on]); done(true); },
    postSticky: function (t, c, m, done) { stickies.push([t, c, m]); done(true); }
  }
};
sandbox.window.I18N = sandbox.I18N;
sandbox.window.Profiles = sandbox.Profiles;
sandbox.window.Family = sandbox.Family;
vm.createContext(sandbox);
['scores.js', 'chores.js', 'wall.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
['Scores', 'Chores', 'Wall'].forEach(function (k) { sandbox.window[k] = sandbox[k]; });
var Wall = sandbox.Wall, W = Wall.rules, Chores = sandbox.Chores, Scores = sandbox.Scores;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function five(t) { return Array.isArray(t) && t.length === 5 && t.every(function (s) { return typeof s === 'string' && s.length > 1; }); }

check('every line in five languages', W.words().every(five));
check('no dashes anywhere', W.words().every(function (t) { return t.every(function (s) { return s.indexOf('\u2014') < 0 && s.indexOf('\u2013') < 0; }); }));

check('a Beyond Family profile is its member', W.member(people[0]) === 'm1');
check('an id from Google TV is a member too', W.member({id: 'bf-abc'}) === 'abc');
check('a TV-only profile is nobody in Beyond Family', W.member(people[2]) === null);
check('Family is nobody', W.member(people[3]) === null);

var items = W.items();
check('stickies come before wins', items.length === 2 && items[0].sticky && items[1].win);
check('count is everything on the wall', Wall.count() === 2);

var l = Wall.left(people[0]);
check('one of two to go for Aroha', l.left === 1 && l.total === 2);
check('Mum has none', Wall.left(people[1]).total === 0);
var row = Wall.homeRow(people[0]);
check('the home line says what is left', row && row[1].indexOf('1 to go') === 0);
check('without to-dos, the home line is the newest sticky', Wall.homeRow(people[1])[1] === 'Tea at 6 (Mum)');

// Stars: the same wallet as Daily chores, so the Star Stall spends them.
var before = Chores.stars('bf-m1');
check('a tick gives a star', Chores.give(people[0], 1) === before + 1 && Chores.stars('bf-m1') === before + 1);
check('and a point on the scoreboard', Scores.rules.load().log.some(function (e) { return e.p === 'bf-m1' && e.g === 'chores' && e.n === 1; }));
check('an untick takes it back', Chores.give(people[0], -1) === before);
check('never below no stars', Chores.give(people[0], -5) === 0);
check('Family never gets stars', Chores.give(people[3], 1) === 0);

// Family HQ on the TV (ADR 0079): the same cards and weeks as Beyond Family's /family/hq.
check('HQ cards in the HQ page\'s default order', W.layout.map(function (w) { return w.key; }).join() === 'activities,todo,calendar,wishlist,menu,broken,notes');
check('weeks start on Monday', W.mondayOf('2026-11-26') === '2026-11-23' && W.mondayOf('2026-11-23') === '2026-11-23' && W.mondayOf('2026-11-29') === '2026-11-23');
check('days roll over months', W.addDays('2026-10-26', 41) === '2026-12-06' && W.addDays('2026-12-31', 1) === '2027-01-01');
check('a colour, see-through', W.tint('#2F7D6D', 0.12) === 'rgba(47, 125, 109, 0.12)' && W.tint(null, 0.1) === 'rgba(34, 34, 31, 0.1)');

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
