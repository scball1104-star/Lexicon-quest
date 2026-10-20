// Generic vertical (or multi-column) menu list with the glove cursor, selection bar, auto-repeat scrolling,
// scroll arrows, page dots, disabled rows, optional icons and right-aligned values, keyboard / gamepad /
// touch (tap selects, tap the selected row confirms, drag scrolls).
//
//   const list = new List({ x, y, w, rows: 8, rowH: 12, columns: 1, columnMajor: false, items: [
//     { id: 'items', label: 'Items', icon: 'bag', right: 'x3', color: 'white', disabled: false, help: '...' },
//   ], onChange: (item, index) => {} });
//   const act = list.update(engine.input, engine.audio);   // 'confirm' | 'cancel' | 'pageL' | 'pageR' | null
//   list.draw(r, { scheme, cursor: true, bar: true, alpha });
//   list.item, list.index, list.setItems(items, keepIndex), list.moveTo(i), list.rowRect(i)
//
// `columns: 2, columnMajor: true, rows: 4` fills the first column top to bottom, then the second (battle
// commands): up / down stay inside a column, left / right cross to the same row of the other column (the last
// item when that cell is empty). No scrolling in that mode: every item must fit rows x columns.
//
// Labels may be functions (evaluated at draw time). `disabled` rows can be landed on (FF style) and buzz on
// confirm unless `skipDisabled` is set. `textX` overrides where the label starts inside the row.
//
// Touch (W4b, CRITIQUE C12): while the touch controls are showing, menus build their lists with
// rowHeightFor(engine, base) so every row is at least TOUCH_ROW_H game px (20 px = 33 css px on the phone
// profile, where one game px is 5/3 css px; short menus use tapRowHeight: 27 px = 45 css px). Rows taller than 12 px center their text, icon and bar.
// `tapMode: 'single'` makes a tap select AND confirm in one go (the name entry grid); the default is tap to
// select, tap the selected row again to confirm.

import { drawSelBar, drawIcon, drawScrollArrow, drawPageDots, schemeColors } from './window.js';
import { drawCursor, cursorHotspotForRow } from './cursor.js';

/**
 * Minimum row height (game px) for a list while touch controls are showing: 20 px = 33 css px on the 844x390
 * phone profile (one game px = 5/3 css px; it was 15 = 25 css px). Lists derive their visible rows from their
 * window, so they scroll instead of overflowing.
 */
export const TOUCH_ROW_H = 20;
/**
 * Row height (game px) of a SHORT standalone menu on touch (the main menu grid, choice boxes): 27 px = 45 css px
 * on the phone profile, above the 44 px finger floor. Dense data lists use TOUCH_ROW_H; a 216 px screen cannot
 * hold 44 css px rows for a 10-row list.
 */
export const TOUCH_TAP_H = 27;

/** True when the on-screen touch controls are visible (the player is on a touch layout). */
export function touchUi(engine) {
  return !!(engine && engine.touch && engine.touch.visible);
}

/** Row height for a menu: `base` with a keyboard or pad, at least TOUCH_ROW_H on a touch layout. */
export function rowHeightFor(engine, base = 12, touchH = TOUCH_ROW_H) {
  return touchUi(engine) ? Math.max(base, touchH) : base;
}

/** Row height for a short standalone menu: `base` with a keyboard or pad, at least TOUCH_TAP_H on a touch layout. */
export function tapRowHeight(engine, base = 12) {
  return touchUi(engine) ? Math.max(base, TOUCH_TAP_H) : base;
}

/** How many rows of `rowH` fit in `available` px (never below 1). */
export function rowsThatFit(available, rowH) {
  return Math.max(1, Math.floor(available / rowH));
}

export class List {
  constructor(o = {}) {
    this.items = o.items || [];
    this.index = Math.max(0, Math.min(this.items.length - 1, o.index || 0));
    this.scroll = 0;                       // first visible row (in rows, not items)
    this.rows = o.rows || Math.max(1, Math.ceil(this.items.length / (o.columns || 1)));
    this.rowH = o.rowH || 12;
    this.tapMode = o.tapMode === 'single' ? 'single' : 'double';
    this.columns = Math.max(1, o.columns || 1);
    this.columnMajor = !!o.columnMajor && this.columns > 1;
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
  /** Vertical offset that centers one 11 px text line (or a 12 px icon) in a row taller than 12 px. */
  get textDy() { return Math.max(0, Math.floor((this.rowH - 12) / 2)); }
  get rowCount() { return this.columnMajor ? Math.min(this.rows, this.items.length) : Math.ceil(this.items.length / this.columns); }
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

  rowOf(i) { return this.columnMajor ? i % this.rows : Math.floor(i / this.columns); }
  colOf(i) { return this.columnMajor ? Math.floor(i / this.rows) : i % this.columns; }
  /** Item index at a grid cell, or -1 when the cell is empty. */
  cellIndex(row, col) {
    const i = this.columnMajor ? col * this.rows + row : row * this.columns + col;
    return i >= 0 && i < this.items.length ? i : -1;
  }

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
    if (this.columnMajor) return this._stepColumns(dir);
    const cols = this.columns;
    const rows = this.rowCount;
    let i = this.index;
    const row = this.rowOf(i), col = this.colOf(i);
    for (let guard = 0; guard < n; guard++) {
      let r2 = this.rowOf(i), c2 = this.colOf(i);
      if (dir === 'up') { r2 -= 1; if (r2 < 0) { if (!this.wrap) return false; r2 = rows - 1; } }
      else if (dir === 'down') { r2 += 1; if (r2 >= rows) { if (!this.wrap) return false; r2 = 0; } }
      else if (dir === 'left') { if (cols === 1) return false; c2 -= 1; if (c2 < 0) { if (!this.wrap) return false; c2 = cols - 1; } }
      else if (dir === 'right') { if (cols === 1) return false; c2 += 1; if (c2 >= cols) { if (!this.wrap) return false; c2 = 0; } }
      let ni = this.cellIndex(r2, c2);
      if (ni < 0) ni = n - 1;   // past the ragged end of the last row: land on the last item
      i = ni;
      if (ni === this.index) return false;
      if (!this.skipDisabled || !this.items[ni].disabled) break;
    }
    if (i === this.index) return false;
    void row; void col;
    return this.moveTo(i);
  }

  /** step() for columnMajor lists: up / down wrap inside the column, left / right keep the row (or take the column's last item). */
  _stepColumns(dir) {
    const n = this.items.length, R = this.rows;
    const colCount = Math.ceil(n / R);
    const lenOf = (c) => Math.min(R, n - c * R);
    let i = this.index;
    for (let guard = 0; guard < n; guard++) {
      const row = this.rowOf(i), col = this.colOf(i);
      let ni;
      if (dir === 'up' || dir === 'down') {
        const len = lenOf(col);
        if (len <= 1) return false;
        const r2 = (row + (dir === 'down' ? 1 : -1) + len) % len;
        ni = col * R + r2;
      } else {
        if (colCount <= 1) return false;
        const c2 = (col + (dir === 'right' ? 1 : -1) + colCount) % colCount;
        ni = this.cellIndex(row, c2);
        if (ni < 0) ni = c2 * R + lenOf(c2) - 1;
      }
      i = ni;
      if (!this.skipDisabled || !this.items[ni].disabled) break;
    }
    if (i === this.index) return false;
    return this.moveTo(i);
  }

  /** Screen rect of item i (whether or not it is visible). */
  rowRect(i) {
    const row = this.rowOf(i), col = this.colOf(i);
    return { x: this.x + col * this.colW, y: this.y + (row - this.scroll) * this.rowH, w: this.columns > 1 ? this.colW : this.w, h: this.rowH };
  }
  isVisible(i) { const row = this.rowOf(i); return row >= this.scroll && row < this.scroll + this.rows; }
  /** Item under a pointer, or -1. `slop` (px) accepts taps just outside the rows (touch: one row of slop). */
  pointerRow(px, py, slop = 0) {
    const h = this.rows * this.rowH;
    if (px < this.x - slop || px >= this.x + this.w + slop || py < this.y - slop || py >= this.y + h + slop) return -1;
    const row = this.scroll + Math.max(0, Math.min(this.rows - 1, Math.floor((py - this.y) / this.rowH)));
    const col = Math.max(0, Math.min(this.columns - 1, Math.floor((px - this.x) / this.colW)));
    return this.cellIndex(row, col);
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
      // Fingers are wide: a touch within one row of the list still lands on the nearest row.
      const slop = p.type === 'touch' ? this.rowH : 0;
      // The scroll arrows are tappable: one tap pages the list (a finger cannot be expected to know about drag).
      if (p.pressed && this.maxScroll > 0) {
        const cx = this.x + Math.floor(this.w / 2), yd = this.y + this.rows * this.rowH + 1, yu = this.y - 7;
        const hit = (ay) => Math.abs(p.x - cx) <= 18 && p.y >= ay - 5 && p.y <= ay + 11;
        const step = Math.max(1, this.rows - 1);
        let moved = 0;
        if (this.scroll < this.maxScroll && hit(yd)) moved = step;
        else if (this.scroll > 0 && hit(yu)) moved = -step;
        if (moved) {
          this.scrollTo(this.scroll + moved);
          if (!this.isVisible(this.index)) this.moveTo(Math.min(this.items.length - 1, this.scroll * this.columns + (moved > 0 ? 0 : this.rows * this.columns - 1)));
          snd('cursor');
          this._swallow = true;
        }
      }
      if (this._swallow) { if (p.released) this._swallow = false; }
      else if (p.pressed) this._drag = { y: p.y, row: this.pointerRow(p.x, p.y, slop), moved: false, scroll0: this.scroll };
      if (this._drag && p.down) {
        const dy = p.y - this._drag.y;
        if (Math.abs(dy) > 8 && this.maxScroll > 0) { this._drag.moved = true; this.scrollTo(this._drag.scroll0 - Math.round(dy / this.rowH)); }
      }
      if (this._drag && p.released) {
        const dr = this._drag; this._drag = null;
        if (!dr.moved && dr.row >= 0) {
          if (dr.row === this.index) { if (!action) action = 'confirm'; }
          else if (this.tapMode === 'single') { this.moveTo(dr.row); if (!action) action = 'confirm'; }
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
    const dy = this.textDy;
    if (showBar && this.index >= first && this.index < last) {
      const rr = this.rowRect(this.index);
      if (this.rowH <= 16) drawSelBar(r, rr.x, rr.y + dy, rr.w, { scheme: o.scheme, alpha });
      else { const c = schemeColors(r, o.scheme); r.withAlpha(0.28 * alpha, () => r.rect(rr.x, rr.y, rr.w, rr.h, c.highlight)); }
    }
    for (let i = first; i < last; i++) {
      const it = this.items[i];
      if (!it) continue;
      const rr = this.rowRect(i);
      const dim = it.disabled || o.dimAll;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (icons && it.icon) drawIcon(r, it.icon, rr.x + this.iconX, rr.y + dy, { alpha: alpha * (dim ? 0.5 : 1) });
      if (label != null) {
        if (this.align === 'center') r.text(String(label), rr.x + Math.floor(rr.w / 2), rr.y + 1 + dy, { align: 'center', color: dim ? 'dim' : (it.color || 'white'), alpha });
        else r.text(String(label), rr.x + textX, rr.y + 1 + dy, { color: dim ? 'dim' : (it.color || 'white'), alpha });
      }
      if (it.right != null) {
        const right = typeof it.right === 'function' ? it.right() : it.right;
        r.text(String(right), rr.x + rr.w - this.rightPad, rr.y + 1 + dy, { align: 'right', color: dim ? 'dim' : (it.rightColor || 'gray'), alpha });
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
