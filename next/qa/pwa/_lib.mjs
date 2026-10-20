// Shared helpers for the PWA tests (not a test file itself).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (rel) => fs.readFileSync(path.join(NEXT, rel), 'utf8');
export const exists = (rel) => fs.existsSync(path.join(NEXT, rel));
export const readJson = (rel) => JSON.parse(read(rel));
export const sizeOf = (rel) => fs.statSync(path.join(NEXT, rel)).size;

/** The PRECACHE entries and SHELL_VERSION that tools/pwa/build_pwa.py wrote into sw.js. */
export function parseSw() {
  const text = read('sw.js');
  const block = text.slice(text.indexOf('// build_pwa:begin'), text.indexOf('// build_pwa:end'));
  const version = (/const SHELL_VERSION = '([^']*)'/.exec(block) || [])[1];
  const list = block.slice(block.indexOf('const PRECACHE = ['));
  const entries = [...list.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);
  return { text, version, entries };
}

/** PNG width, height and color type from the IHDR chunk, or null when the file is not a PNG. */
export function pngSize(rel) {
  const b = fs.readFileSync(path.join(NEXT, rel));
  if (b.length < 26 || b.toString('latin1', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

/**
 * Every file the game manifest (assets/manifest.json) loads, as paths relative to next/ (may start with "../"),
 * split into { eager, lazy } sets. Atlas and font JSON pull in their sidecar image.
 */
export function manifestFiles() {
  const m = readJson('assets/manifest.json');
  const lazyIds = new Set(Object.values(m.lazy || {}).flat());
  const eager = new Set(), lazy = new Set();
  const norm = (p) => path.posix.normalize(p);
  const add = (id, rel) => (lazyIds.has(id) ? lazy : eager).add(norm(rel));
  for (const kind of ['images', 'json', 'atlases', 'fonts']) {
    for (const [id, e] of Object.entries(m[kind] || {})) {
      const rel = typeof e === 'string' ? e : e.path;
      add(id, rel);
      if ((kind === 'atlases' || kind === 'fonts') && exists(rel)) {
        const j = readJson(rel);
        if (j.image) add(id, path.posix.join(path.posix.dirname(rel), j.image));
      }
    }
  }
  for (const rel of Object.values(m.touch || {})) eager.add(norm(rel));
  return { eager, lazy, manifest: m, lazyIds };
}
