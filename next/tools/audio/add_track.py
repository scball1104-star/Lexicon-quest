"""Add a generated music track (a Suno MP3 on the Desktop) to the game as assets/audio/music/<id>.mp3.

    python tools/audio/add_track.py "<source.mp3>" <id> [--kbps 112] [--keep DIR]

Decodes with the imageio ffmpeg (any input), re-encodes with lameenc through tools/music/mp3tag.write_mp3 (a proper
Info frame, so decoders know the length) at --kbps (112 keeps a 3-minute track near 2.5 MB; the manifest's volume
brings it to -16 LUFS later), copies the untouched source to --keep (never into the repo), and prints the result.
Then: python tools/audio/build.py --manifest; python tools/audio/music_scan.py; python tools/audio/build.py --manifest.
"""
import argparse, os, shutil, subprocess, sys, tempfile, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(NEXT, 'tools', 'music'))
import mp3tag  # noqa: E402
import imageio_ffmpeg  # noqa: E402


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('id')
    ap.add_argument('--kbps', type=int, default=112)
    ap.add_argument('--keep', default=None, help='folder that keeps the untouched source (outside the repo)')
    a = ap.parse_args(argv)
    if not os.path.isfile(a.src): print('missing', a.src); return 2
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, 'in.wav')
        r = subprocess.run([ff, '-y', '-v', 'error', '-i', a.src, '-ac', '2', '-ar', '44100', '-f', 'wav', wav], capture_output=True, text=True, timeout=300)
        if r.returncode: print(r.stderr[-400:]); return 1
        with wave.open(wav, 'rb') as w:
            sr, n = w.getframerate(), w.getnframes()
            pcm = np.frombuffer(w.readframes(n), dtype='<i2').reshape(-1, 2).astype(np.float32) / 32768.0
    dst = os.path.join(NEXT, 'assets', 'audio', 'music', f'{a.id}.mp3')
    mp3tag.write_mp3(dst, pcm, sr, kbps=a.kbps, quality=2)
    if a.keep:
        os.makedirs(a.keep, exist_ok=True)
        shutil.copy(a.src, os.path.join(a.keep, f'{a.id}_source.mp3'))
    print(f'{dst}: {len(pcm) / sr:.1f} s, {a.kbps} kbps, {os.path.getsize(dst)} bytes (source {os.path.getsize(a.src)} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
