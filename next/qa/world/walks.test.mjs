// Headless walks through every map (warp, pathfind to far tiles, zero console errors) by running
// qa/world/walks.py under Playwright. Skipped when Playwright for Python is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Sized from the work (issue #76): every map, about 170 s alone and 240 s under a busy CPU; 280 s left no room. The
// runner's cap for this file (qa/run.mjs LIMITS) is this plus a margin.
const WALKS_MS = 480_000;

function hasPlaywright() {
  // 60 s: under a busy CPU the import alone came near 20 s, and a timeout here SKIPS the walk instead of failing it
  const r = spawnSync('python', ['-c', 'import playwright.sync_api, PIL'], { timeout: 60000, encoding: 'utf8' });
  return r.status === 0;
}

test('every map walks headless with zero console errors', { skip: !hasPlaywright() && 'playwright for python not installed' }, () => {
  const r = spawnSync('python', [path.join(HERE, 'walks.py')], { timeout: WALKS_MS, encoding: 'utf8', cwd: path.resolve(HERE, '..', '..') });
  const out = (r.stdout || '') + (r.stderr || '');
  assert.equal(r.status, 0, out.split('\n').slice(-25).join('\n'));
  assert.match(out, /OK: zero console errors/);
});
