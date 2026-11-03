// The Heartforge (24 x 20, dungeon, dark 0.2). EPISODE3_PLAN 4.7.
//
// A round crucible hall. The Crucible Hook door from F3's antechamber lands at the south mouth (12,18); the way back is the
// notch below it. The Heartforge (a 6 x 5 furnace, roaring until the Warden falls, then banked) fills the north face
// (9..14, 4). The Warden's map actor `cinder_warden` (sprite cinder_warden_avatar) stands on the dais before it, back to
// the party; the anvil heart_anvil and the tool rack flank the dais. warden_trig crosses row 14, the hall's whole width.
// After cinder_warden_defeated: Garrick (the Smith), Ilya and Sella stand by the anvil until pk_restored, and the lift
// lift_heart_up in the north-east face rises to Emberpeak's foundry door (its arrival runs first_bell).
import { grid, box, put, rows, wallDepth, door, sign, object, trigger, actor } from '../_kit.js';

const W = 24, H = 20;
const g = grid(W, H, '#');
// the round hall: an ellipse of floor round (11.5, 11), its north face rows 3..4
for (let y = 5; y <= 18; y++) for (let x = 1; x < W - 1; x++) {
  const dx = (x - 11.5) / 10.2, dy = (y - 11.2) / 7.4;
  if (dx * dx + dy * dy <= 1) put(g, x, y, '.');
}
for (let x = 0; x < W; x++) for (const y of [3, 4]) if (g[5][x] === '.' || (y === 4 && g[6][x] === '.')) put(g, x, y, '|');
for (let x = 0; x < W; x++) if (g[4][x] === '|') put(g, x, 3, '|');
box(g, 11, 18, 12, 19, '.');                // the south mouth and its notch
// the dais: bronze-inlaid floor before the forge
box(g, 8, 6, 15, 8, 'd');
// a ring of slag channels either side of the dais (light; never on the path)
for (const [x, y] of [[3, 9], [3, 10], [4, 9], [20, 9], [20, 10], [19, 9], [5, 15], [18, 15]]) if (g[y][x] === '.') put(g, x, y, 'S');
const ground = rows(wallDepth(g.map((r) => r)));

export default {
  id: 'foundry_heart', name: 'The Heartforge', area: 'dungeon',
  music: null, ambience: 'forge_rumble', tileset: 'forge',
  lighting: { tint: 'none', dark: 0.2, lights: [] },
  floorShade: { color: '#14101e', alpha: 0.5, rows: 8, side: 3 },
  under: 'crucible_floor',
  legend: { 'S': 'slag', '#': 'crucible_top', '|': 'crucible_face', 'v': 'crucible_out_top', 'o': 'crucible_out_face', '.': 'crucible_floor', 'd': 'foundry_floor' },
  ground,
  overlays: [],
  decor: [
    { t: 'tool_rack', x: 15, y: 8 },
    { t: 'pipes_v', x: 7, y: 4 }, { t: 'pipes_v', x: 17, y: 4 },
    { t: 'bellows_decor', x: 4, y: 12 }, { t: 'bellows_decor', x: 18, y: 12 },
  ],
  overhead: [],
  events: [
    enter_('heart_enter', 'warden_after'),
    object('heartforge', 9, 4, 'heartforge', { w: 6, state: 0, text: 'heartforge', ifNot: 'cinder_warden_defeated' }),
    object('heartforge_banked', 9, 4, 'heartforge', { w: 6, state: 1, text: 'heartforge', if: 'cinder_warden_defeated' }),
    actor('cinder_warden', 12, 7, 'cinder_warden_avatar', 'up', { ifNot: 'cinder_warden_defeated' }),
    object('heart_anvil', 9, 8, 'anvil_oath', { text: 'heart_anvil', state: 0 }),
    sign('tool_rack', 15, 8, 'tool_rack'),
    trigger('warden_trig', 2, 14, 20, 1, 'cinder_warden'),
    actor('garrick_t', 10, 9, 'npc_smith', 'up', { if: 'cinder_warden_defeated', ifNot: 'pk_restored', name: 'Garrick' }),
    actor('ilya_t', 13, 10, 'npc_ilya', 'left', { if: 'cinder_warden_defeated', ifNot: 'pk_restored', name: 'Ilya' }),
    actor('sella_t', 14, 10, 'npc_sella', 'left', { if: 'cinder_warden_defeated', ifNot: 'pk_restored', name: 'Sella' }),
    door('heart_exit', 11, 19, ['foundry_f3', 21, 5, 'down'], { w: 2 }),
    { id: 'lift_heart_up', type: 'door', x: 15, y: 4, w: 2, h: 1, to: ['emberpeak', 19, 6, 'down'], kind: 'lift', sprite: 'ore_lift_open', if: 'cinder_warden_defeated' },
  ],
  exits: [],
  marks: {
    warden: [12, 7], forge: [11, 5], anvil: [9, 9], party_stop: [12, 12], garrick_enter: [11, 18], garrick_anvil: [10, 9],
    // CRITIQUE_5 #5: Bram across the anvil from his father (not behind him), the camera high so the forge sits under the window
    bram_anvil: [8, 9], leaf_spot: [11, 6], entry: [12, 18],
  },
  start: { x: 12, y: 18, dir: 'up' },
};

function enter_(id, script) { return { id, type: 'trigger', x: 0, y: 0, w: 1, h: 1, script, on: 'enter' }; }
