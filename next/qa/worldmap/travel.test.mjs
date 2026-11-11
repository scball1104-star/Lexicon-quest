// World map travel, wave 3 (issue #103, docs/WORLD_MAP_PLAN.md 2.3 and 5.2): the destinations list for every save state, the
// refusals (rumours, a dungeon from the menu row, the Deep Stacks, a scene, aboard the ship, the offline rule), the routes and
// their modes, the arrival cells (open, walkable, beside the stone, facing away, the followers' trail clear), the packs a
// destination needs, the autosave slot rules, and nothing written but the party's place. Pure node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (rel) => import(pathToFileURL(path.join(NEXT, rel)).href);
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');

const D = await imp('src/data/worldmap/data.js');
const T = await imp('src/data/worldmap/travel.js');
const L = await imp('src/data/worldmap/layout.js');
const S = await imp('src/game/state.js');
const P = await imp('src/game/packs.js');
const { createSave } = await imp('src/core/save.js');
const { FieldScene } = await imp('src/scenes/field.js');
const { EP3_DONE_FLAGS } = await imp('src/data/ep4/start.js');
const { EP4_DONE_FLAGS } = await imp('src/data/ep5/start.js');
const { EP5_DONE_FLAGS } = await imp('src/data/ep6/start.js');
const { EP6_FLAGS } = await imp('src/data/ep6/flags.js');
const EP6_DONE = Object.keys(EP6_FLAGS).slice(0, Object.keys(EP6_FLAGS).indexOf('ep6_complete') + 1);

const flagsOf = (...lists) => Object.fromEntries(lists.flat().map((f) => [f, true]));
const DONE = [S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS, EP4_DONE_FLAGS, EP5_DONE_FLAGS, EP6_DONE];
/** A save at the end of episode n, standing where its credits leave it (or on `map`). */
const save = (n, map) => ({ flags: flagsOf(...DONE.slice(0, n)), map: map || ['hero_home', 'hero_home', 'nh_inn', 'pk_inn', 'ep4_vw_inn', 'ep5_sh_inn', 'ep6_zl_inn'][n] });
const town = { area: 'town' };
const rows = (g, ctx = town) => Object.fromEntries(T.destinations(g, { ...ctx, mapId: ctx.mapId || g.map }).map((d) => [d.id, d.why || 'ok']));

test('the destinations list for each save state: visited towns open, rumours shut, the town you stand in is "here"', () => {
  assert.deepEqual(rows(S.createGame('Arden')), { willowmere: 'locked' }, 'a fresh game: the map is not open yet');
  assert.deepEqual(rows(save(1)), { willowmere: 'ok', hollowmere: 'rumour' });
  assert.deepEqual(rows(save(2)), { willowmere: 'ok', hollowmere: 'ok', emberpeak: 'rumour' });
  assert.deepEqual(rows(save(3)), { willowmere: 'ok', hollowmere: 'ok', emberpeak: 'ok', valewyn: 'rumour' });
  assert.deepEqual(rows(save(4)), { willowmere: 'ok', hollowmere: 'ok', emberpeak: 'ok', valewyn: 'ok', saffron: 'rumour' });
  assert.deepEqual(rows(save(5)), { willowmere: 'ok', hollowmere: 'ok', emberpeak: 'ok', valewyn: 'ok', saffron: 'ok', zephyr: 'rumour' });
  assert.deepEqual(rows(save(6)), { willowmere: 'ok', hollowmere: 'ok', emberpeak: 'ok', valewyn: 'ok', saffron: 'ok', zephyr: 'ok' });
  assert.equal(rows(save(4, 'ep4_valewyn')).valewyn, 'here', 'standing in Valewyn itself');
  assert.equal(rows(save(4, 'ep4_vw_inn')).valewyn, 'ok', "from Valewyn's inn, its gate is a trip");
  const x1 = { flags: { ...save(1).flags, downs_arrived: true, thornfold_arrived: true }, map: 'willowmere' };
  assert.equal(rows(x1).thornfold, 'ok', 'the Wider Valley once walked: Thornfold');
  // never a dungeon floor, never a road: every row is a town with its own town map
  for (const n of [1, 2, 3, 4, 5, 6]) for (const d of T.destinations(save(n), town)) {
    assert.ok(D.PLACE[d.id].town, `${d.id} is a town`);
    if (d.ok) assert.equal(d.arrive.map, D.TOWN_MAP[d.id]);
  }
  // the quick starts read the same way as a played save of the episode before
  for (const [n, make] of [[2, S.newGameEp2], [3, S.newGameEp3]]) {
    const g = make('Arden', { slot: 1 });
    assert.ok(T.destinations(g, town).some((d) => d.id === 'willowmere' && d.ok), `episode ${n} quick start can go home`);
  }
});

test('refusals: a dungeon from the menu row, the Deep Stacks, a scene, a busy field, aboard the ship', () => {
  const g = save(4, 'ep4_keep_f2');
  const all = (ctx) => [...new Set(Object.values(rows(g, ctx)).filter((w) => w !== 'rumour'))];
  assert.deepEqual(all({ area: 'dungeon', from: 'menu' }), ['dungeon'], 'the menu row in a dungeon: view only');
  assert.deepEqual(all({ area: 'dungeon', from: 'debug' }), ['dungeon']);
  assert.deepEqual(all({ area: 'town', cave: true, from: 'menu' }), ['dungeon'], 'a Deep Stacks run');
  assert.deepEqual(all({ area: 'town', scene: true }), ['scene']);
  assert.deepEqual(all({ area: 'town', busy: true }), ['busy']);
  assert.deepEqual(all({ area: 'field', mapId: 'ep5_ship' }), ['aboard'], 'mid-crossing on the ship');
  assert.deepEqual(all({ area: 'field', from: 'menu' }), ['ok'], 'a road or the open field: travel');
  assert.deepEqual(all({ area: 'interior', from: 'menu' }), ['ok'], 'an inn or a shop: travel');
  for (const k of ['rumour', 'here', 'dungeon', 'aboard', 'scene', 'busy', 'locked']) assert.ok(D.TEXT.why[k], `a line for ${k}`);
  // every map stone stands in a town, so a stone's map is never a dungeon
  for (const id of Object.keys(D.STONES)) assert.notEqual(T.blockOf({ area: 'town', from: 'stone', mapId: id, flags: save(6).flags }), 'dungeon');
});

test('travelCtx reads the field under the map (and the menu), and a missing field is busy', () => {
  const field = { name: 'field', map: { mod: { area: 'dungeon' } }, mapId: 'court_f1', game: save(2), cutscene: { running: false } };
  const e = { stack: [field, { name: 'menu' }, { name: 'worldmap' }], game: field.game, cave: { inRun: () => false } };
  const ctx = T.travelCtx(e, 'menu');
  assert.equal(ctx.area, 'dungeon'); assert.equal(ctx.mapId, 'court_f1'); assert.equal(ctx.busy, false); assert.equal(ctx.scene, false);
  assert.equal(T.blockOf(ctx), 'dungeon');
  field.cutscene.running = true;
  assert.equal(T.blockOf(T.travelCtx(e, 'stone')), 'scene');
  assert.equal(T.blockOf(T.travelCtx({ stack: [], game: save(2) }, 'menu')), 'busy');
  assert.equal(T.fieldOf(e), field);
});

test('routes: road through the towns between, the sea lane by ship, the Kestrel straight once Episode 6 opened it; 2 to 3 s', () => {
  const r = T.routeOf('valewyn', 'willowmere', save(4).flags);
  assert.equal(r.mode, 'road');
  assert.deepEqual(r.legs.map((l) => l.mode), ['road']);
  assert.deepEqual(r.legs[0].pts, ['valewyn', 'flood_road', 'emberpeak', 'sand_road', 'hollowmere', 'east_road', 'valley', 'willowmere'].map((p) => L.POINTS[p]));
  const sea = T.routeOf('valewyn', 'saffron', save(5).flags);
  assert.deepEqual(sea.legs.map((l) => l.mode), ['sea', 'road'], 'Yara\'s ship, then the caravan road');
  assert.equal(T.arrivalOf('saffron', sea.mode).stone, 'wm_stone_gate', 'the last leg is the caravan road: the gate');
  assert.equal(T.arrivalOf('saffron', 'sea').stone, 'wm_stone_dock', 'a trip that ends at sea lands at the dock');
  const home = T.routeOf('saffron', 'willowmere', save(5).flags);
  assert.deepEqual(home.legs.map((l) => l.mode), ['road', 'sea', 'road']);
  const air = T.routeOf('willowmere', 'zephyr', save(6).flags);
  assert.equal(air.mode, 'air'); assert.equal(air.legs.length, 1, 'the Kestrel flies straight');
  assert.equal(T.arrivalOf('zephyr', 'air').stone, 'wm_stone_dock', 'the Kestrel docks in the sky');
  assert.equal(T.arrivalOf('saffron', 'air').stone, 'wm_stone_dock');
  assert.equal(T.arrivalOf('willowmere', 'road').stone, 'wm_stone_gate');
  assert.ok(T.kestrelOpen(save(6).flags) && !T.kestrelOpen(save(5).flags));
  // every pair of towns joins, and every trip takes 2 to 3 s (a cut under Reduce motion)
  const towns = Object.keys(D.TOWN_MAP);
  for (const flags of [save(5).flags, save(6).flags]) for (const a of towns) for (const b of towns) {
    if (a === b) continue;
    const rt = T.routeOf(a, b, flags);
    assert.ok(rt && rt.legs.length, `${a} to ${b}`);
    const n = T.routeFrames(rt, false);
    assert.ok(n >= 120 && n <= 180, `${a} to ${b}: ${n} frames`);
    assert.equal(T.routeFrames(rt, true), 0);
    const end = T.routeAt(rt, 1), start = T.routeAt(rt, 0);
    assert.deepEqual([end.x, end.y].map(Math.round), L.POINTS[b]); assert.deepEqual([start.x, start.y].map(Math.round), L.POINTS[a]);
  }
  // from a road point or a dungeon's point (the party's spot), too
  assert.equal(T.routeOf('keep', 'willowmere', save(4).flags).mode, 'road');
  for (const [p] of Object.entries(L.POINTS)) if (p !== 'north') assert.ok(T.routeOf(p, 'willowmere', save(4).flags), `${p} joins the roads`);
});

test('arrival cells: every town stone has one, on open walkable floor beside the stone, facing away, the trail behind clear', async () => {
  const mc = await imp('tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  const flags = Object.keys({ ...save(6).flags, downs_arrived: true, thornfold_arrived: true, first_fight_done: true });
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const p of D.PLACES.filter((pl) => pl.town)) assert.ok(D.TOWN_MAP[p.id] && D.STONES[D.TOWN_MAP[p.id]], `${p.id} has a town map with stones`);
  for (const [id, stones] of Object.entries(D.STONES)) {
    const m = await mc.loadMap(id);
    assert.notEqual(m.area, 'dungeon', `${id} is not a dungeon`);
    const reach = new Set(mc.walk(m, db, { flags }).reachable);
    const marks = new Set(Object.values(m.marks || {}).map(([x, y]) => `${x},${y}`));
    const ev = new Set((m.events || []).flatMap((e) => mc.eventCells(e).map(([x, y]) => `${x},${y}`)));
    const stoneAt = new Set(stones.map((s) => `${s.x},${s.y}`));
    const open = (x, y) => reach.has(`${x},${y}`) && !marks.has(`${x},${y}`) && !ev.has(`${x},${y}`) && !stoneAt.has(`${x},${y}`);
    for (const s of stones) {
      const [x, y, dir] = s.at;
      assert.ok(V[dir], `${id} ${s.id}: a direction`);
      assert.ok(open(x, y), `${id} ${s.id}: (${x}, ${y}) is open walkable floor`);
      assert.ok(Math.abs(x - s.x) + Math.abs(y - s.y) === 1, `${id} ${s.id}: next to the stone`);
      const [dx, dy] = V[dir];
      assert.ok(!(x + dx === s.x && y + dy === s.y), `${id} ${s.id}: never facing the stone`);
      assert.ok(open(x - dx, y - dy) && open(x - 2 * dx, y - 2 * dy), `${id} ${s.id}: two open cells behind for the followers`);
    }
  }
  // the arrival of every visited town, both ways in
  for (const t of Object.keys(D.TOWN_MAP)) for (const mode of ['road', 'sea', 'air']) {
    const a = T.arrivalOf(t, mode);
    assert.ok(a && a.map === D.TOWN_MAP[t], `${t} by ${mode}`);
  }
});

test('the packs a destination needs: the chain up to it, a prefixed map\'s own pack, Fine Print for a tier_1 save', () => {
  const f6 = save(6).flags;
  assert.deepEqual(T.packsFor('ep6_zephyr', f6), ['ep3', 'ep4', 'ep5', 'ep6']);
  assert.deepEqual(T.packsFor('ep4_valewyn', f6).filter((p) => p.startsWith('ep')), ['ep3', 'ep4', 'ep5']);
  assert.ok(T.packsFor('emberpeak', save(3).flags).includes('ep3'));
  assert.ok(T.packsFor('nameless_hollow', save(2).flags).includes('x2') || !P.packEnabled('x2'), 'the Mere Country when wanted');
  assert.ok(!T.packsFor('willowmere', f6).includes('tier'));
  assert.ok(T.packsFor('willowmere', { ...f6, tier_1: true }).includes('tier'), 'Fine Print: its shop rows come along');
  assert.ok(!T.packsFor('willowmere', f6).some((p) => P.PACKS[p].hard), 'Willowmere needs no hard pack');
});

test('the offline rule: a needed pack that cannot load refuses travel (never rejects), a slow one too, a ready one passes', async () => {
  P.resetPacks();
  const PACKS_URL = new URL('../../src/game/packs.js', import.meta.url);
  const blocked = (p) => (/\/ep4\//.test(p) ? Promise.reject(new TypeError('Failed to fetch dynamically imported module: ' + p)) : import(new URL(p, PACKS_URL).href));
  P.setPackDefaults({ importer: blocked, quiet: true, retryMs: 600000, warm: false, packFiles: null });
  try {
    const r = await T.readyPacks(['ep4']);
    assert.equal(r.ok, false); assert.equal(r.why, 'offline'); assert.deepEqual(r.failed, ['ep4']);
    P.setPackDefaults({ importer: () => new Promise(() => {}), quiet: true, retryMs: 600000, warm: false, packFiles: null });
    const slow = await T.readyPacks(['tier'], 50);
    assert.equal(slow.ok, false, 'a pack still loading at the guard counts as not ready'); assert.equal(slow.timeout, true);
  } finally { P.resetPacks(); }
  P.setPackDefaults({ quiet: true, warm: false, packFiles: null });
  try {
    assert.deepEqual(await T.readyPacks(['worldmap']), { ok: true, failed: [] });
    assert.deepEqual(await T.readyPacks([]), { ok: true, failed: [] });
  } finally { P.resetPacks(); }
});

test('arrive: one fade, the map screen and the menu closed, the field\'s own loadMap as a landmark, input given back', async () => {
  const calls = [];
  const field = { name: 'field', inputLocked: 0, pendingWarp: null, game: save(4, 'ep4_vw_inn'),
    loadMap: async (...a) => { calls.push(['load', ...a]); } };
  const stack = [field, { name: 'menu' }, { name: 'worldmap' }];
  const engine = { stack, get scene() { return stack[stack.length - 1]; }, pop() { calls.push(['pop', stack.pop().name]); },
    fadeTo: (fn, o) => { calls.push(['fade', o.style]); return Promise.resolve(fn()).then(() => true); } };
  const before = JSON.stringify(field.game.flags);
  const p = T.arrive(engine, field, { map: 'willowmere', x: 14, y: 27, dir: 'up' });
  assert.equal(field.inputLocked, 1, 'held for the fade'); assert.ok(field.pendingWarp);
  assert.equal(await T.arrive(engine, field, { map: 'emberpeak', x: 1, y: 1, dir: 'up' }), false, 'one trip at a time');
  await p;
  assert.deepEqual(calls, [['fade', 'fade'], ['pop', 'worldmap'], ['pop', 'menu'], ['load', 'willowmere', 14, 27, 'up', { landmark: true }]]);
  assert.equal(field.inputLocked, 0); assert.equal(field.pendingWarp, null);
  assert.equal(JSON.stringify(field.game.flags), before, 'no flag written');
  // the field's loadMap autosaves on every map change after the first, through FieldScene.autosave (the slot rules below)
  assert.match(read('src/scenes/field.js'), /if \(!o\.first\) this\.autosave\(\);/);
});

test('the autosave after arrival writes the run\'s own slot and never another run\'s', () => {
  const m = new Map();
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
  const sv = createSave({ storage, log: () => {} });
  const other = S.createGame('Other');
  sv.save(0, S.serialize(other), S.saveMeta(other));
  sv.save(1, S.serialize(other), S.saveMeta(other));
  const before0 = sv.exportSlot(0), before1 = sv.exportSlot(1);
  const g = S.createGame('Quill', { autosaveSlot: 2 });
  Object.assign(g.flags, save(4).flags);
  g.map = 'ep4_vw_inn';
  const flags = JSON.stringify(g.flags);
  const a = T.arrivalOf('willowmere', 'road');
  S.setPosition(g, a.map, a.x, a.y, a.dir);              // what loadMap does before it autosaves
  FieldScene.prototype.autosave.call({ engine: { save: sv }, game: g, warnOnce() {} });
  assert.equal(sv.exportSlot(0), before0, 'slot 0 (another run) untouched');
  assert.equal(sv.exportSlot(1), before1, 'slot 1 (another run) untouched');
  const back = sv.load(2);
  assert.equal(back.map, 'willowmere'); assert.deepEqual([back.pos.x, back.pos.y, back.pos.dir], [a.x, a.y, a.dir]);
  assert.equal(JSON.stringify(back.flags), flags, 'the save carries the same flags');
});

test('the copy fits the info box (real font), no em dash, travel lives only in the lazy pack', () => {
  const font = JSON.parse(read('assets/ui/font.json'));
  const adv = (c) => (c === ' ' ? font.spaceAdvance : font.glyphs[c] ? font.glyphs[c][6] : 6);
  const width = (s) => [...s].reduce((a, c, i) => a + adv(c) + ((font.kerning || {})[(s[i - 1] || '') + c] || 0), 0);
  const INFO_W = 276 - 16;
  for (const s of [D.TEXT.offline, D.TEXT.going, ...Object.values(D.TEXT.why)]) assert.ok(width(s) <= INFO_W, `"${s}": ${width(s)} px fits one line (${INFO_W})`);
  for (const p of D.PLACES) for (const st of [D.TEXT.travel, D.TEXT.road, D.TEXT.sea, D.TEXT.air]) assert.ok(width(p.name) + width(st) + 8 <= INFO_W, `${p.name} + ${st}`);
  const src = read('src/data/worldmap/travel.js') + JSON.stringify(D.TEXT) + read('src/data/worldmap/scene.js');
  assert.ok(!src.includes(String.fromCharCode(0x2014)), 'no em dash');
  for (const f of ['src/scenes/field.js', 'src/main.js', 'src/scenes/menu.js', 'src/game/packs.js']) assert.ok(!read(f).includes('travel.js'), `${f} never names travel`);
  assert.ok(JSON.parse(read('assets/pack_files.json')).worldmap.includes('src/data/worldmap/travel.js'), 'travel.js is a worldmap pack file (rebuild with build_pwa.py)');
});
