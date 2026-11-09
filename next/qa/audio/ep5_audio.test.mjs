// Episode 5 sfx and ambience through the pack fragment (E5-audio, docs/EPISODE5_PLAN.md 2.7, 8.4 and 13.3): every id of plan
// 2.7 is there, every file exists as a 22.05 kHz (or 16 kHz ambience) mono 16-bit WAV named ep5_* (lazy, never precached),
// durations match, every sfx is pack 'ep5' with a core fallback, aliases resolve, no id clashes with the core manifest or the
// ep4 fragment, every sound and track the ep5 code calls resolves somewhere, and index.js's mergeAudio adds the whole
// fragment to a copy of the core manifest without touching an existing id.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as frag from '../../src/data/ep5/audio.js';
import * as ep4 from '../../src/data/ep4/audio.js';
import { mergeAudio, audioFragment } from '../../src/data/ep5/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const corePath = path.join(NEXT, 'assets', 'audio', 'manifest.json');
const core = JSON.parse(fs.readFileSync(corePath, 'utf8'));

const PLAN_SFX = ['sun_dial', 'sand_run', 'sand_hold', 'sky_turn', 'prophecy_read', 'prophecy_break', 'lamp_roll', 'caravan_bell'];
const PLAN_AMB = ['desert_wind', 'well_hush'];
const PLAN_MUSIC_REUSED = ['mystery', 'orrery', 'ash_road', 'sorrow', 'triumph', 'battle', 'victory', 'gameover'];

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
for (const id of PLAN_AMB) assert.ok(frag.ambience[id], `plan 2.7 ambience ${id} missing from the fragment`);
// sky_turn: a night and a day variant (the brief), and an alias for a caller that names the night explicitly
assert.ok(frag.sfx.sky_turn_day && frag.sfx.sky_turn_day.src !== frag.sfx.sky_turn.src, 'sky_turn has a distinct day variant');
assert.equal(frag.sfx.sky_turn_night.alias, 'sky_turn', 'sky_turn_night is the night (sky_turn)');
// well_hush is the core archive_hush bed (plan 2.7)
assert.equal(frag.ambience.well_hush.alias, 'archive_hush');
assert.ok(core.ambience.archive_hush && core.ambience.archive_hush.src, 'archive_hush is a core bed');

let bytes = 0;
for (const [id, e] of Object.entries(frag.sfx)) {
  assert.ok(!(id in core.sfx), `sfx ${id} already in the core manifest`);
  assert.ok(!(id in ep4.sfx), `sfx ${id} already in the ep4 fragment`);
  if (e.alias) { assert.ok(frag.sfx[e.alias] && frag.sfx[e.alias].src, `${id}: alias ${e.alias} resolves in the fragment`); continue; }
  assert.match(e.src, /^assets\/audio\/sfx\/ep5_[a-z_]+\.wav$/, `${id}: src is a lazy ep5_ file`);
  assert.equal(e.src, `assets/audio/sfx/ep5_${id}.wav`, `${id}: file named after its id`);
  assert.equal(e.pack, 'ep5', `${id}: pack`);
  const f = core.sfx[e.fallback];
  assert.ok(f && (f.pack || 'core') === 'core' && (f.src || f.alias), `${id}: fallback ${e.fallback} is a core sound`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.equal(w.sr, 22050, `${id}: 22.05 kHz`);
  assert.equal(w.bits, 16, `${id}: 16 bit`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration ${e.duration} vs file ${w.sec.toFixed(3)}`);
  assert.ok(w.sec > 0.3 && w.sec < 4.5, `${id}: ${w.sec.toFixed(2)} s`);
  bytes += w.bytes;
}
for (const [id, e] of Object.entries(frag.ambience)) {
  assert.ok(!(id in core.ambience), `ambience ${id} already in the core manifest`);
  assert.ok(!(id in ep4.ambience), `ambience ${id} already in the ep4 fragment`);
  if (e.alias) continue;
  assert.match(e.src, /^assets\/audio\/ambience\/ep5_[a-z_]+\.wav$/, `${id}: src is a lazy ep5_ file`);
  const w = wav(e.src);
  assert.equal(w.ch, 1, `${id}: mono`);
  assert.ok(w.sr === 22050 || w.sr === 16000, `${id}: rate`);
  assert.ok(Math.abs(w.sec - e.duration) < 0.002, `${id}: duration`);
  assert.ok(core.ambience[e.fallback], `${id}: fallback ${e.fallback} is a core bed`);
  bytes += w.bytes;
}
assert.deepEqual(frag.pack.sfx, Object.keys(frag.sfx).filter((id) => frag.sfx[id].src).sort(), 'pack.sfx lists every fragment sfx with a file');
assert.ok(bytes < 1.5e6, `ep5 sfx + ambience ${bytes} bytes`);

// every sound and track the Episode 5 code calls resolves: the ep5 fragment, the ep4 fragment (the ep5 pack brings ep4 up
// first) or the core manifest
const resolves = (kind, id) => {
  for (const m of [frag, ep4, core]) {
    let e = m[kind] && m[kind][id];
    if (e && e.alias) e = (m[kind] && m[kind][e.alias]) || (core[kind] && core[kind][e.alias]);
    if (e && (e.src || e.srcs)) return true;
  }
  return false;
};
const called = { sfx: new Set(), music: new Set(), ambience: new Set() };
const walk = (dir) => { for (const f of fs.readdirSync(path.join(NEXT, dir), { withFileTypes: true })) {
  const rel = path.posix.join(dir, f.name);
  if (f.isDirectory()) { walk(rel); continue; }
  if (!f.name.endsWith('.js') || f.name === 'audio.js') continue;
  const t = fs.readFileSync(path.join(NEXT, rel), 'utf8');
  for (const m of t.matchAll(/\bsfx\(\s*'([a-z0-9_]+)'/g)) called.sfx.add(m[1]);
  for (const m of t.matchAll(/\b(?:sfx|telegraphSfx|mirrorTurn)\s*:\s*'([a-z0-9_]+)'/g)) called.sfx.add(m[1]);
  for (const m of t.matchAll(/\?\s*'([a-z0-9_]+)'\s*:\s*'([a-z0-9_]+)'\)/g)) for (const id of [m[1], m[2]]) if (/_(roll|push)$/.test(id)) called.sfx.add(id);
  for (const m of t.matchAll(/\bmusic(?:\(|\s*:)\s*'([a-z0-9_]+)'/g)) called.music.add(m[1]);
  for (const m of t.matchAll(/\bambience(?:\(|\s*:)\s*'([a-z0-9_]+)'/g)) called.ambience.add(m[1]);
} };
walk('src/data/ep5');
for (const f of fs.readdirSync(path.join(NEXT, 'src', 'data', 'maps')).filter((n) => n.startsWith('ep5_'))) {
  const t = fs.readFileSync(path.join(NEXT, 'src', 'data', 'maps', f), 'utf8');
  for (const m of t.matchAll(/\bmusic:\s*'([a-z0-9_]+)'/g)) called.music.add(m[1]);
  for (const m of t.matchAll(/\bambience:\s*'([a-z0-9_]+)'/g)) called.ambience.add(m[1]);
}
for (const [kind, ids] of Object.entries(called)) for (const id of ids) assert.ok(resolves(kind, id), `ep5 code calls ${kind} '${id}', which nothing defines`);
for (const id of ['saffron', 'labyrinth', 'boss_oracle']) assert.ok(called.music.has(id), `the story or battles call music '${id}'`);
// victory and gameover are core ids whose sound is a jingle (src null): they must exist, not necessarily hold a file
for (const id of PLAN_MUSIC_REUSED) assert.ok(id in core.music, `reused track ${id} is a core music id`);
assert.ok(ep4.music.valewyn, 'valewyn rides the ep4 fragment');

// the merge index.js performs, on a copy of the core manifest with the ep4 fragment in: everything added, nothing overwritten
const copy = JSON.parse(JSON.stringify(core));
mergeAudio(copy, audioFragment(ep4), 'ep4');
const before = JSON.parse(JSON.stringify(copy));
const r = mergeAudio(copy, audioFragment(frag));
assert.deepEqual(r.clashes, [], 'no clashes');
for (const kind of ['music', 'sfx', 'ambience']) {
  for (const id of Object.keys(frag[kind])) assert.equal(copy[kind][id], frag[kind][id], `${kind}.${id} merged`);
  for (const id of Object.keys(before[kind])) assert.deepEqual(copy[kind][id], before[kind][id], `${kind}.${id} untouched`);
}
assert.deepEqual(copy.packs.ep5, frag.pack, 'packs.ep5');
// the core manifest file names no Episode 5 file
assert.ok(!/ep5_/.test(fs.readFileSync(corePath, 'utf8')), 'assets/audio/manifest.json mentions no ep5_ file');
console.log(`ok - ep5 audio fragment: ${Object.keys(frag.sfx).length} sfx (${frag.pack.sfx.length} files), ` +
  `${Object.keys(frag.ambience).length} ambience, ${bytes} bytes; calls checked: ${called.sfx.size} sfx, ${called.music.size} music, ` +
  `${called.ambience.size} ambience`);
