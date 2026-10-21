// Dialogue window scene (FF6 / Chrono Trigger): bottom (or top) window with a name tab, a 48x48 portrait,
// typewriter text with per-speaker blips, automatic 3-line pages, the "more" arrow, choices in a small
// window above the box. Transparent + updateBelow so the field keeps animating underneath.
//
//   const i = await engine.pushAwait('dialog', {
//     who: 'mael' | 'hero' | null (narration),   // speaker id: picks the blip voice and a default portrait/name
//     name: 'Elder Mael',                         // display name (optional; default speakerName(who))
//     portrait: 'mael' | null,                    // portraits.json id (optional; default NPCS[who].portrait / party)
//     text: 'Ah, there you are...',               // {hero} and {c:gold}..{/c} supported; auto-wrapped and paged
//     choices: ['Yes', 'No'],                     // optional; shown after the last page; resolves to the index
//     position: 'bottom' | 'top',                 // optional; default: bottom, flipped to the top when the window
//                                                 // would hide the speaker or the hero on the field (see pickPosition)
//     cancel: 1 | false,                          // which choice `cancel` picks (default: the last one)
//     instant: true,                              // show the whole text at once (re-showing a box with choices)
//     boxes: [{ who, name, portrait, text }, ...] // several boxes in one scene (no flicker between them)
//     tail: { x, dir }                            // speech tail tip (screen x) for small bark windows
//   });
//   -> chosen index, or undefined when there were no choices.
//
// Confirm (or a tap on the window) finishes the typewriter, then turns the page, then closes. Cancel acts
// like confirm on plain text and picks the cancel option on choices. Text speed comes from settings
// (1 slow, 2 normal, 3 fast, 4 instant: the whole page appears at once and the blips stay quiet).
// Pages end on word boundaries (text.js paginate + hardBreaks); the per-speaker blip voice is voiceFor(who).
//
// Size and place (W7, CRITIQUE_3 item 1): the window is as tall as its text (1, 2 or 3 lines, never a spare
// fourth: at most DIALOG_MAX_H = 45 px, 21% of the 216 px screen), the name tab sits ABOVE it (below it when the
// window is at the top), and the 48 px portrait is anchored to the screen-side edge of the window and may
// overlap its far edge (FF6 style) instead of making the window taller. The window starts at the bottom and
// flips to the top when the speaker's actor or the hero would be under it (pickPosition, pure, node-tested).

import { drawWindow, drawPortrait, hasPortrait, drawTextMark, WindowAnim } from './window.js';
import { ChoiceBox, popScene } from './choice.js';
import { fillHero, paginate, hardBreaks, charsPerFrame, voiceFor } from './text.js';
import { speakerName, NPCS } from '../data/npcs.js';

export const DIALOG_ROWS = 3;
export const DIALOG_PAD_TOP = 7;       // text starts 7 px under the window's top edge (the name tab overlaps 4)
export const DIALOG_PAD_BOT = 5;       // plus the line box, so the ink keeps about 6 to 7 px below it
export const DIALOG_LINE_H = 11;
/** Height of a window with `lines` text lines. */
export function dialogHeight(lines) { return DIALOG_PAD_TOP + Math.max(1, lines) * DIALOG_LINE_H + DIALOG_PAD_BOT; }
export const DIALOG_MAX_H = dialogHeight(DIALOG_ROWS);
export const DIALOG_RECT = { x: 6, y: 216 - 4 - DIALOG_MAX_H, w: 372, h: DIALOG_MAX_H };
export const DIALOG_TOP_Y = 6;
const SCREEN_H = 216;
const BOTTOM_MARGIN = 4;
const TAB_RISE = 13;                    // how far the name tab stands above (or below) the window
const PORTRAIT_BOX = 52;                // 48 px portrait plus its thin frame

/**
 * Where the window goes. `bottomTop` / `topBottom` are the screen y spans the bottom and the top window would
 * cover (with a 2 px margin); `actors` are [{ top, bottom }] screen spans (the speaker, the hero) that must stay
 * visible. Returns 'bottom' or 'top': `prefer` unless it hides an actor and the other side does not; when both
 * hide something, the side hiding fewer wins.
 */
export function pickPosition(hBox, actors, prefer = 'bottom', o = {}) {
  const H = o.H || SCREEN_H;
  const spans = {
    bottom: [H - BOTTOM_MARGIN - hBox - 2, H],
    top: [0, (o.topY ?? DIALOG_TOP_Y) + hBox + 2],
  };
  const hides = (side, a) => a && a.bottom > spans[side][0] && a.top < spans[side][1];
  const hidden = (side) => actors.filter((a) => hides(side, a)).length;
  const other = prefer === 'bottom' ? 'top' : 'bottom';
  const hp = hidden(prefer);
  if (hp === 0) return prefer;
  const ho = hidden(other);
  if (ho < hp) return other;
  // W11 (CRITIQUE_4 item 11): a tie keeps the ADDRESSED actor (the one spoken to, not the speaker whose portrait is
  // in the window) in view: the window goes to the side that does not cover them.
  if (ho === hp) {
    const addressed = actors.find((a) => a && a.addressed);
    if (addressed && hides(prefer, addressed) && !hides(other, addressed)) return other;
  }
  return prefer;
}

let lastClosed = { frame: -100, text: null, who: null };

/** Resolve the portrait id for a speaker: explicit > party member > NPCS[who].portrait (when the art exists). */
export function portraitFor(r, who, explicit) {
  if (explicit === null) return null;
  if (explicit && hasPortrait(r, explicit)) return explicit;
  if (!who) return null;
  if (hasPortrait(r, who)) return who;
  const npc = NPCS[who];
  if (npc && npc.portrait && hasPortrait(r, npc.portrait)) return npc.portrait;
  return null;
}

export class DialogScene {
  constructor(engine) {
    this.engine = engine;
    this.transparent = true;
    this.updateBelow = true;
    this.name = 'dialog';
  }

  enter(data = {}) {
    const e = this.engine;
    this.boxes = Array.isArray(data.boxes) && data.boxes.length ? data.boxes.map((b) => ({ ...data, ...b, boxes: undefined, choices: b.choices })) : [data];
    this.boxIndex = 0;
    this.result = undefined;
    this.frame = 0;
    this.anim = new WindowAnim(e);
    const chained = e.frame - lastClosed.frame <= 3;
    this.anim.open(chained || !!data.instant);
    this._load(this.boxes[0], chained || !!data.instant);
  }

  _load(box, instant = false) {
    const e = this.engine, r = e.renderer;
    this.box = box;
    this.who = box.who ?? null;
    this.text = fillHero(box.text || '', e.game);
    const nameSrc = box.name != null ? box.name : (this.who ? speakerName(this.who) : '');
    this.speaker = fillHero(nameSrc, e.game);
    this.portrait = portraitFor(r, this.who, box.portrait);
    this.voice = box.voice !== undefined ? box.voice : (box.name && !this.who ? 'mid' : voiceFor(this.who));
    const textX = this.portrait ? 64 : 12;
    this.textW = (box.w || DIALOG_RECT.w) - textX - 14;
    // Lines break on word boundaries (the font wrapper only cuts a word longer than the whole line) and a
    // page never ends on such a cut, so the typewriter may stop mid-word only while it is still typing.
    const lines = r.wrap(this.text, this.textW);
    this.pages = paginate(lines, box.rows || DIALOG_ROWS, { hard: hardBreaks(this.text, lines) });
    // The window is as tall as the longest page of this box (a portrait asks for two lines so it is not
    // taller than the window), and it is placed after that: bottom, or top when it would hide someone.
    const most = this.pages.reduce((m, p) => Math.max(m, p.length), 1);
    this.lines = Math.min(box.rows || DIALOG_ROWS, Math.max(most, this.portrait ? 2 : 1));
    this.position = this._pickPosition(box, dialogHeight(this.lines));
    const rect = this.rect = this._layout(box, dialogHeight(this.lines));
    this.textX = rect.x + textX;
    this.page = 0;
    this.choices = Array.isArray(box.choices) && box.choices.length ? box.choices : null;
    this.choiceBox = null;
    this._startPage(instant || !!box.instant);
  }

  /** The field scene under this dialog (and any chained dialog / choice), or null. */
  _fieldBelow() {
    const stack = this.engine.scenes || [];
    let i = stack.indexOf(this) - 1;
    while (i >= 0 && (stack[i].name === 'dialog' || stack[i].name === 'choice')) i--;
    const f = i >= 0 ? stack[i] : null;
    return f && f.name === 'field' ? f : null;
  }

  /** Screen spans (top, bottom) of the speaker's actor and the hero, when the field is the scene underneath. */
  _actorSpans() {
    const e = this.engine;
    const stack = e.scenes;
    let i = stack.indexOf(this) - 1;
    while (i >= 0 && (stack[i].name === 'dialog' || stack[i].name === 'choice')) i--;
    const field = i >= 0 ? stack[i] : null;
    if (!field || field.name !== 'field' || !field.camera || typeof field.actorById !== 'function') return [];
    const find = (id) => { try { return id ? field.actorById(id) : null; } catch { return null; } };
    const cands = [];
    const speaker = find(this.who);
    if (speaker) cands.push(speaker);
    else if (Array.isArray(field.actors)) { const t = field.actors.find((a) => a && a.talking); if (t) cands.push(t); }
    if (field.leader && !cands.includes(field.leader)) cands.push(field.leader);
    const out = [];
    for (const a of cands) {
      if (!a || a.visible === false || a.dead) continue;
      const [sx, sy] = field.camera.toScreen(a.feetX, a.feetY);
      if (sx < -8 || sx > e.renderer.W + 8) continue;
      // the leader, when someone else speaks, is the one spoken to
      out.push({ top: sy - ((a.spr && a.spr.h) || 20) + 2, bottom: sy + 2, addressed: a === field.leader && a !== speaker });
    }
    return out;
  }

  _pickPosition(box, h) {
    if (box.position === 'top' || box.position === 'bottom') return box.position;
    if (box.rect || box.y != null) return 'bottom';
    // W11: a close-up insert (world/closeup.js) holds the top and middle of the screen; the window stays below it.
    if (this._fieldBelow() && this._fieldBelow().closeup && this._fieldBelow().closeup.isOpen) return 'bottom';
    const prefer = this.position || 'bottom';
    return pickPosition(h, this._actorSpans(), prefer, { H: this.engine.renderer.H });
  }

  _layout(box, h) {
    const r = this.engine.renderer;
    if (box.rect) return { ...box.rect };
    const w = box.w || DIALOG_RECT.w;
    h = box.h || h;
    const x = box.x ?? Math.round((r.W - w) / 2);
    const y = box.y ?? (this.position === 'top' ? DIALOG_TOP_Y : r.H - h - BOTTOM_MARGIN);
    return { x, y, w, h };
  }

  _startPage(instant) {
    const font = this.engine.renderer.font();
    this.pageText = this.pages[this.page].join('\n');
    this.total = font.length(this.pageText);
    this.shown = instant ? this.total : 0;
    this.blipCount = 0;
    this.blipEvery = 2;
    this.holdFrames = 0;
  }

  get typing() { return this.shown < this.total; }
  get lastPage() { return this.page >= this.pages.length - 1; }

  _advancePressed() {
    const { input } = this.engine;
    const rect = this.rect;
    return input.pressed('confirm') || input.pressed('cancel') || input.tapIn(rect.x, rect.y, rect.w, rect.h) || input.tapIn(0, 0, this.engine.renderer.W, this.engine.renderer.H);
  }

  update() {
    const e = this.engine;
    const { input, audio, settings } = e;
    this.frame++;
    if (this.anim.update() !== 'open') return;

    if (this.choiceBox) {
      const res = this.choiceBox.update();
      if (res != null) this._finish(res < 0 ? undefined : res);
      return;
    }

    if (this.typing) {
      const speed = charsPerFrame(settings.textSpeed);
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.total, this.shown + speed);
      const after = Math.floor(this.shown);
      if (after > before && this.voice && speed < 50) {
        // Blip every 2 to 3 visible non-space characters.
        const visible = this._charsBetween(before, after);
        this.blipCount += visible;
        if (this.blipCount >= this.blipEvery) { this.blipCount = 0; this.blipEvery = this.blipEvery === 2 ? 3 : 2; audio.sfx('text_blip_' + this.voice); }
      }
      if (this.typing) {
        // Still typing after this frame's characters: a press skips to the full page.
        if (this._advancePressed()) { this.shown = this.total; input.consume('confirm'); input.consume('cancel'); }
        return;
      }
      // The page completed on this frame (instant text): fall through so a press advances at once.
      if (this.lastPage && this.choices) { this._openChoices(); return; }
    }

    if (this.lastPage && this.choices && !this.choiceBox) { this._openChoices(); return; }

    if (this._advancePressed()) {
      input.consume('confirm'); input.consume('cancel');
      if (!this.lastPage) { this.page++; this._startPage(false); return; }
      if (this.boxIndex < this.boxes.length - 1) { this.boxIndex++; this._load(this.boxes[this.boxIndex], false); return; }
      this._finish(undefined);
    }
  }

  _charsBetween(a, b) {
    // Count non-space visible characters in [a, b) of the page text (codes excluded by the font's length()).
    let n = 0, seen = 0;
    const s = this.pageText;
    for (let i = 0; i < s.length && seen < b; i++) {
      const ch = s[i];
      if (ch === '{') { const j = s.indexOf('}', i); if (j > 0 && /^\{(c:[^}]+|\/c|i:[^}]+)\}$/.test(s.slice(i, j + 1))) { if (s[i + 1] === 'i') { seen++; } i = j; continue; } }
      if (ch === '\n') continue;
      if (seen >= a && ch !== ' ') n++;
      seen++;
    }
    return n;
  }

  _openChoices() {
    const r = this.engine.renderer;
    const rect = this.rect;
    const opts = { anchor: this.position === 'top' ? 'top-right' : 'bottom-right', cancel: this.box.cancel, scheme: this.box.scheme };
    const x = rect.x + rect.w - 4;
    const y = this.position === 'top' ? rect.y + rect.h + 2 : rect.y - 2;
    this.choiceBox = new ChoiceBox(this.engine, this.choices, { ...opts, x, y, field: true, index: this.box.index || 0 });
    void r;
  }

  _finish(result) {
    lastClosed = { frame: this.engine.frame, text: this.text, who: this.who };
    popScene(this.engine, this, result);
  }

  draw(r) {
    const k = this.anim.k;
    const rect = this.rect;
    const box = this.box;
    const field = box.field !== false;
    const tail = box.tail ? { x: box.tail.x, dir: box.tail.dir || (this.position === 'top' ? 'down' : 'up') } : null;
    // A window at the top is opaque: the map banner and the sky behind it would bleed through the 8 % of a field window.
    drawWindow(r, rect.x, rect.y, rect.w, rect.h, { field, scheme: box.scheme, open: k, tail, alpha: this.position === 'top' && !box.tail ? 1 : undefined });
    if (k < 1) return;
    if (this.portrait) {
      // Anchored to the screen-side edge of the window, overlapping the far edge instead of stretching the window.
      const py = this.position === 'top' ? rect.y + 4 : rect.y + rect.h - 3 - PORTRAIT_BOX;
      drawPortrait(r, this.portrait, rect.x + 6, py, 48, { scheme: box.scheme });
    }
    if (this.speaker) {
      const nw = r.measure(this.speaker) + 14;
      const nx = rect.x + (this.portrait ? 62 : 10);
      const ny = this.position === 'top' ? rect.y + rect.h - 4 : rect.y - TAB_RISE;
      drawWindow(r, nx, ny, nw, 17, { kind: 'thin', scheme: box.scheme });
      r.text(this.speaker, nx + 7, ny + 3, { color: 'gold' });
    }
    r.text(this.pageText, this.textX, rect.y + DIALOG_PAD_TOP, { chars: Math.floor(this.shown), width: this.textW });
    if (!this.typing && !this.choiceBox) {
      const more = !this.lastPage || this.boxIndex < this.boxes.length - 1;
      drawTextMark(r, more ? 'more' : 'end', rect.x + rect.w - 14, rect.y + rect.h - 13, { frame: this.frame });
    }
    if (this.choiceBox) this.choiceBox.draw(r);
  }

  /** True once the window is open and the current page is fully typed (qa/shots.py waits for this). */
  get done() { return this.anim.isOpen && !this.typing; }

  debugState() {
    return { who: this.who, speaker: this.speaker, portrait: this.portrait, position: this.position, rect: { ...this.rect }, lines: this.lines, page: this.page, pages: this.pages.length, shown: Math.floor(this.shown), total: this.total,
      typing: this.typing, done: this.done, choices: this.choices, choiceIndex: this.choiceBox ? this.choiceBox.index : null, box: this.boxIndex, boxes: this.boxes.length };
  }
}

/** Show one box. Resolves to the choice index (or undefined). */
export function say(engine, data) { return engine.pushAwait('dialog', data); }

/** Show a run of boxes ([{ who, text, portrait?, name? }]) in one dialog scene. */
export function sayLines(engine, lines, extra = {}) {
  const boxes = (lines || []).map((l) => (typeof l === 'string' ? { text: l } : l));
  if (!boxes.length) return Promise.resolve(undefined);
  return engine.pushAwait('dialog', { ...extra, boxes });
}

export default DialogScene;
