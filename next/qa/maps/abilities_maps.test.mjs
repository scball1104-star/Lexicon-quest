// W9-abilities placements: each field ability opens something optional on a map the party already walks.
//   valley       the cracked plateau face (Dash Strike) hides a grotto chest, west of the first-fight cut
//   archive_f1   a heavy block (Bram's Shove) stands before a niche with a chest in the pot storeroom C
//   archive_f3   a thin root wall (Dash Strike) in the great door hall opens a shortcut up into the western stacks
// None of them is on the critical path: every story route still walks with them left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll, loadDb, buildGrid, walk } from '../../tools/maps/mapcheck.mjs';

const db = await loadDb();
const maps = await loadAll();
const byId = (m, id) => m.events.find((e) => e.id === id);
const without = (m, pred) => ({ ...m, events: m.events.filter((e) => !pred(e)) });

test('valley: the cracked face is a breakable rock in the plateau cliff, with the grotto chest hidden behind it', () => {
  const v = maps.valley;
  const crack = byId(v, 'crack_plateau');
  assert.equal(crack.type, 'object');
  assert.equal(crack.breakable, 'rock');
  assert.equal(crack.h, 2);
  assert.ok(db.lines[crack.text], 'it has inspect text');
  assert.equal(v.ground[crack.y][crack.x], '|', 'set into the cliff face');
  assert.equal(v.ground[crack.y + 1][crack.x], '|');
  const below = buildGrid({ ...v, events: [] }, db).code[crack.y + 2][crack.x];
  assert.equal(below, 'none', 'the party can stand in front of it');
  const chest = byId(v, 'chest_grotto');
  assert.equal(chest.behind, 'crack_plateau');
  assert.deepEqual([chest.x, chest.y], [crack.x, crack.y + 1], 'the chest sits in the grotto mouth');
  assert.ok(db.ITEMS[chest.item]);
  const cut = byId(v, 'first_fight_trig');
  assert.ok(crack.x < cut.x, 'west of the first-fight cut: the dash can be tried before the first battle');
  assert.ok(results().valley.events.find((e) => e.id === 'chest_grotto').reached);
});

test('archive_f1: the heavy block in C stands before a niche in the north face, the chest right behind it', () => {
  const f1 = maps.archive_f1;
  const h = byId(f1, 'heavy_c');
  assert.equal(h.type, 'block');
  assert.equal(h.heavy, true);
  const chest = byId(f1, 'chest_niche');
  assert.deepEqual([chest.x, chest.y], [h.x, h.y - 1], 'the chest is directly behind (north of) the block');
  assert.ok(f1.overlays.some((o) => o.t === 'wall_broken' && o.x === chest.x && o.y === chest.y - 1), 'drawn as a niche in the face');
  // room C: the floor 3..12 x 10..15, and the block has open floor on both sides so a shove clears the niche
  assert.ok(h.x >= 3 && h.x <= 12 && h.y === 10);
  const g = buildGrid({ ...f1, events: [] }, db);
  assert.equal(g.code[h.y][h.x - 1], 'none'); assert.equal(g.code[h.y][h.x + 1], 'none');
  const c = f1.events.filter((e) => e.type === 'block' && !e.heavy).map((e) => e.id);
  assert.deepEqual(c, ['block_c', 'block_h1', 'block_h2'], 'the light push blocks are unchanged');
  // the light block's route to its plate stays clear of the heavy one: (8,13) west to (4,13), north to (4,11)
  for (const [x, y] of [[7, 13], [6, 13], [5, 13], [4, 13], [4, 12], [4, 11]]) assert.ok(!(x === h.x && y === h.y));
  assert.ok(results().archive_f1.events.find((e) => e.id === 'chest_niche').reached);
});

test('archive_f3: the thin root wall sits in the great door hall\'s north face and opens a passage into the stacks', () => {
  const f3 = maps.archive_f3;
  const roots = byId(f3, 'roots_gd');
  assert.equal(roots.type, 'object');
  assert.equal(roots.breakable, 'roots');
  assert.ok(db.lines[roots.text]);
  const [ox, oy] = roots.opens[0];
  assert.deepEqual([ox, oy], [roots.x, roots.y - 1], 'it opens the wall band right above it');
  assert.equal(f3.ground[oy][ox], '#', 'sealed wall until it breaks (one way: opened from the hall)');
  assert.equal(f3.ground[roots.y][roots.x], '|'); assert.equal(f3.ground[roots.y + 1][roots.x], '|');
  const g = buildGrid({ ...f3, events: [] }, db);
  assert.equal(g.code[oy - 1][ox], 'none', 'the stacks floor above the passage is open');
  assert.equal(g.code[roots.y + 2][roots.x], 'none', 'the hall floor below it is open');
  // the two ends: the western stacks (rows 11..18) and the great door hall (rows 22..27)
  assert.ok(oy - 1 === 18 && roots.y + 2 === 22);
  assert.ok(results().archive_f3.events.find((e) => e.id === 'roots_gd').reached, 'the root wall is reached the normal way');
});

test('none of the ability targets is on the critical path', () => {
  const f1 = walk(without(maps.archive_f1, (e) => e.id === 'heavy_c' || e.id === 'chest_niche'), db);
  for (const id of ['chest_d', 'keydoor_i', 'stairs_f2', 'gate_c', 'gate_h']) assert.ok(f1.events.find((e) => e.id === id).reached || f1.opened.includes(id), `F1 ${id}`);
  const f3 = walk(without(maps.archive_f3, (e) => e.id === 'roots_gd'), db);
  for (const id of ['chest_key', 'boss_door', 'bell_trig', 'keeper_font']) assert.ok(f3.events.find((e) => e.id === id).reached, `F3 ${id}`);
  const v = walk(without(maps.valley, (e) => e.id === 'crack_plateau' || e.id === 'chest_grotto'), db);
  for (const id of ['archive_door_trig', 'first_fight_trig', 'campfire']) assert.ok(v.events.find((e) => e.id === id).reached, `valley ${id}`);
});

let _results = null;
function results() {
  if (!_results) _results = Object.fromEntries(['valley', 'archive_f1', 'archive_f3'].map((id) => [id, walk(maps[id], db)]));
  return _results;
}
