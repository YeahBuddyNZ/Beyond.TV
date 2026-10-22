/*
 * Have the pets been fed? When a kid picks their face on Who's watching, and the household's pets in Beyond Family
 * still want a meal, the TV asks. "Yes" ticks them fed in Beyond Family (the same record as the Family page's fed
 * button, with the kid's name); "Not yet" sends them off to do it, and the TV asks again next time, half an hour on.
 *
 * One meal is due from the morning and the rest from 3pm (Beyond Family works that out), so a cat fed at breakfast
 * isn't asked about at ten. Only when the TV is linked to Beyond Family and the household has pets.
 *
 * Plain ES5, like the rest of web/.
 */
var Pets = (function () {
  'use strict';

  var ASKED = 'btv.pets.asked', AGAIN = 30 * 60000, WAIT = 60000;
  var wanted = 0;   // a kid picked their face before the pets had arrived from Beyond Family

  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /** "Betty", "Betty and Chimmy", "Betty, Chimmy and Rex". */
  function names(list) {
    var n = list.map(function (p) { return p.name; });
    if (n.length < 2) return n.join('');
    return n.slice(0, -1).join(', ') + tr(' e ', ' and ', ' y ') + n[n.length - 1];
  }

  function due() {
    var all = window.Family && Family.pets ? Family.pets() : [];
    return all.filter(function (p) { return p.due; });
  }

  /** A kid of this household is watching. Visitors from another home aren't asked about these pets. */
  function kid() {
    var me = Profiles.current();
    return me && me.kid && me.family && !me.visitor ? me : null;
  }

  /** Called when somebody picks their face. Asks a kid about the pets still wanting a meal. */
  function ask() {
    var me = kid();
    if (!me || !window.Family || !Family.linked()) return;
    if (Date.now() - (get(ASKED) || 0) < AGAIN) return;
    if (!Family.havePets()) { wanted = Date.now(); return; }
    wanted = 0;
    var hungry = due();
    if (!hungry.length || UI.active()) return;
    put(ASKED, Date.now());
    UI.open({
      cls: 'bt-pets',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        var row = UI.el('div', 'faces', box);
        for (var i = 0; i < hungry.length && i < 5; i++) {
          var f = UI.el('div', 'pet', row);
          UI.avatar({name: hungry[i].name, emoji: hungry[i].face, colour: hungry[i].colour}, f, 150);
          UI.el('div', 'name', f, hungry[i].name);
        }
        UI.heading(box, tr('Já deram comida para ', 'Did ', '¿Ya le dieron de comer a ') + names(hungry) +
          tr(' hoje?', ' get fed today?', ' hoy?'), tr('Oi, ', 'Hey ', 'Hola, ') + me.name +
          tr('! O Beyond Family fica sabendo também.', ', Beyond Family will know too.', '. Beyond Family también se entera.'));
        var buttons = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(buttons, tr('Sim, já comeram', "Yes, they're fed", 'Sí, ya comieron'), null, 'primary'), function () {
          a.close();
          fed(hungry, me);
        }, {first: true});
        a.add(UI.button(buttons, tr('Ainda não', 'Not yet', 'Todavía no')), function () {
          a.close();
          UI.toast(tr('Vai lá! ', 'Off you go! ', '¡Anda! ') + names(hungry) + tr(' estão com fome.', ' would love some food.', ' tienen hambre.'));
        });
      }
    });
  }

  function fed(list, me) {
    Family.petsFed(list.map(function (p) { return p.id; }), me.family, function (err) {
      UI.toast(err ? tr('Não deu para avisar o Beyond Family agora.', "Couldn't tell Beyond Family just now.", 'No se pudo avisar a Beyond Family ahora.')
        : tr('Obrigado, ', 'Thanks, ', '¡Gracias, ') + me.name + tr('! Está marcado no Beyond Family.', "! It's ticked off in Beyond Family.", '! Quedó marcado en Beyond Family.'));
    });
  }

  /** The pets came from Beyond Family: if a kid picked their face just before, ask now. */
  function arrived() {
    if (wanted && Date.now() - wanted < WAIT) ask();
    wanted = 0;
  }

  return {ask: ask, arrived: arrived, names: names};
})();
