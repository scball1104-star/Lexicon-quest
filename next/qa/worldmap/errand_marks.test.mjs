// World map errand marks (the wave 5 hook, issue #100, docs/WORLD_MAP_PLAN.md section 12): the map reads
// globalThis.LQ_ERRANDS (installed by the ep4 pack) and shows a "!" bubble at a giver with an open or ready errand, a "?"
// at a source being fetched, a line in the info box of the chosen place, and a line where Penny's cart stands. Before the
// hook exists it shows nothing and never throws. Pure node, plus the scene drawn into a recording renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = (rel) => import(pathToFileURL(path.join(NEXT, rel)).href);
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');

const D = await imp('src/data/worldmap/data.js');
const SC = await imp('src/data/worldmap/scene.js');
const S = await imp('src/game/state.js');
const X = await imp('src/data/ep4/errands.js');
const { EP3_DONE_FLAGS } = await imp('src/data/ep4/start.js');
const { EP4_DONE_FLAGS } = await imp('src/data/ep5/start.js');
const { EP5_DONE_FLAGS } = await imp('src/data/ep6/start.js');
const { EP6_FLAGS } = await imp('src/data/ep6/flags.js');
const EP6_DONE = Object.keys(EP6_FLAGS).slice(0, Object.keys(EP6_FLAGS).indexOf('ep6_complete') + 1);

const HOOK = { errandsFor: X.errandsFor, errandLedger: X.errandLedger, errandState: X.errandState, merchantAt: X.merchantAt, ERRANDS: X.ERRANDS };
const flagsOf = (...lists) => Object.fromEntries(lists.flat().map((f) => [f, true]));
const DONE = [S.EP1_DONE_FLAGS, S.EP2_DONE_FLAGS, EP3_DONE_FLAGS, EP4_DONE_FLAGS, EP5_DONE_FLAGS, EP6_DONE];
const MAP = { 1: 'hero_home', 2: 'nh_inn', 3: 'pk_inn', 4: 'ep4_vw_inn', 5: 'ep5_sh_inn', 6: 'ep6_zl_inn' };
const end = (n, extra = {}) => ({ map: MAP[n], flags: { ...flagsOf(...DONE.slice(0, n)), ...extra }, party: [] });
const marks = (g) => Object.fromEntries(Object.entries(D.errandMarks(g, HOOK)).map(([id, l]) => [id, l.map((e) => `${e.mark}${e.id}`).join(' ')]));
const fl = (id, ...k) => Object.fromEntries(k.map((s) => [`xr_${id}_${s}`, true]));

test('no hook (the ep4 pack not loaded): no marks, no Penny, never an error', () => {
  const g = end(6);
  const was = globalThis.LQ_ERRANDS;
  try {
    delete globalThis.LQ_ERRANDS;
    assert.equal(D.errandsReady(), false);
    assert.deepEqual(D.errandMarks(g), {});
    assert.equal(D.pennyAt(g), null);
    assert.deepEqual(D.errandMarks(g, null), {});
    assert.deepEqual(D.errandMarks(g, {}), {}, 'a hook without errandsFor is no hook');
    const boom = { errandsFor() { throw new Error('boom'); }, merchantAt() { throw new Error('boom'); } };
    assert.deepEqual(D.errandMarks(g, boom), {}, 'a throwing hook shows nothing');
    assert.equal(D.pennyAt(g, boom), null);
    assert.equal(D.errandLine(undefined), '');
    assert.equal(D.markOf([]), '');
  } finally { if (was) globalThis.LQ_ERRANDS = was; }
});

test('none before Episode 4 is done; Penny from Episode 3', () => {
  assert.deepEqual(marks({ flags: {} }), {}, 'a fresh game');
  for (const n of [1, 2, 3]) assert.deepEqual(marks(end(n)), {}, `end of Episode ${n}`);
  assert.equal(D.pennyAt(end(2), HOOK), null);
  assert.equal(D.pennyAt(end(3), HOOK), 'emberpeak');
  assert.equal(D.pennyAt(end(4), HOOK), 'valewyn');
  assert.equal(D.pennyAt(end(5), HOOK), 'saffron');
  assert.equal(D.pennyAt(end(6), HOOK), 'zephyr');
});

test('one errand through its states: "!" at the giver, "?" at the source, "!" to deliver, gone when done', () => {
  assert.deepEqual(marks(end(4)), { willowmere: '!nella_rope' }, 'open: Nella asks');
  assert.equal(D.errandLine(D.errandMarks(end(4), HOOK).willowmere), '! Nella wants a rope');
  assert.deepEqual(marks(end(4, fl('nella_rope', 'started'))), { flood_road: '?nella_rope' }, 'fetch: Hale on the Flood Road');
  assert.equal(D.errandLine(D.errandMarks(end(4, fl('nella_rope', 'started')), HOOK).flood_road), '? A rope for Nella');
  assert.deepEqual(marks(end(4, fl('nella_rope', 'started', 'got'))), { willowmere: '!nella_rope' }, 'deliver');
  assert.equal(D.errandLine(D.errandMarks(end(4, fl('nella_rope', 'started', 'got')), HOOK).willowmere), '! Bring Nella the rope');
  assert.deepEqual(marks(end(4, fl('nella_rope', 'started', 'got', 'done'))), {}, 'done');
  // the item handed over first (the source spoke first): deliver at the giver
  assert.deepEqual(marks(end(4, fl('nella_rope', 'started', 'got'))), marks(end(4, fl('nella_rope', 'got'))));
});

test('after Episode 6: every giver marked, counts for two, "?" and "!" together show "!"', () => {
  assert.deepEqual(marks(end(6)), {
    willowmere: '!nella_rope', hollowmere: '!tovin_shell !vessa_glass', emberpeak: '!bess_spice !sella_brass',
    valewyn: '!lyra_reading', saffron: '!laleh_chart',
  });
  const all = D.errandMarks(end(6), HOOK);
  assert.equal(D.errandLine(all.hollowmere), '! 2 errands open.');
  assert.equal(D.errandLine(all.valewyn), X.ERRAND.lyra_reading.label.open);
  const started = Object.assign({}, ...X.ERRANDS.map((e) => fl(e.id, 'started')));
  const fetching = D.errandMarks(end(6, started), HOOK);
  assert.deepEqual(Object.keys(fetching).sort(), ['flood_road', 'saffron', 'zephyr']);
  assert.equal(D.markOf(fetching.zephyr), '?');
  assert.equal(D.errandLine(fetching.zephyr), '? 3 things to fetch here.');
  assert.equal(D.markOf(fetching.saffron), '?', 'Laleh asked: only the three sources');
  const mixed = D.errandMarks(end(6, fl('tovin_shell', 'started')), HOOK);
  assert.equal(D.markOf(mixed.saffron), '!', 'Laleh still to ask beside a shell to fetch: "!" wins');
  assert.equal(D.errandLine(mixed.saffron), '! 2 errands open.');
  const finished = Object.assign({}, ...X.ERRANDS.map((e) => fl(e.id, 'started', 'got', 'done')));
  assert.deepEqual(marks(end(6, finished)), {}, 'all done: the map is quiet');
});

test('the copy fits the info box (real font), labels at most 26 characters, no em dash', () => {
  const font = JSON.parse(read('assets/ui/font.json'));
  const adv = (c) => (c === ' ' ? font.spaceAdvance : font.glyphs[c] ? font.glyphs[c][6] : 6);
  const width = (s) => [...s].reduce((a, c, i) => a + adv(c) + ((font.kerning || {})[(s[i - 1] || '') + c] || 0), 0);
  const INFO_W = SC.INFO.w - 16;
  const lines = [D.TEXT.penny, D.TEXT.errandsOpen(7), D.TEXT.errandsFetch(7), ...X.ERRANDS.flatMap((e) => Object.values(e.label))];
  for (const l of lines) assert.ok(width(l) <= INFO_W, `"${l}" fits (${width(l)} px)`);
  for (const e of X.ERRANDS) for (const l of Object.values(e.label)) assert.ok(l.length <= 26, l);
  assert.ok(!(JSON.stringify(lines) + read('src/data/worldmap/data.js') + read('src/data/worldmap/scene.js')).includes('—'), 'no em dash');
});

test('bubbleSpot: on screen, clear of what it must avoid, first clear spot wins', () => {
  const b = SC.bubbleSpot(100, 100, []);
  assert.deepEqual(b, { x: 104, y: 80, w: 10, h: 12 }, 'above-right by default');
  const c = SC.bubbleSpot(100, 100, [{ x: 100, y: 75, w: 30, h: 20 }]);
  assert.deepEqual([c.x, c.y], [86, 80], 'above-left when above-right is taken');
  const edge = SC.bubbleSpot(380, 8, []);
  assert.ok(edge.x >= 1 && edge.y >= 1 && edge.x + edge.w <= SC.VIEW.w - 1 && edge.y + edge.h <= SC.VIEW.h - 1, 'stays on screen');
});

// ------------------------------------------------------------------------------------------------- the scene, drawn
function recorder() {
  const calls = [];
  return {
    calls,
    ctx: { globalAlpha: 1, fillStyle: '', fillRect() {}, save() {}, restore() {}, drawImage() {} },
    clear() {}, drawLayer() {}, image() {}, sprite() {}, pixel() {}, line() {},
    rect(x, y, w, h, c) { calls.push(['rect', x, y, w, h, c]); },
    text(s, x, y, o = {}) { calls.push(['text', s, x, y, o.color]); },
    measure(s) { return String(s).length * 6; },
    withAlpha(a, fn) { fn(); },
    assets: { img: () => null, has: () => false },
  };
}
function sceneFor(game, { reduce = false } = {}) {
  const engine = {
    game, settings: { reduceMotion: reduce }, stack: [], input: new Proxy({ pointer: null }, { get: (t, k) => (k in t ? t[k] : () => null) }), audio: null,
    touch: { visible: false }, pop() {},
  };
  const s = new SC.WorldMapScene(engine);
  s.enter({ from: 'debug' });
  return s;
}
const BUBBLE_FILL = '#fff7d6';

test('the scene: marks drawn by the givers, the info box grows a line, nothing without the hook, still under Reduce motion', () => {
  const was = globalThis.LQ_ERRANDS;
  try {
    delete globalThis.LQ_ERRANDS;
    const none = sceneFor(end(6));
    const r0 = recorder();
    none.draw(r0);
    assert.deepEqual(none.debugState().errands, {}, 'no hook: no marks');
    assert.equal(none.debugState().errandsOk, false);
    assert.deepEqual(none.debugState().infoLines, []);
    assert.ok(!r0.calls.some((c) => c[0] === 'rect' && c[5] === BUBBLE_FILL), 'no bubble drawn');
    // the pack finishes loading while the map is open: the marks appear on the next check
    globalThis.LQ_ERRANDS = HOOK;
    for (let i = 0; i < 30; i++) none.update();
    assert.equal(none.debugState().errandsOk, true);
    assert.equal(none.debugState().errands.hollowmere, '!');

    const s = sceneFor(end(6));
    const r = recorder();
    s.draw(r);
    const st = s.debugState();
    assert.deepEqual(st.errands, { willowmere: '!', hollowmere: '!', emberpeak: '!', valewyn: '!', saffron: '!' });
    assert.equal(st.penny, 'zephyr');
    assert.equal(st.sel, 'zephyr', 'the party stands at Zephyr Landing');
    assert.deepEqual(st.infoLines, [D.TEXT.penny], "Penny's line where she stands");
    assert.ok(r.calls.some((c) => c[0] === 'text' && c[1] === D.TEXT.penny), 'drawn');
    const drawn = Object.keys(st.bubbles);
    assert.ok(drawn.includes('saffron') && drawn.length >= 3, `bubbles on screen: ${drawn}`);
    // every bubble clear of every label plate
    for (const [x, y] of Object.values(st.bubbles)) {
      const b = { x: x - Math.round(s.ox), y, w: 10, h: 12 };
      for (const p of s.plates) assert.ok(!(b.x < p.x + p.w && p.x < b.x + b.w && b.y < p.y + p.h && p.y < b.y + b.h), `bubble ${JSON.stringify(b)} clear of plate ${JSON.stringify(p)}`);
    }
    s.select('hollowmere');
    assert.deepEqual(s.debugState().infoLines, ['! 2 errands open.']);
    assert.equal(s.infoH, SC.INFO.h + SC.INFO.line);
    assert.equal(s.infoY, SC.INFO.high, 'the party stands low on the map: the box sits up top');
    const vw = sceneFor({ ...end(6), map: 'ep4_valewyn' });
    vw.select('hollowmere');
    assert.equal(vw.infoY, SC.INFO.low - SC.INFO.line, 'at the bottom the box grows upward');
    assert.equal(vw.infoY + vw.infoH, SC.INFO.low + SC.INFO.h, 'and keeps its bottom edge');
    const r2 = recorder();
    s.draw(r2);
    assert.ok(r2.calls.some((c) => c[0] === 'text' && c[1] === '! 2 errands open.' && c[4] === 'gold'));
    s.select('labyrinth');
    assert.deepEqual(s.debugState().infoLines, [], 'a place with nothing: the plain box');
    assert.equal(s.infoH, SC.INFO.h);

    // bobbing: the bubble moves by a pixel over time, never under Reduce motion
    const ys = (sc) => { const rr = recorder(); sc.draw(rr); return rr.calls.filter((c) => c[0] === 'rect' && c[5] === BUBBLE_FILL && c[3] === 8).map((c) => c[2]).join(','); };
    const moving = sceneFor(end(6));
    const a = ys(moving); moving.frame += 30; const b = ys(moving);
    assert.notEqual(a, b, 'bobs');
    const still = sceneFor(end(6), { reduce: true });
    const c = ys(still); still.frame += 30; const d = ys(still);
    assert.equal(c, d, 'Reduce motion: still');
  } finally { if (was) globalThis.LQ_ERRANDS = was; else delete globalThis.LQ_ERRANDS; }
});
