/*
 * The home screen for web-app TVs (LG webOS, Samsung Tizen), with the Android app's design and behavior (HomeView):
 *  - top: "Kia ora, Mum", the time, date and weather on one line, and the te reo word of the day; icon-only glass
 *    buttons at the right (Live TV, HDMI Inputs, Settings);
 *  - tabs (Keep watching, Explore, Movies, Shows) over three little TV screens: what was last opened from here, or the
 *    picks for this hour; the background is the first pick's photo, blurred and almost white;
 *  - "Tonight at home" at the right, with Beyond Family's badge when the TV is linked;
 *  - the glass shelf with the apps; ↓ opens the drawer (inputs, shortcuts, weather, prices); ↑ or Back closes it;
 *  - a night look from sunset to sunrise; a screensaver after a few idle minutes.
 * The remote's arrows, OK and Back move the focus; a pointer (LG's Magic Remote) focuses what it points at.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function sym(name, parent, size) {
    var s = el('span', 'sym', parent);
    s.style.webkitMaskImage = 'url(symbols/' + name + '.png)';
    s.style.maskImage = 'url(symbols/' + name + '.png)';
    if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
    return s;
  }

  /** Beyond's mark: the four brand dots. */
  function dots(parent) {
    var d = el('span', 'dots', parent);
    el('i', 'a', d); el('i', 'b', d); el('i', 'c', d); el('i', 'd', d);
    return d;
  }

  function coin(i, parent) {
    var c = window.COINS && window.COINS[i];
    if (!c) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    for (var k = 0; k < c.length; k++) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', c[k]);
      p.setAttribute('fill-rule', 'evenodd');
      svg.appendChild(p);
    }
    parent.appendChild(svg);
  }

  function hasClass(e, c) { return (' ' + e.className + ' ').indexOf(' ' + c + ' ') >= 0; }
  function setClass(e, c, on) {
    if (!e) return;
    if (on && !hasClass(e, c)) e.className = (e.className + ' ' + c).replace(/^\s+/, '');
    else if (!on && hasClass(e, c)) e.className = (' ' + e.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }

  var stage = $('stage'), body = document.body;

  /** The 1920 × 1080 stage fills the window (on the TV it already is 1920 × 1080). */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.webkitTransform = stage.style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }

  // MARK: - Apps on the shelf

  /** Shelf apps in this order when installed, like the Android app: key, LG app id, name on the TV, brand gradient. */
  var SHELF = [
    ['netflix', /^netflix$/, /netflix/i, ['#0A0A0A', '#000000']],
    ['youtube', /youtube/, /^youtube$/i, ['#1C1C1E', '#09090A']],
    // The family's own music (music.js), once Beyond Music answers on the house network
    ['music', /^beyond:music$/, /$^/, ['#6E3DDB', '#2C2458']],
    // New Zealand's own, matched by name (their app ids differ by TV maker)
    ['neon', /neon/, /^neon$/i, ['#2B1036', '#12061A']],
    ['tvnz', /tvnz/, /tvnz/i, ['#3A1C8C', '#1A0B47']],
    ['disney', /disney/, /disney/i, ['#173584', '#08143F']],
    ['prime', /^amazon$/, /prime video|amazon/i, ['#2AA8FF', '#0A68D4']],
    ['threenow', /threenow/, /threenow/i, ['#1C1C1E', '#000000']],
    ['skygo', /skygo|sky\.go/, /sky go|skygo/i, ['#0A62C9', '#05306B']],
    ['plex', /plex/, /^plex$/i, ['#282A2D', '#111214']],
    ['max', /hbo|wbd/, /^(hbo )?max$|hbo max/i, ['#5C30E8', '#221684']],
    ['appletv', /appletv|apple\.tv/, /apple tv/i, ['#1C1C1E', '#000000']],
    ['hulu', /^hulu/, /hulu/i, ['#1CE783', '#0B8F4E']],
    ['paramount', /paramount|cbs/, /paramount/i, ['#0064FF', '#002A86']],
    ['peacock', /peacock/, /peacock/i, ['#1C1C1E', '#000000']],
    ['nfl', /nfl/, /^nfl/i, ['#013369', '#00163D']],
    ['globoplay', /globoplay/, /globoplay/i, ['#FF8A1F', '#FF2D5A']],
    ['spotify', /spotify/, /spotify/i, ['#1DB954', '#0F7A36']]
  ];
  var MAX_SHELF = 8;

  /**
   * An app on a shelf by its name ("t:netflix"), the same on every make of TV, so a shelf kept in Beyond Family finds
   * the same apps on the next TV. Shelves saved before this hold app ids, which still match.
   */
  function shelfName(app) { return 't:' + String(app.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40); }
  function onShelf(app, entry) { return app.id === entry || shelfName(app) === entry; }

  function shelfKey(app) {
    for (var i = 0; i < SHELF.length; i++) if (SHELF[i][1].test(app.id) || SHELF[i][2].test(app.title)) return SHELF[i];
    return null;
  }

  function darken(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#161618';
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')';
  }

  /** A name that fits the tile on one line (the font shrinks for long names). */
  function wordFit(title, width, max) {
    return Math.max(18, Math.min(max, Math.floor(width * 0.8 / (Math.max(4, title.length) * 0.56))));
  }

  /** An app's face: its own icon on its brand color (or its name, when the icon can't be read). */
  function face(app, box, wordSize) {
    var k = shelfKey(app);
    var top = k ? k[3][0] : app.color ? darken(app.color, 0.92) : '#2A2A2E';
    var bottom = k ? k[3][1] : app.color ? darken(app.color, 0.62) : '#161618';
    box.style.background = '-webkit-linear-gradient(top, ' + top + ', ' + bottom + ')';
    box.style.background = 'linear-gradient(' + top + ', ' + bottom + ')';
    var word = el('div', 'word', box, app.title);
    if (wordSize) word.style.fontSize = wordSize + 'px';
    if (app.icon) {
      var img = el('img', '', box);
      word.style.visibility = 'hidden';
      img.onerror = function () { img.parentNode.removeChild(img); word.style.visibility = ''; };
      img.src = app.icon;
    }
  }

  var apps = [], shelf = [], others = [], inputs = [];

  function pickShelf() {
    var chosen = Prefs.shelf(), out = [];
    if (chosen) {
      for (var i = 0; i < chosen.length && out.length < MAX_SHELF; i++) {
        for (var j = 0; j < apps.length; j++) if (onShelf(apps[j], chosen[i]) && out.indexOf(apps[j]) < 0) { out.push(apps[j]); break; }
      }
    } else {
      for (var s = 0; s < SHELF.length && out.length < MAX_SHELF; s++) {
        for (var a = 0; a < apps.length; a++) {
          if ((SHELF[s][1].test(apps[a].id) || SHELF[s][2].test(apps[a].title)) && out.indexOf(apps[a]) < 0) { out.push(apps[a]); break; }
        }
      }
      if (window.Profiles && Profiles.kid()) {
        // A kids' profile starts with the kids' apps the TV has, in the same order. A teen gets YouTube and music too.
        var fits = Profiles.teen() ? Profiles.teenApp : Profiles.kidApp;
        out = out.filter(function (a) { return fits(a); });
        for (var k = 0; k < apps.length && out.length < MAX_SHELF; k++) if (fits(apps[k]) && out.indexOf(apps[k]) < 0) out.push(apps[k]);
      }
      if (!out.length) out = apps.slice(0, MAX_SHELF);
    }
    shelf = out;
    others = apps.filter(function (x) { return shelf.indexOf(x) < 0; });
  }

  // MARK: - Focus

  var Z = {TOP: 'top', CARDS: 'cards', SHELF: 'shelf', DRAWER: 'drawer', APPS: 'apps', SETTINGS: 'settings', EDIT: 'edit'};
  var st = {zone: Z.SHELF, top: 0, tab: 0, card: 0, shelf: 0, drawer: 0, grid: 0, row: 0, edit: 0};
  var cards = [];

  function sheetOpen() { return st.zone === Z.APPS || st.zone === Z.SETTINGS || st.zone === Z.EDIT; }

  function updateFocus() {
    var i, list;
    list = $('tabs').children;
    for (i = 0; i < list.length; i++) {
      setClass(list[i], 'on', i === st.tab);
      setClass(list[i], 'focus', st.zone === Z.TOP && st.top === i);
    }
    list = $('buttons').children;
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.TOP && st.top === kinds.length + i);
    setClass($('quotes'), 'hide', st.zone === Z.TOP && st.top >= kinds.length);
    list = $('cards').children;
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.CARDS && st.card === i);
    list = $('tiles').querySelectorAll('.tile');
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.SHELF && st.shelf === i);
    list = document.querySelectorAll('#drawer .key');
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.DRAWER && st.drawer === i);
    list = document.querySelectorAll('#apps .cell');
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.APPS && st.grid === i);
    var rows = Math.max(1, Math.ceil(others.length / 5)), r = Math.floor(st.grid / 5), first = Math.max(0, Math.min(rows - 3, r - 1));
    $('apps').lastChild.style.webkitTransform = $('apps').lastChild.style.transform = 'translateY(' + (-first * 239) + 'px)';
    focusRows($('settings'), st.row, st.zone === Z.SETTINGS);
    focusRows($('shelfedit'), st.edit, st.zone === Z.EDIT);
    setClass(body, 'drawer-open', st.zone === Z.DRAWER);
  }

  function focusRows(sheet, index, on) {
    var rows = sheet.querySelectorAll('.row');
    for (var i = 0; i < rows.length; i++) setClass(rows[i], 'focus', on && i === index);
    var holder = sheet.querySelector('.rows');
    if (!holder) return;
    var visible = 7, first = Math.max(0, Math.min(rows.length - visible, index - 3));
    holder.style.webkitTransform = holder.style.transform = 'translateY(' + (-first * 78) + 'px)';
  }

  function nearest(nodes, x) {
    var best = 0, bestD = 1e9;
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect(), d = Math.abs((r.left + r.right) / 2 - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function centerX(node) {
    if (!node) return 960;
    var r = node.getBoundingClientRect();
    return (r.left + r.right) / 2;
  }

  // MARK: - Top: title, tabs, buttons, quotes

  /**
   * The tabs over the screens: Keep watching once something was opened from here, then the picks (Explore, Movies,
   * Shows) when there are picks to show (a TMDB key, or a kid's own list).
   */
  var kinds = [];

  function tabKinds() {
    var k = [];
    // Pinned: the tiles the household chose in Beyond Family, first because somebody picked them on purpose.
    if (window.Family && Family.widgets().length) k.push('pinned');
    if (Watched.list(1).length) k.push('watching');
    // Your home: the rooms from the family's Beyond Home box, once there is one on this network. Not for kids.
    if (window.HomeHub && HomeHub.status() !== 'none' && !Profiles.kid()) k.push('home');
    if (Data.hasKey() || Profiles.kid()) k.push('all', 'movie', 'tv');
    return k;
  }

  function tabName(kind) {
    if (kind === 'pinned') return tr('Fixados', 'Pinned', 'Fijados');
    if (kind === 'home') return tr('Sua casa', 'Your home', 'Tu casa');
    return kind === 'watching' ? tr('Continuar assistindo', 'Keep watching', 'Seguir viendo')
      : kind === 'movie' ? tr('Filmes', 'Movies', 'Películas') : kind === 'tv' ? tr('Séries', 'Shows', 'Series')
      : tr('Explorar', 'Explore', 'Explorar');
  }

  /** The round buttons at the top right: Live TV, HDMI Inputs, Settings and whoever's watching (kids get fewer). */
  function topButtons() {
    var kid = Profiles.kid(), list = [];
    // Ask Beyond: the four dots, breathing. Linked to Beyond Family it's the assistant, kids included (ask.js, ADR 0025),
    // with Talk to Beyond inside it; without, the dots are feedback, typed on the remote (talkToBeyond).
    if (Family.linked()) list.push({dots: true, label: tr('Pergunte à Beyond', 'Ask Beyond', 'Pregúntale a Beyond'), run: function () { Ask.open(); }});
    else if (!kid) list.push({dots: true, label: tr('Fale com a Beyond', 'Talk to Beyond', 'Habla con Beyond'), run: talkToBeyond});
    // Notes from the family, when there are any up: opens them big (notes.js).
    if (Notes.count()) list.push({emoji: '\uD83D\uDCDD', label: tr('Bilhetes', 'Notes', 'Notas'), run: function () { Notes.open(); }});
    list.push({icon: 'live_tv', label: tr('TV aberta', 'Live TV', 'TV en vivo'), run: function () {
      var live = liveTV(); if (live) launcher(live.id, tr('TV aberta', 'Live TV', 'TV en vivo'))();
    }});
    if (!kid) list.push({icon: 'hdmi', label: tr('Entradas HDMI', 'HDMI Inputs', 'Entradas HDMI'), run: function () {
      st.zone = Z.SHELF; openDrawer(); st.drawer = 1 < drawerInputs ? 1 : 0; updateFocus();
    }});
    // Bedtime breathing, in the evening: a night light that breathes, then fades to dark.
    if (Data.isNight(Date.now())) list.push({icon: 'bedtime', label: tr('Respirar para dormir', 'Bedtime breathing', 'Respirar para dormir'), run: function () { Bedtime.start(15); }});
    // Games, for anyone with the remote: karaoke, a party, quiz night and the rest, no phone needed (games.js).
    list.push({icon: 'gamepad', label: tr('Jogos', 'Games', 'Juegos'), run: function () { Games.open(); }});
    // Tonight's sky: a star chart for here and the moon (sky.js). For everyone, kids included.
    list.push({icon: 'star', label: tr('Céu de hoje à noite', 'Tonight\'s sky', 'El cielo de esta noche'), run: function () { Sky.open(); }});
    if (!kid) list.push({icon: 'settings', label: tr('Ajustes', 'Settings', 'Ajustes'), run: function () { openSettings(); }});
    if (kid) list.push({icon: 'sparkles', label: tr('Do seu jeito', 'Make it yours', 'A tu manera'), run: makeItYours});
    if (Profiles.count() > 1 || window.Family) list.push({person: Profiles.current(), label: tr('Trocar quem está assistindo', 'Change who\'s watching', 'Cambiar quién mira'),
      run: function () { Profiles.pick(false, profileChosen); }});
    return list;
  }

  function renderTop() {
    var me = Profiles.current(), reo = Prefs.kupu(), hello = tr('Olá', reo ? 'Kia ora' : 'Hello', 'Hola');
    $('title').textContent = me.together ? hello + tr(', família', reo ? ', whānau' : ', everyone', ', familia')
      : Profiles.count() > 1 ? hello + ', ' + me.name : hello;
    var was = kinds[st.tab];
    kinds = tabKinds();
    st.tab = Math.max(0, kinds.indexOf(was));
    var tabs = $('tabs');
    tabs.innerHTML = '';
    for (var i = 0; i < kinds.length; i++) {
      var t = el('button', 'tab', tabs, tabName(kinds[i]));
      hover(t, Z.TOP, i);
    }
    var buttons = $('buttons');
    buttons.innerHTML = '';
    var defs = topButtons(), n = defs.length;
    for (var b = 0; b < n; b++) {
      var r = el('button', 'round' + (b === n - 1 ? ' last' : '') + (defs[b].person ? ' me' : ''), buttons);
      r.style.left = (1772 - 88 * (n - 1 - b)) + 'px';
      if (defs[b].person) {
        // A face alone meant nothing to a child: the face, then the name, as a pill.
        UI.avatar(defs[b].person, r, 68);
        var p = defs[b].person, who = p.together ? tr('Família', 'Family', 'Familia') : p.name || '';
        el('span', 'who', r, who.length > 12 ? who.slice(0, 11) + '\u2026' : who);
      } else if (defs[b].dots) UI.dots(r);
      else if (defs[b].emoji) el('span', 'emo', r, defs[b].emoji);
      else sym(defs[b].icon, r);
      el('div', 'tip', r, defs[b].label);
      hover(r, Z.TOP, kinds.length + b);
    }
    // The pill is wider than a circle: the buttons to its left move over to make room.
    var me = buttons.querySelector('.round.me');
    if (me) {
      var extra = me.offsetWidth - 68, all = buttons.querySelectorAll('.round');
      for (var j = 0; j < all.length; j++) {
        if (all[j] === me) { all[j].style.left = (1772 - extra) + 'px'; continue; }
        all[j].style.left = (parseInt(all[j].style.left, 10) - extra) + 'px';
      }
    }
  }

  function renderQuotes() {
    var q = $('quotes'), coins = Data.activeCoins();
    q.innerHTML = '';
    // Te reo word of the day, in its own chip under the time: the kupu, then what it means.
    var kupu = $('kupu');
    kupu.innerHTML = '';
    setClass(kupu, 'on', Prefs.kupu());
    if (Prefs.kupu()) {
      var k = Kupu.today();
      el('b', '', kupu, k.word);
      el('span', '', kupu, k.meaning + ' · ' + tr('palavra do dia em te reo', 'te reo word of the day', 'palabra del día en te reo'));
    }
    for (var i = 0; i < coins.length; i++) {
      var item = el('span', 'q', q);
      coin(coins[i], item);
      el('span', '', item, Data.compact(Data.prices[coins[i]]));
    }
  }

  // MARK: - Picks and background

  function renderCards() {
    // Keep watching, or the picks: a kid watching gets good shows matched to what they're into, or a card asking.
    var kind = kinds[st.tab], pickKind = kind === 'all' ? null : kind;
    if (window.HomeHub) HomeHub.pace(kind === 'home');
    var list = kind === 'pinned' ? pinnedCards() : kind === 'home' ? homeCards() : kind === 'watching' ? watchingCards() : kind ? KidPicks.cards(pickKind) || Data.picks(pickKind) : [];
    var holder = $('cards');
    setClass(body, 'no-picks', !list.length);
    var same = list.length === cards.length;
    for (var i = 0; same && i < list.length; i++) same = list[i].id === cards[i].id && list[i].backdrop === cards[i].backdrop && list[i].meta === cards[i].meta;
    if (same && holder.children.length === list.length) return;
    cards = list;
    holder.innerHTML = '';
    // Three little TV screens on stands, like the Beyond mark; six smaller ones for the pinned tiles.
    // Five or six tiles go smaller, to stay clear of Tonight at home.
    var grid = kind === 'pinned' || kind === 'home', most = grid ? 6 : 3, small = grid && list.length > 4;
    camImgs = [];
    for (var c = 0; c < list.length && c < most; c++) {
      var p = list[c], card = el('div', 'card screen' + (p.tile || p.house ? ' pin' : '') + (small ? ' small' : ''), holder);
      card.style.left = (80 + c * (small ? 200 : p.tile || p.house ? 290 : 400)) + 'px';
      var img = el('div', 'img', card);
      el('div', 'stand', card);
      if (p.tile) drawTile(p, img);
      else if (p.house) drawHouse(p, img);
      else if (p.kid || p.ask) {
        setClass(card, 'kidpick', true);
        img.style.background = 'linear-gradient(135deg, ' + p.colour + ', #2C2458)';
        el('div', 'emoji', img, p.emoji);
      } else if (p.watched) {
        var app = appById(p.watched.app);
        if (p.watched.image) img.style.backgroundImage = 'url(' + p.watched.image + ')';
        else if (app) { setClass(img, 'face', true); face(app, img, 30); }
        else img.style.background = '#2C2458';
        el('div', 'when', img, Watched.when(p.watched.at));
      } else img.style.backgroundImage = 'url(' + Data.image(p.backdrop, 'w780') + ')';
      el('div', 'play', img);
      el('div', 'name', card, p.title);
      if (p.meta) el('div', 'meta', card, p.meta);
      hover(card, Z.CARDS, c);
    }
    list = list.slice(0, most);
    cards = list;
    st.card = Math.min(st.card, Math.max(0, list.length - 1));
    if (!list.length && st.zone === Z.CARDS) st.zone = Z.SHELF;
    backdrop(list.length && list[0].backdrop ? Data.image(list[0].backdrop, 'w300') : '');
    renderClock();
    updateFocus();
  }

  // MARK: - Pinned tiles (Beyond Family)

  /** The household's tiles as cards: an app, a show on an app, the kids' jobs, a camera. An app this TV hasn't got is left off. */
  function pinnedCards() {
    var out = [], tiles = Family.widgets();
    for (var i = 0; i < tiles.length; i++) {
      var w = tiles[i], app = w.app ? appByShelf(w.app) : null;
      if (w.kind === 'app' && app) out.push({id: 'pin:' + w.app, tile: w, app: app.id, title: app.title, meta: tr('App', 'App', 'App')});
      else if (w.kind === 'show') out.push({id: 'pin:show:' + w.title, tile: w, app: app && app.id, title: w.title,
        meta: app ? app.title : tr('Não está nesta TV', 'Not on this TV', 'No está en este TV')});
      else if (w.kind === 'jobs') out.push({id: 'pin:jobs:' + JSON.stringify(w.kids || []), tile: w, title: tr('Tarefas de hoje', 'Jobs today', 'Tareas de hoy'),
        meta: jobsLine(w.kids || [])});
      else if (w.kind === 'camera' && w.url) out.push({id: 'pin:cam:' + w.url, tile: w, title: w.name, meta: tr('Câmera', 'Camera', 'Cámara')});
    }
    return out;
  }

  function appByShelf(name) {
    for (var i = 0; i < apps.length; i++) if (shelfName(apps[i]) === name) return apps[i];
    return null;
  }

  function jobsLine(kids) {
    var done = 0, all = 0;
    for (var i = 0; i < kids.length; i++) for (var j = 0; j < kids[i].jobs.length; j++) { all++; if (kids[i].jobs[j].done) done++; }
    if (!all) return tr('Nenhuma tarefa hoje', 'No jobs today', 'Sin tareas hoy');
    return done === all ? tr('Tudo feito!', 'All done!', '¡Todo hecho!') : done + tr(' de ', ' of ', ' de ') + all + tr(' feitas', ' done', ' hechas');
  }

  var camImgs = [], camTimer = 0;

  /** A camera's picture, fresh: loaded first, then swapped in, so a slow camera never shows a broken picture. */
  function camera(url, node) {
    var fresh = url + (url.indexOf('?') < 0 ? '?' : '&') + 'bt=' + Date.now(), pic = new Image();
    pic.onload = function () { node.style.backgroundImage = 'url("' + fresh + '")'; setClass(node, 'nocam', false); };
    pic.onerror = function () { setClass(node, 'nocam', true); };
    pic.src = fresh;
  }

  function drawTile(p, img) {
    var w = p.tile, app = p.app ? appById(p.app) : null;
    if ((w.kind === 'app' || w.kind === 'show') && app) { setClass(img, 'face', true); face(app, img, 26); }
    else if (w.kind === 'show') img.style.background = '#2C2458';
    else if (w.kind === 'jobs') {
      setClass(img, 'jobs', true);
      var kids = w.kids || [];
      for (var k = 0; k < kids.length && k < 3; k++) {
        var row = el('div', 'kid', img), dot = el('i', '', row);
        dot.style.background = kids[k].colour || '#2F7D6D';
        el('b', '', row, kids[k].name);
        var ticks = el('span', '', row);
        for (var j = 0; j < kids[k].jobs.length && j < 8; j++) el('em', kids[k].jobs[j].done ? 'done' : '', ticks);
      }
    } else if (w.kind === 'camera') {
      setClass(img, 'cam', true);
      el('div', 'live', img);
      camImgs.push({url: w.url, node: img});
      camera(w.url, img);
    }
  }

  /** The cameras on the Pinned tab, every five seconds while it's on screen. */
  function tickCameras() {
    if (saverOn || kinds[st.tab] !== 'pinned') return;
    for (var i = 0; i < camImgs.length; i++) camera(camImgs[i].url, camImgs[i].node);
  }

  /** A camera full screen, a fresh picture every two seconds, until Back. */
  function openCamera(w) {
    var timer = 0;
    UI.open({cls: 'bt-camera', build: function (layer) {
      var pic = UI.el('div', 'pic', layer);
      UI.el('div', 'name', layer, w.name);
      camera(w.url, pic);
      clearInterval(timer);
      timer = setInterval(function () { camera(w.url, pic); }, 2000);
    }, closed: function () { clearInterval(timer); }});
  }

  /** Every kid's jobs for today, ticked or not. */
  function openJobs(w) {
    UI.open({cls: 'bt-jobs', build: function (layer) {
      layer = UI.el('div', 'bt-box', layer);
      var kids = w.kids || [];
      UI.heading(layer, tr('Tarefas de hoje', 'Jobs today', 'Tareas de hoy'), jobsLine(kids));
      var list = UI.el('div', 'bt-jobs-list all', layer);
      for (var k = 0; k < kids.length; k++) {
        var who = UI.el('div', 'bt-job-who', list, kids[k].name);
        who.style.color = kids[k].colour || '#2F7D6D';
        for (var j = 0; j < kids[k].jobs.length; j++) UI.el('div', 'bt-job' + (kids[k].jobs[j].done ? ' done' : ''), list, kids[k].jobs[j].title);
      }
    }});
  }

  // MARK: - Your home (Beyond Home)

  /** The rooms as cards, or one card to connect the box. */
  function homeCards() {
    var status = HomeHub.status();
    if (status === 'paired') return HomeHub.rooms().map(function (r) {
      return {id: 'home:' + r.id + ':' + r.line, house: true, room: r, title: r.name, meta: r.line};
    });
    return [{id: 'home:pair:' + HomeHub.code(), house: true, title: tr('Conectar o Beyond Home', 'Connect Beyond Home', 'Conectar Beyond Home'),
      meta: status === 'waiting' ? tr('Código ', 'Code ', 'Código ') + HomeHub.code() : tr('Achamos o seu na rede', 'We found yours on the network', 'Encontramos el tuyo en la red')}];
  }

  /** A room's card: a little house, and a dot for each thing that's on. */
  function drawHouse(p, img) {
    setClass(img, 'house', true);
    sym(p.room ? 'home' : 'sync', img, 64);
    if (!p.room) return;
    var on = el('div', 'ons', img), things = p.room.things || [];
    for (var i = 0; i < things.length && i < 10; i++) if (!things[i].away) el('em', things[i].on ? 'on' : '', on);
  }

  // Built when asked, so they're in the language picked (tr reads it each time).
  function momentWords(id) {
    return id === 'movie' ? [tr('Noite de filme', 'Movie night', 'Noche de cine'), tr('TV e som ligados, luzes baixas', 'TV and sound on, lights down', 'TV y sonido encendidos, luces bajas')]
      : id === 'morning' ? [tr('Manhã', 'Morning', 'Mañana'), tr('Luzes acesas', 'Lights up', 'Luces encendidas')]
      : id === 'bedtime' ? [tr('Hora de dormir', 'Bedtime', 'Hora de dormir'), tr('Telas e luzes apagadas', 'Screens and lights off', 'Pantallas y luces apagadas')]
      : id === 'off' ? [tr('Desligar tudo', 'Everything off', 'Apagar todo'), tr('O cômodo todo desligado', 'The whole room off', 'Toda la habitación apagada')] : null;
  }

  /** A room: its Moments, the one remote and each thing on or off. */
  function openRoom(id) {
    UI.open({cls: 'bt-room', build: function (layer, api) {
      var r = HomeHub.room(id);
      if (!r) { setTimeout(api.close, 0); return; }
      layer = UI.el('div', 'bt-box', layer);
      UI.heading(layer, r.name, r.line);
      function ask(what, extra) {
        var q = {room: r.id, do: what};
        for (var k in extra) q[k] = extra[k];
        HomeHub.act(q, function (ok, why) {
          if (!ok) toast(why || tr('Não deu agora. Tente de novo.', "That didn't work. Try again.", 'No funcionó. Inténtalo de nuevo.'));
        });
      }
      var first = true;
      if (r.moments.length) {
        var moments = UI.el('div', 'bt-room-row', layer);
        for (var m = 0; m < r.moments.length; m++) (function (mo) {
          var words = momentWords(mo.id) || [mo.name, mo.lead];
          var b = UI.button(moments, words[0], mo.id === 'bedtime' ? 'bedtime' : mo.id === 'movie' ? 'live_tv' : 'sparkles', mo.id === 'movie' ? 'primary' : '');
          api.add(b, function () { ask('moment', {moment: mo.id}); toast(words[0] + ': ' + words[1]); }, {first: first});
          first = false;
        })(r.moments[m]);
      }
      if (r.remote) {
        var rem = r.remote, remote = UI.el('div', 'bt-room-row', layer);
        UI.el('div', 'bt-room-label', remote, rem.name + (rem.on ? (rem.volume !== null && rem.volume !== undefined ? ' · ' + rem.volume : '') + (rem.muted ? ' · ' + tr('mudo', 'muted', 'silencio') : '') : ' · ' + tr('desligado', 'off', 'apagado')));
        api.add(UI.button(remote, tr('Mais baixo', 'Quieter', 'Más bajo'), 'speaker'), function () { ask('volume_down'); }, {first: first});
        api.add(UI.button(remote, tr('Mais alto', 'Louder', 'Más alto'), 'speaker'), function () { ask('volume_up'); });
        api.add(UI.button(remote, rem.muted ? tr('Com som', 'Unmute', 'Con sonido') : tr('Mudo', 'Mute', 'Silencio')), function () { ask('mute'); });
        api.add(UI.button(remote, rem.on ? tr('Desligar', 'Turn off', 'Apagar') : tr('Ligar', 'Turn on', 'Encender')), function () { ask('power'); });
        first = false;
      }
      var things = r.things.filter(function (t) { return !t.away; });
      if (things.length) {
        var list = UI.el('div', 'bt-room-things', layer);
        for (var i = 0; i < things.length && i < 12; i++) (function (t) {
          var b = UI.el('div', 'bt-thing' + (t.on ? ' on' : ''), list);
          UI.el('i', '', b);
          UI.el('b', '', b, t.name);
          UI.el('span', '', b, t.on ? tr('Ligado', 'On', 'Encendido') : tr('Desligado', 'Off', 'Apagado'));
          api.add(b, function () { ask('toggle', {thing: t.id}); }, {first: first});
          first = false;
        })(things[i]);
      }
      if (first) UI.el('div', 'bt-sub', layer, tr('Nada para controlar neste cômodo ainda.', 'Nothing to work in this room yet.', 'Nada que controlar en esta habitación aún.'));
    }});
  }

  /** Connect the box: a code to type in the Beyond Home app, until it's typed. */
  function openPairing() {
    function draw(layer) {
      layer = UI.el('div', 'bt-box', layer);
      UI.heading(layer, tr('Conectar o Beyond Home', 'Connect Beyond Home', 'Conectar Beyond Home'),
        tr('No app Beyond Home, vá em Ajustes, TVs, e digite este código.', 'In the Beyond Home app, go to Settings, TVs, and type this code.', 'En la app Beyond Home, ve a Ajustes, TVs, y escribe este código.'));
      UI.el('div', 'bt-code', layer, HomeHub.code() || '······');
    }
    var api = UI.open({cls: 'bt-pair-home', build: function (layer) { draw(layer); }, closed: function () { HomeHub.pace(kinds[st.tab] === 'home'); }});
    HomeHub.pace(true);
    if (HomeHub.status() === 'found') HomeHub.pair(function (ok) {
      if (!ok) { api.close(); toast(tr('O Beyond Home não respondeu. Tente de novo.', "Beyond Home didn't answer. Try again.", 'Beyond Home no respondió. Inténtalo de nuevo.')); return; }
      api.rebuild();
      HomeHub.refresh();
    });
  }

  /** The box said something new: the tab, the cards, an open room or the pairing code. */
  function homeChanged() {
    if (tabKinds().join() !== kinds.join()) renderTop();
    if (kinds[st.tab] === 'home') renderCards();
    var top = UI.top();
    if (!top) return;
    if (document.querySelector('.layer.bt-room')) top.rebuild();
    else if (document.querySelector('.layer.bt-pair-home')) { if (HomeHub.status() === 'paired') top.close(); else top.rebuild(); }
  }

  function appById(id) {
    for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return apps[i];
    return null;
  }

  /** Keep watching as cards: the show and its app when it came from a pick, otherwise just the app. */
  function watchingCards() {
    return Watched.list(3).map(function (x) {
      var app = appById(x.app), name = (app && app.title) || x.name;
      return {id: 'w:' + x.app + ':' + x.title + ':' + x.at, watched: x, title: x.title || name, meta: x.title ? name : '', app: x.app};
    });
  }

  /** Something opened from here goes to the front of Keep watching. */
  function remember(app, title, image) {
    if (!app) return;
    Watched.add({app: app.id, name: app.title, title: title || '', image: image || ''});
  }

  var bgUrl = null, bgFront = 'bgA';

  /** The first pick's photo as the background: drawn tiny and stretched, it's already as soft as a heavy blur. */
  function backdrop(url) {
    if (url === bgUrl) return;
    bgUrl = url;
    var next = bgFront === 'bgA' ? 'bgB' : 'bgA';
    if (!url) {
      setClass($('bgA'), 'on', false);
      setClass($('bgB'), 'on', false);
      return;
    }
    var img = new Image();
    img.onload = function () {
      if (bgUrl !== url) return;
      var canvas = $(next), ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setClass(canvas, 'on', true);
      setClass($(bgFront), 'on', false);
      bgFront = next;
    };
    img.src = url;
  }

  function renderClock() {
    var d = new Date(), c = $('clock'), date;
    c.firstChild.textContent = Data.time(d.getTime());
    try {
      date = d.toLocaleDateString(I18N.locale(), {weekday: 'long', day: 'numeric', month: 'long'});
    } catch (e) {
      date = d.toDateString();
    }
    c.lastChild.textContent = date;
    // One line under the greeting: the time, the day and the weather outside.
    var info = $('info'), w = Data.weather;
    info.innerHTML = '';
    // Without screens to show, the big clock has the time, so the line starts with the day.
    if (!hasClass(body, 'no-picks')) { el('b', 'time', info, Data.time(d.getTime())); el('span', '', info, '  ·  '); }
    el('span', '', info, date);
    if (w && Prefs.weather()) el('span', '', info, '  ·  ' + (Data.city ? Data.city + ' ' : '') + Data.degrees(w.temp) + ', ' + Data.condition(w.code, w.isDay).toLowerCase());
  }

  // MARK: - Tonight at home

  /**
   * The card at the right: Beyond Family's badge when the TV is linked (the four dots, the household and its faces),
   * then what's on at home today from the noticeboard (tea, birthdays, the calendar, notes), the weather, and at
   * night, bedtime breathing.
   */
  function renderTonight() {
    var box = $('tonight');
    box.innerHTML = '';
    var kid = Profiles.kid(), linked = Family.linked(), night = Data.isNight(Date.now());
    if (linked) {
      var badge = el('div', 'family', box);
      el('i', 'live', badge);
      dots(badge);
      var words = el('div', 'words', badge);
      el('b', '', words, 'Beyond Family');
      el('span', '', words, Family.homeName() || tr('Conectado', 'Linked', 'Conectado'));
      var faces = el('div', 'faces', badge), people = Profiles.list().filter(function (p) { return !p.together; });
      for (var f = 0; f < people.length && f < 5; f++) {
        var face1 = el('i', 'face', faces, people[f].emoji || (people[f].name || '?').charAt(0).toUpperCase());
        face1.style.background = people[f].colour || '#2F7D6D';
      }
    }
    el('div', 'head', box, night ? tr('Hoje à noite em casa', 'Tonight at home', 'Esta noche en casa') : tr('Hoje em casa', 'Today at home', 'Hoy en casa'));
    var rows = [], b = Family.board ? Family.board() : null;
    if (b) {
      for (var i = 0; i < (b.birthdays || []).length; i++) rows.push(['🎂', tr('Feliz aniversário, ', 'Happy birthday, ', '¡Feliz cumpleaños, ') + b.birthdays[i] + '!', '']);
      if (b.tea) rows.push(['🍲', b.tea, tr('Jantar', 'Tea tonight', 'Cena')]);
      var events = b.events || [];
      for (var e = 0; e < events.length; e++) {
        var ev = events[e];
        rows.push(['📅', ev.title, [ev.time ? Data.time(clockAt(ev.time)) : tr('O dia todo', 'All day', 'Todo el día'), ev.who, ev.where].filter(function (x) { return x; }).join(' · ')]);
      }
      var notes = b.notes || [];
      for (var n = 0; n < notes.length; n++) rows.push(['💬', notes[n].text, notes[n].from]);
    }
    var w = Data.weather;
    if (w && Prefs.weather()) {
      rows.push([null, Data.degrees(w.temp) + ', ' + Data.condition(w.code, w.isDay).toLowerCase(),
        (I18N.lang === 'en' ? 'High ' + Data.degrees(w.max) + ', low ' + Data.degrees(w.min) : tr('Máx. ', 'High ', 'Máx. ') + Data.degrees(w.max) + '  ' + tr('Mín. ', 'Low ', 'Mín. ') + Data.degrees(w.min)),
        Data.symbol(w.code, w.isDay)]);
    }
    if (night) {
      var mo = Sky.moon();
      rows.push([mo.emoji, mo.name + ', ' + Math.round(mo.lit * 100) + '% ' + tr('iluminada', 'lit', 'iluminada'),
        tr('O botão da estrela, lá em cima', 'The star button, up the top', 'El botón de la estrella, arriba')]);
    }
    if (night) rows.push(['🌙', tr('Respirar para dormir', 'Bedtime breathing', 'Respirar para dormir'), tr('No botão da lua, lá em cima', 'The moon button, up the top', 'En el botón de la luna, arriba')]);
    if (!linked && !kid) rows.push(['✨', tr('Conecte o Beyond Family', 'Link Beyond Family', 'Conecta Beyond Family'), tr('E os planos da casa aparecem aqui', "And your home's plans show up here", 'Y los planes de casa aparecen aquí')]);
    // A note up takes the space under the card, so the card keeps to one line (renderNotes).
    var room = Notes.count() ? 1 : linked ? 3 : 4;
    for (var r = 0; r < rows.length && r < room; r++) {
      var row = el('div', 'row', box), icon = el('div', 'icon', row);
      if (rows[r][0]) icon.textContent = rows[r][0];
      else sym(rows[r][3], icon, 34);
      var text = el('div', 'text', row);
      el('div', 'what', text, rows[r][1]);
      if (rows[r][2]) el('div', 'more', text, rows[r][2]);
    }
    setClass(box, 'on', rows.length > 0 || linked);
    renderNotes();
  }

  /** The newest note, in the space under Today at home and over the shelf (notes.js draws it). */
  function renderNotes() {
    var box = $('notes'), tonight = $('tonight');
    if (!box) return;
    var top = hasClass(tonight, 'on') ? tonight.offsetTop + tonight.offsetHeight + 22 : 296;
    var height = Math.min(260, $('platter').offsetTop - 26 - top);
    box.style.top = top + 'px';
    if (height < 150) { Notes.card(box, 0); setClass(box, 'on', false); return; }
    Notes.card(box, height);
  }

  // MARK: - Shelf

  function renderShelf() {
    var n = shelf.length, gap = 52, pad = 32, nameH = 38, bottom = 1020;
    // Square icons with the name under each, like an iPad (as on Android). The glass keeps its bottom edge.
    var tw = Math.min(132, (1760 - Math.max(0, n - 1) * gap) / Math.max(1, n)), th = tw;
    var width = n * tw + Math.max(0, n - 1) * gap, left = (1920 - width) / 2, top = bottom - th - nameH - 2 * pad;
    var platter = $('platter');
    platter.style.display = n ? '' : 'none';
    platter.style.left = (left - pad) + 'px';
    platter.style.width = (width + 2 * pad) + 'px';
    platter.style.top = top + 'px';
    platter.style.height = (bottom - top) + 'px';
    var tiles = $('tiles');
    tiles.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var t = el('div', 'tile', tiles), x = left + i * (tw + gap);
      t.style.left = x + 'px';
      t.style.top = (top + pad) + 'px';
      t.style.width = tw + 'px';
      t.style.height = th + 'px';
      face(shelf[i], t, wordFit(shelf[i].title, tw, 26));
      hover(t, Z.SHELF, i);
      var name = el('div', 'tile-name', tiles, shelf[i].title);
      name.style.left = (x - gap / 2) + 'px';
      name.style.width = (tw + gap) + 'px';
      name.style.top = (top + pad + th + 12) + 'px';
    }
    st.shelf = Math.min(st.shelf, Math.max(0, n - 1));
  }

  // MARK: - Drawer

  var drawerItems = [], drawerInputs = 0;

  function renderDrawer() {
    var d = $('drawer');
    d.innerHTML = '';
    drawerItems = [];
    var kid = Profiles.kid();
    for (var i = 0; i < inputs.length; i++) {
      var x = inputs[i];
      if (kid && x.key !== 'live') continue;   // kids get Live TV, not the HDMI inputs
      drawerItems.push({label: x.label || tr('TV aberta', 'Live TV', 'TV en vivo'), symbol: x.symbol, off: !x.connected, run: launcher(x.id, x.label)});
    }
    drawerInputs = drawerItems.length;
    drawerItems.push({label: tr('Todos os Apps', 'All Apps', 'Todas las apps'), symbol: 'apps', run: openApps});
    drawerItems.push({label: tr('Timer de desligar', 'Sleep Timer', 'Temporizador'), symbol: 'bedtime', run: function () { toast(Sleep.press()); }});
    if (!kid) drawerItems.push({label: tr('Ajustes do Beyond™ TV', 'Beyond™ TV Settings', 'Ajustes de Beyond™ TV'), symbol: 'settings', run: openSettings});
    if (!kid) drawerItems.push({label: tr('Ajustes da TV', 'TV Settings', 'Ajustes del TV'), symbol: 'tv_settings', run: tvSettings});
    var n = drawerItems.length, gap = 18, groupGap = 56, groups = drawerInputs > 0 && drawerInputs < n ? 2 : 1;
    var tw = Math.min(230, (1760 - Math.max(0, n - groups) * gap - (groups - 1) * groupGap) / Math.max(1, n));
    var xPos = 80;
    for (var k = 0; k < n; k++) {
      if (k === drawerInputs && k > 0) {
        xPos += groupGap - gap;
        el('div', 'row-title', d, tr('Atalhos', 'Shortcuts', 'Accesos directos')).style.left = (xPos + 4) + 'px';
      }
      if (k === 0 && drawerInputs) el('div', 'row-title', d, tr('Entradas', 'Inputs', 'Entradas')).style.left = '84px';
      var item = drawerItems[k], key = el('div', 'key glass' + (item.off ? ' off' : ''), d);
      key.style.left = xPos + 'px';
      key.style.width = tw + 'px';
      sym(item.symbol, key);
      el('div', 'label', key, item.label);
      hover(key, Z.DRAWER, k);
      xPos += tw + gap;
    }
    renderPanels();
    updateFocus();
  }

  function renderPanels() {
    var d = $('drawer');
    var old = d.querySelectorAll('.panel');
    for (var o = 0; o < old.length; o++) d.removeChild(old[o]);
    var wx = Prefs.weather(), coins = Data.activeCoins(), qt = coins.length > 0;
    var split = 80 + 1760 * 0.585;
    if (wx) {
      var w = el('div', 'panel glass', d);
      w.id = 'weather';
      w.style.left = '80px';
      w.style.width = ((qt ? split - 16 : 1840) - 80) + 'px';
      renderWeather(w);
    }
    if (qt) {
      var q = el('div', 'panel glass', d);
      q.id = 'prices';
      var left = wx ? split + 16 : 80;
      q.style.left = left + 'px';
      q.style.width = (1840 - left) + 'px';
      renderPrices(q, coins);
    }
  }

  function renderWeather(card) {
    el('div', 'head', card, Data.city || tr('Clima', 'Weather', 'Clima'));
    var w = Data.weather;
    if (!w) {
      el('div', 'cond', card, tr('Sem dados do clima agora.', 'No weather data right now.', 'No hay datos del clima ahora.')).style.top = '96px';
      return;
    }
    var now = el('div', 'now', card);
    sym(Data.symbol(w.code, w.isDay), now);
    el('span', 'temp', now, Data.degrees(w.temp));
    el('div', 'cond', card, Data.condition(w.code, w.isDay));
    el('div', 'range', card, I18N.lang === 'ru' ? 'Макс. ' + Data.degrees(w.max) + '   Мин. ' + Data.degrees(w.min) : tr('Máx. ' + Data.degrees(w.max) + '   Mín. ' + Data.degrees(w.min), 'H:' + Data.degrees(w.max) + '   L:' + Data.degrees(w.min),
        'Máx. ' + Data.degrees(w.max) + '   Mín. ' + Data.degrees(w.min)));
    el('div', 'split', card);
    var hours = el('div', 'hours', card), width = parseFloat(card.style.width) - 30 - 422, hw = width / 6;
    for (var i = 0; i < w.hours.length && i < 6; i++) {
      var h = el('div', 'hour', hours), x = w.hours[i];
      h.style.left = (hw * i) + 'px';
      h.style.width = hw + 'px';
      el('div', 't', h, Data.hour(x.at));
      sym(Data.symbol(x.code, x.day), h);
      el('div', 'd', h, Data.degrees(x.temp));
    }
    var sun = el('div', 'sun', card);
    if (w.sunrise) { var a = el('span', '', sun); sym('sunrise', a); a.appendChild(document.createTextNode(tr('Nascer ', 'Sunrise ', 'Amanecer ') + Data.time(w.sunrise))); }
    if (w.sunset) { var b = el('span', '', sun); sym('sunset', b); b.appendChild(document.createTextNode(tr('Pôr do sol ', 'Sunset ', 'Atardecer ') + Data.time(w.sunset))); }
  }

  function renderPrices(card, coins) {
    el('div', 'head', card, tr('Cotações', 'Crypto', 'Cripto'));
    var stale = Data.staleness(Data.pricesAt, 5 * 60000);
    el('div', 'side', card, stale || tr('variação em 24 h', '24h change', 'variación en 24 h'));
    for (var j = 0; j < coins.length; j++) {
      var i = coins[j], row = el('div', 'coin', card);
      row.style.top = (86 + 52 * j) + 'px';
      coin(i, row);
      el('span', 'n', row, Data.coinName(i));
      el('span', 'p', row, Data.money(Data.prices[i]));
      var ch = Data.changes[i];
      if (!isNaN(ch)) el('span', 'c ' + (ch >= 0 ? 'up' : 'down'), row, Data.change(ch));
    }
  }

  function openDrawer() {
    if (!drawerItems.length) return;
    var tiles = $('tiles').querySelectorAll('.tile');
    st.zone = Z.DRAWER;
    st.drawer = Math.min(drawerItems.length - 1, nearest(document.querySelectorAll('#drawer .key'), centerX(tiles[st.shelf])));
    updateFocus();
  }

  function closeDrawer() {
    var keys = document.querySelectorAll('#drawer .key');
    st.zone = Z.SHELF;
    if (shelf.length) st.shelf = nearest($('tiles').querySelectorAll('.tile'), centerX(keys[st.drawer]));
    updateFocus();
  }

  // MARK: - All Apps

  function renderApps() {
    var sheet = $('apps');
    sheet.firstChild.textContent = tr('Todos os Apps', 'All Apps', 'Todas las apps');
    var grid = sheet.lastChild;
    grid.innerHTML = '';
    for (var i = 0; i < others.length; i++) {
      var r = Math.floor(i / 5), c = i % 5, cell = el('div', 'cell', grid);
      cell.style.left = (130 + c * 340) + 'px';
      cell.style.top = (196 + r * 239) + 'px';
      face(others[i], el('div', 'face', cell), wordFit(others[i].title, 300, 34));
      el('div', 'label', cell, others[i].title);
      hover(cell, Z.APPS, i);
    }
  }

  function openApps() {
    renderApps();
    st.zone = Z.APPS;
    st.grid = 0;
    setClass($('apps'), 'open', true);
    updateFocus();
  }

  function closeSheets() {
    setClass($('apps'), 'open', false);
    setClass($('settings'), 'open', false);
    setClass($('shelfedit'), 'open', false);
    st.zone = Z.SHELF;
    updateFocus();
  }

  // MARK: - Beyond™ TV Settings

  function settingRows() {
    var lang = Prefs.language(), unit = Prefs.temperature(), theme = Prefs.theme();
    var auto = tr('Automático', 'Automatic', 'Automático'), on = tr('Ligado', 'On', 'Activado'), off = tr('Desligado', 'Off', 'Desactivado');
    var rows = [
      // Te reo Māori is a choice of language: English with the word of the day and "Kia ora" (Prefs.kupu).
      {label: tr('Idioma', 'Language', 'Idioma'), value: LANG_NAMES[langChoice()] || auto,
        step: function (d) {
          var next = LANGS[(LANGS.indexOf(langChoice()) + (d || 1) + LANGS.length) % LANGS.length];
          Prefs.set('language', next === 'mi' ? 'en' : next);
          Prefs.set('kupu', next === 'mi' || next === 'auto');
          I18N.set(Prefs.language());
          renderAll();
        }},
      {label: tr('Temperatura', 'Temperature', 'Temperatura'), value: unit === 'C' ? '°C' : unit === 'F' ? '°F' : auto,
        step: function (d) { cycle('temperature', ['auto', 'C', 'F'], unit, d); renderPanels(); }},
      {label: tr('Tema', 'Theme', 'Tema'), value: theme === 'light' ? tr('Claro', 'Light', 'Claro') : theme === 'dark' ? tr('Escuro', 'Dark', 'Oscuro') : auto,
        step: function (d) { cycle('theme', ['auto', 'light', 'dark'], theme, d); checkNight(); }},
      {label: tr('Widget do clima', 'Weather widget', 'Widget del clima'), toggle: Prefs.weather(),
        step: function () { Prefs.set('weather', !Prefs.weather()); renderPanels(); }},
      {label: tr('Sons', 'Sounds', 'Sonidos'), toggle: Prefs.sounds(),
        step: function () { Prefs.set('sounds', !Prefs.sounds()); if (Prefs.sounds()) Chime.play(); }},
      {label: tr('Protetor de tela após', 'Screensaver after', 'Salvapantallas tras'), value: Prefs.saverAfter() + ' min',
        step: function (d) { cycle('saverAfter', SAVER_MINUTES, Prefs.saverAfter(), d); }},
      {label: tr('Protetor de tela', 'Screensaver', 'Salvapantallas'),
        value: Prefs.screensaver() === 'art' ? tr('Arte', 'Art', 'Arte') : Prefs.screensaver() === 'photos' ? tr('Fotos de filmes', 'Film photos', 'Fotos de películas')
          : Art.on() ? tr('Automático (arte)', 'Automatic (art)', 'Automático (arte)') : tr('Automático (fotos)', 'Automatic (photos)', 'Automático (fotos)'),
        step: function (d) { cycle('screensaver', ['auto', 'art', 'photos'], Prefs.screensaver(), d); }},
      {label: tr('Tipo de arte', 'Kind of art', 'Tipo de arte'), value: Art.kindName(),
        step: function (d) {
          cycle('artKind', Art.kinds.map(function (k) { return k.id; }), Prefs.artKind(), d);
          Art.refresh();
        }}
    ];
    var names = ['Bitcoin', 'Ethereum', 'Solana', tr('Dólar', 'Dollar', 'Dólar')];
    if (CONFIG.showCrypto === true) {
      rows.push({label: tr('Widget de cotações', 'Quotes widget', 'Widget de cotizaciones'), toggle: Prefs.quotes(),
        step: function () { Prefs.set('quotes', !Prefs.quotes()); Data.settingsChanged(); }});
    }
    // The coins only while the quotes widget is on: off, they would be a list of switches that do nothing.
    var count = !Prefs.quotes() ? 0 : Data.currency === 'BRL' ? 4 : 3;
    for (var i = 0; i < count; i++) {
      (function (i) {
        rows.push({label: names[i], toggle: Prefs.quotes() && Prefs.coin(i), dim: !Prefs.quotes(),
          step: function () { if (Prefs.quotes()) { Prefs.setCoin(i, !Prefs.coin(i)); Data.settingsChanged(); } }});
      })(i);
    }
    rows.push({label: tr('Ajudar a corrigir problemas', 'Help fix problems', 'Ayudar a corregir problemas'), toggle: Checkin.on(),
      step: function () {
        Checkin.set(!Checkin.on());
        toast(Checkin.on() ? tr('Uma vez por dia: cidade, modelo da TV e erros. Nunca o que você assiste.',
          "Once a day: your city, the TV's model and its errors. Never what you watch.",
          'Una vez al día: tu ciudad, el modelo de la TV y sus errores. Nunca lo que ves.')
          : tr('Desligado. A Beyond esquece esta TV.', 'Off. Beyond forgets this TV.', 'Desactivado. Beyond olvida esta TV.'));
      }});
    rows.push({label: Family.linked() ? 'Beyond Family · ' + Family.homeName() : tr('Ligar ao Beyond Family', 'Link Beyond Family', 'Vincular Beyond Family'),
      value: '›', step: function (d) { if (d >= 0) { if (Family.linked()) Family.manage(); else Family.link(function () { renderSettings(); }); } }});
    if (!Plex.linked()) rows.push({label: tr('Ligar o Plex', 'Link Plex', 'Enlazar Plex'), value: '›', step: function (d) { if (d >= 0) Plex.link(function () { renderSettings(); }); }});
    else {
      rows.push({label: tr('Usuário Plex de ', 'Plex user for ', 'Usuario Plex de ') + Profiles.current().name + ' · ' + ((Profiles.own('plexUser') || {}).name || tr('dono', 'owner', 'dueño')),
        value: '›', step: function (d) { if (d >= 0) Plex.chooseUser(); }});
      rows.push({label: tr('Desligar o Plex', 'Unlink Plex', 'Desenlazar Plex') + ' · ' + Plex.serverName(), value: '›', step: function (d) {
        if (d < 0) return;
        Plex.unlink();
        toast(tr('Plex desligado desta TV.', 'Plex unlinked from this TV.', 'Plex desenlazado de esta TV.'));
        renderSettings();
      }});
    }
    rows.push({label: tr('Perfis', 'Profiles', 'Perfiles'), value: '›', step: function (d) { if (d >= 0) { closeSheets(); Profiles.manage(function () { profileChosen(); }); } }});
    rows.push({label: tr('PIN de adulto', 'Grown-up PIN', 'PIN de adulto'), value: '›', step: function (d) { if (d >= 0) Profiles.setPin(); }});
    rows.push({label: tr('Dock de apps de ', 'App Dock for ', 'Dock de apps de ') + Profiles.current().name, value: '›', step: function (d) { if (d >= 0) openShelfEdit(); }});
    rows.push({label: tr('Ajustes da TV', 'TV Settings', 'Ajustes del TV'), value: '›', step: function (d) { if (d >= 0) tvSettings(); }});
    return rows;
  }

  var LANGS = ['auto', 'mi', 'en', 'de', 'es', 'pt', 'ru'], SAVER_MINUTES = [1, 3, 5, 10, 15, 30];
  var LANG_NAMES = {mi: 'English and te reo Māori', en: 'English', de: 'Deutsch', es: 'Español', pt: 'Português', ru: 'Русский'};

  function langChoice() {
    var lang = Prefs.language();
    return lang === 'en' && Prefs.kupu() ? 'mi' : lang;
  }

  function cycle(name, values, current, d) {
    var i = values.indexOf(current);
    Prefs.set(name, values[(i + (d || 1) + values.length) % values.length]);
  }

  var rowsNow = [];

  function renderSettings() {
    var box = $('settings').firstChild;
    box.innerHTML = '';
    var title = el('div', 'title', box);
    dots(title).style.marginRight = '18px';
    title.appendChild(document.createTextNode(tr('Ajustes do Beyond™ TV', 'Beyond™ TV Settings', 'Ajustes de Beyond™ TV')));
    var list = el('div', 'list', box), holder = el('div', 'rows', list);
    rowsNow = settingRows();
    list.style.height = Math.min(rowsNow.length, 7) * 78 + 'px';
    for (var i = 0; i < rowsNow.length; i++) {
      var r = rowsNow[i], row = el('div', 'row' + (r.dim ? ' dim' : ''), holder, r.label);
      if (r.toggle !== undefined) setClass(el('div', 'toggle', row), 'on', r.toggle);
      else {
        var v = el('span', 'value', row);
        if (r.value === '›') v.textContent = '›';
        else { el('span', 'chev', v, '‹'); v.appendChild(document.createTextNode(r.value)); el('span', 'chev', v, '›'); }
      }
      hover(row, Z.SETTINGS, i);
    }
    el('div', 'hint', box, tr('OK ou as setas mudam o valor.', 'OK or the arrows change the value.', 'OK o las flechas cambian el valor.'));
    updateFocus();
  }

  function openSettings() {
    // Settings are for grown-ups: a kid with no PIN set switches to a grown-up first.
    if (Profiles.kid() && !Profiles.hasPin()) { Profiles.pick(false, profileChosen); return; }
    Profiles.guard(tr('Ajustes do Beyond™ TV', 'Beyond™ TV Settings', 'Ajustes de Beyond™ TV'), showSettings);
  }

  function showSettings() {
    st.zone = Z.SETTINGS;
    st.row = 0;
    renderSettings();
    setClass($('settings'), 'open', true);
    updateFocus();
  }

  // MARK: - Shelf editor: which apps, in what order

  function ordinal(n) {
    if (I18N.lang === 'ru') return n + '-е';
    if (I18N.lang === 'de') return n + '.';
    if (I18N.lang !== 'en') return n + 'º';
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function editList() {
    var ids = shelf.map(function (a) { return a.id; });
    return {ids: ids, rows: apps.slice().sort(function (a, b) {
      var ia = ids.indexOf(a.id), ib = ids.indexOf(b.id);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
    })};
  }

  function renderShelfEdit() {
    var box = $('shelfedit').firstChild, e = editList();
    box.innerHTML = '';
    var title = el('div', 'title', box);
    sym('apps', title);
    title.appendChild(document.createTextNode(tr('Dock de apps', 'App Dock', 'Dock de apps')));
    var list = el('div', 'list', box), holder = el('div', 'rows', list);
    list.style.height = Math.min(e.rows.length, 7) * 78 + 'px';
    for (var i = 0; i < e.rows.length; i++) {
      var a = e.rows[i], at = e.ids.indexOf(a.id), row = el('div', 'row', holder, a.title);
      el('span', 'value', row, at >= 0 ? tr('Na prateleira · ', 'On · ', 'En el estante · ') + ordinal(at + 1) : tr('Fora', 'Off', 'Fuera'));
      hover(row, Z.EDIT, i);
    }
    el('div', 'hint', box, tr('OK põe ou tira · ← → mudam a ordem', 'OK adds or removes · ← → change the order', 'OK pone o quita · ← → cambian el orden'));
    updateFocus();
  }

  function openShelfEdit() {
    setClass($('settings'), 'open', false);
    st.zone = Z.EDIT;
    st.edit = 0;
    renderShelfEdit();
    setClass($('shelfedit'), 'open', true);
    updateFocus();
  }

  function editShelf(dx) {
    var e = editList(), app = e.rows[st.edit];
    if (!app) return;
    var ids = e.ids.slice(), at = ids.indexOf(app.id);
    if (dx === 0) {
      if (at >= 0) ids.splice(at, 1);
      else if (ids.length < MAX_SHELF) ids.push(app.id);
      else { toast(tr('O dock cabe até ' + MAX_SHELF + ' apps.', 'The App Dock holds up to ' + MAX_SHELF + ' apps.', 'El dock tiene hasta ' + MAX_SHELF + ' apps.')); return; }
    } else {
      if (at < 0) return;
      var to = Math.max(0, Math.min(ids.length - 1, at + dx));
      ids.splice(at, 1);
      ids.splice(to, 0, app.id);
    }
    Prefs.set('shelf', ids.map(function (id) {
      for (var j = 0; j < apps.length; j++) if (apps[j].id === id) return shelfName(apps[j]);
      return id;
    }));
    pickShelf();
    renderShelf();
    var again = editList();
    for (var i = 0; i < again.rows.length; i++) if (again.rows[i].id === app.id) st.edit = i;
    renderShelfEdit();
  }

  // MARK: - Opening things

  function launcher(id, name) {
    return function () {
      if (jobsFirst()) return;
      // Plex opens Beyond TV's own Plex screen: Continue Watching, the libraries and the player, right here.
      if (/plex/i.test(name || '') || /plex|cdp-30/i.test(id || '')) { Plex.open(); Family.now('Plex'); return; }
      if (id === Music.app.id) { Music.open(); return; }
      TV.launch(id, null, function (ok) {
        if (!ok) toast(tr('Não deu para abrir ', "Couldn't open ", 'No se pudo abrir ') + (name || id));
        else Family.now(name || id);
      });
    };
  }

  function tvSettings() {
    TV.settings(function (ok) {
      if (!ok) toast(tr('Não deu para abrir os Ajustes da TV', "Couldn't open TV Settings", 'No se pudieron abrir los Ajustes del TV'));
    });
  }

  function liveTV() {
    for (var i = 0; i < inputs.length; i++) if (inputs[i].key === 'live') return inputs[i];
    return null;
  }

  function activate() {
    switch (st.zone) {
      case Z.TOP:
        if (st.top < kinds.length) return;
        var btn = topButtons()[st.top - kinds.length];
        if (btn) btn.run();
        return;
      case Z.CARDS:
        var p = cards[st.card];
        if (p && p.house) { if (p.room) openRoom(p.room.id); else openPairing(); return; }
        if (p && p.tile) {
          var on = p.app ? appById(p.app) : null;
          if (p.tile.kind === 'camera') openCamera(p.tile);
          else if (p.tile.kind === 'jobs') openJobs(p.tile);
          else if (on) {
            remember(on, p.tile.kind === 'show' ? p.title : '');
            if (p.tile.kind === 'show') toast(tr('Abrindo ', 'Opening ', 'Abriendo ') + on.title + tr('. Procure ', ': look for ', '. Busca ') + p.title);
            launcher(on.id, on.title)();
          } else toast(tr('Esse app não está nesta TV', "That app isn't on this TV", 'Esa app no está en este TV'));
          return;
        }
        if (p && p.watched) {
          var again = appById(p.watched.app);
          if (again) { remember(again, p.watched.title, p.watched.image); launcher(again.id, again.title)(); }
          return;
        }
        var app = p && Data.appFor(p.app);
        if (p && p.ask) KidPicks.ask(renderCards);
        else if (p && p.kid) KidPicks.watch(p, function (id, title) { remember(appById(id), p.title); launcher(id, title)(); });
        else if (app) { remember(app, p.title, p.backdrop ? Data.image(p.backdrop, 'w780') : ''); launcher(app.id, app.title)(); }
        return;
      case Z.SHELF:
        if (shelf[st.shelf]) { remember(shelf[st.shelf]); launcher(shelf[st.shelf].id, shelf[st.shelf].title)(); }
        return;
      case Z.DRAWER:
        if (drawerItems[st.drawer]) drawerItems[st.drawer].run();
        return;
      case Z.APPS:
        if (others[st.grid]) { remember(others[st.grid]); launcher(others[st.grid].id, others[st.grid].title)(); }
        return;
      case Z.SETTINGS:
        if (rowsNow[st.row]) { rowsNow[st.row].step(1); if (st.zone === Z.SETTINGS) renderSettings(); }
        return;
      case Z.EDIT:
        editShelf(0);
        return;
    }
  }

  function selectTab(i) {
    if (i === st.tab) return;
    st.tab = i;
    renderCards();
  }

  function move(dx, dy) {
    var tiles = $('tiles').querySelectorAll('.tile'), cardNodes = $('cards').children;
    switch (st.zone) {
      case Z.SHELF:
        if (dx) st.shelf = Math.max(0, Math.min(shelf.length - 1, st.shelf + dx));
        else if (dy > 0) { openDrawer(); return; }
        else if (dy < 0) {
          if (cards.length) { st.zone = Z.CARDS; st.card = nearest(cardNodes, centerX(tiles[st.shelf])); }
          else { st.zone = Z.TOP; st.top = kinds.length ? st.tab : 0; }
        }
        break;
      case Z.CARDS:
        if (dx) st.card = Math.max(0, Math.min(cards.length - 1, st.card + dx));
        else if (dy < 0) { st.zone = Z.TOP; st.top = st.tab; }
        else if (shelf.length) { st.zone = Z.SHELF; st.shelf = nearest(tiles, centerX(cardNodes[st.card])); }
        break;
      case Z.TOP:
        if (dx) {
          st.top = Math.max(0, Math.min(kinds.length - 1 + topButtons().length, st.top + dx));
          if (st.top < kinds.length) selectTab(st.top);   // as on Apple TV: focusing a tab selects it
        } else if (dy > 0 && st.top >= kinds.length && kinds.length) {
          st.top = st.tab;   // down from the buttons in the corner: back to the tabs
        } else if (dy > 0) {
          if (cards.length) { st.zone = Z.CARDS; st.card = Math.min(cards.length - 1, st.top < kinds.length ? 0 : cards.length - 1); }
          else st.zone = Z.SHELF;
        } else if (st.top < kinds.length && topButtons().length) {
          st.top = kinds.length;   // up from the tabs: the buttons in the corner
        }
        break;
      case Z.DRAWER:
        if (dx) st.drawer = Math.max(0, Math.min(drawerItems.length - 1, st.drawer + dx));
        else if (dy < 0) { closeDrawer(); return; }
        break;
      case Z.APPS:
        var g = st.grid + dx + dy * 5;
        if (g >= 0 && g < others.length && (dx === 0 || Math.floor(g / 5) === Math.floor(st.grid / 5))) st.grid = g;
        break;
      case Z.SETTINGS:
        if (dy) st.row = Math.max(0, Math.min(rowsNow.length - 1, st.row + dy));
        else if (dx && rowsNow[st.row]) {
          var r = rowsNow[st.row];
          if (r.value !== '›') { r.step(dx); renderSettings(); }
        }
        break;
      case Z.EDIT:
        if (dy) st.edit = Math.max(0, Math.min(apps.length - 1, st.edit + dy));
        else if (dx) editShelf(dx);
        break;
    }
    updateFocus();
  }

  function back() {
    if (st.zone === Z.EDIT) { setClass($('shelfedit'), 'open', false); showSettings(); st.row = rowsNow.length - 2; updateFocus(); return; }
    if (sheetOpen()) { closeSheets(); return; }
    if (st.zone === Z.DRAWER) { closeDrawer(); return; }
    if (st.zone !== Z.SHELF && shelf.length) { st.zone = Z.SHELF; updateFocus(); return; }
    TV.back();
  }

  /** The pointer focuses what it's over (the Magic Remote, or a mouse when previewing). */
  function hover(node, zone, index) {
    node.onmouseover = function () {
      if (UI.active()) return;
      if (saverOn || (sheetOpen() !== (zone === Z.APPS || zone === Z.SETTINGS || zone === Z.EDIT))) return;
      if (zone === Z.DRAWER && st.zone !== Z.DRAWER) return;
      if (zone !== Z.DRAWER && st.zone === Z.DRAWER && zone !== Z.SHELF) return;
      if (zone === Z.SHELF && st.zone === Z.DRAWER) closeDrawer();
      st.zone = zone;
      if (zone === Z.TOP) { st.top = index; if (index < kinds.length) selectTab(index); }
      else if (zone === Z.CARDS) st.card = index;
      else if (zone === Z.SHELF) st.shelf = index;
      else if (zone === Z.DRAWER) st.drawer = index;
      else if (zone === Z.APPS) st.grid = index;
      else if (zone === Z.SETTINGS) st.row = index;
      else if (zone === Z.EDIT) st.edit = index;
      updateFocus();
    };
    node.onclick = function () { node.onmouseover(); activate(); };
  }

  // MARK: - Toast

  var toastTimer = 0;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    setClass(t, 'on', true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { setClass(t, 'on', false); }, 6000);
  }

  // MARK: - Night, clock, screensaver

  var inWorld = false;

  /** A kid's world (Make it yours) keeps the light words on, day and night. */
  function checkNight() {
    setClass(body, 'night', inWorld || Data.isNight(Date.now()));
  }

  function paintWorld() {
    inWorld = MyWorld.home($('sky'), Profiles.current());
    setClass(body, 'in-world', inWorld);
    checkNight();
  }

  var saverOn = false, idleAt = Date.now(), saverIndex = 0, saverTimer = 0;

  function showSaver() {
    var art = Art.on();
    var photos = art ? Art.list() : Data.showcase().filter(function (p) { return p.backdrop && Data.appFor(p.app); });
    if (art) Art.refresh(function () { if (saverOn && !photos.length) photos = Art.list(); });
    saverOn = true;
    saverAt = Date.now();
    var s = $('saver');
    s.innerHTML = '';
    // Art is a painting on the wall: no clock, no names, no captions. Messages from the family still come over it.
    setClass(s, 'gallery', art);
    var a = el('div', 'photo', s), b = el('div', 'photo', s);
    el('div', 'shade', s);
    var brand = el('div', 'brand lockup', s);
    dots(brand);
    brand.appendChild(document.createTextNode('Beyond™ TV'));
    var clock = el('div', 'clock', s);
    el('div', 'time', clock);
    el('div', 'date', clock);
    el('div', 'title', clock);
    if (Prefs.kupu()) {
      var k = Kupu.today(), kupu = el('div', 'kupu', clock);
      el('b', '', kupu, k.word);
      kupu.appendChild(document.createTextNode('  ' + k.say + ' · ' + k.meaning));
    }
    var notice = el('div', 'board', s);
    var front = a;
    function next() {
      if (!saverOn) return;
      var p = photos.length ? photos[saverIndex++ % photos.length] : null;
      var back = front === a ? b : a;
      if (p && art && p.url) {
        // Season art (Halloween, Christmas...) is drawn for the whole screen: no mat, a gentle zoom.
        setClass(back, 'art', false);
        back.innerHTML = '';
        back.style.backgroundImage = 'url(' + p.url + ')';
        back.style.webkitTransform = back.style.transform = 'none';
        setTimeout(function () {
          setClass(back, 'on', true);
          setClass(front, 'on', false);
          front = back;
        }, 60);
      } else if (p && art) {
        // A painting filling the screen, still. The small copy sits under the big one in case the big one won't come.
        back.innerHTML = '';
        setClass(back, 'art', true);
        back.style.backgroundImage = 'url(' + Art.image(p) + '), url(' + Art.image(p, true) + ')';
        back.style.webkitTransform = back.style.transform = 'none';
        setTimeout(function () {
          setClass(back, 'on', true);
          setClass(front, 'on', false);
          front = back;
        }, 60);
      } else if (p) {
        setClass(back, 'art', false);
        back.innerHTML = '';
        back.style.backgroundImage = 'url(' + Data.image(p.backdrop, 'original') + ')';
        back.style.webkitTransform = back.style.transform = 'scale(1.0)';
        clock.lastChild.textContent = p.title;
        setTimeout(function () {
          setClass(back, 'on', true);
          setClass(front, 'on', false);
          back.style.webkitTransform = back.style.transform = 'scale(1.08) translateX(-1.5%)';
          front = back;
        }, 60);
      }
      tickSaverClock(clock);
      if (!art) paintBoard(notice);
      // A painting stays up long enough to look at; photos keep moving.
      saverTimer = setTimeout(next, art ? 60000 : 12000);
    }
    setClass(s, 'on', true);
    next();
  }

  function tickSaverClock(clock) {
    var d = new Date();
    clock.firstChild.textContent = Data.time(d.getTime()).replace(/ (AM|PM)$/, '');
    try {
      clock.children[1].textContent = d.toLocaleDateString(I18N.locale(), {weekday: 'long', day: 'numeric', month: 'long'});
    } catch (e) {
      clock.children[1].textContent = d.toDateString();
    }
  }

  var lastBoard = '';

  /**
   * The house noticeboard beside the clock: today's family calendar, birthdays, tea and recent notes, when the
   * household switched it on in Beyond Family. Built again only when it changed, so it doesn't flicker every photo.
   */
  function paintBoard(box) {
    var b = window.Family && Family.board ? Family.board() : null;
    var empty = !b || !((b.events && b.events.length) || (b.birthdays && b.birthdays.length) || b.tea || (b.notes && b.notes.length));
    var sig = empty ? '' : JSON.stringify(b) + I18N.locale();
    setClass(box, 'on', !empty);
    if (sig === lastBoard && box.firstChild) return;
    lastBoard = sig;
    box.innerHTML = '';
    if (empty) return;
    el('div', 'head', box, tr('Hoje', 'Today', 'Hoy'));
    for (var i = 0; i < (b.birthdays || []).length; i++) {
      el('div', 'bday', box, '🎂 ' + tr('Feliz aniversário, ', 'Happy birthday, ', '¡Feliz cumpleaños, ') + b.birthdays[i] + '!');
    }
    var events = b.events || [];
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      var row = el('div', 'row', box);
      el('span', 'when', row, ev.time ? Data.time(clockAt(ev.time)) : tr('O dia todo', 'All day', 'Todo el día'));
      var dot = el('i', 'dot', row);
      dot.style.background = ev.colour || 'rgba(255, 255, 255, 0.5)';
      var what = el('span', 'what', row, ev.title);
      var more = [ev.who, ev.where].filter(function (x) { return x; }).join(' · ');
      if (more) el('span', 'more', what, '  ' + more);
    }
    if (b.tea) {
      var tea = el('div', 'tea', box);
      el('b', '', tea, tr('Jantar', 'Tea', 'Cena') + ' ');
      tea.appendChild(document.createTextNode(b.tea));
    }
    var notes = b.notes || [];
    for (var n = 0; n < notes.length; n++) {
      var note = el('div', 'note', box);
      el('b', '', note, notes[n].from + ' ');
      note.appendChild(document.createTextNode(notes[n].text));
    }
  }

  /** "15:30" today, as a time the clock words can say in the TV's own style. */
  function clockAt(hm) {
    var d = new Date();
    d.setHours(+hm.slice(0, 2), +hm.slice(3, 5), 0, 0);
    return d.getTime();
  }

  var saverAt = 0, ASK_AGAIN_AFTER = 20 * 60000;

  function hideSaver() {
    if (saverOn && Date.now() - saverAt > ASK_AGAIN_AFTER && Profiles.count() > 1) setTimeout(function () { Profiles.pick(false, profileChosen); }, 300);
    saverOn = false;
    clearTimeout(saverTimer);
    setClass($('saver'), 'on', false);
  }

  function poke() {
    idleAt = Date.now();
    if (saverOn) { hideSaver(); return true; }
    return false;
  }

  // MARK: - Keys

  /** One key, from the remote in the hand or the one on a phone (Beyond Family). True if it was used. */
  function key(k) {
    if (poke()) return true;   // the first press only wakes the screen
    if (!UI.active() && Outside.back()) return true;   // back from outside on a fine day: welcome them
    if (Family.alertKey(k)) return true;   // a family message waits for OK
    if (Family.togetherKey(k)) return true;   // OK on a watch-together countdown opens the app
    if (UI.active()) {
      if (k >= 37 && k <= 40 || k === TV.keys.ok || k === TV.keys.back || k === 27 || k === 8 || k >= 48 && k <= 57 || k >= 65 && k <= 90 || k === 32) {
        UI.key(k);
        return true;
      }
      return false;
    }
    if (k === TV.keys.left) move(-1, 0);
    else if (k === TV.keys.right) move(1, 0);
    else if (k === TV.keys.up) move(0, -1);
    else if (k === TV.keys.down) move(0, 1);
    else if (k === TV.keys.ok) activate();
    else if (k === TV.keys.back || k === 27 || k === 8) back();
    else return false;
    return true;
  }

  document.addEventListener('keydown', function (e) {
    if (key(TV.code(e.keyCode))) e.preventDefault();
  });

  /** Opens a shelf app by its key ("netflix", "plex"), for Beyond Family's remote. False if this TV hasn't got it. */
  function openShelf(name) {
    for (var i = 0; i < apps.length; i++) {
      var s = shelfKey(apps[i]);
      if (s && s[0] === name) { launcher(apps[i].id, apps[i].title)(); return true; }
    }
    return false;
  }

  /** The names of the apps to watch things on: the shelf, then every known service on this TV. For Ask Beyond. */
  function watchApps() {
    var out = [], i;
    function add(a) { if (a && a.title && out.indexOf(a.title) < 0) out.push(a.title); }
    for (i = 0; i < shelf.length; i++) add(shelf[i]);
    // A kid's answer only ever points at a kid's own shelf.
    if (!Profiles.kid()) for (i = 0; i < apps.length; i++) if (shelfKey(apps[i])) add(apps[i]);
    return out.slice(0, 40);
  }

  /** Opens an app by the name Ask Beyond was given. False when it isn't on this TV. */
  function openApp(title) {
    var t = String(title || '').toLowerCase();
    for (var i = 0; i < apps.length; i++) if (apps[i].title.toLowerCase() === t) { launcher(apps[i].id, apps[i].title)(); return true; }
    return false;
  }

  document.addEventListener('mousemove', function () { poke(); });

  // MARK: - Start

  /** Talk to Beyond: say what would make it better; if Beyond answers, it shows here (Checkin.hear). */
  function talkToBeyond() {
    UI.open({cls: 'bt-talk', build: function (layer, api) {
      layer = UI.el('div', 'bt-box', layer);
      UI.heading(layer, tr('Fale com a Beyond', 'Talk to Beyond', 'Habla con Beyond'),
        tr('O que deixaria o Beyond™ TV melhor? A gente lê tudo.', 'What would make Beyond™ TV better? We read every one.',
          '¿Qué haría mejor Beyond™ TV? Leemos todo.'));
      var sent = false;
      UI.keyboard(layer, api, {max: 300, placeholder: tr('Escreva aqui', 'Type it here', 'Escríbelo aquí'),
        spaceLabel: tr('Espaço', 'Space', 'Espacio'), doneLabel: tr('Enviar', 'Send', 'Enviar'),
        done: function (text) {
          if (sent || !text) return;
          sent = true;
          Checkin.feedback(text, function (ok) {
            sent = false;
            if (!ok) { UI.toast(tr('Não foi agora. Confira a internet e tente de novo.', "That didn't go. Check the internet and try again.", 'No se envió. Revisa internet e inténtalo de nuevo.')); return; }
            api.close();
            UI.toast(tr('Obrigado! Se a gente responder, aparece aqui na sua TV.', 'Thank you! If we reply, it shows up here on your TV.', '¡Gracias! Si respondemos, aparece aquí en tu TV.'));
          });
        }});
    }});
  }

  // MARK: - Earn your screen

  /** A kid with jobs still to do today (Beyond Family's Earn your screen): show what's left, open nothing. */
  function jobsFirst() {
    var me = Profiles.current();
    if (!me.kid || !me.jobs || !me.jobs.length) return false;
    UI.open({cls: 'bt-jobs', build: function (layer, api) {
      var left = Profiles.current().jobs || [];
      layer = UI.el('div', 'bt-box', layer);
      UI.heading(layer, tr('Primeiro as tarefas', 'Jobs first, then screens', 'Primero las tareas'),
        left.length === 1 ? tr('Só falta uma! Marque no Beyond Family e a TV abre sozinha.', "Just one to go! Tick it off in Beyond Family and the TV opens by itself.", '¡Solo falta una! Márcala en Beyond Family y el TV se abre solo.')
          : tr('Faltam ', '', 'Faltan ') + left.length + tr('. Marque no Beyond Family e a TV abre sozinha.', ' to go. Tick them off in Beyond Family and the TV opens by itself.', '. Márcalas en Beyond Family y el TV se abre solo.'));
      var list = UI.el('div', 'bt-jobs-list', layer);
      for (var i = 0; i < left.length; i++) UI.el('div', 'bt-job', list, left[i]);
      api.add(UI.button(UI.el('div', 'bt-jobs-foot', layer), tr('Combinado', 'On it', 'Vale'), 'check', 'primary'), function () { api.close(); });
    }});
    return true;
  }

  var hadJobs = false;

  /** The last job ticked: say so, and put the list away if it's open. */
  function jobsChanged() {
    var me = Profiles.current(), now = !!(me.kid && me.jobs && me.jobs.length);
    var top = UI.top();
    if (top && document.querySelector('.layer.bt-jobs')) { if (now) top.rebuild(); else top.close(); }
    if (hadJobs && !now) toast(tr('Tudo feito! As telas estão abertas.', 'All done! Screens are open.', '¡Todo listo! Las pantallas están abiertas.'));
    hadJobs = now;
  }

  /** Someone else is watching now: their shelf, their picks, their name. */
  function makeItYours() {
    Profiles.setOwn('offered', true);
    MyWorld.open(function () { profileChosen(); });
  }

  function profileChosen() {
    // A kid who hasn't made it theirs yet is asked once, the first time they pick their face.
    var me = Profiles.current();
    if (me.kid && !me.look && !me.offered) setTimeout(makeItYours, 450);
    else if (me.kid) setTimeout(Pets.ask, 600);   // and have the pets been fed today?
    pickShelf();
    cards = [];
    st.zone = Z.SHELF;
    st.shelf = 0;
    renderAll();
  }

  function renderAll() {
    renderTop();
    renderQuotes();
    cards = [];
    renderCards();
    renderShelf();
    renderDrawer();
    renderClock();
    renderTonight();
    paintWorld();
    if (st.zone === Z.SETTINGS) renderSettings();
    updateFocus();
  }

  /** The family's music turned up (or went away): Music joins the shelf, and the first time the TV says so. */
  function musicChanged() {
    var first = Music.firstTime(), chosen = Prefs.shelf(), name = shelfName(Music.app);
    if (first && chosen && chosen.indexOf(name) < 0) Prefs.set('shelf', chosen.slice(0, 2).concat([name], chosen.slice(2)));
    loadApps(function () { renderShelf(); renderDrawer(); updateFocus(); });
    if (first) toast(tr('Achamos a sua música. Está nos apps da tela inicial.', "Found your music. It's on the home screen now, with your apps.",
      'Encontramos tu música. Está con tus apps en la pantalla de inicio.'));
  }

  function loadApps(done) {
    TV.apps(function (list) {
      apps = window.Music && Music.found() ? [Music.app].concat(list) : list;
      Data.setApps(apps);
      pickShelf();
      TV.inputs(function (list2) {
        inputs = list2;
        if (done) done();
      });
    });
  }

  /** Back to the home screen (the app was opened again): the shelf, everything closed, the first tab. */
  function reset() {
    hideSaver();
    closeSheets();
    st.zone = Z.SHELF;
    st.shelf = 0;
    st.tab = 0;
    kinds = [];
    renderTop();
    cards = [];
    renderCards();
    renderTonight();
    updateFocus();
  }

  Data.onChange(function () {
    if (tabKinds().join() !== kinds.join()) renderTop();
    renderQuotes();
    renderCards();
    renderPanels();
    renderClock();
    renderTonight();
    checkNight();
  });

  function reopened() {
    // LG: with handlesRelaunch the app has to come to the front itself, or opening it again while it runs shows nothing.
    if (window.PalmSystem && window.PalmSystem.activate) window.PalmSystem.activate();
    reset();
    loadApps(function () { renderShelf(); renderDrawer(); Data.refresh(); });
  }

  window.addEventListener('resize', fit);
  document.addEventListener('webOSRelaunch', reopened);   // LG: opened again while running
  window.addEventListener('appcontrol', reopened);        // Samsung: the same
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hideSaver(); hiddenAt = Date.now(); return; }
    // Away for hours (the TV was off, most likely): ask who's watching again, as at switch-on.
    var longAway = hiddenAt && Date.now() - hiddenAt > 2 * 3600000;
    hiddenAt = 0;
    if (longAway) Chime.play();
    if (longAway && Profiles.count() > 1) setTimeout(function () { Profiles.pick(false, profileChosen); }, 300);
    idleAt = Date.now();
    // Back from an app: what was just opened leads Keep watching.
    st.tab = 0;
    kinds = [];
    renderTop();
    cards = [];
    renderCards();
    Family.now();
    loadApps(function () { renderShelf(); renderDrawer(); updateFocus(); Data.refresh(); });
    // Back from a show: on a fine day, suggest going outside (once a day). Or welcome back those who did.
    setTimeout(function () {
      if (document.hidden || Outside.back() || Outside.maybeNudge()) return;
      // Or, for a kid, now and then a good show to watch next instead.
      KidPicks.maybeNudge(function (id, title) { launcher(id, title)(); });
    }, 4000);
  });

  I18N.set(Prefs.language());
  fit();
  renderTop();
  Chime.play();   // hello
  loadApps(function () {
    renderAll();
    Data.refresh();
    if (Profiles.count() > 1) Profiles.pick(false, profileChosen);
  });
  Checkin.start();
  if (window.HomeHub) HomeHub.start(homeChanged);
  if (window.Music) Music.start(musicChanged);
  // Beyond's answers to this TV's feedback, if it ever gave any: when the home screen opens, then now and then.
  function hearBeyond() { Checkin.hear(function (text) { toast('Beyond: ' + text); }); }
  hearBeyond();
  setInterval(hearBeyond, 10 * 60 * 1000 + 5000);
  Profiles.onChange(function () { renderTop(); paintWorld(); renderCards(); renderTonight(); updateFocus(); jobsChanged(); });
  setInterval(function () {
    renderClock();
    renderTonight();
    checkNight();
    Data.refresh();
    if (!saverOn && !sheetOpen() && !UI.active() && Date.now() - idleAt > Prefs.saverAfter() * 60000) showSaver();
    if (saverOn) tickSaverClock($('saver').querySelector('.clock'));
  }, 15000);

  // For the browser preview and tests.
  camTimer = setInterval(tickCameras, 5000);

  window.BeyondTV = {state: st, tiles: function () { renderTop(); renderCards(); }, move: move, activate: activate, back: back, showSaver: showSaver, hideSaver: hideSaver, toast: toast,
    refresh: profileChosen, apps: function () { return apps; }, launch: function (id, name) { launcher(id, name)(); },
    key: key, home: reset, openShelf: openShelf, watchApps: watchApps, openApp: openApp, talk: talkToBeyond, renderNotes: renderNotes,
    notes: function () { renderTop(); renderTonight(); updateFocus(); }};
})();
