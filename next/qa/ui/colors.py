"""Colour count of rendered frames at the internal resolution (CRITIQUE_2 D1, one pixel density).

Samples each desktop screenshot in qa/out back to 384x216 (one device pixel per game pixel: the desktop
profile draws at an integer scale, so the centre of each 5x5 block is the game pixel) and counts distinct
colours. The title logo carries its own gradient and is masked out (its rect comes from assets/ui/logo.json).

  python next/qa/ui/colors.py                       the key-art shots (title, prologue, name entry, credits, title card)
  python next/qa/ui/colors.py --shots ui_menu,ui_shop
  python next/qa/ui/colors.py --limit 150            fail (exit 1) when any frame exceeds the limit

Prints a table: shot, colours (logo masked), colours (whole frame). Exit code 1 when a frame is over --limit.
"""
import argparse
import json
import pathlib
import sys

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent.parent
OUT = NEXT / 'qa' / 'out'
W, H = 384, 216
KEY_ART = ['ui_title', 'ui_prologue', 'ui_name_entry', 'ui_credits', 'ui_title_card']
# Informational only (windows, portraits and sprites over the backdrop add their own colours): --shots ui_dialog,ui_inn,ui_toast


def logo_rect():
    """Screen rect of the title logo + subtitle (title.js draws the logo at y 26, subtitle 3 px under it)."""
    try:
        j = json.loads((NEXT / 'assets' / 'ui' / 'logo.json').read_text(encoding='utf-8'))
        f = j['frames']['logo']
        sub = j['frames'].get('subtitle')
        lw, lh = f[2], f[3]
        x, y = (W - lw) // 2, 26
        h = lh + (3 + sub[3] if sub else 0)
        return (x, y, x + lw, y + h)
    except Exception:  # noqa: BLE001
        return (60, 26, 324, 110)


def sample(png):
    """384x216 view of a frame: NEAREST picks the centre of each 5x5 block at the desktop's integer scale."""
    im = Image.open(png).convert('RGB')
    return im.resize((W, H), Image.NEAREST)


def count(png, mask=None):
    sm = sample(png)
    if mask:
        px = sm.load()
        x0, y0, x1, y1 = mask
        for y in range(max(0, y0), min(H, y1)):
            for x in range(max(0, x0), min(W, x1)):
                px[x, y] = (0, 0, 0)
    cols = sm.getcolors(W * H)
    n = len(cols)
    return n - (1 if mask and any(c == (0, 0, 0) for _, c in cols) else 0)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--shots', default=','.join(KEY_ART))
    ap.add_argument('--device', default='desktop')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args(argv)
    shots = [s.strip() for s in args.shots.split(',') if s.strip()]
    mask = logo_rect()
    worst = 0
    print(f"{'shot':<18} {'colours':>8} {'whole frame':>12}   note")
    for name in shots:
        png = OUT / f'{args.device}-{name}.png'
        if not png.exists():
            print(f'{name:<18} {"-":>8} {"-":>12}   missing: {png}')
            continue
        whole = count(png)
        masked = count(png, mask) if name in ('ui_title', 'ui_name_entry') else whole
        note = 'logo masked' if masked != whole else ''
        flag = ' OVER' if args.limit and masked > args.limit else ''
        worst = max(worst, masked)
        print(f'{name:<18} {masked:>8} {whole:>12}   {note}{flag}')
    if args.limit and worst > args.limit:
        print(f'FAIL: {worst} colours > {args.limit}')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
