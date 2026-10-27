// H3-vows: the strings, the menu and Journal line, and the rest flow's shape (docs/VOWS.md). Pure checks (node).
// The browser half (the real rest flow on both device profiles, the press count, the menu and Journal rendering, a
// kept-vow run through three Archive fights) is qa/ui/h3_vows_headless.py; the pictures are the ui_vow_* shots.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOW_TEXT, HELP } from '../../src/data/text.js';
import { VOWS } from '../../src/data/vows.js';
import { takeVow, vowEvent, vowLine, vowStatus } from '../../src/game/vows.js';
import { createGame, addMember } from '../../src/game/state.js';
import { fits, CHOICE_COLS } from '../../src/data/story/dialogue.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const EM_DASH = String.fromCharCode(0x2014);

test('the strings: every VOW_TEXT entry is ASCII, no em dash, the window labels fit a choice row, the boxes fit', () => {
  for (const [k, s] of Object.entries(VOW_TEXT)) {
    assert.equal(typeof s, 'string', k);
    assert.ok(/^[\x20-\x7e]*$/.test(s), `VOW_TEXT.${k}: printable ASCII only (the bitmap font): ${s}`);
    assert.ok(!s.includes(EM_DASH), `VOW_TEXT.${k}: no em dash`);
  }
  for (const k of ['none', 'take', 'back']) assert.ok(VOW_TEXT[k].length <= CHOICE_COLS, `${k} fits a choice option`);
  assert.equal(VOW_TEXT.none, 'No vow');
  assert.ok(fits(VOW_TEXT.offer) && fits(VOW_TEXT.capped));
  for (const v of VOWS) assert.ok(fits(VOW_TEXT.kept.replace('{name}', v.name) + '\n' + VOW_TEXT.paid.replace('{member}', 'WWWWWWWW').replace('{weapon}', 'spear').replace('{n}', '12')), `${v.id}: kept box with the widest name`);
  assert.ok(Object.keys(HELP.menu).length > 0, 'HELP is untouched and importable');
});

test('the menu and Journal line: "Vow: <name>" while carried, "Vow ended" after a break, nothing otherwise', () => {
  const g = createGame('Arden'); addMember(g, 'mira'); addMember(g, 'bram');
  assert.equal(vowLine(g), null); assert.equal(vowStatus(g), null);
  for (const v of VOWS) {
    g.vow = null;
    takeVow(g, v.id);
    assert.equal(vowLine(g), `Vow: ${v.name}`);
    assert.ok(vowLine(g).length <= 22, `${v.id}: the line is short enough for the info box (${vowLine(g).length})`);
    vowEvent(g, { type: v.breaksOn[0], item: 'potion', member: 'mira' });
    assert.equal(vowLine(g), 'Vow ended');
    assert.deepEqual(vowStatus(g), { name: v.name, active: false });
  }
});

test('the screens read vowStatus / vowLine and nothing else about vows; the rows are the ones the brief names', () => {
  const menu = read('src/scenes/menu.js');
  assert.ok(menu.includes("import { vowStatus } from '../game/vows.js';"));
  assert.ok(/const vow = vowStatus\(g\);/.test(menu), 'drawInfo reads the status once');
  assert.ok(/if \(vow\) vowRow\(0\); else row\(0, 'Time', fmtTime\(g\.playtime\)\);/.test(menu), 'touch: the vow takes the Time row');
  assert.ok(/if \(!vow\) lines\.push\(\['Chapter', roman\(g\.chapter \|\| 1\)\]\);/.test(menu), 'desktop: the vow takes the Chapter row');
  const journal = read('src/ui/screens/journal.js');
  assert.ok(journal.includes("import { vowLine } from '../../game/vows.js';"));
  assert.ok(/const vow = vowLine\(g\);\r?\n\s*if \(vow && seen\(y\)\) r\.text\(vow, 370, y \+ 2, \{ align: 'right'/.test(journal), 'Quests header: right of the quest title');
  // H6 (CRITIQUE_ARC 25): the Aim line carries the vow, read through activeVow
  const field = read('src/scenes/field.js');
  assert.ok(/const vow = activeVow\(this\.game\);/.test(field) && /\(vow \? ` - Vow: \$\{vow\.name\}` : ''\)/.test(field), 'the Aim line carries " - Vow: name"');
});

test('the rest flow: one window, "No vow" first and the cancel option, a chosen vow asks once, nothing else added', () => {
  const ev = read('src/world/events.js');
  const flow = ev.slice(ev.indexOf('export async function restFlow'), ev.indexOf('export async function turnMirror'));
  // the order of prompts in restFlow itself
  const order = ['Rest here?', 'HP{/c} and {c:blue}MP{/c} restored', 'await vowRow(field);', 'HELP.save.prompt'].map((s) => flow.indexOf(s));
  assert.ok(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), `rest, heal, vow row, save: ${order}`);
  // the vow row: a kept vow pays first, a broken one speaks, "No vow" is first and the cancel option, the confirm asks once
  const row = flow.slice(flow.indexOf('async function vowRow'));
  const iSettle = row.indexOf('settleVow(g)'), iOffer = row.indexOf('VOW_TEXT.offer'), iConfirm = row.indexOf('VOW_TEXT.take');
  assert.ok(iSettle > 0 && iOffer > iSettle && iConfirm > iOffer, 'settle, then offer, then the one confirm');
  assert.ok(row.includes("choices: [VOW_TEXT.none, ...offered.map((v) => v.name)], cancel: 0"), '"No vow" first, and cancel lands on it');
  assert.ok(row.includes('choices: [VOW_TEXT.take, VOW_TEXT.back], cancel: 1'), 'the confirm box asks once; cancel is "Not this one"');
  assert.equal((row.match(/field\.dialog\(/g) || []).length, 2, 'exactly two dialogs: the list and the confirm');
  assert.ok(row.includes("if (!pick || field.dead) return;"), '"No vow" (index 0) leaves the flow at once');
  assert.ok(!/engine\.save|slot|localStorage/.test(row), 'the vow row never saves on its own');
});
