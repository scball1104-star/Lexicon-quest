// Static walk model for qa/autoplay.py: the collision grid, faint-ink cells, events, marks, exits and
// start of one map, straight from tools/maps/mapcheck.mjs (DESIGN 5.1 / docs/MAPS.md section 3), as JSON.
//
//   node qa/autoplay_grid.mjs <mapId>                      JSON on stdout (every gated overlay present)
//   node qa/autoplay_grid.mjs <mapId> --flags=a,b,c        the grid a save holding exactly these flags sees
//   node qa/autoplay_grid.mjs <mapId> --ascii              the grid as text (debugging)
//
// The bot overlays the live state it reads from the page (actors, opened gates, pushed blocks, revealed
// ink, lit glass bridges) on top of this static model before it pathfinds. `gated` lists the flags the
// map's overlays and overhead tiles are gated on (EPISODE2_PLAN 5.5: Garrick's planks, the Hollow's signs),
// so the bot knows which flags change the grid and can cache one grid per combination.

import { loadDb, loadMap, buildGrid, withFlags } from '../tools/maps/mapcheck.mjs';

const id = process.argv[2];
if (!id) { console.error('usage: node qa/autoplay_grid.mjs <mapId> [--flags=a,b] [--ascii]'); process.exit(2); }
const db = await loadDb();
const map = await loadMap(id);
const gated = new Set();
for (const o of [...(map.overlays || []), ...(map.overhead || [])]) {
  for (const k of ['if', 'ifNot']) for (const f of [].concat(o[k] || [])) gated.add(f);
}
const flagArg = process.argv.find((a) => a.startsWith('--flags='));
const shaped = flagArg ? withFlags(map, new Set(flagArg.slice('--flags='.length).split(',').filter(Boolean))) : map;
// Terrain, overlays and decor only: event collision (pots, blocks, gates, shelves, NPCs) changes while
// playing, so the bot reads it live from the field and overlays it on this base.
const g = buildGrid({ ...shaped, events: [] }, db);
if (process.argv.includes('--ascii')) {
  const SYM = { none: '.', solid: '#', water: '~', pit: 'O', counter: '=', ledge_s: 'v', ledge_e: '>', ledge_w: '<', void: ' ' };
  console.log('    ' + Array.from({ length: g.W }, (_, x) => x % 10).join(''));
  for (let y = 0; y < g.H; y++) {
    let row = String(y).padStart(3) + ' ';
    for (let x = 0; x < g.W; x++) row += g.faint[y][x] ? 'f' : (SYM[g.code[y][x]] || '?');
    console.log(row);
  }
} else {
  process.stdout.write(JSON.stringify({
    id: map.id, W: g.W, H: g.H, code: g.code, faint: g.faint, errors: g.errors,
    events: map.events || [], marks: map.marks || {}, exits: map.exits || [], start: map.start || null,
    pitTo: map.pitTo || null, area: map.area, gated: [...gated].sort(),
  }));
}
