// Episode 4 sfx and ambience through the pack fragment (E4-audio, docs/EPISODE4_PLAN.md 8.4 and 13.3): every id of plan 2.7
// is there, every file exists as a 22.05 kHz (or 16 kHz ambience) mono 16-bit WAV named ep4_* (lazy, never precached),
// durations match, every sfx is pack 'ep4' with a core fallback, no id clashes with assets/audio/manifest.json, and
// index.js's mergeAudio adds the whole fragment to a copy of the core manifest without touching an existing id.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as frag from '../../src/data/ep4/audio.js';
import { mergeAudio, audioFragment } from '../../src/data/ep4/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const corePath = path.join(NEXT, 'assets', 'audio', 'manifest.json');
const core = JSON.parse(fs.readFileSync(corePath, 'utf8'));

const PLAN_SFX = ['tide_wheel', 'water_rise', 'water_drain', 'seal_wash', 'seal_stamp', 'decree_void', 'decree_unroll', 'bell_drowned'];
const PLAN_AMB = ['canal_rain'];

function wav(file) {
  const b = fs.readFileSync(path.join(NEXT, file));
  assert.equal(b.toString('latin1', 0, 4), 'RIFF', `${file}: RIFF`);
  assert.equal(b.toString('latin1', 8, 12), 'WAVE', `${file}: WAVE`);
  let pos = 12, fmt = null, data = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString('latin1', pos, pos + 4), len = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(pos + 10), sr: b.readUInt32LE(pos + 12), bits: b.readUInt16LE(pos + 22) };
    if (id === 'data') data = len;
    pos += 8 + len + (len & 1);
  }
  assert.ok(fmt && data, `${file}: fmt and data chunks`);
  return { ...fmt, sec: data / (fmt.ch * fmt.bits / 8) / fmt.sr, bytes: b.length };
}

for (const id of PLAN_SFX) assert.ok(frag.sfx[id], `plan 2.7 sfx ${id} missing from the fragment`);
for (const id of PLAN_AMB) assert.ok(frag.ambience[id], `plan 2.7 ambience ${id} missing from the fragment`);

let bytes = 0;
for (const [id, e] of Object.entries(frag.sfx)) {
  assert.ok(!(id in core.sfx), `sfx ${id} already in the core manifest`);
  assert.match(e.src, /^assets\/audio\/sfx\/ep4_[a-z_]+\.wav$/, `${id}: src is a lazy ep4_ file`);
  assert.equal(e.pack, 'ep4', `${id}: pack`);
  const f = core.sfx[e.fallback];
  assert.ok(f && (f.pack || 'core') === 'core' && (f.src || f.alias), `${id}: fallback ${e.fallback} is a core sound`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 22050, `${id}: 22.05 kHz`);
  assert.equal(w.bits, 16, `${id}: 16 bit`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration ${e.duration} vs file ${w.sec.toFixed(3)}`);
  bytes += w.bytes;
}
for (const [id, e] of Object.entries(frag.ambience)) {
  assert.ok(!(id in core.ambience), `ambience ${id} already in the core manifest`);
  assert.match(e.src, /^assets\/audio\/ambience\/ep4_[a-z_]+\.wav$/, `${id}: src is a lazy ep4_ file`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.ok(w.sr === 22050 || w.sr === 16000, `${id}: rate`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration`);
  assert.ok(core.ambience[e.fallback], `${id}: fallback ${e.fallback} is a core bed`);
  bytes += w.bytes;
}
assert.deepEqual(frag.pack.sfx, Object.keys(frag.sfx).sort(), 'pack.sfx lists every fragment sfx');
assert.ok(bytes < 2.0e6, `ep4 sfx + ambience ${bytes} bytes`);

// the merge index.js performs, on a copy: everything added, nothing overwritten, the pack listed
const copy = JSON.parse(JSON.stringify(core));
const r = mergeAudio(copy, audioFragment(frag));
assert.deepEqual(r.clashes, [], 'no clashes');
for (const kind of ['music', 'sfx', 'ambience']) {
  for (const id of Object.keys(frag[kind])) assert.equal(copy[kind][id], frag[kind][id], `${kind}.${id} merged`);
  for (const id of Object.keys(core[kind])) assert.deepEqual(copy[kind][id], core[kind][id], `${kind}.${id} untouched`);
}
assert.deepEqual(copy.packs.ep4, frag.pack, 'packs.ep4');
// the core manifest file names no Episode 4 file
assert.ok(!/ep4_/.test(fs.readFileSync(corePath, 'utf8')), 'assets/audio/manifest.json mentions no ep4_ file');
console.log(`ok - ep4 audio fragment: ${Object.keys(frag.sfx).length} sfx, ${Object.keys(frag.ambience).length} ambience, ${bytes} bytes`);
