/*
 * Ask Beyond (ADR 0025): the TV's assistant. An orb of light that listens, thinks and answers. Pick a starter or type
 * with the remote, or ask from a phone in Beyond Family and the question turns up here; Beyond Family asks Claude with
 * this TV's apps and the answer comes back as a line and up to four cards, which open the app with OK. A kid watching
 * gets a kid's answer. Nothing asked is kept, here or there. Needs Beyond Family linked, because that's who answers.
 * Google TV runs this same file in AskActivity's WebView (ask-host.js). Plain ES5.
 */
var Ask = (function () {
  'use strict';

  // The same starters as Beyond Family's ASK_STARTERS (shared/tvNotes.ts): keep the two in step.
  var STARTERS = ['Rom-coms for date night', 'Something funny, under 90 minutes', "A family movie we'll all like",
    'A show to binge this week', 'Something Kiwi', 'Surprise me'];
  var KID_STARTERS = ['Something funny', 'Animals!', 'Dinosaurs', 'Space and rockets', 'Something with music', 'Surprise me'];

  var api = null, mode = 'idle', question = '', from = '', answer = null, problem = '', asking = 0, orb = null;

  function kid() { return !!(window.Profiles && Profiles.current && Profiles.current().kid); }

  function starterText(s) {
    // The starters go to Beyond in English, the words on the button follow the TV's language.
    var words = {
      'Rom-coms for date night': tr('Comédias românticas para um encontro', 'Rom-coms for date night', 'Comedias románticas para una cita'),
      'Something funny, under 90 minutes': tr('Algo engraçado, até 90 minutos', 'Something funny, under 90 minutes', 'Algo gracioso, menos de 90 minutos'),
      "A family movie we'll all like": tr('Um filme para toda a família', "A family movie we'll all like", 'Una película para toda la familia'),
      'A show to binge this week': tr('Uma série para maratonar', 'A show to binge this week', 'Una serie para maratonear'),
      'Something Kiwi': tr('Algo da Nova Zelândia', 'Something Kiwi', 'Algo de Nueva Zelanda'),
      'Surprise me': tr('Me surpreenda', 'Surprise me', 'Sorpréndeme'),
      'Something funny': tr('Algo engraçado', 'Something funny', 'Algo gracioso'),
      'Animals!': tr('Bichos!', 'Animals!', '¡Animales!'),
      'Dinosaurs': tr('Dinossauros', 'Dinosaurs', 'Dinosaurios'),
      'Space and rockets': tr('Espaço e foguetes', 'Space and rockets', 'Espacio y cohetes'),
      'Something with music': tr('Algo com música', 'Something with music', 'Algo con música')
    };
    return words[s] || s;
  }

  // MARK: - The orb

  /**
   * A sphere of a few hundred specks in Beyond's four colours and white, turning. It breathes while it listens, spins
   * up and swells while it thinks, and settles when it has an answer. Only transform-free canvas work, no allocation in
   * the frame loop, and fewer specks on an old TV.
   */
  function Orb(canvas) {
    var ctx = canvas.getContext('2d'), n = window.CONFIG && CONFIG.lowEnd ? 260 : 520;
    var xs = new Array(n), ys = new Array(n), zs = new Array(n), cs = new Array(n);
    var COLOURS = ['#FFFFFF', '#FFFFFF', '#9E7BFF', '#7FD8BE', '#F2B84B', '#FF8A65', '#7DB7F0'];
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = golden * i;
      xs[i] = Math.cos(t) * r; ys[i] = y; zs[i] = Math.sin(t) * r;
      cs[i] = COLOURS[i % COLOURS.length];
    }
    var spin = 0, speed = 0.004, size = 1, want = 1, running = true, last = 0, think = 0;
    var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 33); };

    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(50, now - last) : 16;
      last = now;
      var busy = mode === 'thinking';
      speed += ((busy ? 0.028 : mode === 'answer' ? 0.003 : 0.006) - speed) * 0.05;
      think += dt / 1000;
      want = busy ? 1.08 + Math.sin(think * 5) * 0.05 : 1 + Math.sin(think * 1.6) * 0.025;
      size += (want - size) * 0.12;
      spin += speed * dt / 16;
      var w = canvas.width, h = canvas.height, R = Math.min(w, h) * 0.36 * size, cx = w / 2, cy = h / 2;
      var ca = Math.cos(spin), sa = Math.sin(spin), tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < n; i++) {
        var x = xs[i] * ca - zs[i] * sa, z = xs[i] * sa + zs[i] * ca, y = ys[i] * ct - z * st;
        z = ys[i] * st + z * ct;
        var depth = (z + 1) / 2, d = 1.8 + depth * 3.4;
        ctx.globalAlpha = 0.15 + depth * 0.85;
        ctx.fillStyle = cs[i];
        ctx.fillRect(cx + x * R - d / 2, cy + y * R - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      raf(frame);
    }
    raf(frame);
    return {stop: function () { running = false; }};
  }

  // MARK: - The screen

  function build(layer, a) {
    // With an answer the orb steps back, smaller, to make room for the cards.
    UI.setClass(layer, 'answer', mode === 'answer');
    var stage = UI.el('div', 'bt-ask-stage', layer);
    var c = UI.el('canvas', 'bt-orb', stage);
    c.width = 440;
    c.height = 440;
    if (orb) orb.stop();
    orb = Orb(c);
    if (question) UI.el('div', 'bt-ask-said', stage, (from ? from + ': ' : '') + '“' + question + '”');
    var line = mode === 'thinking' ? tr('Deixa eu ver o que tem de bom…', "Okay, let me see what's good…", 'Déjame ver qué hay de bueno…')
      : mode === 'answer' ? answer.reply
      : mode === 'error' ? problem
      : mode === 'typing' ? tr('Escreva com o controle', 'Type it with the remote', 'Escríbelo con el control')
      : kid() ? tr('O que você quer assistir?', 'What do you feel like watching?', '¿Qué te apetece ver?')
      : tr('O que vocês estão a fim de ver?', 'What are you in the mood for?', '¿Qué les apetece ver?');
    UI.el('div', 'bt-ask-line' + (mode === 'thinking' ? ' thinking' : ''), stage, line);

    if (mode === 'idle' || mode === 'error') {
      var chips = UI.el('div', 'bt-buttons bt-ask-chips', layer), list = kid() ? KID_STARTERS : STARTERS;
      if (mode === 'error' && question) a.add(UI.button(chips, tr('Tentar de novo', 'Try again', 'Intentar de nuevo'), 'sync', 'primary'), function () { ask(question, from); }, {first: true});
      for (var i = 0; i < list.length; i++) {
        (function (s, first) {
          a.add(UI.button(chips, starterText(s)), function () { ask(s, ''); }, {first: first});
        })(list[i], i === 0 && mode === 'idle');
      }
      var more = UI.el('div', 'bt-buttons bt-ask-more', layer);
      a.add(UI.button(more, tr('Escrever', 'Type it', 'Escribir'), 'sparkles'), function () { mode = 'typing'; a.rebuild(); });
      if (!kid() && window.BeyondTV && BeyondTV.talk) a.add(UI.button(more, tr('Falar com a equipe Beyond™', 'Tell the Beyond™ team something', 'Decirle algo al equipo de Beyond™')), function () { a.close(); BeyondTV.talk(); });
      UI.el('div', 'bt-ask-small', layer, tr(
        'Também dá para perguntar pelo celular, no Beyond Family. A Beyond não guarda o que você pergunta.',
        "You can ask from your phone too, in Beyond Family. Beyond doesn't keep what you ask.",
        'También puedes preguntar desde el teléfono, en Beyond Family. Beyond no guarda lo que preguntas.'));
    } else if (mode === 'typing') {
      UI.keyboard(layer, a, {max: 120, placeholder: tr('Tipo: algo de terror, mas não muito', 'Like: scary, but not too scary', 'Como: miedo, pero no mucho'),
        spaceLabel: tr('Espaço', 'Space', 'Espacio'), doneLabel: tr('Perguntar', 'Ask', 'Preguntar'),
        done: function (text) { if (text && text.length >= 2) ask(text, ''); }});
    } else if (mode === 'answer') {
      var row = UI.el('div', 'bt-picks', layer), picks = answer.picks || [];
      for (var p = 0; p < picks.length; p++) {
        (function (pick, first) {
          var card = UI.el('div', 'bt-pick', row), img = UI.el('div', 'img', card);
          img.style.background = 'linear-gradient(135deg, #6E3DDB, #2C2458)';
          UI.el('div', 'title-on', img, pick.title);
          if (window.Data && Data.backdropFor) Data.backdropFor(pick.title, pick.year, pick.kind === 'show', function (path) {
            if (path) { img.style.backgroundImage = 'url(' + Data.image(path, 'w780') + ')'; UI.setClass(img, 'photo', true); }
          });
          UI.el('div', 'name', card, pick.title);
          UI.el('div', 'meta', card, [pick.year, pick.kind === 'show' ? tr('Série', 'Series', 'Serie') : tr('Filme', 'Movie', 'Película'), pick.app].filter(function (x) { return x; }).join('  ·  '));
          if (pick.why) UI.el('div', 'why', card, pick.why);
          a.add(card, function () { openPick(pick); }, {first: first});
        })(picks[p], p === 0);
      }
      var after = UI.el('div', 'bt-buttons bt-ask-more', layer);
      a.add(UI.button(after, tr('Perguntar outra coisa', 'Ask something else', 'Preguntar otra cosa'), 'sparkles', picks.length ? '' : 'primary'), function () {
        mode = 'idle'; question = ''; answer = null; a.rebuild();
      }, {first: !picks.length});
      a.add(UI.button(after, tr('Fechar', 'Close', 'Cerrar')), function () { a.close(); });
    }
  }

  /** OK on a pick: its app, when this TV has it. Otherwise say where to look. */
  function openPick(pick) {
    if (pick.app && window.BeyondTV && BeyondTV.openApp && BeyondTV.openApp(pick.app)) {
      if (api) api.close();
      UI.toast(tr('Procure por ', 'Search for ', 'Busca ') + '“' + pick.title + '”');
      return;
    }
    UI.toast(pick.app ? tr('O app ', 'The ', 'La app ') + pick.app + tr(' não está nesta TV', " app isn't on this TV", ' no está en este TV')
      : tr('Procure por ', 'Look for ', 'Busca ') + '“' + pick.title + '”' + tr(' nos seus apps', ' in your apps', ' en tus apps'));
  }

  function ask(text, who) {
    question = String(text).slice(0, 200);
    from = who || '';
    answer = null;
    mode = 'thinking';
    if (api) api.rebuild();
    var mine = ++asking, me = window.Profiles && Profiles.current ? Profiles.current() : {};
    Family.ask(question, window.BeyondTV && BeyondTV.watchApps ? BeyondTV.watchApps() : [], !!me.together, function (err, res) {
      if (mine !== asking || !api) return;
      if (err) {
        mode = 'error';
        problem = err.status === 429 ? tr('Muitas perguntas por agora. Tente daqui a pouco.', "That's a lot of questions. Try again in a bit.", 'Muchas preguntas por ahora. Prueba en un rato.')
          : err.status === 403 ? tr('Conecte o Beyond Family em Configurações para perguntar.', 'Link Beyond Family in Settings to ask.', 'Conecta Beyond Family en Ajustes para preguntar.')
          : tr('Não consegui responder agora. Confira a internet e tente de novo.', "I couldn't answer just now. Check the internet and try again.", 'No pude responder ahora. Revisa internet e inténtalo de nuevo.');
      } else {
        answer = res;
        mode = 'answer';
      }
      api.rebuild();
    });
  }

  /** Opens Ask Beyond; with a question (from a phone), asks it straight away. */
  function open(text, who) {
    if (!window.Family || !Family.linked()) {
      UI.toast(tr('Conecte o Beyond Family em Configurações para perguntar.', 'Link Beyond Family in Settings to ask.', 'Conecta Beyond Family en Ajustes para preguntar.'));
      return;
    }
    if (!api) {
      mode = 'idle'; question = ''; answer = null;
      api = UI.open({
        cls: 'bt-ask',
        build: build,
        back: function () {
          // Back from typing or an answer goes back to the starters; from the starters, it closes.
          if (mode === 'typing' || mode === 'answer' || mode === 'error') { mode = 'idle'; question = ''; answer = null; api.rebuild(); return true; }
          return false;
        },
        closed: function () { api = null; asking++; if (orb) { orb.stop(); orb = null; } }
      });
    }
    if (text) ask(text, who);
  }

  return {open: open, starters: STARTERS};
})();
