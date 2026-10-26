// Shared fixture for the qa/world/x1_* tests (X1-world): a small field map on the real TileMap and events.js with a fake
// engine and no canvas (the shape of e2_field.test.mjs), holding a scarecrow-like Appraise object, a chest hidden behind it
// and a wall. Not a test file (the runner only picks *.test.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TileMap } from '../../src/world/tilemap.js';
import { buildEntities, refreshEntities } from '../../src/world/events.js';
import { FieldAbilities } from '../../src/world/abilities.js';
import { createGame, addMember } from '../../src/game/state.js';
import { registerStory } from '../../src/game/story.js';

export const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TILES = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'tiles', 'tiles.json'), 'utf8'));
const PROPS = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'sprites', 'props.json'), 'utf8'));
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });

/** Window text for the fixture objects (registered once into the shared LINES). */
export const FX_LINES = {
  x1fx_patch_appraise: [{ who: 'mira', text: 'Eleven pockets. Every one of them is sewn shut but one.' }],
  x1fx_patch_text: 'A scarecrow in a farmer\'s coat. Somebody mended it with care.',
  x1fx_plate_appraise: 'A plate with a keyhole-sized shadow.',
};
registerStory({ lines: FX_LINES });

const row = (n, ch) => ch.repeat(n);
/** 24 x 10: open grass, a wall of cliff at x = 18, y 3..6 (a line of sight breaker), the party starts at (3, 5). */
export const FIXTURE = {
  id: '_x1fx', name: 'X1 Fixture', area: 'field', music: 'valley', ambience: null, tileset: 'town',
  lighting: { tint: 'none', dark: 0 },
  under: 'grass',
  start: { x: 3, y: 5, dir: 'right' },
  legend: { '.': 'grass', '#': 'cliff_top' },
  ground: [
    row(24, '.'), row(24, '.'), row(24, '.'),
    '.................' + '#' + '.....',
    '.................' + '#' + '.....',
    '.................' + '#' + '.....',
    '.................' + '#' + '.....',
    row(24, '.'), row(24, '.'), row(24, '.'),
  ],
  overlays: [], decor: [],
  events: [
    // Patch: an Appraise object on the ridge, a chest hidden behind it (the contract of plan 11.1)
    { id: 'x1_scarecrow', type: 'object', x: 8, y: 5, sprite: 'signboard', appraise: true, appraiseText: 'x1fx_patch_appraise', text: 'x1fx_patch_text' },
    { id: 'x1_chest_scarecrow', type: 'chest', x: 9, y: 7, tier: 'iron', item: 'potion', behind: 'appraise:x1_scarecrow' },
    // an object behind the wall, and one with no text at all (appraise only)
    { id: 'x1_star_plate', type: 'object', x: 20, y: 5, sprite: 'signboard', appraise: true, appraiseText: 'x1fx_plate_appraise' },
    // a flag-gated door and a flag-gated solid object (small check 5b)
    { id: 'x1_gate_door', type: 'door', x: 1, y: 8, to: ['_x1fx', 3, 5, 'right'], kind: 'door', if: 'x1fx_open' },
    { id: 'x1_oak', type: 'object', x: 12, y: 8, sprite: 'signboard', text: 'x1fx_patch_text', ifNot: 'x1fx_open' },
    { id: 'x1_pit_hole', type: 'pit', x: 14, y: 1, w: 2, h: 2, to: ['_x1fx_other', 5, 6, 'left'], if: 'x1fx_pit_on' },
  ],
  exits: [],
  marks: { start: [3, 5] },
  pitTo: ['_x1fx', 3, 5, 'down'],
};

/** A headless field on FIXTURE (or a variant module) with a real TileMap, entities and a FieldAbilities, Mira in the party. */
export function makeField(mod = FIXTURE, { flags = {}, party = ['mira'], game = null } = {}) {
  const sfx = [];
  const engine = {
    assets: { json: () => TILES, has: (k) => k === 'props', atlas: (k) => (k === 'props' ? { meta: { objects: PROPS.objects } } : null), img: () => null },
    renderer: { createLayer: (w, h) => ({ w, h, ctx }), shake() {}, flash() {} },
    audio: { sfx: (id) => sfx.push(id), jingle: async () => {} },
    after: (n, fn) => fn(), waitFrames: async () => {}, settings: {}, toasts: null,
  };
  const g = game || createGame('Arden');
  if (!game) for (const id of party) addMember(g, id);
  g.flags = { ...g.flags, ...flags };
  const f = { engine, game: g, sfx, entities: new Map(), byTile: new Map(), actors: [], followers: [], barks: [], boxes: [], sparkles: 0,
    sessionGone: new Set(), frame: 0, dead: false, inputLocked: 0 };
  f.hasFlag = (k) => !!g.flags[k];
  f.setFlag = (k, v = true) => { if (v === false) delete g.flags[k]; else g.flags[k] = v; refreshEntities(f); f.map.refreshGated(f.hasFlag); };
  f.map = new TileMap(engine, mod, { hasFlag: f.hasFlag });
  f.particles = { sparkle() { f.sparkles++; }, burst() {}, puff() {} };
  f.bark = (k) => { f.barks.push(k); };
  f.showBoxes = async (boxes) => { f.boxes.push(boxes); };
  f.lockInput = () => { f.inputLocked++; };
  f.unlockInput = () => { f.inputLocked = Math.max(0, f.inputLocked - 1); };
  f.actorAt = (x, y) => f.actors.find((a) => a.tx === x && a.ty === y) || null;
  f.addActor = (a) => f.actors.push(a);
  f.removeActor = (a) => { f.actors = f.actors.filter((b) => b !== a); };
  f.warnOnce = () => {};
  f.enemyGone = () => false;
  f.camera = { visible: () => true };
  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  f.leader = { tx: mod.start.x, ty: mod.start.y, dir: mod.start.dir || 'down', feetX: 0, feetY: 0,
    face(d) { this.dir = d; },
    faceToward(o) { const dx = o.tx - this.tx, dy = o.ty - this.ty; this.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); },
    showEmote() {}, jump() {}, facingTile() { const [dx, dy] = dirs[this.dir]; return [this.tx + dx, this.ty + dy]; } };
  f.lantern = 0;
  buildEntities(f);
  f.abilities = new FieldAbilities(f);
  return f;
}
export const stand = (f, x, y, dir) => { f.leader.tx = x; f.leader.ty = y; f.leader.dir = dir; f.abilities.ctxKey = null; };
