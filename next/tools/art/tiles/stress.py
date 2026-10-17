"""Autotile stress test: every terrain painted as random blobs, single cells, diagonal touches and 1-wide
lines over a base, rendered with compose.py rules. Output: out/stress_<base>.png (3x).

    python stress.py
"""
import os, random
from compose import render, TileDB
from pxlib import OUT_DIR


def blobs(W, H, ids, seed):
    rng = random.Random(seed)
    g = [[None] * W for _ in range(H)]
    for t in ids:
        for _ in range(3):
            cx, cy = rng.randrange(W), rng.randrange(H)
            r = rng.choice([0, 1, 1, 2])
            for y in range(cy - r, cy + r + 1):
                for x in range(cx - r - 1, cx + r + 2):
                    if 0 <= x < W and 0 <= y < H and rng.random() < 0.8:
                        g[y][x] = t
        # a 1-wide line and a diagonal pair
        lx, ly = rng.randrange(W - 6), rng.randrange(H)
        for x in range(lx, lx + 5):
            g[ly][x] = t
        dx, dy = rng.randrange(W - 2), rng.randrange(H - 2)
        g[dy][dx] = t
        g[dy + 1][dx + 1] = t
    return g


def main():
    db = TileDB()
    for base, ids in (('grass', ['dirt', 'plaza', 'sand', 'tallgrass', 'water', 'shallow']),
                      ('stone_floor', ['pit', 'ink', 'moss', 'carpet_red', 'wood_floor']),
                      ('archive_floor', ['pit', 'ink', 'moss', 'carpet_blue'])):
        W, H = 32, 20
        g = blobs(W, H, ids, hash(base) & 0xffff if False else len(base) * 97)
        chars = {}
        legend = {}
        for i, t in enumerate([base] + ids):
            ch = '.abcdefghij'[i]
            chars[t] = ch
            legend[ch] = t
        rows = [''.join(chars[c] if c else '.' for c in row) for row in g]
        sc = {'name': 'stress_' + base, 'legend': legend, 'ground': rows, 'under': base}
        cv = render(sc, db)
        cv.save(os.path.join(OUT_DIR, 'stress_%s.png' % base), 3)
        print('wrote stress_%s.png' % base)


if __name__ == '__main__':
    main()
