// The Episode 4 quick start on the title (E4-scene-ui; docs/EPISODE4_PLAN.md 10.3 and 10.5). hooks.js HOOKS.title(scene)
// loads this file on first use and calls offerRow(scene, offer, hooks) once ep4Offer() says to show the row:
//   1. the row "Episode 4: new party" before Config, the help line beside it while it is highlighted,
//   2. on confirm, the slot rule of episodes.js pickRunSlot (the run never replaces a save): slot 0 free starts at once; else
//      the notice "This party will save to Record N." with Back (default) / Start; every slot full: the refusal, Back only,
//   3. name entry (nameEntryEp4, the newest finished record's hero name filled in), then hooks.start: newGameEp4 in its slot.
// The title's own code is untouched (the Fine Print pattern, data/tier/title.js): the row goes into the title's List in place
// (so another pack's wrapper on that List survives), confirm is caught by wrapping whichever List the title holds each frame,
// and the ask is drawn by the title's own save-guard drawing (scene.guard), with a small transparent scene on top for input.

import { tapRowHeight } from '../../ui/list.js';
import { drawWindow } from '../../ui/window.js';
import { ChoiceBox } from '../../ui/choice.js';
import { NameEntryScene } from '../../scenes/nameEntry.js';
import { pickRunSlot } from '../../game/episodes.js';
import { EP4_ROW_LABEL, EP4_ROW_HELP } from './hooks.js';

export const ROW_ID = 'ep4';
const SUBTITLE_BOTTOM = 112;   // the logo and its subtitle end here (title.js)

/** The menu window for these rows, the title's way: one centred column (bottom 196, or 210 for 4+ touch rows), or two near the left edge when one would climb over the subtitle. */
export function layoutRows(items, rowH, measure) {
  let tw = 0;
  for (const it of items) tw = Math.max(tw, measure(it.label));
  const bottomFor = (rows) => (rows > 3 && rowH > 11 ? 210 : 196);
  let columns = 1, rows = items.length;
  if (bottomFor(rows) - (rows * rowH + 13) < SUBTITLE_BOTTOM) { columns = 2; rows = Math.ceil(items.length / 2); }
  const colW = Math.max(94, tw + 22);
  const w = columns === 1 ? Math.max(100, tw + 34) : colW * 2 + 12;
  const h = rows * rowH + 13, bottom = bottomFor(rows);
  return { columns, rows, colW, win: { x: columns === 1 ? Math.round(192 - w / 2) : 20, y: bottom - h, w, h } };
}

/** Add the row to a title scene (idempotent). Returns true when the row is there. */
export function offerRow(scene, offer = {}, hooks = {}) {
  if (!scene || scene.name !== 'title' || !scene.menu || !Array.isArray(scene.menu.items)) return false;
  const e = scene.engine;
  scene.ep4 = offer;
  const m = scene.menu;
  if (!m.items.some((it) => it.id === ROW_ID)) {
    const at = m.items.findIndex((it) => it.id === 'config');
    const index = m.index;
    m.items.splice(at < 0 ? m.items.length : at, 0, { id: ROW_ID, label: EP4_ROW_LABEL });
    const measure = (s) => (e.renderer && e.renderer.measure ? e.renderer.measure(s) : String(s).length * 5);
    const L = layoutRows(m.items, m.rowH, measure);
    scene.win = L.win;
    Object.assign(m, { x: L.win.x + 6, y: L.win.y + 7, w: L.win.w - 12, rows: L.rows, columns: L.columns, columnMajor: L.columns > 1,
      colW: L.columns > 1 ? L.colW : Math.floor((L.win.w - 12)) });
    m.index = Math.min(index, m.items.length - 1);
    if (typeof m.ensureVisible === 'function') m.ensureVisible();
  }
  if (!scene.__ep4) {
    scene.__ep4 = true;
    const update = scene.update.bind(scene), draw = scene.draw.bind(scene);
    scene.update = (dt) => { catchConfirm(scene, hooks); update(dt); };
    scene.draw = (r) => { draw(r); drawNote(scene, r); };
    if (e && !e.hasScene('nameEntryEp4')) e.registerScene('nameEntryEp4', NameEntryEp4Scene);
  }
  return true;
}

/** Wrap the List the title holds now (another pack may have rebuilt it) so confirm on the row opens the ask. */
function catchConfirm(scene, hooks) {
  const m = scene.menu;
  if (!m || m.__ep4) return;
  m.__ep4 = true;
  const update = m.update.bind(m);
  m.update = (input, audio) => {
    const act = update(input, audio);
    if (act === 'confirm' && m.item && m.item.id === ROW_ID) { openAsk(scene, hooks); return null; }
    return act;
  };
}

/** The help line beside the menu while the row is highlighted (the Episode 2 row's style). */
function drawNote(scene, r) {
  const m = scene.menu;
  if (!m || !m.item || m.item.id !== ROW_ID || scene.guard || scene.engine.scene !== scene) return;
  const nx = scene.win.x + scene.win.w + 6;
  const width = Math.max(60, 384 - 4 - nx);
  const lines = r.wrap(EP4_ROW_HELP, width - 12);
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
  const res = await e.pushAwait(new Ep4AskScene(e, scene, pick), {});
  scene.guard = null;
  scene.busy = false;
  if (res && res.start) toNameEntry(scene, res.slot);
  void hooks;
}

function toNameEntry(scene, slot) {
  const e = scene.engine;
  scene.busy = true;
  const name = (scene.ep4 && scene.ep4.name) || undefined;
  e.fadeTo(() => e.replace('nameEntryEp4', { name, slot, artT: scene.art ? scene.art.t : 0 }), { duration: 0.7 });
}

/** The notice or the refusal, read by this scene and drawn by the title's guard drawing. Pops { start, slot } or null. */
export class Ep4AskScene {
  constructor(engine, title, pick) { this.engine = engine; this.title = title; this.pick = pick; this.name = 'ep4Ask'; this.transparent = true; }
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
    if (this.title) this.title.guard = { id: ROW_ID, kind: 'ep4', msg: this.msg, lines, box: this.box, options: this.options.map((id) => ({ id })), free: null };
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

/** Name entry for the quick start: on done, newGameEp4 in the picked slot (hooks.js startEpisode4). */
export class NameEntryEp4Scene extends NameEntryScene {
  constructor(engine) { super(engine); this.name = 'nameEntryEp4'; }
  enter(data = {}) { super.enter(data); this.slot = data.slot || 0; }
  done() {
    const e = this.engine;
    const hooks = globalThis.LQ_EP4;
    if (!hooks || typeof hooks.start !== 'function') { e.audio.sfx('buzzer'); return; }
    e.audio.sfx('title_confirm');
    this.busy = true;
    hooks.start(e, this.value, this.slot);
  }
}
