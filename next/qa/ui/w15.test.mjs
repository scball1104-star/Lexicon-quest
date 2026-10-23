// W15 (PLAYTEST_REVIEW_4 section 4): the node half of the fixes. The save guard's question, the button glyphs after
// the real boot order on a touch device, one-tap choices, the Episode 2 ending's words, arrival scenes and the
// Court F3 power. The browser repro of the save trap is qa/integrate/w15_save_trap.py (run by qa/world/walks.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { autosaveGuard, freeRecord, EP2_ROW_LABEL, ep2Offer } from '../../src/scenes/title.js';
import { createSave } from '../../src/core/save.js';
import { Engine } from '../../src/core/engine.js';
import { createFonts } from '../../src/core/font.js';
import { normalizeAtlas } from '../../src/core/assets.js';
import { bindGlyphs, glyphNameFor, wordCap, ABILITY_WORDS } from '../../src/ui/glyphs.js';
import { ChoiceBox } from '../../src/ui/choice.js';
import { createGame, newGameEp2, serialize, saveMeta, EP1_DONE_FLAGS, setPosition } from '../../src/game/state.js';
import { partyChat, journal, MAIN_QUEST_EP2 } from '../../src/data/quests.js';
import { END_CARD_EP2, BARKS } from '../../src/data/text.js';
import { CREDITS_HANDOFF, sceneAllowed } from '../../src/game/story.js';
import { ENCOUNTERS, ZONES, C3_POWER, rollEncounter } from '../../src/data/encounters.js';
import { createEncounterBattle } from '../../src/battle/rules.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { newMember } from '../../src/data/party.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(NEXT, rel), 'utf8'));

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
}
/** An Episode 1 credits save like qa/out/autoplay/<device>-ep1-credits-save.json: Arden, Lv 10, in bed at home. */
function ep1CreditsGame() {
  const g = createGame('Arden');
  for (const f of EP1_DONE_FLAGS) g.flags[f] = true;
  g.party[0].level = 10; g.gold = 2840; g.playtime = 1442;
  setPosition(g, 'hero_home', 4, 3, 'down');
  return g;
}

// ------------------------------------------------------------------------------------------------ fix 1
test('save guard: an occupied autosave is named (name, level, place); an empty one asks nothing', () => {
  const save = createSave({ storage: memoryStorage(), log: () => {} });
  assert.equal(autosaveGuard(save), null, 'a fresh browser: nothing to replace');
  const g = ep1CreditsGame();
  save.save(0, serialize(g), saveMeta(g));
  const q = autosaveGuard(save);
  assert.deepEqual([q.name, q.level, q.place], ['Arden', 10, 'Home']);
  assert.equal(q.line, 'Arden, Lv 10, Home');
  assert.ok(q.line.length <= 42 && /^[\x20-\x7e]+$/.test(q.line));
  // a record taken by the player's manual save is not the autosave: only slot 0 is guarded
  const only1 = createSave({ storage: memoryStorage(), log: () => {} });
  only1.save(1, serialize(g), saveMeta(g));
  assert.equal(autosaveGuard(only1), null);
  // the first free record takes the copy; none when all three are taken
  assert.equal(freeRecord(save), 1);
  save.save(1, {}, {}); save.save(2, {}, {});
  assert.equal(freeRecord(save), 3);
  save.save(3, {}, {});
  assert.equal(freeRecord(save), 0);
  // a broken storage never breaks the title
  assert.equal(autosaveGuard({ loadEnvelope() { throw new Error('corrupt'); } }), null);
  assert.equal(autosaveGuard(null), null);
});

test('the Episode 2 title row says it is a new party, and the finished save still unlocks it', () => {
  assert.match(EP2_ROW_LABEL, /^Episode 2: new party$/);
  const save = createSave({ storage: memoryStorage(), log: () => {} });
  const g = ep1CreditsGame();
  save.save(0, serialize(g), saveMeta(g));
  const offer = ep2Offer(save, '');
  assert.deepEqual([offer.show, offer.name, offer.slot], [true, 'Arden', 0]);
  // the title's copy keeps the run: importSlot(exportSlot(0)) is byte for byte
  assert.ok(save.importSlot(1, save.exportSlot(0)));
  assert.equal(save.exportSlot(1), save.exportSlot(0));
  // the quick start's game is a different run (its first door would rewrite slot 0, hence the guard)
  const q = newGameEp2('Arden');
  assert.notEqual(q.party[0].level, 10);
  assert.notEqual(q.gold, g.gold);
});

// ------------------------------------------------------------------------------------------------ fix 2
function fakeEngine(device) {
  const ui = normalizeAtlas(readJson('assets/ui/ui.json'), { tag: 'ui-image' }, 'ui');
  const fonts = createFonts({ canvas: false });
  fonts.register('main', readJson('assets/ui/font.json'), null);
  const e = { fonts, input: { lastDevice: device }, touch: null, stack: [], loaded: false, _handlers: new Map(),
    assets: { has: (id) => id === 'ui', atlas: () => ui, manifest: {} } };
  for (const k of ['on', 'off', 'emit', '_installUiArt']) e[k] = Engine.prototype[k];
  return { e, ui, resolve: (id) => fonts.get('main').iconResolver(id) };
}
/** wordCap draws on a canvas; a stub document is enough for its size. */
function withDocument(fn) {
  const had = 'document' in globalThis, prev = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillStyle: '', fillRect() {} }) }) };
  try { return fn(); } finally { if (had) globalThis.document = prev; else delete globalThis.document; }
}
const capW = (word) => word.length * 4 - 1 + 6;

test('touch glyphs survive the real boot order (bindGlyphs, then the engine installs its UI art)', () => withDocument(() => {
  const { e, ui, resolve } = fakeEngine('touch');
  // engine.boot: the scene modules (title.js install -> bindGlyphs) run first, _installUiArt replaces the resolver,
  // then 'loaded' is emitted
  bindGlyphs(e);
  e._installUiArt();
  e.loaded = true;
  e.emit('loaded');
  const keyRects = Object.entries(ui.frames).filter(([n]) => n.startsWith('btn_key_')).map(([, f]) => `${f.x},${f.y}`);
  for (const id of ['btn_pageR', 'btn_pageL', 'btn_menu', 'btn_run', 'btn_start', ...Object.keys(ABILITY_WORDS).map((a) => `btn_pageR_${a}`)]) {
    const r = resolve(id);
    assert.ok(r, `${id} draws something on touch`);
    assert.ok(!keyRects.includes(`${r.x},${r.y}`) || r.image !== ui.image, `${id} is not a keyboard key cap on touch`);
  }
  // the ability lines show the touch button's own word
  for (const [ab, word] of Object.entries(ABILITY_WORDS)) assert.equal(resolve(`btn_pageR_${ab}`).w, capW(word), `${ab} -> ${word}`);
  // pageL is the swap tab's icon
  const sw = resolve('btn_pageL');
  assert.equal(sw.image, ui.image);
  assert.deepEqual([sw.x, sw.y], [ui.frames.icon_swap.x, ui.frames.icon_swap.y]);
  // a bare pageR says what the button would do now (the field's ability context), else USE
  assert.equal(resolve('btn_pageR').w, capW('USE'));
  e.stack.push({ name: 'field', abilities: { context: () => ({ id: 'shove' }) } });
  assert.equal(resolve('btn_pageR').w, capW('SHOVE'));
  // A and B stay the tap glyphs
  assert.deepEqual([resolve('btn_confirm').x, resolve('btn_confirm').y], [ui.frames.btn_tap_a.x, ui.frames.btn_tap_a.y]);
}));

test('keyboard and pad glyphs are unchanged by the ability suffix', () => withDocument(() => {
  const { e, ui, resolve } = fakeEngine('keyboard');
  bindGlyphs(e); e._installUiArt(); e.loaded = true; e.emit('loaded');
  for (const id of ['btn_pageR', 'btn_pageR_shove', 'btn_pageR_lantern']) assert.deepEqual([resolve(id).x, resolve(id).y], [ui.frames.btn_key_e.x, ui.frames.btn_key_e.y], id);
  assert.deepEqual([resolve('btn_pageL').x, resolve('btn_pageL').y], [ui.frames.btn_key_q.x, ui.frames.btn_key_q.y]);
  e.input.lastDevice = 'gamepad';
  assert.deepEqual([resolve('btn_pageR_dash').x, resolve('btn_pageR_dash').y], [ui.frames.btn_pad_rb.x, ui.frames.btn_pad_rb.y]);
  const table = readJson('assets/ui/ui.json').buttonGlyphs;
  assert.equal(glyphNameFor('pageR', 'touch', table, 'lantern'), 'word:LANTERN');
  assert.equal(glyphNameFor('pageR_shove', 'keyboard', table), 'btn_key_e');
  assert.equal(glyphNameFor('pageL', 'touch', table), 'icon_swap');
  assert.equal(wordCap('X') && wordCap('X').w, capW('X'));
}));

test('every dialogue line that names a field button says which ability it means', () => {
  const files = ['src/data/text.js', 'src/data/quests.js', 'src/data/story/ep1.js', 'src/data/story/ep2.js', 'src/data/npcs.js'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(NEXT, f), 'utf8');
    for (const line of src.split('\n')) {
      if (!/(say|text:|\bm\(|\bb\()/.test(line) || /^\s*\/\//.test(line)) continue;
      if (/wheel:/.test(line)) continue;   // the wheel's own help (keyboard and pad only)
      assert.ok(!/\{i:btn_pageR\}/.test(line), `${f}: a bare {i:btn_pageR} in a line: ${line.trim().slice(0, 90)}`);
    }
  }
  assert.ok(BARKS.first_heavy_block[0].lines[0].text.includes('{i:btn_pageR_shove}'));
});

// ------------------------------------------------------------------------------------------------ fix 9
test('choice boxes take one tap; the save guard keeps the two-step tap', () => {
  const engine = { renderer: { W: 384, H: 216, measure: (s) => String(s).length * 5 }, touch: { visible: true }, settings: { reduceMotion: true }, game: null };
  const tapAt = (box, y) => {
    const audio = { sfx() {} };
    const mk = (p) => ({ repeatDir: () => null, pressed: () => false, consume() {}, pointer: { type: 'touch', x: box.rect.x + 30, y, ...p } });
    engine.input = mk({ pressed: true, down: true, released: false }); engine.audio = audio;
    const a = box.update();
    engine.input = mk({ pressed: false, down: false, released: true });
    return a ?? box.update();
  };
  const one = new ChoiceBox(engine, ['I heard them too.', 'Thirteen?'], { x: 300, y: 150, anchor: 'bottom-right' });
  const row2 = one.list.rowRect(1);
  assert.equal(tapAt(one, row2.y + 5), 1, 'a single tap on the other row chooses it');
  const guard = new ChoiceBox(engine, ['Keep my save', 'Replace it'], { x: 192, y: 108, anchor: 'center', cancel: 0, tapMode: 'double' });
  const r2 = guard.list.rowRect(1);
  assert.equal(tapAt(guard, r2.y + 5), null, 'the first tap on Replace only moves the glove');
  assert.equal(guard.index, 1);
  // a tap well below the box (the text window) is not a row: slop stays inside the window
  const below = new ChoiceBox(engine, ['Yes', 'No'], { x: 300, y: 120, anchor: 'bottom-right' });
  assert.equal(tapAt(below, below.rect.y + below.rect.h + 12), null);
  assert.ok(!below.contains(below.rect.x + 5, below.rect.y + below.rect.h + 12));
  below.nudge();
  assert.ok(below.list._nudge > 0, 'the glove bobs');
});

// ------------------------------------------------------------------------------------------------ fix 3
test('after the Episode 2 credits: a closing card, and Talk and the journal say the road is not open yet', () => {
  assert.equal(CREDITS_HANDOFF[2].endCard, END_CARD_EP2);
  assert.equal(END_CARD_EP2.text, 'To be continued');
  for (const s of [END_CARD_EP2.text, END_CARD_EP2.sub]) assert.ok(s.length <= 42 && /^[\x20-\x7e]+$/.test(s));
  assert.equal(CREDITS_HANDOFF[1].endCard, undefined, 'Episode 1 hands over to Episode 2 as before');
  const g = newGameEp2('Arden');
  for (const st of MAIN_QUEST_EP2.steps) for (const f of [st.done].flat().filter(Boolean)) g.flags[f] = true;
  g.flags.ep2_complete = true;
  const has = (f) => !!g.flags[f];
  for (const map of ['nh_inn', 'nameless_hollow', 'willowmere']) {
    const c = partyChat(has, map);
    assert.equal(c.step.id, 'epilogue2');
    const text = c.lines.map((l) => l.text).join(' ');
    assert.match(text, /isn't open yet/, `${map}: Talk says the road is not open`);
    assert.ok(!/When you're ready|Not before/.test(text), `${map}: no instruction the player cannot follow`);
  }
  assert.match(partyChat(has, 'nh_inn').lines.map((l) => l.text).join(' '), /mirror in the chapel/, 'and names something to do');
  assert.match(journal(has).main.text, /not open yet/);
});

// ------------------------------------------------------------------------------------------------ fix 7
test('arrival scenes are known before they run (the field holds them for the banner)', () => {
  const has = (set) => (f) => set.includes(f);
  assert.equal(sceneAllowed('archive_f1_arrival', has(['archive_entered'])), true);
  assert.equal(sceneAllowed('archive_f1_arrival', has(['archive_entered', 'f1_arrived'])), false, 'once only');
  assert.equal(sceneAllowed('court_f3_arrival', has(['court_f2_done'])), true);
  assert.equal(sceneAllowed('wake_up', has(['intro_done'])), false);
  assert.equal(sceneAllowed('no_such_scene', has([])), false);
});

// ------------------------------------------------------------------------------------------------ fix 8
test('Court F3 hits harder than the floors it shares foes with, and only there', () => {
  for (const [enc] of ZONES.court_f3.plan) {
    assert.ok(ENCOUNTERS[enc].power > 1, `${enc} has power`);
    assert.equal(ENCOUNTERS[enc].power, C3_POWER[enc]);
  }
  for (const id of ['c2_knight', 'c2_sentinel', 'c2_mixed', 'c1_sentinel']) assert.equal(ENCOUNTERS[id].power, undefined, `${id} unchanged`);
  const spec = rollEncounter('c3_knights', () => 0.99, { noElite: true });
  assert.ok(spec.enemies.every((x) => x.power === C3_POWER.c3_knights));
  const party = ['hero', 'mira', 'bram'].map((id) => newMember(id, { level: 12 }));
  const f3 = createEncounterBattle('c3_knights', { party, noElite: true }).battle;
  const f2 = createEncounterBattle('c2_knight', { party: ['hero', 'mira', 'bram'].map((id) => newMember(id, { level: 12 })), noElite: true }).battle;
  const k3 = Object.values(f3.state.units).find((u) => u.id === 'faceless_knight');
  const k2 = Object.values(f2.state.units).find((u) => u.id === 'faceless_knight');
  assert.equal(k2.stats.atk, ENEMIES.faceless_knight.atk);
  assert.equal(k3.stats.atk, Math.round(ENEMIES.faceless_knight.atk * C3_POWER.c3_knights));
  assert.equal(k3.maxHp, k2.maxHp, 'HP unchanged');
  assert.equal(k3.maxShields, k2.maxShields, 'shields unchanged');
});
