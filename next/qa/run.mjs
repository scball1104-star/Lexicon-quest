// Test runner: finds every next/qa/**/*.test.mjs and runs each file with `node --test` in its own
// child process (90 s timeout each, a few in parallel), prints a summary table, exits 1 on any failure.
//
//   node next/qa/run.mjs                 run everything
//   node next/qa/run.mjs core battle     only files whose path contains "core" or "battle"
//   node next/qa/run.mjs --verbose       print the output of passing files too
//   node next/qa/run.mjs --jobs 1        run serially

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QA = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.dirname(QA);
const TIMEOUT_MS = 90_000;

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const jobsIdx = args.indexOf('--jobs');
const jobs = jobsIdx >= 0 ? Math.max(1, Number(args[jobsIdx + 1]) || 1) : Math.max(1, Math.min(4, os.cpus().length - 1));
const filters = args.filter((a, i) => !a.startsWith('-') && (jobsIdx < 0 || i !== jobsIdx + 1));

function findTests(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'out' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findTests(full));
    else if (entry.name.endsWith('.test.mjs')) out.push(full);
  }
  return out;
}

function runFile(file) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, ['--test', '--test-reporter=tap', file], {
      cwd: NEXT, env: { ...process.env, NODE_NO_WARNINGS: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      const num = (re) => { const m = output.match(re); return m ? Number(m[1]) : 0; };
      resolve({
        file, code, timedOut, output, ms: Date.now() - started,
        pass: num(/^# pass (\d+)/m), fail: num(/^# fail (\d+)/m), skip: num(/^# skipped (\d+)/m) + num(/^# todo (\d+)/m),
      });
    });
    child.on('error', (e) => { clearTimeout(timer); resolve({ file, code: 1, timedOut: false, output: String(e), ms: 0, pass: 0, fail: 1, skip: 0 }); });
  });
}

async function main() {
  let files = findTests(QA).sort();
  if (filters.length) files = files.filter((f) => filters.some((x) => f.split(path.sep).join('/').includes(x)));
  if (!files.length) { console.log('No test files found.'); process.exit(filters.length ? 1 : 0); }

  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const f = files[next++];
      const r = await runFile(f);
      results.push(r);
      const ok = r.code === 0 && !r.timedOut;
      process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${path.relative(NEXT, r.file).split(path.sep).join('/')}  (${r.ms} ms)\n`);
    }
  };
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, worker));
  results.sort((a, b) => a.file.localeCompare(b.file));

  const failed = results.filter((r) => r.code !== 0 || r.timedOut);
  for (const r of results) {
    if (verbose || r.code !== 0 || r.timedOut) {
      console.log(`\n----- ${path.relative(NEXT, r.file)} ${r.timedOut ? '(TIMED OUT after 90 s)' : ''}`);
      // TAP output: show failing assertions and diagnostics, not the full green list.
      const lines = r.output.split('\n');
      const shown = verbose ? lines : lines.filter((l) => /not ok|^\s+(error|expected|actual|operator|stack|at |location|message|code|failureType)|Error|^\s{4,}\S/.test(l));
      console.log(shown.slice(0, 200).join('\n'));
    }
  }

  const w = Math.max(10, ...results.map((r) => path.relative(NEXT, r.file).length));
  const pad = (s, n) => String(s).padEnd(n);
  const lpad = (s, n) => String(s).padStart(n);
  console.log('\n' + pad('file', w) + '  ' + lpad('pass', 5) + lpad('fail', 5) + lpad('skip', 5) + lpad('ms', 8) + '  result');
  console.log('-'.repeat(w + 34));
  let tp = 0, tf = 0, ts = 0;
  for (const r of results) {
    const ok = r.code === 0 && !r.timedOut;
    tp += r.pass; tf += r.fail; ts += r.skip;
    console.log(pad(path.relative(NEXT, r.file).split(path.sep).join('/'), w) + '  ' + lpad(r.pass, 5) + lpad(r.fail, 5) + lpad(r.skip, 5) + lpad(r.ms, 8) + '  ' + (r.timedOut ? 'TIMEOUT' : ok ? 'ok' : 'FAIL'));
  }
  console.log('-'.repeat(w + 34));
  console.log(pad(`${results.length} files`, w) + '  ' + lpad(tp, 5) + lpad(tf, 5) + lpad(ts, 5) + lpad(Date.now() - t0, 8) + '  ' + (failed.length ? `${failed.length} FAILED` : 'ALL PASSED'));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
