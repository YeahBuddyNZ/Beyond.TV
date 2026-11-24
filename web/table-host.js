/*
 * The board and card games on Google TV (TableActivity, ADR 0024): table.html runs the same games as LG and Samsung in
 * a WebView, and this stands in for the home screen around them. Daily chores and the family scoreboard (chores.js, scores.js, ADR 0057) too, and the family wall and to-dos (wall.js, ADR 0066). The silly games (laughs.js), school lunches (lunch.js), the arcade (arcade.js), Remote Control Land (rcland.js), Candy Land (candy.js), Build it (builder.js), the light show (lights.js), Look around (skylook.js) and How to play (guides.js) run here too. Who's playing comes from the TV's People, the levels
 * are kept in the app's own files (BeyondTable.load and save), and the remote's keys arrive through TableHost.key.
 * Not loaded on LG or Samsung. Plain ES5.
 */
var TableHost = (function () {
  'use strict';

  var bridge = window.BeyondTable;
  var people = [];
  try { people = JSON.parse(bridge.people()) || []; } catch (e) { people = []; }
  var me = bridge ? bridge.current() : '';
  // Where the TV is, for the sky (sky.js reads Place). In a browser, Auckland.
  var where = {lat: -36.8485, lon: 174.7633, city: '', country: ''};
  try { if (bridge && bridge.place) where = JSON.parse(bridge.place()) || where; } catch (e) { /* keep Auckland */ }
  window.Place = where;

  I18N.set(bridge ? bridge.language() : 'auto');
  window.TV = {keys: {left: 37, up: 38, right: 39, down: 40, ok: 13, back: 4}, browser: false};
  window.BeyondTV = {toast: function (text) { if (bridge) bridge.toast(text); }};
  window.Profiles = {
    list: function () { return people.slice(); },
    current: function () {
      for (var i = 0; i < people.length; i++) if (people[i].id === me) return people[i];
      return {id: 'together', together: true};
    },
    guard: function (reason, then) {
      if (bridge && bridge.locked()) { UI.toast(tr('Peça para um adulto.', 'Ask a grown-up to do this.', 'Pídeselo a un adulto.')); return; }
      then();
    }
  };

  var stage = document.getElementById('stage');
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.webkitTransform = stage.style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  /** A key from the remote. When the last screen closes, so does the activity. */
  function key(k) {
    if (UI.active()) UI.key(k);
    if (!UI.active() && bridge) bridge.close();
  }

  // A keyboard on a computer, when table.html is opened in a browser to try it.
  if (!bridge) document.addEventListener('keydown', function (e) { key(e.keyCode === 27 ? 4 : e.keyCode); e.preventDefault(); });

  // In a browser, table.html?start=road opens a game straight away, to try it.
  var first = bridge && bridge.start ? bridge.start() : ((/[?&]start=(\w+)/.exec(location.search) || [])[1] || '');
  // A game for one asks Who's playing? first on the Family profile, so its points reach the scoreboard (ADR 0057).
  if (first === 'road' || first === 'bridge' || first === 'town') Scores.pick(function () { Builder.open(first); });
  else if (first === 'chores') Chores.open(); else if (first === 'wall') Wall.open(); else if (first === 'morning') Morning.open(); else if (first === 'scores') Scores.open();
  else if (first === 'silly') Laughs.open(); else if (first === 'lunch') Lunch.open(); else if (first === 'arcade') Scores.pick(function () { Arcade.open(); }); else if (first === 'rcland') Scores.pick(function () { RCLand.open(); }); else if (first === 'candy') Scores.pick(function () { Candy.open(); }); else if (first === 'sky') SkyLook.open(); else if (first === 'lights') Lights.open(); else if (first === 'guides') Guides.list(); else Table.open();
  return {key: key};
})();
