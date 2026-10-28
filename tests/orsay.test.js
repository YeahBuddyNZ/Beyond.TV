// Samsung's older smart TVs (Orsay) in web/tv.js, without a TV: node tests/orsay.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var source = fs.readFileSync(path.join(__dirname, '..', 'web', 'tv.js'), 'utf8');
var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

/** web/tv.js in a pretend TV: its user agent, and Samsung's Common API when `common` is set. */
function load(ua, common) {
  var events = [];
  var window = {navigator: {userAgent: ua}};
  if (common) {
    window.Common = {API: {Widget: function () {
      this.sendReadyEvent = function () { events.push('ready'); };
      this.sendReturnEvent = function () { events.push('return'); };
    }}};
  }
  var sandbox = {window: window, navigator: window.navigator, setTimeout: setTimeout, JSON: JSON, Intl: Intl};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {filename: 'tv.js'});
  return {TV: sandbox.TV, events: events};
}

var H6300 = 'Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/SmartTV+2014; Maple2012) AppleWebKit/537.42+ (KHTML, like Gecko) SmartTV Safari/537.42+';

// An Orsay TV is found by Samsung's Common API, or by its user agent if that hasn't loaded.
var t = load(H6300, true);
check('Orsay is named', t.TV.name === 'orsay' && t.TV.orsay && !t.TV.samsung && !t.TV.browser);
check('Smart Hub hears the app has loaded', t.events[0] === 'ready');
check('found by the user agent alone', load(H6300, false).TV.name === 'orsay');
check('a desktop browser is not Orsay', load('Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605', false).TV.name === 'browser');

// The Orsay remote's keys become the ones the rest of the app uses.
check('left', t.TV.code(4) === t.TV.keys.left);
check('up', t.TV.code(29460) === t.TV.keys.up);
check('right', t.TV.code(5) === t.TV.keys.right);
check('down', t.TV.code(29461) === t.TV.keys.down);
check('OK', t.TV.code(29443) === t.TV.keys.ok);
check('Return', t.TV.code(88) === t.TV.keys.back);
check('other keys pass through', t.TV.code(48) === 48);
check('LG keys are left alone', load('Mozilla/5.0 (Web0S; Linux) Safari', false).TV.code(4) === 4);

// One tile, Smart Hub, which is also the way back.
var apps = null;
t.TV.apps(function (list) { apps = list; });
check('one tile', apps && apps.length === 1 && apps[0].title === 'Smart Hub');
var opened = null;
t.TV.launch(apps[0].id, null, function (ok) { opened = ok; });
check('the tile goes back to Smart Hub', opened === true && t.events[1] === 'return');
t.TV.back();
check('Back on the first screen goes back to Smart Hub', t.events[2] === 'return');
var inputs = null;
t.TV.inputs(function (list) { inputs = list; });
check('no inputs (the Source button does it)', inputs && inputs.length === 0);
var said = null;
t.TV.info(function (i) { said = i; });
check('the check-in says Samsung Orsay 2014', said.brand === 'Samsung' && said.os === 'Orsay 2014' && said.model === '');

setTimeout(function () {
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}, 10);
