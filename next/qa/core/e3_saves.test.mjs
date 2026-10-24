// E3-saves (EPISODE3_PLAN section 10.7): the per-run autosave slot, the episode switch, the quick start's slot choice
// and the Episode 3 start state. Pure node tests over a fake storage; the real FieldScene.autosave is called unbound.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSave } from '../../src/core/save.js';
import { EP3_LIVE, episodeOffers, pickRunSlot, ep2Offer as ep2OfferDirect, SLOTS_FULL_NOTICE } from '../../src/game/episodes.js';
import { ep2Offer } from '../../src/scenes/title.js';
import { FieldScene } from '../../src/scenes/field.js';
import { createGame, deserialize, serialize, saveMeta, newGameEp2, newGameEp3, EP3_START, EP1_DONE_FLAGS, EP2_DONE_FLAGS, setPosition } from '../../src/game/state.js';
import { ITEMS, KEY_ITEMS } from '../../src/data/items.js';
import { newMember } from '../../src/data/party.js';
import nhInn from '../../src/data/maps/nh_inn.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const fresh = () => { const storage = memoryStorage(); return { storage, save: createSave({ storage, log: () => {} }) }; };
/** Runs the real FieldScene.autosave against `save` (what the field does at every map entry). */
function autosave(save, game) { FieldScene.prototype.autosave.call({ engine: { save }, game, warnOnce() {} }); }
const snapshot = (storage) => JSON.stringify([...storage._m.entries()].sort());

function ep1CreditsGame() {
  const g = createGame('Arden');
  for (const f of EP1_DONE_FLAGS) g.flags[f] = true;
  g.party[0].level = 10; g.gold = 2840;
  setPosition(g, 'hero_home', 4, 3, 'down');
  return g;
}
function ep2CreditsGame() {
  const g = newGameEp3('Sol', { slot: 0 });
  g.map = 'nh_inn'; delete g.flags.ep3_started; g.chapter = 2; g.autosaveSlot = 0;
  return g;
}

// ---------------------------------------------------------------------------------------------- item 1
test('autosaveSlot: defaults to 0, is serialized, and an old save without it loads as 0', () => {
  const g = createGame('Arden');
  assert.equal(g.autosaveSlot, 0);
  assert.equal(serialize(createGame('Arden', { autosaveSlot: 2 })).autosaveSlot, 2);
  assert.equal(createGame('Arden', { autosaveSlot: 9 }).autosaveSlot, 0, 'a bad slot falls back to 0');
  const old = serialize(g); delete old.autosaveSlot;
  assert.equal(deserialize(old).autosaveSlot, 0);
  assert.equal(deserialize({ ...old, autosaveSlot: 3 }).autosaveSlot, 3, 'loading any slot keeps that run\'s autosaveSlot');
  assert.equal(deserialize({ ...old, autosaveSlot: 'x' }).autosaveSlot, 0);
});

test('autosave: an Episode 1 credits save and an Episode 2 credits save still autosave to slot 0 (real FieldScene.autosave)', () => {
  const fixture = path.join(NEXT, 'qa', 'out', 'autoplay', 'desktop-ep1-credits-save.json');
  const games = [['built Episode 1', ep1CreditsGame()], ['built Episode 2', ep2CreditsGame()]];
  if (fs.existsSync(fixture)) games.push(['autoplay Episode 1 file (no autosaveSlot field)', JSON.parse(fs.readFileSync(fixture, 'utf8'))]);
  for (const [label, raw] of games) {
    const { save, storage } = fresh();
    const g = deserialize(raw);
    assert.equal(g.autosaveSlot, 0, label);
    autosave(save, g);
    assert.deepEqual([...storage._m.keys()], ['lq-next-slot-0'], `${label}: only slot 0 written`);
    const back = deserialize(save.load(0));
    assert.equal(back.heroName, g.heroName); assert.equal(back.autosaveSlot, 0);
  }
});

test('autosave: a run that owns slot 2 writes slot 2 and nothing else, across several map entries', () => {
  const { save, storage } = fresh();
  const other = ep1CreditsGame();
  save.save(0, serialize(other), saveMeta(other));
  save.save(1, serialize(other), saveMeta(other));
  const before0 = save.exportSlot(0), before1 = save.exportSlot(1);
  const g = newGameEp3('Quill', { slot: 2 });
  for (const [map, x, y] of [['nh_inn', 17, 7], ['nameless_hollow', 20, 10], ['nh_inn', 4, 4]]) { setPosition(g, map, x, y, 'down'); autosave(save, g); }
  assert.equal(save.exportSlot(0), before0, 'slot 0 untouched');
  assert.equal(save.exportSlot(1), before1, 'slot 1 untouched');
  assert.equal(save.exportSlot(3), null);
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(save.load(2).map, 'nh_inn');
  assert.equal(deserialize(save.load(2)).autosaveSlot, 2, 'loading the record keeps the run\'s slot');
  assert.deepEqual([...storage._m.keys()].sort(), ['lq-next-slot-0', 'lq-next-slot-1', 'lq-next-slot-2']);
});

// ---------------------------------------------------------------------------------------------- item 2
const env = (name, at, flags) => ({ savedAt: at, meta: { name }, data: { heroName: name, flags } });
const fake = (slots) => ({ slots: 3, loadEnvelope: (n) => slots[n] || null });

test('episodes: the switch is off in this build, and ep2Offer is unchanged (title re-exports it)', () => {
  assert.equal(EP3_LIVE, false);
  assert.equal(ep2Offer, ep2OfferDirect);
  const s = fake({ 1: env('Arden', '2026-10-20T10:00:00Z', { ep1_complete: true }), 2: env('Sol', '2026-10-23T10:00:00Z', { ep1_complete: true, ep2_complete: true }) });
  const o = episodeOffers(s, '');
  assert.deepEqual(o.ep2, ep2Offer(s, ''), 'the Episode 2 offer is exactly ep2Offer');
  assert.equal(o.ep3.show, false, 'EP3_LIVE is false: no row even with an ep2_complete save');
});

test('episodes: with the switch live the row needs an ep2_complete save, and names the newest finisher', () => {
  const live = { live: true, mapsListed: false };
  assert.equal(episodeOffers(fake({}), '', live).ep3.show, false, 'a fresh browser');
  assert.equal(episodeOffers(fake({ 0: env('A', '2026-10-20T10:00:00Z', { ep1_complete: true }) }), '', live).ep3.show, false, 'Episode 1 only');
  const two = fake({ 1: env('Old', '2026-10-01T10:00:00Z', { ep2_complete: true }), 3: env('Newer', '2026-10-20T10:00:00Z', { ep2_complete: true }) });
  const o = episodeOffers(two, '', live).ep3;
  assert.deepEqual([o.show, o.name, o.slot], [true, 'Newer', 3]);
  const broken = { slots: 3, loadEnvelope: (n) => { if (n === 1) throw new Error('corrupt'); return null; } };
  assert.equal(episodeOffers(broken, '', live).ep3.show, false, 'a corrupt slot never breaks the title');
});

test('episodes: ?ep=3 shows nothing until the Episode 3 maps are listed, then is a developer entry', () => {
  assert.equal(episodeOffers(fake({}), '?ep=3').ep3.show, false, 'real module state: maps are not listed yet or the switch is off');
  assert.equal(episodeOffers(fake({}), '?ep=3', { mapsListed: false }).ep3.show, false);
  const dev = episodeOffers(fake({}), '?debug=1&ep=3', { mapsListed: true });
  assert.deepEqual([dev.ep3.show, dev.ep3.url], [true, true]);
  assert.equal(episodeOffers(fake({}), '?ep=2', { mapsListed: true }).ep3.show, false);
  assert.equal(episodeOffers(fake({}), '?ep=3', { mapsListed: true }).ep2.show, false, '?ep=3 does not open Episode 2');
});

// ---------------------------------------------------------------------------------------------- item 4
test('quick start slot: slot 0 empty -> slot 0, no notice', () => {
  const { save } = fresh();
  assert.deepEqual(pickRunSlot(save), { ok: true, slot: 0, notice: null });
});

test('quick start slot: slot 0 occupied -> the first empty manual slot with a one-line notice', () => {
  const { save } = fresh();
  save.save(0, { x: 1 }, {});
  assert.deepEqual(pickRunSlot(save), { ok: true, slot: 1, notice: 'This party will save to slot 1.' });
  save.save(1, { x: 1 }, {});
  assert.deepEqual(pickRunSlot(save), { ok: true, slot: 2, notice: 'This party will save to slot 2.' });
  save.save(3, { x: 1 }, {});
  assert.equal(pickRunSlot(save).slot, 2, 'the first EMPTY one, not the last');
});

test('quick start slot: every slot full -> refusal, no slot, and the notice is the plan\'s sentence', () => {
  const { save, storage } = fresh();
  for (let n = 0; n <= 3; n++) save.save(n, { x: n }, {});
  const before = snapshot(storage);
  const p = pickRunSlot(save);
  assert.deepEqual(p, { ok: false, slot: null, notice: 'Every save slot holds a game. Free one on the Load page first.' });
  assert.equal(p.notice, SLOTS_FULL_NOTICE);
  assert.equal(snapshot(storage), before, 'choosing wrote nothing');
  assert.ok(/^[\x20-\x7e]+$/.test(p.notice));
  for (const part of p.notice.split(/(?<=\.) /)) assert.ok(part.length <= 42, `"${part}" fits one 42-char line (the picker shows one sentence per line)`);
  assert.equal(pickRunSlot(null).ok, false);
});

test('quick start slot: unreadable bytes in a slot count as occupied (never overwritten)', () => {
  const { save, storage } = fresh();
  storage.setItem('lq-next-slot-0', '{not json');
  assert.equal(save.loadEnvelope(0), null);
  assert.equal(pickRunSlot(save).slot, 1);
  const throwing = { slots: 3, exists() { throw new Error('denied'); } };
  assert.equal(pickRunSlot(throwing).ok, false, 'a broken store refuses rather than guessing');
});

test('quick start: slot 0 occupied + slot 2 empty -> the whole run writes only slot 2', () => {
  const { save, storage } = fresh();
  const other = ep1CreditsGame();
  for (const n of [0, 1, 3]) save.save(n, serialize(other), saveMeta(other));
  const before = [0, 1, 3].map((n) => save.exportSlot(n));
  const pick = pickRunSlot(save);
  assert.equal(pick.slot, 2);
  const g = newGameEp3('Quill', { slot: pick.slot });
  // a simulated play session: the inn, the town, the east gate, back (every map entry autosaves)
  for (const [map, x, y] of [['nh_inn', 17, 7], ['nameless_hollow', 26, 19], ['nh_chapel', 9, 5], ['nameless_hollow', 40, 12]]) { setPosition(g, map, x, y, 'down'); autosave(save, g); }
  assert.deepEqual([0, 1, 3].map((n) => save.exportSlot(n)), before, 'the other three runs are byte for byte intact');
  assert.equal(save.load(2).heroName, 'Quill');
  assert.equal(storage._m.size, 4);
});

test('quick start: every slot full -> no write at all (the picker refuses, and a game with no slot is never started)', () => {
  const { save, storage } = fresh();
  for (let n = 0; n <= 3; n++) save.save(n, { n }, {});
  const before = snapshot(storage);
  assert.equal(pickRunSlot(save).ok, false);
  assert.equal(snapshot(storage), before);
});

// ---------------------------------------------------------------------------------------------- item 3
test('EP3_START: a Lv 13 party with the Episode 1 and 2 flags, key items and the inn bed', () => {
  const g = newGameEp3('Quill', { slot: 2 });
  assert.equal(g.autosaveSlot, 2);
  assert.equal(newGameEp3('Quill').autosaveSlot, 0);
  assert.deepEqual(g.party.map((m) => m.id), ['hero', 'mira', 'bram']);
  for (const m of g.party) {
    assert.equal(m.level, 13); assert.ok(m.exp >= 2900, `${m.id} exp ${m.exp}`);
    assert.ok(m.hp > 0 && m.mp >= 0 && m.fury === 0);
  }
  for (const f of [...EP1_DONE_FLAGS, ...EP2_DONE_FLAGS, 'ep1_complete', 'ep2_complete']) assert.equal(g.flags[f], true, f);
  assert.equal(g.flags.garrick_at_ford, undefined, 'a beat that Episode 2 clears stays clear');
  assert.equal(g.flags.ep3_started, undefined, 'no Episode 3 flag yet: ep3_morning gives it');
  assert.deepEqual([g.counters.credits_rolled, g.counters.credits2_rolled], [1, 1]);
  assert.equal(g.counters.credits3_rolled, undefined);
  assert.equal(g.gold, 1500);
  for (const [id, q] of Object.entries({ potion: 6, hi_potion: 4, hi_ether: 3, phoenix_feather: 2, silver_salve: 2 })) assert.equal(g.items[id], q, id);
  for (const id of ['name_fragment_1', 'name_fragment_2', 'lantern_of_recall', 'mirror_sigil']) assert.equal(g.items[id], 1, id);
  assert.equal(g.map, 'nh_inn');
  assert.deepEqual([g.pos.x, g.pos.y], nhInn.marks.inn_bed, 'EP3_START.pos matches the nh_inn inn_bed mark');
  assert.deepEqual(g.lastSafe, { map: 'nh_inn', pos: { ...g.pos } });
  assert.equal(g.chapter, 3);
  assert.deepEqual(deserialize(serialize(g)), g, 'round trips through a save');
});

test('EP3_START: every gear and item id exists, and the loadout is the court_throne row', () => {
  for (const [who, spec] of Object.entries(EP3_START.members)) {
    for (const [slot, id] of Object.entries(spec.equip)) assert.ok(ITEMS[id], `${who} ${slot}: ${id}`);
  }
  for (const id of Object.keys(EP3_START.items)) assert.ok(ITEMS[id] || KEY_ITEMS[id], id);
  // tools/sim/loadouts.mjs court_throne (derived by the layered spreads; the sand_road row does not exist yet)
  const e = EP3_START.members;
  assert.deepEqual(e.hero.equip, { sword: 'lanternheart', axe: 'bearded_axe', body: 'silver_mail', head: 'steel_helm', boots: 'traveler_boots', charm: 'twinfold_charm' });
  assert.equal(e.mira.equip.staff, 'mirror_rod'); assert.equal(e.bram.equip.spear, 'mere_pike');
  assert.equal(newMember('hero', { level: 13 }).level, 13);
});

test('Episode 3 start vs Episode 2 start: the older quick start is unchanged', () => {
  const g = newGameEp2('Arden');
  assert.equal(g.autosaveSlot, 0);
  assert.equal(g.party[0].level, 9);
  assert.equal(g.map, 'hero_home');
});

// ---------------------------------------------------------------------------------------------- item 5: pending
test('PENDING (E3-integrate): the Episode 2 credits save reaches ep3_morning with EP3_LIVE on, and not with it off', { skip: 'needs ep3.js scenes and sceneAllowed() support for EP3_LIVE (E3-story / E3-integrate)' }, () => {});
test('PENDING (E3-integrate): the quick start plays through a full map change on the real Episode 3 maps writing only its own slot', { skip: 'needs the Episode 3 maps (E3-maps) and the browser autoplay' }, () => {});
test('PENDING (E3-scene-ui): the title shows "Episode 3: new party" and the slot picker panel with the real ?ep=3 URL', { skip: 'needs EP3_MAPS_LISTED in encounters.js (E3-battle/E3-maps) and a title shot' }, () => {});
test('PENDING (E3-battle): EP3_START matches the simulator\'s sand_road loadout', { skip: 'tools/sim/loadouts.mjs has no sand_road row yet; EP3_START uses court_throne' }, () => {});
