// House rules for every W1-content file: no em dashes, names never used as a puzzle, player text the bitmap
// font can draw, and (when the real font exists) every wrapped line fits the dialogue window in pixels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, lines, PROLOGUE } from '../../src/data/story/ep1.js';
import { NPCS } from '../../src/data/npcs.js';
import { MAIN_QUEST, SIDE_QUESTS, BANTER } from '../../src/data/quests.js';
import * as TEXT from '../../src/data/text.js';
import { wrap, stripCodes, fill, BOX_COLS, HERO_NAME_MAX } from '../../src/data/story/dialogue.js';
import { NEXT, listFiles, read, explore } from './_harness.mjs';

const OWNED = [
  ...listFiles(join(NEXT, 'src', 'data', 'story')),
  join(NEXT, 'src', 'data', 'npcs.js'), join(NEXT, 'src', 'data', 'quests.js'), join(NEXT, 'src', 'data', 'text.js'),
  ...(existsSync(join(NEXT, 'docs', 'story')) ? listFiles(join(NEXT, 'docs', 'story')) : []),
  ...listFiles(join(NEXT, 'qa', 'content'), (p) => /\.(mjs|js|md|json)$/.test(p)),
];

// Every player-facing string, gathered from every source.
async function playerText() {
  const out = [];
  const add = (where, v) => {
    if (v == null) return;
    if (typeof v === 'string') { out.push([where, v]); return; }
    if (Array.isArray(v)) { v.forEach((x) => add(where, x)); return; }
    if (typeof v === 'object') {
      if ('text' in v) add(where, v.text);
      if ('lines' in v) add(where, v.lines);
      if ('pages' in v) add(where, v.pages);
      if ('lore' in v) add(where, v.lore);
      if ('journal' in v) add(where, v.journal);
      if ('title' in v && typeof v.title === 'string') add(where, v.title);
      if ('sub' in v) add(where, v.sub);
      if ('heading' in v) add(where, v.heading);
      if ('name' in v && typeof v.name === 'string') add(where, v.name);
    }
  };
  for (const [id, fn] of Object.entries(scenes)) {
    for (const r of await explore(fn)) for (const e of r.log) {
      if (e.op === 'say' || e.op === 'title') add(`scene ${id}`, e.args[e.op === 'say' ? 1 : 0]);
      if (e.op === 'title' && e.args[1]?.sub) add(`scene ${id}`, e.args[1].sub);
      if (e.op === 'choice') add(`scene ${id}`, e.args[0]);
    }
  }
  add('prologue', PROLOGUE);
  for (const [id, v] of Object.entries(lines)) add(`lines.${id}`, v);
  for (const [id, n] of Object.entries(NPCS)) { add(`npc ${id}`, n.name); for (const e of n.talk) add(`npc ${id}`, e.lines); }
  for (const st of MAIN_QUEST.steps) { add(`quest ${st.id}`, st.journal); add(`quest ${st.id}`, st.title); add(`quest ${st.id}`, st.chat); }
  for (const q of SIDE_QUESTS) { add(`side ${q.id}`, q.title); for (const st of q.steps) { add(`side ${q.id}`, st.journal); add(`side ${q.id}`, st.chat); } }
  for (const [map, list] of Object.entries(BANTER)) add(`banter ${map}`, list);
  for (const [k, v] of Object.entries(TEXT)) if (k !== 'default') {
    if (k === 'HELP') { for (const g of Object.values(v)) add('HELP', Object.values(g)); continue; }
    if (k === 'GAMEOVER') { add('GAMEOVER', Object.values(v)); continue; }
    if (k === 'BARKS') { for (const list of Object.values(v)) add('BARKS', list); continue; }
    add(k, Array.isArray(v) ? v : Object.values(v));
  }
  return out;
}

test('no em dashes anywhere in W1-content files', () => {
  const EM = String.fromCharCode(0x2014);
  const BAR = String.fromCharCode(0x2015);
  for (const p of OWNED) {
    const t = read(p);
    assert.ok(!t.includes(EM) && !t.includes(BAR), `em dash in ${p}`);
  }
});

test('names are story, never a puzzle: banned mechanics appear nowhere', () => {
  // Built from pieces so this file does not trip its own check.
  const banned = [
    ['cross', 'word'], ['ana', 'gram'], ['word', ' puzzle'], ['word', '-puzzle'], ['letter', ' puzzle'],
    ['guess the', ' word'], ['un', 'scramble'], ['fill in the', ' blank'], ['spell the', ' word'], ['word', ' search'],
  ].map(([a, b]) => new RegExp(a + b, 'i'));
  for (const p of OWNED) {
    const t = read(p);
    for (const re of banned) assert.ok(!re.test(t), `${p} mentions ${re.source}`);
  }
});

test('player text is printable ASCII the bitmap font can draw', async () => {
  for (const [where, s] of await playerText()) {
    for (const ch of s) {
      const c = ch.codePointAt(0);
      assert.ok(c >= 0x20 && c <= 0x7e, `${where}: character U+${c.toString(16)} in "${s}"`);
    }
  }
});

test('with the real font, every wrapped line fits the dialogue text area in pixels', async (t) => {
  const fontPath = join(NEXT, 'assets', 'ui', 'font.json');
  if (!existsSync(fontPath)) { t.skip('assets/ui/font.json not built yet'); return; }
  const font = JSON.parse(readFileSync(fontPath, 'utf8'));
  const adv = (c) => (c === ' ' ? font.spaceAdvance : font.glyphs[c] ? font.glyphs[c][6] : 6);
  const width = (s) => [...s].reduce((a, c, i) => a + adv(c) + ((font.kerning || {})[(s[i - 1] || '') + c] || 0), 0);
  // 384 px screen, 8 px window margins, 8 px padding, 48 px portrait + 8 px gap: 296 px of text.
  const TEXT_AREA = 384 - 16 - 16 - 56;
  const hero = 'W'.repeat(HERO_NAME_MAX); // widest possible name
  const bad = [];
  for (const [where, s] of await playerText()) {
    for (const line of wrap(stripCodes(fill(s, { hero })), BOX_COLS)) {
      if (width(line) > TEXT_AREA) bad.push(`${where}: ${line} (${width(line)} px)`);
    }
  }
  assert.deepEqual(bad, []);
});
