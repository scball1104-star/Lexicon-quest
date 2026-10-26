// X1-battle: the Episode 1 expansion's battle data (src/data/x1/{enemies,items,loot,encounters,shops}.js) is complete, resolves, follows the
// budgets of EXPANSION1_PLAN.md 7 and 8, and no new foe fells a full-HP member with one ordinary action (the W15 rule).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SKILLS, STATUSES, DAMAGE_TYPES } from '../../src/data/skills.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, CONSUMABLES, KEY_ITEMS, RARITIES } from '../../src/data/items.js';
import { ENEMIES, ELITE_BASE } from '../../src/data/enemies.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, OPTIONAL_ZONES, EP2_ZONE_ORDER, EP3_ZONE_ORDER } from '../../src/data/encounters.js';
import { SHOPS, shopStock } from '../../src/data/shops.js';
import { BOSS_LOOT, ZONE_LOOT } from '../../src/data/loot-tables.js';
import { memberStats, DEF_K, VARIANCE, ENEMY_CRIT, CRIT_MULT } from '../../src/battle/rules.js';
import { makeParty, LOADOUT_AT, EPISODES } from '../../tools/sim/simulate.mjs';
import { X1_GROUP_IDS, X1_BOSS_IDS, X1_ZONES, X1_MAPS_LISTED } from '../../src/data/x1/encounters.js';
import { X1_UNIQUES, X1_KEY_ITEMS, X1_SETS } from '../../src/data/x1/items.js';
import { X1_ENEMY_ROWS, X1_SKILLS } from '../../src/data/x1/enemies.js';
import { pellCardStock } from '../../src/data/x1/shops.js';

const NEW_ENEMIES = ['barrow_shade', 'barrow_reeve', 'millstone_golem'];
const ZONE_IDS = ['x1_downs', 'x1_highmoor', 'x1_barrow', 'x1_larchhill', 'x1_millrace', 'x1_terrace', 'x1_cellar', 'x1_culvert'];

test('the three foes, two skills and eighteen groups plus two bosses exist with the plan\'s ids', () => {
  for (const id of NEW_ENEMIES) assert.ok(ENEMIES[id], id);
  for (const id of Object.keys(X1_SKILLS)) assert.ok(SKILLS[id] && SKILLS[id].kind === 'enemy', id);
  assert.deepEqual(X1_GROUP_IDS, ['dn_wolves', 'dn_scarab', 'dn_pack', 'mo_wolves', 'mo_scarabs', 'mo_wraiths', 'bw_shades', 'bw_mixed', 'lh_beetles',
    'lh_wolves', 'lh_mixed', 'mr_weevils', 'mr_wolves', 'tr_wolves', 'tr_golem', 'cl_wraiths', 'cv_blots', 'cv_wraith']);
  assert.deepEqual(X1_BOSS_IDS, ['barrow_reeve', 'millstone_golem']);
  for (const id of [...X1_GROUP_IDS, ...X1_BOSS_IDS]) assert.ok(ENCOUNTERS[id], id);
  // the Episode 2 expansion renamed its colliding ids; these Episode 1 names must stay free of its set
  assert.equal(ENEMIES.delver_shade, undefined);
});

test('enemies: stats, skills, weaknesses and loot zones are valid; the bosses use the phased AI the Alpha uses', () => {
  for (const id of NEW_ENEMIES) {
    const e = ENEMIES[id];
    for (const k of ['hp', 'atk', 'def', 'mag', 'spr', 'spd', 'exp', 'gold', 'masteryPts', 'shields']) assert.ok(Number.isFinite(e[k]) && e[k] >= 0, `${id}.${k}`);
    for (const m of e.moves) assert.ok(SKILLS[m.skill], `${id} move ${m.skill}`);
    if (e.charge) assert.ok(SKILLS[e.charge.skill] && SKILLS[e.charge.skill].telegraph, `${id} charge ${e.charge.skill}`);
    for (const t of [...e.weak, ...e.resist, ...e.immune]) assert.ok(DAMAGE_TYPES.includes(t), `${id} type ${t}`);
    for (const s of e.statusImmune) assert.ok(STATUSES[s], `${id} status ${s}`);
    assert.ok(ZONE_LOOT[e.lootZone], `${id} lootZone ${e.lootZone}`);
    assert.ok(e.flavor && e.flavor.length > 10);
    for (const d of e.drops) assert.ok(ITEMS[d.item], `${id} drop ${d.item}`);
  }
  for (const id of X1_BOSS_IDS) {
    const e = ENEMIES[id];
    assert.equal(e.ai, 'phased'); assert.ok(e.boss); assert.ok(e.charge);
    assert.equal(e.phases.length, 3);
    assert.deepEqual(e.phases.map((p) => p.at), [1, 0.5, 0.25]);
    assert.ok(e.phases[1].summon && ENEMIES[e.phases[1].summon], `${id} calls an add at half`);
    assert.ok(e.phases[2].haste, `${id} hastens at a quarter`);
    assert.equal(e.uniqueDrop, BOSS_LOOT[id].unique);
  }
  assert.deepEqual(ENEMIES.barrow_reeve.weak, ['bow', 'light']);
  assert.deepEqual(ENEMIES.millstone_golem.weak, ['thunder', 'axe']);
  // the rows in the file are the rows registered (no drift between the exported table and ENEMIES)
  for (const [id, row] of Object.entries(X1_ENEMY_ROWS)) assert.equal(ENEMIES[id].hp, row.hp);
});

test('zones: eight optional zones, never on the route, listed once X1-maps-hub flipped the switch', () => {
  assert.equal(X1_MAPS_LISTED, true, 'X1-maps-hub flipped this');
  assert.deepEqual(Object.keys(X1_ZONES), ZONE_IDS);
  for (const id of ZONE_IDS) {
    const z = ZONES[id];
    assert.ok(z && z.optional && z.id === id, id);
    assert.ok(OPTIONAL_ZONES.includes(id), id);
    assert.ok(![...ZONE_ORDER, ...EP2_ZONE_ORDER, ...EP3_ZONE_ORDER].includes(id), id);
    assert.equal(Object.keys(ZONES).includes(id), X1_MAPS_LISTED, `${id} enumerable only when listed`);
    assert.ok(ZONE_LOOT[id], `${id} loot`);
    for (const [enc, n] of z.plan) { assert.ok(ENCOUNTERS[enc], enc); assert.equal(ENCOUNTERS[enc].zone, id); assert.equal(n, 1); }
    assert.ok(z.level[0] >= 3 && z.level[1] <= 7);
  }
  assert.deepEqual(ZONE_ORDER, ['valley', 'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss']);
  // every group is placed by exactly one zone plan
  const planned = ZONE_IDS.flatMap((id) => ZONES[id].plan.map(([e]) => e)).sort();
  assert.deepEqual(planned, [...X1_GROUP_IDS, ...X1_BOSS_IDS].sort());
  assert.deepEqual(ZONES.x1_barrow.level, [5, 6]); assert.deepEqual(ZONES.x1_culvert.level, [6, 7]);
  // the loot tables of 7.3
  assert.deepEqual([ZONE_LOOT.x1_downs, ZONE_LOOT.x1_highmoor, ZONE_LOOT.x1_barrow, ZONE_LOOT.x1_terrace].map((z) => [z.ilvl, z.equipChance]), [[3, 0.10], [4, 0.11], [5, 0.12], [6, 0.12]]);
  // the sim suite includes them
  for (const id of ZONE_IDS) assert.ok(EPISODES[1].includes(id), `${id} in the default Episode 1 suite`);
});

test('encounters: groups reuse existing foes, bosses are fleeless, eliteless, flagged and keyed to their loot', () => {
  for (const id of X1_GROUP_IDS) {
    const e = ENCOUNTERS[id];
    assert.ok(!e.boss && !e.noFlee, id);
    assert.ok(e.enemies.length >= 2 && e.enemies.length <= 3, id);
    for (const eid of e.enemies) assert.ok(ENEMIES[eid], `${id}: ${eid}`);
    assert.ok(e.enemies.includes(e.leader), `${id} leader`);
  }
  const flags = { barrow_reeve: 'barrow_reeve_defeated', millstone_golem: 'millstone_golem_defeated' };
  for (const id of X1_BOSS_IDS) {
    const e = ENCOUNTERS[id];
    assert.ok(e.boss && e.noFlee && e.noElite, id);
    assert.equal(e.flag, flags[id]); assert.equal(e.bossLoot, id);
    assert.deepEqual(e.enemies, [id]);
    assert.ok(BOSS_LOOT[id] && ITEMS[BOSS_LOOT[id].unique], `${id} loot`);
  }
  assert.equal(ENCOUNTERS.barrow_reeve.zone, 'x1_barrow'); assert.equal(ENCOUNTERS.millstone_golem.zone, 'x1_culvert');
  assert.equal(BOSS_LOOT.barrow_reeve.unique, 'reeves_crook'); assert.equal(BOSS_LOOT.millstone_golem.unique, 'millwright_apron');
  // the plan's base EXP per group (7.4): the ledger reads these
  const raw = (id) => ENCOUNTERS[id].enemies.reduce((s, e) => s + ENEMIES[e].exp, 0);
  assert.deepEqual(['dn_wolves', 'dn_scarab', 'dn_pack', 'mo_wolves', 'mo_scarabs', 'mo_wraiths'].map(raw), [27, 19, 25, 35, 31, 28]);
  assert.deepEqual(['lh_beetles', 'lh_wolves', 'lh_mixed', 'mr_weevils', 'mr_wolves', 'tr_golem', 'cl_wraiths', 'cv_blots', 'cv_wraith'].map(raw), [31, 30, 36, 32, 52, 34, 46, 44, 54]);
});

test('items: the Honey Roll, the key items, nine placed pieces and the set exist and are sane', () => {
  const h = CONSUMABLES.honey_roll;
  assert.ok(h && h.price === 40 && h.effect.heal === 100 && h.battle && h.field && h.target === 'ally');
  assert.ok(CONSUMABLES.potion.price < h.price && h.price < CONSUMABLES.hi_potion.price);
  assert.ok(h.effect.heal / h.price > CONSUMABLES.potion.effect.heal / CONSUMABLES.potion.price * 0.7 && h.price / h.effect.heal < CONSUMABLES.hi_potion.price / CONSUMABLES.hi_potion.effect.heal);
  for (const id of ['burial_roll', 'quill_copy', 'pell_crate', 'millstone_pin']) { assert.ok(KEY_ITEMS[id] && KEY_ITEMS[id].key && ITEMS[id].kind === 'key', id); assert.ok(!(id in X1_KEY_ITEMS) || X1_KEY_ITEMS[id]); }
  assert.ok(KEY_ITEMS.pell_crate.counted);
  const ids = ['reeves_crook', 'drovers_bow', 'fold_mantle', 'drover_boots', 'rollcall_charm', 'star_chart', 'millwright_apron', 'chime_staff', 'orchard_axe'];
  assert.deepEqual(Object.keys(X1_UNIQUES), ids);
  for (const id of ids) {
    const u = UNIQUES[id];
    assert.ok(u && ITEMS[id] && ITEMS[id].kind === 'equipment' && ITEMS[id].unique, id);
    assert.ok(RARITIES[u.rarity], id); assert.ok(u.source && u.source.length > 5, `${id} has source text`); assert.ok(u.desc, id);
    assert.ok(!EQUIPMENT[id], `${id} is placed, never in the random pools`);
    assert.ok(u.ilvl <= 8, `${id} stays under Episode 2's ilvl 9`);
  }
  assert.equal(UNIQUES.reeves_crook.type, 'spear'); assert.equal(UNIQUES.drovers_bow.type, 'bow'); assert.equal(UNIQUES.chime_staff.type, 'staff'); assert.equal(UNIQUES.orchard_axe.type, 'axe');
  assert.deepEqual(UNIQUES.reeves_crook.stats, { atk: 17, def: 2, crit: 4, furyGain: 10 });
  assert.deepEqual(UNIQUES.millwright_apron.stats, { def: 11, spr: 3, hp: 30, resPoison: 50 });
});

// The budget (plan 8.2). Each new piece is compared with the peers the plan names (its "Peers (the check)" column): its headline
// stats may not exceed the best peer by more than one tier step (here 50% + 1 of the peer's, tier gaps in the tier tables are 20 to
// 80%), and it must stay under the Episode 2 tier 3 and 4 BASES of its slot on the headline stat (charms are skipped for that
// second check: the Episode 2 charm bases trade different stats, so the plan compares them by hand).
const PEERS = {
  reeves_crook: ['iron_pike', 'winged_lance', 'thornwake'], drovers_bow: ['hunters_bow', 'yew_longbow'], fold_mantle: ['wayfarer_mantle'],
  drover_boots: ['wayfarer_boots'], rollcall_charm: ['courier_knot'], star_chart: ['lantern_charm'], millwright_apron: ['steel_cuirass', 'mirrorguard_mail'],
  chime_staff: ['crystal_rod', 'archivist_staff'], orchard_axe: ['battle_axe', 'bearded_axe'],
};
const HEAD = {   // the slot's headline stats; resists count a tenth, HP a fifth
  weapon: (s) => (s.atk || 0) + (s.mag || 0) + (s.def || 0) + (s.crit || 0), body: (s) => (s.def || 0) + (s.spr || 0) + (s.hp || 0) / 5 + (s.inkRes || 0) / 10 + (s.resPoison || 0) / 10,
  head: (s) => (s.def || 0) + (s.spr || 0), charm: (s) => (s.atk || 0) + (s.mag || 0) + (s.spr || 0) + (s.spd || 0) * 2 + (s.luk || 0) + (s.def || 0) + (s.inkRes || 0) / 10 + (s.resSilence || 0) / 10 + (s.resBlind || 0) / 10,
  boots: (s) => (s.spd || 0) * 2 + (s.def || 0) + (s.hp || 0) / 5, mantle: (s) => (s.def || 0) + (s.spr || 0) + (s.luk || 0),
};
const HEAD2 = { weapon: (s) => (s.atk || 0) + (s.mag || 0), body: (s) => s.def || 0, head: (s) => s.def || 0, boots: (s) => (s.spd || 0) * 2 + (s.def || 0), mantle: (s) => s.def || 0 };
test('item budgets: no new piece beats its named peers by more than a tier step or reaches Episode 2 tier 3 and 4', () => {
  for (const [id, peers] of Object.entries(PEERS)) {
    const u = UNIQUES[id];
    const best = Math.max(...peers.map((pid) => { const b = EQUIPMENT[pid] || UNIQUES[pid]; assert.ok(b, `peer ${pid}`); assert.equal(b.slot, u.slot, `${pid} is a ${u.slot}`); return HEAD[u.slot](b.stats); }));
    const p = HEAD[u.slot](u.stats);
    assert.ok(p <= best * 1.5 + 1, `${id}: ${p} against its best peer ${best}`);
    if (u.slot !== 'charm') {
      const e2 = Object.values(EQUIPMENT).filter((b) => b.slot === u.slot && b.ilvl >= 9 && b.ilvl <= 11 && (u.slot !== 'weapon' || b.type === u.type));
      if (e2.length) { const best2 = Math.max(...e2.map((b) => HEAD2[u.slot](b.stats))); assert.ok(HEAD2[u.slot](u.stats) < best2, `${id}: ${HEAD2[u.slot](u.stats)} reaches an Episode 2 ${u.slot} base (${best2})`); }
    }
    assert.ok(u.ilvl <= 8, `${id} ilvl`);
  }
  assert.deepEqual(Object.keys(PEERS), Object.keys(X1_UNIQUES));
  assert.ok(UNIQUES.reeves_crook.stats.atk < EQUIPMENT.winged_lance.stats.atk);
  assert.ok(UNIQUES.millwright_apron.stats.def < EQUIPMENT.steel_cuirass.stats.def);
});

test('the set drovers_road: +25 HP and +2 DEF, and it stays below Wayfarer\'s Promise', () => {
  const s = SETS.drovers_road;
  assert.deepEqual(s.pieces, ['fold_mantle', 'drover_boots']);
  assert.deepEqual(s.bonus, { 2: { hp: 25, def: 2 } });
  assert.equal(UNIQUES.fold_mantle.set, 'drovers_road'); assert.equal(UNIQUES.drover_boots.set, 'drovers_road');
  assert.equal(UNIQUES.fold_mantle.slot, 'mantle'); assert.equal(UNIQUES.drover_boots.slot, 'boots');
  const w = SETS.wayfarers_promise.bonus[2];
  assert.ok(w.spd === 1 && w.startHaste === 2, 'Wayfarer\'s Promise keeps its SPD and its Haste');
  assert.ok(!('spd' in s.bonus[2]) && !('startHaste' in s.bonus[2]), 'the Drover\'s Road has neither');
  assert.deepEqual(Object.keys(X1_SETS), ['drovers_road']);
});

test('shops: the loom and the stall sell only real items; Willowmere Goods gets a tenth off with pell_stamp', () => {
  for (const id of ['thornfold_loom', 'millrace_stall']) {
    assert.ok(SHOPS[id], id);
    for (const s of SHOPS[id].stock) assert.ok(ITEMS[s.item], `${id}: ${s.item}`);
    assert.ok(shopStock(id, {}).some((s) => s.item === 'honey_roll'));
  }
  const loom = new Set(SHOPS.thornfold_loom.stock.map((s) => s.item));
  for (const it of ['potion', 'antidote', 'eye_drops', 'echo_herb', 'honey_roll', 'tent', 'wool_mantle', 'leather_hood', 'river_charm', 'scholar_robe', 'hi_potion', 'traveler_boots', 'scout_mantle', 'phoenix_feather']) assert.ok(loom.has(it), it);
  const stall = new Set(SHOPS.millrace_stall.stock.map((s) => s.item));
  for (const it of ['potion', 'hi_potion', 'ether', 'antidote', 'eye_drops', 'echo_herb', 'phoenix_feather', 'honey_roll', 'tent', 'chain_shirt', 'bronze_plate', 'iron_helm']) assert.ok(stall.has(it), it);
  // nothing here is power the existing shops do not already sell
  const sold = new Set(Object.values(SHOPS).filter((s) => !['thornfold_loom', 'millrace_stall'].includes(s.id)).flatMap((s) => s.stock.map((x) => x.item)));
  for (const it of [...loom, ...stall]) if (it !== 'honey_roll') assert.ok(sold.has(it), `${it} is already sold elsewhere`);
  // the price card
  const flags = { archive_entered: true, archive_f1_done: true };
  const before = shopStock('willowmere_items', flags);
  const after = shopStock('willowmere_items', { ...flags, pell_stamp: true });
  assert.equal(before.length, after.length);
  for (let i = 0; i < before.length; i++) {
    assert.equal(before[i].item, after[i].item);
    const list = before[i].price ?? ITEMS[before[i].item].price;
    assert.equal(before[i].price ?? list, list, 'list price until the stamp');
    assert.equal(after[i].price, Math.round(list * 0.9), `${before[i].item} a tenth off`);
  }
  assert.deepEqual(pellCardStock(pellCardStock([{ item: 'potion' }])), pellCardStock([{ item: 'potion' }]), 'idempotent');
});

test('W15: no new foe fells a full-HP party member with one ordinary action, elite or not, at its zone\'s levels', () => {
  const foes = new Map();   // enemy id -> [[zone, power]]
  for (const zid of ZONE_IDS) for (const [enc] of ZONES[zid].plan) for (const id of ENCOUNTERS[enc].enemies) {
    if (!foes.has(id)) foes.set(id, new Set());
    foes.get(id).add(zid);
    for (const p of ENEMIES[id].phases || []) for (const sid of [p.summon].flat().filter(Boolean)) { if (!foes.has(sid)) foes.set(sid, new Set()); foes.get(sid).add(zid); }
  }
  for (const [id, zones] of foes) {
    const e = ENEMIES[id];
    const boost = e.boss ? 1 : ELITE_BASE.atk;
    for (const zid of zones) {
      const z = ZONES[zid];
      for (const level of [...new Set([z.level[0], Math.max(1, z.level[0] - 1)])]) {
        const row = (LOADOUT_AT[zid] && LOADOUT_AT[zid][level]) || zid;
        const party = makeParty(row, level).map((m) => ({ m, s: memberStats(m) }));
        for (const mv of e.moves) {
          const sk = SKILLS[mv.skill];
          if (!sk.power) continue;
          for (const { m, s } of party) {
            const phys = sk.formula === 'phys';
            const A = (phys ? e.atk : e.mag) * boost;
            const D = phys ? s.def : s.spr;
            let max = A * sk.power / 100 * DEF_K / (DEF_K + D) * (1 + VARIANCE) * (sk.hits || 1);
            if (phys && ENEMY_CRIT > 0) max *= CRIT_MULT;
            if (sk.types.includes('ink')) max *= 1 - Math.min(80, s.inkRes || 0) / 100;
            assert.ok(Math.ceil(max) < s.maxHp, `${id} ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${s.maxHp} HP) at Lv ${level} in ${zid}`);
          }
        }
      }
    }
  }
});

test('no em dashes in the Episode 1 battle data, the sim additions or their docs', () => {
  const files = ['src/data/expcurve.js', 'src/data/x1/enemies.js', 'src/data/x1/encounters.js', 'src/data/x1/loot.js', 'src/data/x1/items.js', 'src/data/x1/shops.js',
    'tools/sim/x1.mjs', 'tools/sim/optional_exp.mjs', 'tools/sim/simulate.mjs', 'docs/BATTLE_X1.md', 'qa/battle/x1_rewards.test.mjs', 'qa/battle/x1_data.test.mjs', 'qa/battle/x1_levels.test.mjs'];
  for (const f of files) {
    const url = new URL(`../../${f}`, import.meta.url);
    if (!fs.existsSync(url)) continue;
    assert.ok(!fs.readFileSync(url, 'utf8').includes(String.fromCharCode(0x2014)), `${f} contains an em dash`);
  }
});
