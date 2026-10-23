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

  /** Songs most families can sing, for a TV with no list of its own yet. Titles and artists only. Same as STARTERS in KaraokePickActivity.java. */
  var STARTERS = [
    ['Bohemian Rhapsody', 'Queen'], ["Don't Stop Believin'", 'Journey'], ['Shake It Off', 'Taylor Swift'],
    ['Let It Go', 'Idina Menzel'], ["How Far I'll Go", "Auli'i Cravalho"], ["We Don't Talk About Bruno", 'Encanto'],
    ['Dancing Queen', 'ABBA'], ['I Want It That Way', 'Backstreet Boys'], ['Sweet Caroline', 'Neil Diamond'],
    ['Happy', 'Pharrell Williams'], ["Can't Stop the Feeling!", 'Justin Timberlake'], ['Royals', 'Lorde'],
    ['Poi E', 'Pātea Māori Club'], ['Slice of Heaven', 'Dave Dobbyn'], ["Livin' on a Prayer", 'Bon Jovi']
  ];
  var MOST = 15;

  /**
   * Karaoke from the remote (ADR 0021): who's singing, then the song (the family's own, then ones everybody knows, or
   * any song typed on the remote, which goes on the family's list too), then the countdown. Same as
   * KaraokePickActivity.java.
   */
  function choose() {
    var singer = null, colour = '#6E3DDB', step = 'who', lead = null;
    /** The next step, focus on its first button. */
    function to(next, a) {
      step = next;
      a.rebuild();
      if (lead) a.focusNode(lead);
    }
    UI.open({
      cls: 'bt-outside bt-party-pick bt-karaoke-pick',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer), i;
        a.typing = null;
        lead = null;
        if (step === 'who') {
          UI.heading(box, '🎤 ' + tr('Noite de karaokê', 'Karaoke night', 'Noche de karaoke'), tr('Quem vai cantar?', "Who's singing?", '¿Quién canta?'));
          var row = UI.el('div', 'bt-buttons cakes', box), people = Profiles.list(), first = true;
          for (i = 0; i < people.length; i++) (function (p) {
            if (p.together || !p.name) return;
            var b = UI.button(row, p.name, null, first ? 'primary' : '');
            a.add(b, function () { singer = p.name; colour = p.colour || colour; to('song', a); }, {first: first});
            if (first) lead = b;
            first = false;
          })(people[i]);
          var all = UI.button(row, '🎶  ' + tr('Todo mundo junto', 'Everyone together', 'Todos juntos'), null, first ? 'primary' : '');
          a.add(all, function () { singer = ''; colour = '#6E3DDB'; to('song', a); }, {first: first});
          if (!lead) lead = all;
        } else if (step === 'song') {
          UI.heading(box, '🎤 ' + tr('Noite de karaokê', 'Karaoke night', 'Noche de karaoke'), singer
            ? tr('O que ' + singer + ' vai cantar?', "What's " + singer + ' singing?', '¿Qué canta ' + singer + '?')
            : tr('O que vamos cantar?', 'What are we singing?', '¿Qué cantamos?'));
          var songs = UI.el('div', 'bt-buttons cakes songs', box), seen = {}, count = 0;
          lead = UI.button(songs, '🔎  ' + tr('Achar outra música', 'Find another song', 'Buscar otra canción'), null, 'primary');
          a.add(lead, function () { to('find', a); }, {first: true});
          var ours = window.Family && Family.songs ? Family.songs() : [];
          for (i = 0; i < ours.length && count < MOST; i++, count++) (function (o) {
            seen[o.title.toLowerCase()] = true;
            a.add(UI.button(songs, o.title + (o.artist ? '  ·  ' + o.artist : '')), function () { sing2(o.title, o.artist || '', o.videoId); });
          })(ours[i]);
          for (i = 0; i < STARTERS.length && count < MOST; i++) (function (st) {
            if (seen[st[0].toLowerCase()]) return;
            count++;
            a.add(UI.button(songs, st[0] + '  ·  ' + st[1]), function () { sing2(st[0], st[1], null); });
          })(STARTERS[i]);
        } else {
          UI.heading(box, '🎤 ' + tr('Noite de karaokê', 'Karaoke night', 'Noche de karaoke'),
            tr('Diga ou digite a música e quem canta', 'Say or type the song and who sings it', 'Di o escribe la canción y quién la canta'));
          UI.keyboard(box, a, {max: 60, placeholder: tr('ex. Royals Lorde', 'e.g. Royals Lorde', 'p. ej. Royals Lorde'),
            spaceLabel: tr('Espaço', 'Space', 'Espacio'), doneLabel: tr('Cantar', 'Sing it', 'Cantar'), done: function (words) {
              if (!words) return;
              if (window.Family && Family.addSong) Family.addSong(words);
              sing2(words, '', null);
            }});
        }
        function sing2(title, artist, videoId) {
          a.close();
          start({name: singer, colour: colour, title: title, artist: artist, videoId: videoId, query: title + (artist ? ' ' + artist : '') + ' karaoke'});
        }
      },
      back: function () {
        var a = UI.top();
        if (step === 'find' && a) { to('song', a); return true; }
        if (step === 'song' && a) { to('who', a); return true; }
        return false;
      }
    });
  }

  return {start: start, choose: choose};
})();
