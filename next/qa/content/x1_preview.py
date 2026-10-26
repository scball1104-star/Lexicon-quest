"""Render X1 dialogue boxes the way the game will show them (reuses preview_dialogue.py: real font, window skin, portraits).

  python qa/content/x1_preview.py rollcall_stones mill_done orrery_align
Output: qa/content/out/dialogue_<scene>.png (3x, nearest neighbour), like the Episode 1 tool.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import preview_dialogue as pd  # noqa: E402
from PIL import Image  # noqa: E402


def main():
    ids = sys.argv[1:] or ['rollcall_stones', 'mill_done', 'orrery_align']
    boxes = json.loads(subprocess.run(['node', os.path.join('qa', 'content', 'x1_boxes.mjs'), *ids], cwd=pd.NEXT,
                                      capture_output=True, text=True, timeout=60, check=True).stdout)
    font = pd.load_font()
    skin = (json.load(open(os.path.join(pd.NEXT, 'assets', 'ui', 'window.json'), encoding='utf-8')),
            Image.open(os.path.join(pd.NEXT, 'assets', 'ui', 'window.png')).convert('RGBA'))
    os.makedirs(pd.OUT, exist_ok=True)
    by_scene = {}
    for b in boxes:
        by_scene.setdefault(b['scene'], []).append(b)
    bad = 0
    for scene, items in by_scene.items():
        frames = []
        for b in items:
            img, overflow, _ = pd.render_box(font, skin, b, scene)
            bad += overflow
            frames.append(img.crop((0, pd.H - 80, pd.W, pd.H)))
        cols = 2
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new('RGBA', (pd.W * cols, 80 * rows), (0, 0, 0, 255))
        for i, f in enumerate(frames):
            sheet.alpha_composite(f, ((i % cols) * pd.W, (i // cols) * 80))
        sheet = sheet.resize((sheet.size[0] * 2, sheet.size[1] * 2), Image.NEAREST)
        path = os.path.join(pd.OUT, f'dialogue_{scene}.png')
        sheet.convert('RGB').save(path)
        print(path, len(frames), 'boxes')
    print('boxes over 3 lines:', bad)


if __name__ == '__main__':
    main()
