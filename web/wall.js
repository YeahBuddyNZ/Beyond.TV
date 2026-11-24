/*
 * The family wall and to-dos (ADR 0067): Beyond Family's wall on the TV, and each person's own to-dos for today, ticked
 * off with the remote alone.
 *
 * The to-dos are the jobs a grown-up gave each person in Beyond Family. OK ticks one: Beyond Family hears at once (the
 * same tick as on a phone, so the parents' jobs page catches up), it is a star to spend at the Star Stall in Candy Land
 * and a point on the family scoreboard (Chores.give). OK again unticks it and takes the star back.
 * The wall is the stickies that are up and the week's wins (jobs done, green time, see-and-do bonuses, a few with
 * photos). Anyone can put a sticky up from here with the remote: a quick one, or typed, signed with their first name.
 * It also shows on the home screen (Today at home) and the screensaver, one thing at a time.
 *
 * Nothing is kept on the TV but the stars. LG and Samsung read Family (family.js); Google TV runs this same file in
 * TableActivity's WebView (start "wall"), where BeyondTable.wall(), tick() and sticky() stand in for it.
 * Words in all five languages, like chores.js. Plain ES5.
 */
var Wall = (function () {
  'use strict';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function fill(t, n) { return L(t).replace('{n}', n); }

  // MARK: - Words

  var TITLE = ['Mural da família', 'Family wall', 'Muro de la familia', 'Familienwand', 'Семейная стена'];
  var SUB = ['As tarefas de hoje e o que está no mural. OK marca uma: cada uma vale uma estrela.',
    'Today\'s to-dos and what\'s up on the wall. OK ticks one off: each is a star for the Star Stall.',
    'Las tareas de hoy y lo que hay en el muro. OK marca una: cada una es una estrella.',
    'Die Aufgaben von heute und was an der Wand hängt. OK hakt eine ab: jede ist ein Stern.',
    'Дела на сегодня и что на стене. OK отмечает дело: за каждое звезда.'];
  var TODOS = ['Tarefas de hoje', 'To-dos today', 'Tareas de hoy', 'Aufgaben heute', 'Дела на сегодня'];
  var ON_WALL = ['No mural', 'On the wall', 'En el muro', 'An der Wand', 'На стене'];
  var LEFT = ['Faltam {n}', '{n} to go', 'Quedan {n}', 'Noch {n}', 'Осталось: {n}'];
  var ALL = ['Tudo feito hoje!', 'All done today!', '¡Todo hecho hoy!', 'Heute alles erledigt!', 'На сегодня всё!'];
  var STARS = ['{n} estrelas', '{n} stars', '{n} estrellas', '{n} Sterne', 'Звёзд: {n}'];
  var ONE_STAR = ['1 estrela', '1 star', '1 estrella', '1 Stern', '1 звезда'];
  var NONE_TODOS = ['Nenhuma tarefa ainda. Um adulto dá tarefas para cada um no Beyond Family, em Tarefas, e elas aparecem aqui.',
    'No to-dos yet. A grown-up gives each person jobs in Beyond Family, under Jobs, and they show up here to tick off.',
    'Aún no hay tareas. Un adulto da tareas a cada uno en Beyond Family, en Tareas, y aparecen aquí.',
    'Noch keine Aufgaben. Ein Erwachsener gibt jedem in Beyond Family unter Aufgaben welche, dann stehen sie hier.',
    'Дел пока нет. Взрослый даёт дела каждому в Beyond Family, в разделе Дела, и они появятся здесь.'];
  var NONE_WALL = ['O mural está vazio. Coloque um recado com o botão abaixo.', 'The wall is empty. Put a sticky up with the button below.',
    'El muro está vacío. Pon una nota con el botón de abajo.', 'Die Wand ist leer. Häng unten einen Zettel auf.', 'Стена пуста. Повесьте записку кнопкой ниже.'];
  var STICKY = ['Colocar um recado', 'Put up a sticky', 'Poner una nota', 'Zettel aufhängen', 'Повесить записку'];
  var STICKY_SUB = ['Escolha um rápido ou escreva o seu. Vai com o seu nome.', 'Pick a quick one or type your own. It goes up with your name.',
    'Elige una rápida o escribe la tuya. Va con tu nombre.', 'Nimm einen schnellen oder schreib deinen eigenen. Er hängt mit deinem Namen.',
    'Выберите готовую или напишите свою. Она будет с вашим именем.'];
  var PUT_UP = ['Colocar', 'Put it up', 'Poner', 'Aufhängen', 'Повесить'];
  var PUT = ['Recado no mural!', 'It\'s up on the wall!', '¡Está en el muro!', 'Hängt an der Wand!', 'Записка на стене!'];
  var TYPE_SOMETHING = ['Escreva algo primeiro.', 'Type something first.', 'Escribe algo primero.', 'Schreib zuerst etwas.', 'Сначала напишите что-нибудь.'];
  var OFFLINE = ['Não deu para falar com o Beyond Family. Tente de novo.', 'Couldn\'t reach Beyond Family. Try again.',
    'No se pudo conectar con Beyond Family. Inténtalo de nuevo.', 'Beyond Family war nicht erreichbar. Versuch es nochmal.', 'Не удалось связаться с Beyond Family. Попробуйте ещё раз.'];
  var UNDONE = ['Desmarcado.', 'Unticked.', 'Desmarcado.', 'Zurückgenommen.', 'Отметка снята.'];
  var CHEER = [['Uma estrela para você!', 'A star for you!', '¡Una estrella para ti!', 'Ein Stern für dich!', 'Звезда твоя!'],
    ['Ka pai! Muito bem!', 'Ka pai! Nice work!', '¡Ka pai! ¡Buen trabajo!', 'Ka pai! Gut gemacht!', 'Ка пай! Отлично!'],
    ['Feito!', 'Done and dusted!', '¡Hecho!', 'Erledigt!', 'Сделано!']];
  var ALL_CHEER = ['Tudo feito, {n}! Que orgulho.', 'All done, {n}! Ka rawe.', '¡Todo hecho, {n}! Qué orgullo.', 'Alles erledigt, {n}! Super.', 'Всё сделано, {n}! Молодец.'];
  var SPEND = ['Gastar na Terra dos Doces', 'Spend in Candy Land', 'Gastar en la Tierra de los Dulces', 'Im Zuckerland ausgeben', 'Потратить в Сладкой стране'];
  var SCOREBOARD = ['Placar da família', 'Family scoreboard', 'Marcador familiar', 'Familien-Punktetafel', 'Семейная таблица очков'];
  var CLOSE = ['Fechar', 'Close', 'Cerrar', 'Schließen', 'Закрыть'];
  var CANCEL = ['Cancelar', 'Cancel', 'Cancelar', 'Abbrechen', 'Отмена'];
  var SPACE = ['Espaço', 'Space', 'Espacio', 'Leertaste', 'Пробел'];
  var TYPE_HERE = ['Escreva aqui', 'Type here', 'Escribe aquí', 'Hier tippen', 'Пишите здесь'];
  var WIN_KIND = {
    job: ['Feito', 'Done', 'Hecho', 'Erledigt', 'Сделано'],
    green: ['Lá fora', 'Outside', 'Afuera', 'Draußen', 'На улице'],
    bonus: ['Sem ninguém pedir', 'Without being asked', 'Sin que nadie lo pida', 'Ungefragt', 'Без просьбы']
  };
  var QUICK = [
    ['Te amo!', 'Love you!', '¡Te quiero!', 'Hab dich lieb!', 'Люблю тебя!'],
    ['O jantar está pronto', 'Tea\'s ready', 'La cena está lista', 'Essen ist fertig', 'Ужин готов'],
    ['Muito orgulho de você', 'So proud of you', 'Muy orgulloso de ti', 'Bin so stolz auf dich', 'Я так горжусь тобой'],
    ['Obrigado!', 'Thank you!', '¡Gracias!', 'Danke!', 'Спасибо!'],
    ['Volto já', 'Back soon', 'Vuelvo pronto', 'Bin gleich zurück', 'Скоро вернусь'],
    ['Bom dia, família!', 'Mōrena, whānau!', '¡Buenos días, familia!', 'Guten Morgen, Familie!', 'Доброе утро, семья!']
  ];
  var COLOURS = [{id: 'ember', hex: '#E8A33D'}, {id: 'moss', hex: '#2F7D6D'}, {id: 'ink', hex: '#22221F'}];

  // MARK: - Where the wall comes from: Beyond Family here, or Google TV's app around this page

  var bridge = window.BeyondTable && window.BeyondTable.wall ? window.BeyondTable : null;
  var answers = {}, asked = 0;
  function ask(run, done) { var n = ++asked; answers[n] = done; run(n); }
  /** Google TV's app answers a tick or a sticky here: Wall.answer(n, ok). */
  function answer(n, ok) { var f = answers[n]; delete answers[n]; if (f) f(!!ok); }

  var src = {
    linked: function () { return bridge ? true : !!(window.Family && Family.linked()); },
    read: function () {
      if (bridge) { try { return JSON.parse(bridge.wall()) || {}; } catch (e) { return {}; } }
      return window.Family && Family.wall ? {wall: Family.wall(), todos: Family.todos()} : {};
    },
    tick: function (id, member, on, done) {
      if (bridge) ask(function (n) { bridge.tick(n, id, member, on); }, done);
      else Family.tickTodo(id, member, on, done);
    },
    sticky: function (text, colour, member, done) {
      if (bridge) ask(function (n) { bridge.sticky(n, text, colour, member || ''); }, done);
      else Family.postSticky(text, colour, member, done);
    }
  };

  /** The Beyond Family member behind a profile here, or null (a TV-only profile, Family, a guest). */
  function member(p) {
    if (!p || p.together || p.guest) return null;
    if (p.family) return String(p.family);
    return typeof p.id === 'string' && p.id.indexOf('bf-') === 0 ? p.id.slice(3) : null;
  }

  // What the screens show now. Read again whenever Beyond Family's sync changed.
  var data = {wall: null, todos: {}};
  function refresh() {
    var d = src.read();
    data = {wall: d.wall || null, todos: d.todos || {}};
  }
  refresh();

  function todosOf(p) { var m = member(p); return m && data.todos[m] ? data.todos[m] : []; }
  /** Somebody's to-dos still to do and all of them: {left, total}. */
  function left(p) {
    var list = todosOf(p), n = 0;
    for (var i = 0; i < list.length; i++) if (!list[i].done) n++;
    return {left: n, total: list.length};
  }
  /** Stickies first (they are for now), then the wins, newest first. */
  function items() {
    var w = data.wall || {}, out = [], i;
    for (i = 0; i < (w.stickies || []).length; i++) out.push({sticky: w.stickies[i]});
    for (i = 0; i < (w.wins || []).length; i++) out.push({win: w.wins[i]});
    return out;
  }
  function count() { return items().length; }

  /** Everyone who has to-dos, the watcher first. */
  function doers() {
    var all = window.Profiles ? Profiles.list() : [], out = [];
    for (var i = 0; i < all.length; i++) if (todosOf(all[i]).length) out.push(all[i]);
    return out;
  }

  // MARK: - Drawing a sticky or a win

  function card(parent, item, big) {
    var c;
    if (item.sticky) {
      var s = item.sticky;
      c = UI.el('div', 'wl-card wl-sticky ' + (s.colour || 'ember'), parent);
      UI.el('div', 'words', c, s.text);
    } else {
      var w = item.win;
      c = UI.el('div', 'wl-card wl-win' + (w.photo ? ' photo' : ''), parent);
      if (w.photo) {
        var pic = UI.el('div', 'pic', c);
        pic.style.backgroundImage = 'url(' + w.photo + ')';
        UI.el('div', 'shade', c);
      }
      UI.el('div', 'kind', c, (w.kind === 'green' ? '🌿 ' : w.kind === 'bonus' ? '🌟 ' : '✓ ') + L(WIN_KIND[w.kind] || WIN_KIND.job));
      UI.el('div', 'words', c, w.text);
      if (w.name) {
        var who = UI.el('div', 'who', c);
        var dot = UI.el('i', 'dot', who);
        dot.style.background = w.colour || '#6E3DDB';
        who.appendChild(document.createTextNode(w.name));
      }
    }
    if (big) UI.setClass(c, 'big', true);
    return c;
  }

  // MARK: - The screen

  var screen = null, composing = false, chosen = null, cheerAt = 0;
  function sound(kind) { if (window.Sfx) Sfx.play(kind); }

  function open() {
    refresh();
    var list = doers(), me = window.Profiles && Profiles.current ? Profiles.current() : null;
    chosen = null;
    for (var k = 0; k < list.length; k++) if (me && list[k].id === me.id) chosen = list[k];
    if (!chosen) chosen = list[0] || null;
    var note = null;
    screen = UI.open({
      cls: 'bt-wall',
      build: function (layer, api) {
        var people = doers();
        // Profiles may hand back fresh copies, so whoever was picked is found again by id.
        var was = chosen;
        chosen = people[0] || null;
        for (var c = 0; c < people.length; c++) if (was && people[c].id === was.id) chosen = people[c];
        UI.heading(UI.el('div', 'wl-top', layer), L(TITLE), L(SUB));
        note = UI.el('div', 'ch-note', layer, '');

        // To-dos, one person at a time: their faces along the top, the watcher first picked.
        var side = UI.el('div', 'wl-todos', layer);
        UI.el('div', 'wl-head', side, L(TODOS));
        if (!people.length) {
          UI.el('div', 'wl-empty', side, L(NONE_TODOS));
        } else {
          var faces = UI.el('div', 'wl-faces', side);
          for (var f = 0; f < people.length; f++) {
            (function (p) {
              var face = UI.el('div', 'wl-face' + (p.id === chosen.id ? ' on' : ''), faces);
              UI.avatar(p, face, 76);
              var n = left(p);
              UI.el('div', 'n', face, p.name);
              UI.el('div', 'left', face, n.left ? fill(LEFT, n.left) : '✓');
              api.add(face, function () { chosen = p; api.rebuild(); });
            })(people[f]);
          }
          var todos = todosOf(chosen), firstTodo = true;
          var box = UI.el('div', 'wl-list' + (todos.length > 6 ? ' many' : ''), side);
          for (var t = 0; t < todos.length; t++) {
            (function (todo) {
              var tile = UI.el('div', 'ch-tile wl-todo' + (todo.done ? ' on' : ''), box);
              UI.el('div', 'name', tile, todo.title);
              UI.el('div', 'tick', tile, '✓');
              api.add(tile, function () { tick(chosen, todo, api, say); }, {first: firstTodo});
              firstTodo = false;
            })(todos[t]);
          }
          var stars = window.Chores ? Chores.stars(chosen.id) : 0, n = left(chosen);
          var foot = UI.el('div', 'wl-stars', side);
          UI.el('span', 'count', foot, (n.left ? fill(LEFT, n.left) : L(ALL)) + '   ★ ' + (stars === 1 ? L(ONE_STAR) : fill(STARS, stars)));
          if (window.Candy && !chosen.together) {
            api.add(UI.button(foot, L(SPEND), null, 'wl-spend'), function () {
              if (window.Scores) Scores.setPlayer(chosen);
              Candy.open('stall', function () { if (UI.top && UI.top() === api) api.rebuild(); });
            });
          }
        }

        // The wall: stickies, then the week's wins.
        var right = UI.el('div', 'wl-board', layer);
        UI.el('div', 'wl-head', right, L(ON_WALL));
        var all = items();
        if (!all.length) UI.el('div', 'wl-empty', right, L(NONE_WALL));
        var grid = UI.el('div', 'wl-grid', right);
        for (var i = 0; i < all.length && i < 6; i++) card(grid, all[i]);
        var post = UI.button(right, L(STICKY), null, 'primary wl-post');
        api.add(post, function () { compose(api); }, {first: !people.length});

        var bottom = UI.el('div', 'wl-foot', layer);
        if (window.Scores && Scores.open) api.add(UI.button(bottom, L(SCOREBOARD)), function () { api.close(); Scores.open(); });
        api.add(UI.button(bottom, L(CLOSE), null, 'close'), function () { api.close(); });
      },
      closed: function () { screen = null; }
    });
    function say(text) {
      var n = note;
      if (!n) return;
      n.textContent = text;
      setTimeout(function () { UI.setClass(n, 'on', true); }, 20);
      setTimeout(function () { UI.setClass(n, 'on', false); }, 3500);
    }
  }

  /** Ticks a to-do here at once, then tells Beyond Family; if it can't be told, the tick goes back. */
  function tick(p, todo, api, say) {
    var on = !todo.done, m = member(p);
    if (!m) return;
    todo.done = on;
    if (window.Chores && Chores.give) Chores.give(p, on ? 1 : -1);
    api.rebuild();
    var n = left(p);
    if (!on) { sound('flip'); say(L(UNDONE)); }
    else if (!n.left) { sound('win'); say(fill(ALL_CHEER, p.name)); }
    else { sound('star'); say(L(CHEER[cheerAt++ % CHEER.length])); }
    src.tick(todo.id, m, on, function (ok) {
      if (ok) return;
      todo.done = !on;
      if (window.Chores && Chores.give) Chores.give(p, on ? -1 : 1);
      if (screen === api) { api.rebuild(); say(L(OFFLINE)); } else UI.toast(L(OFFLINE));
    });
  }

  /** Put up a sticky: a quick one, or typed on the remote, in one of three colours. */
  function compose(parent) {
    composing = true;
    var colour = 'ember', kb = null;
    UI.open({
      cls: 'bt-wall wl-compose',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'wl-top', layer), L(STICKY), L(STICKY_SUB));
        var quick = UI.el('div', 'wl-quick', layer);
        for (var q = 0; q < QUICK.length; q++) {
          (function (words) {
            api.add(UI.button(quick, words), function () { if (kb) kb.set(words); });
          })(L(QUICK[q]));
        }
        // How it will look on the wall, as it's typed.
        var look = UI.el('div', 'wl-preview', layer), paper = null;
        function preview(text) {
          if (!paper) return;
          paper.className = 'wl-card wl-sticky big ' + colour;
          paper.firstChild.textContent = text || L(TYPE_HERE);
          UI.setClass(paper, 'blank', !text);
        }
        var hues = UI.el('div', 'wl-hues', layer);
        for (var c = 0; c < COLOURS.length; c++) {
          (function (hue) {
            var chip = UI.el('div', 'wl-hue' + (hue.id === colour ? ' on' : ''), hues);
            chip.style.background = hue.hex;
            api.add(chip, function () {
              colour = hue.id;
              var chips = hues.childNodes;
              for (var i = 0; i < chips.length; i++) UI.setClass(chips[i], 'on', i === COLOURS.indexOf(hue));
              preview(kb ? kb.text() : '');
            });
          })(COLOURS[c]);
        }
        kb = UI.keyboard(UI.el('div', 'wl-keys', layer), api, {max: 60, placeholder: L(TYPE_HERE), spaceLabel: L(SPACE), doneLabel: L(PUT_UP),
          value: kb ? kb.text() : '', typed: function (text) { preview(text); }, done: function (text) { put(text, api); }});
        UI.el('div', 'wl-head', look, L(ON_WALL));
        paper = card(look, {sticky: {text: '', colour: colour}}, true);
        preview(kb.text());
        api.add(UI.button(look, L(CANCEL), null, 'close wl-cancel'), function () { api.close(); });
      },
      closed: function () { composing = false; if (screen === parent) parent.rebuild(); }
    });
    function put(text, api) {
      text = String(text || '').replace(/^\s+|\s+$/g, '');
      if (!text) { UI.toast(L(TYPE_SOMETHING)); return; }
      var me = window.Profiles && Profiles.current ? Profiles.current() : null;
      src.sticky(text, colour, member(me), function (ok) {
        if (!ok) { UI.toast(L(OFFLINE)); return; }
        sound('star');
        UI.toast(L(PUT));
        refresh();
        api.close();
      });
    }
  }

  // MARK: - Beyond Family changed

  /** The sync brought a different wall or different to-dos: the open screen and the home screen catch up. */
  function changed() {
    refresh();
    if (screen && !composing) screen.rebuild();
    if (window.BeyondTV && BeyondTV.notes) BeyondTV.notes();
  }

  // MARK: - On the screensaver: one thing at a time

  var lastSaver = '';
  /** Paints the i-th thing on the wall into the screensaver's box. False when the wall is empty. */
  function saver(box, i) {
    var all = items();
    if (!all.length) { box.innerHTML = ''; lastSaver = ''; UI.setClass(box, 'on', false); return false; }
    var item = all[i % all.length], sig = JSON.stringify(item);
    if (sig !== lastSaver || !box.firstChild) {
      lastSaver = sig;
      box.innerHTML = '';
      UI.el('div', 'head', box, L(ON_WALL));
      card(box, item, true);
    }
    UI.setClass(box, 'on', true);
    return true;
  }

  /** A line for Today at home: [icon, words, more], or null. */
  function homeRow(p) {
    var n = left(p);
    if (n.total) return ['✅', n.left ? fill(LEFT, n.left) + ' · ' + L(TODOS).toLowerCase() : L(ALL), L(TITLE)];
    var w = data.wall;
    if (w && w.stickies && w.stickies.length) return ['📌', w.stickies[0].text, L(ON_WALL)];
    return null;
  }

  return {open: open, changed: changed, answer: answer, count: count, left: left, saver: saver, homeRow: homeRow, linked: src.linked,
    rules: {member: member, items: items, refresh: refresh, words: function () {
      return [TITLE, SUB, TODOS, ON_WALL, LEFT, ALL, STARS, ONE_STAR, NONE_TODOS, NONE_WALL, STICKY, STICKY_SUB, PUT_UP, PUT, TYPE_SOMETHING, OFFLINE,
        UNDONE, ALL_CHEER, SPEND, SCOREBOARD, CLOSE, CANCEL, SPACE, TYPE_HERE, WIN_KIND.job, WIN_KIND.green, WIN_KIND.bonus].concat(CHEER, QUICK);
    }}};
})();
