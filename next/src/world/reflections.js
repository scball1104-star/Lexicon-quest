// Reflections (E2-world, EPISODE2_PLAN 5.2): who has a face in the water. Drawn right after the ground layer, so
// whatever stands south of a reflection covers it.
//
//   const refl = new Reflections(field);
//   refl.reset()            after a map loads: is anything here reflective? find the fountains
//   refl.draw(r, t)         at most MAX_REFLECTIONS per frame, nearest the leader first
//   reflectionStyle(actor, hasFlag) -> null | { alpha, tint, amount }     pure, tested
//   inGlass(actor)          scene actors drawn inside a mirror's glass (Vex Quill), not standing in the room
//
// Floors and water: an actor standing on (or just north of) reflective cells (`reflect: true` terrain or tiles:
// glass_floor, gallery_floor, throne_floor, mere_water) shows its current frame flipped under its feet, clipped to
// the reflective cells, at alpha 0.35 tinted toward the surface. Fountains: an actor at the basin's south rim sees
// its face in the water: the head of its down-facing frame, chin on the near waterline, masked to the water pixels.
// Who has none: every Hollow NPC whose npcs.js record says `noReflection` (until nh_restored), Hollow scene spawns
// (ids nh_*, or a spawn of a noReflection NPC such as elian_f), and the King, always. The hero's is faint: a smudge
// with no face (alpha 0.12, a flat pale silhouette) until nh_restored, then whole but faint (alpha 0.2, greyed).

import { NPCS } from '../data/npcs.js';
import { TILE } from './tilemap.js';
import { BAYER4 } from '../core/renderer.js';

export const MAX_REFLECTIONS = 8;
export const REFLECT_ALPHA = 0.35;
export const HERO_SMUDGE_ALPHA = 0.12;
export const HERO_FAINT_ALPHA = 0.2;
const RESTORED = 'nh_restored';
/** Actors that never reflect (the King and his scene stand-in). */
const NEVER = new Set(['nameless_king', 'aurel_k']);
/** Scene actors drawn as images inside a mirror's glass. */
const IN_GLASS = new Set(['vex']);
const SURFACE_TINT = { water: '#3a6fb0', glass: '#b8d4f0', fountain: '#4a86c8' };
const FOUNTAINS = new Set(['fountain']);

let npcSprites = null;
/** NPC records that carry noReflection, by sprite id (a scene spawn of Elian uses npc_elian). */
function noReflectionSprites() {
  if (npcSprites) return npcSprites;
  npcSprites = new Set();
  for (const rec of Object.values(NPCS)) if (rec && rec.noReflection && rec.sprite) npcSprites.add(rec.sprite);
  return npcSprites;
}

/** Does this actor show no reflection now? */
export function hasNoReflection(a, hasFlag) {
  if (!a) return true;
  if (NEVER.has(a.id) || (a.ev && a.ev.noReflection === 'always')) return true;
  const restored = !!(hasFlag && hasFlag(RESTORED));
  if (restored) return false;
  if (a.ev && a.ev.noReflection) return true;
  const rec = NPCS[a.id];
  if (rec && rec.noReflection) return true;
  if (a.kind === 'spawn' || a.kind === 'actor') {
    if (/^nh_/.test(a.id)) return true;
    const base = String(a.id).replace(/_[a-z]$/, '');
    if (NPCS[base] && NPCS[base].noReflection) return true;
    if (noReflectionSprites().has(a.spriteId)) return true;
  }
  return false;
}

/**
 * How an actor's reflection is drawn, or null for none. hero: a faceless smudge before nh_restored, a faint
 * greyed whole reflection after. Everyone else: REFLECT_ALPHA tinted toward the surface by the caller.
 */
export function reflectionStyle(a, hasFlag) {
  if (!a || a.visible === false || hasNoReflection(a, hasFlag) || IN_GLASS.has(a.id)) return null;
  if (a.kind === 'party' && a.id === 'hero') {
    if (hasFlag && hasFlag(RESTORED)) return { alpha: HERO_FAINT_ALPHA, tint: '#c8ccd8', amount: 0.55, hero: 'faint' };
    return { alpha: HERO_SMUDGE_ALPHA, tint: '#dfe6f2', amount: 1, hero: 'smudge' };
  }
  return { alpha: REFLECT_ALPHA * (a.alpha == null ? 1 : a.alpha), tint: null, amount: 0.3 };
}

export function inGlass(a) { return !!a && IN_GLASS.has(a.id); }

const opaqueRows = new Map();
/** The first row of a frame with any opaque pixel (cached), so a face starts at the crown of the head. */
function firstOpaqueRow(atlas, fr) {
  const key = `${fr.x},${fr.y},${fr.w},${fr.h}`;
  if (opaqueRows.has(key)) return opaqueRows.get(key);
  let row = null;
  try {
    const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h;
    const g = c.getContext('2d'); g.drawImage(atlas.image, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    const d = g.getImageData(0, 0, fr.w, fr.h).data;
    for (let y = 0; y < fr.h && row == null; y++) for (let x = 0; x < fr.w; x++) if (d[(y * fr.w + x) * 4 + 3] > 0) { row = y; break; }
  } catch (err) { row = null; }
  opaqueRows.set(key, row);
  return row;
}

export class Reflections {
  constructor(field) {
    this.f = field;
    this.active = false;
    this.fountains = [];
    this.drawn = 0;
    this.scratch = null;
    this.masks = new Map();
  }

  reset() {
    const map = this.f.map;
    this.fountains = [];
    this.active = false;
    if (!map) return;
    map.buildReflectGrid();
    // fountain faces belong to maps that reflect (the Hollow's square); Willowmere's fountain stays as it was
    if (map.hasReflect || (map.mod && map.mod.fountainFaces)) for (const p of map.props) if (FOUNTAINS.has(p.t) && p.draw) this.fountains.push(p);
    this.active = map.hasReflect || this.fountains.length > 0;
  }

  /** Candidate actors, nearest the leader first, capped at MAX_REFLECTIONS. */
  candidates() {
    const f = this.f, L = f.leader;
    const out = [];
    for (const a of f.actors) {
      if (!a.visible || !a.spr) continue;
      if (!f.camera.visible(a.px - 8, a.py - 8, 40, 64, 16)) continue;
      out.push(a);
    }
    if (L) out.sort((u, v) => (Math.abs(u.tx - L.tx) + Math.abs(u.ty - L.ty)) - (Math.abs(v.tx - L.tx) + Math.abs(v.ty - L.ty)));
    return out;
  }

  draw(r, t) {
    this.drawn = 0;
    if (this.usedSpots) this.usedSpots.clear();
    if (this.over) this.over.length = 0;
    if (!this.active) return;
    const f = this.f, map = f.map;
    for (const a of this.candidates()) {
      if (this.drawn >= MAX_REFLECTIONS) break;
      const style = reflectionStyle(a, f.hasFlag);
      const fountain = this.fountainFor(a);
      // at the fountain everyone stills a patch of water; only those with a reflection have a face in it
      if (fountain && a.spr && a.visible && !NEVER.has(a.id) && !IN_GLASS.has(a.id)) { if (this.drawFountain(r, t, a, style, fountain)) this.drawn++; continue; }
      if (!style) continue;
      if (!map.hasReflect) continue;
      // cells the flipped sprite covers: the two rows under the feet, the sprite's width
      const tx = Math.round(a.px / TILE), ty = Math.round(a.py / TILE);
      const cells = [];
      for (let j = 1; j <= 2; j++) for (let i = -1; i <= 1; i++) if (map.reflectAt(tx + i, ty + j)) cells.push([tx + i, ty + j]);
      if (!cells.length) continue;
      const water = cells.some(([x, y]) => map.collisionAt(x, y) === 'water');
      this.drawFloor(r, t, a, style, cells, water);
      this.drawn++;
    }
  }

  /** The flipped frame under the feet, clipped to the reflective cells. */
  drawFloor(r, t, a, style, cells, water) {
    const g = r.ctx;
    const fr = a.frame(t);
    g.save();
    g.beginPath();
    for (const [x, y] of cells) g.rect(x * TILE, y * TILE, TILE, TILE);
    g.clip();
    let tint = style.tint || (water ? SURFACE_TINT.water : SURFACE_TINT.glass);
    let alpha = style.alpha, amount = style.amount;
    // W11 (CRITIQUE_4 item 12): a pale glass floor (F1) asks for a deeper, darker image (mod.reflectLook) so the
    // reflection reads on the glass; the hero's smudge and faint image keep their own colour.
    const look = !water && this.f.map.mod && this.f.map.mod.reflectLook;
    if (look) { alpha = Math.min(1, alpha * (look.alpha || 1)); if (!style.hero) { tint = look.tint || tint; amount = look.amount ?? amount; } }
    const fx = a.feetX, fy = a.feetY + 1 + (a.lift || 0);
    const opts = { flipX: fr.flip, flipY: true, alpha, tint, tintAmount: amount };
    if (water && !(this.f.engine.settings && this.f.engine.settings.reduceMotion)) {
      // ripple: the reflection in water wavers a pixel, band by band
      const fobj = fr.atlas.frames[fr.name];
      const h = fobj ? fobj.h : 32;
      for (let band = 0; band < h; band += 4) {
        const dx = Math.round(Math.sin(t * 3 + (fy + band) * 0.35) * 0.9);
        g.save();
        g.beginPath(); g.rect(fx - 24, fy + band, 48, 4); g.clip();
        r.sprite(fr.atlas, fr.name, fx + dx, fy, opts);
        g.restore();
      }
    } else r.sprite(fr.atlas, fr.name, fx, fy, opts);
    g.restore();
  }

  /** A fountain whose basin rim the actor stands just south of (within its width), or null. */
  fountainFor(a) {
    for (const p of this.fountains) {
      if (!p.visible) continue;
      const xs = p.cells.map((c) => c[0]), ys = p.cells.map((c) => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys);
      if (a.ty === y1 + 1 && a.tx >= x0 && a.tx <= x1) return p;
    }
    return null;
  }

  /**
   * The water pixels of a fountain prop's art, as an alpha mask, plus per column the lowest water row (`bottom`)
   * and the count of water pixels (`n`). Cached per prop sprite.
   */
  waterMask(p) {
    const d = p.draw;
    const key = `${p.t}:${d.sx},${d.sy}`;
    if (this.masks.has(key)) return this.masks.get(key);
    let mask = null;
    try {
      if (typeof document !== 'undefined' && d.img) {
        const c = document.createElement('canvas'); c.width = d.w; c.height = d.h;
        const g = c.getContext('2d');
        g.drawImage(d.img, d.sx, d.sy, d.w, d.h, 0, 0, d.w, d.h);
        const img = g.getImageData(0, 0, d.w, d.h);
        const px = img.data;
        const bottom = new Int16Array(d.w).fill(-1), n = new Int16Array(d.w);
        for (let i = 0; i < px.length; i += 4) {
          const R = px[i], G = px[i + 1], B = px[i + 2], A = px[i + 3];
          const water = A > 200 && B > 90 && B > R + 40 && B >= G;
          px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = water ? 255 : 0;
          if (water) { const x = (i >> 2) % d.w, y = Math.floor((i >> 2) / d.w); n[x]++; if (y > bottom[x]) bottom[x] = y; }
        }
        g.putImageData(img, 0, 0);
        mask = { canvas: c, bottom, n };
      }
    } catch (err) { mask = null; }
    this.masks.set(key, mask);
    return mask;
  }

  /**
   * Where a face shows in a fountain for an actor at local column cx: the nearest open stretch of water (a 9 px
   * window rich in water pixels, within 14 px), and the waterline (lowest water row) there. null when none.
   */
  static faceSpot(mask, cx, used = []) {
    let best = null, bestScore = -Infinity;
    const W = mask.n.length;
    for (let x = Math.max(6, cx - 16); x <= Math.min(W - 7, cx + 16); x++) {
      let sum = 0, low = -1;
      for (let k = -6; k <= 6; k++) { sum += mask.n[x + k]; if (mask.bottom[x + k] > low) low = mask.bottom[x + k]; }
      if (sum < 60) continue;
      let score = sum * 2 - Math.abs(x - cx) * 2;
      for (const u of used) if (Math.abs(u - x) < 13) score -= 200;      // two faces never share a stretch of water
      if (score > bestScore) { bestScore = score; best = { x, waterline: low }; }
    }
    return best;
  }

  /**
   * The face in the fountain: the head of the actor's down-facing frame, upright (leaning over a basin you meet your
   * own face, chin toward you), in the nearest open water north of them, chin on the waterline, masked to the water. The fountain is a y-sorted
   * prop drawn after this pass, so the image is queued and drawn over it by drawOver().
   */
  drawFountain(r, t, a, style, p) {
    const mask = this.waterMask(p);
    if (!mask) return false;
    const d = p.draw;
    const px = d.dx + p.offX, py = d.dy + p.offY;
    this.usedSpots = this.usedSpots || new Map();
    const used = this.usedSpots.get(p) || [];
    const spot = Reflections.faceSpot(mask, a.feetX - px, used);
    if (!spot) return false;
    used.push(spot.x); this.usedSpots.set(p, used);
    this.pool = this.pool || [];
    this.over = this.over || [];
    const s = this.pool[this.over.length] || (this.pool[this.over.length] = document.createElement('canvas'));
    if (s.width !== d.w || s.height !== d.h) { s.width = d.w; s.height = d.h; }
    const sg = s.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'source-over';
    sg.globalAlpha = 1;
    sg.clearRect(0, 0, s.width, s.height);
    // the water stills where someone leans over it: a dark, dithered oval (an empty one for the nameless)
    const cy = spot.waterline - 6;
    for (let y = -6; y <= 6; y++) for (let x = -8; x <= 8; x++) {
      const e = (x * x) / 72 + (y * y) / 40;
      if (e > 1) continue;
      const k = e < 0.45 ? 15 : e < 0.8 ? 9 : 4;
      if (BAYER4[((cy + y) & 3) * 4 + ((spot.x + x) & 3)] >= k) continue;
      sg.fillStyle = e < 0.45 ? '#16244f' : '#1d3775';
      sg.fillRect(spot.x + x, cy + y, 1, 1);
    }
    if (style) {
      const atlas = this.f.engine.assets.atlas(a.spr.atlas);
      let name = `${a.spr.id}_down_0`;
      if (!atlas.frames[name]) name = a.frame(t).name;
      const fr = atlas.frames[name];
      if (fr) {
        // the head of the frame from the crown down; leaning over a basin you meet your own face, chin toward you:
        // upright, the chin on the near waterline
        const rows = Math.min(11, fr.h);
        const headTop = firstOpaqueRow(atlas, fr) ?? 0;
        const face = this.faceCanvas || (this.faceCanvas = document.createElement('canvas'));
        if (face.width !== fr.w || face.height !== rows) { face.width = fr.w; face.height = rows; }
        const fg = face.getContext('2d');
        fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1;
        fg.clearRect(0, 0, face.width, face.height);
        fg.drawImage(atlas.image, fr.x, fr.y + headTop, fr.w, rows, 0, 0, fr.w, rows);
        // the hero's smudge is a flat pale blank; a faint hero is greyed; strangers keep their colours
        fg.globalCompositeOperation = 'source-atop';
        fg.globalAlpha = style.hero === 'smudge' ? 1 : style.hero === 'faint' ? 0.45 : 0.12;
        fg.fillStyle = style.tint || SURFACE_TINT.fountain;
        fg.fillRect(0, 0, face.width, face.height);
        sg.globalAlpha = style.hero === 'smudge' ? 0.5 : style.hero === 'faint' ? 0.7 : 0.92;
        sg.drawImage(face, spot.x - (fr.w >> 1), spot.waterline + 1 - rows);
        sg.globalAlpha = 1;
      }
    }
    sg.globalCompositeOperation = 'destination-in';
    sg.drawImage(mask.canvas, 0, 0);
    sg.globalCompositeOperation = 'source-over';
    // never over the heads of the people at the rim (drawOver runs after the actors)
    const headLine = Math.min(...this.f.actors.filter((o) => o.visible && this.fountainFor(o) === p).map((o) => o.feetY - (o.spr ? o.spr.h : 32) + 3)) - py;
    if (Number.isFinite(headLine) && headLine < s.height) sg.clearRect(0, Math.max(0, headLine), s.width, s.height);
    this.over.push({ x: px, y: py, alpha: 0.85, img: s });
    return true;
  }

  /** Fountain faces go over the fountain art (it is a y-sorted prop drawn after the floor reflections). */
  drawOver(r) {
    if (!this.over || !this.over.length) return;
    const g = r.ctx;
    for (const o of this.over) {
      const prev = g.globalAlpha;
      g.globalAlpha = prev * o.alpha;
      g.drawImage(o.img, Math.round(o.x), Math.round(o.y));
      g.globalAlpha = prev;
    }
    this.over.length = 0;
  }

  /** Vex Quill in the mirror: drawn as an image in the glass (silvered, translucent, no shadow). */
  drawInGlass(r, t, a) {
    const shimmer = !(this.f.engine.settings && this.f.engine.settings.reduceMotion);
    const k = shimmer ? 0.72 + 0.08 * Math.sin(t * 2.4) : 0.75;
    const prev = a.alpha;
    a.alpha = (prev == null ? 1 : prev) * k;
    a.draw(r, t, { shadow: false, tint: '#d8ecff', tintAmount: 0.35 });
    a.alpha = prev;
  }
}
