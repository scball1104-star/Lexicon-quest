// Engine dev title: proves text, the cursor menu, every input source and the display settings.
// Reference for W2 scene authors (a scene is a plain class with enter/update/draw).

import { devWindow, DevMenu, buttonName } from './_devUi.js';
import { ACTIONS } from '../core/input.js';
import { createRng } from '../core/rng.js';

const SCALE_MODES = ['integer', 'sharp', 'fit'];
const TOUCH_MODES = ['auto', 'on', 'off'];

export class DevTitleScene {
  constructor(engine) {
    this.engine = engine;
    this.t = 0;
    this.frame = 0;
    this.showInput = false;
    this.toast = null;
    const rng = createRng(77);
    this.stars = Array.from({ length: 90 }, () => ({ x: rng.int(0, 383), y: rng.int(0, 150), s: rng.pick([1, 1, 1, 2]), tw: rng.int(0, 120) }));
    const e = engine;
    const set = (k, list) => () => { const i = list.indexOf(e.settings[k]); e.setSetting(k, list[(i + 1) % list.length]); };
    this.menu = new DevMenu([
      { label: 'Dev Field', go: () => e.fadeTo(() => e.push('_devField'), { style: 'iris', duration: 0.7 }) },
      { label: 'Asset Gallery', go: () => e.fadeTo(() => e.push('_devGallery'), { duration: 0.4 }) },
      { label: 'Input Test', go: () => { this.showInput = !this.showInput; } },
      { label: () => `Scale: ${e.settings.scaleMode}`, go: set('scaleMode', SCALE_MODES) },
      { label: () => `Backdrop: ${e.settings.backdrop}`, go: set('backdrop', ['ambient', 'plain']) },
      { label: () => `Touch controls: ${e.settings.touchControls}`, go: set('touchControls', TOUCH_MODES) },
      { label: () => `Reduce motion: ${e.settings.reduceMotion ? 'on' : 'off'}`, go: () => e.setSetting('reduceMotion', !e.settings.reduceMotion) },
      { label: 'Shake + flash test', go: () => { e.renderer.shake(4, 20); e.renderer.flash('#ffffff', 10); } },
    ]);
  }

  enter() {
    this.engine.audio.music('title');
    this.engine.renderer.setBackdrop(null);
  }

  update(dt) {
    this.t += dt; this.frame++;
    const { input, audio } = this.engine;
    const item = this.menu.update(input, audio);
    if (item) { audio.sfx('confirm'); item.go(); }
    if (input.pressed('cancel') && this.showInput) { this.showInput = false; audio.sfx('cancel'); }
    if (this.toast && --this.toast.frames <= 0) this.toast = null;
  }

  draw(r) {
    const e = this.engine;
    // Night sky with banded gradient and twinkling stars.
    r.gradientV(0, 0, r.W, r.H, '#0b0a1f', '#3a2456', 18);
    for (const s of this.stars) {
      const on = ((this.frame + s.tw) % 120) < 100;
      if (on) r.rect(s.x, s.y, s.s, s.s, s.s > 1 ? '#fff6d8' : '#a9a2e0');
    }
    // Distant hills silhouette.
    for (let x = 0; x < r.W; x++) {
      const h = 18 + Math.round(8 * Math.sin(x / 37) + 5 * Math.sin(x / 13 + 1.3));
      r.rect(x, r.H - h - 22, 1, h + 22, '#1a1430');
      const h2 = 8 + Math.round(5 * Math.sin(x / 23 + 2));
      r.rect(x, r.H - h2 - 6, 1, h2 + 6, '#120e22');
    }
    // Title: logo image if the UI art exists, else the large font, else the fallback font.
    const logo = e.assets.has('logo') ? e.assets.atlas('logo') : null;
    if (logo && logo.frame('logo')) {
      const f = logo.frame('logo');
      r.sprite(logo, f, Math.round((r.W - f.w) / 2), 6, { topLeft: true });
    } else {
      r.text('LEXICON QUEST', r.W / 2, 22, { font: 'large', align: 'center', color: 'gold', outline: '#14101e' });
      r.text('engine dev title', r.W / 2, 38, { align: 'center', color: 'gray' });
    }
    // Menu window.
    const mw = 150, mh = this.menu.items.length * 12 + 12;
    const mx = 26, my = 70;
    devWindow(r, mx, my, mw, mh);
    this.menu.draw(r, mx + 18, my + 6, this.frame);

    // Info window: renderer + device facts (proves layout math on every screen).
    const v = e.renderer.view;
    const ix = 196, iy = 70, iw = 162;
    const lines = [
      `{c:gold}Display{/c}  ${v.integer ? v.scale + 'x' : v.scale.toFixed(2) + 'x'} ${v.mode}`,
      `${v.screenW}x${v.screenH} css @ ${v.dpr}dpr`,
      `touch: ${v.touchMode}  device: {c:cyan}${e.input.lastDevice}{/c}`,
      `held: ${ACTIONS.filter((a) => e.input.held(a)).join(' ') || '-'}`,
    ];
    devWindow(r, ix, iy, iw, lines.length * 11 + 12);
    lines.forEach((l, i) => r.text(l, ix + 8, iy + 6 + i * 11));

    if (this.showInput) this.drawInputPanel(r);

    const hint = `${buttonName(e.input, 'confirm')} select   ${buttonName(e.input, 'cancel')} back   Arrows move`;
    r.text(hint, r.W / 2, r.H - 13, { align: 'center', color: 'dim' });
  }

  drawInputPanel(r) {
    const { input } = this.engine;
    const x = 196, y = 130, w = 162, h = 71;
    devWindow(r, x, y, w, h, { top: '#2c3a8c', bottom: '#10143e' });
    ACTIONS.forEach((a, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const held = input.held(a);
      const tx = x + 8 + col * 76, ty = y + 5 + row * 11;
      r.rect(tx, ty + 3, 5, 5, held ? '#7ee07e' : '#2a2a48');
      r.text(a, tx + 8, ty, { color: held ? 'white' : 'gray' });
      if (held) r.text(String(input.heldFrames(a)), tx + 68, ty, { color: 'gold', align: 'right' });
    });
    const p = input.pointer;
    r.text(`ptr ${Math.round(p.x)},${Math.round(p.y)}${p.down ? ' down' : ''}`, x + 84, y + 5 + 5 * 11, { color: 'cyan' });
  }

  debugState() { return { menuIndex: this.menu.index, showInput: this.showInput }; }
}
