// C4-uniques: the grades are measures of strength (Scott, DEEP_STACKS_PLAN 13 E; CRITIQUE_STACKS 10: the careful party wore 0 of
// 12 uniques at B95 and the early ones trailed Episode 2 gear). Score = the game's own role weights (game/inventory.js
// weightedGain: what Optimize, the equip prompt and the descent simulator choose by) over a piece's stats, item hp/mp read as
// maxHp/maxMp; status resists count on neither side (a proof is worth what the foe makes it worth, not what the item level says).
//   1. each unique out-scores the 90th-percentile rolled rare of its grade's item level in its slot, for its best wearer, and the
//      piece's own stats (its property's numbers taken out) still beat the median rare
//   2. no junk: for every member who can wear it, it beats that member's median rare
//   3. every Lesser beats the Episode 2 start's piece in its slot (state.js EP2_START) for everyone who can wear it
//   4. the next depth's rares overtake a grade's stats: a Lesser's core under the p90 rare of item level 10, a Greater's under the
//      p95 rare of item level 16 (the grades stay measures, not a flat best-in-slot)
//   5. a ladder: for every slot and member, the best Named they can wear beats their best Greater, which beats their best Lesser
//   6. the Binder's Quill beats every Named charm for every member
// The same rules print as a table: node qa/cave/out/uniques_report.mjs (qa/cave/out/uniques_table.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import register from '../../src/data/cave/index.js';
import { CAVE_UNIQUES, CAVE_UNIQUE_IDS, BINDER_QUILL_ID, GRADES, CAVE_PROPS } from '../../src/data/cave/items.js';
import { rollItem, itemStats, baseOf } from '../../src/battle/loot.js';
import { weightedGain } from '../../src/game/inventory.js';
import { createRng } from '../../src/core/rng.js';
import { EP2_START } from '../../src/game/state.js';
import { PARTY } from '../../src/data/party.js';
import { canEquip } from '../../src/data/items.js';
import { BitmapFont } from '../../src/core/font.js';

await register();
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMBERS = ['hero', 'mira', 'bram'];
const RES = /^res[A-Z]/;
const keyOf = (k) => (k === 'hp' ? 'maxHp' : k === 'mp' ? 'maxMp' : k);
function score(member, stats) {
  const d = {};
  for (const [k, v] of Object.entries(stats || {})) if (!RES.test(k) && typeof v === 'number') d[keyOf(k)] = (d[keyOf(k)] || 0) + v;
  return weightedGain({ id: member }, d);
}
const slotKey = (u) => (u.slot === 'weapon' ? u.type : u.slot);
const wearers = (base) => MEMBERS.filter((m) => (base.slot === 'weapon' ? PARTY[m].weapons.includes(base.type) : canEquip(m, PARTY[m].weapons, base)));
const pctl = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const cache = new Map();
function rares(slot, type, ilvl) {
  const key = `${slot}:${type || ''}:${ilvl}`;
  if (cache.has(key)) return cache.get(key);
  const rng = createRng(7000 + ilvl);
  const per = Object.fromEntries(MEMBERS.map((m) => [m, []]));
  for (let i = 0; i < 1000; i++) {
    const it = rollItem(rng, { ilvl, rarity: 'rare', slot, type });
    const st = itemStats(it);
    for (const m of wearers(baseOf(it))) per[m].push(score(m, st));
  }
  const out = {};
  for (const [m, a] of Object.entries(per)) if (a.length >= 50) out[m] = { p50: pctl(a, 0.5), p90: pctl(a, 0.9), p95: pctl(a, 0.95) };
  cache.set(key, out);
  return out;
}
const minus = (stats, sub) => { const o = { ...stats }; for (const [k, v] of Object.entries(sub || {})) o[k] = (o[k] || 0) - v; return o; };
const ALL = [...CAVE_UNIQUE_IDS, BINDER_QUILL_ID].map((id) => CAVE_UNIQUES[id]);
const r1 = (v) => Math.round(v * 10) / 10;

test('1 and 2: every unique out-scores a rolled rare of its grade\'s item level in its slot (p90, best wearer; its own stats over the median) and is no worse than the median rare for anyone who can wear it', () => {
  for (const u of ALL) {
    const R = rares(u.slot, u.type, u.ilvl);
    const rows = wearers(u).map((m) => ({ m, s: score(m, u.stats), core: score(m, minus(u.stats, CAVE_PROPS[u.prop].stats)), r: R[m] }));
    assert.ok(rows.length, u.id);
    const best = rows.slice().sort((a, b) => b.s / b.r.p90 - a.s / a.r.p90)[0];
    assert.ok(best.s > best.r.p90, `${u.id}: ${best.m} ${r1(best.s)} over the p90 rare ${r1(best.r.p90)} at item level ${u.ilvl}`);
    assert.ok(best.core > best.r.p50, `${u.id}: its own stats ${r1(best.core)} over the median rare ${r1(best.r.p50)}`);
    for (const x of rows) assert.ok(x.s > x.r.p50, `${u.id} on ${x.m}: ${r1(x.s)} over the median rare ${r1(x.r.p50)}`);
  }
});

test('3: every Lesser beats the Episode 2 start\'s piece in its slot for everyone who can wear it (CRITIQUE_STACKS 10)', () => {
  let compared = 0;
  for (const u of ALL.filter((x) => x.grade === 1)) {
    for (const m of wearers(u)) {
      const id = EP2_START.members[m].equip[slotKey(u)];
      if (!id) continue;
      compared++;
      assert.ok(score(m, u.stats) > score(m, itemStats(id)), `${u.id} on ${m}: ${r1(score(m, u.stats))} over ${id} ${r1(score(m, itemStats(id)))}`);
    }
  }
  assert.ok(compared >= 25, `${compared} comparisons`);
  // the critic's case: the Pen against Lanternheart
  assert.ok(score('hero', CAVE_UNIQUES.cave_catalogue_pen.stats) > score('hero', itemStats('lanternheart')));
});

test('4: the next depth overtakes a grade\'s own stats (Lesser under the item level 10 p90 rare, Greater under the item level 16 p95 rare)', () => {
  for (const u of ALL.filter((x) => x.grade < 3)) {
    const [il, p] = u.grade === 1 ? [GRADES[2].ilvl, 'p90'] : [GRADES[3].ilvl, 'p95'];
    const R = rares(u.slot, u.type, il);
    for (const m of wearers(u)) {
      const core = score(m, minus(u.stats, CAVE_PROPS[u.prop].stats));
      assert.ok(core < R[m][p], `${u.id} on ${m}: its stats ${r1(core)} under the ${p} rare at item level ${il} (${r1(R[m][p])})`);
    }
  }
});

test('5 and 6: a ladder in every slot for every reader (best Named > best Greater > best Lesser), and the Quill over every Named charm', () => {
  const keys = [...new Set(CAVE_UNIQUE_IDS.map((id) => slotKey(CAVE_UNIQUES[id])))];
  assert.deepEqual(keys.sort(), ['axe', 'body', 'boots', 'charm', 'head', 'mantle', 'spear', 'staff', 'sword']);
  let rungs = 0;
  for (const k of keys) for (const m of MEMBERS) {
    const bestOf = (g) => Math.max(-Infinity, ...CAVE_UNIQUE_IDS.map((id) => CAVE_UNIQUES[id])
      .filter((u) => u.grade === g && slotKey(u) === k && wearers(u).includes(m)).map((u) => score(m, u.stats)));
    const [l, g, n] = [1, 2, 3].map(bestOf);
    if (![l, g, n].some(Number.isFinite)) continue;
    assert.ok(Number.isFinite(l) && Number.isFinite(g) && Number.isFinite(n), `${k} for ${m}: a piece at every grade`);
    assert.ok(n > g && g > l, `${k} for ${m}: ${r1(l)} < ${r1(g)} < ${r1(n)}`);
    rungs++;
  }
  assert.equal(rungs, 20, 'nine slot keys, every reader who uses them');
  const q = CAVE_UNIQUES[BINDER_QUILL_ID];
  for (const m of MEMBERS) for (const u of ALL.filter((x) => x.grade === 3 && x.slot === 'charm' && x.band)) {
    assert.ok(score(m, q.stats) > score(m, u.stats), `the Quill over ${u.id} for ${m}`);
  }
});

test('the plaque shows every unique whole: the name, the property and the three lore lines fit the detail panel in the game\'s font', () => {
  const font = (f) => new BitmapFont(JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'ui', f), 'utf8')), null, { id: f });
  const main = font('font.json'), large = font('font_large.json');
  const W = 206, LAST_Y = 165;   // story.js StacksScene.drawDetail: DETAIL_W, LAST_Y
  for (const u of ALL) {
    const p = CAVE_PROPS[u.prop];
    assert.ok(large.measure(u.name) <= W - 14 || main.measure(u.name) <= W, `${u.id}: the name fits (${main.measure(u.name)} px)`);
    const propLines = main.wrap(p.text, W).length;
    assert.ok(propLines <= 2, `${u.id}: the property text in two lines`);
    let y = 84 + 11 + 11 * propLines + 8;
    const lore = u.lore.flatMap((para) => main.wrap(para, W));
    const lastY = y + 11 * (lore.length - 1);
    assert.ok(lastY <= LAST_Y, `${u.id}: ${lore.length} lore lines end at y ${lastY} (the panel stops at ${LAST_Y})`);
  }
});

test('the grade is told, never numbered: in the first lore line and the source, not in the name', () => {
  for (const u of ALL.filter((x) => x.band)) {
    assert.equal(u.lore[0], GRADES[u.grade].line);
    assert.ok(u.source.includes(GRADES[u.grade].name), `${u.id} source`);
    assert.ok(!u.name.includes(GRADES[u.grade].name), `${u.id} name`);
  }
  // names that start with "The " stay the sixteen's own (the equip prompt reads "Equip the ...": CRITIQUE_STACKS 14 is world's)
  const the = ALL.filter((u) => /^The /.test(u.name)).map((u) => u.id).sort();
  assert.deepEqual(the, ['cave_binders_mark', 'cave_binders_quill', 'cave_catalogue_pen', 'cave_cellar_key', 'cave_court_word', 'cave_ember_reader', 'cave_forge_binding']);
});
