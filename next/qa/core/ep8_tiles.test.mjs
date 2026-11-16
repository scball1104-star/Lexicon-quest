// E8-tiles: the ep8 tile fragment (assets/tiles/ep8_tiles.json + ep8.png) merges into the live tile database with no clash
// against tiles.json and EVERY other *_tiles.json fragment (Episode 6 owns first_shelf: Episode 8's art is ep8_first_shelf);
// every id EPISODE8_PLAN 9.1 asks for exists with its collision code and frame count (the pop-up book frame rule E8-world
// draws by); the void is the lowest terrain and void, flat, and violet (never Episode 7's white); every rect sits inside the
// sheet; the backdrops carry their band and their key, the violet and gold grades (gold at least 0.10 over violet, a tone and
// never a screen) and the white-out cap (+0.15 luma); the phone pairs of plan 5.1 recorded by ep8_scenes.py meet their
// floors; and none of it reaches the main manifest once the ep8 pack is listed (E8-pack's PACKS entry).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeTileFragment, PACKS } from '../../src/game/packs.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const frag = read('assets/tiles/ep8_tiles.json');
const OTHERS = fs.readdirSync(path.join(NEXT, 'assets/tiles')).filter((f) => /_tiles\.json$/.test(f) && f !== 'ep8_tiles.json')
  .map((f) => `assets/tiles/${f}`);
const pngSize = (p) => { const b = fs.readFileSync(path.join(NEXT, p)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const luma = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };

test('the ep8 fragment loads and merges into tiles.json (+ every other fragment) with no clash; the void lowest', () => {
  const db = read('assets/tiles/tiles.json');
  for (const f of OTHERS) assert.deepEqual(mergeTileFragment(db, read(f)).clashes, [], f);
  const r = mergeTileFragment(db, frag);
  assert.deepEqual(r.clashes, []);
  assert.ok(r.added > 60, `added ${r.added}`);
  const o = db.terrainOrder;
  assert.ok(o.indexOf('void_violet') >= 0 && o.indexOf('void_violet') < o.indexOf('archive_floor'), 'void below every core terrain');
  for (const t of ['script_step', 'marble_page', 'letterpath', 'scriptmosaic', 'parchment', 'goldscript', 'vellum', 'blank_page']) {
    assert.ok(o.indexOf(t) > o.indexOf('void_violet') && o.indexOf(t) < o.indexOf('pit'), t);
  }
  assert.ok(o.indexOf('ink_canal') > o.indexOf('pit'), 'the canal last');
});

test('every ep8 id is unique against tiles.json and every other fragment (popup words and first_shelf avoided)', () => {
  const others = {};
  for (const f of ['assets/tiles/tiles.json', ...OTHERS]) {
    const d = read(f);
    for (const k of ['terrains', 'walls', 'tiles', 'objects', 'overlays']) for (const id of Object.keys(d[k] || {})) others[id] = `${f} ${k}`;
  }
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const id of Object.keys(frag[k])) assert.ok(!others[id], `${k}.${id} also in ${others[id]}`);
  for (const id of ['popup', 'popups', 'first_shelf', 'scriptorium']) assert.ok(!frag.objects[id] && !frag.tiles[id], id);
  assert.ok(frag.objects.ep8_first_shelf, 'the first shelf under its prefixed art id');
});

test('every object id resolves with its collision code and frames (the pop-up book rule E8-world draws by)', () => {
  const T = frag.terrains, Wl = frag.walls, Ti = frag.tiles, O = frag.objects;
  assert.equal(T.void_violet.collision, 'void');
  assert.equal(T.void_violet.autotile, 'A1');
  assert.equal(T.ink_canal.collision, 'water');
  for (const t of ['script_step', 'marble_page', 'letterpath', 'scriptmosaic', 'parchment', 'goldscript', 'vellum', 'blank_page']) {
    assert.equal(T[t].collision, 'none', t);
    assert.equal(T[t].autotile, 'A2', t);
  }
  for (const w of ['inkwall', 'drawer_wall', 'palimpsest_wall', 'shelf_shaft', 'book_tower']) {
    assert.equal(Wl[w].collision, 'solid', w);
    assert.equal(Wl[w + '_out'].collision, 'solid', w);
    assert.ok(Wl[w].faceStyles.length >= 2, w);
  }
  assert.ok(Wl.drawer_wall.faceStyleByMap.ep8_library_f1 && Wl.palimpsest_wall.faceStyleByMap.ep8_library_f2 && Wl.shelf_shaft.faceStyleByMap.ep8_library_f3);
  // the books: frame = ribbon * 4 + state, both orientations, both covers
  for (const [id, wh, fp] of [['popbook', [32, 32], [[0, 0], [1, 0]]], ['popbook_realm', [32, 32], [[0, 0], [1, 0]]],
    ['popbook_ew', [16, 48], [[0, 0], [0, -1]]], ['popbook_realm_ew', [16, 48], [[0, 0], [0, -1]]]]) {
    assert.deepEqual(O[id].rect.slice(2), wh, id);
    assert.equal(O[id].frames.length, 16, id);
    assert.deepEqual(O[id].footprint, fp, id);
    assert.deepEqual(O[id].states, ['shut', 'opening_a', 'opening_b', 'open'], id);
    assert.deepEqual(O[id].ribbons, ['gold', 'teal', 'blue', 'green'], id);
  }
  assert.equal(O.popbook.axis, 'ns');
  assert.equal(O.popbook_ew.axis, 'ew');
  assert.deepEqual(O.realm_model.realms, ['willowmere', 'hollow', 'emberpeak', 'valewyn', 'desert', 'isles', 'north']);
  assert.equal(O.realm_model.frames.length, 7);
  assert.equal(O.realm_model.collision, 'none');
  for (const id of ['page_bridge', 'page_wall', 'page_ghost']) {
    assert.equal(Ti[id].nineSlice, 16, id);
    assert.deepEqual([Ti[id].w, Ti[id].h], [48, 48], id);
  }
  assert.equal(Ti.page_bridge.collision, 'none');
  assert.equal(Ti.page_wall.collision, 'solid');
  assert.ok(Ti.page_ghost.recipe && Ti.page_ghost.recipe.color === '#f9d77a');
  const frames = { drawer_stack_dash: 2, ink_door: 2, ep8_first_shelf: 2, great_lexicon: 7, star_dome: 6, concordance: 4,
    library_gate: 3, candle_post: 4 };
  for (const [id, n] of Object.entries(frames)) assert.equal(O[id].frames.length, n, id);
  for (const ch of 'abcdef') assert.equal(O['half_sign_' + ch].frames.length, 2, ch);
  for (const id of ['restoring_fountain', 'reading_desk', 'living_codex', 'pagefountain']) assert.ok(O[id].anim && O[id].anim.frameDx, id);
  assert.deepEqual(O.great_lexicon.rect.slice(2), [64, 48], 'the great book is 4 x 3');
  assert.deepEqual(O.great_lexicon.shutFrames, [0, 1, 2]);
  assert.deepEqual(O.great_lexicon.openFrames, [3, 4, 5]);
  assert.equal(O.great_lexicon.lastFrame, 6);
  assert.deepEqual(O.star_dome.eighthFrames, [3, 4, 5]);
  assert.equal(O.star_dome.collision, 'none');
  assert.deepEqual(O.ink_door.doorAt, [1, 0]);
  assert.deepEqual(O.library_gate.doorAt, [1, 0]);
  assert.deepEqual(O.lift_page.doorAt, [0, 0]);
  for (const id of ['tower_quiet_rooms', 'tower_bibliotheca', 'tower_atelier', 'tower_index', 'tower_house_a', 'tower_house_b']) {
    assert.equal(O[id].kind, 'building', id);
    assert.ok(Array.isArray(O[id].doorAt), id);
  }
  for (const id of ['bindery_stall', 'margin_arch', 'booktower', 'quill', 'goldscroll']) assert.ok(O[id], id);
  assert.ok(Ti.library_far && Ti.library_far.w === 176 && Ti.library_far.h === 128);
  assert.ok(Ti.library_cliff && Ti.library_cliff.w === 112);
  assert.ok(Object.keys(Ti).filter((k) => k.startsWith('marble_bridge_')).length >= 10, 'the canal bridges');
  assert.equal(frag.extraColors.length, 14);
});

test('the void is violet, flat, and never Episode 7\'s white; floors and pages sit where the phone rule needs them', () => {
  const ex = frag.extraColors;
  const v = ex[0];
  const n = parseInt(v.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255;
  assert.ok(B > R && R > G, `${v} is violet`);
  assert.ok(luma(v) < 0.2, 'dark');
  assert.ok(luma('#f5ecd4') - luma(v) >= 0.35, 'page cream over the void');
  const ep7 = read('assets/tiles/ep7_tiles.json');
  assert.ok(!ep7.extraColors.includes(v), 'not an Episode 7 colour');
});

test('every rect is inside ep8.png and every entry names it', () => {
  const { w, h } = pngSize('assets/tiles/ep8.png');
  const inside = (x, y, rw, rh, id) => assert.ok(x >= 0 && y >= 0 && x + rw <= w && y + rh <= h, `${id} ${x},${y} ${rw}x${rh}`);
  for (const k of ['terrains', 'walls', 'tiles', 'objects']) for (const v of Object.values(frag[k])) assert.equal(v.sheet, 'ep8.png');
  for (const [id, m] of Object.entries(frag.terrains)) {
    inside(m.x, m.y, 32 * (m.anim ? Math.max(...m.anim.frames) + 1 : 1), 48, id);
    for (const [vx, vy] of m.variants) inside(vx, vy, 16, 16, id);
  }
  for (const [id, m] of Object.entries(frag.walls)) {
    inside(m.top[0], m.top[1], 32, 48, id);
    inside(m.face[0], m.face[1], 32, 32, id);
    for (const st of m.faceStyles || []) for (const [bx, by] of st) inside(bx, by, 32, 32, id);
  }
  for (const [id, m] of Object.entries(frag.tiles)) inside(m.x, m.y, m.w || 16, m.h || 16, id);
  for (const [id, m] of Object.entries(frag.objects)) {
    for (const r of m.frames || [m.rect]) inside(...r, id);
    if (m.anim) inside(m.rect[0] + Math.max(...m.anim.frames) * m.anim.frameDx, m.rect[1], m.rect[2], m.rect[3], id);
  }
});

test('the phone contrast pairs recorded by ep8_scenes.py meet their floors (plan 5.1)', () => {
  const p = path.join(NEXT, 'tools/art/tiles/out/ep8/contrast_check.json');
  if (!fs.existsSync(p)) return;            // out/ is git-ignored: checked where the build ran
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const P = c.pairs;
  const kinds = ['page_vs_void', 'void_vs_', 'ghost_vs_void', 'ghost_vs_floor', 'wall_vs_floor'];
  for (const k of kinds) assert.ok(Object.keys(P).some((x) => x.startsWith(k)), `${k} measured`);
  for (const [k, v] of Object.entries(P)) assert.ok(v.pass, `${k}: ${v.difference}`);
  for (const [k, v] of Object.entries(P)) {
    if (k.startsWith('page_vs_void')) assert.ok(v.difference >= 0.35, k);
    if (k.startsWith('void_vs_')) assert.ok(v.difference >= 0.12, k);
    if (k.startsWith('ghost_') || k.startsWith('wall_')) assert.ok(v.difference >= 0.15, k);
  }
  assert.ok(c.f3.difference >= 0.12 && c.f3.mean_f3 > c.f3.mean_f1, 'F3: the floor under the page white, brighter than F1');
  assert.ok(c.last_word.difference >= 0.10, 'the gold grade over the violet one');
});

const STAGES = ['ep8_battle_stair', 'ep8_battle_library', 'ep8_battle_palimpsest', 'ep8_battle_unwritten', 'ep8_battle_lastword'];

test('the stages carry band and key; the Last Word\'s grades and the white-out cap', () => {
  for (const b of STAGES) {
    const m = read(`assets/backdrops/${b}.json`);
    assert.equal(m.image, b + '.png');
    assert.equal(m.backdropId, b, b);
    assert.ok(m.bandY > 0 && m.bandAlpha > 0, b);
    const { w, h } = pngSize(`assets/backdrops/${b}.png`);
    assert.deepEqual([w, h], [384, 216], b);
  }
  const enc = path.join(NEXT, 'src/data/ep8/encounters.js');
  if (fs.existsSync(enc)) {            // E8-battle's file (wave 8a): each stage it names exists
    const src = fs.readFileSync(enc, 'utf8');
    for (const [, id] of src.matchAll(/'(ep8_battle_\w+)'/g)) assert.ok(STAGES.includes(id), `${id} is a built stage`);
  }
  const g = read('assets/backdrops/ep8_battle_lastword.json').grades;
  assert.ok(g && g.gold && g.gold.tone, 'the gold grade');
  assert.ok(!g.gold.screen && !g.gold.multiply, 'a tone, never a screen');
  for (const k of ['lift', 'chroma', 'cast', 'hue']) assert.equal(typeof g.gold.tone[k], 'number', k);
  assert.ok(g.meanLuma.gold - g.meanLuma.violet >= 0.10, `gold ${g.meanLuma.gold} at least 0.10 over violet ${g.meanLuma.violet}`);
  const wo = read('assets/backdrops/ep8_battle_lastword.json').whiteout;
  assert.ok(wo && wo.measured.maxRiseLuma <= 0.15 && wo.frames <= 30 && wo.capLuma === 0.15, 'the white-out under its cap');
  assert.equal(read('assets/backdrops/ep8_dialog_keyart.json').image, 'ep8_dialog_keyart.png');
});

test('ep8 art belongs to the ep8 pack, never the main manifest (once E8-pack lists the pack)', async () => {
  const main = JSON.stringify(read('assets/manifest.json'));
  const files = ['assets/tiles/ep8.png', 'assets/tiles/ep8_tiles.json', ...STAGES.map((b) => `assets/backdrops/${b}.png`),
    'assets/backdrops/ep8_dialog_keyart.png'];
  for (const f of files) assert.ok(!main.includes(path.basename(f)), `${f} kept out of the main manifest`);
  if (!PACKS.ep8) return;               // wave 8a's E8-pack adds the entry; until then the ownership check waits
  const { packOfFile } = await import('./sync-manifest.mjs');
  for (const f of files) assert.equal(packOfFile(f), 'ep8', f);
});
