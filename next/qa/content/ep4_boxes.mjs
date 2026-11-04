// Dump the dialogue boxes of chosen Episode 4 scenes (first path, a realistic flag state) as JSON for
// qa/content/ep4_preview.py. Not a test (run.mjs runs only *.test.mjs). Usage: node qa/content/ep4_boxes.mjs id1 id2 ...
import { scenes, GATE } from '../../src/data/ep4/story.js';
import { register as regNpcs, EP4_NPCS } from '../../src/data/ep4/npcs.js';
import { speakerName } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

GATE.live = true;
regNpcs();
export const EP3_DONE = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete',
  'nh_restored', 'ep3_started', 'pk_restored', 'garrick_named', 'ep3_complete'];
// Flags that make each scene play its main path.
export const STATE = {
  ep4_morning: [], east_road_gate: ['ep4_started'], flood_road_arrival: ['east_road_open'],
  flood_first_fight: ['flood_road_arrived'], flood_lane: ['flood_road_arrived'], ferry_rest: ['flood_road_arrived'],
  vw_view: ['flood_road_arrived'], vw_arrival: ['saw_valewyn'], vw_statue: ['vw_arrived'], regent_hall: ['vw_arrived'],
  joss_locks: ['met_regent'], keep_ferry: ['met_joss'], keep_f1_arrival: ['keep_ferry_open'], lyra_memory_1: ['keep_f1_arrived'],
  keep_f2_arrival: ['keep_f1_done'], lyra_memory_2: ['keep_f2_arrived'], vex_archive: ['keep_f2_arrived'],
  barrister: ['keep_f2_arrived'], coffer_records: ['keep_f2_arrived'], keep_f3_arrival: ['keep_f2_done'],
  principle_voice: ['keep_f3_arrived'], principle_truth: ['keep_f3_arrived'], principle_mercy: ['keep_f3_arrived', 'principle_voice', 'principle_truth'],
  lyra_memory_3: ['principle_voice', 'principle_truth', 'principle_mercy'], witness_book: ['lyra_memory_3'],
  paper_regent: ['hero_signed'], regent_after: ['paper_regent_defeated', 'lyra_truth'], crown_remembers: ['charter_restored', 'lyra_truth', 'council_records'],
  ep4_ending: ['vw_restored'], witnesses_start: ['met_joss'], council_choice: ['witnesses_started', 'testimony_hale', 'testimony_dorian', 'testimony_joss'],
  nilo_bell: ['ferry_rested'],
};
if (process.argv[1] && process.argv[1].endsWith('ep4_boxes.mjs')) {
  const out = [];
  for (const id of process.argv.slice(2)) {
    const spawnNames = {};
    const { log } = await runOnce(scenes[id], { flags: [...EP3_DONE, ...(STATE[id] || [])], branchFlags: false });
    for (const e of log) {
      if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
      if (e.op !== 'say') continue;
      const [who, text, opts] = e.args;
      const name = who == null ? '' : (spawnNames[who] || speakerName(who) || who);
      out.push({ scene: id, who, name, portrait: opts?.portrait || (who && EP4_NPCS[who]?.portrait) || null, text });
    }
  }
  process.stdout.write(JSON.stringify(out));
}
