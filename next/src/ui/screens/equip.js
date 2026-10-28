// Equip screen: slots on the left (two weapon types, body, head, charm, boots, mantle + Optimize / Remove All),
// candidates on the right with rarity colors, a compare table with green/red deltas, set bonus lines.

import { List, rowHeightFor, rowsThatFit } from '../list.js';
import { drawWindow, drawIcon, drawDelta, drawDivider } from '../window.js';
import { drawHelpBar } from '../help.js';
import { drawMemberHeader } from './common.js';
import { HELP } from '../../data/text.js';
import { SETS } from '../../data/items.js';
import { memberStats, equipDelta } from '../../battle/rules.js';
import { equipKeys, isWeaponKey, equipped, candidates, equipGear, unequip, optimize, removeAll, itemLine, gearName, baseOf } from '../../game/inventory.js';
import { SLOT_ICON, SLOT_NAMES, WEAPON_ICON } from '../party.js';
import { cap } from '../text.js';
import { fitLine } from './journal.js';

const COMPARE = [['atk', 'ATK'], ['def', 'DEF'], ['mag', 'MAG'], ['spr', 'SPR'], ['spd', 'SPD'], ['maxHp', 'HP']];

export class EquipScreen {
  constructor(menu) { this.menu = menu; this.engine = menu.engine; this.g = menu.g; }
  enter(member) {
    this.member = member;
    this.focus = 'slots';
    // Touch rows: the slot list (9 rows) scrolls inside its 112 px window; the candidate list shows 5 rows.
    const slotH = rowHeightFor(this.engine, 11), candH = rowHeightFor(this.engine, 12);
    this.slots = new List({ x: 24, y: 56, w: 138, rowH: slotH, rows: Math.min(9, rowsThatFit(104, slotH)), items: [], iconX: 2, textX: 17 });   // x 24: glove inside the screen (D7)
    this.cands = new List({ x: 174, y: 30, w: 200, rowH: candH, rows: rowsThatFit(74, candH), items: [], textX: 19 });
    this.cands.active = false;
    this.note = null;
    this.refreshSlots(false);
  }
  get keys() { return equipKeys(this.member); }
  keyLabel(key) { return isWeaponKey(this.member, key) ? cap(key) : SLOT_NAMES[key] || cap(key); }
  keyIcon(key) { return isWeaponKey(this.member, key) ? WEAPON_ICON[key] : SLOT_ICON[key]; }

  refreshSlots(keep = true) {
    const m = this.member;
    const items = this.keys.map((key) => {
      const it = equipped(m, key);
      return { id: key, key, label: it ? fitLine(this.engine.renderer, gearName(it), 118) : '(none)', icon: this.keyIcon(key), color: it ? (it.rarity || 'common') : 'dim', item: it,
        help: isWeaponKey(m, key) ? (m.weapon === key ? HELP.equip.weapon : 'Second weapon. Swap to it in battle.') : HELP.equip[key] || '' };
    });
    items.push({ id: 'optimize', label: 'Optimize', icon: 'star', color: 'cream', help: 'Equip the strongest gear you carry.' });
    items.push({ id: 'remove', label: 'Remove All', icon: 'swap', color: 'cream', help: 'Take everything off.' });
    this.slots.setItems(items, keep);
    this.refreshCands(false);
  }
  refreshCands(keep = true) {
    const sel = this.slots.item;
    if (!sel || !sel.key) { this.cands.setItems([], false); return; }
    const list = candidates(this.g, this.member, sel.key).map((c) => ({ id: c.uid, uid: c.uid, item: c.item, label: gearName(c.item), icon: baseOf(c.item) ? baseOf(c.item).icon : 'bag', color: c.item.rarity || 'common' }));
    if (sel.item) list.unshift({ id: 'remove', label: '(Remove)', icon: 'swap', color: 'gray', remove: true });
    this.cands.setItems(list, keep);
  }
  nextMember(d) {
    const party = this.g.party;
    const i = (party.indexOf(this.member) + d + party.length) % party.length;
    this.member = party[i]; this.menu.memberIndex = i;
    this.focus = 'slots'; this.cands.active = false;
    this.slots.index = 0; this.slots.scroll = 0;
    this.refreshSlots(false);
    this.engine.audio.sfx('cursor');
  }
  say(text) { this.note = text; this.noteT = 100; }
  get help() {
    if (this.note) return this.note;
    if (this.focus === 'cands') {
      const c = this.cands.item;
      if (!c) return 'Nothing you carry fits here.';
      if (c.remove) return 'Unequip this slot.';
      return itemLine(c.item) || (baseOf(c.item) || {}).desc || '';
    }
    const s = this.slots.item;
    return s ? s.help : '';
  }

  update() {
    const { input, audio } = this.engine;
    if (this.note && --this.noteT <= 0) this.note = null;
    if (this.focus === 'slots') {
      const act = this.slots.update(input, audio);
      if (this.slots.changed) this.refreshCands(false);
      if (act === 'cancel') return 'back';
      if (act === 'pageL') { this.nextMember(-1); return null; }
      if (act === 'pageR') { this.nextMember(1); return null; }
      if (act === 'confirm') {
        const s = this.slots.item;
        if (s.id === 'optimize') {
          const n = optimize(this.g, this.member);
          if (n) { audio.sfx('equip'); this.say(`Equipped the best gear (${n} change${n > 1 ? 's' : ''}).`); } else { audio.sfx('buzzer'); this.say('Already wearing the best you carry.'); }
          this.refreshSlots(true); return null;
        }
        if (s.id === 'remove') {
          const n = removeAll(this.g, this.member);
          if (n) { audio.sfx('cancel'); this.say('Everything is off (one weapon stays).'); } else { audio.sfx('buzzer'); this.say('Nothing to remove.'); }
          this.refreshSlots(true); return null;
        }
        if (!this.cands.items.length) { audio.sfx('buzzer'); this.say('Nothing you carry fits here.'); return null; }
        this.focus = 'cands'; this.cands.active = true; this.cands.index = 0; this.cands.scroll = 0;
      }
      return null;
    }
    const act = this.cands.update(input, audio);
    if (act === 'cancel') { this.focus = 'slots'; this.cands.active = false; return null; }
    if (act === 'pageL' || act === 'pageR') return null;
    if (act === 'confirm') {
      const c = this.cands.item;
      const key = this.slots.item.key;
      if (c.remove) {
        const out = unequip(this.g, this.member, key);
        if (!out.ok) { audio.sfx('buzzer'); this.say(out.reason); return null; }
        audio.sfx('cancel');
      } else {
        const out = equipGear(this.g, this.member, key, c.uid);
        if (!out.ok) { audio.sfx('buzzer'); this.say(out.reason); return null; }
        audio.sfx('equip');
        if (isWeaponKey(this.member, key) && !this.member.equip[this.member.weapon]) this.member.weapon = key;
      }
      this.focus = 'slots'; this.cands.active = false;
      this.refreshSlots(true);
    }
    return null;
  }

  drawCompare(r, x, y, w, h) {
    drawWindow(r, x, y, w, h);
    const m = this.member;
    const slot = this.slots.item;
    const c = this.focus === 'cands' ? this.cands.item : null;
    const before = memberStats(m);
    let name = null, color = 'white', line = '', delta = null, item = null;
    if (c && !c.remove) { item = c.item; name = gearName(item); color = item.rarity || 'common'; line = itemLine(item); delta = equipDelta(m, slot.key, item); }
    else if (c && c.remove) { name = '(Remove)'; color = 'gray'; line = 'Nothing in the slot.'; delta = equipDelta(m, slot.key, null); }
    else if (slot && slot.item) { item = slot.item; name = gearName(item); color = item.rarity || 'common'; line = itemLine(item); }
    else if (slot && slot.key) { name = `${this.keyLabel(slot.key)}: empty`; color = 'dim'; line = ''; }
    else { name = slot ? slot.label : ''; color = 'cream'; line = slot ? slot.help : ''; }
    r.text(name || '', x + 8, y + 5, { color });
    const base = item ? baseOf(item) : null;
    const setId = base && base.set;
    let line2 = line || (base ? base.desc : '');
    let line2Color = 'gray';
    if (setId && SETS[setId]) {
      const set = SETS[setId];
      const worn = equipKeys(m).map((k) => equipped(m, k)).filter((it) => it && baseOf(it) && baseOf(it).set === setId).length;
      line2 = `${line ? line + '. ' : ''}${set.name} ${worn}/${set.pieces.length}`;
      line2Color = 'set';
    }
    r.text(line2, x + 8, y + 16, { color: line2Color, width: w - 16 });
    drawDivider(r, x + 6, y + 28, w - 12);
    const colW = Math.floor((w - 16) / 2);
    COMPARE.forEach(([k, label], i) => {
      const cx = x + 8 + (i % 2) * colW, cy = y + 32 + Math.floor(i / 2) * 11;
      const cur = before[k] || 0;
      const d = delta ? (delta[k] || 0) : 0;
      r.text(label, cx, cy, { color: 'gold' });
      r.text(String(cur), cx + 44, cy, { align: 'right' });
      if (delta) {
        drawIcon(r, 'arrow_right', cx + 48, cy + 1);
        const nv = cur + d;
        r.text(String(nv), cx + 78, cy, { align: 'right', color: d > 0 ? 'green' : d < 0 ? 'red' : 'white' });
        drawDelta(r, d, cx + 81, cy + 2);
      }
    });
  }

  draw(r) {
    const m = this.member;
    drawMemberHeader(r, m, 4, 4, 164, 44, { mastery: true });
    drawWindow(r, 4, 50, 164, 112);
    this.slots.draw(r, { frame: r.frame, cursor: this.focus === 'slots', bar: this.focus === 'slots' });
    if (this.slots.isVisible(this.keys.length)) { const divY = this.slots.rowRect(this.keys.length).y - 1; drawDivider(r, 10, divY, 152); }   // the rule spans the window, not the list
    drawWindow(r, 168, 4, 212, 104);
    const slot = this.slots.item;
    const title = slot && slot.key ? (isWeaponKey(m, slot.key) ? `${cap(slot.key)}s` : this.keyLabel(slot.key)) : slot ? slot.label : '';
    r.text(title, 178, 9, { font: 'large', color: 'cream' });
    r.text(`${this.cands.items.filter((c) => !c.remove).length} carried`, 372, 12, { align: 'right', color: 'dim' });
    drawDivider(r, 174, 27, 200);
    this.cands.draw(r, { frame: r.frame, cursor: this.focus === 'cands', bar: this.focus === 'cands' });
    if (!this.cands.items.length && slot && slot.key) r.text('Nothing fits here.', 274, 62, { align: 'center', color: 'dim' });
    this.drawCompare(r, 168, 110, 212, 70);
    drawHelpBar(r, this.help, { right: 'Equip' });
    this.member = m;
  }
  debugState() { return { screen: 'equip', member: this.member.id, focus: this.focus, slot: this.slots.item ? this.slots.item.id : null, cand: this.cands.item ? this.cands.item.label : null }; }
}
