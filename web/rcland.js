/*
 * Milo's Remote Control Land (ADR 0045): pick a machine (race car, monster truck, digger, dune buggy or bulldozer) and
 * drive it round a park full of ramps, things to smash, stars, balloons and a pond. Flips and spins in the air score
 * points, landing them keeps a combo going, and challenges give a goal. Played with the remote alone, one press per push
 * like the arcade (ADR 0035): ▲ ▼ change gear, ◀ ▶ turn a bit, OK jumps; in the air the arrows and OK do tricks. Back
 * pauses. Bests and finished challenges stay on this TV, nothing is sent. Google TV runs this same file in
 * TableActivity's WebView (start "rcland"). The words are the game's own, in all five languages, like guides.js.
 * Plain ES5: one canvas, plain shapes, nothing to download.
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
  var PICK_HELP = ['◀ ▶ escolher  ·  OK dirigir  ·  ▼ Como jogar  ·  Voltar sair', '◀ ▶ pick  ·  OK to drive  ·  ▼ How to play  ·  Back to leave',
    '◀ ▶ elegir  ·  OK conducir  ·  ▼ Cómo jugar  ·  Atrás salir', '◀ ▶ wählen  ·  OK fahren  ·  ▼ Wie man spielt  ·  Zurück verlassen',
    '◀ ▶ выбрать  ·  OK ехать  ·  ▼ Как играть  ·  «Назад» выйти'];
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
      about: ['Lento mas forte: passa direto pelas pedras.', 'Slow but strong: ploughs straight through rocks.', 'Lento pero fuerte: atraviesa las rocas.', 'Langsam, aber stark: schiebt Felsen einfach weg.', 'Медленный, но сильный: проходит сквозь камни.']}
  ];

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
  for (var gi = 0; gi < GOALS.length; gi++) GOALS[gi].id = GOALS[gi].stat + GOALS[gi].need;

  // MARK: - Saved on this TV

  function load() {
    try { var s = JSON.parse(window.localStorage.getItem(KEY)); if (s && typeof s === 'object') return s; } catch (e) {}
    return {};
  }
  function save(g) {
    var s = {best: Math.max(g.best, g.score), stats: g.stats, done: g.done, last: g.mi};
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
    star: {r: 30, h: 0, tough: 0, pts: 200, float: true}
  };
  var BLOCKS = [CORAL, BLUE, EMBER, VIOLET, '#5CC4AE'];
  var BALLOONS = [CORAL, BLUE, LILAC, EMBER, '#5CC4AE', '#E8475C'];
  var SIZES = {small: {len: 150, wid: 120, h: 40}, big: {len: 220, wid: 150, h: 75}, mega: {len: 280, wid: 170, h: 120}};

  function buildWorld() {
    seed = 11;
    var w = {objs: [], ramps: [], pads: [], pins: [],
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
  function inPond(w, x, y) { var p = w.pond, a = (x - p.x) / p.rx, b = (y - p.y) / p.ry; return a * a + b * b < 1; }
  function inSand(w, x, y) { var s = w.sand; return x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h; }

  // MARK: - A game

  function newGame(mi, saved) {
    saved = saved || load();
    var stats = {}, k;
    if (saved.stats) for (k in saved.stats) if (saved.stats.hasOwnProperty(k)) stats[k] = saved.stats[k];
    var done = {};
    if (saved.done) for (k in saved.done) if (saved.done.hasOwnProperty(k)) done[k] = saved.done[k];
    return {
      m: MACHINES[mi], mi: mi, world: buildWorld(), t: 0, score: 0, best: saved.best || 0, stats: stats, done: done,
      car: {x: 1800, y: 2060, z: 0, vz: 0, h: -Math.PI / 2, want: -Math.PI / 2, speed: 0, gear: 0, steer: 0, air: false,
        kx: 0, ky: 0, boost: 0, wipe: 0, roll: 0, trick: null, queue: [], tricks: [], takeoff: 0, rampVz: 0, onRamp: false,
        slam: 0, slamCd: 0, wet: false, padCd: 0, safe: 0, trail: 0, run: 0, bonk: 0},
      combo: {n: 0, t: 0}, parts: [], pi: 0, pops: [], skids: [], si: 0,
      cam: {x: 1800, y: 1940, zoom: 1.15, shake: 0}, flash: 0, started: false, tough: 0, banner: null
    };
  }

  function stat(g, k, n) { g.stats[k] = (g.stats[k] || 0) + (n === undefined ? 1 : n); }

  /** The three challenges on screen: the first ones not yet done. */
  function current(g) {
    var out = [];
    for (var i = 0; i < GOALS.length && out.length < 3; i++) if (!g.done[GOALS[i].id]) out.push(GOALS[i]);
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
    if (mult > (g.stats.combo || 0)) g.stats.combo = mult;
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
    junk: ['#8A8F98', '#A0614A', '#5B5E66', EMBER], rock: ['#8D8A86', '#6E6B68', '#B5B1AC']
  };

  function smash(g, o, slammed) {
    var car = g.car;
    o.alive = false;
    o.back = 25 + Math.random() * 12;
    var colours = o.kind === 'block' ? [o.c, PAPER] : PIECES[o.kind] || [PAPER];
    var big = o.kind === 'junk' || o.kind === 'rock' || o.kind === 'castle';
    burst(g, o.x, o.y, o.h * 0.5, big ? 22 : 12, colours, big ? 320 : 260, big ? 420 : 340, big ? 12 : 8, o.kind === 'crate' ? 4 : 0);
    if (o.kind === 'castle' || o.kind === 'rock') burst(g, o.x, o.y, 10, 10, ['rgba(235,203,139,0.7)', 'rgba(255,255,255,0.5)'], 120, 80, 16, 1);
    if (o.kind === 'junk') burst(g, o.x, o.y, 30, 10, [EMBER, '#FFD27A'], 380, 300, 4, 1);
    sfx(big ? 'crunch' : 'smash');
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
    pop(g, L(WIPEOUT), car.x, car.y, 90, CORAL, true);
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
    sfx('land');
    shake(g, Math.min(10, 2 + air * 5));
    burst(g, car.x, car.y, 2, 10, ['rgba(255,255,255,0.55)', 'rgba(201,155,99,0.6)'], 160, 40, 14, 1);
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

  function drive(g, k) {
    var car = g.car;
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

    var vx = Math.cos(car.h) * car.speed + car.kx, vy = Math.sin(car.h) * car.speed + car.ky;
    car.kx *= Math.pow(0.02, dt); car.ky *= Math.pow(0.02, dt);
    var nx = car.x + vx * dt, ny = car.y + vy * dt;
    var gh = groundAt(w, nx, ny), ramp = w.under;
    if (!car.air && gh > car.z + 22) {
      // The side or the back of a ramp: it's a wall from there.
      car.speed = -car.speed * 0.3; car.kx = -vx * 0.3; car.ky = -vy * 0.3;
      nx = car.x; ny = car.y; gh = groundAt(w, nx, ny); ramp = w.under;
      if (car.bonk <= 0) { sfx('bonk'); car.bonk = 0.4; }
      shake(g, 4);
    }
    car.x = nx; car.y = ny;
    car.run += Math.abs(car.speed) * dt;

    // The fence round the park.
    var cr = m.wid * 0.55, edge = 40 + cr;
    if (car.x < edge || car.x > WW - edge || car.y < edge || car.y > WH - edge) {
      car.x = Math.max(edge, Math.min(WW - edge, car.x)); car.y = Math.max(edge, Math.min(WH - edge, car.y));
      car.speed = -car.speed * 0.3;
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
        if (car.vz > 150) { stat(g, 'ramp'); sfx('jump'); checkGoals(g); }
      } else car.z = gh;
    }
    car.onRamp = !!ramp && !car.air;
    if (car.onRamp) {
      var along = vx * ramp.ca + vy * ramp.sa;
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
        var col = wet ? '#BFE6FF' : sandy ? 'rgba(235,203,139,0.7)' : 'rgba(201,155,99,0.45)';
        part(g, bx2 + (Math.random() - 0.5) * m.wid, by2 + (Math.random() - 0.5) * m.wid, 3, -Math.cos(car.h) * 40, -Math.sin(car.h) * 40,
          wet ? 220 : 40, 0.5, col, wet ? 6 : 12, 1);
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
      if (into > 0) { car.speed = -car.speed * 0.35; car.kx -= ux * into * 0.4; car.ky -= uy * into * 0.4; }
      if (car.bonk <= 0) { sfx('bonk'); car.bonk = 0.4; shake(g, 7); }
      if (o.tough < 99 && g.tough <= 0) { g.tough = 5; pop(g, L(TOO_TOUGH), o.x, o.y, 90, PAPER); }
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
  function machine(m, steer, under, run, arm) {
    var L2 = m.len, Wd = m.wid;
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

  function drawRamp(r) {
    // Corners: base left and right on the ground, top left and right up in the air.
    var px = -r.sa * r.wid / 2, py = r.ca * r.wid / 2, tx = r.x + r.ca * r.len, ty = r.y + r.sa * r.len, up = r.h * ZT;
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.beginPath(); c.moveTo(r.x + px, r.y + py); c.lineTo(r.x - px, r.y - py); c.lineTo(tx - px + 10, ty - py + 12); c.lineTo(tx + px + 10, ty + py + 12); c.fill();
    c.fillStyle = '#7A4E2E';
    c.beginPath(); c.moveTo(tx + px, ty + py); c.lineTo(tx - px, ty - py); c.lineTo(tx - px, ty - py - up); c.lineTo(tx + px, ty + py - up); c.fill();
    c.fillStyle = '#8F5E37';
    c.beginPath(); c.moveTo(r.x + px, r.y + py); c.lineTo(tx + px, ty + py); c.lineTo(tx + px, ty + py - up); c.fill();
    c.beginPath(); c.moveTo(r.x - px, r.y - py); c.lineTo(tx - px, ty - py); c.lineTo(tx - px, ty - py - up); c.fill();
    var grad = c.createLinearGradient(r.x, r.y, tx, ty - up);
    grad.addColorStop(0, '#D9A36A'); grad.addColorStop(1, '#F2C98E');
    c.fillStyle = grad;
    c.beginPath(); c.moveTo(r.x + px, r.y + py); c.lineTo(r.x - px, r.y - py); c.lineTo(tx - px, ty - py - up); c.lineTo(tx + px, ty + py - up); c.fill();
    // Planks and arrows up the slope.
    c.strokeStyle = 'rgba(122,78,46,0.35)'; c.lineWidth = 2;
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

  function drawObj(o, t) {
    var s = o.pop > 0 ? 1 - o.pop * 1.6 : 1;
    if (s <= 0.05) return;
    if (o.float) {
      var bob = Math.sin(t * 2 + o.a) * 8, y = o.y - (o.z + bob) * ZT;
      oval(o.x, o.y + 4, o.r * 0.7, o.r * 0.35, 'rgba(0,0,0,0.16)');
      if (o.kind === 'balloon') {
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

  function drawGround(g, x0, y0, x1, y1) {
    var w = g.world, t = g.t, i, j;
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
    machine(m, car.steer * 0.8, cp < 0, car.run, car.slam);
    c.restore();
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

  function render(g) {
    var cam = g.cam, z = cam.zoom, car = g.car;
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
      if (!o.alive || o.float || o.kind === 'tree' || o.x < x0 - 60 || o.x > x1 + 60 || o.y < y0 - 60 || o.y > y1 + 60) continue;
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
    box(mx, my, mw, mh, 8, 'rgba(93,170,79,0.7)');
    var w = g.world;
    c.strokeStyle = 'rgba(201,155,99,0.9)'; c.lineWidth = 4;
    rr(mx + w.track.x * sc, my + w.track.y * sc, w.track.w * sc, w.track.h * sc, w.track.r * sc); c.stroke();
    box(mx + w.sand.x * sc, my + w.sand.y * sc, w.sand.w * sc, w.sand.h * sc, 3, '#EBCB8B');
    oval(mx + w.pond.x * sc, my + w.pond.y * sc, w.pond.rx * sc, w.pond.ry * sc, '#3E9BD6');
    c.fillStyle = '#F2C98E';
    for (i = 0; i < w.ramps.length; i++) c.fillRect(mx + w.ramps[i].x * sc - 3, my + w.ramps[i].y * sc - 3, 6, 6);
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

  function drawPick(sel, t, bests) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    backdrop(t);
    dots(W / 2 - 33, 52);
    text(L(TITLE), W / 2, 104, 46, PAPER, 'center', '800');
    text(L(PICK), W / 2, 150, 24, 'rgba(247,246,242,0.7)', 'center', '600');
    var cw = 220, gap = 22, x0 = (W - (cw * 5 + gap * 4)) / 2;
    for (var i = 0; i < MACHINES.length; i++) {
      var m = MACHINES[i], on = i === sel, x = x0 + i * (cw + gap), y = 200, ch = 360;
      c.save();
      if (on) { c.translate(x + cw / 2, y + ch / 2); c.scale(1.06, 1.06); c.translate(-(x + cw / 2), -(y + ch / 2)); }
      if (on) { box(x - 6, y - 6, cw + 12, ch + 12, 30, 'rgba(158,123,255,0.55)'); }
      box(x, y, cw, ch, 26, on ? '#241E4A' : 'rgba(247,246,242,0.07)');
      oval(x + cw / 2, y + 120, 82, 30, 'rgba(0,0,0,0.25)');
      c.save(); c.translate(x + cw / 2, y + 100 + (on ? Math.sin(t * 4) * 4 : 0)); c.rotate(on ? t * 0.9 : -Math.PI / 2 + 0.5); c.scale(1.7, 1.7);
      machine(m, on ? Math.sin(t * 2) * 0.3 : 0, false, t * 60, on && m.slam ? (t % 1.6 < 0.4 ? t % 1.6 : 0) : 0);
      c.restore();
      text(L(m.name), x + cw / 2, y + 200, 22, PAPER, 'center', '800');
      var vals = [m.top / 780, m.jump / 1.35, m.power / 3];
      for (var s = 0; s < 3; s++) {
        var by = y + 240 + s * 36;
        text(L(STAT_NAMES[s]), x + 18, by, 15, 'rgba(247,246,242,0.65)', 'left', '600');
        box(x + 100, by - 6, 100, 12, 6, 'rgba(247,246,242,0.12)');
        box(x + 100, by - 6, 100 * vals[s], 12, 6, on ? EMBER : 'rgba(247,246,242,0.45)');
      }
      c.restore();
    }
    var m2 = MACHINES[sel];
    text(L(m2.about), W / 2, 612, 24, PAPER, 'center', '600');
    if (bests) text(L(BEST) + ' ' + bests, W / 2, 646, 18, 'rgba(247,246,242,0.55)', 'center', '600');
    text(L(PICK_HELP), W / 2, 690, 20, LILAC, 'center', '700');
  }

  function drawPause(g, at) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(13,12,24,0.9)'; c.fillRect(0, 0, W, H);
    dots(W / 2 - 33, 120);
    text(L(PAUSED), W / 2, 180, 64, PAPER, 'center', '800');
    for (var i = 0; i < MENU.length; i++) {
      var on = i === at, y = 270 + i * 82;
      box(W / 2 - 220, y, 440, 64, 32, on ? VIOLET : 'rgba(247,246,242,0.1)');
      if (on) { c.strokeStyle = LILAC; c.lineWidth = 3; rr(W / 2 - 220, y, 440, 64, 32); c.stroke(); }
      text(L(MENU[i]), W / 2, y + 33, 28, PAPER, 'center', on ? '800' : '600');
    }
    text(L(PAUSE_HELP), W / 2, 640, 22, LILAC, 'center', '700');
  }

  // MARK: - The screen

  var g = null, state = '', sel = 0, menu = 0, canvas = null, live = false, last = 0, clock = 0, motorAt = 0;
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
    else if (state === 'pick') drawPick(sel, clock, load().best || 0);
    raf(frame);
  }

  function hush() { if (window.Sfx && Sfx.motor) Sfx.motor(0); }

  function start() {
    g = newGame(sel);
    state = 'play';
    save(g);
  }

  function choose(api) {
    if (menu === 0) state = 'play';
    else if (menu === 1) { save(g); state = 'pick'; }
    else if (menu === 2) { if (window.Guides) Guides.show('rcland'); }
    else api.close();
  }

  function open() {
    var saved = load();
    sel = saved.last >= 0 && saved.last < MACHINES.length ? saved.last : 0;
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
          if (k === LEFT) { sel = (sel + MACHINES.length - 1) % MACHINES.length; sfx('hop'); }
          else if (k === RIGHT) { sel = (sel + 1) % MACHINES.length; sfx('hop'); }
          else if (k === OK) { sfx('six'); start(); }
          else if (k === DOWN && window.Guides) Guides.show('rcland');
          return true;
        }
        if (state === 'paused') {
          if (k === UP) { menu = (menu + MENU.length - 1) % MENU.length; sfx('hop'); }
          else if (k === DOWN) { menu = (menu + 1) % MENU.length; sfx('hop'); }
          else if (k === OK) choose(canvas.parentNode.rcApi);
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
    // For the tests and a preview in a browser: draw on a stand-in canvas, and the game on screen.
    useContext: function (ctx) { c = ctx; }, render: render, drawPick: drawPick, drawPause: drawPause, playing: function () { return g; }}};
})();
