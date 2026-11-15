// E7-packs (2026-11-15; STAGING_EP7 section 6, EPISODE7 open choice 5): the ep7 pack patches court_f2 (the Court of Mirrors,
// Episode 2) so the Keeper's empty frame reads ep7_court_portrait once nox_named is set. Before nox_named the Court is exactly
// Episode 2's: the same events present, the same portrait scene. The patch only adds (plus the one ifNot on the old frame).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import court from '../../src/data/maps/court_f2.js';
import { withCourtPortrait } from '../../src/data/maps/ep7_patches.js';
import { EP7_LINES } from '../../src/data/ep7/text.js';
import { EP7_FLAGS } from '../../src/data/ep7/flags.js';
import { matches } from '../../src/data/story/dialogue.js';
import { scenes as EP2_SCENES } from '../../src/data/story/ep2.js';
import { scenes as EP7_SCENES, SCENE_CONDITIONS as EP7_CONDITIONS } from '../../src/data/ep7/story.js';
import { runOnce } from '../content/_harness.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const patched = withCourtPortrait(court);
const byId = (m, id) => m.events.find((e) => e.id === id);
const shown = (m, flags) => m.events.filter((e) => matches(e, (f) => flags.includes(f)));
const EP2 = ['ep1_complete', 'ep2_started', 'court_entered', 'court_f1_done', 'court_f2_arrived'];
const LATER = [...EP2, 'ep2_complete', 'ep6_complete', 'ep7_started', 'palehaven_arrived', 'met_keeper'];

test('the flag and the line exist; the old frame and its Episode 2 scene are where the patch expects them', () => {
  assert.ok(EP7_FLAGS.nox_named, 'nox_named is an Episode 7 flag');
  assert.ok(EP7_LINES.ep7_court_portrait, 'ep7_court_portrait');
  const old = byId(court, 'portrait_keeper');
  assert.deepEqual([old.x, old.y, old.w, old.h, old.sprite, old.script], [37, 8, 2, 2, 'portrait_keeper_empty', 'portrait_keeper']);
  assert.equal(old.if, undefined); assert.equal(old.ifNot, undefined);
  assert.equal(typeof EP2_SCENES.portrait_keeper, 'function');
});

test('withCourtPortrait is pure, idempotent, and leaves other maps alone', () => {
  const before = JSON.stringify(court);
  assert.notEqual(patched, court);
  assert.equal(JSON.stringify(court), before, 'the input is never mutated');
  assert.equal(withCourtPortrait(patched), patched, 'a second call returns its input');
  assert.equal(withCourtPortrait(null), null);
  const other = { id: 'court_f1', events: [] };
  assert.equal(withCourtPortrait(other), other);
});

test('only adds: every Episode 2 event, mark and cell stays; the old frame gains ifNot nox_named and nothing else', () => {
  assert.equal(patched.events.length, court.events.length + 1);
  for (const e of court.events) {
    const now = byId(patched, e.id);
    if (e.id === 'portrait_keeper') assert.deepEqual(now, { ...e, ifNot: 'nox_named' });
    else assert.equal(now, e, `${e.id} unchanged`);
  }
  assert.deepEqual(patched.marks, court.marks);
  for (const k of Object.keys(court)) if (k !== 'events') assert.equal(patched[k], court[k], k);
});

test('before nox_named the Court is exactly Episode 2: the same events present, the frame runs its Episode 2 scene', () => {
  for (const flags of [[], EP2, LATER]) {
    assert.deepEqual(shown(patched, flags).map((e) => e.id), shown(court, flags).map((e) => e.id), flags.join(','));
  }
  assert.deepEqual(shown(patched, EP2).filter((e) => e.x >= 37 && e.x <= 38 && e.y >= 8 && e.y <= 9).map((e) => e.id), ['portrait_keeper']);
});

test('after nox_named the same cells hold the new frame, which reads ep7_court_portrait; the sprite is unchanged', () => {
  const flags = [...LATER, 'nox_named'];
  const here = shown(patched, flags).filter((e) => e.x === 37 && e.y === 8);
  assert.deepEqual(here.map((e) => e.id), ['court_keeper7'], 'one frame on the cell, never two');
  const n = here[0];
  assert.deepEqual([n.type, n.w, n.h, n.sprite, n.text, n.if, n.script], ['object', 2, 2, 'portrait_keeper_empty', 'ep7_court_portrait', 'nox_named', 'court_keeper7']);
  const line = EP7_LINES.ep7_court_portrait.find((e) => matches(e, (f) => flags.includes(f))).lines;
  assert.ok(/still empty/i.test(line) && /Nox/.test(line), line);
  assert.ok(!/face in it/i.test(line), 'the frame is drawn empty, so the line does not say a face is in it');
  assert.ok(!line.includes(String.fromCharCode(0x2014)) && /^[\x20-\x7e]+$/.test(line), 'ASCII, no em dash');
  const tiles = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
  assert.ok(Object.values(tiles).some((sec) => sec && typeof sec === 'object' && sec.portrait_keeper_empty), 'the sprite exists');
});

test('the ep7 pack registers the patched Court over the core module', async () => {
  const { peekMap } = await import('../../src/world/maps.js');
  const r = await (await import('../../src/data/ep7/maps.js')).register();
  assert.deepEqual(r.patchedCore, ['court_f2']);
  assert.ok(byId(peekMap('court_f2'), 'court_keeper7'));
  assert.equal(byId(peekMap('court_f2'), 'portrait_keeper').ifNot, 'nox_named');
});

// The scene court_keeper7 (src/data/ep7/story.js): Episode 2's portrait_keeper scene by id when the frame was never seen, then the line.
const OLD_TEXT = 'A KEEPER IN THE COURT. The frame is empty. Not blank: empty, right through to the wall behind it.';
const NEW_LINE = EP7_LINES.ep7_court_portrait.find((e) => e.if === 'nox_named').lines;
const NOX = [...LATER, 'nox_named'];
const said = (log) => log.filter((e) => e.op === 'say').map((e) => e.args[1]);
const flagsSet = (log) => log.filter((e) => e.op === 'setFlag').map((e) => e.args[0]);

test('court_keeper7: an Episode 7 save that saw the child and the king but not the keeper gets the Episode 2 view, the cache, then the line', async () => {
  assert.deepEqual(EP7_CONDITIONS.court_keeper7, { if: 'nox_named' });
  const flags = [...NOX, 'portraits_started', 'portrait_child_seen', 'portrait_king_seen'];
  const { log } = await runOnce(EP7_SCENES.court_keeper7, { flags, branchFlags: false });
  const lines = said(log);
  assert.equal(lines[0], OLD_TEXT, 'Episode 2 text first, unchanged');
  assert.equal(lines[1], 'Whoever built this place is gone from it entirely.', "Mira's Episode 2 line");
  assert.equal(lines.at(-1), NEW_LINE, 'the Episode 7 line last');
  assert.deepEqual(flagsSet(log), ['portraits_started', 'portrait_keeper_seen', 'remembrance_open']);
  const act = log.filter((e) => e.op !== 'hasFlag');
  assert.equal(act[0].op, 'lockInput'); assert.equal(act.at(-1).op, 'unlockInput');
});

test('court_keeper7: a save that already saw the keeper gets only the new line and no flag change', async () => {
  const flags = [...NOX, 'portraits_started', 'portrait_child_seen', 'portrait_keeper_seen'];
  const { log } = await runOnce(EP7_SCENES.court_keeper7, { flags, branchFlags: false });
  assert.deepEqual(said(log), [NEW_LINE]);
  assert.deepEqual(flagsSet(log), []);
});

test('court_keeper7: an unseen keeper with only one other portrait seen gets the view and its flag, but not the cache yet', async () => {
  const { log } = await runOnce(EP7_SCENES.court_keeper7, { flags: [...NOX, 'portrait_child_seen'], branchFlags: false });
  assert.deepEqual(flagsSet(log), ['portraits_started', 'portrait_keeper_seen']);
  assert.equal(said(log).at(-1), NEW_LINE);
});

test('court_keeper7 never runs before nox_named, and the Episode 2 frame scene is the unchanged Episode 2 one', async () => {
  const { log } = await runOnce(EP7_SCENES.court_keeper7, { flags: LATER, branchFlags: false });
  assert.deepEqual(said(log), []);
  assert.deepEqual(flagsSet(log), []);
  const ep2 = await runOnce(EP2_SCENES.portrait_keeper, { flags: EP2, branchFlags: false });
  assert.deepEqual(said(ep2.log), [OLD_TEXT, 'Whoever built this place is gone from it entirely.']);
  assert.deepEqual(flagsSet(ep2.log), ['portraits_started', 'portrait_keeper_seen']);
  assert.equal(byId(patched, 'portrait_keeper').script, 'portrait_keeper', 'the old frame still runs it before nox_named');
});
