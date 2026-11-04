import fs from 'node:fs';
import { loadMap } from '../../../tools/maps/mapcheck.mjs';
const src = fs.readFileSync('src/data/story/ep3.js', 'utf8');
// split by async function
const fns = [...src.matchAll(/async function (\w+)\(s\) \{([\s\S]*?)\n\}/g)];
const MAPS = ['nh_inn','nameless_hollow','sand_road','emberpeak','pk_inn','pk_shop','pk_smithy','pk_bellhouse','foundry_f1','foundry_f2','foundry_f3','foundry_heart'];
const known = {};
for (const id of MAPS) { const m = await loadMap(id); known[id] = new Set([...Object.keys(m.marks||{}), ...(m.events||[]).map(e=>e.id)]); }
const sceneMap = {};
for (const id of MAPS) { const m = await loadMap(id); for (const e of m.events||[]) if (e.script) (sceneMap[e.script] ||= new Set()).add(id); }
for (const [, name, body] of fns) {
  const spawned = new Set([...body.matchAll(/spawn\('(\w+)'/g)].map(x=>x[1]));
  const refs = new Set([...body.matchAll(/at: '(\w+)'/g), ...body.matchAll(/walk\('\w+', '(\w+)'/g), ...body.matchAll(/panTo\('(\w+)'/g), ...body.matchAll(/face\('\w+', '(\w+)'/g)].map(x=>x[1]));
  const maps = [...(sceneMap[name]||[])];
  for (const r of refs) {
    if (spawned.has(r) || ['hero','mira','bram'].includes(r)) continue;
    const miss = maps.filter((m) => !known[m].has(r));
    if (!maps.length || miss.length) console.log(name, 'maps', maps.join(','), 'ref', r, 'missing on', miss.join(','));
  }
}
