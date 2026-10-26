// X1-world: Appraise on objects (EXPANSION1_PLAN 11.1), one contract for both expansions. Pure target selection, the live
// field (real TileMap and events.js, fake engine): the wall blocks the lens, the reveal, the bark, a save and a load.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appraiseTarget, APPRAISE_RANGE } from '../../src/world/abilities.js';
import { appraiseObject, appraiseObjectAt, appraiseBoxes, behindTarget, interact, interactables, isAppraiseObject } from '../../src/world/events.js';
import { createGame, addMember, serialize, deserialize, isOpened } from '../../src/game/state.js';
import { BARKS } from '../../src/data/text.js';
import { takeBark } from '../../src/game/story.js';
import { makeField, stand, FIXTURE } from './x1_fixture.mjs';

// ------------------------------------------------------------------------------------------------ the pure scan
/** A query over a char grid ('.' floor, '#' wall); things { 'x,y': enemy | object entity }. */
function lane(rows, things = {}) {
  const at = (x, y) => things[`${x},${y}`];
  return {
    inBounds: (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[0].length,
    code: (x, y) => (rows[y][x] === '#' ? 'solid' : 'none'),
    actor: () => null,
    enemyAt: (x, y) => { const t = at(x, y); return t && t.kind === 'enemy' ? t : null; },
    objectAt: (x, y) => { const t = at(x, y); return t && t.type === 'object' ? t : null; },
  };
}
const obj = (x, y) => ({ type: 'object', id: `o${x}${y}`, x, y, ev: { appraise: true } });
const wolf = { kind: 'enemy', tx: 0, ty: 0 };

test('the existing Appraise range is 5 tiles (the two plans guessed 5 and 3; the engine constant wins)', () => {
  assert.equal(APPRAISE_RANGE, 5);
});

test('appraiseTarget reads objects like enemies: five tiles, one tile off the line from two out, never through a wall', () => {
  const o = obj(5, 0);
  let t = appraiseTarget(lane(['.......'], { '5,0': o }), 0, 0, 'right');
  assert.deepEqual([t.kind, t.ent, t.tx, t.ty], ['object', o, 5, 0], 'on the line, at the range');
  assert.equal(appraiseTarget(lane(['........'], { '6,0': obj(6, 0) }), 0, 0, 'right'), null, 'six tiles is too far');
  t = appraiseTarget(lane(['......', '......'], { '3,1': obj(3, 1) }), 0, 0, 'right');
  assert.equal(t && t.kind, 'object', 'one tile off the line');
  assert.equal(appraiseTarget(lane(['......', '......'], { '1,1': obj(1, 1) }), 0, 0, 'right'), null, 'beside the leader is not ahead');
  assert.equal(appraiseTarget(lane(['..#...'], { '4,0': obj(4, 0) }), 0, 0, 'right'), null, 'a wall hides it');
  assert.equal(appraiseTarget(lane(['......'], { '4,0': obj(4, 0) }), 5, 0, 'right'), null, 'behind the leader');
  for (const [dir, rows, at, from] of [['left', ['......'], '1,0', [5, 0]], ['down', ['.', '.', '.', '.'], '0,3', [0, 0]], ['up', ['.', '.', '.', '.'], '0,0', [0, 3]]]) {
    const [ox, oy] = at.split(',').map(Number);
    assert.equal(appraiseTarget(lane(rows, { [at]: obj(ox, oy) }), from[0], from[1], dir).kind, 'object', dir);
  }
});

test('an enemy at the same distance wins; a nearer object wins over a farther enemy; a query without objectAt is as before', () => {
  const o = obj(2, 0);
  const near = appraiseTarget(lane(['.....'], { '2,0': o, '4,0': wolf }), 0, 0, 'right');
  assert.equal(near.kind, 'object', 'the nearest thing is read');
  const tie = appraiseTarget(lane(['.....', '.....'], { '3,0': { ...wolf, tx: 3, ty: 0 }, '3,1': obj(3, 1) }), 0, 0, 'right');
  assert.equal(tie.kind, 'enemy', 'on the line beats off it, and an enemy beats an object in one slot');
  const q = lane(['.....'], { '3,0': wolf });
  delete q.objectAt;
  assert.equal(appraiseTarget(q, 0, 0, 'right'), wolf);
  assert.equal(appraiseTarget(lane(['.....'], {}), 0, 0, 'right'), null);
});

test('behind: a plain id stays a breakable, appraise:<id> names an Appraise object', () => {
  assert.equal(behindTarget('crack_plateau'), 'crack_plateau');
  assert.equal(behindTarget('appraise:x1_scarecrow'), 'x1_scarecrow');
  assert.equal(behindTarget(undefined), null);
});

// ------------------------------------------------------------------------------------------------ the live field
test('the fixture: the hidden chest is concealed and gives no prompt; the scarecrow is an Appraise target', () => {
  const f = makeField();
  const chest = f.entities.get('x1_chest_scarecrow');
  assert.equal(chest.present, true);
  assert.equal(chest.data.concealed, true);
  assert.equal(chest.prop.visible, false);
  assert.deepEqual(interactables(f, 9, 7), [], 'no prompt for a hidden thing');
  const patch = f.entities.get('x1_scarecrow');
  assert.ok(isAppraiseObject(patch));
  assert.equal(appraiseObjectAt(f, 8, 5), patch);
  assert.equal(appraiseObjectAt(f, 9, 5), null);
});

test('resolve(): with Appraise selected, the scarecrow is the target within five tiles; a wall between hides the plate', () => {
  const f = makeField();
  f.game.fieldAbility = 'appraise';
  stand(f, 3, 5, 'right');
  let c = f.abilities.resolve();
  assert.equal(c.id, 'appraise');
  assert.equal(c.kind, 'object');
  assert.deepEqual(c.at, [8, 5]);
  assert.equal(c.target.ent.id, 'x1_scarecrow');
  stand(f, 2, 5, 'right');
  assert.equal(f.abilities.resolve().target, null, 'six tiles away: nothing to read');
  stand(f, 16, 5, 'right');
  c = f.abilities.resolve();
  assert.ok(!c.target, 'the plate is beyond the cliff wall at x = 18; the lens does not go through it');
  stand(f, 3, 4, 'right');
  assert.equal(f.abilities.resolve().kind, 'object', 'one tile off the line still reads it');
  // not selected: an Appraise object does not capture pageR (the selected ability, dash, has nothing to do)
  f.game.fieldAbility = 'dash';
  stand(f, 3, 5, 'right');
  assert.equal(f.abilities.resolve().id, 'dash');
});

test('appraise(): the lens beam, the object\'s own lines in the window, then the saved reveal with the sparkle; lastHit shape', async () => {
  const f = makeField();
  f.game.fieldAbility = 'appraise';
  stand(f, 3, 5, 'right');
  const c = f.abilities.resolve();
  await f.abilities.appraise(c);
  assert.equal(f.boxes.length, 1, 'one window');
  assert.equal(f.boxes[0][0].who, 'mira');
  assert.match(f.boxes[0][0].text, /Eleven pockets/);
  assert.ok(isOpened(f.game, '_x1fx', 'x1_scarecrow'), 'markOpened(game, mapId, id)');
  const chest = f.entities.get('x1_chest_scarecrow');
  assert.equal(chest.data.concealed, false);
  assert.equal(chest.prop.visible, true);
  assert.equal(f.sparkles, 1, 'the existing gold sparkle, once');
  assert.deepEqual(Object.keys(f.abilities.lastHit).sort(), ['encounter', 'first', 'keys', 'kind', 'object', 'revealed']);
  assert.equal(f.abilities.lastHit.kind, 'appraise');
  assert.equal(f.abilities.lastHit.object, 'x1_scarecrow');
  assert.equal(f.abilities.lastHit.encounter, null);
  assert.deepEqual(f.abilities.lastHit.keys, []);
  assert.deepEqual(f.abilities.lastHit.revealed, ['x1_chest_scarecrow']);
  assert.equal(f.abilities.lastHit.first, true);
  assert.equal(f.game.bestiary && Object.keys(f.game.bestiary).length ? 'touched' : 'clean', 'clean', 'no bestiary entry is written for an object');
  assert.equal(f.abilities.panel, null, 'the bestiary panel is not used');
  assert.equal(f.inputLocked, 0);
  // again: the lines play, nothing is revealed or sparkled twice
  await f.abilities.appraise(f.abilities.resolve());
  assert.equal(f.boxes.length, 2);
  assert.equal(f.sparkles, 1);
  assert.equal(f.abilities.lastHit.first, false);
  assert.deepEqual(f.abilities.lastHit.revealed, []);
});

test('the reveal is saved per save: a serialize and deserialize later the chest is simply there; a new game still hides it', async () => {
  const f = makeField();
  f.game.fieldAbility = 'appraise';
  stand(f, 3, 5, 'right');
  await f.abilities.appraise(f.abilities.resolve());
  const saved = deserialize(JSON.parse(JSON.stringify(serialize(f.game))));
  const f2 = makeField(FIXTURE, { game: saved });
  const chest = f2.entities.get('x1_chest_scarecrow');
  assert.equal(chest.data.concealed, false, 'after the load');
  assert.equal(chest.prop.visible, true);
  assert.equal(interactables(f2, 9, 7).length, 1, 'and it answers confirm');
  const fresh = makeField();
  assert.equal(fresh.entities.get('x1_chest_scarecrow').data.concealed, true, 'another save is untouched');
});

test('appraiseObject() directly: the first time, then never again; breakables with the same word are not confused', () => {
  const f = makeField();
  const patch = f.entities.get('x1_scarecrow');
  assert.deepEqual(appraiseObject(f, patch), { first: true, revealed: ['x1_chest_scarecrow'] });
  assert.deepEqual(appraiseObject(f, patch), { first: false, revealed: [] });
  assert.deepEqual(appraiseObject(f, f.entities.get('x1_chest_scarecrow')), { first: false, revealed: [] }, 'a chest is not an Appraise object');
  assert.ok(!isOpened(f.game, '_x1fx', 'x1_star_plate'));
});

test('a confirm press on an object with appraise and text still reads its text; without text there is no prompt', async () => {
  const f = makeField();
  f.game.fieldAbility = 'dash';
  assert.equal(interactables(f, 8, 5).length, 1);
  await interact(f, f.entities.get('x1_scarecrow'));
  assert.match(f.boxes[0][0].text, /scarecrow in a farmer/);
  f.game.fieldAbility = 'appraise';
  await interact(f, f.entities.get('x1_scarecrow'));
  assert.match(f.boxes[1][0].text, /scarecrow in a farmer/, 'also with Appraise selected');
  assert.deepEqual(interactables(f, 20, 5), [], 'the plate has appraiseText only: confirm is silent, Appraise reads it');
  assert.equal(appraiseBoxes(f.entities.get('x1_star_plate'), f.hasFlag)[0].text, 'A plate with a keyhole-sized shadow.');
});

test('the first-time bark: Mira speaks once near an unread object, only when the text id exists, never for a foe prompt', () => {
  const f = makeField();
  stand(f, 5, 5, 'right');
  f.frame = 6;
  f.abilities.update(true);
  assert.deepEqual(f.barks, [], 'no bark text registered: silence');
  BARKS.first_appraise_object = [{ if: 'mira_joined', lines: [{ who: 'mira', text: 'There is something wrong with that scarecrow\'s pockets.' }] }];
  try {
    f.frame = 7; f.abilities.update(true);
    assert.deepEqual(f.barks, [], 'frames that are not a multiple of 6 skip the scan');
    f.frame = 12; f.abilities.update(true);
    assert.deepEqual(f.barks, ['first_appraise_object']);
    assert.ok(!f.barks.includes('first_appraise_target'), 'the foe bark is not spent on an object');
    const g = createGame('Arden'); addMember(g, 'mira'); g.flags.mira_joined = true;
    assert.equal(takeBark(g, 'first_appraise_object', (k) => !!g.flags[k])[0].who, 'mira');
    // read it and the nudge is over; a second save of the same map speaks again only through its own counter
    const f2 = makeField(); f2.game.opened['_x1fx:x1_scarecrow'] = true; f2.frame = 12; stand(f2, 5, 5, 'right'); f2.abilities.update(true);
    assert.deepEqual(f2.barks, [], 'an object already read gets no nudge');
    // the event can pick another key or stay silent
    const mod = { ...FIXTURE, events: FIXTURE.events.map((e) => (e.id === 'x1_scarecrow' ? { ...e, appraiseBark: false } : e)) };
    const f3 = makeField(mod); f3.frame = 12; stand(f3, 5, 5, 'right'); f3.abilities.update(true);
    assert.deepEqual(f3.barks, [], 'appraiseBark: false opts out');
  } finally { delete BARKS.first_appraise_object; }
});

test('Appraise on a foe is unchanged: the prompt kind is "enemy" and the bestiary path is the one the battle reads', () => {
  const f = makeField();
  f.game.fieldAbility = 'appraise';
  const foe = { kind: 'enemy', visible: true, tx: 6, ty: 5, data: {} };
  f.actors.push(foe);
  stand(f, 3, 5, 'right');
  const c = f.abilities.resolve();
  assert.equal(c.kind, 'enemy');
  assert.equal(c.target, foe, 'the foe on the line, three tiles ahead, is nearer than the scarecrow');
});
