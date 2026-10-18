// Game over: GAMEOVER text over a slow dark vignette, gameover_sting then the gameover track,
// options Retry (reload lastSafe with full HP) / Load / Title. Pushed by the battle scene on defeat.

import { List } from '../ui/list.js';
import { drawWindow } from '../ui/window.js';
import { GAMEOVER } from '../data/text.js';
import { heal } from '../game/state.js';

export class GameOverScene {
  constructor(engine) { this.engine = engine; this.name = 'gameover'; }
  enter() {
    const e = this.engine;
    this.t = 0; this.frame = 0; this.busy = false; this.menuAt = 2.6;
    this.menu = new List({ x: 150, y: 150, w: 84, rowH: 11, rows: 3, textX: 16, items: [
      { id: 'retry', label: 'Retry', disabled: !e.game },
      { id: 'load', label: 'Load' },
      { id: 'title', label: 'Title' },
    ] });
    e.audio.stopMusic(0.5);
    e.audio.ambience(null);
    e.audio.jingle('gameover_sting', { duckMusic: false }).then(() => { if (e.scene === this) e.audio.music('gameover'); });
    e.renderer.setBackdrop(null);
  }
  update(dt) {
    const e = this.engine;
    const { input, audio } = e;
    this.t += dt; this.frame++;
    if (this.busy || this.t < this.menuAt) { if (this.t < this.menuAt && input.anyPressed()) this.t = this.menuAt; return; }
    const act = this.menu.update(input, audio);
    if (act !== 'confirm') return;
    const id = this.menu.item.id;
    this.busy = true;
    if (id === 'retry') {
      const g = e.game;
      heal(g, { full: true });
      e.fadeTo(() => {
        if (e.hasScene('field')) e.reset('field', { map: g.lastSafe.map, x: g.lastSafe.pos.x, y: g.lastSafe.pos.y, dir: g.lastSafe.pos.dir });
        else e.reset('_uiStage', { music: 'willowmere' });
      }, { duration: 0.8 });
    } else if (id === 'load') {
      e.pushAwait('loadGame', { mode: 'load' }).then(() => { this.busy = false; });
    } else {
      e.fadeTo(() => e.reset('title'), { duration: 0.8 });
    }
  }
  draw(r) {
    r.clear('#07060c');
    const k = Math.min(1, this.t / 1.5);
    // Slow red-violet glow that settles behind the words: the whole frame, brightest at the title line,
    // banded top and bottom (CRITIQUE_1 C14: no hard black band).
    const peak = 70;
    r.withAlpha(0.35 * k, () => {
      r.gradientV(0, 0, r.W, peak, '#07060c', '#3a1030', 7);
      r.gradientV(0, peak, r.W, r.H - peak, '#3a1030', '#07060c', 14);
    });
    r.text(GAMEOVER.title, r.W / 2, 62, { font: 'large', align: 'center', color: 'cream', alpha: Math.min(1, this.t / 1.2) });
    r.text(GAMEOVER.line, r.W / 2, 90, { align: 'center', color: 'gray', alpha: Math.max(0, Math.min(1, (this.t - 1.0) / 1.0)) });
    if (this.t >= this.menuAt) {
      drawWindow(r, 144, 144, 96, 46, { alpha: 0.94 });
      this.menu.draw(r, { frame: this.frame, bar: false, cursor: !this.busy });
      r.text(GAMEOVER.continue, r.W / 2, 200, { align: 'center', color: 'dim' });
    }
  }
  debugState() { return { t: Math.round(this.t * 10) / 10, index: this.menu.index, busy: this.busy }; }
}

export default GameOverScene;
