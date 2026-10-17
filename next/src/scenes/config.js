// Config: volumes, text and battle speed, auto battle, window color (live preview), always run,
// reduce motion, touch controls, scale mode, backdrop. engine.pushAwait('config') resolves on cancel.

import { List } from '../ui/list.js';
import { drawWindow, drawGauge, SCHEMES, SCHEME_NAMES, drawPageArrow } from '../ui/window.js';
import { drawHelpBar } from '../ui/help.js';
import { HELP } from '../data/text.js';

const TEXT_SPEEDS = ['Slow', 'Normal', 'Fast', 'Instant'];
const ONOFF = ['Off', 'On'];

export const ROWS = [
  { key: 'master', label: 'Master volume', kind: 'slider', help: 'Overall loudness.' },
  { key: 'music', label: 'Music', kind: 'slider', help: HELP.config.musicVolume },
  { key: 'sfx', label: 'Sound effects', kind: 'slider', help: HELP.config.sfxVolume },
  { key: 'ambience', label: 'Ambience', kind: 'slider', help: 'Rivers, birds, wind and the Archive hush.' },
  { key: 'textSpeed', label: 'Text speed', kind: 'choice', values: [1, 2, 3, 4], names: TEXT_SPEEDS, help: HELP.config.textSpeed },
  { key: 'battleSpeed', label: 'Battle speed', kind: 'choice', values: [1, 2], names: ['1x', '2x'], help: HELP.config.battleSpeed },
  { key: 'autoBattle', label: 'Auto battle', kind: 'choice', values: [false, true], names: ONOFF, help: HELP.config.autoBattle },
  { key: 'windowColor', label: 'Window color', kind: 'choice', values: SCHEMES, names: SCHEMES.map((s) => SCHEME_NAMES[s]), help: HELP.config.windowColor },
  { key: 'alwaysRun', label: 'Always run', kind: 'choice', values: [false, true], names: ONOFF, help: 'Walk by holding the run button instead.' },
  { key: 'reduceMotion', label: 'Reduce motion', kind: 'choice', values: [false, true], names: ONOFF, help: HELP.config.reduceMotion },
  { key: 'touchControls', label: 'Touch controls', kind: 'choice', values: ['auto', 'on', 'off'], names: ['Auto', 'On', 'Off'], help: HELP.config.touchControls },
  { key: 'scaleMode', label: 'Screen scaling', kind: 'choice', values: ['integer', 'sharp', 'fit'], names: ['Integer', 'Sharp', 'Fit'], help: 'Integer is crispest. Fit fills the screen.' },
];

export class ConfigScene {
  constructor(engine) { this.engine = engine; this.name = 'config'; this.transparent = true; }
  enter() {
    this.frame = 0;
    this.list = new List({ x: 48, y: 30, w: 288, rowH: 12, rows: ROWS.length, items: ROWS.map((row) => ({ id: row.key, label: row.label, row })), textX: 8, confirmSfx: false });
  }
  value(row) { return this.engine.settings[row.key]; }
  change(row, d) {
    const e = this.engine;
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
  update() {
    const e = this.engine;
    const { input, audio } = e;
    this.frame++;
    const act = this.list.update(input, audio);
    if (act === 'cancel') { e.pop(); return; }
    const row = this.list.item.row;
    const d = input.repeatDir();
    if (d === 'left') this.change(row, -1);
    else if (d === 'right' || act === 'confirm') this.change(row, 1);
    // Tap on the value side changes it.
    if (input.pointer.pressed) {
      const rr = this.list.rowRect(this.list.index);
      if (input.tapIn(rr.x + 150, rr.y, rr.w - 150, rr.h)) this.change(row, 1);
    }
  }
  draw(r) {
    r.withAlpha(0.7, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    drawWindow(r, 40, 6, 304, 174);
    r.text('Config', 192, 9, { font: 'large', align: 'center', color: 'cream' });
    this.list.draw(r, { frame: this.frame, bar: true });
    ROWS.forEach((row, i) => {
      const rr = this.list.rowRect(i);
      const vx = rr.x + 150;
      const sel = i === this.list.index;
      if (row.kind === 'slider') {
        const v = this.value(row);
        drawGauge(r, vx + 12, rr.y + 3, 90, v, row.key === 'music' ? 'mp' : row.key === 'ambience' ? 'exp' : 'hp');
        r.text(String(Math.round(v * 10)), rr.x + rr.w - 6, rr.y + 1, { align: 'right', color: sel ? 'white' : 'gray' });
      } else {
        const idx = row.values.indexOf(this.value(row));
        const name = row.names[idx < 0 ? 0 : idx];
        r.text(name, vx + 12, rr.y + 1, { color: sel ? 'white' : 'gray' });
      }
      if (sel) { drawPageArrow(r, 'left', vx + 2, rr.y + 2); drawPageArrow(r, 'right', rr.x + rr.w - 2 - 6 - (row.kind === 'slider' ? 18 : 0), rr.y + 2); }
    });
    drawHelpBar(r, this.list.item.row.help, { right: 'Config' });
  }
  debugState() { return { index: this.list.index, key: this.list.item.id, value: this.value(this.list.item.row) }; }
}

export default ConfigScene;
