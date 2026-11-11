// The portrait lens (#88, docs/ACCESSIBILITY.md item 8): upright, one game px is one css px, so a scene names the game rects
// a finger needs (Renderer.setLens) and they are drawn again, bigger, in the pad under the game; Renderer.toGame maps a tap
// there back into the game. Loaded on first use (tools/pwa/build_pwa.py LAZY_PREFIXES).

import { PAD } from '../../core/renderer.js';

/** The finger floor the lens aims its rows at (css px). */
export const LENS_ROW_CSS = 44;

/**
 * Place rects { x, y, w, h, rowH } in view.pad: each at the fewest whole device px per game px that make its rowH 44 css px,
 * no wider than the pad; while the stack is too tall the biggest steps down. Stacked, centred. Pure: [{ src, k, x, y, w, h }]
 * in device px.
 */
export function placeLens(rects, view) {
  const pad = view && view.pad, dpr = (view && view.dpr) || 1;
  if (!pad || !rects || !rects.length) return [];
  const pw = Math.floor(pad.w * dpr), ph = Math.floor(pad.h * dpr), gap = Math.round((PAD.gap / 2) * dpr), top = Math.round(pad.y * dpr);
  const ks = rects.map((r) => Math.min(Math.ceil((LENS_ROW_CSS * dpr) / Math.max(1, r.rowH || r.h)), Math.floor(pw / r.w)));
  const total = () => rects.reduce((n, r, i) => n + r.h * ks[i], 0) + gap * (rects.length - 1);
  while (total() > ph) {
    const i = ks.reduce((b, k, j) => (k * rects[j].h > ks[b] * rects[b].h ? j : b), 0);
    if (ks[i] <= 1) break;
    ks[i]--;
  }
  const out = [];
  let y = top;
  rects.forEach((r, i) => {
    const k = ks[i];
    if (k < 1 || y + r.h * k > top + ph) return;
    out.push({ src: { x: r.x, y: r.y, w: r.w, h: r.h }, k, x: Math.round(pad.x * dpr + (pw - r.w * k) / 2), y, w: r.w * k, h: r.h * k });
    y += r.h * k + gap;
  });
  return out;
}

/** Draw this frame's lens (Renderer.present); a changed lens repaints the bars it leaves first. */
export function presentLens(R) {
  const v = R.view, g = R.vctx, lens = placeLens(R._lensWant, v);
  const sig = lens.map((L) => `${L.src.x},${L.src.y},${L.src.w},${L.src.h},${L.k},${L.y}`).join(';');
  if (sig !== R._lensSig) {
    if (R._lensSig) { R._drawBars(); g.imageSmoothingEnabled = false; g.drawImage(R.canvas, 0, 0, R.W, R.H, v.x, v.y, v.w, v.h); }
    R._lensSig = sig;
  }
  R._lens = lens;
  g.imageSmoothingEnabled = false;
  const o = Math.max(1, Math.round(v.dpr));
  g.fillStyle = '#4b4675';   // opaque: drawn every frame
  for (const L of lens) {
    g.fillRect(L.x - o, L.y - o, L.w + 2 * o, L.h + 2 * o);
    g.drawImage(R.canvas, L.src.x, L.src.y, L.src.w, L.src.h, L.x, L.y, L.w, L.h);
  }
}
