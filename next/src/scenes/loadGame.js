// Save / Load slots. engine.pushAwait('loadGame', { mode: 'load' | 'save' }).
//   load: picks a slot -> deserialize -> engine.game -> engine.reset('field') (or the UI stage), never resolves
//         normally (the reset pops it); cancel resolves undefined.
//   save: picks a slot (confirm overwrite), writes serialize(g) + saveMeta(g), save_chime, resolves true.
// Slot 0 (autosave) is listed in load mode when it exists.

import { List } from '../ui/list.js';
import { drawWindow, drawPortrait, drawIcon, drawLabel, schemeColors } from '../ui/window.js';
import { drawCursor } from '../ui/cursor.js';
import { drawHelpBar } from '../ui/help.js';
import { fmtGold, fmtTime, roman } from '../ui/text.js';
import { serialize, deserialize, saveMeta } from '../game/state.js';
import { BANNERS, HELP } from '../data/text.js';
import { packsToAwait, awaitPacks } from '../game/packs.js';

export class LoadGameScene {
  constructor(engine) { this.engine = engine; this.name = 'loadGame'; this.transparent = true; }
  enter(data = {}) {
    const e = this.engine;
    this.mode = data.mode === 'save' ? 'save' : 'load';
    this.busy = false;
    this.note = null;
    this.refresh();
    const first = this.slots.findIndex((s) => s.exists);
    // Every slot fits between the title and the help bar (y 190), so nothing scrolls under it: three slots
    // keep 46 px rows, four (autosave + three records) tighten to 42.
    const n = this.slots.length;
    const rowH = n <= 3 ? 46 : 42;
    this.list = new List({ x: 36, y: n <= 3 ? 24 : 20, w: 312, rowH, rows: n, items: this.slots.map((s) => ({ id: s.slot, label: null, disabled: this.mode === 'load' && !s.exists })), bar: false,
      index: this.mode === 'load' ? Math.max(0, first) : Math.max(0, this.slots.findIndex((s) => s.slot === 1)) });
    void e;
  }
  /** The window drawn for slot i: the row with a 2 px gap below it. */
  slotRect(i) {
    const rr = this.list.rowRect(i);
    return { x: rr.x - 4, y: rr.y - 1, w: rr.w + 8, h: rr.h - 2 };
  }
  refresh() {
    const list = this.engine.save.list(true);
    this.slots = this.mode === 'load' ? list.filter((s) => s.slot !== 0 || s.exists) : list.filter((s) => s.slot !== 0);
  }
  update() {
    const e = this.engine;
    const { input, audio } = e;
    if (this.busy) return;
    if (this.note && --this.noteT <= 0) this.note = null;
    const act = this.list.update(input, audio);
    if (act === 'cancel') { e.pop(undefined); return; }
    if (act === 'confirm') {
      const slot = this.slots[this.list.index];
      if (this.mode === 'load') this.load(slot); else this.saveTo(slot);
    }
  }
  async saveTo(slot) {
    const e = this.engine;
    const g = e.game;
    if (!g) { e.audio.sfx('buzzer'); return; }
    this.busy = true;
    if (slot.exists) {
      const i = await e.pushAwait('choice', { options: ['Overwrite', 'Keep it'], x: e.renderer.W / 2, y: e.renderer.H / 2, anchor: 'center', cancel: 1 });
      if (i !== 0) { this.busy = false; return; }
    }
    const ok = e.save.save(slot.slot, serialize(g), saveMeta(g));
    if (!ok) { e.audio.sfx('buzzer'); this.note = 'Could not write the record.'; this.noteT = 120; this.busy = false; return; }
    e.audio.sfx('save_chime');
    this.refresh();
    this.note = HELP.save.done; this.noteT = 90;
    await e.wait(0.9);
    e.pop(true);
  }
  load(slot) {
    const e = this.engine;
    const env = e.save.loadEnvelope(slot.slot);
    const g = env ? deserialize(env.data) : null;
    if (!g) { e.audio.sfx('buzzer'); this.note = 'This record cannot be read.'; this.noteT = 120; return; }
    this.busy = true;
    e.audio.sfx('confirm');
    e.fadeTo(() => {
      const enter = () => {
        e.game = g;
        if (e.hasScene('field')) e.reset('field');
        else e.reset('_uiStage', { music: 'willowmere' });
      };
      // Expansion packs (docs/PWA_PACKS.md): a save that wants a pack gets it, behind the fade, for at most 1.5 s, then goes on.
      // Synchronous when no pack is wanted, so nothing changes while the switches are off.
      const ids = packsToAwait(g.flags);
      return ids.length ? awaitPacks(ids).then(enter) : enter();
    }, { duration: 0.8 });
  }
  draw(r) {
    r.withAlpha(0.86, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    r.text(this.mode === 'load' ? 'Load Game' : 'Save Game', 192, this.list.y > 20 ? 4 : 2, { font: 'large', align: 'center', color: 'cream' });
    const sel = this.list.index;
    const tight = this.list.rowH < 46;
    const ly = tight ? [3, 14, 26] : [5, 17, 29];   // the three text lines inside a slot window
    this.slots.forEach((s, i) => {
      if (!this.list.isVisible(i)) return;
      const { x, y, w, h } = this.slotRect(i);
      drawWindow(r, x, y, w, h, { alpha: 0.94 });
      const title = s.slot === 0 ? 'Autosave' : `Record ${s.slot}`;
      r.text(title, x + 10, y + ly[0], { color: 'gold' });
      if (!s.exists) r.text('No record.', x + 10, y + ly[1], { color: 'dim' });
      else {
        const m = s.meta || {};
        (m.party || ['hero']).slice(0, 3).forEach((id, k) => drawPortrait(r, id, x + 60 + k * 38, y + (tight ? 2 : 5), 32));
        const tx = x + 180;
        const name = m.name || 'Hero';
        r.text(name, tx, y + ly[0], { color: 'white' });
        drawLabel(r, 'lv', tx + r.measure(name) + 6, y + ly[0] + 3);
        r.text(String(m.level || 1), tx + r.measure(name) + 17, y + ly[0]);
        r.text(`Chapter ${roman(m.chapter || 1)}`, x + w - 10, y + ly[0], { align: 'right', color: 'gray' });
        const b = BANNERS[m.map];
        r.text(b ? b.title : (m.map || ''), x + w - 10, y + ly[1], { align: 'right', color: 'cream' });
        r.text(fmtTime(m.playtime || 0), tx, y + ly[1], { color: 'gray' });
        drawIcon(r, 'gold', tx, y + ly[2] - 2);
        r.text(fmtGold(m.gold || 0), tx + 14, y + ly[2], { color: 'gold' });
        const when = s.savedAt ? new Date(s.savedAt) : null;
        if (when && !isNaN(when)) r.text(when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }), x + w - 10, y + ly[2], { align: 'right', color: 'dim' });
      }
      // The chosen slot glows with a gold frame; the others sit back in shadow so the choice reads at a glance.
      if (i === sel) {
        const c = schemeColors(r);
        const pulse = 0.12 + 0.06 * Math.sin((r.frame || 0) / 9);
        r.withAlpha(pulse, () => r.rect(x + 3, y + 3, w - 6, h - 6, c.highlight));
        r.withAlpha(1, () => { r.rect(x, y, w, 1, c.accent); r.rect(x, y + h - 1, w, 1, c.accent); r.rect(x, y, 1, h, c.accent); r.rect(x + w - 1, y, 1, h, c.accent); });
      } else r.withAlpha(0.4, () => r.rect(x, y, w, h, '#0b0918'));
    });
    const hint = this.note || (this.mode === 'load' ? 'Choose a record to continue.' : HELP.save.prompt);
    drawHelpBar(r, hint, { y: 190, h: 24, right: this.mode === 'load' ? 'Load' : 'Save' });
    // The finger last, so nothing covers it: fingertip on the chosen slot's left edge, halfway down.
    if (!this.busy && this.list.isVisible(sel)) {
      const { x, y, h } = this.slotRect(sel);
      drawCursor(r, x + 2, y + Math.floor(h / 2), { frame: r.frame });
    }
  }
  debugState() { return { mode: this.mode, index: this.list.index, slots: this.slots.map((s) => ({ slot: s.slot, exists: s.exists })), busy: this.busy }; }
}

export default LoadGameScene;
