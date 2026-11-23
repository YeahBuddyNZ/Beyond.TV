// Find (web/find.js) without a screen: what was said against what's on the TV, the words around it left out, near
// misses forgiven, and the best of what the TV heard. Also Bedtime's sounds and lengths:
// node tests/find.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {window: {}, tr: function (pt, en) { return en; }, UI: {}, TV: {}, JSON: JSON, Math: Math, console: console,
  localStorage: {getItem: function () { return null; }, setItem: function () {}}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'find.js'), 'utf8'), sandbox, {filename: 'find.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'bedtime.js'), 'utf8'), sandbox, {filename: 'bedtime.js'});
var F = sandbox.Find.rules, B = sandbox.Bedtime.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

var games = F.gameItems([
  {id: 'rcland', name: 'Milo\'s Remote Control Land'}, {id: 'candy', name: 'London\'s Candy Land'}, {id: 'arcade', name: 'Arcade'},
  {id: 'table', name: 'Board and card games'}, {id: 'karaoke', name: 'Karaoke'}, {id: 'tidy', name: 'Tidy-up race'},
  {id: 'bedtime', name: 'Bedtime'}, {id: 'road', name: 'Build a road'}]);
var items = games.concat([
  {kind: 'thing', id: 'sky', name: 'Tonight\'s sky', also: sandbox.Find.ALIASES.sky},
  {kind: 'thing', id: 'live', name: 'Live TV', also: sandbox.Find.ALIASES.live},
  {kind: 'channel', id: 'sky-news', name: 'Sky News'}, {kind: 'channel', id: 'abc-au', name: 'ABC News'},
  {kind: 'channel', id: 'pbs-kids', name: 'PBS KIDS'}, {kind: 'channel', id: 'nasa', name: 'NASA'},
  {kind: 'app', name: 'Netflix'}, {kind: 'app', name: 'YouTube'}, {kind: 'app', name: 'TVNZ+'}, {kind: 'app', name: 'Disney+'},
  {kind: 'app', name: 'Sky Sport Now'}, {kind: 'app', name: 'Sky Go'}]);

function first(said) { var r = F.search(said, items); return r.length ? r[0].name : ''; }

// Words
check('plain drops case, accents and marks', F.plain('Milo\'s Remote-Control Land!') === 'milos remote control land');
check('plain keeps te reo letters without macrons', F.plain('Whānau') === 'whanau');
check('plus becomes a word', F.plain('TVNZ+') === 'tvnz plus');
check('filler left out', F.words('Can we play Candy Land please').join(' ') === 'candy land');
check('all filler keeps the words', F.words('let\'s go').join(' ') === 'lets go');

// Near misses
check('the same word', F.near('candy', 'candy'));
check('the start of a word', F.near('rem', 'remote'));
check('one letter out', F.near('netflics', 'netflix'));
check('two out in a long word', F.near('karioke', 'karaoke'));
check('short words must be exact', !F.near('abd', 'abc'));
check('a different word is not near', !F.near('news', 'nasa'));

// What comes first
check('Candy Land', first('Candy Land') === 'London\'s Candy Land');
check('play candy land please', first('play candy land please') === 'London\'s Candy Land');
check('lollies is Candy Land', first('lollies') === 'London\'s Candy Land');
check('Sky News over Tonight\'s sky', first('sky news') === 'Sky News');
check('put on the news', first('put on the news') === 'Live TV');
check('chess is board games', first('chess') === 'Board and card games');
check('remote control cars', first('remote control cars') === 'Milo\'s Remote Control Land');
check('Milo\'s game by name', first('milos remote control land') === 'Milo\'s Remote Control Land');
check('netflix', first('open Netflix') === 'Netflix');
check('misheard netflix', first('net flicks') === 'Netflix' || first('netflics') === 'Netflix');
check('tvnz plus', first('TVNZ plus') === 'TVNZ+');
check('tvnz alone', first('tvnz') === 'TVNZ+');
check('karaoke', first('karaoke') === 'Karaoke');
check('sing a song is karaoke', first('sing a song') === 'Karaoke');
check('goodnight is bedtime', first('goodnight') === 'Bedtime');
check('rain sounds is bedtime', first('rain sounds') === 'Bedtime');
check('the stars', first('show me the stars') === 'Tonight\'s sky');
check('pbs kids', first('PBS kids') === 'PBS KIDS');
check('nasa', first('nasa') === 'NASA');
check('a show we have not got finds nothing', F.search('bluey', items).length === 0);
check('nonsense finds nothing', F.search('zzzz qqqq', items).length === 0);
check('nothing said finds nothing', F.search('', items).length === 0);
check('at most six', F.search('a', items.concat(items)).length <= 6);
check('each item once', (function () {
  var r = F.search('sky', items.concat(items)), seen = {};
  for (var i = 0; i < r.length; i++) { if (seen[r[i].kind + r[i].name]) return false; seen[r[i].kind + r[i].name] = 1; }
  return r.length > 0;
})());
check('sky alone shows Sky News and Tonight\'s sky', (function () {
  var names = F.search('sky', items).map(function (x) { return x.name; }).join('|');
  return names.indexOf('Sky News') >= 0 && names.indexOf('Tonight\'s sky') >= 0;
})());
check('a game wins a tie with an app', (function () {
  var r = F.search('arcade', items.concat([{kind: 'app', name: 'Arcade'}]));
  return r[0].kind === 'game';
})());

check('a name keeps its own words: Sky Go', first('sky go') === 'Sky Go');
check('sky alone is not Sky Go first', first('sky') !== 'Sky Go');

// Of what the TV heard, the one that finds most
check('first heard when it finds', F.bestHeard(['candy land', 'candy lamb'], items) === 'candy land');
check('a later one that finds better', F.bestHeard(['net flicks', 'netflix'], items) === 'netflix');
check('nothing heard', F.bestHeard([], items) === '');

// Bedtime
check('sounds', B.SOUNDS.join() === 'rain,waves,fan,quiet');
check('lengths', B.LENGTHS.join() === '15,30,45');
check('last pick defaults to rain, 15 minutes', B.last().sound === 'rain' && B.last().minutes === 15);

console.log(passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
