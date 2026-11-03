// Hollowmere's east gate (EPISODE3_PLAN 3), as the ep3 pack applies it to the core nameless_hollow module. Pure.
//
// Kept out of src/data/maps/nameless_hollow.js on purpose: the core download has no room left under the tap-prompt
// ratchet (qa/pwa/budget_ratchet.json), so the pack's register() swaps in withEastGate(core) for the id
// nameless_hollow, and tools/maps/mapcheck.mjs resolves the id the same way. Every Episode 2 cell, event and mark of the
// core module stays exactly where it was; the patch only adds:
//   - a dirt spur from the shop road (37,21) east and down the garden to the east edge (x 39..43, rows 26..27);
//   - two stone gateposts (42,25) and (42,28) and the chain between them (`sand_chain` at (42,26..27), solid, ifNot
//     sand_gate_open). No wall: every Episode 2 cell stays reachable; the way out is the door below, which exists only
//     while sand_gate_open (the field fires no `exits` entry by flag, so the gate is a door event);
//   - the step trigger `sand_gate_trig` two tiles west of the chain (40, 26..27; scene sand_gate, if ep3_started);
//   - the exit: a door on the gap (43, 26..27) to sand_road (1,22) facing right, present only while sand_gate_open;
//   - marks sand_gate (41,26), vessa_gate (39,24), penny_cart_h (39,27).
// The garden willow at (40,28) would hide the spur and the chain under its canopy: two bushes stand there instead. While the chain is up nothing east of x 42 is reachable (qa/maps/ep3_maps.test.mjs walks both states).

const put = (g, x, y, ch) => { g[y] = g[y].slice(0, x) + ch + g[y].slice(x + 1); };

export function withEastGate(base) {
  if (!base || base.id !== 'nameless_hollow' || (base.events || []).some((e) => e.id === 'sand_chain')) return base;
  const g = base.ground.slice();
  for (const [x, y] of [[38, 21], [39, 21]]) put(g, x, y, '=');
  for (let y = 22; y <= 25; y++) for (const x of [39, 40]) put(g, x, y, '=');
  for (let x = 39; x <= 43; x++) for (const y of [26, 27]) put(g, x, y, '=');
  const decor = base.decor.filter((d) => !(d.t === 'tree_birch_silver' && d.x === 40 && d.y === 28));
  decor.push({ t: 'bush', x: 40, y: 28 }, { t: 'bush', x: 41, y: 28 });
  decor.push({ t: 'pillar', x: 42, y: 25 }, { t: 'pillar', x: 42, y: 28 });
  const events = [
    ...base.events,
    { id: 'sand_chain', type: 'object', x: 42, y: 26, h: 2, sprite: 'fence_iron', text: 'sand_chain', ifNot: 'sand_gate_open' },
    { id: 'sand_gate_trig', type: 'trigger', x: 40, y: 26, w: 1, h: 2, script: 'sand_gate', if: 'ep3_started' },
    { id: 'sand_gate_exit', type: 'door', x: 43, y: 26, w: 1, h: 2, to: ['sand_road', 1, 22, 'right'], kind: 'door', if: 'sand_gate_open' },
    // E3-integrate: a save that left the inn after the Episode 2 credits wakes Episode 3 here (scene guards: ep2_complete,
    // not ep3_morning_done, EP3_LIVE). The scene's marks are at the inn door: Wren comes out, the Smith waits by the wall.
    { id: 'ep3_wake_nh', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep3_morning', on: 'enter' },
  ];
  const overlays = [
    ...base.overlays.filter((o) => !(o.x >= 39 && o.x <= 43 && o.y >= 21 && o.y <= 27)),
    { t: 'fence_iron', x: 42, y: 27, ifNot: 'sand_gate_open' },
    { t: 'pebbles_1', x: 41, y: 27 }, { t: 'pebbles_0', x: 40, y: 23 },
  ];
  return {
    ...base,
    ground: g,
    decor,
    overlays,
    events,
    marks: { ...base.marks, sand_gate: [41, 26], vessa_gate: [39, 24], penny_cart_h: [39, 27], smith_seat: [10, 19], wren_wake: [7, 19], inn_door: [8, 18] },
  };
}

/**
 * nh_inn's Episode 3 marks (STAGING_EP3 4), applied the same way: the guest room upstairs, where the party wakes. The
 * inn has no hearth, so the Smith sits by the guest room's long table; `inn_door` is the head of the stair (the way out
 * of the guest room), `wren_wake` the tile beside the bed. Nothing else changes.
 */
export function withInnMarks(base) {
  if (!base || base.id !== 'nh_inn' || (base.marks && base.marks.smith_seat)) return base;
  // E3-integrate: the enter trigger that runs ep3_morning (the core inn has none; the scene's own guards gate it)
  return { ...base, events: [...base.events, { id: 'ep3_wake', type: 'trigger', x: 0, y: 0, w: 1, h: 1, script: 'ep3_morning', on: 'enter' }],
    marks: { ...base.marks, smith_seat: [19, 8], wren_wake: [16, 7], inn_door: [15, 3] } };
}

export default withEastGate;
