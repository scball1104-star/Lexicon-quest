import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BitmapFont, parseText, stripCodes, fallbackFontForMeasure, resolveColor } from '../../src/core/font.js';
import { FALLBACK_GLYPH_ROWS, buildFallbackFont } from '../../src/core/fallbackFont.js';

const f = fallbackFontForMeasure();

test('fallback font covers printable ASCII and the required symbols', () => {
  for (let c = 33; c <= 126; c++) assert.ok(FALLBACK_GLYPH_ROWS[String.fromCharCode(c)], `missing ${String.fromCharCode(c)}`);
  for (const ch of ['\u2665', '\u2605', '\u266a', '\u2026', '\u00d7', '\u2192', '\u2190', '\u2191', '\u2193']) assert.ok(FALLBACK_GLYPH_ROWS[ch], `missing U+${ch.charCodeAt(0).toString(16)}`);
  const { def, bitmap } = buildFallbackFont();
  assert.equal(def.lineHeight, 11);
  assert.equal(def.baseline, 8);
  for (const [ch, g] of Object.entries(def.glyphs)) {
    assert.equal(g.length, 7, ch);
    assert.ok(g[0] + g[2] <= bitmap.width && g[1] + g[3] <= bitmap.height, `glyph ${ch} inside the sheet`);
    const rows = FALLBACK_GLYPH_ROWS[ch].split('/');
    assert.ok(rows.length <= 9, `glyph ${ch} has at most 9 rows`);
  }
});

test('measure: ink width, kerning, spaces, newlines', () => {
  assert.equal(f.measure(''), 0);
  assert.equal(f.measure('A'), 5);
  assert.equal(f.measure('AB'), 11);
  assert.equal(f.measure('A A'), 14);
  assert.equal(f.measure('AT'), 10, 'AT is kerned by -1');
  assert.equal(f.measure('i'), 1);
  assert.equal(f.measure('AB\nA'), 11, 'widest line');
  assert.deepEqual(f.measureBlock('a\nb\nc'), { width: 5, height: 33, lines: 3 });
});

test('color codes are ignored by measure and length', () => {
  assert.equal(f.measure('{c:gold}AB{/c}'), f.measure('AB'));
  assert.equal(f.length('{c:gold}Hello{/c}\nWorld'), 10);
  assert.equal(stripCodes('a {c:red}b{/c} {i:potion}c'), 'a b c');
  assert.equal(f.length('{i:potion}x'), 2, 'an icon counts as one character');
  assert.equal(f.measure('{hero}'), f.measure('{hero}'.split('').join('')), 'unknown braces are literal text');
  assert.equal(resolveColor('gold'), '#f9d77a');
  assert.equal(resolveColor('rare'), '#ffd34d');
  assert.equal(resolveColor('#123456'), '#123456');
});

test('parseText tokens', () => {
  const t = parseText('A{c:gold}B{/c}\n{i:key}');
  assert.deepEqual(t.map((x) => x.k), ['ch', 'open', 'ch', 'close', 'nl', 'icon']);
  assert.equal(t[1].color, 'gold');
  assert.equal(t[5].id, 'key');
});

test('wrap keeps every line within maxWidth and preserves words', () => {
  const text = 'Elder Mael asked you to visit the Rootbound Archive north of the valley and recover the first fragment.';
  for (const w of [60, 100, 150, 220]) {
    const lines = f.wrap(text, w);
    for (const l of lines) assert.ok(f.measure(l) <= w, `"${l}" (${f.measure(l)}) > ${w}`);
    assert.equal(lines.join(' '), text);
  }
});

test('wrap honours explicit newlines and blank lines', () => {
  assert.deepEqual(f.wrap('one\ntwo', 200), ['one', 'two']);
  assert.deepEqual(f.wrap('one\n\nthree', 200), ['one', '', 'three']);
});

test('wrap hard-breaks words longer than a line', () => {
  const lines = f.wrap('Supercalifragilisticexpialidocious', 40);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(f.measure(l) <= 40);
  assert.equal(lines.join(''), 'Supercalifragilisticexpialidocious');
});

test('wrap keeps color codes balanced on every line', () => {
  const lines = f.wrap('Find the {c:gold}Lantern of Recall deep in the Reading Galleries{/c} today.', 70);
  assert.ok(lines.length >= 3);
  for (const l of lines) {
    const opens = (l.match(/\{c:/g) || []).length, closes = (l.match(/\{\/c\}/g) || []).length;
    assert.equal(opens, closes, `unbalanced: ${l}`);
  }
  assert.equal(stripCodes(lines.join(' ')), 'Find the Lantern of Recall deep in the Reading Galleries today.');
  // The colored words stay gold after the break.
  assert.ok(lines[1].startsWith('{c:gold}'));
});

test('real UI font JSON (if present) measures and wraps', (t) => {
  const p = new URL('../../assets/ui/font.json', import.meta.url);
  if (!fs.existsSync(p)) { t.skip('assets/ui/font.json not built yet'); return; }
  const def = JSON.parse(fs.readFileSync(p, 'utf8'));
  const real = new BitmapFont(def, null, { fallback: f });
  assert.ok(real.measure('Hello') > 0);
  const lines = real.wrap('The Thirteenth Bell rang at night, though the tower holds twelve.', 120);
  for (const l of lines) assert.ok(real.measure(l) <= 120);
  // Characters the real font lacks fall back to the embedded font instead of vanishing.
  assert.ok(real.measure('\u2665') > 0);
});
