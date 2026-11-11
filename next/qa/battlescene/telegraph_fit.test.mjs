// PLAN polish backlog: long telegraph sentences were cut with an ellipsis in the help window. The window now grows to
// three lines (ep2.test pins one telegraph); this pins every telegraph in the core and Episode 4 to 6 skill tables,
// with the longest-named user and a full eight-letter hero name, on the keyboard and the touch help window.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS } from '../../src/data/skills.js';
import { EP4_SKILLS } from '../../src/data/ep4/skills.js';
import { EP5_SKILLS } from '../../src/data/ep5/skills.js';
import { EP6_SKILLS } from '../../src/data/ep6/skills.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { EP4_ENEMIES } from '../../src/data/ep4/enemies.js';
import { helpLines } from '../../src/battle/scene/hud.js';
import { BitmapFont } from '../../src/core/font.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ELLIPSIS = String.fromCharCode(0x2026);

test('every telegraph fits the help window without an ellipsis (worst-case names, keyboard and touch)', () => {
  const def = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'ui', 'font.json'), 'utf8'));
  const font = new BitmapFont(def, null, { id: 'main' });
  const r = { measure: (s) => font.measure(s), wrap: (s, w) => font.wrap(s, w) };
  const all = { ...SKILLS, ...EP4_SKILLS, ...EP5_SKILLS, ...EP6_SKILLS };
  const users = {};
  for (const tbl of [ENEMIES, EP4_ENEMIES]) {
    for (const [id, e] of Object.entries(tbl)) {
      for (const s of JSON.stringify(e).match(/"[a-z_0-9]+"/g) || []) {
        const k = s.slice(1, -1);
        if (all[k]) (users[k] ||= new Set()).add(e.name || id);
      }
    }
  }
  let n = 0;
  for (const [id, sk] of Object.entries(all)) {
    if (!sk.telegraph) continue;
    n++;
    for (const name of users[id] || ['The Inkbound Barrister']) {
      for (const target of ['WWWWWWWW', 'the party']) {
        const t = sk.telegraph.replace(/\{name\}/g, name).replace(/\{target\}/g, target);
        for (const rightW of [0, 94]) {
          const lines = helpLines(r, t, 'orange', { rightW });
          assert.ok(!lines.some((l) => l.includes(ELLIPSIS)), `${id} cut (rightW ${rightW}): ${lines.join(' / ')}`);
        }
      }
    }
  }
  assert.ok(n >= 40, `found ${n} telegraphs`);
});
