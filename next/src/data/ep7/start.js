// The Episode 7 quick start (E7-pack; docs/EPISODE7_PLAN.md 10.3 and 10.4). Pure: no DOM, no engine. Lives in the pack so
// none of it is in the first download; hooks.js exposes it as LQ_DEBUG.newGameEp7 and LQ_EP7.start, and the pack's title row
// (title.js, E7-scene-ui) calls LQ_EP7.start after episodes.js pickRunSlot(save) chose the run's own slot. It never writes a
// save: the run's first write is the field's own autosave, to `autosaveSlot`, exactly as Episodes 3 to 6 do.
//
// The party: tools/sim/ep7.mjs (E7-battle, wave 7a) was not in this checkout when this was written, so plan 10.4's fallback
// stands: the simulator's `ep6_obs_eyrie` loadout plus the Scribe's Quill (scribe_quill, the Storm Scribe's guaranteed drop) on
// Mira's charm slot and the Kestrel's Wings (kestrel_wings, Aeris's truth-path gift: told_aeris) on the hero's. qa/core/
// ep7_pack.test.mjs holds the two equal to LOADOUTS.ep7_white_road once that loadout exists, and to this fallback until then.
// The bag is plan 10.4's (ember_tea is E7-battle's item). The items are Episode 6 pack items: build the game after the ep6 pack
// has registered (hooks.js does), or the stats are computed without them.
import { createGame, addMember, give, memberMax, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../game/state.js';
import { newMember } from '../party.js';
import { EP3_DONE_FLAGS } from '../ep4/start.js';
import { EP4_DONE_FLAGS } from '../ep5/start.js';
import { EP5_DONE_FLAGS } from '../ep6/start.js';

/**
 * Episode 6 flags a save that saw the Episode 6 credits has: the main line plus the beats on its critical path, the truth path
 * on the spire (told_aeris: the path that gives the Kestrel's Wings) and Piri's Dead Letters (letters_done: the path that gives
 * white_road_letter, which Episode 7 carries north). The other side stories are left undone; so is the answer on the Airstair
 * (mira_told / mira_spared), which no Episode 7 line reads.
 */
export const EP6_DONE_FLAGS = ['ep6_started', 'ep6_boarded', 'airstair_arrived', 'airstair_fight_done', 'zephyr_arrived', 'met_aeris',
  'charts_seen', 'anchor_learned', 'windward_pass', 'obs_entered', 'obs_f1_done', 'vex_relay_met', 'engine_defeated', 'obs_f2_done',
  'aeris_came', 'vex_held', 'asker_known', 'pippa_found', 'scribe_door_open', 'scribe_defeated', 'wind_script_restored',
  'fragment6_get', 'compass_restored', 'library_reached', 'first_page_read', 'isles_restored', 'pippa_home', 'ep6_complete',
  'ep6_morning_done', 'mira_asked', 'saw_gust', 'saw_isles', 'obs_f1_arrived', 'obs_f2_arrived', 'obs_f3_arrived', 'aeris_memory_1',
  'aeris_memory_2', 'pledge_anchor', 'pledge_listen', 'pledge_return', 'compass_key_found', 'sixth_list_get', 'told_aeris',
  'letters_started', 'letter_1_found', 'letter_2_found', 'letter_3_found', 'letters_done', 'white_road_letter_get',
  'engine_tried', 'scribe_tried'];

/** Which loadout the members mirror (tests compare against tools/sim): plan 10.4's fallback until `ep7_white_road` exists. */
export const EP7_LOADOUT = { source: 'ep6_obs_eyrie', plus: { hero: { charm: 'kestrel_wings' }, mira: { charm: 'scribe_quill' } }, wanted: 'ep7_white_road' };

/**
 * Lv 28 at 17,900 EXP, every Episode 1 to 6 main flag plus ep6_complete, compass_restored, isles_restored and
 * white_road_letter_get, the six credits counters, the Episode 1 to 6 key items and the letter, 4,000 gold, in the Cloudhouse
 * Inn at `inn_bed` (ep6_zl_inn (17, 7)) so ep7_morning runs there (while EP7_LIVE) and stages the morning in the Chart Room.
 */
export const EP7_START = {
  level: 28, exp: 17900, gold: 4000, map: 'ep6_zl_inn', mark: 'inn_bed', pos: { x: 17, y: 7, dir: 'down' },
  items: { potion: 6, hi_potion: 8, hi_ether: 6, phoenix_feather: 3, silver_salve: 3, ember_tea: 2,
    name_fragment_1: 1, name_fragment_2: 1, name_fragment_3: 1, name_fragment_4: 1, name_fragment_5: 1, name_fragment_6: 1,
    lantern_of_recall: 1, mirror_sigil: 1, sky_compass: 1, white_road_letter: 1 },
  counters: ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled', 'credits5_rolled', 'credits6_rolled'],
  members: {
    hero: { weapon: 'sword', equip: { sword: 'galewing_sword', axe: 'moonsteel_axe', body: 'skysteel_mail', head: 'sunplate_helm', boots: 'cinder_boots', charm: 'kestrel_wings' }, mastery: { sword: 1160, axe: 390 } },
    mira: { weapon: 'staff', equip: { staff: 'compass_rod', bow: 'kept_promise', body: 'windweave_robe', head: 'soot_hood', charm: 'scribe_quill', boots: 'nomad_wraps' }, mastery: { staff: 890, bow: 370 } },
    bram: { weapon: 'spear', equip: { spear: 'tidewarden_trident', axe: 'first_bell_hammer', body: 'sunplate_mail', head: 'glass_helm', boots: 'skyhand_boots', charm: 'caravan_compass' }, mastery: { spear: 1160, axe: 390 } },
  },
};

/**
 * A fresh game standing where Episode 7 begins. `o.slot` is the run's own autosave slot (pickRunSlot chooses it; default 0);
 * `o.seed`, `o.pos` as newGameEp6. Pure: writes no save.
 */
export function newGameEp7(heroName = 'Hero', o = {}) {
  const S = EP7_START;
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
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, ...EP3_DONE_FLAGS, ...EP4_DONE_FLAGS, ...EP5_DONE_FLAGS, ...EP6_DONE_FLAGS]) g.flags[f] = true;
  for (const c of S.counters) g.counters[c] = 1;
  g.chapter = 7;
  g.lastSafe = { map: g.map, pos: { ...g.pos } };
  return g;
}
