/*
 * The tidy-up race: a big clock counting up from 0:00 and everyone's face. Whoever is done grabs the remote and presses
 * OK on their face: first, second, third, with their time. When everybody's done the TV says who was fastest. A count
 * up, not a count down (Kyle, 29/10/2026), so nobody runs out of time; left open an hour, it closes.
 *
 * Every night at the time a grown-up set in Beyond Family (TV > Tidy-up race), if Beyond TV is open then; or straight
 * away from the remote in Beyond Family. On LG and Samsung the app can't switch the TV on by itself, so it starts only
 * when the TV is on (Google TV turns itself on: Tidy.java). Same as TidyActivity.java.
 * Plain ES5, like the rest of web/.
 */
var Tidy = (function () {
  'use strict';

  var open = null, setting = null, lastDay = '';
  var LONGEST = 60 * 60000;   // left open an hour, the race was forgotten

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

  function start(minutes) {
    if (open) open.close();
    // The minutes from Beyond Family no longer set an end: the clock counts up.
    var started = Date.now(), timer = 0, over = false, order = [], people = racing();
    var clock, title, sub, close, api;

    function tick() {
      if (over) return;
      var gone = Date.now() - started;
      clock.textContent = time(gone);
      if (gone >= LONGEST) { api.close(); return; }   // forgotten: nobody is racing any more
      timer = setTimeout(tick, 250);
    }

    function done(p, node, place) {
      if (over || order.indexOf(p) >= 0) return;
      order.push(p);
      var n = order.length;
      place.textContent = (n === 1 ? '🏆 ' + tr('1º', '1st', '1º') : n === 2 ? tr('2º', '2nd', '2º') : n === 3 ? tr('3º', '3rd', '3º')
        : '✓') + '  ' + time(Date.now() - started);
      UI.setClass(node, 'done', true);
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
        title = UI.el('div', 'bt-heading', box, tr('Corrida da arrumação!', 'Tidy-up race!', '¡Carrera de ordenar!'));
        clock = UI.el('div', 'clock', box);
        sub = UI.el('div', 'bt-sub', box, tr('Prontos, já! Quem terminar, aperte OK no seu rosto.',
          "Ready, set, go! When you're done, press OK on your face.", '¡Preparados, listos, ya! Cuando termines, pulsa OK en tu cara.'));
        var row = UI.el('div', 'faces', box);
        for (var i = 0; i < people.length; i++) {
          (function (p, i) {
            var f = UI.el('div', 'racer', row);
            UI.avatar(p, f, 150);
            UI.el('div', 'name', f, p.name);
            var place = UI.el('div', 'place', f, ' ');
            a.add(f, function () { done(p, f, place); }, {first: i === 0});
          })(people[i], i);
        }
        var buttons = UI.el('div', 'bt-buttons', box);
        close = UI.button(buttons, tr('Fechar', 'Close', 'Cerrar'), null, 'close');
        a.add(close, function () { a.close(); });
      },
      closed: function () { clearTimeout(timer); open = null; }
    });
    open = api;
    Chime.play();
    tick();
    return api;
  }

  /** The time from Beyond Family ({at: "19:15", minutes, wake}), or null when it's off. */
  function set(t) { setting = t && /^\d\d:\d\d$/.test(t.at) ? t : null; }

  // Once a minute: the race starts at its time, once a day, while Beyond TV is in front.
  setInterval(function () {
    if (!setting || document.hidden) return;
    var d = new Date(), hm = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    var day = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (hm !== setting.at || day === lastDay) return;
    lastDay = day;
    if (window.Bedtime && Bedtime.on()) return;
    start(setting.minutes);
  }, 20000);

  return {start: start, set: set, on: function () { return !!open; }};
})();
