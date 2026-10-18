// Input: game code reads ACTIONS, never raw keys (DESIGN 3).
//   input.pressed(a)   edge: true on the one logic frame the action went down
//   input.held(a)      level: true while any source holds it
//   input.released(a)  edge: true on the frame it went up
//   input.repeat(a)    menu auto-repeat: true on press, then at 18 frames held, then every 5 frames
//   input.heldDir()    most recently pressed direction that is still held ('up'|'down'|'left'|'right'|null)
//   input.lastDevice   'keyboard' | 'gamepad' | 'touch' | 'mouse'
// Sources (keyboard, gamepad, touch overlay, debug injection) feed one ActionState, updated once per
// logic step by the engine, so a tap shorter than a frame is never lost and edges never double-fire.

export const ACTIONS = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'run', 'pageL', 'pageR', 'start'];
export const DIRECTIONS = ['up', 'down', 'left', 'right'];
export const REPEAT_DELAY = 18;
export const REPEAT_RATE = 5;

export const DEFAULT_KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['KeyZ', 'Enter', 'Space', 'NumpadEnter'],
  cancel: ['KeyX', 'Escape', 'Backspace'],
  menu: ['KeyC', 'Tab'],
  run: ['ShiftLeft', 'ShiftRight'],
  pageL: ['KeyQ'],
  pageR: ['KeyE'],
  start: ['Enter', 'NumpadEnter'],
};

// Standard Gamepad mapping button indices.
export const DEFAULT_PAD = {
  confirm: [0],          // A (bottom)
  cancel: [1],           // B (right)
  menu: [2, 3],          // X, Y
  run: [1, 7],           // hold B, or RT
  pageL: [4], pageR: [5],
  start: [9],
  up: [12], down: [13], left: [14], right: [15],
};

/**
 * Pure per-action state machine. Sources set levels; update() derives edges once per logic frame.
 * Node-testable.
 */
export class ActionState {
  constructor(actions = ACTIONS) {
    this.actions = actions;
    this.src = {};        // action -> Set of source ids currently holding it
    this.taps = {};       // action -> count of down-transitions since last update
    this.state = {};      // action -> { held, pressed, released, frames, repeat, order }
    this.orderSeq = 0;
    for (const a of actions) {
      this.src[a] = new Set();
      this.taps[a] = 0;
      this.state[a] = { held: false, pressed: false, released: false, frames: 0, repeat: false, order: 0 };
    }
    this.enabled = true;
  }
  /** Set an action level from a source (e.g. 'kb:KeyZ', 'pad', 'touch'). */
  set(action, sourceId, down) {
    const s = this.src[action];
    if (!s) return;
    if (down) {
      if (!s.has(sourceId)) {
        if (s.size === 0) this.taps[action]++;
        s.add(sourceId);
      }
    } else s.delete(sourceId);
  }
  /** Release everything from one source prefix (window blur, pad disconnect). */
  releaseSource(prefix) {
    for (const a of this.actions) for (const id of [...this.src[a]]) if (id.startsWith(prefix)) this.src[a].delete(id);
  }
  releaseAll() { for (const a of this.actions) this.src[a].clear(); }
  update() {
    for (const a of this.actions) {
      const st = this.state[a];
      const down = this.src[a].size > 0;
      const tapped = this.taps[a] > 0;
      this.taps[a] = 0;
      const wasHeld = st.held;
      st.pressed = tapped || (down && !wasHeld);
      st.held = down || tapped;   // a sub-frame tap still reads as held for its one frame
      st.released = wasHeld && !down && !st.pressed;
      if (st.pressed) { st.frames = 1; st.order = ++this.orderSeq; }
      else if (st.held) st.frames++;
      else st.frames = 0;
      st.repeat = st.pressed || (st.held && st.frames >= REPEAT_DELAY && (st.frames - REPEAT_DELAY) % REPEAT_RATE === 0);
    }
  }
  pressed(a) { const s = this.state[a]; return !!(this.enabled && s && s.pressed); }
  held(a) { const s = this.state[a]; return !!(this.enabled && s && s.held); }
  released(a) { const s = this.state[a]; return !!(this.enabled && s && s.released); }
  repeat(a) { const s = this.state[a]; return !!(this.enabled && s && s.repeat); }
  heldFrames(a) { const s = this.state[a]; return this.enabled && s ? s.frames : 0; }
  /** Clear the pressed/repeat edge of an action for the rest of this frame (one UI layer consumed it). */
  consume(a) { const s = this.state[a]; if (s) { s.pressed = false; s.repeat = false; } }
  consumeAll() { for (const a of this.actions) this.consume(a); }
  /** Most recently pressed direction that is still held. */
  heldDir() {
    if (!this.enabled) return null;
    let best = null, order = -1;
    for (const d of DIRECTIONS) { const s = this.state[d]; if (s && s.held && s.order > order) { best = d; order = s.order; } }
    return best;
  }
}

/** Map {action: [codes]} into {code: [actions]}. */
function invert(map) {
  const out = {};
  for (const [a, codes] of Object.entries(map)) for (const c of codes) (out[c] || (out[c] = [])).push(a);
  return out;
}

const PREVENT_DEFAULT_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace', 'Enter', 'NumpadEnter']);

export class Input {
  /**
   * @param {object} opts { target (canvas), renderer, settings }
   */
  constructor(opts = {}) {
    this.state = new ActionState();
    this.renderer = opts.renderer || null;
    this.settings = opts.settings || {};
    this.target = opts.target || null;
    this.lastDevice = 'keyboard';
    this.keys = { ...DEFAULT_KEYS };
    this.pad = { ...DEFAULT_PAD };
    this._codeMap = invert(this.keys);
    this._padMap = invert(this.pad);
    this._suppress = 0;
    this._listeners = new Set();
    this._text = null;            // array while text mode is on
    this.deadzone = 0.5;
    this._stickDir = null;
    this.touch = null;            // TouchControls instance (set by attachTouch)
    // Pointer (mouse / touch on the canvas, not on the touch controls), in GAME pixels.
    this.pointer = { x: 0, y: 0, down: false, pressed: false, released: false, type: 'mouse', _down: false, _taps: 0, _ups: 0 };
    this._injected = new Map();   // action -> frames remaining (debug/automation)
    if (typeof window !== 'undefined') this._bind();
  }

  // ---------------------------------------------------------------- public API
  pressed(a) { return this._suppress === 0 && this.state.pressed(a); }
  held(a) { return this._suppress === 0 && this.state.held(a); }
  released(a) { return this._suppress === 0 && this.state.released(a); }
  repeat(a) { return this._suppress === 0 && this.state.repeat(a); }
  heldFrames(a) { return this._suppress === 0 ? this.state.heldFrames(a) : 0; }
  heldDir() { return this._suppress === 0 ? this.state.heldDir() : null; }
  /** First direction whose repeat fired this frame (menus): 'up'|'down'|'left'|'right'|null. */
  repeatDir() { if (this._suppress) return null; for (const d of DIRECTIONS) if (this.state.repeat(d)) return d; return null; }
  /** Any of confirm/cancel/menu/start pressed this frame (for "press any button"). */
  anyPressed() { return this._suppress === 0 && (ACTIONS.some((a) => this.state.pressed(a)) || this.pointer.pressed); }
  consume(a) { this.state.consume(a); }
  consumeAll() { this.state.consumeAll(); this.pointer.pressed = false; }
  /** Ignore all input until resume() (counted, so nested callers are safe). Held state keeps tracking. */
  suspend() { this._suppress++; }
  resume() { this._suppress = Math.max(0, this._suppress - 1); }
  get suspended() { return this._suppress > 0; }

  /** Simulate an action for `frames` logic frames (debug/automation/cutscene "auto-advance"). */
  inject(action, frames = 1) { this._injected.set(action, Math.max(1, frames | 0)); }

  /** True when the pointer was pressed this frame inside the given game-pixel rect. */
  tapIn(x, y, w, h) {
    const p = this.pointer;
    return this._suppress === 0 && p.pressed && p.x >= x && p.y >= y && p.x < x + w && p.y < y + h;
  }

  /** Rebind keyboard: setKeyBindings({confirm:['KeyZ','Enter'], ...}) (merged over defaults). */
  setKeyBindings(map) { this.keys = { ...DEFAULT_KEYS, ...map }; this._codeMap = invert(this.keys); }
  setPadBindings(map) { this.pad = { ...DEFAULT_PAD, ...map }; this._padMap = invert(this.pad); }

  /** Text entry (name entry on keyboards). While on, printable keys do not trigger actions. */
  startText() { this._text = []; }
  stopText() { this._text = null; }
  /** Returns and clears typed entries since last call: single characters, or 'Backspace' / 'Enter'. */
  takeText() { if (!this._text) return []; const t = this._text; this._text = []; return t; }

  /** Subscribe to device changes: fn(device). */
  onDevice(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }

  // ---------------------------------------------------------------- per-step update (engine calls this)
  update() {
    this._pollGamepads();
    for (const [a, n] of this._injected) {
      this.state.set(a, 'inject', true);
      if (n <= 1) this._injected.delete(a); else this._injected.set(a, n - 1);
    }
    this.state.update();
    // Release injected actions after this frame so they produce a release edge next frame.
    for (const a of ACTIONS) if (!this._injected.has(a)) this.state.set(a, 'inject', false);
    const p = this.pointer;
    p.pressed = p._taps > 0;
    p.released = p._ups > 0 && !p._down;
    p.down = p._down || p._taps > 0;
    p._taps = 0; p._ups = 0;
    if (this.touch) this.touch.update();
  }

  _setDevice(d) {
    if (this.lastDevice === d) return;
    this.lastDevice = d;
    for (const fn of this._listeners) { try { fn(d); } catch (e) { console.warn(e); } }
  }

  // ---------------------------------------------------------------- keyboard
  _bind() {
    window.addEventListener('keydown', (e) => this._onKey(e, true), { passive: false });
    window.addEventListener('keyup', (e) => this._onKey(e, false), { passive: false });
    window.addEventListener('blur', () => { this.state.releaseAll(); this.pointer._down = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.state.releaseAll(); });
    window.addEventListener('gamepaddisconnected', () => this.state.releaseSource('pad'));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS pinch / double-tap zoom guards.
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || e.target === this.target) e.preventDefault(); }, { passive: false });
    document.addEventListener('dblclick', (e) => e.preventDefault());
    if (this.target) this._bindPointer(this.target);
  }

  _onKey(e, down) {
    const code = e.code || e.key;
    if (down && this._text && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key && e.key.length === 1) { this._text.push(e.key); e.preventDefault(); this._setDevice('keyboard'); return; }
      if (e.key === 'Backspace') { this._text.push('Backspace'); e.preventDefault(); return; }
      // Enter ends text entry (name entry's "Enter when done"); as an action it would pick the glyph under the cursor.
      if (e.key === 'Enter') { this._text.push('Enter'); e.preventDefault(); return; }
    }
    if (!down && this._text && e.key && e.key.length === 1) return;
    const actions = this._codeMap[code];
    if (!actions) return;
    if (e.ctrlKey || e.metaKey || e.altKey) { if (!down) for (const a of actions) this.state.set(a, `kb:${code}`, false); return; }
    if (PREVENT_DEFAULT_CODES.has(code) || actions.length) e.preventDefault();
    if (down && e.repeat) return;
    for (const a of actions) this.state.set(a, `kb:${code}`, down);
    if (down) this._setDevice('keyboard');
  }

  // ---------------------------------------------------------------- gamepad
  _pollGamepads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    let pads;
    try { pads = navigator.getGamepads(); } catch { return; }
    const down = new Set();
    let any = false;
    for (const gp of pads || []) {
      if (!gp || !gp.connected) continue;
      gp.buttons.forEach((b, i) => {
        if (b && (b.pressed || b.value > 0.5)) {
          any = true;
          const acts = this._padMap[i];
          if (acts) for (const a of acts) down.add(a);
        }
      });
      // Left stick -> 4-way direction (dominant axis) with hysteresis.
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const mag = Math.max(Math.abs(ax), Math.abs(ay));
      const th = this._stickDir ? this.deadzone - 0.15 : this.deadzone;
      if (mag > th) {
        const d = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 'left' : 'right') : (ay < 0 ? 'up' : 'down');
        this._stickDir = d; down.add(d); any = true;
      } else this._stickDir = null;
    }
    for (const a of ACTIONS) this.state.set(a, 'pad', down.has(a));
    if (any) this._setDevice('gamepad');
  }

  // ---------------------------------------------------------------- pointer on the canvas
  _bindPointer(el) {
    const toGame = (e) => (this.renderer ? this.renderer.toGame(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY });
    el.addEventListener('pointerdown', (e) => {
      const p = this.pointer; const g = toGame(e);
      p.x = g.x; p.y = g.y; p.type = e.pointerType; p._down = true; p._taps++;
      this._setDevice(e.pointerType === 'mouse' ? 'mouse' : 'touch');
      if (e.pointerType !== 'mouse') e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }, { passive: false });
    el.addEventListener('pointermove', (e) => { const g = toGame(e); this.pointer.x = g.x; this.pointer.y = g.y; });
    const up = (e) => { const p = this.pointer; const g = toGame(e); p.x = g.x; p.y = g.y; p._down = false; p._ups++; };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}
