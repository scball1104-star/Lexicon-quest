// W9 field abilities in the real game, headless: one short scripted walk per ability (qa/world/abilities_lab.py:
// the wheel, Dash Strike at the valley crack and into a wraith from behind, Appraise, Bram's Shove, the F3 root
// wall shortcut, the Lantern still on pageR near hidden ink), zero console errors. Skipped without Playwright.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Sized from the work (issue #76): about 35 s alone, 65 s under a busy CPU; the runner's cap (qa/run.mjs LIMITS) is this
// plus a margin.
const ABILITIES_MS = 300_000;

function hasPlaywright() {
  // 60 s: under a busy CPU the import alone came near 20 s, and a timeout here SKIPS the walk instead of failing it
  const r = spawnSync('python', ['-c', 'import playwright.sync_api, PIL'], { timeout: 60000, encoding: 'utf8' });
  return r.status === 0;
}

test('every field ability works on its map with zero console errors', { skip: !hasPlaywright() && 'playwright for python not installed' }, () => {
  const r = spawnSync('python', [path.join(HERE, 'abilities_lab.py')], { timeout: ABILITIES_MS, encoding: 'utf8', cwd: path.resolve(HERE, '..', '..') });
  const out = (r.stdout || '') + (r.stderr || '');
  assert.equal(r.status, 0, out.split('\n').slice(-30).join('\n'));
  assert.match(out, /OK: abilities lab passed/);
});
