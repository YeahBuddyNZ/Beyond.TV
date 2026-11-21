/*
 * Build it (ADR 0052): builder games for the remote. Build a road the way it is done for real, one job after another
 * (survey, clear, dig, drains, gravel, roll, asphalt, lines, open), picking the right machine for each job and then
 * driving it. Build a bridge: pick a shape and a material for the gap, the load and the money, then a truck tests it
 * (ADR 0054). Plan a town: roads, houses and everything people need, with happy or sad faces (ADR 0055). Played with the remote alone: the arrows and OK, and Back
 * pauses (Back again leaves, back to Games). Bests stay on this TV, nothing is sent. Google TV runs this same file in
 * TableActivity's WebView (start "road", "bridge" or "town"). The words are the game's own, in all five languages, like rcland.js.
 * Plain ES5: one 1280 by 720 canvas, plain shapes, nothing to download, no emoji (older TVs have no emoji font).
 */
var Builder = (function () {
  'use strict';

  var W = 1280, H = 720, TAU = Math.PI * 2;
  var KEY = 'btv.builder';
  var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;
  var INK = '#0D0C18', PAPER = '#F7F6F2', VIOLET = '#6E3DDB', LILAC = '#9E7BFF', EMBER = '#E8A33D', CORAL = '#D85A30',
    BLUE = '#378ADD', MOSS = '#2F7D6D', DUSK = '#2C2458', HIVIS = '#F2C230', STEEL = '#5B6270';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  /** One line in the TV's language: [pt, en, es, de, ru]. */
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function sfx(kind) { if (window.Sfx) Sfx.play(kind); }

  // MARK: - Words every job uses

  var TITLE = ['Construa!', 'Build it!', '¡A construir!', 'Bau es!', 'Строим!'];
  var PAUSED = ['Pausado', 'Paused', 'En pausa', 'Pause', 'Пауза'];
  var MENU = [['Continuar construindo', 'Keep building', 'Seguir construyendo', 'Weiterbauen', 'Продолжить'],
    ['Como jogar', 'How to play', 'Cómo jugar', 'Wie man spielt', 'Как играть'],
    ['Começar de novo', 'Start again', 'Empezar de nuevo', 'Neu anfangen', 'Начать заново'],
    ['Sair', 'Leave', 'Salir', 'Verlassen', 'Выйти']];
  var PAUSE_HELP = ['▲ ▼ escolher  ·  OK  ·  Voltar sair', '▲ ▼ choose  ·  OK  ·  Back to leave', '▲ ▼ elegir  ·  OK  ·  Atrás salir',
    '▲ ▼ wählen  ·  OK  ·  Zurück verlassen', '▲ ▼ выбрать  ·  OK  ·  «Назад» выйти'];
  var WHICH = ['Qual máquina faz este trabalho?', 'Which machine does this job?', '¿Qué máquina hace este trabajo?', 'Welche Maschine macht diese Arbeit?', 'Какая машина делает эту работу?'];
  var PICK_HELP = ['◀ ▶ escolher  ·  OK esta', '◀ ▶ pick  ·  OK this one', '◀ ▶ elegir  ·  OK esta', '◀ ▶ wählen  ·  OK diese', '◀ ▶ выбрать  ·  OK эту'];
  var NOT_THIS = ['Não é este trabalho. Tente outra!', 'Not for this job. Try another!', 'No es para este trabajo. ¡Prueba otra!', 'Nicht für diese Arbeit. Probier eine andere!', 'Не для этой работы. Попробуйте другую!'];
  var YES = ['Isso!', 'Yes!', '¡Sí!', 'Genau!', 'Да!'];
  var JOB_DONE = ['Trabalho feito!', 'Job done!', '¡Trabajo hecho!', 'Erledigt!', 'Готово!'];
  var NEXT = ['OK próximo trabalho', 'OK next job', 'OK siguiente trabajo', 'OK nächste Arbeit', 'OK следующая работа'];
  var STARS = ['Estrelas', 'Stars', 'Estrellas', 'Sterne', 'Звёзды'];
  var BEST = ['Recorde', 'Best', 'Récord', 'Rekord', 'Рекорд'];
  var AGAIN = ['OK construir de novo  ·  Voltar sair', 'OK build another  ·  Back to leave', 'OK construir otra  ·  Atrás salir',
    'OK noch eine bauen  ·  Zurück verlassen', 'OK построить ещё  ·  «Назад» выйти'];

  // MARK: - Build a road: the machines in the yard

  var TOOLS = {
    surveyor: {name: ['Agrimensor', 'Surveyor', 'Topógrafo', 'Vermesser', 'Геодезист'],
      does: ['O agrimensor mede o terreno e coloca estacas.', 'The surveyor measures the land and puts in pegs.', 'El topógrafo mide el terreno y pone estacas.', 'Der Vermesser misst das Land aus und steckt Pflöcke.', 'Геодезист измеряет землю и ставит колышки.']},
    dozer: {name: ['Trator de esteira', 'Bulldozer', 'Bulldozer', 'Planierraupe', 'Бульдозер'],
      does: ['O trator empurra árvores, arbustos e pedras para fora do caminho.', 'The bulldozer pushes trees, bushes and rocks out of the way.', 'El bulldozer empuja árboles, arbustos y rocas fuera del camino.', 'Die Planierraupe schiebt Bäume, Büsche und Felsen aus dem Weg.', 'Бульдозер сдвигает деревья, кусты и камни с дороги.']},
    digger: {name: ['Escavadeira', 'Digger', 'Excavadora', 'Bagger', 'Экскаватор'],
      does: ['A escavadeira tira a terra alta e enche os caminhões.', 'The digger scoops off the high bits and fills the trucks.', 'La excavadora quita la tierra alta y llena los camiones.', 'Der Bagger trägt die hohen Stellen ab und füllt die Laster.', 'Экскаватор срезает бугры и грузит землю в самосвалы.']},
    pipes: {name: ['Caminhão de canos', 'Pipe truck', 'Camión de tubos', 'Rohrlaster', 'Трубовоз'],
      does: ['O caminhão de canos levanta canos grandes de drenagem.', 'The pipe truck lifts big drain pipes into place.', 'El camión de tubos coloca tubos grandes de desagüe.', 'Der Rohrlaster hebt große Abflussrohre an ihren Platz.', 'Трубовоз укладывает большие дренажные трубы.']},
    tipper: {name: ['Caminhão basculante', 'Tip truck', 'Camión volquete', 'Kipper', 'Самосвал'],
      does: ['O basculante traz cascalho e despeja.', 'The tip truck brings gravel and tips it out.', 'El volquete trae grava y la vuelca.', 'Der Kipper bringt Kies und kippt ihn ab.', 'Самосвал привозит щебень и высыпает его.']},
    roller: {name: ['Rolo compactador', 'Roller', 'Apisonadora', 'Walze', 'Каток'],
      does: ['O rolo aperta o cascalho até ficar duro e liso.', 'The roller squashes the gravel down hard and flat.', 'La apisonadora aprieta la grava hasta dejarla dura y plana.', 'Die Walze drückt den Kies hart und flach.', 'Каток утрамбовывает щебень, плотно и ровно.']},
    paver: {name: ['Pavimentadora', 'Paver', 'Pavimentadora', 'Asphaltfertiger', 'Асфальтоукладчик'],
      does: ['A pavimentadora espalha asfalto quente, liso e preto.', 'The paver lays hot asphalt, smooth and black.', 'La pavimentadora extiende asfalto caliente, liso y negro.', 'Der Fertiger legt heißen Asphalt, glatt und schwarz.', 'Асфальтоукладчик кладёт горячий асфальт, гладкий и чёрный.']},
    marker: {name: ['Pintor de faixas', 'Line marker', 'Pintalíneas', 'Markierer', 'Разметчик'],
      does: ['O pintor de faixas pinta as linhas na estrada.', 'The line marker paints the lines on the road.', 'El pintalíneas pinta las líneas de la carretera.', 'Der Markierer malt die Linien auf die Straße.', 'Разметчик рисует линии на дороге.']}
  };
  var TOOL_IDS = ['surveyor', 'dozer', 'digger', 'pipes', 'tipper', 'roller', 'paver', 'marker'];

  // MARK: - Build a road: the jobs, in the order they are done for real

  var ROAD_STEPS = [
    {id: 'survey', tool: 'surveyor',
      title: ['Medir e estaquear', 'Survey and peg out', 'Medir y estacar', 'Vermessen und abstecken', 'Разметить трассу'],
      why: ['Agrimensores medem o terreno para a estrada ficar no lugar certo. As estacas mostram a todos onde trabalhar.', 'Surveyors measure the land so the road goes in exactly the right place. The pegs show everyone where to work.', 'Los topógrafos miden el terreno para que la carretera vaya en el sitio justo. Las estacas muestran dónde trabajar.', 'Vermesser messen das Land, damit die Straße genau richtig liegt. Die Pflöcke zeigen allen, wo gearbeitet wird.', 'Геодезисты измеряют землю, чтобы дорога легла точно на место. Колышки показывают всем, где работать.'],
      hint: ['◀ ▶ andar  ·  OK colocar uma estaca', '◀ ▶ walk  ·  OK put in a peg', '◀ ▶ andar  ·  OK poner una estaca', '◀ ▶ gehen  ·  OK Pflock setzen', '◀ ▶ идти  ·  OK поставить колышек']},
    {id: 'clear', tool: 'dozer',
      title: ['Limpar o terreno', 'Clear the land', 'Despejar el terreno', 'Das Land räumen', 'Расчистить землю'],
      why: ['O trator empurra árvores, arbustos e pedras. Pedras grandes precisam de vários empurrões!', 'The bulldozer pushes away the trees, bushes and rocks. Big rocks take a few shoves!', 'El bulldozer aparta árboles, arbustos y rocas. ¡Las rocas grandes necesitan varios empujones!', 'Die Planierraupe schiebt Bäume, Büsche und Felsen weg. Große Felsen brauchen ein paar Schübe!', 'Бульдозер убирает деревья, кусты и камни. Большие камни придётся толкнуть несколько раз!'],
      hint: ['◀ ▶ dirigir  ·  OK empurrar', '◀ ▶ drive  ·  OK push', '◀ ▶ conducir  ·  OK empujar', '◀ ▶ fahren  ·  OK schieben', '◀ ▶ ехать  ·  OK толкать']},
    {id: 'dig', tool: 'digger',
      title: ['Nivelar a terra', 'Dig it level', 'Nivelar la tierra', 'Eben baggern', 'Выровнять землю'],
      why: ['Estradas precisam ser lisas, então a escavadeira corta os montes e põe a terra nos caminhões.', 'Roads need to be smooth, so the digger cuts off the humps and loads the dirt onto a truck.', 'Las carreteras tienen que ser lisas, así que la excavadora quita los montículos y carga la tierra en un camión.', 'Straßen müssen glatt sein, also trägt der Bagger die Hügel ab und lädt die Erde auf einen Laster.', 'Дорога должна быть ровной, поэтому экскаватор срезает бугры и грузит землю в самосвал.'],
      hint: ['◀ ▶ dirigir  ·  OK cavar', '◀ ▶ drive  ·  OK dig', '◀ ▶ conducir  ·  OK cavar', '◀ ▶ fahren  ·  OK baggern', '◀ ▶ ехать  ·  OK копать']},
    {id: 'drain', tool: 'pipes',
      title: ['Colocar os bueiros', 'Put in the drains', 'Poner los desagües', 'Abflüsse einbauen', 'Уложить водопропуски'],
      why: ['A água precisa passar por baixo, senão leva a estrada embora. Canos grandes, chamados bueiros, levam o riacho por baixo.', 'Water has to get under the road, or it washes the road away. Big pipes called culverts carry the stream underneath.', 'El agua tiene que pasar por debajo o se lleva la carretera. Tubos grandes, llamados alcantarillas, llevan el arroyo por debajo.', 'Wasser muss unter der Straße durch, sonst spült es sie weg. Große Rohre, Durchlässe genannt, führen den Bach darunter durch.', 'Вода должна проходить под дорогой, иначе размоет её. Большие трубы, водопропуски, пропускают ручей под дорогой.'],
      hint: ['◀ ▶ dirigir  ·  OK colocar um cano no riacho azul', '◀ ▶ drive  ·  OK lay a pipe at each blue stream', '◀ ▶ conducir  ·  OK poner un tubo en cada arroyo azul', '◀ ▶ fahren  ·  OK Rohr in jeden blauen Bach', '◀ ▶ ехать  ·  OK трубу в каждый синий ручей']},
    {id: 'base', tool: 'tipper',
      title: ['Espalhar o cascalho', 'Spread the gravel', 'Extender la grava', 'Kies verteilen', 'Насыпать щебень'],
      why: ['Camadas de pedra britada fazem uma base forte. Ela espalha o peso dos carros e a estrada não afunda.', 'Layers of crushed rock make a strong base. It spreads the weight of the cars so the road does not sink.', 'Capas de piedra triturada forman una base fuerte. Reparte el peso de los coches y la carretera no se hunde.', 'Schichten aus Schotter ergeben einen festen Unterbau. Er verteilt das Gewicht der Autos, damit die Straße nicht einsinkt.', 'Слои щебня делают прочное основание. Оно распределяет вес машин, и дорога не проседает.'],
      hint: ['◀ ▶ dirigir  ·  OK despejar (duas cargas em cada)', '◀ ▶ drive  ·  OK tip gravel (two loads each)', '◀ ▶ conducir  ·  OK volcar (dos cargas en cada)', '◀ ▶ fahren  ·  OK kippen (je zwei Ladungen)', '◀ ▶ ехать  ·  OK высыпать (по два раза)']},
    {id: 'compact', tool: 'roller',
      title: ['Compactar bem', 'Roll it hard', 'Apisonar bien', 'Fest walzen', 'Утрамбовать'],
      why: ['O rolo vibra e aperta o cascalho. Cascalho solto faria buracos na estrada.', 'The roller shakes and squashes the gravel tight. Loose gravel would turn into potholes.', 'La apisonadora vibra y aprieta la grava. La grava suelta haría baches.', 'Die Walze rüttelt und drückt den Kies fest. Loser Kies würde zu Schlaglöchern.', 'Каток трясёт и плотно уминает щебень. Из рыхлого щебня получились бы ямы.'],
      hint: ['◀ ▶ dirigir  ·  OK compactar (três vezes em cada)', '◀ ▶ drive  ·  OK roll (three times each)', '◀ ▶ conducir  ·  OK apisonar (tres veces en cada)', '◀ ▶ fahren  ·  OK walzen (je dreimal)', '◀ ▶ ехать  ·  OK катать (по три раза)']},
    {id: 'seal', tool: 'paver',
      title: ['Colocar o asfalto', 'Lay the asphalt', 'Echar el asfalto', 'Asphalt legen', 'Положить асфальт'],
      why: ['O asfalto quente vai numa velocidade constante para ficar liso. Rápido demais fica fino, devagar demais faz caroços.', 'Hot asphalt goes down at a steady speed so it comes out smooth. Too fast and it is thin, too slow and it gets lumpy.', 'El asfalto caliente se echa a velocidad constante para que quede liso. Muy rápido queda fino, muy lento hace bultos.', 'Heißer Asphalt kommt mit gleichmäßigem Tempo, damit er glatt wird. Zu schnell wird er dünn, zu langsam klumpig.', 'Горячий асфальт кладут с ровной скоростью, чтобы он был гладким. Слишком быстро: тонко, слишком медленно: комки.'],
      hint: ['▲ mais rápido  ·  ▼ mais devagar  ·  fique no verde', '▲ faster  ·  ▼ slower  ·  keep it in the green', '▲ más rápido  ·  ▼ más lento  ·  mantente en el verde', '▲ schneller  ·  ▼ langsamer  ·  bleib im Grünen', '▲ быстрее  ·  ▼ медленнее  ·  держитесь в зелёном']},
    {id: 'lines', tool: 'marker',
      title: ['Pintar as faixas', 'Paint the lines', 'Pintar las líneas', 'Linien malen', 'Нанести разметку'],
      why: ['As faixas mostram aos motoristas por onde ir e mantêm cada um do seu lado da estrada.', 'Lines show drivers where to go and keep everyone on their own side of the road.', 'Las líneas muestran a los conductores por dónde ir y mantienen a cada uno en su lado.', 'Linien zeigen Fahrern den Weg und halten alle auf ihrer Straßenseite.', 'Разметка показывает водителям путь и держит каждого на своей стороне дороги.'],
      hint: ['OK pintar quando o spray estiver sobre uma marca', 'OK paint when the sprayer is over a mark', 'OK pintar cuando el pulverizador esté sobre una marca', 'OK sprühen, wenn die Düse über einer Marke ist', 'OK красить, когда распылитель над меткой']},
    {id: 'open', tool: null,
      title: ['Abrir a estrada!', 'Open the road!', '¡Abrir la carretera!', 'Straße eröffnen!', 'Открыть дорогу!'],
      why: ['Tudo é conferido, e então a estrada abre e os primeiros carros passam.', 'Everything gets checked, then the road opens and the first cars drive on it.', 'Se revisa todo, y luego la carretera se abre y pasan los primeros coches.', 'Alles wird geprüft, dann wird die Straße eröffnet und die ersten Autos fahren darauf.', 'Всё проверяют, потом дорогу открывают, и по ней едут первые машины.'],
      hint: ['OK cortar a fita', 'OK cut the ribbon', 'OK cortar la cinta', 'OK Band durchschneiden', 'OK перерезать ленточку']}
  ];
  var JOB_LIST = ['Lista de trabalhos', 'The job list', 'Lista de trabajos', 'Die Arbeitsliste', 'Список работ'];
  var ROAD_TITLE = ['Construir uma estrada', 'Build a road', 'Construir una carretera', 'Eine Straße bauen', 'Построить дорогу'];
  var ROAD_DONE = ['A estrada está aberta!', 'The road is open!', '¡La carretera está abierta!', 'Die Straße ist offen!', 'Дорога открыта!'];
  var NO_STREAM = ['Nenhum riacho passa aqui. Procure a água azul.', 'No stream crosses here. Look for the blue water.', 'Aquí no cruza ningún arroyo. Busca el agua azul.', 'Hier fließt kein Bach. Such das blaue Wasser.', 'Здесь нет ручья. Ищите синюю воду.'];
  var ALREADY = ['Este pedaço já está feito. Siga em frente!', 'This bit is done. Move along!', 'Este trozo ya está hecho. ¡Sigue!', 'Dieses Stück ist fertig. Weiter!', 'Этот участок готов. Дальше!'];
  var TRUCK_FULL = ['Caminhão cheio! Ele leva a terra embora.', 'Truck full! Off it goes with the dirt.', '¡Camión lleno! Se lleva la tierra.', 'Laster voll! Er fährt die Erde weg.', 'Самосвал полон! Увозит землю.'];
  var TOO_FAST = ['Rápido demais!', 'Too fast!', '¡Demasiado rápido!', 'Zu schnell!', 'Слишком быстро!'];
  var TOO_SLOW = ['Devagar demais!', 'Too slow!', '¡Demasiado lento!', 'Zu langsam!', 'Слишком медленно!'];
  var ASPHALT = ['Asfalto', 'Asphalt', 'Asfalto', 'Asphalt', 'Асфальт'];
  var GRAVEL = ['Cascalho', 'Gravel', 'Grava', 'Kies', 'Щебень'];
  var SOIL = ['Terra', 'Soil', 'Tierra', 'Erde', 'Грунт'];
  var PIPE = ['Bueiro', 'Culvert', 'Alcantarilla', 'Durchlass', 'Труба'];
  var NICE = ['Perfeito!', 'Spot on!', '¡Perfecto!', 'Genau richtig!', 'В самый раз!'];

  // MARK: - Saved on this TV

  function load() {
    try { return JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage full or off: the game still plays */ }
  }

  // MARK: - Build a road: the rules

  var N = 8, X0 = 140, CW = 125, BACK = 330, FRONT = 500, MS = 1.45;
  function cellX(i) { return X0 + CW * i + CW / 2; }

  /** The land along the road, the same every time: humps to dig, two streams, and things in the way. */
  function newRoad() {
    var things = [null, 'tree', 'bush', null, 'rock', 'tree', 'bush', 'rock'];
    var humps = [0, 2, 1, 0, 1, 3, 0, 1];
    var cells = [];
    for (var i = 0; i < N; i++) {
      cells.push({peg: false, thing: things[i], hp: things[i] === 'rock' ? 3 : things[i] === 'tree' ? 2 : things[i] ? 1 : 0,
        hump: humps[i], stream: i === 3 || i === 6, pipe: false, base: 0, rolled: 0, seal: 0, sealQ: 0});
    }
    return {job: 'road', step: 0, phase: 'pick', cells: cells, at: 0, x: cellX(0), choice: 0, options: [], wrong: {},
      stars: [], picks: 0, truck: 0, truckGo: 0, speed: 0, drift: 0, px: 0, inBand: 0, ticks: 0, marks: [], mx: 0,
      hits: 0, ribbon: false, cars: -1, t: 0, msg: null, fx: [], arm: 0, done: false, total: 0};
  }

  /** The four machines offered for a job: the right one and three others, in a mixed order. */
  function offer(g) {
    var right = ROAD_STEPS[g.step].tool, others = [], i;
    for (i = 0; i < TOOL_IDS.length; i++) if (TOOL_IDS[i] !== right) others.push(TOOL_IDS[i]);
    // A different mix each job, but the same each game: the step number turns the list.
    var picked = [right];
    for (i = 0; picked.length < 4; i++) picked.push(others[(g.step * 3 + i * 2) % others.length]);
    var turn = (g.step * 5 + 1) % 4;
    g.options = picked.slice(turn).concat(picked.slice(0, turn));
    g.choice = 0; g.wrong = {}; g.picks = 0;
  }

  function say(g, text, colour) { g.msg = {text: text, t: 2.6, colour: colour || PAPER}; }

  function cellDone(c, id) {
    if (id === 'survey') return c.peg;
    if (id === 'clear') return !c.thing;
    if (id === 'dig') return c.hump === 0;
    if (id === 'drain') return !c.stream || c.pipe;
    if (id === 'base') return c.base >= 2;
    if (id === 'compact') return c.rolled >= 3;
    if (id === 'seal') return c.seal >= 1;
    return true;
  }
  function stepDone(g) {
    var id = ROAD_STEPS[g.step].id;
    if (id === 'lines') return g.mx >= cellX(N - 1) + CW / 2 + 40;
    if (id === 'open') return g.cars >= 0 && g.cars > 4.5;
    for (var i = 0; i < N; i++) if (!cellDone(g.cells[i], id)) return false;
    return true;
  }

  function startWork(g) {
    var id = ROAD_STEPS[g.step].id;
    g.phase = 'work';
    g.at = 0; g.x = cellX(0) - 40;
    if (id === 'seal') { g.px = X0 - 30; g.speed = 70; g.drift = 0; g.inBand = 0; g.ticks = 0; }
    if (id === 'lines') {
      g.mx = X0 - 80; g.marks = []; g.hits = 0;
      for (var i = 0; i < N * 2; i++) g.marks.push({x: X0 + 30 + i * CW / 2, painted: false});
    }
    if (id === 'open') { g.ribbon = false; g.cars = -1; }
  }

  /** Stars for a finished job: three for the right machine first time, less for wrong guesses and rough work. */
  function finishStep(g) {
    var id = ROAD_STEPS[g.step].id, s = 3 - g.picks;
    if (id === 'seal') s = Math.min(s, g.ticks ? 1 + Math.round(2 * g.inBand / g.ticks) : 3);
    if (id === 'lines') s = Math.min(s, 1 + Math.round(2 * g.hits / g.marks.length));
    s = Math.max(1, Math.min(3, s));
    if (id === 'open') s = 3;
    g.stars[g.step] = s;
    g.phase = 'done'; g.doneT = 0;
    sfx('win');
  }

  function nextStep(g) {
    if (g.step >= ROAD_STEPS.length - 1) {
      g.phase = 'finish'; g.done = true;
      g.total = 0;
      for (var i = 0; i < g.stars.length; i++) g.total += g.stars[i] || 0;
      var sv = load();
      sv.roads = (sv.roads || 0) + 1;
      if (g.total > (sv.roadBest || 0)) sv.roadBest = g.total;
      save(sv);
      return;
    }
    g.step++;
    if (ROAD_STEPS[g.step].tool) { g.phase = 'pick'; offer(g); } else startWork(g);
  }

  function fx(g, x, y, colour, n, up) {
    for (var i = 0; i < n; i++) {
      g.fx.push({x: x, y: y, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * (up || 220), life: 0.6 + Math.random() * 0.5, t: 0, c: colour, s: 3 + Math.random() * 5});
    }
  }

  /** OK at the machine's spot: the job's one action. */
  function act(g) {
    var id = ROAD_STEPS[g.step].id, c = g.cells[g.at], cx = cellX(g.at);
    // A quick press while it's still driving counts: it gets there.
    g.x = cx;
    if (id === 'survey') {
      if (c.peg) { say(g, L(ALREADY)); return; }
      c.peg = true; sfx('place'); fx(g, cx, FRONT - 70, HIVIS, 6, 120);
    } else if (id === 'clear') {
      if (!c.thing) { say(g, L(ALREADY)); return; }
      c.hp--; g.arm = 0.35; sfx(c.thing === 'rock' ? 'crunch' : 'smash');
      fx(g, cx + 70, FRONT - 60, c.thing === 'rock' ? '#9A948A' : '#5DAA4F', 10);
      if (c.hp <= 0) { c.thing = null; sfx('pop'); }
    } else if (id === 'dig') {
      if (!c.hump) { say(g, L(ALREADY)); return; }
      c.hump--; g.arm = 0.5; g.truck++; sfx('slam'); fx(g, cx + 140, FRONT - 70, '#8A5A35', 12);
      if (g.truck >= 4) { g.truck = 0; g.truckGo = 1.6; say(g, L(TRUCK_FULL)); sfx('boost'); }
    } else if (id === 'drain') {
      if (!c.stream) { say(g, L(NO_STREAM), EMBER); sfx('bonk'); return; }
      if (c.pipe) { say(g, L(ALREADY)); return; }
      c.pipe = true; g.arm = 0.6; sfx('land'); fx(g, cx, FRONT - 40, '#6EC6FF', 14);
    } else if (id === 'base') {
      if (c.base >= 2) { say(g, L(ALREADY)); return; }
      c.base++; g.arm = 0.7; sfx('crunch'); fx(g, cx - 80, FRONT - 50, '#A9A49A', 16);
    } else if (id === 'compact') {
      if (c.rolled >= 3) { say(g, L(ALREADY)); return; }
      c.rolled++; g.arm = 0.4; sfx('land'); g.shake = 0.25;
    } else if (id === 'lines') {
      for (var i = 0; i < g.marks.length; i++) {
        var m = g.marks[i];
        if (!m.painted && Math.abs(sprayX(g) - m.x) < 30) { m.painted = true; g.hits++; sfx('point'); fx(g, m.x, (BACK + FRONT) / 2, PAPER, 6, 80); return; }
      }
      sfx('bonk');
    } else if (id === 'open') {
      if (g.ribbon) return;
      g.ribbon = true; g.cars = 0; sfx('win'); fx(g, 650, BACK + 60, CORAL, 30, 400); fx(g, 650, BACK + 60, EMBER, 30, 400); fx(g, 650, BACK + 60, LILAC, 30, 400);
    }
    if (stepDone(g)) finishStep(g);
  }

  function roadKey(g, k) {
    if (g.phase === 'pick') {
      if (k === LEFT || k === RIGHT) { g.choice = (g.choice + (k === LEFT ? 3 : 1)) % 4; sfx('hop'); }
      else if (k === OK) {
        var tool = g.options[g.choice];
        if (tool === ROAD_STEPS[g.step].tool) { say(g, L(YES) + ' ' + L(ROAD_STEPS[g.step].why), EMBER); g.msg.t = 5; sfx('six'); startWork(g); }
        else if (!g.wrong[tool]) { g.wrong[tool] = true; g.picks++; say(g, L(TOOLS[tool].does) + ' ' + L(NOT_THIS), EMBER); g.msg.t = 4; sfx('bonk'); }
      }
      return;
    }
    if (g.phase === 'done') { if (k === OK && g.doneT > 0.4) nextStep(g); return; }
    if (g.phase === 'finish') return;
    var id = ROAD_STEPS[g.step].id;
    if (id === 'seal') {
      if (k === UP) { g.speed = Math.min(200, g.speed + 18); sfx('hop'); }
      else if (k === DOWN) { g.speed = Math.max(10, g.speed - 18); sfx('hop'); }
      return;
    }
    if (id === 'lines' || id === 'open') { if (k === OK) act(g); return; }
    if (k === LEFT && g.at > 0) { g.at--; sfx('hop'); }
    else if (k === RIGHT && g.at < N - 1) { g.at++; sfx('hop'); }
    else if (k === OK) act(g);
  }

  var BAND = [55, 105];
  /** Where the line marker's sprayer is: at the back of the truck. */
  function sprayX(g) { return g.mx - 66 * MS; }
  function roadStep(g, dt) {
    g.t += dt;
    if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
    if (g.arm > 0) g.arm = Math.max(0, g.arm - dt);
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
    if (g.truckGo > 0) g.truckGo = Math.max(0, g.truckGo - dt);
    for (var i = g.fx.length - 1; i >= 0; i--) {
      var p = g.fx[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      if (p.t > p.life) g.fx.splice(i, 1);
    }
    if (g.phase === 'done') { g.doneT += dt; return; }
    if (g.phase !== 'work') return;
    var id = ROAD_STEPS[g.step].id;
    // The machine drives to its spot, a little at a time.
    var tx = cellX(g.at), d = tx - g.x;
    g.moving = Math.abs(d) > 2;
    g.x += Math.max(-dt * 420, Math.min(dt * 420, d));
    if (id === 'seal') {
      // The paver creeps along on its own; its speed drifts, and ▲ ▼ keep it steady.
      g.drift += (Math.random() - 0.5) * 60 * dt;
      g.drift = Math.max(-25, Math.min(25, g.drift));
      g.speed = Math.max(10, Math.min(200, g.speed + g.drift * dt));
      g.px += g.speed * dt;
      g.ticks++;
      var good = g.speed >= BAND[0] && g.speed <= BAND[1];
      if (good) g.inBand++;
      var ci = Math.floor((g.px - X0 - 60) / CW);
      if (ci >= 0 && ci < N && !g.cells[ci].seal) {
        g.cells[ci].seal = 1; g.cells[ci].sealQ = good ? 0 : g.speed > BAND[1] ? 1 : -1;
        if (!g.msg || g.msg.t < 1.5) say(g, L(good ? NICE : g.speed > BAND[1] ? TOO_FAST : TOO_SLOW), good ? '#5CC4AE' : EMBER);
      }
      if (g.px > X0 + CW * N + 70) { for (var s = 0; s < N; s++) g.cells[s].seal = 1; finishStep(g); }
    } else if (id === 'lines') {
      g.mx += 150 * dt;
      if (stepDone(g)) {
        // Missed marks get a touch-up so the road is safe; the stars remember.
        for (var m = 0; m < g.marks.length; m++) g.marks[m].painted = true;
        finishStep(g);
      }
    } else if (id === 'open' && g.cars >= 0) {
      g.cars += dt;
      if (stepDone(g)) finishStep(g);
    }
  }

  // MARK: - Drawing helpers

  var c = null;
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function box(x, y, w, h, r, fill) { c.fillStyle = fill; rr(x, y, w, h, r); c.fill(); }
  function disc(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function poly(pts, fill) {
    c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fill();
  }
  function line(x1, y1, x2, y2, w, colour) { c.strokeStyle = colour; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function text(s, x, y, size, fill, align, weight) {
    c.font = (weight || '600') + ' ' + size + 'px Sora, Inter, Arial, sans-serif';
    c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillStyle = fill;
    c.fillText(s, x, y);
  }
  /** Words wrapped to a width, centred on x; returns the lines' height. */
  function wrap(s, x, y, maxW, size, fill, weight, align) {
    c.font = (weight || '600') + ' ' + size + 'px Sora, Inter, Arial, sans-serif';
    var words = s.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var tryLine = cur ? cur + ' ' + words[i] : words[i];
      if (c.measureText(tryLine).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = tryLine;
    }
    if (cur) lines.push(cur);
    for (var j = 0; j < lines.length; j++) text(lines[j], x, y + j * size * 1.3, size, fill, align || 'center', weight);
    return lines.length * size * 1.3;
  }
  function starShape(x, y, r, fill) {
    c.fillStyle = fill; c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    c.closePath(); c.fill();
  }
  function dots(x, y) {
    var cols = [MOSS, EMBER, CORAL, BLUE];
    for (var i = 0; i < 4; i++) disc(x + i * 22, y, 7, cols[i]);
  }

  // MARK: - The machines, side on, facing right, standing on (0, 0)

  function wheel(x, y, r) { disc(x, y, r, '#26252B'); disc(x, y, r * 0.5, '#8C8A94'); }
  function trackRun(x0, x1, y, h) {
    box(x0 - h / 2, y - h, x1 - x0 + h, h, h / 2, '#26252B');
    for (var x = x0; x <= x1; x += (x1 - x0) / 3) disc(x, y - h / 2, h * 0.32, '#6B6974');
  }
  function cab(x, y, w, h) {
    box(x, y, w, h, 6, HIVIS);
    box(x + 6, y + 6, w - 12, h * 0.5, 4, '#BFE3F5');
  }

  /** One machine: id from TOOLS, arm 0 to 1 for its job's movement. */
  function machine(id, arm, t) {
    if (id === 'surveyor') {
      // A surveyor in a hi-vis vest beside a tripod.
      line(18, 0, 30, -60, 4, '#3A3A40'); line(42, 0, 30, -60, 4, '#3A3A40'); line(30, 0, 30, -60, 4, '#3A3A40');
      box(20, -76, 22, 16, 4, EMBER); disc(46, -68, 4, '#26252B');
      box(-14, -54, 24, 40, 8, HIVIS); line(-8, -14, -8, 0, 7, '#2C3E66'); line(4, -14, 4, 0, 7, '#2C3E66');
      disc(-2, -64, 11, '#E0B08A'); box(-14, -78, 24, 10, 5, PAPER);
      line(8, -46, 22, -60, 5, HIVIS);
    } else if (id === 'dozer') {
      trackRun(-40, 30, 0, 22);
      box(-46, -60, 70, 40, 6, HIVIS);
      cab(-40, -98, 44, 40);
      line(24, -36, 46, -30, 6, '#3A3A40');
      var push = arm > 0 ? Math.sin(arm / 0.35 * Math.PI) * 10 : 0;
      c.fillStyle = '#4A4A52'; c.beginPath(); c.moveTo(44 + push, -54); c.quadraticCurveTo(64 + push, -30, 48 + push, 0); c.lineTo(56 + push, 0); c.quadraticCurveTo(74 + push, -30, 52 + push, -56); c.closePath(); c.fill();
    } else if (id === 'digger') {
      trackRun(-44, 30, 0, 22);
      box(-50, -58, 80, 36, 8, HIVIS);
      cab(4, -98, 38, 42);
      box(-54, -50, 18, 26, 4, '#3A3A40');
      var a = arm > 0 ? Math.sin(arm / 0.5 * Math.PI) : 0;
      var bx = 30, by = -70, ex = 88, ey = -110 + a * 40, tx2 = 110, ty = -40 + a * 34;
      line(bx, by, ex, ey, 12, HIVIS); line(ex, ey, tx2, ty, 9, HIVIS);
      poly([tx2 - 6, ty - 8, tx2 + 22, ty, tx2 + 12, ty + 20, tx2 - 8, ty + 12], '#4A4A52');
    } else if (id === 'pipes') {
      wheel(-36, -14, 14); wheel(36, -14, 14);
      box(-60, -40, 92, 20, 4, '#4A4A52');
      cab(34, -78, 40, 56);
      line(-30, -40, 20 + 0, -110, 8, HIVIS);
      var sw = arm > 0 ? arm / 0.6 : 0;
      line(20, -110, 30, -70 + sw * 40, 2, '#26252B');
      disc(30, -54 + sw * 40, 16, '#B5B1A8'); disc(30, -54 + sw * 40, 9, '#6E6A62');
    } else if (id === 'tipper') {
      wheel(-46, -14, 15); wheel(-14, -14, 15); wheel(40, -14, 15);
      box(-70, -40, 140, 18, 4, '#4A4A52');
      cab(36, -84, 40, 58);
      var tip = arm > 0 ? Math.sin(arm / 0.7 * Math.PI) * 0.6 : 0;
      c.save(); c.translate(-70, -40); c.rotate(-tip);
      box(0, -46, 100, 46, 6, CORAL);
      if (tip > 0.2) box(-10, -40, 14, 30, 4, '#A9A49A');
      c.restore();
    } else if (id === 'roller') {
      disc(46, -30, 30, '#5B6270'); disc(46, -30, 22, '#7A828F');
      wheel(-40, -18, 18);
      box(-62, -60, 92, 34, 8, HIVIS);
      cab(-44, -104, 46, 46);
      line(30, -50, 46, -30, 6, '#3A3A40');
    } else if (id === 'paver') {
      trackRun(-46, 20, 0, 18);
      box(-60, -54, 96, 34, 6, HIVIS);
      // The hopper of asphalt at the front, the screed behind.
      poly([30, -54, 76, -70, 70, -20, 30, -20], '#4A4A52'); poly([34, -56, 72, -68, 70, -60, 36, -50], '#26252B');
      box(-78, -22, 26, 16, 3, '#4A4A52');
      box(-30, -92, 30, 38, 6, '#3A3A40'); disc(-15, -102, 10, '#E0B08A'); box(-26, -112, 22, 9, 4, HIVIS);
    } else if (id === 'marker') {
      wheel(-30, -14, 14); wheel(32, -14, 14);
      box(-56, -46, 80, 30, 6, PAPER); box(-50, -40, 30, 18, 3, '#D7D3CB');
      cab(22, -78, 40, 60);
      line(-58, -16, -66, -4, 5, '#26252B');
      if (arm > 0) { c.globalAlpha = arm / 0.3; disc(-66, 0, 8, PAPER); c.globalAlpha = 1; }
    }
  }

  /** A little car for opening day, any colour. */
  function car(x, y, colour) {
    wheel(x - 22, y - 10, 10); wheel(x + 22, y - 10, 10);
    box(x - 40, y - 36, 80, 24, 8, colour);
    box(x - 22, y - 54, 44, 22, 8, colour);
    box(x - 16, y - 50, 32, 14, 4, '#BFE3F5');
  }

  // MARK: - Drawing the road

  function tree(x, y, s) {
    box(x - 5 * s, y - 34 * s, 10 * s, 34 * s, 3, '#7A4E2E');
    disc(x, y - 52 * s, 26 * s, '#2F7D3D'); disc(x - 16 * s, y - 40 * s, 18 * s, '#3C9A4C'); disc(x + 16 * s, y - 42 * s, 18 * s, '#3C9A4C');
  }
  function bush(x, y) { disc(x - 12, y - 12, 14, '#3C9A4C'); disc(x + 10, y - 14, 16, '#4FAE5C'); disc(x, y - 22, 14, '#5DBA66'); }
  function rock(x, y, hp) {
    var s = 0.6 + hp * 0.15;
    poly([x - 34 * s, y, x - 26 * s, y - 30 * s, x - 2 * s, y - 42 * s, x + 26 * s, y - 28 * s, x + 34 * s, y], '#8E887E');
    poly([x - 26 * s, y - 30 * s, x - 2 * s, y - 42 * s, x + 4 * s, y - 24 * s], '#A9A49A');
  }

  /** The soil under the road, with a few stones, so the cut-away reads as the ground. */
  function soilBits() {
    for (var i = 0; i < 26; i++) {
      var x = (i * 211) % W, y = FRONT + 50 + (i * 97) % (H - FRONT - 120);
      c.fillStyle = i % 3 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
      c.beginPath(); c.ellipse ? c.ellipse(x, y, 14 + i % 4 * 5, 7 + i % 3 * 2, 0, 0, TAU) : c.arc(x, y, 9, 0, TAU); c.fill();
    }
  }

  function scenery(t) {
    var sky = c.createLinearGradient(0, 0, 0, BACK);
    sky.addColorStop(0, '#6EC6FF'); sky.addColorStop(1, '#CDEBFF');
    c.fillStyle = sky; c.fillRect(0, 0, W, BACK + 2);
    // Hills, a town on the left and a farm on the right, which the road joins up.
    c.fillStyle = '#86C67A'; c.beginPath(); c.moveTo(0, BACK);
    for (var x = 0; x <= W; x += 40) c.lineTo(x, BACK - 60 - Math.sin(x / 170) * 34 - Math.sin(x / 61) * 8);
    c.lineTo(W, BACK); c.closePath(); c.fill();
    var clouds = [[180, 150], [620, 120], [1010, 170]];
    for (var i = 0; i < clouds.length; i++) {
      var cx = (clouds[i][0] + t * 8) % (W + 200) - 100, cy = clouds[i][1];
      disc(cx, cy, 22, 'rgba(255,255,255,0.9)'); disc(cx + 26, cy - 10, 28, 'rgba(255,255,255,0.9)'); disc(cx + 56, cy, 20, 'rgba(255,255,255,0.9)');
    }
    // Houses on the left, a barn on the right.
    for (var h = 0; h < 3; h++) {
      var hx = 26 + h * 36, hy = BACK - 34 + h * 6;
      box(hx, hy, 30, 24, 2, ['#F7F6F2', '#F2C98E', '#BFE3F5'][h]);
      poly([hx - 4, hy, hx + 15, hy - 16, hx + 34, hy], [CORAL, VIOLET, MOSS][h]);
    }
    box(1170, BACK - 46, 60, 40, 2, '#B23A2A'); poly([1164, BACK - 46, 1200, BACK - 72, 1236, BACK - 46], '#8C2B20');
    box(1192, BACK - 30, 16, 24, 2, PAPER);
  }


  function drawRoad(g) {
    var t = g.t, i, cl, x0, top, front, id = ROAD_STEPS[g.step].id;
    scenery(t);
    // The grass either side, and the old gravel road at each end.
    c.fillStyle = '#5DAA4F'; c.fillRect(0, BACK, W, FRONT - BACK);
    box(0, BACK + 8, X0, FRONT - BACK - 16, 0, '#9A948A');
    box(X0 + CW * N, BACK + 8, W - X0 - CW * N, FRONT - BACK - 16, 0, '#9A948A');
    // The cut-away in front: soil under everything, so the layers show.
    var soil = c.createLinearGradient(0, FRONT, 0, H);
    soil.addColorStop(0, '#8A5A35'); soil.addColorStop(1, '#3A2416');
    c.fillStyle = soil; c.fillRect(0, FRONT, W, H - FRONT);
    soilBits();
    for (i = 0; i < N; i++) {
      cl = g.cells[i]; x0 = X0 + CW * i;
      top = BACK + 8; front = FRONT;
      // The top of this stretch: grass, dirt, gravel, rolled gravel or asphalt.
      var grass = g.step === 0 || (g.step === 1 && (cl.thing || g.phase === 'pick'));
      var surface = cl.seal ? (cl.sealQ ? '#3B3A44' : '#2B2A33') : cl.base ? (cl.rolled >= 3 ? '#8F8A80' : '#A9A49A') : grass ? '#5DAA4F' : '#9C6B43';
      c.fillStyle = surface; c.fillRect(x0, top, CW + 1, FRONT - 8 - (BACK + 8) + 0);
      if (cl.base && !cl.seal && cl.rolled < 3) {
        c.fillStyle = 'rgba(255,255,255,0.18)';
        for (var d = 0; d < 14; d++) c.fillRect(x0 + (d * 37) % CW, top + 6 + (d * 23) % 54, 4, 3);
      }
      if (cl.seal && cl.sealQ === -1) { for (var k = 0; k < 4; k++) disc(x0 + 20 + k * 28, top + 30 + (k % 2) * 14, 7, '#4A4954'); }
      if (cl.seal && cl.sealQ === 1) { c.fillStyle = 'rgba(169,164,154,0.6)'; for (var k2 = 0; k2 < 5; k2++) c.fillRect(x0 + 10 + k2 * 24, top + 12 + (k2 % 3) * 16, 12, 5); }
      // The front face, cut away: the layers of this stretch, from the top down.
      var ly = FRONT - 8;
      c.fillStyle = '#6F4529'; c.fillRect(x0, ly, CW + 1, 8);
      if (cl.seal) { c.fillStyle = '#26252B'; c.fillRect(x0, ly, CW + 1, 14); ly += 14; }
      if (cl.base) {
        c.fillStyle = cl.rolled >= 3 ? '#8F8A80' : '#A9A49A'; c.fillRect(x0, ly, CW + 1, cl.base * 18);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        for (var b = 0; b < 12; b++) c.fillRect(x0 + (b * 41) % CW, ly + 4 + (b * 13) % (cl.base * 18 - 6), cl.rolled >= 3 ? 3 : 5, cl.rolled >= 3 ? 2 : 4);
        for (var b2 = 1; b2 < cl.base; b2++) c.fillRect(x0, ly + b2 * 18, CW + 1, 1);
      }
      // A stream across: a channel of water, or a pipe with water running through it.
      if (cl.stream) {
        var sx = x0 + CW / 2, py2 = FRONT + 76;
        if (!cl.pipe) {
          c.fillStyle = '#3E9BD6'; c.beginPath(); c.moveTo(sx - 34, BACK - 2);
          for (var sy = BACK; sy <= FRONT; sy += 20) c.lineTo(sx - 30 + Math.sin(sy / 17) * 6, sy);
          c.lineTo(sx + 30, FRONT); for (sy = FRONT; sy >= BACK; sy -= 20) c.lineTo(sx + 30 + Math.sin(sy / 19) * 6, sy);
          c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.45)';
          for (var wv = 0; wv < 5; wv++) c.fillRect(sx - 16 + (wv % 3) * 12, BACK + ((t * 60 + wv * 31) % (FRONT - BACK)), 10, 3);
          c.fillStyle = '#3E9BD6'; c.beginPath(); c.moveTo(sx - 34, FRONT - 8); c.quadraticCurveTo(sx, FRONT + 80, sx + 34, FRONT - 8); c.closePath(); c.fill();
        } else {
          disc(sx, py2, 28, '#B5B1A8'); disc(sx, py2, 20, '#3E9BD6');
          c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(sx - 8 + Math.sin(t * 4) * 6, py2 - 2, 10, 3);
          if (!cl.base) box(sx - 26, BACK + 6, 52, FRONT - BACK - 20, 14, '#B5B1A8');
        }
      }
      // A hump still to dig.
      if (cl.hump && !cl.thing) {
        c.fillStyle = '#9C6B43'; c.beginPath(); c.moveTo(x0 + 8, FRONT - 6);
        c.quadraticCurveTo(x0 + CW / 2, FRONT - 6 - cl.hump * 44, x0 + CW - 8, FRONT - 6); c.closePath(); c.fill();
        c.fillStyle = '#B37E52'; c.beginPath(); c.moveTo(x0 + 20, FRONT - 10);
        c.quadraticCurveTo(x0 + CW / 2, FRONT - 6 - cl.hump * 38, x0 + CW - 30, FRONT - 14); c.closePath(); c.fill();
      }
    }
    // What the layers are called, by the cut-away.
    var lx = X0 - 14, ly2 = FRONT - 1, any = function (f) { for (var q = 0; q < N; q++) if (f(g.cells[q])) return true; return false; };
    if (any(function (q) { return q.seal; })) { text(L(ASPHALT), lx, ly2 + 6, 15, PAPER, 'right', '700'); ly2 += 14; }
    if (any(function (q) { return q.base; })) text(L(GRAVEL), lx, ly2 + 18, 15, PAPER, 'right', '700');
    text(L(SOIL), lx, FRONT + 130, 15, 'rgba(247,246,242,0.7)', 'right', '700');
    if (any(function (q) { return q.pipe; })) text(L(PIPE), lx, FRONT + 76, 15, '#BFE3F5', 'right', '700');
    // The lines: white dashes down the middle (painted, or the marks still to paint).
    var midY = (BACK + FRONT) / 2 - 10;
    if (id === 'lines' || g.step > 7) {
      for (i = 0; i < g.marks.length; i++) {
        var m = g.marks[i];
        if (m.painted) box(m.x - 18, midY - 3, 36, 6, 3, PAPER);
        else { c.strokeStyle = 'rgba(247,246,242,0.45)'; c.lineWidth = 2; c.setLineDash([4, 4]); rr(m.x - 18, midY - 3, 36, 6, 3); c.stroke(); c.setLineDash([]); }
      }
      if (g.step > 7) {
        c.fillStyle = PAPER; c.fillRect(X0, BACK + 22, CW * N, 4); c.fillRect(X0, FRONT - 38, CW * N, 4);
      }
    }
    // Things standing on the land, and the pegs.
    for (i = 0; i < N; i++) {
      cl = g.cells[i]; var tx = cellX(i);
      var py = BACK + 40;
      if (cl.peg && !cl.base) { box(tx - 4, py - 34, 8, 40, 2, '#D9A36A'); box(tx - 7, py - 38, 14, 12, 3, CORAL); }
      if (g.step === 0 && !cl.peg) { c.globalAlpha = 0.45 + Math.sin(t * 5) * 0.3; disc(tx, py, 12, PAPER); c.globalAlpha = 1; }
      var ty = BACK + 100;
      c.save(); c.translate(tx + 34, ty); c.scale(1.4, 1.4);
      if (cl.thing === 'tree') tree(0, 0, cl.hp >= 2 ? 1 : 0.8);
      else if (cl.thing === 'bush') bush(0, 0);
      else if (cl.thing === 'rock') rock(0, 0, cl.hp);
      c.restore();
    }
    // The ribbon on opening day.
    if (id === 'open' && !g.ribbon) {
      line(600, BACK + 10, 600, FRONT - 10, 7, '#7A4E2E'); line(700, BACK + 10, 700, FRONT - 10, 7, '#7A4E2E');
      line(600, BACK + 60, 700, BACK + 60, 9, CORAL);
      c.fillStyle = CORAL; c.beginPath(); c.arc(650, BACK + 60, 16, 0, TAU); c.fill();
    }
  }

  function drawMachines(g) {
    var st = ROAD_STEPS[g.step], id = st.id, i;
    var groundY = FRONT - 30;
    if (g.phase === 'work' || g.phase === 'done') {
      // The machine works just behind its spot, so its blade, bucket or tray reaches what is there.
      var mid = st.tool, x = g.x - (id === 'survey' ? 30 : id === 'clear' ? 76 : 40);
      if (id === 'seal') x = g.px;
      if (id === 'lines') x = g.mx;
      var bob = g.moving ? Math.sin(g.t * 30) * 1.5 : 0;
      if (mid) {
        c.save(); c.translate(x, groundY + bob + (g.shake ? Math.sin(g.t * 80) * 2 : 0)); c.scale(MS, MS);
        machine(mid, g.arm, g.t); c.restore();
      }
      // The digger's truck, waiting beside it, filling up and driving off when full.
      if (id === 'dig') {
        var tx = g.truckGo > 0 ? cellX(g.at) - 200 - (1.6 - g.truckGo) * 900 : cellX(g.at) - 200;
        c.save(); c.translate(tx, groundY); c.scale(1.2, 1.2); machine('tipper', 0, g.t);
        for (i = 0; i < (g.truckGo > 0 ? 4 : g.truck); i++) disc(-56 + i * 24, -88, 15, '#9C6B43');
        c.restore();
      }
      if (id === 'lines') {
        // Where the sprayer is, so OK lands on the mark.
        c.globalAlpha = 0.6; line(sprayX(g), BACK + 4, sprayX(g), FRONT - 20, 3, PAPER); c.globalAlpha = 1;
      }
      if (id === 'open' && g.cars >= 0) {
        var cols = [CORAL, BLUE, VIOLET, MOSS];
        for (i = 0; i < 4; i++) {
          var cx = -100 + (g.cars - i * 0.7) * 380;
          if (cx > -100 && cx < W + 100) { c.save(); c.translate(cx, groundY - 40 - (i % 2) * 40); c.scale(1.3, 1.3); car(0, 0, cols[i]); c.restore(); }
        }
      }
    }
    // Sparks, dust and gravel.
    for (i = 0; i < g.fx.length; i++) {
      var p = g.fx[i]; c.globalAlpha = Math.max(0, 1 - p.t / p.life);
      c.fillStyle = p.c; c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    c.globalAlpha = 1;
  }

  /** The job list along the top: done jobs ticked, this one lit. */
  function drawList(g) {
    box(14, 12, W - 28, 74, 20, 'rgba(13,12,24,0.78)');
    text(L(JOB_LIST), 34, 32, 15, 'rgba(247,246,242,0.6)', 'left', '700');
    var n = ROAD_STEPS.length, cw = (W - 60) / n;
    for (var i = 0; i < n; i++) {
      var x = 30 + i * cw, on = i === g.step && !g.done, done = i < g.step || g.done || (i === g.step && g.phase === 'done');
      box(x, 44, cw - 8, 34, 17, on ? VIOLET : done ? 'rgba(47,125,109,0.85)' : 'rgba(247,246,242,0.1)');
      if (on) { c.strokeStyle = LILAC; c.lineWidth = 2; rr(x, 44, cw - 8, 34, 17); c.stroke(); }
      var label = (done ? '✓ ' : (i + 1) + '. ') + L(ROAD_STEPS[i].title);
      c.font = '700 13px Sora, Inter, Arial, sans-serif';
      while (c.measureText(label).width > cw - 18 && label.length > 4) label = label.slice(0, -2) + '…';
      text(label, x + (cw - 8) / 2, 61, 13, done || on ? PAPER : 'rgba(247,246,242,0.6)', 'center', '700');
    }
  }

  function drawHint(s) {
    c.font = '700 22px Sora, Inter, Arial, sans-serif';
    var tw = c.measureText(s).width + 52;
    box(W / 2 - tw / 2, H - 58, tw, 44, 22, 'rgba(110,61,219,0.9)');
    text(s, W / 2, H - 36, 22, PAPER, 'center', '700');
  }

  function drawMsg(g) {
    if (!g.msg) return;
    c.globalAlpha = Math.min(1, g.msg.t / 0.4);
    c.font = '700 22px Sora, Inter, Arial, sans-serif';
    var w = Math.min(980, c.measureText(g.msg.text).width + 60);
    var lines = Math.ceil((c.measureText(g.msg.text).width + 60) / 980);
    var h = 30 + lines * 29, y = g.phase === 'pick' && g.job !== 'town' || g.phase === 'levels' || g.phase === 'brief' ? 540 : 100;
    box(W / 2 - w / 2, y, w, h, 22, 'rgba(13,12,24,0.86)');
    wrap(g.msg.text, W / 2, y + 15 + 14, w - 48, 22, g.msg.colour, '700');
    c.globalAlpha = 1;
  }

  /** Which machine? Four cards, the chosen one lifted, a wrong one greyed with a cross. */
  function drawPick(g) {
    c.fillStyle = 'rgba(13,12,24,0.72)'; c.fillRect(0, 0, W, H);
    var st = ROAD_STEPS[g.step];
    text((g.step + 1) + '. ' + L(st.title), W / 2, 150, 40, PAPER, 'center', '800');
    text(L(WHICH), W / 2, 196, 24, LILAC, 'center', '700');
    var cw = 240, gap = 26, x0 = (W - (cw * 4 + gap * 3)) / 2;
    for (var i = 0; i < 4; i++) {
      var id = g.options[i], here = i === g.choice, x = x0 + i * (cw + gap), y = 236, wrong = g.wrong[id];
      c.save();
      if (here) { c.translate(x + cw / 2, y + 140); c.scale(1.06, 1.06); c.translate(-(x + cw / 2), -(y + 140)); }
      if (here) box(x - 6, y - 6, cw + 12, 292, 30, 'rgba(158,123,255,0.6)');
      box(x, y, cw, 280, 26, here ? '#241E4A' : '#1A1733');
      box(x + 14, y + 14, cw - 28, 180, 18, wrong ? '#3A3746' : '#BDE3F5');
      if (!wrong) { c.fillStyle = '#7CC36E'; c.fillRect(x + 14, y + 160, cw - 28, 34); }
      c.save(); c.translate(x + cw / 2 + (id === 'surveyor' ? 0 : -6), y + 170); c.scale(1.2, 1.2);
      if (wrong) c.globalAlpha = 0.35;
      machine(id, here && !wrong ? (g.t % 1.4 < 0.6 ? g.t % 1.4 : 0) : 0, g.t);
      c.restore(); c.globalAlpha = 1;
      text(L(TOOLS[id].name), x + cw / 2, y + 234, 23, wrong ? 'rgba(247,246,242,0.4)' : PAPER, 'center', '800');
      if (wrong) { line(x + 40, y + 40, x + cw - 40, y + 170, 8, CORAL); line(x + cw - 40, y + 40, x + 40, y + 170, 8, CORAL); }
      c.restore();
    }
    drawHint(L(PICK_HELP));
  }

  function drawDone(g) {
    c.fillStyle = 'rgba(13,12,24,0.55)'; c.fillRect(0, 0, W, H);
    box(W / 2 - 330, 200, 660, 290, 32, 'rgba(13,12,24,0.92)');
    text(L(JOB_DONE), W / 2, 252, 40, EMBER, 'center', '800');
    text(L(ROAD_STEPS[g.step].title), W / 2, 302, 26, PAPER, 'center', '700');
    var s = g.stars[g.step] || 0;
    for (var i = 0; i < 3; i++) starShape(W / 2 - 80 + i * 80, 380, 32, i < s ? EMBER : 'rgba(247,246,242,0.15)');
    text(L(NEXT), W / 2, 458, 22, LILAC, 'center', '700');
  }

  function drawFinish(g) {
    c.fillStyle = 'rgba(13,12,24,0.6)'; c.fillRect(0, 0, W, H);
    box(W / 2 - 380, 150, 760, 400, 34, 'rgba(13,12,24,0.94)');
    dots(W / 2 - 33, 196);
    text(L(ROAD_DONE), W / 2, 252, 46, PAPER, 'center', '800');
    var max = ROAD_STEPS.length * 3;
    starShape(W / 2 - 70, 336, 40, EMBER);
    text(g.total + ' / ' + max, W / 2 - 16, 338, 40, PAPER, 'left', '800');
    text(L(STARS), W / 2, 394, 22, 'rgba(247,246,242,0.6)', 'center', '700');
    var sv = load();
    text(L(BEST) + ' ' + (sv.roadBest || g.total), W / 2, 434, 20, 'rgba(247,246,242,0.55)', 'center', '600');
    text(L(AGAIN), W / 2, 506, 22, LILAC, 'center', '700');
  }

  function renderRoad(g) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawRoad(g);
    drawMachines(g);
    drawList(g);
    if (g.phase === 'pick') drawPick(g);
    else if (g.phase === 'work') {
      var id = ROAD_STEPS[g.step].id;
      if (id === 'seal') drawGauge(g);
      drawHint(L(ROAD_STEPS[g.step].hint));
    } else if (g.phase === 'done') drawDone(g);
    else if (g.phase === 'finish') drawFinish(g);
    if (g.phase !== 'finish') drawMsg(g);
  }

  /** The paver's speed: a dial with a green band in the middle. */
  function drawGauge(g) {
    var x = W - 300, y = 560;
    box(x - 20, y - 50, 300, 100, 22, 'rgba(13,12,24,0.8)');
    box(x, y - 8, 260, 16, 8, 'rgba(247,246,242,0.15)');
    box(x + BAND[0] / 200 * 260, y - 8, (BAND[1] - BAND[0]) / 200 * 260, 16, 8, '#5CC4AE');
    var nx = x + Math.min(1, g.speed / 200) * 260;
    poly([nx, y + 12, nx - 10, y + 30, nx + 10, y + 30], PAPER);
    text(L(TOOLS.paver.name), x + 130, y - 30, 17, 'rgba(247,246,242,0.7)', 'center', '700');
  }

  // MARK: - The pause screen

  function drawPause(at) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(13,12,24,0.9)'; c.fillRect(0, 0, W, H);
    dots(W / 2 - 33, 120);
    text(L(PAUSED), W / 2, 180, 60, PAPER, 'center', '800');
    for (var i = 0; i < MENU.length; i++) {
      var on = i === at, y = 250 + i * 80;
      box(W / 2 - 240, y, 480, 64, 32, on ? VIOLET : 'rgba(247,246,242,0.1)');
      if (on) { c.strokeStyle = LILAC; c.lineWidth = 3; rr(W / 2 - 240, y, 480, 64, 32); c.stroke(); }
      text(L(MENU[i]), W / 2, y + 33, 27, PAPER, 'center', on ? '800' : '600');
    }
    text(L(PAUSE_HELP), W / 2, 660, 22, LILAC, 'center', '700');
  }

  // MARK: - Build a bridge: the words

  var BRIDGE_TITLE = ['Construir uma ponte', 'Build a bridge', 'Construir un puente', 'Eine Brücke bauen', 'Построить мост'];
  var SHAPES = [
    {id: 'beam', name: ['Viga', 'Beam', 'Viga', 'Balken', 'Балка'],
      fact: ['Uma viga é a ponte mais simples: uma tábua forte sobre o vão. Ótima para vãos curtos.', 'A beam is the simplest bridge: a strong plank across the gap. Great for short gaps.', 'Una viga es el puente más sencillo: una tabla fuerte sobre el hueco. Ideal para huecos cortos.', 'Ein Balken ist die einfachste Brücke: ein starkes Brett über die Lücke. Super für kurze Lücken.', 'Балка: самый простой мост, крепкая доска через пролёт. Хороша для коротких пролётов.']},
    {id: 'piers', name: ['Viga com pilares', 'Beam on legs', 'Viga con pilares', 'Balken mit Pfeilern', 'Балка на опорах'],
      fact: ['Pilares no meio deixam cada pedaço curto, então uma viga atravessa um rio mais largo.', 'Legs in the middle make each piece short, so a beam can cross a wider river.', 'Los pilares del medio dejan cada tramo corto, así una viga cruza un río más ancho.', 'Pfeiler in der Mitte machen jedes Stück kurz, so schafft ein Balken einen breiteren Fluss.', 'Опоры посередине делают каждый пролёт коротким, и балка перекрывает реку пошире.']},
    {id: 'arch', name: ['Arco', 'Arch', 'Arco', 'Bogen', 'Арка'],
      fact: ['Um arco empurra o peso para as pontas e aperta a pedra e o concreto, que adoram ser apertados.', 'An arch pushes the weight out to the ends, squashing the stone and concrete, which they are very good at.', 'Un arco empuja el peso hacia los extremos y aprieta la piedra y el hormigón, que lo aguantan muy bien.', 'Ein Bogen drückt das Gewicht zu den Enden und presst Stein und Beton zusammen, das können sie sehr gut.', 'Арка передаёт вес к краям и сжимает камень и бетон, а сжатие они держат отлично.']},
    {id: 'truss', name: ['Treliça', 'Truss', 'Celosía', 'Fachwerk', 'Ферма'],
      fact: ['Triângulos não se deformam, então a treliça é forte e leve. Os trens adoram.', 'Triangles cannot be pushed out of shape, so a truss is strong and light. Railways love them.', 'Los triángulos no se deforman, así que la celosía es fuerte y ligera. A los trenes les encantan.', 'Dreiecke lassen sich nicht verbiegen, darum ist ein Fachwerk stark und leicht. Die Bahn liebt sie.', 'Треугольники не теряют форму, поэтому ферма прочная и лёгкая. Железные дороги их обожают.']},
    {id: 'suspension', name: ['Pênsil', 'Suspension', 'Colgante', 'Hängebrücke', 'Висячий'],
      fact: ['Cabos grandes pendem de torres altas e seguram a estrada. Atravessam os vãos mais largos.', 'Big cables hang from tall towers and hold the road up. They cross the widest gaps of all.', 'Cables grandes cuelgan de torres altas y sostienen la carretera. Cruzan los huecos más anchos.', 'Dicke Seile hängen an hohen Türmen und halten die Straße. Sie schaffen die breitesten Lücken.', 'Толстые тросы висят на высоких башнях и держат дорогу. Так перекрывают самые широкие пролёты.']}
  ];
  var MATERIALS = [
    {id: 'wood', colour: '#A0693A', name: ['Madeira', 'Wood', 'Madera', 'Holz', 'Дерево']},
    {id: 'concrete', colour: '#B8B4AA', name: ['Concreto', 'Concrete', 'Hormigón', 'Beton', 'Бетон']},
    {id: 'steel', colour: '#5B6270', name: ['Aço', 'Steel', 'Acero', 'Stahl', 'Сталь']}
  ];
  /** What each shape in each material can do: [longest span in metres, heaviest load, cost]. null: it can't be built. */
  var STRENGTH = {
    beam: {wood: [8, 2, 1], concrete: [25, 3, 2], steel: [30, 3, 3]},
    piers: {wood: [8, 2, 3], concrete: [25, 3, 4], steel: [30, 3, 5]},
    arch: {wood: [20, 2, 2], concrete: [60, 4, 4], steel: [80, 4, 5]},
    truss: {wood: [30, 3, 3], concrete: null, steel: [120, 5, 5]},
    suspension: {wood: [100, 0.5, 2], concrete: null, steel: [1500, 4, 9]}
  };
  var LOADS = {people: 0.5, car: 1, truck: 3, train: 5};
  var VEHICLES = {people: ['Pessoas a pé', 'People walking', 'Gente a pie', 'Fußgänger', 'Пешеходы'], car: ['Carros', 'Cars', 'Coches', 'Autos', 'Машины'],
    truck: ['Caminhões', 'Trucks', 'Camiones', 'Laster', 'Грузовики'], train: ['Trens', 'Trains', 'Trenes', 'Züge', 'Поезда']};
  var BRIDGES = [
    {id: 'creek', span: 6, load: 'car', piers: true, budget: 2, scene: 'creek',
      name: ['O riacho da fazenda', 'The farm creek', 'El arroyo de la granja', 'Der Bach am Hof', 'Ручей на ферме']},
    {id: 'river', span: 24, load: 'truck', piers: true, budget: 4, scene: 'river',
      name: ['O rio largo', 'The wide river', 'El río ancho', 'Der breite Fluss', 'Широкая река']},
    {id: 'gorge', span: 50, load: 'truck', piers: false, why: 'deep', budget: 5, scene: 'gorge',
      name: ['O desfiladeiro fundo', 'The deep gorge', 'El desfiladero', 'Die tiefe Schlucht', 'Глубокое ущелье']},
    {id: 'rail', span: 70, load: 'train', piers: false, why: 'deep', budget: 6, scene: 'rail',
      name: ['A ferrovia', 'The railway', 'El ferrocarril', 'Die Eisenbahn', 'Железная дорога']},
    {id: 'harbour', span: 400, load: 'truck', piers: false, why: 'ships', budget: 10, scene: 'harbour',
      name: ['O porto', 'The harbour', 'El puerto', 'Der Hafen', 'Гавань']},
    {id: 'track', span: 60, load: 'people', piers: false, why: 'deep', budget: 2, scene: 'mountain',
      name: ['A trilha na montanha', 'The mountain track', 'El sendero de montaña', 'Der Bergpfad', 'Горная тропа']}
  ];
  var GAP = ['Vão', 'Gap', 'Hueco', 'Lücke', 'Пролёт'];
  var CARRIES = ['Leva', 'Carries', 'Lleva', 'Trägt', 'Везёт'];
  var MONEY = ['Dinheiro', 'Money', 'Dinero', 'Geld', 'Деньги'];
  var COST = ['Custa', 'Costs', 'Cuesta', 'Kostet', 'Стоит'];
  var SHAPE = ['Forma', 'Shape', 'Forma', 'Form', 'Форма'];
  var MATERIAL = ['Material', 'Material', 'Material', 'Material', 'Материал'];
  var TEST = ['Testar!', 'Test it!', '¡Probar!', 'Testen!', 'Испытать!'];
  var PLAN_HELP = ['▲ ▼ linha  ·  ◀ ▶ escolher  ·  OK testar  ·  Voltar pontes', '▲ ▼ row  ·  ◀ ▶ choose  ·  OK test it  ·  Back to the bridges',
    '▲ ▼ fila  ·  ◀ ▶ elegir  ·  OK probar  ·  Atrás puentes', '▲ ▼ Zeile  ·  ◀ ▶ wählen  ·  OK testen  ·  Zurück zu den Brücken', '▲ ▼ ряд  ·  ◀ ▶ выбрать  ·  OK испытать  ·  «Назад» к мостам'];
  var LEVELS_HELP = ['◀ ▶ escolher uma ponte  ·  OK construir  ·  Voltar menu', '◀ ▶ pick a bridge  ·  OK to build  ·  Back for the menu',
    '◀ ▶ elige un puente  ·  OK construir  ·  Atrás menú', '◀ ▶ Brücke wählen  ·  OK bauen  ·  Zurück zum Menü', '◀ ▶ выбрать мост  ·  OK строить  ·  «Назад» меню'];
  var LOCKED = ['Termine a anterior primeiro', 'Finish the one before first', 'Termina el anterior primero', 'Erst die davor schaffen', 'Сначала пройдите предыдущий'];
  var HELD = ['Aguentou!', 'It held!', '¡Aguantó!', 'Sie hält!', 'Выдержал!'];
  var FELL = ['Caiu!', 'It fell down!', '¡Se cayó!', 'Eingestürzt!', 'Рухнул!'];
  var CANT = ['Não dá para construir', 'Can\'t build that', 'No se puede construir', 'Geht so nicht', 'Так не построить'];
  var TOO_DEAR = ['Caro demais', 'Costs too much', 'Demasiado caro', 'Zu teuer', 'Слишком дорого'];
  var TEST_TRUCK = ['Tudo bem: era um caminhão de teste de controle remoto!', 'All good: it was a remote-control test truck!', 'Tranquilo: ¡era un camión de prueba teledirigido!', 'Alles gut: Es war ein ferngesteuerter Testlaster!', 'Всё в порядке: это был радиоуправляемый тестовый грузовик!'];
  var WHY_SPAN = ['Comprido demais para esta ponte: ela envergou no meio até quebrar. Tente uma forma mais forte, pilares no meio ou aço.', 'Too long for this bridge: it bent in the middle until it broke. Try a stronger shape, legs in the middle, or steel.',
    'Demasiado largo para este puente: se dobló en el medio hasta romperse. Prueba una forma más fuerte, pilares o acero.', 'Zu lang für diese Brücke: Sie hat sich in der Mitte gebogen, bis sie brach. Probier eine stärkere Form, Pfeiler oder Stahl.',
    'Слишком длинно для этого моста: он прогнулся посередине и сломался. Попробуйте форму прочнее, опоры или сталь.'];
  var WHY_LOAD = ['Pesado demais! Arcos e treliças de aço aguentam cargas pesadas.', 'Too heavy! This bridge cannot carry that much. Arches and steel trusses carry heavy loads.',
    '¡Demasiado peso! Este puente no aguanta tanto. Los arcos y las celosías de acero aguantan mucho peso.', 'Zu schwer! So viel trägt diese Brücke nicht. Bögen und Stahlfachwerke tragen schwere Lasten.',
    'Слишком тяжело! Этот мост столько не выдержит. Арки и стальные фермы держат большой вес.'];
  var WHY_DEEP = ['O rio aqui é fundo e rápido demais para pilares no meio. Escolha uma forma que atravesse o vão inteiro.', 'The water here is too deep and fast for legs in the middle. Pick a shape that crosses the whole gap.',
    'El agua aquí es demasiado honda y rápida para pilares en medio. Elige una forma que cruce todo el hueco.', 'Das Wasser ist hier zu tief und zu schnell für Pfeiler. Nimm eine Form, die die ganze Lücke überspannt.',
    'Здесь слишком глубоко и быстро для опор посередине. Выберите форму, которая перекроет весь пролёт.'];
  var WHY_SHIPS = ['Navios passam por aqui, então não pode haver pilares no meio.', 'Ships sail through here, so there can be no legs in the middle.', 'Por aquí pasan barcos, así que no puede haber pilares en medio.', 'Hier fahren Schiffe durch, also darf in der Mitte nichts stehen.', 'Здесь ходят корабли, поэтому опор посередине быть не может.'];
  var WHY_PULL = ['Concreto aguenta ser apertado, mas racha quando esticado. Treliças e pontes pênseis puxam suas partes: precisam de aço (ou corda).', 'Concrete is strong when squashed but cracks when stretched. Trusses and suspension bridges pull on their parts, so they need steel (or rope).',
    'El hormigón aguanta que lo aprieten pero se agrieta si lo estiran. Las celosías y los puentes colgantes tiran de sus piezas: necesitan acero (o cuerda).', 'Beton hält Druck aus, reißt aber unter Zug. Fachwerk und Hängebrücken ziehen an ihren Teilen, sie brauchen Stahl (oder Seil).',
    'Бетон держит сжатие, но трескается при растяжении. Фермы и висячие мосты тянут свои части, им нужна сталь (или канат).'];
  var WHY_DEAR = ['Aguenta! Mas custa mais do que o dinheiro que você tem. Ache uma ponte mais barata que também aguente.', 'It would hold, but it costs more money than you have. Can you find a cheaper bridge that still holds?',
    '¡Aguantaría! Pero cuesta más dinero del que tienes. ¿Encuentras un puente más barato que también aguante?', 'Sie würde halten, kostet aber mehr Geld, als du hast. Findest du eine billigere Brücke, die auch hält?',
    'Он бы выдержал, но стоит больше, чем у вас есть. Найдёте мост дешевле, который тоже выдержит?'];
  var NEXT_BRIDGE = ['OK próxima ponte', 'OK next bridge', 'OK siguiente puente', 'OK nächste Brücke', 'OK следующий мост'];
  var TRY_AGAIN = ['OK tentar de novo', 'OK try again', 'OK intentar otra vez', 'OK nochmal', 'OK ещё раз'];
  var ALL_BRIDGES = ['Todas as pontes de pé! Você é engenheiro de pontes.', 'Every bridge standing! You\'re a bridge engineer.', '¡Todos los puentes en pie! Eres ingeniero de puentes.', 'Alle Brücken stehen! Du bist Brückenbauer.', 'Все мосты стоят! Вы инженер мостов.'];

  // MARK: - Build a bridge: the rules

  function newBridge() {
    var sv = load(), stars = sv.bridgeStars || [], at = 0;
    while (at < BRIDGES.length - 1 && stars[at]) at++;
    return {job: 'bridge', phase: 'levels', level: at, shape: 0, mat: 0, row: 0, tries: 0, stars: stars.slice(),
      t: 0, tt: 0, result: null, fx: [], msg: null};
  }

  function unlocked(g, i) { return i === 0 || !!g.stars[i - 1]; }

  /**
   * What happens with this shape and material at this bridge: {ok, kind, ratio, cost}. kind: 'held', 'span', 'load'
   * (it falls in the test), 'deep' or 'ships' (no legs allowed here), 'pull' (concrete can't be stretched), 'dear'.
   */
  function judge(level, shapeId, matId) {
    var b = BRIDGES[level], s = STRENGTH[shapeId][matId];
    if (!s) return {ok: false, kind: 'pull', ratio: 0, cost: 0};
    var span = shapeId === 'piers' ? b.span / 3 : b.span, load = LOADS[b.load];
    var cost = s[2];
    if (shapeId === 'piers' && !b.piers) return {ok: false, kind: b.why || 'deep', ratio: 0, cost: cost};
    var bySpan = span / s[0], byLoad = load / s[1], ratio = Math.max(bySpan, byLoad);
    if (ratio > 1) return {ok: false, kind: bySpan >= byLoad ? 'span' : 'load', ratio: ratio, cost: cost};
    if (cost > b.budget) return {ok: false, kind: 'dear', ratio: ratio, cost: cost};
    return {ok: true, kind: 'held', ratio: ratio, cost: cost};
  }

  function costNow(g) { var s = STRENGTH[SHAPES[g.shape].id][MATERIALS[g.mat].id]; return s ? s[2] : 0; }

  function testBridge(g) {
    g.result = judge(g.level, SHAPES[g.shape].id, MATERIALS[g.mat].id);
    g.tries++;
    // Only a bridge that can be built gets driven over; the others get their answer straight away.
    if (g.result.kind === 'held' || g.result.kind === 'span' || g.result.kind === 'load') { g.phase = 'test'; g.tt = 0; g.broke = -1; sfx('six'); }
    else { g.phase = 'result'; g.tt = 0; sfx('bonk'); }
  }

  function bridgeKey(g, k) {
    if (g.phase === 'levels') {
      if (k === LEFT || k === RIGHT) { g.level = (g.level + (k === LEFT ? BRIDGES.length - 1 : 1)) % BRIDGES.length; sfx('hop'); }
      else if (k === OK) {
        if (!unlocked(g, g.level)) { say(g, L(LOCKED), EMBER); sfx('bonk'); return; }
        g.phase = 'plan'; g.row = 0; g.tries = 0; g.shape = 0; g.mat = 0; sfx('six');
      }
      return;
    }
    if (g.phase === 'plan') {
      if (k === UP) g.row = Math.max(0, g.row - 1);
      else if (k === DOWN) g.row = Math.min(2, g.row + 1);
      else if (k === LEFT || k === RIGHT) {
        var d = k === LEFT ? -1 : 1;
        if (g.row === 0) g.shape = (g.shape + d + SHAPES.length) % SHAPES.length;
        else if (g.row === 1) g.mat = (g.mat + d + MATERIALS.length) % MATERIALS.length;
      } else if (k === OK) { testBridge(g); return; }
      sfx('hop');
      return;
    }
    if (g.phase === 'result' && k === OK && g.tt > 0.4) {
      if (g.result.ok) {
        if (g.level < BRIDGES.length - 1) { g.level++; g.phase = 'plan'; g.row = 0; g.tries = 0; g.shape = 0; g.mat = 0; }
        else g.phase = 'levels';
      } else { g.phase = 'plan'; g.row = 0; }
    }
  }

  /** Back in a bridge goes up one: from the plan or the answer to the list of bridges. */
  function bridgeBack(g) {
    if (g.phase === 'plan' || g.phase === 'result') { g.phase = 'levels'; return true; }
    return false;
  }

  var TEST_TIME = 5;
  function bridgeStep(g, dt) {
    g.t += dt; g.tt += dt;
    if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
    for (var i = g.fx.length - 1; i >= 0; i--) {
      var p = g.fx[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      if (p.t > p.life) g.fx.splice(i, 1);
    }
    if (g.phase !== 'test') return;
    var r = g.result, pos = vehicleAt(g);
    // A bridge too weak breaks as the load reaches the middle.
    if (!r.ok && g.broke < 0 && pos > 0.42) { g.broke = g.tt; sfx('crash'); g.shake = 0.6; }
    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
    if (g.broke >= 0 && g.tt - g.broke > 1.1 && !g.splashed) { g.splashed = true; sfx('splash'); fx(g, 640, WATER_Y, '#BFE3F5', 30, 360); }
    if ((r.ok && g.tt > TEST_TIME) || (g.broke >= 0 && g.tt - g.broke > 2.4)) {
      g.phase = 'result'; g.tt = 0; g.splashed = false;
      if (r.ok) {
        var s = Math.max(1, 4 - g.tries);
        g.stars[g.level] = Math.max(g.stars[g.level] || 0, s);
        var sv = load(); sv.bridgeStars = g.stars; save(sv);
        sfx('win'); fx(g, 640, DECK_Y - 40, EMBER, 24, 400); fx(g, 640, DECK_Y - 40, LILAC, 24, 400);
      } else sfx('lose');
    }
  }

  /** How far across the load is, 0 to 1 (it waits a moment while the bridge goes up). */
  function vehicleAt(g) { return Math.max(0, Math.min(1.2, (g.tt - 0.8) / (TEST_TIME - 1.4))); }

  // MARK: - Build a bridge: drawing

  var BL = 250, BR = 1030, DECK_Y = 330, WATER_Y = 540;

  function bridgeScene(g) {
    var b = BRIDGES[g.level], t = g.t, sc = b.scene;
    var sky = c.createLinearGradient(0, 0, 0, H);
    var skies = {creek: ['#6EC6FF', '#CDEBFF'], river: ['#6EC6FF', '#CDEBFF'], gorge: ['#F2B880', '#FCE3C4'], rail: ['#7FB7E8', '#D7ECFA'],
      harbour: ['#4E86C6', '#BFDDF5'], mountain: ['#8FB4E0', '#E4EEF8']};
    sky.addColorStop(0, skies[sc][0]); sky.addColorStop(1, skies[sc][1]);
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // Far away: hills, mountains or a city.
    if (sc === 'mountain' || sc === 'gorge') {
      var peaks = sc === 'mountain' ? '#7A8FB0' : '#C98A5A';
      for (var p = 0; p < 6; p++) poly([p * 260 - 100, 330, p * 260 + 30, 120 + (p % 2) * 60, p * 260 + 160, 330], peaks);
      if (sc === 'mountain') for (p = 0; p < 6; p++) poly([p * 260 - 4, 156 + (p % 2) * 60, p * 260 + 30, 120 + (p % 2) * 60, p * 260 + 64, 156 + (p % 2) * 60], PAPER);
    } else if (sc === 'harbour') {
      // The city on the far shore, low on the horizon behind the bridge.
      for (var bld = 0; bld < 26; bld++) { var bh = 50 + (bld * 53) % 130; box(bld * 50 - 10, 440 - bh, 40, bh, 2, ['#8DA6C4', '#7C93B3', '#A3B7D0'][bld % 3]); }
    } else {
      c.fillStyle = '#86C67A'; c.beginPath(); c.moveTo(0, 360);
      for (var x = 0; x <= W; x += 40) c.lineTo(x, 300 - Math.sin(x / 150) * 30);
      c.lineTo(W, 360); c.closePath(); c.fill();
    }
    // The water (or the gorge floor) and the two banks.
    var deep = sc === 'gorge' || sc === 'mountain' ? 640 : sc === 'harbour' ? 440 : WATER_Y;
    c.fillStyle = sc === 'harbour' ? '#2F6FA8' : '#3E9BD6'; c.fillRect(0, deep, W, H - deep);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (var w = 0; w < 12; w++) c.fillRect((w * 137 + t * (30 + w % 3 * 10)) % W, deep + 14 + (w % 4) * 22, 26, 3);
    var bank = sc === 'gorge' ? '#B5683A' : sc === 'mountain' ? '#7D7468' : sc === 'harbour' ? '#8A8478' : '#6E9E4F';
    poly([0, DECK_Y + 8, BL, DECK_Y + 8, BL - 30, deep + 4, BL - 70, H, 0, H], bank);
    poly([W, DECK_Y + 8, BR, DECK_Y + 8, BR + 30, deep + 4, BR + 70, H, W, H], bank);
    c.fillStyle = sc === 'harbour' ? '#5B6270' : sc === 'mountain' ? '#9A948A' : '#5DAA4F';
    c.fillRect(0, DECK_Y, BL, 10); c.fillRect(BR, DECK_Y, W - BR, 10);
    // The road or rails leading up to the gap.
    c.fillStyle = b.load === 'train' ? '#6B4A2F' : b.load === 'people' ? '#B08A5A' : '#3B3A44';
    c.fillRect(0, DECK_Y - 4, BL, 6); c.fillRect(BR, DECK_Y - 4, W - BR, 6);
    if (sc === 'harbour') {
      // A ship sailing through, the reason there are no legs in the middle.
      var sx = (t * 40) % (W + 400) - 200;
      var sy = deep + 40;
      poly([sx - 90, sy + 40, sx + 90, sy + 40, sx + 70, sy + 76, sx - 70, sy + 76], CORAL);
      box(sx - 40, sy - 10, 70, 50, 4, PAPER); box(sx + 10, sy - 40, 14, 34, 2, '#26252B');
    }
  }

  /** The deck's height at x: the bridge bends a little under the load, more the closer it is to its limit. */
  function deckY(g, x, shapeId) {
    if (g.phase !== 'test' || !g.result) return DECK_Y;
    var r = g.result, pos = vehicleAt(g), vx = BL + (BR - BL) * pos;
    var u = (x - BL) / (BR - BL), near = Math.max(0, 1 - Math.abs(x - vx) / 360);
    var bend = Math.min(1.4, r.ratio) * (shapeId === 'piers' ? 6 : 18) * near * (pos > 0 && pos < 1 ? 1 : 0);
    if (shapeId === 'piers') bend *= Math.abs(Math.sin(u * Math.PI * 3));
    else bend *= Math.sin(u * Math.PI);
    if (g.broke >= 0) {
      // Broken in the middle: each half swings down from its own bank.
      var fall = Math.min(1, (g.tt - g.broke) / 0.9), half = u < 0.5 ? u : 1 - u;
      return DECK_Y + bend + fall * fall * half * (BR - BL) * 0.9;
    }
    return DECK_Y + bend;
  }

  function drawBridge(g, shapeId, matId) {
    var col = MATERIALS[g.mat].colour, dark = matId === 'wood' ? '#7A4E2E' : matId === 'concrete' ? '#8E8A80' : '#3E434D';
    var rope = matId === 'wood' && shapeId === 'suspension', i, x, n = 24;
    var grow = g.phase === 'test' ? Math.min(1, g.tt / 0.7) : 1;
    c.globalAlpha = 0.25 + 0.75 * grow;
    // Legs and towers stand on the ground; everything else hangs off the deck.
    if (shapeId === 'piers') {
      for (i = 1; i <= 2; i++) {
        x = BL + (BR - BL) * i / 3;
        box(x - 16, deckY(g, x, shapeId), 32, WATER_Y + 40 - DECK_Y, 4, dark);
        if (!BRIDGES[g.level].piers && g.phase !== 'test') { line(x - 26, DECK_Y + 40, x + 26, DECK_Y + 120, 7, CORAL); line(x + 26, DECK_Y + 40, x - 26, DECK_Y + 120, 7, CORAL); }
      }
    }
    if (shapeId === 'arch') {
      c.strokeStyle = col; c.lineWidth = 22; c.beginPath();
      for (i = 0; i <= n; i++) { x = BL + (BR - BL) * i / n; var ay = WATER_Y + 10 - Math.sin(i / n * Math.PI) * (WATER_Y - DECK_Y - 18) + (deckY(g, x, shapeId) - DECK_Y); if (i) c.lineTo(x, ay); else c.moveTo(x, ay); }
      c.stroke();
      for (i = 1; i < 12; i++) {
        x = BL + (BR - BL) * i / 12;
        var top = deckY(g, x, shapeId), bot = WATER_Y + 10 - Math.sin(i / 12 * Math.PI) * (WATER_Y - DECK_Y - 18) + (top - DECK_Y);
        line(x, top + 8, x, bot, 6, dark);
      }
    }
    if (shapeId === 'truss') {
      var tops = [];
      for (i = 0; i <= 10; i++) { x = BL + (BR - BL) * i / 10; tops.push([x, deckY(g, x, shapeId)]); }
      for (i = 0; i < 10; i++) {
        var a = tops[i], b2 = tops[i + 1];
        line(a[0], a[1] - 90, b2[0], b2[1] - 90, 8, col);
        line(a[0], a[1], a[0], a[1] - 90, 6, col);
        if (i < 5) line(a[0], a[1] - 90, b2[0], b2[1], 6, col); else line(a[0], a[1], b2[0], b2[1] - 90, 6, col);
      }
      line(tops[10][0], tops[10][1], tops[10][0], tops[10][1] - 90, 6, col);
    }
    if (shapeId === 'suspension') {
      var tl = BL + 110, tr = BR - 110, ttop = rope ? DECK_Y - 70 : 120;
      if (!rope) { box(tl - 16, ttop, 32, WATER_Y + 40 - ttop, 4, dark); box(tr - 16, ttop, 32, WATER_Y + 40 - ttop, 4, dark); }
      c.strokeStyle = rope ? '#7A4E2E' : '#2B2F38'; c.lineWidth = rope ? 4 : 6; c.beginPath();
      c.moveTo(BL - 60, DECK_Y); c.lineTo(tl, ttop);
      for (i = 0; i <= n; i++) { x = tl + (tr - tl) * i / n; var u = i / n, cy = ttop + (1 - Math.pow(2 * u - 1, 2)) * (DECK_Y - 20 - ttop) + (deckY(g, x, shapeId) - DECK_Y); c.lineTo(x, cy); }
      c.lineTo(BR + 60, DECK_Y); c.stroke();
      for (i = 1; i < n; i++) {
        x = tl + (tr - tl) * i / n; var u2 = i / n, hy = ttop + (1 - Math.pow(2 * u2 - 1, 2)) * (DECK_Y - 20 - ttop) + (deckY(g, x, shapeId) - DECK_Y);
        line(x, hy, x, deckY(g, x, shapeId), 2, rope ? '#7A4E2E' : '#2B2F38');
      }
    }
    // The deck, in pieces so it can bend and break.
    for (i = 0; i < n; i++) {
      var x0 = BL + (BR - BL) * i / n, x1 = BL + (BR - BL) * (i + 1) / n, y0 = deckY(g, x0, shapeId), y1 = deckY(g, x1, shapeId);
      var th = rope ? 8 : shapeId === 'beam' || shapeId === 'piers' ? 26 : 16;
      poly([x0, y0 - 4, x1 + 1, y1 - 4, x1 + 1, y1 + th, x0, y0 + th], col);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x0, Math.min(y0, y1) + th - 4, x1 - x0 + 1, 4);
      if (rope && i % 2 === 0) line(x0 + 4, y0 - 2, x0 + 4, y0 + 6, 2, '#5B3A20');
    }
    c.globalAlpha = 1;
  }

  /** The load: walkers, a car, a truck or a train, driving left to right. */
  function drawLoad(g) {
    var b = BRIDGES[g.level], kind = b.load, pos = g.phase === 'test' ? vehicleAt(g) : -0.1;
    var x = BL + (BR - BL) * pos, shapeId = SHAPES[g.shape].id, y = pos <= 0 ? DECK_Y - 4 : pos >= 1 ? DECK_Y - 4 : deckY(g, Math.min(BR, Math.max(BL, x)), shapeId) - 4;
    if (g.phase === 'test' && g.broke >= 0) {
      // Over the edge it goes, nose first, into the water.
      var f = g.tt - g.broke, bx = BL + (BR - BL) * 0.45;
      x = bx + f * 60; y = DECK_Y + 200 * f * f;
      if (y > WATER_Y + 30) return;
    }
    if (g.phase !== 'test') x = BL - 140;
    c.save(); c.translate(x, y);
    if (g.broke >= 0) c.rotate(Math.min(0.8, (g.tt - g.broke) * 0.8));
    if (kind === 'car') car(0, 0, CORAL);
    else if (kind === 'truck') {
      wheel(-50, -12, 13); wheel(-20, -12, 13); wheel(42, -12, 13);
      box(-74, -70, 100, 52, 4, '#E9EEF2'); box(-74, -70, 100, 10, 3, VIOLET); box(30, -60, 40, 44, 6, BLUE); box(38, -54, 22, 16, 3, '#BFE3F5');
    } else if (kind === 'train') {
      for (var k = 0; k < 3; k++) {
        var cx = -k * 130;
        box(cx - 60, -64, 120, 50, 8, k ? '#5CC4AE' : CORAL); box(cx - 50, -56, 100, 16, 4, '#BFE3F5');
        wheel(cx - 38, -10, 11); wheel(cx + 38, -10, 11);
      }
      box(40, -84, 18, 24, 3, '#26252B');
    } else {
      for (var q = 0; q < 2; q++) {
        var hx = -q * 36, step2 = Math.sin(g.t * 8 + q) * 6;
        line(hx - 4, -18, hx - 4 + step2, 0, 4, '#2C3E66'); line(hx + 4, -18, hx + 4 - step2, 0, 4, '#2C3E66');
        box(hx - 9, -44, 18, 28, 6, q ? EMBER : CORAL); disc(hx, -52, 9, '#E0B08A'); box(hx - 12, -46, 6, 22, 3, MOSS);
      }
    }
    c.restore();
  }

  function chips(labels, at, focus, x0, y, w) {
    for (var i = 0; i < labels.length; i++) {
      var x = x0 + i * (w + 12), on = i === at;
      box(x, y, w, 44, 22, on ? (focus ? VIOLET : 'rgba(110,61,219,0.55)') : 'rgba(247,246,242,0.1)');
      if (on && focus) { c.strokeStyle = LILAC; c.lineWidth = 3; rr(x, y, w, 44, 22); c.stroke(); }
      text(labels[i], x + w / 2, y + 23, 19, on ? PAPER : 'rgba(247,246,242,0.7)', 'center', on ? '800' : '600');
    }
  }

  function drawInfo(g) {
    var b = BRIDGES[g.level];
    box(14, 12, W - 28, 74, 20, 'rgba(13,12,24,0.78)');
    text((g.level + 1) + '. ' + L(b.name), 34, 49, 28, PAPER, 'left', '800');
    var facts = L(GAP) + ' ' + b.span + ' m   ·   ' + L(CARRIES) + ': ' + L(VEHICLES[b.load]) + '   ·   ' + L(MONEY) + ' $' + b.budget + 'M';
    text(facts, W - 34, 49, 20, 'rgba(247,246,242,0.85)', 'right', '700');
    for (var i = 0; i < 3; i++) starShape(W / 2 + 60 + i * 30, 49, 11, i < (g.stars[g.level] || 0) ? EMBER : 'rgba(247,246,242,0.18)');
  }

  function drawPlan(g) {
    var y0 = H - 196;
    box(14, y0, W - 28, 182, 24, 'rgba(13,12,24,0.86)');
    text(L(SHAPE), 40, y0 + 34, 18, g.row === 0 ? LILAC : 'rgba(247,246,242,0.6)', 'left', '700');
    chips(SHAPES.map(function (s) { return L(s.name); }), g.shape, g.row === 0, 170, y0 + 12, 170);
    text(L(MATERIAL), 40, y0 + 90, 18, g.row === 1 ? LILAC : 'rgba(247,246,242,0.6)', 'left', '700');
    chips(MATERIALS.map(function (m) { return L(m.name); }), g.mat, g.row === 1, 170, y0 + 68, 170);
    // What it costs, against the money there is.
    var cost = costNow(g), b = BRIDGES[g.level];
    text(L(COST) + ' $' + (cost || '?') + 'M', 880, y0 + 90, 22, cost > b.budget ? CORAL : '#5CC4AE', 'center', '800');
    var on = g.row === 2;
    box(1010, y0 + 64, 230, 52, 26, on ? EMBER : 'rgba(232,163,61,0.35)');
    if (on) { c.strokeStyle = PAPER; c.lineWidth = 3; rr(1010, y0 + 64, 230, 52, 26); c.stroke(); }
    text(L(TEST), 1125, y0 + 91, 24, on ? INK : PAPER, 'center', '800');
    text(L(PLAN_HELP), W / 2, y0 + 150, 19, LILAC, 'center', '700');
  }

  function drawResult(g) {
    var r = g.result, s = SHAPES[g.shape];
    var title = r.ok ? L(HELD) : r.kind === 'span' || r.kind === 'load' ? L(FELL) : r.kind === 'dear' ? L(TOO_DEAR) : L(CANT);
    var why = r.ok ? L(s.fact) : L({span: WHY_SPAN, load: WHY_LOAD, deep: WHY_DEEP, ships: WHY_SHIPS, pull: WHY_PULL, dear: WHY_DEAR}[r.kind]);
    if (r.kind === 'span' || r.kind === 'load') why += ' ' + L(TEST_TRUCK);
    box(W / 2 - 420, 150, 840, 330, 32, 'rgba(13,12,24,0.92)');
    text(title, W / 2, 206, 44, r.ok ? EMBER : CORAL, 'center', '800');
    if (r.ok) for (var i = 0; i < 3; i++) starShape(W / 2 - 60 + i * 60, 262, 24, i < Math.max(1, 4 - g.tries) ? EMBER : 'rgba(247,246,242,0.15)');
    wrap(why, W / 2, r.ok ? 316 : 280, 760, 23, PAPER, '600');
    var last = r.ok && g.level === BRIDGES.length - 1;
    text(last ? L(ALL_BRIDGES) : r.ok ? L(NEXT_BRIDGE) : L(TRY_AGAIN), W / 2, 448, 22, LILAC, 'center', '700');
  }

  function drawLevels(g) {
    c.fillStyle = 'rgba(13,12,24,0.7)'; c.fillRect(0, 0, W, H);
    dots(W / 2 - 33, 90);
    text(L(BRIDGE_TITLE), W / 2, 146, 46, PAPER, 'center', '800');
    var cw = 180, gap = 18, x0 = (W - (cw * 6 + gap * 5)) / 2;
    for (var i = 0; i < BRIDGES.length; i++) {
      var b = BRIDGES[i], x = x0 + i * (cw + gap), y = 230, here = i === g.level, open = unlocked(g, i);
      if (here) box(x - 6, y - 6, cw + 12, 252, 26, 'rgba(158,123,255,0.6)');
      box(x, y, cw, 240, 22, here ? '#241E4A' : '#1A1733');
      if (open) text(String(i + 1), x + cw / 2, y + 50, 46, PAPER, 'center', '800');
      wrap(L(b.name), x + cw / 2, y + 106, cw - 24, 19, open ? PAPER : 'rgba(247,246,242,0.35)', '700');
      text(b.span + ' m', x + cw / 2, y + 168, 17, 'rgba(247,246,242,0.6)', 'center', '600');
      for (var s = 0; s < 3; s++) starShape(x + cw / 2 - 34 + s * 34, y + 208, 13, s < (g.stars[i] || 0) ? EMBER : 'rgba(247,246,242,0.15)');
      // Locked: a padlock where the number goes.
      if (!open) { box(x + cw / 2 - 18, y + 36, 36, 28, 6, 'rgba(247,246,242,0.35)'); c.strokeStyle = 'rgba(247,246,242,0.35)'; c.lineWidth = 5; c.beginPath(); c.arc(x + cw / 2, y + 36, 11, Math.PI, 0); c.stroke(); }
    }
    drawHint(L(LEVELS_HELP));
  }

  function renderBridge(g) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (g.shake) c.translate(Math.sin(g.t * 70) * 6 * g.shake, 0);
    bridgeScene(g);
    if (g.phase !== 'levels') drawBridge(g, SHAPES[g.shape].id, MATERIALS[g.mat].id);
    drawLoad(g);
    for (var i = 0; i < g.fx.length; i++) {
      var p = g.fx[i]; c.globalAlpha = Math.max(0, 1 - p.t / p.life);
      c.fillStyle = p.c; c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    c.globalAlpha = 1;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (g.phase === 'levels') drawLevels(g);
    else {
      drawInfo(g);
      if (g.phase === 'plan') drawPlan(g);
      else if (g.phase === 'result') drawResult(g);
    }
    drawMsg(g);
  }

  // MARK: - Plan a town: the words

  var TOWN_TITLE = ['Planejar uma cidade', 'Plan a town', 'Planear un pueblo', 'Eine Stadt planen', 'Спланировать город'];
  /** What a town needs. Each one is a building that serves so many people; fire safety covers the houses near it. */
  var NEEDS = {
    water: {name: ['Água', 'Water', 'Agua', 'Wasser', 'Вода'], colour: '#378ADD',
      sad: ['Não tem água para beber nem para o banho!', 'There\'s no water to drink or wash in!', '¡No hay agua para beber ni para bañarse!', 'Es gibt kein Wasser zum Trinken und Waschen!', 'Нет воды ни попить, ни помыться!']},
    power: {name: ['Energia', 'Power', 'Electricidad', 'Strom', 'Электричество'], colour: '#F2C230',
      sad: ['As luzes não acendem e a geladeira está quente!', 'The lights won\'t go on and the fridge is warm!', '¡No se encienden las luces y la nevera está caliente!', 'Das Licht geht nicht an und der Kühlschrank ist warm!', 'Свет не горит, а холодильник тёплый!']},
    food: {name: ['Comida', 'Food', 'Comida', 'Essen', 'Еда'], colour: '#5DAA4F',
      sad: ['Não tem onde comprar comida!', 'There\'s nowhere to buy food!', '¡No hay dónde comprar comida!', 'Es gibt nirgends Essen zu kaufen!', 'Негде купить еду!']},
    waste: {name: ['Esgoto', 'Wastewater', 'Aguas residuales', 'Abwasser', 'Канализация'], colour: '#8A6E4B',
      sad: ['As privadas não dão descarga! Para onde vai o cocô?', 'The toilets won\'t flush! Where does the poo go?', '¡Los váteres no tiran de la cadena! ¿Adónde va la caca?', 'Die Klos spülen nicht! Wohin mit dem Kacka?', 'Унитазы не смываются! Куда всё девается?']},
    school: {name: ['Escola', 'School', 'Escuela', 'Schule', 'Школа'], colour: '#E8A33D',
      sad: ['As crianças não têm escola!', 'The kids have no school to go to!', '¡Los niños no tienen escuela!', 'Die Kinder haben keine Schule!', 'Детям некуда ходить в школу!']},
    doctor: {name: ['Médico', 'Doctor', 'Médico', 'Arzt', 'Врач'], colour: '#D85A30',
      sad: ['Estou doente e não tem médico!', 'I\'m sick and there\'s no doctor!', '¡Estoy malo y no hay médico!', 'Ich bin krank und es gibt keinen Arzt!', 'Я заболел, а врача нет!']},
    jobs: {name: ['Empregos', 'Jobs', 'Trabajo', 'Arbeit', 'Работа'], colour: '#6E7FA0',
      sad: ['Não tem trabalho, então não tem dinheiro!', 'There are no jobs, so there\'s no money!', '¡No hay trabajo, así que no hay dinero!', 'Es gibt keine Arbeit, also kein Geld!', 'Работы нет, значит, и денег нет!']},
    fire: {name: ['Bombeiros', 'Fire safety', 'Bomberos', 'Feuerwehr', 'Пожарные'], colour: '#C0392B',
      sad: ['Se pegar fogo, os bombeiros estão longe demais!', 'If there\'s a fire, the fire engine is too far away!', '¡Si hay un fuego, los bomberos están demasiado lejos!', 'Wenn es brennt, ist die Feuerwehr zu weit weg!', 'Если будет пожар, пожарные слишком далеко!']}
  };
  var NEED_IDS = ['water', 'power', 'food', 'waste', 'school', 'doctor', 'jobs', 'fire'];
  /** cost in $1000s; cap: people one building serves; smelly: nobody wants to live right next to it; reach: tiles it covers. */
  var BUILDINGS = {
    road: {cost: 1, name: ['Estrada', 'Road', 'Carretera', 'Straße', 'Дорога'],
      gives: ['Liga tudo. Casas e prédios precisam de uma estrada até a entrada da cidade.', 'Joins it all up. Houses and buildings need a road all the way to the town\'s way in.', 'Lo une todo. Casas y edificios necesitan una carretera hasta la entrada del pueblo.', 'Verbindet alles. Häuser und Gebäude brauchen eine Straße bis zur Stadteinfahrt.', 'Соединяет всё. Домам и зданиям нужна дорога до въезда в город.']},
    house: {cost: 4, people: 10, name: ['Casas', 'Houses', 'Casas', 'Häuser', 'Дома'],
      gives: ['Casas para 10 pessoas. Elas só se mudam se uma estrada chegar até aqui.', 'Homes for 10 people. They only move in when a road reaches it.', 'Casas para 10 personas. Solo se mudan si llega una carretera.', 'Wohnungen für 10 Leute. Sie ziehen nur ein, wenn eine Straße hinführt.', 'Дома на 10 человек. Люди въедут, только если сюда ведёт дорога.']},
    water: {cost: 15, need: 'water', cap: 60, name: ['Caixa d\'água', 'Water tower', 'Depósito de agua', 'Wasserturm', 'Водонапорная башня'],
      gives: ['Água limpa para 60 pessoas.', 'Clean water for 60 people.', 'Agua limpia para 60 personas.', 'Sauberes Wasser für 60 Leute.', 'Чистая вода для 60 человек.']},
    power: {cost: 25, need: 'power', cap: 80, smelly: true, name: ['Usina de energia', 'Power station', 'Central eléctrica', 'Kraftwerk', 'Электростанция'],
      gives: ['Energia para 80 pessoas. É barulhenta: ninguém quer morar do lado.', 'Power for 80 people. It\'s noisy: nobody wants to live right next to it.', 'Electricidad para 80 personas. Hace ruido: nadie quiere vivir al lado.', 'Strom für 80 Leute. Laut: niemand will direkt daneben wohnen.', 'Электричество для 80 человек. Шумит: рядом жить никто не хочет.']},
    waste: {cost: 15, need: 'waste', cap: 60, smelly: true, name: ['Estação de esgoto', 'Wastewater plant', 'Depuradora', 'Kläranlage', 'Очистные сооружения'],
      gives: ['Limpa a água das privadas e pias de 60 pessoas. Tem cheiro ruim de perto.', 'Cleans the water from toilets and sinks for 60 people. It smells up close.', 'Limpia el agua de váteres y fregaderos de 60 personas. Huele mal de cerca.', 'Reinigt das Wasser aus Klos und Spülen für 60 Leute. Riecht von Nahem.', 'Очищает воду из туалетов и раковин для 60 человек. Вблизи пахнет.']},
    shop: {cost: 8, need: 'food', cap: 40, name: ['Mercado', 'Supermarket', 'Supermercado', 'Supermarkt', 'Супермаркет'],
      gives: ['Comida para 40 pessoas.', 'Food for 40 people.', 'Comida para 40 personas.', 'Essen für 40 Leute.', 'Еда для 40 человек.']},
    school: {cost: 20, need: 'school', cap: 60, name: ['Escola', 'School', 'Escuela', 'Schule', 'Школа'],
      gives: ['Aulas para as crianças de 60 pessoas.', 'Lessons for the kids of 60 people.', 'Clases para los niños de 60 personas.', 'Unterricht für die Kinder von 60 Leuten.', 'Уроки для детей 60 человек.']},
    doctor: {cost: 15, need: 'doctor', cap: 60, name: ['Posto de saúde', 'Doctor\'s', 'Centro de salud', 'Arztpraxis', 'Поликлиника'],
      gives: ['Médicos e enfermeiros para 60 pessoas.', 'Doctors and nurses for 60 people.', 'Médicos y enfermeros para 60 personas.', 'Ärzte und Pflegekräfte für 60 Leute.', 'Врачи и медсёстры для 60 человек.']},
    jobs: {cost: 15, need: 'jobs', cap: 50, smelly: true, name: ['Oficina', 'Workshop', 'Taller', 'Werkstatt', 'Мастерская'],
      gives: ['Trabalho para 50 pessoas. É barulhenta de perto.', 'Jobs for 50 people. It\'s noisy up close.', 'Trabajo para 50 personas. Hace ruido de cerca.', 'Arbeit für 50 Leute. Laut von Nahem.', 'Работа для 50 человек. Вблизи шумно.']},
    fire: {cost: 12, need: 'fire', reach: 4, name: ['Bombeiros', 'Fire station', 'Bomberos', 'Feuerwache', 'Пожарная часть'],
      gives: ['Protege as casas a até 4 quadras daqui.', 'Keeps the houses up to 4 squares away safe.', 'Protege las casas a hasta 4 casillas.', 'Schützt die Häuser bis 4 Felder weit.', 'Защищает дома в пределах 4 клеток.']},
    park: {cost: 4, fun: 2, name: ['Parque', 'Park', 'Parque', 'Park', 'Парк'],
      gives: ['Um lugar para brincar. Divertido, mas não resolve as necessidades.', 'Somewhere to play. Fun, but it doesn\'t fix a need.', 'Un sitio para jugar. Divertido, pero no cubre una necesidad.', 'Ein Ort zum Spielen. Lustig, aber kein Bedarf.', 'Место для игр. Весело, но это не нужда.']},
    icecream: {cost: 10, fun: 1, name: ['Sorveteria', 'Ice cream shop', 'Heladería', 'Eisdiele', 'Кафе-мороженое'],
      gives: ['Sorvete! Gostoso, mas não é uma necessidade.', 'Ice cream! Yum, but it isn\'t a need.', '¡Helado! Rico, pero no es una necesidad.', 'Eis! Lecker, aber kein Bedarf.', 'Мороженое! Вкусно, но это не нужда.']},
    knock: {cost: 0, name: ['Derrubar', 'Knock it down', 'Derribar', 'Abreißen', 'Снести'],
      gives: ['Tira o que está aqui e devolve metade do dinheiro.', 'Takes away what\'s here and gives back half the money.', 'Quita lo que hay y devuelve la mitad del dinero.', 'Entfernt, was hier steht, und gibt das halbe Geld zurück.', 'Убирает то, что здесь стоит, и возвращает половину денег.']}
  };
  var TOWNS = [
    {id: 'village', goal: 30, budget: 110, needs: ['water', 'power', 'food'],
      name: ['Uma pequena vila', 'A little village', 'Una pequeña aldea', 'Ein kleines Dorf', 'Маленькая деревня']},
    {id: 'country', goal: 60, budget: 210, needs: ['water', 'power', 'food', 'waste', 'school', 'doctor'],
      name: ['Uma cidade do interior', 'A country town', 'Un pueblo de campo', 'Eine Landstadt', 'Городок']},
    {id: 'busy', goal: 100, budget: 420, needs: NEED_IDS,
      name: ['Uma cidade movimentada', 'A busy town', 'Un pueblo animado', 'Eine lebhafte Stadt', 'Оживлённый город']}
  ];
  var TOWN_NEEDS = ['Esta cidade precisa de:', 'This town needs:', 'Este pueblo necesita:', 'Diese Stadt braucht:', 'Этому городу нужно:'];
  var TOWN_GOAL = ['Meta: {n} pessoas felizes', 'Goal: {n} happy people', 'Meta: {n} personas felices', 'Ziel: {n} glückliche Leute', 'Цель: {n} счастливых жителей'];
  var PEOPLE = ['Pessoas', 'People', 'Personas', 'Leute', 'Жители'];
  var TOWN_BRIEF_HELP = ['◀ ▶ escolher  ·  OK começar  ·  Voltar para o menu', '◀ ▶ pick a town  ·  OK to start  ·  Back for the menu', '◀ ▶ elegir  ·  OK empezar  ·  Atrás para el menú', '◀ ▶ wählen  ·  OK starten  ·  Zurück fürs Menü', '◀ ▶ выбрать  ·  OK начать  ·  Назад: меню'];
  var TOWN_HELP = ['Setas andar  ·  OK construir aqui  ·  Voltar para o menu', 'Arrows to move  ·  OK to build here  ·  Back for the menu', 'Flechas mover  ·  OK construir aquí  ·  Atrás para el menú', 'Pfeile bewegen  ·  OK hier bauen  ·  Zurück fürs Menü', 'Стрелки: ходить  ·  OK: строить  ·  Назад: меню'];
  var PICK_HELP = ['◀ ▶ escolher  ·  OK construir  ·  Voltar fechar', '◀ ▶ choose  ·  OK to build  ·  Back to close', '◀ ▶ elegir  ·  OK construir  ·  Atrás cerrar', '◀ ▶ wählen  ·  OK bauen  ·  Zurück schließen', '◀ ▶ выбрать  ·  OK строить  ·  Назад: закрыть'];
  var NO_MONEY = ['Não tem dinheiro suficiente. Derrube algo que não precisa?', 'Not enough money. Knock down something you don\'t need?', 'No hay suficiente dinero. ¿Derribas algo que no haga falta?', 'Nicht genug Geld. Etwas abreißen, das du nicht brauchst?', 'Не хватает денег. Снести что-то ненужное?'];
  var NEEDS_ROAD = ['Ninguém se muda até uma estrada chegar aqui.', 'Nobody can move in until a road reaches it.', 'Nadie se muda hasta que llegue una carretera.', 'Niemand zieht ein, bis eine Straße hinführt.', 'Никто не въедет, пока сюда не проведут дорогу.'];
  var WORKS_ROAD = ['Precisa de uma estrada do lado para funcionar.', 'It needs a road next to it to work.', 'Necesita una carretera al lado para funcionar.', 'Es braucht eine Straße daneben, um zu arbeiten.', 'Чтобы работать, рядом нужна дорога.'];
  var ICE_LESSON = ['Sorvete! Todo mundo adora, mas não é uma necessidade: primeiro água, energia e comida.', 'Ice cream! Everyone loves it, but it isn\'t a need: water, power and food come first.', '¡Helado! A todos les encanta, pero no es una necesidad: primero agua, luz y comida.', 'Eis! Alle lieben es, aber es ist kein Bedarf: zuerst Wasser, Strom und Essen.', 'Мороженое! Все его любят, но это не нужда: сначала вода, свет и еда.'];
  var SMELLY = ['Eca, é barulhento e fedido morar do lado disso!', 'Phew, it\'s noisy and smelly living right next to that!', '¡Puaj, vivir justo al lado de eso es ruidoso y apestoso!', 'Puh, direkt daneben ist es laut und stinkig!', 'Фу, жить прямо рядом с этим шумно и вонюче!'];
  var TOWN_WON = ['Todo mundo está feliz!', 'Everyone is happy!', '¡Todos están felices!', 'Alle sind glücklich!', 'Все счастливы!'];
  var TOWN_WON_WHY = ['Uma cidade de verdade precisa de tudo isso antes de qualquer coisa divertida. Sobrou ${n} mil.', 'A real town needs all of these before the fun things. You had ${n}k left.', 'Un pueblo de verdad necesita todo esto antes que las cosas divertidas. Te sobraron ${n} mil.', 'Eine echte Stadt braucht das alles vor den lustigen Sachen. Übrig: ${n}k.', 'Настоящему городу всё это нужно раньше развлечений. Осталось ${n} тыс.'];
  var NEXT_TOWN = ['OK próxima cidade', 'OK next town', 'OK siguiente pueblo', 'OK nächste Stadt', 'OK следующий город'];
  var ALL_TOWNS = ['OK de volta às cidades', 'OK back to the towns', 'OK volver a los pueblos', 'OK zurück zu den Städten', 'OK обратно к городам'];

  // MARK: - Plan a town: the rules

  var TC = 12, TR = 7, TS = 76, TX = 24, TY = 98, GATE = 3;

  function newTown() {
    var sv = load(), stars = sv.townStars || [], at = 0;
    while (at < TOWNS.length - 1 && stars[at]) at++;
    var g = {job: 'town', phase: 'brief', level: at, stars: stars.slice(), t: 0, tt: 0, fx: [], msg: null,
      cells: [], cx: 1, cy: GATE, pick: 0, opts: [], money: 0, people: 0, supply: {}, moods: [0, 0, 0], moaned: 0, iced: false};
    freshTown(g);
    return g;
  }

  function townUnlocked(g, i) { return i === 0 || !!g.stars[i - 1]; }

  /** Empty land for the chosen town: a few trees, and the road in from the highway. */
  function freshTown(g) {
    var t = TOWNS[g.level], i;
    g.cells = [];
    for (i = 0; i < TC * TR; i++) g.cells.push({b: ((i % TC) * 7 + Math.floor(i / TC) * 5) % 11 === 3 && i % TC > 1 ? 'tree' : null, linked: false, mood: -1, problems: []});
    g.cells[GATE * TC].b = 'road'; g.cells[GATE * TC].fixed = true;
    g.money = t.budget; g.cx = 1; g.cy = GATE; g.iced = false; g.moaned = g.t;
    townCompute(g);
  }

  function startTown(g) { freshTown(g); g.phase = 'plan'; g.tt = 0; }

  function cellAt(g, x, y) { return x < 0 || y < 0 || x >= TC || y >= TR ? null : g.cells[y * TC + x]; }

  /** Who lives here, what they have, and how each house feels. */
  function townCompute(g) {
    var t = TOWNS[g.level], i, x, y, cl, n;
    // Roads joined to the way in, on the left.
    for (i = 0; i < g.cells.length; i++) { g.cells[i].linked = false; g.cells[i].reached = false; }
    var todo = [GATE * TC]; g.cells[GATE * TC].reached = true;
    while (todo.length) {
      var at = todo.pop(), ax = at % TC, ay = (at - ax) / TC, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (n = 0; n < 4; n++) {
        cl = cellAt(g, ax + nb[n][0], ay + nb[n][1]);
        if (cl && cl.b === 'road' && !cl.reached) { cl.reached = true; todo.push((ay + nb[n][1]) * TC + ax + nb[n][0]); }
      }
    }
    // A building works when a joined-up road runs past it.
    for (y = 0; y < TR; y++) for (x = 0; x < TC; x++) {
      cl = cellAt(g, x, y);
      if (!cl.b || cl.b === 'tree') continue;
      if (cl.b === 'road') { cl.linked = cl.reached; continue; }
      cl.linked = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var o = cellAt(g, x + d[0], y + d[1]); return o && o.b === 'road' && o.reached; });
    }
    var people = 0, supply = {};
    NEED_IDS.forEach(function (id) { supply[id] = 0; });
    for (i = 0; i < g.cells.length; i++) {
      cl = g.cells[i]; var def = BUILDINGS[cl.b];
      if (!def || !cl.linked) continue;
      if (def.people) people += def.people;
      if (def.need && def.cap) supply[def.need] += def.cap;
    }
    g.people = people; g.supply = supply;
    var short = t.needs.filter(function (id) { return id !== 'fire' && supply[id] < people; });
    var moods = [0, 0, 0], houses = 0;
    for (y = 0; y < TR; y++) for (x = 0; x < TC; x++) {
      cl = cellAt(g, x, y);
      if (cl.b !== 'house' || !cl.linked) { cl.mood = -1; cl.problems = []; continue; }
      houses++;
      var problems = short.slice(), fun = false;
      for (var yy = 0; yy < TR; yy++) for (var xx = 0; xx < TC; xx++) {
        var o = cellAt(g, xx, yy), od = BUILDINGS[o.b];
        if (!od || !o.linked) continue;
        var dx = Math.abs(xx - x), dy = Math.abs(yy - y);
        if (od.smelly && dx <= 1 && dy <= 1 && problems.indexOf('smelly') < 0) problems.push('smelly');
        if (od.fun && dx + dy <= od.fun) fun = true;
        if (od.reach && dx + dy <= od.reach) cl.safe = true;
      }
      if (t.needs.indexOf('fire') >= 0 && !cl.safe) problems.push('fire');
      cl.safe = false;
      cl.problems = problems; cl.fun = fun;
      cl.mood = problems.length === 0 ? 0 : problems.length === 1 ? 1 : 2;
      moods[cl.mood]++;
    }
    g.moods = moods; g.houses = houses;
    g.won = people >= t.goal && moods[1] === 0 && moods[2] === 0;
  }

  /** What can go on the cursor's square: building there already means knock it down. */
  function townOptions(g) {
    var cl = cellAt(g, g.cx, g.cy);
    if (cl.fixed) return [];
    if (cl.b && cl.b !== 'tree') return ['knock'];
    var t = TOWNS[g.level], out = ['road', 'house'];
    ['water', 'power', 'shop', 'waste', 'school', 'doctor', 'jobs', 'fire'].forEach(function (id) {
      if (t.needs.indexOf(BUILDINGS[id].need) >= 0) out.push(id);
    });
    return out.concat(['park', 'icecream']);
  }

  function townPlace(g, id) {
    var cl = cellAt(g, g.cx, g.cy), def = BUILDINGS[id], px = TX + g.cx * TS + TS / 2, py = TY + g.cy * TS + TS / 2;
    if (id === 'knock') {
      g.money += Math.floor(BUILDINGS[cl.b].cost / 2); cl.b = null; sfx('crunch'); fx(g, px, py, '#B08A5A', 16, 200);
    } else {
      if (g.money < def.cost) { say(g, L(NO_MONEY), CORAL); sfx('bonk'); return; }
      g.money -= def.cost; cl.b = id; sfx('place'); fx(g, px, py, LILAC, 12, 200);
    }
    g.phase = 'plan';
    townCompute(g);
    if (id === 'house' && !cl.linked) say(g, L(NEEDS_ROAD), EMBER);
    else if (id === 'icecream' && !g.iced) { g.iced = true; say(g, L(ICE_LESSON), EMBER); }
    else if (def.need && !cl.linked) say(g, L(WORKS_ROAD), EMBER);
    if (g.won) { g.phase = 'won'; g.tt = 0; townWin(g); }
  }

  function townStars(g) { var left = g.money / TOWNS[g.level].budget; return left >= 0.25 ? 3 : left >= 0.1 ? 2 : 1; }

  function townWin(g) {
    var s = townStars(g);
    g.stars[g.level] = Math.max(g.stars[g.level] || 0, s);
    var sv = load(); sv.townStars = g.stars; save(sv);
    sfx('win'); fx(g, W / 2, 300, EMBER, 30, 420); fx(g, W / 2, 300, LILAC, 30, 420);
  }

  function townKey(g, k) {
    if (g.phase === 'brief') {
      if (k === LEFT || k === RIGHT) { g.level = (g.level + (k === LEFT ? TOWNS.length - 1 : 1)) % TOWNS.length; freshTown(g); sfx('hop'); }
      else if (k === OK) {
        if (!townUnlocked(g, g.level)) { say(g, L(LOCKED), EMBER); sfx('bonk'); return; }
        startTown(g); sfx('six');
      }
      return;
    }
    if (g.phase === 'plan') {
      if (k === LEFT) g.cx = Math.max(0, g.cx - 1);
      else if (k === RIGHT) g.cx = Math.min(TC - 1, g.cx + 1);
      else if (k === UP) g.cy = Math.max(0, g.cy - 1);
      else if (k === DOWN) g.cy = Math.min(TR - 1, g.cy + 1);
      else if (k === OK) {
        g.opts = townOptions(g);
        if (!g.opts.length) { sfx('bonk'); return; }
        g.phase = 'pick'; g.pick = Math.min(g.opts[0] === 'knock' ? 0 : g.lastPick || 0, g.opts.length - 1); sfx('pop');
        return;
      }
      sfx('hop');
      return;
    }
    if (g.phase === 'pick') {
      if (k === LEFT || k === RIGHT) { g.pick = (g.pick + (k === LEFT ? g.opts.length - 1 : 1)) % g.opts.length; sfx('hop'); }
      else if (k === UP) g.phase = 'plan';
      else if (k === OK) { if (g.opts[0] !== 'knock') g.lastPick = g.pick; townPlace(g, g.opts[g.pick]); }
      return;
    }
    if (g.phase === 'won' && k === OK && g.tt > 1.6) {
      if (g.level < TOWNS.length - 1) g.level++;
      g.phase = 'brief'; freshTown(g);
    }
  }

  /** Back goes up one: the builder's list closes, a finished town goes back to the towns. */
  function townBack(g) {
    if (g.phase === 'pick') { g.phase = 'plan'; return true; }
    if (g.phase === 'won') { g.phase = 'brief'; return true; }
    return false;
  }

  function townStep(g, dt) {
    g.t += dt; g.tt += dt;
    if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
    for (var i = g.fx.length - 1; i >= 0; i--) {
      var p = g.fx[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      if (p.t > p.life) g.fx.splice(i, 1);
    }
    // Now and then somebody says what's wrong, so a sad face always has a reason.
    if (g.phase === 'plan' && !g.msg && g.t - g.moaned > 6) {
      g.moaned = g.t;
      for (var k = 0; k < g.cells.length; k++) {
        var cl = g.cells[(k + Math.floor(g.t)) % g.cells.length];
        if (cl.problems && cl.problems.length) {
          var pr = cl.problems[Math.floor(g.t) % cl.problems.length];
          say(g, pr === 'smelly' ? L(SMELLY) : L(NEEDS[pr].sad), CORAL);
          break;
        }
      }
    }
  }

  // MARK: - Plan a town: drawing

  function face(x, y, r, mood) {
    disc(x, y, r, mood === 0 ? '#5CC46A' : mood === 1 ? EMBER : CORAL);
    disc(x - r * 0.35, y - r * 0.2, r * 0.13, INK); disc(x + r * 0.35, y - r * 0.2, r * 0.13, INK);
    c.strokeStyle = INK; c.lineWidth = Math.max(2, r * 0.14); c.lineCap = 'round'; c.beginPath();
    if (mood === 0) c.arc(x, y + r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 1) { c.moveTo(x - r * 0.4, y + r * 0.35); c.lineTo(x + r * 0.4, y + r * 0.35); }
    else c.arc(x, y + r * 0.7, r * 0.45, 1.2 * Math.PI, 1.8 * Math.PI);
    c.stroke();
  }

  /** One building in a square at x, y of size s (also the picker's little pictures). */
  function building(id, x, y, s, g, cx, cy) {
    var u = s / 76, mx = x + s / 2;
    function R(a, b, w, h, col, r) { box(x + a * u, y + b * u, w * u, h * u, (r || 3) * u, col); }
    if (id === 'road') {
      box(x, y, s, s, 0, '#4A4954');
      var dirs = g ? [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { var o = cellAt(g, cx + d[0], cy + d[1]); return o && o.b === 'road' || (cx + d[0] < 0 && cy === GATE); }) : [[1, 0], [-1, 0]];
      for (var d = 0; d < dirs.length; d++) line(mx, y + s / 2, mx + dirs[d][0] * s / 2, y + s / 2 + dirs[d][1] * s / 2, 3 * u, 'rgba(247,246,242,0.7)');
      disc(mx, y + s / 2, 3 * u, 'rgba(247,246,242,0.7)');
      return;
    }
    if (id === 'tree') { tree(mx, y + s - 8 * u, 0.6 * u); return; }
    if (id === 'house') {
      R(14, 34, 48, 34, PAPER); poly([x + 8 * u, y + 36 * u, mx, y + 12 * u, x + 68 * u, y + 36 * u], CORAL);
      R(32, 48, 12, 20, '#7A4E2E'); R(18, 42, 10, 10, '#9ED0F5'); R(48, 42, 10, 10, '#9ED0F5');
      return;
    }
    if (id === 'water') {
      line(x + 26 * u, y + 40 * u, x + 20 * u, y + 70 * u, 4 * u, STEEL); line(x + 50 * u, y + 40 * u, x + 56 * u, y + 70 * u, 4 * u, STEEL);
      R(16, 12, 44, 30, BLUE, 12); disc(mx, y + 27 * u, 7 * u, '#9ED0F5');
      return;
    }
    if (id === 'power') {
      R(10, 34, 56, 34, '#7C8597'); R(46, 10, 12, 28, '#5B6270');
      disc(52 * u + x, y + 8 * u, 6 * u, 'rgba(220,220,230,0.8)');
      poly([x + 28 * u, y + 38 * u, x + 22 * u, y + 54 * u, x + 32 * u, y + 52 * u, x + 26 * u, y + 66 * u, x + 40 * u, y + 46 * u, x + 30 * u, y + 48 * u], HIVIS);
      return;
    }
    if (id === 'waste') {
      disc(x + 26 * u, y + 44 * u, 18 * u, '#6C8F87'); disc(x + 26 * u, y + 44 * u, 12 * u, '#8A6E4B');
      disc(x + 54 * u, y + 52 * u, 14 * u, '#6C8F87'); disc(x + 54 * u, y + 52 * u, 9 * u, '#8A6E4B');
      return;
    }
    if (id === 'shop') {
      R(10, 30, 56, 38, PAPER);
      for (var st = 0; st < 4; st++) R(10 + st * 14, 22, 14, 12, st % 2 ? PAPER : '#5DAA4F', 1);
      R(30, 46, 16, 22, '#9ED0F5'); disc(x + 18 * u, y + 52 * u, 5 * u, CORAL); disc(x + 58 * u, y + 52 * u, 5 * u, EMBER);
      return;
    }
    if (id === 'school') {
      R(8, 32, 60, 36, EMBER); poly([x + 4 * u, y + 34 * u, mx, y + 14 * u, x + 72 * u, y + 34 * u], '#B5562E');
      R(32, 48, 12, 20, '#7A4E2E'); disc(mx, y + 30 * u, 5 * u, HIVIS);
      line(x + 64 * u, y + 32 * u, x + 64 * u, y + 6 * u, 2 * u, INK); poly([x + 64 * u, y + 6 * u, x + 76 * u, y + 11 * u, x + 64 * u, y + 16 * u], BLUE);
      return;
    }
    if (id === 'doctor') {
      R(10, 22, 56, 46, PAPER); R(32, 30, 12, 30, CORAL, 1); R(23, 39, 30, 12, CORAL, 1);
      return;
    }
    if (id === 'jobs') {
      R(8, 36, 60, 32, '#6E7FA0');
      for (var sw = 0; sw < 3; sw++) poly([x + (8 + sw * 20) * u, y + 36 * u, x + (8 + sw * 20) * u, y + 20 * u, x + (28 + sw * 20) * u, y + 36 * u], '#55637F');
      R(16, 48, 12, 10, HIVIS); R(46, 48, 12, 10, HIVIS);
      return;
    }
    if (id === 'fire') {
      R(10, 24, 56, 44, '#C0392B'); R(20, 40, 36, 28, '#F2E6D8'); for (var fl = 0; fl < 3; fl++) line(x + 20 * u, y + (46 + fl * 7) * u, x + 56 * u, y + (46 + fl * 7) * u, 1.5 * u, '#C9B8A2');
      disc(mx, y + 31 * u, 4 * u, HIVIS);
      return;
    }
    if (id === 'park') {
      R(6, 6, 64, 64, '#5DBA66', 10); tree(x + 26 * u, y + 52 * u, 0.5 * u); R(42, 50, 22, 5, '#7A4E2E'); R(44, 55, 3, 7, '#7A4E2E'); R(59, 55, 3, 7, '#7A4E2E');
      return;
    }
    if (id === 'icecream') {
      R(10, 30, 56, 38, '#F4B6D2'); for (var ic = 0; ic < 4; ic++) R(10 + ic * 14, 24, 14, 10, ic % 2 ? PAPER : '#E77FB0', 1);
      poly([x + 30 * u, y + 46 * u, x + 46 * u, y + 46 * u, x + 38 * u, y + 66 * u], '#D9A066'); disc(mx, y + 42 * u, 9 * u, '#FDF1C7'); disc(mx + 2 * u, y + 34 * u, 6 * u, '#E77FB0');
      return;
    }
    if (id === 'knock') {
      R(16, 40, 44, 24, '#B08A5A', 10); line(x + 20 * u, y + 20 * u, x + 56 * u, y + 56 * u, 6 * u, CORAL); line(x + 56 * u, y + 20 * u, x + 20 * u, y + 56 * u, 6 * u, CORAL);
    }
  }

  function renderTown(g) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    var t = TOWNS[g.level], x, y, cl;
    box(0, 0, W, H, 0, '#3E7A3A');
    // The land, square by square.
    for (y = 0; y < TR; y++) for (x = 0; x < TC; x++) {
      var px = TX + x * TS, py = TY + y * TS;
      box(px, py, TS, TS, 0, (x + y) % 2 ? '#7CC46A' : '#74BC62');
    }
    // The highway coming in from the left.
    box(0, TY + GATE * TS, TX, TS, 0, '#4A4954');
    for (y = 0; y < TR; y++) for (x = 0; x < TC; x++) {
      cl = cellAt(g, x, y);
      if (!cl.b) continue;
      var bx = TX + x * TS, by = TY + y * TS;
      building(cl.b, bx, by, TS, g, x, y);
      var def = BUILDINGS[cl.b];
      if (def && def.smelly && cl.linked) for (var w = 0; w < 2; w++) {
        var wy = by + 4 - ((g.t * 14 + w * 9) % 18);
        c.globalAlpha = 0.6; line(bx + 22 + w * 26, wy + 8, bx + 26 + w * 26 + Math.sin(g.t * 4 + w) * 3, wy, 3, '#9BB86A'); c.globalAlpha = 1;
      }
      // Not joined to a road yet: a little sign.
      if (cl.b !== 'tree' && cl.b !== 'road' && !cl.linked) { disc(bx + TS - 14, by + 14, 11, CORAL); text('!', bx + TS - 14, by + 15, 16, PAPER, 'center', '800'); }
      if (cl.b === 'house' && cl.mood >= 0) {
        face(bx + TS - 15, by + 15, 12, cl.mood);
        if (cl.fun) disc(bx + 12, by + 12, 6, '#E77FB0');
      }
    }
    // The cursor.
    var cxp = TX + g.cx * TS, cyp = TY + g.cy * TS, pulse = 0.6 + 0.4 * Math.sin(g.t * 5);
    c.strokeStyle = 'rgba(158,123,255,' + pulse + ')'; c.lineWidth = 5; rr(cxp + 2, cyp + 2, TS - 4, TS - 4, 10); c.stroke();
    c.strokeStyle = PAPER; c.lineWidth = 2; rr(cxp + 6, cyp + 6, TS - 12, TS - 12, 8); c.stroke();
    // What a fire station would cover, while one is picked or under the cursor.
    var showFire = (g.phase === 'pick' && g.opts[g.pick] === 'fire') || (cellAt(g, g.cx, g.cy) || {}).b === 'fire';
    if (showFire) {
      c.fillStyle = 'rgba(192,57,43,0.18)';
      for (y = 0; y < TR; y++) for (x = 0; x < TC; x++) if (Math.abs(x - g.cx) + Math.abs(y - g.cy) <= 4) c.fillRect(TX + x * TS, TY + y * TS, TS, TS);
    }
    for (var i = 0; i < g.fx.length; i++) {
      var p = g.fx[i]; c.globalAlpha = Math.max(0, 1 - p.t / p.life);
      c.fillStyle = p.c; c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    c.globalAlpha = 1;
    drawTownTop(g); drawTownPanel(g);
    if (g.phase === 'brief') drawTownBrief(g);
    else if (g.phase === 'pick') drawTownPick(g);
    else if (g.phase === 'won' && g.tt > 1.2) drawTownWon(g);
    else drawHint(L(TOWN_HELP));
    drawMsg(g);
  }

  function drawTownTop(g) {
    var t = TOWNS[g.level];
    box(14, 12, W - 28, 74, 20, 'rgba(13,12,24,0.78)');
    text((g.level + 1) + '. ' + L(t.name), 34, 49, 28, PAPER, 'left', '800');
    for (var i = 0; i < 3; i++) starShape(W / 2 + 40 + i * 30, 49, 11, i < (g.stars[g.level] || 0) ? EMBER : 'rgba(247,246,242,0.18)');
    text(L(PEOPLE) + ' ' + g.people + ' / ' + t.goal + '   ·   ' + L(MONEY) + ' $' + g.money + 'k', W - 34, 49, 20, 'rgba(247,246,242,0.9)', 'right', '700');
  }

  /** The town's needs, each with what it has against how many people live here. */
  function drawTownPanel(g) {
    var t = TOWNS[g.level], x0 = TX + TC * TS + 14, w = W - 14 - x0, y = TY;
    box(x0, y, w, TR * TS, 20, 'rgba(13,12,24,0.8)');
    face(x0 + 34, y + 34, 15, 0); text(String(g.moods[0]), x0 + 56, y + 35, 22, PAPER, 'left', '800');
    face(x0 + 124, y + 34, 15, 1); text(String(g.moods[1]), x0 + 146, y + 35, 22, PAPER, 'left', '800');
    face(x0 + 214, y + 34, 15, 2); text(String(g.moods[2]), x0 + 236, y + 35, 22, PAPER, 'left', '800');
    var row = Math.min(54, (TR * TS - 80) / t.needs.length);
    t.needs.forEach(function (id, i) {
      var ry = y + 78 + i * row, need = NEEDS[id], have, ok;
      if (id === 'fire') {
        var covered = 0;
        g.cells.forEach(function (cl) { if (cl.b === 'house' && cl.linked && cl.problems.indexOf('fire') < 0) covered++; });
        ok = covered === g.houses; have = covered + ' / ' + g.houses;
      } else { have = g.supply[id] + ' / ' + g.people; ok = g.supply[id] >= g.people; }
      disc(x0 + 26, ry + 12, 9, need.colour);
      text(L(need.name), x0 + 44, ry + 12, 18, PAPER, 'left', '700');
      text(have, x0 + w - 16, ry + 12, 18, ok ? '#7EE08A' : CORAL, 'right', '800');
      var full = id === 'fire' ? (g.houses ? 1 : 0) : g.people ? Math.min(1, g.supply[id] / g.people) : 1;
      box(x0 + 44, ry + 28, w - 60, 6, 3, 'rgba(247,246,242,0.12)');
      box(x0 + 44, ry + 28, (w - 60) * (id === 'fire' ? (ok ? 1 : 0.4) : full), 6, 3, ok ? '#5CC46A' : CORAL);
    });
  }

  function drawTownBrief(g) {
    c.fillStyle = 'rgba(13,12,24,0.72)'; c.fillRect(0, 0, W, H);
    dots(W / 2 - 33, 90);
    text(L(TOWN_TITLE), W / 2, 146, 46, PAPER, 'center', '800');
    var cw = 330, gap = 24, x0 = (W - (cw * 3 + gap * 2)) / 2;
    for (var i = 0; i < TOWNS.length; i++) {
      var t = TOWNS[i], x = x0 + i * (cw + gap), y = 200, here = i === g.level, open = townUnlocked(g, i);
      if (here) box(x - 6, y - 6, cw + 12, 392, 26, 'rgba(158,123,255,0.6)');
      box(x, y, cw, 380, 22, here ? '#241E4A' : '#1A1733');
      var a = open ? 1 : 0.35;
      c.globalAlpha = a;
      text(String(i + 1) + '. ' + L(t.name), x + cw / 2, y + 40, 24, PAPER, 'center', '800');
      text(L(TOWN_GOAL).replace('{n}', t.goal), x + cw / 2, y + 80, 18, '#7EE08A', 'center', '700');
      text(L(TOWN_NEEDS), x + 24, y + 120, 16, 'rgba(247,246,242,0.6)', 'left', '700');
      for (var n = 0; n < t.needs.length; n++) {
        var nx = x + 24 + (n % 2) * 150, ny = y + 152 + Math.floor(n / 2) * 34;
        disc(nx + 8, ny, 8, NEEDS[t.needs[n]].colour);
        text(L(NEEDS[t.needs[n]].name), nx + 24, ny + 1, 17, PAPER, 'left', '600');
      }
      text(L(MONEY) + ' $' + t.budget + 'k', x + cw / 2, y + 320, 18, 'rgba(247,246,242,0.75)', 'center', '700');
      for (var s = 0; s < 3; s++) starShape(x + cw / 2 - 34 + s * 34, y + 352, 13, s < (g.stars[i] || 0) ? EMBER : 'rgba(247,246,242,0.15)');
      c.globalAlpha = 1;
      if (!open) { box(x + cw / 2 - 22, y + 196, 44, 34, 7, 'rgba(247,246,242,0.5)'); c.strokeStyle = 'rgba(247,246,242,0.5)'; c.lineWidth = 6; c.beginPath(); c.arc(x + cw / 2, y + 196, 14, Math.PI, 0); c.stroke(); }
    }
    drawHint(L(TOWN_BRIEF_HELP));
  }

  function drawTownPick(g) {
    var n = g.opts.length, cw = 86, gap = 8, x0 = (TX + TC * TS) / 2 - (n * cw + (n - 1) * gap) / 2, y0 = H - 196;
    var pw = Math.max(640, n * (cw + gap) + 40);
    box((TX + TC * TS) / 2 - pw / 2, y0, pw, 186, 24, 'rgba(13,12,24,0.92)');
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (cw + gap), on = i === g.pick, id = g.opts[i], def = BUILDINGS[id];
      box(x, y0 + 14, cw, cw, 14, on ? '#3A2F78' : 'rgba(247,246,242,0.08)');
      if (on) { c.strokeStyle = LILAC; c.lineWidth = 3; rr(x, y0 + 14, cw, cw, 14); c.stroke(); }
      c.globalAlpha = def.cost > g.money ? 0.4 : 1;
      building(id, x + 5, y0 + 19, cw - 10, null);
      c.globalAlpha = 1;
    }
    var pick = BUILDINGS[g.opts[g.pick]], cl = cellAt(g, g.cx, g.cy);
    var price = g.opts[g.pick] === 'knock' ? '+ $' + Math.floor(BUILDINGS[cl.b].cost / 2) + 'k' : '$' + pick.cost + 'k';
    text(L(pick.name) + '   ' + price, (TX + TC * TS) / 2, y0 + 126, 22, pick.cost > g.money ? CORAL : PAPER, 'center', '800');
    text(L(pick.gives), (TX + TC * TS) / 2, y0 + 158, 17, 'rgba(247,246,242,0.8)', 'center', '600');
    text(L(PICK_HELP), (TX + TC * TS) / 2, y0 - 16, 17, PAPER, 'center', '700');
  }

  function drawTownWon(g) {
    box(W / 2 - 420, 170, 840, 300, 32, 'rgba(13,12,24,0.92)');
    text(L(TOWN_WON), W / 2, 226, 44, EMBER, 'center', '800');
    var s = townStars(g);
    for (var i = 0; i < 3; i++) starShape(W / 2 - 60 + i * 60, 282, 24, i < s ? EMBER : 'rgba(247,246,242,0.15)');
    wrap(L(TOWN_WON_WHY).replace('{n}', g.money), W / 2, 336, 760, 22, PAPER, '600');
    text(g.level === TOWNS.length - 1 ? L(ALL_TOWNS) : L(NEXT_TOWN), W / 2, 434, 22, LILAC, 'center', '700');
  }

  // MARK: - The jobs

  var JOBS = {
    road: {make: newRoad, key: roadKey, step: roadStep, render: renderRoad, guide: 'road'},
    bridge: {make: newBridge, key: bridgeKey, step: bridgeStep, render: renderBridge, back: bridgeBack, guide: 'bridge'},
    town: {make: newTown, key: townKey, step: townStep, render: renderTown, back: townBack, guide: 'town'}
  };

  // MARK: - The screen

  var g = null, job = null, state = '', menu = 0, canvas = null, live = false, last = 0, motorAt = 0, clock = 0;
  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };

  function isBack(k) { return k === 27 || k === 8 || k === 4 || k === 461 || k === 10009 || (window.TV && TV.keys && k === TV.keys.back); }

  function frame(now) {
    if (!live) return;
    now = now || Date.now();
    var dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0.016;
    last = now; clock += dt;
    if (g && c) {
      if (state === 'play') {
        job.step(g, dt);
        job.render(g);
        if (clock - motorAt > 0.12 && window.Sfx && Sfx.motor) { motorAt = clock; Sfx.motor(g.phase === 'work' && (g.moving || g.step === 6) ? 0.35 : 0.06); }
      } else if (state === 'paused') { job.render(g); drawPause(menu); }
    }
    raf(frame);
  }

  function hush() { if (window.Sfx && Sfx.motor) Sfx.motor(0); }

  function begin() { g = job.make(); if (g.phase === 'pick') offer(g); state = 'play'; }

  function choose(api) {
    if (menu === 0) state = 'play';
    else if (menu === 1) { if (window.Guides) Guides.show(job.guide); }
    else if (menu === 2) begin();
    else api.close();
  }

  /** Opens a job: 'road', 'bridge' or 'town'. */
  function open(which) {
    job = JOBS[which] || JOBS.road;
    menu = 0; last = 0;
    begin();
    UI.open({
      cls: 'bt-builder',
      build: function (layer, api) {
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H; canvas.className = 'bd-canvas';
        layer.appendChild(canvas);
        c = canvas.getContext('2d');
        layer.bdApi = api;
      },
      key: function (k) {
        if (isBack(k)) return false;
        if (state === 'paused') {
          if (k === UP) { menu = (menu + MENU.length - 1) % MENU.length; sfx('hop'); }
          else if (k === DOWN) { menu = (menu + 1) % MENU.length; sfx('hop'); }
          else if (k === OK) choose(canvas.parentNode.bdApi);
          return true;
        }
        if (g.phase === 'finish') { if (k === OK) begin(); return true; }
        job.key(g, k);
        return true;
      },
      back: function () {
        // In a job, Back pauses; on the pause screen or the last card it leaves, back to Games.
        if (state === 'play' && g && job.back && job.back(g)) return true;
        if (state === 'play' && g && g.phase !== 'finish') { state = 'paused'; menu = 0; hush(); return true; }
        return false;
      },
      closed: function () {
        live = false; g = null; state = ''; c = null; canvas = null;
        if (window.Sfx && Sfx.stop) Sfx.stop();
      }
    });
    live = true;
    raf(frame);
  }

  return {open: open, rules: {TOOLS: TOOLS, TOOL_IDS: TOOL_IDS, ROAD_STEPS: ROAD_STEPS, newRoad: newRoad, offer: offer,
    roadKey: roadKey, roadStep: roadStep, stepDone: stepDone, L: L,
    SHAPES: SHAPES, MATERIALS: MATERIALS, STRENGTH: STRENGTH, BRIDGES: BRIDGES, newBridge: newBridge, judge: judge,
    bridgeKey: bridgeKey, bridgeStep: bridgeStep, bridgeBack: bridgeBack, renderBridge: renderBridge,
    NEEDS: NEEDS, NEED_IDS: NEED_IDS, BUILDINGS: BUILDINGS, TOWNS: TOWNS, newTown: newTown, startTown: startTown, townKey: townKey,
    townStep: townStep, townBack: townBack, townCompute: townCompute, townOptions: townOptions, renderTown: renderTown,
    // For the tests and a preview in a browser: draw on a stand-in canvas, and the game on screen.
    useContext: function (ctx) { c = ctx; }, renderRoad: renderRoad, drawPause: drawPause, playing: function () { return g; }}};
})();
