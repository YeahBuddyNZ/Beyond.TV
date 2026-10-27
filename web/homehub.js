/*
 * Beyond Home on the TV: the house's rooms, its Moments (Movie night, Bedtime) and the one remote, from the family's
 * Beyond Home box (a Home Assistant box running the Beyond Home app) on the home network.
 *
 * Finding it: the box answers GET /tv/hi on port 8098 with {beyond: 'home'}. The TV tries the address it found last,
 * then the names Home Assistant uses (homeassistant.local, homeassistant), and CONFIG.homeHub if a build set one.
 * Nothing found, nothing shows: no tab, no card.
 *
 * Pairing: the TV says hello and gets back its own secret (kept here, never shown) and a six-letter code. Somebody
 * types the code in the Beyond Home app (Settings, TVs) and from then on the TV sees the rooms. Taken off there, the
 * box answers 401 and the TV forgets.
 *
 * The TV never sends a raw command: it asks for a named thing in a room (a Moment, louder, quieter, mute, on or off,
 * one thing on or off) and the box works out the rest and checks it against its own allow list. Nothing about what
 * anybody watches comes back.
 *
 * Plain ES5, like the rest of web/.
 */
var HomeHub = (function () {
  'use strict';

  var KEY = 'btv.home';
  var PORT = 8098;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  // base: the box's address. id, secret: this TV's, once it said hello. code: shown while waiting to be paired.
  var state = load();
  var rooms = null, found = false, changed = null, timer = 0, looking = false;

  function call(base, method, path, body, done, timeout) {
    var x = new XMLHttpRequest(), over = false;
    try { x.open(method, base + path, true); } catch (e) { done({status: 0}); return; }
    x.timeout = timeout || 8000;
    if (state.id && state.secret && base === state.base) x.setRequestHeader('Authorization', 'Bearer ' + state.id + '.' + state.secret);
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || over) return;
      over = true;
      var json = null;
      try { json = x.responseText ? JSON.parse(x.responseText) : {}; } catch (e) { json = {}; }
      if (x.status < 200 || x.status >= 300) { done({status: x.status, message: json && json.error}); return; }
      done(null, json, x.status);
    };
    x.ontimeout = x.onerror = function () { if (!over) { over = true; done({status: 0}); } };
    // No Content-Type: the box reads the body as text, and a plain request needs no preflight on old TVs.
    x.send(body === undefined ? null : JSON.stringify(body));
  }

  function candidates() {
    var out = [], add = function (b) { if (b && out.indexOf(b) < 0) out.push(b); };
    add(state.base);
    if (window.CONFIG && CONFIG.homeHub) add(String(CONFIG.homeHub).replace(/\/+$/, ''));
    add('http://homeassistant.local:' + PORT);
    add('http://homeassistant:' + PORT);
    return out;
  }

  function tell() { if (changed) changed(); }

  /** Looks for the box, one address at a time; done(true) once one answers. */
  function find(done) {
    if (looking) return;
    looking = true;
    var list = candidates(), i = 0;
    (function next() {
      if (i >= list.length) { looking = false; done(false); return; }
      var base = list[i++];
      call(base, 'GET', '/tv/hi', undefined, function (err, json) {
        if (err || !json || json.beyond !== 'home') { next(); return; }
        if (state.base !== base) { state = {base: base}; save(); }
        looking = false;
        done(true);
      }, 4000);
    })();
  }

  /** Asks the box for the rooms (or, while waiting, whether the code was typed yet). */
  function refresh() {
    if (!state.base) { look(); return; }
    if (!state.id) { tell(); return; }
    call(state.base, 'GET', '/tv/snapshot', undefined, function (err, json, status) {
      if (err && err.status === 401) { forget(); return; }
      if (err) { found = false; rooms = null; tell(); look(); return; }
      found = true;
      if (status === 202) { state.code = json.code; rooms = null; save(); tell(); return; }
      var was = !rooms;
      if (state.code) { state.code = ''; save(); }
      rooms = json.rooms || [];
      tell();
      if (was) UI.toast(tr('Beyond Home conectado', 'Beyond Home is on the TV now', 'Beyond Home conectado'));
    });
  }

  function look() {
    find(function (ok) {
      found = ok;
      if (ok && state.id) refresh();
      else tell();
    });
  }

  /** Taken off in the app (or the box was reset): back to a TV that only knows where the box is. */
  function forget() {
    state = {base: state.base};
    rooms = null;
    save();
    tell();
  }

  /** Says hello to the box and shows the code to type in the app. */
  function pair(done) {
    if (!state.base) { done(false); return; }
    var kind = window.TV && TV.name, name = kind === 'webos' ? 'LG TV' : kind === 'tizen' ? 'Samsung TV' : 'TV';
    call(state.base, 'POST', '/tv/hello', {name: name}, function (err, json) {
      if (err || !json || !json.id) { done(false); return; }
      state = {base: state.base, id: json.id, secret: json.secret, code: json.code};
      save();
      done(true);
    });
  }

  /** Asks for one named thing in a room: {room, do, moment?, thing?}. done(ok, message). */
  function act(ask, done) {
    if (!rooms) { done(false); return; }
    call(state.base, 'POST', '/tv/act', ask, function (err) {
      if (err && err.status === 401) { forget(); done(false); return; }
      done(!err, err && err.message);
      if (!err) setTimeout(refresh, 700);
    });
  }

  function room(id) {
    for (var i = 0; rooms && i < rooms.length; i++) if (rooms[i].id === id) return rooms[i];
    return null;
  }

  /** How often to ask: every few seconds while somebody looks at the rooms, every minute otherwise. */
  function pace(fast) {
    clearInterval(timer);
    timer = setInterval(refresh, fast ? 4000 : 60000);
  }

  function start(onChange) {
    changed = onChange;
    look();
    pace(false);
    // Not found yet? Look again now and then: the box may be switched on later.
    setInterval(function () { if (!found) look(); }, 10 * 60 * 1000);
  }

  return {
    start: start,
    refresh: refresh,
    pace: pace,
    pair: pair,
    act: act,
    room: room,
    /** 'none' (no box on this network), 'found' (not paired), 'waiting' (code on screen), 'paired'. */
    status: function () { return !found ? 'none' : rooms ? 'paired' : state.id ? 'waiting' : 'found'; },
    code: function () { return state.code || ''; },
    rooms: function () { return rooms || []; },
    /** The box's name or address once found ("homeassistant.local"), else null: Music looks there too. */
    host: function () { return found && state.base ? state.base.replace(/^https?:\/\//, '').replace(/:\d+$/, '') : null; }
  };
})();
