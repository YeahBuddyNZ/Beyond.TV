// What's new (web/whatsnew.js, WhatsNew.java, ADR 0075) without a screen: the list in docs/whats-new.json and the
// rule for when the home screen says "New: ...".
// node tests/whatsnew.test.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var sandbox = {Math: Math, Date: Date, JSON: JSON, I18N: {lang: 'en', tr: function (pt, en) { return en; }}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'web', 'whatsnew.js'), 'utf8'), sandbox, {filename: 'whatsnew.js'});
var R = sandbox.WhatsNew.rules;

var failed = 0, passed = 0;
function check(name, ok) {
  if (ok) passed++;
  else { failed++; console.log('FAIL ' + name); }
}

// The list: every line in all five languages, short, plain, newest first, no em dashes.
var file = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'whats-new.json'), 'utf8'));
var items = file.items, ids = {};
check('list has items', items.length > 0);
check('every item is usable', R.clean(items).length === items.length);
for (var i = 0; i < items.length; i++) {
  var x = items[i];
  check(x.id + ': id once', !ids[x.id]);
  ids[x.id] = true;
  check(x.id + ': id is plain', /^[a-z0-9-]+$/.test(x.id));
  if (i > 0) check(x.id + ': newest first', x.date <= items[i - 1].date);
  ['en', 'pt', 'es', 'de', 'ru'].forEach(function (lang) {
    var w = x[lang];
    check(x.id + ' ' + lang + ': title and line', w && w.length === 2 && w[0] && w[1]);
    if (!w) return;
    check(x.id + ' ' + lang + ': short title', w[0].length <= 40);
    check(x.id + ' ' + lang + ': short line', w[1].length <= 100);
    check(x.id + ' ' + lang + ': no em dash', (w[0] + w[1]).indexOf(String.fromCharCode(0x2014)) < 0);
  });
}
check('about has no em dash', file.about.indexOf(String.fromCharCode(0x2014)) < 0);

// Words: the TV's language, English when it's missing.
var one = {id: 'a', date: '2026-11-24', en: ['Hello', 'There'], de: ['Hallo', 'Da']};
check('german words', R.words(one, 'de')[0] === 'Hallo');
check('falls back to english', R.words(one, 'ru')[0] === 'Hello');
check('date shown as DD/MM/YYYY', R.date(one) === '24/11/2026');

// Cleaning: no id, a bad date or no English is left out.
check('clean', R.clean([one, {id: 'b', date: '24/11/2026', en: ['x', 'y']}, {id: 'c', date: '2026-11-24'}, null]).length === 1);

// Fresh: the newest only, until seen, for three weeks.
var noon = new Date(2026, 10, 24, 12).getTime(), DAY = 86400000;
check('new and unseen shows', R.fresh([one], '', noon + DAY) === one);
check('seen goes', R.fresh([one], 'a', noon + DAY) === null);
check('a newer one after seeing shows', R.fresh([{id: 'b', date: '2026-11-25', en: ['B', '']}, one], 'a', noon + DAY).id === 'b');
check('three weeks still shows', R.fresh([one], '', noon + 21 * DAY) === one);
check('after three weeks goes', R.fresh([one], '', noon + 22 * DAY) === null);
check('empty list', R.fresh([], '', noon) === null);

// The Android twin reads the same file and keeps the same numbers.
var java = fs.readFileSync(path.join(root, 'app', 'src', 'nz', 'gobeyond', 'tv', 'WhatsNew.java'), 'utf8');
check('java reads the same address', java.indexOf(R.URL) >= 0);
check('java keeps three weeks', /FRESH_DAYS = 21\b/.test(java) && R.FRESH_DAYS === 21);

console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
