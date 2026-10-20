// Headless walks through every map (warp, pathfind to far tiles, zero console errors) by running
// qa/world/walks.py under Playwright. Skipped when Playwright for Python is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function hasPlaywright() {
  const r = spawnSync('python', ['-c', 'import playwright.sync_api, PIL'], { timeout: 20000, encoding: 'utf8' });
  return r.status === 0;
}

test('every map walks headless with zero console errors', { skip: !hasPlaywright() && 'playwright for python not installed' }, () => {
  const r = spawnSync('python', [path.join(HERE, 'walks.py')], { timeout: 160000, encoding: 'utf8', cwd: path.resolve(HERE, '..', '..') });
  const out = (r.stdout || '') + (r.stderr || '');
  assert.equal(r.status, 0, out.split('\n').slice(-25).join('\n'));
  assert.match(out, /OK: zero console errors/);
});

// E2-world: the Episode 2 field systems in the real game (qa/world/e2_lab.py): the silverglass teaching room before
// and after the turn, the lit bridge and its grace rule, Bram's Shove on a heavy mirror and a push mirror, the beam
// as a light in the dark (draw time), reflections in water and the fountain's faces, mist, conditional tint and
// music, gated overlays, fog and Keeper mirror doors, newGameEp2, gold from a scene, flags into the battle, the
// Episode 2 credits handoff. Here (not in its own file) so it runs in the solo slot after the parallel batch.
test('the Episode 2 field systems work in the game with zero console errors', { skip: !hasPlaywright() && 'playwright for python not installed' }, () => {
  const r = spawnSync('python', [path.join(HERE, 'e2_lab.py')], { timeout: 110000, encoding: 'utf8', cwd: path.resolve(HERE, '..', '..') });
  const out = (r.stdout || '') + (r.stderr || '');
  assert.equal(r.status, 0, out.split('\n').slice(-30).join('\n'));
  assert.match(out, /E2_LAB: PASS/);
});
