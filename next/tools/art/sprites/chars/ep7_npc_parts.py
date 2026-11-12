"""Paper-doll parts for the Episode 7 cast of the White Road and Palehaven (E7-sprites). Same legend and 24x32 cell as
npc_parts.py; nothing in the shared part tables is edited: ep7_npcs.py calls register() to add these to the live tables
at build time.

New hat:
  fur_hood       Bryn: the guard's hood (npc_parts 'hood') with a fur trim round the face (sec class, so the hood
                 and its fur take two ramps)
New accessories:
  keeper_lamp    Nox and the Keeper's mother: a small iron lamp hung from the hand (metal frame, glow flame); the
                 Willowmere 'lantern' with an iron ring for its handle
  ink_hand       Nox: ink on her right hand only (wood class mapped to ink), the hand that never quite washes clean
  lantern_staff  Bryn: a tall staff with a lantern hung from a hook at its top
  lens_cord      Eira: a glass lens on a cord round her neck (accent cord, glow lens)
  twine_wrists   Sol: twine wound round both wrists (accent)
  stakes_back    Sol: a pack of marker stakes on his back (sec pack, wood stakes); drawn behind the head
  moss_basket    Maera: a basket of winter moss held in front in both hands (wood basket, glow moss)
  post_badge     Marten: the brass Willowmere post badge on the courier's coat (metal)
  grin           Marten: a ready grin (a wider mouth, its corners up)
Frost on a hem and snow to the knees are not parts: ep7_npcs.py dithers them onto the finished frames, so they hold in
every walk frame.
Class letters as npc_parts.py: hat n o v y (dark to light), accent g G Y, metal m M N O, wood u U X, skin w s S T,
sec l b B V, glow z Z.
"""

_LAMP = """
..0M0..
.0M.M0.
..0M0..
.0MMM0.
0MzZzM0
0MZZzM0
0MzzzM0
.0MMM0.
..000..
"""

_STAFF = ['.0000...',
          '0UUUU0..',
          '.0U00M0.',
          '.0U0MMM0',
          '.0U0MzM0',
          '.0U0MZM0',
          '.0U0MMM0',
          '.0U00000'] + ['.0U0'] * 19 + ['.0u0', '.000']


def _mirror(rows):
    w = max(len(r) for r in rows)
    return [r.ljust(w, '.')[::-1] for r in rows]


def _grid(rows):
    return '\n' + '\n'.join(rows) + '\n'


ACC_EP7 = {
    'keeper_lamp': {
        'down': (_LAMP, 16, 22),
        'left': (_LAMP, 3, 22),
        'up': (_LAMP, 2, 22),
    },
    # her right hand: screen left from the front, the near hand from the side, screen right from behind
    'ink_hand': {
        'down': ('\n'.join(['....uUu.................',
                            '....uuU.................']), 0, 21),
        'left': ('\n'.join(['.....uU.................',
                            '.....uu.................']), 0, 21),
        'up': ('\n'.join(['.................Uuu....',
                          '.................uuu....']), 0, 21),
    },
    'lantern_staff': {
        'down': (_grid(_STAFF), 0, 2),
        'left': (_grid(_STAFF), 1, 2),
        'up': (_grid(_mirror(_STAFF)), 16, 2),
    },
    # a cord in a V down the chest to a round glass lens
    'lens_cord': {
        'down': ("""
G.....G
.G...G.
..G.G..
..0z0..
.0zZz0.
..0z0..
""", 8, 15),
        'left': ("""
G..
.G.
.0z0
0zZz0
.0z0.
""", 7, 15),
    },
    'twine_wrists': {
        'down': ('\n'.join(['....0YGY0.......0GYG0...']), 0, 20),
        'left': ('\n'.join(['.....YGY................']), 0, 20),
        'up': ('\n'.join(['....0YGY0.......0GYG0...']), 0, 20),
    },
    # marker stakes in a pack on his back: from the front only the stake tips show over the shoulders
    'stakes_back': {
        'down': ("""
.0........0.
0X0......0X0
0U0......0U0
0U0......0U0
""", 6, 10),
        'left': ("""
...0.0..
..0X0X0.
..0U0U0.
..0U0U0.
.00U0U00
0VBBBBb0
0BBBBbb0
0BbbBbb0
0BBBBbl0
0BBBbbl0
0bBBbbl0
.0000000
""", 13, 8),
        'up': ("""
...0..0..0...
..0X00X00X0..
..0U00U00U0..
..0U00U00U0..
.00U00U00U00.
0VBBBBBBBBbb0
0BBBBBBBBBbl0
0BbbbbbbbbBl0
0BBBBBBBBBbl0
0BBBBBBBBbbl0
0bBBBBBBBbll0
.00000000000.
""", 5, 10),
    },
    'moss_basket': {
        'down': ("""
..0z0Z0zZ0..
.0ZzZzZzZz0.
0XUUUUUUUUu0
0UuUuUuUuUu0
0UUUUUUUUUu0
.0uUuUuUuu0.
..00000000..
""", 6, 18),
        'left': ("""
.0z0Z0z0.
0ZzZzZzZ0
0XUUUUUu0
0UuUuUuu0
0UUUUUUu0
.0uUuUu0.
..000000.
""", 1, 18),
    },
    'post_badge': {
        'down': ("""
0O0
OMN
0N0
""", 6, 15),
        'left': ("""
0O0
OMN
0N0
""", 7, 15),
    },
    'grin': {
        'down': ('\n'.join(['..........w..w..........',
                            '..........wwww..........']), 0, 10),
    },
}


def _hood_with_fur():
    """npc_parts' hood with every hood pixel that touches the face opening turned to fur (sec class: B, V alternating)"""
    import npc_parts as NP
    out = {}
    for d, g in NP.HATS['hood'].items():
        rows = [list(r) for r in g.strip('\n').split('\n')]
        H = len(rows)
        W = max(len(r) for r in rows)
        rows = [r + ['.'] * (W - len(r)) for r in rows]
        # the face opening: '.' cells not connected to the grid border through '.'
        outside = [[False] * W for _ in range(H)]
        stack = [(y, x) for y in range(H) for x in range(W) if (y in (0, H - 1) or x in (0, W - 1)) and rows[y][x] == '.']
        while stack:
            y, x = stack.pop()
            if outside[y][x]:
                continue
            outside[y][x] = True
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and rows[yy][xx] == '.' and not outside[yy][xx]:
                    stack.append((yy, xx))
        # the bottom row of the opening is the chin side: open it to the outside so the fur does not run under the chin
        new = [r[:] for r in rows]
        for y in range(H):
            for x in range(W):
                if rows[y][x] in 'nvoy':
                    near = any(0 <= y + dy < H and 0 <= x + dx < W and rows[y + dy][x + dx] == '.' and not outside[y + dy][x + dx]
                               for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2))
                    if near:
                        new[y][x] = 'V' if (x + y) % 3 else 'B'
        # the hem of the hood (its bottom two rows) is fur too
        for y in (H - 2,):
            for x in range(W):
                if new[y][x] in 'nvoy':
                    new[y][x] = 'B' if x % 2 else 'V'
        out[d] = '\n' + '\n'.join(''.join(r) for r in new) + '\n'
    return out


def register():
    """add the Episode 7 parts to the live paper-doll tables (idempotent)"""
    import npc_parts as NP
    import npc_bodies as NB
    NB.ACC.update(ACC_EP7)
    if 'fur_hood' not in NP.HATS:
        NP.HATS['fur_hood'] = _hood_with_fur()
        NP.HAT_DY['fur_hood'] = NP.HAT_DY.get('hood', 1)
