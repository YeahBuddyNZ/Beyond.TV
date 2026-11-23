// Karaoke's Take turns (web/karaoke.js, ADR 0059) without a screen: the fair order, adding, taking a turn,
// taking one out and the list going stale. KaraokeTurns.java follows the same rules (tests/KaraokeTurnsTest.java).
// node tests/karaoke.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var now = 1700000000000;
var FakeDate = function () { return new Date(now); };
FakeDate.now = function () { return now; };
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  tr: function (pt, en) { return en; }, UI: {}, Math: Math, Date: FakeDate, JSON: JSON, console: console
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'karaoke.js'), 'utf8'), sandbox, {filename: 'karaoke.js'});
var T = sandbox.Karaoke.turns;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function r(name, title) { return {name: name, title: title}; }
function names(list) { return list.map(function (x) { return (x.name || '*') + ':' + x.title; }).join(' '); }

// The order on its own
check('empty list has no next', T.nextIndex([], {}) === -1);
var asked = [r('Aroha', 'Royals'), r('Aroha', 'Happy'), r('Aroha', 'Poi E'), r('Nikau', 'Let It Go'), r('Mum', 'Dancing Queen')];
check('nobody sings twice until everyone has', names(T.order(asked, {})) ===
  'Aroha:Royals Nikau:Let It Go Mum:Dancing Queen Aroha:Happy Aroha:Poi E');
check('whoever has sung least goes first', names(T.order(asked, {aroha: 2, nikau: 1})) ===
  'Mum:Dancing Queen Nikau:Let It Go Aroha:Royals Aroha:Happy Aroha:Poi E');
check('ties go to whoever asked first', T.nextIndex([r('Nikau', 'A'), r('Mum', 'B')], {nikau: 1, mum: 1}) === 0);
check('names match whatever the case', names(T.order([r('aroha', 'A'), r('Aroha', 'B'), r('Nikau', 'C')], {})) === 'aroha:A Nikau:C Aroha:B');
check('everyone together is a singer of its own', names(T.order([r('', 'Sing-along'), r('', 'Another'), r('Dad', 'Royals')], {})) ===
  '*:Sing-along Dad:Royals *:Another');

// Adding, taking turns, taking one out
check('first one asked is up next', T.add(r('Aroha', 'Royals')) === 1);
check('a second song by the same singer waits', T.add(r('Aroha', 'Happy')) === 2);
check('somebody new goes ahead of a second song', T.add(r('Nikau', 'Let It Go')) === 2);
check('list in order', names(T.list()) === 'Aroha:Royals Nikau:Let It Go Aroha:Happy');
var first = T.take();
check('take gives the next turn', first && first.title === 'Royals');
check('a latecomer goes ahead of a second go', T.add(r('Mum', 'Dancing Queen')) === 2 && names(T.list()) === 'Nikau:Let It Go Mum:Dancing Queen Aroha:Happy');
T.drop(1);
check('drop takes out the one picked', names(T.list()) === 'Nikau:Let It Go Aroha:Happy');
T.take();
T.take();
check('empty once everyone has sung', T.take() === null && T.list().length === 0);
check('Aroha has sung once already, so a newcomer goes first', T.add(r('Aroha', 'Poi E')) === 1 && T.add(r('Dad', 'Royals')) === 1);

// A stale list starts fresh
now += 9 * 3600000;
check('8 hours later the list is fresh', T.list().length === 0 && T.add(r('Aroha', 'Royals')) === 1);
T.clear();
check('clear empties it', T.list().length === 0);
for (var i = 0; i < T.MOST; i++) T.add(r('P' + (i % 5), 'Song ' + i));
check('a full list says so', T.add(r('Late', 'One more')) === 0);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
