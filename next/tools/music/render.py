"""Render the composed music tracks (Episode 1: archive, mystery, sorrow, triumph; Episode 2: hollow,
hollowmere, fading_road, court, boss_king; Expansion 1: the_downs high_moor wethers_barrow orrery larchhill millrace boss_reeve boss_millstone).

    python tools/music/render.py                 # every track + review images
    python tools/music/render.py archive sorrow  # a subset
    python tools/music/render.py --wav           # also write WAV copies to tools/music/out/ for listening
    python tools/music/render.py --no-review     # skip the images and analysis

Outputs: assets/audio/music/<id>.mp3 (160 kbps CBR, gapless LAME tag) and <id>.json
({loopStart, loopEnd, bpm, key, duration} in seconds). Everything is deterministic: the same code
produces the same bytes.
"""
import importlib
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'songs'))

NEXT = os.path.dirname(os.path.dirname(HERE))
MUSIC_DIR = os.path.join(NEXT, 'assets', 'audio', 'music')
OUT_DIR = os.path.join(HERE, 'out')
ALL = ['archive', 'mystery', 'sorrow', 'triumph',
       'hollow', 'hollowmere', 'fading_road', 'court', 'boss_king',   # Episode 2
       'emberpeak', 'first_bell', 'ash_road', 'foundry', 'boss_warden',   # Episode 3: the last five
       'the_downs', 'high_moor', 'wethers_barrow', 'orrery', 'larchhill', 'millrace',   # Expansion 1
       'boss_reeve', 'boss_millstone']


def main(argv):
    ids = [a for a in argv if not a.startswith('--')] or ALL
    want_wav = '--wav' in argv
    want_review = '--no-review' not in argv
    os.makedirs(OUT_DIR, exist_ok=True)
    for sid in ids:
        t0 = time.time()
        mod = importlib.import_module(sid)
        song = mod.build()
        print('== %s: %s (%s, %s BPM, %d bars)' % (sid, song.title, song.key, song.base_bpm, song.bars))
        song.render()
        mp3, js, info = song.write(MUSIC_DIR)
        print('wrote %s (%d bytes, %d frames, padding %d) and %s' % (mp3, info['bytes'], info['frames'], info['padding'], js))
        print('meta', song.meta())
        if want_wav:
            song.write_wav(os.path.join(OUT_DIR, sid + '.wav'))
        if want_review:
            import review
            review.report(song, OUT_DIR)
        print('%s done in %.1fs' % (sid, time.time() - t0))


if __name__ == '__main__':
    main(sys.argv[1:])
