// Battle command menu and targeting (W2-battle-scene), built on W2-ui's List.
//
//   const menu = new CommandMenu(scene);
//   menu.open(unit)                       // b.commands(unit) -> root list (Attack, Tech, Magic, Fury, Combo, Item, Defend, Swap, Flee)
//                                         // laid out in two columns of four (W7): left column first, then the right
//                                         // one; on the touch layout Flee is the FLEE button in the help window
//                                         // (menu.fleeTap: first tap arms, second runs).
//   const action = menu.update(input, audio);   // the chosen action { type, skill|item, target } or null
//   menu.draw(r); menu.close(); menu.state ('closed' | 'root' | 'sub' | 'target'); menu.preview; menu.helpText
//   menu.cmdRect / menu.subRect           // the windows for the current layout (layout.cmdWin / subWin)
//
// Targeting: left/right cycle the targets by x, up/down by y; `all`/`random` highlight every target;
// `self` shows the reticle on the actor. Touch: tap a command row, tap it again to confirm (List's tap model),
// tap a target, tap it again to confirm; rows are TOUCH_ROW_H tall while the touch controls show (W5), so
// the command window grows upward (layout.CMD_WIN_TOUCH) and the sub-list window moves up with it.

import { List, touchUi } from '../../ui/list.js';
import { drawWindow } from '../../ui/window.js';
import { CMD_ROW_H, CMD_ROWS, CMD_COLS, CMD_COL_W, TOUCH_CMD_ROW_H, cmdWin, subWin, cmdRowsFor, unitBox } from './layout.js';

// One short line each (at most 111 px): the help window shares its width with the Auto / Speed hint (W5).
const CMD_HELP = {
  attack: 'Strike with your weapon.', tech: 'Weapon techs. Cost MP.', magic: 'Spells and heals. Cost MP.',
  fury: 'This weapon\'s Fury art.', combo: 'Act with a partner.', item: 'Use an item from the bag.',
  defend: 'Halve damage this turn.', swap: 'Switch weapons.', flee: 'Try to run away.',
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const FLEE_ARM_FRAMES = 72;
const CMD_ICON = { attack: 'sword', tech: 'scroll', magic: 'magic', fury: 'fury', combo: 'combo', item: 'bag', defend: 'shield', swap: 'swap', flee: 'flee' };

export class CommandMenu {
  constructor(scene) {
    this.scene = scene;
    this.state = 'closed';
    this.unit = null;
    this.root = null;
    this.sub = null;
    this.subCmd = null;
    this.base = null;        // action without a target while targeting
    this.tInfo = null;
    this.tIndex = 0;
    this.preview = null;
    this.helpText = '';
    this.helpColor = null;
    this.lastRootIndex = 0;
    this.tapArmed = null;
    this.touch = false;
    this.fleeCmd = null;     // the Flee command while the touch layout keeps it out of the grid
    this.fleeArmed = 0;      // frames left on the FLEE button's "tap again" window
    this.cmdRect = cmdWin(false);
    this.subRect = subWin(false);
  }
  get b() { return this.scene.b; }
  get actors() { return this.scene.actors; }
  get rowH() { return this.touch ? TOUCH_CMD_ROW_H : CMD_ROW_H; }

  /** Pick the window rects for the current layout (called on open; the closed window uses it too). */
  syncLayout() {
    this.touch = touchUi(this.scene.engine);
    this.cmdRect = cmdWin(this.touch);
    this.subRect = subWin(this.touch);
    return this.cmdRect;
  }

  open(unit) {
    this.unit = unit;
    this.state = 'root';
    this.base = null; this.tInfo = null; this.preview = null; this.fleeArmed = 0;
    this.syncLayout();
    // Combo shows only when it is possible; Swap only when this member carries a second weapon (a greyed Swap
    // on the hero, who starts with a sword alone, read as a broken command).
    const all = this.b.commands(unit).filter((c) => (c.id !== 'combo' || c.visible) && (c.id !== 'swap' || c.enabled));
    // Touch: Flee is the FLEE button in the help window, which keeps the grid at four rows (W7).
    this.fleeCmd = this.touch ? all.find((c) => c.id === 'flee') || null : null;
    const cmds = this.touch ? all.filter((c) => c.id !== 'flee') : all;
    const items = cmds.map((c) => ({
      id: c.id, cmd: c, label: c.id === 'swap' ? 'Swap' : (c.label || c.name), disabled: !c.enabled,
      color: c.id === 'fury' && c.enabled ? 'orange' : c.id === 'combo' ? 'cyan' : 'white',
      help: c.id === 'swap' && c.enabled && c.weapon ? `Ready the ${cap(c.weapon)}.` : c.enabled ? CMD_HELP[c.id] : (c.reason || CMD_HELP[c.id]),
      icon: CMD_ICON[c.id] || null,
    }));
    // Two columns of CMD_ROWS (a ninth command on the keyboard / pad grows the window by one row at the top).
    const rows = Math.max(CMD_ROWS, Math.ceil(items.length / CMD_COLS)), rowH = this.rowH;
    const base = cmdWin(this.touch);
    const h = this.touch ? base.h : Math.max(base.h, rows * rowH + 16);
    this.cmdRect = { ...base, y: base.y + base.h - h, h };
    const win = this.cmdRect;
    this.root = new List({ x: win.x + 18, y: win.y + (this.touch ? 4 : 6), w: CMD_COLS * CMD_COL_W, colW: CMD_COL_W, columns: CMD_COLS, columnMajor: true,
      rows, rowH, items, bar: false, textX: 2, icons: false, confirmSfx: false, cancelSfx: false });
    this.root.moveTo(Math.min(this.lastRootIndex, items.length - 1));
    this.showHelp = false;      // the telegraph (if any) owns the help window until the cursor moves
    this.syncHelp();
  }
  /** Touch FLEE button: the first tap arms it, a second within about a second returns the flee action. */
  fleeTap(audio) {
    if (this.state !== 'root' || !this.fleeCmd) return null;
    if (!this.fleeCmd.enabled) { audio.sfx('buzzer'); this.showHelp = true; this.helpText = this.fleeCmd.reason || 'Cannot flee'; this.helpColor = 'dim'; return null; }
    if (this.fleeArmed > 0) { this.fleeArmed = 0; audio.sfx('confirm'); return { type: 'flee' }; }
    this.fleeArmed = FLEE_ARM_FRAMES;
    audio.sfx('cursor');
    this.showHelp = true; this.helpText = 'Tap FLEE again to run.'; this.helpColor = 'gold';
    return null;
  }
  close() { this.fleeArmed = 0; this.state = 'closed'; this.root = null; this.sub = null; this.preview = null; this.tInfo = null; this.base = null; }

  syncHelp() {
    const it = this.state === 'sub' ? this.sub && this.sub.item : this.root && this.root.item;
    this.helpText = it ? (it.help || '') : '';
    this.helpColor = it && it.disabled ? 'dim' : null;
    if (this.state === 'target' && this.tInfo) {
      const t = this.currentTarget();
      const a = t ? this.actors.get(t) : null;
      const label = this.actionLabel();
      const who = this.tInfo.mode === 'all' ? 'everyone' : this.tInfo.mode === 'random' ? 'random foes' : a ? a.name : '';
      this.helpText = `${label}: {c:gold}${who}{/c}`;
      this.helpColor = null;
    }
  }

  actionLabel() {
    if (this.state === 'target' && this.sub && this.sub.item) return this.sub.item.label;
    if (this.root && this.root.item) return this.root.item.label;
    return 'Attack';
  }
  openSub(cmd) {
    const list = (cmd.list || []).map((e) => ({
      id: e.skill || e.item, entry: e, label: e.name, disabled: !e.enabled,
      right: e.skill ? (e.mp ? `${e.mp} MP` : (cmd.id === 'fury' ? 'FURY' : '')) : `x${e.qty}`,
      rightColor: e.skill ? 'blue' : 'gray', help: e.enabled ? e.help : (e.reason || e.help),
      color: cmd.id === 'combo' ? 'cyan' : 'white',
    }));
    if (!list.length) return false;
    this.subCmd = cmd;
    this.showHelp = true;
    const win = this.subRect, rowH = this.rowH;
    this.sub = new List({ x: win.x + 18, y: win.y + 6, w: win.w - 24, rows: cmdRowsFor(win, rowH), rowH, items: list, bar: true,
      textX: 2, icons: false, confirmSfx: false, cancelSfx: false, rightPad: 4 });
    this.state = 'sub';
    this.syncHelp();
    return true;
  }

  // ----------------------------------------------------------------------------- targeting
  startTarget(base) {
    const info = this.b.targets(this.unit, base);
    if (!info || info.mode === 'none' || (!info.ids.length && info.mode !== 'all')) return false;
    this.base = base;
    this.tInfo = info;
    this.tIndex = Math.max(0, info.ids.indexOf(info.default));
    this.state = 'target';
    this.tapArmed = null;
    this.refreshPreview();
    this.syncHelp();
    return true;
  }
  currentTarget() {
    if (!this.tInfo) return null;
    if (this.tInfo.mode === 'single') return this.tInfo.ids[this.tIndex] || null;
    if (this.tInfo.mode === 'self') return this.unit.uid;
    return null;
  }
  currentAction() {
    const t = this.currentTarget();
    return t ? { ...this.base, target: t } : { ...this.base };
  }
  refreshPreview() {
    try { this.preview = this.b.previewTimeline(this.unit, this.currentAction()); }
    catch (e) { this.preview = null; }
  }
  highlightedIds() {
    if (!this.tInfo) return [];
    if (this.tInfo.mode === 'single') { const t = this.currentTarget(); return t ? [t] : []; }
    if (this.tInfo.mode === 'self') return [this.unit.uid];
    return this.tInfo.ids.slice();
  }
  cycleTarget(dir) {
    const ids = this.tInfo.ids;
    if (ids.length < 2) return false;
    const cur = ids[this.tIndex];
    const pos = (uid) => { const a = this.actors.get(uid); return a ? { x: a.x, y: a.y } : { x: 0, y: 0 }; };
    const here = pos(cur);
    const key = dir === 'left' || dir === 'right' ? 'x' : 'y';
    const sign = dir === 'left' || dir === 'up' ? -1 : 1;
    // Nearest unit in that direction; wrap around to the far side when none.
    let best = null, bestD = Infinity, far = null, farD = -Infinity;
    for (let i = 0; i < ids.length; i++) {
      if (i === this.tIndex) continue;
      const p = pos(ids[i]);
      const d = (p[key] - here[key]) * sign;
      const cross = Math.abs(key === 'x' ? p.y - here.y : p.x - here.x);
      if (d > 0 && d + cross * 0.5 < bestD) { best = i; bestD = d + cross * 0.5; }
      if (d <= 0 && -d > farD) { far = i; farD = -d; }
    }
    const next = best != null ? best : far != null ? far : (this.tIndex + 1) % ids.length;
    if (next === this.tIndex) return false;
    this.tIndex = next;
    this.refreshPreview();
    this.syncHelp();
    return true;
  }
  /** Tap hit test over the targetable units (unitBox); returns the uid or null. */
  unitAt(px, py) {
    if (!this.tInfo) return null;
    for (const uid of this.tInfo.ids) {
      const a = this.actors.get(uid);
      if (!a) continue;
      const bx = unitBox(a);
      if (px >= bx.x && px < bx.x + bx.w && py >= bx.y && py < bx.y + bx.h) return uid;
    }
    return null;
  }

  // ----------------------------------------------------------------------------- update
  /** Returns a complete action when the player confirms, else null. */
  update(input, audio) {
    if (this.state === 'closed' || !this.unit) return null;
    if (this.fleeArmed > 0 && --this.fleeArmed === 0) this.syncHelp();
    if (this.state === 'root') {
      const act = this.root.update(input, audio);
      if (this.root.changed) { this.showHelp = true; this.fleeArmed = 0; this.syncHelp(); }
      if (act === 'confirm') {
        const it = this.root.item;
        this.lastRootIndex = this.root.index;
        const c = it.cmd;
        audio.sfx('confirm');
        if (c.id === 'attack') { if (!this.startTarget({ type: 'attack' })) audio.sfx('buzzer'); }
        else if (c.id === 'defend') return { type: 'defend' };
        else if (c.id === 'swap') return { type: 'swap' };
        else if (c.id === 'flee') return { type: 'flee' };
        else if (!this.openSub(c)) audio.sfx('buzzer');
      } else if (act === 'cancel') {
        // Nothing above the root: a cancel here nudges the cursor to Defend (FF habit) without buzzing.
        const i = this.root.items.findIndex((x) => x.id === 'defend');
        if (i >= 0 && this.root.index !== i) { this.root.moveTo(i); audio.sfx('cursor'); this.syncHelp(); }
      }
      return null;
    }
    if (this.state === 'sub') {
      const act = this.sub.update(input, audio);
      if (this.sub.changed) this.syncHelp();
      if (act === 'confirm') {
        const it = this.sub.item;
        const e = it.entry;
        audio.sfx('confirm');
        const base = e.skill ? { type: this.subCmd.id === 'combo' ? 'combo' : 'skill', skill: e.skill } : { type: 'item', item: e.item };
        if (!this.startTarget(base)) audio.sfx('buzzer');
      } else if (act === 'cancel') { audio.sfx('cancel'); this.state = 'root'; this.sub = null; this.syncHelp(); }
      return null;
    }
    if (this.state === 'target') {
      const d = input.repeatDir();
      if (d && this.tInfo.mode === 'single' && this.cycleTarget(d)) audio.sfx('cursor');
      // Touch: tap a unit to select it, tap the selected one to confirm; tap the command window to cancel.
      const p = input.pointer;
      if (p && p.pressed) {
        const hit = this.unitAt(p.x, p.y);
        const win = this.cmdRect;
        if (hit) {
          if (this.tInfo.mode === 'single' && this.tInfo.ids[this.tIndex] !== hit) { this.tIndex = this.tInfo.ids.indexOf(hit); this.refreshPreview(); this.syncHelp(); audio.sfx('cursor'); }
          else { input.consume('confirm'); audio.sfx('confirm'); return this.finish(); }
        } else if (p.x < win.x + win.w && p.y >= win.y) { input.consume('cancel'); audio.sfx('cancel'); this.backFromTarget(); return null; }
      }
      if (input.pressed('confirm')) { input.consume('confirm'); audio.sfx('confirm'); return this.finish(); }
      if (input.pressed('cancel')) { input.consume('cancel'); audio.sfx('cancel'); this.backFromTarget(); }
    }
    return null;
  }
  finish() {
    const action = this.currentAction();
    this.close();
    return action;
  }
  backFromTarget() {
    this.preview = null; this.tInfo = null;
    this.state = this.sub ? 'sub' : 'root';
    this.syncHelp();
  }

  // ----------------------------------------------------------------------------- draw
  draw(r, frame) {
    if (this.state === 'closed' || !this.root) return;
    const win = this.cmdRect;
    drawWindow(r, win.x, win.y, win.w, win.h);
    const rootActive = this.state === 'root';
    this.root.draw(r, { frame, cursor: rootActive, bar: false });
    if (!rootActive && this.root.item) {
      // The chosen command stays marked while its sub-list or target is picked.
      const rr = this.root.rowRect(this.root.index);
      r.text('▶', rr.x - 9, rr.y + 1 + this.root.textDy, { color: 'gold' });
    }
    if (this.state === 'sub' && this.sub) {
      const sw = this.subRect;
      drawWindow(r, sw.x, sw.y, sw.w, sw.h);
      this.sub.draw(r, { frame, cursor: true, bar: true });
    }
  }
}
