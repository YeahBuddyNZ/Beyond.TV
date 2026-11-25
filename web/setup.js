/*
 * Getting started (ADR 0077): the first time the home screen comes up on a new TV, three big-button questions with
 * the remote (where you live, who watches, the te reo word of the day), then the Drop Sky check as a code to scan
 * with a phone. Nothing technical, nothing typed, and the answers can be changed later in Beyond™ TV Settings.
 * Same steps as SetupActivity.java.
 *
 * Plain ES5, like the rest of web/.
 */
var Setup = (function () {
  'use strict';

  var DONE = 'btv.setup';
  /** New Zealand's main towns and cities: name, latitude, longitude. Same list as CITIES in SetupActivity.java. */
  var CITIES = [
    ['Auckland', '-36.8485', '174.7633'], ['Wellington', '-41.2865', '174.7762'],
    ['Christchurch', '-43.5321', '172.6362'], ['Hamilton', '-37.7870', '175.2793'],
    ['Tauranga', '-37.6878', '176.1651'], ['Dunedin', '-45.8788', '170.5028'],
    ['Palmerston North', '-40.3523', '175.6082'], ['Napier', '-39.4928', '176.9120'],
    ['Nelson', '-41.2706', '173.2840'], ['Rotorua', '-38.1368', '176.2497'],
    ['New Plymouth', '-39.0556', '174.0752'], ['Whangārei', '-35.7251', '174.3237'],
    ['Invercargill', '-46.4132', '168.3538'], ['Queenstown', '-45.0312', '168.6626'],
    ['Gisborne', '-38.6623', '178.0176'], ['Whanganui', '-39.9301', '175.0479']];
  var CHECK = 'gobeyond.nz/tv/check';

  function has(k) { try { return localStorage.getItem(k) !== null; } catch (e) { return true; } }
  function mark(v) { try { localStorage.setItem(DONE, v || '1'); } catch (e) {} }

  // A TV that used Beyond TV before this screen came (an update) never sees it. Read now, before the home screen
  // writes anything of its own.
  var existing = has('btv.checkin') || has('btv.prefs') || has('btv.who');
  if (existing && !has(DONE)) mark();

  function due() { return !has(DONE); }

  /** Once, after the reload a new town makes: true when the house has kids, so the people editor opens. */
  function people() {
    var v = null;
    try { v = localStorage.getItem(DONE); } catch (e) {}
    if (v !== 'people') return false;
    mark('1');
    return true;
  }

  /** Opens Getting started. done(changedPlace) runs once it closes, whichever way. */
  function start(done) {
    var at = 0, kids = false, moved = false, finished = false;
    var STEPS = 5;   // welcome, town, who, kupu, Drop Sky

    function close(api, people) {
      if (finished) return;
      finished = true;
      // A new town reloads the home screen: then the people editor opens after the reload (people()).
      mark(people && moved ? 'people' : '1');
      api.close();
      if (people && !moved && window.Profiles) Profiles.pick(true, function () {});
      if (done) done(moved);
    }

    function words(box, icon, title, sub) {
      UI.el('div', 'bt-setup-icon', box, icon);
      if (at > 0 && at < STEPS - 1) {
        UI.el('div', 'bt-setup-of', box, tr('Pergunta ' + at + ' de 3', 'Question ' + at + ' of 3', 'Pregunta ' + at + ' de 3'));
      }
      UI.el('div', 'bt-setup-title', box, title);
      UI.el('div', 'bt-setup-sub', box, sub);
    }

    // A rebuild keeps the old focus position, so each step puts it back on its own first button.
    var lead = null;
    function go(api, n) { at = n; lead = null; api.rebuild(); if (lead) api.focusNode(lead); }
    function add(api, node, run, first) {
      api.add(node, run, first ? {first: true} : null);
      if (first) lead = node;
      return node;
    }

    UI.open({
      cls: 'bt-setup',
      back: function () {
        var api = UI.top();
        if (at === 0) { close(api, false); UI.toast(laterWords()); return true; }
        go(api, at - 1);
        return true;
      },
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box bt-setup-box', layer), row;
        if (at === 0) {
          words(box, '👋', tr('Olá! Vamos deixar sua TV pronta.', "Kia ora! Let's get your TV ready.", '¡Hola! Preparemos tu tele.'),
            tr('Três perguntas rápidas. Use as setas e o OK do controle.', 'Three quick questions. Just use the arrows and OK on your remote.',
              'Tres preguntas rápidas. Usa las flechas y OK del mando.'));
          row = UI.el('div', 'bt-buttons', box);
          add(a, UI.button(row, tr('Vamos lá', "Let's go", 'Vamos'), null, 'primary big'), function () { go(a, 1); }, true);
          add(a, UI.button(row, tr('Agora não', 'Not now', 'Ahora no'), null, 'big'), function () { close(a, false); UI.toast(laterWords()); });
        } else if (at === 1) {
          words(box, '📍', tr('Onde você mora?', 'Where do you live?', '¿Dónde vives?'),
            tr('Para o tempo e o céu de hoje à noite. Escolha a cidade mais perto.', "For your weather and tonight's sky. Pick the closest one.",
              'Para el tiempo y el cielo de esta noche. Elige la más cercana.'));
          var now = (window.Place && Place.city) || '';
          var grid = UI.el('div', 'bt-setup-towns', box);
          for (var i = 0; i < CITIES.length; i++) {
            (function (c) {
              var here = c[0].toLowerCase() === now.toLowerCase();
              add(a, UI.button(grid, (here ? '✓  ' : '') + c[0], null, 'town' + (here ? ' primary' : '')), function () {
                Prefs.set('place', {city: c[0], lat: c[1], lon: c[2]});
                moved = !here;
                go(a, 2);
              }, here || i === 0);
            })(CITIES[i]);
          }
          row = UI.el('div', 'bt-buttons', box);
          add(a, UI.button(row, tr('Outro lugar', 'Somewhere else', 'Otro lugar'), null, 'big'), function () {
            UI.toast(tr('Sem problema: o fuso horário da TV escolhe a cidade.', "No worries: we'll go by the TV's time zone.",
              'Sin problema: la zona horaria de la tele elige la ciudad.'));
            go(a, 2);
          });
        } else if (at === 2) {
          words(box, '🏠', tr('Quem assiste esta TV?', 'Who watches this TV?', '¿Quién ve esta tele?'),
            tr('Com crianças, cada um ganha o seu próprio Início, e as crianças só veem apps para a idade delas.',
              'With kids, everyone gets their own home screen, and kids only see apps for their age.',
              'Con niños, cada uno tiene su propio inicio, y los niños solo ven apps para su edad.'));
          row = UI.el('div', 'bt-buttons', box);
          add(a, UI.button(row, tr('Só adultos', 'Just grown-ups', 'Solo adultos'), null, 'big' + (kids ? '' : ' primary')),
            function () { kids = false; go(a, 3); }, !kids);
          add(a, UI.button(row, tr('Adultos e crianças', 'Grown-ups and kids', 'Adultos y niños'), null, 'big' + (kids ? ' primary' : '')),
            function () { kids = true; go(a, 3); }, kids);
        } else if (at === 3) {
          words(box, '🌿', tr('Uma palavra em te reo Māori por dia?', 'A te reo Māori word each day?', '¿Una palabra en te reo maorí al día?'),
            tr('Uma palavra nova no Início todos os dias, a mesma em todas as TVs da casa.',
              'A new word on the home screen every day, the same on every TV in the house.',
              'Una palabra nueva en el inicio cada día, la misma en todas las teles de la casa.'));
          row = UI.el('div', 'bt-buttons', box);
          var on = Prefs.kupu();
          add(a, UI.button(row, tr('Sim, por favor', 'Yes please', 'Sí, por favor'), null, 'big primary'),
            function () { Prefs.set('kupu', true); go(a, 4); }, on);
          add(a, UI.button(row, tr('Não, obrigado', 'No thanks', 'No, gracias'), null, 'big'),
            function () { Prefs.set('kupu', false); go(a, 4); }, !on);
        } else {
          var side = UI.el('div', 'bt-setup-sky', box);
          var left = UI.el('div', 'bt-setup-words', side);
          UI.el('div', 'bt-setup-title', left, tr('Tudo pronto! E dá para largar a Sky?', 'All set! Now, could you drop Sky?', '¡Todo listo! ¿Y podrías dejar Sky?'));
          UI.el('div', 'bt-setup-sub', left, tr('Aponte a câmera do celular para o código. Em dois minutos você vê o que assiste de graça ou mais barato sem a Sky.',
            "Point your phone's camera at the code. In two minutes you'll see which of your shows are free or cheaper without Sky.",
            'Apunta la cámara del móvil al código. En dos minutos verás qué ves gratis o más barato sin Sky.'));
          UI.el('div', 'bt-setup-address', left, tr('Ou abra ', 'Or open ', 'O abre ') + CHECK);
          row = UI.el('div', 'bt-buttons', left);
          add(a, UI.button(row, '✓  ' + (kids ? tr('Adicionar a família', 'Add the family', 'Añadir a la familia')
            : tr('Ir para o Início', 'Show my home screen', 'Ir al inicio')), null, 'big primary'), function () { close(a, kids); }, true);
          var qr = UI.el('img', 'bt-setup-qr', side);
          qr.src = 'icons/tv-check-qr.svg';
          qr.alt = CHECK;
        }
      }
    });
  }

  function laterWords() {
    return tr('Sem problema. Está tudo em Ajustes do Beyond™ TV.', "No worries. It's all in Beyond™ TV Settings, whenever you like.",
      'Sin problema. Está todo en Ajustes de Beyond™ TV.');
  }

  return {due: due, start: start, people: people, CITIES: CITIES};
})();
