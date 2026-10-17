"""Build assets/ui/font.png/json and font_large.png/json (font_num lives in build_numfont.py)."""
from __future__ import annotations

import glyphs_large
import glyphs_main
from fontlib import build_font, parse
from lib import ASSETS_UI, save, write_json


def build_main():
    defs = parse(glyphs_main.DATA)
    img, js = build_font(defs, image_name='font.png', line_height=11, cap_top=1, baseline=8,
                         space_advance=3, kerning=glyphs_main.KERNING,
                         extra={'name': 'Lexicon Main', 'capHeight': 7, 'xHeight': 5, 'descent': 2,
                                'shadow': [1, 1], 'monoDigits': 6})
    save(img, ASSETS_UI / 'font.png')
    write_json(js, ASSETS_UI / 'font.json')
    return js


def build_large():
    defs = parse(glyphs_large.DATA)
    img, js = build_font(defs, image_name='font_large.png', line_height=16, cap_top=2, baseline=13,
                         space_advance=4, kerning=glyphs_large.KERNING, bold=True,
                         extra={'name': 'Lexicon Title', 'capHeight': 11, 'xHeight': 7, 'descent': 3,
                                'shadow': [1, 1]})
    save(img, ASSETS_UI / 'font_large.png')
    write_json(js, ASSETS_UI / 'font_large.json')
    return js


def main():
    a = build_main()
    b = build_large()
    print('font.json glyphs', len(a['glyphs']), '| font_large.json glyphs', len(b['glyphs']))


if __name__ == '__main__':
    main()
