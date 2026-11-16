// Episode 8's edits to two Episode 7 maps (EPISODE8_PLAN 3) and one core map (withHomeDoor, below), applied by the ep8 pack
// (src/data/ep8/maps.js) to the modules the ep7 pack registered (after awaiting it: the order trap of plan 3.3). Pure: each
// takes the registered module and returns a new one; the input is never mutated, and a second call returns its input. The
// ep7_patches.js pattern: every Episode 7 cell, overlay, decor entry, event and mark stays where it was; the patch only adds, and everything it adds is gated on a flag
// only an Episode 8 scene sets (or ep7_complete for the wake), so with EP8_LIVE off both maps walk exactly as Episode 7's.
// No named export here is a map: tools/maps list this file only to skip it. Exact cells in docs/MAPS_EP8_A.md 1.
//
// withEp8Wake(ep7_ph_watch): the enter trigger ep8_wake (0,0) for ep8_morning (if ep7_complete, ifNot ep8_morning_done). A
//   trigger reads flags only: the field rolls the Episode 7 credits the moment ep7_complete is set, so ep7_complete stands
//   for counter credits7_rolled (the Episode 6 and 7 precedent); the scene's own guard adds EP8_LIVE and not tier_1. The
//   credits wake the party on watch_cot (14,5); the scene stages on Episode 7's keeper_chair and watch_stage marks
//   (STAGING_EP8: the plan's nox_table8 is not needed, so the patch adds no mark).
// withStairDoor(ep7_stillheart): the enter trigger ep8_roof_enter (0,0) for ep8_roof (if ep8_started, ifNot ep8_roofed: the
//   party enters by Palehaven's nave door, which lands on `roof`); the stair door stair_up on Episode 7's stair_foot (20,9),
//   the star stair's first step, to ep8_stair stair_bottom (15,57) (if ep8_roofed: ep8_roof owns the first crossing); the
//   Stair's stair_down lands back on (20,10), one below it; the inspect stair_door_look (ep8_stair_door) on the same cell
//   before it opens; marks aeris_roof (15,12) beside the Kestrel's mooring, stair_stage (20,11), stair_stage_m (19,11),
//   stair_stage_b (21,11) two below stair_foot; and the ep6 `kestrel` (a piece, collision none, all overhead) moored at
//   (8..13, 10..12) over the roof's west side from ep8_started (an overhead entry, flag-gated). ep7_ending, sh_after and every
//   Episode 7 mark are untouched.
// withHomeDoor(hero_home) (E8-fixes): the core map, patched over the core module the way ep7's withCourtPortrait is (not a
//   touched map: `touches` would hold every Episode 1 player at the front door for the pack). The enter trigger ep8_home_enter
//   (0,0) runs `home` (if scriptorium_open, ifNot home_reached): home's s.goto autosaves here mid-scene, and a reload must
//   pick the scene up at the door instead of leaving the only restart at the South Margin. Only an Episode 8 scene sets
//   scriptorium_open, so Episodes 1 to 7 saves see Episode 1's house.

const has = (m, id) => (m.events || []).some((e) => e.id === id);

export const WATCH_WAKE = { if: 'ep7_complete', ifNot: 'ep8_morning_done' };
export const STAIR_FOOT_CELL = [20, 9];
export const STAIR_RETURN = [20, 10];
export const KESTREL_ROOF = { t: 'kestrel', x: 8, y: 12, if: 'ep8_started' };

export const HOME_RETURN = { if: 'scriptorium_open', ifNot: 'home_reached' };

export function withEp8Wake(base) {
  if (!base || base.id !== 'ep7_ph_watch' || has(base, 'ep8_wake')) return base;
  return {
    ...base,
    events: [...base.events, { id: 'ep8_wake', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep8_morning', on: 'enter', ...WATCH_WAKE }],
  };
}

export function withStairDoor(base) {
  if (!base || base.id !== 'ep7_stillheart' || has(base, 'stair_up')) return base;
  const [x, y] = (base.marks && base.marks.stair_foot) || STAIR_FOOT_CELL;
  return {
    ...base,
    events: [
      ...base.events,
      { id: 'ep8_roof_enter', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep8_roof', on: 'enter', if: 'ep8_started', ifNot: 'ep8_roofed' },
      { id: 'stair_door_look', type: 'sign', x, y, text: 'ep8_stair_door', solid: false, if: 'ep8_started', ifNot: 'ep8_roofed' },
      { id: 'stair_up', type: 'door', x, y, to: ['ep8_stair', 15, 57, 'up'], kind: 'stairs', if: 'ep8_roofed' },
    ],
    overhead: [...(base.overhead || []), { ...KESTREL_ROOF }],
    marks: { ...base.marks, aeris_roof: [15, 12], stair_stage: [x, y + 2], stair_stage_m: [x - 1, y + 2], stair_stage_b: [x + 1, y + 2] },
  };
}

export function withHomeDoor(base) {
  if (!base || base.id !== 'hero_home' || has(base, 'ep8_home_enter')) return base;
  return {
    ...base,
    events: [...base.events, { id: 'ep8_home_enter', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'home', on: 'enter', ...HOME_RETURN }],
  };
}
