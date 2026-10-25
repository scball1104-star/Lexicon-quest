// Config "Battle cursor": the battle command menu opens on each character's last command ('last') or on Attack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandMenu } from '../../src/battle/scene/menu.js';
import { ROWS } from '../../src/scenes/config.js';
import { DEFAULT_SETTINGS } from '../../src/core/save.js';

const CMDS = ['attack', 'tech', 'magic', 'item', 'defend', 'flee'].map((id) => ({ id, name: id, enabled: true }));
function menu(battleCursor) {
  const scene = { engine: { settings: { battleCursor }, touch: null }, b: { commands: () => CMDS }, actors: new Map() };
  return new CommandMenu(scene);
}
const press = (m, uid, id) => { m.open({ uid }); m.lastCmd.set(uid, id); };

test('Config lists the row and the default is last-used', () => {
  assert.ok(ROWS.some((r) => r.key === 'battleCursor'));
  assert.equal(DEFAULT_SETTINGS.battleCursor, 'last');
});
test('last: each character reopens on their own last command, Attack first time', () => {
  const m = menu('last');
  m.open({ uid: 'a' }); assert.equal(m.root.item.id, 'attack');
  press(m, 'a', 'magic'); press(m, 'b', 'item');
  m.open({ uid: 'a' }); assert.equal(m.root.item.id, 'magic');
  m.open({ uid: 'b' }); assert.equal(m.root.item.id, 'item');
  m.open({ uid: 'c' }); assert.equal(m.root.item.id, 'attack');
});
test('attack: always opens on Attack', () => {
  const m = menu('attack');
  press(m, 'a', 'magic');
  m.open({ uid: 'a' }); assert.equal(m.root.item.id, 'attack');
});
