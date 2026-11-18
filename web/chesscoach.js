/*
 * Learn chess (ADR 0043): lessons and a coach on the same board as Chess (chess.js), from Games, Board and card
 * games, Learn chess. Fifteen short lessons, one idea each: the board, every piece, check, checkmate, castling,
 * promotion, en passant, stalemate, the other draws, and points and good habits. Each one says how it works in a few
 * lines, then sets up a position to try it with the remote; a wrong try says why and puts the pieces back. Then a game
 * against a gentle robot with a coach: after every move it says how good it was and why, and what would have been
 * better; OK on an empty square points at a good move; and before a big mistake it asks if you're sure, with the
 * chance to try again or see a better move. After each robot move it says what the robot did and what's under
 * attack. Lessons done are ticked per person, kept on this TV with the robots' levels (table.js), never sent.
 * The words are in all five languages here (pt, en, es, de, ru), like the guides (guides.js). Plain ES5.
 */
var ChessCoach = (function () {
  'use strict';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function S(t, n, m) { return L(t).replace('{n}', n === undefined ? '' : n).replace('{m}', m === undefined ? '' : m); }
  function R() { return Chess.rules; }

  var POINTS = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};
  var CENTRE = ['d4', 'e4', 'd5', 'e5'];

  // MARK: - What the coach says

  var W = {
    mate: ['É xeque-mate!', 'It\'s checkmate!', '¡Es jaque mate!', 'Das ist Schachmatt!', 'Это мат!'],
    check: ['Dá xeque no rei.', 'It puts the king in check.', 'Da jaque al rey.', 'Es setzt den König ins Schach.', 'Это шах королю.'],
    take: ['Captura: {n}, que vale {m}.', 'It takes a {n}, worth {m}.', 'Captura: {n}, que vale {m}.', 'Es schlägt: {n}, Wert {m}.', 'Взята фигура: {n}, ценность {m}.'],
    promo: ['O peão vira rainha.', 'The pawn becomes a queen.', 'El peón se convierte en dama.', 'Der Bauer wird zur Dame.', 'Пешка становится ферзём.'],
    castle: ['Guarda o rei num canto e põe a torre em jogo.', 'It tucks the king away safe and brings a rook out.', 'Pone al rey a salvo y saca una torre.', 'Es bringt den König in Sicherheit und holt einen Turm ins Spiel.', 'Король в безопасности, а ладья вступает в игру.'],
    ep: ['Captura um peão en passant.', 'It takes a pawn en passant.', 'Captura un peón al paso.', 'Es schlägt einen Bauern en passant.', 'Взятие пешки на проходе.'],
    attack: ['Ataca: {n} em {m}.', 'It attacks the {n} on {m}.', 'Ataca: {n} en {m}.', 'Es greift an: {n} auf {m}.', 'Под атакой: {n} на {m}.'],
    escape: ['Tira {n} do perigo.', 'It gets the {n} out of danger.', 'Saca a {n} del peligro.', 'Es bringt die Figur in Sicherheit: {n}.', 'Уводит из-под удара: {n}.'],
    develop: ['Põe em jogo: {n}.', 'It brings a {n} into the game.', 'Saca a jugar: {n}.', 'Es bringt ins Spiel: {n}.', 'Вводит в игру: {n}.'],
    centre: ['Ocupa o meio do tabuleiro, onde as peças alcançam mais casas.', 'It takes the middle of the board, where pieces reach the most squares.', 'Ocupa el centro del tablero, donde las piezas llegan a más casillas.', 'Es besetzt die Brettmitte, wo Figuren die meisten Felder erreichen.', 'Занимает центр доски, откуда фигуры достают больше клеток.'],
    hangs: ['Cuidado: {n} em {m} pode ser capturado logo depois.', 'Careful: the {n} on {m} can be taken straight after.', 'Cuidado: {n} en {m} puede ser capturado justo después.', 'Vorsicht: {n} auf {m} kann sofort geschlagen werden.', 'Осторожно: {n} на {m} могут сразу взять.'],
    leaves: ['Cuidado: fica sem proteção {n} em {m}.', 'Careful: it leaves the {n} on {m} unprotected.', 'Cuidado: deja sin protección {n} en {m}.', 'Vorsicht: Ungeschützt bleibt {n} auf {m}.', 'Осторожно: без защиты остаётся {n} на {m}.'],
    king: ['O rei sai cedo, onde é mais fácil atacá-lo.', 'The king walks out early, where it\'s easier to attack.', 'El rey sale pronto, donde es más fácil atacarlo.', 'Der König geht früh nach vorn, wo man ihn leichter angreift.', 'Король рано выходит вперёд, где его легче атаковать.'],
    fine: ['Um lance sensato.', 'A sensible move.', 'Una jugada sensata.', 'Ein vernünftiger Zug.', 'Разумный ход.'],
    better: ['Melhor: {n}.', 'Better: {n}.', 'Mejor: {n}.', 'Besser: {n}.', 'Лучше: {n}.'],
    missedMate: ['Tinha xeque-mate: {n}!', 'There was checkmate: {n}!', '¡Había jaque mate: {n}!', 'Da war Schachmatt: {n}!', 'Был мат: {n}!'],
    played: ['{n} jogou {m}.', '{n} played {m}.', '{n} jugó {m}.', '{n} spielte {m}.', '{n}: {m}.'],
    watch: ['Cuidado: {n} em {m} está sob ataque.', 'Watch out: your {n} on {m} is under attack.', 'Cuidado: {n} en {m} está atacado.', 'Achtung: {n} auf {m} wird angegriffen.', 'Осторожно: {n} на {m} под атакой.'],
    hint: ['Tente {n}.', 'Try {n}.', 'Prueba {n}.', 'Versuch {n}.', 'Попробуйте: {n}.']
  };
  var GRADE = {
    great: ['Ótimo lance!', 'Great move!', '¡Gran jugada!', 'Super Zug!', 'Отличный ход!'],
    good: ['Bom lance.', 'Good move.', 'Buena jugada.', 'Guter Zug.', 'Хороший ход.'],
    ok: ['Nada mal, mas tinha melhor.', 'Not bad, but there was better.', 'No está mal, pero había algo mejor.', 'Nicht schlecht, aber es gab Besseres.', 'Неплохо, но был ход лучше.'],
    oops: ['Cuidado!', 'Careful!', '¡Cuidado!', 'Vorsicht!', 'Осторожно!']
  };

  function pieceName(k) { return R().pieceName(k); }
  function moveWords(m) { return pieceName(R().kindOf(m.p)) + ' ' + R().name(m.from) + ' → ' + R().name(m.to); }

  /**
   * side's pieces that can be taken for nothing or for less than they're worth: attacked, and either not guarded or
   * attacked by something cheaper.
   */
  function danger(s, side) {
    var r = R(), keep = s.turn, out = [];
    s.turn = r.other(side);
    var moves = r.pseudo(s);
    s.turn = keep;
    for (var i = 0; i < 64; i++) {
      var p = s.b[i];
      if (!p || r.sideOf(p) !== side || r.kindOf(p) === 'k') continue;
      var cheapest = Infinity;
      for (var j = 0; j < moves.length; j++) if (moves[j].to === i && moves[j].cap) cheapest = Math.min(cheapest, r.VALUE[r.kindOf(moves[j].p)]);
      if (cheapest === Infinity) continue;
      if (!r.attacked(s.b, i, side) || cheapest < r.VALUE[r.kindOf(p)]) out.push(i);
    }
    return out;
  }

  /** Why a move is good (good) or not (bad), in short sentences, weighed before it's played on s. */
  function why(s, m) {
    var r = R(), side = s.turn, foe = r.other(side), good = [], bad = [];
    var moved = r.kindOf(m.promo || m.p), worth = r.VALUE[moved], early = s.full <= 12, i;
    var before = danger(s, side);
    var u = r.make(s, m);
    var check = r.inCheck(s), replies = check ? r.legal(s) : null;
    if (check && !replies.length) good.push(S(W.mate));
    else if (check) good.push(S(W.check));
    if (m.promo) good.push(S(W.promo));
    if (m.castle) good.push(S(W.castle));
    if (m.ep) good.push(S(W.ep));
    else if (m.cap) good.push(S(W.take, pieceName(r.kindOf(m.cap)), POINTS[r.kindOf(m.cap)]));
    // What the piece attacks from its new square: something worth more, or something left unguarded.
    s.turn = side;
    var next = r.pseudo(s);
    s.turn = foe;
    var target = null;
    for (i = 0; i < next.length; i++) {
      var t = next[i];
      if (t.from !== m.to || !t.cap || r.kindOf(t.cap) === 'k' || r.kindOf(t.cap) === 'p') continue;
      if (r.VALUE[r.kindOf(t.cap)] > worth || !r.attacked(s.b, t.to, foe)) {
        if (!target || r.VALUE[r.kindOf(t.cap)] > r.VALUE[r.kindOf(target.cap)]) target = t;
      }
    }
    if (target && !(check && !replies.length)) good.push(S(W.attack, pieceName(r.kindOf(target.cap)), r.name(target.to)));
    var after = danger(s, side);
    if (before.indexOf(m.from) >= 0 && after.indexOf(m.to) < 0 && worth >= 300) good.push(S(W.escape, pieceName(moved)));
    var back = side === 'w' ? 7 : 0;
    if (early && (moved === 'n' || moved === 'b') && (m.from >> 3) === back) good.push(S(W.develop, pieceName(moved)));
    if ((moved === 'p' || moved === 'n') && CENTRE.indexOf(r.name(m.to)) >= 0) good.push(S(W.centre));
    if (after.indexOf(m.to) >= 0 && worth >= 300 && !(m.cap && r.VALUE[r.kindOf(m.cap)] >= worth)) bad.push(S(W.hangs, pieceName(moved), r.name(m.to)));
    else {
      for (i = 0; i < after.length; i++) {
        var at = after[i];
        if (at === m.to || before.indexOf(at) >= 0 || r.VALUE[r.kindOf(s.b[at])] < 300) continue;
        bad.push(S(W.leaves, pieceName(r.kindOf(s.b[at])), r.name(at)));
        break;
      }
    }
    if (moved === 'k' && !m.castle && early && !check) bad.push(S(W.king));
    r.unmake(s, m, u);
    return {good: good, bad: bad};
  }

  /**
   * A person's move, graded before it's played: {grade, label, text, gap, better, tip}. Weighed two moves ahead with
   * the captures followed through, the way a careful player would; tip is kept for the debrief.
   */
  function review(s, m) {
    var r = R(), ranked = r.rank(s, 2, true, 700), mine = null;
    for (var i = 0; i < ranked.length; i++) if (ranked[i].m.from === m.from && ranked[i].m.to === m.to) mine = ranked[i].score;
    var w = why(s, m);
    if (!ranked.length || mine === null) return {grade: 'good', label: L(GRADE.good), text: w.good.slice(0, 2).join(' '), gap: 0};
    var best = ranked[0], gap = best.score - mine, half = r.MATE / 2;
    var missed = best.score > half && mine < half;
    var grade = mine > half ? 'great' : missed || gap >= 250 ? 'oops' : gap >= 100 ? 'ok' : gap > 20 ? 'good' : 'great';
    var text, better = null, tip = '';
    if (grade === 'great' || grade === 'good') {
      text = (w.good.length ? w.good.slice(0, 2) : [S(W.fine)]).concat(w.bad.slice(0, 1)).join(' ');
    } else {
      better = best.m;
      var bw = why(s, best.m);
      var parts = w.bad.slice(0, 1);
      parts.push(missed ? S(W.missedMate, moveWords(best.m)) : S(W.better, moveWords(best.m)));
      if (!missed && bw.good.length) parts.push(bw.good[0]);
      text = parts.join(' ');
      if (gap >= 200) tip = text;
    }
    return {grade: grade, label: L(GRADE[grade]), text: text, gap: gap, better: better, tip: tip};
  }

  /** A good move for the side to play, and why: {m, text}. */
  function hint(s) {
    var ranked = R().rank(s, 2, true, 800);
    if (!ranked.length) return null;
    var m = ranked[0].m, w = why(s, m);
    return {m: m, text: S(W.hint, moveWords(m)) + (w.good.length ? ' ' + w.good[0] : '')};
  }

  /** After the robot's move (s is the board after it): what it did and why, and anything of yours now in danger. */
  function afterRobot(s, m, name, w) {
    var r = R(), parts = [S(W.played, name, moveWords(m))];
    if (w && w.good.length) parts.push(w.good[0]);
    if (!r.inCheck(s)) {
      var d = danger(s, s.turn);
      for (var i = 0; i < d.length; i++) {
        if (r.VALUE[r.kindOf(s.b[d[i]])] < 300) continue;
        parts.push(S(W.watch, pieceName(r.kindOf(s.b[d[i]])), r.name(d[i])));
        break;
      }
    }
    return parts.join(' ');
  }

  /** Before a big mistake: try again, see a better move, or keep it. answer('again' | 'show' | 'keep'). */
  function ask(r, answer) {
    var chosen = false;
    function pick(api, what) { chosen = true; api.close(); answer(what); }
    UI.open({
      cls: 'bt-table bt-alert',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.heading(box, L(['Tem certeza?', 'Are you sure?', '¿Seguro?', 'Bist du sicher?', 'Вы уверены?']), r.text);
        var row = UI.el('div', 'bt-buttons', box);
        api.add(UI.button(row, L(['Tentar de novo', 'Try again', 'Intentar otra vez', 'Nochmal versuchen', 'Попробовать ещё']), null, 'primary'), function () { pick(api, 'again'); }, {first: true});
        if (r.better) api.add(UI.button(row, L(['Mostrar um lance melhor', 'Show me a better move', 'Muéstrame una jugada mejor', 'Zeig mir einen besseren Zug', 'Показать ход лучше'])), function () { pick(api, 'show'); });
        api.add(UI.button(row, L(['Manter meu lance', 'Keep my move', 'Mantener mi jugada', 'Meinen Zug behalten', 'Оставить мой ход'])), function () { pick(api, 'keep'); });
      },
      closed: function () { if (!chosen) answer('again'); }
    });
  }

  // MARK: - The lessons

  function sq(n) { return R().sq(n); }
  function lastWas(m, kind) { return R().kindOf(m.p) === kind; }

  var TAKE_ALL = ['Capture todos os peões pretos.', 'Take all the black pawns.', 'Captura todos los peones negros.', 'Schlag alle schwarzen Bauern.', 'Возьмите все чёрные пешки.'];

  var LESSONS = [
    {id: 'board', icon: '🏁', title: ['O tabuleiro e o objetivo', 'The board and the aim', 'El tablero y el objetivo', 'Das Brett und das Ziel', 'Доска и цель'], text: [
      ['O tabuleiro tem 64 casas, claras e escuras. Cada lado começa com 16 peças.', 'The board has 64 squares, light and dark. Each side starts with 16 pieces.', 'El tablero tiene 64 casillas, claras y oscuras. Cada lado empieza con 16 piezas.', 'Das Brett hat 64 Felder, helle und dunkle. Jede Seite beginnt mit 16 Figuren.', 'На доске 64 клетки, светлые и тёмные. У каждой стороны в начале 16 фигур.'],
      ['As brancas ficam embaixo e começam sempre. Depois cada um joga uma vez.', 'White is at the bottom and always goes first. Then you take turns, one move each.', 'Las blancas están abajo y siempre empiezan. Luego os turnáis, una jugada cada uno.', 'Weiß ist unten und fängt immer an. Dann seid ihr abwechselnd dran, ein Zug pro Person.', 'Белые внизу и всегда ходят первыми. Потом по очереди, по одному ходу.'],
      ['O objetivo é o xeque-mate: atacar o rei do outro lado sem ele ter como escapar.', 'The aim is checkmate: attack the other king so it can\'t escape.', 'El objetivo es el jaque mate: atacar al otro rey sin que pueda escapar.', 'Das Ziel ist Schachmatt: den anderen König so angreifen, dass er nicht entkommt.', 'Цель: мат, то есть атака на короля, от которой ему не уйти.'],
      ['Letras embaixo e números do lado dão nome a cada casa, como e4.', 'Letters along the bottom and numbers up the side name each square, like e4.', 'Las letras de abajo y los números del lado nombran cada casilla, como e4.', 'Buchstaben unten und Zahlen an der Seite benennen jedes Feld, zum Beispiel e4.', 'Буквы снизу и цифры сбоку дают имя каждой клетке, например e4.']]},

    {id: 'pawn', icon: '♟', title: ['O peão', 'The pawn', 'El peón', 'Der Bauer', 'Пешка'], text: [
      ['Peões andam para a frente, uma casa por vez, e nunca voltam.', 'Pawns move straight ahead, one square at a time, and never go backwards.', 'Los peones avanzan recto, una casilla cada vez, y nunca retroceden.', 'Bauern ziehen geradeaus nach vorn, ein Feld auf einmal, und nie zurück.', 'Пешки ходят прямо вперёд на одну клетку и никогда назад.'],
      ['No primeiro lance, um peão pode andar duas casas.', 'On its very first move, a pawn can go two squares.', 'En su primera jugada, un peón puede avanzar dos casillas.', 'Bei seinem allerersten Zug darf ein Bauer zwei Felder ziehen.', 'Первым ходом пешка может пройти две клетки.'],
      ['Mas captura de outro jeito: uma casa na diagonal, para a frente.', 'But it takes differently: one square diagonally forward.', 'Pero captura de otra forma: una casilla en diagonal hacia delante.', 'Aber er schlägt anders: ein Feld schräg nach vorn.', 'А бьёт иначе: на одну клетку по диагонали вперёд.']],
      fen: '8/8/8/3p4/8/8/4P3/8 w - - 0 1', all: true,
      task: ['Ande duas casas, depois capture o peão preto na diagonal.', 'Go two squares, then take the black pawn diagonally.', 'Avanza dos casillas y luego captura el peón negro en diagonal.', 'Zieh zwei Felder, dann schlag den schwarzen Bauern schräg.', 'Пройдите две клетки, затем возьмите чёрную пешку по диагонали.']},

    {id: 'rook', icon: '♜', title: ['A torre', 'The rook', 'La torre', 'Der Turm', 'Ладья'], text: [
      ['A torre anda em linha reta: para cima, para baixo ou para os lados, quantas casas quiser.', 'The rook moves in straight lines: up, down or sideways, as far as it likes.', 'La torre va en línea recta: arriba, abajo o a los lados, tantas casillas como quiera.', 'Der Turm zieht gerade: hoch, runter oder seitwärts, so weit er will.', 'Ладья ходит по прямой: вверх, вниз или вбок, на любое число клеток.'],
      ['Ela não pula peças: para antes, ou captura a primeira que encontrar.', 'It can\'t jump over pieces: it stops before one, or takes the first it meets.', 'No salta piezas: se para antes o captura la primera que encuentra.', 'Er springt nicht über Figuren: Er hält davor an oder schlägt die erste.', 'Перепрыгивать нельзя: ладья останавливается перед фигурой или бьёт первую.'],
      ['Uma torre vale 5 pontos.', 'A rook is worth 5 points.', 'Una torre vale 5 puntos.', 'Ein Turm ist 5 Punkte wert.', 'Ладья стоит 5 очков.']],
      fen: '8/1p4p1/8/8/8/8/1R4p1/8 w - - 0 1', all: true, task: TAKE_ALL},

    {id: 'bishop', icon: '♝', title: ['O bispo', 'The bishop', 'El alfil', 'Der Läufer', 'Слон'], text: [
      ['O bispo anda na diagonal, quantas casas quiser.', 'The bishop moves diagonally, as far as it likes.', 'El alfil va en diagonal, tantas casillas como quiera.', 'Der Läufer zieht schräg, so weit er will.', 'Слон ходит по диагонали на любое число клеток.'],
      ['Ele fica na mesma cor de casa o jogo todo.', 'It stays on the same colour of square all game.', 'Se queda en el mismo color de casilla toda la partida.', 'Er bleibt das ganze Spiel auf derselben Feldfarbe.', 'Всю игру слон остаётся на клетках одного цвета.'],
      ['Um bispo vale 3 pontos.', 'A bishop is worth 3 points.', 'Un alfil vale 3 puntos.', 'Ein Läufer ist 3 Punkte wert.', 'Слон стоит 3 очка.']],
      fen: '8/8/7p/8/5p2/8/3p4/2B5 w - - 0 1', all: true, task: TAKE_ALL},

    {id: 'queen', icon: '♛', title: ['A rainha', 'The queen', 'La dama', 'Die Dame', 'Ферзь'], text: [
      ['A rainha anda como a torre e o bispo juntos: reto ou na diagonal, quantas casas quiser.', 'The queen moves like a rook and a bishop together: straight or diagonal, as far as she likes.', 'La dama se mueve como la torre y el alfil juntos: recto o en diagonal, tanto como quiera.', 'Die Dame zieht wie Turm und Läufer zusammen: gerade oder schräg, so weit sie will.', 'Ферзь ходит как ладья и слон вместе: по прямой или по диагонали, на любое число клеток.'],
      ['É a peça mais forte: vale 9 pontos. Cuide bem dela!', 'She\'s the strongest piece, worth 9 points. Look after her!', 'Es la pieza más fuerte: vale 9 puntos. ¡Cuídala!', 'Sie ist die stärkste Figur, 9 Punkte wert. Pass gut auf sie auf!', 'Это самая сильная фигура, 9 очков. Берегите её!']],
      fen: '8/3p4/8/8/p6p/8/8/3Q4 w - - 0 1', all: true, task: TAKE_ALL},

    {id: 'knight', icon: '♞', title: ['O cavalo', 'The knight', 'El caballo', 'Der Springer', 'Конь'], text: [
      ['O cavalo anda em L: duas casas para um lado, depois uma para o lado.', 'The knight moves in an L: two squares one way, then one to the side.', 'El caballo se mueve en L: dos casillas en una dirección y una hacia el lado.', 'Der Springer zieht in L-Form: zwei Felder in eine Richtung, dann eins zur Seite.', 'Конь ходит буквой «Г»: две клетки в одну сторону и одну вбок.'],
      ['É a única peça que pula por cima das outras.', 'It\'s the only piece that can jump over others.', 'Es la única pieza que salta por encima de las demás.', 'Er ist die einzige Figur, die über andere springen kann.', 'Это единственная фигура, которая перепрыгивает другие.'],
      ['Um cavalo vale 3 pontos.', 'A knight is worth 3 points.', 'Un caballo vale 3 puntos.', 'Ein Springer ist 3 Punkte wert.', 'Конь стоит 3 очка.']],
      fen: '8/8/5p2/8/4p3/2p5/8/1N6 w - - 0 1', all: true, task: TAKE_ALL},

    {id: 'king', icon: '♚', title: ['O rei', 'The king', 'El rey', 'Der König', 'Король'], text: [
      ['O rei anda uma casa para qualquer lado.', 'The king moves one square in any direction.', 'El rey se mueve una casilla en cualquier dirección.', 'Der König zieht ein Feld in jede Richtung.', 'Король ходит на одну клетку в любую сторону.'],
      ['É lento, mas é a peça que você precisa proteger.', 'He\'s slow, but he\'s the piece you must protect.', 'Es lento, pero es la pieza que debes proteger.', 'Er ist langsam, aber er ist die Figur, die du beschützen musst.', 'Он медленный, но именно его нужно защищать.'],
      ['O rei nunca pode ir para uma casa onde possa ser capturado: os pontos nem aparecem lá.', 'The king can never step onto a square where he could be taken: no dot shows there.', 'El rey nunca puede ir a una casilla donde lo capturen: ahí no sale ningún punto.', 'Der König darf nie auf ein Feld, wo er geschlagen werden könnte: Dort erscheint kein Punkt.', 'Король не может встать на клетку под ударом: там даже нет точки.']],
      fen: '8/8/8/8/8/2p2p2/8/4K3 w - - 0 1', all: true,
      task: ['Capture os dois peões com o rei. Um peão protege as casas na diagonal à frente dele.', 'Take both pawns with the king. A pawn guards the squares diagonally in front of it.', 'Captura los dos peones con el rey. Un peón protege las casillas en diagonal delante de él.', 'Schlag beide Bauern mit dem König. Ein Bauer schützt die Felder schräg vor sich.', 'Возьмите королём обе пешки. Пешка защищает клетки по диагонали перед собой.']},

    {id: 'check', icon: '⚠️', title: ['Xeque', 'Check', 'Jaque', 'Schach', 'Шах'], text: [
      ['Quando uma peça ataca o rei, é xeque. Você tem que sair do xeque na mesma hora.', 'When a piece attacks the king, that\'s check. You must get out of check straight away.', 'Cuando una pieza ataca al rey, es jaque. Hay que salir del jaque enseguida.', 'Greift eine Figur den König an, ist das Schach. Du musst sofort aus dem Schach heraus.', 'Когда фигура атакует короля, это шах. Из-под шаха нужно уйти сразу.'],
      ['Três jeitos: mexer o rei, pôr uma peça no caminho, ou capturar quem ataca.', 'Three ways: move the king, put a piece in the way, or take the attacker.', 'Tres formas: mover el rey, poner una pieza en medio o capturar al atacante.', 'Drei Wege: den König ziehen, eine Figur dazwischenstellen oder den Angreifer schlagen.', 'Три способа: отойти королём, закрыться фигурой или взять нападающего.']],
      fen: '4r2k/8/8/1B6/8/8/8/4K3 w - - 0 1',
      task: ['A torre preta dá xeque no seu rei. Capture a torre!', 'The black rook has your king in check. Take the rook!', 'La torre negra da jaque a tu rey. ¡Captura la torre!', 'Der schwarze Turm setzt deinen König ins Schach. Schlag den Turm!', 'Чёрная ладья объявила шах вашему королю. Возьмите ладью!'],
      goal: function (m) { return !!m.cap && m.to === sq('e8'); },
      wrong: ['Isso também tira do xeque, mas capturar a torre era melhor: ela sai do jogo. Tente de novo.', 'That gets out of check too, but taking the rook was best: it\'s gone for good. Try again.', 'Eso también sale del jaque, pero capturar la torre era mejor: se va para siempre. Inténtalo otra vez.', 'Das wehrt das Schach auch ab, aber den Turm zu schlagen war besser: Er ist für immer weg. Versuch es nochmal.', 'Так тоже можно уйти от шаха, но взять ладью лучше: её больше нет. Попробуйте ещё раз.']},

    {id: 'mate', icon: '🏆', title: ['Xeque-mate', 'Checkmate', 'Jaque mate', 'Schachmatt', 'Мат'], text: [
      ['Xeque-mate é xeque sem saída: o rei não pode andar, nada pode bloquear e quem ataca não pode ser capturado.', 'Checkmate is check with no way out: the king can\'t move, nothing can block, and the attacker can\'t be taken.', 'Jaque mate es jaque sin salida: el rey no puede moverse, nada puede bloquear y el atacante no puede ser capturado.', 'Schachmatt ist Schach ohne Ausweg: Der König kann nicht weg, nichts kann dazwischen, und der Angreifer kann nicht geschlagen werden.', 'Мат: шах без выхода. Король не может уйти, закрыться нечем, взять нападающего нельзя.'],
      ['Isso termina o jogo: quem dá xeque-mate ganha.', 'That ends the game: whoever gives checkmate wins.', 'Eso termina la partida: gana quien da jaque mate.', 'Damit ist das Spiel vorbei: Wer Schachmatt setzt, gewinnt.', 'На этом игра заканчивается: кто поставил мат, тот выиграл.']],
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      task: ['Dê xeque-mate em um lance. Olhe a última fileira.', 'Find checkmate in one move. Look at the back row.', 'Encuentra el jaque mate en una jugada. Mira la última fila.', 'Finde Schachmatt in einem Zug. Schau dir die hinterste Reihe an.', 'Найдите мат в один ход. Посмотрите на последний ряд.'],
      goal: function (m, s) { return R().status(s) === 'mate'; },
      wrong: ['Ainda não é mate. O rei preto está preso atrás dos próprios peões. Qual peça chega na fileira dele?', 'Not checkmate yet. The black king is stuck behind its own pawns. Which piece can reach its row?', 'Todavía no es mate. El rey negro está atrapado detrás de sus peones. ¿Qué pieza llega a su fila?', 'Noch kein Matt. Der schwarze König steckt hinter seinen eigenen Bauern fest. Welche Figur erreicht seine Reihe?', 'Ещё не мат. Чёрный король заперт своими пешками. Какая фигура дойдёт до его ряда?']},

    {id: 'castle', icon: '🏰', title: ['O roque', 'Castling', 'El enroque', 'Die Rochade', 'Рокировка'], text: [
      ['O roque é um lance especial para proteger o rei. O rei anda duas casas até uma torre, e a torre pula para o outro lado dele.', 'Castling is a special move to keep your king safe. The king moves two squares towards a rook, and the rook hops over to his other side.', 'El enroque es una jugada especial para proteger al rey. El rey va dos casillas hacia una torre y la torre salta a su otro lado.', 'Die Rochade ist ein besonderer Zug, der den König schützt. Der König zieht zwei Felder zu einem Turm, und der Turm springt auf seine andere Seite.', 'Рокировка: особый ход, чтобы спрятать короля. Король идёт на две клетки к ладье, а ладья перепрыгивает на другую сторону от него.'],
      ['Só pode se o rei e a torre ainda não andaram, não há nada entre eles e o rei não está em xeque, não passa por casa atacada nem termina em uma.', 'You can only castle if neither has moved yet, nothing is between them, and the king isn\'t in check, doesn\'t cross an attacked square and doesn\'t land on one.', 'Solo se puede si ni el rey ni la torre se han movido, no hay nada entre ellos y el rey no está en jaque, no cruza una casilla atacada ni acaba en una.', 'Das geht nur, wenn beide noch nicht gezogen haben, nichts dazwischen steht und der König nicht im Schach steht, kein angegriffenes Feld überquert und auf keinem landet.', 'Можно, только если король и ладья ещё не ходили, между ними пусто, король не под шахом, не проходит через битую клетку и не встаёт на неё.']],
      fen: '4k3/8/8/8/8/8/5PPP/R3K2R w KQ - 0 1',
      task: ['Faça o roque! Pegue o rei e leve-o duas casas na direção de uma torre.', 'Castle! Pick up the king and move him two squares towards a rook.', '¡Enroca! Coge el rey y muévelo dos casillas hacia una torre.', 'Rochiere! Nimm den König und zieh ihn zwei Felder zu einem Turm.', 'Сделайте рокировку! Возьмите короля и передвиньте на две клетки к ладье.'],
      goal: function (m) { return !!m.castle; },
      wrong: ['Esse foi um lance normal. Pegue o rei e procure o ponto duas casas para o lado.', 'That was a normal move. Pick up the king and look for the dot two squares to the side.', 'Esa fue una jugada normal. Coge el rey y busca el punto dos casillas al lado.', 'Das war ein normaler Zug. Nimm den König und such den Punkt zwei Felder daneben.', 'Это был обычный ход. Возьмите короля и найдите точку через клетку в сторону.']},

    {id: 'promote', icon: '👑', title: ['Promoção', 'Promotion', 'Coronación', 'Umwandlung', 'Превращение'], text: [
      ['Um peão que chega ao outro lado do tabuleiro vira uma peça mais forte.', 'A pawn that reaches the far side of the board changes into a stronger piece.', 'Un peón que llega al otro lado del tablero se convierte en una pieza más fuerte.', 'Ein Bauer, der die andere Seite des Bretts erreicht, wird zu einer stärkeren Figur.', 'Пешка, дошедшая до другого края доски, превращается в более сильную фигуру.'],
      ['Quase sempre é uma rainha, e aqui é sempre rainha.', 'Nearly always that\'s a queen, and here it always is.', 'Casi siempre es una dama, y aquí siempre lo es.', 'Fast immer ist das eine Dame, und hier immer.', 'Почти всегда это ферзь, а здесь всегда.']],
      fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1',
      task: ['Leve o peão até a última fileira e veja ele virar rainha.', 'Walk the pawn onto the last row and watch it become a queen.', 'Lleva el peón a la última fila y mira cómo se convierte en dama.', 'Zieh den Bauern auf die letzte Reihe und sieh zu, wie er zur Dame wird.', 'Проведите пешку на последний ряд и посмотрите, как она станет ферзём.'],
      goal: function (m) { return !!m.promo; },
      wrong: ['Mexa o peão, não o rei.', 'Move the pawn, not the king.', 'Mueve el peón, no el rey.', 'Zieh den Bauern, nicht den König.', 'Ходите пешкой, а не королём.']},

    {id: 'passant', icon: '🥷', title: ['En passant', 'En passant', 'Al paso', 'En passant', 'Взятие на проходе'], text: [
      ['Um peão que anda duas casas no primeiro lance pode parar bem ao lado do seu.', 'A pawn that jumps two squares on its first move can land right beside one of yours.', 'Un peón que avanza dos casillas en su primera jugada puede quedar justo al lado del tuyo.', 'Ein Bauer, der beim ersten Zug zwei Felder springt, kann direkt neben deinem landen.', 'Пешка, прыгнувшая первым ходом на две клетки, может встать рядом с вашей.'],
      ['Aí, só no seu próximo lance, seu peão pode capturá-lo como se ele tivesse andado uma casa só.', 'Then, on your very next move only, your pawn can take it as if it had moved just one square.', 'Entonces, solo en tu siguiente jugada, tu peón puede capturarlo como si hubiera avanzado una sola casilla.', 'Dann darf dein Bauer ihn, nur im nächsten Zug, so schlagen, als wäre er nur ein Feld gezogen.', 'Тогда, только следующим ходом, ваша пешка может взять её, будто она прошла одну клетку.'],
      ['En passant quer dizer "de passagem", em francês.', 'En passant is French for "in passing".', 'En francés se dice en passant: "de paso".', 'En passant ist Französisch für „im Vorbeigehen“.', 'По-французски это en passant, «мимоходом».']],
      fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
      task: ['O peão preto acabou de pular de d7 para d5. Capture en passant: seu peão vai para d6.', 'Black\'s pawn just jumped from d7 to d5. Take it en passant: your pawn goes to d6.', 'El peón negro acaba de saltar de d7 a d5. Captúralo al paso: tu peón va a d6.', 'Der schwarze Bauer ist gerade von d7 nach d5 gesprungen. Schlag ihn en passant: Dein Bauer zieht nach d6.', 'Чёрная пешка только что прыгнула с d7 на d5. Возьмите её на проходе: ваша пешка идёт на d6.'],
      goal: function (m) { return !!m.ep; },
      wrong: ['Desta vez não. Pegue o peão em e5 e procure o ponto atrás do peão preto.', 'Not this time. Pick up the pawn on e5 and look for the dot behind the black pawn.', 'Esta vez no. Coge el peón de e5 y busca el punto detrás del peón negro.', 'Diesmal nicht. Nimm den Bauern auf e5 und such den Punkt hinter dem schwarzen Bauern.', 'Не в этот раз. Возьмите пешку на e5 и найдите точку за чёрной пешкой.']},

    {id: 'stalemate', icon: '🤝', title: ['Afogado', 'Stalemate', 'Ahogado', 'Patt', 'Пат'], text: [
      ['Se é a sua vez, seu rei não está em xeque mas não há nenhum lance, é afogado.', 'If it\'s your turn, your king isn\'t in check, but you have no move you can make, that\'s stalemate.', 'Si es tu turno, tu rey no está en jaque pero no tienes ninguna jugada, es ahogado.', 'Bist du dran, dein König steht nicht im Schach, aber du hast keinen Zug, ist das Patt.', 'Если ваш ход, шаха нет, но ходить нечем, это пат.'],
      ['Afogado é empate, mesmo que o outro lado tenha muito mais peças!', 'Stalemate is a draw, even if the other side has lots more pieces!', '¡El ahogado es tablas, aunque el otro lado tenga muchas más piezas!', 'Patt ist unentschieden, auch wenn die andere Seite viel mehr Figuren hat!', 'Пат: это ничья, даже если у соперника гораздо больше фигур!'],
      ['Ganhando? Deixe o outro rei com uma casa livre até poder dar mate.', 'Winning? Leave the other king a square to move to until you can checkmate.', '¿Vas ganando? Deja al otro rey una casilla libre hasta que puedas dar mate.', 'Du gewinnst? Lass dem anderen König ein freies Feld, bis du mattsetzen kannst.', 'Выигрываете? Оставьте чужому королю свободную клетку, пока не сможете поставить мат.']],
      fen: 'k7/2K5/8/8/3Q4/8/8/8 w - - 0 1',
      task: ['Dê xeque-mate no rei preto, mas cuidado para não afogar.', 'Checkmate the black king, but careful not to stalemate it.', 'Da jaque mate al rey negro, pero cuidado con ahogarlo.', 'Setz den schwarzen König matt, aber pass auf, dass es kein Patt wird.', 'Поставьте мат чёрному королю, но не допустите пата.'],
      goal: function (m, s) { return R().status(s) === 'mate'; },
      wrong: function (m, s) {
        return R().status(s) === 'stalemate' ?
          L(['Afogado! O rei preto não está em xeque mas não tem para onde ir: empate. Tente de novo dando xeque.', 'Stalemate! The black king isn\'t in check but has nowhere to go, so it\'s a draw. Try again, and give check.', '¡Ahogado! El rey negro no está en jaque pero no tiene adónde ir: tablas. Inténtalo otra vez dando jaque.', 'Patt! Der schwarze König steht nicht im Schach, kann aber nirgends hin: unentschieden. Versuch es nochmal und gib Schach.', 'Пат! Чёрный король не под шахом, но ему некуда идти: ничья. Попробуйте ещё раз и объявите шах.']) :
          L(['Ainda não é mate. Tente dar xeque pela coluna da borda.', 'Not checkmate yet. Try giving check along the edge.', 'Todavía no es mate. Prueba a dar jaque por el borde.', 'Noch kein Matt. Versuch, am Rand entlang Schach zu geben.', 'Ещё не мат. Попробуйте объявить шах вдоль края.']);
      }},

    {id: 'draws', icon: '🟰', title: ['Outros empates', 'Other draws', 'Otras tablas', 'Andere Unentschieden', 'Другие ничьи'], text: [
      ['Também é empate se ninguém tem peças para dar mate, como rei contra rei.', 'It\'s also a draw if nobody has enough pieces left to checkmate, like a king against a king.', 'También hay tablas si nadie tiene piezas para dar mate, como rey contra rey.', 'Unentschieden ist es auch, wenn niemand genug Figuren für ein Matt hat, wie König gegen König.', 'Ничья и тогда, когда ни у кого не хватает фигур для мата, например король против короля.'],
      ['Ou se a mesma posição aparece três vezes.', 'Or if the same position comes up three times.', 'O si la misma posición aparece tres veces.', 'Oder wenn dieselbe Stellung dreimal vorkommt.', 'Или если одна и та же позиция повторилась трижды.'],
      ['Ou se passam 50 lances seguidos sem capturar nada nem mexer um peão.', 'Or if 50 moves go by with nothing taken and no pawn moved.', 'O si pasan 50 jugadas sin capturar nada ni mover un peón.', 'Oder wenn 50 Züge vergehen, ohne dass geschlagen oder ein Bauer gezogen wird.', 'Или если прошло 50 ходов без взятий и ходов пешками.']]},

    {id: 'habits', icon: '💡', title: ['Pontos e bons hábitos', 'Points and good habits', 'Puntos y buenos hábitos', 'Punkte und gute Gewohnheiten', 'Очки и хорошие привычки'], text: [
      ['Pontos: peão 1, cavalo 3, bispo 3, torre 5, rainha 9. Troque uma peça barata por uma cara sempre que puder.', 'Points: pawn 1, knight 3, bishop 3, rook 5, queen 9. Swap a cheap piece for a dearer one when you can.', 'Puntos: peón 1, caballo 3, alfil 3, torre 5, dama 9. Cambia una pieza barata por una cara cuando puedas.', 'Punkte: Bauer 1, Springer 3, Läufer 3, Turm 5, Dame 9. Tausch eine billige Figur gegen eine teurere, wenn du kannst.', 'Очки: пешка 1, конь 3, слон 3, ладья 5, ферзь 9. Меняйте дешёвую фигуру на дорогую, когда можете.'],
      ['No começo: mexa um peão do meio, tire cavalos e bispos, depois faça o roque.', 'At the start: move a middle pawn, bring out your knights and bishops, then castle.', 'Al empezar: mueve un peón central, saca caballos y alfiles y luego enroca.', 'Am Anfang: einen mittleren Bauern ziehen, Springer und Läufer herausbringen, dann rochieren.', 'В начале: ход центральной пешкой, выведите коней и слонов, затем рокировка.'],
      ['Antes de cada lance: o que o outro lado ameaça? Dá para capturar algo de graça? A casa para onde vou é segura?', 'Before every move ask: what is the other side threatening? Can I take something for free? Is the square I\'m going to safe?', 'Antes de cada jugada: ¿qué amenaza el otro lado? ¿Puedo capturar algo gratis? ¿Es segura la casilla adonde voy?', 'Vor jedem Zug fragen: Was droht die andere Seite? Kann ich etwas umsonst schlagen? Ist das Feld, auf das ich ziehe, sicher?', 'Перед каждым ходом спросите себя: чем угрожает соперник? Можно ли что-то взять даром? Безопасна ли клетка, куда я иду?']]}
  ];

  // MARK: - Ticks, kept on this TV with the robots' levels

  function ticks(person) {
    var r = Table.record(person, 'lessons', true);
    if (!r.done) r.done = {};
    return r.done;
  }

  function progress(person) {
    var n = 0, done = Table.record(person, 'lessons').done || {};
    for (var i = 0; i < LESSONS.length; i++) if (done[LESSONS[i].id]) n++;
    return n;
  }

  function tick(person, lesson) {
    ticks(person)[lesson.id] = true;
    if (!person.guest) Table.keep();
  }

  function nextIndex(person) {
    var done = Table.record(person, 'lessons').done || {};
    for (var i = 0; i < LESSONS.length; i++) if (!done[LESSONS[i].id]) return i;
    return -1;
  }

  // MARK: - The screens

  var PLAY_COACH = ['Jogar com um treinador', 'Play with a coach', 'Jugar con un entrenador', 'Mit Trainer spielen', 'Играть с тренером'];
  var ALL = ['Todas as lições', 'All lessons', 'Todas las lecciones', 'Alle Lektionen', 'Все уроки'];

  /** Learn chess: the lessons, ticked off, and a game with the coach. */
  function open(person) {
    UI.open({
      cls: 'bt-table ch-card',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '🎓');
        UI.heading(box, L(['Aprender xadrez', 'Learn chess', 'Aprender ajedrez', 'Schach lernen', 'Учимся шахматам']), S(
          ['Uma ideia por vez, no seu ritmo. Lições feitas: {n} de {m}.', 'One idea at a time, at your own pace. Lessons done: {n} of {m}.', 'Una idea cada vez, a tu ritmo. Lecciones hechas: {n} de {m}.', 'Eine Idee nach der anderen, in deinem Tempo. Erledigt: {n} von {m}.', 'По одной идее, в своём темпе. Пройдено уроков: {n} из {m}.'],
          progress(person), LESSONS.length));
        var top = UI.el('div', 'bt-buttons', box), next = nextIndex(person);
        if (next >= 0) api.add(UI.button(top, '▶  ' + L(LESSONS[next].title), null, 'primary'), function () { lesson(person, next); }, {first: true});
        api.add(UI.button(top, '♞  ' + L(PLAY_COACH), null, next < 0 ? 'primary' : ''), function () { coach(person); }, {first: next < 0});
        if (window.Guides) api.add(UI.button(top, '📖  ' + tr('Como jogar', 'How to play', 'Cómo jugar')), function () { Guides.show('chess'); });
        var grid = UI.el('div', 'bt-buttons ch-lessons', box), done = Table.record(person, 'lessons').done || {};
        for (var i = 0; i < LESSONS.length; i++) {
          (function (n) {
            var b = UI.button(grid, LESSONS[n].icon + '  ' + L(LESSONS[n].title), null, done[LESSONS[n].id] ? 'done' : '');
            api.add(b, function () { lesson(person, n); });
          })(i);
        }
      }
    });
  }

  /** One lesson: how it works, then try it on the board (or, for the reading ones, on to the next). */
  function lesson(person, n) {
    var l = LESSONS[n];
    UI.open({
      cls: 'bt-table ch-card',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, l.icon);
        UI.heading(box, L(l.title), S(['Lição {n} de {m}', 'Lesson {n} of {m}', 'Lección {n} de {m}', 'Lektion {n} von {m}', 'Урок {n} из {m}'], n + 1, LESSONS.length));
        var text = UI.el('div', 'ch-text', box);
        for (var i = 0; i < l.text.length; i++) UI.el('div', '', text, L(l.text[i]));
        var row = UI.el('div', 'bt-buttons', box);
        if (l.fen) {
          api.add(UI.button(row, L(['Experimentar', 'Try it', 'Probarlo', 'Ausprobieren', 'Попробовать']), null, 'primary'), function () { api.close(); board(person, n); }, {first: true});
        } else {
          api.add(UI.button(row, (n + 1 < LESSONS.length ? L(['Próxima', 'Next', 'Siguiente', 'Weiter', 'Дальше']) : L(PLAY_COACH)) + '  ▶', null, 'primary'), function () {
            tick(person, l);
            api.close();
            if (n + 1 < LESSONS.length) lesson(person, n + 1); else coach(person);
          }, {first: true});
        }
        api.add(UI.button(row, L(ALL)), function () { api.close(); refresh(); });
      }
    });
  }

  function refresh() { if (UI.top()) UI.top().rebuild(); }

  function board(person, n) {
    var l = LESSONS[n];
    Chess.start({
      players: [person, {id: 'lesson', name: '', robot: true}], level: 1, fen: l.fen,
      lesson: {
        fen: l.fen, side: 'w', title: L(l.title),
        prompt: function () { return L(l.task); },
        after: function (m, ctl) { after(l, m, ctl); },
        passed: function () { tick(person, l); passed(person, n); }
      }
    });
  }

  function after(l, m, ctl) {
    var r = R(), s = ctl.s;
    if (l.all) {
      var left = 0;
      for (var i = 0; i < 64; i++) if (s.b[i] && r.sideOf(s.b[i]) === 'b' && r.kindOf(s.b[i]) !== 'k') left++;
      if (!left) { Sfx.play('win'); ctl.tell(L(['Muito bem!', 'Well done!', '¡Muy bien!', 'Gut gemacht!', 'Молодец!'])); ctl.done(1200); return; }
      ctl.tell(left === 1 ? L(['Boa! Falta um.', 'Nice! One to go.', '¡Bien! Queda uno.', 'Super! Noch einer.', 'Отлично! Осталась одна.']) :
        S(['Boa! Faltam {n}.', 'Nice! {n} to go.', '¡Bien! Quedan {n}.', 'Super! Noch {n}.', 'Отлично! Осталось: {n}.'], left));
      ctl.again();
      return;
    }
    if (l.goal(m, s)) { Sfx.play('win'); ctl.tell(L(['Muito bem!', 'Well done!', '¡Muy bien!', 'Gut gemacht!', 'Молодец!'])); ctl.done(1400); return; }
    Sfx.play('oops');
    ctl.tell(typeof l.wrong === 'function' ? l.wrong(m, s) : L(l.wrong || ['Quase! Tente de novo.', 'Nearly! Have another go.', '¡Casi! Inténtalo otra vez.', 'Fast! Versuch es nochmal.', 'Почти! Попробуйте ещё раз.']));
    ctl.reset(3200);
  }

  function passed(person, n) {
    var l = LESSONS[n], more = n + 1 < LESSONS.length;
    UI.open({
      cls: 'bt-table ch-card',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '⭐');
        UI.heading(box, L(['Muito bem!', 'Well done!', '¡Muy bien!', 'Gut gemacht!', 'Молодец!']), L(l.title) + ' ✓');
        var row = UI.el('div', 'bt-buttons', box);
        api.add(UI.button(row, (more ? L(['Próxima lição', 'Next lesson', 'Siguiente lección', 'Nächste Lektion', 'Следующий урок']) : L(PLAY_COACH)) + '  ▶', null, 'primary'), function () {
          api.close();
          if (more) lesson(person, n + 1); else coach(person);
        }, {first: true});
        api.add(UI.button(row, L(['De novo', 'Do it again', 'Otra vez', 'Nochmal', 'Ещё раз'])), function () { api.close(); board(person, n); });
        api.add(UI.button(row, L(ALL)), function () { api.close(); refresh(); });
      }
    });
  }

  /** A game against a gentle robot, with the coach: first a word on how the coach helps. */
  function coach(person) {
    UI.open({
      cls: 'bt-table ch-card',
      build: function (layer, api) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '♞');
        UI.heading(box, L(PLAY_COACH), L(['Você joga de brancas contra Kea, um robô que cresce com você.', 'You play White against Kea, a robot that grows with you.', 'Juegas con blancas contra Kea, un robot que crece contigo.', 'Du spielst Weiß gegen Kea, einen Roboter, der mit dir wächst.', 'Вы играете белыми против Кеа, робота, который растёт вместе с вами.']));
        var text = UI.el('div', 'ch-text', box);
        var lines = [
          ['Depois de cada lance, o treinador diz como foi e por quê, e o que teria sido melhor.', 'After every move the coach says how it went and why, and what would have been better.', 'Después de cada jugada, el entrenador dice cómo fue y por qué, y qué habría sido mejor.', 'Nach jedem Zug sagt der Trainer, wie er war und warum, und was besser gewesen wäre.', 'После каждого хода тренер скажет, как он, почему и что было бы лучше.'],
          ['Travou? OK numa casa vazia mostra um bom lance.', 'Stuck? OK on an empty square shows you a good move.', '¿Atascado? OK en una casilla vacía te enseña una buena jugada.', 'Kommst du nicht weiter? OK auf einem leeren Feld zeigt dir einen guten Zug.', 'Застряли? OK на пустой клетке покажет хороший ход.'],
          ['Antes de um erro grande, você tem uma segunda chance.', 'Before a big mistake, you get a second chance.', 'Antes de un error grande, tienes una segunda oportunidad.', 'Vor einem großen Fehler bekommst du eine zweite Chance.', 'Перед серьёзной ошибкой у вас будет второй шанс.'],
          ['Depois de cada lance do robô, ele diz o que o robô fez e o que está sob ataque.', 'After each of the robot\'s moves, it says what the robot did and what\'s under attack.', 'Tras cada jugada del robot, te dice qué hizo y qué está atacado.', 'Nach jedem Roboterzug sagt er, was der Roboter gemacht hat und was angegriffen wird.', 'После каждого хода робота он скажет, что сделал робот и что под атакой.']
        ];
        for (var i = 0; i < lines.length; i++) UI.el('div', '', text, L(lines[i]));
        var row = UI.el('div', 'bt-buttons', box);
        api.add(UI.button(row, L(['Jogar', 'Play', 'Jugar', 'Spielen', 'Играть']), null, 'primary'), function () { api.close(); coachGame(person); }, {first: true});
        api.add(UI.button(row, L(ALL)), function () { api.close(); refresh(); });
      }
    });
  }

  function coachGame(person) {
    var level = Table.robotLevel([person], 'learn');
    Chess.start({
      players: [person, {id: 'robot-kea', name: 'Kea', colour: '#55534B', emoji: '🤖', robot: true, level: level}],
      level: level, coach: true, again: function () { coachGame(person); }
    });
  }

  return {open: open, progress: progress, count: function () { return LESSONS.length; },
    // For chess.js's coached game.
    review: review, hint: hint, why: why, afterRobot: afterRobot, ask: ask, moveWords: moveWords,
    better: function (m) { return S(W.better, moveWords(m)); },
    // For the tests.
    lessons: LESSONS, danger: danger};
})();
