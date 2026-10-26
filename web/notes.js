/*
 * Notes on the TV (ADR 0025): drawn or typed on a phone in Beyond Family, pinned to the home screen like a note on the
 * fridge. Never over another app and never in the way: a small dark card under Today at home, the newest first, until it
 * runs out or somebody takes it down. The note button at the top opens them big, with a heart to send back.
 * The ink comes as points on a 1000 by 750 grid (Beyond Family's shared/tvNotes.ts), drawn here on a canvas.
 * Google TV runs this same file in AskActivity's WebView. Plain ES5.
 */
var Notes = (function () {
  'use strict';

  var W = 1000, H = 750;
  var list = [], sig = '', wall = null, wallAt = 0, popped = {};

  /** The notes from Beyond Family's sync. Only redraws when something changed. */
  function set(notes) {
    notes = notes || [];
    var s = JSON.stringify(notes.map(function (n) { return [n.id, n.until]; }));
    if (s === sig) return;
    sig = s;
    list = notes;
    if (window.BeyondTV && BeyondTV.notes) setTimeout(BeyondTV.notes, 0);
    if (wall) {
      if (!live().length) wall.close();
      else { wallAt = Math.min(wallAt, live().length - 1); wall.rebuild(); }
    }
  }

  /** The ones still up now, newest first. */
  function live() {
    var now = Date.now();
    return list.filter(function (n) { var t = Date.parse(n.until); return isNaN(t) || t > now; });
  }

  /** The ink on a canvas, scaled to fit it. Round ends and joins, and curves through the midpoints so it reads as handwriting. */
  function draw(canvas, note) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var k = Math.min(canvas.width / W, canvas.height / H), ox = (canvas.width - W * k) / 2, oy = (canvas.height - H * k) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var ink = note.ink || [];
    for (var s = 0; s < ink.length; s++) {
      var p = ink[s].p || [];
      if (p.length < 2) continue;
      ctx.strokeStyle = ctx.fillStyle = ink[s].c || '#FFFFFF';
      ctx.lineWidth = Math.max(1.5, (ink[s].w || 6) * k);
      var x0 = ox + p[0] * k, y0 = oy + p[1] * k;
      if (p.length < 6) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(ox + (p[p.length - 2]) * k + 0.01, oy + p[p.length - 1] * k);
        ctx.stroke();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (var i = 2; i + 3 < p.length; i += 2) {
        var x = ox + p[i] * k, y = oy + p[i + 1] * k, nx = ox + p[i + 2] * k, ny = oy + p[i + 3] * k;
        ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      }
      ctx.lineTo(ox + p[p.length - 2] * k, oy + p[p.length - 1] * k);
      ctx.stroke();
    }
  }

  /** "just now", "20 min ago", "3 h ago". */
  function ago(at) {
    var m = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60000));
    if (isNaN(m) || m < 2) return tr('agora', 'just now', 'ahora');
    if (m < 60) return m + tr(' min atrás', ' min ago', ' min atrás');
    return Math.round(m / 60) + tr(' h atrás', ' h ago', ' h atrás');
  }

  function face(parent, n, size) {
    var f = UI.el('i', 'face', parent, (n.from || '?').charAt(0).toUpperCase());
    f.style.background = n.colour || '#2F7D6D';
    if (size) { f.style.width = f.style.height = f.style.lineHeight = size + 'px'; f.style.borderRadius = (size / 2) + 'px'; f.style.fontSize = Math.round(size * 0.46) + 'px'; }
    return f;
  }

  /**
   * The card on the home screen, in the box it's given (home.js places it under Today at home): the newest note's ink,
   * who it's from and when, its words, and how many more there are.
   */
  function card(box, height) {
    box.innerHTML = '';
    var all = live(), n = all[0];
    UI.setClass(box, 'on', !!n);
    if (!n) return;
    box.style.height = height + 'px';
    var inkH = height - 36, inkW = Math.round(inkH * 4 / 3), hasInk = n.ink && n.ink.length;
    if (hasInk) {
      var c = UI.el('canvas', 'ink', box);
      c.width = inkW;
      c.height = inkH;
      draw(c, n);
    }
    var side = UI.el('div', 'side', box);
    if (!hasInk) side.style.left = '28px';
    var from = UI.el('div', 'from', side);
    face(from, n);
    UI.el('b', '', from, n.from || '');
    UI.el('span', '', from, ago(n.at));
    if (n.text) UI.el('div', 'text' + (hasInk ? '' : ' big'), side, n.text);
    UI.el('div', 'more', side, (all.length > 1 ? '+' + (all.length - 1) + tr(' mais', ' more', ' más') + '  ·  ' : '')
      + '\uD83D\uDCDD ' + tr('lá em cima', 'up the top', 'arriba'));
    if (popped[n.id]) {
      delete popped[n.id];
      UI.setClass(box, 'pop', false);
      void box.offsetWidth;
      UI.setClass(box, 'pop', true);
    }
  }

  /** A note just arrived from a phone: it pops in on the home screen, with the chime when sounds are on. */
  function arrived(id) {
    var found = false;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) found = true;
    if (!found) return;
    popped[id] = true;
    if (window.BeyondTV && BeyondTV.renderNotes) BeyondTV.renderNotes();
    if (window.Chime && window.Prefs && Prefs.sounds()) Chime.play();
  }

  /** The notes, big: one at a time, a heart back to whoever wrote it, and Take it down. */
  function open() {
    if (!live().length) return;
    wallAt = 0;
    wall = UI.open({
      cls: 'bt-notes',
      build: function (layer, a) {
        var all = live(), n = all[Math.min(wallAt, all.length - 1)];
        if (!n) return;
        UI.heading(layer, tr('Bilhetes', 'Notes', 'Notas'),
          all.length > 1 ? (wallAt + 1) + tr(' de ', ' of ', ' de ') + all.length : tr('Da sua família', 'From your family', 'De tu familia'));
        var row = UI.el('div', 'bt-note-row', layer);
        var paper = UI.el('div', 'bt-note-paper', row);
        if (n.ink && n.ink.length) {
          var c = UI.el('canvas', 'ink', paper);
          c.width = 960;
          c.height = 720;
          draw(c, n);
        } else UI.el('div', 'words', paper, n.text || '');
        var side = UI.el('div', 'bt-note-side', row);
        var from = UI.el('div', 'from', side);
        face(from, n, 72);
        var who = UI.el('div', 'who', from);
        UI.el('b', '', who, n.from || '');
        UI.el('span', '', who, ago(n.at));
        if (n.text && n.ink && n.ink.length) UI.el('div', 'text', side, n.text);
        var buttons = UI.el('div', 'bt-buttons stack', side);
        a.add(UI.button(buttons, '❤  ' + tr('Mandar um coração', 'Send a heart', 'Enviar un corazón'), null, 'primary'), function () {
          Family.noteHeart(n.id, function (err) {
            UI.toast(err ? tr('Não foi agora. Tente de novo.', "That didn't go. Try again.", 'No se envió. Inténtalo de nuevo.')
              : tr('Coração enviado para ', 'Heart sent to ', 'Corazón enviado a ') + (n.from || '') + ' ❤');
          });
        }, {first: true});
        if (all.length > 1) a.add(UI.button(buttons, tr('Próximo bilhete', 'Next note', 'Siguiente nota'), 'chevron_right'), function () {
          wallAt = (wallAt + 1) % live().length;
          a.rebuild();
        });
        a.add(UI.button(buttons, tr('Tirar', 'Take it down', 'Quitar'), null, 'danger'), function () {
          Family.noteDown(n.id, function () {
            list = list.filter(function (x) { return x.id !== n.id; });
            sig = '';
            if (window.BeyondTV && BeyondTV.notes) BeyondTV.notes();
            if (!live().length) a.close();
            else { wallAt = Math.min(wallAt, live().length - 1); a.rebuild(); }
          });
        });
        a.add(UI.button(buttons, tr('Fechar', 'Close', 'Cerrar')), function () { a.close(); });
      },
      closed: function () { wall = null; }
    });
  }

  return {set: set, live: live, count: function () { return live().length; }, draw: draw, card: card, arrived: arrived, open: open};
})();
