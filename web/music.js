/*
 * The family's own music on the TV (ADR 0027): the Beyond Music server (YeahBuddyNZ/Beyond-Music) on a Mac, a
 * Raspberry Pi or the Beyond Home box, which answers GET /api/hello on port 8097 with {app: 'beyond-music'}.
 * Found, Music joins the apps on the shelf; opening it shows Beyond Music's own TV screens full screen (albums, radio,
 * the player, all on the remote). Nothing found, nothing shows. Same as Music.java and MusicActivity.java.
 *
 * Finding it: the address found last, CONFIG.music if a build set one, beyond-music.local (the name the music server
 * answers to on the house network), then the Beyond Home box's own address. Asked again every five minutes while
 * nothing answers, so a Mac switched on later turns up.
 *
 * Back: Beyond Music goes back inside itself first (an album, a menu); at its first screen it tells this page, and
 * Music closes. Plain ES5, like the rest of web/.
 */
var Music = (function () {
  'use strict';

  var KEY = 'btv.music';
  var PORT = 8097;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  var state = load();   // base: where it answered last. told: the TV already said it found the music.
  var found = false, looking = false, changed = null, screen = null;

  function hello(base, done) {
    var x = new XMLHttpRequest(), over = false;
    try { x.open('GET', base + '/api/hello', true); } catch (e) { done(false); return; }
    x.timeout = 4000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4 || over) return;
      over = true;
      var json = null;
      try { json = JSON.parse(x.responseText); } catch (e) {}
      done(x.status === 200 && !!json && json.app === 'beyond-music');
    };
    x.ontimeout = x.onerror = function () { if (!over) { over = true; done(false); } };
    x.send(null);
  }

  function candidates() {
    var out = [], add = function (b) { if (b && out.indexOf(b) < 0) out.push(b); };
    add(state.base);
    if (window.CONFIG && CONFIG.music) add(String(CONFIG.music).replace(/\/+$/, ''));
    add('http://beyond-music.local:' + PORT);
    var box = window.HomeHub && HomeHub.host();
    if (box) add('http://' + box + ':' + PORT);
    return out;
  }

  function look() {
    if (looking) return;
    looking = true;
    var list = candidates(), i = 0;
    (function next() {
      if (i >= list.length) { looking = false; set(false); return; }
      var base = list[i++];
      hello(base, function (ok) {
        if (!ok) { next(); return; }
        looking = false;
        if (state.base !== base) { state.base = base; save(); }
        set(true);
      });
    })();
  }

  function set(now) {
    var was = found;
    found = now;
    if (was !== found && changed) changed();
  }

  /** Beyond Music says it is at its first screen and Back was pressed: home again. */
  function onMessage(e) {
    var d = e && e.data;
    if (screen && d && typeof d === 'object' && d.beyondMusic === 'back') screen.close();
  }

  function open() {
    if (!found || !state.base) {
      UI.toast(tr('A sua música não está respondendo agora. O computador onde ela fica está ligado?',
        "Your music isn't answering right now. Is the computer it's on switched on?", 'Tu música no responde ahora. ¿Está encendido el ordenador donde está?'));
      look();
      return;
    }
    var base = state.base;
    UI.open({
      cls: 'bt-music',
      build: function (layer, api) {
        screen = api;
        var frame = document.createElement('iframe');
        frame.setAttribute('allow', 'autoplay');
        frame.src = base + '/?tv';
        layer.appendChild(frame);
        // Keys go to the music once it has loaded; until then Back here closes it.
        frame.onload = function () { try { frame.focus(); frame.contentWindow.focus(); } catch (e) {} };
      },
      closed: function () { screen = null; }
    });
  }

  function start(onChange) {
    changed = onChange;
    if (window.addEventListener) window.addEventListener('message', onMessage, false);
    look();
    setInterval(function () { if (!found) look(); }, 5 * 60 * 1000);
  }

  return {
    start: start,
    open: open,
    found: function () { return found; },
    /** True once: the first time this TV finds the music, so the home screen can say so. */
    firstTime: function () {
      if (!found || state.told) return false;
      state.told = true;
      save();
      return true;
    },
    /** The shelf's Music app. */
    app: {id: 'beyond:music', title: 'Music', color: '#6E3DDB'}
  };
})();
