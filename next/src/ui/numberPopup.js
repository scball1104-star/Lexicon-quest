// Bouncing battle numbers and word art (font_num / font_num_big). Owned by whoever draws them (the battle
// scene keeps one instance); positions are in whatever space the caller draws in (push the camera first).
//
//   const pops = new NumberPopups();
//   pops.spawn(x, y, 37)                              white damage number, bottom-center at (x, y)
//   pops.spawn(x, y, 120, { kind: 'crit' })           big yellow crit (adds a small screen shake if r given)
//   pops.spawn(x, y, 25, { kind: 'heal' | 'mp' | 'poison' | 'gray' })
//   pops.word(x, y, 'MISS' | 'WEAK' | 'BREAK' | 'RESIST' | 'IMMUNE' | 'GUARD' | 'DODGE' | 'CRITICAL')
//   pops.update()  (once per logic frame)   pops.draw(r)   pops.active (count)   pops.clear()
//
// Motion: numbers pop up 14 px, fall and bounce twice (SNES style), hold, then vanish. A stack of hits on
// the same spot is staggered sideways so multi-hit skills stay readable.

const LIFE = 52;        // frames a popup lives
const KIND_FONT = { crit: 'num_big', big: 'num_big' };
const KIND_COLOR = { damage: 'white', white: 'white', crit: 'crit', heal: 'heal', mp: 'mp', poison: 'poison', gray: 'gray' };

export class NumberPopups {
  constructor() { this.list = []; this._stagger = new Map(); }
  get active() { return this.list.length; }
  clear() { this.list.length = 0; this._stagger.clear(); }

  spawn(x, y, value, o = {}) {
    const kind = o.kind || 'damage';
    const key = `${Math.round(x / 8)},${Math.round(y / 8)}`;
    const n = (this._stagger.get(key) || 0);
    this._stagger.set(key, n + 1);
    const dx = n ? ((n % 2 ? 1 : -1) * Math.ceil(n / 2) * 7) : 0;
    const text = o.text != null ? String(o.text) : (o.sign && value > 0 ? '+' : '') + String(Math.round(value));
    this.list.push({ x: Math.round(x) + dx, y: Math.round(y), t: -(o.delay || 0), text, kind, font: o.font || KIND_FONT[kind] || 'num',
      color: o.color || KIND_COLOR[kind] || 'white', word: null, life: o.life || LIFE, key });
    return this.list[this.list.length - 1];
  }
  word(x, y, word, o = {}) {
    this.list.push({ x: Math.round(x), y: Math.round(y), t: -(o.delay || 0), text: null, word, kind: 'word', font: 'num', life: o.life || LIFE, key: null });
    return this.list[this.list.length - 1];
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
    if (this.list.length !== before && this.list.length === 0) this._stagger.clear();
  }

  draw(r) {
    for (const p of this.list) {
      if (p.t < 0) continue;
      const fade = p.t > p.life - 8 ? (p.life - p.t) / 8 : 1;
      const big = p.font === 'num_big';
      const dy = NumberPopups.offsetAt(p.t, big);
      if (p.word) {
        const f = r.font('num');
        const drawn = f && f.drawWord ? f.drawWord(r.ctx, p.word, p.x, p.y - 12 + dy, { align: 'center', alpha: fade }) : 0;
        if (!drawn) r.text(p.word, p.x, p.y - 12 + dy, { align: 'center', color: 'gold', outline: '#14101e', alpha: fade });
        continue;
      }
      const font = r.font(p.font);
      const lh = font ? font.lineHeight : 11;
      // Pop: the first frames draw 1 px larger by offsetting a shadow copy (cheap "scale" at pixel res).
      r.text(p.text, p.x, p.y - lh + dy, { font: p.font, color: p.color, align: 'center', alpha: fade, shadow: false });
    }
  }
}
