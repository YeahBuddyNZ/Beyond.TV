/*
 * Milo's Remote Control Land (ADR 0046): pick a machine (race car, monster truck, digger, dune buggy or bulldozer) and
 * drive it round a park full of ramps, things to smash, stars, balloons and a pond. Flips and spins in the air score
 * points, landing them keeps a combo going, and challenges give a goal. Played with the remote alone, one press per push
 * like the arcade (ADR 0035): ▲ ▼ change gear, ◀ ▶ turn a bit, OK jumps; in the air the arrows and OK do tricks. Back
 * pauses. Bests and finished challenges stay on this TV, nothing is sent. Google TV runs this same file in
 * TableActivity's WebView (start "rcland"). The words are the game's own, in all five languages, like guides.js.
 * Plain ES5: one canvas, plain shapes, nothing to download.
 * Since ADR 0048: three cameras (from above, chase and first person, the last two drawn in 3D by hand on the same
 * canvas), and a lake with four water sports (jet ski, speedboat, surfboard and water skis), waves to fly off and its
 * own challenges.
 */
var RCLand = (function () {
  'use strict';

  var W = 1280, H = 720, WW = 3600, WH = 2600;
  var KEY = 'btv.rcland';
  var G = 800, KICK = 2.2, ZT = 0.6, TAU = Math.PI * 2;
  var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;
  var INK = '#0D0C18', PAPER = '#F7F6F2', VIOLET = '#6E3DDB', LILAC = '#9E7BFF', EMBER = '#E8A33D', CORAL = '#D85A30',
    BLUE = '#378ADD', MOSS = '#2F7D6D', DUSK = '#2C2458';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  /** One line in the TV's language: [pt, en, es, de, ru]. */
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function sfx(kind) { if (window.Sfx) Sfx.play(kind); }

  // MARK: - Words

  var TITLE = ['Terra do Controle Remoto do Milo', 'Milo\'s Remote Control Land', 'La Tierra Teledirigida de Milo', 'Milos Fernsteuer-Land', 'Страна машинок Майло'];
  var PICK = ['Escolha sua máquina', 'Pick your machine', 'Elige tu máquina', 'Such dir deine Maschine aus', 'Выберите машину'];
  var PICK_HELP = ['◀ ▶ escolher  ·  ▲ ▼ terra, água ou câmera  ·  OK dirigir  ·  Voltar sair', '◀ ▶ pick  ·  ▲ ▼ land, water or camera  ·  OK to drive  ·  Back to leave',
    '◀ ▶ elegir  ·  ▲ ▼ tierra, agua o cámara  ·  OK conducir  ·  Atrás salir', '◀ ▶ wählen  ·  ▲ ▼ Land, Wasser oder Kamera  ·  OK losfahren  ·  Zurück verlassen',
    '◀ ▶ выбрать  ·  ▲ ▼ суша, вода или камера  ·  OK ехать  ·  «Назад» выйти'];
  var ON_LAND = ['Na terra', 'On land', 'En tierra', 'An Land', 'На суше'];
  var ON_WATER = ['Na água', 'On the water', 'En el agua', 'Auf dem Wasser', 'На воде'];
  var CAMERA = ['Câmera', 'Camera', 'Cámara', 'Kamera', 'Камера'];
  /** The three cameras: 0 from above, 1 chase (behind the machine), 2 first person (in the driver's seat). */
  var VIEWS = [['De cima', 'From above', 'Desde arriba', 'Von oben', 'Сверху'], ['Atrás', 'Chase', 'Detrás', 'Hinterher', 'Сзади'],
    ['Primeira pessoa', 'First person', 'Primera persona', 'Ich-Sicht', 'От первого лица']];
  var TOO_TOUGH_WATER = ['Duro demais! Tente a lancha.', 'Too tough! Try the speedboat.', '¡Demasiado duro! Prueba la lancha.', 'Zu hart! Probier das Rennboot.', 'Слишком прочно! Попробуйте катер.'];
  var SPLASHDOWN = ['Caiu na água! Aterrisse reto.', 'Splashdown! Land the right way up.', '¡Al agua! Aterriza derecho.', 'Platsch! Lande richtig herum.', 'Плюх! Приземляйтесь ровно.'];
  var WAVE = ['Onda!', 'Wave!', '¡Ola!', 'Welle!', 'Волна!'];
  var STAT_NAMES = [['Velocidade', 'Speed', 'Velocidad', 'Tempo', 'Скорость'], ['Pulo', 'Jump', 'Salto', 'Sprung', 'Прыжок'], ['Força', 'Smash', 'Fuerza', 'Kraft', 'Сила']];
  var SCORE = ['Pontos', 'Score', 'Puntos', 'Punkte', 'Очки'];
  var BEST = ['Recorde', 'Best', 'Récord', 'Rekord', 'Рекорд'];
  var CHALLENGES = ['Desafios', 'Challenges', 'Retos', 'Aufgaben', 'Задания'];
  var ALL_DONE = ['Todos feitos! Dirija à vontade.', 'All done! Drive wherever you like.', '¡Todos hechos! Conduce donde quieras.', 'Alles geschafft! Fahr, wohin du willst.', 'Всё выполнено! Катайтесь где хотите.'];
  var CHALLENGE_DONE = ['Desafio feito!', 'Challenge done!', '¡Reto hecho!', 'Aufgabe geschafft!', 'Задание выполнено!'];
  var HINT_GROUND = ['▲ mais rápido  ·  ▼ mais devagar  ·  ◀ ▶ virar  ·  OK pular', '▲ faster  ·  ▼ slower  ·  ◀ ▶ turn  ·  OK jump',
    '▲ más rápido  ·  ▼ más lento  ·  ◀ ▶ girar  ·  OK saltar', '▲ schneller  ·  ▼ langsamer  ·  ◀ ▶ lenken  ·  OK springen',
    '▲ быстрее  ·  ▼ медленнее  ·  ◀ ▶ поворот  ·  OK прыжок'];
  var HINT_SLAM = ['▲ mais rápido  ·  ▼ mais devagar  ·  ◀ ▶ virar  ·  OK bater a pá', '▲ faster  ·  ▼ slower  ·  ◀ ▶ turn  ·  OK bucket slam',
    '▲ más rápido  ·  ▼ más lento  ·  ◀ ▶ girar  ·  OK golpe de pala', '▲ schneller  ·  ▼ langsamer  ·  ◀ ▶ lenken  ·  OK Schaufelschlag',
    '▲ быстрее  ·  ▼ медленнее  ·  ◀ ▶ поворот  ·  OK удар ковшом'];
  var HINT_AIR = ['No ar!  ▲ ou OK mortal  ·  ▼ mortal para trás  ·  ◀ ▶ giro', 'In the air!  ▲ or OK front flip  ·  ▼ back flip  ·  ◀ ▶ spin',
    '¡En el aire!  ▲ u OK voltereta  ·  ▼ hacia atrás  ·  ◀ ▶ giro', 'In der Luft!  ▲ oder OK Salto  ·  ▼ Rückwärtssalto  ·  ◀ ▶ Dreher',
    'В воздухе!  ▲ или OK сальто  ·  ▼ назад  ·  ◀ ▶ вращение'];
  var GO = ['Aperte ▲ para andar!', 'Press ▲ to drive!', '¡Pulsa ▲ para conducir!', 'Drück ▲ zum Losfahren!', 'Нажмите ▲, чтобы поехать!'];
  var WIPEOUT = ['Capotou! Aterrisse de rodas para baixo.', 'Wipeout! Land with your wheels down.', '¡Volcaste! Aterriza con las ruedas abajo.', 'Umgekippt! Lande auf den Rädern.', 'Перевернулись! Приземляйтесь на колёса.'];
  var TOO_TOUGH = ['Duro demais! Tente a escavadeira.', 'Too tough! Try the digger or the bulldozer.', '¡Demasiado duro! Prueba la excavadora.', 'Zu hart! Probier den Bagger.', 'Слишком прочно! Попробуйте экскаватор.'];
  var STRIKE = ['Strike!', 'Strike!', '¡Pleno!', 'Strike!', 'Страйк!'];
  var TURBO = ['Turbo!', 'Turbo!', '¡Turbo!', 'Turbo!', 'Турбо!'];
  var SPLASH = ['Splash!', 'Splash!', '¡Chof!', 'Platsch!', 'Плюх!'];
  var BIG_AIR = ['Voo alto', 'Big air', 'Gran salto', 'Hoch hinaus', 'Высокий полёт'];
  var CLOSE_ONE = ['Por pouco!', 'Close one!', '¡Por poco!', 'Knapp!', 'Чуть-чуть!'];
  var SQUASH = ['Esmagado!', 'Squashed!', '¡Aplastado!', 'Geplättet!', 'Всмятку!'];
  var PAUSED = ['Pausado', 'Paused', 'En pausa', 'Pause', 'Пауза'];
  var MENU = [['Continuar dirigindo', 'Keep driving', 'Seguir conduciendo', 'Weiterfahren', 'Продолжить'],
    CAMERA,
    ['Trocar de máquina', 'Change machine', 'Cambiar de máquina', 'Maschine wechseln', 'Сменить машину'],
    ['Como jogar', 'How to play', 'Cómo jugar', 'Wie man spielt', 'Как играть'],
    ['Sair', 'Leave', 'Salir', 'Verlassen', 'Выйти']];
  var PAUSE_HELP = ['▲ ▼ escolher  ·  OK  ·  Voltar sair', '▲ ▼ choose  ·  OK  ·  Back to leave', '▲ ▼ elegir  ·  OK  ·  Atrás salir', '▲ ▼ wählen  ·  OK  ·  Zurück verlassen', '▲ ▼ выбрать  ·  OK  ·  «Назад» выйти'];
  var TRICKS = {
    front: ['Mortal', 'Front flip', 'Voltereta', 'Salto', 'Сальто'],
    back: ['Mortal para trás', 'Back flip', 'Voltereta atrás', 'Rückwärtssalto', 'Сальто назад'],
    spin: ['Giro', 'Spin', 'Giro', 'Dreher', 'Вращение']
  };

  // MARK: - The machines

  /** top: top speed, accel, turn (radians a second), jump (how high), flip (radians a second in the air), power (what it can smash). */
  var MACHINES = [
    {id: 'race', colour: CORAL, top: 780, accel: 520, turn: 5.2, jump: 1.0, flip: 12.5, power: 1, len: 64, wid: 36,
      name: ['Carro de corrida', 'Race car', 'Coche de carreras', 'Rennauto', 'Гоночная машина'],
      about: ['O mais rápido. Ótimo nas rampas.', 'The fastest. Brilliant off the ramps.', 'El más rápido. Genial en las rampas.', 'Das schnellste. Super auf Rampen.', 'Самая быстрая. Отлично прыгает с трамплинов.']},
    {id: 'truck', colour: VIOLET, top: 620, accel: 430, turn: 4.4, jump: 1.35, flip: 10.5, power: 2, len: 74, wid: 54,
      name: ['Caminhão monstro', 'Monster truck', 'Camión monstruo', 'Monstertruck', 'Монстр-трак'],
      about: ['Rodas gigantes, pulos enormes, esmaga carros velhos.', 'Giant wheels, huge jumps, squashes old cars.', 'Ruedas gigantes, saltos enormes, aplasta coches viejos.', 'Riesenräder, Riesensprünge, plättet alte Autos.', 'Огромные колёса, высокие прыжки, давит старые машины.']},
    {id: 'digger', colour: EMBER, top: 450, accel: 320, turn: 3.8, jump: 0.95, flip: 9.5, power: 3, len: 70, wid: 48, slam: true,
      name: ['Escavadeira', 'Digger', 'Excavadora', 'Bagger', 'Экскаватор'],
      about: ['OK bate a pá e quebra tudo em volta, até pedras.', 'OK slams the bucket and smashes everything round it, even rocks.', 'OK golpea con la pala y rompe todo alrededor, hasta rocas.', 'OK haut mit der Schaufel und zerlegt alles drumherum, sogar Felsen.', 'OK бьёт ковшом и крушит всё вокруг, даже камни.']},
    {id: 'buggy', colour: BLUE, top: 700, accel: 500, turn: 5.0, jump: 1.15, flip: 14, power: 1, len: 60, wid: 42,
      name: ['Buggy', 'Dune buggy', 'Buggy', 'Strandbuggy', 'Багги'],
      about: ['Leve no ar: os mortais mais rápidos.', 'Light in the air: the quickest flips.', 'Ligero en el aire: las volteretas más rápidas.', 'Leicht in der Luft: die schnellsten Saltos.', 'Лёгкий в воздухе: самые быстрые сальто.']},
    {id: 'dozer', colour: MOSS, top: 430, accel: 300, turn: 3.6, jump: 0.85, flip: 9, power: 3, len: 72, wid: 54,
      name: ['Trator de esteira', 'Bulldozer', 'Bulldozer', 'Planierraupe', 'Бульдозер'],
      about: ['Lento mas forte: passa direto pelas pedras.', 'Slow but strong: ploughs straight through rocks.', 'Lento pero fuerte: atraviesa las rocas.', 'Langsam, aber stark: schiebt Felsen einfach weg.', 'Медленный, но сильный: проходит сквозь камни.']},
    // On the water (the lake). grip: how quickly it stops sliding sideways after a turn.
    {id: 'jetski', water: true, colour: '#5CC4AE', top: 760, accel: 560, turn: 5.4, jump: 1.15, flip: 13.5, power: 1, len: 58, wid: 30, grip: 3,
      name: ['Jet ski', 'Jet ski', 'Moto de agua', 'Jetski', 'Гидроцикл'],
      about: ['Rápido e ágil: os melhores truques na água.', 'Quick and twisty: the best tricks on the water.', 'Rápida y ágil: los mejores trucos en el agua.', 'Schnell und wendig: die besten Tricks auf dem Wasser.', 'Быстрый и вертлявый: лучшие трюки на воде.']},
    {id: 'boat', water: true, colour: CORAL, top: 880, accel: 430, turn: 3.6, jump: 0.9, flip: 10, power: 2, len: 86, wid: 38, grip: 2,
      name: ['Lancha', 'Speedboat', 'Lancha rápida', 'Rennboot', 'Катер'],
      about: ['A mais rápida do lago. Quebra barris com a proa.', 'The fastest on the lake. Smashes barrels with its bow.', 'La más rápida del lago. Rompe barriles con la proa.', 'Das schnellste auf dem See. Zerlegt Fässer mit dem Bug.', 'Самый быстрый на озере. Разбивает бочки носом.']},
    {id: 'surf', water: true, colour: EMBER, top: 540, accel: 400, turn: 5.8, jump: 1.25, flip: 15, power: 1, len: 50, wid: 20, grip: 3.5, surf: true,
      name: ['Prancha de surfe', 'Surfboard', 'Tabla de surf', 'Surfbrett', 'Доска для сёрфинга'],
      about: ['Pegue uma onda e ela te leva: suba e voe lá de cima.', 'Catch a wave and it carries you: ride up it and fly off the top.', 'Coge una ola y te lleva: súbela y vuela desde arriba.', 'Erwisch eine Welle, sie trägt dich: reite hoch und flieg oben ab.', 'Поймайте волну, и она понесёт: взлетайте с гребня.']},
    {id: 'ski', water: true, colour: VIOLET, top: 720, accel: 460, turn: 4.6, jump: 1.4, flip: 12, power: 1, len: 40, wid: 24, grip: 2.5, towed: true,
      name: ['Esqui aquático', 'Water skis', 'Esquí acuático', 'Wasserski', 'Водные лыжи'],
      about: ['Um barquinho puxa você. Saltos enormes nas rampas.', 'A little boat pulls you along. Huge jumps off the ski ramps.', 'Una lancha pequeña tira de ti. Saltos enormes en las rampas.', 'Ein kleines Boot zieht dich. Riesensprünge über die Schanzen.', 'Вас тянет катер. Огромные прыжки с трамплинов.']}
  ];
  var LAND_COUNT = 5;

  // MARK: - Challenges, in order: three are on screen at a time

  var GOALS = [
    {stat: 'ramp', need: 1, text: ['Pule de uma rampa', 'Jump off a ramp', 'Salta desde una rampa', 'Spring über eine Rampe', 'Прыгните с трамплина']},
    {stat: 'smash', need: 10, text: ['Quebre 10 coisas', 'Smash 10 things', 'Rompe 10 cosas', 'Zerleg 10 Sachen', 'Разбейте 10 вещей']},
    {stat: 'stars', need: 3, text: ['Pegue 3 estrelas', 'Collect 3 stars', 'Coge 3 estrellas', 'Sammle 3 Sterne', 'Соберите 3 звезды']},
    {stat: 'front', need: 1, text: ['Dê um mortal', 'Do a front flip', 'Haz una voltereta', 'Mach einen Salto', 'Сделайте сальто']},
    {stat: 'back', need: 1, text: ['Dê um mortal para trás', 'Do a back flip', 'Haz una voltereta atrás', 'Mach einen Rückwärtssalto', 'Сделайте сальто назад']},
    {stat: 'spin', need: 1, text: ['Gire no ar', 'Spin round in the air', 'Gira en el aire', 'Dreh dich in der Luft', 'Покрутитесь в воздухе']},
    {stat: 'splash', need: 1, text: ['Passe pelo lago', 'Splash through the pond', 'Atraviesa el estanque', 'Fahr durch den Teich', 'Проедьте через пруд']},
    {stat: 'pins', need: 1, text: ['Derrube os 10 pinos', 'Knock down all 10 pins', 'Tira los 10 bolos', 'Wirf alle 10 Kegel um', 'Собейте все 10 кеглей']},
    {stat: 'boost', need: 1, text: ['Passe num turbo', 'Hit a turbo pad', 'Pasa por un turbo', 'Fahr über ein Turbofeld', 'Наедьте на турбо']},
    {stat: 'balloons', need: 3, text: ['Estoure 3 balões', 'Pop 3 balloons', 'Revienta 3 globos', 'Lass 3 Ballons platzen', 'Лопните 3 шарика']},
    {stat: 'double', need: 1, text: ['Dê dois mortais num pulo', 'Land two flips in one jump', 'Haz dos volteretas en un salto', 'Schaff zwei Saltos in einem Sprung', 'Два сальто за один прыжок']},
    {stat: 'combo', need: 5, text: ['Faça um combo x5', 'Get a x5 combo', 'Consigue un combo x5', 'Schaff eine x5-Kombo', 'Наберите комбо x5']},
    {stat: 'crush', need: 1, text: ['Esmague um carro velho', 'Squash an old car', 'Aplasta un coche viejo', 'Plätte ein altes Auto', 'Раздавите старую машину']},
    {stat: 'bigair', need: 1, text: ['Voe por um segundo e meio', 'Fly for a second and a half', 'Vuela un segundo y medio', 'Flieg eineinhalb Sekunden', 'Летите полторы секунды']},
    {stat: 'smash', need: 50, text: ['Quebre 50 coisas', 'Smash 50 things', 'Rompe 50 cosas', 'Zerleg 50 Sachen', 'Разбейте 50 вещей']},
    {stat: 'triple', need: 1, text: ['Três truques num pulo', 'Three tricks in one jump', 'Tres trucos en un salto', 'Drei Tricks in einem Sprung', 'Три трюка за прыжок']},
    {stat: 'stars', need: 15, text: ['Pegue 15 estrelas', 'Collect 15 stars', 'Coge 15 estrellas', 'Sammle 15 Sterne', 'Соберите 15 звёзд']},
    {stat: 'smash', need: 200, text: ['Quebre 200 coisas', 'Smash 200 things', 'Rompe 200 cosas', 'Zerleg 200 Sachen', 'Разбейте 200 вещей']}
  ];
  // On the lake: its own list, its counts kept apart (stat names start with w, see stat()).
  var WATER_GOALS = [
    {stat: 'wramp', need: 1, text: ['Pule de uma rampa de esqui', 'Jump off a ski ramp', 'Salta desde una rampa de esquí', 'Spring über eine Schanze', 'Прыгните с трамплина']},
    {stat: 'wsmash', need: 10, text: ['Bata em 10 coisas', 'Bump 10 things', 'Choca con 10 cosas', 'Ramm 10 Sachen', 'Сбейте 10 вещей']},
    {stat: 'whoops', need: 3, text: ['Passe por 3 aros', 'Go through 3 hoops', 'Pasa por 3 aros', 'Fahr durch 3 Ringe', 'Пройдите через 3 кольца']},
    {stat: 'wfront', need: 1, text: ['Dê um mortal', 'Do a front flip', 'Haz una voltereta', 'Mach einen Salto', 'Сделайте сальто']},
    {stat: 'wsurf', need: 1, text: ['Voe de uma onda', 'Fly off a wave', 'Vuela desde una ola', 'Flieg von einer Welle ab', 'Взлетите с волны']},
    {stat: 'wducks', need: 5, text: ['Bata em 5 patinhos', 'Bump 5 rubber ducks', 'Choca con 5 patitos', 'Ramm 5 Quietscheentchen', 'Сбейте 5 резиновых уточек']},
    {stat: 'wstars', need: 3, text: ['Pegue 3 estrelas', 'Collect 3 stars', 'Coge 3 estrellas', 'Sammle 3 Sterne', 'Соберите 3 звезды']},
    {stat: 'wback', need: 1, text: ['Dê um mortal para trás', 'Do a back flip', 'Haz una voltereta atrás', 'Mach einen Rückwärtssalto', 'Сделайте сальто назад']},
    {stat: 'wspin', need: 1, text: ['Gire no ar', 'Spin round in the air', 'Gira en el aire', 'Dreh dich in der Luft', 'Покрутитесь в воздухе']},
    {stat: 'wballoons', need: 3, text: ['Estoure 3 balões', 'Pop 3 balloons', 'Revienta 3 globos', 'Lass 3 Ballons platzen', 'Лопните 3 шарика']},
    {stat: 'wbarrels', need: 3, text: ['Quebre 3 barris', 'Smash 3 barrels', 'Rompe 3 barriles', 'Zerleg 3 Fässer', 'Разбейте 3 бочки']},
    {stat: 'wdouble', need: 1, text: ['Dê dois mortais num pulo', 'Land two flips in one jump', 'Haz dos volteretas en un salto', 'Schaff zwei Saltos in einem Sprung', 'Два сальто за один прыжок']},
    {stat: 'wcombo', need: 5, text: ['Faça um combo x5', 'Get a x5 combo', 'Consigue un combo x5', 'Schaff eine x5-Kombo', 'Наберите комбо x5']},
    {stat: 'wbigair', need: 1, text: ['Voe por um segundo e meio', 'Fly for a second and a half', 'Vuela un segundo y medio', 'Flieg eineinhalb Sekunden', 'Летите полторы секунды']},
    {stat: 'wsmash', need: 50, text: ['Bata em 50 coisas', 'Bump 50 things', 'Choca con 50 cosas', 'Ramm 50 Sachen', 'Сбейте 50 вещей']},
    {stat: 'wtriple', need: 1, text: ['Três truques num pulo', 'Three tricks in one jump', 'Tres trucos en un salto', 'Drei Tricks in einem Sprung', 'Три трюка за прыжок']},
    {stat: 'wstars', need: 12, text: ['Pegue 12 estrelas', 'Collect 12 stars', 'Coge 12 estrellas', 'Sammle 12 Sterne', 'Соберите 12 звёзд']},
    {stat: 'whoops', need: 12, text: ['Passe por 12 aros', 'Go through 12 hoops', 'Pasa por 12 aros', 'Fahr durch 12 Ringe', 'Пройдите через 12 колец']}
  ];
  for (var gi = 0; gi < GOALS.length; gi++) GOALS[gi].id = GOALS[gi].stat + GOALS[gi].need;
  for (gi = 0; gi < WATER_GOALS.length; gi++) WATER_GOALS[gi].id = WATER_GOALS[gi].stat + WATER_GOALS[gi].need;

  // MARK: - Saved on this TV

  function load() {
    try { var s = JSON.parse(window.localStorage.getItem(KEY)); if (s && typeof s === 'object') return s; } catch (e) {}
    return {};
  }
  function save(g) {
    var s = load();
    s[g.water ? 'bestWater' : 'best'] = Math.max(g.best, g.score);
    s.stats = g.stats; s.done = g.done; s.last = g.mi; s.view = g.view;
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  // MARK: - The park

  var seed = 1;
  function srand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /** What each kind of thing is: r its size, h how tall (fly higher to clear it), tough (power needed to smash), pts. */
  var KINDS = {
    cone: {r: 14, h: 30, tough: 1, pts: 25},
    crate: {r: 26, h: 50, tough: 1, pts: 50},
    pin: {r: 11, h: 36, tough: 1, pts: 40},
    melon: {r: 18, h: 26, tough: 1, pts: 60},
    block: {r: 20, h: 40, tough: 1, pts: 40},
    castle: {r: 32, h: 50, tough: 1, pts: 80},
    junk: {r: 44, h: 46, tough: 2, pts: 300},
    rock: {r: 36, h: 60, tough: 3, pts: 120},
    tree: {r: 42, h: 9999, tough: 99, pts: 0},
    balloon: {r: 26, h: 0, tough: 0, pts: 150, float: true},
    star: {r: 30, h: 0, tough: 0, pts: 200, float: true},
    // The lake.
    buoy: {r: 16, h: 34, tough: 1, pts: 40},
    duck: {r: 16, h: 26, tough: 1, pts: 60},
    barrel: {r: 22, h: 40, tough: 2, pts: 120},
    island: {r: 150, h: 9999, tough: 99, pts: 0},
    hoop: {r: 42, h: 0, tough: 0, pts: 250, float: true}
  };
  var BLOCKS = [CORAL, BLUE, EMBER, VIOLET, '#5CC4AE'];
  var BALLOONS = [CORAL, BLUE, LILAC, EMBER, '#5CC4AE', '#E8475C'];
  var SIZES = {small: {len: 150, wid: 120, h: 40}, big: {len: 220, wid: 150, h: 75}, mega: {len: 280, wid: 170, h: 120}};

  function buildWorld(water) {
    if (water) return buildLake();
    seed = 11;
    var w = {objs: [], ramps: [], pads: [], pins: [], waves: [], edge: 40, water: false,
      pond: {x: 850, y: 660, rx: 330, ry: 190}, sand: {x: 2380, y: 380, w: 860, h: 640},
      track: {x: 250, y: 230, w: 3100, h: 2170, r: 340}};
    function add(kind, x, y, extra) {
      var k = KINDS[kind], o = {kind: kind, x: x, y: y, r: k.r, h: k.h, tough: k.tough, pts: k.pts, float: !!k.float,
        z: 0, alive: true, back: 0, pop: 0, a: srand() * TAU, c: '', hx: x, hy: y};
      if (extra) for (var e in extra) if (extra.hasOwnProperty(e)) o[e] = extra[e];
      w.objs.push(o);
      return o;
    }
    function ramp(x, y, a, size) {
      var s = SIZES[size];
      w.ramps.push({x: x, y: y, a: a, ca: Math.cos(a), sa: Math.sin(a), len: s.len, wid: s.wid, h: s.h, size: size});
    }
    function pad(x, y, a) { w.pads.push({x: x, y: y, a: a, ca: Math.cos(a), sa: Math.sin(a), len: 120, wid: 110}); }
    function crates(x, y, cols, rows) {
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) add('crate', x + c * 54, y + r * 54);
    }
    function blocks(x, y, n) {
      for (var i = 0; i < n; i++) add('block', x + (i % 3) * 42, y + Math.floor(i / 3) * 42, {c: BLOCKS[i % BLOCKS.length]});
    }
    var U = -Math.PI / 2, i, j;

    // The start: a big ramp straight ahead, stars to catch in the air, then the bowling pins.
    ramp(1800, 1840, U, 'big');
    add('star', 1800, 1460, {z: 140}); add('star', 1800, 1250, {z: 230}); add('star', 1800, 1050, {z: 250});
    for (i = 0; i < 4; i++) for (j = 0; j <= i; j++) w.pins.push(add('pin', 1800 + (j - i / 2) * 34, 860 - i * 32));

    // The pond, with a mega ramp and a turbo pad to fly over it.
    pad(850, 1470, U);
    ramp(850, 1290, U, 'mega');
    add('star', 850, 840, {z: 150}); add('star', 850, 660, {z: 190}); add('star', 850, 480, {z: 150});
    add('balloon', 640, 640, {z: 120, c: BALLOONS[0]}); add('balloon', 1060, 640, {z: 120, c: BALLOONS[1]});

    // The ramp park on the left: crates to fly into, and a slalom of cones.
    ramp(430, 1700, 0, 'small');
    crates(700, 1660, 3, 2);
    ramp(420, 2050, 0, 'big');
    crates(1000, 2000, 2, 3);
    add('balloon', 760, 2020, {z: 120, c: BALLOONS[2]});
    for (i = 0; i < 7; i++) add('cone', 1330 + (i % 2 ? 60 : -60), 1180 + i * 90);
    add('star', 600, 1250, {z: 25}); add('star', 420, 2300, {z: 25});

    // The sandpit (top right): sandcastles for everyone, rocks for the digger and the bulldozer.
    ramp(2810, 1250, U, 'small');
    add('balloon', 2810, 960, {z: 110, c: BALLOONS[3]});
    var castles = [[2480, 480], [2620, 560], [2760, 470], [2540, 760], [2940, 800], [3120, 520]];
    for (i = 0; i < castles.length; i++) add('castle', castles[i][0], castles[i][1]);
    var rocks = [[2700, 700], [2860, 620], [3060, 700], [3140, 900], [2480, 940]];
    for (i = 0; i < rocks.length; i++) add('rock', rocks[i][0], rocks[i][1], {s: 0.8 + srand() * 0.4});
    add('star', 3000, 450, {z: 25});

    // The old cars (only the big machines squash them), the melon patch and the toy blocks.
    add('junk', 3000, 1420, {c: '#8A8F98'}); add('junk', 3130, 1560, {c: '#A0614A'}); add('junk', 2960, 1660, {c: '#6E8BA0'});
    for (i = 0; i < 4; i++) for (j = 0; j < 3; j++) add('melon', 2300 + i * 70 + (j % 2) * 30, 1720 + j * 70);
    blocks(2100, 1250, 6); blocks(1480, 700, 6);
    add('star', 2300, 1500, {z: 25});

    // Down the right: a big ramp at a stack of crates.
    ramp(2450, 2140, 0, 'big');
    crates(3080, 2090, 2, 3);
    add('balloon', 2880, 2140, {z: 130, c: BALLOONS[4]});
    ramp(1300, 2160, Math.PI * 1.25, 'big');
    add('balloon', 1020, 1880, {z: 120, c: BALLOONS[5]});

    // Turbo pads on the track, and cones at its corners.
    pad(1300, 2400, Math.PI); pad(2300, 2400, 0); pad(3350, 1400, U); pad(250, 1100, -U);
    var corners = [[480, 420], [3120, 420], [3120, 2210], [480, 2210]];
    for (i = 0; i < corners.length; i++) for (j = 0; j < 3; j++) add('cone', corners[i][0] + (j - 1) * 40, corners[i][1] + (j - 1) * 40 * (i % 2 ? -1 : 1));
    add('star', 1800, 230, {z: 25}); add('star', 3350, 1800, {z: 25}); add('star', 1200, 2400, {z: 25});

    // Trees round the edge, outside the track, and a few in the middle.
    for (i = 0; i < 14; i++) { add('tree', 120 + i * 260 + srand() * 60, 90 + srand() * 40); add('tree', 140 + i * 260 + srand() * 60, WH - 90 - srand() * 40); }
    for (i = 0; i < 9; i++) { add('tree', 90 + srand() * 40, 260 + i * 260); add('tree', WW - 90 - srand() * 40, 260 + i * 260); }
    var middle = [[1300, 420], [1420, 470], [2150, 700], [1450, 1700], [2150, 1950], [1980, 600]];
    for (i = 0; i < middle.length; i++) add('tree', middle[i][0], middle[i][1]);
    return w;
  }

  /** The lake: water from fence to fence with a beach round it, islands, ski ramps, a surf break with waves on the right. */
  function buildLake() {
    seed = 23;
    var w = {objs: [], ramps: [], pads: [], pins: [], waves: [], edge: 150, water: true, pond: null, sand: null, track: null,
      surf: {x: 2480, y: 300, w: 980, h: 2000}};
    function add(kind, x, y, extra) {
      var k = KINDS[kind], o = {kind: kind, x: x, y: y, r: k.r, h: k.h, tough: k.tough, pts: k.pts, float: !!k.float,
        z: 0, alive: true, back: 0, pop: 0, a: srand() * TAU, c: '', hx: x, hy: y};
      if (extra) for (var e in extra) if (extra.hasOwnProperty(e)) o[e] = extra[e];
      w.objs.push(o);
      return o;
    }
    function ramp(x, y, a, size) {
      var z = SIZES[size];
      var r = {x: x, y: y, a: a, ca: Math.cos(a), sa: Math.sin(a), len: z.len, wid: z.wid, h: z.h, size: size, float: true};
      w.ramps.push(r);
      return r;
    }
    var U = -Math.PI / 2, i;

    // The start: a ski ramp straight ahead, with stars to catch in the air and hoops beyond it.
    ramp(1800, 1840, U, 'big');
    add('star', 1800, 1460, {z: 140}); add('star', 1800, 1250, {z: 230}); add('star', 1800, 1050, {z: 250});
    add('hoop', 1800, 760, {z: 40}); add('hoop', 1800, 520, {z: 40}); add('hoop', 1800, 280, {z: 40});

    // Islands with palm trees (solid: steer round them).
    add('island', 900, 640, {r: 190}); add('island', 2120, 1420, {r: 120}); add('island', 470, 1560, {r: 110});

    // A flock of rubber ducks, a buoy slalom along the bottom and barrels for the speedboat.
    for (i = 0; i < 9; i++) add('duck', 1100 + (i % 3) * 70 + (Math.floor(i / 3) % 2) * 30, 1200 + Math.floor(i / 3) * 70);
    for (i = 0; i < 9; i++) add('buoy', 1000 + i * 150, 2240 + (i % 2 ? 70 : -70));
    for (i = 0; i < 6; i++) add('barrel', 2200 + (i % 3) * 60, 760 + Math.floor(i / 3) * 60);
    for (i = 0; i < 4; i++) add('barrel', 700 + (i % 2) * 60, 2140 + Math.floor(i / 2) * 60);
    for (i = 0; i < 6; i++) add('buoy', 1450 + i * 90, 380);

    // The mega ramp on the left, with hoops high in the air beyond it.
    ramp(560, 2250, U, 'mega');
    add('hoop', 560, 1880, {z: 170}); add('hoop', 560, 1640, {z: 210});
    add('star', 560, 1420, {z: 150});
    ramp(1300, 900, Math.PI, 'small');
    add('hoop', 1060, 900, {z: 80});
    ramp(2350, 2150, U, 'big');
    add('star', 2350, 1800, {z: 200});

    // Hoops and stars to go through on the water.
    var low = [[400, 400], [1300, 1650], [2600, 2350], [1550, 1500]];
    for (i = 0; i < low.length; i++) add('hoop', low[i][0], low[i][1], {z: 40});
    var stars = [[300, 900], [1300, 300], [2050, 2150], [2900, 700], [3050, 1300], [2850, 1900], [1500, 1950]];
    for (i = 0; i < stars.length; i++) add('star', stars[i][0], stars[i][1], {z: i > 2 && i < 6 ? 90 : 25});
    var balloons = [[1100, 520], [700, 1100], [1600, 2050], [2450, 1100], [3150, 1000], [2700, 2100]];
    for (i = 0; i < balloons.length; i++) add('balloon', balloons[i][0], balloons[i][1], {z: 120, c: BALLOONS[i % BALLOONS.length]});

    // The surf break: waves rolling right towards the beach. Each is a ramp that moves (wave: speed).
    var sf = w.surf;
    for (i = 0; i < 4; i++) {
      var wv = ramp(sf.x + i * 240, sf.y + sf.h / 2, 0, 'small');
      wv.len = 170; wv.wid = sf.h; wv.h = 55; wv.wave = 140; wv.float = false;
      w.waves.push(wv);
    }
    return w;
  }

  /** The waves roll on, and start again at the back of the surf break. */
  function rollWaves(w, dt) {
    for (var i = 0; i < w.waves.length; i++) {
      var r = w.waves[i];
      r.x += r.wave * dt;
      if (r.x > w.surf.x + w.surf.w - r.len) r.x -= w.waves.length * 240;
    }
  }

  /** The ground's height under a point: 0, or up a ramp. Sets world.under to the ramp. */
  function groundAt(w, x, y) {
    var best = 0;
    w.under = null;
    for (var i = 0; i < w.ramps.length; i++) {
      var r = w.ramps[i], dx = x - r.x, dy = y - r.y, u = dx * r.ca + dy * r.sa;
      if (u < 0 || u > r.len) continue;
      var v = -dx * r.sa + dy * r.ca;
      if (v < -r.wid / 2 || v > r.wid / 2) continue;
      var h = r.h * u / r.len;
      if (h >= best) { best = h; w.under = r; }
    }
    return best;
  }
  function onPad(w, x, y) {
    for (var i = 0; i < w.pads.length; i++) {
      var p = w.pads[i], dx = x - p.x, dy = y - p.y, u = dx * p.ca + dy * p.sa, v = -dx * p.sa + dy * p.ca;
      if (u > -p.len / 2 && u < p.len / 2 && v > -p.wid / 2 && v < p.wid / 2) return p;
    }
    return null;
  }
  function inPond(w, x, y) { if (!w.pond) return false; var p = w.pond, a = (x - p.x) / p.rx, b = (y - p.y) / p.ry; return a * a + b * b < 1; }
  function inSand(w, x, y) { if (!w.sand) return false; var s = w.sand; return x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h; }

  // MARK: - A game

  function newGame(mi, saved) {
    saved = saved || load();
    var stats = {}, k;
    if (saved.stats) for (k in saved.stats) if (saved.stats.hasOwnProperty(k)) stats[k] = saved.stats[k];
    var done = {};
    if (saved.done) for (k in saved.done) if (saved.done.hasOwnProperty(k)) done[k] = saved.done[k];
    var m = MACHINES[mi];
    return {
      m: m, mi: mi, water: !!m.water, view: saved.view > 0 && saved.view < VIEWS.length ? saved.view : 0, camT: 0,
      world: buildWorld(m.water), t: 0, score: 0, best: (m.water ? saved.bestWater : saved.best) || 0, stats: stats, done: done,
      car: {x: 1800, y: 2060, z: 0, vz: 0, h: -Math.PI / 2, want: -Math.PI / 2, speed: 0, gear: 0, steer: 0, air: false, vx: 0, vy: 0, ramp: null,
        kx: 0, ky: 0, boost: 0, wipe: 0, roll: 0, trick: null, queue: [], tricks: [], takeoff: 0, rampVz: 0, onRamp: false,
        slam: 0, slamCd: 0, wet: false, padCd: 0, safe: 0, trail: 0, run: 0, bonk: 0},
      combo: {n: 0, t: 0}, parts: [], pi: 0, pops: [], skids: [], si: 0,
      cam: {x: 1800, y: 1940, zoom: 1.15, shake: 0, yaw: -Math.PI / 2}, flash: 0, started: false, tough: 0, banner: null
    };
  }

  /** Counts for the challenges. On the lake they are kept apart: smash there is wsmash. */
  function stat(g, k, n) { k = (g.water ? 'w' : '') + k; g.stats[k] = (g.stats[k] || 0) + (n === undefined ? 1 : n); }

  /** The three challenges on screen: the first ones not yet done, on land or on the lake. */
  function current(g) {
    var out = [], list = g.water ? WATER_GOALS : GOALS;
    for (var i = 0; i < list.length && out.length < 3; i++) if (!g.done[list[i].id]) out.push(list[i]);
    return out;
  }
  function checkGoals(g) {
    var now = current(g);
    for (var i = 0; i < now.length; i++) {
      if ((g.stats[now[i].stat] || 0) < now[i].need) continue;
      g.done[now[i].id] = true;
      g.score += 500;
      g.banner = {text: L(now[i].text), t: 3};
      confetti(g);
      sfx('win');
      save(g);
    }
  }

  function comboMult(n) { return Math.min(5, 1 + Math.floor((n - 1) / 4)); }

  /** Points for something: they go into the combo, and the combo multiplies them. */
  function award(g, pts, x, y, z, label, colour, big) {
    var c = g.combo, was = comboMult(c.n || 1);
    c.n++; c.t = 3;
    var mult = comboMult(c.n), got = pts * mult;
    if (mult > was && c.n > 1) sfx('combo');
    var ck = g.water ? 'wcombo' : 'combo';
    if (mult > (g.stats[ck] || 0)) g.stats[ck] = mult;
    g.score += got;
    pop(g, (label ? label + '  ' : '') + '+' + got, x, y, z, colour || PAPER, big);
    checkGoals(g);
  }

  // MARK: - Juice: particles, pop-up words, skid marks, shake

  function part(g, x, y, z, vx, vy, vz, life, c, s, k) {
    var p = {x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, life: life, max: life, c: c, s: s, k: k || 0, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14};
    if (g.parts.length < 260) g.parts.push(p);
    else { g.parts[g.pi] = p; g.pi = (g.pi + 1) % 260; }
  }
  function burst(g, x, y, z, n, colours, speed, up, size, k) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.8);
      part(g, x, y, z, Math.cos(a) * v, Math.sin(a) * v, up * (0.5 + Math.random()), 0.7 + Math.random() * 0.6,
        colours[i % colours.length], size * (0.6 + Math.random() * 0.8), k);
    }
  }
  function confetti(g) {
    var car = g.car;
    burst(g, car.x, car.y, car.z + 40, 40, [CORAL, BLUE, EMBER, LILAC, '#5CC4AE', PAPER], 420, 520, 9, 0);
  }
  function pop(g, text, x, y, z, colour, big) {
    if (g.pops.length > 8) g.pops.shift();
    // Words that pop up together stack instead of landing on top of each other.
    var fresh = 0;
    for (var i = 0; i < g.pops.length; i++) if (g.pops[i].t < 0.5) fresh++;
    g.pops.push({s: text, x: x, y: y, z: (z || 0) + fresh * 70, t: 0, c: colour, big: !!big});
  }
  function shake(g, v) { if (v > g.cam.shake) g.cam.shake = v; }
  function skid(g, x1, y1, x2, y2) {
    var s = {x1: x1, y1: y1, x2: x2, y2: y2, life: 4};
    if (g.skids.length < 180) g.skids.push(s);
    else { g.skids[g.si] = s; g.si = (g.si + 1) % 180; }
  }

  // MARK: - Smashing and collecting

  var PIECES = {
    cone: ['#F07A2A', PAPER], crate: ['#C18A52', '#8A5A3B', '#E3B676'], pin: [PAPER, '#E8475C'],
    melon: ['#2E8B3E', '#E8475C', '#F26D7D', '#1C5E2A'], castle: ['#EBCB8B', '#D9B26F', '#F5DFA8'],
    junk: ['#8A8F98', '#A0614A', '#5B5E66', EMBER], rock: ['#8D8A86', '#6E6B68', '#B5B1AC'],
    buoy: ['#F07A2A', PAPER], duck: ['#F2C94C', EMBER, PAPER], barrel: ['#C0392B', '#8A2A20', '#5B5E66']
  };

  function smash(g, o, slammed) {
    var car = g.car;
    o.alive = false;
    o.back = 25 + Math.random() * 12;
    var colours = o.kind === 'block' ? [o.c, PAPER] : PIECES[o.kind] || [PAPER];
    var big = o.kind === 'junk' || o.kind === 'rock' || o.kind === 'castle' || o.kind === 'barrel';
    burst(g, o.x, o.y, o.h * 0.5, big ? 22 : 12, colours, big ? 320 : 260, big ? 420 : 340, big ? 12 : 8, o.kind === 'crate' ? 4 : 0);
    if (o.kind === 'castle' || o.kind === 'rock') burst(g, o.x, o.y, 10, 10, ['rgba(235,203,139,0.7)', 'rgba(255,255,255,0.5)'], 120, 80, 16, 1);
    if (o.kind === 'junk') burst(g, o.x, o.y, 30, 10, [EMBER, '#FFD27A'], 380, 300, 4, 1);
    if (g.water) burst(g, o.x, o.y, 4, 12, ['#BFE6FF', PAPER], 220, 380, 7, 1);
    if (o.kind === 'duck') stat(g, 'ducks');
    if (o.kind === 'barrel') stat(g, 'barrels');
    sfx(o.kind === 'duck' ? 'pop' : big ? 'crunch' : 'smash');
    shake(g, big ? 12 : 5);
    stat(g, 'smash');
    var label = '';
    if (o.kind === 'junk') { stat(g, 'crush'); label = L(SQUASH); if (!car.air) { car.air = true; car.vz = 220; car.takeoff = g.t; } }
    award(g, o.pts, o.x, o.y, o.h, label, big ? EMBER : PAPER, big);
    if (!slammed && !car.air) car.speed *= big ? 0.75 : 0.94;
    if (o.kind === 'pin') {
      var left = 0;
      for (var i = 0; i < g.world.pins.length; i++) if (g.world.pins[i].alive) left++;
      if (!left) {
        stat(g, 'pins');
        award(g, 500, o.x, o.y - 60, 80, L(STRIKE), EMBER, true);
        // All ten come back together.
        for (var j = 0; j < g.world.pins.length; j++) g.world.pins[j].back = 20;
      }
    }
  }

  function collect(g, o) {
    o.alive = false;
    o.back = 30 + Math.random() * 10;
    if (o.kind === 'star') {
      stat(g, 'stars');
      burst(g, o.x, o.y, o.z, 14, [EMBER, '#FFD27A', PAPER], 260, 200, 9, 2);
      sfx('star');
      award(g, o.pts, o.x, o.y, o.z, '★', EMBER);
    } else if (o.kind === 'hoop') {
      stat(g, 'hoops');
      part(g, o.x, o.y, o.z, 0, 0, 0, 0.4, LILAC, 50, 3);
      burst(g, o.x, o.y, o.z, 12, [LILAC, PAPER, EMBER], 260, 160, 7, 2);
      sfx('star');
      award(g, o.pts, o.x, o.y, o.z, '◎', LILAC);
    } else {
      stat(g, 'balloons');
      burst(g, o.x, o.y, o.z, 10, [o.c, PAPER], 300, 160, 8, 0);
      part(g, o.x, o.y, o.z, 0, 0, 0, 0.35, o.c, 30, 3);
      sfx('pop');
      award(g, o.pts, o.x, o.y, o.z, '', o.c);
    }
  }

  /** The digger's OK: the bucket comes down in front and smashes everything near it, rocks too. */
  function slam(g) {
    var car = g.car;
    if (car.slamCd > 0) return;
    car.slamCd = 0.7; car.slam = 0.4;
    var bx = car.x + Math.cos(car.h) * 70, by = car.y + Math.sin(car.h) * 70;
    stat(g, 'slam');
    shake(g, 14);
    sfx('slam');
    burst(g, bx, by, 5, 18, ['rgba(201,155,99,0.8)', 'rgba(235,203,139,0.7)', 'rgba(255,255,255,0.4)'], 300, 90, 18, 1);
    part(g, bx, by, 2, 0, 0, 0, 0.45, 'rgba(255,255,255,0.8)', 40, 3);
    var objs = g.world.objs;
    for (var i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (!o.alive || o.float || o.tough > 3) continue;
      var dx = o.x - bx, dy = o.y - by;
      if (dx * dx + dy * dy < (150 + o.r) * (150 + o.r)) smash(g, o, true);
    }
  }

  function hop(g) {
    var car = g.car;
    car.air = true; car.vz = 330 * g.m.jump; car.takeoff = g.t; car.tricks = [];
    sfx('jump');
  }

  function wipeout(g) {
    var car = g.car;
    car.wipe = 1.2; car.trick = null; car.queue = []; car.tricks = [];
    car.speed *= 0.4;
    g.combo.n = 0; g.combo.t = 0;
    shake(g, 18);
    sfx('crash');
    burst(g, car.x, car.y, 10, 18, ['rgba(201,155,99,0.8)', '#5B5E66', g.m.colour, EMBER], 300, 300, 10, 0);
    if (g.water) burst(g, car.x, car.y, 4, 26, ['#BFE6FF', '#7CC4F2', PAPER], 280, 460, 9, 1);
    pop(g, L(g.water ? SPLASHDOWN : WIPEOUT), car.x, car.y, 90, CORAL, true);
  }

  /** Coming down: tricks that finished score, one stopped halfway is a wipeout. */
  function land(g, ground) {
    var car = g.car, air = g.t - car.takeoff, tk = car.trick, close = false;
    car.air = false; car.z = ground; car.vz = 0; car.queue = []; car.trick = null;
    if (tk && tk.p > 0.15 && tk.p < 0.85) { wipeout(g); return; }
    if (tk && tk.p >= 0.85) { car.tricks.push(tk.k); close = true; }
    var front = 0, back = 0, spin = 0, i;
    for (i = 0; i < car.tricks.length; i++) {
      if (car.tricks[i] === 'front') front++; else if (car.tricks[i] === 'back') back++; else spin++;
    }
    var n = front + back + spin;
    sfx(g.water ? 'splash' : 'land');
    shake(g, Math.min(10, 2 + air * 5));
    if (g.water) burst(g, car.x, car.y, 3, 20, ['#BFE6FF', '#7CC4F2', PAPER], 240, 380, 8, 1);
    else burst(g, car.x, car.y, 2, 10, ['rgba(255,255,255,0.55)', 'rgba(201,155,99,0.6)'], 160, 40, 14, 1);
    if (air >= 1.5) stat(g, 'bigair');
    if (!n) {
      if (air > 0.9) award(g, Math.round(air * 10) * 10, car.x, car.y, 60, L(BIG_AIR), LILAC);
      car.tricks = [];
      return;
    }
    if (front) stat(g, 'front', front);
    if (back) stat(g, 'back', back);
    if (spin) stat(g, 'spin', spin);
    if (front + back >= 2) stat(g, 'double');
    if (n >= 3) stat(g, 'triple');
    var parts = [];
    if (front) parts.push(L(TRICKS.front) + (front > 1 ? ' x' + front : ''));
    if (back) parts.push(L(TRICKS.back) + (back > 1 ? ' x' + back : ''));
    if (spin) parts.push(L(TRICKS.spin) + (spin > 1 ? ' x' + spin : ''));
    var pts = Math.round((front * 400 + back * 400 + spin * 300) * (1 + 0.5 * (n - 1)) + (air > 0.6 ? air * 100 : 0));
    pts = Math.round(pts / 10) * 10;
    award(g, pts, car.x, car.y, 80, (close ? L(CLOSE_ONE) + ' ' : '') + parts.join(' + ') + '!', EMBER, true);
    for (i = 1; i < n; i++) g.combo.n++;
    car.tricks = [];
    if (n >= 2) confetti(g);
  }

  // MARK: - The remote

  /** Colour buttons, 1 2 3, C or V change the camera too, where a remote or keyboard has them. The pause menu always can. */
  var CAMERA_KEYS = {403: 1, 404: 1, 405: 1, 406: 1, 49: 1, 50: 1, 51: 1, 67: 1, 86: 1};
  function nextView(g, d) {
    g.view = (g.view + (d || 1) + VIEWS.length) % VIEWS.length;
    g.camT = 2.2;
  }

  function drive(g, k) {
    var car = g.car;
    if (CAMERA_KEYS[k]) { if (k >= 49 && k <= 51) { g.view = k - 49; g.camT = 2.2; } else nextView(g); return; }
    if (car.wipe > 0) return;
    if (car.air) {
      if (car.queue.length >= 3) return;
      if (k === UP || k === OK) car.queue.push('front');
      else if (k === DOWN) car.queue.push('back');
      else if (k === LEFT) car.queue.push('spinL');
      else if (k === RIGHT) car.queue.push('spinR');
      return;
    }
    if (k === UP) { car.gear = Math.min(3, car.gear + 1); g.started = true; }
    else if (k === DOWN) car.gear = Math.max(-1, car.gear - 1);
    else if (k === LEFT || k === RIGHT) {
      car.want += (k === LEFT ? -1 : 1) * Math.PI / 4;
      if (car.want - car.h > Math.PI) car.want = car.h + Math.PI;
      if (car.want - car.h < -Math.PI) car.want = car.h - Math.PI;
    } else if (k === OK) { if (g.m.slam) slam(g); else hop(g); }
  }

  // MARK: - One step of the world

  function step(g, dt) {
    var car = g.car, m = g.m, w = g.world, i;
    g.t += dt;
    if (g.flash > 0) g.flash -= dt;
    if (g.tough > 0) g.tough -= dt;
    if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
    if (g.combo.t > 0) { g.combo.t -= dt; if (g.combo.t <= 0) g.combo.n = 0; }
    if (car.slamCd > 0) car.slamCd -= dt;
    if (car.slam > 0) car.slam -= dt;
    if (car.padCd > 0) car.padCd -= dt;
    if (car.safe > 0) car.safe -= dt;
    if (car.bonk > 0) car.bonk -= dt;
    if (g.camT > 0) g.camT -= dt;
    if (w.waves.length) rollWaves(w, dt);

    if (car.wipe > 0) {
      car.wipe -= dt; car.roll += dt * 14;
      car.speed *= Math.pow(0.15, dt);
      if (car.wipe <= 0) { car.roll = 0; car.speed = 0; car.gear = Math.min(Math.max(car.gear, 1), 1); car.safe = 1.5; car.want = car.h; }
    }

    // Speed: each gear is a third of the top speed. A turbo pad pushes past it for a moment.
    var top = m.top, target = car.gear >= 0 ? car.gear / 3 * top : -top * 0.3;
    if (car.boost > 0) { car.boost -= dt; target = top * 1.45; }
    if (car.wipe > 0) target = 0;
    var wet = !car.air && inPond(w, car.x, car.y), sandy = !car.air && inSand(w, car.x, car.y);
    if (wet) target *= 0.55;
    if (sandy && m.power < 3) target *= 0.75;
    // The surfboard rides a wave faster than it can paddle.
    if (m.surf && !car.air && car.ramp && car.ramp.wave) target = Math.max(target, top * 1.5);
    if (!car.air) {
      var a = m.accel * dt * (Math.abs(target) < Math.abs(car.speed) ? 1.7 : 1);
      if (car.speed < target) car.speed = Math.min(target, car.speed + a); else car.speed = Math.max(target, car.speed - a);
      var diff = car.want - car.h, turn = m.turn * dt;
      car.h += Math.max(-turn, Math.min(turn, diff));
      car.steer += (Math.max(-0.5, Math.min(0.5, diff)) - car.steer) * Math.min(1, dt * 10);
      if (Math.abs(diff) > 0.3 && Math.abs(car.speed) > 260) {
        var rx = car.x - Math.cos(car.h) * m.len * 0.3, ry = car.y - Math.sin(car.h) * m.len * 0.3;
        var px = -Math.sin(car.h) * m.wid * 0.45, py = Math.cos(car.h) * m.wid * 0.45, bx = Math.cos(car.h) * 14, by = Math.sin(car.h) * 14;
        skid(g, rx + px - bx, ry + py - by, rx + px, ry + py);
        skid(g, rx - px - bx, ry - py - by, rx - px, ry - py);
      }
    }

    // On land the wheels grip; on water the machine slides on after a turn and catches up (grip).
    var vx, vy;
    if (m.water) {
      if (!car.air) {
        var gr = Math.min(1, dt * m.grip);
        car.vx += (Math.cos(car.h) * car.speed - car.vx) * gr; car.vy += (Math.sin(car.h) * car.speed - car.vy) * gr;
      }
      vx = car.vx + car.kx; vy = car.vy + car.ky;
    } else { vx = Math.cos(car.h) * car.speed + car.kx; vy = Math.sin(car.h) * car.speed + car.ky; car.vx = vx; car.vy = vy; }
    car.kx *= Math.pow(0.02, dt); car.ky *= Math.pow(0.02, dt);
    var nx = car.x + vx * dt, ny = car.y + vy * dt;
    var gh = groundAt(w, nx, ny), ramp = w.under;
    if (!car.air && gh > car.z + 22 && !(ramp && ramp.wave)) {
      // The side or the back of a ramp: it's a wall from there. A wave just lifts you.
      car.speed = -car.speed * 0.3; car.kx = -vx * 0.3; car.ky = -vy * 0.3; car.vx *= -0.3; car.vy *= -0.3;
      nx = car.x; ny = car.y; gh = groundAt(w, nx, ny); ramp = w.under;
      if (car.bonk <= 0) { sfx('bonk'); car.bonk = 0.4; }
      shake(g, 4);
    }
    car.x = nx; car.y = ny;
    car.run += Math.abs(car.speed) * dt;

    // The fence round the park.
    var cr = m.wid * 0.55, edge = w.edge + cr;
    if (car.x < edge || car.x > WW - edge || car.y < edge || car.y > WH - edge) {
      car.x = Math.max(edge, Math.min(WW - edge, car.x)); car.y = Math.max(edge, Math.min(WH - edge, car.y));
      car.speed = -car.speed * 0.3; car.vx *= -0.3; car.vy *= -0.3;
      if (car.bonk <= 0) { sfx('bonk'); car.bonk = 0.4; shake(g, 6); }
    }

    // Up and down.
    if (car.air) {
      car.vz -= G * dt;
      car.z += car.vz * dt;
      if (!car.trick && car.queue.length) car.trick = {k: car.queue.shift(), p: 0};
      if (car.trick) {
        car.trick.p += dt * m.flip / TAU * (car.trick.k === 'front' || car.trick.k === 'back' ? 1 : 1.15);
        if (car.trick.p >= 1) {
          car.tricks.push(car.trick.k === 'spinL' || car.trick.k === 'spinR' ? 'spin' : car.trick.k);
          car.trick = null;
          sfx('trick');
          part(g, car.x, car.y, car.z + 20, 0, 0, 0, 0.3, 'rgba(158,123,255,0.9)', 50, 3);
        }
      }
      if (car.z <= gh && car.vz <= 0) land(g, gh);
      else if (car.z < gh) car.z = gh;
    } else if (car.wipe <= 0) {
      if (car.onRamp && gh < car.z - 6) {
        car.air = true; car.vz = car.rampVz; car.takeoff = g.t; car.tricks = [];
        if (car.vz > 150) {
          if (car.ramp && car.ramp.wave) { stat(g, 'surf'); pop(g, L(WAVE), car.x, car.y, 80, '#BFE6FF', true); }
          else stat(g, 'ramp');
          sfx('jump'); checkGoals(g);
        }
      } else car.z = gh;
    }
    car.onRamp = !!ramp && !car.air;
    car.ramp = car.onRamp ? ramp : null;
    if (car.onRamp) {
      var along = vx * ramp.ca + vy * ramp.sa - (ramp.wave || 0);
      car.rampVz = Math.max(0, along) * ramp.h / ramp.len * KICK * m.jump;
    }

    // The ground underneath: turbo pads, the pond, dust.
    if (!car.air) {
      var p = onPad(w, car.x, car.y);
      if (p && car.padCd <= 0) {
        car.boost = 1.6; car.padCd = 1; if (car.gear < 1) car.gear = 1;
        stat(g, 'boost'); sfx('boost'); shake(g, 5);
        pop(g, L(TURBO), car.x, car.y, 70, LILAC, true);
        checkGoals(g);
      }
      if (wet && !car.wet) {
        stat(g, 'splash'); sfx('splash');
        pop(g, L(SPLASH), car.x, car.y, 70, BLUE, true);
        burst(g, car.x, car.y, 5, 24, ['#BFE6FF', '#7CC4F2', PAPER], 260, 420, 9, 1);
        checkGoals(g);
      }
      car.wet = wet;
      car.trail -= dt;
      if (car.trail <= 0 && Math.abs(car.speed) > 140) {
        car.trail = 0.05;
        var bx2 = car.x - Math.cos(car.h) * m.len * 0.5, by2 = car.y - Math.sin(car.h) * m.len * 0.5;
        var spray = wet || g.water;
        var col = spray ? '#BFE6FF' : sandy ? 'rgba(235,203,139,0.7)' : 'rgba(201,155,99,0.45)';
        if (g.water) col = Math.random() < 0.5 ? 'rgba(255,255,255,0.85)' : '#BFE6FF';
        part(g, bx2 + (Math.random() - 0.5) * m.wid, by2 + (Math.random() - 0.5) * m.wid, 3, -Math.cos(car.h) * 40, -Math.sin(car.h) * 40,
          spray ? 220 : 40, 0.5, col, spray ? 6 : 12, 1);
      }
    }
    if (car.boost > 0 && Math.random() < 0.6) {
      part(g, car.x - Math.cos(car.h) * m.len * 0.55, car.y - Math.sin(car.h) * m.len * 0.55, car.z + 8,
        -Math.cos(car.h) * 200, -Math.sin(car.h) * 200, 30, 0.35, Math.random() < 0.5 ? EMBER : LILAC, 9, 1);
    }

    // Bumping into things.
    var objs = w.objs;
    for (i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (!o.alive) {
        if (o.back > 0) {
          o.back -= dt;
          var fx = o.x - car.x, fy = o.y - car.y;
          if (o.back <= 0) {
            if (fx * fx + fy * fy > 700 * 700) { o.alive = true; o.pop = 0.5; } else o.back = 1;
          }
        }
        continue;
      }
      if (o.pop > 0) o.pop -= dt;
      var dx = o.x - car.x, dy = o.y - car.y, rr = o.r + cr;
      if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      var d2 = dx * dx + dy * dy;
      if (d2 > rr * rr) continue;
      if (o.float) { if (Math.abs(car.z + 15 - o.z) < 65 && car.wipe <= 0) collect(g, o); continue; }
      if (car.z > o.h) continue;
      if (o.tough <= m.power) { smash(g, o, false); continue; }
      // Too tough for this machine: bounce off it.
      var d = Math.sqrt(d2) || 1, ux = dx / d, uy = dy / d;
      car.x = o.x - ux * (rr + 1); car.y = o.y - uy * (rr + 1);
      var into = vx * ux + vy * uy;
      if (into > 0) { car.speed = -car.speed * 0.35; car.kx -= ux * into * 0.4; car.ky -= uy * into * 0.4; car.vx *= 0.2; car.vy *= 0.2; }
      if (car.bonk <= 0) { sfx('bonk'); car.bonk = 0.4; shake(g, 7); }
      if (o.tough < 99 && g.tough <= 0) { g.tough = 5; pop(g, L(g.water ? TOO_TOUGH_WATER : TOO_TOUGH), o.x, o.y, 90, PAPER); }
    }

    // Particles, words and skid marks.
    for (i = g.parts.length - 1; i >= 0; i--) {
      var q = g.parts[i];
      q.life -= dt;
      if (q.life <= 0) { g.parts.splice(i, 1); if (g.pi > i) g.pi--; if (g.pi >= g.parts.length) g.pi = 0; continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.k === 1) { q.vx *= Math.pow(0.2, dt); q.vy *= Math.pow(0.2, dt); q.z += q.vz * dt * 0.3; q.s += dt * 20; }
      else if (q.k !== 3) {
        q.vz -= G * 0.9 * dt; q.z += q.vz * dt;
        if (q.z < 0) { q.z = 0; q.vz = -q.vz * 0.35; q.vx *= 0.55; q.vy *= 0.55; q.vr *= 0.5; }
      }
    }
    for (i = g.pops.length - 1; i >= 0; i--) { g.pops[i].t += dt; if (g.pops[i].t > 1.6) g.pops.splice(i, 1); }
    for (i = 0; i < g.skids.length; i++) g.skids[i].life -= dt;

    // The camera looks ahead, pulls back with speed and height, and shakes.
    var cam = g.cam, look = 0.45;
    var tx = car.x + Math.cos(car.h) * car.speed * look, ty = car.y + Math.sin(car.h) * car.speed * look - car.z * ZT * 0.6;
    cam.x += (tx - cam.x) * Math.min(1, dt * 3); cam.y += (ty - cam.y) * Math.min(1, dt * 3);
    var zoom = 1.15 - 0.14 * Math.min(1, Math.abs(car.speed) / m.top) - Math.min(0.22, car.z / 900);
    cam.zoom += (zoom - cam.zoom) * Math.min(1, dt * 2);
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 40);
    // The chase camera swings round behind the machine, a little behind its turns.
    var dyaw = car.h - cam.yaw;
    while (dyaw > Math.PI) dyaw -= TAU;
    while (dyaw < -Math.PI) dyaw += TAU;
    cam.yaw += dyaw * Math.min(1, dt * 3.5);
  }

  // MARK: - Drawing

  var c = null;
  function rr(x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    c.lineTo(x + w, y + h - r); c.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    c.lineTo(x + r, y + h); c.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    c.closePath();
  }
  function box(x, y, w, h, r, fill) { c.fillStyle = fill; rr(x, y, w, h, r); c.fill(); }
  function disc(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function oval(x, y, rx, ry, fill) { c.fillStyle = fill; c.beginPath(); c.save(); c.translate(x, y); c.scale(rx, ry); c.arc(0, 0, 1, 0, TAU); c.restore(); c.fill(); }
  function text(s, x, y, size, fill, align, weight, outline) {
    c.font = (weight || '700') + ' ' + size + 'px Sora, Inter, Arial, sans-serif';
    c.textAlign = align || 'left'; c.textBaseline = 'middle';
    if (outline) { c.lineWidth = Math.max(4, size / 7); c.strokeStyle = outline; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = fill;
    c.fillText(s, x, y);
  }
  function starPath(x, y, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
      if (i) c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }

  function wheel(x, y, w, h, a) {
    c.save(); c.translate(x, y); if (a) c.rotate(a);
    box(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.3, '#1E1D24');
    c.fillStyle = '#3A3942';
    for (var i = -w / 2 + 3; i < w / 2 - 2; i += 5) c.fillRect(i, -h / 2 + 1, 2, h - 2);
    c.restore();
  }
  function tracks(len, wid, run) {
    for (var s = -1; s <= 1; s += 2) {
      var y = s > 0 ? wid / 2 - 13 : -wid / 2;
      box(-len * 0.45, y, len * 0.8, 13, 6, '#24232B');
      c.fillStyle = '#4A4952';
      var off = run % 8;
      for (var x = -len * 0.45 + off; x < len * 0.35; x += 8) c.fillRect(x, y + 1, 3, 11);
    }
  }

  /** A machine seen from above, nose to +x. under: drawn upside down (the chassis). arm: the digger's bucket, 0 to 1. */
  /** The water machines from above: a hull (or a board) and whoever rides it. */
  function rider(x, colour) {
    oval(x - 2, 0, 9, 12, '#2B3A55');
    disc(x, 0, 9, colour); disc(x + 2, 0, 6, '#E8B58A');
    c.fillStyle = '#3B2A1E'; c.beginPath(); c.arc(x + 1, 0, 6, Math.PI * 0.5, Math.PI * 1.5); c.fill();
  }
  function hull(L2, Wd, colour) {
    c.fillStyle = colour;
    c.beginPath(); c.moveTo(L2 / 2, 0); c.quadraticCurveTo(L2 * 0.2, -Wd / 2, -L2 * 0.45, -Wd * 0.45); c.lineTo(-L2 / 2, -Wd * 0.38);
    c.lineTo(-L2 / 2, Wd * 0.38); c.lineTo(-L2 * 0.45, Wd * 0.45); c.quadraticCurveTo(L2 * 0.2, Wd / 2, L2 / 2, 0); c.fill();
  }
  function waterMachine(m, under, run) {
    var L2 = m.len, Wd = m.wid;
    if (under) { hull(L2, Wd, '#2B2A33'); c.fillStyle = '#55534B'; c.fillRect(-L2 * 0.4, -2, L2 * 0.8, 4); return; }
    if (m.id === 'jetski') {
      hull(L2, Wd, m.colour);
      box(-L2 * 0.42, -Wd * 0.26, L2 * 0.5, Wd * 0.52, 6, '#22221F');
      c.fillStyle = PAPER; c.fillRect(L2 * 0.1, -Wd * 0.5, 4, Wd);
      rider(-L2 * 0.12, CORAL);
    } else if (m.id === 'boat') {
      hull(L2, Wd, PAPER);
      hull(L2 * 0.9, Wd * 0.8, m.colour);
      box(-L2 * 0.3, -Wd * 0.3, L2 * 0.42, Wd * 0.6, 6, PAPER);
      box(L2 * 0.08, -Wd * 0.3, 7, Wd * 0.6, 3, LILAC);
      box(-L2 * 0.58, -Wd * 0.22, 10, Wd * 0.44, 3, '#22221F');
      rider(-L2 * 0.12, BLUE);
    } else if (m.id === 'surf') {
      oval(0, 0, L2 / 2, Wd / 2, m.colour);
      c.fillStyle = PAPER; c.fillRect(-L2 * 0.45, -2, L2 * 0.9, 4);
      rider(-2, '#5CC4AE');
    } else {
      box(-L2 / 2, -Wd / 2, L2, 7, 3, m.colour); box(-L2 / 2, Wd / 2 - 7, L2, 7, 3, m.colour);
      c.strokeStyle = '#22221F'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(4, -6); c.lineTo(L2 * 0.6, 0); c.lineTo(4, 6); c.stroke();
      rider(-2, EMBER);
    }
  }
  /** The wake behind a water machine on the move. */
  function wake(L2, Wd, run) {
    c.fillStyle = 'rgba(255,255,255,0.5)';
    var wob = Math.sin(run / 30) * 3;
    c.beginPath(); c.moveTo(-L2 * 0.5, -Wd * 0.4); c.lineTo(-L2 * 0.9, -Wd * 0.7 + wob); c.lineTo(-L2 * 0.9, Wd * 0.7 - wob); c.lineTo(-L2 * 0.5, Wd * 0.4); c.fill();
  }
  /** The little boat that tows the water skier, from above. */
  function towBoat(x, y, h, run) {
    c.save(); c.translate(x, y); c.rotate(h);
    wake(70, 32, run);
    waterMachine({id: 'boat', len: 70, wid: 32, colour: BLUE}, false, run);
    c.restore();
  }

  function machine(m, steer, under, run, arm) {
    var L2 = m.len, Wd = m.wid;
    if (m.water) { waterMachine(m, under, run); return; }
    if (m.id === 'digger' || m.id === 'dozer') tracks(L2, Wd, run);
    else if (m.id === 'truck') {
      wheel(L2 * 0.32, -Wd * 0.42, 26, 17, steer); wheel(L2 * 0.32, Wd * 0.42, 26, 17, steer);
      wheel(-L2 * 0.32, -Wd * 0.42, 26, 17); wheel(-L2 * 0.32, Wd * 0.42, 26, 17);
    } else if (m.id === 'buggy') {
      wheel(L2 * 0.33, -Wd * 0.48, 16, 10, steer); wheel(L2 * 0.33, Wd * 0.48, 16, 10, steer);
      wheel(-L2 * 0.3, -Wd * 0.5, 21, 13); wheel(-L2 * 0.3, Wd * 0.5, 21, 13);
    } else {
      wheel(L2 * 0.3, -Wd * 0.5, 16, 9, steer); wheel(L2 * 0.3, Wd * 0.5, 16, 9, steer);
      wheel(-L2 * 0.3, -Wd * 0.5, 17, 10); wheel(-L2 * 0.3, Wd * 0.5, 17, 10);
    }
    if (under) {
      box(-L2 * 0.42, -Wd * 0.3, L2 * 0.84, Wd * 0.6, 8, '#2B2A33');
      c.fillStyle = '#55534B';
      c.fillRect(L2 * 0.28, -Wd * 0.45, 4, Wd * 0.9); c.fillRect(-L2 * 0.32, -Wd * 0.45, 4, Wd * 0.9);
      c.fillRect(-L2 * 0.4, -2, L2 * 0.75, 4);
      disc(-L2 * 0.42, Wd * 0.18, 4, '#8D8A86');
      return;
    }
    if (m.id === 'race') {
      c.fillStyle = m.colour;
      c.beginPath(); c.moveTo(L2 / 2 + 2, 0); c.lineTo(L2 * 0.25, -Wd * 0.3); c.lineTo(-L2 * 0.42, -Wd * 0.38); c.lineTo(-L2 * 0.5, -Wd * 0.36);
      c.lineTo(-L2 * 0.5, Wd * 0.36); c.lineTo(-L2 * 0.42, Wd * 0.38); c.lineTo(L2 * 0.25, Wd * 0.3); c.closePath(); c.fill();
      c.fillStyle = PAPER; c.fillRect(-L2 * 0.5, -3, L2, 6);
      box(L2 * 0.42, -Wd * 0.48, 7, Wd * 0.96, 3, '#22221F');
      box(-L2 * 0.56, -Wd * 0.46, 8, Wd * 0.92, 3, '#22221F');
      oval(-L2 * 0.04, 0, 12, 9, '#22221F');
      disc(-L2 * 0.04, 0, 5.5, EMBER);
    } else if (m.id === 'truck') {
      box(-L2 * 0.4, -Wd * 0.3, L2 * 0.8, Wd * 0.6, 9, m.colour);
      box(-L2 * 0.12, -Wd * 0.24, L2 * 0.34, Wd * 0.48, 6, LILAC);
      box(-L2 * 0.06, -Wd * 0.18, L2 * 0.2, Wd * 0.36, 4, '#3B2A86');
      c.fillStyle = EMBER;
      for (var f = 0; f < 3; f++) { c.beginPath(); c.moveTo(L2 * 0.38, (f - 1) * 7); c.lineTo(L2 * 0.24, (f - 1) * 7 - 4); c.lineTo(L2 * 0.24, (f - 1) * 7 + 4); c.fill(); }
      c.strokeStyle = '#22221F'; c.lineWidth = 3; c.strokeRect(-L2 * 0.36, -Wd * 0.26, L2 * 0.2, Wd * 0.52);
    } else if (m.id === 'digger') {
      var reach = 38 + (arm > 0 ? Math.sin(arm / 0.4 * Math.PI) * 26 : Math.sin(run / 40) * 2);
      c.strokeStyle = '#C98A1E'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(L2 * 0.05, Wd * 0.12); c.lineTo(L2 * 0.05 + reach, Wd * 0.12); c.stroke();
      box(L2 * 0.05 + reach - 2, Wd * 0.12 - 15, 16, 30, 4, '#5B5E66');
      c.fillStyle = '#3A3942'; for (var tth = 0; tth < 4; tth++) c.fillRect(L2 * 0.05 + reach + 13, Wd * 0.12 - 13 + tth * 8, 5, 4);
      box(-L2 * 0.38, -Wd * 0.36, L2 * 0.56, Wd * 0.72, 7, m.colour);
      box(-L2 * 0.12, -Wd * 0.3, L2 * 0.26, Wd * 0.34, 4, '#2B3A55');
      box(-L2 * 0.45, -Wd * 0.3, 10, Wd * 0.6, 4, '#C98A1E');
      disc(-L2 * 0.25, Wd * 0.2, 4, '#22221F');
    } else if (m.id === 'buggy') {
      c.strokeStyle = m.colour; c.lineWidth = 5; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(L2 * 0.48, 0); c.lineTo(L2 * 0.2, -Wd * 0.3); c.lineTo(-L2 * 0.4, -Wd * 0.32); c.lineTo(-L2 * 0.4, Wd * 0.32);
      c.lineTo(L2 * 0.2, Wd * 0.3); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(L2 * 0.08, -Wd * 0.3); c.lineTo(-L2 * 0.2, Wd * 0.3); c.moveTo(L2 * 0.08, Wd * 0.3); c.lineTo(-L2 * 0.2, -Wd * 0.3); c.stroke();
      box(-L2 * 0.25, -Wd * 0.16, L2 * 0.26, Wd * 0.32, 5, '#22221F');
      disc(-L2 * 0.1, 0, 7, PAPER); disc(-L2 * 0.08, 0, 4, BLUE);
      box(-L2 * 0.5, -Wd * 0.2, 6, Wd * 0.4, 2, '#5B5E66');
    } else {
      box(L2 * 0.4, -Wd * 0.62, 10, Wd * 1.24, 3, '#C9C5BE');
      c.fillStyle = EMBER; c.fillRect(L2 * 0.4, -Wd * 0.62, 4, Wd * 1.24);
      c.fillStyle = '#5B5E66'; c.fillRect(L2 * 0.22, -Wd * 0.3, L2 * 0.2, 5); c.fillRect(L2 * 0.22, Wd * 0.3 - 5, L2 * 0.2, 5);
      box(-L2 * 0.38, -Wd * 0.32, L2 * 0.62, Wd * 0.64, 7, m.colour);
      box(-L2 * 0.2, -Wd * 0.24, L2 * 0.28, Wd * 0.48, 4, '#1E3D36');
      box(-L2 * 0.16, -Wd * 0.2, L2 * 0.2, Wd * 0.4, 3, '#7FC7B6');
      disc(L2 * 0.12, -Wd * 0.2, 4, '#22221F');
    }
  }

  // Ramp colours: wooden in the park, white and red ski jumps floating on the lake. [back, sides, foot, top, lines]
  var WOOD = ['#7A4E2E', '#8F5E37', '#D9A36A', '#F2C98E', 'rgba(122,78,46,0.35)'];
  var SKI = ['#B23A2A', '#D85A30', '#E9EEF2', '#FFFFFF', 'rgba(55,138,221,0.35)'];

  /** A wave from above: blue water rising to white foam on its crest. */
  function drawWave(r) {
    var y0 = r.y - r.wid / 2;
    var grad = c.createLinearGradient(r.x, 0, r.x + r.len, 0);
    grad.addColorStop(0, 'rgba(62,155,214,0)'); grad.addColorStop(0.7, '#7CC4F2'); grad.addColorStop(1, '#E9F6FF');
    c.fillStyle = grad; c.fillRect(r.x, y0, r.len, r.wid);
    c.fillStyle = PAPER; c.fillRect(r.x + r.len - 10, y0, 14, r.wid);
    c.fillStyle = 'rgba(30,90,140,0.25)'; c.fillRect(r.x + r.len + 4, y0, 22, r.wid);
  }

  function drawRamp(r) {
    if (r.wave) { drawWave(r); return; }
    var pal = r.float ? SKI : WOOD;
    // Corners: base left and right on the ground, top left and right up in the air.
    var px = -r.sa * r.wid / 2, py = r.ca * r.wid / 2, tx = r.x + r.ca * r.len, ty = r.y + r.sa * r.len, up = r.h * ZT;
    c.fillStyle = r.float ? 'rgba(20,60,110,0.25)' : 'rgba(0,0,0,0.18)';
    c.beginPath(); c.moveTo(r.x + px, r.y + py); c.lineTo(r.x - px, r.y - py); c.lineTo(tx - px + 10, ty - py + 12); c.lineTo(tx + px + 10, ty + py + 12); c.fill();
    c.fillStyle = pal[0];
    c.beginPath(); c.moveTo(tx + px, ty + py); c.lineTo(tx - px, ty - py); c.lineTo(tx - px, ty - py - up); c.lineTo(tx + px, ty + py - up); c.fill();
    c.fillStyle = pal[1];
    c.beginPath(); c.moveTo(r.x + px, r.y + py); c.lineTo(tx + px, ty + py); c.lineTo(tx + px, ty + py - up); c.fill();
    c.beginPath(); c.moveTo(r.x - px, r.y - py); c.lineTo(tx - px, ty - py); c.lineTo(tx - px, ty - py - up); c.fill();
    var grad = c.createLinearGradient(r.x, r.y, tx, ty - up);
    grad.addColorStop(0, pal[2]); grad.addColorStop(1, pal[3]);
    c.fillStyle = grad;
    c.beginPath(); c.moveTo(r.x + px, r.y + py); c.lineTo(r.x - px, r.y - py); c.lineTo(tx - px, ty - py - up); c.lineTo(tx + px, ty + py - up); c.fill();
    // Planks and arrows up the slope.
    c.strokeStyle = pal[4]; c.lineWidth = 2;
    for (var k = 1; k < 6; k++) {
      var f = k / 6, cx = r.x + r.ca * r.len * f, cy = r.y + r.sa * r.len * f - up * f;
      c.beginPath(); c.moveTo(cx + px, cy + py); c.lineTo(cx - px, cy - py); c.stroke();
    }
    c.fillStyle = r.size === 'mega' ? CORAL : EMBER;
    for (var n = 0; n < 2; n++) {
      var f2 = 0.3 + n * 0.32, ax = r.x + r.ca * r.len * f2, ay = r.y + r.sa * r.len * f2 - up * f2, s = r.wid * 0.22;
      c.beginPath();
      c.moveTo(ax + r.ca * s, ay + r.sa * s - up / r.len * s);
      c.lineTo(ax - r.sa * s - r.ca * s * 0.3, ay + r.ca * s - r.sa * s * 0.3);
      c.lineTo(ax + r.sa * s - r.ca * s * 0.3, ay - r.ca * s - r.sa * s * 0.3);
      c.fill();
    }
  }

  function drawPad(p, t) {
    c.save(); c.translate(p.x, p.y); c.rotate(p.a);
    box(-p.len / 2, -p.wid / 2, p.len, p.wid, 14, '#2C2458');
    for (var i = 0; i < 3; i++) {
      var glow = (Math.sin(t * 8 - i * 1.2) + 1) / 2;
      c.fillStyle = 'rgba(158,123,255,' + (0.35 + glow * 0.65) + ')';
      var x = -p.len / 2 + 18 + i * 32;
      c.beginPath(); c.moveTo(x, -p.wid * 0.32); c.lineTo(x + 24, 0); c.lineTo(x, p.wid * 0.32); c.lineTo(x + 10, 0); c.closePath(); c.fill();
    }
    c.restore();
  }

  function palm(x, y, k) {
    oval(x + 14 * k, y + 16 * k, 46 * k, 30 * k, 'rgba(0,0,0,0.18)');
    c.fillStyle = '#2E8B3E';
    for (var i = 0; i < 6; i++) {
      var a = i * TAU / 6 + 0.3;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a + 0.4) * 34 * k, y + Math.sin(a + 0.4) * 34 * k, x + Math.cos(a) * 58 * k, y + Math.sin(a) * 58 * k);
      c.quadraticCurveTo(x + Math.cos(a - 0.3) * 26 * k, y + Math.sin(a - 0.3) * 26 * k, x, y); c.fill();
    }
    disc(x, y, 9 * k, '#8A5A3B');
  }

  function drawObj(o, t) {
    var s = o.pop > 0 ? 1 - o.pop * 1.6 : 1;
    if (s <= 0.05) return;
    if (o.float) {
      var bob = Math.sin(t * 2 + o.a) * 8, y = o.y - (o.z + bob) * ZT;
      oval(o.x, o.y + 4, o.r * 0.7, o.r * 0.35, 'rgba(0,0,0,0.16)');
      if (o.kind === 'hoop') {
        // Bobbing above the water on a post, edge on from above.
        c.fillStyle = 'rgba(247,246,242,0.8)'; c.fillRect(o.x - 2, y, 4, o.y - y);
        c.save(); c.translate(o.x, y); c.scale(s, s);
        c.strokeStyle = EMBER; c.lineWidth = 9; oval(0, 0, o.r, o.r * 0.42, 'rgba(158,123,255,0.25)');
        c.beginPath(); c.save(); c.scale(1, 0.42); c.arc(0, 0, o.r, 0, TAU); c.restore(); c.stroke();
        c.restore();
      } else if (o.kind === 'balloon') {
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(o.x, y + o.r); c.quadraticCurveTo(o.x + 8, y + o.r + 20, o.x, o.y); c.stroke();
        oval(o.x, y, o.r * 0.85 * s, o.r * s, o.c);
        oval(o.x - o.r * 0.3, y - o.r * 0.35, o.r * 0.22, o.r * 0.3, 'rgba(255,255,255,0.5)');
      } else {
        c.save(); c.translate(o.x, y); c.scale(Math.cos(t * 3 + o.a) * s, s);
        disc(0, 0, o.r * 0.9, 'rgba(232,163,61,0.25)');
        c.fillStyle = EMBER; starPath(0, 0, o.r * 0.8); c.fill();
        c.fillStyle = '#FFD27A'; starPath(0, -2, o.r * 0.45); c.fill();
        c.restore();
      }
      return;
    }
    c.save(); c.translate(o.x, o.y); c.scale(s, s);
    var r = o.r;
    if (o.kind === 'tree') {
      oval(10, 14, r * 1.05, r * 0.8, 'rgba(0,0,0,0.22)');
      disc(0, -6, r, '#2E7D46'); disc(-r * 0.3, -r * 0.4, r * 0.62, '#3E9A55'); disc(r * 0.25, -r * 0.1, r * 0.5, '#358C4D');
      disc(-r * 0.35, -r * 0.55, r * 0.22, 'rgba(255,255,255,0.15)');
    } else if (o.kind === 'crate') {
      box(-r + 6, -r + 8, r * 2, r * 2, 4, 'rgba(0,0,0,0.2)');
      box(-r, -r, r * 2, r * 2, 4, '#C18A52');
      c.strokeStyle = '#8A5A3B'; c.lineWidth = 4; c.strokeRect(-r + 4, -r + 4, r * 2 - 8, r * 2 - 8);
      c.beginPath(); c.moveTo(-r + 4, -r + 4); c.lineTo(r - 4, r - 4); c.moveTo(r - 4, -r + 4); c.lineTo(-r + 4, r - 4); c.stroke();
    } else if (o.kind === 'cone') {
      oval(4, 5, r, r * 0.8, 'rgba(0,0,0,0.2)');
      box(-r, -r, r * 2, r * 2, 4, '#E06A1E');
      disc(0, 0, r * 0.8, '#F07A2A'); disc(0, 0, r * 0.5, PAPER); disc(0, 0, r * 0.3, '#F07A2A');
    } else if (o.kind === 'pin') {
      oval(3, 4, r, r * 0.8, 'rgba(0,0,0,0.2)');
      disc(0, 0, r, PAPER); disc(0, 0, r * 0.62, '#E8475C'); disc(0, 0, r * 0.4, PAPER);
    } else if (o.kind === 'melon') {
      c.rotate(o.a);
      oval(4, 5, r * 1.15, r * 0.9, 'rgba(0,0,0,0.2)');
      oval(0, 0, r * 1.15, r * 0.9, '#2E8B3E');
      c.strokeStyle = '#1C5E2A'; c.lineWidth = 3;
      for (var st = -1; st <= 1; st++) { c.beginPath(); c.moveTo(-r, st * r * 0.35); c.quadraticCurveTo(0, st * r * 0.55, r, st * r * 0.35); c.stroke(); }
    } else if (o.kind === 'block') {
      box(-r + 5, -r + 6, r * 2, r * 2, 5, 'rgba(0,0,0,0.2)');
      box(-r, -r, r * 2, r * 2, 5, o.c);
      box(-r + 5, -r + 5, r * 2 - 10, r * 2 - 10, 3, 'rgba(255,255,255,0.25)');
    } else if (o.kind === 'castle') {
      oval(5, 8, r * 1.1, r * 0.9, 'rgba(0,0,0,0.18)');
      box(-r, -r * 0.8, r * 2, r * 1.6, 6, '#D9B26F');
      for (var tw = -1; tw <= 1; tw += 2) for (var tv = -1; tv <= 1; tv += 2) disc(tw * r * 0.75, tv * r * 0.6, r * 0.38, '#EBCB8B');
      disc(0, 0, r * 0.45, '#F5DFA8');
      c.fillStyle = CORAL; c.fillRect(-1, -r * 1.1, 3, r * 0.6); c.fillRect(2, -r * 1.1, 10, 7);
    } else if (o.kind === 'rock') {
      var k = o.s || 1;
      oval(6, 8, r * k, r * 0.8 * k, 'rgba(0,0,0,0.22)');
      c.fillStyle = '#8D8A86';
      c.beginPath(); c.moveTo(-r * k, 0); c.lineTo(-r * 0.6 * k, -r * 0.8 * k); c.lineTo(r * 0.4 * k, -r * 0.9 * k); c.lineTo(r * k, -r * 0.1 * k);
      c.lineTo(r * 0.6 * k, r * 0.8 * k); c.lineTo(-r * 0.5 * k, r * 0.8 * k); c.closePath(); c.fill();
      c.fillStyle = '#B5B1AC';
      c.beginPath(); c.moveTo(-r * 0.6 * k, -r * 0.8 * k); c.lineTo(r * 0.4 * k, -r * 0.9 * k); c.lineTo(r * 0.1 * k, -r * 0.2 * k); c.lineTo(-r * 0.5 * k, -r * 0.2 * k); c.fill();
    } else if (o.kind === 'buoy') {
      oval(0, 0, r * 1.5, r * 1.1, 'rgba(255,255,255,0.35)');
      disc(0, 0, r, '#F07A2A'); disc(0, 0, r * 0.6, PAPER); disc(0, 0, r * 0.3, '#F07A2A');
    } else if (o.kind === 'duck') {
      c.rotate(o.a);
      oval(0, 0, r * 1.4, r * 1.05, 'rgba(255,255,255,0.3)');
      oval(-2, 0, r * 1.1, r * 0.8, '#F2C94C'); disc(r * 0.6, 0, r * 0.5, '#F7D96A');
      c.fillStyle = EMBER; c.beginPath(); c.moveTo(r * 1.0, -4); c.lineTo(r * 1.45, 0); c.lineTo(r * 1.0, 4); c.fill();
      disc(r * 0.7, -4, 2, '#22221F'); disc(r * 0.7, 4, 2, '#22221F');
    } else if (o.kind === 'barrel') {
      oval(0, 0, r * 1.35, r * 1.2, 'rgba(255,255,255,0.3)');
      disc(0, 0, r, '#C0392B'); c.strokeStyle = '#5B5E66'; c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, r * 0.7, 0, TAU); c.stroke(); disc(0, 0, r * 0.18, '#8A2A20');
    } else if (o.kind === 'island') {
      // The sand is drawn with the water (drawLake); here a palm tree or two.
      palm(-r * 0.15, -r * 0.1, 1); if (r > 130) palm(r * 0.3, r * 0.2, 0.8);
    } else if (o.kind === 'junk') {
      c.rotate(o.a);
      box(-r * 0.95 + 6, -r * 0.55 + 7, r * 1.9, r * 1.1, 10, 'rgba(0,0,0,0.22)');
      wheel(-r * 0.55, -r * 0.55, 18, 9); wheel(r * 0.55, -r * 0.55, 18, 9); wheel(-r * 0.55, r * 0.55, 18, 9);
      box(-r * 0.95, -r * 0.55, r * 1.9, r * 1.1, 10, o.c);
      box(-r * 0.3, -r * 0.42, r * 0.8, r * 0.84, 6, 'rgba(30,30,36,0.55)');
      c.fillStyle = '#8A5A3B'; disc(r * 0.6, r * 0.25, 6, '#8A5A3B'); disc(-r * 0.7, -r * 0.2, 5, '#A0614A');
    }
    c.restore();
  }

  /** The lake from above: a beach all round, water, the surf break's lighter water, islands, ripples. */
  function drawLake(g, x0, y0, x1, y1) {
    var w = g.world, t = g.t, i, j, e = w.edge - 40;
    c.fillStyle = '#EBCB8B'; c.fillRect(-400, -400, WW + 800, WH + 800);
    c.fillStyle = '#5DAA4F'; c.fillRect(-400, -400, WW + 800, 330); c.fillRect(-400, WH - 330 + 400, WW + 800, 330);
    c.fillStyle = '#D9B26F'; rr(e - 14, e - 14, WW - 2 * e + 28, WH - 2 * e + 28, 70); c.fill();
    var grad = c.createLinearGradient(0, 0, 0, WH);
    grad.addColorStop(0, '#3E9BD6'); grad.addColorStop(1, '#2D84C4');
    c.fillStyle = grad; rr(e, e, WW - 2 * e, WH - 2 * e, 60); c.fill();
    var sf = w.surf;
    c.fillStyle = 'rgba(124,196,242,0.35)'; c.fillRect(sf.x, sf.y, sf.w, sf.h);
    // Little ripples, the same every time, drifting a bit.
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 3;
    for (i = Math.floor(x0 / 150); i <= Math.floor(x1 / 150); i++) for (j = Math.floor(y0 / 150); j <= Math.floor(y1 / 150); j++) {
      var hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0, fx = i * 150 + hsh % 110 + Math.sin(t + i) * 6, fy = j * 150 + (hsh >> 8) % 110;
      if (fx < e + 20 || fy < e + 20 || fx > WW - e - 20 || fy > WH - e - 20 || hsh % 3) continue;
      c.beginPath(); c.moveTo(fx - 14, fy); c.quadraticCurveTo(fx - 7, fy - 6, fx, fy); c.quadraticCurveTo(fx + 7, fy + 6, fx + 14, fy); c.stroke();
    }
    for (i = 0; i < w.objs.length; i++) {
      var o = w.objs[i];
      if (o.kind !== 'island') continue;
      oval(o.x, o.y, o.r + 26, o.r * 0.9 + 22, 'rgba(255,255,255,0.35)');
      oval(o.x, o.y, o.r, o.r * 0.9, '#EBCB8B');
      oval(o.x - o.r * 0.1, o.y - o.r * 0.1, o.r * 0.62, o.r * 0.55, '#7DBB5E');
    }
  }

  function drawGround(g, x0, y0, x1, y1) {
    var w = g.world, t = g.t, i, j;
    if (w.water) { drawLake(g, x0, y0, x1, y1); return; }
    c.fillStyle = '#5DAA4F'; c.fillRect(0, 0, WW, WH);
    c.fillStyle = '#66B357';
    var sx = Math.max(0, Math.floor(x0 / 220)), ex = Math.min(Math.ceil(WW / 220), Math.ceil(x1 / 220));
    for (i = sx; i < ex; i++) if (i % 2) c.fillRect(i * 220, Math.max(0, y0), 220, Math.min(WH, y1) - Math.max(0, y0));
    // The dirt track round the park.
    var tr2 = w.track;
    c.lineJoin = 'round';
    c.strokeStyle = '#B5844F'; c.lineWidth = 150; rr(tr2.x, tr2.y, tr2.w, tr2.h, tr2.r); c.stroke();
    c.strokeStyle = '#C99B63'; c.lineWidth = 130; rr(tr2.x, tr2.y, tr2.w, tr2.h, tr2.r); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 4;
    if (c.setLineDash) c.setLineDash([40, 40]);
    rr(tr2.x, tr2.y, tr2.w, tr2.h, tr2.r); c.stroke();
    if (c.setLineDash) c.setLineDash([]);
    // Grass tufts and flowers, the same every time.
    for (i = Math.floor(x0 / 160); i <= Math.floor(x1 / 160); i++) for (j = Math.floor(y0 / 160); j <= Math.floor(y1 / 160); j++) {
      var hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0, fx = i * 160 + hsh % 120, fy = j * 160 + (hsh >> 8) % 120;
      if (fx < 30 || fy < 30 || fx > WW - 30 || fy > WH - 30) continue;
      if (hsh % 7 === 0) { disc(fx, fy, 5, ['#F7F6F2', '#F2C94C', '#E8475C', LILAC][hsh % 4]); disc(fx, fy, 2, EMBER); }
      else if (hsh % 3 === 0) {
        c.strokeStyle = '#4E9443'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(fx - 6, fy); c.lineTo(fx - 9, fy - 10); c.moveTo(fx, fy); c.lineTo(fx, fy - 13); c.moveTo(fx + 6, fy); c.lineTo(fx + 9, fy - 10); c.stroke();
      }
    }
    // The sandpit, in a wooden frame.
    var s = w.sand;
    box(s.x - 18, s.y - 18, s.w + 36, s.h + 36, 22, '#8A5A3B');
    box(s.x, s.y, s.w, s.h, 14, '#EBCB8B');
    c.fillStyle = 'rgba(201,155,99,0.35)';
    for (i = 0; i < 40; i++) { var hx = s.x + 30 + (i * 137) % (s.w - 60), hy = s.y + 30 + (i * 89) % (s.h - 60); c.fillRect(hx, hy, 14, 4); }
    // The pond, with ripples and lily pads.
    var p = w.pond;
    oval(p.x, p.y, p.rx + 16, p.ry + 14, '#8FC07A');
    oval(p.x, p.y, p.rx, p.ry, '#3E9BD6');
    oval(p.x - p.rx * 0.15, p.y - p.ry * 0.15, p.rx * 0.75, p.ry * 0.65, '#55AEE3');
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
    for (i = 0; i < 3; i++) {
      var ph = (t * 0.4 + i / 3) % 1;
      c.beginPath(); c.save(); c.translate(p.x + 60 - i * 70, p.y - 30 + i * 30); c.scale(1, 0.5); c.arc(0, 0, 20 + ph * 60, 0, TAU); c.restore();
      c.globalAlpha = 1 - ph; c.stroke(); c.globalAlpha = 1;
    }
    disc(p.x - 200, p.y + 60, 18, '#4E9443'); disc(p.x + 220, p.y - 50, 15, '#4E9443'); disc(p.x + 180, p.y + 90, 12, '#4E9443');
    // The fence.
    c.strokeStyle = '#8A5A3B'; c.lineWidth = 8;
    c.strokeRect(24, 24, WW - 48, WH - 48);
    c.lineWidth = 4; c.strokeRect(34, 34, WW - 68, WH - 68);
    c.fillStyle = '#6B4329';
    for (i = Math.max(0, Math.floor(x0 / 90)); i * 90 < Math.min(WW, x1); i++) { c.fillRect(i * 90 + 20, 16, 12, 26); c.fillRect(i * 90 + 20, WH - 42, 12, 26); }
    for (i = Math.max(0, Math.floor(y0 / 90)); i * 90 < Math.min(WH, y1); i++) { c.fillRect(16, i * 90 + 20, 26, 12); c.fillRect(WW - 42, i * 90 + 20, 26, 12); }
  }

  /** Where the tow boat is: a rope's length ahead of the skier, on the water. */
  function towAt(car) {
    var h = Math.atan2(car.vy, car.vx);
    if (!car.vx && !car.vy) h = car.h;
    return {x: car.x + Math.cos(h) * 190, y: car.y + Math.sin(h) * 190, h: h};
  }

  function drawCar(g) {
    var car = g.car, m = g.m;
    if (car.safe > 0 && Math.floor(car.safe * 10) % 2) return;
    var pitch = 0, yaw = 0, tk = car.trick;
    if (tk) {
      if (tk.k === 'front') pitch = tk.p * TAU; else if (tk.k === 'back') pitch = -tk.p * TAU;
      else yaw = (tk.k === 'spinL' ? -1 : 1) * tk.p * TAU;
    }
    if (car.wipe > 0) { pitch = car.roll; yaw = car.roll * 0.6; }
    var sc = 1 + car.z / 500, lift = car.z * ZT + Math.abs(Math.sin(pitch)) * m.len * 0.3;
    // Shadow on the ground, smaller the higher it goes.
    var shs = Math.max(0.35, 1 - car.z / 400);
    c.save(); c.translate(car.x + 6, car.y + 8); c.rotate(car.h + yaw);
    oval(0, 0, m.len * 0.55 * shs, m.wid * 0.55 * shs, 'rgba(0,0,0,' + (0.28 * shs) + ')');
    c.restore();
    c.save();
    c.translate(car.x, car.y - lift);
    c.rotate(car.h + yaw);
    var cp = Math.cos(pitch), sx = Math.abs(cp) < 0.12 ? (cp < 0 ? -0.12 : 0.12) : cp;
    c.scale(sx * sc, sc);
    if (m.water && !car.air && Math.abs(car.speed) > 100) wake(m.len, m.wid, car.run);
    machine(m, car.steer * 0.8, cp < 0, car.run, car.slam);
    c.restore();
    if (m.towed && car.wipe <= 0) {
      var tb = towAt(car);
      c.strokeStyle = 'rgba(247,246,242,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(car.x + Math.cos(car.h) * 10, car.y + Math.sin(car.h) * 10 - lift); c.lineTo(tb.x - Math.cos(tb.h) * 34, tb.y - Math.sin(tb.h) * 34); c.stroke();
      towBoat(tb.x, tb.y, tb.h, car.run);
    }
    if (car.wipe > 0) {
      for (var i = 0; i < 4; i++) {
        var a = g.t * 6 + i * TAU / 4;
        c.fillStyle = EMBER; starPath(car.x + Math.cos(a) * 34, car.y - 50 + Math.sin(a) * 12, 8); c.fill();
      }
    }
  }

  function drawParts(g) {
    for (var i = 0; i < g.parts.length; i++) {
      var p = g.parts[i], a = Math.min(1, p.life / p.max * 1.6), y = p.y - p.z * ZT;
      c.globalAlpha = a;
      if (p.k === 1) disc(p.x, y, p.s * 0.5, p.c);
      else if (p.k === 2) { c.fillStyle = p.c; starPath(p.x, y, p.s); c.fill(); }
      // 4: a plank off a crate, 0: a chunk.
      else if (p.k === 3) {
        c.strokeStyle = p.c; c.lineWidth = 6 * a;
        c.beginPath(); c.arc(p.x, y, p.s * (1.4 - p.life / p.max), 0, TAU); c.stroke();
      } else {
        c.save(); c.translate(p.x, y); c.rotate(p.rot);
        c.fillStyle = p.c;
        if (p.z > 0) { c.fillRect(-p.s / 2, -p.s / 2, p.s, p.k === 0 ? p.s : p.s * 0.4); }
        else c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        c.restore();
      }
    }
    c.globalAlpha = 1;
  }

  // MARK: - The chase and first person cameras: the same world in 3D, drawn by hand on the canvas

  var F3 = 760, NEAR = 4;
  var V = {x: 0, y: 0, z: 0, cy: 1, sy: 0, cp: 1, sp: 0, yaw: 0};
  var P = {f: 0, r: 0, u: 0}, Q = {x: 0, y: 0, s: 0, f: 0};
  var CF = [], CR = [], CU = [], OF = [], OR = [], OU = [], ITEMS = [];

  /** A point in the world to the camera's own space (forward, right, up), into P. */
  function toCam(px, py, pz) {
    var dx = px - V.x, dy = py - V.y, dz = pz - V.z, f = dx * V.cy + dy * V.sy;
    P.r = -dx * V.sy + dy * V.cy;
    P.f = f * V.cp - dz * V.sp;
    P.u = f * V.sp + dz * V.cp;
    return P;
  }
  /** A point in the world to the screen, into Q (s: pixels per world unit there). False if it is behind the camera. */
  function proj(px, py, pz) {
    toCam(px, py, pz);
    if (P.f < NEAR) return false;
    Q.f = P.f; Q.s = F3 / P.f; Q.x = W / 2 + P.r * Q.s; Q.y = H / 2 - P.u * Q.s;
    return true;
  }
  /** A flat shape in the world (x, y, z, x, y, z...), cut where it passes behind the camera, then filled. */
  function poly3(pts, fill) {
    var n = pts.length / 3, i, m = 0;
    for (i = 0; i < n; i++) { toCam(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]); CF[i] = P.f; CR[i] = P.r; CU[i] = P.u; }
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n, ain = CF[i] >= NEAR, bin = CF[j] >= NEAR;
      if (ain) { OF[m] = CF[i]; OR[m] = CR[i]; OU[m] = CU[i]; m++; }
      if (ain !== bin) {
        var t = (NEAR - CF[i]) / (CF[j] - CF[i]);
        OF[m] = NEAR; OR[m] = CR[i] + (CR[j] - CR[i]) * t; OU[m] = CU[i] + (CU[j] - CU[i]) * t; m++;
      }
    }
    if (m < 3) return;
    c.beginPath();
    for (i = 0; i < m; i++) {
      var sx = W / 2 + OR[i] * F3 / OF[i], sy = H / 2 - OU[i] * F3 / OF[i];
      if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy);
    }
    c.closePath();
    c.fillStyle = fill; c.fill();
  }
  function rect3(x0, y0, x1, y1, z, fill) { poly3([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], fill); }
  function ellipse3(x, y, rx, ry, z, fill) {
    var pts = [];
    for (var i = 0; i < 20; i++) { var a = i * TAU / 20; pts.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry, z); }
    poly3(pts, fill);
  }
  function turned3(x, y, a, len, wid, z, fill) {
    var ca = Math.cos(a), sa = Math.sin(a), lx = ca * len / 2, ly = sa * len / 2, wx = -sa * wid / 2, wy = ca * wid / 2;
    poly3([x - lx - wx, y - ly - wy, z, x + lx - wx, y + ly - wy, z, x + lx + wx, y + ly + wy, z, x - lx + wx, y - ly + wy, z], fill);
  }

  // Colours in light and shade, worked out once each.
  var SHADES = {};
  function shade(hex, k) {
    k = Math.round(k * 20) / 20;
    var key = hex + k;
    if (!SHADES[key]) {
      var n = parseInt(hex.slice(1), 16);
      SHADES[key] = 'rgb(' + Math.min(255, Math.round((n >> 16 & 255) * k)) + ',' + Math.min(255, Math.round((n >> 8 & 255) * k)) + ',' + Math.min(255, Math.round((n & 255) * k)) + ')';
    }
    return SHADES[key];
  }

  /** Where the camera is and where it looks. Returns the roll (a wipeout tumbles the first person view). */
  var EYE = {race: 26, truck: 50, digger: 56, buggy: 32, dozer: 52, jetski: 50, boat: 42, surf: 50, ski: 46};
  function setView(g) {
    var car = g.car, m = g.m, yaw, pitch, roll = 0, tk = car.trick, flip = 0, spin = 0;
    if (tk) {
      if (tk.k === 'front') flip = tk.p * TAU; else if (tk.k === 'back') flip = -tk.p * TAU;
      else spin = (tk.k === 'spinL' ? -1 : 1) * tk.p * TAU;
    }
    if (g.view === 2) {
      yaw = car.h + spin;
      pitch = 0.1 + flip;
      // Up a ramp the nose points up, so you look up it.
      if (car.ramp) pitch -= Math.atan2(car.ramp.h, car.ramp.len) * Math.cos(car.h - car.ramp.a);
      if (car.wipe > 0) { roll = car.roll; pitch += Math.sin(car.roll) * 0.5; }
      V.x = car.x + Math.cos(car.h) * m.len * 0.12; V.y = car.y + Math.sin(car.h) * m.len * 0.12;
      V.z = car.z + (EYE[m.id] || 30) + (g.water ? Math.sin(car.run / 40) * 2 : 0);
    } else {
      yaw = g.cam.yaw; pitch = 0.24;
      var back = 250 + Math.abs(car.speed) * 0.08;
      V.x = car.x - Math.cos(yaw) * back; V.y = car.y - Math.sin(yaw) * back; V.z = car.z * 0.85 + 120;
    }
    V.yaw = yaw; V.cy = Math.cos(yaw); V.sy = Math.sin(yaw); V.cp = Math.cos(pitch); V.sp = Math.sin(pitch);
    return roll;
  }

  /** The sky, hills on the horizon all the way round, and clouds that stay put as you turn. */
  function sky3(g) {
    var grad = c.createLinearGradient(0, -200, 0, H);
    grad.addColorStop(0, '#4FA8EA'); grad.addColorStop(1, '#D4EEFF');
    c.fillStyle = grad; c.fillRect(-400, -400, W + 800, H + 800);
    if (!proj(V.x + V.cy * 1e5, V.y + V.sy * 1e5, 0)) return;
    var hy = Q.y, x, a, i;
    for (i = 0; i < 6; i++) {
      var d = i * TAU / 6 + 0.4 - V.yaw;
      d = d - Math.round(d / TAU) * TAU;
      if (Math.abs(d) > 1.1) continue;
      var cx = W / 2 + Math.tan(d) * F3, cy = hy - 150 - (i % 3) * 40, k = 1 + (i % 2) * 0.4;
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.arc(cx, cy, 30 * k, 0, TAU); c.arc(cx + 34 * k, cy - 12 * k, 36 * k, 0, TAU); c.arc(cx + 70 * k, cy, 26 * k, 0, TAU); c.fill();
    }
    c.fillStyle = g.water ? '#5E9E62' : '#4A8C40';
    c.beginPath(); c.moveTo(-400, hy + 40);
    for (x = -400; x <= W + 400; x += 40) {
      a = V.yaw + Math.atan((x - W / 2) / F3);
      c.lineTo(x, hy - 22 - Math.sin(a * 3) * 16 - Math.sin(a * 7 + 1) * 9 - Math.sin(a * 13) * 4);
    }
    c.lineTo(W + 400, hy + 40); c.closePath(); c.fill();
  }

  /** The track round the park as a ring of flat pieces. */
  function ring3(t, off, fill) {
    var pts = t.pts || (t.pts = (function () {
      var out = [], cs = [[t.x + t.w - t.r, t.y + t.r, -Math.PI / 2], [t.x + t.w - t.r, t.y + t.h - t.r, 0], [t.x + t.r, t.y + t.h - t.r, Math.PI / 2], [t.x + t.r, t.y + t.r, Math.PI]];
      for (var k = 0; k < 4; k++) for (var s = 0; s <= 6; s++) { var a = cs[k][2] + s / 6 * Math.PI / 2; out.push([cs[k][0] + Math.cos(a) * t.r, cs[k][1] + Math.sin(a) * t.r, Math.cos(a), Math.sin(a)]); }
      return out;
    })());
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      poly3([p[0] + p[2] * off, p[1] + p[3] * off, 0, q[0] + q[2] * off, q[1] + q[3] * off, 0, q[0] - q[2] * off, q[1] - q[3] * off, 0, p[0] - p[2] * off, p[1] - p[3] * off, 0], fill);
    }
  }

  function ground3(g) {
    var w = g.world, i, big = 6000, o;
    if (w.water) {
      rect3(-big, -big, WW + big, WH + big, 0, '#5DAA4F');
      rect3(-300, -300, WW + 300, WH + 300, 0, '#EBCB8B');
      var e = w.edge - 40;
      rect3(e - 16, e - 16, WW - e + 16, WH - e + 16, 0, '#D9B26F');
      rect3(e, e, WW - e, WH - e, 0, '#3E9BD6');
      for (i = 0; e + i * 200 < WH - e; i += 2) rect3(e, e + i * 200, WW - e, Math.min(WH - e, e + i * 200 + 100), 0, '#3A94CF');
      var sf = w.surf;
      rect3(sf.x, sf.y, sf.x + sf.w, sf.y + sf.h, 0, 'rgba(124,196,242,0.35)');
      for (i = 0; i < w.objs.length; i++) {
        o = w.objs[i];
        if (o.kind !== 'island') continue;
        ellipse3(o.x, o.y, o.r + 24, o.r + 24, 0, 'rgba(255,255,255,0.4)');
        ellipse3(o.x, o.y, o.r, o.r, 0, '#EBCB8B');
        ellipse3(o.x, o.y, o.r * 0.6, o.r * 0.6, 0, '#7DBB5E');
      }
      return;
    }
    rect3(-big, -big, WW + big, WH + big, 0, '#5DAA4F');
    for (i = 1; i * 220 < WW; i += 2) rect3(i * 220, 0, i * 220 + 220, WH, 0, '#66B357');
    ring3(w.track, 75, '#B5844F');
    ring3(w.track, 65, '#C99B63');
    var s = w.sand;
    rect3(s.x - 18, s.y - 18, s.x + s.w + 18, s.y + s.h + 18, 0, '#8A5A3B');
    rect3(s.x, s.y, s.x + s.w, s.y + s.h, 0, '#EBCB8B');
    var p = w.pond;
    ellipse3(p.x, p.y, p.rx + 16, p.ry + 14, 0, '#8FC07A');
    ellipse3(p.x, p.y, p.rx, p.ry, 0, '#3E9BD6');
    ellipse3(p.x - p.rx * 0.15, p.y - p.ry * 0.15, p.rx * 0.75, p.ry * 0.65, 0, '#55AEE3');
    for (i = 0; i < w.pads.length; i++) {
      var pd = w.pads[i];
      turned3(pd.x, pd.y, pd.a, pd.len, pd.wid, 0, '#2C2458');
      turned3(pd.x, pd.y, pd.a, pd.len * 0.7, pd.wid * 0.4, 0, 'rgba(158,123,255,' + (0.5 + Math.sin(g.t * 8) * 0.3) + ')');
    }
    // The fence, as a low wooden wall round the park.
    var fz = 34, f0 = 24, f1x = WW - 24, f1y = WH - 24;
    poly3([f0, f0, 0, f1x, f0, 0, f1x, f0, fz, f0, f0, fz], '#8A5A3B');
    poly3([f0, f1y, 0, f1x, f1y, 0, f1x, f1y, fz, f0, f1y, fz], '#8A5A3B');
    poly3([f0, f0, 0, f0, f1y, 0, f0, f1y, fz, f0, f0, fz], '#7A4E2E');
    poly3([f1x, f0, 0, f1x, f1y, 0, f1x, f1y, fz, f1x, f0, fz], '#7A4E2E');
  }

  /** A ramp (or a wave) as a solid wedge: only the faces turned towards the camera, which never overlap. */
  function wedge3(r) {
    var pal = r.wave ? ['#E9F6FF', '#5AAAE0', '#3E9BD6', '#7CC4F2'] : r.float ? SKI : WOOD;
    var px = -r.sa * r.wid / 2, py = r.ca * r.wid / 2, tx = r.x + r.ca * r.len, ty = r.y + r.sa * r.len, h = r.h;
    var b1x = r.x + px, b1y = r.y + py, b2x = r.x - px, b2y = r.y - py, t1x = tx + px, t1y = ty + py, t2x = tx - px, t2y = ty - py;
    // Back face (towards the top end).
    if ((V.x - tx) * r.ca + (V.y - ty) * r.sa > 0) poly3([t1x, t1y, 0, t2x, t2y, 0, t2x, t2y, h, t1x, t1y, h], pal[0]);
    // The sides.
    if ((V.x - r.x) * px + (V.y - r.y) * py > 0) poly3([b1x, b1y, 0, t1x, t1y, 0, t1x, t1y, h], pal[1]);
    else poly3([b2x, b2y, 0, t2x, t2y, 0, t2x, t2y, h], pal[1]);
    // The slope: seen from above it, i.e. from in front or high enough.
    if (-(V.x - r.x) * r.ca * h - (V.y - r.y) * r.sa * h + V.z * r.len > 0) {
      poly3([b1x, b1y, 0, b2x, b2y, 0, t2x, t2y, h, t1x, t1y, h], r.wave ? pal[3] : pal[3]);
      // A coloured lip along the top, and foam on a wave.
      var k = 0.86;
      poly3([b1x + (t1x - b1x) * k, b1y + (t1y - b1y) * k, h * k, b2x + (t2x - b2x) * k, b2y + (t2y - b2y) * k, h * k, t2x, t2y, h, t1x, t1y, h],
        r.wave ? PAPER : r.float ? CORAL : r.size === 'mega' ? CORAL : EMBER);
    }
  }

  /** The machines in 3D: boxes [front, back... as x0, x1, y0, y1, z0, z1, colour], x forward, y right, z up. */
  var MODELS = {};
  function wheels4(x, y0, y1, h, len) {
    var d = '#1E1D24';
    return [[x - len, x + len, y0, y1, 0, h, d], [x - len, x + len, -y1, -y0, 0, h, d], [-x - len, -x + len, y0, y1, 0, h, d], [-x - len, -x + len, -y1, -y0, 0, h, d]];
  }
  function person(x, colour, z0) {
    return [[x - 4, x + 4, -7, 7, z0, z0 + 18, '#2B3A55'], [x - 5, x + 5, -8, 8, z0 + 18, z0 + 36, colour], [x - 4, x + 3, -4, 4, z0 + 36, z0 + 44, '#E8B58A']];
  }
  function model(id) {
    if (MODELS[id]) return MODELS[id];
    var m = null, d = '#1E1D24', b;
    for (var i = 0; i < MACHINES.length; i++) if (MACHINES[i].id === id) m = MACHINES[i];
    var col = m ? m.colour : BLUE;
    if (id === 'race') b = wheels4(19, 12, 21, 14, 7).concat([[-32, 32, -13, 13, 4, 13, col], [-32, 32, -3, 3, 13, 14, PAPER], [-10, 6, -8, 8, 13, 21, '#22221F'], [-36, -28, -18, 18, 18, 22, '#22221F'], [-32, -30, -2, 2, 13, 18, '#22221F']]);
    else if (id === 'truck') b = wheels4(24, 16, 30, 26, 13).concat([[-31, 31, -16, 16, 20, 34, col], [-8, 16, -13, 13, 34, 48, LILAC], [14, 16, -11, 11, 36, 46, '#3B2A86']]);
    else if (id === 'digger' || id === 'dozer') {
      b = [[-30, 28, -26, -14, 0, 14, d], [-30, 28, 14, 26, 0, 14, d], [-26, 16, -17, 17, 14, 34, col]];
      if (id === 'digger') b = b.concat([[-12, 8, -14, 4, 34, 54, '#2B3A55'], [10, 46, 2, 10, 28, 36, '#C98A1E'], [42, 54, -8, 20, 4, 30, '#5B5E66']]);
      else b = b.concat([[-16, 4, -12, 12, 34, 52, '#7FC7B6'], [-16, 4, -12, 12, 52, 54, '#1E3D36'], [28, 34, -30, 30, 0, 26, '#C9C5BE'], [16, 28, -16, -12, 8, 14, '#5B5E66'], [16, 28, 12, 16, 8, 14, '#5B5E66']]);
    } else if (id === 'buggy') b = wheels4(18, 14, 23, 16, 8).concat([[-24, 24, -11, 11, 10, 16, col], [-12, 4, -8, 8, 16, 22, '#22221F'], [-16, -12, -11, 11, 16, 34, col], [-16, 4, -11, -8, 32, 34, col], [-16, 4, 8, 11, 32, 34, col]]);
    else if (id === 'jetski') b = [[-28, 26, -12, 12, 0, 12, col], [-22, 4, -7, 7, 12, 17, '#22221F'], [8, 12, -15, 15, 20, 23, PAPER]].concat(person(-8, CORAL, 12));
    else if (id === 'boat' || id === 'tow') {
      var hc = id === 'tow' ? BLUE : col;
      b = [[-42, 40, -18, 18, 0, 14, PAPER], [-42, 40, -19, 19, 5, 9, hc], [6, 9, -15, 15, 14, 26, LILAC], [-50, -42, -5, 5, 4, 22, '#22221F']].concat(person(-10, id === 'tow' ? CORAL : BLUE, 14));
    } else if (id === 'surf') b = [[-25, 25, -10, 10, 0, 4, col], [-3, 3, -20, 20, 32, 36, '#E8B58A']].concat(person(0, '#5CC4AE', 4));
    else b = [[-20, 22, -11, -6, 0, 3, col], [-20, 22, 6, 11, 0, 3, col], [8, 20, -2, 2, 30, 33, '#E8B58A'], [18, 21, -8, 8, 29, 34, '#22221F']].concat(person(-2, EMBER, 3));
    return (MODELS[id] = b);
  }

  var FACES = [[0, 0, 1, 4, 5, 7, 6, 1.12], [0, 0, -1, 0, 2, 3, 1, 0.5], [1, 0, 0, 1, 3, 7, 5, 0.92], [-1, 0, 0, 0, 4, 6, 2, 0.78], [0, 1, 0, 2, 6, 7, 3, 0.7], [0, -1, 0, 0, 1, 5, 4, 0.86]];
  var CX = [], CY = [], CZ = [];
  /** Draws a model at x, y, z turned by yaw, flipped by pitch (nose down first), rolled; it turns round its middle. */
  function model3(b, x, y, z, yaw, pitch, roll) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll), mid = 16;
    function rot(lx, ly, lz, out, k) {
      var x1 = lx * cp + lz * sp, z1 = lz * cp - lx * sp, y2 = ly * cr - z1 * sr, z2 = ly * sr + z1 * cr;
      out[0] = x1 * cy - y2 * sy; out[1] = x1 * sy + y2 * cy; out[2] = z2;
      if (k) { out[0] += x; out[1] += y; out[2] += z + mid; }
    }
    var faces = [], v = [0, 0, 0], i, f, k;
    for (i = 0; i < b.length; i++) {
      var bx = b[i];
      for (k = 0; k < 8; k++) { rot(k & 1 ? bx[1] : bx[0], k & 2 ? bx[3] : bx[2], (k & 4 ? bx[5] : bx[4]) - mid, v, true); CX[k] = v[0]; CY[k] = v[1]; CZ[k] = v[2]; }
      for (f = 0; f < 6; f++) {
        var F = FACES[f];
        rot(F[0], F[1], F[2], v, false);
        var a = F[3], ccx = (CX[a] + CX[F[5]]) / 2, ccy = (CY[a] + CY[F[5]]) / 2, ccz = (CZ[a] + CZ[F[5]]) / 2;
        if (v[0] * (V.x - ccx) + v[1] * (V.y - ccy) + v[2] * (V.z - ccz) <= 0) continue;
        var light = 0.55 + 0.45 * Math.max(0, v[2] * 0.8 - v[0] * 0.3 - v[1] * 0.3);
        faces.push({d: toCam(ccx, ccy, ccz).f, pts: [CX[a], CY[a], CZ[a], CX[F[4]], CY[F[4]], CZ[F[4]], CX[F[5]], CY[F[5]], CZ[F[5]], CX[F[6]], CY[F[6]], CZ[F[6]]],
          fill: shade(bx[6], light * F[7] / 0.9)});
      }
    }
    faces.sort(function (p, q) { return q.d - p.d; });
    for (i = 0; i < faces.length; i++) poly3(faces[i].pts, faces[i].fill);
  }

  /** The things in the park, as flat pictures standing up and facing the camera. y is up the picture, in world units. */
  function side(o, t) {
    var r = o.r, k;
    if (o.kind === 'tree') {
      oval(0, 0, 40, 10, 'rgba(0,0,0,0.2)');
      box(-8, -64, 16, 64, 4, '#8A5A3B');
      disc(0, -92, 44, '#2E7D46'); disc(-24, -74, 30, '#3E9A55'); disc(24, -78, 28, '#358C4D'); disc(-4, -122, 28, '#3E9A55');
    } else if (o.kind === 'crate') {
      box(-26, -52, 52, 52, 4, '#C18A52');
      c.strokeStyle = '#8A5A3B'; c.lineWidth = 4; c.strokeRect(-22, -48, 44, 44);
      c.beginPath(); c.moveTo(-22, -48); c.lineTo(22, -4); c.moveTo(22, -48); c.lineTo(-22, -4); c.stroke();
    } else if (o.kind === 'cone') {
      box(-16, -4, 32, 4, 2, '#C2561A');
      c.fillStyle = '#F07A2A'; c.beginPath(); c.moveTo(-13, -4); c.lineTo(0, -32); c.lineTo(13, -4); c.fill();
      c.fillStyle = PAPER; c.fillRect(-8, -18, 16, 5);
    } else if (o.kind === 'pin') {
      oval(0, -14, 10, 14, PAPER); disc(0, -30, 6, PAPER); c.fillStyle = '#E8475C'; c.fillRect(-6, -26, 12, 4);
    } else if (o.kind === 'melon') {
      oval(0, -13, 20, 13, '#2E8B3E'); c.strokeStyle = '#1C5E2A'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-12, -22); c.quadraticCurveTo(-2, -13, -12, -3); c.moveTo(4, -25); c.quadraticCurveTo(12, -13, 4, -1); c.stroke();
    } else if (o.kind === 'block') {
      box(-20, -40, 40, 40, 5, o.c); box(-15, -35, 30, 30, 3, 'rgba(255,255,255,0.25)');
    } else if (o.kind === 'castle') {
      box(-32, -38, 64, 38, 4, '#D9B26F');
      box(-36, -56, 20, 56, 3, '#EBCB8B'); box(16, -56, 20, 56, 3, '#EBCB8B'); box(-10, -24, 20, 24, 8, '#B58F55');
      c.fillStyle = CORAL; c.fillRect(25, -78, 3, 22); c.fillRect(28, -78, 12, 8);
    } else if (o.kind === 'rock') {
      k = o.s || 1;
      c.fillStyle = '#8D8A86';
      c.beginPath(); c.moveTo(-36 * k, 0); c.lineTo(-28 * k, -38 * k); c.lineTo(4 * k, -56 * k); c.lineTo(32 * k, -30 * k); c.lineTo(38 * k, 0); c.closePath(); c.fill();
      c.fillStyle = '#B5B1AC'; c.beginPath(); c.moveTo(-28 * k, -38 * k); c.lineTo(4 * k, -56 * k); c.lineTo(8 * k, -30 * k); c.lineTo(-20 * k, -24 * k); c.fill();
    } else if (o.kind === 'junk') {
      box(-46, -36, 92, 26, 8, o.c); box(-26, -54, 50, 20, 7, o.c); box(-20, -50, 38, 13, 4, 'rgba(30,30,36,0.55)');
      disc(-28, -10, 11, '#1E1D24'); disc(28, -10, 11, '#1E1D24'); disc(-28, -10, 4, '#5B5E66'); disc(28, -10, 4, '#5B5E66');
    } else if (o.kind === 'balloon') {
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, r); c.quadraticCurveTo(8, r + 20, 0, r + 44); c.stroke();
      oval(0, 0, r * 0.85, r, o.c); oval(-r * 0.3, -r * 0.35, r * 0.22, r * 0.3, 'rgba(255,255,255,0.5)');
    } else if (o.kind === 'star') {
      c.scale(Math.cos(t * 3 + o.a), 1);
      disc(0, 0, r * 0.9, 'rgba(232,163,61,0.25)');
      c.fillStyle = EMBER; starPath(0, 0, r * 0.8); c.fill();
      c.fillStyle = '#FFD27A'; starPath(0, -2, r * 0.45); c.fill();
    } else if (o.kind === 'hoop') {
      c.fillStyle = 'rgba(247,246,242,0.85)'; c.fillRect(-2, r, 4, Math.max(0, o.z - r));
      disc(0, 0, r, 'rgba(158,123,255,0.18)');
      c.strokeStyle = EMBER; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
      c.strokeStyle = '#FFD27A'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r - 2, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    } else if (o.kind === 'buoy') {
      c.translate(0, Math.sin(t * 2 + o.a) * 3);
      box(-12, -36, 24, 38, 10, '#F07A2A'); c.fillStyle = PAPER; c.fillRect(-12, -24, 24, 8);
    } else if (o.kind === 'duck') {
      c.translate(0, Math.sin(t * 2 + o.a) * 2);
      oval(0, -8, 19, 11, '#F2C94C'); disc(10, -24, 9, '#F7D96A');
      c.fillStyle = EMBER; c.beginPath(); c.moveTo(17, -26); c.lineTo(26, -22); c.lineTo(17, -19); c.fill();
      disc(12, -27, 2, '#22221F');
    } else if (o.kind === 'barrel') {
      c.translate(0, Math.sin(t * 2 + o.a) * 2);
      box(-20, -40, 40, 42, 8, '#C0392B'); c.fillStyle = '#5B5E66'; c.fillRect(-20, -32, 40, 4); c.fillRect(-20, -12, 40, 4);
    } else if (o.kind === 'island') {
      // A palm tree in the middle of the island.
      c.strokeStyle = '#8A5A3B'; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(-6, -80, 18, -150); c.stroke();
      c.fillStyle = '#2E8B3E';
      for (var i = 0; i < 6; i++) {
        var a = -Math.PI / 2 + (i - 2.5) * 0.55, ex = 18 + Math.cos(a) * 80, ey = -150 + Math.sin(a) * 40 + 30;
        c.beginPath(); c.moveTo(18, -150); c.quadraticCurveTo(18 + Math.cos(a) * 50, -170 + Math.sin(a) * 30, ex, ey);
        c.quadraticCurveTo(18 + Math.cos(a) * 36, -148, 18, -146); c.fill();
      }
    }
  }

  function sprite3(o, t) {
    var sc = o.pop > 0 ? 1 - o.pop * 1.6 : 1;
    if (sc <= 0.05) return;
    var z = o.float ? o.z + Math.sin(t * 2 + o.a) * 8 : 0;
    if (!proj(o.x, o.y, z)) return;
    var bx = Q.x, by = Q.y, s = Q.s * sc, ang = 0;
    // Stand it up the way the world's up is on screen (it isn't, upside down in a flip).
    if (proj(o.x, o.y, z + 60)) ang = Math.atan2(Q.x - bx, by - Q.y);
    c.save(); c.translate(bx, by); if (ang) c.rotate(ang); c.scale(s, s);
    side(o, t);
    c.restore();
  }

  function byDepth(a, b) { return b.d - a.d; }

  function render3d(g) {
    var roll = setView(g), cam = g.cam, w = g.world, car = g.car, m = g.m, i, n = 0, o;
    var shx = cam.shake ? (Math.random() - 0.5) * cam.shake : 0, shy = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.save();
    c.translate(W / 2 + shx, H / 2 + shy); if (roll) c.rotate(-roll); c.translate(-W / 2, -H / 2);
    sky3(g);
    ground3(g);
    // Skid marks and the machine's shadow lie on the ground.
    c.lineCap = 'round';
    for (i = 0; i < g.skids.length; i++) {
      var sk = g.skids[i];
      if (sk.life <= 0 || !proj(sk.x1, sk.y1, 0)) continue;
      var ax = Q.x, ay = Q.y, as = Q.s;
      if (!proj(sk.x2, sk.y2, 0)) continue;
      c.strokeStyle = 'rgba(40,30,20,' + Math.min(0.35, sk.life * 0.1) + ')'; c.lineWidth = 7 * (as + Q.s) / 2;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(Q.x, Q.y); c.stroke();
    }
    var gz = groundAt(w, car.x, car.y), shs = Math.max(0.35, 1 - (car.z - gz) / 400);
    if (g.view === 1) turned3(car.x, car.y, car.h, m.len * shs, m.wid * shs, gz + 1, 'rgba(0,0,0,' + (0.28 * shs) + ')');
    // Everything standing up, furthest first.
    function add(kind, ref, x, y, z, near) {
      toCam(x, y, z);
      if (P.f < near || P.f > 3600 || Math.abs(P.r) > P.f * 1.3 + 400) return;
      var it = ITEMS[n] || (ITEMS[n] = {});
      it.d = P.f; it.k = kind; it.o = ref; n++;
    }
    for (i = 0; i < w.objs.length; i++) { o = w.objs[i]; if (o.alive || o.pop > 0) add(0, o, o.x, o.y, o.float ? o.z : 0, 30); }
    // A ramp sorts by its far end, so whatever is on it or just in front draws over it.
    for (i = 0; i < w.ramps.length; i++) {
      o = w.ramps[i];
      var fa = toCam(o.x, o.y, 0).f, fb = toCam(o.x + o.ca * o.len, o.y + o.sa * o.len, 0).f;
      if (fa > fb) add(1, o, o.x, o.y, 0, -o.len - o.wid / 2); else add(1, o, o.x + o.ca * o.len, o.y + o.sa * o.len, 0, -o.len - o.wid / 2);
    }
    if (g.view === 1) add(2, car, car.x, car.y, car.z, 10);
    var tb = m.towed && car.wipe <= 0 ? towAt(car) : null;
    if (tb) add(3, tb, tb.x, tb.y, 0, 20);
    var list = ITEMS.slice(0, n).sort(byDepth);
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.k === 0) sprite3(it.o, g.t);
      else if (it.k === 1) wedge3(it.o);
      else if (it.k === 2) car3(g);
      else model3(model('tow'), it.o.x, it.o.y, 0, it.o.h, 0, 0);
    }
    if (tb && proj(car.x + Math.cos(car.h) * 14, car.y + Math.sin(car.h) * 14, car.z + 32)) {
      var rx = Q.x, ry = Q.y;
      if (proj(tb.x - Math.cos(tb.h) * 46, tb.y - Math.sin(tb.h) * 46, 20)) {
        c.strokeStyle = 'rgba(247,246,242,0.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(rx, ry); c.lineTo(Q.x, Q.y); c.stroke();
      }
    }
    // Spray, dust, bits and the words that pop up.
    for (i = 0; i < g.parts.length; i++) {
      var p = g.parts[i];
      if (!proj(p.x, p.y, p.z) || Q.f < 90) continue;
      var sz = Math.min(90, p.s * Q.s * (p.k === 1 ? 1 : 0.6));
      c.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      if (p.k === 1) disc(Q.x, Q.y, sz * 0.5, p.c);
      else if (p.k === 2) { c.fillStyle = p.c; starPath(Q.x, Q.y, sz); c.fill(); }
      else if (p.k === 3) { c.strokeStyle = p.c; c.lineWidth = 6; c.beginPath(); c.arc(Q.x, Q.y, sz * (1.4 - p.life / p.max), 0, TAU); c.stroke(); }
      else { c.save(); c.translate(Q.x, Q.y); c.rotate(p.rot); c.fillStyle = p.c; c.fillRect(-sz / 2, -sz / 2, sz, p.k === 0 ? sz : sz * 0.4); c.restore(); }
    }
    c.globalAlpha = 1;
    for (i = 0; i < g.pops.length; i++) {
      var pp = g.pops[i], k = pp.t / 1.6;
      if (!proj(pp.x, pp.y, pp.z + 40)) continue;
      c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      text(pp.s, Q.x, Math.max(130, Q.y - k * 90), (pp.big ? 40 : 28) * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1), pp.c, 'center', '800', 'rgba(13,12,24,0.75)');
      c.globalAlpha = 1;
    }
    c.restore();
    if (g.view === 2) bonnet(g);
  }

  /** The machine in the chase view, tipping through its flips and spins like the picture from above. */
  function car3(g) {
    var car = g.car, m = g.m, tk = car.trick, pitch = 0, yaw = car.h, roll = 0;
    if (car.safe > 0 && Math.floor(car.safe * 10) % 2) return;
    if (tk) {
      if (tk.k === 'front') pitch = tk.p * TAU; else if (tk.k === 'back') pitch = -tk.p * TAU;
      else yaw += (tk.k === 'spinL' ? -1 : 1) * tk.p * TAU;
    }
    if (car.ramp) pitch -= Math.atan2(car.ramp.h, car.ramp.len) * Math.cos(car.h - car.ramp.a);
    if (car.wipe > 0) { roll = car.roll; yaw += car.roll * 0.3; }
    var b = model(m.id);
    if (m.id === 'digger' && car.slam > 0) {
      // The arm swings down for a slam.
      var dip = Math.sin(car.slam / 0.4 * Math.PI) * 20;
      b = b.slice(0, b.length - 2).concat([[10, 46, 2, 10, 28 - dip, 36 - dip, '#C98A1E'], [42, 54, -8, 20, Math.max(0, 4 - dip), 30 - dip, '#5B5E66']]);
    }
    model3(b, car.x, car.y, car.z, yaw, pitch, roll);
    if (car.wipe > 0 && proj(car.x, car.y, car.z + 70)) {
      for (var i = 0; i < 4; i++) {
        var a = g.t * 6 + i * TAU / 4;
        c.fillStyle = EMBER; starPath(Q.x + Math.cos(a) * 34 * Q.s * 3, Q.y + Math.sin(a) * 12 * Q.s * 3, 8); c.fill();
      }
    }
  }

  /** First person: the front of your own machine at the bottom of the screen, bobbing as you go. */
  function bonnet(g) {
    var m = g.m, car = g.car, id = m.id, bob = Math.sin(car.run / 25) * (car.air ? 0 : 3), y = H + bob, cx = W / 2;
    c.save();
    if (car.wipe > 0) { c.restore(); return; }
    if (id === 'surf' || id === 'ski') {
      c.fillStyle = m.colour;
      var tips = id === 'surf' ? [0] : [-150, 150];
      for (var i = 0; i < tips.length; i++) {
        var tx = cx + tips[i];
        c.beginPath(); c.moveTo(tx - (id === 'surf' ? 170 : 50), y); c.quadraticCurveTo(tx - 40, y - 140, tx, y - 170); c.quadraticCurveTo(tx + 40, y - 140, tx + (id === 'surf' ? 170 : 50), y); c.fill();
      }
      if (id === 'surf') { c.fillStyle = PAPER; c.fillRect(cx - 5, y - 150, 10, 150); }
      else {
        // The tow rope's handle in your hands.
        box(cx - 120, y - 120, 240, 16, 8, '#22221F');
        c.strokeStyle = 'rgba(247,246,242,0.9)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx - 100, y - 112); c.lineTo(cx, y - 250); c.lineTo(cx + 100, y - 112); c.stroke();
      }
      c.restore();
      return;
    }
    var top = id === 'truck' ? 150 : id === 'race' ? 80 : 110, half = id === 'race' ? 260 : 330;
    c.fillStyle = id === 'boat' ? PAPER : m.colour;
    c.beginPath(); c.moveTo(cx - half - 120, y); c.quadraticCurveTo(cx - half, y - top, cx, y - top - 20); c.quadraticCurveTo(cx + half, y - top, cx + half + 120, y); c.fill();
    if (id === 'race') { c.fillStyle = PAPER; c.beginPath(); c.moveTo(cx - 30, y); c.lineTo(cx - 8, y - top - 16); c.lineTo(cx + 8, y - top - 16); c.lineTo(cx + 30, y); c.fill(); }
    if (id === 'truck') {
      c.fillStyle = EMBER;
      for (var f = -1; f <= 1; f++) { c.beginPath(); c.moveTo(cx + f * 120 - 40, y); c.lineTo(cx + f * 120, y - top + 10); c.lineTo(cx + f * 120 + 40, y); c.fill(); }
    }
    if (id === 'boat') { c.fillStyle = m.colour; c.fillRect(cx - 600, y - 40, 1200, 26); c.fillStyle = 'rgba(158,123,255,0.35)'; c.fillRect(0, y - top - 80, W, 70); }
    if (id === 'jetski') { box(cx - 230, y - top - 50, 460, 18, 9, '#22221F'); box(cx - 250, y - top - 58, 50, 34, 10, '#3A3942'); box(cx + 200, y - top - 58, 50, 34, 10, '#3A3942'); }
    if (id === 'dozer') { box(cx - 520, y - 70, 1040, 26, 6, '#C9C5BE'); c.fillStyle = EMBER; c.fillRect(cx - 520, y - 70, 1040, 8); }
    if (id === 'digger') {
      var reach = car.slam > 0 ? Math.sin(car.slam / 0.4 * Math.PI) * 90 : 0;
      c.strokeStyle = '#C98A1E'; c.lineWidth = 34; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + 200, y); c.lineTo(cx + 90, y - 300 + reach); c.stroke();
      box(cx + 40, y - 330 + reach, 110, 80, 12, '#5B5E66');
    }
    if (id === 'buggy') {
      c.strokeStyle = m.colour; c.lineWidth = 22; c.lineCap = 'round';
      c.beginPath(); c.moveTo(60, y); c.lineTo(150, 40); c.lineTo(W - 150, 40); c.lineTo(W - 60, y); c.stroke();
    }
    c.restore();
  }

  function render(g) {
    var cam = g.cam, z = cam.zoom, car = g.car;
    if (g.view > 0) { render3d(g); overlay(g); return; }
    var shx = cam.shake ? (Math.random() - 0.5) * cam.shake : 0, shy = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#3F7F3B'; c.fillRect(0, 0, W, H);
    c.setTransform(z, 0, 0, z, W / 2 - cam.x * z + shx, H / 2 - cam.y * z + shy);
    var x0 = cam.x - W / 2 / z - 80, x1 = cam.x + W / 2 / z + 80, y0 = cam.y - H / 2 / z - 80, y1 = cam.y + H / 2 / z + 200;
    drawGround(g, x0, y0, x1, y1);
    var w = g.world, i, o;
    c.lineCap = 'round';
    for (i = 0; i < g.skids.length; i++) {
      var s = g.skids[i];
      if (s.life <= 0) continue;
      c.strokeStyle = 'rgba(40,30,20,' + Math.min(0.35, s.life * 0.1) + ')'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
    }
    for (i = 0; i < w.pads.length; i++) drawPad(w.pads[i], g.t);
    for (i = 0; i < w.ramps.length; i++) drawRamp(w.ramps[i]);
    for (i = 0; i < w.objs.length; i++) {
      o = w.objs[i];
      if (!o.alive || o.float || o.kind === 'tree' || o.x < x0 - o.r - 60 || o.x > x1 + o.r + 60 || o.y < y0 - o.r - 60 || o.y > y1 + o.r + 60) continue;
      drawObj(o, g.t);
    }
    drawCar(g);
    drawParts(g);
    for (i = 0; i < w.objs.length; i++) {
      o = w.objs[i];
      if (!o.alive || !(o.float || o.kind === 'tree') || o.x < x0 - 60 || o.x > x1 + 60 || o.y < y0 - 60 || o.y > y1 + 260) continue;
      drawObj(o, g.t);
    }
    for (i = 0; i < g.pops.length; i++) {
      var pp = g.pops[i], k = pp.t / 1.6, size = (pp.big ? 40 : 28) / z * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1);
      c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      text(pp.s, pp.x, pp.y - pp.z * ZT - 40 - k * 90, size, pp.c, 'center', '800', 'rgba(13,12,24,0.75)');
      c.globalAlpha = 1;
    }
    overlay(g);
  }

  /** Over every camera: speed lines on a turbo, then the scores and challenges. */
  function overlay(g) {
    var car = g.car, i;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (car.boost > 0) {
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
      for (i = 0; i < 14; i++) {
        var ang = Math.random() * TAU, r1 = 380 + Math.random() * 200;
        c.beginPath(); c.moveTo(W / 2 + Math.cos(ang) * r1, H / 2 + Math.sin(ang) * r1 * 0.6);
        c.lineTo(W / 2 + Math.cos(ang) * (r1 + 120), H / 2 + Math.sin(ang) * (r1 + 120) * 0.6); c.stroke();
      }
    }
    hud(g);
  }

  function hud(g) {
    var car = g.car, i;
    // Score.
    box(20, 18, 250, 92, 18, 'rgba(13,12,24,0.55)');
    text(L(SCORE), 40, 42, 18, 'rgba(247,246,242,0.7)', 'left', '600');
    text(String(g.score), 40, 76, 38, PAPER, 'left', '800');
    text(L(BEST) + ' ' + Math.max(g.best, g.score), 255, 42, 16, 'rgba(247,246,242,0.55)', 'right', '600');
    // Combo.
    if (comboMult(g.combo.n) > 1) {
      var mult = comboMult(g.combo.n), pulse = 1 + Math.max(0, g.combo.t - 2.6) * 0.6;
      c.save(); c.translate(W / 2, 54); c.scale(pulse, pulse);
      box(-90, -34, 180, 68, 34, mult >= 5 ? CORAL : mult >= 3 ? EMBER : VIOLET);
      text('x' + mult, 0, -2, 38, PAPER, 'center', '800');
      c.restore();
      box(W / 2 - 70, 96, 140, 8, 4, 'rgba(13,12,24,0.5)');
      box(W / 2 - 70, 96, 140 * Math.max(0, g.combo.t / 3), 8, 4, LILAC);
    }
    // Challenges.
    var now = current(g);
    var ch = 58 + Math.max(1, now.length) * 40;
    box(W - 400, 18, 380, ch, 18, 'rgba(13,12,24,0.55)');
    text(L(CHALLENGES), W - 380, 42, 18, LILAC, 'left', '700');
    if (!now.length) text(L(ALL_DONE), W - 380, 82, 18, PAPER, 'left', '600');
    for (i = 0; i < now.length; i++) {
      var have = Math.min(now[i].need, g.stats[now[i].stat] || 0), y = 82 + i * 40;
      box(W - 382, y - 13, 26, 26, 7, 'rgba(247,246,242,0.15)');
      c.strokeStyle = 'rgba(247,246,242,0.6)'; c.lineWidth = 2; rr(W - 382, y - 13, 26, 26, 7); c.stroke();
      text(L(now[i].text), W - 344, y, 19, PAPER, 'left', '600');
      if (now[i].need > 1) text(have + '/' + now[i].need, W - 36, y, 18, EMBER, 'right', '700');
    }
    // Speed and gear.
    box(20, H - 120, 300, 100, 18, 'rgba(13,12,24,0.55)');
    text(L(g.m.name), 40, H - 96, 20, PAPER, 'left', '700');
    var gears = ['R', 'N', '1', '2', '3'];
    for (i = 0; i < gears.length; i++) {
      var on = car.gear === i - 1;
      box(40 + i * 52, H - 70, 42, 36, 10, on ? VIOLET : 'rgba(247,246,242,0.12)');
      text(gears[i], 61 + i * 52, H - 52, 20, on ? PAPER : 'rgba(247,246,242,0.5)', 'center', '800');
    }
    // A map of the park.
    var mw = 220, mh = mw * WH / WW, mx = W - mw - 24, my = H - mh - 24, sc = mw / WW;
    box(mx - 6, my - 6, mw + 12, mh + 12, 12, 'rgba(13,12,24,0.55)');
    var w = g.world;
    if (w.water) {
      box(mx, my, mw, mh, 8, 'rgba(235,203,139,0.85)');
      box(mx + (w.edge - 40) * sc, my + (w.edge - 40) * sc, mw - 2 * (w.edge - 40) * sc, mh - 2 * (w.edge - 40) * sc, 6, 'rgba(62,155,214,0.9)');
      for (i = 0; i < w.objs.length; i++) if (w.objs[i].kind === 'island') disc(mx + w.objs[i].x * sc, my + w.objs[i].y * sc, w.objs[i].r * sc, '#7DBB5E');
    } else {
      box(mx, my, mw, mh, 8, 'rgba(93,170,79,0.7)');
      c.strokeStyle = 'rgba(201,155,99,0.9)'; c.lineWidth = 4;
      rr(mx + w.track.x * sc, my + w.track.y * sc, w.track.w * sc, w.track.h * sc, w.track.r * sc); c.stroke();
      box(mx + w.sand.x * sc, my + w.sand.y * sc, w.sand.w * sc, w.sand.h * sc, 3, '#EBCB8B');
      oval(mx + w.pond.x * sc, my + w.pond.y * sc, w.pond.rx * sc, w.pond.ry * sc, '#3E9BD6');
    }
    c.fillStyle = '#F2C98E';
    for (i = 0; i < w.ramps.length; i++) if (!w.ramps[i].wave) c.fillRect(mx + w.ramps[i].x * sc - 3, my + w.ramps[i].y * sc - 3, 6, 6);
    for (i = 0; i < w.objs.length; i++) if (w.objs[i].alive && w.objs[i].kind === 'star') disc(mx + w.objs[i].x * sc, my + w.objs[i].y * sc, 3, EMBER);
    c.save(); c.translate(mx + car.x * sc, my + car.y * sc); c.rotate(car.h);
    c.fillStyle = PAPER; c.beginPath(); c.moveTo(8, 0); c.lineTo(-6, -6); c.lineTo(-6, 6); c.closePath(); c.fill();
    c.restore();
    // What the remote does right now.
    var hint = !g.started ? L(GO) : car.air ? L(HINT_AIR) : L(g.m.slam ? HINT_SLAM : HINT_GROUND);
    var big = !g.started || car.air;
    c.font = '700 ' + (big ? 26 : 20) + 'px Sora, Inter, Arial, sans-serif';
    var tw = c.measureText(hint).width + 48;
    // The big hint sits above the gear and the map, so it never covers them.
    var hy = big ? H - 168 : H - 43;
    box(W / 2 - tw / 2, hy - (big ? 26 : 21), tw, big ? 52 : 42, 26, big ? 'rgba(110,61,219,0.88)' : 'rgba(13,12,24,0.5)');
    text(hint, W / 2, hy, big ? 26 : 20, PAPER, 'center', '700');
    // Which camera, for a moment after it changes.
    if (g.camT > 0) {
      c.globalAlpha = Math.min(1, g.camT / 0.4);
      box(W / 2 - 160, H - 252, 320, 50, 25, 'rgba(13,12,24,0.75)');
      text(L(CAMERA) + ': ' + L(VIEWS[g.view]), W / 2, H - 227, 22, PAPER, 'center', '700');
      c.globalAlpha = 1;
    }
    // A challenge just done.
    if (g.banner) {
      var bt = g.banner.t, e = bt > 2.7 ? (3 - bt) / 0.3 : bt < 0.4 ? bt / 0.4 : 1;
      c.globalAlpha = e;
      // Under the combo, clear of the score and the challenges.
      box(W / 2 - 240, 116, 480, 96, 24, 'rgba(13,12,24,0.82)');
      text(L(CHALLENGE_DONE) + '  +500', W / 2, 148, 28, EMBER, 'center', '800');
      text(g.banner.text, W / 2, 186, 22, PAPER, 'center', '600');
      c.globalAlpha = 1;
    }
  }

  // MARK: - The picker and the pause screen

  function backdrop(t) {
    var grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, INK); grad.addColorStop(1, DUSK);
    c.fillStyle = grad; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) {
      var x = (i * 197 + t * (8 + i % 5 * 4)) % W, y = (i * 113) % (H - 200), tw = (Math.sin(t * 2 + i) + 1) / 2;
      disc(x, y, 1.5 + tw * 1.5, 'rgba(247,246,242,' + (0.15 + tw * 0.35) + ')');
    }
  }
  function dots(x, y) {
    var cols = [MOSS, EMBER, CORAL, BLUE];
    for (var i = 0; i < 4; i++) disc(x + i * 22, y, 7, cols[i]);
  }

  /** The picker: land or water machines (the row ▲ ▼ moves between), then the camera. row: 0 land, 1 water, 2 camera. */
  function drawPick(sel, t, bests, row, view) {
    row = row || 0; view = view || 0;
    c.setTransform(1, 0, 0, 1, 0, 0);
    backdrop(t);
    dots(W / 2 - 33, 36);
    text(L(TITLE), W / 2, 82, 42, PAPER, 'center', '800');
    var water = sel >= LAND_COUNT, i;
    // Land and water, as two tabs.
    var tabs = [ON_LAND, ON_WATER];
    for (i = 0; i < 2; i++) {
      var on = (i === 1) === water, tx = W / 2 - 230 + i * 240;
      box(tx, 118, 220, 44, 22, on ? (row < 2 ? VIOLET : 'rgba(110,61,219,0.55)') : 'rgba(247,246,242,0.08)');
      text(L(tabs[i]), tx + 110, 141, 20, on ? PAPER : 'rgba(247,246,242,0.6)', 'center', on ? '800' : '600');
    }
    var first = water ? LAND_COUNT : 0, count = water ? MACHINES.length - LAND_COUNT : LAND_COUNT;
    var cw = 220, gap = 22, x0 = (W - (cw * count + gap * (count - 1))) / 2;
    for (i = 0; i < count; i++) {
      var mi = first + i, m = MACHINES[mi], here = mi === sel, x = x0 + i * (cw + gap), y = 186, ch = 330, lit = here && row < 2;
      c.save();
      if (here) { c.translate(x + cw / 2, y + ch / 2); c.scale(1.05, 1.05); c.translate(-(x + cw / 2), -(y + ch / 2)); }
      if (lit) box(x - 6, y - 6, cw + 12, ch + 12, 30, 'rgba(158,123,255,0.55)');
      box(x, y, cw, ch, 26, here ? '#241E4A' : 'rgba(247,246,242,0.07)');
      oval(x + cw / 2, y + 112, 82, 30, m.water ? 'rgba(62,155,214,0.45)' : 'rgba(0,0,0,0.25)');
      c.save(); c.translate(x + cw / 2, y + 92 + (here ? Math.sin(t * 4) * 4 : 0)); c.rotate(here ? t * 0.9 : -Math.PI / 2 + 0.5); c.scale(1.7, 1.7);
      machine(m, here ? Math.sin(t * 2) * 0.3 : 0, false, t * 60, here && m.slam ? (t % 1.6 < 0.4 ? t % 1.6 : 0) : 0);
      c.restore();
      text(L(m.name), x + cw / 2, y + 188, 22, PAPER, 'center', '800');
      var vals = [Math.min(1, m.top / 880), Math.min(1, m.jump / 1.4), m.power / 3];
      for (var s2 = 0; s2 < 3; s2++) {
        var by = y + 228 + s2 * 34;
        text(L(STAT_NAMES[s2]), x + 18, by, 15, 'rgba(247,246,242,0.65)', 'left', '600');
        box(x + 100, by - 6, 100, 12, 6, 'rgba(247,246,242,0.12)');
        box(x + 100, by - 6, 100 * vals[s2], 12, 6, here ? EMBER : 'rgba(247,246,242,0.45)');
      }
      c.restore();
    }
    text(L(MACHINES[sel].about), W / 2, 548, 22, PAPER, 'center', '600');
    if (bests) text(L(BEST) + ' ' + bests, W / 2, 578, 17, 'rgba(247,246,242,0.55)', 'center', '600');
    // The camera.
    text(L(CAMERA), W / 2 - 360, 626, 20, row === 2 ? LILAC : 'rgba(247,246,242,0.6)', 'right', '700');
    for (i = 0; i < VIEWS.length; i++) {
      var vx = W / 2 - 340 + i * 230, chosen = i === view;
      box(vx, 604, 210, 44, 22, chosen ? (row === 2 ? VIOLET : 'rgba(110,61,219,0.55)') : 'rgba(247,246,242,0.08)');
      if (chosen && row === 2) { c.strokeStyle = LILAC; c.lineWidth = 3; rr(vx, 604, 210, 44, 22); c.stroke(); }
      text(L(VIEWS[i]), vx + 105, 627, 19, chosen ? PAPER : 'rgba(247,246,242,0.6)', 'center', chosen ? '800' : '600');
    }
    text(L(PICK_HELP), W / 2, 690, 19, LILAC, 'center', '700');
  }

  function drawPause(g, at) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(13,12,24,0.9)'; c.fillRect(0, 0, W, H);
    dots(W / 2 - 33, 100);
    text(L(PAUSED), W / 2, 160, 60, PAPER, 'center', '800');
    for (var i = 0; i < MENU.length; i++) {
      var on = i === at, y = 226 + i * 76;
      box(W / 2 - 240, y, 480, 62, 31, on ? VIOLET : 'rgba(247,246,242,0.1)');
      if (on) { c.strokeStyle = LILAC; c.lineWidth = 3; rr(W / 2 - 240, y, 480, 62, 31); c.stroke(); }
      // The camera item shows which one, and ◀ ▶ change it right there.
      var label = i === 1 ? L(CAMERA) + ':  ◀ ' + L(VIEWS[g.view]) + ' ▶' : L(MENU[i]);
      text(label, W / 2, y + 32, 27, PAPER, 'center', on ? '800' : '600');
    }
    text(L(PAUSE_HELP), W / 2, 650, 22, LILAC, 'center', '700');
  }

  // MARK: - The screen

  var g = null, state = '', sel = 0, menu = 0, prow = 0, view = 0, canvas = null, live = false, last = 0, clock = 0, motorAt = 0;
  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };

  function isBack(k) { return k === 27 || k === 8 || k === 4 || k === 461 || k === 10009 || (window.TV && TV.keys && k === TV.keys.back); }

  function frame(now) {
    if (!live) return;
    now = now || Date.now();
    var dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0.016;
    last = now; clock += dt;
    if (state === 'play' && g) {
      step(g, dt);
      render(g);
      if (clock - motorAt > 0.1 && window.Sfx && Sfx.motor) {
        motorAt = clock;
        Sfx.motor(g.car.wipe > 0 ? 0.1 : Math.min(1, Math.abs(g.car.speed) / g.m.top + (g.car.air ? 0.3 : 0)) + 0.05);
      }
    } else if (state === 'paused' && g) { render(g); drawPause(g, menu); }
    else if (state === 'pick') { var sv = load(); drawPick(sel, clock, (sel >= LAND_COUNT ? sv.bestWater : sv.best) || 0, prow, view); }
    raf(frame);
  }

  function hush() { if (window.Sfx && Sfx.motor) Sfx.motor(0); }

  function start() {
    g = newGame(sel);
    g.view = view;
    state = 'play';
    save(g);
  }

  function choose(api) {
    if (menu === 0) state = 'play';
    else if (menu === 1) nextView(g);
    else if (menu === 2) { view = g.view; save(g); prow = sel >= LAND_COUNT ? 1 : 0; state = 'pick'; }
    else if (menu === 3) { if (window.Guides) Guides.show('rcland'); }
    else api.close();
  }

  /** ◀ ▶ in the picker: a machine in this row (land or water), or the camera. */
  function pickSide(d) {
    if (prow === 2) { view = (view + d + VIEWS.length) % VIEWS.length; return; }
    var first = prow ? LAND_COUNT : 0, count = prow ? MACHINES.length - LAND_COUNT : LAND_COUNT;
    sel = first + (sel - first + d + count) % count;
  }
  /** ▲ ▼ in the picker: land, water, camera. Moving between land and water picks the first machine there. */
  function pickRow(d) {
    var to = Math.max(0, Math.min(2, prow + d));
    if (to === prow) return;
    if (to < 2 && (to === 1) !== (sel >= LAND_COUNT)) sel = to ? LAND_COUNT : 0;
    prow = to;
  }

  function open() {
    var saved = load();
    sel = saved.last >= 0 && saved.last < MACHINES.length ? saved.last : 0;
    view = saved.view > 0 && saved.view < VIEWS.length ? saved.view : 0;
    prow = sel >= LAND_COUNT ? 1 : 0;
    state = 'pick'; menu = 0; g = null; last = 0;
    UI.open({
      cls: 'bt-rcland',
      build: function (layer, api) {
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H; canvas.className = 'rc-canvas';
        layer.appendChild(canvas);
        c = canvas.getContext('2d');
        layer.rcApi = api;
      },
      key: function (k) {
        // Back goes to back() below (UI's own handling), so it always pauses or leaves.
        if (isBack(k)) return false;
        if (state === 'pick') {
          if (k === LEFT || k === RIGHT) { pickSide(k === LEFT ? -1 : 1); sfx('hop'); }
          else if (k === UP || k === DOWN) { pickRow(k === UP ? -1 : 1); sfx('hop'); }
          else if (k === OK) { sfx('six'); start(); }
          else if (CAMERA_KEYS[k]) { view = k >= 49 && k <= 51 ? k - 49 : (view + 1) % VIEWS.length; sfx('hop'); }
          return true;
        }
        if (state === 'paused') {
          if (k === UP) { menu = (menu + MENU.length - 1) % MENU.length; sfx('hop'); }
          else if (k === DOWN) { menu = (menu + 1) % MENU.length; sfx('hop'); }
          else if (k === OK) choose(canvas.parentNode.rcApi);
          else if (menu === 1 && (k === LEFT || k === RIGHT)) { nextView(g, k === LEFT ? -1 : 1); sfx('hop'); }
          return true;
        }
        if (state === 'play' && g) drive(g, k);
        return true;
      },
      back: function () {
        if (state === 'play') { state = 'paused'; menu = 0; hush(); if (g) save(g); return true; }
        return false;
      },
      closed: function () {
        if (g) save(g);
        live = false; g = null; state = ''; c = null; canvas = null;
        if (window.Sfx && Sfx.stop) Sfx.stop();
      }
    });
    live = true;
    raf(frame);
  }

  return {open: open, rules: {MACHINES: MACHINES, GOALS: GOALS, KINDS: KINDS, buildWorld: buildWorld, groundAt: groundAt,
    comboMult: comboMult, newGame: newGame, step: step, drive: drive, current: current, L: L,
    WATER_GOALS: WATER_GOALS, LAND_COUNT: LAND_COUNT, VIEWS: VIEWS, rollWaves: rollWaves, towAt: towAt,
    // For the tests and a preview in a browser: draw on a stand-in canvas, and the game on screen.
    useContext: function (ctx) { c = ctx; }, render: render, drawPick: drawPick, drawPause: drawPause, playing: function () { return g; }}};
})();
