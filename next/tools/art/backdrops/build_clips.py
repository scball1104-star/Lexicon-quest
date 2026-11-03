"""Build the in-game clips (docs/MEDIA_BUILD.md 5): every raw Runway clip in out/clips_raw/<asset id>.mp4 whose still
painting exists (assets/backdrops/<asset id>.png) becomes assets/clips/<asset id>.webm.

    python build_clips.py                 # every raw clip that exists
    python build_clips.py paint_card_bells --src some.mp4    # one id (--src: develop against another clip)
    python build_clips.py --max-kb 400 --fps 12

Per clip:
  1. Palette = exactly the colours of the shipped still (the master palette plus that painting's extras, as the still
     uses them). Every frame takes the still's path (16:9 crop, box downscale, unsharp, Bayer 4x4 ordered dither fixed
     to the pixel grid) against that colour set, so the clip never shows a colour the still does not have.
  2. Head: frame 1 IS the shipped still (byte for byte), then a Bayer dissolve over HEAD frames into the clip, so the
     game can show the still first and swap to the video with no pop.
  3. Loop: an eased ping-pong. The forward clip is played out and back on a cosine curve (full speed in the middle,
     slowing to a stop at both ends), so the turn is a pause, not a jump, and the loop ends where it starts (the still).
  4. Encode VP9 384 x 216, --fps, yuv420p tagged BT.709 (so browsers and ffmpeg convert alike), one keyframe; the crf is searched so the file lands under --max-kb.
  5. Check like the game: decode the webm and re-dither it to the still's colours with the same 6-bit lookup the
     runtime uses (src/ui/clips/player.js), then write the 3x phone MP4 and a contact sheet from THOSE frames.

Writes assets/clips/<id>.webm, assets/clips/clips.json (the ids that exist, read lazily by the runtime), and
out/clips/<id>_3x.mp4, out/clips/<id>_sheet.png, out/clips/contact_sheet.png, out/clips/summary.json.
Needs ffmpeg (imageio_ffmpeg's binary is found automatically). Every ffmpeg call is bounded (600 s)."""
import argparse, json, math, os, shutil, sys, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B
from quantize_clip import find_ffmpeg, run, prep

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'out', 'clips_raw')
PREVIEW = os.path.join(HERE, 'out', 'clips')
STILLS = os.path.join(B.NEXT, 'assets', 'backdrops')
SHIP = os.path.join(B.NEXT, 'assets', 'clips')
# The four places of MEDIA_BUILD 5, by the painting each one draws. Mirrors CLIP_IDS in src/ui/keyart.js.
CLIP_IDS = ['paint_card_bell_tower', 'paint_card_bells', 'paint_card_hollowmere', 'paint_card_binder_spine',
            'paint_battle_valley', 'paint_battle_hollow', 'paint_battle_east_road']
HEAD = 6            # frames of dissolve from the still into the clip
MAX_PAIR = 0.14     # as quantize_still.py
HOLD = 0.2          # temporal hysteresis: a pixel this close to its dither threshold keeps last frame's colour
SMOOTH = (0.25, 0.5, 0.25)   # temporal blur of the source frames (Runway's own compression noise)
BAYER = np.tile((np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16.0,
                (B.H // 4 + 1, B.W // 4 + 1))[:B.H, :B.W]


def still_colours(path):
    """(still as H x W x 3 uint8, its colours as N x 3 uint8 in first-seen raster order, like keyart.js indexPixels)."""
    arr = np.asarray(Image.open(path).convert('RGB'))
    flat = arr.reshape(-1, 3)
    packed = (flat[:, 0].astype(np.int64) << 16) | (flat[:, 1].astype(np.int64) << 8) | flat[:, 2]
    _, first = np.unique(packed, return_index=True)
    cols = flat[np.sort(first)]
    return arr, cols


def redither_lut(cols):
    """The runtime's re-dither lookup (player.js cellOf), vectorised: for every 6-bit RGB cell (centre value), the
    nearest two colours in OKLab; i2 = i1 when the pair is further apart than MAX_PAIR (never dithered)."""
    v = (np.arange(64, dtype=np.float32) * 4 + 2) / 255.0
    g = np.stack(np.meshgrid(v, v, v, indexing='ij'), -1).reshape(-1, 3)      # r-major, like (r<<12)|(g<<6)|b
    lab = B.to_oklab(g)
    plab = B.to_oklab(cols.astype(np.float32) / 255.0)
    i1, i2 = B.nearest2(lab, plab)
    far = np.sqrt(((plab[i2] - plab[i1]) ** 2).sum(-1)) > MAX_PAIR
    return i1, np.where(far, i1, i2), cols.astype(np.float32)


def hold_pick(a, b, t, prev):
    """Bayer pick between a and b by t, with the temporal hysteresis: near the threshold, keep prev when it is a or b."""
    e = t - BAYER
    pick = np.where((a != b) & (e > 0), b, a)
    if prev is None:
        return pick
    keep = (np.abs(e) < HOLD) & (a != b) & ((prev == a) | (prev == b))
    return np.where(keep, prev, pick)


def redither(frame, lut, prev=None):
    """player.js redither: the pixel's own projection along the cell's pair (sRGB) against the Bayer threshold."""
    i1, i2, c = lut
    f = frame.astype(np.int64)
    k = (f[..., 0] >> 2 << 12) | (f[..., 1] >> 2 << 6) | (f[..., 2] >> 2)
    a, b = i1[k], i2[k]
    d = c[b] - c[a]
    dd = (d * d).sum(-1)
    t = ((frame.astype(np.float32) - c[a]) * d).sum(-1) / np.maximum(dd, 1e-9)
    return hold_pick(a, b, t, prev)


def quantize_stable(arr, pal, prev):
    """build.quantize_ordered (OKLab pair, projection, max pair, Bayer) plus the temporal hysteresis."""
    lab = B.to_oklab(arr.reshape(-1, 3))
    plab = B.to_oklab(pal)
    i1, i2 = B.nearest2(lab, plab)
    d = plab[i2] - plab[i1]
    dd = (d * d).sum(-1)
    t = ((lab - plab[i1]) * d).sum(-1) / np.maximum(dd, 1e-9)
    far = np.sqrt(dd) > MAX_PAIR
    t = np.where(far, 0.0, np.clip(t, 0, 1))
    i2 = np.where(far, i1, i2)
    return hold_pick(i1.reshape(B.H, B.W), i2.reshape(B.H, B.W), t.reshape(B.H, B.W), prev)


def loop_order(n, ease=True):
    """Indices of the eased ping-pong over n forward frames: index(k) = (1 - cos(2 pi k / N)) / 2 * (n - 1), with N
    chosen so the middle runs at the clip's own speed (N = pi (n - 1)). Ends on the frame before 0, so the loop is seamless."""
    if not ease:
        return list(range(n)) + list(range(n - 2, 0, -1))
    N = int(round(math.pi * (n - 1)))
    return [int(round((1 - math.cos(2 * math.pi * k / N)) / 2 * (n - 1))) for k in range(N)]


def encode(ff, seq_dir, fps, crf, dst, n):
    run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(seq_dir, 'f_%04d.png'), '-an',
         '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
         '-color_trc', 'bt709', '-color_range', 'tv', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(crf), '-g', str(n), '-keyint_min', str(n),
         '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '1', '-lag-in-frames', '25', dst])
    return os.path.getsize(dst)


def build_one(ff, cid, src, a, tmp):
    still_png = os.path.join(STILLS, cid + '.png')
    still, cols = still_colours(still_png)
    pal = cols.astype(np.float32) / 255.0
    raw = os.path.join(tmp, 'raw'); seq = os.path.join(tmp, 'seq'); dec = os.path.join(tmp, 'dec')
    for d in (raw, seq, dec):
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', f'fps={a.fps}', os.path.join(raw, 'f_%04d.png')])
    names = sorted(os.listdir(raw))
    src_frames = [prep(os.path.join(raw, n), a.sharpen) for n in names]
    fwd, prev = [], None
    for i in range(len(src_frames)):
        k0, k2 = src_frames[max(0, i - 1)], src_frames[min(len(src_frames) - 1, i + 1)]
        arr = SMOOTH[0] * k0 + SMOOTH[1] * src_frames[i] + SMOOTH[2] * k2
        prev = quantize_stable(arr, pal, prev)
        fwd.append(cols[prev])
    first_diff = float((fwd[0] != still).any(-1).mean())       # how far Runway's frame 1 is from the shipped still
    # Head: frame 0 is the still; frames 1..HEAD-1 dissolve into the clip on the Bayer grid.
    for k in range(HEAD):
        take = BAYER < (k / HEAD)          # k = 0: none of the clip
        fwd[k] = np.where(take[..., None], fwd[k], still)
    order = loop_order(len(fwd), not a.linear)
    for i, k in enumerate(order):
        Image.fromarray(fwd[k]).save(os.path.join(seq, f'f_{i + 1:04d}.png'), compress_level=1)
    os.makedirs(SHIP, exist_ok=True)
    dst = os.path.join(SHIP, cid + '.webm')
    lo, hi, best = a.crf_min, a.crf_max, None
    while lo <= hi:                         # lowest crf (best quality) that fits
        mid = (lo + hi) // 2
        size = encode(ff, seq, a.fps, mid, dst, len(order))
        if size <= a.max_kb * 1024:
            best = (mid, size); hi = mid - 1
        else:
            lo = mid + 1
    if best is None:
        best = (a.crf_max, encode(ff, seq, a.fps, a.crf_max, dst, len(order)))
    elif best[0] != mid or os.path.getsize(dst) != best[1]:
        encode(ff, seq, a.fps, best[0], dst, len(order))
    # Decode as the game will, re-dither to the still's colours, and judge those frames.
    run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-i', dst, '-vf', 'scale=in_color_matrix=bt709:in_range=tv,format=rgb24', os.path.join(dec, 'f_%04d.png')])
    lut = redither_lut(cols)
    dnames = sorted(os.listdir(dec))
    shown, prev = [], None
    for i, n in enumerate(dnames):
        prev = redither(np.asarray(Image.open(os.path.join(dec, n)).convert('RGB')), lut, prev)
        out = cols[prev]
        shown.append(out)
        Image.fromarray(out).save(os.path.join(dec, n), compress_level=1)
    pop = float((shown[0] != still).any(-1).mean())
    flicker = float(np.mean([(shown[i] != shown[i - 1]).any(-1).mean() for i in range(1, len(shown))]))
    src_flicker = float(np.mean([(fwd[i] != fwd[i - 1]).any(-1).mean() for i in range(1, len(fwd))]))
    os.makedirs(PREVIEW, exist_ok=True)
    mp4 = os.path.join(PREVIEW, cid + '_3x.mp4')
    run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(a.fps), '-i', os.path.join(dec, 'f_%04d.png'), '-an',
         '-vf', f'scale={B.W * 3}:{B.H * 3}:flags=neighbor', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
    far = order.index(max(order))
    picks = [('still', still), ('open', shown[0]), ('key', shown[far // 2]), ('far', shown[far])]
    sheet = Image.new('RGB', (B.W * 2 * 2 + 8, B.H * 2 * 2 + 8), (20, 16, 30))
    for j, (_, im) in enumerate(picks):
        sheet.paste(Image.fromarray(im).resize((B.W * 2, B.H * 2), Image.NEAREST), ((j % 2) * (B.W * 2 + 8), (j // 2) * (B.H * 2 + 8)))
    sheet_path = os.path.join(PREVIEW, cid + '_sheet.png')
    sheet.save(sheet_path, optimize=True)
    return {'id': cid, 'src': src, 'bytes': os.path.getsize(dst), 'crf': best[0], 'fps': a.fps, 'frames': len(order),
            'seconds': round(len(order) / a.fps, 2), 'forwardFrames': len(fwd), 'colours': int(len(cols)),
            'runwayFrame1VsStill': round(first_diff, 4), 'popFrame1': round(pop, 5),
            'changedPerFrame': round(flicker, 4), 'changedPerFrameBeforeEncode': round(src_flicker, 4),
            'mp4': mp4, 'mp4Bytes': os.path.getsize(mp4), 'sheet': sheet_path, 'farFrame': far + 1,
            '_picks': [p[1] for p in picks[1:]]}


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument('ids', nargs='*')
    p.add_argument('--src', default=None, help='raw clip to use for the single id given (development)')
    p.add_argument('--fps', type=int, default=12)
    p.add_argument('--sharpen', type=float, default=0.55)
    p.add_argument('--max-kb', type=int, default=390)
    p.add_argument('--crf-min', type=int, default=28); p.add_argument('--crf-max', type=int, default=60)
    p.add_argument('--linear', action='store_true', help='plain ping-pong (no easing at the turns)')
    p.add_argument('--ffmpeg', default=None)
    a = p.parse_args(argv)
    ff = find_ffmpeg(a.ffmpeg)
    ids = a.ids or CLIP_IDS
    jobs = []
    for cid in ids:
        src = a.src if (a.src and len(ids) == 1) else os.path.join(RAW, cid + '.mp4')
        if not os.path.isfile(src):
            print(f'skip {cid}: no raw clip at {src}'); continue
        if not os.path.isfile(os.path.join(STILLS, cid + '.png')):
            print(f'skip {cid}: no still painting'); continue
        jobs.append((cid, src))
    results = []
    tmp = tempfile.mkdtemp(prefix='lq_clips_')
    try:
        for cid, src in jobs:
            r = build_one(ff, cid, src, a, tmp)
            print(f"{cid}: {r['bytes']} bytes (crf {r['crf']}), {r['frames']} frames / {r['seconds']} s, "
                  f"Runway frame 1 vs still {r['runwayFrame1VsStill']:.1%}, pop {r['popFrame1']:.2%}, changed/frame {r['changedPerFrame']:.1%}")
            results.append(r)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if not results:
        print('no clips built'); return 0
    # Overview: one row per clip (open, key, far) at 1x.
    sheet = Image.new('RGB', (B.W * 3 + 16, (B.H + 8) * len(results)), (20, 16, 30))
    for i, r in enumerate(results):
        for j, im in enumerate(r['_picks']):
            sheet.paste(Image.fromarray(im), (j * (B.W + 8), i * (B.H + 8)))
    sheet.save(os.path.join(PREVIEW, 'contact_sheet.png'), optimize=True)
    summ_path = os.path.join(PREVIEW, 'summary.json')
    old = {}
    if os.path.isfile(summ_path):
        try:
            old = {r['id']: r for r in json.load(open(summ_path, encoding='utf-8'))}
        except (OSError, ValueError, KeyError, TypeError):
            old = {}
    for r in results:
        r.pop('_picks'); old[r['id']] = r
    with open(summ_path, 'w', encoding='utf-8') as f:
        json.dump(list(old.values()), f, indent=1)
    shipped = {cid: {'bytes': os.path.getsize(os.path.join(SHIP, cid + '.webm'))}
               for cid in CLIP_IDS if os.path.isfile(os.path.join(SHIP, cid + '.webm'))}
    with open(os.path.join(SHIP, 'clips.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'$comment': 'Generated by tools/art/backdrops/build_clips.py (docs/MEDIA_BUILD.md 5). The clips that exist; the runtime reads this before it asks for one.',
                   'fps': a.fps, 'clips': shipped}, f, indent=1)
        f.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
