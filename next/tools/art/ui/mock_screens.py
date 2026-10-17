"""Compose 384x216 mock screens with the real UI assets and save 3x previews (+ 1.8x phone emulation).

    python next/tools/art/ui/mock_screens.py [name ...]

Screens: dialogue, menu, battle_command, battle_break, title.
"""
from __future__ import annotations

import sys

import numpy as np

import uipal as P
from lib import OUT, blank, hexc, paste, save, upscale
from mockkit import Kit, W, H, backdrop, portrait_placeholder, sprite_from

K = None


def put(dst, spr, x, y):
    img, org = spr
    paste(dst, img, x - org[0], y - org[1])


def framed_portrait(dst, img, x, y):
    """Portrait inside a thin window frame (frame inset 2)."""
    s = img.shape[0]
    K.window(dst, x, y, s + 4, s + 4, 'blue', 'thin')
    paste(dst, img, x + 2, y + 2)


# ------------------------------------------------------------------------------------------- (a) dialogue
def dialogue():
    a = backdrop(0)
    put(a, sprite_from('assets/sprites/party_field.json', 'hero_up_0'), 196, 132)
    mira = sprite_from('assets/sprites/party_field.json', 'mira_left_0')
    put(a, mira, 236, 128)
    K.sprite(a, 'emote_exclaim_0', 236 - 4, 128 - 33)
    K.sprite(a, 'prompt_1', 300, 118)
    # NPC bark window with a tail (no portrait)
    bx, by, bw, bh = 252, 44, 118, 20
    K.window(a, bx, by, bw, bh, 'blue', 'field', 0.92)
    K.win.draw_tail(a, bx, by, bw, bh, 302, 'down', 'blue', field=True, alpha=0.92)
    K.text(a, bx + 7, by + 4, 'Fresh rolls! Still warm!')
    # location banner (slides in on map entry)
    K.banner(a, 120, 8, 'Willowmere')
    # dialogue window
    wx, wy, ww, wh = 6, 150, 372, 62
    K.window(a, wx, wy, ww, wh, 'blue', 'field', 0.92)
    framed_portrait(a, portrait_placeholder(3, 48), wx + 6, wy + 5)
    name = 'Elder Mael'
    nw = K.f.ink_width(name) + 14
    K.window(a, wx + 62, wy - 9, nw, 17, 'blue', 'thin')
    K.text(a, wx + 69, wy - 6, name, color='gold')
    text = ('Ah, there you are. Did you sleep through the bell again? The {c:gold}Thirteenth Bell{/c} '
            'rang at midnight, though our tower has only ever held twelve.')
    lines = K.f.wrap(text, ww - 62 - 14)
    for i, ln in enumerate(lines[:3]):
        K.text(a, wx + 64, wy + 10 + i * 11, ln)
    K.sprite(a, 'more_1', wx + ww - 14, wy + wh - 13)
    return a, lines


# ------------------------------------------------------------------------------------------- (b) main menu
PARTY = [
    {'name': 'Hero', 'lv': 7, 'hp': (245, 310), 'mp': (18, 24), 'fury': 0.35, 'exp': 0.62, 'por': 0,
     'weapon': 'icon_sword', 'status': []},
    {'name': 'Mira', 'lv': 7, 'hp': (162, 198), 'mp': (52, 64), 'fury': 1.0, 'exp': 0.40, 'por': 1,
     'weapon': 'icon_staff', 'status': ['regen']},
    {'name': 'Bram', 'lv': 6, 'hp': (61, 352), 'mp': (9, 20), 'fury': 0.7, 'exp': 0.85, 'por': 2,
     'weapon': 'icon_spear', 'status': ['poison', 'chill']},
]


def menu():
    a = backdrop(0)
    a[..., :3] = (a[..., :3].astype(np.float32) * 0.35).astype(np.uint8)
    # party panel
    px, py, pw, ph = 4, 4, 274, 178
    K.window(a, px, py, pw, ph)
    for i, m in enumerate(PARTY):
        ry = py + 6 + i * 57
        framed_portrait(a, portrait_placeholder(m['por'], 32), px + 6, ry + 2)
        x0 = px + 48
        K.text(a, x0, ry + 1, m['name'], color='white')
        K.sprite(a, m['weapon'], x0 + 32, ry + 0)
        K.sprite(a, 'lbl_lv', x0 + 50, ry + 4)
        K.text(a, x0 + 60, ry + 1, str(m['lv']))
        sx = x0 + 78
        for s in m['status']:
            K.sprite(a, f'st8_{s}', sx, ry + 2)
            sx += 9
        # HP
        hp, hpm = m['hp']
        K.sprite(a, 'lbl_hp', x0, ry + 16)
        col = 'white' if hp / hpm > 0.25 else 'red'
        K.text_right(a, x0 + 98, ry + 13, f'{hp}/{hpm}', color=col)
        K.gauge(a, x0, ry + 25, 99, hp / hpm, 'hp')
        # MP
        mp, mpm = m['mp']
        K.sprite(a, 'lbl_mp', x0 + 108, ry + 16)
        K.text_right(a, x0 + 170, ry + 13, f'{mp}/{mpm}')
        K.gauge(a, x0 + 108, ry + 25, 63, mp / mpm, 'mp')
        # Fury + EXP
        K.sprite(a, 'lbl_fury', x0, ry + 34)
        K.gauge(a, x0 + 22, ry + 35, 77, m['fury'], 'fury', thin=True,
                glow_frame=0 if m['fury'] >= 1 else None, shine_frame=1 if m['fury'] >= 1 else None)
        if m['fury'] >= 1:
            K.sprite(a, 'lbl_ready', x0 + 22 + 79 - 24, ry + 41)
        K.sprite(a, 'lbl_next', x0 + 108, ry + 34)
        K.gauge(a, x0 + 130, ry + 35, 41, m['exp'], 'exp', thin=True)
        if i < 2:
            for xx in range(px + 8, px + pw - 8):
                a[ry + 52, xx] = hexc(P.UIB[1], 255)
                a[ry + 53, xx] = hexc(P.UIB[3], 255)
    # command window
    cx, cy, cw, ch = 282, 4, 98, 110
    K.window(a, cx, cy, cw, ch)
    cmds = [('Items', 'icon_bag'), ('Tech', 'icon_scroll'), ('Magic', 'icon_magic'), ('Equip', 'icon_sword'),
            ('Status', 'icon_star'), ('Journal', 'icon_book'), ('Config', 'icon_gear'), ('Save', 'icon_quill')]
    sel = 3
    for i, (label, icon) in enumerate(cmds):
        yy = cy + 6 + i * 12
        if i == sel:
            sx_, sy_, sw_, sh_ = K.ui.frames['sel_bar']
            bar = K.ui.img[sy_:sy_ + sh_, sx_:sx_ + sw_].copy()
            m_ = bar[..., 3] > 0
            bar[m_, :3] = hexc(P.SCHEMES['blue']['highlight'])[:3]
            from render import nine_slice
            nine_slice(a, bar, cx + 5, yy, cw - 10, 12, [3, 0, 3, 0])
        dim = label == 'Magic'
        K.ui.draw(a, icon, cx + 9, yy, alpha=0.5 if dim else 1.0)
        K.text(a, cx + 24, yy + 1, label, color='dim' if dim else 'white')
    K.sprite(a, 'cursor_0', cx + 2, cy + 6 + sel * 12 + 5)
    # info window
    ix, iy, iw, ih = 282, 116, 98, 66
    K.window(a, ix, iy, iw, ih)
    K.sprite(a, 'icon_gold', ix + 8, iy + 7)
    K.text_right(a, ix + iw - 8, iy + 8, '12,480', color='gold')
    K.text(a, ix + 8, iy + 21, 'Time', color='gray')
    K.text_right(a, ix + iw - 8, iy + 21, '1:23:45')
    K.text(a, ix + 8, iy + 32, 'Letters', color='gray')
    K.text_right(a, ix + iw - 8, iy + 32, '1/3')
    K.text(a, ix + 8, iy + 43, 'Chapter', color='gray')
    K.text_right(a, ix + iw - 8, iy + 43, 'I')
    # help / location bar
    K.window(a, 4, 184, 376, 28)
    K.text(a, 12, 192, 'Change weapons and armor. Compare stats before you equip.')
    K.text_right(a, 372, 192, 'Willowmere', color='gold')
    return a


# ------------------------------------------------------------------------------------------- (c) battle
def battle_scene(moment='command'):
    a = backdrop(7, darken_band=True)
    arch = sprite_from('assets/sprites/bosses_battle.json', 'archivore')
    put(a, arch, 98, 146)
    lp0 = sprite_from('assets/sprites/bosses_battle.json', 'lost_page_0')
    lp1 = sprite_from('assets/sprites/bosses_battle.json', 'lost_page_1')
    put(a, lp0, 196, 62)
    put(a, lp1, 206, 112)
    pf = 'assets/sprites/party_field.json'
    hero = sprite_from(pf, 'hero_left_0')
    mira = sprite_from(pf, 'mira_left_0')
    bram = sprite_from(pf, 'bram_left_0')
    act_x = 290 if moment == 'command' else 304
    put(a, hero, act_x, 98)
    put(a, mira, 318, 120)
    put(a, bram, 334, 144)
    # shield + weakness row under the boss
    wy = 132
    wx = 30
    if moment == 'command':
        K.sprite(a, 'shield_badge', wx, wy)
        K.text(a, wx + 6 - K.f.ink_width('4') // 2, wy + 1, '4')
    else:
        K.sprite(a, 'shield_badge_broken', wx, wy)
    ex = wx + 15
    row = [('icon_sword', 'weak_frame'), ('icon_fire', 'weak_frame_hit' if moment == 'break' else 'weak_frame'),
           ('weak_unknown', 'weak_frame'), ('weak_unknown', 'weak_frame')]
    for icon, fr in row:
        K.sprite(a, fr, ex, wy - 1)
        K.sprite(a, icon, ex + 1, wy)
        ex += 15
    # telegraph / help window
    K.window(a, 4, 4, 218, 19, 'blue', 'thin')
    if moment == 'command':
        K.text(a, 10, 8, '{c:orange}The Archivore inhales a storm of ink...{/c}')
    else:
        K.text(a, 10, 8, 'Hero: {c:gold}Ember Edge{/c}')
    # timeline (top right)
    tx, ty = 226, 6
    K.sprite(a, 'tl_rail', tx, ty + 7)
    from render import nine_slice
    rx, ry_, rw, rh = K.ui.frames['tl_rail']
    nine_slice(a, K.ui.img[ry_:ry_ + rh, rx:rx + rw], tx, ty + 7, 154, rh, [2, 0, 2, 0])
    faces = {
        'hero': portrait_placeholder(0, 32)[3:17, 9:23],
        'mira': portrait_placeholder(1, 32)[3:17, 9:23],
        'bram': portrait_placeholder(2, 32)[4:18, 9:23],
        'arch': arch[0][20:34, 60:74] if arch[0].shape[0] > 40 else None,
        'page': lp0[0][5:19, 6:20],
    }
    order = [('hero', 'current'), ('page', 'enemy'), ('mira', 'party'), ('arch', 'enemy'), ('bram', 'party'),
             ('page', 'enemy'), ('hero', 'party'), ('arch', 'enemy')]
    if moment == 'break':
        order = [('mira', 'current'), ('page', 'enemy'), ('bram', 'party'), ('hero', 'party'),
                 ('page', 'enemy'), ('mira', 'party'), ('arch', 'enemy'), ('bram', 'party')]
    sx = tx + 2
    for i, (who, kind) in enumerate(order):
        if kind == 'current':
            K.sprite(a, 'tl_glow_0', sx - 2, ty - 2)
        K.sprite(a, f'tl_{kind}', sx, ty)
        face = faces[who]
        if face is not None:
            paste(a, face, sx + 2, ty + 2)
        sx += 19 if i == 0 else 18
    if moment == 'command':
        # landing preview for the selected action (ghost slot between two actors)
        px_ = tx + 2 + 19 + 18 * 4 + 9
        K.sprite(a, 'tl_preview', px_, ty + 10)
        fc = faces['hero'].copy()
        fc[..., 3] = (fc[..., 3].astype(int) * 150 // 255).astype(np.uint8)
        paste(a, fc, px_ + 2, ty + 12)
        K.sprite(a, 'arrow_up', px_ + 4, ty + 28 + 1)
    # command window
    cx, cy, cw, ch = 4, 152, 92, 60
    K.window(a, cx, cy, cw, ch)
    cmds = ['Attack', 'Tech', 'Item', 'Defend']
    sel = 1
    for i, c in enumerate(cmds):
        K.text(a, cx + 20, cy + 7 + i * 11, c)
    if moment == 'command':
        K.sprite(a, 'cursor_1', cx + 3 + 13, cy + 7 + sel * 11 + 5)
        K.sprite(a, 'arrow_down', cx + cw - 15, cy + ch - 9)
    # party status window
    sx0, sy0, sw0, sh0 = 98, 152, 282, 60
    K.window(a, sx0, sy0, sw0, sh0)
    active = 0 if moment == 'command' else 1
    for i, m in enumerate(PARTY):
        ry = sy0 + 5 + i * 17
        x0 = sx0 + 8
        if i == active:
            sx_, sy_, sw_, sh_ = K.ui.frames['sel_bar']
            bar = K.ui.img[sy_:sy_ + sh_, sx_:sx_ + sw_].copy()
            bar[..., 3] = (bar[..., 3].astype(int) * 3 // 5).astype(np.uint8)
            nine_slice(a, bar, sx0 + 4, ry, sw0 - 8, 17, [3, 0, 3, 0])
        hp, hpm = m['hp']
        name_col = 'white' if hp / hpm > 0.25 else 'red'
        K.text(a, x0, ry + 3, m['name'], color=name_col)
        K.text_right(a, x0 + 92, ry + 1, f'{hp}', color=name_col)
        K.text(a, x0 + 94, ry + 1, f'/{hpm}', color='gray')
        K.gauge(a, x0 + 44, ry + 11, 75, hp / hpm, 'hp', thin=True,
                lag=(hp + 40) / hpm if i == 2 else None)
        K.sprite(a, 'lbl_mp', x0 + 126, ry + 2)
        K.text_right(a, x0 + 156, ry + 1, f'{m["mp"][0]}', color='blue')
        K.gauge(a, x0 + 126, ry + 11, 31, m['mp'][0] / m['mp'][1], 'mp', thin=True)
        K.sprite(a, 'lbl_fury', x0 + 164, ry + 2)
        full = m['fury'] >= 1
        K.gauge(a, x0 + 164, ry + 11, 52, m['fury'], 'fury', thin=True,
                glow_frame=0 if full else None, shine_frame=2 if full else None)
        if full:
            K.sprite(a, 'lbl_ready', x0 + 190, ry + 2)
        ix = x0 + 224
        for s in m['status']:
            K.sprite(a, f'st8_{s}', ix, ry + 4)
            ix += 9
    if moment == 'command':
        K.sprite(a, 'reticle_0', 196, 50)
        K.sprite(a, 'turn_marker_0', act_x, 62)
    else:
        K.sprite(a, 'break_burst_1', 100, 80)
        K.word(a, 100, 80, 'BREAK')
        K.number(a, 100, 96, '1260', 'crit', big=True)
        K.word(a, 54, 120, 'WEAK')
        K.number(a, 206, 84, '84', 'white')
        K.word(a, 196, 36, 'MISS')
        K.number(a, 334, 104, '+120', 'heal')
        K.number(a, 318, 80, '+16', 'mp')
    return a


def equip():
    a = backdrop(0)
    a[..., :3] = (a[..., :3].astype(np.float32) * 0.35).astype(np.uint8)
    # header
    K.window(a, 4, 4, 160, 44)
    framed_portrait(a, portrait_placeholder(2, 32), 8, 8)
    K.text(a, 48, 9, 'Bram')
    K.sprite(a, 'lbl_lv', 76, 12)
    K.text(a, 86, 9, '6')
    K.sprite(a, 'icon_spear', 48, 22)
    K.text(a, 62, 23, 'Spear', color='gray')
    K.sprite(a, 'lbl_lv', 92, 26)
    K.text(a, 102, 23, '3', color='gray')
    K.gauge(a, 110, 27, 46, 0.55, 'exp', thin=True)
    # slots
    K.window(a, 4, 50, 160, 92)
    slots = [('Weapon', 'icon_spear', 'Ashwood Spear', 'common'),
             ('Off-hand', 'icon_axe', "Smith's Hatchet", 'magic'),
             ('Armor', 'icon_armor', 'Guard Mail', 'common'),
             ('Helm', 'icon_helm', 'Bellward Helm', 'rare'),
             ('Charm', 'icon_charm', 'Ember Locket', 'legendary'),
             ('Boots', 'icon_boots', 'Wayfarer Boots', 'set'),
             ('Mantle', 'icon_mantle', '(none)', 'dim')]
    for i, (slot, icon, name, rar) in enumerate(slots):
        y = 56 + i * 12
        K.sprite(a, icon, 10, y)
        K.text(a, 25, y + 1, name, color=rar)
    K.sprite(a, 'cursor_0', 8 + 0, 56 + 5)
    # stats compare
    K.window(a, 4, 144, 160, 68)
    stats = [('ATK', 42, 48), ('DEF', 30, 28), ('MAG', 12, 12), ('SPD', 18, 19)]
    for i, (st, cur, new) in enumerate(stats):
        y = 150 + i * 14
        K.sprite(a, f'lbl_{st.lower()}', 12, y + 3)
        K.text_right(a, 70, y, str(cur))
        K.sprite(a, 'arrow_right', 76, y)
        col = 'green' if new > cur else ('red' if new < cur else 'white')
        K.text_right(a, 112, y, str(new), color=col)
        K.sprite(a, 'delta_up' if new > cur else ('delta_down' if new < cur else 'delta_same'), 118, y + 2)
    # item list
    K.window(a, 168, 4, 212, 150)
    K.text(a, 178, 9, 'Spears', large=True, color='cream')
    K.sprite(a, 'arrow_left', 300, 11)
    K.sprite(a, 'page_on', 312, 13)
    K.sprite(a, 'page_off', 320, 13)
    K.sprite(a, 'page_off', 328, 13)
    K.sprite(a, 'arrow_right', 338, 11)
    for xx in range(174, 374):
        a[27, xx] = hexc(P.UIB[1])
        a[28, xx] = hexc(P.UIB[3])
    items = [('Gleaming Spear of Embers', 'rare', 1), ('Ashwood Spear', 'common', 1),
             ('Thornward Pike of the Bell', 'magic', 1), ("Archivist's Quillspear", 'legendary', 1),
             ("Valley Warden's Lance", 'set', 1), ('Rusted Pike', 'common', 3), ('Inkbitten Glaive', 'magic', 2),
             ("Lantern-Bearer's Spear", 'rare', 1), ('Training Spear', 'dim', 1)]
    sel = 0
    for i, (nm, rar, q) in enumerate(items):
        y = 33 + i * 12
        if i == sel:
            from render import nine_slice
            sx_, sy_, sw_, sh_ = K.ui.frames['sel_bar']
            bar = K.ui.img[sy_:sy_ + sh_, sx_:sx_ + sw_].copy()
            m_ = bar[..., 3] > 0
            bar[m_, :3] = hexc(P.SCHEMES['blue']['highlight'])[:3]
            nine_slice(a, bar, 172, y - 1, 204, 12, [3, 0, 3, 0])
        K.sprite(a, 'icon_spear', 180, y - 1)
        K.text(a, 195, y, nm, color=rar)
        K.text_right(a, 370, y, f'×{q}', color='gray')
    K.sprite(a, 'cursor_1', 168 + 4, 33 + sel * 12 + 4)
    K.sprite(a, 'arrow_down', 270, 145)
    # description
    K.window(a, 168, 156, 212, 56)
    K.text(a, 176, 161, '{c:rare}Gleaming Spear of Embers{/c}')
    K.text(a, 176, 172, '+6 ATK, +12% fire damage')
    K.text(a, 176, 183, 'Burns on critical hits.')
    K.text(a, 176, 196, '{c:gray}"It hums when the bell rings."{/c}')
    return a


def loot():
    a = backdrop(1)
    a[..., :3] = (a[..., :3].astype(np.float32) * 0.8).astype(np.uint8)
    put(a, sprite_from('assets/sprites/party_field.json', 'hero_up_0'), 192, 170)
    K.sprite(a, 'beam_rare_0', 192, 132)
    K.sprite(a, 'sparkle_rare_2', 186, 96)
    K.sprite(a, 'sparkle_rare_1', 200, 112)
    K.sprite(a, 'beam_legendary_1', 96, 150)
    K.sprite(a, 'beam_magic_2', 290, 150)
    K.sprite(a, 'beam_set_0', 330, 150)
    K.sprite(a, 'beam_common_0', 50, 150)
    wx, wy, ww, wh = 70, 20, 244, 40
    K.window(a, wx, wy, ww, wh, 'blue', 'std', 0.94)
    K.sprite(a, 'icon16_spear', wx + 8, wy + 6)
    K.text(a, wx + 28, wy + 6, 'Found {c:rare}Gleaming Spear of Embers{/c}!')
    K.text(a, wx + 28, wy + 19, '{c:gray}+6 ATK, +12% fire{/c}')
    K.sprite(a, 'btn_key_z', wx + ww - 22, wy + wh - 15)
    return a


def title():
    a = backdrop(0)
    a[..., :3] = (a[..., :3].astype(np.float32) * 0.8).astype(np.uint8)
    lw, lh = K.logo.size('logo')
    lx, ly = (W - lw) // 2, 26
    K.logo.draw(a, 'logo', lx, ly)
    sw, sh = K.logo.size('subtitle')
    K.logo.draw(a, 'subtitle', (W - sw) // 2, ly + lh + 3)
    K.logo.draw(a, 'sparkle_2', lx + 40, ly + 18)
    K.logo.draw(a, 'sparkle_3', lx + 196, ly + 12)
    mx, my, mw, mh = 142, 150, 100, 46
    K.window(a, mx, my, mw, mh, 'blue', 'std', 0.92)
    for i, s in enumerate(['New Game', 'Continue', 'Config']):
        K.text(a, mx + 24, my + 7 + i * 11, s)
    K.sprite(a, 'cursor_0', mx + 18, my + 7 + 0 * 11 + 5)
    K.text(a, 4, 205, '{c:gray}v0.1 NEXT{/c}')
    return a


def save_all(name, a):
    save(upscale(a, 3), OUT / f'mock_{name}_3x.png')
    save(upscale(a, 844 / 384 * 0.82), OUT / f'mock_{name}_phone.png')   # ~1.8x non-integer emulation


def main(names):
    global K
    K = Kit()
    screens = {
        'dialogue': lambda: dialogue()[0],
        'menu': menu,
        'battle_command': lambda: battle_scene('command'),
        'battle_break': lambda: battle_scene('break'),
        'title': title,
        'equip': equip,
        'loot': loot,
    }
    for n in (names or screens):
        a = screens[n]()
        save_all(n, a)
        print('saved', n)


if __name__ == '__main__':
    main(sys.argv[1:])
