/*
 * Board and card games against Beyond's robots (ADR 0024): pick who's playing, pick a game, play with the remote, and a
 * debrief at the end with real tips from the game just played. Each person's robots grow with them: a level per person
 * and per game that goes up when they win and down a little when they lose, so a game stays close and, over months,
 * the robots across the table get smarter because the player did. The dice are fair and the robots see only what the
 * player sees. Progress stays on this TV (BeyondTable on Google TV, localStorage on LG and Samsung), never sent anywhere.
 * The games are ludo.js and snap.js. Google TV runs these same files in TableActivity's WebView. Plain ES5.
 */
var Table = (function () {
  'use strict';

  var KEY = 'bt.table';
  /** Robots, named after New Zealand birds. They never pretend to be a person. */
  var ROBOTS = [
    {id: 'robot-kea', name: 'Kea', colour: '#55534B'},
    {id: 'robot-tui', name: 'Tūī', colour: '#55534B'},
    {id: 'robot-ruru', name: 'Ruru', colour: '#55534B'}
  ];
  var GUEST = {id: 'guest', name: 'Guest', colour: '#55534B', guest: true};

  // MARK: - Progress, kept on this TV

  var data = null;

  function host() { return window.BeyondTable || null; }

  function load() {
    if (data) return data;
    var raw = null;
    try { raw = host() && host().load ? host().load() : window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
    if (!data || typeof data !== 'object' || !data.people) data = {v: 1, people: {}};
    return data;
  }

  function save() {
    var raw = JSON.stringify(load());
    try {
      if (host() && host().save) host().save(raw);
      else window.localStorage.setItem(KEY, raw);
    } catch (e) { /* Private mode or full: the game still plays, it just won't remember. */ }
  }

  /** Where a new player's robots start: gentle for kids, a bit more for teens, middling for grown-ups. */
  function startLevel(person) { return person.kid ? (person.teen ? 3.5 : 2.5) : 4; }

  /**
   * A person's record for one game: {level, floor, start, played, won, since, bestMs}. Guests get a fresh one each
   * time. Only learn() keeps a new one: looking doesn't write anything.
   */
  function record(person, game, keep) {
    var fresh = {level: startLevel(person), floor: 1, start: startLevel(person), played: 0, won: 0, since: Date.now()};
    if (!person || person.guest || person.robot) return fresh;
    var people = load().people;
    var mine = people[person.id];
    if (mine && mine[game]) return mine[game];
    if (!keep) return fresh;
    if (!mine) mine = people[person.id] = {};
    return (mine[game] = fresh);
  }

  /**
   * After a game: score is 1 for a win, 0 for last, in between for the places between. The level moves towards keeping
   * games close (up about a third of a level for a win, down a quarter for a loss), never below 1.5 under the best it
   * reached, so the robots keep pushing as the player gets better.
   */
  function learn(person, game, score, extra) {
    var r = record(person, game, true);
    var before = r.level;
    r.played++;
    if (score >= 1) r.won++;
    r.level = Math.max(1, Math.min(10, r.level + 0.7 * (score - 0.45)));
    r.floor = Math.max(r.floor || 1, r.level - 1.5);
    r.level = Math.round(Math.max(r.level, r.floor) * 100) / 100;
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k];
    if (!person.guest) save();
    return {before: before, after: r.level, record: r};
  }

  /** The level the robots play at for these people: the average of theirs. */
  function robotLevel(people, game) {
    var sum = 0;
    for (var i = 0; i < people.length; i++) sum += record(people[i], game).level;
    return people.length ? sum / people.length : 4;
  }

  function forget() {
    data = {v: 1, people: {}};
    save();
  }

  // MARK: - Words with names in them

  /** tr() of a pattern with {n} (and {m}) in it, so German and Russian are looked up by the pattern. */
  function say(pt, en, es, n, m) {
    var s = tr(pt, en, es);
    return s.replace('{n}', n === undefined ? '' : n).replace('{m}', m === undefined ? '' : m);
  }

  function nameOf(p) { return p.guest ? tr('Visitante', 'Guest', 'Invitado') : p.name; }

  // MARK: - Who's playing

  var chosen = [];

  function people() {
    var list = window.Profiles ? Profiles.list() : [];
    var out = [];
    for (var i = 0; i < list.length; i++) if (!list[i].together) out.push(list[i]);
    out.push(GUEST);
    return out;
  }

  function open() {
    var everyone = people();
    chosen = [];
    var me = window.Profiles ? Profiles.current() : null;
    if (me && !me.together) for (var i = 0; i < everyone.length; i++) if (everyone[i].id === me.id) chosen.push(everyone[i]);
    who();
  }

  function isChosen(p) { for (var i = 0; i < chosen.length; i++) if (chosen[i].id === p.id) return true; return false; }

  function toggle(p) {
    if (isChosen(p)) chosen = chosen.filter(function (x) { return x.id !== p.id; });
    else if (chosen.length < 4) chosen.push(p);
  }

  function who() {
    UI.open({
      cls: 'bt-table bt-table-who',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Quem vai jogar?', 'Who\'s playing?', '¿Quién juega?'),
          tr('Escolha até quatro. Os robôs jogam com vocês.', 'Pick up to four. The robots play too.', 'Elige hasta cuatro. Los robots también juegan.'));
        var everyone = people();
        var row = UI.el('div', 'tg-faces', layer);
        var size = everyone.length > 6 ? 130 : 160;
        var gap = everyone.length > 6 ? 40 : 60;
        var width = everyone.length * size + (everyone.length - 1) * gap;
        if (width > 1720) {   // a big family: smaller faces, never off the edge
          var k = 1720 / width;
          size = Math.floor(size * k); gap = Math.floor(gap * k);
          width = everyone.length * size + (everyone.length - 1) * gap;
        }
        for (var i = 0; i < everyone.length; i++) {
          (function (p, x) {
            var f = UI.el('div', 'bt-face tg-face' + (isChosen(p) ? ' on' : ''), row);
            f.style.left = x + 'px';
            f.style.width = size + 'px';
            UI.avatar(p.guest ? {name: '+', colour: p.colour} : p, f, size);
            UI.el('div', 'name', f, nameOf(p));
            UI.el('div', 'tick', f, isChosen(p) ? '✓' : '');
            api.add(f, function () { toggle(p); api.rebuild(); }, {first: i === 0});
          })(everyone[i], Math.round((1920 - width) / 2) + i * (size + gap));
        }
        var foot = UI.el('div', 'tg-foot', layer);
        var names = chosen.map(nameOf).join(', ');
        UI.el('div', 'bt-sub', foot, chosen.length ? say('Jogando: {n}', 'Playing: {n}', 'Juegan: {n}', names) :
          tr('Toque nos rostos de quem vai jogar.', 'Press OK on everyone who\'s playing.', 'Pulsa OK en quien vaya a jugar.'));
        var go = UI.button(foot, tr('Escolher um jogo', 'Pick a game', 'Elegir un juego'), null, chosen.length ? 'primary' : '');
        api.add(go, function () {
          if (!chosen.length) { toast(tr('Escolha quem vai jogar primeiro.', 'Pick who\'s playing first.', 'Elige quién juega primero.')); return; }
          games();
        });
      }
    });
  }

  // MARK: - The games

  var GAMES = [
    {id: 'ludo', icon: '🎲', name: function () { return 'Ludo'; },
      about: function () { return tr('Seis para sair, dê a volta e chegue em casa.', 'Roll a six to get out, race round, get home.', 'Saca un seis para salir, da la vuelta y llega a casa.'); }},
    {id: 'chess', icon: '\u265E', name: function () { return tr('Xadrez', 'Chess', 'Ajedrez'); },
      about: function () { return tr('Dê xeque-mate no rei. Contra um robô, ou dois no mesmo controle.', 'Checkmate the king. Against a robot, or two of you on one remote.', 'Jaque mate al rey. Contra un robot, o dos con un mando.'); }},
    {id: 'chant', icon: '🐑', name: function () { return tr('Ovelha, Pinguim, Vulcão', 'Sheep, Penguin, Volcano', 'Oveja, Pingüino, Volcán'); },
      about: function () { return tr('Diga a palavra, vire a carta: se combinar, aperte OK!', 'Say the word, flip the card: if they match, slap OK!', 'Di la palabra, voltea la carta: si coinciden, ¡pulsa OK!'); }},
    {id: 'snap', icon: '🃏', name: function () { return 'Snap'; },
      about: function () { return tr('Duas cartas iguais seguidas? Aperte OK primeiro!', 'Two the same in a row? Slap OK first!', '¿Dos iguales seguidas? ¡Pulsa OK primero!'); }}
  ];

  function game(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }

  function games() {
    UI.open({
      cls: 'bt-table bt-table-games',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Qual jogo?', 'Which game?', '¿Qué juego?'), chosen.map(nameOf).join(', '));
        var list = UI.el('div', 'tg-games', layer);
        for (var i = 0; i < GAMES.length; i++) {
          (function (g, first) {
            var card = UI.el('div', 'tg-game', list);
            UI.el('div', 'icon', card, g.icon);
            UI.el('div', 'title', card, g.name());
            UI.el('div', 'about', card, g.about());
            var r = record(chosen[0], g.id);
            if (r.played) UI.el('div', 'level', card, say('Robôs no nível {n}', 'Robots at level {n}', 'Robots en nivel {n}', robotLevel(chosen, g.id).toFixed(1)));
            api.add(card, function () { setup(g); }, {first: first});
          })(GAMES[i], i === 0);
        }
        UI.el('div', 'tg-soon', layer, tr(
          'A caminho: Go Fish e um jogo de cartas de cores e números.',
          'On the way: Go Fish, and a colours-and-numbers card game.',
          'En camino: Go Fish y un juego de cartas de colores y números.'));
        var foot = UI.el('div', 'tg-foot low', layer);
        api.add(UI.button(foot, tr('Começar do zero', 'Start fresh', 'Empezar de cero'), null, 'quiet'), function () { fresh(); });
      }
    });
  }

  /** Robots and, for Ludo, a quick or a full game; for chess, who has White. */
  function setup(g) {
    var chess = g.id === 'chess';
    var humans = g.id === 'ludo' ? chosen.slice() : chosen.slice(0, chess ? 2 : 1);
    var max = g.id === 'ludo' ? 4 - humans.length : 3;
    // Ludo: a robot only for someone playing alone (more can be added). Snap games: two robots to slap against.
    // Chess: a robot for one person, none for two.
    var robots = g.id === 'ludo' ? (humans.length > 1 ? 0 : 1) : chess ? 2 - humans.length : 2;
    var quick = true, white = 0;
    UI.open({
      cls: 'bt-table bt-table-setup',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, g.icon);
        UI.heading(box, g.name(), g.about());
        if (chess && chosen.length > 2) UI.el('div', 'bt-sub', box, say(
          'Xadrez é para dois: jogam {n} e {m}.', 'Chess is for two: {n} and {m} play.', 'El ajedrez es para dos: juegan {n} y {m}.',
          nameOf(humans[0]), nameOf(humans[1])));
        if (!chess && g.id !== 'ludo' && chosen.length > 1) UI.el('div', 'bt-sub', box, say(
          'Um controle, um jogador por vez: {n} começa. Revezem depois!',
          'One remote, one player at a time: {n} goes first. Take turns after!',
          'Un mando, un jugador a la vez: empieza {n}. ¡Luego os turnáis!', nameOf(humans[0])));
        var rows = UI.el('div', 'tg-setup', box);
        if (chess) {
          var side = UI.el('div', 'tg-choice', rows);
          UI.el('span', 'label', side, humans.length > 1 ? tr('Brancas', 'White', 'Blancas') : tr('Você joga de', 'You play', 'Juegas con'));
          var sideValue = UI.el('span', 'value', side, '');
          var paintSide = function () {
            sideValue.textContent = '◀  ' + (humans.length > 1 ? nameOf(humans[white]) :
              white ? tr('Pretas', 'Black', 'Negras') : tr('Brancas', 'White', 'Blancas')) + '  ▶';
          };
          paintSide();
          var swap = function () { white = 1 - white; paintSide(); };
          api.add(side, swap, {left: swap, right: swap});
          UI.el('div', 'bt-sub', box, tr('As brancas começam.', 'White goes first.', 'Las blancas empiezan.'));
        }
        var line = chess ? null : UI.el('div', 'tg-choice', rows);
        var value = null;
        if (line) {
          UI.el('span', 'label', line, tr('Robôs', 'Robots', 'Robots'));
          value = UI.el('span', 'value', line, '◀  ' + robots + '  ▶');
        }
        function change(d) {
          var min = humans.length > 1 ? 0 : 1;
          robots = Math.max(min, Math.min(max, robots + d));
          value.textContent = '◀  ' + robots + '  ▶';
        }
        if (line) api.add(line, function () { change(robots >= max ? -max : 1); }, {left: function () { change(-1); }, right: function () { change(1); }});
        var kind = null;
        if (g.id === 'ludo') {
          var line2 = UI.el('div', 'tg-choice', rows);
          UI.el('span', 'label', line2, tr('Partida', 'Game', 'Partida'));
          kind = UI.el('span', 'value', line2, '');
          var paint = function () {
            kind.textContent = '◀  ' + (quick ? tr('Rápida: 2 peças', 'Quick: 2 tokens', 'Rápida: 2 fichas') : tr('Completa: 4 peças', 'Full: 4 tokens', 'Completa: 4 fichas')) + '  ▶';
          };
          paint();
          api.add(line2, function () { quick = !quick; paint(); }, {left: function () { quick = !quick; paint(); }, right: function () { quick = !quick; paint(); }});
        }
        var buttons = UI.el('div', 'bt-buttons', box);
        api.add(UI.button(buttons, tr('Jogar', 'Play', 'Jugar'), null, 'primary'), function () {
          var spec = {game: g.id, humans: humans, robots: robots, tokens: quick ? 2 : 4, white: white};
          api.close();
          play(spec);
        }, {first: true});
      }
    });
  }

  function play(spec) {
    var level = robotLevel(spec.humans, spec.game);
    var players = [];
    for (var i = 0; i < spec.humans.length; i++) players.push(spec.humans[i]);
    for (var r = 0; r < spec.robots; r++) {
      var robot = ROBOTS[r];
      players.push({id: robot.id, name: robot.name, colour: robot.colour, emoji: '🤖', robot: true, level: level});
    }
    // Chess: the first player has White.
    if (spec.game === 'chess' && spec.white) players.reverse();
    var opts = {players: players, level: level, tokens: spec.tokens, chant: spec.game === 'chant', again: function () { play(spec); }};
    if (spec.game === 'ludo') Ludo.start(opts);
    else if (spec.game === 'chess') Chess.start(opts);
    else Snap.start(opts);
  }

  function fresh() {
    var guard = window.Profiles && Profiles.guard ? Profiles.guard : function (reason, then) { then(); };
    guard(tr('Começar do zero', 'Start fresh', 'Empezar de cero'), function () {
      UI.open({
        cls: 'bt-table bt-alert',
        build: function (layer, api) {
          var box = UI.el('div', 'bt-box', layer);
          UI.heading(box, tr('Começar do zero?', 'Start fresh?', '¿Empezar de cero?'), tr(
            'Os robôs esquecem os níveis e as dicas de todos nesta TV. Fica só nesta TV, como sempre.',
            'The robots forget everyone\'s levels and tips on this TV. It only ever lived on this TV.',
            'Los robots olvidan los niveles y consejos de todos en esta TV. Solo vivía en esta TV.'));
          var row = UI.el('div', 'bt-buttons', box);
          api.add(UI.button(row, tr('Cancelar', 'Cancel', 'Cancelar'), null, 'primary'), function () { api.close(); }, {first: true});
          api.add(UI.button(row, tr('Começar do zero', 'Start fresh', 'Empezar de cero'), null, 'danger'), function () {
            forget();
            api.close();
            toast(tr('Pronto: todos começam de novo.', 'Done: everyone starts again.', 'Hecho: todos empiezan de nuevo.'));
            if (UI.top()) UI.top().rebuild();
          });
        }
      });
    });
  }

  // MARK: - The debrief

  var GOOD_GAME_WIN = [
    ['Muito bem, {n}! Você jogou limpo e ganhou.', 'Well played, {n}! You beat us fair and square.', '¡Bien jugado, {n}! Nos ganaste limpiamente.'],
    ['Que partida, {n}! Você mereceu essa.', 'What a game, {n}! You earned that one.', '¡Qué partida, {n}! Te la ganaste.']
  ];
  var GOOD_GAME_LOSE = [
    ['Boa partida, {n}! Foi por pouco.', 'Good game, {n}! That was close.', '¡Buena partida, {n}! Estuvo reñido.'],
    ['Obrigado pela partida, {n}. Os dados me ajudaram hoje.', 'Thanks for the game, {n}. The luck was on my side today.', 'Gracias por la partida, {n}. Hoy tuve suerte.']
  ];

  function pickLine(lines, name) {
    var l = lines[Math.floor(Math.random() * lines.length)];
    return say(l[0], l[1], l[2], name);
  }

  /**
   * Shows how it went and learns from it. result: {game, order: players best first, tips: {id: [text]},
   * praise: {id: [text]}, extra: {id: {...saved with the record}}, again(), draw: why it was a draw, or ''}.
   */
  function debrief(result) {
    var n = result.order.length;
    var rows = [];
    for (var i = 0; i < n; i++) {
      var p = result.order[i];
      if (p.robot) continue;
      var score = result.draw ? 0.5 : n > 1 ? (n - 1 - i) / (n - 1) : 1;
      var learnt = learn(p, result.game, score, result.extra && result.extra[p.id]);
      rows.push({person: p, place: i, learnt: learnt});
    }
    var winner = result.order[0];
    UI.open({
      cls: 'bt-table bt-table-debrief',
      back: function () { return false; },
      build: function (layer, api) {
        var top = UI.el('div', 'tg-top', layer);
        if (result.draw) UI.heading(top, tr('Empate!', 'A draw!', '¡Empate!'));
        else UI.heading(top, winner.robot ? say('{n} ganhou', '{n} won', 'Ganó {n}', winner.name) : say('{n} ganhou!', '{n} won!', '¡Ganó {n}!', nameOf(winner)));
        var someone = rows.length ? rows[0].person : null;
        var line = result.draw ? result.draw :
          winner.robot ? pickLine(GOOD_GAME_LOSE, someone ? nameOf(someone) : '') : pickLine(GOOD_GAME_WIN, nameOf(winner));
        UI.el('div', 'bt-sub robot', top, (result.draw ? '' : '🤖 ') + line);
        var cards = UI.el('div', 'tg-debrief', layer);
        for (var r = 0; r < rows.length; r++) {
          var row = rows[r], p2 = row.person;
          var card = UI.el('div', 'tg-card', cards);
          var head = UI.el('div', 'head', card);
          UI.avatar(p2.guest ? {name: '+', colour: p2.colour} : p2, head, 84);
          var who = UI.el('div', 'who', head);
          UI.el('div', 'name', who, nameOf(p2));
          UI.el('div', 'place', who, result.draw ? tr('Empate', 'Draw', 'Empate') : place(row.place, n));
          var praise = (result.praise && result.praise[p2.id]) || [];
          for (var j = 0; j < praise.length && j < 2; j++) UI.el('div', 'praise', card, '★ ' + praise[j]);
          var tips = (result.tips && result.tips[p2.id]) || [];
          if (tips.length) UI.el('div', 'bt-label', card, tr('Para a próxima', 'For next time', 'Para la próxima'));
          for (var t = 0; t < tips.length && t < 2; t++) UI.el('div', 'tip', card, tips[t]);
          if (!tips.length) UI.el('div', 'tip', card, tr('Sem dicas desta vez: jogou muito bem.', 'No tips this time: that was smart play.', 'Sin consejos esta vez: jugaste muy bien.'));
          if (!p2.guest) {
            var lv = row.learnt;
            var level = UI.el('div', 'level', card);
            var bar = UI.el('div', 'bar', level);
            var fill = UI.el('i', '', bar);
            fill.style.width = Math.round(lv.after * 10) + '%';
            UI.el('div', 'what', level, lv.after > lv.before + 0.05 ?
              say('Os robôs vão ficar mais espertos: nível {n}', 'The robots get smarter for you: level {n}', 'Los robots se ponen más listos: nivel {n}', lv.after.toFixed(1)) :
              say('Robôs para você: nível {n} (começou em {m})', 'Your robots: level {n} (you started at {m})', 'Tus robots: nivel {n} (empezaste en {m})', lv.after.toFixed(1), lv.record.start.toFixed(1)));
          }
        }
        UI.el('div', 'tg-kind', layer, tr(
          'Ganhar é bom, e uma boa partida também. Diga "boa partida" para todos que jogaram.',
          'Winning\'s fun, and so is a good game. Say "good game" to everyone who played.',
          'Ganar es divertido, y una buena partida también. Di "buena partida" a todos los que jugaron.'));
        var foot = UI.el('div', 'bt-buttons tg-again', layer);
        api.add(UI.button(foot, tr('Jogar de novo', 'Play again', 'Jugar otra vez'), null, 'primary'), function () { api.close(); result.again(); }, {first: true});
        api.add(UI.button(foot, tr('Outro jogo', 'Another game', 'Otro juego')), function () { api.close(); games(); });
        api.add(UI.button(foot, tr('Pronto', 'Done', 'Listo')), function () { UI.closeAll(); if (host() && host().close) host().close(); });
      }
    });
  }

  function place(i, n) {
    if (i === 0) return tr('1º lugar', '1st place', '1.er lugar');
    if (i === n - 1) return n === 2 ? tr('2º lugar', '2nd place', '2.º lugar') : tr('Último desta vez', 'Last this time', 'Último esta vez');
    return i === 1 ? tr('2º lugar', '2nd place', '2.º lugar') : tr('3º lugar', '3rd place', '3.er lugar');
  }

  function toast(text) { UI.toast(text); }

  /** Asks before leaving a game half way: then(true) leaves. */
  function leave(then) {
    UI.open({
      cls: 'bt-table bt-alert',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('Sair do jogo?', 'Leave the game?', '¿Salir del juego?'), tr(
          'Esta partida não conta para os níveis.', 'This game won\'t count towards anyone\'s level.', 'Esta partida no cuenta para los niveles.'));
        var row = UI.el('div', 'bt-buttons', box);
        api.add(UI.button(row, tr('Continuar jogando', 'Keep playing', 'Seguir jugando'), null, 'primary'), function () { api.close(); then(false); }, {first: true});
        api.add(UI.button(row, tr('Sair', 'Leave', 'Salir'), null, 'danger'), function () { api.close(); then(true); });
      },
      back: function () { return false; }
    });
  }

  return {
    open: open, debrief: debrief, leave: leave, say: say, nameOf: nameOf, record: record, learn: learn,
    robotLevel: robotLevel, forget: forget, game: game
  };
})();
