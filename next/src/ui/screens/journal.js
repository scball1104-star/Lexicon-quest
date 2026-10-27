// Journal: main quest step and side quests; Bestiary tab with seen/killed counts, known weaknesses and lore,
// and (W7) the creature's own battle sprite in a picture box: integer scale (2, 1, 1/2, 1/3, 1/4), nearest
// neighbour, the biggest that fits; a black silhouette for an entry the player has not met yet.

import { List, rowHeightFor, rowsThatFit, touchUi } from '../list.js';
import { drawWindow, drawIcon, drawDivider, drawScrollArrow } from '../window.js';
import { drawHelpBar } from '../help.js';
import { drawTabs } from './common.js';
import { journal } from '../../data/quests.js';
import { ledgerRows } from '../../data/ledger.js';
import { BESTIARY, HELP } from '../../data/text.js';
import { ENEMIES } from '../../data/enemies.js';
import { hasFlag } from '../../game/state.js';
import { vowLine } from '../../game/vows.js';
import { recordOf, vaultIds } from '../../game/cave.js';
import { fillHero } from '../text.js';

const TABS = ['Quests', 'Bestiary', 'Ledger'];
/** Ledger tab (H2): the faded-ink treatment of a name not yet kept: cream at low alpha, no shadow. */
const FADED = { color: 'cream', alpha: 0.42, shadow: false };
const LIST_X = 24, LIST_W = 124;
const WEAK_ICON = { sword: 'sword', spear: 'spear', staff: 'staff', axe: 'axe', bow: 'bow', fire: 'fire', ice: 'ice', thunder: 'thunder', light: 'light' };

/** Normalize g.bestiary[id] into { seen, killed, weak[], resist[] }. */
export function bestiaryEntry(g, id) {
  const raw = g.bestiary ? g.bestiary[id] : null;
  if (!raw) return { seen: 0, killed: 0, weak: [], resist: [] };
  if (Array.isArray(raw)) return { seen: 1, killed: 0, weak: raw.slice(), resist: [] };
  // W9: Mira's Appraise in the field writes `appraised` before any fight: the entry is known (name, weak points, HP)
  return { seen: raw.seen || (raw.killed ? 1 : 0) || 0, killed: raw.killed || 0, weak: raw.weak || [], resist: raw.resist || [], appraised: !!raw.appraised };
}

/** Picture box of the bestiary detail panel (screen px). */
export const PIC = { x: 284, y: 34, w: 92, h: 78 };
const SCALES = [2, 1, 1 / 2, 1 / 3, 1 / 4];

/** The battle atlas and frame for an enemy id: enemies_battle, or bosses_battle for the ids it holds. */
export function enemyArt(r, id) {
  const assets = r.assets;
  if (!assets) return null;
  const en = assets.has('enemies_battle') ? assets.atlas('enemies_battle') : null;
  const def = ENEMIES[id];
  const frameId = (def && def.sprite && def.sprite.frame) || id;
  const tryAtlas = (a) => (a && a.frames[frameId] ? { atlas: a, frame: a.frames[frameId], id: frameId } : null);
  const own = tryAtlas(en);
  if (own) return own;
  const ext = en && en.meta && en.meta.external && en.meta.external[frameId];
  if (ext && assets.has(ext)) { const hit = tryAtlas(assets.atlas(ext)); if (hit) return hit; }
  return assets.has('bosses_battle') ? tryAtlas(assets.atlas('bosses_battle')) : null;
}


/** Fit a label to maxW: drop a leading "The ", then ellipsize. */
export function fitLine(r, text, maxW) {
  let t = String(text || '');
  if (r.measure(t) <= maxW) return t;
  if (/^The /.test(t) && r.measure(t.slice(4)) <= maxW) return t.slice(4);
  t = t.replace(/^The /, '');
  while (t.length > 1 && r.measure(t + '…') > maxW) t = t.slice(0, -1).trimEnd();
  return t + '…';
}

export function statLine(r, level, hp, shields, maxW = STAT_W) {
  const forms = [`Lv ${level}  HP ${hp}  Shields ${shields}`, `Lv ${level} HP ${hp} Shields ${shields}`, `Lv ${level} HP ${hp} Sh ${shields}`];
  return forms.find((t) => r.measure(t) <= maxW) || forms[forms.length - 1];
}
export const STAT_W = 112;

/** Largest integer scale (or 1/n) of a w x h sprite that fits the box; never below 1/4. */
export function fitScale(w, h, bw, bh) {
  for (const sc of SCALES) if (w * sc <= bw && h * sc <= bh) return sc;
  return SCALES[SCALES.length - 1];
}

/** Draw the creature in the picture box: its sprite, or a black silhouette when `known` is false. */
export function drawBeastPicture(r, id, known) {
  drawWindow(r, PIC.x, PIC.y, PIC.w, PIC.h, { kind: 'thin' });
  r.rect(PIC.x + 3, PIC.y + 3, PIC.w - 6, PIC.h - 6, known ? '#1a1e42' : '#3a4280');   // the silhouette needs a lighter ground to read
  const art = enemyArt(r, id);
  if (!art) { r.text('?', PIC.x + PIC.w / 2, PIC.y + PIC.h / 2 - 8, { font: 'large', align: 'center', color: 'dim' }); return false; }
  const f = art.frame;
  const iw = PIC.w - 4, ih = PIC.h - 4;
  const sc = fitScale(f.w, f.h, iw, ih);
  const w = Math.round(f.w * sc), h = Math.round(f.h * sc);
  const x = PIC.x + 2 + Math.floor((iw - w) / 2), y = PIC.y + 2 + Math.floor((ih - h) / 2);
  // A soft ground ellipse under walkers keeps the sprite from floating in the box.
  const tint = (ENEMIES[id] && ENEMIES[id].sprite && ENEMIES[id].sprite.tint) || null;   // elite variants share a frame and differ by tint
  r.sprite(art.atlas, f, x, y, !known ? { topLeft: true, scale: sc, tint: '#05030c', tintAmount: 1 } : tint ? { topLeft: true, scale: sc, tint, tintAmount: 0.35 } : { topLeft: true, scale: sc });
  return true;
}

export class JournalScreen {
  constructor(menu) { this.menu = menu; this.engine = menu.engine; this.g = menu.g; }
  enter() {
    this.tab = 0;
    const ids = Object.keys(BESTIARY);
    const rowH = rowHeightFor(this.engine, 12);
    this.beasts = new List({ x: 24, y: 34, w: 124, rowH, rows: Math.min(11, rowsThatFit(144, rowH)), items: ids.map((id) => {   // x 24: glove inside the screen (D7)
      const e = bestiaryEntry(this.g, id);
      const known = e.seen > 0 || e.killed > 0 || e.appraised;
      return { id, label: known ? BESTIARY[id].name : '???', color: known ? (e.killed ? 'white' : 'gray') : 'dim', known, entry: e };
    }) });
    this.scroll = 0;
    this.loreScroll = 0; this.loreMax = 0; this.loreRows = []; this.loreFor = null;
    this.buildLedger();
  }
  /** The Ledger tab's list: a gold place header, then its names (the glove skips headers). */
  buildLedger() {
    const g = this.g;
    const rows = ledgerRows(g.flags, { heroName: g.heroName });
    const items = [];
    let place = null;
    for (const row of rows) {
      if (row.place !== place) { place = row.place; items.push({ id: 'place:' + place, label: null, disabled: true, header: row.placeName, draw: drawPlaceRow }); }
      items.push({ id: row.id, label: null, row, draw: drawNameRow });
    }
    const rowH = rowHeightFor(this.engine, 12);
    this.names = new List({ x: LIST_X, y: 34, w: LIST_W, rowH, rows: Math.min(11, rowsThatFit(144, rowH)), items, index: 1, skipDisabled: true, confirmSfx: false });
    this.count = { kept: rows.filter((r) => r.kept).length, total: rows.length };
  }
  switchTab(d) { this.tab = (this.tab + d + TABS.length) % TABS.length; this.engine.audio.sfx('cursor'); }
  /** A tap on the header strip turns the page: left half back, right half forward (the arrows drawn there). */
  tabTap(input) {
    if (input.pointer.pressed && input.tapIn(0, 0, 384, 30)) this.switchTab(input.pointer.x < 192 ? -1 : 1);
  }
  update() {
    const { input, audio } = this.engine;
    if (this.tab === 2) {
      const act = this.names.update(input, audio);
      if (act === 'cancel') return 'back';
      if (act === 'pageL' || act === 'pageR') this.switchTab(act === 'pageL' ? -1 : 1);
      this.tabTap(input);
      return null;
    }
    if (this.tab === 1) {
      const act = this.beasts.update(input, audio);
      if (act === 'cancel') return 'back';
      if (act === 'pageL' || act === 'pageR') this.switchTab(act === 'pageL' ? -1 : 1);
      this.tabTap(input);
      // Left / Right read a lore entry that is taller than its box; a different beast starts at the top again.
      const id = this.beasts.item ? this.beasts.item.id : null;
      if (id !== this.loreFor) { this.loreFor = id; this.loreScroll = 0; }
      const rows = this.loreRows || [];
      const p = input.pointer;
      if (p && p.pressed && p.x >= 158 && p.x < 380 && p.y >= 116 && p.y < 180 && (this.loreMax || 0) > 0) {
        const down = p.y >= 148;
        if (down && this.loreScroll < this.loreMax) { this.loreScroll++; if (rows[this.loreScroll] === null) this.loreScroll++; audio.sfx('cursor'); }
        else if (!down && this.loreScroll > 0) { this.loreScroll--; if (rows[this.loreScroll] === null) this.loreScroll--; audio.sfx('cursor'); }
      } else if (input.pressed('right') && (this.loreScroll || 0) < (this.loreMax || 0)) {
        this.loreScroll = (this.loreScroll || 0) + 1;
        if (rows[this.loreScroll] === null) this.loreScroll++;
        audio.sfx('cursor');
      } else if (input.pressed('left') && (this.loreScroll || 0) > 0) {
        this.loreScroll--;
        if (rows[this.loreScroll] === null) this.loreScroll--;
        audio.sfx('cursor');
      }
      return null;
    }
    if (input.pressed('cancel')) { audio.sfx('cancel'); return 'back'; }
    if (input.pressed('pageL')) this.switchTab(-1);
    else if (input.pressed('pageR') || input.pressed('confirm')) this.switchTab(1);
    const d = input.repeatDir();
    if (d === 'down' && this.scroll < (this.maxScroll || 0)) { this.scroll++; audio.sfx('cursor'); }
    if (d === 'up' && this.scroll > 0) { this.scroll--; audio.sfx('cursor'); }
    this.tabTap(input);
    return null;
  }
  drawQuests(r) {
    const g = this.g;
    const j = journal((f) => hasFlag(g, f));
    drawWindow(r, 4, 30, 376, 150);
    r.pushClip(8, 34, 368, 140);
    // Only whole lines are drawn (never one cut by the bottom edge): a row shows when its top is in 34..164.
    let end = 0;   // top of the last row, so the scroll limit lands on it
    const seen = (yy) => { if (yy > end) end = yy; return yy >= 34 && yy <= 164; };
    let y = 38 - this.scroll * 11;
    if (seen(y)) { drawIcon(r, 'quest', 12, y - 1); r.text(j.main.title, 27, y, { font: 'large', color: 'gold' }); }
    // H3 (docs/VOWS.md): the vow carried now, at the right of the quest title; "Vow ended" (dim) until the next rest.
    const vow = vowLine(g);
    if (vow && seen(y)) r.text(vow, 370, y + 2, { align: 'right', color: vow.startsWith('Vow:') ? 'cream' : 'dim' });
    y += 17;
    if (seen(y)) r.text(j.main.step, 14, y, { color: 'cream' });
    y += 12;
    for (const line of r.wrap(fillHero(j.main.text, g), 356)) { if (seen(y)) r.text(line, 14, y); y += 11; }
    // C2-story-ui (docs/DEEP_STACKS_PLAN.md 3): one line under the main quest once the Archivist has spoken
    const ds = stacksLine(g);
    if (ds) { y += 1; if (seen(y)) { drawIcon(r, 'book', 12, y - 1); r.text(ds, 27, y, { color: 'cream' }); } y += 11; }
    y += 4;
    if (j.side.length) { if (seen(y)) drawDivider(r, 10, y, 364); y += 6; if (seen(y)) r.text('Errands', 14, y, { color: 'gold' }); y += 12; }
    for (const q of j.side) {
      if (seen(y)) {
        drawIcon(r, q.done ? 'star' : 'letter', 12, y - 1, { alpha: q.done ? 0.6 : 1 });
        r.text(q.title, 27, y, { color: q.done ? 'dim' : 'cream' });
        if (q.counter) r.text(`${q.counter.label} ${q.counter.value}/${q.counter.max}`, 370, y, { align: 'right', color: q.done ? 'dim' : 'gray' });
      }
      y += 11;
      for (const line of r.wrap(fillHero(q.text, g), 344)) { if (seen(y)) r.text(line, 27, y, { color: q.done ? 'dim' : 'white' }); y += 11; }
      y += 3;
    }
    if (!j.side.length && seen(y)) { r.text(`No errands yet. Talk to the people of ${hasFlag(g, 'nh_arrived') ? 'the Hollow' : 'Willowmere'}.`, 14, y, { color: 'dim' }); }
    r.popClip();
    this.maxScroll = Math.max(0, Math.ceil((end - 164) / 11));
    if (this.scroll < this.maxScroll) drawScrollArrow(r, 'down', 192, 172);
    if (this.scroll > 0) drawScrollArrow(r, 'up', 192, 30);
  }
  drawBestiary(r) {
    drawWindow(r, 4, 30, 150, 150);
    this.beasts.draw(r, { frame: r.frame, bar: true });
    drawWindow(r, 158, 30, 222, 150);
    const it = this.beasts.item;
    if (!it) return;
    const x = 166;
    drawBeastPicture(r, it.id, it.known);
    if (!it.known) { r.text('???', x, 36, { font: 'large', color: 'dim' }); r.text('You have not met\nthis creature.', x, 58, { color: 'dim' }); return; }
    const b = BESTIARY[it.id], d = ENEMIES[it.id], e = it.entry;
    // The text column is 114 px wide (the picture box takes the right 92).
    const big = r.measure(b.name, 'large') <= 112;   // a long name (Thornback Wolf) drops to the small font instead of running under the picture
    r.text(b.name, x, big ? 35 : 38, { font: big ? 'large' : 'main', color: 'cream' });
    r.text(fitLine(r, b.where, 116), x, 52, { color: 'gray' });
    r.text(`Seen ${e.seen}  Defeated ${e.killed}`, x, 63, { color: 'gray' });
    r.text('Weak:', x, 76, { color: 'gold' });
    let wx = x + 34;
    const weakKnown = (d ? d.weak : []).filter((t) => e.weak.includes(t));
    const unknown = d ? d.weak.length - weakKnown.length : 0;
    for (const t of weakKnown) { drawIcon(r, WEAK_ICON[t] || t, wx, 74); wx += 14; }
    for (let i = 0; i < unknown; i++) { drawIcon(r, 'weak_unknown', wx, 74); wx += 15; }
    let ly = 88;
    if (d && d.resist && d.resist.length) {
      r.text('Resists:', x, ly + 2, { color: 'gold' }); let rx = x + r.measure('Resists:') + 4;
      for (const t of d.resist) { drawIcon(r, WEAK_ICON[t] || t, rx, ly, { alpha: e.resist.includes(t) ? 1 : 0.35 }); rx += 14; }
      ly += 14;
    }
    if (d) r.text(statLine(r, d.level, e.killed || e.appraised ? d.hp : '???', d.shields), x, Math.min(ly, 100), { color: 'gray' });
    drawDivider(r, 164, 116, 210);
    // Lore sits in a box from y 121 down to 174 (6 px above the frame); only whole lines are drawn, never a cut
    // one. Left / Right (or a tap on its lower / upper half) scroll an entry that is taller than the box.
    const lore = e.killed ? b.lore : b.lore.slice(0, 1);
    const rows = this.loreRows = [];
    lore.forEach((para, pi) => { if (pi) rows.push(null); for (const line of r.wrap(para, 204)) rows.push(line); });
    const LINE = 11, GAP = 4, TOP = 121, LAST_Y = 164;   // a line is drawn only when y <= LAST_Y (its descenders end by 174)
    const fits = (from) => { let y = TOP; for (let i = from; i < rows.length; i++) { if (rows[i] === null) { y += GAP; continue; } if (y > LAST_Y) return false; y += LINE; } return true; };
    this.loreMax = 0;
    while (this.loreMax < rows.length && !fits(this.loreMax)) this.loreMax++;
    this.loreScroll = Math.min(this.loreScroll || 0, this.loreMax);
    let y = TOP;
    for (let i = this.loreScroll; i < rows.length; i++) {
      if (rows[i] === null) { y += GAP; continue; }
      if (y > LAST_Y) break;
      r.text(rows[i], x, y, { color: 'white' });
      y += LINE;
    }
    if (this.loreScroll < this.loreMax) drawScrollArrow(r, 'down', 372, 169);
    if (this.loreScroll > 0) drawScrollArrow(r, 'up', 372, 118);
    if (!e.killed && this.loreMax === 0 && y + 4 <= 166) r.text('Defeat one to read more.', x, y + 4, { color: 'dim' });
  }
  /** The Ledger of Names (H2, docs/LEDGER.md): names by place, bright or faded; the count and the kept line on the right. */
  drawLedger(r) {
    drawWindow(r, 4, 30, 150, 150);
    this.names.draw(r, { frame: r.frame, bar: true });
    drawWindow(r, 158, 30, 222, 150);
    const x = 166, rx = 372, c = this.count;
    r.text('Names kept', x, 36, { color: 'gold' });
    r.text(`${c.kept} of ${c.total}`, rx, 36, { align: 'right', color: 'cream' });
    drawDivider(r, 164, 50, 210);
    const it = this.names.item, row = it && it.row;
    if (!row) return;
    r.text(row.name, x, 57, row.kept ? { font: 'large', color: 'cream' } : { ...FADED, font: 'large' });
    if (row.kept) drawIcon(r, 'star', rx - 12, 58);
    r.text(row.placeName, x, 76, { color: 'gray' });
    drawDivider(r, 164, 90, 210);
    if (!row.kept) { r.text('...', x, 96, { color: 'dim' }); return; }
    r.wrap(row.why, 206).slice(0, 4).forEach((line, i) => r.text(line, x, 96 + i * 11, { color: 'white' }));
  }
  draw(r) {
    drawWindow(r, 4, 4, 376, 24);
    drawTabs(r, TABS, this.tab, 4, 10, 376);
    if (this.tab === 0) this.drawQuests(r); else if (this.tab === 1) this.drawBestiary(r); else this.drawLedger(r);
    const help = this.tab === 0 ? HELP.menu.journal : this.tab === 1 ? HELP.menu.bestiary : (touchUi(this.engine) ? HELP.menu.ledgerTouch : HELP.menu.ledger);
    drawHelpBar(r, help, { right: TABS[this.tab] });
  }
  debugState() {
    return { screen: 'journal', tab: this.tab, beast: this.beasts.item ? this.beasts.item.id : null,
      ledger: this.names ? { name: this.names.item ? this.names.item.id : null, ...this.count, rows: this.names.length, scroll: this.names.scroll } : null };
  }
}

/** The Deep Stacks line under the main quest (C2-story-ui): null until deep_stacks_open; the deepest floor and the vault count. */
export function stacksLine(g) {
  if (!hasFlag(g, 'deep_stacks_open')) return null;
  const rec = recordOf(g), n = vaultIds(g).length;
  if (!(rec.floor > 0)) return 'The Deep Stacks: no reading yet';
  return `The Deep Stacks: deepest B${rec.floor}, ${n} ${n === 1 ? 'name' : 'names'} in the vault`;
}

/** A place header row of the Ledger list (gold, no glove: the item is disabled and skipped). */
function drawPlaceRow(r, rr) {
  r.text(this.header, rr.x + 2, rr.y + 1 + Math.max(0, Math.floor((rr.h - 12) / 2)), { color: 'gold' });
}
/** A name row: bright cream when kept, faded ink when not. */
function drawNameRow(r, rr) {
  const row = this.row, y = rr.y + 1 + Math.max(0, Math.floor((rr.h - 12) / 2));
  r.text(row.name, rr.x + 6, y, row.kept ? { color: 'cream' } : FADED);
}
