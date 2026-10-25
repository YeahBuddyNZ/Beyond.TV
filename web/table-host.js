/*
 * The board and card games on Google TV (TableActivity, ADR 0024): table.html runs the same games as LG and Samsung in
 * a WebView, and this stands in for the home screen around them. Who's playing comes from the TV's People, the levels
 * are kept in the app's own files (BeyondTable.load and save), and the remote's keys arrive through TableHost.key.
 * Not loaded on LG or Samsung. Plain ES5.
 */
var TableHost = (function () {
  'use strict';

  var bridge = window.BeyondTable;
  var people = [];
  try { people = JSON.parse(bridge.people()) || []; } catch (e) { people = []; }
  var me = bridge ? bridge.current() : '';

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

  Table.open();
  return {key: key};
})();
