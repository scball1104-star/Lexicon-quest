"""Pick up Suno downloads from the Desktop into the game: every "Lexicon Quest_ <Title>.mp3" whose theme is not yet a Suno track
is encoded by add_track.py and finished by finish_tracks.py (loop points measured, manifest rebuilt). Prints what it added.
    python tools/audio/pickup_desktop.py [--desktop DIR]
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); NEXT = os.path.dirname(os.path.dirname(HERE))
KEEP = r"G:/My Drive/Personal Knowledge Assistant/reports/lexicon_quest_media_upgrade/music/source"
TITLES = {'Title Theme': 'title', 'Battle Theme': 'battle', 'Willowmere': 'willowmere', 'Whisperwood Hollow': 'hollow', 'Hollowmere': 'hollowmere',
          'The Fading Road': 'fading_road', 'The Court of Glass': 'court', 'The Nameless King': 'boss_king', 'The Archivore': 'boss_archivore',
          'The Valley': 'valley', 'The Rootbound Archive': 'archive', 'Mystery': 'mystery', 'Sorrow': 'sorrow', 'Triumph': 'triumph',
          'The First Bell': 'first_bell', 'Emberpeak': 'emberpeak', 'The Ash Road': 'ash_road', 'The Foundry': 'foundry',
          'The Warden': 'boss_warden', 'The Downs': 'the_downs'}


def main(argv):
    desk = argv[argv.index('--desktop') + 1] if '--desktop' in argv else r"C:/Users/scbal/Desktop"
    added = []
    for title, i in TITLES.items():
        src = os.path.join(desk, f'Lexicon Quest_ {title}.mp3')
        if not os.path.isfile(src): continue
        jp = os.path.join(NEXT, 'assets', 'audio', 'music', f'{i}.json')
        if os.path.exists(jp) and 'Suno' in open(jp, encoding='utf-8').read(): continue
        r = subprocess.run([sys.executable, os.path.join(HERE, 'add_track.py'), src, i, '--kbps', '112', '--keep', KEEP], capture_output=True, text=True, timeout=600)
        print(r.stdout.strip() or r.stderr[-300:])
        if r.returncode: continue
        with open(jp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps({'source': f"Suno Pro v6, 2026-10-28, 'Lexicon Quest: {title}', the take Scott saved; replaces the earlier piece"}) + '\n')
        added.append(i)
    print('ADDED', added)
    if added:
        subprocess.run([sys.executable, os.path.join(HERE, 'finish_tracks.py'), *added], cwd=NEXT, timeout=1800, check=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
