// Dump the dialogue boxes of chosen scenes (first path through each, plus a realistic flag state) as
// JSON for qa/content/preview_dialogue.py. Usage: node qa/content/_boxes.mjs scene1 scene2 ...
import { scenes as EP1 } from '../../src/data/story/ep1.js';
import { scenes as EP2 } from '../../src/data/story/ep2.js';
import { scenes as EP3, GATE } from '../../src/data/story/ep3.js';

const scenes = { ...EP1, ...EP2, ...EP3 };
GATE.live = true; // preview Episode 3 scenes even though the switch ships off
import { speakerName, NPCS } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

// Flags that make each scene play its main path.
const STATE = {
  wake_up: [], fading_sign: ['intro_done'], mael_intro: ['intro_done'], mira_joins: ['intro_done', 'met_mael'],
  south_gate: ['intro_done', 'met_mael', 'mira_joined'], archive_door: ['bram_joined', 'mira_joined'],
  lantern_get: ['echo_warden_defeated', 'archive_f1_done', 'mira_joined', 'bram_joined', 'lost_bridge_started'],
  quill_reminder: ['lantern_get', 'lost_bridge_started', 'mira_joined', 'bram_joined'],
  hollow_alpha: ['lantern_get', 'lost_bridge_started', 'hollow_found', 'boss_door_open', 'archivore_defeated', 'mira_joined', 'bram_joined'],
  thirteenth_bell: ['archive_f2_done', 'mira_joined', 'bram_joined'],
  archivore: ['boss_door_open', 'mira_joined', 'bram_joined'],
  echo_warden: ['archive_f1_done', 'mira_joined', 'bram_joined'],
  first_fight: ['left_town', 'mira_joined', 'bram_joined'],
  campfire_rest: ['left_town', 'mira_joined', 'bram_joined'],
  return_to_willowmere: ['archivore_defeated', 'mira_joined', 'bram_joined'],
  tess_letters: ['intro_done', 'tess_quest_started', 'tess_letter_3_found', 'mira_joined', 'bram_joined'],
  // Episode 2 (E2-story): a finished Episode 1 plus the beats each scene needs.
  ...Object.fromEntries(Object.entries({
    ep2_morning: [], ep2_mael: [], garrick_crossing: ['ep2_started'], east_first_fight: ['crossing_done'],
    waystation_rest: ['crossing_done'], mere_view: ['crossing_done'], nh_arrival: ['crossing_done'],
    fountain_faces: ['nh_arrived'], elian_hall: ['met_elian'], anwen_register: ['heard_crisis'], tovin_ferry: ['met_anwen'],
    court_crossing: ['court_ferry_open'], mira_memory_1: ['court_f1_arrived'], vex_mirror: ['court_f2_arrived'],
    other_selves: ['court_f1_done', 'court_f2_arrived'], vow_courage: ['court_f2_done'], vow_door: ['vow_belonging', 'vow_mercy', 'vow_courage'],
    nameless_king: ['vow_door_open'], hollowmere_restored: ['aurel_named'], tess_last_route: [],
  }).map(([k, v]) => [k, ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', ...v]])),
};
// Episode 3 (E3-story): a finished Episode 2 plus the beats each scene needs.
const EP2_DONE = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'nh_restored'];
Object.assign(STATE, Object.fromEntries(Object.entries({
  ep3_morning: [], sand_gate: ['ep3_started'], sand_first_fight: ['sand_road_arrived'], pk_arrival: ['sand_gate_open'],
  veyra_square: ['pk_arrived'], ilya_bellhouse: ['met_veyra'], bram_memory_1: ['foundry_f1_arrived'],
  bram_memory_2: ['foundry_f2_arrived'], bellows_specter: ['foundry_f2_arrived'], vex_furnace: ['foundry_f3_arrived'],
  bram_memory_3: ['oath_hand', 'oath_heart', 'oath_home'], cinder_warden: ['bell_gate_open'],
  warden_after: ['cinder_warden_defeated'], first_bell: ['garrick_named'], ep3_ending: ['pk_restored'],
}).map(([k, v]) => [k, [...EP2_DONE, ...v]])));
const PORTRAITS = {};
const out = [];
for (const id of process.argv.slice(2)) {
  const spawnNames = {};
  const { log } = await runOnce(scenes[id], { flags: STATE[id] || ['mira_joined', 'bram_joined'], branchFlags: false });
  for (const e of log) {
    if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
    if (e.op !== 'say') continue;
    const [who, text, opts] = e.args;
    const name = who == null ? '' : (spawnNames[who] || speakerName(who) || who);
    const portrait = opts?.portrait || PORTRAITS[who] || (who && NPCS[who]?.portrait) || null;
    out.push({ scene: id, who, name, portrait, text });
  }
}
process.stdout.write(JSON.stringify(out));
