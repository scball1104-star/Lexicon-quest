// E8-scene-ui (EPISODE8_PLAN 6.3 to 6.5, 9.3, 12; BATTLE.md 17): Episode 8 on the battle stage. Pure node tests: the tables the pack fills;
// that battles without Erasure (Episodes 1 to 7) plan exactly as before; the planner's ops for Erasure's events in real fights (a rub, a
// slide, the Unwrite pinned with unwrite_read and its hint, Read Aloud breaking it with gold letters and unwrite_break, the Eraser's four
// looks with the gold grade at the ward's break and boss_eraser_silence at phase 4, the Last Silence's jingle, no white flash from this
// pack); the row placement of the Eraser in all four looks and of Grief, Change and the Sentry (CRITIQUE_8 item 1); the white-out cap;
// the charge bar; the cutscene helpers; the Load Game star. The drawing is checked headless by qa/battlescene/ep8_shots.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BACKDROPS, BOSS_CARD } from '../../src/scenes/battle.js';
import { SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { planEvents, unitInfo } from '../../src/battle/scene/animator.js';
import { makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { battle } from '../battle/_helpers.mjs';

const { makeParty } = await import('../../tools/sim/simulate.mjs');
const { registerData } = await import('../../tools/sim/ep8.mjs');
registerData();
for (const ep of ['ep4', 'ep5', 'ep6', 'ep7']) (await import(`../../src/data/${ep}/scene.js`)).register();
const { setFieldHour } = await import('../../src/data/ep5/sky.js');
setFieldHour('noon');
// plans of battles with no Erasure, before this pack's scene module wraps anything (compared after)
function plainPlan(foes, opts, n = 30) {
  const b = battle(foes, opts);
  const evs = [...b.startEvents];
  for (let i = 0; i < n && !b.isOver(); i++) evs.push(...(b.current().side === 'party' ? b.perform(partyAction(b, 'competent')) : b.runEnemyTurn()));
  return JSON.stringify(planEvents(evs, { units: unitInfo(b.units()) }));
}
const PLAIN = [
  [[{ id: 'ink_slime' }, { id: 'bookmite' }], { seed: 4 }],
  [[{ id: 'white_phantom' }], { level: 30, seed: 3, options: { encounter: 'white_phantom', boss: true, canFlee: false, flags: { call_learned: true } } }],
  [[{ id: 'scribe' }], { level: 27, seed: 3, options: { encounter: 'scribe', boss: true, canFlee: false, flags: { anchor_learned: true } } }],
  [[{ id: 'oracle' }], { level: 24, seed: 3, options: { encounter: 'oracle', boss: true, canFlee: false, flags: { sky_learned: true } } }],
  [[{ id: 'barrister' }], { level: 18, seed: 3, options: { encounter: 'barrister', boss: true, canFlee: false, flags: { hero_signed: true } } }],
  [[{ id: 'paper_regent' }], { level: 20, seed: 2, options: { encounter: 'paper_regent', boss: true, canFlee: false, flags: { hero_signed: true } } }],
];
const before = PLAIN.map(([f, o]) => plainPlan(f, o));
const scene = await import('../../src/data/ep8/scene.js');
scene.register();
scene.register();
const T = (await import('../../src/data/ep8/text.js')).EP8_BATTLE_TEXT;
const er = await import('../../src/data/ep8/erasure.js');
const L = await import('../../src/battle/scene/layout.js');

const FLAGS = { read_learned: true, hero_signed: true, call_learned: true, sky_learned: true, anchor_learned: true, bram_memory_3: true };
const helps = (ops) => ops.filter((o) => o.op === 'help').map((o) => o.text);
const sfx = (ops) => ops.filter((o) => o.op === 'sfx').map((o) => o.id);
/** A real Episode 8 fight at Lv 33, played by `act` (careful by default; sturdy party: the plan is read, not the result). */
function fight(enc, { seed = 3, n = 200, act = null, level = 33, stop = null } = {}) {
  const zone = enc === 'eraser' ? 'ep8_last_word' : 'ep8_library_f2';
  const b = battle([{ id: enc }], { party: makeParty(zone, level), rng: makeRng(seed), options: { zone, encounter: enc, boss: true, canFlee: false, flags: FLAGS, inventory: { hi_potion: 6, fresh_ink: 3 } } });
  if (!b.state.erasure) b.begin();
  for (const u of b.living('party')) { u.hp = u.maxHp = 99999; }
  const evs = [...b.startEvents];
  for (let i = 0; i < n && !b.isOver(); i++) {
    if (stop && stop(b, evs)) break;
    const u = b.current();
    evs.push(...(u.side === 'party' ? b.perform(act ? act(u, b) : partyAction(b, 'competent')) : b.runEnemyTurn()));
  }
  return { b, evs, ops: planEvents(evs, { units: unitInfo(b.units()) }) };
}

test('register fills the tables once: five stages, two cards, both signature rows, the Eraser\'s head box', () => {
  for (const k of ['ep8_battle_stair', 'ep8_battle_library', 'ep8_battle_palimpsest', 'ep8_battle_unwritten', 'ep8_battle_lastword']) {
    assert.ok(BACKDROPS[k] && BACKDROPS[k].asset === k, k);
    assert.ok(fs.existsSync(new URL(`../../assets/backdrops/${k}.png`, import.meta.url)), `${k}.png exists`);
  }
  assert.equal(BOSS_CARD.eraser.name, 'THE ERASER');
  assert.equal(BOSS_CARD.unnamed_sentry.name, 'THE UNNAMED SENTRY');
  assert.equal(SIGNATURE_TECHS.filter((t) => t.skill === 'read_aloud').length, 1, 'once');
  assert.equal(SIGNATURE_TECHS.filter((t) => t.flag === 'last_silence').length, 1, 'once');
  assert.ok(L.HEAD_BOX.eraser);
  assert.deepEqual(scene.register(), ['already']);
});

test('battles without Erasure plan exactly as before the pack (Episodes 1 to 7 unchanged)', () => {
  const after = PLAIN.map(([f, o]) => plainPlan(f, o));
  PLAIN.forEach((_, i) => assert.equal(after[i], before[i], `plain battle ${i} plans the same`));
});

test('a rub: er8Rub with its count and the crumbs fx; Defend slides the ink with ink_slide; "{name}\'s {command} is rubbed out."', () => {
  const attacker = (u, b) => (u.id === 'bram' && !er.isRubbed(b, u.uid, 'attack') ? { type: 'attack', target: b.living('enemy')[0].uid } : { type: 'defend' });
  const { ops } = fight('eraser', { act: attacker, n: 40 });
  const rub = ops.find((o) => o.op === 'er8Rub');
  assert.ok(rub && rub.cmd === 'attack' && rub.left === 2, JSON.stringify(rub));
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'ep8_rub' && o.uid === rub.uid), 'the crumbs fly');
  assert.ok(helps(ops).some((t) => /'s Attack is rubbed out\.$/.test(t)), 'the line');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'ep8_slide'), 'a Defend slides the ink');
  assert.ok(sfx(ops).includes('ink_slide'));
  assert.ok(helps(ops).includes(T.ink_slides));
  assert.ok(ops.some((o) => o.op === 'er8RubEnd'), 'the rub runs out');
});

test('the Unwrite: pinned with unwrite_read and the read hint; Read Aloud breaks it with gold letters, unwrite_break and its line', () => {
  const { ops, evs } = fight('eraser', { n: 120 });
  const tele = ops.find((o) => o.op === 'telegraph' && o.skill === 'unwrite');
  assert.ok(tele && tele.er8 === 'pin' && tele.target, JSON.stringify(tele));
  assert.ok(ops.some((o) => o.op === 'help' && o.hint8 === 'read'), 'the hint is appended at play time');
  assert.ok(sfx(ops).includes('unwrite_read'));
  assert.ok(evs.some((e) => e.type === 'unwrite_broken' && e.reason === 'read'), 'careful play reads one back');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'ep8_read' && o.to), 'the letters travel to the one read');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'ep8_break'), 'the grey peels off');
  assert.ok(sfx(ops).includes('unwrite_break'));
  assert.ok(sfx(ops).includes('read_cast'));
  assert.ok(helps(ops).some((t) => /reads .*name aloud\. It stays\.$/.test(t)), 'the break line');
  // no core "X stops." for a read or a landing
  const cancelLines = helps(ops).filter((t) => /The Eraser stops\./.test(t));
  assert.equal(cancelLines.length, 0, 'a read or a landing never says "stops."');
});

test('the hints: "Mira can read him back." and "{hero} can answer it." only while that member acts first', () => {
  const { b } = fight('eraser', { n: 200, stop: (x) => !!er.pinOf(x) && x.current().id === 'mira' });
  assert.ok(er.pinOf(b), 'a pin on Mira\'s turn');
  const t = b.unit(er.pinOf(b).target);
  const shell = { b };
  const line = scene.readLine(shell);
  const want = T.can_read_by[t.id] || T.can_read.replace('{name}', t.name);
  assert.ok(line.includes(want), `${line} names ${want}`);
  // Mira Unwritten (she cannot read): no hint
  const mira = b.living('party').find((u) => u.id === 'mira');
  b.state.erasure.unwritten[mira.uid] = { left: 2 };
  assert.equal(scene.readLine(shell), '', 'no hint while Mira cannot act on it');
  delete b.state.erasure.unwritten[mira.uid];
  assert.equal(scene.answerLine(shell), '', 'no Silence, no answer line');
});

test('the Eraser\'s four looks: each phase swaps the frames (no white flash), the gold grade at the ward\'s break, boss_eraser_silence and the white-out at phase 4, the jingle under the Silence', () => {
  const { ops, evs } = fight('eraser', { n: 400, seed: 4, stop: (b, e) => e.some((x) => x.type === 'silence_broken') });
  const looks = ops.filter((o) => o.op === 'swapSprite').map((o) => o.sprite);
  assert.deepEqual([...new Set(looks)], ['eraser_truths', 'eraser_remembers', 'eraser_silence'], `the looks in order (${looks})`);
  const iGold = ops.findIndex((o) => o.op === 'er8Gold');
  assert.ok(iGold > ops.findIndex((o) => o.op === 'swapSprite' && o.sprite === 'eraser_truths'), 'the gold grade comes with the ward\'s break');
  const mus = ops.find((o) => o.op === 'er8Music');
  assert.ok(mus && mus.id === 'boss_eraser_silence' && mus.fade === 1.2, JSON.stringify(mus));
  assert.ok(ops.some((o) => o.op === 'er8Pulse'), 'the white-out pulse as phase 4 opens');
  assert.ok(ops.some((o) => o.op === 'er8Jingle' && o.id === 'silence_gather'), 'the jingle under the Silence');
  assert.ok(ops.some((o) => o.op === 'telegraph' && o.skill === 'last_silence' && o.er8 === 'silence'));
  assert.ok(ops.some((o) => o.op === 'help' && o.hint8 === 'answer'), 'the answer hint at play time');
  assert.ok(evs.some((e) => e.type === 'silence_broken'));
  // the finale's photosensitivity rule: the look swaps never flash the screen
  for (let i = 0; i < ops.length; i++) {
    if (ops[i].op !== 'swapSprite') continue;
    for (let j = Math.max(0, i - 8); j < Math.min(ops.length, i + 8); j++) assert.notEqual(ops[j].op, 'screenFlash', `no screen flash round a look swap (op ${j})`);
  }
  // one telegraph at a time: never an Unwrite pinned while the Silence charges
  let pin = false, sil = false;
  for (const o of ops) {
    if (o.op === 'telegraph' && o.skill === 'unwrite') pin = true;
    if (o.op === 'telegraph' && o.skill === 'last_silence') sil = true;
    if (o.op === 'telegraphCancel') { pin = false; sil = false; }
    assert.ok(!(pin && sil), 'two telegraphs at once (a bug to report, not to paint over)');
  }
});

test('the Sentry: its card, its arc line, the faceplate line; Grief and Change step out with their fx', () => {
  const s = fight('unnamed_sentry', { n: 60, level: 32 });
  assert.ok(helps(s.ops).includes('It guarded every page. Nobody told it whose.'), 'the arc line leads');
  const e = fight('eraser', { n: 300, seed: 5 });
  const truths = e.ops.filter((o) => o.op === 'summon' && /^truth_/.test(o.id)).map((o) => o.id).sort();
  assert.deepEqual(truths, ['truth_change', 'truth_grief']);
  assert.ok(e.ops.some((o) => o.op === 'fx' && o.kind === 'ep8_truth'));
});

// ---------------------------------------------------------------------------------------------------- rows
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const unit = (uid, id, x, y, w, h, side = 'enemy') => ({ uid, id, side, x, y, homeX: x, homeY: y, w, h });
const party = [[290, 146], [318, 146], [346, 146]].map(([x, y], i) => unit(`p${i}`, 'hero', x, y, 32, 40, 'party'));
const partyBodies = party.map((p) => ({ ...L.spriteBox(p), w: 24, x: p.x - 12 }));
// the four looks' frames (ep8_bosses_battle.json) and the adds' bodies (ep8_enemies_battle.json rows.bodyPx)
const LOOKS = [['eraser', 127, 128], ['eraser_truths', 153, 128], ['eraser_remembers', 127, 128], ['eraser_silence', 127, 128]];
const ADDS = { truth_grief: [36, 45], truth_change: [30, 54] };

test('rows: the Eraser keeps ONE anchor over its hood in all four looks; Grief and Change under their own feet, apart, 12 px clear of the party', () => {
  L.STAGE.tall.clear();
  const pos = new Set();
  for (const touch of [false, true]) {
    for (const [look, w, h] of LOOKS) {
      const home = touch ? L.touchEnemySlot(L.BOSS_SLOT, { w, h }) : L.BOSS_SLOT;
      const ex = unit('e0', 'eraser', home.x, home.y, w, h);
      const ward = look === 'eraser_truths';
      const actors = [ex, ...party];
      if (ward) for (const [id, [aw, ah]] of Object.entries(ADDS)) actors.push(unit(id === 'truth_grief' ? 'e1' : 'e2', id, scene.TRUTH_SPOTS[id].x, scene.TRUTH_SPOTS[id].y, aw, ah));
      L.planStage(actors.filter((a) => a.side === 'enemy'), new Map(actors.map((a) => [a.uid, a])));
      const docked = !!L.helpDock();
      assert.ok(docked, `${look}${touch ? ' (phone)' : ''}: the help window docks (the hood is under its second line)`);
      for (const rw of [45, 60, 75]) {
        const plan = new Map([['e0', { rect: { x: 61, y: 136, w: rw, h: L.ENEMY_ROW_H }, place: 'below' }]]);
        if (ward) { plan.set('e1', { rect: { x: 150, y: 120, w: rw, h: L.ENEMY_ROW_H }, place: 'above' }); plan.set('e2', { rect: { x: 200, y: 120, w: rw, h: L.ENEMY_ROW_H }, place: 'above' }); }
        scene.steadyRows(plan, { actors, docked });
        const r = plan.get('e0').rect;
        pos.add(`${touch}:${r.x - home.x},${r.y - home.y}`);
        const hood = { x: home.x + scene.HOOD.dx, y: home.y + scene.HOOD.dy };
        assert.ok(r.y + r.h <= hood.y && r.x < hood.x && r.x + r.w > hood.x, `${look}: the row ${JSON.stringify(r)} stands over the hood ${JSON.stringify(hood)}`);
        assert.ok(r.y >= 2, 'on screen');
        for (const b of L.topBlocks(23)) assert.ok(!hit(r, b), `${look}: clear of the timeline and the docked help ${JSON.stringify(b)}`);
        for (const p of partyBodies) assert.ok(!hit(r, p), 'clear of the party');
        if (!ward) continue;
        const g = plan.get('e1'), c = plan.get('e2');
        assert.equal(g.place, 'below'); assert.equal(c.place, 'below');
        const gb = L.spriteBox(actors.find((a) => a.uid === 'e1')), cb = L.spriteBox(actors.find((a) => a.uid === 'e2'));
        assert.ok(g.rect.y >= gb.y + gb.h - 30 && c.rect.y >= cb.y + cb.h - 30, `each row in its own feet band (${g.rect.y}, ${c.rect.y})`);
        if (g.rect.y === c.rect.y) assert.ok(g.rect.x + g.rect.w + scene.ROW_GAP <= c.rect.x, `the two rows apart (${g.rect.x + g.rect.w} .. ${c.rect.x})`);
        else assert.ok(!hit(g.rect, c.rect), 'stacked rows never overlap');
        for (const q of [g.rect, c.rect]) {
          assert.ok(!hit(q, L.STATUS_WIN), `${JSON.stringify(q)}: clear of the party window`);
          assert.ok(!hit(q, L.CMD_WIN_TOUCH) && !hit(q, L.CMD_WIN), 'clear of the command windows (phone and desktop)');
          for (const p of partyBodies) assert.ok(p.x - (q.x + q.w) >= scene.CLEAR_PX, `a row ${JSON.stringify(q)} 12 px clear of the party`);
        }
        for (const ab of [gb, cb]) for (const p of partyBodies) assert.ok(p.x - (ab.x + ab.w) >= scene.CLEAR_PX, `an add ${JSON.stringify(ab)} stands at least 12 px from the party (${p.x - (ab.x + ab.w)})`);
        assert.ok(!hit(L.headBox(actors.find((a) => a.uid === 'e1')), L.HELP_DOCK_MAX), 'Grief\'s head keeps out of the dock (the dock holds)');
      }
    }
  }
  assert.equal(new Set([...pos].filter((p) => p.startsWith('false'))).size, 1, `one anchor on desktop in every look and row width (${[...pos]})`);
  assert.equal(new Set([...pos].filter((p) => p.startsWith('true'))).size, 1, `one anchor on the phone (${[...pos]})`);
  L.STAGE.tall.clear(); L.STAGE.actors = null;
});

test('rows: the Sentry\'s row under its own feet, clear of the party and the command windows', () => {
  L.STAGE.tall.clear();
  for (const touch of [false, true]) {
    const home = touch ? L.touchEnemySlot(L.BOSS_SLOT, { w: 107, h: 110 }) : L.BOSS_SLOT;
    const s = unit('e0', 'unnamed_sentry', home.x, home.y, 107, 110);
    const actors = [s, ...party];
    L.planStage([s], new Map(actors.map((a) => [a.uid, a])));
    const plan = new Map([['e0', { rect: { x: 10, y: 10, w: 60, h: L.ENEMY_ROW_H }, place: 'above' }]]);
    scene.steadyRows(plan, { actors, docked: !!L.helpDock() });
    const r = plan.get('e0').rect;
    assert.equal(plan.get('e0').place, 'below');
    assert.ok(r.y >= home.y - 12 && r.y + r.h <= L.STATUS_WIN.y, `at its feet (${JSON.stringify(r)})`);
    assert.ok(!hit(r, L.CMD_WIN_TOUCH) && !hit(r, L.CMD_WIN));
    for (const p of partyBodies) assert.ok(!hit(r, p));
  }
  L.STAGE.tall.clear(); L.STAGE.actors = null;
});

// ---------------------------------------------------------------------------------------------------- the stage, the bar, helpers
test('the white-out: never more than +0.15 luma for any pixel (black included); 30 frames in; E8-tiles\' json values kept under the cap', () => {
  const meta = JSON.parse(fs.readFileSync(new URL('../../assets/backdrops/ep8_battle_lastword.json', import.meta.url), 'utf8'));
  const a = scene.whiteAlpha(meta.whiteout.alpha);
  assert.ok(a <= scene.CAP_LUMA);
  const hex = meta.whiteout.color, rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luma = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  for (const base of [[0, 0, 0], [0.08, 0.06, 0.12], [0.3, 0.2, 0.4], [0.9, 0.9, 0.9]]) {
    const out = base.map((c, i) => c + (rgb[i] - c) * a);
    // the rise in the sRGB-encoded mean the json measures (simple luma on encoded values) and in linear light, both under the cap
    const enc = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    assert.ok(enc(out) - enc(base) <= scene.CAP_LUMA + 1e-9, `encoded rise ${enc(out) - enc(base)}`);
    assert.ok(luma(out) - luma(base) <= scene.CAP_LUMA, `linear rise ${luma(out) - luma(base)}`);
  }
  assert.equal(meta.whiteout.frames, 30);
  const st = { white: { frames: 30, hold: 12 }, pulse: 0 };
  assert.equal(scene.whiteGoal(st, false), 1);
  st.pulse = 42; assert.equal(scene.whiteGoal(st, false), 0, 'the pulse goes back after its hold');
  st.pulse = null; assert.equal(scene.whiteGoal(st, true), 1, 'held while the Silence charges');
  assert.ok(meta.grades.meanLuma.gold - meta.grades.meanLuma.violet >= 0.10, 'the gold grade at least 0.10 above the violet');
});

test('the charge bar fills as the Eraser\'s turn comes round', () => {
  const order = (i) => Array.from({ length: 8 }, (_, k) => ({ uid: k === i ? 'e0' : `p${k}` }));
  const fills = [4, 3, 2, 1, 0].map((i) => scene.chargeFill(order(i), 'e0', 4));
  assert.deepEqual(fills, [0, 0.25, 0.5, 0.75, 1]);
});

test('the cutscene helpers: inkBlot, hudNameFlash, tollName and goto exist on a scene; the toll caption is the cold open\'s', async () => {
  const { Cutscene } = await import('../../src/world/cutscene.js');
  const warps = [];
  const field = { engine: { frame: 0, stack: [], audio: { sfx() {} }, waitFrames: () => Promise.resolve() }, game: { heroName: 'Wren', party: [{ id: 'hero', name: 'Wren' }] },
    map: { id: 'x', mark: () => null }, actorById: () => null, drawKeptBar() {}, warpTo(m, x, y, d, k) { warps.push([m, x, y, d, k]); return Promise.resolve(); } };
  const cs = new Cutscene(field);
  const orig = Cutscene.prototype.run;
  assert.equal(typeof orig, 'function');
  // run() installs the helpers; a scene id that does not exist still installs them
  await cs.run('__nope__').catch(() => {});
  for (const k of ['inkBlot', 'hudNameFlash', 'tollName', 'goto']) assert.equal(typeof cs.api[k], 'function', k);
  await cs.api.tollName('{hero}');
  assert.equal(field.er8f.cap.text, 'W R E N');
  assert.equal(field.er8f.cap.gold, true);
  await cs.api.tollName('Hazel');
  assert.equal(field.er8f.cap.text, 'H A Z E L');
  await cs.api.goto('hero_home', 12, 9, 'up');
  assert.deepEqual(warps, [['hero_home', 12, 9, 'up', 'warp']]);
  assert.equal(scene.captionAlpha(0, 84), 0);
  assert.equal(scene.captionAlpha(40, 84), 1);
  assert.equal(scene.captionAlpha(84, 84), null);
});

test('Load Game: a save with ep8_complete gets the gold star, others none (read once per save)', () => {
  let reads = 0;
  const save = { load: (slot) => { reads++; return slot === 2 ? { flags: { ep8_complete: true } } : { flags: {} }; } };
  const cache = new Map();
  assert.equal(scene.finishedSlot(save, { slot: 2, exists: true, savedAt: 5 }, cache), true);
  assert.equal(scene.finishedSlot(save, { slot: 1, exists: true, savedAt: 5 }, cache), false);
  assert.equal(scene.finishedSlot(save, { slot: 3, exists: false }, cache), false);
  scene.finishedSlot(save, { slot: 2, exists: true, savedAt: 5 }, cache);
  assert.equal(reads, 2, 'cached');
});
