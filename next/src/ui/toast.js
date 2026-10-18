// Top-center toast strip: "Received Potion x2" with an icon, queued, 1.5 s each, optional jingle.
// Drawn on top of every scene from the engine's postdraw hook, so nothing else needs to call it.
//
//   installToasts(engine)                                  once at boot (title.js install does it)
//   await engine.toasts.show({ text, icon, jingle, sfx, color, frames })
//   await engine.toasts.received('potion', 2)              builds "Received {c:gold}Potion{/c} x2" + item_get jingle
//   await engine.toasts.received(itemInstance)             gear instance: rarity-colored name, equip icon, rarity sound
//   await engine.toasts.received(legendaryInst, 1, { at: [sx, sy] })   legendary / set: the rarity beam rises at
//                                                          screen point `at` (bottom center) for 1.5 s + drop_legendary
//   engine.toasts.received(id, qty, { jingle: false })     silent (the caller plays its own)
//   engine.toasts.gold(120)                                "Received 120 gold"
//   engine.toasts.flash(text, opts)                        short notice without an icon (saved, equipped, ...)
//   toastSpec(item, qty, opts) -> { text, icon, icon16, rarity, jingle, sfx, beam, frames }   pure (node tests)
//
// Rarity mapping (DESIGN 6.4 / 7): common gear and consumables play `item_get`, key items `key_item`; magic,
// rare, legendary and set gear play their `RARITIES[r].sfx` (drop_magic / drop_rare / drop_legendary) instead of
// the jingle, and legendary / set items also get the `beam_<rarity>` sprite with its sparkles.
// `received` resolves when both the toast and the jingle are finished.

import { drawWindow, drawIcon, drawIcon16, uiAtlas } from './window.js';
import { ITEMS, KEY_ITEMS, RARITIES } from '../data/items.js';
import { baseOf, itemName } from '../battle/loot.js';
import { animFrameAt } from '../core/assets.js';

const SLIDE = 8;      // frames in / out
const HOLD = 90;      // 1.5 s
export const BEAM_HOLD = 90;

/**
 * What a "received" toast shows and plays (pure). item: an id string (consumable, key item or equipment base)
 * or a gear instance { base, rarity, name, ... }. opts: jingle (false | id), sfx (false | id), beam (bool),
 * frames (hold frames).
 */
export function toastSpec(item, qty = 1, o = {}) {
  let text, icon, icon16 = false, rarity = 'common', jingle = 'item_get', sfx = null, beam = false;
  if (item && typeof item === 'object') {
    const base = baseOf(item);
    rarity = RARITIES[item.rarity] ? item.rarity : 'common';
    const name = item.name || itemName(item) || (base ? base.name : '???');
    text = `Received {c:${rarity}}${name}{/c}${qty > 1 ? ` x${qty}` : ''}`;
    icon = base ? base.icon : 'bag';
    icon16 = !!(base && base.slot === 'weapon');
  } else {
    const def = ITEMS[item] || null;
    const name = def ? def.name : String(item);
    if (def && def.rarity && RARITIES[def.rarity]) rarity = def.rarity;
    const color = rarity !== 'common' ? rarity : 'gold';
    text = `Received {c:${color}}${name}{/c}${qty > 1 ? ` x${qty}` : ''}`;
    icon = def ? def.icon : 'bag';
    icon16 = !!(def && def.slot === 'weapon');
    if (KEY_ITEMS[item]) jingle = 'key_item';
  }
  if (rarity !== 'common') { jingle = null; sfx = RARITIES[rarity].sfx; }
  beam = rarity === 'legendary' || rarity === 'set';
  if (o.jingle !== undefined) jingle = o.jingle || null;
  if (o.sfx !== undefined) sfx = o.sfx || null;
  if (o.beam !== undefined) beam = !!o.beam;
  return { text, icon, icon16, rarity, jingle, sfx, beam, frames: o.frames || (beam ? BEAM_HOLD : HOLD) };
}

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
        hold: o.frames || HOLD, sfx: o.sfx || null, jingle: o.jingle || null, beam: o.beam || null, resolve, start: null });
    });
  }

  /**
   * Item received: id string with qty, or a gear instance. opts.jingle: false | id (default item_get / key_item);
   * opts.sfx: false | id (default: the rarity drop sound for magic and better); opts.beam: force the beam on / off;
   * opts.at: [x, y] screen point (bottom center) the beam rises from (default: just below the strip, mid screen).
   */
  received(item, qty = 1, o = {}) {
    const spec = toastSpec(item, qty, o);
    const beam = spec.beam ? { rarity: spec.rarity, x: o.at ? o.at[0] : Math.round(this.engine.renderer.W / 2), y: o.at ? o.at[1] : 150 } : null;
    const toast = this.show({ text: spec.text, icon: spec.icon, icon16: spec.icon16, jingle: null, sfx: spec.sfx, frames: spec.frames, beam });
    const j = spec.jingle ? this.engine.audio.jingle(spec.jingle) : Promise.resolve();
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
      if (this.current.beam && !e.settings.reduceMotion) e.renderer.flash('#fff7d6', 4, 0.35);
    }
  }

  /** The rarity beam behind the strip: the ui atlas `beam_<rarity>` loop (bottom-center origin) plus sparkles. */
  drawBeam(r, beam, age, alpha) {
    const ui = uiAtlas(r);
    const k = Math.min(1, age / 10);
    const anim = ui && ui.anims[`beam_${beam.rarity}`];
    const name = anim && animFrameAt(anim, age / 60);
    const f = name && ui.frames[name];
    if (f) {
      // The beam art is a soft translucent column (made for the dark battle stage): over a lit floor and the
      // party sprites it needs a second, additive pass to read as a shaft of light.
      r.withAlpha(k * alpha, () => r.sprite(ui, f, beam.x, beam.y));
      const g = r.ctx; const op = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      r.withAlpha(0.85 * k * alpha, () => r.sprite(ui, f, beam.x, beam.y));
      g.globalCompositeOperation = op;
    } else r.withAlpha(0.8 * k * alpha, () => r.rect(beam.x - 2, beam.y - Math.round(40 * k), 5, Math.round(40 * k), RARITIES[beam.rarity] ? RARITIES[beam.rarity].color : '#f9d77a'));
    const sp = ui && ui.anims[`sparkle_${beam.rarity}`];
    if (sp && age % 24 < 12) {
      const sn = animFrameAt(sp, (age % 24) / 60);
      const sf = ui.frames[sn];
      if (sf) r.withAlpha(alpha, () => r.sprite(ui, sf, beam.x + ((age * 7) % 11) - 5, beam.y - 20 - ((age * 3) % 30)));
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
    if (c.beam) this.drawBeam(r, c.beam, age, alpha * (age > SLIDE + c.hold ? k : 1));
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
