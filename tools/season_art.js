/*
 * Draws Beyond TV's own seasonal art for Art mode (Halloween, Christmas) as SVG and renders each to a JPEG in
 * docs/art/<season>/, where the TVs fetch them from GitHub Pages (docs/art/seasons.json lists them).
 * Usage: NODE_PATH=$(npm root -g) node tools/season_art.js   (needs Playwright with Chromium)
 *
 * Everything here is drawn by us, so it is ours to share. Pictures from elsewhere (AI ones we make, too) go in the same
 * folders as JPEGs at 2560 x 1440 and get a line in seasons.json; this script only redraws its own.
 * The top right corner stays quiet: the screensaver's clock card sits there.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.dirname(__dirname);
const W = 1920, H = 1080;

// A small seeded random, so a redraw gives the same stars.
function rng(seed) {
  return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function stars(seed, n, maxY, colour) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * maxY, size = 0.8 + r() * r() * 3.2, o = 0.35 + r() * 0.65;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(2)}" fill="${colour}" opacity="${o.toFixed(2)}"/>`;
    if (size > 3) s += `<path d="M${x - size * 3} ${y}H${x + size * 3}M${x} ${y - size * 3}V${y + size * 3}" stroke="${colour}" stroke-width="0.8" opacity="${(o * 0.6).toFixed(2)}"/>`;
  }
  return s;
}

function bat(x, y, s, fill) {
  return `<path transform="translate(${x} ${y}) scale(${s})" fill="${fill}" d="M0 0c-6-10-18-14-30-12 6 4 8 10 6 16-6-4-14-4-20 0 4 3 6 8 5 13
    -6-5-15-6-22-3 12 2 22 10 26 20 4-6 10-9 17-9 4 0 7 1 10 4 1-4 4-7 8-8 4 1 7 4 8 8 3-3 6-4 10-4 7 0 13 3 17 9 4-10 14-18 26-20
    -7-3-16-2-22 3-1-5 1-10 5-13-6-4-14-4-20 0-2-6 0-12 6-16-12-2-24 2-30 12-2-3-4-5-6-5s-4 2-6 5z"/>`;
}

function pumpkin(cx, cy, r, glow, face) {
  const ribs = [-0.62, -0.3, 0, 0.3, 0.62];
  let body = '';
  for (const k of ribs) {
    const rx = r * (1 - Math.abs(k) * 0.55) * 0.62;
    body += `<ellipse cx="${cx + k * r * 0.9}" cy="${cy}" rx="${rx}" ry="${r * 0.82}" fill="url(#pump)" stroke="#9A4A16" stroke-width="${r * 0.025}"/>`;
  }
  const f = face ? `
    <g fill="${glow}" filter="url(#soft)">
      <path d="M${cx - r * 0.42} ${cy - r * 0.12}l${r * 0.16} ${-r * 0.24}l${r * 0.16} ${r * 0.24}z"/>
      <path d="M${cx + r * 0.1} ${cy - r * 0.12}l${r * 0.16} ${-r * 0.24}l${r * 0.16} ${r * 0.24}z"/>
      <path d="M${cx - r * 0.48} ${cy + r * 0.16}q${r * 0.48} ${r * 0.42} ${r * 0.96} 0l-${r * 0.12} ${r * 0.06}-${r * 0.1} -${r * 0.08}-${r * 0.12} ${r * 0.1}-${r * 0.14} -${r * 0.1}-${r * 0.14} ${r * 0.1}-${r * 0.12} -${r * 0.1}-${r * 0.1} ${r * 0.08}z"/>
    </g>` : '';
  return `<g>
    <ellipse cx="${cx}" cy="${cy + r * 0.8}" rx="${r * 1.1}" ry="${r * 0.14}" fill="#000" opacity="0.35"/>
    ${body}
    <path d="M${cx - r * 0.05} ${cy - r * 0.78}q${r * 0.02} -${r * 0.26} ${r * 0.18} -${r * 0.34}l${r * 0.06} ${r * 0.08}q-${r * 0.12} ${r * 0.1} -${r * 0.1} ${r * 0.28}z" fill="#3E5A2B"/>
    ${f}
  </g>`;
}

function ghost(x, y, s, wave) {
  const arm = wave ? `<path d="M-46 -6q-34 -26 -30 -58" stroke="#F6F2FF" stroke-width="22" stroke-linecap="round" fill="none"/>`
    : `<path d="M-46 -6q-26 10 -34 30" stroke="#F6F2FF" stroke-width="22" stroke-linecap="round" fill="none"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#ghostglow)">
    ${arm}
    <path d="M52 -6q26 10 34 30" stroke="#F6F2FF" stroke-width="22" stroke-linecap="round" fill="none"/>
    <path d="M-56 0c0-60 26-96 56-96s56 36 56 96v86c-10 0-14-14-24-14s-12 18-22 18-12-18-22-18-12 18-22 18-12-14-22-14z" fill="#F6F2FF"/>
    <ellipse cx="-18" cy="-36" rx="8" ry="12" fill="#2C2458"/>
    <ellipse cx="18" cy="-36" rx="8" ry="12" fill="#2C2458"/>
    <ellipse cx="-30" cy="-14" rx="10" ry="6" fill="#FF9EC2" opacity="0.55"/>
    <ellipse cx="30" cy="-14" rx="10" ry="6" fill="#FF9EC2" opacity="0.55"/>
    <path d="M-10 -12q10 10 20 0" stroke="#2C2458" stroke-width="5" stroke-linecap="round" fill="none"/>
  </g>`;
}

const DEFS = `
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="ghostglow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="14" result="b"/>
    <feFlood flood-color="#C9B5FF" flood-opacity="0.7"/><feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <radialGradient id="pump" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#FFB24A"/><stop offset="0.6" stop-color="#E8792A"/><stop offset="1" stop-color="#B4521C"/></radialGradient>
  <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0C18"/><stop offset="0.6" stop-color="#2C2458"/><stop offset="1" stop-color="#4A3389"/></linearGradient>
  <radialGradient id="moon" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#FFF8E2"/><stop offset="1" stop-color="#F2DDA4"/></radialGradient>
  <radialGradient id="moonhalo"><stop offset="0" stop-color="#FFE9B0" stop-opacity="0.45"/><stop offset="1" stop-color="#FFE9B0" stop-opacity="0"/></radialGradient>
`;

function svg(body, defs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${DEFS}${defs || ''}</defs>${body}</svg>`;
}

const HALLOWEEN = [
  {
    file: 'pumpkin-moon', title: 'Pumpkin moon',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#night)"/>
      ${stars(7, 160, 700, '#E9E2FF')}
      <circle cx="560" cy="360" r="360" fill="url(#moonhalo)"/>
      <circle cx="560" cy="360" r="190" fill="url(#moon)"/>
      <circle cx="500" cy="320" r="26" fill="#E8D49A" opacity="0.6"/><circle cx="620" cy="420" r="38" fill="#E8D49A" opacity="0.5"/><circle cx="600" cy="300" r="14" fill="#E8D49A" opacity="0.6"/>
      ${bat(820, 250, 1.6, '#17142A')}${bat(1000, 180, 1.1, '#17142A')}${bat(700, 520, 0.9, '#17142A')}
      <path d="M0 800q300-120 640-60t700 30 580-60V1080H0z" fill="#1E1838"/>
      <path d="M0 880q420-90 880-30t1040-20V1080H0z" fill="#120F22"/>
      <circle cx="480" cy="820" r="170" fill="#FF9A3C" opacity="0.28" filter="url(#glow)"/>
      <circle cx="920" cy="880" r="150" fill="#FF9A3C" opacity="0.25" filter="url(#glow)"/>
      ${pumpkin(470, 840, 130, '#FFE48A', true)}
      ${pumpkin(700, 900, 80, '#FFE48A', false)}
      ${pumpkin(920, 880, 110, '#FFE48A', true)}
      ${pumpkin(1180, 940, 60, '#FFE48A', false)}
    `),
  },
  {
    file: 'friendly-ghosts', title: 'Friendly ghosts',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#night)"/>
      ${stars(21, 200, 1000, '#E9E2FF')}
      <circle cx="1450" cy="860" r="420" fill="#6E3DDB" opacity="0.35" filter="url(#glow)"/>
      ${ghost(560, 520, 2.2, true)}
      ${ghost(900, 380, 1.5, false)}
      ${ghost(1180, 640, 1.2, true)}
      <path d="M0 980q480-60 960-20t960-10V1080H0z" fill="#120F22"/>
    `),
  },
  {
    file: 'four-pumpkins', title: 'Four little pumpkins',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#night)"/>
      ${stars(33, 120, 600, '#E9E2FF')}
      <path d="M0 760H${W}V1080H0z" fill="#17142A"/>
      <path d="M0 760H${W}" stroke="#4A3389" stroke-width="4"/>
      ${[['#2F7D6D', '#1E5A4E'], ['#E8A33D', '#B4721C'], ['#D85A30', '#9E3A1A'], ['#378ADD', '#1F5FA6']].map((c, i) => {
        const cx = 360 + i * 330, r = 120;
        return `<radialGradient id="p${i}" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.4" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient>
          <ellipse cx="${cx}" cy="${740 + r * 0.8}" rx="${r * 1.1}" ry="${r * 0.16}" fill="#000" opacity="0.4"/>
          ${[-0.62, -0.3, 0, 0.3, 0.62].map(k => `<ellipse cx="${cx + k * r * 0.9}" cy="740" rx="${r * (1 - Math.abs(k) * 0.55) * 0.62}" ry="${r * 0.82}" fill="url(#p${i})" stroke="${c[1]}" stroke-width="3"/>`).join('')}
          <path d="M${cx - 6} ${740 - r * 0.78}q2 -30 22 -40l8 10q-14 12 -12 32z" fill="#3E5A2B"/>`;
      }).join('')}
      ${bat(1320, 300, 1.2, '#0D0C18')}${bat(1500, 220, 0.8, '#0D0C18')}
    `),
  },
  {
    file: 'villa-night', title: 'The villa on Halloween',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#night)"/>
      ${stars(45, 180, 650, '#E9E2FF')}
      <circle cx="380" cy="300" r="300" fill="url(#moonhalo)"/>
      <circle cx="380" cy="300" r="140" fill="url(#moon)"/>
      ${bat(560, 260, 1.2, '#17142A')}${bat(700, 340, 0.8, '#17142A')}${bat(480, 420, 0.7, '#17142A')}
      <g fill="#0F0C1C">
        <path d="M640 1080V640l260-180 260 180v440z"/>
        <path d="M1100 1080V700h420v380z"/>
        <path d="M1080 710l230-150 230 150z"/>
        <rect x="1210" y="520" width="40" height="110"/>
        <path d="M600 660h600v14H600z"/>
      </g>
      <g fill="#FFC75A" filter="url(#soft)">
        <rect x="720" y="720" width="70" height="110"/><rect x="1010" y="720" width="70" height="110"/>
        <rect x="1180" y="780" width="80" height="100"/><rect x="1360" y="780" width="80" height="100"/>
        <circle cx="900" cy="590" r="34"/>
      </g>
      <g stroke="#0F0C1C" stroke-width="6"><path d="M755 720v110M720 775h70M1045 720v110M1010 775h70M1220 780v100M1400 780v100"/></g>
      <g fill="#0F0C1C"><path d="M1700 1080l-8-420h18l-6 420z"/>
        ${Array.from({ length: 18 }, (_, i) => { const a = -Math.PI + i * Math.PI / 17; return `<path d="M1700 660q${(Math.cos(a) * 80).toFixed(0)} ${(Math.sin(a) * 60 - 20).toFixed(0)} ${(Math.cos(a) * 150).toFixed(0)} ${(Math.sin(a) * 120 + 40).toFixed(0)}" stroke="#0F0C1C" stroke-width="8" fill="none"/>`; }).join('')}
      </g>
      <path d="M0 1000q960-50 1920 0V1080H0z" fill="#0A0814"/>
      <circle cx="880" cy="1000" r="70" fill="#FF9A3C" opacity="0.3" filter="url(#glow)"/>
      ${pumpkin(880, 1000, 46, '#FFE48A', true)}
    `),
  },
  {
    file: 'black-cat', title: 'Cat on the fence',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#night)"/>
      ${stars(58, 160, 900, '#E9E2FF')}
      <circle cx="900" cy="470" r="420" fill="url(#moonhalo)"/>
      <circle cx="900" cy="470" r="260" fill="url(#moon)"/>
      <g fill="#120F22">
        ${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 142 - 10} 1080V${760 + (i % 2) * 14}l50-40 50 40V1080z"/>`).join('')}
        <rect x="0" y="820" width="${W}" height="26"/><rect x="0" y="960" width="${W}" height="26"/>
      </g>
      <g fill="#07060D" transform="translate(800 520)">
        <ellipse cx="100" cy="180" rx="110" ry="90"/>
        <circle cx="80" cy="60" r="62"/>
        <path d="M36 20l-6-70 46 42zM124 20l6-70-46 42z"/>
        <path d="M200 200q90 -10 70 -120q-10 -40 20 -50" stroke="#07060D" stroke-width="22" fill="none" stroke-linecap="round"/>
        <ellipse cx="60" cy="56" rx="10" ry="14" fill="#E8C64A"/><ellipse cx="102" cy="56" rx="10" ry="14" fill="#E8C64A"/>
        <rect x="58" y="46" width="4" height="22" fill="#07060D"/><rect x="100" y="46" width="4" height="22" fill="#07060D"/>
      </g>
      ${bat(1340, 260, 1, '#17142A')}${bat(520, 200, 0.8, '#17142A')}
    `),
  },
];

// Christmas in New Zealand is summer: pōhutukawa, the beach, pavlova.
const XDEFS = `
  <linearGradient id="summer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FC4F0"/><stop offset="0.55" stop-color="#CDE9F7"/><stop offset="1" stop-color="#FDF3DC"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F8FBF"/><stop offset="1" stop-color="#4FC0D6"/></linearGradient>
  <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DDAE"/><stop offset="1" stop-color="#E5C58A"/></linearGradient>
  <radialGradient id="sun"><stop offset="0" stop-color="#FFF6CF"/><stop offset="0.4" stop-color="#FFE38A" stop-opacity="0.9"/><stop offset="1" stop-color="#FFE38A" stop-opacity="0"/></radialGradient>
  <linearGradient id="xnight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0C18"/><stop offset="1" stop-color="#2C2458"/></linearGradient>
`;

function pohutukawaFlower(x, y, s, seed) {
  const r = rng(seed);
  let g = `<g transform="translate(${x} ${y}) scale(${s})">`;
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, l = 30 + r() * 26;
    const ex = Math.cos(a) * l, ey = Math.sin(a) * l;
    g += `<path d="M0 0L${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="#C81E2C" stroke-width="3"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.2" fill="#F2C14E"/>`;
  }
  return g + `<circle r="10" fill="#9E1622"/></g>`;
}

function leaf(x, y, a, s) {
  return `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M0 0q40-24 90 0q-50 24-90 0z" fill="#2E5B3A"/><path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M0 0h86" stroke="#4E7F57" stroke-width="2"/>`;
}

function tree(cx, base, h, lights) {
  let s = `<rect x="${cx - 20}" y="${base - 40}" width="40" height="60" fill="#6B4226"/>`;
  for (let i = 0; i < 4; i++) {
    const top = base - 40 - h + i * h * 0.22, w = h * (0.22 + i * 0.12);
    s += `<path d="M${cx} ${top}L${cx + w} ${top + h * 0.38}H${cx - w}z" fill="${['#2E7D5B', '#2A7354', '#25684C', '#205C43'][i]}"/>`;
  }
  if (lights) {
    const r = rng(9);
    const cols = ['#E8A33D', '#D85A30', '#378ADD', '#9E7BFF', '#FFF2B0'];
    for (let i = 0; i < 40; i++) {
      const t = r(), y = base - 40 - h * 0.9 + t * h * 0.95, half = h * (0.06 + t * 0.52) * 0.85;
      const x = cx + (r() * 2 - 1) * half;
      const c = cols[i % cols.length];
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="14" fill="${c}" opacity="0.35" filter="url(#soft)"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="6" fill="${c}"/>`;
    }
  }
  s += `<path transform="translate(${cx} ${base - 48 - h})" d="M0-34l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="#FFD866"/>`;
  return s;
}

function present(x, y, w, h, c, ribbon) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}"/><rect x="${x + w / 2 - 8}" y="${y}" width="16" height="${h}" fill="${ribbon}"/><rect x="${x}" y="${y + h * 0.35}" width="${w}" height="14" fill="${ribbon}"/>
    <path d="M${x + w / 2} ${y}q-30 -34 -44 -8q14 14 44 8q30 -34 44 -8q-14 14 -44 8z" fill="${ribbon}"/>`;
}

const CHRISTMAS = [
  {
    file: 'pohutukawa', title: 'Pōhutukawa Christmas',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#summer)"/>
      <circle cx="1250" cy="360" r="260" fill="url(#sun)"/>
      <path d="M0 640H${W}V1080H0z" fill="url(#sea)"/>
      <path d="M0 640H${W}" stroke="#FFFFFF" stroke-width="3" opacity="0.6"/>
      ${Array.from({ length: 10 }, (_, i) => `<path d="M${80 + i * 190} ${700 + (i % 3) * 60}q30 -10 60 0" stroke="#fff" stroke-width="3" opacity="0.5" fill="none"/>`).join('')}
      <path d="M0 920q500-60 1100 10t820 0V1080H0z" fill="url(#sand)"/>
      <path d="M0 0Q280 120 360 420T620 1080H0z" fill="#3B2A22" opacity="0.92"/>
      <path d="M120 0q200 300 120 640" stroke="#3B2A22" stroke-width="40" fill="none"/>
      ${(() => { const r = rng(4); let s = ''; for (let i = 0; i < 70; i++) { const x = r() * 760, y = r() * 760; s += leaf(x, y, r() * 360, 0.8 + r() * 0.6); } return s; })()}
      ${(() => { const r = rng(5); let s = ''; for (let i = 0; i < 46; i++) { const x = 40 + r() * 800, y = 20 + r() * 720; s += pohutukawaFlower(x.toFixed(0), y.toFixed(0), 0.7 + r() * 0.7, i + 11); } return s; })()}
    `, XDEFS),
  },
  {
    file: 'beach-tree', title: 'Christmas at the beach',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#summer)"/>
      <circle cx="1500" cy="300" r="220" fill="url(#sun)"/>
      <path d="M0 600H${W}V1080H0z" fill="url(#sea)"/>
      <path d="M0 780q520-70 1000 0t920-10V1080H0z" fill="url(#sand)"/>
      ${tree(700, 960, 520, true)}
      ${present(480, 880, 120, 90, '#D85A30', '#FFF6E0')}
      ${present(840, 900, 100, 70, '#378ADD', '#E8A33D')}
      ${present(940, 870, 90, 100, '#2F7D6D', '#FFD866')}
      <g transform="translate(1180 960) rotate(-12)"><ellipse rx="44" ry="96" fill="#378ADD"/><path d="M0 -60l-30 30M0 -60l30 30" stroke="#E8A33D" stroke-width="8"/></g>
      <g transform="translate(1290 975) rotate(8)"><ellipse rx="44" ry="96" fill="#378ADD"/><path d="M0 -60l-30 30M0 -60l30 30" stroke="#E8A33D" stroke-width="8"/></g>
      <g transform="translate(1520 900)"><path d="M0 0l-6 180" stroke="#6B4226" stroke-width="8"/><path d="M-200 30q200-120 400 0z" fill="#D85A30"/><path d="M-200 30q60-60 130-80l-30 80zM70-50q70 20 130 80h-100z" fill="#FFF6E0"/></g>
    `, XDEFS),
  },
  {
    file: 'tree-lights', title: 'Lights on the tree',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#xnight)"/>
      ${stars(77, 180, 800, '#E9E2FF')}
      <circle cx="720" cy="620" r="420" fill="#6E3DDB" opacity="0.35" filter="url(#glow)"/>
      ${tree(720, 1000, 720, true)}
      ${present(470, 920, 130, 100, '#D85A30', '#FFD866')}
      ${present(860, 930, 120, 90, '#9E7BFF', '#FFF6E0')}
      <path d="M0 1030H${W}V1080H0z" fill="#120F22"/>
    `, XDEFS),
  },
  {
    file: 'four-baubles', title: 'Four baubles',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="url(#xnight)"/>
      ${stars(88, 140, 1080, '#E9E2FF')}
      <path d="M0 40q960 140 1920 0" stroke="#2E7D5B" stroke-width="60" fill="none"/>
      ${(() => { const r = rng(3); let s = ''; for (let i = 0; i < 60; i++) { const x = i * 33, y = 40 + Math.sin(i / 59 * Math.PI) * 70; s += leaf(x, y + (r() * 30 - 15), r() * 360, 0.6); } return s; })()}
      ${[['#2F7D6D', 330, 420], ['#E8A33D', 640, 560], ['#D85A30', 950, 470], ['#378ADD', 1260, 600]].map(([c, x, y], i) => `
        <radialGradient id="b${i}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.25" stop-color="${c}"/><stop offset="1" stop-color="#0D0C18"/></radialGradient>
        <path d="M${x} ${70 + Math.sin(x / 1920 * Math.PI) * 70}V${y - 130}" stroke="#C9B5FF" stroke-width="3"/>
        <rect x="${x - 20}" y="${y - 140}" width="40" height="28" rx="4" fill="#D9C27A"/>
        <circle cx="${x}" cy="${y}" r="120" fill="${c}" opacity="0.3" filter="url(#glow)"/>
        <circle cx="${x}" cy="${y}" r="115" fill="url(#b${i})"/>`).join('')}
    `, XDEFS),
  },
  {
    file: 'pavlova', title: 'Pav for pudding',
    svg: svg(`
      <rect width="${W}" height="${H}" fill="#F7F1FF"/>
      <circle cx="760" cy="560" r="560" fill="#E6DCFF"/>
      <ellipse cx="760" cy="800" rx="460" ry="70" fill="#C9B5FF" opacity="0.6"/>
      <ellipse cx="760" cy="780" rx="440" ry="60" fill="#FFFFFF" stroke="#D9CCF5" stroke-width="4"/>
      <path d="M420 770q-20-160 60-200q280-60 560 0q80 40 60 200q-340 40-680 0z" fill="#FFF8EA"/>
      <path d="M440 590q320 50 640 0q20 10 0 30q-320 50-640 0q-20-20 0-30z" fill="#FFFFFF"/>
      ${(() => { const r = rng(12); let s = ''; for (let i = 0; i < 22; i++) { const x = 480 + r() * 560, y = 560 + r() * 40; s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(24 + r() * 14).toFixed(0)}" fill="#FFFDF7" stroke="#F1E6CF" stroke-width="2"/>`; } return s; })()}
      ${(() => { const r = rng(14); let s = ''; for (let i = 0; i < 8; i++) { const x = 520 + i * 70 + r() * 20, y = 548 + r() * 30; s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><ellipse rx="34" ry="22" fill="#7FA83B"/><ellipse rx="26" ry="16" fill="#A6CC4F"/><ellipse rx="9" ry="6" fill="#F4F1C8"/>${Array.from({ length: 10 }, (_, k) => `<circle cx="${(Math.cos(k * 0.63) * 15).toFixed(1)}" cy="${(Math.sin(k * 0.63) * 10).toFixed(1)}" r="1.8" fill="#2A2416"/>`).join('')}</g>`; } return s; })()}
      ${(() => { const r = rng(15); let s = ''; for (let i = 0; i < 7; i++) { const x = 540 + i * 80 + r() * 30, y = 520 + r() * 30; s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(r() * 40 - 20).toFixed(0)})"><path d="M0 34c-30-10-30-44 0-50c30 6 30 40 0 50z" fill="#D8303A"/><path d="M-14 -14l14 -10 14 10z" fill="#3E7D3A"/></g>`; } return s; })()}
      ${(() => { const r = rng(16); let s = ''; for (let i = 0; i < 26; i++) { const x = 520 + r() * 480, y = 500 + r() * 70; s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="9" fill="#5B2A86"/>`; } return s; })()}
      ${[0, 1, 2, 3].map(i => `<circle cx="${1380 + (i % 2) * 70}" cy="${820 + Math.floor(i / 2) * 70}" r="26" fill="${['#2F7D6D', '#E8A33D', '#D85A30', '#378ADD'][i]}"/>`).join('')}
    `, XDEFS),
  },
];

const SEASONS = [
  { id: 'halloween', from: '10-24', to: '11-01', art: HALLOWEEN },
  { id: 'christmas', from: '12-01', to: '12-26', art: CHRISTMAS },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 4 / 3 });
  for (const s of SEASONS) {
    const dir = path.join(ROOT, 'docs/art', s.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const a of s.art) {
      await page.setContent(`<html><body style="margin:0">${a.svg}</body></html>`);
      const out = path.join(dir, a.file + '.jpg');
      await page.screenshot({ path: out, type: 'jpeg', quality: 84, clip: { x: 0, y: 0, width: W, height: H } });
      console.log(out, Math.round(fs.statSync(out).size / 1024) + ' KB');
    }
  }
  await browser.close();
})();
