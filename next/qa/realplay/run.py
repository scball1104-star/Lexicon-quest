"""Real-input playtest of Lexicon Quest: python next/qa/realplay/run.py  (see README.md)

    python next/qa/realplay/run.py                      desktop keys, phone touch, a portrait subset (under 10 minutes)
    python next/qa/realplay/run.py --full               every sequence on all three
    python next/qa/realplay/run.py --device phone       one device (smallphone and tinyphone are also known)
    python next/qa/realplay/run.py --only flee,shop     sequences whose name holds one of these words

Exit 1 on any failed check, a Stuck wait, a console or engine error, or an automation call inside a sequence. Screenshots
and report.json in next/qa/out/realplay/.
"""
import argparse
import json
import os
import pathlib
import sys
import threading
import time
import traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import battle  # noqa: E402
import boss  # noqa: E402
import ep4field  # noqa: E402
import ep5battle  # noqa: E402
import ep6battle  # noqa: E402
import ep6field  # noqa: E402
import hunt  # noqa: E402
import menus  # noqa: E402
import title  # noqa: E402
from driver import DEVICES, OUT, Play, Stuck  # noqa: E402

MODULES = [('battle', battle), ('menus', menus), ('ep4field', ep4field), ('ep5battle', ep5battle), ('ep6battle', ep6battle), ('ep6field', ep6field),
           ('title', title), ('boss', boss), ('hunt', hunt)]
# The default run skips what a device repeats from another: the same code path, only slower by finger.
PHONE_SKIP = {'row notice', 'row refused', 'quick start url', 'row sweep', 'config', 'tech magic status', 'every row', 'turn the sky pinned'}
PORTRAIT = {'root and turns', 'rows by finger', 'items', 'equip', 'journal', 'save and load', 'rotate card', 'tap rows', 'shop'}
ORDER = ['desktop', 'phone', 'portrait']


def sequences(device, full, only):
    touch = bool(DEVICES[device].get('touch'))
    for mod, m in MODULES:
        for name, fn in m.SEQUENCES + (m.TOUCH_ONLY if touch else []):
            if only:
                if not any(w in name for w in only):
                    continue
            elif not full and ((device == 'portrait' and name not in PORTRAIT) or (device == 'phone' and name in PHONE_SKIP)):
                continue
            yield mod, name, fn


def run_device(device, full, only):
    rows = []
    p = Play(device)
    try:
        for mod, name, fn in sequences(device, full, only):
            t0 = time.time()
            n0, status, detail = len(p.checks), 'ok', ''
            p.errors.clear()
            try:
                p.boot('&pack=ep4')
                fn(p)
            except Stuck as e:
                status, detail = 'STUCK', str(e)
            except Exception:  # noqa: BLE001
                status, detail = 'ERROR', traceback.format_exc()[-600:]
            checks = p.checks[n0:]
            fails = [c for c in checks if not c['ok']]
            bad = list(p.errors) + p.engine_errors()
            try:
                calls = p.guard_calls()
            except Exception:  # noqa: BLE001
                calls = []
            if status == 'ok' and (fails or bad or calls):
                status = 'FAIL'
            print(f'{status:<5} {device:<9} {mod:<9} {name:<22} {len(checks):>4} checks {time.time() - t0:>6.1f} s  {detail[:160]}', flush=True)
            for c in fails:
                print(f'        {c["label"]}: {c["detail"][:140]}  {c.get("shot", "")}', flush=True)
            for b in (bad + [f'automation call: {c}' for c in calls])[:5]:
                print(f'        {b[:200]}', flush=True)
            rows.append({'device': device, 'module': mod, 'name': name, 'status': status, 'detail': detail, 'checks': len(checks), 'fails': fails,
                         'errors': bad, 'automation': calls, 'seconds': round(time.time() - t0, 1)})
    finally:
        p.close()
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='')
    ap.add_argument('--only', default='')
    ap.add_argument('--full', action='store_true')
    ap.add_argument('--timeout', type=int, default=1500, help='overall ceiling in seconds')
    args = ap.parse_args()

    def fire():
        print(f'\nFAIL: realplay exceeded {args.timeout} s', flush=True)
        os._exit(3)
    timer = threading.Timer(args.timeout, fire)
    timer.daemon = True
    timer.start()
    devices = [d for d in args.device.split(',') if d] or ORDER
    only = [w.strip() for w in args.only.split(',') if w.strip()]
    t0 = time.time()
    rows = []
    for d in devices:
        rows += run_device(d, args.full, only)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'report.json').write_text(json.dumps(rows, indent=1), encoding='utf-8')
    bad = [r for r in rows if r['status'] != 'ok']
    checks = sum(r['checks'] for r in rows)
    print(f'\n{len(rows) - len(bad)}/{len(rows)} sequences ok, {checks} checks, {time.time() - t0:.0f} s. Report: {OUT / "report.json"}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
