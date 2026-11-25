/*
 * Our week, the Sunday family recap (ADR 0075): one screen on a Sunday evening that looks back on the family's week.
 * Everyone's points on the family scoreboard with the award each is heading for, the stars they earned doing chores
 * and to-dos, the week's wins and photos from the family wall, and a warm thank you to Mum, the queen of the house,
 * signed by the kids. When the house has no Mum set up, the grown-ups get the thank you instead.
 *
 * It opens from the star button at the top of the home screen (Sundays, and Monday mornings for last week), from the
 * family scoreboard any day, and by itself the first time the home screen shows on a Sunday between 4 and 9 at night,
 * once a week (Show it on Sundays, on the screen itself, turns that off). The twin of the opening rule is
 * WeekRecap.java: change one, change both.
 *
 * Nothing new is kept or sent: the points and stars are the scoreboard's (scores.js), the wins are Beyond Family's
 * wall (wall.js), and the photos on Google TV are the family's own from the screensaver, read on the TV. All that is
 * stored is the week it last opened by itself and the on or off. Same file on Google TV (TableActivity, start "week"),
 * LG and Samsung. Words in all five languages, like morning.js. Plain ES5.
 */
var Week = (function () {
  'use strict';

  var KEY = 'btv.week';
  var FROM = 16, UNTIL = 21, MONDAY_UNTIL = 12, DAY = 86400000;
  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function lang() { var l = LANG[window.I18N ? I18N.lang : 'en']; return l === undefined ? 1 : l; }
  function L(t) { return t[lang()] || t[1]; }
  function fill(t, a, b) { return L(t).split('{a}').join(a).split('{b}').join(b === undefined ? '' : b); }

  // MARK: - Words

  var TITLE = ['Nossa semana, {a}', 'Our week, {a}', 'Nuestra semana, {a}', 'Unsere Woche, {a}', 'Наша неделя, {a}'];
  var EVERYONE = ['família', 'whānau', 'familia', 'Familie', 'семья'];
  var RANGE = ['{a} a {b}', '{a} to {b}', '{a} a {b}', '{a} bis {b}', 'с {a} по {b}'];
  var TOGETHER = ['Juntos: {a} pontos', 'Together: {a} points', 'Juntos: {a} puntos', 'Zusammen: {a} Punkte', 'Вместе: {a} очков'];
  var SCORES = ['Pontos e tarefas', 'Points and chores', 'Puntos y tareas', 'Punkte und Aufgaben', 'Очки и дела'];
  var POINTS = ['{a} pontos', '{a} points', '{a} puntos', '{a} Punkte', 'Очков: {a}'];
  var ONE_POINT = ['1 ponto', '1 point', '1 punto', '1 Punkt', '1 очко'];
  var CHORE_STARS = ['★ {a} das tarefas', '★ {a} from chores', '★ {a} de las tareas', '★ {a} aus Aufgaben', '★ {a} за дела'];
  var CHAMPION = ['Campeão da semana', 'Champion of the week', 'Campeón de la semana', 'Champion der Woche', 'Чемпион недели'];
  var NO_POINTS = ['Ninguém marcou pontos esta semana. Jogue um jogo ou marque uma tarefa e o seu nome aparece aqui no domingo.',
    'No points this week yet. Play a game or tick off a chore, and your name shows up here on Sunday.',
    'Nadie ha sumado puntos esta semana. Juega a algo o marca una tarea y tu nombre saldrá aquí el domingo.',
    'Diese Woche noch keine Punkte. Spiel ein Spiel oder hak eine Aufgabe ab, dann stehst du am Sonntag hier.',
    'На этой неделе очков пока нет. Сыграйте в игру или отметьте дело, и в воскресенье ваше имя будет здесь.'];
  var MOMENTS = ['Momentos da semana', 'Moments this week', 'Momentos de la semana', 'Momente der Woche', 'Моменты недели'];
  var WINS = ['{a} conquistas no mural da família', '{a} wins on the family wall', '{a} logros en el muro de la familia', '{a} Erfolge an der Familienwand', 'Побед на семейной стене: {a}'];
  var ONE_WIN = ['1 conquista no mural da família', '1 win on the family wall', '1 logro en el muro de la familia', '1 Erfolg an der Familienwand', '1 победа на семейной стене'];
  var NO_MOMENTS = ['Fotos e conquistas da semana aparecem aqui. Envie fotos do celular em Fotos da família, ou dê conquistas no Beyond Family.',
    'Photos and wins from the week show up here. Send photos from a phone under Family photos, or give wins in Beyond Family.',
    'Las fotos y logros de la semana salen aquí. Envía fotos desde el móvil en Fotos de la familia, o da logros en Beyond Family.',
    'Fotos und Erfolge der Woche erscheinen hier. Schick Fotos vom Handy unter Familienfotos oder vergib Erfolge in Beyond Family.',
    'Здесь появятся фото и победы недели. Отправьте фото с телефона в «Семейные фото» или отмечайте победы в Beyond Family.'];
  var QUEEN = ['Rainha da casa', 'Queen of the house', 'La reina de la casa', 'Königin des Hauses', 'Королева дома'];
  var GROWN = ['Para os adultos', 'For the grown-ups', 'Para los adultos', 'Für die Großen', 'Для взрослых'];
  // A thank you for Mum, picked once a week so it stays the same all Sunday. {a} is her name.
  var MUM = [
    ['Obrigado, {a}, por tudo que você fez esta semana.', 'Thank you, {a}, for everything you did this week.', 'Gracias, {a}, por todo lo que hiciste esta semana.',
      'Danke, {a}, für alles, was du diese Woche gemacht hast.', 'Спасибо, {a}, за всё, что ты сделала на этой неделе.'],
    ['Mais uma semana cuidada por você, {a}. Te amamos.', 'Another week held together by you, {a}. We love you.', 'Otra semana sostenida por ti, {a}. Te queremos.',
      'Wieder eine Woche, die du zusammengehalten hast, {a}. Wir lieben dich.', 'Ещё одна неделя держалась на тебе, {a}. Мы тебя любим.'],
    ['{a}, o coração desta casa. Obrigado por esta semana.', '{a}, the heart of this home. Thank you for this week.', '{a}, el corazón de este hogar. Gracias por esta semana.',
      '{a}, das Herz dieses Zuhauses. Danke für diese Woche.', '{a}, сердце этого дома. Спасибо за эту неделю.'],
    ['Por trás de cada conquista desta semana estava você, {a}. Ka rawe.', 'Behind every win this week was you, {a}. Ka rawe.', 'Detrás de cada logro de esta semana estabas tú, {a}. Ka rawe.',
      'Hinter jedem Erfolg dieser Woche warst du, {a}. Ka rawe.', 'За каждой победой этой недели стояла ты, {a}. Ка раве.'],
    ['Pés para cima hoje, {a}. Você merece.', 'Feet up tonight, {a}. You\'ve earned it.', 'Pies en alto esta noche, {a}. Te lo has ganado.',
      'Heute Abend Füße hoch, {a}. Du hast es dir verdient.', 'Сегодня отдыхай, {a}. Ты это заслужила.']
  ];
  // When there's no Mum set up: the grown-ups, together. {a} is their names.
  var GROWN_UPS = [
    ['Obrigado, {a}, por tudo que fizeram esta semana.', 'Thank you, {a}, for everything you did this week.', 'Gracias, {a}, por todo lo que hicisteis esta semana.',
      'Danke, {a}, für alles, was ihr diese Woche gemacht habt.', 'Спасибо, {a}, за всё, что вы сделали на этой неделе.'],
    ['Mais uma semana cuidada por vocês, {a}.', 'Another week looked after by you, {a}.', 'Otra semana cuidada por vosotros, {a}.',
      'Wieder eine Woche, um die ihr euch gekümmert habt, {a}.', 'Ещё одна неделя под вашей заботой, {a}.'],
    ['Pés para cima hoje, {a}. Vocês merecem.', 'Feet up tonight, {a}. You\'ve earned it.', 'Pies en alto esta noche, {a}. Os lo habéis ganado.',
      'Heute Abend Füße hoch, {a}. Ihr habt es euch verdient.', 'Сегодня отдыхайте, {a}. Вы это заслужили.']
  ];
  var LOVE_FROM = ['Com amor, {a}', 'Love from {a}', 'Con cariño, {a}', 'Alles Liebe, {a}', 'С любовью, {a}'];
  var LOVE_ALL = ['Com amor, a família', 'Love from the whānau', 'Con cariño, la familia', 'Alles Liebe, deine Familie', 'С любовью, семья'];
  var AND = [' e ', ' and ', ' y ', ' und ', ' и '];
  var CLOSE = ['Fechar', 'Close', 'Cerrar', 'Schließen', 'Закрыть'];
  var SCOREBOARD = ['Placar da família', 'Family scoreboard', 'Marcador familiar', 'Familien-Punktetafel', 'Семейная таблица очков'];
  var AUTO_ON = ['Aparecer aos domingos: sim', 'Show it on Sundays: on', 'Mostrar los domingos: sí', 'Sonntags zeigen: an', 'Показывать по воскресеньям: вкл'];
  var AUTO_OFF = ['Aparecer aos domingos: não', 'Show it on Sundays: off', 'Mostrar los domingos: no', 'Sonntags zeigen: aus', 'Показывать по воскресеньям: выкл'];
  var WEEKDAYS = [['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']];

  // MARK: - The rules (no screen, no storage)

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  /** The Monday a moment falls in, on the TV's clock, as YYYY-MM-DD (the same weeks as the scoreboard). */
  function weekOf(ms) {
    var d = new Date(ms), back = (d.getDay() + 6) % 7;
    return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12).getTime());
  }
  /** Midday on a YYYY-MM-DD, n days on. */
  function dayOf(key, n) { var p = key.split('-'); return new Date(+p[0], +p[1] - 1, +p[2] + (n || 0), 12).getTime(); }

  /** Which week to look back on: this one, except on a Monday morning, when it's the one that just ended. */
  function whichWeek(ms) {
    var d = new Date(ms);
    return d.getDay() === 1 && d.getHours() < MONDAY_UNTIL ? weekOf(ms - 7 * DAY) : weekOf(ms);
  }

  /** The star button on the home screen: Sundays, and Monday mornings for the week just gone. */
  function button(ms) {
    var d = new Date(ms);
    return d.getDay() === 0 || (d.getDay() === 1 && d.getHours() < MONDAY_UNTIL);
  }

  /** Should it open by itself now? Sunday evening, once a week, when it's on and there's a family here. */
  function due(s, ms, family) {
    var d = new Date(ms), h = d.getHours();
    return !!family && s.auto !== false && d.getDay() === 0 && h >= FROM && h < UNTIL && s.shown !== weekOf(ms);
  }

  /** "Monday 16/11 to Sunday 22/11". */
  function rangeLine(week) {
    var names = WEEKDAYS[lang()] || WEEKDAYS[1], a = new Date(dayOf(week, 0)), b = new Date(dayOf(week, 6));
    return fill(RANGE, names[1] + ' ' + two(a.getDate()) + '/' + two(a.getMonth() + 1), names[0] + ' ' + two(b.getDate()) + '/' + two(b.getMonth() + 1));
  }

  /** "Aroha", "Aroha and Nikau", "Aroha, Nikau and Mere". */
  function names(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + L(AND) + list[list.length - 1];
  }

  function real(p) { return p && p.name && !p.together && !p.guest && !p.visitor && !p.robot && p.id !== 'together' && p.id !== 'family'; }

  /** Picks one of a list by the week, so the line is the same every time it opens that week. */
  function byWeek(list, week) {
    var h = 0;
    for (var i = 0; i < week.length; i++) h = (h * 31 + week.charCodeAt(i)) % 1000003;
    return list[h % list.length];
  }

  /**
   * The thank you: {queen, to: [people], text, from}. Mum (set on the TV under Manage people, or by Beyond Family)
   * gets her own, signed by the kids; with no Mum, the grown-ups together; with no grown-ups, null.
   */
  function thanks(people, week) {
    var mum = null, grown = [], kids = [], i;
    for (i = 0; i < people.length; i++) {
      var p = people[i];
      if (!real(p)) continue;
      if (p.kid) kids.push(p.name);
      else { grown.push(p); if (!mum && p.parent === 'mum') mum = p; }
    }
    var from = kids.length ? fill(LOVE_FROM, names(kids)) : L(LOVE_ALL);
    if (mum) return {queen: true, to: [mum], text: fill(byWeek(MUM, week), mum.name), from: from};
    if (!grown.length) return null;
    var who = grown.slice(0, 3);
    return {queen: false, to: who, text: fill(byWeek(GROWN_UPS, week), names(who.map(function (g) { return g.name; }))), from: from};
  }

  /**
   * Everyone's line: scoreboard rows ({p, name, total, award, champion, chores}) matched to the people here, then
   * anyone with no points yet, kids first, so nobody is left off. Six at most.
   */
  function rows(board, people) {
    var out = [], seen = {}, i;
    for (i = 0; i < board.length; i++) {
      var r = board[i], who = null;
      for (var j = 0; j < people.length; j++) if (people[j].id === r.p) who = people[j];
      out.push({person: who || {id: r.p, name: r.name || '?', colour: '#6E3DDB'}, total: r.total, award: r.award || null,
        champion: !!r.champion, chores: Math.max(0, r.chores || 0)});
      seen[r.p] = true;
    }
    var kids = [], grown = [];
    for (i = 0; i < people.length; i++) {
      if (!real(people[i]) || seen[people[i].id]) continue;
      (people[i].kid ? kids : grown).push({person: people[i], total: 0, award: null, champion: false, chores: 0});
    }
    return out.concat(kids, grown).slice(0, 6);
  }

  /** The wall's wins from this week (a win with no date is from this week: the wall only keeps the week's). */
  function winsIn(wins, week) {
    var from = week, to = dayKey(dayOf(week, 6)), out = [];
    for (var i = 0; wins && i < wins.length; i++) {
      var w = wins[i], d = w && w.date ? String(w.date).slice(0, 10) : '';
      if (w && (!d || (d >= from && d <= to))) out.push(w);
    }
    return out;
  }

  /** Up to four pictures for the week: the wins' photos first, then the family's own photos on this TV. */
  function photos(wins, own) {
    var out = [], i;
    for (i = 0; i < wins.length && out.length < 4; i++) if (wins[i].photo) out.push({src: wins[i].photo, text: wins[i].text || '', name: wins[i].name || ''});
    for (i = 0; own && i < own.length && out.length < 4; i++) if (own[i]) out.push({src: own[i], text: '', name: ''});
    return out;
  }

  var rules = {due: due, button: button, whichWeek: whichWeek, weekOf: weekOf, rangeLine: rangeLine, names: names, thanks: thanks, rows: rows,
    winsIn: winsIn, photos: photos, FROM: FROM, UNTIL: UNTIL,
    words: function () { return [TITLE, EVERYONE, RANGE, TOGETHER, SCORES, POINTS, ONE_POINT, CHORE_STARS, CHAMPION, NO_POINTS, MOMENTS, WINS, ONE_WIN,
      NO_MOMENTS, QUEEN, GROWN, LOVE_FROM, LOVE_ALL, AND, CLOSE, SCOREBOARD, AUTO_ON, AUTO_OFF].concat(MUM, GROWN_UPS); }};

  // MARK: - Where the week comes from

  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) {}
    return s && typeof s === 'object' ? s : {};
  }
  function store(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  /** {home, people, board, wins, own}: Google TV hands over the home's name and photos, LG and Samsung ask Family. */
  function source(week) {
    var b = window.BeyondTable, out = {home: '', people: window.Profiles ? Profiles.list() : [], board: [], wins: [], own: []};
    if (window.Scores && Scores.week) out.board = Scores.week(week);
    var wall = null;
    if (b && b.wall) {
      try { wall = (JSON.parse(b.wall()) || {}).wall; } catch (e) { wall = null; }
      if (b.week) {
        try {
          var more = JSON.parse(b.week(dayOf(week, 0) - 12 * 3600000)) || {};
          out.home = more.home || '';
          out.own = more.photos || [];
        } catch (e) { /* no photos */ }
      }
    } else if (window.Family && Family.linked && Family.linked()) {
      out.home = Family.homeName ? Family.homeName() : '';
      wall = Family.wall ? Family.wall() : null;
    }
    out.wins = winsIn(wall && wall.wins, week);
    return out;
  }

  // MARK: - The screen

  var showing = null;

  function open(week) {
    if (showing) return;
    week = week || whichWeek(Date.now());
    showing = UI.open({
      cls: 'bt-week',
      build: function (layer, api) {
        var data = source(week), list = rows(data.board, data.people), total = 0, i;
        for (i = 0; i < data.board.length; i++) total += Math.max(0, data.board[i].total);
        var home = data.home ? data.home.replace(/^the\s+/i, '') : L(EVERYONE);
        var top = UI.el('div', 'wk-top', layer);
        UI.heading(top, fill(TITLE, home), rangeLine(week) + (total ? '  ·  ' + fill(TOGETHER, total) : ''));

        // Points and chores, one row each.
        var left = UI.el('div', 'wk-panel wk-scores', layer);
        UI.el('div', 'wk-head', left, L(SCORES));
        if (!total) UI.el('div', 'wk-empty', left, L(NO_POINTS));
        for (i = 0; total && i < list.length; i++) {
          var r = list[i], row = UI.el('div', 'wk-row' + (r.champion ? ' champ' : ''), left);
          UI.avatar(r.person, row, 72);
          var mid = UI.el('div', 'mid', row);
          UI.el('div', 'name', mid, r.person.name + (r.champion ? '  ★' : ''));
          var bits = [];
          if (r.champion) bits.push(L(CHAMPION));
          else if (r.award) bits.push(L(r.award));
          if (r.chores) bits.push(fill(CHORE_STARS, r.chores));
          UI.el('div', 'sub', mid, bits.join('  ·  '));
          UI.el('div', 'pts', row, r.total === 1 ? L(ONE_POINT) : fill(POINTS, r.total));
        }

        // The thank you, for Mum (or the grown-ups).
        var t = thanks(data.people, week);
        if (t) {
          var card = UI.el('div', 'wk-panel wk-thanks' + (t.queen ? ' queen' : ' grown'), layer);
          var faces = UI.el('div', 'faces', card);
          for (i = 0; i < t.to.length; i++) UI.avatar(t.to[i], faces, t.to.length > 1 ? 84 : 108);
          UI.el('div', 'kicker', card, t.queen ? '👑 ' + L(QUEEN) : '💜 ' + L(GROWN));
          UI.el('div', 'words', card, t.text);
          UI.el('div', 'from', card, t.from);
        }

        // Moments: the week's photos and wins.
        var moments = UI.el('div', 'wk-panel wk-moments' + (t ? '' : ' tall'), layer);
        var pics = photos(data.wins, data.own), n = data.wins.length;
        UI.el('div', 'wk-head', moments, L(MOMENTS));
        if (n) UI.el('div', 'wk-count', moments, n === 1 ? L(ONE_WIN) : fill(WINS, n));
        if (!pics.length && !n) UI.el('div', 'wk-empty', moments, L(NO_MOMENTS));
        var strip = UI.el('div', 'wk-photos', moments);
        for (i = 0; i < pics.length; i++) {
          (function (pic) {
            var ph = UI.el('div', 'wk-photo', strip);
            ph.style.backgroundImage = 'url(' + pic.src + ')';
            if (pic.name) UI.el('div', 'who', ph, pic.name);
            api.add(ph, function () { big(pic); });
          })(pics[i]);
        }
        // With no photos, the wins themselves, in words.
        for (i = 0; !pics.length && i < data.wins.length && i < 3; i++) {
          var w = data.wins[i], line = UI.el('div', 'wk-win', moments);
          UI.el('span', 'what', line, w.text);
          if (w.name) UI.el('span', 'who', line, '  ·  ' + w.name);
        }

        var foot = UI.el('div', 'wk-foot', layer);
        api.add(UI.button(foot, L(CLOSE), null, 'primary'), function () { api.close(); }, {first: true});
        if (window.Scores && Scores.open) api.add(UI.button(foot, L(SCOREBOARD)), function () { api.close(); Scores.open(); });
        var auto = UI.button(foot, load().auto === false ? L(AUTO_OFF) : L(AUTO_ON));
        api.add(auto, function () {
          var st = load();
          st.auto = st.auto === false;
          store(st);
          if (window.BeyondTable && BeyondTable.weekAuto) BeyondTable.weekAuto(st.auto);
          auto.textContent = '';
          UI.el('span', '', auto, st.auto ? L(AUTO_ON) : L(AUTO_OFF));
        });
      },
      closed: function () { showing = null; }
    });
    if (window.Sfx) Sfx.play('win');
  }

  /** One photo, big, until OK or Back. */
  function big(pic) {
    UI.open({
      cls: 'bt-week-photo',
      build: function (layer, api) {
        var ph = UI.el('div', 'pic', layer);
        ph.style.backgroundImage = 'url(' + pic.src + ')';
        if (pic.text || pic.name) UI.el('div', 'cap', layer, [pic.text, pic.name].filter(function (x) { return x; }).join('  ·  '));
        api.add(ph, function () { api.close(); }, {first: true});
      }
    });
  }

  /** The home screen is showing: open by itself on a Sunday evening, once a week. */
  function maybe() {
    var family = (window.Profiles && Profiles.count && Profiles.count() > 1) || (window.Family && Family.linked && Family.linked());
    var s = load(), now = Date.now();
    if (!due(s, now, family)) return;
    if (window.UI && UI.active && UI.active()) return;
    s.shown = weekOf(now);
    store(s);
    open(weekOf(now));
  }

  return {rules: rules, open: open, maybe: maybe};
})();
