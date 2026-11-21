/*
 * Build it (ADR 0052): builder games for the remote. Build a road the way it is done for real, one job after another
 * (survey, clear, dig, drains, gravel, roll, asphalt, lines, open), picking the right machine for each job and then
 * driving it. More jobs (a bridge, a town) plug in beside it. Played with the remote alone: the arrows and OK, and Back
 * pauses (Back again leaves, back to Games). Bests stay on this TV, nothing is sent. Google TV runs this same file in
 * TableActivity's WebView (start "road"). The words are the game's own, in all five languages, like rcland.js.
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
    var h = 30 + lines * 29, y = g.phase === 'pick' ? 540 : 100;
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

  // MARK: - The jobs

  var JOBS = {
    road: {make: newRoad, key: roadKey, step: roadStep, render: renderRoad, guide: 'road'}
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

  /** Opens a job: 'road' (more to come). */
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
    // For the tests and a preview in a browser: draw on a stand-in canvas, and the game on screen.
    useContext: function (ctx) { c = ctx; }, renderRoad: renderRoad, drawPause: drawPause, playing: function () { return g; }}};
})();
