import { loadMap } from '../../../tools/maps/mapcheck.mjs';
for (const id of process.argv.slice(2)) {
  const m = await loadMap(id);
  console.log(`== ${id} ${m.ground[0].length}x${m.ground.length} start ${JSON.stringify(m.start)} exits ${JSON.stringify(m.exits)}`);
  console.log('marks', JSON.stringify(m.marks));
  for (const e of m.events) {
    const o = { ...e }; delete o.id; delete o.type; delete o.x; delete o.y;
    console.log(`  ${e.type.padEnd(10)} ${e.id.padEnd(20)} ${e.x},${e.y} ${JSON.stringify(o)}`);
  }
}
