// Title screen: logo with sparkles over the quantized `title` backdrop (assets/backdrops, 2 px drift; the
// painted crop is the fallback), New Game / Continue / Config, version string, attract mode after 20 s idle
// (prologue cards, then back). Also the UI module's install(): toasts, the 'choice' and '_uiStage' scenes,
// the stats provider, and LQ_DEBUG.newGame / give / uiStage.

import { List, rowHeightFor } from '../ui/list.js';
import { drawWindow, installToasts, ChoiceScene, uiAudit } from '../ui/index.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { bindGlyphs } from '../ui/glyphs.js';
import { UiStageScene } from '../ui/stage.js';
import { animFrameAt } from '../core/assets.js';
import { createGame, setFlag, give, addMember, setStatsProvider, START_MAP, START_POS, addGear } from '../game/state.js';
import { memberStats } from '../battle/rules.js';
import { ITEMS, CONSUMABLES, KEY_ITEMS } from '../data/items.js';

export const VERSION = 'v0.2 NEXT';
const ATTRACT_AFTER = 20;   // seconds idle

export class TitleScene {
  constructor(engine) { this.engine = engine; this.name = 'title'; }

  enter(data = {}) {
    const e = this.engine;
    this.t = 0; this.idle = 0; this.frame = 0;
    this.art = new KeyArt(e, { backdrop: 'title', cell: 0, drift: 1, range: 10, t: data.artT || 0 });
    this.sparkles = [];
    this.nextSparkle = 0.6;
    this.points = null;
    this.hasSaves = this.anySave();
    const items = [
      { id: 'new', label: 'New Game' },
      { id: 'continue', label: 'Continue', disabled: !this.hasSaves },
      { id: 'config', label: 'Config' },
    ];
    // Menu window: anchored at the bottom (y 196) and grown to fit touch-sized rows.
    const rowH = rowHeightFor(e, 11);
    const h = items.length * rowH + 13;
    this.win = { x: 142, y: 196 - h, w: 100, h };
    this.menu = new List({ x: this.win.x + 6, y: this.win.y + 7, w: this.win.w - 12, rowH, rows: items.length, items, textX: 18, index: this.hasSaves && data.index == null ? 1 : (data.index || 0), confirmSfx: true });
    this.busy = false;
    e.audio.music('title');
    e.audio.ambience(null);
    e.renderer.setBackdrop(null);
  }

  anySave() {
    try { return this.engine.save.list(true).some((s) => s.exists); } catch { return false; }
  }

  onResume() {
    this.idle = 0; this.busy = false;
    this.hasSaves = this.anySave();
    this.menu.items[1].disabled = !this.hasSaves;
  }

  samplePoints(r) {
    const e = this.engine;
    const logo = e.assets.has('logo') ? e.assets.atlas('logo') : null;
    const f = logo && logo.frames.logo;
    if (!f) { this.points = []; return; }
    const L = r.createLayer(f.w, f.h);
    L.ctx.drawImage(logo.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    let data = null;
    try { data = L.ctx.getImageData(0, 0, f.w, f.h).data; } catch { this.points = []; return; }
    const pts = [];
    for (let y = 0; y < Math.floor(f.h * 0.55); y++) for (let x = 0; x < f.w; x++) if (data[(y * f.w + x) * 4 + 3] > 200) pts.push([x, y]);
    this.points = pts;
  }

  update(dt) {
    const e = this.engine;
    const { input, audio } = e;
    this.t += dt; this.frame++;
    this.art.update(dt);
    if (this.busy) return;
    if (input.anyPressed() || input.heldDir()) this.idle = 0; else this.idle += dt;
    this.nextSparkle -= dt;
    if (this.nextSparkle <= 0 && this.points && this.points.length) {
      this.nextSparkle = 1.1 + e.rng.next() * 0.9;
      const p = this.points[e.rng.int(0, this.points.length - 1)];
      this.sparkles.push({ x: p[0], y: p[1], t: 0 });
    }
    for (const s of this.sparkles) s.t += dt;
    this.sparkles = this.sparkles.filter((s) => s.t < 0.4);
    const act = this.menu.update(input, audio);
    if (act === 'confirm') {
      const id = this.menu.item.id;
      if (id === 'new') { this.busy = true; e.fadeTo(() => e.replace('nameEntry'), { duration: 0.7 }); }
      else if (id === 'continue') { this.busy = true; e.pushAwait('loadGame', { mode: 'load' }).then(() => { this.busy = false; }); }
      else if (id === 'config') { this.busy = true; e.pushAwait('config').then(() => { this.busy = false; }); }
      return;
    }
    if (act === 'pageL' || act === 'pageR') return;
    if (this.idle >= ATTRACT_AFTER) {
      this.idle = 0; this.busy = true;
      e.fadeTo(() => e.push('prologue', { attract: true }), { duration: 0.8 }).then(() => { this.busy = false; });
    }
  }

  draw(r) {
    const e = this.engine;
    // The quantized backdrop already has its sky shaded for the logo and its vignette is dithered to its own
    // palette (keyart.js); the painted crop fallback needs the extra alpha dark.
    this.art.draw(r, { dark: this.art.usesBackdrop ? DARK.none : 0.18, vignette: true });
    const logo = e.assets.has('logo') ? e.assets.atlas('logo') : null;
    const f = logo && logo.frames.logo;
    if (f) {
      if (!this.points) this.samplePoints(r);
      const lx = Math.round((r.W - f.w) / 2), ly = 26;
      r.sprite(logo, f, lx, ly, { topLeft: true });
      const sub = logo.frames.subtitle;
      if (sub) r.sprite(logo, sub, Math.round((r.W - sub.w) / 2), ly + f.h + 3, { topLeft: true });
      for (const s of this.sparkles) {
        const name = animFrameAt(logo.anims.sparkle, s.t);
        if (name) r.sprite(logo, name, lx + s.x, ly + s.y);
      }
    } else {
      r.text('LEXICON QUEST', r.W / 2, 34, { font: 'large', align: 'center', color: 'gold', outline: '#14101e' });
      r.text('The Reforged Realms', r.W / 2, 56, { align: 'center', color: 'cream' });
    }
    // Opaque: a translucent window over the key art would blend hundreds of off-palette colours (D1).
    drawWindow(r, this.win.x, this.win.y, this.win.w, this.win.h);
    this.menu.draw(r, { frame: this.frame, bar: false });
    r.text(VERSION, 4, 205, { color: 'gray' });
  }

  debugState() { return { index: this.menu.index, hasSaves: this.hasSaves, idle: Math.round(this.idle), busy: this.busy, rowH: this.menu.rowH, win: this.win, listY: this.menu.y, backdrop: this.art.usesBackdrop }; }
}

// ---------------------------------------------------------------- install (runs once at boot from the registry)
export async function install(engine) {
  installToasts(engine);
  bindGlyphs(engine);   // device-aware {i:btn_*} glyphs everywhere (D10)
  if (!engine.hasScene('choice')) engine.registerScene('choice', ChoiceScene);
  if (!engine.hasScene('_uiStage')) engine.registerScene('_uiStage', UiStageScene);
  setStatsProvider((m) => { const s = memberStats(m); return { hp: s.maxHp, mp: s.maxMp }; });
  engine.audio.preload(['jingle:item_get', 'jingle:level_up', 'jingle:save', 'jingle:inn_rest']);

  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D) return;
  /**
   * LQ_DEBUG.newGame(name, { scene: 'field'|'stage'|'prologue'|'none', flags: {...}, party: ['mira','bram'],
   *   level, gold, items: {potion: 3}, gear: ['longsword', ...], hp: 0.3 (fraction), map, pos })
   * Creates the game state and resets to the requested scene (default: field when registered, else the UI stage).
   */
  D.register('newGame', (name = 'Hero', o = {}) => {
    const g = createGame(name, { map: o.map, pos: o.pos });
    for (const id of o.party || []) addMember(g, id);
    if (o.level) for (const m of g.party) { m.level = o.level; const s = memberStats(m); m.hp = s.maxHp; m.mp = s.maxMp; }
    if (o.gold != null) g.gold = o.gold;
    for (const [id, q] of Object.entries(o.items || {})) give(g, id, q);
    for (const it of o.gear || []) addGear(g, it);
    for (const [k, v] of Object.entries(o.flags || {})) setFlag(g, k, v);
    if (o.hp != null) for (const m of g.party) m.hp = Math.max(1, Math.round(memberStats(m).maxHp * o.hp));
    if (o.fury != null) for (const m of g.party) m.fury = o.fury;
    if (o.playtime) g.playtime = o.playtime;
    engine.game = g;
    const scene = o.scene || (engine.hasScene('field') ? 'field' : 'stage');
    if (scene === 'none') return 'none';
    if (scene === 'prologue') { engine.reset('prologue'); return 'prologue'; }
    if (scene === 'field' && engine.hasScene('field')) { engine.reset('field', { map: g.map, x: g.pos.x, y: g.pos.y, dir: g.pos.dir }); return 'field'; }
    engine.reset('_uiStage', { music: o.music, banner: o.banner });
    return '_uiStage';
  });
  D.register('give', (id, qty = 1) => {
    const g = engine.game;
    if (!g) throw new Error('no game: call LQ_DEBUG.newGame first');
    if (CONSUMABLES[id] || KEY_ITEMS[id]) { give(g, id, qty); return g.items[id]; }
    if (ITEMS[id] || (id && typeof id === 'object')) { let uid = null; for (let i = 0; i < qty; i++) uid = addGear(g, id); return uid; }
    throw new Error('unknown item ' + id);
  });
  D.register('uiStage', (data) => { engine.reset('_uiStage', data || {}); return '_uiStage'; });
  /** LQ_DEBUG.uiAudit('on' | 'off' | 'windows'): window rects of the last drawn frame (qa/ui/padding.py). */
  D.register('uiAudit', (cmd = 'windows') => {
    if (cmd === 'on') { uiAudit.on = true; return true; }
    if (cmd === 'off') { uiAudit.on = false; uiAudit.windows = []; return false; }
    return { frame: uiAudit.frame, windows: uiAudit.windows.slice() };
  });
  D.register('toast', (text, icon) => engine.toasts.show({ text, icon }) && true);
}

export default TitleScene;
