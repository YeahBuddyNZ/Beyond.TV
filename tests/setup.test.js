// Getting started (web/setup.js and SetupActivity.java, ADR 0075) without a screen: the same towns on both, a new TV
// gets it once, a TV that had Beyond TV before never does, and a house with kids lands on the people editor.
// node tests/setup.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

function load(stored) {
  var store = {};
  for (var k in stored) store[k] = stored[k];
  var sandbox = {
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }
    },
    store: store
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'setup.js'), 'utf8'), sandbox, {filename: 'setup.js'});
  return sandbox;
}

var fresh = load({});
check('a new TV gets Getting started', fresh.Setup.due());
check('no people editor without it asked', !fresh.Setup.people());

var old = load({'btv.checkin': '{"id":"x"}'});
check('a TV that had Beyond TV before never sees it', !old.Setup.due());
check('and it is marked done for good', old.store['btv.setup'] === '1');

var oldPrefs = load({'btv.prefs': '{"kupu":false}'});
check('settings changed before: not new', !oldPrefs.Setup.due());

var kids = load({'btv.setup': 'people'});
check('after a new town with kids: the people editor once', kids.Setup.people() && !kids.Setup.people());
check('and done after it', !kids.Setup.due() && kids.store['btv.setup'] === '1');

// The towns: the same names and places as SetupActivity.java's CITIES, in the same order.
var java = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'nz', 'gobeyond', 'tv', 'SetupActivity.java'), 'utf8');
var javaCities = [], m, re = /\{"([^"]+)", "(-?[\d.]+)", "(-?[\d.]+)"\}/g;
var block = java.slice(java.indexOf('CITIES = {'), java.indexOf('};', java.indexOf('CITIES = {')));
while ((m = re.exec(block))) javaCities.push([m[1], m[2], m[3]]);
check('sixteen towns on Android', javaCities.length === 16);
check('the same towns on both', JSON.stringify(javaCities) === JSON.stringify(fresh.Setup.CITIES));
fresh.Setup.CITIES.forEach(function (c) {
  var lat = parseFloat(c[1]), lon = parseFloat(c[2]);
  check(c[0] + ' is in New Zealand', lat < -34 && lat > -47.5 && lon > 166 && lon < 179);
});

// The Drop Sky check's code points at the right page on both.
check('Android opens the setup check', java.indexOf('"https://gobeyond.nz/tv/check"') >= 0);
check('the web code is there', fs.existsSync(path.join(__dirname, '..', 'web', 'icons', 'tv-check-qr.svg')));

console.log(passed + ' passed' + (failed ? ', ' + failed + ' failed' : ''));
process.exit(failed ? 1 : 0);
