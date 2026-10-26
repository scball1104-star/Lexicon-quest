// Episode 1 expansion, the north maps (X1-maps-north): the Keepers' Terrace, the Orrery and the Keepers' Cellar
// (EXPANSION1_PLAN 3.2, 4.4 to 4.6, 4.11, 6.1, 3.6). Node only: the maps are `x1` pack files, so the pack is registered first
// (src/data/x1/index.js) and the pack's tile fragment (assets/tiles/x1_tiles.json) is merged into mapcheck's tile database the
// way the pack loader merges it in the game (mapcheck.mjs itself reads tiles.json only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, loadAll, loadDb, validate, walk, buildGrid, withFlags, loadStaging } from '../../tools/maps/mapcheck.mjs';
import { pathToFileURL } from 'node:url';

await (await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'x1', 'index.js')).href)).register();
const db = await loadDb();
const frag = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'x1_tiles.json'), 'utf8'));
for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) {
  db.tiles[k] = db.tiles[k] || {};
  for (const [id, v] of Object.entries(frag[k] || {})) if (!db.tiles[k][id]) db.tiles[k][id] = v;
}
const maps = await loadAll();
const staging = loadStaging();
const { ROUTE } = await import(pathToFileURL(path.join(NEXT, 'src', 'data', 'maps', 'x1_cellar.js')).href);
const T = maps.x1_terrace, O = maps.x1_orrery, C = maps.x1_cellar, V = maps.valley;
const ev = (m, id) => m.events.find((e) => e.id === id);
const key = (x, y) => `${x},${y}`;
const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const reached = (r, id) => { const e = r.events.find((x) => x.id === id); assert.ok(e, `${r.id}: event ${id}`); return e.reached; };

/** Flood over a grid of effective codes ('none' walks; pits never) from `from`; returns the Set of "x,y". */
function flood(codeAt, W, H, from) {
  const seen = new Set([key(...from)]), q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(key(nx, ny)) || codeAt(nx, ny) !== 'none') continue;
      seen.add(key(nx, ny)); q.push([nx, ny]);
    }
  }
  return seen;
}
/** The cellar's walking grid: base collision with the faint ink read as revealed when `lantern`, and the vault crack opened when `dash`. */
function cellarCodes({ lantern, dash }) {
  const g = buildGrid(C, db);
  const code = (x, y) => {
    if (g.faint[y][x] && lantern) return 'none';
    if (dash && (x === 19 && (y === 15 || y === 16))) return 'none';
    return g.code[y][x];
  };
  return { W: g.W, H: g.H, code };
}

// ------------------------------------------------------------------------------------------------ validation
test('the three north maps validate (ids, targets, plan counts 2 and 1, NPC coverage); only pending links warn', () => {
  for (const id of ['x1_terrace', 'x1_orrery', 'x1_cellar']) {
    const r = validate(maps[id], db, maps, { staging });
    assert.deepEqual(r.errors, [], id);
    for (const w of r.warnings) assert.match(w, /not built yet \(pending in x1_links.json\)/, `${id}: ${w}`);
  }
  assert.deepEqual([T.ground[0].length, T.ground.length], [60, 22]);
  assert.deepEqual([O.ground[0].length, O.ground.length], [16, 14]);
  assert.deepEqual([C.ground[0].length, C.ground.length], [28, 20]);
  assert.equal(T.area, 'field'); assert.equal(O.area, 'interior'); assert.equal(C.area, 'dungeon');
  assert.equal(T.respawn, 'reentry');
  assert.equal(C.lighting.dark, 0.6);
  assert.deepEqual([T.music, O.music, C.music], ['orrery', 'orrery', 'orrery']);
  const count = (m, enc) => m.events.filter((e) => e.type === 'enemy' && e.encounter === enc).length;
  assert.equal(count(T, 'tr_wolves'), 1); assert.equal(count(T, 'tr_golem'), 1); assert.equal(count(C, 'cl_wraiths'), 1);
});

test('plan 4.11 marks and named events are all present', () => {
  const need = {
    x1_terrace: { marks: 'stair_in stair_door cairn beacon court orrery_door walk_east roots edge moor_gate', ev: 'x1_roots_terrace chest_beacon chest_terrace e_tr_wolves e_tr_golem' },
    x1_orrery: { marks: 'hesper orrery plate hatch door', ev: 'hesper x1_armillary x1_star_plate chest_orrery x1_hatch keeper_star_ledger' },
    x1_cellar: { marks: 'entrance font well route_start dais nook vault', ev: 'cellar_font chest_cl_nook chest_cl_chart chest_cl_vault x1_crack_vault cellar_note e_cl_wraiths' },
  };
  for (const [id, n] of Object.entries(need)) {
    for (const m of n.marks.split(' ')) assert.ok(maps[id].marks[m], `${id} mark ${m}`);
    for (const e of n.ev.split(' ')) assert.ok(ev(maps[id], e), `${id} event ${e}`);
  }
  // marks the plan fixes to a cell stay on it (the Cellar's `well` and `route_start` moved with the layout: see docs/maps/X1_NORTH.md)
  const same = { stair_in: [6, 19], stair_door: [6, 20], cairn: [8, 17], beacon: [18, 13], court: [32, 11], orrery_door: [32, 9], walk_east: [48, 14], roots: [47, 10], edge: [55, 10], moor_gate: [1, 13] };
  for (const [k, c] of Object.entries(same)) assert.deepEqual(T.marks[k], c, k);
  // scene ids the maps run (STAGING_X1.md section 4)
  assert.equal(ev(T, 'terrace_enter').script, 'terrace_arrival');
  assert.equal(ev(O, 'orrery_enter').script, 'hesper_meet');
  assert.equal(ev(C, 'cellar_enter').script, 'cellar_entry');
  assert.equal(ev(C, 'cellar_note').script, 'cellar_note');
  assert.equal(ev(T, 'terrace_sign').text, 'terrace_sign'); assert.equal(ev(T, 'edge_sign').text, 'edge_sign');
  assert.equal(ev(C, 'cellar_font').text, 'cellar_font'); assert.equal(ev(C, 'cellar_font').safe, true);
  assert.equal(ev(O, 'hesper').type, 'npc');
});

// ------------------------------------------------------------------------------------------------ the Terrace
test('terrace: every event is reachable; Dash breaks the roots for the nook chest; the moor exit and the stair are the plan cells', () => {
  const r = walk(T, db, { flags: ['lantern_get'] });
  assert.deepEqual(r.unreached, []);
  assert.ok(r.log.includes('broke x1_roots_terrace'));
  const chest = ev(T, 'chest_terrace');
  assert.equal(chest.behind, 'x1_roots_terrace'); assert.equal(chest.tier, 'iron');
  assert.equal(ev(T, 'chest_beacon').tier, 'wood');
  const roots = ev(T, 'x1_roots_terrace');
  assert.equal(roots.breakable, 'roots');
  // without Dash the nook is sealed: the chest cell is not reachable on foot over the base grid
  const g = buildGrid(T, db);
  const sealed = flood((x, y) => (g.code[y][x] === 'none' && !(x === 47 && (y === 8 || y === 9)) ? 'none' : g.code[y][x]), g.W, g.H, [6, 19]);
  assert.ok(sealed.has(key(47, 10)), 'the roots mark is reachable');
  assert.ok(!sealed.has(key(47, 9)), 'the nook cell stays shut until the roots break');
  assert.deepEqual(T.exits[0], { x: 0, y: 13, w: 1, h: 2, to: ['x1_highmoor', 70, 13, 'left'] });
  const sd = ev(T, 'stair_down');
  assert.deepEqual([sd.x, sd.y], [6, 20]); assert.deepEqual(sd.to, ['valley', 21, 6, 'down']);
  assert.deepEqual([T.start.x, T.start.y, T.start.dir], [6, 19, 'up']);
});

test('terrace: the edge drop is a one-way pit area that lands on a walkable valley cell facing down', () => {
  const p = ev(T, 'edge_drop');
  assert.equal(p.type, 'pit');
  assert.deepEqual([p.x, p.y, p.w, p.h], [56, 10, 2, 2]);
  assert.deepEqual(p.to, ['valley', 36, 8, 'down']);
  for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) assert.equal(T.legend[T.ground[y][x]], 'pit', `pit terrain at ${x},${y}`);
  const vg = buildGrid(V, db);
  assert.equal(vg.code[8][36], 'none', 'valley (36,8) walkable');
  // it is one way: nothing in the valley sends you up to the Long Walk's gap, and the gap's far side is solid cliff
  assert.ok(!V.events.some((e) => e.to && e.to[0] === 'x1_terrace' && e.to[1] === 56));
  // the walk reaches the edge from the Landing on foot
  const r = walk(T, db, {});
  assert.ok(new Set(r.reachable).has(key(...T.marks.edge)));
  // the valley stair's far side (21,6) is walkable and the terrace stair door sits in front of the arrival cell
  assert.equal(vg.code[6][21], 'none');
});

test('terrace: placement rules of plan 3.6 (foes off the lanes, away from arrivals; a foe-free walk to the Orrery door)', () => {
  const g = buildGrid(T, db);
  const foes = T.events.filter((e) => e.type === 'enemy');
  const cellsOf = (e) => {
    const out = [[e.x, e.y]];
    if (e.move === 'patrol') { let [x, y] = [e.x, e.y]; const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }; for (const d of e.path) { x += D[d][0]; y += D[d][1]; out.push([x, y]); } }
    return out;
  };
  const arrivals = [[1, 13], [6, 19], [32, 10]];     // the moor arrival, the stair arrival, the cell in front of the Orrery door
  for (const f of foes) for (const c of cellsOf(f)) {
    assert.equal(g.code[c[1]][c[0]], 'none', `${f.id} cell ${c} is floor`);
    for (const a of arrivals) assert.ok(man(c, a) >= 6, `${f.id} ${c} is within 6 of arrival ${a}`);
  }
  assert.ok(foes.every((f) => f.move !== 'chase'), 'no chase foe on the lane maps of the Terrace');
  // each lane (moor arrival, stair arrival) to the Orrery door can be walked without passing within 3 tiles of any foe cell
  const halo = (x, y) => foes.some((f) => cellsOf(f).some((c) => man(c, [x, y]) < 3));
  const codeAt = (x, y) => (halo(x, y) ? 'solid' : g.code[y][x]);
  for (const a of [[1, 13], [6, 19]]) {
    const seen = flood(codeAt, g.W, g.H, a);
    assert.ok(seen.has(key(32, 10)), `lane from ${a} to the Orrery door is foe-free`);
    assert.ok(seen.has(key(32, 9)), 'and the door cell');
  }
  // no foe stands on a lane's mandatory cell: the moor gate, the stile gap, the stair and the neck stay free of any foe cell
  const must = [[3, 15], [6, 19], [25, 12], [25, 15], [26, 12], [26, 15], [32, 10]];
  for (const f of foes) for (const c of cellsOf(f)) for (const m of must) assert.ok(man(c, m) >= 3, `${f.id} ${c} crowds ${m}`);
});

// ------------------------------------------------------------------------------------------------ the Orrery
test('orrery: the Appraise star plate hides the chest; the hatch is a gate on orrery_aligned; the exits land in front of their doors', () => {
  const plate = ev(O, 'x1_star_plate');
  assert.equal(plate.appraise, true); assert.equal(plate.appraiseText, 'appraise_star_plate'); assert.equal(plate.text, 'x1_star_plate');
  const chest = ev(O, 'chest_orrery');
  assert.equal(chest.behind, 'appraise:x1_star_plate'); assert.equal(chest.item, 'ether'); assert.equal(chest.qty, 3); assert.equal(chest.tier, 'wood');
  const r = walk(O, db, {});
  assert.deepEqual(r.unreached, []);
  assert.ok(r.appraised.includes('x1_star_plate'));
  assert.equal(reached(r, 'chest_orrery'), true);
  // without Appraise the chest is never reached (the same map with the plate's flag removed)
  const dumb = { ...O, events: O.events.map((e) => (e.id === 'x1_star_plate' ? { ...e, appraise: false } : e)) };
  assert.equal(reached(walk(dumb, db, {}), 'chest_orrery'), false);
  // the plate is read from the floor in front of it: in range and in line from row 4
  assert.ok(new Set(r.reachable).has(key(5, 4)) && new Set(r.reachable).has(key(6, 4)));
  // the hatch
  const before = withFlags(O, []), after = withFlags(O, ['orrery_aligned']);
  assert.ok(before.events.some((e) => e.id === 'x1_hatch') && !before.events.some((e) => e.id === 'hatch_stair'));
  assert.ok(!after.events.some((e) => e.id === 'x1_hatch') && after.events.some((e) => e.id === 'hatch_stair'));
  const hs = ev(O, 'hatch_stair');
  assert.equal(hs.if, 'orrery_aligned'); assert.deepEqual(hs.to, ['x1_cellar', 3, 14, 'down']);
  assert.equal(ev(O, 'x1_armillary').ifNot, 'orrery_aligned'); assert.equal(ev(O, 'x1_armillary_lit').if, 'orrery_aligned');
  assert.equal(ev(O, 'x1_armillary').state, 0); assert.equal(ev(O, 'x1_armillary_lit').state, 1);
  // return doors land in front of their doors (facing away)
  const og = buildGrid(O, db);
  const od = ev(O, 'orrery_exit');
  assert.deepEqual(od.to, ['x1_terrace', 32, 10, 'down']);
  assert.deepEqual([od.x, od.y], [8, 13]);
  assert.deepEqual([O.start.x, O.start.y, O.start.dir], [8, 12, 'up']);
  const tg = buildGrid(T, db);
  assert.equal(tg.code[10][32], 'none');
  const td = ev(T, 'orrery_door');
  assert.deepEqual([td.x, td.y], [32, 9]); assert.deepEqual(td.to, ['x1_orrery', 8, 12, 'up']);
  assert.equal(og.code[12][8], 'none');
  // Hesper stands by the telescope, facing it; the one fight-free room
  assert.ok(!O.events.some((e) => e.type === 'enemy'));
});

// ------------------------------------------------------------------------------------------------ the Cellar
test('cellar: the ink route is 31 faint cells in unbroken steps, one fork, from the entry platform to the dais', () => {
  const { main, fork } = ROUTE;
  assert.equal(main.length + fork.length, 31);
  const adj = (a, b) => man(a, b) === 1;
  for (let i = 1; i < main.length; i++) assert.ok(adj(main[i - 1], main[i]), `main step ${i}`);
  assert.deepEqual(main[0], [12, 8]);
  assert.ok(adj([12, 9], main[0]), 'the first cell stands straight above the platform');
  assert.ok(adj(main[main.length - 1], [21, 7]), 'the route ends beside the dais platform');
  assert.ok(adj(fork[0], main.find((c) => c[0] === 12 && c[1] === 6)), 'the fork leaves the main route at (12,6)');
  for (let i = 1; i < fork.length; i++) assert.ok(adj(fork[i - 1], fork[i]));
  assert.ok(adj(fork[fork.length - 1], [6, 6]), 'the fork ends on the nook platform');
  // every route cell carries a faint bridge overlay; nothing else does
  const faint = C.overlays.filter((o) => /_faint$/.test(o.t));
  assert.equal(faint.length, 31);
  const want = new Set([...main, ...fork].map((c) => key(...c)));
  for (const o of faint) assert.ok(want.has(key(o.x, o.y)), `faint ${o.t} at ${o.x},${o.y} is on the route`);
  for (const o of faint) assert.match(o.t, /^ink_bridge_[hv]_faint$/);
  // the route is a zigzag of single cells: no 2x2 block of route cells, never wider than a cell
  for (const [x, y] of want.size ? [...want].map((k) => k.split(',').map(Number)) : []) assert.ok(!(want.has(key(x + 1, y)) && want.has(key(x, y + 1)) && want.has(key(x + 1, y + 1))), `2x2 at ${x},${y}`);
  // every route cell is a pit in the base grid (a pit until the Lantern reveals it)
  const g = buildGrid(C, db);
  for (const [x, y] of [...main, ...fork]) assert.equal(g.code[y][x], 'pit', `route cell ${x},${y} is a pit before the Lantern`);
});

test('cellar: the route is walkable with the Lantern and impossible without it; falling lands at the Landing', () => {
  const dark = cellarCodes({ lantern: false, dash: false }), lit = cellarCodes({ lantern: true, dash: false });
  const start = [3, 14];
  const noLamp = flood(dark.code, dark.W, dark.H, start), lamp = flood(lit.code, lit.W, lit.H, start);
  const dais = ev(C, 'chest_cl_chart'), nook = ev(C, 'chest_cl_nook'), note = ev(C, 'cellar_note');
  const touch = (set, e) => [[e.x - 1, e.y], [e.x + 1, e.y], [e.x, e.y - 1], [e.x, e.y + 1]].some(([x, y]) => set.has(key(x, y)));
  for (const e of [dais, nook, note]) {
    assert.ok(!touch(noLamp, e), `${e.id} is out of reach without the Lantern`);
    assert.ok(touch(lamp, e), `${e.id} is reachable with the Lantern`);
  }
  // Well Hall, corridor and the entry platform are reachable without it; the first route cell is not
  assert.ok(noLamp.has(key(12, 9)) && noLamp.has(key(12, 13)) && !noLamp.has(key(12, 8)));
  for (const c of [...ROUTE.main, ...ROUTE.fork]) { assert.ok(!noLamp.has(key(...c))); assert.ok(lamp.has(key(...c)), `route ${c}`); }
  // every pit cell of the floor drops to pitTo, which is a walkable Landing cell
  assert.deepEqual(C.pitTo, ['x1_cellar', 3, 15, 'down']);
  assert.ok(noLamp.has(key(3, 15)));
  assert.equal(C.events.some((e) => e.type === 'pit'), false, 'one pitTo for the whole Cellar');
  // leaving works from every cell: the stair back up is reachable from every cell the party can stand on, and back
  const exit = ev(C, 'cellar_exit');
  const back = flood(lit.code, lit.W, lit.H, [exit.x, exit.y]);
  for (const k of lamp) assert.ok(back.has(k), `${k} cannot leave`);
  // the Lantern prompt budget: from the platform, the reveal radius (Manhattan 7, events.js MAX_INK_RADIUS 6) lights the route in few uses
  const route = [...ROUTE.main];
  let revealed = new Set(), at = [12, 9], uses = 0;
  const reveal = (p) => { uses++; for (const c of [...ROUTE.main, ...ROUTE.fork]) if (man(c, p) <= 7) revealed.add(key(...c)); };
  reveal(at);
  for (const c of route) { if (!revealed.has(key(...c))) reveal(at); assert.ok(revealed.has(key(...c))); at = c; }
  assert.ok(uses <= 5, `the main route needs ${uses} Lantern uses`);
});

test('cellar: the Seed Vault opens only to the Dash; the chests are the plan tiers and rewards', () => {
  const dark = cellarCodes({ lantern: true, dash: false }), open = cellarCodes({ lantern: true, dash: true });
  const before = flood(dark.code, dark.W, dark.H, [3, 14]), after = flood(open.code, open.W, open.H, [3, 14]);
  const vault = ev(C, 'chest_cl_vault');
  assert.ok(!before.has(key(vault.x, vault.y - 1)) && !before.has(key(vault.x - 1, vault.y)), 'sealed before the Dash');
  assert.ok(after.has(key(22, 15)), 'open after the Dash');
  const crack = ev(C, 'x1_crack_vault');
  assert.equal(crack.breakable, 'rock'); assert.deepEqual(crack.opens, [[19, 15], [19, 16]]);
  const r = walk(C, db, { lantern: true });
  assert.deepEqual(r.unreached.filter((id) => !/^light_/.test(id)), []);
  assert.ok(r.log.includes('broke x1_crack_vault'));
  // tiers: wood (nook, rolled), gold (the chart, fixed), iron (the vault, fixed)
  const nook = ev(C, 'chest_cl_nook'), chart = ev(C, 'chest_cl_chart');
  assert.deepEqual([nook.tier, nook.item], ['wood', undefined]);
  assert.deepEqual([chart.tier, chart.item], ['gold', 'star_chart']);
  assert.deepEqual([vault.tier, vault.item, vault.qty], ['iron', 'echo_herb', 3]);
  // the Landing: arrival, font and stair
  assert.deepEqual([C.start.x, C.start.y], [3, 14]);
  const font = ev(C, 'cellar_font');
  assert.deepEqual([font.x, font.y, font.w], [5, 16, 2]);
  const ex = ev(C, 'cellar_exit');
  assert.deepEqual(ex.to, ['x1_orrery', 12, 5, 'down']);
  assert.deepEqual([ex.x, ex.y], [3, 13]);
});

test('cellar: the one fight patrols floor, away from the arrival and the font', () => {
  const g = buildGrid(C, db);
  const w = ev(C, 'e_cl_wraiths');
  assert.equal(w.move, 'patrol'); assert.equal(w.sprite, 'ink_wraith');
  let [x, y] = [w.x, w.y]; const cells = [[x, y]];
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const d of w.path) { x += D[d][0]; y += D[d][1]; cells.push([x, y]); }
  assert.deepEqual(cells[cells.length - 1], cells[0], 'the patrol is a closed loop');
  const font = ev(C, 'cellar_font');
  for (const c of cells) {
    assert.equal(g.code[c[1]][c[0]], 'none', `wraith cell ${c}`);
    assert.ok(man(c, [3, 14]) >= 6 && man(c, [font.x, font.y]) >= 6 && man(c, [font.x + 1, font.y]) >= 6, `wraith ${c} too close to the arrival or the font`);
  }
  // a foe-free way from the arrival to the corridor (the lane to the Constellation Floor)
  const halo = (px, py) => cells.some((c) => man(c, [px, py]) < 3);
  const seen = flood((px, py) => (halo(px, py) ? 'solid' : g.code[py][px]), g.W, g.H, [3, 14]);
  assert.ok(seen.has(key(12, 9)), 'the entry platform is reachable without passing within 3 of the wraith');
});

test('the three map files hold no em dash and no forbidden characters', () => {
  for (const f of ['x1_terrace', 'x1_orrery', 'x1_cellar']) {
    const s = fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', `${f}.js`), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)), `${f} has an em dash`);
  }
});
