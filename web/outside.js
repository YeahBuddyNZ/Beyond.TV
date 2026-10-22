/*
 * The fine day nudge: when it's fine out and somebody comes back to the home screen from a show, the TV suggests
 * going outside for a bit. Once a day at most, only in daylight, only when it's mild and dry for the next hour.
 *
 * "We're going out" starts a quiet clock. When somebody touches the remote again ten minutes or more later, the TV
 * says welcome back and, if it's linked to Beyond Family, offers to count the time as green time for whoever went:
 * the person watching, or everyone in the house when it was Family.
 *
 * Plain ES5, like the rest of web/.
 */
var Outside = (function () {
  'use strict';

  var SEEN = 'btv.nudge', OUT = 'btv.out';
  var MIN_OUT = 10 * 60000, MAX_OUT = 6 * 3600000;

  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function put(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  /** Mild, dry, daytime and staying that way for the next hour. Celsius, whatever the TV shows. */
  function fine(w, now) {
    if (!w || !w.isDay || w.temp === undefined) return false;
    var h = new Date(now).getHours();
    if (h < 9 || h >= 18) return false;
    if (w.code > 2 || w.temp < 13 || w.temp > 31) return false;
    var next = w.hours && w.hours[0];
    return !(next && (next.code >= 51 || !next.day));
  }

  /** The Beyond Family people who went: the person watching, or everyone when it's Family. */
  function who() {
    var me = Profiles.current(), ids = [], names = [];
    var people = me.together ? Profiles.list() : [me];
    for (var i = 0; i < people.length; i++) {
      if (people[i].family) { ids.push(people[i].family); names.push(people[i].name); }
    }
    return {ids: ids, names: names, together: !!me.together};
  }

  /** Called when the home screen comes back from another app. Shows the nudge if it's the day for it. */
  function maybeNudge() {
    if (UI.active() || get(OUT) || get(SEEN) === today()) return;
    var w = Data.weather;
    if (!fine(w, Date.now())) return;
    put(SEEN, today());
    UI.open({
      cls: 'bt-outside',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '☀');
        UI.heading(box, Data.degrees(w.temp) + tr(' e sol lá fora', ' and fine out there', ' y buen tiempo afuera'),
          tr('Que tal um tempo ao ar livre? A TV espera.', 'How about some time outside? The TV will wait.', '¿Un rato al aire libre? La tele espera.'));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Vamos sair', "We're going out", 'Salimos'), null, 'primary'), function () {
          put(OUT, {at: Date.now(), who: who().ids});
          a.close();
          UI.toast(tr('Divirtam-se! Contamos o tempo quando voltarem.', "Have fun! We'll count the time when you're back.", '¡A disfrutar! Contamos el tiempo cuando vuelvan.'));
        }, {first: true});
        a.add(UI.button(row, tr('Agora não', 'Not now', 'Ahora no')), function () { a.close(); });
      }
    });
  }

  /** Any key, or the TV coming back: if they went out a while ago, welcome them back. True when it showed. */
  function back() {
    var out = get(OUT);
    if (!out) return false;
    var away = Date.now() - out.at;
    if (away < MIN_OUT) return false;
    put(OUT, null);
    if (away > MAX_OUT) return false;  // a day out, or the TV left on: not a number worth counting
    var minutes = Math.max(10, Math.round(away / 60000 / 5) * 5);
    var ids = out.who || [];
    var linked = window.Family && Family.linked() && ids.length;
    if (!linked) {
      UI.toast(tr('Bem-vindos de volta! ', 'Welcome back! ', '¡Bienvenidos! ') + minutes + tr(' minutos lá fora.', ' minutes outside.', ' minutos afuera.'));
      return true;
    }
    UI.open({
      cls: 'bt-outside',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '🌿');
        UI.heading(box, tr('Bem-vindos de volta!', 'Welcome back!', '¡Bienvenidos!'),
          tr('Uns ', 'About ', 'Unos ') + minutes + tr(' minutos lá fora. Contar como tempo verde no Beyond Family?',
            ' minutes outside. Count it as green time in Beyond Family?',
            ' minutos afuera. ¿Contarlo como tiempo verde en Beyond Family?'));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, tr('Sim, contar', 'Yes, count it', 'Sí, contarlo'), null, 'primary'), function () {
          a.close();
          Family.green(ids, minutes, function (err) {
            UI.toast(err ? tr('Não deu para contar agora.', "Couldn't count it just now.", 'No se pudo contar ahora.')
              : tr('Contado! Está no mural de conquistas.', "Counted! It's on the Done wall.", '¡Contado! Está en el muro de logros.'));
          });
        }, {first: true});
        a.add(UI.button(row, tr('Não, obrigado', 'No thanks', 'No, gracias')), function () { a.close(); });
      }
    });
    return true;
  }

  return {maybeNudge: maybeNudge, back: back, fine: fine};
})();
