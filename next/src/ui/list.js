// Generic vertical (or multi-column) menu list with the glove cursor, selection bar, auto-repeat scrolling,
// scroll arrows, page dots, disabled rows, optional icons and right-aligned values, keyboard / gamepad /
// touch (tap selects, tap the selected row confirms, drag scrolls).
//
//   const list = new List({ x, y, w, rows: 8, rowH: 12, columns: 1, items: [
//     { id: 'items', label: 'Items', icon: 'bag', right: 'x3', color: 'white', disabled: false, help: '...' },
//   ], onChange: (item, index) => {} });
//   const act = list.update(engine.input, engine.audio);   // 'confirm' | 'cancel' | 'pageL' | 'pageR' | null
//   list.draw(r, { scheme, cursor: true, bar: true, alpha });
//   list.item, list.index, list.setItems(items, keepIndex), list.moveTo(i), list.rowRect(i)
//
// Labels may be functions (evaluated at draw time). `disabled` rows can be landed on (FF style) and buzz on
// confirm unless `skipDisabled` is set. `textX` overrides where the label starts inside the row.

import { drawSelBar, drawIcon, drawScrollArrow, drawPageDots, schemeColors } from './window.js';
import { drawCursor, cursorHotspotForRow } from './cursor.js';

export class List {
  constructor(o = {}) {
    this.items = o.items || [];
    this.index = Math.max(0, Math.min(this.items.length - 1, o.index || 0));
    this.scroll = 0;                       // first visible row (in rows, not items)
    this.rows = o.rows || Math.max(1, Math.ceil(this.items.length / (o.columns || 1)));
    this.rowH = o.rowH || 12;
    this.columns = Math.max(1, o.columns || 1);
    this.x = o.x || 0; this.y = o.y || 0; this.w = o.w || 100;
    this.colW = o.colW || Math.floor(this.w / this.columns);
    this.wrap = o.wrap !== false;
    this.skipDisabled = !!o.skipDisabled;
    this.onChange = o.onChange || null;
    this.icons = o.icons;                  // undefined = auto (any item has an icon)
    this.textX = o.textX;                  // label x offset inside the row (default 19 with icons, 6 without)
    this.iconX = o.iconX ?? 4;
    this.rightPad = o.rightPad ?? 6;
    this.sounds = o.sounds !== false;
    this.confirmSfx = o.confirmSfx !== false;
    this.cancelSfx = o.cancelSfx !== false;
    this.cursor = o.cursor !== false;
    this.bar = o.bar !== false;
    this.cursorDx = o.cursorDx || 0;
    this.cursorDy = o.cursorDy || 0;
    this.align = o.align || 'left';        // 'center' for grids of single glyphs (name entry)
    this.active = true;                    // when false: no cursor/bar drawn, update ignored
    this.touch = o.touch !== false;
    this._drag = null;
    this._changedThisFrame = false;
    this.ensureVisible();
  }

  get length() { return this.items.length; }
  get item() { return this.items[this.index] || null; }
  get rowCount() { return Math.ceil(this.items.length / this.columns); }
  get maxScroll() { return Math.max(0, this.rowCount - this.rows); }
  get page() { return this.rows > 0 ? Math.floor(this.scroll / this.rows) : 0; }
  get pages() { return this.rows > 0 ? Math.max(1, Math.ceil(this.rowCount / this.rows)) : 1; }

  setItems(items, keepIndex = true) {
    this.items = items || [];
    if (!keepIndex) this.index = 0;
    this.index = Math.max(0, Math.min(this.items.length - 1, this.index));
    this.scroll = Math.min(this.scroll, this.maxScroll);
    this.ensureVisible();
    return this;
  }

  rowOf(i) { return Math.floor(i / this.columns); }
  colOf(i) { return i % this.columns; }

  ensureVisible() {
    const row = this.rowOf(this.index);
    if (row < this.scroll) this.scroll = row;
    else if (row >= this.scroll + this.rows) this.scroll = row - this.rows + 1;
    this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll));
  }
  scrollTo(row) { this.scroll = Math.max(0, Math.min(this.maxScroll, Math.round(row))); }

  moveTo(i, o = {}) {
    if (!this.items.length) return false;
    i = Math.max(0, Math.min(this.items.length - 1, i));
    if (i === this.index) return false;
    this.index = i;
    this.ensureVisible();
    this._changedThisFrame = true;
    if (this.onChange) this.onChange(this.item, this.index);
    return true;
  }

  /** Step the cursor in a direction, with wrap and disabled-skipping. Returns true when it moved. */
  step(dir) {
    const n = this.items.length;
    if (n <= 1) return false;
    const cols = this.columns;
    const rows = this.rowCount;
    let i = this.index;
    const row = this.rowOf(i), col = this.colOf(i);
    const tryIndex = (ni) => (ni >= 0 && ni < n ? ni : -1);
    for (let guard = 0; guard < n; guard++) {
      let r2 = this.rowOf(i), c2 = this.colOf(i);
      if (dir === 'up') { r2 -= 1; if (r2 < 0) { if (!this.wrap) return false; r2 = rows - 1; } }
      else if (dir === 'down') { r2 += 1; if (r2 >= rows) { if (!this.wrap) return false; r2 = 0; } }
      else if (dir === 'left') { if (cols === 1) return false; c2 -= 1; if (c2 < 0) { if (!this.wrap) return false; c2 = cols - 1; } }
      else if (dir === 'right') { if (cols === 1) return false; c2 += 1; if (c2 >= cols) { if (!this.wrap) return false; c2 = 0; } }
      let ni = tryIndex(r2 * cols + c2);
      if (ni < 0) ni = n - 1;   // past the ragged end of the last row: land on the last item
      i = ni;
      if (ni === this.index) return false;
      if (!this.skipDisabled || !this.items[ni].disabled) break;
    }
    if (i === this.index) return false;
    void row; void col;
    return this.moveTo(i);
  }

  /** Screen rect of item i (whether or not it is visible). */
  rowRect(i) {
    const row = this.rowOf(i), col = this.colOf(i);
    return { x: this.x + col * this.colW, y: this.y + (row - this.scroll) * this.rowH, w: this.columns > 1 ? this.colW : this.w, h: this.rowH };
  }
  isVisible(i) { const row = this.rowOf(i); return row >= this.scroll && row < this.scroll + this.rows; }
  pointerRow(px, py) {
    if (px < this.x || px >= this.x + this.w || py < this.y || py >= this.y + this.rows * this.rowH) return -1;
    const row = this.scroll + Math.floor((py - this.y) / this.rowH);
    const col = Math.min(this.columns - 1, Math.floor((px - this.x) / this.colW));
    const i = row * this.columns + col;
    return i < this.items.length ? i : -1;
  }

  /** Returns 'confirm' | 'cancel' | 'pageL' | 'pageR' | null. */
  update(input, audio) {
    this._changedThisFrame = false;
    if (!this.active) return null;
    const snd = (id) => { if (this.sounds && audio) audio.sfx(id); };
    const d = input.repeatDir();
    if (d && this.step(d)) snd('cursor');
    let action = null;
    if (input.pressed('confirm')) action = 'confirm';
    else if (input.pressed('cancel')) action = 'cancel';
    else if (input.pressed('pageL')) action = 'pageL';
    else if (input.pressed('pageR')) action = 'pageR';

    // Touch / mouse: tap selects, tap again confirms, drag scrolls.
    if (this.touch && input.pointer) {
      const p = input.pointer;
      if (p.pressed) this._drag = { y: p.y, row: this.pointerRow(p.x, p.y), moved: false, scroll0: this.scroll };
      if (this._drag && p.down) {
        const dy = p.y - this._drag.y;
        if (Math.abs(dy) > 8 && this.maxScroll > 0) { this._drag.moved = true; this.scrollTo(this._drag.scroll0 - Math.round(dy / this.rowH)); }
      }
      if (this._drag && p.released) {
        const dr = this._drag; this._drag = null;
        if (!dr.moved && dr.row >= 0) {
          if (dr.row === this.index) { if (!action) action = 'confirm'; }
          else if (this.moveTo(dr.row)) snd('cursor');
        }
      }
    }
    if (action === 'confirm') {
      const it = this.item;
      if (!it || it.disabled) { snd('buzzer'); return null; }
      if (this.confirmSfx) snd('confirm');
      input.consume('confirm');
    } else if (action === 'cancel') {
      if (this.cancelSfx) snd('cancel');
      input.consume('cancel');
    }
    return action;
  }

  /** Did the cursor move during the last update()? */
  get changed() { return this._changedThisFrame; }

  hasIcons() { return this.icons !== undefined ? !!this.icons : this.items.some((it) => it && it.icon); }

  /** Draw rows (and the cursor when active). opts: scheme, alpha, frame, cursor, bar, dimAll. */
  draw(r, o = {}) {
    const alpha = o.alpha ?? 1;
    const icons = this.hasIcons();
    const textX = this.textX ?? (icons ? this.iconX + 15 : 6);
    const n = this.items.length;
    const first = this.scroll * this.columns;
    const last = Math.min(n, (this.scroll + this.rows) * this.columns);
    const showCursor = this.active && (o.cursor ?? this.cursor) && n > 0;
    const showBar = this.active && (o.bar ?? this.bar);
    if (showBar && this.index >= first && this.index < last) {
      const rr = this.rowRect(this.index);
      if (this.rowH <= 12) drawSelBar(r, rr.x, rr.y, rr.w, { scheme: o.scheme, alpha });
      else { const c = schemeColors(r, o.scheme); r.withAlpha(0.28 * alpha, () => r.rect(rr.x, rr.y, rr.w, rr.h, c.highlight)); }
    }
    for (let i = first; i < last; i++) {
      const it = this.items[i];
      if (!it) continue;
      const rr = this.rowRect(i);
      const dim = it.disabled || o.dimAll;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (icons && it.icon) drawIcon(r, it.icon, rr.x + this.iconX, rr.y, { alpha: alpha * (dim ? 0.5 : 1) });
      if (label != null) {
        if (this.align === 'center') r.text(String(label), rr.x + Math.floor(rr.w / 2), rr.y + 1, { align: 'center', color: dim ? 'dim' : (it.color || 'white'), alpha });
        else r.text(String(label), rr.x + textX, rr.y + 1, { color: dim ? 'dim' : (it.color || 'white'), alpha });
      }
      if (it.right != null) {
        const right = typeof it.right === 'function' ? it.right() : it.right;
        r.text(String(right), rr.x + rr.w - this.rightPad, rr.y + 1, { align: 'right', color: dim ? 'dim' : (it.rightColor || 'gray'), alpha });
      }
      if (typeof it.draw === 'function') it.draw(r, rr, dim, alpha);
    }
    if (this.maxScroll > 0) {
      const cx = this.x + Math.floor(this.w / 2);
      if (this.scroll > 0) drawScrollArrow(r, 'up', cx, this.y - 7, { alpha, frame: o.frame });
      if (this.scroll < this.maxScroll) drawScrollArrow(r, 'down', cx, this.y + this.rows * this.rowH + 1, { alpha, frame: o.frame });
    }
    if (o.pageDots && this.pages > 1) drawPageDots(r, this.pages, this.page, o.pageDots[0], o.pageDots[1], { alpha });
    if (showCursor && this.index >= first && this.index < last) {
      const rr = this.rowRect(this.index);
      const [hx, hy] = cursorHotspotForRow(rr.x, rr.y, this.rowH);
      drawCursor(r, hx + this.cursorDx, hy + this.cursorDy, { alpha, frame: o.frame });
    }
  }
}
