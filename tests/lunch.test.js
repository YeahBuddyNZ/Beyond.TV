// School lunches (web/lunch.js) without a screen: the ideas in every language, the deck, the week, the grown-ups'
// list and the shopping list:
// node tests/lunch.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var store = {};
var sandbox = {
  window: {localStorage: {getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = v; }}},
  I18N: {lang: 'en'},
  tr: function (pt, en) { return en; },
  UI: {}, Math: Math, Date: Date, JSON: JSON, console: console
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'lunch.js'), 'utf8'), sandbox, {filename: 'lunch.js'});
var L = sandbox.Lunch.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function five(t) { return Array.isArray(t) && t.length === 5 && t.every(function (x) { return typeof x === 'string' && x.length > 1; }); }
function clean(t) { return t.join(' ').indexOf('—') < 0 && t.join(' ').indexOf('–') < 0; }

// The ideas
var ids = {};
check('plenty of ideas', L.IDEAS.length >= 20);
check('most are made on Sunday', L.IDEAS.filter(function (x) { return x.sunday; }).length >= 12);
L.IDEAS.forEach(function (it) {
  check(it.id + ' has its own id', !ids[it.id]); ids[it.id] = true;
  check(it.id + ' name and line in five languages', five(it.name) && five(it.line));
  check(it.id + ' has three steps in five languages', it.steps.length === 3 && it.steps.every(five));
  check(it.id + ' has no dashes', clean(it.name) && clean(it.line) && it.steps.every(clean));
  check(it.id + ' needs only food we know', it.food.length > 0 && it.food.every(function (f) { return !!L.FOOD[f]; }));
  check(it.id + ' keeps for a sensible time', it.keeps >= 1 && it.keeps <= 14);
  check(it.id + ' is nut free', !/\b(nut|nuts|peanut|almond|cashew|walnut|hazelnut|pecan)\b/i.test(it.name[1] + ' ' + it.food.join(' ') + ' ' + it.steps.map(function (s) { return s[1]; }).join(' ')) || /no nuts/i.test(it.line[1]));
});
Object.keys(L.FOOD).forEach(function (f) { check('food ' + f + ' in five languages', five(L.FOOD[f]) && clean(L.FOOD[f])); });
check('days in five languages', L.DAYS.length === L.WEEK && L.DAYS.every(five));

// The deck: every idea once, nothing already in the week, and the ones they keep saying nah to at the back
var deck = L.deckFor(null, null);
check('the deck has every idea once', deck.length === L.IDEAS.length && Object.keys(deck.reduce(function (o, x) { o[x] = 1; return o; }, {})).length === deck.length);
check('the deck leaves out the week so far', L.deckFor(null, ['bliss', 'sushi']).every(function (x) { return x !== 'bliss' && x !== 'sushi'; }));
for (var n = 0; n < 20; n++) {
  var d = L.deckFor({nah: {popcorn: 3, anzac: 1}}, null);
  check('nah ideas go to the back', d[d.length - 1] === 'popcorn' && d[d.length - 2] === 'anzac');
}

// A week, the grown-ups' list and the shopping list
var s = {v: 1, kids: {}};
L.record(s, {id: 'a', name: 'Aroha', colour: '#7A4FD0'}, ['scrolls', 'bliss', 'sushi', 'popcorn', 'kebabs'], ['anzac']);
L.record(s, {id: 'n', name: 'Nikau'}, ['scrolls', 'friedRice', 'bliss', 'pikelets', 'hummus', 'extra'], []);
check('a week is five', s.kids.n.week.length === 5);
check('nah is counted', s.kids.a.nah.anzac === 1);
L.record(s, {id: 'a', name: 'Aroha'}, ['bliss', 'drumsticks', 'crackers', 'fritters', 'granola'], []);
check('the favourite is the one picked most', L.favourites(s.kids.a, 3)[0] === 'bliss');
var week = L.thisWeek(s);
check('this week puts the shared picks first', week[0].id === 'bliss' && week[0].kids.length === 2);
check('this week lists each idea once', week.length === Object.keys(week.reduce(function (o, x) { o[x.id] = 1; return o; }, {})).length);
var shop = L.shopping(['scrolls', 'vegeMuffins', 'nope']);
check('shopping lists each thing once', shop.filter(function (x) { return x.id === 'flour'; }).length === 1 && shop.filter(function (x) { return x.id === 'flour'; })[0].n === 2);
check('shopping skips unknown ideas', shop.every(function (x) { return !!L.FOOD[x.id]; }));
var cook = L.cookList(s);
check('the cook-up is only Sunday ideas', cook.length > 0 && cook.every(function (x) { return L.IDEAS.filter(function (i) { return i.id === x.id; })[0].sunday; }));
check('with nothing picked the cook-up offers ideas', L.cookList({kids: {}}).idea === true);
L.save(s);
check('it is kept and read back', L.load().kids.a.name === 'Aroha');
store['bt.lunch'] = 'not json';
check('a broken store starts fresh', JSON.stringify(L.load().kids) === '{}');

// Every English line on screen has its German and Russian in strings.js
var src = fs.readFileSync(path.join(__dirname, '..', 'web', 'lunch.js'), 'utf8');
var strings = fs.readFileSync(path.join(__dirname, '..', 'web', 'strings.js'), 'utf8');
var german = strings.slice(strings.indexOf('var german'), strings.indexOf('var russian'));
var russian = strings.slice(strings.indexOf('var russian'));
var re = /(?:tr|say)\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g, m;
while ((m = re.exec(src))) {
  var en = JSON.stringify(m[2].replace(/\\'/g, '\''));
  check('German for ' + en, german.indexOf(en + ':') >= 0);
  check('Russian for ' + en, russian.indexOf(en + ':') >= 0);
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
