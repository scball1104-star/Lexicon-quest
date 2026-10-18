// Touch controls: a DOM overlay (the only UI outside the canvas), shown on touch devices only.
// D-pad on the left, A and B on the right, Menu top-right, a Run toggle, and a fullscreen button where
// the browser allows it. Placement follows renderer.view.touchMode:
//   'bars'    in the pillarbox bars beside the game (landscape phones / tablets)
//   'below'   under the game (portrait)
//   'overlay' translucent over the bottom corners (screens with no room)
// The placeholder skin is pixel art generated here at low resolution and scaled by whole device pixels.
// input.setTouchSkin({dpad, dpad_up, dpad_down, dpad_left, dpad_right, a, a_pressed, b, b_pressed,
//                     menu, menu_pressed, run, run_on, fullscreen}) swaps in real art: each value is a URL
// or { src, rect: [x, y, w, h] } into a sheet.

import { createFonts } from './font.js';

const ART = { dpad: 33, button: 19, pillH: 11 };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// --------------------------------------------------------------- placeholder pixel art
// Replace (not blend) pixels, so translucent layers keep exactly the alpha they are given.
function px(g, x, y, w, h, c) { g.clearRect(x, y, w, h); g.fillStyle = c; g.fillRect(x, y, w, h); }

function drawDpad(pressed) {
  const S = ART.dpad, A = 11, o = (S - A) / 2;
  const c = canvas(S, S); const g = c.getContext('2d');
  const edge = 'rgba(230,222,255,0.92)', fill = 'rgba(24,20,44,0.80)', hi = 'rgba(120,108,190,0.55)', sh = 'rgba(8,6,16,0.85)';
  const hot = 'rgba(96,84,178,0.95)';
  // Outline of the cross.
  px(g, o, 0, A, S, edge); px(g, 0, o, S, A, edge);
  // Fill.
  px(g, o + 1, 1, A - 2, S - 2, fill); px(g, 1, o + 1, S - 2, A - 2, fill);
  // Pressed arm highlight.
  const arms = { up: [o + 1, 1, A - 2, o + 1], down: [o + 1, S - o - 2, A - 2, o + 1], left: [1, o + 1, o + 1, A - 2], right: [S - o - 2, o + 1, o + 1, A - 2] };
  if (pressed && arms[pressed]) px(g, ...arms[pressed], hot);
  // Bevel: light top-left inner edge, dark bottom-right.
  px(g, o + 1, 1, A - 2, 1, hi); px(g, 1, o + 1, o, 1, hi); px(g, 1, o + 1, 1, A - 2, hi); px(g, o + 1, 1, 1, o, hi);
  px(g, o + 1, S - 2, A - 2, 1, sh); px(g, S - 2, o + 1, 1, A - 2, sh); px(g, S - o - 1, o + A - 2, o, 1, sh); px(g, o + A - 2, S - o - 1, 1, o, sh);
  // Center dimple.
  px(g, S / 2 - 2 | 0, S / 2 - 2 | 0, 5, 5, 'rgba(10,8,20,0.55)'); px(g, (S / 2 | 0) - 1, (S / 2 | 0) - 1, 3, 3, 'rgba(60,52,110,0.9)');
  // Arrow triangles.
  const arrow = (dir, color) => {
    const m = S / 2 | 0;
    for (let i = 0; i < 3; i++) {
      const len = 1 + i * 2; // narrow tip at the outer end: arrows point outward
      if (dir === 'up') px(g, m - (len >> 1), 3 + i, len, 1, color);
      if (dir === 'down') px(g, m - (len >> 1), S - 4 - i, len, 1, color);
      if (dir === 'left') px(g, 3 + i, m - (len >> 1), 1, len, color);
      if (dir === 'right') px(g, S - 4 - i, m - (len >> 1), 1, len, color);
    }
  };
  for (const d of ['up', 'down', 'left', 'right']) arrow(d, d === pressed ? '#ffd34d' : 'rgba(220,212,250,0.95)');
  return c.toDataURL();
}

function drawButton(letter, rim, pressed, fonts) {
  const S = ART.button;
  const c = canvas(S, S); const g = c.getContext('2d');
  const r = S / 2 - 0.5, cx = S / 2 - 0.5, cy = S / 2 - 0.5;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r + 0.15) {
      let col;
      if (d > r - 1.2) col = rim;
      else if (d > r - 2.2) col = pressed ? 'rgba(10,8,20,0.9)' : 'rgba(8,6,16,0.75)';
      else {
        const t = (y - x) / S; // top-left lighter
        col = pressed ? 'rgba(92,80,170,0.95)' : (t < -0.25 ? 'rgba(52,46,92,0.88)' : 'rgba(28,24,52,0.84)');
      }
      px(g, x, y, 1, 1, col);
    }
  }
  const f = fonts.fallback;
  const w = f.measure(letter);
  f.draw(g, letter, Math.round((S - w) / 2) + (pressed ? 1 : 0), Math.round((S - 11) / 2) + (pressed ? 1 : 0), { color: pressed ? '#ffd34d' : '#f8f4ec', shadowColor: '#14101e' });
  return c.toDataURL();
}

function drawPill(label, on, fonts) {
  const f = fonts.fallback;
  const tw = f.measure(label);
  const W = tw + 8, H = ART.pillH;
  const c = canvas(W, H); const g = c.getContext('2d');
  const edge = on ? '#ffd34d' : 'rgba(230,222,255,0.9)';
  px(g, 1, 0, W - 2, H, edge); px(g, 0, 1, W, H - 2, edge);
  px(g, 1, 1, W - 2, H - 2, on ? 'rgba(120,92,20,0.92)' : 'rgba(24,20,44,0.82)');
  px(g, 2, 1, W - 4, 1, on ? 'rgba(255,230,140,0.5)' : 'rgba(120,108,190,0.5)');
  f.draw(g, label, 4, 1, { color: on ? '#fff6cf' : '#f8f4ec' });
  return { url: c.toDataURL(), w: W, h: H };
}

function drawFullscreen() {
  const S = 11; const c = canvas(S, S); const g = c.getContext('2d');
  const e = 'rgba(230,222,255,0.9)';
  px(g, 0, 0, S, S, 'rgba(24,20,44,0.7)');
  px(g, 1, 1, 3, 1, e); px(g, 1, 1, 1, 3, e);
  px(g, S - 4, 1, 3, 1, e); px(g, S - 2, 1, 1, 3, e);
  px(g, 1, S - 2, 3, 1, e); px(g, 1, S - 4, 1, 3, e);
  px(g, S - 4, S - 2, 3, 1, e); px(g, S - 2, S - 4, 1, 3, e);
  return c.toDataURL();
}

// --------------------------------------------------------------- controls
export class TouchControls {
  constructor({ input, renderer, settings }) {
    this.input = input;
    this.renderer = renderer;
    this.settings = settings || {};
    this.fonts = createFonts();
    this.visible = false;
    this.autoShown = false;
    this.runLatched = false;
    this.dir = null;
    this.skin = {};
    this._buildArt();
    this._buildDom();
    this._detect();
    renderer.onLayout(() => this.layout());
    input.onDevice((d) => {
      if ((this.settings.touchControls || 'auto') !== 'auto') return;
      if (d === 'touch') this.setVisible(true);
      else if (d === 'keyboard' || d === 'gamepad') this.setVisible(false);
    });
  }

  _buildArt() {
    const f = this.fonts;
    this.art = {
      dpad: drawDpad(null), dpad_up: drawDpad('up'), dpad_down: drawDpad('down'), dpad_left: drawDpad('left'), dpad_right: drawDpad('right'),
      a: drawButton('A', '#ffd34d', false, f), a_pressed: drawButton('A', '#ffd34d', true, f),
      b: drawButton('B', '#9db4ff', false, f), b_pressed: drawButton('B', '#9db4ff', true, f),
      fullscreen: drawFullscreen(),
    };
    const menu = drawPill('MENU', false, f), menuOn = drawPill('MENU', true, f);
    const run = drawPill('RUN', false, f), runOn = drawPill('RUN', true, f);
    this.art.menu = menu.url; this.art.menu_pressed = menuOn.url; this.art.run = run.url; this.art.run_on = runOn.url;
    this.artSize = { dpad: [ART.dpad, ART.dpad], a: [ART.button, ART.button], b: [ART.button, ART.button], menu: [menu.w, menu.h], run: [run.w, run.h], fullscreen: [11, 11] };
  }

  _buildDom() {
    const root = document.createElement('div');
    root.id = 'lq-touch';
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10;display:none;touch-action:none;'
      + '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
    const mk = (name, label) => {
      const el = document.createElement('div');
      el.dataset.control = name;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', label);
      el.style.cssText = 'position:absolute;pointer-events:auto;touch-action:none;background-repeat:no-repeat;'
        + 'background-size:100% 100%;image-rendering:pixelated;image-rendering:crisp-edges;';
      root.appendChild(el);
      return el;
    };
    this.el = {
      dpad: mk('dpad', 'Direction pad'), a: mk('a', 'A: confirm'), b: mk('b', 'B: cancel'),
      menu: mk('menu', 'Menu'), run: mk('run', 'Run toggle'), fullscreen: mk('fullscreen', 'Fullscreen'),
    };
    document.body.appendChild(root);
    this.root = root;
    this._bindDpad();
    this._bindButton('a', 'confirm');
    this._bindButton('b', 'cancel');
    this._bindButton('menu', 'menu');
    this._bindRun();
    this._bindFullscreen();
    this._paint();
  }

  _detect() {
    const mode = this.settings.touchControls || 'auto';
    let coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches); } catch { /* ignore */ }
    if (mode === 'on') this.setVisible(true);
    else if (mode === 'off') this.setVisible(false);
    else {
      this.setVisible(coarse);
      if (coarse) this.input._setDevice('touch'); // prompts show touch glyphs from the first frame
    }
    if (!this._touchListener) {
      this._touchListener = () => {
        if ((this.settings.touchControls || 'auto') === 'auto' && !this.visible) this.setVisible(true);
      };
      window.addEventListener('touchstart', this._touchListener, { passive: true });
    }
  }

  /** Re-apply the settings.touchControls mode ('auto' | 'on' | 'off'). */
  refresh() { this._detect(); this.layout(); this._paint(); }

  setVisible(v) {
    v = !!v;
    if (v === this.visible && this.root.style.display !== (v ? 'block' : 'none')) { /* fallthrough to sync */ }
    this.visible = v;
    this.root.style.display = v ? 'block' : 'none';
    this.renderer.setTouchLayout(v ? { minBar: 84 } : null);
    if (!v) this._releaseAll();
    this.layout();
  }

  /** Release every touch-held action (including a latched Run) when the controls hide. */
  _releaseAll() {
    this.input.state.releaseSource('touch');
    this.dir = null;
    this.runLatched = false;
    for (const k of Object.keys(this._down)) this._down[k] = false;
    this._paint();
  }

  // --------------------------------------------------------------- skin
  // The element box is the visual plus an invisible touch margin (el._vis = { w, h, pad } in css px);
  // the art is drawn at exactly the visual size, centered.
  _bg(el, key) {
    const s = this.skin[key];
    const vis = el._vis || { w: parseFloat(el.style.width) || 0, h: parseFloat(el.style.height) || 0, pad: 0 };
    if (s && typeof s === 'object' && s.rect) {
      const [x, y, w, h] = s.rect;
      const kx = vis.w / w, ky = vis.h / h;
      el.style.backgroundImage = `url("${s.src}")`;
      if (s._iw) el.style.backgroundSize = `${s._iw * kx}px ${s._ih * ky}px`;
      el.style.backgroundPosition = `${vis.pad - x * kx}px ${vis.pad - y * ky}px`;
      el.style.backgroundClip = 'content-box';
      el.style.padding = `${vis.pad}px`;
      el.style.boxSizing = 'border-box';
    } else {
      el.style.backgroundImage = `url("${s || this.art[key]}")`;
      el.style.backgroundSize = `${vis.w}px ${vis.h}px`;
      el.style.backgroundPosition = `${vis.pad}px ${vis.pad}px`;
    }
  }

  /**
   * Replace placeholder art. See the header comment for keys ("run_pressed" is accepted for "run_on").
   * Images are loaded first so each control keeps a whole number of device pixels per art pixel.
   */
  setSkin(map) {
    map = { ...map };
    if (map.run_pressed && !map.run_on) map.run_on = map.run_pressed;
    const loads = Object.entries(map).map(([key, v]) => new Promise((resolve) => {
      const src = typeof v === 'string' ? v : v && v.src;
      if (!src) { resolve(); return; }
      const img = new Image();
      img.onload = () => {
        if (typeof v === 'object') { v._iw = img.naturalWidth; v._ih = img.naturalHeight; }
        const base = ['dpad', 'a', 'b', 'menu', 'run', 'fullscreen'].includes(key) ? key : null;
        if (base) this.artSize[base] = typeof v === 'object' && v.rect ? [v.rect[2], v.rect[3]] : [img.naturalWidth, img.naturalHeight];
        resolve();
      };
      img.onerror = () => { console.warn('[touch] skin image failed', key, src); delete map[key]; resolve(); };
      img.src = src;
    }));
    return Promise.all(loads).then(() => {
      this.skin = { ...this.skin, ...map };
      this.layout();
      this._paint();
    });
  }

  _paint() {
    const e = this.el;
    this._bg(e.dpad, this.dir ? `dpad_${this.dir}` : 'dpad');
    this._bg(e.a, this._down.a ? 'a_pressed' : 'a');
    this._bg(e.b, this._down.b ? 'b_pressed' : 'b');
    this._bg(e.menu, this._down.menu ? 'menu_pressed' : 'menu');
    this._bg(e.run, this.runLatched ? 'run_on' : 'run');
    this._bg(e.fullscreen, 'fullscreen');
  }

  // --------------------------------------------------------------- behaviour
  get _down() { return this.__down || (this.__down = { a: false, b: false, menu: false }); }

  _haptic() {
    if (this.settings.haptics === false) return;
    try { if (navigator.vibrate) navigator.vibrate(6); } catch { /* ignore */ }
  }

  _bindDpad() {
    const el = this.el.dpad;
    const setDir = (d) => {
      if (d === this.dir) return;
      for (const a of ['up', 'down', 'left', 'right']) this.input.state.set(a, 'touch', a === d);
      if (d) this._haptic();
      this.dir = d;
      this._paint();
    };
    const fromEvent = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const dead = r.width * 0.12;
      if (Math.hypot(dx, dy) < dead) return this.dir; // keep current direction inside the dead zone
      return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    };
    let active = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.input._setDevice('touch');
      setDir(fromEvent(e) || 'down');
    }, { passive: false });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === active) setDir(fromEvent(e)); });
    const end = (e) => { if (e.pointerId === active) { active = null; setDir(null); } };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  _bindButton(name, action) {
    const el = this.el[name];
    const set = (down) => {
      if (this._down[name] === down) return;
      this._down[name] = down;
      this.input.state.set(action, `touch:${name}`, down);
      if (down) { this._haptic(); this.input._setDevice('touch'); }
      this._paint();
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // Touch pointers are implicitly captured; release so sliding onto the other button works.
      try { if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      set(true);
    }, { passive: false });
    el.addEventListener('pointerup', () => set(false));
    el.addEventListener('pointercancel', () => set(false));
    el.addEventListener('pointerleave', () => set(false));
    // Slide a thumb from A onto B (or back) without lifting.
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' && e.pressure > 0) set(true); });
  }

  _bindRun() {
    const el = this.el.run;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.runLatched = !this.runLatched;
      this.input.state.set('run', 'touch:run', this.runLatched);
      this._haptic();
      this._paint();
    }, { passive: false });
  }

  _bindFullscreen() {
    const el = this.el.fullscreen;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const d = document;
      try {
        if (d.fullscreenElement) d.exitFullscreen();
        else {
          const p = d.documentElement.requestFullscreen({ navigationUI: 'hide' });
          if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch { /* ignore */ } }).catch(() => {});
        }
      } catch { /* ignore */ }
    }, { passive: false });
  }

  update() { /* state is event-driven; nothing per frame */ }

  // --------------------------------------------------------------- layout
  /**
   * Size and place one control. cssSize is the wanted visual width; the art is scaled by a whole number of
   * DEVICE pixels per art pixel (crisp). pad = invisible touch margin around the visual (css px).
   */
  _place(el, key, cx, cy, cssSize, alpha, pad = 0, round = Math.floor) {
    const v = this.renderer.view;
    const [aw, ah] = this.artSize[key];
    const k = Math.max(1, round((cssSize * v.dpr) / aw));
    const w = (aw * k) / v.dpr, h = (ah * k) / v.dpr;
    const snap = (n) => Math.round(n * v.dpr) / v.dpr;
    const x = snap(cx - w / 2 - pad), y = snap(cy - h / 2 - pad);
    el._vis = { w, h, pad };
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${w + pad * 2}px`, height: `${h + pad * 2}px`, opacity: String(alpha) });
    return { x: x + pad, y: y + pad, w, h };
  }

  layout() {
    if (!this.visible) return;
    const v = this.renderer.view;
    const e = this.el;
    const W = v.screenW, H = v.screenH, s = v.safe;
    const base = this.settings.touchOpacity ?? 0.75;
    const fsOk = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
    e.fullscreen.style.display = fsOk ? 'block' : 'none';
    const R = Math.round;
    if (v.touchMode === 'bars') {
      // Beside the game: d-pad left, A/B right (A up-right of B, SNES style), Menu top-right, Run above the d-pad.
      const lw = v.bars.left, rw = v.bars.right;
      const lcx = s.l + (lw - s.l) / 2, rcx = W - s.r - (rw - s.r) / 2;
      const dp = Math.min(150, Math.max(78, lw - s.l - 2), H * 0.45);
      const cy = Math.min(H - s.b - dp / 2 - 12, H * 0.64);
      this._place(e.dpad, 'dpad', lcx, cy, dp, base, 10);
      // A/B never below 56 css px (fingertips); on a narrow bar they stack more steeply so both stay on the bar.
      const bd = Math.min(66, Math.max(56, (rw - s.r - 6) * 0.5));
      const ra = this._place(e.a, 'a', rcx, cy, bd, base, 6, Math.ceil);
      const off = Math.min(0.48, Math.max(0.18, (rw - s.r - 6 - ra.w) / (2 * ra.w)));
      this._place(e.a, 'a', rcx + ra.w * off, cy - ra.w * 0.42, bd, base, 6, Math.ceil);
      this._place(e.b, 'b', rcx - ra.w * off, cy + ra.w * 0.5, bd, base, 6, Math.ceil);
      this._place(e.menu, 'menu', rcx, s.t + 24, Math.min(70, Math.max(48, rw * 0.56)), base, 8, R);
      this._place(e.run, 'run', lcx, cy - dp / 2 - 30, Math.min(56, Math.max(40, lw * 0.44)), base, 8, R);
      this._place(e.fullscreen, 'fullscreen', lcx, s.t + 24, 24, base * 0.8, 8, R);
    } else if (v.touchMode === 'below') {
      // Under the game (portrait): a handheld layout.
      const top = v.cssY + v.cssH, bottom = H - s.b;
      const room = bottom - top;
      const cy = top + room * 0.55;
      const dp = Math.min(170, room * 0.6, W * 0.42);
      this._place(e.dpad, 'dpad', s.l + 20 + dp / 2, cy, dp, base, 12);
      const bd = Math.min(76, Math.max(48, dp * 0.46));
      const rcx = W - s.r - 22 - bd;
      this._place(e.a, 'a', rcx + bd * 0.55, cy - bd * 0.45, bd, base, 8, R);
      this._place(e.b, 'b', rcx - bd * 0.55, cy + bd * 0.45, bd, base, 8, R);
      const py = top + Math.min(44, room * 0.13);
      this._place(e.run, 'run', W / 2 - 38, py, 52, base, 8, R);
      this._place(e.menu, 'menu', W / 2 + 38, py, 62, base, 8, R);
      this._place(e.fullscreen, 'fullscreen', W / 2, bottom - 30, 26, base * 0.8, 8, R);
    } else {
      // Overlay: translucent, as small as comfortable, hugging the corners.
      const dp = Math.min(120, H * 0.34);
      const a = base * 0.62;
      this._place(e.dpad, 'dpad', s.l + 14 + dp / 2, H - s.b - 12 - dp / 2, dp, a, 10);
      const bd = Math.min(56, Math.max(44, dp * 0.48));
      const rcx = W - s.r - 16 - bd * 1.05;
      const cy = H - s.b - 12 - dp / 2;
      this._place(e.a, 'a', rcx + bd * 0.55, cy - bd * 0.4, bd, a, 6, R);
      this._place(e.b, 'b', rcx - bd * 0.55, cy + bd * 0.45, bd, a, 6, R);
      this._place(e.menu, 'menu', W - s.r - 40, s.t + 18, 54, a, 8, R);
      this._place(e.run, 'run', s.l + 14 + dp / 2, H - s.b - 24 - dp, 44, a, 8, R);
      this._place(e.fullscreen, 'fullscreen', s.l + 22, s.t + 18, 24, a * 0.8, 8, R);
    }
    this._paint();
  }
}
