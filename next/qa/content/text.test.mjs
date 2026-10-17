// data/text.js: bestiary for every enemy, banners for every map, books, help lines, barks, credits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BESTIARY, BOOKS, BANNERS, HELP, BARKS, GAMEOVER, CREDITS } from '../../src/data/text.js';
import { FLAGS } from '../../src/data/quests.js';
import { fits, boxLines } from '../../src/data/story/dialogue.js';
import { MAP_IDS } from './_harness.mjs';

let ENEMIES = null;
try { ({ ENEMIES } = await import('../../src/data/enemies.js')); } catch { ENEMIES = null; }

const ENEMY_IDS = ['ink_slime', 'page_wraith', 'briar_wolf', 'moss_scarab', 'bookmite', 'tome_golem', 'ink_wraith',
  'echo_warden', 'lost_page', 'archivore'];

const boxes = (where, arr) => {
  assert.ok(Array.isArray(arr) && arr.length, `${where}: empty`);
  for (const b of arr) assert.ok(fits(b), `${where}: ${boxLines(b).join(' / ')}`);
};

test('bestiary covers every COMMON.md enemy and agrees with enemies.js', () => {
  assert.deepEqual(Object.keys(BESTIARY).sort(), [...ENEMY_IDS].sort());
  for (const [id, e] of Object.entries(BESTIARY)) {
    assert.ok(e.name && e.where, `${id}: name/where`);
    boxes(`bestiary.${id}`, e.lore);
    if (ENEMIES && ENEMIES[id]) {
      assert.equal(e.name, ENEMIES[id].name, `${id}: name differs from enemies.js`);
      if (ENEMIES[id].flavor) assert.equal(e.lore[0], ENEMIES[id].flavor, `${id}: first lore box should be the enemies.js flavor`);
    }
  }
});

test('every map has a location banner', () => {
  assert.deepEqual(Object.keys(BANNERS).sort(), [...MAP_IDS].sort());
  for (const [id, b] of Object.entries(BANNERS)) {
    assert.ok(b.title && b.title.length <= 28, `${id}: banner title`);
    if (b.sub) assert.ok(b.sub.length <= 32, `${id}: banner sub`);
  }
});

test('books have titles and pages that fit', () => {
  for (const [id, b] of Object.entries(BOOKS)) {
    assert.ok(b.title && b.title.length <= 42, `${id}: title`);
    assert.ok(MAP_IDS.includes(b.where), `${id}: where`);
    boxes(`book.${id}`, b.pages);
  }
  // The library carries real lore and the Archive tells the Keeper's story on every floor.
  for (const floor of ['archive_f1', 'archive_f2', 'archive_f3'])
    assert.ok(Object.values(BOOKS).some((b) => b.where === floor), `no book on ${floor}`);
  assert.ok(Object.values(BOOKS).filter((b) => b.where === 'library').length >= 5);
});

test('help lines are one short line each', () => {
  for (const [group, entries] of Object.entries(HELP))
    for (const [k, v] of Object.entries(entries)) assert.ok(typeof v === 'string' && v.length <= 40, `${group}.${k}: ${v}`);
});

test('barks: declared flags, companion speakers, fitting lines', () => {
  for (const [ev, list] of Object.entries(BARKS)) {
    for (const e of list) {
      for (const f of [e.if, e.ifNot].flat().filter(Boolean)) assert.ok(f in FLAGS, `${ev}: ${f}`);
      for (const l of e.lines) {
        assert.ok(['mira', 'bram'].includes(l.who), `${ev}: speaker ${l.who}`);
        assert.ok(fits(l.text), `${ev}: ${l.text}`);
        const needs = l.who === 'mira' ? ['mira_joined', 'bram_joined'] : ['bram_joined'];
        assert.ok([e.if].flat().some((f) => needs.includes(f)), `${ev}: ${l.who} may not have joined`);
      }
    }
  }
});

test('game over and credits', () => {
  for (const v of Object.values(GAMEOVER)) assert.ok(fits(v));
  assert.ok(CREDITS.length >= 8);
  assert.ok(CREDITS.some((c) => c.lines.includes('Scott Ball')));
  for (const c of CREDITS) {
    assert.ok(typeof c.heading === 'string' && c.heading.length <= 30, `heading ${c.heading}`);
    assert.ok(c.lines.length >= 1 && c.lines.length <= 6, `card ${c.heading}`);
    for (const l of c.lines) assert.ok(l.length <= 42, `credit line ${l}`);
  }
});
