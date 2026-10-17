// Asset gallery (dev): inspect fonts, atlases (frames, origins, animations), images and the palette
// exactly as the engine loads and draws them. pageL/pageR switch tabs, left/right pick, up/down scroll,
// confirm cycles the animation, cancel returns.
// LQ_DEBUG: push('_devGallery', { tab: 'atlases', atlas: 'party_field', frame: 0 })

import { devWindow } from './_devUi.js';
import { animFrameAt } from '../core/assets.js';

const TABS = ['fonts', 'atlases', 'images', 'palette'];

export class DevGalleryScene {
  constructor(engine) { this.engine = engine; this.frame = 0; this.tab = 0; this.pick = 0; this.sel = 0; this.scroll = 0; this.animIndex = 0; }

  enter(data = {}) {
    if (data.tab && TABS.includes(data.tab)) this.tab = TABS.indexOf(data.tab);
    const atl = this.atlasIds();
    if (data.atlas && atl.includes(data.atlas)) this.pick = atl.indexOf(data.atlas);
    if (data.image) { const im = this.imageIds(); if (im.includes(data.image)) this.pick = im.indexOf(data.image); }
    if (data.frame != null) this.sel = data.frame;
  }

  atlasIds() { return this.engine.assets.ids('atlas').sort(); }
  imageIds() { return this.engine.assets.ids('image').sort(); }

  update() {
    const { input, audio } = this.engine;
    this.frame++;
    const tab = TABS[this.tab];
    if (input.pressed('pageL') || input.pressed('pageR')) {
      this.tab = (this.tab + (input.pressed('pageL') ? TABS.length - 1 : 1)) % TABS.length;
      this.pick = 0; this.sel = 0; this.scroll = 0; audio.sfx('cursor');
    }
    if (input.pressed('cancel')) { audio.sfx('cancel'); this.engine.fadeTo(() => this.engine.pop(), { duration: 0.3 }); return; }
    const d = input.repeatDir();
    if (tab === 'atlases') {
      const ids = this.atlasIds();
      const a = ids.length ? this.engine.assets.atlas(ids[this.pick % ids.length]) : null;
      const n = a ? Object.keys(a.frames).length : 0;
      if (d === 'left') this.sel = Math.max(0, this.sel - 1);
      if (d === 'right') this.sel = Math.min(Math.max(0, n - 1), this.sel + 1);
      if (d === 'up') this.scroll = Math.max(0, this.scroll - 16);
      if (d === 'down') this.scroll += 16;
      if (input.pressed('confirm') && a) this.animIndex++;
      if (input.pressed('menu') && ids.length) { this.pick = (this.pick + 1) % ids.length; this.sel = 0; this.scroll = 0; }
    } else if (tab === 'images') {
      const ids = this.imageIds();
      if ((d === 'left' || d === 'right') && ids.length) { this.pick = (this.pick + (d === 'left' ? ids.length - 1 : 1)) % ids.length; this.scroll = 0; }
      if (d === 'up') this.scroll = Math.max(0, this.scroll - 24);
      if (d === 'down') this.scroll += 24;
    }
  }

  draw(r) {
    r.clear('#1b1830');
    // Subtle checkerboard so transparent pixels are visible.
    for (let y = 16; y < r.H; y += 8) for (let x = 0; x < r.W; x += 8) if (((x + y) / 8) % 2) r.rect(x, y, 8, 8, '#211d3a');
    const tab = TABS[this.tab];
    devWindow(r, 0, 0, r.W, 17, { top: '#2a3480', bottom: '#151a48' });
    TABS.forEach((t, i) => r.text(t.toUpperCase(), 10 + i * 70, 3, { color: i === this.tab ? 'gold' : 'gray' }));
    r.text('Q/E tab', r.W - 8, 3, { align: 'right', color: 'dim' });
    if (tab === 'fonts') this.drawFonts(r);
    else if (tab === 'atlases') this.drawAtlases(r);
    else if (tab === 'images') this.drawImages(r);
    else this.drawPalette(r);
  }

  drawFonts(r) {
    const fonts = this.engine.fonts;
    let y = 22;
    for (const id of ['main', 'large', 'num']) {
      const f = fonts.get(id);
      const real = fonts.has(id);
      r.text(`{c:gold}${id}{/c} ${real ? '(assets/ui)' : '(embedded fallback)'}  line ${f.lineHeight}`, 6, y, { color: 'gray' });
      y += 11;
      const sample = id === 'num' ? '0123456789 +-%!' : 'The quick brown fox jumps over the lazy dog.';
      r.text(sample, 6, y, { font: id });
      if (id === 'num' && f.variants) {
        // Pre-colored variants and word art (battle numbers).
        let x = 130;
        for (const v of Object.keys(f.variants)) { r.text('1234', x, y, { font: id, color: v }); x += 34; }
        let wx = 6;
        for (const w of Object.keys(f.words || {})) { wx += f.drawWord(r.ctx, w, wx, y + 14) + 4; }
        y += 14;
      }
      y += f.lineHeight + 2;
      if (id === 'main') {
        r.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789', 6, y, { font: id }); y += 11;
        r.text('!?.,:;\'"()[]{}<>/\\+-=*&%$#@ ♥★♪…×←↑→↓', 6, y, { font: id }); y += 13;
        r.text('{c:common}Common{/c} {c:magic}Magic{/c} {c:rare}Rare{/c} {c:legendary}Legendary{/c} {c:set}Set{/c}  {c:hp}HP{/c} {c:mp}MP{/c} {c:fury}Fury{/c}', 6, y); y += 13;
        const wrapW = 176;
        const lines = r.wrap('Wrap test: Elder Mael asked {c:gold}you{/c} to visit the {c:cyan}Rootbound Archive{/c} north of the valley before nightfall.', wrapW);
        r.strokeRect(5, y - 1, wrapW + 2, lines.length * 11 + 2, '#3a3560');
        lines.forEach((l, i) => r.text(l, 6, y + i * 11));
        const tw = 'Typewriter: the Thirteenth Bell rang at night.';
        const n = Math.floor(this.frame / 3) % (r.font().length(tw) + 20);
        r.text(tw, 200, y, { chars: n });
        r.text('Outline', 200, y + 22, { outline: '#14101e', color: 'gold' });
        y += lines.length * 11 + 6;
      }
    }
  }

  drawAtlases(r) {
    const ids = this.atlasIds();
    if (!ids.length) { r.text('No atlases loaded yet (assets/manifest.json "atlases").', 8, 26, { color: 'gray' }); return; }
    const id = ids[this.pick % ids.length];
    const a = this.engine.assets.atlas(id);
    const names = Object.keys(a.frames);
    const img = a.image;
    r.text(`{c:gold}${id}{/c}  ${names.length} frames  ${img ? img.width + 'x' + img.height : ''}  (C next atlas)`, 6, 20, { color: 'gray' });
    // Flow layout of frames.
    let x = 6, y = 34 - this.scroll, rowH = 0;
    names.forEach((name, i) => {
      const f = a.frames[name];
      if (x + f.w > r.W - 120) { x = 6; y += rowH + 4; rowH = 0; }
      if (y + f.h > 30 && y < r.H) {
        r.sprite(a, f, x, y, { topLeft: true });
        if (i === this.sel) {
          r.strokeRect(x - 1, y - 1, f.w + 2, f.h + 2, '#ffd34d');
          r.pixel(x + f.ox, y + f.oy, '#ff3b6b');
        }
      }
      x += f.w + 4; rowH = Math.max(rowH, f.h);
    });
    // Side panel: selected frame + animation preview.
    const px = r.W - 112;
    devWindow(r, px, 28, 108, r.H - 32, { alpha: 0.95 });
    const sel = a.frames[names[Math.min(this.sel, names.length - 1)]];
    if (sel) {
      r.text(sel.name, px + 6, 32, { color: 'white' });
      r.text(`${sel.x},${sel.y} ${sel.w}x${sel.h}`, px + 6, 43, { color: 'gray' });
      r.text(`origin ${sel.ox},${sel.oy}`, px + 6, 54, { color: 'gray' });
    }
    const animNames = Object.keys(a.anims || {});
    if (animNames.length) {
      const an = animNames[this.animIndex % animNames.length];
      const fr = animFrameAt(a.anims[an], this.frame / 60);
      r.text(`anim ${an}`, px + 6, 68, { color: 'cyan' });
      const f = a.frames[fr];
      if (f) {
        const cx = px + 54, cy = 74 + Math.min(110, f.h) + 4;
        r.ditherEllipse(cx, cy, Math.max(4, f.w / 3), 2, '#14101e', 0.5);
        r.sprite(a, f, cx, cy);
      }
    }
  }

  drawImages(r) {
    const ids = this.imageIds();
    if (!ids.length) { r.text('No images loaded yet (assets/manifest.json "images").', 8, 26, { color: 'gray' }); return; }
    const id = ids[this.pick % ids.length];
    const img = this.engine.assets.img(id);
    r.text(`{c:gold}${id}{/c}  ${img.width}x${img.height}  (${this.pick + 1}/${ids.length}, left/right)`, 6, 20, { color: 'gray' });
    r.pushClip(0, 31, r.W, r.H - 31);
    r.image(img, 4, 32 - this.scroll);
    r.popClip();
  }

  drawPalette(r) {
    const pal = this.engine.assets.json('palette', null);
    if (!pal) { r.text('No palette.json loaded yet.', 8, 26, { color: 'gray' }); return; }
    const ramps = [];
    const visit = (obj, prefix) => {
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v) && v.length && v.every((c) => typeof c === 'string' && c[0] === '#')) ramps.push([prefix + k, v]);
        else if (Array.isArray(v) && v.length && v.every((c) => c && typeof c.hex === 'string')) ramps.push([prefix + k, v.map((c) => c.hex)]);
        else if (v && typeof v === 'object' && !Array.isArray(v)) visit(v, '');
      }
    };
    visit(pal, '');
    let x = 6, y = 22;
    for (const [name, cols] of ramps) {
      if (y > r.H - 10) { y = 22; x += 128; }
      r.text(name, x, y, { color: 'gray' });
      cols.forEach((c, i) => r.rect(x + 60 + i * 9, y + 2, 8, 8, c));
      y += 11;
    }
  }
}
