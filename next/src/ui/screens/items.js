// Items screen: consumables (use on a member) and key items, two tabs.

import { List, rowHeightFor, rowsThatFit } from '../list.js';
import { drawWindow } from '../window.js';
import { drawHelpBar } from '../help.js';
import { MemberPicker, drawTabs } from './common.js';
import { CONSUMABLES, KEY_ITEMS } from '../../data/items.js';
import { useItemOnMember } from '../../game/inventory.js';

const TABS = ['Items', 'Key Items'];

export class ItemsScreen {
  constructor(menu) { this.menu = menu; this.engine = menu.engine; this.g = menu.g; }
  enter() {
    this.tab = 0;
    this.picker = null;
    const rowH = rowHeightFor(this.engine, 12);
    this.list = new List({ x: 10, y: 36, w: 364, rowH, rows: rowsThatFit(138, rowH), columns: 2, items: [], textX: 19 });
    this.refresh(false);
    this.note = null;
  }
  refresh(keep = true) {
    const g = this.g;
    const items = [];
    if (this.tab === 0) {
      const ids = Object.keys(g.items).filter((id) => CONSUMABLES[id] && g.items[id] > 0)
        .sort((a, b) => (CONSUMABLES[a].price || 0) - (CONSUMABLES[b].price || 0));
      for (const id of ids) { const d = CONSUMABLES[id]; items.push({ id, label: d.name, icon: d.icon, right: `x${g.items[id]}`, help: d.desc, disabled: !d.field }); }
    } else {
      for (const id of Object.keys(g.items)) { const d = KEY_ITEMS[id]; if (d) items.push({ id, label: d.name, icon: d.icon, right: d.counted && g.items[id] > 1 ? `x${g.items[id]}` : '', help: d.desc, disabled: false }); }
    }
    this.list.setItems(items, keep);
  }
  get help() {
    if (this.note) return this.note;
    const it = this.list.item;
    if (!it) return this.tab === 0 ? 'You carry nothing.' : 'No key items yet.';
    return it.help || '';
  }
  switchTab(d) {
    this.tab = (this.tab + d + TABS.length) % TABS.length;
    this.list.index = 0; this.list.scroll = 0;
    this.refresh(false);
    this.engine.audio.sfx('cursor');
  }
  update() {
    const { input, audio } = this.engine;
    if (this.note && --this.noteT <= 0) this.note = null;
    if (this.picker) {
      const res = this.picker.update();
      if (res === -1) { this.picker = null; return null; }
      if (res != null) {
        const m = this.picker.members[res];
        const id = this.list.item.id;
        const out = useItemOnMember(this.g, id, m);
        if (!out.ok) { audio.sfx('buzzer'); this.say(out.reason); return null; }
        audio.sfx(out.revived ? 'revive' : out.mp && !out.hp ? 'item_use' : 'heal');
        this.picker.showNumber(res, out.hp ? String(out.hp) : `+${out.mp}`, out.hp ? 'heal' : 'mp');
        this.refresh(true);
        if (!this.list.item || this.list.item.id !== id) { this.picker = null; }
      }
      return null;
    }
    const act = this.list.update(input, audio);
    if (act === 'cancel') return 'back';
    if (act === 'pageL' || act === 'pageR') { this.switchTab(act === 'pageL' ? -1 : 1); return null; }
    if (act === 'confirm') {
      const it = this.list.item;
      if (!it) return null;
      if (this.tab === 1) { this.say(it.help); return null; }
      const d = CONSUMABLES[it.id];
      if (d.savePointOnly) { audio.sfx('buzzer'); this.say('Only at a save point.'); return null; }
      const onlyKo = d.target === 'ko_ally';
      this.picker = new MemberPicker(this.engine, this.g.party, { title: `Use ${d.name} on...`, onlyKo, allowKo: onlyKo, w: 220 });
    }
    return null;
  }
  say(text) { this.note = text; this.noteT = 90; }
  draw(r) {
    drawWindow(r, 4, 4, 376, 24);
    drawTabs(r, TABS, this.tab, 4, 10, 376);
    drawWindow(r, 4, 30, 376, 150);
    this.list.draw(r, { frame: r.frame, cursor: !this.picker, bar: true });
    if (!this.list.items.length) r.text(this.tab === 0 ? 'Nothing here.' : 'No key items.', 192, 98, { align: 'center', color: 'dim' });
    drawHelpBar(r, this.help, { right: TABS[this.tab] });
    if (this.picker) this.picker.draw(r);
  }
  debugState() { return { screen: 'items', tab: this.tab, index: this.list.index, picker: !!this.picker, item: this.list.item ? this.list.item.id : null }; }
}
