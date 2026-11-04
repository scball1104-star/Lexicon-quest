// Episode 4 music (E4-audio, docs/EPISODE4_PLAN.md 8.1): the three tracker pieces exist as ep4_*.mp3 with a gapless LAME tag,
// their sidecars agree with the decoded length, they loop on the 60 ms guard (boss_regent after its once-only intro), and the pack fragment (src/data/ep4/audio.js)
// carries the same loop points, a fallback that exists in the core manifest, and a volume near unity.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { music } from '../../src/data/ep4/audio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const core = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));

const TRACKS = {
  valewyn: { file: 'ep4_valewyn', minSec: 70, maxSec: 90, bpm: 90, fallback: 'hollowmere' },
  sunken_keep: { file: 'ep4_sunken_keep', minSec: 85, maxSec: 100, bpm: 80, fallback: 'court' },
  boss_regent: { file: 'ep4_boss_regent', minSec: 100, maxSec: 120, bpm: 132, fallback: 'boss_warden', introBars: 4, beatsPerBar: 3 },
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
  // boss_regent plays its four intro bars once: its loop starts on the bar line of bar 5 (4 bars of 3 beats at 132 BPM)
  const loopStart = spec.introBars ? spec.introBars * spec.beatsPerBar * 60 / spec.bpm : 0.06;
  assert.ok(Math.abs(meta.loopStart - loopStart) < 1e-4, `${id}: loopStart ${meta.loopStart} (want ${loopStart.toFixed(6)})`);
  assert.equal(meta.bpm, spec.bpm, `${id}: bpm`);
  for (const k of ['loopStart', 'loopEnd', 'duration', 'bpm', 'key']) assert.equal(e[k], meta[k], `${id}: fragment ${k} matches the sidecar`);
  assert.ok(meta.loopEnd < meta.duration && meta.loopEnd - meta.loopStart > 60, `${id}: loop body`);
  assert.equal(e.fallback, spec.fallback, `${id}: fallback (plan 8.1)`);
  assert.ok(core.music[e.fallback] && core.music[e.fallback].src, `${id}: fallback ${e.fallback} is a playable core track`);
  assert.ok(e.volume > 0.8 && e.volume < 1.25, `${id}: volume ${e.volume}`);
  assert.ok(buf.length < 3.5e6, `${id}: ${buf.length} bytes over the 3.5 MB cap`);
  console.log(`ok - ${id}: ${sec.toFixed(2)} s, ${buf.length} bytes, loop ${meta.loopStart}..${meta.loopEnd}, fallback ${e.fallback}`);
}
console.log('ep4 music tests passed');
