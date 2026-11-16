// E8-pack (EPISODE8_PLAN 13.2 seam 5): the command rows rules.js builds for Episodes 1 to 7, as a fixture. For each episode one
// ordinary fight on its middle floor and its boss fight (the simulator's zones, loadouts and levels, the competent policy, fixed
// seeds), every party turn's b.commands(unit), in compact form. qa/core/ep8_commands.test.mjs builds the same battles and
// deep-equals the result against qa/core/ep8_commands_fixture.json: a battle with no `commands` hook builds exactly the rows it
// built before the seam. The JSON was written from rules.js WITHOUT the seam line (2026-11-15, E8-pack), then the line went back.
//
//     node next/qa/core/ep8_commands_fixture.mjs --write     (rewrite the JSON; only when a rules change is meant to move rows)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { ENCOUNTERS, ZONE_ORDER, EP2_ZONE_ORDER, EP3_ZONE_ORDER, rollEncounter } from '../../src/data/encounters.js';
import { EP4_ZONE_ORDER } from '../../src/data/ep4/encounters.js';
import { EP5_ZONE_ORDER } from '../../src/data/ep5/encounters.js';
import { EP6_ZONE_ORDER } from '../../src/data/ep6/encounters.js';
import { EP7_ZONE_ORDER } from '../../src/data/ep7/encounters.js';
import { LOADOUTS, knownBestiary } from '../../tools/sim/loadouts.mjs';

const { makeParty, SUITE_LEVELS, BOSS_LEVELS } = await import('../../tools/sim/simulate.mjs');   // registers ep4 to ep7 (the attach lines)
await (await import('../../tools/sim/ep7.mjs')).registerData();   // the ep4 to ep7 data and battle rules (sky, gale, rime) on RULE_EXT

export const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ep8_commands_fixture.json');
const ORDERS = { 1: ZONE_ORDER, 2: EP2_ZONE_ORDER, 3: EP3_ZONE_ORDER, 4: EP4_ZONE_ORDER, 5: EP5_ZONE_ORDER, 6: EP6_ZONE_ORDER, 7: EP7_ZONE_ORDER };
const MAX_TURNS = 24;

/** The two fights of an episode: [{ ep, zone, encounter, level }]. */
export function cases() {
  const out = [];
  for (const [ep, order] of Object.entries(ORDERS)) {
    const mid = order[Math.min(2, order.length - 2)], boss = order[order.length - 1];
    const ordinary = Object.keys(ENCOUNTERS).find((id) => ENCOUNTERS[id].zone === mid && !ENCOUNTERS[id].boss);
    const lead = Object.keys(ENCOUNTERS).find((id) => ENCOUNTERS[id].zone === boss && ENCOUNTERS[id].boss);
    if (ordinary) out.push({ ep: +ep, zone: mid, encounter: ordinary, level: (SUITE_LEVELS[mid] || [20])[0] });
    if (lead) out.push({ ep: +ep, zone: boss, encounter: lead, level: (BOSS_LEVELS[lead] || SUITE_LEVELS[boss] || [20])[0] });
  }
  return out;
}

/** A command list as JSON (the whole row shape: names, flags, reasons, every sub row) and its sha1, to keep the file small. */
const pack = (list) => JSON.stringify(list);
const digest = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);

/** Play one case and record every party turn's command rows: { key, turns: [[uid, sha1, rows on the first turn], ...] }. */
export function record(c, seed = 3) {
  const rng = makeRng(seed * 7919 + 17);
  const party = makeParty(c.zone, c.level);
  const spec = rollEncounter(c.encounter, rng, { eliteRate: 0, noElite: true });
  const e = ENCOUNTERS[c.encounter];
  const b = createBattle({ party, enemies: spec.enemies, rng,
    options: { inventory: { ...LOADOUTS[c.zone].inventory }, boss: e.boss, canFlee: !e.noFlee, zone: e.zone, encounter: c.encounter,
      bestiary: knownBestiary(), flags: LOADOUTS[c.zone].flags || [] } });
  const turns = [];
  let steps = 0;
  while (!b.isOver() && steps++ < 600 && turns.length < MAX_TURNS) {
    const u = b.current();
    if (u.side === 'party') {
      const rows = pack(b.commands(u.uid));
      turns.push(turns.length ? [u.uid, digest(rows)] : [u.uid, digest(rows), JSON.parse(rows)]);   // the first turn in full
      let evs = b.perform(partyAction(b, 'competent'));
      if (evs.length === 1 && evs[0].type === 'invalid') evs = b.perform({ type: 'defend' });
    } else b.runEnemyTurn();
  }
  return { key: `ep${c.ep}:${c.encounter}@${c.level}`, turns };
}

export function build() { return cases().map((c) => record(c)); }

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const data = build();
  if (process.argv.includes('--write')) {
    fs.writeFileSync(FIXTURE, JSON.stringify(data) + '\n');
    console.log(`wrote ${FIXTURE}: ${data.length} fights, ${data.reduce((n, d) => n + d.turns.length, 0)} party turns`);
  } else console.log(data.map((d) => `${d.key}: ${d.turns.length} turns`).join('\n'));
}
