/*
 * The Morning board (ADR 0068): today for the whole house on one screen. Everyone's to-dos from Beyond Family, ticked
 * off with the remote; what's on the family calendar today, birthdays and tea (the house noticeboard, when the
 * household switched it on); and the weather. It opens from the sun button at the top of the home screen, and by
 * itself the first time the home screen shows between 5 and 10 in the morning (Show it each morning, on the board
 * itself, turns that off). Only when the TV is linked to Beyond Family.
 *
 * Same file on Google TV (TableActivity, start "morning": the data comes from BeyondTable.morning() and a tick goes
 * through the family wall's BeyondTable.tick()), LG and Samsung (Family and Data). Nothing is kept here but the day it last opened by
 * itself. Words in all five languages, like chores.js. Plain ES5.
 */
var Morning = (function () {
  'use strict';

  var KEY = 'btv.morning';
  var FROM = 5, UNTIL = 10;
  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function fill(t, a, b) { return L(t).replace('{a}', a).replace('{b}', b === undefined ? '' : b); }

  // MARK: - Words

  var MORNING = ['Bom dia, {a}', 'Mōrena, {a}', 'Buenos días, {a}', 'Guten Morgen, {a}', 'Доброе утро, {a}'];
  var DAY = ['Hoje, {a}', 'Today, {a}', 'Hoy, {a}', 'Heute, {a}', 'Сегодня, {a}'];
  var EVERYONE = ['família', 'whānau', 'familia', 'Familie', 'семья'];
  var TODOS = ['O que fazer', 'To-dos', 'Por hacer', 'Zu tun', 'Дела'];
  var NOTHING = ['Nada para hoje', 'Nothing today', 'Nada para hoy', 'Heute nichts', 'Сегодня ничего'];
  var ALL_DONE = ['Tudo feito!', 'All done!', '¡Todo hecho!', 'Alles erledigt!', 'Всё сделано!'];
  var LEFT = ['Faltam {a}', '{a} to go', 'Quedan {a}', 'Noch {a}', 'Осталось: {a}'];
  var CALENDAR = ['Na agenda', 'On today', 'Hoy en la agenda', 'Heute los', 'Сегодня в планах'];
  var ALL_DAY = ['O dia todo', 'All day', 'Todo el día', 'Ganztägig', 'Весь день'];
  var BIRTHDAY = ['Feliz aniversário, {a}!', 'Happy birthday, {a}!', '¡Feliz cumpleaños, {a}!', 'Alles Gute zum Geburtstag, {a}!', 'С днём рождения, {a}!'];
  var TEA = ['Jantar: {a}', 'Tea tonight: {a}', 'Cena: {a}', 'Abendessen: {a}', 'Ужин: {a}'];
  var NO_CALENDAR = ['Ligue o mural da casa no Beyond Family para ver a agenda aqui.',
    'Switch on the house noticeboard in Beyond Family to see the calendar here.',
    'Activa el tablón de la casa en Beyond Family para ver la agenda aquí.',
    'Schalte das Familienbrett in Beyond Family ein, um den Kalender hier zu sehen.',
    'Включите доску дома в Beyond Family, чтобы видеть здесь календарь.'];
  var EMPTY_DAY = ['Nada na agenda hoje.', 'Nothing on the calendar today.', 'Nada en la agenda hoy.', 'Heute nichts im Kalender.', 'Сегодня в календаре пусто.'];
  var HIGH_LOW = ['Máx. {a}, mín. {b}', 'High {a}, low {b}', 'Máx. {a}, mín. {b}', 'Höchst {a}, tiefst {b}', 'Днём {a}, ночью {b}'];
  var CHEER = [['Muito bem!', 'Ka pai!', '¡Bien hecho!', 'Super!', 'Молодец!'],
    ['Feito!', 'Done and dusted!', '¡Listo!', 'Erledigt!', 'Готово!'],
    ['Ótimo começo de dia!', 'Great start to the day!', '¡Buen comienzo del día!', 'Toller Start in den Tag!', 'Отличное начало дня!']];
  var UNDONE = ['Desmarcado.', 'Unticked.', 'Desmarcado.', 'Zurückgenommen.', 'Отметка снята.'];
  var OFFLINE = ['Não deu para marcar agora. Tente de novo.', "Couldn't tick that just now. Try again.", 'No se pudo marcar ahora. Inténtalo de nuevo.',
    'Konnte das gerade nicht abhaken. Versuch es nochmal.', 'Не получилось отметить. Попробуйте ещё раз.'];
  var READ_ONLY = ['Marque no app Beyond Family.', 'Tick this one in the Beyond Family app.', 'Márcalo en la app Beyond Family.',
    'Hak das in der Beyond Family App ab.', 'Отметьте это в приложении Beyond Family.'];
  var AUTO_ON = ['Aparecer toda manhã: sim', 'Show it each morning: on', 'Mostrar cada mañana: sí', 'Jeden Morgen zeigen: an', 'Показывать каждое утро: вкл'];
  var AUTO_OFF = ['Aparecer toda manhã: não', 'Show it each morning: off', 'Mostrar cada mañana: no', 'Jeden Morgen zeigen: aus', 'Показывать каждое утро: выкл'];
  var CLOSE = ['Fechar', 'Close', 'Cerrar', 'Schließen', 'Закрыть'];
  var HINT = ['OK marca uma tarefa feita', 'OK ticks a to-do off', 'OK marca una tarea', 'OK hakt eine Aufgabe ab', 'OK отмечает дело'];
  var WEEKDAYS = [['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']];

  // MARK: - The rules (no screen, no storage)

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function today(ms) { var d = new Date(ms); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }

  /** "Tuesday 24/11/2026": the day and the date the New Zealand way. */
  function dateLine(ms) {
    var d = new Date(ms), names = WEEKDAYS[LANG[window.I18N ? I18N.lang : 'en']] || WEEKDAYS[1];
    return names[d.getDay()] + ' ' + two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  /** Should the board open by itself now? Once a day, in the morning, when it's on and there's a family to show. */
  function due(s, ms, linked) {
    var h = new Date(ms).getHours();
    return !!linked && s.auto !== false && h >= FROM && h < UNTIL && s.shown !== today(ms);
  }

  /** A weather code as a picture anyone reads. */
  function weatherFace(code, day) {
    if (code === undefined || code === null || code < 0) return '';
    if (code <= 1) return day ? '☀️' : '🌙';
    if (code === 2) return day ? '⛅' : '☁️';
    if (code === 3 || code === 45 || code === 48) return '☁️';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '❄️';
    if (code >= 95) return '⛈️';
    return '🌧️';
  }

  /**
   * Each person's to-dos for today: Beyond Family's to-dos when it sends them (id, title, done), else a kid's daily
   * jobs from the jobs tile (by first name, ticks shown, no id so read only), else nothing. People with nothing to do
   * still show, so nobody is left off the board; kids first, then grown-ups, six at most.
   */
  function columns(people, tile) {
    var kids = [], grown = [];
    for (var i = 0; i < people.length; i++) {
      var p = people[i];
      if (!p || p.together || p.visitor || p.guest) continue;
      var todos = null;
      if (p.todos && p.todos.length !== undefined) todos = p.todos;
      else if (tile) for (var j = 0; j < tile.length; j++) if (tile[j].name === p.name) todos = tile[j].jobs;
      var list = [];
      for (var k = 0; todos && k < todos.length && list.length < 8; k++) {
        var t = todos[k];
        if (t && t.title) list.push({id: t.id || null, title: String(t.title), done: !!t.done});
      }
      (p.kid ? kids : grown).push({id: p.id, family: p.family || null, name: p.name, colour: p.colour, emoji: p.emoji, kid: !!p.kid, todos: list});
    }
    return kids.concat(grown).slice(0, 6);
  }

  /** What's on: birthdays first, then the calendar by time, then tea. */
  function happenings(board) {
    if (!board) return null;
    var out = [];
    for (var b = 0; b < (board.birthdays || []).length; b++) out.push({icon: '🎂', what: fill(BIRTHDAY, board.birthdays[b]), when: '', colour: null});
    var ev = board.events || [];
    for (var e = 0; e < ev.length; e++) {
      out.push({icon: '📅', what: ev[e].title, when: [ev[e].time || L(ALL_DAY), ev[e].who, ev[e].where].filter(function (x) { return x; }).join(' · '), colour: ev[e].colour || null});
    }
    if (board.tea) out.push({icon: '🍲', what: fill(TEA, board.tea), when: '', colour: null});
    return out;
  }

  var rules = {due: due, dateLine: dateLine, columns: columns, happenings: happenings, weatherFace: weatherFace, today: today, FROM: FROM, UNTIL: UNTIL};

  // MARK: - Where the day comes from

  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) {}
    return s && typeof s === 'object' ? s : {};
  }
  function store(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  /**
   * Today, wherever this is running: {home, people, tile, board, weather: {temp, max, min, code, day, cond}, linked}.
   * Google TV hands it over whole; LG and Samsung put it together from Family, Profiles and Data.
   */
  function source() {
    var b = window.BeyondTable;
    if (b && b.morning) {
      try { return JSON.parse(b.morning()) || {}; } catch (e) { return {}; }
    }
    var F = window.Family, out = {linked: !!(F && F.linked && F.linked())};
    if (!out.linked) return out;
    out.home = F.homeName();
    // Each person's to-dos come from the family wall's copy (Family.todos(), by member id), so a tick shows everywhere.
    var lists = F.todos ? F.todos() : {}, all = window.Profiles ? Profiles.list() : [];
    out.people = [];
    for (var a = 0; a < all.length; a++) {
      var q = {}, p = all[a];
      for (var key in p) if (p.hasOwnProperty(key)) q[key] = p[key];
      if (p.family && lists[p.family]) q.todos = lists[p.family];
      out.people.push(q);
    }
    out.board = F.board ? F.board() : null;
    var tiles = F.widgets ? F.widgets() : [];
    for (var i = 0; i < tiles.length; i++) if (tiles[i] && tiles[i].kind === 'jobs') out.tile = tiles[i].kids;
    var w = window.Data && Data.weather;
    if (w && (!window.Prefs || !Prefs.weather || Prefs.weather())) {
      out.weather = {temp: Data.degrees(w.temp), max: Data.degrees(w.max), min: Data.degrees(w.min), code: w.code, day: w.isDay,
        cond: Data.condition(w.code, w.isDay), city: Data.city || ''};
    }
    return out;
  }

  /** Ticks a to-do in Beyond Family through the family wall's tick, so the app, the points and every TV agree. done(ok). */
  var answers = {}, asked = 100000;   // apart from the wall's own numbers: TableActivity answers both with the same n
  function tick(todo, person, on, done) {
    var b = window.BeyondTable;
    if (b && b.wall) {
      // Google TV answers later, as Morning.answer(n, ok).
      var n = ++asked;
      answers[n] = done;
      try { b.tick(n, todo.id, person.family || '', !!on); } catch (e) { delete answers[n]; done(false); }
      return;
    }
    if (window.Family && Family.tickTodo) Family.tickTodo(todo.id, person.family, !!on, done);
    else done(false);
  }
  function answer(n, ok) { var f = answers[n]; delete answers[n]; if (f) f(!!ok); }

  // MARK: - The screen

  var showing = null, cheerAt = 0;

  function open() {
    if (showing) return;
    var s = load();
    s.shown = today(Date.now());
    store(s);
    var note = null;
    showing = UI.open({
      cls: 'bt-chores bt-morning',
      build: function (layer, api) {
        var day = source(), now = Date.now(), hour = new Date(now).getHours();
        var who = day.home ? day.home.replace(/^the\s+/i, '') : L(EVERYONE);
        var top = UI.el('div', 'ch-top', layer);
        UI.heading(top, hour < 12 ? fill(MORNING, who) : fill(DAY, who), dateLine(now));
        note = UI.el('div', 'ch-note', layer, '');

        // The weather, top right.
        var w = day.weather;
        if (w) {
          var wx = UI.el('div', 'mb-weather', layer);
          UI.el('div', 'face', wx, weatherFace(w.code, w.day !== false));
          var words = UI.el('div', 'words', wx);
          UI.el('div', 'now', words, w.temp + (w.cond ? ', ' + String(w.cond).toLowerCase() : ''));
          UI.el('div', 'range', words, fill(HIGH_LOW, w.max, w.min) + (w.city ? ' · ' + w.city : ''));
        }

        // Everyone's to-dos.
        var cols = UI.el('div', 'ch-cols mb-cols', layer);
        var everyone = columns(day.people || [], day.tile), n = Math.max(1, everyone.length);
        var width = Math.min(380, Math.floor((1240 - n * 24) / n)), first = true;
        for (var c = 0; c < everyone.length; c++) {
          (function (p) {
            var left = 0;
            for (var x = 0; x < p.todos.length; x++) if (!p.todos[x].done) left++;
            var col = UI.el('div', 'ch-col' + (p.todos.length && !left ? ' all' : '') + (p.todos.length > 5 ? ' many' : ''), cols);
            col.style.width = width + 'px';
            var head = UI.el('div', 'ch-head', col);
            UI.avatar(p, head, 84);
            var hw = UI.el('div', 'who', head);
            UI.el('div', 'n', hw, p.name);
            UI.el('div', 'stars', hw, !p.todos.length ? L(NOTHING) : left ? fill(LEFT, left) : L(ALL_DONE));
            for (var i = 0; i < p.todos.length; i++) {
              (function (t) {
                var tile = UI.el('div', 'ch-tile mb-todo' + (t.done ? ' on' : ''), col);
                UI.el('div', 'name', tile, t.title);
                UI.el('div', 'tick', tile, '✓');
                api.add(tile, function () {
                  if (!t.id || !p.family) { say(L(READ_ONLY)); return; }
                  var was = t.done;
                  tick(t, p, !was, function (ok) {
                    if (!ok) { say(L(OFFLINE)); return; }
                    t.done = !was;
                    if (window.Sfx) Sfx.play(was ? 'flip' : 'star');
                    api.rebuild();
                    say(was ? L(UNDONE) : L(CHEER[cheerAt++ % CHEER.length]));
                  });
                }, {first: first});
                first = false;
              })(p.todos[i]);
            }
          })(everyone[c]);
        }

        // What's on today.
        var cal = UI.el('div', 'mb-cal', layer);
        UI.el('div', 'mb-head', cal, L(CALENDAR));
        var list = happenings(day.board);
        if (!list) UI.el('div', 'mb-empty', cal, L(NO_CALENDAR));
        else if (!list.length) UI.el('div', 'mb-empty', cal, L(EMPTY_DAY));
        for (var r = 0; list && r < list.length && r < 7; r++) {
          var row = UI.el('div', 'mb-row', cal);
          var icon = UI.el('div', 'icon', row, list[r].icon);
          if (list[r].colour) icon.style.background = list[r].colour;
          var text = UI.el('div', 'text', row);
          UI.el('div', 'what', text, list[r].what);
          if (list[r].when) UI.el('div', 'when', text, list[r].when);
        }

        var foot = UI.el('div', 'ch-foot', layer);
        UI.el('div', 'mb-hint', foot, L(HINT));
        var close = UI.button(foot, L(CLOSE), null, 'primary');
        api.add(close, function () { api.close(); }, {first: first});
        var auto = UI.button(foot, load().auto === false ? L(AUTO_OFF) : L(AUTO_ON));
        api.add(auto, function () {
          var st = load();
          st.auto = st.auto === false;
          store(st);
          if (window.BeyondTable && BeyondTable.morningAuto) BeyondTable.morningAuto(st.auto);
          auto.textContent = st.auto ? L(AUTO_ON) : L(AUTO_OFF);
        });
      },
      closed: function () { showing = null; }
    });
    function say(text) {
      var el = note;
      if (!el) return;
      el.textContent = text;
      setTimeout(function () { UI.setClass(el, 'on', true); }, 20);
      setTimeout(function () { UI.setClass(el, 'on', false); }, 3000);
    }
  }

  /** The home screen is showing: open by itself if it's the first time this morning. */
  function maybe() {
    var linked = window.Family && Family.linked && Family.linked();
    if (!due(load(), Date.now(), linked)) return;
    if (window.UI && UI.active && UI.active()) return;
    open();
  }

  return {rules: rules, open: open, maybe: maybe, answer: answer};
})();
