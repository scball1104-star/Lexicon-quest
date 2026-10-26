"""X1-integrate story timer (docs/EXPANSION1_PLAN.md 13 and 15, docs/briefs/X1-integrate.md item 5).

Compares the dialogue log of the completionist run with the regular route's log and the pre-expansion baseline log:

  * the MAIN PATH: the pages of the regular route with the expansion on versus the baseline log (same story, so the first-play minutes
    must agree within one minute);
  * the EXPANSION: every page of the completionist log that is not a main-path page, in boxes and in minutes (typed at normal speed and read at
    15 characters a second, as story_time.py does), per slice (the map the page was shown on), against plan 13's table.

    python qa/integrate/story_time_x1.py <baseline-prefix> <regular-prefix> <complete-prefix>
    python qa/integrate/story_time_x1.py desktop desktop-x1 desktop-complete

The baseline defaults to the last run in qa/out/autoplay/<prefix>-dialog.log. Boxes per scene are bounded by qa/content/x1_story.test.mjs (12 each,
190 in all); this script reports the boxes the bot actually saw.
"""
import collections
import pathlib
import re
import sys

OUT = pathlib.Path(__file__).resolve().parents[1] / 'out' / 'autoplay'
READ_CPS, TYPE_CPS, PRESS_S = 15.0, 60.0, 0.6
SLICES = {
    'West: Downs, Thornfold, Barrow': ('x1_downs', 'x1_loomhouse', 'x1_barrow'),
    'High Moor': ('x1_highmoor',),
    'South: Millrace, Mill, Culvert': ('x1_millrace', 'x1_mill', 'x1_culvert'),
    'Larchhill': ('x1_larchhill',),
    'North: Terrace, Orrery, Cellar': ('x1_terrace', 'x1_orrery', 'x1_cellar'),
}
PLAN = {'West: Downs, Thornfold, Barrow': 28, 'High Moor': 10, 'South: Millrace, Mill, Culvert': 22, 'Larchhill': 9, 'North: Terrace, Orrery, Cellar': 17}


def last_run(lines):
    idx = max((i for i, l in enumerate(lines) if l.startswith('=== run')), default=-1)
    return lines[idx + 1:]


def pages(prefix):
    lines = last_run((OUT / f'{prefix}-dialog.log').read_text(encoding='utf-8').splitlines())
    out = []
    for line in lines:
        m = re.match(r'\[([^\]]*)\] ([^:]*): (.*)$', line)
        if m:
            out.append((m.group(1), m.group(2), re.sub(r'\{[^}]*\}', '', m.group(3))))
    return out


def minutes(ps):
    return sum(max(len(t) / READ_CPS, len(t) / TYPE_CPS) + PRESS_S for _, _, t in ps) / 60


def main(base, regular, complete):
    pb, pr, pc = pages(base), pages(regular), pages(complete)
    print(f'baseline {base}: {len(pb)} pages, {minutes(pb):.1f} min of reading')
    print(f'regular  {regular}: {len(pr)} pages, {minutes(pr):.1f} min  (difference {minutes(pr) - minutes(pb):+.2f} min; limit 1.0)')
    seen = collections.Counter((s, t) for _, s, t in pr)
    extra = []
    for m, s, t in pc:
        if seen[(s, t)] > 0:
            seen[(s, t)] -= 1
        else:
            extra.append((m, s, t))
    print(f'complete {complete}: {len(pc)} pages; {len(extra)} are not on the regular route (the expansion\'s boxes; limit 190)')
    by_map = collections.Counter(m for m, _, _ in extra)
    total = 0.0
    print(f'  {"slice":<34} {"boxes":>5} {"read min":>9} {"plan 13 typical (all play)":>28}')
    for name, maps in SLICES.items():
        ps = [p for p in extra if p[0] in maps]
        total += minutes(ps)
        print(f'  {name:<34} {len(ps):>5} {minutes(ps):>9.1f} {PLAN[name]:>28}')
    rest = [p for p in extra if not any(p[0] in maps for maps in SLICES.values())]
    print(f'  {"hub and quest boxes elsewhere":<34} {len(rest):>5} {minutes(rest):>9.1f}   (by map: {dict(collections.Counter(m for m, _, _ in rest))})')
    print(f'  reading only, all slices: {total + minutes(rest):.1f} min; plan 13 totals reading 20 of about 97 typical minutes')
    longest = collections.Counter()
    run = 0
    prev = None
    # a scene's boxes arrive back to back on one map: the longest unbroken run of expansion pages is a ceiling on the longest scene
    runs = []
    for m, s, t in pc:
        is_extra = (m, s, t) in extra
        if is_extra and prev == m:
            run += 1
        elif is_extra:
            run = 1
        else:
            run = 0
        runs.append(run)
        prev = m if is_extra else None
    print(f'  longest unbroken run of expansion pages: {max(runs or [0])} (a ceiling; two scenes can run back to back)')
    return 0


if __name__ == '__main__':
    a = sys.argv[1:]
    sys.exit(main(*(a if len(a) == 3 else ['desktop', 'desktop-x1', 'desktop-complete'])))
