// Easing curves and a game-time tween runner. Pure (no DOM): node tests can import it.
//
// Durations are in SECONDS of game time (the engine steps at 1/60 s). Use frames(n) to convert.
// Tweens advance only when the runner is updated, so they pause with the game and honour time scale.
//
//   const tw = createTweens();            // the engine owns one: engine.tweens
//   await tw.to(obj, { x: 100, alpha: 0 }, 0.5, { ease: 'outCubic' });
//   await tw.wait(frames(30));
//   tw.update(dt);                         // called by the engine once per logic step

export const frames = (n) => n / 60;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
/** Move current toward target by at most step. */
export const approach = (current, target, step) =>
  current < target ? Math.min(current + step, target) : Math.max(current - step, target);
/** 0..1..0 triangle wave over period (in the same unit as t). */
export const pingPong = (t, period) => { const p = (t % period) / period; return p < 0.5 ? p * 2 : 2 - p * 2; };

const PI = Math.PI;
const c1 = 1.70158, c3 = c1 + 1, c4 = (2 * PI) / 3;
function outBounce(t) {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inQuart: (t) => t ** 4,
  outQuart: (t) => 1 - (1 - t) ** 4,
  inSine: (t) => 1 - Math.cos((t * PI) / 2),
  outSine: (t) => Math.sin((t * PI) / 2),
  inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
  inExpo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inBack: (t) => c3 * t * t * t - c1 * t * t,
  outBack: (t) => 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2,
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
  outBounce,
  smoothstep: (t) => t * t * (3 - 2 * t),
  /** Hard steps, for deliberately choppy SNES-style motion: ease.steps(4) */
  steps: (n) => (t) => Math.min(1, Math.floor(t * n) / (n - 1 || 1)),
};

function resolveEase(e) {
  if (typeof e === 'function') return e;
  return ease[e] || ease.linear;
}

/** Create a tween runner. Every method that waits returns a Promise resolved in game time. */
export function createTweens() {
  let list = [];
  let idSeq = 1;

  function add(t) { list.push(t); return t; }

  const api = {
    /**
     * Tween numeric properties of obj to the given values over `duration` seconds.
     * opts: { ease, delay, onUpdate(obj, t), onDone(obj), tag }. Returns a Promise with .cancel() and .id.
     */
    to(obj, props, duration, opts = {}) {
      const t = {
        id: idSeq++, obj, props, duration: Math.max(0, duration), delay: opts.delay || 0,
        ease: resolveEase(opts.ease), onUpdate: opts.onUpdate, onDone: opts.onDone, tag: opts.tag,
        elapsed: 0, from: null, done: false, resolve: null,
      };
      const p = new Promise((res) => { t.resolve = res; });
      p.id = t.id;
      p.cancel = () => api.cancel(t.id);
      add(t);
      if (t.duration === 0 && t.delay === 0) step(t, 0);
      return p;
    },
    /** Tween a plain value: tw.value(0, 1, 0.3, v => alpha = v, {ease}). */
    value(from, to, duration, onUpdate, opts = {}) {
      const box = { v: from };
      return api.to(box, { v: to }, duration, { ...opts, onUpdate: (o, k) => onUpdate(o.v, k) });
    },
    /** Resolve after `seconds` of game time. */
    wait(seconds) { return api.to({}, {}, seconds); },
    /** Call fn after `seconds` of game time. Returns the same promise as wait(). */
    after(seconds, fn) { const p = api.to({}, {}, seconds, { onDone: fn }); return p; },
    cancel(idOrTag) {
      for (const t of list) {
        if (t.id === idOrTag || (t.tag !== undefined && t.tag === idOrTag)) { t.done = true; t.resolve(false); }
      }
      list = list.filter((t) => !t.done);
    },
    /** Finish every tween instantly (values jump to their targets). Useful for "skip". */
    finishAll() { for (const t of list.slice()) { t.delay = 0; step(t, Infinity); } list = list.filter((t) => !t.done); },
    clear() { for (const t of list) t.resolve(false); list = []; },
    get active() { return list.length; },
    update(dt) {
      if (!list.length) return;
      const current = list.slice();
      for (const t of current) if (!t.done) step(t, dt);
      list = list.filter((t) => !t.done);
    },
  };

  function step(t, dt) {
    if (t.delay > 0) {
      t.delay -= dt;
      if (t.delay > 0) return;
      dt = -t.delay; t.delay = 0;
    }
    if (!t.from) {
      t.from = {};
      for (const k in t.props) t.from[k] = t.obj[k];
    }
    t.elapsed += dt;
    // Small epsilon: summing 1/60 steps must land exactly on the end (0.1 + 0.2 style float drift).
    const k = t.duration <= 0 || t.elapsed >= t.duration - 1e-9 ? 1 : clamp(t.elapsed / t.duration, 0, 1);
    const e = k >= 1 ? 1 : t.ease(k);
    for (const key in t.props) t.obj[key] = t.from[key] + (t.props[key] - t.from[key]) * e;
    if (t.onUpdate) t.onUpdate(t.obj, e);
    if (k >= 1) {
      t.done = true;
      if (t.onDone) t.onDone(t.obj);
      t.resolve(true);
    }
  }

  return api;
}
