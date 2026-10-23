// Engine: fixed 60 Hz logic loop, scene stack, transitions and the global services every scene uses.
//
//   const engine = new Engine({ canvas: document.getElementById('game') });
//   engine.registerScene('title', TitleScene);          // class (new TitleScene(engine)) or factory(engine)
//   await engine.boot();                                // loads assets/manifest.json, fonts, audio
//   engine.push('title');
//
// Scene contract (DESIGN 4): { enter(data), exit(), update(dt), draw(r), onResume(result) } all optional.
// Optional scene flags: transparent (scenes below are drawn first), updateBelow (scene below keeps updating),
// name (set by the engine from the registry name), backdrop (image/canvas for the letterbox bars).
//
// Services: engine.renderer (alias engine.r), input, assets, audio, save, rng, settings, fonts, tweens.

import { Renderer, GAME_W, GAME_H } from './renderer.js';
import { Input } from './input.js';
import { TouchControls } from './touch.js';
import { createAssets, BASE_URL, animFrameAt } from './assets.js';
import { createSave, DEFAULT_SETTINGS } from './save.js';
import { createRng } from './rng.js';
import { createTweens, ease } from './tween.js';
import { createFonts, setNamedColors } from './font.js';

export const STEP = 1 / 60;
const MAX_FRAME_DT = 0.25;

const AUDIO_METHODS = ['init', 'unlock', 'music', 'stopMusic', 'pushMusic', 'popMusic', 'sfx', 'jingle', 'ambience',
  'setVolumes', 'getVolumes', 'preload', 'setMuted', 'stopAll', 'currentMusic', 'isUnlocked', 'has', 'debugState'];

/** Wrap an audio implementation so a bug in audio can never take the game down. Missing = silent stub. */
export function safeAudio(impl) {
  const out = { real: impl || null };
  const warned = new Set();
  for (const m of AUDIO_METHODS) {
    out[m] = (...args) => {
      const fn = impl && impl[m];
      if (typeof fn !== 'function') return m === 'jingle' || m === 'init' || m === 'preload' ? Promise.resolve(null) : null;
      try {
        const r = fn.apply(impl, args);
        if (r && typeof r.catch === 'function') return r.catch((e) => { if (!warned.has(m)) { warned.add(m); console.warn('[audio]', m, e); } return null; });
        return r;
      } catch (e) {
        if (!warned.has(m)) { warned.add(m); console.warn('[audio]', m, 'threw', e); }
        return m === 'jingle' ? Promise.resolve(null) : null;
      }
    };
  }
  return out;
}

/**
 * Audio stand-in used until boot() has initialised the real runtime: `preload`, `music`, `pushMusic` and
 * `ambience` calls made meanwhile (scene installs run in parallel with the asset load) are queued and
 * replayed once the runtime is up, so nothing is lost. Everything else is a silent no-op.
 */
function deferredAudio(queue) {
  const out = safeAudio(null);
  for (const m of ['preload', 'music', 'pushMusic', 'ambience']) {
    out[m] = (...args) => { queue.push([m, args]); return m === 'preload' ? Promise.resolve(null) : null; };
  }
  out.deferred = true;
  return out;
}

// ------------------------------------------------------------------ transitions
/**
 * Built-in transition styles. Each draws the covering amount (0 = clear, 1 = fully covered).
 * opts.style may also be a function (r, amount, opts) for custom transitions.
 */
export const TRANSITIONS = {
  fade(r, k, o) { r.fade(o.color, k); },
  dither(r, k, o) { r.ditherFade(o.color, Math.round(k * 16) / 16); },
  iris(r, k, o) {
    const cx = o.x ?? r.W / 2, cy = o.y ?? r.H / 2;
    const maxR = Math.hypot(Math.max(cx, r.W - cx), Math.max(cy, r.H - cy)) + 2;
    r.iris(cx, cy, (1 - k) * maxR, o.color);
  },
  mosaic(r, k, o) {
    r.mosaic(1 + Math.round(k * 15));
    if (k > 0.45) r.fade(o.color, (k - 0.45) / 0.55);
  },
  wipe(r, k, o) {
    const w = Math.ceil(r.W * k);
    if (o.dir === 'left') r.fillRect(r.W - w, 0, w, r.H, o.color);
    else r.fillRect(0, 0, w, r.H, o.color);
  },
};

// ------------------------------------------------------------------ boot scene (loading screen)
// The loading screen the engine draws while boot() loads (W6-pwa): the logo (loaded before anything else),
// a gold pixel progress bar, a status line, a rotating story line, then "Tap or press any key" (that press
// also unlocks audio). On a failed critical asset it shows a retry prompt instead of a blank canvas.
// Colors are palette.json ramps (ink, gold) written as hex: ui.json's named colors are not installed yet.
export const BOOT_BG = '#14101e';
const BOOT_INK = { deep: '#0d0a16', dark: '#14101e', low: '#1a1334', mid: '#292657', high: '#3f4186', glow: '#7162bd' };
const BOOT_GOLD = { shade: '#8f5533', dark: '#c38334', mid: '#eba14d', light: '#f9d77a', pale: '#fff7d6' };
const BOOT_TEXT = { body: '#b3b6c4', dim: '#8e8997', cream: '#fff7d6', red: '#e06b39' };
/** Story lines shown under the bar (verbatim from data/story/ep1.js PROLOGUE and the valley milestone). */
export const BOOT_FLAVOR = [
  'In Aethelgard, every name is a promise.',
  'A promise that someone, somewhere, will remember.',
  'The Keepers wrote every name in the Book of Names, and the world held its shape.',
  'Now, in the river valley of Willowmere, names have begun to fade.',
  'And last night, in a tower that holds twelve bells, a thirteenth bell rang.',
  'Every name is a promise that something will not be forgotten.',
];
const BOOT_STATUS = {
  boot: 'Opening the Book of Names...',
  assets: 'Loading the Archive...',
  scenes: 'Waking Willowmere...',
  audio: 'Tuning the bells...',
  ready: 'Tap or press any key',
  error: 'Some pages did not load.',
};
const BAR = { w: 160, h: 6, y: 146 };
/** The gate's line for a phone held upright (W15, PLAYTEST_REVIEW_4 fix 5). */
export const BOOT_ROTATE = 'Turn your phone sideways for a bigger picture.';
const MOTES = 26;

export class BootScene {
  constructor(engine, o = {}) {
    this.engine = engine; this.name = '_boot';
    this.t = 0; this.frame = 0;
    this.target = 0;            // progress reported by boot(), 0..1
    this.ceiling = 0;           // the bar may crawl toward this while a long job (scene modules) is in flight
    this.shown = 0;             // eased bar value actually drawn
    this.phase = 'boot';        // boot | assets | scenes | audio | ready | error
    this.failed = [];           // critical asset keys that failed (error phase)
    this.gate = !!o.gate;
    this.waiting = false; this._resolvePress = null;
    this.flavor = (Array.isArray(o.flavor) && o.flavor.length ? o.flavor : BOOT_FLAVOR).slice();
    this.flavorIndex = 0; this.flavorT = 0;
    this.sparkle = null;        // { x, y, t } at the bar head
    this.nextSparkle = 0.4;
    this.retries = 0;
    this._seed = 0x9e3779b9;
    this.motes = [];
    for (let i = 0; i < MOTES; i++) this.motes.push(this.newMote(true));
  }

  // Tiny local RNG so the loading screen never consumes the game's seeded sequence.
  rand() {
    this._seed = (this._seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this._seed ^ (this._seed >>> 15), 1 | this._seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  newMote(anywhere) {
    const r = this.rand();
    return {
      x: this.rand() * GAME_W, y: anywhere ? this.rand() * GAME_H : GAME_H + 2,
      vy: 3 + this.rand() * 6, sway: this.rand() * Math.PI * 2, swayR: 2 + this.rand() * 6,
      color: r < 0.08 ? BOOT_GOLD.dark : r < 0.35 ? BOOT_INK.high : BOOT_INK.mid,
      alpha: r < 0.08 ? 0.55 : 0.8,
    };
  }

  /** Progress 0..1; `ceiling` (>= k) lets the bar crawl a little further while waiting on an atomic job. */
  setProgress(k, ceiling) {
    this.target = Math.max(0, Math.min(1, k));
    this.ceiling = Math.max(this.target, Math.min(1, ceiling == null ? this.target : ceiling));
  }
  /** Resolves on the next confirm/any key/tap (the gate, and the retry prompt). */
  waitPress() {
    return new Promise((resolve) => { this.waiting = true; this._resolvePress = resolve; });
  }
  get percent() { return Math.round(this.shown * 100); }

  update(dt) {
    this.t += dt; this.frame++;
    // The bar moves toward the reported progress quickly and toward the ceiling slowly (asymptotic), never past it.
    if (this.shown < this.target) this.shown = Math.min(this.target, this.shown + Math.max((this.target - this.shown) * 0.12, 1 / (BAR.w * 2)));
    else if (this.shown < this.ceiling) this.shown = Math.min(this.ceiling, this.shown + (this.ceiling - this.shown) * 0.012);
    this.flavorT += dt;
    if (this.flavorT >= 3.4) { this.flavorT = 0; this.flavorIndex = (this.flavorIndex + 1) % this.flavor.length; }
    const motion = !this.engine.settings.reduceMotion;
    if (motion) {
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i];
        m.y -= m.vy * dt; m.sway += dt * 0.9;
        if (m.y < -2) this.motes[i] = this.newMote(false);
      }
    }
    if (this.sparkle) { this.sparkle.t += dt; if (this.sparkle.t > 0.34) this.sparkle = null; }
    this.nextSparkle -= dt;
    if (!this.sparkle && this.nextSparkle <= 0 && (this.shown < this.target || this.phase === 'ready')) {
      this.nextSparkle = this.phase === 'ready' ? 0.9 + this.rand() * 0.8 : 0.35 + this.rand() * 0.5;
      const x = Math.round((GAME_W - BAR.w) / 2) + Math.round(BAR.w * this.shown);
      this.sparkle = { x: this.phase === 'ready' ? x - 2 - Math.round(this.rand() * 20) : x, y: BAR.y + 1 + Math.round(this.rand() * 4), t: 0 };
    }
    if (this.waiting) {
      const input = this.engine.input;
      if (input.anyPressed() || input.pointer.pressed) {
        this.waiting = false;
        input.consumeAll();
        const resolve = this._resolvePress; this._resolvePress = null;
        if (resolve) resolve();
      }
    }
  }

  draw(r) {
    const W = r.W, H = r.H;
    r.gradientV(0, 0, W, H, '#1b1638', BOOT_INK.deep, 9);
    r.ditherEllipse(W / 2, 66, 176, 52, '#241d4a', 0.4);
    r.ditherEllipse(W / 2, 66, 120, 32, '#2b2458', 0.3);
    for (const m of this.motes) {
      const x = Math.round(m.x + Math.sin(m.sway) * m.swayR), y = Math.round(m.y);
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      r.withAlpha(m.alpha, () => r.pixel(x, y, m.color));
    }
    const assets = this.engine.assets;
    const logo = assets.has('logo') ? assets.atlas('logo') : null;
    const f = logo && logo.frames.logo;
    let logoBottom = 90;
    if (f) {
      const lx = Math.round((W - f.w) / 2), ly = 36;
      r.sprite(logo, f, lx, ly, { topLeft: true });
      const sub = logo.frames.subtitle;
      if (sub) { r.sprite(logo, sub, Math.round((W - sub.w) / 2), ly + f.h + 3, { topLeft: true }); logoBottom = ly + f.h + 3 + sub.h; }
      else logoBottom = ly + f.h;
    } else {
      r.text('LEXICON QUEST', W / 2, 52, { font: 'large', align: 'center', color: BOOT_GOLD.light, outline: BOOT_INK.dark });
      r.text('The Reforged Realms', W / 2, 74, { align: 'center', color: BOOT_TEXT.cream });
    }
    // Progress bar: ink track with a 1 px bevel, gold fill with a pale top highlight and a bright head.
    const bx = Math.round((W - BAR.w) / 2), by = BAR.y, bw = BAR.w, bh = BAR.h;
    r.rect(bx - 2, by - 2, bw + 4, bh + 4, BOOT_INK.deep);
    r.rect(bx - 1, by - 1, bw + 2, bh + 2, BOOT_INK.mid);
    r.rect(bx - 1, by - 1, bw + 2, 1, BOOT_INK.high);
    r.rect(bx - 1, by - 1, 1, bh + 2, BOOT_INK.high);
    r.rect(bx, by, bw, bh, BOOT_INK.low);
    const fill = Math.round(bw * this.shown);
    if (fill > 0) {
      r.rect(bx, by, fill, bh, BOOT_GOLD.mid);
      r.rect(bx, by, fill, 1, BOOT_GOLD.pale);
      r.rect(bx, by + 1, fill, 2, BOOT_GOLD.light);
      r.rect(bx, by + bh - 1, fill, 1, BOOT_GOLD.dark);
      if (fill < bw) r.rect(bx + fill - 1, by, 1, bh, BOOT_GOLD.pale);
      if (this.phase === 'ready') {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
        r.withAlpha(0.35 * pulse, () => r.rect(bx, by, bw, bh, BOOT_GOLD.pale));
      }
    }
    if (this.sparkle && logo && logo.anims && logo.anims.sparkle) {
      const name = animFrameAt(logo.anims.sparkle, this.sparkle.t);
      if (name) r.sprite(logo, name, this.sparkle.x, this.sparkle.y);
    }
    r.text(`${this.percent}%`, bx + bw + 6, by - 2, { color: BOOT_TEXT.dim });
    // Status and story lines.
    const sy = by + bh + 10;
    if (this.phase === 'error') {
      const n = this.failed.length;
      r.text(`${BOOT_STATUS.error}${n ? ` (${n})` : ''}`, W / 2, sy, { align: 'center', color: BOOT_TEXT.red });
      if (this.waiting && (this.frame % 56) < 42) r.text('Tap or press any key to retry', W / 2, sy + 13, { align: 'center', color: BOOT_GOLD.light });
      const first = this.failed[0] ? String(this.failed[0]).replace(/^[a-z]+:/, '') : '';
      if (first) r.text(`Missing: ${first}${n > 1 ? ' and more' : ''}`, W / 2, sy + 28, { align: 'center', color: BOOT_TEXT.dim });
    } else if (this.phase === 'ready' && this.waiting) {
      if ((this.frame % 56) < 42) r.text(BOOT_STATUS.ready, W / 2, sy, { align: 'center', color: BOOT_GOLD.light });
      // W15: held upright on a phone the game is a small strip; say so under the prompt (the title repeats it once).
      const v = this.engine.renderer && this.engine.renderer.view;
      if (v && v.touchMode === 'below' && !(this.engine.settings && this.engine.settings.rotateHintSeen)) {
        r.text(BOOT_ROTATE, W / 2, sy + 14, { font: 'large', align: 'center', color: BOOT_TEXT.cream });
        return;
      }
    } else {
      r.text(BOOT_STATUS[this.phase] || BOOT_STATUS.assets, W / 2, sy, { align: 'center', color: BOOT_TEXT.body });
    }
    if (this.phase !== 'error') {
      // Story line: fades in and out around each rotation.
      const k = this.flavorT < 0.4 ? this.flavorT / 0.4 : this.flavorT > 3.0 ? Math.max(0, (3.4 - this.flavorT) / 0.4) : 1;
      const lines = r.wrap(this.flavor[this.flavorIndex] || '', W - 64);
      const fy = Math.max(sy + 17, H - 12 - lines.length * 11);
      lines.forEach((l, i) => r.text(l, W / 2, fy + i * 11, { align: 'center', color: BOOT_TEXT.dim, alpha: 0.9 * k }));
    }
    void logoBottom;
  }

  debugState() {
    return {
      phase: this.phase, progress: Math.round(this.target * 1000) / 1000, shown: Math.round(this.shown * 1000) / 1000,
      percent: this.percent, failed: this.failed.slice(), gate: this.gate, waiting: this.waiting, retries: this.retries,
    };
  }
}

// ------------------------------------------------------------------ engine
export class Engine {
  /**
   * @param {object} opts { canvas, width=384, height=216, seed, debug, storage }
   */
  constructor(opts = {}) {
    this.W = opts.width || GAME_W;
    this.H = opts.height || GAME_H;
    this.debug = !!opts.debug;
    this.frame = 0;          // logic frames since boot
    this.time = 0;           // game seconds since boot (scaled)
    this.renderedFrames = 0;
    this.timeScale = 1;      // debug speed multiplier (LQ_DEBUG.setSpeed)
    this.paused = false;
    this.loaded = false;
    this.game = null;        // the running game's state object (owned by gameplay code; saved by it)
    this.stack = [];
    this.registry = new Map();
    this.transition = null;
    this.error = null;
    this.errors = [];
    this._handlers = new Map();
    this._timers = [];
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._dirty = true;
    this.perf = { interval: [], update: [], draw: [], present: [] };

    this.save = createSave({ storage: opts.storage });
    const saved = this.save.loadSettings();
    let osReduce = false;
    try { osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* ignore */ }
    this.settings = { ...DEFAULT_SETTINGS, reduceMotion: osReduce, ...saved };
    this.rng = createRng(opts.seed ?? ((Date.now() ^ 0x5eed) >>> 0));
    this.tweens = createTweens();
    this.fonts = createFonts();
    this.assets = createAssets();
    this._audioQueue = [];
    this.audio = deferredAudio(this._audioQueue);   // replaced by the real runtime in boot()
    this.bootScene = null;
    this.lazyLoad = Promise.resolve();
    this.canvas = opts.canvas;
    this.renderer = new Renderer(opts.canvas, { width: this.W, height: this.H, fonts: this.fonts, assets: this.assets, settings: this.settings });
    this.r = this.renderer;
    this.renderer.onLayout((view) => { this._dirty = true; this.emit('resize', view); });
    this.input = new Input({ target: opts.canvas, renderer: this.renderer, settings: this.settings });
    this.touch = null;
    try {
      this.touch = new TouchControls({ input: this.input, renderer: this.renderer, settings: this.settings });
      this.input.touch = this.touch;
    } catch (e) { console.warn('[engine] touch controls unavailable', e); }
    this.input.setTouchSkin = (skin) => this.touch && this.touch.setSkin(skin);

    this._onVisibility = () => {
      this.hidden = document.hidden;
      if (!this.hidden) { this._last = performance.now(); this._acc = 0; }
      this.emit('visibility', !this.hidden);
    };
    document.addEventListener('visibilitychange', this._onVisibility);
    const unlock = () => this.audio.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true });
  }

  // ---------------------------------------------------------------- events
  on(evt, fn) { if (!this._handlers.has(evt)) this._handlers.set(evt, new Set()); this._handlers.get(evt).add(fn); return () => this.off(evt, fn); }
  off(evt, fn) { const s = this._handlers.get(evt); if (s) s.delete(fn); }
  emit(evt, ...args) {
    const s = this._handlers.get(evt);
    if (s) for (const fn of [...s]) { try { fn(...args); } catch (e) { console.warn('[engine] handler', evt, e); } }
  }

  // ---------------------------------------------------------------- settings
  /** Change one setting: persists it and applies side effects (audio volumes, scale mode, touch). */
  setSetting(key, value) {
    this.settings[key] = value;
    this.save.saveSettings(this.settings);
    if (['master', 'music', 'sfx', 'ambience'].includes(key)) this._applyVolumes();
    if (key === 'scaleMode' || key === 'backdrop') this.renderer.resize();
    if ((key === 'touchControls' || key === 'touchOpacity') && this.touch) this.touch.refresh();
    this.emit('settings', key, value);
  }
  _applyVolumes() {
    const s = this.settings;
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx, ambience: s.ambience });
  }

  // ---------------------------------------------------------------- scenes
  /** Register a scene: factory is a class (constructed with the engine) or a function engine => scene. */
  registerScene(name, factory) { this.registry.set(name, factory); }
  hasScene(name) { return this.registry.has(name); }
  sceneNames() { return [...this.registry.keys()]; }
  createScene(nameOrScene) {
    if (typeof nameOrScene !== 'string') return nameOrScene;
    const f = this.registry.get(nameOrScene);
    if (!f) throw new Error(`scene "${nameOrScene}" is not registered (known: ${this.sceneNames().join(', ')})`);
    const isClass = typeof f === 'function' && /^class[\s{]/.test(Function.prototype.toString.call(f));
    const s = isClass ? new f(this) : (typeof f === 'function' ? f(this) : f);
    if (!s.name || s.name === f.name) s.name = nameOrScene;
    s.engine = s.engine || this;
    return s;
  }
  get scene() { return this.stack[this.stack.length - 1] || null; }
  get scenes() { return this.stack.slice(); }

  _enter(scene, data) {
    this._call(scene, 'enter', data);
    if (scene.backdrop !== undefined) this.renderer.setBackdrop(scene.backdrop);
    this._dirty = true;
    this.emit('scene', scene);
  }

  /** Push a scene (name or object) on top. The scene below stops updating until it is popped. */
  push(nameOrScene, data) {
    const s = this.createScene(nameOrScene);
    this.stack.push(s);
    this._enter(s, data);
    return s;
  }
  /** Push and get a Promise of the result passed to pop(result). */
  pushAwait(nameOrScene, data) {
    return new Promise((resolve) => {
      const s = this.push(nameOrScene, data);
      s.__resolve = resolve;
    });
  }
  /** Pop the top scene; the scene below gets onResume(result). */
  pop(result) {
    const s = this.stack.pop();
    if (!s) return null;
    this._call(s, 'exit');
    if (s.__resolve) { const r = s.__resolve; s.__resolve = null; r(result); }
    const top = this.scene;
    if (top) {
      if (top.backdrop !== undefined) this.renderer.setBackdrop(top.backdrop);
      this._call(top, 'onResume', result);
    }
    this._dirty = true;
    this.emit('scene', top);
    return s;
  }
  /** Replace the top scene. */
  replace(nameOrScene, data) {
    const old = this.stack.pop();
    if (old) {
      this._call(old, 'exit');
      if (old.__resolve) { const r = old.__resolve; old.__resolve = null; r(undefined); }
    }
    const s = this.createScene(nameOrScene);
    this.stack.push(s);
    this._enter(s, data);
    return s;
  }
  /** Pop everything and start fresh with one scene. */
  reset(nameOrScene, data) {
    while (this.stack.length) {
      const s = this.stack.pop();
      this._call(s, 'exit');
      if (s.__resolve) { const r = s.__resolve; s.__resolve = null; r(undefined); }
    }
    return this.push(nameOrScene, data);
  }

  _call(scene, method, arg) {
    const fn = scene && scene[method];
    if (typeof fn !== 'function') return undefined;
    try { return fn.call(scene, arg); }
    catch (e) { this._fail(e, scene, method); return undefined; }
  }

  _fail(e, scene, where) {
    const msg = `${scene && scene.name ? scene.name : 'scene'}.${where}: ${e && e.message ? e.message : e}`;
    if (!this.errors.some((x) => x.msg === msg)) {
      this.errors.push({ msg, stack: e && e.stack, frame: this.frame });
      console.error('[engine]', msg, e);
    }
    this.error = { msg, scene };
  }

  // ---------------------------------------------------------------- transitions
  /**
   * Cover the screen, run fn (sync or async; typically a push/replace), then uncover.
   * opts: { color='#000', duration=0.5 (seconds, total), style='fade'|'dither'|'iris'|'mosaic'|'wipe'|fn,
   *         x, y (iris center in screen px), ease='inOutQuad', freeze=true (top scene pauses while covering),
   *         hold=0 (seconds fully covered) }
   * Input is suspended for the whole transition. Returns a Promise resolved when fully uncovered.
   */
  fadeTo(fn, opts = {}) {
    const o = { color: '#000000', duration: 0.5, style: 'fade', ease: 'inOutQuad', freeze: true, hold: 0, ...opts };
    if (this.settings.reduceMotion && (o.style === 'mosaic' || o.style === 'iris')) o.style = 'fade';
    return new Promise((resolve) => {
      const run = () => {
        this.input.suspend();
        // Counted in whole frames so a transition always takes exactly the same number of steps.
        const half = Math.max(1, Math.round((o.duration * 60) / 2));
        this.transition = { phase: 'out', f: 0, half, holdFrames: Math.max(0, Math.round(o.hold * 60)), o, fn, resolve };
      };
      if (this.transition) { const prev = this.transition; const pr = prev.resolve; prev.resolve = (v) => { pr(v); run(); }; }
      else run();
    });
  }

  _updateTransition() {
    const tr = this.transition;
    if (!tr) return;
    const toIn = () => { tr.phase = 'in'; tr.f = 0; };
    const toHold = () => { if (tr.holdFrames > 0) { tr.phase = 'hold'; tr.f = 0; } else toIn(); };
    if (tr.phase === 'out') {
      if (++tr.f >= tr.half) {
        tr.phase = 'mid';
        let p;
        try { p = tr.fn ? tr.fn() : null; } catch (e) { this._fail(e, this.scene, 'fadeTo callback'); }
        // Synchronous callbacks continue on this very step (deterministic under LQ_DEBUG.advance);
        // async ones keep the screen covered until they settle.
        if (p && typeof p.then === 'function') p.then(toHold, (e) => { this._fail(e, this.scene, 'fadeTo callback'); toHold(); });
        else toHold();
      }
    } else if (tr.phase === 'hold') {
      if (++tr.f >= tr.holdFrames) toIn();
    } else if (tr.phase === 'in') {
      if (++tr.f >= tr.half) {
        this.transition = null;
        this.input.resume();
        tr.resolve(true);
      }
    }
  }

  _transitionAmount() {
    const tr = this.transition;
    if (!tr) return 0;
    const e = typeof tr.o.ease === 'function' ? tr.o.ease : ease[tr.o.ease] || ease.linear;
    if (tr.phase === 'out') return e(Math.min(1, tr.f / tr.half));
    if (tr.phase === 'mid' || tr.phase === 'hold') return 1;
    return 1 - e(Math.min(1, tr.f / tr.half));
  }

  // ---------------------------------------------------------------- timers (game time)
  /** Resolve after n logic frames (pauses with the game, honours time scale). */
  waitFrames(n) { return new Promise((resolve) => this._timers.push({ at: this.frame + Math.max(0, Math.round(n)), fn: resolve })); }
  /** Resolve after `seconds` of game time. */
  wait(seconds) { return this.waitFrames(seconds * 60); }
  /** Run fn after n logic frames. */
  after(n, fn) { this._timers.push({ at: this.frame + Math.max(0, Math.round(n)), fn }); }

  _runTimers() {
    if (!this._timers.length) return;
    const due = this._timers.filter((t) => t.at <= this.frame);
    if (!due.length) return;
    this._timers = this._timers.filter((t) => t.at > this.frame);
    for (const t of due) { try { t.fn(); } catch (e) { this._fail(e, this.scene, 'timer'); } }
  }

  // ---------------------------------------------------------------- loop
  /** One fixed logic step (1/60 s of game time). */
  step() {
    const t0 = performance.now();
    this.input.update();
    this.tweens.update(STEP);
    this._runTimers();
    const frozen = this.transition && this.transition.o.freeze && this.transition.phase !== 'in';
    if (!this.error && !frozen) {
      const top = this.scene;
      if (top) {
        // Scenes that set updateBelow let the scene under them keep animating (e.g. a dialogue over the field).
        let i = this.stack.length - 1;
        while (i > 0 && this.stack[i].updateBelow) i--;
        // Snapshot: a scene pushed during this step first updates on the NEXT step, so the press that
        // opened it cannot also close it; a scene popped during this step is not updated again.
        const list = this.stack.slice(i);
        for (let j = 0; j < list.length; j++) {
          if (!this.stack.includes(list[j])) continue;
          this._callUpdate(list[j], STEP, j < list.length - 1);
          if (this.error) break;
        }
      }
    } else if (this.error) {
      if (this.input.pressed('cancel') && this.stack.length > 1) { this.error = null; this.pop({ error: true }); }
    }
    this._updateTransition();
    this.renderer.tick();
    this.frame++;
    this.time += STEP;
    this._dirty = true;
    this._lastUpdateMs = (this._lastUpdateMs || 0) + (performance.now() - t0);
  }

  _callUpdate(s, dt, below) {
    if (typeof s.update !== 'function') return;
    try { s.update(dt, below); } catch (e) { this._fail(e, s, 'update'); }
  }

  /** Draw every visible scene, the transition and screen fx, then present. */
  render() {
    const r = this.renderer;
    const t0 = performance.now();
    r.beginFrame();
    let i = this.stack.length - 1;
    while (i > 0 && this.stack[i].transparent) i--;
    if (i < 0) r.clear('#000');
    for (let j = Math.max(0, i); j < this.stack.length; j++) {
      const s = this.stack[j];
      if (typeof s.draw !== 'function') continue;
      r.ctx.save();
      try { s.draw(r); } catch (e) { this._fail(e, s, 'draw'); }
      r.ctx.restore();
      // Defensive: balance camera/clip stacks a scene forgot to pop.
      while (r._camStack.length) r.popCamera();
      r._clipDepth = 0;
    }
    const k = this._transitionAmount();
    if (k > 0) {
      const tr = this.transition;
      const style = typeof tr.o.style === 'function' ? tr.o.style : TRANSITIONS[tr.o.style] || TRANSITIONS.fade;
      r.ctx.save(); r.ctx.setTransform(1, 0, 0, 1, 0, 0);
      try { style(r, k, tr.o); } catch (e) { r.fade(tr.o.color, k); }
      r.ctx.restore();
    }
    r.endFrame();
    if (this.error) this._drawError(r);
    this.emit('postdraw', r);
    const t1 = performance.now();
    r.present();
    const t2 = performance.now();
    this._lastDrawMs = t1 - t0;
    this._lastPresentMs = t2 - t1;
    this.renderedFrames++;
    this._dirty = false;
  }

  _drawError(r) {
    r.ctx.save(); r.ctx.setTransform(1, 0, 0, 1, 0, 0);
    r.rect(8, 8, r.W - 16, 62, 'rgba(60,10,24,0.92)');
    r.strokeRect(8, 8, r.W - 16, 62, '#ff6464');
    r.text('{c:red}Something went wrong.{/c}', 16, 14);
    const lines = r.wrap(this.error.msg, r.W - 32).slice(0, 3);
    lines.forEach((l, i) => r.text(l, 16, 27 + i * 11, { color: 'gray' }));
    if (this.stack.length > 1) r.text('Press cancel to go back.', 16, 58, { color: 'dim' });
    r.ctx.restore();
  }

  _record(list, v) { list.push(v); if (list.length > 120) list.shift(); }

  _loop = (now) => {
    this._raf = requestAnimationFrame(this._loop);
    if (this.hidden || this.paused) { this._last = now; return; }
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt <= 0) return;
    this._record(this.perf.interval, dt * 1000);
    if (dt > MAX_FRAME_DT) dt = STEP; // long stall (tab switch, debugger): skip instead of fast-forwarding
    // Snap to whole refresh intervals so 60 Hz displays get exactly one step per frame (no judder).
    for (let m = 1; m <= 4; m++) if (Math.abs(dt - m * STEP) < 0.002) { dt = m * STEP; break; }
    this._acc += dt * this.timeScale;
    const maxSteps = Math.max(5, Math.ceil(5 * this.timeScale));
    let steps = 0;
    this._lastUpdateMs = 0;
    while (this._acc >= STEP - 1e-6 && steps < maxSteps) { this.step(); this._acc -= STEP; steps++; }
    if (steps >= maxSteps) this._acc = 0;
    if (steps > 0) this._record(this.perf.update, this._lastUpdateMs);
    if (steps > 0 || this._dirty) {
      this.render();
      this._record(this.perf.draw, this._lastDrawMs);
      this._record(this.perf.present, this._lastPresentMs);
    }
  };

  start() {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  }
  stop() { cancelAnimationFrame(this._raf); this._raf = 0; }

  /** Run n logic steps and one render synchronously (debug/automation; deterministic). */
  advance(n = 1) {
    for (let i = 0; i < n; i++) this.step();
    this.render();
  }

  /** Averages over the last ~2 seconds: { fps, frameMs, updateMs, updateMaxMs, drawMs, drawMaxMs, presentMs }. */
  perfStats() {
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const max = (a) => (a.length ? Math.max(...a) : 0);
    const frameMs = avg(this.perf.interval);
    const r2 = (v) => Math.round(v * 100) / 100;
    return {
      fps: r2(frameMs ? 1000 / frameMs : 0), frameMs: r2(frameMs), frameMaxMs: r2(max(this.perf.interval)),
      updateMs: r2(avg(this.perf.update)), updateMaxMs: r2(max(this.perf.update)),
      drawMs: r2(avg(this.perf.draw)), drawMaxMs: r2(max(this.perf.draw)), presentMs: r2(avg(this.perf.present)),
      samples: this.perf.interval.length,
    };
  }

  // ---------------------------------------------------------------- boot
  /**
   * Boot with the loading screen (W6-pwa; see docs/ENGINE_API.md "Loading"):
   *   1. logo + main font (so the screen itself looks right), then
   *   2. the manifest's critical assets (everything not in a lazy group) in PARALLEL with `opts.scenes`
   *      (main.js's scene-registry import: the 1.3 MB of modules the title needs anyway), then
   *   3. the audio runtime (after the assets and scene modules, so its 2.8 MB SFX prefetch never competes with them),
   *   4. fonts + UI art installed, `loaded` = true, 'loaded' emitted, lazy groups started in the background
   *      (engine.lazyLoad resolves when they are all in), then
   *   5. with `opts.gate`, "Tap or press any key" (the press also unlocks audio) before boot() resolves.
   * A critical asset that fails shows a retry prompt; the retry reloads only what is missing.
   * opts: { manifest: 'assets/manifest.json', audio: true, scenes: async fn | null, gate: false, flavor: [lines], lazy: true }
   */
  async boot(opts = {}) {
    const o = { manifest: 'assets/manifest.json', audio: true, scenes: null, gate: false, flavor: null, lazy: true, ...opts };
    const bootScene = new BootScene(this, { gate: o.gate, flavor: o.flavor });
    this.bootScene = bootScene;
    this.stack.push(bootScene);
    this.start();

    // Bar bookkeeping: stage 1 is 6 % of the bar; the rest is shared by asset jobs, the scene modules
    // (worth SCENE_W jobs) and the audio manifest (AUDIO_W). The scene import is atomic, so while it is the
    // last thing outstanding the bar crawls toward its share instead of sitting still.
    const SCENE_W = 8, AUDIO_W = 1;
    const prog = { stage0: 0, assets: 0, assetsTotal: 1, scenes: o.scenes ? 0 : 1, audio: o.audio === false ? 1 : 0 };
    const report = () => {
      const total = prog.assetsTotal + (o.scenes ? SCENE_W : 0) + (o.audio === false ? 0 : AUDIO_W);
      const done = prog.assets + (o.scenes ? prog.scenes * SCENE_W : 0) + (o.audio === false ? 0 : prog.audio * AUDIO_W);
      const k = 0.06 * prog.stage0 + 0.94 * (done / total);
      const ceiling = prog.scenes < 1 ? 0.06 * prog.stage0 + 0.94 * ((done + SCENE_W * 0.85) / total) : k;
      bootScene.setProgress(k, ceiling);
      if (bootScene.phase !== 'error') {
        bootScene.phase = prog.assets < prog.assetsTotal ? 'assets' : prog.scenes < 1 ? 'scenes' : prog.audio < 1 ? 'audio' : bootScene.phase;
      }
    };

    // 1. The logo and the main font first (failures are tolerated: the screen falls back to text).
    try {
      await this.assets.load({ atlases: { logo: 'assets/ui/logo.json' }, fonts: { main: 'assets/ui/font.json' } });
      const f = this.assets.font('main');
      if (f && f.image) this.fonts.register('main', f.def, f.image);
    } catch (e) { console.warn('[engine] boot stage 1', e); }
    prog.stage0 = 1; bootScene.phase = 'assets'; report();

    // 2. Critical assets and the scene modules together.
    let sceneError = null;
    const onAssets = (d, t) => { prog.assets = d; prog.assetsTotal = Math.max(1, t); report(); };
    // The manifest task starts first so `opts.scenes` can await assets.manifestReady (its sync part sets it).
    const manifestTask = this.assets.loadManifest(o.manifest, onAssets);
    const sceneTask = o.scenes
      ? (async () => { try { await o.scenes(); } catch (e) { sceneError = e; } prog.scenes = 1; report(); })()
      : Promise.resolve();
    await manifestTask;
    while (this.assets.criticalMissing().length) {
      bootScene.failed = this.assets.criticalMissing();
      bootScene.phase = 'error';
      console.warn('[engine] boot: critical assets missing', bootScene.failed);
      await bootScene.waitPress();
      bootScene.retries++;
      bootScene.failed = [];
      bootScene.phase = 'assets';
      const before = prog.assets;
      await this.assets.retryMissing((d, t) => { prog.assets = Math.min(prog.assetsTotal, before + d); report(); void t; });
      prog.assets = prog.assetsTotal; report();
    }
    prog.assets = prog.assetsTotal; report();

    // 3. Audio only after the critical assets AND the scene modules are in: its SFX prefetch (2.8 MB, fire and
    //    forget) then fills the idle line while the player reads the prompt instead of delaying it.
    await sceneTask;
    if (o.audio !== false) { await this._initAudio(); prog.audio = 1; report(); }
    if (sceneError) console.error('[engine] scene modules failed to load', sceneError);
    for (const [m, args] of this._audioQueue.splice(0)) { try { this.audio[m](...args); } catch (e) { console.warn('[engine] audio replay', m, e); } }

    // 4. Install fonts and UI art; the game may start.
    for (const id of this.assets.fontIds()) {
      const f = this.assets.font(id);
      if (f && f.image) this.fonts.register(id, f.def, f.image);
    }
    this._installUiArt();
    this.loaded = true;
    this.loadedAtRender = this.renderedFrames;
    this.emit('loaded');
    this.lazyLoad = o.lazy === false ? Promise.resolve(null)
      : this.assets.loadLazy().then((r) => { this.emit('lazyloaded', r); return r; }).catch((e) => { console.warn('[engine] lazy assets', e); return null; });

    // 5. The gate: the press that continues also unlocks audio (engine.unlock listeners).
    bootScene.setProgress(1, 1);
    bootScene.phase = 'ready';
    if (o.gate) {
      // Let the bar visibly reach 100 % before asking.
      await this.waitFrames(8);
      await bootScene.waitPress();
    }
    const i = this.stack.indexOf(bootScene);
    if (i >= 0) this.stack.splice(i, 1);
    this._dirty = true;
  }

  /**
   * Hook up W1-ui-art's assets when present: named text colors (ui.json textColors + rarity), inline icons
   * for {i:id} in text, and the touch-control skin (manifest "touch").
   *   {i:potion}        -> ui frame icon_potion (or a frame named exactly "potion")
   *   {i:btn_confirm}   -> the button glyph for the current device (keyboard Z, gamepad A, touch A)
   */
  _installUiArt() {
    const ui = this.assets.has('ui') ? this.assets.atlas('ui') : null;
    if (ui && ui.meta) {
      setNamedColors(ui.meta.textColors);
      setNamedColors(ui.meta.rarity);
      const glyphs = ui.meta.buttonGlyphs || {};
      this.fonts.setIconResolver((id) => {
        let name = null;
        if (id.startsWith('btn_')) {
          const action = id.slice(4).split('_')[0];   // {i:btn_pageR_shove}: the ability suffix is for touch words (ui/glyphs.js)
          const dev = this.input.lastDevice === 'gamepad' ? 'gamepad' : this.input.lastDevice === 'touch' ? 'touch' : 'keyboard';
          name = (glyphs[dev] && glyphs[dev][action]) || (glyphs.keyboard && glyphs.keyboard[action]);
        } else name = ui.frames[`icon_${id}`] ? `icon_${id}` : id;
        const f = name && ui.frames[name];
        return f ? { image: ui.image, x: f.x, y: f.y, w: f.w, h: f.h } : null;
      });
    }
    const touch = this.assets.manifest && this.assets.manifest.touch;
    if (touch && this.touch) {
      const urls = {};
      for (const [k, p] of Object.entries(touch)) urls[k] = this.assets.url(p);
      this.touch.setSkin(urls);
    }
  }

  async _initAudio() {
    try {
      const mod = await import('./audio.js');
      if (mod && typeof mod.createAudio === 'function') {
        const impl = mod.createAudio({ basePath: BASE_URL });
        this.audio = safeAudio(impl);
        await this.audio.init();
        this._applyVolumes();
      }
    } catch (e) {
      console.warn('[engine] audio unavailable, running silent', e && e.message);
      this.audio = safeAudio(null);
    }
  }
}
