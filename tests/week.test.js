// Our week, the Sunday family recap (web/week.js, ADR 0075), without a screen: when it shows and opens by itself,
// which week, who's on it, the thank you for Mum, and the week's wins and photos. WeekRecapTest.java checks the twin.
// node tests/week.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {localStorage: {getItem: function () { return null; }, setItem: function () {}}, I18N: {lang: 'en'}}, I18N: {lang: 'en'},
  Math: Math, Date: Date, JSON: JSON, String: String, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'week.js'), 'utf8'), sandbox, {filename: 'week.js'});
var R = sandbox.Week.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
function at(y, m, d, h) { return new Date(y, m - 1, d, h, 0, 0).getTime(); }
var sun5 = at(2026, 11, 29, 17), sun3 = at(2026, 11, 29, 15), sun9 = at(2026, 11, 29, 21);
var sat5 = at(2026, 11, 28, 17), mon9 = at(2026, 11, 30, 9), mon12 = at(2026, 11, 30, 12);

check('Sunday 5 pm opens by itself', R.due({}, sun5, true));
check('not before 4', !R.due({}, sun3, true));
check('not from 9', !R.due({}, sun9, true));
check('only on Sundays', !R.due({}, sat5, true));
check('not when turned off', !R.due({auto: false}, sun5, true));
check('not for one person on their own', !R.due({}, sun5, false));
check('once a week', !R.due({shown: '2026-11-23'}, sun5, true) && R.due({shown: '2026-11-16'}, sun5, true));
check('a Sunday\'s week starts the Monday before', R.weekOf(sun5) === '2026-11-23');
check('button on Sundays', R.button(sun3) && R.button(sun9));
check('button on Monday mornings', R.button(mon9) && !R.button(mon12));
check('no button on a Saturday', !R.button(sat5));
check('a Monday morning looks back on last week', R.whichWeek(mon9) === '2026-11-23' && R.whichWeek(mon12) === '2026-11-30' && R.whichWeek(sun5) === '2026-11-23');
check('the dates the New Zealand way', R.rangeLine('2026-11-23') === 'Monday 23/11 to Sunday 29/11');
check('names joined', R.names(['Aroha']) === 'Aroha' && R.names(['Aroha', 'Nikau']) === 'Aroha and Nikau' && R.names(['A', 'B', 'C']) === 'A, B and C');

var people = [
  {id: 'dad', name: 'Dad', kid: false},
  {id: 'mum', name: 'Mere', kid: false, parent: 'mum'},
  {id: 'k1', name: 'Aroha', kid: true},
  {id: 'k2', name: 'Nikau', kid: true},
  {id: 'together', together: true, name: 'Family'},
  {id: 'v', name: 'Nana', visitor: true}
];
var t = R.thanks(people, '2026-11-23');
check('Mum gets the thank you, as queen of the house', t && t.queen && t.to.length === 1 && t.to[0].id === 'mum' && t.text.indexOf('Mere') >= 0);
check('signed by the kids, never visitors or Family', t.from === 'Love from Aroha and Nikau');
check('the same line all week', R.thanks(people, '2026-11-23').text === t.text);
var g = R.thanks([{id: 'a', name: 'Dad'}, {id: 'b', name: 'Tama'}, {id: 'k', name: 'Aroha', kid: true}], '2026-11-23');
check('with no Mum set, the grown-ups together', g && !g.queen && g.to.length === 2 && g.text.indexOf('Dad and Tama') >= 0);
check('no grown-ups, no thank you', R.thanks([{id: 'k', name: 'Aroha', kid: true}], '2026-11-23') === null);
check('no kids: from the whānau', R.thanks([{id: 'm', name: 'Mere', parent: 'mum'}], '2026-11-23').from === 'Love from the whānau');

var board = [{p: 'k1', name: 'Aroha', total: 12, award: ['', 'Chore champion'], champion: true, chores: 9},
  {p: 'gone', name: 'Old', total: 3, award: null, champion: false, chores: -2}];
var rows = R.rows(board, people);
check('scoreboard first, then everyone else, kids before grown-ups', rows.map(function (r) { return r.person.name; }).join() === 'Aroha,Old,Nikau,Dad,Mere');
check('chore stars never below none', rows[1].chores === 0 && rows[0].chores === 9);
check('somebody no longer here keeps their name', rows[1].person.name === 'Old');

var wins = [{text: 'Mowed the lawn', date: '2026-11-25'}, {text: 'Old one', date: '2026-11-20'}, {text: 'No date', photo: 'x.jpg', name: 'Nikau'}, {text: 'Sunday', date: '2026-11-29T08:00:00Z'}];
var w = R.winsIn(wins, '2026-11-23');
check('only this week\'s wins', w.map(function (x) { return x.text; }).join() === 'Mowed the lawn,No date,Sunday');
var pics = R.photos(w, ['a', 'b', 'c', 'd']);
check('wins\' photos first, then the TV\'s own, four at most', pics.length === 4 && pics[0].src === 'x.jpg' && pics[0].name === 'Nikau' && pics[3].src === 'c');

var all = R.words();
check('every line in all five languages', all.every(function (x) { return x.length === 5 && x.every(function (s) { return typeof s === 'string' && s.length; }); }));
var source = fs.readFileSync(path.join(__dirname, '..', 'web', 'week.js'), 'utf8');
check('no em dashes', source.indexOf(String.fromCharCode(0x2014)) < 0);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
