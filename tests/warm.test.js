// Warm notes and the Who's watching order (web/warm.js, ADRs 0066 and 0072) without a screen. WarmNotes.java follows
// the same rules (tests/WarmNotesTest.java), and with the same dice says the same things.
// node tests/warm.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {Math: Math, Date: Date};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'warm.js'), 'utf8'), sandbox, {filename: 'warm.js'});
var W = sandbox.Warm;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

/** The same dice as WarmNotesTest.java, so the two can be compared. */
function dice(seed) {
  return function () {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed / 2147483648;
  };
}

var house = [
  {name: 'Dad'}, {name: 'Mum', parent: 'mum'},
  {name: 'Aroha', kid: true, stage: 'school'}, {name: 'Nikau', kid: true, stage: 'kindy'}, {name: 'Tama', kid: true}
];

// The order: Mum, then the other grown-ups, then the kids, visitors last.
var mixed = [{name: 'Aroha', kid: true}, {name: 'Dad'}, {name: 'Guest', visitor: true}, {name: 'Mum', parent: 'mum'}, {name: 'Nikau', kid: true}];
check('order', W.order(mixed).map(function (p) { return p.name; }).join() === 'Mum,Dad,Aroha,Nikau,Guest');
check('order keeps the rest as it was', W.order(house).map(function (p) { return p.name; }).join() === 'Mum,Dad,Aroha,Nikau,Tama');

// Fair: in every round of n notes, each person gets exactly one, and nobody twice in a row, even across rounds.
var mem = W.memory(), roll = dice(7), prev = -1, firsts = {}, lines = {}, texts = [];
for (var r = 0; r < 200; r++) {
  var seen = {};
  for (var s = 0; s < house.length; s++) {
    var note = W.next(house, mem, roll, 'en'), p = house[note.who];
    if (s === 0) firsts[p.name] = true;
    check('nobody twice in a row', note.who !== prev);
    prev = note.who;
    seen[note.who] = true;
    texts.push(note.text);
    check('names them', note.text.indexOf(p.name) >= 0);
    for (var k = 0; k < house.length; k++) {
      if (k !== note.who && house[k].kid) check('no other kid in ' + note.text, note.text.indexOf(house[k].name) < 0);
    }
    check('no em dash', note.text.indexOf(String.fromCharCode(0x2014)) < 0);
    check('nothing left to fill', note.text.indexOf('{') < 0);
    lines[p.name] = lines[p.name] || {};
    lines[p.name][note.text.replace(p.name, '*')] = true;
  }
  check('everyone once in round ' + r, Object.keys(seen).length === house.length);
}
check('a different person starts the rounds', Object.keys(firsts).length === house.length);
for (var t = 1; t < texts.length; t++) check('never the same line back to back', texts[t] !== texts[t - 1]);

check('school line for Aroha', lines.Aroha["You're doing amazing at school, *"]);
check('kindy line for Nikau', lines.Nikau['Keep up the good work at kindy, *']);
check('no school line without a stage', !lines.Tama["You're doing amazing at school, *"]);
check('no kindy line at school', !lines.Aroha['Keep up the good work at kindy, *']);
check('a grown-up loves them', lines.Tama['Mum loves you, *'] && lines.Tama['Dad loves you, *']);
['Aroha', 'Nikau', 'Tama'].forEach(function (n) {
  check(n + ' gets every kind line', lines[n]['Your family loves you heaps, *'] && lines[n]["We're so proud of you, *"]
    && lines[n]['A great big hug for you today, *'] && lines[n]['High five, *!']);
  check(n + ' never gets a grown-up line', !lines[n]["You're doing a great job, *"]);
});
check('grown-ups get thanks', lines.Mum['Thanks for all you do, *'] && lines.Mum["You're doing a great job, *"]);
check('Mum is the queen of the house', lines.Mum['Queen of the house: *'] && lines.Mum['Best mum in the world, *']);
check('only Mum gets the mum lines', !lines.Dad['Queen of the house: *']);
check('grown-ups never get school', !lines.Mum["You're doing amazing at school, *"]);

// Not the same line for the same person for a good while.
var mem2 = W.memory(), roll2 = dice(99), aroha = [];
for (var i = 0; i < 60; i++) {
  var n2 = W.next(house, mem2, roll2, 'en');
  if (n2.who === 2) aroha.push(n2.text);
}
var window12 = aroha.slice(0, 12);
check('twelve different lines in a row for Aroha', window12.filter(function (x, i) { return window12.indexOf(x) === i; }).length === 12);

// The memory carries over: a new visit doesn't start with the person the last one ended on.
var keep = W.memory(), r3 = dice(3);
for (var v = 0; v < 50; v++) {
  var last = W.next(house, keep, r3, 'en');
  var carried = JSON.parse(JSON.stringify(keep));
  var first = W.next(house, carried, r3, 'en');
  check('a new visit carries on', first.who !== last.who);
}

// Awards from Beyond Family: they come up, named, and with who gave them.
var awarded = [
  {name: 'Dad'}, {name: 'Mum'},
  {name: 'Aroha', kid: true, stage: 'school', awards: [{title: 'Reading star', from: 'Mum', note: 'So proud of all that reading'}]},
  {name: 'Nikau', kid: true, stage: 'kindy', awards: [{title: 'Kind helper'}]}
];
var mem4 = W.memory(), r4 = dice(11), got = {}, arohaNotes = 0, arohaAwards = 0;
for (var a = 0; a < 400; a++) {
  var n4 = W.next(awarded, mem4, r4, 'en');
  got[n4.text] = true;
  if (n4.who === 2) {
    arohaNotes++;
    if (n4.text.indexOf('Reading star') >= 0 || n4.text.indexOf('reading') >= 0) arohaAwards++;
  }
  check('award notes name their kid only', n4.who === 3 || n4.text.indexOf('Kind helper') < 0);
}
check('award line', got['You got the Reading star award, Aroha']);
check('award from Mum', got['Mum gave you the Reading star award, Aroha']);
check('award note', got['Aroha, from Mum: So proud of all that reading']);
check('award with nobody named', got['Kind helper! Well done, Nikau'] && !got['gave you the Kind helper award, Nikau']);
check('a fresh award comes up often', arohaAwards / arohaNotes > 0.35 && arohaAwards / arohaNotes < 0.8);
check('award in German', /Auszeichnung Reading star/.test(JSON.stringify((function () {
  var m = W.memory(), out = [];
  for (var i = 0; i < 80; i++) out.push(W.next(awarded, m, dice(5 + i), 'de').text);
  return out;
})())));

// The badge under a kid's name: their newest award, for a fortnight.
check('badge', W.badge({awards: [{title: 'Reading star', emoji: '📚', on: '2026-11-20'}]}, '2026-11-24') === '📚 Reading star');
check('badge without emoji', W.badge({awards: [{title: 'Kind helper', on: '2026-11-24'}]}, '2026-11-24') === '🏅 Kind helper');
check('old badge goes', W.badge({awards: [{title: 'Reading star', on: '2026-11-01'}]}, '2026-11-24') === '');
check('no awards, no badge', W.badge({name: 'Tama'}, '2026-11-24') === '');

check('nobody, no note', W.next([], W.memory(), Math.random, 'en') === null);
check('kids only still works', W.next([{name: 'Aroha', kid: true}], W.memory(), dice(1), 'en').text.indexOf('Aroha') >= 0);
check('one person, every time', W.next([{name: 'Mum'}], {bag: [], recent: [], last: 'Mum', tone: ''}, dice(1), 'en').who === 0);

// The same dice give the same notes as WarmNotes.java (tests/WarmNotesTest.java checks this string).
var twin = W.memory(), r5 = dice(2026), said = [];
for (var q = 0; q < 12; q++) said.push(W.next(awarded, twin, r5, 'en').text);
var TWIN = said.join(' / ');
if (process.argv[2] === '--twin') console.log(TWIN);
var javaTest = fs.readFileSync(path.join(__dirname, 'WarmNotesTest.java'), 'utf8');
check('the same as WarmNotes.java says', javaTest.indexOf(JSON.stringify(TWIN)) >= 0);

console.log(passed + ' passed' + (failed ? ', ' + failed + ' failed' : ''));
process.exit(failed ? 1 : 0);
