// Bouncing battle numbers and word art (font_num / font_num_big). Owned by whoever draws them (the battle
// scene keeps one instance); positions are in whatever space the caller draws in (push the camera first).
//
//   const pops = new NumberPopups();
//   pops.spawn(x, y, 37)                              white damage number, bottom-center at (x, y)
//   pops.spawn(x, y, 120, { kind: 'crit' })           big yellow crit
//   pops.spawn(x, y, 25, { kind: 'heal' | 'mp' | 'poison' | 'gray' })
//   pops.word(x, y, 'MISS' | 'WEAK' | 'BREAK' | 'RESIST' | 'IMMUNE' | 'GUARD' | 'DODGE' | 'CRITICAL')
//   pops.update()  (once per logic frame)   pops.draw(r)   pops.active (count)   pops.clear()
//
// Motion: numbers pop up 14 px, fall and bounce twice (SNES style), hold, then vanish.
//
// Stacking (W4b): popups aimed at the same target (a spawn within 14 x 28 px of a live group's anchor) form a
// column. Each new number lands one slot ABOVE the previous one (10 px pitch for the small digits, newest on
// top), so a multi-hit tech reads as a rising ladder of numbers. Word art spawned right after a number on
// the same target (CRITICAL, WEAK, RESIST) attaches to that number: it sits 12 px above it (just clear of
// the big crit digits) and rides the same bounce, so the two never overlap. A word with no number of its
// own (MISS, BREAK, DODGE) takes a slot like a number. At most 4 entries stay visible per target: a fifth
// retires the oldest. At draw time the column is relaxed so an entry mid-bounce can never land on the one
// below it. Groups and entries are plain objects so node tests can inspect them.

const LIFE = 52;          // frames a popup lives
const MAX_PER_TARGET = 4;
const GROUP_DX = 14, GROUP_DY = 28;
const WORD_ABOVE = 12;    // px between a number's bottom and its word's bottom (at least the number's height + 1)
const ATTACH_WINDOW = 12; // a word attaches to a number spawned at most this many frames earlier
const NUM_H = { num: 11, num_big: 15 };
const WORD_H = { BREAK: 16 };
const KIND_FONT = { crit: 'num_big', big: 'num_big' };
const KIND_COLOR = { damage: 'white', white: 'white', crit: 'crit', heal: 'heal', mp: 'mp', poison: 'poison', gray: 'gray' };

export class NumberPopups {
  constructor() { this.list = []; this.groups = []; }
  get active() { return this.list.length; }
  clear() { this.list.length = 0; this.groups.length = 0; }

  /** The live group near (x, y), or a new one anchored there. */
  _group(x, y) {
    this.groups = this.groups.filter((g) => g.members.some((m) => m.t < m.life));
    for (const g of this.groups) if (Math.abs(g.x - x) <= GROUP_DX && Math.abs(g.y - y) <= GROUP_DY) return g;
    const g = { x, y, members: [] };
    this.groups.push(g);
    return g;
  }

  /** Put p on top of its group's column (or at its own base when the column is empty). */
  _stack(g, p) {
    g.members = g.members.filter((m) => m.t < m.life);
    while (g.members.length >= MAX_PER_TARGET) {
      const old = g.members.shift();
      const i = this.list.indexOf(old);
      if (i >= 0) this.list.splice(i, 1);
    }
    let top = null;   // highest static top in the column (screen px, smaller = higher)
    for (const m of g.members) { const t = m.y + m.stack - m.unitH; if (top == null || t < top) top = t; }
    // Static column: the new entry's bottom sits one row inside the previous entry's outline box, so small
    // digits (11 px boxes with a 1 px outline) come out exactly 10 px apart and the ink never touches.
    p.stack = top == null ? 0 : (top + 1) - p.y;
    g.members.push(p);
    this.list.push(p);
    p.group = g;
    return p;
  }

  spawn(x, y, value, o = {}) {
    const kind = o.kind || 'damage';
    const font = o.font || KIND_FONT[kind] || 'num';
    const text = o.text != null ? String(o.text) : (o.sign && value > 0 ? '+' : '') + String(Math.round(value));
    const h = NUM_H[font] || 11;
    const p = { x: Math.round(x), y: Math.round(y), t: -(o.delay || 0), text, kind, font, color: o.color || KIND_COLOR[kind] || 'white',
      word: null, life: o.life || LIFE, h, unitH: h, stack: 0, attached: null, group: null };
    return this._stack(this._group(p.x, p.y), p);
  }

  word(x, y, word, o = {}) {
    const h = WORD_H[word] || 11;
    const p = { x: Math.round(x), y: Math.round(y), t: -(o.delay || 0), text: null, word, kind: 'word', font: 'num',
      life: o.life || LIFE, h, unitH: h, stack: 0, attached: null, group: null };
    const g = this._group(p.x, p.y);
    // Attach to the newest number that just appeared on this target.
    let host = null;
    for (let i = g.members.length - 1; i >= 0; i--) {
      const m = g.members[i];
      if (m.text != null && m.t < m.life && m.t <= ATTACH_WINDOW && !m.word2) { host = m; break; }
    }
    if (host) {
      p.attached = host;
      host.word2 = p;
      // The word's bottom sits WORD_ABOVE px over the number's bottom (always clear of the digits).
      p.above = Math.max(WORD_ABOVE, host.h + 1);
      host.unitH = host.h + (p.above - host.h) + p.h;   // number box + gap + word box
      p.group = g;
      p.life = host.life; p.t = host.t;
      this.list.push(p);
      return p;
    }
    return this._stack(g, p);
  }

  /** Vertical offset (negative = up) for a popup at age t. */
  static offsetAt(t, big = false) {
    if (t < 0) return 0;
    const h = big ? 18 : 14;
    let v = 0;
    if (t < 8) { const k = t / 8; v = Math.round(h * (1 - (1 - k) * (1 - k))); }
    else if (t < 16) { const k = (t - 8) / 8; v = Math.round(h * (1 - k * k)); }
    else if (t < 22) { const k = (t - 16) / 6; v = Math.round(h * 0.35 * Math.sin(k * Math.PI)); }
    else if (t < 26) { const k = (t - 22) / 4; v = Math.round(h * 0.12 * Math.sin(k * Math.PI)); }
    return v ? -v : 0;
  }

  update() {
    for (const p of this.list) p.t++;
    const before = this.list.length;
    this.list = this.list.filter((p) => p.t < p.life);
    if (this.list.length !== before) {
      for (const g of this.groups) g.members = g.members.filter((m) => m.t < m.life);
      this.groups = this.groups.filter((g) => g.members.length);
    }
  }

  /**
   * Resolve every entry's bottom y for this frame: the static column plus the bounce, then relaxed from the
   * oldest (lowest) entry upward so nothing overlaps while bouncing. Returns a Map(entry -> bottom).
   */
  layout() {
    const out = new Map();
    const place = (p, bottom) => {
      out.set(p, bottom);
      if (p.word2 && p.word2.t < p.word2.life) out.set(p.word2, bottom - p.word2.above);
    };
    for (const g of this.groups) {
      let prevTop = null;
      for (const m of g.members) {
        if (m.t >= m.life) continue;
        const dy = NumberPopups.offsetAt(m.t, m.font === 'num_big');
        let bottom = m.y + m.stack + dy;
        if (prevTop != null && bottom > prevTop + 1) bottom = prevTop + 1;
        place(m, bottom);
        prevTop = bottom - m.unitH;
      }
    }
    // Entries that belong to no group (never happens in practice; defensive).
    for (const p of this.list) if (!out.has(p)) place(p, p.y + p.stack + NumberPopups.offsetAt(p.t, p.font === 'num_big'));
    return out;
  }

  draw(r) {
    const pos = this.layout();
    for (const p of this.list) {
      if (p.t < 0) continue;
      const bottom = pos.get(p);
      if (bottom == null) continue;
      const fade = p.t > p.life - 8 ? (p.life - p.t) / 8 : 1;
      const top = Math.round(bottom - p.h);
      if (p.word) {
        const f = r.font('num');
        const drawn = f && f.drawWord ? f.drawWord(r.ctx, p.word, p.x, top, { align: 'center', alpha: fade }) : 0;
        if (!drawn) r.text(p.word, p.x, top, { align: 'center', color: 'gold', outline: '#14101e', alpha: fade });
        continue;
      }
      r.text(p.text, p.x, top, { font: p.font, color: p.color, align: 'center', alpha: fade, shadow: false });
    }
  }
}
