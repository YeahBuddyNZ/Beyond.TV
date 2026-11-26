// Phone controllers (web/pads.js, ADR 0080): a press becomes the remote's key, the game can tell who pressed, the
// first press says hello once, and anything else is ignored:
// node tests/pads.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var toasts = [];
var sandbox = {
  window: {},
  tr: function (pt, en) { return en; },
  UI: {toast: function (t) { toasts.push(t); }},
  TV: {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 461}},
  Date: Date, Object: Object, String: String
};
sandbox.window.UI = sandbox.UI;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'pads.js'), 'utf8'), sandbox, {filename: 'pads.js'});
var P = sandbox.Pads;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

check('nothing goes anywhere before a page says where', P.press({button: 'a', memberId: 'm1', name: 'Aroha'}) === false);

var got = [];
P.to(function (k) { got.push({k: k, from: P.from()}); });
var t = 1000000;
P.press({button: 'up', memberId: 'm1', name: 'Aroha Smith', colour: '#D85A30'}, t);
P.press({button: 'a', memberId: 'm1', name: 'Aroha Smith', colour: '#D85A30'}, t + 100);
P.press({button: 'b', memberId: 'm1', name: 'Aroha Smith', colour: '#D85A30'}, t + 200);
check('up is the up arrow', got[0].k === 38);
check('A is OK', got[1].k === 13);
check('B is this TV\'s Back', got[2].k === 461);
check('the game hears who pressed, first name only', got[0].from && got[0].from.id === 'm1' && got[0].from.name === 'Aroha');
check('the player keeps their colour', got[0].from.colour === '#D85A30');
check('after the press it is the remote again', P.from() === null);
check('hello once, not every press', toasts.length === 1 && /Aroha picked up a controller/.test(toasts[0]));

P.press({button: 'left', memberId: 'm2', name: 'Nikau', colour: 'red; background: url(x)'}, t + 300);
check('a strange colour becomes lilac', got[3].from.colour === '#9E7BFF');
check('a second player says hello too', toasts.length === 2);
check('both are playing, newest first', P.players(t + 400).length === 2 && P.players(t + 400)[0].id === 'm2');

check('a button that isn\'t on the controller does nothing', P.press({button: 'home', memberId: 'm1'}, t + 500) === false && got.length === 4);
check('a missing press does nothing', P.press(null, t + 500) === false);

P.press({button: 'down', memberId: 'm1', name: 'Aroha'}, t + 11 * 60 * 1000);
check('hello again after ten quiet minutes', toasts.length === 3);

P.to(function () { throw new Error('game broke'); });
try { P.press({button: 'a', memberId: 'm1', name: 'Aroha'}, t); } catch (e) { /* the game's problem */ }
check('a game that throws still leaves it the remote\'s turn', P.from() === null);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
