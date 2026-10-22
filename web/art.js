/*
 * Art mode, like a Samsung Frame: the screensaver shows paintings from the Art Institute of Chicago's public domain
 * collection (free, no key), as big as the screen allows on a dark wall, with nothing written on it. A new set once a
 * day from a theme (landscapes, the sea, gardens...); the list is kept, the images come straight from the museum.
 * In a season (Halloween, Christmas...) it shows our own art instead, listed in docs/art/seasons.json on the website.
 * Same idea and themes as Art.java on Google TV. Plain ES5.
 */
var Art = (function () {
  'use strict';

  var API = 'https://api.artic.edu/api/v1/artworks/search';
  var IIIF = 'https://www.artic.edu/iiif/2/';
  var SEASONS = 'https://yeahbuddynz.github.io/Beyond.TV/art/';
  var THEMES = ['landscape', 'sea', 'garden', 'flowers', 'mountains', 'river', 'sky', 'autumn', 'harbour', 'trees',
    'impressionism', 'still life'];
  var KEY = 'btv.art', KEEP = 24;
  var list = [], day = -1, loading = false;

  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.list) { list = saved.list; day = saved.day; }
  } catch (e) {}

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
    try { localStorage.setItem(KEY, JSON.stringify({day: day, list: list})); } catch (e) {}
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
    if (loading || (day === today() && list.length)) { if (done) done(); return; }
    loading = true;
    var d = today();
    season(d, function (got) {
      if (got) { loading = false; if (done) done(); return; }
      museum(d, done);
    });
  }

  function museum(d, done) {
    var theme = THEMES[Math.floor(Date.now() / 86400000) % THEMES.length];
    var url = API + '?q=' + encodeURIComponent(theme) + '&query%5Bterm%5D%5Bis_public_domain%5D=true&limit=60' +
      '&fields=id,title,artist_title,image_id,date_display,artwork_type_title';
    get(url, function (res) {
      loading = false;
      var found = [];
      var data = res && res.data ? res.data : [];
      for (var i = 0; i < data.length; i++) {
        var o = data[i], type = o.artwork_type_title;
        if (!o.image_id || (type !== 'Painting' && type !== 'Drawing and Watercolor')) continue;
        var meta = [o.artist_title, o.date_display].filter(function (s) { return s; }).join(' · ');
        found.push({id: o.id, title: o.title || '', image: o.image_id, meta: meta});
      }
      if (found.length) keep(found, d);
      if (done) done();
    });
  }

  return {
    refresh: refresh,
    /** Today's paintings: [{id, title, image, meta}], or in a season [{id, title, url, meta}] (drawn for the whole screen). */
    list: function () { return list; },
    /** The painting itself, 1686 wide (public domain works come that big); `small` is the 843 the museum always serves. */
    image: function (a, small) { return IIIF + a.image + '/full/' + (small ? '843' : '1686') + ',/0/default.jpg'; },
    /** Art on the screensaver: chosen, or automatic without a TMDB key (no film photos to show). */
    on: function () {
      var v = Prefs.screensaver();
      return v === 'art' || (v !== 'photos' && !Data.hasKey());
    }
  };
})();
