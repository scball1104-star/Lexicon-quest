// FF-style name entry: 8 characters, a 13x5 glyph grid (A-Z, a-z, 0-9, space, erase, done), keyboard
// typing through input.startText(), touch taps (one tap types the glyph: the cells are 15 px on a touch
// layout). Over the quantized `title` backdrop. Default name "Hero", shown as a dim placeholder that the first typed
// letter replaces (W15, PLAYTEST_REVIEW_4 fix 10: one tap on A used to give "HeroA"); confirming with nothing typed
// keeps "Hero". The Episode 2 entry passes the player's own name, which stays filled in. Result: createGame(name) on
// engine.game, then the prologue.

import { List, rowHeightFor, touchUi } from '../ui/list.js';
import { drawWindow, drawPortrait } from '../ui/index.js';
import { btn, hasBtn, deviceOf } from '../ui/glyphs.js';
import { drawHelpBar } from '../ui/help.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { createGame, cleanName } from '../game/state.js';

const MAX = 8;
const ROWS = [
  'ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789 ←✓',
];
const GRID = { cols: 13, cellW: 14, cellH: 13 };
const HELP_RECT = { y: 188, h: 26 };   // 26 tall: the key-cap glyph line keeps 6 px above and below (D6)

export class NameEntryScene {
  constructor(engine) { this.engine = engine; this.name = 'nameEntry'; }

  enter(data = {}) {
    const e = this.engine;
    this.value = data.name != null ? String(data.name) : '';
    this.placeholder = data.name != null ? '' : 'Hero';
    this.t = 0; this.frame = 0; this.busy = false;
    this.art = new KeyArt(e, { backdrop: 'title', cell: 0, drift: 1, t: data.artT || 0 });
    const items = [];
    for (const row of ROWS) for (const ch of row) items.push({ id: ch, label: ch === ' ' ? '_' : ch });
    const touch = touchUi(e);
    const cellH = rowHeightFor(e, GRID.cellH), cellW = Math.max(GRID.cellW, touch ? cellH : 0);
    const gw = GRID.cols * cellW, gh = ROWS.length * cellH + 14;
    // Grid anchored just above the help bar; the name window and title move up on a touch layout.
    this.gridRect = { x: Math.round((e.renderer.W - gw - 24) / 2), y: HELP_RECT.y - 4 - gh, w: gw + 24, h: gh };
    // Touch cells are 20 px tall (33 css px), so the grid needs 114 px: the name window shrinks to 46 px (a 32 px
    // portrait) and sits right under the title so the two never touch.
    this.nameRect = { x: 84, y: touch ? 22 : 36, w: 216, h: touch ? 46 : 60 };
    this.titleY = touch ? 3 : 12;
    this.compact = touch;
    this.grid = new List({ x: this.gridRect.x + 12, y: this.gridRect.y + 7, w: gw, rowH: cellH, rows: ROWS.length, columns: GRID.cols, colW: cellW,
      items, align: 'center', confirmSfx: false, cancelSfx: false, index: 0, tapMode: 'single' });
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
    this.art.draw(r, { dark: this.art.usesBackdrop ? DARK.one : 0.35, vignette: true });
    r.text('What is your name?', r.W / 2, this.titleY, { font: 'large', align: 'center', color: 'cream' });
    // Name window: portrait + 8 cells.
    const { x: nx, y: ny, w: nw, h: nh } = this.nameRect;
    drawWindow(r, nx, ny, nw, nh);   // opaque over the key art (D1)
    const cmp = this.compact;
    drawPortrait(r, 'hero', nx + 6, ny + (cmp ? 4 : 4), cmp ? 32 : 48);
    const cx = nx + (cmp ? 52 : 66), cy = ny + (cmp ? 12 : 20);
    for (let i = 0; i < MAX; i++) {
      const x = cx + i * (cmp ? 19 : 17);
      const ch = this.value[i];
      const hint = !this.value.length && this.placeholder ? this.placeholder[i] : null;
      r.rect(x, cy + 13, 14, 1, i < this.value.length ? '#f9d77a' : '#6b6a8a');
      if (ch) r.text(ch, x + 7, cy, { align: 'center', color: 'white' });
      else if (hint) r.text(hint, x + 7, cy, { align: 'center', color: 'dim' });
      else if (i === this.value.length && Math.floor(this.frame / 20) % 2 === 0) r.rect(x + 2, cy + 11, 10, 1, '#f6f4ee');
    }
    r.text(`${this.value.length}/${MAX}`, nx + nw - 8, ny + (cmp ? 30 : 42), { align: 'right', color: 'dim' });
    // Grid.
    const g = this.gridRect;
    drawWindow(r, g.x, g.y, g.w, g.h);
    this.grid.draw(r, { frame: this.frame });
    // Touch: the A / B tap glyphs and no "Enter" (a phone has no such key); keyboard: key caps and Enter.
    drawHelpBar(r, this.helpText(), { y: HELP_RECT.y, h: HELP_RECT.h });
    void e;
  }

  /** The help line for the current input device (raw inline codes; the keycap and Enter wording is keyboard only). */
  helpText() {
    const e = this.engine;
    const dev = deviceOf(e);
    if (!hasBtn('confirm', e)) return 'Tap a letter   ← erase   ✓ when done';
    return `${btn('confirm')} pick   ${btn('cancel')} erase   ${dev === 'keyboard' ? '✓ or Enter when done' : '✓ when done'}`;
  }

  debugState() { return { help: this.helpText(), device: deviceOf(this.engine), value: this.value, placeholder: this.placeholder, name: cleanName(this.value), index: this.grid.index, busy: this.busy, cell: [this.grid.colW, this.grid.rowH], grid: this.gridRect }; }
}

export default NameEntryScene;
