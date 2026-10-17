// Inn: engine.pushAwait('inn', { price, who }) -> true after a rest (fade, inn_rest jingle, full heal,
// autosave slot 0), false when declined or too poor. Draws nothing itself: the field stays visible under
// the dialog boxes it pushes.

import { heal, serialize, saveMeta } from '../game/state.js';
import { HELP } from '../data/text.js';
import { NPCS } from '../data/npcs.js';

export class InnScene {
  constructor(engine) { this.engine = engine; this.name = 'inn'; this.transparent = true; this.updateBelow = true; }
  enter(data = {}) {
    const e = this.engine;
    this.price = Math.max(0, Math.round(data.price ?? 10));
    this.who = data.who || Object.keys(NPCS).find((id) => NPCS[id].service && NPCS[id].service.type === 'inn' && NPCS[id].map === (e.game ? e.game.map : 'inn')) || 'hob';
    this.started = false;
  }
  update() {
    if (this.started) return;
    this.started = true;
    this.run().catch((err) => { console.error('[inn]', err); this.engine.pop(false); });
  }
  async run() {
    const e = this.engine;
    const g = e.game;
    if (!g) { e.pop(false); return; }
    const offer = HELP.inn.offer.replace('{price}', String(this.price));
    const c = await e.pushAwait('dialog', { who: this.who, text: `${offer} Stay the night?`, choices: ['Rest', 'Not tonight'], cancel: 1 });
    if (c !== 0) { e.pop(false); return; }
    if (g.gold < this.price) {
      await e.pushAwait('dialog', { who: this.who, text: HELP.inn.poor });
      e.pop(false); return;
    }
    g.gold -= this.price;
    await e.fadeTo(async () => {
      await e.audio.jingle('inn_rest', { duckMusic: false });
      heal(g, { full: true });
      try { e.save.save(0, serialize(g), saveMeta(g)); } catch { /* autosave is best effort */ }
    }, { duration: 1.2, hold: 0.2 });
    await e.pushAwait('dialog', { who: null, text: HELP.inn.rest });
    e.pop(true);
  }
  draw() { /* transparent: the field and the dialog boxes do the drawing */ }
  debugState() { return { price: this.price, who: this.who }; }
}

export default InnScene;
