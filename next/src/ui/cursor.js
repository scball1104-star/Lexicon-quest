// The pointing-hand glove cursor (FF). Hotspot = fingertip; frame 1 of the art is already shifted one pixel
// toward the option, so the bob comes from the animation (4 fps).
//
//   drawCursor(r, hotX, hotY, { alpha, frame })   fingertip lands on (hotX, hotY)
//   drawRowCursor(r, rowX, rowY, opts)            convenience: 2 px left of a 12 px row's left edge, mid-height
//   cursorHotspotForRow(rowX, rowY) -> [x, y]

import { animFrameAt } from '../core/assets.js';
import { uiAtlas } from './window.js';

export function cursorFrameName(r, frame) {
  const ui = uiAtlas(r);
  if (!ui || !ui.anims.cursor) return null;
  return animFrameAt(ui.anims.cursor, (frame ?? r.frame) / 60);
}

export function drawCursor(r, hotX, hotY, o = {}) {
  const ui = uiAtlas(r);
  const name = cursorFrameName(r, o.frame);
  const f = name && ui.frames[name];
  if (f) { r.sprite(ui, f, Math.round(hotX), Math.round(hotY), { alpha: o.alpha }); return; }
  // Fallback: a small white arrow whose tip sits at the hotspot.
  const bob = Math.floor((o.frame ?? r.frame) / 15) % 2;
  r.text('▶', Math.round(hotX) - 7 + bob, Math.round(hotY) - 4, { color: 'white', alpha: o.alpha });
}

export function cursorHotspotForRow(rowX, rowY, rowH = 12) {
  return [Math.round(rowX) - 2, Math.round(rowY) + Math.floor(rowH / 2) - 1];
}

export function drawRowCursor(r, rowX, rowY, o = {}) {
  const [hx, hy] = cursorHotspotForRow(rowX, rowY, o.rowH || 12);
  drawCursor(r, hx + (o.dx || 0), hy + (o.dy || 0), o);
}
