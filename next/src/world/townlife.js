// Town life after dusk (W4-world-polish): which windows a building prefab paints, where its chimney is, and
// the night pass that makes those windows glow. The facades in assets/tiles/town.png are painted pictures,
// not tile grids, so the features are found once per prefab id and cached:
//   windows:  connected clusters of the kit's warm window-pane colours (sampled from the `window_lit` and
//             `window_tall_lit` tiles, so they follow the art sheet) inside the prefab rect, at least 5x5 px;
//   chimneys: the cap rows of the `chimney_stone` tile template-matched inside the prefab rect.
//
//   const feats = buildingFeatures(map)      [{ kind: 'window'|'chimney', x, y, w, h }] in world px
//   chimneyTops(feats)                       [{ x, y }] where smoke starts
//   drawLitWindows(r, cam, map, feats, k)    repaint the pane pixels bright and halo them, k = 0..1
//
// Drawn after the lighting pass (so the night tint does not dim them) and before the 'above' particles.
// Nothing here runs without a DOM (the maps tests import the map modules only).

const CHIMNEY_TILE = 'chimney_stone';
const CHIMNEY_ROWS = 10;           // the cap and the first courses are enough to find a chimney stack
const MIN_WINDOW = 5;              // px; smaller warm clusters are lanterns and trim
const cache = new Map();           // prefab id -> { feats: [{ kind, dx, dy, w, h }], panes: canvas|null }
let paneColors = null;             // Set of 'r,g,b' strings

function grab(img, x, y, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, x, y, w, h, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

/** Warm pane colours of the kit window tiles: lit yellows and the highlight. */
function samplePaneColors(map) {
  if (paneColors) return paneColors;
  const set = new Set();
  for (const id of ['window_lit', 'window_tall_lit']) {
    const t = map.db.tiles[id];
    if (!t) continue;
    const w = t.w || 16, h = t.h || 16;
    const B = grab(map.sheet(t.sheet), t.x, t.y, w, h);
    for (let i = 0; i < B.length; i += 4) {
      if (B[i + 3] < 200) continue;
      const r = B[i], g = B[i + 1], b = B[i + 2];
      if ((r >= 200 && g >= 150 && b <= 140) || (r >= 240 && g >= 230 && b >= 190)) set.add(`${r},${g},${b}`);
    }
  }
  paneColors = set;
  return set;
}

/** Opaque pixels of a template as [x, y, r, g, b]. */
function templatePoints(B, tw, th) {
  const pts = [];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const i = (y * tw + x) * 4; if (B[i + 3] > 200) pts.push([x, y, B[i], B[i + 1], B[i + 2]]); }
  return pts;
}

function matchAll(A, rw, rh, pts, tw, th) {
  const out = [];
  if (pts.length < 24) return out;
  const probe = pts.filter((_, i) => i % 5 === 0);
  for (let y = 0; y <= rh - th; y++) {
    for (let x = 0; x <= rw - tw; x++) {
      let ok = true;
      for (const [px, py, r, g, b] of probe) {
        const i = ((y + py) * rw + (x + px)) * 4;
        if (A[i] !== r || A[i + 1] !== g || A[i + 2] !== b) { ok = false; break; }
      }
      if (!ok) continue;
      for (const [px, py, r, g, b] of pts) {
        const i = ((y + py) * rw + (x + px)) * 4;
        if (A[i] !== r || A[i + 1] !== g || A[i + 2] !== b) { ok = false; break; }
      }
      if (ok) { out.push([x, y]); x += tw - 1; }
    }
  }
  return out;
}

/** Connected clusters (4-neighbour) of pane pixels in a prefab; returns their bounding boxes. */
function paneClusters(A, rw, rh, colors) {
  const mask = new Uint8Array(rw * rh);
  for (let i = 0, p = 0; i < A.length; i += 4, p++) if (A[i + 3] > 200 && colors.has(`${A[i]},${A[i + 1]},${A[i + 2]}`)) mask[p] = 1;
  const seen = new Uint8Array(rw * rh);
  const boxes = [];
  const stack = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    let x0 = rw, y0 = rh, x1 = -1, y1 = -1, n = 0;
    stack.length = 0; stack.push(s); seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % rw, y = (p / rw) | 0;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      // pane panes sit a pixel apart across mullions: bridge gaps of one pixel
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= rw || ny >= rh) continue;
        const q = ny * rw + nx;
        if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w >= MIN_WINDOW && h >= MIN_WINDOW && n >= 12) boxes.push({ kind: 'window', dx: x0, dy: y0, w, h });
  }
  return { boxes, mask };
}

function detect(map, meta) {
  const out = { feats: [], panes: null };
  if (typeof document === 'undefined') return out;
  try {
    const [rx, ry, rw, rh] = meta.rect;
    const A = grab(map.sheet(meta.sheet), rx, ry, rw, rh);
    const T = map.db.tiles;
    const { boxes, mask } = paneClusters(A, rw, rh, samplePaneColors(map));
    if (boxes.length) {
      // a canvas holding only this prefab's pane pixels, drawn bright over the tinted facade at night
      const c = document.createElement('canvas'); c.width = rw; c.height = rh;
      const g = c.getContext('2d');
      const img = g.createImageData(rw, rh);
      for (const b of boxes) {
        for (let y = b.dy; y < b.dy + b.h; y++) for (let x = b.dx; x < b.dx + b.w; x++) {
          const p = y * rw + x;
          if (!mask[p]) continue;
          img.data[p * 4] = A[p * 4]; img.data[p * 4 + 1] = A[p * 4 + 1]; img.data[p * 4 + 2] = A[p * 4 + 2]; img.data[p * 4 + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      out.panes = c;
      out.feats.push(...boxes);
    }
    const ct = T[CHIMNEY_TILE];
    if (ct) {
      const tw = ct.w || 16, th = Math.min(CHIMNEY_ROWS, ct.h || 32);
      const pts = templatePoints(grab(map.sheet(ct.sheet), ct.x, ct.y, tw, th), tw, th);
      for (const [x, y] of matchAll(A, rw, rh, pts, tw, th)) out.feats.push({ kind: 'chimney', dx: x, dy: y, w: tw, h: th });
    }
  } catch (err) {
    if (map.warn) map.warn('townlife', `feature lookup failed: ${err && err.message}`);
  }
  return out;
}

/** Windows and chimneys of every building on the map, in world pixels. */
export function buildingFeatures(map) {
  const out = [];
  if (!map || !map.statics) return out;
  for (const s of map.statics) {
    const m = s.meta;
    if (!m || !m.rect) continue;
    let rec = cache.get(s.t);
    if (!rec) { rec = detect(map, m); cache.set(s.t, rec); }
    if (!rec.feats.length) continue;
    const ox = (s.x - m.anchor[0]) * 16, oy = (s.y - m.anchor[1]) * 16;
    for (const f of rec.feats) out.push({ kind: f.kind, x: ox + f.dx, y: oy + f.dy, w: f.w, h: f.h, dx: f.dx, dy: f.dy, panes: rec.panes });
  }
  return out;
}

/** Where chimney smoke starts: the middle of each chimney cap, one pixel above it. */
export function chimneyTops(feats) {
  return feats.filter((f) => f.kind === 'chimney').map((f) => ({ x: f.x + (f.w >> 1), y: f.y + 1 }));
}

/**
 * Night windows: the pane pixels painted again at near-full brightness over the tinted facade, with a
 * small additive dithered halo. k is the glow strength (0 skips everything). Called under pushCamera.
 */
export function drawLitWindows(r, cam, map, feats, k) {
  if (!feats || !feats.length || k <= 0.01) return;
  const g = r.ctx;
  const vis = [];
  for (const f of feats) if (f.kind === 'window' && f.panes && cam.visible(f.x, f.y, f.w, f.h, 8)) vis.push(f);
  if (!vis.length) return;
  g.globalAlpha = 0.5 + 0.4 * k;
  for (const f of vis) g.drawImage(f.panes, f.dx, f.dy, f.w, f.h, f.x, f.y, f.w, f.h);
  g.globalAlpha = 1;
  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter';
  for (const f of vis) {
    r.withAlpha(0.26 * k, () => r.dither(f.x - 3, f.y - 2, f.w + 6, f.h + 5, '#ff9a3c', 0.25));
    r.withAlpha(0.20 * k, () => r.dither(f.x - 1, f.y - 1, f.w + 2, f.h + 2, '#ffb860', 0.5));
  }
  g.globalCompositeOperation = prev;
}
