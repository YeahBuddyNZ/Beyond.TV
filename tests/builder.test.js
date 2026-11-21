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

// Build a bridge: every bridge can be built, the cheap answer is never the only test, and the words are all there.
R.SHAPES.forEach(function (sh) { check(sh.id + ' has a name and a fact in five languages', five(sh.name) && five(sh.fact) && noDash(sh.fact)); });
R.MATERIALS.forEach(function (m) { check(m.id + ' has a name in five languages', five(m.name)); });
var winners = [];
R.BRIDGES.forEach(function (b, i) {
  check(b.id + ' has a name in five languages', five(b.name));
  var wins = [];
  R.SHAPES.forEach(function (sh) { R.MATERIALS.forEach(function (m) { if (R.judge(i, sh.id, m.id).ok) wins.push(sh.id + '/' + m.id); }); });
  check(b.id + ' can be built (' + wins.join(', ') + ')', wins.length > 0);
  check(b.id + ' is not won by everything', wins.length < 8);
  winners.push(wins);
});
check('a plain wooden beam only crosses the creek', winners.filter(function (w) { return w.indexOf('beam/wood') >= 0; }).length === 1);
check('no legs where ships go', !R.judge(4, 'piers', 'steel').ok && R.judge(4, 'piers', 'steel').kind === 'ships');
check('wood cannot make a suspension road bridge', !R.judge(4, 'suspension', 'wood').ok);
check('the harbour needs a suspension bridge', winners[4].every(function (w) { return w.indexOf('suspension/') === 0; }));
check('concrete cannot hang from cables', R.judge(4, 'suspension', 'concrete').kind === 'pull');

// A bridge played from the keys: a wooden beam over the creek holds, the same over the river falls.
store = {};
g = R.newBridge();
check('starts on the list of bridges', g.phase === 'levels' && g.level === 0);
R.bridgeKey(g, RIGHT); R.bridgeKey(g, OK);
check('a locked bridge does not open', g.phase === 'levels' && g.msg);
R.bridgeKey(g, LEFT); R.bridgeKey(g, OK);
check('OK opens the creek', g.phase === 'plan' && g.level === 0);
R.bridgeKey(g, DOWN); R.bridgeKey(g, DOWN); R.bridgeKey(g, OK);
check('the test truck drives on', g.phase === 'test');
run(g, R.bridgeStep, 7);
check('a wooden beam holds over the creek', g.phase === 'result' && g.result.ok && g.stars[0] === 3);
R.bridgeKey(g, OK);
check('OK goes on to the river', g.phase === 'plan' && g.level === 1);
R.bridgeKey(g, DOWN); R.bridgeKey(g, DOWN); R.bridgeKey(g, OK);
run(g, R.bridgeStep, 7);
check('a wooden beam falls over the river', g.phase === 'result' && !g.result.ok && g.broke >= 0);
R.bridgeKey(g, OK);
check('OK tries again', g.phase === 'plan');
R.bridgeKey(g, RIGHT); R.bridgeKey(g, DOWN); R.bridgeKey(g, RIGHT); R.bridgeKey(g, DOWN); R.bridgeKey(g, OK);
run(g, R.bridgeStep, 7);
check('concrete on legs holds over the river, two stars for the second try', g.result.ok && g.stars[1] === 2);
check('Back goes up to the list', R.bridgeBack(g) === true && g.phase === 'levels');
check('Back from the list leaves the game', R.bridgeBack(g) === false);
saved = JSON.parse(store['btv.builder'] || '{}');
check('the stars stay on the TV', saved.bridgeStars && saved.bridgeStars[0] === 3 && saved.bridgeStars[1] === 2);
check('the bridge has a guide', Guides && Guides.has ? Guides.has('bridge') : true);

for (trial = 0; trial < 20; trial++) {
  g = R.newBridge();
  var bkeys = [LEFT, RIGHT, UP, DOWN, OK, OK];
  for (n = 0; n < 3000; n++) { R.bridgeKey(g, bkeys[Math.floor(Math.random() * bkeys.length)]); if (n % 97 === 0) R.bridgeBack(g); R.bridgeStep(g, 1 / 30); }
  check('random presses keep the bridge sane (' + trial + ')', g.level >= 0 && g.level < R.BRIDGES.length && g.shape >= 0 && g.shape < 5 && g.mat >= 0 && g.mat < 3);
}

// Plan a town: the words, then each town planned from the keys, the way a kid would, within its money.
R.NEED_IDS.forEach(function (id) { check(id + ' has a name and a moan in five languages', five(R.NEEDS[id].name) && five(R.NEEDS[id].sad) && noDash(R.NEEDS[id].sad)); });
Object.keys(R.BUILDINGS).forEach(function (id) { var b = R.BUILDINGS[id]; check(id + ' has a name and words in five languages', five(b.name) && five(b.gives) && noDash(b.gives)); });
R.TOWNS.forEach(function (t) { check(t.id + ' has a name in five languages', five(t.name)); });
check('every need has a building', R.NEED_IDS.every(function (id) { return Object.keys(R.BUILDINGS).some(function (b) { return R.BUILDINGS[b].need === id; }); }));
check('the ice cream shop is not a need', !R.BUILDINGS.icecream.need && !R.BUILDINGS.park.need);

function put(g, x, y, id) {
  g.cx = x; g.cy = y; R.townKey(g, OK);
  if (g.phase !== 'pick') return false;
  g.pick = g.opts.indexOf(id);
  if (g.pick < 0) { R.townKey(g, UP); return false; }
  R.townKey(g, OK); return true;
}
function plan(level, items) {
  store = {}; var sv = {townStars: []}; for (var i = 0; i < level; i++) sv.townStars.push(1); store['btv.builder'] = JSON.stringify(sv);
  var g = R.newTown();
  check('town ' + level + ' opens on its card', g.phase === 'brief' && g.level === level);
  R.townKey(g, OK);
  items.forEach(function (it) { put(g, it[0], it[1], it[2]); });
  return g;
}
function row(y, x0, x1, id) { var out = []; for (var x = x0; x <= x1; x++) out.push([x, y, id]); return out; }

// The village: a road, three houses, water, power away from the houses, a supermarket.
g = plan(0, [].concat(row(3, 1, 8, 'road'), [[1, 2, 'house'], [2, 2, 'house'], [1, 4, 'house'], [5, 4, 'water'], [6, 4, 'shop']]));
check('houses without power are not happy', g.moods[0] === 0 && g.people === 30 && g.phase === 'plan');
put(g, 3, 2, 'power');
check('power right next to a house makes it grumpy', g.phase === 'plan' && g.cells[2 * 12 + 2].problems.indexOf('smelly') >= 0);
g.cx = 3; g.cy = 2; R.townKey(g, OK);
check('OK on a building offers to knock it down', g.phase === 'pick' && g.opts[0] === 'knock');
var before = g.money; R.townKey(g, OK);
check('knocking down gives half back', g.money === before + 12 && !g.cells[2 * 12 + 3].b);
put(g, 7, 2, 'power');
check('the village is happy', g.phase === 'won' && g.moods[0] === 3 && g.stars[0] === 3);
run(g, R.townStep, 2); R.townKey(g, OK);
check('OK goes on to the next town', g.phase === 'brief' && g.level === 1);
saved = JSON.parse(store['btv.builder']);
check('the town stars stay on the TV', saved.townStars[0] === 3);

// A house away from the road has nobody in it.
g = plan(0, [[5, 5, 'house']]);
check('nobody lives where no road goes', g.people === 0 && g.msg);
// Ice cream first: it says it isn't a need.
g = plan(0, [].concat(row(3, 1, 3, 'road'), [[2, 4, 'icecream']]));
check('the ice cream shop says it is not a need', g.iced && g.msg && /need/.test(g.msg.text));
// Not enough money says so.
g = plan(0, row(3, 1, 11, 'road').concat([[1, 2, 'power'], [2, 2, 'power'], [3, 2, 'power'], [4, 2, 'power'], [5, 2, 'power']]));
check('it never spends money it does not have', g.money >= 0 && g.msg);

// The country town: six houses, and everything a town of 60 needs.
g = plan(1, [].concat(row(3, 1, 11, 'road'), row(2, 1, 3, 'house'), row(4, 1, 3, 'house'),
  [[5, 2, 'water'], [5, 4, 'shop'], [6, 2, 'shop'], [6, 4, 'school'], [7, 2, 'doctor'], [9, 2, 'power'], [9, 4, 'waste']]));
check('the country town is happy within its money (' + g.money + ' left)', g.phase === 'won' && g.people === 60);

// The busy town: ten houses, two of most things, the noisy ones well away, a fire station near every house.
var busy = [].concat(row(3, 1, 11, 'road'), [[6, 0, 'road'], [6, 1, 'road'], [6, 2, 'road'], [6, 4, 'road'], [6, 5, 'road'], [6, 6, 'road']],
  row(2, 1, 2, 'house'), [[3, 2, 'fire']], row(2, 4, 5, 'house'), row(4, 1, 5, 'house'), [[5, 1, 'house']],
  [[5, 0, 'water'], [7, 0, 'water'], [5, 5, 'shop'], [5, 6, 'shop'], [7, 1, 'shop'], [7, 2, 'school'], [7, 4, 'school'], [7, 5, 'doctor'], [7, 6, 'doctor']],
  [[8, 2, 'power'], [9, 2, 'power'], [10, 2, 'waste'], [11, 2, 'waste'], [8, 4, 'jobs'], [9, 4, 'jobs']]);
g = plan(2, busy);
check('the busy town is happy within its money (' + g.money + ' left, ' + g.people + ' people, moods ' + g.moods + ')', g.phase === 'won' && g.people === 100);
check('the busy town can earn three stars', g.stars[2] === 3);

// Back: the builder's list closes, a finished town goes back to the towns, and on the land Back is the pause menu.
g = plan(0, []);
g.cx = 2; g.cy = 3; R.townKey(g, OK);
check('Back closes the list', g.phase === 'pick' && R.townBack(g) && g.phase === 'plan');
check('Back on the land pauses', R.townBack(g) === false);
check('the town has a guide', Guides.has('town'));

for (trial = 0; trial < 20; trial++) {
  g = R.newTown();
  var tkeys = [LEFT, RIGHT, UP, DOWN, OK, OK, OK];
  for (n = 0; n < 3000; n++) { R.townKey(g, tkeys[Math.floor(Math.random() * tkeys.length)]); if (n % 151 === 0) R.townBack(g); R.townStep(g, 1 / 30); }
  check('random presses keep the town sane (' + trial + ')', g.money >= 0 && g.cx >= 0 && g.cx < 12 && g.cy >= 0 && g.cy < 7 && g.cells[36].b === 'road');
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
