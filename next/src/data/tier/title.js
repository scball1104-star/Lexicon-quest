// Fine Print on the title (tier pack; docs/TIER.md). scenes/title.js calls LQ_TIER.title(this) at the end of enter() once a
// record holds ep2_complete; offerRow() adds the "Fine Print" row under Continue, the note beside it, and the ask:
//   1. which finished record to carry (every slot holding the unlock flag, newest first; Back is the cancel answer),
//   2. the terms and where the run saves (episodes.js pickRunSlot: the run never replaces a save), Back (default) / Begin,
//   3. Begin: carryRecord() into engine.game, then the prologue hand-off, which opens the cold open on the bell tower stair.
// The title's own code is untouched: the row is added to its List and handled by wrapping that List instance's update(), and
// the ask is drawn by the title's own save-guard code (scene.guard: the dim, the message window, the choice box, the menu
// hidden), so it looks exactly like the title's other questions. FinePrintScene sits on top only to read the input.

import { List, tapRowHeight } from '../../ui/list.js';
import { drawWindow } from '../../ui/window.js';
import { ChoiceBox } from '../../ui/choice.js';
import { BANNERS } from '../text.js';
import { pickRunSlot, SLOTS_FULL_NOTICE } from '../../game/episodes.js';
import { packsToAwait, awaitPacks } from '../../game/packs.js';
import { TIER } from './text.js';
import { carryRecord, tierRecords } from './tier.js';

const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
const SUBTITLE_BOTTOM = 112;   // the logo and its subtitle end here (title.js draws them at y 26, 58 + 3 + 24 px tall)

/** A record's line in the ask: "Arden, Lv 13, The Signless Inn". */
export function recordLine(rec) {
  const place = (BANNERS[rec.map] && BANNERS[rec.map].title) || rec.map || 'somewhere';
  return fill(TIER.record, { name: rec.name, level: rec.level, place });
}

/**
 * The title menu with the row inserted after Continue: { items, win, columns, rows } laid out the title's way (centred, bottom
 * at 196, or 210 for more than three touch rows). When the window would climb over the subtitle it folds into two columns
 * at the left edge.
 */
export function layoutRows(items, rowH, measure) {
  let tw = 0;
  for (const it of items) tw = Math.max(tw, measure(it.label));
  const one = { columns: 1, rows: items.length };
  const bottomFor = (rows) => (rows > 3 && rowH > 11 ? 210 : 196);
  let { columns, rows } = one;
  if (bottomFor(rows) - (rows * rowH + 13) < SUBTITLE_BOTTOM) { columns = 2; rows = Math.ceil(items.length / 2); }
  const colW = Math.max(94, tw + 22);
  const w = columns === 1 ? Math.max(100, tw + 34) : colW * 2 + 12;
  const h = rows * rowH + 13;
  const bottom = bottomFor(rows);
  // two columns sit near the left edge (room for the glove), so the note beside the highlighted row (this one's, Episode 2's) keeps its width
  return { columns, rows, colW, win: { x: columns === 1 ? Math.round(192 - w / 2) : 20, y: bottom - h, w, h } };
}

/** Add the row to a title scene (idempotent). Returns true when the row is there. */
export function offerRow(scene) {
  if (!scene || scene.name !== 'title' || !scene.menu || !Array.isArray(scene.menu.items)) return false;
  const e = scene.engine;
  if (!tierRecords(e.save).length) return false;
  if (scene.menu.items.some((it) => it.id === 'tier')) return true;
  const old = scene.menu;
  const items = old.items.slice();
  const at = Math.max(0, items.findIndex((it) => it.id === 'continue')) + 1;
  items.splice(at, 0, { id: 'tier', label: TIER.row });
  const measure = (s) => (e.renderer && e.renderer.measure ? e.renderer.measure(s) : String(s).length * 5);
  const L = layoutRows(items, old.rowH, measure);
  scene.win = L.win;
  const index = old.index >= at ? old.index + 1 : old.index;
  const menu = new List({ x: L.win.x + 6, y: L.win.y + 7, w: L.win.w - 12, rowH: old.rowH, rows: L.rows, columns: L.columns, columnMajor: L.columns > 1,
    colW: L.columns > 1 ? L.colW : undefined, items, textX: 18, index, confirmSfx: true });
  const update = menu.update.bind(menu);
  menu.update = (input, audio) => {
    const act = update(input, audio);
    if (act === 'confirm' && menu.item && menu.item.id === 'tier') { openAsk(scene); return null; }
    return act;
  };
  scene.menu = menu;
  if (!scene.__tierDraw) {
    const draw = scene.draw.bind(scene);
    scene.__tierDraw = true;
    scene.draw = (r) => { draw(r); drawNote(scene, r); };
  }
  return true;
}

/** The note beside the menu while the row is highlighted (the Episode 2 row's style). */
function drawNote(scene, r) {
  const m = scene.menu;
  if (!m || !m.item || m.item.id !== 'tier' || scene.guard || scene.engine.scene !== scene) return;
  const nx = scene.win.x + scene.win.w + 6;
  const width = Math.max(60, 384 - 4 - nx);
  const lines = r.wrap(TIER.note, width - 12);
  const nh = lines.length * 11 + 10, ny = scene.win.y + scene.win.h - nh;
  drawWindow(r, nx, Math.max(4, ny), width, nh, { kind: 'thin' });
  lines.forEach((l, i) => r.text(l, nx + 6, Math.max(4, ny) + 5 + i * 11, { color: 'cream' }));
}

/** The ask, over the title. On Begin the run starts; Back returns to the title as it was. */
async function openAsk(scene) {
  const e = scene.engine;
  scene.busy = true;
  e.audio.sfx('menu_open');
  const res = await e.pushAwait(new FinePrintScene(e, scene), {});
  scene.guard = null;
  if (!res || !res.begin) { scene.busy = false; return; }
  scene.busy = true;
  const ok = await startRun(e, res.record, res.slot);
  if (!ok) {
    scene.busy = false;
    e.audio.sfx('buzzer');
    if (e.toasts && e.toasts.flash) e.toasts.flash(TIER.failed, { frames: 120 });
  }
}

/** Carry the record in `slot` into a new run saving to `runSlot`, then the cold open. Resolves false when nothing started. */
export async function startRun(e, recordSlot, runSlot) {
  let env = null;
  try { env = e.save.loadEnvelope(recordSlot); } catch (err) { env = null; }
  if (!env || !env.data) return false;
  // the expansion packs the record wants (its x1 items count as consumables only once the x1 pack has registered them)
  const ids = packsToAwait(env.data.flags || {});
  if (ids.length) await awaitPacks(ids);
  const g = carryRecord(env.data, { slot: runSlot, seed: (Date.now() & 0x7fffffff) >>> 0 });
  if (!g) return false;
  e.game = g;
  await e.fadeTo(() => e.replace('prologue'), { duration: 0.8 });
  return true;
}

/** The ask as its own small scene: the record list, then the terms. Pops { begin, record, slot } or null. */
export class FinePrintScene {
  /** `title` is the title scene underneath: its guard drawing shows the ask (without one, this scene draws it itself). */
  constructor(engine, title = null) { this.engine = engine; this.title = title; this.name = 'finePrint'; this.transparent = true; }

  enter() {
    this.records = tierRecords(this.engine.save);
    this.pickStep();
  }

  layout(lines, labels, o = {}) {
    const e = this.engine;
    const msgH = lines.length * 11 + 12;
    const rowH = tapRowHeight(e, 11);
    const boxH = labels.length * rowH + 12;
    const top = Math.max(4, Math.round((216 - (msgH + 4 + boxH)) / 2));
    this.lines = lines;
    this.msg = { x: 32, y: top, w: 320, h: msgH };
    this.box = new ChoiceBox(e, labels, { x: 192, y: top + msgH + 4 + Math.floor(boxH / 2), anchor: 'center', minWidth: 150, index: o.index || 0,
      cancel: o.cancel, tapMode: 'double' });
    if (this.title) this.title.guard = { id: 'tier', kind: 'tier', msg: this.msg, lines, box: this.box, options: (o.ids || []).map((id) => ({ id })), free: null };
  }

  pickStep() {
    this.step = 'pick';
    if (!this.records.length) { this.options = ['back']; this.layout([{ text: TIER.none, color: 'gold' }], [TIER.back], { cancel: 0, ids: this.options }); return; }
    const labels = this.records.map(recordLine).concat([TIER.back]);
    this.options = this.records.map((rec) => rec.slot).concat(['back']);
    this.layout([{ text: TIER.pick, color: 'white' }], labels, { cancel: labels.length - 1, ids: this.options });
  }

  termsStep(rec) {
    this.step = 'terms';
    this.record = rec;
    const pick = pickRunSlot(this.engine.save);
    this.slot = pick.ok ? pick.slot : null;
    const lines = TIER.terms.map((t) => ({ text: fill(t, { name: rec.name }), color: 'white' }));
    if (pick.ok) lines.push({ text: pick.slot === 0 ? TIER.saveAuto : fill(TIER.saveTo, { slot: pick.slot }), color: 'gray' });
    else lines.push({ text: SLOTS_FULL_NOTICE, color: 'gold' });
    this.options = pick.ok ? ['back', 'begin'] : ['back'];
    this.layout(lines, pick.ok ? [TIER.back, TIER.begin] : [TIER.back], { cancel: 0, index: 0, ids: this.options });
  }

  update() {
    const res = this.box.update();
    if (res == null) return;
    const pick = this.options[res < 0 ? this.options.length - 1 : res];
    if (this.step === 'pick') {
      if (pick === 'back') { this.engine.pop(null); return; }
      this.termsStep(this.records.find((r) => r.slot === pick));
      return;
    }
    if (pick === 'begin' && this.slot != null) { this.engine.pop({ begin: true, record: this.record.slot, slot: this.slot }); return; }
    if (this.records.length > 1) this.pickStep(); else this.engine.pop(null);
  }

  draw(r) {
    if (this.title && this.title.guard && this.title.guard.box === this.box) return;   // the title draws it (see the header)
    r.withAlpha(0.55, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    const m = this.msg;
    drawWindow(r, m.x, m.y, m.w, m.h);
    this.lines.forEach((l, i) => r.text(l.text, r.W / 2, m.y + 6 + i * 11, { align: 'center', color: l.color }));
    this.box.draw(r);
  }

  debugState() {
    return { step: this.step, options: this.box.items.map((i) => i.label), ids: this.options.slice(), index: this.box.index,
      records: this.records.map((x) => x.slot), slot: this.slot ?? null };
  }
}
