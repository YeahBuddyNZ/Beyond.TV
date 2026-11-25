/*
 * What's new (ADR 0076): the newest thing on Beyond TV, said once on the home screen, and a short list of the last few.
 *
 * The list is docs/whats-new.json on GitHub Pages, newest first, the same list the website's feature check keeps up
 * to date, so a new feature reaches every TV without an update. It is fetched at most twice a day and kept on the TV
 * for when the internet is down. Nothing is sent: it is one file read, the same for every TV.
 *
 * The newest line shows in Today at home ("New: Bedtime sounds") until someone opens What's new, and for three weeks
 * at most. What's new is in Shortcuts at the bottom of the home screen: the last six, with their dates, OK or Back
 * closes it. Remote only. Same rules as WhatsNew.java; tests/whatsnew.test.js checks both lists and the rules.
 * Plain ES5, like the rest of web/.
 */
var WhatsNew = (function () {
  'use strict';

  var URL = 'https://yeahbuddynz.github.io/Beyond.TV/whats-new.json';
  var KEY = 'bt.whatsnew', SEEN = 'bt.whatsnew.seen';
  var EVERY = 12 * 3600 * 1000;       // fetched at most this often
  var FRESH_DAYS = 21;                // the home screen line goes after three weeks, seen or not
  var SHOW = 6;                       // how many the What's new screen lists
  var LANGS = ['en', 'pt', 'es', 'de', 'ru'];

  function tr(pt, en, es) { return I18N.tr(pt, en, es); }

  // MARK: - Rules (no screen, no storage: tested in tests/whatsnew.test.js)

  /** The items that are fine to show: an id, a date (YYYY-MM-DD) and English words. Others are left out. */
  function clean(list) {
    var out = [];
    for (var i = 0; list && i < list.length; i++) {
      var x = list[i];
      if (!x || typeof x.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) continue;
      if (!x.en || typeof x.en[0] !== 'string' || !x.en[0]) continue;
      out.push(x);
    }
    return out;
  }

  /** [title, line] in the TV's language, English where that language is missing. */
  function words(item, lang) {
    var w = item[LANGS.indexOf(lang) >= 0 ? lang : 'en'];
    if (!w || !w[0]) w = item.en;
    return [w[0], w[1] || ''];
  }

  /** Midday on the item's date, on the TV's clock. */
  function day(item) {
    var p = item.date.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12).getTime();
  }

  /** The newest item if it should be on the home screen now: not seen yet and under three weeks old. */
  function fresh(items, seen, now) {
    var top = items[0];
    if (!top || top.id === seen) return null;
    var age = now - day(top);
    return age >= -86400000 && age <= FRESH_DAYS * 86400000 ? top : null;
  }

  /** "24/11/2026". */
  function date(item) {
    var p = item.date.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // MARK: - Kept on the TV

  var items = [];

  function store() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; }
  }

  function seen() {
    try { return localStorage.getItem(SEEN) || ''; } catch (e) { return ''; }
  }

  /** Reads what the TV kept, then fetches again if it's been a while. done() runs when the list changed. */
  function load(done) {
    var kept = store();
    items = clean(kept.items);
    if (kept.at && Date.now() - kept.at < EVERY) return;
    var xhr;
    try { xhr = new XMLHttpRequest(); } catch (e) { return; }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var list = null;
      if (xhr.status === 200) {
        try { list = clean(JSON.parse(xhr.responseText).items); } catch (e) {}
      }
      try { localStorage.setItem(KEY, JSON.stringify({at: Date.now(), items: list || items})); } catch (e) {}
      if (list && JSON.stringify(list) !== JSON.stringify(items)) {
        items = list;
        if (done) done();
      }
    };
    try {
      xhr.open('GET', URL + '?d=' + Math.floor(Date.now() / EVERY), true);
      xhr.timeout = 15000;
      xhr.send();
    } catch (e) {}
  }

  /** The Today at home line, or null: ['✨', 'New: Bedtime sounds', 'Rain, waves or a fan...']. */
  function row() {
    var top = fresh(items, seen(), Date.now());
    if (!top) return null;
    var w = words(top, I18N.lang);
    return ['✨', tr('Novo', 'New', 'Nuevo') + ': ' + w[0], w[1]];
  }

  // MARK: - The screen

  /** What's new: the last six, newest first. Opening it counts as seen, so the home screen line goes. */
  function open(closed) {
    if (items[0]) { try { localStorage.setItem(SEEN, items[0].id); } catch (e) {} }
    return UI.open({
      cls: 'bt-news',
      build: function (layer, api) {
        var box = UI.el('div', 'box', layer);
        UI.heading(box, tr('Novidades', "What's new", 'Novedades'),
          tr('As coisas mais novas da sua TV.', 'The newest things on your TV.', 'Lo más nuevo de tu tele.'));
        var list = UI.el('div', 'list', box);
        if (!items.length) {
          UI.el('div', 'empty', list, tr('Nada novo agora. Confira de novo mais tarde.', 'Nothing new just now. Have another look later.',
            'Nada nuevo por ahora. Vuelve a mirar más tarde.'));
        }
        for (var i = 0; i < items.length && i < SHOW; i++) {
          var w = words(items[i], I18N.lang), it = UI.el('div', 'item', list);
          UI.el('div', 'when', it, date(items[i]));
          UI.el('div', 'what', it, w[0]);
          if (w[1]) UI.el('div', 'more', it, w[1]);
        }
        api.add(UI.button(box, tr('Entendi', 'Got it', 'Entendido'), 'check', 'primary'), function () { api.close(); }, {first: true});
      },
      closed: function () { if (closed) closed(); }
    });
  }

  return {
    load: load,
    row: row,
    open: open,
    rules: {clean: clean, words: words, fresh: fresh, date: date, FRESH_DAYS: FRESH_DAYS, URL: URL}
  };
})();
