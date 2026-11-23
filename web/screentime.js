/*
 * Screen time (ADR 0060). A grown-up gives each kid a daily limit in their profile (Manage people, behind the PIN):
 * no limit, 30 minutes, or 1 to 3 hours. The TV counts the kid's time in other apps and in Plex, shows what's left
 * beside the greeting, says so kindly with 5 minutes to go, and once it's used up shows a gentle "that's screen time
 * for today" in place of the app. A grown-up's PIN adds 15 minutes. A new day starts fresh at midnight.
 * Kept on this TV only (localStorage), never sent anywhere. ScreenTime.java is the same on Google TV: change one,
 * change both. The sums are in ScreenTime.rules (tests/screentime.test.js). Plain ES5.
 */
var ScreenTime = (function () {
  'use strict';

  var KEY = 'bt.screentime';
  /** The limits a grown-up can pick, in minutes (0: no limit). */
  var CHOICES = [0, 30, 60, 90, 120, 180];
  var WARN = 5, MORE = 15;
  /** Away longer than this, the TV was most likely off: none of it counts. */
  var GAP = 6 * 3600000;
  /** The most one stretch away can count. */
  var STRETCH = 3 * 3600000;

  // MARK: - The sums (no screen, no storage)

  function day(t) {
    var d = new Date(t), m = d.getMonth() + 1, n = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (n < 10 ? '0' : '') + n;
  }

  function midnight(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

  /** A day's record, fresh when the day has changed (the limits stay). */
  function fresh(s, now) {
    s = s || {};
    if (!s.limits) s.limits = {};
    if (s.day !== day(now)) { s.day = day(now); s.used = {}; s.extra = {}; s.warned = {}; }
    if (!s.used) s.used = {};
    if (!s.extra) s.extra = {};
    if (!s.warned) s.warned = {};
    return s;
  }

  /** What a stretch away from the home screen counts, in ms: only today's part, none if it was hours (TV off). */
  function counted(from, to) {
    if (!from || to <= from || to - from > GAP) return 0;
    return Math.min(to - Math.max(from, midnight(to)), STRETCH);
  }

  /** Minutes left today for a person: Infinity without a limit, never below 0. */
  function minutesLeft(s, id) {
    var limit = s.limits[id];
    if (!limit) return Infinity;
    var ms = (limit + (s.extra[id] || 0)) * 60000 - (s.used[id] || 0);
    return Math.max(0, Math.ceil(ms / 60000));
  }

  /** "1 h 30 min", "45 min". */
  function label(min) {
    if (!min) return tr('sem limite', 'no limit', 'sin límite');
    var h = Math.floor(min / 60), m = min % 60;
    var mins = ' ' + tr('min', 'min', 'min'), hours = ' ' + tr('h', 'h', 'h');
    if (!h) return m + mins;
    return h + hours + (m ? ' ' + m + mins : '');
  }

  var rules = {CHOICES: CHOICES, day: day, fresh: fresh, counted: counted, minutesLeft: minutesLeft, label: label};

  // MARK: - On this TV

  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch (e) {}
    return fresh(s, Date.now());
  }

  function save(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  /** The watcher, when they're a kid with a limit; else null. */
  function limited() {
    var me = window.Profiles ? Profiles.current() : null;
    if (!me || !me.kid || me.together) return null;
    return load().limits[me.id] ? me : null;
  }

  var awayAt = 0, awayWho = null, showing = null;

  function add(id, ms) {
    if (!ms) return;
    var s = load();
    s.used[id] = (s.used[id] || 0) + ms;
    save(s);
  }

  /** The home screen went away (an app, or the TV off). */
  function away() {
    var me = limited();
    awayAt = Date.now();
    awayWho = me ? me.id : null;
  }

  /** The home screen is back: count the time away, then say how it's going. */
  function back() {
    if (awayWho) add(awayWho, counted(awayAt, Date.now()));
    awayAt = 0;
    awayWho = null;
    check();
  }

  // Plex plays inside Beyond TV: its player counts too, a little at a time.
  var lastTick = Date.now();
  setInterval(function () {
    var now = Date.now(), me = limited(), gap = now - lastTick;
    lastTick = now;
    if (!me || document.hidden || !document.querySelector('.layer.px-player') || gap > 120000) return;
    add(me.id, gap);
    check();
  }, 30000);

  /** Five minutes to go, or time's up. */
  function check() {
    var me = limited();
    if (!me) return;
    var s = load(), left = minutesLeft(s, me.id);
    if (left <= 0) { if (document.querySelector('.layer.px-player') && window.UI && UI.top()) UI.top().close(); timeUp(); return; }
    if (left <= WARN && !s.warned[me.id]) {
      s.warned[me.id] = true;
      save(s);
      UI.toast(tr(me.name + ', faltam ' + left + ' min de tela hoje. Hora de achar um bom lugar para parar.',
        left + ' minutes of screen time left, ' + me.name + '. Time to find a good place to stop.',
        me.name + ', quedan ' + left + ' min de pantalla hoy. Hora de buscar un buen momento para parar.'));
    }
  }

  /** May the watcher open an app? A kid whose time is used up gets the kind card instead. */
  function allowed() {
    var me = limited();
    if (!me || minutesLeft(load(), me.id) > 0) return true;
    timeUp();
    return false;
  }

  /** That's screen time for today: kind words, OK, or a grown-up's 15 more minutes. */
  function timeUp() {
    var me = limited();
    if (!me || showing) return;
    showing = UI.open({
      cls: 'bt-outside bt-karaoke bt-timeup',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        var face = UI.el('div', 'mic', box, '🌙');
        face.style.background = me.colour || '#6E3DDB';
        UI.el('div', 'who', box, tr('Por hoje é só, ' + me.name, "That's screen time for today, " + me.name, 'Eso es todo por hoy, ' + me.name));
        UI.el('div', 'bt-sub song', box, tr('Que bom que você assistiu! Que tal um jogo, um livro ou brincar lá fora?',
          'Great watching! How about a game, a book, or a run around outside?', '¡Qué bien lo pasaste! ¿Qué tal un juego, un libro o jugar fuera?'));
        UI.el('div', 'count', box, tr('Amanhã tem mais.', 'More tomorrow.', 'Mañana hay más.'));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, '✓  ' + tr('Combinado', 'OK', 'Vale'), null, 'primary'), function () { a.close(); }, {first: true});
        a.add(UI.button(row, tr('Adulto: mais 15 min', 'Grown-up: 15 more minutes', 'Adulto: 15 min más')), function () {
          Profiles.guard(tr('Mais 15 minutos', '15 more minutes', '15 minutos más'), function () {
            more(me.id, MORE);
            a.close();
          });
        });
        a.add(UI.button(row, tr('Trocar quem assiste', "Switch who's watching", 'Cambiar quién ve')), function () {
          a.close();
          Profiles.pick(false, function () {});
        });
      },
      closed: function () { showing = null; }
    });
  }

  /** A grown-up's extra minutes, for today only. */
  function more(id, min) {
    var s = load();
    s.extra[id] = (s.extra[id] || 0) + min;
    s.warned[id] = false;
    save(s);
    UI.toast(tr('Mais ' + min + ' minutos.', min + ' more minutes.', min + ' minutos más.'));
  }

  return {
    rules: rules,
    CHOICES: CHOICES,
    label: label,
    limit: function (id) { return load().limits[id] || 0; },
    setLimit: function (id, min) {
      var s = load();
      if (min) s.limits[id] = min; else delete s.limits[id];
      save(s);
    },
    /** "40 min of screen time left" for a kid with a limit, else ''. */
    line: function () {
      var me = limited();
      if (!me) return '';
      var left = minutesLeft(load(), me.id);
      return left <= 0 ? tr('tela encerrada por hoje', 'screen time done for today', 'pantalla terminada por hoy')
        : tr('⏳ ' + label(left) + ' de tela', '⏳ ' + label(left) + ' of screen time left', '⏳ ' + label(left) + ' de pantalla');
    },
    away: away,
    back: back,
    allowed: allowed,
    check: check
  };
})();
