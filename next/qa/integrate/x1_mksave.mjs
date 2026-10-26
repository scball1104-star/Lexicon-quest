// X1-integrate: build a game save (the JSON `qa/autoplay.py --resume` and the title's Continue read) at any point, for testing one
// slice of the completionist route without replaying the game up to it.
//
//   node qa/integrate/x1_mksave.mjs --out qa/out/autoplay/s.json --map x1_downs --pos 54,25,left --level 4 \
//        --flags main:left_town,first_fight_done --items potion=5,ether=2 --gold 300 [--gear ep1|plain]
//
//   --flags a,b,c            plain flags; `main:<flag>` = every Episode 1 main flag up to and including <flag> (MAIN_FLAGS order)
//                            `done` = EP1_DONE_FLAGS (the credits save), `ep2done` adds EP2_DONE_FLAGS
//   --level N                every party member at level N (EXP set to the table floor of N)
//   --gear plain|ep1         plain = starter gear; ep1 = the bot's town outfit (leather vest, hood, bronze charm)
// The party is hero + mira + bram unless --party hero (Mira and Bram are added at left_town in the real game).
import fs from 'node:fs';
import path from 'node:path';
import { createGame, addMember, give, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';
import { newMember, expForLevel } from '../../src/data/party.js';
import { memberMax } from '../../src/game/state.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : acc), []));
const MAIN = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated',
  'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete'];
const g = createGame(args.name || 'Arden', { map: args.map || 'willowmere' });
const [px, py, pd] = String(args.pos || '20,28,down').split(',');
g.pos = { x: Number(px), y: Number(py), dir: pd || 'down' };
if (args.party !== 'hero') for (const id of ['mira', 'bram']) addMember(g, id);
const level = Number(args.level || 1);
for (const m of g.party) {
  const fresh = newMember(m.id, { level, name: m.name });
  m.level = level; m.exp = Math.max(fresh.exp, expForLevel(level));
  if ((args.gear || 'ep1') === 'ep1') {
    m.equip = { ...m.equip };
    if (m.id === 'hero') Object.assign(m.equip, { body: 'leather_vest', head: 'leather_hood' });
    if (m.id === 'bram') Object.assign(m.equip, { body: 'leather_vest', head: 'leather_hood' });
    if (m.id === 'mira') Object.assign(m.equip, { head: 'leather_hood' });
  }
  m.hp = fresh.hp; m.mp = fresh.mp;
  const s = memberMax(m);
  m.hp = s.hp; m.mp = s.mp; m.fury = 0;
}
for (const part of String(args.flags || '').split(',').filter(Boolean)) {
  if (part.startsWith('main:')) for (const f of MAIN.slice(0, MAIN.indexOf(part.slice(5)) + 1)) g.flags[f] = true;
  else if (part === 'done') for (const f of EP1_DONE_FLAGS) g.flags[f] = true;
  else if (part === 'ep2done') for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS]) g.flags[f] = true;
  else g.flags[part] = true;
}
g.items = {};
for (const part of String(args.items || 'potion=3').split(',').filter(Boolean)) { const [id, q] = part.split('='); give(g, id, Number(q || 1)); }
if (g.flags.lantern_get) give(g, 'lantern_of_recall', 1);
if (g.flags.mira_joined && args.party === 'hero') delete g.flags.mira_joined;
g.gold = Number(args.gold ?? 200);
g.lastSafe = { map: g.map, pos: { ...g.pos } };
const out = path.resolve(String(args.out || 'qa/out/autoplay/x1_test_save.json'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(g));
console.log(`wrote ${out}: ${g.map} ${JSON.stringify(g.pos)} Lv ${level} flags ${Object.keys(g.flags).length}`);
