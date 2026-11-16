// Dump the dialogue boxes of chosen Episode 8 scenes (first path, a realistic flag state) as JSON for
// qa/content/ep8_preview.py. Not a test (run.mjs runs only *.test.mjs). Usage: node qa/content/ep8_boxes.mjs id1 id2 ...
import { scenes, GATE } from '../../src/data/ep8/story.js';
import { register as regEp7Npcs } from '../../src/data/ep7/npcs.js';
import { register as regNpcs, EP8_NPCS } from '../../src/data/ep8/npcs.js';
import { speakerName } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

GATE.live = true;
regEp7Npcs();
regNpcs({ x1Live: false });
export const EP7_DONE = ['intro_done', 'mira_joined', 'bram_joined', 'archivore_defeated', 'ep1_complete', 'ep2_complete', 'ep3_complete',
  'ep4_complete', 'ep5_complete', 'ep6_complete', 'ep7_started', 'nox_named', 'doors_reopened', 'ep7_complete'];
const PORTRAIT = { vex_k: 'silver_rogue', eraser_v: 'eraser', first_keeper: 'first_keeper', hazel: 'hazel', mira: 'mira', bram: 'bram' };
// Flags that make each scene play its main path (the truth answers where a choice is read later).
export const STATE = {
  ep8_morning: [], ep8_roof: ['ep8_started'], stair_arrival: ['ep8_roofed'], first_rub: ['stair_arrived'], first_book: ['first_rub_done'],
  rubbed_steps: ['first_book_read'], south_margin: ['stair_arrived'], scriptorium_arrival: ['stair_arrived'], first_word: ['scriptorium_arrived'],
  meet_librarian: ['read_learned'], elowen_scriptorium: ['read_learned'], library_door: ['card_read', 'elowen_met'], catalog_arrival: ['library_open'],
  keeper_memory_a: ['lib_f1_arrived'], palimpsest_arrival: ['library_f1_done'], keeper_memory_b: ['lib_f2_arrived'], unnamed_sentry: ['lib_f2_arrived'],
  unwritten_arrival: ['library_f2_done'], keeper_memory_c: ['lib_f3_arrived'], the_name: ['keeper_memory_c', 'ink_key_found', 'afraid_yes'],
  eraser: ['name_told'], eraser_after: ['eraser_defeated'], last_choice: ['keeper_named'], last_page: ['keeper_named', 'ending_return'],
  scriptorium_open: ['page_shelved', 'told_elowen'], home: ['scriptorium_open'], concordance_start: ['scriptorium_arrived'],
};
if (process.argv[1] && process.argv[1].endsWith('ep8_boxes.mjs')) {
  const out = [];
  for (const id of process.argv.slice(2)) {
    const spawnNames = {};
    const { log } = await runOnce(scenes[id], { flags: [...EP7_DONE, ...(STATE[id] || [])], branchFlags: false });
    for (const e of log) {
      if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
      if (e.op !== 'say') continue;
      const [who, text, opts] = e.args;
      const name = who == null ? '' : (spawnNames[who] || speakerName(who) || who);
      out.push({ scene: id, who, name, portrait: opts?.portrait || PORTRAIT[who] || (who && EP8_NPCS[who]?.portrait) || null, text });
    }
  }
  process.stdout.write(JSON.stringify(out));
}
