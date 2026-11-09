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
  puzzles    1.5 to 3 minutes of thinking per beam puzzle the run solved (the bot solves them instantly); a quench
             puzzle by its actions: 0.5 to 1 min for one, 1 to 2 min for each further (E3-fixes-world); the F3 Home
             order puzzle is 4 actions (a turn and three Shoves, QUENCH_PUZZLES); a tide puzzle by its decisions, not
             its clicks: 0.5 to 1 min for the first wheel turn, 0.3 to 0.6 min for each further one (E4-fixes-A,
             PLAYTEST_REVIEW_6 section 1: a wheel only cycles one way, so half the turns are cycling past a mark)
  battles    each battle's game time at 1x battle speed (the bot ran 2x engine and 2x battle speed: wall s x 4),
             plus 1.5 s per party command (3 a round)

    python next/qa/integrate/story_time.py desktop-ep2-new
    python next/qa/integrate/story_time.py desktop-ep3        Episode 3 (E3-integrate): quench puzzles count as puzzles, the
                                                              end is the Episode 3 credits, and it also times the first
                                                              fight after the morning scene (target under 5 minutes) and
                                                              lists the biggest scenes (pages) and fights (minutes)
    python next/qa/integrate/story_time.py desktop-ep4        Episode 4 (E4-integrate): the same, with tide puzzles (the bot's
                                                              "tide <puzzle>: N turns" notes, by actions as quench), the end
                                                              at the Episode 4 credits and the first fight e4r_first
    python next/qa/integrate/story_time.py desktop-ep5        Episode 5 (E5-integrate): sun and shade puzzles by decisions, not
                                                              clicks (the bot's "shade <puzzle>: N decisions" notes: one per hour
                                                              chosen and one per Shove sequence; 0.5 to 1 min each), the end at
                                                              the Episode 5 credits and the first fight e5s_first after ep5_morning
"""
import json
import pathlib
import re
import sys

OUT = pathlib.Path(__file__).resolve().parents[1] / 'out' / 'autoplay'
READ_CPS, TYPE_CPS, PRESS_S = 15.0, 60.0, 0.6
# seconds of thinking per further action (low, high): a quench paddle turn or Shove, and a tide wheel turn
QUENCH_MORE, TIDE_MORE = (60, 120), (18, 36)
# E5-integrate (EPISODE5_PLAN 12): a sun and shade decision (an hour chosen by name, or one Shove sequence) is real thinking each
# time (no cycling past a mark), so every further one costs as much as the first: 0.5 to 1 minute
SHADE_MORE = (30, 60)
EQUIP_PROMPT = re.compile(r'Equip the .*\?$')
# note keys -> one puzzle and its player actions (paddle turns plus Shoves)
QUENCH_PUZZLES = {
    'quench F3 Home': (('quench crust 22,27 on foundry_f3', 'quench crust 23,28 on foundry_f3'), 4),
}


def last_run(lines):
    idx = max((i for i, l in enumerate(lines) if l.startswith('=== run')), default=-1)
    return lines[idx + 1:]


def page_s(p):
    return max(len(p) / READ_CPS, len(p) / TYPE_CPS) + PRESS_S


def main(prefix):
    report = json.loads((OUT / f'{prefix}-report.json').read_text(encoding='utf-8'))
    dialog = last_run((OUT / f'{prefix}-dialog.log').read_text(encoding='utf-8').splitlines())
    pages = []
    for line in dialog:
        m = re.match(r'\[[^\]]*\] [^:]*: (.*)$', line)
        if m and not EQUIP_PROMPT.match(m.group(1)):      # an equip prompt is a menu choice, not story (PLAYTEST_REVIEW_6 1c)
            pages.append(re.sub(r'\{[^}]*\}', '', m.group(1)))
    chars = sum(len(p) for p in pages)
    dialogue_s = sum(max(len(p) / READ_CPS, len(p) / TYPE_CPS) + PRESS_S for p in pages)
    timing = [t for t in report.get('timing') or [] if t['step'] != 'boot']        # boot is before the save loads
    end = next((t for t in timing if t['step'] in ('ep2_credits_done', 'ep3_credits_done', 'ep4_credits_done', 'ep5_credits_done', 'epilogue')), timing[-1] if timing else None)
    field_s = (end['game_s'] - timing[0]['game_s']) if len(timing) > 1 else 0
    # the bot's own pages pass in about 4 frames each (instant text): take them out of its field time
    field_s = max(0.0, field_s - len(pages) * 4 / 60)
    # E3-fixes-world (PLAYTEST_REVIEW_5 section 1a): a puzzle costs by the actions it took. A beam note carries no count
    # and stays 1.5 to 3 min; a quench note's "N turns" is N paddle turns (0 = one Shove), so actions = max(1, N):
    # 0.5 to 1 min for one action, then 1 to 2 min more for each further action (2 actions = the old 1.5 to 3).
    kinds = {}
    for n in report.get('notes', []):
        if n.startswith('beam ') or n.startswith('quench ') or n.startswith('tide ') or n.startswith('shade '):
            m = re.search(r': (\d+) (?:turns?|decisions?)', n)
            kinds[n.split(':')[0]] = max(1, int(m.group(1))) if (m and not n.startswith('beam ')) else None
    tide = {k for k in kinds if k.startswith('tide ')}
    shade = {k for k in kinds if k.startswith('shade ')}
    # polish-world: puzzles the bot solves in two notes whose shoves its turn count leaves out are one puzzle of their
    # real action count (F3 Home: turn sl_home, then three Shoves)
    for name, (parts, actions) in QUENCH_PUZZLES.items():
        if any(p in kinds for p in parts):
            for p in parts:
                kinds.pop(p, None)
            kinds[name] = actions
    puzzles = len(kinds)
    per = {k: (TIDE_MORE if k in tide else SHADE_MORE if k in shade else QUENCH_MORE) for k in kinds}
    p_lo = sum(90 if a is None else 30 + per[k][0] * (a - 1) for k, a in kinds.items())
    p_hi = sum(180 if a is None else 60 + per[k][1] * (a - 1) for k, a in kinds.items())
    battles = report.get('battles') or []
    battle_s = sum(b['wall_s'] * 4 + (b.get('rounds') or 0) * 3 * 1.5 for b in battles)
    lo = dialogue_s + field_s * 1.5 + p_lo + battle_s
    hi = dialogue_s + field_s * 2.0 + p_hi + battle_s * 1.2
    print(f'run {prefix}: status {report.get("status")}, {len(battles)} battles, {puzzles} beam puzzles, {len(pages)} pages ({chars} chars)')
    print(f'  bot clock: field {field_s / 60:.1f} min of game time, battles {sum(b["wall_s"] for b in battles) / 60:.1f} min wall at 2x/2x')
    print(f'  dialogue at normal text speed, read at {READ_CPS:.0f} cps: {dialogue_s / 60:.1f} min')
    print(f'  field x1.5..2.0: {field_s * 1.5 / 60:.1f}..{field_s * 2 / 60:.1f} min; puzzles {p_lo / 60:.1f}..{p_hi / 60:.1f} min (by actions); battles at 1x with commands {battle_s / 60:.1f}..{battle_s * 1.2 / 60:.1f} min')
    print(f'  first-play estimate: {lo / 60:.0f} to {hi / 60:.0f} minutes')
    if prefix.split('-')[1:2] == ['ep3']:
        episode3(report, dialog, battles)
    elif prefix.split('-')[1:2] == ['ep4']:
        episode3(report, dialog, battles, morning='ep4_morning', first_enc='e4r_first')
    elif prefix.split('-')[1:2] == ['ep5']:
        episode3(report, dialog, battles, morning='ep5_morning', first_enc='e5s_first')
    return 0


def episode3(report, dialog, battles, morning='ep3_morning', first_enc='sr_first'):
    """The first fight after ep3_morning (EPISODE3_PLAN 12: under 5 minutes) and the biggest scenes and fights (cut candidates)."""
    marks = {}
    for i, line in enumerate(dialog):
        m = re.match(r'## mark (\S+) ([\d.]+)$', line)
        if m and m.group(1) not in marks:
            marks[m.group(1)] = (i, float(m.group(2)))
    if morning in marks and 'first_fight_done' in marks:
        (i0, t0), (i1, t1) = marks[morning], marks['first_fight_done']
        span = [re.sub(r'\{[^}]*\}', '', re.match(r'\[[^\]]*\] [^:]*: (.*)$', l).group(1)) for l in dialog[i0:i1] if re.match(r'\[[^\]]*\] [^:]*: ', l)]
        talk = sum(page_s(p) for p in span)
        field = max(0.0, (t1 - t0) - len(span) * 4 / 60)
        first = [b for b in battles if b.get('enc') == first_enc]
        fight = sum(b['wall_s'] * 4 + (b.get('rounds') or 0) * 4.5 for b in first)
        print(f'  first fight after the morning scene: {(talk + field * 1.5 + fight) / 60:.1f} to {(talk + field * 2 + fight * 1.2) / 60:.1f} minutes '
              f'(the fight itself {fight / 60:.1f}; target under 5)')
    else:
        print(f'  first fight after the morning scene: not measured (no {morning} / first_fight_done marks in the log)')
    # scenes: the pages between two consecutive marks, by where they were said (the longest blocks are the cut candidates)
    blocks, cur, n = [], None, 0
    for line in dialog:
        m = re.match(r'\[([^\]]*)\] ([^:]*): (.*)$', line)
        if not m:
            continue
        key = m.group(1)
        if cur and cur[0] == key:
            cur[1] += page_s(m.group(3)); cur[2] += 1
        else:
            cur = [key, page_s(m.group(3)), 1, m.group(3)[:60]]
            blocks.append(cur)
    blocks.sort(key=lambda b: -b[1])
    print('  longest dialogue runs (map, minutes, pages, first line):')
    for b in blocks[:5]:
        print(f'    {b[0]:<16} {b[1] / 60:4.1f} min  {b[2]:3d} pages  "{b[3]}"')
    print('  longest fights at 1x with commands (encounter, minutes, rounds):')
    for b in sorted(battles, key=lambda b: -(b['wall_s'] * 4 + (b.get('rounds') or 0) * 4.5))[:5]:
        print(f'    {str(b.get("enc")):<16} {(b["wall_s"] * 4 + (b.get("rounds") or 0) * 4.5) / 60:4.1f} min  {b.get("rounds")} rounds')


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'desktop-ep2-new'))
