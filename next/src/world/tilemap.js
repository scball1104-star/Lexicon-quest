// TileMap: turns a map module (DESIGN 5.1 + docs/WORLD.md) into cached layers, a collision grid and a
// list of y-sorted props. Owner: W2-world.
//
//   const map = new TileMap(engine, mapModule);
//   map.collisionAt(x, y)            'none' | 'solid' | 'water' | 'ledge_s' | 'ledge_e' | 'ledge_w' | 'pit' | 'counter'
//   map.setTile(x, y, id)            swap a plain tile / overlay (doors, switches, bridges) and repaint that spot
//   map.drawGround(r, cam, frame)    blit the visible ground window (frame = water animation phase)
//   map.drawOverhead(r, cam)         canopies, roof ridges, arches: above actors
//   map.props                        y-sorted drawables: { sortY, draw(r, t), cells, solid, ... }
//   map.addProp(spec) / removeProp(p) / setPropSprite(p, id) / moveProp(p, x, y)
//   new TileMap(engine, mod, { hasFlag })   E2: `overlays` and `overhead` entries may carry if / ifNot
//   map.refreshGated(hasFlag)        a flag changed: add or remove gated overlays / overhead tiles and repaint
//   map.reflectAt(x, y)              E2: a reflective cell (terrain or tile with `reflect: true`)
//
// Layers: terrain (A2 autotiles layered by terrainOrder, A1 water/ink animated), wall tops and faces,
// legend tiles, decor tiles, overlays, then the base rows of buildings go into `ground`; the top rows of
// buildings and the `overhead` list go into `overhead`. Props (tiles.json kind prop/door, every
// props.json object, mechanism events) are drawn by the field, sorted with the actors by their feet row.

import { a2Quarters, faceQuarters, line16Index, pickVariant, terrainLayers, neighbours, allConnected, QUARTERS, QUARTER_OFFSET } from './autotile.js';
import { matches } from '../data/story/dialogue.js';

export const TILE = 16;
const WALKABLE = new Set(['none', 'ledge_s', 'ledge_e', 'ledge_w', 'pit', 'counter']);

export function isBlocking(code) { return code === 'solid' || code === 'water' || code === 'counter' || code === 'void'; }

/** Is a flag-gated map entry (`if` / `ifNot`) present for these flags? No condition: always. */
export function gatedPresent(entry, hasFlag) {
  if (!entry || (entry.if == null && entry.ifNot == null)) return true;
  return !!hasFlag && matches(entry, hasFlag);
}

/**
 * W11 (CRITIQUE_4 item 13): a rim round a tile rect (mod.rims = [{ x, y, w, h, color, hi, lo, inset }], tiles): a
 * dark outer line, the rim itself and a light inner highlight on its north and west sides, so an island, a dais or
 * a pool sits in its floor with a dressed edge instead of a pasted block.
 */
function paintRim(g, o) {
  const x0 = o.x * 16 + (o.inset || 0), y0 = o.y * 16 + (o.inset || 0);
  const w = o.w * 16 - 2 * (o.inset || 0), h = o.h * 16 - 2 * (o.inset || 0);
  g.save();
  const line = (c, x, y, ww, hh) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
  const t = o.thick || 2;
  if (o.lo) { line(o.lo, x0 - 1, y0 - 1, w + 2, 1); line(o.lo, x0 - 1, y0 + h, w + 2, 1); line(o.lo, x0 - 1, y0, 1, h); line(o.lo, x0 + w, y0, 1, h); }
  line(o.color, x0, y0, w, t); line(o.color, x0, y0 + h - t, w, t); line(o.color, x0, y0, t, h); line(o.color, x0 + w - t, y0, t, h);
  if (o.hi) { line(o.hi, x0, y0, w, 1); line(o.hi, x0, y0, 1, h); }
  if (o.shade) { line(o.shade, x0 + t, y0 + h - t, w - t, 1); line(o.shade, x0 + w - t, y0 + t, 1, h - t); }
  g.restore();
}

const BAYER4_T = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hashT = (x, y, salt) => { let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
/**
 * W11: one cell of still night water (mod.voidWater = { sys, ramp: [4 colours dark to light], glint }): deep navy
 * with long dithered swells, a few short pale ripple dashes and, now and then, the moon's glint. Static (baked into
 * the ground layer), seeded per cell so it never repeats on a grid.
 */
function paintNightWater(g, x, y, o) {
  const ramp = o.ramp || ['#0c0f24', '#121733', '#1a2145', '#28335e'];
  const px = x * 16, py = y * 16;
  g.save();
  for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) {
    const wx = px + xx, wy = py + yy;
    const swell = 0.5 + 0.5 * Math.sin(wy * 0.55 + Math.sin(wx * 0.09 + wy * 0.02) * 2.2);
    const v = swell * 1.6 + (hashT(wx >> 3, wy >> 2, 7) - 0.5) * 0.5;
    const th = (BAYER4_T[(wy & 3) * 4 + (wx & 3)] + 0.5) / 16;
    const i = Math.max(0, Math.min(2, Math.floor(v) + (v - Math.floor(v) > th ? 1 : 0)));
    g.fillStyle = ramp[i];
    g.fillRect(wx, wy, 1, 1);
  }
  // ripple dashes and a glint
  const r1 = hashT(x, y, 11), r2 = hashT(x, y, 12);
  g.fillStyle = ramp[3];
  if (r1 < 0.55) { const dx = Math.floor(r2 * 9), dy = 3 + Math.floor(hashT(x, y, 13) * 10); g.fillRect(px + dx, py + dy, 4 + Math.floor(r1 * 6), 1); }
  if (hashT(x, y, 14) < 0.12) { g.fillStyle = o.glint || '#cfd8ff'; const gx = px + 3 + Math.floor(r2 * 10), gy = py + 2 + Math.floor(r1 * 11); g.fillRect(gx, gy, 2, 1); g.globalAlpha = 0.6; g.fillRect(gx - 2, gy + 1, 6, 1); }
  g.restore();
}

export class TileMap {
  constructor(engine, mod, opts = {}) {
    this.engine = engine;
    this.mod = mod;
    this.hasFlag = opts.hasFlag || null;
    this.gated = [];       // E2: flag-gated overlays [{ o, on }] (re-evaluated by refreshGated)
    this.gatedOverhead = [];
    this.id = mod.id;
    this.db = engine.assets.json('tiles') || { terrains: {}, walls: {}, tiles: {}, objects: {}, terrainOrder: [] };
    const propsAtlas = engine.assets.has('props') ? engine.assets.atlas('props') : null;
    this.propsDb = propsAtlas && propsAtlas.meta && propsAtlas.meta.objects ? propsAtlas.meta.objects : {};
    this.propsImage = propsAtlas ? propsAtlas.image : null;
    this.sheetCache = new Map();
    this.orderOf = (id) => this.db.terrainOrder.indexOf(id);
    this.props = [];
    this.lights = [];
    this.warned = new Set();
    this.animPhases = [0];
    this.animMs = 220;
    this.parse();
    this.buildCollision();
    this.buildLayers();
  }

  warn(key, msg) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(`[tilemap:${this.id}] ${msg}`);
  }

  sheet(name) {
    let img = this.sheetCache.get(name);
    if (!img) {
      const stem = String(name).replace(/\.[^.]+$/, '');
      img = this.engine.assets.img(stem);
      this.sheetCache.set(name, img);
    }
    return img;
  }

  // ---------------------------------------------------------------- parsing
  parse() {
    const mod = this.mod;
    const rows = mod.ground || [];
    this.h = rows.length;
    this.w = this.h ? Math.max(...rows.map((r) => r.length)) : 0;
    const legend = mod.legend || {};
    const under = mod.under || 'grass';
    const underMap = mod.underMap || {};
    const W = this.w, H = this.h;
    const T = this.db.terrains, WALLS = this.db.walls || {}, TILES = this.db.tiles || {}, OBJS = this.db.objects || {};

    this.terrain = [];     // terrain id or null (void)
    this.ids = [];         // raw legend ids
    this.walls = [];       // { sys, part } or null
    this.tiles = [];       // plain tile id or null (legend)
    this.decorTiles = [];  // [ids] per cell (decor plain tiles, drawn after legend tiles)
    this.overlays = [];    // [ids] per cell
    this.decorObjects = [];
    this.statics = [];     // buildings and pieces (into the layers)
    this.animated = [];    // [x, y] cells whose terrain animates
    for (let y = 0; y < H; y++) {
      const tr = [], ir = [], wr = [], tl = [], dr = [], ov = [];
      for (let x = 0; x < W; x++) {
        const ch = rows[y][x] ?? ' ';
        const id = legend[ch];
        let terrainId = null, wall = null, tile = null;
        if (id == null) {
          if (ch !== ' ') this.warn('legend:' + ch, `legend has no entry for "${ch}"`);
          terrainId = ch === ' ' && !legend[' '] ? null : under;
        } else if (T[id]) terrainId = id;
        else if (/_top$|_face$/.test(id) && WALLS[id.replace(/_(top|face)$/, '')]) {
          wall = { sys: id.replace(/_(top|face)$/, ''), part: id.endsWith('_top') ? 'top' : 'face' };
          terrainId = underMap[ch] || under;
        } else if (TILES[id]) { tile = id; terrainId = underMap[ch] || under; }
        else if (OBJS[id] || this.propsDb[id]) { this.decorObjects.push({ t: id, x, y }); terrainId = underMap[ch] || under; }
        else { this.warn('id:' + id, `unknown tile id "${id}"`); terrainId = under; }
        if (terrainId && !T[terrainId]) { this.warn('under:' + terrainId, `unknown base terrain "${terrainId}"`); terrainId = null; }
        if (terrainId && T[terrainId].anim) this.animated.push([x, y]);
        tr.push(terrainId); ir.push(id ?? null); wr.push(wall); tl.push(tile); dr.push(null); ov.push(null);
      }
      this.terrain.push(tr); this.ids.push(ir); this.walls.push(wr); this.tiles.push(tl); this.decorTiles.push(dr); this.overlays.push(ov);
    }
    // W12 (CRITIQUE_4 item 6): a wall system with faceStyles gives each room's wall run its own face art
    this.faceBlocks = faceBlockGrid(this.ids, this.db, mod.id);
    if (this.animated.length) {
      const first = T[this.terrain[this.animated[0][1]][this.animated[0][0]]].anim;
      this.animPhases = [...new Set(first.frames)].sort((a, b) => a - b);
      this.animMs = first.ms || 220;
      this.animSeq = first.frames;
    }
    for (const o of mod.overlays || []) {
      if (!o) continue;
      if (o.if != null || o.ifNot != null) {
        const g = { o, on: gatedPresent(o, this.hasFlag), base: null };
        this.gated.push(g);
        if (g.on) g.base = this.pushOverlay(o);
        continue;
      }
      this.pushOverlay(o);
    }
    for (const d of mod.decor || []) this.placeDecor(d);
    for (const d of this.decorObjects) this.placeDecor(d);
    this.overheadTiles = (mod.overhead || []).filter((o) => o && (TILES[o.t] || this.warn('overhead:' + o.t, `unknown overhead tile "${o.t}"`)));
    for (const o of this.overheadTiles) if (o.if != null || o.ifNot != null) this.gatedOverhead.push(o);
    for (const l of (mod.lighting && mod.lighting.lights) || []) this.lights.push({ x: l.x, y: l.y, r: l.r || 48, color: l.color || null, kind: l.kind || null });
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  /** Add one overlay entry; returns the terrain it replaced when it is a terrain patch (for gated removal). */
  pushOverlay(o) {
    if (!this.inBounds(o.x, o.y)) return null;
    if (this.db.terrains[o.t]) {
      // a terrain used as an overlay is a patch of that terrain (carpets, moss): it autotiles with its neighbours
      const was = this.terrain[o.y][o.x];
      this.terrain[o.y][o.x] = o.t;
      if (this.db.terrains[o.t].anim && !this.animated.some(([x, y]) => x === o.x && y === o.y)) this.animated.push([o.x, o.y]);
      return { terrain: was };
    }
    if (!this.db.tiles[o.t]) { this.warn('ov:' + o.t, `unknown overlay "${o.t}"`); return null; }
    (this.overlays[o.y][o.x] || (this.overlays[o.y][o.x] = [])).push(o.t);
    return null;
  }

  /**
   * E2 (EPISODE2_PLAN 5.5): flag-gated overlays and overhead tiles. After a flag changes, add the entries whose
   * condition now holds and remove the ones whose condition no longer does, recompute their cells' collision
   * (an overlay's code applies only while it is present) and repaint. Returns the number of entries changed.
   */
  refreshGated(hasFlag) {
    if (hasFlag) this.hasFlag = hasFlag;
    let n = 0;
    let box = null;
    const grow = (x0, y0, x1, y1) => { box = box ? [Math.min(box[0], x0), Math.min(box[1], y0), Math.max(box[2], x1), Math.max(box[3], y1)] : [x0, y0, x1, y1]; };
    for (const g of this.gated) {
      const want = gatedPresent(g.o, this.hasFlag);
      if (want === g.on) continue;
      const o = g.o;
      n++;
      g.on = want;
      if (!this.inBounds(o.x, o.y)) continue;
      if (this.db.terrains[o.t]) {
        if (want) g.base = this.pushOverlay(o);
        else if (g.base) this.terrain[o.y][o.x] = g.base.terrain;
      } else if (want) this.pushOverlay(o);
      else {
        const list = this.overlays[o.y][o.x];
        const i = list ? list.indexOf(o.t) : -1;
        if (i >= 0) list.splice(i, 1);
      }
      const m = this.db.tiles[o.t];
      const cw = m ? Math.ceil((m.w || 16) / TILE) : 1, ch = m ? Math.ceil((m.h || 16) / TILE) : 1;
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (this.inBounds(o.x + i, o.y + j)) this.recomputeCell(o.x + i, o.y + j);
      grow(o.x - 1, o.y - 1, o.x + cw, o.y + ch);
    }
    if (box) {
      this.repaint(Math.max(0, box[0]), Math.max(0, box[1]), Math.min(this.w - 1, box[2]), Math.min(this.h - 1, box[3]));
      if (this.reflectGrid) this.buildReflectGrid();     // planks over the water hide its surface
    }
    let over = 0;
    for (const o of this.gatedOverhead) { const want = gatedPresent(o, this.hasFlag); if (want !== (o._on !== false)) over++; }
    if (over) {
      const g = this.overhead.ctx;
      g.clearRect(0, 0, this.overhead.w, this.overhead.h);
      this.paintOverhead(g);
      n += over;
    }
    return n;
  }

  /** E2 (EPISODE2_PLAN 5.2): reflective cells (glass floors, the mere, any tile with `reflect: true`). */
  reflectAt(x, y) {
    if (!this.inBounds(x, y)) return false;
    if (!this.reflectGrid) this.buildReflectGrid();
    return this.reflectGrid[y * this.w + x] === 1;
  }
  buildReflectGrid() {
    const T = this.db.terrains, TILES = this.db.tiles || {};
    const g = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.walls[y][x]) continue;
      const terr = this.terrain[y][x];
      // W11 (CRITIQUE_4 item 12): a map may name floors that do not reflect here (F1's violet runner is cloth)
      let on = !!(terr && T[terr] && T[terr].reflect) && !(this.mod.noReflect && this.mod.noReflect.includes(terr));
      const wet = !!(terr && T[terr] && T[terr].collision === 'water');
      for (const id of this.idsAt(x, y)) {
        const m = TILES[id];
        if (!m) continue;
        if (m.reflect) on = true;
        // a wall piece, or planks laid over the water (a pier, a bridge), hides the surface
        else if (m.collision === 'solid' || (wet && m.collision === 'none' && /bridge|pier|dock|stairs/.test(id))) on = false;
      }
      if (on) g[y * this.w + x] = 1;
    }
    this.reflectGrid = g;
    this.hasReflect = g.some((v) => v === 1);
  }

  placeDecor(d) {
    const OBJS = this.db.objects || {};
    if (OBJS[d.t]) {
      const m = OBJS[d.t];
      if (m.kind === 'building' || m.kind === 'piece') this.statics.push({ ...d, meta: m });
      else this.addProp({ t: d.t, x: d.x, y: d.y, state: d.state, id: d.id });
    } else if (this.propsDb[d.t]) {
      this.addProp({ t: d.t, x: d.x, y: d.y, state: d.state, id: d.id });
    } else if (this.db.tiles[d.t]) {
      for (let j = 0; j < (d.h || 1); j++) for (let k = 0; k < (d.w || 1); k++) {
        const x = d.x + k, y = d.y + j;
        if (!this.inBounds(x, y)) continue;
        (this.decorTiles[y][x] || (this.decorTiles[y][x] = [])).push(d.t);
      }
    } else this.warn('decor:' + d.t, `unknown decor "${d.t}"`);
  }

  // ---------------------------------------------------------------- props (y-sorted drawables)
  /**
   * spec: { t (object id), x, y (anchor tile), state?, id?, solid? (override), kind? ('prop'|'event'),
   *         visible?, alpha?, anim? }. Returns the prop record.
   */
  addProp(spec) {
    const p = { id: spec.id || null, t: spec.t, x: spec.x, y: spec.y, state: spec.state || 0, visible: spec.visible !== false,
      alpha: spec.alpha == null ? 1 : spec.alpha, solidOverride: spec.solid, cells: [], solid: false, kind: spec.kind || 'prop',
      offX: 0, offY: 0, sortBias: 0, tint: spec.tint || null, data: spec.data || null };
    this.resolveProp(p);
    this.props.push(p);
    this.applyPropCollision(p, +1);
    return p;
  }
  removeProp(p) {
    const i = this.props.indexOf(p);
    if (i < 0) return;
    this.applyPropCollision(p, -1);
    this.props.splice(i, 1);
  }
  setPropSprite(p, id, state) {
    this.applyPropCollision(p, -1);
    p.t = id; if (state != null) p.state = state;
    this.resolveProp(p);
    this.applyPropCollision(p, +1);
  }
  setPropState(p, state) { this.setPropSprite(p, p.t, state); }
  moveProp(p, x, y) {
    this.applyPropCollision(p, -1);
    p.x = x; p.y = y;
    this.resolveProp(p);
    this.applyPropCollision(p, +1);
  }
  setPropVisible(p, v) {
    if (p.visible === v) return;
    this.applyPropCollision(p, -1);
    p.visible = v;
    this.applyPropCollision(p, +1);
  }

  /** Fill p.draw, p.cells, p.sortY from its object definition. */
  resolveProp(p) {
    const OBJS = this.db.objects || {};
    const m = OBJS[p.t];
    const pm = this.propsDb[p.t];
    p.cells = [];
    p.light = null;
    if (m) {
      const [ax, ay] = m.anchor;
      // E2: tiles.json objects may list `frames` by state (mirrors, receptors, the vow door, the great mirror)
      const [rx, ry, rw, rh] = (m.frames && m.frames[p.state]) || m.rect;
      p.draw = { img: this.sheet(m.sheet), sx: rx, sy: ry, w: rw, h: rh, dx: (p.x - ax) * TILE, dy: (p.y - ay) * TILE, anim: m.anim || null, blend: null };
      p.sortY = (p.y + 1) * TILE - 1;
      p.footH = 1;
      for (const [dx, dy] of m.footprint || []) p.cells.push([p.x + dx, p.y + dy]);
      p.doorAt = m.doorAt ? [p.x + m.doorAt[0], p.y + m.doorAt[1]] : null;
      p.solid = p.solidOverride != null ? !!p.solidOverride : (m.collision === 'solid' && p.cells.length > 0);
      p.tall = (m.overheadRows || 0) > 0;
      if (/^brazier_lit|^candelabra/.test(p.t)) p.light = { x: p.x * TILE + 8, y: p.y * TILE + 4, r: p.t === 'candelabra' ? 40 : 56, color: '#ffb060' };
    } else if (pm) {
      let [fx, fy, fw, fh] = pm.frame;
      if (pm.frames && pm.frames[p.state]) [fx, fy, fw, fh] = pm.frames[p.state];
      const [ax, ay] = pm.anchor;
      const [fpw, fph] = pm.footprint;
      p.draw = { img: this.propsImage, sx: fx, sy: fy, w: fw, h: fh, dx: p.x * TILE + fpw * 8 - ax, dy: p.y * TILE + 15 - ay, anim: null, blend: pm.blend || null };
      p.sortY = p.y * TILE + 15;
      p.footH = fph;
      const passable = new Set((pm.passable || []).map(([a, b]) => `${a},${b}`));
      for (let j = 0; j < fph; j++) for (let k = 0; k < fpw; k++) if (!passable.has(`${k},${j}`)) p.cells.push([p.x + k, p.y - fph + 1 + j]);
      p.doorAt = null;
      p.solid = p.solidOverride != null ? !!p.solidOverride : !!pm.solid;
      p.tall = (pm.overheadY || 0) > 0;
      p.overheadY = pm.overheadY || 0;
      if (p.t === 'lamp_post' && p.state === 1) p.light = { x: p.x * TILE + 8, y: p.y * TILE - 18, r: 56, color: '#ffd080' };
    } else {
      this.warn('prop:' + p.t, `unknown object "${p.t}"`);
      p.draw = null; p.sortY = p.y * TILE + 15; p.solid = false;
    }
  }

  applyPropCollision(p, delta) {
    if (!this.propSolid || !p.visible) return;
    if (p.solid) for (const [x, y] of p.cells) if (this.inBounds(x, y)) this.propSolid[y][x] = Math.max(0, (this.propSolid[y][x] || 0) + delta);
    // an open door set into a wall face makes its doorway walkable
    if (p.doorAt && this.inBounds(p.doorAt[0], p.doorAt[1])) {
      const [x, y] = p.doorAt;
      this.propDoor[y][x] = Math.max(0, (this.propDoor[y][x] || 0) + delta);
    }
  }

  /** Draw a prop at time t (seconds). opts: { alpha, tint, tintAmount } override the prop's own. */
  drawProp(r, p, t, opts) {
    const d = p.draw;
    if (!d || !p.visible) return;
    let sx = d.sx;
    if (d.anim) { const seq = d.anim.frames; sx += seq[Math.floor((t * 1000) / (d.anim.ms || 150)) % seq.length] * d.anim.frameDx; }
    const g = r.ctx;
    const alpha = (opts && opts.alpha != null ? opts.alpha : 1) * p.alpha;
    const tint = (opts && opts.tint) || p.tint;
    const prevOp = g.globalCompositeOperation;
    if (d.blend === 'lighter') g.globalCompositeOperation = 'lighter';
    r.image(d.img, d.dx + p.offX, d.dy + p.offY, { sx, sy: d.sy, sw: d.w, sh: d.h, alpha, tint: tint ? tint.color : undefined, tintAmount: tint ? tint.amount : undefined });
    if (d.blend === 'lighter') g.globalCompositeOperation = prevOp;
  }

  propAt(x, y) {
    for (const p of this.props) if (p.visible) for (const c of p.cells) if (c[0] === x && c[1] === y) return p;
    return null;
  }

  // ---------------------------------------------------------------- collision
  buildCollision() {
    const T = this.db.terrains, TILES = this.db.tiles || {};
    this.base = [];
    this.propSolid = [];
    this.propDoor = [];
    for (let y = 0; y < this.h; y++) {
      const row = [], ps = [], pd = [];
      for (let x = 0; x < this.w; x++) {
        let code;
        const terr = this.terrain[y][x];
        if (terr == null) code = 'void';
        else code = T[terr].collision || 'none';
        if (this.walls[y][x]) code = 'solid';
        const tid = this.tiles[y][x];
        if (tid && TILES[tid]) code = TILES[tid].collision || code;
        for (const d of this.decorTiles[y][x] || []) code = TILES[d].collision || code;
        for (const o of this.overlays[y][x] || []) code = TILES[o].collision || code;
        row.push(code); ps.push(0); pd.push(0);
      }
      this.base.push(row); this.propSolid.push(ps); this.propDoor.push(pd);
    }
    // tall overlays and decor tiles (doors, tall windows, wall shelves) carry their code onto every cell they cover
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.applyTallTiles(x, y);
    for (const s of this.statics) {
      const m = s.meta;
      for (const [dx, dy] of m.footprint || []) {
        const x = s.x + dx, y = s.y + dy;
        if (this.inBounds(x, y)) this.base[y][x] = 'solid';
      }
      if (m.doorAt) {
        const x = s.x + m.doorAt[0], y = s.y + m.doorAt[1];
        if (this.inBounds(x, y) && this.base[y][x] === 'solid') this.base[y][x] = 'none';
      }
    }
    // props were added during parse before the grids existed: apply them now
    for (const p of this.props) this.applyPropCollision(p, +1);
  }

  /** Codes of tiles wider or taller than one cell that are anchored at (x, y), applied to the cells they cover. */
  applyTallTiles(x, y) {
    const TILES = this.db.tiles;
    const ids = [...(this.decorTiles[y][x] || []), ...(this.overlays[y][x] || [])];
    for (const id of ids) {
      const m = TILES[id];
      if (!m) continue;
      const cw = Math.ceil((m.w || 16) / TILE), ch = Math.ceil((m.h || 16) / TILE);
      if (cw <= 1 && ch <= 1) continue;
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        if (i === 0 && j === 0) continue;
        const cx = x + i, cy = y + j;
        if (!this.inBounds(cx, cy)) continue;
        // a covered cell keeps its own overlay's code when it has one
        if ((this.overlays[cy][cx] || []).length || (this.decorTiles[cy][cx] || []).length) continue;
        this.base[cy][cx] = m.collision || this.base[cy][cx];
      }
    }
  }

  /** Tile collision code (terrain + tiles + overlays + buildings), ignoring props and actors. */
  collisionAt(x, y) {
    if (!this.inBounds(x, y)) return 'void';
    return this.base[y][x];
  }
  /** Collision including solid props (push blocks, shelves, chests, trees). */
  blockedAt(x, y) {
    if (!this.inBounds(x, y)) return true;
    if (this.propSolid[y][x] > 0) return true;
    if (this.propDoor[y][x] > 0) return false;
    return isBlocking(this.base[y][x]);
  }
  /** Code an actor sees when stepping onto (x, y): 'solid' when a prop stands there. */
  codeAt(x, y) {
    if (!this.inBounds(x, y)) return 'void';
    if (this.propSolid[y][x] > 0) return 'solid';
    if (this.propDoor[y][x] > 0) return 'none';
    return this.base[y][x];
  }
  terrainAt(x, y) { return this.inBounds(x, y) ? this.terrain[y][x] : null; }
  /** Footstep surface for a tile: 'grass' | 'stone' | 'wood'. */
  surfaceAt(x, y) {
    if (!this.inBounds(x, y)) return 'stone';
    const tid = this.tiles[y][x] || (this.decorTiles[y][x] || [])[0] || (this.overlays[y][x] || []).find((o) => /bridge|stairs|plate|switch/.test(o));
    if (tid && /bridge_wood|stairs_in|wood/.test(tid)) return 'wood';
    if (tid && /bridge_stone|stairs|plate|switch|step_stone/.test(tid)) return 'stone';
    const t = this.terrain[y][x];
    if (!t) return 'stone';
    if (/wood|carpet/.test(t)) return 'wood';
    if (/stone|archive|plaza/.test(t)) return 'stone';
    return 'grass';
  }

  /** Every id drawn on a cell (legend tile, decor tiles, overlays), for lantern reveals and inspection. */
  idsAt(x, y) {
    if (!this.inBounds(x, y)) return [];
    const out = [];
    if (this.tiles[y][x]) out.push(this.tiles[y][x]);
    for (const d of this.decorTiles[y][x] || []) out.push(d);
    for (const o of this.overlays[y][x] || []) out.push(o);
    return out;
  }

  /** Replace one tile id on a cell (wherever it sits: legend tile, decor tile or overlay) and repaint. */
  replaceTile(x, y, fromId, toId) {
    if (!this.inBounds(x, y) || !this.db.tiles[toId]) return false;
    let done = false;
    if (this.tiles[y][x] === fromId) { this.tiles[y][x] = toId; done = true; }
    const swap = (list) => { if (!list) return; for (let i = 0; i < list.length; i++) if (list[i] === fromId) { list[i] = toId; done = true; } };
    swap(this.decorTiles[y][x]); swap(this.overlays[y][x]);
    if (!done) return false;
    this.recomputeCell(x, y);
    this.repaint(x, y, x, y);
    return true;
  }
  /** Put a plain tile on a cell as an overlay (or replace the overlay list) and repaint. */
  setTile(x, y, id) {
    if (!this.inBounds(x, y) || !this.db.tiles[id]) return false;
    this.overlays[y][x] = [id];
    this.recomputeCell(x, y);
    this.repaint(x, y, x, y);
    return true;
  }
  recomputeCell(x, y) {
    const T = this.db.terrains, TILES = this.db.tiles;
    const terr = this.terrain[y][x];
    let code = terr == null ? 'void' : (T[terr].collision || 'none');
    if (this.walls[y][x]) code = 'solid';
    const tid = this.tiles[y][x];
    if (tid && TILES[tid]) code = TILES[tid].collision || code;
    for (const d of this.decorTiles[y][x] || []) code = TILES[d].collision || code;
    for (const o of this.overlays[y][x] || []) code = TILES[o].collision || code;
    for (const s of this.statics) {
      const m = s.meta;
      for (const [dx, dy] of m.footprint || []) if (s.x + dx === x && s.y + dy === y) code = 'solid';
      if (m.doorAt && s.x + m.doorAt[0] === x && s.y + m.doorAt[1] === y && code === 'solid') code = 'none';
    }
    this.base[y][x] = code;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) if (this.inBounds(x + dx, y + dy)) this.applyTallTiles(x + dx, y + dy);
  }

  // ---------------------------------------------------------------- layers
  buildLayers() {
    const r = this.engine.renderer;
    const pw = Math.max(1, this.w * TILE), ph = Math.max(1, this.h * TILE);
    this.ground = this.animPhases.map(() => r.createLayer(pw, ph));
    this.overhead = r.createLayer(pw, ph);
    // Every animation phase is painted in full. (Repainting only the terrain of animated cells wiped the
    // overlays, tiles and building bases on top of animated water/ink in phases 1+, so bridges and hidden-ink
    // traces blinked with the ripple.)
    for (let i = 0; i < this.animPhases.length; i++) this.paintGround(this.ground[i].ctx, 0, 0, this.w - 1, this.h - 1, this.animPhases[i]);
    this.paintOverhead(this.overhead.ctx);
  }

  /** Repaint a cell range on every ground layer (dynamic tiles). */
  repaint(x0, y0, x1, y1) {
    for (let i = 0; i < this.ground.length; i++) {
      const g = this.ground[i].ctx;
      g.clearRect(x0 * TILE, (y0 - 1) * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 2) * TILE);
      this.paintGround(g, x0, Math.max(0, y0 - 1), x1, y1, this.animPhases[i]);
    }
  }

  paintGround(g, x0, y0, x1, y1, phase) {
    g.save();
    g.beginPath(); g.rect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE); g.clip();
    // Tall legend tiles anchored one row above the region spill into it: include that row for passes 3 to 5.
    const ty0 = Math.max(0, y0 - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.paintTerrainCell(g, x, y, phase);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.paintWallCell(g, x, y);
    if (this.mod.floorShade) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.paintFloorShade(g, x, y);
    for (const rm of this.mod.rims || []) paintRim(g, rm);
    for (let y = ty0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const id = this.tiles[y][x]; if (id) this.paintTile(g, id, x, y, phase); }
    for (let y = ty0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (const id of this.decorTiles[y][x] || []) this.paintTile(g, id, x, y, phase);
    for (let y = ty0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (const id of this.overlays[y][x] || []) this.paintTile(g, id, x, y, phase);
    for (const s of this.statics) this.paintStatic(g, s, 'base');
    g.restore();
  }

  paintTerrainCell(g, x, y, phase) {
    const T = this.db.terrains;
    const layers = terrainLayers(this.terrain, x, y, this.orderOf);
    const px = x * TILE, py = y * TILE;
    for (const L of layers) {
      const m = T[L.id];
      const img = this.sheet(m.sheet);
      let sx = m.x, sy = m.y;
      if (m.anim) sx += phase * m.anim.frameDx;
      if (L.full && m.variants && m.variants.length) {
        // W11: a map may weight a shared floor's variants its own way (mod.variantWeights[terrainId])
        const own = this.mod.variantWeights && this.mod.variantWeights[L.id];
        const k = pickVariant(x, y, own || m.variantWeights || [4, ...m.variants.slice(1).map(() => 2)]);
        const [vx, vy] = m.variants[k];
        g.drawImage(img, vx, vy, TILE, TILE, px, py, TILE, TILE);
      } else {
        const qs = a2Quarters(L.nb);
        for (let i = 0; i < 4; i++) {
          const [qx, qy] = qs[i];
          const [ox, oy] = QUARTER_OFFSET[QUARTERS[i]];
          g.drawImage(img, sx + qx * 8, sy + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
        }
      }
    }
  }

  paintWallCell(g, x, y) {
    const w = this.walls[y][x];
    if (!w) return;
    const meta = this.db.walls[w.sys];
    const img = this.sheet(meta.sheet);
    const px = x * TILE, py = y * TILE;
    // W11 (CRITIQUE_4 item 6): the deep beyond a Court floor's walls is the mere at night, not a flat black
    if (w.part === 'top' && this.mod.voidWater && this.mod.voidWater.sys === w.sys) { paintNightWater(g, x, y, this.mod.voidWater); return; }
    if (w.part === 'top') {
      const topId = w.sys + '_top';
      const nb = neighbours(this.ids, x, y, (o) => o === topId, true);
      if (allConnected(nb) && meta.topVariants && meta.topVariants.length) {
        const k = pickVariant(x, y, meta.topVariantWeights || meta.topVariants.map(() => 1));
        const [vx, vy] = meta.topVariants[k];
        g.drawImage(img, vx, vy, TILE, TILE, px, py, TILE, TILE);
        return;
      }
      const qs = a2Quarters(nb);
      for (let i = 0; i < 4; i++) {
        const [qx, qy] = qs[i];
        const [ox, oy] = QUARTER_OFFSET[QUARTERS[i]];
        g.drawImage(img, meta.top[0] + qx * 8, meta.top[1] + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
      }
    } else {
      const faceId = w.sys + '_face';
      const same = (xx, yy) => !this.inBounds(xx, yy) || this.ids[yy][xx] === faceId;
      const qs = faceQuarters(same(x - 1, y), same(x, y - 1), same(x + 1, y), same(x, y + 1));
      const [fx, fy] = (this.faceBlocks && this.faceBlocks[y] && this.faceBlocks[y][x]) || meta.face;
      for (let i = 0; i < 4; i++) {
        const [qx, qy] = qs[i];
        const [ox, oy] = QUARTER_OFFSET[QUARTERS[i]];
        g.drawImage(img, fx + qx * 8, fy + qy * 8, 8, 8, px + ox, py + oy, 8, 8);
      }
    }
  }

  /**
   * W11 (CRITIQUE_4 item 6): mod.floorShade = { color, alpha, rows, side } darkens the floor along the foot of a
   * wall: a dithered band `rows` px deep under a north wall (the wall's shadow), `side` px beside a west or east wall,
   * so a room reads as a room and not a tile grid floating in the dark.
   */
  paintFloorShade(g, x, y) {
    if (this.walls[y][x] || !this.terrain[y] || this.terrain[y][x] == null) return;
    const o = this.mod.floorShade;
    const wall = (xx, yy) => !this.inBounds(xx, yy) || !!this.walls[yy][xx];
    const n = wall(x, y - 1), wv = wall(x - 1, y), ev = wall(x + 1, y);
    if (!n && !wv && !ev) return;
    const rows = o.rows || 6, side = o.side || 3;
    g.save();
    g.fillStyle = o.color || '#14101e';
    const px = x * TILE, py = y * TILE;
    for (let yy = 0; yy < TILE; yy++) for (let xx = 0; xx < TILE; xx++) {
      let k = 0;
      if (n && yy < rows) k = Math.max(k, 1 - yy / rows);
      if (wv && xx < side) k = Math.max(k, 0.7 * (1 - xx / side));
      if (ev && xx >= TILE - side) k = Math.max(k, 0.7 * (1 - (TILE - 1 - xx) / side));
      if (k <= 0) continue;
      const th = (BAYER4_T[((py + yy) & 3) * 4 + ((px + xx) & 3)] + 0.5) / 16;
      if (th > k * (o.alpha || 0.5) * 2) continue;
      g.globalAlpha = Math.min(1, (o.alpha || 0.5) + 0.2);
      g.fillRect(px + xx, py + yy, 1, 1);
    }
    g.restore();
  }

  paintTile(g, id, x, y, phase) {
    const m = this.db.tiles[id];
    if (!m) return;
    const img = this.sheet(m.sheet);
    const px = x * TILE, py = y * TILE;
    if (m.autotile === 'line16') {
      const sameAt = (xx, yy) => this.inBounds(xx, yy) && (this.ids[yy][xx] === id || (this.decorTiles[yy][xx] || []).includes(id) || (this.overlays[yy][xx] || []).includes(id));
      const i = line16Index(sameAt(x, y - 1), sameAt(x + 1, y), sameAt(x, y + 1), sameAt(x - 1, y));
      g.drawImage(img, m.x + (i % 8) * 16, m.y + Math.floor(i / 8) * 16, 16, 16, px, py, 16, 16);
      return;
    }
    let sx = m.x;
    if (m.anim) sx += m.anim.frames[phase % m.anim.frames.length] * m.anim.frameDx;
    g.drawImage(img, sx, m.y, m.w || 16, m.h || 16, px, py, m.w || 16, m.h || 16);
  }

  paintStatic(g, s, part) {
    const m = s.meta;
    const [rx, ry, rw, rh] = m.rect;
    const img = this.sheet(m.sheet);
    const ox = (s.x - m.anchor[0]) * TILE, oy = (s.y - m.anchor[1]) * TILE;
    const oh = (m.overheadRows || 0) * TILE;
    if (part === 'base') { if (rh - oh > 0) g.drawImage(img, rx, ry + oh, rw, rh - oh, ox, oy + oh, rw, rh - oh); }
    else if (oh > 0) g.drawImage(img, rx, ry, rw, oh, ox, oy, rw, oh);
  }

  paintOverhead(g) {
    for (const s of this.statics) this.paintStatic(g, s, 'overhead');
    for (const o of this.overheadTiles) {
      if (o.if != null || o.ifNot != null) { o._on = gatedPresent(o, this.hasFlag); if (!o._on) continue; }
      this.paintTile(g, o.t, o.x, o.y, 0);
    }
  }

  /** Which ground layer shows at time t (seconds). */
  phaseIndex(t) {
    if (this.ground.length === 1) return 0;
    const seq = this.animSeq || this.animPhases;
    const v = seq[Math.floor((t * 1000) / this.animMs) % seq.length];
    const i = this.animPhases.indexOf(v);
    return i < 0 ? 0 : i;
  }

  drawGround(r, cam, t) {
    const L = this.ground[this.phaseIndex(t)];
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const sw = Math.min(L.w - sx, r.W), sh = Math.min(L.h - sy, r.H);
    if (sw <= 0 || sh <= 0) return;
    r.drawLayer(L, sx, sy, sw, sh, sx, sy);
  }
  drawOverhead(r, cam) {
    const L = this.overhead;
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const sw = Math.min(L.w - sx, r.W), sh = Math.min(L.h - sy, r.H);
    if (sw <= 0 || sh <= 0) return;
    r.drawLayer(L, sx, sy, sw, sh, sx, sy);
  }

  get pixelW() { return this.w * TILE; }
  get pixelH() { return this.h * TILE; }

  /** Resolve a mark name to [x, y] (null when missing). */
  mark(name) {
    const m = this.mod.marks && this.mod.marks[name];
    return Array.isArray(m) ? [m[0], m[1]] : null;
  }
}

// W12 (CRITIQUE_4 item 6): per-room wall art. Pure helpers (no DOM), exported for node tests.
//
// A wall system in tiles.json may carry `faceStyles`: a list of styles, each a list of 32x32 face blocks ([x, y] in
// its sheet) that repeat tile by tile along a wall (so a style can alternate a tapestry and a pilaster). Every
// connected run of that system's face cells on a map (a room's north wall, or one stretch of it) takes ONE style:
//
//   faceStyles:      [[[fx, fy]], [[ax, ay], [bx, by]], ...]   style 0 is normally the system's own `face` block
//   faceStyleByMap:  { <mapId>: { cycle: [i, ...], at: [[x, y, i], ...] } }
//                    `at` pins the run that contains cell (x, y) to style i; every other run takes the next style
//                    of `cycle` in reading order (top to bottom, left to right); a plan without `cycle` cycles
//                    through every style. A map without an entry keeps the system's own face on every run.
//
// faceBlockGrid(ids, db, mapId) -> rows of [fx, fy] (or null where the system's plain `face` block applies).

/** Connected runs (4-neighbour) of cells whose legend id is `faceId`, in reading order. */
export function faceRuns(ids, faceId) {
  const H = ids.length, W = H ? Math.max(...ids.map((r) => r.length)) : 0;
  const seen = ids.map((r) => r.map(() => false));
  const runs = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (seen[y][x] || ids[y][x] !== faceId) continue;
      const cells = [];
      const stack = [[x, y]];
      seen[y][x] = true;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (ny < 0 || ny >= H || nx < 0 || nx >= (ids[ny] || []).length) continue;
          if (seen[ny][nx] || ids[ny][nx] !== faceId) continue;
          seen[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }
      let minX = Infinity;
      for (const [cx] of cells) minX = Math.min(minX, cx);
      runs.push({ cells, minX, y });
    }
  }
  return runs;
}

/** The style index of every run of one wall system on one map (see the header). */
export function runStyles(runs, nStyles, plan) {
  const out = new Array(runs.length).fill(-1);
  const at = (plan && plan.at) || [];
  for (const [px, py, s] of at) {
    const i = runs.findIndex((r) => r.cells.some(([x, y]) => x === px && y === py));
    if (i >= 0 && s >= 0 && s < nStyles) out[i] = s;
  }
  const cycle = (plan && plan.cycle && plan.cycle.length ? plan.cycle : [...Array(nStyles).keys()]).filter((s) => s >= 0 && s < nStyles);
  let k = 0;
  for (let i = 0; i < runs.length; i++) {
    if (out[i] >= 0) continue;
    out[i] = cycle.length ? cycle[k++ % cycle.length] : 0;
  }
  return out;
}

export function faceBlockGrid(ids, db, mapId) {
  const H = ids.length;
  const grid = ids.map((r) => r.map(() => null));
  const walls = (db && db.walls) || {};
  for (const [sys, meta] of Object.entries(walls)) {
    const styles = meta.faceStyles;
    if (!Array.isArray(styles) || styles.length < 2) continue;
    const faceId = sys + '_face';
    if (!ids.some((r) => r.includes(faceId))) continue;
    // a map opts in: without a plan for this map every run keeps the system's own face
    const plan = meta.faceStyleByMap ? meta.faceStyleByMap[mapId] : null;
    if (!plan) continue;
    const runs = faceRuns(ids, faceId);
    const pick = runStyles(runs, styles.length, plan);
    runs.forEach((run, i) => {
      const blocks = styles[pick[i]];
      if (!blocks || !blocks.length) return;
      for (const [x, y] of run.cells) {
        if (y < H) grid[y][x] = blocks[((x - run.minX) % blocks.length + blocks.length) % blocks.length];
      }
    });
  }
  return grid;
}
