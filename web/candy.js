/*
 * London's Candy Land (ADR 0053): a dreamy candy world to wander with the remote. A path of candy ribbon joins six
 * places: the Cloud Bakery (decorate a cake), the Rainbow Ride (fly a unicorn through the rainbow), the Lolly Shower
 * (catch sweets falling from the clouds), the Candy Garden (plant, water and pick), the Sweet Shop (give each friend
 * the treat they wish for) and the Dress-up Castle (hair, outfit, crown, wings and a friend to walk with).
 * Everything is kind: there is no losing, no game over, no timer that punishes. A miss is a snack for the bunny, a
 * different treat is a lovely surprise, and every step earns sparkles and a few warm words. Sparkles fill a jar, and
 * each full jar brings a new friend to Candy Land. Played with the arrows and OK; Back goes up one level (a place to
 * the map, the map to Games). Saved on this TV only (btv.candy), nothing is sent. Google TV runs this same file in
 * TableActivity's WebView (start "candy"). The words are the game's own, in all five languages, like guides.js.
 * Plain ES5: one canvas, plain shapes, nothing to download, no emoji font needed.
 */
var Candy = (function () {
  'use strict';

  var W = 1280, H = 720, TAU = Math.PI * 2;
  var KEY = 'btv.candy';
  var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;
  var PINK = '#FF8FC8', HOT = '#FF5FA2', ROSE = '#FFD6EC', LILAC = '#C9A7FF', VIOLET = '#6E3DDB', MINT = '#8FE3CF',
    LEMON = '#FFE58A', PEACH = '#FFC2A1', SKY = '#BDE6FF', CHOC = '#7A4A2E', CREAM = '#FFF8EE', INK = '#4A2D5C',
    WHITE = '#FFFFFF', GOLD = '#FFC93C';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  /** One line in the TV's language: [pt, en, es, de, ru]. */
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function fill(t, n) { return L(t).replace('{n}', n); }

  var c = null;

  // MARK: - Words

  var TITLE = ['A Terra dos Doces da London', 'London\'s Candy Land', 'La Tierra de los Dulces de London', 'Londons Zuckerland', 'Сладкая страна Лондон'];
  var SPARKLES = ['Brilhos', 'Sparkles', 'Destellos', 'Glitzer', 'Блёстки'];
  var JAR = ['Mais {n} brilhos para um novo amigo', '{n} more sparkles for a new friend', '{n} destellos más para un nuevo amigo', 'Noch {n} Glitzer bis zum neuen Freund', 'Ещё {n} блёсток до нового друга'];
  var JAR_FULL = ['Todos os amigos estão aqui!', 'All your friends are here!', '¡Todos tus amigos están aquí!', 'Alle Freunde sind da!', 'Все друзья в сборе!'];
  var MAP_HELP = ['◀ ▶ andar  ·  OK entrar  ·  Voltar sair', '◀ ▶ walk  ·  OK go in  ·  Back to leave', '◀ ▶ caminar  ·  OK entrar  ·  Atrás salir', '◀ ▶ laufen  ·  OK hinein  ·  Zurück verlassen', '◀ ▶ идти  ·  OK войти  ·  «Назад» выйти'];
  var SUPERSTAR = ['superestrela', 'superstar', 'superestrella', 'Superstar', 'звёздочка'];
  var HELLO = [
    ['Kia ora, {n}! Onde vamos brincar hoje?', 'Kia ora, {n}! Where shall we play today?', '¡Kia ora, {n}! ¿Dónde jugamos hoy?', 'Kia ora, {n}! Wo spielen wir heute?', 'Киа ора, {n}! Где поиграем сегодня?'],
    ['Que bom te ver, {n}! Os unicórnios sentiram sua falta!', 'Welcome back, {n}! The unicorns missed you!', '¡Hola otra vez, {n}! ¡Los unicornios te echaban de menos!', 'Schön, dass du da bist, {n}! Die Einhörner haben dich vermisst!', 'С возвращением, {n}! Единороги скучали!'],
    ['Oi, {n}! Hoje tudo é possível!', 'Hi {n}! Today anything is possible!', '¡Hola, {n}! ¡Hoy todo es posible!', 'Hallo {n}! Heute ist alles möglich!', 'Привет, {n}! Сегодня возможно всё!']];
  /** Warm words for doing anything at all. */
  var CHEERS = [
    ['Você é incrível!', 'You\'re amazing!', '¡Eres increíble!', 'Du bist toll!', 'Ты просто чудо!'],
    ['Que doce!', 'Sweet as!', '¡Qué dulce!', 'Zuckersüß!', 'Сладко-пресладко!'],
    ['Ka pai! Que maravilha!', 'Ka pai! That\'s wonderful!', '¡Ka pai! ¡Qué maravilla!', 'Ka pai! Wunderbar!', 'Ка пай! Чудесно!'],
    ['Você faz tudo brilhar!', 'You make everything sparkle!', '¡Haces que todo brille!', 'Bei dir glitzert alles!', 'С тобой всё сверкает!'],
    ['Que superestrela!', 'What a superstar!', '¡Qué superestrella!', 'Was für ein Superstar!', 'Вот это суперзвезда!'],
    ['Que ideia ótima!', 'What a great idea!', '¡Qué buena idea!', 'Was für eine tolle Idee!', 'Какая отличная идея!'],
    ['Os unicórnios estão torcendo por você!', 'The unicorns are cheering for you!', '¡Los unicornios te aplauden!', 'Die Einhörner jubeln dir zu!', 'Единороги тебе аплодируют!'],
    ['Linda escolha!', 'Beautiful choice!', '¡Preciosa elección!', 'Wunderschöne Wahl!', 'Прекрасный выбор!'],
    ['Você é uma estrela!', 'You\'re a star!', '¡Eres una estrella!', 'Du bist ein Stern!', 'Ты звёздочка!'],
    ['Uau, olha só!', 'Wow, look at you go!', '¡Guau, mírate!', 'Wow, schau dich an!', 'Ух ты, как здорово!'],
    ['Mágico! Pura magia!', 'Magic! Pure magic!', '¡Magia! ¡Pura magia!', 'Magisch! Reiner Zauber!', 'Волшебно! Чистое волшебство!'],
    ['Sua bondade faz a Terra dos Doces brilhar!', 'Your kindness makes Candy Land shine!', '¡Tu bondad hace brillar la Tierra de los Dulces!', 'Deine Freundlichkeit lässt das Zuckerland leuchten!', 'Твоя доброта освещает Сладкую страну!'],
    ['Melhor dia de todos!', 'Best day ever!', '¡El mejor día!', 'Der schönste Tag!', 'Лучший день!'],
    ['Conseguiu! Viva!', 'You did it! Hooray!', '¡Lo lograste! ¡Hurra!', 'Geschafft! Hurra!', 'Получилось! Ура!'],
    ['Poder do brilho!', 'Sparkle power!', '¡Poder brillante!', 'Glitzerkraft!', 'Сила блёсток!'],
    ['Todo mundo na Terra dos Doces adora você!', 'Everyone in Candy Land loves you!', '¡En la Tierra de los Dulces todos te quieren!', 'Im Zuckerland haben dich alle lieb!', 'Все в Сладкой стране тебя любят!']];
  /** For a different treat, or a sweet that got away: never a mistake, always something nice. */
  var KIND = [
    ['Oba, uma surpresa! Adorei!', 'Ooh, a surprise! I love it!', '¡Uy, una sorpresa! ¡Me encanta!', 'Oh, eine Überraschung! Ich liebe sie!', 'Ой, сюрприз! Обожаю!'],
    ['Boa tentativa! O coelhinho ganha um lanche!', 'Great try! The bunny gets a snack!', '¡Buen intento! ¡El conejito merienda!', 'Toller Versuch! Das Häschen bekommt einen Snack!', 'Отличная попытка! Зайчику перекус!'],
    ['Hum! Obrigado por dividir!', 'Yum! Thank you for sharing!', '¡Ñam! ¡Gracias por compartir!', 'Mjam! Danke fürs Teilen!', 'Ням! Спасибо, что поделились!']];
  var BACK_MAP = ['Voltar mapa', 'Back to the map', 'Atrás mapa', 'Zurück zur Karte', '«Назад» на карту'];
  var NEW_FRIEND = ['Um novo amigo veio brincar!', 'A new friend came to play!', '¡Un nuevo amigo vino a jugar!', 'Ein neuer Freund ist zum Spielen gekommen!', 'Новый друг пришёл поиграть!'];
  var CARRY_ON = ['OK continuar', 'OK to carry on', 'OK continuar', 'OK weiter', 'OK дальше'];
  var FRIEND_TIP = ['Ele pode passear com você: Castelo das Fantasias › Amigo.', 'They can walk with you: Dress-up Castle › Friend.', 'Puede pasear contigo: Castillo de Disfraces › Amigo.', 'Er kann mit dir spazieren: Verkleide-Schloss › Freund.', 'Он может гулять с тобой: Замок нарядов › Друг.'];

  // MARK: - Places on the map

  var PLACES = [
    {id: 'bakery', x: 190, y: 560,
      name: ['Confeitaria das Nuvens', 'Cloud Bakery', 'Pastelería de las Nubes', 'Wolkenbäckerei', 'Облачная пекарня'],
      about: ['Decore um bolo mágico', 'Decorate a magic cake', 'Decora una tarta mágica', 'Verziere einen Zauberkuchen', 'Украсьте волшебный торт']},
    {id: 'garden', x: 440, y: 610,
      name: ['Jardim dos Doces', 'Candy Garden', 'Jardín de Dulces', 'Zuckergarten', 'Сладкий сад'],
      about: ['Plante, regue e colha doces', 'Plant, water and pick sweet treats', 'Planta, riega y recoge dulces', 'Pflanzen, gießen und Süßes ernten', 'Сажайте, поливайте и собирайте сладости']},
    {id: 'shop', x: 690, y: 575,
      name: ['Loja de Doces', 'Sweet Shop', 'Tienda de Dulces', 'Süßigkeitenladen', 'Кондитерская лавка'],
      about: ['Dê a cada amigo o doce que ele quer', 'Give each friend the treat they wish for', 'Dale a cada amigo el dulce que quiere', 'Gib jedem Freund die Süßigkeit, die er sich wünscht', 'Угостите каждого друга тем, что он хочет']},
    {id: 'catch', x: 950, y: 625,
      name: ['Chuva de Doces', 'Lolly Shower', 'Lluvia de Golosinas', 'Bonbonregen', 'Конфетный дождь'],
      about: ['Pegue os doces que caem das nuvens', 'Catch the sweets falling from the clouds', 'Atrapa los dulces que caen de las nubes', 'Fang die Bonbons, die aus den Wolken fallen', 'Ловите конфеты, падающие с облаков']},
    {id: 'ride', x: 1120, y: 450,
      name: ['Passeio do Arco-íris', 'Rainbow Ride', 'Paseo del Arcoíris', 'Regenbogenritt', 'Радужная прогулка'],
      about: ['Voe num unicórnio pelo arco-íris', 'Fly a unicorn through the rainbow', 'Vuela en unicornio por el arcoíris', 'Flieg mit dem Einhorn durch den Regenbogen', 'Летите на единороге сквозь радугу']},
    {id: 'dress', x: 860, y: 300,
      name: ['Castelo das Fantasias', 'Dress-up Castle', 'Castillo de Disfraces', 'Verkleide-Schloss', 'Замок нарядов'],
      about: ['Escolha cabelo, roupa, coroa e asas', 'Pick your hair, outfit, crown and wings', 'Elige pelo, ropa, corona y alas', 'Wähl Frisur, Outfit, Krone und Flügel', 'Выберите причёску, наряд, корону и крылья']}
  ];
  var PATH = [[40, 520], [190, 560], [310, 640], [440, 610], [570, 560], [690, 575], [820, 645], [950, 625], [1070, 570],
    [1120, 450], [1060, 360], [960, 322], [860, 300]];
  var RIVER = [[1300, 170], [1180, 250], [1060, 320], [930, 372], [800, 384], [660, 392], [520, 386], [420, 384]];

  // MARK: - Friends: one more each time the sparkle jar fills

  var FRIENDS = [
    {id: 'unicorn', name: 'Twinkle', colour: WHITE, kind: ['unicórnio', 'unicorn', 'unicornio', 'Einhorn', 'единорог'], at: 0},
    {id: 'bunny', name: 'Bubbles', colour: WHITE, kind: ['coelhinho', 'bunny', 'conejito', 'Häschen', 'зайчик'], at: 25},
    {id: 'kitten', name: 'Mochi', colour: '#FFC79E', kind: ['gatinho', 'kitten', 'gatito', 'Kätzchen', 'котёнок'], at: 60},
    {id: 'bear', name: 'Gummy', colour: '#FF7A9C', kind: ['ursinho de goma', 'gummy bear', 'osito de gominola', 'Gummibärchen', 'мармеладный мишка'], at: 110},
    {id: 'dragon', name: 'Puff', colour: MINT, kind: ['dragãozinho', 'baby dragon', 'dragoncito', 'Babydrache', 'дракончик'], at: 170},
    {id: 'owl', name: 'Hoot', colour: LILAC, kind: ['corujinha', 'owl', 'búho', 'Eule', 'совёнок'], at: 240},
    {id: 'penguin', name: 'Pip', colour: '#5B6FB5', kind: ['pinguim', 'penguin', 'pingüino', 'Pinguin', 'пингвин'], at: 320},
    {id: 'puppy', name: 'Biscuit', colour: '#E8B887', kind: ['cachorrinho', 'puppy', 'perrito', 'Welpe', 'щенок'], at: 410}
  ];
  var FRIEND_SPOTS = [[1215, 345], [95, 660], [330, 520], [560, 672], [800, 500], [1060, 690], [1220, 610], [600, 270]];

  // MARK: - Treats

  var TREATS = [
    {id: 'lolly', name: ['Pirulito', 'Lollipop', 'Piruleta', 'Lutscher', 'Леденец']},
    {id: 'cupcake', name: ['Cupcake', 'Cupcake', 'Magdalena', 'Cupcake', 'Кекс']},
    {id: 'donut', name: ['Rosquinha', 'Donut', 'Dónut', 'Donut', 'Пончик']},
    {id: 'icecream', name: ['Sorvete', 'Ice cream', 'Helado', 'Eis', 'Мороженое']},
    {id: 'cane', name: ['Bengala doce', 'Candy cane', 'Bastón de caramelo', 'Zuckerstange', 'Карамельная трость']},
    {id: 'macaron', name: ['Macaron', 'Macaron', 'Macaron', 'Macaron', 'Макарон']},
    {id: 'sweet', name: ['Bala', 'Lolly', 'Caramelo', 'Bonbon', 'Конфета']},
    {id: 'gumdrop', name: ['Jujuba', 'Gumdrop', 'Gominola', 'Gummibonbon', 'Мармеладка']},
    {id: 'floss', name: ['Algodão-doce', 'Candy floss', 'Algodón de azúcar', 'Zuckerwatte', 'Сахарная вата']},
    {id: 'choc', name: ['Chocolate', 'Chocolate', 'Chocolate', 'Schokolade', 'Шоколадка']}
  ];

  // MARK: - The bakery's words

  var CAKE_STEPS = [['Escolha seu bolo', 'Choose your cake', 'Elige tu tarta', 'Such dir einen Kuchen aus', 'Выберите торт'],
    ['Escolha a cobertura', 'Pick the icing', 'Elige el glaseado', 'Wähl die Glasur', 'Выберите глазурь'],
    ['Coloque as coisas gostosas', 'Add the yummy toppings', 'Pon cosas ricas encima', 'Leg leckere Sachen drauf', 'Добавьте вкусные украшения']];
  var SHAPES = [['Redondo', 'Round', 'Redonda', 'Rund', 'Круглый'], ['Coração', 'Heart', 'Corazón', 'Herz', 'Сердце'], ['Três andares', 'Three tiers', 'Tres pisos', 'Drei Stöcke', 'Три яруса']];
  var ICINGS = [
    {colour: '#FF9EC6', name: ['Morango', 'Strawberry', 'Fresa', 'Erdbeere', 'Клубника']},
    {colour: '#FFF1D2', name: ['Baunilha', 'Vanilla', 'Vainilla', 'Vanille', 'Ваниль']},
    {colour: '#8A5A3C', name: ['Chocolate', 'Chocolate', 'Chocolate', 'Schokolade', 'Шоколад']},
    {colour: '#A8EBD5', name: ['Menta', 'Mint', 'Menta', 'Minze', 'Мята']},
    {colour: '#C3B8FF', name: ['Mirtilo', 'Blueberry', 'Arándano', 'Blaubeere', 'Черника']},
    {colour: '#FFEB8F', name: ['Limão', 'Lemon', 'Limón', 'Zitrone', 'Лимон']}];
  var TOPPINGS = [
    {id: 'strawberry', name: ['Morango', 'Strawberry', 'Fresa', 'Erdbeere', 'Клубника']},
    {id: 'cherry', name: ['Cereja', 'Cherry', 'Cereza', 'Kirsche', 'Вишня']},
    {id: 'candle', name: ['Vela', 'Candle', 'Vela', 'Kerze', 'Свечка']},
    {id: 'heart', name: ['Coração', 'Heart', 'Corazón', 'Herz', 'Сердечко']},
    {id: 'macaron', name: ['Macaron', 'Macaron', 'Macaron', 'Macaron', 'Макарон']},
    {id: 'lolly', name: ['Pirulito', 'Lollipop', 'Piruleta', 'Lutscher', 'Леденец']},
    {id: 'star', name: ['Estrela', 'Star', 'Estrella', 'Stern', 'Звезда']},
    {id: 'horn', name: ['Chifre de unicórnio', 'Unicorn horn', 'Cuerno de unicornio', 'Einhorn-Horn', 'Рог единорога']},
    {id: 'sprinkles', name: ['Granulado', 'Sprinkles', 'Virutas', 'Streusel', 'Посыпка']}];
  var ALL_DONE = ['Pronto!', 'All done!', '¡Listo!', 'Fertig!', 'Готово!'];
  var CAKE_HELP = [['◀ ▶ escolher  ·  OK próximo  ·  Voltar mapa', '◀ ▶ choose  ·  OK next  ·  Back to the map', '◀ ▶ elegir  ·  OK siguiente  ·  Atrás mapa', '◀ ▶ wählen  ·  OK weiter  ·  Zurück zur Karte', '◀ ▶ выбрать  ·  OK дальше  ·  «Назад» на карту'],
    ['◀ ▶ escolher  ·  OK colocar  ·  Voltar mapa', '◀ ▶ choose  ·  OK to add it  ·  Back to the map', '◀ ▶ elegir  ·  OK poner  ·  Atrás mapa', '◀ ▶ wählen  ·  OK drauflegen  ·  Zurück zur Karte', '◀ ▶ выбрать  ·  OK положить  ·  «Назад» на карту']];
  var CAKE_DONE = ['É o bolo mais lindo de toda a Terra dos Doces!', 'That\'s the most beautiful cake in all of Candy Land!', '¡Es la tarta más bonita de toda la Tierra de los Dulces!', 'Das ist der schönste Kuchen im ganzen Zuckerland!', 'Это самый красивый торт во всей Сладкой стране!'];
  var CAKE_AGAIN = ['OK fazer outro bolo  ·  Voltar mapa', 'OK bake another  ·  Back to the map', 'OK otra tarta  ·  Atrás mapa', 'OK noch einen backen  ·  Zurück zur Karte', 'OK испечь ещё  ·  «Назад» на карту'];
  var CAKE_FULL = ['O bolo está cheio de delícias! Escolha Pronto!', 'Your cake is full of yummy things! Pick All done!', '¡Tu tarta está llena de cosas ricas! ¡Elige Listo!', 'Dein Kuchen ist voll mit Leckereien! Wähl Fertig!', 'Торт полон вкусностей! Выберите «Готово»!'];

  // MARK: - The ride's, the shower's, the garden's, the shop's and the castle's words

  var RIDE_HELP = ['▲ ▼ voar  ·  OK giro de brilho  ·  Voltar mapa', '▲ ▼ fly up and down  ·  OK sparkle twirl  ·  Back to the map', '▲ ▼ volar  ·  OK giro brillante  ·  Atrás mapa', '▲ ▼ fliegen  ·  OK Glitzerdreher  ·  Zurück zur Karte', '▲ ▼ лететь  ·  OK блестящий кружок  ·  «Назад» на карту'];
  var RIDE_DONE = ['Você voou até o Castelo do Arco-íris!', 'You flew all the way to the Rainbow Castle!', '¡Volaste hasta el Castillo del Arcoíris!', 'Du bist bis zum Regenbogenschloss geflogen!', 'Вот и Радужный замок! Ура!'];
  var RAINBOW = ['Arco-íris!', 'Rainbow!', '¡Arcoíris!', 'Regenbogen!', 'Радуга!'];
  var CASTLE_NEAR = ['O castelo está chegando!', 'The castle is nearly here!', '¡Ya casi llegamos al castillo!', 'Das Schloss ist gleich da!', 'Замок совсем близко!'];
  var GOT = ['Doces: {n}', 'Treats: {n}', 'Dulces: {n}', 'Süßes: {n}', 'Сладостей: {n}'];
  var AGAIN = ['OK de novo  ·  Voltar mapa', 'OK to play again  ·  Back to the map', 'OK otra vez  ·  Atrás mapa', 'OK nochmal  ·  Zurück zur Karte', 'OK ещё раз  ·  «Назад» на карту'];
  var CATCH_HELP = ['◀ ▶ mover a cesta  ·  Voltar mapa', '◀ ▶ move your basket  ·  Back to the map', '◀ ▶ mover la cesta  ·  Atrás mapa', '◀ ▶ Korb bewegen  ·  Zurück zur Karte', '◀ ▶ двигать корзинку  ·  «Назад» на карту'];
  var CATCH_DONE = ['Você pegou {n} doces! Mãos mágicas!', 'You caught {n} sweets! Magic hands!', '¡Atrapaste {n} dulces! ¡Manos mágicas!', 'Du hast {n} Bonbons gefangen! Zauberhände!', 'Поймано конфет: {n}! Волшебные ручки!'];
  var GOLD_STAR = ['Estrela dourada!', 'Golden star!', '¡Estrella dorada!', 'Goldstern!', 'Золотая звезда!'];
  var GARDEN_HELP = ['Setas escolhem  ·  OK plantar, regar ou colher  ·  Voltar mapa', 'Arrows pick a spot  ·  OK to plant, water or pick  ·  Back to the map', 'Flechas eligen  ·  OK plantar, regar o recoger  ·  Atrás mapa', 'Pfeile wählen  ·  OK pflanzen, gießen, ernten  ·  Zurück zur Karte', 'Стрелки выбирают  ·  OK посадить, полить, собрать  ·  «Назад» на карту'];
  var PLANT_HERE = ['Plantar aqui', 'Plant here', 'Plantar aquí', 'Hier pflanzen', 'Посадить здесь'];
  var WATER_ME = ['Me regue, por favor!', 'Water me, please!', '¡Riégame, por favor!', 'Gieß mich bitte!', 'Полей меня, пожалуйста!'];
  var GROWING = ['Crescendo...', 'Growing...', 'Creciendo...', 'Wächst...', 'Растёт...'];
  var READY = ['Pronto para colher!', 'Ready to pick!', '¡Listo para recoger!', 'Bereit zum Ernten!', 'Можно собирать!'];
  var PLANTED = ['Plantou! Agora um pouco de água.', 'Planted! Now a little water.', '¡Plantado! Ahora un poco de agua.', 'Gepflanzt! Jetzt ein bisschen Wasser.', 'Посажено! Теперь немного воды.'];
  var WATERED = ['Glu, glu! Agora o sol faz o resto.', 'Glug glug! The sunshine does the rest.', '¡Glu, glu! El sol hace el resto.', 'Gluck, gluck! Die Sonne macht den Rest.', 'Буль-буль! Остальное сделает солнышко.'];
  var PATIENT = ['Está crescendo, quase lá!', 'It\'s growing, nearly there!', '¡Está creciendo, casi listo!', 'Es wächst, gleich fertig!', 'Растёт, почти готово!'];
  var GREW = ['Seu jardim cresceu enquanto você estava fora!', 'Your garden grew while you were away!', '¡Tu jardín creció mientras no estabas!', 'Dein Garten ist gewachsen, während du weg warst!', 'Пока тебя не было, сад подрос!'];
  var PLANTS = [
    {id: 'lolly', name: ['Flor pirulito', 'Lollipop flower', 'Flor piruleta', 'Lutscherblume', 'Цветок-леденец']},
    {id: 'cane', name: ['Bengala doce', 'Candy cane', 'Bastón de caramelo', 'Zuckerstange', 'Карамельная трость']},
    {id: 'gumdrop', name: ['Arbusto de jujuba', 'Gumdrop bush', 'Arbusto de gominolas', 'Gummibonbon-Busch', 'Мармеладный куст']},
    {id: 'cupcake', name: ['Árvore de cupcake', 'Cupcake tree', 'Árbol de magdalenas', 'Cupcake-Baum', 'Дерево кексов']},
    {id: 'floss', name: ['Flor de algodão-doce', 'Candy floss flower', 'Flor de algodón de azúcar', 'Zuckerwatteblume', 'Цветок сахарной ваты']},
    {id: 'swirl', name: ['Espiral arco-íris', 'Rainbow swirl', 'Remolino arcoíris', 'Regenbogenwirbel', 'Радужная спираль']}];
  var SHOP_HELP = ['◀ ▶ escolher um doce  ·  OK entregar  ·  Voltar mapa', '◀ ▶ pick a treat  ·  OK to give it  ·  Back to the map', '◀ ▶ elegir un dulce  ·  OK dar  ·  Atrás mapa', '◀ ▶ Süßigkeit wählen  ·  OK geben  ·  Zurück zur Karte', '◀ ▶ выбрать угощение  ·  OK отдать  ·  «Назад» на карту'];
  var WISH = ['Eu adoraria...', 'I\'d love...', 'Me encantaría...', 'Ich hätte so gern...', 'Мне бы...'];
  var EXACTLY = [['Era bem o que eu queria! Obrigado!', 'Exactly what I wished for! Thank you!', '¡Justo lo que quería! ¡Gracias!', 'Genau das hab ich mir gewünscht! Danke!', 'Именно то, что я хотел! Спасибо!'],
    ['Você é a melhor dona de loja!', 'You\'re the best shopkeeper ever!', '¡Eres la mejor tendera del mundo!', 'Du bist die beste Ladenbesitzerin!', 'Лучшая хозяйка лавки на свете!'],
    ['Que delícia! Você é tão gentil!', 'Yummy! You\'re so kind!', '¡Qué rico! ¡Eres muy amable!', 'Lecker! Du bist so lieb!', 'Вкуснятина! Спасибо за доброту!']];
  var SHOP_DONE = ['Hora de fechar! Você deixou {n} amigos felizes!', 'Closing time! You made {n} friends happy!', '¡Hora de cerrar! ¡Hiciste felices a {n} amigos!', 'Feierabend! Du hast {n} Freunde glücklich gemacht!', 'Лавка закрывается! Счастливых друзей: {n}!'];
  var SHOP_AGAIN = ['OK abrir de novo  ·  Voltar mapa', 'OK open again  ·  Back to the map', 'OK abrir otra vez  ·  Atrás mapa', 'OK nochmal öffnen  ·  Zurück zur Karte', 'OK открыть снова  ·  «Назад» на карту'];
  var DRESS_HELP = ['▲ ▼ escolher  ·  ◀ ▶ trocar  ·  OK girar  ·  Voltar mapa', '▲ ▼ choose  ·  ◀ ▶ change  ·  OK to twirl  ·  Back to the map', '▲ ▼ elegir  ·  ◀ ▶ cambiar  ·  OK girar  ·  Atrás mapa', '▲ ▼ wählen  ·  ◀ ▶ ändern  ·  OK drehen  ·  Zurück zur Karte', '▲ ▼ выбрать  ·  ◀ ▶ сменить  ·  OK покружиться  ·  «Назад» на карту'];
  var LOOKS_GOOD = [['Que visual mágico!', 'What a magical look!', '¡Qué look tan mágico!', 'Was für ein zauberhafter Look!', 'Какой волшебный образ!'],
    ['Que estilo!', 'So stylish!', '¡Con mucho estilo!', 'So schick!', 'Очень стильно!'],
    ['Lindo demais!', 'Absolutely gorgeous!', '¡Precioso!', 'Wunderschön!', 'Просто прелесть!'],
    ['Pronto para o baile dos unicórnios!', 'Ready for the unicorn ball!', '¡Lista para el baile de los unicornios!', 'Bereit für den Einhornball!', 'Готово для бала единорогов!']];
  var NOTHING = ['Nada', 'Nothing', 'Nada', 'Nichts', 'Ничего'];
  /** The castle's rows: what ◀ ▶ changes. Colour rows have swatches; the friend row lists the friends who have come. */
  var PARTS = [
    {id: 'skin', name: ['Pele', 'Skin', 'Piel', 'Haut', 'Кожа'], colours: ['#FFE0C7', '#F5C9A3', '#D9A07A', '#A86F4C', '#6E4630']},
    {id: 'hair', name: ['Cabelo', 'Hair', 'Pelo', 'Frisur', 'Причёска'], options: [['Longo', 'Long', 'Largo', 'Lang', 'Длинные'],
      ['Maria-chiquinha', 'Bunches', 'Coletas', 'Zöpfchen', 'Хвостики'], ['Coque', 'Bun', 'Moño', 'Dutt', 'Пучок'],
      ['Cachos', 'Curls', 'Rizos', 'Locken', 'Кудри'], ['Curto', 'Short', 'Corto', 'Kurz', 'Короткие']]},
    {id: 'hairCol', name: ['Cor do cabelo', 'Hair colour', 'Color del pelo', 'Haarfarbe', 'Цвет волос'], colours: ['#6B4226', '#F2C94C', '#2B1D17', '#C2552E', '#FF8FC8', '#A98BFF', '#6EC6FF']},
    {id: 'outfit', name: ['Roupa', 'Outfit', 'Ropa', 'Outfit', 'Наряд'], options: [['Vestido de princesa', 'Princess dress', 'Vestido de princesa', 'Prinzessinnenkleid', 'Платье принцессы'],
      ['Vestido de festa', 'Party dress', 'Vestido de fiesta', 'Partykleid', 'Праздничное платье'], ['Tutu', 'Tutu', 'Tutú', 'Tutu', 'Пачка'],
      ['Macacão', 'Overalls', 'Peto', 'Latzhose', 'Комбинезон']]},
    {id: 'outCol', name: ['Cor da roupa', 'Outfit colour', 'Color de la ropa', 'Outfit-Farbe', 'Цвет наряда'], colours: ['#FF8FC8', '#C9A7FF', '#8FE3CF', '#FFE58A', '#8FC8FF', '#FFB38A', '#FF6F91']},
    {id: 'head', name: ['Na cabeça', 'On your head', 'En la cabeza', 'Auf dem Kopf', 'На голове'], options: [NOTHING, ['Tiara', 'Tiara', 'Tiara', 'Diadem', 'Диадема'],
      ['Coroa', 'Crown', 'Corona', 'Krone', 'Корона'], ['Coroa de flores', 'Flower crown', 'Corona de flores', 'Blumenkranz', 'Венок'],
      ['Laço', 'Bow', 'Lazo', 'Schleife', 'Бант'], ['Chifre de unicórnio', 'Unicorn horn', 'Cuerno de unicornio', 'Einhorn-Horn', 'Рог единорога']]},
    {id: 'wings', name: ['Asas', 'Wings', 'Alas', 'Flügel', 'Крылья'], options: [NOTHING, ['Fada', 'Fairy', 'Hada', 'Fee', 'Фея'],
      ['Borboleta', 'Butterfly', 'Mariposa', 'Schmetterling', 'Бабочка'], ['Arco-íris', 'Rainbow', 'Arcoíris', 'Regenbogen', 'Радуга']]},
    {id: 'pet', name: ['Amigo', 'Friend', 'Amigo', 'Freund', 'Друг']}];

  // MARK: - Saved on this TV

  function fresh() {
    return {sparkles: 0, friends: 1, seen: 1, look: {skin: 1, hair: 0, hairCol: 0, outfit: 0, outCol: 0, head: 1, wings: 1, pet: 0},
      garden: [], nextPlant: 0, cakes: 0, rides: 0, caught: 0, served: 0, picked: 0};
  }
  var save = fresh();
  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) {}
    var out = fresh();
    if (s && typeof s === 'object') {
      for (var k in out) if (out.hasOwnProperty(k) && typeof s[k] === typeof out[k] && k !== 'look') out[k] = s[k];
      if (s.look && typeof s.look === 'object') for (var p in out.look) if (typeof s.look[p] === 'number') out.look[p] = s.look[p];
    }
    return out;
  }
  function store() { try { window.localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  /** How many friends the sparkles have brought so far. */
  function friendsFor(n) { var f = 0; for (var i = 0; i < FRIENDS.length; i++) if (n >= FRIENDS[i].at) f = i + 1; return f; }
  function nextFriendAt() { return save.friends < FRIENDS.length ? FRIENDS[save.friends].at : 0; }

  // MARK: - Sounds, made on the TV (soft and sweet), and a voice where the TV has one

  var actx = null;
  function audio() {
    if (window.Prefs && Prefs.sounds && !Prefs.sounds()) return null;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { actx = actx || new Ctx(); if (actx.resume) actx.resume(); } catch (e) { return null; }
    return actx;
  }
  function tone(a, f, at, len, type, peak, slide) {
    var o = a.createOscillator(), v = a.createGain(), t = a.currentTime + 0.02 + at;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(peak || 0.1, t + 0.015);
    v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(v); v.connect(a.destination);
    o.start(t); o.stop(t + len + 0.05);
  }
  function sound(kind) {
    var a = audio();
    if (!a) return;
    try {
      var i, n;
      if (kind === 'step') tone(a, 880, 0, 0.08, 'sine', 0.06, 1100);
      else if (kind === 'pick') tone(a, 1175, 0, 0.07, 'triangle', 0.06);
      else if (kind === 'pop') { tone(a, 600, 0, 0.09, 'sine', 0.12, 1300); tone(a, 1568, 0.05, 0.12, 'sine', 0.05); }
      else if (kind === 'twinkle') { n = [1568, 2093, 2637, 3136]; for (i = 0; i < n.length; i++) tone(a, n[i], i * 0.06, 0.25, 'sine', 0.05); }
      else if (kind === 'chime') { n = [784, 988, 1175, 1568]; for (i = 0; i < n.length; i++) tone(a, n[i], i * 0.07, 0.4, 'triangle', 0.07); }
      else if (kind === 'yay') { n = [523, 659, 784, 1047, 784, 1047, 1319]; for (i = 0; i < n.length; i++) tone(a, n[i], i * 0.11, 0.35, 'triangle', 0.09); }
      else if (kind === 'whoosh') tone(a, 300, 0, 0.45, 'sine', 0.07, 1400);
      else if (kind === 'plop') tone(a, 420, 0, 0.14, 'sine', 0.1, 180);
      else if (kind === 'munch') { tone(a, 260, 0, 0.06, 'square', 0.03); tone(a, 220, 0.1, 0.06, 'square', 0.03); tone(a, 260, 0.2, 0.06, 'square', 0.03); }
      else if (kind === 'water') { for (i = 0; i < 5; i++) tone(a, 900 + Math.random() * 900, i * 0.07, 0.08, 'sine', 0.04, 500); }
      else if (kind === 'friend') { n = [659, 784, 988, 1319, 1568, 1976]; for (i = 0; i < n.length; i++) tone(a, n[i], i * 0.09, 0.5, 'sine', 0.08); }
    } catch (e) {}
  }
  /** Says it out loud where the TV can (most browsers, some TVs); quiet where it can't, or with sounds off. */
  function speak(text) {
    try {
      if (window.Prefs && Prefs.sounds && !Prefs.sounds()) return;
      var sp = window.speechSynthesis, U = window.SpeechSynthesisUtterance;
      if (!sp || !U) return;
      sp.cancel();
      var u = new U(text);
      var lang = window.I18N ? I18N.lang : 'en';
      u.lang = {pt: 'pt-BR', en: 'en-NZ', es: 'es-ES', de: 'de-DE', ru: 'ru-RU'}[lang] || 'en-NZ';
      u.pitch = 1.35; u.rate = 0.95; u.volume = 0.9;
      sp.speak(u);
    } catch (e) {}
  }
  function hush() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }

  // MARK: - The game's state

  var scene = 'map', clock = 0, here = 0, walk = null, msg = null, parts = [], floats = [], pending = 0;
  var bake = null, ride = null, shower = null, garden = null, shop = null, dress = null, newFriend = -1;
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pickOf(list) { return list[Math.floor(rnd() * list.length)]; }

  function playerName() {
    try {
      var p = window.Profiles && Profiles.current();
      if (p && p.name && !p.together) return p.name;
    } catch (e) {}
    return L(SUPERSTAR);
  }

  /** A few warm words at the top of the screen, said out loud too. */
  function say(text, loud) {
    msg = {text: text, t: 0};
    if (loud !== false) speak(text);
  }
  var lastCheer = -1;
  function cheer() {
    var i = Math.floor(rnd() * CHEERS.length);
    if (i === lastCheer) i = (i + 1) % CHEERS.length;
    lastCheer = i;
    say(L(CHEERS[i]));
  }

  /** Sparkles into the jar, with a little star floating up from where they were earned. */
  function give(n, x, y) {
    save.sparkles += n;
    floats.push({x: x, y: y, n: n, t: 0});
    var f = friendsFor(save.sparkles);
    if (f > save.friends) { pending = f; save.friends = f; }
    store();
  }

  function part(x, y, vx, vy, life, col, size, kind, grav) {
    if (parts.length > 260) parts.shift();
    parts.push({x: x, y: y, vx: vx, vy: vy, life: life, max: life, col: col, s: size, k: kind || 0, rot: rnd() * TAU, vr: (rnd() - 0.5) * 8, g: grav || 0});
  }
  var BURST = [PINK, LILAC, MINT, LEMON, SKY, HOT, WHITE, GOLD];
  /** kind 0 dot, 1 star, 2 heart, 3 confetti. */
  function burst(x, y, n, speed, kind) {
    for (var i = 0; i < n; i++) {
      var a = rnd() * TAU, v = speed * (0.3 + rnd() * 0.7);
      part(x, y, Math.cos(a) * v, Math.sin(a) * v - speed * 0.3, 0.6 + rnd() * 0.7, BURST[i % BURST.length], 5 + rnd() * 7, kind === undefined ? (i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 0) : kind, 200);
    }
  }
  function confetti() {
    for (var i = 0; i < 90; i++) part(rnd() * W, -20 - rnd() * 200, (rnd() - 0.5) * 120, 80 + rnd() * 160, 3 + rnd() * 1.5, BURST[i % BURST.length], 7 + rnd() * 6, 3, 60);
  }

  // MARK: - The map

  function toMap() {
    scene = 'map';
    if (pending) { newFriend = pending - 1; pending = 0; scene = 'friend'; sound('friend'); confetti(); say(L(NEW_FRIEND) + ' ' + FRIENDS[newFriend].name + '!'); }
  }

  function mapKey(k) {
    if (walk) return;
    if (k === OK) { enter(PLACES[here].id); return; }
    var dx = k === LEFT ? -1 : k === RIGHT ? 1 : 0, dy = k === UP ? -1 : k === DOWN ? 1 : 0;
    if (!dx && !dy) return;
    // The nearest place that way; along the path when nothing is that way.
    var from = PLACES[here], best = -1, score = 1e9;
    for (var i = 0; i < PLACES.length; i++) {
      if (i === here) continue;
      var ax = PLACES[i].x - from.x, ay = PLACES[i].y - from.y, along = dx ? ax * dx : ay * dy, side = dx ? Math.abs(ay) : Math.abs(ax);
      if (along <= 20) continue;
      var sc = along + side * 1.5;
      if (sc < score) { score = sc; best = i; }
    }
    if (best < 0) best = (here + (dx || dy) + PLACES.length) % PLACES.length;
    walk = {from: here, to: best, t: 0};
    sound('step');
  }

  function enter(id) {
    sound('chime');
    burst(PLACES[here].x, PLACES[here].y - 40, 24, 260);
    if (id === 'bakery') { bake = newBake(); scene = 'bakery'; say(L(CAKE_STEPS[0]), true); }
    else if (id === 'ride') { ride = newRide(); scene = 'ride'; }
    else if (id === 'catch') { shower = newShower(); scene = 'catch'; }
    else if (id === 'garden') { garden = openGarden(); scene = 'garden'; }
    else if (id === 'shop') { shop = newShop(); scene = 'shop'; }
    else if (id === 'dress') { dress = {row: 0, twirl: 0, changed: false}; scene = 'dress'; }
  }

  // MARK: - The Cloud Bakery: a cake, its icing, then toppings

  var SLOTS = {
    0: [[0, -70], [-70, -62], [70, -62], [-38, -88], [38, -88], [-100, -40], [100, -40], [0, -40], [-55, -30], [55, -30]],
    1: [[0, -40], [-60, -78], [60, -78], [-100, -72], [100, -72], [-30, -60], [30, -60], [0, -10], [-55, -30], [55, -30]],
    2: [[0, -200], [-36, -194], [36, -194], [-70, -128], [70, -128], [-24, -130], [24, -130], [-110, -54], [110, -54], [0, -56]]};
  function newBake() { return {step: 0, shape: 0, icing: 0, sel: 0, tops: [], sprinkles: false, done: false, t: 0}; }

  function bakeKey(k) {
    var b = bake;
    if (b.done) { if (k === OK) { bake = newBake(); say(L(CAKE_STEPS[0])); sound('pop'); } return; }
    var d = k === LEFT ? -1 : k === RIGHT ? 1 : 0;
    if (b.step === 0) {
      if (d) { b.shape = (b.shape + d + 3) % 3; sound('pick'); }
      else if (k === OK) { b.step = 1; sound('pop'); say(L(CAKE_STEPS[1])); }
    } else if (b.step === 1) {
      if (d) { b.icing = (b.icing + d + ICINGS.length) % ICINGS.length; sound('pick'); }
      else if (k === OK) { b.step = 2; b.sel = 0; sound('pop'); say(L(CAKE_STEPS[2])); }
    } else {
      var n = TOPPINGS.length + 1;
      if (d) { b.sel = (b.sel + d + n) % n; sound('pick'); }
      else if (k === OK) {
        if (b.sel === TOPPINGS.length) { finishCake(); return; }
        var top = TOPPINGS[b.sel], cx = W / 2 + 80, cy = 560;
        if (top.id === 'sprinkles') {
          if (!b.sprinkles) { b.sprinkles = true; give(1, cx, cy - 120); }
          sound('twinkle'); burst(cx, cy - 100, 30, 300, 0);
          if (rnd() < 0.5) cheer();
          return;
        }
        var slots = SLOTS[b.shape];
        if (b.tops.length >= slots.length) { say(L(CAKE_FULL)); sound('pick'); b.sel = TOPPINGS.length; return; }
        var s = slots[b.tops.length];
        b.tops.push({id: top.id, x: s[0], y: s[1], t: 0});
        sound('pop'); burst(cx + s[0] * 1.3, cy + s[1] * 1.3, 14, 200);
        give(1, cx + s[0] * 1.3, cy + s[1] * 1.3 - 30);
        if (b.tops.length % 3 === 1) cheer();
        if (b.tops.length >= slots.length) b.sel = TOPPINGS.length;
      }
    }
  }
  function finishCake() {
    bake.done = true; bake.t = 0;
    save.cakes++;
    give(5, W / 2 + 80, 300);
    sound('yay'); confetti();
    say(L(CAKE_DONE));
  }

  // MARK: - The Rainbow Ride: a unicorn, five lanes of sky, treats, stars and rainbow rings

  var LANES = [170, 270, 370, 470, 570], RIDE_TIME = 40;
  function newRide() { return {lane: 2, y: LANES[2], items: [], t: 0, next: 0.6, got: 0, spin: 0, magnet: 0, trail: [], done: false, endT: 0, scroll: 0}; }

  function rideKey(k) {
    var r = ride;
    if (r.done) { if (k === OK && r.endT > 1) { ride = newRide(); sound('pop'); } return; }
    if (k === UP && r.lane > 0) { r.lane--; sound('step'); }
    else if (k === DOWN && r.lane < LANES.length - 1) { r.lane++; sound('step'); }
    else if (k === OK && r.spin <= 0) { r.spin = 0.7; r.magnet = 1.6; sound('twinkle'); burst(270, r.y, 26, 280); }
  }

  function rideStep(dt) {
    var r = ride, i;
    r.scroll += dt * 260;
    if (r.done) {
      r.endT += dt;
      if (r.endT < 2) r.y += (380 - r.y) * Math.min(1, dt * 2);
      return;
    }
    r.t += dt;
    r.y += (LANES[r.lane] - r.y) * Math.min(1, dt * 9);
    if (r.spin > 0) r.spin -= dt;
    if (r.magnet > 0) r.magnet -= dt;
    // Treats come in a gentle wave, never too many at once; no new ones once the castle is in sight.
    r.next -= dt;
    if (r.next <= 0 && r.t < RIDE_TIME - 5) {
      var lane = Math.floor(rnd() * LANES.length), roll = rnd();
      r.items.push({x: W + 60, lane: lane, y: LANES[lane], kind: roll < 0.12 ? 'ring' : roll < 0.32 ? 'star' : pickOf(TREATS).id, bob: rnd() * TAU});
      r.next = 0.45 + rnd() * 0.35;
    }
    for (i = r.items.length - 1; i >= 0; i--) {
      var it = r.items[i];
      it.x -= dt * 260;
      if (r.magnet > 0 && it.kind !== 'ring' && Math.abs(it.x - 280) < 260) it.y += (r.y - it.y) * Math.min(1, dt * 5);
      if (Math.abs(it.x - 280) < (it.kind === 'ring' ? 40 : 60) && Math.abs(it.y - r.y) < (it.kind === 'ring' ? 50 : 60)) {
        r.items.splice(i, 1);
        if (it.kind === 'ring') { r.got += 3; give(3, 280, r.y - 50); sound('chime'); burst(280, r.y, 30, 320); say(L(RAINBOW), false); r.trail.push(1.2); }
        else { r.got++; give(1, 280, r.y - 50); sound(it.kind === 'star' ? 'twinkle' : 'pop'); burst(it.x, it.y, 10, 180); }
        if (r.got && r.got % 12 === 0) cheer();
        continue;
      }
      if (it.x < -80) r.items.splice(i, 1);
    }
    if (r.t > RIDE_TIME - 6 && r.t - dt <= RIDE_TIME - 6) say(L(CASTLE_NEAR));
    if (r.t >= RIDE_TIME) {
      r.done = true; r.endT = 0; save.rides++;
      give(5, 640, 300); sound('yay'); confetti();
      say(L(RIDE_DONE));
    }
  }

  // MARK: - The Lolly Shower: sweets fall from a candy floss cloud into five lanes

  var COLS = [240, 440, 640, 840, 1040], SHOWER_TIME = 35;
  function newShower() { return {col: 2, x: COLS[2], items: [], t: 0, next: 0.8, got: 0, missed: 0, bunny: null, done: false, endT: 0, wiggle: 0}; }

  function catchKey(k) {
    var s = shower;
    if (s.done) { if (k === OK && s.endT > 1) { shower = newShower(); sound('pop'); } return; }
    if (k === LEFT && s.col > 0) { s.col--; sound('step'); }
    else if (k === RIGHT && s.col < COLS.length - 1) { s.col++; sound('step'); }
    else if (k === OK) { s.wiggle = 0.4; sound('pick'); }
  }

  function catchStep(dt) {
    var s = shower, i;
    if (s.wiggle > 0) s.wiggle -= dt;
    if (s.bunny) {
      var b = s.bunny;
      b.t += dt;
      if (b.t > 3) s.bunny = null;
    }
    if (s.done) { s.endT += dt; return; }
    s.t += dt;
    s.x += (COLS[s.col] - s.x) * Math.min(1, dt * 10);
    s.next -= dt;
    if (s.next <= 0 && s.t < SHOWER_TIME - 2) {
      var col = Math.floor(rnd() * COLS.length);
      s.items.push({col: col, x: COLS[col] + (rnd() - 0.5) * 20, y: 150, vy: 150 + rnd() * 50 + s.t * 2, kind: rnd() < 0.1 ? 'star' : pickOf(TREATS).id, rot: rnd() * TAU, spin: (rnd() - 0.5) * 3});
      s.next = Math.max(0.55, 1.0 - s.t * 0.012) + rnd() * 0.3;
    }
    for (i = s.items.length - 1; i >= 0; i--) {
      var it = s.items[i];
      it.y += it.vy * dt; it.rot += it.spin * dt;
      if (it.y > 580 && it.y < 640 && Math.abs(it.x - s.x) < 85) {
        s.items.splice(i, 1);
        var star = it.kind === 'star';
        s.got += star ? 3 : 1;
        give(star ? 3 : 1, s.x, 520);
        sound(star ? 'twinkle' : 'pop'); burst(s.x, 590, star ? 26 : 12, 220);
        if (star) say(L(GOLD_STAR), false);
        else if (s.got % 8 === 0) cheer();
        save.caught++;
        continue;
      }
      if (it.y > 680) {
        // Missed? It lands softly and Bubbles the bunny hops over for a snack.
        s.items.splice(i, 1);
        s.missed++;
        sound('plop');
        if (!s.bunny) s.bunny = {x: it.x, t: 0, kind: it.kind};
        if (s.missed % 4 === 1) say(L(KIND[1 + (s.missed % 2)]));
      }
    }
    if (s.t >= SHOWER_TIME && !s.items.length) {
      s.done = true; s.endT = 0;
      give(5, 640, 300); sound('yay'); confetti();
      say(fill(CATCH_DONE, s.got));
    }
  }

  // MARK: - The Candy Garden: six patches that grow on the TV's clock, even while you're away

  var PLOTS = [[400, 360], [640, 360], [880, 360], [400, 580], [640, 580], [880, 580]], GROW = 12000;
  function now() { return Date.now(); }
  function plot(i) {
    var p = save.garden[i];
    return p && typeof p.k === 'number' ? p : null;
  }
  function stage(p) {
    if (!p) return 'empty';
    if (!p.w) return 'seed';
    return now() - p.w >= GROW ? 'ready' : 'growing';
  }
  function openGarden() {
    var grew = false;
    for (var i = 0; i < PLOTS.length; i++) { var p = plot(i); if (p && p.w && now() - p.w >= GROW && !p.seen) { grew = true; p.seen = 1; } }
    if (grew) { store(); say(L(GREW)); } else say(L(PLACES[1].about));
    return {sel: 0, can: 0, pick: null};
  }
  function gardenKey(k) {
    var g = garden, col = g.sel % 3, row = Math.floor(g.sel / 3);
    if (k === LEFT && col > 0) { g.sel--; sound('step'); }
    else if (k === RIGHT && col < 2) { g.sel++; sound('step'); }
    else if (k === UP && row > 0) { g.sel -= 3; sound('step'); }
    else if (k === DOWN && row < 1) { g.sel += 3; sound('step'); }
    else if (k === OK) {
      var p = plot(g.sel), st = stage(p), at = PLOTS[g.sel];
      if (st === 'empty') {
        save.garden[g.sel] = {k: save.nextPlant % PLANTS.length, w: 0};
        save.nextPlant++;
        sound('plop'); burst(at[0], at[1], 10, 150, 0);
        give(1, at[0], at[1] - 60);
        say(L(PLANTED));
      } else if (st === 'seed') {
        p.w = now(); p.seen = 1; store();
        g.can = 1.2; sound('water');
        give(1, at[0], at[1] - 60);
        say(L(WATERED));
      } else if (st === 'growing') {
        sound('pick'); burst(at[0], at[1] - 40, 8, 120, 1);
        say(L(PATIENT), false);
      } else {
        save.garden[g.sel] = null; save.picked++;
        g.pick = {k: p.k, x: at[0], y: at[1] - 60, t: 0};
        sound('chime'); burst(at[0], at[1] - 50, 30, 300);
        give(3, at[0], at[1] - 90);
        cheer();
      }
    }
  }

  // MARK: - The Sweet Shop: eight friends come in, each wishing for a treat

  var DAY = 8;
  function newShop() { var s = {served: 0, sel: 0, cust: null, gone: 0, flying: null, done: false, endT: 0}; nextCustomer(s); say(L(PLACES[2].about)); return s; }
  function nextCustomer(s) {
    var want = Math.floor(rnd() * TREATS.length), shelf = [want];
    while (shelf.length < 5) { var t = Math.floor(rnd() * TREATS.length); if (shelf.indexOf(t) < 0) shelf.push(t); }
    // Shuffle, so the wished-for treat isn't always first.
    for (var i = shelf.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = shelf[i]; shelf[i] = shelf[j]; shelf[j] = x; }
    s.cust = {friend: Math.floor(rnd() * FRIENDS.length), want: want, x: W + 120, state: 'in', t: 0, happy: 0};
    s.shelf = shelf; s.sel = 0;
  }
  function shopKey(k) {
    var s = shop;
    if (s.done) { if (k === OK && s.endT > 1) { shop = newShop(); sound('pop'); } return; }
    if (k === LEFT) { s.sel = (s.sel + 4) % 5; sound('pick'); }
    else if (k === RIGHT) { s.sel = (s.sel + 1) % 5; sound('pick'); }
    else if (k === OK && s.cust && s.cust.state === 'wait' && !s.flying) {
      s.flying = {k: s.shelf[s.sel], t: 0, x0: 230 + s.sel * 140, y0: 600};
      sound('whoosh');
    }
  }
  function shopStep(dt) {
    var s = shop, cu = s.cust;
    if (s.done) { s.endT += dt; return; }
    if (cu) {
      cu.t += dt;
      if (cu.state === 'in') { cu.x += (900 - cu.x) * Math.min(1, dt * 4); if (Math.abs(cu.x - 900) < 4) cu.state = 'wait'; }
      else if (cu.state === 'happy') { if (cu.t > 1.8) { cu.state = 'out'; } }
      else if (cu.state === 'out') { cu.x += dt * 520; if (cu.x > W + 150) { s.cust = null; s.gone = 0; } }
    } else {
      s.gone += dt;
      if (s.served >= DAY) {
        s.done = true; s.endT = 0;
        give(5, 640, 300); sound('yay'); confetti();
        say(fill(SHOP_DONE, s.served));
      } else if (s.gone > 0.5) nextCustomer(s);
    }
    if (s.flying) {
      var f = s.flying;
      f.t += dt * 2.2;
      if (f.t >= 1) {
        var right = f.k === cu.want;
        s.flying = null; s.served++; save.served++;
        cu.state = 'happy'; cu.t = 0; cu.got = f.k;
        give(right ? 2 : 1, 900, 280);
        burst(900, 360, right ? 30 : 18, 260, 2);
        sound(right ? 'chime' : 'pop');
        say(L(right ? pickOf(EXACTLY) : KIND[0]));
      }
    }
  }

  // MARK: - The Dress-up Castle

  function optionCount(part) {
    if (part.colours) return part.colours.length;
    if (part.id === 'pet') return save.friends + 1;
    return part.options.length;
  }
  function dressKey(k) {
    var d = dress;
    if (k === UP) { d.row = (d.row + PARTS.length - 1) % PARTS.length; sound('step'); }
    else if (k === DOWN) { d.row = (d.row + 1) % PARTS.length; sound('step'); }
    else if (k === LEFT || k === RIGHT) {
      var p = PARTS[d.row], n = optionCount(p), v = save.look[p.id];
      // The friend row: 0 is nobody, then each friend who has come.
      if (p.id === 'pet') v = v + 1;
      v = (v + (k === LEFT ? -1 : 1) + n) % n;
      save.look[p.id] = p.id === 'pet' ? v - 1 : v;
      d.changed = true; store();
      sound('pick'); burst(820, 360, 8, 160, 1);
    } else if (k === OK) {
      d.twirl = 1;
      sound('twinkle'); burst(820, 380, 34, 320);
      if (d.changed) { give(1, 820, 200); d.changed = false; }
      say(L(pickOf(LOOKS_GOOD)));
    }
  }

  // MARK: - Every frame

  function step(dt) {
    clock += dt;
    if (msg) { msg.t += dt; if (msg.t > 3.6) msg = null; }
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.k === 3) p.vx += Math.sin(clock * 3 + i) * 30 * dt;
    }
    for (i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.2) floats.splice(i, 1); }
    if (walk) {
      walk.t += dt / 0.55;
      if (walk.t >= 1) { here = walk.to; walk = null; say(L(PLACES[here].name) + '!', false); }
    }
    if (scene === 'ride') rideStep(dt);
    else if (scene === 'catch') catchStep(dt);
    else if (scene === 'shop') shopStep(dt);
    else if (scene === 'bakery') { bake.t += dt; for (var j = 0; j < bake.tops.length; j++) bake.tops[j].t += dt; }
    else if (scene === 'garden') { if (garden.can > 0) garden.can -= dt; if (garden.pick) { garden.pick.t += dt; if (garden.pick.t > 1) garden.pick = null; } }
    else if (scene === 'dress') { if (dress.twirl > 0) dress.twirl = Math.max(0, dress.twirl - dt * 1.4); }
    // Gentle sparkles drift up everywhere, all the time.
    if (rnd() < dt * 6) part(rnd() * W, H + 10, (rnd() - 0.5) * 20, -40 - rnd() * 50, 4 + rnd() * 3, BURST[Math.floor(rnd() * 8)], 3 + rnd() * 4, rnd() < 0.5 ? 1 : 0, 0);
  }

  /** A key; true when it was used. Back is handled by back(). */
  function press(k) {
    if (scene === 'map') mapKey(k);
    else if (scene === 'friend') { if (k === OK) { scene = 'map'; sound('pop'); say(L(FRIEND_TIP)); } }
    else if (scene === 'bakery') bakeKey(k);
    else if (scene === 'ride') rideKey(k);
    else if (scene === 'catch') catchKey(k);
    else if (scene === 'garden') gardenKey(k);
    else if (scene === 'shop') shopKey(k);
    else if (scene === 'dress') dressKey(k);
    return true;
  }
  /** Back: up one level. A place goes to the map; the map says false, so the screen closes back to Games. */
  function back() {
    if (scene === 'map') return false;
    sound('step');
    store();
    toMap();
    return true;
  }

  // MARK: - Drawing helpers

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    c.lineTo(x + w, y + h - r); c.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    c.lineTo(x + r, y + h); c.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    c.closePath();
  }
  function box(x, y, w, h, r, f) { c.fillStyle = f; rr(x, y, w, h, r); c.fill(); }
  function disc(x, y, r, f) { c.fillStyle = f; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.fill(); }
  function oval(x, y, rx, ry, f) { c.fillStyle = f; c.beginPath(); c.save(); c.translate(x, y); c.scale(Math.max(0.1, rx), Math.max(0.1, ry)); c.arc(0, 0, 1, 0, TAU); c.restore(); c.fill(); }
  function poly(pts, f) { c.fillStyle = f; c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function line(x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function font(size, weight) { c.font = (weight || '700') + ' ' + size + 'px Sora, Inter, Arial, sans-serif'; }
  function text(s, x, y, size, f, align, weight, outline) {
    font(size, weight);
    c.textAlign = align || 'left'; c.textBaseline = 'middle';
    if (outline) { c.lineWidth = Math.max(4, size / 6); c.strokeStyle = outline; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = f; c.fillText(s, x, y);
  }
  function width(s, size, weight) { font(size, weight); return c.measureText(s).width; }
  function starPath(x, y, r, inner) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * (inner || 0.45) : r;
      if (i) c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  function star(x, y, r, f) { c.fillStyle = f; starPath(x, y, r); c.fill(); }
  function heart(x, y, r, f) {
    c.fillStyle = f; c.beginPath();
    c.moveTo(x, y + r * 0.9);
    c.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.4);
    c.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    c.fill();
  }
  function sparkle(x, y, r, f) {
    c.fillStyle = f; c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
  }
  function face(x, y, s, blush) {
    oval(x - 11 * s, y, 4 * s, 5.5 * s, INK); oval(x + 11 * s, y, 4 * s, 5.5 * s, INK);
    disc(x - 9.5 * s, y - 2 * s, 1.6 * s, WHITE); disc(x + 12.5 * s, y - 2 * s, 1.6 * s, WHITE);
    c.strokeStyle = INK; c.lineWidth = 2.4 * s; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y + 6 * s, 6 * s, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    if (blush !== false) { oval(x - 20 * s, y + 8 * s, 6 * s, 3.5 * s, 'rgba(255,110,150,0.45)'); oval(x + 20 * s, y + 8 * s, 6 * s, 3.5 * s, 'rgba(255,110,150,0.45)'); }
  }

  // MARK: - Treats

  /** One treat, centred, about 60 pixels across at s = 1. */
  function treat(id, x, y, s, rot) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s, s);
    var i;
    if (id === 'lolly') {
      box(-3, 0, 6, 34, 3, WHITE);
      disc(0, -6, 24, PINK);
      c.strokeStyle = WHITE; c.lineWidth = 5; c.beginPath();
      for (i = 0; i < 40; i++) { var a = i * 0.45, rad = i * 0.55; if (i) c.lineTo(Math.cos(a) * rad, -6 + Math.sin(a) * rad); else c.moveTo(0, -6); }
      c.stroke();
    } else if (id === 'cupcake') {
      poly([-20, 0, 20, 0, 15, 26, -15, 26], '#8FC8FF');
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
      for (i = -12; i <= 12; i += 8) { c.beginPath(); c.moveTo(i, 2); c.lineTo(i * 0.8, 24); c.stroke(); }
      disc(-12, -4, 12, PINK); disc(12, -4, 12, PINK); disc(0, -14, 14, PINK); disc(0, -2, 13, PINK);
      disc(0, -30, 6, '#E8364F'); disc(-2, -32, 2, WHITE);
    } else if (id === 'donut') {
      c.lineWidth = 17; c.strokeStyle = '#E6A86B'; c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.stroke();
      c.lineWidth = 13; c.strokeStyle = PINK; c.beginPath(); c.arc(0, -2, 16, 0, TAU); c.stroke();
      var sp = [LEMON, MINT, SKY, WHITE, LILAC];
      for (i = 0; i < 10; i++) { var aa = i * 0.63; line(Math.cos(aa) * 16, Math.sin(aa) * 16 - 2, Math.cos(aa) * 16 + 3, Math.sin(aa) * 16 + 1, 3, sp[i % 5]); }
    } else if (id === 'icecream') {
      poly([-15, 0, 15, 0, 0, 36], '#E8B26A');
      c.strokeStyle = '#C98D45'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 6); c.lineTo(5, 22); c.moveTo(10, 6); c.lineTo(-5, 22); c.stroke();
      disc(-8, -6, 13, MINT); disc(8, -6, 13, PINK); disc(0, -20, 13, LEMON);
      disc(2, -34, 5, '#E8364F');
    } else if (id === 'cane') {
      c.lineCap = 'round';
      c.strokeStyle = WHITE; c.lineWidth = 10; c.beginPath(); c.moveTo(6, 30); c.lineTo(6, -12); c.arc(-6, -12, 12, 0, Math.PI, true); c.stroke();
      c.strokeStyle = '#E8364F'; c.lineWidth = 10;
      if (c.setLineDash) { c.setLineDash([6, 8]); c.beginPath(); c.moveTo(6, 30); c.lineTo(6, -12); c.arc(-6, -12, 12, 0, Math.PI, true); c.stroke(); c.setLineDash([]); }
    } else if (id === 'macaron') {
      oval(0, 10, 24, 10, LILAC); box(-22, -3, 44, 8, 4, CREAM); oval(0, -8, 24, 11, LILAC); oval(-6, -12, 8, 3, 'rgba(255,255,255,0.5)');
    } else if (id === 'sweet') {
      poly([-18, 0, -32, -12, -32, 12], LEMON); poly([18, 0, 32, -12, 32, 12], LEMON);
      oval(0, 0, 20, 15, HOT);
      line(-8, -10, -4, 10, 3, 'rgba(255,255,255,0.6)'); line(4, -10, 8, 10, 3, 'rgba(255,255,255,0.6)');
    } else if (id === 'gumdrop') {
      c.fillStyle = '#7ED957'; c.beginPath(); c.moveTo(-22, 18); c.lineTo(-18, -6); c.quadraticCurveTo(0, -30, 18, -6); c.lineTo(22, 18); c.closePath(); c.fill();
      for (i = 0; i < 9; i++) disc(-12 + (i * 7) % 24, -8 + (i * 11) % 22, 1.8, 'rgba(255,255,255,0.8)');
    } else if (id === 'floss') {
      box(-3, 4, 6, 30, 3, CREAM);
      disc(-12, -6, 14, PINK); disc(12, -6, 14, PINK); disc(0, -18, 16, '#FFB3D9'); disc(0, -2, 15, '#FFC7E3');
    } else if (id === 'choc') {
      box(-18, -24, 36, 48, 5, '#6B3A22');
      c.strokeStyle = '#8A5233'; c.lineWidth = 2;
      for (i = -12; i < 24; i += 12) { c.beginPath(); c.moveTo(-18, i); c.lineTo(18, i); c.stroke(); }
      c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 24); c.stroke();
      poly([-18, 6, 18, -2, 18, 24, -18, 24], '#C0C8D8'); poly([-18, 6, 18, -2, 18, 2, -18, 10], '#E3E8F0');
    } else if (id === 'star') {
      star(0, 0, 28, GOLD); star(0, 0, 18, LEMON); sparkle(18, -20, 8, WHITE);
    } else if (id === 'heart') {
      heart(0, 2, 22, HOT); oval(-8, -6, 5, 3, 'rgba(255,255,255,0.6)');
    } else if (id === 'strawberry') {
      c.fillStyle = '#F2405D'; c.beginPath(); c.moveTo(0, 24); c.bezierCurveTo(-26, 4, -20, -16, 0, -14); c.bezierCurveTo(20, -16, 26, 4, 0, 24); c.fill();
      for (i = 0; i < 7; i++) disc(-9 + (i * 9) % 20, -6 + (i * 7) % 20, 1.6, LEMON);
      poly([-12, -14, 0, -22, 12, -14, 0, -10], '#5CBF5C');
    } else if (id === 'cherry') {
      c.strokeStyle = '#5C8A3A'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(4, -22, 12, -28); c.stroke();
      disc(0, 6, 14, '#D7193A'); disc(-4, 2, 4, 'rgba(255,255,255,0.6)');
    } else if (id === 'candle') {
      box(-6, -26, 12, 40, 4, SKY);
      line(-6, -16, 6, -22, 3, WHITE); line(-6, -4, 6, -10, 3, WHITE); line(-6, 8, 6, 2, 3, WHITE);
      var fl = 1 + Math.sin(clock * 12) * 0.12;
      oval(0, -36, 6 * fl, 10 * fl, '#FFB33C'); oval(0, -34, 3, 5, LEMON);
    } else if (id === 'horn') {
      poly([-12, 10, 12, 10, 0, -40], GOLD);
      line(-9, 2, 9, -4, 2.5, LEMON); line(-6, -10, 6, -15, 2.5, LEMON); line(-3, -22, 3, -26, 2.5, LEMON);
    }
    c.restore();
  }

  // MARK: - The friends

  /** A unicorn standing (or flying), feet at y. */
  function unicorn(x, y, s, t, flip, flying) {
    c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
    var bob = Math.sin(t * 4) * 3, mane = ['#FF6F91', '#FFB33C', '#FFE58A', '#8FE3CF', '#8FC8FF', '#C9A7FF'], i;
    for (i = 0; i < 5; i++) disc(-58 - i * 7, -64 + i * 9 + Math.sin(t * 5 + i) * 3 + bob, 9, mane[i]);
    var legs = flying ? [[-26, -10], [-10, -6], [18, -10], [32, -6]] : [[-26, 0], [-12, 0], [18, 0], [32, 0]];
    for (i = 0; i < 4; i++) { box(legs[i][0] - 5, -40 + bob, 10, 40 + legs[i][1], 5, '#F4EEFF'); box(legs[i][0] - 6, legs[i][1] - 8 + bob, 12, 8, 3, LILAC); }
    oval(0, -48 + bob, 50, 26, WHITE);
    if (flying) { c.save(); c.translate(-6, -64 + bob); c.rotate(-0.5 + Math.sin(t * 9) * 0.3); oval(0, -22, 14, 28, 'rgba(255,214,236,0.9)'); c.restore(); }
    poly([28, -60 + bob, 50, -96 + bob, 64, -90 + bob, 52, -52 + bob], WHITE);
    oval(62, -98 + bob, 22, 17, WHITE);
    oval(78, -92 + bob, 9, 8, '#FFE3EF');
    poly([54, -112 + bob, 60, -150 + bob, 66, -110 + bob], GOLD);
    poly([46, -112 + bob, 44, -126 + bob, 54, -114 + bob], WHITE);
    for (i = 0; i < 6; i++) disc(44 - i * 5, -108 + i * 9 + bob, 9, mane[i]);
    disc(64, -102 + bob, 3.6, INK); disc(65, -103.5 + bob, 1.2, WHITE);
    oval(70, -92 + bob, 5, 2.5, 'rgba(255,110,150,0.5)');
    c.restore();
  }

  /** Any other friend: a round little creature, feet at y, about 90 pixels tall at s = 1. */
  function critter(i, x, y, s, t, hop) {
    var f = FRIENDS[i];
    if (f.id === 'unicorn') { unicorn(x, y, s * 0.6, t); return; }
    var j = hop ? Math.abs(Math.sin(t * 6)) * 12 : Math.sin(t * 3 + i) * 2;
    c.save(); c.translate(x, y - j); c.scale(s, s);
    var col = f.colour, dark = f.id === 'penguin';
    oval(0, 2 + j / s, 28, 6, 'rgba(74,45,92,0.15)');
    if (f.id === 'dragon') { oval(-30, -44, 16, 10, '#B9F2E2'); oval(30, -44, 16, 10, '#B9F2E2'); }
    if (f.id === 'owl') { oval(-30, -38, 10, 20, '#B191F0'); oval(30, -38, 10, 20, '#B191F0'); }
    oval(0, -28, 28, 28, col);
    if (dark) oval(0, -24, 18, 22, WHITE);
    else oval(0, -24, 16, 18, 'rgba(255,255,255,0.45)');
    // Ears or tufts or horns.
    if (f.id === 'bunny') { oval(-14, -100, 8, 24, col); oval(14, -100, 8, 24, col); oval(-14, -100, 4, 18, '#FFC2DA'); oval(14, -100, 4, 18, '#FFC2DA'); }
    else if (f.id === 'kitten') { poly([-30, -72, -24, -100, -8, -80], col); poly([30, -72, 24, -100, 8, -80], col); poly([-26, -78, -23, -92, -14, -82], '#FFC2DA'); poly([26, -78, 23, -92, 14, -82], '#FFC2DA'); }
    else if (f.id === 'bear') { disc(-24, -86, 10, col); disc(24, -86, 10, col); }
    else if (f.id === 'dragon') { poly([-16, -88, -12, -104, -6, -88], LEMON); poly([16, -88, 12, -104, 6, -88], LEMON); }
    else if (f.id === 'owl') { poly([-26, -78, -26, -98, -12, -84], col); poly([26, -78, 26, -98, 12, -84], col); }
    else if (f.id === 'puppy') { oval(-30, -66, 9, 18, '#B9824F'); oval(30, -66, 9, 18, '#B9824F'); }
    disc(0, -66, 30, col);
    if (dark) oval(0, -60, 20, 18, WHITE);
    face(0, -66, 0.8, true);
    if (f.id === 'owl' || f.id === 'penguin') poly([-5, -58, 5, -58, 0, -50], '#FFA53C');
    else if (f.id === 'kitten' || f.id === 'bunny' || f.id === 'puppy') oval(0, -60, 3.5, 2.5, '#FF7AA2');
    if (f.id === 'kitten') { line(-18, -60, -34, -62, 1.5, INK); line(18, -60, 34, -62, 1.5, INK); }
    // Little feet.
    oval(-12, 0, 10, 5, dark ? '#FFA53C' : col); oval(12, 0, 10, 5, dark ? '#FFA53C' : col);
    c.restore();
  }

  // MARK: - The player, dressed up

  /** The player, feet at (x, y), about 220 pixels tall at s = 1. twirl 0 to 1 spins once. */
  function player(x, y, s, t, twirl, dir) {
    var lk = save.look, skin = PARTS[0].colours[lk.skin] || PARTS[0].colours[1], hair = PARTS[2].colours[lk.hairCol] || PARTS[2].colours[0],
      cloth = PARTS[4].colours[lk.outCol] || PARTS[4].colours[0], bob = Math.sin(t * 3) * 2, i;
    var sx = twirl ? Math.cos(twirl * TAU) : 1;
    c.save(); c.translate(x, y); c.scale(s * (dir || 1) * (Math.abs(sx) < 0.08 ? 0.08 : sx), s);
    oval(0, 0, 50, 10, 'rgba(74,45,92,0.15)');
    // Wings, behind everything.
    var flap = Math.sin(t * 5) * 0.12;
    if (lk.wings === 1) {
      c.save(); c.translate(0, -120 + bob);
      for (i = -1; i <= 1; i += 2) { c.save(); c.scale(i, 1); c.rotate(flap); oval(44, -26, 40, 22, 'rgba(189,230,255,0.75)'); oval(36, 14, 26, 16, 'rgba(255,214,236,0.8)'); c.restore(); }
      c.restore();
    } else if (lk.wings === 2) {
      c.save(); c.translate(0, -120 + bob);
      for (i = -1; i <= 1; i += 2) { c.save(); c.scale(i, 1); c.rotate(flap); oval(48, -24, 42, 32, '#C9A7FF'); oval(54, -26, 22, 16, LEMON); oval(36, 18, 28, 20, PINK); disc(40, 18, 8, WHITE); c.restore(); }
      c.restore();
    } else if (lk.wings === 3) {
      var rb = ['#FF6F91', '#FFB33C', '#FFE58A', '#8FE3CF', '#8FC8FF', '#C9A7FF'];
      c.save(); c.translate(0, -120 + bob);
      for (i = -1; i <= 1; i += 2) { c.save(); c.scale(i, 1); c.rotate(flap - 0.2); for (var k = 0; k < 6; k++) oval(30 + k * 7, -10, 50 - k * 6, 12, rb[k]); c.restore(); }
      c.restore();
    }
    // Long hair falls behind the shoulders.
    if (lk.hair === 0) { oval(0, -150 + bob, 46, 62, hair); box(-46, -170 + bob, 92, 74, 30, hair); }
    else if (lk.hair === 3) { for (i = 0; i < 10; i++) disc(Math.cos(i * 0.7) * 40, -168 + Math.sin(i * 0.7) * 34 + bob + 16, 18, hair); }
    else if (lk.hair === 1) { disc(-50, -170 + bob, 20, hair); disc(50, -170 + bob, 20, hair); disc(-56, -146 + bob, 16, hair); disc(56, -146 + bob, 16, hair); }
    // Legs and shoes.
    box(-17, -70, 12, 68, 6, skin); box(5, -70, 12, 68, 6, skin);
    oval(-12, -4, 12, 7, HOT); oval(12, -4, 12, 7, HOT);
    // The outfit.
    var o = lk.outfit;
    if (o === 3) {
      box(-26, -60, 22, 56, 8, cloth); box(4, -60, 22, 56, 8, cloth);
      box(-28, -110 + bob, 56, 60, 14, cloth);
      box(-18, -104 + bob, 36, 24, 6, 'rgba(255,255,255,0.35)');
      disc(-14, -98 + bob, 4, LEMON); disc(14, -98 + bob, 4, LEMON);
      box(-26, -122 + bob, 52, 18, 8, WHITE);
    } else {
      box(-24, -124 + bob, 48, 46, 16, cloth);
      if (o === 0) {
        poly([-24, -86 + bob, 24, -86 + bob, 62, -6, -62, -6], cloth);
        poly([-24, -86 + bob, 24, -86 + bob, 44, -40, -44, -40], 'rgba(255,255,255,0.25)');
        for (i = -50; i <= 50; i += 20) disc(i, -8, 10, cloth);
        for (i = 0; i < 6; i++) sparkle(-36 + i * 14, -30 - (i % 2) * 22, 5, WHITE);
      } else if (o === 1) {
        poly([-24, -86 + bob, 24, -86 + bob, 50, -44, -50, -44], cloth);
        for (i = -40; i <= 40; i += 16) disc(i, -46, 9, cloth);
        box(-26, -92 + bob, 52, 10, 5, WHITE);
        heart(0, -110 + bob, 9, WHITE);
      } else {
        for (i = 0; i < 14; i++) { var a = Math.PI + i * Math.PI / 13; poly([0, -84 + bob, Math.cos(a) * 64, -66 + Math.sin(a) * -6 + (i % 2) * 8, Math.cos(a + 0.2) * 64, -66 + (i % 2 ? 0 : 8)], i % 2 ? cloth : 'rgba(255,255,255,0.7)'); }
        oval(0, -72, 62, 14, cloth); oval(0, -76, 56, 8, 'rgba(255,255,255,0.4)');
      }
    }
    // Arms.
    var wave = Math.sin(t * 2.5) * 0.15;
    c.save(); c.translate(-22, -118 + bob); c.rotate(0.35 + wave); box(-6, 0, 12, 46, 6, skin); c.restore();
    c.save(); c.translate(22, -118 + bob); c.rotate(-0.35 - wave); box(-6, 0, 12, 46, 6, skin); c.restore();
    // Head.
    box(-7, -136 + bob, 14, 14, 4, skin);
    disc(0, -168 + bob, 38, skin);
    face(0, -166 + bob, 1, true);
    // Hair on top.
    c.fillStyle = hair; c.beginPath(); c.arc(0, -172 + bob, 40, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
    oval(-22, -190 + bob, 20, 12, hair); oval(18, -194 + bob, 24, 12, hair);
    if (lk.hair === 2) { disc(0, -214 + bob, 20, hair); box(-12, -200 + bob, 24, 8, 4, PINK); }
    if (lk.hair === 3) { for (i = 0; i < 6; i++) disc(-30 + i * 12, -200 + bob + (i % 2) * 6, 13, hair); }
    if (lk.hair === 1) { disc(-42, -178 + bob, 7, PINK); disc(42, -178 + bob, 7, PINK); }
    // Something on top.
    var hd = lk.head;
    if (hd === 1) { poly([-24, -204 + bob, -16, -222 + bob, -8, -208 + bob, 0, -228 + bob, 8, -208 + bob, 16, -222 + bob, 24, -204 + bob], '#E9EEFF'); disc(0, -218 + bob, 4, PINK); }
    else if (hd === 2) { poly([-26, -200 + bob, -28, -234 + bob, -14, -216 + bob, 0, -240 + bob, 14, -216 + bob, 28, -234 + bob, 26, -200 + bob], GOLD); disc(0, -222 + bob, 4, HOT); disc(-18, -214 + bob, 3, SKY); disc(18, -214 + bob, 3, MINT); }
    else if (hd === 3) { var fc = [PINK, LEMON, LILAC, MINT, WHITE, SKY, PEACH]; for (i = 0; i < 7; i++) { var fa = Math.PI * (1.1 + i * 0.13); disc(Math.cos(fa) * 38, -170 + Math.sin(fa) * 38 + bob, 9, fc[i]); disc(Math.cos(fa) * 38, -170 + Math.sin(fa) * 38 + bob, 3.5, GOLD); } }
    else if (hd === 4) { poly([0, -206 + bob, -30, -222 + bob, -30, -192 + bob], HOT); poly([0, -206 + bob, 30, -222 + bob, 30, -192 + bob], HOT); disc(0, -206 + bob, 7, PINK); }
    else if (hd === 5) { poly([-10, -204 + bob, 10, -204 + bob, 0, -252 + bob], GOLD); line(-7, -214 + bob, 7, -219 + bob, 2.5, LEMON); line(-5, -228 + bob, 5, -232 + bob, 2.5, LEMON); }
    c.restore();
  }

  // MARK: - Scenery

  function sky(top, bottom) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function cloud(x, y, s, col) {
    col = col || 'rgba(255,255,255,0.92)';
    disc(x, y, 30 * s, col); disc(x + 34 * s, y - 14 * s, 36 * s, col); disc(x + 70 * s, y, 28 * s, col); box(x - 10 * s, y, 96 * s, 26 * s, 13 * s, col);
  }
  function flossCloud(x, y, s) {
    disc(x - 50 * s, y, 34 * s, '#FFC7E3'); disc(x, y - 22 * s, 44 * s, '#FFB3D9'); disc(x + 52 * s, y, 34 * s, '#FFC7E3');
    disc(x - 22 * s, y + 10 * s, 30 * s, '#FFD9EC'); disc(x + 24 * s, y + 10 * s, 30 * s, '#FFD9EC');
  }
  function hill(x, y, r, col) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.closePath(); c.fill();
    for (var i = 0; i < 8; i++) disc(x - r * 0.6 + (i * 37) % (r * 1.2), y - r * 0.2 - (i * 23) % (r * 0.6), 3, 'rgba(255,255,255,0.7)');
  }
  function lollyTree(x, y, s, col) {
    box(x - 5 * s, y - 90 * s, 10 * s, 90 * s, 5 * s, WHITE);
    disc(x, y - 110 * s, 36 * s, col || PINK);
    c.strokeStyle = WHITE; c.lineWidth = 6 * s; c.beginPath();
    for (var i = 0; i < 36; i++) { var a = i * 0.5, r = i * 0.9 * s; if (i) c.lineTo(x + Math.cos(a) * r, y - 110 * s + Math.sin(a) * r); else c.moveTo(x, y - 110 * s); }
    c.stroke();
  }
  function rainbow(x, y, r, wid, alpha) {
    var cols = ['#FF6F91', '#FFB33C', '#FFE58A', '#8FE3CF', '#8FC8FF', '#C9A7FF'];
    c.save(); c.globalAlpha = alpha === undefined ? 1 : alpha;
    for (var i = 0; i < cols.length; i++) { c.strokeStyle = cols[i]; c.lineWidth = wid; c.beginPath(); c.arc(x, y, r - i * wid, Math.PI, 0); c.stroke(); }
    c.restore();
  }
  function castle(x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    box(-70, -90, 140, 90, 8, '#FFD6EC');
    box(-100, -130, 40, 130, 6, '#FFC2DE'); box(60, -130, 40, 130, 6, '#FFC2DE'); box(-22, -160, 44, 100, 6, '#FFC2DE');
    poly([-106, -128, -80, -186, -54, -128], LILAC); poly([54, -128, 80, -186, 106, -128], LILAC); poly([-28, -158, 0, -224, 28, -158], HOT);
    line(0, -224, 0, -246, 3, INK); poly([0, -246, 20, -240, 0, -234], LEMON);
    c.fillStyle = '#B98AE0'; c.beginPath(); c.arc(0, -10, 24, Math.PI, 0); c.lineTo(24, 0); c.lineTo(-24, 0); c.closePath(); c.fill();
    disc(-80, -96, 9, SKY); disc(80, -96, 9, SKY); disc(0, -120, 10, SKY);
    for (var i = -70; i < 70; i += 22) box(i, -100, 14, 12, 3, '#FFD6EC');
    c.restore();
  }
  function grass(y, col) {
    c.fillStyle = col; c.fillRect(0, y, W, H - y);
    for (var i = 0; i < 40; i++) disc((i * 97) % W, y + 6 + (i * 53) % (H - y), 3, 'rgba(255,255,255,0.35)');
  }

  function particles() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], a = Math.min(1, p.life / p.max * 1.6);
      c.globalAlpha = a;
      if (p.k === 1) { sparkle(p.x, p.y, p.s * 1.3, p.col); }
      else if (p.k === 2) heart(p.x, p.y, p.s, p.col);
      else if (p.k === 3) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }
      else disc(p.x, p.y, p.s / 2, p.col);
    }
    c.globalAlpha = 1;
    for (i = 0; i < floats.length; i++) {
      var f = floats[i], k = f.t / 1.2;
      c.globalAlpha = 1 - k * k;
      sparkle(f.x - 22, f.y - k * 70, 12, GOLD);
      text('+' + f.n, f.x - 4, f.y - k * 70, 26, HOT, 'left', '800', WHITE);
    }
    c.globalAlpha = 1;
  }

  /** Warm words at the top. */
  function banner(cx, max) {
    if (!msg) return;
    cx = cx || W / 2; max = max || 1100;
    var a = Math.min(1, msg.t * 5, (3.6 - msg.t) * 2), size = 28, lines = wrap(msg.text, size, max - 90), i, w = 0;
    for (i = 0; i < lines.length; i++) w = Math.max(w, width(lines[i], size, '800') + 90);
    var h = 22 + lines.length * 38, pop = 1 + Math.max(0, 0.15 - msg.t) * 2;
    c.save(); c.globalAlpha = Math.max(0, a); c.translate(cx, 16 + h / 2); c.scale(pop, pop);
    box(-w / 2, -h / 2, w, h, 30, 'rgba(255,255,255,0.95)');
    c.strokeStyle = PINK; c.lineWidth = 4; rr(-w / 2, -h / 2, w, h, 30); c.stroke();
    sparkle(-w / 2 + 30, 0, 12, HOT); sparkle(w / 2 - 30, 0, 12, HOT);
    for (i = 0; i < lines.length; i++) text(lines[i], 0, (i - (lines.length - 1) / 2) * 38 + 1, size, INK, 'center', '800');
    c.restore();
  }
  /** Words split into lines no wider than max. */
  function wrap(s, size, max) {
    var words = s.split(' '), out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var tryLine = cur ? cur + ' ' + words[i] : words[i];
      if (cur && width(tryLine, size, '800') > max) { out.push(cur); cur = words[i]; } else cur = tryLine;
    }
    if (cur) out.push(cur);
    return out;
  }
  function help(s) {
    var w = width(s, 20, '600') + 48;
    box(W / 2 - w / 2, H - 46, w, 36, 18, 'rgba(74,45,92,0.55)');
    text(s, W / 2, H - 28, 20, WHITE, 'center', '600');
  }
  /** The sparkle jar, top right: how full it is shows how close the next friend is. */
  function jar(x, y) {
    var nf = nextFriendAt(), prev = save.friends > 0 ? FRIENDS[save.friends - 1].at : 0, k = nf ? (save.sparkles - prev) / Math.max(1, nf - prev) : 1;
    box(x - 30, y - 50, 60, 76, 18, 'rgba(255,255,255,0.55)');
    c.save(); rr(x - 26, y - 44, 52, 66, 15); c.clip();
    var fy = y + 22 - 66 * Math.max(0, Math.min(1, k));
    var g = c.createLinearGradient(0, fy, 0, y + 22); g.addColorStop(0, '#FFB3D9'); g.addColorStop(1, '#C9A7FF');
    c.fillStyle = g; c.fillRect(x - 26, fy, 52, y + 22 - fy);
    for (var i = 0; i < 6; i++) sparkle(x - 16 + (i * 13) % 32, y + 14 - ((i * 17 + clock * 20) % 60), 4, WHITE);
    c.restore();
    box(x - 34, y - 58, 68, 14, 7, '#FF8FC8');
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; rr(x - 30, y - 50, 60, 76, 18); c.stroke();
    text(String(save.sparkles), x - 48, y - 18, 34, WHITE, 'right', '800', HOT);
    text(L(SPARKLES), x - 48, y + 14, 18, WHITE, 'right', '700', 'rgba(255,95,162,0.9)');
  }
  /** The end of a round: a card in the middle with the good news. */
  function card(title, line2, helpText) {
    var tw = width(title, 32, '800'), w = Math.max(620, tw + 200), bounce = Math.sin(clock * 4) * 4;
    box(W / 2 - w / 2, 18, w, 176, 40, 'rgba(255,255,255,0.96)');
    c.strokeStyle = PINK; c.lineWidth = 6; rr(W / 2 - w / 2, 18, w, 176, 40); c.stroke();
    star(W / 2 - tw / 2 - 50, 66 + bounce, 26, GOLD); star(W / 2 + tw / 2 + 50, 66 - bounce, 26, GOLD);
    text(title, W / 2, 68, 32, INK, 'center', '800');
    if (line2) text(line2, W / 2, 118, 26, HOT, 'center', '700');
    text(helpText, W / 2, 160, 20, '#8A6A9C', 'center', '600');
    msg = null;
  }

  // MARK: - Drawing each scene

  function drawMap(quiet) {
    sky('#FFD9EE', '#E4DAFF');
    var t = clock, i;
    rainbow(1020, 300, 260, 16, 0.55);
    cloud(120 + Math.sin(t * 0.2) * 20, 120, 1); cloud(520 + Math.sin(t * 0.15 + 1) * 30, 90, 0.8); cloud(1100 + Math.sin(t * 0.18 + 2) * 20, 150, 0.9);
    hill(120, 330, 160, '#FFB3D9'); hill(400, 320, 130, '#C9A7FF'); hill(640, 340, 170, '#A8EBD5'); hill(1240, 330, 150, '#FFE58A');
    grass(300, '#BDF2D5');
    hill(-20, 360, 90, '#9FE8C9');
    // The chocolate river and its lake.
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#8A5A3C'; c.lineWidth = 46; c.beginPath(); c.moveTo(RIVER[0][0], RIVER[0][1]); for (i = 1; i < RIVER.length; i++) c.lineTo(RIVER[i][0], RIVER[i][1]); c.stroke();
    oval(360, 392, 130, 46, '#8A5A3C');
    c.strokeStyle = '#B07A55'; c.lineWidth = 6;
    for (i = 1; i < RIVER.length; i++) {
      var ra = RIVER[i - 1], rb = RIVER[i], rk = (t * 0.25 + i * 0.37) % 1;
      oval(ra[0] + (rb[0] - ra[0]) * rk, ra[1] + (rb[1] - ra[1]) * rk, 14, 4, 'rgba(255,230,200,0.45)');
    }
    // The path: a candy ribbon.
    c.strokeStyle = WHITE; c.lineWidth = 50; c.beginPath(); c.moveTo(PATH[0][0], PATH[0][1]); for (i = 1; i < PATH.length; i++) c.lineTo(PATH[i][0], PATH[i][1]); c.stroke();
    c.strokeStyle = '#FFB8D9'; c.lineWidth = 38; c.stroke();
    if (c.setLineDash) { c.strokeStyle = WHITE; c.lineWidth = 10; c.setLineDash([18, 26]); c.lineDashOffset = -t * 20; c.stroke(); c.setLineDash([]); }
    // The rainbow bridge over the river.
    c.save(); c.translate(1008, 352); c.rotate(-0.42); rainbow(0, 30, 54, 7, 1); c.restore();
    // Trees and canes.
    var trees = [[70, 420, PINK], [300, 470, LILAC], [560, 480, MINT], [770, 470, LEMON], [1230, 640, PINK], [600, 700, PEACH]];
    for (i = 0; i < trees.length; i++) lollyTree(trees[i][0], trees[i][1], 0.7, trees[i][2]);
    // The friends who have come.
    for (i = 1; i < save.friends; i++) critter(i, FRIEND_SPOTS[i][0], FRIEND_SPOTS[i][1], 0.55, t + i, (Math.floor(t / 3) + i) % 4 === 0);
    unicorn(FRIEND_SPOTS[0][0], FRIEND_SPOTS[0][1], 0.42, t, true);
    // The places.
    for (i = 0; i < PLACES.length; i++) place(i, t);
    // The player, walking or standing at a place.
    var px, py, dir = 1;
    if (walk) {
      var a = PLACES[walk.from], b = PLACES[walk.to], k = walk.t;
      px = a.x + (b.x - a.x) * k; py = a.y + (b.y - a.y) * k + 46 - Math.sin(k * Math.PI * 3) * 14 * (1 - k * 0.3);
      dir = b.x < a.x ? -1 : 1;
    } else { px = PLACES[here].x; py = PLACES[here].y + 46; }
    if (save.look.pet >= 0 && save.look.pet < save.friends) critter(save.look.pet, px - 70 * dir, py, 0.45, t, !!walk);
    player(px, py, 0.42, t, 0, dir);
    // The info card: the title, then where you are.
    var pl = PLACES[walk ? walk.to : here];
    box(20, 18, 400, 112, 26, 'rgba(255,255,255,0.88)');
    var dc = [MINT, LEMON, '#FF8A65', SKY];
    for (i = 0; i < 4; i++) disc(46 + i * 18, 42, 6, dc[i]);
    text(L(TITLE), 124, 42, 20, HOT, 'left', '800');
    text(L(pl.name), 40, 80, 30, INK, 'left', '800');
    text(L(pl.about), 40, 112, 19, '#8A6A9C', 'left', '600');
    jar(1220, 78);
    var nf = nextFriendAt();
    text(nf ? fill(JAR, nf - save.sparkles) : L(JAR_FULL), 1250, 136, 16, INK, 'right', '700', 'rgba(255,255,255,0.85)');
    particles();
    if (!quiet) { banner(755, 640); help(L(MAP_HELP)); }
  }

  /** A place's little building on the map. */
  function place(i, t) {
    var p = PLACES[i], on = i === (walk ? walk.to : here), s = on ? 1.12 + Math.sin(t * 4) * 0.03 : 1, x = p.x, y = p.y;
    if (on) {
      oval(x, y + 30, 90, 26, 'rgba(255,255,255,0.7)');
      for (var k = 0; k < 6; k++) { var a = t * 1.6 + k * TAU / 6; sparkle(x + Math.cos(a) * 92, y - 30 + Math.sin(a) * 40, 9, k % 2 ? HOT : GOLD); }
    }
    c.save(); c.translate(x, y); c.scale(s, s);
    if (p.id === 'bakery') {
      box(-56, -70, 112, 80, 10, CREAM);
      c.fillStyle = PINK; c.beginPath(); c.moveTo(-66, -66); c.lineTo(0, -120); c.lineTo(66, -66); c.closePath(); c.fill();
      for (var d = -54; d <= 54; d += 18) disc(d, -64, 9, PINK);
      disc(0, -126, 10, '#E8364F');
      box(-14, -36, 28, 46, 12, '#C98D5E'); disc(-36, -40, 10, SKY); disc(36, -40, 10, SKY);
    } else if (p.id === 'garden') {
      for (var g = -60; g <= 60; g += 20) box(g - 5, -34, 10, 44, 4, WHITE);
      box(-66, -24, 132, 8, 4, WHITE);
      lollyTree(-34, 0, 0.5, PINK); lollyTree(4, 0, 0.6, MINT); lollyTree(40, 0, 0.45, LEMON);
    } else if (p.id === 'shop') {
      box(-60, -60, 120, 72, 8, CREAM);
      for (var st = 0; st < 6; st++) poly([-66 + st * 22, -96, -44 + st * 22, -96, -44 + st * 22, -64, -66 + st * 22, -64], st % 2 ? WHITE : HOT);
      for (st = 0; st < 6; st++) disc(-55 + st * 22, -64, 11, st % 2 ? WHITE : HOT);
      box(-44, -34, 88, 10, 4, '#C98D5E');
      treat('lolly', -26, -46, 0.4); treat('cupcake', 0, -44, 0.4); treat('macaron', 26, -42, 0.4);
    } else if (p.id === 'catch') {
      flossCloud(0, -96, 0.6);
      for (var f = 0; f < 3; f++) treat(['sweet', 'star', 'gumdrop'][f], -30 + f * 30, -50 + ((t * 40 + f * 18) % 40), 0.4);
      c.fillStyle = '#C98D5E'; c.beginPath(); c.moveTo(-36, -14); c.lineTo(36, -14); c.lineTo(26, 10); c.lineTo(-26, 10); c.closePath(); c.fill();
    } else if (p.id === 'ride') {
      rainbow(0, 4, 70, 9, 1);
      star(0, -100 + Math.sin(t * 3) * 6, 14, GOLD);
    } else if (p.id === 'dress') {
      castle(0, 6, 0.6);
    }
    c.restore();
  }

  function drawBakery() {
    var b = bake, t = clock, i, cx = W / 2 + 80, cy = 560;
    sky('#FFE9F3', '#FFF6E8');
    // The bakery's wall: soft stripes and a window of clouds.
    c.fillStyle = 'rgba(255,183,214,0.25)';
    for (i = 0; i < 16; i += 2) c.fillRect(i * 80, 0, 80, 460);
    // Bunting along the top.
    for (i = 0; i < 14; i++) poly([i * 96, 0, i * 96 + 96, 0, i * 96 + 48, 44], BURST[i % 6]);
    box(0, 600, W, 120, 0, '#F5D3B5'); box(0, 596, W, 12, 0, '#E9B892');
    // The cake stand.
    oval(cx, cy + 46, 190, 22, '#E7E2F7'); box(cx - 16, cy + 46, 32, 60, 8, '#E7E2F7'); oval(cx, cy + 110, 90, 14, '#D9D2F0');
    // The cake, a little bigger than life.
    c.save(); c.translate(cx, cy); c.scale(1.3, 1.3);
    cake(0, 34, b.shape, b.step > 0 ? ICINGS[b.icing].colour : '#F7D9B5', b.step > 0, t);
    if (b.sprinkles) {
      var sp = [LEMON, MINT, SKY, HOT, LILAC, WHITE];
      for (i = 0; i < 40; i++) { var sx = ((i * 47) % 200) - 100, sy = 34 - ((i * 31) % (b.shape === 2 ? 220 : 90)) - 10; line(sx, sy, sx + 4, sy + 3, 3, sp[i % 6]); }
    }
    for (i = 0; i < b.tops.length; i++) {
      var tp = b.tops[i], pop = Math.min(1, tp.t * 5), sc = pop < 1 ? pop * 1.25 : 1;
      treat(tp.id, tp.x, tp.y - (1 - pop) * 80, 0.55 * sc);
    }
    c.restore();
    // The baker: you, beside the cake.
    player(220, 640, 0.75, t, b.done ? Math.min(1, b.t) : 0, 1);
    if (save.look.pet >= 0 && save.look.pet < save.friends) critter(save.look.pet, 360, 650, 0.6, t, b.done);
    // What to choose.
    if (!b.done) {
      text(L(CAKE_STEPS[b.step]), W / 2, 130, 34, INK, 'center', '800', WHITE);
      if (b.step === 0) chooser([L(SHAPES[0]), L(SHAPES[1]), L(SHAPES[2])], b.shape, W / 2, 200);
      else if (b.step === 1) {
        var names = [], cols = [];
        for (i = 0; i < ICINGS.length; i++) { names.push(L(ICINGS[i].name)); cols.push(ICINGS[i].colour); }
        chooser(names, b.icing, W / 2, 200, cols);
      } else toppingTray(b.sel, t);
    }
    particles();
    if (b.done) card(L(CAKE_DONE), L(pickOfFixed(CHEERS, save.cakes)), L(CAKE_AGAIN));
    banner();
    if (!b.done) help(L(CAKE_HELP[b.step === 2 ? 1 : 0]));
  }
  function pickOfFixed(list, n) { return list[n % list.length]; }

  /** ◀ name ▶ with dots for each choice (or colour swatches). */
  function chooser(names, at, x, y, colours) {
    var w = Math.max(260, width(names[at], 30, '800') + 120);
    box(x - w / 2, y - 32, w, 64, 32, 'rgba(255,255,255,0.9)');
    text('◀', x - w / 2 + 28, y, 26, HOT, 'center', '800'); text('▶', x + w / 2 - 28, y, 26, HOT, 'center', '800');
    text(names[at], x, y + 1, 30, INK, 'center', '800');
    for (var i = 0; i < names.length; i++) {
      var dx = x + (i - (names.length - 1) / 2) * 30;
      if (colours) { disc(dx, y + 56, i === at ? 13 : 10, colours[i]); c.strokeStyle = i === at ? HOT : WHITE; c.lineWidth = 3; c.beginPath(); c.arc(dx, y + 56, i === at ? 13 : 10, 0, TAU); c.stroke(); }
      else disc(dx, y + 56, i === at ? 8 : 5, i === at ? HOT : 'rgba(255,255,255,0.9)');
    }
  }
  function toppingTray(sel, t) {
    var n = TOPPINGS.length + 1, gap = 112, x0 = W / 2 - (n - 1) * gap / 2, y = 222;
    box(x0 - 70, y - 54, (n - 1) * gap + 140, 108, 30, 'rgba(255,255,255,0.88)');
    for (var i = 0; i < n; i++) {
      var x = x0 + i * gap, on = i === sel;
      if (on) { box(x - 48, y - 48, 96, 96, 24, '#FFE1F0'); c.strokeStyle = HOT; c.lineWidth = 4; rr(x - 48, y - 48, 96, 96, 24); c.stroke(); }
      var bob = on ? Math.sin(t * 6) * 4 : 0;
      if (i === TOPPINGS.length) { star(x, y - 8 + bob, 26, GOLD); text(L(ALL_DONE), x, y + 34, 15, INK, 'center', '800'); }
      else if (TOPPINGS[i].id === 'sprinkles') {
        var sp = [LEMON, MINT, SKY, HOT, LILAC];
        for (var k = 0; k < 12; k++) line(x - 22 + (k * 13) % 44, y - 26 + (k * 7) % 30 + bob, x - 18 + (k * 13) % 44, y - 23 + (k * 7) % 30 + bob, 3, sp[k % 5]);
      } else treat(TOPPINGS[i].id, x, y - 8 + bob, 0.65);
    }
    var nm = sel === TOPPINGS.length ? L(ALL_DONE) : L(TOPPINGS[sel].name);
    text(nm, x0 + sel * gap, y + 76, 22, INK, 'center', '800', WHITE);
  }
  /** The cake itself: bottom centre at (x, y). */
  function cake(x, y, shape, icing, iced, t) {
    var sponge = '#F7D9B5', i;
    if (shape === 0) {
      box(x - 130, y - 110, 260, 110, 24, sponge);
      box(x - 130, y - 70, 260, 14, 7, '#FF9EC6');
      if (iced) {
        box(x - 134, y - 120, 268, 44, 22, icing);
        for (i = 0; i < 9; i++) box(x - 120 + i * 30, y - 90, 18, 22 + (i % 3) * 10, 9, icing);
      }
    } else if (shape === 1) {
      c.fillStyle = iced ? icing : sponge;
      c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x - 200, y - 70, x - 120, y - 180, x, y - 110);
      c.bezierCurveTo(x + 120, y - 180, x + 200, y - 70, x, y); c.fill();
      if (iced) { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 6; c.stroke(); }
    } else {
      var tiers = [[260, 80], [190, 74], [120, 66]], yy = y;
      for (i = 0; i < 3; i++) {
        var tw = tiers[i][0], th = tiers[i][1];
        box(x - tw / 2, yy - th, tw, th, 18, iced ? icing : sponge);
        if (iced) { for (var d = 0; d < tw / 26; d++) disc(x - tw / 2 + 14 + d * 26, yy - th + 4, 11, icing); box(x - tw / 2, yy - th / 2 - 4, tw, 8, 4, 'rgba(255,255,255,0.55)'); }
        yy -= th;
      }
    }
  }

  function drawRide() {
    var r = ride, t = clock, i;
    sky('#C9B8FF', '#FFD6EC');
    // Far away: the moon, soft hills and clouds drifting by.
    disc(1120, 110, 40, 'rgba(255,255,255,0.7)');
    var off = r.scroll;
    for (i = 0; i < 5; i++) cloud(((i * 330 - off * 0.3) % 1650 + 1650) % 1650 - 200, 110 + (i * 97) % 200, 0.8 + (i % 3) * 0.2, 'rgba(255,255,255,0.7)');
    var hc = ['#FFB3D9', '#C9A7FF', '#A8EBD5', '#FFE58A'];
    for (i = 0; i < 6; i++) hill(((i * 300 - off * 0.5) % 1800 + 1800) % 1800 - 200, 700, 170, hc[i % 4]);
    for (i = 0; i < 7; i++) lollyTree(((i * 230 - off) % 1610 + 1610) % 1610 - 100, 720, 0.8, hc[(i + 1) % 4]);
    // Rainbow trail behind the unicorn.
    var cols = ['#FF6F91', '#FFB33C', '#FFE58A', '#8FE3CF', '#8FC8FF', '#C9A7FF'];
    for (i = 0; i < 6; i++) {
      c.strokeStyle = cols[i]; c.globalAlpha = 0.85; c.lineWidth = 7; c.beginPath();
      for (var x = 0; x <= 210; x += 10) { var yy = r.y - 8 + i * 7 + Math.sin((x + off) * 0.03) * 6; if (x) c.lineTo(x, yy); else c.moveTo(x, yy); }
      c.stroke();
    }
    c.globalAlpha = 1;
    // The castle at the end.
    if (r.t > RIDE_TIME - 6 || r.done) {
      var k = r.done ? 1 : (r.t - (RIDE_TIME - 6)) / 6;
      castle(W + 160 - k * 420, 640, 1.3);
      rainbow(W + 160 - k * 420, 640, 360, 14, 0.5);
    }
    for (i = 0; i < r.items.length; i++) {
      var it = r.items[i], by = it.y + Math.sin(t * 3 + it.bob) * 6;
      if (it.kind === 'ring') {
        c.lineWidth = 9;
        for (var j = 0; j < 6; j++) { c.strokeStyle = cols[j]; c.beginPath(); if (c.ellipse) c.ellipse(it.x, it.y, 30 - j * 2, 66 - j * 7, 0, 0, TAU); else c.arc(it.x, it.y, 56 - j * 6, 0, TAU); c.stroke(); }
      } else treat(it.kind, it.x, by, it.kind === 'star' ? 0.8 : 0.75, Math.sin(t * 2 + it.bob) * 0.2);
    }
    var spin = r.spin > 0 ? (0.7 - r.spin) / 0.7 : 0;
    var ux = r.done ? 280 + Math.min(1, r.endT / 2) * 500 : 280;
    c.save(); c.translate(ux, r.y + 40); if (spin) c.rotate(spin * TAU); unicorn(0, 40, 0.9, t, false, true);
    player(4, -6, 0.36, t, 0, 1);
    c.restore();
    if (r.magnet > 0) { c.strokeStyle = 'rgba(255,255,255,' + (r.magnet / 1.6 * 0.6) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(280, r.y, 120 + (1.6 - r.magnet) * 60, 0, TAU); c.stroke(); }
    // How far to the castle.
    var prog = Math.min(1, r.t / RIDE_TIME);
    box(440, 104, 400, 14, 7, 'rgba(255,255,255,0.6)');
    box(440, 104, Math.max(14, 400 * prog), 14, 7, HOT);
    castle(864, 122, 0.16); player(440 + 400 * prog, 102, 0.12, t, 0, 1);
    text(fill(GOT, r.got), 40, 110, 28, WHITE, 'left', '800', HOT);
    jar(1220, 78);
    particles();
    if (r.done && r.endT > 1) card(L(RIDE_DONE), fill(GOT, r.got), L(AGAIN));
    banner();
    if (!r.done) help(L(RIDE_HELP));
  }

  function drawCatch() {
    var s = shower, t = clock, i;
    sky('#BDE6FF', '#FFE9F3');
    cloud(80, 260, 0.8); cloud(1080, 230, 0.9);
    hill(200, 720, 220, '#FFC7E3'); hill(1100, 720, 240, '#D9C8FF');
    grass(650, '#BDF2D5');
    for (i = 0; i < COLS.length; i++) flossCloud(COLS[i], 120 + Math.sin(t * 1.5 + i) * 6, 0.9);
    for (i = 0; i < COLS.length; i++) for (var d = 0; d < 3; d++) disc(COLS[i] - 30 + d * 30, 180 + ((t * 30 + d * 20 + i * 7) % 30), 3, 'rgba(255,255,255,0.7)');
    for (i = 0; i < s.items.length; i++) { var it = s.items[i]; treat(it.kind, it.x, it.y, 0.8, it.rot); }
    // Bubbles the bunny, enjoying a dropped sweet.
    if (s.bunny) {
      var b = s.bunny, bx = b.x + (b.t < 0.6 ? (0.6 - b.t) * 300 : 0);
      if (b.t < 1.6) treat(b.kind, b.x, 668, 0.5 * Math.max(0.2, 1 - Math.max(0, b.t - 0.6)));
      critter(1, bx + 30, 690, 0.6, t, b.t < 0.6);
      if (b.t > 0.7 && b.t < 2.4) heart(bx + 50, 600 - (b.t - 0.7) * 30, 12, HOT);
    }
    // The basket, and you behind it.
    var wig = s.wiggle > 0 ? Math.sin(s.wiggle * 40) * 0.12 : 0;
    player(s.x - 70, 690, 0.48, t, 0, 1);
    c.save(); c.translate(s.x, 640); c.rotate(wig);
    var heap = Math.min(5, Math.floor(s.got / 6));
    for (i = 0; i < heap; i++) treat(TREATS[i * 3 % TREATS.length].id, -40 + i * 20, -28 - (i % 2) * 8, 0.45);
    c.fillStyle = '#E8A15A'; c.beginPath(); c.moveTo(-76, -30); c.lineTo(76, -30); c.lineTo(58, 30); c.lineTo(-58, 30); c.closePath(); c.fill();
    c.strokeStyle = '#C98245'; c.lineWidth = 4;
    for (i = -60; i <= 60; i += 20) { c.beginPath(); c.moveTo(i, -30); c.lineTo(i * 0.78, 30); c.stroke(); }
    box(-80, -38, 160, 14, 7, HOT);
    heart(0, -2, 12, WHITE);
    c.restore();
    var prog = Math.min(1, s.t / SHOWER_TIME);
    box(440, 104, 400, 14, 7, 'rgba(255,255,255,0.7)'); box(440, 104, Math.max(14, 400 * prog), 14, 7, LILAC);
    text(fill(GOT, s.got), 40, 110, 28, WHITE, 'left', '800', HOT);
    jar(1220, 78);
    particles();
    if (s.done && s.endT > 1) card(fill(CATCH_DONE, s.got), L(pickOfFixed(CHEERS, save.caught)), L(AGAIN));
    banner();
    if (!s.done) help(L(CATCH_HELP));
  }

  function drawGarden() {
    var g = garden, t = clock, i;
    sky('#C8EEFF', '#FFF3E0');
    // A smiling sun.
    c.save(); c.translate(1010, 150); c.rotate(t * 0.2);
    for (i = 0; i < 12; i++) { c.rotate(TAU / 12); poly([0, -70, -10, -52, 10, -52], LEMON); }
    c.restore();
    disc(1010, 150, 48, '#FFD84D'); face(1010, 148, 1.2, true);
    cloud(140, 120, 0.8); cloud(560, 90, 0.6);
    hill(120, 320, 150, '#FFC7E3'); hill(700, 330, 190, '#D9C8FF');
    grass(300, '#A8EBC9');
    for (i = 0; i < 26; i++) { box(40 + i * 48, 220, 12, 70, 6, WHITE); }
    box(30, 240, W - 60, 10, 5, WHITE);
    // Butterflies.
    for (i = 0; i < 3; i++) { var bx = 200 + i * 380 + Math.sin(t * 0.6 + i) * 80, by = 220 + Math.sin(t * 1.3 + i * 2) * 30, fl = Math.abs(Math.sin(t * 9 + i)); oval(bx - 8 * fl, by, 9 * fl, 7, [PINK, LILAC, LEMON][i]); oval(bx + 8 * fl, by, 9 * fl, 7, [PINK, LILAC, LEMON][i]); }
    for (i = 0; i < PLOTS.length; i++) {
      var at = PLOTS[i], on = i === g.sel, p = plot(i), st = stage(p);
      oval(at[0], at[1] + 30, 100, 34, on ? '#9C6B4A' : '#8A5A3C');
      oval(at[0], at[1] + 24, 92, 26, '#A9785A');
      if (on) { c.strokeStyle = HOT; c.lineWidth = 5; c.beginPath(); if (c.ellipse) c.ellipse(at[0], at[1] + 26, 108, 40, 0, 0, TAU); else c.arc(at[0], at[1] + 26, 100, 0, TAU); c.stroke(); }
      if (st === 'seed') { oval(at[0], at[1] + 16, 16, 9, '#6B4226'); disc(at[0] - 4, at[1] + 12, 3, LEMON); }
      else if (st !== 'empty') growPlant(p.k, at[0], at[1] + 22, st === 'ready' ? 1 : Math.min(1, (now() - p.w) / GROW), t, i);
      var label = st === 'empty' ? L(PLANT_HERE) : st === 'seed' ? L(WATER_ME) : st === 'growing' ? L(GROWING) : L(READY);
      if (on || st === 'ready' || st === 'seed') text(label, at[0], at[1] + 70, on ? 20 : 16, on ? INK : '#6B5A7A', 'center', '800', 'rgba(255,255,255,0.85)');
    }
    // The watering can, and a picked treat flying to the jar.
    if (g.can > 0) {
      var cp = PLOTS[g.sel];
      c.save(); c.translate(cp[0] + 70, cp[1] - 120); c.rotate(-0.5);
      box(-36, -24, 72, 48, 14, SKY); poly([30, -12, 74, -40, 78, -32, 34, 0], SKY); c.restore();
      for (i = 0; i < 8; i++) disc(cp[0] + 20 + (i * 9) % 30, cp[1] - 80 + ((t * 300 + i * 30) % 100), 4, '#6EC6FF');
    }
    if (g.pick) {
      var pk = g.pick, k = pk.t;
      treat(PLANT_TREAT[pk.k], pk.x + (1200 - pk.x) * k * k, pk.y + (60 - pk.y) * k - Math.sin(k * Math.PI) * 140, 0.9 - k * 0.4);
    }
    player(150, 690, 0.55, t, 0, 1);
    if (save.look.pet >= 0 && save.look.pet < save.friends) critter(save.look.pet, 250, 700, 0.5, t, false);
    text(L(PLACES[1].name), 40, 110, 30, WHITE, 'left', '800', HOT);
    var sel = plot(g.sel);
    if (sel) text(L(PLANTS[sel.k].name), 40, 150, 22, INK, 'left', '700', 'rgba(255,255,255,0.85)');
    jar(1220, 78);
    particles();
    banner();
    help(L(GARDEN_HELP));
  }
  var PLANT_TREAT = ['lolly', 'cane', 'gumdrop', 'cupcake', 'floss', 'lolly'];
  /** A plant from its sprout (k near 0) to full bloom (k = 1), roots at (x, y). */
  function growPlant(kind, x, y, k, t, i) {
    var sway = Math.sin(t * 2 + i) * 0.05, h = 16 + 64 * k;
    c.save(); c.translate(x, y); c.rotate(sway);
    line(0, 0, 0, -h, 7, '#5CBF5C');
    if (k > 0.15) { oval(-14, -h * 0.35, 14, 6, '#7ED957'); oval(14, -h * 0.55, 14, 6, '#7ED957'); }
    if (k < 0.4) { oval(-8, -h, 9, 5, '#7ED957'); oval(8, -h, 9, 5, '#7ED957'); }
    else {
      var s = 0.35 + (k - 0.4) * 0.9, top = -h - 10;
      if (kind === 0) treat('lolly', 0, top, s * 1.1);
      else if (kind === 1) treat('cane', 0, top + 10, s * 1.2);
      else if (kind === 2) { treat('gumdrop', -18, top + 20, s * 0.8); treat('gumdrop', 18, top + 16, s * 0.8); treat('gumdrop', 0, top - 4, s * 0.9); }
      else if (kind === 3) { disc(0, top, 40 * s, '#7ED957'); treat('cupcake', -18 * s, top, s * 0.6); treat('cupcake', 18 * s, top - 8 * s, s * 0.6); }
      else if (kind === 4) treat('floss', 0, top + 14, s * 1.2);
      else { c.save(); c.translate(0, top); c.rotate(t * 2); var cols = ['#FF6F91', '#FFB33C', '#FFE58A', '#8FE3CF', '#8FC8FF', '#C9A7FF']; for (var j = 0; j < 6; j++) { c.rotate(TAU / 6); oval(0, -14 * s, 9 * s, 18 * s, cols[j]); } disc(0, 0, 8 * s, WHITE); c.restore(); }
      if (k >= 1) for (var q = 0; q < 3; q++) sparkle(Math.cos(t * 2 + q * 2) * 40, top + Math.sin(t * 2 + q * 2) * 30, 7, GOLD);
    }
    c.restore();
  }

  function drawShop() {
    var s = shop, t = clock, i;
    sky('#FFF1F7', '#FFE3EF');
    // Shelves of jars on the back wall.
    for (i = 0; i < 3; i++) {
      box(60, 196 + i * 104, 600, 12, 6, '#E9B892');
      for (var j = 0; j < 6; j++) {
        var jx = 90 + j * 95, jy = 146 + i * 104;
        box(jx, jy, 60, 50, 12, 'rgba(255,255,255,0.65)');
        for (var q = 0; q < 4; q++) disc(jx + 14 + (q % 2) * 30, jy + 18 + Math.floor(q / 2) * 18, 9, BURST[(i * 6 + j + q) % 8]);
        box(jx + 6, jy - 6, 48, 10, 5, [HOT, LILAC, MINT][i]);
      }
    }
    // The awning.
    for (i = 0; i < 17; i++) { box(i * 80, 0, 80, 70, 0, i % 2 ? WHITE : PINK); disc(i * 80 + 40, 70, 40, i % 2 ? WHITE : PINK); }
    // The friend at the counter, with their wish.
    var cu = s.cust;
    if (cu) {
      critter(cu.friend, cu.x, 520, 1.6, t, cu.state === 'happy');
      if (cu.state === 'wait' || (cu.state === 'in' && cu.x < 980)) {
        disc(cu.x - 120, 310, 12, WHITE); disc(cu.x - 150, 280, 18, WHITE);
        box(cu.x - 300, 150, 220, 130, 50, WHITE);
        text(L(WISH), cu.x - 190, 180, 20, INK, 'center', '700');
        treat(TREATS[cu.want].id, cu.x - 190, 236, 1.05);
      }
      if (cu.state === 'happy') {
        treat(TREATS[cu.got].id, cu.x - 60, 420, 0.7);
        for (i = 0; i < 3; i++) heart(cu.x - 40 + i * 40, 260 - (cu.t * 60 + i * 20) % 80, 14, HOT);
      }
    }
    // The counter, with the treats on it.
    box(0, 520, W, 200, 0, '#FFC2DE');
    for (i = 0; i < 16; i++) box(i * 80 + 10, 540, 30, 180, 15, 'rgba(255,255,255,0.4)');
    box(0, 510, W, 26, 10, '#FF9ECB');
    box(150, 548, 720, 120, 30, 'rgba(255,255,255,0.85)');
    for (i = 0; i < 5; i++) {
      var x = 230 + i * 140, on = i === s.sel, b = on ? Math.sin(t * 6) * 5 : 0;
      if (on) { box(x - 58, 556, 116, 104, 24, '#FFE1F0'); c.strokeStyle = HOT; c.lineWidth = 4; rr(x - 58, 556, 116, 104, 24); c.stroke(); }
      if (!(s.flying && s.flying.k === s.shelf[i] && i === s.sel)) treat(TREATS[s.shelf[i]].id, x, 596 + b, 0.9);
      text(L(TREATS[s.shelf[i]].name), x, 644, 15, INK, 'center', '800');
    }
    if (s.flying) {
      var f = s.flying, k = f.t;
      treat(TREATS[f.k].id, f.x0 + (cu.x - 60 - f.x0) * k, f.y0 + (420 - f.y0) * k - Math.sin(k * Math.PI) * 180, 0.9, k * TAU);
    }
    player(1060, 700, 0.5, t, 0, -1);
    // Happy friends so far.
    for (i = 0; i < DAY; i++) heart(960 + i * 34, 600, 13, i < s.served ? HOT : 'rgba(255,95,162,0.25)');
    text(L(PLACES[2].name), 40, 110, 30, WHITE, 'left', '800', HOT);
    jar(1220, 78);
    particles();
    if (s.done && s.endT > 1) card(fill(SHOP_DONE, s.served), L(pickOfFixed(CHEERS, save.served)), L(SHOP_AGAIN));
    banner();
    if (!s.done) help(L(SHOP_HELP));
  }

  function drawDress() {
    var d = dress, t = clock, i;
    sky('#E8D9FF', '#FFE3EF');
    // The castle's ballroom: arches, curtains and a mirror frame.
    for (i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(140 + i * 340, 420, 130, Math.PI, 0); c.lineTo(270 + i * 340, 720); c.lineTo(10 + i * 340, 720); c.closePath(); c.fill(); }
    box(0, 600, W, 120, 0, '#F2C7E0');
    for (i = 0; i < 16; i++) box(i * 80, 600, 40, 120, 0, 'rgba(255,255,255,0.25)');
    oval(820, 380, 230, 290, GOLD); oval(820, 380, 214, 274, '#F7F2FF');
    for (i = 0; i < 10; i++) sparkle(820 + Math.cos(i * 0.63 + t) * 240, 380 + Math.sin(i * 0.63 + t) * 300, 8, i % 2 ? HOT : WHITE);
    oval(820, 650, 150, 18, 'rgba(74,45,92,0.12)');
    player(820, 640, 2.1, t, d.twirl ? 1 - d.twirl : 0, 1);
    if (save.look.pet >= 0 && save.look.pet < save.friends) critter(save.look.pet, 1110, 650, 1.1, t, d.twirl > 0);
    // The list of what to change.
    box(30, 110, 420, PARTS.length * 62 + 20, 30, 'rgba(255,255,255,0.9)');
    for (i = 0; i < PARTS.length; i++) {
      var p = PARTS[i], y = 150 + i * 62, on = i === d.row, v = save.look[p.id];
      if (on) { box(40, y - 28, 400, 56, 24, '#FFE1F0'); c.strokeStyle = HOT; c.lineWidth = 3; rr(40, y - 28, 400, 56, 24); c.stroke(); }
      text(L(p.name), 62, y, 20, on ? INK : '#8A6A9C', 'left', '800');
      if (p.colours) {
        disc(370, y, 15, p.colours[v] || p.colours[0]);
        c.strokeStyle = WHITE; c.lineWidth = 3; c.beginPath(); c.arc(370, y, 15, 0, TAU); c.stroke();
      } else {
        var nm = p.id === 'pet' ? (v >= 0 && v < save.friends ? FRIENDS[v].name : L(NOTHING)) : L(p.options[v] || p.options[0]);
        text(nm, 410, y, 18, on ? HOT : INK, 'right', '700');
      }
      if (on) { text('◀', 250, y, 18, HOT, 'center', '800'); text('▶', 426, y, 18, HOT, 'center', '800'); }
    }
    text(L(PLACES[5].name), 40, 70, 30, WHITE, 'left', '800', HOT);
    jar(1220, 78);
    particles();
    banner();
    help(L(DRESS_HELP));
  }

  function drawFriend() {
    drawMap(true);
    c.fillStyle = 'rgba(120,60,130,0.4)'; c.fillRect(0, 0, W, H);
    var f = FRIENDS[newFriend], t = clock;
    box(W / 2 - 340, 110, 680, 500, 50, 'rgba(255,255,255,0.97)');
    c.strokeStyle = PINK; c.lineWidth = 8; rr(W / 2 - 340, 110, 680, 500, 50); c.stroke();
    rainbow(W / 2, 470, 220, 14, 0.6);
    text(L(NEW_FRIEND), W / 2, 170, 32, INK, 'center', '800');
    if (f.id === 'unicorn') unicorn(W / 2, 470, 1, t, false); else critter(newFriend, W / 2, 470, 1.9, t, true);
    text(f.name, W / 2, 516, 44, HOT, 'center', '800');
    text(L(f.kind), W / 2, 560, 24, '#8A6A9C', 'center', '700');
    particles();
    help(L(CARRY_ON));
  }

  function render() {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    if (scene === 'map') drawMap();
    else if (scene === 'friend') drawFriend();
    else if (scene === 'bakery') drawBakery();
    else if (scene === 'ride') drawRide();
    else if (scene === 'catch') drawCatch();
    else if (scene === 'garden') drawGarden();
    else if (scene === 'shop') drawShop();
    else if (scene === 'dress') drawDress();
  }

  // MARK: - The screen

  var live = false, last = 0, canvas = null;
  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
  function isBack(k) { return k === 27 || k === 8 || k === 4 || k === 461 || k === 10009 || (window.TV && TV.keys && k === TV.keys.back); }

  function frame(nowT) {
    if (!live) return;
    nowT = nowT || Date.now();
    var dt = last ? Math.min(0.05, Math.max(0, (nowT - last) / 1000)) : 0.016;
    last = nowT;
    step(dt);
    if (c) render();
    raf(frame);
  }

  /** Fresh state for a visit: the map, and a hello. */
  function begin() {
    save = load();
    seed = (Date.now() % 100000) + 7;
    scene = 'map'; here = 0; walk = null; parts = []; floats = []; pending = 0; newFriend = -1; clock = 0;
    // Friends earned on another visit (or a newer list) are counted again, quietly.
    save.friends = Math.max(save.friends, friendsFor(save.sparkles));
    say(fill(HELLO[Math.floor(rnd() * HELLO.length)], playerName()));
  }

  function open() {
    begin();
    last = 0;
    UI.open({
      cls: 'bt-candy',
      build: function (layer) {
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H; canvas.className = 'cd-canvas';
        layer.appendChild(canvas);
        c = canvas.getContext('2d');
      },
      key: function (k) {
        // Back goes to back() below (UI's own handling), so it always goes up one level.
        if (isBack(k)) return false;
        return press(k);
      },
      back: back,
      closed: function () {
        store(); hush();
        live = false; c = null; canvas = null;
      }
    });
    live = true;
    sound('chime');
    raf(frame);
  }

  return {open: open, rules: {PLACES: PLACES, FRIENDS: FRIENDS, TREATS: TREATS, TOPPINGS: TOPPINGS, ICINGS: ICINGS, SHAPES: SHAPES,
    PARTS: PARTS, PLANTS: PLANTS, CHEERS: CHEERS, KIND: KIND, HELLO: HELLO, EXACTLY: EXACTLY, LOOKS_GOOD: LOOKS_GOOD,
    words: function () {
      return [TITLE, SPARKLES, JAR, JAR_FULL, MAP_HELP, SUPERSTAR, BACK_MAP, NEW_FRIEND, CARRY_ON, FRIEND_TIP, ALL_DONE, CAKE_DONE, CAKE_AGAIN,
        CAKE_FULL, RIDE_HELP, RIDE_DONE, RAINBOW, CASTLE_NEAR, GOT, AGAIN, CATCH_HELP, CATCH_DONE, GOLD_STAR, GARDEN_HELP, PLANT_HERE,
        WATER_ME, GROWING, READY, PLANTED, WATERED, PATIENT, GREW, SHOP_HELP, WISH, SHOP_DONE, SHOP_AGAIN, DRESS_HELP, NOTHING]
        .concat(CAKE_STEPS, CAKE_HELP);
    },
    friendsFor: friendsFor,
    // For the tests and a preview in a browser: play without a screen, draw on a stand-in canvas.
    begin: begin, press: press, back: back, step: step, render: render, useContext: function (ctx) { c = ctx; },
    state: function () { return {scene: scene, here: here, save: save, bake: bake, ride: ride, shower: shower, garden: garden, shop: shop, dress: dress, walking: !!walk}; }}};
})();
