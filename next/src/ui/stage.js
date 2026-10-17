// Stand-in field used when the world scene is not registered (early builds, UI screenshots): key art with
// a hero sprite, so menus and dialogs have something living underneath. Registered as '_uiStage'.
// `menu` opens the field menu, `confirm` shows a sample dialog with a choice, `cancel` does nothing.

import { KeyArt } from './keyart.js';
import { drawBanner } from './window.js';
import { BANNERS } from '../data/text.js';
import { animFrameAt } from '../core/assets.js';

export class UiStageScene {
  constructor(engine) { this.engine = engine; this.name = '_uiStage'; this.t = 0; this.frame = 0; }
  enter(data = {}) {
    const e = this.engine;
    this.art = new KeyArt(e, { cell: data.cell ?? 0, drift: 1 });
    this.bannerT = data.banner === false ? 99 : 0;
    this.map = (e.game && e.game.map) || 'willowmere';
    this.walk = 0;
    if (data.music !== false) e.audio.music(data.music || 'willowmere');
    e.renderer.setBackdrop(null);
  }
  update(dt, below) {
    const e = this.engine;
    this.t += dt; this.frame++; this.bannerT += dt;
    this.art.update(dt);
    if (below) return;   // a dialog is on top: keep animating, never read input
    const { input } = e;
    const dir = input.heldDir();
    if (dir) { this.walk += dt; this.dir = dir; } else this.walk = 0;
    if (input.pressed('menu')) { e.audio.sfx('menu_open'); e.push('menu'); return; }
    if (input.pressed('confirm')) {
      e.pushAwait('dialog', { who: 'mael', text: 'Ah, there you are. Did you sleep through the bell again? The {c:gold}Thirteenth Bell{/c} rang at midnight, though our tower has only ever held twelve.', choices: ['I was up early!', '...Maybe.'] });
    }
  }
  draw(r) {
    this.art.draw(r, { dark: 0.12, vignette: true });
    const e = this.engine;
    const atlas = e.assets.has('party_field') ? e.assets.atlas('party_field') : null;
    const ids = e.game ? e.game.party.map((m) => m.id) : ['hero'];
    ids.forEach((id, i) => {
      const dir = this.dir || 'down';
      const anim = atlas && atlas.anims[`${id}_${this.walk > 0 ? 'walk' : 'idle'}_${dir}`];
      const fr = anim ? animFrameAt(anim, this.t) : null;
      const x = 196 - i * 20, y = 150 + i * 2;
      r.ditherEllipse(x, y + 1, 7, 2, '#14101e', 0.5);
      if (atlas && fr) r.sprite(atlas, fr, x, y);
      else { r.rect(x - 6, y - 22, 12, 22, '#3d6fd6'); }
    });
    if (this.bannerT < 2.6) {
      const b = BANNERS[this.map] || { title: this.map };
      const k = Math.min(1, this.bannerT / 0.35), out = this.bannerT > 2.1 ? Math.min(1, (this.bannerT - 2.1) / 0.4) : 0;
      drawBanner(r, b.title, r.W / 2, Math.round(-24 + 34 * (1 - (1 - k) ** 3) - 34 * out * out));
    }
  }
  debugState() { return { stage: true, map: this.map }; }
}

export default UiStageScene;
