// Draws the Games screen's thumbnails (web/games/<id>.jpg, 560 x 316), one little scene per game, in Beyond's
// colours. The TVs show the pictures, so no TV needs an emoji font. Run: node tools/game_art.js (or name some: node tools/game_art.js road)
// Needs Playwright's Chromium and the Noto Color Emoji font.
'use strict';
var fs = require('fs');
var path = require('path');
var chromium = require('playwright').chromium;

var OUT = path.join(__dirname, '..', 'web', 'games');
var W = 560, H = 316;

// Each scene: a background and a few emoji, placed as [emoji, x, y, size, turn in degrees].
var SCENES = {
  rcland: {sky: ['#6EC6FF', '#BDE6FF'], ground: '#5DAA4F', ramp: true,
    art: [['⭐', 120, 70, 44, 0], ['⭐', 440, 58, 36, 10], ['🏎️', 300, 128, 150, -18], ['🚜', 470, 248, 70, 0], ['🚧', 70, 262, 48, 0]]},
  arcade: {bg: ['#0D0C18', '#2C2458'], grid: '#9E7BFF',
    art: [['👾', 120, 100, 80, -8], ['🕹️', 280, 170, 150, 0], ['🚀', 450, 96, 80, 30], ['⭐', 470, 230, 34, 0]]},
  table: {bg: ['#1E6B4F', '#2F7D6D'], felt: true,
    art: [['♟️', 150, 160, 130, 0], ['🎲', 300, 200, 90, -14], ['🎲', 380, 150, 70, 18], ['🃏', 460, 190, 110, 12]]},
  silly: {bg: ['#F2C94C', '#E8A33D'], burst: '#FFE7A3',
    art: [['🤪', 280, 160, 170, -6], ['😂', 100, 90, 70, -12], ['🙃', 460, 240, 70, 12], ['❓', 470, 80, 56, 14]]},
  karaoke: {bg: ['#3B1E86', '#6E3DDB'], beams: true,
    art: [['🎤', 280, 170, 160, -20], ['🎵', 110, 100, 64, -10], ['🎶', 450, 90, 70, 12], ['✨', 450, 240, 44, 0]]},
  party: {bg: ['#D85A30', '#E8A33D'], confetti: true,
    art: [['🎉', 170, 170, 140, -10], ['🎈', 420, 120, 120, 8], ['🎂', 370, 250, 70, 0]]},
  lights: {bg: ['#0D0C18', '#241E4A'], beams: true, rainbow: true,
    art: [['✨', 280, 160, 140, 0], ['💡', 110, 230, 70, -12], ['🌈', 440, 215, 76, 0]]},
  quiz: {bg: ['#6E3DDB', '#9E7BFF'], burst: '#B9A1FF',
    art: [['🏆', 280, 165, 160, 0], ['❓', 100, 110, 70, -16], ['❓', 470, 100, 60, 16], ['⭐', 460, 250, 40, 0]]},
  dinner: {bg: ['#B5562E', '#E8A33D'], table: '#F7F6F2',
    art: [['🍽️', 260, 190, 140, 0], ['💬', 430, 90, 90, 8], ['🥕', 90, 240, 56, -20]]},
  lunch: {bg: ['#378ADD', '#6EC6FF'], gingham: true,
    art: [['🥪', 230, 170, 140, -8], ['🍎', 420, 110, 80, 10], ['🧃', 430, 240, 70, 0], ['🥕', 90, 100, 60, -30]]},
  tidy: {bg: ['#2F7D6D', '#5CC4AE'], speed: true,
    art: [['🧹', 220, 170, 150, -24], ['🧺', 420, 210, 100, 0], ['⏱️', 450, 80, 64, 10], ['⭐', 90, 80, 40, 0]]},
  bedtime: {bg: ['#0D0C18', '#2C2458'], stars: true,
    art: [['🌙', 290, 150, 150, -10], ['☁️', 120, 240, 90, 0], ['⭐', 460, 90, 40, 0], ['⭐', 100, 80, 30, 0]]},
  // Build it (builder.js, ADR 0052).
  road: {sky: ['#6EC6FF', '#BDE6FF'], ground: '#5DAA4F', road: true,
    art: [['🏗️', 450, 96, 110, 0], ['👷', 200, 150, 120, -6], ['🚧', 380, 236, 74, 0], ['🚛', 90, 246, 64, 0]]},
  bridge: {sky: ['#6EC6FF', '#CDEBFF'], ground: '#3E9BD6', bridge: true,
    art: [['🚚', 300, 120, 70, 0], ['⛵', 120, 250, 56, 0], ['👷', 480, 150, 80, 0]]},
  guides: {bg: ['#F7F6F2', '#E7E3F7'], burst: '#FFFFFF',
    art: [['📖', 260, 175, 160, -6], ['💡', 450, 90, 80, 12], ['⭐', 90, 90, 40, 0]]}
};

function page() {
  return '<!DOCTYPE html><html><body style="margin:0"><canvas id="c" width="' + W + '" height="' + H + '"></canvas></body></html>';
}

/* Runs in the page: draws one scene. */
function draw(s) {
  var W = 560, H = 316, c = document.getElementById('c').getContext('2d'), i;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  function grad(a, b) { var g = c.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  if (s.sky) {
    var sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, s.sky[0]); sky.addColorStop(1, s.sky[1]);
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    [[90, 50], [380, 40]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 22, 0, 7); c.arc(p[0] + 26, p[1] - 8, 26, 0, 7); c.arc(p[0] + 54, p[1], 20, 0, 7); c.fill(); });
    c.fillStyle = s.ground; c.fillRect(0, 210, W, H - 210);
    c.fillStyle = '#C99B63'; c.fillRect(0, 262, W, 26);
  } else {
    c.fillStyle = grad(s.bg[0], s.bg[1]); c.fillRect(0, 0, W, H);
  }
  if (s.road) {
    // A road half built: asphalt on the left, gravel on the right, white dashes down the middle.
    c.fillStyle = '#2B2A33'; c.fillRect(0, 248, W * 0.55, 44);
    c.fillStyle = '#A9A49A'; c.fillRect(W * 0.55, 248, W * 0.45, 44);
    c.fillStyle = '#F7F6F2'; for (i = 10; i < W * 0.5; i += 70) c.fillRect(i, 267, 40, 6);
  }
  if (s.bridge) {
    // Water under a steel arch bridge, a bank at each end.
    c.fillStyle = '#3E9BD6'; c.fillRect(0, 210, W, H - 210);
    c.fillStyle = '#5DAA4F'; c.beginPath(); c.moveTo(0, 160); c.lineTo(70, 160); c.lineTo(40, H); c.lineTo(0, H); c.fill();
    c.beginPath(); c.moveTo(W, 160); c.lineTo(W - 70, 160); c.lineTo(W - 40, H); c.lineTo(W, H); c.fill();
    c.strokeStyle = '#5B6270'; c.lineWidth = 12; c.beginPath(); c.moveTo(60, 250); c.quadraticCurveTo(W / 2, 40, W - 60, 250); c.stroke();
    c.lineWidth = 4; for (i = 1; i < 10; i++) { var bx = 70 + i * (W - 140) / 10, t = (bx - 60) / (W - 120), ay = 250 - 4 * t * (1 - t) * 105; c.beginPath(); c.moveTo(bx, 156); c.lineTo(bx, ay); c.stroke(); }
    c.fillStyle = '#3E434D'; c.fillRect(0, 148, W, 14);
  }
  if (s.ramp) {
    c.fillStyle = '#8F5E37'; c.beginPath(); c.moveTo(30, 262); c.lineTo(230, 262); c.lineTo(230, 176); c.closePath(); c.fill();
    c.fillStyle = '#F2C98E'; c.beginPath(); c.moveTo(30, 262); c.lineTo(230, 176); c.lineTo(230, 186); c.lineTo(46, 262); c.closePath(); c.fill();
  }
  if (s.grid) {
    c.strokeStyle = s.grid; c.globalAlpha = 0.35; c.lineWidth = 2;
    for (i = 0; i <= 14; i++) { c.beginPath(); c.moveTo(W / 2 + (i - 7) * 20, 190); c.lineTo(W / 2 + (i - 7) * 90, H); c.stroke(); }
    for (i = 0; i < 6; i++) { var y = 190 + Math.pow(i / 5, 1.8) * (H - 190); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.globalAlpha = 1;
  }
  if (s.felt) {
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 3;
    c.strokeRect(24, 24, W - 48, H - 48);
  }
  if (s.burst) {
    c.save(); c.translate(W / 2, H / 2); c.fillStyle = s.burst; c.globalAlpha = 0.35;
    for (i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(400, -50); c.lineTo(400, 50); c.closePath(); if (i % 2) c.fill(); }
    c.restore(); c.globalAlpha = 1;
  }
  if (s.beams) {
    var cols = s.rainbow ? ['#D85A30', '#E8A33D', '#5CC4AE', '#378ADD', '#9E7BFF'] : ['#9E7BFF', '#FFFFFF', '#9E7BFF'];
    for (i = 0; i < cols.length; i++) {
      var x = 60 + i * (W - 120) / (cols.length - 1);
      var g = c.createLinearGradient(x, 0, W / 2, H); g.addColorStop(0, cols[i]); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalAlpha = 0.35; c.fillStyle = g;
      c.beginPath(); c.moveTo(x - 10, 0); c.lineTo(x + 10, 0); c.lineTo(W / 2 + 120 + (x - W / 2) * 0.3, H); c.lineTo(W / 2 - 120 + (x - W / 2) * 0.3, H); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
  }
  if (s.confetti) {
    var cc = ['#F7F6F2', '#378ADD', '#2F7D6D', '#9E7BFF', '#F2C94C'];
    for (i = 0; i < 70; i++) { c.save(); c.translate(rnd() * W, rnd() * H); c.rotate(rnd() * 6); c.fillStyle = cc[i % cc.length]; c.fillRect(-6, -3, 12, 6); c.restore(); }
  }
  if (s.table) {
    c.fillStyle = 'rgba(247,246,242,0.18)'; c.beginPath(); c.ellipse(W / 2, H - 40, 300, 90, 0, 0, 7); c.fill();
  }
  if (s.gingham) {
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (i = 0; i < W; i += 56) c.fillRect(i, 0, 28, H);
    for (i = 0; i < H; i += 56) c.fillRect(0, i, W, 28);
  }
  if (s.speed) {
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 6; c.lineCap = 'round';
    for (i = 0; i < 9; i++) { var yy = 40 + i * 30; c.beginPath(); c.moveTo(20 + (i % 3) * 30, yy); c.lineTo(110 + (i % 3) * 30, yy); c.stroke(); }
  }
  if (s.stars) {
    for (i = 0; i < 60; i++) { c.fillStyle = 'rgba(247,246,242,' + (0.3 + rnd() * 0.6) + ')'; c.beginPath(); c.arc(rnd() * W, rnd() * H, 1 + rnd() * 2, 0, 7); c.fill(); }
  }
  // Soft light behind the main picture.
  var main = s.art.reduce(function (a, b) { return b[3] > a[3] ? b : a; });
  var glow = c.createRadialGradient(main[1], main[2], 10, main[1], main[2], main[3] * 1.1);
  glow.addColorStop(0, 'rgba(255,255,255,0.45)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = glow; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (i = 0; i < s.art.length; i++) {
    var a = s.art[i];
    c.save(); c.translate(a[1], a[2]); c.rotate(a[4] * Math.PI / 180);
    c.font = a[3] + 'px "Noto Color Emoji"';
    c.shadowColor = 'rgba(13,12,24,0.35)'; c.shadowBlur = a[3] * 0.12; c.shadowOffsetY = a[3] * 0.06;
    c.fillText(a[0], 0, 0);
    c.restore();
  }
}

(async function () {
  fs.mkdirSync(OUT, {recursive: true});
  var browser = await chromium.launch();
  var p = await browser.newPage({viewport: {width: W, height: H}});
  await p.setContent(page());
  await p.evaluate(function () { return document.fonts.load('40px "Noto Color Emoji"', '🎤'); });
  // node tools/game_art.js road: only the pictures named, so the others stay as they are.
  var names = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(SCENES);
  for (var i = 0; i < names.length; i++) {
    await p.evaluate(draw, SCENES[names[i]]);
    var shot = await p.locator('#c').screenshot({type: 'jpeg', quality: 82});
    fs.writeFileSync(path.join(OUT, names[i] + '.jpg'), shot);
  }
  await browser.close();
  console.log('Drew ' + names.length + ' thumbnails in web/games/');
})();
