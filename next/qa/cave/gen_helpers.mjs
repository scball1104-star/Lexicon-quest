// Shared helpers for the Deep Stacks generator tests (qa/cave/gen_*.test.mjs). Not a test file.
import { generateFloor } from '../../src/data/cave/gen.js';

/** The floors the brief names, plus a few in between. */
export const FLOORS = [1, 9, 10, 19, 20, 35, 99];

/** 200 deterministic seeds (spread over the uint32 range, with a few small ones the previews use). */
export const SEEDS = [1, 2, 3, 7, 11, 42, 1234, 99999, ...Array.from({ length: 192 }, (_, i) => (i * 2654435761 + 12345) >>> 0)];

/**
 * mapcheck.mjs knows the hand maps' chest tiers (wood, iron, gold) and the hand maps' encounters. A cave floor carries
 * `tier: 'red' | 'blue'` and encounter ids the integrator registers at run time, so for the shared validator the
 * tiers are mapped to wood / gold and the stub encounters are registered as zones of the floor (C2-world does the
 * same at run time: ENCOUNTERS[id] = { zone: mapId, leader: sprite, ... }).
 */
export function asHandMap(mod, db) {
  const encId = (e) => `${e.encounter}__${mod.id}`;
  for (const e of mod.events) if (e.type === 'enemy') db.ENCOUNTERS[encId(e)] = { id: encId(e), zone: mod.id, leader: e.sprite, enemies: [e.sprite], boss: false };
  return { ...mod, events: mod.events.map((e) => (e.type === 'chest' ? { ...e, tier: e.tier === 'blue' ? 'gold' : 'wood' } : e.type === 'enemy' ? { ...e, encounter: encId(e) } : e)) };
}

/** Generate a floor and the one below it (the stairs target), both shaped for mapcheck. */
export function pairFor(seed, floor, db) {
  const a = generateFloor(seed, floor);
  const b = floor < 99 ? generateFloor(seed, floor + 1) : null;
  const maps = { [a.id]: asHandMap(a, db) };
  if (b) maps[b.id] = asHandMap(b, db);
  // B100 is a hand-made map (C2-sprites-boss); until it exists a stub keeps the B99 stairs target checkable
  if (!b) maps.cave_b100 = { id: 'cave_b100', legend: { '.': 'stacks_wood' }, ground: Array.from({ length: 30 }, () => '.'.repeat(40)), overlays: [], decor: [], events: [], marks: {}, start: { x: 1, y: 1 } };
  return { a, b, maps };
}
