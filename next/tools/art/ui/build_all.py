"""Regenerate every W1-ui-art asset into next/assets/ui/ (deterministic).

    python next/tools/art/ui/build_all.py

Outputs: font.png/json, font_large.png/json, font_num.png/json, font_num_big.json, window.png/json,
logo.png/json, ui.png/json (atlas of every other piece), touch/*.png (DOM touch skins).
"""
from __future__ import annotations

import sys
import time

import numpy as np

import art_battle
import art_cursor
import art_emotes
import art_icons
import art_icons16
import art_logo
import art_numfont
import art_rarity
import art_touch
import art_window
import build_fonts
import uipal
from lib import ASSETS_UI, blank, paste, save, write_json

MODULES = [
    ('cursor', art_cursor),
    ('icons', art_icons),
    ('icons16', art_icons16),
    ('battle', art_battle),
    ('emotes', art_emotes),
    ('touch', art_touch),
    ('rarity', art_rarity),
]


def pack(items, width=512, pad=1):
    """Deterministic shelf packer. items: list of (id, array). Returns (sheet, rects)."""
    order = sorted(range(len(items)), key=lambda i: (-items[i][1].shape[0], items[i][0]))
    x = y = pad
    shelf_h = 0
    rects = {}
    for i in order:
        sid, a = items[i]
        h, w = a.shape[:2]
        if x + w + pad > width:
            x = pad
            y += shelf_h + pad
            shelf_h = 0
        rects[sid] = (x, y, w, h)
        x += w + pad
        shelf_h = max(shelf_h, h)
    H = y + shelf_h + pad
    H = (H + 7) // 8 * 8
    sheet = blank(width, H)
    for sid, a in items:
        x, y, w, h = rects[sid]
        paste(sheet, a, x, y, 'copy')
    return sheet, rects


def build_ui_atlas():
    items, origins, anims, slices, groups = [], {}, {}, {}, {}
    seen = set()
    for gname, mod in MODULES:
        ids = []
        for sid, arr, org in mod.sprites():
            if sid in seen:
                raise SystemExit(f'duplicate sprite id {sid}')
            seen.add(sid)
            items.append((sid, arr))
            ids.append(sid)
            if org is not None:
                origins[sid] = [int(org[0]), int(org[1])]
        groups[gname] = ids
        anims.update(mod.anims())
        slices.update(mod.slices())
    # E2-sprites: the Episode 2 icons go in a strip under the Episode 1 pack (art_icons.E2_IDS), so every
    # existing rect stays where it was
    late = [it for it in items if it[0] in art_icons.E2_IDS]
    sheet, rects = pack([it for it in items if it[0] not in art_icons.E2_IDS])
    if late:
        strip, srects = pack(late)
        top = sheet.shape[0]
        full = blank(sheet.shape[1], top + strip.shape[0])
        full[:top] = sheet
        full[top:] = strip
        sheet = full
        for sid, (x, y, w, h) in srects.items():
            rects[sid] = (x, y + top, w, h)
    save(sheet, ASSETS_UI / 'ui.png')
    touch_files = art_touch.export_touch_pngs()
    js = {
        'image': 'ui.png',
        'frames': {k: list(v) for k, v in sorted(rects.items())},
        'origins': origins,
        'anims': anims,
        'slices': slices,
        'groups': groups,
        'sheets': {
            'window': 'window.json', 'logo': 'logo.json',
            'fonts': {'main': 'font.json', 'large': 'font_large.json', 'num': 'font_num.json',
                      'numBig': 'font_num_big.json'},
            'touch': touch_files,
        },
        'textColors': uipal.TEXT,
        'rarity': uipal.RARITY,
        'icons': {
            'size': 12,
            'large16': {k: f'icon16_{k}' for k in art_icons16.ART},
            'weakness': {'sword': 'icon_sword', 'spear': 'icon_spear', 'staff': 'icon_staff', 'axe': 'icon_axe',
                         'bow': 'icon_bow', 'fire': 'icon_fire', 'ice': 'icon_ice', 'thunder': 'icon_thunder',
                         'light': 'icon_light', 'unknown': 'weak_unknown'},
            'status': {k: f'icon_{k}' for k in art_icons.STATUS_RAMPS},
            'statusMini': {k: f'st8_{k}' for k in art_icons.STATUS_RAMPS},
            'markers': {'reflect': 'icon_reflect'},
        },
        'buttonGlyphs': {
            'keyboard': {'confirm': 'btn_key_z', 'cancel': 'btn_key_x', 'menu': 'btn_key_c',
                         'start': 'btn_key_enter', 'back': 'btn_key_esc', 'run': 'btn_key_shift',
                         'pageL': 'btn_key_q', 'pageR': 'btn_key_e'},
            'gamepad': {'confirm': 'btn_pad_a', 'cancel': 'btn_pad_b', 'menu': 'btn_pad_y', 'alt': 'btn_pad_x',
                        'pageL': 'btn_pad_lb', 'pageR': 'btn_pad_rb', 'run': 'btn_pad_b'},
            'touch': {'confirm': 'btn_tap_a', 'cancel': 'btn_tap_b'},
        },
    }
    write_json(js, ASSETS_UI / 'ui.json')
    return sheet, js


def main():
    t0 = time.time()
    build_fonts.main()
    art_numfont.build()
    art_window.build()
    art_logo.build()
    sheet, js = build_ui_atlas()
    # palette audit (fonts are white by contract; rarity colors fixed by DESIGN; alpha blends ignored)
    audit = sheet.copy()
    for sid in js['groups']['rarity']:
        x, y, w, h = js['frames'][sid]
        audit[y:y + h, x:x + w] = 0
    bad = uipal.off_palette(audit, ignore=list(uipal.RARITY.values()))
    print(f'ui.png {sheet.shape[1]}x{sheet.shape[0]}, {len(js["frames"])} frames, {len(js["anims"])} anims')
    print(f'palette.json loaded: {uipal.FROM_FILE}; opaque colors outside palette in ui.png: {len(bad)}')
    if bad:
        print('  ', ' '.join(bad[:40]))
    print(f'done in {time.time() - t0:.1f}s')


if __name__ == '__main__':
    main()
