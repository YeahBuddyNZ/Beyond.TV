// The Morning board (web/morning.js, ADR 0067) without a screen: when it opens by itself, who shows and with which
// to-dos, and what's on today. TableActivity.maybeMorning follows the same opening rule.
// node tests/morning.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {localStorage: {getItem: function () { return null; }, setItem: function () {}}, I18N: {lang: 'en'}}, I18N: {lang: 'en'},
  Math: Math, Date: Date, JSON: JSON, String: String, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'morning.js'), 'utf8'), sandbox, {filename: 'morning.js'});
var R = sandbox.Morning.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}
var seven = new Date(2026, 10, 24, 7, 0, 0).getTime();
var four = new Date(2026, 10, 24, 4, 59, 0).getTime();
var ten = new Date(2026, 10, 24, 10, 0, 0).getTime();

check('opens by itself on a morning, linked', R.due({}, seven, true));
check('not before 5', !R.due({}, four, true));
check('not from 10', !R.due({}, ten, true));
check('not without Beyond Family', !R.due({}, seven, false));
check('once a day', !R.due({shown: '2026-11-24'}, seven, true) && R.due({shown: '2026-11-23'}, seven, true));
check('not when turned off', !R.due({auto: false}, seven, true));

check('the date the New Zealand way', R.dateLine(seven) === 'Tuesday 24/11/2026');

var people = [
  {id: 'p1', name: 'Mum', kid: false, todos: [{id: 'a', title: 'Book the WOF', done: false}]},
  {id: 'p2', name: 'Aroha', kid: true, todos: [{id: 'b', title: 'Make my bed', done: true}, {title: ''}]},
  {id: 'together', together: true, name: 'Family'},
  {id: 'v1', name: 'Nana', visitor: true, todos: [{id: 'c', title: 'x'}]},
  {id: 'p3', name: 'Nikau', kid: true}
];
var cols = R.columns(people, [{name: 'Nikau', jobs: [{title: 'Feed the cat', done: false}]}]);
check('kids first, then grown-ups, never Family or visitors', cols.map(function (c) { return c.name; }).join() === 'Aroha,Nikau,Mum');
check('to-dos from Beyond Family, blank ones dropped', cols[0].todos.length === 1 && cols[0].todos[0].id === 'b' && cols[0].todos[0].done);
check('a kid without to-dos takes the jobs tile, read only', cols[1].todos.length === 1 && cols[1].todos[0].id === null);
var many = [];
for (var i = 0; i < 9; i++) many.push({id: 'k' + i, name: 'K' + i, kid: true, todos: []});
check('six people at most', R.columns(many).length === 6);

check('no noticeboard means no calendar', R.happenings(null) === null);
var list = R.happenings({birthdays: ['Aroha'], events: [{title: 'Swimming', time: '16:00', who: 'Aroha', where: 'Parnell'}, {title: 'Hui', time: null}], tea: 'Tacos'});
check('birthdays, then the calendar, then tea', list.length === 4 && list[0].icon === '🎂' && list[3].what === 'Tea tonight: Tacos');
check('an event says when, who and where', list[1].when === '16:00 · Aroha · Parnell' && list[2].when === 'All day');

check('weather pictures', R.weatherFace(0, true) === '☀️' && R.weatherFace(0, false) === '🌙' && R.weatherFace(61, true) === '🌧️' && R.weatherFace(-1, true) === '');

var source = fs.readFileSync(path.join(__dirname, '..', 'web', 'morning.js'), 'utf8');
check('no em dashes', source.indexOf(String.fromCharCode(0x2014)) < 0);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
