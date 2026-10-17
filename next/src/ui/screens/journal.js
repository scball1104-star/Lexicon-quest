// Journal: main quest step and side quests; Bestiary tab with seen/killed counts, known weaknesses and lore.

import { List } from '../list.js';
import { drawWindow, drawIcon, drawDivider, drawScrollArrow } from '../window.js';
import { drawHelpBar } from '../help.js';
import { drawTabs } from './common.js';
import { journal } from '../../data/quests.js';
import { BESTIARY, HELP } from '../../data/text.js';
import { ENEMIES } from '../../data/enemies.js';
import { hasFlag } from '../../game/state.js';
import { fillHero } from '../text.js';

const TABS = ['Quests', 'Bestiary'];
const WEAK_ICON = { sword: 'sword', spear: 'spear', staff: 'staff', axe: 'axe', bow: 'bow', fire: 'fire', ice: 'ice', thunder: 'thunder', light: 'light' };

/** Normalize g.bestiary[id] into { seen, killed, weak[], resist[] }. */
export function bestiaryEntry(g, id) {
  const raw = g.bestiary ? g.bestiary[id] : null;
  if (!raw) return { seen: 0, killed: 0, weak: [], resist: [] };
  if (Array.isArray(raw)) return { seen: 1, killed: 0, weak: raw.slice(), resist: [] };
  return { seen: raw.seen || (raw.killed ? 1 : 0) || 0, killed: raw.killed || 0, weak: raw.weak || [], resist: raw.resist || [] };
}

export class JournalScreen {
  constructor(menu) { this.menu = menu; this.engine = menu.engine; this.g = menu.g; }
  enter() {
    this.tab = 0;
    const ids = Object.keys(BESTIARY);
    this.beasts = new List({ x: 10, y: 34, w: 138, rowH: 12, rows: 12, items: ids.map((id) => {
      const e = bestiaryEntry(this.g, id);
      const known = e.seen > 0 || e.killed > 0;
      return { id, label: known ? BESTIARY[id].name : '???', color: known ? (e.killed ? 'white' : 'gray') : 'dim', known, entry: e };
    }) });
    this.scroll = 0;
  }
  switchTab(d) { this.tab = (this.tab + d + TABS.length) % TABS.length; this.engine.audio.sfx('cursor'); }
  update() {
    const { input, audio } = this.engine;
    if (this.tab === 1) {
      const act = this.beasts.update(input, audio);
      if (act === 'cancel') return 'back';
      if (act === 'pageL' || act === 'pageR') this.switchTab(act === 'pageL' ? -1 : 1);
      return null;
    }
    if (input.pressed('cancel')) { audio.sfx('cancel'); return 'back'; }
    if (input.pressed('pageL') || input.pressed('pageR') || input.pressed('confirm')) this.switchTab(1);
    const d = input.repeatDir();
    if (d === 'down' && this.scroll < (this.maxScroll || 0)) { this.scroll++; audio.sfx('cursor'); }
    if (d === 'up' && this.scroll > 0) { this.scroll--; audio.sfx('cursor'); }
    if (input.pointer.pressed && input.tapIn(0, 0, 384, 30)) this.switchTab(1);
    return null;
  }
  drawQuests(r) {
    const g = this.g;
    const j = journal((f) => hasFlag(g, f));
    drawWindow(r, 4, 30, 376, 150);
    r.pushClip(8, 34, 368, 137);
    let y = 38 - this.scroll * 11;
    drawIcon(r, 'quest', 12, y - 1);
    r.text(j.main.title, 27, y, { font: 'large', color: 'gold' }); y += 17;
    r.text(j.main.step, 14, y, { color: 'cream' }); y += 12;
    for (const line of r.wrap(fillHero(j.main.text, g), 356)) { r.text(line, 14, y); y += 11; }
    y += 4;
    if (j.side.length) { drawDivider(r, 10, y, 364); y += 6; r.text('Errands', 14, y, { color: 'gold' }); y += 12; }
    for (const q of j.side) {
      drawIcon(r, q.done ? 'star' : 'letter', 12, y - 1, { alpha: q.done ? 0.6 : 1 });
      r.text(q.title, 27, y, { color: q.done ? 'dim' : 'cream' });
      if (q.counter) r.text(`${q.counter.label} ${q.counter.value}/${q.counter.max}`, 370, y, { align: 'right', color: q.done ? 'dim' : 'gray' });
      y += 11;
      for (const line of r.wrap(fillHero(q.text, g), 350)) { r.text(line, 27, y, { color: q.done ? 'dim' : 'white' }); y += 11; }
      y += 3;
    }
    if (!j.side.length) { r.text('No errands yet. Talk to the people of Willowmere.', 14, y, { color: 'dim' }); }
    r.popClip();
    this.maxScroll = Math.max(0, Math.ceil((y - 171) / 11));
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
    if (!it.known) { r.text('???', x, 36, { font: 'large', color: 'dim' }); r.text('You have not met this creature.', x, 58, { color: 'dim' }); return; }
    const b = BESTIARY[it.id], d = ENEMIES[it.id], e = it.entry;
    r.text(b.name, x, 35, { font: 'large', color: 'cream' });
    r.text(b.where, x, 52, { color: 'gray' });
    r.text(`Seen ${e.seen}   Defeated ${e.killed}`, 372, 52, { align: 'right', color: 'gray' });
    drawDivider(r, 164, 65, 210);
    r.text('Weak:', x, 70, { color: 'gold' });
    let wx = x + 34;
    const weakKnown = (d ? d.weak : []).filter((t) => e.weak.includes(t));
    const unknown = d ? d.weak.length - weakKnown.length : 0;
    for (const t of weakKnown) { drawIcon(r, WEAK_ICON[t] || t, wx, 68); wx += 14; }
    for (let i = 0; i < unknown; i++) { drawIcon(r, 'weak_unknown', wx, 68); wx += 15; }
    if (d && d.resist && d.resist.length) {
      r.text('Resists:', wx + 6, 70, { color: 'gold' }); wx += 6 + r.measure('Resists:') + 4;
      for (const t of d.resist) { drawIcon(r, WEAK_ICON[t] || t, wx, 68, { alpha: e.resist.includes(t) ? 1 : 0.35 }); wx += 14; }
    }
    if (d) r.text(`Lv ${d.level}   HP ${e.killed ? d.hp : '???'}   Shields ${d.shields}`, x, 82, { color: 'gray' });
    let y = 96;
    const lore = e.killed ? b.lore : b.lore.slice(0, 1);
    for (const para of lore) {
      for (const line of r.wrap(para, 204)) { r.text(line, x, y, { color: 'white' }); y += 11; }
      y += 3;
      if (y > 170) break;
    }
    if (!e.killed) r.text('Defeat one to read more.', x, 168, { color: 'dim' });
  }
  draw(r) {
    drawWindow(r, 4, 4, 376, 24);
    drawTabs(r, TABS, this.tab, 4, 10, 376);
    if (this.tab === 0) this.drawQuests(r); else this.drawBestiary(r);
    drawHelpBar(r, this.tab === 0 ? HELP.menu.journal : HELP.menu.bestiary, { right: TABS[this.tab] });
  }
  debugState() { return { screen: 'journal', tab: this.tab, beast: this.beasts.item ? this.beasts.item.id : null }; }
}
