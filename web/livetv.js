/*
 * Live TV (ADR 0042, tiles and live videos ADR 0053, now and next and favourites ADR 0058, channels ADR 0065).
 * Beyond™ TV Channels (ADR 0065): one numbered line-up you surf like a real TV. The Live TV button plays the channel
 * last watched, full screen, straight away; up and down (and CH+ and CH-) change channel, the number keys jump to one,
 * OK opens the guide over the picture and Back goes home. The line-up, in order, only with what this TV has:
 *  - the TV's own aerial and the Freeview, TVNZ+ and ThreeNow apps (a full screen card: OK opens the app, never played here);
 *  - NZ News, NZ Music, NZ Shows and NZ Sport: our own mix channels, made of the latest videos of official NZ YouTube
 *    channels (1News, RNZ, the artists' own channels, the All Blacks...), played one after another, picked by the clock
 *    so it feels live;
 *  - Featured, World news, and Weather, space and music: channels that stream free on YouTube around the clock;
 *  - Kids' channels; then Plex's free channels, Samsung TV Plus, LG Channels, Sky Sport Now and Neon (their apps).
 * Everything plays in YouTube's own player, ads and all. Choose channels (in the guide) turns off the ones a person
 * doesn't watch, kept on the TV for each person: surfing skips them. Kids get the aerial, the NZ apps and the kids'
 * channels. The list lives on our website (docs/live/channels.json), with this copy for when it can't be read; now.json
 * beside it (tools/live_now.py, every hour) says which video each channel is streaming right now and which videos each
 * mix plays, so we play that video and leave out a channel that isn't on. Never a channel somebody had no right to
 * share: only official channels' own videos, with their own logo on their tile.
 * Each tile says what is on now and the focused one what is on next. Holding OK on a channel in the guide pins it to
 * "Your favourites", the first row. What was last watched leads Keep watching on the home screen.
 * Same as LiveTvActivity.java: change one, change both. Plain ES5.
 */
var LiveTV = (function () {
  'use strict';

  var SITE = 'https://yeahbuddynz.github.io/Beyond.TV/live/';
  var LIST_URL = SITE + 'channels.json', NOW_URL = SITE + 'now.json';
  var KEY = 'bt.live', NOW_KEY = 'bt.live.now', FAV_KEY = 'bt.live.fav', OFF_KEY = 'bt.live.off', LAST_KEY = 'bt.live.last';
  /** Favourites each person can pin; holding OK again takes one off. */
  var MAX_FAVS = 12;
  /** How long holding OK takes to pin a channel. */
  var HOLD_MS = 650;
  /** How long after the last number key the TV goes to that channel. */
  var TYPE_MS = 1600;
  /** How long what now.json says is trusted: a 24/7 stream keeps its video for weeks, an hourly file is never this old. */
  var NOW_FOR = 3 * 24 * 3600 * 1000;
  var CHANNEL = /^UC[A-Za-z0-9_-]{22}$/, VIDEO = /^[A-Za-z0-9_-]{11}$/, SLUG = /^[a-z0-9-]{1,40}$/;

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

  /** The line-up's order: our NZ mixes, then featured, world news, the rest, kids. */
  var GROUPS = ['nz', 'featured', 'news', 'more', 'kids'];

  function isList(l) { return Object.prototype.toString.call(l) === '[object Array]'; }

  /** A live channel (its own YouTube channel) or one of our mixes (official YouTube channels it plays the videos of). */
  function validChannel(c) {
    if (!c || typeof c.name !== 'string' || !c.name) return false;
    if (CHANNEL.test(c.youtube || '')) return true;
    if (!isList(c.mix) || !SLUG.test(c.id || '')) return false;
    for (var i = 0; i < c.mix.length; i++) if (CHANNEL.test(c.mix[i] || '')) return true;
    return false;
  }

  /** The good channels in a list file ({channels: [...]}), or null when there are none. */
  function goodOf(file) {
    var l = file && file.channels, out = [];
    if (!l || !l.length) return null;
    for (var j = 0; j < l.length && out.length < 60; j++) if (validChannel(l[j])) out.push(l[j]);
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
      var c = channels[i], copy = {};
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) copy[k] = c[k];
      // A mix plays only the videos now.json lists for it: none, and it is off air.
      if (!CHANNEL.test(c.youtube || '')) {
        copy.videos = fresh && now.mixes ? videosOf(now.mixes[c.id]) : [];
        if (copy.videos.length) out.push(copy);
        continue;
      }
      var n = fresh ? now.channels[c.youtube] : null;
      if (n && /^[A-Za-z0-9_-]{11}$/.test(n.video || '')) {
        copy.video = n.video;
        if (typeof n.title === 'string' && n.title) copy.now = n.title.slice(0, 120);
        var nx = n.next, nAt = nx && typeof nx.at === 'string' ? Date.parse(nx.at) : NaN;
        if (nx && typeof nx.title === 'string' && nx.title && !isNaN(nAt)) copy.next = {title: nx.title.slice(0, 120), at: nAt};
      } else if (fresh) continue;
      out.push(copy);
    }
    return out;
  }

  /** A mix's videos from now.json: [{v, t, s}] with a good id, a title and a length (a minute to four hours), at most 60. */
  function videosOf(l) {
    var out = [];
    if (!isList(l)) return out;
    for (var i = 0; i < l.length && out.length < 60; i++) {
      var x = l[i];
      if (x && VIDEO.test(x.v || '') && typeof x.t === 'string' && typeof x.s === 'number' && x.s >= 30 && x.s <= 4 * 3600) {
        out.push({v: x.v, t: x.t.slice(0, 120), s: Math.floor(x.s)});
      }
    }
    return out;
  }

  /**
   * Where a mix is at this moment: {i: the video, start: seconds into it, title}. The videos go round one after another
   * from midnight UTC on 01/01/1970, so every TV is at the same place, as on a real channel.
   */
  function mixAt(videos, at) {
    var total = 0, i;
    for (i = 0; i < videos.length; i++) total += videos[i].s;
    if (!total) return {i: 0, start: 0, title: ''};
    var pos = Math.floor(at / 1000) % total;
    for (i = 0; i < videos.length; i++) {
      if (pos < videos[i].s) return {i: i, start: pos, title: videos[i].t};
      pos -= videos[i].s;
    }
    return {i: 0, start: 0, title: videos[0].t};
  }

  /** What's on a channel now: the live video's title, or the mix's video at this moment; empty when unknown. */
  function nowOf(c, at) {
    if (c && c.videos && c.videos.length) return mixAt(c.videos, at).title;
    return c && c.now || '';
  }

  /** What's on next, once it hasn't started yet: {title, at} or null. */
  function nextOf(c, at) { return c && c.next && c.next.at > at ? c.next : null; }

  /** One person's pinned channel ids, newest first, from the store kept on the TV ({who: [ids]}). */
  function favsOf(store, who) { return listOf(store, who, MAX_FAVS); }

  /** One person's list of ids from a store kept on the TV ({who: [ids]}): good ids only, each once, at most max. */
  function listOf(store, who, max) {
    var l = store && Object.prototype.hasOwnProperty.call(store, who) ? store[who] : null, out = [];
    if (!isList(l)) return out;
    for (var i = 0; i < l.length && out.length < max; i++) if (typeof l[i] === 'string' && /^[a-z0-9-]{1,40}$/.test(l[i]) && out.indexOf(l[i]) < 0) out.push(l[i]);
    return out;
  }

  /** Pins a channel for one person, or unpins it if it was pinned: {store, pinned}. The store given is left as it was. */
  function toggleFav(store, who, id) {
    var next = {}, k;
    for (k in store || {}) if (Object.prototype.hasOwnProperty.call(store, k)) next[k] = favsOf(store, k);
    var l = favsOf(store, who), i = l.indexOf(id);
    if (i >= 0) l.splice(i, 1);
    else { l.unshift(id); if (l.length > MAX_FAVS) l.length = MAX_FAVS; }
    next[who] = l;
    return {store: next, pinned: i < 0};
  }

  /** The line-up entries one person turned off in Choose channels (ids, "aerial" or an app's key). */
  function offOf(store, who) { return listOf(store, who, 120); }

  /** Turns an entry off for one person, or back on: the new store. The store given is left as it was. */
  function toggleOff(store, who, key) {
    var next = {}, k;
    for (k in store || {}) if (Object.prototype.hasOwnProperty.call(store, k)) next[k] = offOf(store, k);
    var l = offOf(store, who), i = l.indexOf(key);
    if (i >= 0) l.splice(i, 1);
    else l.push(key);
    next[who] = l;
    return next;
  }

  /**
   * The numbered line-up: [{num, key, kind: 'aerial', 'app' or 'channel', name, app or channel}]. The aerial and the NZ
   * apps first, then the channels in GROUPS order, then the other apps. A kid gets the aerial, the NZ apps and the
   * kids' channels. Numbers come before anything is turned off, so a channel keeps its number.
   */
  function lineup(channels, rows, aerial, kid) {
    var out = [], i, g;
    function push(e) { e.num = out.length + 1; out.push(e); }
    if (aerial) push({key: 'aerial', kind: 'aerial', name: tr('Antena', 'Your aerial', 'Tu antena'), app: aerial});
    for (i = 0; i < rows.nz.length; i++) push({key: rows.nz[i].key, kind: 'app', name: rows.nz[i].name, app: rows.nz[i].app});
    var groups = kid ? ['kids'] : GROUPS;
    for (g = 0; g < groups.length; g++) {
      var l = inGroup(channels, groups[g]);
      for (i = 0; i < l.length; i++) push({key: l[i].id, kind: 'channel', name: l[i].name, channel: l[i]});
    }
    if (!kid) {
      var more = rows.free.concat(rows.paid);
      for (i = 0; i < more.length; i++) push({key: more[i].key, kind: 'app', name: more[i].name, app: more[i].app});
    }
    return out;
  }

  /** The line-up without what was turned off; never empty while there is anything at all. */
  function shown(full, off) {
    var out = [];
    for (var i = 0; i < full.length; i++) if (off.indexOf(full[i].key) < 0) out.push(full[i]);
    return out.length ? out : full.slice();
  }

  /** How many entries are still on. */
  function onCount(full, off) {
    var n = 0;
    for (var i = 0; i < full.length; i++) if (off.indexOf(full[i].key) < 0) n++;
    return n;
  }

  /** Where in the list a number goes, or -1. */
  function byNumber(list, n) {
    for (var i = 0; i < list.length; i++) if (list[i].num === n) return i;
    return -1;
  }

  /** Where surfing starts: the channel asked for, else the one last watched, else the first channel (not an app). */
  function startAt(list, play, last) {
    var i;
    for (i = 0; play && i < list.length; i++) if (list[i].key === play) return i;
    for (i = 0; last && i < list.length; i++) if (list[i].key === last) return i;
    for (i = 0; i < list.length; i++) if (list[i].kind === 'channel') return i;
    return list.length ? 0 : -1;
  }

  /** The pinned channels that are on air, in the order they were pinned. */
  function favourites(channels, ids) {
    var out = [];
    for (var i = 0; i < ids.length; i++) for (var j = 0; j < channels.length; j++) if (channels[j].id === ids[i]) { out.push(channels[j]); break; }
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

  /** YouTube's own player: the live video, or a mix from where it is at this moment and on round its videos. */
  function embedUrl(c, at) {
    var opts = 'autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
    if (c.videos && c.videos.length) {
      var m = mixAt(c.videos, at || 0), rest = [];
      for (var i = 1; i < c.videos.length; i++) rest.push(c.videos[(m.i + i) % c.videos.length].v);
      return 'https://www.youtube.com/embed/' + c.videos[m.i].v + '?start=' + m.start
        + (rest.length ? '&playlist=' + rest.join(',') + '&loop=1' : '') + '&' + opts;
    }
    if (c.video) return 'https://www.youtube.com/embed/' + c.video + '?' + opts;
    return 'https://www.youtube.com/embed/live_stream?channel=' + c.youtube + '&' + opts;
  }

  /** The channel's own logo, kept on our website beside the list (ours for a mix). */
  function logoUrl(c) { return SLUG.test(c.id || '') ? SITE + 'logos/' + c.id + '.jpg' : null; }

  /** A number key as a digit (the row along the top and a keypad), or -1. */
  function digit(k) {
    if (k >= 48 && k <= 57) return k - 48;
    if (k >= 96 && k <= 105) return k - 96;
    return -1;
  }

  /** CH+ is 1, CH- is -1 (LG 33 and 34, Samsung 427 and 428), anything else 0. */
  function channelKey(k) { return k === 33 || k === 427 ? 1 : k === 34 || k === 428 ? -1 : 0; }

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
   * host: {apps: [...], aerial: {id, title} or null, launch(app), play: a channel id or null, guide: true to open on the
   * guide}; the home screen gives what it knows about the TV.
   */
  function open(host) {
    load(function (channels) { surf(host, channels); });
  }

  /** A tile: a picture (or the name on a colour when there is none), the name under it, then what's on or where from. */
  function tile(row, label, from, pic, colour, cls, star, num) {
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
    if (star) UI.el('div', 'star', face, '★');
    if (num) UI.el('div', 'num', face, String(num));
    UI.el('div', 'name', t, label);
    if (from) UI.el('div', 'from', t, from);
    return t;
  }

  /** The channels on this person's line-up, in order, without the ones they turned off (Find, find.js). */
  function playableOf(channels) {
    var kid = window.Profiles && Profiles.kid(), groups = kid ? ['kids'] : GROUPS, out = [];
    var off = kid ? [] : offOf(read(OFF_KEY) || {}, who());
    for (var g = 0; g < groups.length; g++) {
      var l = inGroup(channels, groups[g]);
      for (var i = 0; i < l.length; i++) if (off.indexOf(l[i].id) < 0) out.push(l[i]);
    }
    return out;
  }

  /** What's on air from the copy kept on the TV, straight away (Find, find.js, can't wait for the website). */
  function keptNow() { return playableOf(onAir(pickList(null, read(KEY)), read(NOW_KEY), Date.now())); }

  function who() { return window.Profiles && Profiles.current() ? Profiles.current().id || '' : ''; }

  function clock(at) {
    if (window.Data && Data.time) return Data.time(at);
    var d = new Date(at), m = d.getMinutes();
    return d.getHours() + ':' + (m < 10 ? '0' : '') + m;
  }

  /** "Next at 7:00 PM: Mornings with Ridge and Frost", or empty. */
  function nextLine(c) {
    var n = nextOf(c, Date.now());
    return n ? tr('A seguir', 'Up next', 'A continuación') + ' ' + clock(n.at) + ': ' + n.title : '';
  }

  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  /**
   * Live TV: the line-up, then straight into the channel last watched (or the one asked for). ctx is what the player,
   * the guide and Choose channels share: the full line-up, what is shown of it, and the player once it is open.
   */
  function surf(host, channels) {
    var kid = !!(window.Profiles && Profiles.kid());
    var ctx = {host: host, kid: kid, channels: channels, full: lineup(channels, sources(host.apps), host.aerial, kid), player: null};
    ctx.refresh = function () { ctx.list = shown(ctx.full, kid ? [] : offOf(read(OFF_KEY) || {}, who())); };
    ctx.refresh();
    var at = startAt(ctx.list, host.play, read(LAST_KEY));
    if (TV.wantKeys) TV.wantKeys(true);
    if (host.guide || at < 0) guide(ctx, null);
    else ctx.player = player(ctx, at);
  }

  /** Opens an app or the aerial from the line-up, leaving Live TV. */
  function launch(ctx, e) {
    UI.closeAll();
    ctx.host.launch(e.app);
    if (e.key === 'plex') UI.toast(tr('Escolha TV ao vivo no Plex', 'Pick Live TV in Plex', 'Elige TV en vivo en Plex'));
  }

  /** A line-up entry's picture: the channel's logo, or the app's own icon. */
  function picOf(e) { return e.kind === 'channel' ? logoUrl(e.channel) : e.app && e.app.icon || null; }

  /**
   * The line-up full screen: a channel plays in YouTube's own player, an app shows a card (OK opens it). Up and down
   * (and CH+ and CH-) change channel, numbers jump to one, OK opens the guide, Back goes home.
   */
  function player(ctx, at) {
    var frame = null, card = null, banner = null, hint = null, hideAt = 0, typed = '', typeAt = 0, a;
    function entry() { return ctx.list[at]; }
    function show(i) {
      at = Math.max(0, Math.min(i, ctx.list.length - 1));
      var e = entry();
      if (!e) return;
      store(LAST_KEY, e.key);
      if (e.kind === 'channel') {
        card.style.display = 'none';
        frame.src = embedUrl(e.channel, Date.now());
        if (window.Family && Family.now) Family.now('Live TV', e.name);
        // Keep watching on the home screen: this channel, ready to open again with one press. Kept on the TV only.
        if (window.Watched) Watched.add({app: 'beyond:live:' + e.key, name: e.name});
      } else {
        frame.src = 'about:blank';
        card.innerHTML = '';
        var f = tile(card, e.name, '', picOf(e), e.kind === 'aerial' ? '#6E3DDB' : '#2A2A2E', 'featured app' + (e.kind === 'aerial' ? ' aerial' : ''));
        if (e.kind === 'aerial') { f.firstChild.firstChild.innerHTML = '📡'; f.firstChild.firstChild.style.visibility = ''; }
        UI.el('div', 'bt-sub', card, tr('Aperte OK para abrir ', 'Press OK to open ', 'Pulsa OK para abrir ') + e.name);
        card.style.display = '';
      }
      showBanner(e);
    }
    function showBanner(e) {
      banner.innerHTML = '';
      UI.el('div', 'num', banner, typed ? typed + '_' : String(e.num));
      var pic = picOf(e);
      if (pic) UI.el('img', 'logo', banner).src = pic;
      var words = UI.el('div', 'words', banner);
      UI.el('div', 'who', words, e.name);
      if (e.kind === 'channel') {
        var now = UI.el('div', 'line', words);
        UI.el('b', 'live', now, tr('Agora', 'Now', 'Ahora'));
        now.appendChild(document.createTextNode(' ' + (nowOf(e.channel, Date.now()) || e.channel.from || tr('Ao vivo', 'Live', 'En vivo'))));
        var n = nextLine(e.channel);
        if (n) UI.el('div', 'line next', words, n);
      } else UI.el('div', 'line', words, e.kind === 'aerial' ? tr('Os canais da antena', 'The channels from your aerial', 'Los canales de tu antena')
        : tr('Um app na sua TV', 'An app on your TV', 'Una app en tu TV'));
      banner.style.opacity = 1;
      hint.style.opacity = 1;
      clearTimeout(hideAt);
      hideAt = setTimeout(function () { banner.style.opacity = 0; hint.style.opacity = 0; }, 5000);
    }
    /** A number typed on the remote: shown as it is typed, then the TV goes there. */
    function type(d) {
      typed = (typed + d).slice(-3);
      showBanner(entry());
      clearTimeout(typeAt);
      typeAt = setTimeout(function () {
        var n = parseInt(typed, 10), i = byNumber(ctx.list, n);
        typed = '';
        if (i >= 0) show(i);
        else { showBanner(entry()); UI.toast(tr('Não há canal ', 'There\'s no channel ', 'No hay canal ') + n); }
      }, TYPE_MS);
    }
    a = UI.open({
      cls: 'bt-karaoke-player bt-live-player',
      build: function (layer) {
        var spot = UI.el('div', 'video', layer);
        frame = UI.el('iframe', 'video', spot);
        frame.setAttribute('allow', 'autoplay; encrypted-media');
        frame.setAttribute('allowfullscreen', 'true');
        card = UI.el('div', 'card', layer);
        banner = UI.el('div', 'banner', layer);
        hint = UI.el('div', 'hint', layer, tr('▲ ▼ muda o canal   ·   OK guia', '▲ ▼ change channel   ·   OK for the guide', '▲ ▼ cambia de canal   ·   OK guía'));
        show(at);
      },
      key: function (k) {
        var d = digit(k), ch = channelKey(k);
        if (d >= 0) { type(d); return true; }
        if (k === TV.keys.up || k === TV.keys.right || ch > 0) { show(step(at, 1, ctx.list.length)); return true; }
        if (k === TV.keys.down || k === TV.keys.left || ch < 0) { show(step(at, -1, ctx.list.length)); return true; }
        if (k === TV.keys.ok) {
          var e = entry();
          if (e && e.kind !== 'channel') launch(ctx, e);
          else guide(ctx, e ? e.key : null);
          return true;
        }
        return false;
      },
      closed: function () {
        clearTimeout(hideAt);
        clearTimeout(typeAt);
        if (frame) frame.src = 'about:blank';
        if (ctx.player === api) ctx.player = null;
        if (TV.wantKeys) TV.wantKeys(false);
      }
    });
    var api = {
      show: show,
      key: function () { var e = entry(); return e ? e.key : null; },
      /** After Choose channels: the same entry when it is still on, else the one now in its place. */
      relist: function (key) {
        for (var i = 0; i < ctx.list.length; i++) if (ctx.list[i].key === key) { at = i; showBanner(ctx.list[i]); return; }
        show(at);
      },
      /** The banner and the hint out of the way, under the guide. */
      quiet: function () { clearTimeout(hideAt); banner.style.opacity = 0; hint.style.opacity = 0; },
      close: function () { a.close(); }
    };
    return api;
  }

  /**
   * The guide: every channel on the line-up in rows of tiles, over the picture when a channel is playing. A channel
   * plays where it is picked; holding OK pins it to "Your favourites"; Back goes back to the channel.
   */
  function guide(ctx, playing) {
    var host = ctx.host, kid = ctx.kid, channels = ctx.channels;
    var box = null, bar = null, shift = 0, focusedNode = null, hold = null, keepOn = playing, api;

    /** Holding OK pins the focused channel; a short press plays it. A TV that never says the key came up still plays. */
    function okDown() {
      var c = focusedNode && focusedNode.btChannel;
      if (!c) return false;
      var now = Date.now();
      if (hold && now - hold.last < 400) { hold.repeats++; hold.last = now; return true; }
      if (hold) clearTimeout(hold.timer);
      var h = hold = {repeats: 0, last: now, done: false, node: focusedNode};
      h.timer = setTimeout(function () {
        h.done = true;
        if (h.repeats >= 2) pin(c);
        else { if (hold === h) hold = null; h.node.btRun(); }
      }, HOLD_MS);
      return true;
    }
    function okUp(e) {
      if (!hold || TV.code(e.keyCode) !== TV.keys.ok) return;
      var h = hold;
      hold = null;
      clearTimeout(h.timer);
      if (!h.done) h.node.btRun();
    }
    function pin(c) {
      var r = toggleFav(read(FAV_KEY) || {}, who(), c.id);
      store(FAV_KEY, r.store);
      UI.toast(r.pinned ? tr('Fixado nos seus favoritos', 'Pinned to your favourites', 'Fijado en tus favoritos')
        : tr('Tirado dos seus favoritos', 'Taken out of your favourites', 'Quitado de tus favoritos'));
      keepOn = c.id;
      shift = 0;
      api.rebuild();
    }
    /** Plays an entry: in the player under the guide, or a new one when the guide was opened on its own. */
    function play(e) {
      var i = ctx.list.indexOf(e);
      if (e.kind !== 'channel') { launch(ctx, e); return; }
      api.close();
      if (ctx.player) ctx.player.show(i);
      else {
        ctx.player = player(ctx, i);
        if (TV.wantKeys) TV.wantKeys(true);
      }
    }
    document.addEventListener('keyup', okUp);
    if (ctx.player) ctx.player.quiet();

    api = UI.open({
      cls: 'bt-live' + (ctx.player ? ' over' : ''),
      build: function (layer, a) {
        box = UI.el('div', 'bt-box', layer);
        bar = UI.el('div', 'bt-live-now', layer);
        var keepNode = null, list = ctx.list, entries = {}, onList = [];
        for (var i = 0; i < list.length; i++) { entries[list[i].key] = list[i]; if (list[i].kind === 'channel') onList.push(list[i].channel); }
        var pinned = favourites(onList, favsOf(read(FAV_KEY) || {}, who()));
        UI.heading(box, tr('TV ao vivo', 'Live TV', 'TV en vivo'),
          kid ? tr('Escolha um canal', 'Pick a channel', 'Elige un canal')
            : tr('Canais grátis, sem assinatura', 'Free channels, no subscription', 'Canales gratis, sin suscripción'));
        UI.el('div', 'bt-sub pin-tip', box, tr('Segure OK num canal para fixá-lo no topo.', 'Hold OK on a channel to pin it to the top.', 'Mantén OK en un canal para fijarlo arriba.'));
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
        function appRow(title, keys) {
          var l = [];
          for (var n = 0; n < keys.length; n++) if (keys[n].kind !== 'channel') l.push(keys[n]);
          if (!l.length) return;
          var row = section(title);
          for (var m = 0; m < l.length; m++) (function (e) {
            var t = tile(row, e.name, '', picOf(e), e.kind === 'aerial' ? '#6E3DDB' : '#2A2A2E', 'app' + (e.kind === 'aerial' ? ' aerial' : ''), false, e.num);
            if (e.kind === 'aerial') { t.firstChild.firstChild.innerHTML = '📡'; t.firstChild.firstChild.style.visibility = ''; }
            add(t, function () { launch(ctx, e); });
            if (keepOn === e.key) keepNode = t;
          })(l[m]);
        }
        function channelRow(title, cs, cls, favRow) {
          var l = [];
          for (var n = 0; n < cs.length; n++) if (entries[cs[n].id] && entries[cs[n].id].kind === 'channel') l.push(entries[cs[n].id]);
          if (!l.length) return;
          var row = section(title, cls);
          for (var m = 0; m < l.length; m++) (function (e) {
            var c = e.channel;
            var t = tile(row, c.name, nowOf(c, Date.now()) || c.from, logoUrl(c), c.colour, cls, favRow || pinned.indexOf(c) >= 0, e.num);
            t.btChannel = c;
            t.btRun = function () { play(e); };
            add(t, t.btRun);
            if (!favRow && keepOn === c.id) keepNode = t;
          })(l[m]);
        }
        function byKind(want) {
          var out = [];
          for (var n = 0; n < list.length; n++) if (want(list[n])) out.push(list[n]);
          return out;
        }
        var nzKeys = {aerial: 1, freeview: 1, tvnz: 1, threenow: 1};

        // Your favourites first: the channels this person pinned by holding OK.
        channelRow(tr('Seus favoritos', 'Your favourites', 'Tus favoritos'), pinned, 'featured', true);
        // Here: the aerial and the free-to-air apps
        appRow(nz() ? tr('Nova Zelândia', 'Here in Aotearoa', 'Nueva Zelanda') : tr('Na sua TV', 'On your TV', 'En tu TV'),
          byKind(function (e) { return nzKeys[e.key]; }));
        if (kid) channelRow(tr('Para crianças', 'For kids', 'Para niños'), inGroup(channels, 'kids'), 'featured');
        else {
          channelRow(tr('Feito em Aotearoa', 'Made in Aotearoa', 'Hecho en Aotearoa'), inGroup(channels, 'nz'), 'featured');
          channelRow(tr('Em destaque', 'Featured', 'Destacados'), inGroup(channels, 'featured'), 'featured');
          channelRow(tr('Notícias do mundo, grátis', 'World news, free', 'Noticias del mundo, gratis'), inGroup(channels, 'news'));
          channelRow(tr('Clima, espaço e música', 'Weather, space and music', 'Clima, espacio y música'), inGroup(channels, 'more'));
          channelRow(tr('Para crianças', 'For kids', 'Para niños'), inGroup(channels, 'kids'));
          appRow(tr('Mais canais grátis', 'More free channels', 'Más canales gratis'),
            byKind(function (e) { return /^(plex|tvplus|lgchannels)$/.test(e.key); }));
          appRow(tr('Extras pagos', 'Paid extras', 'Extras de pago'), byKind(function (e) { return /^(skysportnow|neon)$/.test(e.key); }));
          var help = UI.el('div', 'bt-buttons help', box);
          add(UI.button(help, tr('Escolher canais', 'Choose channels', 'Elegir canales'), null, 'quiet'), function () {
            choose(ctx, function () { shift = 0; api.rebuild(); });
          });
          if (nz()) add(UI.button(help, tr('Quais canais eu tenho?', 'Which channels can I get?', '¿Qué canales tengo?'), null, 'quiet'), explain);
        }
        var nzApps = byKind(function (e) { return nzKeys[e.key]; });
        if (!nzApps.length && kid) UI.el('div', 'bt-sub', box,
          tr('Peça a um adulto para instalar o Freeview.', 'Ask a grown-up to add the Freeview app.', 'Pide a un adulto que instale Freeview.'));
        else if (!nzApps.length && nz()) UI.el('div', 'bt-sub tip', box, tr(
          'Sem antena? O app Freeview Streaming TV tem os canais grátis da Nova Zelândia.',
          'No aerial? The Freeview Streaming TV app has every free NZ channel. Find it in the TV\'s app store.',
          '¿Sin antena? La app Freeview Streaming TV tiene los canales gratis de Nueva Zelanda.'));
        // The channel playing (or the one just pinned) has the focus, in its own row.
        if (keepNode) { var k = keepNode; keepOn = null; setTimeout(function () { a.focusNode(k); }, 0); }
      },
      key: function (k) {
        if (k === TV.keys.ok) return okDown();
        var d = digit(k), ch = channelKey(k);
        // A number or CH+ / CH- in the guide goes straight to the player.
        if ((d >= 0 || ch) && ctx.player) { api.close(); return UI.key(k); }
        return false;
      },
      closed: function () {
        document.removeEventListener('keyup', okUp);
        if (hold) clearTimeout(hold.timer);
        hold = null;
        if (!ctx.player && TV.wantKeys) TV.wantKeys(false);
      },
      // Keeps the focused tile in view: its row slides sideways, the screen slides up. Only transforms, so old TVs keep up.
      focused: function (node) {
        focusedNode = node;
        showNow(bar, node.btChannel);
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
    return api;
  }

  /**
   * Choose channels: every entry on the line-up, on or off for whoever is watching (kept on the TV). Off ones are left
   * out of the guide and surfing skips them. At least one stays on. done() runs once it closes.
   */
  function choose(ctx, done) {
    var box = null, shift = 0;
    UI.open({
      cls: 'bt-live bt-live-choose',
      build: function (layer, a) {
        box = UI.el('div', 'bt-box', layer);
        UI.heading(box, tr('Escolher canais', 'Choose channels', 'Elegir canales'),
          tr('Desligue os que vocês não assistem. ▲ ▼ pula esses.', 'Turn off the ones you don\'t watch. Changing channel skips them.',
            'Apaga los que no ves. Al cambiar de canal se saltan.'));
        var grid = UI.el('div', 'grid', box), off = offOf(read(OFF_KEY) || {}, who());
        for (var i = 0; i < ctx.full.length; i++) (function (e, n) {
          var isOff = off.indexOf(e.key) >= 0;
          var t = tile(grid, e.name, isOff ? tr('Desligado', 'Off', 'Apagado') : tr('Ligado', 'On', 'Encendido'), picOf(e),
            e.kind === 'channel' ? e.channel.colour : e.kind === 'aerial' ? '#6E3DDB' : '#2A2A2E',
            (e.kind === 'channel' ? '' : 'app') + (e.kind === 'aerial' ? ' aerial' : '') + (isOff ? ' off' : ''), false, e.num);
          if (e.kind === 'aerial') { t.firstChild.firstChild.innerHTML = '📡'; t.firstChild.firstChild.style.visibility = ''; }
          a.add(t, function () {
            var next = toggleOff(read(OFF_KEY) || {}, who(), e.key);
            if (!isOff && !onCount(ctx.full, offOf(next, who()))) {
              UI.toast(tr('Deixe pelo menos um canal ligado', 'Keep at least one channel on', 'Deja al menos un canal encendido'));
              return;
            }
            store(OFF_KEY, next);
            a.rebuild();
          }, {first: n === 0});
        })(ctx.full[i], i);
      },
      focused: function (node) {
        if (!box) return;
        var top = node.offsetTop + node.parentNode.offsetTop, bottom = top + node.offsetHeight;
        if (70 + bottom + shift > 1050) shift = 980 - bottom;
        if (70 + top + shift < 60) shift = Math.min(0, -10 - top);
        slide(box, 'translateY(' + shift + 'px)');
      },
      closed: function () {
        var was = ctx.player ? ctx.player.key() : null;
        ctx.refresh();
        if (ctx.player) ctx.player.relist(was);
        done();
      }
    });
  }

  /** The focused channel's name, what's on now and what's on next, in the corner. */
  function showNow(bar, c) {
    if (!bar) return;
    bar.innerHTML = '';
    bar.style.opacity = c ? 1 : 0;
    if (!c) return;
    UI.el('div', 'who', bar, c.name + (c.from ? '  ·  ' + c.from : ''));
    var now = UI.el('div', 'line', bar);
    UI.el('b', 'live', now, tr('Agora', 'Now', 'Ahora'));
    now.appendChild(document.createTextNode(' ' + (nowOf(c, Date.now()) || tr('Ao vivo', 'Live', 'En vivo'))));
    var n = nextLine(c);
    if (n) UI.el('div', 'line next', bar, n);
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
            'NZ News, NZ Music, NZ Shows, NZ Sport. ' + tr('Notícias 24 horas: ', 'News around the clock: ', 'Noticias las 24 horas: ') + 'Sky News, ABC News, NBC News NOW, Al Jazeera, LiveNOW from FOX ' + tr('e mais', 'and more', 'y más')],
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

  return {open: open, logoUrl: logoUrl, channels: keptNow, rules: {pickList: pickList, onAir: onAir, inGroup: inGroup, sources: sources, step: step,
    embedUrl: embedUrl, logoUrl: logoUrl, nextOf: nextOf, favsOf: favsOf, toggleFav: toggleFav, favourites: favourites, NEWS: NEWS,
    videosOf: videosOf, mixAt: mixAt, nowOf: nowOf, offOf: offOf, toggleOff: toggleOff, lineup: lineup, shown: shown,
    byNumber: byNumber, startAt: startAt, digit: digit, channelKey: channelKey, validChannel: validChannel}};
})();

if (typeof module !== 'undefined') module.exports = LiveTV;
