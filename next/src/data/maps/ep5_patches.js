// Episode 5's edits to two Episode 4 maps (EPISODE5_PLAN 3), applied by the ep5 pack (src/data/ep5/maps.js) to the modules
// the ep4 pack registered (after awaiting it: the order trap of plan 3.3). Pure: each takes the registered module and returns
// a new one; the input is never mutated. The ep4_patches.js pattern: every Episode 4 cell, event and mark stays where it
// was; the patch only adds. Exact cells in docs/MAPS_EP5_A.md section 1.
//
// withEp5Wake(ep4_vw_inn): the enter trigger ep5_wake (0,0) for ep5_morning (if ep4_complete) and the scene's marks in the
//   guest room upstairs, where the party wakes after the Episode 4 credits (inn_bed (17,7)): mira_window (19,3) under the
//   window, inn_stage (17,4) and inn_stage_b (16,4) for the hero and Bram, yara_table (19,8) at the long table's end.
//   A save made in the street enters by the front door into the taproom (10,10), and the stair up is a door, so the
//   scene has a taproom set too (E5-integrate): mira_window_tap (10,3) under the taproom window, inn_stage_tap (9,5) and
//   inn_stage_b_tap (8,5), yara_table_tap (5,7) at the long table.
//   A trigger cannot read the counter credits4_rolled (if/ifNot read flags only); the field rolls the Episode 4 credits
//   the moment ep4_complete is set, so a party never stands in the inn with ep4_complete and the credits still to come.
//   The scene's own guard adds EP5_LIVE and not tier_1 (story.js SCENE_CONDITIONS).
// withShipBerth(ep4_valewyn): the Saffron Wind moored on the south quay, east of the Flood Road ferry (which stays
//   untouched at (21..22, 33)):
//   - ship_moored, the ship (6 x 4, footprint row 33, x 30..35) in the river, if ep5_started; ship_moored_sign (31,31) on
//     its hull reads ep5_ship_moored from the quay (31,30);
//   - ship_berth (32,31), the gangway down from the quay, script ep5_board, if ep5_started, ifNot ship_boarded; read from
//     (32,30) facing down; the gangway is a doorway (walkable), so berth_trig on the same cell runs the same scene for a
//     party that walks onto it (E5-integrate: a player who steps down the gangway boards, instead of nothing happening);
//   - two boat doors on the same cell: berth_sail to ep5_ship deck_start (5,7) (if ship_boarded, ifNot road_landed) and
//     berth_south to Saffron Haven's water stairs (4,27) (if road_landed), so a return trip skips the deck;
//   - marks berth_yara (34,28), berth_stage (34,30), berth_stage_m (33,30), berth_stage_b (35,30): Yara two rows above
//     the party, the gangway's top cell (32,30) left free for her walk aboard; berth_land (32,30) is where the Haven's
//     boat lands.
//   With EP5_LIVE off nothing sets ep5_started, so no ship, no berth and no door exist.

const has = (m, id) => (m.events || []).some((e) => e.id === id);

export const BERTH = { x: 32, y: 31, land: [32, 30] };
export const DECK_START = [5, 7];
export const HAVEN_DOCK = [4, 27];

export function withEp5Wake(base) {
  if (!base || base.id !== 'ep4_vw_inn' || has(base, 'ep5_wake')) return base;
  return {
    ...base,
    events: [...base.events, { id: 'ep5_wake', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep5_morning', on: 'enter', if: 'ep4_complete' }],
    marks: { ...base.marks, yara_table: [19, 8], mira_window: [19, 3], inn_stage: [17, 4], inn_stage_b: [16, 4],
      yara_table_tap: [5, 7], mira_window_tap: [10, 3], inn_stage_tap: [9, 5], inn_stage_b_tap: [8, 5] },
  };
}

export function withShipBerth(base) {
  if (!base || base.id !== 'ep4_valewyn' || has(base, 'ship_berth')) return base;
  const { x, y } = BERTH;
  const events = [
    ...base.events,
    { id: 'ship_moored', type: 'object', x: 30, y: 33, sprite: 'ship_moored', state: 0, solid: false, text: 'ep5_ship_moored', if: 'ep5_started' },
    { id: 'ship_moored_sign', type: 'sign', x: 31, y: 31, text: 'ep5_ship_moored', solid: false, if: 'ep5_started' },
    { id: 'ship_berth', type: 'object', x, y, sprite: 'gangway', script: 'ep5_board', text: 'ep5_ship_moored', if: 'ep5_started', ifNot: 'ship_boarded' },
    { id: 'berth_trig', type: 'trigger', x, y, w: 1, h: 1, script: 'ep5_board', if: 'ep5_started', ifNot: 'ship_boarded' },
    { id: 'berth_sail', type: 'door', x, y, to: ['ep5_ship', DECK_START[0], DECK_START[1], 'right'], kind: 'boat', sprite: 'gangway', if: 'ship_boarded', ifNot: 'road_landed' },
    { id: 'berth_south', type: 'door', x, y, to: ['ep5_saffron', HAVEN_DOCK[0], HAVEN_DOCK[1], 'up'], kind: 'boat', sprite: 'gangway', if: 'road_landed' },
  ];
  return {
    ...base,
    events,
    marks: { ...base.marks, berth_yara: [34, 28], berth_stage: [34, 30], berth_stage_m: [33, 30], berth_stage_b: [35, 30], berth_land: [...BERTH.land] },
  };
}

export default { withEp5Wake, withShipBerth };
