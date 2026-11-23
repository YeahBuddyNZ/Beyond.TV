/*
 * The tidy-up race: a big clock counting up from 0:00 and everyone's face. Whoever is done grabs the remote and presses
 * OK on their face: first, second, third, with their time. When everybody's done the TV says who was fastest. A count
 * up, not a count down (Kyle, 29/10/2026), so nobody runs out of time; left open an hour, it closes. First, with more
 * than one face, Who's tidying?: everyone ticked, OK takes someone out, then Go.
 *
 * At the time and on the days a grown-up set in Beyond Family (TV > Tidy-up alarm), never while they're away, if
 * Beyond TV is open then; or straight away from the remote in Beyond Family. Opened by the alarm, if nobody presses a
 * button within 5 minutes the TV turns itself off (Sleep.now: LG turns off, Samsung goes dark), ADR 0064. On LG and Samsung the app can't switch the TV on by itself, so it starts only
 * when the TV is on (Google TV turns itself on: Tidy.java). Same as TidyActivity.java.
 * Plain ES5, like the rest of web/.
 */
var Tidy = (function () {
  'use strict';

  var open = null, setting = null, lastDay = '';
  var LONGEST = 60 * 60000;   // left open an hour, the race was forgotten
  var OFF_AFTER = 5 * 60000;   // opened by the alarm and nobody pressed a button: the TV turns off

  /** 2026-11-23 for a Date's own day. */
  function dayOf(d) {
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  }

  /** True when the alarm goes off on that Date's day: a ticked day (none listed is every day), after any time away. */
  function goesOff(t, d) {
    if (t.days && t.days.length && t.days.indexOf(d.getDay()) < 0) return false;
    return !t.awayUntil || dayOf(d) > t.awayUntil;
  }

  /** 2:31, or 1:02:05 past the hour. */
  function time(ms) {
    var s = Math.floor(Math.max(0, ms) / 1000), m = Math.floor(s / 60) % 60, h = Math.floor(s / 3600);
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return h ? h + ':' + two(m) + ':' + two(s % 60) : Math.floor(s / 60) + ':' + two(s % 60);
  }

  function racing() {
    var all = Profiles.list().filter(function (p) { return !p.visitor && !p.together; });
    var kids = all.filter(function (p) { return p.kid; });
    return kids.length ? kids : all.length ? all : [{name: tr('Família', 'Family', 'Familia'), together: true, colour: '#6E3DDB'}];
  }

  function start(minutes, alarm) {
    if (open) open.close();
    var waiting = !!alarm && !(setting && setting.offIfNobody === false), offTimer = 0, nobody;
    // The minutes from Beyond Family no longer set an end: the clock counts up.
    var everyone = racing(), out = {}, picking = everyone.length > 1, people = everyone;
    var started = Date.now(), timer = 0, over = false, order = [];
    var clock, title, sub, close, firstFace, api;

    function tick() {
      if (over || picking) return;
      var gone = Date.now() - started;
      clock.textContent = time(gone);
      if (gone >= LONGEST) { api.close(); return; }   // forgotten: nobody is racing any more
      timer = setTimeout(tick, 250);
    }

    // Who's tidying: everyone starts ticked, OK on a face takes them out (or back in), then Go.
    function go() {
      var chosen = everyone.filter(function (p, i) { return !out[i]; });
      if (!chosen.length) return;
      clearTimeout(timer);
      people = chosen;
      picking = false;
      started = Date.now();
      api.rebuild();
      api.focusNode(firstFace);
      Chime.play();
      tick();
    }

    function done(p, node, place) {
      if (over || order.indexOf(p) >= 0) return;
      order.push(p);
      var n = order.length;
      place.textContent = (n === 1 ? '🏆 ' + tr('1º', '1st', '1º') : n === 2 ? tr('2º', '2nd', '2º') : n === 3 ? tr('3º', '3rd', '3º')
        : '✓') + '  ' + time(Date.now() - started);
      UI.setClass(node, 'done', true);
      // The family scoreboard and Daily chores (scores.js, chores.js, ADR 0057): 3, 2, then 1 for everyone else.
      if (window.Scores) Scores.add(p, 'tidy', n === 1 ? 3 : n === 2 ? 2 : 1);
      if (order.length === people.length) end();
    }

    // Everybody's done.
    function end() {
      over = true;
      clearTimeout(timer);
      Chime.play();
      clock.textContent = '🎉';
      UI.setClass(clock, 'party', true);
      title.textContent = tr('Tudo arrumado!', 'All tidy!', '¡Todo ordenado!');
      sub.textContent = people.length > 1 ? tr('Mais rápido: ', 'Fastest tonight: ', 'El más rápido: ') + order[0].name : tr('Muito bem!', 'Well done!', '¡Muy bien!');
      UI.setClass(close, 'on', true);
      api.focusNode(close);
      timer = setTimeout(function () { if (open === api) api.close(); }, 90000);
    }

    api = UI.open({
      cls: 'bt-tidy',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        title = UI.el('div', 'bt-heading', box, picking ? tr('Quem vai arrumar?', "Who's tidying?", '¿Quién ordena?')
          : tr('Corrida da arrumação!', 'Tidy-up race!', '¡Carrera de ordenar!'));
        clock = UI.el('div', 'clock' + (picking ? ' waiting' : ''), box, '0:00');
        sub = UI.el('div', 'bt-sub', box, picking ? tr('Tire quem não vai, depois aperte Vai!', "Untick anyone who's out, then press Go!",
          'Quita a quien no juegue y pulsa ¡Ya!') : tr('Prontos, já! Quem terminar, aperte OK no seu rosto.',
          "Ready, set, go! When you're done, press OK on your face.", '¡Preparados, listos, ya! Cuando termines, pulsa OK en tu cara.'));
        var row = UI.el('div', 'faces', box), list = picking ? everyone : people;
        for (var i = 0; i < list.length; i++) {
          (function (p, i) {
            var f = UI.el('div', 'racer' + (picking && out[i] ? ' out' : ''), row);
            UI.avatar(p, f, 150);
            UI.el('div', 'name', f, p.name);
            var place = UI.el('div', 'place', f, picking && !out[i] ? '✓' : ' ');
            if (i === 0) firstFace = f;
            a.add(f, picking ? function () { out[i] = !out[i]; a.rebuild(); } : function () { done(p, f, place); }, {first: i === 0});
          })(list[i], i);
        }
        var buttons = UI.el('div', 'bt-buttons', box);
        if (waiting) {
          var off = new Date(Date.now() + OFF_AFTER), mm = off.getMinutes();
          nobody = UI.el('div', 'bt-sub nobody', box, tr('Ninguém em casa? A TV desliga sozinha às ', 'Nobody home? The TV turns itself off at ',
            '¿No hay nadie? La TV se apaga sola a las ') + off.getHours() + ':' + (mm < 10 ? '0' : '') + mm +
            tr(' se ninguém apertar um botão.', ' unless someone presses a button.', ' si nadie pulsa un botón.'));
        }
        if (picking) {
          a.add(UI.button(buttons, tr('Vai!', 'Go!', '¡Ya!'), null, 'primary'), go);
        } else {
          close = UI.button(buttons, tr('Fechar', 'Close', 'Cerrar'), null, 'close');
          a.add(close, function () { a.close(); });
        }
      },
      // Any button at all means somebody is home: the TV stays on. False lets the key do its usual job.
      key: function () {
        if (waiting) { waiting = false; clearTimeout(offTimer); if (nobody) nobody.style.display = 'none'; }
        return false;
      },
      closed: function () { clearTimeout(timer); clearTimeout(offTimer); open = null; }
    });
    if (waiting) {
      offTimer = setTimeout(function () {
        if (!waiting || open !== api) return;
        waiting = false;
        api.close();
        if (window.Sleep && Sleep.now) Sleep.now();
      }, OFF_AFTER);
    }
    open = api;
    if (!picking) { Chime.play(); tick(); }
    else timer = setTimeout(function () { if (open === api) api.close(); }, LONGEST);
    return api;
  }

  /** The alarm from Beyond Family ({at: "19:15", minutes, wake, days, awayUntil, offIfNobody}), or null when it's off. */
  function set(t) { setting = t && /^\d\d:\d\d$/.test(t.at) ? t : null; }

  // Once a minute: the race starts at its time, once a day, while Beyond TV is in front.
  setInterval(function () {
    if (!setting || document.hidden) return;
    var d = new Date(), hm = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    var day = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (hm !== setting.at || day === lastDay) return;
    lastDay = day;
    if (!goesOff(setting, d)) return;
    if (window.Bedtime && Bedtime.on()) return;
    start(setting.minutes, true);
  }, 20000);

  return {start: start, set: set, on: function () { return !!open; }, rules: {goesOff: goesOff, day: dayOf, OFF_AFTER: OFF_AFTER}};
})();
