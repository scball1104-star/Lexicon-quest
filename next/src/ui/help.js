// Bottom help bar: one line of help text (left) and an optional gold label (right), FF6 style.
//
//   drawHelpBar(r, 'Change weapons and armor.', { right: 'Willowmere', y: 184, h: 28, scheme, alpha })
//   helpBarRect(r) -> { x, y, w, h } (default placement: 4, 184, 376, 28)

import { drawWindow } from './window.js';

export const HELP_Y = 184;
export const HELP_H = 28;

export function helpBarRect(r, o = {}) {
  const h = o.h || HELP_H;
  return { x: o.x ?? 4, y: o.y ?? (r.H - h - 4), w: o.w ?? (r.W - 8), h };
}

export function drawHelpBar(r, text, o = {}) {
  const rect = helpBarRect(r, o);
  drawWindow(r, rect.x, rect.y, rect.w, rect.h, { scheme: o.scheme, alpha: o.alpha, open: o.open, kind: o.kind });
  if (o.open != null && o.open < 1) return rect;
  const ty = rect.y + Math.floor((rect.h - 11) / 2);
  if (text) r.text(String(text), rect.x + 8, ty, { color: o.color || 'white', alpha: o.alpha, width: rect.w - 16 });
  if (o.right) r.text(String(o.right), rect.x + rect.w - 8, ty, { align: 'right', color: o.rightColor || 'gold', alpha: o.alpha });
  return rect;
}
