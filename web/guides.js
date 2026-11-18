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
  var ARCADE_BACK = ['Voltar pausa o jogo. OK continua.', 'Back pauses the game. OK carries on.', 'Atrás pausa el juego. OK sigue.', 'Zurück pausiert das Spiel. OK spielt weiter.', '«Назад» ставит игру на паузу. OK продолжает.'];
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
        KEEPS, ARCADE_BACK]),
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
        ['OK atira.', 'OK fires.', 'OK dispara.', 'OK schießt.', 'OK стреляет.'],
        ARCADE_BACK]),
      page(TIPS, [['Você tem três vidas. Pare embaixo de uma água-viva e atire.', 'You have three lives. Stop under a jelly, then fire.', 'Tienes tres vidas. Párate debajo de una medusa y dispara.', 'Du hast drei Leben. Halt unter einer Qualle an, dann schieß.', 'У вас три жизни. Остановитесь под медузой и стреляйте.']])
    ]},

    dots: {icon: '🟡', name: ['Caça-pontos', 'Dot Chase', 'Caza-puntos', 'Punktejagd', 'Охота за точками'], pages: [
      page(AIM, [['Coma todos os pontos sem ser pego pelos fantasmas.', 'Eat every dot without the ghosts catching you.', 'Come todos los puntos sin que te pillen los fantasmas.', 'Friss alle Punkte, ohne dass dich die Geister erwischen.', 'Съешьте все точки, и не попадитесь призракам.']]),
      page(REMOTE, [
        ['As setas escolhem o caminho.', 'The arrows pick your way.', 'Las flechas eligen el camino.', 'Die Pfeile wählen deinen Weg.', 'Стрелки выбирают путь.'],
        KEEPS, ARCADE_BACK]),
      page(TIPS, [['Um ponto grande deixa os fantasmas com medo: aí você pode pegá-los. Você tem três vidas.', 'A big dot makes the ghosts scared: then you can catch them. You have three lives.', 'Un punto grande asusta a los fantasmas: entonces puedes atraparlos. Tienes tres vidas.', 'Ein großer Punkt macht den Geistern Angst: Dann kannst du sie fangen. Du hast drei Leben.', 'Большая точка пугает призраков: тогда их можно ловить. У вас три жизни.']])
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
        ['Primeiro escolha o som: a sua música, o microfone da sala ou só luzes.', 'First pick the sound: your own music, the room through a microphone, or just lights.', 'Primero elige el sonido: tu música, la sala por un micrófono o solo luces.', 'Wähl zuerst den Ton: deine Musik, den Raum über ein Mikrofon oder nur Licht.', 'Сначала выберите звук: свою музыку, комнату через микрофон или просто свет.'],
        ['◀ ▶ troca o visual. OK pula para a próxima música. Voltar sai.', '◀ ▶ changes the look. OK skips to the next song. Back leaves.', '◀ ▶ cambia el estilo. OK pasa a la siguiente canción. Atrás sale.', '◀ ▶ wechselt das Aussehen. OK springt zum nächsten Lied. Zurück beendet.', '◀ ▶ меняет вид. OK переключает на следующую песню. «Назад» выходит.']]),
      page(TIPS, [['O som só vira luz na TV: nada é gravado nem enviado.', 'The sound only becomes light on the TV: nothing is recorded or sent.', 'El sonido solo se convierte en luz en la tele: no se graba ni se envía nada.', 'Der Ton wird nur auf dem Fernseher zu Licht: Nichts wird aufgenommen oder gesendet.', 'Звук превращается в свет только на телевизоре: ничего не записывается и не отправляется.']])
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

    bedtime: {icon: '🌙', name: ['Respirar para dormir', 'Bedtime breathing', 'Respirar para dormir', 'Atmen vor dem Schlafen', 'Дыхание перед сном'], pages: [
      page(AIM, [['Acalmar o corpo antes de dormir.', 'Calm your body down before sleep.', 'Calmar el cuerpo antes de dormir.', 'Den Körper vor dem Schlafen beruhigen.', 'Успокоить тело перед сном.']]),
      page(REMOTE, [
        ['A luz cresce: inspire. A luz diminui: expire.', 'The light grows: breathe in. It shrinks: breathe out.', 'La luz crece: inspira. Se encoge: espira.', 'Das Licht wird größer: einatmen. Es wird kleiner: ausatmen.', 'Свет растёт: вдох. Уменьшается: выдох.'],
        ['Fica mais lento aos poucos e depois apaga. Qualquer botão traz a TV de volta.', 'It slows down bit by bit, then fades to dark. Any button brings the TV back.', 'Se va haciendo más lento y luego se apaga. Cualquier botón devuelve la tele.', 'Es wird nach und nach langsamer und dann dunkel. Jede Taste holt den Fernseher zurück.', 'Понемногу замедляется, затем гаснет. Любая кнопка возвращает телевизор.']])
    ]}
  };

  /** The order on the How to play screen: the same as the Games screen. */
  var ORDER = ['karaoke', 'ludo', 'chess', 'chant', 'snap', 'likely', 'rather', 'dare', 'eel', 'paddle', 'guard', 'dots',
    'lunch', 'party', 'lights', 'quiz', 'question', 'tidy', 'bedtime'];

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
