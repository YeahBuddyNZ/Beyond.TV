/*
 * The sleep timer: the TV turns itself off after 15, 30, 60 or 90 minutes. Each press of Sleep Timer in the drawer
 * moves to the next choice and back to off. A minute before, a note says so. On LG the TV then turns off (its remote
 * control API asks once to allow it); on Samsung, which lets no app turn it off, the screen fades to black and any key
 * brings it back. Plain ES5, like the rest of web/.
 */
var Sleep = (function () {
  'use strict';

  var CHOICES = [0, 15, 30, 60, 90];
  var at = 0, warnTimer = null, offTimer = null;

  function left() { return at ? Math.max(0, Math.ceil((at - Date.now()) / 60000)) : 0; }

  function next() {
    var l = left();
    for (var i = 0; i < CHOICES.length; i++) if (CHOICES[i] > l) return CHOICES[i];
    return 0;
  }

  function clear() {
    clearTimeout(warnTimer);
    clearTimeout(offTimer);
    at = 0;
  }

  /** Sets the timer (0 turns it off); returns what it did, in words for a toast. */
  function set(minutes) {
    clear();
    if (!minutes) return tr('Timer de desligar desligado.', 'Sleep timer off.', 'Temporizador apagado.');
    at = Date.now() + minutes * 60000;
    warnTimer = setTimeout(function () {
      UI.toast(tr('A TV desliga em um minuto. Timer de desligar no menu para parar.',
        'The TV turns off in a minute. Sleep Timer in the menu stops it.',
        'La TV se apaga en un minuto. Temporizador en el menú lo detiene.'));
    }, Math.max(0, minutes * 60000 - 60000));
    offTimer = setTimeout(sleepNow, minutes * 60000);
    return tr('A TV desliga em ', 'The TV turns off in ', 'La TV se apaga en ') + minutes + ' min.';
  }

  function sleepNow() {
    at = 0;
    TV.powerOff(function (ok) { if (!ok) dark(); });
  }

  /** Where the TV can't be turned off: a black screen, slowly, until a key is pressed. */
  function dark() {
    var api = UI.open({
      cls: 'bt-sleep',
      build: function (layer, a) { a.add(UI.el('div', 'hold', layer), function () { a.close(); }, {first: true}); },
      key: function () { api.close(); return true; }
    });
  }

  return {
    press: function () { return set(next()); },
    left: left,
    set: set,
    /** Now, from a phone (ADR 0037). */
    now: function () { clear(); sleepNow(); }
  };
})();
