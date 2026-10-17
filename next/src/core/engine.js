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
import { createAssets, BASE_URL } from './assets.js';
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
class BootScene {
  constructor(engine) { this.engine = engine; this.done = 0; this.total = 0; this.t = 0; }
  update(dt) { this.t += dt; }
  draw(r) {
    r.clear('#0d0b16');
    const w = 120, h = 4, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 + 6);
    const k = this.total ? this.done / this.total : 0;
    r.text('LOADING', r.W / 2, y - 16, { align: 'center', color: '#8c84a8' });
    r.rect(x - 1, y - 1, w + 2, h + 2, '#2a2440');
    r.rect(x, y, w, h, '#14101e');
    r.rect(x, y, Math.round(w * k), h, '#b9a6ff');
    r.rect(x, y, Math.round(w * k), 1, '#e6deff');
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
    this.audio = safeAudio(null);
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
   * Load the asset manifest (showing a loading bar), install loaded fonts, start audio.
   * opts: { manifest: 'assets/manifest.json', audio: true }
   */
  async boot(opts = {}) {
    const bootScene = new BootScene(this);
    bootScene.name = '_boot';
    this.stack.push(bootScene);
    this.start();
    const audioReady = opts.audio === false ? Promise.resolve() : this._initAudio();
    await this.assets.loadManifest(opts.manifest || 'assets/manifest.json', (done, total) => { bootScene.done = done; bootScene.total = total; });
    for (const id of this.assets.fontIds()) {
      const f = this.assets.font(id);
      if (f && f.image) this.fonts.register(id, f.def, f.image);
    }
    this._installUiArt();
    await audioReady;
    const i = this.stack.indexOf(bootScene);
    if (i >= 0) this.stack.splice(i, 1);
    this.loaded = true;
    this.loadedAtRender = this.renderedFrames;
    this.emit('loaded');
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
          const action = id.slice(4);
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
