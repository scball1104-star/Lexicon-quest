import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { List, TOUCH_ROW_H, rowHeightFor, rowsThatFit } from '../../src/ui/list.js';
import { fillHero, fmtGold, fmtTime, paginate, hardBreaks, charsPerFrame, voiceFor, roman } from '../../src/ui/text.js';
import { schemeColors, SCHEMES, currentScheme } from '../../src/ui/window.js';
import { portraitFor } from '../../src/ui/dialog.js';
import { NumberPopups } from '../../src/ui/numberPopup.js';
import { cleanName } from '../../src/game/state.js';
import { ROWS as CONFIG_ROWS, SETTING_KEYS as CONFIG_SETTING_KEYS, helpFor } from '../../src/scenes/config.js';
import { DEFAULT_SETTINGS } from '../../src/core/save.js';
import { BitmapFont } from '../../src/core/font.js';

/** Minimal input/audio doubles for List.update. */
function fakeInput() {
  const st = { dir: null, pressed: new Set(), consumed: [] };
  return {
    st,
    repeatDir: () => st.dir,
    pressed: (a) => st.pressed.has(a),
    consume: (a) => st.consumed.push(a),
    pointer: null,
    step(dir, presses = []) { st.dir = dir; st.pressed = new Set(presses); },
  };
}
function fakeAudio() { const calls = []; return { calls, sfx: (id) => calls.push(id) }; }

test('List: moves, wraps, scrolls and buzzes on disabled confirm', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i, label: `Item ${i}`, disabled: i === 3 }));
  const list = new List({ x: 0, y: 0, w: 100, rows: 4, items });
  const input = fakeInput(), audio = fakeAudio();
  input.step('down'); assert.equal(list.update(input, audio), null); assert.equal(list.index, 1);
  assert.deepEqual(audio.calls, ['cursor']);
  input.step('up'); list.update(input, audio); input.step('up'); list.update(input, audio);
  assert.equal(list.index, 9, 'wraps to the end');
  assert.equal(list.scroll, list.maxScroll, 'scrolled to show the last row');
  input.step('down'); list.update(input, audio);
  assert.equal(list.index, 0); assert.equal(list.scroll, 0);
  list.moveTo(3);
  input.step(null, ['confirm']);
  assert.equal(list.update(input, audio), null, 'disabled row does not confirm');
  assert.equal(audio.calls[audio.calls.length - 1], 'buzzer');
  list.moveTo(4);
  assert.equal(list.update(input, audio), 'confirm');
  assert.equal(audio.calls[audio.calls.length - 1], 'confirm');
  assert.deepEqual(input.st.consumed, ['confirm']);
  input.step(null, ['cancel']);
  assert.equal(list.update(input, audio), 'cancel');
  assert.equal(list.update(fakeInput(), audio), null, 'nothing pressed = nothing');
});

test('List: columns navigate as a grid and clamp at the ragged end', () => {
  const items = Array.from({ length: 11 }, (_, i) => ({ id: i, label: String(i) }));
  const list = new List({ x: 0, y: 0, w: 130, rows: 3, columns: 13, colW: 10, items });
  const input = fakeInput(), audio = fakeAudio();
  input.step('right'); list.update(input, audio); assert.equal(list.index, 1);
  input.step('left'); list.update(input, audio); input.step('left'); list.update(input, audio);
  assert.equal(list.index, 10, 'left wraps to the last item of the row');
  const grid = new List({ x: 0, y: 0, w: 60, rows: 5, columns: 3, colW: 20, items: items.slice(0, 8) });
  grid.moveTo(2);
  input.step('down'); grid.update(input, audio); assert.equal(grid.index, 5);
  input.step('down'); grid.update(input, audio); assert.equal(grid.index, 7, 'past the ragged end lands on the last item');
  assert.equal(grid.rowOf(7), 2);
  assert.deepEqual(grid.rowRect(4), { x: 20, y: 12, w: 20, h: 12 });
  assert.equal(grid.pointerRow(25, 13), 4);
  assert.equal(grid.pointerRow(200, 13), -1);
});

test('List: setItems keeps or resets the index safely', () => {
  const list = new List({ rows: 3, items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] });
  list.moveTo(2);
  list.setItems([{ label: 'x' }]);
  assert.equal(list.index, 0);
  list.setItems([], true);
  assert.equal(list.item, null);
  list.setItems([{ label: 'q' }, { label: 'r' }], false);
  assert.equal(list.index, 0);
});

test('text helpers', () => {
  assert.equal(fillHero('Hi {hero}, {hero}!', { heroName: 'Arden' }), 'Hi Arden, Arden!');
  assert.equal(fillHero('{hero}', 'Mira'), 'Mira');
  assert.equal(fillHero('{hero}', null), 'Hero');
  assert.equal(fmtGold(12480), '12,480'); assert.equal(fmtGold(999), '999'); assert.equal(fmtGold(-5), '0');
  assert.equal(fmtTime(5025), '1:23:45'); assert.equal(fmtTime(59), '0:00:59');
  assert.deepEqual(paginate(['a', 'b', 'c', 'd'], 3), [['a', 'b', 'c'], ['d']]);
  assert.deepEqual(paginate([], 3), [['']]);
  assert.equal(charsPerFrame(4), 999); assert.equal(charsPerFrame(1), 0.5); assert.equal(charsPerFrame(undefined), 1);
  assert.equal(voiceFor('mira'), 'high'); assert.equal(voiceFor('bram'), 'low'); assert.equal(voiceFor('mael'), 'mid'); assert.equal(voiceFor(null), null);
  assert.equal(roman(1), 'I'); assert.equal(roman(4), 'IV');
});

test('name cleaning matches the state rules (8 chars, letters digits space apostrophe hyphen)', () => {
  assert.equal(cleanName('Arden'), 'Arden');
  assert.equal(cleanName('  '), 'Hero');
  assert.equal(cleanName('Very Long Name'), 'Very Lon');
  assert.equal(cleanName("O'Mal-ley!!"), "O'Mal-le");
  assert.equal(cleanName('{c:gold}x'), 'cgoldx');
});

test('window schemes fall back without art and read the setting', () => {
  assert.equal(SCHEMES.length, 6);
  const fake = { settings: { windowColor: 'ember' }, assets: { has: () => false } };
  assert.equal(currentScheme(fake), 'ember');
  assert.equal(schemeColors(fake).top, '#8f5533');
  assert.equal(schemeColors(fake, 'blue').highlight, '#6891d9');
  assert.equal(currentScheme({ settings: { windowColor: 'nope' }, assets: { has: () => false } }), 'blue');
  for (const s of SCHEMES) for (const k of ['top', 'mid', 'bottom', 'highlight', 'accent']) assert.match(schemeColors(fake, s)[k], /^#[0-9a-f]{6}$/);
});

test('portraitFor: explicit, party default, NPC portrait when the art exists, narration none', () => {
  const frames = { mira_48: {}, hero_48: {}, tess_48: {} };
  const r = { assets: { has: () => true, atlas: () => ({ frames }) } };
  assert.equal(portraitFor(r, 'mira', undefined), 'mira');
  assert.equal(portraitFor(r, 'tess', undefined), 'tess', 'NPCS.tess.portrait exists in the atlas');
  assert.equal(portraitFor(r, 'oren', undefined), null, 'no art for Oren');
  assert.equal(portraitFor(r, 'mira', null), null, 'explicit null hides it');
  assert.equal(portraitFor(r, 'oren_out', 'hero'), 'hero');
  assert.equal(portraitFor(r, null, undefined), null);
});

/** Bottom y of every live popup this frame (the layout the draw uses). */
function bottoms(pops) { const m = pops.layout(); return [...pops.list].map((p) => [p, m.get(p)]); }

test('number popups bounce and expire; same-target hits stack upward 10 px apart, newest on top', () => {
  const pops = new NumberPopups();
  const a = pops.spawn(100, 50, 37);
  const b = pops.spawn(100, 50, 12);
  const c = pops.spawn(100, 50, 5, { kind: 'crit' });
  assert.equal(a.x, 100); assert.equal(b.x, 100, 'no sideways stagger any more');
  assert.equal(c.font, 'num_big');
  assert.equal(a.group, b.group, 'same target = same column');
  assert.equal(a.stack, 0);
  assert.equal(b.stack, -10, 'second number sits 10 px above the first');
  assert.equal(c.stack, -20, 'third above the second');
  const ys = new Map(bottoms(pops));
  assert.equal(ys.get(a), 50); assert.equal(ys.get(b), 40); assert.equal(ys.get(c), 30);
  // Another actor far away starts its own column.
  const d = pops.spawn(200, 50, 9);
  assert.notEqual(d.group, a.group); assert.equal(d.stack, 0);
  assert.equal(NumberPopups.offsetAt(0), 0);
  assert.ok(NumberPopups.offsetAt(8) < -10, 'peaks around frame 8');
  assert.equal(NumberPopups.offsetAt(16), 0, 'back on the ground at 16');
  assert.ok(NumberPopups.offsetAt(19) < 0, 'first bounce');
  assert.equal(NumberPopups.offsetAt(40), 0);
  for (let i = 0; i < 60; i++) pops.update();
  assert.equal(pops.active, 0);
  pops.word(10, 10, 'MISS');
  assert.equal(pops.active, 1);
  pops.clear(); assert.equal(pops.active, 0);
});

test('number popups: at most 4 per target; a bouncing column never overlaps', () => {
  const pops = new NumberPopups();
  const first = pops.spawn(100, 50, 1);
  for (let i = 0; i < 4; i++) { pops.update(); pops.update(); pops.spawn(100, 50, 2 + i); }
  assert.equal(pops.active, 4, 'a fifth hit retires the oldest');
  assert.ok(!pops.list.includes(first), 'the oldest one is gone');
  // Over the whole life of the column, entries stay in order and never overlap (bottom above the one below).
  for (let f = 0; f < 60; f++) {
    const rows = bottoms(pops).filter(([p]) => p.t >= 0);
    rows.sort((x, y) => y[1] - x[1]);   // lowest on screen first
    for (let i = 1; i < rows.length; i++) {
      const below = rows[i - 1], here = rows[i];
      assert.ok(here[1] <= below[1] - below[0].h + 1, `frame ${f}: entry ${i} overlaps the one below`);
    }
    pops.update();
  }
});

test('number popups: word art attaches 12 px above its number and rides its bounce', () => {
  const pops = new NumberPopups();
  const n = pops.spawn(100, 50, 42);
  const w = pops.word(100, 40, 'CRITICAL');
  assert.equal(w.attached, n); assert.equal(w.above, 12);
  let m = pops.layout();
  assert.equal(m.get(w), m.get(n) - 12, 'word bottom sits 12 px over the number bottom');
  for (let i = 0; i < 8; i++) pops.update();
  m = pops.layout();
  assert.ok(m.get(n) < 50, 'number is mid-bounce');
  assert.equal(m.get(w), m.get(n) - 12, 'the word moved with it');
  // A big crit number pushes its word further up (never into the 15 px digits).
  const big = pops.spawn(200, 50, 120, { kind: 'crit' });
  const bw = pops.word(200, 40, 'CRITICAL');
  assert.equal(bw.attached, big); assert.equal(bw.above, 16);
  // Two words on one target with no number (BREAK after a MISS) stack like numbers.
  const miss = pops.word(300, 50, 'MISS');
  const brk = pops.word(300, 50, 'BREAK');
  assert.equal(brk.attached, null); assert.equal(brk.stack, -10, 'BREAK sits above MISS');
  assert.equal(miss.stack, 0);
  // A later number stacks above a number+word unit.
  const n2 = pops.spawn(100, 50, 7);
  assert.equal(n.unitH, 23, 'number box + 1 px gap + 11 px word');
  assert.equal(n2.stack, -(n.unitH - 1), 'lands above the attached word (outline rows may share a pixel row)');
});

test('config rows cover the settings they edit and every choice value exists', () => {
  const fakeEngine = { touch: { visible: false } };
  for (const row of CONFIG_ROWS) {
    const help = helpFor(row, fakeEngine);
    const visible = help.replace(/\{i:[^}]+\}/g, 'XX');
    assert.ok(help && visible.length <= 52, `${row.key} help fits the bar (${visible.length})`);
    if (row.kind === 'action') { assert.equal(row.key, 'reset'); continue; }
    assert.ok(row.key in DEFAULT_SETTINGS, `${row.key} is a real setting`);
    if (row.kind === 'choice') {
      assert.equal(row.values.length, row.names.length);
      assert.ok(row.values.includes(DEFAULT_SETTINGS[row.key]), `${row.key} default is one of its values`);
    }
  }
  assert.ok(CONFIG_SETTING_KEYS.includes('textSpeed') && !CONFIG_SETTING_KEYS.includes('reset'));
  const ts = CONFIG_ROWS.find((r) => r.key === 'textSpeed');
  assert.equal(ts.names[ts.values.indexOf(4)], 'Instant', 'text speed offers Instant');
  const bs = CONFIG_ROWS.find((r) => r.key === 'battleSpeed'), ab = CONFIG_ROWS.find((r) => r.key === 'autoBattle');
  assert.match(helpFor(bs, fakeEngine), /In battle: \{i:btn_pageR\}/, 'battle speed help names its in-battle toggle');
  assert.match(helpFor(ab, fakeEngine), /In battle: \{i:btn_start\}/, 'auto battle help names its in-battle toggle');
  const touchEngine = { touch: { visible: true } };
  assert.ok(!/btn_/.test(helpFor(bs, touchEngine)) && !/btn_/.test(helpFor(ab, touchEngine)), 'no key glyphs on a touch layout');
});

test('touch row helpers: 15 px rows only while the touch controls show; List centers taller rows', () => {
  assert.equal(TOUCH_ROW_H, 15);
  assert.equal(rowHeightFor({ touch: { visible: true } }, 11), 15);
  assert.equal(rowHeightFor({ touch: { visible: true } }, 46), 46, 'big rows keep their height');
  assert.equal(rowHeightFor({ touch: { visible: false } }, 11), 11);
  assert.equal(rowHeightFor(null, 12), 12);
  assert.equal(rowsThatFit(138, 12), 11); assert.equal(rowsThatFit(138, 15), 9); assert.equal(rowsThatFit(5, 15), 1);
  assert.equal(new List({ rowH: 15 }).textDy, 1);
  assert.equal(new List({ rowH: 12 }).textDy, 0);
  assert.equal(new List({ rowH: 11 }).textDy, 0);
  // Phone profile: 384 x 216 at device scale 5 on a dpr 3 screen = 5/3 css px per game px.
  assert.ok(15 * (5 / 3) >= 24, 'touch rows are at least 24 css px on the phone profile');
  // Tap model: a tap selects, a second tap on the same row confirms; 'single' confirms at once.
  const items = [{ label: 'a' }, { label: 'b' }, { label: 'c' }];
  const mk = (tapMode) => new List({ x: 0, y: 0, w: 50, rows: 3, rowH: 15, items, tapMode });
  const tap = (list, y) => {
    const audio = fakeAudio();
    const press = fakeInput(); press.pointer = { type: 'touch', x: 10, y, pressed: true, down: true, released: false };
    list.update(press, audio);
    const rel = fakeInput(); rel.pointer = { type: 'touch', x: 10, y, pressed: false, down: false, released: true };
    return list.update(rel, audio);
  };
  const dbl = mk('double');
  assert.equal(tap(dbl, 20), null); assert.equal(dbl.index, 1, 'first tap selects row 1');
  assert.equal(tap(dbl, 20), 'confirm', 'second tap on the selected row confirms');
  assert.equal(tap(dbl, 44), null, 'one row of slop below the list still selects the last row');
  assert.equal(dbl.index, 2);
  const single = mk('single');
  assert.equal(tap(single, 35), 'confirm', 'single mode confirms on the first tap');
  assert.equal(single.index, 2);
});

test('dialog pages end on word boundaries even when the wrapper had to cut a word', () => {
  // Normal wrapping: every line ends with a whole word, so no page edge moves.
  const text = 'The chamber is a hollow in the heart. Pages drift through the air like slow snow.';
  const lines = ['The chamber is a hollow in the', 'heart. Pages drift through the', 'air like slow snow.'];
  assert.deepEqual(hardBreaks(text, lines), [false, false, false]);
  assert.deepEqual(paginate(lines, 3, { hard: hardBreaks(text, lines) }), [lines]);
  // A word the wrapper cut across lines 3 and 4: the page edge moves up so the halves share page 2.
  const cut = ['one two', 'three four', 'Supercalifragilisti', 'cexpialidocious end', 'tail'];
  const src = 'one two three four Supercalifragilisticexpialidocious end tail';
  assert.deepEqual(hardBreaks(src, cut), [false, false, true, false, false]);
  assert.deepEqual(paginate(cut, 3, { hard: hardBreaks(src, cut) }), [['one two', 'three four'], ['Supercalifragilisti', 'cexpialidocious end', 'tail']]);
  // Codes and {hero} do not confuse the alignment.
  const colored = 'Did you hear the {c:gold}Thirteenth Bell{/c} at midnight, {hero}?';
  const cl = ['Did you hear the {c:gold}Thirteenth{/c}', '{c:gold}Bell{/c} at midnight, {hero}?'];
  assert.deepEqual(hardBreaks(colored, cl), [false, false]);
  // Without flags paginate behaves as before.
  assert.deepEqual(paginate(cut, 3), [['one two', 'three four', 'Supercalifragilisti'], ['cexpialidocious end', 'tail']]);
});

test('no story word is wider than the dialog text column (so the wrapper never cuts one)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, '..', '..');
  const def = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'ui', 'font.json'), 'utf8'));
  const font = new BitmapFont(def, null, { id: 'main' });
  const files = [...fs.readdirSync(path.join(root, 'src', 'data', 'story')).map((f) => path.join('src', 'data', 'story', f)),
    'src/data/npcs.js', 'src/data/quests.js', 'src/data/text.js', 'src/data/items.js', 'src/data/skills.js'];
  const LIT = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;
  const PORTRAIT_W = 372 - 64 - 14;   // DIALOG_RECT.w minus the portrait column and padding
  let widest = { w: 0, word: '', file: '' }, strings = 0;
  for (const rel of files) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    let m;
    while ((m = LIT.exec(src))) {
      const s = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\{hero\}/g, 'Wilhelmina');
      if (s.length < 12 || !/\s/.test(s)) continue;
      strings++;
      for (const word of s.split(/\s+/)) {
        const w = font.measure(word);
        if (w > widest.w) widest = { w, word, file: rel };
      }
    }
  }
  assert.ok(strings > 300, `scanned ${strings} strings`);
  assert.ok(widest.w <= PORTRAIT_W, `widest word "${widest.word}" (${widest.w} px, ${widest.file}) exceeds ${PORTRAIT_W} px`);
});
