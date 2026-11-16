// Pop-up books, the rule (E8-world, docs/EPISODE8_PLAN.md 4.4 and 5.1). Pure: no DOM, no timers, no randomness. The field
// system (./system.js) and the map tool (tools/maps/ep8_check.mjs) both read it, so the game and mapcheck never disagree.
//
// A map declares its books with a `popbooks` block:
//   popbooks: {
//     books: {
//       a: { x: 14, y: 42, axis: 'ns', length: 3, realm: 'willowmere' },  // a 2 x 1 book at (14..15, 42); opens north or south
//       b: { x: 20, y: 30, axis: 'ew', length: 4, pair: 'c' },           // a 1 x 2 book at (20, 30..31); opens east or west
//     },
//     start: { b: 'w' },        // optional: open on arrival ('n' 's' for an ns book, 'e' 'w' for an ew one)
//     goal: ['lift_up'],        // optional (mapcheck only): the marks the critical path visits, in order
//     budget: 4,                // optional (mapcheck only): a decision budget traded under plan 4.10 (say so in the map)
//   }
// and one `popbook` event per book ({ book: 'a' }) at the book's (x, y). (x, y) is the book's top-left cell: an `ns` book
// covers (x, y) and (x + 1, y), its long sides face north and south; an `ew` book covers (x, y) and (x, y + 1), its long sides
// face west and east.
//
// The rule (one for the whole episode):
//   read     from a long side (the reader's cell is next to the book on that side). A shut book opens AWAY from the reader:
//            its pages fill the book's width for `length` cells beyond its far edge. An open book, read from either long
//            side, shuts. Opening a book whose pair stands open shuts the pair first (only one of them stands).
//   pages    a page cell over void is walkable (a bridge); a page cell over floor is solid (a wall of standing paper).
//   refused  (nothing changes) when the read would put pages on a party cell ('wall_on_party'), take a bridge from under a
//            party cell, its own or its pair's ('bridge_under_party'), or open pages onto an NPC, a foe or a trigger
//            ('onto_actor'). Also 'side' (read from a short end) and 'unknown' (no such book).
//
// The state is a string, one character per book in model.books order: '-' shut, or the direction its pages stand
// ('n' 's' 'e' 'w'). Strings compare and hash for free, so the state search keys on them directly.
//
//   compile(mod)                                       the model, or null (no block). model.errors lists what did not parse.
//   initial(model)                                     the state on arrival (`start`)
//   openDir(model, state, book)                        '-' or the direction book's pages stand
//   pages(model, state, book)                          the cell indices a book's current state covers ([] when shut)
//   sideOf(model, book, x, y)                          the long side (x, y) reads book from ('n' 's' 'e' 'w'), 'end' for a
//                                                      short end, or null when (x, y) is not next to it
//   read(model, state, book, side, partyCells, blockers) { ok, state, opened?, dir?, closed: [book] | [], refused? }
//   walkable(model, state, base, x, y)                 true | false | null (null: not a covered page cell; the base decides)
//   covered(model, state, i)                           is cell i under a standing page now
//   changed(model, a, b)                               cell indices whose cover differs between two states
//   states(model)                                      every legal state (pairs never both open): at most 3^6 = 729

export const POPBOOK_TYPES = ['popbook'];
export const MAX_BOOKS = 6;
export const AXES = { ns: ['n', 's'], ew: ['w', 'e'] };
export const REALMS = ['willowmere', 'hollow', 'emberpeak', 'valewyn', 'desert', 'isles', 'north'];
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const STEP = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
export const SHUT = '-';

/** Does this map use pop-up books (a `popbooks` block or a popbook event)? */
export function hasPopbooks(mod) {
  return !!(mod && (mod.popbooks || (mod.events || []).some((e) => e && e.type === 'popbook')));
}

/**
 * Parse a map's `popbooks` block. Returns null without one. The model:
 *   { W, H, N, books: ['a', ...], index: Map(id -> k), def: [{ id, x, y, axis, length, pair, realm, cells, reads, pagesOf }],
 *     pair: Int8Array (k -> pair k, -1), owner: Int16Array (page cell -> book k, -1), cellDir: Uint8Array (page cell ->
 *     char code of the direction that covers it), bookAt: Int16Array (footprint cell -> k, -1), start: '<state>',
 *     events: [{ id, book, x, y, ev }], errors: [...] }
 */
export function compile(mod) {
  if (!mod || !mod.popbooks) return null;
  const B = mod.popbooks, errors = [];
  const ground = mod.ground || [];
  const H = ground.length, W = H ? Math.max(...ground.map((r) => String(r).length)) : 0, N = W * H;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const raw = B.books && typeof B.books === 'object' ? B.books : {};
  const books = Object.keys(raw).sort();
  if (!books.length) errors.push('popbooks: no books');
  if (books.length > MAX_BOOKS) errors.push(`popbooks: ${books.length} books (at most ${MAX_BOOKS} a map: plan 4.4)`);
  const index = new Map(books.map((id, k) => [id, k]));
  const owner = new Int16Array(N).fill(-1), cellDir = new Uint8Array(N), bookAt = new Int16Array(N).fill(-1);
  const pair = new Int8Array(books.length).fill(-1);
  const def = [];
  for (const [k, id] of books.entries()) {
    const b = raw[id] || {};
    const axis = b.axis === 'ns' || b.axis === 'ew' ? b.axis : null;
    if (!axis) errors.push(`popbooks.${id}: axis "${b.axis}" (ns or ew)`);
    const length = Number.isInteger(b.length) && b.length >= 1 ? b.length : 1;
    if (!(Number.isInteger(b.length) && b.length >= 1)) errors.push(`popbooks.${id}: length ${b.length} is not a whole number of at least 1`);
    const x = b.x | 0, y = b.y | 0;
    if (!Number.isInteger(b.x) || !Number.isInteger(b.y)) errors.push(`popbooks.${id}: x, y must be whole numbers`);
    const ax = axis || 'ns';
    const cells = ax === 'ns' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
    const reads = {}, pagesOf = {};
    for (const side of AXES[ax]) {
      const [dx, dy] = STEP[side];
      reads[side] = cells.map(([cx, cy]) => [cx + dx, cy + dy]);
      const dir = OPP[side];
      const [ex, ey] = STEP[dir];
      const out = [];
      for (let d = 1; d <= length; d++) for (const [cx, cy] of cells) {
        const px = cx + ex * d, py = cy + ey * d;
        if (!inb(px, py)) { errors.push(`popbooks.${id}: its ${dir} pages run off the map at ${px},${py}`); continue; }
        out.push(py * W + px);
      }
      pagesOf[dir] = Int32Array.from(out);
    }
    for (const [cx, cy] of cells) {
      if (!inb(cx, cy)) { errors.push(`popbooks.${id}: the book is off the map at ${cx},${cy}`); continue; }
      const i = cy * W + cx;
      if (bookAt[i] >= 0) errors.push(`popbooks.${id}: the book overlaps book ${books[bookAt[i]]} at ${cx},${cy}`);
      bookAt[i] = k;
    }
    if (b.realm != null && !REALMS.includes(b.realm)) errors.push(`popbooks.${id}: realm "${b.realm}" (one of ${REALMS.join(' ')})`);
    def.push({ id, k, x, y, axis: ax, length, pair: b.pair != null ? String(b.pair) : null, realm: b.realm || null, cells, reads, pagesOf });
  }
  // one owner a cell: no cell belongs to two books' pages (plan 4.4), and no page lies on a book
  for (const d of def) for (const dir of Object.keys(d.pagesOf)) for (const i of d.pagesOf[dir]) {
    if (owner[i] >= 0 && owner[i] !== d.k) errors.push(`popbooks: ${i % W},${(i / W) | 0} is a page cell of books ${books[owner[i]]} and ${d.id} (a cell has one owner)`);
    else { owner[i] = d.k; cellDir[i] = dir.charCodeAt(0); }
    if (bookAt[i] >= 0) errors.push(`popbooks.${d.id}: its ${dir} pages lie on book ${books[bookAt[i]]} at ${i % W},${(i / W) | 0}`);
  }
  for (const d of def) {
    if (d.pair == null) continue;
    const p = index.get(d.pair);
    if (p == null) { errors.push(`popbooks.${d.id}: pair "${d.pair}" is not a book of this map`); continue; }
    if (p === d.k) { errors.push(`popbooks.${d.id}: paired with itself`); continue; }
    const other = def[p];
    if (other.pair != null && other.pair !== d.id) errors.push(`popbooks.${d.id}: pair ${d.pair}, but ${d.pair} pairs ${other.pair}`);
    if (pair[d.k] >= 0 && pair[d.k] !== p) errors.push(`popbooks.${d.id}: two pairs`);
    pair[d.k] = p; pair[p] = d.k;
  }
  // the events: one popbook event per book, at the book's (x, y)
  const events = [];
  const seen = new Set();
  for (const e of mod.events || []) {
    if (!e || e.type !== 'popbook') continue;
    const id = e.book != null ? String(e.book) : '';
    if (!index.has(id)) { errors.push(`popbook ${e.id}: book "${e.book}" is not in the popbooks block`); continue; }
    const d = def[index.get(id)];
    if (e.x !== d.x || e.y !== d.y) errors.push(`popbook ${e.id}: at ${e.x},${e.y}, but book ${id} is at ${d.x},${d.y}`);
    if (seen.has(id)) errors.push(`popbook ${e.id}: book ${id} has two events`);
    seen.add(id);
    events.push({ id: e.id, book: id, x: d.x, y: d.y, ev: e });
  }
  for (const id of books) if (!seen.has(id)) errors.push(`popbooks: book "${id}" has no popbook event`);
  // the start
  const st = books.map(() => SHUT);
  for (const [id, dir] of Object.entries(B.start || {})) {
    if (!index.has(id)) { errors.push(`popbooks.start: "${id}" is not a book of this map`); continue; }
    const d = def[index.get(id)];
    if (!AXES[d.axis].includes(dir)) { errors.push(`popbooks.start: ${id} "${dir}" (an ${d.axis} book opens ${AXES[d.axis].join(' or ')})`); continue; }
    st[d.k] = dir;
  }
  for (const d of def) if (pair[d.k] > d.k && st[d.k] !== SHUT && st[pair[d.k]] !== SHUT) errors.push(`popbooks.start: ${d.id} and its pair ${books[pair[d.k]]} both open`);
  return { W, H, N, books, index, def, pair, owner, cellDir, bookAt, start: st.join(''), events, errors };
}

/** The authored state on arrival. */
export function initial(model) { return model ? model.start : ''; }

const kOf = (model, book) => (typeof book === 'number' ? book : model.index.has(String(book)) ? model.index.get(String(book)) : -1);

/** '-' (shut) or the direction a book's pages stand. */
export function openDir(model, state, book) {
  const k = kOf(model, book);
  return k < 0 ? SHUT : state[k] || SHUT;
}

/** The cells a book's current state covers (cell indices; empty when shut). */
export function pages(model, state, book) {
  const k = kOf(model, book);
  if (k < 0) return [];
  const dir = state[k];
  return dir && dir !== SHUT ? Array.from(model.def[k].pagesOf[dir]) : [];
}

/** The long side (x, y) reads a book from, 'end' for a short end, or null when (x, y) is not beside it. */
export function sideOf(model, book, x, y) {
  const k = kOf(model, book);
  if (k < 0) return null;
  const d = model.def[k];
  for (const side of AXES[d.axis]) if (d.reads[side].some(([rx, ry]) => rx === x && ry === y)) return side;
  for (const [cx, cy] of d.cells) if (Math.abs(cx - x) + Math.abs(cy - y) === 1 && model.bookAt[y * model.W + x] !== k) return 'end';
  return null;
}

const cellOf = (model, c) => (Array.isArray(c) ? (c[0] >= 0 && c[1] >= 0 && c[0] < model.W && c[1] < model.H ? c[1] * model.W + c[0] : -1) : c);
function cellSet(model, list) {
  const s = new Set();
  for (const c of list || []) { const i = cellOf(model, c); if (i >= 0) s.add(i); }
  return s;
}
const hits = (cells, set) => { for (const i of cells) if (set.has(i)) return true; return false; };
const put = (state, k, ch) => state.slice(0, k) + ch + state.slice(k + 1);

/**
 * Read a book from a side. partyCells: [x, y] pairs (or cell indices) of every party member and every cell one is stepping
 * from; blockers: the cells of NPCs, foes and triggers. A refused read returns the state unchanged (the same string).
 */
export function read(model, state, book, side, partyCells = [], blockers = []) {
  const k = model ? kOf(model, book) : -1;
  if (k < 0) return { ok: false, state, closed: [], refused: 'unknown' };
  const d = model.def[k];
  if (!AXES[d.axis].includes(side)) return { ok: false, state, closed: [], refused: 'side' };
  const party = cellSet(model, partyCells);
  const cur = state[k];
  if (cur !== SHUT) {
    if (hits(d.pagesOf[cur], party)) return { ok: false, state, closed: [], refused: 'bridge_under_party' };
    return { ok: true, state: put(state, k, SHUT), opened: null, dir: null, closed: [d.id] };
  }
  const dir = OPP[side];
  const cells = d.pagesOf[dir];
  if (hits(cells, party)) return { ok: false, state, closed: [], refused: 'wall_on_party' };
  const p = model.pair[k];
  let next = put(state, k, dir);
  const closed = [];
  if (p >= 0 && state[p] !== SHUT) {
    if (hits(model.def[p].pagesOf[state[p]], party)) return { ok: false, state, closed: [], refused: 'bridge_under_party' };
    next = put(next, p, SHUT);
    closed.push(model.books[p]);
  }
  if (hits(cells, cellSet(model, blockers))) return { ok: false, state, closed: [], refused: 'onto_actor' };
  return { ok: true, state: next, opened: d.id, dir, closed };
}

/** Is cell i under a standing page in this state? */
export function covered(model, state, i) {
  const k = model.owner[i];
  if (k < 0) return false;
  const dir = state[k];
  return dir !== SHUT && model.cellDir[i] === dir.charCodeAt(0);
}

/**
 * Is (x, y) walkable under the books? base: the map's own collision code at a cell, as a function (x, y) => code or a
 * rows array (map.base before any override). A covered page cell over void is true (a bridge), over anything else false
 * (a wall). Not a covered page cell: null (the base map decides).
 */
export function walkable(model, state, base, x, y) {
  if (!model || x < 0 || y < 0 || x >= model.W || y >= model.H) return null;
  const i = y * model.W + x;
  if (!covered(model, state, i)) return null;
  const code = typeof base === 'function' ? base(x, y) : base && base[y] ? base[y][x] : 'void';
  return code === 'void';
}

/** Cell indices whose cover differs between states a and b. */
export function changed(model, a, b) {
  const out = [];
  for (let k = 0; k < model.books.length; k++) {
    if (a[k] === b[k]) continue;
    if (a[k] !== SHUT) for (const i of model.def[k].pagesOf[a[k]]) out.push(i);
    if (b[k] !== SHUT) for (const i of model.def[k].pagesOf[b[k]]) out.push(i);
  }
  return out;
}

/** Every legal state (a pair never both open), the all-shut state first. */
export function states(model) {
  let out = [''];
  for (let k = 0; k < model.books.length; k++) {
    const opts = [SHUT, ...AXES[model.def[k].axis]], next = [];
    for (const s of out) for (const c of opts) {
      const p = model.pair[k];
      if (c !== SHUT && p >= 0 && p < k && s[p] !== SHUT) continue;
      next.push(s + c);
    }
    out = next;
  }
  return out;
}

/** A readable name for a state: 'a:n b:-' style, for reports. */
export function describe(model, state) {
  return model.books.map((id, k) => `${id}:${state[k]}`).join(' ');
}
