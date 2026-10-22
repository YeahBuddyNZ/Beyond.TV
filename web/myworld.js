/*
 * Make it yours: a kid sets up their own profile, on the TV, with the remote, no grown-up needed.
 *  - Five big steps: a buddy (their face), a colour, a world (what their home screen looks like), the things they love,
 *    then a little party. Back goes a step back; nothing is saved until the party.
 *  - Their world fills the home screen behind the apps: its colours and its things drifting slowly past, with the
 *    things they love mixed in. Only transform and opacity animate, so old TVs keep up.
 *  - It only ever changes the profile that's watching, and only how it looks: never the name, the shelf, the PIN or
 *    whether it's a kids' profile. So it needs no PIN.
 */
var MyWorld = (function () {
  'use strict';

  var BUDDIES = ['🦖', '🦕', '🦄', '🐉', '🦁', '🐯', '🐼', '🐨', '🦊', '🐶', '🐱', '🐰', '🐸', '🐵', '🦉', '🐧',
                 '🐬', '🐙', '🦈', '🐢', '🦋', '🐝', '🚀', '🛸', '🤖', '👾', '🧚', '🧙', '🦸', '⚽', '🏉', '🎸',
                 '🎨', '🛹', '🏎️', '🌈'];

  var COLOURS = ['#2F7D6D', '#3FA796', '#378ADD', '#2457B8', '#7A4FD0', '#B04FD0', '#D6589A', '#E8577A',
                 '#D85A30', '#E8A33D', '#E8C53D', '#55534B'];

  /** Each world: its sky (top and bottom), and the things that drift across it. */
  var WORLDS = [
    {id: 'ocean', top: '#0E5C8A', bottom: '#0A2A4A', things: ['🐠', '🐙', '🐬', '🐳', '🐢', '🐡'],
      name: function () { return tr('Fundo do mar', 'Under the sea', 'Bajo el mar'); }},
    {id: 'space', top: '#1B1446', bottom: '#05040F', things: ['🪐', '⭐', '🌙', '🚀', '☄️', '👽'],
      name: function () { return tr('Espaço', 'Outer space', 'El espacio'); }},
    {id: 'forest', top: '#2F7D6D', bottom: '#123A2F', things: ['🌿', '🍄', '🦉', '🦔', '🌲', '🐞'],
      name: function () { return tr('Floresta', 'The bush', 'El bosque'); }},
    {id: 'volcano', top: '#B8452A', bottom: '#2A0F0A', things: ['🌋', '🦖', '🔥', '🦕', '🪨', '🥚'],
      name: function () { return tr('Vulcão', 'Dino volcano', 'Volcán'); }},
    {id: 'candy', top: '#E77BB0', bottom: '#7A4FD0', things: ['🍭', '🧁', '🍬', '🌈', '🍩', '🦄'],
      name: function () { return tr('Doces', 'Candy land', 'Dulces'); }},
    {id: 'snow', top: '#7FB2D9', bottom: '#2C4B6E', things: ['❄️', '⛄', '🐧', '🏔️', '🧣', '🐻'],
      name: function () { return tr('Neve', 'Snow day', 'Nieve'); }},
    {id: 'sport', top: '#3E9A4A', bottom: '#174A22', things: ['⚽', '🏉', '🏆', '🏀', '🥅', '🏏'],
      name: function () { return tr('Esporte', 'Game day', 'Deportes'); }},
    {id: 'beach', top: '#F2B45A', bottom: '#2A8FB0', things: ['🏖️', '🐚', '🦀', '🌺', '🏄', '☀️'],
      name: function () { return tr('Praia', 'The beach', 'La playa'); }}
  ];

  var LOVES = [
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

  function world(id) { for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i]; return null; }
  function love(id) { for (var i = 0; i < LOVES.length; i++) if (LOVES[i].id === id) return LOVES[i]; return null; }

  // MARK: - The steps

  /** Opens "Make it yours" for whoever is watching. done() runs after the party (or when they back out). */
  function open(done) {
    var me = Profiles.current();
    var p = {emoji: me.emoji || '', colour: me.colour, world: me.world || '', loves: (me.loves || []).slice()};
    var steps = [buddy, colour, place, loves, party];
    var layer = null;

    function go(n) {
      if (layer) layer.close();
      if (n < 0) { if (done) done(); return; }
      layer = null;
      steps[n](n);
    }

    function frame(n, title, sub, build) {
      layer = UI.open({
        cls: 'mw',
        build: function (root, api) {
          paintSky(root, world(p.world), p);
          var head = UI.el('div', 'mw-head', root);
          var face = UI.el('div', 'mw-face', head);
          UI.avatar({name: me.name, colour: p.colour, emoji: p.emoji, kid: me.kid}, face, 120);
          var words = UI.el('div', 'mw-words', head);
          UI.el('div', 'mw-step', words, tr('Passo ', 'Step ', 'Paso ') + (n + 1) + tr(' de 4', ' of 4', ' de 4'));
          UI.el('div', 'mw-title', words, title);
          if (sub) UI.el('div', 'mw-sub', words, sub);
          build(UI.el('div', 'mw-body', root), api);
          var foot = UI.el('div', 'mw-foot', root);
          if (n > 0) api.add(UI.button(foot, tr('Voltar', 'Back', 'Atrás'), null, 'mw-back'), function () { go(n - 1); });
          api.add(UI.button(foot, n === 3 ? tr('Pronto!', "I'm done!", '¡Listo!') : tr('Próximo', 'Next', 'Siguiente'), 'chevron_right', 'primary'),
            function () { go(n + 1); }, {first: false});
        },
        back: function () { go(n - 1); return true; }
      });
    }

    /** A grid of big round choices; pick(value) runs on OK and the grid repaints. */
    function grid(parent, api, items, cols, size, isOn, pick, render) {
      var g = UI.el('div', 'mw-grid', parent);
      var gap = Math.round(size * 0.28);
      g.style.width = (cols * (size + gap)) + 'px';
      var nodes = [];
      for (var i = 0; i < items.length; i++) {
        (function (item, i) {
          var c = UI.el('div', 'mw-choice' + (isOn(item) ? ' on' : ''), g);
          c.style.width = c.style.height = size + 'px';
          c.style.left = (i % cols) * (size + gap) + 'px';
          c.style.top = Math.floor(i / cols) * (size + gap) + 'px';
          render(c, item);
          nodes.push(c);
          api.add(c, function () {
            pick(item);
            for (var j = 0; j < nodes.length; j++) UI.setClass(nodes[j], 'on', isOn(items[j]));
            pop(c);
            repaintHead();
          }, {first: isOn(item) || (i === 0 && !anyOn())});
        })(items[i], i);
      }
      g.style.height = (Math.ceil(items.length / cols) * (size + gap)) + 'px';
      function anyOn() { for (var k = 0; k < items.length; k++) if (isOn(items[k])) return true; return false; }
    }

    function repaintHead() {
      var root = UI.top() && UI.top().root;
      if (!root) return;
      var face = root.querySelector('.mw-face');
      if (face) { face.innerHTML = ''; UI.avatar({name: me.name, colour: p.colour, emoji: p.emoji, kid: me.kid}, face, 120); }
      paintSky(root, world(p.world), p);
    }

    function buddy(n) {
      frame(n, tr('Oi, ', Prefs.kupu() ? 'Kia ora, ' : 'Hello, ', 'Hola, ') + me.name + '!',
        tr('Escolha seu parceiro. Ele é você na TV.', "Pick your buddy. They'll be you on the TV.", 'Elige a tu compañero. Serás tú en la TV.'),
        function (body, api) {
          grid(body, api, BUDDIES, 12, 104, function (e) { return p.emoji === e; }, function (e) { p.emoji = e; },
            function (c, e) { UI.el('span', 'mw-emoji', c, e); });
        });
    }

    function colour(n) {
      frame(n, tr('Qual é a sua cor?', "What's your colour?", '¿Cuál es tu color?'),
        tr('Sua cor aparece em tudo que é seu.', 'Your colour shows on everything that is yours.', 'Tu color sale en todo lo tuyo.'),
        function (body, api) {
          grid(body, api, COLOURS, 6, 150, function (c) { return p.colour === c; }, function (c) { p.colour = c; },
            function (node, c) { node.style.background = c; UI.el('span', 'mw-emoji', node, p.emoji || ''); });
        });
    }

    function place(n) {
      frame(n, tr('Escolha o seu mundo', 'Choose your world', 'Elige tu mundo'),
        tr('Ele fica atrás dos seus apps.', 'It lives behind your apps on the home screen.', 'Vive detrás de tus apps.'),
        function (body, api) {
          grid(body, api, WORLDS, 4, 300, function (w) { return p.world === w.id; }, function (w) { p.world = w.id; },
            function (node, w) {
              node.className += ' mw-world';
              node.style.height = '190px';
              node.style.background = 'linear-gradient(' + w.top + ', ' + w.bottom + ')';
              UI.el('span', 'mw-world-things', node, w.things.slice(0, 3).join(' '));
              UI.el('span', 'mw-world-name', node, w.name());
            });
        });
    }

    function loves(n) {
      frame(n, tr('O que você ama?', 'What do you love?', '¿Qué te encanta?'),
        tr('Escolha quantos quiser.', 'Pick as many as you like.', 'Elige todos los que quieras.'),
        function (body, api) {
          grid(body, api, LOVES, 6, 190, function (l) { return p.loves.indexOf(l.id) >= 0; }, function (l) {
            var at = p.loves.indexOf(l.id);
            if (at >= 0) p.loves.splice(at, 1); else p.loves.push(l.id);
          }, function (node, l) {
            UI.el('span', 'mw-emoji big', node, l.emoji);
            UI.el('span', 'mw-love-name', node, l.name());
          });
        });
    }

    function party() {
      Profiles.setLook({emoji: p.emoji, colour: p.colour, world: p.world, loves: p.loves});
      layer = UI.open({
        cls: 'mw mw-party',
        build: function (root, api) {
          paintSky(root, world(p.world), p);
          var burst = UI.el('div', 'mw-burst', root);
          var bits = [p.emoji || '⭐'].concat(things(world(p.world), p.loves)).concat(['✨', '🎉', '⭐']);
          var flying = [];
          for (var i = 0; i < 28; i++) {
            var b = UI.el('span', 'mw-bit', burst, bits[i % bits.length]);
            var a = (i / 28) * Math.PI * 2, r = 380 + (i % 4) * 90;
            var dy = Math.sin(a) * r * 0.62;
            if (dy > 150) dy = -dy * 0.8;   // the words and the button sit below the face: keep the bits off them
            flying.push([b, 'translate(' + Math.round(Math.cos(a) * r) + 'px, ' + Math.round(dy) + 'px) scale(1)']);
            b.style.webkitTransitionDelay = b.style.transitionDelay = (i % 7) * 40 + 'ms';
          }
          var face = UI.el('div', 'mw-party-face', root);
          UI.avatar({name: me.name, colour: p.colour, emoji: p.emoji, kid: me.kid}, face, 260);
          UI.el('div', 'mw-party-title', root, tr('Esta TV agora é sua, ', 'This TV is yours now, ', 'Esta tele ya es tuya, ') + me.name + '!');
          var foot = UI.el('div', 'mw-party-foot', root);
          api.add(UI.button(foot, tr('Vamos!', "Let's go!", '¡Vamos!'), 'play', 'primary'), function () { api.close(); if (done) done(); }, {first: true});
          setTimeout(function () {
            UI.setClass(root, 'go', true);
            for (var j = 0; j < flying.length; j++) flying[j][0].style.webkitTransform = flying[j][0].style.transform = flying[j][1];
          }, 60);
        },
        back: function () { return false; }
      });
    }

    go(0);
  }

  function pop(node) {
    UI.setClass(node, 'pop', false);
    void node.offsetWidth;
    UI.setClass(node, 'pop', true);
  }

  // MARK: - A world behind the home screen

  /** The world's things with the loved things mixed in, so a dino kid's ocean still has a dinosaur in it. */
  function things(w, lovedIds) {
    var out = w ? w.things.slice() : [];
    for (var i = 0; lovedIds && i < lovedIds.length; i++) { var l = love(lovedIds[i]); if (l) out.push(l.emoji); }
    return out;
  }

  /** Draws a world (sky and drifting things) as the first child of parent. A null world removes it. */
  function paintSky(parent, w, p) {
    var old = parent.querySelector('.mw-sky');
    if (old) parent.removeChild(old);
    if (!w) return null;
    var sky = document.createElement('div');
    sky.className = 'mw-sky';
    sky.style.background = 'linear-gradient(' + w.top + ', ' + w.bottom + ')';
    var list = things(w, p && p.loves);
    // Fixed spots, so the screen looks the same every time: spread out, never under the clock's middle.
    var spots = [[120, 240], [1640, 180], [980, 120], [420, 620], [1460, 560], [760, 420], [1780, 760], [260, 860],
                 [1180, 300], [600, 180], [1320, 860], [80, 520]];
    for (var i = 0; i < spots.length && list.length; i++) {
      var t = document.createElement('span');
      t.className = 'mw-thing d' + (i % 4);
      t.textContent = list[i % list.length];
      t.style.left = spots[i][0] + 'px';
      t.style.top = spots[i][1] + 'px';
      t.style.fontSize = (64 + (i * 37) % 70) + 'px';
      sky.appendChild(t);
    }
    parent.insertBefore(sky, parent.firstChild);
    return sky;
  }

  /** The home screen calls this when the profile changes: the watcher's world, or the normal sky. */
  function home(sky, person) {
    var w = person && world(person.world);
    paintSky(sky, w, person);
    return !!w;
  }

  return {open: open, home: home, worlds: WORLDS};
})();
