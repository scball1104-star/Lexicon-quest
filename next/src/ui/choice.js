// Choice window: a small FF window listing options with the glove cursor. Two forms:
//   - ChoiceBox: an embedded component (the dialog scene uses it above the text box).
//   - ChoiceScene: a transparent overlay scene. engine.pushAwait('choice', { options, x, y, anchor, cancel })
//     resolves to the chosen index; cancel picks `cancel` (default: the last option) unless cancel === false.
//
//   const box = new ChoiceBox(engine, ['Yes', 'No'], { x, y, anchor: 'bottom-right' });
//   box.update() -> index | -1 (cancel) | null;   box.draw(r);   box.rect

import { drawWindow, WindowAnim } from './window.js';
import { List } from './list.js';
import { fillHero } from './text.js';

export class ChoiceBox {
  /**
   * options: string[] or [{label, disabled}]. opts: x, y (anchor point), anchor ('top-left' default,
   * 'bottom-right', 'bottom-left', 'top-right', 'center'), minWidth, cancel (index | false), scheme, field.
   */
  constructor(engine, options, o = {}) {
    this.engine = engine;
    const r = engine.renderer;
    this.items = (options || []).map((op) => (typeof op === 'string' ? { label: fillHero(op, engine.game) } : { ...op, label: fillHero(op.label, engine.game) }));
    const rowH = o.rowH || 11;
    let tw = 0;
    for (const it of this.items) tw = Math.max(tw, r.measure(it.label));
    const w = Math.max(o.minWidth || 48, tw + 32);
    const h = this.items.length * rowH + 12;
    let x = o.x ?? 0, y = o.y ?? 0;
    const anchor = o.anchor || 'top-left';
    if (anchor.includes('right')) x -= w;
    if (anchor.includes('bottom')) y -= h;
    if (anchor === 'center') { x -= Math.floor(w / 2); y -= Math.floor(h / 2); }
    x = Math.max(2, Math.min(r.W - w - 2, Math.round(x)));
    y = Math.max(2, Math.min(r.H - h - 2, Math.round(y)));
    this.rect = { x, y, w, h };
    this.scheme = o.scheme; this.field = !!o.field; this.alpha = o.alpha;
    this.cancelIndex = o.cancel === false ? -1 : (o.cancel ?? this.items.length - 1);
    this.list = new List({ x: x + 6, y: y + 6, w: w - 12, rowH, rows: this.items.length, items: this.items, textX: 16, index: o.index || 0, cancelSfx: false, confirmSfx: true, wrap: true });
    this.anim = new WindowAnim(engine, o.animate === false ? 0 : 5);
    this.anim.open();
    this.done = false;
  }
  get index() { return this.list.index; }
  /** Returns the chosen index, -1 when cancelled, or null while still open. */
  update() {
    const { input, audio } = this.engine;
    this.anim.update();
    if (!this.anim.isOpen) return null;
    const act = this.list.update(input, audio);
    if (act === 'confirm') { this.done = true; return this.list.index; }
    if (act === 'cancel') {
      if (this.cancelIndex >= 0 && !(this.items[this.cancelIndex] || {}).disabled) {
        if (this.list.index !== this.cancelIndex) { this.list.moveTo(this.cancelIndex); }
        audio.sfx('cancel'); this.done = true; return this.cancelIndex;
      }
      audio.sfx('buzzer');
    }
    return null;
  }
  draw(r) {
    const k = this.anim.k;
    drawWindow(r, this.rect.x, this.rect.y, this.rect.w, this.rect.h, { scheme: this.scheme, field: this.field, alpha: this.alpha, open: k });
    if (k >= 1) this.list.draw(r, { scheme: this.scheme, frame: r.frame });
  }
}

/**
 * Pop a specific scene with a result. Scenes under an `updateBelow` overlay update in the same frame and
 * may push something on top before the overlay dismisses itself, so a plain engine.pop() could remove the
 * wrong scene. When the scene is on top this is engine.pop(); otherwise it is removed from the stack directly.
 */
export function popScene(engine, scene, result) {
  if (engine.scene === scene) return engine.pop(result);
  const i = engine.stack.indexOf(scene);
  if (i < 0) return null;
  engine.stack.splice(i, 1);
  try { if (typeof scene.exit === 'function') scene.exit(); } catch (e) { console.error('[ui] exit', e); }
  if (scene.__resolve) { const r = scene.__resolve; scene.__resolve = null; r(result); }
  engine.emit('scene', engine.scene);
  return scene;
}

export class ChoiceScene {
  constructor(engine) { this.engine = engine; this.transparent = true; this.updateBelow = true; this.name = 'choice'; }
  enter(data = {}) {
    const r = this.engine.renderer;
    const o = { ...data };
    if (o.x == null && o.y == null) { o.x = r.W - 8; o.y = r.H - 70; o.anchor = o.anchor || 'bottom-right'; }
    this.box = new ChoiceBox(this.engine, data.options || data.choices || [], o);
    this.dim = !!data.dim;
  }
  update() {
    const res = this.box.update();
    if (res != null) popScene(this.engine, this, res < 0 ? undefined : res);
  }
  draw(r) {
    if (this.dim) r.withAlpha(0.3, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    this.box.draw(r);
  }
  debugState() { return { index: this.box.index, options: this.box.items.map((i) => i.label) }; }
}

/** Convenience: await the chosen index (cancel = last option unless opts.cancel says otherwise). */
export function pushChoice(engine, options, opts = {}) {
  const scene = new ChoiceScene(engine);
  return engine.pushAwait(scene, { ...opts, options });
}

export default ChoiceScene;
