/*
 * The tidy-up race: a big clock counting down and everyone's face. Whoever is done grabs the remote and presses OK on
 * their face: first, second, third. When everybody's done, or the time is up, the TV says so, kindly.
 *
 * Every night at the time a grown-up set in Beyond Family (TV > Tidy-up race), if Beyond TV is open then; or straight
 * away from the remote in Beyond Family. On LG and Samsung the app can't switch the TV on by itself, so it starts only
 * when the TV is on (Google TV turns itself on: Tidy.java). Same as TidyActivity.java.
 * Plain ES5, like the rest of web/.
 */
var Tidy = (function () {
  'use strict';

  var open = null, setting = null, lastDay = '';

  function racing() {
    var all = Profiles.list().filter(function (p) { return !p.visitor && !p.together; });
    var kids = all.filter(function (p) { return p.kid; });
    return kids.length ? kids : all.length ? all : [{name: tr('Família', 'Family', 'Familia'), together: true, colour: '#6E3DDB'}];
  }

  function start(minutes) {
    if (open) open.close();
    minutes = Math.max(1, Math.min(30, minutes || (setting && setting.minutes) || 10));
    var ends = Date.now() + minutes * 60000, timer = 0, over = false, order = [], people = racing();
    var clock, title, sub, close, api;

    function tick() {
      if (over) return;
      var left = Math.max(0, ends - Date.now()), s = Math.ceil(left / 1000);
      clock.textContent = Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
      UI.setClass(clock, 'late', s <= 60);
      if (!left) { end(false); return; }
      timer = setTimeout(tick, 250);
    }

    function done(p, node, place) {
      if (over || order.indexOf(p) >= 0) return;
      order.push(p);
      var n = order.length;
      place.textContent = n === 1 ? '🏆 ' + tr('1º', '1st', '1º') : n === 2 ? tr('2º', '2nd', '2º') : n === 3 ? tr('3º', '3rd', '3º')
        : '✓ ' + tr('Pronto', 'Done', 'Listo');
      UI.setClass(node, 'done', true);
      if (order.length === people.length) end(true);
    }

    function end(everyone) {
      over = true;
      clearTimeout(timer);
      Chime.play();
      if (everyone) {
        clock.textContent = '🎉';
        UI.setClass(clock, 'party', true);
        title.textContent = tr('Tudo arrumado!', 'All tidy!', '¡Todo ordenado!');
        sub.textContent = people.length > 1 ? tr('Mais rápido: ', 'Fastest tonight: ', 'El más rápido: ') + order[0].name : tr('Muito bem!', 'Well done!', '¡Muy bien!');
      } else {
        clock.textContent = '0:00';
        title.textContent = tr('Acabou o tempo!', "Time's up!", '¡Se acabó el tiempo!');
        sub.textContent = !order.length ? tr('Quase lá. Mais um pouquinho e pronto!', "Nearly there. A little more and it's done!", 'Casi. ¡Un poco más y listo!')
          : tr('Muito bem, ', 'Well done, ', '¡Muy bien, ') + order.map(function (p) { return p.name; }).join(', ')
            + tr('. Os outros, quase lá!', '. Everyone else, nearly there!', '. ¡Los demás, casi!');
      }
      UI.setClass(close, 'on', true);
      api.focusNode(close);
      timer = setTimeout(function () { if (open === api) api.close(); }, 90000);
    }

    api = UI.open({
      cls: 'bt-tidy',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        title = UI.el('div', 'bt-heading', box, '🧺  ' + tr('Corrida da arrumação!', 'Tidy-up race!', '¡Carrera de ordenar!'));
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
