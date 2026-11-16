// The Episode 8 quick start (E8-pack; docs/EPISODE8_PLAN.md 10.3 and 10.4). Pure: no DOM, no engine. Lives in the pack so none
// of it is in the first download; hooks.js exposes it as LQ_DEBUG.newGameEp8 and LQ_EP8.start, and the pack's title row
// (title.js, E8-scene-ui) calls LQ_EP8.start after episodes.js pickRunSlot(save) chose the run's own slot. It never writes a
// save: the run's first write is the field's own autosave, to `autosaveSlot`, exactly as Episodes 3 to 7 do.
//
// The party: tools/sim/ep8.mjs (E8-battle, wave 8a, beside this agent) was not in this checkout when this was written, so plan
// 6.6's recipe for `ep8_stair` stands as the fallback: the simulator's `ep7_stillheart` loadout plus the Stillheart Shard
// (stillheart_shard, the White Phantom's guaranteed drop) on Mira's charm slot and one Nox gift, the truth path's Open Gate
// (open_gate, told_nox), on the hero's. qa/core/ep8_pack.test.mjs holds the members equal to LOADOUTS.ep8_stair once that
// loadout exists, and to this fallback until then. The bag is plan 10.4's (fresh_ink is E8-battle's item). The items are
// Episode 7 pack items: build the game after the ep7 pack has registered (hooks.js does), or the stats miss them.
import { createGame, addMember, give, memberMax, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../game/state.js';
import { newMember } from '../party.js';
import { EP3_DONE_FLAGS } from '../ep4/start.js';
import { EP4_DONE_FLAGS } from '../ep5/start.js';
import { EP5_DONE_FLAGS } from '../ep6/start.js';
import { EP6_DONE_FLAGS } from '../ep7/start.js';

/**
 * Episode 7 flags a save that saw the Episode 7 credits has: the main line plus the beats on its critical path (src/data/ep7/
 * flags.js), with the truth side of each Episode 7 pair: told_vex at the Traveler's Wall ("Half of it") and told_nox in the
 * Sanctum ("No", the path that gives the Open Gate). The side stories (the Hearth, the Reliquary, Torr's streets) are left
 * undone, so the witness count in `last_page` reads them as not done.
 */
export const EP7_DONE_FLAGS = ['ep7_started', 'ep7_boarded', 'road_arrived', 'vex_carved', 'road_fight_done', 'call_learned', 'saw_sevens',
  'saw_palehaven', 'palehaven_arrived', 'met_keeper', 'keeper_told', 'vault_open', 'vault_entered', 'stillheart_key_found', 'vault_f1_done',
  'bell_found', 'lantern_defeated', 'vault_f2_done', 'keeper_came', 'stillheart_open', 'phantom_defeated', 'stillheart_restored',
  'fragment7_get', 'seventh_list_get', 'page_whole', 'nox_named', 'marten_named', 'doors_reopened', 'letter_sent', 'vex_name_whole',
  'ep7_complete', 'ep7_morning_done', 'valewyn_list_get', 'first_stone_read', 'vault_f1_arrived', 'vault_f2_arrived', 'vault_f3_arrived',
  'keeper_memory_1', 'keeper_memory_2', 'keeper_memory_3', 'told_vex', 'told_nox', 'lantern_tried', 'phantom_tried'];

/** Which loadout the members mirror (tests compare against tools/sim): plan 6.6's recipe until `ep8_stair` exists. */
export const EP8_LOADOUT = { source: 'ep7_stillheart', plus: { hero: { charm: 'open_gate' }, mira: { charm: 'stillheart_shard' } }, wanted: 'ep8_stair' };

/**
 * Lv 31 at 22,200 EXP, every Episode 1 to 7 main flag plus ep7_complete, nox_named, doors_reopened, vex_name_whole and
 * page_whole, the seven credits counters, the Episode 1 to 7 key items, 4,300 gold, in the Keeper's Watch at `watch_cot`
 * (ep7_ph_watch (14, 5)) so ep8_morning runs there (while EP8_LIVE). The skill `answer` (Episode 4's) is learned by its own
 * rule; `read_aloud` is not (read_learned unset).
 */
export const EP8_START = {
  level: 31, exp: 22200, gold: 4300, map: 'ep7_ph_watch', mark: 'watch_cot', pos: { x: 14, y: 5, dir: 'down' },
  items: { potion: 6, hi_potion: 8, hi_ether: 6, phoenix_feather: 3, silver_salve: 3, fresh_ink: 2,
    name_fragment_1: 1, name_fragment_2: 1, name_fragment_3: 1, name_fragment_4: 1, name_fragment_5: 1, name_fragment_6: 1,
    name_fragment_7: 1, lantern_of_recall: 1, mirror_sigil: 1, sky_compass: 1 },
  counters: ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled', 'credits5_rolled', 'credits6_rolled', 'credits7_rolled'],
  members: {
    hero: { weapon: 'sword', equip: { sword: 'iceglass_sword', axe: 'moonsteel_axe', body: 'rimeplate_mail', head: 'sunplate_helm', boots: 'cinder_boots', charm: 'open_gate' }, mastery: { sword: 1400, axe: 450 } },
    mira: { weapon: 'staff', equip: { staff: 'aurora_staff', bow: 'kept_promise', body: 'snowveil_robe', head: 'soot_hood', charm: 'stillheart_shard', boots: 'nomad_wraps' }, mastery: { staff: 1070, bow: 430 } },
    bram: { weapon: 'spear', equip: { spear: 'tidewarden_trident', axe: 'first_bell_hammer', body: 'stormplate_mail', head: 'glass_helm', boots: 'winterwatch_boots', charm: 'borrowed_flame' }, mastery: { spear: 1400, axe: 450 } },
  },
};

/**
 * A fresh game standing where Episode 8 begins. `o.slot` is the run's own autosave slot (pickRunSlot chooses it; default 0);
 * `o.seed`, `o.pos` as newGameEp7. Pure: writes no save.
 */
export function newGameEp8(heroName = 'Hero', o = {}) {
  const S = EP8_START;
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
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, ...EP5_DONE_FLAGS, ...EP6_DONE_FLAGS, ...EP7_DONE_FLAGS]) g.flags[f] = true;
  for (const c of S.counters) g.counters[c] = 1;
  g.chapter = 8;
  g.lastSafe = { map: g.map, pos: { ...g.pos } };
  return g;
}
