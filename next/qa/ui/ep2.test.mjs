// Episode 2 UI (E2-scene-ui): the title's Episode 2 entry (when it shows, which name it suggests), the Episode 2
// credits, and the journal / bestiary pages holding Episode 2 content without running out of their windows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ep2Offer } from '../../src/scenes/title.js';
import { fitLine, statLine, STAT_W } from '../../src/ui/screens/journal.js';
import { BitmapFont } from '../../src/core/font.js';
import { CREDITS_EP2, BESTIARY } from '../../src/data/text.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { journal } from '../../src/data/quests.js';
import { EP1_DONE_FLAGS } from '../../src/game/state.js';

const ELLIPSIS = String.fromCharCode(0x2026);
const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const font = (f) => new BitmapFont(JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'ui', f), 'utf8')), null, { id: f });
const main = font('font.json'), large = font('font_large.json');
const R = { measure: (s, f) => (f === 'large' ? large : main).measure(s), wrap: (s, w, f) => (f === 'large' ? large : main).wrap(s, w) };

function fakeSave(slots) {
  return { slots: 3, loadEnvelope: (n) => slots[n] || null };
}
const env = (name, at, flags) => ({ savedAt: at, meta: { name }, data: { heroName: name, flags } });

test('title: Episode 2 is offered only after Episode 1 (any slot, autosave included) or with ?ep=2', () => {
  assert.equal(ep2Offer(fakeSave({}), '').show, false, 'a fresh browser sees no Episode 2');
  assert.equal(ep2Offer(fakeSave({ 1: env('Arden', '2026-10-20T10:00:00Z', { intro_done: true }) }), '').show, false, 'an unfinished save does not unlock it');
  const url = ep2Offer(fakeSave({}), '?debug=1&ep=2');
  assert.equal(url.show, true); assert.equal(url.name, null);
  assert.equal(ep2Offer(fakeSave({}), '?ep=1').show, false);
  const auto = ep2Offer(fakeSave({ 0: env('Sol', '2026-10-19T10:00:00Z', { ep1_complete: true }) }), '');
  assert.deepEqual([auto.show, auto.name, auto.slot], [true, 'Sol', 0], 'the autosave counts');
  const two = ep2Offer(fakeSave({ 1: env('Old', '2026-10-01T10:00:00Z', { ep1_complete: true }), 3: env('Newer', '2026-10-20T09:00:00Z', { ep1_complete: true }) }), '');
  assert.equal(two.name, 'Newer', 'the newest finished save names the hero');
  const broken = { slots: 3, loadEnvelope: (n) => { if (n === 2) throw new Error('corrupt'); return null; } };
  assert.equal(ep2Offer(broken, '').show, false, 'a corrupt slot never breaks the title');
});

test('credits: every Episode 2 card fits the screen (headings in the large font, lines in the body font)', () => {
  assert.ok(CREDITS_EP2.length >= 5);
  for (const c of CREDITS_EP2) {
    if (c.heading) assert.ok(large.measure(c.heading) <= 384 - 16, `heading "${c.heading}"`);
    for (const l of c.lines) assert.ok(main.measure(l.replace('{hero}', 'Wwwwwwww')) <= 384 - 16, `line "${l}"`);
  }
  assert.match(CREDITS_EP2[0].lines[0], /Episode 2/);
});

test('bestiary: every entry (Episode 1 and 2) fits its detail panel left of the picture box', () => {
  const COL = 116;                      // text column: x 166 to the picture box at 284 (journal.js PIC), 2 px air
  for (const [id, b] of Object.entries(BESTIARY)) {
    const d = ENEMIES[id];
    assert.ok(d, `${id} is an enemy`);
    const nameFits = large.measure(b.name) <= 112 || main.measure(b.name) <= COL;
    assert.ok(nameFits, `${id}: name "${b.name}"`);
    const where = fitLine(R, b.where, COL);
    assert.ok(main.measure(where) <= COL, `${id}: where "${where}"`);
    assert.ok(!where.includes(ELLIPSIS) || main.measure(b.where.replace(/^The /, '')) > COL, `${id}: only ellipsized when it must be`);
    assert.ok(34 + d.weak.length * 15 <= COL + 2, `${id}: ${d.weak.length} weakness icons fit`);
    if (d.resist && d.resist.length) assert.ok(main.measure('Resists:') + 4 + d.resist.length * 14 <= COL + 2, `${id}: resist icons fit`);
    assert.ok(main.measure(statLine(R, d.level, d.hp, d.shields)) <= STAT_W, `${id}: stat line clear of the picture box`);
    assert.ok(Array.isArray(b.lore) && b.lore.length >= 1, `${id}: lore`);
  }
  for (const id of ['mist_wolf', 'glassback', 'refl_hero', 'refl_mira', 'refl_bram', 'nameless_king', 'false_sorrow', 'false_pride']) assert.ok(BESTIARY[id], `Episode 2 entry ${id}`);
  assert.equal(fitLine(R, 'The Silverglass Antechamber', COL), 'Silverglass Antechamber');
});

test('journal: every Episode 2 main step fits its line; the text wraps inside the window', () => {
  const ep2 = ['ep2_started', 'crossing_done', 'east_road_arrived', 'nh_arrived', 'met_elian', 'heard_crisis', 'court_ferry_open', 'court_entered',
    'court_f1_done', 'other_selves_defeated', 'court_f2_done', 'vow_door_open', 'nameless_king_defeated', 'aurel_named', 'nh_restored', 'ep2_complete'];
  const flags = new Set(EP1_DONE_FLAGS);
  const titles = new Set();
  for (const f of ep2) {
    flags.add(f);
    const j = journal((x) => flags.has(x));
    titles.add(j.main.step);
    assert.ok(large.measure(j.main.title) <= 376 - 27, `title "${j.main.title}"`);
    assert.ok(main.measure(j.main.step) <= 356, `step "${j.main.step}"`);
    for (const line of main.wrap(j.main.text.replace(/\{hero\}/g, 'Wwwwwwww'), 356)) assert.ok(main.measure(line) <= 356);
    for (const q of j.side) {
      assert.ok(main.measure(q.title) + (q.counter ? main.measure(`${q.counter.label} ${q.counter.max}/${q.counter.max}`) + 8 : 0) <= 356, `errand "${q.title}"`);
    }
  }
  assert.ok(titles.size >= 6, `the main step moves through Episode 2 (${[...titles].join(', ')})`);
});
