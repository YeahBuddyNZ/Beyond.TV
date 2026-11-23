/*
 * The family scoreboard (ADR 0057): points from every game and every chore, per person, a week at a time (Monday to
 * Sunday on the TV's clock). Win a game: 3 points. Finish one: 1 or 2. Each chore ticked: 1, and 2 more for all of
 * today's. When a week ends everyone who scored gets their own award for the thing they did best (Arcade ace, Chore
 * champion), and whoever has the most is the week's champion, so every kid wins something.
 *
 * Who scores: a game with players (the board games, the silly games, the tidy-up race) names them; a game for one
 * (the arcade, Remote Control Land, Candy Land, Build it) gives its points to whoever is watching, or, on the Family
 * profile, to whoever said "that's me" on Who's playing? before it started (pick). Kept in the TV's own storage
 * (btv.scores), ten weeks of it; nothing is sent. Google TV's own tidy-up race (TidyActivity) keeps its places in the
 * app's files (ScoreLog.java), read here through BeyondTable.scores.
 *
 * Same file on Google TV (TableActivity, start "scores"), LG and Samsung. Words in all five languages, like candy.js.
 * Plain ES5.
 */
var Scores = (function () {
  'use strict';

  var KEY = 'btv.scores', WEEKS = 10, MAX = 3000, DAY = 86400000;
  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function fill(t, a, b) { return L(t).replace('{n}', a).replace('{m}', b); }

  // MARK: - Words

  /** Each game's name on the board and the award for doing best at it. Games not listed count as 'games'. */
  var GAMES = {
    chores: {name: ['Tarefas', 'Chores', 'Tareas', 'Aufgaben', 'Дела'],
      award: ['Campeão das tarefas', 'Chore champion', 'Campeón de las tareas', 'Aufgaben-Champion', 'Чемпион по делам']},
    tidy: {name: ['Corrida da arrumação', 'Tidy-up race', 'Carrera de ordenar', 'Aufräum-Rennen', 'Гонка уборки'],
      award: ['Relâmpago da arrumação', 'Tidy-up flash', 'Rayo del orden', 'Aufräum-Blitz', 'Молния уборки']},
    table: {name: ['Jogos de tabuleiro', 'Board games', 'Juegos de mesa', 'Brettspiele', 'Настольные игры'],
      award: ['Mestre dos tabuleiros', 'Board game boss', 'Maestro de los juegos de mesa', 'Brettspiel-Boss', 'Босс настольных игр']},
    silly: {name: ['Jogos bobos', 'Silly games', 'Juegos locos', 'Lustige Spiele', 'Смешные игры'],
      award: ['Rei da bobeira', 'Silliest of all', 'Rey de las risas', 'Albernste von allen', 'Главный весельчак']},
    arcade: {name: ['Fliperama', 'Arcade', 'Arcade', 'Arcade', 'Аркада'],
      award: ['Ás do fliperama', 'Arcade ace', 'As del arcade', 'Arcade-Ass', 'Ас аркады']},
    rcland: {name: ['Terra do Controle Remoto', 'Remote Control Land', 'Tierra Teledirigida', 'Fernsteuer-Land', 'Страна радиоуправления'],
      award: ['Estrela das manobras', 'Stunt star', 'Estrella de las acrobacias', 'Stunt-Star', 'Звезда трюков']},
    candy: {name: ['Terra dos Doces', 'Candy Land', 'Tierra de los Dulces', 'Zuckerland', 'Сладкая страна'],
      award: ['Brilho da Terra dos Doces', 'Candy Land sparkler', 'Destello de los dulces', 'Zuckerland-Glitzer', 'Сладкая звёздочка']},
    build: {name: ['Construir', 'Build it', 'A construir', 'Bauen', 'Стройка'],
      award: ['Mestre de obras', 'Master builder', 'Maestro de obras', 'Baumeister', 'Мастер-строитель']},
    games: {name: ['Jogos', 'Games', 'Juegos', 'Spiele', 'Игры'],
      award: ['Estrela dos jogos', 'Games star', 'Estrella de los juegos', 'Spiele-Star', 'Звезда игр']}
  };
  /** Build it's three jobs and the board games' ids all count under one name each. */
  var GROUP = {road: 'build', bridge: 'build', town: 'build', ludo: 'table', chess: 'table', snap: 'table', sheep: 'table', penguin: 'table', volcano: 'table'};

  var TITLE = ['Placar da família', 'Family scoreboard', 'Marcador familiar', 'Familien-Punktetafel', 'Семейная таблица очков'];
  var THIS_WEEK = ['Esta semana', 'This week', 'Esta semana', 'Diese Woche', 'Эта неделя'];
  var LAST_WEEK = ['Semana passada', 'Last week', 'La semana pasada', 'Letzte Woche', 'Прошлая неделя'];
  var DAYS_LEFT = ['Faltam {n} dias, de segunda a domingo.', '{n} days to go. Weeks run Monday to Sunday.', 'Quedan {n} días, de lunes a domingo.', 'Noch {n} Tage. Eine Woche geht von Montag bis Sonntag.', 'Осталось дней: {n}. Неделя с понедельника по воскресенье.'];
  var LAST_DAY = ['Último dia! A semana acaba hoje à noite.', 'Last day! The week ends tonight.', '¡Último día! La semana acaba esta noche.', 'Letzter Tag! Die Woche endet heute Nacht.', 'Последний день! Неделя заканчивается сегодня.'];
  var WINNERS = ['Os vencedores da semana passada', 'Last week\'s winners', 'Los ganadores de la semana pasada', 'Die Gewinner der letzten Woche', 'Победители прошлой недели'];
  var EVERYONE = ['Cada um ganhou o seu prêmio. Muito bem!', 'Everyone won their own award. Well done!', 'Cada uno ganó su premio. ¡Muy bien!', 'Jeder hat seinen eigenen Preis gewonnen. Gut gemacht!', 'Каждый получил свою награду. Молодцы!'];
  var CHAMPION = ['Campeão da semana', 'Champion of the week', 'Campeón de la semana', 'Champion der Woche', 'Чемпион недели'];
  var LEADING = ['Na frente', 'In the lead', 'En cabeza', 'Vorne', 'Впереди'];
  var POINTS = ['{n} pontos', '{n} points', '{n} puntos', '{n} Punkte', 'Очков: {n}'];
  var ONE_POINT = ['1 ponto', '1 point', '1 punto', '1 Punkt', '1 очко'];
  var EMPTY = ['Ninguém marcou pontos ainda esta semana.', 'No points yet this week.', 'Nadie ha sumado puntos esta semana todavía.', 'Diese Woche hat noch niemand Punkte.', 'На этой неделе очков пока нет.'];
  var EMPTY_HOW = ['Jogue um jogo ou marque uma tarefa e seu nome aparece aqui.', 'Play a game or tick off a chore, and your name goes up here.', 'Juega a algo o marca una tarea y tu nombre sale aquí.', 'Spiel ein Spiel oder hak eine Aufgabe ab, dann steht dein Name hier.', 'Сыграйте в игру или отметьте дело, и ваше имя появится здесь.'];
  var EMPTY_LAST = ['Na semana passada ninguém marcou pontos.', 'Nobody scored last week.', 'La semana pasada nadie sumó puntos.', 'Letzte Woche hat niemand Punkte geholt.', 'На прошлой неделе никто не набрал очков.'];
  var HOW = ['Ganhar um jogo: 3 pontos. Terminar um: 1 ou 2. Cada tarefa: 1, e mais 2 por todas as de hoje.',
    'Win a game: 3 points. Finish one: 1 or 2. Each chore: 1, and 2 more for all of today\'s.',
    'Ganar un juego: 3 puntos. Terminarlo: 1 o 2. Cada tarea: 1, y 2 más por todas las de hoy.',
    'Ein Spiel gewinnen: 3 Punkte. Eins beenden: 1 oder 2. Jede Aufgabe: 1, und 2 extra für alle von heute.',
    'Победа в игре: 3 очка. Доиграть: 1 или 2. Каждое дело: 1 и ещё 2 за все дела дня.'];
  var BEST_AT = ['Melhor em: {n}', 'Best at: {n}', 'Lo mejor: {n}', 'Am besten: {n}', 'Лучше всего: {n}'];
  var CLOSE = ['Fechar', 'Close', 'Cerrar', 'Schließen', 'Закрыть'];
  var CHORES = ['Tarefas do dia', 'Daily chores', 'Tareas del día', 'Tägliche Aufgaben', 'Дела на день'];
  var WHO = ['Quem vai jogar?', 'Who\'s playing?', '¿Quién juega?', 'Wer spielt?', 'Кто играет?'];
  var WHO_SUB = ['Para os seus pontos irem para o placar da família.', 'So your points go on the family scoreboard.', 'Para que tus puntos vayan al marcador familiar.', 'Damit deine Punkte auf die Familien-Punktetafel kommen.', 'Чтобы очки попали в семейную таблицу.'];
  var JUST_PLAY = ['Só jogar', 'Just play', 'Solo jugar', 'Einfach spielen', 'Просто играть'];

  // MARK: - Weeks

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  /** The Monday a moment falls in, on the TV's clock, as YYYY-MM-DD. */
  function weekOf(ms) {
    var d = new Date(ms), back = (d.getDay() + 6) % 7;
    return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12).getTime());
  }
  /** The Monday before a week's Monday. */
  function weekBefore(key) {
    var p = key.split('-');
    return dayKey(new Date(+p[0], +p[1] - 1, +p[2] - 7, 12).getTime());
  }
  /** Days left in this week, today included: 7 on a Monday, 1 on a Sunday. */
  function daysLeft(ms) { return 7 - (new Date(ms).getDay() + 6) % 7; }

  // MARK: - Saved on this TV

  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) {}
    if (!s || typeof s !== 'object' || !Array.isArray(s.log)) s = {log: [], seen: ''};
    return s;
  }
  function store(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  /** Keeps the log to ten weeks and a sensible size. */
  function trim(log, at) {
    var oldest = at - WEEKS * 7 * DAY;
    var out = log.filter(function (e) { return e && e.t >= oldest; });
    return out.length > MAX ? out.slice(out.length - MAX) : out;
  }

  /** Google TV's tidy-up race keeps its places in the app (ScoreLog.java); they join the log once each. */
  function withNative(s) {
    var bridge = window.BeyondTable;
    if (!bridge || !bridge.scores) return s;
    var more = [];
    try { more = JSON.parse(bridge.scores()) || []; } catch (e) { more = []; }
    if (!more.length) return s;
    var have = {}, i;
    for (i = 0; i < s.log.length; i++) have[s.log[i].p + '|' + s.log[i].g + '|' + s.log[i].t] = true;
    var added = false;
    for (i = 0; i < more.length; i++) {
      var e = more[i];
      if (!e || !e.p || typeof e.n !== 'number' || typeof e.t !== 'number' || have[e.p + '|' + e.g + '|' + e.t]) continue;
      s.log.push({p: e.p, name: e.name || '', g: e.g || 'games', n: e.n, t: e.t});
      added = true;
    }
    if (added) { s.log.sort(function (a, b) { return a.t - b.t; }); store(s); }
    return s;
  }

  function real(p) { return p && p.id && !p.together && !p.guest && !p.robot && !p.visitor && p.id !== 'together' && p.id !== 'family'; }

  /** Points for someone: person {id, name}, game id, points (a chore unticked takes its point back with -1). */
  function add(person, game, n, at) {
    if (!real(person) || !n) return false;
    var s = load(), t = at || Date.now();
    s.log.push({p: person.id, name: person.name || '', g: game || 'games', n: n, t: t});
    s.log = trim(s.log, t);
    store(s);
    return true;
  }

  // MARK: - Who's playing a game for one

  var player = null;
  function current() {
    try { var me = window.Profiles && Profiles.current(); return real(me) ? me : null; } catch (e) { return null; }
  }
  /** Whoever a game for one should give its points to: the person picked for this game, else whoever is watching. */
  function who() { return player || current(); }
  function setPlayer(p) { player = real(p) ? p : null; }
  function people() {
    var all = window.Profiles ? Profiles.list() : [], kids = [], grown = [];
    for (var i = 0; i < all.length; i++) if (real(all[i])) (all[i].kid ? kids : grown).push(all[i]);
    return kids.concat(grown).slice(0, 8);
  }
  /** Points for a game for one, to whoever is playing it. */
  function solo(game, n) { var p = who(); return p ? add(p, game, n) : false; }

  /**
   * Before a game for one: watching as yourself, it starts straight away; on the Family profile, Who's playing? asks
   * once (faces, or Just play to play for no points). then() opens the game.
   */
  function pick(then) {
    var me = current(), all = people();
    if (me || all.length <= 1) { player = me || all[0] || null; then(); return; }
    player = null;
    UI.open({
      cls: 'bt-table bt-table-who sc-who',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), L(WHO), L(WHO_SUB));
        var row = UI.el('div', 'tg-faces', layer);
        var size = all.length > 6 ? 140 : 170, gap = all.length > 6 ? 44 : 64;
        var width = all.length * size + (all.length - 1) * gap;
        for (var i = 0; i < all.length; i++) {
          (function (p, x, first) {
            var f = UI.el('div', 'bt-face tg-face', row);
            f.style.left = x + 'px';
            f.style.width = size + 'px';
            UI.avatar(p, f, size);
            UI.el('div', 'name', f, p.name);
            api.add(f, function () { player = p; api.close(); then(); }, {first: first});
          })(all[i], Math.round((1920 - width) / 2) + i * (size + gap), i === 0);
        }
        var foot = UI.el('div', 'sc-foot', layer);
        api.add(UI.button(foot, L(JUST_PLAY)), function () { player = null; api.close(); then(); });
      }
    });
  }

  // MARK: - Adding it up (pure, for the tests)

  /** Everyone's points for one week: [{p, name, total, games: {group: points}}], most first. */
  function tally(log, week) {
    var by = {}, out = [];
    for (var i = 0; i < log.length; i++) {
      var e = log[i];
      if (!e || weekOf(e.t) !== week) continue;
      var r = by[e.p];
      if (!r) { r = by[e.p] = {p: e.p, name: e.name, total: 0, games: {}, last: 0}; out.push(r); }
      var g = GROUP[e.g] || (GAMES[e.g] ? e.g : 'games');
      r.games[g] = (r.games[g] || 0) + e.n;
      r.total += e.n;
      if (e.name) r.name = e.name;
      r.last = Math.max(r.last, e.t);
    }
    out = out.filter(function (r) { return r.total > 0; });
    // Most points first; level, whoever got there first.
    out.sort(function (a, b) { return b.total - a.total || a.last - b.last; });
    return out;
  }

  /** The thing each person did best (their award) and whether they are the champion (joint when level). */
  function awards(rows) {
    var top = rows.length ? rows[0].total : 0;
    return rows.map(function (r) {
      var best = 'games', most = -1;
      for (var g in r.games) if (r.games.hasOwnProperty(g) && r.games[g] > most) { most = r.games[g]; best = g; }
      return {p: r.p, name: r.name, total: r.total, best: best, award: GAMES[best].award, champion: top > 0 && r.total === top};
    });
  }

  function board(week) { var s = withNative(load()); return awards(tally(s.log, week)); }

  // MARK: - The screen

  function personFor(id, fallback) {
    var all = window.Profiles ? Profiles.list() : [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return {id: id, name: fallback || '?', colour: '#6E3DDB'};
  }

  function pointsText(n) { return n === 1 ? L(ONE_POINT) : fill(POINTS, n); }

  /** The scoreboard: this week's standings, or last week's winners and their awards. */
  function open() {
    var now = Date.now(), week = weekOf(now), last = weekBefore(week), s = load();
    // The first look in a new week opens on last week's winners, once.
    var showLast = s.seen && s.seen !== week && board(last).length > 0;
    s = load(); s.seen = week; store(s);
    var tab = showLast ? 'last' : 'this';
    if (showLast && window.Sfx) Sfx.play('win');
    UI.open({
      cls: 'bt-scores',
      build: function (layer, api) {
        var top = UI.el('div', 'sc-top', layer);
        UI.heading(top, L(TITLE), tab === 'this' ? (daysLeft(now) === 1 ? L(LAST_DAY) : fill(DAYS_LEFT, daysLeft(now))) : L(WINNERS));
        var tabs = UI.el('div', 'sc-tabs', layer);
        var a = UI.button(tabs, L(THIS_WEEK), null, tab === 'this' ? 'on' : '');
        var b = UI.button(tabs, L(LAST_WEEK), null, tab === 'last' ? 'on' : '');
        api.add(a, function () { if (tab !== 'this') { tab = 'this'; api.rebuild(); } }, {first: tab === 'this'});
        api.add(b, function () { if (tab !== 'last') { tab = 'last'; api.rebuild(); } }, {first: tab === 'last'});
        var rows = board(tab === 'this' ? week : last), list = UI.el('div', 'sc-list', layer);
        if (!rows.length) {
          var empty = UI.el('div', 'sc-empty', list);
          UI.el('div', 'big', empty, L(tab === 'this' ? EMPTY : EMPTY_LAST));
          UI.el('div', 'how', empty, L(EMPTY_HOW));
        }
        var top1 = rows.length ? rows[0].total : 1, shown = rows.slice(0, 7);
        for (var i = 0; i < shown.length; i++) {
          var r = shown[i], row = UI.el('div', 'sc-row' + (r.champion ? ' champ' : ''), list);
          UI.avatar(personFor(r.p, r.name), row, 84);
          var mid = UI.el('div', 'mid', row);
          var line = UI.el('div', 'line', mid);
          UI.el('span', 'name', line, personFor(r.p, r.name).name);
          if (r.champion) UI.el('span', 'crown', line, '★ ' + L(tab === 'this' ? LEADING : CHAMPION));
          var bar = UI.el('div', 'bar', mid), fillEl = UI.el('div', 'fill', bar);
          fillEl.style.width = Math.max(4, Math.round(100 * r.total / top1)) + '%';
          UI.el('div', 'award', mid, tab === 'last' ? '★ ' + L(r.award) : fill(BEST_AT, L(GAMES[r.best].name)));
          UI.el('div', 'pts', row, pointsText(r.total));
        }
        if (tab === 'last' && rows.length) UI.el('div', 'sc-note', layer, L(EVERYONE));
        var foot = UI.el('div', 'sc-foot', layer);
        UI.el('div', 'sc-how', foot, L(HOW));
        if (window.Chores) api.add(UI.button(foot, L(CHORES)), function () { api.close(); Chores.open(); });
        api.add(UI.button(foot, L(CLOSE), null, 'close'), function () { api.close(); });
      }
    });
  }

  return {open: open, add: add, solo: solo, pick: pick, who: who, setPlayer: setPlayer, people: people,
    rules: {GAMES: GAMES, GROUP: GROUP, tally: tally, awards: awards, weekOf: weekOf, weekBefore: weekBefore, daysLeft: daysLeft, dayKey: dayKey, load: load,
      words: function () { return [TITLE, THIS_WEEK, LAST_WEEK, DAYS_LEFT, LAST_DAY, WINNERS, EVERYONE, CHAMPION, LEADING, POINTS, ONE_POINT, EMPTY, EMPTY_HOW, EMPTY_LAST, HOW, BEST_AT, CLOSE, CHORES, WHO, WHO_SUB, JUST_PLAY]; }},
    board: board};
})();
