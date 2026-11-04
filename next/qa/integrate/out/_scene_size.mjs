import fs from 'node:fs';
const src = fs.readFileSync('src/data/story/ep3.js', 'utf8');
const fns = [...src.matchAll(/async function (\w+)\(s\) \{([\s\S]*?)\n\}/g)];
const rows = [];
for (const [, name, body] of fns) {
  const strs = [...body.matchAll(/(?:say\(s, '\w+', |narrate\(s, )(["'`])((?:\.|(?!\1).)*)\1/g)].map((m) => m[2]);
  const chars = strs.reduce((n, s) => n + s.length, 0);
  const sec = strs.reduce((n, s) => n + Math.max(s.length / 15, s.length / 60) + 0.6, 0);
  rows.push([name, strs.length, chars, sec]);
}
rows.sort((a, b) => b[3] - a[3]);
for (const r of rows.slice(0, 12)) console.log(r[0].padEnd(20), String(r[1]).padStart(3), 'boxes', String(r[2]).padStart(5), 'chars', (r[3] / 60).toFixed(1), 'min');
console.log('total', rows.reduce((n, r) => n + r[3], 0) / 60);
