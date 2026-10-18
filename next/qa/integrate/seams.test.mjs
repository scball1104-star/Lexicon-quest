// Seams fixed while wiring Episode 1 end to end (W3-integrate). Each test pins one fix so it stays fixed:
//   - Enter in text entry ends the name instead of picking the glyph under the cursor (input.js);
//   - followers appear beside the trail instead of on the leader when the tile behind is a wall (pathfind.js);
//   - a `pit` area event only decides where pit TILES drop to; floor inside the area is floor (events.js);
//   - list rows accept a touch within one row of the list (list.js);
//   - the debug battle game carries the running hero's name (battle.js / makeDebugGame).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../../src/core/input.js';
import { trailingTiles } from '../../src/world/pathfind.js';
import { pitDropAt, pushBlock, interactables } from '../../src/world/events.js';
import { List } from '../../src/ui/list.js';
import { makeDebugGame } from '../../src/scenes/battle.js';
import { grant } from '../../src/game/inventory.js';
import { createGame } from '../../src/game/state.js';

const key = (k, code, down = true) => ({ key: k, code: code || k, preventDefault() {} });

test('Enter while typing a name goes to the text buffer, not to confirm/start', () => {
  const input = new Input({});
  input.startText();
  input._onKey(key('A', 'KeyA'), true); input._onKey(key('A', 'KeyA'), false);
  input._onKey(key('Enter'), true); input._onKey(key('Enter'), false);
  input.update();
  assert.deepEqual(input.takeText(), ['A', 'Enter']);
  assert.equal(input.pressed('confirm'), false, 'Enter did not fire confirm (it would pick the grid glyph)');
  assert.equal(input.pressed('start'), false);
  input.stopText();
  input._onKey(key('Enter'), true);
  input.update();
  assert.equal(input.pressed('confirm'), true, 'outside text entry Enter is still confirm');
});

test('followers line up behind the leader on open ground', () => {
  const open = () => true;
  assert.deepEqual(trailingTiles(open, 10, 10, 'up', 2), [[10, 11], [10, 12]]);
  assert.deepEqual(trailingTiles(open, 10, 10, 'right', 2), [[9, 10], [8, 10]]);
});

test('followers fall in beside the trail when a wall is behind (interior doorway), never on the leader', () => {
  // the hero lands at (10,13) facing up with the door tile (10,14) open and the wall row 15 behind it
  const open = (x, y) => y <= 14 && !(x === 10 && y === 13);
  const spots = trailingTiles(open, 10, 13, 'up', 2);
  assert.equal(spots.length, 2);
  assert.deepEqual(spots[0], [10, 14]);
  assert.ok(!spots.some(([x, y]) => x === 10 && y === 13), 'nobody stands on the leader');
  assert.notDeepEqual(spots[0], spots[1]);
  // completely boxed in: fewer tiles come back and the caller stacks the rest
  assert.deepEqual(trailingTiles(() => false, 5, 5, 'down', 2), []);
});

test('a pit area event only redirects pit tiles; the map pitTo is the default', () => {
  const area = { present: true, type: 'pit', ev: { to: ['archive_f3', 31, 24, 'down'] } };
  const field = { byTile: new Map([['30,13', [area]]]), map: { mod: { pitTo: ['archive_f3', 1, 1, 'down'] } } };
  assert.deepEqual(pitDropAt(field, 30, 13), ['archive_f3', 31, 24, 'down']);
  assert.deepEqual(pitDropAt(field, 2, 2), ['archive_f3', 1, 1, 'down']);
  area.present = false;
  assert.deepEqual(pitDropAt(field, 30, 13), ['archive_f3', 1, 1, 'down']);
});

function fakeField(entsByTile) {
  const byTile = new Map(Object.entries(entsByTile));
  return {
    byTile,
    map: { codeAt: () => 'none', mod: {} },
    actorAt: () => null,
    engine: { audio: { sfx() {} } },
    slideProp: () => ({ then() {} }),
    bark() {},
  };
}

test('a push block slides onto the shards of a broken pot but not onto a whole one', () => {
  const whole = { present: true, type: 'pot', state: 'whole', ev: {} };
  const broken = { present: true, type: 'pot', state: 'broken', ev: {} };
  const mk = (pot) => {
    const block = { id: 'b', type: 'block', x: 5, y: 5, cells: [[5, 5]], data: {}, prop: { x: 5, y: 5 }, ev: {} };
    const field = fakeField({ '5,5': [block], '6,5': [pot] });
    return { field, block };
  };
  let t = mk(whole);
  assert.equal(pushBlock(t.field, t.block, 'right'), false, 'a whole pot stops the block');
  t = mk(broken);
  assert.equal(pushBlock(t.field, t.block, 'right'), true, 'shards do not');
  assert.deepEqual([t.block.x, t.block.y], [6, 5]);
});

test('a wandering NPC is talked to where it stands, and its empty home tile is just floor', () => {
  const tess = { id: 'tess', type: 'npc', x: 18, y: 27, cells: [[18, 27]], present: true, ev: { id: 'tess', type: 'npc' }, state: null, data: {},
    actor: { id: 'tess', kind: 'npc', tx: 20, ty: 26, moving: false, fromX: 20 * 16, fromY: 26 * 16 } };
  const sign = { id: 'notice_board', type: 'sign', x: 17, y: 26, cells: [[17, 26]], present: true, ev: { text: 'notice_board' }, state: null, data: {} };
  const field = {
    byTile: new Map([['18,27', [tess]], ['17,26', [sign]]]),
    entities: new Map([['tess', tess], ['notice_board', sign]]),
    actors: [tess.actor, { id: 'hero', kind: 'party', tx: 19, ty: 26 }],
    leader: { dir: 'up' },
  };
  assert.deepEqual(interactables(field, 18, 27), [], 'her home tile: nobody there');
  assert.deepEqual(interactables(field, 20, 26).map((e) => e.id), ['tess'], 'where she stands');
  assert.deepEqual(interactables(field, 17, 26).map((e) => e.id), ['notice_board'], 'signs are where they were placed');
  // mid-step she still answers from the tile she is leaving
  tess.actor.moving = true; tess.actor.tx = 21; tess.actor.ty = 26;
  assert.deepEqual(interactables(field, 20, 26).map((e) => e.id), ['tess']);
  assert.deepEqual(interactables(field, 21, 26).map((e) => e.id), ['tess']);
});

test('list rows accept a touch within one row of slop and clamp to the nearest row', () => {
  const list = new List({ x: 100, y: 50, w: 80, rowH: 11, rows: 4, items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });
  assert.equal(list.pointerRow(140, 49), -1, 'no slop: just above the list misses');
  assert.equal(list.pointerRow(140, 45, 11), 0, 'one row of slop above lands on the first row');
  assert.equal(list.pointerRow(140, 50 + 44 + 5, 11), 3, 'below the last row lands on the last row');
  assert.equal(list.pointerRow(95, 60, 11), 0, 'a little left of the list still counts');
  assert.equal(list.pointerRow(140, 50 + 44 + 12, 11), -1, 'more than a row away misses');
});

test('gear from a chest or a scene lands in the bag as an instance; consumables and key items count', () => {
  const g = createGame('Arden');
  const pike = grant(g, 'iron_pike');
  assert.equal(pike.kind, 'gear');
  assert.ok(g.gear.some((it) => it.uid === pike.uid), 'the pike is an equippable instance');
  assert.equal(g.items.iron_pike, undefined, 'not a counted item');
  assert.equal(grant(g, 'thornwake').kind, 'gear', 'uniques too');
  assert.equal(grant(g, 'potion', 2).kind, 'item');
  assert.equal(g.items.potion, 4);
  assert.equal(grant(g, 'lantern_of_recall').kind, 'key');
  assert.equal(g.items.lantern_of_recall, 1);
});

test('the debug battle game keeps the chosen hero name', () => {
  assert.equal(makeDebugGame('valley_wolves', { name: 'Arden' }).party[0].name, 'Arden');
  assert.equal(makeDebugGame('valley_wolves', {}).party[0].name, 'Arden');
  assert.notEqual(makeDebugGame('archivore', { name: 'Wren' }).party[0].name, 'Hero');
});
