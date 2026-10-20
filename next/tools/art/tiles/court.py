"""Court of Mirrors (Episode 2) -> assets/tiles/court.png (E2-tiles, EPISODE2_PLAN 9.1).

court_kit.py    floor terrains (glass_floor, gallery_floor, throne_floor) and the wall systems
                court / court_gallery / court_throne (+ *_out), W8 per-floor kit style
court_props.py  the beam mechanism (mirrors, sources, receptors, glass bridges, slots, inlays), doors,
                stairs, fonts, the throne, tall and great mirrors, portraits, benches, glass panes
"""
from kit import Sheet


def build():
    sh = Sheet(512, 2048)
    import court_kit
    court_kit.build_into(sh)
    try:
        import court_props
    except ModuleNotFoundError:
        court_props = None
    if court_props:
        court_props.build_into(sh)
    sh.newline()
    H = sh.y
    return sh.cv.crop(0, 0, 512, H), sh.meta
