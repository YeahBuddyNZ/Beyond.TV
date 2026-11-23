/*
 * How to play (ADR 0043): a guide for every game, read with the remote before or during a game. Each guide is a few
 * short pages (the aim, the remote, the rules, tips), turned with left and right, in words a kid can follow. Games
 * open one guide (Guides.show), and the Games screen opens the lot (Guides.list). The board and card games add it to
 * the pause screen Back brings up, so a guide is one press away mid-game. The words are in all five languages here
 * (pt, en, es, de, ru), like the silly games' lines, because they are the game rather than the screen around it.
 * Google TV shows these same guides in TableActivity's WebView (start "guides"). Plain ES5.
 */
var Guides = (function () {
  'use strict';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  /** One line in the TV's language: [pt, en, es, de, ru]. */
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }

  var AIM = ['Qual é o objetivo?', 'What\'s the aim?', '¿Cuál es el objetivo?', 'Worum geht es?', 'Какая цель?'];
  var REMOTE = ['Com o controle', 'With the remote', 'Con el mando', 'Mit der Fernbedienung', 'С пультом'];
  var RULES = ['As regras', 'The rules', 'Las reglas', 'Die Regeln', 'Правила'];
  var TIPS = ['Dicas', 'Top tips', 'Consejos', 'Tipps', 'Советы'];
  var PIECES = ['As peças', 'The pieces', 'Las piezas', 'Die Figuren', 'Фигуры'];
  var SPECIAL = ['Lances especiais', 'Special moves', 'Jugadas especiales', 'Besondere Züge', 'Особые ходы'];
  var ENDING = ['Como termina', 'How it ends', 'Cómo termina', 'Wie es endet', 'Как заканчивается'];

  function page(title, lines) { return {title: title, lines: lines}; }

  var SLAP_REMOTE = [
    ['As cartas viram sozinhas, uma por jogador.', 'The cards turn over by themselves, one player after another.', 'Las cartas se dan la vuelta solas, un jugador tras otro.', 'Die Karten drehen sich von allein um, ein Spieler nach dem anderen.', 'Карты открываются сами, по очереди у каждого игрока.'],
    ['Aperte OK para bater.', 'Press OK to slap.', 'Pulsa OK para dar un golpe.', 'Drück OK zum Hauen.', 'Нажмите OK, чтобы хлопнуть.']
  ];
  var ARCADE_BACK = ['Voltar pausa o jogo. OK continua, e Voltar de novo sai.', 'Back pauses the game. OK carries on, and Back again leaves.', 'Atrás pausa el juego. OK sigue, y Atrás otra vez sale.', 'Zurück pausiert das Spiel. OK spielt weiter, und noch einmal Zurück beendet es.', '«Назад» ставит игру на паузу. OK продолжает, а ещё раз «Назад» выходит.'];
  var KEEPS = ['Ela continua andando até você apertar outra seta.', 'It keeps going until you press another arrow.', 'Sigue moviéndose hasta que pulses otra flecha.', 'Es bewegt sich weiter, bis du einen anderen Pfeil drückst.', 'Движение продолжается, пока не нажмёте другую стрелку.'];
  var NO_LOSERS = ['Ninguém ganha nem perde: é para rir junto.', 'Nobody wins or loses: it\'s for laughing together.', 'Nadie gana ni pierde: es para reírse juntos.', 'Niemand gewinnt oder verliert: Es geht ums gemeinsame Lachen.', 'Никто не выигрывает и не проигрывает: это чтобы посмеяться вместе.'];
  var BE_KIND = ['Seja gentil: é para rir, nunca para alguém se sentir mal.', 'Be kind: it\'s for laughs, never to make someone feel bad.', 'Sé amable: es para reír, nunca para que alguien se sienta mal.', 'Sei nett: Es ist zum Lachen, nie damit sich jemand schlecht fühlt.', 'Будьте добры: это ради смеха, а не чтобы кого-то обидеть.'];
  var PHONES = ['Precisa do Beyond Family: todos respondem no celular. Conecte em Configurações.', 'Needs Beyond Family, because everyone answers on their phone. Link it in Settings.', 'Necesita Beyond Family: todos responden en el teléfono. Conéctalo en Ajustes.', 'Braucht Beyond Family, weil alle auf dem Handy antworten. Verbinde es in den Einstellungen.', 'Нужен Beyond Family: все отвечают на телефонах. Подключите его в настройках.'];

  var GUIDES = {
    ludo: {icon: '🎲', name: ['Ludo', 'Ludo', 'Ludo', 'Ludo', 'Лудо'], pages: [
      page(AIM, [['Seja o primeiro a levar todas as suas peças pelo tabuleiro até o meio.', 'Be the first to get all your tokens round the board and home to the middle.', 'Sé el primero en llevar todas tus fichas alrededor del tablero hasta el centro.', 'Bring als Erster alle deine Figuren einmal um das Brett und ins Ziel in der Mitte.', 'Первым проведите все свои фишки по кругу и домой, в центр.']]),
      page(REMOTE, [
        ['OK joga o dado.', 'OK rolls the dice.', 'OK tira el dado.', 'OK würfelt.', 'OK бросает кубик.'],
        ['◀ ▶ escolhe a peça. As que podem andar brilham.', '◀ ▶ picks a token. The ones that can move glow.', '◀ ▶ elige una ficha. Las que pueden moverse brillan.', '◀ ▶ wählt eine Figur. Die, die ziehen können, leuchten.', '◀ ▶ выбирает фишку. Те, что могут ходить, светятся.'],
        ['OK de novo move a peça.', 'OK again moves it.', 'OK otra vez la mueve.', 'Nochmal OK zieht sie.', 'Ещё раз OK, и фишка идёт.']]),
      page(RULES, [
        ['Precisa de um seis para tirar uma peça de casa. Seis joga de novo.', 'You need a six to bring a token out. A six rolls again.', 'Necesitas un seis para sacar una ficha. Un seis vuelve a tirar.', 'Du brauchst eine Sechs, um eine Figur herauszubringen. Mit einer Sechs würfelst du nochmal.', 'Чтобы вывести фишку, нужна шестёрка. После шестёрки бросаете ещё раз.'],
        ['Caiu em cima de alguém? Ele volta para casa e você joga de novo.', 'Land on someone and they go back home, and you roll again.', '¿Caes sobre alguien? Vuelve a casa y tú tiras otra vez.', 'Landest du auf jemandem, muss er zurück nach Hause, und du würfelst nochmal.', 'Встали на чужую фишку: она уходит домой, а вы бросаете ещё раз.'],
        ['Numa estrela ou numa casa de saída ninguém é pego.', 'Nobody can be caught on a star or a start square.', 'En una estrella o en una casilla de salida nadie puede ser capturado.', 'Auf einem Stern oder einem Startfeld kann niemand geschlagen werden.', 'На звезде и на клетке старта фишку срубить нельзя.'],
        ['Para chegar em casa, precisa do número exato. Chegar joga de novo.', 'Getting home takes the exact number, and rolls again.', 'Para llegar a casa necesitas el número exacto, y vuelves a tirar.', 'Ins Ziel kommst du nur mit der genauen Zahl, und dann würfelst du nochmal.', 'Домой нужно точное число, и после этого бросаете снова.']]),
      page(TIPS, [
        ['Espalhe as peças em vez de correr com uma só.', 'Spread your tokens out rather than racing just one.', 'Reparte las fichas en vez de correr con una sola.', 'Verteile deine Figuren, statt nur mit einer loszurennen.', 'Двигайте разные фишки, а не гоните одну.'],
        ['Alguém logo atrás? Pare numa estrela.', 'Someone close behind you? Stop on a star.', '¿Alguien justo detrás? Párate en una estrella.', 'Jemand dicht hinter dir? Bleib auf einem Stern stehen.', 'Кто-то близко сзади? Встаньте на звезду.'],
        ['Partida rápida: 2 peças cada. Completa: 4.', 'A quick game is 2 tokens each, a full game 4.', 'Partida rápida: 2 fichas cada uno. Completa: 4.', 'Ein schnelles Spiel hat 2 Figuren pro Person, ein ganzes 4.', 'Быстрая игра: по 2 фишки. Полная: по 4.']])
    ]},

    chess: {icon: '♞', name: ['Xadrez', 'Chess', 'Ajedrez', 'Schach', 'Шахматы'], pages: [
      page(AIM, [
        ['Dê xeque-mate no rei do outro lado: ataque o rei de um jeito que ele não tenha saída.', 'Checkmate the other king: attack it so it has no way out.', 'Da jaque mate al otro rey: atácalo de modo que no tenga salida.', 'Setze den anderen König schachmatt: Greif ihn so an, dass er nicht entkommen kann.', 'Поставьте мат королю соперника: атакуйте его так, чтобы ему некуда было уйти.'],
        ['As brancas começam, e cada um joga uma vez.', 'White goes first, then you take turns.', 'Empiezan las blancas, y luego os turnáis.', 'Weiß fängt an, dann seid ihr abwechselnd dran.', 'Белые ходят первыми, потом по очереди.']]),
      page(REMOTE, [
        ['As setas andam com o quadrado pelo tabuleiro.', 'The arrows move the square around the board.', 'Las flechas mueven el cuadro por el tablero.', 'Die Pfeile bewegen das Kästchen über das Brett.', 'Стрелки двигают рамку по доске.'],
        ['OK pega uma peça: os lances dela aparecem como pontos.', 'OK picks up a piece: its moves show as dots.', 'OK coge una pieza: sus jugadas aparecen como puntos.', 'OK nimmt eine Figur: Ihre Züge erscheinen als Punkte.', 'OK берёт фигуру: её ходы показаны точками.'],
        ['Setas até um ponto, OK para colocar. Voltar solta a peça.', 'Arrows to a dot, OK to put it there. Back puts it down.', 'Flechas hasta un punto, OK para dejarla. Atrás la suelta.', 'Pfeile zu einem Punkt, OK setzt sie dort hin. Zurück legt sie wieder ab.', 'Стрелками к точке, OK ставит фигуру. «Назад» кладёт её обратно.']]),
      page(PIECES, [
        ['Peão: uma casa para a frente (duas na primeira vez). Captura na diagonal.', 'Pawn: one square forward (two on its first move). Takes one square diagonally forward.', 'Peón: una casilla hacia delante (dos en su primera jugada). Captura en diagonal.', 'Bauer: ein Feld vor (beim ersten Zug zwei). Schlägt schräg nach vorn.', 'Пешка: на одну клетку вперёд (первым ходом на две). Бьёт по диагонали вперёд.'],
        ['Cavalo: em L, e pula por cima das peças.', 'Knight: an L shape, and it jumps over pieces.', 'Caballo: en L, y salta por encima de las piezas.', 'Springer: in L-Form, und er springt über Figuren.', 'Конь: буквой «Г» и перепрыгивает фигуры.'],
        ['Bispo: na diagonal. Torre: em linha reta. Rainha: as duas coisas.', 'Bishop: diagonals. Rook: straight lines. Queen: both.', 'Alfil: en diagonal. Torre: en línea recta. Dama: las dos cosas.', 'Läufer: schräg. Turm: gerade. Dame: beides.', 'Слон: по диагонали. Ладья: по прямой. Ферзь: и так, и так.'],
        ['Rei: uma casa para qualquer lado.', 'King: one square any way.', 'Rey: una casilla en cualquier dirección.', 'König: ein Feld in jede Richtung.', 'Король: на одну клетку в любую сторону.']]),
      page(SPECIAL, [
        ['Roque: o rei anda duas casas até uma torre e a torre pula para o outro lado dele.', 'Castling: the king moves two squares towards a rook, and the rook hops over to its other side.', 'Enroque: el rey va dos casillas hacia una torre y la torre salta al otro lado.', 'Rochade: Der König zieht zwei Felder zu einem Turm, und der Turm springt auf seine andere Seite.', 'Рокировка: король идёт на две клетки к ладье, а ладья перепрыгивает через него.'],
        ['Promoção: um peão que chega ao outro lado vira rainha.', 'Promotion: a pawn that reaches the far side becomes a queen.', 'Coronación: un peón que llega al otro lado se convierte en dama.', 'Umwandlung: Ein Bauer, der die andere Seite erreicht, wird zur Dame.', 'Превращение: пешка, дошедшая до края, становится ферзём.'],
        ['En passant: um peão que andou duas casas e parou ao lado do seu pode ser pego como se tivesse andado uma, só no lance seguinte.', 'En passant: a pawn that moved two squares and stopped beside yours can be taken as if it moved one, but only straight away.', 'Al paso: un peón que avanzó dos casillas y quedó junto al tuyo puede capturarse como si avanzara una, solo en ese momento.', 'En passant: Ein Bauer, der zwei Felder zog und neben deinem steht, kann geschlagen werden, als wäre er eins gezogen, aber nur sofort.', 'Взятие на проходе: пешку, прошедшую две клетки мимо вашей, можно взять, будто она сделала один шаг, но только сразу.']]),
      page(ENDING, [
        ['Xeque: o rei está sendo atacado. Saia do xeque: mexa o rei, bloqueie ou capture quem ataca.', 'Check: the king is under attack. Get out of it: move the king, block, or take the attacker.', 'Jaque: el rey está atacado. Sal de él: mueve el rey, bloquea o captura al atacante.', 'Schach: Der König wird angegriffen. Wehr es ab: König ziehen, dazwischenstellen oder den Angreifer schlagen.', 'Шах: король под ударом. Уйдите от шаха: отойдите королём, закройтесь или возьмите нападающего.'],
        ['Xeque-mate: xeque sem saída. Fim de jogo!', 'Checkmate: check with no way out. Game over!', 'Jaque mate: jaque sin salida. ¡Fin de la partida!', 'Schachmatt: Schach ohne Ausweg. Spiel vorbei!', 'Мат: шах, от которого не уйти. Конец игры!'],
        ['Afogado: o rei não está em xeque mas não há lance. Empate! Também é empate com poucas peças, a mesma posição três vezes ou 50 lances sem capturas nem peões.', 'Stalemate: not in check but no move to make. A draw! It\'s also a draw with too few pieces, the same position three times, or 50 moves with nothing taken and no pawn moved.', 'Ahogado: sin jaque pero sin jugadas. ¡Tablas! También hay tablas con pocas piezas, la misma posición tres veces o 50 jugadas sin capturas ni peones.', 'Patt: kein Schach, aber kein Zug möglich. Unentschieden! Unentschieden ist es auch bei zu wenig Figuren, dreimal derselben Stellung oder 50 Zügen ohne Schlagen und ohne Bauernzug.', 'Пат: шаха нет, но ходить нечем. Ничья! Ничья и тогда, когда мало фигур, позиция повторилась трижды или 50 ходов без взятий и ходов пешками.']]),
      page(TIPS, [
        ['Novo no xadrez? Escolha Aprender xadrez: lições passo a passo e depois uma partida com um treinador.', 'New to chess? Pick Learn chess: step-by-step lessons, then a game with a coach.', '¿Nuevo en el ajedrez? Elige Aprender ajedrez: lecciones paso a paso y luego una partida con un entrenador.', 'Neu beim Schach? Wähl Schach lernen: Schritt für Schritt, dann eine Partie mit Trainer.', 'Впервые играете? Выберите «Учимся шахматам»: уроки по шагам, потом партия с тренером.'],
        ['Antes de mexer, veja o que o outro lado está atacando.', 'Before you move, look at what the other side is attacking.', 'Antes de mover, mira qué está atacando el otro lado.', 'Bevor du ziehst, schau, was die andere Seite angreift.', 'Перед ходом посмотрите, что атакует соперник.']])
    ]},

    chant: {icon: '🐑', name: ['Ovelha, Pinguim, Vulcão', 'Sheep, Penguin, Volcano', 'Oveja, Pingüino, Volcán', 'Schaf, Pinguin, Vulkan', 'Овца, Пингвин, Вулкан'], pages: [
      page(AIM, [['Fique sem cartas primeiro.', 'Get rid of all your cards first.', 'Quédate sin cartas el primero.', 'Werde als Erster alle deine Karten los.', 'Первым избавьтесь от всех карт.']]),
      page(REMOTE, SLAP_REMOTE),
      page(RULES, [
        ['A cada carta, a mesa diz a próxima palavra: Ovelha, Pinguim, Vulcão, Peixe, Sorvete, e de novo.', 'With each card the table says the next word: Sheep, Penguin, Volcano, Fish, Hokey pokey, round and round.', 'Con cada carta la mesa dice la siguiente palabra: Oveja, Pingüino, Volcán, Pez, Helado, y otra vez.', 'Bei jeder Karte sagt der Tisch das nächste Wort: Schaf, Pinguin, Vulkan, Fisch, Eis, immer weiter.', 'С каждой картой стол говорит следующее слово: Овца, Пингвин, Вулкан, Рыба, Мороженое, и по кругу.'],
        ['A carta é igual à palavra? Bata!', 'Card the same as the word? Slap!', '¿La carta es igual a la palabra? ¡Golpe!', 'Karte gleich dem Wort? Hau drauf!', 'Карта совпала со словом? Хлоп!'],
        ['O último a bater leva o monte. Bater sem combinar também leva.', 'The last to slap takes the pile. Slapping when it isn\'t a match takes it too.', 'El último en golpear se lleva el montón. Golpear sin coincidencia, también.', 'Wer zuletzt haut, nimmt den Stapel. Wer ohne Treffer haut, auch.', 'Кто хлопнул последним, забирает стопку. Хлопнули без совпадения: тоже забираете.'],
        ['Sem cartas? Bata a tempo na próxima e você ganha.', 'Out of cards? Slap the next match in time and you win.', '¿Sin cartas? Golpea a tiempo en la siguiente y ganas.', 'Keine Karten mehr? Hau beim nächsten Treffer rechtzeitig, und du gewinnst.', 'Карты кончились? Успейте хлопнуть на следующем совпадении и выиграете.']]),
      page(TIPS, [
        ['Digam as palavras em voz alta, todos juntos.', 'Say the words out loud together.', 'Decid las palabras en voz alta, todos juntos.', 'Sagt die Wörter laut zusammen.', 'Говорите слова вслух все вместе.'],
        ['Deixe o polegar em cima do OK.', 'Rest your thumb on OK.', 'Deja el pulgar encima del OK.', 'Lass den Daumen auf OK liegen.', 'Держите большой палец на OK.']])
    ]},

    snap: {icon: '🃏', name: ['Snap', 'Snap', 'Snap', 'Snap', 'Снап'], pages: [
      page(AIM, [['Fique sem cartas primeiro.', 'Get rid of all your cards first.', 'Quédate sin cartas el primero.', 'Werde als Erster alle deine Karten los.', 'Первым избавьтесь от всех карт.']]),
      page(REMOTE, SLAP_REMOTE),
      page(RULES, [
        ['Uma carta igual à de baixo? Bata!', 'A card the same as the one under it? Slap!', '¿Una carta igual a la de debajo? ¡Golpe!', 'Eine Karte gleich der darunter? Hau drauf!', 'Карта такая же, как под ней? Хлоп!'],
        ['O último a bater leva o monte. Bater sem par também leva.', 'The last to slap takes the pile. Slapping with no match takes it too.', 'El último en golpear se lleva el montón. Golpear sin pareja, también.', 'Wer zuletzt haut, nimmt den Stapel. Wer ohne Paar haut, auch.', 'Кто хлопнул последним, забирает стопку. Хлопнули без пары: тоже забираете.'],
        ['Sem cartas? Bata a tempo no próximo par e você ganha.', 'Out of cards? Slap the next match in time and you win.', '¿Sin cartas? Golpea a tiempo en la siguiente pareja y ganas.', 'Keine Karten mehr? Hau beim nächsten Paar rechtzeitig, und du gewinnst.', 'Карты кончились? Успейте хлопнуть на следующей паре и выиграете.']]),
      page(TIPS, [['Olhe a carta de baixo, não só a nova.', 'Watch the card underneath, not just the new one.', 'Mira la carta de debajo, no solo la nueva.', 'Achte auf die Karte darunter, nicht nur auf die neue.', 'Следите за картой снизу, а не только за новой.']])
    ]},

    likely: {icon: '👉', name: ['Quem é mais provável…?', 'Who\'s most likely to…?', '¿Quién es más probable que…?', 'Wer würde am ehesten…?', 'Кто скорее всего…?'], pages: [
      page(AIM, [NO_LOSERS]),
      page(REMOTE, [
        ['A TV mostra algo bobo. Pense um pouco.', 'The TV shows something silly. Have a think.', 'La tele muestra algo loco. Piénsalo un momento.', 'Der Fernseher zeigt etwas Lustiges. Denk kurz nach.', 'Телевизор показывает что-то смешное. Подумайте.'],
        ['Ela conta até três sozinha, e todos apontam para alguém.', 'It counts to three by itself, then everyone points at someone.', 'Cuenta hasta tres sola y todos señalan a alguien.', 'Er zählt von allein bis drei, dann zeigen alle auf jemanden.', 'Он сам считает до трёх, и все показывают на кого-то.'],
        ['Aperte OK em quem tem mais dedos apontando.', 'Press OK on whoever has the most fingers pointing at them.', 'Pulsa OK sobre quien tenga más dedos señalándole.', 'Drück OK bei dem, auf den die meisten Finger zeigen.', 'Нажмите OK на том, на кого показывает больше пальцев.']]),
      page(TIPS, [BE_KIND])
    ]},

    rather: {icon: '⚖️', name: ['Você prefere?', 'Would you rather?', '¿Qué prefieres?', 'Was wäre dir lieber?', 'Что бы ты выбрал?'], pages: [
      page(AIM, [NO_LOSERS]),
      page(REMOTE, [
        ['Duas opções bobas aparecem, uma de cada lado.', 'Two silly choices come up, one on each side.', 'Salen dos opciones locas, una a cada lado.', 'Zwei lustige Möglichkeiten erscheinen, eine auf jeder Seite.', 'Появляются два смешных варианта, по одному с каждой стороны.'],
        ['Na contagem, cada um vai para o lado da sala que escolheu.', 'On the count, everyone goes to their side of the room.', 'En la cuenta, cada uno va a su lado de la sala.', 'Beim Zählen geht jeder auf seine Seite des Zimmers.', 'По счёту каждый идёт на свою сторону комнаты.'],
        ['Aperte OK no lado com mais gente.', 'Press OK on the side with more people.', 'Pulsa OK en el lado con más gente.', 'Drück OK auf der Seite mit mehr Leuten.', 'Нажмите OK на стороне, где больше людей.']]),
      page(TIPS, [['Perguntem uns aos outros: por quê?', 'Ask each other why.', 'Preguntaos por qué.', 'Fragt euch gegenseitig, warum.', 'Спросите друг друга: почему?']])
    ]},

    dare: {icon: '🌀', name: ['Gire para um desafio', 'Spin for a dare', 'Gira para un reto', 'Dreh für eine Mutprobe', 'Крути и выполняй'], pages: [
      page(AIM, [NO_LOSERS]),
      page(REMOTE, [
        ['Aperte OK para girar a roda.', 'Press OK to spin.', 'Pulsa OK para girar.', 'Drück OK zum Drehen.', 'Нажмите OK, чтобы крутить.'],
        ['Ela escolhe alguém e um desafio bobo.', 'It picks someone, and a silly dare for them.', 'Elige a alguien y un reto loco para esa persona.', 'Es wählt jemanden und eine lustige Mutprobe für ihn.', 'Он выбирает кого-то и смешное задание для него.'],
        ['Fez? Gire de novo. Não quer? Escolha Passo.', 'Done it? Spin again. Don\'t want to? Pick Pass.', '¿Hecho? Gira otra vez. ¿No quieres? Elige Paso.', 'Geschafft? Dreh nochmal. Keine Lust? Wähl Passe.', 'Сделали? Крутите снова. Не хотите? Выберите «Пас».']]),
      page(TIPS, [BE_KIND])
    ]},

    eel: {icon: '🐍', name: ['Enguia', 'Eel', 'Anguila', 'Aal', 'Угорь'], pages: [
      page(AIM, [['Coma frutas para crescer o máximo possível.', 'Eat fruit to grow as long as you can.', 'Come fruta para crecer todo lo que puedas.', 'Friss Obst, damit du so lang wie möglich wirst.', 'Ешьте фрукты и растите как можно длиннее.']]),
      page(REMOTE, [
        ['As setas viram a enguia.', 'The arrows turn the eel.', 'Las flechas giran la anguila.', 'Die Pfeile lenken den Aal.', 'Стрелки поворачивают угря.'],
        KEEPS, ['OK pausa o jogo.', 'OK pauses the game.', 'OK pausa el juego.', 'OK pausiert das Spiel.', 'OK ставит игру на паузу.'], ARCADE_BACK]),
      page(RULES, [['Não se morda: bater em você mesmo termina o jogo.', 'Don\'t bite yourself: bumping into your own tail ends the game.', 'No te muerdas: chocar con tu cola termina el juego.', 'Beiß dich nicht selbst: Stößt du an deinen Schwanz, ist das Spiel vorbei.', 'Не кусайте себя: врезались в свой хвост, игра окончена.']]),
      page(TIPS, [['Pense uma curva à frente, principalmente quando estiver comprida.', 'Think one turn ahead, especially once you\'re long.', 'Piensa una curva por adelantado, sobre todo cuando seas larga.', 'Denk eine Kurve voraus, besonders wenn du lang bist.', 'Думайте на поворот вперёд, особенно когда угорь длинный.']])
    ]},

    paddle: {icon: '🏓', name: ['Raquete', 'Paddle', 'Pala', 'Schläger', 'Ракетка'], pages: [
      page(AIM, [['Passe a bola pelo robô. O primeiro a 7 ganha.', 'Get the ball past the robot. First to 7 wins.', 'Pasa la pelota al robot. Gana el primero en llegar a 7.', 'Bring den Ball am Roboter vorbei. Wer zuerst 7 hat, gewinnt.', 'Пробейте мяч мимо робота. Кто первым наберёт 7, побеждает.']]),
      page(REMOTE, [
        ['Cima e baixo movem a raquete, e ela continua. OK para.', 'Up and down move your paddle and it keeps going. OK stops it.', 'Arriba y abajo mueven la pala y sigue sola. OK la para.', 'Hoch und runter bewegen deinen Schläger, und er fährt weiter. OK hält ihn an.', 'Вверх и вниз двигают ракетку, и она продолжает ехать. OK останавливает.'],
        ARCADE_BACK]),
      page(TIPS, [['O robô fica mais rápido toda vez que você vence. Bater com a ponta da raquete manda a bola em ângulo.', 'The robot gets quicker each time you win. Hitting with the end of the paddle sends the ball off at an angle.', 'El robot es más rápido cada vez que ganas. Golpear con la punta de la pala manda la pelota en ángulo.', 'Der Roboter wird jedes Mal schneller, wenn du gewinnst. Triffst du mit dem Ende des Schlägers, fliegt der Ball schräg.', 'Робот ускоряется каждый раз, когда вы выигрываете. Удар краем ракетки отправляет мяч под углом.']])
    ]},

    guard: {icon: '🚀', name: ['Guarda do Céu', 'Sky Guard', 'Guardia del Cielo', 'Himmelswache', 'Небесный страж'], pages: [
      page(AIM, [['Pare as águas-vivas do espaço antes que cheguem lá embaixo.', 'Stop the space jellies before they reach the bottom.', 'Detén las medusas del espacio antes de que lleguen abajo.', 'Halte die Weltraumquallen auf, bevor sie unten ankommen.', 'Остановите космических медуз, пока они не добрались донизу.']]),
      page(REMOTE, [
        ['Esquerda e direita levam a nave, e ela continua. Baixo para.', 'Left and right move your ship and it keeps going. Down stops it.', 'Izquierda y derecha mueven la nave y sigue sola. Abajo la para.', 'Links und rechts bewegen dein Schiff, und es fliegt weiter. Runter hält es an.', 'Влево и вправо двигают корабль, и он летит дальше. Вниз останавливает.'],
        ['OK atira, até três tiros de cada vez.', 'OK fires, up to three shots at a time.', 'OK dispara, hasta tres tiros a la vez.', 'OK schießt, bis zu drei Schüsse auf einmal.', 'OK стреляет, до трёх выстрелов сразу.'],
        ARCADE_BACK]),
      page(TIPS, [['Você tem três vidas. Pare embaixo de uma água-viva e atire.', 'You have three lives. Stop under a jelly, then fire.', 'Tienes tres vidas. Párate debajo de una medusa y dispara.', 'Du hast drei Leben. Halt unter einer Qualle an, dann schieß.', 'У вас три жизни. Остановитесь под медузой и стреляйте.']])
    ]},

    dots: {icon: '🟡', name: ['Caça-pontos', 'Dot Chase', 'Caza-puntos', 'Punktejagd', 'Охота за точками'], pages: [
      page(AIM, [['Coma todos os pontos sem ser pego pelos fantasmas.', 'Eat every dot without the ghosts catching you.', 'Come todos los puntos sin que te pillen los fantasmas.', 'Friss alle Punkte, ohne dass dich die Geister erwischen.', 'Съешьте все точки, и не попадитесь призракам.']]),
      page(REMOTE, [
        ['As setas escolhem o caminho.', 'The arrows pick your way.', 'Las flechas eligen el camino.', 'Die Pfeile wählen deinen Weg.', 'Стрелки выбирают путь.'],
        KEEPS, ['OK para.', 'OK stops you.', 'OK te para.', 'OK hält dich an.', 'OK останавливает.'], ARCADE_BACK]),
      page(TIPS, [['Um ponto grande deixa os fantasmas com medo: aí você pode pegá-los. Você tem três vidas.', 'A big dot makes the ghosts scared: then you can catch them. You have three lives.', 'Un punto grande asusta a los fantasmas: entonces puedes atraparlos. Tienes tres vidas.', 'Ein großer Punkt macht den Geistern Angst: Dann kannst du sie fangen. Du hast drei Leben.', 'Большая точка пугает призраков: тогда их можно ловить. У вас три жизни.']])
    ]},

    rcland: {icon: '🏎', name: ['Terra do Controle Remoto do Milo', 'Milo\'s Remote Control Land', 'La Tierra Teledirigida de Milo', 'Milos Fernsteuer-Land', 'Страна машинок Майло'], pages: [
      page(AIM, [
        ['Escolha uma máquina e dirija pelo parque: pule das rampas, dê mortais e quebre tudo.', 'Pick a machine and drive round the park: jump off ramps, do flips and smash things.', 'Elige una máquina y conduce por el parque: salta de las rampas, haz volteretas y rompe cosas.', 'Such dir eine Maschine aus und fahr durch den Park: über Rampen springen, Saltos machen, Sachen zerlegen.', 'Выберите машину и катайтесь по парку: прыгайте с трамплинов, делайте сальто и всё крушите.'],
        ['Os desafios no canto mostram o que fazer a seguir.', 'The challenges in the corner show you what to try next.', 'Los retos de la esquina te dicen qué probar después.', 'Die Aufgaben in der Ecke zeigen dir, was du als Nächstes probieren kannst.', 'Задания в углу подскажут, что попробовать дальше.']]),
      page(REMOTE, [
        ['▲ vai mais rápido, ▼ mais devagar. Do parado, ▼ dá ré.', '▲ goes faster, ▼ slower. Stopped, ▼ goes backwards.', '▲ más rápido, ▼ más lento. Parado, ▼ va marcha atrás.', '▲ schneller, ▼ langsamer. Im Stand fährt ▼ rückwärts.', '▲ быстрее, ▼ медленнее. Стоя на месте, ▼ едет назад.'],
        ['◀ ▶ vira um pouco a cada toque.', '◀ ▶ turns a bit with each press.', '◀ ▶ gira un poco con cada pulsación.', '◀ ▶ lenkt mit jedem Drücken ein Stück.', '◀ ▶ поворачивает понемногу с каждым нажатием.'],
        ['OK pula. A escavadeira bate a pá e quebra tudo em volta.', 'OK jumps. The digger slams its bucket and smashes everything round it.', 'OK salta. La excavadora golpea con la pala y rompe todo alrededor.', 'OK springt. Der Bagger haut mit der Schaufel und zerlegt alles drumherum.', 'OK прыгает. Экскаватор бьёт ковшом и крушит всё вокруг.'],
        ARCADE_BACK]),
      page(['Truques', 'Tricks', 'Trucos', 'Tricks', 'Трюки'], [
        ['No ar: ▲ ou OK dá um mortal, ▼ um mortal para trás, ◀ ▶ um giro.', 'In the air: ▲ or OK does a front flip, ▼ a back flip, ◀ ▶ a spin.', 'En el aire: ▲ u OK hace una voltereta, ▼ una hacia atrás, ◀ ▶ un giro.', 'In der Luft: ▲ oder OK macht einen Salto, ▼ einen Rückwärtssalto, ◀ ▶ einen Dreher.', 'В воздухе: ▲ или OK делает сальто, ▼ сальто назад, ◀ ▶ вращение.'],
        ['Termine o truque antes de cair. Parou na metade? Capota, e tenta de novo.', 'Finish the trick before you land. Stop halfway and you wipe out, then try again.', 'Termina el truco antes de caer. ¿A medias? Vuelcas, y lo intentas otra vez.', 'Mach den Trick fertig, bevor du landest. Halb fertig? Du kippst um und versuchst es nochmal.', 'Закончите трюк до приземления. Не успели? Перевернётесь, и попробуете снова.'],
        ['Quebrar, pegar estrelas e acertar truques seguidos faz um combo: x2, x3, até x5.', 'Smashing, stars and tricks one after another build a combo: x2, x3, all the way to x5.', 'Romper, coger estrellas y hacer trucos seguidos forma un combo: x2, x3, hasta x5.', 'Zerlegen, Sterne und Tricks hintereinander ergeben eine Kombo: x2, x3, bis x5.', 'Крушите, собирайте звёзды и делайте трюки подряд: будет комбо x2, x3, до x5.']]),
      page(TIPS, [
        ['Mais rápido na rampa, mais alto o pulo. Os turbos roxos dão um empurrão.', 'The faster you hit a ramp, the higher you fly. The purple turbo pads give you a push.', 'Cuanto más rápido llegas a la rampa, más alto vuelas. Los turbos morados te empujan.', 'Je schneller du auf die Rampe fährst, desto höher fliegst du. Die lila Turbofelder geben Schwung.', 'Чем быстрее на трамплин, тем выше полёт. Фиолетовые турбо подталкивают.'],
        ['Pedras e carros velhos são duros: use o caminhão monstro, a escavadeira ou o trator.', 'Rocks and old cars are tough: try the monster truck, the digger or the bulldozer.', 'Las rocas y los coches viejos son duros: prueba el camión monstruo, la excavadora o el bulldozer.', 'Felsen und alte Autos sind hart: Nimm den Monstertruck, den Bagger oder die Planierraupe.', 'Камни и старые машины прочные: берите монстр-трак, экскаватор или бульдозер.'],
        ['Passe pelos lanches saudáveis (maçã, cenoura, banana, brócolis) para ganhar pontos. Desvie dos doces com anel vermelho: tiram pontos.', 'Drive through the healthy snacks (apple, carrot, banana, broccoli) for points. Dodge the sugary ones in a red ring: they take points off.', 'Pasa por los snacks sanos (manzana, zanahoria, plátano, brócoli) para ganar puntos. Esquiva los dulces con anillo rojo: quitan puntos.', 'Fahr durch die gesunden Snacks (Apfel, Karotte, Banane, Brokkoli) für Punkte. Weich den süßen im roten Ring aus: die kosten Punkte.', 'Собирайте полезную еду (яблоко, морковь, банан, брокколи) за очки. Объезжайте сладкое в красном кольце: оно отнимает очки.'],
        ['O mapa no canto mostra as estrelas que faltam.', 'The map in the corner shows the stars still to find.', 'El mapa de la esquina muestra las estrellas que faltan.', 'Die Karte in der Ecke zeigt die Sterne, die noch fehlen.', 'Карта в углу показывает оставшиеся звёзды.']]),
      page(['Câmeras', 'Cameras', 'Cámaras', 'Kameras', 'Камеры'], [
        ['Três câmeras: de cima, atrás da máquina e primeira pessoa, sentado no banco do piloto.', 'Three cameras: from above, chase (behind your machine) and first person, in the driver\'s seat.', 'Tres cámaras: desde arriba, detrás de la máquina y primera persona, en el asiento del piloto.', 'Drei Kameras: von oben, hinterher (hinter deiner Maschine) und Ich-Sicht, auf dem Fahrersitz.', 'Три камеры: сверху, сзади машины и от первого лица, с места водителя.'],
        ['Dirigindo: aperte Voltar e depois ◀ ▶. A câmera em uso aparece embaixo da pontuação.', 'While you drive: press Back, then ◀ ▶. The camera you are on shows under your score.', 'Mientras conduces: pulsa Atrás y luego ◀ ▶. La cámara actual aparece bajo tu puntuación.', 'Beim Fahren: drück Zurück, dann ◀ ▶. Die Kamera steht unter deinem Punktestand.', 'Во время езды: нажмите «Назад», затем ◀ ▶. Текущая камера видна под счётом.'],
        ['Ou escolha na tela das máquinas (▼ até Câmera). Botões coloridos, canal ▲ ▼ ou 1, 2 e 3 também trocam, se o controle tiver.', 'Or pick one on the machines screen (▼ down to Camera). The coloured buttons, channel up and down, or 1, 2 and 3 change it too, if your remote has them.', 'O elígela en la pantalla de máquinas (▼ hasta Cámara). Los botones de colores, canal ▲ ▼ o 1, 2 y 3 también la cambian, si tu mando los tiene.', 'Oder wähl sie auf dem Maschinen-Bildschirm (▼ bis Kamera). Bunte Tasten, Kanal hoch und runter oder 1, 2 und 3 gehen auch, wenn die Fernbedienung sie hat.', 'Или выберите на экране машин (▼ до «Камера»). Цветные кнопки, каналы вверх и вниз или 1, 2 и 3 тоже меняют её, если они есть на пульте.']]),
      page(['Na água', 'On the water', 'En el agua', 'Auf dem Wasser', 'На воде'], [
        ['Na tela das máquinas, ▲ ▼ leva a Na água: jet ski, lancha, prancha de surfe e esqui aquático.', 'On the machines screen, ▲ ▼ takes you to On the water: jet ski, speedboat, surfboard and water skis.', 'En la pantalla de máquinas, ▲ ▼ te lleva a En el agua: moto de agua, lancha, tabla de surf y esquí acuático.', 'Auf dem Maschinen-Bildschirm bringt dich ▲ ▼ zu Auf dem Wasser: Jetski, Rennboot, Surfbrett und Wasserski.', 'На экране машин ▲ ▼ ведёт к «На воде»: гидроцикл, катер, доска для сёрфинга и водные лыжи.'],
        ['Na água você desliza depois de virar. Pule das rampas de esqui, passe pelos aros e cuidado com as ilhas.', 'On the water you slide on after a turn. Fly off the ski ramps, go through the hoops and steer round the islands.', 'En el agua sigues deslizando después de girar. Salta de las rampas de esquí, pasa por los aros y esquiva las islas.', 'Auf dem Wasser rutschst du nach einer Kurve weiter. Spring über die Schanzen, flieg durch die Ringe und fahr um die Inseln.', 'На воде после поворота машину ещё заносит. Прыгайте с трамплинов, пролетайте через кольца и объезжайте острова.'],
        ['Com a prancha, pegue uma onda à direita do lago: ela te leva, e no topo você voa.', 'On the surfboard, catch a wave on the right of the lake: it carries you, and off the top you fly.', 'Con la tabla, coge una ola a la derecha del lago: te lleva, y desde arriba vuelas.', 'Mit dem Surfbrett erwischst du rechts auf dem See eine Welle: Sie trägt dich, und oben fliegst du ab.', 'На доске поймайте волну справа на озере: она понесёт, а с гребня вы взлетите.']]),
      page(['Corrida', 'Race', 'Carrera', 'Rennen', 'Гонка'], [
        ['Na tela das máquinas, ▼ até Modo: Corrida para um jogador, ou Corrida: 2 jogadores.', 'On the machines screen, ▼ down to Mode: Race on your own, or Race: 2 players.', 'En la pantalla de máquinas, ▼ hasta Modo: Carrera tú solo, o Carrera: 2 jugadores.', 'Auf dem Maschinen-Bildschirm ▼ bis Modus: Rennen allein oder Rennen: 2 Spieler.', 'На экране машин ▼ до «Режим»: «Гонка» одному или «Гонка: 2 игрока».'],
        ['Passe pelos portões em ordem: a seta mostra o próximo. Duas voltas, e o tempo corre.', 'Drive through the gates in order: the arrow shows the next one. Two laps, against the clock.', 'Pasa por las puertas en orden: la flecha marca la siguiente. Dos vueltas, contra el reloj.', 'Fahr der Reihe nach durch die Tore: der Pfeil zeigt das nächste. Zwei Runden, gegen die Uhr.', 'Проезжайте ворота по порядку: стрелка показывает следующие. Два круга на время.'],
        ['Truques contam: cada 500 pontos tira um segundo do seu tempo. O menor total ganha.', 'Stunts count: every 500 stunt points takes a second off your time. The lowest total wins.', 'Los trucos cuentan: cada 500 puntos quitan un segundo a tu tiempo. Gana el total más bajo.', 'Stunts zählen: je 500 Punkte ziehen eine Sekunde von deiner Zeit ab. Die niedrigste Summe gewinnt.', 'Трюки считаются: каждые 500 очков снимают секунду с вашего времени. Побеждает наименьший итог.'],
        ['Com dois jogadores, vocês se revezam: o jogador 1 corre, depois passa o controle para o jogador 2.', 'With two players you take turns: player 1 races, then passes the remote to player 2.', 'Con dos jugadores os turnáis: corre el jugador 1 y luego pasa el mando al jugador 2.', 'Zu zweit wechselt ihr euch ab: Spieler 1 fährt, dann bekommt Spieler 2 die Fernbedienung.', 'Вдвоём играют по очереди: сначала игрок 1, потом пульт переходит игроку 2.']]),
    ]},

    road: {icon: '🚧', name: ['Construir uma estrada', 'Build a road', 'Construir una carretera', 'Eine Straße bauen', 'Построить дорогу'], pages: [
      page(AIM, [
        ['Construa uma estrada de verdade, do terreno vazio até os primeiros carros passarem.', 'Build a real road, from an empty paddock to the first cars driving on it.', 'Construye una carretera de verdad, desde el campo vacío hasta que pasen los primeros coches.', 'Bau eine echte Straße, von der leeren Weide bis zu den ersten Autos darauf.', 'Постройте настоящую дорогу: от пустого поля до первых машин на ней.'],
        ['A lista de trabalhos em cima mostra cada passo, na ordem em que é feito de verdade.', 'The job list along the top shows every step, in the order it is done for real.', 'La lista de trabajos de arriba muestra cada paso, en el orden en que se hace de verdad.', 'Die Arbeitsliste oben zeigt jeden Schritt, in der echten Reihenfolge.', 'Список работ вверху показывает каждый шаг в том порядке, как это делают по-настоящему.']]),
      page(REMOTE, [
        ['Primeiro escolha a máquina certa: ◀ ▶ e OK. Errou? Ela conta o que faz, e você tenta outra.', 'First pick the right machine: ◀ ▶ and OK. Wrong one? It tells you what it does, and you try another.', 'Primero elige la máquina correcta: ◀ ▶ y OK. ¿Te equivocaste? Te dice lo que hace, y pruebas otra.', 'Wähl zuerst die richtige Maschine: ◀ ▶ und OK. Falsch? Sie sagt dir, was sie macht, und du probierst eine andere.', 'Сначала выберите нужную машину: ◀ ▶ и OK. Не та? Она расскажет, что умеет, и вы выберете другую.'],
        ['Depois ◀ ▶ leva a máquina pela estrada, e OK faz o trabalho dela ali.', 'Then ◀ ▶ drives the machine along the road, and OK does its job right there.', 'Luego ◀ ▶ lleva la máquina por la carretera, y OK hace su trabajo ahí.', 'Dann fährt ◀ ▶ die Maschine die Straße entlang, und OK erledigt dort ihre Arbeit.', 'Потом ◀ ▶ ведёт машину вдоль дороги, а OK делает её работу в этом месте.'],
        ['Na pavimentadora, ▲ ▼ mudam a velocidade. No pintor de faixas, OK pinta quando o spray passa por uma marca.', 'On the paver, ▲ ▼ change the speed. On the line marker, OK paints as the sprayer passes a mark.', 'En la pavimentadora, ▲ ▼ cambian la velocidad. En el pintalíneas, OK pinta cuando el pulverizador pasa por una marca.', 'Beim Fertiger ändern ▲ ▼ das Tempo. Beim Markierer sprüht OK, wenn die Düse über eine Marke fährt.', 'На асфальтоукладчике ▲ ▼ меняют скорость. На разметчике OK красит, когда распылитель над меткой.'],
        ARCADE_BACK]),
      page(TIPS, [
        ['Três estrelas por trabalho: máquina certa na primeira, e trabalho caprichado.', 'Three stars a job: the right machine first time, and tidy work.', 'Tres estrellas por trabajo: la máquina correcta a la primera, y trabajo bien hecho.', 'Drei Sterne pro Arbeit: gleich die richtige Maschine und saubere Arbeit.', 'Три звезды за работу: нужная машина с первого раза и аккуратная работа.'],
        ['Pedras grandes e árvores precisam de mais de um empurrão. O caminhão leva a terra quando enche.', 'Big rocks and trees need more than one shove. The truck takes the dirt away when it is full.', 'Las rocas grandes y los árboles necesitan más de un empujón. El camión se lleva la tierra cuando se llena.', 'Große Felsen und Bäume brauchen mehr als einen Schub. Der Laster fährt die Erde weg, wenn er voll ist.', 'Большие камни и деревья не сдвинуть с одного раза. Самосвал увозит землю, когда наполнится.'],
        ['A frente da estrada é cortada, para você ver as camadas embaixo: terra, cascalho e asfalto.', 'The front of the road is cut away so you can see the layers underneath: soil, gravel and asphalt.', 'El frente de la carretera está cortado para que veas las capas de abajo: tierra, grava y asfalto.', 'Die Vorderseite der Straße ist aufgeschnitten, damit du die Schichten siehst: Erde, Kies und Asphalt.', 'Передний край дороги срезан, чтобы видеть слои под ней: землю, щебень и асфальт.']])
    ]},

    bridge: {icon: '🌉', name: ['Construir uma ponte', 'Build a bridge', 'Construir un puente', 'Eine Brücke bauen', 'Построить мост'], pages: [
      page(AIM, [
        ['Construa seis pontes, de um riacho na fazenda até o porto, que não caiam quando o caminhão de teste passar.', 'Build six bridges, from a farm creek to the harbour, that stay up when the test truck drives over.', 'Construye seis puentes, desde un arroyo de granja hasta el puerto, que no se caigan cuando pase el camión de prueba.', 'Bau sechs Brücken, vom Bach auf der Farm bis zum Hafen, die halten, wenn der Testlaster drüberfährt.', 'Постройте шесть мостов, от ручья на ферме до гавани, которые выдержат проезд тестового грузовика.'],
        ['Cada ponte tem um vão, uma carga e um dinheiro. Escolha o formato e o material certos sem gastar demais.', 'Each bridge has a gap, a load and a budget. Pick the right shape and material without spending too much.', 'Cada puente tiene un hueco, una carga y un presupuesto. Elige la forma y el material correctos sin gastar de más.', 'Jede Brücke hat eine Lücke, eine Last und ein Budget. Wähl die richtige Form und das richtige Material, ohne zu viel auszugeben.', 'У каждого моста есть пролёт, груз и бюджет. Выберите правильную форму и материал и не потратьте лишнего.']]),
      page(REMOTE, [
        ['Na lista de pontes, ◀ ▶ e OK. A próxima abre quando a anterior fica de pé.', 'On the list of bridges, ◀ ▶ and OK. The next one opens when the one before stays up.', 'En la lista de puentes, ◀ ▶ y OK. El siguiente se abre cuando el anterior aguanta.', 'In der Brückenliste ◀ ▶ und OK. Die nächste öffnet sich, wenn die vorige hält.', 'В списке мостов ◀ ▶ и OK. Следующий открывается, когда предыдущий устоял.'],
        ['▲ ▼ escolhem a linha: formato, material ou Testar. ◀ ▶ mudam a escolha, e OK manda o caminhão.', '▲ ▼ pick the row: shape, material or Test it. ◀ ▶ change the choice, and OK sends the truck over.', '▲ ▼ eligen la fila: forma, material o Probar. ◀ ▶ cambian la opción, y OK manda el camión.', '▲ ▼ wählen die Zeile: Form, Material oder Testen. ◀ ▶ ändern die Wahl, und OK schickt den Laster los.', '▲ ▼ выбирают строку: форма, материал или «Проверить». ◀ ▶ меняют выбор, а OK отправляет грузовик.'],
        ARCADE_BACK]),
      page(TIPS, [
        ['Três estrelas se ficar de pé na primeira. Caiu? Ela conta por quê, e você tenta de novo.', 'Three stars if it stays up first time. Fell down? It tells you why, and you try again.', 'Tres estrellas si aguanta a la primera. ¿Se cayó? Te dice por qué, y lo intentas otra vez.', 'Drei Sterne, wenn sie gleich hält. Eingestürzt? Sie sagt dir warum, und du versuchst es nochmal.', 'Три звезды, если устоял с первого раза. Упал? Вам объяснят почему, и можно попробовать снова.'],
        ['Desfiladeiros fundos e portos com navios não aceitam pilares no meio. Madeira é leve e barata, perfeita para quem vai a pé.', 'Deep gorges and harbours with ships cannot have legs in the middle. Wood is light and cheap, perfect for people on foot.', 'Los barrancos hondos y los puertos con barcos no admiten pilares en el medio. La madera es ligera y barata, perfecta para gente a pie.', 'Tiefe Schluchten und Häfen mit Schiffen vertragen keine Pfeiler in der Mitte. Holz ist leicht und billig, perfekt für Fußgänger.', 'В глубоком ущелье и в гавани с кораблями нельзя ставить опоры посередине. Дерево лёгкое и дешёвое, идеально для пешеходов.']])
    ]},

    town: {icon: '🏘️', name: ['Planejar uma cidade', 'Plan a town', 'Planear un pueblo', 'Eine Stadt planen', 'Спланировать город'], pages: [
      page(AIM, [
        ['Planeje três cidades, de uma vila até uma cidade movimentada, até todo mundo ficar feliz.', 'Plan three towns, from a little village to a busy town, until everyone is happy.', 'Planea tres pueblos, de una aldea a un pueblo animado, hasta que todos estén felices.', 'Plane drei Städte, vom kleinen Dorf bis zur lebhaften Stadt, bis alle glücklich sind.', 'Спланируйте три города, от деревни до оживлённого города, чтобы все были счастливы.'],
        ['Cada casa tem uma carinha: verde é feliz, amarela tem um problema, vermelha tem mais. A lista à direita mostra o que falta.', 'Every house has a face: green is happy, amber has one problem, red has more. The list on the right shows what\'s short.', 'Cada casa tiene una cara: verde es feliz, ámbar tiene un problema, roja tiene más. La lista de la derecha muestra lo que falta.', 'Jedes Haus hat ein Gesicht: grün ist glücklich, gelb hat ein Problem, rot mehrere. Die Liste rechts zeigt, was fehlt.', 'У каждого дома есть лицо: зелёное счастливое, жёлтое с одной проблемой, красное с несколькими. Список справа показывает, чего не хватает.']]),
      page(REMOTE, [
        ['As setas levam o quadrado pelo terreno. OK abre a lista do que construir ali.', 'The arrows move the square around the land. OK opens the list of what to build there.', 'Las flechas mueven el cuadro por el terreno. OK abre la lista de qué construir ahí.', 'Die Pfeile bewegen das Feld übers Land. OK öffnet die Liste, was dort gebaut wird.', 'Стрелки двигают рамку по участку. OK открывает список того, что здесь построить.'],
        ['Na lista, ◀ ▶ escolhem e OK constrói. OK em algo já construído oferece derrubar.', 'In the list, ◀ ▶ choose and OK builds. OK on something already built offers to knock it down.', 'En la lista, ◀ ▶ eligen y OK construye. OK sobre algo construido ofrece derribarlo.', 'In der Liste wählen ◀ ▶, und OK baut. OK auf etwas Gebautem bietet Abreißen an.', 'В списке ◀ ▶ выбирают, OK строит. OK на постройке предлагает её снести.'],
        ARCADE_BACK]),
      page(TIPS, [
        ['Primeiro as estradas: casas e prédios só funcionam com uma estrada ligada à entrada da cidade, à esquerda.', 'Roads first: houses and buildings only work with a road joined to the way in on the left.', 'Primero las carreteras: casas y edificios solo funcionan con una carretera unida a la entrada, a la izquierda.', 'Zuerst Straßen: Häuser und Gebäude funktionieren nur mit einer Straße zur Einfahrt links.', 'Сначала дороги: дома и здания работают, только если дорога ведёт к въезду слева.'],
        ['Usinas, esgoto e oficinas são barulhentos: deixe um espaço até as casas.', 'Power stations, wastewater and workshops are noisy and smelly: leave a gap before the houses.', 'Centrales, depuradoras y talleres son ruidosos: deja un hueco hasta las casas.', 'Kraftwerk, Kläranlage und Werkstatt sind laut: lass Abstand zu den Häusern.', 'Электростанции, очистные и мастерские шумят: оставьте промежуток до домов.'],
        ['Sorveteria e parque são divertidos, mas não são necessidades. Gaste o dinheiro primeiro no que as pessoas precisam.', 'An ice cream shop and a park are fun, but they aren\'t needs. Spend the money on what people need first.', 'La heladería y el parque son divertidos, pero no son necesidades. Gasta primero en lo que la gente necesita.', 'Eisdiele und Park machen Spaß, sind aber kein Bedarf. Gib das Geld zuerst für das aus, was die Leute brauchen.', 'Кафе-мороженое и парк это весело, но не нужды. Сначала тратьте деньги на то, что людям нужно.'],
        ['Três estrelas se sobrar um quarto do dinheiro.', 'Three stars if a quarter of the money is left.', 'Tres estrellas si sobra una cuarta parte del dinero.', 'Drei Sterne, wenn ein Viertel des Geldes übrig ist.', 'Три звезды, если осталась четверть денег.']])
    ]},

    candy: {icon: '🍭', name: ['A Terra dos Doces da London', 'London\'s Candy Land', 'La Tierra de los Dulces de London', 'Londons Zuckerland', 'Сладкая страна Лондон'], pages: [
      page(AIM, [
        ['Passeie por um mundo de doces e brinque em seis lugares mágicos. Aqui ninguém perde: tudo vale brilhos.', 'Wander a world made of sweets and play in six magic places. Nobody loses here: everything earns sparkles.', 'Pasea por un mundo de dulces y juega en seis lugares mágicos. Aquí nadie pierde: todo da destellos.', 'Spazier durch eine Welt aus Süßigkeiten und spiel an sechs Zauberorten. Hier verliert niemand: Alles bringt Glitzer.', 'Гуляйте по сладкому миру и играйте в шести волшебных местах. Здесь никто не проигрывает: всё приносит блёстки.'],
        ['Os brilhos enchem o pote, e cada pote cheio traz um novo amigo: um coelhinho, um gatinho, um dragãozinho e mais.', 'Sparkles fill the jar, and every full jar brings a new friend: a bunny, a kitten, a baby dragon and more.', 'Los destellos llenan el bote, y cada bote lleno trae un nuevo amigo: un conejito, un gatito, un dragoncito y más.', 'Glitzer füllt das Glas, und jedes volle Glas bringt einen neuen Freund: ein Häschen, ein Kätzchen, einen Babydrachen und mehr.', 'Блёстки наполняют банку, и каждая полная банка приводит нового друга: зайчика, котёнка, дракончика и других.']]),
      page(REMOTE, [
        ['No mapa, as setas levam você de um lugar a outro e OK entra.', 'On the map, the arrows walk you from place to place and OK goes in.', 'En el mapa, las flechas te llevan de un sitio a otro y OK entra.', 'Auf der Karte laufen die Pfeile von Ort zu Ort, und OK geht hinein.', 'На карте стрелки ведут от места к месту, а OK открывает его.'],
        ['Voltar sai de um lugar para o mapa, e do mapa volta aos Jogos.', 'Back takes you from a place to the map, and from the map to Games.', 'Atrás te lleva de un sitio al mapa, y del mapa a Juegos.', 'Zurück bringt dich von einem Ort zur Karte und von der Karte zu den Spielen.', '«Назад» ведёт из места на карту, а с карты в «Игры».']]),
      page(['Os seis lugares', 'The six places', 'Los seis lugares', 'Die sechs Orte', 'Шесть мест'], [
        ['Confeitaria das Nuvens: escolha um bolo e a cobertura, depois ◀ ▶ e OK para colocar as delícias.', 'Cloud Bakery: pick a cake and its icing, then ◀ ▶ and OK to add the toppings.', 'Pastelería de las Nubes: elige una tarta y el glaseado, luego ◀ ▶ y OK para poner cosas ricas.', 'Wolkenbäckerei: Kuchen und Glasur wählen, dann mit ◀ ▶ und OK Leckereien drauflegen.', 'Облачная пекарня: выберите торт и глазурь, потом ◀ ▶ и OK, чтобы добавить украшения.'],
        ['Passeio do Arco-íris: ▲ ▼ voa o unicórnio até os doces e os aros de arco-íris. OK faz um giro que puxa os doces.', 'Rainbow Ride: ▲ ▼ fly the unicorn to the treats and rainbow rings. OK does a sparkle twirl that pulls treats in.', 'Paseo del Arcoíris: ▲ ▼ vuela el unicornio hacia los dulces y los aros. OK hace un giro que atrae los dulces.', 'Regenbogenritt: ▲ ▼ fliegt das Einhorn zu Süßem und Regenbogenringen. OK macht einen Glitzerdreher, der Süßes anzieht.', 'Радужная прогулка: ▲ ▼ ведут единорога к сладостям и радужным кольцам. OK делает кружок, который притягивает сладости.'],
        ['Chuva de Doces: ◀ ▶ move a cesta. Um doce que cai no chão vira lanche do coelhinho.', 'Lolly Shower: ◀ ▶ moves your basket. A sweet that lands on the grass is a snack for the bunny.', 'Lluvia de Golosinas: ◀ ▶ mueve la cesta. Un dulce que cae al suelo es merienda para el conejito.', 'Bonbonregen: ◀ ▶ bewegt den Korb. Was ins Gras fällt, nascht das Häschen.', 'Конфетный дождь: ◀ ▶ двигают корзинку. Упавшая конфета достанется зайчику.'],
        ['Jardim dos Doces: OK planta, OK rega e, quando crescer, OK colhe. Ele cresce até quando você não está.', 'Candy Garden: OK plants, OK waters, and once it has grown, OK picks. It grows even while you are away.', 'Jardín de Dulces: OK planta, OK riega y, cuando crezca, OK recoge. Crece aunque no estés.', 'Zuckergarten: OK pflanzt, OK gießt, und wenn es gewachsen ist, erntet OK. Es wächst auch, wenn du weg bist.', 'Сладкий сад: OK сажает, OK поливает, а когда вырастет, OK собирает. Сад растёт, даже когда вас нет.'],
        ['Loja de Doces: dê a cada amigo o doce do balão. Outro doce também deixa feliz!', 'Sweet Shop: give each friend the treat in their bubble. A different one makes them happy too!', 'Tienda de Dulces: dale a cada amigo el dulce de su bocadillo. ¡Otro también le alegra!', 'Süßigkeitenladen: Gib jedem Freund, was in seiner Blase ist. Etwas anderes freut ihn auch!', 'Кондитерская лавка: дайте другу угощение из облачка. Другое тоже его порадует!'],
        ['Castelo das Fantasias: ▲ ▼ escolhe, ◀ ▶ troca cabelo, roupa, coroa, asas e o amigo que passeia com você.', 'Dress-up Castle: ▲ ▼ picks, ◀ ▶ changes your hair, outfit, crown, wings and the friend who walks with you.', 'Castillo de Disfraces: ▲ ▼ elige, ◀ ▶ cambia pelo, ropa, corona, alas y el amigo que pasea contigo.', 'Verkleide-Schloss: ▲ ▼ wählt, ◀ ▶ ändert Frisur, Outfit, Krone, Flügel und den Freund, der mit dir läuft.', 'Замок нарядов: ▲ ▼ выбирают, ◀ ▶ меняют причёску, наряд, корону, крылья и друга, который гуляет с вами.']]),
      page(TIPS, [
        ['Não tem pressa e não tem errado. Brinque do seu jeito!', 'There is no rush and no wrong answer. Play your way!', 'No hay prisa ni respuestas malas. ¡Juega a tu manera!', 'Keine Eile und kein Falsch. Spiel, wie du magst!', 'Спешить некуда, и ошибок не бывает. Играйте как хочется!'],
        ['Tudo fica guardado nesta TV, e nada é enviado.', 'Everything is kept on this TV, and nothing is sent anywhere.', 'Todo se guarda en esta tele y no se envía nada.', 'Alles bleibt auf diesem Fernseher, nichts wird verschickt.', 'Всё хранится на этом телевизоре и никуда не отправляется.']])
    ]},

    crew: {icon: '🌙', name: ['Tripulação do Foguete', 'Launch Crew', 'Tripulación del Cohete', 'Startcrew', 'Стартовая команда'], pages: [
      page(AIM, [['Leve o foguete Beyond até a Lua e aprenda a reconhecer mensagens golpistas no caminho.', 'Fly the Beyond rocket to the Moon, and learn to spot scam messages on the way.', 'Lleva el cohete Beyond a la Luna y aprende a reconocer mensajes trampa por el camino.', 'Flieg die Beyond-Rakete zum Mond und lerne unterwegs, Betrugsnachrichten zu erkennen.', 'Долетите на ракете Beyond до Луны и научитесь по пути замечать сообщения мошенников.']]),
      page(REMOTE, [
        ['Esquerda e direita escolhem um astronauta, OK embarca. Embarque os seis.', 'Left and right pick a crew member, OK boards them. Get all six on.', 'Izquierda y derecha eligen a un tripulante, OK lo sube. Sube a los seis.', 'Links und rechts wählen ein Crewmitglied, OK lässt es einsteigen. Alle sechs müssen rein.', 'Влево и вправо выбирают космонавта, OK сажает его. Посадите всех шестерых.'],
        ['A agulha do tanque sobe e desce. Aperte OK quando ela estiver no verde.', 'The fuel needle goes up and down. Press OK when it is in the green.', 'La aguja del tanque sube y baja. Pulsa OK cuando esté en el verde.', 'Die Tanknadel geht hoch und runter. Drück OK, wenn sie im Grünen ist.', 'Стрелка топлива ходит вверх и вниз. Нажмите OK, когда она на зелёном.'],
        ['Uma faísca aparece no foguete: aperte a seta que aponta para ela.', 'A spark pops on the rocket: press the arrow that points at it.', 'Aparece una chispa en el cohete: pulsa la flecha que apunta hacia ella.', 'Ein Funke erscheint an der Rakete: Drück den Pfeil, der darauf zeigt.', 'На ракете вспыхивает искра: нажмите стрелку, которая на неё указывает.'],
        ['No voo, esquerda e direita mudam de faixa e OK destrói a mensagem da sua faixa.', 'In flight, left and right change lanes and OK zaps the message in your lane.', 'En vuelo, izquierda y derecha cambian de carril y OK destruye el mensaje de tu carril.', 'Im Flug wechseln links und rechts die Spur, und OK schaltet die Nachricht in deiner Spur aus.', 'В полёте влево и вправо меняют полосу, а OK сбивает сообщение на вашей полосе.'],
        ARCADE_BACK]),
      page(RULES, [
        ['Destrua os golpes. Deixe as mensagens de verdade de quem você conhece chegarem ao foguete.', 'Zap the scams. Let real messages from people you know reach the rocket.', 'Destruye las trampas. Deja que los mensajes de verdad de gente que conoces lleguen al cohete.', 'Schalte Betrug aus. Lass echte Nachrichten von Leuten, die du kennst, zur Rakete.', 'Сбивайте обман. Настоящие сообщения от знакомых пусть долетят до ракеты.'],
        ['Cada mensagem certa vale uma estrela. Errar não tira nada.', 'Every message you get right is a star. Getting one wrong takes nothing away.', 'Cada mensaje acertado es una estrella. Fallar no quita nada.', 'Jede richtige Nachricht ist ein Stern. Ein Fehler nimmt nichts weg.', 'Каждое верное сообщение это звезда. Ошибка ничего не отнимает.']]),
      page(TIPS, [
        ['Golpes apressam você, oferecem prêmios ou pedem segredos, como senhas, a escola ou o cartão da mamãe.', 'Scams rush you, offer prizes or ask for secrets, like passwords, your school or Mum\'s card.', 'Las trampas te meten prisa, ofrecen premios o piden secretos, como contraseñas, tu cole o la tarjeta de mamá.', 'Betrüger drängeln, versprechen Preise oder fragen nach Geheimnissen wie Passwörtern, deiner Schule oder Mamas Karte.', 'Мошенники торопят, обещают призы или просят секреты: пароли, вашу школу или мамину карту.'],
        ['Na dúvida, pergunte a um adulto.', 'When in doubt, ask a grown-up.', 'Si dudas, pregunta a un adulto.', 'Im Zweifel frag einen Erwachsenen.', 'Если сомневаетесь, спросите взрослого.']])
    ]},

    lunch: {icon: '🥪', name: ['Lanches da escola', 'School lunches', 'Almuerzos del cole', 'Pausenbrot', 'Школьные обеды'], pages: [
      page(AIM, [['Cada criança escolhe cinco lanches, um para cada dia de aula.', 'Each kid picks five lunches, one for each school day.', 'Cada niño elige cinco almuerzos, uno para cada día de cole.', 'Jedes Kind sucht fünf Pausenbrote aus, eins für jeden Schultag.', 'Каждый ребёнок выбирает пять обедов, по одному на каждый учебный день.']]),
      page(REMOTE, [
        ['Direita ou OK: hmm, quero! Esquerda: não, obrigado.', 'Right or OK for yum. Left for nah.', 'Derecha u OK: ¡qué rico! Izquierda: no, gracias.', 'Rechts oder OK für lecker. Links für nein danke.', 'Вправо или OK: вкусно! Влево: не хочу.'],
        ['Com cinco escolhidos, a semana está pronta.', 'Once you have five, your week is done.', 'Con cinco elegidos, la semana está lista.', 'Wenn du fünf hast, ist deine Woche fertig.', 'Выбрали пять, и неделя готова.']]),
      page(TIPS, [
        ['Os adultos veem a lista de todos, a receita de domingo e a lista de compras.', 'Grown-ups see everyone\'s list, the Sunday cook-up and the shopping list.', 'Los adultos ven la lista de todos, la cocina del domingo y la lista de la compra.', 'Erwachsene sehen die Liste aller, das Sonntagskochen und die Einkaufsliste.', 'Взрослые видят списки всех, воскресную готовку и список покупок.'],
        ['Todas as ideias são sem castanhas, como pedem as escolas.', 'Every idea is nut free, the way schools ask.', 'Todas las ideas son sin frutos secos, como piden los coles.', 'Jede Idee ist nussfrei, wie es die Schulen möchten.', 'Все идеи без орехов, как просят школы.']])
    ]},

    lights: {icon: '✨', name: ['Show de luzes', 'Light show', 'Show de luces', 'Lichtshow', 'Световое шоу'], pages: [
      page(AIM, [['A música da casa vira luz na tela inteira. É só curtir.', 'The room\'s music turned into light, right across the screen. Just enjoy it.', 'La música de la casa convertida en luz por toda la pantalla. Solo disfruta.', 'Die Musik im Raum wird zu Licht auf dem ganzen Bildschirm. Einfach genießen.', 'Музыка в комнате превращается в свет на весь экран. Просто наслаждайтесь.']]),
      page(REMOTE, [
        ['Primeiro escolha o som: a sua música, o som da TV (Google TV), a sala por um microfone, manter o ritmo ou luzes calmas, sem som.', 'First pick the sound: your own music, the TV\'s sound (Google TV), the room through a microphone, keep the beat, or calm lights with no sound.', 'Primero elige el sonido: tu música, el sonido de la tele (Google TV), la sala por un micrófono, llevar el ritmo o luces tranquilas, sin sonido.', 'Wähl zuerst den Ton: deine Musik, den Ton des Fernsehers (Google TV), den Raum über ein Mikrofon, den Takt halten oder ruhige Lichter ohne Ton.', 'Сначала выберите звук: свою музыку, звук телевизора (Google TV), комнату через микрофон, «Держать ритм» или спокойные огни без звука.'],
        ['◀ ▶ troca o visual. OK pula para a próxima música. Voltar sai.', '◀ ▶ changes the look. OK skips to the next song. Back leaves.', '◀ ▶ cambia el estilo. OK pasa a la siguiente canción. Atrás sale.', '◀ ▶ wechselt das Aussehen. OK springt zum nächsten Lied. Zurück beendet.', '◀ ▶ меняет вид. OK переключает на следующую песню. «Назад» выходит.'],
        ['Manter o ritmo: aperte OK no ritmo da música e as luzes acompanham. ▲ ▼ deixa mais rápido ou devagar.', 'Keep the beat: tap OK in time with the music and the lights follow. ▲ ▼ makes it faster or slower.', 'Llevar el ritmo: pulsa OK al ritmo de la música y las luces lo siguen. ▲ ▼ lo hace más rápido o lento.', 'Den Takt halten: Drück OK im Takt der Musik, und die Lichter machen mit. ▲ ▼ macht es schneller oder langsamer.', '«Держать ритм»: нажимайте OK в такт музыке, и огни подхватят. ▲ ▼ быстрее или медленнее.']]),
      page(TIPS, [
        ['Para Spotify ou YouTube Music: comece a música lá, volte e escolha O som da TV.', 'For Spotify or YouTube Music: start the music there, come back and pick The TV\'s sound.', 'Para Spotify o YouTube Music: pon la música allí, vuelve y elige El sonido de la tele.', 'Für Spotify oder YouTube Music: Starte die Musik dort, komm zurück und wähl Der Ton des Fernsehers.', 'Для Spotify или YouTube Music: включите музыку там, вернитесь и выберите «Звук телевизора».'],
        ['Sem música, as luzes ficam paradas e esperam.', 'With no music, the lights lie still and wait.', 'Sin música, las luces se quedan quietas y esperan.', 'Ohne Musik bleiben die Lichter still und warten.', 'Без музыки огни замирают и ждут.'],
        ['O microfone do controle não ouve a sala. Para a música da sala, ligue uma webcam ou microfone USB na TV.', 'A remote\'s microphone can\'t hear the room. For music in the room, plug a USB webcam or microphone into the TV.', 'El micrófono del mando no oye la sala. Para la música de la sala, conecta una webcam o un micrófono USB a la tele.', 'Das Mikrofon der Fernbedienung hört den Raum nicht. Für Musik im Raum steck eine USB-Webcam oder ein USB-Mikrofon an den Fernseher.', 'Микрофон пульта не слышит комнату. Для музыки в комнате подключите к телевизору USB-веб-камеру или USB-микрофон.'],
        ['Com uma webcam, ligue Acenar faz ondas: mexa as mãos e as luzes fazem ondas onde você se mexe.', 'With a webcam, turn on Wave to make ripples: move your hands and the light ripples where you move.', 'Con una webcam, activa Saludar hace ondas: mueve las manos y la luz hace ondas donde te mueves.', 'Mit einer Webcam schalt Winken macht Wellen ein: Beweg die Hände, und das Licht schlägt Wellen, wo du dich bewegst.', 'С веб-камерой включите «Волны от взмахов»: двигайте руками, и свет пойдёт волнами там, где вы двигаетесь.'],
        ['O som e a câmera só viram luz na TV: nada é gravado, mostrado nem enviado.', 'The sound and the camera only become light on the TV: nothing is recorded, shown or sent.', 'El sonido y la cámara solo se convierten en luz en la tele: no se graba, se muestra ni se envía nada.', 'Ton und Kamera werden nur auf dem Fernseher zu Licht: Nichts wird aufgenommen, gezeigt oder gesendet.', 'Звук и камера превращаются в свет только на телевизоре: ничего не записывается, не показывается и не отправляется.']])
    ]},

    karaoke: {icon: '🎤', name: ['Karaokê', 'Karaoke', 'Karaoke', 'Karaoke', 'Караоке'], pages: [
      page(AIM, [['Cantem juntos, cada um na sua vez.', 'Sing together, one turn each.', 'Cantad juntos, un turno cada uno.', 'Singt zusammen, jeder ist mal dran.', 'Пойте вместе, по очереди.']]),
      page(REMOTE, [
        ['Escolha quem canta e uma música, no controle ou no Beyond Family no celular.', 'Pick who\'s singing and a song, on the remote or in Beyond Family on a phone.', 'Elige quién canta y una canción, con el mando o en Beyond Family en el teléfono.', 'Wähl, wer singt, und ein Lied, mit der Fernbedienung oder in Beyond Family auf dem Handy.', 'Выберите, кто поёт, и песню: с пульта или в Beyond Family на телефоне.'],
        ['A TV conta de cinco até zero. OK começa já.', 'The TV counts down from five. OK starts it straight away.', 'La tele cuenta desde cinco. OK empieza ya.', 'Der Fernseher zählt von fünf herunter. OK startet sofort.', 'Телевизор считает от пяти. OK начинает сразу.']]),
      page(TIPS, [['A letra está no vídeo. Quando a música acaba, o próximo cantor aparece sozinho.', 'The words are on the video. When a song ends, the next singer comes up by themselves.', 'La letra está en el vídeo. Cuando acaba una canción, sale el siguiente cantante solo.', 'Der Text ist im Video. Wenn ein Lied endet, kommt der nächste Sänger von allein.', 'Слова есть в видео. Когда песня заканчивается, следующий певец появляется сам.']])
    ]},

    party: {icon: '🎉', name: ['Festa', 'Party', 'Fiesta', 'Party', 'Вечеринка'], pages: [
      page(AIM, [['Luzes coloridas que dançam com a música: uma discoteca ou um aniversário.', 'Coloured lights that dance to the music: a disco or a birthday.', 'Luces de colores que bailan con la música: una disco o un cumpleaños.', 'Bunte Lichter, die zur Musik tanzen: eine Disco oder ein Geburtstag.', 'Цветные огни танцуют под музыку: дискотека или день рождения.']]),
      page(REMOTE, [
        ['Escolha Discoteca ou Aniversário. O aniversário mostra o nome, um bolo e a melodia de Parabéns.', 'Pick Disco or Birthday. A birthday shows the name, a cake and the Happy Birthday tune.', 'Elige Disco o Cumpleaños. El cumpleaños muestra el nombre, una tarta y la melodía del Cumpleaños feliz.', 'Wähl Disco oder Geburtstag. Ein Geburtstag zeigt den Namen, einen Kuchen und die Geburtstagsmelodie.', 'Выберите «Дискотека» или «День рождения». День рождения показывает имя, торт и мелодию поздравления.'],
        ['Qualquer botão para a festa.', 'Any button stops the party.', 'Cualquier botón para la fiesta.', 'Jede Taste beendet die Party.', 'Любая кнопка останавливает вечеринку.']])
    ]},

    quiz: {icon: '🏆', name: ['Quiz da noite', 'Quiz night', 'Noche de quiz', 'Quizabend', 'Вечер викторины'], pages: [
      page(AIM, [['Acerte o máximo de perguntas.', 'Get as many questions right as you can.', 'Acierta todas las preguntas que puedas.', 'Beantworte so viele Fragen wie möglich richtig.', 'Ответьте правильно на как можно больше вопросов.'], PHONES]),
      page(REMOTE, [
        ['A pergunta aparece na TV. Todos respondem no celular: vale o primeiro toque.', 'The question shows on the TV. Everyone answers on their phone: the first tap counts.', 'La pregunta sale en la tele. Todos responden en el teléfono: vale el primer toque.', 'Die Frage erscheint auf dem Fernseher. Alle antworten auf dem Handy: Der erste Tipp zählt.', 'Вопрос на экране. Все отвечают на телефонах: засчитывается первое нажатие.'],
        ['No controle: Mostrar a resposta, depois Próxima pergunta. No fim, o placar.', 'On the remote: Show the answer, then Next question. The scores come at the end.', 'Con el mando: Mostrar la respuesta y luego Siguiente pregunta. Al final, la puntuación.', 'Mit der Fernbedienung: Antwort zeigen, dann Nächste Frage. Am Ende kommt der Punktestand.', 'С пульта: «Показать ответ», потом «Следующий вопрос». В конце итоги.']])
    ]},

    question: {icon: '🍽', name: ['Pergunta do jantar', 'Dinner question', 'Pregunta de la cena', 'Frage zum Abendessen', 'Вопрос за ужином'], pages: [
      page(AIM, [['Uma pergunta para conversar no jantar. Não há resposta certa.', 'A question to talk about over dinner. There\'s no right answer.', 'Una pregunta para charlar en la cena. No hay respuesta correcta.', 'Eine Frage zum Reden beim Abendessen. Es gibt keine richtige Antwort.', 'Вопрос, чтобы поговорить за ужином. Правильного ответа нет.'], PHONES]),
      page(REMOTE, [
        ['Todos respondem no celular. Aperte Mostrar as respostas e elas aparecem juntas.', 'Everyone answers on their phone. Press Show the answers and they all come up together.', 'Todos responden en el teléfono. Pulsa Mostrar las respuestas y salen todas juntas.', 'Alle antworten auf dem Handy. Drück Antworten zeigen, dann erscheinen alle zusammen.', 'Все отвечают на телефонах. Нажмите «Показать ответы», и они появятся вместе.']])
    ]},

    tidy: {icon: '🧹', name: ['Corrida da arrumação', 'Tidy-up race', 'Carrera de ordenar', 'Aufräum-Rennen', 'Гонка уборки'], pages: [
      page(AIM, [['Arrume suas coisas o mais rápido que puder.', 'Tidy up your things as fast as you can.', 'Ordena tus cosas lo más rápido que puedas.', 'Räum deine Sachen so schnell wie möglich auf.', 'Уберите свои вещи как можно быстрее.']]),
      page(REMOTE, [
        ['Escolha quem vai arrumar e aperte Valendo. O relógio conta para cima.', 'Pick who\'s tidying and press Go. The clock counts up.', 'Elige quién ordena y pulsa Ya. El reloj cuenta hacia arriba.', 'Wähl, wer aufräumt, und drück Los. Die Uhr zählt hoch.', 'Выберите, кто убирает, и нажмите «Старт». Часы считают вверх.'],
        ['Terminou? Pegue o controle e aperte OK no seu rosto.', 'Done? Grab the remote and press OK on your face.', '¿Terminaste? Coge el mando y pulsa OK en tu cara.', 'Fertig? Schnapp dir die Fernbedienung und drück OK auf dein Gesicht.', 'Готово? Возьмите пульт и нажмите OK на своём лице.']]),
      page(TIPS, [['Ninguém fica sem tempo: quando todos terminam, a TV diz quem foi o mais rápido.', 'Nobody runs out of time: when everyone\'s done, the TV says who was fastest.', 'A nadie se le acaba el tiempo: cuando todos terminan, la tele dice quién fue el más rápido.', 'Niemandem läuft die Zeit davon: Wenn alle fertig sind, sagt der Fernseher, wer am schnellsten war.', 'Время ни у кого не кончается: когда все закончат, телевизор скажет, кто был быстрее.']])
    ]},

    bedtime: {icon: '🌙', name: ['Hora de dormir', 'Bedtime', 'Hora de dormir', 'Schlafenszeit', 'Время спать'], pages: [
      page(AIM, [['Acalmar o corpo antes de dormir.', 'Calm your body down before sleep.', 'Calmar el cuerpo antes de dormir.', 'Den Körper vor dem Schlafen beruhigen.', 'Успокоить тело перед сном.']]),
      page(REMOTE, [
        ['Escolha um som (chuva, ondas ou ventilador) e quanto tempo, depois Boa noite.', 'Pick a sound (rain, waves or a fan) and how long, then Goodnight.', 'Elige un sonido (lluvia, olas o ventilador) y cuánto tiempo, luego Buenas noches.', 'Wähl ein Geräusch (Regen, Wellen oder Ventilator) und wie lange, dann Gute Nacht.', 'Выберите звук (дождь, волны или вентилятор) и время, затем «Спокойной ночи».'],
        ['A luz cresce: inspire. A luz diminui: expire.', 'The light grows: breathe in. It shrinks: breathe out.', 'La luz crece: inspira. Se encoge: espira.', 'Das Licht wird größer: einatmen. Es wird kleiner: ausatmen.', 'Свет растёт: вдох. Уменьшается: выдох.'],
        ['Fica mais lento aos poucos, a tela e o som diminuem e a TV se desliga sozinha. Qualquer botão antes disso traz a TV de volta.', 'It slows down bit by bit, the screen and the sound fade, then the TV turns itself off. Any button before then brings the TV back.', 'Se va haciendo más lento, la pantalla y el sonido bajan y la tele se apaga sola. Cualquier botón antes de eso devuelve la tele.', 'Es wird nach und nach langsamer, Bild und Ton werden leiser, dann schaltet sich der Fernseher selbst aus. Jede Taste davor holt den Fernseher zurück.', 'Понемногу замедляется, экран и звук затихают, затем телевизор выключается сам. Любая кнопка до этого возвращает телевизор.']])
    ]}
  };

  /** The order on the How to play screen: the same as the Games screen. */
  var ORDER = ['karaoke', 'ludo', 'chess', 'chant', 'snap', 'likely', 'rather', 'dare', 'rcland', 'road', 'bridge', 'town', 'candy', 'eel', 'paddle', 'guard', 'dots',
    'crew', 'lunch', 'party', 'lights', 'quiz', 'question', 'tidy', 'bedtime'];

  function nameOf(id) { return GUIDES[id] ? L(GUIDES[id].name) : ''; }

  /** One guide, a page at a time. done() runs when it closes. */
  function show(id, done) {
    var guide = GUIDES[id];
    if (!guide) { if (done) done(); return; }
    var at = 0, next = null;
    var api = UI.open({
      cls: 'bt-guide',
      build: function (layer, a) {
        var box = UI.el('div', 'gd-box', layer);
        var p = guide.pages[at];
        UI.el('div', 'gd-game', box, guide.icon + '  ' + L(guide.name));
        UI.heading(box, L(p.title));
        var list = UI.el('div', 'gd-lines', box);
        for (var i = 0; i < p.lines.length; i++) UI.el('div', 'gd-line', list, L(p.lines[i]));
        var foot = UI.el('div', 'gd-foot', box);
        var dots = UI.el('div', 'gd-dots', foot);
        for (var d = 0; d < guide.pages.length; d++) UI.el('i', d === at ? 'on' : '', dots);
        var last = at === guide.pages.length - 1;
        var row = UI.el('div', 'bt-buttons', foot);
        // ◀ ▶ turn the page from either button, so OK always means "next" (or "got it" on the last page).
        if (at > 0) a.add(UI.button(row, '◀  ' + tr('Voltar', 'Back a page', 'Atrás')), function () { turn(-1); }, {left: function () { turn(-1); }, right: function () { turn(1); }});
        next = a.add(UI.button(row, last ? tr('Entendi', 'Got it', 'Entendido') : tr('Próxima', 'Next', 'Siguiente') + '  ▶', null, 'primary'),
          function () { if (last) a.close(); else turn(1); }, {first: true, left: function () { turn(-1); }, right: function () { turn(1); }});
        UI.el('div', 'gd-help', foot, tr('◀ ▶ vira a página · Voltar fecha', '◀ ▶ turns the page · Back closes', '◀ ▶ pasa la página · Atrás cierra'));
      },
      closed: function () { if (done) done(); }
    });
    function turn(d) {
      var to = Math.max(0, Math.min(guide.pages.length - 1, at + d));
      if (to === at) return;
      at = to;
      if (window.Sfx) Sfx.play('flip');
      api.rebuild();
      api.focusNode(next);
    }
    return api;
  }

  /** The How to play screen: every game (or just ids), OK on one opens its guide. */
  function list(ids, title) {
    ids = ids || ORDER;
    UI.open({
      cls: 'bt-guide bt-guide-list',
      build: function (layer, a) {
        var box = UI.el('div', 'gd-box', layer);
        UI.el('div', 'sun', box, '📖');
        UI.heading(box, title || tr('Como jogar', 'How to play', 'Cómo jugar'),
          tr('Escolha um jogo para ver as regras e como jogar com o controle.', 'Pick a game to see its rules and how to play it with the remote.', 'Elige un juego para ver sus reglas y cómo jugarlo con el mando.'));
        var row = UI.el('div', 'bt-buttons gd-grid', box);
        for (var i = 0; i < ids.length; i++) {
          (function (id, first) {
            if (!GUIDES[id]) return;
            a.add(UI.button(row, GUIDES[id].icon + '  ' + nameOf(id), null, first ? 'primary' : ''), function () { show(id); }, {first: first});
          })(ids[i], i === 0);
        }
      }
    });
  }

  return {show: show, list: list, has: function (id) { return !!GUIDES[id]; }, name: nameOf,
    // For the tests.
    all: GUIDES, order: ORDER};
})();
