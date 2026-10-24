"""The Ashen Foundry (Episode 3) -> assets/tiles/forge.png (E3-tiles, EPISODE3_PLAN 9.1).

forge_kit.py    floor terrains (foundry_floor, ash_floor, crucible_floor), wall systems foundry / galleries / crucible
                (+ _out) with per-room face styles
forge_flow.py   slag, slag crust and the troughs (the quench channels)
forge_props.py  the objects: spouts, sluice, basins, waterwheel, hot grates, doors, anvils, the Bell Gate, fonts,
                furnaces, fans, pipes (appended below everything else)
"""
from kit import Sheet


def build():
    sh = Sheet(512, 2048)
    import forge_kit
    terr = sh.meta.setdefault('terrains', {})
    for fl in forge_kit.FLOORS:
        x, y = sh.alloc(32, 48)
        sh.cv.paste(fl.block(), x, y)
        m = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A2', 'kind': 'fill', 'collision': 'none',
             'variants': [], 'variantWeights': list(fl.weights)}
        for v in range(fl.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(fl.variant_tile(v), vx, vy)
            m['variants'].append([vx, vy])
        terr[fl.id] = m
    sh.newline()
    walls = sh.meta.setdefault('walls', {})
    for sys_id, band, face, deep, out in forge_kit.WALLS:
        tx, ty = sh.alloc(32, 48)
        sh.cv.paste(band.block(), tx, ty)
        fx, fy = sh.alloc(32, 32)
        sh.cv.paste(face.block(), fx, fy)
        dx, dy = sh.alloc(32, 48)
        sh.cv.paste(deep.block(), dx, dy)
        ox, oy = sh.alloc(32, 32)
        sh.cv.paste(out.block(), ox, oy)
        tv = []
        for v in range(band.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(band.variant_tile(v), vx, vy)
            tv.append([vx, vy])
        dv = []
        for v in range(deep.nvariants):
            vx, vy = sh.alloc(16, 16)
            sh.cv.paste(deep.variant_tile(v), vx, vy)
            dv.append([vx, vy])
        walls[sys_id] = {'top': [tx, ty], 'face': [fx, fy], 'collision': 'solid',
                         'topVariants': tv, 'topVariantWeights': list(band.weights),
                         'note': 'E3 foundry wall band (%s_top) and inner face (%s_face)' % (sys_id, sys_id)}
        walls[sys_id + '_out'] = {'top': [dx, dy], 'face': [ox, oy], 'collision': 'solid',
                                  'topVariants': dv, 'topVariantWeights': list(deep.weights),
                                  'note': 'the deep beyond the walls (%s_out_top, no edges) and the outer face under '
                                          'a band\'s south lip (%s_out_face)' % (sys_id, sys_id)}
        sh.newline()
    # per-room face styles (the W12 mechanism): blocks appended, the plain face stays style 0
    for sys_id, styles in forge_kit.FACE_STYLES.items():
        meta = walls[sys_id]
        out = []
        for st in styles:
            if st is None:
                out.append([list(meta['face'])])
                continue
            blocks = []
            for face in st:
                x, y = sh.alloc(32, 32)
                sh.cv.paste(face.block(), x, y)
                blocks.append([x, y])
            out.append(blocks)
        meta['faceStyles'] = out
        meta['faceStyleByMap'] = forge_kit.FACE_PLAN.get(sys_id, {})
        meta['note'] += '; faceStyles per room (tools/art/tiles/forge_kit.py)'
    sh.newline()
    import forge_flow
    forge_flow.build_into(sh)
    try:
        import forge_props
    except ModuleNotFoundError:
        forge_props = None
    if forge_props:
        forge_props.build_into(sh)
    sh.newline()
    return sh.cv.crop(0, 0, 512, sh.y), sh.meta
