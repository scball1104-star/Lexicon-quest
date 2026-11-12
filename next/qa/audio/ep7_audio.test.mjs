// Episode 7 sfx and ambience through the pack fragment (E7-audio, docs/EPISODE7_PLAN.md 2.7, 8.4 and 13.3): every id of plan
// 2.7 is there (rime_bite in its three pitches), every file exists as a 22.05 kHz (or 16 kHz ambience) mono 16-bit WAV named
// ep7_* (lazy, never precached), durations match, every sfx is pack 'ep7' with a core fallback, no id clashes with the core
// manifest or the ep4, ep5 and ep6 fragments, the core ids the brief names (bell_thirteenth, bell_toll, ice, name_restore, kept,
// stone_name, moor_wind, archive_hush) are not redefined, every sound and track the ep7 code and the ep7 maps call resolves
// somewhere (E7-integrate's zero-"unknown id" target for audio), and index.js's mergeAudio adds the whole fragment to a copy of
// the core manifest (with ep4 to ep6 merged first, as the pack brings them up) without touching an existing id.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as frag from '../../src/data/ep7/audio.js';
import * as ep6 from '../../src/data/ep6/audio.js';
import * as ep5 from '../../src/data/ep5/audio.js';
import * as ep4 from '../../src/data/ep4/audio.js';
import { mergeAudio, audioFragment } from '../../src/data/ep7/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const corePath = path.join(NEXT, 'assets', 'audio', 'manifest.json');
const core = JSON.parse(fs.readFileSync(corePath, 'utf8'));

const PLAN_SFX = ['stone_hold', 'stone_letgo', 'frost_seal', 'rime_bite', 'rime_freeze', 'call_cast', 'farewell_read',
  'farewell_break'];
const PIPS = ['rime_bite_2', 'rime_bite_3'];   // rime_bite a whole step and two steps up (the brief)
const PLAN_AMB = { snow_wind: 'moor_wind', vault_hush: 'archive_hush' };
const PLAN_MUSIC_NEW = { palehaven: 'hollowmere', frostbound_vault: 'hollow', boss_phantom: 'boss_king' };
const PLAN_MUSIC_REUSED = ['mystery', 'high_moor', 'sorrow', 'triumph', 'battle', 'victory', 'gameover'];
const CORE_REUSED = [['sfx', 'bell_thirteenth'], ['sfx', 'bell_toll'], ['sfx', 'ice'], ['sfx', 'name_restore'], ['sfx', 'kept'],
  ['sfx', 'stone_name'], ['ambience', 'moor_wind'], ['ambience', 'archive_hush']];

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

for (const id of [...PLAN_SFX, ...PIPS]) assert.ok(frag.sfx[id] && frag.sfx[id].src, `plan 2.7 sfx ${id} missing from the fragment`);
for (const [id, fb] of Object.entries(PLAN_AMB)) {
  assert.ok(frag.ambience[id] && frag.ambience[id].src, `plan 2.7 ambience ${id} missing from the fragment`);
  assert.equal(frag.ambience[id].fallback, fb, `${id}: fallback ${fb} (plan 2.7)`);
}
for (const [id, fb] of Object.entries(PLAN_MUSIC_NEW)) assert.equal(frag.music[id] && frag.music[id].fallback, fb, `music ${id} falls back to ${fb}`);
// the core ids the brief names are reused, never redefined
for (const [kind, id] of CORE_REUSED) {
  assert.ok(!(id in frag[kind]), `${kind}.${id} is core: not redefined by ep7`);
  assert.ok(core[kind][id], `${kind}.${id} is a core id`);
}

let bytes = 0;
for (const [id, e] of Object.entries(frag.sfx)) {
  assert.ok(!(id in core.sfx), `sfx ${id} already in the core manifest`);
  for (const [nm, m] of [['ep4', ep4], ['ep5', ep5], ['ep6', ep6]]) assert.ok(!(id in m.sfx), `sfx ${id} already in the ${nm} fragment`);
  assert.equal(e.src, `assets/audio/sfx/ep7_${id}.wav`, `${id}: a lazy ep7_ file named after its id`);
  assert.equal(e.pack, 'ep7', `${id}: pack`);
  const f = core.sfx[e.fallback];
  assert.ok(f && (f.pack || 'core') === 'core' && (f.src || f.alias), `${id}: fallback ${e.fallback} is a core sound`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 22050, `${id}: 22.05 kHz`);
  assert.equal(w.bits, 16, `${id}: 16 bit`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration ${e.duration} vs file ${w.sec.toFixed(3)}`);
  assert.ok(w.sec > 0.2 && w.sec < 3.0, `${id}: ${w.sec.toFixed(2)} s`);
  bytes += w.bytes;
}
for (const [id, e] of Object.entries(frag.ambience)) {
  assert.ok(!(id in core.ambience), `ambience ${id} already in the core manifest`);
  assert.ok(!(id in ep4.ambience) && !(id in ep5.ambience) && !(id in ep6.ambience), `ambience ${id} already in an earlier fragment`);
  assert.equal(e.src, `assets/audio/ambience/ep7_${id}.wav`, `${id}: a lazy ep7_ file named after its id`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 16000, `${id}: 16 kHz`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration`);
  assert.ok(core.ambience[e.fallback], `${id}: fallback ${e.fallback} is a core bed`);
  bytes += w.bytes;
}
assert.deepEqual(frag.pack.sfx, Object.keys(frag.sfx).filter((id) => frag.sfx[id].src).sort(), 'pack.sfx lists every fragment sfx with a file');
assert.ok(bytes < 1.3e6, `ep7 sfx + ambience ${bytes} bytes`);
// the ep7_ files on disk are exactly the fragment's (no stray file)
const listed = (sub) => fs.readdirSync(path.join(NEXT, 'assets', 'audio', sub)).filter((f) => f.startsWith('ep7_')).map((f) => `assets/audio/${sub}/${f}`);
assert.deepEqual([...listed('sfx'), ...listed('ambience')].sort(),
  [...Object.values(frag.sfx), ...Object.values(frag.ambience)].map((e) => e.src).sort(), 'ep7_ files on disk = the fragment');

// every sound and track the Episode 7 code and maps call resolves: the ep7, ep6, ep5 or ep4 fragment (the ep7 pack brings the
// chain up first) or the core manifest.
const resolves = (kind, id) => {
  for (const m of [frag, ep6, ep5, ep4, core]) {
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
const walk = (dir) => { for (const f of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
  const rel = path.posix.join(dir, f.name);
  if (f.isDirectory()) { walk(rel); continue; }
  if (!f.name.endsWith('.js') || f.name === 'audio.js') continue;
  scan(fs.readFileSync(path.join(NEXT, rel), 'utf8'));
} };
walk('src/data/ep7');
const maps = fs.readdirSync(path.join(NEXT, 'src', 'data', 'maps')).filter((n) => n.startsWith('ep7_'));
for (const f of maps) scan(fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8'));
for (const [kind, ids] of Object.entries(called)) for (const id of ids) assert.ok(resolves(kind, id), `ep7 code calls ${kind} '${id}', which nothing defines`);
// the ids E7-story, E7-world and E7-battle name are among the calls
for (const id of ['rime_bite', 'call_cast', 'frost_seal', 'stone_hold', 'stone_letgo', 'rime_freeze', 'farewell_read', 'farewell_break']) {
  assert.ok(called.sfx.has(id), `the ep7 code calls sfx '${id}'`);
}
for (const id of ['palehaven', 'frostbound_vault', 'boss_phantom']) assert.ok(called.music.has(id), `the story or battles call music '${id}'`);
for (const id of PLAN_MUSIC_REUSED) assert.ok(id in core.music, `reused track ${id} is a core music id`);
assert.ok(ep6.music.zephyr, 'zephyr rides the ep6 fragment');

// the merge index.js performs, on a copy of the core manifest with the ep4 to ep6 fragments in: everything added, nothing
// overwritten
const copy = JSON.parse(JSON.stringify(core));
mergeAudio(copy, audioFragment(ep4), 'ep4');
mergeAudio(copy, audioFragment(ep5), 'ep5');
mergeAudio(copy, audioFragment(ep6), 'ep6');
const before = JSON.parse(JSON.stringify(copy));
const r = mergeAudio(copy, audioFragment(frag));
assert.deepEqual(r.clashes, [], 'no clashes');
for (const kind of ['music', 'sfx', 'ambience']) {
  for (const id of Object.keys(frag[kind])) assert.equal(copy[kind][id], frag[kind][id], `${kind}.${id} merged`);
  for (const id of Object.keys(before[kind])) assert.deepEqual(copy[kind][id], before[kind][id], `${kind}.${id} untouched`);
}
assert.deepEqual(copy.packs.ep7, frag.pack, 'packs.ep7');
assert.ok(!/ep7_/.test(fs.readFileSync(corePath, 'utf8')), 'assets/audio/manifest.json mentions no ep7_ file');
console.log(`ok - ep7 audio fragment: ${Object.keys(frag.sfx).length} sfx, ${Object.keys(frag.ambience).length} ambience, ` +
  `${bytes} bytes; calls checked (${maps.length} ep7 maps on disk): sfx ${[...called.sfx].sort().join(' ')}; ` +
  `music ${[...called.music].sort().join(' ')}; ambience ${[...called.ambience].sort().join(' ') || '(none yet)'}`);
