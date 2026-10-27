// H2-ledger: the Ledger of Names (src/data/ledger.js), its Journal tab, the title counter and the field's Aim line.
// Pure checks here; the browser half (the real tab, the counter and the Aim line on both device profiles) is
// qa/ui/h2_ledger_headless.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEDGER, ALIASES, EXCLUDED, PLACES, REACHED, ledgerRows, namesKept, namesKeptInSaves, counterLine, keepLine, placeName } from '../../src/data/ledger.js';
import { NPCS } from '../../src/data/npcs.js';
import { X1_NPCS } from '../../src/data/x1/npcs.js';
import { register as registerX1Flags } from '../../src/data/x1/flags.js';
import { FLAGS, SIDE_QUESTS } from '../../src/data/quests.js';
import '../../src/data/story/ep1.js';   // merges the H1 flags (yard_fight_done ...) into FLAGS, as the game does at boot
import { createGame, newGameEp2, serialize, deserialize, EP1_DONE_FLAGS } from '../../src/game/state.js';
import { createSave } from '../../src/core/save.js';
import { HELP } from '../../src/data/text.js';
import { FieldScene } from '../../src/scenes/field.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
const EM_DASH = String.fromCharCode(0x2014);
registerX1Flags();

const liveRows = (flags, o) => ledgerRows(flags, { x1: true, ep3: false, ...o });
const on = (...ids) => Object.fromEntries(ids.flatMap((x) => (typeof x === 'object' && !Array.isArray(x) ? Object.keys(x) : x)).map((f) => [f, true]));

/** Every Episode 1 flag a credits save can hold: the main line, H1's marks and every side story's flags. */
function ep1CreditsFlags() {
  const f = {};
  for (const k of [...EP1_DONE_FLAGS, 'cold_open_done', 'yard_fight_done', 'saw_fading_sign', 'oren_truth',
    'tess_letter_1_delivered', 'tess_letter_2_delivered', 'tess_letter_3_delivered']) f[k] = true;
  for (const q of SIDE_QUESTS) {
    f[q.start] = true; f[q.done] = true;
    for (const st of q.steps) for (const d of [].concat(st.done || [])) f[d] = true;
  }
  return f;
}

test('every NPC record is one Ledger row, an alias of one, or excluded with a reason; no id is both', () => {
  const ids = new Set(LEDGER.map((r) => r.id));
  assert.equal(ids.size, LEDGER.length, 'row ids are unique');
  for (const [a, to] of Object.entries(ALIASES)) assert.ok(ids.has(to), `alias ${a} -> ${to} is a row`);
  const records = { ...NPCS, ...X1_NPCS };
  for (const id of Object.keys(records)) {
    const inRows = ids.has(id) || !!ALIASES[id], out = !!EXCLUDED[id];
    assert.ok(inRows || out, `${id} (${records[id].name}) is a Ledger row or excluded`);
    assert.ok(!(inRows && out), `${id} is not both a row and excluded`);
    if (out) assert.ok(typeof EXCLUDED[id] === 'string' && EXCLUDED[id].length > 2, `${id} has a reason`);
  }
  for (const id of Object.keys(EXCLUDED)) assert.ok(records[id], `excluded ${id} is a real record`);
  // a row's name is the record's name (the hero is player-named; aliases are the same person)
  for (const r of LEDGER) {
    if (r.id === 'hero' || r.id === 'mara') continue;   // Mara is a memory actor without a record
    const rec = records[r.id];
    assert.ok(rec, `${r.id} has an NPC record`);
    assert.equal(r.name, rec.name, `${r.id} keeps the record's name`);
  }
  assert.ok(PLACES[LEDGER[0].place], 'every row has a known place');
  for (const r of LEDGER) assert.ok(PLACES[r.place], `${r.id}: place ${r.place} is known`);
});

test('every keep flag exists in FLAGS (H1 and expansion flags included) and every kept line is clean', () => {
  const used = new Set();
  for (const r of LEDGER) { if (r.flag) used.add(r.flag); }
  for (const f of ['garrick_farewell_done', 'ep3_started', 'garrick_named', 'aurel_named', 'mara_named', 'mara_read', 'nh_restored']) used.add(f);
  for (const f of used) assert.ok(FLAGS[f], `keep flag ${f} is declared in FLAGS`);
  const all = {}; for (const f of Object.keys(FLAGS)) all[f] = true;
  for (const r of ledgerRows(all, { x1: true, ep3: true })) {
    if (r.id === 'hero') { assert.equal(r.kept, false, 'the hero has no keep yet'); continue; }
    assert.ok(r.kept, `${r.id} is kept once every flag is set`);
    assert.ok(/^[\x20-\x7e]+$/.test(r.why), `${r.id}: plain ASCII line: ${r.why}`);
    assert.ok(!/\(|\)|the hero|\bEXP\b/.test(r.why), `${r.id}: no scene ids, dev tails or "the hero": ${r.why}`);
    assert.ok(r.why.length <= 90, `${r.id}: the kept line fits the panel (${r.why.length}): ${r.why}`);
  }
  assert.equal(keepLine('wick_tag_done'), 'Returned the tag to Wick.');
  assert.equal(keepLine('hazel_farewell_done'), 'Hazel gave you her knitted mantle.');
  assert.equal(keepLine('rollcall_done'), 'Brindle counted thirteen.');
  assert.equal(keepLine('no_such_flag'), null);
});

test('a fresh game keeps nothing; the sign keeps Oren first, by the word and not the punch; the counter string', () => {
  const g = createGame('Arden');
  assert.deepEqual(namesKept(g.flags), { kept: 0, total: namesKept(g.flags).total });
  assert.equal(namesKept({}).kept, 0);
  assert.deepEqual(liveRows({ yard_fight_done: true }).filter((r) => r.kept).map((r) => r.id), [], 'the slime keeps nobody (H6, CRITIQUE_ARC 5)');
  const rows = liveRows({ saw_fading_sign: true, oren_truth: true }, { heroName: 'Arden' });
  const kept = rows.filter((r) => r.kept).map((r) => r.id);
  assert.deepEqual(kept, ['oren']);
  const truth = rows.find((r) => r.id === 'oren').why, lie = liveRows({ saw_fading_sign: true, oren_lie: true }).find((r) => r.id === 'oren').why;
  assert.match(truth, /his own name from you/); assert.match(lie, /forgotten too/);
  assert.notEqual(truth, lie, 'the line differs by the answer, the keep does not');
  assert.equal(rows[0].id, 'hero'); assert.equal(rows[0].name, 'Arden'); assert.equal(rows[0].kept, false);
  assert.equal(counterLine({ kept: 17, total: 63 }), 'Names kept: 17 of 63');
  assert.match(counterLine(namesKept({})), /^Names kept: 0 of \d+$/);
});

test('an Episode 1 credits save keeps every Episode 1 name that has a keep (the hero never, the expansion by its own quests)', () => {
  const rows = liveRows(ep1CreditsFlags());
  for (const r of rows.filter((x) => x.ep === 1 && x.place !== 'wider' && x.id !== 'pell')) {
    if (r.id === 'hero') { assert.equal(r.kept, false, 'the hero\'s name stays faint'); continue; }
    assert.ok(r.kept, `${r.id} is kept by the Episode 1 credits save`);
  }
  for (const r of rows.filter((x) => x.place === 'hollowmere')) assert.equal(r.kept, false, `${r.id} waits for Episode 2`);
  const c = namesKept(ep1CreditsFlags(), { x1: true, ep3: false });
  assert.equal(c.kept, 17, 'two party members, fourteen Willowmere names and Quill');
  assert.ok(!rows.some((x) => x.place === 'hollowmere'), 'the Hollow is not counted before the crossing (H6)');
});

test('names the story has not said yet show as ???, and the Hollow has no name until Episode 2 gives it back', () => {
  const before = liveRows({ crossing_done: true });
  assert.equal(before.find((r) => r.id === 'aurel').name, '???');
  assert.equal(before.find((r) => r.id === 'aurel').placeName, 'The Nameless Hollow');
  assert.equal(placeName('hollowmere', { nh_restored: true }), 'Hollowmere');
  const after = liveRows({ crossing_done: true, aurel_named: true, nh_restored: true });
  assert.equal(after.find((r) => r.id === 'aurel').name, 'Aurel');
  assert.equal(after.find((r) => r.id === 'aurel').kept, true);
  // Episode 3 opens with Garrick's name struck: his row goes dark and unreadable until Bram raises it
  const struck = liveRows({ garrick_farewell_done: true, ep3_started: true }, { ep3: true });
  const g = struck.find((r) => r.id === 'garrick');
  assert.equal(g.name, '???'); assert.equal(g.kept, false);
  assert.ok(!struck.some((r) => /Garrick/.test(r.name) || /Garrick/.test(r.why || '')), 'no row says the struck name');
  assert.equal(struck.find((r) => r.id === 'mara').name, '???');
  const raised = liveRows({ garrick_farewell_done: true, ep3_started: true, garrick_named: true, mara_read: true, mara_named: true }, { ep3: true });
  assert.equal(raised.find((r) => r.id === 'garrick').kept, true);
  assert.equal(raised.find((r) => r.id === 'mara').name, 'Mara');
  // the episode and expansion gates
  assert.ok(!liveRows({}).some((r) => r.ep === 3), 'no Emberpeak rows while EP3_LIVE is off');
  assert.ok(ledgerRows({ ep3_started: true }, { ep3: true }).some((r) => r.ep === 3), 'Emberpeak rows once it is live and begun');
  assert.ok(!ledgerRows({}, { ep3: true }).some((r) => r.ep === 3), 'and not before Episode 3 starts');
  assert.ok(!ledgerRows({}, { x1: false }).some((r) => r.place === 'wider' || r.id === 'pell'), 'no expansion rows when x1 is off');
  assert.ok(ledgerRows({ first_fight_done: true }, { x1: true }).some((r) => r.id === 'hesper'), 'the Wider Valley once its gate opens');
  assert.ok(!ledgerRows({ first_fight_done: true }, { x1: true, regions: { north: false } }).some((r) => r.id === 'hesper'), 'a region switched off drops its names');
});

test('H6: a place shows and counts once reached; every Episode 1 and 2 row has its own line, in voice (CRITIQUE_ARC 3, 4)', () => {
  assert.deepEqual(REACHED, { valley: 'left_town', wider: 'first_fight_done', hollowmere: 'crossing_done', emberpeak: 'ep3_started' });
  const places = (flags) => [...new Set(liveRows(flags).map((r) => r.place))];
  const afterMael = on('intro_done', 'saw_fading_sign', 'met_mael');
  assert.deepEqual(places(afterMael), ['party', 'willowmere'], 'after Mael: the party and the town only');
  assert.deepEqual(namesKept(afterMael, { x1: true, ep3: false }), { kept: 1, total: 18 }, 'after Mael: 1 of 18');
  const door = on(afterMael, 'mira_joined', 'bram_joined', 'left_town', 'first_fight_done', 'archive_entered');
  assert.deepEqual(places(door), ['party', 'willowmere', 'valley', 'wider'], 'at the Archive door: the valleys join');
  assert.deepEqual(namesKept(door, { x1: true, ep3: false }), { kept: 3, total: 25 }, 'Oren, Bram, Holt: 3 of 25');
  const credits = namesKept(ep1CreditsFlags(), { x1: true, ep3: false });
  assert.deepEqual(credits, { kept: 17, total: 25 }, 'after the credits: 17 of 25, not 17 of 37');
  assert.ok(liveRows(on(EP1_DONE_FLAGS, 'crossing_done')).some((r) => r.place === 'hollowmere'), 'the Hollow once the ford is crossed');
  assert.equal(ledgerRows({}, { x1: true, ep3: false, all: true }).length, 37, 'every live row, reached or not (all)');
  // every Episode 1 and 2 row with a keep says its own line (not the flag's note), verb first or a plain sentence
  const all = {}; for (const f of Object.keys(FLAGS)) all[f] = true;
  for (const r of LEDGER.filter((x) => x.ep <= 2 && x.flag)) {
    assert.ok(r.why, `${r.id} has its own line`);
    const line = typeof r.why === 'function' ? r.why((f) => !!all[f]) : r.why;
    assert.notEqual(line, keepLine(r.flag), `${r.id}: not the flag's note`);
    assert.ok(/^[A-Z][^]*\.$/.test(line) && line.length <= 70 && !line.includes(EM_DASH), `${r.id}: ${line}`);
  }
});

test('the title reads the slot with the most names kept, autosave included, and shrugs off a corrupt slot', () => {
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
  const save = createSave({ storage: mem(), log: () => {} });
  assert.equal(namesKeptInSaves(save), null, 'no save: hidden');
  const a = createGame('Arden'); a.flags.saw_fading_sign = true;
  const b = createGame('Sol'); for (const f of Object.keys(ep1CreditsFlags())) b.flags[f] = true;
  save.save(0, serialize(a), {}); save.save(2, serialize(b), {});
  const best = namesKeptInSaves(save, { x1: true, ep3: false });
  assert.deepEqual([best.slot, best.kept], [2, 17]);
  save.save(1, { nothing: true }, {});
  assert.equal(namesKeptInSaves(save, { x1: true, ep3: false }).slot, 2, 'a slot without flags is skipped');
  const broken = { slots: 3, loadEnvelope: (n) => { if (n === 1) throw new Error('corrupt'); return n === 0 ? { data: serialize(a) } : null; } };
  assert.equal(namesKeptInSaves(broken).slot, 0);
  assert.equal(namesKeptInSaves(null), null);
});

test('existing saves load: no new save field, and an old game\'s flags read straight into the Ledger', () => {
  const keys = Object.keys(createGame('Arden'));
  assert.ok(!keys.some((k) => /ledger|aim/i.test(k)), 'the save has no Ledger or Aim field');
  const old = serialize(newGameEp2('Arden'));
  const g = deserialize(old);
  assert.deepEqual(Object.keys(g).sort(), keys.sort(), 'deserialize adds nothing new');
  assert.ok(namesKept(g.flags).kept >= 2, 'an Episode 2 start already keeps the credits names');
  const fixture = path.join(NEXT, 'qa', 'out', 'autoplay', 'desktop-ep1-credits-save.json');
  if (fs.existsSync(fixture)) {
    const real = deserialize(JSON.parse(fs.readFileSync(fixture, 'utf8')));
    const c = namesKept(real.flags);
    assert.ok(c.kept > 0 && c.kept < c.total, `the autoplay credits save reads (${c.kept} of ${c.total})`);
  }
});

test('the Aim line gate: shown after the menu, never during a scene, a dialog or under a battle; the timer waits', () => {
  // a stand-in field with the real prototype: the Aim methods and nothing else of the scene
  const field = Object.setPrototypeOf({ map: {}, cutscene: { running: false }, inputLocked: 0, pendingWarp: null, loading: false,
    banner: { active: false }, closeup: { isOpen: false }, fadeAlpha: 0, frame: 1, aim: { t: 0, step: null, title: '', still: 0 },
    hasFlag: (f) => !!field.flags[f], flags: { intro_done: true } }, FieldScene.prototype);
  field.engine = { scene: field };
  const shown = () => field.aimShown;
  const tick = (still, n = 1) => { for (let i = 0; i < n; i++) { field.frame++; field.tickAim(still); } };
  tick(false, 20);                                   // the first step check only remembers the step
  assert.equal(field.aim.step, 'find_mael'); assert.equal(shown(), false);
  field.showAim();                                   // the menu closed
  assert.equal(shown(), true); assert.equal(field.aim.title, 'The Elder\'s Errand');
  field.cutscene.running = 'mael_intro';
  assert.equal(shown(), false, 'hidden during a scene');
  tick(false, 300);
  assert.equal(field.aim.t, 240, 'the timer does not run while hidden');
  field.cutscene.running = false; field.inputLocked = 1;
  assert.equal(shown(), false, 'hidden under a dialogue box');
  field.inputLocked = 0; field.engine.scene = { name: 'battle' };
  assert.equal(shown(), false, 'hidden under a battle');
  field.engine.scene = field; field.banner.active = true;
  assert.equal(shown(), false, 'waits for the location banner');
  field.banner.active = false;
  assert.equal(shown(), true);
  tick(false, 240);
  assert.equal(shown(), false, 'gone after about four seconds');
  // the main step changes (Mael met): the line comes back with the new step
  field.flags.met_mael = true;
  tick(false, 20);
  assert.equal(shown(), true); assert.equal(field.aim.title, 'The Apprentice');
  tick(false, 240);
  assert.equal(shown(), false);
  // ten seconds standing still bring it back once; moving resets the count
  tick(true, 599); assert.equal(shown(), false);
  tick(true, 1); assert.equal(shown(), true);
  tick(true, 240); assert.equal(shown(), false);
  tick(true, 700); assert.equal(shown(), false, 'standing still longer does not repeat it');
  tick(false, 1); assert.equal(field.aim.still, 0, 'a step resets the still count');
});

test('help lines, shots and the doc: short, present, honest; no em dash in anything new', () => {
  assert.ok(HELP.menu.ledger.length <= 40 && HELP.menu.ledgerTouch.length <= 40);
  assert.ok(/btn_pageR/.test(HELP.menu.ledger), 'the keyboard help names the page button');
  const shots = JSON.parse(read('qa/shots.json')).shots.map((s) => s.name);
  for (const n of ['ui_ledger', 'ui_title_ledger', 'field_aim']) assert.ok(shots.includes(n), `shot ${n} is planned`);
  const doc = read('docs/LEDGER.md');
  for (const r of LEDGER) assert.ok(new RegExp(`\\|\\s*\`${r.id}\`\\s*\\|`).test(doc), `docs/LEDGER.md lists ${r.id}`);
  for (const id of Object.keys(EXCLUDED)) assert.ok(doc.includes(id), `docs/LEDGER.md lists excluded ${id}`);
  for (const rel of ['src/data/ledger.js', 'src/ui/screens/journal.js', 'src/scenes/title.js', 'src/scenes/field.js', 'src/data/text.js',
    'docs/LEDGER.md', 'qa/ui/h2_ledger.test.mjs', 'qa/ui/h2_ledger_headless.py', 'qa/shots.json']) {
    assert.ok(!read(rel).includes(EM_DASH), `no em dash in ${rel}`);
  }
});
