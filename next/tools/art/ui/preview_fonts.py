"""Legibility sheets for the fonts: pangrams, longest realistic lines, every glyph, on window blue and on
bright/dark backdrops. Saves 3x previews (and a 1.8x phone-scale emulation) into out/."""
from __future__ import annotations

import sys

from fontlib import Font
from lib import ASSETS_UI, blank, hexc, paste, save_preview, upscale, save, OUT
import uipal


def grad_fill(a, x, y, w, h, top, bottom):
    t0, t1 = hexc(top), hexc(bottom)
    for i in range(h):
        t = i / max(1, h - 1)
        c = tuple(int(round(t0[k] + (t1[k] - t0[k]) * t)) for k in range(4))
        a[y + i, x:x + w] = c


def main():
    f = Font(ASSETS_UI / 'font.json', uipal.TEXT)
    fl = Font(ASSETS_UI / 'font_large.json', uipal.TEXT)
    W, H = 384, 216
    a = blank(W, H)
    s = uipal.SCHEMES['blue']
    grad_fill(a, 0, 0, W, H, s['top'], s['bottom'])
    y = 4
    lines = [
        'The quick brown fox jumps over the lazy dog.',
        'SPHINX OF BLACK QUARTZ, JUDGE MY VOW! 0123456789',
        'Pack my box with five dozen liquor jugs? (yes) [no]',
        "Elder Mael: “Did you sleep through the bell again?”",
        "Mira’s staff hums… {c:gold}Lantern of Recall{/c} obtained! ♥ ★ ♪",
        'Tess: "I wrote three letters and never sent a single one."',
        "{c:cyan}Bram{/c} can't remember his father's name. 12× Potion  HP 1234/1234",
        '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ ←↑→↓ • · ✓ ▲▼●○',
        'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'Willowmere  Rootbound Archive  Archivore  Whisperwood  Aethelgard',
        '{c:gray}Disabled option{/c}  {c:red}Poisoned{/c}  {c:green}+120 HP{/c}  {c:blue}Magic{/c}  {c:orange}Legendary{/c}',
    ]
    for ln in lines:
        f.draw(a, 6, y, ln)
        y += 11
    y += 2
    fl.draw(a, 6, y, 'Willowmere Valley')
    fl.draw(a, 160, y, 'The Rootbound Archive')
    y += 17
    fl.draw(a, 6, y, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    y += 17
    fl.draw(a, 6, y, 'abcdefghijklmnopqrstuvwxyz 0123456789')
    y += 17
    fl.draw(a, 6, y, 'Items  Equip  Status  Config  Save!  "Quest?"')
    save_preview(a, 'font_sheet_3x', 3, bg=None)
    save(upscale(a, 1.8), OUT / 'font_sheet_phone1p8.png')
    print('ok', f.measure('The quick brown fox jumps over the lazy dog.'))


if __name__ == '__main__':
    main()
