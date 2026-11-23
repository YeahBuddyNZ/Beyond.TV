/*
 * Daily chores (ADR 0057): the day's little jobs for each kid on the TV, ticked off with the remote. Each one is a star
 * to spend at the Star Stall in Candy Land (candy.js) and a point on the family scoreboard (scores.js); all of today's
 * done is the daily challenge, two stars more. A chore ticked by mistake unticks with OK again. Taking part in the tidy-up race
 * ticks Tidy my room by itself. A grown-up picks which chores count (Change the chores, behind the grown-up PIN).
 *
 * A new day starts the ticks again; stars keep. Everything stays in the TV's own storage (btv.chores); nothing is sent.
 * Same file on Google TV (TableActivity, start "chores"), LG and Samsung. Words in all five languages, like candy.js.
 * Plain ES5.
 */
var Chores = (function () {
  'use strict';

  var KEY = 'btv.chores', BONUS = 2;
  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function fill(t, n) { return L(t).replace('{n}', n); }

  // MARK: - The chores (pictures: web/games/chore-<id>.jpg, tools/game_art.js)

  var LIST = [
    {id: 'bed', name: ['Arrumar a cama', 'Make my bed', 'Hacer la cama', 'Bett machen', 'Заправить кровать']},
    {id: 'dressed', name: ['Me vestir', 'Get dressed', 'Vestirme', 'Anziehen', 'Одеться']},
    {id: 'teeth', name: ['Escovar os dentes', 'Brush my teeth', 'Lavarme los dientes', 'Zähne putzen', 'Почистить зубы']},
    {id: 'room', name: ['Arrumar o quarto', 'Tidy my room', 'Ordenar mi cuarto', 'Zimmer aufräumen', 'Убрать в комнате']},
    {id: 'clothes', name: ['Guardar as roupas', 'Put my clothes away', 'Guardar la ropa', 'Kleidung wegräumen', 'Убрать одежду']},
    {id: 'table', name: ['Ajudar a pôr a mesa', 'Help set the table', 'Ayudar a poner la mesa', 'Tisch decken helfen', 'Помочь накрыть на стол']},
    {id: 'pets', name: ['Dar comida aos bichos', 'Feed the pets', 'Dar de comer a las mascotas', 'Haustiere füttern', 'Покормить питомцев']},
    {id: 'bag', name: ['Arrumar a mochila', 'Pack my school bag', 'Preparar la mochila', 'Schultasche packen', 'Собрать рюкзак']}
  ];
  var DEFAULT = ['bed', 'dressed', 'teeth', 'room', 'clothes'];

  // MARK: - Words

  var TITLE = ['Tarefas do dia', 'Daily chores', 'Tareas del día', 'Tägliche Aufgaben', 'Дела на день'];
  var SUB = ['Aperte OK em cada tarefa feita. Cada uma vale uma estrela para gastar na Terra dos Doces.',
    'Press OK on each one when it\'s done. Every chore is a star to spend in Candy Land.',
    'Pulsa OK en cada tarea hecha. Cada una es una estrella para gastar en la Tierra de los Dulces.',
    'Drück OK auf jede erledigte Aufgabe. Jede ist ein Stern zum Ausgeben im Zuckerland.',
    'Нажимайте OK на каждом сделанном деле. За каждое дело звезда для Сладкой страны.'];
  var STARS = ['{n} estrelas', '{n} stars', '{n} estrellas', '{n} Sterne', 'Звёзд: {n}'];
  var ONE_STAR = ['1 estrela', '1 star', '1 estrella', '1 Stern', '1 звезда'];
  var LEFT_TODAY = ['Faltam {n} hoje', '{n} to go today', 'Quedan {n} hoy', 'Noch {n} heute', 'Осталось сегодня: {n}'];
  var DONE_TODAY = ['Desafio cumprido! +2 estrelas', 'Challenge done! +2 stars', '¡Reto cumplido! +2 estrellas', 'Geschafft! +2 Sterne', 'Готово! +2 звезды'];
  var CHEER = [['Uma estrela para você!', 'A star for you!', '¡Una estrella para ti!', 'Ein Stern für dich!', 'Звезда твоя!'],
    ['Ka pai! Muito bem!', 'Ka pai! Nice work!', '¡Ka pai! ¡Buen trabajo!', 'Ka pai! Gut gemacht!', 'Ка пай! Отлично!'],
    ['Que ajudante!', 'What a helper!', '¡Qué ayudante!', 'Was für ein Helfer!', 'Вот это помощник!']];
  var ALL_DONE = ['Todas as tarefas de hoje! Desafio cumprido, {n}!', 'Every chore today! Challenge done, {n}!', '¡Todas las tareas de hoy! ¡Reto cumplido, {n}!', 'Alle Aufgaben von heute! Geschafft, {n}!', 'Все дела на сегодня! Молодец, {n}!'];
  var UNDONE = ['Desmarcado.', 'Unticked.', 'Desmarcado.', 'Abgehakt zurückgenommen.', 'Отметка снята.'];
  var SPEND = ['Gastar na Terra dos Doces', 'Spend in Candy Land', 'Gastar en la Tierra de los Dulces', 'Im Zuckerland ausgeben', 'Потратить в Сладкой стране'];
  var CHANGE = ['Mudar as tarefas', 'Change the chores', 'Cambiar las tareas', 'Aufgaben ändern', 'Изменить дела'];
  var CHANGE_SUB = ['Escolha as tarefas que contam todo dia. OK liga ou desliga.', 'Pick the chores that count each day. OK turns one on or off.', 'Elige las tareas que cuentan cada día. OK activa o desactiva.', 'Wähl die Aufgaben, die jeden Tag zählen. OK schaltet sie an oder aus.', 'Выберите дела на каждый день. OK включает или выключает.'];
  var SCOREBOARD = ['Placar da família', 'Family scoreboard', 'Marcador familiar', 'Familien-Punktetafel', 'Семейная таблица очков'];
  var DONE = ['Pronto', 'Done', 'Listo', 'Fertig', 'Готово'];
  var CLOSE = ['Fechar', 'Close', 'Cerrar', 'Schließen', 'Закрыть'];
  var KEEP_ONE = ['Deixe pelo menos uma tarefa.', 'Keep at least one chore.', 'Deja al menos una tarea.', 'Lass mindestens eine Aufgabe an.', 'Оставьте хотя бы одно дело.'];
  var FAMILY = ['Família', 'Family', 'Familia', 'Familie', 'Семья'];

  // MARK: - Saved on this TV

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function today(ms) { var d = new Date(ms || Date.now()); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }

  /** {on: [chore ids], day, done: {person: [chore ids]}, bonus: {person: true}, tidied: [tidy entries used], stars: {person: n}} */
  function load(at) {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    var out = {on: Array.isArray(s.on) && s.on.length ? s.on.filter(known) : DEFAULT.slice(), day: typeof s.day === 'string' ? s.day : '',
      done: s.done && typeof s.done === 'object' ? s.done : {}, bonus: s.bonus && typeof s.bonus === 'object' ? s.bonus : {},
      tidied: Array.isArray(s.tidied) ? s.tidied : [], stars: s.stars && typeof s.stars === 'object' ? s.stars : {}};
    if (!out.on.length) out.on = DEFAULT.slice();
    // A new day: fresh ticks, the stars stay.
    if (out.day !== today(at)) { out.day = today(at); out.done = {}; out.bonus = {}; out.tidied = []; }
    return out;
  }
  function store(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function known(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return true; return false; }
  function chore(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }

  function doneFor(s, pid) { return Array.isArray(s.done[pid]) ? s.done[pid] : []; }
  function starsFor(s, pid) { var n = s.stars[pid]; return typeof n === 'number' && n > 0 ? Math.floor(n) : 0; }
  function allDone(s, pid) {
    var d = doneFor(s, pid);
    for (var i = 0; i < s.on.length; i++) if (d.indexOf(s.on[i]) < 0) return false;
    return true;
  }

  /**
   * Ticks a chore, or unticks it. Returns {ticked, bonus, stars}: a tick is a star and a point, the last of today's
   * two more of each; an untick takes them back (never below no stars).
   */
  function toggle(s, person, id, at) {
    var pid = person.id, d = doneFor(s, pid).slice(), i = d.indexOf(id), out = {ticked: i < 0, bonus: false};
    if (i < 0) {
      d.push(id); s.done[pid] = d;
      s.stars[pid] = starsFor(s, pid) + 1;
      if (window.Scores) Scores.add(person, 'chores', 1, at);
      if (!s.bonus[pid] && allDone(s, pid)) {
        s.bonus[pid] = true; out.bonus = true;
        s.stars[pid] = starsFor(s, pid) + BONUS;
        if (window.Scores) Scores.add(person, 'chores', BONUS, at);
      }
    } else {
      d.splice(i, 1); s.done[pid] = d;
      var back = 1;
      if (s.bonus[pid]) { s.bonus[pid] = false; back += BONUS; }
      s.stars[pid] = Math.max(0, starsFor(s, pid) - back);
      if (window.Scores) Scores.add(person, 'chores', -back, at);
    }
    out.stars = starsFor(s, pid);
    return out;
  }

  /** Anyone who did the tidy-up race today gets Tidy my room ticked, once (Google TV's race comes through Scores). */
  function fromTidy(s, people) {
    if (!window.Scores || s.on.indexOf('room') < 0) return false;
    var log = Scores.rules.load().log, changed = false;
    try { if (window.BeyondTable && BeyondTable.scores) log = log.concat(JSON.parse(BeyondTable.scores()) || []); } catch (e) {}
    for (var i = 0; i < log.length; i++) {
      var e = log[i], k = e && e.p + '|' + e.t;
      if (!e || e.g !== 'tidy' || today(e.t) !== s.day || s.tidied.indexOf(k) >= 0) continue;
      s.tidied.push(k);
      for (var j = 0; j < people.length; j++) {
        if (people[j].id === e.p && doneFor(s, e.p).indexOf('room') < 0) { toggle(s, people[j], 'room'); changed = true; }
      }
    }
    return changed;
  }

  // MARK: - Who does chores

  function people() {
    var all = window.Profiles ? Profiles.list() : [], kids = [], grown = [];
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (!p || p.together || p.visitor || p.guest) continue;
      (p.kid ? kids : grown).push(p);
    }
    var list = kids.length ? kids : grown;
    return list.length ? list.slice(0, 6) : [{id: 'family', name: L(FAMILY), colour: '#6E3DDB', together: true}];
  }

  // MARK: - The screen

  var CHEER_AT = 0;
  function sound(kind) { if (window.Sfx) Sfx.play(kind); }

  function open() {
    var s = load(), everyone = people();
    fromTidy(s, everyone);
    store(s);
    var me = window.Profiles && Profiles.current ? Profiles.current() : null, firstCol = 0;
    for (var k = 0; k < everyone.length; k++) if (me && everyone[k].id === me.id) firstCol = k;
    var note = null;
    UI.open({
      cls: 'bt-chores',
      build: function (layer, api) {
        s = load();
        var top = UI.el('div', 'ch-top', layer);
        UI.heading(top, L(TITLE), L(SUB));
        note = UI.el('div', 'ch-note', layer, '');
        var cols = UI.el('div', 'ch-cols', layer);
        var n = everyone.length, w = Math.min(440, Math.floor((1760 - (n - 1) * 28) / n));
        for (var c = 0; c < n; c++) {
          (function (p) {
            var col = UI.el('div', 'ch-col' + (allDone(s, p.id) ? ' all' : '') + (s.on.length > 5 ? ' many' : ''), cols);
            col.style.width = w + 'px';
            var head = UI.el('div', 'ch-head', col);
            UI.avatar(p, head, 84);
            var hw = UI.el('div', 'who', head);
            UI.el('div', 'n', hw, p.name);
            var st = starsFor(s, p.id);
            UI.el('div', 'stars', hw, '★ ' + (st === 1 ? L(ONE_STAR) : fill(STARS, st)));
            var left = 0, d = doneFor(s, p.id);
            for (var i = 0; i < s.on.length; i++) {
              (function (id, first) {
                var ch = chore(id), on = d.indexOf(id) >= 0;
                if (!on) left++;
                var tile = UI.el('div', 'ch-tile' + (on ? ' on' : ''), col);
                var pic = UI.el('div', 'pic', tile);
                pic.style.backgroundImage = 'url(games/chore-' + id + '.jpg)';
                UI.el('div', 'name', tile, L(ch.name));
                UI.el('div', 'tick', tile, '✓');
                api.add(tile, function () {
                  var r = toggle(s, p, id);
                  store(s);
                  // Built again first, so the words land on the new screen.
                  api.rebuild();
                  if (!r.ticked) { sound('flip'); say(L(UNDONE)); }
                  else if (r.bonus) { sound('win'); say(fill(ALL_DONE, p.name)); }
                  else { sound('star'); say(L(CHEER[CHEER_AT++ % CHEER.length])); }
                }, {first: first});
              })(s.on[i], c === firstCol && i === 0);
            }
            UI.el('div', 'ch-left', col, left ? fill(LEFT_TODAY, left) : L(DONE_TODAY));
            if (window.Candy && !p.together) {
              api.add(UI.button(col, L(SPEND), null, 'ch-spend'), function () {
                if (window.Scores) Scores.setPlayer(p);
                // Candy Land opens on top, so leaving it comes back here with the stars left.
                Candy.open('stall', function () { if (UI.top() === api) api.rebuild(); });
              });
            }
          })(everyone[c]);
        }
        var foot = UI.el('div', 'ch-foot', layer);
        api.add(UI.button(foot, L(CHANGE)), function () {
          var guard = window.Profiles && Profiles.guard ? Profiles.guard : function (r, then) { then(); };
          guard(L(CHANGE), function () { change(function () { api.rebuild(); }); });
        });
        if (window.Scores) api.add(UI.button(foot, L(SCOREBOARD)), function () { api.close(); Scores.open(); });
        api.add(UI.button(foot, L(CLOSE), null, 'close'), function () { api.close(); });
      }
    });
    function say(text) {
      var n = note;
      if (!n) return;
      n.textContent = text;
      setTimeout(function () { UI.setClass(n, 'on', true); }, 20);
      setTimeout(function () { UI.setClass(n, 'on', false); }, 3500);
    }
  }

  /** A grown-up picks which chores count each day. */
  function change(done) {
    UI.open({
      cls: 'bt-chores ch-change',
      build: function (layer, api) {
        var s = load();
        UI.heading(UI.el('div', 'ch-top', layer), L(CHANGE), L(CHANGE_SUB));
        var grid = UI.el('div', 'ch-grid', layer);
        for (var i = 0; i < LIST.length; i++) {
          (function (ch, first) {
            var on = s.on.indexOf(ch.id) >= 0;
            var tile = UI.el('div', 'ch-tile' + (on ? ' on' : ''), grid);
            var pic = UI.el('div', 'pic', tile);
            pic.style.backgroundImage = 'url(games/chore-' + ch.id + '.jpg)';
            UI.el('div', 'name', tile, L(ch.name));
            UI.el('div', 'tick', tile, '✓');
            api.add(tile, function () {
              var now = load(), at = now.on.indexOf(ch.id);
              if (at >= 0 && now.on.length === 1) { UI.toast(L(KEEP_ONE)); return; }
              if (at >= 0) now.on.splice(at, 1);
              else now.on = LIST.map(function (c) { return c.id; }).filter(function (id) { return id === ch.id || now.on.indexOf(id) >= 0; });
              store(now);
              api.rebuild();
            }, {first: first});
          })(LIST[i], i === 0);
        }
        var foot = UI.el('div', 'ch-foot', layer);
        api.add(UI.button(foot, L(DONE), null, 'primary'), function () { api.close(); });
      },
      closed: function () { if (done) done(); }
    });
  }

  // MARK: - Stars, for the Star Stall in Candy Land

  function stars(pid) { return starsFor(load(), pid); }
  /** Spends n of someone's stars: true when they had enough. */
  function spend(pid, n) {
    var s = load();
    if (!pid || n <= 0 || starsFor(s, pid) < n) return false;
    s.stars[pid] = starsFor(s, pid) - n;
    store(s);
    return true;
  }
  /** Everyone who could spend stars, with how many: [{person, stars}]. */
  function wallets() {
    var s = load();
    return people().filter(function (p) { return !p.together; }).map(function (p) { return {person: p, stars: starsFor(s, p.id)}; });
  }

  return {open: open, stars: stars, spend: spend, wallets: wallets,
    rules: {LIST: LIST, DEFAULT: DEFAULT, BONUS: BONUS, load: load, store: store, toggle: toggle, allDone: allDone, today: today, fromTidy: fromTidy,
      words: function () { return [TITLE, SUB, STARS, ONE_STAR, LEFT_TODAY, DONE_TODAY, ALL_DONE, UNDONE, SPEND, CHANGE, CHANGE_SUB, SCOREBOARD, DONE, CLOSE, KEEP_ONE, FAMILY].concat(CHEER); }}};
})();
