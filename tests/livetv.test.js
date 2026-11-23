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

// The player asks for the video the channel streams now when we know it, else the channel's live stream
var url = L.embedUrl(L.NEWS[0]);
check('embed by channel', url.indexOf('https://www.youtube.com/embed/live_stream?channel=' + L.NEWS[0].youtube) === 0 && /autoplay=1/.test(url));
check('embed by video', L.embedUrl({youtube: L.NEWS[0].youtube, video: 'abcdefghijk'}).indexOf('https://www.youtube.com/embed/abcdefghijk?') === 0);
check('logo from our site', L.logoUrl(L.NEWS[0]) === 'https://yeahbuddynz.github.io/Beyond.TV/live/logos/' + L.NEWS[0].id + '.jpg');
check('no logo for an odd id', L.logoUrl({id: '../x'}) === null);

// On air: a recent now.json gives each channel its video and leaves out the ones not live
var t = Date.parse('2026-11-21T10:00:00Z');
var now = {at: '2026-11-21T09:00:00Z', channels: {}};
now.channels[L.NEWS[0].youtube] = {video: 'abcdefghijk'};
now.channels[L.NEWS[1].youtube] = {video: 'bad id'};
var air = L.onAir(L.NEWS, now, t);
check('live channel gets its video', air.length === 1 && air[0].video === 'abcdefghijk' && air[0].name === L.NEWS[0].name);
check('the list itself is untouched', !L.NEWS[0].video);
check('old now.json: every channel, by channel id', L.onAir(L.NEWS, {at: '2026-11-01T00:00:00Z', channels: now.channels}, t).length === L.NEWS.length);
check('no now.json: every channel', L.onAir(L.NEWS, null, t).length === L.NEWS.length && !L.onAir(L.NEWS, null, t)[0].video);
check('a now.json from the future is not trusted', L.onAir(L.NEWS, {at: '2026-11-25T00:00:00Z', channels: now.channels}, t).length === L.NEWS.length);

// Now and next (ADR 0058): the live video's title, and what's on next while it hasn't started
var nn = {at: '2026-11-21T09:30:00Z', channels: {}};
nn.channels[L.NEWS[0].youtube] = {video: 'abcdefghijk', title: 'Watch Sky News live', next: {title: 'Mornings', at: '2026-11-21T11:00:00Z'}};
nn.channels[L.NEWS[1].youtube] = {video: 'bcdefghijkl', title: 42, next: {title: 'Bad time', at: 'soon'}};
var air2 = L.onAir(L.NEWS, nn, t);
check('now is the live title', air2[0].now === 'Watch Sky News live');
check('next keeps its title and time', air2[0].next.title === 'Mornings' && air2[0].next.at === Date.parse('2026-11-21T11:00:00Z'));
check('a title that is not text is dropped', air2[1].now === undefined && air2[1].next === undefined);
check('next before it starts', L.nextOf(air2[0], t).title === 'Mornings');
check('next once it has started is gone', L.nextOf(air2[0], Date.parse('2026-11-21T11:01:00Z')) === null);
check('no next', L.nextOf(air2[1], t) === null && L.nextOf(null, t) === null);

// Favourites (ADR 0058): per person, newest first, holding OK again takes one off, the store given untouched
var store = {p1: ['sky-news']};
var r1 = L.toggleFav(store, 'p1', 'dw');
check('pinning puts it first', r1.pinned && r1.store.p1.join() === 'dw,sky-news');
check('the old store is untouched', store.p1.join() === 'sky-news');
var r2 = L.toggleFav(r1.store, 'p1', 'sky-news');
check('pinning again unpins', !r2.pinned && r2.store.p1.join() === 'dw');
check('each person their own', L.toggleFav(r2.store, 'p2', 'nasa').store.p1.join() === 'dw' && L.favsOf(L.toggleFav(r2.store, 'p2', 'nasa').store, 'p2').join() === 'nasa');
check('a broken store is empty', L.favsOf({p1: 'x'}, 'p1').length === 0 && L.favsOf(null, 'p1').length === 0 && L.favsOf({p1: ['../x', 3, 'ok']}, 'p1').join() === 'ok');
var many = {p1: []};
for (var m = 0; m < 20; m++) many = L.toggleFav(many, 'p1', 'c' + m).store;
check('at most twelve', L.favsOf(many, 'p1').length === 12 && L.favsOf(many, 'p1')[0] === 'c19');
check('favourites in pinned order, only what is on air', L.favourites(L.NEWS, ['dw', 'gone', 'sky-news']).map(function (c) { return c.id; }).join() === 'dw,sky-news');

// Rows: every channel lands in one, and a channel with no group is news
var total = 0;
['featured', 'news', 'more', 'kids'].forEach(function (g) { total += L.inGroup(L.NEWS, g).length; });
check('every channel in one row', total === L.NEWS.length);
check('featured row has channels', L.inGroup(L.NEWS, 'featured').length >= 4);
check('kids row has channels', L.inGroup(L.NEWS, 'kids').length >= 1);
check('no group is news', L.inGroup([{name: 'x', youtube: 'UCabcdefghijklmnopqrstuv'}], 'news').length === 1);
check('every channel has a logo on the site', L.NEWS.every(function (c) { return fs.existsSync(path.join(__dirname, '..', 'docs', 'live', 'logos', c.id + '.jpg')); }));

// The website's list is the same as the app's own copy (its live channels: mixes need now.json, so only come from there)
var site = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'live', 'channels.json'), 'utf8'));
var siteLive = site.channels.filter(function (c) { return c.youtube; });
check('website list matches the app', JSON.stringify(siteLive) === JSON.stringify(L.NEWS));
check('every channel on the website is good, and has a logo', site.channels.every(function (c) {
  return L.validChannel(c) && fs.existsSync(path.join(__dirname, '..', 'docs', 'live', 'logos', c.id + '.jpg'));
}));
check('the NZ mixes are on the website', ['nz-news', 'nz-music', 'nz-shows', 'nz-sport'].every(function (id) {
  return site.channels.some(function (c) { return c.id === id && c.group === 'nz' && c.mix.length >= 3; });
}));

// Mix channels (ADR 0065): their videos come from now.json; none, and the mix is off air
var mixC = {id: 'nz-music', name: 'NZ Music', from: 'Aotearoa', mix: ['UCabcdefghijklmnopqrstuv'], group: 'nz'};
check('a mix is a good channel', L.validChannel(mixC) && !L.validChannel({id: 'x', name: 'X', mix: ['nope']}) && !L.validChannel({id: '../x', name: 'X', mix: ['UCabcdefghijklmnopqrstuv']}));
check('a mix keeps its place in a list', L.pickList({channels: [mixC]}, null)[0].id === 'nz-music');
var mixNow = {at: '2026-11-21T09:00:00Z', channels: {}, mixes: {'nz-music': [
  {v: 'aaaaaaaaaaa', t: 'Song one', s: 200}, {v: 'bad', t: 'x', s: 100}, {v: 'bbbbbbbbbbb', t: 'Song two', s: 100},
  {v: 'ccccccccccc', t: 'Too short', s: 5}, {v: 'ddddddddddd', t: 7, s: 100}]}};
var mixAir = L.onAir([mixC], mixNow, t);
check('a mix gets its good videos', mixAir.length === 1 && mixAir[0].videos.map(function (v) { return v.v; }).join() === 'aaaaaaaaaaa,bbbbbbbbbbb');
check('a mix without videos is off air', L.onAir([mixC], {at: mixNow.at, channels: {}}, t).length === 0 && L.onAir([mixC], null, t).length === 0);
var vids = mixAir[0].videos;
check('the clock picks the video', L.mixAt(vids, 0).i === 0 && L.mixAt(vids, 199000).i === 0 && L.mixAt(vids, 200000).i === 1 && L.mixAt(vids, 300000).i === 0);
check('and how far into it', L.mixAt(vids, 250000).start === 50 && L.mixAt(vids, 250000).title === 'Song two');
check('now on a mix is the video playing', L.nowOf(mixAir[0], 250000) === 'Song two' && L.nowOf({now: 'Live'}, 0) === 'Live' && L.nowOf(null, 0) === '');
var mixUrl = L.embedUrl(mixAir[0], 250000);
check('a mix plays from where it is, then on round', mixUrl.indexOf('https://www.youtube.com/embed/bbbbbbbbbbb?start=50&playlist=aaaaaaaaaaa&loop=1&') === 0 && /autoplay=1/.test(mixUrl));
check('a broken list of videos is empty', L.videosOf(null).length === 0 && L.videosOf('x').length === 0);

// The line-up: numbered, the aerial and NZ apps first, then channels, then the other apps; a kid's is smaller
var lineRows = L.sources(apps), onAirNow = L.onAir([mixC].concat(L.NEWS), {at: mixNow.at, channels: {}, mixes: mixNow.mixes}, t);
onAirNow = L.onAir([mixC].concat(L.NEWS), null, t).filter(function (c) { return c.youtube; });
onAirNow.unshift(mixAir[0]);
var line = L.lineup(onAirNow, lineRows, {id: 'tv', title: 'Live TV'}, false);
check('numbers from 1', line[0].num === 1 && line[line.length - 1].num === line.length);
check('aerial, then the NZ apps', line.slice(0, 4).map(function (e) { return e.key; }).join() === 'aerial,freeview,tvnz,threenow');
check('then the NZ mixes', line[4].key === 'nz-music' && line[4].kind === 'channel');
check('the other apps last', line.slice(-3).map(function (e) { return e.key; }).join() === 'plex,skysportnow,neon');
check('kids channels are on it', line.some(function (e) { return e.key === 'pbs-kids'; }));
var kidLine = L.lineup(onAirNow, lineRows, null, true);
check('a kid gets the NZ apps and the kids channels', kidLine.map(function (e) { return e.key; }).join() === 'freeview,tvnz,threenow,pbs-kids');

// Choose channels: off per person, numbers kept, never all off
var off1 = L.toggleOff({}, 'p1', 'tvnz');
check('turned off', L.offOf(off1, 'p1').join() === 'tvnz');
check('and on again', L.offOf(L.toggleOff(off1, 'p1', 'tvnz'), 'p1').length === 0 && L.offOf(off1, 'p1').join() === 'tvnz');
check('each person their own', L.offOf(L.toggleOff(off1, 'p2', 'dw'), 'p1').join() === 'tvnz');
var shownLine = L.shown(line, ['tvnz']);
check('off ones are skipped', shownLine.length === line.length - 1 && !shownLine.some(function (e) { return e.key === 'tvnz'; }));
check('a channel keeps its number', shownLine[2].key === 'threenow' && shownLine[2].num === 4);
check('all off still shows something', L.shown(line, line.map(function (e) { return e.key; })).length === line.length);
check('a number finds its channel', L.byNumber(shownLine, 4) === 2 && L.byNumber(shownLine, 3) === -1 && L.byNumber(shownLine, 999) === -1);

// Where surfing starts: the one asked for, else the last, else the first channel, never an app
check('starts on the one asked for', line[L.startAt(line, 'dw', 'nz-music')].key === 'dw');
check('else the last watched', line[L.startAt(line, null, 'nz-music')].key === 'nz-music');
check('last can be an app', line[L.startAt(line, null, 'tvnz')].key === 'tvnz');
check('else the first channel', line[L.startAt(line, 'gone', 'gone')].kind === 'channel' && L.startAt([], null, null) === -1);

// The remote's number and channel keys
check('number keys', L.digit(48) === 0 && L.digit(57) === 9 && L.digit(101) === 5 && L.digit(13) === -1);
check('channel keys', L.channelKey(33) === 1 && L.channelKey(427) === 1 && L.channelKey(34) === -1 && L.channelKey(428) === -1 && L.channelKey(38) === 0);
var java = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'nz', 'gobeyond', 'tv', 'LiveTvActivity.java'), 'utf8');
var javaList = java.slice(java.indexOf('static final String[][] NEWS'), java.indexOf('};', java.indexOf('static final String[][] NEWS')));
var javaRows = javaList.match(/\{"[^}]*\}/g).map(function (r) { return JSON.parse('[' + r.slice(1, -1) + ']'); });
check('Google TV list matches the website', JSON.stringify(javaRows) === JSON.stringify(siteLive.map(function (c) { return [c.id, c.name, c.from, c.youtube, c.group, c.colour]; })));

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
