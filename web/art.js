/*
 * Art mode, like a Samsung Frame: the screensaver shows paintings from the Art Institute of Chicago's public domain
 * collection (free, no key), framed on a deep plum mat, with title, artist and date as the caption. A new set once a
 * day from a theme (landscapes, the sea, gardens...); the list is kept, the images come straight from the museum.
 * Same idea and themes as Art.java on Google TV. Plain ES5.
 */
var Art = (function () {
  'use strict';

  var API = 'https://api.artic.edu/api/v1/artworks/search';
  var IIIF = 'https://www.artic.edu/iiif/2/';
  var THEMES = ['landscape', 'sea', 'garden', 'flowers', 'mountains', 'river', 'sky', 'autumn', 'harbour', 'trees',
    'impressionism', 'still life'];
  var KEY = 'btv.art', KEEP = 24;
  var list = [], day = -1, loading = false;

  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.list) { list = saved.list; day = saved.day; }
  } catch (e) {}

  function today() { return Math.floor(Date.now() / 86400000); }

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
    var d = today(), theme = THEMES[d % THEMES.length];
    var url = API + '?q=' + encodeURIComponent(theme) + '&query%5Bterm%5D%5Bis_public_domain%5D=true&limit=60' +
      '&fields=id,title,artist_title,image_id,date_display,artwork_type_title';
    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.timeout = 20000;
    x.onload = x.onerror = x.ontimeout = function () {
      loading = false;
      var res = null;
      try { res = JSON.parse(x.responseText); } catch (e) {}
      var found = [];
      var data = res && res.data ? res.data : [];
      for (var i = 0; i < data.length; i++) {
        var o = data[i], type = o.artwork_type_title;
        if (!o.image_id || (type !== 'Painting' && type !== 'Drawing and Watercolor')) continue;
        var meta = [o.artist_title, o.date_display].filter(function (s) { return s; }).join(' · ');
        found.push({id: o.id, title: o.title || '', image: o.image_id, meta: meta});
      }
      if (found.length) {
        list = shuffle(found, d).slice(0, KEEP);
        day = d;
        try { localStorage.setItem(KEY, JSON.stringify({day: day, list: list})); } catch (e) {}
      }
      if (done) done();
    };
    x.send();
  }

  return {
    refresh: refresh,
    /** Today's paintings: [{id, title, image, meta}]. */
    list: function () { return list; },
    /** The painting itself; 843 wide is the size the museum always serves. */
    image: function (a) { return IIIF + a.image + '/full/843,/0/default.jpg'; },
    /** Art on the screensaver: chosen, or automatic without a TMDB key (no film photos to show). */
    on: function () {
      var v = Prefs.screensaver();
      return v === 'art' || (v !== 'photos' && !Data.hasKey());
    }
  };
})();
