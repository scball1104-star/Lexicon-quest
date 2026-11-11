// Issue #82 (docs/ACCESSIBILITY.md item 2, the leftovers after #74): under Reduce motion the battle's per-episode markers,
// the timeline and turn pulses and the touch FLEE / AUTO buttons hold steady. Each marker is drawn into a recording renderer
// at every frame of a few seconds: with Reduce motion on, every frame draws the same calls (no blink, bob, orbit or
// flicker); with it off, the same marker still moves (so the check is not vacuous and the default look is unchanged).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as HUD from '../../src/battle/scene/hud.js';
import { HELP_TOUCH_BTNS } from '../../src/battle/scene/layout.js';
import { BattleScene } from '../../src/scenes/battle.js';
import { Actor } from '../../src/battle/scene/actors.js';

const { registerData } = await import('../../tools/sim/ep6.mjs');
registerData();
const ep4 = await import('../../src/data/ep4/scene.js');
const ep5 = await import('../../src/data/ep5/scene.js');
const ep6 = await import('../../src/data/ep6/scene.js');
ep4.register(); ep5.register(); ep6.register();

const FRAMES = 240;   // four seconds: past every blink period here (the slowest is 32 frames) and the orbits' steps
const frameOf = (name) => ({ name, x: 0, y: 0, w: 18, h: 18, ox: 9, oy: 18 });
const ATLAS = {
  image: { id: 'atlas' }, meta: {},
  frames: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? frameOf(k) : undefined) }),
  anims: new Proxy({}, { get: (t, k) => (typeof k === 'string' ? { frames: ['f0', 'f1', 'f2', 'f3'], fps: 8 } : undefined) }),
};
/** A renderer that writes every call (and every alpha scope) to a log; `reduceMotion` set as asked. */
function recorder(reduce) {
  const log = [];
  const base = {
    settings: { reduceMotion: reduce, windowColor: 'blue' },
    assets: { has: () => true, atlas: () => ATLAS, json: () => null },
    measure: (t) => String(t).length * 6,
    wrap: (t) => [String(t)],
    W: 384, H: 216,
    withAlpha(a, fn) { log.push(['alpha', a]); fn(); log.push(['/alpha']); },
  };
  // the 2D context (window gradients draw on it directly): its state and every call go to the log too
  const ctxState = { globalAlpha: 1 };
  base.ctx = new Proxy(ctxState, {
    get: (t, k) => (k in t ? t[k] : (...args) => { log.push([`ctx.${String(k)}`, t.fillStyle, t.globalAlpha, ...args]); }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const r = new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string') return undefined;
      return (...args) => { log.push([k, ...args.map((x) => (x === ATLAS ? 'atlas' : typeof x === 'function' ? 'fn' : x))]); return 0; };
    },
  });
  return { r, log };
}
/** The distinct drawings a marker makes over FRAMES frames (each frame's log as one string). */
function looks(reduce, draw) {
  const seen = new Set();
  for (let f = 0; f < FRAMES; f++) {
    const { r, log } = recorder(reduce);
    draw(r, f);
    assert.ok(log.length > 0, 'the marker draws something');
    seen.add(JSON.stringify(log));
  }
  return seen.size;
}
/** The check every marker gets: steady under Reduce motion, moving without it. */
function steady(name, draw) {
  assert.equal(looks(true, draw), 1, `${name}: one look under Reduce motion`);
  assert.ok(looks(false, draw) > 1, `${name}: still animates with Reduce motion off`);
}

const actor = (o = {}) => ({ uid: 'u1', id: 'ink_slime', side: 'enemy', name: 'Slime', cx: 100, cy: 110, x: 100, y: 146, w: 32, h: 40, top: 106,
  alive: true, statuses: {}, shields: 3, shieldFlash: 0, rowFlash: 0, heat: 0, heatFlash: 0, ...o });

test('core battle: the timeline head, the turn marks, the telegraph "!" and the Episode 2 and 3 marks', () => {
  const party = [actor({ uid: 'hero', id: 'hero', side: 'party', name: 'Arden', hp: 40, maxHp: 50, shownHp: 40, lagHp: 40, mp: 9, maxMp: 12, shownMp: 9, fury: 0, shownFury: 0, furyFlash: 0 })];
  const actors = new Map([['hero', party[0]], ['u1', actor()]]);
  const order = [{ uid: 'hero' }, { uid: 'u1' }, { uid: 'hero' }];
  steady('timeline (head glow and pulse, the landing preview)', (r, f) => HUD.drawTimeline(r, order, actors, { landing: 2, uid: 'hero' }, f));
  steady('party status (whose turn)', (r, f) => HUD.drawPartyStatus(r, party, 'hero', f));
  steady('turn marker', (r, f) => HUD.drawTurnMarker(r, party[0], f));
  steady('telegraph marker', (r, f) => HUD.drawTelegraphMarker(r, actor(), f, 1));
  steady('Mirrored Combo bracket', (r, f) => HUD.drawMirrorBracket(r, [{ uid: 'a' }, { uid: 'b' }], 'a', 'b', f));
  steady('Kept shard', (r, f) => HUD.drawKeptShard(r, party[0], f));
  steady('Molten Shell halo', (r, f) => HUD.drawHalo(r, actor(), f));
  steady('flare halo', (r, f) => HUD.drawHalo(r, actor(), f, 1));
  steady('Tempered Oath', (r, f) => HUD.drawOath(r, party[0], [party[0], actor({ uid: 'mira', side: 'party' })], true, f));
});

test('touch FLEE (armed) and AUTO (on) hold their lit colour', () => {
  const scene = {
    frame: 0, auto: true, speed: 1,
    menu: { state: 'root', fleeCmd: { enabled: true }, fleeArmed: 1 },
    helpView: () => ({ text: 'Arden\'s turn.', color: null, right: null, rightColor: null, rightW: 94, tb: HELP_TOUCH_BTNS }),
  };
  steady('help buttons', (r, f) => { scene.frame = f; BattleScene.prototype.drawHelpWindow.call(scene, r); });
});

test('Episode 4: the Decree seals, the Royal Ward, Answer\'s guard, the named seal and its timeline mark', () => {
  const decree = actor({ id: 'writ_silence', heat: 2, flare: true });
  const know = { weak: ['fire'], resist: [], unknown: 0, heatMax: 3 };
  steady('Decree seals', (r, f) => HUD.drawEnemyRow(r, decree, know, { shields: 3, heatQuench: 'fire' }, f, true, { at: { x: 60, y: 60 } }));
  steady('Royal Ward', (r, f) => ep4.drawWardHalo(r, actor({ id: 'paper_regent', w: 64, h: 80 }), f));
  steady('Answered', (r, f) => ep4.drawAnswered(r, actor({ side: 'party' }), f));
  steady('named seal', (r, f) => ep4.drawNamed(r, actor({ side: 'party' }), f));
  steady('named timeline mark', (r, f) => Actor.prototype.tlMark.call({ statuses: { named: true }, ko: false }, r, 240, 6, f));
});

test('Episode 5: the Turning Sky\'s Ascendant glow, the Mirage Veil, the foretold star, the Turn\'s slot and the Exposed shield', () => {
  const sided = actor({
    atlas: ATLAS, pose: 'idle', move: null, scale: 1, flash: null, dissolve: null, hurtT: 0, hurtMax: 10,
    enemyFrame: () => frameOf('dune_stalker'), bob: () => 0, breath: () => 0,
  });
  steady('Ascendant glow', (r, f) => ep5.drawGlow(sided, r, f, 'sun'));
  steady('Mirage Veil', (r, f) => ep5.drawVeil(r, actor({ id: 'oracle', w: 60, h: 80 }), f));
  steady('foretold star', (r, f) => ep5.drawForetold(r, actor({ side: 'party' }), f));
  const hero = actor({ uid: 'hero', id: 'hero', side: 'party' });
  const scene = { sky5: { sky: 'day', turnIn: 3, pinned: { target: 'hero' } }, actor: () => hero };
  steady('Turn slot with a foretelling', (r, f) => ep5.drawMarker(scene, r, 260, 6, f, false));
  // the Exposed shield's white flash runs on its own countdown (28 frames), not the frame clock
  const foe = actor({ skySide: true, skyExposed: true, skyShieldFlash: 0 });
  const rows = { sky5: { sky: 'day' }, _sky5Rows: new Map([['u1', { rect: { x: 60, y: 60 }, know: { reflect: 'sky' } }]]), actor: () => foe, unit: () => ({ shields: 2, broken: false }) };
  steady('Exposed shield flash', (r, t) => { foe.skyShieldFlash = 28 - (t % 28); ep5.drawSkyRows(rows, r); });
});

test('Episode 6: the Gust pips and ring, the Gust slot\'s quill and star, the marks over heads, the Scribe\'s ward, the bellows', () => {
  const gv = { every: 5, gustIn: 1, flash: 0, pinned: { source: 'u1', skill: 'rewrite_course' }, slides: [] };
  const scene = { gale6: gv, frame: 0, timeline: [{ uid: 'hero' }, { uid: 'u1' }] };
  steady('Gust pips (the next one pulses)', (r, f) => { scene.frame = f; ep6.drawGauge(scene, r, 3); });
  steady('Gust ring after a change (its own countdown)', (r, f) => { gv.flash = 30 - (f % 30); scene.frame = 0; ep6.drawGauge(scene, r, 3); });
  gv.flash = 0;
  steady('Gust slot, a Rewrite pinned', (r, f) => ep6.drawMarker(scene, r, 280, 6, f, false));
  gv.pinned = { source: 'u1', skill: 'full_blast' };
  steady('Gust slot, Full Blast pinned', (r, f) => ep6.drawMarker(scene, r, 280, 6, f, false));
  steady('red star over the source', (r, f) => ep6.drawHeadMarks(r, actor(), gv, f));
  steady('anchor over a braced member', (r, f) => ep6.drawHeadMarks(r, actor({ uid: 'bram', side: 'party', anchor6: true }), gv, f));
  steady('the Scribe\'s ward', (r, f) => ep6.drawWard(r, actor({ id: 'scribe', w: 64, h: 90 }), f));
  steady('the bellows', (r, f) => ep6.drawBellows(r, actor({ id: 'gale_engine', w: 90, h: 90 }), f));
});
