// Episode 6 sfx and ambience through the pack fragment (E6-audio, docs/EPISODE6_PLAN.md 2.7, 8.4 and 13.3): every id of plan
// 2.7 is there, every file exists as a 22.05 kHz (or 16 kHz ambience) mono 16-bit WAV named ep6_* (lazy, never precached),
// durations match, every sfx is pack 'ep6' with a core fallback, no id clashes with the core manifest or the ep4 and ep5
// fragments, the core ids the brief names (thunder, wind_valley, moor_wind) are not redefined, every sound and track the ep6
// code and the ep6 maps call resolves somewhere, and index.js's mergeAudio adds the whole fragment to a copy of the core
// manifest (with ep4 and ep5 merged first, as the pack brings them up) without touching an existing id.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as frag from '../../src/data/ep6/audio.js';
import * as ep5 from '../../src/data/ep5/audio.js';
import * as ep4 from '../../src/data/ep4/audio.js';
import { mergeAudio, audioFragment } from '../../src/data/ep6/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const corePath = path.join(NEXT, 'assets', 'audio', 'manifest.json');
const core = JSON.parse(fs.readFileSync(corePath, 'utf8'));

const PLAN_SFX = ['gust_carry', 'gust_land', 'vane_turn', 'mooring_catch', 'gale_gust', 'anchor_set', 'rewrite_read',
  'rewrite_break', 'signal_lamp'];
const PLAN_AMB = { sky_wind: 'wind_valley', storm_rumble: 'moor_wind' };
const PLAN_MUSIC_NEW = { zephyr: 'the_downs', storm_observatory: 'court', boss_scribe: 'boss_king' };
const PLAN_MUSIC_REUSED = ['mystery', 'high_moor', 'sorrow', 'triumph', 'battle', 'victory', 'gameover'];

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
for (const [id, fb] of Object.entries(PLAN_MUSIC_NEW)) assert.equal(frag.music[id] && frag.music[id].fallback, fb, `music ${id} falls back to ${fb}`);
// the core ids the brief names are reused, never redefined
for (const [kind, id] of [['sfx', 'thunder'], ['ambience', 'wind_valley'], ['ambience', 'moor_wind']]) {
  assert.ok(!(id in frag[kind]), `${kind}.${id} is core: not redefined by ep6`);
  assert.ok(core[kind][id], `${kind}.${id} is a core id`);
}

let bytes = 0;
for (const [id, e] of Object.entries(frag.sfx)) {
  assert.ok(!(id in core.sfx), `sfx ${id} already in the core manifest`);
  assert.ok(!(id in ep4.sfx), `sfx ${id} already in the ep4 fragment`);
  assert.ok(!(id in ep5.sfx), `sfx ${id} already in the ep5 fragment`);
  assert.match(e.src, /^assets\/audio\/sfx\/ep6_[a-z_]+\.wav$/, `${id}: src is a lazy ep6_ file`);
  assert.equal(e.src, `assets/audio/sfx/ep6_${id}.wav`, `${id}: file named after its id`);
  assert.equal(e.pack, 'ep6', `${id}: pack`);
  const f = core.sfx[e.fallback];
  assert.ok(f && (f.pack || 'core') === 'core' && (f.src || f.alias), `${id}: fallback ${e.fallback} is a core sound`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 22050, `${id}: 22.05 kHz`);
  assert.equal(w.bits, 16, `${id}: 16 bit`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration ${e.duration} vs file ${w.sec.toFixed(3)}`);
  assert.ok(w.sec > 0.25 && w.sec < 3.0, `${id}: ${w.sec.toFixed(2)} s`);
  bytes += w.bytes;
}
for (const [id, e] of Object.entries(frag.ambience)) {
  assert.ok(!(id in core.ambience), `ambience ${id} already in the core manifest`);
  assert.ok(!(id in ep4.ambience) && !(id in ep5.ambience), `ambience ${id} already in an earlier fragment`);
  assert.equal(e.src, `assets/audio/ambience/ep6_${id}.wav`, `${id}: a lazy ep6_ file named after its id`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 16000, `${id}: 16 kHz`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration`);
  assert.ok(core.ambience[e.fallback], `${id}: fallback ${e.fallback} is a core bed`);
  bytes += w.bytes;
}
assert.deepEqual(frag.pack.sfx, Object.keys(frag.sfx).filter((id) => frag.sfx[id].src).sort(), 'pack.sfx lists every fragment sfx with a file');
assert.ok(bytes < 1.3e6, `ep6 sfx + ambience ${bytes} bytes`);

// every sound and track the Episode 6 code and maps call resolves: the ep6, ep5 or ep4 fragment (the ep6 pack brings ep5 and
// ep4 up first) or the core manifest. This is E6-integrate's zero-"unknown id" target for audio.
const resolves = (kind, id) => {
  for (const m of [frag, ep5, ep4, core]) {
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
  for (const m of t.matchAll(/\?\s*'([a-z0-9_]+)'\s*:\s*'([a-z0-9_]+)'/g)) for (const id of [m[1], m[2]]) if (PLAN_SFX.includes(id)) called.sfx.add(id);
  for (const m of t.matchAll(/\bmusic(?:\(|\s*:)\s*'([a-z0-9_]+)'/g)) called.music.add(m[1]);
  for (const m of t.matchAll(/\bambience(?:\(|\s*:)\s*'([a-z0-9_]+)'/g)) called.ambience.add(m[1]);
};
const walk = (dir) => { for (const f of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
  const rel = path.posix.join(dir, f.name);
  if (f.isDirectory()) { walk(rel); continue; }
  if (!f.name.endsWith('.js') || f.name === 'audio.js') continue;
  scan(fs.readFileSync(path.join(NEXT, rel), 'utf8'));
} };
walk('src/data/ep6');
const maps = fs.readdirSync(path.join(NEXT, 'src', 'data', 'maps')).filter((n) => n.startsWith('ep6_'));
for (const f of maps) scan(fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8'));
for (const [kind, ids] of Object.entries(called)) for (const id of ids) assert.ok(resolves(kind, id), `ep6 code calls ${kind} '${id}', which nothing defines`);
for (const id of ['zephyr', 'storm_observatory', 'boss_scribe']) assert.ok(called.music.has(id), `the story or battles call music '${id}'`);
for (const id of PLAN_MUSIC_REUSED) assert.ok(id in core.music, `reused track ${id} is a core music id`);
assert.ok(ep5.music.saffron, 'saffron rides the ep5 fragment');

// the merge index.js performs, on a copy of the core manifest with the ep4 and ep5 fragments in: everything added, nothing
// overwritten
const copy = JSON.parse(JSON.stringify(core));
mergeAudio(copy, audioFragment(ep4), 'ep4');
mergeAudio(copy, audioFragment(ep5), 'ep5');
const before = JSON.parse(JSON.stringify(copy));
const r = mergeAudio(copy, audioFragment(frag));
assert.deepEqual(r.clashes, [], 'no clashes');
for (const kind of ['music', 'sfx', 'ambience']) {
  for (const id of Object.keys(frag[kind])) assert.equal(copy[kind][id], frag[kind][id], `${kind}.${id} merged`);
  for (const id of Object.keys(before[kind])) assert.deepEqual(copy[kind][id], before[kind][id], `${kind}.${id} untouched`);
}
assert.deepEqual(copy.packs.ep6, frag.pack, 'packs.ep6');
assert.ok(!/ep6_/.test(fs.readFileSync(corePath, 'utf8')), 'assets/audio/manifest.json mentions no ep6_ file');
console.log(`ok - ep6 audio fragment: ${Object.keys(frag.sfx).length} sfx, ${Object.keys(frag.ambience).length} ambience, ` +
  `${bytes} bytes; calls checked (${maps.length} ep6 maps on disk): sfx ${[...called.sfx].sort().join(' ')}; ` +
  `music ${[...called.music].sort().join(' ')}; ambience ${[...called.ambience].sort().join(' ') || '(none yet)'}`);
