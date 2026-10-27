// Prologue (H1, docs/RESPONSIBILITY_ARC.md 2, decision B): the hand-off into the cold open, and its captions.
// New Game -> name entry -> here -> the field on the bell tower stair (COLD_OPEN_START); a game that already holds
// intro_done or cold_open_done (an old save, newGameEp2) goes to bed instead. The six cards are gone: PROLOGUE[0]
// is the one card thirteenth_toll shows after the black; enter({ attract: true }) cycles ATTRACT for the title.
// install() adds the overlay to the engine's postdraw hook (the toasts' seam): on the tower it draws the opening
// line and each toll's name as a caption that fades on its own, and carries the game home on cold_open_done.

import { ATTRACT, TOLL_NAMES, TOLL_FLAGS, TOLL_HOLD, COLD_OPEN_LINE } from '../data/story/ep1.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { deviceOf } from '../ui/glyphs.js';
import { START_MAP, START_POS, COLD_OPEN_START, createGame } from '../game/state.js';

const FADE = 30, HOLD = 240, LINE_AT = 36, LINE_TOTAL = 210, CAPTION_Y = 44, LINE_Y = 170;

/** A fresh Episode 1 game that has neither woken up nor climbed opens on the tower. */
export function coldOpenWanted(game) {
  return !!(game && game.flags) && (game.chapter || 1) === 1 && !game.flags.intro_done && !game.flags.cold_open_done;
}
/** The field data a New Game starts with: the tower, or the bed at home. */
export function coldOpenEntry(game) {
  if (coldOpenWanted(game)) return { map: COLD_OPEN_START.map, mark: COLD_OPEN_START.mark, dir: COLD_OPEN_START.dir };
  return { map: START_MAP, x: START_POS.x, y: START_POS.y, dir: START_POS.dir };
}
/** The highest toll whose flag is set (0 when none). */
export function latestToll(flags) {
  if (flags) for (let i = TOLL_FLAGS.length - 1; i >= 0; i--) if (flags[TOLL_FLAGS[i]]) return i + 1;
  return 0;
}
/** Alpha of a caption `age` frames old (in, hold, out), null once gone. */
export function captionAlpha(age, total, inF = 8, outF = 20) {
  if (age < 0 || age >= total) return null;
  return age < inF ? age / inF : age >= total - outF ? Math.max(0, (total - age) / outF) : 1;
}
/** Toll n's caption: the name in spaced capitals, said out loud. */
export function tollCaption(n) {
  const name = TOLL_NAMES[n - 1];
  return name ? name.toUpperCase().split('').join(' ') : '';
}

export class ColdOpenOverlay {
  constructor(engine) { this.engine = engine; this.reset(); }
  reset() { this.game = null; this.lastToll = 0; this.caption = null; this.handedOff = false; }
  field() {
    const s = this.engine.stack || [];
    for (let i = s.length - 1; i >= 0; i--) if (s[i].name === 'field') return s[i];
    return null;
  }
  /** Postdraw hook, every rendered frame; timing runs on logic frames. */
  draw(r) {
    const e = this.engine, f = this.field(), g = e.game;
    if (!f || !g || !f.map || f.map.id !== COLD_OPEN_START.map || f.dead) { if (this.game) this.reset(); return; }
    if (this.game !== g) { this.reset(); this.game = g; }
    const n = latestToll(g.flags);
    if (n > this.lastToll) { this.lastToll = n; this.caption = { text: tollCaption(n), at: e.frame, total: TOLL_HOLD }; }
    if (this.caption) {
      const a = captionAlpha(e.frame - this.caption.at, this.caption.total);
      if (a == null) this.caption = null;
      else if (a > 0 && f.fadeAlpha < 0.5) this.drawCaption(r, this.caption.text, a, CAPTION_Y, 'large');
    }
    if (!this.handedOff) {
      const a = captionAlpha(f.frame - LINE_AT, LINE_TOTAL, 12, 30);
      if (a != null && a > 0 && f.fadeAlpha < 0.5) this.drawCaption(r, COLD_OPEN_LINE, a, LINE_Y, 'main');
    }
    if (g.flags.cold_open_done && !this.handedOff) {
      this.handedOff = true;
      e.after(1, () => {
        if (e.game !== g || !e.stack.includes(f)) return;
        e.fadeTo(() => {
          if (e.hasScene('field')) e.reset('field', { map: START_MAP, x: START_POS.x, y: START_POS.y, dir: START_POS.dir });
          else e.reset('_uiStage', { music: 'willowmere' });
        }, { duration: 0.8, hold: 0.2 });
      });
    }
  }
  drawCaption(r, text, a, y, font) {
    const w = (r.measure ? r.measure(text, font) : 140) + 24, x = Math.round(r.W / 2 - w / 2);
    r.withAlpha(0.55 * a, () => r.rect(x, y - 4, w, font === 'large' ? 22 : 15, '#14101e'));
    r.text(text, Math.round(r.W / 2), y, { font, align: 'center', color: 'cream', alpha: a });
  }
}

/** Boot hook (registry.js): the overlay, once; LQ_ENGINE.coldOpen for the shots. */
export async function install(engine) {
  if (engine.coldOpen) return engine.coldOpen;
  const ov = new ColdOpenOverlay(engine);
  engine.coldOpen = ov;
  engine.on('postdraw', (r) => { try { ov.draw(r); } catch (err) { if (!ov.warned) { ov.warned = true; console.error('[cold open]', err); } } });
  return ov;
}

export class PrologueScene {
  constructor(engine) { this.engine = engine; this.name = 'prologue'; }

  enter(data = {}) {
    const e = this.engine;
    this.attract = !!data.attract;
    this.index = 0; this.phase = 'in'; this.f = 0; this.t = 0; this.done = false;
    e.renderer.setBackdrop(null);
    if (!this.attract) { this.art = null; this.cards = []; e.audio.stopMusic(0.6); this.handOff(); return; }
    this.cards = (data.cards || ATTRACT).slice();
    this.hold = data.frames || HOLD;
    this.art = new KeyArt(e, { backdrop: data.backdrop || 'dialog_keyart', cell: data.cell ?? 0, drift: 1.4, range: 14 });
    e.audio.music('title');
  }

  /** Black, then the field on the tower (queued behind the name entry's own fade). */
  handOff() {
    const e = this.engine;
    if (this.done) return;
    this.done = true;
    if (!e.game) e.game = createGame('Hero');
    const entry = coldOpenEntry(e.game);
    e.fadeTo(() => { if (e.hasScene('field')) e.reset('field', entry); else e.reset('_uiStage', { music: 'willowmere' }); }, { duration: 1.0, hold: 0.3 });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.engine.fadeTo(() => this.engine.pop(), { duration: 0.8 });
  }

  update(dt) {
    this.t += dt;
    if (this.art) this.art.update(dt);
    if (this.done || !this.attract) return;
    if (this.engine.input.anyPressed()) { this.finish(); return; }
    this.f++;
    if (this.phase === 'in') { if (this.f >= FADE) { this.phase = 'hold'; this.f = 0; } }
    else if (this.phase === 'hold') { if (this.f >= this.hold) { this.phase = 'out'; this.f = 0; } }
    else if (this.f >= FADE / 2) {
      if (++this.index >= this.cards.length) { this.finish(); return; }
      this.phase = 'in'; this.f = 0;
    }
  }

  alpha() { return this.phase === 'in' ? Math.min(1, this.f / FADE) : this.phase === 'out' ? Math.max(0, 1 - this.f / (FADE / 2)) : 1; }

  draw(r) {
    if (!this.art) { r.clear('#000000'); return; }
    const card = this.cards[this.index];
    const a = card ? this.alpha() : 0;
    const lines = card ? r.wrap(card, 300, 'large') : [];
    const lh = 18, y0 = Math.round(r.H / 2 - (lines.length * lh) / 2) - 4;
    const band = card ? { y: y0 - 10, h: lines.length * lh + 20, dark: DARK.two, alpha: a } : null;
    if (this.art.usesBackdrop) this.art.draw(r, { dark: DARK.one, band });
    else this.art.draw(r, { dark: 0.5, vignette: true, band });
    if (!card) return;
    const dy = this.phase === 'in' ? Math.round((1 - a) * 4) : 0;
    lines.forEach((l, i) => r.text(l, r.W / 2, y0 + i * lh + dy, { font: 'large', align: 'center', color: 'cream', alpha: a }));
    r.text(deviceOf(this.engine) === 'touch' ? 'Tap to return' : 'Press any button', r.W - 6, r.H - 13, { align: 'right', color: 'dim', alpha: 0.8 });
  }

  debugState() { return { index: this.index, phase: this.phase, attract: this.attract, done: this.done, cards: this.cards.length }; }
}

export default PrologueScene;
