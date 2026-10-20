// Prologue: title cards over the quantized `dialog_keyart` backdrop (darkened Willowmere with the vignette
// baked in; the painted crop is the fallback), text from data/story/ep1.js PROLOGUE. Confirm advances,
// start skips everything, then the field starts at START_MAP / START_POS (the world scene runs wake_up).
// enter({ attract: true }) plays the cards as the title's attract mode and pops back on any input.

import { PROLOGUE } from '../data/story/ep1.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { deviceOf } from '../ui/glyphs.js';
import { START_MAP, START_POS } from '../game/state.js';

const FADE = 30, HOLD = 240;

export class PrologueScene {
  constructor(engine) { this.engine = engine; this.name = 'prologue'; }

  enter(data = {}) {
    const e = this.engine;
    this.attract = !!data.attract;
    this.cards = (data.cards || PROLOGUE).slice();
    this.index = 0; this.phase = 'in'; this.f = 0; this.t = 0; this.done = false;
    this.hold = data.frames || HOLD;
    this.art = new KeyArt(e, { backdrop: data.backdrop || 'dialog_keyart', cell: data.cell ?? 0, drift: 1.4, range: 14 });
    e.audio.music('title');
    e.renderer.setBackdrop(null);
  }

  finish() {
    const e = this.engine;
    if (this.done) return;
    this.done = true;
    if (this.attract) { e.fadeTo(() => e.pop(), { duration: 0.8 }); return; }
    e.fadeTo(() => {
      if (e.hasScene('field')) e.reset('field', { map: START_MAP, x: START_POS.x, y: START_POS.y, dir: START_POS.dir });
      else e.reset('_uiStage', { music: 'willowmere' });
    }, { duration: 1.2, hold: 0.4 });
  }

  update(dt) {
    const e = this.engine;
    const { input } = e;
    this.t += dt;
    this.art.update(dt);
    if (this.done) return;
    if (this.attract && input.anyPressed()) { this.finish(); return; }
    if (input.pressed('start')) { input.consume('start'); input.consume('confirm'); this.finish(); return; }
    const advance = input.pressed('confirm') || input.pressed('cancel') || input.pointer.pressed;
    this.f++;
    if (this.phase === 'in') { if (this.f >= FADE) { this.phase = 'hold'; this.f = 0; } if (advance) { this.phase = 'out'; this.f = 0; } }
    else if (this.phase === 'hold') { if (this.f >= this.hold || advance) { this.phase = 'out'; this.f = 0; } }
    else if (this.phase === 'out') {
      if (this.f >= FADE / 2) {
        this.index++;
        if (this.index >= this.cards.length) { this.finish(); return; }
        this.phase = 'in'; this.f = 0;
      }
    }
  }

  alpha() {
    if (this.phase === 'in') return Math.min(1, this.f / FADE);
    if (this.phase === 'out') return Math.max(0, 1 - this.f / (FADE / 2));
    return 1;
  }

  draw(r) {
    const card = this.cards[this.index];
    const a = card ? this.alpha() : 0;
    const lines = card ? r.wrap(card, 300, 'large') : [];
    const lh = 18;
    const y0 = Math.round(r.H / 2 - (lines.length * lh) / 2) - 4;
    // dialog_keyart is already at 62 percent brightness with a baked vignette; one rung darker under the
    // cards, and the text strip is a band two rungs darker drawn in the backdrop's own colours (no alpha).
    const band = card ? { y: y0 - 10, h: lines.length * lh + 20, dark: DARK.two, alpha: a } : null;
    if (this.art.usesBackdrop) this.art.draw(r, { dark: DARK.one, band });
    else this.art.draw(r, { dark: 0.5, vignette: true, band });
    if (!card) return;
    const dy = this.phase === 'in' ? Math.round((1 - a) * 4) : 0;
    lines.forEach((l, i) => r.text(l, r.W / 2, y0 + i * lh + dy, { font: 'large', align: 'center', color: 'cream', alpha: a }));
    const hint = this.attract ? (deviceOf(this.engine) === 'touch' ? 'Tap to return' : 'Press any button') : `${this.index + 1} / ${this.cards.length}`;
    r.text(hint, r.W - 6, r.H - 13, { align: 'right', color: 'dim', alpha: 0.8 });
  }

  debugState() { return { index: this.index, phase: this.phase, attract: this.attract, done: this.done }; }
}

export default PrologueScene;
