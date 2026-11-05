"""The Episode 4 page close-ups in the real game: every page and beat opens, draws and closes, 1x screenshots in qa/out/realplay.

  python qa/integrate/e4_pages.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'realplay'))
from driver import Play  # noqa: E402
from ep4field import place  # noqa: E402

BEATS = [('charter', {}), ('charter', {'run': True}), ('keep', {}), ('witness', {'stage': 'sign'}), ('witness', {'stage': 'v'})]


def main():
    p = Play('desktop')
    bad = 0
    try:
        p.boot('&pack=ep4&ep=4')
        place(p, sys.argv[1] if len(sys.argv) > 1 else 'ep4_keep_crown', 10, 10)
        errs = []
        p.page.on('pageerror', lambda e: errs.append(str(e)))
        for kind, opts in BEATS:
            p.js("([k, o]) => { const c = LQ_ENGINE.scene.closeup; c.reset(); c.open(k, o); }", [kind, opts])
            p.frames(14)
            p.shot(f'page-{kind}-{opts.get("stage") or ("run-start" if opts else "open")}')
            p.frames(100)
            p.shot(f'page-{kind}-{opts.get("stage") or ("run-end" if opts else "held")}-end')
            if not p.js("!!LQ_ENGINE.scene.closeup.isOpen && !!LQ_ENGINE.scene.closeup.page"):
                print('FAIL did not open', kind, opts)
                bad += 1
            p.js("LQ_ENGINE.scene.closeup.close()")
            p.frames(16)
            if p.js("LQ_ENGINE.scene.closeup.isOpen"):
                print('FAIL did not close', kind, opts)
                bad += 1
        p.js("(() => { const c = LQ_ENGINE.scene.closeup; c.reset(); c.open('charter', {}); })()")
        p.frames(14)
        p.js("LQ_ENGINE.scene.closeup.open('charter', { run: true })")
        p.frames(2)
        if p.js("LQ_ENGINE.scene.closeup.k") != 1:
            print('FAIL the second beat re-opened the frame')
            bad += 1
        if errs:
            print('FAIL page errors', errs[:3])
            bad += 1
    finally:
        p.close()
    print('E4_PAGES', 'FAIL' if bad else 'PASS', bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
