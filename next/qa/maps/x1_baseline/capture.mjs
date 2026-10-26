// X1-maps-hub, step 1: freeze the five maps the hub edits BEFORE the first edit.
//   node qa/maps/x1_baseline/capture.mjs
// Writes <id>.json (the resolved module, exactly `mapcheck dump <id>`) and <id>.walk.json (the walk reachability under the
// flag sets in walks.mjs). It REFUSES to overwrite: these files are the test oracle for qa/maps/x1_hub.test.mjs and are never
// regenerated after an edit (delete them by hand only if the oracle itself was captured wrongly, and say so in the report).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMap, loadDb, walk } from '../../../tools/maps/mapcheck.mjs';
import { HUB_MAPS, FLAG_SETS, encodeWalk } from './walks.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const db = await loadDb();
for (const id of HUB_MAPS) {
  const file = path.join(dir, `${id}.json`), wfile = path.join(dir, `${id}.walk.json`);
  if (fs.existsSync(file) || fs.existsSync(wfile)) { console.log(`${id}: baseline exists, not overwritten`); continue; }
  const m = await loadMap(id);
  fs.writeFileSync(file, JSON.stringify(m));
  const out = {};
  for (const [name, flags] of Object.entries(FLAG_SETS)) {
    for (const lantern of [false, true]) {
      out[`${name}${lantern ? '+lantern' : ''}`] = encodeWalk(walk(m, db, { flags, lantern }));
    }
  }
  fs.writeFileSync(wfile, JSON.stringify(out));
  console.log(`${id}: module ${fs.statSync(file).size} bytes, ${Object.keys(out).length} walks`);
}
