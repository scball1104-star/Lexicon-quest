"""Preview: all six window schemes, field variant over a bright backdrop, thin frame, speech tails."""
from __future__ import annotations

import numpy as np

import art_window
import uipal
from fontlib import Font
from lib import ASSETS_UI, blank, hexc, paste, save_preview, from_img, REPO
from render import Windows
from PIL import Image


def backdrop(w, h, cell=0):
    im = Image.open(REPO / 'assets' / 'art' / 'environments.webp').convert('RGB')
    cw, ch = im.width // 2, im.height // 4
    c = im.crop(((cell % 2) * cw, (cell // 2) * ch, (cell % 2) * cw + cw, (cell // 2) * ch + ch))
    c = c.resize((w, h), Image.BOX)
    return from_img(c)


def main():
    art_window.build()
    W = Windows()
    f = Font(ASSETS_UI / 'font.json', uipal.TEXT)
    a = backdrop(384, 216, 0)
    names = list(uipal.SCHEMES.keys())
    for i, n in enumerate(names):
        x = 6 + (i % 3) * 126
        y = 6 + (i // 3) * 50
        W.draw(a, x, y, 120, 44, n)
        f.draw(a, x + 8, y + 6, n.capitalize())
        f.draw(a, x + 8, y + 17, '{c:gold}Potion{/c}  x12')
        f.draw(a, x + 8, y + 28, '{c:gray}Disabled{/c}')
    # field dialogue with tail over bright art
    W.draw(a, 8, 150, 180, 40, 'blue', 'field', alpha=uipal and 0.88)
    W.draw_tail(a, 8, 150, 180, 40, 60, 'down', 'blue', field=True, alpha=0.88)
    f.draw(a, 16, 157, 'Field window, 88% fill, tail down.')
    W.draw(a, 200, 128, 176, 34, 'blue')
    W.draw_tail(a, 200, 128, 176, 34, 330, 'up', 'blue')
    f.draw(a, 208, 135, 'Tail up, toward a speaker above.')
    W.draw(a, 200, 172, 60, 18, 'blue', 'thin')
    f.draw(a, 206, 175, 'Thin')
    W.draw(a, 266, 172, 110, 30, 'violet', 'thin')
    f.draw(a, 272, 175, 'Thin, violet')
    save_preview(a, 'window_schemes_3x', 3, bg=None)


if __name__ == '__main__':
    main()
