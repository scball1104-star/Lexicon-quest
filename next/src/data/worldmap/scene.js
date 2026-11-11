// The world map screen (issue #97, WORLD_MAP_PLAN wave 2, still 1 of section 10.5): view only. Travel is wave 3.
//
//   engine.pushAwait('worldmap', { from: 'menu' | 'stone' | 'debug' })   resolves when the player closes it
//
// The painting (assets/ui/worldmap_map.png) holds three versions of the same world: full colour, a brown-ink sketch and blank
// paper. On enter the scene composes one 424 x 216 layer from them, cell by cell, by what the save knows (data.js mapState):
// a visited region in colour, a region only heard of in ink, the rest blank paper, with a dithered torn edge where a region
// meets one that is less known. Over it: the dotted sea and air lanes the story opened, the ship and the Kestrel where the
// story has them, the party leader where the party stands, label plates (white: visited, gold: here, grey "?": heard of),
// the title banner, the towns list (right) and the info box (bottom, or top when the chosen place is low on the map).
//
// Keyboard and gamepad: up and down choose a town (the map pans to keep it clear of the list), confirm says travel is on foot
// for now, cancel or menu closes. Touch: tap a town in the list or a label on the map; tap "Back" or the B button to close.
// Reduce motion: the pan snaps, the marker arrow and the leader stand still.

import { drawWindow, drawBanner } from '../../ui/window.js';
import { List, rowHeightFor, touchUi } from '../../ui/list.js';
import { btn } from '../../ui/glyphs.js';
import { SIZE, POINTS, SPRITES, REGIONS as GRID } from './layout.js';
import { PLACES, PLACE, mapState, placeName, VISITED, HEARD, UNKNOWN, TEXT, RANK } from './data.js';

export const IMG = 'worldmap_map';
export const VIEW = { w: 384, h: 216 };
export const MAX_OX = SIZE.w - VIEW.w;                  // the painting is 40 px wider than the screen: it pans
export const LIST = { x: 284, y: 4, w: 96 };
export const INFO = { x: 4, w: 276, h: 34, low: 178, high: 30 };
const LANE = '#6a4532';
export const HERO_DX = 13, HERO_DY = 13;     // the leader stands south-east of the place, its label goes west
const PLATE = '#14101e';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Where the view pans for a chosen point: keep it in the middle of the part the list does not cover. Pure. */
export function panFor(x) { return clamp(Math.round(x - 150), 0, MAX_OX); }

/** The label of a place for a state: '? Name' when only heard of, '' when unknown. Pure. */
export function labelOf(place, state, flags) {
  if (state === UNKNOWN) return '';
  return (state === HEARD ? '? ' : '') + placeName(place, flags);
}

export class WorldMapScene {
  constructor(engine) { this.engine = engine; this.name = 'worldmap'; this.transparent = false; }

  enter(data = {}) {
    const e = this.engine;
    this.from = data.from || 'menu';
    this.g = e.game || { flags: {}, party: [] };
    this.flags = this.g.flags || {};
    this.state = mapState(this.g);
    this.frame = 0;
    this.layer = null;
    this.note = 0;                                        // frames left on the "walk the roads" note
    this.closing = false;
    this.touch = touchUi(e);
    const st = this.state;
    const items = st.towns.map((id) => ({ id, label: placeName(PLACE[id], this.flags), color: id === st.here ? 'gold' : 'white', disabled: st.places[id] !== VISITED }));
    const rowH = rowHeightFor(e, 13);
    this.hintH = this.touch ? 22 : 14;
    const room = 216 - 4 - LIST.y - 22 - this.hintH - 4;
    const rows = Math.max(1, Math.min(items.length || 1, Math.floor(room / rowH)));
    this.win = { x: LIST.x, y: LIST.y, w: LIST.w, h: 22 + rows * rowH + this.hintH + 4 };
    const start = Math.max(0, items.findIndex((it) => it.id === st.here));
    this.list = new List({ x: LIST.x + 6, y: LIST.y + 19, w: LIST.w - 12, rowH, rows, items, index: start, textX: 10, confirmSfx: false, cancelSfx: true });
    this.sel = (items[start] && items[start].id) || st.here || 'willowmere';
    this.ox = panFor(this.pointOf(this.sel)[0]);
    if (e.audio && e.audio.sfx) e.audio.sfx('menu_open');
  }

  get reduce() { const s = this.engine.settings; return !!(s && s.reduceMotion); }

  /** The painting point of a place or road point. */
  pointOf(id) { return (id && POINTS[id]) || this.state.hereAt || POINTS.willowmere; }

  select(id) {
    if (!id || id === this.sel) return;
    this.sel = id;
    this.note = 0;
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    const e = this.engine;
    if (e.audio && e.audio.sfx) e.audio.sfx('menu_close');
    e.pop();
  }

  /** Back hint rect (the bottom of the list window): a tap closes. */
  get backRect() { const w = this.win; return { x: w.x + 4, y: w.y + w.h - this.hintH - 3, w: w.w - 8, h: this.hintH }; }

  update() {
    const e = this.engine;
    const { input, audio } = e;
    this.frame++;
    if (this.closing) return;
    if (this.note > 0) this.note--;
    const act = this.list.update(input, audio);
    if (this.list.changed && this.list.item) this.select(this.list.item.id);
    if (act === 'confirm') { if (audio && audio.sfx) audio.sfx('buzzer'); this.note = 150; }
    else if (act === 'cancel' || input.pressed('menu')) { this.close(); return; }
    const p = input.pointer;
    if (p && p.pressed) {
      const b = this.backRect;
      if (input.tapIn(b.x, b.y, b.w, b.h)) { this.close(); return; }
      const w = this.win;
      if (!(p.x >= w.x && p.x < w.x + w.w && p.y >= w.y && p.y < w.y + w.h)) {
        const hit = this.placeAt(p.x + this.ox, p.y);
        if (hit) {
          this.select(hit);
          const i = this.list.items.findIndex((it) => it.id === hit);
          if (i >= 0) this.list.moveTo(i, { silent: true });
          if (audio && audio.sfx) audio.sfx('cursor');
        }
      }
    }
    const want = panFor(this.pointOf(this.sel)[0]);
    if (this.reduce) this.ox = want;
    else if (this.ox !== want) { const d = want - this.ox; this.ox += Math.abs(d) <= 1 ? d : clamp(d * 0.2, -4, 4); }
  }

  /** The known place nearest a painting pixel, within 14 px, or null. */
  placeAt(x, y) {
    let best = null, bd = 14 * 14;
    for (const pl of PLACES) {
      if (this.state.places[pl.id] === UNKNOWN || !POINTS[pl.id]) continue;
      const [px, py] = POINTS[pl.id];
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = pl.id; }
    }
    return best;
  }

  /** Compose the painting layer for this save once: each 8 px cell from the layer its region's state picks. */
  compose(r) {
    const img = r.assets && r.assets.img ? r.assets.img(IMG) : null;
    if (!img || typeof r.createLayer !== 'function') return false;
    const L = r.createLayer(SIZE.w, SIZE.h);
    const g = L.ctx;
    g.imageSmoothingEnabled = false;
    const C = SIZE.cell;
    const off = (s) => (s === VISITED ? 0 : s === HEARD ? SIZE.ink : SIZE.paper);
    const st = (cx, cy) => this.state.regions[(GRID[cy] || '')[cx]] || UNKNOWN;
    for (let cy = 0; cy < SIZE.rows; cy++) for (let cx = 0; cx < SIZE.cols; cx++) g.drawImage(img, cx * C, cy * C + off(st(cx, cy)), C, C, cx * C, cy * C, C, C);
    // the torn edge: 3 px of the lesser neighbour's layer, in a checker, over the edge of the better known cell
    for (let cy = 0; cy < SIZE.rows; cy++) for (let cx = 0; cx < SIZE.cols; cx++) {
      const s = st(cx, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE.cols || ny >= SIZE.rows) continue;
        const n = st(nx, ny);
        if (RANK[n] >= RANK[s]) continue;
        const sy = off(n);
        for (let k = 0; k < 3; k++) for (let j = 0; j < C; j++) {
          const x = dx === 1 ? cx * C + C - 1 - k : dx === -1 ? cx * C + k : cx * C + j;
          const y = dy === 1 ? cy * C + C - 1 - k : dy === -1 ? cy * C + k : cy * C + j;
          if ((x + y) % 2 === 0 && (k < 2 || (x + 2 * y) % 4 === 0)) g.drawImage(img, x, y + sy, 1, 1, x, y, 1, 1);
        }
      }
    }
    this.layer = L;
    return true;
  }

  drawLanes(r, ox) {
    const st = this.state;
    for (const [a, b] of st.lanes) {
      const [x0, y0] = this.pointOf(a), [x1, y1] = this.pointOf(b);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i += 3) {
        const x = Math.round(x0 + (x1 - x0) * i / n) - ox, y = Math.round(y0 + (y1 - y0) * i / n);
        r.rect(x, y, 2, 1, LANE);
      }
    }
  }

  drawVehicles(r, ox) {
    const img = r.assets && r.assets.img ? r.assets.img(IMG) : null;
    if (!img) return;
    const bob = this.reduce ? 0 : Math.floor(this.frame / 30) % 2;
    if (this.state.ship) {
      const [sx, sy, sw, sh] = SPRITES.ship, [x, y] = this.pointOf(this.state.ship);
      r.image(img, x - ox - 7, y - sh + 4 + bob, { sx, sy, sw, sh });
    }
    if (this.state.kestrel && this.state.regions.I === VISITED) {
      const [sx, sy, sw, sh] = SPRITES.kestrel, [x, y] = POINTS.zephyr;
      r.image(img, x - ox + 28, y - 18 + bob, { sx, sy, sw, sh });   // moored in the air east of the skyport, beside the party
    }
  }

  drawLeader(r, ox) {
    const at = this.state.hereAt;
    if (!at || !r.assets || !r.assets.has || !r.assets.has('party_field')) return;
    const lead = (this.g.party && this.g.party[0] && this.g.party[0].id) || 'hero';
    const atlas = r.assets.atlas('party_field');
    const step = this.reduce ? 0 : Math.floor(this.frame / 24) % 2;
    const f = atlas.frames[`${lead}_down_${step}`] ? `${lead}_down_${step}` : `hero_down_${step}`;
    r.sprite(atlas, f, at[0] - ox + HERO_DX, at[1] + HERO_DY);   // beside the glyph, feet on the ground south-east of it
  }

  plate(r, s, x, y, color) {
    const w = r.measure(s);
    x = clamp(Math.round(x), 2, VIEW.w - w - 3);
    y = clamp(Math.round(y), 2, VIEW.h - 13);
    r.withAlpha(0.66, () => r.rect(x - 2, y, w + 4, 11, PLATE));
    r.text(s, x, y, { color });
  }

  drawLabels(r, ox) {
    const st = this.state;
    for (const pl of PLACES) {
      const s = st.places[pl.id];
      const text = labelOf(pl, s, this.flags);
      if (!text || !POINTS[pl.id]) continue;
      const [x, y] = POINTS[pl.id];
      const here = pl.id === st.here;
      const color = here ? 'gold' : s === VISITED ? 'white' : 'gray';
      // the party's own place: the label sits west of the glyph, clear of the leader standing east of it
      const lx = here ? x - r.measure(text) - 9 : x + pl.label[0], ly = here ? y + 4 : y + pl.label[1];
      this.plate(r, text, lx - ox, ly, color);
    }
  }

  /** The chosen place: four gold corner brackets around its glyph (they pulse in and out; still under Reduce motion). */
  drawMarker(r, ox) {
    const [cx, cy] = this.pointOf(this.sel);
    const d = 9 + (this.reduce ? 0 : Math.floor(this.frame / 20) % 2);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx - ox + sx * d - (sx > 0 ? 1 : 0), y = cy + sy * d - (sy > 0 ? 1 : 0);
      r.rect(x - (sx > 0 ? 3 : 0) - 1, y - 1, 5, 3, PLATE);
      r.rect(x - (sx > 0 ? 0 : 0) - 1, y - (sy > 0 ? 3 : 0) - 1, 3, 5, PLATE);
      r.rect(x - (sx > 0 ? 2 : 0), y, 3, 1, '#f9d77a');
      r.rect(x, y - (sy > 0 ? 2 : 0), 1, 3, '#f9d77a');
    }
  }

  drawList(r) {
    const w = this.win;
    drawWindow(r, w.x, w.y, w.w, w.h, { alpha: 0.94 });
    r.text(TEXT.towns, w.x + 8, w.y + 5, { color: 'gold' });
    this.list.draw(r, { frame: this.frame, cursor: true, bar: true });
    const b = this.backRect;
    r.text(`${btn('cancel')} ${TEXT.back}`, b.x + Math.floor(b.w / 2), b.y + Math.floor((b.h - 11) / 2), { align: 'center', color: 'gray' });
  }

  /** The info box sits at the bottom, or under the banner when the chosen place or the party is low on the map. */
  get infoY() {
    const low = (p) => !!p && p[1] > 150;
    return low(this.pointOf(this.sel)) || low(this.state.hereAt) ? INFO.high : INFO.low;
  }

  drawInfo(r) {
    const pl = PLACE[this.sel];
    const y = this.infoY;
    drawWindow(r, INFO.x, y, INFO.w, INFO.h, { alpha: 0.94 });
    const x = INFO.x + 8, rx = INFO.x + INFO.w - 8;
    if (!pl) { r.text(TEXT.here, x, y + 5, { color: 'white' }); return; }
    const s = this.state.places[pl.id];
    r.text(placeName(pl, this.flags), x, y + 5, { color: 'gold' });
    const status = this.note > 0 ? TEXT.walk : pl.id === this.state.here ? TEXT.here : s === VISITED ? TEXT.visited : TEXT.heard;
    r.text(status, rx, y + 5, { align: 'right', color: this.note > 0 ? 'cream' : 'gray' });
    r.text(pl.about, x, y + 18, { color: 'white', width: INFO.w - 16 });
  }

  draw(r) {
    r.clear('#ebdfc8');
    if (!this.layer) this.compose(r);
    const ox = Math.round(this.ox);
    if (this.layer) r.drawLayer(this.layer, ox, 0, VIEW.w, VIEW.h, 0, 0);
    this.drawLanes(r, ox);
    this.drawVehicles(r, ox);
    this.drawLeader(r, ox);
    this.drawLabels(r, ox);
    this.drawMarker(r, ox);
    drawBanner(r, TEXT.title, 142, 4);
    this.drawList(r);
    this.drawInfo(r);
  }

  debugState() {
    return { sel: this.sel, here: this.state.here, ox: Math.round(this.ox), composed: !!this.layer, towns: this.state.towns.slice(),
      regions: { ...this.state.regions }, places: { ...this.state.places }, index: this.list ? this.list.index : null, touch: !!this.touch };
  }
}

export default WorldMapScene;
