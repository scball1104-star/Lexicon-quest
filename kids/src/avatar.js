// Kid-made heroes: Scott's hero sprite recolored (hair, skin, outfit) with a hat baked on top, plus pets.
import { IMG, ENEMY_FRAMES } from './assets.js';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const SRC = {
  hair: ['#b87942', '#8f5533', '#6e3d2c', '#482826'],
  skin: ['#e8b585', '#fae2cb', '#cc875b', '#a66142'],
  outfit: ['#4064b9', '#2c4797', '#1d2a67', '#0e153b'],
};

export const HAIR = {
  Brown: SRC.hair,
  Black: ['#4c445c', '#2e2b4c', '#1d1a2e', '#14101e'],
  Blonde: ['#f9d77a', '#eba14d', '#c38334', '#8f5533'],
  Red: ['#ee7a4f', '#c8452f', '#8a2a25', '#5a1a1e'],
  Blue: ['#7ac3ef', '#3e88ca', '#2c4797', '#1d2a67'],
  Pink: ['#f6b0cf', '#d66a9a', '#a1456f', '#6a2a4a'],
  Green: ['#a6dc72', '#5fa043', '#3c6e33', '#244528'],
  Silver: ['#f6f4ee', '#cfc8d6', '#9a93a8', '#66637f'],
};
export const SKIN = {
  Peach: SRC.skin,
  Tan: ['#dba273', '#f0c99a', '#b87942', '#8f5533'],
  Brown: ['#b87942', '#d09466', '#8f5533', '#6e3d2c'],
  Deep: ['#8a5636', '#a86c48', '#68402b', '#482826'],
};
export const OUTFIT = {
  Blue: SRC.outfit,
  Red: ['#e8573e', '#b8302a', '#7a1d22', '#4a1018'],
  Green: ['#62a845', '#3c7a33', '#265228', '#14301a'],
  Purple: ['#9a6ad0', '#7040aa', '#4a3888', '#2e2258'],
  Gold: ['#f9d77a', '#e39a3f', '#b0702a', '#6e3d2c'],
  Teal: ['#6ad3c8', '#3a9e9a', '#256a6e', '#14404a'],
  Pink: ['#f6a3c6', '#d6618f', '#9f3d66', '#5e2240'],
  Black: ['#66637f', '#4c445c', '#2e2b4c', '#14101e'],
};

// Hats: rows drawn centred on the head, bottom row sits `sink` px into the hair.
// palette: k outline, then letters per hat
export const HATS = {
  None: null,
  Halo: null,
  Captain: null,
  Shades: null,
  Miner: null, Pirate: null, Astro: null, Tiara: null, Witch: null, Beanie: null, Sunhat: null, Chef: null, Laurel: null,
  Cap: { sink: 5, pal: { k: '#2d1b1f', r: '#d8443a', d: '#8a2a25', w: '#f6f4ee' }, rows: [
    '....kkkkkk....',
    '...krrrwrrk...',
    '..krrrrrrrrk..',
    '.krrrrrrrrrrk.',
    'kddddddddddddk',
    '.kkkkkkkkkkkk.'] },
  Crown: { sink: 4, pal: { k: '#2d1b1f', y: '#f9d77a', o: '#eba14d', d: '#c38334', r: '#e8573e', b: '#3e88ca' }, rows: [
    '.k...k..k...k.',
    'kyk.kyk.kyk.ky',
    'kyykyyokyyokyk',
    'kyyyyyyyyyyyyk',
    'kooroobooroook',
    'kddddddddddddk',
    '.kkkkkkkkkkkk.'] },
  Wizard: { sink: 4, pal: { k: '#2d1b1f', p: '#7040aa', l: '#9a6ad0', d: '#4a3888', y: '#f9d77a' }, rows: [
    '......kk......',
    '.....kpk......',
    '.....kpk......',
    '....kplpk.....',
    '....kpppk.....',
    '...kpypppk....',
    '...kplpppk....',
    '..kppppplpk...',
    '..kpppppppk...',
    'kkddddddddddkk',
    'kddddddddddddk',
    '.kkkkkkkkkkkk.'] },
  Flower: { sink: 3, pal: { k: '#2d1b1f', p: '#f6a3c6', y: '#f9d77a', g: '#62a845' }, rows: [
    '..........kk..',
    '.........kppk.',
    '........kpypk.',
    '.........kppk.',
    '........gkk...',
    '.......g......'] },
  Bunny: { sink: 3, pal: { k: '#2d1b1f', w: '#f6f4ee', p: '#f6a3c6' }, rows: [
    '..kk......kk..',
    '.kwwk....kwwk.',
    '.kwpk....kpwk.',
    '.kwpk....kpwk.',
    '.kwpk....kpwk.',
    '.kwwk....kwwk.',
    '..kwk....kwk..',
    '..kwk....kwk..'] },
  Horns: { sink: 4, pal: { k: '#2d1b1f', s: '#b3b6c4', d: '#66637f', w: '#f6f4ee', h: '#ebdfc8' }, rows: [
    'kk..........kk',
    'khk........khk',
    'kwhk.kkkk.khwk',
    '.kwkksssskkwk.',
    '..kssssssssk..',
    '.kssdsdsdsssk.',
    'kddddddddddddk',
    '.kkkkkkkkkkkk.'] },
  Bow: { sink: 3, pal: { k: '#2d1b1f', r: '#d6618f', l: '#f6a3c6' }, rows: [
    '.......kk..kk.',
    '......krlkkrlk',
    '......krrkkrrk',
    '.......kk..kk.'] },
};

// cosmetic unlocks by total stars
export const UNLOCKS = { Cap: 0, Bow: 0, Flower: 1, Bunny: 2, Horns: 3, Wizard: 4, Crown: 6, Halo: 'secret', Captain: 'secret', Shades: 'secret', Miner: 'secret',
  Pirate: 'runway', Astro: 'runway', Tiara: 'runway', Witch: 'runway', Beanie: 'runway', Sunhat: 'runway', Chef: 'runway', Laurel: 'arena' };

export const ADJ = ['Brave', 'Swift', 'Clever', 'Mighty', 'Lucky', 'Sunny', 'Jolly', 'Bold', 'Sparkly', 'Quiet', 'Zippy', 'Cosmic'];
export const NOUN = ['Otter', 'Fox', 'Comet', 'Badger', 'Falcon', 'Pebble', 'Dragon', 'Owl', 'Turtle', 'Lantern', 'Rocket', 'Panda'];
export const PET_NAMES = ['Blip', 'Mochi', 'Pip', 'Noodle', 'Biscuit', 'Waffle', 'Sprout', 'Bean', 'Ziggy', 'Pudding', 'Tofu', 'Dot'];

export const PETS = {
  Slime: { frames: 'ink_slime', hues: { Blue: 65, Pink: 185, Green: 0, Gold: 260, Purple: 130 } },
  Beetle: { frames: 'moss_scarab', hues: { Blue: 0, Green: 280, Red: 140, Gold: 185, Purple: 60 } },
  Page: { frames: 'lost_page', hues: { Paper: 0, Blue: 170, Pink: 290, Green: 80, Gold: 10 } },
  Pup: { frames: 'ink_slime', hues: { Gold: 0, Paper: 0, Pink: 0, Blue: 0, Red: 0 } },
};

export function defaultHero() {
  return { name: 'Brave Otter', hair: 'Brown', skin: 'Classic', outfit: 'Blue', hat: 'Cap', item: 'Sword', pet: 'Slime', petColor: 'Blue', petName: 'Blip' };
}

function mapper(cfg) {
  const m = { all: new Map(), hair: new Map() };
  const add = (map, src, dst) => src.forEach((s, i) => map.set(s, hex(dst[i])));
  add(m.hair, SRC.hair, HAIR[cfg.hair] || SRC.hair);
  add(m.all, SRC.skin, SKIN[cfg.skin] || SRC.skin);
  add(m.all, SRC.outfit, OUTFIT[cfg.outfit] || SRC.outfit);
  return m;
}

/** Bake the 4x4 walk sheet (96x128) for a hero config, hat included. */
export function bakeHero(cfg) {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 128;
  const g = c.getContext('2d');
  g.drawImage(IMG.party_field, 0, 0, 96, 128, 0, 0, 96, 128);
  const d = g.getImageData(0, 0, 96, 128);
  const m = mapper(cfg);
  const key = (r, gg, b) => '#' + [r, gg, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  for (let y = 0; y < 128; y++) for (let x = 0; x < 96; x++) {
    const i = (y * 96 + x) * 4;
    if (d.data[i + 3] === 0) continue;
    const k = key(d.data[i], d.data[i + 1], d.data[i + 2]);
    const rowInCell = y % 32;
    const t = (rowInCell < 15 && m.hair.get(k)) || m.all.get(k);
    if (t) { d.data[i] = t[0]; d.data[i + 1] = t[1]; d.data[i + 2] = t[2]; }
  }
  g.putImageData(d, 0, 0);
  const hat = HATS[cfg.hat];
  if (hat) {
    for (let dir = 0; dir < 4; dir++) for (let f = 0; f < 4; f++) {
      const cx = f * 24, cy = dir * 32;
      // head top = first opaque row of the cell
      let top = 0;
      outer: for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) {
        if (d.data[((cy + y) * 96 + cx + x) * 4 + 3] > 0) { top = y; break outer; }
      }
      const shift = dir === 1 ? -1 : dir === 2 ? 1 : 0;
      const w = hat.rows[0].length;
      const ox = cx + 12 - Math.floor(w / 2) + shift;
      const oy = cy + top + hat.sink - hat.rows.length + 1;
      const flip = dir === 2;
      hat.rows.forEach((row, ry) => {
        for (let rx = 0; rx < w; rx++) {
          const ch = row[flip ? w - 1 - rx : rx];
          if (!ch || ch === '.') continue;
          g.fillStyle = hat.pal[ch];
          g.fillRect(ox + rx, oy + ry, 1, 1);
        }
      });
    }
  }
  return c;
}

// ---- hue shift for pets ----
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
export function hueShifted(img, rect, deg, satBoost = 0) {
  const [sx, sy, w, h] = rect;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  if (!deg && !satBoost) return c;
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    if (!d.data[i + 3]) continue;
    let [hh, s, l] = rgb2hsl(d.data[i], d.data[i + 1], d.data[i + 2]);
    if (s < 0.12 && l < 0.2) continue; // keep outlines
    hh = (hh + deg / 360) % 1; s = Math.min(1, s + satBoost);
    const [r, gg, b] = hsl2rgb(hh, s, l);
    d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b;
  }
  g.putImageData(d, 0, 0);
  return c;
}

export function bakePet(cfg) {
  const p = PETS[cfg.pet] || PETS.Slime;
  const deg = p.hues[cfg.petColor] ?? 0;
  const sat = cfg.pet === 'Slime' ? 0.15 : 0;
  return ENEMY_FRAMES[p.frames].map((r) => hueShifted(IMG.enemies_field, r, deg, sat));
}
