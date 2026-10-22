/*
 * Bedtime breathing: a night light that breathes with the kids as they wind down, then fades to dark.
 *
 * A soft violet light in the middle of a black screen grows as you breathe in and shrinks as you breathe out. It
 * starts at six breaths a minute, the pace of the home screen's own breathing, and slows to about four and a half by
 * the end, because a body follows a slow rhythm down. The words "Breathe in" and "Breathe out" stay for the first
 * few breaths and then leave the light on its own. Over the last part it dims, and when the time is up the screen is
 * dark. Any key brings the TV back.
 *
 * Started from the moon at the top of the home screen in the evening, or from the Beyond Family app.
 * Plain ES5, and only transform and opacity animate, like the rest of web/.
 */
var Bedtime = (function () {
  'use strict';

  var FAST = 10000, SLOW = 13300;  // one breath: six a minute, slowing to about four and a half
  var WORDS_FOR = 6;                // breaths with the words before the light is on its own
  var DIM_FROM = 0.6;               // the last 40% of the time, the light dims to nothing
  var open = null;

  function start(minutes) {
    if (open) open.close();
    minutes = Math.max(5, Math.min(60, minutes || 15));
    var total = minutes * 60000, began = Date.now(), timers = [], breaths = 0;
    var light, glow, words, api;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function transition(node, ms, ease) {
      var t = 'transform ' + ms + 'ms ' + ease + ', opacity ' + ms + 'ms ' + ease;
      node.style.webkitTransition = t.replace(/transform/g, '-webkit-transform');
      node.style.transition = t;
    }

    function scale(node, s) { node.style.webkitTransform = node.style.transform = 'translate(-50%, -50%) scale(' + s + ')'; }

    function breathe() {
      var done = (Date.now() - began) / total;
      if (done >= 1) { light.style.opacity = '0'; glow.style.opacity = '0'; words.style.opacity = '0'; return; }
      var period = FAST + (SLOW - FAST) * Math.min(1, done / DIM_FROM);
      var bright = done < DIM_FROM ? 1 : Math.max(0, 1 - (done - DIM_FROM) / (1 - DIM_FROM));
      var inhale = period * 0.4, exhale = period - inhale;
      var say = breaths < WORDS_FOR;
      breaths++;

      transition(light, inhale, 'ease-in-out');
      transition(glow, inhale, 'ease-in-out');
      scale(light, 1);
      scale(glow, 1.15);
      light.style.opacity = (0.95 * bright).toFixed(3);
      glow.style.opacity = (0.55 * bright).toFixed(3);
      if (say) showWords(tr('Inspire', 'Breathe in', 'Inhala'));
      else words.style.opacity = '0';

      later(function () {
        transition(light, exhale, 'ease-in-out');
        transition(glow, exhale, 'ease-in-out');
        scale(light, 0.62);
        scale(glow, 0.7);
        light.style.opacity = (0.55 * bright).toFixed(3);
        glow.style.opacity = (0.25 * bright).toFixed(3);
        if (say) showWords(tr('Expire', 'Breathe out', 'Exhala'));
      }, inhale);
      later(breathe, period);
    }

    function showWords(text) {
      words.style.opacity = '0';
      later(function () { words.textContent = text; words.style.opacity = '0.75'; }, 400);
    }

    api = UI.open({
      cls: 'bt-bed',
      build: function (layer, a) {
        glow = UI.el('div', 'glow', layer);
        light = UI.el('div', 'light', layer);
        words = UI.el('div', 'words', layer);
        scale(light, 0.62);
        scale(glow, 0.7);
        // One invisible node so the layer has focus and OK does what Back does.
        a.add(UI.el('div', 'hold', layer), function () { a.close(); }, {first: true});
      },
      key: function () { api.close(); return true; },
      closed: function () {
        for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
        timers = [];
        open = null;
      }
    });
    open = api;
    later(breathe, 1200);
    return api;
  }

  return {
    start: start,
    on: function () { return !!open; },
    stop: function () { if (open) open.close(); }
  };
})();
