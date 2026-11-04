// E4-fixes-A (PLAYTEST_REVIEW_6 fix 3): the quick start loads the ep4 pack with the real engine, whose audio is the
// safeAudio wrapper (core/engine.js) around the runtime. The pack's fragment must land in the runtime's own manifest, or a
// quick-start party plays Episode 4 with 13 "unknown audio id" warnings and no Episode 4 music.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAudio } from '../../src/core/audio.js';
import { safeAudio } from '../../src/core/engine.js';
import { ensurePack, forcePack, setPackDefaults } from '../../src/game/packs.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const core = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));

const IDS = {
  music: ['valewyn', 'sunken_keep', 'boss_regent'],
  ambience: ['canal_rain', 'keep_drip'],
  sfx: ['tide_wheel', 'water_rise', 'water_drain', 'seal_wash', 'seal_stamp', 'decree_unroll', 'decree_void', 'bell_drowned'],
};

test('the title quick start (ensurePack with the wrapped engine audio) registers every ep4 audio id, and the runtime knows them', async () => {
  const impl = createAudio({ basePath: '' });
  await impl.init(JSON.parse(JSON.stringify(core)));
  const engine = { audio: safeAudio(impl) };
  assert.equal(engine.audio.manifest, undefined, 'the wrapper has no manifest of its own (the old merge target)');
  for (const [kind, ids] of Object.entries(IDS)) for (const id of ids) assert.ok(!impl.manifest[kind][id], `${kind}.${id} not core`);
  const warns = [];
  const warn = console.warn;
  console.warn = (...a) => { warns.push(a.join(' ')); };
  try {
    setPackDefaults({ warm: false, quiet: true, packFiles: null });
    forcePack('ep4');
    const r = await ensurePack('ep4', { engine });
    assert.equal(r.ok, true, `the pack loaded: ${JSON.stringify(r.failed)}`);
    for (const [kind, ids] of Object.entries(IDS)) for (const id of ids) assert.ok(impl.manifest[kind][id], `${kind}.${id} merged into the runtime manifest`);
    engine.audio.music('valewyn');
    engine.audio.ambience('canal_rain');
    engine.audio.sfx('tide_wheel');
  } finally { console.warn = warn; }
  assert.deepEqual(warns.filter((w) => /unknown .* id/.test(w)), [], 'no "unknown ... id" warning');
});
