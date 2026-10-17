// FF-style name entry: 8 characters, a 13x5 glyph grid (A-Z, a-z, 0-9, space, erase, done), keyboard
// typing through input.startText(), touch taps. Default name "Hero". Result: createGame(name) on
// engine.game, then the prologue.

import { List } from '../ui/list.js';
import { drawWindow, drawPortrait, btn } from '../ui/index.js';
import { drawHelpBar } from '../ui/help.js';
import { KeyArt } from '../ui/keyart.js';
import { createGame, cleanName } from '../game/state.js';

const MAX = 8;
const ROWS = [
  'ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789 ←✓',
];
const GRID = { cols: 13, cellW: 14, cellH: 13 };

export class NameEntryScene {
  constructor(engine) { this.engine = engine; this.name = 'nameEntry'; }

  enter(data = {}) {
    const e = this.engine;
    this.value = data.name != null ? String(data.name) : 'Hero';
    this.t = 0; this.frame = 0; this.busy = false;
    this.art = new KeyArt(e, { cell: 0, drift: 1, t: data.artT || 0 });
    const items = [];
    for (const row of ROWS) for (const ch of row) items.push({ id: ch, label: ch === ' ' ? '_' : ch });
    const gw = GRID.cols * GRID.cellW;
    this.gridRect = { x: Math.round((e.renderer.W - gw - 24) / 2), y: 104, w: gw + 24, h: ROWS.length * GRID.cellH + 14 };
    this.grid = new List({ x: this.gridRect.x + 12, y: this.gridRect.y + 7, w: gw, rowH: GRID.cellH, rows: ROWS.length, columns: GRID.cols, colW: GRID.cellW,
      items, align: 'center', confirmSfx: false, cancelSfx: false, index: 0 });
    e.input.startText();
    e.audio.music('title');
  }
  exit() { this.engine.input.stopText(); }

  get full() { return this.value.length >= MAX; }

  type(ch) {
    const e = this.engine;
    if (!/^[A-Za-z0-9 '\-]$/.test(ch)) { e.audio.sfx('buzzer'); return; }
    if (this.full) { e.audio.sfx('buzzer'); return; }
    this.value += ch;
    e.audio.sfx('text_blip_mid');
  }
  erase() {
    const e = this.engine;
    if (!this.value.length) { e.audio.sfx('buzzer'); return false; }
    this.value = this.value.slice(0, -1);
    e.audio.sfx('cancel');
    return true;
  }
  done() {
    const e = this.engine;
    const name = cleanName(this.value);
    e.audio.sfx('confirm');
    this.busy = true;
    e.game = createGame(name);
    e.fadeTo(() => e.replace('prologue'), { duration: 0.8 });
  }
  back() {
    const e = this.engine;
    e.audio.sfx('cancel');
    this.busy = true;
    e.fadeTo(() => e.replace('title', { artT: this.art.t }), { duration: 0.5 });
  }

  update(dt) {
    const e = this.engine;
    const { input, audio } = e;
    this.t += dt; this.frame++;
    this.art.update(dt);
    if (this.busy) return;
    // Physical keyboard typing.
    let typedEnter = false;
    for (const k of input.takeText()) {
      if (k === 'Backspace') { if (!this.erase()) { /* nothing to erase */ } }
      else if (k === 'Enter') typedEnter = true;
      else this.type(k);
    }
    if (typedEnter) { input.consume('confirm'); input.consume('start'); this.done(); return; }
    const act = this.grid.update(input, audio);
    if (act === 'confirm') {
      const ch = this.grid.item.id;
      if (ch === '←') this.erase();
      else if (ch === '✓') this.done();
      else this.type(ch);
    } else if (act === 'cancel') {
      if (!this.value.length) this.back(); else this.erase();
    } else if (input.pressed('start')) { input.consume('start'); this.done(); }
    else if (act === 'pageR') { this.grid.moveTo(this.grid.items.length - 1); audio.sfx('cursor'); }
  }

  draw(r) {
    const e = this.engine;
    this.art.draw(r, { dark: 0.35, vignette: true });
    r.text('What is your name?', r.W / 2, 12, { font: 'large', align: 'center', color: 'cream' });
    // Name window: portrait + 8 cells.
    const nx = 84, ny = 36, nw = 216, nh = 60;
    drawWindow(r, nx, ny, nw, nh, { alpha: 0.94 });
    drawPortrait(r, 'hero', nx + 6, ny + 4, 48);
    const cx = nx + 66, cy = ny + 20;
    for (let i = 0; i < MAX; i++) {
      const x = cx + i * 17;
      const ch = this.value[i];
      r.rect(x, cy + 13, 14, 1, i < this.value.length ? '#f9d77a' : '#6b6a8a');
      if (ch) r.text(ch, x + 7, cy, { align: 'center', color: 'white' });
      else if (i === this.value.length && Math.floor(this.frame / 20) % 2 === 0) r.rect(x + 2, cy + 11, 10, 1, '#f6f4ee');
    }
    r.text(`${this.value.length}/${MAX}`, nx + nw - 8, ny + 42, { align: 'right', color: 'dim' });
    // Grid.
    const g = this.gridRect;
    drawWindow(r, g.x, g.y, g.w, g.h, { alpha: 0.94 });
    this.grid.draw(r, { frame: this.frame });
    drawHelpBar(r, `${btn('confirm')} pick   ${btn('cancel')} erase   ✓ or Enter when done`, { y: 192, h: 22 });
    void e;
  }

  debugState() { return { value: this.value, index: this.grid.index, busy: this.busy }; }
}

export default NameEntryScene;
