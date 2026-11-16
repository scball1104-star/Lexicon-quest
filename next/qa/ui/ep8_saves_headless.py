"""E8-pack headless check (not part of node qa/run.mjs: one browser job at a time, run by hand). qa/ui/ep7_saves_headless.py's shape.

With EP8_LIVE false (as the pack ships in wave 8a):
  1. Boot and the title fetch nothing of the ep8 pack (no request under src/data/ep8/, for an ep8_ map or for an ep8_ asset;
     no LQ_EP8; packEnabled('ep8') false).
  2. An Episode 7 credits save that owns slot 2 (slots 0 and 1 hold another run), loaded as Continue does, rolls the Episode 7
     credits with the UNCHANGED end card ("Episode 8 is not playable yet."), wakes at ep7_ph_watch, and autosaves to slot 2 only:
     slots 0 and 1 byte for byte intact, slot 3 empty; still no ep8 request.
  3. Zero console errors.
Then the timing (plan 3.3 and 13.5), on the phone profile (844x390 at 3x, touch, CPU slowed 4x, 10 Mbps with 40 ms latency, GPU
on): the time from a field reset into the Keeper's Watch (ep7_ph_watch, mark watch_cot) until it is up with every pack of the
chain ready, cold (a fresh browser profile) and warm (the same profile, reloaded once the worker holds the packs). Two chains:
  ep7   the Episode 7 entry as players have it today: ep4 to ep7 ready (ep8 off)
  ep8   the pack forced on (forcePack('ep8'), as ?pack=ep8 does): ep4 to ep8 ready
Plan 3.3 target: under 8 s cold, under 3 s warm. --trace prints when the chain's pieces arrived on the cold entry (resource timing).

    python next/qa/ui/ep8_saves_headless.py [--skip-timing] [--runs 3] [--chain ep7|ep8|both] [--trace]
"""
import json
import pathlib
import re
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE.parent / 'world'))
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import fieldlab  # noqa: E402
import ep7_saves_headless as e7  # noqa: E402  (BUILD_JS, CORE_FLAGS_JS, boot(), save_shot(), flags_of())

OUT = NEXT / 'qa' / 'out' / 'ep8_pack'
SLOT = "localStorage.getItem('lq-next-slot-%d')"
EP8_REQ = re.compile(r'/src/data/ep8/|/src/data/maps/ep8_|/ep8_[^/]*$')
COUNTERS6 = e7.COUNTERS5 + ['credits6_rolled']
NOT_YET = re.compile(r'/next/src/data/(ep8/[a-z]+|maps/ep8_[a-z0-9_]+)\.js$')
LIVE = bool(re.search(r'^export const EP8_LIVE = true;$', (NEXT / 'src' / 'game' / 'episodes.js').read_text(encoding='utf-8'), re.M))
PACK_FLAGS = e7.PACK_FLAGS + e7.flags_of('src/data/ep8/start.js', 'EP7_DONE_FLAGS')
CHAINS = {'ep7': ('ep4', 'ep5', 'ep6', 'ep7'), 'ep8': ('ep4', 'ep5', 'ep6', 'ep7', 'ep8')}


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def part_saves():
    lab = fieldlab.Lab(device='desktop')
    requests = []
    lab.page.on('request', lambda r: requests.append(r.url))
    try:
        lab.open('?debug=1&fps=0')
        lab.page.wait_for_function("LQ_DEBUG.engine.hasScene('field')", timeout=20000, polling=50)
        lab.run("LQ_DEBUG.reset('title'); true")
        lab.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        lab.frames(90)
        ep8 = [u for u in requests if EP8_REQ.search(u)]
        check(not ep8, f'no ep8 pack request at boot and on the title ({ep8[:3]})')
        check(lab.run('typeof globalThis.LQ_EP8') == 'undefined', 'LQ_EP8 is not installed')
        check(lab.run("(async () => (await import('/next/src/game/packs.js')).packEnabled('ep8'))()") is LIVE, f"packEnabled('ep8') is {LIVE} (EP8_LIVE)")

        # --- an Episode 7 credits save in slot 2, standing on the Stillheart roof where ep7_ending left it
        lab.run("localStorage.clear()")
        lab.run("""(async () => {
          const S = await import('/next/src/game/state.js');
          const g = S.createGame('Elder'); for (const f of S.EP1_DONE_FLAGS) g.flags[f] = true;
          LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
          LQ_ENGINE.save.save(1, S.serialize(g), S.saveMeta(g));
          return true; })()""")
        before = [lab.run(SLOT % n) for n in range(4)]
        flags = lab.run(e7.CORE_FLAGS_JS) + PACK_FLAGS
        data = lab.run(e7.BUILD_JS % json.dumps({'name': 'Sol', 'map': 'ep7_stillheart', 'x': 20, 'y': 9, 'slot': 2, 'flags': flags,
                                                 'counters': COUNTERS6}))
        check(data['flags'].get('ep7_complete') and not data['counters'].get('credits7_rolled'), 'the fixture is an Episode 7 credits save')
        lab.run("""(() => {
          window.__seen = [];
          const e = LQ_ENGINE, orig = e.pushAwait.bind(e);
          e.pushAwait = (n, d) => { if (n === 'credits' || n === 'titleCard') { window.__seen.push([n, d || null]); return Promise.resolve(); } return orig(n, d); };
          return true; })()""")
        slot = lab.run("""(async (a) => {
          const S = await import('/next/src/game/state.js');
          const g = S.deserialize(a.data);
          LQ_ENGINE.game = g;
          LQ_ENGINE.reset('field', { map: g.map, x: g.pos.x, y: g.pos.y, dir: 'up' });
          return g.autosaveSlot; })(%s)""" % json.dumps({'data': data}))
        check(slot == 2, 'the save loads with its own autosaveSlot 2')
        lab.page.wait_for_function(
            '() => { const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return !!f && f.map && f.map.id === "ep7_ph_watch" && !f.loading && !LQ_DEBUG.state().transition; }',
            timeout=90000, polling=50)
        lab.frames(30)
        seen = lab.run('window.__seen')
        print('  seen', json.dumps(seen)[:200])
        check([s[0] for s in seen][:2] == ['credits', 'titleCard'], 'the Episode 7 credits rolled, then the end card')
        card = seen[1][1]
        sub = 'Episode 8 begins in the morning.' if LIVE else 'Episode 8 is not playable yet.'
        check(card['text'] == 'To be continued' and card['sub'] == sub, f'the Episode 7 end card follows EP8_LIVE ({card["sub"]})')
        lab.frames(30)
        after = [lab.run(SLOT % n) for n in range(4)]
        check(after[0] == before[0] and after[1] == before[1], 'slots 0 and 1 are byte for byte intact')
        check(after[3] is None, 'slot 3 stays empty')
        s2 = json.loads(after[2]) if after[2] else None
        check(s2 and s2['data']['map'] == 'ep7_ph_watch' and s2['data']['autosaveSlot'] == 2 and s2['data']['counters'].get('credits7_rolled') == 1,
              'slot 2 holds the run, awake in the Keeper\'s Watch, credits7_rolled set')
        f = lab.run('(() => { const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return [f.leader.tx, f.leader.ty]; })()')
        check(f == [14, 5], f'the party wakes at watch_cot (14, 5): {f}')
        if not LIVE:
            check(not s2['data']['flags'].get('ep8_started'), 'ep8_morning did not run')
            ep8 = [u for u in requests if EP8_REQ.search(u)]
            check(not ep8, f'still no ep8 pack request after the credits ({ep8[:3]})')
        e7.OUT = OUT
        print('  shot', e7.save_shot(lab, 'ep8_saves_watch_after_ep7_credits'))
        if lab.errors:
            print('\n'.join(lab.errors))
            return False
        return True
    finally:
        lab.close()


TIME_JS = """(async (a) => {
  const S = await import('/next/src/game/state.js');
  const P = await import('/next/src/game/packs.js');
  for (const id of a.force) P.forcePack(id);
  LQ_ENGINE.game = S.deserialize(a.data);
  const t0 = performance.now();
  LQ_ENGINE.reset('field', { map: 'ep7_ph_watch', mark: 'watch_cot', dir: 'down' });
  const ready = {};
  await new Promise((ok, no) => {
    const until = t0 + 90000;
    const tick = () => {
      for (const id of a.packs) if (ready[id] == null && P.packReady(id)) ready[id] = Math.round(performance.now() - t0);
      const f = LQ_ENGINE.stack.find((sc) => sc.name === 'field');
      if (f && f.map && f.map.id === 'ep7_ph_watch' && !f.loading && a.packs.every((id) => P.packReady(id))) return ok();
      if (performance.now() > until) return no(new Error('the Watch not up in 90 s: ' + JSON.stringify(a.packs.map((id) => P.packState(id)))));
      setTimeout(tick, 20);
    };
    tick();
  });
  const ms = Math.round(performance.now() - t0);
  const res = performance.getEntriesByType('resource').filter((e) => e.startTime >= t0 - 5);
  const span = (re) => { const xs = res.filter((e) => re.test(e.name)); if (!xs.length) return null;
    const ends = xs.map((e) => e.responseEnd - t0).sort((p, q) => p - q);
    return [Math.round(Math.min(...xs.map((e) => e.startTime)) - t0), Math.round(ends[Math.floor(ends.length / 2)]), Math.round(ends[ends.length - 1]), xs.length,
      Math.round(xs.reduce((n, e) => n + (e.transferSize || 0), 0) / 1024)]; };
  const trace = { pack_files: span(/pack_files\\.json/), audio: span(/\\/assets\\/audio\\//) };
  for (const id of a.packs) trace[id + '_code'] = span(new RegExp('/src/data/' + id + '/|/src/data/maps/' + id + '_'));
  for (const id of a.packs) trace[id + '_art'] = span(new RegExp('/assets/(?!audio/)[^?]*' + id + '_'));
  trace.all = span(/./);
  return { ms, ready, trace, sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
})(%s)"""


def time_watch(page, data, chain):
    force = ['ep8'] if chain == 'ep8' else []
    r = page.evaluate(TIME_JS % json.dumps({'data': data, 'packs': list(CHAINS[chain]), 'force': force}))
    print(f"    ready at (ms from the reset): {r['ready']}; service worker in control: {r['sw']}", flush=True)
    return r


def one_run(browser, base, chain, want, trace):
    errors, missing = [], []
    dev = fieldlab.DEVICES['phone']
    ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                              is_mobile=True, has_touch=True)
    try:
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
        page.on('response', lambda r: missing.append(r.url) if r.status == 404 else None)
        cdp = ctx.new_cdp_session(page)
        cdp.send('Network.enable')
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 40, 'downloadThroughput': 10 * 1024 * 1024 / 8,
                                                      'uploadThroughput': 10 * 1024 * 1024 / 16})
        page.goto(base + '/next/index.html', wait_until='load')
        e7.boot(page)
        core = page.evaluate(e7.CORE_FLAGS_JS)
        data = page.evaluate(e7.BUILD_JS % json.dumps({'name': 'Pia', 'map': 'ep7_palehaven', 'x': 20, 'y': 20, 'slot': 3,
                                                       'flags': core + PACK_FLAGS, 'counters': COUNTERS6 + ['credits7_rolled']}))
        r = time_watch(page, data, chain)
        cold = r['ms'] / 1000
        if trace:
            print('    trace (first start, median end, last end in ms; requests; KB): ' + json.dumps(r['trace']), flush=True)
        js = ("async () => { const c = await caches.open('lq-next-runtime-v1'); const keys = (await c.keys()).map(r => new URL(r.url).pathname);"
              " const want = %s; return want.filter(w => !keys.some(k => k.endsWith('/next/' + w))).length; }" % json.dumps(want))
        left, t0 = None, time.time()
        while time.time() - t0 < 120:
            left = page.evaluate(js)
            if left == 0:
                break
            page.wait_for_timeout(1000)
        page.reload(wait_until='load')
        e7.boot(page)
        warm = time_watch(page, data, chain)['ms'] / 1000
    finally:
        ctx.close()
    return cold, warm, errors, missing, left


def part_timing(runs, chains, trace):
    sys.path.insert(0, str(HERE.parent / 'pwa'))
    import pwa  # noqa: E402
    from playwright.sync_api import sync_playwright
    server = pwa.start_server()
    base = f'http://127.0.0.1:{server.server_port}'
    lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True, args=fieldlab.GPU_ARGS)
    results, ok = {}, True
    try:
        page = browser.new_page()
        page.goto(base + '/next/index.html', wait_until='load')
        print(f"  renderer: {page.evaluate(fieldlab.GPU_JS)} (software, such as SwiftShader, over-measures the entry)", flush=True)
        page.close()
        for n in range(runs):
            for chain in chains:
                want = sorted(f for k in CHAINS[chain] for f in lists.get(k, []) if not f.endswith(('.mp3', '.wav')))
                cold, warm, errors, missing, left = one_run(browser, base, chain, want, trace)
                unexpected = [u for u in missing if not NOT_YET.search(u) or (NEXT / re.sub(r'^.*?/next/', '', u)).exists()]
                if not unexpected:   # the browser reports each expected 404 as a console error without its URL: drop that many
                    k = len(missing)
                    errors = [e for e in errors if not (e.startswith('console.error: Failed to load resource') and '404' in e and (k := k - 1) >= 0)]
                print(f'  run {n + 1} {chain}: cold {cold:.2f} s, warm {warm:.2f} s ({len(missing)} 404s, all not-yet-written ep8 files: '
                      f'{not unexpected}; {left} files not yet runtime-cached before the warm entry)', flush=True)
                for e in errors[:5]:
                    print('   ', e)
                results.setdefault(chain, []).append((cold, warm))
                ok = ok and not errors and not unexpected
    finally:
        browser.close()
        pw.stop()
        server.shutdown()
    for chain, rs in results.items():
        cs, ws = [c for c, _ in rs], [w for _, w in rs]
        print(f'  {chain} chain to ep7_ph_watch: cold {min(cs):.2f} to {max(cs):.2f} s, warm {min(ws):.2f} to {max(ws):.2f} s ({len(rs)} runs)')
        if max(cs) >= 8:
            print(f'  OVER TARGET ({chain}): cold entry is 8 s or more')
        if max(ws) >= 3:
            print(f'  OVER TARGET ({chain}): warm entry is 3 s or more')
    return ok, results


def main():
    t = time.time()
    args = sys.argv[1:]
    runs = int(args[args.index('--runs') + 1]) if '--runs' in args else 1
    chain = args[args.index('--chain') + 1] if '--chain' in args else 'both'
    chains = ['ep7', 'ep8'] if chain == 'both' else [chain]
    try:
        ok = True
        if '--skip-saves' not in args:
            ok = part_saves()
            print('EP8_SAVES_HEADLESS:', 'PASS' if ok else 'FAIL (console errors)')
        if '--skip-timing' not in args:
            tok, res = part_timing(runs, chains, '--trace' in args)
            print('EP8_PACK_TIMING:', 'PASS' if tok else 'FAIL', json.dumps({k: [[round(c, 2), round(w, 2)] for c, w in v] for k, v in res.items()}))
            ok = ok and tok
        print(f'done in {time.time() - t:.0f} s')
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        print('EP8_SAVES_HEADLESS: FAIL', e)
        return 1


if __name__ == '__main__':
    sys.exit(main())
