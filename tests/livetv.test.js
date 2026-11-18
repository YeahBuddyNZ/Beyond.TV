// Live TV (web/livetv.js) without a screen: which apps go in which row, the channel list and its fallbacks, changing
// channel, and the list on the website matching the one in the app:
// node tests/livetv.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {}, tr: function (pt, en) { return en; }, UI: {}, TV: {}, JSON: JSON, Math: Math, console: console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'livetv.js'), 'utf8'), sandbox, {filename: 'livetv.js'});
var L = sandbox.LiveTV.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

// Rows: each app once, in our order, only what's installed
var apps = [
  {id: 'com.netflix', title: 'Netflix'},
  {id: 'nz.co.threenow', title: 'ThreeNow'},
  {id: 'tvnz.plus', title: 'TVNZ+'},
  {id: 'nz.co.dishtv.FreeviewLiveTV', title: 'Freeview Streaming TV'},
  {id: 'com.plexapp.android', title: 'Plex'},
  {id: 'nz.co.sky.sportnow', title: 'Sky Sport Now'},
  {id: 'nz.co.lightbox.android', title: 'Neon'}
];
var rows = L.sources(apps);
check('nz row in order', rows.nz.map(function (s) { return s.key; }).join() === 'freeview,tvnz,threenow');
check('free row has Plex', rows.free.length === 1 && rows.free[0].key === 'plex');
check('paid row', rows.paid.map(function (s) { return s.key; }).join() === 'skysportnow,neon');
check('Netflix is in no row', JSON.stringify(rows).indexOf('Netflix') < 0);
check('nothing installed, empty rows', L.sources([]).nz.length === 0 && L.sources(null).free.length === 0);
check('Samsung TV Plus', L.sources([{id: '3201710015037', title: 'Samsung TV Plus'}]).free[0].key === 'tvplus');
check('LG Channels', L.sources([{id: 'com.webos.app.lgchannels', title: 'LG Channels'}]).free[0].key === 'lgchannels');

// The list: the website's when good, else the one kept, else ours; bad entries dropped
var good = {channels: [{name: 'Test News', youtube: 'UC' + 'abcdefghijklmnopqrstuv'}]};
check('site list wins', L.pickList(good, null)[0].name === 'Test News');
check('bad site list falls back to kept', L.pickList({channels: [{name: 'x', youtube: 'nope'}]}, good)[0].name === 'Test News');
check('nothing falls back to ours', L.pickList(null, null).length === L.NEWS.length);
check('a script in a name is just text, a bad id is dropped', L.pickList({channels: [{name: 'A', youtube: 'UC123'}, {name: 'B', youtube: 'UCabcdefghijklmnopqrstuv'}]}, null).length === 1);
check('our list is all good', L.pickList({channels: L.NEWS}, null).length === L.NEWS.length);

// Changing channel goes round
check('up from the last', L.step(9, 1, 10) === 0);
check('down from the first', L.step(0, -1, 10) === 9);
check('no channels', L.step(3, 1, 0) === 0);

// The player asks for the channel's live stream, YouTube's own player
var url = L.embedUrl(L.NEWS[0]);
check('embed by channel', url.indexOf('https://www.youtube.com/embed/live_stream?channel=' + L.NEWS[0].youtube) === 0 && /autoplay=1/.test(url));

// The website's list is the same as the app's own copy
var site = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'live', 'channels.json'), 'utf8'));
check('website list matches the app', JSON.stringify(site.channels) === JSON.stringify(L.NEWS));

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
