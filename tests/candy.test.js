// London's Candy Land (web/candy.js) without a screen: the words, the friends, every place played with random presses
// for a long while (and drawn on a stand-in canvas), and the kind rules: sparkles only ever go up, nothing is lost.
// node tests/candy.test.js
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
['sfx.js', 'candy.js', 'guides.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', f), 'utf8'), sandbox, {filename: f});
});
var R = sandbox.Candy.rules, Guides = sandbox.Guides;
var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function five(t) { return Array.isArray(t) && t.length === 5 && t.every(function (s) { return typeof s === 'string' && s.length > 0; }); }
function noDash(t) { return t.every(function (s) { return s.indexOf('—') < 0 && s.indexOf('–') < 0; }); }

// A canvas that draws nothing but notices a bad number (NaN or Infinity reaching a drawing call).
var bad = 0;
var ctx = new Proxy({}, {
  get: function (o, k) {
    if (k in o) return o[k];
    if (k === 'measureText') return function (s) { return {width: String(s).length * 12}; };
    if (k === 'createLinearGradient') return function () { return {addColorStop: function () {}}; };
    return function () { for (var i = 0; i < arguments.length; i++) if (typeof arguments[i] === 'number' && !isFinite(arguments[i])) bad++; };
  },
  set: function (o, k, v) { o[k] = v; return true; }
});
R.useContext(ctx);

// Words: every line in all five languages, no dashes.
R.words().forEach(function (w, i) { check('word ' + i + ' in five languages', five(w) && noDash(w)); });
[R.PLACES, R.TREATS, R.TOPPINGS, R.ICINGS, R.PLANTS].forEach(function (list) {
  list.forEach(function (x) { check((x.id || x.colour) + ' has a name in five languages', five(x.name) && noDash(x.name)); });
});
R.PLACES.forEach(function (p) { check(p.id + ' says what it is', five(p.about) && noDash(p.about)); });
[R.CHEERS, R.KIND, R.HELLO, R.EXACTLY, R.LOOKS_GOOD].forEach(function (list) {
  list.forEach(function (t) { check('"' + t[1] + '" in five languages', five(t) && noDash(t)); });
});
R.HELLO.forEach(function (t) { check('hello has a place for the name', t.every(function (s) { return s.indexOf('{n}') >= 0; })); });
R.PARTS.forEach(function (p) {
  check(p.id + ' row has a name', five(p.name));
  if (p.options) p.options.forEach(function (o) { check(p.id + ' option in five languages', five(o) && noDash(o)); });
});
R.FRIENDS.forEach(function (f) { check(f.id + ' is a kind of friend in five languages', five(f.kind)); });
check('a How to play guide', Guides.has('candy') && Guides.order.indexOf('candy') >= 0);
check('seven places', R.PLACES.length === 7);

// Friends: one at the start, then more as the sparkles grow, never fewer.
check('one friend to start', R.friendsFor(0) === 1);
var prev = 0, more = true;
for (var n = 0; n < 600; n += 5) { var f = R.friendsFor(n); if (f < prev) more = false; prev = f; }
check('friends only ever come', more && R.friendsFor(10000) === R.FRIENDS.length);

// Play: every place with random presses for a good while; sparkles never go down, and every press comes back to the map.
R.begin();
var seed = 3;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
var keys = [LEFT, RIGHT, UP, DOWN, OK, OK];
var places = ['bakery', 'garden', 'shop', 'catch', 'ride', 'dress'];
var lowest = R.state().save.sparkles, down = false, crashed = null;
try {
  for (var round = 0; round < 3; round++) {
    places.forEach(function (id, at) {
      // Walk to the place along the map, then go in.
      var st = R.state();
      if (st.scene === 'friend') R.press(OK);
      for (var guard = 0; guard < 20 && R.state().here !== at; guard++) {
        R.press(R.state().here < at ? RIGHT : LEFT);
        for (var w = 0; w < 50; w++) R.step(1 / 60);
        // The nearest place that way may not be the next one: the map still gets there.
        if (R.state().here === at) break;
        if (guard > 8) { R.press(R.state().here < at ? DOWN : UP); for (w = 0; w < 50; w++) R.step(1 / 60); }
      }
      R.press(OK);
      check('went into ' + id + ' (round ' + round + ')', R.state().scene === id || R.state().here !== at);
      for (var i = 0; i < 60 * 50; i++) {
        if (i % 9 === 0) R.press(keys[Math.floor(rnd() * keys.length)]);
        R.step(1 / 60);
        if (i % 20 === 0) R.render();
        var s = R.state().save.sparkles;
        if (s < lowest) down = true;
        lowest = s;
      }
      check('Back from ' + id + ' goes to the map', R.back() === true && (R.state().scene === 'map' || R.state().scene === 'friend'));
      R.render();
    });
  }
} catch (e) { crashed = e; }
check('nothing broke while playing' + (crashed ? ': ' + crashed.stack : ''), !crashed);
check('sparkles only ever go up', !down);
check('sparkles were earned', R.state().save.sparkles > 50);
check('nothing drawn with a bad number', bad === 0);
if (R.state().scene === 'friend') R.press(OK);
check('Back on the map leaves the game', R.back() === false);

// The bakery: a cake with toppings, then All done.
R.begin();
R.press(OK); // into the bakery (the first place)
check('the bakery opens on the map\'s first place', R.state().scene === 'bakery');
R.press(RIGHT); R.press(OK); R.press(RIGHT); R.press(OK);
var before = R.state().save.sparkles;
R.press(OK); R.press(RIGHT); R.press(OK);
check('toppings go on the cake', R.state().bake.tops.length === 2 && R.state().save.sparkles > before);
for (var t = 0; t < 8; t++) R.press(OK);
check('a full cake moves the choice to All done', R.state().bake.sel === R.TOPPINGS.length || R.state().bake.done);
R.press(OK);
check('All done finishes the cake', R.state().bake.done);

// The shop: a different treat is still a happy friend.
R.back(); if (R.state().scene === 'friend') R.press(OK);
R.begin();
var shopAt = 2;
while (R.state().here !== shopAt) { R.press(RIGHT); for (var q = 0; q < 50; q++) R.step(1 / 60); }
R.press(OK);
for (q = 0; q < 120; q++) R.step(1 / 60);
var sh = R.state().shop, wrong = 0;
while (sh.shelf[sh.sel] === sh.cust.want) { R.press(RIGHT); wrong++; }
var had = R.state().save.sparkles;
R.press(OK);
for (q = 0; q < 60; q++) R.step(1 / 60);
check('a surprise treat still makes a happy friend', R.state().shop.cust && R.state().shop.cust.state === 'happy' && R.state().save.sparkles > had);

// The garden grows by the clock, even while away.
R.back(); store = {}; R.begin();
while (R.state().here !== 1) { R.press(RIGHT); for (q = 0; q < 50; q++) R.step(1 / 60); }
R.press(OK);
R.press(OK); // plant
check('a seed goes in', R.state().save.garden[0] && R.state().save.garden[0].w === 0);
R.press(OK); // water
var p = R.state().save.garden[0];
check('watering starts it growing', p.w > 0);
p.w -= 13000;
had = R.state().save.sparkles;
R.press(OK); // pick
check('a grown plant is picked for sparkles', !R.state().save.garden[0] && R.state().save.sparkles >= had + 3);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
