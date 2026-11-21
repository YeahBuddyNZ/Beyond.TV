// Build it (web/builder.js) without a screen: every job in every language, the right machine for each job, and a
// whole road built from the remote's keys, start to finish.
// node tests/builder.test.js
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
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console, setTimeout: setTimeout
};
sandbox.window.I18N = sandbox.I18N;
vm.createContext(sandbox);
['sfx.js', 'builder.js', 'guides.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var R = sandbox.Builder.rules, Guides = sandbox.Guides;
var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function five(t) { return Array.isArray(t) && t.length === 5 && t.every(function (s) { return typeof s === 'string' && s.length > 0; }); }
function noDash(t) { return t.every(function (s) { return s.indexOf('—') < 0 && s.indexOf('–') < 0; }); }
function run(g, step, seconds) { for (var t = 0; t < seconds; t += 1 / 60) step(g, 1 / 60); }

// Words: every machine and job in five languages, no em dashes.
R.TOOL_IDS.forEach(function (id) {
  var tool = R.TOOLS[id];
  check(id + ' has a name and words in five languages', five(tool.name) && five(tool.does) && noDash(tool.does));
});
R.ROAD_STEPS.forEach(function (st) {
  check(st.id + ' has words in five languages', five(st.title) && five(st.why) && five(st.hint) && noDash(st.why) && noDash(st.title));
  check(st.id + ' needs a real machine', st.tool === null || R.TOOL_IDS.indexOf(st.tool) >= 0);
});
check('the road jobs are in the real order', R.ROAD_STEPS.map(function (s) { return s.id; }).join() === 'survey,clear,dig,drain,base,compact,seal,lines,open');
check('a How to play guide for the road', Guides.has('road') && Guides.order.indexOf('road') >= 0);

// Each job offers four different machines, one of them the right one.
var g = R.newRoad();
R.ROAD_STEPS.forEach(function (st, i) {
  if (!st.tool) return;
  g.step = i; R.offer(g);
  var unique = g.options.filter(function (o, j) { return g.options.indexOf(o) === j; });
  check(st.id + ' offers four machines', g.options.length === 4 && unique.length === 4);
  check(st.id + ' offers the right one', g.options.indexOf(st.tool) >= 0);
});

/** Picks a machine: wrongs first (to count them), then the right one. */
function pick(g, wrongs) {
  var right = R.ROAD_STEPS[g.step].tool;
  for (var i = 0; i < 4 && wrongs > 0; i++) {
    if (g.options[g.choice] !== right) { R.roadKey(g, OK); wrongs--; }
    R.roadKey(g, RIGHT);
  }
  while (g.options[g.choice] !== right) R.roadKey(g, RIGHT);
  R.roadKey(g, OK);
}

// A whole road from the remote.
g = R.newRoad(); R.offer(g);
check('starts on the first job, picking a machine', g.step === 0 && g.phase === 'pick');
R.roadKey(g, OK);
if (g.options[0] !== 'surveyor') check('a wrong machine is not taken', g.phase === 'pick' && g.picks === 1);
g = R.newRoad(); R.offer(g);
var safety = 0;
while (!g.done && safety++ < 5000) {
  var st = R.ROAD_STEPS[g.step];
  if (g.phase === 'pick') { pick(g, g.step === 1 ? 1 : 0); continue; }
  if (g.phase === 'done') { run(g, R.roadStep, 0.5); R.roadKey(g, OK); continue; }
  if (st.id === 'seal') {
    // Keep the paver in the green.
    while (g.phase === 'work') { if (g.speed < 70) R.roadKey(g, UP); else if (g.speed > 95) R.roadKey(g, DOWN); run(g, R.roadStep, 0.1); }
    continue;
  }
  if (st.id === 'lines') {
    while (g.phase === 'work') {
      for (var m = 0; m < g.marks.length; m++) if (!g.marks[m].painted && Math.abs(g.mx - 66 * 1.45 - g.marks[m].x) < 20) R.roadKey(g, OK);
      run(g, R.roadStep, 1 / 60);
    }
    continue;
  }
  if (st.id === 'open') { R.roadKey(g, OK); run(g, R.roadStep, 6); continue; }
  // Every stretch: press OK until it's done, then move right.
  for (var cell = 0; cell < 8 && g.phase === 'work'; cell++) {
    for (var k = 0; k < 4 && g.phase === 'work'; k++) R.roadKey(g, OK);
    R.roadKey(g, RIGHT);
    run(g, R.roadStep, 0.4);
  }
}
check('the road gets built', g.done && g.phase === 'finish');
check('every job is ticked', g.stars.length === R.ROAD_STEPS.length && g.stars.every(function (s) { return s >= 1 && s <= 3; }));
check('a wrong machine costs a star', g.stars[1] === 2);
check('good work gets full marks elsewhere', g.stars[0] === 3 && g.stars[6] === 3 && g.stars[7] === 3);
check('every stretch is sealed', g.cells.every(function (cl) { return cl.seal && cl.base === 2 && cl.rolled === 3 && !cl.thing && !cl.hump; }));
check('both streams have pipes', g.cells.filter(function (cl) { return cl.stream && cl.pipe; }).length === 2);
var saved = JSON.parse(store['btv.builder'] || '{}');
check('the best stays on the TV', saved.roads === 1 && saved.roadBest === g.total && g.total === 26);

// A pipe only goes where a stream crosses.
g = R.newRoad(); g.step = 3; g.phase = 'work'; g.at = 0;
R.roadKey(g, OK);
check('no pipe where there is no stream', !g.cells[0].pipe && g.msg);

// The paver going too fast leaves thin asphalt and fewer stars.
g = R.newRoad(); g.step = 6; g.phase = 'pick'; R.offer(g); pick(g, 0);
for (var u = 0; u < 8; u++) R.roadKey(g, UP);
while (g.phase === 'work') { if (g.speed < 190) R.roadKey(g, UP); run(g, R.roadStep, 0.1); }
check('a rushed seal gets one star', g.stars[6] === 1 && g.cells.some(function (cl) { return cl.sealQ === 1; }));

// Random presses never break it.
for (var trial = 0; trial < 20; trial++) {
  g = R.newRoad(); R.offer(g);
  var keys = [LEFT, RIGHT, UP, DOWN, OK, OK, OK];
  for (var n = 0; n < 4000; n++) { R.roadKey(g, keys[Math.floor(Math.random() * keys.length)]); R.roadStep(g, 1 / 30); }
  check('random presses keep it sane (' + trial + ')', g.step >= 0 && g.step < R.ROAD_STEPS.length && g.at >= 0 && g.at < 8 && !isNaN(g.x));
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
