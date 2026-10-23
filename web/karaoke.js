/*
 * Karaoke night (ADR 0020). Beyond Family keeps the family's songs and tonight's queue; Next singer sends a "karaoke"
 * command with the singer's first name and colour, the song, and a YouTube video id or a search. The TV shows who's
 * up, counts down from five (OK starts now, Back puts it away), then plays the karaoke version: on LG in the YouTube
 * app, on Samsung in a player of our own when the video is known, otherwise the YouTube app with what to search for.
 * The words come from the video: Beyond never keeps lyrics. Same as KaraokeActivity.java. Plain ES5.
 */
var Karaoke = (function () {
  'use strict';

  var COUNT_FROM = 5;
  var LG_YOUTUBE = 'youtube.leanback.v4', SAMSUNG_YOUTUBE = '9Ur5IzDKqV.TizenYouTube';
  var showing = null;

  function start(c) {
    if (!c || !c.title) return;
    if (showing) showing.close();
    var left = COUNT_FROM, timer = 0, api;
    api = UI.open({
      cls: 'bt-outside bt-karaoke',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        var mic = UI.el('div', 'mic', box, '🎤');
        mic.style.background = c.colour || '#6E3DDB';
        UI.el('div', 'who', box, c.name ? tr('Vez de ' + c.name + '!', c.name + "'s up!", '¡Le toca a ' + c.name + '!')
            : tr('Sua vez!', "You're up!", '¡Te toca!'));
        UI.el('div', 'bt-sub song', box, c.title + (c.artist ? ' · ' + c.artist : ''));
        var count = UI.el('div', 'count', box, counting(left));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, '🎤  ' + tr('Cantar agora', 'Sing now', 'Cantar ahora'), null, 'primary'), function () { go(); }, {first: true});
        if (c.next && c.next.name) UI.el('div', 'after', box, tr('Depois: ', 'After that: ', 'Después: ') + c.next.name + ' · ' + c.next.title);
        timer = setInterval(function () {
          left--;
          if (left <= 0) go();
          else count.textContent = counting(left);
        }, 1000);
      },
      back: function () { return false; },
      closed: function () {
        clearInterval(timer);
        if (showing === api) showing = null;
      }
    });
    showing = api;

    function go() {
      clearInterval(timer);
      api.close();
      sing(c);
    }
  }

  function counting(n) { return tr('Começa em ', 'Starting in ', 'Empieza en ') + n; }

  function sing(c) {
    var id = /^[A-Za-z0-9_-]{11}$/.test(c.videoId || '') ? c.videoId : '';
    var query = c.query || c.title + ' karaoke';
    if (TV.webos) {
      TV.launch(LG_YOUTUBE, id ? {contentTarget: 'v=' + id} : null, function (ok) {
        if (!ok) UI.toast(tr('Abra o YouTube para cantar', 'Open YouTube to sing', 'Abre YouTube para cantar'));
        else if (!id) UI.toast(tr('Procure no YouTube: ', 'Search YouTube for: ', 'Busca en YouTube: ') + query);
      });
      return;
    }
    if (id) { player(id); return; }
    UI.toast(tr('Procure no YouTube: ', 'Search YouTube for: ', 'Busca en YouTube: ') + query);
    if (TV.samsung) TV.launch(SAMSUNG_YOUTUBE, null, function () {});
  }

  /** The karaoke video full screen in Beyond TV itself. Back stops it. */
  function player(id) {
    UI.open({
      cls: 'bt-karaoke-player',
      build: function (layer) {
        var frame = UI.el('iframe', 'video', layer);
        frame.setAttribute('allow', 'autoplay; encrypted-media');
        frame.setAttribute('allowfullscreen', 'true');
        frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        UI.el('div', 'hint', layer, tr('Voltar para parar', 'Back to stop', 'Atrás para parar'));
      },
      back: function () { return false; }
    });
  }

  return {start: start};
})();
