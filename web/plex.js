/*
 * Plex, built in: Beyond TV's own way into a Plex server, so Plex feels like part of the TV rather than another app.
 *  - Linking: a four-character code on the TV, typed at plex.tv/link on a phone (Plex's PIN sign-in). The token stays
 *    on this TV only.
 *  - The server: the first one the account owns (or was shared), tried over its local address first, then remote,
 *    then Plex's relay.
 *  - Plex Home: each Beyond TV profile can be one of the account's Plex Home users, so kids get their managed Plex
 *    user's own restrictions as well as ours.
 *  - The Plex screen: Continue Watching, Recently Added and each library, a show's episodes, and a player that plays
 *    on the TV itself (direct play when the TV can, else Plex's HLS stream) and tells the server how far you got.
 *  - Without a server in the browser preview, a demo library stands in so the screens can be seen.
 * Plain ES5, like the rest of web/.
 */
var Plex = (function () {
  'use strict';

  var KEY = 'btv.plex';
  var PRODUCT = 'Beyond TV', VERSION = '1.0';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  if (!state.client) {
    state.client = 'beyondtv-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    save();
  }

  function headers(token) {
    var h = {
      'Accept': 'application/json',
      'X-Plex-Product': PRODUCT,
      'X-Plex-Version': VERSION,
      'X-Plex-Client-Identifier': state.client,
      'X-Plex-Platform': TV.webos ? 'webOS' : TV.samsung ? 'Tizen' : 'Web',
      'X-Plex-Device': 'TV',
      'X-Plex-Device-Name': 'Beyond TV'
    };
    if (token) h['X-Plex-Token'] = token;
    return h;
  }

  /** One request; done(error, json). */
  function call(method, url, token, done, timeout) {
    var x = new XMLHttpRequest(), over = false;
    x.open(method, url, true);
    x.timeout = timeout || 12000;
    var h = headers(token);
    for (var k in h) if (h.hasOwnProperty(k)) x.setRequestHeader(k, h[k]);
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || over) return;
      over = true;
      if (x.status < 200 || x.status >= 300) { done(new Error('HTTP ' + x.status)); return; }
      var json = null;
      try { json = x.responseText ? JSON.parse(x.responseText) : {}; } catch (e) { done(e); return; }
      done(null, json);
    };
    x.ontimeout = x.onerror = function () { if (!over) { over = true; done(new Error('no connection')); } };
    x.send();
  }

  // MARK: - Linking with plex.tv/link

  var polling = 0;

  function link(done) {
    var pin = null, layerApi = null, codeNode = null, noteNode = null;
    function stop() { clearTimeout(polling); polling = 0; }
    function fresh() {
      call('POST', 'https://plex.tv/api/v2/pins?strong=false', null, function (err, res) {
        if (err || !res || !res.code) {
          if (noteNode) noteNode.textContent = tr('Não deu para falar com o Plex. Confira a internet da TV.', "Couldn't reach Plex. Check the TV's internet and try again.", 'No se pudo conectar con Plex.');
          return;
        }
        pin = res;
        if (codeNode) codeNode.textContent = res.code;
        poll();
      });
    }
    function poll() {
      if (!pin) return;
      call('GET', 'https://plex.tv/api/v2/pins/' + pin.id, null, function (err, res) {
        if (!err && res && res.authToken) {
          stop();
          state.token = res.authToken;
          state.server = null;
          save();
          if (noteNode) noteNode.textContent = tr('Ligado! Procurando seu servidor…', 'Linked! Finding your server…', '¡Listo! Buscando tu servidor…');
          findServer(function (e2) {
            if (layerApi) layerApi.close();
            if (e2) UI.toast(tr('Plex ligado, mas nenhum servidor respondeu.', 'Plex is linked, but no server answered. Is it switched on?', 'Plex enlazado, pero ningún servidor respondió.'));
            else UI.toast(tr('Plex ligado: ', 'Plex linked: ', 'Plex enlazado: ') + state.server.name);
            if (done) done(!e2);
          });
          return;
        }
        // Plex's codes last about 15 minutes; a new one after that.
        if (!err && res && res.expiresIn !== undefined && res.expiresIn <= 0) { fresh(); return; }
        polling = setTimeout(poll, 2500);
      });
    }
    UI.open({
      cls: 'bt-plexlink',
      build: function (layer, api) {
        layerApi = api;
        var box = UI.el('div', 'bt-linkbox', layer);
        UI.el('div', 'px-logo', box, 'plex');
        UI.el('div', 'bt-heading', box, tr('Ligue seu Plex', 'Link your Plex', 'Enlaza tu Plex'));
        UI.el('div', 'bt-sub', box, tr('No celular, abra', 'On your phone, go to', 'En tu teléfono, abre'));
        UI.el('div', 'bt-url', box, 'plex.tv/link');
        UI.el('div', 'bt-sub', box, tr('e digite este código', 'and type this code', 'y escribe este código'));
        codeNode = UI.el('div', 'bt-code', box, '····');
        noteNode = UI.el('div', 'bt-note', box, tr('O código fica só nesta TV.', 'Your Plex sign-in stays on this TV only.', 'Tu acceso a Plex se queda solo en esta TV.'));
        api.add(UI.button(box, tr('Cancelar', 'Cancel', 'Cancelar')), function () { api.close(); }, {first: true});
      },
      closed: function () { stop(); layerApi = null; }
    });
    fresh();
  }

  function unlink() {
    state.token = null;
    state.server = null;
    state.users = null;
    save();
  }

  // MARK: - The server

  /** Finds the first server and the address that answers from here; done(error). */
  function findServer(done) {
    call('GET', 'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1', state.token, function (err, list) {
      if (err || !list || !list.length) { done(err || new Error('no servers')); return; }
      var servers = list.filter(function (r) { return (r.provides || '').indexOf('server') >= 0; });
      servers.sort(function (a, b) { return (b.owned ? 1 : 0) - (a.owned ? 1 : 0); });
      var i = 0;
      (function next() {
        if (i >= servers.length) { done(new Error('no server answered')); return; }
        var s = servers[i++];
        var conns = (s.connections || []).slice().sort(function (a, b) {
          function rank(c) { return (c.relay ? 20 : 0) + (c.local ? 0 : 10) + (c.protocol === 'https' ? 0 : 1); }
          return rank(a) - rank(b);
        });
        var j = 0;
        (function tryConn() {
          if (j >= conns.length) { next(); return; }
          var c = conns[j++], token = s.accessToken || state.token;
          call('GET', c.uri + '/identity', token, function (e) {
            if (e) { tryConn(); return; }
            state.server = {name: s.name, uri: c.uri, token: token, id: s.clientIdentifier};
            save();
            done(null);
          }, 5000);
        })();
      })();
    });
  }

  // MARK: - Plex Home users, one per Beyond TV profile

  function homeUsers(done) {
    call('GET', 'https://plex.tv/api/v2/home/users', state.token, function (err, res) {
      var users = err ? [] : (res && res.users) || res || [];
      done(users.map ? users : []);
    });
  }

  /** The token to use for the current profile: its Plex Home user's, when one is picked. */
  function tokenNow(done) {
    var pu = window.Profiles && Profiles.own('plexUser');
    if (!pu || !pu.token) { done(state.server ? state.server.token : state.token); return; }
    done(pu.serverToken || pu.token);
  }

  /** Picks the Plex Home user for the current profile (with that user's own Plex PIN when it has one). */
  function chooseUser() {
    if (!state.token) { link(); return; }
    homeUsers(function (users) {
      if (!users.length) { UI.toast(tr('Esta conta não tem Plex Home.', "This Plex account has no Plex Home users.", 'Esta cuenta no tiene Plex Home.')); return; }
      UI.open({
        cls: 'bt-who',
        build: function (layer, api) {
          var head = UI.el('div', 'bt-who-head', layer);
          UI.dots(head);
          UI.el('span', '', head, tr('Plex de ', 'Plex user for ', 'Plex de ') + Profiles.current().name);
          var row = UI.el('div', 'bt-faces', layer), n = users.length, size = 170, gap = 52;
          var left = (1920 - (n * size + (n - 1) * gap)) / 2;
          for (var i = 0; i < n; i++) {
            (function (u, i) {
              var f = UI.el('div', 'bt-face', row);
              f.style.left = (left + i * (size + gap)) + 'px';
              f.style.width = size + 'px';
              var a = UI.avatar({name: u.title || u.username || '?', colour: Profiles.COLOURS[i % Profiles.COLOURS.length], kid: u.restricted}, f, size);
              if (u.thumb) { a.style.backgroundImage = 'url(' + u.thumb + ')'; a.style.backgroundSize = 'cover'; a.firstChild.style.visibility = 'hidden'; }
              UI.el('div', 'name', f, u.title || u.username);
              api.add(f, function () { switchTo(u, api); }, {first: i === 0});
            })(users[i], i);
          }
        }
      });
    });
  }

  function switchTo(u, api) {
    function go(pin) {
      call('POST', 'https://plex.tv/api/v2/home/users/' + u.uuid + '/switch' + (pin ? '?pin=' + encodeURIComponent(pin) : ''), state.token, function (err, res) {
        if (err || !res || !res.authToken) { UI.toast(tr('O Plex recusou. PIN certo?', 'Plex said no. Was the PIN right?', 'Plex no aceptó. ¿PIN correcto?')); return; }
        // The server wants the user's own access token for that server, found the same way as the owner's.
        call('GET', 'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1', res.authToken, function (e2, list) {
          var serverToken = res.authToken;
          for (var i = 0; !e2 && list && i < list.length; i++) if (state.server && list[i].clientIdentifier === state.server.id && list[i].accessToken) serverToken = list[i].accessToken;
          Profiles.setOwn('plexUser', {uuid: u.uuid, name: u.title || u.username, token: res.authToken, serverToken: serverToken});
          api.close();
          UI.toast(Profiles.current().name + tr(' agora assiste como ', ' now watches Plex as ', ' ahora ve Plex como ') + (u.title || u.username));
        });
      });
    }
    if (u.protected) {
      // Plex Home PINs are the user's own, typed on the same pad as ours.
      var typed = '';
      UI.open({
        cls: 'bt-pin',
        build: function (layer, api2) {
          var box = UI.el('div', 'bt-box', layer);
          UI.heading(box, u.title || u.username, tr('PIN do Plex', 'Their Plex PIN', 'PIN de Plex'));
          var dots = UI.el('div', 'bt-pindots', box);
          function paint() { dots.innerHTML = ''; for (var i = 0; i < 4; i++) UI.el('span', i < typed.length ? 'on' : '', dots); }
          paint();
          var pad = UI.el('div', 'bt-pad', box), keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
          for (var i = 0; i < keys.length; i++) {
            (function (k, i) {
              var b = UI.el('div', 'bt-padkey' + (k ? '' : ' blank'), pad, k);
              b.style.left = (i % 3) * 132 + 'px';
              b.style.top = Math.floor(i / 3) * 112 + 'px';
              if (!k) return;
              api2.add(b, function () {
                if (k === '⌫') typed = typed.slice(0, -1); else if (typed.length < 4) typed += k;
                paint();
                if (typed.length === 4) { api2.close(); go(typed); }
              }, {first: k === '5'});
            })(keys[i], i);
          }
        }
      });
    } else go(null);
  }

  // MARK: - Library

  var DEMO_ITEMS = [
    {ratingKey: 'd1', type: 'movie', title: 'Big Buck Bunny', year: 2008, duration: 596000, viewOffset: 230000, colour: '#E8A33D', summary: 'A giant rabbit takes on three bullies of the forest. A Blender open movie.'},
    {ratingKey: 'd2', type: 'episode', title: 'The Long Walk Home', grandparentTitle: 'Coastline', parentIndex: 1, index: 3, duration: 2700000, viewOffset: 1300000, colour: '#378ADD', summary: 'The crew follow the tide line from Raglan to Kawhia.'},
    {ratingKey: 'd3', type: 'movie', title: 'Sintel', year: 2010, duration: 888000, viewOffset: 0, colour: '#D85A30', summary: 'A girl searches for the baby dragon she raised. A Blender open movie.'},
    {ratingKey: 'd4', type: 'movie', title: 'Tears of Steel', year: 2012, duration: 734000, colour: '#55534B', summary: 'Scientists in Amsterdam try to save the world from robots. A Blender open movie.'},
    {ratingKey: 'd5', type: 'movie', title: 'Elephants Dream', year: 2006, duration: 654000, colour: '#7A4FD0', summary: 'Two people explore a strange machine world. The first Blender open movie.'},
    {ratingKey: 'd6', type: 'show', title: 'Coastline', year: 2024, leafCount: 8, colour: '#2A9DA8', summary: 'A slow journey around the edge of Aotearoa.'},
    {ratingKey: 'd7', type: 'movie', title: 'Spring', year: 2019, duration: 464000, colour: '#2F7D6D', summary: 'A shepherd girl and her dog face ancient spirits. A Blender open movie.'},
    {ratingKey: 'd8', type: 'movie', title: 'Cosmos Laundromat', year: 2015, duration: 732000, colour: '#D6589A', summary: 'A suicidal sheep meets a salesman who offers him the chance of a lifetime.'},
    {ratingKey: 'd9', type: 'show', title: 'Backyard Builds', year: 2025, leafCount: 12, colour: '#E8A33D', summary: 'Weekend projects for the whole whānau.'},
    {ratingKey: 'd10', type: 'movie', title: 'Agent 327', year: 2017, duration: 230000, colour: '#378ADD', summary: 'Agent 327 goes undercover in a barbershop.'}
  ];

  function demo() { return !state.token && TV.browser; }

  /** GET a path on the server as the current profile; done(list of Metadata). */
  function server(path, done) {
    if (demo()) { setTimeout(function () { done(demoFor(path)); }, 120); return; }
    if (!state.server) { done([]); return; }
    tokenNow(function (token) {
      call('GET', state.server.uri + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'X-Plex-Container-Size=40&X-Plex-Container-Start=0', token, function (err, res) {
        var mc = !err && res && res.MediaContainer;
        done(mc ? (mc.Metadata || mc.Directory || []) : []);
      });
    });
  }

  function demoFor(path) {
    var kids = window.Profiles && Profiles.gentle();
    var all = DEMO_ITEMS.filter(function (x) { return !kids || x.ratingKey === 'd1' || x.ratingKey === 'd7' || x.ratingKey === 'd9'; });
    if (path.indexOf('onDeck') >= 0) return all.filter(function (x) { return x.viewOffset; });
    if (path.indexOf('recentlyAdded') >= 0) return all.slice().reverse();
    if (path === '/library/sections') return [{key: 'm', title: tr('Filmes', 'Movies', 'Películas'), type: 'movie'}, {key: 's', title: tr('Séries', 'TV Shows', 'Series'), type: 'show'}];
    if (path.indexOf('/library/sections/m') === 0) return all.filter(function (x) { return x.type === 'movie'; });
    if (path.indexOf('/library/sections/s') === 0) return all.filter(function (x) { return x.type === 'show'; });
    if (path.indexOf('/children') > 0) {
      var eps = [];
      for (var i = 1; i <= 6; i++) eps.push({ratingKey: 'e' + i, type: 'episode', title: tr('Episódio ', 'Episode ', 'Episodio ') + i, index: i, parentIndex: 1, grandparentTitle: 'Coastline', duration: 2700000, viewOffset: i === 3 ? 1300000 : 0, viewCount: i < 3 ? 1 : 0, colour: '#2A9DA8'});
      return eps;
    }
    return [];
  }

  function image(item, w, h, field) {
    var path = item[field || 'thumb'] || item.grandparentThumb || item.thumb;
    if (!path || demo() || !state.server) return '';
    return state.server.uri + '/photo/:/transcode?width=' + w + '&height=' + h + '&minSize=1&upscale=1&url='
        + encodeURIComponent(path) + '&X-Plex-Token=' + encodeURIComponent(currentToken());
  }

  var cachedToken = '';
  function currentToken() { return cachedToken || (state.server && state.server.token) || ''; }

  // MARK: - The Plex screen

  function minutes(ms) {
    var m = Math.round(ms / 60000);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '');
  }

  function label(item) {
    if (item.type === 'episode') return (item.grandparentTitle ? item.grandparentTitle + ' · ' : '') + 'S' + (item.parentIndex || 1) + ' E' + (item.index || 1);
    if (item.type === 'show') return (item.year ? item.year + ' · ' : '') + (item.leafCount ? item.leafCount + tr(' episódios', ' episodes', ' episodios') : '');
    return (item.year ? item.year + ' · ' : '') + (item.duration ? minutes(item.duration) : '');
  }

  /** A card: a landscape still (wide) or a poster, its picture or the item's colour and name when there's none. */
  function card(parent, item, wide) {
    var c = UI.el('div', 'px-card' + (wide ? ' wide' : ''), parent);
    var art = UI.el('div', 'px-art', c);
    var url = wide ? image(item, 640, 360, item.type === 'episode' ? 'thumb' : 'art') : image(item, 300, 450);
    if (url) art.style.backgroundImage = 'url(' + url + ')';
    else {
      var col = item.colour || '#2F7D6D';
      art.style.background = '-webkit-linear-gradient(-50deg, ' + col + ', #121210)';
      art.style.background = 'linear-gradient(140deg, ' + col + ', #121210)';
      UI.el('div', 'px-art-title', art, item.type === 'episode' ? (item.grandparentTitle || item.title) : item.title);
    }
    if (item.viewOffset && item.duration) {
      UI.setClass(art, 'has-progress', true);
      var bar = UI.el('div', 'px-progress', art);
      UI.el('i', '', bar).style.width = Math.min(100, Math.round(item.viewOffset / item.duration * 100)) + '%';
    }
    if (item.viewCount && !item.viewOffset) UI.el('div', 'px-watched', art, '✓');
    UI.el('div', 'px-name', c, item.type === 'episode' && wide ? item.title : item.title);
    UI.el('div', 'px-meta', c, item.viewOffset && item.duration ? minutes(item.duration - item.viewOffset) + tr(' restantes', ' left', ' restantes') : label(item));
    return c;
  }

  function open() {
    if (!state.token && !TV.browser) { link(function (ok) { if (ok) open(); }); return; }
    if (state.token && !state.server) { findServer(function (e) { if (e) UI.toast(tr('Nenhum servidor Plex respondeu.', 'No Plex server answered. Is it switched on?', 'Ningún servidor Plex respondió.')); else open(); }); return; }
    tokenNow(function (t) { cachedToken = t; });
    var rows = [];   // [{title, items, wide}]
    var hero = null;
    UI.open({
      cls: 'px-screen',
      build: function (layer, api) {
        var bg = UI.el('div', 'px-bg', layer);
        UI.el('div', 'px-shade', layer);
        var head = UI.el('div', 'px-head', layer);
        UI.dots(head);
        UI.el('span', 'px-title', head, 'Plex');
        var who = window.Profiles && Profiles.own('plexUser');
        UI.el('span', 'px-server', head, demo() ? tr('Biblioteca de demonstração', 'Demo library', 'Biblioteca de demostración')
            : (state.server ? state.server.name : '') + (who ? ' · ' + who.name : ''));
        hero = UI.el('div', 'px-hero', layer);
        var list = UI.el('div', 'px-rows', layer);
        if (!rows.length) { UI.el('div', 'px-loading', list, tr('Carregando…', 'Loading your library…', 'Cargando…')); return; }
        var top = 0;
        for (var r = 0; r < rows.length; r++) {
          var row = rows[r];
          if (!row.items.length) continue;
          var block = UI.el('div', 'px-row', list);
          block.style.top = top + 'px';
          UI.el('div', 'px-rowtitle', block, row.title);
          var track = UI.el('div', 'px-track', block);
          for (var i = 0; i < row.items.length; i++) {
            (function (item, first) {
              var c = card(track, item, row.wide);
              c.style.left = (i * (row.wide ? 452 : 236)) + 'px';
              c._item = item;
              api.add(c, function () { activate(item); }, {first: first});
            })(row.items[i], r === 0 && i === 0);
          }
          top += row.wide ? 400 : 470;
        }
        if (!top) UI.el('div', 'px-loading', list, tr('Nada aqui ainda.', 'Nothing here yet. Add something to Plex and it shows up here.', 'Nada aquí todavía.'));
        bg._set = function (item) {
          var url = image(item, 1280, 720, 'art');
          bg.style.backgroundImage = url ? 'url(' + url + ')' : '';
          bg.style.backgroundColor = url ? '' : (item.colour || '#121210');
        };
      },
      focused: function (node) {
        var item = node._item;
        if (!item) return;
        // Keep the focused card in view: its row slides left, the rows slide up.
        var track = node.parentNode, row = track.parentNode, rows = row.parentNode;
        var x = parseFloat(node.style.left) || 0;
        var shift = Math.max(0, x - (node.offsetWidth > 300 ? 452 : 472));
        track.style.webkitTransform = track.style.transform = 'translateX(' + (-shift) + 'px)';
        var y = parseFloat(row.style.top) || 0;
        rows.style.webkitTransform = rows.style.transform = 'translateY(' + (-y) + 'px)';
        // Rows scrolled past fade away, so they never sit over the title and the hero.
        for (var r = 0; r < rows.children.length; r++) UI.setClass(rows.children[r], 'gone', (parseFloat(rows.children[r].style.top) || 0) < y);
        hero.innerHTML = '';
        UI.el('div', 'px-hero-title', hero, item.type === 'episode' ? (item.grandparentTitle || item.title) : item.title);
        UI.el('div', 'px-hero-meta', hero, item.type === 'episode' ? label(item) + ' · ' + item.title : label(item));
        if (item.summary) UI.el('div', 'px-hero-sum', hero, item.summary);
        var bg = rows.parentNode.querySelector('.px-bg');
        if (bg && bg._set) bg._set(item);
      }
    });
    var api = UI.top();
    var kids = window.Profiles && Profiles.gentle();
    server('/library/onDeck', function (deck) {
      server('/library/recentlyAdded', function (recent) {
        server('/library/sections', function (sections) {
          rows = [{title: tr('Continuar assistindo', 'Continue Watching', 'Seguir viendo'), items: deck, wide: true},
                  {title: tr('Adicionados recentemente', 'Recently Added', 'Añadidos recientemente'), items: recent}];
          var todo = sections.filter(function (s) { return s.type === 'movie' || s.type === 'show'; }).slice(0, 4);
          var i = 0;
          (function next() {
            if (i >= todo.length) { api.rebuild(); return; }
            var s = todo[i++];
            server('/library/sections/' + s.key + '/all?sort=addedAt:desc' + (kids ? '&contentRating=G,PG,TV-Y,TV-Y7,TV-G' : ''), function (items) {
              rows.push({title: s.title, items: items});
              next();
            });
          })();
        });
      });
    });
  }

  /** OK on a card: a show opens its episodes, anything else plays. */
  function activate(item) {
    if (item.type === 'show' || item.type === 'season') { episodes(item); return; }
    play(item);
  }

  function episodes(show) {
    var eps = [];
    function fetch(done) {
      if (show.type === 'season' || demo()) { server('/library/metadata/' + show.ratingKey + '/children', function (l) { eps = l; done(); }); return; }
      // A show's children are its seasons; all the episodes in order come from allLeaves.
      server('/library/metadata/' + show.ratingKey + '/allLeaves', function (l) { eps = l; done(); });
    }
    UI.open({
      cls: 'px-screen px-episodes',
      build: function (layer, api) {
        var head = UI.el('div', 'px-head', layer);
        UI.dots(head);
        UI.el('span', 'px-title', head, show.title);
        UI.el('span', 'px-server', head, label(show));
        var list = UI.el('div', 'px-eplist', layer);
        if (!eps.length) { UI.el('div', 'px-loading', list, tr('Carregando…', 'Loading episodes…', 'Cargando…')); return; }
        var firstUnwatched = 0;
        for (var j = 0; j < eps.length; j++) if (!eps[j].viewCount || eps[j].viewOffset) { firstUnwatched = j; break; }
        for (var i = 0; i < eps.length; i++) {
          (function (e, i) {
            var rowEl = UI.el('div', 'px-ep', list);
            rowEl.style.top = (i * 150) + 'px';
            var c = card(rowEl, e, true);
            c.style.left = '0px';
            UI.el('div', 'px-ep-title', rowEl, 'S' + (e.parentIndex || 1) + ' E' + (e.index || i + 1) + '  ' + e.title);
            UI.el('div', 'px-ep-sum', rowEl, e.summary || (e.duration ? minutes(e.duration) : ''));
            rowEl._item = e;
            api.add(rowEl, function () { play(e); }, {first: i === firstUnwatched});
          })(eps[i], i);
        }
      },
      focused: function (node) {
        var top = parseFloat(node.style.top) || 0;
        node.parentNode.style.webkitTransform = node.parentNode.style.transform = 'translateY(' + (-Math.max(0, top - 300)) + 'px)';
      }
    });
    var api = UI.top();
    fetch(function () { api.rebuild(); });
  }

  // MARK: - Playing

  function play(item) {
    if (demo()) {
      UI.toast(tr('Na demonstração isto tocaria do seu servidor Plex.', 'With your own Plex linked, this plays right here on the TV.', 'Con tu Plex enlazado, esto se reproduce aquí.'));
      return;
    }
    server('/library/metadata/' + item.ratingKey, function (full) {
      var meta = full[0] || item;
      tokenNow(function (token) { Player.start(meta, token); });
    });
  }

  /** The player: full screen video, OK to pause, ← → to skip 10 seconds, Back to stop; progress goes back to Plex. */
  var Player = {
    start: function (meta, token) {
      var media = meta.Media && meta.Media[0], part = media && media.Part && media.Part[0];
      var srv = state.server.uri, session = 'btv' + Date.now();
      var tok = '&X-Plex-Token=' + encodeURIComponent(token) + '&X-Plex-Client-Identifier=' + encodeURIComponent(state.client)
          + '&X-Plex-Product=' + encodeURIComponent(PRODUCT) + '&X-Plex-Platform=' + encodeURIComponent(TV.webos ? 'webOS' : TV.samsung ? 'Tizen' : 'Web');
      var start = meta.viewOffset ? Math.floor(meta.viewOffset / 1000) : 0;
      // Direct play when the file is something every TV browser plays (MP4 with H.264 and AAC); else Plex's HLS.
      var direct = part && media.container === 'mp4' && media.videoCodec === 'h264' && (media.audioCodec === 'aac' || media.audioCodec === 'mp3');
      var src = direct ? srv + part.key + '?' + tok.slice(1)
          : srv + '/video/:/transcode/universal/start.m3u8?path=' + encodeURIComponent('/library/metadata/' + meta.ratingKey)
            + '&mediaIndex=0&partIndex=0&protocol=hls&fastSeek=1&directPlay=0&directStream=1&directStreamAudio=1'
            + '&videoQuality=100&maxVideoBitrate=20000&subtitleSize=100&audioBoost=100&location=lan&session=' + session
            + '&offset=' + start + tok;
      var video, bar, fill, timeNode, titleNode, hud, hudTimer = 0, reportTimer = 0;
      function fmt(s) {
        s = Math.max(0, Math.floor(s));
        var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
        return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
      }
      function showHud() {
        UI.setClass(hud, 'on', true);
        clearTimeout(hudTimer);
        hudTimer = setTimeout(function () { if (!video.paused) UI.setClass(hud, 'on', false); }, 3500);
      }
      function tick() {
        var d = video.duration || (meta.duration / 1000) || 1, t = video.currentTime + (direct ? 0 : start);
        fill.style.width = Math.min(100, t / d * 100) + '%';
        timeNode.textContent = fmt(t) + ' / ' + fmt(meta.duration ? meta.duration / 1000 : d);
      }
      function report(stateName) {
        var t = Math.floor((video.currentTime + (direct ? 0 : start)) * 1000);
        call('GET', srv + '/:/timeline?ratingKey=' + meta.ratingKey + '&key=' + encodeURIComponent('/library/metadata/' + meta.ratingKey)
            + '&state=' + stateName + '&time=' + t + '&duration=' + (meta.duration || 0), token, function () {});
        if (window.Watch) Watch.playing(meta, stateName);
      }
      UI.open({
        cls: 'px-player',
        build: function (layer) {
          video = UI.el('video', 'px-video', layer);
          video.setAttribute('autoplay', '');
          video.src = src;
          if (direct && start) video.addEventListener('loadedmetadata', function () { try { video.currentTime = start; } catch (e) {} });
          video.addEventListener('timeupdate', tick);
          video.addEventListener('ended', function () { report('stopped'); UI.close(); });
          video.addEventListener('error', function () { UI.toast(tr('Este vídeo não tocou nesta TV.', "This one wouldn't play on this TV. Try it in the Plex app.", 'Este video no se reprodujo.')); });
          hud = UI.el('div', 'px-hud on', layer);
          titleNode = UI.el('div', 'px-hud-title', hud, meta.type === 'episode' ? meta.grandparentTitle + ' · ' + label(meta) : meta.title);
          UI.el('div', 'px-hud-sub', hud, meta.type === 'episode' ? meta.title : label(meta));
          bar = UI.el('div', 'px-hud-bar', hud);
          fill = UI.el('i', '', bar);
          timeNode = UI.el('div', 'px-hud-time', hud, '');
          showHud();
          reportTimer = setInterval(function () { report(video.paused ? 'paused' : 'playing'); }, 10000);
        },
        key: function (k) {
          showHud();
          if (k === TV.keys.ok || k === 415 || k === 19 || k === 10252 || k === 32) {
            if (video.paused) video.play(); else video.pause();
            report(video.paused ? 'paused' : 'playing');
            return true;
          }
          if (k === TV.keys.left || k === 412) { try { video.currentTime = Math.max(0, video.currentTime - 10); } catch (e) {} return true; }
          if (k === TV.keys.right || k === 417) { try { video.currentTime = video.currentTime + 10; } catch (e) {} return true; }
          if (k === TV.keys.up || k === TV.keys.down) return true;
          return false;
        },
        closed: function () {
          clearInterval(reportTimer);
          clearTimeout(hudTimer);
          report('stopped');
          try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) {}
        }
      });
    }
  };

  return {
    linked: function () { return !!state.token; },
    serverName: function () { return state.server ? state.server.name : ''; },
    link: link,
    unlink: unlink,
    chooseUser: chooseUser,
    open: open,
    /** Continue Watching for other screens (the home screen's "What's on"); done(items). */
    continueWatching: function (done) { if (!state.token && !TV.browser) { done([]); return; } server('/library/onDeck', done); },
    card: card,
    play: activate,
    demo: demo
  };
})();
