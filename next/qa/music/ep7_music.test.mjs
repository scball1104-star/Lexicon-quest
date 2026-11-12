// Episode 7 music (E7-audio, docs/EPISODE7_PLAN.md 8.1): the three tracker pieces exist as ep7_*.mp3 with a gapless LAME tag,
// their sidecars agree with the decoded length, they loop on the 60 ms guard, and the pack fragment (src/data/ep7/audio.js)
// carries the same loop points, the plan's fallback (a playable core track) and a volume near unity. The plan's lengths:
// palehaven 90 to 100 s, frostbound_vault about 90 s, boss_phantom 100 to 120 s. The songs carry the name motif where the
// plan puts it (checked on the song sources: the iceglass bell, the cello and its bell echo, the strings and the town quote).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { music } from '../../src/data/ep7/audio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const core = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));

const TRACKS = {
  palehaven: { file: 'ep7_palehaven', minSec: 90, maxSec: 100, bpm: 72, fallback: 'hollowmere', key: 'D dorian' },
  // the plan's "90 s": 24 bars at 66 (three 8-bar spans, one stopped bell each)
  frostbound_vault: { file: 'ep7_frostbound_vault', minSec: 85, maxSec: 100, bpm: 66, fallback: 'hollow', key: 'A aeolian' },
  boss_phantom: { file: 'ep7_boss_phantom', minSec: 100, maxSec: 120, bpm: 132, fallback: 'boss_king', key: 'F minor' },
};
const SR = 44100;

function parseMp3(buf) {
  let pos = 0, frames = 0, info = null;
  while (pos + 4 <= buf.length) {
    const h = buf.readUInt32BE(pos);
    assert.equal((h >>> 21) & 0x7ff, 0x7ff, `lost MP3 sync at byte ${pos}`);
    assert.equal((h >>> 12) & 15, 10, '160 kbps expected');
    assert.equal((h >>> 10) & 3, 0, '44.1 kHz expected');
    const flen = Math.floor((144 * 160000) / SR) + ((h >>> 9) & 1);
    if (frames === 0) {
      const tag = buf.subarray(pos + 36, pos + 40).toString('latin1');
      if (tag === 'Info' || tag === 'Xing') {
        const v = buf.readUIntBE(pos + 177, 3);
        info = { lame: buf.subarray(pos + 156, pos + 165).toString('latin1'), delay: v >>> 12, padding: v & 0xfff };
      }
    }
    frames += 1;
    pos += flen;
  }
  return { frames, info };
}

let bytes = 0;
for (const [id, spec] of Object.entries(TRACKS)) {
  const e = music[id];
  assert.ok(e, `fragment has no music.${id}`);
  assert.ok(!(id in core.music), `${id} must not be in assets/audio/manifest.json (it rides the pack fragment)`);
  assert.equal(e.src, `assets/audio/music/${spec.file}.mp3`);
  const buf = fs.readFileSync(path.join(NEXT, e.src));
  const meta = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'music', spec.file + '.json'), 'utf8'));
  const { frames, info } = parseMp3(buf);
  assert.ok(info && info.lame.startsWith('LAME'), `${id}: gapless LAME tag missing`);
  const sec = ((frames - 1) * 1152 - info.delay - info.padding) / SR;
  assert.ok(sec >= spec.minSec && sec <= spec.maxSec, `${id}: ${sec.toFixed(1)} s outside ${spec.minSec}..${spec.maxSec}`);
  assert.ok(Math.abs(meta.duration - sec) < 0.002, `${id}: sidecar duration ${meta.duration} vs decoded ${sec}`);
  const loopStart = 0.06;   // no once-only intro: every track loops from the 60 ms guard
  assert.ok(Math.abs(meta.loopStart - loopStart) < 1e-4, `${id}: loopStart ${meta.loopStart} (want ${loopStart.toFixed(6)})`);
  assert.equal(meta.bpm, spec.bpm, `${id}: bpm`);
  assert.equal(meta.key, spec.key, `${id}: key`);
  for (const k of ['loopStart', 'loopEnd', 'duration', 'bpm', 'key']) assert.equal(e[k], meta[k], `${id}: fragment ${k} matches the sidecar`);
  // the loop body is whole bars: loopEnd - loopStart = bars x beats per bar at the tempo, to the sample
  const beats = (meta.loopEnd - meta.loopStart) * spec.bpm / 60;
  const bpb = spec.beatsPerBar || 4;
  assert.ok(Math.abs(beats / bpb - Math.round(beats / bpb)) < 1e-3, `${id}: loop body is ${beats.toFixed(3)} beats, not whole bars`);
  assert.ok(meta.loopEnd < meta.duration && meta.loopEnd - meta.loopStart > 60, `${id}: loop body`);
  assert.ok(Math.abs(meta.duration - meta.loopEnd - 0.1) < 0.002, `${id}: 100 ms of loop head after loopEnd (the tracker's guard tail)`);
  assert.equal(e.fallback, spec.fallback, `${id}: fallback (plan 8.1)`);
  assert.ok(core.music[e.fallback] && core.music[e.fallback].src, `${id}: fallback ${e.fallback} is a playable core track`);
  assert.ok(e.volume > 0.8 && e.volume < 1.25, `${id}: volume ${e.volume}`);
  assert.ok(Math.abs(e.measuredLufs + 16) < 1.0, `${id}: measured ${e.measuredLufs} LUFS, not near -16`);
  assert.ok(Math.abs(20 * Math.log10(e.volume) - (-16 - e.measuredLufs)) < 0.02, `${id}: volume brings the decoded loop to -16 LUFS`);
  assert.ok(buf.length < 3.5e6, `${id}: ${buf.length} bytes over the 3.5 MB cap`);
  bytes += buf.length;
  console.log(`ok - ${id}: ${sec.toFixed(2)} s, ${buf.length} bytes, loop ${meta.loopStart}..${meta.loopEnd}, fallback ${e.fallback}`);
}
// the songs exist where render.py finds them, and are not in its ALL list (Episode 7 never renders into the core manifest)
const renderPy = fs.readFileSync(path.join(NEXT, 'tools', 'music', 'render.py'), 'utf8');
for (const spec of Object.values(TRACKS)) {
  assert.ok(fs.existsSync(path.join(NEXT, 'tools', 'music', 'songs', `${spec.file}.py`)), `${spec.file}.py exists`);
  assert.ok(!renderPy.includes(`'${spec.file}'`), `${spec.file} is not in render.py's ALL`);
}
assert.deepEqual(Object.keys(music).sort(), Object.keys(TRACKS).sort(), 'the fragment has exactly the three new tracks');
// the motif, where the plan puts it (8.1): the iceglass bell is song-local (synth.py untouched) and states D A B G in
// palehaven; the cello's augmented C G A F with the bell echo two beats late and the stopped bell; the strings' Ab Eb F Db,
// the Palehaven quote in F minor and the last major bar on the bell in the boss
const src = (f) => fs.readFileSync(path.join(NEXT, 'tools', 'music', 'songs', f), 'utf8');
const theme = src('ep7_theme.py');
assert.match(theme, /class IceglassBell\(synth\.Instrument\)/, 'the iceglass bell is a song-local instrument');
assert.match(theme, /\(1\.0, 1\.0, 1\.0, 4\.0\), \(2\.76, /, 'the iceglass bell rings on partials 1, 2.76 and 5.4');
assert.match(theme, /\(5\.4, 0\.2 \*/, 'the 5.4 partial');
const synthPy = fs.readFileSync(path.join(NEXT, 'tools', 'music', 'synth.py'), 'utf8');
assert.ok(!synthPy.includes('IceglassBell') && !synthPy.includes('class Cello'), 'synth.py is untouched');
assert.match(theme, /\(0, 0\.0, 0, 1\), \(0, 1\.0, 4, 1\), \(0, 2\.0, 5, 1\), \(0, 3\.0, 3, 2\)/, 'the tune opens on the motif 0 4 5 3');
assert.match(src('ep7_palehaven.py'), /MOTIF = \('d5', 'a5', 'b5', 'g5'\)/, 'palehaven: D A B G on the iceglass bell');
assert.match(src('ep7_palehaven.py'), /REPLY = 'r\/1 a3\/0\.5 f3\/0\.5 e3\/2'/, 'palehaven: the cello replies under the ringing G');
assert.match(src('ep7_frostbound_vault.py'), /MOTIF_C = \(48, 55, 57, 53\)/, 'frostbound_vault: the cello C3 G3 A3 F3');
assert.match(src('ep7_frostbound_vault.py'), /echo\.add\(bs\(bar \+ i\) \+ 2\.0/, 'frostbound_vault: the bell echo two beats late');
assert.match(src('ep7_frostbound_vault.py'), /STOPPED = \(8, 16, 24\)/, 'frostbound_vault: the stopped bell every 8 bars');
assert.match(src('ep7_frostbound_vault.py'), /damp=0\.3/, 'frostbound_vault: the stopped bell is damped');
assert.match(src('ep7_boss_phantom.py'), /motif44\(hi, bs\(bar\), 56/, 'boss_phantom: the strings Ab3 Eb4 F4 Db4');
assert.match(src('ep7_boss_phantom.py'), /E\.tune_aug\(65, 'aeolian'/, 'boss_phantom: the Palehaven quote in F minor');
assert.match(src('ep7_boss_phantom.py'), /bell\.add\(bs\(60\), 'a5'/, 'boss_phantom: the last major bar on the iceglass bell');
console.log(`ep7 music tests passed (${bytes} bytes of music, lazy)`);
