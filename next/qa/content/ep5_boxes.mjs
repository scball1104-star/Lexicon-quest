// Dump the dialogue boxes of chosen Episode 5 scenes (first path, a realistic flag state) as JSON for
// qa/content/ep5_preview.py. Not a test (run.mjs runs only *.test.mjs). Usage: node qa/content/ep5_boxes.mjs id1 id2 ...
import { scenes, GATE } from '../../src/data/ep5/story.js';
import { register as regNpcs, EP5_NPCS } from '../../src/data/ep5/npcs.js';
import { speakerName } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

GATE.live = true;
regNpcs();
export const EP4_DONE = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete',
  'nh_restored', 'ep3_started', 'pk_restored', 'garrick_named', 'ep3_complete', 'ep4_started', 'vw_restored', 'lyra_named', 'ep4_complete'];
const PORTRAIT = { vex: 'silver_rogue', oracle: 'oracle', oracle_v: 'oracle', mira: 'mira', bram: 'bram' };
// Flags that make each scene play its main path.
export const STATE = {
  ep5_morning: [], ep5_board: ['ep5_started'], ship_night: ['ship_boarded'], ship_bram: ['ship_arrived'], ship_fight: ['bram_asked'],
  road_landing: ['ship_first_fight_done'], road_shade: ['road_landed'], tent_rest: ['road_landed'], haven_view: ['road_landed'],
  haven_arrival: ['road_landed'], meet_sel: ['haven_arrived'], moonwell: ['haven_arrived'], star_reading: ['met_sel', 'bram_told'],
  sel_gate: ['star_reading_done'], lab_f1_arrival: ['gnomon_get'], sel_memory_1: ['lab_f1_arrived'], lab_f2_arrival: ['lab_f1_done'],
  sel_memory_2: ['lab_f2_arrived'], vex_gallery: ['lab_f2_arrived'], mirage_knight: ['lab_f2_arrived'], reliquary: ['lab_f2_arrived'],
  lab_f3_arrival: ['lab_f2_done'], landing_shelter: ['sel_walked_in'], landing_truth: ['landing_shelter'], landing_return: ['landing_truth'],
  oracle: ['oracle_door_open', 'star_restored'], oracle_after: ['oracle_defeated', 'star_restored'], every_road: ['chart_restored', 'star_restored'],
  ep5_ending: ['haven_restored'], roads_start: ['met_sel'], bells_start: ['haven_arrived'],
};
if (process.argv[1] && process.argv[1].endsWith('ep5_boxes.mjs')) {
  const out = [];
  for (const id of process.argv.slice(2)) {
    const spawnNames = {};
    const { log } = await runOnce(scenes[id], { flags: [...EP4_DONE, ...(STATE[id] || [])], branchFlags: false });
    for (const e of log) {
      if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
      if (e.op !== 'say') continue;
      const [who, text, opts] = e.args;
      const name = who == null ? '' : (spawnNames[who] || speakerName(who) || who);
      out.push({ scene: id, who, name, portrait: opts?.portrait || PORTRAIT[who] || (who && EP5_NPCS[who]?.portrait) || null, text });
    }
  }
  process.stdout.write(JSON.stringify(out));
}
