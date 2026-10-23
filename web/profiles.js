/*
 * Who's watching: a profile for each person on this TV, each with their own colour, shelf and picks.
 *  - A kids' profile (★) gets a shelf of kids' apps, only family and animated picks, no inputs or TV settings, and
 *    needs the grown-up PIN to open the settings or to switch to a grown-up's profile.
 *  - Profiles live on the TV (localStorage). Paired with Beyond Family (family.js), they come from the household's
 *    members instead: same names, same colours, kids already marked.
 *  - "Who's watching?" opens when the home screen starts and after a long idle, when there's more than one profile.
 *  - Each Beyond Family person's face, colour, world, loves and shelf are kept with them in Beyond Family: a change
 *    here is sent up (family.js) and comes down on every other TV they're on. Somebody from another home can sign in
 *    here as a visitor (Who's watching › Sign in with Beyond Family) and bring theirs across.
 *  - Family comes first: everyone watching together. Family-friendly picks, its own shelf, and the grown-up
 *    buttons stay (somebody grown up is usually on the couch too), but a kid needs the PIN to switch to it.
 */
var Profiles = (function () {
  'use strict';

  var KEY = 'btv.profiles', WHO = 'btv.who', PIN = 'btv.pin', TOGETHER = 'btv.together';

  /** Beyond's people colours (the same family as Beyond Family's member swatches). */
  var COLOURS = ['#2F7D6D', '#D85A30', '#378ADD', '#E8A33D', '#7A4FD0', '#D6589A', '#2A9DA8', '#55534B'];
  var EMOJI = ['', '🦖', '🦄', '🚀', '🐱', '🐶', '🦊', '🐼', '⚽', '🎨'];

  /** Apps a kids' profile starts with on its shelf, when the TV has them. */
  var KID_APPS = /youtube ?kids|disney|netflix|plex|abc ?kids|tvnz|nick|cartoon|pbs kids|kidoodle|sesame/i;

  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  /** A sample household for the browser preview and the website's demo, so the screens have people in them. */
  var DEMO = [
    {id: 'p1', name: 'Mum', colour: '#2F7D6D'},
    {id: 'p2', name: 'Dad', colour: '#378ADD'},
    {id: 'p3', name: 'Aroha', colour: '#7A4FD0', kid: true, emoji: '🦄'},
    {id: 'p4', name: 'Nikau', colour: '#D85A30', kid: true, emoji: '🦖'}
  ];

  var list = load(KEY, null);
  if (!list || !list.length) {
    list = TV.browser ? DEMO.slice() : [{id: 'p1', name: tr('Eu', 'Me', 'Yo'), colour: '#2F7D6D'}];
    save(KEY, list);
  }
  /** Family: not a person, so it never joins the list, Beyond Family's members or the editor. Only its shelf is kept. */
  var FAMILY = {id: 'together', together: true, colour: '#6E3DDB', shelf: load(TOGETHER, {}).shelf};
  var who = load(WHO, list[0].id);
  var listeners = [];

  /** Somebody's look or shelf changed on this TV: keep it here until Beyond Family has it, then it's theirs everywhere. */
  function touched(p) {
    if (!p || !p.family) return;
    p.pending = (p.pending || 0) + 1;
    if (window.Family && Family.pushProfile) Family.pushProfile(p);
  }

  /** What Beyond Family keeps for a person, from this TV's copy. */
  function look(p) {
    return {emoji: p.emoji || '', colour: p.colour, world: p.world || undefined, loves: p.loves || [], shelf: p.shelf || undefined};
  }

  /**
   * One person from Beyond Family, merged with this TV's copy of them: their shelf on this TV, their Plex user, and
   * anything changed here that Beyond Family hasn't got yet. Otherwise what Beyond Family keeps wins, so a change on
   * another TV shows up here.
   */
  function merge(p, old) {
    var prof = p.profile;
    delete p.profile;
    if (old) {
      p.shelf = old.shelf; p.plexUser = old.plexUser; p.emoji = p.emoji || old.emoji;
      // What a kid picked in Make it yours stays theirs, even over the household's colour.
      if (old.look) { p.look = true; p.emoji = old.emoji; p.colour = old.colour; p.world = old.world; }
      // What a kid said they like is theirs; what the household set wins over what was set here.
      p.loves = old.loves;
      if (!p.likes) p.likes = old.likes;
      p.offered = old.offered;
      if (old.pending) { p.pending = old.pending; return p; }
      // Made up on this TV before Beyond Family kept looks: send it up once, so it isn't lost.
      if (old.look && !prof) p.pending = 1;
    }
    if (prof) {
      if (prof.emoji !== undefined) p.emoji = prof.emoji;
      if (prof.colour) p.colour = prof.colour;
      if (prof.world !== undefined) p.world = prof.world;
      if (prof.emoji || prof.colour || prof.world) p.look = true;
      if (prof.loves) p.loves = prof.loves;
      if (prof.shelf && prof.shelf.length) p.shelf = prof.shelf;
    }
    return p;
  }

  function changed() { save(KEY, list); save(TOGETHER, {shelf: FAMILY.shelf}); for (var i = 0; i < listeners.length; i++) listeners[i](); }

  function find(id) { if (id === FAMILY.id) { FAMILY.name = tr('Família', 'Family', 'Familia'); return FAMILY; } for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function current() { return find(who) || list[0]; }
  function nextId() { var n = 1; while (find('p' + n)) n++; return 'p' + n; }

  // MARK: - The grown-up PIN

  function pin() { return load(PIN, ''); }
  function grownUps() { return list.filter(function (p) { return !p.kid; }); }

  /** Runs then() straight away for grown-ups (or when there's no PIN), else after the PIN is typed right. */
  function guard(reason, then) {
    if (!current().kid || !pin()) { then(); return; }
    askPin(reason, function (typed) {
      if (typed === pin()) { then(); return true; }
      return false;
    });
  }

  /** The PIN pad: four dots, digits 0 to 9 on screen (or the remote's number keys). check(typed) → true to close. */
  function askPin(title, check, sub) {
    var typed = '';
    var dotsRow;
    function paintDots(wrong) {
      dotsRow.innerHTML = '';
      for (var i = 0; i < 4; i++) UI.setClass(UI.el('span', i < typed.length ? 'on' : '', dotsRow), 'wrong', !!wrong);
    }
    function press(d, api) {
      if (typed.length >= 4) return;
      typed += d;
      paintDots();
      if (typed.length === 4) {
        setTimeout(function () {
          if (check(typed)) { api.close(); return; }
          paintDots(true);
          typed = '';
          setTimeout(function () { paintDots(); }, 600);
        }, 150);
      }
    }
    UI.open({
      cls: 'bt-pin',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, title, sub || tr('Digite o PIN de adulto', 'Type the grown-up PIN', 'Escribe el PIN de adulto'));
        dotsRow = UI.el('div', 'bt-pindots', box);
        paintDots();
        var pad = UI.el('div', 'bt-pad', box);
        var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
        for (var i = 0; i < keys.length; i++) {
          (function (k, i) {
            var b = UI.el('div', 'bt-padkey' + (k ? '' : ' blank'), pad, k);
            b.style.left = (i % 3) * 132 + 'px';
            b.style.top = Math.floor(i / 3) * 112 + 'px';
            if (!k) return;
            api.add(b, function () {
              if (k === '⌫') { typed = typed.slice(0, -1); paintDots(); } else press(k, api);
            }, {first: k === '5'});
          })(keys[i], i);
        }
      },
      key: function (k) {
        if (k >= 48 && k <= 57) { press(String(k - 48), UI.top()); return true; }
        return false;
      }
    });
  }

  // MARK: - Who's watching?

  var whoOpen = false;

  /** The picker. manage=true opens it to edit (every face opens the editor, and there's an Add). */
  function pick(manage, done) {
    if (whoOpen && !manage) return;
    whoOpen = true;
    UI.open({
      cls: 'bt-who',
      build: function (layer, api) {
        var hello = UI.el('div', 'bt-who-head', layer);
        UI.dots(hello);
        UI.el('span', '', hello, manage ? tr('Perfis', 'Profiles', 'Perfiles') : tr('Quem está assistindo?', "Who's watching?", '¿Quién está viendo?'));
        var row = UI.el('div', 'bt-faces', layer);
        var all = manage || list.length < 2 ? list.slice() : [find(FAMILY.id)].concat(list);
        var n = all.length + (manage ? 1 : 0), size = n > 5 ? 170 : 200, gap = n > 5 ? 52 : 70;
        var width = n * size + (n - 1) * gap, left = (1920 - width) / 2;
        for (var i = 0; i < all.length; i++) {
          (function (p, i) {
            var f = UI.el('div', 'bt-face', row);
            f.style.left = (left + i * (size + gap)) + 'px';
            f.style.width = size + 'px';
            UI.avatar(p, f, size);
            UI.el('div', 'name', f, p.name);
            if (p.together) UI.el('div', 'edit', f, tr('Todos juntos', 'Everyone together', 'Todos juntos'));
            if (manage) UI.el('div', 'edit', f, tr('Editar', 'Edit', 'Editar'));
            api.add(f, function () {
              if (manage) { edit(p, function () { api.rebuild(); }); return; }
              choose(p, api, done);
            }, {first: p.id === who});
          })(all[i], i);
        }
        if (manage) {
          var add = UI.el('div', 'bt-face add', row);
          add.style.left = (left + all.length * (size + gap)) + 'px';
          add.style.width = size + 'px';
          var plus = UI.el('div', 'avatar plus', add);
          plus.style.width = plus.style.height = size + 'px';
          plus.style.borderRadius = (size / 2) + 'px';
          UI.el('span', 'initial', plus, '+').style.lineHeight = size + 'px';
          UI.el('div', 'name', add, tr('Adicionar', 'Add someone', 'Añadir'));
          api.add(add, function () { edit(null, function () { api.rebuild(); }); });
        }
        var foot = UI.el('div', 'bt-who-foot', layer);
        if (!manage) {
          var m = UI.button(foot, tr('Gerenciar perfis', 'Manage profiles', 'Administrar perfiles'), 'settings');
          api.add(m, function () { guard(tr('Gerenciar perfis', 'Manage profiles', 'Administrar perfiles'), function () { pick(true, function () { UI.top() && UI.top().rebuild(); }); }); });
          if (window.Family && Family.visit) {
            // Your own face and apps from Beyond Family, on this TV or anybody's.
            // Linked, the family is already here: the button is for somebody visiting from another home.
            var s = UI.button(foot, Family.linked() ? tr('Visitando? Entre aqui', 'Visiting? Sign in here', '¿De visita? Entra aquí')
              : tr('Entrar com o Beyond Family', 'Sign in with Beyond Family', 'Entrar con Beyond Family'), 'sparkles');
            api.add(s, function () { Family.visit(function (p) { if (p) choose(p, api, done); }); });
          }
        }
        if (window.Family && Family.linked()) UI.el('div', 'bt-who-note', foot, tr('Do Beyond Family: ', 'From Beyond Family: ', 'De Beyond Family: ') + Family.homeName());
      },
      back: function () { return !manage && !current(); },
      closed: function () { whoOpen = false; if (manage && done) done(); }
    });
  }

  function choose(p, api, done) {
    function go() {
      who = p.id;
      save(WHO, who);
      changed();
      api.close();
      if (done) done(p);
    }
    // A kid moving to a grown-up's profile needs the PIN; anyone moving to a kid's doesn't.
    if (current().kid && !p.kid && pin()) {
      askPin(tr('Perfil de adulto', "A grown-up's profile", 'Perfil de adulto'), function (t) { if (t === pin()) { setTimeout(go, 0); return true; } return false; });
      return;
    }
    go();
  }

  // MARK: - Editing a profile

  function edit(person, done) {
    var p = person ? JSON.parse(JSON.stringify(person)) : {id: nextId(), name: '', colour: COLOURS[list.length % COLOURS.length], kid: false, emoji: ''};
    var isNew = !person;
    var preview, kb;
    UI.open({
      cls: 'bt-edit',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-editbox', layer);
        UI.heading(box, isNew ? tr('Novo perfil', 'New profile', 'Nuevo perfil') : p.name);
        preview = UI.el('div', 'bt-edit-face', box);
        function repaint() {
          preview.innerHTML = '';
          UI.avatar({name: p.name || '?', colour: p.colour, emoji: p.emoji, kid: p.kid}, preview, 220);
        }
        repaint();
        kb = UI.keyboard(box, api, {value: p.name, placeholder: tr('Nome', 'Name', 'Nombre'), max: 16,
          spaceLabel: tr('Espaço', 'Space', 'Espacio'),
          typed: function (t) { p.name = t; repaint(); }});
        var swatches = UI.el('div', 'bt-swatches', box);
        UI.el('div', 'bt-label', swatches, tr('Cor', 'Colour', 'Color'));
        for (var i = 0; i < COLOURS.length; i++) {
          (function (c) {
            var s = UI.el('div', 'bt-swatch' + (c === p.colour ? ' on' : ''), swatches);
            s.style.background = c;
            api.add(s, function () {
              p.colour = c;
              var all = swatches.querySelectorAll('.bt-swatch');
              for (var j = 0; j < all.length; j++) UI.setClass(all[j], 'on', all[j] === s);
              repaint();
            });
          })(COLOURS[i]);
        }
        var faces = UI.el('div', 'bt-emoji', box);
        UI.el('div', 'bt-label', faces, tr('Rosto', 'Face', 'Cara'));
        for (var e = 0; e < EMOJI.length; e++) {
          (function (em) {
            var s = UI.el('div', 'bt-emo' + (em === (p.emoji || '') ? ' on' : ''), faces, em || 'Aa');
            api.add(s, function () {
              p.emoji = em;
              var all = faces.querySelectorAll('.bt-emo');
              for (var j = 0; j < all.length; j++) UI.setClass(all[j], 'on', all[j] === s);
              repaint();
            });
          })(EMOJI[e]);
        }
        var actions = UI.el('div', 'bt-actions', box);
        var kid = UI.button(actions, '', null, 'toggle-row');
        function kidLabel() { kid.lastChild.textContent = (p.kid ? '★ ' : '') + tr('Perfil infantil: ', "Kids' profile: ", 'Perfil infantil: ') + (p.kid ? tr('sim', 'on', 'sí') : tr('não', 'off', 'no')); }
        kidLabel();
        api.add(kid, function () {
          if (p.kid && grownUps().length <= 1 && !isNew && !person.kid) { UI.toast(tr('Precisa de pelo menos um adulto.', 'There needs to be at least one grown-up.', 'Hace falta al menos un adulto.')); return; }
          p.kid = !p.kid; kidLabel(); repaint(); likesBtn.style.display = p.kid ? '' : 'none';
        });
        // What a kid is into, set by a grown-up (this is already behind the PIN): it picks the shows on their cards.
        var likesBtn = UI.button(actions, tr('Do que gosta', "What they're into", 'Lo que le gusta'), 'sparkles');
        likesBtn.style.display = p.kid ? '' : 'none';
        api.add(likesBtn, function () {
          if (!p.kid) return;
          KidPicks.choose(tr('Do que gosta', "What they're into", 'Lo que le gusta'),
            tr('As escolhas na tela inicial vêm daqui.', 'Their picks on the home screen come from this.', 'Sus sugerencias salen de aquí.'),
            p.likes || [], function (picked) { p.likes = picked; });
        });
        api.add(UI.button(actions, tr('Salvar', 'Save', 'Guardar'), 'check', 'primary'), function () {
          p.name = (kb.text() || '').replace(/^\s+|\s+$/g, '');
          if (!p.name) { UI.toast(tr('Dê um nome ao perfil.', 'Give the profile a name.', 'Ponle un nombre al perfil.')); return; }
          if (isNew) list.push(p);
          else for (var i = 0; i < list.length; i++) if (list[i].id === p.id) list[i] = p;
          if (!isNew && (p.emoji !== person.emoji || p.colour !== person.colour)) { p.look = true; touched(p); }
          changed();
          api.close();
          if (done) done();
        });
        if (!isNew && p.visitor) {
          api.add(UI.button(actions, tr('Sair desta TV', 'Sign out of this TV', 'Cerrar sesión en este TV'), null, 'danger'), function () {
            if (window.Family) Family.signOut(p);
            list = list.filter(function (x) { return x.id !== p.id; });
            if (who === p.id) { who = list[0].id; save(WHO, who); }
            changed();
            api.close();
            if (done) done();
          });
        } else if (!isNew && list.length > 1) {
          api.add(UI.button(actions, tr('Apagar', 'Remove', 'Eliminar'), null, 'danger'), function () {
            if (!p.kid && grownUps().length <= 1) { UI.toast(tr('Precisa de pelo menos um adulto.', 'There needs to be at least one grown-up.', 'Hace falta al menos un adulto.')); return; }
            list = list.filter(function (x) { return x.id !== p.id; });
            if (who === p.id) { who = list[0].id; save(WHO, who); }
            changed();
            api.close();
            if (done) done();
          });
        }
      }
    });
  }

  // MARK: - Setting the PIN

  function setPin(done) {
    function ask() {
      askPin(tr('Novo PIN', 'New grown-up PIN', 'Nuevo PIN'), function (first) {
        setTimeout(function () {
          askPin(tr('Confirme o PIN', 'Type it again', 'Confirma el PIN'), function (again) {
            if (again !== first) { UI.toast(tr('Os PINs não batem. Tente de novo.', "Those didn't match. Try again.", 'No coinciden. Prueba otra vez.')); return true; }
            save(PIN, first);
            UI.toast(tr('PIN salvo.', 'PIN saved. Kids need it for the settings.', 'PIN guardado.'));
            if (done) done();
            return true;
          }, tr('Mais uma vez', 'Once more, to be sure', 'Una vez más'));
        }, 0);
        return true;
      }, tr('Quatro números que só os adultos sabem', 'Four numbers only the grown-ups know', 'Cuatro números que solo saben los adultos'));
    }
    if (pin()) guardAdult(ask); else ask();
  }

  /** The PIN even for a grown-up (changing the PIN itself). */
  function guardAdult(then) {
    askPin(tr('PIN atual', 'Current PIN', 'PIN actual'), function (t) { if (t === pin()) { setTimeout(then, 0); return true; } return false; });
  }

  return {
    COLOURS: COLOURS,
    list: function () { return list.slice(); },
    count: function () { return list.length; },
    current: current,
    kid: function () { return !!current().kid; },
    /** Family-friendly picks only: a kid watching, or the whole family together. */
    gentle: function () { return !!(current().kid || current().together); },
    together: function () { return !!current().together; },
    kidApp: function (app) { return KID_APPS.test(app.title || '') || KID_APPS.test(app.id || ''); },
    pick: pick,
    manage: function (done) { guard(tr('Gerenciar perfis', 'Manage profiles', 'Administrar perfiles'), function () { pick(true, done); }); },
    guard: guard,
    hasPin: function () { return !!pin(); },
    setPin: setPin,
    /** Saves something for the current profile only (its shelf, its Plex user...). */
    setOwn: function (name, value) { var p = current(); p[name] = value; if (name === 'shelf') touched(p); changed(); },
    own: function (name) { return current()[name]; },
    /** Replaces the people with a household's members (Beyond Family), keeping each one's shelf when the id matches. */
    replace: function (people) {
      var keep = {};
      for (var i = 0; i < list.length; i++) keep[list[i].id] = list[i];
      list = people.map(function (p) { return merge(p, keep[p.id]); });
      if (!find(who)) who = list[0].id;
      save(WHO, who);
      changed();
    },
    /** On a TV that isn't linked: this TV's own people stay, and whoever signed in from Beyond Family joins them. */
    visitors: function (people) {
      var keep = {}, mine = [];
      for (var i = 0; i < list.length; i++) { keep[list[i].id] = list[i]; if (!list[i].visitor) mine.push(list[i]); }
      list = mine.concat(people.map(function (p) { return merge(p, keep[p.id]); }));
      if (!find(who)) who = list[0].id;
      save(WHO, who);
      changed();
    },
    /** Beyond Family has this person's change; from now on theirs wins again. Only when nothing changed since. */
    saved: function (id, stamp) {
      var p = find(id);
      if (p && p.pending === stamp) { delete p.pending; save(KEY, list); }
    },
    look: look,
    /** Everyone waiting for Beyond Family to take a change (sent again when the TV gets back online). */
    unsent: function () { return list.filter(function (p) { return p.pending && p.family; }); },
    /** Make it yours (myworld.js): how the watcher's profile looks. Never the name, shelf, PIN or kid flag. */
    setLook: function (look) {
      var p = current();
      p.emoji = look.emoji; p.colour = look.colour; p.world = look.world; p.loves = look.loves; p.look = true;
      touched(p);
      changed();
    },
    /** What the watching kid said they like to watch (kidpicks.js). */
    setLoves: function (loves) { var p = current(); p.loves = loves; touched(p); changed(); },
    /** Switches to someone from Beyond Family's remote. The app already checked who may (a kid only to themselves). */
    use: function (id) { if (!find(id) || id === who) return false; who = id; save(WHO, who); changed(); return true; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
