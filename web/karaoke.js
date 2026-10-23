/*
 * Karaoke night (ADR 0020, 0022). A night is a line-up of turns: a singer's first name and colour, a song, and a
 * YouTube video id or a search. Each turn shows who's up and counts down from five (OK starts now), then plays the
 * karaoke version in Beyond TV's own player, and when the song ends the next turn comes up by itself. The line-up is
 * a playlist (built here with the remote or on a phone), one song picked on the remote, or tonight's queue in Beyond
 * Family, which the TV asks for the next singer when a song ends. Without a video id it asks Beyond Family for the
 * best one (Sing King and Lost Panda first); only when there is none does it fall back to the YouTube app.
 * The words come from the video: Beyond never keeps lyrics. Same as KaraokeActivity.java. Plain ES5.
 */
var Karaoke = (function () {
  'use strict';

  var COUNT_FROM = 5;
  var LG_YOUTUBE = 'youtube.leanback.v4', SAMSUNG_YOUTUBE = '9Ur5IzDKqV.TizenYouTube';
  var VIOLET = '#6E3DDB';
  var showing = null;
  // The night under way: {turns, i, name, queue}. queue: ask Beyond Family for the next singer once the turns run out.
  var night = null;

  function validId(id) { return /^[A-Za-z0-9_-]{11}$/.test(id || ''); }

  /** One turn from Beyond Family's Next singer: tonight's queue carries on after it. */
  function start(c) {
    if (!c || !c.title) return;
    play([c], {queue: true});
  }

  /** A line-up, one turn after another. opts: {name, queue}. */
  function play(turns, opts) {
    var list = [];
    for (var i = 0; i < (turns || []).length; i++) if (turns[i] && turns[i].title) list.push(turns[i]);
    if (!list.length) return;
    opts = opts || {};
    night = {turns: list, i: 0, name: opts.name || '', queue: !!opts.queue};
    card();
  }

  /** The turn after this one: the line-up's next, tonight's queue's next, or the end of the night. */
  function onward() {
    if (!night) return;
    night.i++;
    if (night.i < night.turns.length) { card(); return; }
    if (night.queue && window.Family && Family.nextTurn) {
      var was = night;
      Family.nextTurn(function (turn) {
        if (night !== was) return;
        if (turn && turn.title) { night.turns.push(turn); card(); }
        else wrap();
      });
      return;
    }
    wrap();
  }

  /** Who's up, then a countdown. Back ends the night. */
  function card() {
    var c = night.turns[night.i], after = night.turns[night.i + 1] || c.next, mine = night;
    if (showing) showing.close();
    var left = COUNT_FROM, timer = 0, api;
    api = UI.open({
      cls: 'bt-outside bt-karaoke',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        if (night.name) UI.el('div', 'bt-sub list', box, '🎶 ' + night.name + '  ·  ' + (night.i + 1) + ' / ' + night.turns.length);
        var mic = UI.el('div', 'mic', box, '🎤');
        mic.style.background = c.colour || VIOLET;
        UI.el('div', 'who', box, c.name ? tr('Vez de ' + c.name + '!', c.name + "'s up!", '¡Le toca a ' + c.name + '!')
            : tr('Todo mundo junto!', 'Everyone together!', '¡Todos juntos!'));
        UI.el('div', 'bt-sub song', box, c.title + (c.artist ? ' · ' + c.artist : ''));
        var count = UI.el('div', 'count', box, counting(left));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, '🎤  ' + tr('Cantar agora', 'Sing now', 'Cantar ahora'), null, 'primary'), function () { go(); }, {first: true});
        a.add(UI.button(row, tr('Pular', 'Skip this one', 'Saltar')), function () { stop(); api.close(); onward(); });
        a.add(UI.button(row, tr('Terminar', 'Finish', 'Terminar')), function () { stop(); night = null; api.close(); });
        if (after && after.title) UI.el('div', 'after', box, tr('Depois: ', 'After that: ', 'Después: ') +
            (after.name || tr('todo mundo', 'everyone', 'todos')) + ' · ' + after.title);
        timer = setInterval(function () {
          left--;
          if (left <= 0) go();
          else count.textContent = counting(left);
        }, 1000);
      },
      back: function () { stop(); night = null; return false; },
      closed: function () {
        stop();
        if (showing === api) showing = null;
      }
    });
    showing = api;

    function stop() { clearInterval(timer); timer = 0; }
    function go() {
      stop();
      api.close();
      if (night === mine) sing(c);
    }
  }

  function counting(n) { return tr('Começa em ', 'Starting in ', 'Empieza en ') + n; }

  /** The song in our own player. Without a video id, Beyond Family finds the best one first. */
  function sing(c) {
    if (validId(c.videoId)) { player(c.videoId, ended); return; }
    if (window.Family && Family.findVideo && Family.linked()) {
      UI.toast(tr('Preparando a música…', 'Getting the song ready…', 'Preparando la canción…'));
      var mine = night;
      Family.findVideo(c.title, c.artist, function (id) {
        if (night !== mine) return;
        if (id) { c.videoId = id; player(id, ended); }
        else outside(c);
      });
      return;
    }
    outside(c);
  }

  /** The song is over (or stopped with Back, or wouldn't play here): on to the next singer. */
  function ended(why) {
    if (why === 'error') UI.toast(tr('Essa não toca aqui. Vamos para a próxima.', "That one won't play here. On to the next.", 'Esa no suena aquí. Vamos a la siguiente.'));
    onward();
  }

  /** No video to play here: the YouTube app with what to search for. The night stops, since we can't tell when it ends. */
  function outside(c) {
    night = null;
    var query = c.query || c.title + ' karaoke';
    if (TV.webos) {
      TV.launch(LG_YOUTUBE, null, function (ok) {
        UI.toast(ok ? tr('Procure no YouTube: ', 'Search YouTube for: ', 'Busca en YouTube: ') + query
          : tr('Abra o YouTube para cantar', 'Open YouTube to sing', 'Abre YouTube para cantar'));
      });
      return;
    }
    UI.toast(tr('Procure no YouTube: ', 'Search YouTube for: ', 'Busca en YouTube: ') + query);
    if (TV.samsung) TV.launch(SAMSUNG_YOUTUBE, null, function () {});
  }

  // MARK: - Our own player

  var apiState = 0, apiWaiting = [];

  /** YouTube's player API, loaded once. done(true) when ready, done(false) if it can't load. */
  function youtubeApi(done) {
    if (apiState === 2) { done(true); return; }
    if (apiState === 3) { done(false); return; }
    apiWaiting.push(done);
    if (apiState === 1) return;
    apiState = 1;
    var finish = function (ok) {
      if (apiState !== 1) return;
      apiState = ok ? 2 : 3;
      var w = apiWaiting;
      apiWaiting = [];
      for (var i = 0; i < w.length; i++) w[i](ok);
    };
    var was = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (was) was(); finish(true); };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () { finish(false); };
    document.getElementsByTagName('head')[0].appendChild(s);
    setTimeout(function () { finish(!!(window.YT && YT.Player)); }, 8000);
  }

  /**
   * The karaoke video full screen in Beyond TV itself. done('ended') when the song finishes, 'back' when stopped with
   * Back, 'error' when the video won't play inside other apps. Without YouTube's player API (no network to it) a plain
   * embed plays, and Back moves on.
   */
  function player(id, done) {
    var over = false, yt = null, api;
    function finish(why) {
      if (over) return;
      over = true;
      try { if (yt && yt.destroy) yt.destroy(); } catch (e) {}
      if (api) api.close();
      done(why);
    }
    api = UI.open({
      cls: 'bt-karaoke-player',
      build: function (layer) {
        var spot = UI.el('div', 'video', layer);
        UI.el('div', 'hint', layer, tr('Voltar para a próxima', 'Back for the next singer', 'Atrás para el siguiente'));
        youtubeApi(function (ok) {
          if (over) return;
          if (!ok) {
            var frame = UI.el('iframe', 'video', spot);
            frame.setAttribute('allow', 'autoplay; encrypted-media');
            frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
            return;
          }
          var inner = UI.el('div', '', spot);
          yt = new YT.Player(inner, {
            host: 'https://www.youtube-nocookie.com',
            videoId: id,
            width: '100%',
            height: '100%',
            playerVars: {autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, controls: 0, iv_load_policy: 3, fs: 0},
            events: {
              onReady: function (e) { try { e.target.playVideo(); } catch (x) {} },
              onStateChange: function (e) { if (e.data === 0) finish('ended'); },
              onError: function () { finish('error'); }
            }
          });
        });
      },
      back: function () { finish('back'); return true; },
      closed: function () { over = true; }
    });
  }

  /** The end of the night. */
  function wrap() {
    night = null;
    UI.open({
      cls: 'bt-outside bt-karaoke',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        var mic = UI.el('div', 'mic', box, '🎉');
        mic.style.background = VIOLET;
        UI.el('div', 'who', box, tr('Que noite!', "That's a wrap!", '¡Qué noche!'));
        var row = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(row, '🎤  ' + tr('Cantar outra', 'Sing another', 'Cantar otra'), null, 'primary'), function () { a.close(); choose(); }, {first: true});
        a.add(UI.button(row, tr('Pronto', 'Done', 'Listo')), function () { a.close(); });
      }
    });
  }

  // MARK: - Picking on the remote

  /** Songs most families can sing, for a TV with no list of its own yet. Titles and artists only. Same as STARTERS in KaraokePickActivity.java. */
  var STARTERS = [
    ['Bohemian Rhapsody', 'Queen'], ["Don't Stop Believin'", 'Journey'], ['Shake It Off', 'Taylor Swift'],
    ['Let It Go', 'Idina Menzel'], ["How Far I'll Go", "Auli'i Cravalho"], ["We Don't Talk About Bruno", 'Encanto'],
    ['Dancing Queen', 'ABBA'], ['I Want It That Way', 'Backstreet Boys'], ['Sweet Caroline', 'Neil Diamond'],
    ['Happy', 'Pharrell Williams'], ["Can't Stop the Feeling!", 'Justin Timberlake'], ['Royals', 'Lorde'],
    ['Poi E', 'Pātea Māori Club'], ['Slice of Heaven', 'Dave Dobbyn'], ["Livin' on a Prayer", 'Bon Jovi']
  ];
  var MOST = 15, PLAYLIST_MOST = 40;

  function linkedFamily() { return !!(window.Family && Family.linked && Family.linked() && Family.playlists); }

  /** The family's song by id, or null. */
  function songById(id) {
    var ours = window.Family && Family.songs ? Family.songs() : [];
    for (var i = 0; i < ours.length; i++) if (ours[i].id === id) return ours[i];
    return null;
  }

  /** Who's in the household, as the TV knows them: [{member, name, colour}]. */
  function people() {
    var out = [], all = Profiles.list();
    for (var i = 0; i < all.length; i++) {
      if (all[i].together || !all[i].name || all[i].visitor) continue;
      out.push({member: all[i].family ? String(all[i].family) : null, name: all[i].name, colour: all[i].colour || VIOLET});
    }
    return out;
  }

  function personOf(member) {
    var all = people();
    for (var i = 0; i < all.length; i++) if (member && all[i].member === member) return all[i];
    return null;
  }

  /** A playlist as turns to play: first names and colours, songs no longer on the list left out. */
  function turnsOf(p) {
    var out = [];
    for (var i = 0; i < p.items.length; i++) {
      var s = songById(p.items[i].songId);
      if (!s) continue;
      var who = personOf(p.items[i].memberId);
      out.push({name: who ? who.name : '', colour: who ? who.colour : VIOLET, title: s.title, artist: s.artist || '', videoId: s.videoId,
        query: s.title + (s.artist ? ' ' + s.artist : '') + ' karaoke'});
    }
    return out;
  }

  /**
   * Karaoke from the remote (ADR 0021, 0022). Linked to Beyond Family, it opens on the family's playlists: play one,
   * change one, or make a new one; or just sing a song now. Then who's singing, then the song (the family's own,
   * then ones everybody knows, or any song typed on the remote, which goes on the family's list too). In a playlist
   * the song is added to it; otherwise the countdown starts. Same as KaraokePickActivity.java.
   */
  function choose() {
    var hasLists = linkedFamily();
    var step = hasLists ? 'start' : 'who', lead = null;
    var singer = null, colour = VIOLET, member = null;
    // The playlist being built or looked at: {id, name, items}. building: who and song add to it instead of singing.
    var list = null, building = false, picked = -1, deleting = false;

    /** The next step, focus on its first button. */
    function to(next, a) {
      step = next;
      a.rebuild();
      if (lead) a.focusNode(lead);
    }

    function saveList(a, after) {
      Family.savePlaylist(list, function (saved) {
        if (saved) list = {id: saved.id, name: saved.name, items: saved.items.slice()};
        to(after || 'list', a);
      });
    }

    var title = '🎤 ' + tr('Noite de karaokê', 'Karaoke night', 'Noche de karaoke');
    UI.open({
      cls: 'bt-outside bt-party-pick bt-karaoke-pick',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer), i;
        a.typing = null;
        lead = null;
        if (step === 'start') {
          UI.heading(box, title, tr('Uma música agora, ou uma playlist?', 'One song now, or a playlist?', '¿Una canción ahora, o una lista?'));
          var row0 = UI.el('div', 'bt-buttons cakes', box);
          lead = UI.button(row0, '🎤  ' + tr('Cantar uma música', 'Sing a song', 'Cantar una canción'), null, 'primary');
          a.add(lead, function () { building = false; to('who', a); }, {first: true});
          var lists = Family.playlists();
          for (i = 0; i < lists.length; i++) (function (p) {
            a.add(UI.button(row0, '🎶  ' + p.name + '  ·  ' + p.items.length), function () {
              list = {id: p.id, name: p.name, items: p.items.slice()};
              picked = -1;
              deleting = false;
              to('list', a);
            });
          })(lists[i]);
          a.add(UI.button(row0, '＋  ' + tr('Nova playlist', 'New playlist', 'Nueva lista')), function () { to('name', a); });
        } else if (step === 'name') {
          UI.heading(box, title, tr('Como se chama a playlist?', "What's the playlist called?", '¿Cómo se llama la lista?'));
          UI.keyboard(box, a, {max: 40, placeholder: tr('ex. Sexta à noite', 'e.g. Friday night', 'p. ej. Viernes'),
            spaceLabel: tr('Espaço', 'Space', 'Espacio'), doneLabel: tr('Criar', 'Make it', 'Crear'), done: function (words) {
              if (!words) return;
              list = {name: words, items: []};
              picked = -1;
              saveList(a);
            }});
        } else if (step === 'list') {
          UI.heading(box, '🎶 ' + list.name, list.items.length
            ? tr('Toque numa música para mudar ou tirar', 'Pick a song to move it or take it out', 'Elige una canción para moverla o quitarla')
            : tr('Ainda vazia. Adicione músicas.', 'Empty so far. Add some songs.', 'Vacía. Añade canciones.'));
          var actions = UI.el('div', 'bt-buttons', box);
          if (list.items.length) {
            lead = UI.button(actions, '▶  ' + tr('Tocar', 'Play it', 'Reproducir'), null, 'primary');
            a.add(lead, function () {
              var turns = turnsOf(list);
              a.close();
              play(turns, {name: list.name});
            }, {first: true});
          }
          var addB = UI.button(actions, '＋  ' + tr('Adicionar música', 'Add a song', 'Añadir canción'), null, list.items.length ? '' : 'primary');
          a.add(addB, function () { building = true; to('who', a); }, {first: !list.items.length});
          if (!lead) lead = addB;
          a.add(UI.button(actions, deleting ? tr('Apertar de novo para apagar', 'Press again to delete', 'Pulsa otra vez para borrar')
              : tr('Apagar playlist', 'Delete playlist', 'Borrar lista')), function () {
            if (!deleting) { deleting = true; a.rebuild(); return; }
            Family.dropPlaylist(list.id, function () { list = null; deleting = false; to('start', a); });
          });
          var items = UI.el('div', 'bt-buttons cakes songs list', box);
          for (i = 0; i < list.items.length; i++) (function (it, n) {
            var s = songById(it.songId), who = personOf(it.memberId);
            var label = (n + 1) + '.  ' + (who ? who.name : tr('Todos', 'Everyone', 'Todos')) + '  ·  ' + (s ? s.title : '?');
            a.add(UI.button(items, label, null, picked === n ? 'primary' : ''), function () { picked = n; to('item', a); });
          })(list.items[i], i);
        } else if (step === 'item') {
          var it = list.items[picked], s1 = it && songById(it.songId), who1 = it && personOf(it.memberId);
          UI.heading(box, '🎶 ' + list.name, (picked + 1) + '.  ' + (who1 ? who1.name : tr('Todos', 'Everyone', 'Todos')) + '  ·  ' + (s1 ? s1.title : ''));
          var row1 = UI.el('div', 'bt-buttons cakes', box);
          var move = function (by) {
            var j = picked + by;
            if (j < 0 || j >= list.items.length) return;
            var x = list.items[picked];
            list.items[picked] = list.items[j];
            list.items[j] = x;
            picked = j;
            saveList(a, 'item');
          };
          if (picked > 0) a.add(lead = UI.button(row1, '⬆  ' + tr('Subir', 'Move up', 'Subir'), null, 'primary'), function () { move(-1); }, {first: true});
          if (picked < list.items.length - 1) {
            var down = UI.button(row1, '⬇  ' + tr('Descer', 'Move down', 'Bajar'), null, lead ? '' : 'primary');
            a.add(down, function () { move(1); }, {first: !lead});
            if (!lead) lead = down;
          }
          var out = UI.button(row1, '✕  ' + tr('Tirar', 'Take it out', 'Quitar'), null, lead ? '' : 'primary');
          a.add(out, function () { list.items.splice(picked, 1); picked = -1; saveList(a); }, {first: !lead});
          if (!lead) lead = out;
          a.add(UI.button(row1, tr('Pronto', 'Done', 'Listo')), function () { picked = -1; to('list', a); });
        } else if (step === 'who') {
          UI.heading(box, title, building ? tr('Quem canta essa?', 'Who sings this one?', '¿Quién canta esta?') : tr('Quem vai cantar?', "Who's singing?", '¿Quién canta?'));
          // A playlist keeps who sings by their Beyond Family id, so only the household's own people are offered there.
          var row = UI.el('div', 'bt-buttons cakes', box), folk = people().filter(function (p) { return !building || p.member; });
          for (i = 0; i < folk.length; i++) (function (p, n) {
            var b = UI.button(row, p.name, null, n === 0 ? 'primary' : '');
            a.add(b, function () { singer = p.name; colour = p.colour; member = p.member; to('song', a); }, {first: n === 0});
            if (n === 0) lead = b;
          })(folk[i], i);
          var all = UI.button(row, '🎶  ' + tr('Todo mundo junto', 'Everyone together', 'Todos juntos'), null, folk.length ? '' : 'primary');
          a.add(all, function () { singer = ''; colour = VIOLET; member = null; to('song', a); }, {first: !folk.length});
          if (!lead) lead = all;
        } else if (step === 'song') {
          UI.heading(box, title, singer
            ? tr('O que ' + singer + ' vai cantar?', "What's " + singer + ' singing?', '¿Qué canta ' + singer + '?')
            : tr('O que vamos cantar?', 'What are we singing?', '¿Qué cantamos?'));
          var songs = UI.el('div', 'bt-buttons cakes songs', box), seen = {}, count = 0;
          lead = UI.button(songs, '🔎  ' + tr('Achar outra música', 'Find another song', 'Buscar otra canción'), null, 'primary');
          a.add(lead, function () { to('find', a); }, {first: true});
          var ours = window.Family && Family.songs ? Family.songs() : [];
          for (i = 0; i < ours.length && count < MOST; i++, count++) (function (o) {
            seen[o.title.toLowerCase()] = true;
            a.add(UI.button(songs, o.title + (o.artist ? '  ·  ' + o.artist : '')), function () { picked2(o.title, o.artist || '', o.videoId, o.id); });
          })(ours[i]);
          for (i = 0; i < STARTERS.length && count < MOST; i++) (function (st) {
            if (seen[st[0].toLowerCase()]) return;
            count++;
            a.add(UI.button(songs, st[0] + '  ·  ' + st[1]), function () { picked2(st[0], st[1], null, null); });
          })(STARTERS[i]);
        } else {
          UI.heading(box, title,
            tr('Diga ou digite a música e quem canta', 'Say or type the song and who sings it', 'Di o escribe la canción y quién la canta'));
          UI.keyboard(box, a, {max: 60, placeholder: tr('ex. Royals Lorde', 'e.g. Royals Lorde', 'p. ej. Royals Lorde'),
            spaceLabel: tr('Espaço', 'Space', 'Espacio'), doneLabel: building ? tr('Adicionar', 'Add it', 'Añadir') : tr('Cantar', 'Sing it', 'Cantar'),
            done: function (words) { if (words) picked2(words, '', null, null, true); }});
        }

        /** A song was picked: into the playlist being built, or sung now. typed: it goes on the family's list too. */
        function picked2(t, artist, videoId, songId, typed) {
          if (building) {
            if (list.items.length >= PLAYLIST_MOST) { UI.toast(tr('A playlist está cheia', 'The playlist is full', 'La lista está llena')); return; }
            var put = function (id) {
              if (!id) { UI.toast(tr('Não deu certo. Tente de novo.', "That didn't work. Try again.", 'No funcionó. Inténtalo de nuevo.')); return; }
              list.items.push({songId: id, memberId: member});
              building = false;
              saveList(a);
            };
            if (songId) put(songId);
            else Family.addSong(t, artist, function (song) { put(song && song.id); });
            return;
          }
          if (typed && window.Family && Family.addSong) Family.addSong(t, artist);
          a.close();
          play([{name: singer, colour: colour, title: t, artist: artist, videoId: videoId, query: t + (artist ? ' ' + artist : '') + ' karaoke'}], {queue: true});
        }
      },
      focused: function (node) {
        // A long playlist scrolls inside its own box, never the screen.
        var box = node.parentNode;
        if (!box || (' ' + box.className + ' ').indexOf(' list ') < 0) return;
        var top = node.offsetTop - box.offsetTop;
        if (top < box.scrollTop) box.scrollTop = top;
        else if (top + node.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + node.offsetHeight - box.clientHeight;
      },
      back: function () {
        var a = UI.top();
        if (!a) return false;
        if (step === 'find') { to('song', a); return true; }
        if (step === 'song') { to('who', a); return true; }
        if (step === 'who' && building) { building = false; to('list', a); return true; }
        if (step === 'who' && hasLists) { to('start', a); return true; }
        if (step === 'item') { picked = -1; to('list', a); return true; }
        if (step === 'list' || step === 'name') { list = null; deleting = false; to('start', a); return true; }
        return false;
      }
    });
  }

  return {start: start, play: play, choose: choose};
})();
