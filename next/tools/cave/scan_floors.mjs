// Build every floor of a seed range through the game's own buildFloor and report refusals (CRITIQUE_STACKS 1).
//   node tools/cave/scan_floors.mjs <seed0> <seed1> [floors=99]
import '../../src/data/cave/index.js';
const [s0, s1, fl] = process.argv.slice(2).map(Number);
const m = await import('../../src/data/cave/index.js'); await m.default();
const W = await import('../../src/data/cave/world.js');
const t0 = Date.now(); let n = 0; const bad = [];
for (let s = s0; s <= s1; s++) for (let f = 1; f <= (fl || 99); f++) {
  if (f % 10 === 0) continue;
  n++;
  try { W.buildFloor(s, f, []); } catch (e) { bad.push([s, f, e.message.slice(0, 80)]); }
}
console.log(`${n} floors, ${bad.length} refusals, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const b of bad) console.log('REFUSED', ...b);
process.exit(bad.length ? 1 : 0);
