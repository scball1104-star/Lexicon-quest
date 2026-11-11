// Episode 4's edits to two Episode 3 maps (EPISODE4_PLAN 3), applied by the ep4 pack (src/data/ep4/maps.js) to the modules
// the ep3 pack registered. Pure: each takes the registered module and returns a new one; the input is never mutated. The
// hollow_gate.js pattern: every Episode 3 cell, event and mark stays where it was; the patch only adds.
//
// withEastRoad(emberpeak): the washed-out east road (water at x 38..39, rows 12..17) becomes the way down to the Flood Road.
//   - east_road_trig: the step trigger two tiles west of the drop (36, 14..15), scene east_road_gate, if ep4_started (the
//     scene itself also needs not east_road_open);
//   - while east_road_open: the cinder path runs out onto the brink (terrain patches at (38,14), (38,15), (39,15)), the
//     rope ladder hangs down the drop at (39,15) (object rope_ladder, read from the brink: ep4_rope_ladder), and the door
//     east_road_down on the ladder's foot cell (39,15) climbs down to ep4_flood_road (1,15) facing right;
//   - the sign east_road_sign (36,13) reads east_road_sign_ep4, whose last two states are Episode 3's east_road_sign
//     word for word (so nothing changes until ep4_started);
//   - ep4_wake_pk, the twin of the inn's wake trigger (plan 10.2): a save made in the street after the Episode 3 credits
//     starts ep4_morning on the next arrival (the scene's guards: ep3_complete, not ep4_morning_done, not tier_1, live).
//   With EP4_LIVE off nothing sets ep4_started or east_road_open, so the drop stays water and the trigger never exists.
//   Issue #99 (WORLD_MAP_PLAN 4): Episode 4 opens here, at the washout at first light. The Episode 3 credits and the quick
//   start put the party at dawn_stage (35,15), one step west of east_road_trig; the morning's marks: dawn_mira (35,14),
//   dawn_bram (34,15), ada_rope (38,14) on the drop where Ada comes up, ada_brink (37,14), garrick_dawn (34,14) (Garrick
//   comes out of the inn door, inn_door (34,13)). `opening_stage` (ep3/_opening.js) gives the scene leaderAt and openingTint.
// withEp4Wake(pk_inn): the enter trigger ep4_wake (0,0) for ep4_morning (now only an old save's wake room: the scene
//   moves the party to the washout), and the marks ada_hearth (5,4) and garrick_door (11,10) beside the existing inn_bed.
// Neither trigger can read the counter credits3_rolled (a trigger's if/ifNot read flags only); both carry if: ep3_complete,
// and the field rolls the Episode 3 credits the moment ep3_complete is set, so a party never stands in either map with
// ep3_complete and the credits still to come.

import { STAGE } from './ep3/_opening.js';

const has = (m, id) => (m.events || []).some((e) => e.id === id);

export function withEastRoad(base) {
  if (!base || base.id !== 'emberpeak' || has(base, 'east_road_trig')) return base;
  const OPEN = 'east_road_open';
  const events = base.events.map((e) => (e.id === 'east_road_sign' ? { ...e, text: 'east_road_sign_ep4' } : e));
  events.push(
    { id: 'east_road_trig', type: 'trigger', x: 36, y: 14, w: 1, h: 2, script: 'east_road_gate', if: 'ep4_started' },
    { id: 'rope_ladder', type: 'object', x: 39, y: 15, sprite: 'rope_ladder', solid: false, text: 'ep4_rope_ladder', if: OPEN },
    { id: 'east_road_down', type: 'door', x: 39, y: 15, to: ['ep4_flood_road', 1, 15, 'right'], kind: 'door', if: OPEN },
    { id: 'ep4_wake_pk', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep4_morning', on: 'enter', if: 'ep3_complete' },
    STAGE,
  );
  const overlays = [
    ...(base.overlays || []),
    { t: 'cinder_path', x: 38, y: 14, if: OPEN }, { t: 'cinder_path', x: 38, y: 15, if: OPEN }, { t: 'cinder_path', x: 39, y: 15, if: OPEN },
  ];
  return { ...base, events, overlays, marks: { ...base.marks, east_road_brink: [38, 15],
    dawn_stage: [35, 15], dawn_mira: [35, 14], dawn_bram: [34, 15], ada_rope: [38, 14], ada_brink: [37, 14], garrick_dawn: [34, 14] } };
}

export function withEp4Wake(base) {
  if (!base || base.id !== 'pk_inn' || has(base, 'ep4_wake')) return base;
  return {
    ...base,
    events: [...base.events, { id: 'ep4_wake', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep4_morning', on: 'enter', if: 'ep3_complete' }],
    marks: { ...base.marks, ada_hearth: [5, 4], garrick_door: [11, 10] },
  };
}

export default { withEastRoad, withEp4Wake };
