/*
 * Once a day the TV tells Beyond it is out there and how it is getting on, so a problem on one make of TV can be
 * fixed for everybody before anybody has to ask: a made-up id, the city (to about 10km), the make and model, the
 * versions, how often it opened and its own last errors. Never what anybody watches, never an address, never a
 * name. Home Settings › Help fix problems turns it off and asks Beyond to forget this TV.
 *
 * Plain ES5, like the rest of web/.
 */
var Checkin = (function () {
  'use strict';

  var KEY = 'btv.checkin', OFF = 'btv.checkin.off';
  var API = (window.CONFIG && CONFIG.familyApi) || 'https://beyondfamily.app/api';
  var DAY = 24 * 60 * 60 * 1000, HOUR = 60 * 60 * 1000, KEEP = 20;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  var state = load();

  function on() { try { return localStorage.getItem(OFF) !== '1'; } catch (e) { return true; } }

  function post(path, body, done) {
    var x = new XMLHttpRequest(), over = false;
    x.open('POST', API + path, true);
    x.timeout = 20000;
    x.setRequestHeader('Content-Type', 'application/json');
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || over) return;
      over = true;
      if (done) done(x.status >= 200 && x.status < 300);
    };
    x.ontimeout = x.onerror = function () { if (!over) { over = true; if (done) done(false); } };
    x.send(JSON.stringify(body));
  }

  /** A random v4 uuid, made here: it names this TV and nothing else. */
  function newId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  function cut(s, max) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); return s.length > max ? s.slice(0, max) : s; }

  function roughly(v) { var n = parseFloat(v); return isFinite(n) ? Math.round(n * 10) / 10 : null; }

  function error(where, text) {
    if (!on()) return;
    state.errors = (state.errors || []).concat([{at: new Date().getTime(), where: cut(where, 40), text: cut(text, 300)}]).slice(-KEEP);
    save();
    later(HOUR);
  }

  var timer = null;
  /** Sends now when a day has passed, or an hour after something went wrong; otherwise when it will be due. */
  function later(min) {
    clearTimeout(timer);
    if (!on()) return;
    var since = new Date().getTime() - (state.sent || 0);
    var wait = Math.max(0, (state.errors && state.errors.length ? HOUR : DAY) - since);
    timer = setTimeout(send, Math.max(wait, min || 0));
  }

  function send() {
    if (!on()) return;
    if (!state.id) state.id = newId();
    state.sent = new Date().getTime();   // one try a day even when Beyond can't be reached
    save();
    var errors = (state.errors || []).slice(), opens = state.opens || 0;
    TV.info(function (tv) {
      var body = {id: state.id, platform: TV.name === 'webos' ? 'webos' : 'tizen', brand: cut(tv.brand, 40), model: cut(tv.model, 60),
        version: cut((window.CONFIG && CONFIG.version) || '', 30), os: cut(tv.os, 20), opens: Math.min(10000, opens), crashes: 0,
        errors: errors};
      if (Place.city) body.city = cut(Place.city, 60);
      if (/^[A-Z]{2}$/.test(Place.country)) body.country = Place.country;
      var lat = roughly(Place.lat), lng = roughly(Place.lon);
      if (lat !== null && lng !== null) { body.lat = lat; body.lng = lng; }
      post('/tv/checkin', body, function (ok) {
        if (!ok) { later(); return; }
        state = load();   // anything that came in while we were sending stays for next time
        state.opens = Math.max(0, (state.opens || 0) - opens);
        state.errors = (state.errors || []).slice(errors.length);
        save();
        later();
      });
    });
  }

  function start() {
    if (TV.name === 'browser' || !on()) return;   // the browser preview never checks in
    state.opens = (state.opens || 0) + 1;
    save();
    later(30 * 1000);
  }

  function set(yes) {
    if (yes) {
      try { localStorage.removeItem(OFF); } catch (e) {}
      start();
      return;
    }
    try { localStorage.setItem(OFF, '1'); } catch (e) {}
    clearTimeout(timer);
    var id = state.id;
    state = {};
    try { localStorage.removeItem(KEY); } catch (e) {}
    if (id) post('/tv/checkin/forget', {id: id});
  }

  // The home screen's own errors, from now on.
  window.addEventListener('error', function (e) {
    var where = e && e.filename ? e.filename.slice(e.filename.lastIndexOf('/') + 1) + ':' + e.lineno : 'web';
    error(where, (e && e.message) || 'error');
  });

  return {on: on, set: set, start: start, error: error};
})();
