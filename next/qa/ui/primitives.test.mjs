import test from 'node:test';
import assert from 'node:assert/strict';
import { List } from '../../src/ui/list.js';
import { fillHero, fmtGold, fmtTime, paginate, charsPerFrame, voiceFor, roman } from '../../src/ui/text.js';
import { schemeColors, SCHEMES, currentScheme } from '../../src/ui/window.js';
import { portraitFor } from '../../src/ui/dialog.js';
import { NumberPopups } from '../../src/ui/numberPopup.js';
import { cleanName } from '../../src/game/state.js';
import { ROWS as CONFIG_ROWS } from '../../src/scenes/config.js';
import { DEFAULT_SETTINGS } from '../../src/core/save.js';

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

test('number popups bounce and expire; same-spot hits stagger', () => {
  const pops = new NumberPopups();
  const a = pops.spawn(100, 50, 37);
  const b = pops.spawn(100, 50, 12);
  const c = pops.spawn(100, 50, 5, { kind: 'crit' });
  assert.equal(a.x, 100); assert.notEqual(b.x, a.x); assert.notEqual(c.x, b.x);
  assert.equal(c.font, 'num_big');
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

test('config rows cover the settings they edit and every choice value exists', () => {
  for (const row of CONFIG_ROWS) {
    assert.ok(row.key in DEFAULT_SETTINGS, `${row.key} is a real setting`);
    assert.ok(row.help && row.help.length <= 48, `${row.key} help fits the bar`);
    if (row.kind === 'choice') {
      assert.equal(row.values.length, row.names.length);
      assert.ok(row.values.includes(DEFAULT_SETTINGS[row.key]), `${row.key} default is one of its values`);
    }
  }
});
