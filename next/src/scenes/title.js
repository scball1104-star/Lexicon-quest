// Title screen: logo with sparkles over the quantized `title` backdrop (assets/backdrops, 2 px drift; the
// painted crop is the fallback), New Game / Continue / [Episode 2] / Config, version string, attract mode after
// 20 s idle (prologue cards, then back). Also the UI module's install(): toasts, the 'choice', '_uiStage' and
// 'nameEntryEp2' scenes, the stats provider, and LQ_DEBUG.newGame / give / uiStage.
// Episode 2 shows once any slot has `ep1_complete` (or with ?ep=2): name step, newGameEp2, the card, home in bed.
// The row says it is a ready-made party ("Episode 2: new party") and a note beside the menu says the player's own
// game stays under Continue (W15, PLAYTEST_REVIEW_4 fix 1). Both fresh starts share the autosave (slot 0) with
// every other run, so when it already holds a game New Game and the Episode 2 start ask once first (the save guard:
// name, level and place of what would be replaced; "Keep my save" is the default and the cancel answer, a free
// record can take a copy first).
// Held upright on a phone the game is a 384 px strip, so the title first shows a one-time card that says to turn the
// phone (W15, PLAYTEST_REVIEW_4 fix 5): any tap or key dismisses it, settings.rotateHintSeen remembers it, landscape
// never shows it and turning the phone counts as reading it. The portrait layout stays for players who keep it.

import { List, rowHeightFor, tapRowHeight } from '../ui/list.js';
import { drawWindow, installToasts, ChoiceScene, ChoiceBox, uiAudit } from '../ui/index.js';
import { KeyArt, DARK } from '../ui/keyart.js';
import { bindGlyphs } from '../ui/glyphs.js';
import { UiStageScene } from '../ui/stage.js';
import { animFrameAt } from '../core/assets.js';
import { createGame, setFlag, give, addMember, setStatsProvider, START_MAP, START_POS, addGear, newGameEp2, newGameEp3, cleanName, EP2_START, EP3_START } from '../game/state.js';
import { episodeOffers, ep2Offer, pickRunSlot, EP3_ROW_LABEL, EP3_ROW_HELP } from '../game/episodes.js';
import { NameEntryScene } from './nameEntry.js';
import { packsToAwait, awaitPacks } from '../game/packs.js';
import { memberStats } from '../battle/rules.js';
import { ITEMS, CONSUMABLES, KEY_ITEMS } from '../data/items.js';
import { BANNERS } from '../data/text.js';
import { namesKeptInSaves, counterLine } from '../data/ledger.js';

export const VERSION = 'v0.2 NEXT';
const ATTRACT_AFTER = 20;   // seconds idle
/** The title row for the Episode 2 quick start: it starts a ready-made party, it does not continue a game. */
export const EP2_ROW_LABEL = 'Episode 2: new party';
const AUTO_SLOT = 0;

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
    this.ledger = this.ledgerCount();   // H2: "Names kept: N of M" from the slot with the most, computed once per entry
    this.offers = episodeOffers(e.save, typeof location !== 'undefined' ? location.search : '');
    this.ep2 = this.offers.ep2;
    this.ep3 = this.offers.ep3;
    const items = [
      { id: 'new', label: 'New Game' },
      { id: 'continue', label: 'Continue', disabled: !this.hasSaves },
      ...(this.ep2.show ? [{ id: 'ep2', label: EP2_ROW_LABEL }] : []),
      ...(this.ep3.show ? [{ id: 'ep3', label: EP3_ROW_LABEL }] : []),
      { id: 'config', label: 'Config' },
    ];
    // Menu window: anchored at the bottom (y 196; 210 for four touch rows, clear of the subtitle), centred, as wide
    // as its longest row needs (100 px for the three plain rows).
    const rowH = rowHeightFor(e, 11);
    const h = items.length * rowH + 13;
    const bottom = items.length > 3 && rowH > 11 ? 210 : 196;
    let tw = 0;
    for (const it of items) tw = Math.max(tw, e.renderer && e.renderer.measure ? e.renderer.measure(it.label) : it.label.length * 5);
    const w = Math.max(100, tw + 34);
    this.win = { x: Math.round(192 - w / 2), y: bottom - h, w, h };
    this.guard = null;
    this.menu = new List({ x: this.win.x + 6, y: this.win.y + 7, w: this.win.w - 12, rowH, rows: items.length, items, textX: 18, index: this.hasSaves && data.index == null ? 1 : (data.index || 0), confirmSfx: true });
    this.busy = false;
    e.audio.music('title');
    e.audio.ambience(null);
    e.renderer.setBackdrop(null);
  }

  anySave() {
    try { return this.engine.save.list(true).some((s) => s.exists); } catch { return false; }
  }
  /** { kept, total, slot } for the Ledger counter, or null (no save: the line is hidden). */
  ledgerCount() {
    try { return this.hasSaves ? namesKeptInSaves(this.engine.save) : null; } catch { return null; }
  }

  onResume() {
    this.idle = 0; this.busy = false;
    this.hasSaves = this.anySave();
    this.ledger = this.ledgerCount();
    const cont = this.menu.items.find((it) => it.id === 'continue');
    if (cont) cont.disabled = !this.hasSaves;
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
    if (this.updateRotateHint()) return;
    if (this.guard) { this.updateGuard(); return; }
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
      if (id === 'new' || id === 'ep2') {
        const auto = autosaveGuard(e.save);
        if (auto) this.openGuard(id, auto); else this.startFresh(id);
      }
      else if (id === 'ep3') this.openSlotPicker();
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

  /** The upright-phone card: true while it is up (the title waits under it). */
  updateRotateHint() {
    const e = this.engine;
    if (rotateHintWanted(e)) {
      this.rotateShown = true;
      if (e.input.anyPressed() || e.input.heldDir()) { e.input.consumeAll(); e.audio.sfx('cursor'); this.rotateShown = false; e.setSetting('rotateHintSeen', true); }
      return true;
    }
    // turned sideways while the card was up: the player got the message
    if (this.rotateShown) { this.rotateShown = false; if (!e.settings.rotateHintSeen) e.setSetting('rotateHintSeen', true); }
    return false;
  }

  /** New Game or the Episode 2 quick start, once nothing (or the player) objects. */
  startFresh(id) {
    const e = this.engine;
    this.busy = true;
    if (id === 'ep2') e.fadeTo(() => e.replace('nameEntryEp2', { name: this.ep2.name || undefined, artT: this.art.t }), { duration: 0.7 });
    else if (id === 'ep3') e.fadeTo(() => e.replace('nameEntryEp3', { name: this.ep3.name || undefined, slot: this.pickedSlot, artT: this.art.t }), { duration: 0.7 });
    else e.fadeTo(() => e.replace('nameEntry'), { duration: 0.7 });
  }

  /**
   * The Episode 3 quick start never replaces anything (plan 10.3): slot 0 if empty (starts at once), else the first empty
   * record with a one-line notice (Start / Back, Back is the default), else a refusal with only Back.
   */
  openSlotPicker() {
    const e = this.engine;
    const pick = pickRunSlot(e.save);
    if (pick.ok && pick.notice == null) { this.pickedSlot = pick.slot; this.startFresh('ep3'); return; }
    const options = pick.ok ? [{ id: 'back', label: 'Back' }, { id: 'start', label: 'Start' }] : [{ id: 'back', label: 'Back' }];
    const lines = pick.notice.split(/(?<=\.) /).map((text) => ({ text, color: pick.ok ? 'white' : 'gold' }));   // one sentence a line
    const msgH = lines.length * 11 + 12;
    const rowH = tapRowHeight(e, 11);
    const boxH = options.length * rowH + 12;
    const top = Math.max(4, Math.round((216 - (msgH + 4 + boxH)) / 2));
    const box = new ChoiceBox(e, options.map((o) => o.label), { x: 192, y: top + msgH + 4 + Math.floor(boxH / 2), anchor: 'center', minWidth: 150, index: 0, cancel: 0, tapMode: 'double' });
    this.guard = { kind: 'slot', id: 'ep3', slot: pick.slot, pick, options, lines, msg: { x: 52, y: top, w: 280, h: msgH }, box };
    e.audio.sfx('menu_open');
  }

  /** The save guard: what the autosave holds, and Keep my save (default, cancel) / Copy it, then start / Replace it. */
  openGuard(id, auto) {
    const e = this.engine;
    const free = freeRecord(e.save);
    const options = [{ id: 'keep', label: 'Keep my save' }];
    if (free) options.push({ id: 'copy', label: 'Copy it, then start' });
    options.push({ id: 'replace', label: 'Replace it' });
    const lines = [
      { text: 'Your autosave holds another game:', color: 'white' },
      { text: auto.line, color: 'gold' },
      { text: id === 'ep2' ? 'The Episode 2 party would replace it.' : 'A new game would replace it.', color: 'white' },
    ];
    if (free) lines.push({ text: `Copy keeps it safe in Record ${free}.`, color: 'gray' });
    const msgH = lines.length * 11 + 12;
    const rowH = tapRowHeight(e, 11);
    const boxH = options.length * rowH + 12;
    const top = Math.max(4, Math.round((216 - (msgH + 4 + boxH)) / 2));
    // Two taps on a row that is not highlighted (the List default): one tap can never replace a save by accident.
    const box = new ChoiceBox(e, options.map((o) => o.label), { x: 192, y: top + msgH + 4 + Math.floor(boxH / 2), anchor: 'center', minWidth: 150, index: 0, cancel: 0, tapMode: 'double' });
    this.guard = { id, auto, free, options, lines, msg: { x: 52, y: top, w: 280, h: msgH }, box };
    e.audio.sfx('menu_open');
  }

  updateGuard() {
    const e = this.engine;
    const g = this.guard;
    const res = g.box.update();
    if (res == null) return;
    const pick = (g.options[res] || g.options[0]).id;
    this.guard = null;
    if (g.kind === 'slot') {
      if (pick === 'start') { this.pickedSlot = g.slot; this.startFresh('ep3'); }
      return;
    }
    if (pick === 'keep') return;
    if (pick === 'copy') {
      let ok = false;
      try { ok = !!e.save.importSlot(g.free, e.save.exportSlot(AUTO_SLOT)); } catch (err) { ok = false; }
      if (!ok) { e.audio.sfx('buzzer'); return; }
      if (e.toasts && e.toasts.flash) e.toasts.flash(`Copied to Record ${g.free}.`, { frames: 120 });
    }
    this.startFresh(g.id);
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
    // The save guard stands in for the menu while it asks (two stacked menus read as one muddle).
    if (!this.guard) {
      drawWindow(r, this.win.x, this.win.y, this.win.w, this.win.h);
      // Only the page on top shows a finger: under Load Game or Config the title's would read as a second cursor.
      this.menu.draw(r, { frame: this.frame, bar: false, cursor: e.scene === this });
    }
    r.text(VERSION, 4, 205, { color: 'gray' });
    this.drawLedgerCount(r);
    const noteId = this.menu.item && !this.guard ? this.menu.item.id : null;
    const note = noteId === 'ep2' ? this.ep2Note() : noteId === 'ep3' ? EP3_ROW_HELP : null;
    if (note) {
      const lines = r.wrap(note, 108);
      const nh = lines.length * 11 + 10, nx = this.win.x + this.win.w + 6;
      const ny = this.win.y + this.win.h - nh;
      drawWindow(r, nx, ny, 384 - 4 - nx, nh, { kind: 'thin' });
      lines.forEach((l, i) => r.text(l, nx + 6, ny + 5 + i * 11, { color: 'cream' }));
    }
    if (this.guard) this.drawGuard(r);
    if (rotateHintWanted(e)) drawRotateHint(r, this.frame);
  }

  /**
   * H2: one small line, "Names kept: N of M", centred under the menu window (the touch layout with four rows reaches
   * the screen's bottom edge: the line goes to the top right corner instead). Hidden with no save and under the guard.
   */
  drawLedgerCount(r) {
    if (!this.ledger || this.guard) return;
    const y = this.win.y + this.win.h + 3;
    if (y + 11 <= r.H) r.text(counterLine(this.ledger), Math.round(r.W / 2), y, { align: 'center', color: 'gray' });
    else r.text(counterLine(this.ledger), r.W - 4, 4, { align: 'right', color: 'gray' });
  }

  /** The help beside the Episode 2 row: what it starts, and where the player's own game is. */
  ep2Note() {
    const own = this.hasSaves ? ' Your own game stays under Continue.' : '';
    return `Starts Episode 2 with a ready-made Lv ${EP2_START.level} party.${own}`;
  }

  drawGuard(r) {
    const g = this.guard;
    r.withAlpha(0.55, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    const m = g.msg;
    drawWindow(r, m.x, m.y, m.w, m.h);
    g.lines.forEach((l, i) => r.text(l.text, r.W / 2, m.y + 6 + i * 11, { align: 'center', color: l.color }));
    g.box.draw(r);
  }

  debugState() { return { index: this.menu.index, hasSaves: this.hasSaves, ledger: this.ledger, idle: Math.round(this.idle), busy: this.busy, rowH: this.menu.rowH, win: this.win, listY: this.menu.y, backdrop: this.art.usesBackdrop,
    items: this.menu.items.map((it) => it.id), labels: this.menu.items.map((it) => it.label), ep2: this.ep2,
    guard: this.guard ? { id: this.guard.id, line: this.guard.auto ? this.guard.auto.line : this.guard.lines[0].text, options: this.guard.options.map((o) => o.id), index: this.guard.box.index, free: this.guard.free } : null }; }
}

/** The upright-phone card is wanted: the touch layout in portrait (game above the controls) and not yet read. */
export function rotateHintWanted(engine) {
  const v = engine && engine.renderer && engine.renderer.view;
  return !!(v && v.touchMode === 'below' && !(engine.settings && engine.settings.rotateHintSeen));
}

/** A phone outline (upright when `side` is false), 1 px ink rim, cream body, dark screen. */
function drawPhone(r, x, y, side) {
  const w = side ? 22 : 13, h = side ? 13 : 22;
  r.rect(x, y, w, h, '#14101e');
  r.rect(x + 1, y + 1, w - 2, h - 2, '#e2e0de');
  if (side) { r.rect(x + 3, y + 2, w - 6, h - 4, '#292657'); r.rect(x + w - 2, y + 5, 1, 3, '#66637f'); }
  else { r.rect(x + 2, y + 3, w - 4, h - 6, '#292657'); r.rect(x + 5, y + h - 2, 3, 1, '#66637f'); }
}

/** The upright-phone card over the title: an upright phone, an arrow, a sideways phone, and the line. */
export function drawRotateHint(r, frame = 0) {
  r.withAlpha(0.6, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
  const w = 300, h = 96, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
  drawWindow(r, x, y, w, h);
  const cx = Math.round(r.W / 2);
  drawPhone(r, cx - 40, y + 10, false);
  // the arrow between the two phones, nudging toward the sideways one
  const ax = cx - 18 + (Math.floor(frame / 20) % 2), ay = y + 20;
  r.rect(ax, ay, 14, 2, '#f9d77a');
  r.rect(ax + 14, ay - 3, 2, 8, '#f9d77a'); r.rect(ax + 16, ay - 2, 2, 6, '#f9d77a'); r.rect(ax + 18, ay - 1, 2, 4, '#f9d77a'); r.rect(ax + 20, ay, 1, 2, '#f9d77a');
  drawPhone(r, cx + 14, y + 15, true);
  r.text('Turn your phone sideways', cx, y + 40, { font: 'large', align: 'center', color: 'cream' });
  r.text('for a bigger picture.', cx, y + 56, { font: 'large', align: 'center', color: 'cream' });
  if (Math.floor(frame / 28) % 3 !== 2) r.text('Tap to continue', cx, y + 79, { align: 'center', color: 'gray' });
}

/**
 * The save guard's question (W15): null when a fresh start would overwrite nothing (no readable autosave), else
 * { name, level, place, line } for the game slot 0 holds. Every fresh start is a different run from the one in the
 * autosave, so an occupied slot 0 is always asked about. Pure (fake saves in node tests).
 */
export function autosaveGuard(save) {
  let env = null;
  try { env = save && save.loadEnvelope(AUTO_SLOT); } catch (err) { env = null; }
  if (!env || !env.data) return null;
  const m = env.meta || {}, d = env.data;
  const name = m.name || d.heroName || 'Hero';
  const level = m.level || (d.party && d.party[0] && d.party[0].level) || 1;
  const map = m.map || d.map || '';
  const place = (BANNERS[map] && BANNERS[map].title) || map || 'somewhere';
  return { name, level, place, line: `${name}, Lv ${level}, ${place}` };
}

/** The first empty manual record (1..3), or 0 when all three are taken. */
export function freeRecord(save) {
  const n = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let i = 1; i <= n; i++) { try { if (!save.exists(i)) return i; } catch (err) { return 0; } }
  return 0;
}

// ep2Offer lives in game/episodes.js now (with episodeOffers); re-exported so existing imports keep working.
export { ep2Offer };

/** newGameEp3(name, { slot }), the field awake in the Hollowmere inn. The run saves only to its own slot. */
export function startEpisode3(engine, name, slot = 0) {
  const e = engine;
  const g = newGameEp3(cleanName(name), { slot });
  e.game = g;
  return e.fadeTo(() => {
    const enter = () => {
      if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP3_START.mark, dir: 'down' });
      else e.reset('_uiStage', {});
    };
    const ids = packsToAwait(g.flags);          // packs the party wants: at most 1.5 s behind the fade (docs/PWA_PACKS.md)
    return ids.length ? awaitPacks(ids).then(enter) : enter();
  }, { duration: 0.8 });
}

export class NameEntryEp3Scene extends NameEntryScene {
  constructor(engine) { super(engine); this.name = 'nameEntryEp3'; }
  enter(data = {}) { super.enter(data); this.slot = data.slot || 0; }
  done() {
    const e = this.engine;
    e.audio.sfx('confirm');
    this.busy = true;
    startEpisode3(e, this.value, this.slot);
  }
}

/** newGameEp2(name), the field at home in bed, and the Episode 2 card on top (the field waits under it). */
export function startEpisode2(engine, name) {
  const e = engine;
  const g = newGameEp2(cleanName(name));
  e.game = g;
  return e.fadeTo(() => {
    const enter = () => {
      if (e.hasScene('field')) e.reset('field', { map: g.map, mark: EP2_START.mark || 'bed', dir: 'down' });
      else e.reset('_uiStage', {});
      if (e.hasScene('titleCard')) e.push('titleCard', { text: 'Episode 2', sub: 'The Town Without a Name', frames: 180, backdrop: 'dialog_keyart_ep2' });
    };
    const ids = packsToAwait(g.flags);          // packs the party wants: at most 1.5 s behind the fade (docs/PWA_PACKS.md)
    return ids.length ? awaitPacks(ids).then(enter) : enter();
  }, { duration: 0.8 });
}

export class NameEntryEp2Scene extends NameEntryScene {
  constructor(engine) { super(engine); this.name = 'nameEntryEp2'; }
  done() {
    const e = this.engine;
    e.audio.sfx('confirm');
    this.busy = true;
    startEpisode2(e, this.value);
  }
}

// ---------------------------------------------------------------- install (runs once at boot from the registry)
export async function install(engine) {
  installToasts(engine);
  bindGlyphs(engine);   // device-aware {i:btn_*} glyphs everywhere (D10)
  if (!engine.hasScene('choice')) engine.registerScene('choice', ChoiceScene);
  if (!engine.hasScene('_uiStage')) engine.registerScene('_uiStage', UiStageScene);
  if (!engine.hasScene('nameEntryEp2')) engine.registerScene('nameEntryEp2', NameEntryEp2Scene);
  if (!engine.hasScene('nameEntryEp3')) engine.registerScene('nameEntryEp3', NameEntryEp3Scene);
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
  /**
   * LQ_DEBUG.newGameEp3(name, { slot, scene: 'field' | 'none' }): the Episode 3 quick start (state.js newGameEp3). Without
   * `slot` it picks the run's own slot like the title does (episodes.js pickRunSlot) and returns null if every slot is full.
   */
  D.register('newGameEp3', (name = 'Hero', o = {}) => {
    let slot = o.slot;
    if (slot == null) {
      const pick = pickRunSlot(engine.save);
      if (!pick.ok) return null;
      slot = pick.slot;
    }
    const g = newGameEp3(name, { ...o, slot });
    engine.game = g;
    if (o.scene === 'none' || !engine.hasScene('field')) return { map: g.map, slot };
    engine.reset('field', { map: g.map, mark: EP3_START.mark, dir: 'down' });
    return { map: g.map, slot };
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
