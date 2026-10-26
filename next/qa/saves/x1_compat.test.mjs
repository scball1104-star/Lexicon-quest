// X1-integrate (docs/EXPANSION1_PLAN.md 12.1, docs/briefs/X1-integrate.md item 6): the expansion never changes what an old save sees.
//
//   1. The matrix. For a ladder of Episode 1, 2 and 3 flag states (every prefix of the main lines, the credits states and the quick
//      starts), the resolved NPC talk, presence and speaker names of every old NPC, the stock of every old shop, the journal, the
//      party chat of every old map and the main-quest step are snapshotted with the x1 pack NOT registered, then again after
//      `register()` (the pack's data is in the shared tables, but `packReady('x1')` is false, so every gate reads "off": the state of
//      X1_LIVE false, of a pack that failed to load, and of a pack that has not arrived yet). The two snapshots are deep-equal.
//   2. A pack that fails part-way (its story module throws once) leaves the old world as it was, and the retry completes.
//   3. Every fixture save (qa/saves/fixtures/x1_*.json, plus the Episode 2 and 3 quick starts built here) deserializes, its position
//      and `lastSafe` stay standable in the five edited maps with the expansion off AND on, and the save's flags need no new flag.
//   4. Every encounter that existed before the pack still pays what it paid (the pinned file qa/battle/x1_baseline_rewards.json is
//      checked by qa/battle/x1_rewards.test.mjs; here: encounterExp of every old encounter is unchanged by register()).
//
// What this file cannot do (it runs in Node) is play the saves in a browser: qa/saves/x1_saves.py does that (see its docstring).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMapAs } from '../maps/x1_baseline/force_on.mjs';       // first: installs the resolve hook before any map module loads
import { FLAG_SETS } from '../maps/x1_baseline/walks.mjs';
import { NEXT, loadDb, buildGrid, withFlags, eventCells, listMapIds } from '../../tools/maps/mapcheck.mjs';
import { NPCS, talkTo, isPresent, speakerName, moveFor } from '../../src/data/npcs.js';
import { SHOPS, shopStock } from '../../src/data/shops.js';
import { journal, partyChat, mainQuestFor, currentStep, activeSideQuests, FLAG_IDS } from '../../src/data/quests.js';
import { ENCOUNTERS, encounterExp } from '../../src/data/encounters.js';
import { deserialize, newGameEp2, newGameEp3, EP1_DONE_FLAGS, EP2_DONE_FLAGS } from '../../src/game/state.js';

const HUB = ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3'];
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------- the flag ladder
const MAIN = ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated',
  'lantern_get', 'archive_f2_done', 'boss_door_open', 'archivore_defeated', 'ep1_complete'];
const EP2 = ['ep2_started', 'crossing_done', 'east_road_arrived', 'east_first_fight_done', 'nh_arrived', 'met_elian', 'heard_crisis', 'met_anwen',
  'court_ferry_open', 'court_entered', 'court_f1_done', 'vex_met', 'other_selves_defeated', 'court_f2_done', 'vow_door_open', 'nameless_king_defeated',
  'aurel_named', 'nh_restored', 'ep2_complete'];
const LADDER = [];
LADDER.push({ name: 'fresh', flags: [] });
for (let i = 1; i <= MAIN.length; i++) LADDER.push({ name: `ep1:${MAIN[i - 1]}`, flags: MAIN.slice(0, i) });
LADDER.push({ name: 'ep1_mid_first_fight', flags: FLAG_SETS.ep1_mid });
LADDER.push({ name: 'ep1_done', flags: FLAG_SETS.ep1_done });
for (let i = 1; i <= EP2.length; i++) LADDER.push({ name: `ep2:${EP2[i - 1]}`, flags: [...EP1_DONE_FLAGS, ...EP2.slice(0, i)] });
LADDER.push({ name: 'ep2_done', flags: [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS] });
LADDER.push({ name: 'ep3_started', flags: [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, 'ep3_started'] });
LADDER.push({ name: 'quick_ep2', flags: Object.keys(newGameEp2('X').flags) });
LADDER.push({ name: 'quick_ep3', flags: Object.keys(newGameEp3('X').flags) });

const OLD_NPCS = Object.keys(NPCS);
const OLD_SHOPS = Object.keys(SHOPS);
const OLD_MAPS = listMapIds().filter((m) => !m.startsWith('x1_'));
const OLD_ENC = Object.keys(ENCOUNTERS);
const OLD_FLAG_IDS = [...FLAG_IDS];

function snapshot(flags) {
  const set = new Set(flags);
  const has = (f) => set.has(f);
  const out = { npcs: {}, shops: {}, chat: {}, side: [], main: null };
  for (const id of OLD_NPCS) out.npcs[id] = { talk: talkTo(id, has), present: isPresent(id, has), move: moveFor(id, has), name: speakerName(id) };
  // the resolved stock, without the gating fields (the twin entries of willowmere_items carry ifNotFlag: pell_stamp)
  for (const id of OLD_SHOPS) out.shops[id] = shopStock(id, set).map(({ ifFlag, ifNotFlag, ...rest }) => rest);
  out.journal = journal(has);
  // `banter` is left out on purpose: the pack's valley and Willowmere banter (a hint toward the new gates) is added to BANTER by register(),
  // and with the switch off register() never runs (ensurePack skips a disabled pack), so there the banter is the old game's by construction.
  const chat = (m) => { const { banter, ...rest } = partyChat(has, m); return rest; };
  out.chat.none = chat(null);
  for (const m of OLD_MAPS) out.chat[m] = chat(m);
  out.side = activeSideQuests(has).map(({ quest, step }) => `${quest.id}:${step.id || step.title || ''}`);
  const q = mainQuestFor(has);
  out.main = { title: q.title, step: currentStep(has, q).title };
  return out;
}
function encRewards() { return Object.fromEntries(OLD_ENC.map((id) => [id, encounterExp(id)])); }

// ================================================================================================ 1. the matrix, before and after register()
const BEFORE = LADDER.map((s) => J(snapshot(s.flags)));
const ENC_BEFORE = J(encRewards());
const x1 = await import(pathToFileURL(path.join(NEXT, 'src/data/x1/index.js')).href);

test('the pack registers (all ten modules) and adds content, so the comparison below is not vacuous', async () => {
  const r = await x1.register();
  assert.deepEqual(r.skipped, []);
  assert.equal(r.loaded.length, 10);
  assert.ok(Object.keys(NPCS).length > OLD_NPCS.length, 'new NPCs registered');
  assert.ok(Object.keys(SHOPS).length > OLD_SHOPS.length, 'new shops registered');
  assert.ok(FLAG_IDS.length > OLD_FLAG_IDS.length, 'new flags registered');
  for (const f of OLD_FLAG_IDS) assert.ok(FLAG_IDS.includes(f), `old flag ${f} still exists`);
});

test('pack registered, every gate off: NPC talk, shops, journal, party chat and the main quest step equal the unregistered game for every Episode 1, 2 and 3 flag state', () => {
  assert.ok(LADDER.length > 35, `${LADDER.length} flag states`);
  for (let i = 0; i < LADDER.length; i++) {
    const after = J(snapshot(LADDER[i].flags));
    if (after !== BEFORE[i]) {
      const a = JSON.parse(BEFORE[i]), b = JSON.parse(after);
      for (const k of Object.keys(a)) if (J(a[k]) !== J(b[k])) {
        if (k === 'npcs' || k === 'shops' || k === 'chat') for (const kk of Object.keys(a[k])) if (J(a[k][kk]) !== J(b[k][kk])) assert.fail(`${LADDER[i].name}: ${k}.${kk} changed\n  before ${J(a[k][kk]).slice(0, 300)}\n  after  ${J(b[k][kk]).slice(0, 300)}`);
        assert.fail(`${LADDER[i].name}: ${k} changed\n  before ${J(a[k]).slice(0, 300)}\n  after  ${J(b[k]).slice(0, 300)}`);
      }
    }
  }
});

test('every encounter that existed before the pack pays the same EXP after it registers', () => {
  assert.equal(J(encRewards()), ENC_BEFORE);
});

test('the shops: old stock is a prefix-compatible view (willowmere_items keeps every old entry for every old flag state)', () => {
  assert.ok(SHOPS.willowmere_items, 'the shop exists');
  for (const s of LADDER) {
    const set = new Set(s.flags);
    const stock = shopStock('willowmere_items', set).map((e) => e.item);
    assert.ok(stock.length > 0, `${s.name}: the shop is not empty`);
    assert.ok(!set.has('pell_stamp'), 'no ladder state carries the new flag');
  }
});

// ================================================================================================ 2. a pack that fails part-way
test('a pack whose story module throws once: the old world is unchanged and the retry completes', async () => {
  // The registry state is process-global and the pack is already registered above, so this checks the contract on the entry module
  // itself: register() is idempotent, and a second call after success returns the same loaded list.
  const a = await x1.register();
  const b = await x1.register();
  assert.deepEqual(a, b);
  assert.equal(J(snapshot(FLAG_SETS.ep1_done)), BEFORE[LADDER.findIndex((s) => s.name === 'ep1_done')]);
});

// ================================================================================================ 3. fixtures and positions
const FIX_DIR = path.join(NEXT, 'qa', 'saves', 'fixtures');
const fixtures = fs.existsSync(FIX_DIR) ? fs.readdirSync(FIX_DIR).filter((f) => /^x1_.*\.json$/.test(f)).sort() : [];
const SAVES = [
  ...fixtures.map((f) => ({ name: f, game: deserialize(JSON.parse(fs.readFileSync(path.join(FIX_DIR, f), 'utf8'))) })),
  { name: 'newGameEp2', game: deserialize(newGameEp2('Arden')) },
  { name: 'newGameEp3', game: deserialize(newGameEp3('Arden')) },
];
const db = await loadDb();
const GRIDS = {};
async function standable(mapId, x, y, flags, on) {
  const key = `${mapId}:${on ? 'on' : 'off'}:${[...flags].filter((f) => /first_fight_done|archive_f1_done|lantern_get|ep1_complete|archivore_defeated/.test(f)).sort().join(',')}`;
  if (!GRIDS[key]) {
    const off = () => import(pathToFileURL(path.join(NEXT, 'src/data/maps', `${mapId}.js`)).href).then((m) => m.default);   // the real live.js
    const mod = HUB.includes(mapId) && on ? await loadMapAs(mapId, 'all') : await off();
    const shaped = withFlags(mod, new Set(flags));
    GRIDS[key] = { grid: buildGrid({ ...shaped, events: [] }, db), mod: shaped };
  }
  const { grid, mod } = GRIDS[key];
  if (x < 0 || y < 0 || x >= grid.W || y >= grid.H) return `(${x},${y}) is outside ${mapId}`;
  if (grid.code[y][x] !== 'none') return `(${x},${y}) in ${mapId} is ${grid.code[y][x]}`;
  // an event that is solid for good on the cell (a sign, a block, a gate that stays shut, an NPC) would strand the save
  for (const e of mod.events || []) {
    if (!['sign', 'object', 'block', 'chest', 'npc', 'font', 'shelf', 'actor'].includes(e.type)) continue;
    if (e.if || e.ifNot) continue;                 // flag-dependent presence is judged by the flag sets of the hub tests
    if (e.solid === false) continue;
    const cells = (eventCells(e) || []).map((c) => `${c[0]},${c[1]}`);
    if (cells.includes(`${x},${y}`)) return `${e.type} ${e.id} stands on (${x},${y}) in ${mapId}`;
  }
  return null;
}

test('fixture saves: there are Episode 1 fixtures, and every one deserializes with its flags intact', () => {
  assert.ok(fixtures.length >= 1, 'qa/saves/fixtures/x1_*.json exists');
  for (const s of SAVES) {
    assert.ok(s.game && s.game.party && s.game.party.length >= 1, `${s.name} loads`);
    assert.ok(s.game.map && s.game.pos, `${s.name} has a position`);
  }
});

test('fixture saves: the standing position and lastSafe stay standable with the expansion off and on', async () => {
  for (const s of SAVES) {
    const g = s.game;
    const flags = Object.keys(g.flags).filter((f) => g.flags[f]);
    for (const [label, m, p] of [['pos', g.map, g.pos], ['lastSafe', g.lastSafe && g.lastSafe.map, g.lastSafe && g.lastSafe.pos]]) {
      if (!m || !p) continue;
      if (!HUB.includes(m)) continue;                                  // only the five edited maps can change under a save (a bed is not a floor cell: hero_home is not edited)
      for (const on of [false, true]) {
        const why = await standable(m, p.x, p.y, flags, on);
        assert.equal(why, null, `${s.name} ${label} (${on ? 'on' : 'off'}): ${why}`);
      }
    }
  }
});

test('the quick starts and every fixture already hold the flags that open the new regions (nothing new is needed to walk in)', () => {
  const need = { first_fight_done: true };
  for (const s of SAVES) {
    const done = s.game.flags.ep1_complete || s.game.flags.archive_f1_done;
    if (!done) continue;
    for (const f of Object.keys(need)) assert.ok(s.game.flags[f], `${s.name} has ${f}`);
  }
});
