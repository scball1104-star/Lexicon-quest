// Field main menu (FF6 / Chrono Trigger): party panel on the left, commands on the right, gold/time box,
// help bar. Sub-screens live in src/ui/screens/*. engine.pushAwait('menu', { page? }) resolves with
// undefined when closed ({ quit: true } is never returned: Quit resets the engine to the title itself).
//
// Touch layout (W4b): command rows grow to 15 px (25 css px on the phone), so the command window reaches
// y 166, the gold/time box sits under it down to the screen bottom (y 212), and the help line moves into
// the bottom of the party panel, which extends to the same edge. Nothing is lost, nothing scrolls.

import { List, rowHeightFor, touchUi } from '../ui/list.js';
import { drawWindow, drawIcon, drawDivider, WindowAnim } from '../ui/window.js';
import { drawHelpBar } from '../ui/help.js';
import { drawMemberRow } from '../ui/party.js';
import { fmtGold, fmtTime, roman } from '../ui/text.js';
import { sayLines } from '../ui/dialog.js';
import { HELP, BANNERS } from '../data/text.js';
import { partyChat } from '../data/quests.js';
import { knownSkills } from '../data/party.js';
import { SKILLS } from '../data/skills.js';
import { hasFlag } from '../game/state.js';
import { ItemsScreen } from '../ui/screens/items.js';
import { SkillsScreen } from '../ui/screens/skills.js';
import { EquipScreen } from '../ui/screens/equip.js';
import { StatusScreen } from '../ui/screens/status.js';
import { JournalScreen } from '../ui/screens/journal.js';

const COMMANDS = [
  { id: 'items', label: 'Items', icon: 'bag' },
  { id: 'tech', label: 'Tech', icon: 'scroll', member: true },
  { id: 'magic', label: 'Magic', icon: 'magic', member: true },
  { id: 'equip', label: 'Equip', icon: 'sword', member: true },
  { id: 'status', label: 'Status', icon: 'star', member: true },
  { id: 'journal', label: 'Journal', icon: 'book' },
  { id: 'talk', label: 'Talk', icon: 'quest' },
  { id: 'config', label: 'Config', icon: 'gear' },
  { id: 'save', label: 'Save', icon: 'quill' },
  { id: 'quit', label: 'Quit', icon: 'flee' },
];

export const PANEL = { x: 4, y: 4, w: 274, h: 178 };
export const CMD = { x: 282, y: 4, w: 98, h: 122 };
export const INFO = { x: 282, y: 130, w: 98, h: 52 };
export const TOUCH_LAYOUT = { PANEL: { x: 4, y: 4, w: 274, h: 208 }, CMD: { x: 282, y: 4, w: 98, h: 162 }, INFO: { x: 282, y: 170, w: 98, h: 42 } };

export class MenuScene {
  constructor(engine) { this.engine = engine; this.name = 'menu'; this.transparent = true; }

  enter(data = {}) {
    const e = this.engine;
    this.g = e.game;
    this.frame = 0;
    this.mode = 'commands';
    this.screen = null;
    this.memberIndex = 0;
    this.pending = null;
    this.anim = new WindowAnim(e);
    this.anim.open(!!data.instant);
    if (!this.g) { this.dead = true; return; }
    this.touch = touchUi(e);
    this.L = this.touch ? TOUCH_LAYOUT : { PANEL, CMD, INFO };
    const magic = this.g.party.some((m) => knownSkills(m).some((id) => SKILLS[id] && SKILLS[id].kind === 'magic'));
    const items = COMMANDS.map((c) => ({ ...c, disabled: c.id === 'magic' && !magic }));
    const { PANEL: P, CMD: C } = this.L;
    this.commands = new List({ x: C.x + 5, y: C.y + 6, w: C.w - 10, rowH: rowHeightFor(e, 11), rows: items.length, items, index: data.index || 0 });
    this.members = new List({ x: P.x + 4, y: P.y + 6, w: P.w - 8, rowH: 57, rows: 3, items: this.g.party.map((m) => ({ id: m.id, label: null })), bar: true, cursorDx: 20, cursorDy: 13 });
    this.members.active = false;
    if (!data.silent) e.audio.sfx('menu_open');
    if (data.page) this.openPage(data.page, data);
  }

  get map() { return this.g ? this.g.map : null; }
  get mapTitle() { const b = BANNERS[this.map]; return b ? b.title : ''; }
  get member() { return this.g.party[this.memberIndex] || this.g.party[0]; }

  openPage(page, data = {}) {
    const cmd = COMMANDS.find((c) => c.id === page);
    if (!cmd) return;
    this.commands.moveTo(COMMANDS.indexOf(cmd), { silent: true });
    if (cmd.member) { this.memberIndex = data.member || 0; this.startScreen(cmd.id); }
    else this.run(cmd.id);
  }

  close(result) {
    const e = this.engine;
    if (this.closing) return;
    this.closing = true;
    e.audio.sfx('menu_close');
    e.pop(result);
  }

  // -------------------------------------------------------------- commands
  run(id) {
    const e = this.engine;
    switch (id) {
      case 'items': this.startScreen('items'); break;
      case 'journal': this.startScreen('journal'); break;
      case 'talk': this.talk(); break;
      case 'config': this.mode = 'busy'; e.pushAwait('config').then(() => { this.mode = 'commands'; }); break;
      case 'save': this.mode = 'busy'; e.pushAwait('loadGame', { mode: 'save' }).then(() => { this.mode = 'commands'; }); break;
      case 'quit': this.quit(); break;
      default: break;
    }
  }

  startScreen(id) {
    const m = this.member;
    const make = { items: () => new ItemsScreen(this), tech: () => new SkillsScreen(this, 'tech'), magic: () => new SkillsScreen(this, 'magic'),
      equip: () => new EquipScreen(this), status: () => new StatusScreen(this), journal: () => new JournalScreen(this) }[id];
    if (!make) return;
    this.screen = make();
    if (this.screen.enter) this.screen.enter(m);
    this.mode = 'screen';
  }

  async talk() {
    const e = this.engine;
    const g = this.g;
    const chat = partyChat((f) => hasFlag(g, f), g.map);
    const boxes = [...chat.lines, ...chat.side, ...chat.banter].map((l) => ({ who: l.who, text: l.text }));
    if (!boxes.length) boxes.push({ who: 'hero', text: '(...)' });
    this.mode = 'busy';
    await sayLines(e, boxes);
    this.mode = 'commands';
  }

  async quit() {
    const e = this.engine;
    this.mode = 'busy';
    const i = await e.pushAwait('choice', { options: ['Return to title', 'Stay'], x: e.renderer.W / 2, y: e.renderer.H / 2, anchor: 'center', cancel: 1 });
    if (i === 0) { e.fadeTo(() => e.reset('title'), { duration: 0.8 }); return; }
    this.mode = 'commands';
  }

  update() {
    const e = this.engine;
    const { input, audio } = e;
    this.frame++;
    if (this.dead) { e.pop(); return; }
    if (this.anim.update() !== 'open') return;
    if (this.mode === 'busy') return;
    if (this.mode === 'screen') {
      const res = this.screen.update();
      if (res === 'back') { this.screen = null; this.mode = this.pending ? 'members' : 'commands'; this.members.active = this.mode === 'members'; }
      return;
    }
    if (this.mode === 'members') {
      const act = this.members.update(input, audio);
      if (act === 'confirm') { this.memberIndex = this.members.index; this.members.active = false; this.startScreen(this.pending); }
      else if (act === 'cancel') { this.members.active = false; this.mode = 'commands'; this.pending = null; }
      return;
    }
    const act = this.commands.update(input, audio);
    if (act === 'confirm') {
      const c = this.commands.item;
      if (c.member) { this.pending = c.id; this.mode = 'members'; this.members.active = true; this.members.moveTo(this.memberIndex); }
      else this.run(c.id);
    } else if (act === 'cancel' || input.pressed('menu')) {
      this.close();
    }
  }

  drawInfo(r) {
    const g = this.g;
    const I = this.L.INFO;
    drawWindow(r, I.x, I.y, I.w, I.h);
    const x = I.x + 8, rx = I.x + I.w - 8;
    const lines = [];
    const letters = ['tess_letter_1_found', 'tess_letter_2_found', 'tess_letter_3_found'].filter((f) => hasFlag(g, f)).length;
    const quest = hasFlag(g, 'tess_quest_started');
    lines.push(['Time', fmtTime(g.playtime)]);
    if (!this.touch || quest) lines.push(quest ? ['Letters', `${letters}/3`] : ['Party', String(g.party.length)]);
    if (!this.touch || !quest) lines.push(['Chapter', roman(g.chapter || 1)]);
    drawIcon(r, 'gold', x, I.y + 5);
    r.text(fmtGold(g.gold), rx, I.y + 6, { align: 'right', color: 'gold' });
    lines.forEach(([k, v], i) => {
      const y = I.y + 18 + i * 11;
      r.text(k, x, y, { color: 'gray' });
      r.text(v, rx, y, { align: 'right' });
    });
  }

  draw(r) {
    const e = this.engine;
    r.withAlpha(0.6, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    if (this.dead || !this.g) return;
    const k = this.anim.k;
    if (this.mode === 'screen' && this.screen) { this.screen.draw(r); return; }
    const { PANEL: P, CMD: C, INFO: I } = this.L;
    drawWindow(r, P.x, P.y, P.w, P.h, { open: k });
    drawWindow(r, C.x, C.y, C.w, C.h, { open: k });
    drawWindow(r, I.x, I.y, I.w, I.h, { open: k });
    const helpText = HELP.menu[this.commands.item.id] || '';
    if (!this.touch) drawHelpBar(r, helpText, { right: this.mapTitle, open: k });
    if (k < 1) return;
    this.g.party.forEach((m, i) => {
      drawMemberRow(r, m, P.x + 8, P.y + 8 + i * 57, { w: P.w - 16, frame: this.frame, divider: i < this.g.party.length - 1 });
    });
    if (this.touch) {
      // Help line inside the panel (the help bar's place is taken by the taller command window).
      const hy = P.y + P.h - 21;
      drawDivider(r, P.x + 6, hy - 4, P.w - 12);
      r.text(helpText, P.x + 8, hy + 3, { color: 'white', width: P.w - 16 - 80 });
      if (this.mapTitle) r.text(this.mapTitle, P.x + P.w - 8, hy + 3, { align: 'right', color: 'gold' });
    }
    if (this.mode === 'members') this.members.draw(r, { frame: this.frame, cursor: true });
    this.commands.draw(r, { frame: this.frame, cursor: this.mode === 'commands', bar: true });
    this.drawInfo(r);
    void e;
  }

  debugState() {
    return { mode: this.mode, command: this.commands ? this.commands.item.id : null, member: this.memberIndex, touch: !!this.touch, rowH: this.commands ? this.commands.rowH : null,
      screen: this.screen ? (this.screen.debugState ? this.screen.debugState() : this.screen.constructor.name) : null };
  }
}

export default MenuScene;
