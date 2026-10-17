// Top-center toast strip: "Received Potion x2" with an icon, queued, 1.5 s each, optional jingle.
// Drawn on top of every scene from the engine's postdraw hook, so nothing else needs to call it.
//
//   installToasts(engine)                                  once at boot (title.js install does it)
//   await engine.toasts.show({ text, icon, jingle, sfx, color, frames })
//   await engine.toasts.received('potion', 2)              builds "Received {c:gold}Potion{/c} x2" + item_get jingle
//   await engine.toasts.received(itemInstance)             gear instance: rarity-colored name, equip icon
//   engine.toasts.received(id, qty, { jingle: false })     silent (the caller plays its own)
//   engine.toasts.gold(120)                                "Received 120 gold"
//   engine.toasts.flash(text, opts)                        short notice without an icon (saved, equipped, ...)
//
// `received` resolves when both the toast and the jingle are finished.

import { drawWindow, drawIcon, drawIcon16 } from './window.js';
import { ITEMS, KEY_ITEMS, RARITIES } from '../data/items.js';
import { baseOf, itemName } from '../battle/loot.js';

const SLIDE = 8;      // frames in / out
const HOLD = 90;      // 1.5 s

export class Toasts {
  constructor(engine) {
    this.engine = engine;
    this.queue = [];
    this.current = null;
  }
  get busy() { return !!this.current || this.queue.length > 0; }

  show(o = {}) {
    return new Promise((resolve) => {
      this.queue.push({ text: String(o.text || ''), icon: o.icon || null, icon16: !!o.icon16, color: o.color || 'white',
        hold: o.frames || HOLD, sfx: o.sfx || null, jingle: o.jingle || null, resolve, start: null });
    });
  }

  /** Item received: id string with qty, or a gear instance. opts.jingle: false | id (default item_get / key_item). */
  received(item, qty = 1, o = {}) {
    let text, icon, icon16 = false;
    if (item && typeof item === 'object') {
      const base = baseOf(item);
      const rar = RARITIES[item.rarity] ? item.rarity : 'common';
      const name = item.name || itemName(item) || (base ? base.name : '???');
      text = `Received {c:${rar}}${name}{/c}`;
      icon = base ? base.icon : 'bag';
      icon16 = !!(base && base.slot === 'weapon');
    } else {
      const def = ITEMS[item] || null;
      const name = def ? def.name : String(item);
      const color = def && def.rarity && RARITIES[def.rarity] && def.rarity !== 'common' ? def.rarity : 'gold';
      text = `Received {c:${color}}${name}{/c}${qty > 1 ? ` x${qty}` : ''}`;
      icon = def ? def.icon : 'bag';
    }
    let jingle = o.jingle;
    if (jingle === undefined) jingle = (typeof item === 'string' && KEY_ITEMS[item]) ? 'key_item' : 'item_get';
    const toast = this.show({ text, icon, icon16, jingle: null, frames: o.frames });
    const j = jingle ? this.engine.audio.jingle(jingle) : Promise.resolve();
    return Promise.all([toast, j]).then(() => true);
  }
  gold(amount, o = {}) {
    return this.show({ text: `Received {c:gold}${amount}{/c} gold`, icon: 'gold', sfx: o.sfx === undefined ? 'coin' : o.sfx, frames: o.frames });
  }
  flash(text, o = {}) { return this.show({ text, icon: o.icon || null, sfx: o.sfx || null, frames: o.frames || 60, color: o.color }); }

  _advance() {
    const e = this.engine;
    if (this.current) {
      const age = e.frame - this.current.start;
      if (age >= SLIDE + this.current.hold + SLIDE) { const c = this.current; this.current = null; c.resolve(true); }
    }
    if (!this.current && this.queue.length) {
      this.current = this.queue.shift();
      this.current.start = e.frame;
      if (this.current.sfx) e.audio.sfx(this.current.sfx);
      if (this.current.jingle) e.audio.jingle(this.current.jingle);
    }
  }

  draw(r) {
    this._advance();
    const c = this.current;
    if (!c) return;
    const e = this.engine;
    const age = e.frame - c.start;
    let k = 1;
    if (age < SLIDE) k = age / SLIDE;
    else if (age > SLIDE + c.hold) k = Math.max(0, 1 - (age - SLIDE - c.hold) / SLIDE);
    const eased = 1 - (1 - k) * (1 - k);
    const tw = r.measure(c.text);
    const iconW = c.icon ? (c.icon16 ? 20 : 16) : 0;
    const w = Math.max(96, tw + 24 + iconW);
    const h = c.icon16 ? 24 : 22;
    const x = Math.round((r.W - w) / 2);
    const y = Math.round(-h + (h + 6) * eased);
    const tr = typeof e._transitionAmount === 'function' ? e._transitionAmount() : 0;
    const alpha = Math.max(0, 1 - tr);
    if (alpha <= 0) return;
    r.ctx.save(); r.ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawWindow(r, x, y, w, h, { alpha: 0.96 * alpha });
    let tx = x + 12;
    if (c.icon) {
      if (c.icon16) { drawIcon16(r, c.icon, x + 8, y + 4, { alpha }); tx = x + 8 + 20; }
      else { drawIcon(r, c.icon, x + 8, y + 5, { alpha }); tx = x + 8 + 16; }
    }
    r.text(c.text, tx, y + Math.floor((h - 11) / 2), { color: c.color, alpha });
    r.ctx.restore();
  }
}

export function installToasts(engine) {
  if (engine.toasts) return engine.toasts;
  const t = new Toasts(engine);
  engine.toasts = t;
  engine.on('postdraw', (r) => t.draw(r));
  return t;
}
