// Episode 8's field event type and the pop-up book system's attachment (E8-world, docs/EPISODE8_PLAN.md 4.4 and 5.1).
// Imported by ../world.js when the ep8 pack registers; never in the first download.
//
//   popbook  { book: 'a' (an id of the map's popbooks.books), sprite?: an object id (else E8-tiles' popbook, else the
//              stand-in of ./art.js), name?: '<text key>' (a realm book's float line; default ep8_realm_<realm>),
//              lantern?: true (in Keeper ink: faint and unreadable until the Lantern finds it, the Episode 1 rule) }
//            At the book's (x, y). Solid, on ground, faced from ground on a long side. Confirm reads it (./popbooks.js).
//
// attach(field) is idempotent per field instance: it adds field.books and wraps this field's glass.reset / update /
// drawBeams (the book layer under the actors), lighting.draw (the float line over the light), canStep (enemies and NPCs never
// stand on a page cell), collectLights (pools over open books on a dark map), hiddenInkNear (the Lantern hint knows books
// in Keeper ink) and debugState, the way Episodes 5 to 7 attach. EXT.popbook.create attaches first, and ../world.js attaches
// every field the engine enters. Nothing here edits src/scenes/field.js.

import { EXT, INTERACT_TYPES } from '../../../world/events.js';
import { Books, ribbonOf } from './system.js';
import { ensureArt, bookSprite, DRAWER_OBJECT, DRAWER_TILES } from './art.js';
import { covered } from './popbooks.js';
import { soloWrap } from './solo.js';

INTERACT_TYPES.add('popbook');

EXT.popbook = {
  create(field, ent) {
    attach(field);
    const map = field.map, ev = ent.ev;
    ensureArt(map.db, field.engine, map);
    const B = map.mod && map.mod.popbooks && map.mod.popbooks.books && map.mod.popbooks.books[ev.book];
    const axis = B && B.axis === 'ew' ? 'ew' : 'ns';
    const t = bookSprite(map.db, axis, ev, !!(B && B.realm));
    if (!map.db.objects || !map.db.objects[t]) { field.warnOnce('ep8book:' + t, `unknown object "${t}" (${ent.id})`); return; }
    ent.ribbon = ribbonOf(map.mod, ev.book);
    const [ax, ay] = propAnchor(map.db.objects[t], ent.x, ent.y);
    ent.prop = map.addProp({ t, x: ax, y: ay, state: 0, id: ent.id, kind: 'event', solid: true });
    // both cells of the book answer to confirm (facing either half reads it)
    for (const [x, y] of ent.prop.cells) {
      if (!ent.cells.some((c) => c[0] === x && c[1] === y)) ent.cells.push([x, y]);
      const k = `${x},${y}`;
      if (!field.byTile.has(k)) field.byTile.set(k, []);
      if (!field.byTile.get(k).includes(ent)) field.byTile.get(k).push(ent);
    }
  },
  interact: (field, ent) => (field.books ? field.books.readBook(ent) : null),
};

/**
 * The anchor cell that puts an object's footprint on the book's cells, whose top-left is (x, y). E8-tiles' `popbook_ew` and
 * `popbook_realm_ew` are anchored on their lower cell (footprint [0, 0], [0, -1]): anchored on the event's cell they stood one
 * row too high. Any footprint: its smallest dx, dy lands on (x, y).
 */
export function propAnchor(obj, x, y) {
  const fp = (obj && Array.isArray(obj.footprint) && obj.footprint.length) ? obj.footprint : [[0, 0]];
  return [x - Math.min(...fp.map((c) => c[0])), y - Math.min(...fp.map((c) => c[1]))];
}

export function attach(field) {
  if (!field || field.books) return field && field.books;
  const s = field.books = new Books(field);
  const wrap = (obj, name, fn) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].ep8) return null;
    const orig = obj[name].bind(obj);
    const f = function (...a) { return fn(orig, ...a); };
    f.ep8 = true;
    obj[name] = f;
    return orig;
  };
  wrap(field.glass, 'reset', (o) => { o(); s.reset(); drawerStacks(field); });
  wrap(field.glass, 'update', (o) => { o(); s.update(); });
  wrap(field.glass, 'drawBeams', (o, r, t) => { s.drawLow(r, t); o(r, t); });
  wrap(field.lighting, 'draw', (o, r, cam, lights, lanternAt) => { o(r, cam, lights, lanternAt); s.drawLine(r, cam); });
  wrap(field, 'canStep', (o, actor, x, y, nx, ny, dir) => (s.mayEnter(actor, nx, ny) ? o(actor, x, y, nx, ny, dir) : false));
  wrap(field, 'collectLights', (o) => { const out = o(); return s.active ? out.concat(s.lights()) : out; });
  wrap(field, 'hiddenInkNear', (o) => o() || s.inkNear());
  wrap(field, 'debugState', (o) => ({ ...o(), books: s.debugState() }));
  soloWrap(field);
  installDebug(field);
  return s;
}

/**
 * The Library's Dash stacks in their own art (art.js DRAWER_TILES): every breakable `object` with sprite `drawer_stack_dash`
 * gets the cracked or broken drawer stack in place of the core art of its `breakable` kind, now and whenever the core puts its
 * art there again (Dash Strike breaking it calls map.setTile). Per map: the map's setTile is wrapped once. Returns the ids.
 */
export function drawerStacks(field) {
  const map = field && field.map;
  if (!map || !field.entities || typeof map.setTile !== 'function') return [];
  ensureArt(map.db, field.engine, map);
  if (!map.db.tiles || !map.db.tiles[DRAWER_TILES.whole]) return [];
  const at = new Map();
  for (const ent of field.entities.values()) {
    if (ent && ent.type === 'object' && ent.ev && ent.ev.breakable && ent.ev.sprite === DRAWER_OBJECT) at.set(`${ent.x},${ent.y}`, ent);
  }
  if (!at.size) return [];
  const tileFor = (ent) => (ent.state === 'broken' ? DRAWER_TILES.broken : DRAWER_TILES.whole);
  if (!map.setTile.ep8) {
    const orig = map.setTile.bind(map);
    const w = function (x, y, id) {
      const ent = w.stacks.get(`${x},${y}`);
      return orig(x, y, ent && id !== tileFor(ent) && !String(id).startsWith('ep8_') ? tileFor(ent) : id);
    };
    w.ep8 = true;
    map.setTile = w;
  }
  map.setTile.stacks = at;
  for (const ent of at.values()) {
    const id = tileFor(ent);
    if ((map.overlays[ent.y][ent.x] || [])[0] === id) continue;
    map.setTile(ent.x, ent.y, id);
    if (map.inBounds(ent.x, ent.y + 1)) { map.recomputeCell(ent.x, ent.y + 1); map.applyTallTiles(ent.x, ent.y); map.repaint(ent.x, ent.y, ent.x, ent.y + 1); }
  }
  return [...at.values()].map((e) => e.id);
}

function installDebug(field) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || !D.commands || D.commands().includes('books')) return;
  const cur = () => { const e = field.engine, f = e && (e.stack || []).find((sc) => sc && sc.name === 'field'); return f && f.books ? f : null; };
  D.register('books', () => { const f = cur(); return f ? f.books.debugState() : null; });
  /** LQ_DEBUG.readBook(eventIdOrBook): as confirm on that book would, from where the leader stands. Resolves the state. */
  D.register('readBook', async (id) => {
    const f = cur();
    if (!f || !f.books.active) return null;
    let ent = f.entities.get(id);
    if (!ent || ent.type !== 'popbook') { const e = f.books.m.events.find((k) => k.book === String(id)); ent = e ? f.entities.get(e.id) : null; }
    const ok = ent ? await f.books.readBook(ent) : false;
    return { ok, state: f.books.debugState() };
  });
  /** LQ_DEBUG.setBooks('s-w') or ({ a: 'n' }): set the books directly (a lab's framing; no sound, no animation). */
  D.register('setBooks', (st) => { const f = cur(); return f ? f.books.setState(st) : null; });
  /** LQ_DEBUG.booksOpen(): the page cells as rows ('.' none, '=' bridge, '#' wall, 'o' uncovered page cell, 'B' a book). */
  D.register('booksOpen', () => {
    const f = cur();
    if (!f || !f.books.active) return null;
    const S = f.books, m = S.m, rows = [];
    for (let y = 0; y < m.H; y++) {
      let r = '';
      for (let x = 0; x < m.W; x++) {
        const i = y * m.W + x;
        if (m.bookAt[i] >= 0) r += 'B';
        else if (m.owner[i] >= 0) r += !covered(m, S.state, i) ? 'o' : S.overVoid(i) ? '=' : '#';
        else r += '.';
      }
      rows.push(r);
    }
    return { rows, state: S.state };
  });
}
