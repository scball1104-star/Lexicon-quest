// Episode 8 sfx and ambience through the pack fragment (E8-audio, docs/EPISODE8_PLAN.md 2.7, 8.4 and 13.3): every id of plan
// 2.7 is there, every file exists as a 22.05 kHz (or 16 kHz ambience) mono 16-bit WAV named ep8_* (lazy, never precached),
// durations match, every sfx is pack 'ep8' with a core fallback, no id clashes with the core manifest or the ep4 to ep7
// fragments, the reused ids (bell_toll, bell_thirteenth, name_restore, kept, Episode 4's Answer sounds, sky_wind, palehaven,
// orrery and the core tracks) are referenced, never redefined, the silence_gather jingle (the ducking door) plays the same file,
// every sound and track the ep8 code and the ep8 maps call resolves somewhere (none are written yet in wave 8c: the scan grows
// as they land), and index.js-style mergeAudio adds the whole fragment to a copy of the core manifest (with ep4 to ep7 merged
// first) without touching an existing id.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as frag from '../../src/data/ep8/audio.js';
import * as ep7 from '../../src/data/ep7/audio.js';
import * as ep6 from '../../src/data/ep6/audio.js';
import * as ep5 from '../../src/data/ep5/audio.js';
import * as ep4 from '../../src/data/ep4/audio.js';
import { mergeAudio, audioFragment } from '../../src/data/ep4/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const corePath = path.join(NEXT, 'assets', 'audio', 'manifest.json');
const core = JSON.parse(fs.readFileSync(corePath, 'utf8'));
const EARLIER = [['ep4', ep4], ['ep5', ep5], ['ep6', ep6], ['ep7', ep7]];

const PLAN_SFX = ['page_open', 'page_fold', 'rub_out', 'ink_slide', 'read_cast', 'unwrite_read', 'unwrite_break', 'silence_gather'];
const PLAN_AMB = { library_hush: 'archive_hush' };
const CORE_REUSED = [['sfx', 'bell_toll'], ['sfx', 'bell_thirteenth'], ['sfx', 'name_restore'], ['sfx', 'kept'],
  ['ambience', 'archive_hush'], ['music', 'orrery'], ['music', 'mystery'], ['music', 'sorrow'], ['music', 'triumph'],
  ['music', 'battle'], ['music', 'victory'], ['music', 'gameover'], ['music', 'willowmere'], ['music', 'title']];

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

for (const id of PLAN_SFX) assert.ok(frag.sfx[id] && frag.sfx[id].src, `plan 2.7 sfx ${id} missing from the fragment`);
for (const [id, fb] of Object.entries(PLAN_AMB)) {
  assert.ok(frag.ambience[id] && frag.ambience[id].src, `plan 2.7 ambience ${id} missing from the fragment`);
  assert.equal(frag.ambience[id].fallback, fb, `${id}: fallback ${fb} (plan 2.7)`);
}
for (const [kind, id] of CORE_REUSED) {
  assert.ok(!(id in (frag[kind] || {})), `${kind}.${id} is core: not redefined by ep8`);
  assert.ok(core[kind][id], `${kind}.${id} is a core id`);
}
// Episode 4's Answer sounds and the ep6 / ep7 ids Episode 8 reuses stay theirs
for (const id of Object.keys(ep4.sfx)) assert.ok(!(id in frag.sfx), `ep4 sfx ${id} not redefined`);
assert.ok(ep6.ambience.sky_wind && !('sky_wind' in frag.ambience), 'sky_wind rides the ep6 fragment');
assert.ok(ep7.music.palehaven && !('palehaven' in frag.music), 'palehaven rides the ep7 fragment');

let bytes = 0;
for (const [id, e] of Object.entries(frag.sfx)) {
  assert.ok(!(id in core.sfx), `sfx ${id} already in the core manifest`);
  for (const [nm, m] of EARLIER) assert.ok(!(id in m.sfx), `sfx ${id} already in the ${nm} fragment`);
  assert.equal(e.src, `assets/audio/sfx/ep8_${id}.wav`, `${id}: a lazy ep8_ file named after its id`);
  assert.equal(e.pack, 'ep8', `${id}: pack`);
  const f = core.sfx[e.fallback];
  assert.ok(f && (f.pack || 'core') === 'core' && (f.src || f.alias), `${id}: fallback ${e.fallback} is a core sound`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 22050, `${id}: 22.05 kHz`);
  assert.equal(w.bits, 16, `${id}: 16 bit`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration ${e.duration} vs file ${w.sec.toFixed(3)}`);
  assert.ok(w.sec > 0.2 && w.sec < 3.5, `${id}: ${w.sec.toFixed(2)} s`);
  bytes += w.bytes;
}
for (const [id, e] of Object.entries(frag.ambience)) {
  assert.ok(!(id in core.ambience), `ambience ${id} already in the core manifest`);
  for (const [nm, m] of EARLIER) assert.ok(!(id in (m.ambience || {})), `ambience ${id} already in the ${nm} fragment`);
  assert.equal(e.src, `assets/audio/ambience/ep8_${id}.wav`, `${id}: a lazy ep8_ file named after its id`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 16000, `${id}: 16 kHz`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration`);
  assert.ok(core.ambience[e.fallback], `${id}: fallback ${e.fallback} is a core bed`);
  bytes += w.bytes;
}
// the ducking door: silence_gather is also a jingle on the same file, so a scene can play it with { duckMusic: 0.3 }
assert.ok(frag.jingles && frag.jingles.silence_gather, 'jingles.silence_gather');
assert.equal(frag.jingles.silence_gather.src, frag.sfx.silence_gather.src, 'the jingle plays the sfx file');
assert.equal(frag.jingles.silence_gather.duration, frag.sfx.silence_gather.duration, 'jingle duration');
assert.ok(!(core.jingles && core.jingles.silence_gather), 'no core jingle silence_gather');
assert.deepEqual(frag.pack.sfx, Object.keys(frag.sfx).filter((id) => frag.sfx[id].src).sort(), 'pack.sfx lists every fragment sfx with a file');
assert.ok(bytes < 0.9e6, `ep8 sfx + ambience ${bytes} bytes`);
// the ep8_ files on disk are exactly the fragment's (no stray file)
const listed = (sub) => fs.readdirSync(path.join(NEXT, 'assets', 'audio', sub)).filter((f) => f.startsWith('ep8_')).map((f) => `assets/audio/${sub}/${f}`);
assert.deepEqual([...listed('sfx'), ...listed('ambience')].sort(),
  [...Object.values(frag.sfx), ...Object.values(frag.ambience)].map((e) => e.src).sort(), 'ep8_ files on disk = the fragment');

// every sound and track the Episode 8 code and maps call resolves (the ep8 fragment, the earlier ones, or core)
const resolves = (kind, id) => {
  for (const m of [frag, ep7, ep6, ep5, ep4, core]) {
    let e = m[kind] && m[kind][id];
    if (e && e.alias) e = (m[kind] && m[kind][e.alias]) || (core[kind] && core[kind][e.alias]);
    if (e && (e.src || e.srcs)) return true;
  }
  return false;
};
const called = { sfx: new Set(), music: new Set(), ambience: new Set() };
const scan = (t) => {
  for (const m of t.matchAll(/\bsfx\(\s*'([a-z0-9_]+)'/g)) called.sfx.add(m[1]);
  for (const m of t.matchAll(/\b(?:sfx|telegraphSfx|breakSfx|castSfx)\s*:\s*'([a-z0-9_]+)'/g)) called.sfx.add(m[1]);
  for (const m of t.matchAll(/\bmusic(?:\(|\s*:)\s*'([a-z0-9_]+)'/g)) called.music.add(m[1]);
  for (const m of t.matchAll(/\bambience(?:\(|\s*:)\s*'([a-z0-9_]+)'/g)) called.ambience.add(m[1]);
};
const walk = (dir) => {
  const abs = path.join(NEXT, dir);
  if (!fs.existsSync(abs)) return;
  for (const f of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.posix.join(dir, f.name);
    if (f.isDirectory()) { walk(rel); continue; }
    if (!f.name.endsWith('.js') || f.name === 'audio.js') continue;
    scan(fs.readFileSync(path.join(NEXT, rel), 'utf8'));
  }
};
walk('src/data/ep8');
const maps = fs.readdirSync(path.join(NEXT, 'src', 'data', 'maps')).filter((n) => n.startsWith('ep8_'));
for (const f of maps) scan(fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8'));
for (const [kind, ids] of Object.entries(called)) for (const id of ids) assert.ok(resolves(kind, id), `ep8 code calls ${kind} '${id}', which nothing defines`);

// the merge the pack performs, on a copy of the core manifest with the ep4 to ep7 fragments in: all added, nothing overwritten
const copy = JSON.parse(JSON.stringify(core));
for (const [nm, m] of EARLIER) mergeAudio(copy, audioFragment(m), nm);
const before = JSON.parse(JSON.stringify(copy));
const r = mergeAudio(copy, audioFragment(frag), 'ep8');
assert.deepEqual(r.clashes, [], 'no clashes');
for (const kind of ['music', 'sfx', 'ambience', 'jingles']) {
  for (const id of Object.keys(frag[kind] || {})) assert.equal(copy[kind][id], frag[kind][id], `${kind}.${id} merged`);
  for (const id of Object.keys(before[kind] || {})) assert.deepEqual(copy[kind][id], before[kind][id], `${kind}.${id} untouched`);
}
assert.deepEqual(copy.packs.ep8, frag.pack, 'packs.ep8');
assert.ok(!/ep8_/.test(fs.readFileSync(corePath, 'utf8')), 'assets/audio/manifest.json mentions no ep8_ file');
console.log(`ok - ep8 audio fragment: ${Object.keys(frag.sfx).length} sfx, ${Object.keys(frag.ambience).length} ambience, ` +
  `${bytes} bytes; calls checked (${maps.length} ep8 maps on disk): sfx ${[...called.sfx].sort().join(' ') || '(none yet)'}; ` +
  `music ${[...called.music].sort().join(' ') || '(none yet)'}; ambience ${[...called.ambience].sort().join(' ') || '(none yet)'}`);
