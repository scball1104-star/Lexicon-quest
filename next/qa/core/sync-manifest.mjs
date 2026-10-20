// Keep next/assets/manifest.json in step with the asset folders.
//
//   node next/qa/core/sync-manifest.mjs           rewrite the manifest (adds new files, drops missing ones)
//   node next/qa/core/sync-manifest.mjs --check   report only; exit 1 if the manifest is out of date
//
// Scans assets/ui, assets/sprites, assets/tiles and assets/palette.json. Classification by content:
//   *.json with "glyphs"            -> fonts   (font.json = main, font_<x>.json = <x>: large, num, num_big)
//   *.json with "frames" or "image" -> atlases (id = file stem; its image is loaded with it)
//   other *.json                    -> json    (id = file stem)
//   *.png / *.webp not used as some JSON's "image" -> images (id = file stem)
// Entries pointing outside those folders (for example ../assets/art/environments.webp) are kept as-is.
// Audio is not listed: src/core/audio.js loads assets/audio/manifest.json itself.
// "scenes": "src/scenes/registry.js" is set when that file exists (main.js imports it only when listed).
// "touch": { dpad, dpad_up, ..., a, a_pressed, ... } lists assets/ui/touch/*.png (the touch-control skin).
// "lazy": { group: [ids] } is hand-maintained (W6-pwa load order) and kept as-is; ids that no longer exist in any
// kind are dropped and reported. Lazy ids are loaded after the title is up (engine.lazyLoad), in group order.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = path.join(NEXT, 'assets', 'manifest.json');
const SCAN_DIRS = ['assets/ui', 'assets/sprites', 'assets/tiles', 'assets/backdrops'];
const EXTRA_FILES = ['assets/palette.json'];
const FONT_IDS = { font: 'main', font_large: 'large', font_num: 'num' };
const KINDS = ['images', 'atlases', 'json', 'fonts'];
const REGISTRY = 'src/scenes/registry.js';

const rel = (p) => path.relative(NEXT, p).split(path.sep).join('/');
const stem = (p) => path.basename(p).replace(/\.[^.]+$/, '');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

export function scan() {
  const found = { images: {}, atlases: {}, json: {}, fonts: {} };
  const usedImages = new Set();
  const files = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(NEXT, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).sort()) {
      const full = path.join(abs, f);
      if (fs.statSync(full).isFile()) files.push(full);
    }
  }
  for (const f of EXTRA_FILES) { const full = path.join(NEXT, f); if (fs.existsSync(full)) files.push(full); }

  for (const f of files.filter((x) => x.endsWith('.json'))) {
    const j = readJson(f);
    if (!j || typeof j !== 'object') continue;
    const id = stem(f);
    if (j.glyphs) found.fonts[FONT_IDS[id] || id.replace(/^font_/, '')] = rel(f);
    else if (j.frames || typeof j.image === 'string') found.atlases[id] = rel(f);
    else found.json[id] = rel(f);
    if (typeof j.image === 'string') usedImages.add(path.resolve(path.dirname(f), j.image));
  }
  for (const f of files.filter((x) => /\.(png|webp)$/i.test(x))) {
    if (usedImages.has(path.resolve(f))) continue;
    if (path.dirname(f) === path.join(NEXT, 'assets')) continue; // palette.png is a reference card
    let id = stem(f);
    if (found.images[id]) id = `${path.basename(path.dirname(f))}_${id}`;
    found.images[id] = rel(f);
  }
  return found;
}

function entryPath(e) { return typeof e === 'string' ? e : e && e.path; }

export function sync({ write = true } = {}) {
  const current = readJson(MANIFEST) || {};
  const found = scan();
  const scanned = (p) => SCAN_DIRS.some((d) => p.startsWith(d + '/')) || EXTRA_FILES.includes(p);
  const out = { $comment: current.$comment || 'Generated/maintained by qa/core/sync-manifest.mjs. Paths are relative to next/.' };
  const problems = [];
  for (const kind of KINDS) {
    const next = {};
    // Keep manual entries outside the scanned folders, if their files exist.
    for (const [id, e] of Object.entries(current[kind] || {})) {
      const p = entryPath(e);
      if (!p) continue;
      if (!scanned(p)) {
        if (fs.existsSync(path.join(NEXT, p))) next[id] = e;
        else problems.push(`missing file for ${kind}.${id}: ${p}`);
      }
    }
    for (const [id, p] of Object.entries(found[kind])) next[id] = p;
    // Report differences.
    for (const id of Object.keys(next)) if (!current[kind] || entryPath(current[kind][id]) !== entryPath(next[id])) problems.push(`+ ${kind}.${id} = ${entryPath(next[id])}`);
    for (const id of Object.keys(current[kind] || {})) if (!(id in next)) problems.push(`- ${kind}.${id} (${entryPath(current[kind][id])})`);
    out[kind] = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  }
  // Touch-control skin: assets/ui/touch/<key>.png -> "touch": { key: path } (engine applies it at boot).
  const touchDir = path.join(NEXT, 'assets', 'ui', 'touch');
  const touch = {};
  if (fs.existsSync(touchDir)) for (const f of fs.readdirSync(touchDir).sort()) if (/\.(png|webp)$/i.test(f)) touch[stem(f)] = rel(path.join(touchDir, f));
  if (JSON.stringify(current.touch || {}) !== JSON.stringify(touch)) problems.push(`~ touch skin (${Object.keys(touch).length} images)`);
  if (Object.keys(touch).length) out.touch = touch;
  // The scene registry is imported only when listed, so a missing file never causes a 404.
  const reg = fs.existsSync(path.join(NEXT, REGISTRY)) ? REGISTRY : null;
  if ((current.scenes || null) !== reg) problems.push(reg ? `+ scenes = ${reg}` : `- scenes (${current.scenes} no longer exists)`);
  if (reg) out.scenes = reg;
  // Lazy groups: keep the hand-written lists, dropping ids that vanished.
  const lazy = {};
  for (const [name, ids] of Object.entries(current.lazy || {})) {
    const keep = (Array.isArray(ids) ? ids : []).filter((id) => KINDS.some((k) => out[k][id]));
    for (const id of (Array.isArray(ids) ? ids : [])) if (!keep.includes(id)) problems.push(`- lazy.${name} lists unknown id ${id}`);
    if (keep.length) lazy[name] = keep;
  }
  if (Object.keys(lazy).length) out.lazy = lazy;
  if (write) fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 2) + '\n');
  return { manifest: out, changes: problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const { changes } = sync({ write: !check });
  if (!changes.length) console.log('manifest is up to date');
  else {
    console.log(`${check ? 'manifest is out of date' : 'manifest updated'} (${changes.length} change${changes.length === 1 ? '' : 's'}):`);
    for (const c of changes) console.log('  ' + c);
  }
  process.exit(check && changes.length ? 1 : 0);
}
