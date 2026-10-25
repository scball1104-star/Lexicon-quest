"""Enemy battle sprites -> assets/sprites/enemies_battle.png/.json

Painted sources (../assets/art/enemies.png 4x2) are cut out, area-downscaled, quantized to a per-sprite
palette, recoloured per variant, re-quantized to k colours and snapped to the master palette, despeckled
with a majority filter (cleanup.py, CRITIQUE_1 C8), and given a 1 px outer outline in the darkest step of
each material's ramp. Feature fixes (eyes) are hand-placed pixels.
"""
import os
from pix import *
import pal as P
from srcutil import grid_cell, main_object, fit_size
import recolor as RC
from build_portraits import harmonize
import cleanup as CL

# id: (cell, target height, k, recolour fn, options)
ENEMIES = {
    'ink_slime':   dict(cell=0, h=48, k=14),
    'page_wraith': dict(cell=1, h=72, k=14, recolor='sepia', eyes=[(230, 68), (240, 68)], eye_col='magic_cyan:3', brow=False, rim={'ink': 4}),
    'briar_wolf':  dict(cell=2, h=60, k=16, recolor='briar', flip=True, eyes=[(93, 233)], eye_col='gold:4', brow=True),
    'moss_scarab': dict(cell=3, h=50, k=16, flip=True),
    'bookmite':    dict(cell=3, h=38, k=12, recolor='sepia_mite', flip=True, rim={'ink': 4, 'shadow': 3, 'stone_cool': 3}),
    'tome_golem':  dict(cell=4, h=88, k=16),
    'ink_wraith':  dict(cell=7, h=84, k=14, recolor='ink', rim=True),
}
# rim: W5-art (CRITIQUE_2 item 4). Dark sprites get a 1 px rim light on their upper-left edges (a lighter
# step of their own ramp) and their darkest fill lifted one ramp step, so they separate from the Archive
# stage; the recolour stops below start at ink:1 for the same reason (the outline stays ink:0).


def R(ref):
    return P.color(ref)


def recolour(a, how):
    if how in ('sepia', 'sepia_mite'):
        stops = [(0.0, R('ink:1')), (0.16, R('ink:2')), (0.30, R('ink:2')), (0.44, R('earth:2')),
                 (0.58, R('earth:4')), (0.72, R('path:3')), (0.86, R('sand:2')), (1.0, R('sand:3'))]
        if how == 'sepia_mite':
            stops = [(0.0, R('ink:1')), (0.14, R('ink:2')), (0.3, R('earth:1')), (0.46, R('earth:2')),
                     (0.62, R('earth:3')), (0.8, R('path:3')), (1.0, R('sand:3'))]
        if how == 'sepia':
            # glowing blue eyes stay, pushed to cyan glow
            keep = lambda L, C, h: (h > 220) & (h < 275) & (C > 0.13) & (L > 0.5)
            glow = lambda rgb: np.tile(np.array(hex2rgb(R('magic_cyan:3')), np.float32) / 255, (len(rgb), 1))
            return RC.gradient_map(a, stops, keep=keep, keep_fn=glow)
        keep = lambda L, C, h: (L > 0.97)
        return RC.gradient_map(a, stops, keep=keep)
    if how == 'ink':
        stops = [(0.0, R('ink:1')), (0.2, R('ink:2')), (0.4, R('ink:2')), (0.62, R('ink:3')),
                 (0.82, R('ink:4')), (1.0, R('magic_violet:3'))]
        keep = lambda L, C, h: (L > 0.97)
        return RC.gradient_map(a, stops, keep=keep)
    if how == 'briar':
        return RC.brown_green(a)
    return a


def make_enemy(eid, spec, src):
    obj = main_object(grid_cell(src, 4, 2, spec['cell']), keep_frac=0.04, max_dist=40)
    tw, th = fit_size(obj, th=spec['h'])
    d, pal = pixelize2(obj, tw, th, k=spec['k'], sharpen=0.0, max_de=0.10, ring=False)
    if spec.get('recolor'):
        d = recolour(d, spec['recolor'])     # maps the k quantized colours, so the count stays at k
    d = CL.snap_master(d, spec.get('snap', 0.04))
    d = CL.merge_close(d, 0.035)
    prot = CL.accent_mask(d)
    d = CL.despeckle(d, protect=prot)
    big = blank(tw + 2, th + 2)
    big[1:-1, 1:-1] = d
    big = drop_specks(big, 6)
    big = CL.ramp_outline(big)
    if spec.get('eyes'):
        # hand-placed eye accents mapped from the painting (they vanish in the area downscale)
        oh, ow = obj.shape[:2]
        ec = np.array(hex2rgb(P.color(spec['eye_col'])), np.float32) / 255
        dark = np.array(hex2rgb(P.color('ink:0')), np.float32) / 255
        for sx, sy in spec['eyes']:
            x = int(round(sx * tw / ow)) + 1
            y = int(round(sy * th / oh)) + 1
            big[y, x, :3] = ec; big[y, x, 3] = 1
            if spec.get('brow'):
                big[y, x - 1, :3] = ec * 0.8; big[y, x - 1, 3] = 1
                big[y - 1, x - 1:x + 1, :3] = dark
                big[y + 1, x, :3] = dark
    if spec.get('flip'):
        big = flip_x(big)
    if spec.get('rim'):
        # after the flip: the rim sits on the screen's upper-left edges of the final, right-facing sprite
        lift = spec['rim'] if isinstance(spec['rim'], dict) else None
        big = CL.lift_darkest(big, 'ink')
        big = CL.rim_light(big, prefer=('ink', 'shadow', 'stone_cool', 'earth', 'wood'), lift=lift)
    return big


def build():
    src = load_src('enemies.png')
    out = {}
    for eid, spec in ENEMIES.items():
        out[eid] = make_enemy(eid, spec, src)
    return out


def build_battle():
    e = build()
    sh = Shelf(256, pad=2)
    for eid in ENEMIES:
        sh.add(eid, e[eid])
    sheet, rects = sh.render()
    origin = {n: [r[2] // 2, r[3] - 1] for n, r in rects.items()}
    # W6-anim: derived frames (<id>_idle_1, _attack, _hurt, _cast for casters, _die_0..2) packed under the
    # base frames; the base frames keep their rects
    import anim_frames as AF, anim_atlas as AA
    derived, anims = [], {}
    for eid in ENEMIES:
        fr = AF.derive_enemy(eid, e[eid])
        derived += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    sheet, rects, origin = AA.append(sheet, rects, origin, derived)
    for eid in ENEMIES:
        anims.update(AA.enemy_anims(eid, rects))
    # W8-art: the Whisperwood Hollow foes get their own frames (base + the same derived set), packed in a
    # third block under everything above, so no existing rect moves (hollow_enemies.py)
    import hollow_enemies as HE
    sheet, rects, origin = AA.append(sheet, rects, origin, HE.atlas_frames())
    for eid in HE.IDS:
        anims.update(AA.enemy_anims(eid, rects))
    # E2-sprites: the Episode 2 foes (ep2_enemies.py) and the Other Selves (ep2_reflections.py), base and derived
    # frames in a fourth block under everything above, so no existing rect moves
    import ep2_enemies as E2, ep2_reflections as RF
    sheet, rects, origin = AA.append(sheet, rects, origin, E2.atlas_frames() + RF.battle_frames())
    for eid in list(E2.IDS) + list(RF.IDS):
        anims.update(AA.enemy_anims(eid, rects))
    # E3-sprites: the Episode 3 foes, the Bellows Specter and the Furnace Coils (ep3_enemies.py), base and derived
    # frames in a fifth block under everything above, so no existing rect moves
    import ep3_enemies as E3
    sheet, rects, origin = AA.append(sheet, rects, origin, E3.atlas_frames())
    for eid in E3.ALL_IDS:
        anims.update(AA.enemy_anims(eid, rects))
    AA.save_indexed(sheet, os.path.join(DST, 'enemies_battle.png'))
    meta = {'image': 'enemies_battle.png', 'frames': rects,
            'origin': origin,
            'anims': anims,
            'facing': 'right',
            'external': {'echo_warden': 'bosses_battle', 'archivore': 'bosses_battle', 'lost_page': 'bosses_battle',
                         'nameless_king': 'bosses_battle', 'nameless_king_unmasked': 'bosses_battle',
                         'cinder_warden': 'bosses_battle', 'cinder_warden_molten': 'bosses_battle', 'cinder_warden_quenched': 'bosses_battle'},
            'notes': 'Base frame <id> per enemy, facing RIGHT toward the party; origin = bottom-centre, per frame in `origin`. Derived frames (W6-anim, tools/art/sprites/anim_frames.py): <id>_idle_1 (breathe, alternates with <id> every 36 frames), <id>_attack (lunge), <id>_hurt (squash + recoil), <id>_cast (page_wraith, ink_wraith), <id>_die_0..2 (crumble from the top, played before the white flash). Draw every frame by its own origin. echo_warden, archivore and lost_page live in bosses_battle.json. W8-art: thornback_wolf, ink_blot and briar_alpha (Whisperwood Hollow) have their own base and derived frames at 1x (tools/art/sprites/hollow_enemies.py); draw them unscaled and untinted. E2-sprites: the Episode 2 foes (mist_wolf, glassback, quicksilver, quicksilver_bead, glint_wisp, glass_sentinel, borrowed_shadow, faceless_knight, false_sorrow, false_pride, shard_swarm; ep2_enemies.py) and the Other Selves (refl_hero, refl_mira, refl_bram; ep2_reflections.py) have base + idle_1, attack, hurt, die_0..2, and cast for glint_wisp, borrowed_shadow, false_sorrow and the reflections; 1x, untinted. nameless_king and nameless_king_unmasked live in bosses_battle.json. E3-sprites: cinder_hound, cinder_beetle, slag_slime, ashbound_miner, furnace_construct, soot_phantom, forge_defender, bellows_specter (mini-boss, 96 px cell), bellows_coil and smelter_coil (ep3_enemies.py, ep3_coils.py) have base + idle_1, attack, hurt, die_0..2 (cast for ashbound_miner, soot_phantom, bellows_specter); 1x, untinted; ember death dissolve. The three Cinder Warden looks live in bosses_battle.json.'}
    write_json(os.path.join(DST, 'enemies_battle.json'), meta)
    contact(list(e.items()) + list(HE.base().items()), os.path.join(OUT, 'enemies_battle_4x.png'), scale=4, cols=5, title='enemies_battle at 4x (facing right)')
    contact([(n, f) for n, f in E2.base().items()] + [(n, f) for n, f, _, _ in RF.battle_frames() if n in RF.IDS],
            os.path.join(OUT, 'enemies_battle_ep2_4x.png'), scale=4, cols=5, title='enemies_battle Episode 2 at 4x (facing right)')
    return meta


def build_field():
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
    import enemy_field as EF
    sh = Shelf(256, pad=1)
    items = []
    anims = {}
    sizes = {}
    for eid, d in EF.FIELD.items():
        leg = P.resolve(d['pal'], 'field_' + eid)
        w, h = d['size']
        names = []
        for i, gtxt in enumerate(d['frames']):
            im = parse_grid(grid_from_text(gtxt), leg, w=w, h=h)
            n = f'{eid}_{i}'
            sh.add(n, im)
            items.append((n, im))
            names.append(n)
        anims[f'{eid}_idle'] = {'frames': names, 'fps': 3 if eid in ('page_wraith', 'ink_wraith', 'archivore', 'lost_page') else 4, 'loop': True}
        sizes[eid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    # W8-art (CRITIQUE_3 #10): the Archivore's field avatar, the battle boss at map scale (a hovering winged eye,
    # chars/archivore_avatar.py). Appended after every grid sprite, so no existing rect moves.
    import archivore_avatar as AV
    names = []
    for i, im in enumerate(AV.frames()):
        n = f'archivore_avatar_{i}'
        sh.add(n, im)
        items.append((n, im))
        names.append(n)
    anims['archivore_avatar_idle'] = {'frames': [names[0], names[2], names[1], names[2]], 'fps': 5, 'loop': True}
    sizes['archivore_avatar'] = {'size': [AV.W, AV.H], 'origin': [AV.W // 2, AV.H - 1], 'hover': AV.HOVER}
    # W8-art: field sprites for the Whisperwood Hollow foes (their kin's grids in their own palettes)
    for vid, (src_id, pal) in EF.VARIANTS.items():
        d = EF.FIELD[src_id]
        leg = P.resolve(pal, 'field_' + vid)
        w, h = d['size']
        names = []
        for i, gtxt in enumerate(d['frames']):
            im = parse_grid(grid_from_text(gtxt), leg, w=w, h=h)
            n = f'{vid}_{i}'
            sh.add(n, im)
            items.append((n, im))
            names.append(n)
        anims[f'{vid}_idle'] = {'frames': names, 'fps': 4, 'loop': True}
        sizes[vid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    # E2-sprites: the Episode 2 foes (their kin's grids in their own palettes, the shard swarm's own grid), the Other
    # Selves (party_field frames in glass, left stand and step) and the Nameless King's avatar (front and back).
    # Appended after every earlier frame on the same shelf, so no existing rect moves.
    import enemy_field_ep2 as F2, ep2_reflections as RF, king_avatar as KA
    ep2 = []
    for vid, (src_id, pal) in F2.VARIANTS_EP2.items():
        d = EF.FIELD[src_id]
        leg = P.resolve(pal, 'field_' + vid)
        ep2.append((vid, [parse_grid(grid_from_text(g), leg, w=d['size'][0], h=d['size'][1]) for g in d['frames']], 4))
    leg = P.resolve(F2.SWARM['pal'], 'field_shard_swarm')
    ep2.append(('shard_swarm', [parse_grid(grid_from_text(g), leg, w=16, h=16) for g in F2.SWARM['frames']], 5))
    for rid, blk in RF.field_blocks().items():
        ep2.append((rid, [blk['left'][0], blk['left'][1]], 4))
    kf = KA.frames()
    ep2.append(('nameless_king_avatar', kf[0:2], 2))
    ep2.append(('nameless_king_avatar_back', kf[2:4], 2))
    for vid, imgs, fps in ep2:
        names = []
        for i, im in enumerate(imgs):
            n = f'{vid}_{i}'
            sh.add(n, im)
            items.append((n, im))
            names.append(n)
        anims[f'{vid}_idle'] = {'frames': names, 'fps': fps, 'loop': True}
        h, w = imgs[0].shape[:2]
        sizes[vid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    # E3-sprites: the Episode 3 foes, kin grids in charcoal, soot, bronze and ember with a warm rim light
    import enemy_field_ep3 as F3, ep3_enemies as E3
    e3names = set()
    for vid, (src_id, pal) in F3.VARIANTS_EP3.items():
        d = EF.FIELD[src_id]
        leg = P.resolve(pal, 'field_' + vid)
        w, h = d['size']
        names = []
        for i, gtxt in enumerate(d['frames']):
            im = parse_grid(grid_from_text(gtxt), leg, w=w, h=h)
            im = E3.rim(im, {'rim': E3.FIELD_RIM[vid]})
            n = f'{vid}_{i}'
            sh.add(n, im)
            items.append((n, im))
            names.append(n)
            e3names.add(n)
        anims[f'{vid}_idle'] = {'frames': names, 'fps': 4, 'loop': True}
        sizes[vid] = {'size': [w, h], 'origin': [w // 2, h - 1]}
    import warden_avatar as WA
    wf = WA.frames()
    for nm, imgs, seq in (('cinder_warden_avatar', wf[0:2], [0, 1]), ('cinder_warden_avatar_back', wf[2:4], [0, 1])):
        names = []
        for i, im in enumerate(imgs):
            n = f'{nm}_{i}'
            sh.add(n, im); items.append((n, im)); names.append(n); e3names.add(n)
        anims[f'{nm}_idle'] = {'frames': names, 'fps': 2, 'loop': True}
        sizes[nm] = {'size': [WA.W, WA.H], 'origin': [WA.W // 2, WA.H - 1]}
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'enemies_field.png'))
    meta = {'image': 'enemies_field.png', 'frames': rects, 'anims': anims, 'sprites': sizes, 'facing': 'left',
            'notes': 'Visible map enemies. Frames face LEFT; draw flipped (scaleX -1) when moving right. 2-frame idle/hop; when an enemy steps, show frame 1 for the step. origin = bottom-centre (feet on the tile bottom). archivore_avatar (W8-art): the boss on the field, 55x52, frontal, hovering `hover` px above its feet (the shadow shows under it); _0 wings up, _1 wings down, _2 level; the field alternates _0/_1, anim archivore_avatar_idle plays 0,2,1,2. E2-sprites: Episode 2 foes as the grids of their Episode 1 kin in their own palettes, shard_swarm (16x16), refl_hero/refl_mira/refl_bram (24x32, left stand and step; the 4-direction walking versions are in npcs.json and win the sprite lookup), nameless_king_avatar (40x50, frontal) and nameless_king_avatar_back (the same seen from behind; a separate sprite id).'}
    write_json(os.path.join(DST, 'enemies_field.json'), meta)
    contact(items, os.path.join(OUT, 'enemies_field_6x.png'), scale=6, cols=6, title='enemies_field at 6x (facing left)')
    contact([(n, im) for n, im in items if n in e3names], os.path.join(OUT, 'enemies_field_ep3_6x.png'), scale=6, cols=7,
            title='enemies_field Episode 3 at 6x (facing left)', bg=(86, 76, 70))
    e2n = {f'{v}_{i}' for v, imgs, _ in ep2 for i in range(len(imgs))}
    contact([(n, im) for n, im in items if n in e2n], os.path.join(OUT, 'enemies_field_ep2_6x.png'), scale=6, cols=8,
            title='enemies_field Episode 2 at 6x (facing left)')
    return meta


if __name__ == '__main__':
    build_battle()
    build_field()
