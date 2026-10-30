/*
 * The arcade (ADR 0035): four classic kinds of game, made again with our own names and art and played with the remote
 * alone. Eel (grow a long eel), Paddle (a bouncing ball against a robot), Sky Guard (hold off the space jellies) and
 * Dot Chase (gobble the dots, dodge the ghosts). The TV's remote sends one press per push, never a held key, so every
 * game steers by turning: press a direction and it keeps going until you press another (OK stops or fires). Sounds
 * are made on the TV (sfx.js). Bests stay on this TV. Google TV runs this same file in TableActivity's WebView.
 * Plain ES5: one canvas, drawn with plain shapes.
 */
var Arcade = (function () {
  'use strict';

  var W = 1280, H = 720, TICK = 33;
  var KEY = 'btv.arcade';
  var INK = '#0D0C18', PAPER = '#F7F6F2', MOSS = '#2F7D6D', EMBER = '#E8A33D', CORAL = '#D85A30', BLUE = '#378ADD', LILAC = '#9E7BFF';
  var LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40, OK = 13;

  function say(pt, en, es) { return tr(pt, en, es); }
  function sfx(kind) { if (window.Sfx) Sfx.play(kind); }

  // MARK: - Bests, kept on this TV

  function loadBests() {
    try { var b = JSON.parse(window.localStorage.getItem(KEY)); if (b && typeof b === 'object') return b; } catch (e) {}
    return {};
  }
  function saveBest(id, value) {
    var b = loadBests();
    if (!(value > (b[id] || 0))) return false;
    b[id] = value;
    try { window.localStorage.setItem(KEY, JSON.stringify(b)); } catch (e) {}
    return true;
  }

  // MARK: - Rules that don't need a screen (tested by node tests/arcade.test.js)

  var DIRS = {}; DIRS[LEFT] = {x: -1, y: 0}; DIRS[UP] = {x: 0, y: -1}; DIRS[RIGHT] = {x: 1, y: 0}; DIRS[DOWN] = {x: 0, y: 1};

  /** Dot Chase's maze: # wall, . dot, o big dot, space nothing. 21 by 15, every open square reachable. */
  var MAZE = [
    '#####################',
    '#o........#........o#',
    '#.###.###.#.###.###.#',
    '#...................#',
    '#.###.#.#####.#.###.#',
    '#.....#...#...#.....#',
    '#####.###.#.###.#####',
    '#...................#',
    '#####.###.#.###.#####',
    '#.....#...#...#.....#',
    '#.###.#.#####.#.###.#',
    '#...................#',
    '#.###.###.#.###.###.#',
    '#o........#........o#',
    '#####################'
  ];

  function open(grid, c, r) { return r >= 0 && r < grid.length && c >= 0 && c < grid[r].length && grid[r].charAt(c) !== '#'; }

  /** How many open squares can be walked to from one square: the maze is fair only if it is all of them. */
  function reachable(grid, c, r) {
    var seen = {}, stack = [[c, r]], n = 0;
    while (stack.length) {
      var p = stack.pop(), k = p[0] + ',' + p[1];
      if (seen[k] || !open(grid, p[0], p[1])) continue;
      seen[k] = true; n++;
      stack.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
    }
    return n;
  }

  /** Where a head ends up after one step on a board that wraps round the edges. */
  function wrap(p, d, cols, rows) { return {x: (p.x + d.x + cols) % cols, y: (p.y + d.y + rows) % rows}; }

  /** Turns for the eel: a press that would double back on the way it is going is ignored. */
  function canTurn(going, d) { return !(going.x + d.x === 0 && going.y + d.y === 0); }

  /** Pairs: a ball bounces off a paddle by where it hits it: dead centre goes straight, the edges go steep. */
  function bounce(hitY, paddleY, half, steep) {
    var t = (hitY - (paddleY + half)) / half;
    return Math.max(-1, Math.min(1, t)) * steep;
  }

  /** How many ticks between the space jellies' steps: fewer jellies, quicker steps, and each wave a little quicker. */
  function jellyEvery(alive, total, wave) {
    return Math.max(2, Math.round(alive / total * 8) + 1 - Math.min(wave - 1, 3));
  }

  // MARK: - Drawing helpers

  var c2 = null;
  function rr(x, y, w, h, r) {
    c2.beginPath();
    c2.moveTo(x + r, y); c2.lineTo(x + w - r, y); c2.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    c2.lineTo(x + w, y + h - r); c2.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    c2.lineTo(x + r, y + h); c2.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    c2.lineTo(x, y + r); c2.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    c2.closePath();
  }
  function disc(x, y, r, fill) { c2.fillStyle = fill; c2.beginPath(); c2.arc(x, y, r, 0, Math.PI * 2); c2.fill(); }
  function text(s, x, y, size, fill, align, weight) {
    c2.font = (weight || '700') + ' ' + size + 'px Sora, Inter, Arial, sans-serif';
    c2.fillStyle = fill; c2.textAlign = align || 'left'; c2.textBaseline = 'middle';
    c2.fillText(s, x, y);
  }
  function rnd(n) { return Math.floor(Math.random() * n); }

  // MARK: - Eel

  function makeEel() {
    var CELL = 40, COLS = 32, ROWS = 18;
    var g = {id: 'eel', score: 0, over: false};
    var body = [{x: 16, y: 9}, {x: 15, y: 9}, {x: 14, y: 9}], going = {x: 1, y: 0}, queue = [], food = null, tick = 0, grow = 0;

    function free(x, y) { for (var i = 0; i < body.length; i++) if (body[i].x === x && body[i].y === y) return false; return true; }
    function place() {
      do { food = {x: rnd(COLS), y: rnd(ROWS)}; } while (!free(food.x, food.y));
    }
    place();

    g.how = say('Setas viram a enguia. Ela não para, então coma as frutas e não se morda.',
      'The arrows turn the eel. It never stops, so eat the fruit and don\'t bite yourself.',
      'Las flechas giran la anguila. No se detiene: come la fruta y no te muerdas.');
    g.key = function (k) {
      var d = DIRS[k];
      if (!d) return;
      var last = queue.length ? queue[queue.length - 1] : going;
      if (queue.length < 2 && canTurn(last, d) && !(last.x === d.x && last.y === d.y)) queue.push(d);
    };
    g.update = function () {
      tick++;
      var every = Math.max(2, 5 - Math.floor(g.score / 90));
      if (tick % every) return;
      if (queue.length) going = queue.shift();
      var head = wrap(body[0], going, COLS, ROWS), eating = head.x === food.x && head.y === food.y;
      // The tail moves out of the way this step unless the eel is growing.
      var length = body.length - (eating || grow > 0 ? 0 : 1);
      for (var i = 0; i < length; i++) {
        if (body[i].x === head.x && body[i].y === head.y) { g.over = true; return; }
      }
      body.unshift(head);
      if (eating) { g.score += 10; grow += 2; sfx('point'); place(); }
      if (grow > 0 && !eating) grow--; else if (!eating) body.pop();
    };
    g.draw = function () {
      var ox = 0, oy = 0, i;
      c2.fillStyle = '#14122A'; c2.fillRect(0, 0, W, H);
      c2.fillStyle = 'rgba(247,246,242,0.04)';
      for (i = 0; i <= COLS; i += 2) c2.fillRect(ox + i * CELL, oy, CELL, H);
      disc(food.x * CELL + 20, food.y * CELL + 22, 15, EMBER);
      disc(food.x * CELL + 15, food.y * CELL + 17, 5, 'rgba(255,255,255,0.45)');
      c2.fillStyle = MOSS; c2.fillRect(food.x * CELL + 19, food.y * CELL + 3, 3, 8);
      for (i = body.length - 1; i >= 0; i--) {
        var t = 1 - i / Math.max(body.length, 8) * 0.5;
        c2.fillStyle = i === 0 ? '#5CC4AE' : 'rgba(' + Math.round(47 * t + 20) + ',' + Math.round(125 * t + 30) + ',' + Math.round(109 * t + 20) + ',1)';
        rr(body[i].x * CELL + 3, body[i].y * CELL + 3, CELL - 6, CELL - 6, i === 0 ? 14 : 10);
        c2.fill();
      }
      var h = body[0], ex = going.y ? 10 : 0, ey = going.x ? 10 : 0;
      disc(h.x * CELL + 20 - ex + going.x * 6, h.y * CELL + 20 - ey + going.y * 6, 5, PAPER);
      disc(h.x * CELL + 20 + ex + going.x * 6, h.y * CELL + 20 + ey + going.y * 6, 5, PAPER);
      disc(h.x * CELL + 20 - ex + going.x * 8, h.y * CELL + 20 - ey + going.y * 8, 2.5, INK);
      disc(h.x * CELL + 20 + ex + going.x * 8, h.y * CELL + 20 + ey + going.y * 8, 2.5, INK);
    };
    g.endText = function () { return say('Fim de jogo!', 'The eel tied itself in a knot!', '¡La anguila se hizo un nudo!'); };
    return g;
  }

  // MARK: - Paddle

  function makePaddle() {
    var PH = 120, PW = 20, R = 12, SPEED = 450, TARGET = 7;
    var bests = loadBests(), level = Math.max(1, bests.paddle || 1);
    var g = {id: 'paddle', score: 0, over: false};
    var me = {y: H / 2 - PH / 2, v: 0}, robot = {y: H / 2 - PH / 2, miss: 0};
    var ball = {x: W / 2, y: H / 2, vx: 0, vy: 0}, mine = 0, theirs = 0, wait = 30, toward = 1, robotSpeed;

    function serve() {
      ball.x = W / 2; ball.y = H / 2;
      ball.vx = 420 * toward; ball.vy = (Math.random() * 2 - 1) * 220;
      robot.miss = (Math.random() * 2 - 1) * Math.max(8, 70 - level * 7);
    }
    robotSpeed = 250 + level * 28;
    g.how = say('Cima e baixo movem a raquete, e ela continua. OK para. O primeiro a 7 ganha, e o robô fica mais rápido toda vez que você vence.',
      'Up and down move your paddle and it keeps going. OK stops it. First to 7 wins, and the robot gets quicker each time you win.',
      'Arriba y abajo mueven la pala y sigue sola. OK la para. Gana el primero en llegar a 7, y el robot es más rápido cada vez que ganas.');
    g.key = function (k) {
      if (k === UP) me.v = -SPEED; else if (k === DOWN) me.v = SPEED; else if (k === OK) me.v = 0;
    };
    g.update = function () {
      var dt = TICK / 1000;
      me.y = Math.max(0, Math.min(H - PH, me.y + me.v * dt));
      if (me.y === 0 || me.y === H - PH) me.v = 0;
      // The robot follows the ball when it is coming, and drifts back to the middle when it isn't.
      var aim = ball.vx > 0 ? ball.y + robot.miss - PH / 2 : H / 2 - PH / 2, d = aim - robot.y, step = robotSpeed * dt;
      robot.y += Math.max(-step, Math.min(step, d));
      robot.y = Math.max(0, Math.min(H - PH, robot.y));
      if (wait > 0) { wait--; if (wait === 0) serve(); return; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); sfx('hop'); }
      if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); sfx('hop'); }
      if (ball.vx < 0 && ball.x - R <= 40 + PW && ball.x > 30 && ball.y > me.y - R && ball.y < me.y + PH + R) {
        ball.x = 40 + PW + R; ball.vx = Math.min(900, -ball.vx * 1.06); ball.vy = bounce(ball.y, me.y, PH / 2, 520); sfx('place');
      } else if (ball.vx > 0 && ball.x + R >= W - 40 - PW && ball.x < W - 30 && ball.y > robot.y - R && ball.y < robot.y + PH + R) {
        ball.x = W - 40 - PW - R; ball.vx = -Math.min(900, ball.vx * 1.06); ball.vy = bounce(ball.y, robot.y, PH / 2, 520);
        robot.miss = (Math.random() * 2 - 1) * Math.max(8, 70 - level * 7); sfx('place');
      }
      if (ball.x < -R) { theirs++; toward = -1; wait = 40; sfx('oops'); ball.vx = 0; ball.vy = 0; }
      else if (ball.x > W + R) { mine++; toward = 1; wait = 40; sfx('point'); ball.vx = 0; ball.vy = 0; }
      g.score = mine;
      if (mine >= TARGET || theirs >= TARGET) {
        g.over = true;
        g.won = mine > theirs;
        if (g.won) { level++; saveBest('paddle', level); }
      }
    };
    g.draw = function () {
      c2.fillStyle = '#14122A'; c2.fillRect(0, 0, W, H);
      c2.fillStyle = 'rgba(247,246,242,0.12)';
      for (var y = 10; y < H; y += 40) c2.fillRect(W / 2 - 3, y, 6, 22);
      text(String(mine), W / 2 - 110, 70, 80, 'rgba(247,246,242,0.35)', 'center', '800');
      text(String(theirs), W / 2 + 110, 70, 80, 'rgba(247,246,242,0.35)', 'center', '800');
      c2.fillStyle = MOSS; rr(40, me.y, PW, PH, 8); c2.fill();
      c2.fillStyle = CORAL; rr(W - 40 - PW, robot.y, PW, PH, 8); c2.fill();
      disc(ball.x, ball.y, R, EMBER);
    };
    g.endText = function () {
      return g.won ? say('Você ganhou! O robô vai ficar mais rápido.', 'You won! The robot will be quicker next time.', '¡Ganaste! El robot será más rápido la próxima vez.')
        : say('O robô ganhou. Tente de novo!', 'The robot won. Have another go!', 'Ganó el robot. ¡Otra vez!');
    };
    g.scoreText = function () { return mine + ' : ' + theirs; };
    g.bestText = function () { return say('Nível do robô ', 'Robot level ', 'Nivel del robot ') + level; };
    return g;
  }

  // MARK: - Sky Guard

  function makeGuard() {
    var COLS = 9, ROWS = 4, TOTAL = COLS * ROWS, GX = 100, GY = 66, SIZE = 56, SHIP_Y = H - 60;
    var g = {id: 'guard', score: 0, over: false, lives: 3};
    var wave = 1, jellies, ox, oy, dirx, tick, ship = {x: W / 2, v: 0}, shot = null, bombs = [], hurt = 0, alive, resting = 0;

    function build() {
      jellies = [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) jellies.push({c: c, r: r, alive: true});
      ox = 120; oy = 60 + Math.min(wave - 1, 3) * 20; dirx = 1; tick = 0; alive = TOTAL; shot = null; bombs = [];
    }
    build();

    g.how = say('Esquerda e direita levam a nave, e ela continua. OK atira, baixo para. Pare as águas-vivas antes que cheguem lá embaixo.',
      'Left and right move your ship and it keeps going. OK fires, down stops. Stop the space jellies before they reach the bottom.',
      'Izquierda y derecha mueven la nave y sigue sola. OK dispara, abajo para. Detén las medusas antes de que lleguen abajo.');
    g.key = function (k) {
      if (k === LEFT) ship.v = -400; else if (k === RIGHT) ship.v = 400; else if (k === DOWN) ship.v = 0;
      else if (k === OK && !shot) { shot = {x: ship.x, y: SHIP_Y - 30}; sfx('hop'); }
    };
    g.update = function () {
      var dt = TICK / 1000, i, j;
      ship.x = Math.max(40, Math.min(W - 40, ship.x + ship.v * dt));
      if (ship.x === 40 || ship.x === W - 40) ship.v = 0;
      if (hurt > 0) hurt--;
      if (resting > 0) { resting--; if (resting === 0) build(); return; }
      tick++;
      if (tick % jellyEvery(alive, TOTAL, wave) === 0) {
        var left = 1e9, right = -1e9;
        for (i = 0; i < jellies.length; i++) if (jellies[i].alive) { left = Math.min(left, jellies[i].c); right = Math.max(right, jellies[i].c); }
        if ((dirx > 0 && ox + right * GX + SIZE + 16 > W - 30) || (dirx < 0 && ox + left * GX - 16 < 30)) { dirx = -dirx; oy += 30; }
        else ox += dirx * 16;
      }
      var lowest = 0;
      for (i = 0; i < jellies.length; i++) if (jellies[i].alive) lowest = Math.max(lowest, oy + jellies[i].r * GY + SIZE);
      if (lowest >= SHIP_Y - 24) { g.over = true; return; }
      if (shot) {
        shot.y -= 840 * dt;
        if (shot.y < -20) shot = null;
        else for (i = 0; i < jellies.length && shot; i++) {
          var a = jellies[i];
          if (!a.alive) continue;
          var ax = ox + a.c * GX, ay = oy + a.r * GY;
          if (shot.x > ax - 6 && shot.x < ax + SIZE + 6 && shot.y > ay && shot.y < ay + SIZE) {
            a.alive = false; alive--; shot = null; g.score += 10 * (ROWS - a.r); sfx('capture');
          }
        }
      }
      if (alive === 0) { wave++; g.score += 100; sfx('win'); resting = 30; return; }
      // The jellies drop bombs, from the front of a column.
      if (bombs.length < 2 + wave && Math.random() < 0.05 + wave * 0.01) {
        var from = jellies[rnd(jellies.length)], best = null;
        for (j = 0; j < jellies.length; j++) if (jellies[j].alive && jellies[j].c === from.c && (!best || jellies[j].r > best.r)) best = jellies[j];
        if (best) bombs.push({x: ox + best.c * GX + SIZE / 2, y: oy + best.r * GY + SIZE});
      }
      for (i = bombs.length - 1; i >= 0; i--) {
        bombs[i].y += (260 + wave * 20) * dt;
        if (bombs[i].y > H) { bombs.splice(i, 1); continue; }
        if (!hurt && bombs[i].y > SHIP_Y - 18 && bombs[i].y < SHIP_Y + 24 && Math.abs(bombs[i].x - ship.x) < 36) {
          bombs.splice(i, 1);
          g.lives--; hurt = 45; sfx('oops');
          if (g.lives <= 0) { g.over = true; return; }
        }
      }
    };
    g.draw = function () {
      var i, colours = [CORAL, EMBER, LILAC, BLUE];
      c2.fillStyle = '#0B0A1B'; c2.fillRect(0, 0, W, H);
      c2.fillStyle = 'rgba(247,246,242,0.5)';
      for (i = 0; i < 40; i++) c2.fillRect((i * 337) % W, (i * 191 + tick * (1 + i % 3) * 0.2) % H, 2, 2);
      for (i = 0; i < jellies.length; i++) {
        var a = jellies[i];
        if (!a.alive) continue;
        var x = ox + a.c * GX, y = oy + a.r * GY, wob = Math.sin((tick + a.c * 3) / 3) * 4, col = colours[a.r % 4];
        c2.fillStyle = col;
        c2.beginPath(); c2.arc(x + SIZE / 2, y + 26, 26, Math.PI, 0); c2.lineTo(x + SIZE, y + 36); c2.lineTo(x, y + 36); c2.closePath(); c2.fill();
        c2.strokeStyle = col; c2.lineWidth = 5; c2.lineCap = 'round';
        for (var t = 0; t < 4; t++) {
          c2.beginPath(); c2.moveTo(x + 8 + t * 13, y + 36);
          c2.quadraticCurveTo(x + 8 + t * 13 + wob, y + 46, x + 8 + t * 13 - wob, y + 54); c2.stroke();
        }
        disc(x + 19, y + 24, 5, PAPER); disc(x + 37, y + 24, 5, PAPER);
        disc(x + 19, y + 25, 2.5, INK); disc(x + 37, y + 25, 2.5, INK);
      }
      if (!hurt || (hurt % 6) < 3) {
        c2.fillStyle = MOSS;
        c2.beginPath(); c2.moveTo(ship.x, SHIP_Y - 28); c2.lineTo(ship.x + 36, SHIP_Y + 18); c2.lineTo(ship.x - 36, SHIP_Y + 18); c2.closePath(); c2.fill();
        disc(ship.x, SHIP_Y, 9, '#5CC4AE');
      }
      if (shot) { c2.fillStyle = PAPER; c2.fillRect(shot.x - 3, shot.y, 6, 22); }
      c2.fillStyle = EMBER;
      for (i = 0; i < bombs.length; i++) { rr(bombs[i].x - 5, bombs[i].y, 10, 22, 5); c2.fill(); }
    };
    g.endText = function () { return say('As águas-vivas passaram!', 'The space jellies got through!', '¡Las medusas pasaron!'); };
    g.extra = function () { return say('Onda ', 'Wave ', 'Oleada ') + wave; };
    return g;
  }

  // MARK: - Dot Chase

  function makeDots() {
    var CELL = 48, OX = 136, TOTAL_TICKS = 5;
    var g = {id: 'dots', score: 0, over: false, lives: 3};
    var grid = MAZE, level = 1, dots, left, power = 0, who, ghosts, resting = 0, caught = 0, tick = 0;

    function freshDots() {
      dots = []; left = 0;
      for (var r = 0; r < grid.length; r++) {
        dots.push([]);
        for (var c = 0; c < grid[r].length; c++) {
          var ch = grid[r].charAt(c);
          dots[r].push(ch === '.' || ch === 'o' ? ch : ' ');
          if (ch === '.' || ch === 'o') left++;
        }
      }
    }
    function spawn() {
      who = {c: 10, r: 11, tc: 10, tr: 11, p: 0, dir: null, want: null};
      var starts = [[8, 7], [9, 7], [11, 7], [12, 7]], cols = [CORAL, BLUE, EMBER, LILAC];
      ghosts = [];
      for (var i = 0; i < 4; i++) ghosts.push({c: starts[i][0], r: starts[i][1], tc: starts[i][0], tr: starts[i][1], p: 0, dir: null,
        colour: cols[i], home: starts[i], eaten: 0, bold: [1, 0.7, 0.4, 0.15][i], wait: i * 20});
    }
    freshDots(); spawn();

    g.how = say('Setas escolhem o caminho, e você continua. Coma todos os pontos. Um ponto grande deixa os fantasmas com medo.',
      'The arrows pick your way and you keep going. Eat every dot. A big dot makes the ghosts scared.',
      'Las flechas eligen el camino y sigues solo. Come todos los puntos. Un punto grande asusta a los fantasmas.');
    g.key = function (k) { if (DIRS[k]) who.want = DIRS[k]; };

    function ticksPer(kind) {
      if (kind === 'me') return TOTAL_TICKS;
      return Math.max(5, (power > 0 ? 8 : 7) - Math.floor((level - 1) / 2));
    }
    /** One walker: finish the square it is walking to, then choose the next. */
    function walk(m, kind, choose) {
      if (m.dir) {
        m.p += 1 / ticksPer(kind);
        if (m.p < 1) return;
        m.c = m.tc; m.r = m.tr; m.p = 0;
      }
      var d = choose(m);
      m.dir = d;
      if (d && open(grid, m.c + d.x, m.r + d.y)) { m.tc = m.c + d.x; m.tr = m.r + d.y; } else { m.dir = null; m.tc = m.c; m.tr = m.r; }
    }
    function pickMe(m) {
      if (m.want && open(grid, m.c + m.want.x, m.r + m.want.y)) return m.want;
      return m.dir && open(grid, m.c + m.dir.x, m.r + m.dir.y) ? m.dir : null;
    }
    function pickGhost(gh) {
      var options = [], k, d;
      for (k in DIRS) {
        d = DIRS[k];
        if (!open(grid, gh.c + d.x, gh.r + d.y)) continue;
        if (gh.dir && gh.dir.x + d.x === 0 && gh.dir.y + d.y === 0) continue;
        options.push(d);
      }
      if (!options.length) return gh.dir ? {x: -gh.dir.x, y: -gh.dir.y} : null;
      if (power > 0 || Math.random() > gh.bold) return options[rnd(options.length)];
      var best = options[0], bestD = 1e9;
      for (k = 0; k < options.length; k++) {
        var dd = Math.abs(gh.c + options[k].x - who.c) + Math.abs(gh.r + options[k].y - who.r);
        if (dd < bestD) { bestD = dd; best = options[k]; }
      }
      return best;
    }
    function at(m) {
      return {x: m.c + (m.tc - m.c) * m.p, y: m.r + (m.tr - m.r) * m.p};
    }

    g.update = function () {
      var i;
      tick++;
      if (resting > 0) { resting--; return; }
      // Turning back is allowed half way along a square.
      if (who.dir && who.want && who.want.x + who.dir.x === 0 && who.want.y + who.dir.y === 0 && who.p > 0) {
        var c = who.c, r = who.r;
        who.c = who.tc; who.r = who.tr; who.tc = c; who.tr = r; who.p = 1 - who.p; who.dir = who.want;
      }
      walk(who, 'me', pickMe);
      if (!who.p) {
        var ch = dots[who.r] ? dots[who.r][who.c] : ' ';
        if (ch === '.' || ch === 'o') {
          dots[who.r][who.c] = ' '; left--;
          if (ch === 'o') { g.score += 50; power = 210; caught = 0; sfx('six'); } else { g.score += 10; if (left % 2) sfx('point'); }
          if (left <= 0) { level++; g.score += 200; sfx('win'); freshDots(); spawn(); power = 0; resting = 40; return; }
        }
      }
      if (power > 0) power--;
      var me = at(who);
      for (i = 0; i < ghosts.length; i++) {
        var gh = ghosts[i];
        if (gh.wait > 0) { gh.wait--; continue; }
        walk(gh, 'ghost', pickGhost);
        var p = at(gh);
        if (Math.abs(p.x - me.x) + Math.abs(p.y - me.y) < 0.8) {
          if (power > 0) {
            caught++; g.score += 100 * caught; sfx('home');
            gh.c = gh.tc = gh.home[0]; gh.r = gh.tr = gh.home[1]; gh.p = 0; gh.dir = null; gh.wait = 60;
          } else {
            g.lives--; sfx('oops');
            if (g.lives <= 0) { g.over = true; return; }
            spawn(); resting = 45; return;
          }
        }
      }
    };
    g.draw = function () {
      var r, c, i;
      c2.fillStyle = '#0B0A1B'; c2.fillRect(0, 0, W, H);
      for (r = 0; r < grid.length; r++) for (c = 0; c < grid[r].length; c++) {
        var x = OX + c * CELL, y = r * CELL;
        if (grid[r].charAt(c) === '#') { c2.fillStyle = '#2B2660'; rr(x + 3, y + 3, CELL - 6, CELL - 6, 12); c2.fill(); }
        else if (dots[r][c] === '.') disc(x + 24, y + 24, 5, PAPER);
        else if (dots[r][c] === 'o') disc(x + 24, y + 24, 12 + Math.sin(tick / 4) * 2, EMBER);
      }
      var me = at(who), mx = OX + me.x * CELL + 24, my = me.y * CELL + 24, face = who.dir || who.want || {x: 1, y: 0};
      var mouth = (Math.sin(tick / 2) + 1) * 0.28, ang = Math.atan2(face.y, face.x);
      c2.fillStyle = '#5CC4AE'; c2.beginPath(); c2.moveTo(mx, my);
      c2.arc(mx, my, 20, ang + mouth, ang + Math.PI * 2 - mouth); c2.closePath(); c2.fill();
      for (i = 0; i < ghosts.length; i++) {
        var gh = ghosts[i];
        if (gh.wait > 0 && (tick % 6) < 3) continue;
        var p = at(gh), gx = OX + p.x * CELL + 24, gy = p.y * CELL + 24;
        var scared = power > 0, blink = power < 60 && (tick % 8) < 4;
        c2.fillStyle = scared ? (blink ? PAPER : '#4A4FA0') : gh.colour;
        c2.beginPath(); c2.arc(gx, gy - 2, 19, Math.PI, 0); c2.lineTo(gx + 19, gy + 18); c2.lineTo(gx + 9, gy + 11); c2.lineTo(gx, gy + 18);
        c2.lineTo(gx - 9, gy + 11); c2.lineTo(gx - 19, gy + 18); c2.closePath(); c2.fill();
        disc(gx - 7, gy - 4, 5, PAPER); disc(gx + 7, gy - 4, 5, PAPER);
        disc(gx - 7 + (who.c > p.x ? 2 : -1), gy - 4, 2.5, INK); disc(gx + 7 + (who.c > p.x ? 2 : -1), gy - 4, 2.5, INK);
      }
    };
    g.endText = function () { return say('Os fantasmas pegaram você!', 'The ghosts got you!', '¡Te atraparon los fantasmas!'); };
    g.extra = function () { return say('Nível ', 'Level ', 'Nivel ') + level; };
    return g;
  }

  // MARK: - The screens

  var GAMES = [
    {id: 'eel', icon: '🐍', make: makeEel, name: function () { return say('Enguia', 'Eel', 'Anguila'); },
      about: function () { return say('Cresça comendo frutas.', 'Grow long by eating fruit.', 'Crece comiendo fruta.'); }},
    {id: 'paddle', icon: '🏓', make: makePaddle, name: function () { return say('Raquete', 'Paddle', 'Pala'); },
      about: function () { return say('Rebata a bola contra o robô.', 'Bat the ball past the robot.', 'Devuelve la pelota al robot.'); }},
    {id: 'guard', icon: '🚀', make: makeGuard, name: function () { return say('Guarda do Céu', 'Sky Guard', 'Guardia del Cielo'); },
      about: function () { return say('Pare as águas-vivas do espaço.', 'Hold off the space jellies.', 'Detén las medusas del espacio.'); }},
    {id: 'dots', icon: '🟡', make: makeDots, name: function () { return say('Caça-pontos', 'Dot Chase', 'Caza-puntos'); },
      about: function () { return say('Coma os pontos, fuja dos fantasmas.', 'Gobble the dots, dodge the ghosts.', 'Come los puntos, esquiva fantasmas.'); }}
  ];

  var g = null, state = '', timer = null, canvas = null;

  function stop() {
    if (timer) clearInterval(timer);
    timer = null; g = null; canvas = null; c2 = null; state = '';
  }

  function paint() {
    if (!g || !c2) return;
    c2.save();
    g.draw();
    c2.restore();
    text(String(g.score), 24, 28, 30, PAPER, 'left');
    var mid = g.extra ? g.extra() : (g.scoreText ? '' : '');
    if (mid) text(mid, W / 2, 28, 24, 'rgba(247,246,242,0.7)', 'center', '600');
    if (g.lives !== undefined) for (var i = 0; i < g.lives; i++) disc(W - 30 - i * 34, 28, 11, CORAL);
    var best = g.bestText ? g.bestText() : say('Melhor ', 'Best ', 'Mejor ') + (loadBests()[g.id] || 0);
    text(best, 24, 62, 20, 'rgba(247,246,242,0.55)', 'left', '600');
    if (state === 'ready' || state === 'paused' || state === 'over') {
      c2.fillStyle = 'rgba(13,12,24,0.82)'; c2.fillRect(0, 0, W, H);
      var spec = null;
      for (var j = 0; j < GAMES.length; j++) if (GAMES[j].id === g.id) spec = GAMES[j];
      if (state === 'ready') {
        text(spec.name(), W / 2, 200, 76, PAPER, 'center', '800');
        wrapText(g.how, W / 2, 310, 1000, 38, 'rgba(247,246,242,0.85)');
        text(say('Aperte OK para começar', 'Press OK to start', 'Pulsa OK para empezar'), W / 2, 540, 40, EMBER, 'center');
      } else if (state === 'paused') {
        text(say('Pausado', 'Paused', 'En pausa'), W / 2, 260, 80, PAPER, 'center', '800');
        text(say('OK para continuar. Voltar para sair.', 'OK to carry on. Back to leave.', 'OK para seguir. Atrás para salir.'), W / 2, 380, 36, EMBER, 'center');
      } else {
        text(g.endText(), W / 2, 220, 56, PAPER, 'center', '800');
        text(g.scoreText ? g.scoreText() : say('Pontos: ', 'Score: ', 'Puntos: ') + g.score, W / 2, 330, 64, EMBER, 'center', '800');
        if (g.newBest) text(say('Novo recorde!', 'A new best!', '¡Nuevo récord!'), W / 2, 410, 40, '#5CC4AE', 'center');
        text(say('OK para jogar de novo. Voltar para sair.', 'OK to play again. Back to leave.', 'OK para jugar otra vez. Atrás para salir.'), W / 2, 520, 34, 'rgba(247,246,242,0.8)', 'center', '600');
      }
    }
  }

  function wrapText(s, x, y, width, line, fill) {
    var words = s.split(' '), row = '', n = 0;
    c2.font = '600 ' + (line - 4) + 'px Inter, Arial, sans-serif';
    for (var i = 0; i < words.length; i++) {
      var tryRow = row ? row + ' ' + words[i] : words[i];
      if (c2.measureText(tryRow).width > width && row) { text(row, x, y + n * line * 1.3, line - 4, fill, 'center', '600'); row = words[i]; n++; }
      else row = tryRow;
    }
    if (row) text(row, x, y + n * line * 1.3, line - 4, fill, 'center', '600');
  }

  function begin(spec) {
    g = spec.make();
    state = 'ready';
    paint();
  }

  function tickOnce() {
    if (!g) return;
    if (state === 'play') {
      g.update();
      if (g.over) {
        state = 'over';
        if (g.id !== 'paddle') g.newBest = saveBest(g.id, g.score);
        sfx(g.won ? 'win' : 'lose');
      }
    }
    paint();
  }

  function run(spec) {
    UI.open({
      cls: 'bt-arcade',
      build: function (layer) {
        UI.el('div', 'ar-title', layer, spec.icon + '  ' + spec.name());
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H; canvas.className = 'ar-canvas';
        layer.appendChild(canvas);
        c2 = canvas.getContext('2d');
        UI.el('div', 'ar-help', layer, say('Setas: virar · OK: começar, atirar ou parar · Voltar: pausa', 'Arrows turn · OK starts, fires or stops · Back pauses', 'Flechas: girar · OK: empezar, disparar o parar · Atrás: pausa'));
      },
      key: function (k) {
        if (!g) return true;
        if (state === 'ready') { if (k === OK) state = 'play'; return true; }
        if (state === 'paused') { if (k === OK) state = 'play'; return true; }
        if (state === 'over') { if (k === OK) { begin(spec); state = 'play'; } return true; }
        g.key(k);
        return true;
      },
      back: function () {
        if (state === 'play') { state = 'paused'; return true; }
        return false;
      },
      closed: stop
    });
    begin(spec);
    timer = setInterval(tickOnce, TICK);
  }

  /** The Arcade button: pick one of the four. */
  function open_() {
    UI.open({
      cls: 'bt-outside bt-party-pick bt-games bt-arcade-pick',
      build: function (layer, a) {
        var box = UI.el('div', 'bt-box', layer), bests = loadBests();
        UI.el('div', 'sun', box, '🕹');
        UI.heading(box, say('Fliperama', 'Arcade', 'Arcade'), say('Setas e OK, mais nada.', 'Just the arrows and OK.', 'Solo las flechas y OK.'));
        var row = UI.el('div', 'bt-buttons cakes', box);
        for (var i = 0; i < GAMES.length; i++) {
          (function (spec, first) {
            a.add(UI.button(row, spec.icon + '  ' + spec.name(), null, first ? 'primary' : ''), function () { run(spec); }, {first: first});
          })(GAMES[i], i === 0);
        }
        var line = [];
        for (var j = 0; j < GAMES.length; j++) line.push(GAMES[j].name() + ': ' + (GAMES[j].id === 'paddle' ? (bests.paddle || 1) : (bests[GAMES[j].id] || 0)));
        UI.el('div', 'bt-sub', box, say('Melhores: ', 'Bests: ', 'Mejores: ') + line.join('  ·  '));
      }
    });
  }

  return {open: open_, rules: {MAZE: MAZE, open: open, reachable: reachable, wrap: wrap, canTurn: canTurn, bounce: bounce, jellyEvery: jellyEvery,
    // For the tests: a game without a screen, and a stand-in canvas to draw on.
    make: function (id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i].make(); return null; },
    useContext: function (c) { c2 = c; }}};
})();
