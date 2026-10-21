"""Timed-story estimate for an autoplay run (E2-integrate, EPISODE2_PLAN 10d Verify: "a timed read of the story at
normal text speed, expect 60 to 90 minutes").

The bot plays with instant text, Auto battle at 2x and the engine at 2x, and solves every puzzle from the maps' own
solutions, so its clock is a floor, not a first play. This script rebuilds a first-play estimate from the run's own
records (next/qa/out/autoplay/<prefix>-report.json and <prefix>-dialog.log, the last run in the log):

  dialogue   every page the run showed, typed at normal text speed (1 character a frame, 60 a second) and read at
             a relaxed 15 characters a second, plus 0.6 s to press on (a page is read while it types, so the
             slower of the two counts)
  field      the run's field play time from the start (new game or loaded save) to the credits (walking, cutscene
             motion, menus; game seconds; battles are not counted there) with the bot's dialogue taken out, times 1.5
             to 2.0 for a first-time player who looks around and walks the long way
  puzzles    1.5 to 3 minutes of thinking per beam puzzle the run solved (the bot solves them instantly)
  battles    each battle's game time at 1x battle speed (the bot ran 2x engine and 2x battle speed: wall s x 4),
             plus 1.5 s per party command (3 a round)

    python next/qa/integrate/story_time.py desktop-ep2-new
"""
import json
import pathlib
import re
import sys

OUT = pathlib.Path(__file__).resolve().parents[1] / 'out' / 'autoplay'
READ_CPS, TYPE_CPS, PRESS_S = 15.0, 60.0, 0.6


def last_run(lines):
    idx = max((i for i, l in enumerate(lines) if l.startswith('=== run')), default=-1)
    return lines[idx + 1:]


def main(prefix):
    report = json.loads((OUT / f'{prefix}-report.json').read_text(encoding='utf-8'))
    dialog = last_run((OUT / f'{prefix}-dialog.log').read_text(encoding='utf-8').splitlines())
    pages = []
    for line in dialog:
        m = re.match(r'\[[^\]]*\] [^:]*: (.*)$', line)
        if m:
            pages.append(re.sub(r'\{[^}]*\}', '', m.group(1)))
    chars = sum(len(p) for p in pages)
    dialogue_s = sum(max(len(p) / READ_CPS, len(p) / TYPE_CPS) + PRESS_S for p in pages)
    timing = [t for t in report.get('timing') or [] if t['step'] != 'boot']        # boot is before the save loads
    end = next((t for t in timing if t['step'] in ('ep2_credits_done', 'epilogue')), timing[-1] if timing else None)
    field_s = (end['game_s'] - timing[0]['game_s']) if len(timing) > 1 else 0
    # the bot's own pages pass in about 4 frames each (instant text): take them out of its field time
    field_s = max(0.0, field_s - len(pages) * 4 / 60)
    puzzles = sum(1 for n in report.get('notes', []) if n.startswith('beam '))
    battles = report.get('battles') or []
    battle_s = sum(b['wall_s'] * 4 + (b.get('rounds') or 0) * 3 * 1.5 for b in battles)
    lo = dialogue_s + field_s * 1.5 + puzzles * 90 + battle_s
    hi = dialogue_s + field_s * 2.0 + puzzles * 180 + battle_s * 1.2
    print(f'run {prefix}: status {report.get("status")}, {len(battles)} battles, {puzzles} beam puzzles, {len(pages)} pages ({chars} chars)')
    print(f'  bot clock: field {field_s / 60:.1f} min of game time, battles {sum(b["wall_s"] for b in battles) / 60:.1f} min wall at 2x/2x')
    print(f'  dialogue at normal text speed, read at {READ_CPS:.0f} cps: {dialogue_s / 60:.1f} min')
    print(f'  field x1.5..2.0: {field_s * 1.5 / 60:.1f}..{field_s * 2 / 60:.1f} min; puzzles {puzzles * 1.5:.0f}..{puzzles * 3:.0f} min; battles at 1x with commands {battle_s / 60:.1f}..{battle_s * 1.2 / 60:.1f} min')
    print(f'  first-play estimate: {lo / 60:.0f} to {hi / 60:.0f} minutes')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'desktop-ep2-new'))
