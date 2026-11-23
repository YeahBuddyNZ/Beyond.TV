/*
 * Live TV (ADR 0042, tiles and live videos ADR 0053): the Live TV button opens one screen of free channels, so a family
 * that drops Sky still has the news and the NZ channels from the remote. Rows of logo tiles, each only with what this
 * TV has:
 *  - New Zealand: the TV's own aerial, then the Freeview, TVNZ+ and ThreeNow apps (opened, never played here);
 *  - Featured, World news, and Weather, space and music: channels that stream free on YouTube around the clock, played
 *    full screen right here in YouTube's own player, ads and all; up and down change channel like a real TV;
 *  - More free channels: Plex's free channels, Samsung TV Plus, LG Channels (their apps);
 *  - Paid extras: Sky Sport Now and Neon, when they're installed.
 * Kids get the New Zealand row and the kids' channels. The list lives on our website (docs/live/channels.json), with
 * this copy for when it can't be read; now.json beside it (tools/live_now.py, every hour) says which video each channel
 * is streaming right now, so we play that video (YouTube's "live_stream?channel=" link says "Video not found" when a
 * channel runs two streams) and leave out a channel that isn't live. Never a channel somebody had no right to share:
 * only a channel's own official stream, with its own logo on its tile.
 * Same as LiveTvActivity.java: change one, change both. Plain ES5.
 */
var LiveTV = (function () {
  'use strict';

  var SITE = 'https://yeahbuddynz.github.io/Beyond.TV/live/';
  var LIST_URL = SITE + 'channels.json', NOW_URL = SITE + 'now.json';
  var KEY = 'bt.live', NOW_KEY = 'bt.live.now';
  /** How long what now.json says is trusted: a 24/7 stream keeps its video for weeks, an hourly file is never this old. */
  var NOW_FOR = 3 * 24 * 3600 * 1000;

  /** Each channel's own YouTube channel, which streams live around the clock. Same as docs/live/channels.json. */
  var NEWS = [
    {id: 'sky-news', name: 'Sky News', from: 'UK', youtube: 'UCoMdktPbSTixAyNGwb-UYkQ', group: 'featured', colour: '#FFFFFF'},
    {id: 'abc-us', name: 'ABC News Live', from: 'USA', youtube: 'UCBi2mrWuNuyYy4gbM6fU18Q', group: 'featured', colour: '#FFFFFF'},
    {id: 'nbc-now', name: 'NBC News NOW', from: 'USA', youtube: 'UCeY0bbntWzzVIaj2z3QigXg', group: 'featured', colour: '#082038'},
    {id: 'aljazeera', name: 'Al Jazeera', from: 'Qatar', youtube: 'UCNye-wNBqNL5ZzHSJj3l8Bg', group: 'featured', colour: '#A8312D'},
    {id: 'livenow-fox', name: 'LiveNOW from FOX', from: 'USA', youtube: 'UCJg9wBPyKMNA5sRDnvzmkdg', group: 'featured', colour: '#FFFFFF'},
    {id: 'abc-au', name: 'ABC News', from: 'Australia', youtube: 'UCVgO39Bk5sMo66-6o6Spn6Q', group: 'featured', colour: '#1E5AEC'},
    {id: 'cnn', name: 'CNN Headlines', from: 'USA', youtube: 'UCupvZG-5ko_eiXAupbDfxWw', group: 'news', colour: '#CC0001'},
    {id: 'dw', name: 'DW News', from: 'Germany', youtube: 'UCknLrEdhRCp1aegoMqRaCZg', group: 'news', colour: '#06A7F7'},
    {id: 'france24', name: 'France 24', from: 'France', youtube: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', group: 'news', colour: '#FFFFFF'},
    {id: 'nhk', name: 'NHK World', from: 'Japan', youtube: 'UCSPEjw8F2nQDtmUKPFNF7_A', group: 'news', colour: '#FFFFFF'},
    {id: 'cna', name: 'CNA', from: 'Singapore', youtube: 'UC83jt4dlz1Gjl58fzQrrKZg', group: 'news', colour: '#FFFFFF'},
    {id: 'euronews', name: 'Euronews', from: 'Europe', youtube: 'UCSrZ3UV4jOidv8ppoVuvW9Q', group: 'news', colour: '#0173F0'},
    {id: 'bloomberg', name: 'Bloomberg', from: 'USA', youtube: 'UCIALMKvObZNtJ6AmdCLP7Lg', group: 'news', colour: '#FFFFFF'},
    {id: 'trt', name: 'TRT World', from: 'Turkey', youtube: 'UC7fWeaHhqgM4Ry-RMpM2YYw', group: 'news', colour: '#14B5C9'},
    {id: 'wion', name: 'WION', from: 'India', youtube: 'UC_gUM8rL-Lrg6O3adPW9K1g', group: 'news', colour: '#FFFFFF'},
    {id: 'gb-news', name: 'GB News', from: 'UK', youtube: 'UC0vn8ISa4LKMunLbzaXLnOQ', group: 'news', colour: '#CFDCE4'},
    {id: 'fox-weather', name: 'FOX Weather', from: 'USA', youtube: 'UC1FbPiXx59_ltnFVx7IxWow', group: 'more', colour: '#FFFFFF'},
    {id: 'nasa', name: 'NASA', from: 'Space station', youtube: 'UCLA_DiR1FfKNvjuUpBHmylQ', group: 'more', colour: '#FFFFFF'},
    {id: 'lofi', name: 'Lofi Girl', from: 'Music', youtube: 'UCSJ4gkVC6NrvII8umztf0Ow', group: 'more', colour: '#FFFFFF'},
    {id: 'pbs-kids', name: 'PBS KIDS', from: 'Kids', youtube: 'UCrNnk0wFBnCS1awGjq_ijGQ', group: 'kids', colour: '#FFFFFF'}
  ];

  /** Apps by what they are: [key, row, name on the tile, matches the app's title or id]. */
  var APPS = [
    ['freeview', 'nz', 'Freeview', /freeview/i],
    ['tvnz', 'nz', 'TVNZ+', /tvnz/i],
    ['threenow', 'nz', 'ThreeNow', /threenow/i],
    ['plex', 'free', 'Plex', /plex|cdp-30/i],
    ['tvplus', 'free', 'Samsung TV Plus', /samsung tv plus|^tv plus$|tvplus/i],
    ['lgchannels', 'free', 'LG Channels', /lg channels|lgchannels/i],
    ['skysportnow', 'paid', 'Sky Sport Now', /sky ?sport ?now/i],
    ['neon', 'paid', 'Neon', /neon|nz\.co\.lightbox/i]
  ];

  var GROUPS = ['featured', 'news', 'more', 'kids'];

  function validChannel(c) {
    return !!(c && typeof c.name === 'string' && c.name && /^UC[A-Za-z0-9_-]{22}$/.test(c.youtube || ''));
  }

  /** The good channels in a list file ({channels: [...]}), or null when there are none. */
  function goodOf(file) {
    var l = file && file.channels, out = [];
    if (!l || !l.length) return null;
    for (var j = 0; j < l.length && out.length < 40; j++) if (validChannel(l[j])) out.push(l[j]);
    return out.length ? out : null;
  }

  /** The website's list when it's good, else the last good one kept on the TV, else ours. */
  function pickList(fromSite, kept) { return goodOf(fromSite) || goodOf(kept) || NEWS.slice(); }

  /**
   * The channels to show, each with the video it is streaming now (c.video) when now.json is recent. A channel
   * now.json doesn't have is off air: left out, so nobody lands on "Video not found". Without a recent now.json,
   * every channel shows and plays by its channel id.
   */
  function onAir(channels, now, at) {
    var fresh = now && now.channels && now.at && (at - Date.parse(now.at)) < NOW_FOR && (at - Date.parse(now.at)) > -3600000;
    var out = [];
    for (var i = 0; i < channels.length; i++) {
      var c = channels[i], n = fresh ? now.channels[c.youtube] : null, copy = {};
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) copy[k] = c[k];
      if (n && /^[A-Za-z0-9_-]{11}$/.test(n.video || '')) copy.video = n.video;
      else if (fresh) continue;
      out.push(copy);
    }
    return out;
  }

  /** The channels in one row: group "news" also takes a channel with no group (older lists). */
  function inGroup(channels, group) {
    var out = [];
    for (var i = 0; i < channels.length; i++) {
      var g = GROUPS.indexOf(channels[i].group) >= 0 ? channels[i].group : 'news';
      if (g === group) out.push(channels[i]);
    }
    return out;
  }

  /** The installed apps for each row, in APPS order, each app once. */
  function sources(apps) {
    var rows = {nz: [], free: [], paid: []}, used = {};
    for (var i = 0; i < APPS.length; i++) {
      for (var j = 0; j < (apps || []).length; j++) {
        var a = apps[j];
        if (!a || used[a.id]) continue;
        if (APPS[i][3].test(a.title || '') || APPS[i][3].test(a.id || '')) {
          used[a.id] = true;
          rows[APPS[i][1]].push({key: APPS[i][0], name: APPS[i][2], app: a});
          break;
        }
      }
    }
    return rows;
  }

  /** The next channel up or down, round and round. */
  function step(i, by, n) { return n ? ((i + by) % n + n) % n : 0; }

  function embedUrl(c) {
    var opts = 'autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
    if (c.video) return 'https://www.youtube.com/embed/' + c.video + '?' + opts;
    return 'https://www.youtube.com/embed/live_stream?channel=' + c.youtube + '&' + opts;
  }

  /** The channel's own logo, kept on our website beside the list. */
  function logoUrl(c) { return /^[a-z0-9-]{1,40}$/.test(c.id || '') ? SITE + 'logos/' + c.id + '.jpg' : null; }

  function nz() {
    var z = TV.zone();
    return z === 'Pacific/Auckland' || z === 'Pacific/Chatham' || z === 'NZ';
  }

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function fetchJson(url, done) {
    var x = new XMLHttpRequest(), over = false;
    function finish(res) { if (!over) { over = true; done(res); } }
    try {
      x.open('GET', url);
      x.timeout = 5000;
      x.onload = x.onerror = x.ontimeout = function () {
        var res = null;
        try { res = x.status === 200 ? JSON.parse(x.responseText) : null; } catch (e) {}
        finish(res);
      };
      x.send();
    } catch (e) { finish(null); }
    setTimeout(function () { finish(null); }, 6000);
  }

  /** Both files at once; whatever can't be read comes from the last good copy on the TV. */
  function load(done) {
    var list = null, now = null, waiting = 2;
    function one() {
      if (--waiting) return;
      var keptList = read(KEY), keptNow = read(NOW_KEY);
      var channels = pickList(list, keptList);
      if (goodOf(list)) { try { localStorage.setItem(KEY, JSON.stringify({channels: channels})); } catch (e) {} }
      if (now && now.channels && now.at) { try { localStorage.setItem(NOW_KEY, JSON.stringify(now)); } catch (e) {} }
      done(onAir(channels, now && now.channels ? now : keptNow, Date.now()));
    }
    fetchJson(LIST_URL, function (r) { list = r; one(); });
    fetchJson(NOW_URL, function (r) { now = r; one(); });
  }

  /**
   * host: {apps: [...], aerial: {id, label} or null, launch(app)}; the home screen gives what it knows about the TV.
   */
  function open(host) {
    load(function (channels) { screen(host, channels); });
  }

  /** A tile: a picture (or the name on a colour when there is none), the name under it. */
  function tile(row, label, from, pic, colour, cls) {
    var t = UI.el('div', 'bt-live-tile ' + (cls || ''), row);
    var face = UI.el('div', 'face', t);
    face.style.background = colour || '#2C2458';
    var word = UI.el('div', 'word', face, label);
    if (pic) {
      var img = UI.el('img', '', face);
      word.style.visibility = 'hidden';
      img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); word.style.visibility = ''; };
      img.src = pic;
    }
    UI.el('div', 'name', t, label);
    if (from) UI.el('div', 'from', t, from);
    return t;
  }

  /** The channels that play right here, in row order: a kid's are the kids' ones. */
  function playableOf(channels) {
    var kid = window.Profiles && Profiles.kid(), out = kid ? inGroup(channels, 'kids') : [];
    if (!kid) for (var g = 0; g < 3; g++) out = out.concat(inGroup(channels, GROUPS[g]));
    return out;
  }

  /** What's on air from the copy kept on the TV, straight away (Find, find.js, can't wait for the website). */
  function keptNow() { return playableOf(onAir(pickList(null, read(KEY)), read(NOW_KEY), Date.now())); }

  /** One channel full screen, by its id (Find). Up and down still change channel. */
  function play(id) {
    var list = keptNow();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return watch(list, i);
    return null;
  }

  function screen(host, channels) {
    var kid = window.Profiles && Profiles.kid(), rows = sources(host.apps);
    var playable = playableOf(channels);
    var box = null, shift = 0;
    UI.open({
      cls: 'bt-live',
      build: function (layer, a) {
        box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('TV ao vivo', 'Live TV', 'TV en vivo'),
          kid ? tr('Escolha um canal', 'Pick a channel', 'Elige un canal')
            : tr('Canais grátis, sem assinatura', 'Free channels, no subscription', 'Canales gratis, sin suscripción'));
        var first = true;
        function add(node, run) {
          a.add(node, run, {first: first});
          first = false;
        }
        function section(title, cls) {
          var s = UI.el('div', 'row ' + (cls || ''), box);
          UI.el('div', 'bt-label', s, title);
          return UI.el('div', 'track', UI.el('div', 'strip', s));
        }
        function app(row, s, then) {
          add(tile(row, s.name, '', s.app.icon, '#2A2A2E', 'app'), function () { a.close(); host.launch(s.app); if (then) then(); });
        }
        function channelRow(title, list, cls) {
          if (!list.length) return;
          var row = section(title, cls);
          for (var n = 0; n < list.length; n++) (function (c) {
            add(tile(row, c.name, c.from, logoUrl(c), c.colour, cls), function () { watch(playable, playable.indexOf(c)); });
          })(list[n]);
        }

        // Here: the aerial and the free-to-air apps
        if (host.aerial || rows.nz.length) {
          var here = section(nz() ? tr('Nova Zelândia', 'Here in Aotearoa', 'Nueva Zelanda') : tr('Na sua TV', 'On your TV', 'En tu TV'));
          if (host.aerial) {
            var aerial = tile(here, tr('Antena', 'Your aerial', 'Tu antena'), '', null, '#6E3DDB', 'app aerial');
            aerial.firstChild.firstChild.innerHTML = '📡';
            aerial.firstChild.firstChild.style.visibility = '';
            add(aerial, function () { a.close(); host.launch(host.aerial); });
          }
          for (var i = 0; i < rows.nz.length; i++) app(here, rows.nz[i]);
        }
        if (kid) channelRow(tr('Para crianças', 'For kids', 'Para niños'), inGroup(channels, 'kids'), 'featured');
        else {
          channelRow(tr('Em destaque', 'Featured', 'Destacados'), inGroup(channels, 'featured'), 'featured');
          channelRow(tr('Notícias do mundo, grátis', 'World news, free', 'Noticias del mundo, gratis'), inGroup(channels, 'news'));
          channelRow(tr('Clima, espaço e música', 'Weather, space and music', 'Clima, espacio y música'), inGroup(channels, 'more'));
          if (rows.free.length) {
            var more = section(tr('Mais canais grátis', 'More free channels', 'Más canales gratis'));
            for (var f = 0; f < rows.free.length; f++) (function (s) {
              app(more, s, s.key === 'plex' ? function () { UI.toast(tr('Escolha TV ao vivo no Plex', 'Pick Live TV in Plex', 'Elige TV en vivo en Plex')); } : null);
            })(rows.free[f]);
          }
          if (rows.paid.length) {
            var paid = section(tr('Extras pagos', 'Paid extras', 'Extras de pago'));
            for (var p = 0; p < rows.paid.length; p++) app(paid, rows.paid[p]);
          }
          if (nz()) {
            var help = UI.el('div', 'bt-buttons help', box);
            add(UI.button(help, tr('Quais canais eu tenho?', 'Which channels can I get?', '¿Qué canales tengo?'), null, 'quiet'), explain);
          }
        }
        if (!host.aerial && !rows.nz.length && kid) UI.el('div', 'bt-sub', box,
          tr('Peça a um adulto para instalar o Freeview.', 'Ask a grown-up to add the Freeview app.', 'Pide a un adulto que instale Freeview.'));
        else if (!rows.nz.length && nz()) UI.el('div', 'bt-sub tip', box, tr(
          'Sem antena? O app Freeview Streaming TV tem os canais grátis da Nova Zelândia.',
          'No aerial? The Freeview Streaming TV app has every free NZ channel. Find it in the TV\'s app store.',
          '¿Sin antena? La app Freeview Streaming TV tiene los canales gratis de Nueva Zelanda.'));
      },
      // Keeps the focused tile in view: its row slides sideways, the screen slides up. Only transforms, so old TVs keep up.
      focused: function (node) {
        var track = node.parentNode;
        if (track && track.className === 'track') {
          var room = track.parentNode.offsetWidth, x = 0;
          var right = node.offsetLeft + node.offsetWidth + 60;
          if (right > room) x = room - right;
          slide(track, 'translateX(' + x + 'px)');
        }
        if (!box) return;
        var row = track && track.className === 'track' ? track.parentNode.parentNode : node;
        var top = row.offsetTop, bottom = top + row.offsetHeight;
        // The box starts 70px down the 1080 screen; keep the focused row inside it, the heading in view when it fits.
        if (70 + bottom + shift > 1050) shift = 980 - bottom;
        if (70 + top + shift < 60) shift = Math.min(0, -10 - top);
        slide(box, 'translateY(' + shift + 'px)');
      }
    });
  }

  function slide(node, t) {
    node.style.webkitTransform = t;
    node.style.transform = t;
  }

  /** The plain answer for whoever is setting the TV up. New Zealand only: the channels named are ours. */
  function explain() {
    UI.open({
      cls: 'bt-live bt-live-help',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('Quais canais eu tenho?', 'Which channels can I get?', '¿Qué canales tengo?'));
        var lines = [
          [tr('Grátis, com antena ou o app Freeview', 'Free, with an aerial or the Freeview app', 'Gratis, con antena o la app Freeview'),
            'TVNZ 1, TVNZ 2, Three, Sky Open, Whakaata Māori, DUKE, eden ' + tr('e mais', 'and more', 'y más')],
          [tr('Grátis, aqui no Beyond TV', 'Free, right here in Beyond™ TV', 'Gratis, aquí en Beyond™ TV'),
            tr('Notícias 24 horas: ', 'News around the clock: ', 'Noticias las 24 horas: ') + 'Sky News, ABC News, NBC News NOW, Al Jazeera, LiveNOW from FOX ' + tr('e mais', 'and more', 'y más')],
          [tr('Pagos, só na Sky', 'Paid, only from Sky', 'De pago, solo en Sky'),
            'Sky Sport, Fox News, History, Jones!, Living. ' + tr('Para esportes sem a caixa da Sky: Sky Sport Now.', 'For sport without a Sky box: Sky Sport Now.', 'Para deportes sin la caja de Sky: Sky Sport Now.')]
        ];
        for (var i = 0; i < lines.length; i++) {
          var l = UI.el('div', 'line', box);
          UI.el('div', 'what', l, lines[i][0]);
          UI.el('div', 'bt-sub', l, lines[i][1]);
        }
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Entendi', 'Got it', 'Entendido'), null, 'primary'), function () { a.close(); }, {first: true});
      }
    });
  }

  /** A channel full screen in YouTube's own player. Up and down change channel; Back goes back to the list. */
  function watch(channels, at) {
    var frame = null, name = null, hideAt = 0, api;
    function show(i) {
      at = i;
      var c = channels[at];
      if (frame) frame.src = embedUrl(c);
      if (name) {
        name.innerHTML = '';
        UI.el('b', '', name, c.name);
        if (c.from) UI.el('span', '', name, '  ·  ' + c.from);
        name.style.opacity = 1;
        clearTimeout(hideAt);
        hideAt = setTimeout(function () { name.style.opacity = 0; }, 4000);
      }
      if (window.Family && Family.now) Family.now('Live TV', c.name);
    }
    api = UI.open({
      cls: 'bt-karaoke-player bt-live-player',
      build: function (layer) {
        var spot = UI.el('div', 'video', layer);
        frame = UI.el('iframe', 'video', spot);
        frame.setAttribute('allow', 'autoplay; encrypted-media');
        frame.setAttribute('allowfullscreen', 'true');
        name = UI.el('div', 'channel', layer);
        UI.el('div', 'hint', layer, tr('▲ ▼ muda o canal', '▲ ▼ to change channel', '▲ ▼ cambia de canal'));
        show(at);
      },
      key: function (k) {
        if (k === TV.keys.up || k === TV.keys.right) { show(step(at, 1, channels.length)); return true; }
        if (k === TV.keys.down || k === TV.keys.left) { show(step(at, -1, channels.length)); return true; }
        if (k === TV.keys.ok) { show(at); return true; }
        return false;
      },
      closed: function () { clearTimeout(hideAt); if (frame) frame.src = 'about:blank'; }
    });
    return api;
  }

  return {open: open, channels: keptNow, play: play, rules: {pickList: pickList, onAir: onAir, inGroup: inGroup, sources: sources, step: step,
    embedUrl: embedUrl, logoUrl: logoUrl, NEWS: NEWS}};
})();

if (typeof module !== 'undefined') module.exports = LiveTV;
