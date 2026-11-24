/*
 * Ask Beyond, the notes and Find (ADR 0062) on Google TV (AskActivity, ADR 0025): ask.html runs the same ask.js and notes.js as LG and
 * Samsung in a WebView, and this stands in for the home screen around them. Beyond Family is asked through the TV
 * (BeyondAsk.call, with the TV's own id), card pictures come from TMDB through it too (the key stays in Java), and the
 * remote's keys arrive through AskHost.key. Find matches against what the TV says it has (BeyondAsk.games, channels,
 * apps), hears through the TV's own voice search (BeyondAsk.listen, answered in AskHost.heard) and opens what's picked
 * through the TV. Not loaded on LG or Samsung. Plain ES5.
 */
var AskHost = (function () {
  'use strict';

  var bridge = window.BeyondAsk;
  var waiting = {}, next = 0;
  function json(s, fallback) { try { return JSON.parse(s); } catch (e) { return fallback; } }
  var me = bridge ? json(bridge.watcher(), {}) : {together: true};

  I18N.set(bridge ? bridge.language() : 'auto');
  window.TV = {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 4}, browser: false};
  window.CONFIG = {lowEnd: bridge ? bridge.lowEnd() : false};
  window.Profiles = {
    current: function () { return me; },
    kid: function () { return !!me.kid; }
  };
  window.Prefs = {sounds: function () { return bridge ? bridge.sounds() : false; }};
  window.Chime = {play: function () { if (bridge) bridge.chime(); }};

  /** The page's asks of the TV that take a while: f(id) starts one, done(err, res) hears back once. */
  function later(f, done) {
    var id = 'a' + (++next);
    waiting[id] = done;
    f(id);
  }

  function call(method, path, body, done) {
    if (!bridge) { done({status: 0}); return; }
    later(function (id) { bridge.call(id, method, path, body ? JSON.stringify(body) : ''); }, function (status, res) {
      if (status >= 200 && status < 300) done(null, res);
      else done({status: status});
    });
  }

  window.Family = {
    linked: function () { return bridge ? bridge.linked() : false; },
    ask: function (text, apps, together, done, who) {
      // who (ask.js): a kid asking (ADR 0067), checked and logged for their grown-ups; or whose phone sent it.
      who = who || {};
      call('POST', '/tv/ask', {ask: String(text).slice(0, 200), apps: (apps || []).slice(0, 40), memberId: who.member || me.member || undefined,
        together: together || undefined, kid: who.kid || undefined, teen: who.teen || undefined, name: who.name || undefined}, done);
    },
    noteHeart: function (id, done) { call('POST', '/tv/notes/' + id + '/heart', {memberId: me.member || undefined}, function (err) { done(err); }); },
    noteDown: function (id, done) { call('POST', '/tv/notes/' + id + '/down', {}, function (err) { done(err); }); }
  };

  window.Data = {
    image: function (path, size) { return path ? 'https://image.tmdb.org/t/p/' + (size || 'w1280') + path : ''; },
    backdropFor: function (title, year, show, done) {
      if (!bridge) { done(''); return; }
      later(function (id) { bridge.backdrop(id, String(title || ''), year || 0, !!show); }, function (status, path) { done(path || ''); });
    }
  };

  var apps = null;
  window.BeyondTV = {
    toast: function (text) { if (bridge) bridge.toast(text); },
    watchApps: function () { if (!apps) apps = bridge ? json(bridge.apps(), []) : []; return apps; },
    openApp: function (title) { return bridge ? bridge.openApp(String(title || '')) : false; },
    talk: function () { if (bridge) bridge.talk(); },
    // A note taken down: when it was the last one the wall has closed, and so does the activity.
    notes: function () { setTimeout(function () { if (!UI.active() && bridge) bridge.close(); }, 0); },
    renderNotes: function () {}
  };

  var stage = document.getElementById('stage');
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.webkitTransform = stage.style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // MARK: - Find

  var hearing = null;

  /** The TV's voice search answering: what it heard, best guess first, or nothing. */
  function heard(list) {
    var h = hearing;
    hearing = null;
    if (!h) return;
    if (list && list.length) h.heard(list); else h.failed();
  }

  function openFind(listen) {
    var kid = !!me.kid;
    Find.open({
      kid: kid,
      items: function (done) {
        var games = json(bridge ? bridge.games() : '[]', []), list = [], i;
        for (i = 0; i < games.length; i++) (function (g) {
          list.push({id: g.id, name: g.name, run: function () { if (bridge) bridge.openGame(g.id); }});
        })(games[i]);
        list = Find.gameItems(list);
        list.push({kind: 'thing', id: 'sky', name: tr('Céu de hoje à noite', 'Tonight\'s sky', 'El cielo de esta noche'), also: Find.ALIASES.sky,
          run: function () { if (bridge) bridge.openThing('sky'); }});
        list.push({kind: 'thing', id: 'live', name: tr('TV aberta', 'Live TV', 'TV en vivo'), also: Find.ALIASES.live,
          run: function () { if (bridge) bridge.openThing('live'); }});
        var channels = json(bridge ? bridge.channels() : '[]', []);
        for (i = 0; i < channels.length; i++) (function (c) {
          list.push({kind: 'channel', id: c.id, name: c.name, run: function () { if (bridge) bridge.openChannel(c.id); }});
        })(channels[i]);
        var names = window.BeyondTV.watchApps();
        for (i = 0; i < names.length; i++) (function (name) {
          list.push({kind: 'app', name: name, run: function () { window.BeyondTV.openApp(name); }});
        })(names[i]);
        done(list);
      },
      shows: window.Family.linked() ? function (q) { Ask.open(tr('Onde posso assistir ', 'Where can we watch ', '¿Dónde puedo ver ') + q + '?'); }
        : kid ? null : function (q) {
          if (!bridge || !bridge.shows(q)) window.BeyondTV.toast(tr('Procure no app da série: ', 'Look in the show\'s app for: ', 'Busca en la app de la serie: ') + q);
        },
      listen: bridge && bridge.canListen() ? function (h, f) { hearing = {heard: h, failed: f}; bridge.listen(); } : null
    }, {listen: listen});
  }

  /** What the TV opened this for: the orb (with a phone's question, asked straight away), the notes wall, or Find. */
  function start() {
    if (bridge) me = json(bridge.watcher(), me);
    var mode = bridge ? bridge.mode() : (/[?&]find/.test(location.search) ? 'find' : 'ask');
    if (mode === 'find') {
      openFind(bridge ? bridge.text() === 'listen' : false);
    } else if (mode === 'notes') {
      Notes.set(bridge ? json(bridge.notes(), []) : []);
      Notes.open();
    } else {
      var text = bridge ? bridge.text() : '';
      Ask.open(text || undefined, bridge ? bridge.from() : '', bridge && bridge.asker ? json(bridge.asker(), null) : null);
    }
    if (!UI.active() && bridge) setTimeout(function () { if (!UI.active()) bridge.close(); }, 2500);
  }

  /** A key from the remote. When the last screen closes, so does the activity. */
  function key(k) {
    if (UI.active()) UI.key(k);
    if (!UI.active() && bridge) bridge.close();
  }

  /** The TV answering one of `later`'s asks. */
  function done(id, status, res) {
    var f = waiting[id];
    delete waiting[id];
    if (f) f(status, res);
  }

  // A keyboard on a computer, when ask.html is opened in a browser to try it.
  if (!bridge) document.addEventListener('keydown', function (e) { key(e.keyCode === 27 ? 4 : e.keyCode); e.preventDefault(); });

  start();
  return {key: key, done: done, start: start, heard: heard};
})();
