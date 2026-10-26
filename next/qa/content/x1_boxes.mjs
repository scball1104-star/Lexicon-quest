// Dump the dialogue boxes of chosen X1 scenes (the main path of each, with a realistic flag state) as JSON for qa/content/x1_preview.py.
// Usage: node qa/content/x1_boxes.mjs rollcall_stones mill_done orrery_align
import { X1, registerAll } from './x1_helpers.mjs';
import { runOnce } from './_harness.mjs';
import { speakerName, NPCS } from '../../src/data/npcs.js';

registerAll();
const PORTRAIT = { hero: 'hero', mira: 'mira', bram: 'bram', iris: 'iris', pell: 'pell' };
const BOTH = ['mira_joined', 'bram_joined'];
const STATE = {
  reeve_after: ['stones_lettered'], rollcall_stones: ['roll_found', 'copy_found'], rollcall_done: ['reeve_named'], mill_done: ['mill_turning'],
  pin_place: ['pin_found', 'mill_started'], orrery_align: ['stars_started', 'star_1_read', 'star_2_read', 'star_3_read'],
  star_read_3: ['stars_started', 'star_1_read', 'star_2_read'], list_done: ['list_started'], strays_done: ['strays_started'],
};
const out = [];
for (const id of process.argv.slice(2)) {
  const spawnNames = {};
  const { log } = await runOnce(X1.story.rawScenes[id], { flags: [...BOTH, ...(STATE[id] || [])], branchFlags: false });
  for (const e of log) {
    if (e.op === 'spawn') spawnNames[e.args[0]] = e.args[1].name;
    if (e.op !== 'say') continue;
    const [who, text, opts] = e.args;
    const name = who == null ? '' : (spawnNames[who] || X1.npcs.X1_SPEAKERS[who] || speakerName(who) || who);
    out.push({ scene: id, who, name, portrait: opts?.portrait || PORTRAIT[who] || (who && NPCS[who]?.portrait) || null, text });
  }
}
process.stdout.write(JSON.stringify(out));
