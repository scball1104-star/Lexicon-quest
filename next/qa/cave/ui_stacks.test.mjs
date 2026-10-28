// C2-story-ui: the title's two rows (the resume row by the suspend save, the B100 mark by a cleared slot), the Journal line,
// and the plaque screen drawn in node through a recording renderer. The pictures are the ui_stacks_* and ui_title_stacks shots.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.LQ_CAVE_ON = true;
const { ensurePack, packEnabled } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const { stacksOffer, STACKS_RESUME_LABEL, STACKS_RESUME_HELP, STACKS_RESUME_FAILED, drawStacksMark } = await import('../../src/scenes/title.js');
const { stacksLine } = await import('../../src/ui/screens/journal.js');
const { StacksScene, recordSummary, fitLabel, FADED, plaqueData, vaultRows, VAULT_TOTAL, openPlaqueScreen } = await import('../../src/data/cave/story.js');
const { TITLE_ROWS, STACKS_HELP } = await import('../../src/data/cave/text.js');
const { createSave } = await import('../../src/core/save.js');
const { newGameEp2, serialize } = await import('../../src/game/state.js');
const CAVE = await import('../../src/game/cave.js');
const { TOUCH_ROW_H } = await import('../../src/ui/list.js');

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const EM_DASH = String.fromCharCode(0x2014);

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null };
}
const newSave = () => createSave({ storage: memoryStorage(), log: () => {} });

/** A recording renderer: every text call kept, measure = 5 px a glyph, wrap by that measure. */
function fakeRenderer() {
  const texts = [], rects = [];
  const r = {
    W: 384, H: 216, frame: 0, settings: {}, assets: { has: () => false, atlas: () => null },
    ctx: { globalAlpha: 1, fillStyle: '', fillRect() {} },
    text: (t, x, y, o = {}) => { texts.push({ t: String(t), x, y, o }); },
    measure: (t, font) => String(t).length * (font === 'large' ? 7 : 5),
    wrap(t, w) { const out = []; let line = ''; for (const word of String(t).split(/ +/)) { if (!word) continue; const cand = line ? `${line} ${word}` : word; if (this.measure(cand) <= w || !line) line = cand; else { out.push(line); line = word; } } if (line) out.push(line); return out; },
    rect: (x, y, w, h, c) => { rects.push({ x, y, w, h, c }); }, pixel() {}, sprite() {}, image() {}, nineSlice() {},
    withAlpha: (a, fn) => fn(), pushClip() {}, popClip() {},
  };
  return { r, texts, rects };
}
function fakeInput() {
  const st = { dir: null, pressed: new Set() };
  return { st, repeatDir: () => st.dir, pressed: (a) => st.pressed.has(a), consume() {}, pointer: null, step(dir, presses = []) { st.dir = dir; st.pressed = new Set(presses); } };
}
function fakeEngine(o = {}) {
  const popped = [];
  return { popped, input: fakeInput(), audio: { sfx() {} }, touch: o.touch ? { visible: true } : null, game: o.game || null, pop: (v) => popped.push(v),
    registry: new Map(), registerScene(n, c) { this.registry.set(n, c); }, hasScene(n) { return this.registry.has(n); }, pushAwait: async () => {} };
}

test('the title row label lives twice (text.js is a pack file, title.js is precached): the copies are equal', () => {
  assert.equal(STACKS_RESUME_LABEL, TITLE_ROWS.resume);
  assert.equal(STACKS_RESUME_HELP, TITLE_ROWS.resume_help);
  assert.equal(STACKS_RESUME_FAILED, TITLE_ROWS.resume_failed);
  assert.equal(STACKS_RESUME_LABEL.replace('{n}', '23'), 'Resume the Deep Stacks (B23)');
});

test('stacksOffer: the resume row needs the pack on and a readable suspend save; the mark needs a slot with deep_stacks_cleared', () => {
  assert.equal(packEnabled('cave'), true, 'forced on for the test');
  const save = newSave();
  assert.deepEqual(stacksOffer(save), { resume: null, cleared: false });
  assert.deepEqual(stacksOffer(null), { resume: null, cleared: false });
  const g = newGameEp2('Arden');
  assert.ok(CAVE.enter(g, { seed: 7, playtime: 10 }));
  for (let i = 1; i < 23; i++) CAVE.descend(g);
  assert.ok(save.save('cave', serialize(g), CAVE.suspendMeta(g)), 'the suspend save the field writes per floor');
  assert.deepEqual(stacksOffer(save), { resume: { floor: 23 }, cleared: false });
  assert.deepEqual(stacksOffer(save, false), { resume: null, cleared: false }, 'hidden while the pack is neither live nor forced');
  const done = newGameEp2('Arden'); done.flags.deep_stacks_cleared = true;
  save.save(2, serialize(done), { name: 'Arden' });
  assert.deepEqual(stacksOffer(save), { resume: { floor: 23 }, cleared: true });
  save.remove('cave');
  assert.deepEqual(stacksOffer(save), { resume: null, cleared: true });
  // a save that throws never breaks the title
  assert.deepEqual(stacksOffer({ exists() { throw new Error('corrupt'); }, loadEnvelope() { throw new Error('corrupt'); }, slots: 3 }), { resume: null, cleared: false });
  // the mark draws a ribbon and the label
  const { r, texts, rects } = fakeRenderer();
  drawStacksMark(r, 40, 205);
  assert.ok(rects.length >= 4 && texts.some((t) => t.t === 'B100'));
});

test('title.js: the row sits under Continue, confirm routes to resumeStacks, world.js is reached only by a dynamic import, the mark draws only when cleared', () => {
  const src = read('src/scenes/title.js');
  assert.ok(!src.includes(EM_DASH));
  assert.match(src, /this\.stacks = stacksOffer\(e\.save\);/);
  const rows = src.indexOf("{ id: 'continue'"), stacks = src.indexOf("id: 'stacks', label: STACKS_RESUME_LABEL"), ep2 = src.indexOf("{ id: 'ep2'");
  assert.ok(rows > 0 && stacks > rows && ep2 > stacks, 'New Game, Continue, Resume the Deep Stacks, Episode 2, ..., Config');
  assert.match(src, /else if \(id === 'stacks'\) this\.resumeStacks\(\);/);
  assert.match(src, /await import\('\.\.\/data\/cave\/world\.js'\)/);
  assert.ok(!/^import .*data\/cave\//m.test(src), 'no static import of a pack file in the precached title');
  assert.match(src, /if \(this\.stacks && this\.stacks\.cleared\) drawStacksMark\(r/);
  assert.match(src, /noteId === 'stacks' \? STACKS_RESUME_HELP/);
  assert.match(src, /r\.text\(VERSION, 4, 205, \{ color: 'gray' \}\);\r?\n\s*if \(this\.stacks/, 'the mark is drawn right after the version line, nothing moved');
});

test('the Journal line: hidden until deep_stacks_open, then the deepest floor and the vault count', () => {
  const g = newGameEp2('Arden');
  assert.equal(stacksLine(g), null);
  g.flags.deep_stacks_open = true;
  assert.equal(stacksLine(g), 'The Deep Stacks: no reading yet');
  CAVE.ensureCave(g).record.floor = 23;
  assert.equal(stacksLine(g), 'The Deep Stacks: deepest B23, 0 names in the vault');
  g.cave.vault.push('cave_catalogue_pen');
  assert.equal(stacksLine(g), 'The Deep Stacks: deepest B23, 1 name in the vault');
  g.cave.vault.push('cave_reading_hood', 'cave_cellar_key', 'cave_root_boots');
  assert.equal(stacksLine(g), 'The Deep Stacks: deepest B23, 4 names in the vault');
  const src = read('src/ui/screens/journal.js');
  assert.ok(!src.includes(EM_DASH));
  assert.ok(!/from '\.\.\/\.\.\/data\/cave\//.test(src), 'the precached Journal imports game/cave.js only, never a pack file');
  assert.match(src, /const ds = stacksLine\(g\);/, 'one line under the main quest');
});

test('the plaque screen: the record in the header, sixty-one rows in grade order (C4-uniques), held bright and unheld faded, the detail, the help bar, cancel pops', () => {
  const g = newGameEp2('Arden');
  CAVE.ensureCave(g); g.cave.record = { floor: 23, readings: 4, clears: 0, time: 5025 };
  g.cave.vault.push('cave_catalogue_pen', 'cave_root_boots');
  const data = plaqueData(g);
  assert.equal(data.rows.length, VAULT_TOTAL); assert.equal(VAULT_TOTAL, 61);
  assert.deepEqual(data.rows.map((x) => x.band), [...[1, 2, 3].flatMap(() => [1, 2, 3, 4, 5].flatMap((b) => [b, b, b, b])), 0], 'grade order, then band order, the Quill (band 0) last');
  assert.deepEqual(data.rows[0], { id: 'cave_catalogue_pen', name: "The Catalogue's Pen", held: true, icon: 'sword', band: 1, where: 'The Catalogue, B1 to B19', wear: 'Sword',
    prop: { name: 'First Line', text: 'The first blow each fight cannot miss.' }, lore: ['A Lesser gift: a loose page of the Stacks.', "A keeper's pen, ground to an edge.", 'It never misses the first line.'] });
  assert.equal(data.rows[9].wear, 'Body, Mira'); assert.equal(data.rows[12].wear, 'Body, the hero and Bram'); assert.equal(data.rows[1].wear, 'Body, anyone');
  const e = fakeEngine({ game: g });
  const scene = new StacksScene(e);
  scene.enter(data);
  const { r, texts } = fakeRenderer();
  scene.draw(r);
  const all = texts.map((t) => t.t);
  assert.ok(all.includes('The Deep Stacks'), 'the title');
  assert.ok(all.some((t) => t.includes('Deepest B23') && t.includes('4 readings') && t.includes('1:23:45')), `the record summary: ${all[1]}`);
  for (const row of data.rows.slice(0, 11)) assert.ok(all.includes(fitLabel(r, row.name, 100)), `row ${row.id} is listed as ${fitLabel(r, row.name, 100)}`);
  const listed = texts.filter((t) => t.x === 24 + 19);
  assert.equal(listed.length, 11, 'eleven rows visible at the keyboard row height');
  assert.ok(!all.includes("Juror's Mantle"), 'the twelfth row waits below the fold');
  assert.ok(listed[0].o.color === 'cream' && listed[0].o.alpha === undefined, 'held: bright');
  assert.ok(listed[1].o.alpha === FADED.alpha && listed[1].o.shadow === false, 'unheld: faded ink');
  // the detail of the first (held) row: name, home, wear, prop, lore
  assert.ok(all.includes("The Catalogue's Pen") && all.includes('The Catalogue, B1 to B19') && all.includes('Sword') && all.includes('First Line'));
  assert.ok(all.includes("A keeper's pen, ground to an edge.") && all.includes('It never misses the first line.'), 'held: the lore');
  assert.ok(all.some((t) => t.startsWith('Vault 2 of 61')), 'the help bar count');
  assert.ok(all.includes(STACKS_HELP.screen));
  // move to an unheld row: name only, "..." and the unfound line
  e.input.step('down'); scene.update(); e.input.step(null);
  const r2 = fakeRenderer(); scene.draw(r2.r);
  const all2 = r2.texts.map((t) => t.t);
  assert.ok(all2.includes("Shelf-Keeper's Mail") && all2.includes('...') && all2.some((t) => STACKS_HELP.unfound.startsWith(t)));
  assert.ok(!all2.some((t) => t.startsWith('Riveted from the brackets')), 'unheld: no lore');
  assert.deepEqual(scene.debugState().id, 'cave_shelf_mail');
  assert.equal(scene.debugState().held, 2);
  // the Quill last; cancel pops with the row id
  scene.list.moveTo(60); assert.equal(scene.row.id, 'cave_binders_quill');
  const r3 = fakeRenderer(); scene.draw(r3.r);
  assert.ok(r3.texts.some((t) => t.t === fitLabel(r3.r, "The Binder's Quill", 100)) && r3.texts.some((t) => t.t === 'The Binder, B100'), 'the Quill row scrolled into view with its home');
  e.input.step(null, ['cancel']); scene.update();
  assert.deepEqual(e.popped, ['cave_binders_quill']);
  assert.ok(!all.some((t) => t.includes(EM_DASH)));
});

test('the plaque screen on a phone: touch rows, seven visible, the list scrolls; recordSummary and fitLabel degrade gracefully', async () => {
  const g = newGameEp2('Arden'); CAVE.ensureCave(g).record = { floor: 5, readings: 1, clears: 0, time: 0 };
  const e = fakeEngine({ game: g, touch: true });
  const scene = new StacksScene(e);
  scene.enter(plaqueData(g));
  assert.equal(scene.list.rowH, TOUCH_ROW_H); assert.equal(scene.list.rows, 7);
  scene.list.moveTo(60);
  assert.ok(scene.list.scroll > 0, 'the Quill scrolls into view');
  const { r } = fakeRenderer();
  assert.equal(recordSummary(r, { floor: 5, readings: 1, clears: 0, time: 0 }, 400), 'Deepest B5   1 reading');
  assert.equal(recordSummary(r, { floor: 0, readings: 0, clears: 0, time: 0 }, 400), 'No reading yet');
  assert.equal(recordSummary(r, { floor: 100, readings: 9, clears: 2, time: 61 }, 400), 'Deepest B100   9 readings   Read through 2   0:01:01');
  assert.equal(recordSummary(r, { floor: 100, readings: 9, clears: 2, time: 61 }, 130), 'Deepest B100   9 readings');
  assert.equal(recordSummary(r, { floor: 100, readings: 9, clears: 2, time: 61 }, 60), 'Deepest B100', 'the deepest floor is never dropped');
  assert.equal(fitLabel(r, 'Mantle of the Damp Stair', 100), 'Mantle of the Dam...');
  assert.equal(fitLabel(r, "The Court's Last Word", 100), "Court's Last Word");
  // openPlaqueScreen registers the scene on first use and pushes the data
  const pushed = [];
  e.pushAwait = async (n, d) => { pushed.push([n, d]); };
  assert.equal(await openPlaqueScreen(e), true);
  assert.ok(e.hasScene('stacks') && pushed[0][0] === 'stacks' && pushed[0][1].rows.length === 61);
  assert.equal(await openPlaqueScreen({ game: null, pushAwait: async () => {} }), false, 'no game: nothing');
  // the screen is pack code on purpose (the tap-prompt ratchet): nothing of it sits in the precached src/ui/screens/
  assert.ok(!fs.existsSync(path.join(NEXT, 'src/ui/screens/stacks.js')), 'no precached copy of the plaque screen');
  const src = read('src/data/cave/story.js');
  assert.ok(!src.includes(EM_DASH));
  assert.match(src, /export class StacksScene/);
});
