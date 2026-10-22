/*
 * Beyond's screens over the home screen (Who's watching, profiles, Plex, Beyond Family, the kids' space): a stack of
 * full-screen layers, each a set of focusable nodes. The remote's arrows move to the nearest node in that direction,
 * so a screen is laid out with plain positioned elements and needs no focus map. OK runs the node, Back closes the
 * layer (or asks the layer first). The home screen sends its keys here while a layer is open.
 * Plain ES5, like the rest of web/: old LG and Samsung TVs run a Chromium from 2015 to 2017.
 */
var UI = (function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function hasClass(e, c) { return (' ' + e.className + ' ').indexOf(' ' + c + ' ') >= 0; }
  function setClass(e, c, on) {
    if (!e) return;
    if (on && !hasClass(e, c)) e.className = (e.className + ' ' + c).replace(/^\s+/, '');
    else if (!on && hasClass(e, c)) e.className = (' ' + e.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }

  /** Beyond's mark: the four brand dots. */
  function dots(parent) {
    var d = el('span', 'dots', parent);
    el('i', 'a', d); el('i', 'b', d); el('i', 'c', d); el('i', 'd', d);
    return d;
  }

  function sym(name, parent, size) {
    var s = el('span', 'sym', parent);
    s.style.webkitMaskImage = 'url(symbols/' + name + '.png)';
    s.style.maskImage = 'url(symbols/' + name + '.png)';
    if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
    return s;
  }

  /** A face for a person: a circle in their colour with their initial (or an emoji when they picked one). */
  function avatar(person, parent, size) {
    var a = el('div', 'avatar', parent);
    size = size || 180;
    a.style.width = a.style.height = size + 'px';
    a.style.borderRadius = (size / 2) + 'px';
    a.style.background = person.colour || '#2F7D6D';
    var t = el('span', 'initial', a, person.emoji || (person.name || '?').charAt(0).toUpperCase());
    t.style.fontSize = Math.round(size * (person.emoji ? 0.46 : 0.42)) + 'px';
    t.style.lineHeight = size + 'px';
    if (person.kid) el('span', 'kidtag', a, '★');
    return a;
  }

  // MARK: - Layers

  var stack = [];
  var host = null;

  function stage() { return host || (host = $('stage')); }

  /**
   * Opens a layer. spec: {cls, build(layer, api), back() -> true to stay open, key(keyCode) -> true if handled,
   * closed()}. build adds nodes with api.add(node, run, opts) where opts can have {left, right} handlers (for values
   * that change with the arrows) and {first: true} for the node focused first.
   */
  function open(spec) {
    var layer = el('div', 'layer bt-layer ' + (spec.cls || ''), stage());
    var screen = {spec: spec, root: layer, items: [], focus: 0};
    var api = {
      add: function (node, run, opts) {
        opts = opts || {};
        var item = {node: node, run: run, opts: opts};
        screen.items.push(item);
        if (opts.first) screen.focus = screen.items.length - 1;
        node.onmouseover = function () {
          if (stack[stack.length - 1] !== screen) return;
          screen.focus = screen.items.indexOf(item);
          paint(screen);
        };
        node.onclick = function () { node.onmouseover(); if (item.run) item.run(); };
        return node;
      },
      focusNode: function (node) {
        for (var i = 0; i < screen.items.length; i++) if (screen.items[i].node === node) screen.focus = i;
        paint(screen);
      },
      rebuild: function () { rebuild(screen); },
      close: function () { close(screen); },
      root: layer
    };
    screen.api = api;
    stack.push(screen);
    spec.build(layer, api);
    paint(screen);
    // A frame later, so the opening transition runs.
    setTimeout(function () { setClass(layer, 'open', true); }, 20);
    return api;
  }

  /** Builds the layer again (after its data changed), keeping the focus on the same position. */
  function rebuild(screen) {
    var at = screen.focus;
    screen.root.innerHTML = '';
    screen.items = [];
    screen.spec.build(screen.root, screen.api);
    screen.focus = Math.max(0, Math.min(at, screen.items.length - 1));
    paint(screen);
  }

  function close(screen) {
    var i = stack.indexOf(screen || stack[stack.length - 1]);
    if (i < 0) return;
    var s = stack[i];
    stack.splice(i, 1);
    setClass(s.root, 'open', false);
    setTimeout(function () { if (s.root.parentNode) s.root.parentNode.removeChild(s.root); }, 400);
    if (s.spec.closed) s.spec.closed();
    if (stack.length) paint(stack[stack.length - 1]);
  }

  function closeAll() { while (stack.length) close(stack[stack.length - 1]); }

  function paint(screen) {
    for (var i = 0; i < screen.items.length; i++) setClass(screen.items[i].node, 'focus', i === screen.focus);
    var f = screen.items[screen.focus];
    if (f && screen.spec.focused) screen.spec.focused(f.node, screen.focus);
  }

  function rect(node) {
    var r = node.getBoundingClientRect();
    return {x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, l: r.left, r: r.right, t: r.top, b: r.bottom};
  }

  /** The nearest node in a direction: along the axis first, with sideways distance costing double. */
  function step(screen, dx, dy) {
    var from = screen.items[screen.focus];
    if (!from) return false;
    var a = rect(from.node), best = -1, bestScore = 1e9;
    for (var i = 0; i < screen.items.length; i++) {
      if (i === screen.focus || screen.items[i].opts.skip) continue;
      var b = rect(screen.items[i].node);
      var along = dx ? (b.x - a.x) * dx : (b.y - a.y) * dy;
      var edge = dx ? (dx > 0 ? b.l - a.r : a.l - b.r) : (dy > 0 ? b.t - a.b : a.t - b.b);
      if (along <= 4 || edge < -40) continue;
      var side = dx ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x);
      var score = Math.max(0, edge) + along * 0.25 + side * 2;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) return false;
    screen.focus = best;
    paint(screen);
    return true;
  }

  /** The home screen's key handler sends keys here first; true means the key was used. */
  function key(k) {
    var screen = stack[stack.length - 1];
    if (!screen) return false;
    if (screen.spec.key && screen.spec.key(k)) return true;
    // A real keyboard (a USB or Bluetooth one, or a computer showing the demo) types into an on-screen one.
    if (screen.api.typing && (k >= 65 && k <= 90 || k >= 48 && k <= 57 || k === 32)) { screen.api.typing(String.fromCharCode(k)); return true; }
    if (screen.api.typing && k === 8) { screen.api.typing('\b'); return true; }
    var item = screen.items[screen.focus];
    if (k === TV.keys.left) { if (item && item.opts.left) { item.opts.left(); return true; } step(screen, -1, 0); }
    else if (k === TV.keys.right) { if (item && item.opts.right) { item.opts.right(); return true; } step(screen, 1, 0); }
    else if (k === TV.keys.up) step(screen, 0, -1);
    else if (k === TV.keys.down) step(screen, 0, 1);
    else if (k === TV.keys.ok) { if (item && item.run) item.run(); }
    else if (k === TV.keys.back || k === 27 || k === 8) { if (!(screen.spec.back && screen.spec.back())) close(screen); }
    return true;
  }

  // MARK: - Things several screens use

  /** A heading with the dots: "• Who's watching?" */
  function heading(parent, text, sub) {
    var h = el('div', 'bt-heading', parent);
    dots(h);
    el('span', '', h, text);
    if (sub) el('div', 'bt-sub', parent, sub);
    return h;
  }

  /** A pill button. */
  function button(parent, label, icon, cls) {
    var b = el('div', 'bt-button ' + (cls || ''), parent);
    if (icon) sym(icon, b, 30);
    el('span', '', b, label);
    return b;
  }

  /**
   * An on-screen keyboard for names and searches, laid out for the remote: letters A to Z, numbers, space and
   * delete. typed(text) runs on each change, done(text) on Done.
   */
  function keyboard(parent, api, opts) {
    var text = opts.value || '';
    var wrap = el('div', 'bt-keyboard', parent);
    var field = el('div', 'bt-field', wrap);
    function show() {
      field.textContent = text || opts.placeholder || '';
      setClass(field, 'empty', !text);
      if (opts.typed) opts.typed(text);
    }
    var rows = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ\'-.!', '1234567890'];
    for (var r = 0; r < rows.length; r++) {
      var row = el('div', 'bt-keys', wrap);
      for (var c = 0; c < rows[r].length; c++) {
        (function (ch) {
          var k = el('div', 'bt-key', row, ch);
          api.add(k, function () {
            if (text.length >= (opts.max || 24)) return;
            text += text && text.charAt(text.length - 1) !== ' ' ? ch.toLowerCase() : ch;
            show();
          }, {first: r === 0 && c === 0});
        })(rows[r].charAt(c));
      }
    }
    var last = el('div', 'bt-keys', wrap);
    api.add(el('div', 'bt-key wide', last, opts.spaceLabel || 'Space'), function () { if (text && text.charAt(text.length - 1) !== ' ') { text += ' '; show(); } });
    api.add(el('div', 'bt-key wide', last, '⌫'), function () { text = text.slice(0, -1); show(); });
    if (opts.done) api.add(el('div', 'bt-key wide done', last, opts.doneLabel || 'Done'), function () { opts.done(text.replace(/\s+$/, '')); });
    show();
    api.typing = function (ch) {
      if (ch === '\b') text = text.slice(0, -1);
      else if (ch === ' ') { if (text && text.charAt(text.length - 1) !== ' ') text += ' '; }
      else if (text.length < (opts.max || 24)) text += text && text.charAt(text.length - 1) !== ' ' ? ch.toLowerCase() : ch;
      show();
    };
    return {
      text: function () { return text; },
      set: function (t) { text = t || ''; show(); },
      add: function (ch) { text += ch; show(); },
      remove: function () { text = text.slice(0, -1); show(); }
    };
  }

  // MARK: - Toast (the home screen's, when it's there)

  function toast(text) {
    if (window.BeyondTV && window.BeyondTV.toast) window.BeyondTV.toast(text);
  }

  return {
    el: el, setClass: setClass, hasClass: hasClass, dots: dots, sym: sym, avatar: avatar,
    open: open, close: close, closeAll: closeAll, key: key,
    active: function () { return stack.length > 0; },
    top: function () { return stack.length ? stack[stack.length - 1].api : null; },
    heading: heading, button: button, keyboard: keyboard, toast: toast
  };
})();
