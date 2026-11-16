"""Paper-doll parts for the Episode 8 cast of the Scriptorium and the First Library (E8-sprites). Same legend and 24x32
cell as npc_parts.py; nothing in the shared part tables is edited: ep8_npcs.py calls register() to add these to the live
tables at build time.

New head:
  shadowed       the Librarian under his hood: the face is a violet-black void (every skin pixel of the 'short' head
                 turned to the deep hair step, which the Librarian maps to ink), so no frame ever shows his face
  elder_long     the First Keeper: npc_parts' 'elder' head with the white side hair let down to the shoulders
New hat:
  deep_hood      the Librarian: npc_parts' hood pulled one row lower over the brow
New accessories:
  hood_back      the First Keeper and Fen: a hood lying back on the shoulders behind the head (sec class); drawn
                 under the head
  book_clasp     the First Keeper: a gold book clasp at the throat (accent)
  quill_ear      Elowen: a white quill behind her left ear, its tip above the hair (accent class mapped to quill white)
  pages_arms     Quinn: loose pages tucked under both arms (sec class mapped to paper)
  long_sleeves   Fen: sleeves too long for him, hanging over both hands (top class)
  taper_pole     Arun: a long pole with a lit taper at its tip (wood pole, glow flame)
  ink_nose       Meya: a smudge of ink on her nose (metal class mapped to ink)
  bundle_held    the baby bundle in both arms: fine grey infirmary wool, a pale linen tag at one corner (metal class
                 for the wool, accent for the tag)
  blanket_held   the nurse's empty blanket, limp over both arms (the same wool and tag, hanging)
Class letters as npc_parts.py: hat n o v y (dark to light), accent g G Y, metal m M N O, wood u U X, skin w s S T,
sec l b B V, glow z Z.
"""


NL = chr(10)


def _grid(rows):
    return '\n' + '\n'.join(rows) + '\n'


_TAPER = ['..zZ..',
          '.0Zz0.',
          '..0Z0.',
          '.0XX0.',
          '.0UU0.',
          '..0U0.'] + ['..0U0.'] * 21 + ['..0u0.', '..000.']

# the bundle: a rounded roll of grey wool held across the chest, the fold at the top, a pale linen tag at its corner
_BUNDLE = ['..000000...',
           '.0NNONNM0..',
           '0NOONNNNM0.',
           '0MNNNNNMm0.',
           '0NNMNNMMm0G',
           '.0mMMMMm0GY',
           '..000000.0.']
_BUNDLE_SIDE = ['.00000..',
                '0NOONM0.',
                '0NNNNMm0',
                '0MNNMMm0',
                '.0mmmm0G',
                '..0000.Y']
# the empty blanket: the same wool hanging limp over both forearms, its tag swinging at the low corner
_BLANKET = ['.000000000000.',
            '0NONNNNNNNONM0',
            '0MNNMNNNNMNMm0',
            '.0MmNMNNMmMm0.',
            '..0mMmMmMMm0..',
            '...0MmmMmm0...',
            '....0mMm00....',
            '.....0m0G.....',
            '......0.Y.....']
_BLANKET_SIDE = ['.000000.',
                 '0NONNNM0',
                 '0NNMNMm0',
                 '0MmNMm0.',
                 '.0mMm0..',
                 '..0m0G..',
                 '...0.Y..']


def _mirror(rows):
    w = max(len(r) for r in rows)
    return [r.ljust(w, '.')[::-1] for r in rows]


ACC_EP8 = {
    # a hood lying back on the shoulders: from the front a dark collar of cloth either side of the neck; from the side a
    # fold behind the head; from behind the hood's full back over the shoulders
    'hood_back': {
        'down': (_grid(['.0VBBb0000bBBV0.',
                        '0VBBBbbllbbBBBV0',
                        '0BBbbblllbbbbBb0',
                        '.00000000000000.']), 4, 12),
        'left': (_grid(['...000..',
                        '..0VBB0.',
                        '.0VBBbb0',
                        '.0BBbbl0',
                        '0VBbbll0',
                        '0Bbbll0.',
                        '.0000...']), 14, 9),
        'up': (_grid(['....00000000....',
                      '...0VBBBBBBb0...',
                      '..0BBBBBBBBbb0..',
                      '..0BbBBBBBBbl0..',
                      '...0bbBBBbbl0...',
                      '....0bbbbll0....',
                      '.....000000.....']), 4, 10),
    },
    'book_clasp': {
        'down': (_grid(['0GY0', '.GG.']), 10, 13),
        'left': (_grid(['GY', 'G.']), 7, 13),
    },
    'quill_ear': {
        'down': (_grid(['Y...',
                        'GY..',
                        'GY..',
                        '.GY.',
                        '..G.',
                        '...g']), 4, 0),
        'left': (_grid(['...Y',
                        '..YG',
                        '..YG',
                        '.YG.',
                        '.G..',
                        'g...']), 14, 1),
        'up': (_grid(['Y...',
                      'GY..',
                      'GY..',
                      '.GY.',
                      '..G.',
                      '...g']), 4, 1),
    },
    'pages_arms': {
        'down': (_grid(['0000...........00000',
                        '0VBV0.........0VBVV0',
                        '0BVB0.........0BVBV0',
                        '0VBb0.........0bBVB0',
                        '00000..........00000']), 1, 17),
        'left': (_grid(['.00000',
                        '0VVBV0',
                        '0BVVB0',
                        '0VBVb0',
                        '.00000']), 8, 17),
        'up': (_grid(['00000..........0000',
                      '0VVBV0.........0VBV0',
                      '0VBVB0.........0BVB0',
                      '0BVBb0.........0bBV0',
                      '00000..........00000']), 1, 17),
    },
    'long_sleeves': {
        'down': (_grid(['...0CCc0.......0cCC0',
                        '...0CCk0.......0kCC0',
                        '....0c0.........0c0.']), 0, 20),
        'left': (_grid(['....0CCc0',
                        '....0Cck0',
                        '.....0c0.']), 0, 20),
        'up': (_grid(['...0CCc0.......0cCC0',
                      '...0CCk0.......0kCC0',
                      '....0c0.........0c0.']), 0, 20),
    },
    'taper_pole': {
        'down': (_grid(_TAPER), 16, 0),
        'left': (_grid(_TAPER), 1, 0),
        'up': (_grid(_mirror(_TAPER)), 2, 0),
    },
    'ink_nose': {
        'down': (_grid(['mM']), 11, 14),
        'left': (_grid(['m']), 7, 14),
    },
    'bundle_held': {
        'down': (_grid(_BUNDLE), 7, 17),
        'left': (_grid(_BUNDLE_SIDE), 3, 17),
    },
    'blanket_held': {
        'down': (_grid(_BLANKET), 5, 17),
        'left': (_grid(_BLANKET_SIDE), 3, 17),
    },
}


def _shadowed_head():
    """the 'short' head with every face pixel (skin and eyes) turned to the deep hair step: under the hood it reads as a
    violet-black void with the hood's rim around it"""
    import npc_parts as NP
    out = {}
    for d, g in NP.HEADS['short'].items():
        out[d] = ''.join('a' if ch in 'wsSTEF' else ch for ch in g)
    return out


def _elder_long():
    """npc_parts' 'elder' head (the bald crown of great age) with the white side hair let down to the shoulders, as the
    hooded_sage portrait wears it"""
    import npc_parts as NP
    out = {}
    for d, g in NP.HEADS['elder'].items():
        rows = [list(r.ljust(24, '.')) for r in g.strip(NL).split(NL)]
        rows = [r for r in rows]
        while len(rows) < 17:
            rows.append(['.'] * 24)
        if d == 'down':
            locks = [(5, 'Hh'), (17, 'hH')]
        elif d == 'left':
            locks = [(15, 'Hha')]
        else:
            locks = [(6, 'HhHhHhHhHhha')]
        for y in range(10, 16):
            for x0, pat in locks:
                n = len(pat) if y < 15 else max(1, len(pat) - 2)
                xs = x0 + (len(pat) - n) // 2
                for i in range(n):
                    rows[y][xs + i] = pat[i] if y < 14 else 'h'
                for xx in (xs - 1, xs + n):
                    if rows[y][xx] in '.':
                        rows[y][xx] = '0'
        for x in range(24):
            if any(rows[15][x] == c for c in 'Hhaa') and rows[16][x] == '.':
                rows[16][x] = '0'
        out[d] = NL + NL.join(''.join(r) for r in rows) + NL
    return out


def _deep_hood():
    """npc_parts' hood one row lower: the hood's brow comes down over the eyes"""
    import npc_parts as NP
    out = {}
    for d, g in NP.HATS['hood'].items():
        out[d] = g
    return out


def register():
    """add the Episode 8 parts to the live paper-doll tables (idempotent)"""
    import npc_parts as NP
    import npc_bodies as NB
    NB.ACC.update(ACC_EP8)
    if 'shadowed' not in NP.HEADS:
        NP.HEADS['shadowed'] = _shadowed_head()
    if 'elder_long' not in NP.HEADS:
        NP.HEADS['elder_long'] = _elder_long()
    if 'deep_hood' not in NP.HATS:
        NP.HATS['deep_hood'] = _deep_hood()
        NP.HAT_DY['deep_hood'] = NP.HAT_DY.get('hood', 1) + 1
