// The world map, wave 2 (issue #97, docs/WORLD_MAP_PLAN.md): what a save knows is read from the flags saves already have
// (no save change), the lazy `worldmap` pack (nothing new at startup but the menu row and the pack row), the painting and its
// generated layout agree with the data, every field map has a place for the party marker, and the map stones never block a
// way anyone needs. Pure node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (rel) => import(pathToFileURL(path.join(NEXT, rel)).href);
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');

const D = await imp('src/data/worldmap/data.js');
const L = await imp('src/data/worldmap/layout.js');
const S = await imp('src/game/state.js');
const { EP3_DONE_FLAGS } = await imp('src/data/ep4/start.js');
const { EP4_DONE_FLAGS } = await imp('src/data/ep5/start.js');
const { EP5_DONE_FLAGS } = await imp('src/data/ep6/start.js');
const { EP6_FLAGS } = await imp('src/data/ep6/flags.js');
const EP6_DONE = Object.keys(EP6_FLAGS).slice(0, Object.keys(EP6_FLAGS).indexOf('ep6_complete') + 1);

const flagsOf = (...lists) => Object.fromEntries(lists.flat().map((f) => [f, true]));
// A save at the end of each episode: every earlier episode's done flags, standing where that episode's credits leave it.
const END = {
  1: { map: 'hero_home', flags: flagsOf(S.EP1_DONE_FLAGS) },
  2: { map: 'nh_inn', flags: flagsOf(S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS) },
  3: { map: 'pk_inn', flags: flagsOf(S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS) },
  4: { map: 'ep4_vw_inn', flags: flagsOf(S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS, EP4_DONE_FLAGS) },
  5: { map: 'ep5_sh_inn', flags: flagsOf(S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS, EP4_DONE_FLAGS, EP5_DONE_FLAGS) },
  6: { map: 'ep6_zl_inn', flags: flagsOf(S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS, EP4_DONE_FLAGS, EP5_DONE_FLAGS, EP6_DONE) },
};
// What each of those saves shows, region by region (V valley, W Wider Valley, H Hollow, E ash hills, F Flood Country,
// S south, I Isles, N North): v visited (colour), h heard of (ink), u unknown (paper).
const WANT = {
  0: 'V:v W:u H:u E:u F:u S:u I:u N:u',
  1: 'V:v W:h H:h E:u F:u S:u I:u N:u',
  2: 'V:v W:h H:v E:h F:u S:u I:u N:u',
  3: 'V:v W:h H:v E:v F:h S:u I:u N:u',
  4: 'V:v W:h H:v E:v F:v S:h I:u N:u',
  5: 'V:v W:h H:v E:v F:v S:v I:h N:u',
  6: 'V:v W:h H:v E:v F:v S:v I:v N:h',
};
const short = { visited: 'v', heard: 'h', unknown: 'u' };
const regionLine = (st) => Object.keys(D.REGIONS).map((k) => `${k}:${short[st.regions[k]]}`).join(' ');

test('a fresh game: only the valley, no map yet, Willowmere listed', () => {
  const g = S.createGame('Arden');
  const st = D.mapState(g);
  assert.equal(st.unlocked, false, 'the map opens with Episode 1 done');
  assert.equal(regionLine(st), WANT[0]);
  assert.deepEqual(st.towns, ['willowmere']);
  assert.equal(st.here, 'willowmere');
});

test('a save at the end of each episode shows the right map, and the map only ever grows', () => {
  let prev = D.mapState(S.createGame('Arden'));
  for (const ep of [1, 2, 3, 4, 5, 6]) {
    const st = D.mapState({ flags: END[ep].flags, map: END[ep].map });
    assert.equal(st.unlocked, true, `episode ${ep}: unlocked`);
    assert.equal(regionLine(st), WANT[ep], `episode ${ep}`);
    for (const k of Object.keys(D.REGIONS)) assert.ok(D.atLeast(st.regions[k], prev.regions[k]), `episode ${ep}: region ${k} never forgets`);
    for (const p of D.PLACES) assert.ok(D.atLeast(st.places[p.id], prev.places[p.id]), `episode ${ep}: ${p.id} never forgets`);
    assert.ok(st.here, `episode ${ep}: the party is on the map (${END[ep].map})`);
    assert.equal(st.places[st.here] || 'visited', 'visited');
    prev = st;
  }
  const six = D.mapState({ flags: END[6].flags, map: END[6].map });
  assert.deepEqual(six.towns, ['willowmere', 'hollowmere', 'emberpeak', 'valewyn', 'saffron', 'zephyr'], 'every town of Episodes 1 to 6 is listed (the Wider Valley only once walked)');
  assert.equal(six.places.north, 'heard', 'the Sky Compass names the North');
  assert.equal(six.kestrel, true);
  assert.equal(D.placeName(D.PLACE.hollowmere, END[1].flags), 'Nameless Hollow');
  assert.equal(D.placeName(D.PLACE.hollowmere, END[2].flags), 'Hollowmere');
});

test('quick starts and real old saves read the same way (no save change, nothing written)', async () => {
  const quick = { 2: S.newGameEp2, 3: S.newGameEp3 };
  try { quick[4] = (await imp('src/data/ep4/start.js')).newGameEp4; quick[5] = (await imp('src/data/ep5/start.js')).newGameEp5; quick[6] = (await imp('src/data/ep6/start.js')).newGameEp6; } catch (e) { /* a quick start that needs its pack */ }
  let ran = 0;
  for (const [ep, make] of Object.entries(quick)) {
    let g = null;
    try { g = make('Arden', { slot: 1 }); } catch (e) { continue; }
    ran++;
    const before = JSON.stringify(g);
    const st = D.mapState(g);
    assert.equal(JSON.stringify(g), before, `episode ${ep} quick start: mapState writes nothing`);
    assert.equal(regionLine(st), WANT[ep - 1], `episode ${ep} quick start shows the map of the episode before`);
    assert.ok(st.here, `episode ${ep} quick start: the party is on the map (${g.map})`);
  }
  assert.ok(ran >= 2, `quick starts checked: ${ran}`);
  const dir = path.join(NEXT, 'qa', 'saves', 'fixtures');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const env = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const data = env.data || env;
    const st = D.mapState(data);
    assert.equal(st.regions.V, 'visited', f);
    if (data.flags && data.flags.ep1_complete) assert.equal(st.unlocked, true, `${f}: unlocked`);
    if (data.flags && data.flags.nh_arrived) assert.equal(st.regions.H, 'visited', `${f}: the Hollow`);
  }
  // the save module never learned a new key
  assert.ok(!read('src/core/save.js').includes('worldmap'), 'save.js is untouched by the map');
});

test('the painting and the data agree: every region has cells, every place sits in its own region', () => {
  const letters = new Set(L.REGIONS.join(''));
  assert.equal(L.REGIONS.length, L.SIZE.rows);
  for (const row of L.REGIONS) assert.equal(row.length, L.SIZE.cols);
  for (const k of letters) assert.ok(D.REGIONS[k], `region letter ${k} has an entry`);
  for (const k of Object.keys(D.REGIONS)) assert.ok(letters.has(k), `region ${k} has cells in the painting`);
  for (const p of D.PLACES) {
    assert.ok(L.POINTS[p.id], `${p.id} has a point`);
    assert.equal(D.regionAt(...L.POINTS[p.id]), p.region, `${p.id} sits in region ${p.region}`);
    assert.ok(Array.isArray(p.label) && p.label.length === 2, `${p.id} label offset`);
  }
  for (const [, id] of D.MAP_AT) assert.ok(L.POINTS[id], `map point ${id} exists`);
  const png = fs.readFileSync(path.join(NEXT, 'assets', 'ui', 'worldmap_map.png'));
  assert.equal(png.readUInt32BE(16), L.SIZE.w, 'painting width');
  assert.equal(png.readUInt32BE(20), L.SIZE.strip + 16, 'painting height: three layers and the sprite strip');
});

test('every field map has a point for the party marker', async () => {
  const mc = await imp('tools/maps/mapcheck.mjs');
  const missing = mc.listMapIds().filter((id) => !id.startsWith('_') && !D.pointOfMap(id));
  assert.deepEqual(missing, []);
  assert.equal(D.pointOfMap('cave_f12'), 'willowmere', 'the Deep Stacks are under the library');
  assert.equal(D.pointOfMap('_testtown'), null);
});

test('the copy fits: list rows, the info box, the labels (real font), no em dash', () => {
  const font = JSON.parse(read('assets/ui/font.json'));
  const adv = (c) => (c === ' ' ? font.spaceAdvance : font.glyphs[c] ? font.glyphs[c][6] : 6);
  const width = (s) => [...s].reduce((a, c, i) => a + adv(c) + ((font.kerning || {})[(s[i - 1] || '') + c] || 0), 0);
  const ROW = 96 - 12 - 10 - 2;          // scene.js LIST.w - padding - textX
  const INFO_W = 276 - 16;
  for (const p of D.PLACES) {
    const names = [p.name, ...(p.names || []).map(([, n]) => n)];
    for (const n of names) {
      if (p.town) assert.ok(width(n) <= ROW, `${n}: ${width(n)} px fits the towns list (${ROW})`);
      for (const st of [D.TEXT.here, D.TEXT.visited, D.TEXT.heard, D.TEXT.walk]) assert.ok(width(n) + width(st) + 8 <= INFO_W, `${n} + "${st}" fit the info line`);
      assert.ok(width(`? ${n}`) <= 110, `${n}: the label plate stays small`);
    }
    assert.ok(width(p.about) <= INFO_W && p.about.length <= 46, `${p.id} about fits: ${width(p.about)} px`);
  }
  const all = JSON.stringify([D.PLACES, D.REGIONS, D.TEXT]) + read('src/data/worldmap/scene.js') + read('src/data/worldmap/index.js') + read('src/data/worldmap/field.js');
  assert.ok(!all.includes('—'), 'no em dash');
});

test('the worldmap pack: lazy, declared once, wanted with Episode 1 done, nothing of it at startup', async () => {
  const { PACKS, packWanted } = await imp('src/game/packs.js');
  const d = PACKS.worldmap;
  assert.ok(d, 'declared');
  assert.equal(d.entry, '../data/worldmap/index.js');
  assert.deepEqual(d.touches, [], 'patches no map module (the stones join at run time)');
  assert.ok(!d.hard, 'never holds the field');
  assert.equal(packWanted('worldmap', {}), false);
  assert.equal(packWanted('worldmap', { ep1_complete: true }), true);
  assert.equal(packWanted('worldmap', END[1].flags), D.mapUnlocked(END[1].flags), 'the menu row and the pack agree');
  // startup: no pack file precached or preloaded; the shell only names the pack in packs.js (the row) and menu.js (the Map row)
  const sw = read('sw.js'), html = read('index.html');
  for (const f of JSON.parse(read('assets/pack_files.json')).worldmap) {
    assert.ok(!sw.includes(`'${f}'`) && !sw.includes(`"${f}"`), `not precached: ${f}`);
    assert.ok(!html.includes(f), `not preloaded: ${f}`);
  }
  const shell = [];
  // the lazy packs' own folders are not startup files (the ep4 errands name the map in comments, wave 5)
  const lazy = new Set(Object.values(PACKS).map((p) => path.posix.join('src/game', path.posix.dirname(p.entry))));
  const walk = (dir) => { for (const e of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) { if (!lazy.has(rel)) walk(rel); } else if (rel.endsWith('.js') && read(rel).includes('worldmap')) shell.push(rel);
  } };
  walk('src');
  assert.deepEqual(shell.sort(), ['src/game/packs.js', 'src/scenes/menu.js'], 'the only startup files that know the map');
  assert.ok(!/import[^;]*data\/worldmap/.test(read('src/scenes/menu.js')), 'the menu never imports the pack');
  const gz = (s) => zlib.gzipSync(Buffer.from(s), { level: 6 }).length;
  const row = read('src/game/packs.js').split('\n').find((l) => l.includes('worldmap:'));
  assert.ok(gz(row) < 200, `the pack row is small (${gz(row)} B gzipped)`);
});

test('the pack loads lazily on request and registers without an engine (Node)', async () => {
  const P = await imp('src/game/packs.js');
  P.resetPacks();
  assert.equal(P.packReady('worldmap'), false);
  const r = await P.ensurePack('worldmap', { quiet: true, warm: false, packFiles: null });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(P.packReady('worldmap'), true);
  const idx = await imp('src/data/worldmap/index.js');
  assert.deepEqual(await idx.register(), { ok: true, skipped: [] });
  P.resetPacks();
});

test('the map stones: plain floor beside the way in, every map walks the same with them', async () => {
  const mc = await imp('tools/maps/mapcheck.mjs');
  const db = await mc.loadDb();
  const fl = END[6].flags;
  for (const [id, stones] of Object.entries(D.STONES)) {
    const m = await mc.loadMap(id);
    const flags = Object.keys(fl);
    const base = mc.walk(m, db, { flags });
    const reach = new Set(base.reachable);
    const marks = new Set(Object.values(m.marks || {}).map(([x, y]) => `${x},${y}`));
    const evCells = new Set((m.events || []).flatMap((e) => mc.eventCells(e).map(([x, y]) => `${x},${y}`)));
    for (const s of stones) {
      const k = `${s.x},${s.y}`;
      assert.ok(reach.has(k), `${id} ${s.id} (${k}) is reachable floor`);
      assert.ok(!marks.has(k), `${id} ${s.id} is not a staging mark`);
      assert.ok(!evCells.has(k), `${id} ${s.id} is not on an event`);
      assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${s.x + dx},${s.y + dy}`)), `${id} ${s.id} can be faced`);
    }
    const withStones = { ...m, events: [...(m.events || []), ...stones.map((s) => ({ id: s.id, type: 'object', x: s.x, y: s.y, sprite: 'worldmap_stone', text: 'x' }))] };
    const after = mc.walk(withStones, db, { flags });
    const lost = [...reach].filter((k) => !after.reachable.includes(k) && !stones.some((s) => `${s.x},${s.y}` === k));
    assert.deepEqual(lost, [], `${id}: no cell cut off by a stone`);
    assert.deepEqual(after.unreached.filter((e) => !stones.some((s) => s.id === e)), base.unreached, `${id}: every event still reached`);
  }
});
