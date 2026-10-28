// C1-data: the cave pack entry (src/data/cave/index.js, live.js): register() is idempotent, adds exactly the ids it says and
// nothing else, the switch is on (since 2026-10-28), and nothing in the cave files carries an em dash. Snapshots the shared tables BEFORE
// register(), so this file must not import anything that registers at load.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ITEMS, UNIQUES, KEY_ITEMS, CONSUMABLES, EQUIPMENT, SETS } from '../../src/data/items.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, OPTIONAL_ZONES, EP2_ZONE_ORDER, EP3_ZONE_ORDER } from '../../src/data/encounters.js';
import { ZONE_LOOT, BOSS_LOOT, RARITY_TABLES, CHEST_TIERS } from '../../src/data/loot-tables.js';
import { SKILLS } from '../../src/data/skills.js';
import { SHOPS } from '../../src/data/shops.js';
import { PACKS, packReady } from '../../src/game/packs.js';
import { CAVE_LIVE, caveOn } from '../../src/data/cave/live.js';
import * as pack from '../../src/data/cave/index.js';

const keys = (o) => Object.keys(o).slice().sort();
const snap = () => ({
  items: keys(ITEMS), uniques: keys(UNIQUES), keyItems: keys(KEY_ITEMS), consumables: keys(CONSUMABLES), equipment: keys(EQUIPMENT), sets: keys(SETS),
  enemies: keys(ENEMIES), encounters: keys(ENCOUNTERS), zones: keys(ZONES), zoneOrder: ZONE_ORDER.slice(), optional: OPTIONAL_ZONES.slice(),
  ep2: EP2_ZONE_ORDER.slice(), ep3: EP3_ZONE_ORDER.slice(), zoneLoot: keys(ZONE_LOOT), bossLoot: keys(BOSS_LOOT), rarity: keys(RARITY_TABLES),
  chests: keys(CHEST_TIERS), skills: keys(SKILLS), shops: keys(SHOPS),
});
const before = snap();
const first = pack.register();
const result = await first;
const after = snap();

// C4-uniques: the sixty in three grades and the Quill (src/data/cave/items.js)
const UNIQUE_IDS = ['cave_alum_jerkin', 'cave_anvil_coat', 'cave_anvil_spark', 'cave_ash_helm', 'cave_ashwind_mantle', 'cave_bailiff_hatchet',
  'cave_banked_coal', 'cave_binders_mark', 'cave_binders_quill', 'cave_catalogue_pen', 'cave_catalogue_seal', 'cave_cellar_clogs', 'cave_cellar_key',
  'cave_cinder_shoes', 'cave_cinder_stride', 'cave_cistern_charm', 'cave_clemency_circlet', 'cave_clerk_gown', 'cave_contempt_mantle',
  'cave_court_word', 'cave_damp_mantle', 'cave_deep_well_mantle', 'cave_draught_candle', 'cave_drip_cloak', 'cave_ember_hauberk',
  'cave_ember_reader', 'cave_forge_binding', 'cave_gavel_charm', 'cave_glass_coat', 'cave_hearth_charm', 'cave_indexer_robe', 'cave_juror_mantle',
  'cave_kindling_boots', 'cave_ladder_boots', 'cave_lamp_rod', 'cave_lampwick', 'cave_lector_circlet', 'cave_name_mantle', 'cave_quench_axe',
  'cave_reader_diadem', 'cave_reading_hood', 'cave_record_rod', 'cave_ribbon_mantle', 'cave_root_boots', 'cave_rootspur', 'cave_rootweave',
  'cave_runner_boots', 'cave_scorch_cowl', 'cave_sergeant_helm', 'cave_shelf_mail', 'cave_smith_apron', 'cave_smoke_mantle', 'cave_soot_cap',
  'cave_sparkwrit', 'cave_spur_boots', 'cave_taproot_pike', 'cave_twice_read', 'cave_usher_helm', 'cave_vellum_robe', 'cave_wellspring_boots',
  'cave_writ_coat'];
const diff = (a, b) => b.filter((k) => !a.includes(k)).sort();

test('register() resolves the X1 shape, is idempotent, and flips CAVE_READY', async () => {
  assert.equal(result.id, 'cave');
  for (const m of ['items', 'loot', 'foes']) assert.ok(result.loaded.includes(m), m);
  for (const m of result.skipped) assert.ok(['story', 'text'].includes(m), `${m} skipped: a module that exists must load`);
  assert.deepEqual(pack.ORDER, ['items', 'loot', 'foes', 'story', 'text', 'world']);   // world: C2-world's glue, registered last
  assert.equal(pack.ID, 'cave');
  assert.equal(pack.register(), first, 'the same promise after success');
  assert.deepEqual(await pack.register(), result);
  assert.equal(pack.CAVE_READY, true);
  assert.deepEqual(snap(), after, 'a second register() changes nothing');
  assert.ok(pack.modules().items && pack.modules().loot && pack.modules().foes);
});

test('register() adds exactly the documented ids and touches nothing else', () => {
  assert.deepEqual(diff(before.uniques, after.uniques), UNIQUE_IDS);
  assert.deepEqual(diff(before.keyItems, after.keyItems), ['keepers_bookmark']);
  assert.deepEqual(diff(before.items, after.items), [...UNIQUE_IDS, 'keepers_bookmark'].sort());
  assert.deepEqual(diff(before.enemies, after.enemies), ['binder']);
  assert.deepEqual(diff(before.encounters, after.encounters), ['cave_binder']);
  assert.deepEqual(diff(before.zoneLoot, after.zoneLoot), ['cave_band_1', 'cave_band_2', 'cave_band_3', 'cave_band_4', 'cave_band_5']);
  assert.deepEqual(diff(before.bossLoot, after.bossLoot), ['binder']);
  // the band zones resolve but are not listed; nothing else moved
  for (const id of ['cave_band_1', 'cave_band_2', 'cave_band_3', 'cave_band_4', 'cave_band_5', 'cave_boss']) assert.ok(ZONES[id] && ZONES[id].cave, id);
  for (const k of ['consumables', 'equipment', 'sets', 'zones', 'zoneOrder', 'optional', 'ep2', 'ep3', 'rarity', 'chests', 'skills', 'shops']) {
    assert.deepEqual(after[k], before[k], `${k} unchanged`);
  }
  // nothing of the pack leaked before register(): the snapshot taken first had none of it
  for (const id of UNIQUE_IDS) assert.ok(!before.items.includes(id), id);
  assert.ok(!before.enemies.includes('binder') && !before.encounters.includes('cave_binder') && !before.zoneLoot.includes('cave_band_1'));
});

test('the switch is ON (flipped 2026-10-28 after C4-fixes); the gate reads true only once the pack is loaded; the packs.js entry uses the cave_ prefix', () => {
  assert.equal(CAVE_LIVE, true);
  assert.equal(caveOn(), packReady('cave'), 'register() alone (no ensurePack) does not make the pack ready');
  if (PACKS.cave) { assert.equal(PACKS.cave.prefix, 'cave_'); assert.equal(PACKS.cave.enabled(), CAVE_LIVE); assert.ok(PACKS.cave.entry.endsWith('cave/index.js')); }
});

test('no em dashes in the cave data, its tests or the harness', () => {
  const EM = String.fromCharCode(0x2014);
  const files = ['src/data/cave/foes.js', 'src/data/cave/loot.js', 'src/data/cave/items.js', 'src/data/cave/index.js', 'src/data/cave/live.js',
    'qa/cave/data_foes.test.mjs', 'qa/cave/data_loot.test.mjs', 'qa/cave/data_items.test.mjs', 'qa/cave/data_pack.test.mjs', 'qa/cave/data_sanity.test.mjs',
    'qa/cave/data_cave_harness.mjs'];
  for (const f of files) {
    const url = new URL(`../../${f}`, import.meta.url);
    if (!fs.existsSync(url)) continue;
    assert.ok(!fs.readFileSync(url, 'utf8').includes(EM), `${f} contains an em dash`);
  }
});
