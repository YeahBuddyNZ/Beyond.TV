/*
 * Games, from the remote (ADR 0021, the pictures and groups ADR 0047): every game and family activity starts here on the TV, no phone needed. Karaoke,
 * board and card games against the robots (table.js), silly party games (laughs.js), Milo's Remote Control Land (rcland.js, ADR 0046), London's Candy Land (candy.js, ADR 0053), school lunches (lunch.js), a party, the light show (lights.js), quiz night, the dinner
 * question, the tidy-up race and bedtime (calm sounds, then the TV turns off), and How to play, a guide to every one (guides.js). Quiz night and the dinner question need Beyond Family, because
 * everyone answers on their phones. Same as GamesActivity.java. Plain ES5.
 */
var Games = (function () {
  'use strict';

  function linked() { return !!(window.Family && Family.linked()); }

  /**
   * The Games screen: a picture for each game, in groups (four since Build it, so the lower ones scroll up into view). Same groups and order as GamesActivity.java; the pictures
   * are web/games/<id>.jpg (tools/game_art.js), which build.sh also puts in the APK.
   */
  function groups() {
    return [
      {name: tr('Vamos jogar', 'Let\'s play', '¡A jugar!'), games: [
        ['rcland', tr('Terra do Controle Remoto do Milo', 'Milo\'s Remote Control Land', 'La Tierra Teledirigida de Milo'), function () { RCLand.open(); }],
        ['candy', tr('A Terra dos Doces da London', 'London\'s Candy Land', 'La Tierra de los Dulces de London'), function () { Candy.open(); }],
        ['arcade', tr('Fliperama', 'Arcade', 'Arcade'), function () { Arcade.open(); }],
        ['table', tr('Jogos de tabuleiro e cartas', 'Board and card games', 'Juegos de mesa y cartas'), function () { Table.open(); }],
        ['silly', tr('Jogos bobos', 'Silly games', 'Juegos locos'), function () { Laughs.open(); }],
        ['guides', tr('Como jogar', 'How to play', 'Cómo jugar'), function () { Guides.list(); }]]},
      // Build it (builder.js, ADR 0052): real building jobs, with the machines.
      {name: tr('Construir', 'Build it', 'A construir'), games: [
        ['road', tr('Construir uma estrada', 'Build a road', 'Construir una carretera'), function () { Builder.open('road'); }],
        ['bridge', tr('Construir uma ponte', 'Build a bridge', 'Construir un puente'), function () { Builder.open('bridge'); }],
        ['town', tr('Planejar uma cidade', 'Plan a town', 'Planear un pueblo'), function () { Builder.open('town'); }]]},
      {name: tr('Hora da festa', 'Party time', 'Hora de fiesta'), games: [
        ['karaoke', tr('Karaokê', 'Karaoke', 'Karaoke'), function () { Karaoke.choose(); }],
        ['party', tr('Festa', 'Party', 'Fiesta'), function () { Party.choose(); }],
        ['lights', tr('Show de luzes', 'Light show', 'Show de luces'), function () { Lights.open(); }],
        ['quiz', tr('Quiz da noite', 'Quiz night', 'Noche de quiz'), 'quiz'],
        ['dinner', tr('Pergunta do jantar', 'Dinner question', 'Pregunta de la cena'), 'question']]},
      {name: tr('Em casa', 'Round the house', 'En casa'), games: [
        ['lunch', tr('Lanches da escola', 'School lunches', 'Almuerzos del cole'), function () { Lunch.open(); }],
        ['tidy', tr('Corrida da arrumação', 'Tidy-up race', 'Carrera de ordenar'), function () { Tidy.start(10); }],
        ['bedtime', tr('Hora de dormir', 'Bedtime', 'Hora de dormir'), function () { Bedtime.choose(); }]]}
    ];
  }

  var heading = null, groupList = null;

  function open() {
    UI.open({
      cls: 'bt-games-hub',
      // A game opens on top of this screen, so leaving it (Back, Leave or Done) comes back here, one step (UI.leaveGame).
      hub: true,
      build: function (layer, a) {
        var top = UI.el('div', 'gh-top', layer);
        UI.heading(top, tr('Jogos', 'Games', 'Juegos'));
        var all = groups(), first = true, list = UI.el('div', 'gh-groups', layer);
        heading = top; groupList = list;
        for (var g = 0; g < all.length; g++) {
          var group = UI.el('div', 'gh-group', list);
          UI.el('div', 'gh-name', group, all[g].name);
          var row = UI.el('div', 'gh-row', group);
          for (var i = 0; i < all[g].games.length; i++) {
            (function (game) {
              var tile = UI.el('div', 'gh-tile', row);
              var pic = UI.el('div', 'gh-pic', tile);
              pic.style.backgroundImage = 'url(games/' + game[0] + '.jpg)';
              UI.el('div', 'gh-label', tile, game[1]);
              var run = typeof game[2] === 'string' ? function () { family(game[2], a); } : game[2];
              a.add(tile, run, {first: first});
              first = false;
            })(all[g].games[i]);
          }
        }
        // In the list after the last group, so it scrolls with them and never covers a row.
        if (!linked()) UI.el('div', 'gh-note', list, tr(
          'Quiz da noite e a pergunta do jantar precisam do Beyond Family: todos respondem no celular. Conecte em Configurações.',
          'Quiz night and the dinner question need Beyond Family, because everyone answers on their phone. Link it in Settings.',
          'La noche de quiz y la pregunta de la cena necesitan Beyond Family: todos responden en el teléfono. Conéctalo en Ajustes.'));
      },
      // More groups than fit: the list slides up so the focused row is on screen, and the heading steps aside.
      focused: function (node) {
        // The tile's row, then its group: the group's bottom must be on screen.
        var group = node.parentNode && node.parentNode.parentNode;
        if (!group || !groupList) return;
        var next = group.nextSibling, bottom = next && next.className === 'gh-note' ? groupList.offsetHeight : group.offsetTop + group.offsetHeight;
        var shift = Math.max(0, 166 + bottom - 1040);
        groupList.style.webkitTransform = groupList.style.transform = shift ? 'translateY(-' + shift + 'px)' : '';
        heading.style.opacity = shift > 40 ? '0' : '';
      }
    });
  }

  /** Quiz night or the dinner question: Beyond Family starts it, and its command opens the game on every TV. */
  function family(kind, a) {
    if (!linked()) {
      UI.toast(tr('Conecte o Beyond Family primeiro, em Configurações.', 'Link Beyond Family first, in Settings.', 'Conecta Beyond Family primero, en Ajustes.'));
      return;
    }
    Family.game(kind, 'start', function (err) { if (!err) a.close(); });
  }

  /** Every game in one list, {id, name, run}, for Find (find.js). */
  function list() {
    var out = [], all = groups();
    for (var g = 0; g < all.length; g++) {
      for (var i = 0; i < all[g].games.length; i++) (function (game) {
        out.push({id: game[0], name: game[1], run: typeof game[2] === 'string' ? function () { family(game[2], {close: function () {}}); } : game[2]});
      })(all[g].games[i]);
    }
    return out;
  }

  return {open: open, list: list};
})();
