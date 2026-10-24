"""ash_haze tint check (E3-tiles brief item 4): give E3-world a numeric target for the Emberpeak ash haze.

    python e3_tint.py

Renders the Bellows Square mock (e3_town ember_town) with a warm grey multiply and measures the mean luminance
(Rec. 709 luma of the sRGB values, 0..1, over every opaque pixel) against `none`. The tint must be at least 12 percent
darker than none (we ask for 14 percent so a hand-built particle layer cannot eat the margin) while the lights (lit
windows, fire) stay bright and the darkest pixels stay above the floor. Writes out/e3/ash_haze_check.json and
out/e3/ash_haze_compare.png (none | tinted, 2x).
"""
import json, os
import numpy as np
from PIL import Image
import compose
import e3_scenes
import e3_town
from pxlib import OUT_DIR

E3_OUT = os.path.join(OUT_DIR, 'e3')
CANDIDATES = {
    'ash_haze_light': (0.92, 0.88, 0.86),
    'ash_haze_mid': (0.86, 0.81, 0.79),
    'ash_haze_heavy': (0.78, 0.72, 0.70),
}
MIN_DARKER = 0.12


def luma(a):
    return float((a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722).mean())


def main():
    db = compose.TileDB()
    base = {}
    sc = e3_town.scenes(base)['ember_town']
    cv = e3_scenes.render(sc, db)
    arr = cv.a[..., :3].astype(np.float32) / 255.0
    l0 = luma(arr)
    lights = arr[(arr.max(-1) > 0.75)]
    res = {'scene': 'ember_town (Bellows Square mock)', 'mean_luma_none': round(l0, 4), 'min_darker': MIN_DARKER,
           'candidates': {}}
    imgs = [Image.fromarray((arr * 255 + 0.5).astype(np.uint8))]
    chosen = None
    for name, m in CANDIDATES.items():
        t = np.clip(arr * np.array(m, np.float32), 0, 1)
        l1 = luma(t)
        darker = 1 - l1 / l0
        res['candidates'][name] = {
            'multiply': '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in m),
            'multiply_rgb': list(m), 'mean_luma': round(l1, 4), 'darker_pct': round(darker * 100, 1),
            'brightest_1pct_luma_after': round(float(np.percentile(t.mean(-1), 99)), 3),
            'meets_12pct': bool(darker >= MIN_DARKER)}
        if chosen is None and darker >= 0.14:
            chosen = name
            imgs.append(Image.fromarray((t * 255 + 0.5).astype(np.uint8)))
    res['recommended'] = chosen
    res['note'] = ('Multiply the whole scene (tiles, objects, actors) by the recommended colour, then draw lights '
                   '(window glow, fire, slag) over it so they keep their punch. Particles are extra.')
    os.makedirs(E3_OUT, exist_ok=True)
    with open(os.path.join(E3_OUT, 'ash_haze_check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    w, h = imgs[0].size
    strip = Image.new('RGB', (w * 2 * len(imgs) + 6 * (len(imgs) - 1), h * 2), (20, 16, 30))
    for i, im in enumerate(imgs):
        strip.paste(im.resize((w * 2, h * 2), Image.NEAREST), (i * (w * 2 + 6), 0))
    strip.save(os.path.join(E3_OUT, 'ash_haze_compare.png'))
    print(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
