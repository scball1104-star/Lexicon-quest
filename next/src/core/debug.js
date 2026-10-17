// window.LQ_DEBUG: the automation and debugging surface (QA screenshots, autoplay, critics).
//
//   LQ_DEBUG.ready()                 Promise: resolves after assets load and 10 frames have rendered
//   LQ_DEBUG.state()                 plain snapshot: frame, scenes, fps, settings, view, game state, providers
//   LQ_DEBUG.scene()                 name of the top scene
//   LQ_DEBUG.push(name, data) / replace(name, data) / pop(result) / reset(name, data)
//   LQ_DEBUG.setSpeed(x)             game time scale (1 = normal, 4 = fast-forward, 0 = frozen; use advance)
//   LQ_DEBUG.advance(n)              run n logic steps + one render synchronously
//   LQ_DEBUG.press(action, frames)   inject an input action (confirm, up, ...) for n frames
//   LQ_DEBUG.perf()                  frame/update/draw timings averaged over ~2 s
//   LQ_DEBUG.view()                  renderer layout (scale, offsets, touch mode)
//   LQ_DEBUG.overlay(on)             FPS/frame-time overlay (?debug=1 turns it on; F3 toggles)
//   LQ_DEBUG.settings(patch)         read or change settings
//   LQ_DEBUG.errors()                engine errors caught so far
//   LQ_DEBUG.register(name, fn)      add a command; also callable as LQ_DEBUG[name](...) and call(name, ...)
//   LQ_DEBUG.call(name, ...args)
//   LQ_DEBUG.provide(name, fn)       add a state provider: state()[name] = fn()
// Later systems register: warp(mapId, x, y), battle(encId), give(itemId, qty), setFlag(flag, value).

const RESERVED = new Set(['ready', 'state', 'scene', 'push', 'replace', 'pop', 'reset', 'setSpeed', 'advance', 'press',
  'perf', 'view', 'overlay', 'settings', 'errors', 'register', 'call', 'provide', 'commands', 'engine', 'version']);

export function installDebug(engine, opts = {}) {
  const commands = new Map();
  const providers = new Map();
  let overlayOn = !!opts.overlay;
  let readyPromise = null;

  const sceneName = (s) => (s ? s.name || s.constructor?.name || 'scene' : null);

  const api = {
    version: 1,
    get engine() { return engine; },

    ready() {
      if (readyPromise) return readyPromise;
      readyPromise = new Promise((resolve) => {
        const check = () => {
          if (engine.loaded && engine.renderedFrames - (engine.loadedAtRender || 0) >= 10) { resolve(true); return; }
          setTimeout(check, 16);
        };
        check();
      });
      return readyPromise;
    },

    state() {
      const out = {
        frame: engine.frame,
        time: Math.round(engine.time * 1000) / 1000,
        renderedFrames: engine.renderedFrames,
        loaded: engine.loaded,
        scene: sceneName(engine.scene),
        scenes: engine.scenes.map(sceneName),
        transition: engine.transition ? engine.transition.phase : null,
        timeScale: engine.timeScale,
        lastDevice: engine.input.lastDevice,
        touchVisible: !!(engine.touch && engine.touch.visible),
        view: { ...engine.renderer.view },
        settings: { ...engine.settings },
        perf: engine.perfStats(),
        errors: engine.errors.map((e) => e.msg),
        missingAssets: [...engine.assets.missing],
      };
      const top = engine.scene;
      if (top && typeof top.debugState === 'function') {
        try { out.sceneState = top.debugState(); } catch (e) { out.sceneState = { error: String(e) }; }
      }
      if (engine.game) {
        try { out.game = JSON.parse(JSON.stringify(engine.game)); } catch { out.game = '[unserializable]'; }
      }
      for (const [name, fn] of providers) {
        try { out[name] = fn(); } catch (e) { out[name] = { error: String(e) }; }
      }
      return out;
    },
    scene() { return sceneName(engine.scene); },
    push(name, data) { engine.push(name, data); return api.scene(); },
    replace(name, data) { engine.replace(name, data); return api.scene(); },
    pop(result) { engine.pop(result); return api.scene(); },
    reset(name, data) { engine.reset(name, data); return api.scene(); },
    setSpeed(x) { const v = Number(x); engine.timeScale = Number.isFinite(v) ? Math.max(0, v) : 1; return engine.timeScale; },
    advance(n = 1) { engine.advance(n); return engine.frame; },
    press(action, frames = 1) { engine.input.inject(action, frames); return true; },
    perf() { return engine.perfStats(); },
    view() { return { ...engine.renderer.view }; },
    overlay(on = !overlayOn) { overlayOn = !!on; return overlayOn; },
    settings(patch) {
      if (patch && typeof patch === 'object') for (const [k, v] of Object.entries(patch)) engine.setSetting(k, v);
      return { ...engine.settings };
    },
    errors() { return engine.errors.map((e) => ({ msg: e.msg, frame: e.frame })); },
    register(name, fn) {
      if (typeof fn !== 'function') throw new TypeError(`LQ_DEBUG.register(${name}): fn must be a function`);
      commands.set(name, fn);
      if (!RESERVED.has(name)) api[name] = (...args) => fn(...args);
      return name;
    },
    call(name, ...args) {
      const fn = commands.get(name);
      if (!fn) throw new Error(`LQ_DEBUG: unknown command "${name}" (known: ${[...commands.keys()].join(', ') || 'none'})`);
      return fn(...args);
    },
    commands() { return [...commands.keys()]; },
    provide(name, fn) { providers.set(name, fn); },
  };

  window.LQ_DEBUG = api;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3' && (opts.overlay || opts.debug)) { overlayOn = !overlayOn; e.preventDefault(); }
  });

  // FPS / frame-time overlay, drawn after every scene (before present).
  engine.on('postdraw', (r) => {
    if (!overlayOn) return;
    const p = engine.perfStats();
    const g = r.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const line1 = `${Math.round(p.fps)} fps  ${p.frameMs.toFixed(1)} ms`;
    const line2 = `upd ${p.updateMs.toFixed(2)}  drw ${p.drawMs.toFixed(2)}`;
    const w = Math.max(r.measure(line1), r.measure(line2)) + 8;
    g.globalAlpha = 0.72; r.rect(2, 2, w, 25, '#0d0b16'); g.globalAlpha = 1;
    const col = p.fps >= 57 ? 'green' : p.fps >= 45 ? 'yellow' : 'red';
    r.text(line1, 6, 3, { color: col });
    r.text(line2, 6, 14, { color: 'gray' });
    g.restore();
  });

  return api;
}
