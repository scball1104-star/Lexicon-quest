"""Quantize a short video clip into game-density frames and encode it (docs/MEDIA_BUILD.md 5, the video test).

    python quantize_clip.py in.mp4 out_dir [--fps 12] [--extras 4] [--max-pair 0.14] [--sharpen 0.55] [--ffmpeg PATH]

Every frame takes the quantize_still.py path (16:9 centre crop, the build's box downscale, unsharp, the palette plus up
to four extra colours, Bayer ordered dither). The extra colours are picked ONCE, on the middle frame, and every frame is
quantized against that same palette, and the Bayer threshold is fixed to the pixel grid, so the noise does not crawl
between frames. Writes:

    out_dir/frames/f_0001.png ...      the quantized 384 x 216 frames (indexed PNG)
    out_dir/clip_vp9.webm              VP9, 384 x 216 at --fps, yuv420p (what the game would ship, lazy)
    out_dir/clip_vp9_444.webm          VP9 profile 1, yuv444p (no chroma smear; wider files, narrower browser support)
    out_dir/clip_3x.mp4                H.264 at 3x nearest (1152 x 648), for watching on a phone or in mail
    out_dir/still_open_3x.png, still_key_3x.png, still_close_3x.png   the brief's three stills (3x nearest)
    out_dir/summary.json               frames, colours, bytes

Read-only on the input. Needs ffmpeg (imageio_ffmpeg's binary is found automatically)."""
import argparse, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B


def find_ffmpeg(explicit=None):
    if explicit:
        return explicit
    w = shutil.which('ffmpeg')
    if w:
        return w
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        sys.exit('ffmpeg not found: pass --ffmpeg PATH or pip install imageio-ffmpeg')


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        sys.exit(f'ffmpeg failed ({r.returncode}):\n{r.stderr[-2000:]}')
    return r


def crop169(im):
    W, H = B.W, B.H
    tw = im.width if im.width / im.height <= W / H else int(round(im.height * W / H))
    th = int(round(tw * H / W)) if tw == im.width else im.height
    ox, oy = (im.width - tw) // 2, (im.height - th) // 2
    return im.crop((ox, oy, ox + tw, oy + th))


def prep(path, sharpen):
    arr = B.downscale(crop169(Image.open(path).convert('RGB')))
    if sharpen > 0:
        arr = B.unsharp(arr, sharpen, 1.0)
    return arr


def save_indexed(out, dst):
    cols = np.unique(out.reshape(-1, 3), axis=0)
    lut = {tuple(c): i for i, c in enumerate(cols)}
    idxim = np.array([lut[tuple(px)] for px in out.reshape(-1, 3)], np.uint8).reshape(B.H, B.W)
    pim = Image.fromarray(idxim, 'P')
    pim.putpalette(cols.astype(np.uint8).flatten().tolist())
    pim.save(dst, optimize=True)
    return len(cols)


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument('src'); p.add_argument('out')
    p.add_argument('--fps', type=int, default=12)
    p.add_argument('--extras', type=int, default=4); p.add_argument('--max-pair', type=float, default=0.14)
    p.add_argument('--sharpen', type=float, default=0.55)
    p.add_argument('--crf', type=int, default=24, help='VP9 quality for clip_vp9.webm (lower = bigger, cleaner)')
    p.add_argument('--ffmpeg', default=None)
    a = p.parse_args(argv)
    ff = find_ffmpeg(a.ffmpeg)
    raw = os.path.join(a.out, 'raw'); fr = os.path.join(a.out, 'frames')
    for d in (raw, fr):
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-i', a.src, '-vf', f'fps={a.fps}', os.path.join(raw, 'f_%04d.png')])
    names = sorted(n for n in os.listdir(raw) if n.endswith('.png'))
    if not names:
        sys.exit('no frames extracted')
    pal = B.load_palette()
    mid = prep(os.path.join(raw, names[len(names) // 2]), a.sharpen)
    pal2, extras = B.pick_extras(mid, pal, min(B.EXTRA_MAX, a.extras))
    used = set(); counts = []
    for n in names:
        arr = prep(os.path.join(raw, n), a.sharpen)
        idx = B.quantize_ordered(arr, pal2, a.max_pair)
        used.update(np.unique(idx).tolist())
        out = (pal2[idx] * 255 + 0.5).astype(np.uint8)
        counts.append(save_indexed(out, os.path.join(fr, n)))
    seq = os.path.join(fr, 'f_%04d.png')
    enc = {}
    for name, extra in (
        ('clip_vp9.webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(a.crf), '-pix_fmt', 'yuv420p', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1']),
        ('clip_vp9_444.webm', ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(a.crf), '-pix_fmt', 'yuv444p', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1']),
        ('clip_3x.mp4', ['-vf', 'scale=1152:648:flags=neighbor', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']),
    ):
        dst = os.path.join(a.out, name)
        run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(a.fps), '-i', seq, '-an', *extra, dst])
        enc[name] = os.path.getsize(dst)
    stills = {}
    for label, i in (('open', 0), ('key', len(names) // 2), ('close', len(names) - 1)):
        im = Image.open(os.path.join(fr, names[i])).convert('RGB')
        dst = os.path.join(a.out, f'still_{label}_3x.png')
        im.resize((B.W * 3, B.H * 3), Image.NEAREST).save(dst, optimize=True)
        stills[label] = {'frame': i + 1, 'path': dst}
    summary = {'src': a.src, 'fps': a.fps, 'frames': len(names), 'seconds': round(len(names) / a.fps, 3),
               'paletteColours': int(len(pal2)), 'extras': list(extras or []),
               'coloursUsed': len(used), 'coloursPerFrame': [int(min(counts)), int(max(counts))],
               'bytes': enc, 'frameBytes': sum(os.path.getsize(os.path.join(fr, n)) for n in names), 'stills': stills}
    with open(os.path.join(a.out, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=1)
    shutil.rmtree(raw, ignore_errors=True)
    print(json.dumps(summary, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
