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
import { drawCursor } from '../../src/ui/cursor.js';
import { BattleFx, REDUCED_TRAVEL } from '../../src/battle/fx.js';
import { NumberPopups } from '../../src/ui/numberPopup.js';
import { BootScene } from '../../src/core/engine.js';
import { drawTextMark, drawScrollArrow } from '../../src/ui/window.js';
import { FieldAbilities } from '../../src/world/abilities.js';
import { Camera } from '../../src/world/camera.js';

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

test('the last movers: the target reticle and arrow, the menu glove, the rewards confirm glyph', () => {
  steady('target reticle', (r, f) => HUD.drawReticle(r, actor(), f));
  steady('target arrow', (r, f) => HUD.drawTargetArrow(r, actor(), f));
  // every list draws its glove through drawCursor, with the list's frame or the renderer's
  steady('menu glove (list frame)', (r, f) => drawCursor(r, 60, 80, { frame: f }));
  steady('menu glove (renderer frame)', (r, f) => { r.frame = f; drawCursor(r, 60, 80); });
  const scene = {
    frame: 0,
    rewards: { pages: [{ kind: 'main' }], index: 0, t: 30, intro: 0 },
    summary: { exp: 42, gold: 17, masteryPoints: {}, consumables: [], items: [] },
    party: () => [],
  };
  steady('rewards confirm glyph', (r, f) => { scene.frame = f; BattleScene.prototype.drawRewards.call(scene, r); });
});

// --- the rest (docs/ACCESSIBILITY.md section 6, the items still open after the tail) --------------------------------------
/** The distinct drawings over frames [from, to) (a marker whose alpha fades is checked over its full-alpha span). */
function looksOver(reduce, from, to, draw) {
  const seen = new Set();
  for (let f = from; f < to; f++) { const { r, log } = recorder(reduce); draw(r, f); assert.ok(log.length > 0); seen.add(JSON.stringify(log)); }
  return seen.size;
}
const fxEngine = (reduce) => ({ settings: { reduceMotion: reduce }, assets: { has: () => false } });
/** One fx spawned on a fresh BattleFx: how many particles, how far the farthest travels from its start, any blink or sway. */
function flight(reduce, spawn) {
  const fx = new BattleFx(fxEngine(reduce));
  spawn(fx);
  const start = new Map(fx.parts.map((q) => [q, [q.x, q.y]]));
  let far = 0;
  const n = fx.parts.length, blink = fx.parts.some((q) => q.blink), drift = fx.parts.some((q) => q.drift), items = fx.items.length;
  for (let t = 0; t < 120 && fx.parts.length; t++) {
    fx.update();
    for (const q of fx.parts) { const [x0, y0] = start.get(q); far = Math.max(far, Math.hypot(q.x - x0, q.y - y0)); }
  }
  return { n, far, blink, drift, items };
}

test('battle particles: a third of them, a third of the travel, no blink or sway; the impact star stays', () => {
  const at = { x: 100, y: 146, h: 40, w: 32 };
  const cases = [
    ['hit spark', (fx) => fx.spawn('hit_spark', at), 5],
    ['big hit spark', (fx) => fx.spawn('hit_spark', { ...at, big: true }), 10],
    ['Break burst', (fx) => fx.spawn('break_burst', at), 18],
    ['quake', (fx) => fx.spawn('quake', at), 16],
    ['hush (blinking motes)', (fx) => fx.spawn('hush', at), 6],
    ['embers (swaying)', (fx) => fx.particles(100, 120, 9, { speed: 1, life: 20, drift: 0.6 }), 9],
  ];
  for (const [name, spawn, full] of cases) {
    const off = flight(false, spawn), on = flight(true, spawn);
    assert.equal(off.n, full, `${name}: unchanged with Reduce motion off`);
    assert.equal(on.n, Math.ceil(full / 3), `${name}: a third of the particles`);
    assert.ok(on.far <= off.far * REDUCED_TRAVEL + 0.75, `${name}: travel ${on.far.toFixed(1)} px vs ${off.far.toFixed(1)} px`);
    assert.equal(on.blink || on.drift, false, `${name}: no blink or sway under Reduce motion`);
    assert.equal(on.items, off.items, `${name}: the star, ring or sprite parts are all still there`);
  }
  assert.ok(flight(false, cases[4][1]).blink && flight(false, cases[5][1]).drift, 'blink and sway still run with Reduce motion off');
});

test('battle rings and rays hold their halfway shape and fade in place', () => {
  const at = { x: 100, y: 146, h: 40 };
  const shapes = (reduce, spawn, frames, kind) => {
    const fx = new BattleFx(fxEngine(reduce));
    spawn(fx);
    const seen = new Set();
    for (let t = 0; t < frames; t++) {
      const { r, log } = recorder(reduce);
      for (const it of fx.items) it.draw(r, t, it);
      seen.add(JSON.stringify(log.filter((c) => c[0] === kind)));
    }
    return seen.size;
  };
  const ring = (fx) => fx.fx_ring(at, { color: '#fff', r0: 4, r1: 60, frames: 14 });
  const rays = (fx) => fx.fx_rays(at, { color: '#fff', n: 8, len: 30, frames: 16 });
  assert.equal(shapes(true, ring, 14, 'ellipse'), 1, 'ring: one size under Reduce motion');
  assert.ok(shapes(false, ring, 14, 'ellipse') > 5, 'ring: still grows with it off');
  assert.equal(shapes(true, rays, 16, 'line'), 1, 'rays: one shape under Reduce motion');
  assert.ok(shapes(false, rays, 16, 'line') > 5, 'rays: still reach out and turn with it off');
});

test('damage numbers appear at rest and fade, with no bounce; the column and the timing are unchanged', () => {
  const run = (reduce) => {
    const pops = new NumberPopups();
    pops.spawn(100, 120, 37);
    pops.spawn(100, 120, 0, { text: '120', kind: 'crit' });
    pops.word(100, 110, 'WEAK');
    const ys = new Set(), alive = [];
    for (let t = 0; t < 60; t++) {
      const { r, log } = recorder(reduce);
      pops.draw(r);
      const tops = log.filter((c) => c[0] === 'text').map((c) => c[3]);
      if (tops.length) ys.add(JSON.stringify(tops));
      alive.push(pops.active);
      pops.update();
    }
    return { ys: ys.size, alive: alive.join() };
  };
  const on = run(true), off = run(false);
  assert.equal(on.ys, 1, 'every frame draws the numbers at the same height under Reduce motion');
  assert.ok(off.ys > 5, 'they still pop and bounce with it off');
  assert.equal(on.alive, off.alive, 'the same numbers live the same frames either way');
  // the resting place is where the bounce ends, so nothing jumps when Reduce motion is turned on mid-fight
  const pops = new NumberPopups();
  const p = pops.spawn(100, 120, 5);
  for (let t = 0; t < 30; t++) pops.update();
  assert.equal(pops.layout(true).get(p), pops.layout(false).get(p));
});

test('the boot screen: "Tap or press any key" and the retry line stay lit, the bar glow holds, no twinkle', () => {
  const bootFor = (reduce, phase) => {
    const engine = { settings: { reduceMotion: reduce }, assets: { has: () => false }, renderer: { view: null },
      input: { anyPressed: () => false, pointer: { pressed: false }, consumeAll() {} } };
    const b = new BootScene(engine);
    Object.assign(b, { phase, waiting: true, target: 1, ceiling: 1, shown: 1, failed: phase === 'error' ? ['img:ui'] : [] });
    return b;
  };
  for (const phase of ['ready', 'error']) {
    const scenes = new Map([[true, bootFor(true, phase)], [false, bootFor(false, phase)]]);
    steady(`boot ${phase}`, (r) => {
      const b = scenes.get(r.settings.reduceMotion);
      b.update(1 / 60); b.flavorT = 1;   // the story line's own fade is text timing, not motion: held here
      b.draw(r);
    });
    const lit = (reduce) => {
      const b = bootFor(reduce, phase);
      let n = 0;
      for (let f = 0; f < 112; f++) {
        b.update(1 / 60);
        const { r, log } = recorder(reduce);
        b.draw(r);
        if (log.some((c) => c[0] === 'text' && /Tap or press/.test(c[1]))) n++;
      }
      return n;
    };
    assert.equal(lit(true), 112, `${phase}: the prompt shows on every frame under Reduce motion`);
    assert.ok(lit(false) < 112 && lit(false) > 0, `${phase}: it still blinks with it off`);
  }
});

test('the text box advance mark and the list scroll arrows rest', () => {
  steady('advance mark (box frame)', (r, f) => drawTextMark(r, 'more', 300, 180, { frame: f }));
  steady('advance mark (renderer frame)', (r, f) => { r.frame = f; drawTextMark(r, 'end', 300, 180); });
  steady('scroll arrow up', (r, f) => drawScrollArrow(r, 'up', 100, 30, { frame: f }));
  steady('scroll arrow down', (r, f) => { r.frame = f; drawScrollArrow(r, 'down', 100, 170); });
  // the font fallback (no ui atlas) bobs the same way
  const bare = (draw) => (r, f) => { r.assets = { has: () => false }; draw(r, f); };
  steady('advance mark, no atlas', bare((r, f) => drawTextMark(r, 'more', 300, 180, { frame: f })));
  steady('scroll arrow, no atlas', bare((r, f) => drawScrollArrow(r, 'down', 100, 170, { frame: f })));
});

test('the field lock-on reticle holds its first frame and size (it still fades in and out)', () => {
  const foe = { feetX: 120, feetY: 90 };
  const draw = (r, t) => FieldAbilities.prototype.drawReticle.call({}, r, { to: foe, t }, t / 34);
  // full alpha from frame 6 (faded in) to frame 27 (the fade out starts at k 0.8)
  assert.equal(looksOver(true, 6, 27, draw), 1, 'reticle: one look under Reduce motion');
  assert.ok(looksOver(false, 6, 27, draw) > 1, 'reticle: still blinks with it off');
  const bare = (r, t) => { r.assets = { has: () => false }; draw(r, t); };
  assert.equal(looksOver(true, 0, 27, bare), 1, 'fallback box: one size under Reduce motion');
  assert.ok(looksOver(false, 0, 27, bare) > 1, 'fallback box: still closes in with it off');
});

test('cutscene camera pans cut, then hold for the same frames, so a scene keeps its pacing', async () => {
  const run = async (reduce, back) => {
    const field = { map: { pixelW: 2000, pixelH: 1000 }, engine: { settings: { reduceMotion: reduce }, renderer: { W: 384, H: 216 } } };
    const cam = new Camera(field);
    const hero = { px: 200, py: 300 };
    if (back) { cam.panTo(1200, 500, 0); } else cam.follow(hero);
    const xs = [];
    let done = -1;
    const p = (back ? cam.returnTo(hero, 30) : cam.panTo(1200, 500, 30)).then(() => { done = xs.length; });
    for (let t = 0; t < 40; t++) { cam.update(); xs.push(cam.x); await Promise.resolve(); await Promise.resolve(); }
    await p;
    return { xs, done, follows: cam.target === hero };
  };
  for (const back of [false, true]) {
    const name = back ? 'returnTo' : 'panTo';
    const on = await run(true, back), off = await run(false, back);
    assert.equal(new Set(on.xs).size, 1, `${name}: the first frame is already there under Reduce motion`);
    assert.ok(new Set(off.xs.slice(0, 30)).size > 10, `${name}: it still eases with Reduce motion off`);
    assert.equal(on.xs[0], off.xs[39], `${name}: the same place either way`);
    assert.equal(on.done, off.done, `${name}: the scene waits the same frames either way`);
    assert.equal(on.follows, back, `${name}: returnTo follows the actor afterwards`);
  }
});
