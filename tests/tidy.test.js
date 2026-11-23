// The tidy-up alarm's days and time away (web/tidy.js, ADR 0064). TidyDays.java follows the same rules
// (tests/TidyDaysTest.java). node tests/tidy.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {}, tr: function (pt, en) { return en; }, setInterval: function () {}, Math: Math, Date: Date, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'tidy.js'), 'utf8'), sandbox, {filename: 'tidy.js'});
var R = sandbox.Tidy.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
var mon = new Date(2026, 10, 23, 19, 15), sat = new Date(2026, 10, 28, 19, 15);

check('day is local', R.day(mon) === '2026-11-23');
check('older settings go off every day', R.goesOff({at: '19:15'}, sat));
check('weekdays: Monday yes', R.goesOff({at: '19:15', days: [1, 2, 3, 4, 5]}, mon));
check('weekdays: Saturday no', !R.goesOff({at: '19:15', days: [1, 2, 3, 4, 5]}, sat));
check('weekends: Saturday yes', R.goesOff({at: '19:15', days: [0, 6]}, sat));
check('away up to and including the day', !R.goesOff({at: '19:15', awayUntil: '2026-11-23'}, mon));
check('the day after away', R.goesOff({at: '19:15', awayUntil: '2026-11-22'}, mon));
check('five minutes to turn off', R.OFF_AFTER === 300000);

console.log('tidy: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
