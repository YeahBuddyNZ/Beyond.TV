/*
 * Art mode, like a Samsung Frame: the screensaver shows paintings from the Art Institute of Chicago's public domain
 * collection (free, no key), filling the whole screen with nothing written on it. Only paintings about the screen's
 * shape are picked, so filling it crops little. A new set once a day from the kind they chose in Home Settings
 * (Art.KINDS), or a different theme each day on Mixed; the list is kept, the images come straight from the museum.
 * On Mixed, a season (Halloween, Christmas...) shows our own art instead, listed in docs/art/seasons.json.
 * Same idea and themes as Art.java on Google TV. Plain ES5.
 */
var Art = (function () {
  'use strict';

  var API = 'https://api.artic.edu/api/v1/artworks/search';
  var IIIF = 'https://www.artic.edu/iiif/2/';
  var SEASONS = 'https://yeahbuddynz.github.io/Beyond.TV/art/';
  var THEMES = ['landscape', 'sea', 'garden', 'flowers', 'mountains', 'river', 'sky', 'autumn', 'harbour', 'trees',
    'impressionism', 'still life'];
  /** What they can pick in Home Settings, each with the museum searches behind it. Same ids as Art.java. */
  var KINDS = [
    {id: 'mixed', name: function () { return tr('Variada', 'Mixed', 'Variada'); }},
    {id: 'landscapes', q: ['landscape', 'countryside', 'river'], name: function () { return tr('Paisagens', 'Landscapes', 'Paisajes'); }},
    {id: 'sea', q: ['sea', 'harbour', 'coast'], name: function () { return tr('O mar', 'The sea', 'El mar'); }},
    {id: 'gardens', q: ['garden', 'flowers'], name: function () { return tr('Jardins e flores', 'Gardens and flowers', 'Jardines y flores'); }},
    {id: 'mountains', q: ['mountains', 'alps', 'valley'], name: function () { return tr('Montanhas', 'Mountains', 'Montañas'); }},
    {id: 'impressionism', q: ['impressionism', 'Monet'], name: function () { return tr('Impressionismo', 'Impressionism', 'Impresionismo'); }},
    {id: 'still life', q: ['still life'], name: function () { return tr('Natureza-morta', 'Still life', 'Naturaleza muerta'); }}
  ];
  var KEY = 'btv.art', KEEP = 24;
  var list = [], day = -1, kindOf = 'mixed', loading = false;

  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.list) { list = saved.list; day = saved.day; kindOf = saved.kind || 'mixed'; }
  } catch (e) {}

  function kind() {
    var v = Prefs.artKind();
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === v) return KINDS[i];
    return KINDS[0];
  }

  /** Today on the TV's own clock, as a number (20261031), so the set changes at local midnight. */
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** MM-DD compares in date order; a season may run over New Year. */
  function inSeason(md, from, to) {
    if (!from || !to) return false;
    return from <= to ? md >= from && md <= to : md >= from || md <= to;
  }

  function get(url, done) {
    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.timeout = 20000;
    x.onload = x.onerror = x.ontimeout = function () {
      var res = null;
      try { res = x.status === 200 ? JSON.parse(x.responseText) : null; } catch (e) {}
      done(res);
    };
    x.send();
  }

  function keep(found, d) {
    list = shuffle(found, d).slice(0, KEEP);
    day = d;
    kindOf = kind().id;
    try { localStorage.setItem(KEY, JSON.stringify({day: day, kind: kindOf, list: list})); } catch (e) {}
  }

  /** The season's own pictures, when one is on today; otherwise calls done(false). */
  function season(d, done) {
    get(SEASONS + 'seasons.json', function (res) {
      var now = new Date(), md = pad(now.getMonth() + 1) + '-' + pad(now.getDate());
      var all = res && res.seasons ? res.seasons : [];
      for (var i = 0; i < all.length; i++) {
        if (!inSeason(md, all[i].from, all[i].to)) continue;
        var found = [], art = all[i].art || [];
        for (var j = 0; j < art.length; j++) {
          if (art[j].file) found.push({id: art[j].file, title: art[j].title || '', url: SEASONS + art[j].file, meta: art[j].by || 'Beyond™ TV'});
        }
        if (found.length) { keep(found, d); return done(true); }
      }
      done(false);
    });
  }

  /** A day's shuffle that is the same on every TV in the house. */
  function shuffle(a, seed) {
    for (var i = a.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      var j = Math.floor(seed / 233280 * (i + 1)), t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function refresh(done) {
    if (loading || (day === today() && kindOf === kind().id && list.length)) { if (done) done(); return; }
    loading = true;
    var d = today();
    if (kind().q) { museum(d, done); return; }
    season(d, function (got) {
      if (got) { loading = false; if (done) done(); return; }
      museum(d, done);
    });
  }

  function museum(d, done) {
    var k = kind(), n = Math.floor(Date.now() / 86400000);
    var theme = k.q ? k.q[n % k.q.length] : THEMES[n % THEMES.length];
    var url = API + '?q=' + encodeURIComponent(theme) + '&query%5Bterm%5D%5Bis_public_domain%5D=true&limit=100' +
      '&fields=id,title,artist_title,image_id,date_display,artwork_type_title,thumbnail';
    get(url, function (res) {
      loading = false;
      var wide = [], other = [];
      var data = res && res.data ? res.data : [];
      for (var i = 0; i < data.length; i++) {
        var o = data[i], type = o.artwork_type_title;
        if (!o.image_id || (type !== 'Painting' && type !== 'Drawing and Watercolor')) continue;
        var meta = [o.artist_title, o.date_display].filter(function (s) { return s; }).join(' · ');
        var a = {id: o.id, title: o.title || '', image: o.image_id, meta: meta};
        (shaped(o.thumbnail) ? wide : other).push(a);
      }
      // Filling a 16:9 screen crops a tall painting badly: wide ones first, others only when there are too few.
      var found = wide.length >= 8 ? wide : wide.concat(other);
      if (found.length) keep(found, d);
      if (done) done();
    });
  }

  /** About the screen's shape (from 5:4 to 12:5), so filling it crops only the edges. */
  function shaped(t) {
    if (!t || !t.width || !t.height) return false;
    var r = t.width / t.height;
    return r >= 1.25 && r <= 2.4;
  }

  return {
    refresh: refresh,
    /** Today's paintings: [{id, title, image, meta}], or in a season [{id, title, url, meta}] (drawn for the whole screen). */
    list: function () { return list; },
    /** The painting itself, 1686 wide (public domain works come that big); `small` is the 843 the museum always serves. */
    image: function (a, small) { return IIIF + a.image + '/full/' + (small ? '843' : '1686') + ',/0/default.jpg'; },
    /** The kinds of art to pick from: [{id, name()}]. */
    kinds: KINDS,
    kindName: function () { return kind().name(); },
    /** Art on the screensaver: chosen, or automatic without a TMDB key (no film photos to show). */
    on: function () {
      var v = Prefs.screensaver();
      return v === 'art' || (v !== 'photos' && !Data.hasKey());
    }
  };
})();
