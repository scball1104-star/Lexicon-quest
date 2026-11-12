// Episode 7's edits to three Episode 6 maps (EPISODE7_PLAN 3), applied by the ep7 pack (src/data/ep7/maps.js) to the modules
// the ep6 pack registered (after awaiting it: the order trap of plan 3.3). Pure: each takes the registered module and returns
// a new one; the input is never mutated, and a second call returns its input. The ep6_patches.js pattern: every Episode 6
// cell, overlay, decor entry, event and mark stays where it was; the patch only adds. Exact cells in docs/MAPS_EP7_A.md 1.
// No named export here is a map: tools/maps list this file only to skip it.
//
// A trigger reads flags only. The field rolls the Episode 6 credits the moment ep6_complete is set, so ep6_complete means
// credits6_rolled. The scene's own guard (story.js SCENE_CONDITIONS) adds EP7_LIVE and not tier_1: with the switch off the
// triggers run a scene that returns at once, and nothing a player sees changes (no flag Episode 7 sets can be set).
//
// withEp7Wake(ep6_zl_inn): the enter trigger ep7_wake (0,0) for ep7_morning (if ep6_complete, ifNot ep7_morning_done). The
//   credits wake the party at inn_bed; the scene's first step leaves the inn on black for the Chart Room. No marks.
// withEp7Charts(ep6_zl_charts) (2026-11-11: the morning is staged here, not in the inn room): the enter trigger
//   ep7_wake_charts (same guard) and the ep3 pack's opening_stage event (leaderAt, openingTint), exactly as Episode 6's
//   withObsWake; marks charts_dawn (6,6) = story.js CHARTS_STAGE, two rows below Aeris's place aeris_table7 (6,4) across the
//   skychart (4..6, 5), charts_dawn_m (5,6), charts_dawn_b (7,6), compass_table (4,5) the skychart's cell, north_window (5,1)
//   the curtained window on the north face; and north_frost, the window frosted from the inside (a clear ice slab over it,
//   the frost_door art), while ep6_complete and not ep7_started, read as ep7_north_window; once ep7_started the same line is
//   read from north_window_look. charts_trig, the save bell and every Episode 6 mark are untouched. The room is 18 x 15:
//   across it fits the screen; down it scrolls a tile and a half, so charts_dawn (6,6) sits 6 rows from the top (noted in
//   MAPS_EP7_A.md: the camera clamps by half a tile there).
// withNorthBerth(ep6_zephyr): at the north dock (16..25, 3..9), under the Kestrel's bow, the gangway north_gangway (19,3)
//   (script ep7_board, if ep7_started, ifNot ep7_boarded), north_gangway_trig on the same cell (the gangway is a doorway,
//   so a party that walks onto it runs the same scene), and the boat door berth_white_road on that cell to ep7_white_road
//   lake_landing (15,74) (if ep7_boarded). Marks for ep7_board: aeris_gangway7 (19,5), vex_seat (23,5) at the Kestrel's
//   rail, gangway7 (21,7) with gangway7_m (20,7) and gangway7_b (22,7), two rows below and beside both speakers.
//   north_dock (22,5), where isles_return and the White Road's kestrel_back land, is untouched.
import { STAGE } from './ep3/_opening.js';

const has = (m, id) => (m.events || []).some((e) => e.id === id);
const WAKE_IF = { if: 'ep6_complete', ifNot: 'ep7_morning_done' };

export const CHARTS_DAWN = [6, 6];
export const GANGWAY = { x: 19, y: 3 };
export const LAKE_LANDING = [15, 74];

export function withEp7Wake(base) {
  if (!base || base.id !== 'ep6_zl_inn' || has(base, 'ep7_wake')) return base;
  return {
    ...base,
    events: [...base.events, { id: 'ep7_wake', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep7_morning', on: 'enter', ...WAKE_IF }],
  };
}

export function withEp7Charts(base) {
  if (!base || base.id !== 'ep6_zl_charts' || has(base, 'ep7_wake_charts')) return base;
  const events = [
    ...base.events,
    { id: 'ep7_wake_charts', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep7_morning', on: 'enter', ...WAKE_IF },
    ...(has(base, STAGE.id) ? [] : [STAGE]),
    { id: 'north_frost', type: 'object', x: 5, y: 2, sprite: 'frost_door', state: 0, text: 'ep7_north_window', if: 'ep6_complete', ifNot: 'ep7_started' },
    { id: 'north_window_look', type: 'sign', x: 5, y: 2, text: 'ep7_north_window', if: 'ep7_started' },
  ];
  return {
    ...base,
    events,
    marks: {
      ...base.marks,
      charts_dawn: [...CHARTS_DAWN], charts_dawn_m: [CHARTS_DAWN[0] - 1, CHARTS_DAWN[1]], charts_dawn_b: [CHARTS_DAWN[0] + 1, CHARTS_DAWN[1]],
      aeris_table7: [6, 4], compass_table: [4, 5], north_window: [5, 1],
    },
  };
}

export function withNorthBerth(base) {
  if (!base || base.id !== 'ep6_zephyr' || has(base, 'north_gangway')) return base;
  const { x, y } = GANGWAY;
  return {
    ...base,
    events: [
      ...base.events,
      { id: 'north_gangway', type: 'object', x, y, sprite: 'gangway', script: 'ep7_board', text: 'ep6_kestrel', if: 'ep7_started', ifNot: 'ep7_boarded' },
      { id: 'north_gangway_trig', type: 'trigger', x, y, w: 1, h: 1, script: 'ep7_board', if: 'ep7_started', ifNot: 'ep7_boarded' },
      { id: 'berth_white_road', type: 'door', x, y, to: ['ep7_white_road', LAKE_LANDING[0], LAKE_LANDING[1], 'up'], kind: 'boat', sprite: 'gangway', if: 'ep7_boarded' },
    ],
    marks: { ...base.marks, aeris_gangway7: [19, 5], vex_seat: [23, 5], gangway7: [21, 7], gangway7_m: [20, 7], gangway7_b: [22, 7] },
  };
}
