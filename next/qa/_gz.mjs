import zlib from 'node:zlib'; import fs from 'node:fs';
const gz = (f) => zlib.gzipSync(fs.readFileSync(f), { level: 6 }).length;
for (const f of process.argv.slice(2)) console.log(f, fs.statSync(f).size, gz(f));
