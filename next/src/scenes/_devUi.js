// Tiny procedural UI used ONLY by the engine's dev scenes (the real windows, dialogue and cursor are
// W2-ui's job in src/ui/). Kept here so the dev scenes look tidy without depending on art that may not
// exist yet.

/** FF-style window: rounded 1 px outer ink line, 2 px light bevel, deep blue vertical gradient. */
export function devWindow(r, x, y, w, h, opts = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const top = opts.top || '#3a4bb0', bottom = opts.bottom || '#141a52';
  const alpha = opts.alpha ?? 1;
  r.withAlpha(alpha, () => {
    r.gradientV(x + 2, y + 2, w - 4, h - 4, top, bottom, opts.bands || 0);
  });
  const ink = '#0b0918';
  // Outer ink ring with clipped corners.
  r.rect(x + 2, y, w - 4, 1, ink); r.rect(x + 2, y + h - 1, w - 4, 1, ink);
  r.rect(x, y + 2, 1, h - 4, ink); r.rect(x + w - 1, y + 2, 1, h - 4, ink);
  r.pixel(x + 1, y + 1, ink); r.pixel(x + w - 2, y + 1, ink); r.pixel(x + 1, y + h - 2, ink); r.pixel(x + w - 2, y + h - 2, ink);
  // Bevel: light top/left, softer bottom/right.
  const hi = '#f4f2ff', mid = '#c9c4e8', lo = '#8f8ab8';
  r.rect(x + 2, y + 1, w - 4, 1, hi); r.rect(x + 1, y + 2, 1, h - 4, hi);
  r.rect(x + 2, y + 2, w - 4, 1, mid); r.rect(x + 2, y + 2, 1, h - 4, mid);
  r.rect(x + 2, y + h - 2, w - 4, 1, lo); r.rect(x + w - 2, y + 2, 1, h - 4, lo);
  r.rect(x + 3, y + h - 3, w - 5, 1, '#0e1240'); r.rect(x + w - 3, y + 3, 1, h - 5, '#0e1240');
}

/** Bobbing pointer (stand-in for the glove cursor). (x, y) is the line box top-left of the item text. */
export function devCursor(r, x, y, frame) {
  const bob = Math.floor(frame / 12) % 2;
  r.text('▶', x - 9 - bob, y, { color: '#ffffff' });
}

/** Simple vertical menu state helper. */
export class DevMenu {
  constructor(items) { this.items = items; this.index = 0; }
  update(input, audio) {
    const d = input.repeatDir();
    const n = this.items.length;
    if (d === 'up' || d === 'down') {
      let i = this.index;
      for (let k = 0; k < n; k++) {
        i = (i + (d === 'up' ? -1 : 1) + n) % n;
        if (!this.items[i].disabled) break;
      }
      if (i !== this.index) { this.index = i; audio && audio.sfx('cursor'); }
    }
    if (input.pressed('confirm')) {
      const it = this.items[this.index];
      if (it.disabled) { audio && audio.sfx('buzzer'); return null; }
      return it;
    }
    return null;
  }
  draw(r, x, y, frame, lh = 12) {
    this.items.forEach((it, i) => {
      const label = typeof it.label === 'function' ? it.label() : it.label;
      r.text(label, x, y + i * lh, { color: it.disabled ? 'dim' : 'white' });
      if (i === this.index) devCursor(r, x, y + i * lh, frame);
    });
  }
}

/** Device-aware button names for prompts. */
export function buttonName(input, action) {
  const d = input.lastDevice;
  const kb = { confirm: 'Z', cancel: 'X', menu: 'C', run: 'Shift', pageL: 'Q', pageR: 'E', start: 'Enter' };
  const pad = { confirm: 'A', cancel: 'B', menu: 'Y', run: 'B', pageL: 'LB', pageR: 'RB', start: 'Start' };
  const touch = { confirm: 'A', cancel: 'B', menu: 'MENU', run: 'RUN', pageL: 'L', pageR: 'R', start: 'A' };
  const map = d === 'gamepad' ? pad : d === 'touch' ? touch : kb;
  return map[action] || action;
}
