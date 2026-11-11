// World map wave 5 (issue #100, docs/WORLD_MAP_PLAN.md section 12): errands across regions, Penny's travelling cart and the
// shop restocks. Everything reads flags a save already has: errands unlock by flags, rewards pay once, Penny's stop follows the
// episodes, restocks show by flags, and old saves of each episode see only what they have unlocked. Pure node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (rel) => import(pathToFileURL(path.join(NEXT, rel)).href);
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');

const ep6 = await imp('src/data/ep6/index.js');
await ep6.register();                                     // chains ep5 and ep4: every errands.js step has run
const X = await imp('src/data/ep4/errands.js');
const F = await imp('src/data/ep4/errands_field.js');
const S = await imp('src/game/state.js');
const { NPCS, talkTo } = await imp('src/data/npcs.js');
const { ITEMS } = await imp('src/data/items.js');
const { SHOPS, shopStock } = await imp('src/data/shops.js');
const Q = await imp('src/data/quests.js');
const STORY = await imp('src/game/story.js');
const { EP3_DONE_FLAGS } = await imp('src/data/ep4/start.js');
const { EP4_DONE_FLAGS } = await imp('src/data/ep5/start.js');
const { EP5_DONE_FLAGS } = await imp('src/data/ep6/start.js');
const { EP6_FLAGS } = await imp('src/data/ep6/flags.js');
const EP6_DONE = Object.keys(EP6_FLAGS).slice(0, Object.keys(EP6_FLAGS).indexOf('ep6_complete') + 1);

const flagsOf = (...lists) => Object.fromEntries(lists.flat().map((f) => [f, true]));
const DONE = [S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS, EP4_DONE_FLAGS, EP5_DONE_FLAGS, EP6_DONE];
/** A save at the end of episode `ep` (0: a fresh game). */
const endOf = (ep) => flagsOf(...DONE.slice(0, ep));
/** A save in the middle of episode `ep` (the earlier episodes done, this one started). */
const midOf = (ep) => ({ ...endOf(ep - 1), [`ep${ep}_started`]: true });
const hasOf = (flags) => (f) => !!flags[f];
const unlocked = (flags) => X.ERRANDS.filter((e) => X.errandState(flags, e) !== 'locked').map((e) => e.id);

test('seven errands, each a later item for an earlier person, every pair of the plan covered', () => {
  assert.ok(X.ERRANDS.length >= 5 && X.ERRANDS.length <= 8, `${X.ERRANDS.length} errands`);
  const EP = { willowmere: 1, hollowmere: 2, emberpeak: 3, flood_road: 4, valewyn: 4, saffron: 5, zephyr: 6 };
  for (const e of X.ERRANDS) {
    assert.ok(EP[e.giver.place] < EP[e.source.place], `${e.id}: the giver is earlier than the source`);
    assert.equal(e.unlock, `ep${EP[e.source.place]}_complete`, `${e.id}: opens when the source's episode is done`);
    assert.ok(NPCS[e.giver.npc], `${e.id}: giver ${e.giver.npc} exists`);
    assert.ok(NPCS[e.source.npc], `${e.id}: source ${e.source.npc} exists`);
    for (const map of e.giver.maps) assert.equal(NPCS[e.giver.npc].map, map, `${e.id}: giver map`);
    for (const map of e.source.maps) assert.equal(NPCS[e.source.npc].map, map, `${e.id}: source map`);
    assert.equal(ITEMS[e.item.id].kind, 'key', `${e.id}: the item is a key item`);
    for (const [id] of e.reward.items) assert.ok(ITEMS[id], `${e.id}: reward ${id}`);
    assert.ok(e.reward.gold <= 1000, `${e.id}: a modest reward`);
  }
  const pairs = new Set(X.ERRANDS.map((e) => `${e.giver.place}>${e.source.place}`));
  for (const p of ['willowmere>flood_road', 'hollowmere>saffron', 'emberpeak>saffron', 'valewyn>saffron', 'saffron>zephyr']) assert.ok(pairs.has(p), p);
});

test('errands unlock by flags only: each old save sees exactly its own, mid-episode saves see nothing new', () => {
  const want = { 0: [], 1: [], 2: [], 3: [], 4: ['nella_rope'], 5: ['nella_rope', 'tovin_shell', 'bess_spice', 'lyra_reading'] };
  for (let ep = 0; ep <= 5; ep++) assert.deepEqual(unlocked(endOf(ep)), want[ep], `end of episode ${ep}`);
  assert.deepEqual(unlocked(endOf(6)), X.ERRANDS.map((e) => e.id), 'post-game: all of them');
  for (let ep = 2; ep <= 6; ep++) assert.deepEqual(unlocked(midOf(ep)), want[ep - 1], `middle of episode ${ep}`);
  for (const ep of [0, 3, 6]) {
    const g = { flags: endOf(ep), map: 'willowmere' };
    const before = JSON.stringify(g);
    X.errandsFor(g, 'willowmere'); X.errandLedger(g); X.merchantAt(g);
    assert.equal(JSON.stringify(g), before, 'the map hook writes nothing');
  }
  assert.ok(!read('src/core/save.js').includes('xr_'), 'save.js untouched');
  assert.equal(S.SAVE_VERSION, 1);
});

test('the map hook: "!" at the giver, "?" at the source, gone when done; labels fit the plate', () => {
  const flags = endOf(5);
  assert.deepEqual(X.errandsFor(flags, 'emberpeak').map((r) => [r.id, r.mark, r.label]), [['bess_spice', '!', '! Bess wants desert spice']]);
  assert.deepEqual(X.errandsFor({ flags }, 'saffron'), [], 'nothing to fetch until asked');
  flags.xr_bess_spice_started = true;
  assert.deepEqual(X.errandsFor({ flags }, 'emberpeak'), []);
  assert.deepEqual(X.errandsFor({ flags }, 'saffron').map((r) => [r.id, r.mark]), [['bess_spice', '?']]);
  flags.xr_bess_spice_got = true;
  assert.deepEqual(X.errandsFor({ flags }, 'emberpeak').map((r) => [r.state, r.mark, r.npc]), [['deliver', '!', 'bess']]);
  flags.xr_bess_spice_done = true;
  assert.deepEqual(X.errandsFor({ flags }, 'emberpeak'), []);
  assert.equal(X.errandLedger({ flags }).find((r) => r.id === 'bess_spice').state, 'done');
  for (const e of X.ERRANDS) for (const [k, v] of Object.entries(e.label)) assert.ok(v.length <= 26, `${e.id} ${k} label "${v}" (${v.length})`);
  assert.equal(typeof globalThis.LQ_ERRANDS.errandsFor, 'function', 'installed for the map scene');
});

test('scenes: registered once, guarded by their flags, the reward paid once', async () => {
  for (const e of X.ERRANDS) {
    const { ids } = X.errandScenes(e);
    for (const id of Object.values(ids)) assert.ok(STORY.sceneById(id), `${id} registered`);
  }
  assert.deepEqual(STORY.storyCollisions().scenes.filter((s) => s.startsWith('xr_')), [], 'no scene id taken twice');
  // run the deliver scene twice against a fake cutscene: the second run does nothing
  const g = { flags: { ...endOf(5), xr_bess_spice_started: true, xr_bess_spice_got: true }, items: { desert_spice: 1 }, gold: 0 };
  const s = {
    hasFlag: async (f) => !!g.flags[f], setFlag: async (f) => { g.flags[f] = true; }, lockInput: async () => {}, unlockInput: async () => {},
    face: async () => {}, say: async () => {},
    give: async (id, q) => { if (id === 'gold') g.gold += q; else g.items[id] = (g.items[id] || 0) + q; },
    take: async (id, q) => { g.items[id] -= q; },
  };
  const deliver = STORY.sceneById('xr_bess_spice_deliver');
  await deliver(s);
  await deliver(s);
  assert.equal(g.gold, 600);
  assert.equal(g.items.hi_potion, 3);
  assert.equal(g.items.desert_spice, 0);
  assert.equal(g.flags.xr_bess_spice_done, true);
  assert.equal(STORY.sceneAllowed('xr_bess_spice_deliver', hasOf(g.flags)), false);
  assert.equal(STORY.sceneAllowed('xr_bess_spice_give', hasOf(g.flags)), false, 'no second tin');
});

test('talk: the errand answers first when it is live, the old lines come back after; the source can start it too', () => {
  const end5 = endOf(5);
  assert.deepEqual(talkTo('bess', hasOf(end5)), { scene: 'xr_bess_spice_ask' });
  assert.deepEqual(talkTo('yasmin', hasOf(end5)), { scene: 'xr_bess_spice_give' }, 'the item can come first');
  const after = { ...end5, xr_bess_spice_started: true, xr_bess_spice_got: true, xr_bess_spice_done: true };
  assert.ok(talkTo('bess', hasOf(after)).lines, 'Bess back to her own lines');
  assert.equal(talkTo('yasmin', hasOf(after)).service.id, 'saffron_supplies', 'Yasmin back to her shop');
  // an Episode 4 save: nothing of the Episode 5 errands
  assert.ok(talkTo('bess', hasOf(endOf(4))).lines);
  // a live story scene still answers first (Nella's Episode 1 bell, never done here), the errand next
  assert.deepEqual(talkTo('nella', hasOf(endOf(4))), { scene: 'nella_bell' });
  assert.deepEqual(talkTo('nella', hasOf({ ...endOf(4), nella_quest_started: true, ferry_bell_found: true, nella_bell_done: true })), { scene: 'xr_nella_rope_ask' });
  // in front of the later packs' flavour (the ep6 line for Bess is behind her errand), after any leading story scene
  for (const e of X.ERRANDS) for (const npc of [e.giver.npc, e.source.npc]) {
    const talk = NPCS[npc].talk;
    const first = talk.findIndex((t) => t.errand);
    assert.ok(first >= 0, `${npc} has errand talk`);
    assert.ok(talk.slice(0, first).every((t) => t.scene), `${npc}: only story scenes before the errand`);
  }
  assert.equal(X.frontTalk('bess'), true);
  assert.equal(NPCS.bess.talk.filter((t) => t.errand).length, 2, 're-fronting never duplicates');
});

test('journal and party chat: an errand is a side quest from the moment it starts', () => {
  const flags = { ...endOf(5), xr_tovin_shell_started: true };
  const j = Q.journal(hasOf(flags));
  const row = j.side.find((r) => r.id === 'xr_tovin_shell');
  assert.ok(row && /Yara/.test(row.text), 'the journal names the source');
  // (in Saffron itself the Episode 6 morning holds every side hint until the airship: ep6 quests.js)
  const chat = Q.partyChat(hasOf(flags), 'nameless_hollow', { maxSide: 8 });
  assert.ok(chat.side.some((l) => /Yara/.test(l.text)), 'Talk points at Yara');
  flags.xr_tovin_shell_got = true;
  assert.ok(/Tovin/.test(Q.journal(hasOf(flags)).side.find((r) => r.id === 'xr_tovin_shell').text));
  flags.xr_tovin_shell_done = true;
  assert.equal(Q.journal(hasOf(flags)).side.find((r) => r.id === 'xr_tovin_shell').done, true);
  for (const id of Object.keys(X.errandFlagTable())) assert.ok(Q.FLAG_IDS.includes(id) && Q.FLAGS[id], `${id} declared`);
});

test("Penny's cart: one town behind the party, a stock that grows, her sand road record steps aside", () => {
  const at = (flags) => (X.merchantAt(flags) || {}).place || null;
  assert.equal(at(endOf(2)), null);
  assert.equal(at(midOf(3)), null);
  assert.equal(at(endOf(3)), 'emberpeak');
  assert.equal(at(midOf(4)), 'emberpeak');
  assert.equal(at(endOf(4)), 'valewyn');
  assert.equal(at(endOf(5)), 'saffron');
  assert.equal(at(endOf(6)), 'zephyr');
  let prev = 0;
  for (const ep of [3, 4, 5, 6]) {
    const stock = shopStock('travel_cart', endOf(ep));
    assert.ok(stock.length > prev, `episode ${ep}: ${stock.length} rows`);
    prev = stock.length;
    assert.equal(new Set(stock.map((s) => s.item)).size, stock.length, 'no row twice');
    for (const s of stock) assert.ok(ITEMS[s.item] && s.price >= ITEMS[s.item].price, `${s.item}: road price, never under list`);
    assert.equal(stock.filter((s) => ITEMS[s.item].slot === 'boots').length, 1, 'one pair of boots at a time');
  }
  assert.equal(NPCS.penny_t.service.id, 'travel_cart');
  assert.deepEqual(NPCS.penny_s.show, { ifNot: 'ep3_complete' });
  // each stop has its own lines, said only there
  for (const [i, ep] of [3, 4, 5, 6].entries()) assert.deepEqual(talkTo('penny_t', hasOf(endOf(ep))).lines.map((l) => l.text), X.MERCHANT.stops[i].lines);
  // the field events carry the stop's flags
  const evs = F.merchantEvents('ep4_valewyn');
  assert.deepEqual(evs.map((e) => [e.if, e.ifNot]), [['ep4_complete', 'ep5_complete']]);
  assert.deepEqual(F.merchantEvents('ep6_zephyr')[0].ifNot, undefined);
  assert.deepEqual(F.merchantEvents('willowmere'), []);
});

test("Penny's cells: plain floor, not a mark or an event or a map stone, and every map walks the same with her", async () => {
  const mc = await imp('tools/maps/mapcheck.mjs');
  const P4 = await imp('src/data/maps/ep4_patches.js');
  const P5 = await imp('src/data/maps/ep5_patches.js');
  const P6 = await imp('src/data/maps/ep6_patches.js');
  const patch = { emberpeak: P4.withEastRoad, ep4_valewyn: P5.withShipBerth, ep5_saffron: P6.withSkyBerth };
  // the worldmap pack's stones (wave 2, scott/wm-wave2-map data.js STONES), kept clear of
  const STONES = { emberpeak: [[17, 29]], ep4_valewyn: [[24, 30]], ep5_saffron: [[19, 30], [6, 26]], ep6_zephyr: [[24, 27], [25, 6]] };
  const db = await mc.loadDb();
  const flags = Object.keys(endOf(6));
  for (const s of X.MERCHANT.stops) {
    let m = await mc.loadMap(s.map);
    if (patch[s.map]) m = patch[s.map](m);
    const base = mc.walk(m, db, { flags });
    const reach = new Set(base.reachable);
    const k = `${s.x},${s.y}`;
    assert.ok(reach.has(k), `${s.map} (${k}) is reachable floor`);
    assert.ok(!Object.values(m.marks || {}).some(([x, y]) => x === s.x && y === s.y), `${s.map}: not a staging mark`);
    assert.ok(!(m.events || []).some((e) => mc.eventCells(e).some(([x, y]) => x === s.x && y === s.y)), `${s.map}: not on an event`);
    for (const [x, y] of STONES[s.map] || []) assert.ok(Math.abs(x - s.x) + Math.abs(y - s.y) > 2, `${s.map}: clear of the map stone ${x},${y}`);
    const withCart = { ...m, events: [...(m.events || []), { id: 'penny_t', type: 'object', x: s.x, y: s.y, sprite: 'npc_shopkeeper', text: 'x' }] };
    const after = mc.walk(withCart, db, { flags });
    const lost = [...reach].filter((c) => c !== k && !after.reachable.includes(c));
    assert.deepEqual(lost, [], `${s.map}: no cell cut off by the cart`);
    assert.deepEqual(after.unreached.filter((e) => e !== 'penny_t'), base.unreached, `${s.map}: every event still reached`);
  }
});

test('restocks: by flags, list price, never twice, the next tier only', () => {
  for (const r of X.RESTOCKS) {
    assert.ok(SHOPS[r.shop], r.shop);
    const added = X.ADDED.get(r.shop) || [];
    for (const item of r.items) assert.ok(ITEMS[item], `${r.shop}: ${item} exists`);
    const ep = Number(r.ifFlag.match(/^ep(\d)_complete$/)[1]);
    const before = shopStock(r.shop, midOf(ep)).map((s) => s.item);
    const afterEp = shopStock(r.shop, endOf(ep)).map((s) => s.item);
    for (const e of added) {
      assert.ok(!before.includes(e.item), `${r.shop}: ${e.item} hidden before ${r.ifFlag}`);
      assert.ok(afterEp.includes(e.item), `${r.shop}: ${e.item} sold after ${r.ifFlag}`);
      assert.equal(e.price, undefined, `${r.shop}: ${e.item} at list price`);
    }
    const all = shopStock(r.shop, endOf(6)).map((s) => s.item);
    for (const e of added) assert.equal(all.filter((i) => i === e.item).length, 1, `${r.shop}: ${e.item} listed once`);
    // the next tier only: no restocked piece is newer than the gear of the episode that unlocks it
    const capTier = 2 * ep - 1;
    for (const e of added) if (ITEMS[e.item].tier) assert.ok(ITEMS[e.item].tier <= capTier, `${r.shop}: ${e.item} tier ${ITEMS[e.item].tier} <= ${capTier}`);
  }
  const total = [...X.ADDED.values()].reduce((a, l) => a + l.length, 0);
  assert.ok(total >= 30, `${total} restock rows`);
});

test('the gold checks still pass with the restocks and the cart in place (simulate.mjs --check economy rules)', async () => {
  const sim = await imp('tools/sim/simulate.mjs');
  assert.deepEqual(sim.checkEconomy(), [], 'Episode 1');
  assert.deepEqual(sim.checkEconomy2(), [], 'Episode 2');
  assert.deepEqual(sim.checkEconomy3(), [], 'Episode 3');
});

test('copy: house rules (ASCII, no em dash, short boxes), nothing of it in a core file', () => {
  const src = read('src/data/ep4/errands.js') + read('src/data/ep4/errands_field.js');
  assert.ok(!src.includes(String.fromCharCode(0x2014)), 'no em dash');
  for (const e of X.ERRANDS) {
    for (const l of [...e.ask, ...e.give, ...e.deliver, ...e.chat.fetch, ...e.chat.deliver]) {
      const t = typeof l === 'string' ? l : l.text;
      assert.ok(/^[\x20-\x7e]+$/.test(t), `${e.id}: ASCII "${t}"`);
      assert.ok(t.length <= 120, `${e.id}: one box (${t.length}) "${t}"`);
    }
    for (const t of Object.values(e.journal)) assert.ok(t.length <= 110, `${e.id}: journal line (${t.length})`);
  }
  for (const s of X.MERCHANT.stops) for (const t of s.lines) assert.ok(/^[\x20-\x7e]+$/.test(t) && t.length <= 120, t);
  const core = [];
  const walk = (dir) => { for (const ent of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, ent.name);
    if (ent.isDirectory()) { if (!/^src\/data\/(ep[456]|worldmap)$/.test(rel)) walk(rel); } else if (rel.endsWith('.js') && /ep4\/errands|LQ_ERRANDS|xr_|penny_t|travel_cart/.test(read(rel))) core.push(rel);
  } };
  walk('src');
  assert.deepEqual(core, [], 'no startup file knows the errands');
  // the lazy worldmap pack reads globalThis.LQ_ERRANDS and never imports the ep4 pack (the map opens before Episode 4)
  for (const f of fs.readdirSync(path.join(NEXT, 'src/data/worldmap'))) {
    assert.ok(!/^import\b[^;]*ep4\/|\bimport\(\s*['"][^'"]*ep4\//m.test(read(`src/data/worldmap/${f}`)), `${f} never imports the ep4 pack`);
  }
});
