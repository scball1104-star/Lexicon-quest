// E5-scene-ui (EPISODE5_PLAN 6.3 to 6.5, 9.3): the Turning Sky on the battle stage. Pure node tests: the tables the pack fills, the
// planner's ops for the sky's events (a real battle and the Oracle's foretelling), the rows of the tall Episode 5 foes kept off
// their bodies (CRITIQUE_6 item 2), and that a battle without a sky plans exactly as before. The drawing is checked headless by
// qa/battlescene/ep5_autobattle.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKDROPS, BOSS_CARD } from '../../src/scenes/battle.js';
import { SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { planEvents, unitInfo } from '../../src/battle/scene/animator.js';
import { battle } from '../battle/_helpers.mjs';

const { registerData } = await import('../../tools/sim/ep5.mjs');
registerData();
const ep5text = await import('../../src/data/ep5/text.js');
(await import('../../src/data/ep4/scene.js')).register();   // the Episode 4 stage is up first, as in the game
// a plan of a battle with no sky, before this pack's scene module wraps anything (compared after)
const plainBefore = (() => {
  const b = battle([{ id: 'ink_slime' }, { id: 'bookmite' }], { seed: 4 });
  const evs = [...b.startEvents];
  for (let i = 0; i < 6 && !b.isOver(); i++) evs.push(...(b.current().side === 'party' ? b.perform({ type: 'attack', target: b.living('enemy')[0].uid }) : b.runEnemyTurn()));
  return { evs, info: unitInfo(b.units()) };
})();
const before = JSON.stringify(planEvents(plainBefore.evs, { units: plainBefore.info }));
const scene = await import('../../src/data/ep5/scene.js');
scene.register();
scene.register();

const helps = (ops) => ops.filter((o) => o.op === 'help').map((o) => o.text);

test('register fills the tables once: five stages, two cards, Turn the Sky as Mira\'s signature', () => {
  for (const k of ['ep5_sea', 'ep5_dunes', 'ep5_gallery', 'ep5_well', 'ep5_oracle']) assert.equal(BACKDROPS[k].asset, `ep5_battle_${k.slice(4)}`, k);
  assert.deepEqual(BOSS_CARD.mirage_knight, { name: 'THE MIRAGE KNIGHT', sub: 'Warden of False Horizons' });
  assert.deepEqual(BOSS_CARD.oracle, { name: 'THE SAND ORACLE', sub: 'Reader of Every Road' });
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === 'turn_sky'), [{ unit: 'mira', flag: 'foretold', skill: 'turn_sky' }]);
  assert.equal(register2(), 'already');
});
function register2() { return scene.register()[0]; }

test('a battle without a sky plans exactly as before the pack (Episodes 1 to 4 unchanged)', () => {
  assert.equal(JSON.stringify(planEvents(plainBefore.evs, { units: plainBefore.info })), before);
});

test('the side a foe shows follows the sky and Exposed', () => {
  assert.equal(scene.shownSide('day', false), 'sun');
  assert.equal(scene.shownSide('day', true), 'star');
  assert.equal(scene.shownSide('night', false), 'star');
  assert.equal(scene.shownSide('night', true), 'sun');
});

test('a real mixed fight: the start sky, Turn the Sky, the sides change with the Turn and the action name prints once', () => {
  const b = battle([{ id: 'dune_stalker' }, { id: 'starsilt' }], { level: 23, seed: 2, options: { flags: { sky_learned: true }, inventory: { potion: 2 } } });
  const info = { units: unitInfo(b.units()) };
  const start = planEvents(b.startEvents, info);
  const sky0 = start.find((o) => o.op === 'sky5');
  assert.ok(sky0 && sky0.turnIn === 6, 'the start sky and the Turn');
  assert.ok(start.some((o) => o.op === 'sky5Exposed' && o.on), 'the foe under the other sky opens Exposed');
  while (b.current().uid !== 'mira') b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
  const evs = b.perform({ type: 'skill', skill: 'turn_sky' });
  const ops = planEvents(evs, info);
  const turn = ops.findIndex((o) => o.op === 'sky5Turn');
  const line = ops.findIndex((o) => o.op === 'help' && /The sky turns\./.test(o.text));
  const sides = ops.map((o, i) => (o.op === 'sky5Exposed' ? i : -1)).filter((i) => i >= 0);
  assert.ok(turn >= 0 && line > turn, 'the Turn, then its line');
  assert.equal(sides.length, 2, 'both foes change side');
  assert.ok(sides.every((i) => i > turn && i < line), 'the sides change with the Turn, before its line');
  assert.ok(ops.some((o) => o.op === 'sfx' && /^sky_turn_(day|night)$/.test(o.id)), 'the Turn plays sky_turn_<sky>');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'sky_cast'), 'Mira casts a sky ring, not the light burst');
  assert.ok(!ops.some((o) => o.op === 'sfx' && o.id === 'heal'), 'no heal chime on Turn the Sky');
  assert.equal(helps(ops).filter((t) => /Turn the Sky/.test(t)).length, 1, 'the action name prints once');
});

// the Oracle's Last Prophecy, in sky.js's event order: pinned, Mira turns the sky, the reading breaks
const units = [
  { uid: 'hero', id: 'hero', name: 'Arden', side: 'party' }, { uid: 'mira', id: 'mira', name: 'Mira', side: 'party' },
  { uid: 'e0', id: 'oracle', name: 'The Sand Oracle', side: 'enemy', boss: true, maxHp: 4000 },
];
const info = { units: unitInfo(units) };
const PIN = [
  { type: 'foretell', source: 'e0', target: 'hero', pinned: true, turnIn: 3, skill: 'last_prophecy' },
  { type: 'telegraph', actor: 'e0', skill: 'last_prophecy', name: 'The Last Prophecy', text: "The Oracle reads Arden's star. It falls when the sky turns.", target: 'hero', targets: ['hero'], nextTurn: 3, foretell: true, sfx: 'prophecy_read' },
];
const TURNED = [
  { type: 'action_start', actor: 'mira', action: { type: 'skill', skill: 'turn_sky', name: 'Turn the Sky' }, targets: [], fx: 'buff' },
  { type: 'mp', target: 'mira', mp: 100, maxMp: 132, cost: 12 },
  { type: 'sky_turn', sky: 'night', natural: false, by: 'mira', sfx: 'sky_turn' },
  { type: 'message', text: 'The sky turns. Night.', kind: 'sky' },
  { type: 'exposed', target: 'e0', on: true, side: 'sun' },
  { type: 'ascendant', target: 'e0', on: false, side: 'sun' },
  { type: 'foretell_broken', source: 'e0', target: 'hero', reason: 'turned', sfx: 'prophecy_break' },
  { type: 'message', text: 'The words change.', kind: 'foretell_broken', target: 'e0', sfx: 'prophecy_break' },
  { type: 'break', target: 'e0' },
  { type: 'sky', sky: 'night', turnIn: 6, reason: 'turned' },
];

test('the foretelling: pinned under its own key (never the reader\'s Sandstorm), the member marked, the answer\'s owner named', () => {
  const ops = planEvents(PIN, info);
  const tel = ops.find((o) => o.op === 'telegraph');
  assert.equal(tel.actor, `e0${scene.FORETELL}`);
  assert.ok(tel.foretell);
  assert.ok(ops.some((o) => o.op === 'sky5Pin' && o.target === 'hero' && o.source === 'e0'));
  assert.ok(ops.some((o) => o.op === 'status' && o.uid === 'hero' && o.status === 'foretold' && o.on));
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'prophecy_read'));
  assert.ok(ops.some((o) => o.op === 'help' && o.foretell && /reads Arden's star/.test(o.text)), 'the telegraph line (the scene adds who can turn the sky)');
});

test('Turn the Sky breaks it: stars, prophecy_break, one clean line, no second "is BROKEN!"', () => {
  const ops = planEvents(TURNED, info);
  const lines = helps(ops);
  assert.equal(lines.filter((t) => /Turn the Sky/.test(t)).length, 1, 'the action name once');
  assert.ok(lines.includes(ep5text.EP5_BATTLE_TEXT.prophecy_broken), lines.join(' | '));
  assert.ok(!lines.some((t) => /BROKEN/.test(t)), lines.join(' | '));
  assert.ok(!lines.includes('The words change.'), 'the bare line is replaced');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'sky_stars' && o.uid === 'e0'));
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'prophecy_break'));
  assert.ok(ops.some((o) => o.op === 'telegraphCancel' && o.actor === `e0${scene.FORETELL}`));
  assert.ok(ops.some((o) => o.op === 'sky5Unpin'));
  assert.ok(ops.some((o) => o.op === 'break' && o.uid === 'e0'), 'the Break itself still plays');
  // a later Break (no foretelling) prints as always
  assert.ok(helps(planEvents([{ type: 'break', target: 'e0' }], info)).some((t) => /BROKEN/.test(t)));
});

test('the reading falls: the cancel is the foretelling\'s, never the Sandstorm the Oracle also holds', () => {
  const ops = planEvents([{ type: 'foretell_fall', source: 'e0', target: 'hero' },
    { type: 'action_start', actor: 'e0', action: { type: 'enemy', skill: 'last_prophecy', name: 'The Last Prophecy' }, targets: ['hero'], fx: 'devour', sfx: 'prophecy_read', charged: true },
    { type: 'damage', target: 'hero', amount: 300, hp: 100, maxHp: 410 }], info);
  const cancels = ops.filter((o) => o.op === 'telegraphCancel');
  assert.deepEqual(cancels.map((o) => o.actor), [`e0${scene.FORETELL}`]);
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'sky_fall' && o.uid === 'hero'));
});

test('the Oracle\'s looks: the opening phase changes nothing, the next two swap the frames', () => {
  const ph = (phase, id, sprite) => planEvents([{ type: 'phase', actor: 'e0', phase, id, name: id, text: 't', sprite }], info);
  assert.ok(!ph(1, 'read_sky', 'oracle').some((o) => o.op === 'swapSprite'));
  assert.ok(ph(2, 'false_futures', 'oracle_futures').some((o) => o.op === 'swapSprite' && o.sprite === 'oracle_futures'));
  assert.ok(ph(3, 'true_horizon', 'oracle_true').some((o) => o.op === 'swapSprite' && o.sprite === 'oracle_true'));
  const veil = planEvents([{ type: 'message', text: 'A Mirage Veil closes.', kind: 'veil', target: 'e0' }, { type: 'message', text: 'The Mirage Veil tears!', kind: 'veil_break', target: 'e0' }], info);
  assert.deepEqual(veil.filter((o) => o.op === 'sky5Veil').map((o) => o.on), [true, false]);
  assert.ok(helps(veil).includes(ep5text.EP5_BATTLE_TEXT.veil_tears));
});

test('the arc lines lead the boss fights (the help window while the card shows)', () => {
  for (const id of ['mirage_knight', 'oracle']) {
    const ops = planEvents([{ type: 'battle_start', boss: true, units: [{ uid: 'e0', id, name: id, side: 'enemy', boss: true }] }], { units: {} });
    assert.equal(helps(ops)[0], ep5text.EP5_ARC_LINES[id], id);
  }
});

// CRITIQUE_6 item 2 for the Episode 5 tall foes: on the phone (touch layout) the Knight's and the Oracle's weakness rows stand clear
// of their bodies whatever the help window's height; on desktop the row sits at the feet, never across the head or chest.
test('the Knight and the Oracle: their weakness rows never cross the body (phone) or the head and chest (desktop)', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  L.STAGE.tall.clear();
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const party = [[300, 150], [324, 146], [348, 150]].map(([x, y]) => ({ x: x - 12, y: y - 36, w: 24, h: 36, party: true }));
  const cw = L.CMD_WIN_TOUCH;
  const w = 15 + 15 + 15 * 3;   // shield, the sky badge, three weakness slots
  for (const [id, fw, fh] of [['mirage_knight', 97, 98], ['oracle', 121, 118]]) {
    const home = L.touchEnemySlot(L.BOSS_SLOT, { w: fw, h: fh });
    const u = { uid: 'e0', id, side: 'enemy', x: home.x, y: home.y, homeX: home.x, homeY: home.y, w: fw, h: fh };
    const own = L.spriteBox(u, true);
    for (const helpBottom of [23, 34, 46, 59]) {
      const s = L.touchRowSpot(u, w, { cw, blocks: L.topBlocks(helpBottom), boxes: party });
      const box = { x: s.x, y: s.y, w, h: L.ENEMY_ROW_H };
      assert.ok(!hit(box, own), `${id}, help bottom ${helpBottom}: row ${JSON.stringify(box)} (${s.place}) inside the body ${JSON.stringify(own)}`);
      assert.ok(!hit(box, cw), `${id}: clear of the command window`);
    }
    const d = { ...u, x: L.BOSS_SLOT.x, y: L.BOSS_SLOT.y, homeX: L.BOSS_SLOT.x, homeY: L.BOSS_SLOT.y };
    const a = L.enemyRowAnchor(d, false, L.CMD_WIN);
    const b = L.spriteBox(d, true);
    const top = { x: b.x, y: b.y, w: b.w, h: Math.round(b.h * 0.55) };
    assert.ok(!hit({ x: a.x, y: a.y, w, h: L.ENEMY_ROW_H }, top), `${id} desktop: the row at the feet, not across the head or chest`);
  }
});

// CRITIQUE_7 item 2 (E5-fixes A4): the False Futures stand on the foes' side, by the Oracle, each with its row under its own
// feet: never over the party, the other Future or the Oracle, and the two rows never meet (phone and desktop).
test('the False Futures: foe-side spots by the Oracle, each row under its own feet, clear of the party and of each other', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  L.STAGE.tall.clear();
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const party = [[300, 150], [324, 146], [348, 150]].map(([x, y]) => ({ x: x - 12, y: y - 36, w: 24, h: 36, party: true }));
  const unit = (uid, id, x, y, w, h) => ({ uid, id, side: 'enemy', x, y, homeX: x, homeY: y, w, h });
  const oracle = unit('e0', 'oracle', L.BOSS_SLOT.x, L.BOSS_SLOT.y, 141, 118);
  const futs = [['e1', 'future_hunger', 15 * 3], ['e2', 'future_fear', 15 * 4]].map(([uid, id, w]) => ({ u: unit(uid, id, scene.FUTURE_SPOTS[id].x, scene.FUTURE_SPOTS[id].y, 37, 57), w }));
  const partyLeft = Math.min(...party.map((p) => p.x));
  for (const f of futs) {
    const b = L.spriteBox(f.u, true);
    assert.ok(b.x + b.w < partyLeft - 12, `${f.u.id} stands on the foes' side, clear of the party (${b.x + b.w} < ${partyLeft})`);
    assert.ok(!hit(b, L.spriteBox(oracle, true)), `${f.u.id} is beside the Oracle, not inside it`);
  }
  const bodies = [oracle, ...futs.map((f) => f.u)].map((u) => ({ uid: u.uid, ...L.spriteBox(u, true) }));
  for (const helpBottom of [23, 34, 46]) {
    const placed = [];
    for (const f of futs) {
      const others = [...party, ...bodies.filter((b) => b.uid !== f.u.uid)];
      const s = L.touchRowSpot(f.u, f.w, { cw: L.CMD_WIN_TOUCH, blocks: L.topBlocks(helpBottom), boxes: others, placed });
      const box = { x: s.x, y: s.y, w: f.w, h: L.ENEMY_ROW_H };
      assert.equal(s.place, 'below', `${f.u.id}, help bottom ${helpBottom}: the row under its feet (got ${s.place})`);
      for (const o of others) assert.ok(!hit(box, o), `${f.u.id}: its row ${JSON.stringify(box)} is clear of ${o.uid || 'the party'}`);
      for (const p of placed) assert.ok(!hit(box, p), `${f.u.id}: its row is clear of the other Future's row`);
      placed.push(box);
    }
  }
  const rows = futs.map((f) => ({ ...L.enemyRowAnchor(f.u, false, L.CMD_WIN), w: f.w, h: L.ENEMY_ROW_H }));
  assert.ok(!hit(rows[0], rows[1]), `desktop: the two rows apart ${JSON.stringify(rows)}`);
  for (const r of rows) for (const p of party) assert.ok(!hit(r, p), 'desktop: a Future\'s row is clear of the party');
});
