"""E6-pack headless check (not part of node qa/run.mjs: one browser job at a time, run by hand). The ep5 script's shape.

With EP6_LIVE false (as the pack ships in wave 6a):
  1. Boot and the title fetch nothing of the ep6 pack (no request under src/data/ep6/, for an ep6_ map or for an ep6_ asset;
     no LQ_EP6; packEnabled('ep6') false).
  2. An Episode 5 credits save that owns slot 2 (slots 0 and 1 hold another run), loaded as Continue does, rolls the Episode 5
     credits with the UNCHANGED end card ("Episode 6 is not playable yet."), wakes at ep5_sh_inn, and autosaves to slot 2 only:
     slots 0 and 1 byte for byte intact, slot 3 empty; still no ep6 request.
  3. Zero console errors.
Then, with the pack forced on (forcePack('ep6'), as ?pack=ep6 does) on the phone profile (844x390 at 3x, touch, CPU slowed 4x,
10 Mbps with 40 ms latency, GPU on), the time from a field reset into ep5_sh_inn until the inn is up with the ep4, ep5 and ep6 packs
ready (the chain ep3, ep4, ep5, ep6): cold (a fresh browser profile) and warm (the same profile, reloaded). Plan 3.3 target:
under 8 s cold, under 3 s warm.

    python next/qa/ui/ep6_saves_headless.py [--skip-timing]
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
import fieldlab  # noqa: E402

OUT = NEXT / 'qa' / 'out' / 'ep6_pack'
SLOT = "localStorage.getItem('lq-next-slot-%d')"
EP6_REQ = re.compile(r'/src/data/ep6/|/src/data/maps/ep6_|/ep6_[^/]*$')
COUNTERS4 = ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled']
NOT_YET = re.compile(r'/next/src/data/(ep6/[a-z]+|maps/ep6_[a-z0-9_]+)\.js$')


def flags_of(rel, name):
    """A flag list of a pack's start.js, read from the file here (never fetched, so the browser sees no pack request)."""
    text = (NEXT / rel).read_text(encoding='utf-8')
    return re.findall(r"'([a-z0-9_]+)'", re.search(name + r' = \[([^\]]+)\]', text).group(1))


PACK_FLAGS = (flags_of('src/data/ep4/start.js', 'EP3_DONE_FLAGS') + flags_of('src/data/ep5/start.js', 'EP4_DONE_FLAGS')
              + flags_of('src/data/ep6/start.js', 'EP5_DONE_FLAGS'))

# a game standing in Saffron Haven with Episodes 1 to 5 done (built from core modules only, so nothing of a pack is fetched for it)
BUILD_JS = """(async (a) => {
  const S = await import('/next/src/game/state.js');
  const g = S.createGame(a.name, { map: a.map, pos: { x: a.x, y: a.y, dir: 'down' }, autosaveSlot: a.slot });
  S.addMember(g, 'mira'); S.addMember(g, 'bram');
  for (const f of a.flags) g.flags[f] = true;
  for (const c of a.counters) g.counters[c] = 1;
  return S.serialize(g);
})(%s)"""
CORE_FLAGS_JS = "(async () => { const S = await import('/next/src/game/state.js'); return [...S.EP1_DONE_FLAGS, ...S.EP2_DONE_FLAGS]; })()"


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def save_shot(lab, name):
    import base64
    import io
    from PIL import Image
    OUT.mkdir(parents=True, exist_ok=True)
    raw = base64.b64decode(lab.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")').split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    p = OUT / f'{name}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(p)
    return str(p)


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
        ep6 = [u for u in requests if EP6_REQ.search(u)]
        check(not ep6, f'no ep6 pack request at boot and on the title ({ep6[:3]})')
        check(lab.run('typeof globalThis.LQ_EP6') == 'undefined', 'LQ_EP6 is not installed')
        check(lab.run("(async () => (await import('/next/src/game/packs.js')).packEnabled('ep6'))()") is False, "packEnabled('ep6') is false")

        # --- an Episode 5 credits save in slot 2
        lab.run("localStorage.clear()")
        lab.run("""(async () => {
          const S = await import('/next/src/game/state.js');
          const g = S.createGame('Elder'); for (const f of S.EP1_DONE_FLAGS) g.flags[f] = true;
          LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
          LQ_ENGINE.save.save(1, S.serialize(g), S.saveMeta(g));
          return true; })()""")
        before = [lab.run(SLOT % n) for n in range(4)]
        flags = lab.run(CORE_FLAGS_JS) + PACK_FLAGS
        data = lab.run(BUILD_JS % json.dumps({'name': 'Sol', 'map': 'ep5_saffron', 'x': 20, 'y': 30, 'slot': 2, 'flags': flags,
                                              'counters': COUNTERS4}))
        check(data['flags'].get('ep5_complete') and not data['counters'].get('credits5_rolled'), 'the fixture is an Episode 5 credits save')
        lab.run("""(() => {
          window.__seen = [];
          const e = LQ_ENGINE, orig = e.pushAwait.bind(e);
          e.pushAwait = (n, d) => { if (n === 'credits' || n === 'titleCard') { window.__seen.push([n, d || null]); return Promise.resolve(); } return orig(n, d); };
          return true; })()""")
        slot = lab.run("""(async (a) => {
          const S = await import('/next/src/game/state.js');
          const g = S.deserialize(a.data);
          LQ_ENGINE.game = g;
          LQ_ENGINE.reset('field', { map: g.map, x: g.pos.x, y: g.pos.y, dir: 'down' });
          return g.autosaveSlot; })(%s)""" % json.dumps({'data': data}))
        check(slot == 2, 'the save loads with its own autosaveSlot 2')
        lab.page.wait_for_function(
            '() => { const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return !!f && f.map && f.map.id === "ep5_sh_inn" && !f.loading && !LQ_DEBUG.state().transition; }',
            timeout=90000, polling=50)
        lab.frames(30)
        seen = lab.run('window.__seen')
        print('  seen', json.dumps(seen)[:300])
        check([s[0] for s in seen][:2] == ['credits', 'titleCard'], 'the Episode 5 credits rolled, then the end card')
        card = seen[1][1]
        check(card['text'] == 'To be continued' and card['sub'] == 'Episode 6 is not playable yet.', f'the Episode 5 end card is unchanged ({card["sub"]})')
        lab.frames(30)
        after = [lab.run(SLOT % n) for n in range(4)]
        check(after[0] == before[0] and after[1] == before[1], 'slots 0 and 1 are byte for byte intact')
        check(after[3] is None, 'slot 3 stays empty')
        s2 = json.loads(after[2]) if after[2] else None
        check(s2 and s2['data']['map'] == 'ep5_sh_inn' and s2['data']['autosaveSlot'] == 2 and s2['data']['counters'].get('credits5_rolled') == 1,
              'slot 2 holds the run, awake at ep5_sh_inn, credits5_rolled set')
        check(not s2['data']['flags'].get('ep6_started'), 'ep6_morning did not run')
        ep6 = [u for u in requests if EP6_REQ.search(u)]
        check(not ep6, f'still no ep6 pack request after the credits ({ep6[:3]})')
        print('  shot', save_shot(lab, 'ep6_saves_inn_after_ep5_credits'))
        if lab.errors:
            print('\n'.join(lab.errors))
            return False
        return True
    finally:
        lab.close()


TIME_JS = """(async (a) => {
  const S = await import('/next/src/game/state.js');
  const P = await import('/next/src/game/packs.js');
  P.forcePack('ep6');
  LQ_ENGINE.game = S.deserialize(a.data);
  const t0 = performance.now();
  LQ_ENGINE.reset('field', { map: 'ep5_sh_inn', mark: 'inn_bed', dir: 'down' });
  await new Promise((ok, no) => {
    const until = t0 + 90000;
    const tick = () => {
      const f = LQ_ENGINE.stack.find((sc) => sc.name === 'field');
      if (f && f.map && f.map.id === 'ep5_sh_inn' && !f.loading && P.packReady('ep4') && P.packReady('ep5') && P.packReady('ep6')) return ok();
      if (performance.now() > until) return no(new Error('inn not up in 90 s: ' + JSON.stringify(P.packState('ep6'))));
      setTimeout(tick, 20);
    };
    tick();
  });
  const ms = (id) => { const s = P.packState(id).last; return s && s.ms; };
  return { ms: Math.round(performance.now() - t0), ep4: ms('ep4'), ep5: ms('ep5'), ep6: ms('ep6'), sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
})(%s)"""


def boot(page):
    """A player's boot (no ?debug, so the service worker is on): the tap prompt, a press, the title."""
    page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=90000)
    page.keyboard.press('Enter')
    page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name === "title" && LQ_ENGINE.hasScene("field")', timeout=90000)


def time_inn(page, data):
    r = page.evaluate(TIME_JS % json.dumps({'data': data}))
    print(f"    ensurePack ms: ep4 {r['ep4']}, ep5 {r['ep5']}, ep6 {r['ep6']}; service worker in control: {r['sw']}", flush=True)
    return r['ms'] / 1000


def part_timing():
    """Production-like: qa/pwa/pwa.py's server (gzip like GitHub Pages), no ?debug (the worker installs and runtime-caches the
    packs), a fresh profile for the cold entry, the same profile reloaded once the worker holds the packs for the warm one."""
    sys.path.insert(0, str(HERE.parent / 'pwa'))
    import pwa  # noqa: E402
    from playwright.sync_api import sync_playwright
    server = pwa.start_server()
    base = f'http://127.0.0.1:{server.server_port}'
    lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    want = sorted(f for k in ('ep4', 'ep5', 'ep6') for f in lists.get(k, []) if not f.endswith(('.mp3', '.wav')))
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True, args=fieldlab.GPU_ARGS)
    errors = []
    missing = []   # 404s: the pack's prefetch asks for every module and map of its lists, written or not (wave 6a: most are not)
    try:
        dev = fieldlab.DEVICES['phone']
        ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                                  is_mobile=True, has_touch=True)
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
        print(f"  renderer: {page.evaluate(fieldlab.GPU_JS)} (software, such as SwiftShader, over-measures the entry)", flush=True)
        boot(page)
        core = page.evaluate(CORE_FLAGS_JS)
        data = page.evaluate(BUILD_JS % json.dumps({'name': 'Pia', 'map': 'ep5_saffron', 'x': 20, 'y': 30, 'slot': 3,
                                                    'flags': core + PACK_FLAGS, 'counters': COUNTERS4 + ['credits5_rolled']}))
        cold = time_inn(page, data)
        print(f'  cold entry to the inn (ep4, ep5, ep6): {cold:.2f} s', flush=True)
        js = ("async () => { const c = await caches.open('lq-next-runtime-v1'); const keys = (await c.keys()).map(r => new URL(r.url).pathname);"
              " const want = %s; return want.filter(w => !keys.some(k => k.endsWith('/next/' + w))).length; }" % json.dumps(want))
        left, t0 = None, time.time()
        while time.time() - t0 < 120:
            left = page.evaluate(js)
            if left == 0:
                break
            page.wait_for_timeout(1000)
        print(f'  the worker runtime-cached the ep4, ep5 and ep6 packs ({len(want)} files, {left} missing) in {time.time() - t0:.0f} s', flush=True)
        page.reload(wait_until='load')
        boot(page)
        warm = time_inn(page, data)
        print(f'  warm entry to the inn (ep4, ep5, ep6): {warm:.2f} s', flush=True)
        ctx.close()
    finally:
        browser.close()
        pw.stop()
        server.shutdown()
    unexpected = [u for u in missing if not NOT_YET.search(u) or (NEXT / re.sub(r'^.*?/next/', '', u)).exists()]
    print(f'  404s: {len(missing)}, all of them ep6 modules or maps not written yet: {not unexpected} {unexpected[:3]}')
    if not unexpected:   # the browser reports each expected 404 as a console error without its URL: drop exactly that many
        n = len(missing)
        errors = [e for e in errors if not (e.startswith('console.error: Failed to load resource') and '404' in e and (n := n - 1) >= 0)]
    ok = cold < 8 and warm < 3 and not errors and not unexpected
    if cold >= 8:
        print('  OVER TARGET: cold entry is 8 s or more')
    if warm >= 3:
        print('  OVER TARGET: warm entry is 3 s or more')
    for e in errors[:10]:
        print('  ', e)
    return ok, cold, warm


def main():
    t = time.time()
    try:
        ok = part_saves()
        print('EP6_SAVES_HEADLESS:', 'PASS' if ok else 'FAIL (console errors)')
        if '--skip-timing' not in sys.argv:
            tok, cold, warm = part_timing()
            print(f'EP6_PACK_TIMING: {"PASS" if tok else "FAIL"} cold {cold:.2f} s, warm {warm:.2f} s (phone profile)')
            ok = ok and tok
        print(f'done in {time.time() - t:.0f} s')
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        print('EP6_SAVES_HEADLESS: FAIL', e)
        return 1


if __name__ == '__main__':
    sys.exit(main())
