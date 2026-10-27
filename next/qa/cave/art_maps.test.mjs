// C2-sprites-boss: the two hand-made cave maps pass the checks the hand maps pass (tools/maps/mapcheck.mjs validate: ids,
// legend, tiles and objects, standing events on walkable ground, door targets on walkable cells, the walk), B100's arrival
// is the generator's B100_ARRIVAL and B99's stairs land on it, the entrance hall's stair up lands in the library and its
// stair down on B1's arrival once the integrator patches the seed in. The seams the integrator owns are shimmed exactly as
// the run time will see them (comments say which): the cave_props objects, the cave_enemies_field sprites, the chest tiers
// red / blue (mapped to wood / gold for the validator, as qa/cave/gen_helpers.mjs does), the scene id of the fight and the
// flag the fight sets.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDb, loadMap, validate, buildGrid } from '../../tools/maps/mapcheck.mjs';
import { generateFloor, arrivalOf, B100_ARRIVAL } from '../../src/data/cave/gen.js';
import register from '../../src/data/cave/index.js';
import { BINDER_QUILL_ID } from '../../src/data/cave/items.js';
import { BINDER_ENCOUNTER_ID } from '../../src/data/cave/foes.js';
import b100, { ARRIVAL, BINDER_SCENE, BINDER_SPRITE } from '../../src/data/cave/maps/cave_b100.js';
import hall, { HALL_ARRIVAL, LIBRARY_TRAPDOOR, STAIRS_DOWN_ID, STAIRS_DOWN_PLACEHOLDER } from '../../src/data/cave/maps/cave_landing0.js';
import { asHandMap } from './gen_helpers.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));

await register();
const db = await loadDb();
// the pack atlases, merged the way the loader (and the integrator, for props) will see them
const caveProps = read('assets/sprites/cave_props.json');
for (const [k, v] of Object.entries(caveProps.objects)) if (!db.props.objects[k]) db.props.objects[k] = v;
const caveField = read('assets/sprites/cave_enemies_field.json');
for (const [k, v] of Object.entries(caveField.sprites)) if (!db.enemiesField.sprites[k]) db.enemiesField.sprites[k] = v;
// seams other agents fill: the fight's scene (C2-story-ui) and the flag it sets (declared by whoever owns the cave flags)
const SEAMS = [];
if (!db.scenes[BINDER_SCENE]) { db.scenes[BINDER_SCENE] = true; SEAMS.push(`scene ${BINDER_SCENE}`); }
if (!db.FLAGS.deep_stacks_cleared) { db.FLAGS.deep_stacks_cleared = true; SEAMS.push('flag deep_stacks_cleared'); }

/** The validator knows the hand maps' chest tiers; the cave's red / blue map to wood / gold (gen_helpers.asHandMap). */
const shaped = (mod) => asHandMap(mod, db);
const library = await loadMap('library');

test('B100: validates like a hand map, everything reachable, no way down, the arrival is the generator\'s B100_ARRIVAL', () => {
  const m = shaped(b100);
  const r = validate(m, db, { cave_b100: m }, {});
  assert.deepEqual(r.errors, [], `errors: ${r.errors.join('; ')}`);
  for (const w of r.warnings) assert.match(w, /^no banner for cave_b100 in text\.js$/, `unexpected warning: ${w}`);
  assert.ok(r.walk && !r.walk.error);
  assert.deepEqual(r.walk.unreached, [], `unreached: ${r.walk.unreached.join(' ')}`);
  for (const mk of r.walk.marks) assert.ok(mk.reached, `mark ${mk.name} at ${mk.x},${mk.y} not reached`);
  assert.deepEqual(ARRIVAL, B100_ARRIVAL);
  assert.deepEqual([b100.start.x, b100.start.y, b100.start.dir], [12, 18, 'down']);
  assert.deepEqual(b100.marks.arrival, B100_ARRIVAL);
  assert.equal(b100.events.filter((e) => e.type === 'door').length, 0, 'no stair down, no door out');
  assert.equal(b100.id, 'cave_b100'); assert.equal(b100.floor, 100); assert.equal(b100.band, 'forge');
  for (const k of ['binder', 'quill_chest', 'dais', 'party_stop', 'hall_entry', 'passage']) assert.ok(b100.marks[k], `mark ${k}`);
});

test('B100: the Binder stands at the binder mark until the flag, the trigger runs its scene, the Quill chest appears after it', () => {
  const a = b100.events.find((e) => e.id === BINDER_ENCOUNTER_ID);
  assert.ok(a && a.type === 'actor', 'the boss actor carries the encounter id (mapcheck\'s boss rule)');
  assert.equal(a.sprite, BINDER_SPRITE); assert.equal(a.ifNot, 'deep_stacks_cleared');
  assert.deepEqual([a.x, a.y], b100.marks.binder);
  assert.ok(caveField.sprites[BINDER_SPRITE] && caveField.frames[`${BINDER_SPRITE}_0`], 'the avatar is in cave_enemies_field');
  const t = b100.events.find((e) => e.id === 'binder_trig');
  assert.equal(t.script, BINDER_SCENE); assert.equal(t.ifNot, 'deep_stacks_cleared');
  assert.ok(t.y > a.y && t.x <= b100.marks.party_stop[0] && t.x + t.w > b100.marks.party_stop[0], 'the step line crosses party_stop, south of the dais');
  const c = b100.events.find((e) => e.id === 'quill_chest');
  assert.equal(c.type, 'chest'); assert.equal(c.tier, 'blue'); assert.equal(c.item, BINDER_QUILL_ID); assert.equal(c.if, 'deep_stacks_cleared');
  assert.ok(db.ITEMS[BINDER_QUILL_ID], 'the Quill is registered');
  // the chest's mark is the cell the party opens it from (the generator's convention), one step south of the chest
  assert.deepEqual(b100.marks.quill_chest, [c.x, c.y + 1]);
  // the hall's slag channels light it and never touch the walk
  const g = buildGrid(shaped(b100), db);
  assert.equal(g.code[18][12], 'none');
  assert.equal(g.code[6][4], 'water', 'slag is blocked (collision water)');
});

test('B99 -> B100: the generator\'s stairs land on B100\'s arrival for many seeds, and the cell is walkable', () => {
  const g = buildGrid(shaped(b100), db);
  for (const seed of [1, 2, 3, 7, 11, 42, 1234, 99999]) {
    const st = generateFloor(seed, 99).events.find((e) => e.id === 'stairs_down');
    assert.deepEqual(st.to, ['cave_b100', ...B100_ARRIVAL, 'down'], `seed ${seed}`);
    assert.equal(g.code[st.to[2]][st.to[1]], 'none');
  }
});

test('the entrance hall: validates like a hand map with the stair down patched to B1\'s arrival, the stair up lands in the library', () => {
  const seed = 7;
  const b1 = generateFloor(seed, 1);
  const patched = { ...hall, events: hall.events.map((e) => (e.id === STAIRS_DOWN_ID ? { ...e, to: ['cave_b1', ...arrivalOf(seed, 1), 'down'] } : e)) };
  const maps = { cave_landing0: patched, library, cave_b1: shaped(b1) };
  const r = validate(patched, db, maps, {});
  assert.deepEqual(r.errors, [], `errors: ${r.errors.join('; ')}`);
  for (const w of r.warnings) assert.match(w, /^no banner for cave_landing0 in text\.js$/, `unexpected warning: ${w}`);
  assert.deepEqual(r.walk.unreached, [], `unreached: ${r.walk.unreached.join(' ')}`);
  for (const mk of r.walk.marks) assert.ok(mk.reached, `mark ${mk.name} not reached`);
  // the raw module carries the placeholder (fail loud if the integrator forgets): the validator rejects it
  const raw = validate(hall, db, { cave_landing0: hall, library, cave_b1: shaped(b1) }, {});
  assert.ok(raw.errors.some((e) => /stairs_down/.test(e)), 'the unpatched stair down is an error, never a silent wrong cell');
  assert.deepEqual(STAIRS_DOWN_PLACEHOLDER.slice(0, 1), ['cave_b1']);
  const up = hall.events.find((e) => e.id === 'stairs_up');
  assert.deepEqual(up.to, ['library', ...LIBRARY_TRAPDOOR, 'down']); assert.equal(up.kind, 'stairs');
  const lg = buildGrid(library, db);
  assert.equal(lg.code[LIBRARY_TRAPDOOR[1]][LIBRARY_TRAPDOOR[0]], 'none', 'the suggested trapdoor cell is free floor in the library');
  assert.deepEqual([hall.start.x, hall.start.y], HALL_ARRIVAL);
  assert.deepEqual(hall.marks.arrival, HALL_ARRIVAL);
  for (const k of ['plaque', 'archivist', 'party_stop', 'stairs_down', 'stairs_up', 'record']) assert.ok(hall.marks[k], `mark ${k}`);
  // the plaque: the glyph sits in the face above its mark; the stairs objects sit in the face above their marks
  assert.ok(hall.overlays.some((o) => o.t === 'wall_glyph_revealed' && o.x === hall.marks.plaque[0] && o.y === hall.marks.plaque[1] - 2));
  assert.ok(hall.decor.some((d) => d.t === 'stairs_up' && d.x === hall.marks.stairs_up[0] && d.y === hall.marks.stairs_up[1] - 1));
  assert.ok(hall.decor.some((d) => d.t === 'stairs_down' && d.x === hall.marks.stairs_down[0] && d.y === hall.marks.stairs_down[1] - 1));
  assert.equal(hall.id, 'cave_landing0');
});

test('the seams shimmed here are the documented ones only', () => {
  for (const s of SEAMS) assert.match(s, /^(scene cave_binder|flag deep_stacks_cleared)$/);
});
