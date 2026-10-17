// Shared pieces for the menu sub-screens: the member picker, member headers, tabs and small formatters.

import { drawWindow, drawPortrait, drawLabel, drawIcon, drawGauge, drawDivider, drawPageArrow, drawPageDots } from '../window.js';
import { List } from '../list.js';
import { memberInfo, memberName, WEAPON_ICON } from '../party.js';
import { masteryLevel, MASTERY_XP, MAX_MASTERY } from '../../data/party.js';
import { cap } from '../text.js';

/** Portrait 32 + name + Lv (+ optional second line). Draws inside a window at (x, y, w, h). */
export function drawMemberHeader(r, m, x, y, w, h, o = {}) {
  drawWindow(r, x, y, w, h, { scheme: o.scheme });
  drawPortrait(r, m.id, x + 4, y + 4, 32, { scheme: o.scheme });
  r.text(memberName(m), x + 44, y + 5, { color: 'white' });
  drawLabel(r, 'lv', x + 44 + r.measure(memberName(m)) + 6, y + 8);
  r.text(String(m.level || 1), x + 44 + r.measure(memberName(m)) + 17, y + 5);
  if (o.line2) r.text(o.line2, x + 44, y + 19, { color: 'gray' });
  if (o.mastery) {
    const type = m.weapon;
    const pts = (m.mastery || {})[type] || 0;
    const lv = masteryLevel(pts);
    const lo = MASTERY_XP[lv - 1] || 0, hi = MASTERY_XP[lv] ?? lo;
    const frac = lv >= MAX_MASTERY ? 1 : (pts - lo) / Math.max(1, hi - lo);
    if (WEAPON_ICON[type]) drawIcon(r, WEAPON_ICON[type], x + 44, y + 18);
    r.text(cap(type), x + 58, y + 19, { color: 'gray' });
    const tx = x + 58 + r.measure(cap(type)) + 6;
    drawLabel(r, 'lv', tx, y + 22);
    r.text(String(lv), tx + 11, y + 19, { color: 'gray' });
    drawGauge(r, tx + 20, y + 23, Math.max(20, x + w - 8 - (tx + 20)), frac, 'exp', { thin: true });
  }
}

/** Compact member picker window: rows of name / HP / MP. Resolves through update(): index | -1 | null. */
export class MemberPicker {
  constructor(engine, members, o = {}) {
    this.engine = engine;
    this.members = members;
    const r = engine.renderer;
    const w = o.w || 200, rowH = 22;
    const h = members.length * rowH + 14;
    this.rect = { x: o.x ?? Math.round((r.W - w) / 2), y: o.y ?? Math.round((r.H - h) / 2) - 10, w, h };
    this.title = o.title || null;
    if (this.title) { this.rect.y -= 6; this.rect.h += 12; }
    this.list = new List({ x: this.rect.x + 6, y: this.rect.y + 7 + (this.title ? 12 : 0), w: w - 12, rowH, rows: members.length,
      items: members.map((m) => ({ id: m.id, label: null, disabled: o.allowKo ? false : false })), bar: true, textX: 6, cursorDy: 5, confirmSfx: o.confirmSfx !== false });
    this.allowKo = !!o.allowKo;
    this.onlyKo = !!o.onlyKo;
    this.flash = null;   // { index, text, color, t }
  }
  get member() { return this.members[this.list.index]; }
  update() {
    const { input, audio } = this.engine;
    if (this.flash && --this.flash.t <= 0) this.flash = null;
    const act = this.list.update(input, audio);
    if (act === 'confirm') return this.list.index;
    if (act === 'cancel') return -1;
    return null;
  }
  showNumber(index, text, color = 'heal') { this.flash = { index, text, color, t: 40 }; }
  draw(r, o = {}) {
    const rc = this.rect;
    drawWindow(r, rc.x, rc.y, rc.w, rc.h, { scheme: o.scheme });
    if (this.title) r.text(this.title, rc.x + 8, rc.y + 5, { color: 'gold' });
    this.list.draw(r, { scheme: o.scheme, frame: r.frame });
    this.members.forEach((m, i) => {
      const rr = this.list.rowRect(i);
      const info = memberInfo(m);
      const dim = this.onlyKo ? !info.ko : (!this.allowKo && info.ko);
      const a = dim ? 0.5 : 1;
      r.text(memberName(m), rr.x + 6, rr.y + 2, { color: info.ko ? 'red' : 'white', alpha: a });
      drawLabel(r, 'hp', rr.x + 62, rr.y + 5, { alpha: a });
      r.text(`${info.hp}/${info.maxHp}`, rr.x + 128, rr.y + 2, { align: 'right', color: info.hpFrac <= 0.25 ? 'red' : 'white', alpha: a });
      drawGauge(r, rr.x + 62, rr.y + 13, 66, info.hpFrac, 'hp', { thin: true });
      drawLabel(r, 'mp', rr.x + 136, rr.y + 5, { alpha: a });
      r.text(`${info.mp}/${info.maxMp}`, rr.x + rr.w - 6, rr.y + 2, { align: 'right', alpha: a });
      drawGauge(r, rr.x + 136, rr.y + 13, rr.w - 142, info.mpFrac, 'mp', { thin: true });
      if (this.flash && this.flash.index === i) {
        const k = this.flash.t;
        const dy = k > 30 ? (40 - k) : 10;
        r.text(this.flash.text, rr.x + 36, rr.y + 10 - Math.round(dy / 2), { font: 'num', color: this.flash.color, align: 'center', alpha: k < 10 ? k / 10 : 1 });
      }
    });
  }
}

/** Tab strip: names[], active index, with page arrows at both ends. */
export function drawTabs(r, names, active, x, y, w, o = {}) {
  drawPageArrow(r, 'left', x + 6, y + 1, { alpha: 0.9 });
  drawPageArrow(r, 'right', x + w - 12, y + 1, { alpha: 0.9 });
  const inner = w - 36;
  const step = Math.floor(inner / names.length);
  names.forEach((n, i) => {
    const cx = x + 18 + step * i + Math.floor(step / 2);
    r.text(n, cx, y, { align: 'center', color: i === active ? 'gold' : 'dim' });
    if (i === active) r.rect(cx - Math.floor(r.measure(n) / 2), y + 10, r.measure(n), 1, '#f9d77a');
  });
  if (o.dots) drawPageDots(r, names.length, active, x + Math.floor(w / 2) - names.length * 4, y + 13);
}

export function hpColor(frac) { return frac <= 0.25 ? 'red' : frac <= 0.5 ? 'orange' : 'white'; }
export { drawDivider };
