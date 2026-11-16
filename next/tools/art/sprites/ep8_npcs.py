"""Episode 8 cast -> assets/sprites/ep8_npcs.png / .json (E8-sprites).

Paper-doll NPCs (the shared builder, build_npcs.npc_frames, with the parts of chars/ep8_npc_parts.py added to the live
part tables at build time; no shared file is edited). Merged by the pack loader into the `npcs` atlas
(docs/PWA_PACKS.md): frame names are the sprite ids the Episode 8 data names. Looks from docs/story/EPISODE8.md section 3
and EPISODE8_PLAN.md 9.2. Ages read (CRITIQUE_6 item 10: where a character ages, the hair follows):

  npc_librarian       the Librarian at the Index: a violet Keeper's robe, the hood pulled low, the face a violet-black
                      void in every frame (the twist is shown in order: no face until npc_first_keeper), the book clasp
                      at the throat, the cold ink on his right hand
  npc_first_keeper    the same man with the hood back: very old and straight, white hair, gold eyes, the violet robe,
                      the book clasp, the cold ink on his right hand
  npc_first_keeper_m  his memory self sixteen years back and more: the same robe and clasp, his hair still dark and
                      greying, the gold eyes
  npc_first_keeper_m_bundle   the same, carrying the baby bundle out of the vault (keeper_memory_c)
  npc_elowen          Elowen, forties: a Keeper's grey robe, a bindery apron, ink to the wrists, grey at the temples,
                      a quill behind her left ear
  npc_elowen_m        Elowen sixteen years back ("A Young Keeper"): sitting up in an infirmary bed with the baby bundle,
                      dark hair, no grey (every direction shows the bed; a breath for the walk frames)
  npc_nurse_m         an infirmary nurse: npc_parent's dress and apron recoloured to infirmary grey and linen, a
                      headscarf, the empty blanket over her arms
  npc_ione            Ione, sixties: a slate Keeper's robe trimmed violet, ink to the wrists, a ring of drawer keys,
                      grey hair in a bun
  npc_fen             Fen, late teens: a Keeper's grey with the hood down, sleeves too long for him, sandy hair
  npc_quinn           Quinn, twenties: a runner's tunic and satchel, loose pages under both arms, copper hair
  npc_sorel           Sorel, fifties: a restorer's apron, a magnifying lens on a cord, greying hair and moustache
  npc_arun            Arun, seventies: white hair and beard, a candlekeeper's robe, a taper on a long pole
  npc_meya            Meya, a child: ink on her nose, a book in her hands, dark hair
  npc_rootbound_keeper_m  the last Keeper of the Rootbound Archive in memory: a moss-brown hooded robe, a green-bronze
                      lantern
  npc_ep8_innkeeper   the Scriptorium Host: npc_innkeeper recoloured (a violet waistcoat, a cream apron, grey hair)
  npc_ep8_shopkeeper  the Archive Keeper: npc_shopkeeper recoloured (an ink-blue robe trimmed gold, a cream turban)

Props (single 16 x 16 frames, origin bottom-centre): prop_ep8_bundle (the baby bundle: fine grey infirmary wool, a pale
linen tag at one corner) and prop_ep8_blanket (the nurse's empty blanket, folded flat with its tag). Each is also an actor
cell (E8-fixes): the same 16 x 16 drawing at the bottom centre of a 24 x 32 cell, `<id>_down_0`, one direction, in the
`sprites` table, so a cutscene spawn of the prop resolves (world/actors.js resolveSprite needs `<id>_down_0`).

The Scriptorium palette: violet, cream paper, ink black and warm gold.

Frames `<id>_<dir>_<0|1|2|blink>` (24x32, origin [12,31], the default bottom-centre) and anims `<id>_walk_<dir>`,
`<id>_idle_<dir>`, exactly as npcs.json.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import numpy as np
from pix import *
import pal as P
import build_npcs as BN
import npc_specs as S
import x1_npc_parts as XP
import ep4_npc_parts as E4P
import ep5_npc_parts as E5P
import ep6_npc_parts as E6P
import ep7_npc_parts as E7P
import ep8_npc_parts as EP

XP.register()
E4P.register()
E5P.register()
E6P.register()
E7P.register()
EP.register()
R = S.R
HAIR = S.HAIR
CREAM = S.CREAM
DIRS = ['down', 'left', 'right', 'up']
SLOT = ['0', '1', '2', 'blink']
OUT8 = os.path.join(OUT, 'ep8')

VIOLET = R('cloth_purple', 1, 2, 3, 4)
VIOLET_DEEP = R('cloth_purple', 1, 2, 3, 4)
VOID = ['hair_violet:1', 'hair_violet:2', 'hair_violet:3', 'hair_violet:4']
GOLD = R('gold', 2, 3, 4)
GOLD_EYES = ['ink:1', 'gold:3']
SKIN_PALE = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4']     # the portrait's pale face
COLD_INK = ['ink:2', 'ink:3', 'ink:4']
INK_METAL = ['ink:1', 'ink:2', 'ink:3', 'ink:3']
KEEPER_GREY = R('stone_cool', 2, 3, 4, 5)
SLATE = R('stone_cool', 1, 2, 3, 4)
SKIN_OLD = R('skin_light', 0, 1, 2, 3)
SKIN_LIGHT = R('skin_light', 0, 1, 2, 3)
SKIN_MED = R('skin_med', 0, 1, 2, 3)
SKIN_DARK = R('skin_dark', 1, 2, 3, 4)
HAIR_STREAK = ['hair_brown:1', 'hair_brown:2', 'stone_cool:4', 'metal:3']      # dark brown going grey
QUILL = ['stone_cool:4', 'metal:3', 'metal:4']
PAPER = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4']
WOOL = ['stone_cool:2', 'stone_cool:3', 'stone_cool:4', 'stone_cool:5']   # m M N O: fine grey infirmary wool
LINEN = ['stone_warm:4', 'stone_warm:5', 'metal:4']                       # g G Y: the pale linen tag
MOSS_BROWN = ['earth:1', 'earth:2', 'earth:3', 'earth:4']
GREEN_BRONZE = ['foliage_dark:1', 'roof_green:2', 'roof_green:3', 'gold:3']
WINE = R('roof_red', 1, 2, 3, 4)

EP8_NPCS = {
    'npc_librarian': dict(name='The Librarian', body='robe', head='shadowed', hat='deep_hood', over=['book_clasp', 'ink_hand'],
                          pal={'hair': VOID, 'skin': SKIN_OLD, 'top': VIOLET, 'sec': VIOLET_DEEP,
                               'hat': R('cloth_purple', 1, 2, 3, 4), 'accent': GOLD, 'wood': COLD_INK}),
    'npc_first_keeper': dict(name='The First Keeper', body='robe', head='elder_long', under=['hood_back'],
                             over=['book_clasp', 'ink_hand'],
                             pal={'hair': HAIR['white'], 'skin': SKIN_PALE, 'eyes': GOLD_EYES, 'top': VIOLET,
                                  'sec': R('cloth_purple', 1, 2, 3, 4), 'accent': GOLD, 'wood': COLD_INK}),
    'npc_first_keeper_m': dict(name='The First Keeper', body='robe', head='short', under=['hood_back'],
                               over=['book_clasp', 'ink_hand'],
                               pal={'hair': HAIR_STREAK, 'skin': SKIN_PALE, 'eyes': GOLD_EYES, 'top': VIOLET,
                                    'sec': R('cloth_purple', 1, 2, 3, 4), 'accent': GOLD, 'wood': COLD_INK}),
    'npc_elowen': dict(name='Elowen', body='robe', head='pony', over=['apron', 'ink_arms', 'quill_ear'],
                       pal={'hair': HAIR['dark'], 'skin': SKIN_LIGHT, 'top': KEEPER_GREY, 'sec': PAPER,
                            'accent': QUILL, 'metal': INK_METAL}),
    'npc_nurse_m': dict(name='A Nurse', body='dress', head='long', hat='headscarf', over=['apron', 'blanket_held'],
                        no_arms=True,
                        pal={'hair': HAIR['brown'], 'skin': SKIN_MED, 'top': KEEPER_GREY, 'bottom': R('stone_cool', 2, 3, 4),
                             'sec': PAPER, 'hat': ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4'],
                             'metal': WOOL, 'accent': LINEN}),
    'npc_ione': dict(name='Ione', body='robe', head='bun', over=['ink_arms', 'keyring'],
                     pal={'hair': HAIR['gray'], 'skin': SKIN_DARK, 'top': SLATE, 'sec': VIOLET,
                          'accent': GOLD, 'metal': INK_METAL, 'wood': R('gold', 2, 3, 4)}),
    'npc_fen': dict(name='Fen', body='robe', head='short', under=['hood_back'], over=['long_sleeves'], no_arms=True,
                    pal={'hair': HAIR['sandy'], 'skin': SKIN_LIGHT, 'top': KEEPER_GREY, 'sec': R('stone_cool', 1, 2, 3, 4)}),
    'npc_quinn': dict(name='Quinn', body='tunic', head='short', over=['satchel', 'pages_arms'], no_arms=True,
                      pal={'hair': HAIR['copper'], 'skin': SKIN_MED, 'top': WINE, 'bottom': R('earth', 1, 2, 3),
                           'sec': PAPER, 'wood': R('wood', 1, 2, 3), 'accent': GOLD}),
    'npc_sorel': dict(name='Sorel', body='stout', head='short', beard='mustache', over=['apron_wide', 'lens_cord'],
                      pal={'hair': HAIR['greying'], 'skin': SKIN_MED, 'top': R('cloth_purple', 1, 2, 3, 4),
                           'sec': R('wood', 1, 2, 3, 4), 'bottom': R('shadow', 1, 2, 3), 'accent': GOLD,
                           'glow': ['ice:2', 'metal:4']}),
    'npc_arun': dict(name='Arun', body='robe', head='elder', beard='long', over=['taper_pole'], no_arms=True,
                     pal={'hair': HAIR['white'], 'skin': SKIN_MED, 'top': R('roof_red', 1, 2, 3, 4), 'sec': GOLD,
                          'wood': R('wood', 1, 2, 3), 'glow': ['fire:4', 'fire:5']}),
    'npc_meya': dict(name='Meya', body='child', head='pony', head_dy=5, over=['book', 'ink_nose'],
                     pal={'hair': HAIR['black'], 'skin': SKIN_MED, 'top': R('cloth_purple', 2, 3, 4, 5),
                          'bottom': R('shadow', 1, 2, 3), 'wood': R('roof_red', 1, 2, 3), 'accent': GOLD,
                          'metal': ['ink:2', 'ink:3', 'ink:3', 'ink:3']}),
    'npc_rootbound_keeper_m': dict(name='The Rootbound Keeper', body='robe', head='long', hat='hood', over=['keeper_lamp'],
                                   pal={'hair': HAIR['gray'], 'skin': SKIN_LIGHT, 'top': MOSS_BROWN,
                                        'hat': ['earth:1', 'earth:2', 'earth:3', 'earth:4'], 'sec': MOSS_BROWN,
                                        'metal': GREEN_BRONZE, 'glow': ['grass:4', 'grass:5']}),
}


def first_keeper_bundle():
    spec = dict(EP8_NPCS['npc_first_keeper_m'])
    spec['over'] = ['book_clasp', 'bundle_held']
    spec['no_arms'] = True
    spec['pal'] = dict(spec['pal'], metal=WOOL, accent=GOLD)
    return spec


def host():
    """the Scriptorium Host: npc_innkeeper's spec (Hob) recoloured for the Keeper's Quiet Rooms"""
    spec = dict(S.NPCS['npc_innkeeper'])
    spec['name'] = 'The Scriptorium Host'
    spec['pal'] = {'hair': HAIR['gray'], 'skin': SKIN_LIGHT, 'top': VIOLET, 'sec': CREAM, 'bottom': R('shadow', 1, 2, 3),
                   'glow': ['gold:3', 'gold:4']}
    return spec


def archive_keeper():
    """the Archive Keeper: npc_shopkeeper's spec (Pell) recoloured for Bibliotheca Supplies"""
    spec = dict(S.NPCS['npc_shopkeeper'])
    spec['name'] = 'The Archive Keeper'
    spec['pal'] = {'skin': SKIN_DARK, 'hair': HAIR['black'], 'top': R('ink', 1, 2, 3, 4), 'sec': R('gold', 2, 3, 4, 5),
                   'hat': PAPER, 'accent': R('gold', 2, 3, 4)}
    return spec


EP8_NPCS['npc_first_keeper_m_bundle'] = first_keeper_bundle()
EP8_NPCS['npc_ep8_innkeeper'] = host()
EP8_NPCS['npc_ep8_shopkeeper'] = archive_keeper()

# grey at the temples (CRITIQUE_6 item 10): the hair pixels that touch the face in the temple rows go grey, every frame
TEMPLES = {'npc_elowen': (6, 11)}
TEMPLE_GREY = ('stone_cool:4', 'metal:3')


def grey_temples(img, rows, hair_refs, skin_refs):
    out = img.copy()
    cols = lambda refs: [np.array(hex2rgb(P.color(r)), np.float32) / 255 for r in refs]
    hair, skin = cols(hair_refs), cols(skin_refs)
    isc = lambda px, cs: any(np.abs(px - c).max() < 0.02 for c in cs)
    H, W = img.shape[:2]
    hm = np.zeros((H, W), bool)
    sm = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            if img[y, x, 3] > 0.5:
                hm[y, x] = isc(img[y, x, :3], hair)
                sm[y, x] = isc(img[y, x, :3], skin)
    g0, g1 = cols(TEMPLE_GREY)
    for y in range(rows[0], rows[1]):
        for x in range(W):
            if hm[y, x] and any(0 <= x + dx < W and 0 <= y + dy < H and sm[y + dy, x + dx]
                                for dx, dy in ((1, 0), (-1, 0))):
                out[y, x, :3] = g1 if y % 2 else g0
                if 0 <= x - 1 and hm[y, x - 1] and x - 1 < W // 2:
                    out[y, x - 1, :3] = g0
                if x + 1 < W and hm[y, x + 1] and x + 1 >= W // 2:
                    out[y, x + 1, :3] = g0
    return out


def frames_of(nid, spec):
    fr = BN.npc_frames(nid, spec)
    if nid in TEMPLES:
        pal = dict(BN.DEFAULT)
        pal.update(spec['pal'])
        fr = {d: [grey_temples(f, TEMPLES[nid], pal['hair'], pal['skin']) for f in fs] for d, fs in fr.items()}
    return fr


# ----------------------------------------------------------------------------- Elowen in the infirmary bed
BED = """
..000000000000000000....
.0mmMMMMMMMMMMMMMMmm0...
.0mMNNNNNNNNNNNNNNMm0...
.0MNOOOOOOOOOOOOONNM0...
.0MNO0000000000ONNNM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0MN0............0NM0...
.0mmM000000000000MMm0...
.0uuuuuuuuuuuuuuuuuu0...
.0uUUUUUUUUUUUUUUUUu0...
.0uXXXXXXXXXXXXXXXXu0...
.0u0..............0u0...
.000..............000...
"""


def bed_frames():
    """Elowen sitting up in an infirmary bed with the bundle: a plain wooden cot seen from the foot, the pillow at its
    head, the grey wool blanket over her knees to the foot rail; her body is the paper-doll front view (young, dark
    hair) cut at the waist and seated into the bed. Frame 1 and 2 breathe (the body one pixel up); blink shuts the eyes."""
    spec = dict(name='A Young Keeper', body='robe', head='pony', over=['bundle_held'], no_arms=True,
                pal={'hair': HAIR['dark'], 'skin': SKIN_LIGHT, 'top': R('stone_warm', 3, 4, 5), 'sec': PAPER,
                     'metal': WOOL, 'accent': LINEN, 'wood': R('wood', 2, 3, 4)})
    cv = BN.compose_chars(spec, 'down')
    st = BN.colourize(cv, spec, 'npc_elowen_m')
    bcv = [['S' if ch == 'E' else ('E' if ch == 'F' else ch) for ch in row] for row in cv]
    bl = BN.colourize(bcv, spec, 'npc_elowen_m')
    bed_spec = dict(pal={'metal': ['wood:1', 'wood:2', 'wood:3', 'wood:4'], 'wood': R('wood', 1, 2, 3)})
    bed = BN.colourize([list(r.ljust(24, '.')) for r in grid_from_text(BED)], bed_spec, 'npc_elowen_m')
    # the pillow (linen) and the blanket (grey wool) over her lap, drawn on the bed
    pil = np.array(hex2rgb(P.color('stone_warm:5')), np.float32) / 255
    pil2 = np.array(hex2rgb(P.color('metal:4')), np.float32) / 255
    wool = [np.array(hex2rgb(P.color(r)), np.float32) / 255 for r in WOOL]
    out = []
    for k, body in enumerate((st, st, st, bl)):
        img = bed.copy()
        for y in range(5, 11):
            for x in range(5, 17):
                img[y, x, :3] = pil2 if (y == 5 or x in (5, 16)) is False and y < 8 else pil
                img[y, x, 3] = 1
        lift = 1 if k in (1, 2) else 0
        # the body from the head to below the bundle (rows 0..23 of the doll), seated with its head on the pillow
        top = 1 - lift
        for y in range(0, 24):
            for x in range(24):
                if body[y, x, 3] > 0.5 and 0 <= top + y < 32:
                    img[top + y, x] = body[y, x]
        # the blanket from the lap to the foot rail: its turned-down edge lighter, folds every few columns
        for y in range(24, 26):
            for x in range(5, 17):
                img[y, x, :3] = wool[3] if y == 24 else wool[2 if (x + y) % 5 else 1]
                img[y, x, 3] = 1
        for x in range(5, 17):
            img[23, x, :3] = wool[0]
            img[23, x, 3] = 1
        out.append(img)
    return out


def bundle_prop():
    """prop_ep8_bundle: the baby bundle on its own (16 x 16, bottom-centre), the same wool and tag"""
    leg = {'0': 'shadow:0', 'm': WOOL[0], 'M': WOOL[1], 'N': WOOL[2], 'O': WOOL[3], 'g': LINEN[0], 'G': LINEN[1], 'Y': LINEN[2]}
    rows = ['................',
            '................',
            '................',
            '................',
            '................',
            '....000000......',
            '...0NNONNM0.....',
            '..0NOONNNNM0....',
            '..0NNONNNNMm0...',
            '..0MNNNNNMMm0...',
            '..0NNMNNMMm0GG..',
            '...0mMMMMm0GYG..',
            '....000000.0GG..',
            '............0...',
            '................',
            '................']
    return parse_grid(rows, P.resolve(leg, 'prop_ep8_bundle'), w=16, h=16)


def blanket_prop():
    """prop_ep8_blanket: the nurse's empty blanket folded flat, its tag at the corner (16 x 16, bottom-centre)"""
    leg = {'0': 'shadow:0', 'm': WOOL[0], 'M': WOOL[1], 'N': WOOL[2], 'O': WOOL[3], 'g': LINEN[0], 'G': LINEN[1], 'Y': LINEN[2]}
    rows = ['................',
            '................',
            '................',
            '................',
            '................',
            '................',
            '................',
            '.000000000000...',
            '0NOONNNNNNONM0..',
            '0MNNNNMNNNNNM0..',
            '0mmmmmmmmmmmm0..',
            '0NNONNNNNNNNM0..',
            '0MMMMMMMMMMMm0G.',
            '.00000000000000Y',
            '................',
            '................']
    return parse_grid(rows, P.resolve(leg, 'prop_ep8_blanket'), w=16, h=16)


ORDER = list(EP8_NPCS) + ['npc_elowen_m']
PROPS = {'prop_ep8_bundle': bundle_prop, 'prop_ep8_blanket': blanket_prop}


def all_frames():
    blocks = {nid: frames_of(nid, spec) for nid, spec in EP8_NPCS.items()}
    bf = bed_frames()
    blocks['npc_elowen_m'] = {d: list(bf) for d in DIRS}
    return blocks


def build(write=True):
    blocks = all_frames()
    rects, anims = {}, {}
    per = 3
    rows = (len(blocks) + per - 1) // per
    sheet = blank(per * 96, rows * 128 + 16 + 32)
    for bi, (nid, fr) in enumerate(blocks.items()):
        bx, by = (bi % per) * 96, (bi // per) * 128
        i = 0
        for d in DIRS:
            for k, f in enumerate(fr[d]):
                x, y = bx + (i % 4) * 24, by + (i // 4) * 32
                sheet[y:y + 32, x:x + 24] = f
                rects[f'{nid}_{d}_{SLOT[k]}'] = [x, y, 24, 32]
                i += 1
            anims[f'{nid}_walk_{d}'] = {'frames': [f'{nid}_{d}_1', f'{nid}_{d}_0', f'{nid}_{d}_2', f'{nid}_{d}_0'], 'fps': 6, 'loop': True}
            anims[f'{nid}_idle_{d}'] = {'frames': [f'{nid}_{d}_0'] * 26 + [f'{nid}_{d}_blink'] + [f'{nid}_{d}_0'], 'fps': 8, 'loop': True}
    py = rows * 128
    props = {}
    for i, (pid, fn) in enumerate(PROPS.items()):
        im = fn()
        props[pid] = im
        sheet[py:py + 16, i * 16:(i + 1) * 16] = im
        rects[pid] = [i * 16, py, 16, 16]
        # the actor cell: one direction (a prop never turns), the drawing on the cell's bottom centre (origin [12,31])
        ax, ay = i * 24, py + 16
        sheet[ay + 16:ay + 32, ax + 4:ax + 20] = im
        rects[f'{pid}_down_0'] = [ax, ay, 24, 32]
    names = {nid: (EP8_NPCS[nid]['name'] if nid in EP8_NPCS else 'A Young Keeper') for nid in blocks}
    sprites = {nid: {'name': names[nid], 'cell': [24, 32], 'origin': [12, 31], 'dirs': DIRS} for nid in blocks}
    for pid, name in (('prop_ep8_bundle', 'A Baby'), ('prop_ep8_blanket', 'A Blanket')):
        sprites[pid] = {'name': name, 'cell': [24, 32], 'origin': [12, 31], 'dirs': ['down']}
    meta = {'image': 'ep8_npcs.png', 'cell': [24, 32],
            'layout': 'Episode 8 pack atlas, merged into npcs. Humanoid blocks (3 per band, rows down,left,right,up x cols '
                      'stand,stepA,stepB,blink). No atlas `origin`: every frame uses the default bottom-centre [12,31]. '
                      'npc_librarian is the Librarian (hood up, the face in shadow in every frame); npc_first_keeper is the '
                      'same man with the hood back (white hair, gold eyes, the book clasp); npc_first_keeper_m his memory '
                      'self (dark hair greying), npc_first_keeper_m_bundle the same carrying the baby bundle; npc_elowen is '
                      'Elowen (grey at the temples, ink to the wrists, a quill behind her ear) and npc_elowen_m her younger '
                      'self sitting up in an infirmary bed with the bundle (every direction shows the bed); npc_nurse_m holds '
                      'the empty blanket; npc_ep8_innkeeper and npc_ep8_shopkeeper are npc_innkeeper and npc_shopkeeper '
                      'recoloured. Props prop_ep8_bundle and prop_ep8_blanket are single 16x16 frames (bottom-centre), and each '
                      'is also a one-direction 24x32 actor cell <id>_down_0 (the 16x16 drawing on its bottom centre).',
            'sprites': sprites, 'frames': rects, 'anims': anims}
    if write:
        import anim_atlas as AA
        AA.save_indexed(sheet, os.path.join(DST, 'ep8_npcs.png'))
        write_json(os.path.join(DST, 'ep8_npcs.json'), meta)
    return meta, blocks, props


def previews(write=True):
    meta, blocks, props = build(write)
    os.makedirs(OUT8, exist_ok=True)
    items = []
    for nid, fr in blocks.items():
        for d in DIRS:
            items.append((f'{nid[4:]} {d}', fr[d][0]))
    items += [(k, v) for k, v in props.items()]
    for s in (1, 4):
        contact(items, os.path.join(OUT8, f'ep8_npcs_stand_{s}x.png'), scale=s, cols=8,
                title='Episode 8 NPCs: down, left, right, up (stand) at %dx' % s if s > 1 else None, bg=(222, 210, 186),
                label=s > 1)
    walk = []
    for nid, fr in blocks.items():
        walk += [(nid[4:], fr['down'][1]), ('', fr['down'][0]), ('', fr['down'][2]), ('', fr['left'][1]), ('', fr['left'][0]),
                 ('', fr['left'][2])]
    contact(walk, os.path.join(OUT8, 'ep8_npcs_walk_3x.png'), scale=3, cols=12, title='Episode 8 NPC walk frames (3x)',
            bg=(58, 40, 86))
    return meta, blocks


if __name__ == '__main__':
    m, _ = previews(write=False)
    print('ep8_npcs frames', len(m['frames']))
