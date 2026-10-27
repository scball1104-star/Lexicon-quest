// The Deep Stacks, B100: The Binding (26 x 24, dungeon, dark 0.45). DEEP_STACKS_PLAN 2.12 and 5.4; C2-sprites-boss.
//
// The bottom of the Stacks is the Forge of Names kit (the crucible walls): B99's stairs land in a small iron-plated
// antechamber (the arrival at [12, 18], gen.js B100_ARRIVAL), a passage climbs north-east into the Binder's hall, a
// crucible-floored hall between two channels of molten slag, with the Heartforge set into its north wall and an iron
// dais under the forge mouth. A red runner leads from the hall's south wall to the dais. The Binder hovers at the dais'
// south edge (mark `binder`, the actor `cave_binder`) until `deep_stacks_cleared`; the step trigger across row 10 starts
// its scene. After the fight the Quill's chest stands under the forge mouth behind where it hovered (the chest at 12,5;
// mark `quill_chest` is the cell it is opened from; blue, item cave_binders_quill). No stair down.
//
// Seams the integrator wires (C2-world / C2-story-ui): the scene id `cave_binder` (the trigger's script, the fight), the
// actor sprite `binder_avatar` (cave_enemies_field, merged into enemies_field by the pack loader), the chest tier `blue`
// (cave_props chest_blue), the flag `deep_stacks_cleared` (C1-data registers it).
import { grid, box, rows, room, wallDepth, chest, actor, trigger, light } from '../../maps/_kit.js';

export const ARRIVAL = [12, 18];
export const BINDER_SCENE = 'cave_binder';
export const BINDER_SPRITE = 'binder_avatar';

const W = 26, H = 24;
const g = grid(W, H, '#');
room(g, 4, 5, 21, 14, '.', '|');            // the Binder's hall (faces on rows 3 and 4)
room(g, 8, 18, 17, 21, '.', '|');           // the antechamber (faces on rows 16 and 17); the arrival under its north face
box(g, 15, 15, 16, 17, '.');                // the passage: through the antechamber's faces and the wall between
box(g, 10, 5, 15, 7, 'f');                  // the dais: iron plate under the forge mouth (rimmed below)
box(g, 4, 6, 5, 13, 'w'); box(g, 20, 6, 21, 13, 'w');   // the slag channels (molten, blocked, they light the hall)
box(g, 12, 8, 13, 14, 'c');                 // the runner from the south wall to the dais
box(g, 8, 18, 17, 21, 'f');                 // the antechamber is iron-plated
const ground = rows(wallDepth(g.map((r) => r)));

const overlays = [
  // cooled slag along the channels, ash where the party walks in
  { t: 'slag_crust', x: 6, y: 7 }, { t: 'slag_crust_b', x: 6, y: 11 }, { t: 'slag_crust_c', x: 19, y: 8 }, { t: 'slag_crust', x: 19, y: 12 },
  { t: 'slag_crust_b', x: 6, y: 13 }, { t: 'slag_crust', x: 19, y: 5 },
  { t: 'ash_drift_a', x: 9, y: 20 }, { t: 'ash_drift_b', x: 16, y: 19 }, { t: 'ash_drift_c', x: 15, y: 15 }, { t: 'ash_drift_a', x: 14, y: 13 },
  { t: 'ash_drift_b', x: 8, y: 9 }, { t: 'ash_drift_c', x: 17, y: 11 },
];

const decor = [
  // the north face: the Heartforge over the dais, furnace mouths and pipework either side
  { t: 'heartforge', x: 10, y: 4 },
  { t: 'furnace_mouth', x: 6, y: 4 }, { t: 'furnace_mouth', x: 18, y: 4 },
  { t: 'pipes_valve', x: 8, y: 4 }, { t: 'pipes_h', x: 9, y: 4 }, { t: 'pipes_h', x: 16, y: 4 }, { t: 'pipes_valve', x: 17, y: 4 },
  { t: 'pipes_elbow', x: 4, y: 4 }, { t: 'pipes_elbow', x: 21, y: 4 },
  // the hall: ember pits flanking the dais, iron lamps by the south wall, pillars along the channels
  { t: 'ember_pit', x: 9, y: 8 }, { t: 'ember_pit', x: 16, y: 8 },
  { t: 'lamp_ember', x: 8, y: 14 }, { t: 'lamp_ember', x: 17, y: 14 },
  { t: 'pillar', x: 6, y: 6 }, { t: 'pillar', x: 19, y: 6 }, { t: 'pillar', x: 6, y: 10 }, { t: 'pillar', x: 19, y: 10 },
  { t: 'anvil_oath', x: 7, y: 13 }, { t: 'ledger_burned', x: 18, y: 13 },
  // the antechamber: the stairs the party came down, ore crates, a tool rack
  { t: 'stairs_up', x: 12, y: 17 },
  { t: 'pipes_v', x: 8, y: 17 }, { t: 'pipes_v', x: 17, y: 17 },
  { t: 'ore_crate', x: 8, y: 21 }, { t: 'ore_crate', x: 8, y: 20 }, { t: 'tool_rack', x: 16, y: 21 }, { t: 'ember_pit', x: 10, y: 18 },
];

const events = [
  actor('cave_binder', 12, 7, BINDER_SPRITE, 'down', { ifNot: 'deep_stacks_cleared' }),
  trigger('binder_trig', 6, 10, 14, 1, BINDER_SCENE, { ifNot: 'deep_stacks_cleared' }),
  chest('quill_chest', 12, 5, 'blue', { item: 'cave_binders_quill', if: 'deep_stacks_cleared' }),
  light('l_forge', 12, 5, 7, '#e06b39'), light('l_pit_w', 9, 8, 4, '#e06b39'), light('l_pit_e', 16, 8, 4, '#e06b39'),
  light('l_lamp_w', 8, 14, 4, '#f9d77a'), light('l_lamp_e', 17, 14, 4, '#f9d77a'),
  light('l_arrival', 12, 18, 3, '#ffe6b0'), light('l_ante', 10, 18, 4, '#e06b39'),
];

export default {
  id: 'cave_b100', name: 'The Forge of Names, B100', area: 'dungeon', floor: 100, band: 'forge', landing: false,
  music: 'foundry', ambience: 'forge_rumble', tileset: 'forge', backdrop: 'boss',
  lighting: { tint: 'none', dark: 0.45 },
  under: 'crucible_floor',
  legend: { '#': 'crucible_top', '|': 'crucible_face', 'v': 'crucible_out_top', 'o': 'crucible_out_face',
    '.': 'crucible_floor', 'f': 'foundry_floor', 'c': 'carpet_red', 'w': 'slag' },
  // the dais sits on an iron rim (tilemap.js rims), not a pasted block of plate
  rims: [{ x: 10, y: 5, w: 6, h: 3, thick: 2, color: '#66637f', hi: '#b3b6c4', lo: '#14101e', shade: '#2e2b4c' }],
  ground,
  overlays,
  decor,
  overhead: [],
  events,
  exits: [],
  // every mark is a cell the party can stand on: quill_chest is the cell the chest (at 12,5) is opened from, the
  // generator's convention for chest marks; binder is where the Binder hovers (the dais' south edge, under the forge)
  marks: {
    arrival: ARRIVAL, binder: [12, 7], quill_chest: [12, 6], dais: [13, 7], party_stop: [12, 10],
    hall_entry: [15, 14], passage: [15, 16],
  },
  start: { x: ARRIVAL[0], y: ARRIVAL[1], dir: 'down' },
};
