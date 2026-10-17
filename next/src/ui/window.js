// FF-style windows and the small UI pieces every scene shares (W2-ui).
//
//   drawWindow(r, x, y, w, h, { scheme, kind: 'std'|'field'|'thin', field, alpha, open: 0..1, tail: { x, dir } })
//   drawTail(r, winRect, tipScreenX, 'down'|'up', { scheme, field, alpha })
//   drawSelBar(r, x, y, w, { scheme, alpha })                 12 px tall selection bar (tinted highlight)
//   drawGauge(r, x, y, w, frac, 'hp'|'mp'|'fury'|'exp'|'atb', { thin, lag, glow })
//   drawLabel(r, 'hp', x, y)                                  tiny gold labels: hp mp fury lv exp next atk def mag spd ready ko
//   drawIcon(r, 'potion', x, y, { alpha })                    12x12 icons (icon_<id>) or any ui frame by name
//   drawIcon16(r, 'sword', x, y)                              16x16 icons (icon16_<id>)
//   drawPortrait(r, 'mira', x, y, 48 | 32, { scheme })        thin frame + portrait; false when the art is missing
//   drawBanner(r, 'Willowmere', cx, y)                        location banner (large font, cream)
//   drawDivider(r, x, y, w, { scheme })                       2 px light/dark rule inside a window
//   new WindowAnim(engine).open() / close() / update() / k    6-frame grow from center (instant under reduceMotion)
//
// Every helper reads the window scheme from r.settings.windowColor unless `scheme` is given, and falls back
// to procedural drawing when assets/ui art is not loaded, so dev scenes and node-less previews never break.

import { parseColor } from '../core/renderer.js';
import { animFrameAt } from '../core/assets.js';
import { ease } from '../core/tween.js';

export const SCHEMES = ['blue', 'crimson', 'forest', 'violet', 'slate', 'ember'];
export const SCHEME_NAMES = { blue: 'Blue', crimson: 'Crimson', forest: 'Forest', violet: 'Violet', slate: 'Slate', ember: 'Ember' };
export const FIELD_ALPHA = 0.92;
export const OPEN_FRAMES = 6;
export const ROW_H = 12;

// Fallback colors (window.json values) so windows look right even before the art loads.
const DEFAULT_COLORS = {
  blue: { top: '#4064b9', mid: '#2c4797', bottom: '#0e153b', highlight: '#6891d9', accent: '#f9d77a' },
  crimson: { top: '#b34532', mid: '#87332e', bottom: '#2d1b1f', highlight: '#eba14d', accent: '#f9d77a' },
  forest: { top: '#397951', mid: '#285743', bottom: '#1b2332', highlight: '#4f9e6e', accent: '#f9d77a' },
  violet: { top: '#7040aa', mid: '#522a84', bottom: '#1a1334', highlight: '#bc94e2', accent: '#f9d77a' },
  slate: { top: '#66637f', mid: '#4c445c', bottom: '#251d34', highlight: '#b3b6c4', accent: '#f9d77a' },
  ember: { top: '#8f5533', mid: '#6e3d2c', bottom: '#2d1b1f', highlight: '#d69c57', accent: '#fff7d6' },
};
const INK = '#14101e';

export function uiAtlas(r) { return r && r.assets && r.assets.has('ui') ? r.assets.atlas('ui') : null; }
export function windowAtlas(r) { return r && r.assets && r.assets.has('window') ? r.assets.atlas('window') : null; }
export function currentScheme(r) {
  const s = r && r.settings && r.settings.windowColor;
  return SCHEMES.includes(s) ? s : 'blue';
}
export function schemeColors(r, scheme) {
  const id = SCHEMES.includes(scheme) ? scheme : currentScheme(r);
  const atlas = windowAtlas(r);
  const fromArt = atlas && atlas.meta && atlas.meta.colors && atlas.meta.colors[id];
  return fromArt || DEFAULT_COLORS[id] || DEFAULT_COLORS.blue;
}

// ---------------------------------------------------------------- gradient fill (top -> mid at 45% -> bottom)
const gradCache = new Map();
function gradientRows(colors, h) {
  const key = `${colors.top}|${colors.mid}|${colors.bottom}|${h}`;
  let rows = gradCache.get(key);
  if (rows) return rows;
  const A = parseColor(colors.top), M = parseColor(colors.mid), B = parseColor(colors.bottom);
  rows = [];
  for (let i = 0; i < h; i++) {
    const t = h <= 1 ? 0 : i / (h - 1);
    let c0, c1, k;
    if (t < 0.45) { c0 = A; c1 = M; k = t / 0.45; } else { c0 = M; c1 = B; k = (t - 0.45) / 0.55; }
    const rr = Math.round(c0[0] + (c1[0] - c0[0]) * k), g = Math.round(c0[1] + (c1[1] - c0[1]) * k), b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
    rows.push(`rgb(${rr},${g},${b})`);
  }
  if (gradCache.size > 400) gradCache.clear();
  gradCache.set(key, rows);
  return rows;
}
export function fillGradient(r, x, y, w, h, colors, alpha = 1) {
  if (w <= 0 || h <= 0) return;
  const rows = gradientRows(colors, h);
  const g = r.ctx;
  const prev = g.globalAlpha;
  g.globalAlpha = prev * alpha;
  for (let i = 0; i < h; i++) { g.fillStyle = rows[i]; g.fillRect(x, y + i, w, 1); }
  g.globalAlpha = prev;
}

function fallbackFrame(r, x, y, w, h, kind) {
  const thin = kind === 'thin';
  const hi = '#f4f2ff', mid = '#c9c4e8', lo = '#8f8ab8';
  r.rect(x + 2, y, w - 4, 1, INK); r.rect(x + 2, y + h - 1, w - 4, 1, INK);
  r.rect(x, y + 2, 1, h - 4, INK); r.rect(x + w - 1, y + 2, 1, h - 4, INK);
  r.pixel(x + 1, y + 1, INK); r.pixel(x + w - 2, y + 1, INK); r.pixel(x + 1, y + h - 2, INK); r.pixel(x + w - 2, y + h - 2, INK);
  r.rect(x + 2, y + 1, w - 4, 1, hi); r.rect(x + 1, y + 2, 1, h - 4, hi);
  if (!thin) { r.rect(x + 2, y + 2, w - 4, 1, mid); r.rect(x + 2, y + 2, 1, h - 4, mid); }
  r.rect(x + 2, y + h - 2, w - 4, 1, lo); r.rect(x + w - 2, y + 2, 1, h - 4, lo);
}

/**
 * Draw a window. Returns the rect actually drawn ({x, y, w, h, inset}) or null when fully closed.
 * opts: scheme, kind ('std' | 'field' | 'thin'), field (shorthand for kind 'field' + alpha 0.92), alpha,
 *       open (0..1 grow from center), tail ({ x: tip screen x, dir: 'down' | 'up' }).
 */
export function drawWindow(r, x, y, w, h, o = {}) {
  const k = o.open == null ? 1 : Math.max(0, Math.min(1, o.open));
  if (k <= 0) return null;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (k < 1) {
    const w2 = Math.max(10, Math.round(w * k)), h2 = Math.max(10, Math.round(h * k));
    x += Math.round((w - w2) / 2); y += Math.round((h - h2) / 2); w = w2; h = h2;
  }
  const kind = o.kind || (o.field ? 'field' : 'std');
  const scheme = o.scheme || currentScheme(r);
  const colors = schemeColors(r, scheme);
  const alpha = o.alpha ?? (kind === 'field' ? FIELD_ALPHA : 1);
  const atlas = windowAtlas(r);
  const fdef = atlas && atlas.frames[kind] ? atlas.frames[kind] : null;
  const inset = fdef && fdef.fillInset != null ? fdef.fillInset : (kind === 'thin' ? 2 : 3);
  fillGradient(r, x + inset, y + inset, w - 2 * inset, h - 2 * inset, colors, alpha);
  if (fdef) r.nineSlice(atlas.image, [fdef.x, fdef.y, fdef.w, fdef.h], fdef.border || 4, x, y, w, h, { center: false });
  else fallbackFrame(r, x, y, w, h, kind);
  const rect = { x, y, w, h, inset };
  if (o.tail && k >= 1) drawTail(r, rect, o.tail.x, o.tail.dir || 'down', { scheme, field: kind === 'field', alpha: o.tail.alpha ?? alpha });
  return rect;
}

/** Speech tail: tip at screen x `tipX`, hanging below the window ('down') or rising above it ('up'). */
export function drawTail(r, win, tipX, dir = 'down', o = {}) {
  const atlas = windowAtlas(r);
  const colors = schemeColors(r, o.scheme);
  const col = dir === 'down' ? colors.bottom : colors.top;
  const alpha = o.alpha ?? 1;
  const tails = atlas && atlas.meta && atlas.meta.tails;
  const name = (dir === 'up' ? 'tail_up' : 'tail_down') + (o.field ? '_field' : '');
  const t = tails && tails[name];
  if (!t || !atlas.frames[t.frame]) {
    // Procedural tail: a small triangle with an ink outline.
    const tx = Math.round(tipX);
    for (let i = 0; i < 6; i++) {
      const yy = dir === 'down' ? win.y + win.h - 2 + i : win.y + 1 - i;
      r.rect(tx - 6 + i, yy, 12 - i * 2, 1, i === 5 ? INK : col);
    }
    return;
  }
  const fr = atlas.frames[t.frame], fill = atlas.frames[t.fill];
  const sx = Math.round(tipX - t.tipX);
  const sy = dir === 'down' ? win.y + win.h - 4 : win.y + 4 - t.h;
  if (fill) r.image(atlas.image, sx, sy, { sx: fill.x, sy: fill.y, sw: fill.w, sh: fill.h, tint: col, alpha });
  r.image(atlas.image, sx, sy, { sx: fr.x, sy: fr.y, sw: fr.w, sh: fr.h });
}

/** Selection bar (12 px tall), tinted with the scheme highlight. */
export function drawSelBar(r, x, y, w, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w);
  const colors = schemeColors(r, o.scheme);
  const a = o.alpha ?? 1;
  const ui = uiAtlas(r);
  const f = ui && ui.frames.sel_bar;
  if (!f) { r.withAlpha(0.45 * a, () => r.rect(x, y, w, 12, colors.highlight)); return; }
  const tint = o.color || colors.highlight;
  const img = ui.image;
  r.image(img, x, y, { sx: f.x, sy: f.y, sw: 3, sh: f.h, tint, alpha: a });
  if (w > 6) r.image(img, x + 3, y, { sx: f.x + 3, sy: f.y, sw: f.w - 6, sh: f.h, w: w - 6, h: f.h, tint, alpha: a });
  r.image(img, x + w - 3, y, { sx: f.x + f.w - 3, sy: f.y, sw: 3, sh: f.h, tint, alpha: a });
}

const GAUGE_FALLBACK = { hp: '#b6cc58', hp_mid: '#eba14d', hp_low: '#e06b39', mp: '#6ab3e4', fury: '#eba14d', exp: '#bc94e2', atb: '#8af0e8', lag: '#f6f4ee' };

/**
 * Gauge: frame 6 px tall (3 px fill) or thin 5 px (2 px fill). kind: hp (auto mid/low), mp, fury, exp, atb.
 * opts: thin, lag (0..1 white damage trail drawn under the fill), glow (fury-full shine + glow), frame.
 */
export function drawGauge(r, x, y, w, frac, kind = 'hp', o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w);
  frac = Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : 0));
  const thin = !!o.thin;
  const fh = thin ? 2 : 3;
  const inner = Math.max(0, w - 2);
  const fw = frac > 0 ? Math.max(1, Math.round(inner * frac)) : 0;
  let fillKey = kind === 'hp' ? (frac > 0.5 ? 'hp' : frac > 0.25 ? 'hp_mid' : 'hp_low') : kind;
  const ui = uiAtlas(r);
  const fr = ui && ui.frames[thin ? 'gauge_frame_thin' : 'gauge_frame'];
  if (!fr) {
    r.rect(x, y, w, fh + 2, INK);
    if (o.lag) r.rect(x + 1, y + 1, Math.round(inner * o.lag), fh, GAUGE_FALLBACK.lag);
    if (fw) r.rect(x + 1, y + 1, fw, fh, GAUGE_FALLBACK[fillKey] || GAUGE_FALLBACK.hp);
    return;
  }
  r.nineSlice(ui.image, [fr.x, fr.y, fr.w, fr.h], [2, 0, 2, 0], x, y, w, fr.h);
  const suffix = thin ? '_thin' : '';
  if (o.lag != null && o.lag > frac) {
    const lf = ui.frames['gauge_lag' + suffix];
    const lw = Math.round(inner * Math.min(1, o.lag));
    if (lf && lw > 0) r.image(ui.image, x + 1, y + 1, { sx: lf.x, sy: lf.y, sw: 1, sh: lf.h, w: lw, h: lf.h });
  }
  const ff = ui.frames['gauge_' + fillKey + suffix] || ui.frames['gauge_' + fillKey];
  if (ff && fw > 0) r.image(ui.image, x + 1, y + 1, { sx: ff.x, sy: ff.y, sw: 1, sh: ff.h, w: fw, h: Math.min(ff.h, fh) });
  if (o.glow && fw > 0) {
    const frame = o.frame ?? r.frame;
    const shineName = animFrameAt(ui.anims.fury_shine, frame / 60);
    const sf = shineName && ui.frames[shineName];
    if (sf) {
      r.pushClip(x + 1, y + 1, fw, fh);
      for (let xx = x + 1 - 24; xx < x + 1 + fw; xx += 24) r.image(ui.image, xx, y + 1, { sx: sf.x, sy: sf.y, sw: sf.w, sh: Math.min(sf.h, fh) });
      r.popClip();
    }
    const glowName = animFrameAt(ui.anims.gauge_glow, frame / 60);
    const gf = glowName && ui.frames[glowName];
    if (gf) r.nineSlice(ui.image, [gf.x, gf.y, gf.w, gf.h], [4, 4, 4, 4], x - 2, y - 2, w + 4, fr.h + 4);
  }
}

/** Tiny 3x5 gold labels from ui.json: hp mp fury lv exp next atk def mag spd ready ko. */
export function drawLabel(r, id, x, y, o = {}) {
  const ui = uiAtlas(r);
  const f = ui && ui.frames['lbl_' + id];
  if (f) { r.sprite(ui, f, x, y, { topLeft: true, alpha: o.alpha }); return f.w; }
  const t = id.toUpperCase();
  r.text(t, x, y - 2, { color: 'gold', alpha: o.alpha });
  return r.measure(t);
}

/** 12x12 icon: `icon_<id>` by default, or any ui.json frame name. Returns the frame width (0 if missing). */
export function drawIcon(r, id, x, y, o = {}) {
  const ui = uiAtlas(r);
  if (!ui || !id) return 0;
  const f = ui.frames['icon_' + id] || ui.frames[id];
  if (!f) return 0;
  r.sprite(ui, f, x, y, { topLeft: true, alpha: o.alpha, tint: o.tint, tintAmount: o.tintAmount });
  return f.w;
}
export function drawIcon16(r, id, x, y, o = {}) {
  const ui = uiAtlas(r);
  const f = ui && (ui.frames['icon16_' + id] || ui.frames['icon_' + id]);
  if (!f) return 0;
  r.sprite(ui, f, x, y, { topLeft: true, alpha: o.alpha });
  return f.w;
}
export function hasIcon(r, id) { const ui = uiAtlas(r); return !!(ui && (ui.frames['icon_' + id] || ui.frames[id])); }

/** Thin-framed portrait (48 or 32). Returns true when the portrait art exists. */
export function drawPortrait(r, id, x, y, size = 48, o = {}) {
  x = Math.round(x); y = Math.round(y);
  const atlas = r.assets && r.assets.has('portraits') ? r.assets.atlas('portraits') : null;
  const f = atlas && id ? atlas.frames[`${id}_${size}`] : null;
  if (o.frame !== false) drawWindow(r, x, y, size + 4, size + 4, { kind: 'thin', scheme: o.scheme, alpha: o.alpha ?? 1 });
  if (f) { r.sprite(atlas, f, x + 2, y + 2, { topLeft: true, alpha: o.alpha }); return true; }
  // Placeholder: dark field with the initial.
  r.rect(x + 2, y + 2, size, size, '#1a1530');
  const initial = String(id || '?').charAt(0).toUpperCase();
  r.text(initial, x + 2 + size / 2, y + 2 + Math.round(size / 2) - (size >= 48 ? 8 : 6), { font: size >= 48 ? 'large' : 'main', align: 'center', color: 'dim', alpha: o.alpha });
  return false;
}
export function hasPortrait(r, id, size = 48) {
  const atlas = r.assets && r.assets.has('portraits') ? r.assets.atlas('portraits') : null;
  return !!(atlas && id && atlas.frames[`${id}_${size}`]);
}

/** Location banner centered on cx with its top at y. Returns the banner rect. */
export function drawBanner(r, text, cx, y, o = {}) {
  const tw = r.measure(text, 'large');
  const ui = uiAtlas(r);
  const l = ui && ui.frames.banner_l, m = ui && ui.frames.banner_m, rr = ui && ui.frames.banner_r;
  const w = Math.max(96, tw + 36);
  const x = Math.round(cx - w / 2);
  y = Math.round(y);
  const alpha = o.alpha ?? 1;
  if (l && m && rr) {
    r.image(ui.image, x, y, { sx: l.x, sy: l.y, sw: l.w, sh: l.h, alpha });
    r.image(ui.image, x + l.w, y, { sx: m.x, sy: m.y, sw: m.w, sh: m.h, w: w - l.w - rr.w, h: m.h, alpha });
    r.image(ui.image, x + w - rr.w, y, { sx: rr.x, sy: rr.y, sw: rr.w, sh: rr.h, alpha });
  } else {
    drawWindow(r, x, y, w, 24, { alpha: 0.92 * alpha, scheme: o.scheme });
  }
  r.text(text, x + Math.floor(w / 2), y + 4, { font: 'large', align: 'center', color: o.color || 'cream', alpha });
  return { x, y, w, h: 24 };
}

/** Two-pixel rule (light over dark) used to separate rows inside a window. */
export function drawDivider(r, x, y, w, o = {}) {
  const c = schemeColors(r, o.scheme);
  r.rect(x, y, w, 1, c.highlight);
  r.rect(x, y + 1, w, 1, c.bottom);
}

/** Small 'more' / 'end' marks for text boxes. kind: 'more' (bouncing arrow) or 'end' (blinking mark). */
export function drawTextMark(r, kind, x, y, o = {}) {
  const ui = uiAtlas(r);
  const frame = o.frame ?? r.frame;
  const name = ui && animFrameAt(ui.anims[kind], frame / 60);
  const f = name && ui.frames[name];
  if (f) { r.sprite(ui, f, x, y, { topLeft: true, alpha: o.alpha }); return; }
  if (Math.floor(frame / 16) % 2 === 0) r.text(kind === 'end' ? '●' : '▼', x, y - 2, { color: 'white', alpha: o.alpha });
}

/** Scroll arrows above/below a list. dir 'up' | 'down'; (cx, y) = center x, top y. */
export function drawScrollArrow(r, dir, cx, y, o = {}) {
  const ui = uiAtlas(r);
  const f = ui && ui.frames['arrow_' + dir];
  const bob = Math.floor((o.frame ?? r.frame) / 15) % 2 ? (dir === 'up' ? -1 : 1) : 0;
  if (f) r.sprite(ui, f, Math.round(cx - f.w / 2), y + bob, { topLeft: true, alpha: o.alpha });
  else r.text(dir === 'up' ? '▲' : '▼', cx, y - 2 + bob, { align: 'center', color: 'white', alpha: o.alpha });
}
export function drawPageArrow(r, dir, x, y, o = {}) {
  const ui = uiAtlas(r);
  const f = ui && ui.frames['arrow_' + dir];
  if (f) r.sprite(ui, f, x, y, { topLeft: true, alpha: o.alpha });
  else r.text(dir === 'left' ? '←' : '→', x, y - 1, { color: 'white', alpha: o.alpha });
}
/** Page dots: n pages, `on` index. Returns the width used. */
export function drawPageDots(r, n, on, x, y, o = {}) {
  const ui = uiAtlas(r);
  let w = 0;
  for (let i = 0; i < n; i++) {
    const f = ui && ui.frames[i === on ? 'page_on' : 'page_off'];
    if (f) r.sprite(ui, f, x + i * 8, y, { topLeft: true, alpha: o.alpha });
    else r.rect(x + i * 8 + 1, y + 1, 3, 3, i === on ? '#f6f4ee' : '#4a4560');
    w = (i + 1) * 8 - 3;
  }
  return w;
}

/** Stat delta glyph: delta > 0 green up, < 0 red down, 0 same. */
export function drawDelta(r, delta, x, y, o = {}) {
  const ui = uiAtlas(r);
  const name = delta > 0 ? 'delta_up' : delta < 0 ? 'delta_down' : 'delta_same';
  const f = ui && ui.frames[name];
  if (f) r.sprite(ui, f, x, y, { topLeft: true, alpha: o.alpha });
  else r.text(delta > 0 ? '+' : delta < 0 ? '-' : '=', x, y - 2, { color: delta > 0 ? 'green' : delta < 0 ? 'red' : 'white' });
}

/** Device-aware inline button glyph id for {i:...} text codes (btn_confirm, btn_cancel, ...). */
export function btn(action) { return `{i:btn_${action}}`; }

/** Open/close grow animation driven by the owning scene's update(). */
export class WindowAnim {
  constructor(engine, frames = OPEN_FRAMES) {
    this.engine = engine; this.frames = frames; this.t = 0; this.state = 'closed';
  }
  get reduce() { return !!(this.engine && this.engine.settings && this.engine.settings.reduceMotion); }
  open(instant = false) {
    if (instant || this.reduce || this.frames <= 0) { this.t = this.frames; this.state = 'open'; return; }
    this.t = 0; this.state = 'opening';
  }
  close(instant = false) {
    if (instant || this.reduce || this.frames <= 0) { this.t = 0; this.state = 'closed'; return; }
    this.t = this.frames; this.state = 'closing';
  }
  update() {
    if (this.state === 'opening') { if (++this.t >= this.frames) { this.t = this.frames; this.state = 'open'; } }
    else if (this.state === 'closing') { if (--this.t <= 0) { this.t = 0; this.state = 'closed'; } }
    return this.state;
  }
  /** 0..1 eased size factor for drawWindow({ open }). */
  get k() { return this.frames ? ease.outCubic(this.t / this.frames) : 1; }
  get isOpen() { return this.state === 'open'; }
  get isClosed() { return this.state === 'closed'; }
  get busy() { return this.state === 'opening' || this.state === 'closing'; }
}
