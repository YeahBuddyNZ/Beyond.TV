/*
 * Ludo (ADR 0024): two to four players, people and robots, on one remote. OK rolls, ◀ ▶ picks a token, OK moves it.
 * Family rules: a six gets a token out and rolls again, landing on someone sends them home (not on a star or a start
 * square) and rolls again, getting home rolls again, and the exact number takes a token home. First with every token
 * home wins. Robots weigh each move the way a good player does; how often they pick the best one comes from the level
 * (table.js). Every move a person makes is weighed the same way, so the debrief can say which move would have done
 * better. The dice are fair for everyone. Plain ES5.
 */
var Ludo = (function () {
  'use strict';

  // MARK: - The board: 52 squares round, then five up the middle and home (progress 0 to 56)

  var PATH = [
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0],
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8],
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14],
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6]
  ];
  var LANES = [
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
  ];
  var START = [0, 13, 26, 39];
  var SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
  var LAST = 50, HOME = 56;
  /** Beyond's four dots: moss top left, ember top right, coral bottom right, blue bottom left. */
  var COLOURS = ['#2F7D6D', '#E8A33D', '#D85A30', '#378ADD'];
  var BASES = [[0, 0], [9, 0], [9, 9], [0, 9]];
  /** Seats for two (opposite corners), three and four players. */
  var SEATS = {2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3]};

  function square(seat, p) { return (START[seat] + p) % 52; }
  function safe(g) { return SAFE.indexOf(g) >= 0; }

  // MARK: - The rules, apart from the screen (tests use these)

  function newGame(players, tokens) {
    var seats = SEATS[players.length];
    var s = {players: [], turn: 0, sixes: 0, over: false, log: []};
    for (var i = 0; i < players.length; i++) {
      var t = [];
      for (var k = 0; k < tokens; k++) t.push(-1);
      s.players.push({who: players[i], seat: seats[i], tokens: t});
    }
    return s;
  }

  function legal(s, pi, die) {
    var out = [], t = s.players[pi].tokens;
    for (var i = 0; i < t.length; i++) {
      if (t[i] < 0 ? die === 6 : t[i] + die <= HOME) out.push(i);
    }
    return out;
  }

  /** Others' tokens on main square g: [{pi, ti, p}]. */
  function on(s, g, notPi) {
    var out = [];
    for (var pi = 0; pi < s.players.length; pi++) {
      if (pi === notPi) continue;
      var pl = s.players[pi];
      for (var ti = 0; ti < pl.tokens.length; ti++) {
        var p = pl.tokens[ti];
        if (p >= 0 && p <= LAST && square(pl.seat, p) === g) out.push({pi: pi, ti: ti, p: p});
      }
    }
    return out;
  }

  /** How many of the others' tokens could land on main square g with their next roll. */
  function danger(s, g, notPi) {
    if (safe(g)) return 0;
    var n = 0;
    for (var pi = 0; pi < s.players.length; pi++) {
      if (pi === notPi) continue;
      var pl = s.players[pi];
      for (var ti = 0; ti < pl.tokens.length; ti++) {
        var p = pl.tokens[ti];
        if (p < 0 || p > LAST) continue;
        var d = (g - square(pl.seat, p) + 52) % 52;
        if (d >= 1 && d <= 6 && p + d <= LAST) n++;
      }
    }
    return n;
  }

  /**
   * How good a move is, and why: {score, capture, home, out, escape, risk}. The same weighing for robots and people;
   * a careless robot (low level) pays less attention to danger.
   */
  function weigh(s, pi, ti, die, care) {
    var pl = s.players[pi], from = pl.tokens[ti];
    var to = from < 0 ? 0 : from + die;
    var w = {score: 0, capture: null, home: false, out: from < 0, escape: 0, risk: 0, to: to};
    care = care === undefined ? 1 : care;
    if (w.out) w.score += 45;
    if (to === HOME) { w.home = true; w.score += 55; }
    else if (to > LAST) w.score += 28;
    else {
      var g = square(pl.seat, to);
      if (safe(g)) w.score += 14;
      else {
        var victims = on(s, g, pi);
        if (victims.length) {
          w.capture = victims[0];
          w.score += 60 + victims[0].p * 0.6;
        }
        w.risk = danger(s, g, pi);
        w.score -= 26 * w.risk * care;
      }
    }
    if (from >= 0 && from <= LAST) {
      var gf = square(pl.seat, from);
      if (!safe(gf)) {
        w.escape = danger(s, gf, pi);
        w.score += 20 * w.escape * care;
      }
    }
    w.score += to * 0.35;
    return w;
  }

  /** A robot's pick: the best move, blurred by how much it's still learning. level 1 to 10. */
  function robotPick(s, pi, die, level, random) {
    random = random || Math.random;
    var moves = legal(s, pi, die);
    if (!moves.length) return -1;
    var care = Math.min(1, level / 4);
    var best = -1, bestScore = -1e9;
    for (var i = 0; i < moves.length; i++) {
      var sc = weigh(s, pi, moves[i], die, care).score + random() * (11 - level) * 9;
      if (sc > bestScore) { bestScore = sc; best = moves[i]; }
    }
    return best;
  }

  /** Moves a token and works out what happened: {captured: {pi, ti} or null, home, again}. */
  function move(s, pi, ti, die) {
    var pl = s.players[pi];
    var from = pl.tokens[ti];
    var to = from < 0 ? 0 : from + die;
    pl.tokens[ti] = to;
    var out = {from: from, to: to, captured: null, home: to === HOME, again: false};
    if (to <= LAST) {
      var g = square(pl.seat, to);
      if (!safe(g)) {
        var victims = on(s, g, pi);
        for (var v = 0; v < victims.length; v++) s.players[victims[v].pi].tokens[victims[v].ti] = -1;
        if (victims.length) out.captured = victims[0];
      }
    }
    out.again = die === 6 || !!out.captured || out.home;
    return out;
  }

  function done(pl) {
    for (var i = 0; i < pl.tokens.length; i++) if (pl.tokens[i] !== HOME) return false;
    return true;
  }

  function progress(pl) {
    var n = 0;
    for (var i = 0; i < pl.tokens.length; i++) n += pl.tokens[i] + 1;
    return n;
  }

  // MARK: - On screen

  var CELL = 64, BOARD = CELL * 15;
  var g = null;

  function start(opts) {
    var s = newGame(opts.players, opts.tokens || 2);
    g = {s: s, opts: opts, level: opts.level, phase: 'busy', die: 0, focus: 0, moves: [], api: null, nodes: {},
      notes: {}, best: {}, timers: [], turns: 0};
    for (var i = 0; i < opts.players.length; i++) {
      var p = opts.players[i];
      if (!p.robot) { g.notes[p.id] = []; g.best[p.id] = {captures: 0, sixes: 0, home: 0}; }
    }
    UI.open({
      cls: 'bt-table tg-ludo',
      build: function (layer, api) { g.api = api; draw(layer); },
      key: key,
      back: function () {
        hold(true);
        Table.leave(function (yes) { if (yes) { stop(); UI.close(); } else hold(false); });
        return true;
      },
      closed: function () { stop(); }
    });
    later(600, turn);
  }

  function later(ms, fn) { var t = setTimeout(function () { if (g && !g.paused) fn(); else if (g) g.queued = fn; }, ms); g.timers.push(t); }
  function hold(on) {
    if (!g) return;
    g.paused = on;
    if (!on && g.queued) { var f = g.queued; g.queued = null; f(); }
  }
  function stop() {
    if (!g) return;
    for (var i = 0; i < g.timers.length; i++) clearTimeout(g.timers[i]);
    g = null;
  }

  function at(x, y) { return 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; }

  /** Where a token sits, in board pixels (its centre). */
  function spot(seat, p, ti) {
    var c;
    if (p < 0) {
      var b = BASES[seat];
      c = [b[0] + 1.5 + (ti % 2) * 3, b[1] + 1.5 + Math.floor(ti / 2) * 3];
      return [c[0] * CELL, c[1] * CELL];
    }
    if (p === HOME) {
      var mid = [[6.5, 7.5], [7.5, 6.5], [8.5, 7.5], [7.5, 8.5]][seat];
      return [mid[0] * CELL + (ti % 2 ? 10 : -10), mid[1] * CELL + (ti > 1 ? 10 : -10)];
    }
    c = p <= LAST ? PATH[square(seat, p)] : LANES[seat][p - LAST - 1];
    return [(c[0] + 0.5) * CELL, (c[1] + 0.5) * CELL];
  }

  function draw(layer) {
    var board = UI.el('div', 'lu-board', layer);
    // The four homes in the corners.
    for (var seat = 0; seat < 4; seat++) {
      var b = BASES[seat];
      var base = UI.el('div', 'lu-base', board);
      base.style.left = b[0] * CELL + 'px';
      base.style.top = b[1] * CELL + 'px';
      base.style.background = COLOURS[seat];
      UI.el('div', 'yard', base);
      for (var k = 0; k < 4; k++) {
        var hole = UI.el('i', '', base);
        hole.style.left = (1 + (k % 2) * 3) * CELL + 'px';
        hole.style.top = (1 + Math.floor(k / 2) * 3) * CELL + 'px';
      }
    }
    for (var i = 0; i < PATH.length; i++) {
      var cell = UI.el('div', 'lu-cell', board);
      cell.style.left = PATH[i][0] * CELL + 'px';
      cell.style.top = PATH[i][1] * CELL + 'px';
      var st = START.indexOf(i);
      if (st >= 0) {
        cell.style.background = COLOURS[st];
        // The way round from each start: right, down, left, up.
        var arrow = UI.el('span', 'star arrow', cell, '➜');
        arrow.style.webkitTransform = arrow.style.transform = 'rotate(' + st * 90 + 'deg)';
      }
      else if (safe(i)) UI.el('span', 'star', cell, '★');
    }
    for (var l = 0; l < 4; l++) {
      for (var j = 0; j < 5; j++) {
        var lane = UI.el('div', 'lu-cell lane', board);
        lane.style.left = LANES[l][j][0] * CELL + 'px';
        lane.style.top = LANES[l][j][1] * CELL + 'px';
        lane.style.background = COLOURS[l];
      }
    }
    var centre = UI.el('div', 'lu-centre', board);
    centre.style.borderLeftColor = COLOURS[0];
    centre.style.borderTopColor = COLOURS[1];
    centre.style.borderRightColor = COLOURS[2];
    centre.style.borderBottomColor = COLOURS[3];
    // Tokens.
    g.nodes.tokens = [];
    for (var pi = 0; pi < g.s.players.length; pi++) {
      var pl = g.s.players[pi], row = [];
      for (var ti = 0; ti < pl.tokens.length; ti++) {
        var t = UI.el('div', 'lu-token', board);
        t.style.background = COLOURS[pl.seat];
        UI.el('span', '', t, pl.who.robot ? '🤖' : pl.who.emoji || Table.nameOf(pl.who).charAt(0).toUpperCase());
        row.push(t);
      }
      g.nodes.tokens.push(row);
    }
    // The side panel: who's playing, the die, what's happening.
    var side = UI.el('div', 'lu-side', layer);
    UI.heading(side, 'Ludo');
    var list = UI.el('div', 'lu-players', side);
    g.nodes.rows = [];
    for (var q = 0; q < g.s.players.length; q++) {
      var who = g.s.players[q];
      var r = UI.el('div', 'lu-player', list);
      var chip = UI.el('i', 'chip', r);
      chip.style.background = COLOURS[who.seat];
      UI.el('span', 'name', r, who.who.robot ? who.who.name + ' 🤖' : Table.nameOf(who.who));
      g.nodes.rows.push({row: r, count: UI.el('span', 'count', r, '')});
    }
    g.nodes.die = UI.el('div', 'lu-die', side);
    g.nodes.say = UI.el('div', 'lu-say', side);
    g.nodes.hint = UI.el('div', 'lu-hint', side);
    paint();
  }

  function paint() {
    if (!g || !g.nodes.tokens) return;
    var s = g.s;
    for (var pi = 0; pi < s.players.length; pi++) {
      var pl = s.players[pi];
      for (var ti = 0; ti < pl.tokens.length; ti++) {
        var p = pl.tokens[ti];
        var xy = spot(pl.seat, p, ti);
        // Tokens sharing a square sit side by side.
        var shift = 0, same = 0;
        if (p >= 0 && p !== HOME) {
          for (var oi = 0; oi < s.players.length; oi++) {
            var o = s.players[oi];
            for (var ot = 0; ot < o.tokens.length; ot++) {
              if (oi === pi && ot === ti) continue;
              var op = o.tokens[ot];
              if (op < 0 || op === HOME) continue;
              var oxy = spot(o.seat, op, ot);
              if (Math.abs(oxy[0] - xy[0]) < 1 && Math.abs(oxy[1] - xy[1]) < 1) { same++; if (oi < pi || oi === pi && ot < ti) shift++; }
            }
          }
        }
        if (same) { xy[0] += (shift - same / 2) * 14; xy[1] -= (shift - same / 2) * 6; }
        var node = g.nodes.tokens[pi][ti];
        node.style.webkitTransform = node.style.transform = at(xy[0] - 24, xy[1] - 24);
        var choosing = g.phase === 'choose' && pi === s.turn && g.moves.indexOf(ti) >= 0;
        UI.setClass(node, 'can', choosing);
        UI.setClass(node, 'focus', choosing && g.moves[g.focus] === ti);
        UI.setClass(node, 'home', p === HOME);
      }
      var home = 0;
      for (var h = 0; h < pl.tokens.length; h++) if (pl.tokens[h] === HOME) home++;
      g.nodes.rows[pi].count.textContent = home + ' / ' + pl.tokens.length + ' 🏠';
      UI.setClass(g.nodes.rows[pi].row, 'turn', pi === s.turn && !s.over);
    }
    drawDie(g.die);
  }

  var PIPS = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};
  function drawDie(n) {
    var d = g.nodes.die;
    d.innerHTML = '';
    d.style.borderColor = COLOURS[g.s.players[g.s.turn].seat];
    if (!n) { UI.el('span', 'q', d, '?'); return; }
    var pips = PIPS[n];
    for (var i = 0; i < pips.length; i++) {
      var dot = UI.el('i', '', d);
      dot.style.left = (24 + (pips[i] % 3) * 48) + 'px';
      dot.style.top = (24 + Math.floor(pips[i] / 3) * 48) + 'px';
    }
  }

  function tell(text, hint) {
    g.nodes.say.textContent = text;
    g.nodes.hint.textContent = hint || '';
  }

  function current() { return g.s.players[g.s.turn]; }
  function nameOf(pl) { return pl.who.robot ? pl.who.name : Table.nameOf(pl.who); }

  function turn() {
    if (!g) return;
    var pl = current();
    g.die = 0;
    paint();
    if (pl.who.robot) {
      tell(Table.say('{n} está jogando…', '{n}\'s turn…', 'Turno de {n}…', nameOf(pl)));
      later(700, roll);
    } else {
      g.phase = 'roll';
      tell(Table.say('Sua vez, {n}!', 'Your turn, {n}!', '¡Tu turno, {n}!', nameOf(pl)),
        tr('Aperte OK para jogar o dado', 'Press OK to roll', 'Pulsa OK para tirar el dado'));
    }
  }

  /**
   * The throw: the die flies in from up and to the right (never over the board), tumbling, bounces three times, lower
   * each time, and lands with a little squash. Only transform animates (old TVs). Each frame shows a random face; the last one is the roll.
   */
  var FRAMES = 16;
  function throwAt(d, k) {
    var t = k / FRAMES, left = 1 - t;
    var x = 300 * Math.pow(left, 1.6);
    var y = -220 * Math.abs(Math.cos(t * 3 * Math.PI)) * left * left;
    var turn = 720 * left * left;
    var tf = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + turn.toFixed(1) + 'deg)';
    d.style.webkitTransform = d.style.transform = tf;
  }
  function bounced(k) { return Math.abs(Math.cos(k / FRAMES * 3 * Math.PI)) < Math.abs(Math.cos((k - 1) / FRAMES * 3 * Math.PI)) &&
    Math.abs(Math.cos(k / FRAMES * 3 * Math.PI)) < Math.abs(Math.cos((k + 1) / FRAMES * 3 * Math.PI)); }

  function roll() {
    if (!g) return;
    g.phase = 'busy';
    var d = g.nodes.die, k = 0;
    UI.setClass(d, 'landed', false);
    UI.setClass(d, 'flying', true);
    throwAt(d, 0);
    var spin = function () {
      if (!g) return;
      k++;
      g.die = 1 + Math.floor(Math.random() * 6);
      drawDie(g.die);
      if (k === 1 || bounced(k)) Sfx.play('dice');
      if (k < FRAMES) { throwAt(d, k); later(55, spin); return; }
      d.style.webkitTransform = d.style.transform = '';
      UI.setClass(d, 'flying', false);
      UI.setClass(d, 'landed', true);
      Sfx.play('dice');
      later(260, rolled);
    };
    later(30, spin);
  }

  function rolled() {
    var s = g.s, pi = s.turn, pl = current(), die = g.die;
    if (!pl.who.robot && die === 6) g.best[pl.who.id].sixes++;
    g.moves = legal(s, pi, die);
    g.turns++;
    if (!g.moves.length) {
      tell(Table.say('{n} tirou {m}: nenhum movimento.', '{n} rolled {m}: no move this time.', '{n} sacó {m}: sin movimiento.', nameOf(pl), die));
      later(1200, next);
      return;
    }
    if (pl.who.robot) {
      var ti = robotPick(s, pi, die, g.level);
      later(500, function () { go(ti); });
      return;
    }
    if (g.moves.length === 1) {
      tell(Table.say('Você tirou {m}.', 'You rolled {m}.', 'Sacaste {m}.', '', die));
      later(500, function () { go(g.moves[0]); });
      return;
    }
    g.phase = 'choose';
    // Start on the move a good player would look at first.
    var best = 0, bestScore = -1e9;
    for (var i = 0; i < g.moves.length; i++) {
      var sc = weigh(s, pi, g.moves[i], die).score;
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    g.focus = best;
    tell(Table.say('Você tirou {m}.', 'You rolled {m}.', 'Sacaste {m}.', '', die),
      tr('◀ ▶ escolha uma peça, OK para mover', '◀ ▶ pick a token, OK to move', '◀ ▶ elige una ficha, OK para mover'));
    paint();
  }

  /** Before a person's move: was there a clearly better one? Kept for the debrief, in kind words. */
  function notice(pi, ti) {
    var s = g.s, pl = s.players[pi], die = g.die;
    var mine = weigh(s, pi, ti, die), best = null, bestTi = -1;
    for (var i = 0; i < g.moves.length; i++) {
      var w = weigh(s, pi, g.moves[i], die);
      if (!best || w.score > best.score) { best = w; bestTi = g.moves[i]; }
    }
    if (!best || bestTi === ti || best.score - mine.score < 30) return;
    var why;
    if (best.capture && !mine.capture) {
      why = Table.say('Com um {m}, você podia ter mandado uma peça de {n} para casa. Antes de mover, procure peças onde você pode cair.',
        'With a {m} you could have sent {n}\'s token home. Before you move, look for a token you can land on.',
        'Con un {m} podías haber mandado a casa una ficha de {n}. Antes de mover, busca fichas donde puedas caer.',
        nameOf(s.players[best.capture.pi]), die);
    } else if (best.home && !mine.home) {
      why = Table.say('Com um {m}, uma peça sua podia ter chegado em casa.', 'With a {m} you could have got a token home.',
        'Con un {m} una ficha tuya podía haber llegado a casa.', '', die);
    } else if (best.escape > 0 && !mine.escape) {
      why = tr('Uma peça sua estava bem na frente de outra. Afaste do perigo primeiro, ou pare numa estrela: estrelas são seguras.',
        'One of your tokens was sitting just in front of someone. Move it out of danger first, or stop on a star: stars are safe.',
        'Una ficha tuya estaba justo delante de otra. Sácala del peligro primero, o para en una estrella: las estrellas son seguras.');
    } else if (best.out && !mine.out) {
      why = tr('Com um seis e peças em casa, tirar mais uma dá mais escolhas depois.',
        'With a six and tokens still at home, getting another one out gives you more choices later.',
        'Con un seis y fichas en casa, sacar otra te da más opciones después.');
    } else if (mine.risk > best.risk) {
      why = tr('Aquele movimento parou bem ao alcance de outra peça. As estrelas e o caminho do meio são seguros.',
        'That move stopped right where another token could reach it. Stars and your own lane up the middle are safe.',
        'Ese movimiento paró justo al alcance de otra ficha. Las estrellas y tu camino del medio son seguros.');
    }
    if (why) g.notes[pl.who.id].push({gap: best.score - mine.score, text: why});
  }

  function go(ti) {
    if (!g || ti < 0) return;
    var s = g.s, pi = s.turn, pl = current(), die = g.die;
    if (!pl.who.robot) notice(pi, ti);
    g.phase = 'busy';
    var from = pl.tokens[ti];
    var steps = from < 0 ? 1 : die;
    var hop = 0;
    // Hop square by square, then work out what happened.
    var step = function () {
      if (!g) return;
      hop++;
      pl.tokens[ti] = from < 0 ? 0 : from + hop;
      paint();
      Sfx.play('hop');
      if (hop < steps) { later(170, step); return; }
      pl.tokens[ti] = from;
      var out = move(s, pi, ti, die);
      paint();
      landed(pl, out);
    };
    step();
  }

  function landed(pl, out) {
    var s = g.s;
    if (out.captured) {
      var victim = s.players[out.captured.pi];
      if (!pl.who.robot) g.best[pl.who.id].captures++;
      if (!victim.who.robot) {
        g.notes[victim.who.id].push({gap: 20, text: Table.say(
          '{n} mandou uma peça sua para casa. Peças nas estrelas não podem ser pegas.',
          '{n} sent one of your tokens home. Tokens on a star can\'t be caught.',
          '{n} mandó una ficha tuya a casa. Las fichas en una estrella no pueden ser atrapadas.', nameOf(pl))});
      }
      Sfx.play('capture');
      tell(Table.say('{n} mandou {m} para casa!', '{n} sent {m} home!', '¡{n} mandó a {m} a casa!', nameOf(pl), nameOf(victim)));
    } else if (out.home) {
      if (!pl.who.robot) g.best[pl.who.id].home++;
      Sfx.play('home');
      tell(Table.say('{n} chegou em casa com uma peça!', '{n} got a token home!', '¡{n} llevó una ficha a casa!', nameOf(pl)));
    }
    if (done(pl)) { later(900, finish); return; }
    if (out.again) {
      if (!out.captured && !out.home) Sfx.play('six');
      if (!out.captured && !out.home) tell(Table.say('Seis! {n} joga de novo.', 'A six! {n} rolls again.', '¡Seis! {n} tira otra vez.', nameOf(pl)));
      later(out.captured || out.home ? 1100 : 800, turn);
      return;
    }
    later(out.captured ? 1100 : 450, next);
  }

  function next() {
    if (!g) return;
    g.s.turn = (g.s.turn + 1) % g.s.players.length;
    turn();
  }

  function finish() {
    if (!g) return;
    var s = g.s;
    s.over = true;
    var order = s.players.slice().sort(function (a, b) { return progress(b) - progress(a); });
    var winner = s.players[s.turn];
    Sfx.play(winner.who.robot ? 'lose' : 'win');
    order = [winner].concat(order.filter(function (p) { return p !== winner; }));
    var tips = {}, praise = {};
    for (var i = 0; i < s.players.length; i++) {
      var pl = s.players[i];
      if (pl.who.robot) continue;
      var id = pl.who.id;
      var notes = g.notes[id].sort(function (a, b) { return b.gap - a.gap; });
      var seen = {}, list = [];
      for (var n = 0; n < notes.length && list.length < 2; n++) {
        if (seen[notes[n].text]) continue;
        seen[notes[n].text] = true;
        list.push(notes[n].text);
      }
      tips[id] = list;
      var b = g.best[id], good = [];
      if (b.captures) good.push(Table.say('Peças mandadas para casa: {n}.', 'Tokens sent back home: {n}.', 'Fichas mandadas a casa: {n}.', b.captures));
      if (b.home) good.push(Table.say('Peças que chegaram em casa: {n}.', 'Tokens you got home: {n}.', 'Fichas que llegaron a casa: {n}.', b.home));
      if (!good.length && b.sixes) good.push(Table.say('Seis tirados: {n}.', 'Sixes rolled: {n}.', 'Seises sacados: {n}.', b.sixes));
      praise[id] = good;
    }
    var again = g.opts.again;
    var players = order.map(function (p) { return p.who; });
    stop();
    UI.close();
    Table.debrief({game: 'ludo', order: players, tips: tips, praise: praise, again: again});
  }

  function key(k) {
    if (!g) return false;
    if (k === TV.keys.back || k === 27 || k === 8) return false;
    if (g.phase === 'roll' && k === TV.keys.ok) { roll(); return true; }
    if (g.phase === 'choose') {
      if (k === TV.keys.left || k === TV.keys.up) { g.focus = (g.focus + g.moves.length - 1) % g.moves.length; paint(); }
      else if (k === TV.keys.right || k === TV.keys.down) { g.focus = (g.focus + 1) % g.moves.length; paint(); }
      else if (k === TV.keys.ok) go(g.moves[g.focus]);
      return true;
    }
    return true;
  }

  return {
    start: start,
    // For the tests (and nothing else).
    rules: {newGame: newGame, legal: legal, move: move, weigh: weigh, robotPick: robotPick, danger: danger, square: square, done: done, HOME: HOME}
  };
})();
