// Full-screen title card: engine.pushAwait('titleCard', { text, sub, frames, backdrop, bg }) -> resolves when
// it is gone. Fades the text in (20 frames), holds `frames` (default 240; confirm or start cuts the hold),
// fades out. Draws the quantized `dialog_keyart` backdrop (darkened further so the text reads) under the
// text, so it looks the same over the field, the prologue or a black fade; `backdrop: false` or a missing
// atlas gives the flat `bg` color (default near-black).

import { drawBackdrop } from '../ui/keyart.js';

const FADE = 20;

export class TitleCardScene {
  constructor(engine) { this.engine = engine; this.name = 'titleCard'; }
  enter(data = {}) {
    this.text = String(data.text || '');
    this.sub = data.sub ? String(data.sub) : '';
    this.hold = data.frames ?? 240;
    this.color = data.color || 'cream';
    this.bg = data.bg || '#000000';
    // Named backdropId, not backdrop: the engine forwards a scene's `backdrop` (an image) to the renderer.
    this.backdropId = data.backdrop === false ? null : (data.backdrop || 'dialog_keyart');
    this.phase = 'in'; this.f = 0;
  }
  update() {
    const { input } = this.engine;
    this.f++;
    const skip = input.pressed('confirm') || input.pressed('start') || input.pointer.pressed;
    if (skip) { input.consume('confirm'); input.consume('start'); }
    if (this.phase === 'in') { if (this.f >= FADE) { this.phase = 'hold'; this.f = 0; } else if (skip) { this.phase = 'hold'; this.f = this.hold; } }
    else if (this.phase === 'hold') { if (this.f >= this.hold || skip) { this.phase = 'out'; this.f = 0; } }
    else if (this.f >= FADE) this.engine.pop(true);
  }
  alpha() {
    if (this.phase === 'in') return Math.min(1, this.f / FADE);
    if (this.phase === 'out') return Math.max(0, 1 - this.f / FADE);
    return 1;
  }
  draw(r) {
    r.clear(this.bg);
    if (this.backdropId) drawBackdrop(r, this.backdropId, { dark: 0.55 });
    const a = this.alpha();
    const lines = r.wrap(this.text, 320, 'large');
    const lh = 18;
    const total = lines.length * lh + (this.sub ? 16 : 0);
    const y0 = Math.round(r.H / 2 - total / 2);
    lines.forEach((l, i) => r.text(l, r.W / 2, y0 + i * lh, { font: 'large', align: 'center', color: this.color, alpha: a }));
    if (this.sub) r.text(this.sub, r.W / 2, y0 + lines.length * lh + 4, { align: 'center', color: 'gray', alpha: a });
  }
  debugState() { return { text: this.text, phase: this.phase, backdrop: this.backdropId }; }
}

export default TitleCardScene;
