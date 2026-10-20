// Shop: engine.pushAwait('shop', { shopId }) -> resolves when the player leaves. Buy / Sell / Leave,
// quantity picker, per-member "can equip" and stat-delta hints, buy / coin sounds, keeper line.
// Touch: stock rows grow to rowHeightFor() and scroll; in the quantity picker a tap on the left / right
// arrow steps the count, a tap elsewhere in the window confirms, a tap outside it cancels.

import { List, rowHeightFor, rowsThatFit } from '../ui/list.js';
import { drawWindow, drawIcon, drawPortrait, drawDelta, drawDivider, drawPageArrow } from '../ui/window.js';
import { drawHelpBar } from '../ui/help.js';
import { fmtGold } from '../ui/text.js';
import { SHOPS, shopStock } from '../data/shops.js';
import { NPCS } from '../data/npcs.js';
import { ITEMS, CONSUMABLES } from '../data/items.js';
import { equipDelta } from '../battle/rules.js';
import { count, hasFlag } from '../game/state.js';
import { buyItem, sellables, sellConsumable, sellGear, fits, weaponTypes, baseOf, itemLine } from '../game/inventory.js';

const CMDS = ['Buy', 'Sell', 'Leave'];
const STOCK = { x: 4, y: 32, w: 220, h: 148 };
const QTY = { x: 100, y: 80, w: 184, h: 50, zone: 28 };   // zone: tap target width of each arrow (px)
const LINES = {
  items: ['Take a look. Everything is labeled. Twice.', 'Stocking up? Wise. The road is long.'],
  equipment: ['Steel, leather, and no small talk.', 'Pick it up. Feel the weight. Then decide.'],
  peddler: ['Supplies for the road! Directions are free.', 'Everything a traveler forgets to pack.'],
};

export class ShopScene {
  constructor(engine) { this.engine = engine; this.name = 'shop'; this.transparent = true; }
  enter(data = {}) {
    const e = this.engine;
    this.g = e.game;
    this.shop = SHOPS[data.shopId] || null;
    this.keeper = Object.entries(NPCS).find(([, n]) => n.service && n.service.type === 'shop' && n.service.id === data.shopId);
    this.keeperId = this.keeper ? this.keeper[0] : null;
    this.keeperName = this.keeper ? this.keeper[1].name : (this.shop ? this.shop.name : 'Shop');
    const kind = this.shop ? (this.shop.id === 'valley_peddler' ? 'peddler' : this.shop.kind) : 'items';
    this.line = (LINES[kind] || LINES.items)[0];
    this.focus = 'cmds';
    this.cmd = 0;
    this.qty = null;
    this.note = null;
    this.frame = 0;
    const rowH = rowHeightFor(e, 12);
    // Rows start 20 px in so the glove (18 px, fingertip 2 px left of the row) sits inside the screen (D7).
    this.list = new List({ x: STOCK.x + 20, y: STOCK.y + 6, w: STOCK.w - 24, rowH, rows: rowsThatFit(STOCK.h - 10, rowH), items: [], textX: 19 });
    this.list.active = false;
    this.refresh(false);
    if (!this.g || !this.shop) { this.dead = true; }
  }
  get mode() { return CMDS[this.cmd].toLowerCase(); }
  refresh(keep = true) {
    const g = this.g;
    if (!g || !this.shop) { this.list.setItems([]); return; }
    let items = [];
    if (this.cmd === 0) {
      items = shopStock(this.shop.id, (f) => hasFlag(g, f)).map((s) => {
        const def = ITEMS[s.item];
        const price = s.price ?? (def ? def.price : 0);
        return { id: s.item, label: def ? def.name : s.item, icon: def ? def.icon : 'bag', right: `${price} G`, rightColor: g.gold >= price ? 'gold' : 'red', price, def, color: def && def.rarity && def.rarity !== 'common' ? def.rarity : 'white' };
      });
    } else if (this.cmd === 1) {
      items = sellables(g).map((s) => ({ id: s.kind === 'gear' ? `uid:${s.uid}` : s.id, label: s.name, icon: s.icon, right: `${s.price} G`, rightColor: 'gold', price: s.price, sell: s,
        color: s.rarity && s.rarity !== 'common' ? s.rarity : 'white', disabled: s.price <= 0 }));
    }
    this.list.setItems(items, keep);
  }
  say(text) { this.note = text; this.noteT = 100; }
  get help() {
    if (this.note) return this.note;
    if (this.focus === 'cmds') return ['Buy supplies and gear.', 'Sell what you do not need.', 'Leave the shop.'][this.cmd];
    const it = this.list.item;
    if (!it) return this.cmd === 0 ? 'Nothing for sale right now.' : 'Nothing to sell.';
    if (this.cmd === 1 && it.sell && it.sell.kind === 'gear') return itemLine(it.sell.item) || (baseOf(it.sell.item) || {}).desc || '';
    const def = it.def || ITEMS[it.id];
    if (!def) return '';
    if (def.kind === 'equipment') return `${itemLine(def.id)}. ${def.desc || ''}`;
    return def.desc || '';
  }
  leave() { this.engine.audio.sfx('cancel'); this.engine.pop(true); }

  update() {
    const e = this.engine;
    const { input, audio } = e;
    this.frame++;
    if (this.dead) { e.pop(false); return; }
    if (this.note && --this.noteT <= 0) this.note = null;
    if (this.qty) { this.updateQty(); return; }
    if (this.focus === 'cmds') {
      const d = input.repeatDir();
      if (d === 'left' || d === 'right') { this.cmd = (this.cmd + (d === 'left' ? -1 : 1) + 3) % 3; audio.sfx('cursor'); this.refresh(false); }
      if (input.pointer.pressed) {
        for (let i = 0; i < 3; i++) if (input.tapIn(12 + i * 46, 8, 44, 16)) { if (this.cmd !== i) { this.cmd = i; audio.sfx('cursor'); this.refresh(false); } else input.inject('confirm', 1); }
      }
      if (input.pressed('confirm')) {
        if (this.cmd === 2) { this.leave(); return; }
        if (!this.list.items.length) { audio.sfx('buzzer'); return; }
        audio.sfx('confirm'); this.focus = 'list'; this.list.active = true;
      } else if (input.pressed('cancel')) this.leave();
      return;
    }
    const act = this.list.update(input, audio);
    if (act === 'cancel') { this.focus = 'cmds'; this.list.active = false; return; }
    if (act === 'confirm') {
      const it = this.list.item;
      if (this.cmd === 0) {
        if (this.g.gold < it.price) { audio.sfx('buzzer'); this.say('Not enough gold.'); return; }
        if (it.def && it.def.kind === 'consumable') this.qty = { item: it, n: 1, max: Math.min(99 - count(this.g, it.id), Math.floor(this.g.gold / Math.max(1, it.price))) };
        else this.buy(it, 1);
      } else {
        const s = it.sell;
        if (s.kind === 'consumable') this.qty = { item: it, n: 1, max: s.qty, sell: true };
        else { const gold = sellGear(this.g, s.uid); audio.sfx('coin'); this.say(`Sold ${s.name} for ${gold} gold.`); this.refresh(true); }
      }
    }
  }
  buy(it, n) {
    const { audio } = this.engine;
    const out = buyItem(this.g, it.id, n, it.price);
    if (!out.ok) { audio.sfx('buzzer'); this.say(out.reason); return; }
    audio.sfx('buy');
    this.say(`Bought ${it.label}${n > 1 ? ` x${n}` : ''} for ${out.cost} gold.`);
    this.refresh(true);
  }
  updateQty() {
    const { input, audio } = this.engine;
    const q = this.qty;
    const d = input.repeatDir();
    if (d === 'left') { if (q.n > 1) { q.n--; audio.sfx('cursor'); } else audio.sfx('buzzer'); }
    if (d === 'right') { if (q.n < q.max) { q.n++; audio.sfx('cursor'); } else audio.sfx('buzzer'); }
    if (d === 'up') { q.n = Math.min(q.max, q.n + 10); audio.sfx('cursor'); }
    if (d === 'down') { q.n = Math.max(1, q.n - 10); audio.sfx('cursor'); }
    if (input.pressed('cancel')) { audio.sfx('cancel'); this.qty = null; return; }
    const { x, y, w, h, zone } = QTY;
    if (input.pointer.pressed) {
      if (input.tapIn(x + w - 2 * zone - 8, y + 10, zone, h - 14)) { if (q.n > 1) { q.n--; audio.sfx('cursor'); } else audio.sfx('buzzer'); return; }
      if (input.tapIn(x + w - zone - 4, y + 10, zone + 4, h - 14)) { if (q.n < q.max) { q.n++; audio.sfx('cursor'); } else audio.sfx('buzzer'); return; }
      if (!input.tapIn(x, y, w, h)) { audio.sfx('cancel'); this.qty = null; return; }
    }
    if (input.pressed('confirm') || input.tapIn(x, y, w, h)) {
      if (q.max < 1) { audio.sfx('buzzer'); this.qty = null; return; }
      if (q.sell) { const gold = sellConsumable(this.g, q.item.id, q.n); audio.sfx('coin'); this.say(`Sold ${q.item.label} x${q.n} for ${gold} gold.`); }
      else this.buy(q.item, q.n);
      this.qty = null;
      this.refresh(true);
    }
  }

  drawInfo(r) {
    const x = 228, y = 32, w = 152, h = 148;
    drawWindow(r, x, y, w, h);
    const it = this.list.item;
    if (this.focus !== 'list' || !it) {
      r.text(this.cmd === 0 ? 'Browse the wares.' : this.cmd === 1 ? 'Pick something to sell.' : 'Safe travels.', x + 8, y + 6, { color: 'gray', width: w - 16 });
      return;
    }
    const def = this.cmd === 0 ? (it.def || ITEMS[it.id]) : (it.sell.kind === 'gear' ? baseOf(it.sell.item) : CONSUMABLES[it.sell.id]);
    const inst = this.cmd === 1 && it.sell.kind === 'gear' ? it.sell.item : (def ? def.id : null);
    r.text(it.label, x + 8, y + 6, { color: it.color || 'white', width: w - 16 });
    const have = def && def.kind === 'consumable' ? count(this.g, def.id) : null;
    if (have != null) r.text(`Have ${have}`, x + w - 8, y + 6, { align: 'right', color: 'gray' });
    let yy = y + 18;
    for (const line of r.wrap(def ? (def.desc || '') : '', w - 16).slice(0, 2)) { r.text(line, x + 8, yy, { color: 'gray' }); yy += 11; }
    if (def && (def.kind === 'equipment' || def.slot)) {
      drawDivider(r, x + 6, yy + 2, w - 12); yy += 8;
      r.text('Who can use it', x + 8, yy, { color: 'gold' }); yy += 12;
      const key = def.slot === 'weapon' ? def.type : def.slot;
      this.g.party.forEach((m, i) => {
        const px = x + 8 + i * 48;
        drawPortrait(r, m.id, px, yy, 32);
        const ok = fits(m, key, inst);
        if (!ok) { r.withAlpha(0.6, () => r.rect(px + 2, yy + 2, 32, 32, '#14101e')); r.text('×', px + 18, yy + 12, { align: 'center', color: 'red' }); return; }
        const d = equipDelta(m, key, inst);
        const stat = def.slot === 'weapon' ? (def.type === 'staff' ? 'mag' : 'atk') : def.slot === 'boots' ? 'spd' : 'def';
        const v = d[stat] || 0;
        const cur = m.equip && m.equip[key];
        const same = cur && baseOf(cur) && baseOf(cur).id === def.id;
        const label = same ? 'worn' : `${v > 0 ? '+' : ''}${v}`;
        r.text(label, px + 15, yy + 38, { align: 'center', color: same ? 'cyan' : v > 0 ? 'green' : v < 0 ? 'red' : 'gray' });
        if (!same) drawDelta(r, v, px + 27, yy + 40);
      });
      r.text(def.slot === 'weapon' ? (def.type === 'staff' ? 'MAG' : 'ATK') : def.slot === 'boots' ? 'SPD' : 'DEF', x + w - 8, yy - 12, { align: 'right', color: 'dim' });
      yy += 52;
      const lines = itemLine(inst);
      if (lines) r.text(lines, x + 8, yy, { color: 'white', width: w - 16 });
    }
    void weaponTypes;
  }

  draw(r) {
    r.withAlpha(0.6, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    if (this.dead) return;
    // Command strip + keeper line.
    drawWindow(r, 4, 4, 150, 24);
    CMDS.forEach((c, i) => {
      const x = 14 + i * 46;
      const sel = i === this.cmd;
      if (sel && this.focus === 'cmds') r.rect(x - 4, 9, 44, 12, '#ffffff22');
      r.text(c, x + 18, 10, { align: 'center', color: sel ? 'white' : 'gray' });
      if (sel) r.rect(x - 2 + 20 - Math.floor(r.measure(c) / 2), 20, r.measure(c), 1, '#f9d77a');
    });
    drawWindow(r, 158, 4, 222, 24);
    r.text(`{c:gold}${this.keeperName}{/c}  ${this.line}`, 166, 10, { width: 206 });
    // Stock list.
    drawWindow(r, STOCK.x, STOCK.y, STOCK.w, STOCK.h);
    this.list.draw(r, { frame: this.frame, cursor: this.focus === 'list' && !this.qty, bar: this.focus === 'list' });
    if (!this.list.items.length) r.text(this.cmd === 0 ? 'Nothing for sale.' : 'Nothing to sell.', 114, 98, { align: 'center', color: 'dim' });
    this.drawInfo(r);
    drawHelpBar(r, this.help, { right: `${fmtGold(this.g.gold)} G` });
    if (this.qty) {
      const q = this.qty;
      const { x, y, w, h, zone } = QTY;
      drawWindow(r, x, y, w, h);
      r.text(q.sell ? 'Sell how many?' : 'Buy how many?', x + 8, y + 6, { color: 'gold' });
      drawIcon(r, q.item.icon, x + 8, y + 20);
      r.text(`${q.item.label}`, x + 24, y + 21);
      // Count with real arrow glyphs (the font has no triangle characters); each arrow has a wide tap zone.
      const cx = x + w - zone - 8;
      drawPageArrow(r, 'left', cx - 14 - 6, y + 23, { alpha: q.n > 1 ? 1 : 0.4 });
      r.text(String(q.n), cx, y + 21, { align: 'center', color: 'white' });
      drawPageArrow(r, 'right', cx + 14, y + 23, { alpha: q.n < q.max ? 1 : 0.4 });
      r.text(`${q.n * q.item.price} G`, x + w - 8, y + 34, { align: 'right', color: 'gold' });
      r.text('Up/Down: 10 at a time', x + 8, y + 34, { color: 'dim' });
    }
  }
  debugState() { return { shop: this.shop ? this.shop.id : null, cmd: CMDS[this.cmd], focus: this.focus, index: this.list.index, item: this.list.item ? this.list.item.id : null, qty: this.qty ? this.qty.n : null, gold: this.g ? this.g.gold : null, rowH: this.list.rowH, rows: this.list.rows }; }
}

export default ShopScene;
