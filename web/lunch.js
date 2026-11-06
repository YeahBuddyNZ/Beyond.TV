/*
 * School lunches (ADR 0038): a game for kids who find lunches hard. One kid at a time swipes through lunch ideas with
 * the remote (right or OK for yum, left for nah) until they have five, one for each school day. Most ideas are made in
 * a Sunday cook-up and keep for the week (or go in the freezer); a few are made fresh. The grown-ups' list shows what
 * each kid chose this week and what they love most, the Sunday cook-up shows how to make each one, and the shopping
 * list adds up what to buy. Everything stays on this TV (localStorage, also on Google TV's WebView) and is never sent.
 * Every idea is nut free, because most New Zealand schools are. The ideas are in all five languages here (pt, en, es,
 * de, ru), because they are the game rather than the screen around it. Google TV runs this same file in
 * TableActivity's WebView (start "lunch"). Plain ES5.
 */
var Lunch = (function () {
  'use strict';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  /** One line in the TV's language: [pt, en, es, de, ru]. */
  function pick(t) { return t[LANG[I18N.lang]] || t[1]; }
  function say(pt, en, es, n) { return tr(pt, en, es).replace('{n}', n === undefined ? '' : n); }
  var KEY = 'bt.lunch';
  /** One yum for each school day. */
  var WEEK = 5;

  // MARK: - What goes in them

  var FOOD = {
    flour: ['farinha', 'flour', 'harina', 'Mehl', 'мука'],
    bakingPowder: ['fermento em pó', 'baking powder', 'levadura química', 'Backpulver', 'разрыхлитель'],
    milk: ['leite', 'milk', 'leche', 'Milch', 'молоко'],
    butter: ['manteiga', 'butter', 'mantequilla', 'Butter', 'сливочное масло'],
    eggs: ['ovos', 'eggs', 'huevos', 'Eier', 'яйца'],
    cheese: ['queijo', 'cheese', 'queso', 'Käse', 'сыр'],
    creamCheese: ['cream cheese', 'cream cheese', 'queso crema', 'Frischkäse', 'сливочный сыр'],
    ham: ['presunto', 'ham', 'jamón', 'Schinken', 'ветчина'],
    tomatoPaste: ['extrato de tomate', 'tomato paste', 'tomate concentrado', 'Tomatenmark', 'томатная паста'],
    pastry: ['massa folhada', 'puff pastry', 'hojaldre', 'Blätterteig', 'слоёное тесто'],
    mince: ['carne moída', 'beef mince', 'carne picada', 'Rinderhack', 'говяжий фарш'],
    chicken: ['frango cozido', 'cooked chicken', 'pollo cocido', 'gegartes Hähnchen', 'варёная курица'],
    drumsticks: ['coxas de frango', 'chicken drumsticks', 'muslos de pollo', 'Hähnchenschenkel', 'куриные голени'],
    courgette: ['abobrinha', 'courgette', 'calabacín', 'Zucchini', 'кабачок'],
    carrot: ['cenouras', 'carrots', 'zanahorias', 'Karotten', 'морковь'],
    corn: ['milho', 'sweetcorn', 'maíz dulce', 'Mais', 'кукуруза'],
    peas: ['ervilhas congeladas', 'frozen peas', 'guisantes congelados', 'TK-Erbsen', 'замороженный горошек'],
    spinach: ['espinafre', 'spinach', 'espinacas', 'Spinat', 'шпинат'],
    cucumber: ['pepino', 'cucumber', 'pepino', 'Gurke', 'огурец'],
    capsicum: ['pimentão', 'capsicum', 'pimiento', 'Paprika', 'сладкий перец'],
    lettuce: ['alface', 'lettuce', 'lechuga', 'Salat', 'салат'],
    rice: ['arroz', 'rice', 'arroz', 'Reis', 'рис'],
    pasta: ['macarrão', 'pasta', 'pasta', 'Nudeln', 'макароны'],
    noodles: ['macarrão de arroz', 'rice noodles', 'fideos de arroz', 'Reisnudeln', 'рисовая лапша'],
    wraps: ['wraps', 'wraps', 'tortillas', 'Wraps', 'лаваш'],
    crackers: ['bolachas salgadas', 'crackers', 'galletas saladas', 'Cracker', 'крекеры'],
    nori: ['alga nori', 'nori sheets', 'alga nori', 'Noriblätter', 'листы нори'],
    ricePaper: ['folhas de arroz', 'rice paper', 'papel de arroz', 'Reispapier', 'рисовая бумага'],
    soy: ['molho de soja', 'soy sauce', 'salsa de soja', 'Sojasauce', 'соевый соус'],
    honey: ['mel', 'honey', 'miel', 'Honig', 'мёд'],
    oats: ['aveia', 'rolled oats', 'copos de avena', 'Haferflocken', 'овсяные хлопья'],
    banana: ['bananas maduras', 'ripe bananas', 'plátanos maduros', 'reife Bananen', 'спелые бананы'],
    dates: ['tâmaras', 'dates', 'dátiles', 'Datteln', 'финики'],
    cocoa: ['cacau', 'cocoa', 'cacao en polvo', 'Kakao', 'какао'],
    coconut: ['coco ralado', 'desiccated coconut', 'coco rallado', 'Kokosraspeln', 'кокосовая стружка'],
    goldenSyrup: ['melado', 'golden syrup', 'sirope dorado', 'Zuckerrübensirup', 'золотистый сироп'],
    sugar: ['açúcar', 'sugar', 'azúcar', 'Zucker', 'сахар'],
    chickpeas: ['grão-de-bico', 'chickpeas', 'garbanzos', 'Kichererbsen', 'нут'],
    lemon: ['limão', 'lemon', 'limón', 'Zitrone', 'лимон'],
    fruit: ['frutas', 'fruit', 'fruta', 'Obst', 'фрукты'],
    yoghurt: ['iogurte natural', 'plain yoghurt', 'yogur natural', 'Naturjoghurt', 'натуральный йогурт'],
    popcorn: ['milho de pipoca', 'popping corn', 'maíz para palomitas', 'Popcornmais', 'кукуруза для попкорна']
  };

  // MARK: - The ideas

  /**
   * sunday: made in the Sunday cook-up; keeps: days in the fridge (or the tin); freezes: can go in the freezer.
   * Ideas that aren't sunday are made the night before or in the morning.
   */
  var IDEAS = [
    {id: 'scrolls', icon: '🍕', sunday: true, keeps: 3, freezes: true,
      name: ['Rolinhos de pizza', 'Pizza scrolls', 'Rollitos de pizza', 'Pizzaschnecken', 'Пицца-рулетики'],
      line: ['Enrola, corta e assa. Doze pizzinhas que vão ao freezer.', 'Roll it, slice it, bake it. Twelve little pizzas that freeze.', 'Enrolla, corta y hornea. Doce pizzitas que se congelan.', 'Rollen, schneiden, backen. Zwölf kleine Pizzas für den Gefrierschrank.', 'Сверни, нарежь, запеки. Двенадцать маленьких пицц в морозилку.'],
      food: ['flour', 'bakingPowder', 'milk', 'butter', 'tomatoPaste', 'ham', 'cheese'],
      steps: [
        ['Faça uma massa de scone e abra bem fina.', 'Mix a scone dough and roll it out flat.', 'Haz una masa de scone y estírala bien fina.', 'Einen Scone-Teig machen und flach ausrollen.', 'Замеси тесто для сконов и раскатай пласт.'],
        ['Espalhe o extrato de tomate, ponha presunto e queijo e enrole.', 'Spread on tomato paste, add ham and cheese, and roll it up.', 'Unta el tomate, pon jamón y queso y enróllalo.', 'Tomatenmark aufstreichen, Schinken und Käse drauf, aufrollen.', 'Намажь томатную пасту, положи ветчину и сыр, сверни рулетом.'],
        ['Corte em rodelas e asse a 200° por 15 minutos.', 'Slice into rounds and bake at 200° for 15 minutes.', 'Corta en rodajas y hornea a 200° durante 15 minutos.', 'In Scheiben schneiden und bei 200° 15 Minuten backen.', 'Нарежь кружками и запекай 15 минут при 200°.']]},
    {id: 'vegeMuffins', icon: '🧀', sunday: true, keeps: 3, freezes: true,
      name: ['Muffins de queijo e legumes', 'Cheesy vege muffins', 'Muffins de queso y verduras', 'Käse-Gemüse-Muffins', 'Сырные маффины с овощами'],
      line: ['Legumes escondidos, muito queijo. Ninguém vai perceber.', 'Hidden veges and lots of cheese. Nobody will know.', 'Verduras escondidas y mucho queso. Nadie se dará cuenta.', 'Verstecktes Gemüse und viel Käse. Keiner merkt was.', 'Спрятанные овощи и много сыра. Никто не догадается.'],
      food: ['flour', 'bakingPowder', 'eggs', 'milk', 'cheese', 'courgette', 'carrot'],
      steps: [
        ['Rale a abobrinha e a cenoura.', 'Grate the courgette and carrot.', 'Ralla el calabacín y la zanahoria.', 'Zucchini und Karotte reiben.', 'Натри кабачок и морковь.'],
        ['Misture farinha, fermento, ovos, leite e queijo.', 'Mix in flour, baking powder, eggs, milk and cheese.', 'Mezcla con harina, levadura, huevos, leche y queso.', 'Mehl, Backpulver, Eier, Milch und Käse unterrühren.', 'Добавь муку, разрыхлитель, яйца, молоко и сыр.'],
        ['Coloque nas forminhas e asse a 190° por 20 minutos.', 'Spoon into muffin tins and bake at 190° for 20 minutes.', 'Reparte en moldes y hornea a 190° durante 20 minutos.', 'In Muffinförmchen füllen und bei 190° 20 Minuten backen.', 'Разложи по формочкам и выпекай 20 минут при 190°.']]},
    {id: 'sausageRolls', icon: '🥟', sunday: true, keeps: 3, freezes: true,
      name: ['Mini enroladinhos de carne', 'Mini sausage rolls', 'Mini rollitos de carne', 'Mini-Fleischröllchen', 'Мини-рулетики с мясом'],
      line: ['Um clássico neozelandês, do tamanho da lancheira.', 'A Kiwi classic, lunchbox sized.', 'Un clásico de Nueva Zelanda, tamaño fiambrera.', 'Ein Klassiker aus Neuseeland, in Brotdosengröße.', 'Новозеландская классика размером с ланчбокс.'],
      food: ['pastry', 'mince', 'carrot', 'eggs'],
      steps: [
        ['Misture a carne com cenoura ralada e um ovo.', 'Mix the mince with grated carrot and an egg.', 'Mezcla la carne con zanahoria rallada y un huevo.', 'Hack mit geriebener Karotte und einem Ei mischen.', 'Смешай фарш с тёртой морковью и яйцом.'],
        ['Enrole em tiras de massa e corte em pedaços.', 'Roll it up in strips of pastry and cut into bites.', 'Enróllala en tiras de hojaldre y corta en bocados.', 'In Teigstreifen einrollen und in Häppchen schneiden.', 'Заверни в полоски теста и нарежь кусочками.'],
        ['Asse a 200° por 20 minutos, até dourar.', 'Bake at 200° for 20 minutes until golden.', 'Hornea a 200° durante 20 minutos hasta que doren.', 'Bei 200° 20 Minuten goldbraun backen.', 'Запекай 20 минут при 200° до золотистого цвета.']]},
    {id: 'friedRice', icon: '🍚', sunday: true, keeps: 3, freezes: false,
      name: ['Arroz frito', 'Fried rice', 'Arroz frito', 'Gebratener Reis', 'Жареный рис'],
      line: ['Gostoso até frio, e usa o arroz que sobrou.', 'Tasty cold too, and it uses up leftover rice.', 'Rico también frío, y aprovecha el arroz que sobra.', 'Schmeckt auch kalt und verbraucht übrigen Reis.', 'Вкусный и холодным, и пригодится вчерашний рис.'],
      food: ['rice', 'eggs', 'peas', 'corn', 'ham', 'soy'],
      steps: [
        ['Mexa os ovos na frigideira e reserve.', 'Scramble the eggs and set them aside.', 'Haz los huevos revueltos y apártalos.', 'Rührei machen und beiseitestellen.', 'Сделай омлет-болтунью и отложи.'],
        ['Frite o arroz com ervilha, milho e presunto.', 'Fry the rice with peas, corn and ham.', 'Saltea el arroz con guisantes, maíz y jamón.', 'Reis mit Erbsen, Mais und Schinken braten.', 'Обжарь рис с горошком, кукурузой и ветчиной.'],
        ['Junte os ovos e um pouco de molho de soja.', 'Stir in the egg and a splash of soy sauce.', 'Añade el huevo y un chorrito de soja.', 'Ei und einen Schuss Sojasauce unterrühren.', 'Добавь яйцо и немного соевого соуса.']]},
    {id: 'pastaSalad', icon: '🍝', sunday: true, keeps: 3, freezes: false,
      name: ['Salada de macarrão arco-íris', 'Rainbow pasta salad', 'Ensalada arcoíris de pasta', 'Regenbogen-Nudelsalat', 'Радужный салат с макаронами'],
      line: ['Todas as cores num potinho só.', 'Every colour in one container.', 'Todos los colores en un solo táper.', 'Alle Farben in einer Dose.', 'Все цвета в одном контейнере.'],
      food: ['pasta', 'corn', 'capsicum', 'cucumber', 'cheese'],
      steps: [
        ['Cozinhe o macarrão e deixe esfriar.', 'Cook the pasta and let it cool.', 'Cuece la pasta y deja que se enfríe.', 'Nudeln kochen und abkühlen lassen.', 'Свари макароны и остуди.'],
        ['Pique bem o pimentão e o pepino.', 'Chop the capsicum and cucumber small.', 'Pica pequeño el pimiento y el pepino.', 'Paprika und Gurke klein schneiden.', 'Мелко нарежь перец и огурец.'],
        ['Misture tudo com milho e queijo em cubinhos.', 'Toss it all with corn and cubes of cheese.', 'Mézclalo todo con maíz y dados de queso.', 'Alles mit Mais und Käsewürfeln mischen.', 'Перемешай всё с кукурузой и кубиками сыра.']]},
    {id: 'bliss', icon: '🍫', sunday: true, keeps: 7, freezes: true,
      name: ['Bolinhas de chocolate', 'Choc bliss balls', 'Bolitas de chocolate', 'Schoko-Energiekugeln', 'Шоколадные шарики'],
      line: ['Parecem um docinho, e sem castanhas, então podem ir para a escola.', 'Taste like a treat, and no nuts, so they\'re fine for school.', 'Saben a capricho y no llevan frutos secos, así que valen para el cole.', 'Schmecken wie Naschzeug, ganz ohne Nüsse, also gut für die Schule.', 'На вкус как сладость, и без орехов, так что можно в школу.'],
      food: ['dates', 'oats', 'cocoa', 'coconut'],
      steps: [
        ['Deixe as tâmaras de molho em água quente por 5 minutos.', 'Soak the dates in hot water for 5 minutes.', 'Remoja los dátiles en agua caliente 5 minutos.', 'Datteln 5 Minuten in heißem Wasser einweichen.', 'Замочи финики в горячей воде на 5 минут.'],
        ['Bata com a aveia e o cacau.', 'Blitz them with the oats and cocoa.', 'Tritúralos con la avena y el cacao.', 'Mit Haferflocken und Kakao pürieren.', 'Измельчи их с овсянкой и какао.'],
        ['Faça bolinhas e passe no coco.', 'Roll into balls and coat them in coconut.', 'Haz bolitas y rebózalas en coco.', 'Zu Kugeln rollen und in Kokos wälzen.', 'Скатай шарики и обваляй в кокосе.']]},
    {id: 'eggMuffins', icon: '🍳', sunday: true, keeps: 3, freezes: true,
      name: ['Mini quiches sem massa', 'Mini egg muffins', 'Mini quiches sin masa', 'Mini-Eiermuffins', 'Мини-омлеты в формочках'],
      line: ['Quichezinhas sem massa, cheias de coisa boa.', 'Little crustless quiches, packed with good stuff.', 'Quichecitas sin masa, llenas de cosas ricas.', 'Kleine Quiches ohne Boden, voll guter Sachen.', 'Маленькие киши без теста, полные вкусного.'],
      food: ['eggs', 'milk', 'ham', 'spinach', 'cheese'],
      steps: [
        ['Bata os ovos com o leite.', 'Whisk the eggs and milk.', 'Bate los huevos con la leche.', 'Eier und Milch verquirlen.', 'Взбей яйца с молоком.'],
        ['Despeje nas forminhas sobre presunto, espinafre e queijo.', 'Pour into muffin tins over ham, spinach and cheese.', 'Viértelo en moldes sobre jamón, espinacas y queso.', 'In Muffinförmchen über Schinken, Spinat und Käse gießen.', 'Залей в формочки поверх ветчины, шпината и сыра.'],
        ['Asse a 180° por 15 minutos.', 'Bake at 180° for 15 minutes.', 'Hornea a 180° durante 15 minutos.', 'Bei 180° 15 Minuten backen.', 'Выпекай 15 минут при 180°.']]},
    {id: 'bananaMuffins', icon: '🍌', sunday: true, keeps: 3, freezes: true,
      name: ['Muffins de banana e aveia', 'Banana oat muffins', 'Muffins de plátano y avena', 'Bananen-Hafer-Muffins', 'Бананово-овсяные маффины'],
      line: ['Fofinhos, docinhos e ótimos para o lanche da manhã.', 'Soft, sweet and great for morning tea.', 'Esponjosos, dulces y perfectos para el recreo.', 'Weich, süß und super für die Pause.', 'Мягкие, сладкие и отлично подходят на перемену.'],
      food: ['banana', 'oats', 'flour', 'bakingPowder', 'eggs', 'milk', 'honey'],
      steps: [
        ['Amasse as bananas.', 'Mash the bananas.', 'Aplasta los plátanos.', 'Bananen zerdrücken.', 'Разомни бананы.'],
        ['Misture aveia, farinha, fermento, ovos, leite e mel.', 'Mix in oats, flour, baking powder, eggs, milk and honey.', 'Mezcla avena, harina, levadura, huevos, leche y miel.', 'Haferflocken, Mehl, Backpulver, Eier, Milch und Honig unterrühren.', 'Добавь овсянку, муку, разрыхлитель, яйца, молоко и мёд.'],
        ['Asse a 180° por 20 minutos.', 'Bake at 180° for 20 minutes.', 'Hornea a 180° durante 20 minutos.', 'Bei 180° 20 Minuten backen.', 'Выпекай 20 минут при 180°.']]},
    {id: 'fritters', icon: '🌽', sunday: true, keeps: 3, freezes: true,
      name: ['Bolinhos de milho', 'Corn fritters', 'Tortitas de maíz', 'Maispuffer', 'Кукурузные оладьи'],
      line: ['Crocantes por fora, milho docinho por dentro.', 'Crispy outside, sweet corn inside.', 'Crujientes por fuera, maíz dulce por dentro.', 'Außen knusprig, innen süßer Mais.', 'Хрустящие снаружи, сладкая кукуруза внутри.'],
      food: ['corn', 'flour', 'eggs', 'milk', 'cheese'],
      steps: [
        ['Misture farinha, ovos e leite numa massa.', 'Mix flour, eggs and milk into a batter.', 'Mezcla harina, huevos y leche en una masa.', 'Mehl, Eier und Milch zu einem Teig rühren.', 'Смешай муку, яйца и молоко в тесто.'],
        ['Junte o milho e o queijo.', 'Stir in the corn and cheese.', 'Añade el maíz y el queso.', 'Mais und Käse unterrühren.', 'Добавь кукурузу и сыр.'],
        ['Frite às colheradas até dourar dos dois lados.', 'Fry spoonfuls until golden on both sides.', 'Fríe cucharadas hasta que doren por los dos lados.', 'Löffelweise braten, bis beide Seiten goldbraun sind.', 'Жарь по ложке до золотистой корочки с двух сторон.']]},
    {id: 'drumsticks', icon: '🍗', sunday: true, keeps: 3, freezes: false,
      name: ['Coxinhas de frango grudentas', 'Sticky chicken drumsticks', 'Muslitos de pollo pegajosos', 'Klebrige Hähnchenschenkel', 'Липкие куриные голени'],
      line: ['Grudentas, docinhas e feitas para comer com a mão.', 'Sticky, sweet and made for fingers.', 'Pegajosos, dulces y hechos para comer con las manos.', 'Klebrig, süß und für die Finger gemacht.', 'Липкие, сладкие и созданы для пальцев.'],
      food: ['drumsticks', 'honey', 'soy'],
      steps: [
        ['Misture mel e molho de soja.', 'Mix honey and soy sauce.', 'Mezcla miel y salsa de soja.', 'Honig und Sojasauce mischen.', 'Смешай мёд и соевый соус.'],
        ['Cubra bem as coxinhas.', 'Coat the drumsticks all over.', 'Embadurna bien los muslitos.', 'Die Schenkel rundum bestreichen.', 'Обмажь голени со всех сторон.'],
        ['Asse a 200° por 40 minutos, virando uma vez.', 'Bake at 200° for 40 minutes, turning once.', 'Hornea a 200° durante 40 minutos, dándoles la vuelta una vez.', 'Bei 200° 40 Minuten backen, einmal wenden.', 'Запекай 40 минут при 200°, перевернув один раз.']]},
    {id: 'anzac', icon: '🍪', sunday: true, keeps: 7, freezes: false,
      name: ['Biscoitos ANZAC', 'ANZAC biscuits', 'Galletas ANZAC', 'ANZAC-Kekse', 'Печенье ANZAC'],
      line: ['Macios, dourados e os favoritos da Nova Zelândia.', 'Chewy, golden and a Kiwi favourite.', 'Blanditas, doradas y las favoritas de Nueva Zelanda.', 'Zäh, golden und ein Liebling in Neuseeland.', 'Тягучее, золотистое и любимое в Новой Зеландии.'],
      food: ['oats', 'flour', 'coconut', 'sugar', 'butter', 'goldenSyrup'],
      steps: [
        ['Misture aveia, farinha, coco e açúcar.', 'Mix oats, flour, coconut and sugar.', 'Mezcla avena, harina, coco y azúcar.', 'Haferflocken, Mehl, Kokos und Zucker mischen.', 'Смешай овсянку, муку, кокос и сахар.'],
        ['Derreta a manteiga com o melado e junte.', 'Melt the butter and golden syrup and stir it in.', 'Derrite la mantequilla con el sirope y mézclalo.', 'Butter und Sirup schmelzen und unterrühren.', 'Растопи масло с сиропом и вмешай.'],
        ['Faça bolinhas, achate e asse a 160° por 15 minutos.', 'Roll into balls, flatten and bake at 160° for 15 minutes.', 'Haz bolitas, aplástalas y hornea a 160° durante 15 minutos.', 'Kugeln formen, flach drücken und bei 160° 15 Minuten backen.', 'Скатай шарики, приплюсни и выпекай 15 минут при 160°.']]},
    {id: 'pikelets', icon: '🥞', sunday: true, keeps: 2, freezes: true,
      name: ['Panquequinhas', 'Pikelets', 'Tortitas pequeñas', 'Mini-Pfannkuchen', 'Оладушки'],
      line: ['Panquecas minúsculas com um pouquinho de geleia.', 'Tiny pancakes with a smear of jam.', 'Tortitas diminutas con un poco de mermelada.', 'Winzige Pfannkuchen mit etwas Marmelade.', 'Крошечные оладьи с капелькой варенья.'],
      food: ['flour', 'bakingPowder', 'eggs', 'milk', 'sugar'],
      steps: [
        ['Bata farinha, fermento, ovo, leite e açúcar.', 'Whisk flour, baking powder, an egg, milk and sugar.', 'Bate harina, levadura, un huevo, leche y azúcar.', 'Mehl, Backpulver, ein Ei, Milch und Zucker verquirlen.', 'Взбей муку, разрыхлитель, яйцо, молоко и сахар.'],
        ['Pingue colheradas numa frigideira quente.', 'Drop spoonfuls into a hot pan.', 'Echa cucharadas en una sartén caliente.', 'Löffelweise in eine heiße Pfanne geben.', 'Выкладывай по ложке на горячую сковороду.'],
        ['Vire quando aparecerem bolhinhas.', 'Flip them when bubbles show.', 'Dales la vuelta cuando salgan burbujas.', 'Wenden, wenn Bläschen kommen.', 'Переверни, когда появятся пузырьки.']]},
    {id: 'noodleSalad', icon: '🍜', sunday: true, keeps: 2, freezes: false,
      name: ['Salada de macarrão oriental', 'Noodle salad', 'Ensalada de fideos', 'Nudelsalat asiatisch', 'Салат с лапшой'],
      line: ['Macarrão que se come fazendo barulho, e gostoso frio.', 'Slurpy noodles that taste great cold.', 'Fideos para sorber que están buenísimos fríos.', 'Schlürfnudeln, die kalt super schmecken.', 'Лапша, которую вкусно втягивать, даже холодной.'],
      food: ['noodles', 'carrot', 'cucumber', 'chicken', 'soy', 'honey'],
      steps: [
        ['Cozinhe o macarrão e deixe esfriar.', 'Cook the noodles and let them cool.', 'Cuece los fideos y deja que se enfríen.', 'Nudeln kochen und abkühlen lassen.', 'Свари лапшу и остуди.'],
        ['Junte cenoura e pepino em tirinhas e frango desfiado.', 'Add shredded carrot, cucumber and chicken.', 'Añade zanahoria, pepino y pollo en tiras.', 'Karotte, Gurke und Hähnchen in Streifen dazugeben.', 'Добавь соломкой морковь, огурец и курицу.'],
        ['Tempere com molho de soja e um pouco de mel.', 'Toss with soy sauce and a little honey.', 'Aliña con soja y un poco de miel.', 'Mit Sojasauce und etwas Honig mischen.', 'Заправь соевым соусом и капелькой мёда.']]},
    {id: 'hummus', icon: '🥕', sunday: true, keeps: 5, freezes: false,
      name: ['Homus com palitos de legumes', 'Hummus and vege sticks', 'Hummus con palitos de verdura', 'Hummus mit Gemüsesticks', 'Хумус с овощными палочками'],
      line: ['Mergulha, crocante, repete.', 'Dunk, crunch, repeat.', 'Moja, cruje, repite.', 'Dippen, knuspern, wiederholen.', 'Макни, хрустни, повтори.'],
      food: ['chickpeas', 'lemon', 'carrot', 'cucumber', 'capsicum'],
      steps: [
        ['Bata o grão-de-bico com limão e um pouco de água.', 'Blitz the chickpeas with lemon and a splash of water.', 'Tritura los garbanzos con limón y un chorrito de agua.', 'Kichererbsen mit Zitrone und etwas Wasser pürieren.', 'Измельчи нут с лимоном и капелькой воды.'],
        ['Corte cenoura, pepino e pimentão em palitos.', 'Cut the carrot, cucumber and capsicum into sticks.', 'Corta zanahoria, pepino y pimiento en palitos.', 'Karotte, Gurke und Paprika in Sticks schneiden.', 'Нарежь морковь, огурец и перец палочками.'],
        ['Leve o homus num potinho para mergulhar.', 'Pack the hummus in a little pot for dipping.', 'Pon el hummus en un tarrito para mojar.', 'Den Hummus zum Dippen in ein Döschen füllen.', 'Положи хумус в баночку, чтобы макать.']]},
    {id: 'popcorn', icon: '🍿', sunday: true, keeps: 5, freezes: false,
      name: ['Pipoca', 'Popcorn', 'Palomitas', 'Popcorn', 'Попкорн'],
      line: ['Uma panelada no domingo, um saquinho por dia.', 'One big batch on Sunday, a bag a day.', 'Una buena tanda el domingo, una bolsita al día.', 'Eine große Ladung am Sonntag, eine Tüte am Tag.', 'Большая порция в воскресенье, пакетик на каждый день.'],
      food: ['popcorn', 'butter'],
      steps: [
        ['Aqueça uma panela com um pouco de manteiga.', 'Heat a pot with a little butter.', 'Calienta una olla con un poco de mantequilla.', 'Einen Topf mit etwas Butter erhitzen.', 'Разогрей кастрюлю с капелькой масла.'],
        ['Ponha o milho, tampe e sacuda.', 'Add the corn, put the lid on and shake.', 'Echa el maíz, tapa y agita.', 'Mais dazu, Deckel drauf und schütteln.', 'Засыпь кукурузу, накрой крышкой и встряхивай.'],
        ['Deixe esfriar e divida em saquinhos para a semana.', 'Let it cool, then bag it up for the week.', 'Deja que se enfríe y repártela en bolsitas para la semana.', 'Abkühlen lassen und für die Woche in Tüten füllen.', 'Остуди и разложи по пакетикам на неделю.']]},
    {id: 'granola', icon: '🥣', sunday: true, keeps: 14, freezes: false,
      name: ['Iogurte com granola crocante', 'Yoghurt and crunchy granola', 'Yogur con granola crujiente', 'Joghurt mit Knuspermüsli', 'Йогурт с хрустящей гранолой'],
      line: ['A parte crocante sai no domingo, e vai por cima na hora do almoço.', 'Make the crunchy bit on Sunday and add it at lunchtime.', 'La parte crujiente se hace el domingo y se añade a la hora de comer.', 'Das Knusprige am Sonntag machen, mittags drüberstreuen.', 'Хрустящую часть делаем в воскресенье, а в обед посыпаем.'],
      food: ['yoghurt', 'oats', 'honey', 'coconut', 'fruit'],
      steps: [
        ['Misture aveia, coco e mel.', 'Mix the oats, coconut and honey.', 'Mezcla la avena, el coco y la miel.', 'Haferflocken, Kokos und Honig mischen.', 'Смешай овсянку, кокос и мёд.'],
        ['Asse a 160° por 20 minutos, mexendo uma vez.', 'Bake at 160° for 20 minutes, stirring once.', 'Hornea a 160° durante 20 minutos, removiendo una vez.', 'Bei 160° 20 Minuten backen, einmal umrühren.', 'Запекай 20 минут при 160°, перемешав один раз.'],
        ['Leve iogurte e frutas com uma colherada de granola.', 'Pack yoghurt and fruit with a scoop of granola.', 'Lleva yogur y fruta con un puñado de granola.', 'Joghurt und Obst mit einer Portion Müsli einpacken.', 'Возьми йогурт и фрукты с ложкой гранолы.']]},
    {id: 'pinwheels', icon: '🌯', sunday: false, keeps: 1, freezes: false,
      name: ['Rodinhas de wrap', 'Wrap pinwheels', 'Ruedas de wrap', 'Wrap-Schnecken', 'Рулетики из лаваша'],
      line: ['Wraps enroladinhos cortados em rodinhas.', 'Swirly wraps cut into wheels.', 'Wraps enrollados cortados en ruedas.', 'Gerollte Wraps, in Räder geschnitten.', 'Свёрнутый лаваш, нарезанный колёсиками.'],
      food: ['wraps', 'creamCheese', 'ham', 'lettuce', 'carrot'],
      steps: [
        ['Passe cream cheese no wrap.', 'Spread cream cheese over a wrap.', 'Unta queso crema en un wrap.', 'Frischkäse auf einen Wrap streichen.', 'Намажь лаваш сливочным сыром.'],
        ['Ponha presunto, alface e cenoura ralada.', 'Add ham, lettuce and grated carrot.', 'Añade jamón, lechuga y zanahoria rallada.', 'Schinken, Salat und geriebene Karotte darauf.', 'Положи ветчину, салат и тёртую морковь.'],
        ['Enrole bem firme e corte em rodinhas.', 'Roll it up tight and slice it into wheels.', 'Enróllalo bien apretado y córtalo en ruedas.', 'Fest aufrollen und in Räder schneiden.', 'Плотно сверни и нарежь колёсиками.']]},
    {id: 'sushi', icon: '🍣', sunday: false, keeps: 1, freezes: false,
      name: ['Sushi enroladinho', 'Sushi rolls', 'Rollitos de sushi', 'Sushirollen', 'Роллы суши'],
      line: ['Enrole o seu e corte em fatias.', 'Roll your own, then slice it up.', 'Enrolla el tuyo y córtalo en rodajas.', 'Selbst rollen und dann aufschneiden.', 'Сверни свой ролл и нарежь.'],
      food: ['rice', 'nori', 'cucumber', 'carrot', 'chicken'],
      steps: [
        ['Cozinhe o arroz e deixe esfriar.', 'Cook the rice and let it cool.', 'Cuece el arroz y deja que se enfríe.', 'Reis kochen und abkühlen lassen.', 'Свари рис и остуди.'],
        ['Espalhe na alga e ponha pepino, cenoura e frango.', 'Spread it on the nori and add cucumber, carrot and chicken.', 'Extiéndelo en el alga y pon pepino, zanahoria y pollo.', 'Auf dem Nori verteilen, Gurke, Karotte und Hähnchen darauf.', 'Распредели по нори, добавь огурец, морковь и курицу.'],
        ['Enrole e corte em rodelas.', 'Roll it up and slice it.', 'Enróllalo y córtalo.', 'Aufrollen und in Scheiben schneiden.', 'Сверни и нарежь кружками.']]},
    {id: 'ricePaper', icon: '🥗', sunday: false, keeps: 1, freezes: false,
      name: ['Rolinhos de papel de arroz', 'Rice paper rolls', 'Rollitos de papel de arroz', 'Reispapierrollen', 'Рулетики из рисовой бумаги'],
      line: ['Rolinhos transparentes cheios de crocância.', 'See-through rolls full of crunch.', 'Rollitos transparentes llenos de cosas crujientes.', 'Durchsichtige Röllchen voller Knackiges.', 'Прозрачные рулетики, полные хруста.'],
      food: ['ricePaper', 'noodles', 'lettuce', 'carrot', 'cucumber', 'chicken'],
      steps: [
        ['Molhe uma folha de arroz em água morna.', 'Dip a sheet of rice paper in warm water.', 'Moja una hoja de papel de arroz en agua tibia.', 'Ein Reispapierblatt in warmes Wasser tauchen.', 'Окуни лист рисовой бумаги в тёплую воду.'],
        ['Recheie com macarrão, alface, cenoura, pepino e frango.', 'Fill it with noodles, lettuce, carrot, cucumber and chicken.', 'Rellénala con fideos, lechuga, zanahoria, pepino y pollo.', 'Mit Nudeln, Salat, Karotte, Gurke und Hähnchen füllen.', 'Начини лапшой, салатом, морковью, огурцом и курицей.'],
        ['Dobre as laterais e enrole.', 'Fold in the sides and roll.', 'Dobla los lados y enrolla.', 'Seiten einschlagen und aufrollen.', 'Подогни края и сверни.']]},
    {id: 'crackers', icon: '🥨', sunday: false, keeps: 1, freezes: false,
      name: ['Monte suas bolachinhas', 'Build your own crackers', 'Monta tus galletitas', 'Cracker selbst belegen', 'Собери свои крекеры'],
      line: ['Empilhe do jeito que quiser na hora do almoço.', 'Stack them however you like at lunchtime.', 'Apílalas como quieras a la hora de comer.', 'Mittags so stapeln, wie du willst.', 'Собирай как хочешь прямо в обед.'],
      food: ['crackers', 'cheese', 'ham', 'cucumber'],
      steps: [
        ['Corte o queijo e o presunto em quadradinhos.', 'Cut the cheese and ham into little squares.', 'Corta el queso y el jamón en cuadraditos.', 'Käse und Schinken in kleine Quadrate schneiden.', 'Нарежь сыр и ветчину квадратиками.'],
        ['Fatie o pepino em rodelas.', 'Slice the cucumber into rounds.', 'Corta el pepino en rodajas.', 'Gurke in Scheiben schneiden.', 'Нарежь огурец кружками.'],
        ['Guarde cada coisa no seu cantinho da lancheira.', 'Pack each one in its own spot in the lunchbox.', 'Pon cada cosa en su hueco de la fiambrera.', 'Alles in eigene Fächer der Brotdose packen.', 'Разложи всё по отделениям ланчбокса.']]},
    {id: 'kebabs', icon: '🍓', sunday: false, keeps: 1, freezes: false,
      name: ['Espetinhos de fruta arco-íris', 'Rainbow fruit kebabs', 'Brochetas arcoíris de fruta', 'Regenbogen-Obstspieße', 'Радужные фруктовые шпажки'],
      line: ['Fruta no palito é mais gostosa. É fato.', 'Fruit on a stick tastes better. Fact.', 'La fruta en palito sabe mejor. Es un hecho.', 'Obst am Spieß schmeckt besser. Fakt.', 'Фрукты на шпажке вкуснее. Это факт.'],
      food: ['fruit', 'lemon'],
      steps: [
        ['Corte as frutas em pedaços.', 'Chop the fruit into chunks.', 'Corta la fruta en trozos.', 'Obst in Stücke schneiden.', 'Нарежь фрукты кусочками.'],
        ['Espete em palitinhos na ordem do arco-íris.', 'Thread it onto short sticks in rainbow order.', 'Ensártala en palitos en orden de arcoíris.', 'In Regenbogenfolge auf kurze Spieße stecken.', 'Нанизай на короткие шпажки цветами радуги.'],
        ['Esprema um pouco de limão para não escurecer.', 'Squeeze over a little lemon so it stays bright.', 'Exprime un poco de limón para que no se oscurezca.', 'Etwas Zitrone darüber, damit es frisch bleibt.', 'Сбрызни лимоном, чтобы не потемнели.']]}
  ];

  function idea(id) { for (var i = 0; i < IDEAS.length; i++) if (IDEAS[i].id === id) return IDEAS[i]; return null; }

  // MARK: - The rules (no screen, so the tests can check them)

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /**
   * The order a kid sees the ideas in: shuffled, with the ones they keep saying nah to sent towards the back, so the
   * first cards are the ones most likely to land. Ideas already in their week are left out.
   */
  function deckFor(kid, skip) {
    var nah = (kid && kid.nah) || {}, out = [];
    var all = shuffle(IDEAS);
    for (var i = 0; i < all.length; i++) if (!skip || skip.indexOf(all[i].id) < 0) out.push(all[i]);
    // A stable sort by how often they said nah: Array.sort isn't stable on old TVs, so keep the shuffled place.
    for (var k = 0; k < out.length; k++) out[k] = {i: k, n: nah[out[k].id] || 0, idea: out[k]};
    out.sort(function (a, b) { return a.n - b.n || a.i - b.i; });
    for (var m = 0; m < out.length; m++) out[m] = out[m].idea.id;
    return out;
  }

  /** Keeps a finished week: the five ideas, when, and adds them to what this kid loves (and what they said nah to). */
  function record(store, person, week, nahs) {
    var kid = store.kids[person.id] || (store.kids[person.id] = {loves: {}, nah: {}});
    kid.name = person.name || '';
    kid.colour = person.colour || '';
    kid.emoji = person.emoji || '';
    kid.week = week.slice(0, WEEK);
    kid.at = Date.now();
    for (var i = 0; i < kid.week.length; i++) kid.loves[kid.week[i]] = (kid.loves[kid.week[i]] || 0) + 1;
    for (var j = 0; j < (nahs || []).length; j++) kid.nah[nahs[j]] = (kid.nah[nahs[j]] || 0) + 1;
    return kid;
  }

  /** What a kid loves most, by how many weeks they picked it: up to n ids, most first. */
  function favourites(kid, n) {
    var ids = [];
    for (var id in kid.loves) if (kid.loves.hasOwnProperty(id) && idea(id)) ids.push(id);
    ids.sort(function (a, b) { return kid.loves[b] - kid.loves[a] || (a < b ? -1 : 1); });
    return ids.slice(0, n || 3);
  }

  /** Every kid's week, each idea once: [{id, kids: [names]}], the ones most kids picked first. */
  function thisWeek(store) {
    var by = {}, order = [];
    for (var pid in store.kids) {
      if (!store.kids.hasOwnProperty(pid)) continue;
      var kid = store.kids[pid];
      for (var i = 0; i < (kid.week || []).length; i++) {
        var id = kid.week[i];
        if (!idea(id)) continue;
        if (!by[id]) { by[id] = {id: id, kids: []}; order.push(by[id]); }
        if (by[id].kids.indexOf(kid.name) < 0) by[id].kids.push(kid.name);
      }
    }
    order.sort(function (a, b) { return b.kids.length - a.kids.length; });
    return order;
  }

  /** What to buy for these ideas: each thing once, in the order FOOD lists them, with how many ideas need it. */
  function shopping(ids) {
    var need = {};
    for (var i = 0; i < ids.length; i++) {
      var it = idea(ids[i]);
      if (!it) continue;
      for (var j = 0; j < it.food.length; j++) need[it.food[j]] = (need[it.food[j]] || 0) + 1;
    }
    var out = [];
    for (var f in FOOD) if (FOOD.hasOwnProperty(f) && need[f]) out.push({id: f, n: need[f]});
    return out;
  }

  // MARK: - Kept on this TV

  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || !s.kids || typeof s.kids !== 'object') s = {v: 1, kids: {}};
    return s;
  }
  function save(s) {
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* Full or private: the game still plays. */ }
  }

  // MARK: - Words around the ideas

  function tags(it) {
    var out = [];
    if (it.sunday) {
      out.push('🍳 ' + tr('Feito no domingo', 'Made on Sunday', 'Se hace el domingo'));
      out.push(it.keeps >= 7 ? tr('Dura a semana toda', 'Keeps all week', 'Aguanta toda la semana')
        : say('Dura {n} dias', 'Keeps {n} days', 'Aguanta {n} días', it.keeps));
    } else out.push('🌅 ' + tr('Feito na hora', 'Made fresh', 'Se hace al momento'));
    if (it.freezes) out.push('❄️ ' + tr('Vai ao freezer', 'Freezes', 'Se congela'));
    return out;
  }

  var DAYS = [['Seg', 'Mon', 'Lun', 'Mo', 'Пн'], ['Ter', 'Tue', 'Mar', 'Di', 'Вт'], ['Qua', 'Wed', 'Mié', 'Mi', 'Ср'],
    ['Qui', 'Thu', 'Jue', 'Do', 'Чт'], ['Sex', 'Fri', 'Vie', 'Fr', 'Пт']];

  // MARK: - The menu

  function open() {
    UI.open({
      cls: 'bt-table bt-table-games ln-menu',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Lanches da escola', 'School lunches', 'Almuerzos del cole'),
          tr('Escolha o que você adoraria na lancheira. Os adultos veem a lista.', 'Pick what you\'d love in your lunchbox. The grown-ups get the list.', 'Elige lo que te encantaría en la fiambrera. Los mayores ven la lista.'));
        var list = UI.el('div', 'tg-games', layer);
        var cards = [
          ['🥪', tr('Escolher meus lanches', 'Pick my lunches', 'Elegir mis almuerzos'),
            tr('Direita para delícia, esquerda para não. Cinco para a semana.', 'Right for yum, left for nah. Five for the week.', 'Derecha para qué rico, izquierda para no. Cinco para la semana.'), function () { who(); }],
          ['🍳', tr('Cozinhar no domingo', 'Sunday cook-up', 'Cocinar el domingo'),
            tr('Como fazer o que escolheram, e a lista de compras.', 'How to make what they picked, and the shopping list.', 'Cómo hacer lo que eligieron, y la lista de la compra.'), function () { cookup(); }],
          ['📋', tr('A lista dos adultos', 'Grown-ups\' list', 'La lista de los mayores'),
            tr('O que cada um escolheu nesta semana, e o que mais adoram.', 'What each kid chose this week, and what they love most.', 'Lo que eligió cada uno esta semana, y lo que más les gusta.'), function () { grownUps(); }]
        ];
        for (var i = 0; i < cards.length; i++) {
          (function (c, first) {
            var card = UI.el('div', 'tg-game', list);
            UI.el('div', 'icon', card, c[0]);
            UI.el('div', 'title', card, c[1]);
            UI.el('div', 'about', card, c[2]);
            api.add(card, c[3], {first: first});
          })(cards[i], i === 0);
        }
        UI.el('div', 'ln-note', layer, tr('Tudo sem castanhas, e tudo fica nesta TV.', 'Every idea is nut free, and it all stays on this TV.', 'Todo sin frutos secos, y todo se queda en esta tele.'));
      }
    });
  }

  // MARK: - Who's picking (one kid at a time)

  function people() {
    var list = window.Profiles ? Profiles.list() : [], kids = [], grown = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].together) continue;
      (list[i].kid ? kids : grown).push(list[i]);
    }
    return kids.concat(grown).slice(0, 8);
  }

  function who() {
    var me = window.Profiles && Profiles.current ? Profiles.current() : null;
    if (me && !me.together && me.kid) { swipe(me); return; }
    var all = people();
    if (!all.length) { swipe({id: 'me', name: tr('Eu', 'Me', 'Yo'), colour: '#9E7BFF'}); return; }
    UI.open({
      cls: 'bt-table bt-table-who',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Quem vai escolher?', 'Who\'s picking?', '¿Quién elige?'),
          tr('Um de cada vez, para cada um ter a sua lancheira.', 'One at a time, so everyone gets their own lunchbox.', 'De uno en uno, para que cada uno tenga su fiambrera.'));
        var row = UI.el('div', 'tg-faces', layer);
        var size = all.length > 6 ? 140 : 170, gap = all.length > 6 ? 44 : 64;
        var width = all.length * size + (all.length - 1) * gap;
        for (var i = 0; i < all.length; i++) {
          (function (p, x, first) {
            var f = UI.el('div', 'bt-face tg-face', row);
            f.style.left = x + 'px';
            f.style.width = size + 'px';
            UI.avatar(p, f, size);
            UI.el('div', 'name', f, p.name);
            api.add(f, function () { api.close(); swipe(p); }, {first: first});
          })(all[i], Math.round((1920 - width) / 2) + i * (size + gap), i === 0);
        }
      }
    });
  }

  // MARK: - Swiping

  var s = null;

  function swipe(person) {
    var store = load();
    s = {person: person, store: store, deck: deckFor(store.kids[person.id], null), at: 0, yum: [], nah: [], how: false, busy: false};
    UI.open({
      cls: 'bt-table ln-swipe',
      build: function (layer, api) {
        if (!s) return;
        var it = idea(s.deck[s.at]);
        var top = UI.el('div', 'ln-top', layer);
        UI.el('div', 'ln-who', top, say('Lancheira de {n}', '{n}\'s lunchbox', 'La fiambrera de {n}', s.person.name));
        var slots = UI.el('div', 'ln-slots', top);
        for (var d = 0; d < WEEK; d++) {
          var slot = UI.el('div', 'ln-slot' + (s.yum[d] ? ' full' : ''), slots);
          UI.el('div', 'day', slot, pick(DAYS[d]));
          UI.el('div', 'what', slot, s.yum[d] ? idea(s.yum[d]).icon : '');
        }
        var card = UI.el('div', 'ln-card' + (s.how ? ' how' : '') + (s.anim ? ' ' + s.anim : ''), layer);
        UI.el('div', 'ln-icon', card, it.icon);
        UI.el('div', 'ln-name', card, pick(it.name));
        UI.el('div', 'ln-line', card, pick(it.line));
        UI.el('div', 'ln-tags', card, tags(it).join('   ·   '));
        if (s.how) {
          var how = UI.el('div', 'ln-how', card);
          for (var k = 0; k < it.steps.length; k++) UI.el('div', 'step', how, (k + 1) + '. ' + pick(it.steps[k]));
        }
        UI.el('div', 'ln-nah', layer, '👈  ' + tr('Não', 'Nah', 'No'));
        UI.el('div', 'ln-yum', layer, tr('Delícia!', 'Yum!', '¡Qué rico!') + '  👉');
        var foot = UI.el('div', 'ln-foot', layer);
        api.add(UI.button(foot, tr('Delícia! Quero esse', 'Yum! I want this one', '¡Qué rico! Quiero este'), null, 'primary'), yum, {first: true});
        api.add(UI.button(foot, s.how ? tr('Esconder como faz', 'Hide how it\'s made', 'Ocultar cómo se hace') : '👇  ' + tr('Como faz?', 'How is it made?', '¿Cómo se hace?'), null, 'quiet'),
          function () { s.how = !s.how; api.rebuild(); });
        s.api = api;
      },
      key: function (k) {
        if (!s) return false;
        if (k === TV.keys.right) { yum(); return true; }
        if (k === TV.keys.left) { nah(); return true; }
        // Up and down open and close how it's made: left and right are taken by the swipe.
        if (k === TV.keys.down || k === TV.keys.up) { s.how = !s.how; s.api.rebuild(); return true; }
        return false;
      },
      closed: function () { s = null; }
    });
  }

  function slide(dir, then) {
    if (!s || s.busy) return;
    s.busy = true;
    s.anim = dir;
    s.api.rebuild();
    setTimeout(function () {
      if (!s) return;
      s.busy = false;
      s.anim = '';
      s.how = false;
      then();
    }, 280);
  }

  function next() {
    s.at++;
    if (s.at >= s.deck.length) {
      // Through every idea: round again, only the ones not picked yet.
      s.deck = deckFor(s.store.kids[s.person.id], s.yum);
      s.at = 0;
    }
    s.api.rebuild();
  }

  function yum() {
    if (!s || s.busy) return;
    var id = s.deck[s.at];
    Sfx.play('match');
    slide('go-right', function () {
      s.yum.push(id);
      if (s.yum.length >= WEEK) { finish(); return; }
      next();
    });
  }

  function nah() {
    if (!s || s.busy) return;
    var id = s.deck[s.at];
    Sfx.play('flip');
    slide('go-left', function () {
      if (s.nah.indexOf(id) < 0) s.nah.push(id);
      next();
    });
  }

  function finish() {
    var person = s.person, week = s.yum.slice();
    record(s.store, person, week, s.nah);
    save(s.store);
    var api = s.api;
    s = null;
    api.close();
    Sfx.play('six');
    weekDone(person, week);
  }

  function weekDone(person, week) {
    UI.open({
      cls: 'bt-table ln-week',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), say('A semana de {n}!', '{n}\'s lunch week!', '¡La semana de {n}!', person.name),
          tr('Guardado para os adultos. Bom apetite!', 'Saved for the grown-ups. Enjoy!', 'Guardado para los mayores. ¡Que aproveche!'));
        var row = UI.el('div', 'ln-days', layer);
        for (var d = 0; d < week.length; d++) {
          var it = idea(week[d]), col = UI.el('div', 'ln-day', row);
          UI.el('div', 'day', col, pick(DAYS[d]));
          UI.el('div', 'icon', col, it.icon);
          UI.el('div', 'name', col, pick(it.name));
          UI.el('div', 'when', col, it.sunday ? '🍳 ' + tr('Domingo', 'Sunday', 'Domingo') : '🌅 ' + tr('Na hora', 'Fresh', 'Al momento'));
        }
        var foot = UI.el('div', 'tg-foot low', layer);
        api.add(UI.button(foot, tr('Pronto', 'Done', 'Listo'), null, 'primary'), function () { api.close(); }, {first: true});
        api.add(UI.button(foot, tr('Outra pessoa escolhe', 'Someone else picks', 'Elige otra persona')), function () { api.close(); who(); });
      }
    });
  }

  // MARK: - The grown-ups' list

  function kidsWithPicks(store) {
    var out = [];
    for (var pid in store.kids) if (store.kids.hasOwnProperty(pid) && store.kids[pid].week && store.kids[pid].week.length) out.push(store.kids[pid]);
    out.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    return out.slice(0, 6);
  }

  function when(at) {
    if (!at) return '';
    var d = new Date(at);
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function grownUps() {
    UI.open({
      cls: 'bt-table ln-list',
      build: function (layer, api) {
        var store = load(), kids = kidsWithPicks(store);
        UI.heading(UI.el('div', 'tg-top', layer), tr('A lista dos adultos', 'Grown-ups\' list', 'La lista de los mayores'),
          kids.length ? tr('O que cada um escolheu, e o que mais adoram.', 'What each kid picked, and what they love most.', 'Lo que eligió cada uno, y lo que más les gusta.')
            : tr('Ninguém escolheu ainda. Comece com Escolher meus lanches.', 'Nobody has picked yet. Start with Pick my lunches.', 'Nadie ha elegido aún. Empieza con Elegir mis almuerzos.'));
        if (kids.length) {
          var cols = UI.el('div', 'ln-cols', layer), w = Math.min(420, Math.floor((1680 - (kids.length - 1) * 30) / kids.length));
          for (var i = 0; i < kids.length; i++) {
            var kid = kids[i], col = UI.el('div', 'ln-col', cols);
            col.style.width = w + 'px';
            var head = UI.el('div', 'who', col);
            UI.avatar({name: kid.name, colour: kid.colour || '#9E7BFF', emoji: kid.emoji}, head, 64);
            UI.el('span', 'n', head, kid.name);
            UI.el('div', 'at', col, when(kid.at));
            for (var d = 0; d < kid.week.length; d++) {
              var it = idea(kid.week[d]);
              if (it) UI.el('div', 'pick', col, pick(DAYS[d]) + '  ' + it.icon + ' ' + pick(it.name));
            }
            var fav = favourites(kid, 3), names = [];
            for (var f = 0; f < fav.length; f++) names.push(idea(fav[f]).icon + ' ' + pick(idea(fav[f]).name));
            if (fav.length) {
              UI.el('div', 'loves', col, tr('Adora', 'Loves', 'Le encanta'));
              UI.el('div', 'fav', col, names.join(', '));
            }
          }
        }
        var foot = UI.el('div', 'tg-foot low', layer);
        api.add(UI.button(foot, '🍳  ' + tr('Cozinhar no domingo', 'Sunday cook-up', 'Cocinar el domingo'), null, 'primary'), function () { cookup(); }, {first: true});
        api.add(UI.button(foot, '🛒  ' + tr('Lista de compras', 'Shopping list', 'Lista de la compra')), function () { shop(); });
        if (kids.length) api.add(UI.button(foot, tr('Começar nova semana', 'Start a new week', 'Empezar semana nueva'), null, 'quiet'), function () {
          var go = function () {
            var st = load();
            for (var p in st.kids) if (st.kids.hasOwnProperty(p)) st.kids[p].week = [];
            save(st);
            UI.toast(tr('Pronto para a próxima semana. O que adoram fica guardado.', 'Ready for next week. What they love is kept.', 'Listo para la semana que viene. Lo que les gusta se guarda.'));
            api.rebuild();
          };
          if (window.Profiles && Profiles.guard) Profiles.guard(tr('Começar nova semana', 'Start a new week', 'Empezar semana nueva'), go); else go();
        });
      }
    });
  }

  // MARK: - The Sunday cook-up

  /** This week's picks that are made on Sunday, else a few ideas to get going. */
  function cookList(store) {
    var week = thisWeek(store), out = [];
    for (var i = 0; i < week.length; i++) if (idea(week[i].id).sunday) out.push(week[i]);
    var picked = out.length;
    if (!picked) {
      var some = shuffle(IDEAS.filter(function (x) { return x.sunday; })).slice(0, 5);
      for (var j = 0; j < some.length; j++) out.push({id: some[j].id, kids: []});
    }
    var top = out.slice(0, 5);
    top.idea = picked === 0;
    return top;
  }

  function cookup() {
    var list = cookList(load());
    UI.open({
      cls: 'bt-table ln-cook',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Cozinhar no domingo', 'Sunday cook-up', 'Cocinar el domingo'),
          list.idea ? tr('Ninguém escolheu ainda, então aqui vão umas ideias.', 'Nobody has picked yet, so here are a few ideas.', 'Nadie ha elegido aún, así que aquí van unas ideas.')
            : tr('Faça tudo de uma vez e a semana fica resolvida.', 'Make it all in one go and the week is sorted.', 'Hazlo todo de una vez y la semana queda resuelta.'));
        var left = UI.el('div', 'ln-recipes', layer), pane = UI.el('div', 'ln-pane', layer);
        var rows = [];
        for (var i = 0; i < list.length; i++) {
          (function (row, first) {
            var it = idea(row.id), r = UI.el('div', 'ln-row', left);
            UI.el('span', 'icon', r, it.icon);
            UI.el('span', 'name', r, pick(it.name));
            if (row.kids.length) UI.el('div', 'for', r, say('Para {n}', 'For {n}', 'Para {n}', row.kids.join(', ')));
            rows.push(it);
            api.add(r, null, {first: first});
          })(list[i], i === 0);
        }
        api.add(UI.button(UI.el('div', 'ln-shop', layer), '🛒  ' + tr('Lista de compras', 'Shopping list', 'Lista de la compra'), null, 'primary'), function () { shop(); });
        pane.paint = function (it) {
          pane.innerHTML = '';
          if (!it) return;
          UI.el('div', 'title', pane, it.icon + '  ' + pick(it.name));
          UI.el('div', 'tags', pane, tags(it).join('   ·   '));
          UI.el('div', 'sub', pane, tr('Você vai precisar de', 'You\'ll need', 'Vas a necesitar'));
          var need = [];
          for (var f = 0; f < it.food.length; f++) need.push(pick(FOOD[it.food[f]]));
          UI.el('div', 'need', pane, need.join(', '));
          UI.el('div', 'sub', pane, tr('Como faz', 'How it\'s made', 'Cómo se hace'));
          for (var k = 0; k < it.steps.length; k++) UI.el('div', 'step', pane, (k + 1) + '. ' + pick(it.steps[k]));
        };
        layer.rows = rows;
        layer.pane = pane;
        pane.paint(rows[0]);
      },
      focused: function (node, i) {
        var layer = node.parentNode && node.parentNode.parentNode;
        if (layer && layer.rows && layer.rows[i]) layer.pane.paint(layer.rows[i]);
      }
    });
  }

  // MARK: - The shopping list

  function shop() {
    var store = load(), week = thisWeek(store), ids = [];
    for (var i = 0; i < week.length; i++) ids.push(week[i].id);
    var list = shopping(ids);
    UI.open({
      cls: 'bt-table ln-shopping',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'tg-top', layer), tr('Lista de compras', 'Shopping list', 'Lista de la compra'),
          ids.length ? say('Para os {n} lanches escolhidos nesta semana. Confira o que já tem em casa.', 'For the {n} lunches picked this week. Check what\'s already in the cupboard.', 'Para los {n} almuerzos elegidos esta semana. Mira lo que ya tienes en casa.', ids.length)
            : tr('Ninguém escolheu ainda. A lista aparece quando escolherem.', 'Nobody has picked yet. The list shows up once they have.', 'Nadie ha elegido aún. La lista aparece cuando elijan.'));
        var cols = UI.el('div', 'ln-buy', layer), per = Math.ceil(list.length / 3) || 1;
        for (var c = 0; c < 3; c++) {
          var col = UI.el('div', 'col', cols);
          for (var j = c * per; j < Math.min(list.length, (c + 1) * per); j++) UI.el('div', 'item', col, '○  ' + pick(FOOD[list[j].id]));
        }
        var foot = UI.el('div', 'tg-foot low', layer);
        api.add(UI.button(foot, tr('Pronto', 'Done', 'Listo'), null, 'primary'), function () { api.close(); }, {first: true});
      }
    });
  }

  return {open: open, rules: {IDEAS: IDEAS, FOOD: FOOD, DAYS: DAYS, WEEK: WEEK, deckFor: deckFor, record: record, favourites: favourites,
    thisWeek: thisWeek, shopping: shopping, cookList: cookList, load: load, save: save}};
})();
