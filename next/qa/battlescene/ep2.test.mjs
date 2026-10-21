// Episode 2 battle presentation (E2-scene-ui): the Court's stages, debug parties at the planned level, Kept (the
// shard, the greyed timeline slot, never a target), "The mirror cracks!", the King's unmask swap, the Mirrored
// Combo bracket, the reflections' timeline heads, the boss card placement and the multi-line help window.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planEvents, unitInfo } from '../../src/battle/scene/animator.js';
import { createEncounterBattle, makeRng, memberStats } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { backdropKey, makeDebugGame } from '../../src/scenes/battle.js';
import { reflectionColor, REFL_RAMP, bossCardY, rowLift, enemyRowWidth, helpLines, helpHeight, HELP_LINE_H } from '../../src/battle/scene/hud.js';
import { HELP_WIN, H } from '../../src/battle/scene/layout.js';
import { BitmapFont } from '../../src/core/font.js';

const ELLIPSIS = String.fromCharCode(0x2026);
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('Episode 2 zones pick their own stages, and every stage PNG and band sidecar exists', () => {
  const want = { east_road: 'east_road', court_f1: 'court', court_f2: 'court', court_f3: 'court_deep', court_throne: 'throne' };
  for (const [zone, key] of Object.entries(want)) {
    assert.equal(backdropKey(zone, false), key, zone);
    assert.equal(backdropKey(zone, true), key, `${zone} (boss)`);
    for (const ext of ['png', 'json']) assert.ok(fs.existsSync(path.join(NEXT, 'assets', 'backdrops', `battle_${key}.${ext}`)), `battle_${key}.${ext}`);
  }
  assert.equal(backdropKey('archive_boss', true), 'boss', 'Episode 1 boss stage unchanged');
});

test('debug battles in the Court field the planned party: level per zone, full HP and MP with the gear on', () => {
  const lv = { east_road: 9, c1_quick: 10, other_selves: 11, c3_shards: 12, nameless_king: 13 };
  for (const [enc, level] of Object.entries({ road_wolves: lv.east_road, c1_quick: lv.c1_quick, other_selves: lv.other_selves, c3_shards: lv.c3_shards, nameless_king: lv.nameless_king })) {
    const g = makeDebugGame(enc);
    for (const m of g.party) {
      assert.equal(m.level, level, `${enc}: ${m.id} level`);
      const s = memberStats(m);
      assert.equal(m.hp, s.maxHp, `${enc}: ${m.id} starts at full HP`);
      assert.equal(m.mp, s.maxMp, `${enc}: ${m.id} starts at full MP`);
    }
  }
  assert.equal(makeDebugGame('valley_wolves').party[0].level, 2, 'Episode 1 debug level unchanged');
});

/** Play a fight on the competent policy, planning every batch; returns { evs, ops }. */
function play(encId, seed) {
  const g = makeDebugGame(encId);
  const { battle: b } = createEncounterBattle(encId, { party: g.party, rng: makeRng(seed), inventory: g.items, flags: {} });
  const info = () => ({ units: unitInfo(b.units()) });
  const evs = [...b.startEvents], ops = [...planEvents(b.startEvents, info())];
  let guard = 0;
  while (!b.isOver() && guard++ < 900) {
    const u = b.current();
    let e = u.side === 'party' ? b.perform(partyAction(b) || { type: 'defend' }) : b.runEnemyTurn();
    if (e.length === 1 && e[0].type === 'invalid') e = b.perform({ type: 'defend' });
    evs.push(...e); ops.push(...planEvents(e, info()));
  }
  return { evs, ops, b };
}

test('the Other Selves: the Mirrored Combo telegraph carries its partner to the scene (the silver bracket)', () => {
  let found = null;
  for (let seed = 1; seed <= 12 && !found; seed++) {
    const { ops } = play('other_selves', seed);
    found = ops.find((o) => o.op === 'telegraph' && o.mirrorCombo);
  }
  assert.ok(found, 'a Mirrored Combo was announced in 12 fights');
  assert.ok(found.partner && found.partner !== found.actor, 'the telegraph names the partner reflection');
});

test('Kept: the shard seals, the timeline greys the turn, the King never targets the Kept, the shard breaks', () => {
  let saw = null;
  for (let seed = 1; seed <= 30 && !saw; seed++) {
    const g = makeDebugGame('nameless_king');
    const { battle: b } = createEncounterBattle('nameless_king', { party: g.party, rng: makeRng(seed), inventory: g.items, flags: {} });
    let guard = 0;
    while (!b.isOver() && guard++ < 900) {
      const kept = b.units().find((u) => u.side === 'party' && u.alive && u.statuses.kept);
      if (kept) {
        const tl = b.timeline(8);
        const row = tl.find((r) => r.uid === kept.uid);
        assert.ok(!row || row.skip === 'kept', 'a Kept member\'s next turn is marked kept on the timeline');
        const king = b.units().find((u) => u.id === 'nameless_king');
        assert.ok(!b.targets(king, { type: 'attack' }).ids.includes(kept.uid), 'the King cannot target the Kept');
        // The party's own single-target allies list leaves the Kept out unless the skill can reach them (Recall).
        const mira = b.units().find((u) => u.id === 'mira' && u.alive && !u.statuses.kept);
        if (mira) {
          const info = b.targets(mira, { type: 'skill', skill: 'mending_rain' });
          if (info && info.ids) assert.ok(!info.ids.includes(kept.uid), 'party-wide heals pass the Kept by');
        }
        saw = { seed, uid: kept.uid };
        break;
      }
      const u = b.current();
      let e = u.side === 'party' ? b.perform(partyAction(b) || { type: 'defend' }) : b.runEnemyTurn();
      if (e.length === 1 && e[0].type === 'invalid') b.perform({ type: 'defend' });
    }
  }
  assert.ok(saw, 'someone was Kept within 30 fights');
  // The presentation of the events themselves.
  const units = { hero: { uid: 'hero', name: 'Arden', side: 'party' }, e1: { uid: 'e1', name: 'The Nameless King', side: 'enemy', boss: true } };
  const seal = planEvents([{ type: 'status_add', target: 'hero', status: 'kept', turns: 2 }], { units });
  assert.ok(seal.some((o) => o.op === 'status' && o.status === 'kept' && o.on), 'status op on');
  assert.ok(seal.some((o) => o.op === 'fx' && o.kind === 'kept_seal'), 'kept_seal fx');
  assert.ok(seal.some((o) => o.op === 'sfx' && o.id === 'kept'), 'kept sfx');
  const free = planEvents([{ type: 'status_remove', target: 'hero', status: 'kept', reason: 'freed' }], { units });
  assert.ok(free.some((o) => o.op === 'fx' && o.kind === 'kept_shatter'), 'kept_shatter fx');
  const crack = planEvents([{ type: 'message', kind: 'kept_break', text: 'The mirror cracks!', target: 'e1' }], { units });
  assert.ok(crack.some((o) => o.op === 'fx' && o.kind === 'mirror_crack' && o.uid === 'e1'), 'the mirror cracks across the view from the King');
  assert.ok(crack.some((o) => o.op === 'help' && /mirror cracks/.test(o.text)), 'the line is said');
});

test('the unmask: the veil shatters, a beat, then the frames swap (the swap lands under the flash)', () => {
  const units = { e1: { uid: 'e1', name: 'The Nameless King', side: 'enemy', boss: true } };
  const ops = planEvents([{ type: 'phase', actor: 'e1', phase: 3, name: 'Aurel Unmasked', text: 'Under the glass is a tired man\'s face.', sprite: 'nameless_king_unmasked' }], { units });
  const iShatter = ops.findIndex((o) => o.op === 'fx' && o.kind === 'shatter');
  const iWait = ops.findIndex((o, i) => i > iShatter && o.op === 'wait');
  const iSwap = ops.findIndex((o) => o.op === 'swapSprite' && o.sprite === 'nameless_king_unmasked');
  assert.ok(iShatter >= 0 && iWait > iShatter && iSwap > iWait, `shatter ${iShatter} < wait ${iWait} < swap ${iSwap}`);
  // And a real fight reaches it.
  let swapped = false;
  for (let seed = 1; seed <= 4 && !swapped; seed++) swapped = play('nameless_king', seed).ops.some((o) => o.op === 'swapSprite');
  assert.ok(swapped, 'a full King fight plans the unmask swap');
});

test('reflection heads: the owner\'s head in the glass ramp, white eyes, the hero\'s face blank, ink frame kept', () => {
  assert.equal(reflectionColor('#14101e', 'mira'), null, 'ink frame kept');
  assert.equal(reflectionColor('#251d34', 'bram'), null, 'cell backing kept');
  assert.equal(reflectionColor('#3e88ca', 'bram'), '#f6f4ee', 'Bram\'s reflection has white eyes');
  assert.equal(reflectionColor('#f9d77a', 'mira'), '#f6f4ee', 'Mira\'s reflection has white eyes');
  assert.equal(reflectionColor('#3e88ca', 'hero'), reflectionColor('#e8b585', 'hero'), 'the hero\'s eyes vanish into a blank face');
  for (const c of ['#b87942', '#6a54b0', '#2d1b1f', '#e8b585', '#ffffff']) assert.ok(REFL_RAMP.includes(reflectionColor(c, 'hero')), `${c} maps into the ramp`);
});

test('boss card: clears short foes (the Other Selves), keeps the W5 spot over a stage-filling boss', () => {
  const three = [{ y0: 116, y1: 146 }, { y0: 114, y1: 146 }, { y0: 112, y1: 146 }];
  const cy = bossCardY(three, true);
  assert.equal(cy, 40);
  for (const e of three) assert.ok(cy - 2 + 40 <= e.y0 || cy - 2 >= e.y1, 'the band does not cover a reflection');
  assert.equal(bossCardY([{ y0: 8, y1: 146 }], true), Math.round(H * 0.4), 'the King keeps the W5 spot');
});

test('enemy rows: a row that would run into its neighbour is lifted; width counts the reflect marker', () => {
  const placed = [{ x: 16, y: 148, w: 75 }];
  assert.equal(rowLift({ x: 88, y: 148 }, 60, placed), 16, 'touching rows: lift one row');
  assert.equal(rowLift({ x: 200, y: 148 }, 60, placed), 0, 'apart: no lift');
  assert.equal(enemyRowWidth({ weak: ['axe'], resist: ['sword'], unknown: 1, reflect: 'magic' }), 15 + 15 + 3 * 15);
});

test('help window: a long telegraph grows to three lines instead of losing its tail', () => {
  const def = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'ui', 'font.json'), 'utf8'));
  const font = new BitmapFont(def, null, { id: 'main' });
  const r = { measure: (s) => font.measure(s), wrap: (s, w) => font.wrap(s, w) };
  const keep = 'The Nameless King turns his mirror toward Mira. He means to keep them.';
  for (const rightW of [0, 94]) {                      // keyboard (no toggles while a telegraph shows) and touch (FLEE AUTO x1)
    const lines = helpLines(r, keep, 'orange', { rightW });
    assert.ok(lines.length >= 2 && lines.length <= 3, `${lines.length} lines`);
    assert.ok(!lines.some((l) => l.includes(ELLIPSIS)), `nothing cut (rightW ${rightW}): ${lines.join(' / ')}`);
    assert.ok(font.measure(lines[0]) <= HELP_WIN.w - 12 - rightW, 'line 1 leaves the toggles room');
    for (const l of lines.slice(1)) assert.ok(font.measure(l) <= HELP_WIN.w - 12, 'later lines fit the window');
    assert.equal(helpHeight(r, keep, 'orange', { rightW }), HELP_WIN.h + (lines.length - 1) * HELP_LINE_H);
  }
  assert.equal(helpLines(r, 'Strike with your weapon.', null, {}).length, 1, 'short help stays one line');
  assert.equal(helpHeight(r, '', null, {}), HELP_WIN.h);
});
