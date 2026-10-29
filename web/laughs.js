/*
 * Silly games (ADR 0032): party games for a room full of people, played with one remote. Who's most likely to…? (count
 * to three, everyone points, OK on whoever got the most fingers), Would you rather? (everyone goes to a side of the
 * room) and Spin for a dare. Nothing to sign in to, no phones, nothing kept after the game. With a kid playing, only
 * the family set; the grown-ups' extras come in when everyone playing is a grown-up. Every line is clean either way.
 * The lines are in all five languages here (pt, en, es, de, ru), because they are the game rather than the screen
 * around it. Google TV runs this same file in TableActivity's WebView. Plain ES5.
 */
var Laughs = (function () {
  'use strict';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  /** One line in the TV's language: [pt, en, es, de, ru]. */
  function pick(t) { return t[LANG[I18N.lang]] || t[1]; }
  function say(pt, en, es, n) { return tr(pt, en, es).replace('{n}', n === undefined ? '' : n); }
  function host() { return window.BeyondTable || null; }

  // MARK: - The lines

  var LIKELY = [
    ['comer a sobremesa antes do jantar', 'eat dessert before dinner', 'comerse el postre antes de la cena', 'den Nachtisch vor dem Abendessen essen', 'съест десерт до ужина'],
    ['dormir durante o filme', 'fall asleep during the movie', 'dormirse durante la peli', 'beim Film einschlafen', 'уснёт во время фильма'],
    ['conversar com o cachorro como se fosse gente', 'talk to the dog like it\'s a person', 'hablarle al perro como si fuera una persona', 'mit dem Hund reden, als wäre er ein Mensch', 'разговаривает с собакой как с человеком'],
    ['perder um chinelo na praia', 'lose one jandal at the beach', 'perder una chancla en la playa', 'am Strand einen Flipflop verlieren', 'потеряет один шлёпанец на пляже'],
    ['rir da própria piada antes de terminar', 'laugh at their own joke before they finish it', 'reírse de su propio chiste antes de terminarlo', 'über den eigenen Witz lachen, bevor er fertig ist', 'засмеётся над своей шуткой, не досказав её'],
    ['ficar famoso', 'become famous', 'hacerse famoso', 'berühmt werden', 'станет знаменитым'],
    ['cantar no chuveiro tão alto que os vizinhos ouvem', 'sing in the shower loud enough for the neighbours', 'cantar en la ducha tan fuerte que lo oigan los vecinos', 'so laut unter der Dusche singen, dass die Nachbarn es hören', 'поёт в душе так, что слышат соседи'],
    ['se perder no supermercado', 'get lost in the supermarket', 'perderse en el supermercado', 'sich im Supermarkt verlaufen', 'заблудится в супермаркете'],
    ['comer o último biscoito e não falar nada', 'eat the last biscuit and say nothing', 'comerse la última galleta y no decir nada', 'den letzten Keks essen und nichts sagen', 'съест последнее печенье и промолчит'],
    ['fazer amizade com uma gaivota', 'make friends with a seagull', 'hacerse amigo de una gaviota', 'sich mit einer Möwe anfreunden', 'подружится с чайкой'],
    ['ainda estar de pijama na hora do almoço', 'still be in pyjamas at lunchtime', 'seguir en pijama a la hora de comer', 'mittags noch im Schlafanzug sein', 'будет в пижаме ещё в обед'],
    ['tropeçar em absolutamente nada', 'trip over absolutely nothing', 'tropezar con absolutamente nada', 'über gar nichts stolpern', 'споткнётся на ровном месте'],
    ['ganhar uma batalha de dança', 'win a dance-off', 'ganar una batalla de baile', 'ein Tanzduell gewinnen', 'победит в танцевальном баттле'],
    ['guardar o leite no armário', 'put the milk away in the cupboard', 'guardar la leche en el armario', 'die Milch in den Schrank stellen', 'уберёт молоко в шкаф'],
    ['começar uma guerra de comida', 'start a food fight', 'empezar una guerra de comida', 'eine Essensschlacht anfangen', 'начнёт кидаться едой'],
    ['fingir que está dormindo para fugir de uma tarefa', 'pretend to be asleep to get out of a job', 'hacerse el dormido para librarse de una tarea', 'sich schlafend stellen, um sich vor einer Aufgabe zu drücken', 'притворится спящим, чтобы не делать дела'],
    ['adotar dez gatos', 'adopt ten cats', 'adoptar diez gatos', 'zehn Katzen adoptieren', 'заведёт десять кошек'],
    ['gastar toda a mesada em doces', 'spend all their pocket money on lollies', 'gastarse toda la paga en chuches', 'das ganze Taschengeld für Süßigkeiten ausgeben', 'потратит все карманные деньги на конфеты'],
    ['ir para o espaço', 'go to space', 'ir al espacio', 'ins Weltall fliegen', 'полетит в космос'],
    ['rir tanto que o leite sai pelo nariz', 'laugh so hard milk comes out their nose', 'reírse tanto que le sale la leche por la nariz', 'so lachen, dass Milch aus der Nase kommt', 'засмеётся так, что молоко пойдёт носом'],
    ['saber a letra toda e cantar errado mesmo assim', 'know every word of a song and still sing it wrong', 'saberse toda la letra y cantarla mal igual', 'jedes Wort eines Liedes kennen und es trotzdem falsch singen', 'знает все слова песни и всё равно поёт неправильно'],
    ['usar meia com chinelo', 'wear socks with jandals', 'ponerse calcetines con chanclas', 'Socken in Flipflops tragen', 'наденет носки со шлёпанцами'],
    ['se esconder quando a campainha toca', 'hide when the doorbell rings', 'esconderse cuando suena el timbre', 'sich verstecken, wenn es klingelt', 'спрячется, когда позвонят в дверь'],
    ['inventar algo incrível', 'invent something amazing', 'inventar algo increíble', 'etwas Großartiges erfinden', 'изобретёт что-то потрясающее'],
    ['comer uma pavlova inteira sozinho', 'eat a whole pavlova on their own', 'comerse una pavlova entera solo', 'eine ganze Pavlova allein essen', 'съест целую павлову в одиночку'],
    ['falar dormindo', 'talk in their sleep', 'hablar en sueños', 'im Schlaf reden', 'разговаривает во сне'],
    ['fazer bagunça e culpar o gato', 'make a mess and blame the cat', 'hacer un desastre y culpar al gato', 'ein Chaos machen und es auf die Katze schieben', 'устроит беспорядок и свалит на кота'],
    ['chegar atrasado na própria festa de aniversário', 'be late to their own birthday party', 'llegar tarde a su propia fiesta de cumpleaños', 'zur eigenen Geburtstagsfeier zu spät kommen', 'опоздает на свой день рождения'],
    ['ficar preso no escorregador', 'get stuck on a slide', 'quedarse atascado en un tobogán', 'auf einer Rutsche stecken bleiben', 'застрянет на горке'],
    ['chorar com um desenho animado', 'cry at a cartoon', 'llorar con unos dibujos animados', 'bei einem Zeichentrickfilm weinen', 'заплачет над мультиком'],
    ['dizer "não estou com fome" e depois comer a batata de todo mundo', 'say "I\'m not hungry" and then eat everyone\'s chips', 'decir "no tengo hambre" y luego comerse las patatas de todos', '"Ich hab keinen Hunger" sagen und dann allen die Pommes wegessen', 'скажет «я не голоден», а потом съест у всех картошку'],
    ['ainda estar acordado à meia-noite', 'still be awake at midnight', 'seguir despierto a medianoche', 'um Mitternacht noch wach sein', 'не будет спать в полночь'],
    ['fazer o melhor castelo de areia', 'build the best sandcastle', 'hacer el mejor castillo de arena', 'die beste Sandburg bauen', 'построит лучший замок из песка'],
    ['dançar quando ninguém está olhando', 'dance when nobody\'s watching', 'bailar cuando nadie mira', 'tanzen, wenn keiner hinschaut', 'танцует, когда никто не смотрит'],
    ['colocar uma música na cabeça de todo mundo', 'get a song stuck in everyone\'s head', 'meterle una canción en la cabeza a todos', 'allen einen Ohrwurm verpassen', 'заставит всех напевать одну песню'],
    ['correr uma maratona fantasiado de dinossauro', 'run a marathon in a dinosaur costume', 'correr un maratón disfrazado de dinosaurio', 'einen Marathon im Dinosaurierkostüm laufen', 'пробежит марафон в костюме динозавра'],
    ['ter uma pedra de estimação', 'keep a pet rock', 'tener una piedra de mascota', 'einen Stein als Haustier halten', 'заведёт домашний камень'],
    ['rir na hora errada', 'laugh at the wrong moment', 'reírse en el momento equivocado', 'im falschen Moment lachen', 'засмеётся не вовремя'],
    ['ler o final do livro primeiro', 'read the end of the book first', 'leerse el final del libro primero', 'zuerst das Ende des Buches lesen', 'прочитает конец книги первым делом'],
    ['virar um YouTuber famoso', 'become a famous YouTuber', 'convertirse en un YouTuber famoso', 'ein berühmter YouTuber werden', 'станет знаменитым ютубером']
  ];

  var LIKELY_GROWN = [
    ['dormir no sofá antes das nove', 'fall asleep on the couch before 9pm', 'dormirse en el sofá antes de las nueve', 'vor neun Uhr auf dem Sofa einschlafen', 'уснёт на диване до девяти'],
    ['precisar de três cafés antes de falar', 'need three coffees before they can talk', 'necesitar tres cafés antes de poder hablar', 'drei Kaffee brauchen, bevor man mit ihm reden kann', 'не заговорит без трёх чашек кофе'],
    ['esquecer por que entrou no cômodo', 'forget why they walked into a room', 'olvidar a qué entró en una habitación', 'vergessen, warum man in einen Raum gegangen ist', 'забудет, зачем зашёл в комнату'],
    ['ter 400 abas abertas', 'have 400 tabs open', 'tener 400 pestañas abiertas', '400 Tabs offen haben', 'держит открытыми 400 вкладок'],
    ['comprar algo que não precisa porque estava em promoção', 'buy something they don\'t need because it was on special', 'comprar algo que no necesita porque estaba de oferta', 'etwas Unnötiges kaufen, weil es im Angebot war', 'купит ненужное, потому что была скидка'],
    ['responder a todos sem querer', 'hit reply-all by accident', 'responder a todos sin querer', 'aus Versehen allen antworten', 'случайно нажмёт «ответить всем»'],
    ['falar com a TV durante o rúgbi', 'talk to the TV during the rugby', 'hablarle a la tele durante el rugby', 'beim Rugby mit dem Fernseher reden', 'разговаривает с телевизором во время регби'],
    ['começar um hobby novo e desistir em uma semana', 'start a new hobby and quit within a week', 'empezar un hobby nuevo y dejarlo en una semana', 'ein neues Hobby anfangen und nach einer Woche aufhören', 'начнёт новое хобби и бросит через неделю'],
    ['procurar o celular com ele na mão', 'look for their phone while holding it', 'buscar el móvil teniéndolo en la mano', 'das Handy suchen, während man es in der Hand hält', 'ищет телефон, держа его в руке'],
    ['dizer "só mais cinco minutos" por uma hora', 'say "five more minutes" for an hour', 'decir "cinco minutos más" durante una hora', 'eine Stunde lang "noch fünf Minuten" sagen', 'целый час говорит «ещё пять минут»'],
    ['cantar karaokê sem ninguém pedir', 'sing karaoke without being asked', 'cantar karaoke sin que nadie se lo pida', 'ungefragt Karaoke singen', 'споёт караоке без приглашения'],
    ['rearrumar a lava-louças depois que outra pessoa arrumou', 'reload the dishwasher after someone else has loaded it', 'reorganizar el lavavajillas después de que otro lo cargue', 'die Spülmaschine neu einräumen, nachdem jemand anders sie eingeräumt hat', 'переложит посуду в посудомойке за другими']
  ];

  var RATHER = [
    [['ter um dinossauro de estimação', 'have a pet dinosaur', 'tener un dinosaurio de mascota', 'einen Dinosaurier als Haustier haben', 'завести динозавра'],
      ['ter um dragão de estimação', 'have a pet dragon', 'tener un dragón de mascota', 'einen Drachen als Haustier haben', 'завести дракона']],
    [['só comer sorvete para sempre', 'only eat ice cream forever', 'comer solo helado para siempre', 'für immer nur Eis essen', 'всегда есть только мороженое'],
      ['nunca mais comer sorvete', 'never eat ice cream again', 'no volver a comer helado nunca', 'nie wieder Eis essen', 'никогда больше не есть мороженое']],
    [['poder voar', 'be able to fly', 'poder volar', 'fliegen können', 'уметь летать'],
      ['ficar invisível', 'be able to turn invisible', 'poder hacerte invisible', 'unsichtbar werden können', 'становиться невидимкой']],
    [['ter cabelo de espaguete', 'have spaghetti for hair', 'tener espaguetis en vez de pelo', 'Spaghetti statt Haare haben', 'иметь спагетти вместо волос'],
      ['espirrar purpurina', 'sneeze glitter', 'estornudar purpurina', 'Glitzer niesen', 'чихать блёстками']],
    [['falar com os animais', 'talk to animals', 'hablar con los animales', 'mit Tieren sprechen', 'говорить с животными'],
      ['falar todas as línguas', 'speak every language', 'hablar todos los idiomas', 'jede Sprache sprechen', 'говорить на всех языках']],
    [['morar numa casa na árvore', 'live in a treehouse', 'vivir en una casa del árbol', 'in einem Baumhaus wohnen', 'жить в домике на дереве'],
      ['morar num submarino', 'live in a submarine', 'vivir en un submarino', 'in einem U-Boot wohnen', 'жить в подводной лодке']],
    [['ter que cantar em vez de falar', 'have to sing instead of talk', 'tener que cantar en vez de hablar', 'singen müssen statt sprechen', 'петь вместо того, чтобы говорить'],
      ['ter que dançar em vez de andar', 'have to dance instead of walk', 'tener que bailar en vez de andar', 'tanzen müssen statt gehen', 'танцевать вместо того, чтобы ходить']],
    [['ser um gigante', 'be a giant', 'ser un gigante', 'ein Riese sein', 'быть великаном'],
      ['ser do tamanho de uma formiga', 'be as small as an ant', 'ser tan pequeño como una hormiga', 'so klein wie eine Ameise sein', 'быть размером с муравья']],
    [['ter um robô que faz as suas tarefas', 'have a robot that does your jobs', 'tener un robot que hace tus tareas', 'einen Roboter haben, der deine Aufgaben macht', 'иметь робота, который делает твои дела'],
      ['ter um cachorro que faz o seu dever de casa', 'have a dog that does your homework', 'tener un perro que hace tus deberes', 'einen Hund haben, der deine Hausaufgaben macht', 'иметь собаку, которая делает уроки']],
    [['ter um escorregador no lugar da escada', 'have a slide instead of stairs', 'tener un tobogán en vez de escaleras', 'eine Rutsche statt einer Treppe haben', 'иметь горку вместо лестницы'],
      ['ter um trampolim no lugar do chão', 'have a trampoline instead of a floor', 'tener una cama elástica en vez de suelo', 'ein Trampolin statt eines Fußbodens haben', 'иметь батут вместо пола']],
    [['ser pirata', 'be a pirate', 'ser pirata', 'ein Pirat sein', 'быть пиратом'],
      ['ser ninja', 'be a ninja', 'ser ninja', 'ein Ninja sein', 'быть ниндзя']],
    [['nunca precisar dormir', 'never need to sleep', 'no necesitar dormir nunca', 'nie schlafen müssen', 'никогда не спать'],
      ['nunca precisar comer', 'never need to eat', 'no necesitar comer nunca', 'nie essen müssen', 'никогда не есть']],
    [['ter uma ovelha te seguindo para todo lado', 'have a sheep follow you everywhere', 'tener una oveja que te siga a todas partes', 'ein Schaf haben, das dir überallhin folgt', 'чтобы за тобой везде ходила овца'],
      ['ter um kiwi no bolso', 'keep a kiwi in your pocket', 'llevar un kiwi en el bolsillo', 'einen Kiwi in der Tasche haben', 'носить в кармане птицу киви']],
    [['explorar o espaço', 'explore outer space', 'explorar el espacio', 'den Weltraum erforschen', 'исследовать космос'],
      ['explorar o fundo do mar', 'explore the bottom of the sea', 'explorar el fondo del mar', 'den Meeresgrund erforschen', 'исследовать дно океана']],
    [['ter um botão de voltar no tempo', 'have a rewind button for life', 'tener un botón para rebobinar la vida', 'eine Zurückspultaste fürs Leben haben', 'иметь кнопку перемотки жизни'],
      ['ter um botão de pausa', 'have a pause button for life', 'tener un botón de pausa para la vida', 'eine Pausetaste fürs Leben haben', 'иметь кнопку паузы жизни']],
    [['morar onde é sempre verão', 'live where it\'s always summer', 'vivir donde siempre es verano', 'dort wohnen, wo immer Sommer ist', 'жить там, где всегда лето'],
      ['morar onde sempre neva', 'live where it\'s always snowing', 'vivir donde siempre nieva', 'dort wohnen, wo es immer schneit', 'жить там, где всегда идёт снег']],
    [['ser a pessoa mais engraçada do mundo', 'be the funniest person in the world', 'ser la persona más graciosa del mundo', 'der lustigste Mensch der Welt sein', 'быть самым смешным человеком на свете'],
      ['ser a pessoa mais inteligente do mundo', 'be the smartest person in the world', 'ser la persona más lista del mundo', 'der klügste Mensch der Welt sein', 'быть самым умным человеком на свете']],
    [['ter soluço para sempre', 'have hiccups forever', 'tener hipo para siempre', 'für immer Schluckauf haben', 'икать всю жизнь'],
      ['sempre sentir que vai espirrar', 'always feel like you\'re about to sneeze', 'sentir siempre que vas a estornudar', 'immer das Gefühl haben, gleich niesen zu müssen', 'всё время хотеть чихнуть']],
    [['arrotar bolhas de sabão', 'burp bubbles', 'eructar burbujas', 'Seifenblasen rülpsen', 'отрыгивать мыльные пузыри'],
      ['rir igual um burro', 'laugh like a donkey', 'reírte como un burro', 'wie ein Esel lachen', 'смеяться как ослик']],
    [['ir para a escola montado numa galinha gigante', 'ride a giant chicken to school', 'ir al colegio en una gallina gigante', 'auf einem Riesenhuhn zur Schule reiten', 'ездить в школу на гигантской курице'],
      ['ir para a escola num cavalo minúsculo', 'ride a teeny tiny horse to school', 'ir al colegio en un caballo diminuto', 'auf einem winzigen Pferd zur Schule reiten', 'ездить в школу на крошечной лошадке']],
    [['comer pizza em todas as refeições', 'eat pizza for every meal', 'comer pizza en todas las comidas', 'zu jeder Mahlzeit Pizza essen', 'есть пиццу на завтрак, обед и ужин'],
      ['nunca mais comer pizza', 'never eat pizza again', 'no volver a comer pizza', 'nie wieder Pizza essen', 'никогда больше не есть пиццу']],
    [['ter um polvo de estimação', 'have a pet octopus', 'tener un pulpo de mascota', 'einen Oktopus als Haustier haben', 'завести осьминога'],
      ['ter um pinguim de estimação', 'have a pet penguin', 'tener un pingüino de mascota', 'einen Pinguin als Haustier haben', 'завести пингвина']],
    [['ter um tapete voador', 'have a magic flying carpet', 'tener una alfombra mágica', 'einen fliegenden Teppich haben', 'иметь ковёр-самолёт'],
      ['ter uma porta de teletransporte', 'have a door that goes anywhere', 'tener una puerta que lleva a cualquier sitio', 'eine Tür haben, die überallhin führt', 'иметь дверь, ведущую куда угодно']],
    [['ser o melhor jogador de futebol', 'be the best footy player ever', 'ser el mejor futbolista de la historia', 'der beste Fußballspieler aller Zeiten sein', 'быть лучшим футболистом в истории'],
      ['ser a estrela pop mais famosa', 'be the most famous pop star ever', 'ser la estrella del pop más famosa', 'der berühmteste Popstar aller Zeiten sein', 'быть самой знаменитой поп-звездой']],
    [['ter que usar chinelo para sempre', 'wear jandals everywhere, forever', 'llevar chanclas a todas partes, siempre', 'für immer überall Flipflops tragen', 'всегда и везде ходить в шлёпанцах'],
      ['ter que usar terno todo dia', 'wear a fancy suit every single day', 'llevar traje elegante todos los días', 'jeden Tag einen schicken Anzug tragen', 'каждый день носить строгий костюм']]
  ];

  var RATHER_GROWN = [
    [['nunca mais usar o celular', 'never use your phone again', 'no volver a usar el móvil', 'nie wieder das Handy benutzen', 'никогда больше не пользоваться телефоном'],
      ['nunca mais tomar café', 'never drink coffee again', 'no volver a tomar café', 'nie wieder Kaffee trinken', 'никогда больше не пить кофе']],
    [['ter alguém para limpar a casa para sempre', 'have a cleaner forever', 'tener alguien que limpie para siempre', 'für immer eine Putzhilfe haben', 'всегда иметь уборщицу'],
      ['ter um chef para sempre', 'have a chef forever', 'tener un chef para siempre', 'für immer einen Koch haben', 'всегда иметь личного повара']],
    [['estar sempre dez minutos atrasado', 'always be ten minutes late', 'llegar siempre diez minutos tarde', 'immer zehn Minuten zu spät sein', 'всегда опаздывать на десять минут'],
      ['estar sempre vinte minutos adiantado', 'always be twenty minutes early', 'llegar siempre veinte minutos antes', 'immer zwanzig Minuten zu früh sein', 'всегда приходить на двадцать минут раньше']],
    [['abrir mão do chocolate', 'give up chocolate', 'renunciar al chocolate', 'auf Schokolade verzichten', 'отказаться от шоколада'],
      ['abrir mão do queijo', 'give up cheese', 'renunciar al queso', 'auf Käse verzichten', 'отказаться от сыра']],
    [['a casa arrumada todo dia', 'have a tidy house every day', 'tener la casa ordenada todos los días', 'jeden Tag ein aufgeräumtes Haus haben', 'каждый день иметь чистый дом'],
      ['uma soneca todo dia', 'have a nap every day', 'echarte una siesta todos los días', 'jeden Tag ein Nickerchen machen', 'каждый день спать днём']],
    [['saber o final de todo filme', 'know how every movie ends', 'saber cómo acaba cada peli', 'wissen, wie jeder Film ausgeht', 'знать конец каждого фильма'],
      ['nunca lembrar de um filme', 'never remember a movie you\'ve seen', 'no recordar nunca una peli que viste', 'dich an keinen Film erinnern, den du gesehen hast', 'никогда не помнить, что смотрел']]
  ];

  var DARES = [
    ['Faça sua melhor dança da galinha', 'Do your best chicken dance', 'Haz tu mejor baile del pollo', 'Mach deinen besten Hühnertanz', 'Станцуй свой лучший куриный танец'],
    ['Fale como pirata até a sua próxima vez', 'Talk like a pirate until your next turn', 'Habla como un pirata hasta tu próximo turno', 'Sprich wie ein Pirat bis zu deiner nächsten Runde', 'Говори как пират до своего следующего хода'],
    ['Faça a careta mais boba que conseguir. Os outros tentam não rir', 'Pull your silliest face. Everyone else tries not to laugh', 'Pon tu cara más tonta. Los demás intentan no reírse', 'Mach dein albernstes Gesicht. Alle anderen versuchen, nicht zu lachen', 'Скорчи самую смешную рожицу. Остальные стараются не смеяться'],
    ['Cante "Parabéns" como um cantor de ópera', 'Sing "Happy Birthday" like an opera singer', 'Canta "Cumpleaños feliz" como un cantante de ópera', 'Sing "Happy Birthday" wie ein Opernsänger', 'Спой «С днём рождения» как оперный певец'],
    ['Ande como um pinguim pela sala', 'Waddle round the room like a penguin', 'Camina por la sala como un pingüino', 'Watschel wie ein Pinguin durchs Zimmer', 'Пройдись по комнате как пингвин'],
    ['Imite alguém daqui (só coisas gentis!)', 'Do an impression of someone here (kind ones only!)', 'Imita a alguien de aquí (¡solo cosas bonitas!)', 'Mach jemanden von hier nach (nur nett!)', 'Изобрази кого-нибудь из нас (только по-доброму!)'],
    ['Diga o alfabeto de trás para frente até onde conseguir', 'Say the alphabet backwards as far as you can', 'Di el abecedario al revés hasta donde puedas', 'Sag das Alphabet rückwärts, so weit du kommst', 'Назови алфавит задом наперёд, сколько сможешь'],
    ['Equilibre uma almofada na cabeça e pule', 'Balance a cushion on your head and hop', 'Equilibra un cojín en la cabeza y salta', 'Balancier ein Kissen auf dem Kopf und hüpf', 'Удержи подушку на голове и попрыгай'],
    ['Seja uma ovelha numa discoteca', 'Be a sheep at a disco', 'Sé una oveja en una discoteca', 'Sei ein Schaf in der Disco', 'Изобрази овцу на дискотеке'],
    ['Faça dez polichinelos dizendo "eu amo brócolis"', 'Do ten star jumps saying "I love broccoli"', 'Haz diez saltos de tijera diciendo "me encanta el brócoli"', 'Mach zehn Hampelmänner und sag dabei "Ich liebe Brokkoli"', 'Сделай десять прыжков, приговаривая «я обожаю брокколи»'],
    ['Conte uma piada. Se ninguém rir, conte outra', 'Tell a joke. If nobody laughs, tell another one', 'Cuenta un chiste. Si nadie se ríe, cuenta otro', 'Erzähl einen Witz. Wenn keiner lacht, noch einen', 'Расскажи анекдот. Если никто не засмеётся, расскажи ещё'],
    ['Seja um robô até a sua próxima vez', 'Be a robot until your next turn', 'Sé un robot hasta tu próximo turno', 'Sei ein Roboter bis zu deiner nächsten Runde', 'Будь роботом до своего следующего хода'],
    ['Fale sussurrando até a sua próxima vez', 'Only whisper until your next turn', 'Habla solo susurrando hasta tu próximo turno', 'Flüstere nur noch bis zu deiner nächsten Runde', 'Говори только шёпотом до своего следующего хода'],
    ['Faça um comercial do controle remoto', 'Do a TV advert for the remote', 'Haz un anuncio del mando a distancia', 'Mach Werbung für die Fernbedienung', 'Сделай рекламу пульта от телевизора'],
    ['Dance como uma gelatina', 'Dance like a wobbly jelly', 'Baila como una gelatina', 'Tanz wie ein Wackelpudding', 'Станцуй как дрожащее желе'],
    ['Faça o som do seu animal favorito. Os outros adivinham', 'Make your favourite animal\'s noise. Everyone guesses', 'Haz el sonido de tu animal favorito. Los demás adivinan', 'Mach das Geräusch deines Lieblingstiers. Die anderen raten', 'Издай звук любимого животного. Остальные угадывают'],
    ['Faça um elogio para cada pessoa aqui', 'Give everyone here a compliment', 'Dile algo bonito a cada persona de aquí', 'Mach allen hier ein Kompliment', 'Скажи каждому здесь комплимент'],
    ['Faça uma cena de ação em câmera lenta', 'Do a slow-motion action scene', 'Haz una escena de acción a cámara lenta', 'Spiel eine Actionszene in Zeitlupe', 'Сыграй сцену из боевика в замедленной съёмке'],
    ['O chão é lava! Por 15 segundos', 'The floor is lava! For 15 seconds', '¡El suelo es lava! Durante 15 segundos', 'Der Boden ist Lava! 15 Sekunden lang', 'Пол это лава! 15 секунд'],
    ['Gire três vezes e ande em linha reta', 'Spin round three times, then walk in a straight line', 'Gira tres veces y luego camina en línea recta', 'Dreh dich dreimal und geh dann geradeaus', 'Покрутись три раза и пройди по прямой'],
    ['Seja um apresentador de jornal anunciando o jantar', 'Be a newsreader telling us what\'s for dinner', 'Sé un presentador de noticias anunciando la cena', 'Sei ein Nachrichtensprecher und verkünde das Abendessen', 'Будь диктором новостей и объяви, что на ужин'],
    ['Faça o moonwalk pela sala', 'Moonwalk across the room', 'Haz el moonwalk por la sala', 'Mach den Moonwalk durchs Zimmer', 'Пройди лунной походкой по комнате'],
    ['Faça sua melhor aterrissagem de super-herói', 'Do your best superhero landing', 'Haz tu mejor aterrizaje de superhéroe', 'Mach deine beste Superhelden-Landung', 'Сделай лучшее приземление супергероя'],
    ['Fique parado como estátua enquanto todos tentam te fazer rir', 'Freeze like a statue while everyone tries to make you laugh', 'Quédate quieto como una estatua mientras todos intentan hacerte reír', 'Erstarre wie eine Statue, während alle dich zum Lachen bringen wollen', 'Замри как статуя, пока все пытаются тебя рассмешить'],
    ['Invente uma música sobre meias', 'Make up a song about socks', 'Inventa una canción sobre calcetines', 'Erfinde ein Lied über Socken', 'Придумай песню про носки'],
    ['Seja um cachorro que acabou de ouvir a palavra "passear"', 'Be a dog that just heard the word "walk"', 'Sé un perro que acaba de oír la palabra "paseo"', 'Sei ein Hund, der gerade das Wort "Gassi" gehört hat', 'Будь собакой, которая услышала слово «гулять»'],
    ['Faça prancha enquanto todos contam até 15', 'Hold a plank while everyone counts to 15', 'Aguanta en plancha mientras todos cuentan hasta 15', 'Halt eine Planke, während alle bis 15 zählen', 'Постой в планке, пока все считают до 15'],
    ['Só fale com perguntas até a sua próxima vez', 'Only talk in questions until your next turn', 'Habla solo con preguntas hasta tu próximo turno', 'Sprich nur in Fragen bis zu deiner nächsten Runde', 'Говори только вопросами до своего следующего хода'],
    ['Mostre seu melhor passo de dança. Todos copiam', 'Show us your best dance move. Everyone copies', 'Enséñanos tu mejor paso de baile. Todos lo copian', 'Zeig uns deinen besten Tanzschritt. Alle machen ihn nach', 'Покажи лучшее танцевальное движение. Все повторяют'],
    ['Diga "o rato roeu a roupa do rei de Roma" três vezes rápido', 'Say "red lorry, yellow lorry" three times fast', 'Di "tres tristes tigres" tres veces rápido', 'Sag dreimal schnell "Fischers Fritz fischt frische Fische"', 'Скажи три раза быстро «на дворе трава, на траве дрова»']
  ];

  var DARES_GROWN = [
    ['Conte sua melhor piada de tiozão', 'Tell your best dad joke', 'Cuenta tu mejor chiste malo', 'Erzähl deinen besten Flachwitz', 'Расскажи свою лучшую несмешную шутку'],
    ['Faça a previsão do tempo da sala', 'Give us the weather forecast for the lounge', 'Danos el parte del tiempo del salón', 'Mach den Wetterbericht fürs Wohnzimmer', 'Расскажи прогноз погоды для гостиной'],
    ['Cante o refrão da última música que você ouviu', 'Sing the chorus of the last song you listened to', 'Canta el estribillo de la última canción que escuchaste', 'Sing den Refrain des letzten Liedes, das du gehört hast', 'Спой припев последней песни, которую ты слушал'],
    ['Desfile como numa passarela', 'Do your best catwalk strut', 'Desfila como en una pasarela', 'Lauf wie auf dem Laufsteg', 'Пройдись как по подиуму'],
    ['Narre alguém daqui como um documentário de natureza', 'Narrate someone here like a nature documentary', 'Narra a alguien de aquí como un documental de naturaleza', 'Kommentier jemanden hier wie eine Naturdoku', 'Опиши кого-нибудь из нас как в передаче о природе'],
    ['Conte como foi o seu dia em 10 segundos, como um comentarista de esporte', 'Tell us about your day like a sports commentator, in 10 seconds', 'Cuéntanos tu día como un comentarista deportivo, en 10 segundos', 'Erzähl deinen Tag wie ein Sportreporter, in 10 Sekunden', 'Расскажи о своём дне как спортивный комментатор, за 10 секунд']
  ];

  // MARK: - The menu

  var GAMES = [
    {id: 'likely', icon: '👉', min: 2,
      name: function () { return tr('Quem é mais provável…?', 'Who\'s most likely to…?', '¿Quién tiene más probabilidades…?'); },
      about: function () { return tr('Contem até três e apontem para quem seria. Ganha um título engraçado.', 'Count to three and everyone points. The winner gets a funny title.', 'Contad hasta tres y todos señalan. Quien gane se lleva un título gracioso.'); }},
    {id: 'rather', icon: '⚖️', min: 0,
      name: function () { return tr('Você prefere?', 'Would you rather?', '¿Qué prefieres?'); },
      about: function () { return tr('Duas opções bobas. Cada um vai para um lado da sala.', 'Two silly choices. Everyone goes to one side of the room.', 'Dos opciones locas. Cada uno se va a un lado de la sala.'); }},
    {id: 'dare', icon: '🌀', min: 2,
      name: function () { return tr('Gire para um desafio', 'Spin for a dare', 'Gira para un reto'); },
      about: function () { return tr('A roda escolhe alguém e um desafio bobo. Valendo!', 'The spinner picks someone, and a silly dare for them. Go!', 'La ruleta elige a alguien y un reto loco. ¡Vamos!'); }}
  ];

  function open() {
    UI.open({
      cls: 'bt-table bt-table-games lf-menu',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Jogos bobos', 'Silly games', 'Juegos locos'),
          tr('Para todos na sala, com um controle só.', 'For everyone in the room, with just the one remote.', 'Para todos en la sala, con un solo mando.'));
        var list = UI.el('div', 'tg-games', layer);
        for (var i = 0; i < GAMES.length; i++) {
          (function (g, first) {
            var card = UI.el('div', 'tg-game', list);
            UI.el('div', 'icon', card, g.icon);
            UI.el('div', 'title', card, g.name());
            UI.el('div', 'about', card, g.about());
            api.add(card, function () { if (g.min) who(g); else start(g, []); }, {first: first});
          })(GAMES[i], i === 0);
        }
      }
    });
  }

  // MARK: - Who's playing (everyone, to start with: it's a party)

  var chosen = [];
  var GUESTS = [{id: 'guest-1', guest: true, colour: '#9E7BFF', n: 1}, {id: 'guest-2', guest: true, colour: '#E8A33D', n: 2}];

  function nameOf(p) { return p.guest ? tr('Visitante', 'Guest', 'Invitado') + ' ' + p.n : p.name; }

  function everyone() {
    var list = window.Profiles ? Profiles.list() : [];
    var out = [];
    for (var i = 0; i < list.length; i++) if (!list[i].together) out.push(list[i]);
    return out.slice(0, 10).concat(GUESTS);
  }

  function isChosen(p) { for (var i = 0; i < chosen.length; i++) if (chosen[i].id === p.id) return true; return false; }

  function who(g) {
    var all = everyone();
    chosen = all.filter(function (p) { return !p.guest; });
    UI.open({
      cls: 'bt-table bt-table-who',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Quem vai jogar?', 'Who\'s playing?', '¿Quién juega?'),
          tr('Todo mundo na sala. OK para tirar ou pôr alguém.', 'Everyone in the room. OK takes someone out or puts them back.', 'Todos los de la sala. OK quita o vuelve a poner a alguien.'));
        faces(layer, api, all, {
          on: isChosen,
          run: function (p) {
            if (isChosen(p)) chosen = chosen.filter(function (x) { return x.id !== p.id; });
            else chosen.push(p);
            api.rebuild();
          }
        });
        var foot = UI.el('div', 'tg-foot', layer);
        UI.el('div', 'bt-sub', foot, chosen.length ? chosen.map(nameOf).join(', ') :
          tr('Escolha pelo menos duas pessoas.', 'Pick at least two people.', 'Elige al menos a dos personas.'));
        api.add(UI.button(foot, tr('Vamos!', 'Let\'s go!', '¡Vamos!'), null, chosen.length >= g.min ? 'primary' : ''), function () {
          if (chosen.length < g.min) { UI.toast(tr('Escolha pelo menos duas pessoas.', 'Pick at least two people.', 'Elige al menos a dos personas.')); return; }
          var players = all.filter(isChosen);   // in the order they sit on screen
          api.close();
          start(g, players);
        });
      }
    });
  }

  /**
   * A row of faces across the stage, shrinking for a big family so it never runs off the edge. opts: {on(p), run(p),
   * cls(p), top, disabled}.
   */
  function faces(layer, api, list, opts) {
    var row = UI.el('div', 'tg-faces lf-faces', layer);
    if (opts.top) row.style.top = opts.top + 'px';
    var size = list.length > 6 ? 130 : 160, gap = list.length > 6 ? 40 : 60;
    var width = list.length * size + (list.length - 1) * gap;
    if (width > 1720) {
      var k = 1720 / width;
      size = Math.floor(size * k); gap = Math.floor(gap * k);
      width = list.length * size + (list.length - 1) * gap;
    }
    var nodes = [];
    for (var i = 0; i < list.length; i++) {
      (function (p, x, first) {
        var f = UI.el('div', 'bt-face tg-face' + (opts.on && opts.on(p) ? ' on' : '') + (opts.cls ? ' ' + opts.cls(p) : ''), row);
        f.style.left = x + 'px';
        f.style.width = size + 'px';
        UI.avatar(p.guest ? {name: String(p.n), colour: p.colour} : p, f, size);
        UI.el('div', 'name', f, nameOf(p));
        if (opts.on) UI.el('div', 'tick', f, opts.on(p) ? '✓' : '');
        if (opts.badge) { var b = opts.badge(p); if (b) UI.el('div', 'lf-badge', f, b); }
        if (opts.run) api.add(f, function () { opts.run(p); }, {first: first});
        nodes.push(f);
      })(list[i], Math.round((1920 - width) / 2) + i * (size + gap), i === 0 && !opts.notFirst);
    }
    return nodes;
  }

  // MARK: - Playing

  var game = null;

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function anyKid(players) { for (var i = 0; i < players.length; i++) if (players[i].kid) return true; return false; }

  /** The lines for these players: the family set, and the grown-ups' extras when no kid is playing. */
  function deck(players, family, grown) {
    var guests = 0;
    for (var i = 0; i < players.length; i++) if (players[i].guest) guests++;
    // Nobody we know (only guests, or no one picked): assume kids could be there.
    var grownUps = players.length > guests && !anyKid(players);
    return shuffle(grownUps ? family.concat(grown) : family);
  }

  function start(g, players) {
    game = {id: g.id, players: players, round: 0, score: {}, titles: {}, timers: [], phase: 'ask', last: null};
    for (var i = 0; i < players.length; i++) { game.score[players[i].id] = 0; game.titles[players[i].id] = []; }
    if (g.id === 'likely') { game.deck = deck(players, LIKELY, LIKELY_GROWN); game.rounds = Math.min(10, game.deck.length); likely(); }
    else if (g.id === 'rather') { game.deck = deck(players, RATHER, RATHER_GROWN); rather(); }
    else { game.deck = deck(players, DARES, DARES_GROWN); dare(); }
  }

  function later(ms, fn) {
    var g = game;
    game.timers.push(setTimeout(function () { if (game === g) fn(); }, ms));
  }

  function stop() {
    if (!game) return;
    for (var i = 0; i < game.timers.length; i++) clearTimeout(game.timers[i]);
    game = null;
  }

  /** A three, two, one countdown on screen, then go(). */
  function countdown(api, last, go) {
    var n = 3;
    function tick() {
      if (!game) return;
      game.count = n > 0 ? String(n) : last;
      redraw(api);
      Sfx.play(n > 0 ? 'point' : 'six');
      if (n > 0) { n--; later(800, tick); } else later(1000, go);
    }
    game.phase = 'count';
    tick();
  }

  function quip(lines, name) {
    var l = lines[Math.floor(Math.random() * lines.length)];
    return say(l[0], l[1], l[2], name);
  }

  function done() { stop(); UI.closeAll(); if (host() && host().close) host().close(); }

  /** Closes this layer and opens the next one in the same game, without ending the game in between. */
  function swap(api, then) {
    game.moving = true;
    api.close();
    game.moving = false;
    then();
  }
  function ended() { if (game && !game.moving) stop(); }

  /** Builds the layer again for the next step and puts the focus where that step wants it (game.primary). */
  function redraw(api) {
    if (game) game.primary = null;
    api.rebuild();
    if (game && game.primary) api.focusNode(game.primary);
  }
  function primary(node) { if (game) game.primary = node; return node; }

  // MARK: Who's most likely to…?

  var CAUGHT = [
    ['Claro que é {n}!', 'Of course it\'s {n}!', '¡Pues claro que es {n}!'],
    ['O povo falou, {n}!', 'The people have spoken, {n}!', '¡El pueblo ha hablado, {n}!'],
    ['Ninguém se surpreendeu, {n}.', 'Nobody\'s surprised, {n}.', 'A nadie le sorprende, {n}.'],
    ['Pego no flagra, {n}!', 'Busted, {n}!', '¡Pillado, {n}!'],
    ['{n}, você sabia que isso ia acontecer.', '{n}, you knew this was coming.', '{n}, sabías que esto iba a pasar.']
  ];

  function likelyLead() { return tr('Quem é mais provável de…', 'Who\'s most likely to…', '¿Quién tiene más probabilidades de…'); }
  function likelyTitle(t) { return tr('Mais provável de ', 'Most likely to ', 'Con más probabilidades de ') + pick(t); }

  function likely() {
    var t = game.deck[game.round];
    game.phase = 'ask';
    UI.open({
      cls: 'bt-table lf-play lf-likely',
      build: function (layer, api) {
        if (!game) return;
        var top = UI.el('div', 'lf-top', layer);
        UI.el('div', 'lf-round', top, say('Rodada {n}', 'Round {n}', 'Ronda {n}', (game.round + 1) + ' / ' + game.rounds));
        UI.el('div', 'lf-lead', top, likelyLead());
        UI.el('div', 'lf-prompt', top, pick(t) + '?');
        var picking = game.phase === 'pick';
        var nodes = faces(layer, api, game.players, {
          top: 470,
          run: picking ? function (p) { caught(api, p, t); } : null,
          cls: function (p) { return game.phase === 'reveal' && game.last && game.last.id === p.id ? 'lf-won' : (game.phase === 'reveal' ? 'lf-dim' : ''); },
          badge: function (p) { return game.score[p.id] ? '★ ' + game.score[p.id] : ''; }
        });
        var foot = UI.el('div', 'lf-foot', layer);
        if (game.phase === 'ask') {
          UI.el('div', 'bt-sub', foot, tr('Pensem bem… sem apontar ainda!', 'Have a think… no pointing yet!', 'Pensadlo bien… ¡sin señalar todavía!'));
          api.add(primary(UI.button(foot, tr('3, 2, 1, apontem!', '3, 2, 1, point!', '¡3, 2, 1, señalad!'), null, 'primary')), function () {
            countdown(api, tr('Apontem!', 'Point!', '¡Señalad!'), function () { game.phase = 'pick'; redraw(api); });
          }, {first: true});
          api.add(UI.button(foot, tr('Pular', 'Skip this one', 'Saltar')), function () { next(api); });
        } else if (game.phase === 'count') {
          UI.el('div', 'lf-count', layer, game.count);
        } else if (picking) {
          UI.el('div', 'bt-sub', foot, tr('Quem tem mais dedos apontando? Aperte OK nessa pessoa.', 'Who\'s got the most fingers pointing at them? Press OK on them.', '¿A quién señalan más dedos? Pulsa OK sobre esa persona.'));
          api.add(UI.button(foot, tr('Empate!', 'It\'s a tie!', '¡Empate!')), function () { tie(api); });
          if (nodes.length) primary(nodes[0]);
        } else {
          UI.el('div', 'lf-quip', foot, game.quip);
          var finished = game.round + 1 >= game.rounds;
          api.add(primary(UI.button(foot, finished ? tr('Ver os prêmios', 'See the awards', 'Ver los premios') : tr('Próxima', 'Next one', 'Siguiente'), null, 'primary')), function () {
            if (finished) swap(api, awards); else next(api);
          }, {first: true});
          if (!finished) api.add(UI.button(foot, tr('Terminar e ver os prêmios', 'Finish and see the awards', 'Terminar y ver los premios')), function () { swap(api, awards); });
        }
      },
      back: function () { return !!(game && game.phase === 'count'); },
      closed: ended
    });
  }

  function caught(api, p, t) {
    game.score[p.id]++;
    game.titles[p.id].push(t);
    game.last = p;
    game.quip = quip(CAUGHT, nameOf(p));
    game.phase = 'reveal';
    Sfx.play('win');
    redraw(api);
  }

  function tie(api) {
    game.last = null;
    game.quip = tr('Empate! Vocês são todos iguais.', 'A tie! You\'re all as bad as each other.', '¡Empate! Sois todos igual de culpables.');
    game.phase = 'reveal';
    Sfx.play('pile');
    redraw(api);
  }

  function next(api) {
    game.round++;
    game.last = null;
    swap(api, game.round >= game.rounds ? awards : likely);
  }

  function awards() {
    if (!game) return;
    game.phase = 'awards';
    var players = game.players.slice().sort(function (a, b) { return game.score[b.id] - game.score[a.id]; });
    var best = players.length ? game.score[players[0].id] : 0;
    Sfx.play('home');
    UI.open({
      cls: 'bt-table bt-table-debrief lf-awards',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Os prêmios da noite', 'Tonight\'s awards', 'Los premios de la noche'),
          tr('Com todo o carinho, claro.', 'With love, of course.', 'Con todo el cariño, claro.'));
        var cards = UI.el('div', 'tg-debrief lf-cards', layer);
        var shown = players.slice(0, 4);
        for (var i = 0; i < shown.length; i++) {
          var p = shown[i], n = game.score[p.id];
          var card = UI.el('div', 'tg-card', cards);
          var head = UI.el('div', 'head', card);
          UI.avatar(p.guest ? {name: String(p.n), colour: p.colour} : p, head, 84);
          var w = UI.el('div', 'who', head);
          UI.el('div', 'name', w, (n && n === best ? '👑 ' : '') + nameOf(p));
          UI.el('div', 'place', w, n === 1 ? tr('1 voto', '1 vote', '1 voto') : n ? say('{n} votos', '{n} votes', '{n} votos', n) : tr('Um mistério', 'A mystery', 'Un misterio'));
          var titles = game.titles[p.id];
          for (var j = titles.length - 1, k = 0; j >= 0 && k < 2; j--, k++) UI.el('div', 'praise', card, '🏅 ' + likelyTitle(titles[j]));
          if (!titles.length) UI.el('div', 'tip', card, tr('Ninguém conseguiu adivinhar você hoje!', 'Nobody could pin you down tonight!', '¡Esta noche nadie ha podido contigo!'));
        }
        if (players.length > 4) UI.el('div', 'tg-kind', layer, say('E mais {n} pessoas fabulosas.', 'And {n} more fabulous people.', 'Y {n} personas fabulosas más.', players.length - 4));
        var foot = UI.el('div', 'bt-buttons tg-again', layer);
        var again = game.players;
        api.add(primary(UI.button(foot, tr('Jogar de novo', 'Play again', 'Jugar otra vez'), null, 'primary')), function () { api.close(); start(GAMES[0], again); }, {first: true});
        api.add(UI.button(foot, tr('Outro jogo', 'Another game', 'Otro juego')), function () { stop(); api.close(); });
        api.add(UI.button(foot, tr('Pronto', 'Done', 'Listo')), done);
      },
      closed: ended
    });
  }

  // MARK: Would you rather?

  var SIDES = [
    ['Mentes brilhantes pensam igual!', 'Great minds think alike!', '¡Las grandes mentes piensan igual!'],
    ['Escolha corajosa!', 'Bold choice!', '¡Elección valiente!'],
    ['Interessante… muito interessante.', 'Interesting… very interesting.', 'Interesante… muy interesante.'],
    ['Faz todo o sentido.', 'That makes total sense.', 'Tiene todo el sentido.'],
    ['Os robôs também escolheriam essa.', 'The robots would have picked that one too.', 'Los robots también habrían elegido esa.']
  ];

  function rather() {
    var t = game.deck[game.round % game.deck.length];
    game.phase = 'ask';
    game.side = -1;
    UI.open({
      cls: 'bt-table lf-play lf-rather',
      build: function (layer, api) {
        if (!game) return;
        var top = UI.el('div', 'lf-top', layer);
        UI.el('div', 'lf-lead', top, tr('Você prefere…', 'Would you rather…', '¿Qué prefieres…?'));
        var row = UI.el('div', 'lf-sides', layer);
        var cards = [];
        for (var s = 0; s < 2; s++) {
          (function (side) {
            var c = UI.el('div', 'lf-side' + (game.side === side ? ' lf-won' : game.side >= 0 ? ' lf-dim' : ''), row);
            UI.el('div', 'arrow', c, side ? '▶' : '◀');
            UI.el('div', 'text', c, pick(t[side]));
            cards.push(c);
            if (game.phase === 'pick' && !side) primary(c);
            if (game.phase === 'pick') api.add(c, function () {
              game.side = side;
              game.quip = quip(SIDES);
              game.phase = 'reveal';
              Sfx.play('match');
              redraw(api);
            }, {first: side === 0});
          })(s);
        }
        UI.el('div', 'lf-or', row, tr('ou', 'or', 'o'));
        var foot = UI.el('div', 'lf-foot', layer);
        if (game.phase === 'ask') {
          UI.el('div', 'bt-sub', foot, tr('Esquerda ou direita? Cada um vai para um lado da sala!', 'Left or right? Everyone go to that side of the room!', '¿Izquierda o derecha? ¡Cada uno a ese lado de la sala!'));
          api.add(primary(UI.button(foot, tr('3, 2, 1, já!', '3, 2, 1, go!', '¡3, 2, 1, ya!'), null, 'primary')), function () {
            countdown(api, tr('Já!', 'Go!', '¡Ya!'), function () { game.phase = 'pick'; redraw(api); });
          }, {first: true});
          api.add(UI.button(foot, tr('Outra', 'Another one', 'Otra')), function () { another(api); });
        } else if (game.phase === 'count') {
          UI.el('div', 'lf-count', layer, game.count);
        } else if (game.phase === 'pick') {
          UI.el('div', 'bt-sub', foot, tr('Qual lado ganhou? Aperte OK nele.', 'Which side has more people? Press OK on it.', '¿Qué lado tiene más gente? Pulsa OK sobre él.'));
        } else {
          UI.el('div', 'lf-quip', foot, game.quip);
          api.add(primary(UI.button(foot, tr('Próxima', 'Next one', 'Siguiente'), null, 'primary')), function () { another(api); }, {first: true});
          api.add(UI.button(foot, tr('Pronto', 'Done', 'Listo')), done);
        }
      },
      back: function () { return !!(game && game.phase === 'count'); },
      closed: ended
    });
  }

  function another(api) {
    game.round++;
    swap(api, rather);
  }

  // MARK: Spin for a dare

  var BRAVE = [
    ['Lenda!', 'Legend!', '¡Leyenda!'],
    ['Que coragem!', 'So brave!', '¡Qué valiente!'],
    ['Isso foi incrível!', 'That was amazing!', '¡Eso ha sido increíble!'],
    ['Aplausos para {n}!', 'Round of applause for {n}!', '¡Un aplauso para {n}!']
  ];

  function dare() {
    game.phase = 'ask';
    UI.open({
      cls: 'bt-table lf-play lf-dare',
      build: function (layer, api) {
        if (!game) return;
        var top = UI.el('div', 'lf-top', layer);
        if (game.phase === 'dare' || game.phase === 'reveal') {
          UI.el('div', 'lf-lead', top, say('{n}, seu desafio:', '{n}, your dare:', '{n}, tu reto:', nameOf(game.last)));
          UI.el('div', 'lf-prompt', top, pick(game.dare));
        } else {
          UI.el('div', 'lf-lead', top, tr('Gire a roda!', 'Spin the spinner!', '¡Gira la ruleta!'));
          UI.el('div', 'lf-prompt small', top, tr('Quem será…?', 'Who will it be…?', '¿Quién será…?'));
        }
        faces(layer, api, game.players, {
          top: 470,
          cls: function (p) {
            if (game.phase === 'spin') return game.at === p.id ? 'lf-spin' : 'lf-dim';
            if (game.last && (game.phase === 'dare' || game.phase === 'reveal')) return game.last.id === p.id ? 'lf-won' : 'lf-dim';
            return '';
          },
          badge: function (p) { return game.score[p.id] ? '⭐ ' + game.score[p.id] : ''; }
        });
        var foot = UI.el('div', 'lf-foot', layer);
        if (game.phase === 'ask') {
          api.add(primary(UI.button(foot, tr('Girar!', 'Spin!', '¡Girar!'), null, 'primary')), function () { spin(api); }, {first: true});
          if (game.round) api.add(UI.button(foot, tr('Quem foi mais corajoso?', 'Who was bravest?', '¿Quién fue más valiente?')), function () { brave(api); });
        } else if (game.phase === 'dare') {
          var bar = UI.el('div', 'lf-timer', foot);
          var fill = UI.el('i', '', bar);
          // The bar runs down over 15 seconds: a transform, so old TVs keep up.
          setTimeout(function () { UI.setClass(fill, 'go', true); }, 50);
          api.add(primary(UI.button(foot, tr('Feito! 🎉', 'Done it! 🎉', '¡Hecho! 🎉'), null, 'primary')), function () {
            game.score[game.last.id]++;
            game.quip = quip(BRAVE, nameOf(game.last));
            game.phase = 'reveal';
            Sfx.play('win');
            redraw(api);
          }, {first: true});
          api.add(UI.button(foot, tr('Passo', 'Pass', 'Paso')), function () {
            game.quip = tr('Sem problema. Fica para a próxima!', 'No worries. Next time!', '¡Sin problema! ¡La próxima vez!');
            game.phase = 'reveal';
            Sfx.play('oops');
            redraw(api);
          });
        } else if (game.phase === 'reveal') {
          UI.el('div', 'lf-quip', foot, game.quip);
          api.add(primary(UI.button(foot, tr('Girar de novo', 'Spin again', 'Girar otra vez'), null, 'primary')), function () { spin(api); }, {first: true});
          api.add(UI.button(foot, tr('Quem foi mais corajoso?', 'Who was bravest?', '¿Quién fue más valiente?')), function () { brave(api); });
        }
      },
      back: function () { return !!(game && game.phase === 'spin'); },
      closed: ended
    });
  }

  /** The spinner runs round the faces, slowing down, and stops on someone who didn't just have a go. */
  function spin(api) {
    var ps = game.players;
    var choices = ps.filter(function (p) { return !game.last || p.id !== game.last.id || ps.length < 2; });
    var target = choices[Math.floor(Math.random() * choices.length)];
    var end = ps.indexOf(target);
    var at = game.last ? ps.indexOf(game.last) : 0;
    var steps = ps.length * 2 + ((end - at + ps.length) % ps.length) + (ps.length < 3 ? 4 : 0);
    if (steps < 10) steps += ps.length * Math.ceil((10 - steps) / ps.length);
    game.phase = 'spin';
    var i = 0, delay = 70;
    function step() {
      if (!game) return;
      at = (at + 1) % ps.length;
      game.at = ps[at].id;
      redraw(api);
      Sfx.play('dice');
      i++;
      if (i < steps) { delay = Math.round(delay * 1.09); later(delay, step); }
      else later(500, land);
    }
    function land() {
      game.last = ps[at];
      game.dare = game.deck[game.round % game.deck.length];
      game.round++;
      game.phase = 'dare';
      Sfx.play('six');
      redraw(api);
    }
    step();
  }

  function brave(api) {
    game.phase = 'brave';
    var players = game.players.slice().sort(function (a, b) { return game.score[b.id] - game.score[a.id]; });
    var best = game.score[players[0].id];
    var leaders = best ? players.filter(function (p) { return game.score[p.id] === best; }) : [];
    swap(api, function () { braveScreen(leaders, best); });
  }

  function braveScreen(leaders, best) {
    Sfx.play('home');
    UI.open({
      cls: 'bt-table bt-table-setup lf-brave',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer);
        UI.el('div', 'sun', box, '🦁');
        UI.heading(box, leaders.length ? leaders.map(nameOf).join(', ') : tr('Ninguém… ainda!', 'Nobody… yet!', 'Nadie… ¡todavía!'),
          leaders.length ? say('O mais corajoso da noite. Desafios feitos: {n}.', 'Bravest tonight. Dares done: {n}.', 'El más valiente de la noche. Retos hechos: {n}.', best) :
            tr('Gire de novo e mostre do que é capaz.', 'Spin again and show us what you\'ve got.', 'Gira otra vez y demuestra de qué eres capaz.'));
        var buttons = UI.el('div', 'bt-buttons', box);
        a.add(UI.button(buttons, tr('Continuar girando', 'Keep spinning', 'Seguir girando'), null, 'primary'), function () {
          game.phase = 'ask';
          swap(a, dare);
        }, {first: true});
        a.add(UI.button(buttons, tr('Pronto', 'Done', 'Listo')), done);
      },
      closed: ended
    });
  }

  return {open: open, LIKELY: LIKELY, LIKELY_GROWN: LIKELY_GROWN, RATHER: RATHER, RATHER_GROWN: RATHER_GROWN, DARES: DARES, DARES_GROWN: DARES_GROWN, deck: deck};
})();
