/*
 * Games, from the remote (ADR 0021): every game and family activity starts here on the TV, no phone needed. Karaoke,
 * board and card games against the robots (table.js), silly party games (laughs.js), a party, quiz night, the dinner
 * question, the tidy-up race and bedtime breathing. Quiz night and the dinner question need Beyond Family, because
 * everyone answers on their phones. Same as GamesActivity.java. Plain ES5.
 */
var Games = (function () {
  'use strict';

  function linked() { return !!(window.Family && Family.linked()); }

  function open() {
    UI.open({
      cls: 'bt-outside bt-party-pick bt-games',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '🎮');
        UI.heading(box, tr('Jogos', 'Games', 'Juegos'), tr('O que vamos fazer?', 'What shall we do?', '¿Qué hacemos?'));
        var row = UI.el('div', 'bt-buttons cakes', box);
        var games = [
          ['🎤', tr('Karaokê', 'Karaoke', 'Karaoke'), function () { a.close(); Karaoke.choose(); }],
          ['🎲', tr('Jogos de tabuleiro e cartas', 'Board and card games', 'Juegos de mesa y cartas'), function () { a.close(); Table.open(); }],
          ['🤪', tr('Jogos bobos', 'Silly games', 'Juegos locos'), function () { a.close(); Laughs.open(); }],
          ['🎉', tr('Festa', 'Party', 'Fiesta'), function () { a.close(); Party.choose(); }],
          ['🏆', tr('Quiz da noite', 'Quiz night', 'Noche de quiz'), function () { family('quiz', a); }],
          ['🍽', tr('Pergunta do jantar', 'Dinner question', 'Pregunta de la cena'), function () { family('question', a); }],
          ['🧹', tr('Corrida da arrumação', 'Tidy-up race', 'Carrera de ordenar'), function () { a.close(); Tidy.start(10); }],
          ['🌙', tr('Respirar para dormir', 'Bedtime breathing', 'Respirar para dormir'), function () { a.close(); Bedtime.start(15); }]
        ];
        for (var i = 0; i < games.length; i++) {
          a.add(UI.button(row, games[i][0] + '  ' + games[i][1], null, i === 0 ? 'primary' : ''), games[i][2], {first: i === 0});
        }
        if (!linked()) UI.el('div', 'bt-sub', box, tr(
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
