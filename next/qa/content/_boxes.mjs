// Dump the dialogue boxes of chosen scenes (first path through each, plus a realistic flag state) as
// JSON for qa/content/preview_dialogue.py. Usage: node qa/content/_boxes.mjs scene1 scene2 ...
import { scenes } from '../../src/data/story/ep1.js';
import { speakerName, NPCS } from '../../src/data/npcs.js';
import { runOnce } from './_harness.mjs';

// Flags that make each scene play its main path.
const STATE = {
  wake_up: [], fading_sign: ['intro_done'], mael_intro: ['intro_done'], mira_joins: ['intro_done', 'met_mael'],
  south_gate: ['intro_done', 'met_mael', 'mira_joined'], archive_door: ['bram_joined', 'mira_joined'],
  lantern_get: ['echo_warden_defeated', 'archive_f1_done', 'mira_joined', 'bram_joined'],
  thirteenth_bell: ['archive_f2_done', 'mira_joined', 'bram_joined'],
  archivore: ['boss_door_open', 'mira_joined', 'bram_joined'],
  echo_warden: ['archive_f1_done', 'mira_joined', 'bram_joined'],
  first_fight: ['left_town', 'mira_joined', 'bram_joined'],
  campfire_rest: ['left_town', 'mira_joined', 'bram_joined'],
  return_to_willowmere: ['archivore_defeated', 'mira_joined', 'bram_joined'],
  tess_letters: ['intro_done', 'tess_quest_started', 'tess_letter_3_found', 'mira_joined', 'bram_joined'],
};
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
