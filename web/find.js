/*
 * Find (ADR 0057): say what you want and the TV finds it. A game, a channel, an app or a show, from the remote alone:
 * press the Find button (the microphone at the top of the home screen) or the remote's own microphone or search
 * button where the TV passes it to us, say "Candy Land", "Sky News" or "Bluey", and the best matches come up as big
 * tiles to open with OK. Where the TV can't hear (no voice on it), Type it brings the on-screen keyboard instead.
 *
 * Nothing said is kept or sent anywhere by Find: the words are matched here on the TV. A show goes to the TV's own
 * search on Google TV, or to Ask Beyond when Beyond Family is linked (which answers with this TV's apps). A kid gets
 * the games, the kids' channels and their own shelf, and shows only through Ask Beyond, which gives a kid's answer.
 *
 * Google TV runs this same file in AskActivity's WebView (ask-host.js), so there is one of it to change. The host
 * (home.js here, ask-host.js there) says what's on this TV: Find.open(host, {listen}), host = {items(done), shows(q)
 * or null, listen(heard, failed) or null, kid}. Plain ES5, like the rest of web/.
 */
var Find = (function () {
  'use strict';

  // Words said around what somebody wants, left out before matching: "can we play Candy Land please".
  var FILLER = {};
  ('a an the some any and please can could we us i id me my want wanna like to lets let go put on play open watch find ' +
    'show start search look for of game games app channel hey ok okay beyond um uh').split(' ').forEach(function (w) { FILLER[w] = true; });

  /**
   * Other names people say for the things on the Games screen and the top of the home screen, by id (the same ids as
   * games.js and GamesActivity.java). A match on one of these is as good as the name itself.
   */
  var ALIASES = {
    rcland: ['remote control land', 'rc land', 'remote control cars', 'cars', 'trucks', 'diggers', 'driving', 'racing', 'boats', 'monster trucks'],
    candy: ['candy land', 'candyland', 'lollies', 'lolly land', 'sweets', 'cakes', 'bakery'],
    arcade: ['arcade games', 'space invaders', 'launch crew', 'rockets'],
    table: ['board games', 'card games', 'cards', 'chess', 'learn chess', 'ludo', 'snap', 'draughts', 'checkers'],
    silly: ['silly games', 'party games', 'funny games', 'laughs', 'jokes'],
    guides: ['how to play', 'rules', 'help with a game'],
    road: ['build a road', 'road', 'roadworks', 'asphalt'],
    bridge: ['build a bridge', 'bridge'],
    town: ['plan a town', 'town', 'city', 'build a town'],
    karaoke: ['karaoke', 'sing', 'singing', 'sing a song'],
    party: ['party', 'disco', 'dance party', 'birthday', 'dancing'],
    lights: ['light show', 'lights', 'music lights'],
    quiz: ['quiz', 'quiz night', 'trivia'],
    dinner: ['dinner question', 'dinner', 'question of the day'],
    lunch: ['school lunches', 'lunch', 'lunches', 'lunch box', 'school lunch'],
    tidy: ['tidy up', 'tidy up race', 'clean up', 'tidy', 'clean my room'],
    bedtime: ['bedtime', 'bed time', 'bed', 'sleep', 'go to sleep', 'goodnight', 'good night', 'night night', 'sleepy',
      'rain sounds', 'rain', 'waves', 'ocean sounds', 'calm', 'relax', 'white noise'],
    sky: ['tonights sky', 'night sky', 'stars', 'the stars', 'moon', 'the moon', 'planets', 'constellations'],
    live: ['live tv', 'tv channels', 'channels', 'free channels', 'the news', 'news channels', 'freeview']
  };

  /** Order of the kinds when two match as well: what Beyond TV opens itself first, then channels, then apps. */
  var KINDS = {game: 0, thing: 1, channel: 2, app: 3};

  // MARK: - Matching (pure, tested in tests/find.test.js)

  var ACCENTS = {'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'ā': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ō': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ū': 'u', 'ç': 'c', 'ñ': 'n', 'ß': 'ss'};

  /** Lower case, no accents or macrons, no punctuation: "Milo's Remote-Control Land!" is "milos remote control land". */
  function plain(s) {
    s = String(s || '').toLowerCase().replace(/[áàâãäāéèêëēíìîïīóòôõöōúùûüūçñß]/g, function (c) { return ACCENTS[c]; });
    return s.replace(/['’`]/g, '').replace(/\+/g, ' plus ').replace(/&/g, ' and ').replace(/[^a-z0-9а-яё]+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }

  // In a name only the little words are left out: "Sky Go" keeps its "go".
  var LITTLE = {a: true, an: true, the: true, and: true, of: true};

  /** The words that matter, filler left out (unless that leaves nothing, as in "Let's go"). name: only the little words. */
  function words(s, name) {
    var all = plain(s).split(' '), out = [], skip = name ? LITTLE : FILLER;
    for (var i = 0; i < all.length; i++) if (all[i] && !skip[all[i]]) out.push(all[i]);
    if (out.length) return out;
    for (i = 0; i < all.length; i++) if (all[i]) out.push(all[i]);
    return out;
  }

  /** Edits to turn a into b (insert, delete, change one letter), counted up to max + 1. */
  function edits(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var low = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < low) low = cur[j];
      }
      if (low > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  /** A word said is near a word in a name: the same, the start of it ("rem" for "remote"), or one letter out (two in a long word). */
  function near(said, word) {
    if (said === word) return true;
    if (said.length >= 3 && word.indexOf(said) === 0) return true;
    var max = word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0;
    return max > 0 && edits(said, word, max) <= max;
  }

  /**
   * How well what was said matches one name, 0 to 100. Both ways count: how much of what was said is in the name, and
   * how much of the name was said, so "sky news" picks Sky News over Tonight's sky.
   */
  function scoreName(said, name) {
    var q = typeof said === 'string' ? words(said) : said, t = words(name, true);
    if (!q.length || !t.length) return 0;
    if (q.join('') === t.join('')) return 100;
    var used = [], hit = 0;
    for (var i = 0; i < q.length; i++) {
      for (var j = 0; j < t.length; j++) {
        if (!used[j] && near(q[i], t[j])) { used[j] = true; hit++; break; }
      }
    }
    if (!hit) return 0;
    var told = hit / q.length, cover = hit / t.length;
    return Math.round(50 * told + 40 * cover + (told === 1 ? 10 : 0));
  }

  /**
   * An item's best score over its name and its other names, with the filler left out and, for a name that has one of
   * those words in it ("Sky Go"), with everything that was said.
   */
  function score(said, item) {
    var q = words(said), all = words(said, true), names = [item.name].concat(item.also || []), best = 0;
    for (var i = 0; i < names.length; i++) best = Math.max(best, scoreName(q, names[i]), all.length > q.length ? scoreName(all, names[i]) : 0);
    return best;
  }

  var ENOUGH = 55, MOST = 6;

  /** The best matches for what was said, best first, at most six, each item once. */
  function search(said, items) {
    var found = [];
    for (var i = 0; i < (items || []).length; i++) {
      var s = score(said, items[i]);
      if (s >= ENOUGH) found.push({item: items[i], score: s, at: i});
    }
    found.sort(function (a, b) {
      return b.score - a.score || (KINDS[a.item.kind] || 0) - (KINDS[b.item.kind] || 0) || a.at - b.at;
    });
    var out = [], seen = {};
    for (i = 0; i < found.length && out.length < MOST; i++) {
      var key = found[i].item.kind + ':' + plain(found[i].item.name);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(found[i].item);
    }
    return out;
  }

  /** Of the few things the TV heard ("bluey", "blue e"), the one that finds most: the first, unless a later one finds better. */
  function bestHeard(heard, items) {
    var best = heard[0] || '', top = -1;
    for (var i = 0; i < heard.length && i < 5; i++) {
      var r = search(heard[i], items), s = r.length ? score(heard[i], r[0]) : 0;
      if (s > top + (i ? 5 : 0)) { top = s; best = heard[i]; }
    }
    return best;
  }

  /** The Games screen's list as things Find can match, with the other names above. */
  function gameItems(list) {
    var out = [];
    for (var i = 0; i < (list || []).length; i++) {
      var g = list[i];
      out.push({kind: 'game', id: g.id, name: g.name, also: ALIASES[g.id] || [], run: g.run});
    }
    return out;
  }

  // MARK: - Listening

  /** The browser's own speech recognition, where the TV has it (some newer LG TVs and a computer's Chrome). */
  function webListen() {
    var R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return null;
    return function (heard, failed) {
      var r, got = false;
      try {
        r = new R();
        r.lang = ({pt: 'pt-BR', es: 'es-ES', de: 'de-DE', ru: 'ru-RU'})[window.I18N ? I18N.lang : 'en'] || 'en-NZ';
        r.interimResults = false;
        r.maxAlternatives = 4;
        r.onresult = function (e) {
          var list = [], res = e.results && e.results[0];
          for (var i = 0; res && i < res.length; i++) list.push(res[i].transcript);
          got = list.length > 0;
          if (got) heard(list); else failed();
        };
        r.onerror = function () { if (!got) { got = true; failed(); } };
        r.onend = function () { if (!got) { got = true; failed(); } };
        r.start();
      } catch (e) {
        failed();
      }
    };
  }

  // MARK: - The screen

  var KIND_WORDS = function (kind) {
    return kind === 'game' ? tr('Jogo', 'Game', 'Juego') : kind === 'channel' ? tr('Canal', 'Channel', 'Canal')
      : kind === 'app' ? tr('App', 'App', 'App') : kind === 'show' ? tr('Séries e filmes', 'Shows and movies', 'Series y películas')
      : tr('No Beyond™ TV', 'In Beyond™ TV', 'En Beyond™ TV');
  };

  var open_ = null;

  /**
   * Opens Find. opts.listen: start listening straight away (the remote's microphone was pressed).
   */
  function open(host, opts) {
    opts = opts || {};
    if (open_) open_.close();
    var items = [], ready = false, said = '', found = [], state = 'idle', api = null, goTo = null, want = null;
    var listen = host.listen || webListen();

    function go(text) {
      said = String(text || '').replace(/^\s+|\s+$/g, '');
      found = said ? search(said, items) : [];
      state = said ? 'found' : 'idle';
      redraw(true);
    }

    function redraw(toResults) {
      if (!api) return;
      goTo = toResults ? 'result' : null;
      want = null;
      api.rebuild();
      // A rebuild keeps the old place; after an answer the first match has the focus, else Talk.
      if (want) api.focusNode(want);
    }

    function talk() {
      if (!listen) { type(); return; }
      state = 'listening';
      redraw(false);
      listen(function (heard) {
        if (!api) return;
        go(ready ? bestHeard(heard, items) : heard[0]);
      }, function () {
        if (!api) return;
        state = 'missed';
        redraw(false);
      });
    }

    function type() {
      UI.open({
        cls: 'bt-talk bt-find-type',
        build: function (layer, a) {
          var box = UI.el('div', 'bt-box', layer);
          UI.heading(box, tr('Encontrar', 'Find', 'Buscar'), tr('Escreva o que você quer', 'Type what you\'re after', 'Escribe lo que buscas'));
          UI.keyboard(box, a, {max: 40, value: said, placeholder: tr('Um jogo, um canal, uma série', 'A game, a channel, a show', 'Un juego, un canal, una serie'),
            spaceLabel: tr('Espaço', 'Space', 'Espacio'), doneLabel: tr('Encontrar', 'Find', 'Buscar'),
            done: function (text) { a.close(); go(text); }});
        }
      });
    }

    function runItem(item) {
      api.close();
      if (item.run) item.run();
    }

    api = UI.open({
      cls: 'bt-find',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('Encontrar', 'Find', 'Buscar'), host.kid
          ? tr('Diga um jogo, um canal ou um programa', 'Say a game, a channel or a show', 'Di un juego, un canal o un programa')
          : tr('Diga um jogo, um canal, um app ou uma série', 'Say a game, a channel, an app or a show', 'Di un juego, un canal, una app o una serie'));

        var mic = UI.el('div', 'mic ' + state, box);
        UI.sym('mic', mic, 96);
        var line = UI.el('div', 'said', box);
        if (state === 'listening') line.textContent = tr('Pode falar…', 'Go ahead, I\'m listening…', 'Habla, te escucho…');
        else if (state === 'missed') line.textContent = tr('Não ouvi. Tente de novo, ou escreva.', 'I didn\'t catch that. Try again, or type it.', 'No te oí. Prueba otra vez, o escríbelo.');
        else if (said) line.textContent = '“' + said + '”';
        else line.textContent = host.kid
          ? tr('Tente “Candy Land”, “PBS KIDS” ou “Bluey”', 'Try “Candy Land”, “PBS KIDS” or “Bluey”', 'Prueba “Candy Land”, “PBS KIDS” o “Bluey”')
          : tr('Tente “Candy Land”, “Sky News” ou “Bluey”', 'Try “Candy Land”, “Sky News” or “Bluey”', 'Prueba “Candy Land”, “Sky News” o “Bluey”');
        UI.setClass(line, 'hint', !said || state === 'listening' || state === 'missed');

        var buttons = UI.el('div', 'bt-buttons', box);
        var first = null;
        if (listen) first = a.add(UI.button(buttons, said ? tr('Falar de novo', 'Say it again', 'Decirlo otra vez') : tr('Falar', 'Talk', 'Hablar'), 'mic', 'primary'), talk,
          {first: !goTo});
        var t = a.add(UI.button(buttons, tr('Escrever', 'Type it', 'Escribirlo')), type, {first: !listen && !goTo});
        if (!first) first = t;
        want = first;

        if (state === 'found') {
          var row = UI.el('div', 'results', box), firstResult = null;
          var shows = host.shows && said;
          if (!found.length && !shows) UI.el('div', 'none', row, tr('Nada com esse nome aqui. Tente outra palavra.',
            'Nothing by that name here. Try another word.', 'Nada con ese nombre aquí. Prueba otra palabra.'));
          for (var i = 0; i < found.length; i++) (function (item) {
            var tile = tileFor(row, KIND_WORDS(item.kind), item.name, item.kind);
            a.add(tile, function () { runItem(item); }, {first: goTo === 'result' && !firstResult});
            if (!firstResult) firstResult = tile;
          })(found[i]);
          if (goTo === 'result' && firstResult) want = firstResult;
          if (shows) {
            var st = tileFor(row, KIND_WORDS('show'), tr('Procurar “', 'Look for “', 'Buscar “') + said + '”', 'show');
            a.add(st, function () { api.close(); host.shows(said); }, {first: goTo === 'result' && !firstResult});
            if (goTo === 'result' && !firstResult) want = st;
          }
        }
      },
      closed: function () { open_ = null; api = null; }
    });
    open_ = api;

    host.items(function (list) {
      items = list || [];
      ready = true;
      if (said && api) go(said);
    });
    if (opts.listen && listen) talk();
    return api;
  }

  function tileFor(row, kind, name, cls) {
    var tile = UI.el('div', 'hit ' + cls, row);
    UI.el('div', 'kind', tile, kind);
    UI.el('div', 'name', tile, name);
    return tile;
  }

  return {
    open: open,
    on: function () { return !!open_; },
    gameItems: gameItems,
    ALIASES: ALIASES,
    rules: {plain: plain, words: words, near: near, scoreName: scoreName, score: score, search: search, bestHeard: bestHeard, gameItems: gameItems}
  };
})();

if (typeof module !== 'undefined') module.exports = Find;
