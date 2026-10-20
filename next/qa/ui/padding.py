"""Text padding audit (CRITIQUE_2 D6): every window keeps at least 8 px between its frame and the text inside it.

Drives the `ui_*` (and, with --story, the `story_*`) shots from qa/shots.json exactly like qa/shots.py, then,
with LQ_DEBUG.uiAudit('on'), records one frame: every window rect drawWindow() painted and every r.text() call,
measured to its ink (the glyph pixels, drawn on a scratch canvas with the same alignment, width and typewriter
count). Each text is matched to the smallest window containing its ink centre and the four gaps (frame edge to
cap box: descenders are exempt, the bottom is the last baseline) are checked against the rule:

    std / field windows: 8 px left and right, 6 px top and bottom     thin windows (tabs, name plates, tags): 4 px

Vertical is 6 because a one-line header or help window is 20 to 24 px tall: with a 7 px cap height the best
a centred line can get is 6 to 7 px above and below. Text clipped away by pushClip (scrolling lists) is not
counted, and a window drawn AFTER a text (a popup over a list) does not own that text.

Text outside every window (titles over the backdrop, the version line) is skipped. Shadows are not ink.

  python next/qa/ui/padding.py                       ui_* shots, desktop + phone
  python next/qa/ui/padding.py --only ui_shop,ui_journal --device desktop
  python next/qa/ui/padding.py --story               also the story_* dialogs (slower)
  python next/qa/ui/padding.py --list                print every measured text, not only the violations

Report: next/qa/ui/out/padding.json. Exit code 1 on any violation, console error or failed step.
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog, drive, select_shots, new_page, ShotError  # noqa: E402

OUT = HERE / 'out'
SPEC = HERE.parent / 'shots.json'
RULE = {'std': (8, 6), 'field': (8, 6), 'thin': (4, 4)}   # (horizontal, vertical) px

# Hooks r.text() so every call of the next frame is measured to its ink; returns the measured list.
HOOK_JS = r"""
(() => {
  const e = LQ_DEBUG.engine, r = e.renderer;
  if (r.__padHook) return true;
  const sc = document.createElement('canvas'); sc.width = 1400; sc.height = 320;
  const g = sc.getContext('2d', { willReadFrequently: true });
  const OX = 500, OY = 100;
  const orig = r.text.bind(r);
  r.__padLog = [];
  // Track pushClip / popClip so text scrolled out of a clipped list is not measured as if it were visible.
  const clips = [];
  const pc = r.pushClip.bind(r), pp = r.popClip.bind(r);
  r.pushClip = (cx, cy, cw, ch) => { clips.push({ x: cx, y: cy, w: cw, h: ch }); return pc(cx, cy, cw, ch); };
  r.popClip = () => { clips.pop(); return pp(); };
  r.text = (str, x, y, opts = {}) => {
    const out = orig(str, x, y, opts);
    try {
      if (r.__padOn && str != null && String(str).length) {
        const font = r.fonts.get(opts.font || 'main');
        g.clearRect(0, 0, sc.width, sc.height);
        font.draw(g, str, OX, OY, { ...opts, shadow: false, outline: null, alpha: 1 });
        const d = g.getImageData(0, 0, sc.width, sc.height).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let yy = 0; yy < sc.height; yy++) for (let xx = 0; xx < sc.width; xx++) {
          if (d[(yy * sc.width + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
        }
        if (x1 >= 0) {
          const lines = String(str).split('\n').length;
          const lh = opts.lineHeight || font.lineHeight;
          const baseline = Math.round(y) + (lines - 1) * lh + font.baseline;
          const ua = LQ_DEBUG.uiAudit('windows');
          let clip = null;
          for (const c of clips) {
            clip = clip ? { x: Math.max(clip.x, c.x), y: Math.max(clip.y, c.y), x2: Math.min(clip.x2, c.x + c.w), y2: Math.min(clip.y2, c.y + c.h) } : { x: c.x, y: c.y, x2: c.x + c.w, y2: c.y + c.h };
          }
          r.__padLog.push({ text: String(str).slice(0, 40), font: opts.font || 'main', frame: r.frame,
            nwin: !ua ? 1e9 : (ua.frame === r.frame ? ua.windows.length : 0), clip,
            ink: { x: Math.round(x) + (x0 - OX), y: Math.round(y) + (y0 - OY), w: x1 - x0 + 1, h: y1 - y0 + 1 },
            baseline: Math.min(baseline, Math.round(y) + (y1 - OY) + 1) });
        }
      }
    } catch (err) { r.__padErr = String(err); }
    return out;
  };
  r.__padHook = true;
  return true;
})()
"""

MEASURE_JS = r"""
(async () => {
  const e = LQ_DEBUG.engine, r = e.renderer;
  LQ_DEBUG.uiAudit('on');
  r.__padLog = []; r.__padOn = true;
  const start = LQ_DEBUG.state().frame;
  await new Promise((res) => { const t = () => (LQ_DEBUG.state().frame >= start + 2 ? res() : requestAnimationFrame(t)); t(); });
  r.__padOn = false;
  const w = LQ_DEBUG.uiAudit('windows');
  LQ_DEBUG.uiAudit('off');
  const frame = w.frame;
  return { frame, windows: w.windows, texts: r.__padLog.filter((t) => t.frame === frame), err: r.__padErr || null, scene: LQ_DEBUG.scene() };
})()
"""


def contains(win, px, py):
    return win['x'] <= px < win['x'] + win['w'] and win['y'] <= py < win['y'] + win['h']


def audit(sample):
    """Match texts to windows and return (rows, violations)."""
    rows, bad = [], []
    wins_all = [w for w in sample['windows'] if w.get('open', 1) >= 1]
    for t in sample['texts']:
        ink = dict(t['ink'])
        clip = t.get('clip')
        if clip:   # only the visible part of the ink counts; fully clipped text is skipped
            x0, y0 = max(ink['x'], clip['x']), max(ink['y'], clip['y'])
            x1, y1 = min(ink['x'] + ink['w'], clip['x2']), min(ink['y'] + ink['h'], clip['y2'])
            if x1 <= x0 or y1 <= y0:
                continue
            ink = {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}
            if y1 < t['ink']['y'] + t['ink']['h']:
                t = dict(t, baseline=y1)
        wins = [w for i, w in enumerate(sample['windows']) if i < t.get('nwin', 1e9) and w.get('open', 1) >= 1] or wins_all
        if t.get('nwin', 1e9) == 0:
            continue   # drawn before any window of the frame (a banner under a later dialog): no window owns it
        cx, cy = ink['x'] + ink['w'] / 2, ink['y'] + ink['h'] / 2
        inside = [w for w in wins if contains(w, cx, cy)]
        if not inside:
            continue
        w = min(inside, key=lambda z: z['w'] * z['h'])
        hneed, vneed = RULE.get(w['kind'], (8, 6))
        gaps = {'l': ink['x'] - w['x'], 'r': w['x'] + w['w'] - (ink['x'] + ink['w']), 't': ink['y'] - w['y'], 'b': w['y'] + w['h'] - t['baseline']}
        row = {'text': t['text'], 'font': t['font'], 'win': {k: w[k] for k in ('x', 'y', 'w', 'h', 'kind')}, 'gaps': gaps, 'need': [hneed, vneed],
               'short': [k for k, v in gaps.items() if v < (hneed if k in 'lr' else vneed)]}
        rows.append(row)
        if row['short']:
            bad.append(row)
    return rows, bad


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', action='append', default=[])
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--story', action='store_true')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--timeout', type=int, default=900)
    args = ap.parse_args(argv)

    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    only = [n.strip() for o in args.only for n in o.split(',') if n.strip()] or (['ui_*', 'story_*'] if args.story else ['ui_*'])
    shots, unknown = select_shots(spec['shots'], only)
    if unknown:
        print('unknown shot(s):', ', '.join(unknown))
        return 2
    devices = [d.strip() for d in args.device.split(',') if d.strip()]
    ignore = spec.get('ignoreConsole', [])
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(args.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    report = []
    failures = 0
    t_all = time.time()
    from playwright.sync_api import sync_playwright, Error as PwError
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname in devices:
            dev = spec['devices'][dname]
            context = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                          is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
            context.set_default_timeout(15000)
            for shot in shots:
                if shot.get('devices') and dname not in shot['devices']:
                    continue
                name = shot['name']
                page, errors = new_page(context, shot)
                page.on('console', lambda m, errors=errors: errors.append(m.text) if m.type == 'error' and not any(p in m.text for p in ignore) else None)
                page.on('pageerror', lambda ex, errors=errors: errors.append(str(ex)))
                cdp_holder = {}

                def get_cdp(page=page, holder=cdp_holder):
                    if 'cdp' not in holder:
                        holder['cdp'] = page.context.new_cdp_session(page)
                    return holder['cdp']

                ctx = {'device': dname, 'name': name, 'files': [], 'zooms': [], 'touch': dev.get('touch', False), 'cdp': get_cdp}
                status, detail, rows, bad = 'ok', '', [], []
                try:
                    drive(page, shot, ctx, base)
                    page.evaluate(HOOK_JS)
                    sample = page.evaluate(MEASURE_JS)
                    if sample.get('err'):
                        raise ShotError('measure: ' + sample['err'])
                    rows, bad = audit(sample)
                    detail = f"{len(rows)} texts in {len(sample['windows'])} windows ({sample['scene']})"
                except (PwError, ShotError) as ex:
                    status, detail = 'FAIL', str(ex).splitlines()[0][:200]
                if errors:
                    status, detail = 'FAIL', detail + ' | ' + ' | '.join(errors[:3])
                if bad:
                    status = 'FAIL'
                if status != 'ok':
                    failures += 1
                print(f'{status:<4} {dname:<8} {name:<20} {detail}', flush=True)
                for row in (rows if args.list else bad):
                    g = row['gaps']
                    mark = ' <-- ' + ','.join(row['short']) if row['short'] else ''
                    print(f"       {row['win']['kind']:<5} win {row['win']['x']:>3},{row['win']['y']:>3} {row['win']['w']:>3}x{row['win']['h']:<3} "
                          f"l{g['l']:>3} r{g['r']:>3} t{g['t']:>3} b{g['b']:>3}  {row['text']!r}{mark}")
                report.append({'device': dname, 'shot': name, 'status': status, 'detail': detail, 'violations': bad, 'texts': len(rows)})
                page.close()
            context.close()
        browser.close()
    server.shutdown()
    (OUT / 'padding.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    total = len(report)
    print(f'\n{total - failures}/{total} shots clean in {time.time() - t_all:.1f} s; report in {OUT / "padding.json"}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
