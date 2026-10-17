"""Check that autotile_ref.mjs (the JS rules W2 will use) matches the Python generator exactly.

    python verify_ref.py      -> prints OK or the first mismatch; exit code 1 on mismatch
"""
import json, os, random, subprocess, sys
from autotile import quarter_src, face_quarter_src, variant_hash, NB_KEYS

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    rng = random.Random(1234)
    cases = []
    for _ in range(400):
        nb = {k: rng.random() < 0.6 for k in NB_KEYS}
        cases.append({'kind': 'a2', 'nb': nb,
                      'out': [list(quarter_src(q, nb)) for q in ('TL', 'TR', 'BL', 'BR')]})
    for i in range(16):
        l, t, r, b = bool(i & 1), bool(i & 2), bool(i & 4), bool(i & 8)
        cases.append({'kind': 'face', 'in': [l, t, r, b],
                      'out': [list(face_quarter_src(q, l, t, r, b)) for q in ('TL', 'TR', 'BL', 'BR')]})
    for _ in range(300):
        x, y = rng.randrange(0, 400), rng.randrange(0, 400)
        cases.append({'kind': 'hash', 'in': [x, y], 'out': variant_hash(x, y)})
    path = os.path.join(HERE, 'out', '_ref_cases.json')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(cases, f)
    js = r'''
import { a2Quarters, faceQuarters, variantHash } from './autotile_ref.mjs';
import { readFileSync } from 'node:fs';
const cases = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let bad = 0;
for (const c of cases) {
  let got;
  if (c.kind === 'a2') got = a2Quarters(c.nb);
  else if (c.kind === 'face') got = faceQuarters(...c.in);
  else got = variantHash(...c.in);
  if (JSON.stringify(got) !== JSON.stringify(c.out)) { bad++; if (bad < 4) console.log('MISMATCH', c.kind, JSON.stringify(c), JSON.stringify(got)); }
}
console.log(bad ? 'FAIL ' + bad : 'OK ' + cases.length);
process.exit(bad ? 1 : 0);
'''
    jspath = os.path.join(HERE, 'out', '_verify_ref.mjs')
    with open(jspath, 'w') as f:
        f.write(js.replace("'./autotile_ref.mjs'", "'../autotile_ref.mjs'"))
    r = subprocess.run(['node', jspath, path], capture_output=True, text=True, timeout=60)
    print(r.stdout.strip() or r.stderr.strip())
    sys.exit(r.returncode)


if __name__ == '__main__':
    main()
