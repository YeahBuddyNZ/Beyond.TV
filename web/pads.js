/*
 * Phone controllers (ADR 0080): a phone in Beyond Family turns into a game controller with a big d-pad and A and B.
 * Each press arrives as a "pad" command {button, memberId, name, colour} and goes into the game exactly like the
 * remote's own key (A is OK, B is Back), so every game that works with the remote works with a phone, and the remote
 * keeps working beside it. A game that wants to know who pressed reads Pads.from(): the player for a phone press,
 * null for the remote. Paddle uses it for two players (arcade.js).
 *
 * The page that loads this sets where keys go with Pads.to(fn): the home screen's key() on LG and Samsung,
 * TableHost.key in Google TV's TableActivity. Plain ES5.
 */
var Pads = (function () {
  'use strict';

  var BUTTONS = {up: 'up', down: 'down', left: 'left', right: 'right', a: 'ok', b: 'back'};
  var CODES = {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 4};
  var HELLO_AGAIN = 10 * 60 * 1000;

  var send = null, who = null, seen = {};

  function code(name) {
    var tv = typeof TV !== 'undefined' ? TV : (window.TV || null);
    if (tv && tv.keys && tv.keys[name] !== undefined) return tv.keys[name];
    return CODES[name];
  }

  /** The player a press came from, cleaned: an id, a first name and a colour. */
  function player(c) {
    var id = String(c.memberId || c.name || 'phone').slice(0, 64);
    var name = String(c.name || '').split(' ')[0].slice(0, 20);
    var colour = /^#[0-9a-fA-F]{6}$/.test(c.colour || '') ? c.colour : '#9E7BFF';
    return {id: id, name: name, colour: colour};
  }

  /** Says hello the first time someone presses, and again after ten quiet minutes. */
  function hello(p, now) {
    var last = seen[p.id];
    seen[p.id] = now;
    if (last && now - last < HELLO_AGAIN) return false;
    if (!p.name) return false;
    var text = '🎮 ' + p.name + tr(' pegou um controle', ' picked up a controller', ' tomó un mando');
    if (window.UI && UI.toast) UI.toast(text);
    else if (window.BeyondTV && BeyondTV.toast) BeyondTV.toast(text);
    return true;
  }

  /** One press from a phone. True if it went somewhere. */
  function press(c, now) {
    var name = BUTTONS[c && c.button];
    if (!name || !send) return false;
    var p = player(c);
    hello(p, now || Date.now());
    who = p;
    try { send(code(name)); } finally { who = null; }
    return true;
  }

  /** The phones heard from in the last ten minutes, newest first. */
  function players(now) {
    var out = [], t = now || Date.now();
    for (var id in seen) if (Object.prototype.hasOwnProperty.call(seen, id) && t - seen[id] < HELLO_AGAIN) out.push({id: id, at: seen[id]});
    out.sort(function (a, b) { return b.at - a.at; });
    return out;
  }

  return {
    to: function (fn) { send = fn; },
    press: press,
    from: function () { return who; },
    players: players,
    // For the tests.
    reset: function () { send = null; who = null; seen = {}; }
  };
})();
