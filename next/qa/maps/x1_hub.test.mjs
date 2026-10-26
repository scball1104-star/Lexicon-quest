// X1-maps-hub (EXPANSION1_PLAN 4.10, 12.1; docs/briefs/X1-maps-hub.md item 4): the edits to valley, willowmere and archive_f1..f3,
// tested against the baseline frozen BEFORE the first edit (qa/maps/x1_baseline/<id>.json, the resolved module as `mapcheck dump`
// printed it, and <id>.walk.json, the reachability of every flag set; never regenerated).
//
// X1_LIVE is a const that X1-integrate flips last, so the "on" state of a map cannot be imported until then. force_on.mjs registers a
// resolve hook that gives ONE importing map module a stub `x1/live.js` (the `?x1=` query of its URL names the regions): every variant
// below is its own module instance, and the real live.js, packs.js and the other maps stay untouched.
//
//   off      the real live.js (X1_LIVE false)              -> each of the five maps is byte-identical to its baseline
//   real:all the switch on, every region on, but the x1 pack NOT ready (packReady false) -> byte-identical to the baseline;
//            after the pack registers late, the next load of the map shows the additions (src/world/maps.js re-import)
//   all      the switch on, every region on, the pack taken as loaded -> the baseline plus exactly the listed additions
//   a region list: each region switch removes exactly its own additions
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMapAs } from './x1_baseline/force_on.mjs';        // first: it installs the hook before any map module is imported
import { NEXT, loadAll, loadDb, validate, walk, buildGrid, withFlags, eventCells, listMapIds, objectCells, isObjectId } from '../../tools/maps/mapcheck.mjs';
import { HUB_MAPS, FLAG_SETS, encodeWalk } from './x1_baseline/walks.mjs';

const BASE_DIR = path.join(NEXT, 'qa', 'maps', 'x1_baseline');
const baseText = Object.fromEntries(HUB_MAPS.map((id) => [id, fs.readFileSync(path.join(BASE_DIR, `${id}.json`), 'utf8')]));
const BASE = Object.fromEntries(HUB_MAPS.map((id) => [id, JSON.parse(baseText[id])]));
const BASE_WALK = Object.fromEntries(HUB_MAPS.map((id) => [id, JSON.parse(fs.readFileSync(path.join(BASE_DIR, `${id}.walk.json`), 'utf8'))]));

const db = await loadDb();                                         // merges assets/tiles/x1_tiles.json (mapcheck) ...
const rd = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
Object.assign(db.enemiesField.sprites, rd('assets/sprites/x1_enemies_field.json').sprites);   // ... and the x1 sprite names, as ensurePack does
Object.assign(db.npcAtlas.sprites, rd('assets/sprites/x1_npcs.json').sprites);
await (await import(pathToFileURL(path.join(NEXT, 'src/data/x1/index.js')).href)).register();
const OFF = await loadAll();                                       // every map as the game sees it today (the real live.js)
const ALL = 'all';
const ON = Object.fromEntries(await Promise.all(HUB_MAPS.map(async (id) => [id, await loadMapAs(id, ALL)])));
const MAPS_ON = { ...OFF, ...ON };                                 // the world with the five edited maps switched on

const ev = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const J = (v) => JSON.stringify(v);
const REGIONS = ['west', 'south', 'north', 'wild'];
const LATE = [...FLAG_SETS.ep1_done, 'first_fight_done', 'strays_started', 'stars_started', 'lantern_get'];   // every gate down and every flagged thing present
const OPEN_DOWNS = ['first_fight_done'];

// ================================================================================================ baseline = off
test('the baseline files are the five maps as they were: a switch off module equals them byte for byte', () => {
  for (const id of HUB_MAPS) {
    assert.equal(J(OFF[id]), baseText[id], `${id}: the real live.js (X1_LIVE false) must resolve to the baseline`);
    assert.deepEqual(OFF[id], BASE[id], id);
  }
});

test('switch on but the x1 pack not registered (packReady false), or a region off: still exactly the baseline where the region owns it', async () => {
  for (const id of HUB_MAPS) {
    const real = await loadMapAs(id, 'real:all');
    assert.equal(J(real), baseText[id], `${id}: switch on, regions on, pack not ready -> the baseline`);
  }
  // willowmere is all west: with the west region off it is the baseline even though the switch is on and the pack counts as loaded
  assert.equal(J(await loadMapAs('willowmere', 'south,north,wild')), baseText.willowmere);
});

// ================================================================================================ the listed additions
/** The exact additions, by map. `sig` strings are built below; ground cells are classified by rectangle. */
const E = (id) => `ev:${id}`, O = (t, x, y) => `ov:${t}@${x},${y}`, D = (t, x, y) => `dc:${t}@${x},${y}`, H = (t, x, y) => `oh:${t}@${x},${y}`,
  M = (name) => `mk:${name}`, X = (t, x, y) => `drop:${t}@${x},${y}`;
const REG = {
  valley: {
    any: [E('x1_roots_valley'), E('x1_chest_roots'), O('wall_broken', 13, 4)],
    west: [E('x1_downs_door'), E('x1_drovers_gate'), E('x1_drovers_gate_b'), E('stray_4'), M('downs_gate')],
    south: [E('x1_millrace_door'), E('x1_fallen_oak'), E('x1_driftlog'), E('x1_chest_sandbar'), M('south_track'),
      D('bush', 25, 38), D('bush', 26, 39), D('x1_boulder_a', 27, 38), X('tree_pine', 23, 37)],
    north: [E('x1_terrace_stair'), E('x1_cleft_fall'), E('x1_cleft_sign'), E('x1_cleft_trig'), E('x1_star_mark_milestone'),
      E('x1_star_mark_door'), M('cleft'), M('stair_foot'), O('ink_bridge_v_faint', 21, 7), O('ink_bridge_v_faint', 21, 8), D('signboard', 23, 9),
      X('tree_pine', 19, 2), X('tree_pine', 20, 0), X('tree_pine', 22, 2), X('tree_pine', 23, 1), X('tree_pine', 19, 7)],
    wild: [H('x1_far_tower', 9, -2)],
  },
  willowmere: {
    any: [],
    west: [E('x1_west_gate'), E('x1_orchard_gate'), E('x1_orchard_gate_b'), E('x1_wall_crack'), E('x1_chest_wall'), M('west_gate'),
      O('wall_broken', 6, 30), D('lamp_post', 1, 15), X('tree_pine', 6, 31)],
  },
  archive_f1: { any: [E('x1_f1_roots'), E('x1_chest_f1'), D('candelabra', 17, 5)] },
  archive_f2: {
    any: [E('x1_f2_bridge'), E('x1_chest_f2'), O('ink_bridge_h_faint', 10, 7), O('ink_bridge_h_faint', 11, 7), O('ink_bridge_h_faint', 12, 7),
      D('lectern', 9, 6)],
    north: [E('x1_keeper_note_f2')],
  },
  archive_f3: { any: [E('x1_f3_shelf'), E('x1_chest_f3'), O('wall_broken', 9, 9)] },
};
// the ground cells each map may change, as [region, x0, y0, x1, y1] (valley) or a rectangle only (the archive floors, where the
// carved alcove re-flows depth() around itself); everything else must be the baseline character
const GROUND = {
  valley: [['north', 19, 3, 23, 8], ['south', 22, 36, 24, 39]],
  willowmere: [],
  archive_f1: [['any', 10, 1, 19, 9]],
  archive_f2: [['any', 3, 2, 16, 11]],
  archive_f3: [],
};
const groundRegion = (id, x, y) => { for (const [r, x0, y0, x1, y1] of GROUND[id]) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return r; return null; };

/** What `on` adds to and takes from `base`, as signature strings (events, overlays, decor, overhead, marks, ground cells). */
function delta(base, on) {
  const s = new Set();
  const same = (a, b) => J(a) === J(b);
  // events: the baseline events are a prefix, unchanged and in order; the rest are additions
  assert.ok(same(on.events.slice(0, base.events.length), base.events), `${base.id}: the baseline events are unchanged, in order, before any addition`);
  for (const e of on.events.slice(base.events.length)) s.add(E(e.id));
  const sub = (list, mk, baseList, dropMk) => {
    const inOn = new Set(list.map(J)), inBase = new Set(baseList.map(J));
    for (const b of baseList) if (!inOn.has(J(b)) && dropMk) s.add(dropMk(b));
    for (const o of list) if (!inBase.has(J(o))) s.add(mk(o));
    const kept = baseList.filter((b) => inOn.has(J(b)));
    assert.ok(same(list.slice(0, kept.length), kept), `${base.id}: the baseline entries that remain stay in place and in order`);
  };
  sub(on.overlays, (o) => O(o.t, o.x, o.y), base.overlays, null);
  sub(on.decor, (d) => D(d.t, d.x, d.y), base.decor, (d) => X(d.t, d.x, d.y));
  sub(on.overhead, (o) => H(o.t, o.x, o.y), base.overhead, null);
  // the only overlays that may go are the scattered flower and pebble decals that sat on a cell the carve or the road now covers
  // (scatter() reads the ground, which the edit changed); they count with the ground cell they stood on
  for (const o of base.overlays.filter((q) => !on.overlays.some((p) => J(p) === J(q)))) {
    assert.ok(/^(flowers_|hydrangea_|tuft_|pebbles_|leaves$)/.test(o.t) && on.ground[o.y][o.x] !== base.ground[o.y][o.x], `${base.id}: overlay ${J(o)} removed without a ground change under it`);
  }
  assert.deepEqual(base.overhead.filter((o) => !on.overhead.some((p) => J(p) === J(o))), [], `${base.id}: no overhead tile removed`);
  for (const [k, v] of Object.entries(base.marks)) assert.deepEqual(on.marks[k], v, `${base.id}: mark ${k} unchanged`);
  for (const k of Object.keys(on.marks)) if (!(k in base.marks)) s.add(M(k));
  // every other field is untouched
  for (const k of Object.keys(base)) if (!['ground', 'overlays', 'decor', 'overhead', 'events', 'marks'].includes(k)) assert.deepEqual(on[k], base[k], `${base.id}.${k} unchanged`);
  for (const k of Object.keys(on)) assert.ok(k in base, `${base.id}: no new top-level field ${k}`);
  assert.equal(on.ground.length, base.ground.length);
  for (let y = 0; y < base.ground.length; y++) {
    assert.equal(on.ground[y].length, base.ground[y].length);
    for (let x = 0; x < base.ground[y].length; x++) if (on.ground[y][x] !== base.ground[y][x]) s.add(`g:${x},${y}`);
  }
  return s;
}

const expectedSet = (id, regions) => {
  const out = new Set(REG[id].any);
  for (const r of regions) for (const sig of REG[id][r] || []) out.add(sig);
  return out;
};
const withGround = (id, set, regions) => {
  for (const sg of [...set]) if (sg.startsWith('g:')) {
    set.delete(sg);
    const [x, y] = sg.slice(2).split(',').map(Number);
    const r = groundRegion(id, x, y);
    assert.ok(r, `${id}: ground cell ${x},${y} changed outside every allowed rectangle`);
    assert.ok(r === 'any' || regions.includes(r), `${id}: ground cell ${x},${y} belongs to the ${r} region, which is off`);
    set.add('g');                                              // one marker is enough: the cells themselves are pinned in the test above
  }
  return set;
};

for (const id of HUB_MAPS) {
  test(`${id}: with everything on, only the listed additions appear (events, overlays, decor, overhead, marks, ground cells)`, () => {
    const d = delta(BASE[id], ON[id]);
    const got = withGround(id, d, REGIONS);
    const want = expectedSet(id, REGIONS);
    if (GROUND[id].length) want.add('g');
    assert.deepEqual([...got].sort(), [...want].sort());
  });
}

test('the ground cells that change are exactly the cleft, the stair, the south track and the two carved alcoves', () => {
  const cells = (id) => [...delta(BASE[id], ON[id])].filter((s) => s.startsWith('g:')).map((s) => s.slice(2));
  const v = BASE.valley, o = ON.valley;
  // valley: the stair, the cleft (ink on x 19..23 rows 6..8 but the landing (21, 6)), the track
  const want = new Set();
  for (const y of [3, 4, 5]) want.add(key(21, y));
  for (let y = 6; y <= 8; y++) for (let x = 19; x <= 23; x++) if (!(x === 21 && y === 6)) want.add(key(x, y));
  for (let y = 36; y <= 39; y++) for (const x of [22, 23, 24]) want.add(key(x, y));
  const got = new Set(cells('valley'));
  for (const c of want) { const [x, y] = c.split(',').map(Number); assert.ok(got.has(c) || v.ground[y][x] === o.ground[y][x], `valley cell ${c}`); }
  for (const c of got) assert.ok(want.has(c), `valley unexpected ground change at ${c}`);
  assert.deepEqual([o.ground[3][21], o.ground[4][21], o.ground[5][21]], ['S', 't', 'z']);
  for (let y = 6; y <= 8; y++) for (let x = 19; x <= 23; x++) assert.equal(o.ground[y][x], x === 21 && y === 6 ? '.' : 'i', `cleft ${x},${y}`);
  for (let y = 35; y <= 39; y++) for (const x of [22, 23, 24]) assert.equal(o.ground[y][x], '=', `track ${x},${y}`);
  assert.deepEqual(cells('willowmere'), []);
  assert.deepEqual(cells('archive_f3'), []);
  for (const id of ['archive_f1', 'archive_f2']) {
    const list = cells(id).map((c) => c.split(',').map(Number));
    assert.ok(list.length > 0 && list.length < 80, `${id}: the carve is local (${list.length} cells)`);
    for (const [x, y] of list) assert.ok(groundRegion(id, x, y), `${id}: ${x},${y}`);
  }
});

test('the pine filters: nothing lands on the notch, the track or the west lane, and only the listed pines are dropped', () => {
  const pines = ON.valley.decor.filter((d) => d.t === 'tree_pine');
  for (const p of pines) {
    assert.ok(!(p.x >= 19 && p.x <= 23 && p.y <= 8), `a pine at ${p.x},${p.y} stands in the Keepers' notch or cleft`);
    assert.ok(!(p.x >= 21 && p.x <= 25 && p.y >= 35), `a pine at ${p.x},${p.y} stands on the south track`);
    assert.ok(!(p.x <= 3 && p.y >= 27 && p.y <= 30), `a pine at ${p.x},${p.y} stands at the west lane`);
  }
  const dropped = BASE.valley.decor.filter((d) => !ON.valley.decor.some((o) => J(o) === J(d)));
  assert.deepEqual(dropped.map((d) => `${d.t}@${d.x},${d.y}`).sort(), ['tree_pine@19,2', 'tree_pine@19,7', 'tree_pine@20,0', 'tree_pine@22,2', 'tree_pine@23,1', 'tree_pine@23,37']);
  // and nothing else of the valley's decor moved
  assert.equal(ON.valley.decor.filter((d) => d.t === 'tree_pine').length, BASE.valley.decor.filter((d) => d.t === 'tree_pine').length - 6);
});

// ================================================================================================ each region switch removes exactly its additions
const SPECS = { all: REGIONS, none: [], ...Object.fromEntries(REGIONS.map((r) => [`only ${r}`, [r]])), ...Object.fromEntries(REGIONS.map((r) => [`not ${r}`, REGIONS.filter((x) => x !== r)])) };
for (const [name, regions] of Object.entries(SPECS)) {
  test(`region switches (${name}): each map is the baseline plus exactly the additions of ${regions.join(' + ') || 'the generic ones only'}`, async () => {
    const spec = regions.length ? regions.join(',') : 'none';
    for (const id of HUB_MAPS) {
      const m = await loadMapAs(id, spec);
      const raw = delta(BASE[id], m);
      const got = withGround(id, raw, regions);
      const want = expectedSet(id, regions);
      // the ground marker is expected exactly when a region in play owns ground cells (the carves of the two archive floors belong to every region)
      if (GROUND[id].some(([r]) => r === 'any' || regions.includes(r))) want.add('g');
      assert.deepEqual([...got].sort(), [...want].sort(), `${id} under ${name}`);
    }
  });
}

test('a region off removes exactly its own cells: the cleft and stair vanish with north, the track with south, the lane with west', async () => {
  const chk = async (spec, fn) => fn(await loadMapAs('valley', spec));
  await chk('west,south,wild', (m) => { assert.equal(m.ground[3][21], '^'); assert.equal(m.ground[7][21], BASE.valley.ground[7][21]); assert.ok(!ev(m, 'x1_terrace_stair')); });
  await chk('west,north,wild', (m) => { assert.equal(m.ground[38][23], BASE.valley.ground[38][23]); assert.ok(!ev(m, 'x1_fallen_oak')); assert.ok(!ev(m, 'x1_millrace_door')); });
  await chk('south,north,wild', (m) => { assert.ok(!ev(m, 'x1_downs_door')); assert.ok(!ev(m, 'x1_drovers_gate')); assert.ok(!ev(m, 'stray_4')); assert.ok(ev(m, 'x1_roots_valley'), 'the secret in the cliff is not a region thing'); });
  await chk('west,south,north', (m) => assert.deepEqual(m.overhead, []));
});

// ================================================================================================ the walk oracle
const decodeReach = (rows) => {
  const out = new Set();
  for (const r of rows) { const [y, runs] = r.split(':'); for (const run of runs.split(',')) { const [a, b] = run.split('-').map(Number); for (let x = a; x <= (b ?? a); x++) out.add(key(x, +y)); } }
  return out;
};
const parseMarks = (list) => Object.fromEntries(list.map((s) => { const m = s.match(/^(.+)@(-?\d+),(-?\d+):([01])([01])$/); return [m[1], { x: +m[2], y: +m[3], walkable: m[4] === '1', reached: m[5] === '1' }]; }));
const parseEvents = (list) => Object.fromEntries(list.map((s) => { const i = s.lastIndexOf(':'); return [s.slice(0, i), s.slice(i + 1) === '1']; }));
/** Cells that may be newly closed: the new solid things (gates, oak, the log and its pocket, the cleft's water) and nothing else. */
const NEWLY_CLOSED = {
  valley: new Set(['19,6', '20,6', '22,6', '23,6', '19,7', '20,7', '22,7', '23,7', '19,8', '20,8', '22,8', '23,8', '23,9', '0,28', '0,29', '7,20', '38,6', '38,20',
    '21,37', '22,37', '23,37', '24,37', '26,37', '25,38', '26,38', '27,38', '26,39', '27,39', '21,7', '21,8', '21,6']),
  willowmere: new Set(['1,15', '0,16', '0,17']),
  archive_f1: new Set(), archive_f2: new Set(), archive_f3: new Set(['9,11']),
};

for (const id of HUB_MAPS) {
  test(`${id}: the walk oracle: the off module walks exactly as the baseline, and every previously reachable cell, event and mark stays reachable on`, () => {
    for (const [setName, flags] of Object.entries(FLAG_SETS)) for (const lantern of [false, true]) {
      const label = `${id} ${setName}${lantern ? '+lantern' : ''}`;
      const frozen = BASE_WALK[id][`${setName}${lantern ? '+lantern' : ''}`];
      assert.ok(frozen, `${label}: baseline record`);
      // off = the baseline, walk for walk
      assert.deepEqual(encodeWalk(walk(OFF[id], db, { flags, lantern })), frozen, `${label}: the off module walks as the baseline`);
      // on = a superset of it, except the cells the new solid things and the cleft take
      const w = walk(ON[id], db, { flags, lantern });
      const was = decodeReach(frozen.reach), now = new Set(w.reachable);
      const g = buildGrid(withFlags(ON[id], flags), db);
      for (const c of was) {
        if (now.has(c)) continue;
        const [x, y] = c.split(',').map(Number);
        const closed = g.code[y][x] !== 'none' && g.code[y][x] !== 'pit';
        assert.ok(closed || NEWLY_CLOSED[id].has(c), `${label}: ${c} was reachable and is not any more (${g.why[y][x]})`);
      }
      // the walkable cells the lantern-less cleft takes are the only reachability lost without a solid cause
      const evNow = Object.fromEntries(w.events.map((e) => [e.id, e.reached]));
      for (const [eid, was1] of Object.entries(parseEvents(frozen.events))) if (was1) assert.ok(evNow[eid], `${label}: event ${eid} was reached and is not`);
      const mkNow = Object.fromEntries(w.marks.map((m) => [m.name, m]));
      for (const [name, m] of Object.entries(parseMarks(frozen.marks))) {
        assert.ok(mkNow[name], `${label}: mark ${name}`);
        assert.equal(mkNow[name].walkable, m.walkable, `${label}: mark ${name} keeps its walkability`);
        if (m.reached) assert.ok(mkNow[name].reached, `${label}: mark ${name} was reached and is not`);
      }
    }
  });
}

test('no solid thing lands on an arrival, a mark, a font, a bell or the start: every walkable cell of the baseline stays walkable but the listed ones', () => {
  for (const id of HUB_MAPS) for (const flags of [[], LATE]) {
    const a = buildGrid(withFlags(BASE[id], flags), db), b = buildGrid(withFlags(ON[id], flags), db);
    const closed = [];
    for (let y = 0; y < a.H; y++) for (let x = 0; x < a.W; x++) if (a.code[y][x] === 'none' && b.code[y][x] !== 'none') closed.push(key(x, y));
    for (const c of closed) assert.ok(NEWLY_CLOSED[id].has(c), `${id}${flags.length ? ' (late)' : ' (fresh)'}: ${c} was walkable and is now ${b.code[+c.split(',')[1]][+c.split(',')[0]]} (${b.why[+c.split(',')[1]][+c.split(',')[0]]})`);
    // the protected cells: every existing mark, the start, the cell under every font, every arrival into the map from anywhere
    const protectedCells = new Set([key(BASE[id].start.x, BASE[id].start.y)]);
    for (const [, [x, y]] of Object.entries(BASE[id].marks)) protectedCells.add(key(x, y));
    for (const e of BASE[id].events) if (e.type === 'font' || e.safe) for (const [x, y] of eventCells(e)) protectedCells.add(key(x, y));
    for (const m of Object.values(MAPS_ON)) {
      for (const t of [...(m.events || []).filter((e) => e.type === 'door' || e.type === 'pit' || e.type === 'gate' || e.type === 'locked_door').map((e) => e.to), ...(m.exits || []).map((x) => x.to), m.pitTo]) {
        if (Array.isArray(t) && t[0] === id) protectedCells.add(key(t[1], t[2]));
      }
    }
    const fills = new Set();
    for (const e of withFlags(ON[id], flags).events.slice(BASE[id].events.length)) if (e.solid !== false && ['object', 'block', 'chest', 'npc', 'enemy', 'actor'].includes(e.type)) for (const c of footprint(e)) fills.add(c);
    for (const c of protectedCells) {
      const [x, y] = c.split(',').map(Number);
      if (a.code[y][x] !== 'none') continue;                       // a camera mark that stood on something solid before stays so
      assert.equal(b.code[y][x], 'none', `${id}: protected cell ${c} must stay walkable (${b.why[y][x]})`);
      assert.ok(!fills.has(c), `${id}: protected cell ${c} lies under the footprint of a new object`);
    }
  }
});

// ================================================================================================ the plan's contract, cell by cell
const present = (m, id, flags) => withFlags(m, flags).events.find((e) => e.id === id);
const cellsOfEvent = (e) => eventCells(e).map(([x, y]) => key(x, y));
/** The cells an event really fills in the field: its own cells plus the footprint of its object sprite (mapcheck's grid only knows the first). */
const footprint = (e) => {
  const out = new Set(cellsOfEvent(e));
  if (e.sprite && isObjectId(db, e.sprite) && e.type !== 'block') { const o = objectCells(db, e.sprite, e.x, e.y); if (o) for (const [x, y] of o.solid) out.add(key(x, y)); }
  return out;
};

test('the first-fight trigger is untouched and still covers column 7; the drovers\' gate and Orchard Lane gate hold the Downs shut until first_fight_done', () => {
  const t = ev(ON.valley, 'first_fight_trig');
  assert.deepEqual(t, ev(BASE.valley, 'first_fight_trig'));
  assert.deepEqual([t.x, t.y, t.w, t.h], [7, 6, 1, 34]);
  const gb = buildGrid(withFlags(BASE.valley, []), db);
  for (let y = 6; y <= 39; y++) if (gb.code[y][7] === 'none') assert.ok(y >= t.y && y < t.y + t.h, `column 7 row ${y}`);
  // valley
  for (const flags of [[], ['intro_done', 'left_town']]) {
    assert.equal(present(ON.valley, 'x1_downs_door', flags), undefined, 'no door to the Downs before first_fight_done');
    for (const id of ['x1_drovers_gate', 'x1_drovers_gate_b']) assert.ok(present(ON.valley, id, flags), id);
    const g = buildGrid(withFlags(ON.valley, flags), db);
    assert.equal(g.code[28][0], 'solid'); assert.equal(g.code[29][0], 'solid');
    const w = walk(ON.valley, db, { flags });
    assert.ok(!w.reachable.includes('0,28') && !w.reachable.includes('0,29'), 'the party cannot stand on the door cells');
    assert.ok(w.reachable.includes('1,28'), 'the cell inside the lane is open');
  }
  const open = ['first_fight_done'];
  const d = present(ON.valley, 'x1_downs_door', open);
  assert.deepEqual([d.x, d.y, d.w, d.h, d.kind], [0, 28, 1, 2, 'door']);
  assert.deepEqual(d.to, ['x1_downs', 54, 11, 'left']);
  for (const id of ['x1_drovers_gate', 'x1_drovers_gate_b']) assert.equal(present(ON.valley, id, open), undefined);
  assert.equal(ev(ON.valley, 'x1_drovers_gate').text, 'x1_drovers_gate');
  assert.ok(walk(ON.valley, db, { flags: open }).reachable.includes('0,28'));
  // willowmere
  for (const flags of [[], ['intro_done']]) {
    assert.equal(present(ON.willowmere, 'x1_west_gate', flags), undefined);
    for (const id of ['x1_orchard_gate', 'x1_orchard_gate_b']) assert.ok(present(ON.willowmere, id, flags), id);
    const g = buildGrid(withFlags(ON.willowmere, flags), db);
    assert.equal(g.code[16][0], 'solid'); assert.equal(g.code[17][0], 'solid');
    assert.ok(walk(ON.willowmere, db, { flags }).reachable.includes('1,16'));
  }
  const wg = present(ON.willowmere, 'x1_west_gate', open);
  assert.deepEqual([wg.x, wg.y, wg.w, wg.h], [0, 16, 1, 2]);
  assert.deepEqual(wg.to, ['x1_downs', 54, 25, 'left']);
  assert.equal(present(ON.willowmere, 'x1_orchard_gate', open), undefined);
  assert.equal(ev(ON.willowmere, 'x1_orchard_gate').text, 'x1_orchard_gate');
  assert.ok(walk(ON.willowmere, db, { flags: open }).reachable.includes('0,16'));
});

test('the Keepers\' cleft: a pit until the Lantern; the stair foot and the stair door are reached only over the bridge; the sign and the hint', () => {
  const m = ON.valley;
  const g = buildGrid(withFlags(m, LATE), db);
  assert.equal(g.code[7][21], 'pit'); assert.equal(g.code[8][21], 'pit');
  for (const x of [19, 20, 22, 23]) for (const y of [6, 7, 8]) assert.equal(g.code[y][x], 'water', `ink ${x},${y}`);
  assert.equal(g.code[6][21], 'none', 'the stair foot is ground');
  assert.deepEqual([m.ground[5][21], m.ground[4][21], m.ground[3][21]], ['z', 't', 'S']);
  const stair = ev(m, 'x1_terrace_stair');
  assert.deepEqual([stair.x, stair.y, stair.kind], [21, 3, 'stairs']);
  assert.deepEqual(stair.to, ['x1_terrace', 6, 19, 'up']);
  const dark = walk(m, db, { flags: LATE }), lit = walk(m, db, { flags: LATE, lantern: true });
  assert.ok(!dark.reachable.includes('21,6') && !dark.reachable.includes('21,3'), 'without the Lantern the stair is out of reach');
  assert.equal(dark.events.find((e) => e.id === 'x1_terrace_stair').reached, false);
  assert.ok(lit.reachable.includes('21,6') && lit.reachable.includes('21,3'));
  assert.equal(lit.events.find((e) => e.id === 'x1_terrace_stair').reached, true);
  assert.ok(lit.marks.find((k) => k.name === 'stair_foot').reached && lit.marks.find((k) => k.name === 'cleft').reached);
  // a party that walked down the stair without the Lantern and steps on the bridge falls back to the cleft's south lip
  const fall = ev(m, 'x1_cleft_fall');
  assert.equal(fall.type, 'pit');
  assert.deepEqual([fall.x, fall.y, fall.w, fall.h], [21, 7, 1, 2]);
  assert.deepEqual(fall.to, ['valley', 21, 9, 'down']);
  assert.equal(g.code[fall.to[2]][fall.to[1]], 'none');
  // the sign and the once-only trigger
  const sign = ev(m, 'x1_cleft_sign');
  assert.equal(sign.text, 'x1_cleft_sign');
  const trig = ev(m, 'x1_cleft_trig');
  assert.equal(trig.script, 'cleft_hint'); assert.equal(trig.if, 'lantern_get');
  assert.ok(trig.x <= 21 && trig.x + trig.w > 21 && trig.y === 9, 'the hint trigger covers the cleft mark\'s row');
  assert.deepEqual(m.marks.cleft, [21, 9]); assert.deepEqual(m.marks.stair_foot, [21, 6]);
  // the faint bridge is the Lantern's: both cells are faint overlays that the reveal turns to walkable
  for (const y of [7, 8]) assert.ok(m.overlays.some((o) => o.t === 'ink_bridge_v_faint' && o.x === 21 && o.y === y));
});

test('the fallen oak blocks the south track until archive_f1_done; then the door to the Millrace exists', () => {
  const m = ON.valley;
  const oak = ev(m, 'x1_fallen_oak');
  assert.equal(oak.ifNot, 'archive_f1_done');
  const lying = footprint(oak);
  for (const x of [22, 23, 24]) assert.ok(lying.has(key(x, 37)), `the oak lies across the track at ${x},37`);
  assert.equal(oak.ifNot, 'archive_f1_done');
  assert.equal(present(m, 'x1_millrace_door', ['first_fight_done']), undefined);
  assert.equal(present(m, 'x1_fallen_oak', ['first_fight_done', 'archive_f1_done']), undefined);
  const door = present(m, 'x1_millrace_door', ['archive_f1_done']);
  assert.deepEqual([door.x, door.y, door.w, door.h], [22, 39, 3, 1]);
  assert.deepEqual(door.to, ['x1_millrace', 23, 1, 'down']);
  const gYes = buildGrid(withFlags(m, ['archive_f1_done']), db);
  for (const x of [22, 23, 24]) assert.equal(gYes.code[37][x], 'none');
  const w = walk(m, db, { flags: ['archive_f1_done'] });
  for (const c of ['23,38', '22,39', '24,39']) assert.ok(w.reachable.includes(c), c);
  assert.deepEqual(m.marks.south_track, [23, 38]);
  // no flag at all: the party can still walk the meadow up to the oak, nothing is cut off
  assert.ok(walk(m, db, { flags: [] }).reachable.includes('23,38'), 'the track end is open ground either way (the door is what is shut)');
});

test('the star marks, the stray and the far tower: flags, scenes, lantern and cells', () => {
  const m = ON.valley;
  for (const [id, x, y, script] of [['x1_star_mark_milestone', 38, 20, 'star_read_1'], ['x1_star_mark_door', 38, 6, 'star_read_2']]) {
    const e = ev(m, id);
    assert.deepEqual([e.x, e.y, e.type, e.script, e.lantern, e.if], [x, y, 'object', script, true, 'stars_started'], id);
  }
  assert.ok(ev(m, 'x1_star_mark_door').x - 37 === 1 && ev(m, 'x1_star_mark_door').y - 5 === 1, 'beside the Archive door carving (37, 5)');
  const stray = ev(m, 'stray_4');
  assert.deepEqual([stray.type, stray.x, stray.y, stray.if], ['npc', 7, 20, 'strays_started']);
  assert.deepEqual(m.overhead, [{ t: 'x1_far_tower', x: 9, y: -2 }]);
  // the stray stands in the fenced pasture (3..11, 18..23)
  assert.ok(stray.x > 3 && stray.x < 11 && stray.y > 18 && stray.y < 23);
});

test('the secrets: every chest is reachable by its ability and not before', () => {
  const closedBFS = (map, flags, start, extraSolid, extraOpen = []) => {
    const g = buildGrid(withFlags(map, flags), db);
    const solid = new Set(extraSolid), open = new Set(extraOpen);
    const seen = new Set([start]), q = [start];
    while (q.length) {
      const [x, y] = q.shift().split(',').map(Number);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || seen.has(k) || solid.has(k)) continue;
        if (g.code[ny][nx] === 'none' || open.has(k)) { seen.add(k); q.push(k); }
      }
    }
    return seen;
  };
  const touch = (seen, c) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(key(c[0] + dx, c[1] + dy)));
  const adj = (m, id) => { const e = ev(m, id); return [e.x, e.y]; };

  // Dash: valley roots, Willowmere's crack, the F1 root wall. The chest is `behind` the breakable and inside its cells; the
  // breakable itself is solid until broken, and the walk breaks it (the unlocker) from a reachable cell.
  const breakables = [['valley', 'x1_roots_valley', 'x1_chest_roots', 'roots'], ['willowmere', 'x1_wall_crack', 'x1_chest_wall', 'rock'], ['archive_f1', 'x1_f1_roots', 'x1_chest_f1', 'roots']];
  for (const [id, bid, cid, kind] of breakables) {
    const m = ON[id], b = ev(m, bid), c = ev(m, cid);
    assert.equal(b.type, 'object'); assert.equal(b.breakable, kind); assert.equal(b.h, 2);
    assert.equal(c.behind, bid, `${cid} is hidden behind ${bid}`);
    if (id !== 'archive_f1') assert.ok(cellsOfEvent(b).includes(key(c.x, c.y)), `${cid} stands inside the cells of ${bid}`);
    const w = walk(m, db, { flags: LATE });
    assert.ok(w.log.some((l) => l === `broke ${bid}`), `${id}: the walk breaks ${bid} from a reachable cell`);
    assert.equal(w.events.find((e) => e.id === cid).reached, true, `${cid} reached after the break`);
    // a Dash lane exists: some reachable cell is orthogonally next to the breakable (the dash starts there)
    const reach = new Set(w.reachable);
    assert.ok(cellsOfEvent(b).some((k) => { const [x, y] = k.split(',').map(Number); return [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => reach.has(key(x + dx, y + dy))); }), `${bid} has a standing cell`);
  }
  // the F1 alcove is shut off by the roots: with them solid nothing inside is reachable, with them gone it is
  {
    const m = ON.archive_f1, g = buildGrid(withFlags(m, LATE), db);
    const w = walk(m, db, { flags: LATE });
    const roots = ev(m, 'x1_f1_roots'), chest = ev(m, 'x1_chest_f1');
    const before = closedBFS(m, LATE, key(11, 5), cellsOfEvent(roots));                // from the key alcove with the roots in place
    assert.ok(!before.has(key(chest.x, chest.y + 1)) && !before.has('14,5') && !before.has('13,5'), 'the alcove is sealed by the roots');
    const after = closedBFS(m, LATE, key(11, 5), [], cellsOfEvent(roots));
    assert.ok(after.has('13,5') && after.has('14,5') && touch(after, [chest.x, chest.y]), 'the roots gone, the chest can be opened');
    assert.ok(w.reachable.includes('13,5'), 'the walk reaches the alcove');
    assert.ok(g.code[5][13] === 'none' && g.code[6][17] === 'none');
  }
  // Shove: the valley driftlog (sandbar chest) and the F3 bookcase (niche chest). Block in place: nothing can touch the chest;
  // block shoved one cell aside (a Shove moves a heavy block one tile either way): the cell it stood on is open and the chest can be opened.
  for (const [id, bid, cid, sides] of [['valley', 'x1_driftlog', 'x1_chest_sandbar', [[25, 37], [27, 37]]], ['archive_f3', 'x1_f3_shelf', 'x1_chest_f3', [[8, 11], [10, 11]]]]) {
    const m = ON[id], blk = ev(m, bid), c = ev(m, cid);
    assert.equal(blk.type, 'block'); assert.equal(blk.heavy, true);
    const g = buildGrid(withFlags(m, LATE), db);
    for (const [x, y] of sides) assert.equal(g.code[y][x], 'none', `${bid}: side cell ${x},${y} is open floor (the Shove has room, the block never traps anyone)`);
    for (const [from, to] of [[sides[0], sides[1]], [sides[1], sides[0]]]) {
      const before = closedBFS(m, LATE, key(from[0], from[1]), [key(blk.x, blk.y), key(c.x, c.y)]);
      assert.ok(!touch(before, [c.x, c.y]), `${cid}: with ${bid} in place nothing can open it`);
      const after = closedBFS(m, LATE, key(from[0], from[1]), [key(to[0], to[1]), key(c.x, c.y)], [key(blk.x, blk.y)]);   // the block now stands on the far side
      assert.ok(after.has(key(blk.x, blk.y)) && touch(after, [c.x, c.y]), `${cid}: shoved to ${to}, the cell it left is open and the chest can be opened`);
    }
    assert.ok(walk(m, db, { flags: LATE }).events.find((e) => e.id === cid).reached);
  }
  // F3: the party gets to the niche from the stacks (the block's cell is reachable: blocks are passable in the walk)
  const f3 = walk(ON.archive_f3, db, { flags: LATE });
  assert.ok(f3.reachable.includes('9,11') && f3.reachable.includes('8,11') && f3.reachable.includes('10,11'));
});

test('the F2 Reader\'s Alcove: only after the Lantern, across a three-cell ink bridge; the note names the Terrace only with the north region on', () => {
  const m = ON.archive_f2;
  const bridge = [10, 11, 12].map((x) => m.overlays.find((o) => o.t === 'ink_bridge_h_faint' && o.x === x && o.y === 7));
  assert.ok(bridge.every(Boolean), 'three faint bridge cells');
  const dark = walk(m, db, { flags: LATE }), lit = walk(m, db, { flags: LATE, lantern: true });
  const alc = ['7,6', '7,5', '9,6'];
  assert.ok(alc.every((c) => !dark.reachable.includes(c)), 'no alcove cell without the Lantern');
  assert.ok(['7,5', '7,7', '8,8', '9,8', '9,5', '6,8'].every((c) => lit.reachable.includes(c)), 'the alcove with the Lantern');
  assert.equal(lit.events.find((e) => e.id === 'x1_chest_f2').reached, true);
  assert.equal(ev(m, 'x1_chest_f2').tier, 'iron'); assert.equal(ev(m, 'x1_chest_f2').item, undefined, 'rolled');
  const note = ev(m, 'x1_keeper_note_f2');
  assert.deepEqual([note.type, note.book, note.lantern], ['book', 'x1_keeper_note_f2', true]);
  const fall = ev(m, 'x1_f2_bridge');
  assert.equal(fall.type, 'pit'); assert.deepEqual(fall.to, ['archive_f2', 13, 7, 'left']);
  const g = buildGrid(withFlags(m, LATE), db);
  assert.equal(g.code[7][13], 'none');
  for (const x of [10, 11, 12]) assert.equal(g.code[7][x], 'pit'); for (const x of [10, 11, 12]) assert.equal(g.code[8][x], 'water');
});

test('every new door lands on a walkable cell facing away from its door, both directions (plan 3.2)', () => {
  const LINKS = [
    // [from map, source cells (first, last), to [map, x, y, dir]]
    ['willowmere', [0, 16], [0, 17], ['x1_downs', 54, 25, 'left']],
    ['x1_downs', [55, 24], [55, 25], ['willowmere', 1, 16, 'right']],
    ['valley', [0, 28], [0, 29], ['x1_downs', 54, 11, 'left']],
    ['x1_downs', [55, 10], [55, 11], ['valley', 1, 28, 'right']],
    ['valley', [21, 3], [21, 3], ['x1_terrace', 6, 19, 'up']],
    ['x1_terrace', [6, 20], [6, 20], ['valley', 21, 6, 'down']],
    ['x1_terrace', [56, 10], [57, 11], ['valley', 36, 8, 'down'], true],           // the one-way drop: no way back behind it
    ['valley', [22, 39], [24, 39], ['x1_millrace', 23, 1, 'down']],
    ['x1_millrace', [22, 0], [24, 0], ['valley', 23, 38, 'up']],
  ];
  const FACE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const transfers = (m) => [
    ...(m.events || []).filter((e) => (e.type === 'door' || e.type === 'pit') && e.to).map((e) => ({ cells: cellsOfEvent(e), to: e.to, how: e.id })),
    ...(m.exits || []).map((x) => ({ cells: eventCells({ ...x, type: 'exit' }).map(([cx, cy]) => key(cx, cy)), to: x.to, how: 'exit' })),
  ];
  for (const [from, a, b, to, oneWay] of LINKS) {
    const m = MAPS_ON[from];
    const t = transfers(m).find((x) => J(x.to) === J(to) && x.cells.includes(key(a[0], a[1])) && x.cells.includes(key(b[0], b[1])));
    assert.ok(t, `${from} (${a}..${b}) -> ${to.join(',')} exists (${t ? t.how : 'missing'})`);
    // the arrival cell is walkable (every gate down) and the party faces away from the door it came through
    const target = MAPS_ON[to[0]];
    const g = buildGrid(withFlags(target, LATE), db);
    assert.equal(g.code[to[2]][to[1]], 'none', `arrival ${to.join(',')} is walkable`);
    // away from the door: stepping back (against the facing) reaches a transfer cell of the target map that leads home, within 4 cells, over open ground
    const [dx, dy] = FACE[to[3]];
    let back = null;
    for (let i = 1; i <= 4 && !back; i++) {
      const cx = to[1] - dx * i, cy = to[2] - dy * i;
      if (transfers(target).some((x) => x.to[0] === from && x.cells.includes(key(cx, cy)))) back = [cx, cy];
      else if (!(g.code[cy] && (g.code[cy][cx] === 'none' || g.code[cy][cx] === 'pit'))) break;
    }
    assert.ok(back || oneWay, `${to.join(',')}: the way back to ${from} lies straight behind the arrival`);
  }
});

test('tools/maps/x1_links.json: every listed target exists now, and every link of plan 3.2 has both halves', () => {
  const links = JSON.parse(fs.readFileSync(path.join(NEXT, 'tools/maps/x1_links.json'), 'utf8')).links;
  const ids = new Set(listMapIds());
  for (const l of links) { assert.ok(ids.has(l.from), `from ${l.from}`); assert.ok(ids.has(l.to), `target ${l.to} exists`); }
  const reach = (m, id) => (m.events || []).some((e) => (e.type === 'door' || e.type === 'pit') && e.to && e.to[0] === id) || (m.exits || []).some((x) => x.to[0] === id);
  for (const l of links) assert.ok(reach(MAPS_ON[l.from], l.to), `${l.from} has a transfer to ${l.to}`);
  for (const [a, b] of [['willowmere', 'x1_downs'], ['valley', 'x1_downs'], ['valley', 'x1_terrace'], ['valley', 'x1_millrace']]) {
    assert.ok(reach(MAPS_ON[a], b), `${a} -> ${b}`); assert.ok(reach(MAPS_ON[b], a), `${b} -> ${a}`);
  }
});

test('all five edited maps and all eleven x1 maps validate with the hub switched on (ids, targets, arrival cells, NPC coverage, plans, walks)', () => {
  const x1 = ['x1_downs', 'x1_loomhouse', 'x1_barrow', 'x1_terrace', 'x1_orrery', 'x1_cellar', 'x1_millrace', 'x1_mill', 'x1_culvert', 'x1_highmoor', 'x1_larchhill'];
  // the integrate wave owns the two gate sprites (events.js GATE_SPRITES and mapcheck GATE_SPRITE_IDS): the same seams the maps tests tolerate
  const SEAM = /^gate (gate_reeve: sprite x1_gate_barrow|gate_drain: sprite x1_gate_culvert)$/;
  for (const id of [...HUB_MAPS, ...x1]) {
    assert.ok(MAPS_ON[id], id);
    const r = validate(MAPS_ON[id], db, MAPS_ON, {});
    assert.deepEqual(r.errors.filter((e) => !SEAM.test(e)), [], `${id}`);
    assert.deepEqual(r.warnings.filter((w) => !/neither script nor text/.test(w)), [], `${id} warnings`);
  }
  // stray_4 is placed once (the pack's NPC record names the valley) and the baseline valley, with the pack registered, would miss it
  assert.equal(MAPS_ON.valley.events.filter((e) => e.type === 'npc' && e.id === 'stray_4').length, 1);
});

// ================================================================================================ the loops, on foot
test('the loops on foot: town, Downs, valley, town; Downs, Drovers\' Road, Millrace, valley, Downs; Downs, Larchhill, Millrace; the moor\'s stile to the Terrace', () => {
  const FIGHT = ['first_fight_done'], BELL = ['first_fight_done', 'archive_f1_done'];
  const cache = new Map();
  const reachOf = (id, [x, y], flags) => {
    const k = `${id}|${x},${y}|${flags.join(',')}`;
    if (!cache.has(k)) cache.set(k, new Set(walk(MAPS_ON[id], db, { start: [x, y], flags, lantern: true }).reachable));
    return cache.get(k);
  };
  /** Take the transfer from `from` (standing in `reach`) to `to`; returns the arrival [x, y] after checking it. */
  const hop = (from, reach, to, flags, label) => {
    const m = MAPS_ON[from], f = withFlags(m, flags);
    const cands = [
      ...f.events.filter((e) => (e.type === 'door' || e.type === 'pit') && e.to && e.to[0] === to).map((e) => ({ cells: cellsOfEvent(e), t: e.to })),
      ...(m.exits || []).filter((x) => x.to[0] === to).map((x) => ({ cells: eventCells({ ...x, type: 'exit' }).map(([cx, cy]) => key(cx, cy)), t: x.to })),
    ];
    const c = cands.find((x) => x.cells.some((k) => reach.has(k)));
    assert.ok(c, `${label}: ${from} -> ${to} is walkable (flags ${flags.join(',') || 'none'})`);
    return c.t;
  };
  const go = (path, flags, label) => {
    let [id, x, y] = path[0];
    let reach = reachOf(id, [x, y], flags);
    for (let i = 1; i < path.length; i++) {
      const to = path[i];
      const t = hop(id, reach, to, flags, label);
      id = t[0];
      assert.ok(MAPS_ON[id], `${label}: ${id}`);
      reach = reachOf(id, [t[1], t[2]], flags);
      assert.ok(reach.has(key(t[1], t[2])), `${label}: arrival ${id} ${t[1]},${t[2]}`);
    }
    return [id, reach];
  };
  // 1. out the Orchard Lane gate, home from the valley by the town's south gate road: willowmere -> downs -> valley -> willowmere
  go([['willowmere', 20, 24], 'x1_downs', 'valley', 'willowmere'], FIGHT, 'loop 1');
  // 2. Downs, Drovers' Road, Millrace, the valley's south track, and back out of the valley's west lane to the Downs
  go([['x1_downs', 54, 25], 'x1_millrace', 'valley', 'x1_downs'], BELL, 'loop 2');
  // 3. Downs, Larchhill Road, Larchhill, Millrace (and home by the Millrace's drovers gate)
  go([['x1_downs', 54, 25], 'x1_larchhill', 'x1_millrace', 'x1_downs'], BELL, 'loop 3');
  // 4. the moor's stile to the Terrace (Dash through the roots), the Terrace's one-way drop to the valley
  const [, reach4] = go([['x1_downs', 54, 25], 'x1_highmoor', 'x1_terrace'], FIGHT, 'loop 4');
  assert.ok(reach4.has('6,19') && reach4.has('32,10'), 'the Terrace is walkable from the stile to the Orrery court');
  go([['x1_terrace', 1, 13], 'valley'], FIGHT, 'the Terrace drop');
  // 5. the cleft: valley -> Terrace over the bridge (Lantern) and the stair foot back
  go([['valley', 36, 9], 'x1_terrace', 'valley'], [...FIGHT], 'the stair');
  // before first_fight_done neither gate lets the party out
  for (const [from, to, start] of [['willowmere', 'x1_downs', [20, 24]], ['valley', 'x1_downs', [1, 33]]]) {
    const f = withFlags(MAPS_ON[from], []);
    assert.ok(!f.events.some((e) => e.type === 'door' && e.to[0] === to), `${from}: no door to ${to} before first_fight_done (starting ${start})`);
    assert.ok(!(MAPS_ON[from].exits || []).some((x) => x.to[0] === to), `${from}: and no always-open exit`);
  }
});

// ================================================================================================ the listing, and late registration
test('X1_MAPS_LISTED is true: the eight x1 zones are listed in ZONES, and each has its map module', async () => {
  const enc = await import(pathToFileURL(path.join(NEXT, 'src/data/x1/encounters.js')).href);
  assert.equal(enc.X1_MAPS_LISTED, true);
  const { ZONES } = await import(pathToFileURL(path.join(NEXT, 'src/data/encounters.js')).href);
  const x1 = ['x1_downs', 'x1_barrow', 'x1_highmoor', 'x1_terrace', 'x1_cellar', 'x1_millrace', 'x1_culvert', 'x1_larchhill'];
  for (const id of x1) { assert.ok(Object.keys(ZONES).includes(id), `${id} listed`); assert.ok(listMapIds().includes(id), `${id} has a map`); }
});

test('after the x1 pack registers late, the next load of each edited map shows the additions (src/world/maps.js re-import)', async () => {
  const keep = process.env.LQ_X1_ON;
  process.env.LQ_X1_ON = 'real:all';        // every map module imported from here on gets the stub live.js: switch on, the real packReady
  try {
    const { loadMap, peekMap, staleMaps } = await import(pathToFileURL(path.join(NEXT, 'src/world/maps.js')).href);
    const packs = await import(pathToFileURL(path.join(NEXT, 'src/game/packs.js')).href);
    packs.resetPacks();
    const importer = async () => ({ register: async () => ({ id: 'stub', loaded: [], skipped: [] }) });
    const on = { enabled: true, importer, quiet: true, warm: false, packFiles: null, retryMs: 100000 };
    packs.setPackDefaults({ ...on, enabled: false });                       // the pack is switched off: the maps load as they were
    const before = {};
    for (const id of HUB_MAPS) { before[id] = await loadMap(id); assert.equal(J(before[id]), baseText[id], `${id} before the pack is ready`); }
    assert.deepEqual(staleMaps(), []);
    packs.setPackDefaults(on);
    const r = await packs.ensurePack('x1');                                  // the pack registers late
    assert.equal(r.ok, true);
    assert.equal(packs.packReady('x1'), true);
    assert.deepEqual(staleMaps().sort(), [...HUB_MAPS].sort(), 'every cached touched map is stale');
    for (const id of HUB_MAPS) assert.equal(peekMap(id), before[id], `${id}: the module being played is not pulled away`);
    for (const id of HUB_MAPS) {
      const next = await loadMap(id);
      assert.notEqual(next, before[id], `${id}: re-imported on its next load`);
      const added = delta(BASE[id], next);
      assert.ok(added.size > 0, `${id}: the additions are there`);
      assert.deepEqual(next.events.map((e) => e.id).sort(), ON[id].events.map((e) => e.id).sort(), `${id}: the same events as the all-on variant`);
    }
    assert.deepEqual(staleMaps(), []);
    packs.resetPacks();
  } finally {
    if (keep == null) delete process.env.LQ_X1_ON; else process.env.LQ_X1_ON = keep;
  }
});
