// Shared by qa/cave/data_sanity.test.mjs and qa/cave/out/cave_sanity.mjs (C1-data): the cave party of a checkpoint floor and a
// battle runner that applies a cave encounter row the way battle/rules.js makeEnemyUnit reads it (hp, power, speed, expMul,
// the fixed elite). Not a test file (no .test suffix). C3-sim-bot's --cave route is the real thing; this is the sanity floor.
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { newMember } from '../../src/data/party.js';
import { arrivalLevel, encounterFor, foesPerFloor, scale } from '../../src/data/cave/foes.js';
import { itemLevel } from '../../src/data/cave/loot.js';

// ------------------------------------------------------------------ loadouts
// What a party that fights what it meets and wears what it finds looks like on a checkpoint floor: plain bases at the floor's
// item level (the best weapon and armour that can roll there), mastery from the fights so far (about five points a fight), a
// modest bag. A weapon key a row leaves out stays EMPTY, so B1 really is bare hands (plan 2.2).
const EMPTY = { hero: {}, mira: {}, bram: {} };
export const CAVE_LOADOUTS = {
  1: { ...EMPTY, mastery: 0, inventory: {} },
  // B1 after the first red chest: one tier 1 weapon on the hero, one potion.
  '1b': { hero: { sword: 'short_sword' }, mira: {}, bram: {}, mastery: 0, inventory: { potion: 1 } },
  5: { hero: { sword: 'short_sword', body: 'cloth_tunic' }, mira: { staff: 'oak_staff', body: 'cloth_tunic' }, bram: { spear: 'ash_spear', body: 'leather_vest' },
    mastery: 60, inventory: { potion: 3, antidote: 1 } },
  10: { hero: { sword: 'longsword', axe: 'hatchet', body: 'leather_vest', head: 'leather_hood' },
    mira: { staff: 'crystal_rod', bow: 'short_bow', body: 'leather_vest', head: 'leather_hood', charm: 'bronze_charm' },
    bram: { spear: 'iron_pike', axe: 'hatchet', body: 'leather_vest', head: 'cloth_cap', boots: 'leather_boots' },
    mastery: 180, inventory: { potion: 4, ether: 1, antidote: 1, eye_drops: 1 } },
  30: { hero: { sword: 'runed_saber', axe: 'battle_axe', body: 'chain_shirt', head: 'iron_helm', boots: 'traveler_boots', mantle: 'scout_mantle' },
    mira: { staff: 'archivist_staff', bow: 'hunters_bow', body: 'scholar_robe', head: 'silver_circlet', charm: 'owl_charm', boots: 'traveler_boots' },
    bram: { spear: 'winged_lance', axe: 'battle_axe', body: 'chain_shirt', head: 'iron_helm', boots: 'traveler_boots', charm: 'river_charm' },
    mastery: 675, inventory: { potion: 3, hi_potion: 3, ether: 2, echo_herb: 2, phoenix_feather: 1 } },
  60: { hero: { sword: 'silverglass_blade', axe: 'moonsteel_axe', body: 'silver_mail', head: 'glass_helm', boots: 'mere_boots', mantle: 'veil_mantle', charm: 'lantern_charm' },
    mira: { staff: 'mirror_rod', bow: 'glasswing_bow', body: 'mirrorweave_robe', head: 'mirror_circlet', boots: 'mere_boots', mantle: 'veil_mantle', charm: 'mirror_charm' },
    bram: { spear: 'mere_pike', axe: 'moonsteel_axe', body: 'silver_mail', head: 'glass_helm', boots: 'mere_boots', mantle: 'veil_mantle', charm: 'clock_charm' },
    mastery: 800, inventory: { hi_potion: 5, hi_ether: 2, echo_herb: 2, phoenix_feather: 2, silver_salve: 1 } },
  90: { hero: { sword: 'tempered_sword', axe: 'forge_axe', body: 'tempered_mail', head: 'forge_helm', boots: 'cinder_boots', mantle: 'carter_mantle', charm: 'coalheart_charm' },
    mira: { staff: 'founders_rod', bow: 'bellwire_bow', body: 'ashweave_robe', head: 'soot_hood', boots: 'cinder_boots', mantle: 'carter_mantle', charm: 'bellchime_charm' },
    bram: { spear: 'heartforge_pike', axe: 'forge_axe', body: 'tempered_mail', head: 'forge_helm', boots: 'cinder_boots', mantle: 'carter_mantle', charm: 'coalheart_charm' },
    mastery: 800, inventory: { hi_potion: 6, hi_ether: 3, echo_herb: 2, phoenix_feather: 2, silver_salve: 2, quench_flask: 2 } },
};
CAVE_LOADOUTS[99] = CAVE_LOADOUTS[90];
CAVE_LOADOUTS[100] = CAVE_LOADOUTS[90];

/** The checkpoint row for a floor: the nearest defined floor at or below it ('1b' is B1 after the first chest). */
export function loadoutFor(floor) {
  if (floor === '1b') return CAVE_LOADOUTS['1b'];
  const keys = Object.keys(CAVE_LOADOUTS).map(Number).filter((k) => Number.isFinite(k) && k <= floor).sort((a, b) => b - a);
  return CAVE_LOADOUTS[keys[0] || 1];
}

/** The three members for a floor: the curve's arrival level unless `level` is given; gear and mastery from the row. */
export function makeCaveParty(floor, { level, row } = {}) {
  const f = floor === '1b' ? 1 : floor;
  const L = row || loadoutFor(floor);
  const lv = level != null ? level : arrivalLevel(f);
  return ['hero', 'mira', 'bram'].map((id) => {
    const m = newMember(id, { level: lv });
    const equip = Object.fromEntries(Object.keys(m.equip).map((k) => [k, null]));
    m.equip = { ...equip, ...(L[id] || {}) };
    const weapons = Object.keys(m.mastery);
    m.weapon = weapons.find((w) => m.equip[w]) || weapons[0];
    m.mastery = Object.fromEntries(weapons.map((w) => [w, L.mastery || 0]));
    return m;
  });
}

// ------------------------------------------------------------------ battles
/** The unit specs rollEncounter should hand createBattle for a cave encounter row (with hp forwarded). */
export function unitSpecs(row) {
  return row.enemies.map((id, i) => {
    const s = { id, elite: null };
    if (row.elite && row.elite.index === i) s.elite = row.elite.mods.slice();
    if (row.power) s.power = row.power;
    if (row.speed) s.speed = row.speed;
    if (row.hp) s.hp = row.hp;
    if (row.expMul && row.expMul !== 1) s.expMul = row.expMul;
    return s;
  });
}

/** Every ordinary enemy's weaknesses known (the cave party met them all in the main game); bosses unknown. */
export function caveBestiary() {
  const out = {};
  for (const e of Object.values(ENEMIES)) if (!e.boss) out[e.id] = [...e.weak, ...e.resist, ...e.immune, ...e.absorb];
  return out;
}

/** One battle to the end. `dropHp` plays it the way the engine does before rollEncounter forwards hp. */
export function playBattle({ party, units, seed, policy = 'competent', inventory = {}, boss = false, zone = 'cave_band_1', encounter = null, dropHp = false }) {
  const rng = makeRng(seed * 7919 + 17);
  const specs = dropHp ? units.map((u) => { const c = { ...u }; delete c.hp; return c; }) : units;
  const b = createBattle({ party, enemies: specs, rng, options: { inventory: { ...inventory }, boss, canFlee: !boss, zone, encounter, bestiary: caveBestiary(), flags: [] } });
  let steps = 0, kos = 0;
  const count = (evs) => { for (const ev of evs) if (ev.type === 'ko' && b.unit(ev.target).side === 'party') kos++; };
  count(b.startEvents);
  while (!b.isOver() && steps++ < 1500) {
    const u = b.current();
    let evs;
    if (u.side === 'party') {
      evs = b.perform(partyAction(b, policy));
      if (evs.length === 1 && evs[0].type === 'invalid') evs = b.perform({ type: 'defend' });
    } else evs = b.runEnemyTurn();
    count(evs);
  }
  const r = b.result() || { outcome: 'timeout', rounds: 99 };
  const us = b.units().filter((x) => x.side === 'party');
  const maxHp = us.reduce((s, x) => s + x.maxHp, 0), hpEnd = us.reduce((s, x) => s + (x.alive ? x.hp : 0), 0);
  return { win: r.outcome === 'victory', rounds: r.rounds, hpLoss: 1 - hpEnd / maxHp, kos, exp: r.exp || 0 };
}

export function summarize(rows) {
  const n = rows.length || 1;
  const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / n;
  const sorted = rows.map((r) => r.rounds).sort((a, b) => a - b);
  return { n: rows.length, win: rows.filter((r) => r.win).length / n, rounds: avg('rounds'), p10: sorted[Math.floor(0.1 * n)] || 0,
    p90: sorted[Math.min(n - 1, Math.floor(0.9 * n))] || 0, hpLoss: avg('hpLoss'), kos: avg('kos'), exp: avg('exp') };
}

/**
 * One checkpoint: n battles over the floor's own encounter picks (encounterFor over seeds 1000 and up, every index), per policy.
 * key: a floor number or '1b'. Returns { key, floor, level, ilvl, scale, byPolicy: { policy: summary }, byTemplate }.
 */
export function checkpoint(key, { n = 40, policies = ['competent', 'naive'], dropHp = false } = {}) {
  const floor = key === '1b' ? 1 : Number(key);
  const row = loadoutFor(key);
  const level = arrivalLevel(floor);
  const out = { key, floor, level, ilvl: itemLevel(floor), scale: scale(floor), byPolicy: {}, byTemplate: {} };
  const perFloor = foesPerFloor(floor) || 4;
  for (const policy of policies) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const enc = encounterFor(1000 + Math.floor(i / perFloor), floor, i % perFloor);
      const party = makeCaveParty(key, { level, row });
      const r = playBattle({ party, units: unitSpecs(enc), seed: i + 1, policy, inventory: row.inventory, zone: enc.zone, dropHp });
      r.template = enc.template + (enc.elite ? ' (elite)' : '');
      rows.push(r);
      if (policy === 'competent') (out.byTemplate[r.template] = out.byTemplate[r.template] || []).push(r);
    }
    out.byPolicy[policy] = summarize(rows);
  }
  for (const [t, rows] of Object.entries(out.byTemplate)) out.byTemplate[t] = summarize(rows);
  return out;
}
