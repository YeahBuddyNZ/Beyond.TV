/*
 * Live TV (ADR 0042): the Live TV button opens one screen of free channels, so a family that drops Sky still has the
 * news and the NZ channels from the remote. Rows, each only with what this TV has:
 *  - New Zealand: the TV's own aerial, then the Freeview, TVNZ+ and ThreeNow apps (opened, never played here);
 *  - World news: 24/7 news channels that stream free on YouTube, played full screen right here in YouTube's own player,
 *    ads and all; up and down change channel like a real TV;
 *  - More free channels: Plex's free channels, Samsung TV Plus, LG Channels (their apps);
 *  - Paid extras: Sky Sport Now and Neon, when they're installed.
 * Kids get the New Zealand row only. The news list lives on our website (docs/live/channels.json), with this copy
 * for when it can't be read. Never a channel somebody had no right to share: only a channel's own official stream.
 * Same as LiveTvActivity.java: change one, change both. Plain ES5.
 */
var LiveTV = (function () {
  'use strict';

  var LIST_URL = 'https://yeahbuddynz.github.io/Beyond.TV/live/channels.json';
  var KEY = 'bt.live';

  /** Each channel's own YouTube channel, which streams the news live around the clock. */
  var NEWS = [
    {id: 'abc-au', name: 'ABC News', from: 'Australia', youtube: 'UCVgO39Bk5sMo66-6o6Spn6Q'},
    {id: 'sky-news', name: 'Sky News', from: 'UK', youtube: 'UCoMdktPbSTixAyNGwb-UYkQ'},
    {id: 'aljazeera', name: 'Al Jazeera', from: 'Qatar', youtube: 'UCNye-wNBqNL5ZzHSJj3l8Bg'},
    {id: 'dw', name: 'DW News', from: 'Germany', youtube: 'UCknLrEdhRCp1aegoMqRaCZg'},
    {id: 'france24', name: 'France 24', from: 'France', youtube: 'UCQfwfsi5VrQ8yKZ-UWmAEFg'},
    {id: 'nhk', name: 'NHK World', from: 'Japan', youtube: 'UCSPEjw8F2nQDtmUKPFNF7_A'},
    {id: 'cna', name: 'CNA', from: 'Singapore', youtube: 'UC83jt4dlz1Gjl58fzQrrKZg'},
    {id: 'livenow-fox', name: 'LiveNOW from FOX', from: 'USA', youtube: 'UCJg9wBPyKMNA5sRDnvzmkdg'},
    {id: 'euronews', name: 'Euronews', from: 'Europe', youtube: 'UCSrZ3UV4jOidv8ppoVuvW9Q'},
    {id: 'bloomberg', name: 'Bloomberg', from: 'USA', youtube: 'UCIALMKvObZNtJ6AmdCLP7Lg'}
  ];

  /** Apps by what they are: [key, row, name on the button, matches the app's title or id]. */
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
    return 'https://www.youtube.com/embed/live_stream?channel=' + c.youtube + '&autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
  }

  function nz() {
    var z = TV.zone();
    return z === 'Pacific/Auckland' || z === 'Pacific/Chatham' || z === 'NZ';
  }

  var list = null;

  function load(done) {
    var kept = null;
    try { kept = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (list) { done(list); return; }
    var x = new XMLHttpRequest(), over = false;
    function finish(res) {
      if (over) return;
      over = true;
      list = pickList(res, kept);
      if (goodOf(res)) {
        try { localStorage.setItem(KEY, JSON.stringify({channels: list})); } catch (e) {}
      }
      done(list);
    }
    try {
      x.open('GET', LIST_URL);
      x.timeout = 6000;
      x.onload = x.onerror = x.ontimeout = function () {
        var res = null;
        try { res = x.status === 200 ? JSON.parse(x.responseText) : null; } catch (e) {}
        finish(res);
      };
      x.send();
    } catch (e) { finish(null); }
    setTimeout(function () { finish(null); }, 7000);
  }

  /**
   * host: {apps: [...], aerial: {id, label} or null, launch(app)}; the home screen gives what it knows about the TV.
   */
  function open(host) {
    load(function (channels) { screen(host, channels); });
  }

  function screen(host, channels) {
    var kid = window.Profiles && Profiles.kid(), rows = sources(host.apps);
    UI.open({
      cls: 'bt-live',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('TV ao vivo', 'Live TV', 'TV en vivo'),
          kid ? tr('Escolha um canal', 'Pick a channel', 'Elige un canal')
            : tr('Canais grátis, sem assinatura', 'Free channels, no subscription', 'Canales gratis, sin suscripción'));
        var first = true;
        function add(row, label, run, cls) {
          a.add(UI.button(row, label, null, cls || (first ? 'primary' : '')), run, {first: first});
          first = false;
        }
        function section(title) {
          var s = UI.el('div', 'row', box);
          UI.el('div', 'bt-label', s, title);
          return UI.el('div', 'bt-buttons', s);
        }

        // Here: the aerial and the free-to-air apps
        if (host.aerial || rows.nz.length) {
          var here = section(nz() ? tr('Nova Zelândia', 'Here in Aotearoa', 'Nueva Zelanda') : tr('Na sua TV', 'On your TV', 'En tu TV'));
          if (host.aerial) add(here, '📡  ' + tr('Antena', 'Your aerial', 'Tu antena'), function () { a.close(); host.launch(host.aerial); });
          for (var i = 0; i < rows.nz.length; i++) (function (s) {
            add(here, s.name, function () { a.close(); host.launch(s.app); });
          })(rows.nz[i]);
        }
        if (!kid) {
          var news = section(tr('Notícias do mundo, grátis', 'World news, free', 'Noticias del mundo, gratis'));
          for (var n = 0; n < channels.length; n++) (function (k) {
            add(news, channels[k].name, function () { watch(channels, k); }, 'small' + (first ? ' primary' : ''));
          })(n);
          if (rows.free.length) {
            var more = section(tr('Mais canais grátis', 'More free channels', 'Más canales gratis'));
            for (var f = 0; f < rows.free.length; f++) (function (s) {
              add(more, s.name, function () {
                a.close();
                host.launch(s.app);
                if (s.key === 'plex') UI.toast(tr('Escolha TV ao vivo no Plex', 'Pick Live TV in Plex', 'Elige TV en vivo en Plex'));
              });
            })(rows.free[f]);
          }
          if (rows.paid.length) {
            var paid = section(tr('Extras pagos', 'Paid extras', 'Extras de pago'));
            for (var p = 0; p < rows.paid.length; p++) (function (s) {
              add(paid, s.name, function () { a.close(); host.launch(s.app); });
            })(rows.paid[p]);
          }
          if (nz()) {
            var help = UI.el('div', 'bt-buttons help', box);
            add(help, tr('Quais canais eu tenho?', 'Which channels can I get?', '¿Qué canales tengo?'), explain, 'quiet');
          }
        }
        if (!host.aerial && !rows.nz.length && kid) UI.el('div', 'bt-sub', box,
          tr('Peça a um adulto para instalar o Freeview.', 'Ask a grown-up to add the Freeview app.', 'Pide a un adulto que instale Freeview.'));
        else if (!rows.nz.length && nz()) UI.el('div', 'bt-sub tip', box, tr(
          'Sem antena? O app Freeview Streaming TV tem os canais grátis da Nova Zelândia.',
          'No aerial? The Freeview Streaming TV app has every free NZ channel. Find it in the TV\'s app store.',
          '¿Sin antena? La app Freeview Streaming TV tiene los canales gratis de Nueva Zelanda.'));
      }
    });
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
            tr('Notícias 24 horas: ', 'News around the clock: ', 'Noticias las 24 horas: ') + 'ABC News, Sky News, Al Jazeera, DW, LiveNOW from FOX ' + tr('e mais', 'and more', 'y más')],
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

  /** A news channel full screen in YouTube's own player. Up and down change channel; Back goes back to the list. */
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

  return {open: open, rules: {pickList: pickList, sources: sources, step: step, embedUrl: embedUrl, NEWS: NEWS}};
})();

if (typeof module !== 'undefined') module.exports = LiveTV;
