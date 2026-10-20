// Referential integrity of every battle data id, text rules, growth curves, and the DESIGN 7 rule
// "a full-HP party at the expected level survives any single non-telegraphed enemy action".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SKILLS, STATUSES, DAMAGE_TYPES, WEAPON_TYPES, ENEMY_TYPES, FURY_ARTS, WEAPON_TECHS } from '../../src/data/skills.js';
import { PARTY, PARTY_IDS, statsAt, STAT_KEYS, expForLevel, levelForExp, MASTERY_XP, newMember, knownSkills,
  grantExp, grantMastery } from '../../src/data/party.js';
import { ITEMS, EQUIPMENT, UNIQUES, SETS, AFFIXES, CONSUMABLES, KEY_ITEMS, RARITIES, canEquip } from '../../src/data/items.js';
import { ENEMIES, ELITE_MODS, LOST_PAGE_VARIANTS, ELITE_BASE, RANDOM_ELITE_MODS } from '../../src/data/enemies.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, rollEncounter } from '../../src/data/encounters.js';
import { SHOPS } from '../../src/data/shops.js';
import { BOSS_LOOT, RARITY_TABLES, ZONE_LOOT } from '../../src/data/loot-tables.js';
import { memberStats, DEF_K, VARIANCE, ENEMY_CRIT, CRIT_MULT, makeRng } from '../../src/battle/rules.js';
import { makeParty, progression } from '../../tools/sim/simulate.mjs';

const COMMON_ENEMIES = ['ink_slime', 'page_wraith', 'briar_wolf', 'moss_scarab', 'bookmite', 'tome_golem', 'ink_wraith',
  'echo_warden', 'lost_page', 'archivore'];
const COMMON_KEYS = ['lantern_of_recall', 'archive_key', 'stacks_key', 'tess_letter_1', 'tess_letter_2', 'tess_letter_3', 'name_fragment_1'];

test('COMMON.md canonical ids exist', () => {
  for (const id of COMMON_ENEMIES) assert.ok(ENEMIES[id], id);
  for (const id of COMMON_KEYS) assert.ok(KEY_ITEMS[id] && ITEMS[id], id);
  assert.deepEqual(PARTY_IDS, ['hero', 'mira', 'bram']);
  assert.deepEqual(PARTY.hero.weapons, ['sword', 'axe']);
  assert.deepEqual(PARTY.mira.weapons, ['staff', 'bow']);
  assert.deepEqual(PARTY.bram.weapons, ['spear', 'axe']);
});

test('skills: valid kinds, targets, types, statuses, short help', () => {
  const targets = ['enemy', 'enemies', 'random', 'ally', 'allies', 'self', 'ko_ally', 'boss', 'none'];
  for (const s of Object.values(SKILLS)) {
    assert.ok(s.name && s.help, s.id);
    assert.ok(s.help.length <= 40, `${s.id} help is ${s.help.length} chars`);
    assert.ok(targets.includes(s.target), `${s.id} target ${s.target}`);
    for (const t of s.types) assert.ok(t === '$weapon' || DAMAGE_TYPES.includes(t) || ENEMY_TYPES.includes(t), `${s.id} type ${t}`);
    for (const e of s.effects) {
      if (e.status) assert.ok(STATUSES[e.status], `${s.id} status ${e.status}`);
      if (e.selfStatus) assert.ok(STATUSES[e.selfStatus]);
      if (e.cure) for (const c of e.cure) assert.ok(STATUSES[c]);
    }
    if (s.weapon) assert.ok(WEAPON_TYPES.includes(s.weapon));
    if (s.user) assert.ok(PARTY[s.user]);
    if (s.kind === 'combo') {
      for (const m of s.members) assert.ok(PARTY[m] && s.cost[m] >= 0);
      for (const p of s.parts) assert.ok(s.members.includes(p.by));
    }
    if (s.telegraph) assert.equal(s.kind, 'enemy');
  }
  for (const w of WEAPON_TYPES) {
    assert.ok(WEAPON_TECHS[w].length >= 2 && WEAPON_TECHS[w].length <= 3, `${w} techs`);
    assert.ok(FURY_ARTS[w], `${w} fury art`);
  }
  for (const st of Object.values(STATUSES)) assert.ok(st.help.length <= 40 && st.icon);
  const combos = Object.values(SKILLS).filter((s) => s.kind === 'combo').map((s) => s.name);
  assert.deepEqual(combos.sort(), ['Cross Rend', 'Dawnname', 'Ember Edge', 'Thorn Bulwark']);
});

test('enemies: stats, skills, weaknesses and loot zones are valid', () => {
  for (const e of Object.values(ENEMIES)) {
    for (const k of ['hp', 'atk', 'def', 'mag', 'spr', 'spd', 'shields', 'exp', 'gold']) assert.ok(Number.isFinite(e[k]) && e[k] >= 0, `${e.id}.${k}`);
    assert.ok(e.moves.length >= 1, `${e.id} moves`);
    for (const m of e.moves) assert.ok(SKILLS[m.skill] && SKILLS[m.skill].kind === 'enemy' && !SKILLS[m.skill].telegraph, `${e.id} move ${m.skill}`);
    assert.ok(e.moves.some((m) => SKILLS[m.skill].power > 0), `${e.id} can hurt`);
    if (e.charge) assert.ok(SKILLS[e.charge.skill] && SKILLS[e.charge.skill].telegraph, `${e.id} charge`);
    for (const t of [...e.weak, ...e.resist, ...e.immune, ...e.absorb]) assert.ok(DAMAGE_TYPES.includes(t), `${e.id} ${t}`);
    for (const s of e.statusImmune) assert.ok(STATUSES[s]);
    for (const d of e.drops) assert.ok(CONSUMABLES[d.item], `${e.id} drop ${d.item}`);
    if (e.lootZone) assert.ok(ZONE_LOOT[e.lootZone], `${e.id} lootZone`);
    if (e.uniqueDrop) assert.ok(UNIQUES[e.uniqueDrop]);
    if (e.stances) for (const st of Object.values(e.stances)) for (const t of st.weak) assert.ok(DAMAGE_TYPES.includes(t));
    if (e.phases) for (const p of e.phases) for (const t of [...p.weak, ...p.resist]) assert.ok(DAMAGE_TYPES.includes(t));
  }
  for (const v of LOST_PAGE_VARIANTS) for (const t of v.weak) assert.ok(DAMAGE_TYPES.includes(t));
  assert.equal(new Set(LOST_PAGE_VARIANTS.map((v) => v.weak.join())).size, LOST_PAGE_VARIANTS.length, 'each page reads differently');
  // W10: two fixed story tiers (the Elder Briar Alpha) sit beside the five random modifiers and never roll
  assert.deepEqual(Object.keys(ELITE_MODS).sort(), ['cursed', 'elder', 'elder_ii', 'splitting', 'stoneskin', 'swift', 'vampiric']);
  assert.deepEqual([...RANDOM_ELITE_MODS].sort(), ['cursed', 'splitting', 'stoneskin', 'swift', 'vampiric']);
  assert.ok(ENEMIES.archivore.phases.length === 3);
});

test('encounters, zones, shops, loot tables and party kits reference real ids', () => {
  for (const enc of Object.values(ENCOUNTERS)) {
    for (const id of enc.enemies) assert.ok(ENEMIES[id], `${enc.id}: ${id}`);
    assert.ok(enc.enemies.includes(enc.leader), `${enc.id} leader`);
    assert.ok(ZONES[enc.zone], `${enc.id} zone`);
  }
  for (const z of ZONE_ORDER) for (const [enc, n] of ZONES[z].plan) assert.ok(ENCOUNTERS[enc] && n > 0, `${z} ${enc}`);
  for (const shop of Object.values(SHOPS)) {
    for (const s of shop.stock) {
      const it = ITEMS[s.item];
      assert.ok(it && !it.key, `${shop.id}: ${s.item}`);
      assert.ok((s.price ?? it.price) > 0);
    }
  }
  for (const [boss, rule] of Object.entries(BOSS_LOOT)) {
    assert.ok(ENEMIES[boss] && (rule.unique === null || UNIQUES[rule.unique]) && RARITY_TABLES[rule.table]);
    for (const c of rule.consumables) assert.ok(CONSUMABLES[c.item]);
  }
  for (const id of PARTY_IDS) {
    const def = PARTY[id];
    for (const [slot, item] of Object.entries(def.start.equip)) {
      if (!item) continue;
      const base = EQUIPMENT[item];
      assert.ok(base, `${id} ${item}`);
      assert.ok(canEquip(id, def.weapons, base), `${id} cannot equip ${item}`);
      assert.equal(base.slot === 'weapon' ? base.type : base.slot, slot, `${id} ${item} in ${slot}`);
    }
  }
  for (const set of Object.values(SETS)) for (const p of set.pieces) assert.equal(UNIQUES[p].set, set.id);
  for (const u of Object.values(UNIQUES)) assert.ok(RARITIES[u.rarity]);
  for (const a of Object.values(AFFIXES)) {
    for (const t of a.tiers) assert.ok(t[1] <= t[2]);
    for (let i = 1; i < a.tiers.length; i++) assert.ok(a.tiers[i][0] > a.tiers[i - 1][0]);
  }
  for (const e of Object.values(EQUIPMENT)) if (e.slot === 'weapon') assert.ok(WEAPON_TYPES.includes(e.type));
  const r = rollEncounter('valley_wolves', makeRng(1), { forceElite: ['swift', 'vampiric'] });
  assert.equal(r.enemies.filter((e) => e.elite).length, 1);
});

test('growth: stats never drop, EXP and mastery curves rise, level helpers agree', () => {
  for (const id of PARTY_IDS) {
    let prev = statsAt(id, 1);
    for (let L = 2; L <= 99; L++) {
      const s = statsAt(id, L);
      for (const k of STAT_KEYS) assert.ok(s[k] >= prev[k], `${id} ${k} drops at ${L}`);
      prev = s;
    }
  }
  for (let L = 2; L <= 99; L++) {
    assert.ok(expForLevel(L) > expForLevel(L - 1));
    assert.equal(levelForExp(expForLevel(L)), L);
    assert.equal(levelForExp(expForLevel(L) - 1), L - 1);
  }
  for (let i = 1; i < MASTERY_XP.length; i++) assert.ok(MASTERY_XP[i] > MASTERY_XP[i - 1]);
  const m = newMember('mira');
  assert.ok(knownSkills(m).includes('ember') && knownSkills(m).includes('appraise') && !knownSkills(m).includes('spark'));
  const up = grantExp(m, expForLevel(4));
  assert.equal(m.level, 4);
  assert.ok(up.levelUps.length === 3 && up.levelUps.some((l) => l.learned.includes('spark')));
  const ms = grantMastery(m, 'bow', 80);
  assert.equal(ms.to, 3);
  assert.ok(ms.unlocked.includes('fury_starfall') && ms.unlocked.includes('volley'));
});

test('no em dashes in battle data, rules, tools or docs', () => {
  const files = ['src/data/skills.js', 'src/data/party.js', 'src/data/items.js', 'src/data/enemies.js',
    'src/data/encounters.js', 'src/data/loot-tables.js', 'src/data/shops.js', 'src/battle/rules.js', 'src/battle/ctb.js',
    'src/battle/ai.js', 'src/battle/loot.js', 'src/battle/status.js', 'tools/sim/simulate.mjs', 'docs/BATTLE.md'];
  for (const f of files) {
    const url = new URL(`../../${f}`, import.meta.url);
    if (!fs.existsSync(url)) continue;
    assert.ok(!fs.readFileSync(url, 'utf8').includes(String.fromCharCode(0x2014)), `${f} contains an em dash`);
  }
});

test('a full-HP party at the expected level survives any single non-telegraphed enemy action', () => {
  // first zone each enemy appears in, and the party's level on entering it (one level lower too)
  const firstZone = {};
  for (const z of ZONE_ORDER) for (const [enc] of ZONES[z].plan) for (const id of ENCOUNTERS[enc].enemies) firstZone[id] = firstZone[id] || z;
  firstZone.lost_page = 'archive_boss';
  const entry = Object.fromEntries(progression(1).map((p) => [p.zone, p.startLevel]));
  for (const [id, zone] of Object.entries(firstZone)) {
    const e = ENEMIES[id];
    const boost = e.boss ? 1 : ELITE_BASE.atk; // assume an elite
    for (const level of [entry[zone], Math.max(1, entry[zone] - 1)]) {
      const party = makeParty(zone, level).map((m) => ({ m, s: memberStats(m) }));
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
          assert.ok(Math.ceil(max) < s.maxHp, `${id} ${sk.id} can deal ${Math.ceil(max)} to ${m.id} (${s.maxHp} HP) at Lv ${level}`);
        }
      }
    }
  }
});
