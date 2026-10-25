/*
 * Slap games on the OK button (ADR 0024): one person with the remote against one to three robots.
 *
 * Sheep, Penguin, Volcano (our own game): each turn a card turns over and the table says the next word of the chant,
 * Sheep, Penguin, Volcano, Fish, Hokey pokey, over and over. When the card is the word, everyone slaps (OK) and the
 * last to slap takes the pile. Slapping when it isn't a match takes the pile too.
 * Snap: the same, but the match is a card the same as the one under it.
 *
 * Cards turn by themselves, one player after another; the first to run out who then makes the next slap in time wins.
 * Robots react in a time that comes from the level (table.js), sometimes miss, and now and then slap too soon, like
 * people do. Plain ES5.
 */
var Snap = (function () {
  'use strict';

  var CHANT = [
    {icon: '🐑', word: function () { return tr('Ovelha', 'Sheep', 'Oveja'); }},
    {icon: '🐧', word: function () { return tr('Pinguim', 'Penguin', 'Pingüino'); }},
    {icon: '🌋', word: function () { return tr('Vulcão', 'Volcano', 'Volcán'); }},
    {icon: '🐟', word: function () { return tr('Peixe', 'Fish', 'Pez'); }},
    {icon: '🍦', word: function () { return tr('Sorvete', 'Hokey pokey', 'Helado'); }}
  ];
  var PICTURES = ['🐑', '🐧', '🌋', '🐟', '🍦', '🌈', '⭐', '🚀'];

  // MARK: - Robots, from the level (1 to 10)

  function reaction(level, random) { return (1500 - 105 * level) * (0.8 + 0.4 * (random || Math.random)()); }
  function missChance(level) { return Math.max(0.02, 0.25 - 0.023 * level); }
  function tooSoonChance(level) { return Math.max(0, 0.05 - 0.005 * level); }
  function pace(level) { return 1700 - 70 * level; }

  // MARK: - The cards

  function deck(chant) {
    var out = [], kinds = chant ? CHANT.length : PICTURES.length, each = chant ? 10 : 6;
    for (var k = 0; k < kinds; k++) for (var n = 0; n < each; n++) out.push(k);
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function deal(players, cards) {
    var hands = [];
    for (var p = 0; p < players.length; p++) hands.push([]);
    for (var i = 0; i < cards.length; i++) hands[i % players.length].push(cards[i]);
    return hands;
  }

  /** Is the card just turned a match? word is the chant's word index for this turn, under the card below it. */
  function isMatch(chant, card, word, under) { return chant ? card === word : under !== undefined && under !== null && card === under; }

  /** Who takes the pile: someone who didn't slap (the person first, since only they can be seen), else the slowest. */
  function loser(players, slaps) {
    var slapped = {};
    for (var i = 0; i < slaps.length; i++) slapped[slaps[i].pi] = true;
    var missing = [];
    for (var p = 0; p < players.length; p++) if (!slapped[p]) missing.push(p);
    if (missing.length) {
      for (var m = 0; m < missing.length; m++) if (!players[missing[m]].who.robot) return missing[m];
      return missing[Math.floor(Math.random() * missing.length)];
    }
    return slaps[slaps.length - 1].pi;
  }

  // MARK: - On screen

  var g = null;

  function start(opts) {
    var players = [], hands = deal(opts.players, deck(opts.chant));
    for (var i = 0; i < opts.players.length; i++) players.push({who: opts.players[i], hand: hands[i]});
    var me = 0;
    for (var h = 0; h < players.length; h++) if (!players[h].who.robot) { me = h; break; }
    g = {opts: opts, chant: !!opts.chant, level: opts.level, players: players, me: me, pile: [], flips: 0, turn: me,
      window: null, quiet: 0, timers: [], nodes: {}, firstOut: -1,
      stats: {matches: 0, hits: 0, misses: 0, tooSoon: 0, times: []}};
    UI.open({
      cls: 'bt-table tg-snap',
      build: function (layer) { draw(layer); },
      key: key,
      back: function () {
        hold(true);
        Table.leave(function (yes) { if (yes) { stop(); UI.close(); } else hold(false); });
        return true;
      },
      closed: function () { stop(); }
    });
    tell(tr('Prepare-se… aperte OK quando combinar!', 'Get ready… press OK on a match!', 'Prepárate… ¡pulsa OK cuando coincidan!'));
    later(1800, flip);
  }

  function later(ms, fn) {
    var t = setTimeout(function () { if (!g) return; if (g.paused) g.queued = fn; else fn(); }, ms);
    g.timers.push(t);
  }
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

  function name(pl) { return pl.who.robot ? pl.who.name : Table.nameOf(pl.who); }

  function draw(layer) {
    var top = UI.el('div', 'sn-top', layer);
    UI.heading(top, g.chant ? tr('Ovelha, Pinguim, Vulcão', 'Sheep, Penguin, Volcano', 'Oveja, Pingüino, Volcán') : 'Snap');
    if (g.chant) {
      var strip = UI.el('div', 'sn-chant', top);
      g.nodes.words = [];
      for (var c = 0; c < CHANT.length; c++) g.nodes.words.push(UI.el('span', '', strip, CHANT[c].icon + ' ' + CHANT[c].word()));
    }
    var table = UI.el('div', 'sn-table' + (g.chant ? ' chant' : ''), layer);
    g.nodes.word = UI.el('div', 'sn-word', table, '');
    var pile = UI.el('div', 'sn-pile', table);
    g.nodes.under = UI.el('div', 'sn-card under', pile);
    g.nodes.card = UI.el('div', 'sn-card', pile);
    g.nodes.size = UI.el('div', 'sn-size', table, '');
    var seats = UI.el('div', 'sn-seats', layer);
    g.nodes.seats = [];
    for (var i = 0; i < g.players.length; i++) {
      var pl = g.players[i];
      var seat = UI.el('div', 'sn-seat' + (pl.who.robot ? '' : ' me'), seats);
      UI.avatar(pl.who.guest ? {name: '+', colour: pl.who.colour} : pl.who, seat, 96);
      UI.el('div', 'name', seat, pl.who.robot ? name(pl) + ' 🤖' : name(pl));
      var cards = UI.el('div', 'cards', seat, '');
      var hand = UI.el('div', 'slap', seat, '');
      g.nodes.seats.push({seat: seat, cards: cards, slap: hand});
    }
    g.nodes.say = UI.el('div', 'sn-say', layer, '');
    UI.el('div', 'sn-hint', layer, tr('OK = bater!', 'OK = slap!', '¡OK = golpear!'));
    paint();
  }

  function face(node, card, under) {
    node.innerHTML = '';
    if (card === undefined || card === null) { UI.setClass(node, 'empty', true); return; }
    UI.setClass(node, 'empty', false);
    // In the chant game the card underneath is only the pile: just the top card has a face to read.
    if (under && g.chant) return;
    UI.el('div', 'pic', node, g.chant ? CHANT[card].icon : PICTURES[card]);
    if (g.chant) UI.el('div', 'label', node, CHANT[card].word());
  }

  function paint() {
    if (!g) return;
    var top = g.pile[g.pile.length - 1], under = g.pile[g.pile.length - 2];
    face(g.nodes.card, top);
    face(g.nodes.under, under, true);
    g.nodes.size.textContent = g.pile.length ? Table.say('Cartas na pilha: {n}', 'Cards in the pile: {n}', 'Cartas en el montón: {n}', g.pile.length) : '';
    for (var i = 0; i < g.players.length; i++) {
      var s = g.nodes.seats[i];
      s.cards.textContent = '🂠 ' + g.players[i].hand.length;
      UI.setClass(s.seat, 'turn', i === g.turn);
    }
  }

  function tell(text) { if (g) g.nodes.say.textContent = text; }

  function flip() {
    if (!g) return;
    // The next player with cards turns one over.
    var tries = 0;
    while (!g.players[g.turn].hand.length && tries < g.players.length) { g.turn = (g.turn + 1) % g.players.length; tries++; }
    if (!g.players[g.turn].hand.length) { finish(g.firstOut >= 0 ? g.firstOut : g.me); return; }
    var pl = g.players[g.turn];
    var card = pl.hand.shift();
    if (!pl.hand.length && g.firstOut < 0) g.firstOut = g.turn;
    var under = g.pile[g.pile.length - 1];
    g.pile.push(card);
    var word = g.flips % CHANT.length;
    g.flips++;
    clearSlaps();
    if (g.chant) {
      g.nodes.word.textContent = CHANT[word].word() + '!';
      for (var w = 0; w < g.nodes.words.length; w++) UI.setClass(g.nodes.words[w], 'on', w === word);
    } else g.nodes.word.textContent = '';
    UI.setClass(g.nodes.card, 'turned', false);
    paint();
    setTimeout(function () { if (g) UI.setClass(g.nodes.card, 'turned', true); }, 20);
    tell(Table.say('{n} virou uma carta', '{n} turned a card', '{n} volteó una carta', name(pl)));
    var match = isMatch(g.chant, card, word, under);
    g.turn = (g.turn + 1) % g.players.length;
    if (match) open();
    else {
      robotsTooSoon();
      if (g) later(pace(g.level), flip);
    }
  }

  function clearSlaps() {
    for (var i = 0; i < g.nodes.seats.length; i++) { g.nodes.seats[i].slap.textContent = ''; UI.setClass(g.nodes.seats[i].seat, 'slapped', false); }
  }

  /** A match: everyone slaps, the robots in their own time. */
  function open() {
    g.window = {at: Date.now(), slaps: [], closed: false};
    if (!g.players[g.me].who.robot) g.stats.matches++;
    for (var i = 0; i < g.players.length; i++) {
      if (!g.players[i].who.robot) continue;
      if (Math.random() < missChance(g.level)) continue;
      (function (pi) { later(reaction(g.level), function () { slap(pi); }); })(i);
    }
    later(2600, close);
  }

  function slap(pi) {
    var w = g.window;
    if (!w || w.closed) return;
    for (var i = 0; i < w.slaps.length; i++) if (w.slaps[i].pi === pi) return;
    var ms = Date.now() - w.at;
    w.slaps.push({pi: pi, ms: ms});
    var s = g.nodes.seats[pi];
    s.slap.textContent = '✋ ' + w.slaps.length;
    UI.setClass(s.seat, 'slapped', true);
    if (!g.players[pi].who.robot) { g.stats.hits++; g.stats.times.push(ms); }
    if (w.slaps.length === g.players.length) later(350, close);
  }

  function close() {
    var w = g.window;
    if (!w || w.closed) return;
    w.closed = true;
    var meSlapped = false;
    for (var i = 0; i < w.slaps.length; i++) if (w.slaps[i].pi === g.me) meSlapped = true;
    if (!meSlapped) g.stats.misses++;
    var lose = loser(g.players, w.slaps);
    // Out of cards and in time: that's the game.
    for (var p = 0; p < g.players.length; p++) {
      var inTime = false;
      for (var q = 0; q < w.slaps.length; q++) if (w.slaps[q].pi === p) inTime = true;
      if (p !== lose && inTime && !g.players[p].hand.length) { g.window = null; finish(p); return; }
    }
    take(lose, Table.say('{n} foi o último: fica com a pilha.', '{n} was last: takes the pile.', '{n} fue el último: se lleva el montón.', name(g.players[lose])));
    g.window = null;
    g.quiet = Date.now() + 400;
    later(1700, flip);
  }

  function take(pi, text) {
    var pl = g.players[pi];
    while (g.pile.length) pl.hand.push(g.pile.shift());
    if (pi === g.firstOut) g.firstOut = -1;
    g.nodes.word.textContent = '';
    paint();
    tell(text);
  }

  /** Now and then a robot slaps when it shouldn't, as people do: it takes the pile. */
  function robotsTooSoon() {
    for (var i = 0; i < g.players.length; i++) {
      if (!g.players[i].who.robot || !g.pile.length) continue;
      if (Math.random() < tooSoonChance(g.level)) {
        (function (pi) {
          later(500 + Math.random() * 400, function () {
            if (g.window || !g.pile.length) return;
            g.nodes.seats[pi].slap.textContent = '✋';
            take(pi, Table.say('Opa! {n} bateu sem combinar: fica com a pilha.', 'Oops! {n} slapped with no match: takes the pile.', '¡Uy! {n} golpeó sin coincidencia: se lleva el montón.', name(g.players[pi])));
          });
        })(i);
        return;
      }
    }
  }

  function finish(pi) {
    if (!g) return;
    var winner = g.players[pi];
    var others = g.players.filter(function (p) { return p !== winner; }).sort(function (a, b) { return a.hand.length - b.hand.length; });
    var order = [winner].concat(others).map(function (p) { return p.who; });
    var st = g.stats, me = g.players[g.me].who;
    var tips = [], praise = [];
    var avg = 0, best = 0;
    for (var i = 0; i < st.times.length; i++) { avg += st.times[i]; if (!best || st.times[i] < best) best = st.times[i]; }
    if (st.times.length) avg /= st.times.length;
    if (best) praise.push(Table.say('Batida mais rápida: {n} s.', 'Fastest slap: {n} seconds.', 'Golpe más rápido: {n} s.', (best / 1000).toFixed(2)));
    if (st.matches) praise.push(Table.say('Combinações batidas: {n} de {m}.', 'Matches slapped: {n} of {m}.', 'Coincidencias golpeadas: {n} de {m}.', st.hits, st.matches));
    if (st.tooSoon >= 2) tips.push(tr('Espere a combinação: bater sem combinar faz você ficar com a pilha. Olhe a palavra e a carta juntas.',
      'Wait for the match: a slap with no match means taking the pile. Watch the word and the card together.',
      'Espera la coincidencia: golpear sin coincidencia te hace llevar el montón. Mira la palabra y la carta juntas.'));
    if (st.misses >= 2) tips.push(g.chant ? Table.say('Você perdeu {n} combinações. Dizer a palavra em voz alta ajuda: todos dizem quando a carta vira.',
      'You missed {n} matches. Saying the word out loud helps: everyone says it as the card turns.',
      'Te perdiste {n} coincidencias. Decir la palabra en voz alta ayuda: todos la dicen cuando se voltea la carta.', st.misses) :
      Table.say('Você perdeu {n} combinações. Olhe a carta de baixo: é com ela que a nova tem de combinar.',
        'You missed {n} matches. Keep an eye on the card underneath: that\'s the one the new card has to match.',
        'Te perdiste {n} coincidencias. Mira la carta de abajo: es con la que tiene que coincidir la nueva.', st.misses));
    if (avg > 900) tips.push(Table.say('Sua média foi {n} s. Deixe o polegar descansando no OK para estar pronto.',
      'You were {n} seconds on average. Rest your thumb on OK so it\'s ready to go.',
      'Tu media fue {n} s. Deja el pulgar sobre OK para estar listo.', (avg / 1000).toFixed(2)));
    var t = {}, p = {}, extra = {};
    t[me.id] = tips;
    p[me.id] = praise;
    if (best) {
      var before = Table.record(me, g.chant ? 'chant' : 'snap').bestMs;
      extra[me.id] = {bestMs: before && before < best ? before : Math.round(best)};
      if (before && best < before) praise.unshift(tr('Sua batida mais rápida de todas!', 'Your fastest slap ever!', '¡Tu golpe más rápido!'));
    }
    var again = g.opts.again, game = g.chant ? 'chant' : 'snap';
    stop();
    UI.close();
    Table.debrief({game: game, order: order, tips: t, praise: p, extra: extra, again: again});
  }

  function key(k) {
    if (!g) return false;
    if (k === TV.keys.back || k === 27 || k === 8) return false;
    if (k !== TV.keys.ok) return true;
    if (g.paused) return true;
    if (g.window && !g.window.closed) { slap(g.me); return true; }
    if (Date.now() < g.quiet) return true;
    // No match: a slap too soon takes the pile.
    if (g.pile.length) {
      g.stats.tooSoon++;
      g.nodes.seats[g.me].slap.textContent = '✋';
      take(g.me, tr('Opa, não combinou: você fica com a pilha.', 'Oops, no match: you take the pile.', 'Uy, no coincide: te llevas el montón.'));
      g.quiet = Date.now() + 600;
    }
    return true;
  }

  return {
    start: start,
    // For the tests (and nothing else).
    rules: {deck: deck, deal: deal, isMatch: isMatch, loser: loser, reaction: reaction, missChance: missChance, tooSoonChance: tooSoonChance, pace: pace, CHANT: CHANT}
  };
})();
