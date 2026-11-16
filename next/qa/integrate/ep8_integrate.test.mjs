// E8-integrate (EPISODE8_PLAN 3, 10, 12): the seams the autoplay route walks over, in pure node (no browser), as E7-integrate's
// ep7_integrate.test.mjs: an Episode 7 credits fixture reaches ep8_morning only with the switch on; an ended save never runs an
// ending scene again (the post-game walk back into the Last Word); the return route's doors land on open ground; the endings are
// exclusive and permanent. Three seams the bot found are checked here (E8-fixes made them pass): nobody left in front of the
// Library door, the Librarian walks out before his flag hides him, and the gold line pays what the floor pays. Its own file: the
// map registries are memoized per process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { peekMap } from '../../src/world/maps.js';
import { register as registerMaps } from '../../src/data/ep8/maps.js';
import { register as registerEp8 } from '../../src/data/ep8/index.js';
import { scenes, GATE, SCENE_CONDITIONS, ENDINGS } from '../../src/data/ep8/story.js';
import { newGameEp8 } from '../../src/data/ep8/start.js';
import { EP8_GOLD_LINE } from '../../src/data/ep8/shops.js';
import { REWARDS_EP8 } from '../../src/data/ep8/quests.js';
import { loadDb, buildGrid, withFlags, present } from '../../tools/maps/mapcheck.mjs';
import { runOnce } from '../content/_harness.mjs';
import scriptorium from '../../src/data/maps/ep8_scriptorium.js';
import stair from '../../src/data/maps/ep8_stair.js';
import lastWord from '../../src/data/maps/ep8_last_word.js';
import libF2 from '../../src/data/maps/ep8_library_f2.js';

const ran = (log) => log.filter((e) => e.op !== 'hasFlag').length;
const setFlags = (log) => log.filter((e) => e.op === 'setFlag').map((e) => e.args[0]);
let credits = null;   // Episodes 1 to 7 done, ep8 not begun (the quick start's flags are an Episode 7 credits save's)
async function creditsFlags() {
  if (!credits) {
    await registerEp8();
    const g = newGameEp8('Arden');
    credits = Object.keys(g.flags).filter((f) => g.flags[f] && !['ep8_started', 'ep8_morning_done'].includes(f));
  }
  return credits;
}
const walkable = (db, mapId, x, y, f) => {
  const g = buildGrid({ ...withFlags(peekMap(mapId), new Set(f)), events: [] }, db);
  return g.code[y][x] === 'none';
};
// a save at the end of the main path (both scenes after the credits done), with one ending
const ENDED = ['ep8_started', 'ep8_morning_done', 'ep8_roofed', 'stair_arrived', 'first_rub_done', 'first_book_read', 'eraser_seen',
  'saw_scriptorium', 'scriptorium_arrived', 'read_learned', 'librarian_met', 'card_read', 'elowen_met', 'library_open', 'lib_f1_arrived',
  'ink_key_found', 'library_f1_done', 'lib_f2_arrived', 'sentry_defeated', 'library_f2_done', 'lib_f3_arrived', 'keeper_memory_c',
  'name_told', 'vex_arrived', 'eraser_defeated', 'lexicon_restored', 'fragment8_get', 'keeper_named', 'page_shelved', 'night_read',
  'eighth_star', 'hero_kept', 'scriptorium_open', 'home_reached', 'ep8_complete'];

test('an Episode 7 credits fixture reaches ep8_morning with EP8_LIVE on, and not with it off; never Fine Print, never an Episode 6 save, never twice', async () => {
  await registerMaps();
  const flags = await creditsFlags();
  assert.ok(flags.includes('ep7_complete'));
  const wake = peekMap('ep7_ph_watch').events.find((e) => e.id === 'ep8_wake');
  assert.ok(wake, 'the Watch carries the ep8 wake patch');
  assert.ok(present(wake, new Set(flags)), 'the wake trigger is present for the credits fixture');
  assert.ok(!present(wake, new Set([...flags, 'ep8_morning_done'])), 'and gone once the morning has played');
  const was = GATE.live;
  try {
    GATE.live = true;
    const on = await runOnce(scenes.ep8_morning, { flags, branchFlags: false, mapId: 'ep7_ph_watch' });
    const set = setFlags(on.log);
    assert.ok(set.includes('ep8_started') && set.includes('ep8_morning_done'), `live: the morning plays (${set})`);
    assert.equal(ran((await runOnce(scenes.ep8_morning, { flags: [...flags, 'tier_1'], branchFlags: false })).log), 0, 'never on a Fine Print save');
    assert.equal(ran((await runOnce(scenes.ep8_morning, { flags: flags.filter((f) => f !== 'ep7_complete'), branchFlags: false })).log), 0,
      'never on an Episode 6 save (no ep7_complete)');
    assert.equal(ran((await runOnce(scenes.ep8_morning, { flags: [...flags, 'ep8_morning_done'], branchFlags: false })).log), 0, 'once');
    GATE.live = false;
    assert.equal(ran((await runOnce(scenes.ep8_morning, { flags, branchFlags: false })).log), 0, 'switch off: nothing runs');
  } finally { GATE.live = was; }
  assert.equal(SCENE_CONDITIONS.ep8_morning.live, true);
});

test('the endings: last_choice sets exactly one ending flag, by the answer, and asks again only after No twice', async () => {
  const named = ENDED.slice(0, ENDED.indexOf('keeper_named') + 1);
  const ret = await runOnce(scenes.last_choice, { flags: named, branchFlags: false, decisions: [0, 0] });
  assert.ok(setFlags(ret.log).includes(ENDINGS.return.flag) && !setFlags(ret.log).includes(ENDINGS.choose.flag), 'Return, Yes: ending_return only');
  const ch = await runOnce(scenes.last_choice, { flags: named, branchFlags: false, decisions: [1, 0] });
  assert.ok(setFlags(ch.log).includes(ENDINGS.choose.flag) && !setFlags(ch.log).includes(ENDINGS.return.flag), 'Choose, Yes: ending_choose only');
  const no = await runOnce(scenes.last_choice, { flags: named, branchFlags: false, decisions: [0, 1, 1, 1] });
  assert.ok(!setFlags(no.log).some((f) => f.startsWith('ending_')), 'No twice: nothing set (the lectern asks again)');
  const lect = lastWord.events.find((e) => e.id === 'lectern_trig');
  assert.ok(present(lect, new Set(named)), 'the lectern asks while no ending is set');
  for (const end of ['ending_return', 'ending_choose']) assert.ok(!present(lect, new Set([...named, end])), `and never once ${end} is set`);
});

test('an ended save walks back into the Last Word: no ending scene runs again, whichever ending it holds', async () => {
  for (const end of ['ending_return', 'ending_choose']) {
    const flags = new Set([...ENDED, end]);
    for (const ev of lastWord.events.filter((e) => e.type === 'trigger')) {
      const id = ev.script;
      const stillThere = present(ev, flags);
      const r = await runOnce(scenes[id], { flags: [...flags], branchFlags: false, mapId: 'ep8_last_word' });
      assert.equal(ran(r.log), 0, `${end}: ${ev.id} (${id}) runs nothing on a post-game save${stillThere ? ' (present, guarded by its scene)' : ''}`);
    }
    for (const id of ['scriptorium_open', 'home', 'thirteenth_name', 'eraser_after', 'last_choice', 'last_page']) {
      const r = await runOnce(scenes[id], { flags: [...flags], branchFlags: false });
      assert.equal(ran(r.log), 0, `${end}: ${id} never plays again`);
    }
  }
});

test('the return route: the lexicon door, the stair lifts, the square return and the Stillheart stair door land on open ground', async () => {
  await registerMaps();
  const db = await loadDb();
  const flags = [...ENDED, 'ending_return'];
  const lex = scriptorium.events.find((e) => e.id === 'lexicon_door');
  assert.ok(!present(lex, new Set(ENDED.filter((f) => !['page_shelved', 'scriptorium_open', 'home_reached', 'ep8_complete'].includes(f)))), 'shut before the page is shelved');
  assert.ok(present(lex, new Set(flags)), 'open in the post-game');
  const doors = [['ep8_scriptorium', 'lexicon_door'], ['ep8_last_word', 'square_return'], ['ep8_stair', 'lift_foot'], ['ep8_stair', 'lift_margin'],
    ['ep8_stair', 'stair_down'], ['ep7_stillheart', 'stair_up']];
  for (const [map, id] of doors) {
    const ev = peekMap(map).events.find((e) => e.id === id);
    assert.ok(ev && present(ev, new Set(flags)), `${map}:${id} is there in the post-game`);
    const [to, x, y] = ev.to;
    assert.ok(walkable(db, to, x, y, flags), `${map}:${id} lands on open ground (${to} ${x},${y})`);
  }
  assert.deepEqual(stair.events.find((e) => e.id === 'lift_foot').to.slice(0, 3), ['ep8_stair', 23, 13], 'the page lift skips every book');
});

test('seam (story.js library_door): the scene leaves nobody on the cell in front of the Library door', async () => {
  const flags = ENDED.slice(0, ENDED.indexOf('elowen_met') + 1);
  const r = await runOnce(scenes.library_door, { flags, branchFlags: false, mapId: 'ep8_scriptorium' });
  const spawned = r.log.filter((e) => e.op === 'spawn').map((e) => e.args[0]);
  const gone = r.log.filter((e) => e.op === 'despawn').map((e) => e.args[0]);
  const door = scriptorium.events.find((e) => e.id === 'library_door');
  const front = scriptorium.marks.nox_gate;
  assert.deepEqual(front, [door.x, door.y + 1], 'nox_gate is the cell in front of the door');
  for (const id of spawned) {
    const at = r.log.find((e) => e.op === 'spawn' && e.args[0] === id).args[1].at;
    if (at === 'nox_gate') assert.ok(gone.includes(id), `${id} is left standing on nox_gate`);
  }
  assert.ok(spawned.includes('nox_t'), 'Nox opens the door');
});

test('seam (story.js meet_librarian): the Librarian walks out before librarian_met hides his map NPC', async () => {
  const flags = ENDED.slice(0, ENDED.indexOf('read_learned') + 1);
  const r = await runOnce(scenes.meet_librarian, { flags, branchFlags: false, mapId: 'ep8_sc_index' });
  const at = (pred) => r.log.findIndex(pred);
  const met = at((e) => e.op === 'setFlag' && e.args[0] === 'librarian_met');
  const walk = at((e) => e.op === 'walk' && e.args[0] === 'ep8_librarian');
  const gone = at((e) => e.op === 'despawn' && e.args[0] === 'ep8_librarian');
  assert.ok(walk >= 0 && met > walk && met > gone && gone > walk, `librarian_met (op ${met}) after his walk (op ${walk}) and despawn (op ${gone})`);
});

test('seam (the maps and the gold line): every chest and reward EP8_GOLD_LINE (and economy8) counts pays exactly that, where it says', async () => {
  await registerMaps();
  // [map, the line's name] -> what pays it: a chest event on that map, or a scene reward
  const PAYS = {
    'ep8_stair:the Forgotten Traveler Satchel': () => peekMap('ep8_stair').events.find((e) => e.id === 'satchel').gold,
    'ep8_library_f1:the Catalog shelf chest': () => peekMap('ep8_library_f1').events.find((e) => e.id === 'chest_cache').gold,
    'ep8_library_f2:the Seal Gallery chest': () => libF2.events.find((e) => e.id === 'chest_gallery').gold,
    'ep8_library_f2:the Uncensored Archive strongbox': () => libF2.events.find((e) => e.id === 'chest_archive').gold,
    'ep8_scriptorium:the Concordance': () => REWARDS_EP8.concordance.gold,
  };
  const all = [...EP8_GOLD_LINE.mainChests, ...EP8_GOLD_LINE.optionalChests];
  assert.deepEqual(all.map(([m, n]) => `${m}:${n}`).sort(), Object.keys(PAYS).sort(), 'the line names exactly these');
  for (const [m, n, g] of all) assert.equal(PAYS[`${m}:${n}`](), g, `${n} (${m})`);
  const conc = await runOnce(scenes.concordance_light, { flags: [...ENDED, 'concordance_started', 'testimony_ione', 'testimony_fen', 'testimony_elowen'], branchFlags: false });
  assert.ok(conc.log.some((e) => e.op === 'give' && e.args[0] === 'gold' && e.args[1] === REWARDS_EP8.concordance.gold), 'the Concordance gives its gold');
});
