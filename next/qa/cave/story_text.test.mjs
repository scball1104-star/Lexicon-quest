// C2-story-ui: the words (src/data/cave/text.js): the eleven plaques, the strings world.js shows, Hollis's lines, the title
// rows and the plaque screen's labels. Pure checks (node); the doc is held to the lines it quotes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAQUES, PLAQUE_IDS, STACKS_TEXT, LINES, HOLLIS, TITLE_ROWS, STACKS_HELP, BAND_NAMES, countNames, fillLine } from '../../src/data/cave/text.js';
import { fits, boxLines, CHOICE_COLS } from '../../src/data/story/dialogue.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const EM_DASH = String.fromCharCode(0x2014);
const WIDEST = { n: 'Seventeen names', floor: 100, vault: 17, total: 17, name: 'WWWWWWWW' };
const plain = (where, s) => {
  assert.equal(typeof s, 'string', where);
  assert.ok(/^[ -~\n]*$/.test(s), `${where}: printable ASCII only (the bitmap font): ${s}`);
  assert.ok(!s.includes(EM_DASH), `${where}: no em dash`);
};

test('the eleven plaques: one box each, the gold line names the landing, the Stacks speak for themselves (no sermon)', () => {
  assert.deepEqual(Object.keys(PLAQUES), PLAQUE_IDS);
  assert.equal(PLAQUE_IDS.length, 11, 'plaque_hall, plaque_b10 .. plaque_b90, and the B100 approach text');
  assert.deepEqual(PLAQUE_IDS, ['plaque_hall', 'plaque_b10', 'plaque_b20', 'plaque_b30', 'plaque_b40', 'plaque_b50', 'plaque_b60', 'plaque_b70', 'plaque_b80', 'plaque_b90', 'plaque_b100']);
  for (const [id, s] of Object.entries(PLAQUES)) {
    plain(id, s);
    assert.ok(fits(s), `${id}: ${boxLines(s).join(' / ')}`);
    assert.ok(boxLines(s).length >= 2, `${id}: a name line and a truth`);
    const m = /^\{c:gold\}([^{]+)\{\/c\}\n/.exec(s);
    assert.ok(m, `${id}: starts with the gold name line`);
    if (id !== 'plaque_hall') assert.ok(m[1].startsWith(`B${id.slice('plaque_b'.length)}. `), `${id}: the name line opens with the floor`);
    assert.doesNotMatch(s, /\byou must\b|\bshould\b|\bremember that\b/i, `${id}: no sermon`);
  }
});

test('the strings world.js reads: every key, ASCII, fits a box, the placeholders', () => {
  const keys = ['close', 'bank', 'quit_ask', 'quit_yes', 'quit_no', 'bank_ask', 'bank_yes', 'bank_no', 'save_refused', 'floor_tag', 'bookmark_outside', 'stair_wait', 'rise'];
  assert.deepEqual(Object.keys(STACKS_TEXT).sort(), keys.sort());
  for (const [k, s] of Object.entries(STACKS_TEXT)) { plain(`STACKS_TEXT.${k}`, s); assert.ok(fits(fillLine(s, WIDEST)), k); }
  assert.equal(STACKS_TEXT.floor_tag, 'B{n}');
  assert.match(STACKS_TEXT.rise, /\{name\}/);
  for (const k of ['quit_yes', 'quit_no', 'bank_yes', 'bank_no']) assert.ok(STACKS_TEXT[k].length <= CHOICE_COLS, k);
  assert.equal(STACKS_TEXT.close, 'The Stacks close.');
  assert.equal(STACKS_TEXT.save_refused, 'The Stacks keep their own pages.');
  assert.equal(STACKS_TEXT.bank_ask, 'Close the book here?');
});

test('Hollis: every line fits with the widest fill, the choice labels fit, the voice rules hold (no "responsibility", no explaining)', () => {
  assert.equal(HOLLIS.name, 'Hollis'); assert.equal(HOLLIS.sprite, 'npc_scholar'); assert.equal(HOLLIS.map, 'cave_landing0');
  assert.ok(!HOLLIS.portrait, 'no portrait');
  assert.deepEqual(HOLLIS.talk.map((t) => t.scene), ['stacks_intro', 'stacks_enter']);
  const src = read('src/data/cave/text.js');
  assert.doesNotMatch(src, /responsib/i, 'the word is never in the file');
  assert.ok(!src.includes(EM_DASH), 'no em dash in the file');
  for (const [k, s] of Object.entries(LINES)) {
    plain(`LINES.${k}`, s);
    if (/^(offer|confirm)_(yes|no|record)$/.test(k)) { assert.ok(s.length <= CHOICE_COLS, k); continue; }
    if (k === 'binder_card') continue;
    assert.ok(fits(fillLine(s, WIDEST)), `${k}: ${boxLines(fillLine(s, WIDEST)).join(' / ')}`);
    assert.doesNotMatch(s, /erased|forgetting spell|magic|list-writer|Eraser|First Keeper|curse/i, `${k}: explains the forgetting`);
  }
  // the three rules say the three things (level 1 and empty hands; red lends, blue gives; the Bookmark is the way out)
  assert.match(LINES.rule_1, /level one, empty hands/);
  assert.match(LINES.rule_2, /red chest lends/i); assert.match(LINES.rule_2, /blue chest gives/i);
  assert.match(LINES.rule_3, /Bookmark/);
  assert.equal(LINES.offer, 'Begin a reading?');
  assert.equal(LINES.die, 'The Stacks close. You woke here.');
  assert.match(LINES.binder_sub, /^Keeper of the Spine\. Nobody /, 'the card names what was avoided');
  assert.equal(fillLine(LINES.bank_kept, { n: countNames(3) }), 'Three names kept. The Stacks noticed.');
});

test('the title rows, the help bar and the band names; countNames and fillLine', () => {
  assert.equal(TITLE_ROWS.resume, 'Resume the Deep Stacks (B{n})');
  for (const [k, s] of Object.entries(TITLE_ROWS)) plain(`TITLE_ROWS.${k}`, s);
  assert.ok(fillLine(TITLE_ROWS.resume, { n: 100 }).length <= 32, 'the row fits the title window');
  assert.match(STACKS_HELP.screen, /\{i:btn_cancel\}/, 'the help names the back button by glyph (device-aware)');
  for (const k of ['screen', 'title', 'vault', 'unfound']) plain(`STACKS_HELP.${k}`, STACKS_HELP[k]);
  assert.deepEqual(Object.keys(BAND_NAMES).map(Number).sort(), [0, 1, 2, 3, 4, 5]);
  for (const s of Object.values(BAND_NAMES)) { plain('BAND_NAMES', s); assert.ok(s.length <= 32, s); }
  assert.equal(countNames(1), 'One name'); assert.equal(countNames(3), 'Three names'); assert.equal(countNames(17), 'Seventeen names'); assert.equal(countNames(20), '20 names'); assert.equal(countNames(0), 'No names');
  assert.equal(fillLine('B{floor}, {vault} of {total}', { floor: 23, vault: 4, total: 17 }), 'B23, 4 of 17');
  assert.equal(fillLine('{n} kept', {}), '{n} kept', 'an unfilled placeholder stays visible (never silently blank)');
});

test('docs/story/DEEP_STACKS.md quotes every line and every plaque, names every scene, no em dash', () => {
  const doc = read('docs/story/DEEP_STACKS.md');
  assert.ok(!doc.includes(EM_DASH), 'no em dash in the doc');
  for (const id of ['stacks_locked', 'stacks_talk', 'stacks_intro', 'stacks_enter', 'stacks_vault', 'stacks_return', 'stacks_record', 'stacks_no_save', 'binder_intro', 'binder_cleared']) assert.ok(doc.includes(`\`${id}\``), `doc names ${id}`);
  for (const [id, s] of Object.entries(PLAQUES)) { assert.ok(doc.includes(id), id); assert.ok(doc.includes(s.split('\n')[1]), `doc quotes ${id}`); }
  for (const [k, s] of Object.entries(LINES)) assert.ok(doc.includes(s), `doc quotes LINES.${k}`);
  for (const [k, s] of Object.entries(STACKS_TEXT)) assert.ok(doc.includes(s), `doc quotes STACKS_TEXT.${k}`);
});
