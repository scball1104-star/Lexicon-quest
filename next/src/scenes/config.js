// Config: volumes, text and battle speed, auto battle, window color (live preview), always run,
// reduce motion, touch controls, scale mode, and "Reset to defaults" (asks first). engine.pushAwait('config')
// resolves on cancel. Help lines for Battle speed and Auto battle name their in-battle toggles (one line,
// device-aware button glyphs; the touch layout has no such button, so it says nothing there).
//
// Touch layout: rows grow to rowHeightFor() and the list scrolls (drag or the arrows) when they no longer fit
// the window. A tap on the selected row steps its value forward; a tap on the left arrow steps back; a tap
// inside a slider sets it to that point.

import { List, rowHeightFor, rowsThatFit, touchUi } from '../ui/list.js';
import { drawWindow, drawGauge, SCHEMES, SCHEME_NAMES, drawPageArrow, btn } from '../ui/window.js';
import { drawHelpBar } from '../ui/help.js';
import { HELP } from '../data/text.js';
import { DEFAULT_SETTINGS } from '../core/save.js';

const TEXT_SPEEDS = ['Slow', 'Normal', 'Fast', 'Instant'];
const ONOFF = ['Off', 'On'];
const WIN = { x: 40, y: 6, w: 304, h: 174 };
const LIST_X = 48, LIST_W = 288, VALUE_X = 150, SLIDER_W = 90;

/** Help for a row: a string, or a function of the engine (device-aware wording). */
export function helpFor(row, engine) { return typeof row.help === 'function' ? row.help(engine) : row.help; }

export const ROWS = [
  { key: 'master', label: 'Master volume', kind: 'slider', help: 'Overall loudness.' },
  { key: 'music', label: 'Music', kind: 'slider', help: HELP.config.musicVolume },
  { key: 'sfx', label: 'Sound effects', kind: 'slider', help: HELP.config.sfxVolume },
  { key: 'ambience', label: 'Ambience', kind: 'slider', help: 'Rivers, birds, wind and the Archive hush.' },
  { key: 'textSpeed', label: 'Text speed', kind: 'choice', values: [1, 2, 3, 4], names: TEXT_SPEEDS, help: 'How quickly dialogue appears. Instant shows it all.' },
  { key: 'battleSpeed', label: 'Battle speed', kind: 'choice', values: [1, 2], names: ['1x', '2x'],
    help: (e) => (touchUi(e) ? 'How fast battle plays.' : `How fast battle plays. In battle: ${btn('pageR')} toggles.`) },
  { key: 'autoBattle', label: 'Auto battle', kind: 'choice', values: [false, true], names: ONOFF,
    help: (e) => (touchUi(e) ? 'The party fights on its own.' : `The party fights on its own. In battle: ${btn('start')}.`) },
  { key: 'equipPrompts', label: 'Equip prompts', kind: 'choice', values: [false, true], names: ONOFF, help: 'Offer to wear better gear as it is found.' },
  { key: 'windowColor', label: 'Window color', kind: 'choice', values: SCHEMES, names: SCHEMES.map((s) => SCHEME_NAMES[s]), help: HELP.config.windowColor },
  { key: 'alwaysRun', label: 'Always run', kind: 'choice', values: [false, true], names: ONOFF, help: 'Walk by holding the run button instead.' },
  { key: 'reduceMotion', label: 'Reduce motion', kind: 'choice', values: [false, true], names: ONOFF, help: HELP.config.reduceMotion },
  { key: 'touchControls', label: 'Touch controls', kind: 'choice', values: ['auto', 'on', 'off'], names: ['Auto', 'On', 'Off'], help: HELP.config.touchControls },
  { key: 'scaleMode', label: 'Screen scaling', kind: 'choice', values: ['integer', 'sharp', 'fit'], names: ['Integer', 'Sharp', 'Fit'], help: 'Integer is crispest. Fit fills the screen.' },
  { key: 'reset', label: 'Reset to defaults', kind: 'action', help: 'Put every setting back the way it shipped.' },
];

/** The settings keys the Config screen edits (every non-action row). */
export const SETTING_KEYS = ROWS.filter((r) => r.kind !== 'action').map((r) => r.key);

export class ConfigScene {
  constructor(engine) { this.engine = engine; this.name = 'config'; this.transparent = true; }
  enter() {
    const e = this.engine;
    this.frame = 0;
    this.busy = false;
    this.note = null; this.noteT = 0;
    const rowH = rowHeightFor(e, 11);
    const listY = rowH > 12 ? 32 : 30;
    const rows = Math.min(ROWS.length, rowsThatFit(WIN.y + WIN.h - 6 - listY, rowH));
    this.list = new List({ x: LIST_X, y: listY, w: LIST_W, rowH, rows, items: ROWS.map((row) => ({ id: row.key, label: row.label, row, color: row.kind === 'action' ? 'cream' : 'white' })), textX: 8, confirmSfx: false });
  }
  value(row) { return this.engine.settings[row.key]; }
  change(row, d) {
    const e = this.engine;
    if (row.kind === 'action') return;
    if (row.kind === 'slider') {
      const v = Math.max(0, Math.min(1, Math.round((this.value(row) * 10 + d)) / 10));
      if (v === this.value(row)) { e.audio.sfx('buzzer'); return; }
      e.setSetting(row.key, v);
      e.audio.sfx(row.key === 'music' ? 'cursor' : 'confirm');
      return;
    }
    const i = row.values.indexOf(this.value(row));
    const n = row.values.length;
    const ni = ((i < 0 ? 0 : i) + d + n) % n;
    e.setSetting(row.key, row.values[ni]);
    e.audio.sfx(row.key === 'windowColor' ? 'equip' : 'cursor');
  }
  setSlider(row, v) {
    const e = this.engine;
    v = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
    if (v === this.value(row)) return;
    e.setSetting(row.key, v);
    e.audio.sfx(row.key === 'music' ? 'cursor' : 'confirm');
  }
  /** Reset every setting the screen edits to DEFAULT_SETTINGS (after a confirmation choice). */
  async reset() {
    const e = this.engine;
    this.busy = true;
    const i = await e.pushAwait('choice', { options: ['Reset', 'Keep mine'], x: e.renderer.W / 2, y: e.renderer.H / 2, anchor: 'center', cancel: 1, dim: true });
    this.busy = false;
    if (i !== 0) return;
    for (const key of SETTING_KEYS) if (key in DEFAULT_SETTINGS) e.setSetting(key, DEFAULT_SETTINGS[key]);
    e.audio.sfx('equip');
    this.note = 'Settings are back to their defaults.'; this.noteT = 120;
  }
  update() {
    const e = this.engine;
    const { input, audio } = e;
    this.frame++;
    if (this.busy) return;
    if (this.note && --this.noteT <= 0) this.note = null;
    const act = this.list.update(input, audio);
    if (act === 'cancel') { e.pop(); return; }
    const row = this.list.item.row;
    const rr = this.list.rowRect(this.list.index);
    const d = input.repeatDir();
    if (row.kind === 'action') {
      if (act === 'confirm') { audio.sfx('confirm'); this.reset(); }
      else if (d === 'left' || d === 'right') audio.sfx('buzzer');
      return;
    }
    if (d === 'left') this.change(row, -1);
    else if (d === 'right') this.change(row, 1);
    else if (act === 'confirm') {
      // A tap on the selected row: the left arrow steps back, a slider jumps to the tapped point, anything
      // else (label, value, right arrow) steps forward.
      const p = input.pointer;
      const tapped = p && p.released && p.x >= rr.x && p.x < rr.x + rr.w && p.y >= rr.y && p.y < rr.y + rr.h;
      const vx = rr.x + VALUE_X;
      if (tapped && row.kind === 'slider' && p.x >= vx + 12 && p.x < vx + 12 + SLIDER_W) this.setSlider(row, (p.x - (vx + 12) + 1) / SLIDER_W);
      else if (tapped && p.x >= vx - 6 && p.x < vx + 12) this.change(row, -1);
      else this.change(row, 1);
    }
  }
  draw(r) {
    const e = this.engine;
    r.withAlpha(0.7, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    drawWindow(r, WIN.x, WIN.y, WIN.w, WIN.h);
    r.text('Config', 192, 9, { font: 'large', align: 'center', color: 'cream' });
    this.list.draw(r, { frame: this.frame, bar: true });
    const dy = this.list.textDy;
    ROWS.forEach((row, i) => {
      if (!this.list.isVisible(i)) return;
      const rr = this.list.rowRect(i);
      const vx = rr.x + VALUE_X;
      const sel = i === this.list.index;
      if (row.kind === 'action') return;
      if (row.kind === 'slider') {
        const v = this.value(row);
        drawGauge(r, vx + 12, rr.y + 3 + dy, SLIDER_W, v, row.key === 'music' ? 'mp' : row.key === 'ambience' ? 'exp' : 'hp');
        r.text(String(Math.round(v * 10)), rr.x + rr.w - 6, rr.y + 1 + dy, { align: 'right', color: sel ? 'white' : 'gray' });
      } else {
        const idx = row.values.indexOf(this.value(row));
        const name = row.names[idx < 0 ? 0 : idx];
        r.text(name, vx + 12, rr.y + 1 + dy, { color: sel ? 'white' : 'gray' });
      }
      if (sel) { drawPageArrow(r, 'left', vx + 2, rr.y + 2 + dy); drawPageArrow(r, 'right', rr.x + rr.w - 2 - 6 - (row.kind === 'slider' ? 18 : 0), rr.y + 2 + dy); }
    });
    drawHelpBar(r, this.note || helpFor(this.list.item.row, e), { right: 'Config' });
  }
  debugState() {
    const row = this.list.item.row;
    return { index: this.list.index, key: this.list.item.id, value: row.kind === 'action' ? null : this.value(row), rowH: this.list.rowH, rows: this.list.rows, scroll: this.list.scroll, busy: this.busy };
  }
}

export default ConfigScene;
