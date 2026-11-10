// E6-scene-ui (EPISODE6_PLAN 6.3 to 6.5, 9.3; BATTLE.md 14.2): the Gale on the battle stage. Pure node tests: the tables the pack
// fills; that battles without a Gale (Episodes 1 to 5) plan exactly as before; the planner's ops for the Gale's events in real
// fights (the Gust, its pushes as timeline slides, the Rewrite pinned under its own key, broken by Anchor with one line, the
// Scribe's three looks); the rows of the four big Episode 6 foes kept off their bodies and the ward's lights on the foes' side
// (CRITIQUE_7 item 2); the storm stages' clear grade and lightning limits; the cutscene rope; the Sky Compass's second
// description. The drawing is checked headless by qa/battlescene/ep6_shots.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKDROPS, BOSS_CARD } from '../../src/scenes/battle.js';
import { SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { planEvents, unitInfo } from '../../src/battle/scene/animator.js';
import { battle } from '../battle/_helpers.mjs';
import { partyAction } from '../../src/battle/ai.js';

const { registerData } = await import('../../tools/sim/ep6.mjs');
registerData();
(await import('../../src/data/ep4/scene.js')).register();
(await import('../../src/data/ep5/scene.js')).register();
const { setFieldHour } = await import('../../src/data/ep5/sky.js');
// plans of battles with no Gale, before this pack's scene module wraps anything (compared after)
function plainPlan(foes, opts, n = 8) {
  const b = battle(foes, opts);
  const evs = [...b.startEvents];
  for (let i = 0; i < n && !b.isOver(); i++) evs.push(...(b.current().side === 'party' ? b.perform(partyAction(b, 'competent')) : b.runEnemyTurn()));
  return JSON.stringify(planEvents(evs, { units: unitInfo(b.units()) }));
}
setFieldHour('noon');
const PLAIN = [
  [[{ id: 'ink_slime' }, { id: 'bookmite' }], { seed: 4 }],
  [[{ id: 'dune_stalker' }, { id: 'starsilt' }], { level: 23, seed: 2, options: { flags: { sky_learned: true } } }],
  [[{ id: 'oracle' }], { level: 24, seed: 3, options: { encounter: 'oracle', boss: true, canFlee: false, flags: { sky_learned: true } } }],
];
const before = PLAIN.map(([f, o]) => plainPlan(f, o));
const T = (await import('../../src/data/ep6/text.js')).EP6_BATTLE_TEXT;
const scene = await import('../../src/data/ep6/scene.js');
scene.register();
scene.register();

const helps = (ops) => ops.filter((o) => o.op === 'help').map((o) => o.text);
const FLAGS = { anchor_learned: true };

test('register fills the tables once: five stages, two cards, Anchor as Bram\'s signature', () => {
  const want = { ep6_airstair: 'ep6_battle_sky', ep6_causeways: 'ep6_battle_causeway', ep6_relays: 'ep6_battle_relays', ep6_storm: 'ep6_battle_storm', ep6_eyrie: 'ep6_battle_eyrie' };
  for (const [k, a] of Object.entries(want)) assert.equal(BACKDROPS[k].asset, a, k);
  assert.deepEqual(BOSS_CARD.gale_engine, { name: 'THE GALE ENGINE', sub: 'Keeper of the Broken Signals' });
  assert.deepEqual(BOSS_CARD.scribe, { name: 'THE STORM SCRIBE', sub: 'Writer of Every Course' });
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === 'anchor_line'), [{ unit: 'bram', flag: 'rewrite', skill: 'anchor_line' }]);
  assert.equal(scene.register()[0], 'already');
});

test('battles without a Gale plan exactly as before the pack (Episodes 1 to 5 unchanged)', () => {
  setFieldHour('noon');
  PLAIN.forEach(([f, o], i) => assert.equal(plainPlan(f, o), before[i], `plain plan ${i}`));
});

test('a real mixed-wind fight: the gauge, Aloft marks, the Gust once with its sound and streaks, pushes as slides, no "knocked back" lines', () => {
  const b = battle([{ id: 'squall_wolf' }, { id: 'gale_sprite' }], { level: 25, seed: 2, options: { flags: FLAGS } });
  const info = { units: unitInfo(b.units()) };
  const start = planEvents(b.startEvents, info);
  const g0 = start.find((o) => o.op === 'gale6');
  assert.ok(g0 && g0.gustIn === 5 && g0.every === 5, 'the gauge opens at 5');
  const aloft = start.filter((o) => o.op === 'gale6Aloft');
  assert.deepEqual(aloft.map((o) => [b.unit(o.uid).id, o.on]), [['gale_sprite', true]], 'only the sprite is Aloft');
  const evs = [];
  for (let i = 0; i < 12 && !b.isOver() && !b.state.gale.gusts; i++) evs.push(...(b.current().side === 'party' ? b.perform({ type: 'attack', target: b.living('enemy')[0].uid }) : b.runEnemyTurn()));
  assert.equal(b.state.gale.gusts, 1, 'a Gust fell');
  const ops = planEvents(evs, info);
  assert.equal(helps(ops).filter((t) => t === T.gust).length, 1, '"The wind gusts." once');
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'gale_gust'), 'gale_gust plays');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'gale6_gust'), 'streaks cross the stage');
  const pushes = ops.filter((o) => o.op === 'gale6Push');
  assert.ok(pushes.length >= 3, `every pushed unit is noted for its slide (${pushes.length})`);
  const gust = ops.findIndex((o) => o.op === 'gale6Gust');
  assert.ok(gust > ops.findIndex((o) => o.op === 'gale6Push'), 'the slides start after the pushes');
  assert.ok(!helps(ops).some((t) => /knocked back in line/.test(t)), 'no "knocked back in line!" line for a Gust push');
});

// the Scribe: a Rewrite pinned at Bram's turn, then Anchor, then the Gust
function scribeToPin(seed = 3) {
  const b = battle([{ id: 'scribe' }], { level: 27, seed, options: { encounter: 'scribe', boss: true, canFlee: false, flags: FLAGS } });
  const evs = [...b.startEvents];
  for (let i = 0; i < 400 && !b.isOver(); i++) {
    const u = b.current();
    if (b.state.gale.pinned && u.id === 'bram') break;
    evs.push(...(u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn()));
  }
  return { b, evs, info: { units: unitInfo(b.units()) } };
}

test('the Rewrite: pinned under its own key with the quill and its sound; the arc line leads; the answer names Bram only when true', () => {
  const { b, evs, info } = scribeToPin();
  const ops = planEvents(evs, info);
  assert.equal(helps(ops)[0], (await_arc()).scribe, 'the arc line is the first help line');
  const tel = ops.find((o) => o.op === 'telegraph' && o.rewrite);
  assert.ok(tel && tel.actor === `${b.state.gale.pinned.source}${scene.REWRITE}`, 'the telegraph is under the Rewrite key, never the Scribe\'s own');
  assert.ok(ops.some((o) => o.op === 'gale6Pin') && ops.some((o) => o.op === 'gale6Quill'), 'pinned to the marker, the quill writes');
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'rewrite_read'));
  assert.ok(ops.some((o) => o.op === 'help' && o.rewrite && /you go last/.test(o.text)), 'the line is the Rewrite\'s');
  assert.match(scene.answerLine({ b }), /Bram can anchor\./, 'his turn is now, before the Gust');
  const bram = b.unit('bram');
  bram.statuses.silence = { turns: 2 };
  assert.doesNotMatch(scene.answerLine({ b }), /Bram can anchor/, 'silenced: no promise');
  delete bram.statuses.silence;
  const mp = bram.mp;
  bram.mp = 3;
  assert.doesNotMatch(scene.answerLine({ b }), /Bram can anchor/, 'no MP: no promise');
  bram.mp = mp;
});
const arcs = (await import('../../src/data/ep6/text.js')).EP6_ARC_LINES;
function await_arc() { return arcs; }

test('Anchor breaks it at the Gust: the anchor cast, paper torn off the Scribe, rewrite_break, one clean line, the name once', () => {
  const { b, info } = scribeToPin();
  const evs = b.perform({ type: 'skill', skill: 'anchor_line' });
  for (let i = 0; i < 40 && !b.isOver() && !evs.some((e) => e.type === 'rewrite_broken'); i++) evs.push(...(b.current().side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn()));
  assert.ok(evs.some((e) => e.type === 'rewrite_broken' && e.reason === 'anchor'), 'broken by the anchor');
  const ops = planEvents(evs, info);
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'gale6_anchor'), 'the anchor drops at Bram\'s feet');
  assert.ok(!ops.some((o) => o.op === 'sfx' && o.id === 'heal'), 'no heal chime on Anchor');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'gale6_tear'), 'paper tears off the Scribe');
  assert.ok(ops.some((o) => o.op === 'sfx' && o.id === 'rewrite_break'), 'rewrite_break plays');
  const h = helps(ops);
  assert.equal(h.filter((t) => t === T.rewrite_broken).length, 1, `"${T.rewrite_broken}" once`);
  assert.ok(!h.some((t) => /The course holds\.$/.test(t) || /knocked back|fizzles|stops\./.test(t)), `no second line (${h.join(' | ')})`);
  assert.equal(h.filter((t) => /Anchor/.test(t)).length, 1, 'the action name prints once');
  assert.ok(ops.some((o) => o.op === 'telegraphCancel' && o.actor === `${evs.find((e) => e.type === 'rewrite_broken').source}${scene.REWRITE}`), 'the Rewrite\'s own telegraph is cancelled');
  assert.ok(ops.some((o) => o.op === 'gale6Anchor' && o.on) && ops.some((o) => o.op === 'gale6Unpin'));
});

test('the Scribe\'s looks: the opening phase changes nothing, the ward and the chart swap the frames; the ward tears to the clear sky', () => {
  const units = [{ uid: 'hero', id: 'hero', name: 'Arden', side: 'party' }, { uid: 'e0', id: 'scribe', name: 'The Storm Scribe', side: 'enemy', boss: true, maxHp: 3900 }];
  const info = { units: unitInfo(units) };
  const p1 = planEvents([{ type: 'phase', actor: 'e0', phase: 1, id: 'wind_script', name: 'The Wind Script', text: 'x', sprite: 'scribe' }], info);
  assert.ok(!p1.some((o) => o.op === 'swapSprite' || o.op === 'banner'), 'phase 1: no swap');
  const p2 = planEvents([{ type: 'phase', actor: 'e0', phase: 2, id: 'storm_ward', name: 'The Storm Script Ward', text: 'x', sprite: 'scribe_ward' }], info);
  assert.deepEqual(p2.filter((o) => o.op === 'swapSprite').map((o) => o.sprite), ['scribe_ward']);
  const p3 = planEvents([{ type: 'phase', actor: 'e0', phase: 3, id: 'true_sky_chart', name: 'The True Sky Chart', text: 'x', sprite: 'scribe_chart' }], info);
  assert.deepEqual(p3.filter((o) => o.op === 'swapSprite').map((o) => o.sprite), ['scribe_chart']);
  const tear = planEvents([{ type: 'message', kind: 'ward_break', target: 'e0', text: 'The Storm Script Ward tears!' }], info);
  assert.ok(tear.some((o) => o.op === 'gale6Clear') && tear.some((o) => o.op === 'ward' && !o.on), 'the ward goes and the stage clears');
  assert.deepEqual(helps(tear), [T.ward_tears]);
});

test('the Engine: bellows on and off, its sprites ride out of the vents without a second line', () => {
  const units = [{ uid: 'hero', id: 'hero', name: 'Arden', side: 'party' }, { uid: 'e0', id: 'gale_engine', name: 'The Gale Engine', side: 'enemy', boss: true, maxHp: 1750 }];
  const info = { units: unitInfo(units) };
  const ops = planEvents([
    { type: 'message', kind: 'bellows', target: 'e0', text: 'The bellows stall!' },
    { type: 'message', kind: 'vents', target: 'e0', text: 'The Engine opens its vents! Two Gale Sprites ride out on the wind.' },
    { type: 'summon', enemy: 'e1', id: 'gale_sprite', name: 'Gale Sprite', by: 'e0' },
  ], info);
  assert.deepEqual(ops.filter((o) => o.op === 'gale6Bellows').map((o) => o.on), [false]);
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'gale6_ride'));
  assert.equal(helps(ops).filter((t) => /appears/.test(t)).length, 0, 'no "Gale Sprite appears!" after the vents line');
});

test('rows: the Engine and the Scribe never across the body; the Beacon and the Compass beside the Scribe, the Compass row under its feet', async () => {
  const L = await import('../../src/battle/scene/layout.js');
  L.STAGE.tall.clear();
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const party = [[290, 146], [318, 146], [346, 146]].map(([x, y]) => ({ x: x - 12, y: y - 36, w: 24, h: 36, party: true }));
  const partyLeft = Math.min(...party.map((p) => p.x));
  const cw = L.CMD_WIN_TOUCH;
  const w = 15 + 15 + 15 * 4;   // shield, the Aloft badge, four weakness slots (the widest row)
  for (const [id, fw, fh] of [['gale_engine', 141, 107], ['scribe', 155, 148]]) {
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
    const a = L.enemyRowAnchor(d, false, L.CMD_WIN), b = L.spriteBox(d, true);
    assert.ok(!hit({ x: a.x, y: a.y, w, h: L.ENEMY_ROW_H }, { x: b.x, y: b.y, w: b.w, h: Math.round(b.h * 0.55) }), `${id} desktop: the row at the feet, not across the head or chest`);
  }
  const unit = (uid, id, x, y, uw, uh) => ({ uid, id, side: 'enemy', x, y, homeX: x, homeY: y, w: uw, h: uh });
  const scribe = unit('e0', 'scribe', L.BOSS_SLOT.x, L.BOSS_SLOT.y, 155, 148);
  const lights = [['e1', 'false_beacon', 45, 60, 15 * 5], ['e2', 'broken_compass', 51, 63, 15 * 4]]
    .map(([uid, id, uw, uh, rw]) => ({ u: unit(uid, id, scene.WARD_SPOTS[id].x, scene.WARD_SPOTS[id].y, uw, uh), w: rw }));
  for (const f of lights) {
    const b = L.spriteBox(f.u, true);
    assert.ok(b.x + b.w < partyLeft - 8, `${f.u.id} stands on the foes' side, clear of the party (${b.x + b.w} < ${partyLeft - 8})`);
    assert.ok(!hit(b, L.spriteBox(scribe, true)), `${f.u.id} is beside the Scribe, not inside it`);
    assert.ok(!hit(b, cw), `${f.u.id} is clear of the phone's command window`);
  }
  const bodies = [scribe, ...lights.map((f) => f.u)].map((u) => ({ uid: u.uid, ...L.spriteBox(u, true) }));
  for (const helpBottom of [23, 34, 46]) {
    const placed = [];
    for (const f of lights) {
      const others = [...party, ...bodies.filter((b) => b.uid !== f.u.uid)];
      const s = L.touchRowSpot(f.u, f.w, { cw, blocks: L.topBlocks(helpBottom), boxes: others, placed });
      const box = { x: s.x, y: s.y, w: f.w, h: L.ENEMY_ROW_H };
      if (f.u.id === 'broken_compass') assert.equal(s.place, 'below', `${f.u.id}, help bottom ${helpBottom}: the row under its feet (got ${s.place})`);
      else assert.ok(s.place === 'below' || s.place === 'right', `${f.u.id}: the row under it or beside it in the air (got ${s.place})`);
      assert.equal(s.score, 0, `${f.u.id}: the row covers nothing`);
      for (const o of others) assert.ok(!hit(box, o), `${f.u.id}: its row ${JSON.stringify(box)} is clear of ${o.uid || 'the party'}`);
      for (const p of placed) assert.ok(!hit(box, p), `${f.u.id}: its row is clear of the other light's row`);
      placed.push(box);
    }
  }
  // desktop: the Compass's row at its feet (the anchor); the Beacon's is placed beside it (rowBeside: scored like the phone's)
  const bs = L.touchRowSpot({ ...lights[0].u, rowBeside: true }, lights[0].w, { cw: L.CMD_WIN, blocks: L.topBlocks(23), boxes: [...party, ...bodies.filter((b) => b.uid !== 'e1')] });
  assert.equal(bs.score, 0, `desktop: the Beacon's row covers nothing (${JSON.stringify(bs)})`);
  const rows = [{ x: bs.x, y: bs.y, w: lights[0].w, h: L.ENEMY_ROW_H }, { ...L.enemyRowAnchor(lights[1].u, false, L.CMD_WIN), w: lights[1].w, h: L.ENEMY_ROW_H }];
  assert.ok(!hit(rows[0], rows[1]), `desktop: the two rows apart ${JSON.stringify(rows)}`);
  for (const r of rows) for (const p of party) assert.ok(!hit(r, p), 'desktop: a light\'s row is clear of the party');
  assert.ok(rows[1].y >= lights[1].u.y - 4, `desktop: the Compass's row is at its feet (${rows[1].y} vs feet ${lights[1].u.y})`);
  const box = (f) => L.spriteBox(f.u, true);
  assert.ok(!hit(rows[0], box(lights[1])) && !hit(rows[1], box(lights[0])), 'desktop: neither light row crosses the other light');
});

test('the storm stages: the clear grade lifts the sky well over the storm; lightning stays under +0.12 luma, at most once in 4 s', () => {
  const w = 40, h = 30, px = new Uint8ClampedArray(w * h * 4);
  const lum = (i) => (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
  for (let i = 0; i < w * h; i++) { const y = Math.floor(i / w); px.set([60 + y, 70 + y, 96 + y, 255], i * 4); }   // a slate storm wall
  let s0 = 0; for (let i = 0; i < w * 20; i++) s0 += lum(i * 4);
  scene.paintClear(px, w, h, 20);
  let s1 = 0; for (let i = 0; i < w * 20; i++) s1 += lum(i * 4);
  assert.ok(s1 / (w * 20) - s0 / (w * 20) >= 0.12, `the clear sky is at least 0.12 lighter (${(s0 / (w * 20)).toFixed(3)} -> ${(s1 / (w * 20)).toFixed(3)})`);
  const below = px[(25 * w) * 4];
  assert.equal(below, 60 + 25, 'rows under the band keep their colour');
  const L = scene.STORM.lightning;
  const peak = Math.max(...Array.from({ length: 20 }, (_, t) => scene.flashLevel(t)));
  assert.equal(peak, 1);
  const lumHex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  assert.ok(Math.min(1, L.peakLumaRise / lumHex(L.color)) * lumHex(L.color) <= 0.12 + 1e-9, 'the flash adds at most 0.12 luma');
  assert.equal(scene.flashLevel(L.riseFrames + L.fallFrames), 0, 'and it is over in 12 frames');
});

test('the rope: s.rope(from, to) draws a line between the marks through the field\'s flare pass; s.rope(null) and the scene\'s end clear it', async () => {
  const { Cutscene } = await import('../../src/world/cutscene.js');
  const drawn = [];
  const flares = { drawFlares() { drawn.push('flares'); } };
  const field = { engine: { waitFrames: () => Promise.resolve() }, glass: flares, actors: [], map: { id: 'ep6_obs_f3', mark: (m) => ({ bram_line: [18, 13], vex_hang: [19, 13] }[m] || null) }, actorById: () => null };
  const cs = new Cutscene(field);
  let saw = null;
  const STORY = await import('../../src/game/story.js');
  STORY.registerStory({ scenes: { _rope_test: async (s) => { saw = 'rope' in s; await s.rope('bram_line', 'vex_hang'); field.mid = field.rope6 && { ...field.rope6 }; await s.rope(null); field.after = field.rope6; await s.rope('bram_line', 'vex_hang'); } }, lines: {}, conditions: {} });
  await cs.run('_rope_test');
  assert.equal(saw, true, '\'rope\' in s');
  assert.deepEqual([field.mid.from, field.mid.to], [[18, 13], [19, 13]]);
  assert.equal(field.after, null, 's.rope(null) clears it');
  assert.equal(field.rope6, null, 'the end of the scene clears it');
  const px = [];
  field.rope6 = { from: [18, 13], to: [19, 13], t: 12 };
  scene.drawRope({ rect: (x, y, w2, h2, c) => px.push([x, y, c]) }, field);
  assert.ok(px.length >= 16, 'a line of pixels between the two marks');
  assert.ok(px.every(([x]) => x >= 18 * 16 + 8 && x <= 19 * 16 + 8), 'from Bram\'s mark to Vex\'s');
  flares.drawFlares({ rect() {} }, 0);
  assert.ok(drawn.includes('flares'), 'the field\'s own flares still draw');
});

test('the Sky Compass: its description changes once compass_restored is set', async () => {
  const { KEY_ITEMS } = await import('../../src/data/items.js');
  const it = KEY_ITEMS.sky_compass;
  assert.ok(it && it.descAfter, 'the item and its second description');
  const was = globalThis.LQ_ENGINE;
  try {
    globalThis.LQ_ENGINE = { game: { flags: {} } };
    assert.match(it.desc, /spinning/);
    globalThis.LQ_ENGINE.game.flags.compass_restored = true;
    assert.match(it.desc, /steady now/);
    globalThis.LQ_ENGINE = undefined;
    assert.match(it.desc, /spinning/, 'no game: the first description');
  } finally { globalThis.LQ_ENGINE = was; }
});
