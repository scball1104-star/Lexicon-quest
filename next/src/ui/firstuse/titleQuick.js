// The title's quick start row (#88, CRITIQUE_9 item 7): two or more "Episode N: new party" rows (the title's and each pack's, in
// any arrival order) fold into one New party… row that opens them as a list in the menu's place. Loaded on first use
// (scenes/title.js foldQuick; tools/pwa/build_pwa.py LAZY_PREFIXES), it adds these methods to TitleScene. Offline before
// it was ever fetched, the title keeps the rows unfolded.

import { List } from '../list.js';

export const QUICK_ROW_ID = 'party';
export const QUICK_ROW_LABEL = 'New party…';
export const QUICK_ROW_HELP = 'Start a later episode with a ready-made party.';
const LOGO_FLOOR = 91;   // the logo lifts to y 4; its subtitle ends at 89

export const isQuickRow = (it) => !!it && /^ep\d$/.test(it.id);
const byEp = (a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2));

/** The menu window: one centred column, bottom 196 (210 for 4+ touch rows), two columns only when one would climb over the logo. Pure. */
export function titleMenuLayout(n, rowH, tw) {
  const bottomFor = (rows) => (rows > 3 && rowH > 11 ? 210 : 196);
  let columns = 1, rows = n;
  if (bottomFor(rows) - (rows * rowH + 13) < LOGO_FLOOR) { columns = 2; rows = Math.ceil(n / 2); }
  const colW = Math.max(94, tw + 22);
  const w = columns === 1 ? Math.max(100, tw + 34) : colW * 2 + 12;
  const h = rows * rowH + 13;
  return { columns, rows, colW, win: { x: columns === 1 ? Math.round(192 - w / 2) : 20, y: bottomFor(rows) - h, w, h } };
}

/** Fold the quick rows of `items` into `quick` (by episode) and one `row` before Config, in place, once there are two. Pure. */
export function foldQuickRows(items, quick, row) {
  const loose = items.filter(isQuickRow);
  if (!loose.length || (!items.includes(row) && loose.length + quick.length < 2)) return false;
  for (const it of loose) if (!quick.some((q) => q.id === it.id)) quick.push(it);
  quick.sort(byEp);
  const keep = items.filter((it) => !isQuickRow(it) && it !== row);
  const cfg = keep.findIndex((it) => it.id === 'config');
  keep.splice(cfg < 0 ? keep.length : cfg, 0, row);
  items.splice(0, items.length, ...keep);
  return true;
}

const METHODS = {
  sigOf(m) { return `${m.items.map((it) => it.id)}|${m.rowH}|${m.columns},${m.x},${m.y}|${!!this.mainMenu}`; },

  /** Every update and draw: fold the rows packs added, keep the open list in order, lay out the shown list when it changed. */
  tidyMenu() {
    this.quickRow = this.quickRow || { id: QUICK_ROW_ID, label: QUICK_ROW_LABEL };
    if (this.mainMenu && this.menu !== this.quickList) this.adoptMenu();
    const main = this.mainMenu || this.menu, cur = main.item;
    if (foldQuickRows(main.items, this.quick, this.quickRow)) main.index = Math.max(0, main.items.indexOf(isQuickRow(cur) ? this.quickRow : cur));
    if (this.mainMenu) {
      const m = this.menu, at = m.item;
      for (const it of m.items) if (isQuickRow(it) && !this.quick.includes(it)) this.quick.push(it);
      this.quick.sort(byEp);
      if (m.items.length !== this.quick.length || m.items.some((it, i) => it !== this.quick[i])) {
        m.items.splice(0, m.items.length, ...this.quick);
        m.index = Math.max(0, m.items.indexOf(at));
      }
    }
    if (this.sigOf(this.menu) !== this.menuSig) { this.layMenu(this.menu); this.menuSig = this.sigOf(this.menu); }
  },

  /** A pack rebuilt the List while the list was open (the tier pack does): it becomes the title menu, its new rows after Continue. */
  adoptMenu() {
    const fresh = this.menu, list = this.quickList, items = this.mainMenu.items.slice();
    for (const it of fresh.items) {
      if (isQuickRow(it)) { if (!list.items.includes(it)) list.items.push(it); } else if (!items.includes(it)) items.splice(items.findIndex((c) => c.id === 'continue') + 1, 0, it);
    }
    fresh.items = items;
    fresh.index = Math.max(0, items.indexOf(this.quickRow));
    this.mainMenu = fresh;
    this.menu = list;
  },

  layMenu(m) {
    const r = this.engine.renderer;
    let tw = 0;
    for (const it of m.items) tw = Math.max(tw, r && r.measure ? r.measure(it.label) : String(it.label).length * 5);
    const L = titleMenuLayout(m.items.length, m.rowH, tw);
    this.win = L.win;
    Object.assign(m, { x: L.win.x + 6, y: L.win.y + 7, w: L.win.w - 12, rows: L.rows, columns: L.columns, columnMajor: L.columns > 1,
      colW: L.columns > 1 ? L.colW : L.win.w - 12, scroll: 0 });
    m.ensureVisible();
  },

  /** A tap on the game well clear of the open list (one row of slop, as List allows). */
  outsideQuick(p) {
    const w = this.win, s = this.menu.rowH;
    return p.x >= 0 && p.x < 384 && p.y >= 0 && p.y < 216 && (p.x < w.x - s || p.x >= w.x + w.w + s || p.y < w.y - s || p.y >= w.y + w.h + s);
  },

  openQuick(id) {
    if (this.mainMenu || !this.quick.length) return false;
    const main = this.menu, items = this.quick.slice();
    this.mainMenu = main;
    this.menu = this.quickList = new List({ x: main.x, y: main.y, w: main.w, rowH: main.rowH, rows: items.length, items, textX: 18,
      index: Math.max(0, items.findIndex((it) => it.id === id)), confirmSfx: true });
    this.quickTapOut = false;
    this.tidyMenu();
    return true;
  },

  closeQuick() {
    if (!this.mainMenu) return;
    this.menu = this.mainMenu;
    this.mainMenu = this.quickList = null;
    this.menu.index = Math.max(0, this.menu.items.indexOf(this.quickRow));
    this.tidyMenu();
  },

  /** The title's menu input: the row opens the list; cancel, B or a tap outside closes it. Returns the List's action, or null. */
  quickStep(input, audio) {
    this.tidyMenu();
    const p = input.pointer, open = !!this.mainMenu, out = !!(open && p && this.outsideQuick(p));
    if (open && p && p.pressed) this.quickTapOut = out;
    const act = this.menu.update(input, audio);
    if (open && act !== 'confirm' && (act === 'cancel' || (p && p.released && this.quickTapOut && out))) {
      if (act !== 'cancel') audio.sfx('cancel');
      this.closeQuick();
      return null;
    }
    if (act === 'confirm' && this.menu.item.id === QUICK_ROW_ID) { this.openQuick(); return null; }
    return act;
  },

  quickNote(id) { return id === QUICK_ROW_ID ? QUICK_ROW_HELP + (this.hasSaves ? ' Your own game stays under Continue.' : '') : null; },

  /** QA: the cursor on quick start `id`, the list opened when it is folded. */
  showQuick(id) {
    this.tidyMenu();
    const inline = (this.mainMenu || this.menu).items.findIndex((it) => it.id === id);
    if (inline >= 0) { this.closeQuick(); this.menu.moveTo(inline); return true; }
    if (!this.quick.some((it) => it.id === id)) return false;
    this.openQuick(id);
    this.menu.moveTo(this.menu.items.findIndex((it) => it.id === id));
    return this.menu.item.id === id;
  },
};

export function install(Scene) { Object.assign(Scene.prototype, METHODS); }
