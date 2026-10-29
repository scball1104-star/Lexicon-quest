// Tile maps drawn with Scott's autotile rules (layered A2 terrain, A1 animated water, wall tops + faces).
import { IMG } from './assets.js';
import { a2Quarters, faceQuarters, pickVariant, QUARTERS, QUARTER_OFFSET } from './autotile.js';

export const T = 16;

// terrain ids -> atlas data (coordinates from Scott's tiles.json)
export const TERRAIN = {
  archive_floor: { sheet: 'archive', x: 64, y: 0, order: 0, variants: [[96, 0], [112, 0], [128, 0], [144, 0], [160, 0], [176, 0], [192, 0], [208, 0]], weights: [6, 3, 2, 2, 2, 1, 1, 1] },
  dirt: { sheet: 'terrain', x: 64, y: 0, order: 12, variants: [[128, 144], [144, 144], [160, 144], [176, 144]], weights: [4, 2, 2, 1] },
  grass: { sheet: 'terrain', x: 0, y: 0, order: 16, variants: [[0, 144], [16, 144], [32, 144], [48, 144], [64, 144], [80, 144]], weights: [4, 3, 1, 2, 2, 2] },
  moss: { sheet: 'terrain', x: 96, y: 48, order: 17, variants: [[144, 176], [160, 176]], weights: [1, 1] },
  tallgrass: { sheet: 'terrain', x: 32, y: 0, order: 18, variants: [[96, 144], [112, 144]], weights: [1, 1] },
  plaza: { sheet: 'terrain', x: 96, y: 0, order: 19, variants: [[0, 160], [16, 160], [32, 160], [48, 160], [64, 160], [80, 160]], weights: [3, 2, 2, 1, 1, 1] },
  water: { sheet: 'terrain', x: 0, y: 96, order: 22, anim: true, coll: 'water', variants: [] },
  pit: { sheet: 'terrain', x: 64, y: 48, order: 26, coll: 'pit', variants: [] },
  lava: { sheet: 'terrain', x: 0, y: 96, order: 24, anim: true, coll: 'pit', variants: [] },
  deepwater: { sheet: 'terrain', x: 0, y: 96, order: 23, anim: true, coll: 'pit', variants: [] },
};
export const WALLS = {
  cliff: { sheet: 'cliffs', top: [0, 0], face: [32, 0], topVariants: [[64, 0], [80, 0], [96, 0], [112, 0], [128, 0], [144, 0]], weights: [4, 3, 1, 2, 2, 2] },
  archive: { sheet: 'archive', top: [0, 0], face: [32, 0] },
};

// level chars -> terrain (entities sit on the level's base terrain)
const THEMES = {
  valley: { base: 'grass', wall: 'cliff', chars: { '.': 'grass', ',': 'tallgrass', '-': 'dirt', '~': 'water', '+': 'plaza', 'm': 'moss', 'W': 'deepwater' } },
  archive: { base: 'archive_floor', wall: 'archive', chars: { '.': 'archive_floor', 'O': 'pit', 'x': 'archive_floor' } },
  hollow: { base: 'grass', wall: 'cliff', chars: { '.': 'grass', ',': 'tallgrass', '-': 'plaza', '~': 'water', 'W': 'deepwater', 'O': 'pit', 'x': 'grass' } },
  emberpeak: { base: 'plaza', wall: 'cliff', chars: { '.': 'plaza', ',': 'moss', '-': 'dirt', 'R': 'lava', 'O': 'pit', 'x': 'plaza' } },
  foundry: { base: 'archive_floor', wall: 'archive', chars: { '.': 'archive_floor', 'O': 'pit', 'x': 'archive_floor', 'R': 'lava' } },
  mirror: { base: 'archive_floor', wall: 'archive', chars: { '.': 'archive_floor', 'O': 'pit', 'x': 'archive_floor' } },
  sanctum: { base: 'archive_floor', wall: 'archive', chars: { '.': 'archive_floor', 'O': 'pit', 'x': 'archive_floor' } },
};

export class TileMap {
  constructor(rows, theme) {
    this.theme = THEMES[theme];
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.terrain = [];   // terrain id or null for walls
    this.wall = [];      // 'top' | 'face' | null
    this.coll = [];      // 'none' | 'solid' | 'water' | 'pit'
    this.chars = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = rows[y][x] || '#';
        this.chars.push(c);
        let ter = this.theme.chars[c] || this.theme.base;
        let wall = null;
        if (c === '#') { wall = 'top'; ter = this.theme.base; }
        if (c === 'F') { wall = 'face'; ter = this.theme.base; }
        // secrets: H looks like a wall but you can walk through it; V looks like a pit but holds you up
        if (c === 'H') { wall = 'fake'; ter = this.theme.base; }
        if (c === 'V') { ter = this.theme.base; }
        this.terrain.push(ter);
        this.wall.push(wall);
        this.coll.push(wall && wall !== 'fake' ? 'solid' : (TERRAIN[ter].coll || 'none'));
      }
    }
    this.pw = this.w * T; this.ph = this.h * T;
    this.frames = [];
  }
  idx(x, y) { return y * this.w + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  charAt(x, y) { return this.inside(x, y) ? this.chars[this.idx(x, y)] : '#'; }
  collAt(tx, ty) { return this.inside(tx, ty) ? this.coll[this.idx(tx, ty)] : 'solid'; }
  setColl(tx, ty, c) { if (this.inside(tx, ty)) this.coll[this.idx(tx, ty)] = c; }
  terrainAt(tx, ty) { return this.inside(tx, ty) ? this.terrain[this.idx(tx, ty)] : this.theme.base; }

  render() {
    const hasAnim = this.terrain.some((t) => TERRAIN[t].anim);
    const n = hasAnim ? 3 : 1;
    for (let f = 0; f < n; f++) {
      const c = document.createElement('canvas');
      c.width = this.pw; c.height = this.ph;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.drawCell(g, x, y, f);
      this.frames.push(c);
    }
  }

  nb(x, y, test) {
    const t = (dx, dy) => {
      const nx = x + dx, ny = y + dy;
      if (!this.inside(nx, ny)) return true;
      return test(nx, ny);
    };
    return { N: t(0, -1), S: t(0, 1), W: t(-1, 0), E: t(1, 0), NE: t(1, -1), NW: t(-1, -1), SE: t(1, 1), SW: t(-1, 1) };
  }

  drawA2(g, img, bx, by, nb, px, py) {
    const qs = a2Quarters(nb);
    QUARTERS.forEach((q, i) => {
      const [qx, qy] = qs[i];
      const [ox, oy] = QUARTER_OFFSET[q];
      g.drawImage(img, bx + qx * 8, by + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
    });
  }

  drawCell(g, x, y, frame) {
    const px = x * T, py = y * T;
    const me = TERRAIN[this.terrainAt(x, y)];
    // collect terrains in the 3x3 with order <= mine
    const set = new Map();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const id = this.terrainAt(Math.max(0, Math.min(this.w - 1, x + dx)), Math.max(0, Math.min(this.h - 1, y + dy)));
      const t = TERRAIN[id];
      if (t.order <= me.order) set.set(id, t);
    }
    const layers = [...set.entries()].sort((a, b) => a[1].order - b[1].order);
    layers.forEach(([id, t], li) => {
      const img = IMG[t.sheet];
      const fx = t.anim ? frame * 32 : 0;
      const nb = li === 0 ? null : this.nb(x, y, (nx, ny) => TERRAIN[this.terrainAt(nx, ny)].order >= t.order);
      const full = !nb || Object.values(nb).every(Boolean);
      if (full && t.variants.length) {
        const k = pickVariant(x, y, t.weights);
        const [vx, vy] = t.variants[k];
        g.drawImage(img, vx, vy, 16, 16, px, py, 16, 16);
      } else {
        this.drawA2(g, img, t.x + fx, t.y, nb || { N: true, S: true, E: true, W: true, NE: true, NW: true, SE: true, SW: true }, px, py);
      }
    });
    const w = this.wall[this.idx(x, y)];
    if (w) {
      const W = WALLS[this.theme.wall];
      const img = IMG[W.sheet];
      if (w === 'top') {
        const nb = this.nb(x, y, (nx, ny) => this.wall[this.idx(nx, ny)] === 'top');
        const full = Object.values(nb).every(Boolean);
        if (full && W.topVariants) {
          const [vx, vy] = W.topVariants[pickVariant(x, y, W.weights)];
          g.drawImage(img, vx, vy, 16, 16, px, py, 16, 16);
        } else {
          if (this.theme.wall === 'archive') { g.fillStyle = '#14101e'; g.fillRect(px, py, 16, 16); }
          this.drawA2(g, img, W.top[0], W.top[1], nb, px, py);
        }
      } else {
        const same = (dx, dy) => { const nx = x + dx, ny = y + dy; return this.inside(nx, ny) && this.wall[this.idx(nx, ny)] === 'face'; };
        const qs = faceQuarters(same(-1, 0), same(0, -1), same(1, 0), same(0, 1));
        QUARTERS.forEach((q, i) => {
          const [qx, qy] = qs[i];
          const [ox, oy] = QUARTER_OFFSET[q];
          g.drawImage(img, W.face[0] + qx * 8, W.face[1] + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
        });
      }
    }
  }

  draw(ctx, camX, camY, vw, vh, time) {
    const f = this.frames.length > 1 ? [0, 1, 2, 1][Math.floor(time / 0.22) % 4] : 0;
    const sx = Math.max(0, Math.floor(camX)), sy = Math.max(0, Math.floor(camY));
    const w = Math.min(vw, this.pw - sx), h = Math.min(vh, this.ph - sy);
    ctx.drawImage(this.frames[f], sx, sy, w, h, sx - Math.floor(camX), sy - Math.floor(camY), w, h);
  }
}
