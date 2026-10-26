/*
 * Beyond Family on the TV: link this TV to the household, and do what the family app asks.
 *
 * Linking: the TV says hello to Beyond Family and gets back its own secret (kept here, never shown) and a six-letter
 * code (shown big). A grown-up types the code into Beyond Family › TVs on their phone, and the TV is the household's.
 * From then on the household's people are the TV's profiles (first names and colours, nothing else ever comes), and
 * the TV waits for things to do: a remote press, an app to open, someone to switch to, or a message for the screen
 * ("5 minutes to dinner"). Unpaired in the app, it hears within 20 seconds and forgets.
 *
 * Messages show over whatever Beyond TV is showing, Plex included, with a soft chime. They can't show over another
 * company's app (Netflix has the screen then); they wait and show when the family comes back to Beyond TV, for up to
 * ten minutes.
 *
 * Plain ES5, like the rest of web/.
 */
var Family = (function () {
  'use strict';

  var KEY = 'btv.family';
  var API = (window.CONFIG && CONFIG.familyApi) || 'https://beyondfamily.app/api';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  var state = load();

  function call(method, path, body, done, timeout) {
    var x = new XMLHttpRequest(), over = false;
    x.open(method, API + path, true);
    x.timeout = timeout || 15000;
    if (state.id && state.secret) x.setRequestHeader('Authorization', 'Bearer ' + state.id + '.' + state.secret);
    if (body !== undefined) x.setRequestHeader('Content-Type', 'application/json');
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || over) return;
      over = true;
      var json = null;
      try { json = x.responseText ? JSON.parse(x.responseText) : {}; } catch (e) { json = {}; }
      if (x.status < 200 || x.status >= 300) { done({status: x.status, message: json && json.error}); return; }
      done(null, json);
    };
    x.ontimeout = x.onerror = function () { if (!over) { over = true; done({status: 0}); } };
    x.send(body === undefined ? null : JSON.stringify(body));
  }

  function linked() { return !!(state.id && state.home); }
  /** Linked, or somebody from Beyond Family is signed in here: either way the TV keeps listening. */
  function listening() { return !!(state.id && (state.home || state.visiting)); }

  /** Back to a TV that knows nobody: the secret is useless now anyway. */
  function forget(why) {
    var was = linked();
    state = {};
    board = null;
    songs = [];
    playlists = [];
    widgets = [];
    widgetsSig = '[]';
    if (window.Notes) Notes.set([]);
    save();
    clearTimeout(loopTimer);
    if (was && why) UI.toast(why);
    if (window.BeyondTV && BeyondTV.refresh) BeyondTV.refresh();
  }

  // MARK: - The household

  var lastPeople = '';
  // The house noticeboard (only when the household turned it on): today, for the screensaver. Kept in memory only.
  var board = null;
  // Tiles pinned to the home screen in Beyond Family: apps, shows, the kids' jobs, cameras on the home network.
  var widgets = [], widgetsSig = '[]';
  // The household's pets and whether each still wants a meal, for the kids' "did they get fed?" (pets.js).
  var pets = null;
  /** The family's karaoke songs, for picking on the TV: [{id, title, artist, videoId}]. */
  var songs = [];
  /** The family's karaoke playlists: [{id, name, items: [{songId, memberId}]}]. */
  var playlists = [];

  /** One of Beyond Family's people, as a profile here. */
  function person(p, visitor) {
    // jobs: Earn your screen, a kid's jobs still to do today (only there when the household turned it on).
    // likes: what a grown-up said a kid is into, which picks their shows (kidpicks.js).
    // teen: a kid of 13 or more, worked out by Beyond Family from their birthday (only the yes or no comes here).
    // profile: their face, colour, world, loves and shelf, kept with them in Beyond Family.
    return {id: 'bf-' + p.id, name: p.name, colour: p.colour || '#2F7D6D', kid: !!p.kid, teen: !!(p.kid && p.teen), family: p.id, jobs: p.jobs,
      likes: p.likes, profile: p.profile, visitor: visitor || undefined};
  }

  /**
   * Beyond Family's people become the TV's profiles: the household's when linked, and anybody signed in here from
   * another home. Only when they changed, so nobody's screen jumps.
   */
  function apply(home, visitors) {
    visitors = visitors || [];
    if (home) {
      state.home = {name: home.name};
      board = home.board || null;
      if (window.Notes) Notes.set(home.notes);
      if (window.Tidy) Tidy.set(home.tidy);
      var tilesNow = JSON.stringify(home.widgets || []);
      if (tilesNow !== widgetsSig) {
        widgetsSig = tilesNow;
        widgets = home.widgets || [];
        if (window.BeyondTV && BeyondTV.tiles) setTimeout(BeyondTV.tiles, 0);
      }
      var hadPets = pets !== null;
      pets = home.pets || [];
      songs = home.songs || [];
      if (!playlistBusy) playlists = home.playlists || [];
      if (!hadPets && window.Pets) setTimeout(Pets.arrived, 0);
    }
    var had = !!state.visiting;
    state.visiting = visitors.length > 0;
    save();
    var sig = JSON.stringify([home ? home.people : null, visitors]);
    if (sig === lastPeople) return;
    var guests = visitors.map(function (p) { return person(p, true); });
    if (home) {
      if (!home.people || !home.people.length) return;
      lastPeople = sig;
      Profiles.replace(home.people.map(function (p) { return person(p); }).concat(guests));
    } else {
      if (!guests.length && !had) return;
      lastPeople = sig;
      Profiles.visitors(guests);
    }
    var unsent = Profiles.unsent();
    for (var i = 0; i < unsent.length; i++) pushProfile(unsent[i]);
  }

  // MARK: - Your face and settings, everywhere

  /** Somebody changed their look or shelf here: Beyond Family keeps it, and their other TVs get it. */
  function pushProfile(p) {
    if (!state.id || !p.family) return;
    var stamp = p.pending;
    call('POST', '/tv/people/' + p.family, Profiles.look(p), function (err) {
      if (!err) Profiles.saved(p.id, stamp);
      // Offline or refused: it stays marked, and goes again with the next change from Beyond Family.
    });
  }

  /** Signs a visitor out of this TV. */
  function signOut(p) {
    if (!p || !p.family) return;
    call('POST', '/tv/visit/bye', {member: p.family}, function () {});
  }

  /**
   * Sign in with Beyond Family, on this TV or anybody's: a code to type into Beyond Family on your phone (TV page,
   * On somebody else's TV). On a linked TV the family's own people are already here, so it says so too.
   */
  function visit(done) {
    var api = null, codeNode = null, noteNode = null, timer = 0, closed = false, before = {};
    var known = Profiles.list();
    for (var i = 0; i < known.length; i++) before[known[i].id] = true;

    function note(text) { if (noteNode) noteNode.textContent = text; }
    function failed() {
      note(tr('Não deu para falar com o Beyond Family. Veja a internet da TV e tente de novo.',
        "Couldn't reach Beyond Family. Check the TV's internet and try again.",
        'No se pudo conectar con Beyond Family. Revisa el internet del TV e inténtalo de nuevo.'));
    }
    function code() {
      call('POST', '/tv/visit/code', {}, function (err, res) {
        if (closed) return;
        if (err && err.status === 401) { state = {}; save(); hello(); return; }
        if (err) { failed(); return; }
        codeNode.textContent = spaced(res.code);
        UI.setClass(codeNode, 'waiting', false);
        note(tr('O código vale por ', 'The code lasts ', 'El código dura ') + (res.minutes || 10) + ' min.');
        timer = setTimeout(check, 3000);
      });
    }
    function hello() {
      var name = TV.samsung ? 'Samsung TV' : TV.webos ? 'LG TV' : 'TV';
      call('POST', '/tv/hello', {name: name}, function (err, res) {
        if (closed) return;
        if (err) { failed(); return; }
        state = {id: res.id, secret: res.secret};
        save();
        code();
      });
    }
    function check() {
      if (closed) return;
      call('GET', '/tv/sync?wait=0', undefined, function (err, res) {
        if (closed) return;
        if (err) { timer = setTimeout(check, 5000); return; }
        apply(res.paired ? res.home : null, res.visitors);
        var now = Profiles.list(), fresh = null;
        for (var i = 0; i < now.length; i++) if (now[i].visitor && !before[now[i].id]) fresh = now[i];
        if (!fresh) { timer = setTimeout(check, 3000); return; }
        closed = true;
        api.close();
        UI.toast(tr('Olá, ', Prefs.kupu() ? 'Kia ora, ' : 'Hello, ', 'Hola, ') + fresh.name);
        start();
        if (done) done(fresh);
      });
    }

    UI.open({
      cls: 'bt-link bt-family-link',
      build: function (layer, a) {
        api = a;
        var box = UI.el('div', 'bt-linkbox', layer);
        var mark = UI.el('div', 'bt-family-mark', box);
        UI.dots(mark);
        UI.el('span', '', mark, 'Beyond Family');
        UI.el('div', 'bt-heading', box, tr('Entre com o seu Beyond Family', 'Sign in with your Beyond Family', 'Entra con tu Beyond Family'));
        UI.el('div', 'bt-sub', box, tr('No celular, abra Beyond Family › Família › TVs › Na TV de outra pessoa, e digite',
          "On your phone, open Beyond Family › Family › TVs › On somebody else's TV, and type",
          'En tu teléfono, abre Beyond Family › Familia › TVs › En el TV de otra persona, y escribe'));
        codeNode = UI.el('div', 'bt-code waiting', box);
        noteNode = UI.el('div', 'bt-note', box);
        if (linked()) {
          UI.el('div', 'bt-note', box, tr('A sua família já está nesta TV. Isto é para quem é de outra casa.',
            'Your family is on this TV already. This is for somebody from another home.',
            'Tu familia ya está en este TV. Esto es para alguien de otra casa.'));
        }
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Cancelar', 'Cancel', 'Cancelar')), function () { a.close(); }, {first: true});
        note(tr('Falando com o Beyond Family…', 'Talking to Beyond Family…', 'Hablando con Beyond Family…'));
        if (state.id) code(); else hello();
      },
      closed: function () { closed = true; clearTimeout(timer); }
    });
  }

  // MARK: - Linking

  function spaced(code) { return code ? code.slice(0, 3) + ' ' + code.slice(3) : ''; }

  function link(done) {
    var api = null, codeNode = null, noteNode = null, timer = 0, closed = false;

    function note(text) { if (noteNode) noteNode.textContent = text; }
    function show(code) { if (codeNode) { codeNode.textContent = spaced(code); UI.setClass(codeNode, 'waiting', !code); } }

    function hello() {
      show('');
      note(tr('Falando com o Beyond Family…', 'Talking to Beyond Family…', 'Hablando con Beyond Family…'));
      var name = TV.samsung ? 'Samsung TV' : TV.webos ? 'LG TV' : 'TV';
      var fresh = !state.id;
      var go = function (err, res) {
        if (closed) return;
        if (err && err.status === 401) { state = {}; save(); hello(); return; }
        if (err) {
          note(tr('Não deu para falar com o Beyond Family. Veja a internet da TV e tente de novo.',
            "Couldn't reach Beyond Family. Check the TV's internet and try again.",
            'No se pudo conectar con Beyond Family. Revisa el internet del TV e inténtalo de nuevo.'));
          return;
        }
        if (res.paired) { check(); return; }
        if (fresh) { state = {id: res.id, secret: res.secret}; save(); }
        show(res.code);
        note(tr('O código vale por ', 'The code lasts ', 'El código dura ') + (res.minutes || 10) + ' min.');
        timer = setTimeout(check, 3000);
      };
      if (fresh) call('POST', '/tv/hello', {name: name}, go);
      else call('POST', '/tv/code', {}, go);
    }

    function check() {
      if (closed) return;
      call('GET', '/tv/sync?wait=0', undefined, function (err, res) {
        if (closed) return;
        if (err && err.status === 401) { state = {}; save(); hello(); return; }
        if (err) { timer = setTimeout(check, 5000); return; }
        if (!res.paired) { if (res.expired) hello(); else timer = setTimeout(check, 3000); return; }
        apply(res.home, res.visitors);
        closed = true;
        api.close();
        UI.toast(tr('Ligada a ', 'Linked to ', 'Vinculado a ') + (res.home ? res.home.name : 'Beyond Family'));
        start();
        if (done) done(true);
      });
    }

    UI.open({
      cls: 'bt-link bt-family-link',
      build: function (layer, a) {
        api = a;
        var box = UI.el('div', 'bt-linkbox', layer);
        var mark = UI.el('div', 'bt-family-mark', box);
        UI.dots(mark);
        UI.el('span', '', mark, 'Beyond Family');
        UI.el('div', 'bt-heading', box, tr('Ligue esta TV à família', 'Link this TV to your family', 'Vincula este TV a tu familia'));
        UI.el('div', 'bt-sub', box, tr('No celular, abra Beyond Family › Família › TVs › Adicionar TV, e digite',
          'On your phone, open Beyond Family › Family › TVs › Add a TV, and type',
          'En tu teléfono, abre Beyond Family › Familia › TVs › Añadir TV, y escribe'));
        codeNode = UI.el('div', 'bt-code', box);
        noteNode = UI.el('div', 'bt-note', box);
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Cancelar', 'Cancel', 'Cancelar')), function () { a.close(); }, {first: true});
        hello();
      },
      closed: function () { closed = true; clearTimeout(timer); }
    });
  }

  /** The settings row's answer when linked: say which household, and offer to unlink. */
  function manage() {
    UI.open({
      cls: 'bt-link bt-family-link',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-linkbox', layer);
        var mark = UI.el('div', 'bt-family-mark', box);
        UI.dots(mark);
        UI.el('span', '', mark, 'Beyond Family');
        UI.el('div', 'bt-heading', box, state.home ? state.home.name : 'Beyond Family');
        UI.el('div', 'bt-note', box, tr('Esta TV mostra os perfis da família, obedece ao controle no celular e mostra os recados.',
          "This TV shows your family's profiles, follows the remote on your phone and shows the family's messages.",
          'Este TV muestra los perfiles de la familia, sigue el control en tu teléfono y muestra los mensajes.'));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Pronto', 'Done', 'Listo')), function () { a.close(); }, {first: true});
        a.add(UI.button(row, tr('Desligar esta TV', 'Unlink this TV', 'Desvincular este TV'), null, 'danger'), function () {
          Profiles.guard(tr('Desligar do Beyond Family', 'Unlink from Beyond Family', 'Desvincular de Beyond Family'), function () {
            call('POST', '/tv/bye', {}, function () {});
            forget(tr('Desligada do Beyond Family', 'Unlinked from Beyond Family', 'Desvinculado de Beyond Family'));
            a.close();
          });
        });
      }
    });
  }

  // MARK: - Doing what the app asks

  var loopTimer = 0, backoff = 0, running = false;
  var clockOffset = 0;   // Beyond Family's clock minus this TV's, so two homes count down to the same moment

  function start() {
    if (running || !listening()) return;
    running = true;
    clearTimeout(loopTimer);
    loop();
  }

  function loop() {
    if (!state.id) { running = false; return; }
    call('GET', '/tv/sync?wait=20', undefined, function (err, res) {
      if (err && err.status === 401) {
        running = false;
        forget(tr('O Beyond Family desligou esta TV', 'Beyond Family unlinked this TV', 'Beyond Family desvinculó este TV'));
        return;
      }
      if (err) {
        backoff = Math.min(60000, backoff ? backoff * 2 : 3000);
        loopTimer = setTimeout(loop, backoff);
        return;
      }
      backoff = 0;
      if (res.paired === false) {
        // Unlinked in the app: forget the household. A TV that was never linked keeps listening for its visitors.
        if (state.home) { running = false; forget(); return; }
        apply(null, res.visitors);
        if (!state.visiting) { running = false; return; }
        loopTimer = setTimeout(loop, 250);
        return;
      }
      if (res.serverTime) {
        var t = Date.parse(res.serverTime);
        if (!isNaN(t)) clockOffset = t - Date.now();
      }
      apply(res.home, res.visitors);
      var list = res.commands || [];
      for (var i = 0; i < list.length; i++) run(list[i]);
      loopTimer = setTimeout(loop, 250);
    }, 26000);
  }

  var KEYS = {up: 38, down: 40, left: 37, right: 39, ok: 13};

  function run(c) {
    if (c.kind === 'say') { say(c.text, c.tone, c.from); return; }
    // A note arrived or came down: its state came with this sync, this is only the moment, to pop it in (ADR 0025).
    if (c.kind === 'note') { if (c.id && window.Notes) Notes.arrived(c.id); return; }
    // A question from a phone: this TV asks it with its own apps, and the answer shows here.
    if (c.kind === 'ask') { hide(); if (window.Ask) Ask.open(c.text, c.from); return; }
    if (c.kind === 'together') { together(c); return; }
    if (c.kind === 'together-end') { togetherEnd(c.session); return; }
    if (c.kind === 'react') { react(c.emoji, c.from, c.colour); return; }
    if (c.kind === 'bedtime') { hide(); Bedtime.start(c.minutes); return; }
    if (c.kind === 'tidy') { hide(); Tidy.start(c.minutes); return; }
    if (c.kind === 'party') { hide(); Party.start(c); return; }
    if (c.kind === 'party-end') { Party.stop(); return; }
    if (c.kind === 'karaoke') { hide(); Party.stop(); Karaoke.start(c); return; }
    if (c.kind === 'karaoke-set') { hide(); Party.stop(); Karaoke.play(c.turns || [], {name: c.playlist}); return; }
    if (c.kind && c.kind.indexOf('question') === 0) { dinner(c); return; }
    if (c.kind && c.kind.indexOf('quiz') === 0) { quiz(c); return; }
    if (c.kind === 'key' && shown) { if (c.key === 'ok') hide(); return; }  // a message waits for OK, from the phone too
    if (c.kind === 'key') {
      if (c.key === 'home') { UI.closeAll(); BeyondTV.home(); return; }
      if (c.key === 'back') { BeyondTV.key(TV.keys.back); return; }
      if (c.key === 'playpause') {
        // Beyond TV's own player pauses on OK. Anywhere else there's nothing of ours to pause.
        if (document.querySelector('.px-player.open')) BeyondTV.key(KEYS.ok);
        return;
      }
      if (KEYS[c.key]) BeyondTV.key(KEYS[c.key]);
      return;
    }
    if (c.kind === 'wake') {
      // Turned on from a phone (ADR 0026). A web app can't switch an LG or Samsung on, but when it's already on
      // it opens what was asked for, the same as launch.
      if (c.app && !BeyondTV.openShelf(c.app)) UI.toast(tr('Esse app não está nesta TV', "That app isn't on this TV", 'Esa app no está en este TV'));
      return;
    }
    if (c.kind === 'launch') {
      if (!BeyondTV.openShelf(c.app)) UI.toast(tr('Esse app não está nesta TV', "That app isn't on this TV", 'Esa app no está en este TV'));
      return;
    }
    if (c.kind === 'profile') {
      if (Profiles.use('bf-' + c.memberId)) UI.toast(tr('Agora: ', 'Now watching: ', 'Ahora: ') + Profiles.current().name);
    }
  }

  // MARK: - Ask Beyond and notes (ADR 0025)

  /** Ask Beyond: the question and this TV's app names, and who's watching so a kid gets a kid's answer. Nothing is kept. */
  function askBeyond(text, apps, together, done) {
    if (!linked()) { done({status: 403}); return; }
    call('POST', '/tv/ask', {ask: String(text).slice(0, 200), apps: (apps || []).slice(0, 40), memberId: watcher(), together: together || undefined},
      function (err, json) { done(err, json); }, 40000);
  }

  /** A heart for a note: whoever wrote it hears about it on their phone. */
  function noteHeart(id, done) {
    call('POST', '/tv/notes/' + id + '/heart', {memberId: watcher()}, function (err) { done(err); });
  }

  /** Takes a note down, on every TV. */
  function noteDown(id, done) {
    call('POST', '/tv/notes/' + id + '/down', {}, function (err) { done(err); });
  }

  // MARK: - Messages on the screen

  var TONES = {
    info: {icon: '✦', colour: '#2F7D6D'},
    dinner: {icon: '🍽', colour: '#E8A33D'},
    tidy: {icon: '🧺', colour: '#D85A30'},
    bedtime: {icon: '🌙', colour: '#7A4FD0'},
    alarm: {icon: '⏰', colour: '#D85A30'},
    security: {icon: '🔔', colour: '#D85A30'},
    call: {icon: '📞', colour: '#378ADD'}
  };
  var shown = null, hideTimer = 0;

  function chime() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = chime.ctx || (chime.ctx = new Ctx());
      var notes = [660, 880];
      for (var i = 0; i < notes.length; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.18;
        o.type = 'sine';
        o.frequency.value = notes[i];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.65);
      }
    } catch (e) {}
  }

  /**
   * A message over everything, big enough to read from the couch: icon, words, who it's from, and an OK button.
   * It stays until somebody presses OK, so nobody can miss it (Kyle: "they have to accept to close"). ADR 0018.
   */
  function say(text, tone, from) {
    hide(true);
    var t = TONES[tone] || TONES.info;
    var stage = document.getElementById('stage');
    var card = UI.el('div', 'bt-alert', stage);
    var box = UI.el('div', 'bt-alert-box', card);
    var icon = UI.el('div', 'bt-alert-icon', box, t.icon);
    icon.style.background = t.colour;
    UI.el('div', 'bt-alert-text', box, text);
    UI.el('div', 'bt-alert-from', box, (from ? tr('De ', 'From ', 'De ') + from + ' · ' : '') + tr('agora', 'just now', 'ahora'));
    var ok = UI.button(UI.el('div', 'bt-buttons', box), tr('OK, entendi', 'OK, got it', 'OK, entendido'), 'check', 'primary focus');
    ok.onclick = function () { hide(); };
    shown = card;
    setTimeout(function () { UI.setClass(card, 'on', true); }, 20);
    chime();
  }

  /** While a message is up, only OK puts it away; every other key waits. True when the key was for the message. */
  function alertKey(k) {
    if (!shown) return false;
    if (k === TV.keys.ok) hide();
    return true;
  }

  /** Puts the message away. True if there was one, so the key that did it does nothing else. */
  function hide(now) {
    if (!shown) return false;
    var card = shown;
    shown = null;
    clearTimeout(hideTimer);
    UI.setClass(card, 'on', false);
    setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, now ? 0 : 400);
    return true;
  }

  // MARK: - Watching together

  // Two homes, one show. Beyond Family sends the moment to press play; this TV counts down to it by Beyond Family's
  // clock. OK opens the app (the countdown carries on, on everyone's phones). Reactions from phones float up.

  var tg = null, tgTimer = 0;

  function together(c) {
    togetherEnd();
    var at = Date.parse(c.startsAt);
    if (isNaN(at)) return;
    var stage = document.getElementById('stage');
    var card = UI.el('div', 'bt-together', stage);
    var head = UI.el('div', 'bt-together-head', card);
    UI.dots(head);
    UI.el('span', '', head, c['with'] && c['with'].length ? tr('Assistindo junto com ', 'Watching together with ', 'Viendo juntos con ') + c['with'].join(' & ')
      : tr('Todas as TVs juntas', 'Every TV together', 'Todos los TV juntos'));
    UI.el('div', 'bt-together-title', card, c.title);
    var count = UI.el('div', 'bt-together-count', card, '');
    var hint = UI.el('div', 'bt-together-hint', card, '');
    tg = {session: c.session, card: card, app: c.app};
    UI.setClass(card, 'on', true);
    chime();
    function tick() {
      if (!tg || tg.card !== card) return;
      var left = Math.ceil((at - (Date.now() + clockOffset)) / 1000);
      if (left > 0) {
        count.textContent = left;
        hint.textContent = c.app ? tr('Aperte OK para abrir o app e achar. Aperte play quando chegar a zero.', 'Press OK to open the app and find it. Press play at zero.', 'Pulsa OK para abrir la app y buscarlo. Dale a play en cero.')
          : tr('Prepare tudo. Aperte play quando chegar a zero.', 'Get it ready. Press play at zero.', 'Prepáralo. Dale a play en cero.');
        tgTimer = setTimeout(tick, 250);
      } else if (left > -5) {
        count.textContent = tr('Play!', 'Play!', '¡Play!');
        hint.textContent = tr('Bom filme!', 'Enjoy the show!', '¡Que lo disfrutes!');
        tgTimer = setTimeout(tick, 250);
      } else {
        hideTogether();
      }
    }
    tick();
  }

  /** OK on the countdown opens the app, if there is one. True when it used the key. */
  function togetherKey(code) {
    if (!tg) return false;
    if (code === KEYS.ok && tg.app) {
      var app = tg.app;
      hideTogether();
      if (!BeyondTV.openShelf(app)) UI.toast(tr('Esse app não está nesta TV', "That app isn't on this TV", 'Esa app no está en este TV'));
      return true;
    }
    if (code === TV.keys.back) { hideTogether(); return true; }
    return false;
  }

  function hideTogether() {
    clearTimeout(tgTimer);
    if (!tg) return;
    var card = tg.card;
    tg = null;
    UI.setClass(card, 'on', false);
    setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 400);
  }

  function togetherEnd(session) {
    if (!tg || (session && tg.session !== session)) return;
    hideTogether();
  }

  var floating = 0;

  /** A reaction drifting up the right of the screen, with who (or which home) sent it. */
  function react(emoji, from, colour) {
    if (!emoji || floating > 12) return;
    var stage = document.getElementById('stage');
    var r = UI.el('div', 'bt-react', stage);
    UI.el('div', 'e', r, emoji);
    var name = UI.el('div', 'n', r, from || '');
    if (colour) name.style.background = colour;
    r.style.right = (90 + Math.round(Math.random() * 220)) + 'px';
    var wait = 30 + floating * 400;   // a few at once go up one after another, not in a pile
    floating++;
    setTimeout(function () { UI.setClass(r, 'up', true); }, wait);
    setTimeout(function () { floating--; if (r.parentNode) r.parentNode.removeChild(r); }, wait + 4300);
  }

  // MARK: - The dinner question

  // One question on the TV; everyone answers on their phones. Until a grown-up reveals them the TV only learns who
  // has answered, so the faces fill in as people answer, then the answers come up together.
  var ask = null, askApi = null;

  function dinner(c) {
    if (c.kind === 'question') {
      ask = {id: c.question, text: c.text, from: c.from, answered: [], answers: null};
    } else if (!ask || ask.id !== c.question) {
      return;
    } else if (c.kind === 'question-end') {
      ask = null;
      if (askApi) askApi.close();
      return;
    } else if (c.kind === 'question-answered') {
      for (var i = 0; i < ask.answered.length; i++) if (ask.answered[i].name === c.name) return;
      ask.answered.push({name: c.name, colour: c.colour});
      if (!askApi) { UI.toast(c.name + tr(' respondeu à pergunta do jantar', ' answered the dinner question', ' respondió la pregunta de la cena')); return; }
    } else if (c.kind === 'question-reveal') {
      if (c.more && ask.answers) {
        // One person changed or added their answer after the reveal.
        var a = c.answers[0], found = false;
        for (var j = 0; j < ask.answers.length; j++) if (ask.answers[j].name === a.name) { ask.answers[j] = a; found = true; }
        if (!found) ask.answers.push(a);
      } else {
        ask.answers = c.answers || [];
      }
    }
    if (askApi) askApi.rebuild();
    else showDinner();
  }

  function showDinner() {
    hide();
    askApi = UI.open({
      cls: 'bt-dinner',
      build: function (layer, a) {
        if (!ask) return;
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('Pergunta do jantar', 'Dinner question', 'Pregunta de la cena'));
        UI.el('div', 'question', box, ask.text);
        if (ask.answers) {
          var grid = UI.el('div', 'answers', box);
          for (var i = 0; i < ask.answers.length; i++) {
            var card = UI.el('div', 'answer', grid);
            card.style.borderColor = ask.answers[i].colour || '#2F7D6D';
            UI.el('b', '', card, ask.answers[i].name);
            UI.el('span', '', card, ask.answers[i].answer);
            (function (n, d) { setTimeout(function () { UI.setClass(n, 'in', true); }, 250 + d * 450); })(card, i);
          }
        } else {
          UI.el('div', 'bt-sub', box, tr('Responda no Beyond Family, no seu celular. As respostas aparecem juntas.',
            'Answer in Beyond Family on your phone. The answers come up together.',
            'Responde en Beyond Family en tu teléfono. Las respuestas salen juntas.'));
          var faces = UI.el('div', 'faces', box);
          for (var f = 0; f < ask.answered.length; f++) {
            var face = UI.el('div', 'face', faces);
            UI.avatar(ask.answered[f], face, 110);
            UI.el('div', 'name', face, ask.answered[f].name);
          }
        }
        // Run from the remote (ADR 0021): show the answers, then finish. Phones only answer.
        var row = UI.el('div', 'bt-buttons', box), first = true;
        if (linked() && !ask.answers) {
          a.add(UI.button(row, tr('Mostrar as respostas', 'Show the answers', 'Mostrar las respuestas'), null, 'primary'), function () { play('question', 'reveal'); }, {first: true});
          first = false;
        }
        if (linked()) {
          a.add(UI.button(row, tr('Terminar', 'Finish', 'Terminar')), function () { play('question', 'end'); }, {first: first});
          first = false;
        }
        a.add(UI.button(row, tr('Fechar', 'Close', 'Cerrar')), function () { a.close(); }, {first: first});
      },
      closed: function () { askApi = null; }
    });
  }

  // MARK: - Quiz night

  // Ten questions, one at a time; everyone buzzes in on their phones. The TV learns who's in (never what they picked),
  // then the right answer and the scores when a grown-up reveals it, then the final scores.
  var game = null, gameApi = null, LETTERS = ['A', 'B', 'C', 'D'];

  function quiz(c) {
    if (c.kind === 'quiz') {
      game = {id: c.quiz, round: c.round, total: c.total, text: c.question, choices: c.choices || [], answered: [], answer: -1, right: [], scores: null, done: false};
    } else if (!game || game.id !== c.quiz) {
      return;
    } else if (c.kind === 'quiz-answered') {
      if (c.round !== game.round) return;
      for (var i = 0; i < game.answered.length; i++) if (game.answered[i].name === c.name) return;
      game.answered.push({name: c.name, colour: c.colour});
    } else if (c.kind === 'quiz-reveal') {
      if (c.round !== game.round) return;
      game.answer = c.answer;
      game.right = c.right || [];
      game.scores = c.scores || [];
    } else if (c.kind === 'quiz-end') {
      game.done = true;
      game.scores = c.scores || game.scores || [];
      if (window.Chime) Chime.play();
    }
    if (gameApi) gameApi.rebuild();
    else showQuiz();
  }

  function showQuiz() {
    hide();
    gameApi = UI.open({
      cls: 'bt-dinner bt-quiz',
      build: function (layer, a) {
        if (!game) return;
        var box = UI.el('div', 'bt-box', layer), i;
        if (game.done) {
          UI.heading(box, tr('Quiz da noite', 'Quiz night', 'Noche de quiz'));
          UI.el('div', 'question', box, tr('Placar final', 'Final scores', 'Puntuación final'));
          scoreRows(box, game.scores, true);
        } else {
          UI.heading(box, tr('Quiz da noite', 'Quiz night', 'Noche de quiz') + ' · ' + game.round + ' / ' + game.total);
          UI.el('div', 'question', box, game.text);
          var grid = UI.el('div', 'choices', box);
          for (i = 0; i < game.choices.length; i++) {
            var ch = UI.el('div', 'choice' + (game.answer < 0 ? '' : i === game.answer ? ' right' : ' wrong'), grid);
            UI.el('b', '', ch, LETTERS[i]);
            UI.el('span', '', ch, game.choices[i]);
          }
          if (game.answer < 0) {
            UI.el('div', 'bt-sub', box, tr('Responda no Beyond Family. Vale o primeiro toque.',
              'Buzz in on Beyond Family on your phone. The first tap counts.',
              'Responde en Beyond Family. Cuenta el primer toque.'));
            var faces = UI.el('div', 'faces', box);
            for (i = 0; i < game.answered.length; i++) {
              var face = UI.el('div', 'face', faces);
              UI.avatar(game.answered[i], face, 96);
              UI.el('div', 'name', face, game.answered[i].name);
            }
          } else {
            var names = [];
            for (i = 0; i < game.right.length; i++) names.push(game.right[i].name + (game.right[i].first ? ' ⚡' : ''));
            UI.el('div', 'bt-sub', box, names.length ? tr('Acertaram: ', 'Got it: ', 'Acertaron: ') + names.join(', ')
              : tr('Ninguém acertou essa.', 'Nobody got that one.', 'Nadie acertó esa.'));
            scoreRows(box, game.scores, false);
          }
        }
        // Run from the remote (ADR 0021): show the answer, the next question, finish. Phones only buzz in.
        var row = UI.el('div', 'bt-buttons', box), on = linked() && !game.done;
        if (on) {
          a.add(UI.button(row, game.answer < 0 ? tr('Mostrar a resposta', 'Show the answer', 'Mostrar la respuesta')
            : game.round >= game.total ? tr('Ver o placar', 'See the scores', 'Ver la puntuación')
            : tr('Próxima pergunta', 'Next question', 'Siguiente pregunta'), null, 'primary'),
            function () { step(game.answer < 0 ? 'reveal' : 'next'); }, {first: true});
          a.add(UI.button(row, tr('Terminar o quiz', 'Finish the quiz', 'Terminar el quiz')), function () { step('end'); });
        }
        a.add(UI.button(row, tr('Fechar', 'Close', 'Cerrar')), function () { a.close(); }, {first: !on});
      },
      closed: function () { gameApi = null; if (game && game.done) game = null; }
    });
  }

  function step(action) { play('quiz', action); }

  // MARK: - Games started from the TV (ADR 0021)

  /** Who's watching, as Beyond Family knows them, or nothing for Family or somebody only on this TV. */
  function watcher() {
    var p = window.Profiles && Profiles.current();
    return p && p.family && !p.together ? String(p.family) : undefined;
  }

  var gameBusy = false;

  /** Starts or moves on quiz night or the dinner question; Beyond Family sends the same commands a phone would. */
  function play(kind, action, done) {
    if (gameBusy) return;
    gameBusy = true;
    call('POST', '/tv/' + kind, {action: action, memberId: watcher()}, function (err) {
      gameBusy = false;
      if (err) UI.toast(tr('Não deu certo. Tente de novo.', "That didn't work. Try again.", 'No funcionó. Inténtalo de nuevo.'));
      if (done) done(err);
    });
  }

  /** A song found on the TV goes on the family's list too. done(song) with its id, or done(null). */
  function addSong(title, artist, done) {
    if (!linked() || !title) { if (done) done(null); return; }
    call('POST', '/tv/karaoke/songs', {title: String(title).slice(0, 80), artist: artist ? String(artist).slice(0, 60) : undefined, memberId: watcher()},
      function (err, json) {
        var song = !err && json && json.song ? json.song : null;
        if (song) songs.push(song);
        if (done) done(song);
      });
  }

  /** The best karaoke video for a song, from Beyond Family (Sing King and Lost Panda first). done(videoId or null). */
  function findVideo(title, artist, done) {
    if (!linked()) { done(null); return; }
    call('POST', '/tv/karaoke/find', {title: String(title).slice(0, 80), artist: artist ? String(artist).slice(0, 60) : undefined}, function (err, json) {
      done(!err && json && /^[A-Za-z0-9_-]{11}$/.test(json.videoId || '') ? json.videoId : null);
    }, 8000);
  }

  /** Tonight's next singer from the queue, taken off it. done(turn or null). */
  function nextTurn(done) {
    if (!linked()) { done(null); return; }
    call('POST', '/tv/karaoke/next', {}, function (err, json) { done(!err && json ? json.turn || null : null); });
  }

  // A save on its way: a sync arriving meanwhile must not put the old list back.
  var playlistBusy = false;

  /** Makes (no id) or saves a playlist. done(playlist or null). */
  function savePlaylist(p, done) {
    if (!linked()) { done(null); return; }
    playlistBusy = true;
    call(p.id ? 'PUT' : 'POST', '/tv/karaoke/playlists' + (p.id ? '/' + p.id : ''), {name: p.name, items: p.items}, function (err, json) {
      playlistBusy = false;
      var saved = !err && json ? json.playlist : null;
      if (saved) {
        var at = -1;
        for (var i = 0; i < playlists.length; i++) if (playlists[i].id === saved.id) at = i;
        if (at >= 0) playlists[at] = saved; else playlists.push(saved);
      } else UI.toast(tr('Não deu certo. Tente de novo.', "That didn't work. Try again.", 'No funcionó. Inténtalo de nuevo.'));
      done(saved);
    });
  }

  function dropPlaylist(id, done) {
    if (!linked()) { done(false); return; }
    call('DELETE', '/tv/karaoke/playlists/' + id, undefined, function (err) {
      if (!err) playlists = playlists.filter(function (p) { return p.id !== id; });
      done(!err);
    });
  }

  function scoreRows(box, scores, final) {
    var row = UI.el('div', 'scores' + (final ? ' final' : ''), box);
    for (var i = 0; i < (scores || []).length; i++) {
      var s = UI.el('div', 'score', row);
      s.style.borderColor = scores[i].colour || '#2F7D6D';
      UI.el('b', '', s, (final && i === 0 && scores[i].score > 0 ? '🏆 ' : '') + scores[i].name);
      UI.el('span', '', s, String(scores[i].score));
    }
  }

  // MARK: - Green time, after the fine day nudge

  /** Counts time outside as green time for these Beyond Family members (ids from the household's people). */
  function green(ids, minutes, done) {
    if (!linked()) { done({status: 0}); return; }
    call('POST', '/tv/green', {memberIds: ids.slice(0, 12), minutes: Math.max(10, Math.min(360, minutes))}, function (err) { done(err); });
  }

  // MARK: - The pets, fed

  /** A kid said yes on the TV: these pets are fed. Beyond Family ticks them off with the kid's name. */
  function petsFed(ids, member, done) {
    if (!linked()) { done({status: 0}); return; }
    call('POST', '/tv/pets/fed', {petIds: ids.slice(0, 8), memberId: member || undefined}, function (err) {
      if (!err && pets) {
        for (var i = 0; i < pets.length; i++) if (ids.indexOf(pets[i].id) >= 0) pets[i].due = false;
      }
      done(err);
    });
  }

  // MARK: - What's on, for the remote

  function now(app, title) {
    if (!linked()) return;
    var who = Profiles.current();
    // An empty answer means back on Beyond TV's home: nothing playing.
    call('POST', '/tv/now', app ? {app: String(app).slice(0, 40), title: title ? String(title).slice(0, 120) : undefined, who: who ? who.name : undefined} : {}, function () {});
  }

  if (listening()) start();

  return {
    linked: linked,
    homeName: function () { return state.home ? state.home.name : ''; },
    link: link,
    manage: manage,
    say: say,
    hide: hide,
    alertKey: alertKey,
    togetherKey: togetherKey,
    green: green,
    pets: function () { return linked() && pets ? pets : []; },
    havePets: function () { return pets !== null; },
    petsFed: petsFed,
    songs: function () { return linked() ? songs : []; },
    game: play,
    addSong: addSong,
    findVideo: findVideo,
    nextTurn: nextTurn,
    playlists: function () { return linked() ? playlists : []; },
    savePlaylist: savePlaylist,
    dropPlaylist: dropPlaylist,
    board: function () { return linked() ? board : null; },
    widgets: function () { return linked() ? widgets : []; },
    visit: visit,
    signOut: signOut,
    pushProfile: pushProfile,
    now: now,
    ask: askBeyond,
    noteHeart: noteHeart,
    noteDown: noteDown
  };
})();
