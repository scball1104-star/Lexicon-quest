// The Episode 6 quick start (E6-pack; docs/EPISODE6_PLAN.md 10.3 and 10.4). Pure: no DOM, no engine. Lives in the pack so
// none of it is in the first download; hooks.js exposes it as LQ_DEBUG.newGameEp6 and LQ_EP6.start, and the pack's title row
// (title.js, E6-scene-ui) calls LQ_EP6.start after episodes.js pickRunSlot(save) chose the run's own slot. It never writes a
// save: the run's first write is the field's own autosave, to `autosaveSlot`, exactly as Episodes 3 to 5 do.
//
// The party is the simulator's `ep6_airstair` loadout (tools/sim/ep6.mjs, E6-battle): the `ep5_lab_oracle` loadout plus the
// Oracle's Mask (oracle_mask) on Mira's charm slot, Sel's Caravan Compass (caravan_compass, the truth-path gift: star_restored)
// on Bram's, and two tier 10 pieces; qa/core/ep6_pack.test.mjs holds the two equal. The bag is plan 10.4's, not the
// simulator's. The items are Episode 5 pack items: build the game after the ep5 pack has registered (hooks.js does), or the
// stats are computed without them.
import { createGame, addMember, give, memberMax, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../game/state.js';
import { newMember } from '../party.js';
import { EP3_DONE_FLAGS } from '../ep4/start.js';
import { EP4_DONE_FLAGS } from '../ep5/start.js';

/**
 * Episode 5 flags a save that saw the Episode 5 credits has: the main line plus the beats on its critical path, and the truth
 * path in the Gallery (star_restored: the path that gives the Caravan Compass). Side stories are left undone; so is the
 * answer at the bow (bram_told / bram_spared), which no Episode 6 line reads.
 */
export const EP5_DONE_FLAGS = ['ep5_started', 'ship_boarded', 'ship_first_fight_done', 'road_landed', 'haven_arrived', 'met_sel',
  'star_reading_done', 'sky_learned', 'gnomon_get', 'lab_entered', 'lab_f1_done', 'knight_defeated', 'lab_f2_done',
  'vex_gallery_met', 'sel_walked_in', 'oracle_door_open', 'oracle_defeated', 'chart_restored', 'fragment5_get',
  'roads_returned', 'haven_restored', 'ep5_complete', 'ep5_morning_done', 'ship_arrived', 'bram_asked', 'saw_haven',
  'lab_f1_arrived', 'lab_f2_arrived', 'lab_f3_arrived', 'sel_memory_1', 'sel_memory_2', 'sel_memory_3', 'landing_shelter',
  'landing_truth', 'landing_return', 'sun_key_found', 'fifth_list_get', 'star_restored', 'knight_tried', 'oracle_tried'];

/** Which loadout the members mirror (tests compare against tools/sim). */
export const EP6_LOADOUT = { source: 'ep6_airstair' };

/**
 * Lv 25 at 13,300 EXP, every Episode 1 to 5 main flag plus ep5_complete, star_restored and sel_walked_in, the five credits
 * counters, the Episode 1 to 5 key items, 3,600 gold, in the Armillary Tower at night at `obs_stage6` (ep5_sh_observatory
 * (7, 8), issue #99) so ep6_morning runs (while EP6_LIVE).
 */
export const EP6_START = {
  level: 25, exp: 13300, gold: 3600, map: 'ep5_sh_observatory', mark: 'obs_stage6', pos: { x: 7, y: 8, dir: 'up' },
  items: { potion: 6, hi_potion: 8, hi_ether: 6, phoenix_feather: 3, silver_salve: 3, hourglass_sand: 2,
    name_fragment_1: 1, name_fragment_2: 1, name_fragment_3: 1, name_fragment_4: 1, name_fragment_5: 1, lantern_of_recall: 1,
    mirror_sigil: 1 },
  counters: ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled', 'credits5_rolled'],
  members: {
    hero: { weapon: 'sword', equip: { sword: 'copperwind_sword', axe: 'moonsteel_axe', body: 'dunewalker_mail', head: 'sunplate_helm', boots: 'cinder_boots', charm: 'horizon_glass' }, mastery: { sword: 1000, axe: 350 } },
    mira: { weapon: 'staff', equip: { staff: 'armillary_rod', bow: 'kept_promise', body: 'starweave_robe', head: 'soot_hood', charm: 'oracle_mask', boots: 'nomad_wraps' }, mastery: { staff: 770, bow: 330 } },
    bram: { weapon: 'spear', equip: { spear: 'tidewarden_trident', axe: 'first_bell_hammer', body: 'sunplate_mail', head: 'glass_helm', boots: 'tidewalker_boots', charm: 'caravan_compass' }, mastery: { spear: 1000, axe: 350 } },
  },
};

/**
 * A fresh game standing where Episode 6 begins. `o.slot` is the run's own autosave slot (pickRunSlot chooses it; default 0);
 * `o.seed`, `o.pos` as newGameEp5. Pure: writes no save.
 */
export function newGameEp6(heroName = 'Hero', o = {}) {
  const S = EP6_START;
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
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, ...EP5_DONE_FLAGS]) g.flags[f] = true;
  for (const c of S.counters) g.counters[c] = 1;
  g.chapter = 6;
  g.lastSafe = { map: g.map, pos: { ...g.pos } };
  return g;
}
