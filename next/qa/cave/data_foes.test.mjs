// C1-data: the Deep Stacks' bands, pools, scaling curve, encounter helpers and the Binder (src/data/cave/foes.js) against
// docs/DEEP_STACKS_PLAN.md 2.4, 4, 5 and the C1-data brief.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import register from '../../src/data/cave/index.js';
import * as F from '../../src/data/cave/foes.js';
import { ENEMIES, ELITE_BASE, ELITE_MODS, RANDOM_ELITE_MODS } from '../../src/data/enemies.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, OPTIONAL_ZONES, rollEncounter } from '../../src/data/encounters.js';
import { SKILLS, DAMAGE_TYPES, STATUSES } from '../../src/data/skills.js';
import { BOSS_LOOT } from '../../src/data/loot-tables.js';
import { createBattle, makeRng } from '../../src/battle/rules.js';
import { newMember } from '../../src/data/party.js';
import { createRng } from '../../src/core/rng.js';

await register();

const EP3_FOES = ['cinder_hound', 'cinder_beetle', 'slag_slime', 'ashbound_miner', 'soot_phantom', 'furnace_construct', 'forge_defender'];
const MUSIC = Object.keys(JSON.parse(fs.readFileSync(new URL('../../assets/audio/manifest.json', import.meta.url), 'utf8')).music);

test('five bands cover B1 to B99 in order, with the plan\'s tilesets and existing music', () => {
  assert.equal(F.BANDS.length, 5);
  assert.deepEqual(F.BANDS.map((b) => b.floors), [[1, 19], [20, 39], [40, 59], [60, 79], [80, 99]]);
  assert.deepEqual(F.BANDS.map((b) => b.tileset), ['archive', 'hollow', 'court', 'ember', 'forge']);
  for (const b of F.BANDS) {
    assert.ok(MUSIC.includes(b.music), `${b.id} music ${b.music}`);
    assert.ok(b.name && b.id && b.k === F.BANDS.indexOf(b) + 1);
    assert.ok(b.pool.length >= 6 && b.pool.length <= 10, `${b.id} has ${b.pool.length} templates`);
    assert.ok(b.nativeLevel > 1 && b.meanExp > 5);
  }
  for (let f = 1; f <= 99; f++) { const b = F.bandAt(f); assert.ok(f >= b.floors[0] && f <= b.floors[1], `B${f} in ${b.id}`); }
  assert.equal(F.bandIndex(100), 5);
});

test('every pool foe exists; each template has a leader that is its first foe, a weight and a field move', () => {
  for (const bands of [F.buildBands(false), F.buildBands(true)]) {
    for (const b of bands) for (const t of b.pool) {
      assert.ok(t.id && t.weight > 0, `${b.id}/${t.id}`);
      assert.ok(['chase', 'wander'].includes(t.move), `${b.id}/${t.id} move`);
      assert.ok(t.enemies.length >= 2 && t.enemies.length <= 4, `${b.id}/${t.id} size`);
      assert.equal(t.leader, t.enemies[0]);
      for (const id of t.enemies) { assert.ok(ENEMIES[id], `${b.id}/${t.id}: ${id}`); assert.ok(!ENEMIES[id].boss, `${id} is a boss`); }
      if (t.elite) assert.equal(t.elite, 2);
    }
  }
});

test('EP3_LIVE false: bands 4 and 5 fall back to the hardest earlier pools with a two-mod elite on every group; live uses the Episode 3 foes', async () => {
  const off = F.buildBands(false), on = F.buildBands(true);
  for (const k of [3, 4]) {
    assert.ok(off[k].fallback && !on[k].fallback);
    for (const t of off[k].pool) { assert.equal(t.elite, 2, `${off[k].id}/${t.id}`); for (const id of t.enemies) assert.ok(!EP3_FOES.includes(id), id); }
    assert.ok(on[k].pool.some((t) => t.enemies.some((id) => EP3_FOES.includes(id))), `${on[k].id} live uses Episode 3 foes`);
  }
  for (const k of [0, 1, 2]) assert.deepEqual(off[k].pool.map((t) => t.id), on[k].pool.map((t) => t.id));
  assert.ok(on[4].pool.some((t) => t.elite === 2), 'the Forge of Names keeps the earlier pools\' elites when live');
  // the live table is whichever the switch says
  const { EP3_LIVE } = await import('../../src/game/episodes.js');
  assert.equal(F.BANDS[3].fallback, !EP3_LIVE);
});

test('floors: foes per floor, landings, item level, zone ids', () => {
  assert.equal(F.foesPerFloor(1), 4); assert.equal(F.foesPerFloor(9), 4); assert.equal(F.foesPerFloor(11), 5);
  assert.equal(F.foesPerFloor(79), 11); assert.equal(F.foesPerFloor(81), 12); assert.equal(F.foesPerFloor(99), 12);
  for (const f of [10, 20, 50, 90]) { assert.ok(F.isLanding(f)); assert.equal(F.foesPerFloor(f), 0); }
  assert.ok(!F.isLanding(100) && F.foesPerFloor(100) === 0 && !F.isLanding(5));
  assert.deepEqual([1, 5, 6, 12, 30, 60, 89, 90, 99, 100].map(F.itemLevel), [1, 1, 2, 3, 6, 11, 15, 16, 16, 16]);
  assert.equal(F.zoneIdFor(1), 'cave_band_1'); assert.equal(F.zoneIdFor(59), 'cave_band_3'); assert.equal(F.zoneIdFor(100), 'cave_boss');
});

test('the level curve: the EXP pace lands the plan\'s levels (12 by B10, 25 by B30, 40 by B60, 55 by B90), continuous pace', () => {
  assert.equal(Math.round(F.targetLevel(0)), 1);
  for (const [f, lv] of [[9, 12], [29, 25], [59, 40], [89, 55], [99, 59]]) assert.ok(Math.abs(F.targetLevel(f) - lv) < 0.6, `leaving B${f}: Lv ${F.targetLevel(f).toFixed(2)} (want ${lv})`);
  assert.deepEqual([1, 10, 30, 60, 90].map((f) => F.arrivalLevel(f)), [1, 12, 25, 40, 55]);
  assert.equal(F.EXP_PACE_KNOTS.length, 6);
  for (const [, p] of F.EXP_PACE_KNOTS) assert.ok(p >= 0.5 && p <= 4, `pace ${p}`);
  for (let f = 1; f < 99; f++) {
    const a = F.scale(f).expMul, b = F.scale(f + 1).expMul;
    assert.ok(a > 0 && Math.abs(b - a) < 0.3, `expMul B${f} ${a} -> B${f + 1} ${b}`);
  }
  assert.ok(F.scale(1).expMul >= F.EXP_BASE_MUL, 'the Stacks pay at least the plan\'s 1.5x at the top');
  // a landing pays like the floor before it (it fights nothing) and expPace is expMul over the base
  assert.equal(F.scale(10).expMul, F.scale(9).expMul);
  assert.equal(F.expPace(30), Math.round(F.scale(30).expMul / F.EXP_BASE_MUL * 100) / 100);
  // the fit is EXP-consistent: a party that fought every foe holds the curve's EXP
  let exp = 0;
  for (let f = 1; f <= 99; f++) exp += F.foesPerFloor(f) * F.bandAt(f).meanExp * F.scale(f).expMul;
  assert.ok(Math.abs(exp - F.expByFloor(99)) < 1);
});

test('scale(floor): sane bounds, elites from B20 and two mods from B50, raw multipliers rise within a band, strength rises across bands', () => {
  // time to kill: HP times the armour term (a Court foe with DEF 24 takes twice the hits of a wraith with DEF 5 at the same HP)
  const ttk = (id, elite) => ENEMIES[id].hp * (elite ? ELITE_BASE.hp : 1) * (24 + ENEMIES[id].def) / 24;
  const meanHp = (b) => b.pool.reduce((s, t) => s + t.weight * t.enemies.reduce((a, id, i) => a + ttk(id, t.elite && i === 0), 0) / t.enemies.length, 0) / b.pool.reduce((s, t) => s + t.weight, 0);
  const meanAtk = (b) => b.pool.reduce((s, t) => s + t.weight * t.enemies.reduce((a, id) => a + Math.max(ENEMIES[id].atk, ENEMIES[id].mag), 0) / t.enemies.length, 0) / b.pool.reduce((s, t) => s + t.weight, 0);
  let prev = null, prevEff = null;
  for (let f = 1; f <= 100; f++) {
    const s = F.scale(f);
    for (const k of ['hp', 'power', 'speed', 'expMul']) assert.ok(Number.isFinite(s[k]) && s[k] > 0, `B${f} ${k}`);
    assert.ok(s.hp >= 0.3 && s.hp <= 30, `B${f} hp ${s.hp}`);
    assert.ok(s.power >= 0.3 && s.power <= F.TUNING.powerCap, `B${f} power ${s.power}`);
    assert.ok(s.speed >= 0.8 && s.speed <= F.SPEED_CAP, `B${f} speed ${s.speed}`);
    assert.equal(s.elite, f < 20 ? 0 : f < 50 ? 1 : 2, `B${f} elite`);
    assert.ok(s.power <= F.powerCapAt(f) + 0.011, `B${f} power ${s.power} over the one-shot cap ${F.powerCapAt(f)}`);
    if (f <= 99) {
      const b = F.bandAt(f);
      const eff = { hp: s.hp * meanHp(b), power: s.power * meanAtk(b) };
      if (prev && F.bandIndex(f) === F.bandIndex(f - 1) && f > 2) {   // B1 and B2 carry the opening ease
        // after a landing the level stands still while the negative hp ramp moves a hair: allow a 2% dip, never more
        assert.ok(s.hp >= prev.hp * 0.98 && s.speed >= prev.speed - 0.011, `B${f} raw hp/speed fell inside ${b.id}`);
        assert.ok(s.power >= prev.power - 0.011 || s.power >= F.powerCapAt(f) - 0.011, `B${f} raw power fell inside ${b.id}`);
      }
      if (prevEff && f > 2) assert.ok(eff.hp >= prevEff.hp * 0.85, `B${f} effective HP ${eff.hp.toFixed(0)} dropped from ${prevEff.hp.toFixed(0)}`);
      prev = s; prevEff = eff;
    }
  }
  const [s1, s10, s30, s60, s99] = [1, 10, 30, 60, 99].map((f) => F.scale(f));
  assert.ok(s1.hp < 0.8 && s1.power < 1, 'B1 is gentler than the valley (three Lv 1 members, empty hands)');
  assert.ok(s10.hp > s1.hp * 2 && s30.hp > s10.hp && s99.power > s60.power && s99.speed > s30.speed);
  // a different band table (EP3 live) gives its own curve without touching the live one
  const live = F.buildBands(true);
  const s70 = F.scale(70, { bands: live });
  assert.ok(s70.hp > 0 && s70.hp !== F.scale(70).hp);
  assert.equal(F.scale(70).hp, F.scale(70).hp);
});

test('encounterFor is deterministic, picks from the band\'s pool, carries the scale, fixes elites by depth', () => {
  const a = F.encounterFor(7, 23, 1), b = F.encounterFor(7, 23, 1);
  assert.deepEqual(a, b);
  assert.equal(a.id, 'cave_b23_e1'); assert.equal(a.zone, 'cave_band_2'); assert.equal(a.floor, 23); assert.equal(a.band, 2);
  assert.ok(a.cave && a.noElite && !a.noFlee && a.music === 'battle');
  assert.ok(F.BANDS[1].pool.some((t) => t.id === a.template && t.enemies.join() === a.enemies.join() && t.leader === a.leader && t.move === a.move));
  const s = F.scale(23);
  assert.deepEqual([a.hp, a.power, a.speed, a.expMul], [s.hp, s.power, s.speed, s.expMul]);
  assert.notDeepEqual(F.encounterFor(8, 23, 1).template + F.encounterFor(8, 23, 2).template + F.encounterFor(8, 23, 3).template, a.template.repeat(3), 'seeds and indexes vary the pick');
  // elites: none before B20; one mod to B49; two from B50 (fixed in the spec); the rate is the deep rate
  const count = (floor, n = 400) => {
    let elites = 0, two = 0;
    for (let i = 0; i < n; i++) { const e = F.encounterFor(i, floor, i % 4); if (e.elite) { elites++; if (e.elite.mods.length === 2) two++; assert.equal(e.elite.index, 0); for (const m of e.elite.mods) assert.ok(RANDOM_ELITE_MODS.includes(m), m); } }
    return { elites: elites / n, two: two / n };
  };
  assert.equal(count(5).elites, 0); assert.equal(count(19).elites, 0);
  const b30 = count(30); assert.ok(b30.elites > 0.05 && b30.elites < 0.25 && b30.two === 0, JSON.stringify(b30));
  const b55 = count(55); assert.ok(b55.elites > 0.1 && b55.elites < 0.35 && b55.two === b55.elites, JSON.stringify(b55));
  const b85 = count(85); assert.equal(b85.elites, 1, 'the Forge of Names (fallback): every group has a two-mod elite'); assert.equal(b85.two, 1);
  assert.equal(F.encounterFor(1, 100, 0).floor, 99, 'B100 has no ordinary encounters: the index clamps to B99');
});

test('floorEncounters and registerFloorEncounters: foesPerFloor specs, idempotent, nothing cleared, playable through rollEncounter', () => {
  const specs = F.floorEncounters(2024, 33);
  assert.equal(specs.length, F.foesPerFloor(33));
  assert.deepEqual(specs.map((s) => s.id), specs.map((_, i) => `cave_b33_e${i}`));
  assert.deepEqual(F.floorEncounters(2024, 10), []);
  const before = Object.keys(ENCOUNTERS).length;
  const r1 = F.registerFloorEncounters(specs);
  assert.deepEqual(r1, { added: specs.map((s) => s.id), kept: [] });
  const r2 = F.registerFloorEncounters(specs);
  assert.deepEqual(r2, { added: [], kept: specs.map((s) => s.id) });
  assert.equal(Object.keys(ENCOUNTERS).length, before + specs.length);
  for (const s of specs) {
    const e = ENCOUNTERS[s.id];
    assert.equal(e.zone, 'cave_band_2'); assert.equal(e.boss, false); assert.ok(e.noElite);
    assert.deepEqual(e.enemies, s.enemies); assert.equal(e.hp, s.hp); assert.equal(e.power, s.power); assert.equal(e.expMul, s.expMul);
    const roll = rollEncounter(s.id, createRng(1));
    assert.equal(roll.enemies.length, s.enemies.length);
    for (const u of roll.enemies) { assert.equal(u.power, s.power); assert.equal(u.speed, s.speed); assert.equal(u.expMul, s.expMul); }
    if (s.elite) assert.deepEqual(roll.enemies[0].elite, s.elite.mods); else assert.ok(roll.enemies.every((u) => !u.elite), 'noElite: no random elite on top');
  }
  // the unit builder honours spec.hp (rules.js makeEnemyUnit); the forwarding line in rollEncounter is the integrator's one-liner
  const s0 = specs[0];
  const b = createBattle({ party: [newMember('hero', { level: 30 })], enemies: s0.enemies.map((id) => ({ id, elite: null, hp: s0.hp, power: s0.power, speed: s0.speed })), rng: makeRng(1), options: { zone: s0.zone } });
  const u = b.units().find((x) => x.side === 'enemy');
  assert.equal(u.maxHp, Math.round(ENEMIES[u.id].hp * s0.hp));
  assert.equal(u.stats.atk, Math.round(ENEMIES[u.id].atk * s0.power));
  assert.ok(!F.registerFloorEncounters(null).added.length && !F.registerFloorEncounters([{}]).added.length);
});

test('zones: cave_band_1..5 and cave_boss resolve on ZONES but are not listed, never on a route, never counted by progression', () => {
  for (const id of F.CAVE_ZONE_IDS) {
    const z = ZONES[id];
    assert.ok(z && z.id === id && z.cave && z.optional, id);
    assert.ok(!Object.keys(ZONES).includes(id), `${id} is not enumerable (qa/maps wants a map per listed zone)`);
    assert.ok(!ZONE_ORDER.includes(id) && !OPTIONAL_ZONES.includes(id));
    assert.ok(z.backdrop && z.music && Array.isArray(z.plan));
  }
  assert.deepEqual(ZONES.cave_band_1.level, [1, 16]); assert.deepEqual(ZONES.cave_band_5.level, [51, 59]);
  assert.deepEqual(ZONES.cave_boss.plan, [['cave_binder', 1]]);
});

test('the Binder: level 58, the Archivore\'s kit, three phases, fleeless boss encounter, the Quill as its drop', () => {
  const e = ENEMIES.binder;
  assert.ok(e && e.boss && e.ai === 'archivore' && e.level === 58 && e.size === 'boss');
  assert.equal(e.phases.length, 3);
  assert.deepEqual(e.phases.map((p) => p.at), [1, 0.7, 0.3]);
  assert.equal(e.phases[1].summon, 2); assert.ok(e.phases[2].haste);
  for (const p of e.phases) { assert.ok(p.id && p.name && p.text && p.shields > 0); for (const t of [...p.weak, ...p.resist]) assert.ok(DAMAGE_TYPES.includes(t), t); }
  for (const m of e.moves) assert.ok(SKILLS[m.skill] && !SKILLS[m.skill].telegraph, m.skill);
  for (const t of [...e.weak, ...e.resist]) assert.ok(DAMAGE_TYPES.includes(t), t);
  for (const s of e.statusImmune) assert.ok(STATUSES[s], s);
  for (const k of ['hp', 'atk', 'def', 'mag', 'spr', 'spd', 'exp', 'gold', 'masteryPts']) assert.ok(e[k] > 0, k);
  assert.ok(e.hp > ENEMIES.cinder_warden.hp && e.atk > ENEMIES.cinder_warden.atk, 'the game\'s hardest fight');
  assert.equal(e.uniqueDrop, 'cave_binders_quill'); assert.equal(BOSS_LOOT.binder.unique, 'cave_binders_quill');
  assert.ok(e.flavor && !e.flavor.includes(String.fromCharCode(0x2014)));
  const enc = ENCOUNTERS.cave_binder;
  assert.ok(enc.boss && enc.noFlee && enc.canFlee === false && enc.noElite);
  assert.deepEqual(enc.enemies, ['binder']); assert.equal(enc.zone, 'cave_boss'); assert.equal(enc.flag, 'deep_stacks_cleared');
  assert.ok(MUSIC.includes(enc.music));
  assert.equal(enc.bossLoot, 'binder');
  // the archivore script reads the phases the way the Archivore's are written
  const a = ENEMIES.archivore;
  for (const p of e.phases) for (const k of Object.keys(a.phases[0])) assert.ok(k in p || k === 'summon', `phase key ${k}`);
});

test('elite mods the Stacks roll are the random ones; every encounter carries the one-shot-safe power', () => {
  for (const m of RANDOM_ELITE_MODS) assert.ok(ELITE_MODS[m] && !ELITE_MODS[m].fixed);
  for (const f of [1, 15, 30, 45, 60, 75, 90, 99]) assert.ok(F.scale(f).power <= F.powerCapAt(f) + 0.011, `B${f}`);
});
