// The Episode 4 quick start (E4-pack; docs/EPISODE4_PLAN.md 10.3 and 10.4). Pure: no DOM, no engine. Lives in the pack so
// none of it is in the first download; hooks.js exposes it as LQ_DEBUG.newGameEp4 and the pack's title row (title.js,
// E4-scene-ui) calls newGameEp4 after episodes.js pickRunSlot(save) chose the run's own slot. It never writes a save: the
// run's first write is the field's own autosave, to `autosaveSlot`, exactly as Episode 3's quick start does.
//
// The party is the simulator's `ep4_flood_road` loadout (EPISODE4_PLAN 6.6: the `foundry_heart` row plus the First Bell
// Hammer, the Ember Heart and tier 6 gear). tools/sim/ep4.mjs (E4-battle) did not exist when this was written, so the
// members below are the resolved `foundry_heart` row of tools/sim/loadouts.mjs (2026-11-03) with the First Bell Hammer on
// Bram's axe hand and the Ember Heart on the hero's charm; qa/core/ep4_pack.test.mjs holds the two together and switches to
// LOADOUTS.ep4_flood_road the day it exists.
import { createGame, addMember, give, memberMax, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../game/state.js';
import { newMember } from '../party.js';

/** Episode 3 flags a save that saw the Episode 3 credits has: the main line plus the beats on its critical path. */
export const EP3_DONE_FLAGS = ['ep3_started', 'sand_gate_open', 'sand_road_arrived', 'sand_first_fight_done', 'pk_arrived',
  'met_veyra', 'met_ilya', 'foundry_open', 'foundry_entered', 'foundry_f1_done', 'bellows_specter_defeated', 'foundry_f2_done',
  'vex_furnace_met', 'bell_gate_open', 'cinder_warden_defeated', 'garrick_named', 'mara_named', 'first_bell_rung', 'pk_restored',
  'ep3_complete', 'ep3_morning_done', 'saw_slag', 'carters_rested', 'saw_emberpeak', 'saw_memorial', 'forge_relit',
  'foundry_f1_arrived', 'foundry_f2_arrived', 'foundry_f3_arrived', 'lift_wheel_lit', 'lift_wheel_seen', 'bram_memory_1',
  'bram_memory_2', 'bram_memory_3', 'mara_read', 'oath_hand', 'oath_heart', 'oath_home', 'clapper_get', 'leaf_get'];

/** Which loadout the members mirror (tests compare against tools/sim/loadouts.mjs). */
export const EP4_LOADOUT = { source: 'foundry_heart', plus: { bram: { axe: 'first_bell_hammer' }, hero: { charm: 'warden_heart' } } };

/**
 * Lv 17 at 5,600 EXP, every Episode 1 to 3 main flag plus ep3_complete, the three credits counters, the Episode 1 to 3 key
 * items, 2,400 gold, standing at Emberpeak's washout at `dawn_stage` (emberpeak (35, 15), issue #99) so ep4_morning runs
 * (while EP4_LIVE).
 */
export const EP4_START = {
  level: 17, exp: 5600, gold: 2400, map: 'emberpeak', mark: 'dawn_stage', pos: { x: 35, y: 15, dir: 'right' },
  items: { potion: 6, hi_potion: 6, hi_ether: 4, phoenix_feather: 3, silver_salve: 2,
    name_fragment_1: 1, name_fragment_2: 1, name_fragment_3: 1, lantern_of_recall: 1, mirror_sigil: 1 },
  counters: ['credits_rolled', 'credits2_rolled', 'credits3_rolled'],
  members: {
    hero: { weapon: 'sword', equip: { sword: 'lanternheart', axe: 'moonsteel_axe', body: 'silver_mail', head: 'ashsteel_helm', boots: 'cinder_boots', charm: 'warden_heart' }, mastery: { sword: 620, axe: 250 } },
    mira: { weapon: 'staff', equip: { staff: 'founders_rod', bow: 'kept_promise', body: 'mirrorguard_mail', head: 'soot_hood', charm: 'updraft_charm' }, mastery: { staff: 480, bow: 230 } },
    bram: { weapon: 'spear', equip: { spear: 'heartforge_pike', axe: 'first_bell_hammer', body: 'silver_mail', head: 'glass_helm', boots: 'ashwalker_boots' }, mastery: { spear: 620, axe: 250 } },
  },
};

/**
 * A fresh game standing where Episode 4 begins. `o.slot` is the run's own autosave slot (pickRunSlot chooses it; default 0);
 * `o.seed`, `o.pos` as newGameEp3. Pure: writes no save.
 */
export function newGameEp4(heroName = 'Hero', o = {}) {
  const S = EP4_START;
  const g = createGame(heroName, { map: S.map, pos: o.pos || S.pos, seed: o.seed, autosaveSlot: o.slot });
  for (const id of ['mira', 'bram']) addMember(g, id);
  for (const m of g.party) {
    const spec = S.members[m.id];
    m.level = S.level;
    const fresh = newMember(m.id, { level: S.level, name: m.name });
    m.exp = Math.max(fresh.exp, S.exp);
    if (spec) { m.weapon = spec.weapon; m.equip = { ...m.equip, ...spec.equip }; m.mastery = { ...m.mastery, ...spec.mastery }; }
    const s = memberMax(m);
    m.hp = s.hp; m.mp = s.mp; m.fury = 0;
  }
  g.items = {};
  for (const [id, q] of Object.entries(S.items)) give(g, id, q);
  g.gold = S.gold;
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS]) g.flags[f] = true;
  for (const c of S.counters) g.counters[c] = 1;
  g.chapter = 4;
  g.lastSafe = { map: g.map, pos: { ...g.pos } };
  return g;
}
