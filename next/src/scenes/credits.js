// Credits: CREDITS cards (data/text.js) scrolling up over the quantized `dialog_keyart` backdrop (painted
// crop as the fallback) with the triumph theme. engine.push('credits') (or pushAwait); pops when the last
// card has held centered for 4 s. start skips, confirm hurries.

import { CREDITS } from '../data/text.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { fillHero } from '../ui/text.js';

const SPEED = 0.55;      // px per frame
const GAP = 44;

export class CreditsScene {
  constructor(engine) { this.engine = engine; this.name = 'credits'; }
  enter(data = {}) {
    const e = this.engine;
    this.cards = (data.cards || CREDITS).map((c) => ({ heading: fillHero(c.heading || '', e.game), lines: (c.lines || []).map((l) => fillHero(l, e.game)) }));
    this.art = new KeyArt(e, { backdrop: data.backdrop || 'dialog_keyart', cell: data.cell ?? 0, drift: 1.2, range: 12 });
    this.y = 0; this.t = 0; this.done = false; this.holdT = 0;
    // Pre-compute card heights.
    let y = e.renderer.H + 10;
    this.layout = this.cards.map((c) => { const h = (c.heading ? 20 : 0) + c.lines.length * 12; const at = y; y += h + GAP; return { at, h }; });
    this.endY = y;
    e.audio.music(data.music || 'triumph');
    e.renderer.setBackdrop(null);
  }
  finish() {
    if (this.done) return;
    this.done = true;
    this.engine.fadeTo(() => this.engine.pop(true), { duration: 1.0 });
  }
  update(dt) {
    const e = this.engine;
    const { input } = e;
    this.t += dt;
    this.art.update(dt);
    if (this.done) return;
    if (input.pressed('start')) { input.consume('start'); this.finish(); return; }
    const hurry = input.held('confirm') || input.held('cancel') || input.pointer.down;
    const last = this.layout[this.layout.length - 1];
    const lastCenter = last.at + last.h / 2;
    const target = e.renderer.H / 2;
    if (lastCenter - this.y <= target) {
      // Last card centered: hold, then leave.
      this.holdT += dt;
      if (this.holdT > 4 || (hurry && this.holdT > 0.5)) this.finish();
      return;
    }
    this.y += SPEED * (hurry ? 4 : 1);
  }
  draw(r) {
    if (this.art.usesBackdrop) this.art.draw(r, { dark: DARK.one });
    else this.art.draw(r, { dark: 0.55, vignette: true });
    this.cards.forEach((c, i) => {
      const L = this.layout[i];
      let y = Math.round(L.at - this.y);
      if (y + L.h < -4 || y > r.H + 4) return;
      if (c.heading) { r.text(c.heading, r.W / 2, y, { font: 'large', align: 'center', color: 'gold' }); y += 20; }
      for (const line of c.lines) { r.text(line, r.W / 2, y, { align: 'center', color: 'cream' }); y += 12; }
    });
  }
  debugState() {
    const last = this.layout[this.layout.length - 1];
    return { y: Math.round(this.y), done: this.done, holdT: Math.round(this.holdT * 10) / 10, endY: this.endY, lastCardBottom: last ? Math.round(last.at + last.h - this.y) : null,
      music: this.engine.audio.currentMusic ? this.engine.audio.currentMusic() : null, backdrop: this.art.usesBackdrop };
  }
}

export default CreditsScene;
