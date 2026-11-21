/*
 * Games, from the remote (ADR 0021, the pictures and groups ADR 0047): every game and family activity starts here on the TV, no phone needed. Karaoke,
 * board and card games against the robots (table.js), silly party games (laughs.js), Milo's Remote Control Land (rcland.js, ADR 0046), school lunches (lunch.js), a party, the light show (lights.js), quiz night, the dinner
 * question, the tidy-up race and bedtime breathing, and How to play, a guide to every one (guides.js). Quiz night and the dinner question need Beyond Family, because
 * everyone answers on their phones. Same as GamesActivity.java. Plain ES5.
 */
var Games = (function () {
  'use strict';

  function linked() { return !!(window.Family && Family.linked()); }

  /**
   * The Games screen: a picture for each game, in three groups. Same groups and order as GamesActivity.java; the pictures
   * are web/games/<id>.jpg (tools/game_art.js), which build.sh also puts in the APK.
   */
  function groups() {
    return [
      {name: tr('Vamos jogar', 'Let\'s play', '¡A jugar!'), games: [
        ['rcland', tr('Terra do Controle Remoto do Milo', 'Milo\'s Remote Control Land', 'La Tierra Teledirigida de Milo'), function () { RCLand.open(); }],
        ['arcade', tr('Fliperama', 'Arcade', 'Arcade'), function () { Arcade.open(); }],
        ['table', tr('Jogos de tabuleiro e cartas', 'Board and card games', 'Juegos de mesa y cartas'), function () { Table.open(); }],
        ['silly', tr('Jogos bobos', 'Silly games', 'Juegos locos'), function () { Laughs.open(); }],
        ['guides', tr('Como jogar', 'How to play', 'Cómo jugar'), function () { Guides.list(); }]]},
      {name: tr('Hora da festa', 'Party time', 'Hora de fiesta'), games: [
        ['karaoke', tr('Karaokê', 'Karaoke', 'Karaoke'), function () { Karaoke.choose(); }],
        ['party', tr('Festa', 'Party', 'Fiesta'), function () { Party.choose(); }],
        ['lights', tr('Show de luzes', 'Light show', 'Show de luces'), function () { Lights.open(); }],
        ['quiz', tr('Quiz da noite', 'Quiz night', 'Noche de quiz'), 'quiz'],
        ['dinner', tr('Pergunta do jantar', 'Dinner question', 'Pregunta de la cena'), 'question']]},
      {name: tr('Em casa', 'Round the house', 'En casa'), games: [
        ['lunch', tr('Lanches da escola', 'School lunches', 'Almuerzos del cole'), function () { Lunch.open(); }],
        ['tidy', tr('Corrida da arrumação', 'Tidy-up race', 'Carrera de ordenar'), function () { Tidy.start(10); }],
        ['bedtime', tr('Respirar para dormir', 'Bedtime breathing', 'Respirar para dormir'), function () { Bedtime.start(15); }]]}
    ];
  }

  function open() {
    UI.open({
      cls: 'bt-games-hub',
      // A game opens on top of this screen, so leaving it (Back, Leave or Done) comes back here, one step (UI.leaveGame).
      hub: true,
      build: function (layer, a) {
        var top = UI.el('div', 'gh-top', layer);
        UI.heading(top, tr('Jogos', 'Games', 'Juegos'));
        var all = groups(), first = true, list = UI.el('div', 'gh-groups', layer);
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
        if (!linked()) UI.el('div', 'gh-note', layer, tr(
          'Quiz da noite e a pergunta do jantar precisam do Beyond Family: todos respondem no celular. Conecte em Configurações.',
          'Quiz night and the dinner question need Beyond Family, because everyone answers on their phone. Link it in Settings.',
          'La noche de quiz y la pregunta de la cena necesitan Beyond Family: todos responden en el teléfono. Conéctalo en Ajustes.'));
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

  return {open: open};
})();
