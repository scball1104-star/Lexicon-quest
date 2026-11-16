// E8-fixes: two reachability checks over the Episode 8 maps, in pure node (the mapcheck walk, pop-up books included).
//   1. No scene leaves a record standing where it takes the way: every Episode 8 story scene is played in story order on one flag
//      set (the content harness, choices 0, battles won); the records it spawned and did not despawn are put on the map, with the
//      flags the scene leaves, where its log last moved them. None may stand on a door, a step trigger, an exit or a map NPC, and
//      every event the hero could reach from where the scene left them must still be reachable with the records there (Nox on
//      nox_gate, nox_key and nox_index, the First Keeper on the Index door, vex_k under the vex8 NPC: the review's findings).
//   2. A post-game save reaches every book, chest and inspect on every Episode 8 map (an object with no text and no script is
//      art, not an inspect).
// Its own file: the map registries are memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import { register as registerMaps, EP8_MAP_IDS } from '../../src/data/ep8/maps.js';
import { register as registerEp8 } from '../../src/data/ep8/index.js';
import { scenes, GATE, MAIN_PATH, CHAINED, STORY_IDS } from '../../src/data/ep8/story.js';
import { EP8_NPCS } from '../../src/data/ep8/npcs.js';
import { EP8_FLAGS, EP8_TOLL_FLAGS } from '../../src/data/ep8/flags.js';
import { newGameEp8 } from '../../src/data/ep8/start.js';
import { loadDb, walk, present, eventCells } from '../../tools/maps/mapcheck.mjs';
import { runOnce } from '../content/_harness.mjs';

const PARTY = new Set(['hero', 'mira', 'bram']);
const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const MAPS = [...EP8_MAP_IDS, 'ep7_ph_watch', 'ep7_stillheart', 'hero_home'];
// flags no scene sets on the main path (a chest, the side stories' finds): added just before the scene that needs them
const BEFORE = { the_name: ['ink_key_found'], drift_done: ['drift_1_found', 'drift_2_found', 'drift_3_found'] };
// scenes no event or talk entry names: testimony_ione is chained by concordance_start (Ione's Talk replays it)
const CHAIN_MAP = { testimony_ione: 'ep8_scriptorium' };
// one of each pair of exclusive answers (the other is what choice 0 takes)
const OTHER = ['afraid_no', 'spared_elowen', 'answered_page', 'ending_choose', 'spared_hazel'];

async function setup() {
  await registerMaps();
  await registerEp8();
  const g = newGameEp8('Arden');
  return Object.keys(g.flags).filter((f) => g.flags[f] && !['ep8_started', 'ep8_morning_done'].includes(f));
}

/** scene id -> the map whose event or NPC talk entry starts it (the first in MAPS order). */
function sceneMaps() {
  const out = {};
  for (const id of MAPS) for (const e of peekMap(id).events || []) if (e.script && !(e.script in out)) out[e.script] = id;
  for (const n of Object.values(EP8_NPCS)) for (const t of n.talk || []) if (t.scene && !(t.scene in out)) out[t.scene] = n.map;
  return out;
}
/** A mark, an event id or a record already placed, as a cell of `map`; null for anything else. */
function cellOf(map, name, pos) {
  if (Array.isArray(name)) return [name[0], name[1]];
  if (map.marks && map.marks[name]) return map.marks[name].slice(0, 2);
  const ev = (map.events || []).find((e) => e.id === name);
  if (ev) return [ev.x, ev.y];
  return pos.has(name) ? pos.get(name) : null;
}
/** The records a scene's log leaves standing ({ id -> [x, y] }) and where it leaves the hero. */
function aftermath(log, map) {
  const pos = new Map();
  let hero = null;
  for (const { op, args } of log) {
    if (op === 'spawn') { const o = args[1] || {}; pos.set(args[0], o.at != null ? cellOf(map, o.at, pos) : [o.x, o.y]); }
    else if (op === 'despawn') pos.delete(args[0]);
    else if (op === 'warp') { pos.clear(); hero = null; }
    else if (op === 'walk') {
      const [id, to] = args;
      if (id === 'hero' && typeof to === 'string') hero = cellOf(map, to, pos) || hero;
      if (!pos.has(id) || !pos.get(id)) continue;
      if (Array.isArray(to) && to.every((d) => STEP[d])) {
        let [x, y] = pos.get(id);
        for (const d of to) { x += STEP[d][0]; y += STEP[d][1]; }
        pos.set(id, [x, y]);
      } else if (typeof to === 'string' && !PARTY.has(to) && !pos.has(to)) pos.set(id, cellOf(map, to, pos));
      else pos.set(id, null);   // walked up to someone: beside them, cell unknown
    }
  }
  const warped = log.some((e) => e.op === 'warp');
  return { left: warped ? new Map() : pos, hero };
}

test('no Episode 8 scene leaves a record standing on a door, a trigger, an exit or an NPC, or between the hero and anything', async () => {
  const was = GATE.live;
  GATE.live = true;
  try {
    const db = await loadDb();
    const set = new Set(await setup());
    const where = sceneMaps();
    const order = [...MAIN_PATH, ...STORY_IDS.filter((id) => !MAIN_PATH.includes(id) && !CHAINED.includes(id))];
    const problems = [];
    let checked = 0;
    for (const id of order) {
      for (const f of BEFORE[id] || []) set.add(f);
      const mapId = where[id] || CHAIN_MAP[id];
      assert.ok(mapId, `${id}: a map starts it`);
      const map = peekMap(mapId);
      const r = await runOnce(scenes[id], { set, branchFlags: false, mapId });
      const ran = r.log.some((e) => e.op === 'lockInput');
      if (MAIN_PATH.includes(id)) assert.ok(ran, `${id} runs in story order`);
      else if (!ran) continue;   // a side scene another one chained (testimony_ione) already ran
      const { left, hero } = aftermath(r.log, map);
      if (!left.size) continue;
      checked++;
      for (const [rec, at] of left) {
        assert.ok(at, `${id}: ${rec} is left where the test can place it`);
        const k = `${at[0]},${at[1]}`;
        // never on a door, a step trigger, an exit cell or a map NPC that the flags show
        for (const e of (map.events || []).filter((ev) => present(ev, set))) {
          if (e.id === rec) continue;   // a spawn takes the place of the map NPC of its own id (cutscene.js spawn)
          const stand = e.type === 'door' || e.type === 'npc' || e.type === 'actor' || (e.type === 'trigger' && e.on !== 'enter');
          if (stand && eventCells(e).some(([x, y]) => `${x},${y}` === k)) problems.push(`${id}: ${rec} left on ${e.type} ${e.id} (${k}) on ${mapId}`);
        }
        for (const ex of map.exits || []) {
          for (let j = 0; j < (ex.h || 1); j++) for (let i = 0; i < (ex.w || 1); i++) if (`${ex.x + i},${ex.y + j}` === k) problems.push(`${id}: ${rec} left on an exit (${k})`);
        }
      }
      // the hero's reach from where the scene leaves them, with and without the records on the map
      const start = hero || (map.marks && map.marks.start) || (map.start && [map.start.x, map.start.y]);
      const opts = { flags: [...set], start, lantern: true };
      const bare = walk(map, db, opts);
      const solid = [...left].map(([rec, [x, y]]) => ({ id: `left_${rec}`, type: 'npc', x, y }));
      const withThem = walk({ ...map, events: [...map.events, ...solid] }, db, opts);
      const had = new Set(bare.events.filter((e) => e.reached).map((e) => e.id));
      const lost = withThem.events.filter((e) => !e.reached && had.has(e.id) && !e.id.startsWith('left_')).map((e) => `${e.type} ${e.id}`);
      if (lost.length) problems.push(`${id}: ${[...left.keys()].join(', ')} cut off ${lost.join(', ')} on ${mapId}`);
    }
    assert.ok(checked >= 10, `${checked} scenes left records to check`);
    assert.deepEqual(problems, []);
  } finally { GATE.live = was; }
});

test('a post-game save reaches every book, chest and inspect on every Episode 8 map', async () => {
  await setup();
  const db = await loadDb();
  const post = [...Object.keys(EP8_FLAGS), ...EP8_TOLL_FLAGS].filter((f) => !OTHER.includes(f));
  const unreached = [];
  for (const id of EP8_MAP_IDS) {
    const map = peekMap(id);
    const r = walk(map, db, { flags: post, lantern: true });
    assert.ok(!r.error, `${id}: ${r.error}`);
    const byId = new Map(map.events.map((e) => [e.id, e]));
    for (const e of r.events) {
      const ev = byId.get(e.id);
      const inspect = ev.type === 'sign' || ev.type === 'book' || ev.type === 'chest' || ev.type === 'font'
        || (ev.type === 'object' && (ev.text || ev.script));
      if (inspect && !e.reached) unreached.push(`${id} ${ev.type} ${ev.id} (${ev.x},${ev.y})`);
    }
  }
  assert.deepEqual(unreached, []);
});
