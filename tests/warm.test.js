// Warm notes and the Who's watching order (web/warm.js, ADR 0066) without a screen. WarmNotes.java follows the same
// rules (tests/WarmNotesTest.java).
// node tests/warm.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {Math: Math};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'warm.js'), 'utf8'), sandbox, {filename: 'warm.js'});
var W = sandbox.Warm;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

var house = [
  {name: 'Dad'}, {name: 'Mum', parent: 'mum'},
  {name: 'Aroha', kid: true, stage: 'school'}, {name: 'Nikau', kid: true, stage: 'kindy'}, {name: 'Tama', kid: true}
];

// The order: Mum, then the other grown-ups, then the kids, visitors last.
var mixed = [{name: 'Aroha', kid: true}, {name: 'Dad'}, {name: 'Guest', visitor: true}, {name: 'Mum', parent: 'mum'}, {name: 'Nikau', kid: true}];
check('order', W.order(mixed).map(function (p) { return p.name; }).join() === 'Mum,Dad,Aroha,Nikau,Guest');
check('order keeps the rest as it was', W.order(house).map(function (p) { return p.name; }).join() === 'Mum,Dad,Aroha,Nikau,Tama');

// Fair: in every run of n notes, each person gets exactly one.
for (var start = 0; start < 40; start += 5) {
  var seen = {};
  for (var s = start; s < start + house.length; s++) seen[W.next(house, s, 7, 'en').who] = true;
  check('everyone gets a turn from ' + start, Object.keys(seen).length === house.length);
}

// Every note names its person, never another kid, and every kid sees the same kind lines over time.
var kidLines = {};
for (var s2 = 0; s2 < 500; s2++) {
  var note = W.next(house, s2, Math.floor(s2 / 60), 'en'), p = house[note.who];
  check('names them ' + s2, note.text.indexOf(p.name) >= 0);
  for (var k = 0; k < house.length; k++) {
    if (k !== note.who && house[k].kid) check('no other kid in ' + note.text, note.text.indexOf(house[k].name) < 0);
  }
  check('no em dash', note.text.indexOf(String.fromCharCode(0x2014)) < 0);
  check('no {n} left', note.text.indexOf('{') < 0);
  if (p.kid) {
    kidLines[p.name] = kidLines[p.name] || {};
    kidLines[p.name][note.text.replace(p.name, '*')] = true;
  }
}
check('school line for Aroha', kidLines.Aroha["You're doing amazing at school, *"]);
check('kindy line for Nikau', kidLines.Nikau['Keep up the good work at kindy, *']);
check('no school line without a stage', !kidLines.Tama["You're doing amazing at school, *"]);
check('a grown-up loves them', kidLines.Tama['Mum loves you, *'] && kidLines.Tama['Dad loves you, *']);
['Aroha', 'Nikau', 'Tama'].forEach(function (n) {
  check(n + ' gets every kind line', kidLines[n]['Your family loves you heaps, *'] && kidLines[n]["We're so proud of you, *"]
    && kidLines[n]['A great big hug for you today, *']);
});

check('grown-ups get thanks', /Thanks for all you do, Mum|You're doing a great job, Mum|lucky to have you, Mum/.test(W.next(house, 1, 0, 'en').text));
check('nobody, no note', W.next([], 0, 0, 'en') === null);
check('kids only still works', W.next([{name: 'Aroha', kid: true}], 3, 1, 'en').text.indexOf('Aroha') >= 0);
check('German', W.next(house, 0, 0, 'de').text.indexOf('Dad') >= 0);

console.log(passed + ' passed' + (failed ? ', ' + failed + ' failed' : ''));
process.exit(failed ? 1 : 0);
