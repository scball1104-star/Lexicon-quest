// The Episode 5 quick start (E5-pack; docs/EPISODE5_PLAN.md 10.3 and 10.4). Pure: no DOM, no engine. Lives in the pack so
// none of it is in the first download; hooks.js exposes it as LQ_DEBUG.newGameEp5 and LQ_EP5.start, and the pack's title row
// (title.js, E5-scene-ui) calls LQ_EP5.start after episodes.js pickRunSlot(save) chose the run's own slot. It never writes a
// save: the run's first write is the field's own autosave, to `autosaveSlot`, exactly as Episodes 3 and 4 do.
//
// The party is the simulator's `ep4_keep_crown` loadout (tools/sim/ep4.mjs) plus The Broken Seal (regents_seal) on Bram's free
// charm slot and the Tidewarden's Trident (Lyra's truth-path gift) on Bram's spear hand. The simulator's `ep5_ship` loadout
// (tools/sim/ep5.mjs, E5-battle) did not exist when this was written; qa/core/ep5_pack.test.mjs holds the two together and
// switches to LOADOUTS.ep5_ship the day it exists. The items are Episode 4 pack items: build the game after the ep4 pack has
// registered (hooks.js does), or the stats are computed without them.
import { createGame, addMember, give, memberMax, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../game/state.js';
import { newMember } from '../party.js';
import { EP3_DONE_FLAGS } from '../ep4/start.js';

/**
 * Episode 4 flags a save that saw the Episode 4 credits has: the main line plus the beats on its critical path, and the
 * truth path in the Regent's Hall (lyra_truth: the path that gives the Trident). Side stories are left undone.
 */
export const EP4_DONE_FLAGS = ['ep4_started', 'east_road_open', 'flood_road_arrived', 'flood_first_fight_done', 'vw_arrived',
  'met_regent', 'met_joss', 'keep_ferry_open', 'keep_entered', 'keep_f1_done', 'barrister_defeated', 'keep_f2_done',
  'vex_archive_met', 'petition_gate_open', 'hero_signed', 'paper_regent_defeated', 'lyra_named', 'charter_restored',
  'tide_bell_rung', 'vw_restored', 'ep4_complete', 'ep4_morning_done', 'saw_flood_lane', 'ferry_rested', 'saw_valewyn',
  'saw_statue', 'keep_f1_arrived', 'keep_f2_arrived', 'keep_f3_arrived', 'lyra_memory_1', 'lyra_memory_2', 'lyra_memory_3',
  'principle_voice', 'principle_truth', 'principle_mercy', 'seal_key_found', 'fragment4_get', 'lyra_truth', 'tidegate_open',
  'barrister_tried', 'paper_regent_tried'];

/** Which loadout the members mirror (tests compare against tools/sim). */
export const EP5_LOADOUT = { source: 'ep4_keep_crown', plus: { bram: { spear: 'tidewarden_trident', charm: 'regents_seal' } } };

/**
 * Lv 21 at 8,900 EXP, every Episode 1 to 4 main flag plus ep4_complete and lyra_named, the four credits counters, the
 * Episode 1 to 4 key items, 3,200 gold, aboard Yara's ship at night at `deck_start` (ep5_ship (5, 7), issue #99) so
 * ep5_morning runs (while EP5_LIVE).
 */
export const EP5_START = {
  level: 21, exp: 8900, gold: 3200, map: 'ep5_ship', mark: 'deck_start', pos: { x: 5, y: 7, dir: 'right' },
  items: { potion: 6, hi_potion: 8, hi_ether: 5, phoenix_feather: 3, silver_salve: 3,
    name_fragment_1: 1, name_fragment_2: 1, name_fragment_3: 1, name_fragment_4: 1, lantern_of_recall: 1, mirror_sigil: 1 },
  counters: ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled'],
  members: {
    hero: { weapon: 'sword', equip: { sword: 'lanternheart', axe: 'moonsteel_axe', body: 'silver_mail', head: 'riverguard_helm', boots: 'cinder_boots', charm: 'warden_heart' }, mastery: { sword: 800, axe: 300 } },
    mira: { weapon: 'staff', equip: { staff: 'charter_rod', bow: 'kept_promise', body: 'scribes_robe', head: 'soot_hood', charm: 'barristers_quill' }, mastery: { staff: 620, bow: 280 } },
    bram: { weapon: 'spear', equip: { spear: 'tidewarden_trident', axe: 'first_bell_hammer', body: 'silver_mail', head: 'glass_helm', boots: 'tidewalker_boots', charm: 'regents_seal' }, mastery: { spear: 800, axe: 300 } },
  },
};

/**
 * A fresh game standing where Episode 5 begins. `o.slot` is the run's own autosave slot (pickRunSlot chooses it; default 0);
 * `o.seed`, `o.pos` as newGameEp4. Pure: writes no save.
 */
export function newGameEp5(heroName = 'Hero', o = {}) {
  const S = EP5_START;
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
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS]) g.flags[f] = true;
  for (const c of S.counters) g.counters[c] = 1;
  g.chapter = 5;
  g.lastSafe = { map: g.map, pos: { ...g.pos } };
  return g;
}
