// Episode 2 maps (E2-maps, EPISODE2_PLAN 3, 4 and 5): the valley link, the Fading Road's fog, the Hollow, the five
// interiors and the Court of Mirrors. The beams are modeled by tools/maps/mapcheck.mjs (a search over mirror states and
// movable-mirror cells per beam system, with E2-world's src/world/beam.js tracing): every puzzle's start state lights
// nothing critical, the intended solution lights it, the critical path needs it, and no reachable state is a softlock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_IDS_EP2, loadAll, loadDb, validate, walk, buildGrid, loadStaging, loadStagingEp2, withFlags, BRIDGE_RE } from '../../tools/maps/mapcheck.mjs';

const db = await loadDb();
const maps = await loadAll();
const staging = loadStaging();
const byId = (m, id) => m.events.find((e) => e.id === id);
const without = (m, pred) => ({ ...m, events: m.events.filter((e) => !pred(e)) });
const reached = (r, id) => { const e = r.events.find((x) => x.id === id); assert.ok(e, `${r.id}: event ${id} exists`); return e.reached; };
const EP1_DONE = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done',
  'echo_warden_defeated', 'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete'];

const walks = {};
const walkOf = (id) => (walks[id] ||= walk(maps[id], db, { lantern: true }));

test('every Episode 2 map validates (ids, targets, NPC coverage, enemy plan, STAGING_EP2 marks and named events)', () => {
  for (const id of [...MAP_IDS_EP2, 'valley', 'willowmere', 'chapel', 'hero_home']) {
    const r = validate(maps[id], db, maps, { staging });
    assert.deepEqual(r.errors, [], id);
  }
  const ep2 = loadStagingEp2();
  for (const id of ['east_road', 'nameless_hollow', 'court_f1', 'court_f2', 'court_f3', 'court_throne', 'valley']) assert.ok(ep2[id], `STAGING_EP2 row ${id}`);
});

test('every Episode 2 chest is reachable (the Keeper cache with the Lantern) and no event is out of reach', () => {
  for (const id of MAP_IDS_EP2) {
    const r = walkOf(id);
    assert.deepEqual(r.unreached, [], `${id} unreached (log: ${r.log.join('; ')})`);
  }
  // without the Lantern the Courage cache stays sealed
  const dark = walk(maps.court_f3, db);
  assert.equal(reached(dark, 'chest_hollowcrown'), false);
});

// ------------------------------------------------------------------------------------------------ the valley link
test('valley: the washout seals the east with Episode 1 flags; Garrick\'s Crossing opens it with ep2_started', () => {
  const v = maps.valley;
  const exit = v.exits.find((x) => x.to[0] === 'east_road');
  assert.deepEqual([exit.x, exit.y, exit.h], [59, 16, 2]);
  assert.deepEqual(exit.to, ['east_road', 1, 16, 'right']);
  const reach = (flags) => new Set(walk(v, db, { flags }).reachable);
  const ep1 = reach(EP1_DONE);
  assert.equal(ep1.has('58,16') || ep1.has('58,17'), false, 'east exit reachable in Episode 1');
  // the whole Episode 1 valley still walks under Episode 1 flags (the Archive forecourt, the pool edge, the plateau)
  for (const c of ['36,7', '51,28', '8,10', '39,21']) assert.ok(ep1.has(c), `Episode 1 cell ${c}`);
  const ep2 = reach([...EP1_DONE, 'ep2_started']);
  assert.ok(ep2.has('58,16'), 'east exit reachable once ep2_started');
  // the crossing: planks only with ep2_started, the trigger catches every approach, the marks sit on the planks
  const planks = v.overlays.filter((o) => /^bridge_wood_h_/.test(o.t) && o.x >= 44 && o.y >= 16 && o.y <= 17);
  assert.ok(planks.length >= 6 && planks.every((o) => o.if === 'ep2_started'));
  const t = byId(v, 'crossing_trig');
  assert.equal(t.script, 'garrick_crossing');
  const g0 = buildGrid(withFlags(v, [...EP1_DONE, 'ep2_started']), db);
  const deckWest = Math.min(...planks.map((o) => o.x));
  for (const y of [16, 17]) assert.ok(deckWest >= t.x && deckWest < t.x + t.w && y >= t.y && y < t.y + t.h, `deck end ${deckWest},${y} in the trigger`);
  for (const k of ['crossing_garrick', 'crossing_hal']) { const [x, y] = v.marks[k]; assert.equal(g0.code[y][x], 'none', `${k} on the planks`); }
  // Garrick and Hal walk three tiles west off the planks: those cells are open
  for (const [mx, my] of [v.marks.crossing_garrick, v.marks.crossing_hal]) for (let i = 1; i <= 3; i++) assert.equal(g0.code[my][mx - i], 'none', `walk-off ${mx - i},${my}`);
  assert.equal(byId(v, 'garrick_rail').if, 'crossing_done');
  assert.equal(byId(v, 'ford_wrack').text, 'ford_wrack');
});

test('willowmere and its chapel: the smithy door note while Garrick is away; the Keeper mirror pairs with the Hollow chapel', () => {
  const n = byId(maps.willowmere, 'smithy_ford_note');
  const d = byId(maps.willowmere, 'door_smithy');
  assert.deepEqual([n.x, n.y, n.if, n.solid], [d.x, d.y, 'garrick_at_ford', false]);
  const wm = byId(maps.chapel, 'mirror_wm'), nh = byId(maps.nh_chapel, 'mirror_nh_wm');
  assert.equal(wm.kind, 'mirror'); assert.equal(wm.if, 'mirror_sigil_get'); assert.equal(nh.if, 'mirror_sigil_get');
  assert.deepEqual(wm.to.slice(0, 3), ['nh_chapel', nh.x, nh.y + 1]);
  assert.deepEqual(nh.to.slice(0, 3), ['chapel', wm.x, wm.y + 1]);
  assert.equal(byId(maps.chapel, 'wm_mirror').ifNot, 'mirror_sigil_get');
  assert.equal(byId(maps.hero_home, 'ep2_morning_enter').script, 'ep2_morning');
});

// ------------------------------------------------------------------------------------------------ the Fading Road
test('east_road: the first-fight cut spans column 6, the Mist Wolf pack waits outside its chase radius', () => {
  const m = maps.east_road;
  const t = byId(m, 'first_fight_trig'), wolves = byId(m, 'e_road_mixed');
  assert.equal(t.script, 'east_first_fight');
  assert.deepEqual([wolves.encounter, wolves.move, wolves.sprite], ['road_mixed', 'chase', 'mist_wolf']);
  assert.ok(wolves.x - t.x > 5, 'two tiles outside the chase radius');
  // every cell of the column the party can reach is inside the cut (the south bank across the river is scenery)
  const reach = new Set(walk(m, db).reachable);
  const inT = (x, y) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h;
  for (let y = 0; y < m.ground.length; y++) assert.ok(!reach.has(`${t.x},${y}`) || inT(t.x, y), `column ${t.x} open at row ${y} outside the trigger`);
  assert.ok(m.start.x < t.x);
});

test('east_road: the Fading Stretch is a cairn corridor; every other cell is a fog door back to fog_return', () => {
  const m = maps.east_road;
  const fog = m.events.filter((e) => e.kind === 'fog');
  assert.ok(fog.length > 5);
  for (const f of fog) assert.deepEqual(f.to.slice(0, 3), ['east_road', ...m.marks.fog_return]);
  assert.equal(byId(m, 'fog_return_trig').script, 'fog_loop');
  assert.deepEqual([byId(m, 'fading_trig').x, byId(m, 'fading_trig').y], m.marks.fog_start);
  // with every fog door a wall, the corridor alone still leads from the bank road to the waystation
  const walled = { ...m, events: m.events.map((e) => (e.kind === 'fog' ? { ...e, type: 'object', sprite: 'cairn', text: 'cairn' } : e)) };
  const r = walk(walled, db);
  const set = new Set(r.reachable);
  assert.ok(set.has(m.marks.fog_end.join(',')) && set.has(m.marks.town_gate.join(',')), 'the corridor reaches the waystation and the gate');
  // no bypass: with the corridor removed as well, nothing east of the stretch can be reached from the entry
  const cells = new Set();
  for (const f of fog) for (let i = 0; i < f.w; i++) cells.add(`${f.x + i},${f.y}`);
  const g = buildGrid(m, db);
  let corridor = 0;
  for (let y = 11; y <= 20; y++) for (let x = 20; x <= 39; x++) if (g.code[y][x] === 'none' && !cells.has(`${x},${y}`)) corridor++;
  assert.ok(corridor > 30 && corridor < 120, `corridor size ${corridor}`);
  // the cairns stand beside the path, each within four tiles of the last
  const cairns = m.decor.filter((d) => d.t === 'cairn');
  assert.ok(cairns.length >= 6);
  for (let i = 1; i < cairns.length; i++) {
    const d = Math.abs(cairns[i].x - cairns[i - 1].x) + Math.abs(cairns[i].y - cairns[i - 1].y);
    assert.ok(d <= 6, `cairns ${i - 1} -> ${i} are ${d} apart`);
  }
  assert.deepEqual(m.marks.cairn_first, [cairns[0].x, cairns[0].y]);
  assert.ok(m.ambientFx.some((a) => a.fx === 'mist' && a.area.x <= 20 && a.area.x + a.area.w >= 40));
});

test('east_road fog (W11, CRITIQUE_4 item 4 + PLAYTEST_REVIEW_3 item 9): no road, a fog bank, cairn checkpoints', async () => {
  const { checkpointNear, fogDensityAt } = await import('../../src/world/fog.js');
  const m = maps.east_road;
  const g = buildGrid(m, db);
  // no road through the stretch: not one dirt cell between the bank road and the waystation
  let dirt = 0;
  for (let y = 11; y <= 20; y++) for (let x = 20; x <= 39; x++) if (m.legend[m.ground[y][x]] === 'dirt') dirt++;
  assert.equal(dirt, 0, 'the Fading Stretch has no dirt road');
  const f = m.fog;
  assert.ok(f && f.area.x <= 20 && f.area.x + f.area.w >= 40, 'the fog bank covers x 20..39');
  assert.ok(f.clear[0] >= 3 && f.clear[1] >= 4, 'a clear ring of at least four tiles round the leader (phone)');
  assert.ok(f.cairnLight >= 4.5, 'the next cairn (at most about four tiles on) is always lit');
  // cairns at most four and a half tiles apart in a straight line, each lit from the last
  const cairns = f.cairns;
  for (let i = 1; i < cairns.length; i++) assert.ok(Math.hypot(cairns[i][0] - cairns[i - 1][0], cairns[i][1] - cairns[i - 1][1]) <= 4.5, `cairns ${i - 1} -> ${i}`);
  // checkpoints: on the corridor (never a fog door, never solid), beside a cairn, in path order, none beside a foe
  const fogCells = new Set();
  for (const e of m.events.filter((x) => x.kind === 'fog')) for (let i = 0; i < e.w; i++) fogCells.add(`${e.x + i},${e.y}`);
  const foes = m.events.filter((e) => e.type === 'enemy');
  assert.ok(f.checkpoints.length >= 6);
  for (const c of f.checkpoints) {
    assert.ok(!fogCells.has(`${c.x},${c.y}`) && g.code[c.y][c.x] === 'none', `checkpoint ${c.x},${c.y} is open corridor`);
    assert.ok(cairns.some(([x, y]) => Math.abs(x - c.x) + Math.abs(y - c.y) === 1), `checkpoint ${c.x},${c.y} is beside a cairn`);
    assert.ok(!foes.some((e) => Math.abs(e.x - c.x) <= 1 && Math.abs(e.y - c.y) <= 1), `checkpoint ${c.x},${c.y} is not beside a foe`);
    assert.ok(['up', 'down', 'left', 'right'].includes(c.dir));
    assert.equal(checkpointNear(f, c.x, c.y), c);
  }
  // a miss costs a few tiles: from any fog door, the nearest checkpoint (or fog_return before the first) is close
  const landings = [m.marks.fog_return, ...f.checkpoints.map((c) => [c.x, c.y])];
  let worst = 0;
  for (const cell of fogCells) {
    const [x, y] = cell.split(',').map(Number);
    worst = Math.max(worst, Math.min(...landings.map(([lx, ly]) => Math.abs(lx - x) + Math.abs(ly - y))));
  }
  assert.ok(worst <= 9, `the furthest fog door is ${worst} tiles from a landing`);
  // the density: none round the leader, fog away from it, nothing outside the bank
  const o = { spec: { ...f, density: f.density }, leader: [30 * 16, 15 * 16], lit: [], t: 0 };
  assert.equal(fogDensityAt(30 * 16, 15 * 16, o), 0);
  assert.equal(fogDensityAt(5 * 16, 15 * 16, o), 0);
  let some = 0;
  for (let x = 20; x < 40; x++) if (fogDensityAt(x * 16, 19 * 16, { ...o, leader: [0, 0] }) > 0.05) some++;
  assert.ok(some > 12, 'the bank is foggy away from the leader');
});

test('east_road: the waystation rests and saves, Penny trades, the shore block and the reed island, the exits', () => {
  const m = maps.east_road;
  const fire = byId(m, 'waystation_fire');
  assert.deepEqual([fire.script, fire.safe, fire.rest, fire.sprite], ['waystation_rest', true, true, 'brazier_lit']);
  assert.equal(byId(m, 'penny_e').type, 'npc');
  const heavy = byId(m, 'heavy_shore');
  assert.equal(heavy.heavy, true);
  // the heavy block plugs the causeway to the reed island: without it pushed the chest is out of reach
  const g = buildGrid(m, db);
  assert.equal(g.code[heavy.y - 1][heavy.x - 1] !== 'none' && g.code[heavy.y - 1][heavy.x + 1] !== 'none', true, 'water beside the causeway');
  assert.equal(g.code[heavy.y][heavy.x + 1], 'none', 'room to shove it aside (east)');
  assert.equal(g.code[heavy.y][heavy.x - 1], 'none', 'and a place to stand west of it');
  const exits = m.exits.map((x) => x.to.slice(0, 3));
  assert.deepEqual(exits, [['valley', 58, 16], ['nameless_hollow', ...maps.nameless_hollow.marks.gate_in]]);
  const r = walkOf('east_road');
  for (const c of ['62,16', '1,16']) assert.ok(r.reachable.includes(c), c);
});

// ------------------------------------------------------------------------------------------------ the Hollow
test('nameless_hollow: the fountain and its ring, the square mirror, the ferry, the gate, conditional music and tint', () => {
  const m = maps.nameless_hollow;
  const f = byId(m, 'fountain_obj'), ring = byId(m, 'fountain_trig');
  assert.deepEqual([f.script, f.sprite], ['fountain_check', 'fountain']);
  for (let i = 0; i < 4; i++) assert.ok(f.x + i > ring.x && f.x + i < ring.x + ring.w - 1, 'the ring surrounds the fountain');
  const ferry = byId(m, 'ferry_court');
  assert.equal(ferry.rideIf, 'court_ferry_open');
  assert.deepEqual(ferry.to.slice(0, 3), ['court_f1', maps.court_f1.start.x, maps.court_f1.start.y]);
  const sq = byId(m, 'mirror_warp_sq');
  assert.deepEqual([sq.kind, sq.if], ['mirror', 'mirror_sigil_get']);
  assert.deepEqual([sq.x, sq.y], m.marks.mirror_warp_sq);
  assert.ok(Array.isArray(m.music) && m.music[0].if === 'nh_restored' && m.music[0].id === 'hollowmere');
  assert.ok(Array.isArray(m.lighting.tint) && m.lighting.tint.at(-1).id === 'hollow_dusk');
  // lettered signs and the clock hands only after the restoration, drawn over the buildings (overhead)
  const lettered = m.overhead.filter((o) => /^sign_hollow_|^clock_hands$/.test(o.t));
  assert.ok(lettered.length >= 7 && lettered.every((o) => o.if === 'nh_restored'));
  const out = maps.court_throne.events.find((e) => e.id === 'mirror_exit');
  assert.deepEqual(out.to.slice(0, 3), ['nameless_hollow', ...m.marks.fountain_out]);
});

test('nameless_hollow: every interior door returns to the cell in front of its building, both ways', () => {
  const town = maps.nameless_hollow;
  for (const d of town.events.filter((e) => e.type === 'door' && e.to[0].startsWith('nh_'))) {
    const [mid, x, y] = d.to;
    const back = maps[mid].events.find((e) => e.type === 'door' && e.to[0] === 'nameless_hollow');
    assert.ok(back, `${mid} has a door back`);
    assert.ok(Math.abs(back.to[1] - d.x) <= 1 && back.to[2] === d.y + 1, `${mid} exit lands in front of its door`);
    assert.ok(Math.abs(x - back.x) <= 1 && Math.abs(y - back.y) <= 1, `the town door into ${mid} lands on its exit cell`);
  }
});

test('story marks the scenes walk actors to are walkable and reachable', () => {
  const WALK = {
    nameless_hollow: ['fountain_view', 'meet_elian', 'hall_door', 'pier_end', 'restored_spot', 'gather_anwen', 'gather_lena', 'gather_corin',
      'gather_nico', 'crowd_a', 'crowd_b', 'crowd_c', 'crowd_d', 'fountain_out', 'inn_door', 'chapel_door', 'gate_in', 'restored_elian', 'elian_from'],
    nh_hall: ['hall_entry'], nh_inn: ['inn_bed'], east_road: ['entry', 'fog_start', 'fog_return', 'fog_end', 'town_gate'],
    court_f1: ['start', 'pier', 'stairs_down'], court_f2: ['arrival', 'selves_spot', 'selves_hero', 'selves_mira', 'selves_bram', 'well_return', 'arena'],
    court_f3: ['arrival', 'hub_center', 'font'], court_throne: ['kneel', 'party_stop', 'elian_enter', 'elian_meet', 'fragment_spot'],
    valley: ['east_exit'],
  };
  for (const [id, names] of Object.entries(WALK)) {
    const r = id === 'valley' ? walk(maps.valley, db, { flags: [...EP1_DONE, 'ep2_started'] }) : walkOf(id);
    const free = id === 'court_throne' ? buildGrid(withFlags(maps[id], ['nameless_king_defeated']), db) : null;
    for (const n of names) {
      const k = r.marks.find((x) => x.name === n);
      assert.ok(k, `${id}: mark ${n}`);
      if (free) assert.equal(free.code[k.y][k.x], 'none', `${id}: ${n} free once the King is gone`);
      else assert.ok(k.reached, `${id}: mark ${n} at ${k.x},${k.y} must be reachable`);
    }
  }
});

// ------------------------------------------------------------------------------------------------ the Court
test('the Court: no reachable state is a softlock, and every puzzle starts with nothing lit', () => {
  for (const id of ['court_f1', 'court_f2', 'court_f3']) {
    const r = walkOf(id);
    assert.equal(r.softlocks, 0, `${id} softlocks: ${JSON.stringify(r.softlockSamples)}`);
    assert.deepEqual(r.startLit, [], `${id} start state lights ${r.startLit}`);
  }
});

test('court_f1: Puzzle B, the glass key, the Silverglass Lock across three chambers, the stairs', () => {
  const m = maps.court_f1;
  const r = walkOf('court_f1');
  assert.ok(r.latched.includes('rec_b') && r.latched.includes('rec_lock'), r.log.join('; '));
  assert.ok(reached(r, 'stairs_f2') && reached(r, 'stairs_trig'));
  assert.deepEqual(r.receptorConfigs.rec_b.states, { mir_b: 1 });
  assert.deepEqual(r.receptorConfigs.rec_lock.states, { lens_1: 1, lens_2: 0, lens_3: 0 });
  // the lock's beam really crosses the three chambers: C -> slot -> N -> slot -> E
  const tr = r.traceOf(r.receptorConfigs.rec_lock);
  const cells = new Set(tr.lit);
  for (const c of ['6,13', '11,13', '15,13', '22,13', '22,10', '22,9', '22,7', '25,7']) assert.ok(cells.has(c), `lock beam crosses ${c}`);
  // the start state of Puzzle B splashes on B's west wall beside the passage to the west wing
  const s0 = r.traceOf({}).splashes;
  assert.ok(s0.some((s) => s.x === 12 && s.y === 19 && s.dir === 'left'), JSON.stringify(s0));
  // needs: without the glass key chest the Lens Hall stays shut; without rec_lock the stairs do
  assert.equal(reached(walk(without(m, (e) => e.id === 'chest_key1'), db), 'stairs_f2'), false);
  assert.equal(reached(walk(without(m, (e) => e.id === 'rec_lock'), db), 'stairs_f2'), false);
  assert.equal(reached(walk(without(m, (e) => e.id === 'rec_b'), db), 'chest_key1'), false);
  // the push block sits on the beam row of a three-row corridor: it can always be pushed out of the line
  const b = byId(m, 'block_n'), g = buildGrid(without(m, (e) => e.type === 'block'), db);
  for (let x = 12; x <= 21; x++) assert.ok(g.code[b.y - 1][x] === 'none' && g.code[b.y + 1][x] === 'none', `corridor column ${x} open above and below`);
  // the receptor gates and the locked door use the glass kit
  assert.equal(byId(m, 'gate_b').sprite, 'door_glass'); assert.equal(byId(m, 'door_c').sprite, 'door_glass_key');
  assert.equal(byId(m, 'rec_lock').flag, 'silverglass_lock_lit');
  assert.equal(byId(m, 'chest_key1').flag, 'glass_key_f1');
  assert.ok(byId(m, 'chest_helm').behind === 'pane_d' && byId(m, 'pane_d').breakable);
});

test('court_f2: the beam lays the bridges; the island is never a trap; the Well drops to the Portrait Hall', () => {
  const m = maps.court_f2;
  const r = walkOf('court_f2');
  for (const id of ['chest_key2', 'chest_island', 'portrait_keeper', 'chest_keeper', 'pool_trig', 'door_w', 'selves_trig', 'stairs_f3', 'vex_trig', 'font_f2'])
    assert.ok(reached(r, id), id);
  const bridges = new Set(r.bridgeCells);
  const all = m.overlays.filter((o) => BRIDGE_RE.test(o.t)).map((o) => `${o.x},${o.y}`);
  for (const c of all) assert.ok(bridges.has(c), `bridge cell ${c} can be lit`);
  // every bridge cell sits over the void, and the Well's pits land in the Portrait Hall
  const g = buildGrid({ ...m, overlays: m.overlays.filter((o) => !BRIDGE_RE.test(o.t)) }, db);
  for (const c of all) { const [x, y] = c.split(',').map(Number); assert.equal(g.code[y][x], 'pit', `bridge ${c} over a pit`); }
  assert.deepEqual(m.pitTo.slice(0, 3), ['court_f2', ...m.marks.well_return]);
  // needs: no glass key, no West Wing; no skylight, no East Gallery
  assert.equal(reached(walk(without(m, (e) => e.id === 'chest_key2'), db), 'selves_trig'), false);
  assert.equal(reached(walk(without(m, (e) => e.id === 'beam_n'), db), 'chest_key2'), false);
  // m_e1: one beam, two bridges (east to the Keeper alcove or west to the Island), never both
  const east = r.traceOf({ states: { m_n1: 1, m_e1: 1 } }), west = r.traceOf({ states: { m_n1: 1, m_e1: 0 } });
  assert.ok(new Set(east.lit).has('35,12') && !new Set(east.lit).has('25,12'));
  assert.ok(new Set(west.lit).has('25,12') && !new Set(west.lit).has('35,12'));
  // the Other Selves: the arena trigger is the boss; after the fight the arena mirror leads down, its twin to F1
  assert.equal(byId(m, 'selves_trig').script, 'other_selves');
  assert.equal(byId(m, 'stairs_f3').if, 'other_selves_defeated');
  assert.equal(byId(m, 'mirror_f2_short').if, 'court_f2_done');
  assert.equal(byId(m, 'chest_remembrance').if, 'remembrance_open');
  for (const id of ['portrait_child', 'portrait_keeper', 'portrait_king']) assert.equal(byId(m, id).script, id);
});

test('court_f3: three wings light three vows; the vow door needs all three; the heavy mirror has one socket', () => {
  const m = maps.court_f3;
  const r = walkOf('court_f3');
  assert.deepEqual([...r.latched].sort(), ['rec_belonging', 'rec_courage', 'rec_mercy']);
  assert.ok(r.opened.includes('door_vow'));
  for (const id of ['throne_door', 'feather_obj', 'font_f3', 'chest_crown', 'chest_hollowcrown', 'court_note', 'chest_ledge']) assert.ok(reached(r, id), id);
  assert.equal(r.systems.length, 3, JSON.stringify(r.systems));
  for (const [rec, src] of [['rec_belonging', 'beam_w'], ['rec_mercy', 'beam_e'], ['rec_courage', 'beam_s']]) {
    const cut = walk(without(m, (e) => e.id === src), db, { lantern: true });
    assert.equal(reached(cut, 'throne_door'), false, `the throne door without ${src} (${rec} never lights)`);
    assert.equal(byId(m, rec).target, 'door_vow');
  }
  // Courage: two shoves west put the heavy mirror on the socket under the moon window's column, then it turns
  const h = byId(m, 'mirh_c'), src = byId(m, 'beam_s'), socket = m.overlays.find((o) => o.t === 'inlay_socket');
  assert.equal(h.heavy, true);
  assert.deepEqual([socket.x, socket.y], [src.x, h.y], 'the socket is on the beam line, level with the mirror');
  assert.equal(h.x - socket.x, 2, 'two tiles off the line');
  assert.deepEqual(r.receptorConfigs.rec_courage.positions.mirh_c, [socket.x, socket.y]);
  // the vow door is a three-crystal gate on the hub's north face; the floor's exits are mirrors and the throne door
  assert.equal(byId(m, 'door_vow').sprite, 'door_vow');
  assert.equal(byId(m, 'mirror_f3_short').if, 'court_f3_arrived');
  assert.deepEqual(byId(m, 'throne_door').to.slice(0, 3), ['court_throne', maps.court_throne.start.x, maps.court_throne.start.y]);
  // the east chasm drops to the lower ledge, whose stair climbs back (one way)
  assert.deepEqual(byId(m, 'chasm_e').to.slice(0, 3), ['court_f3', ...m.marks.ledge]);
});

test('court_throne: the King before the great mirror, the trigger across the hall, the way home', () => {
  const m = maps.court_throne;
  const k = byId(m, 'nameless_king');
  assert.deepEqual([k.type, k.sprite, k.dir, k.ifNot], ['actor', 'nameless_king_avatar', 'up', 'nameless_king_defeated']);
  assert.deepEqual([k.x, k.y], m.marks.king);
  const t = byId(m, 'king_trig');
  const g = buildGrid(m, db);
  for (let x = 0; x < g.W; x++) if (g.code[t.y][x] === 'none') assert.ok(x >= t.x && x < t.x + t.w, `row ${t.y} open at ${x} outside the trigger`);
  assert.ok(t.y > k.y + 4);
  const looks = ['great_mirror_whole', 'great_mirror_broken', 'great_mirror_town'].map((id) => byId(m, id));
  assert.deepEqual(looks.map((o) => o.state), [0, 1, 0]);
  assert.equal(byId(m, 'mirror_exit').if, 'aurel_named');
  for (const id of ['aurel_t', 'elian_t']) assert.deepEqual([byId(m, id).if, byId(m, id).ifNot], ['aurel_named', 'nh_restored']);
});

test('Keeper mirror doors come in pairs: each lands in front of its partner, under the same kind of flag', () => {
  const pairs = [['court_f1', 'mirror_f1_sq', 'nameless_hollow', 'mirror_warp_sq'], ['court_f1', 'mirror_f1_f2', 'court_f2', 'mirror_f2_short'],
    ['court_f1', 'mirror_f1_f3', 'court_f3', 'mirror_f3_short'], ['chapel', 'mirror_wm', 'nh_chapel', 'mirror_nh_wm']];
  for (const [ma, a, mb, b] of pairs) {
    const ea = byId(maps[ma], a), eb = byId(maps[mb], b);
    assert.deepEqual(ea.to.slice(0, 3), [mb, eb.x, eb.y + 1], `${a} lands in front of ${b}`);
    assert.deepEqual(eb.to.slice(0, 3), [ma, ea.x, ea.y + 1], `${b} lands in front of ${a}`);
    for (const e of [ea, eb]) { assert.equal(e.kind, 'mirror'); assert.ok(e.if, `${e.id} is flag-gated`); }
  }
});

test('the Episode 2 route is connected: valley -> Fading Road -> Hollow -> ferry -> F1 -> F2 -> F3 -> throne -> fountain', () => {
  const hop = (mid, pred, label) => { const e = maps[mid].events.find(pred) || (maps[mid].exits || []).find(pred); assert.ok(e, `${mid}: ${label}`); return e.to; };
  let to = hop('valley', (e) => e.to && e.to[0] === 'east_road', 'east exit');
  to = hop('east_road', (e) => e.to && e.to[0] === 'nameless_hollow', 'town exit');
  to = hop('nameless_hollow', (e) => e.type === 'ferry', 'ferry');
  assert.equal(to[0], 'court_f1');
  to = hop('court_f1', (e) => e.type === 'door' && e.to[0] === 'court_f2' && e.kind === 'stairs', 'stairs to F2');
  to = hop('court_f2', (e) => e.id === 'stairs_f3', 'arena mirror to F3');
  assert.deepEqual(to.slice(0, 3), ['court_f3', ...maps.court_f3.marks.arrival]);
  to = hop('court_f3', (e) => e.id === 'throne_door', 'throne door');
  to = hop('court_throne', (e) => e.id === 'mirror_exit', 'the way home');
  assert.deepEqual(to.slice(0, 3), ['nameless_hollow', ...maps.nameless_hollow.marks.fountain_out]);
  // every map-to-map target lands on walkable ground (validate checks it); the story's arrival triggers exist
  for (const [mid, id] of [['east_road', 'east_enter'], ['nameless_hollow', 'nh_enter'], ['court_f1', 'court_enter'], ['court_f2', 'f2_enter'], ['court_f3', 'f3_enter']])
    assert.equal(byId(maps[mid], id).on, 'enter');
});
