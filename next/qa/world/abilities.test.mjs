// W9 field abilities without a browser: which abilities a party has and how the wheel cycles, what a dash meets
// (scanLane), what Appraise reads (appraiseTarget), the Bestiary contract it writes (the battle shows what Mira
// read), the heavy block that only Bram's Shove moves, breakables and what hides behind them, and the art.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abilitiesFor, selectedAbility, cycleAbility, scanLane, appraiseTarget, appraisalRows, writeAppraisal,
  encounterAppraised, abilitiesOf, ABILITY_BTN, CYCLE_BTN, DASH_TILES } from '../../src/world/abilities.js';
import { SPRITES, PAL, rasterize, rasterizeSheet, dbEntries } from '../../src/world/fieldart.js';
import { pushBlock, moveBlock, blockCanMove } from '../../src/world/events.js';
import { createGame, addMember } from '../../src/game/state.js';
import { bestiaryForBattle } from '../../src/battle/scene/rewards.js';
import { createEncounterBattle } from '../../src/battle/rules.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { FIELD_ABILITIES, HELP, BARKS } from '../../src/data/text.js';
import { LANTERN_BTN } from '../../src/scenes/field.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function party(...ids) { const g = createGame('Arden'); for (const id of ids) addMember(g, id); return g; }

test('abilities follow the party: Dash Strike always, Appraise and Shove with Mira and Bram, the Lantern once carried', () => {
  assert.deepEqual(abilitiesFor(party()), ['dash']);
  assert.deepEqual(abilitiesFor(party('mira')), ['dash', 'appraise']);
  const g = party('mira', 'bram');
  assert.deepEqual(abilitiesFor(g), ['dash', 'appraise', 'shove']);
  g.items.lantern_of_recall = 1;
  assert.deepEqual(abilitiesFor(g), ['dash', 'appraise', 'lantern', 'shove']);
  assert.deepEqual(abilitiesOf(g, 'mira'), ['appraise', 'lantern']);
  assert.deepEqual(abilitiesOf(g, 'bram'), ['shove']);
  for (const id of ['dash', 'appraise', 'lantern', 'shove']) {
    assert.ok(FIELD_ABILITIES[id].name, id);
    assert.ok(HELP.field[id] && HELP.field[id].length <= 40, `help line for ${id}`);
  }
});

test('the wheel: pageL cycles through what the party has, the pick is saved, a missing pick falls back', () => {
  const g = party('mira', 'bram');
  assert.equal(selectedAbility(g), 'dash');
  assert.equal(cycleAbility(g, 1), 'appraise');
  assert.equal(cycleAbility(g, 1), 'shove');
  assert.equal(cycleAbility(g, 1), 'dash');
  assert.equal(cycleAbility(g, -1), 'shove');
  assert.equal(g.fieldAbility, 'shove');
  const alone = party();
  alone.fieldAbility = 'shove';                      // Bram is not here (a save from a later party, a debug warp)
  assert.equal(selectedAbility(alone), 'dash');
  assert.equal(cycleAbility(alone, 1), 'dash');
});

test('the touch ability button sits where the Lantern button was (a tap there still raises the Lantern)', () => {
  assert.deepEqual(ABILITY_BTN, { x: 322, y: 128, w: 58, h: 18 });
  assert.equal(LANTERN_BTN, ABILITY_BTN);
  assert.ok(CYCLE_BTN.x + CYCLE_BTN.w <= ABILITY_BTN.x, 'the swap tab sits left of the button');
});

// ------------------------------------------------------------------------------------------------ lanes
/** A query over a char grid: '.' floor, '#' wall, '~' water, 'p' pit; things: { 'x,y': ent | actor }. */
function lane(rows, things = {}) {
  const at = (x, y) => things[`${x},${y}`];
  return {
    inBounds: (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[0].length,
    code: (x, y) => ({ '.': 'none', '#': 'solid', '~': 'water', 'p': 'pit', 'd': 'none' })[rows[y][x]],
    ents: (x, y) => { const t = at(x, y); return t && t.type ? [t] : []; },
    actor: (x, y) => { const t = at(x, y); return t && t.kind ? t : null; },
    enemyAt: (x, y) => { const t = at(x, y); return t && t.kind === 'enemy' ? t : null; },
    stop: (x, y) => rows[y][x] === 'd',
  };
}
const brk = (kind, extra = {}) => ({ type: 'object', ev: { breakable: kind }, state: 'whole', data: {}, ...extra });

test('scanLane: a free dash runs three tiles; walls, water and pits stop it short', () => {
  assert.equal(DASH_TILES, 3);
  let r = scanLane(lane(['......']), 0, 0, 'right');
  assert.deepEqual(r.path, [[1, 0], [2, 0], [3, 0]]);
  assert.equal(r.hit, null);
  r = scanLane(lane(['..#...']), 0, 0, 'right');
  assert.deepEqual(r.path, [[1, 0]]);
  assert.equal(r.hit.kind, 'wall');
  assert.equal(scanLane(lane(['.~....']), 0, 0, 'right').hit.kind, 'edge');
  assert.equal(scanLane(lane(['..p...']), 0, 0, 'right').hit.kind, 'edge');
  r = scanLane(lane(['..d...']), 0, 0, 'right');
  assert.deepEqual(r.path, [[1, 0], [2, 0]]);
  assert.ok(r.stopAt, 'a door or step trigger ends the dash on it');
});

test('scanLane: pots shatter on the way, breakables, blocks and enemies are what it strikes', () => {
  const pot = { type: 'pot', state: 'whole', ev: {}, data: {} };
  let r = scanLane(lane(['.....'], { '1,0': pot }), 0, 0, 'right');
  assert.deepEqual(r.pots, [pot]);
  assert.equal(r.path.length, 3, 'the dash carries on through the pot');
  const roots = brk('roots');
  r = scanLane(lane(['.....'], { '2,0': roots }), 0, 0, 'right');
  assert.equal(r.hit.kind, 'roots'); assert.equal(r.hit.ent, roots); assert.deepEqual(r.hit.at, [2, 0]);
  assert.equal(scanLane(lane(['.....'], { '1,0': brk('rock') }), 0, 0, 'right').hit.kind, 'rock');
  assert.equal(scanLane(lane(['.....'], { '1,0': brk('rock', { state: 'broken' }) }), 0, 0, 'right').hit, null, 'a broken one is open floor');
  assert.equal(scanLane(lane(['.....'], { '1,0': brk('rock', { data: { concealed: true } }) }), 0, 0, 'right').hit, null);
  const heavy = { type: 'block', ev: { heavy: true }, data: {} };
  assert.equal(scanLane(lane(['.....'], { '1,0': heavy }), 0, 0, 'right').hit.kind, 'heavy');
  assert.equal(scanLane(lane(['.....'], { '1,0': { type: 'block', ev: {}, data: {} } }), 0, 0, 'right').hit.kind, 'block');
  const wolf = { kind: 'enemy', tx: 3, ty: 0 };
  r = scanLane(lane(['.....'], { '3,0': wolf }), 0, 0, 'right');
  assert.equal(r.hit.kind, 'enemy'); assert.equal(r.hit.actor, wolf); assert.equal(r.path.length, 2);
  assert.equal(scanLane(lane(['.....'], { '1,0': { kind: 'npc' } }), 0, 0, 'right').hit.kind, 'actor');
  assert.equal(scanLane(lane(['.', '.', '.', '.'], { '0,1': roots }), 0, 3, 'up').hit.kind, 'roots', 'every direction');
});

test('appraiseTarget: the nearest enemy up to five tiles ahead, one tile off the line, never through a wall', () => {
  const wolf = { kind: 'enemy' };
  assert.equal(appraiseTarget(lane(['.......'], { '5,0': wolf }), 0, 0, 'right'), wolf);
  assert.equal(appraiseTarget(lane(['........'], { '6,0': wolf }), 0, 0, 'right'), null, 'six tiles is too far');
  assert.equal(appraiseTarget(lane(['......', '......'], { '3,1': wolf }), 0, 0, 'right'), wolf, 'one tile off the line');
  assert.equal(appraiseTarget(lane(['......', '......'], { '1,1': wolf }), 0, 0, 'right'), null, 'beside the leader is not ahead');
  assert.equal(appraiseTarget(lane(['..#...'], { '4,0': wolf }), 0, 0, 'right'), null, 'a wall hides it');
  assert.equal(appraiseTarget(lane(['......'], { '4,0': wolf }), 5, 0, 'right'), null, 'behind the leader');
});

// ------------------------------------------------------------------------------------------------ the Bestiary
test('Appraise writes the Bestiary in the battle\'s contract, so the fight shows the weaknesses instead of "?"', () => {
  const g = party('mira', 'bram');
  const rows = appraisalRows('valley_pack');
  assert.deepEqual(rows.map((r) => [r.id, r.count]), [['briar_wolf', 2], ['ink_slime', 1]]);
  assert.deepEqual(rows[0].weak, ENEMIES.briar_wolf.weak);
  assert.equal(encounterAppraised(g, 'valley_pack'), false);
  const keys = writeAppraisal(g, 'valley_pack');
  assert.deepEqual(keys.sort(), ['briar_wolf', 'ink_slime']);
  for (const k of keys) {
    const e = g.bestiary[k];
    assert.equal(e.appraised, true);
    assert.deepEqual([...e.weak].sort(), [...ENEMIES[k].weak].sort());
    assert.equal(e.seen, 0, 'appraising is not a sighting in battle');
  }
  assert.equal(encounterAppraised(g, 'valley_pack'), true);
  // the battle reads the same entries: nothing about the appraised foes is unknown
  const { battle } = createEncounterBattle('valley_pack', { party: g.party, rng: () => 0.5, bestiary: bestiaryForBattle(g), noElite: true });
  for (const u of battle.units().filter((x) => x.side === 'enemy')) {
    const k = battle.knowledge(u.uid);
    assert.equal(k.unknown, 0, `${u.id}: every weakness known`);
    assert.deepEqual([...k.weak].sort(), [...ENEMIES[u.id].weak].sort());
  }
  // and an unappraised group still starts with "?"
  const fresh = party();
  const b2 = createEncounterBattle('valley_scarab', { party: fresh.party, rng: () => 0.5, bestiary: bestiaryForBattle(fresh), noElite: true }).battle;
  assert.ok(b2.units().filter((x) => x.side === 'enemy').some((u) => b2.knowledge(u.uid).unknown > 0));
});

// ------------------------------------------------------------------------------------------------ heavy blocks
function blockField(rows) {
  const sounds = [];
  const f = {
    frame: 100, game: party('bram'), byTile: new Map(), entities: new Map(), barks: [],
    engine: { audio: { sfx: (id) => sounds.push(id) }, after: (n, fn) => fn() },
    map: { codeAt: (x, y) => (rows[y] && rows[y][x] === '.' ? 'none' : 'solid') },
    actorAt: () => null, bark: (k) => f.barks.push(k), leader: null,
    abilities: { has: (id) => id === 'shove' },
    slideProp: (p, x, y) => { p.x = x; p.y = y; return Promise.resolve(); },
  };
  f.sounds = sounds;
  return f;
}
function block(f, id, x, y, heavy) {
  const ent = { id, type: 'block', x, y, cells: [[x, y]], ev: { heavy }, present: true, data: {}, prop: { x, y, offX: 0, offY: 0 } };
  f.entities.set(id, ent);
  f.byTile.set(`${x},${y}`, [ent]);
  return ent;
}

test('a heavy block rocks but stays put for the leader; Bram\'s Shove (moveBlock) moves it one tile', async () => {
  const f = blockField(['.....', '.....']);
  const h = block(f, 'h', 2, 0, true);
  assert.equal(pushBlock(f, h, 'right'), false);
  assert.deepEqual([h.x, h.y], [2, 0], 'walking into it does not move it');
  assert.ok(f.barks.includes('first_heavy_block'), 'Bram says it is his job, once');
  assert.ok(blockCanMove(f, h, 'right'));
  const slide = moveBlock(f, h, 'right', { frames: 22 });
  assert.ok(slide && typeof slide.then === 'function');
  await slide;
  assert.deepEqual([h.x, h.y], [3, 0]);
  assert.deepEqual(f.byTile.get('3,0'), [h], 'the tile index follows the block');
  assert.ok(!f.barks.includes('first_block_push'), 'the light block remark is not spent on a heavy one');
  // a light block still moves for the leader
  const l = block(f, 'l', 1, 1, false);
  assert.equal(pushBlock(f, l, 'right'), true);
  // and nothing slides into a wall
  const w = block(f, 'w', 4, 1, true);
  assert.equal(blockCanMove(f, w, 'right'), false);
  assert.equal(moveBlock(f, w, 'right'), false);
});

// ------------------------------------------------------------------------------------------------ art and text
test('field art: every sprite rasterizes at its size, in the master palette, inside the sheet', () => {
  const pal = new Set(JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'palette.json'), 'utf8')).colors.map((c) => c.toLowerCase()));
  for (const [k, v] of Object.entries(PAL)) assert.ok(pal.has(v.toLowerCase()), `${k} ${v} is a master palette color`);
  for (const [id, s] of Object.entries(SPRITES)) {
    const img = rasterize(s.rows);
    const icon = id === 'ab_dash' || id === 'ab_appraise' || id === 'ab_shove';
    assert.deepEqual([img.w, img.h], icon ? [12, 12] : [16, 32], id);
    assert.ok(img.data.some((v, i) => i % 4 === 3 && v === 255), `${id} has pixels`);
  }
  const sheet = rasterizeSheet();
  assert.equal(sheet.data.length, sheet.w * sheet.h * 4);
  const db = dbEntries();
  assert.equal(db.objects.heavy_block.collision, 'solid');
  assert.equal(db.tiles.ab_root_wall.collision, 'solid');
  assert.equal(db.tiles.ab_root_wall_broken.collision, 'none');
  assert.equal(db.tiles.ab_cliff_crack.collision, 'solid');
  assert.equal(db.tiles.ab_cliff_grotto.collision, 'none');
});

test('one hint line per ability: Bram at the heavy block, Mira at the crack and at a foe she could read', () => {
  assert.equal(BARKS.first_heavy_block[0].lines[0].who, 'bram');
  assert.equal(BARKS.first_dash_target[0].lines[0].who, 'mira');
  assert.equal(BARKS.first_appraise_target[0].lines[0].who, 'mira');
  // W15: each names its button with the ability it means, so a touch screen shows the touch button's word
  for (const [k, ab] of [['first_heavy_block', 'shove'], ['first_dash_target', 'dash'], ['first_appraise_target', 'appraise']]) {
    assert.equal(BARKS[k].length, 1);
    assert.equal(BARKS[k][0].lines.length, 1);
    assert.ok(BARKS[k][0].lines[0].text.includes(`{i:btn_pageR_${ab}}`), `${k} names the button`);
  }
  assert.match(BARKS.first_appraise_target[0].lines[0].text, /\{i:btn_pageL\}/, 'and the wheel button for the lens');
});
