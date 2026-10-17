// Full-screen title card: engine.pushAwait('titleCard', { text, sub, frames }) -> resolves when it is gone.
// Fades the text in (20 frames), holds `frames` (default 240; confirm or start cuts the hold), fades out.
// Draws an opaque dark background so it reads the same over the field, the prologue or a black fade.

const FADE = 20;

export class TitleCardScene {
  constructor(engine) { this.engine = engine; this.name = 'titleCard'; }
  enter(data = {}) {
    this.text = String(data.text || '');
    this.sub = data.sub ? String(data.sub) : '';
    this.hold = data.frames ?? 240;
    this.color = data.color || 'cream';
    this.bg = data.bg || '#000000';
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
    const a = this.alpha();
    const lines = r.wrap(this.text, 320, 'large');
    const lh = 18;
    const total = lines.length * lh + (this.sub ? 16 : 0);
    const y0 = Math.round(r.H / 2 - total / 2);
    lines.forEach((l, i) => r.text(l, r.W / 2, y0 + i * lh, { font: 'large', align: 'center', color: this.color, alpha: a }));
    if (this.sub) r.text(this.sub, r.W / 2, y0 + lines.length * lh + 4, { align: 'center', color: 'gray', alpha: a });
  }
  debugState() { return { text: this.text, phase: this.phase }; }
}

export default TitleCardScene;
