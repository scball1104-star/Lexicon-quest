// E7-scene-ui (EPISODE7_PLAN 5.2, 6.3 to 6.5, 9.3; BATTLE.md 16): Episode 7 on the battle stage. Pure node tests: the tables the pack
// fills; that battles without Rime (Episodes 1 to 6) plan exactly as before; the planner's ops for Rime's events in real fights (the
// pips, the pip sound by the pips reached, Frozen, the pin under its own key with farewell_read, Call breaking it with one line and the
// action name once, Stilled and its skipped turn worded as Episode 7's, the Phantom's three looks and the thaw); the row placement of
// the Phantom in all three looks and of the Gate and the Letter (CRITIQUE_8 item 1); the aurora's step limit; the frost drawer. The
// drawing is checked headless by qa/battlescene/ep7_shots.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKDROPS, BOSS_CARD } from '../../src/scenes/battle.js';
import { SIGNATURE_TECHS } from '../../src/battle/scene/menu.js';
import { planEvents, unitInfo } from '../../src/battle/scene/animator.js';
import { makeRng } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { battle } from '../battle/_helpers.mjs';

const { makeParty } = await import('../../tools/sim/simulate.mjs');
const { registerData } = await import('../../tools/sim/ep7.mjs');
registerData();
(await import('../../src/data/ep4/scene.js')).register();
(await import('../../src/data/ep5/scene.js')).register();
(await import('../../src/data/ep6/scene.js')).register();
const { setFieldHour } = await import('../../src/data/ep5/sky.js');
setFieldHour('noon');
// plans of battles with no Rime, before this pack's scene module wraps anything (compared after)
function plainPlan(foes, opts, n = 10) {
  const b = battle(foes, opts);
  const evs = [...b.startEvents];
  for (let i = 0; i < n && !b.isOver(); i++) evs.push(...(b.current().side === 'party' ? b.perform(partyAction(b, 'competent')) : b.runEnemyTurn()));
  return JSON.stringify(planEvents(evs, { units: unitInfo(b.units()) }));
}
const PLAIN = [
  [[{ id: 'ink_slime' }, { id: 'bookmite' }], { seed: 4 }],
  [[{ id: 'scribe' }], { level: 27, seed: 3, options: { encounter: 'scribe', boss: true, canFlee: false, flags: { anchor_learned: true, call_learned: true } } }],
  [[{ id: 'squall_wolf' }, { id: 'gale_sprite' }], { level: 25, seed: 2, options: { flags: { anchor_learned: true } } }],
  [[{ id: 'oracle' }], { level: 24, seed: 3, options: { encounter: 'oracle', boss: true, canFlee: false, flags: { sky_learned: true } } }],
];
const before = PLAIN.map(([f, o]) => plainPlan(f, o));
const scene = await import('../../src/data/ep7/scene.js');
scene.register();
scene.register();
const T = (await import('../../src/data/ep7/text.js')).EP7_BATTLE_TEXT;
const L = await import('../../src/battle/scene/layout.js');

const FLAGS = { call_learned: true, bram_memory_3: true, hero_signed: true, sky_learned: true, anchor_learned: true };
const helps = (ops) => ops.filter((o) => o.op === 'help').map((o) => o.text);
const sfx = (ops) => ops.filter((o) => o.op === 'sfx').map((o) => o.id);
/** A real Episode 7 fight at Lv 30, played by `policy` (sturdy party: the plan is read, not the result). */
function fight(enc, { seed = 3, n = 80, act = null, sturdy = true, zone = null } = {}) {
  const z = zone || (enc === 'white_phantom' ? 'ep7_stillheart' : enc === 'pale_lantern' ? 'ep7_vault_f2' : 'ep7_vault_f1');
  const foes = Array.isArray(enc) ? enc.map((id) => ({ id })) : [{ id: enc }];
  const boss = !Array.isArray(enc);
  const b = battle(foes, { party: makeParty(z, 30), rng: makeRng(seed), options: { zone: z, encounter: boss ? enc : null, boss, canFlee: !boss, flags: FLAGS, inventory: { hi_potion: 6, ember_tea: 2 } } });
  if (sturdy) for (const u of b.living('party')) u.hp = u.maxHp = 99999;
  const evs = [...b.startEvents];
  for (let i = 0; i < n && !b.isOver(); i++) {
    const u = b.current();
    evs.push(...(u.side === 'party' ? b.perform(act ? act(u, b) : partyAction(b, 'competent')) : b.runEnemyTurn()));
  }
  return { b, evs, ops: planEvents(evs, { units: unitInfo(b.units()) }) };
}

test('register fills the tables once: five stages, two cards, Call as the hero\'s signature, the Phantom\'s head box', () => {
  for (const k of ['ep7_battle_road', 'ep7_battle_vault', 'ep7_battle_hall', 'ep7_battle_sanctum', 'ep7_battle_stillheart']) assert.equal(BACKDROPS[k].asset, k, k);
  assert.deepEqual(BOSS_CARD.pale_lantern, { name: 'THE PALE LANTERN', sub: 'Keeper of Borrowed Light' });
  assert.deepEqual(BOSS_CARD.white_phantom, { name: 'THE WHITE PHANTOM', sub: 'Keeper of the Stillheart' });
  assert.deepEqual(SIGNATURE_TECHS.filter((t) => t.skill === 'call_name'), [{ unit: 'hero', flag: 'farewell', skill: 'call_name' }]);
  assert.ok(SIGNATURE_TECHS.findIndex((t) => t.skill === 'answer') < SIGNATURE_TECHS.findIndex((t) => t.skill === 'call_name'), 'Answer is pushed first (the sig wrap floats Call)');
  assert.ok(L.HEAD_BOX.white_phantom);
  assert.equal(scene.register()[0], 'already');
  // every zone and boss stage names a registered backdrop
  const ENC = { pale_lantern: 'ep7_battle_hall', white_phantom: 'ep7_battle_stillheart' };
  for (const [k, v] of Object.entries(ENC)) assert.ok(BACKDROPS[v], `${k}: ${v}`);
});

test('battles without Rime plan exactly as before the pack (Episodes 1 to 6 unchanged)', () => {
  setFieldHour('noon');
  PLAIN.forEach(([f, o], i) => assert.equal(plainPlan(f, o), before[i], `plain plan ${i}`));
});

test('a cold fight: Rime starts, pips op per member, the pip sound by the pips reached, Frozen with its crack, its line and rime_freeze', () => {
  // the party only Swaps: it never Defends, so Rime climbs to Frozen
  const { ops, evs } = fight(['snow_wisp', 'snow_wisp'], { act: () => ({ type: 'swap' }), n: 240 });
  assert.ok(ops.some((o) => o.op === 'rime7Init'), 'the start op');
  const adds = ops.filter((o) => o.op === 'rime7');
  assert.ok(adds.length >= 3 && adds.some((o) => o.rime === 2), `pips climb (${adds.map((o) => o.rime).join(',')})`);
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_frost'), 'snow over a member a cold move frosted');
  const s = sfx(ops);
  assert.ok(s.includes('rime_bite') && s.includes('rime_bite_2'), `rime_bite and rime_bite_2 both play (${[...new Set(s)].join(',')})`);
  const frozen = evs.filter((e) => e.type === 'frozen');
  assert.ok(frozen.length >= 1, 'someone Freezes');
  assert.ok(ops.some((o) => o.op === 'rime7Frozen' && o.on), 'the Frozen op');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_frozen'), 'the crack and the float');
  assert.ok(s.includes('rime_freeze'), 'rime_freeze');
  const lines = helps(ops).filter((t) => /frosts over/.test(t));
  assert.ok(lines.length >= 1 && lines.every((t) => /misses (his|her|a) turn\./.test(t)), `"...'s name frosts over. ... misses ... turn." (${lines[0]})`);
  // "Bram's name frosts over. He misses his turn." is the plan's line word for word
  assert.ok(!lines.some((t) => /^Bram/.test(t)) || lines.some((t) => t === "Bram's name frosts over. He misses his turn."), lines.join(' | '));
  assert.ok(!helps(ops).some((t) => /knocked back in line/.test(t)), 'the Frozen push is not a "knocked back" line');
  // the third pip sound needs a hit that reaches 3: the Blizzard (two pips) in Thawlight does it; the rule is pure
  assert.equal(scene.pipSfx(3), 'rime_bite_3');
  assert.equal(scene.rimeReached([{ type: 'rime_add', reason: 'cold', delta: 2, rime: 3 }, { type: 'rime_add', reason: 'cold', delta: 1, rime: 1 }]), 3);
});

test('the Farewell: pinned under its own key with farewell_read; Call breaks it with ice off the target, farewell_break, one line, the name once', () => {
  const { ops, evs, b } = fight('white_phantom', { n: 120 });
  const tg = ops.filter((o) => o.op === 'telegraph' && o.farewell);
  assert.ok(tg.length >= 1, 'a pin');
  assert.ok(tg.every((o) => o.actor.endsWith(scene.PIN_KEY) && o.skill === 'farewell'), 'under its own key');
  assert.ok(tg.every((o) => /It is saying goodbye\./.test(o.text)), tg[0].text);
  assert.ok(sfx(ops).includes('farewell_read'), 'farewell_read');
  assert.ok(ops.some((o) => o.op === 'help' && o.pin7), 'the pin line asks the scene for "{hero} can call her." (true or not, decided live)');
  const broke = evs.filter((e) => e.type === 'farewell_broken' && e.reason === 'call');
  assert.ok(broke.length >= 1, 'careful play Calls through it');
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_crack_off'), 'ice cracks off the target');
  assert.ok(sfx(ops).includes('farewell_break'), 'farewell_break');
  const h = helps(ops);
  const t = b.unit(broke[0].target);
  const line = t.id === 'mira' ? 'Mira hears her name. The farewell does not hold.' : 'Bram hears his name. The farewell does not hold.';
  assert.ok(h.includes(line), `the plan's line (${line})`);
  assert.ok(!h.some((x) => / calls (Mira|Bram)\./.test(x)), 'the "calls" message is not printed: the action name says it once');
  assert.ok(h.some((x) => /: \{c:gold\}Call\{\/c\}/.test(x)), 'the action name, once per cast');
  assert.ok(h.some((x) => /The White Phantom is thrown back\./.test(x)), 'its owner thrown back is said');
  assert.ok(ops.some((o) => o.op === 'rime7Pin') && ops.some((o) => o.op === 'rime7Unpin'), 'the ribbon comes and goes');
  assert.ok(!ops.some((o) => o.op === 'telegraphCancel' && o.actor === broke[0].source), 'a pin\'s cancel never takes the Phantom\'s own key');
});

test('Stilled: the farewell lands, the shell forms, the skipped turn says "Mira is Stilled.", Call brings them back with the shell shattering', () => {
  // the party Defends (never Calls) until someone is Stilled, then the hero Calls them
  let called = false;
  const act = (u, b) => {
    const S = b.state.rime, st = Object.keys(S.stilled)[0];
    if (u.id === 'hero' && st && !called) { called = true; return { type: 'skill', skill: 'call_name', target: st }; }
    return { type: 'defend' };
  };
  const { ops, evs } = fight('white_phantom', { n: 160, act });
  const on = evs.find((e) => e.type === 'stilled' && e.on);
  assert.ok(on, 'a farewell lands');
  assert.ok(ops.some((o) => o.op === 'rime7Still' && o.on) && ops.some((o) => o.op === 'fx' && o.kind === 'rime7_still'), 'the shell forms');
  const skip = ops.find((o) => o.op === 'help' && o.still7);
  assert.ok(skip, 'their skipped turn asks the scene to re-word it');
  assert.equal(T.stilled, '{name} is Stilled.');
  const end = evs.find((e) => e.type === 'stilled_end');
  assert.ok(end && end.reason === 'call', `stilled_end call (${JSON.stringify(end)})`);
  assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_unstill'), 'the shell shatters');
});

test('the Phantom\'s looks: the opening phase changes nothing, the ward and the thaw swap the frames; the ward thaws to the warm grade', () => {
  // a full careful fight at Lv 31 with a real (not sturdy) party, run to the end
  const { ops, evs } = fight('white_phantom', { n: 400, sturdy: false, seed: 5 });
  const swaps = ops.filter((o) => o.op === 'swapSprite').map((o) => o.sprite);
  const phases = evs.filter((e) => e.type === 'phase').map((e) => e.sprite);
  assert.deepEqual(phases.slice(0, 1), ['white_phantom'], 'phase 1 forwards look one');
  for (const s of swaps) assert.ok(['white_phantom_ward', 'white_phantom_thaw'].includes(s), s);
  if (phases.includes('white_phantom_ward')) assert.ok(swaps.includes('white_phantom_ward'), 'the ward look is drawn');
  if (phases.includes('white_phantom_thaw')) {
    assert.ok(swaps.includes('white_phantom_thaw'), 'the thaw look is drawn');
    assert.ok(ops.some((o) => o.op === 'rime7Thaw'), 'the stage thaws');
  }
  const gate = ops.find((o) => o.op === 'summon' && o.id === 'closed_gate');
  if (gate) assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_gate') && ops.some((o) => o.op === 'fx' && o.kind === 'rime7_letter'), 'the Gate and the Letter rise');
  assert.ok(phases.includes('white_phantom_ward'), 'the fight reached the ward (seeded)');
});

test('the Lantern: its hood opens with cold light and the Wisps drift out of it; the arc line leads; Borrowed Light pins', () => {
  const { ops } = fight('pale_lantern', { n: 200, sturdy: false, seed: 2 });
  const first = ops.find((o) => o.op === 'help');
  assert.equal(first.text, 'It lit the hall with names it would not give back.');
  assert.ok(ops.some((o) => o.op === 'telegraph' && o.farewell && o.skill === 'borrowed_light'), 'Borrowed Light pins');
  if (ops.some((o) => o.op === 'summon' && o.id === 'snow_wisp')) {
    assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_hood'), 'the hood opens');
    assert.ok(ops.some((o) => o.op === 'fx' && o.kind === 'rime7_wisp'), 'the wisps drift out');
  }
});

// ---------------------------------------------------------------------------------------------------- rows (CRITIQUE_8 item 1)
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const unit = (uid, id, x, y, w, h, side = 'enemy') => ({ uid, id, side, x, y, homeX: x, homeY: y, w, h });
const party = [[290, 146], [318, 146], [346, 146]].map(([x, y], i) => unit(`p${i}`, 'hero', x, y, 32, 40, 'party'));
const partyBodies = party.map((p) => ({ ...L.spriteBox(p), w: 24, x: p.x - 12 }));
// the three looks' frames (ep7_bosses_battle.json) and the adds' (ep7_enemies_battle.json)
const LOOKS = [['white_phantom', 125, 127], ['white_phantom_ward', 139, 127], ['white_phantom_thaw', 127, 127]];
const ADDS = { closed_gate: [42, 58], lost_letter: [38, 39] };

test('rows: the Phantom keeps ONE anchor over its crown in all three looks; the Gate and the Letter under their own feet, apart, clear of the party', () => {
  L.STAGE.tall.clear();
  const xs = new Set(), ys = new Set();
  for (const touch of [false, true]) {
    for (const [look, w, h] of LOOKS) {
      const home = touch ? L.touchEnemySlot(L.BOSS_SLOT, { w, h }) : L.BOSS_SLOT;
      const ph = unit('e0', 'white_phantom', home.x, home.y, w, h);
      const ward = look === 'white_phantom_ward';
      const actors = [ph, ...party];
      if (ward) for (const [id, [aw, ah]] of Object.entries(ADDS)) actors.push(unit(id === 'closed_gate' ? 'e1' : 'e2', id, scene.WARD_SPOTS[id].x, scene.WARD_SPOTS[id].y, aw, ah));
      L.planStage(actors.filter((a) => a.side === 'enemy'), new Map(actors.map((a) => [a.uid, a])));
      const docked = !!L.helpDock();
      assert.ok(docked, `${look}${touch ? ' (phone)' : ''}: the help window docks (the Phantom's crown is under its second line) and stays docked with the Ward up`);
      for (const rw of [60, 75]) {
        const plan = new Map([['e0', { rect: { x: 61, y: 136, w: rw, h: L.ENEMY_ROW_H }, place: 'below' }]]);
        if (ward) { plan.set('e1', { rect: { x: 120, y: 120, w: 60, h: L.ENEMY_ROW_H }, place: 'above' }); plan.set('e2', { rect: { x: 198, y: 120, w: 60, h: L.ENEMY_ROW_H }, place: 'above' }); }
        scene.steadyRows(plan, { actors, docked });
        const r = plan.get('e0').rect;
        xs.add(r.x); ys.add(r.y);
        const crown = { x: home.x + scene.CROWN.dx, y: home.y + scene.CROWN.dy };
        assert.ok(r.y + r.h <= crown.y && r.x < crown.x && r.x + r.w > crown.x, `${look}: the row ${JSON.stringify(r)} stands over the crown ${JSON.stringify(crown)}`);
        assert.ok(r.y >= 2, 'on screen');
        for (const b of L.topBlocks(23)) assert.ok(!hit(r, b), `${look}: clear of the timeline and the docked help ${JSON.stringify(b)}`);
        for (const p of partyBodies) assert.ok(!hit(r, p), 'clear of the party');
        if (!ward) continue;
        const g = plan.get('e1'), l = plan.get('e2');
        assert.equal(g.place, 'below'); assert.equal(l.place, 'below');
        const gb = L.spriteBox(actors.find((a) => a.uid === 'e1')), lb = L.spriteBox(actors.find((a) => a.uid === 'e2'));
        // each row in its own feet band (the core's desktop rule for a grounded foe: the party window starts 6 px under the feet)
        assert.ok(g.rect.y >= gb.y + gb.h - 12 && l.rect.y >= lb.y + lb.h - 12, `each row at its own feet (${g.rect.y}, ${l.rect.y})`);
        assert.ok(g.rect.x < 162 && g.rect.x + g.rect.w > 162 && l.rect.x < 228 && l.rect.x + l.rect.w > 228, 'each row under its own add');
        assert.ok(g.rect.x + g.rect.w + scene.ROW_GAP <= l.rect.x, `the two rows apart (${g.rect.x + g.rect.w} .. ${l.rect.x})`);
        const chest = (b) => ({ ...b, h: Math.round(b.h * 0.7) });
        for (const q of [g.rect, l.rect]) {
          assert.ok(!hit(q, L.STATUS_WIN), `${JSON.stringify(q)}: clear of the party window`);
          assert.ok(!hit(q, L.CMD_WIN_TOUCH) && !hit(q, L.CMD_WIN), 'clear of the command windows (phone and desktop)');
          for (const p of partyBodies) assert.ok(!hit(q, p), 'clear of the party');
          assert.ok(!hit(q, chest(gb)) && !hit(q, chest(lb)), 'never across either add above its feet');
        }
        for (const ab of [gb, lb]) for (const p of partyBodies) assert.ok(p.x - (ab.x + ab.w) >= 12, `an add ${JSON.stringify(ab)} stands at least 12 px from the party (${p.x - (ab.x + ab.w)})`);
        assert.ok(L.spriteBox(ph).x + L.spriteBox(ph).w < gb.x + gb.w, 'the Gate stands in front of the Phantom, not hidden in its cloak');
        assert.ok(!hit(L.headBox(actors.find((a) => a.uid === 'e1')), L.HELP_DOCK_MAX), 'the Gate\'s head keeps out of the dock (the dock holds)');
      }
    }
  }
  assert.equal(xs.size, 1, `one x in every look and every row width (${[...xs]})`);
  assert.equal(ys.size, 1, `one y (${[...ys]})`);
  L.STAGE.tall.clear(); L.STAGE.actors = null;
});

test('rows: the two Wisps of the Lantern stand in the open stage, their rows on separate lines, clear of the party and the Lantern', () => {
  L.STAGE.tall.clear();
  const lan = unit('e0', 'pale_lantern', L.BOSS_SLOT.x, L.BOSS_SLOT.y, 92, 93);
  const ws = scene.WISP_SPOTS.map((s, i) => Object.assign(unit(`w${i}`, 'snow_wisp', s.x, s.y, 50, 46), { wisp7: i }));
  const plan = new Map([['e0', { rect: { x: 61, y: 136, w: 60, h: L.ENEMY_ROW_H }, place: 'below' }],
    ...ws.map((w) => [w.uid, { rect: { x: w.x - 37, y: 120, w: 75, h: L.ENEMY_ROW_H }, place: 'above' }])]);
  scene.steadyRows(plan, { actors: [lan, ...ws, ...party], docked: false });
  const [a, b] = ws.map((w) => plan.get(w.uid).rect);
  assert.ok(!hit(a, b), `the two rows apart ${JSON.stringify([a, b])}`);
  for (const w of ws) {
    const box = L.spriteBox(w), q = plan.get(w.uid).rect;
    assert.ok(!hit(box, L.spriteBox(lan)), 'a wisp is clear of the Lantern');
    for (const p of partyBodies) { assert.ok(p.x - (box.x + box.w) >= 12, `a wisp 12 px from the party (${p.x - (box.x + box.w)})`); assert.ok(!hit(q, p), 'its row clear of the party'); }
    assert.ok(!hit(q, L.STATUS_WIN) && !hit(q, L.CMD_WIN_TOUCH), 'its row clear of the windows');
    for (const o of ws) if (o !== w) assert.ok(!hit(q, { ...L.spriteBox(o), h: Math.round(L.spriteBox(o).h * 0.8) }), 'its row clear of the other wisp');
  }
});

// ---------------------------------------------------------------------------------------------------- the aurora and the frost
test('the aurora: three frames, one every 30, never more than +0.05 luma between frames; frame 0 under reduce motion', () => {
  const A = scene.AURORA;
  assert.equal(A.frames, 3); assert.equal(A.everyFrames, 30);
  const lin = (c) => c / 255;
  const add = (px, i) => (0.2126 * lin(px[i]) + 0.7152 * lin(px[i + 1]) + 0.0722 * lin(px[i + 2])) * (px[i + 3] / 255);
  const frames = [0, 1, 2].map((f) => scene.auroraPixels(f));
  let worst = 0, peak = 0;
  for (let f = 0; f < 3; f++) {
    const a = frames[f], b = frames[(f + 1) % 3];
    for (let i = 0; i < a.length; i += 4) { worst = Math.max(worst, Math.abs(add(a, i) - add(b, i))); peak = Math.max(peak, add(a, i)); }
  }
  assert.ok(worst <= 0.05, `step ${worst.toFixed(4)} <= 0.05`);
  assert.ok(peak > 0.05, `the band shows (${peak.toFixed(3)})`);
  assert.deepEqual([0, 29, 30, 60, 90].map((f) => scene.auroraFrame(f)), [0, 0, 1, 2, 0]);
  assert.equal(scene.auroraFrame(45, A, true), 0);
});

test('the frost drawer: a third of the letters a pip, all at three; the pips 7 x 7 with an outline; exported for the field', () => {
  assert.deepEqual([0, 1, 2, 3].map((n) => scene.frostedLetters('Arden', n)), [0, 2, 4, 5]);
  assert.deepEqual([0, 1, 2, 3].map((n) => scene.frostedLetters('Bram', n)), [0, 2, 3, 4]);
  assert.deepEqual([0, 1, 2, 3].map((n) => scene.frostedLetters('Mira', n)), [0, 2, 3, 4]);
  const px = new Map();
  const r = { rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set(`${x + i},${y + j}`, c); } };
  scene.drawPip(r, 0, 0, true);
  const xsP = [...px.keys()].map((k) => +k.split(',')[0]), ysP = [...px.keys()].map((k) => +k.split(',')[1]);
  assert.equal(Math.max(...xsP) - Math.min(...xsP) + 1, 7); assert.equal(Math.max(...ysP) - Math.min(...ysP) + 1, 7);
  assert.ok([...px.values()].includes('#14101e'), 'a dark outline');
  for (const fn of ['drawRimeName', 'drawRimePips', 'drawFrostStrip']) assert.equal(typeof scene[fn], 'function', fn);
});
