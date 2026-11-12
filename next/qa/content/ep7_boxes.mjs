// Dump the dialogue boxes of chosen Episode 7 scenes (first path, a realistic flag state) as JSON for
// qa/content/ep7_preview.py. Not a test (run.mjs runs only *.test.mjs). Usage: node qa/content/ep7_boxes.mjs id1 id2 ...
import { scenes, GATE } from '../../src/data/ep7/story.js';
import { register as regEp5Npcs } from '../../src/data/ep5/npcs.js';
import { register as regEp6Npcs } from '../../src/data/ep6/npcs.js';
import { register as regNpcs, EP7_NPCS } from '../../src/data/ep7/npcs.js';
import { speakerName } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

GATE.live = true;
regEp5Npcs();
regEp6Npcs();
regNpcs();
export const EP6_DONE = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'nh_restored',
  'ep3_started', 'pk_restored', 'ep3_complete', 'ep4_started', 'vw_restored', 'ep4_complete', 'ep5_started', 'haven_restored', 'ep5_complete',
  'ep6_started', 'isles_restored', 'compass_restored', 'ep6_complete'];
const PORTRAIT = { vex_k: 'silver_rogue', white_phantom: 'phantom', mira: 'mira', bram: 'bram' };
// Flags that make each scene play its main path (the truth answers where a choice is read later).
export const STATE = {
  ep7_morning: [], ep7_board: ['ep7_started'], ep7_landing: ['ep7_boarded'], name_under_ice: ['road_arrived'],
  road_fight: ['vex_carved'], first_stone: ['road_arrived'], whiteout: ['first_stone_read'], waystation: ['road_arrived'],
  palehaven_view: ['road_arrived'], palehaven_arrival: ['road_arrived'], meet_keeper: ['palehaven_arrived'],
  keeper_and_vex: ['met_keeper'], vault_gate: ['keeper_told'], vault_f1_arrival: ['vault_open'], keeper_memory_1: ['vault_f1_arrived'],
  vault_f2_arrival: ['vault_f1_done'], keeper_memory_2: ['vault_f2_arrived'], listening_bell: ['vault_f2_arrived'],
  pale_lantern: ['vault_f2_arrived'], vault_f3_arrival: ['vault_f2_done'], keeper_memory_3: ['vault_f3_arrived'],
  keeper_comes: ['keeper_memory_3'], phantom: ['stillheart_open'], phantom_after: ['phantom_defeated'],
  whole_page: ['stillheart_restored', 'told_nox', 'told_vex'], doors_reopen: ['page_whole', 'told_nox', 'told_vex'], ep7_ending: ['doors_reopened'],
  hearth_start: ['met_keeper'], streets_start: ['palehaven_arrived'],
};
if (process.argv[1] && process.argv[1].endsWith('ep7_boxes.mjs')) {
  const out = [];
  for (const id of process.argv.slice(2)) {
    const spawnNames = {};
    const { log } = await runOnce(scenes[id], { flags: [...EP6_DONE, ...(STATE[id] || [])], branchFlags: false, mapId: id === 'ep7_morning' ? 'ep6_zl_charts' : null });
    for (const e of log) {
      if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
      if (e.op !== 'say') continue;
      const [who, text, opts] = e.args;
      const name = who == null ? '' : (spawnNames[who] || speakerName(who) || who);
      out.push({ scene: id, who, name, portrait: opts?.portrait || PORTRAIT[who] || (who && EP7_NPCS[who]?.portrait) || null, text });
    }
  }
  process.stdout.write(JSON.stringify(out));
}
