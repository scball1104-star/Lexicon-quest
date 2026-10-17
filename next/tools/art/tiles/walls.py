"""Generic 3/4-view wall system: a top autotile (A2 layout) + a face autotile (A4 face layout, 32 x 32).

Maps mark top cells and face cells separately (legend ids '<sys>_top' and '<sys>_face'). Faces are usually
1 to 3 cells tall, directly below the south edge of a top region. Neither collides through; both are solid.
"""
from pxlib import Canvas
from autotile import QOFF
from terrain import Terrain, Ctx


class FaceStyle:
    """Subclass and implement pixel(x, y, left, top, right, bottom) for a 16x16 face cell (phase 0)."""
    def pixel(self, x, y, left, top, right, bottom):
        raise NotImplementedError

    def tile(self, left, top, right, bottom):
        cv = Canvas(16, 16)
        for y in range(16):
            for x in range(16):
                c = self.pixel(x, y, left, top, right, bottom)
                if c is not None:
                    cv.put(x, y, c)
        return cv

    def block(self):
        """32x32 A4 face block (see autotile.face_quarter_src)."""
        blk = Canvas(32, 32)
        # (qx, qy) -> (quarter, left, top, right, bottom) configuration it is used for
        cfg = {}
        for qx in range(4):
            for qy in range(4):
                if qy in (0, 2):
                    q = 'TL' if qx in (0, 2) else 'TR'
                    topc = (qy == 2)
                    botc = True
                else:
                    q = 'BL' if qx in (0, 2) else 'BR'
                    botc = (qy == 1)
                    topc = True
                if q in ('TL', 'BL'):
                    leftc = (qx == 2)
                    rightc = True
                else:
                    rightc = (qx == 1)
                    leftc = True
                cfg[(qx, qy)] = (q, leftc, topc, rightc, botc)
        cache = {}
        for (qx, qy), (q, l, t, r, b) in cfg.items():
            key = (l, t, r, b)
            if key not in cache:
                cache[key] = self.tile(l, t, r, b)
            ox, oy = QOFF[q]
            blk.paste(cache[key].crop(ox, oy, 8, 8), qx * 8, qy * 8)
        return blk


class WallSystem:
    id = ''
    top = None      # Terrain-like with .block()
    face = None     # FaceStyle
