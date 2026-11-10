// Dump the dialogue boxes of chosen Episode 6 scenes (first path, a realistic flag state) as JSON for
// qa/content/ep6_preview.py. Not a test (run.mjs runs only *.test.mjs). Usage: node qa/content/ep6_boxes.mjs id1 id2 ...
import { scenes, GATE } from '../../src/data/ep6/story.js';
import { register as regEp5Npcs } from '../../src/data/ep5/npcs.js';
import { register as regNpcs, EP6_NPCS } from '../../src/data/ep6/npcs.js';
import { speakerName } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

GATE.live = true;
regEp5Npcs();
regNpcs();
export const EP5_DONE = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'nh_restored',
  'ep3_started', 'pk_restored', 'ep3_complete', 'ep4_started', 'vw_restored', 'ep4_complete', 'ep5_started', 'haven_restored', 'ep5_complete'];
const PORTRAIT = { vex_k: 'silver_rogue', scribe: 'scribe', scribe_v: 'scribe', mira: 'mira', bram: 'bram' };
// Flags that make each scene play its main path (the truth answers where a choice is read later).
export const STATE = {
  ep6_morning: [], ep6_board: ['ep6_started'], airstair_foot: ['ep6_boarded'], mira_asks: ['airstair_arrived'],
  airstair_fight: ['mira_asked'], first_gust: ['airstair_arrived'], isles_view: ['airstair_arrived'], zephyr_arrival: ['airstair_arrived'],
  liora_dock: ['zephyr_arrived'], meet_aeris: ['zephyr_arrived'], chart_room: ['met_aeris'], anchor_lesson: ['charts_seen'],
  east_gate: ['anchor_learned'], obs_f1_arrival: ['windward_pass'], aeris_memory_1: ['obs_f1_arrived'], obs_f2_arrival: ['obs_f1_done'],
  aeris_memory_2: ['obs_f2_arrived'], vex_relay: ['obs_f2_arrived'], gale_engine: ['obs_f2_arrived'], obs_f3_arrival: ['obs_f2_done'],
  pledge_anchor: ['aeris_came'], pledge_listen: ['pledge_anchor'], vex_falls: ['pledge_listen'], pledge_return: ['pledge_listen'],
  fifth_voice: ['pledge_return'], scribe: ['scribe_door_open'], scribe_after: ['scribe_defeated', 'pippa_found'],
  cloud_library: ['compass_restored', 'mira_told', 'told_aeris'], isles_return: ['library_reached', 'told_aeris'], ep6_ending: ['isles_restored'],
  beacon_start: ['charts_seen'], letters_start: ['zephyr_arrived'],
};
if (process.argv[1] && process.argv[1].endsWith('ep6_boxes.mjs')) {
  const out = [];
  for (const id of process.argv.slice(2)) {
    const spawnNames = {};
    const { log } = await runOnce(scenes[id], { flags: [...EP5_DONE, ...(STATE[id] || [])], branchFlags: false });
    for (const e of log) {
      if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
      if (e.op !== 'say') continue;
      const [who, text, opts] = e.args;
      const name = who == null ? '' : (spawnNames[who] || speakerName(who) || who);
      out.push({ scene: id, who, name, portrait: opts?.portrait || PORTRAIT[who] || (who && EP6_NPCS[who]?.portrait) || null, text });
    }
  }
  process.stdout.write(JSON.stringify(out));
}
