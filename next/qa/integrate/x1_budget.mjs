// X1-integrate: prints the exact load-budget bytes the precache test measures (wire estimate), against the ratchet.
//   node qa/integrate/x1_budget.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { NEXT, exists, readJson, parseSw, manifestFiles, sizeOf } from '../pwa/_lib.mjs';

const sw = parseSw();
const files = manifestFiles();
const gz = (rel) => zlib.gzipSync(fs.readFileSync(path.join(NEXT, rel)), { level: 6 }).length;
const wire = (rel) => (/\.(js|json|html|webmanifest)$/.test(rel) ? gz(rel) : sizeOf(rel));
const js = sw.entries.filter((e) => e.startsWith('src/')).reduce((n, e) => n + wire(e), 0);
const eager = [...files.eager].reduce((n, f) => n + (exists(f) ? wire(f) : 0), 0);
const lazy = [...files.lazy].reduce((n, f) => n + (exists(f) ? wire(f) : 0), 0);
const sfx = sw.entries.filter((e) => e.startsWith('assets/audio/sfx/')).reduce((n, e) => n + wire(e), 0);
const beforePrompt = js + eager + wire('assets/audio/manifest.json');
const initial = beforePrompt + lazy + sfx;
const r = readJson('qa/pwa/budget_ratchet.json');
const MB = 1048576;
console.log(JSON.stringify({ beforePromptBytes: beforePrompt, tapRatchetBytes: Math.floor(r.tapPromptMB * MB), headroomTap: Math.floor(r.tapPromptMB * MB) - beforePrompt,
  initialBytes: initial, initialMB: +(initial / MB).toFixed(4), ratchetMB: r.initialMB, ratchetBytes: Math.floor(r.initialMB * MB), headroomInitial: Math.floor(r.initialMB * MB) - initial }, null, 1));
