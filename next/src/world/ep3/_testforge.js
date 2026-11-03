// Fixtures for the Episode 3 field systems (E3-world): a Slag Hall test room with every new event, and the same room
// in the dark (F3-style: the slag is the light). Registered by ./index.js (registerMap) so they never ship in the first
// download. Ids start with an underscore (never a COMMON.md map id).
//
// _testforge (30 x 18): the north hall holds spout A over sluice sl_b ('/' sends the water west into pool 1, which
// cools and opens the ledge chest; turned, it runs east, down through the slag moat, which cools, into basin bs_main),
// spout B dammed by a heavy ore crate (Shove it off the trough and basin bs_dam fills: latch), the hot grate g_hot
// (bs_main; a door to the dark room), the lift gate g_and (bs_main AND bs_dam), the Bell Gate g_bell (three flags),
// and a lift door to the dark room.

function forgeRows() {
  const W = 30, H = 18;
  const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    if (y < 2 || y >= 16 || x === 0 || x === W - 1) return '#';
    if (y < 4) return '|';
    return '.';
  }));
  const put = (x, y, c) => { g[y][x] = c; };
  for (let y = 4; y <= 6; y++) for (let x = 3; x <= 5; x++) put(x, y, 'S');     // pool 1
  for (let y = 7; y <= 8; y++) for (let x = 1; x <= 5; x++) put(x, y, '#');     // the ledge's shelf
  for (let y = 9; y <= 10; y++) for (let x = 1; x <= 28; x++) put(x, y, 'S');   // the moat
  put(8, 4, 'i'); put(8, 5, 't'); put(7, 5, '-'); put(6, 5, '-');
  for (let x = 9; x <= 14; x++) put(x, 5, '-');
  put(15, 5, '7'); for (let y = 6; y <= 8; y++) put(15, y, 'i');
  put(15, 11, 'i'); put(15, 12, 'i');
  for (let y = 4; y <= 7; y++) put(27, y, 'i');
  return g.map((r) => r.join(''));
}

export const TEST_FORGE = {
  id: '_testforge', name: 'Test Slag Hall', area: 'dungeon', music: null, ambience: null, tileset: 'forge',
  lighting: { tint: 'none', dark: 0 },
  under: 'foundry_floor',
  start: { x: 11, y: 7, dir: 'left' },
  legend: { '#': 'foundry_top', '|': 'foundry_face', '.': 'foundry_floor', 'S': 'slag', '-': 'trough_h', 'i': 'trough_v', 't': 'trough_t_s', '7': 'trough_sw' },
  ground: forgeRows(),
  overlays: [],
  decor: [],
  ambientFx: [{ fx: 'ash', area: { x: 1, y: 11, w: 28, h: 5 } }],
  events: [
    { id: 'spout_a', type: 'spout', x: 8, y: 3, dir: 'down', sprite: 'spout_wall' },
    { id: 'sl_b', type: 'sluice', x: 8, y: 5, state: 0 },
    { id: 'bs_main', type: 'basin', x: 15, y: 13, face: 'up', target: ['g_hot', 'g_and'] },
    { id: 'spout_b', type: 'spout', x: 27, y: 3, dir: 'down', sprite: 'spout_wall' },
    { id: 'ore', type: 'block', x: 27, y: 6, heavy: true, sprite: 'ore_crate' },
    { id: 'bs_dam', type: 'basin', x: 27, y: 8, face: 'up', latch: true, target: 'g_and' },
    { id: 'g_hot', type: 'gate', x: 19, y: 3, sprite: 'hot_grate', state: 'closed', to: ['_testforge_dark', 19, 4, 'down'] },
    { id: 'g_and', type: 'gate', x: 23, y: 3, sprite: 'ore_lift', state: 'closed' },
    { id: 'g_bell', type: 'gate', x: 10, y: 3, sprite: 'bell_gate', state: 'closed', flags: ['_t_oath_a', '_t_oath_b', '_t_oath_c'] },
    { id: 'lift', type: 'door', x: 15, y: 3, kind: 'lift', sprite: 'ore_lift_open', to: ['_testforge_dark', 15, 4, 'down'] },
    { id: 'ledge_chest', type: 'chest', x: 1, y: 5, tier: 'wood', item: 'potion' },
  ],
  exits: [],
  marks: { sluice: [8, 5], pool: [4, 5], ledge: [2, 5], basin: [15, 13], grate: [19, 3], dam: [27, 6], moat: [15, 9], lift: [15, 3] },
};

/** The same hall in the dark (dark 0.5): only the molten slag lights it, so cooling a pool darkens it. */
export const TEST_FORGE_DARK = {
  ...TEST_FORGE, id: '_testforge_dark', name: 'Test Slag Hall (dark)', lighting: { tint: 'none', dark: 0.5 }, ambientFx: [],
  events: TEST_FORGE.events.map((e) => (e.to ? { ...e, to: ['_testforge', e.to[1], e.to[2], e.to[3]] } : e)),
};

export default { _testforge: TEST_FORGE, _testforge_dark: TEST_FORGE_DARK };
