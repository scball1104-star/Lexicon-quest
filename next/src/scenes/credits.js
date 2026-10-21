// Credits: CREDITS cards (data/text.js) scrolling up over the quantized `dialog_keyart` backdrop (painted
// crop as the fallback) with the triumph theme. engine.push('credits') (or pushAwait); pops when the last
// card has held centered for 4 s. start skips, confirm hurries.
// { cards: CREDITS_EP2 } or { episode: 2 }: over dialog_keyart_ep2 with hollowmere. Over-wide lines wrap.

import { CREDITS, CREDITS_EP2 } from '../data/text.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { fillHero } from '../ui/text.js';

const SPEED = 0.55;      // px per frame
const GAP = 44;

export class CreditsScene {
  constructor(engine) { this.engine = engine; this.name = 'credits'; }
  enter(data = {}) {
    const e = this.engine;
    const ep2 = data.episode === 2 || data.cards === CREDITS_EP2;
    this.episode = ep2 ? 2 : 1;
    const cards = data.cards || (ep2 ? CREDITS_EP2 : CREDITS);
    const r = e.renderer;
    const fit = (line) => (r && r.measure && r.measure(line) > r.W - 16 ? r.wrap(line, r.W - 16) : [line]);
    this.cards = cards.map((c) => ({ heading: fillHero(c.heading || '', e.game), lines: (c.lines || []).flatMap((l) => fit(fillHero(l, e.game))) }));
    const backdrop = data.backdrop || (ep2 && e.assets && e.assets.has && e.assets.has('dialog_keyart_ep2') ? 'dialog_keyart_ep2' : 'dialog_keyart');
    this.art = new KeyArt(e, { backdrop, cell: data.cell ?? 0, drift: 1.2, range: 12 });
    this.y = 0; this.t = 0; this.done = false; this.holdT = 0;
    // Pre-compute card heights.
    let y = e.renderer.H + 10;
    this.layout = this.cards.map((c) => { const h = (c.heading ? 20 : 0) + c.lines.length * 12; const at = y; y += h + GAP; return { at, h }; });
    this.endY = y;
    e.audio.music(data.music || (ep2 ? 'hollowmere' : 'triumph'));
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
      music: this.engine.audio.currentMusic ? this.engine.audio.currentMusic() : null, backdrop: this.art.usesBackdrop, art: this.art.backdrop, episode: this.episode,
      first: this.cards[0] ? this.cards[0].lines[0] || '' : '' };
  }
}

export default CreditsScene;
