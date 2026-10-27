"""H6-critic probe: the bell tower as a hesitant player. Stand still at the foot for 11 s (does an Aim line appear, and what
does it say), open the menu on the tower (what the Journal says), close it (the Aim), then climb and log every sfx and music
call through the thirteenth toll. python next/qa/arc/out/arc_tower.py --device phone"""
import argparse
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, FIELD  # noqa: E402

TOLL_STEPS = [[12, 34], [12, 32], [12, 30], [12, 28], [8, 24], [8, 22], [8, 20], [8, 18], [12, 14], [12, 12], [12, 10], [12, 8]]
HOOK = """(() => { const A = LQ_ENGINE.audio; if (A.__arc) return true; A.__arc = [];
  for (const k of ['sfx', 'music', 'jingle', 'stopMusic']) { const o = A[k].bind(A); A[k] = (...a) => { A.__arc.push([LQ_ENGINE.frame, k, String(a[0])]); return o(...a); }; }
  return true; })()"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    a = ap.parse_args()
    b = NewPlayer(a.device, speed=3, tag='-tower', read=False)
    out = {}
    try:
        b.open()
        b.js(HOOK)
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.js("LQ_DEBUG.newGame('Arden', {scene: 'prologue'})")
        b.page.wait_for_function("(() => { const f = " + FIELD + "; return LQ_DEBUG.scene() === 'field' && !!(f && f.map && f.map.id === 'bell_tower'); })()", timeout=30000, polling=20)
        b.settle()
        b.js(HOOK)
        b.snap('tower-control')
        out['banner_at_control'] = b.js("(() => { const f = " + FIELD + "; return !!(f.banner && f.banner.active); })()")
        samples = []
        for i in range(12):
            b.frames(60)
            samples.append([i + 1, b.js('LQ_DEBUG.fieldState().aim')])
            if samples[-1][1] and 'still' not in out:
                out['still'] = i + 1
                b.frames(10)
                b.snap('tower-aim-still')
        out['aim_samples'] = samples
        b.tap('menu', 4)
        b.frames(30)
        out['menu_scene'] = b.scene()
        b.snap('tower-menu-pressed')
        out['aim_after_menu'] = b.js('LQ_DEBUG.fieldState().aim')
        b.snap('tower-aim-after-menu')
        b.frames(300)
        for n, (x, y) in enumerate(TOLL_STEPS, start=1):
            b.walk_to([(x, y + 1)], label=f'pre_toll_{n}')
            b.hold_dir('up', 1)
            b.settle()
        b.walk_to([(12, 7)], label='pre_top')
        f13 = b.frame()
        b.hold_dir('up', 1)
        b.frames(70)
        b.snap('tower-thirteenth-pan')
        for _ in range(300):
            if b.flag('cold_open_done'):
                break
            b.handle()
        b.frames(60)
        out['audio'] = b.js('LQ_ENGINE.audio.__arc')
        out['f13'] = f13
        out['warnings'] = [w for w in b.warnings][:20]
        out['console'] = [c for c in b.console if 'bell' in c or 'sfx' in c][:20]
    finally:
        out['errors'] = b.errors
        write_json(f'{a.device}-arc-tower.json', out)
        b.close()
    print(out.get('still'), out.get('aim_after_menu'), len(out.get('audio') or []))


if __name__ == '__main__':
    main()
