"""Finish generated tracks after add_track.py: measure each one's loop points with music_scan.py (which only measures a
track that has NO sidecar), write the sidecar (source note + loopStart/loopEnd/loopKind), rebuild the manifest.

    python tools/audio/finish_tracks.py <id> [<id> ...]      (each <id> has assets/audio/music/<id>.mp3 and a sidecar holding "source")
The sidecar MUST carry the measured loopStart/loopEnd: build.py keeps the previous manifest's loop points for an unchanged src
path, so a replacement track under the same file name would otherwise inherit the old piece's loop.
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); NEXT = os.path.dirname(os.path.dirname(HERE))
MUSIC = os.path.join(NEXT, 'assets', 'audio', 'music')


def main(ids):
    notes = {}
    for i in ids:
        jp = os.path.join(MUSIC, f'{i}.json')
        notes[i] = json.load(open(jp, encoding='utf-8')) if os.path.exists(jp) else {}
        if os.path.exists(jp): os.remove(jp)                       # so the scan measures instead of trusting it
    subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), '--manifest', '--quiet'], cwd=NEXT, timeout=600, check=True)
    subprocess.run([sys.executable, os.path.join(HERE, 'music_scan.py')], cwd=NEXT, timeout=1200, check=True)
    lv = json.load(open(os.path.join(HERE, 'music_levels.json'), encoding='utf-8'))
    for i in ids:
        t = lv.get(f'assets/audio/music/{i}.mp3') or {}   # music_levels.json is keyed by src path
        side = {'source': notes[i].get('source', '')}
        for k in ('loopStart', 'loopEnd'):
            if k in t: side[k] = t[k]
        side['loopKind'] = t.get('loopKind')
        with open(os.path.join(MUSIC, f'{i}.json'), 'w', encoding='utf-8', newline='\n') as f: f.write(json.dumps(side) + '\n')
        print(i, side)
    subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), '--manifest', '--quiet'], cwd=NEXT, timeout=600, check=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
