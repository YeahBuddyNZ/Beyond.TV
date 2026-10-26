/*
 * Ask Beyond and the notes on Google TV (AskActivity, ADR 0025): ask.html runs the same ask.js and notes.js as LG and
 * Samsung in a WebView, and this stands in for the home screen around them. Beyond Family is asked through the TV
 * (BeyondAsk.call, with the TV's own id), card pictures come from TMDB through it too (the key stays in Java), and the
 * remote's keys arrive through AskHost.key. Not loaded on LG or Samsung. Plain ES5.
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
    ask: function (text, apps, together, done) {
      call('POST', '/tv/ask', {ask: String(text).slice(0, 200), apps: (apps || []).slice(0, 40), memberId: me.member || undefined,
        together: together || undefined}, done);
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

  /** What the TV opened this for: the orb (with a phone's question, asked straight away) or the notes wall. */
  function start() {
    if (bridge) me = json(bridge.watcher(), me);
    var mode = bridge ? bridge.mode() : 'ask';
    if (mode === 'notes') {
      Notes.set(bridge ? json(bridge.notes(), []) : []);
      Notes.open();
    } else {
      var text = bridge ? bridge.text() : '';
      Ask.open(text || undefined, bridge ? bridge.from() : '');
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
  return {key: key, done: done, start: start};
})();
