/*
 * Chess (ADR 0033): a person against a robot, or two people sharing one remote. The arrows move a square around the
 * board, OK picks a piece up (its moves show as dots) and OK on a dot puts it there. Full rules: castling, en passant,
 * a pawn on the far side becomes a queen, check, checkmate, stalemate, and draws by too few pieces, the same position
 * three times or fifty moves with no pawn moved and nothing taken. The robot looks a few moves ahead (alpha-beta);
 * how far, and how often it slips, comes from the level (table.js). Chess has nothing hidden, so the robot sees the
 * same board you do. Each move a person makes is weighed the same way, so the debrief can say kindly what to look
 * for next time. Plain ES5.
 */
var Chess = (function () {
  'use strict';

  // MARK: - The rules, apart from the screen (tests use these)
  // The board is 64 squares, 0 is a8 (top left from White's side) and 63 is h1. White's pieces are capitals.

  var VALUE = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0};
  var KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var LINE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var MATE = 100000, INF = 1000000;
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function sideOf(p) { return !p ? '' : p === p.toUpperCase() ? 'w' : 'b'; }
  function kindOf(p) { return p.toLowerCase(); }
  function other(side) { return side === 'w' ? 'b' : 'w'; }
  function mine(p, side) { return side === 'w' ? p.toUpperCase() : p; }
  function sq(name) { return (8 - Number(name.charAt(1))) * 8 + name.charCodeAt(0) - 97; }
  function name(s) { return String.fromCharCode(97 + s % 8) + (8 - (s >> 3)); }

  function fromFen(fen) {
    var parts = fen.split(' '), rows = parts[0].split('/'), b = [];
    for (var r = 0; r < 8; r++) {
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r].charAt(i);
        if (ch >= '1' && ch <= '8') { for (var e = 0; e < Number(ch); e++) b.push(''); }
        else b.push(ch);
      }
    }
    var s = {b: b, turn: parts[1] || 'w', castle: !parts[2] || parts[2] === '-' ? '' : parts[2],
      ep: !parts[3] || parts[3] === '-' ? -1 : sq(parts[3]), half: Number(parts[4]) || 0, full: Number(parts[5]) || 1,
      seen: {}, played: []};
    s.seen[posKey(s)] = 1;
    return s;
  }
  function newGame() { return fromFen(START); }

  function posKey(s) {
    var k = '';
    for (var i = 0; i < 64; i++) k += s.b[i] || '.';
    return k + s.turn + s.castle + s.ep;
  }

  function kingAt(s, side) {
    var k = mine('k', side);
    for (var i = 0; i < 64; i++) if (s.b[i] === k) return i;
    return -1;
  }

  /** Is square t attacked by side `by`? */
  function attacked(b, t, by) {
    var r = t >> 3, c = t & 7, i, rr, cc, p;
    var pr = by === 'w' ? r + 1 : r - 1, pawn = mine('p', by);
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[pr * 8 + c - 1] === pawn) return true;
      if (c < 7 && b[pr * 8 + c + 1] === pawn) return true;
    }
    var knight = mine('n', by), king = mine('k', by);
    for (i = 0; i < 8; i++) {
      rr = r + KNIGHT[i][0]; cc = c + KNIGHT[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === knight) return true;
      rr = r + KING[i][0]; cc = c + KING[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === king) return true;
    }
    var bishop = mine('b', by), rook = mine('r', by), queen = mine('q', by);
    for (i = 0; i < 4; i++) {
      for (rr = r + DIAG[i][0], cc = c + DIAG[i][1]; rr >= 0 && rr < 8 && cc >= 0 && cc < 8; rr += DIAG[i][0], cc += DIAG[i][1]) {
        p = b[rr * 8 + cc];
        if (!p) continue;
        if (p === bishop || p === queen) return true;
        break;
      }
      for (rr = r + LINE[i][0], cc = c + LINE[i][1]; rr >= 0 && rr < 8 && cc >= 0 && cc < 8; rr += LINE[i][0], cc += LINE[i][1]) {
        p = b[rr * 8 + cc];
        if (!p) continue;
        if (p === rook || p === queen) return true;
        break;
      }
    }
    return false;
  }

  function inCheck(s, side) {
    var k = kingAt(s, side || s.turn);
    return k >= 0 && attacked(s.b, k, other(side || s.turn));
  }

  /** Every move by the side to play, before checking whether it leaves their own king in check. */
  function pseudo(s) {
    var b = s.b, side = s.turn, out = [], f, p, r, c, i, rr, cc, t;
    function add(from, to, piece, extra) {
      var m = {from: from, to: to, p: piece, cap: b[to] || ''};
      if (extra) for (var k in extra) m[k] = extra[k];
      out.push(m);
    }
    for (f = 0; f < 64; f++) {
      p = b[f];
      if (!p || sideOf(p) !== side) continue;
      r = f >> 3; c = f & 7;
      var kind = kindOf(p);
      if (kind === 'p') {
        var dir = side === 'w' ? -1 : 1, home = side === 'w' ? 6 : 1, last = side === 'w' ? 0 : 7;
        var promo = r + dir === last ? {promo: mine('q', side)} : null;
        t = f + dir * 8;
        if (!b[t]) {
          add(f, t, p, promo);
          if (r === home && !b[t + dir * 8]) add(f, t + dir * 8, p);
        }
        for (i = -1; i <= 1; i += 2) {
          cc = c + i;
          if (cc < 0 || cc > 7) continue;
          t = (r + dir) * 8 + cc;
          if (b[t] && sideOf(b[t]) !== side) add(f, t, p, promo);
          else if (t === s.ep) add(f, t, p, {ep: true, epSq: r * 8 + cc, cap: mine('p', other(side))});
        }
      } else if (kind === 'n' || kind === 'k') {
        var steps = kind === 'n' ? KNIGHT : KING;
        for (i = 0; i < 8; i++) {
          rr = r + steps[i][0]; cc = c + steps[i][1];
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          t = rr * 8 + cc;
          if (!b[t] || sideOf(b[t]) !== side) add(f, t, p);
        }
      } else {
        var dirs = kind === 'b' ? DIAG : kind === 'r' ? LINE : DIAG.concat(LINE);
        for (i = 0; i < dirs.length; i++) {
          for (rr = r + dirs[i][0], cc = c + dirs[i][1]; rr >= 0 && rr < 8 && cc >= 0 && cc < 8; rr += dirs[i][0], cc += dirs[i][1]) {
            t = rr * 8 + cc;
            if (!b[t]) { add(f, t, p); continue; }
            if (sideOf(b[t]) !== side) add(f, t, p);
            break;
          }
        }
      }
    }
    // Castling: the king and rook haven't moved, nothing between them, and the king doesn't start, cross or end in check.
    var foe = other(side);
    if (side === 'w') {
      if (s.castle.indexOf('K') >= 0 && b[60] === 'K' && b[63] === 'R' && !b[61] && !b[62] &&
        !attacked(b, 60, foe) && !attacked(b, 61, foe) && !attacked(b, 62, foe)) add(60, 62, 'K', {castle: 'K'});
      if (s.castle.indexOf('Q') >= 0 && b[60] === 'K' && b[56] === 'R' && !b[59] && !b[58] && !b[57] &&
        !attacked(b, 60, foe) && !attacked(b, 59, foe) && !attacked(b, 58, foe)) add(60, 58, 'K', {castle: 'Q'});
    } else {
      if (s.castle.indexOf('k') >= 0 && b[4] === 'k' && b[7] === 'r' && !b[5] && !b[6] &&
        !attacked(b, 4, foe) && !attacked(b, 5, foe) && !attacked(b, 6, foe)) add(4, 6, 'k', {castle: 'k'});
      if (s.castle.indexOf('q') >= 0 && b[4] === 'k' && b[0] === 'r' && !b[3] && !b[2] && !b[1] &&
        !attacked(b, 4, foe) && !attacked(b, 3, foe) && !attacked(b, 2, foe)) add(4, 2, 'k', {castle: 'q'});
    }
    return out;
  }

  var ROOK_HOP = {K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3]};

  function strip(castle, letters) {
    for (var i = 0; i < letters.length; i++) castle = castle.replace(letters.charAt(i), '');
    return castle;
  }

  /** Plays m on s and returns what unmake needs. */
  function make(s, m) {
    var b = s.b, u = {castle: s.castle, ep: s.ep, half: s.half};
    b[m.to] = m.promo || m.p;
    b[m.from] = '';
    if (m.ep) b[m.epSq] = '';
    if (m.castle) { var h = ROOK_HOP[m.castle]; b[h[1]] = b[h[0]]; b[h[0]] = ''; }
    if (s.castle) {
      if (m.p === 'K') s.castle = strip(s.castle, 'KQ');
      if (m.p === 'k') s.castle = strip(s.castle, 'kq');
      if (m.from === 63 || m.to === 63) s.castle = strip(s.castle, 'K');
      if (m.from === 56 || m.to === 56) s.castle = strip(s.castle, 'Q');
      if (m.from === 7 || m.to === 7) s.castle = strip(s.castle, 'k');
      if (m.from === 0 || m.to === 0) s.castle = strip(s.castle, 'q');
    }
    s.ep = kindOf(m.p) === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
    s.half = kindOf(m.p) === 'p' || m.cap ? 0 : s.half + 1;
    if (s.turn === 'b') s.full++;
    s.turn = other(s.turn);
    return u;
  }

  function unmake(s, m, u) {
    var b = s.b;
    s.turn = other(s.turn);
    if (s.turn === 'b') s.full--;
    b[m.from] = m.p;
    b[m.to] = m.ep ? '' : m.cap;
    if (m.ep) b[m.epSq] = m.cap;
    if (m.castle) { var h = ROOK_HOP[m.castle]; b[h[0]] = b[h[1]]; b[h[1]] = ''; }
    s.castle = u.castle; s.ep = u.ep; s.half = u.half;
  }

  /** The moves the side to play can really make. */
  function legal(s) {
    var all = pseudo(s), out = [], side = s.turn;
    for (var i = 0; i < all.length; i++) {
      var u = make(s, all[i]);
      if (!inCheck(s, side)) out.push(all[i]);
      unmake(s, all[i], u);
    }
    return out;
  }

  /** Plays a move for real: kept in the history, so three times the same position is a draw. */
  function play(s, m) {
    make(s, m);
    s.played.push(m);
    var k = posKey(s);
    s.seen[k] = (s.seen[k] || 0) + 1;
  }

  function tooFew(b) {
    var rest = [], bishops = [];
    for (var i = 0; i < 64; i++) {
      if (!b[i] || kindOf(b[i]) === 'k') continue;
      rest.push(kindOf(b[i]));
      if (kindOf(b[i]) === 'b') bishops.push(((i >> 3) + (i & 7)) % 2);
    }
    if (!rest.length) return true;
    if (rest.length === 1 && (rest[0] === 'n' || rest[0] === 'b')) return true;
    // Only bishops, all on the same colour of square: nobody can ever be mated.
    if (bishops.length === rest.length) {
      for (var j = 1; j < bishops.length; j++) if (bishops[j] !== bishops[0]) return false;
      return true;
    }
    return false;
  }

  /** Is the game over? 'mate', 'stalemate', 'material', 'repeat', 'fifty' or '' (play on). */
  function status(s) {
    if (!legal(s).length) return inCheck(s) ? 'mate' : 'stalemate';
    if (tooFew(s.b)) return 'material';
    if ((s.seen[posKey(s)] || 0) >= 3) return 'repeat';
    if (s.half >= 100) return 'fifty';
    return '';
  }

  // MARK: - Weighing a position: what's on the board, and where

  function centre(i) { return 3.5 - Math.max(Math.abs((i >> 3) - 3.5), Math.abs((i & 7) - 3.5)); }

  /** From the side to play's point of view: more is better for them. */
  function evaluate(s) {
    var b = s.b, score = 0, heavy = 0, i, p, k, sign, r, c;
    for (i = 0; i < 64; i++) if (b[i] && kindOf(b[i]) !== 'k' && kindOf(b[i]) !== 'p') heavy += VALUE[kindOf(b[i])];
    var late = heavy < 2600;
    for (i = 0; i < 64; i++) {
      p = b[i];
      if (!p) continue;
      k = kindOf(p); sign = sideOf(p) === 'w' ? 1 : -1;
      r = i >> 3; c = i & 7;
      var v = VALUE[k];
      if (k === 'p') {
        var ahead = sign > 0 ? 6 - r : r - 1;
        v += ahead * (late ? 18 : 8);
        if ((c === 3 || c === 4) && ahead >= 2 && ahead <= 3) v += 20;
      } else if (k === 'n' || k === 'b') {
        v += centre(i) * 10;
        if ((sign > 0 && r === 7) || (sign < 0 && r === 0)) v -= 12;
      } else if (k === 'q' || k === 'r') {
        v += centre(i) * 2;
      } else if (k === 'k') {
        if (late) v += centre(i) * 12;
        else {
          var back = sign > 0 ? r === 7 : r === 0;
          v += back ? 10 : -25;
          if (back && (c <= 2 || c >= 6)) v += 25;
        }
      }
      score += sign * v;
    }
    return s.turn === 'w' ? score : -score;
  }

  function order(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      m.rank = (m.cap ? VALUE[kindOf(m.cap)] * 10 - VALUE[kindOf(m.p)] / 10 : 0) + (m.promo ? 8000 : 0);
    }
    return moves.sort(function (a, b) { return b.rank - a.rank; });
  }

  function tick(ctx) {
    ctx.nodes++;
    if ((ctx.nodes & 255) === 0 && ctx.deadline && Date.now() > ctx.deadline) ctx.out = true;
    return ctx.out;
  }

  /** Only the captures, until it goes quiet, so a piece left hanging at the end of the search is seen. */
  function quiesce(s, alpha, beta, ctx, depth) {
    if (tick(ctx)) return 0;
    var stand = evaluate(s);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (depth >= 4) return stand;
    var all = pseudo(s), caps = [], side = s.turn;
    for (var i = 0; i < all.length; i++) if (all[i].cap) caps.push(all[i]);
    order(caps);
    for (var j = 0; j < caps.length; j++) {
      var u = make(s, caps[j]);
      if (inCheck(s, side)) { unmake(s, caps[j], u); continue; }
      var score = -quiesce(s, -beta, -alpha, ctx, depth + 1);
      unmake(s, caps[j], u);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function search(s, depth, alpha, beta, ctx, ply) {
    if (tick(ctx)) return 0;
    if (depth <= 0) return ctx.quiet ? quiesce(s, alpha, beta, ctx, 0) : evaluate(s);
    var moves = order(pseudo(s)), side = s.turn, best = -INF, any = false;
    for (var i = 0; i < moves.length; i++) {
      var u = make(s, moves[i]);
      if (inCheck(s, side)) { unmake(s, moves[i], u); continue; }
      any = true;
      var score = -search(s, depth - 1, -beta, -alpha, ctx, ply + 1);
      unmake(s, moves[i], u);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    if (!any) return inCheck(s, side) ? -MATE + ply : 0;
    return best;
  }

  /**
   * Every legal move with a score, best first, looking `depth` moves ahead. With a time budget it goes one level
   * deeper at a time and keeps the last level it finished, so an old TV never sits thinking for long.
   */
  function rank(s, depth, quiet, budget) {
    var moves = order(legal(s)), ctx = {nodes: 0, quiet: quiet, deadline: 0, out: false}, done = null;
    for (var d = 1; d <= depth; d++) {
      var scored = [];
      for (var i = 0; i < moves.length; i++) {
        var u = make(s, moves[i]);
        // A move back to a position already seen twice ends the game in a draw, so it scores as one.
        var score = (s.seen[posKey(s)] || 0) >= 2 ? 0 : -search(s, d - 1, -INF, INF, ctx, 1);
        unmake(s, moves[i], u);
        if (ctx.out) break;
        scored.push({m: moves[i], score: score});
      }
      if (ctx.out) break;
      scored.sort(function (a, b) { return b.score - a.score; });
      done = scored;
      moves = scored.map(function (x) { return x.m; });
      if (budget && !ctx.deadline) ctx.deadline = Date.now() + budget;
    }
    return done || [];
  }

  /** How far a robot looks at each level, and how often it slips. */
  function depthFor(level) { return level < 3 ? 1 : level < 6 ? 2 : 3; }

  function robotPick(s, level, random, budget) {
    random = random || Math.random;
    var ranked = rank(s, depthFor(level), level >= 5, budget);
    if (!ranked.length) return null;
    var slip = Math.max(0, (8 - level) * 0.07);
    if (ranked.length > 1 && random() < slip) {
      var pool = ranked.slice(0, Math.max(2, Math.ceil(ranked.length / 3)));
      // From level 4 a slip is a so-so move, never a piece thrown away.
      if (level >= 4) pool = pool.filter(function (x) { return ranked[0].score - x.score <= 150; });
      return pool[Math.floor(random() * pool.length)].m;
    }
    var best = ranked.filter(function (x) { return x.score === ranked[0].score; });
    return best[Math.floor(random() * best.length)].m;
  }

  // MARK: - On screen

  var CELL = 120;
  var GLYPH = {k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'};
  var g = null;

  function pieceName(k) {
    return {
      p: tr('peão', 'pawn', 'peón'), n: tr('cavalo', 'knight', 'caballo'), b: tr('bispo', 'bishop', 'alfil'),
      r: tr('torre', 'rook', 'torre'), q: tr('rainha', 'queen', 'dama'), k: tr('rei', 'king', 'rey')
    }[k];
  }

  function start(opts) {
    // opts.fen starts from a set position (for trying things out); a game starts from the beginning.
    var s = opts.fen ? fromFen(opts.fen) : newGame();
    var white = opts.players[0], black = opts.players[1];
    g = {s: s, opts: opts, level: opts.level, side: {w: white, b: black}, phase: 'busy', picked: -1, targets: [],
      cursor: {w: sq('e2'), b: sq('e7')}, nodes: {}, notes: {}, best: {}, timers: [], last: null,
      // Facing the person: a person playing Black against a robot sees Black at the bottom.
      flip: black && !black.robot && white.robot};
    for (var i = 0; i < opts.players.length; i++) {
      var p = opts.players[i];
      if (!p.robot) { g.notes[p.id] = []; g.best[p.id] = {checks: 0, taken: 0, castled: false, queens: 0}; }
    }
    UI.open({
      cls: 'bt-table tg-chess',
      build: function (layer, api) { draw(layer); },
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

  /** Where a board square is on screen. */
  function xy(i) {
    var r = i >> 3, c = i & 7;
    if (g.flip) { r = 7 - r; c = 7 - c; }
    return [c * CELL, r * CELL];
  }
  function at(p) { return 'translate(' + p[0] + 'px,' + p[1] + 'px)'; }

  function draw(layer) {
    var board = UI.el('div', 'ch-board', layer);
    g.nodes.squares = [];
    for (var i = 0; i < 64; i++) {
      var cell = UI.el('div', 'ch-sq ' + (((i >> 3) + (i & 7)) % 2 ? 'dark' : 'light'), board);
      var p = xy(i);
      cell.style.left = p[0] + 'px';
      cell.style.top = p[1] + 'px';
      // Letters along the bottom and numbers up the side, as a real board has them.
      if (p[1] === 7 * CELL) UI.el('span', 'file', cell, name(i).charAt(0));
      if (p[0] === 0) UI.el('span', 'rank', cell, name(i).charAt(1));
      g.nodes.squares.push(cell);
    }
    g.nodes.marks = UI.el('div', 'ch-marks', board);
    g.nodes.pieces = UI.el('div', 'ch-pieces', board);
    g.nodes.cursor = UI.el('div', 'ch-cursor', board);
    var side = UI.el('div', 'lu-side ch-side', layer);
    UI.heading(side, tr('Xadrez', 'Chess', 'Ajedrez'));
    var list = UI.el('div', 'lu-players', side);
    g.nodes.rows = {};
    var sides = ['w', 'b'];
    for (var q = 0; q < 2; q++) {
      var who = g.side[sides[q]];
      var row = UI.el('div', 'lu-player', list);
      UI.el('i', 'chip ' + sides[q], row);
      UI.el('span', 'name', row, who.robot ? who.name + ' 🤖' : Table.nameOf(who));
      g.nodes.rows[sides[q]] = {row: row, taken: UI.el('span', 'count ch-taken', row, '')};
    }
    g.nodes.say = UI.el('div', 'lu-say', side);
    g.nodes.hint = UI.el('div', 'lu-hint', side);
    paint();
  }

  function paint() {
    if (!g || !g.nodes.pieces) return;
    var s = g.s, b = s.b, i;
    var check = inCheck(s) ? kingAt(s, s.turn) : -1;
    for (i = 0; i < 64; i++) {
      var cell = g.nodes.squares[i];
      UI.setClass(cell, 'last', !!g.last && (g.last.from === i || g.last.to === i));
      UI.setClass(cell, 'check', i === check);
      UI.setClass(cell, 'picked', i === g.picked);
    }
    var pieces = g.nodes.pieces;
    pieces.innerHTML = '';
    g.nodes.at = [];
    for (i = 0; i < 64; i++) {
      if (!b[i]) continue;
      var node = UI.el('div', 'ch-piece ' + sideOf(b[i]), pieces, GLYPH[kindOf(b[i])] + '︎');
      node.style.webkitTransform = node.style.transform = at(xy(i));
      g.nodes.at[i] = node;
    }
    var marks = g.nodes.marks;
    marks.innerHTML = '';
    for (i = 0; i < g.targets.length; i++) {
      var t = g.targets[i];
      var dot = UI.el('div', 'ch-dot' + (t.cap ? ' take' : ''), marks);
      dot.style.webkitTransform = dot.style.transform = at(xy(t.to));
    }
    var person = g.phase === 'move';
    UI.setClass(g.nodes.cursor, 'on', person);
    if (person) g.nodes.cursor.style.webkitTransform = g.nodes.cursor.style.transform = at(xy(g.cursor[s.turn]));
    // Who's taken what, shown on the side of the one who took it.
    var gone = {w: [], b: []};
    for (i = 0; i < s.played.length; i++) {
      var m = s.played[i];
      if (m.cap) gone[sideOf(m.p)].push(GLYPH[kindOf(m.cap)]);
    }
    g.nodes.rows.w.taken.textContent = gone.w.join('︎');
    g.nodes.rows.b.taken.textContent = gone.b.join('︎');
    UI.setClass(g.nodes.rows.w.row, 'turn', s.turn === 'w' && !g.over);
    UI.setClass(g.nodes.rows.b.row, 'turn', s.turn === 'b' && !g.over);
  }

  function tell(text, hint) {
    g.nodes.say.textContent = text;
    g.nodes.hint.textContent = hint || '';
  }

  function who(side) { return g.side[side]; }
  function nameOf(p) { return p.robot ? p.name : Table.nameOf(p); }

  function turn() {
    if (!g) return;
    var s = g.s, p = who(s.turn);
    var over = status(s);
    if (over) { finish(over); return; }
    g.picked = -1; g.targets = [];
    var check = inCheck(s);
    if (p.robot) {
      g.phase = 'busy';
      paint();
      tell(check ? Table.say('Xeque! {n} está pensando…', 'Check! {n} is thinking…', '¡Jaque! {n} está pensando…', nameOf(p)) :
        Table.say('{n} está pensando…', '{n} is thinking…', '{n} está pensando…', nameOf(p)));
      later(450, think);
      return;
    }
    g.phase = 'move';
    paint();
    var two = !who(other(s.turn)).robot;
    tell(check ? Table.say('Xeque! Proteja seu rei, {n}.', 'Check! Keep your king safe, {n}.', '¡Jaque! Protege a tu rey, {n}.', nameOf(p)) :
      two ? Table.say('Sua vez, {n} ({m}).', 'Your turn, {n} ({m}).', 'Tu turno, {n} ({m}).', nameOf(p), colourName(s.turn)) :
        Table.say('Sua vez, {n}!', 'Your turn, {n}!', '¡Tu turno, {n}!', nameOf(p)),
      tr('Setas para andar, OK para pegar uma peça', 'Arrows to move, OK to pick up a piece', 'Flechas para moverte, OK para coger una pieza'));
  }

  function colourName(side) { return side === 'w' ? tr('brancas', 'White', 'blancas') : tr('pretas', 'Black', 'negras'); }

  function think() {
    if (!g) return;
    var m = robotPick(g.s, g.level, null, 1500);
    if (m) move(m);
  }

  /** OK on a square: pick up, put down, or pick a different piece. */
  function press() {
    var s = g.s, at2 = g.cursor[s.turn], p = s.b[at2];
    if (g.picked >= 0) {
      for (var i = 0; i < g.targets.length; i++) {
        if (g.targets[i].to === at2) { var m = g.targets[i]; g.picked = -1; g.targets = []; notice(m); move(m); return; }
      }
      if (at2 === g.picked) { g.picked = -1; g.targets = []; paint(); return; }
    }
    if (p && sideOf(p) === s.turn) {
      var moves = legal(s).filter(function (x) { return x.from === at2; });
      if (!moves.length) {
        Sfx.play('oops');
        tell(Table.say('Esse {n} não pode se mexer agora.', 'That {n} can\'t move right now.', 'Ese {n} no puede moverse ahora.', pieceName(kindOf(p))),
          inCheck(s) ? tr('Primeiro tire o rei do xeque.', 'Get your king out of check first.', 'Primero saca al rey del jaque.') : '');
        return;
      }
      Sfx.play('flip');
      g.picked = at2; g.targets = moves;
      tell(Table.say('{n} na mão.', 'Holding the {n}.', 'Tienes el {n}.', pieceName(kindOf(p))),
        tr('Setas até um ponto, OK para colocar. Voltar solta a peça.', 'Arrows to a dot, OK to put it there. Back puts it down.', 'Flechas hasta un punto, OK para dejarla. Atrás la suelta.'));
      paint();
      return;
    }
    if (g.picked >= 0) { g.picked = -1; g.targets = []; paint(); }
  }

  /** Slides the piece across, then plays the move. */
  function move(m) {
    g.phase = 'busy';
    paint();
    var node = g.nodes.at[m.from];
    if (node) { UI.setClass(node, 'moving', true); node.style.webkitTransform = node.style.transform = at(xy(m.to)); }
    var gone = g.nodes.at[m.ep ? m.epSq : m.to];
    if (m.cap && gone) UI.setClass(gone, 'gone', true);
    if (m.castle) {
      var rook = g.nodes.at[ROOK_HOP[m.castle][0]];
      if (rook) { UI.setClass(rook, 'moving', true); rook.style.webkitTransform = rook.style.transform = at(xy(ROOK_HOP[m.castle][1])); }
    }
    later(320, function () { landed(m); });
  }

  function landed(m) {
    var s = g.s, p = who(s.turn), mover = s.turn;
    play(s, m);
    g.last = m;
    g.cursor[mover] = m.to;
    var check = inCheck(s);
    if (!p.robot) {
      var b = g.best[p.id];
      if (m.cap) b.taken++;
      if (check) b.checks++;
      if (m.castle) b.castled = true;
      if (m.promo) b.queens++;
    }
    if (m.cap) Sfx.play('capture'); else if (m.castle || m.promo) Sfx.play('home'); else Sfx.play('place');
    if (check) later(160, function () { Sfx.play('check'); });
    g.picked = -1; g.targets = [];
    paint();
    if (m.promo) tell(Table.say('Um peão de {n} virou rainha!', '{n}\'s pawn became a queen!', '¡El peón de {n} se convirtió en dama!', nameOf(p)));
    else if (m.castle) tell(Table.say('{n} fez o roque.', '{n} castled.', '{n} enrocó.', nameOf(p)));
    else if (m.cap) tell(Table.say('{n} pegou um {m}.', '{n} took a {m}.', '{n} capturó un {m}.', nameOf(p), pieceName(kindOf(m.cap))));
    later(m.cap || m.castle || m.promo ? 900 : 350, turn);
  }

  /**
   * Before a person's move: was there a clearly better one? Kept for the debrief, in kind words. Weighed two moves
   * ahead with the captures followed through, the way a careful player would.
   */
  function notice(m) {
    var s = g.s, p = who(s.turn);
    if (p.robot) return;
    var ranked = rank(s, 2, true, 500);
    if (ranked.length < 2) return;
    var best = ranked[0], mineScore = null;
    for (var i = 0; i < ranked.length; i++) if (ranked[i].m.from === m.from && ranked[i].m.to === m.to) mineScore = ranked[i].score;
    if (mineScore === null || best.score - mineScore < 200) return;
    var gap = best.score - mineScore, why;
    if (best.score > MATE / 2) {
      why = Table.say('Ali tinha xeque-mate: {n}. Procure os xeques primeiro, são eles que terminam o jogo.',
        'There was checkmate there: {n}. Look at checks first: they\'re the moves that end the game.',
        'Ahí había jaque mate: {n}. Mira primero los jaques: son los que terminan la partida.', moveWords(best.m));
    } else if (best.m.cap && VALUE[kindOf(best.m.cap)] >= 300 && !(m.cap && VALUE[kindOf(m.cap)] >= VALUE[kindOf(best.m.cap)])) {
      why = Table.say('Dava para pegar um {n} em {m}. Antes de mexer, veja o que você pode pegar.',
        'You could have taken a {n} on {m}. Before you move, look at what you can take.',
        'Podías capturar un {n} en {m}. Antes de mover, mira qué puedes capturar.', pieceName(kindOf(best.m.cap)), name(best.m.to));
    } else if (hangs(s, m)) {
      why = Table.say('Seu {n} em {m} podia ser pego logo depois. Antes de mexer, veja o que alcança aquela casa.',
        'Your {n} on {m} could be taken straight after. Before you move, check what can reach that square.',
        'Tu {n} en {m} podía ser capturado justo después. Antes de mover, mira qué llega a esa casilla.',
        pieceName(kindOf(m.promo || m.p)), name(m.to));
    } else {
      why = Table.say('Tinha um movimento mais forte: {n}. Pense no que o outro lado pode fazer depois.',
        'There was a stronger move: {n}. Think about what the other side can do next.',
        'Había un movimiento más fuerte: {n}. Piensa en lo que puede hacer el otro lado después.', moveWords(best.m));
    }
    g.notes[p.id].push({gap: gap, text: why});
  }

  function moveWords(m) { return pieceName(kindOf(m.p)) + ' ' + name(m.from) + ' → ' + name(m.to); }

  /** After m, can the piece that moved be taken for less than it's worth, or for free? */
  function hangs(s, m) {
    var u = make(s, m), worth = VALUE[kindOf(m.promo || m.p)], cheap = false;
    if (attacked(s.b, m.to, s.turn)) {
      var replies = pseudo(s);
      for (var i = 0; i < replies.length; i++) {
        if (replies[i].to !== m.to) continue;
        var free = !attacked(s.b, m.to, other(s.turn)) || VALUE[kindOf(replies[i].p)] < worth;
        if (free && worth >= 300) { cheap = true; break; }
      }
    }
    unmake(s, m, u);
    return cheap;
  }

  function finish(why) {
    var s = g.s;
    g.over = true;
    g.phase = 'busy';
    paint();
    var players = [g.side.w, g.side.b], order, draw = why !== 'mate';
    if (draw) order = players;
    else { var winner = who(other(s.turn)); order = [winner, who(s.turn)]; }
    var anyPerson = !g.side.w.robot || !g.side.b.robot;
    Sfx.play(draw ? 'pile' : order[0].robot && anyPerson ? 'lose' : 'win');
    var words = {
      mate: Table.say('Xeque-mate! {n} ganhou.', 'Checkmate! {n} wins.', '¡Jaque mate! Gana {n}.', nameOf(order[0])),
      stalemate: tr('Afogado: o rei não está em xeque, mas não há lance. Empate!', 'Stalemate: the king isn\'t in check but can\'t move. A draw!', 'Ahogado: el rey no está en jaque pero no puede moverse. ¡Tablas!'),
      material: tr('Ninguém tem peças para dar mate. Empate!', 'Nobody has enough pieces left to checkmate. A draw!', 'Nadie tiene piezas para dar mate. ¡Tablas!'),
      repeat: tr('A mesma posição três vezes. Empate!', 'The same position three times. A draw!', 'La misma posición tres veces. ¡Tablas!'),
      fifty: tr('Cinquenta lances sem pegar nada nem mexer um peão. Empate!', 'Fifty moves with nothing taken and no pawn moved. A draw!', 'Cincuenta jugadas sin capturar ni mover un peón. ¡Tablas!')
    };
    tell(words[why]);
    var tips = {}, praise = {};
    for (var q = 0; q < players.length; q++) {
      var p = players[q];
      if (p.robot) continue;
      var notes = g.notes[p.id].sort(function (a, b) { return b.gap - a.gap; });
      var b = g.best[p.id], list = [], seen = {};
      for (var n = 0; n < notes.length && list.length < 2; n++) {
        if (seen[notes[n].text]) continue;
        seen[notes[n].text] = true;
        list.push(notes[n].text);
      }
      if (list.length < 2 && !b.castled && s.full > 15) list.push(tr(
        'Faça o roque cedo: o rei fica guardado num canto e a torre entra no jogo.',
        'Castle early: it tucks your king into a corner and brings a rook into the game.',
        'Enroca pronto: el rey queda a salvo en una esquina y la torre entra en juego.'));
      tips[p.id] = list;
      var good = [];
      if (b.castled) good.push(tr('Fez o roque: rei protegido.', 'You castled: king tucked away safe.', 'Enrocaste: rey a salvo.'));
      if (b.queens) good.push(tr('Levou um peão até o fim e ganhou uma rainha.', 'You took a pawn all the way and got a queen.', 'Llevaste un peón hasta el final y ganaste una dama.'));
      if (b.taken) good.push(Table.say('Peças pegas: {n}.', 'Pieces taken: {n}.', 'Piezas capturadas: {n}.', b.taken));
      if (b.checks) good.push(Table.say('Xeques dados: {n}.', 'Checks given: {n}.', 'Jaques dados: {n}.', b.checks));
      praise[p.id] = good;
    }
    var again = g.opts.again;
    later(2600, function () {
      stop();
      UI.close();
      Table.debrief({game: 'chess', order: order, tips: tips, praise: praise, again: again, draw: draw ? words[why] : ''});
    });
  }

  function key(k) {
    if (!g) return false;
    if (k === TV.keys.back || k === 27 || k === 8) {
      if (g.picked >= 0) { g.picked = -1; g.targets = []; paint(); tell('', tr('Setas para andar, OK para pegar uma peça', 'Arrows to move, OK to pick up a piece', 'Flechas para moverte, OK para coger una pieza')); return true; }
      return false;
    }
    if (g.phase !== 'move') return true;
    var c = g.cursor[g.s.turn], r = c >> 3, f = c & 7, d = g.flip ? -1 : 1;
    if (k === TV.keys.up) r -= d;
    else if (k === TV.keys.down) r += d;
    else if (k === TV.keys.left) f -= d;
    else if (k === TV.keys.right) f += d;
    else if (k === TV.keys.ok) { press(); return true; }
    else return true;
    if (r < 0 || r > 7 || f < 0 || f > 7) return true;
    g.cursor[g.s.turn] = r * 8 + f;
    paint();
    return true;
  }

  return {
    start: start,
    // For the tests (and nothing else).
    rules: {newGame: newGame, fromFen: fromFen, legal: legal, play: play, make: make, unmake: unmake, status: status,
      inCheck: inCheck, rank: rank, robotPick: robotPick, depthFor: depthFor, sq: sq, name: name, evaluate: evaluate, MATE: MATE}
  };
})();
