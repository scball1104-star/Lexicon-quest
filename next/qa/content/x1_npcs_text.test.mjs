// X1 content: the new cast, the talk entries prepended to six old NPCs, the text (banners, signs, books, fonts, Appraise texts,
// the bark, the bestiary) and the placeholder names of X1_NAMES_TO_CONFIRM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { X1, registerAll, BASE, BASE_TALK, OLD_STATES, PREPENDED_NPCS, resolveAll, X1_MAPS, X1_NPC_SPRITES, X1_SHOPS, CANON_NAMES, NEXT, EM, BAR, listFiles } from './x1_helpers.mjs';
import { EXTRA_SPRITES, NPC_SPRITES, MAP_IDS, EP2_MAP_IDS, EP3_MAP_IDS } from './_harness.mjs';
import { fits, boxLines, resolve } from '../../src/data/story/dialogue.js';
import { FLAGS } from '../../src/data/quests.js';
import { NPCS, talkTo, isPresent, SPEAKER_NAMES } from '../../src/data/npcs.js';
import { BANNERS, BOOKS, BARKS, BESTIARY } from '../../src/data/text.js';
import { LINES, inspectBoxes, bookBoxes, bannerFor } from '../../src/game/story.js';

const N = X1.text.X1_NAMES_TO_CONFIRM;
const { X1_NPCS, X1_TALK_PREPEND } = X1.npcs;
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const KNOWN_MAPS = [...MAP_IDS, ...EP2_MAP_IDS, ...EP3_MAP_IDS, ...X1_MAPS, 'whisperwood_hollow'];

// Old-state talk, resolved BEFORE the expansion registers (helpers snapshot it), then register.
registerAll();

test('new cast: the six named NPCs, five strays and two fold sheep, with sprites, maps, shops and a fallback talk entry', () => {
  assert.deepEqual(Object.keys(X1_NPCS).sort(), ['brindle', 'fold_sheep_a', 'fold_sheep_b', 'ferrick', 'hesper', 'odo', 'stray_1', 'stray_2', 'stray_3', 'stray_4', 'stray_5', 'tamsin', 'yarrow'].sort());
  const SPRITE = { brindle: 'npc_brindle', tamsin: 'npc_tamsin', ferrick: 'npc_ferrick', hesper: 'npc_hesper', odo: 'npc_odo', yarrow: 'npc_yarrow' };
  const MAP = { brindle: 'x1_downs', tamsin: 'x1_loomhouse', ferrick: 'x1_millrace', hesper: 'x1_orrery', odo: 'x1_highmoor', yarrow: 'x1_larchhill' };
  for (const [id, rec] of Object.entries(X1_NPCS)) {
    assert.equal(NPCS[id], rec, `${id} registered`);
    assert.ok(rec.name && rec.about && rec.spot && rec.move, `${id}: fields`);
    assert.ok([...NPC_SPRITES, ...EXTRA_SPRITES, ...X1_NPC_SPRITES].includes(rec.sprite), `${id}: sprite ${rec.sprite}`);
    assert.ok(KNOWN_MAPS.includes(rec.map), `${id}: map`);
    if (SPRITE[id]) { assert.equal(rec.sprite, SPRITE[id]); assert.equal(rec.map, MAP[id]); }
    const last = rec.talk[rec.talk.length - 1];
    assert.ok(!last.if && !last.ifNot && (last.lines || /^stray_/.test(id)), `${id}: last talk entry must be the plain fallback`);
  }
  assert.equal(X1_NPCS.tamsin.service.id, 'thornfold_loom');
  assert.equal(X1_NPCS.ferrick.service.id, 'millrace_stall');
  for (const s of [X1_NPCS.tamsin.service.id, X1_NPCS.ferrick.service.id]) assert.ok(X1_SHOPS.includes(s));
  assert.equal(NPCS.stray_4.map, 'valley', 'stray_4 stands in the valley pasture');
  for (const n of [1, 2, 3, 4, 5]) {
    const rec = X1_NPCS[`stray_${n}`];
    assert.deepEqual(rec.show, { if: 'strays_started', ifNot: `stray_${n}_found` });
    assert.deepEqual(rec.talk, [{ scene: `stray_found_${n}` }]);
    assert.equal(rec.sprite, 'animal_sheep');
    assert.equal(isPresent(`stray_${n}`, () => false), false);
    assert.equal(isPresent(`stray_${n}`, (f) => f === 'strays_started'), true);
    assert.equal(isPresent(`stray_${n}`, (f) => f === 'strays_started' || f === `stray_${n}_found`), false);
  }
});

test('talk entries: declared flags, fitting lines, valid scenes and speakers, and every named stage answers', () => {
  const sceneIds = Object.keys(X1.story.scenes);
  const speakers = new Set(['mira', 'bram', 'hero', null]);
  const all = [...Object.entries(X1_NPCS).map(([id, n]) => [id, n.talk]), ...Object.entries(X1_TALK_PREPEND)];
  for (const [id, talk] of all) {
    for (const e of talk) {
      for (const f of [...list(e.if), ...list(e.ifNot)]) assert.ok(f in FLAGS, `${id}: undeclared ${f}`);
      if (e.scene) assert.ok(sceneIds.includes(e.scene) || e.scene in X1.story.scenes, `${id}: scene ${e.scene}`);
      for (const l of list(e.lines)) {
        const text = typeof l === 'string' ? l : l.text;
        assert.ok(fits(text), `${id}: ${boxLines(text).join(' / ')}`);
        if (typeof l !== 'string') assert.ok(speakers.has(l.who ?? null), `${id}: speaker ${l.who}`);
      }
    }
  }
  // Every scene an NPC starts is registered and starts only from its own NPC.
  const WHO = { brindle_strays: 'brindle', strays_done: 'brindle', rollcall_start: 'brindle', rollcall_done: 'brindle', list_rhyme: 'brindle', iris_roll: 'iris', list_start: 'iris', list_done: 'iris',
    quill_copy: 'quill', crates_start: 'pell', crates_done: 'pell', mill_start: 'hal', ferrick_meet: 'ferrick', crate_delivered_1: 'tamsin', crate_delivered_2: 'yarrow', crate_delivered_3: 'ferrick',
    orrery_align: 'hesper', odo_meet: 'odo', list_song: 'odo', yarrow_meet: 'yarrow' };
  for (const [scene, who] of Object.entries(WHO)) assert.ok((NPCS[who].talk).some((e) => e.scene === scene), `${who} does not start ${scene}`);
  // Stages answer end to end with the right flags.
  const has = (...fl) => (f) => fl.includes(f);
  assert.deepEqual(talkTo('brindle', has()), { scene: 'brindle_strays' });
  assert.deepEqual(talkTo('brindle', has('strays_started', 'stray_1_found', 'stray_2_found', 'stray_3_found', 'stray_4_found', 'stray_5_found')), { scene: 'strays_done' });
  assert.deepEqual(talkTo('brindle', has('strays_started', 'stones_seen')), { scene: 'rollcall_start' });
  assert.deepEqual(talkTo('brindle', has('strays_started', 'strays_done', 'stones_seen', 'rollcall_started', 'reeve_named')), { scene: 'rollcall_done' });
  assert.deepEqual(talkTo('ferrick', has()), { scene: 'ferrick_meet' });
  assert.deepEqual(talkTo('hesper', has('stars_started', 'star_1_read', 'star_2_read', 'star_3_read')), { scene: 'orrery_align' });
  assert.deepEqual(talkTo('odo', has('odo_met', 'list_started')), { scene: 'list_song' });
  assert.deepEqual(talkTo('iris', has('rollcall_started', 'archivore_defeated', 'mira_joined')), { scene: 'iris_roll' });
  assert.deepEqual(talkTo('hal', has('archivore_defeated', 'hal_returned', 'millrace_arrived')), { scene: 'mill_start' });
  assert.deepEqual(talkTo('pell', has('downs_arrived', 'archivore_defeated')), { scene: 'crates_start' });
  assert.deepEqual(talkTo('pell', has('crates_started', 'crate_1_done', 'crate_2_done', 'crate_3_done')), { scene: 'crates_done' });
  assert.deepEqual(talkTo('quill', has('rollcall_started')), { scene: 'quill_copy' });
  assert.ok(talkTo('tamsin', has()).service, 'Tamsin opens her shop');
  assert.ok(talkTo('ferrick', has('ferrick_met')).service, 'Ferrick opens his stall');
});

test('each new NPC has one Episode 2 line and one Episode 3 line, at most two boxes, and no name is spoken before it is given', () => {
  for (const id of ['brindle', 'tamsin', 'ferrick', 'hesper', 'odo', 'yarrow']) {
    const rec = X1_NPCS[id];
    const e2 = rec.talk.find((e) => list(e.if).includes('ep2_complete'));
    const e3 = rec.talk.find((e) => list(e.if).includes('ep3_started'));
    assert.ok(e2 && e3, `${id}: needs ep2_complete and ep3_started lines`);
    for (const e of [e2, e3]) assert.ok(e.lines.length <= 2, `${id}: at most two boxes`);
    // The Smith's name and the founder's name stay unsaid in the Episode 3 line (they are given back in the Foundry).
    assert.doesNotMatch(e3.lines.join(' '), /Garrick|Mara/, `${id}: Episode 3 line names a withheld name`);
    // Reached with the stage flags and nothing else, the late line answers.
    const got = talkTo(id, (f) => f === 'ep3_started');
    assert.ok(got.lines || got.scene, id);
  }
});

test('prepended entries: only six old NPCs, each guarded by a flag only the expansion sets or by a stage that ends, in front, once', () => {
  assert.deepEqual(Object.keys(X1_TALK_PREPEND).sort(), [...PREPENDED_NPCS].sort());
  const NEW = new Set(Object.keys(X1.flags.X1_FLAGS));
  for (const [id, entries] of Object.entries(X1_TALK_PREPEND)) {
    const front = NPCS[id].talk.slice(0, entries.length);
    assert.deepEqual(front, entries, `${id}: the entries are the first ones`);
    assert.equal(NPCS[id].talk.length, BASE.talkLen[id] + entries.length, `${id}: nothing else was added or removed`);
    for (const e of entries) {
      assert.ok(list(e.if).some((f) => NEW.has(f)), `${id}: an entry with no positive new flag would answer old saves (${JSON.stringify(e.if)})`);
    }
  }
  // Idempotent: a second registration adds nothing.
  registerAll();
  for (const [id, entries] of Object.entries(X1_TALK_PREPEND)) assert.equal(NPCS[id].talk.length, BASE.talkLen[id] + entries.length);
});

test('with every new flag false, the six old NPCs talk exactly as before across every old save state', () => {
  const after = resolveAll(PREPENDED_NPCS);
  assert.ok(Object.keys(after).length >= 6 * 20, 'the state matrix is real');
  assert.deepEqual(after, BASE_TALK);
  assert.ok(OLD_STATES.length > 20);
});

test('banners: the eleven maps, short enough, through bannerFor', () => {
  const B = X1.text.X1_BANNERS;
  assert.deepEqual(Object.keys(B).sort(), [...X1_MAPS].sort());
  for (const [id, b] of Object.entries(B)) {
    assert.ok(b.title.length <= 28 && (!b.sub || b.sub.length <= 32), `${id}: banner`);
    assert.equal(BANNERS[id], b);
    assert.deepEqual(bannerFor(id, null, () => false), { title: b.title, sub: b.sub });
  }
  assert.deepEqual(B.x1_highmoor, { title: 'The High Moor', sub: 'North of the Downs' });
  assert.deepEqual(B.x1_larchhill, { title: 'Larchhill', sub: 'The Terraced Orchards' });
});

test('every sign, inspect, font, Appraise, book and bark id the plan names resolves, and every box fits', () => {
  const LINE_IDS = ['x1_drovers_chain', 'x1_fallen_oak', 'x1_cleft_sign', 'x1_menhir', 'blank_slab', 'x1_sampler', 'x1_old_scarecrow', 'x1_star_plate', 'x1_armillary',
    'barrow_slab_a', 'x1_weir', 'x1_mill_wheel', 'x1_flour_table', 'chime_1', 'chime_2', 'chime_3', 'chime_4', 'chime_5', 'chime_6', 'chime_7', 'chime_8', 'chime_9',
    'x1_watchtower', 'x1_windmill', 'x1_mill_barred', 'thornfold_hearth', 'barrow_hearth', 'culvert_font', 'cellar_font', 'appraise_scarecrow', 'appraise_star_plate',
    'downs_signpost', 'thornfold_well', 'thornfold_sign', 'terrace_sign', 'edge_sign', 'moor_sign', 'moor_bench', 'hill_sign', 'millrace_signpost', 'x1_hatch',
    'x1_drovers_gate', 'x1_orchard_gate', 'x1_wall_crack', 'x1_cider_barrel', 'x1_hay_chute'];
  for (const id of LINE_IDS) { assert.ok(id in LINES, `line ${id} does not resolve`); assert.ok(inspectBoxes(id, () => false).length >= 1); }
  for (const id of Object.keys(X1.text.X1_LINES)) for (const f of [() => false, () => true]) for (const b of inspectBoxes(id, f)) assert.ok(fits(b.text), `${id}: ${boxLines(b.text).join(' / ')}`);
  for (const id of ['keeper_star_ledger', 'mill_ledger', 'burial_roll', 'x1_keeper_note_f2', 'barrow_names', 'cellar_note']) {
    assert.ok(BOOKS[id], `book ${id}`);
    assert.ok(KNOWN_MAPS.includes(BOOKS[id].where), `${id}: where`);
    assert.ok(BOOKS[id].title.length <= 42, `${id}: title`);
    for (const b of bookBoxes(id)) assert.ok(fits(b.text), `${id}: ${b.text}`);
  }
  // Conditional states: the stones in three states, the sampler, the chain, the wheel, the table, the armillary, the hatch, the sign.
  const T = (id, ...flags) => inspectBoxes(id, (f) => flags.includes(f)).map((b) => b.text).join(' ');
  assert.notEqual(T('x1_menhir'), T('x1_menhir', 'stones_lettered'));
  assert.notEqual(T('x1_menhir', 'stones_lettered'), T('x1_menhir', 'stones_lettered', 'reeve_named'));
  assert.notEqual(T('blank_slab'), T('blank_slab', 'reeve_named'));
  assert.notEqual(T('x1_sampler'), T('x1_sampler', 'stones_lettered'));
  assert.match(T('x1_drovers_chain'), /ROAD CLOSED. THE WEIR BROKE AND NOBODY CAME. - F./);
  assert.doesNotMatch(T('x1_drovers_chain', 'archive_f1_done'), /ROAD CLOSED/);
  assert.notEqual(T('thornfold_sign'), T('thornfold_sign', 'archivore_defeated'));
  assert.notEqual(T('x1_mill_wheel'), T('x1_mill_wheel', 'mill_turning'));
  assert.notEqual(T('x1_armillary'), T('x1_armillary', 'orrery_aligned'));
  assert.notEqual(T('x1_hatch'), T('x1_hatch', 'orrery_aligned'));
  assert.notEqual(T('x1_flour_table'), T('x1_flour_table', 'mill_done'));
  assert.equal(T('x1_mill_barred'), 'The door is barred from inside. Very softly, somebody on the other side is setting out bowls.');
  assert.equal(T('barrow_slab_a'), 'A NAME FOR EACH STONE. A STONE FOR EACH NAME.');
  assert.equal(T('terrace_sign'), "THE KEEPERS' TERRACE. MIND THE EDGE. THE EDGE DOES NOT MIND YOU.");
  assert.equal(T('moor_sign'), 'THE HIGH MOOR. CHIME POSTS EVERY FIFTY PACES. FOLLOW THEM OR DO NOT.');
  assert.equal(T('hill_sign'), 'LARCHHILL. MIND THE BEES. THE BEES MIND YOU.');
  assert.equal(T('x1_orchard_gate'), 'ORCHARD GATE SHUT TILL THE LAMBING. USE THE SOUTH GATE. - HOLT');
  assert.equal(T('x1_wall_crack'), 'Wick says nobody knows about this hole. Everybody knows.');
  assert.equal(T('x1_cleft_sign'), 'A black cleft before an old stair. No bridge.');
  // The bark for the first Appraise on an object (Mira, only when she has joined).
  const bark = BARKS.first_appraise_object;
  assert.deepEqual(bark, X1.text.X1_BARKS.first_appraise_object);
  assert.equal(bark[0].if, 'mira_joined');
  assert.equal(bark[0].lines[0].text, "There is something wrong with that scarecrow's pockets.");
  // Fonts read as rest points, not rules.
  for (const id of ['thornfold_hearth', 'barrow_hearth', 'culvert_font', 'cellar_font']) assert.ok(T(id).length > 40);
});

test('the chime posts: nine, the ninth reads KEPT, one constant', () => {
  assert.equal(N.chimePosts.length, 9);
  assert.equal(N.chimePosts[8], 'KEPT');
  for (let i = 0; i < 9; i++) assert.ok(inspectBoxes(`chime_${i + 1}`, () => false).map((b) => b.text).join(' ').includes(N.chimePosts[i]), `chime_${i + 1}`);
  assert.equal(new Set(N.chimePosts).size, 9);
  for (const w of N.chimePosts) assert.match(w, /^[A-Z]+$/);
});

test('the bestiary: three entries that agree with the foes (name and flavor) once X1-battle has written them', async () => {
  assert.deepEqual(Object.keys(X1.text.X1_BESTIARY).sort(), ['barrow_reeve', 'barrow_shade', 'millstone_golem']);
  for (const [id, e] of Object.entries(X1.text.X1_BESTIARY)) {
    assert.equal(BESTIARY[id], e);
    assert.ok(e.name && e.where);
    for (const b of e.lore) assert.ok(fits(b), `${id}: ${boxLines(b).join(' / ')}`);
  }
  let rows = null;
  try { ({ X1_ENEMY_ROWS: rows } = await import('../../src/data/x1/enemies.js')); } catch { rows = null; }
  if (!rows) return;
  for (const [id, e] of Object.entries(X1.text.X1_BESTIARY)) {
    if (!rows[id]) continue;
    assert.equal(e.name, rows[id].name, `${id}: name differs from enemies.js`);
    if (rows[id].flavor) assert.equal(e.lore[0], rows[id].flavor, `${id}: first lore box should be the enemies.js flavor`);
  }
  assert.match(X1.text.X1_BESTIARY.barrow_reeve.lore.join(' '), new RegExp(N.reeve.name));
});

test('names to confirm: twelve stones, three Keepers, the Reeve, the song, nine posts; ASCII, new, in no order, no game', () => {
  assert.equal(N.stones.length, 12);
  assert.equal(new Set(N.stones).size, 12);
  assert.equal(N.keepers.length, 3);
  assert.deepEqual(N.keepers.map((k) => k.station), ['milestone', 'archive_door', 'watchtower']);
  assert.ok(N.reeve.name && N.reeve.title && N.song.title && N.song.firstLine && N.song.secondLine);
  const everyName = [N.reeve.name, N.reeve.title, ...N.stones, ...N.keepers.flatMap((k) => [k.name, k.trade, k.built]), N.song.title, N.song.firstLine, N.song.secondLine, ...N.chimePosts];
  for (const n of everyName) { assert.ok(/^[\x20-\x7e]+$/.test(n), `non-ASCII in ${n}`); assert.ok(!n.includes(EM)); }
  // No collision with any named person of Episodes 1 to 3 or the Episode 2 expansion (first names, surnames and the Reeve).
  const tokens = [N.reeve.name, ...N.stones, ...N.keepers.map((k) => k.name)].flatMap((n) => n.split(/\s+/)).map((t) => t.toLowerCase());
  for (const t of tokens) assert.ok(!CANON_NAMES.has(t), `${t} is already somebody's name`);
  assert.equal(new Set(tokens).size, tokens.length, 'no repeated token among the placeholder names');
  // No alphabetical pattern: neither the given names, the surnames nor the posts run in order, forwards or backwards.
  const ordered = (a) => { const up = [...a].sort(); const down = [...up].reverse(); return a.every((x, i) => x === up[i]) || a.every((x, i) => x === down[i]); };
  const first = N.stones.map((n) => n.split(' ')[0]); const last = N.stones.map((n) => n.split(' ').slice(1).join(' '));
  assert.ok(!ordered(first) && !ordered(last) && !ordered(N.chimePosts) && !ordered(N.keepers.map((k) => k.name)));
  const initials = first.map((n) => n[0]).join('');
  assert.ok(!/(ABC|BCD|CDE|DEF|EFG|FGH|GHI|HIJ|IJK|JKL|KLM|LMN|MNO|NOP|OPQ|PQR|QRS|RST|STU|TUV|UVW|VWX|WXY|XYZ)/.test(initials), `initials ${initials} run in order`);
  const sortedMatches = first.filter((x, i) => i > 0 && x > first[i - 1]).length;
  assert.ok(sortedMatches > 2 && sortedMatches < 9, 'given names are neither sorted nor reverse sorted');
  // Placed where the scenes need them: the first nine on the roll, the last three only in Quill's copy.
  const roll = BOOKS.burial_roll.pages.join(' ');
  for (const n of N.stones.slice(0, 9)) assert.ok(roll.includes(n), `${n} is on the roll`);
  for (const n of N.stones.slice(9)) assert.ok(!roll.includes(n), `${n} must not be on the roll`);
  const niches = BOOKS.barrow_names.pages.join(' ');
  for (const n of N.stones) assert.ok(niches.includes(n), `${n} is in the niches`);
  assert.ok(niches.includes(N.reeve.name));
});

test('canon and tone: nobody explains the forgetting, no word games, no em dashes, ASCII, no modern slang', () => {
  const owned = ['flags', 'npcs', 'quests', 'text', 'story'].map((n) => join(NEXT, 'src', 'data', 'x1', `${n}.js`));
  const docs = [join(NEXT, 'docs', 'story', 'STAGING_X1.md'), ...listFiles(join(NEXT, 'qa', 'content'), (p) => /[\\/]x1_[^\\/]*$/.test(p))];
  const banned = [['cross', 'word'], ['ana', 'gram'], ['word', ' puzzle'], ['word', '-puzzle'], ['letter', ' puzzle'], ['guess the', ' word'], ['un', 'scramble'],
    ['fill in the', ' blank'], ['spell the', ' word'], ['word', ' search']].map(([a, b]) => new RegExp(a + b, 'i'));
  for (const p of [...owned, ...docs]) {
    const t = readFileSync(p, 'utf8');
    assert.ok(!t.includes(EM) && !t.includes(BAR), `em dash in ${p}`);
    for (const re of banned) assert.ok(!re.test(t), `${p} mentions ${re.source}`);
  }
  // All player text of the expansion, gathered.
  const text = [];
  const add = (v) => { if (v == null) return; if (typeof v === 'string') text.push(v); else if (Array.isArray(v)) v.forEach(add); else if (typeof v === 'object') for (const k of ['text', 'lines', 'pages', 'lore', 'journal', 'title', 'sub', 'name', 'about']) if (k in v) add(v[k]); };
  add(Object.values(X1.text.X1_LINES)); add(Object.values(X1.text.X1_BOOKS)); add(Object.values(X1.text.X1_BESTIARY)); add(Object.values(X1.text.X1_BANNERS));
  add(Object.values(X1.text.X1_BARKS)); add(Object.values(X1_NPCS).map((n) => n.talk)); add(Object.values(X1_TALK_PREPEND));
  add(X1.quests.X1_SIDE_QUESTS.flatMap((q) => [q.title, ...q.steps.flatMap((s) => [s.journal, ...s.chat])])); add(Object.values(X1.quests.BANTER_X1));
  assert.ok(text.length > 150, `only ${text.length} strings gathered`);
  for (const s of text) {
    assert.ok(/^[\x20-\x7e]*$/.test(s), `non-ASCII text: ${s}`);
    assert.doesNotMatch(s, /\berased\b|\bbeing eaten\b|\bforgetting spell\b|\bmagic\b|list-writer|\bEraser\b|First Keeper|\bcurse\b/i, `explains the forgetting: ${s}`);
    assert.doesNotMatch(s, /\b(lol|okay|ok|awesome|yeah|dude|guys)\b/i, `modern slang: ${s}`);
  }
  // Scenes: gather through the explore runs the story test did; here read the source of the module for the same checks.
  const src = readFileSync(owned[4], 'utf8');
  assert.doesNotMatch(src, /\berased\b|\bforgetting spell\b|list-writer|\bEraser\b/i);
  // Hal's mill lines stay behind the Archivore; the mill is a sound before it.
  assert.ok(X1.story.SCENE_CONDITIONS.mill_start.if.includes('archivore_defeated'));
  assert.ok(!FLAGS.mill_started.includes('Eraser'));
  void SPEAKER_NAMES; void resolve;
});

test('the Keepers refused the order: the Cellar note says they did not take the names out, and does not say who gave the order', () => {
  const pages = BOOKS.cellar_note.pages.join(' ');
  assert.match(pages, /did not obey/);
  assert.match(pages, /did not take the names out/);
  assert.doesNotMatch(pages, /who gave|high Keepers|First Library/i);
});

test('a region switched off removes its NPCs (and only its NPCs)', () => {
  const ids = (off) => X1.npcs.activeNpcIds((r) => r !== off).sort();
  const all = Object.keys(X1_NPCS).sort();
  assert.deepEqual(X1.npcs.activeNpcIds(() => true).sort(), all);
  assert.deepEqual(all.filter((id) => !ids('west').includes(id)).sort(), ['brindle', 'fold_sheep_a', 'fold_sheep_b', 'stray_1', 'stray_2', 'stray_3', 'stray_4', 'stray_5', 'tamsin']);
  assert.deepEqual(all.filter((id) => !ids('north').includes(id)), ['hesper']);
  assert.deepEqual(all.filter((id) => !ids('south').includes(id)), ['ferrick']);
  assert.deepEqual(all.filter((id) => !ids('wild').includes(id)).sort(), ['odo', 'yarrow']);
  assert.deepEqual(X1.npcs.activeNpcIds(() => false), []);
});
