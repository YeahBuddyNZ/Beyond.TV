/*
 * Warm notes on Who's watching (ADR 0066): one kind line at a time, for one person at a time, so the screen says
 * something lovely while somebody picks. The twin is WarmNotes.java: change one, change both.
 *
 * Fair by design: everyone gets a turn in order before anybody gets a second, and every kid draws from the same kind
 * lines, so no child is ever singled out over another. A kid at kindy, school or college also gets lines about that.
 * "{n}" is the person, "{g}" a grown-up of the house (each in turn), never invented.
 */
var Warm = (function () {
  'use strict';

  var KINDY = 'kindy', SCHOOL = 'school', COLLEGE = 'college';

  // Each line in Portuguese, English, Spanish, German and Russian, in that order.
  var KID = [
    ['Sua família te ama muito, {n}', 'Your family loves you heaps, {n}', 'Tu familia te quiere muchísimo, {n}',
      'Deine Familie hat dich riesig lieb, {n}', 'Твоя семья очень тебя любит, {n}'],
    ['Temos muito orgulho de você, {n}', "We're so proud of you, {n}", 'Estamos muy orgullosos de ti, {n}',
      'Wir sind so stolz auf dich, {n}', 'Мы так гордимся тобой, {n}'],
    ['Você deixa esta casa mais feliz, {n}', 'You make this home brighter, {n}', 'Haces este hogar más alegre, {n}',
      'Mit dir ist unser Zuhause heller, {n}', 'С тобой наш дом светлее, {n}'],
    ['Gentil, esperto e corajoso: assim é você, {n}', "Kind, clever and brave, that's you, {n}", 'Amable, listo y valiente, así eres tú, {n}',
      'Lieb, klug und mutig, das bist du, {n}', 'Добрый, умный и смелый, это ты, {n}'],
    ['Um abraço bem grande para você hoje, {n}', 'A great big hug for you today, {n}', 'Un abrazo enorme para ti hoy, {n}',
      'Eine riesige Umarmung für dich heute, {n}', 'Крепко обнимаем тебя сегодня, {n}']
  ];
  /** Only when the house has a grown-up to name. */
  var LOVED_BY = ['{g} te ama, {n}', '{g} loves you, {n}', '{g} te quiere, {n}', '{g} hat dich lieb, {n}', '{g} любит тебя, {n}'];
  var AT = {};
  AT[KINDY] = [
    ['Continue o ótimo trabalho na escolinha, {n}', 'Keep up the good work at kindy, {n}', 'Sigue así de bien en el kínder, {n}',
      'Mach weiter so toll im Kindergarten, {n}', 'Так держать в садике, {n}'],
    ['Você está aprendendo tanto na escolinha, {n}', "You're learning so much at kindy, {n}", 'Estás aprendiendo muchísimo en el kínder, {n}',
      'Du lernst so viel im Kindergarten, {n}', 'Ты столькому учишься в садике, {n}']
  ];
  AT[SCHOOL] = [
    ['Você está indo muito bem na escola, {n}', "You're doing amazing at school, {n}", 'Lo estás haciendo genial en el cole, {n}',
      'Du machst das super in der Schule, {n}', 'Ты отлично справляешься в школе, {n}'],
    ['Continue o ótimo trabalho na escola, {n}', 'Keep up the great work at school, {n}', 'Sigue con el buen trabajo en el cole, {n}',
      'Mach weiter so in der Schule, {n}', 'Так держать в школе, {n}']
  ];
  AT[COLLEGE] = [
    ['Orgulho de como você se esforça na escola, {n}', 'Proud of how hard you work at college, {n}', 'Orgullosos de lo mucho que te esfuerzas en el instituto, {n}',
      'Stolz, wie fleißig du in der Schule bist, {n}', 'Гордимся тем, как ты стараешься в школе, {n}'],
    ['Você consegue, {n}. Estamos com você', "You've got this, {n}. We're right behind you", 'Tú puedes, {n}. Estamos contigo',
      'Du schaffst das, {n}. Wir stehen hinter dir', 'У тебя всё получится, {n}. Мы с тобой']
  ];
  var GROWN_UP = [
    ['Obrigado por tudo que você faz, {n}', 'Thanks for all you do, {n}', 'Gracias por todo lo que haces, {n}',
      'Danke für alles, was du tust, {n}', 'Спасибо за всё, что ты делаешь, {n}'],
    ['Você está fazendo um ótimo trabalho, {n}', "You're doing a great job, {n}", 'Lo estás haciendo genial, {n}',
      'Du machst das großartig, {n}', 'Ты отлично справляешься, {n}'],
    ['Esta família tem sorte de ter você, {n}', 'This family is lucky to have you, {n}', 'Esta familia tiene suerte de tenerte, {n}',
      'Diese Familie hat Glück, dich zu haben, {n}', 'Этой семье повезло, что ты есть, {n}']
  ];

  function lang(l) { return l === 'pt' ? 0 : l === 'es' ? 2 : l === 'de' ? 3 : l === 'ru' ? 4 : 1; }
  function mod(a, b) { return ((a % b) + b) % b; }

  /**
   * The note for this step: {who, text}, who being an index into people ({name, kid, stage}, Family left out).
   * step counts up by one for each note; day changes once a day, so the lines move on daily. null for nobody.
   */
  function next(people, step, day, language) {
    var n = people ? people.length : 0;
    if (!n) return null;
    step = Math.max(0, step | 0);
    var who = step % n, round = Math.floor(step / n), l = lang(language), p = people[who];
    if (!p.kid) return {who: who, text: GROWN_UP[mod(round + day + who, GROWN_UP.length)][l].replace('{n}', p.name)};
    var grown = [];
    for (var i = 0; i < n; i++) if (!people[i].kid) grown.push(people[i].name);
    var at = AT[p.stage] || [];
    var pool = KID.length + at.length + (grown.length ? 1 : 0);
    var pick = mod(round + day + who, pool), text;
    if (pick < KID.length) text = KID[pick][l];
    else if (pick < KID.length + at.length) text = at[pick - KID.length][l];
    else text = LOVED_BY[l].replace('{g}', grown[mod(round + who, grown.length)]);
    return {who: who, text: text.replace('{n}', p.name)};
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

  return {KINDY: KINDY, SCHOOL: SCHOOL, COLLEGE: COLLEGE, next: next, order: order};
})();
