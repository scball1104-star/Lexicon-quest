// The Episode 6 quick start on the title (E6-scene-ui; docs/EPISODE6_PLAN.md 10.4 and 10.5). hooks.js HOOKS.title(scene) loads
// this file on first use and calls offerRow(scene, offer, hooks) once ep6Offer() says to show the row:
//   1. the row "Episode 6: new party" after the other episode rows (before Config), its help line beside it while highlighted,
//   2. on confirm, the slot rule of episodes.js pickRunSlot (the run never replaces a save): slot 0 free starts at once; else the
//      notice "This party will save to Record N." with Back (default) / Start; every slot full: the refusal, Back only,
//   3. name entry (nameEntryEp6, the newest Episode 5 finisher's hero name filled in), then hooks.start: newGameEp6 in its slot.
// The title's own code is untouched (Episode 4's pattern, src/data/ep4/title.js, whose layout it shares): the row goes into the
// title's List in place (so the Episode 4 row's wrapper on that List survives), the menu is re-laid so the episode rows stay
// together when it folds into two columns on the phone (foldTitleRows), confirm is caught by wrapping whichever List the title
// holds each frame, and the ask is drawn by the title's own save-guard drawing (scene.guard) with a transparent scene on top.

import { tapRowHeight } from '../../ui/list.js';
import { drawWindow } from '../../ui/window.js';
import { ChoiceBox } from '../../ui/choice.js';
import { NameEntryScene } from '../../scenes/nameEntry.js';
import { pickRunSlot, foldTitleRows } from '../../game/episodes.js';
import { layoutRows } from '../ep4/title.js';
import { EP6_ROW_LABEL, EP6_ROW_HELP } from './hooks.js';

export const ROW_ID = 'ep6';
export { layoutRows };

/** Add the row to a title scene (idempotent). Returns true when the row is there. */
export function offerRow(scene, offer = {}, hooks = {}) {
  if (!scene || scene.name !== 'title' || !scene.menu || !Array.isArray(scene.menu.items)) return false;
  const e = scene.engine;
  scene.ep6 = offer;
  const m = scene.menu;
  if (!m.items.some((it) => it.id === ROW_ID)) {
    const last = m.items.findLastIndex((it) => /^ep\d$/.test(it.id)), cfg = m.items.findIndex((it) => it.id === 'config');
    const at = last >= 0 ? last + 1 : cfg < 0 ? m.items.length : cfg;
    const cur = m.items[m.index];
    m.items.splice(at, 0, { id: ROW_ID, label: EP6_ROW_LABEL });
    const measure = (s) => (e && e.renderer && e.renderer.measure ? e.renderer.measure(s) : String(s).length * 5);
    const L = layoutRows(m.items, m.rowH, measure);
    if (L.columns > 1) foldTitleRows(m.items);
    scene.win = L.win;
    Object.assign(m, { x: L.win.x + 6, y: L.win.y + 7, w: L.win.w - 12, rows: L.rows, columns: L.columns, columnMajor: L.columns > 1,
      colW: L.columns > 1 ? L.colW : Math.floor(L.win.w - 12) });
    m.index = Math.max(0, m.items.indexOf(cur));
    if (typeof m.ensureVisible === 'function') m.ensureVisible();
  }
  if (!scene.__ep6) {
    scene.__ep6 = true;
    const update = scene.update.bind(scene), draw = scene.draw.bind(scene);
    scene.update = (dt) => { catchConfirm(scene, hooks); update(dt); };
    scene.draw = (r) => { draw(r); drawNote(scene, r); };
    if (e && e.hasScene && !e.hasScene('nameEntryEp6')) e.registerScene('nameEntryEp6', NameEntryEp6Scene);
  }
  return true;
}

/** Wrap the List the title holds now (another pack may have rebuilt it) so confirm on the row opens the ask. */
function catchConfirm(scene, hooks) {
  const m = scene.menu;
  if (!m || m.__ep6) return;
  m.__ep6 = true;
  const update = m.update.bind(m);
  m.update = (input, audio) => {
    const act = update(input, audio);
    if (act === 'confirm' && m.item && m.item.id === ROW_ID) { openAsk(scene, hooks); return null; }
    return act;
  };
}

/** The help line beside the menu while the row is highlighted (the other episode rows' style). */
function drawNote(scene, r) {
  const m = scene.menu;
  if (!m || !m.item || m.item.id !== ROW_ID || scene.guard || scene.engine.scene !== scene) return;
  const nx = scene.win.x + scene.win.w + 6;
  const width = Math.max(60, 384 - 4 - nx);
  const lines = r.wrap(EP6_ROW_HELP, width - 12);
  const nh = lines.length * 11 + 10, ny = Math.max(4, scene.win.y + scene.win.h - nh);
  drawWindow(r, nx, ny, width, nh, { kind: 'thin' });
  lines.forEach((l, i) => r.text(l, nx + 6, ny + 5 + i * 11, { color: 'cream' }));
}

/** Confirm on the row: slot 0 free starts at once; else the notice (or the refusal) over the title. */
async function openAsk(scene, hooks) {
  const e = scene.engine;
  const pick = pickRunSlot(e.save);
  if (pick.ok && pick.notice == null) { toNameEntry(scene, pick.slot); return; }
  scene.busy = true;
  e.audio.sfx('menu_open');
  const res = await e.pushAwait(new Ep6AskScene(e, scene, pick), {});
  scene.guard = null;
  scene.busy = false;
  if (res && res.start) toNameEntry(scene, res.slot);
  void hooks;
}

function toNameEntry(scene, slot) {
  const e = scene.engine;
  scene.busy = true;
  const name = (scene.ep6 && scene.ep6.name) || undefined;
  e.fadeTo(() => e.replace('nameEntryEp6', { name, slot, artT: scene.art ? scene.art.t : 0 }), { duration: 0.7 });
}

/** The notice or the refusal, read by this scene and drawn by the title's guard drawing. Pops { start, slot } or null. */
export class Ep6AskScene {
  constructor(engine, title, pick) { this.engine = engine; this.title = title; this.pick = pick; this.name = 'ep6Ask'; this.transparent = true; }
  enter() {
    const e = this.engine, pick = this.pick;
    this.options = pick.ok ? ['back', 'start'] : ['back'];
    const labels = pick.ok ? ['Back', 'Start'] : ['Back'];
    const lines = String(pick.notice || '').split(/(?<=\.) /).map((text) => ({ text, color: pick.ok ? 'white' : 'gold' }));   // one sentence a line
    const msgH = lines.length * 11 + 12, rowH = tapRowHeight(e, 11), boxH = labels.length * rowH + 12;
    const top = Math.max(4, Math.round((216 - (msgH + 4 + boxH)) / 2));
    this.lines = lines;
    this.msg = { x: 32, y: top, w: 320, h: msgH };
    // Back is the default and the cancel answer; two taps on a row that is not highlighted, as every title question
    this.box = new ChoiceBox(e, labels, { x: 192, y: top + msgH + 4 + Math.floor(boxH / 2), anchor: 'center', minWidth: 150, index: 0, cancel: 0, tapMode: 'double' });
    if (this.title) this.title.guard = { id: ROW_ID, kind: 'ep6', msg: this.msg, lines, box: this.box, options: this.options.map((id) => ({ id })), free: null };
  }
  update() {
    const res = this.box.update();
    if (res == null) return;
    const id = this.options[res] || 'back';
    this.engine.pop(id === 'start' && this.pick.ok ? { start: true, slot: this.pick.slot } : null);
  }
  draw(r) {
    if (this.title && this.title.guard && this.title.guard.box === this.box) return;   // the title draws it
    r.withAlpha(0.55, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    drawWindow(r, this.msg.x, this.msg.y, this.msg.w, this.msg.h);
    this.lines.forEach((l, i) => r.text(l.text, r.W / 2, this.msg.y + 6 + i * 11, { align: 'center', color: l.color }));
    this.box.draw(r);
  }
  debugState() { return { options: this.options.slice(), index: this.box.index, slot: this.pick.slot, notice: this.pick.notice }; }
}

/** Name entry for the quick start: on done, newGameEp6 in the picked slot (hooks.js startEpisode6). */
export class NameEntryEp6Scene extends NameEntryScene {
  constructor(engine) { super(engine); this.name = 'nameEntryEp6'; }
  enter(data = {}) { super.enter(data); this.slot = data.slot || 0; }
  done() {
    const e = this.engine;
    const hooks = globalThis.LQ_EP6;
    if (!hooks || typeof hooks.start !== 'function') { e.audio.sfx('buzzer'); return; }
    e.audio.sfx('title_confirm');
    this.busy = true;
    hooks.start(e, this.value, this.slot);
  }
}
