// Parse every prefab and landing, print every authoring error at once (run after editing prefabs.js / landing.js).
import { PREFAB_SETS, parsePrefab } from '../../src/data/cave/prefabs.js';
import { LANDINGS, parseLanding } from '../../src/data/cave/landing.js';
let bad = 0;
for (const [band, list] of Object.entries(PREFAB_SETS)) {
  for (const d of list) {
    try { const p = parsePrefab(d); const doors = Object.entries(p.doors).map(([s, l]) => `${s}${l.length}`).join(' '); console.log(`ok   ${band} ${p.id} ${p.w}x${p.h} doors ${doors} cols ${p.cols.length} chest ${p.marks.chest.length} foe ${p.marks.foe.length}`); }
    catch (e) { bad++; console.log(`FAIL ${band} ${d.id}: ${e.message}`); }
  }
}
for (const t of Object.values(LANDINGS)) { try { parseLanding(t); console.log(`ok   landing ${t.id}`); } catch (e) { bad++; console.log(`FAIL landing ${t.id}: ${e.message}`); } }
process.exit(bad ? 1 : 0);
