/*
 * The family wall and to-dos (ADR 0067): Beyond Family's wall on the TV, and each person's own to-dos for today, ticked
 * off with the remote alone.
 *
 * The to-dos are the jobs a grown-up gave each person in Beyond Family. OK ticks one: Beyond Family hears at once (the
 * same tick as on a phone, so the parents' jobs page catches up), it is a star to spend at the Star Stall in Candy Land
 * and a point on the family scoreboard (Chores.give). OK again unticks it and takes the star back.
 * The wall is the stickies that are up and the week's wins (jobs done, green time, see-and-do bonuses, a few with
 * photos). Anyone can put a sticky up from here with the remote: a quick one, or typed, signed with their first name.
 * It also shows on the home screen (Today at home) and the screensaver, one thing at a time.
 *
 * Nothing is kept on the TV but the stars. LG and Samsung read Family (family.js); Google TV runs this same file in
 * TableActivity's WebView (start "wall"), where BeyondTable.wall(), tick() and sticky() stand in for it.
 * The screen itself is laid out like Family HQ in Beyond Family (ADR 0079): the household's lists (OK ticks, Add types a new
 * one), the week's menu, the notes, this week's activities and the month calendar, in the family's own layout.
 * Words in all five languages, like chores.js. Plain ES5.
 */
var Wall = (function () {
  'use strict';

  var LANG = {pt: 0, en: 1, es: 2, de: 3, ru: 4};
  function L(t) { return t[LANG[window.I18N ? I18N.lang : 'en']] || t[1]; }
  function fill(t, n) { return L(t).replace('{n}', n); }

  // MARK: - Words

  var TITLE = ['Mural da família', 'Family wall', 'Muro de la familia', 'Familienwand', 'Семейная стена'];
  var SUB = ['As tarefas de hoje e o que está no mural. OK marca uma: cada uma vale uma estrela.',
    'Today\'s to-dos and what\'s up on the wall. OK ticks one off: each is a star for the Star Stall.',
    'Las tareas de hoy y lo que hay en el muro. OK marca una: cada una es una estrella.',
    'Die Aufgaben von heute und was an der Wand hängt. OK hakt eine ab: jede ist ein Stern.',
    'Дела на сегодня и что на стене. OK отмечает дело: за каждое звезда.'];
  var TODOS = ['Tarefas de hoje', 'To-dos today', 'Tareas de hoy', 'Aufgaben heute', 'Дела на сегодня'];
  var ON_WALL = ['No mural', 'On the wall', 'En el muro', 'An der Wand', 'На стене'];
  var LEFT = ['Faltam {n}', '{n} to go', 'Quedan {n}', 'Noch {n}', 'Осталось: {n}'];
  var ALL = ['Tudo feito hoje!', 'All done today!', '¡Todo hecho hoy!', 'Heute alles erledigt!', 'На сегодня всё!'];
  var STARS = ['{n} estrelas', '{n} stars', '{n} estrellas', '{n} Sterne', 'Звёзд: {n}'];
  var ONE_STAR = ['1 estrela', '1 star', '1 estrella', '1 Stern', '1 звезда'];
  var NONE_TODOS = ['Nenhuma tarefa ainda. Um adulto dá tarefas para cada um no Beyond Family, em Tarefas, e elas aparecem aqui.',
    'No to-dos yet. A grown-up gives each person jobs in Beyond Family, under Jobs, and they show up here to tick off.',
    'Aún no hay tareas. Un adulto da tareas a cada uno en Beyond Family, en Tareas, y aparecen aquí.',
    'Noch keine Aufgaben. Ein Erwachsener gibt jedem in Beyond Family unter Aufgaben welche, dann stehen sie hier.',
    'Дел пока нет. Взрослый даёт дела каждому в Beyond Family, в разделе Дела, и они появятся здесь.'];
  var NONE_WALL = ['O mural está vazio. Coloque um recado com o botão abaixo.', 'The wall is empty. Put a sticky up with the button below.',
    'El muro está vacío. Pon una nota con el botón de abajo.', 'Die Wand ist leer. Häng unten einen Zettel auf.', 'Стена пуста. Повесьте записку кнопкой ниже.'];
  var STICKY = ['Colocar um recado', 'Put up a sticky', 'Poner una nota', 'Zettel aufhängen', 'Повесить записку'];
  var STICKY_SUB = ['Escolha um rápido ou escreva o seu. Vai com o seu nome.', 'Pick a quick one or type your own. It goes up with your name.',
    'Elige una rápida o escribe la tuya. Va con tu nombre.', 'Nimm einen schnellen oder schreib deinen eigenen. Er hängt mit deinem Namen.',
    'Выберите готовую или напишите свою. Она будет с вашим именем.'];
  var PUT_UP = ['Colocar', 'Put it up', 'Poner', 'Aufhängen', 'Повесить'];
  var PUT = ['Recado no mural!', 'It\'s up on the wall!', '¡Está en el muro!', 'Hängt an der Wand!', 'Записка на стене!'];
  var TYPE_SOMETHING = ['Escreva algo primeiro.', 'Type something first.', 'Escribe algo primero.', 'Schreib zuerst etwas.', 'Сначала напишите что-нибудь.'];
  var OFFLINE = ['Não deu para falar com o Beyond Family. Tente de novo.', 'Couldn\'t reach Beyond Family. Try again.',
    'No se pudo conectar con Beyond Family. Inténtalo de nuevo.', 'Beyond Family war nicht erreichbar. Versuch es nochmal.', 'Не удалось связаться с Beyond Family. Попробуйте ещё раз.'];
  var UNDONE = ['Desmarcado.', 'Unticked.', 'Desmarcado.', 'Zurückgenommen.', 'Отметка снята.'];
  var CHEER = [['Uma estrela para você!', 'A star for you!', '¡Una estrella para ti!', 'Ein Stern für dich!', 'Звезда твоя!'],
    ['Ka pai! Muito bem!', 'Ka pai! Nice work!', '¡Ka pai! ¡Buen trabajo!', 'Ka pai! Gut gemacht!', 'Ка пай! Отлично!'],
    ['Feito!', 'Done and dusted!', '¡Hecho!', 'Erledigt!', 'Сделано!']];
  var ALL_CHEER = ['Tudo feito, {n}! Que orgulho.', 'All done, {n}! Ka rawe.', '¡Todo hecho, {n}! Qué orgullo.', 'Alles erledigt, {n}! Super.', 'Всё сделано, {n}! Молодец.'];
  var SPEND = ['Gastar na Terra dos Doces', 'Spend in Candy Land', 'Gastar en la Tierra de los Dulces', 'Im Zuckerland ausgeben', 'Потратить в Сладкой стране'];
  var SCOREBOARD = ['Placar da família', 'Family scoreboard', 'Marcador familiar', 'Familien-Punktetafel', 'Семейная таблица очков'];
  var CLOSE = ['Fechar', 'Close', 'Cerrar', 'Schließen', 'Закрыть'];
  var CANCEL = ['Cancelar', 'Cancel', 'Cancelar', 'Abbrechen', 'Отмена'];
  var SPACE = ['Espaço', 'Space', 'Espacio', 'Leertaste', 'Пробел'];
  var TYPE_HERE = ['Escreva aqui', 'Type here', 'Escribe aquí', 'Hier tippen', 'Пишите здесь'];
  var WIN_KIND = {
    job: ['Feito', 'Done', 'Hecho', 'Erledigt', 'Сделано'],
    green: ['Lá fora', 'Outside', 'Afuera', 'Draußen', 'На улице'],
    bonus: ['Sem ninguém pedir', 'Without being asked', 'Sin que nadie lo pida', 'Ungefragt', 'Без просьбы'],
    award: ['Prêmio', 'Award', 'Premio', 'Auszeichnung', 'Награда']
  };
  var QUICK = [
    ['Te amo!', 'Love you!', '¡Te quiero!', 'Hab dich lieb!', 'Люблю тебя!'],
    ['O jantar está pronto', 'Tea\'s ready', 'La cena está lista', 'Essen ist fertig', 'Ужин готов'],
    ['Muito orgulho de você', 'So proud of you', 'Muy orgulloso de ti', 'Bin so stolz auf dich', 'Я так горжусь тобой'],
    ['Obrigado!', 'Thank you!', '¡Gracias!', 'Danke!', 'Спасибо!'],
    ['Volto já', 'Back soon', 'Vuelvo pronto', 'Bin gleich zurück', 'Скоро вернусь'],
    ['Bom dia, família!', 'Mōrena, whānau!', '¡Buenos días, familia!', 'Guten Morgen, Familie!', 'Доброе утро, семья!']
  ];
  var COLOURS = [{id: 'ember', hex: '#E8A33D'}, {id: 'moss', hex: '#2F7D6D'}, {id: 'ink', hex: '#22221F'}];

  // Family HQ's own words (ADR 0079), as Beyond Family shows them.
  var TO_DO = ['Para fazer', 'To do', 'Por hacer', 'Zu tun', 'Сделать'];
  var WOULD_LOVE = ['Seria ótimo', 'Would love', 'Nos encantaría', 'Hätten gern', 'Хотелось бы'];
  var BROKEN = ['Isto quebrou', 'This is broken', 'Esto está roto', 'Das ist kaputt', 'Это сломалось'];
  var MENU = ['Cardápio', 'Menu', 'Menú', 'Speiseplan', 'Меню'];
  var NOTES = ['Notas', 'Notes', 'Notas', 'Notizen', 'Заметки'];
  var NOTES_EMPTY = ['Algo que vale lembrar...', 'Anything worth remembering...', 'Algo que valga la pena recordar...', 'Alles, was man sich merken sollte...', 'Всё, что стоит запомнить...'];
  var THIS_WEEK = ['Atividades da semana', 'This week\'s activities', 'Actividades de la semana', 'Termine dieser Woche', 'Занятия на этой неделе'];
  var WINS = ['Vitórias da semana', 'This week\'s wins', 'Logros de la semana', 'Erfolge der Woche', 'Успехи недели'];
  var NOTE = ['Recado', 'Note', 'Nota', 'Zettel', 'Записка'];
  var ADD = ['Adicionar', 'Add', 'Añadir', 'Hinzufügen', 'Добавить'];
  var ADDED = ['Na lista!', 'It\'s on the list!', '¡Está en la lista!', 'Steht auf der Liste!', 'Добавлено в список!'];
  var ADD_TODO = ['Adicionar uma tarefa...', 'Add a to-do...', 'Añadir una tarea...', 'Aufgabe hinzufügen...', 'Добавить дело...'];
  var ADD_WISH = ['Água filtrada, luzes lá fora...', 'Filtered water, outside lights...', 'Agua filtrada, luces de fuera...', 'Wasserfilter, Außenlicht...', 'Фильтр для воды, свет во дворе...'];
  var ADD_BROKEN = ['O que precisa de conserto?', 'What needs fixing?', '¿Qué hay que arreglar?', 'Was muss repariert werden?', 'Что нужно починить?'];
  var MORE = ['Mais {n}', '{n} more', '{n} más', '{n} weitere', 'Ещё {n}'];
  var DAYS = [['Seg', 'Mon', 'Lun', 'Mo', 'Пн'], ['Ter', 'Tue', 'Mar', 'Di', 'Вт'], ['Qua', 'Wed', 'Mié', 'Mi', 'Ср'], ['Qui', 'Thu', 'Jue', 'Do', 'Чт'],
    ['Sex', 'Fri', 'Vie', 'Fr', 'Пт'], ['Sáb', 'Sat', 'Sáb', 'Sa', 'Сб'], ['Dom', 'Sun', 'Dom', 'So', 'Вс']];
  var MONTHS = [['Janeiro', 'January', 'Enero', 'Januar', 'Январь'], ['Fevereiro', 'February', 'Febrero', 'Februar', 'Февраль'],
    ['Março', 'March', 'Marzo', 'März', 'Март'], ['Abril', 'April', 'Abril', 'April', 'Апрель'], ['Maio', 'May', 'Mayo', 'Mai', 'Май'],
    ['Junho', 'June', 'Junio', 'Juni', 'Июнь'], ['Julho', 'July', 'Julio', 'Juli', 'Июль'], ['Agosto', 'August', 'Agosto', 'August', 'Август'],
    ['Setembro', 'September', 'Septiembre', 'September', 'Сентябрь'], ['Outubro', 'October', 'Octubre', 'Oktober', 'Октябрь'],
    ['Novembro', 'November', 'Noviembre', 'November', 'Ноябрь'], ['Dezembro', 'December', 'Diciembre', 'Dezember', 'Декабрь']];
  var AFFIRM = [['Você é incrível', 'You are amazing', 'Eres increíble', 'Du bist großartig', 'Ты потрясающий'],
    ['Uma coisa de cada vez', 'One thing at a time', 'Una cosa a la vez', 'Eins nach dem anderen', 'По одному делу за раз'],
    ['Você consegue', 'You\'ve got this', 'Tú puedes', 'Du schaffst das', 'У тебя получится'],
    ['Pequenas vitórias contam', 'Small wins count', 'Los pequeños logros cuentan', 'Kleine Erfolge zählen', 'Маленькие победы важны'],
    ['Seja gentil consigo', 'Be kind to yourself', 'Sé amable contigo', 'Sei gut zu dir', 'Будь добр к себе'],
    ['Hoje já basta', 'Today is enough', 'Hoy es suficiente', 'Heute reicht', 'Сегодня достаточно']];

  // MARK: - Where the wall comes from: Beyond Family here, or Google TV's app around this page

  var bridge = window.BeyondTable && window.BeyondTable.wall ? window.BeyondTable : null;
  var answers = {}, asked = 0;
  function ask(run, done) { var n = ++asked; answers[n] = done; run(n); }
  /** Google TV's app answers a tick or a sticky here: Wall.answer(n, ok). */
  function answer(n, ok) { var f = answers[n]; delete answers[n]; if (f) f(!!ok); }

  var src = {
    linked: function () { return bridge ? true : !!(window.Family && Family.linked()); },
    read: function () {
      if (bridge) { try { return JSON.parse(bridge.wall()) || {}; } catch (e) { return {}; } }
      return window.Family && Family.wall ? {wall: Family.wall(), todos: Family.todos(), name: Family.homeName ? Family.homeName() : ''} : {};
    },
    tick: function (id, member, on, done) {
      if (bridge) ask(function (n) { bridge.tick(n, id, member, on); }, done);
      else Family.tickTodo(id, member, on, done);
    },
    tickList: function (id, on, done) {
      if (bridge) ask(function (n) { bridge.listTick(n, id, on); }, done);
      else Family.tickList(id, on, done);
    },
    addToList: function (kind, text, done) {
      if (bridge) ask(function (n) { bridge.listAdd(n, kind, text); }, done);
      else Family.addToList(kind, text, done);
    },
    sticky: function (text, colour, member, done) {
      if (bridge) ask(function (n) { bridge.sticky(n, text, colour, member || ''); }, done);
      else Family.postSticky(text, colour, member, done);
    }
  };

  /** The Beyond Family member behind a profile here, or null (a TV-only profile, Family, a guest). */
  function member(p) {
    if (!p || p.together || p.guest) return null;
    if (p.family) return String(p.family);
    return typeof p.id === 'string' && p.id.indexOf('bf-') === 0 ? p.id.slice(3) : null;
  }

  // What the screens show now. Read again whenever Beyond Family's sync changed.
  var data = {wall: null, todos: {}, name: ''};
  function refresh() {
    var d = src.read();
    data = {wall: d.wall || null, todos: d.todos || {}, name: d.name || ''};
  }
  refresh();

  function todosOf(p) { var m = member(p); return m && data.todos[m] ? data.todos[m] : []; }
  /** Somebody's to-dos still to do and all of them: {left, total}. */
  function left(p) {
    var list = todosOf(p), n = 0;
    for (var i = 0; i < list.length; i++) if (!list[i].done) n++;
    return {left: n, total: list.length};
  }
  /** Stickies first (they are for now), then the wins, newest first. */
  function items() {
    var w = data.wall || {}, out = [], i;
    for (i = 0; i < (w.stickies || []).length; i++) out.push({sticky: w.stickies[i]});
    for (i = 0; i < (w.wins || []).length; i++) out.push({win: w.wins[i]});
    return out;
  }
  function count() { return items().length; }

  /** Everyone who has to-dos, the watcher first. */
  function doers() {
    var all = window.Profiles ? Profiles.list() : [], out = [];
    for (var i = 0; i < all.length; i++) if (todosOf(all[i]).length) out.push(all[i]);
    return out;
  }

  // MARK: - Drawing a sticky or a win

  function card(parent, item, big) {
    var c;
    if (item.sticky) {
      var s = item.sticky;
      c = UI.el('div', 'wl-card wl-sticky ' + (s.colour || 'ember'), parent);
      UI.el('div', 'words', c, s.text);
    } else {
      var w = item.win;
      c = UI.el('div', 'wl-card wl-win' + (w.photo ? ' photo' : ''), parent);
      if (w.photo) {
        var pic = UI.el('div', 'pic', c);
        pic.style.backgroundImage = 'url(' + w.photo + ')';
        UI.el('div', 'shade', c);
      }
      UI.el('div', 'kind', c, (w.kind === 'green' ? '🌿 ' : w.kind === 'bonus' ? '🌟 ' : w.kind === 'award' ? '🏅 ' : '✓ ') + L(WIN_KIND[w.kind] || WIN_KIND.job));
      UI.el('div', 'words', c, w.text);
      if (w.name) {
        var who = UI.el('div', 'who', c);
        var dot = UI.el('i', 'dot', who);
        dot.style.background = w.colour || '#6E3DDB';
        who.appendChild(document.createTextNode(w.name));
      }
    }
    if (big) UI.setClass(c, 'big', true);
    return c;
  }

  // MARK: - The screen: laid out like Family HQ in Beyond Family (ADR 0079)

  var screen = null, composing = false, chosen = null, cheerAt = 0, note = null;
  function sound(kind) { if (window.Sfx) Sfx.play(kind); }
  function say(text) {
    var n = note;
    if (!n) { UI.toast(text); return; }
    n.textContent = text;
    setTimeout(function () { UI.setClass(n, 'on', true); }, 20);
    setTimeout(function () { UI.setClass(n, 'on', false); }, 3500);
  }

  var DEFAULT_LAYOUT = [{key: 'activities', size: 'l'}, {key: 'todo', size: 's'}, {key: 'calendar', size: 'l'},
    {key: 'wishlist', size: 's'}, {key: 'menu', size: 's'}, {key: 'broken', size: 's'}, {key: 'notes', size: 's'}];
  var LISTS = {todo: {title: TO_DO, icon: '☑', hint: ADD_TODO}, wishlist: {title: WOULD_LOVE, icon: '♡', hint: ADD_WISH},
    broken: {title: BROKEN, icon: '🔧', hint: ADD_BROKEN}};

  function hq() { return data.wall && data.wall.hq || {}; }
  /** Today on the TV's clock as YYYY-MM-DD, unless Beyond Family said which day it is in Auckland. */
  function todayIso() {
    var m = hq().month;
    if (m && m.today) return m.today;
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(day, n) {
    var d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10) + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function mondayOf(day) {
    var d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)));
    return addDays(day, -((d.getUTCDay() + 6) % 7));
  }
  /** A member's colour, see-through, for the activity chips (no rgba() from a hex in old CSS). */
  function tint(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 'rgba(34, 34, 31, ' + a + ')';
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ', ' + (n >> 8 & 255) + ', ' + (n & 255) + ', ' + a + ')';
  }

  function open() {
    refresh();
    var list = doers(), me = window.Profiles && Profiles.current ? Profiles.current() : null;
    chosen = null;
    for (var k = 0; k < list.length; k++) if (me && list[k].id === me.id) chosen = list[k];
    if (!chosen) chosen = list[0] || null;
    var page = null, shift = 0;
    screen = UI.open({
      cls: 'bt-wall hq',
      build: function (layer, api) {
        shift = 0;
        page = UI.el('div', 'hq-page', layer);
        note = UI.el('div', 'ch-note', layer, '');
        var h = hq(), first = true;
        function add(node, run, opts) { opts = opts || {}; if (first) { opts.first = true; first = false; } return api.add(node, run, opts); }

        // The top: the household's name, then Note (a sticky), the scoreboard and Close, like HQ's Note, Design, Wall mode.
        var top = UI.el('div', 'hq-top', page);
        UI.el('div', 'hq-name', top, data.name || L(TITLE));
        var acts = UI.el('div', 'hq-acts', top);
        var put = add(UI.button(acts, L(NOTE), null, 'hq-act'), function () { compose(api); });
        if (window.Scores && Scores.open) api.add(UI.button(acts, L(SCOREBOARD), null, 'hq-act'), function () { api.close(); Scores.open(); });
        api.add(UI.button(acts, L(CLOSE), null, 'hq-act'), function () { api.close(); });
        first = true; // the first list item or job takes the focus when there is one, else Note keeps it

        // Who's who in their colours, and the day's kind word.
        var legend = UI.el('div', 'hq-legend', page);
        var people = h.people || [];
        for (var p = 0; p < people.length; p++) {
          var who = UI.el('span', 'hq-who', legend);
          UI.el('i', 'dot', who).style.background = people[p].colour || '#55534B';
          who.appendChild(document.createTextNode(people[p].name));
        }
        var day = +todayIso().slice(8, 10);
        UI.el('div', 'hq-love', page, L(AFFIRM[day % AFFIRM.length]));

        // Stickies, front and centre, as on HQ.
        var st = data.wall && data.wall.stickies || [];
        if (st.length) {
          var row = UI.el('div', 'hq-stickies', page);
          for (var s = 0; s < st.length; s++) {
            var sticky = UI.el('div', 'hq-sticky ' + (st[s].colour || 'ember'), row, st[s].text);
            sticky.style.webkitTransform = sticky.style.transform = 'rotate(' + (s % 2 ? 1.2 : -1.2) + 'deg)';
          }
        }

        // Two columns: the small cards on the left, the wide ones on the right, in the family's own order.
        var cols = UI.el('div', 'hq-cols', page);
        var left = UI.el('div', 'hq-left', cols), right = UI.el('div', 'hq-right', cols);
        var people2 = doers();
        if (people2.length) jobsCard(left, api, people2, add);
        var layout = h.layout || DEFAULT_LAYOUT;
        for (var w = 0; w < layout.length; w++) {
          var wd = layout[w];
          if (wd.hidden) continue;
          var col = wd.size === 'l' ? right : left;
          if (LISTS[wd.key]) listCard(col, api, wd.key, add);
          else if (wd.key === 'menu') menuCard(col, api);
          else if (wd.key === 'notes') notesCard(col, api);
          else if (wd.key === 'activities') weekCard(col, api);
          else if (wd.key === 'calendar') monthCard(col, api);
        }
        var wins = data.wall && data.wall.wins || [];
        if (wins.length) {
          var wc = UI.el('div', 'hq-card hq-wins', right);
          title(wc, '🏆', L(WINS));
          var grid = UI.el('div', 'wl-grid', wc);
          for (var i = 0; i < wins.length && i < 4; i++) card(grid, {win: wins[i]});
          api.add(wc, null);
        }
        if (first) api.focusNode(put);
      },
      // The page moves up and down so whatever has the focus is on screen.
      focused: function (node) {
        if (!page) return;
        // Measured in the page's own layout, not on screen: the slide may still be moving.
        var y = 0, n = node;
        while (n && n !== page) { y += n.offsetTop; n = n.offsetParent; }
        if (n !== page) return;
        var view = 1080, t = y + shift, b = t + node.offsetHeight;
        if (b > view - 40) shift -= b - (view - 40);
        if (t < 40) shift += 40 - t;
        if (shift > 0) shift = 0;
        page.style.webkitTransform = page.style.transform = 'translateY(' + Math.round(shift) + 'px)';
      },
      closed: function () { screen = null; note = null; }
    });
  }

  function title(cardNode, icon, text, extra) {
    var t = UI.el('div', 'hq-title', cardNode);
    if (icon) UI.el('span', 'icon', t, icon);
    UI.el('span', '', t, text);
    if (extra) UI.el('span', 'extra', t, extra);
    return t;
  }

  /** Each person's own jobs from Beyond Family: faces along the top, theirs below, OK ticks one for a star. */
  function jobsCard(col, api, people, add) {
    var was = chosen;
    chosen = people[0];
    for (var c = 0; c < people.length; c++) if (was && people[c].id === was.id) chosen = people[c];
    var box = UI.el('div', 'hq-card hq-jobs', col);
    title(box, '⭐', L(TODOS));
    var faces = UI.el('div', 'wl-faces', box);
    for (var f = 0; f < people.length; f++) {
      (function (p) {
        var face = UI.el('div', 'wl-face' + (p.id === chosen.id ? ' on' : ''), faces);
        UI.avatar(p, face, 56);
        var n = left(p);
        UI.el('div', 'n', face, p.name);
        UI.el('div', 'left', face, n.left ? fill(LEFT, n.left) : '✓');
        api.add(face, function () { chosen = p; api.rebuild(); });
      })(people[f]);
    }
    var todos = todosOf(chosen);
    for (var t = 0; t < todos.length; t++) {
      (function (todo) {
        var rowNode = UI.el('div', 'hq-item' + (todo.done ? ' done' : ''), box);
        UI.el('i', 'box', rowNode, todo.done ? '✓' : '');
        UI.el('span', 'text', rowNode, todo.title);
        add(rowNode, function () { tick(chosen, todo, api); });
      })(todos[t]);
    }
    var stars = window.Chores ? Chores.stars(chosen.id) : 0, n = left(chosen);
    var foot = UI.el('div', 'hq-stars', box);
    UI.el('span', 'count', foot, (n.left ? fill(LEFT, n.left) : L(ALL)) + '  ★ ' + (stars === 1 ? L(ONE_STAR) : fill(STARS, stars)));
    if (window.Candy && !chosen.together) {
      api.add(UI.button(foot, L(SPEND), null, 'hq-act'), function () {
        if (window.Scores) Scores.setPlayer(chosen);
        Candy.open('stall', function () { if (UI.top && UI.top() === api) api.rebuild(); });
      });
    }
  }

  /** To do, Would love or This is broken: OK ticks an item, Add types a new one with the remote. */
  function listCard(col, api, kind, add) {
    var spec = LISTS[kind], items = (hq().lists || {})[kind] || [];
    var box = UI.el('div', 'hq-card hq-list', col);
    title(box, spec.icon, L(spec.title));
    for (var i = 0; i < items.length && i < 6; i++) {
      (function (item) {
        var rowNode = UI.el('div', 'hq-item' + (item.done ? ' done' : ''), box);
        UI.el('i', 'box', rowNode, item.done ? '✓' : '');
        UI.el('span', 'text', rowNode, item.text);
        add(rowNode, function () { tickItem(item, api); });
      })(items[i]);
    }
    if (items.length > 6) UI.el('div', 'hq-more', box, fill(MORE, items.length - 6));
    var plus = UI.el('div', 'hq-add', box);
    UI.el('span', 'hint', plus, L(spec.hint));
    UI.el('span', 'plus', plus, '+');
    api.add(plus, function () { addTo(kind, api); });
  }

  function menuCard(col, api) {
    var box = UI.el('div', 'hq-card hq-menu', col), menu = hq().menu || [], today = todayIso(), monday = mondayOf(today);
    title(box, '🍴', L(MENU));
    for (var d = 0; d < 7; d++) {
      var date = addDays(monday, d), meals = [];
      for (var m = 0; m < menu.length; m++) if (menu[m].date === date) meals = menu[m].meals || [];
      var rowNode = UI.el('div', 'hq-day' + (date === today ? ' today' : ''), box);
      UI.el('span', 'd', rowNode, L(DAYS[d]));
      UI.el('span', 'm', rowNode, meals.length ? meals.join(', ') : '-');
    }
    api.add(box, null);
  }

  function notesCard(col, api) {
    var box = UI.el('div', 'hq-card hq-notes', col), words = hq().notes;
    title(box, '📝', L(NOTES));
    UI.el('div', 'hq-hand' + (words ? '' : ' empty'), box, words || L(NOTES_EMPTY));
    api.add(box, null);
  }

  /** This week's after-school strip: seven days, today marked, each activity in its person's colour. */
  function weekCard(col, api) {
    var box = UI.el('div', 'hq-card hq-week', col), acts = hq().activities || [], today = todayIso(), monday = mondayOf(today);
    title(box, '📅', L(THIS_WEEK));
    var strip = UI.el('div', 'hq-strip', box);
    for (var d = 0; d < 7; d++) {
      var dayBox = UI.el('div', 'hq-wday' + (addDays(monday, d) === today ? ' today' : ''), strip);
      UI.el('div', 'd', dayBox, L(DAYS[d]));
      var any = false;
      for (var a = 0; a < acts.length; a++) {
        if (acts[a].weekday !== d + 1) continue;
        any = true;
        var chip = UI.el('div', 'hq-act-chip', dayBox);
        chip.style.background = tint(acts[a].colour, 0.12);
        UI.el('div', 't', chip, acts[a].title).style.color = acts[a].colour || '#22221F';
        if (acts[a].start) UI.el('div', 'time', chip, acts[a].start + (acts[a].end ? '-' + acts[a].end : ''));
      }
      if (!any) UI.el('div', 'none', dayBox, '-');
    }
    api.add(box, null);
  }

  /** The month calendar: six weeks from Monday, today circled, each event in its person's colour, birthdays too. */
  function monthCard(col, api) {
    var box = UI.el('div', 'hq-card hq-month', col), m = hq().month || {}, today = todayIso();
    var from = m.from || mondayOf(today.slice(0, 8) + '01'), evs = m.events || [], bdays = m.birthdays || [];
    var t = title(box, '', L(MONTHS[+today.slice(5, 7) - 1]) + ' ' + today.slice(0, 4));
    UI.setClass(t, 'hand', true);
    var grid = UI.el('div', 'hq-grid', box), head = UI.el('div', 'hq-row head', grid);
    for (var w = 0; w < 7; w++) UI.el('div', 'hq-cell', head, L(DAYS[w]).slice(0, 2));
    for (var r = 0; r < 6; r++) {
      var row = UI.el('div', 'hq-row', grid);
      for (var c = 0; c < 7; c++) {
        var date = addDays(from, r * 7 + c), inMonth = date.slice(0, 7) === today.slice(0, 7);
        var cell = UI.el('div', 'hq-cell' + (inMonth ? '' : ' out'), row);
        UI.el('span', 'n' + (date === today ? ' today' : ''), cell, String(+date.slice(8, 10)));
        var shown = 0, more = 0;
        for (var b = 0; b < bdays.length; b++) {
          if (bdays[b].md !== date.slice(5)) continue;
          var bd = UI.el('div', 'ev', cell, '🎂 ' + bdays[b].name);
          bd.style.color = bdays[b].colour || '#22221F';
          shown++;
        }
        for (var e = 0; e < evs.length; e++) {
          if (evs[e].date !== date) continue;
          if (shown >= 2) { more++; continue; }
          var ev = UI.el('div', 'ev', cell, evs[e].title + (evs[e].time ? ', ' + evs[e].time : ''));
          ev.style.color = evs[e].colour || '#22221F';
          shown++;
        }
        if (more) UI.el('div', 'more', cell, '+' + more);
      }
    }
    api.add(box, null);
  }

  /** Ticks a list item here at once, then tells Beyond Family; if it can't be told, the tick goes back. */
  function tickItem(item, api) {
    var on = !item.done;
    item.done = on;
    sound(on ? 'star' : 'flip');
    api.rebuild();
    src.tickList(item.id, on, function (ok) {
      if (ok) return;
      item.done = !on;
      if (screen === api) { api.rebuild(); say(L(OFFLINE)); } else UI.toast(L(OFFLINE));
    });
  }

  /** Adds something to a list, typed with the remote. */
  function addTo(kind, parent) {
    composing = true;
    var spec = LISTS[kind];
    UI.open({
      cls: 'bt-wall wl-compose',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'wl-top', layer), L(spec.title), L(spec.hint));
        UI.keyboard(UI.el('div', 'wl-keys hq-keys', layer), api, {max: 60, placeholder: L(TYPE_HERE), spaceLabel: L(SPACE), doneLabel: L(ADD),
          done: function (text) {
            text = String(text || '').replace(/^\s+|\s+$/g, '');
            if (!text) { UI.toast(L(TYPE_SOMETHING)); return; }
            src.addToList(kind, text, function (ok) {
              if (!ok) { UI.toast(L(OFFLINE)); return; }
              sound('star');
              UI.toast(L(ADDED));
              refresh();
              api.close();
            });
          }});
        api.add(UI.button(UI.el('div', 'hq-cancel', layer), L(CANCEL), null, 'close'), function () { api.close(); });
      },
      closed: function () { composing = false; if (screen === parent) parent.rebuild(); }
    });
  }

  /** Ticks a to-do here at once, then tells Beyond Family; if it can't be told, the tick goes back. */
  function tick(p, todo, api) {
    var on = !todo.done, m = member(p);
    if (!m) return;
    todo.done = on;
    if (window.Chores && Chores.give) Chores.give(p, on ? 1 : -1);
    api.rebuild();
    var n = left(p);
    if (!on) { sound('flip'); say(L(UNDONE)); }
    else if (!n.left) { sound('win'); say(fill(ALL_CHEER, p.name)); }
    else { sound('star'); say(L(CHEER[cheerAt++ % CHEER.length])); }
    src.tick(todo.id, m, on, function (ok) {
      if (ok) return;
      todo.done = !on;
      if (window.Chores && Chores.give) Chores.give(p, on ? -1 : 1);
      if (screen === api) { api.rebuild(); say(L(OFFLINE)); } else UI.toast(L(OFFLINE));
    });
  }

  /** Put up a sticky: a quick one, or typed on the remote, in one of three colours. */
  function compose(parent) {
    composing = true;
    var colour = 'ember', kb = null;
    UI.open({
      cls: 'bt-wall wl-compose',
      build: function (layer, api) {
        UI.heading(UI.el('div', 'wl-top', layer), L(STICKY), L(STICKY_SUB));
        var quick = UI.el('div', 'wl-quick', layer);
        for (var q = 0; q < QUICK.length; q++) {
          (function (words) {
            api.add(UI.button(quick, words), function () { if (kb) kb.set(words); });
          })(L(QUICK[q]));
        }
        // How it will look on the wall, as it's typed.
        var look = UI.el('div', 'wl-preview', layer), paper = null;
        function preview(text) {
          if (!paper) return;
          paper.className = 'wl-card wl-sticky big ' + colour;
          paper.firstChild.textContent = text || L(TYPE_HERE);
          UI.setClass(paper, 'blank', !text);
        }
        var hues = UI.el('div', 'wl-hues', layer);
        for (var c = 0; c < COLOURS.length; c++) {
          (function (hue) {
            var chip = UI.el('div', 'wl-hue' + (hue.id === colour ? ' on' : ''), hues);
            chip.style.background = hue.hex;
            api.add(chip, function () {
              colour = hue.id;
              var chips = hues.childNodes;
              for (var i = 0; i < chips.length; i++) UI.setClass(chips[i], 'on', i === COLOURS.indexOf(hue));
              preview(kb ? kb.text() : '');
            });
          })(COLOURS[c]);
        }
        kb = UI.keyboard(UI.el('div', 'wl-keys', layer), api, {max: 60, placeholder: L(TYPE_HERE), spaceLabel: L(SPACE), doneLabel: L(PUT_UP),
          value: kb ? kb.text() : '', typed: function (text) { preview(text); }, done: function (text) { put(text, api); }});
        UI.el('div', 'wl-head', look, L(ON_WALL));
        paper = card(look, {sticky: {text: '', colour: colour}}, true);
        preview(kb.text());
        api.add(UI.button(look, L(CANCEL), null, 'close wl-cancel'), function () { api.close(); });
      },
      closed: function () { composing = false; if (screen === parent) parent.rebuild(); }
    });
    function put(text, api) {
      text = String(text || '').replace(/^\s+|\s+$/g, '');
      if (!text) { UI.toast(L(TYPE_SOMETHING)); return; }
      var me = window.Profiles && Profiles.current ? Profiles.current() : null;
      src.sticky(text, colour, member(me), function (ok) {
        if (!ok) { UI.toast(L(OFFLINE)); return; }
        sound('star');
        UI.toast(L(PUT));
        refresh();
        api.close();
      });
    }
  }

  // MARK: - Beyond Family changed

  /** The sync brought a different wall or different to-dos: the open screen and the home screen catch up. */
  function changed() {
    refresh();
    if (screen && !composing) screen.rebuild();
    if (window.BeyondTV && BeyondTV.notes) BeyondTV.notes();
  }

  // MARK: - On the screensaver: one thing at a time

  var lastSaver = '';
  /** Paints the i-th thing on the wall into the screensaver's box. False when the wall is empty. */
  function saver(box, i) {
    var all = items();
    if (!all.length) { box.innerHTML = ''; lastSaver = ''; UI.setClass(box, 'on', false); return false; }
    var item = all[i % all.length], sig = JSON.stringify(item);
    if (sig !== lastSaver || !box.firstChild) {
      lastSaver = sig;
      box.innerHTML = '';
      UI.el('div', 'head', box, L(ON_WALL));
      card(box, item, true);
    }
    UI.setClass(box, 'on', true);
    return true;
  }

  /** A line for Today at home: [icon, words, more], or null. */
  function homeRow(p) {
    var n = left(p);
    if (n.total) return ['✅', n.left ? fill(LEFT, n.left) + ' · ' + L(TODOS).toLowerCase() : L(ALL), L(TITLE)];
    var w = data.wall;
    if (w && w.stickies && w.stickies.length) return ['📌', w.stickies[0].text, L(ON_WALL)];
    return null;
  }

  return {open: open, changed: changed, answer: answer, count: count, left: left, saver: saver, homeRow: homeRow, linked: src.linked,
    rules: {member: member, items: items, refresh: refresh, layout: DEFAULT_LAYOUT, mondayOf: mondayOf, addDays: addDays, tint: tint, words: function () {
      return [TITLE, SUB, TODOS, ON_WALL, LEFT, ALL, STARS, ONE_STAR, NONE_TODOS, NONE_WALL, STICKY, STICKY_SUB, PUT_UP, PUT, TYPE_SOMETHING, OFFLINE,
        UNDONE, ALL_CHEER, SPEND, SCOREBOARD, CLOSE, CANCEL, SPACE, TYPE_HERE, WIN_KIND.job, WIN_KIND.green, WIN_KIND.bonus, WIN_KIND.award,
        TO_DO, WOULD_LOVE, BROKEN, MENU, NOTES, NOTES_EMPTY, THIS_WEEK, WINS, NOTE, ADD, ADDED, ADD_TODO, ADD_WISH, ADD_BROKEN, MORE].concat(CHEER, QUICK, DAYS, MONTHS, AFFIRM);
    }}};
})();
