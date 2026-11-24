/*
 * Warm notes on Who's watching (ADR 0066, shuffled by ADR 0072): one kind line at a time, for one person at a time,
 * so the screen says something lovely while somebody picks. The twin is WarmNotes.java: change one, change both.
 *
 * Shuffled, and still fair: everyone gets a turn before anybody gets a second, but in a new order each round, and
 * never the same person twice in a row. Each person's line is picked at random from their own kind lines, skipping
 * the ones they saw lately and the tone of the note just before, so it never says the same thing back to back. The
 * caller keeps the memory between visits, so opening the screen again carries on instead of starting over.
 *
 * Every kid draws from the same kind lines, so no child is ever singled out over another. A kid at kindy, school or
 * college also gets lines about that, and an award a grown-up gave them in Beyond Family gets lines of its own (and
 * comes up more often while it's new). "{n}" is the person, "{g}" a grown-up of the house, never invented.
 */
var Warm = (function () {
  'use strict';

  var KINDY = 'kindy', SCHOOL = 'school', COLLEGE = 'college';
  /** How many lines the memory keeps, so a line doesn't come back for a good while. */
  var REMEMBER = 60;

  // Each line: a tone (Love, Proud, Fun, Cheer), then the words in Portuguese, English, Spanish, German and Russian.
  var KID = [
    ['L', 'Sua família te ama muito, {n}', 'Your family loves you heaps, {n}', 'Tu familia te quiere muchísimo, {n}',
      'Deine Familie hat dich riesig lieb, {n}', 'Твоя семья очень тебя любит, {n}'],
    ['P', 'Temos muito orgulho de você, {n}', "We're so proud of you, {n}", 'Estamos muy orgullosos de ti, {n}',
      'Wir sind so stolz auf dich, {n}', 'Мы так гордимся тобой, {n}'],
    ['L', 'Você deixa esta casa mais feliz, {n}', 'You make this home brighter, {n}', 'Haces este hogar más alegre, {n}',
      'Mit dir ist unser Zuhause heller, {n}', 'С тобой наш дом светлее, {n}'],
    ['P', 'Gentil, esperto e corajoso: assim é você, {n}', "Kind, clever and brave, that's you, {n}", 'Amable, listo y valiente, así eres tú, {n}',
      'Lieb, klug und mutig, das bist du, {n}', 'Добрый, умный и смелый, это ты, {n}'],
    ['L', 'Um abraço bem grande para você hoje, {n}', 'A great big hug for you today, {n}', 'Un abrazo enorme para ti hoy, {n}',
      'Eine riesige Umarmung für dich heute, {n}', 'Крепко обнимаем тебя сегодня, {n}'],
    ['F', 'Seu sorriso ilumina a sala, {n}', 'Your smile lights up the room, {n}', 'Tu sonrisa ilumina la sala, {n}',
      'Dein Lächeln macht den ganzen Raum hell, {n}', 'Твоя улыбка освещает комнату, {n}'],
    ['F', 'Toca aqui, {n}!', 'High five, {n}!', '¡Choca esos cinco, {n}!', 'Gib mir fünf, {n}!', 'Дай пять, {n}!'],
    ['F', 'Você é uma estrela, {n}', "You're a superstar, {n}", 'Eres una superestrella, {n}', 'Du bist ein Superstar, {n}', 'Ты суперзвезда, {n}'],
    ['P', 'Não existe ninguém igual a você, {n}', "There's nobody quite like you, {n}", 'No hay nadie como tú, {n}',
      'Es gibt niemanden wie dich, {n}', 'Таких, как ты, больше нет, {n}'],
    ['C', 'Cada dia você fica um pouco mais corajoso, {n}', 'Every day you grow a little braver, {n}', 'Cada día eres un poco más valiente, {n}',
      'Jeden Tag wirst du ein bisschen mutiger, {n}', 'С каждым днём ты всё смелее, {n}'],
    ['C', 'Hoje vai ser um ótimo dia, {n}', "Today's going to be a great day, {n}", 'Hoy va a ser un gran día, {n}',
      'Heute wird ein toller Tag, {n}', 'Сегодня будет отличный день, {n}']
  ];
  /** One for each grown-up of the house, so every one of them gets to say it. */
  var LOVED_BY = ['L', '{g} te ama, {n}', '{g} loves you, {n}', '{g} te quiere, {n}', '{g} hat dich lieb, {n}', '{g} любит тебя, {n}'];
  var AT = {};
  AT[KINDY] = [
    ['C', 'Continue o ótimo trabalho na escolinha, {n}', 'Keep up the good work at kindy, {n}', 'Sigue así de bien en el kínder, {n}',
      'Mach weiter so toll im Kindergarten, {n}', 'Так держать в садике, {n}'],
    ['P', 'Você está aprendendo tanto na escolinha, {n}', "You're learning so much at kindy, {n}", 'Estás aprendiendo muchísimo en el kínder, {n}',
      'Du lernst so viel im Kindergarten, {n}', 'Ты столькому учишься в садике, {n}'],
    ['F', 'A escolinha tem sorte de ter você, {n}', 'Kindy is lucky to have you, {n}', 'El kínder tiene suerte de tenerte, {n}',
      'Der Kindergarten hat Glück mit dir, {n}', 'Садику повезло с тобой, {n}']
  ];
  AT[SCHOOL] = [
    ['P', 'Você está indo muito bem na escola, {n}', "You're doing amazing at school, {n}", 'Lo estás haciendo genial en el cole, {n}',
      'Du machst das super in der Schule, {n}', 'Ты отлично справляешься в школе, {n}'],
    ['C', 'Continue o ótimo trabalho na escola, {n}', 'Keep up the great work at school, {n}', 'Sigue con el buen trabajo en el cole, {n}',
      'Mach weiter so in der Schule, {n}', 'Так держать в школе, {n}'],
    ['L', 'Adoramos ouvir sobre o seu dia na escola, {n}', 'We love hearing about your school day, {n}', 'Nos encanta oír cómo te fue en el cole, {n}',
      'Wir hören so gern von deinem Schultag, {n}', 'Нам так нравится слушать про твой день в школе, {n}']
  ];
  AT[COLLEGE] = [
    ['P', 'Orgulho de como você se esforça na escola, {n}', 'Proud of how hard you work at college, {n}', 'Orgullosos de lo mucho que te esfuerzas en el instituto, {n}',
      'Stolz, wie fleißig du in der Schule bist, {n}', 'Гордимся тем, как ты стараешься в школе, {n}'],
    ['C', 'Você consegue, {n}. Estamos com você', "You've got this, {n}. We're right behind you", 'Tú puedes, {n}. Estamos contigo',
      'Du schaffst das, {n}. Wir stehen hinter dir', 'У тебя всё получится, {n}. Мы с тобой'],
    ['L', 'Orgulho da pessoa que você está se tornando, {n}', "Proud of the person you're becoming, {n}", 'Orgullosos de la persona en la que te estás convirtiendo, {n}',
      'Stolz auf den Menschen, der du wirst, {n}', 'Гордимся тем, каким человеком ты становишься, {n}']
  ];
  var GROWN_UP = [
    ['L', 'Obrigado por tudo que você faz, {n}', 'Thanks for all you do, {n}', 'Gracias por todo lo que haces, {n}',
      'Danke für alles, was du tust, {n}', 'Спасибо за всё, что ты делаешь, {n}'],
    ['P', 'Você está fazendo um ótimo trabalho, {n}', "You're doing a great job, {n}", 'Lo estás haciendo genial, {n}',
      'Du machst das großartig, {n}', 'Ты отлично справляешься, {n}'],
    ['L', 'Esta família tem sorte de ter você, {n}', 'This family is lucky to have you, {n}', 'Esta familia tiene suerte de tenerte, {n}',
      'Diese Familie hat Glück, dich zu haben, {n}', 'Этой семье повезло, что ты есть, {n}'],
    ['F', 'Ponha os pés para cima, {n}. Você merece', "Put your feet up, {n}. You've earned it", 'Pon los pies en alto, {n}. Te lo has ganado',
      'Leg die Füße hoch, {n}. Du hast es dir verdient', 'Отдохни, {n}. Ты это заслужил(а)'],
    ['C', 'Tire um momento só para você hoje, {n}', 'Take a moment just for you tonight, {n}', 'Tómate un momento solo para ti hoy, {n}',
      'Nimm dir heute einen Moment nur für dich, {n}', 'Найди сегодня минутку для себя, {n}'],
    ['P', 'Você deixa esta casa feliz, {n}', 'You make this home a happy one, {n}', 'Haces de este hogar un lugar feliz, {n}',
      'Du machst dieses Zuhause zu einem glücklichen, {n}', 'С тобой в этом доме счастье, {n}']
  ];
  /** Mum (set on the TV under Manage people) is to be celebrated: her own lines, on top of the grown-ups' ones. */
  var MUM = [
    ['P', 'Rainha da casa: {n}', 'Queen of the house: {n}', 'La reina de la casa: {n}', 'Die Königin des Hauses: {n}', 'Королева этого дома: {n}'],
    ['L', 'A melhor mãe do mundo, {n}', 'Best mum in the world, {n}', 'La mejor mamá del mundo, {n}', 'Die beste Mama der Welt, {n}', 'Лучшая мама на свете, {n}'],
    ['L', 'Esta família funciona com o seu amor, {n}', 'This family runs on your love, {n}', 'Esta familia funciona con tu amor, {n}',
      'Diese Familie lebt von deiner Liebe, {n}', 'Эта семья держится на твоей любви, {n}'],
    ['F', 'Viva a rainha, {n}!', 'All hail the queen, {n}!', '¡Viva la reina, {n}!', 'Hoch lebe die Königin, {n}!', 'Да здравствует королева, {n}!'],
    ['C', 'Você merece o mundo, {n}', 'You deserve the world, {n}', 'Te mereces el mundo, {n}', 'Du verdienst die ganze Welt, {n}', 'Ты заслуживаешь весь мир, {n}'],
    ['P', 'O coração desta casa, {n}', 'The heart of this home, {n}', 'El corazón de este hogar, {n}', 'Das Herz dieses Zuhauses, {n}', 'Сердце этого дома, {n}']
  ];
  // Awards from Beyond Family: "{a}" is the award, "{g}" who gave it, "{m}" their short note.
  var AWARD = ['P', 'Você ganhou o prêmio {a}, {n}', 'You got the {a} award, {n}', 'Ganaste el premio {a}, {n}',
    'Du hast die Auszeichnung {a} bekommen, {n}', 'У тебя награда «{a}», {n}'];
  var AWARD_WOW = ['F', '{a}! Muito bem, {n}', '{a}! Well done, {n}', '¡{a}! Muy bien, {n}', '{a}! Super gemacht, {n}', '{a}! Молодец, {n}'];
  var AWARD_FROM = ['L', '{g} te deu o prêmio {a}, {n}', '{g} gave you the {a} award, {n}', '{g} te dio el premio {a}, {n}',
    '{g} hat dir die Auszeichnung {a} gegeben, {n}', 'Награда «{a}» от {g}, {n}'];
  var AWARD_NOTE = ['L', '{n}, de {g}: {m}', '{n}, from {g}: {m}', '{n}, de {g}: {m}', '{n}, von {g}: {m}', '{n}, от {g}: {m}'];

  function lang(l) { return l === 'pt' ? 1 : l === 'es' ? 3 : l === 'de' ? 4 : l === 'ru' ? 5 : 2; }
  function clean(s) { return String(s || '').replace(/[{}]/g, '').trim(); }

  /** Everything that could be said to this person: [{key, tone, text}], always in the same order. */
  function lines(p, people, l) {
    var out = [], i;
    function add(key, line, fill) {
      var t = line[l];
      for (var f in fill) if (fill.hasOwnProperty(f)) t = t.split('{' + f + '}').join(fill[f]);
      out.push({key: key, tone: line[0], text: t.split('{n}').join(p.name)});
    }
    if (!p.kid) {
      if (p.parent === 'mum') for (i = 0; i < MUM.length; i++) add('m' + i, MUM[i], {});
      for (i = 0; i < GROWN_UP.length; i++) add('g' + i, GROWN_UP[i], {});
      return out;
    }
    for (i = 0; i < KID.length; i++) add('k' + i, KID[i], {});
    var at = AT[p.stage] || [];
    for (i = 0; i < at.length; i++) add(p.stage + i, at[i], {});
    for (i = 0; i < people.length; i++) {
      if (!people[i].kid && people[i].name) add('by:' + people[i].name, LOVED_BY, {g: people[i].name});
    }
    return out;
  }

  /** The lines about a person's awards, newest first. Only for awards that came with a name. */
  function awardLines(p, l) {
    var out = [], list = p.awards || [];
    for (var i = 0; i < list.length && i < 3; i++) {
      var a = clean(list[i].title), g = clean(list[i].from), m = clean(list[i].note);
      if (!a) continue;
      var fill = {a: a, g: g, m: m};
      var kinds = [['aw', AWARD], ['wow', AWARD_WOW]];
      if (g) kinds.push(['from', AWARD_FROM]);
      if (g && m) kinds.push(['note', AWARD_NOTE]);
      for (var j = 0; j < kinds.length; j++) {
        var t = kinds[j][1][l];
        for (var f in fill) if (fill.hasOwnProperty(f)) t = t.split('{' + f + '}').join(fill[f]);
        out.push({key: 'a:' + a + ':' + kinds[j][0], tone: kinds[j][1][0], text: t.split('{n}').join(p.name)});
      }
    }
    return out;
  }

  /** An empty memory. Keep it between visits (it's small and has only first names in it). */
  function memory() { return {bag: [], recent: [], last: '', tone: ''}; }

  /**
   * The next note: {who, text}, who being an index into people ({name, kid, stage, parent, awards: [{title, from, note}]},
   * Family left out). memory is changed in place; rand gives numbers from 0 up to 1 (Math.random on the TV).
   * null for nobody.
   */
  function next(people, mem, rand, language) {
    var n = people ? people.length : 0;
    if (!n) return null;
    var l = lang(language), i, names = [];
    for (i = 0; i < n; i++) names.push(people[i].name);
    mem.bag = (mem.bag || []).filter(function (x) { return names.indexOf(x) >= 0; });
    mem.recent = mem.recent || [];
    if (!mem.bag.length) {
      // A new round: everyone once, in a fresh order, and not starting with whoever went last.
      var bag = names.slice();
      for (i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1)), t = bag[i];
        bag[i] = bag[j];
        bag[j] = t;
      }
      if (bag.length > 1 && bag[0] === mem.last) { t = bag[0]; bag[0] = bag[1]; bag[1] = t; }
      mem.bag = bag;
    }
    var name = mem.bag.shift(), who = names.indexOf(name), p = people[who];
    // A fresh award comes up about half the time, the rest of the time it's one of the everyday lines.
    var won = awardLines(p, l);
    var pool = won.length && rand() < 0.5 ? won : lines(p, people, l).concat(won);
    var fresh = pool.filter(function (x) { return mem.recent.indexOf(name + '|' + x.key) < 0; });
    if (!fresh.length) fresh = pool;
    var toned = fresh.filter(function (x) { return x.tone !== mem.tone; });
    if (toned.length) fresh = toned;
    var pick = fresh[Math.min(fresh.length - 1, Math.floor(rand() * fresh.length))];
    mem.recent.push(name + '|' + pick.key);
    if (mem.recent.length > REMEMBER) mem.recent.splice(0, mem.recent.length - REMEMBER);
    mem.last = name;
    mem.tone = pick.tone;
    return {who: who, text: pick.text};
  }

  /**
   * Who's watching order: grown-ups first with Mum leading, then the kids, and visitors from other homes after the
   * household. Otherwise the order people came in (a stable sort), so nobody jumps about.
   */
  function rank(p) { return (p.visitor ? 3 : 0) + (p.kid ? 2 : p.parent === 'mum' ? 0 : 1); }
  function order(people) {
    var out = people.map(function (p, i) { return {p: p, i: i}; });
    out.sort(function (a, b) { return rank(a.p) - rank(b.p) || a.i - b.i; });
    return out.map(function (x) { return x.p; });
  }

  /** The award to show under a kid's name on Who's watching: their newest, if it's from the last fortnight. */
  function badge(p, today) {
    var a = p && p.awards && p.awards[0];
    if (!a || !clean(a.title)) return '';
    if (a.on && today && daysBetween(a.on, today) > 14) return '';
    return (clean(a.emoji) || '🏅') + ' ' + clean(a.title);
  }
  function daysBetween(a, b) {
    var x = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)), y = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
    return Math.round((y - x) / 86400000);
  }

  return {KINDY: KINDY, SCHOOL: SCHOOL, COLLEGE: COLLEGE, next: next, memory: memory, order: order, badge: badge};
})();
