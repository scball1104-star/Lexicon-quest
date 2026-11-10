// Episode 6's edits to two Episode 5 maps (EPISODE6_PLAN 3), applied by the ep6 pack (src/data/ep6/maps.js) to the modules
// the ep5 pack registered (after awaiting it: the order trap of plan 3.3). Pure: each takes the registered module and returns
// a new one; the input is never mutated, and a second call returns its input. The ep5_patches.js pattern: every Episode 5
// cell, overlay, decor entry, event and mark stays where it was; the patch only adds. Exact cells in docs/MAPS_EP6_A.md
// section 1. No named export here is a map: tools/maps list this file only to skip it.
//
// withEp6Wake(ep5_sh_inn): the trigger ep6_wake for ep6_morning (if ep5_complete, ifNot ep6_morning_done) and the scene's
//   marks in the guest room upstairs, where the party wakes after the Episode 5 credits (inn_bed (17,7)): bird_sill (19,2)
//   the shuttered window (a pan target in the wall face), mira_window6 (19,3) under it, inn_stage6 (18,4) and
//   inn_stage6_b (17,4) for the hero and Bram.
//   Why a step trigger over the guest room (14..20, 3..9) and not an enter trigger at (0,0): the guest room and the taproom
//   are joined only by the stair doors, and a cutscene walk never takes a door. A save made in the street comes in by the
//   front door into the taproom, where an enter trigger would start the scene with every mark out of reach. A step trigger
//   fires on arrival when the party wakes on it (inn_bed, the credits handoff, a save made upstairs: the field runs the step
//   trigger under the leader after the enter triggers) and on the first step into the room from the stair landing (15,2).
//   A trigger reads flags only: the field rolls the Episode 5 credits the moment ep5_complete is set, so ep5_complete means
//   credits5_rolled. The scene's own guard adds EP6_LIVE and not tier_1 (story.js SCENE_CONDITIONS): with the switch off
//   the trigger runs a scene that returns at once, and walks exactly as before.
// withSkyBerth(ep5_saffron): Yara's ship at the water stairs, on the quay east of Valewyn's boat (which stays untouched at
//   (4..5, 29)):
//   - ship_moored, the Saffron Wind (the Episode 5 sprite, sail set) drawn where the bay decor already has her (6, 33),
//     if ep6_started, so a save before Episode 6 sees no change at all and one after sees the same ship;
//   - sky_berth (10,28), the gangway down from the quay, script ep6_board, if ep6_started, ifNot ep6_boarded; read from
//     (10,27) facing down; the gangway is a doorway (walkable), so sky_berth_trig on the same cell runs the same scene for
//     a party that walks onto it;
//   - berth_north, a boat door on the same cell to ep6_airstair stack_foot (12,43), if ep6_boarded;
//   - marks berth_stage6 (6,25), berth_stage6_m (5,25), berth_stage6_b (7,25): two rows above Yara at water_stairs (7,27)
//     (the quay cell below her is the sea), and berth_land6 (10,27), where the Airstair's boat lands.
//   With EP6_LIVE off nothing sets ep6_started, so no gangway, no trigger and no door exist.

const has = (m, id) => (m.events || []).some((e) => e.id === id);

export const BERTH = { x: 10, y: 28, land: [10, 27] };
export const STACK_FOOT = [12, 43];
export const WAKE_ROOM = { x: 14, y: 3, w: 7, h: 7 };

export function withEp6Wake(base) {
  if (!base || base.id !== 'ep5_sh_inn' || has(base, 'ep6_wake')) return base;
  const { x, y, w, h } = WAKE_ROOM;
  return {
    ...base,
    events: [...base.events, { id: 'ep6_wake', type: 'trigger', x, y, w, h, script: 'ep6_morning', if: 'ep5_complete', ifNot: 'ep6_morning_done' }],
    marks: { ...base.marks, bird_sill: [19, 2], mira_window6: [19, 3], inn_stage6: [18, 4], inn_stage6_b: [17, 4] },
  };
}

export function withSkyBerth(base) {
  if (!base || base.id !== 'ep5_saffron' || has(base, 'sky_berth')) return base;
  const { x, y } = BERTH;
  const events = [
    ...base.events,
    { id: 'ship_moored', type: 'object', x: 6, y: 33, sprite: 'ship_moored', state: 1, solid: false, text: 'ep6_ship_berth', if: 'ep6_started' },
    { id: 'sky_berth', type: 'object', x, y, sprite: 'gangway', script: 'ep6_board', text: 'ep6_ship_berth', if: 'ep6_started', ifNot: 'ep6_boarded' },
    { id: 'sky_berth_trig', type: 'trigger', x, y, w: 1, h: 1, script: 'ep6_board', if: 'ep6_started', ifNot: 'ep6_boarded' },
    { id: 'berth_north', type: 'door', x, y, to: ['ep6_airstair', STACK_FOOT[0], STACK_FOOT[1], 'up'], kind: 'boat', sprite: 'gangway', if: 'ep6_boarded' },
  ];
  return {
    ...base,
    events,
    marks: { ...base.marks, berth_stage6: [6, 25], berth_stage6_m: [5, 25], berth_stage6_b: [7, 25], berth_land6: [...BERTH.land] },
  };
}
