/*
 * Kids' picks: for a kid watching, the cards on the home screen are good shows and films matched to what they're
 * into, instead of whatever is trending. What they're into comes from two places: what a grown-up set (in Beyond
 * Family's parent hub, or behind the grown-up PIN in the kid's profile here), and what the kid picked themselves
 * (Make it yours, or "What do you like to watch?" on the first card when nobody has said yet).
 *
 * A short list chosen by hand, of shows that are each service's own, so they stay put: no TMDB key needed, and only
 * the ones on an app the TV has. Coming back from an app, a kid is now and then offered one of them next.
 *
 * Plain ES5, like the rest of web/.
 */
var KidPicks = (function () {
  'use strict';

  /** What a kid can be into. The same ids as Beyond Family's parent hub (shared/tv.ts TV_LIKES): keep them in step. */
  var LIKES = [
    {id: 'animals', emoji: '🐾', name: function () { return tr('Animais', 'Animals', 'Animales'); }},
    {id: 'dinos', emoji: '🦖', name: function () { return tr('Dinossauros', 'Dinosaurs', 'Dinosaurios'); }},
    {id: 'space', emoji: '🚀', name: function () { return tr('Espaço', 'Space', 'El espacio'); }},
    {id: 'sport', emoji: '⚽', name: function () { return tr('Esporte', 'Sport', 'Deporte'); }},
    {id: 'music', emoji: '🎵', name: function () { return tr('Música', 'Music', 'Música'); }},
    {id: 'drawing', emoji: '🎨', name: function () { return tr('Desenhar', 'Drawing', 'Dibujar'); }},
    {id: 'games', emoji: '🎮', name: function () { return tr('Jogos', 'Games', 'Juegos'); }},
    {id: 'magic', emoji: '✨', name: function () { return tr('Magia', 'Magic', 'Magia'); }},
    {id: 'cars', emoji: '🏎️', name: function () { return tr('Carros', 'Cars', 'Coches'); }},
    {id: 'funny', emoji: '😂', name: function () { return tr('Coisas engraçadas', 'Funny stuff', 'Cosas graciosas'); }},
    {id: 'building', emoji: '🧱', name: function () { return tr('Construir', 'Building', 'Construir'); }},
    {id: 'ocean', emoji: '🐳', name: function () { return tr('O mar', 'The ocean', 'El mar'); }}
  ];

  /**
   * [title, kind, app, likes]. Each is that service's own show or film (Netflix, Disney, Prime Video and Apple TV
   * originals, and Disney and Pixar films on Disney+), so it doesn't wander off to another service next month.
   */
  var SHOWS = [
    ['Bluey', 'tv', 'disney', ['funny', 'animals']],
    ['Gigantosaurus', 'tv', 'disney', ['dinos']],
    ['The Good Dinosaur', 'movie', 'disney', ['dinos', 'animals']],
    ['Finding Nemo', 'movie', 'disney', ['ocean', 'animals', 'funny']],
    ['Moana', 'movie', 'disney', ['ocean', 'music', 'magic']],
    ['Luca', 'movie', 'disney', ['ocean', 'magic']],
    ['Secrets of the Whales', 'tv', 'disney', ['ocean', 'animals']],
    ['Cars', 'movie', 'disney', ['cars', 'sport', 'funny']],
    ['Cars on the Road', 'tv', 'disney', ['cars', 'funny']],
    ['Toy Story', 'movie', 'disney', ['funny', 'building']],
    ['WALL-E', 'movie', 'disney', ['space', 'building']],
    ['Lightyear', 'movie', 'disney', ['space']],
    ['Encanto', 'movie', 'disney', ['music', 'magic']],
    ['Coco', 'movie', 'disney', ['music', 'drawing']],
    ['Frozen', 'movie', 'disney', ['magic', 'music']],
    ['Zootopia', 'movie', 'disney', ['animals', 'funny']],
    ['Big Hero 6', 'movie', 'disney', ['building', 'games']],
    ['Wreck-It Ralph', 'movie', 'disney', ['games', 'cars', 'funny']],
    ['Inside Out', 'movie', 'disney', ['funny']],
    ['Cool Runnings', 'movie', 'disney', ['sport', 'funny']],
    ['The Mighty Ducks: Game Changers', 'tv', 'disney', ['sport']],
    ['Jurassic World: Camp Cretaceous', 'tv', 'netflix', ['dinos']],
    ['Ridley Jones', 'tv', 'netflix', ['dinos', 'animals']],
    ['Octonauts: Above & Beyond', 'tv', 'netflix', ['ocean', 'animals']],
    ['Our Planet', 'tv', 'netflix', ['animals', 'ocean']],
    ['StoryBots: Answer Time', 'tv', 'netflix', ['space', 'funny', 'music']],
    ['The Magic School Bus Rides Again', 'tv', 'netflix', ['space', 'building', 'magic']],
    ['Ada Twist, Scientist', 'tv', 'netflix', ['building', 'space']],
    ['Hilda', 'tv', 'netflix', ['magic', 'drawing', 'animals']],
    ["Gabby's Dollhouse", 'tv', 'netflix', ['magic', 'drawing']],
    ["Karma's World", 'tv', 'netflix', ['music']],
    ['Spirit Riding Free', 'tv', 'netflix', ['animals', 'sport']],
    ['Sonic Prime', 'tv', 'netflix', ['games']],
    ['Leo', 'movie', 'netflix', ['animals', 'funny', 'music']],
    ['The Mitchells vs. the Machines', 'movie', 'netflix', ['funny', 'games', 'cars']],
    ['Klaus', 'movie', 'netflix', ['magic', 'drawing']],
    ['The Sea Beast', 'movie', 'netflix', ['ocean', 'magic']],
    ['Over the Moon', 'movie', 'netflix', ['space', 'music']],
    ['Chicken Run: Dawn of the Nugget', 'movie', 'netflix', ['funny', 'animals', 'building']],
    ['Pete the Cat', 'tv', 'prime', ['music', 'funny', 'animals']],
    ['Tumble Leaf', 'tv', 'prime', ['building', 'animals']],
    ['If You Give a Mouse a Cookie', 'tv', 'prime', ['funny', 'animals']],
    ['Snoopy in Space', 'tv', 'appletv', ['space', 'funny']],
    ['The Snoopy Show', 'tv', 'appletv', ['funny', 'animals', 'sport']],
    ['Fraggle Rock: Back to the Rock', 'tv', 'appletv', ['music', 'funny']],
    ['Helpsters', 'tv', 'appletv', ['building']],
    ['Wolfwalkers', 'movie', 'appletv', ['magic', 'animals', 'drawing']]
  ];

  var NUDGE = 'btv.kidnudge', NUDGE_EVERY = 3 * 3600000;

  function like(id) { for (var i = 0; i < LIKES.length; i++) if (LIKES[i].id === id) return LIKES[i]; return null; }

  /** What this kid is into: what a grown-up set, then what they picked themselves. */
  function likesOf(p) {
    var out = [], all = (p && p.likes || []).concat(p && p.loves || []);
    for (var i = 0; i < all.length; i++) if (like(all[i]) && out.indexOf(all[i]) < 0) out.push(all[i]);
    return out;
  }

  /** A number that changes once a day, so the order shifts each morning but holds all day. */
  function spin(text, day) {
    var h = day;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
    return h;
  }

  /**
   * The cards for a kid watching, or null when it isn't a kid (then the usual picks show). kind: 'movie', 'tv' or
   * null for both. When nobody has said what they're into yet: one card that asks.
   */
  function cards(kind) {
    var me = Profiles.current();
    if (!me.kid) return null;
    var likes = likesOf(me);
    if (!likes.length) {
      return [{id: 'kid-ask', ask: true, emoji: '💭', colour: me.colour,
        title: tr('Do que você gosta de assistir?', 'What do you like to watch?', '¿Qué te gusta ver?'),
        meta: tr('Me conte e eu acho algo bom', "Tell me and I'll find something good", 'Cuéntame y busco algo bueno')}];
    }
    var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000), list = [];
    for (var i = 0; i < SHOWS.length; i++) {
      var s = SHOWS[i], app = Data.appFor(s[2]);
      if (!app || (kind && s[1] !== kind)) continue;
      var hits = [];
      for (var j = 0; j < s[3].length; j++) if (likes.indexOf(s[3][j]) >= 0) hits.push(s[3][j]);
      if (!hits.length) continue;
      // Every like gets a turn at the front: the one this card is "because of" rotates by the day.
      var why = like(hits[day % hits.length]);
      list.push({id: 'kid:' + s[0], kid: true, title: s[0], kind: s[1], app: s[2], service: serviceName(s[2], app),
        emoji: why.emoji, colour: me.colour, score: hits.length * 1000 + spin(s[0], day) % 1000,
        meta: tr('Porque você gosta de ', 'Because you love ', 'Porque te gusta ') + why.name().toLowerCase() + ' · ' + serviceName(s[2], app)});
    }
    list.sort(function (a, b) { return b.score - a.score; });
    return list.slice(0, 3);
  }

  function serviceName(key, app) {
    return {disney: 'Disney+', netflix: 'Netflix', prime: 'Prime Video', appletv: 'Apple TV'}[key] || (app && app.title) || '';
  }

  /** Opens a pick: says what to look for, then opens the app (a TV app can't be asked for one show by name). */
  function watch(pick, launch) {
    var app = Data.appFor(pick.app);
    if (!app) return;
    UI.toast(tr('Abrindo ', 'Opening ', 'Abriendo ') + pick.service + tr('. Procure ', ': look for ', '. Busca ') + pick.title);
    setTimeout(function () { launch(app.id, app.title); }, 1800);
  }

  // MARK: - Choosing what they're into

  /**
   * The grid of likes. title and sub head it; on is the list it starts with; saved(list) runs on Done.
   * Kids use it for themselves, grown-ups behind the PIN for a kid.
   */
  function choose(title, sub, on, saved) {
    var picked = (on || []).slice();
    UI.open({
      cls: 'bt-likes',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, title, sub);
        var g = UI.el('div', 'mw-grid', box), size = 170, gap = 46, cols = 6, nodes = [];
        g.style.width = (cols * (size + gap)) + 'px';
        g.style.height = (Math.ceil(LIKES.length / cols) * (size + gap)) + 'px';
        for (var i = 0; i < LIKES.length; i++) {
          (function (l, i) {
            var c = UI.el('div', 'mw-choice' + (picked.indexOf(l.id) >= 0 ? ' on' : ''), g);
            c.style.width = c.style.height = size + 'px';
            c.style.left = (i % cols) * (size + gap) + 'px';
            c.style.top = Math.floor(i / cols) * (size + gap) + 'px';
            UI.el('span', 'mw-emoji', c, l.emoji);
            UI.el('span', 'mw-love-name', c, l.name());
            nodes.push(c);
            api.add(c, function () {
              var at = picked.indexOf(l.id);
              if (at >= 0) picked.splice(at, 1); else picked.push(l.id);
              UI.setClass(c, 'on', at < 0);
            }, {first: i === 0});
          })(LIKES[i], i);
        }
        var row = UI.el('div', 'bt-buttons', box);
        api.add(UI.button(row, tr('Pronto', 'Done', 'Listo'), 'check', 'primary'), function () { api.close(); saved(picked); });
      }
    });
  }

  /** The first card's question, for the kid watching. */
  function ask(done) {
    var me = Profiles.current();
    choose(tr('Do que você gosta, ', 'What are you into, ', '¿Qué te gusta, ') + me.name + '?',
      tr('Escolha quantos quiser. Eu acho coisas boas para assistir.', "Pick as many as you like. I'll find good things to watch.",
        'Elige todos los que quieras. Busco cosas buenas para ver.'),
      me.loves, function (list) { Profiles.setLoves(list); if (done) done(); });
  }

  // MARK: - Something good next

  /** Back from an app: now and then, offer a kid one of their picks to watch next. True when it showed. */
  function maybeNudge(launch) {
    var me = Profiles.current();
    if (!me.kid || UI.active()) return false;
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(NUDGE)) || {}; } catch (e) {}
    if (seen[me.id] && Date.now() - seen[me.id] < NUDGE_EVERY && Date.now() >= seen[me.id]) return false;
    var list = cards(null);
    if (!list || !list.length || list[0].ask) return false;
    var pick = list[Math.floor(Date.now() / 3600000) % list.length];
    seen[me.id] = Date.now();
    try { localStorage.setItem(NUDGE, JSON.stringify(seen)); } catch (e) {}
    UI.open({
      cls: 'bt-outside',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, pick.emoji);
        UI.heading(box, tr('Que tal algo novo?', 'How about something new?', '¿Qué tal algo nuevo?'),
          pick.title + ' · ' + pick.meta);
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Vamos ver', "Let's watch it", 'A verlo'), 'play', 'primary'), function () { a.close(); watch(pick, launch); }, {first: true});
        a.add(UI.button(row, tr('Agora não', 'Not now', 'Ahora no')), function () { a.close(); });
      }
    });
    return true;
  }

  return {LIKES: LIKES, likesOf: likesOf, cards: cards, watch: watch, choose: choose, ask: ask, maybeNudge: maybeNudge, count: SHOWS.length};
})();
