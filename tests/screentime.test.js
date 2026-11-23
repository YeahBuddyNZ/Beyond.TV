// Screen time (web/screentime.js, ADR 0060) without a screen: the day's record, what a stretch away counts and
// the minutes left. ScreenTime.java follows the same rules (tests/ScreenTimeTest.java).
// node tests/screentime.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {localStorage: {getItem: function () { return null; }, setItem: function () {}}},
  tr: function (pt, en) { return en; }, setInterval: function () {}, Math: Math, Date: Date, JSON: JSON, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'screentime.js'), 'utf8'), sandbox, {filename: 'screentime.js'});
var R = sandbox.ScreenTime.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
var H = 3600000, M = 60000;
var evening = new Date(2026, 10, 23, 18, 0, 0).getTime();

check('choices start with no limit', R.CHOICES[0] === 0 && R.CHOICES.indexOf(60) > 0);
check('labels', R.label(0) === 'no limit' && R.label(30) === '30 min' && R.label(60) === '1 h' && R.label(90) === '1 h 30 min');
check('day is local', R.day(evening) === '2026-11-23');

check('an hour away counts an hour', R.counted(evening - H, evening) === H);
check('nothing for no stretch', R.counted(0, evening) === 0 && R.counted(evening, evening) === 0);
check('a long stretch counts 3 hours at most', R.counted(evening - 5 * H, evening) === 3 * H);
check('hours away (TV off) counts nothing', R.counted(evening - 7 * H, evening) === 0);
var justAfter = new Date(2026, 10, 24, 0, 20, 0).getTime();
check('only today counts after midnight', R.counted(justAfter - H, justAfter) === 20 * M);

var s = R.fresh({limits: {p3: 60}}, evening);
check('a fresh day keeps the limits', s.limits.p3 === 60 && s.day === '2026-11-23');
check('no limit is endless', R.minutesLeft(s, 'p4') === Infinity);
check('a full hour left', R.minutesLeft(s, 'p3') === 60);
s.used.p3 = 45 * M + 10000;
check('rounds up what is left', R.minutesLeft(s, 'p3') === 15);
s.used.p3 = 2 * H;
check('never below zero', R.minutesLeft(s, 'p3') === 0);
s.extra.p3 = 15;
check("a grown-up's extra minutes", R.minutesLeft(s, 'p3') === 0);
s.used.p3 = 60 * M;
check('extra on top of the limit', R.minutesLeft(s, 'p3') === 15);
var tomorrow = R.fresh(s, evening + 24 * H);
check('a new day starts fresh', tomorrow.day === '2026-11-24' && !tomorrow.used.p3 && !tomorrow.extra.p3 && tomorrow.limits.p3 === 60);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
