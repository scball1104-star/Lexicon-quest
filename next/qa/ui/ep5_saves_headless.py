"""E5-pack headless check (not part of node qa/run.mjs: one browser job at a time, run by hand).

With EP5_LIVE false (as the pack ships in wave 5a):
  1. Boot and the title fetch nothing of the ep5 pack (no request under src/data/ep5/, for an ep5_ map or for an ep5_ asset;
     no LQ_EP5; packEnabled('ep5') false).
  2. An Episode 4 credits save that owns slot 2 (slots 0 and 1 hold another run), loaded as Continue does, rolls the Episode 4
     credits with the UNCHANGED end card ("Episode 5 is not playable yet."), wakes at ep4_vw_inn, and autosaves to slot 2 only:
     slots 0 and 1 byte for byte intact, slot 3 empty; still no ep5 request.
  3. Zero console errors.
Then, with the pack forced on (LQ_PACKS.forcePack('ep5'), as ?pack=ep5 does) on the phone profile (844x390 at 3x, touch,
CPU slowed 4x, 10 Mbps with 40 ms latency), the time from a field reset into ep4_vw_inn until the inn is up with both the ep4
and the ep5 pack ready: cold (a fresh browser profile) and warm (the same profile, reloaded). Plan 3.3 target: under 8 s cold,
under 3 s warm.

    python next/qa/ui/ep5_saves_headless.py [--skip-timing]
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

OUT = NEXT / 'qa' / 'out' / 'ep5_pack'
SLOT = "localStorage.getItem('lq-next-slot-%d')"
START = (NEXT / 'src/data/ep5/start.js').read_text(encoding='utf-8')
EP4_DONE = re.findall(r"'([a-z0-9_]+)'", re.search(r"EP4_DONE_FLAGS = \[([^\]]+)\]", START).group(1))
EP5_REQ = re.compile(r'/src/data/ep5/|/src/data/maps/ep5_|/ep5_[^/]*$')

# a game standing in Valewyn with Episodes 1 to 4 done (built from core modules only, so nothing of a pack is fetched for it)
BUILD_JS = """(async (a) => {
  const S = await import('/next/src/game/state.js');
  const g = S.createGame(a.name, { map: a.map, pos: { x: a.x, y: a.y, dir: 'down' }, autosaveSlot: a.slot });
  S.addMember(g, 'mira'); S.addMember(g, 'bram');
  for (const f of a.flags) g.flags[f] = true;
  for (const c of a.counters) g.counters[c] = 1;
  return S.serialize(g);
})(%s)"""


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


def all_done_flags(lab):
    """EP1/EP2 done flags from state.js and the Episode 3 list from the ep4 pack's start.js text (read here, not fetched)."""
    ep3 = re.findall(r"'([a-z0-9_]+)'", re.search(r"EP3_DONE_FLAGS = \[([^\]]+)\]", (NEXT / 'src/data/ep4/start.js').read_text(encoding='utf-8')).group(1))
    core = lab.run("(async () => { const S = await import('/next/src/game/state.js'); return [...S.EP1_DONE_FLAGS, ...S.EP2_DONE_FLAGS]; })()")
    return core + ep3 + EP4_DONE


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
        ep5 = [u for u in requests if EP5_REQ.search(u)]
        check(not ep5, f'no ep5 pack request at boot and on the title ({ep5[:3]})')
        check(lab.run('typeof globalThis.LQ_EP5') == 'undefined', 'LQ_EP5 is not installed')
        check(lab.run("(async () => (await import('/next/src/game/packs.js')).packEnabled('ep5'))()") is False, "packEnabled('ep5') is false")

        # --- an Episode 4 credits save in slot 2
        lab.run("localStorage.clear()")
        lab.run("""(async () => {
          const S = await import('/next/src/game/state.js');
          const g = S.createGame('Elder'); for (const f of S.EP1_DONE_FLAGS) g.flags[f] = true;
          LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
          LQ_ENGINE.save.save(1, S.serialize(g), S.saveMeta(g));
          return true; })()""")
        before = [lab.run(SLOT % n) for n in range(4)]
        flags = all_done_flags(lab)
        data = lab.run(BUILD_JS % json.dumps({'name': 'Sol', 'map': 'ep4_valewyn', 'x': 21, 'y': 22, 'slot': 2, 'flags': flags,
                                              'counters': ['credits_rolled', 'credits2_rolled', 'credits3_rolled']}))
        check(data['flags'].get('ep4_complete') and not data['counters'].get('credits4_rolled'), 'the fixture is an Episode 4 credits save')
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
            '() => { const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return !!f && f.map && f.map.id === "ep4_vw_inn" && !f.loading && !LQ_DEBUG.state().transition; }',
            timeout=60000, polling=50)
        lab.frames(30)
        seen = lab.run('window.__seen')
        print('  seen', json.dumps(seen)[:300])
        check([s[0] for s in seen][:2] == ['credits', 'titleCard'], 'the Episode 4 credits rolled, then the end card')
        card = seen[1][1]
        check(card['text'] == 'To be continued' and card['sub'] == 'Episode 5 is not playable yet.', f'the Episode 4 end card is unchanged ({card["sub"]})')
        lab.frames(30)
        after = [lab.run(SLOT % n) for n in range(4)]
        check(after[0] == before[0] and after[1] == before[1], 'slots 0 and 1 are byte for byte intact')
        check(after[3] is None, 'slot 3 stays empty')
        s2 = json.loads(after[2]) if after[2] else None
        check(s2 and s2['data']['map'] == 'ep4_vw_inn' and s2['data']['autosaveSlot'] == 2 and s2['data']['counters'].get('credits4_rolled') == 1,
              'slot 2 holds the run, awake at ep4_vw_inn, credits4_rolled set')
        check(not s2['data']['flags'].get('ep5_started'), 'ep5_morning did not run')
        ep5 = [u for u in requests if EP5_REQ.search(u)]
        check(not ep5, f'still no ep5 pack request after the credits ({ep5[:3]})')
        print('  shot', save_shot(lab, 'ep5_saves_inn_after_ep4_credits'))
        if lab.errors:
            print('\n'.join(lab.errors))
            return False
        return True
    finally:
        lab.close()


TIME_JS = """(async (a) => {
  const S = await import('/next/src/game/state.js');
  const P = await import('/next/src/game/packs.js');
  P.forcePack('ep5');
  LQ_ENGINE.game = S.deserialize(a.data);
  const t0 = performance.now();
  LQ_ENGINE.reset('field', { map: 'ep4_vw_inn', mark: 'inn_bed', dir: 'down' });
  await new Promise((ok, no) => {
    const until = t0 + 60000;
    const tick = () => {
      const f = LQ_ENGINE.stack.find((sc) => sc.name === 'field');
      if (f && f.map && f.map.id === 'ep4_vw_inn' && !f.loading && P.packReady('ep4') && P.packReady('ep5')) return ok();
      if (performance.now() > until) return no(new Error('inn not up in 60 s: ' + JSON.stringify(P.packState('ep5'))));
      setTimeout(tick, 20);
    };
    tick();
  });
  const s4 = P.packState('ep4').last, s5 = P.packState('ep5').last;
  return { ms: Math.round(performance.now() - t0), ep4: s4 && s4.ms, ep5: s5 && s5.ms, sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
})(%s)"""


def boot(page):
    """A player's boot (no ?debug, so the service worker is on): the tap prompt, a press, the title."""
    page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=90000)
    page.keyboard.press('Enter')
    page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name === "title" && LQ_ENGINE.hasScene("field")', timeout=90000)


def time_inn(page, data):
    r = page.evaluate(TIME_JS % json.dumps({'data': data}))
    print(f"    ensurePack ms: ep4 {r['ep4']}, ep5 {r['ep5']}; service worker in control: {r['sw']}", flush=True)
    return r['ms'] / 1000


def part_timing():
    """Production-like: qa/pwa/pwa.py's server (gzip like GitHub Pages), no ?debug (the worker installs and runtime-caches the
    packs), a fresh profile for the cold entry, the same profile reloaded once the worker holds both packs for the warm one."""
    sys.path.insert(0, str(HERE.parent / 'pwa'))
    import pwa  # noqa: E402
    from playwright.sync_api import sync_playwright
    server = pwa.start_server()
    base = f'http://127.0.0.1:{server.server_port}'
    lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    want = sorted(f for k in ('ep4', 'ep5') for f in lists[k] if not f.endswith(('.mp3', '.wav')))
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True)
    errors = []
    try:
        dev = fieldlab.DEVICES['phone']
        ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                                  is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
        cdp = ctx.new_cdp_session(page)
        cdp.send('Network.enable')
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 40, 'downloadThroughput': 10 * 1024 * 1024 / 8,
                                                      'uploadThroughput': 10 * 1024 * 1024 / 16})
        page.goto(base + '/next/index.html', wait_until='load')
        boot(page)
        core = page.evaluate("(async () => { const S = await import('/next/src/game/state.js'); return [...S.EP1_DONE_FLAGS, ...S.EP2_DONE_FLAGS]; })()")
        ep3 = re.findall(r"'([a-z0-9_]+)'", re.search(r"EP3_DONE_FLAGS = \[([^\]]+)\]", (NEXT / 'src/data/ep4/start.js').read_text(encoding='utf-8')).group(1))
        data = page.evaluate(BUILD_JS % json.dumps({'name': 'Pia', 'map': 'ep4_valewyn', 'x': 21, 'y': 22, 'slot': 3, 'flags': core + ep3 + EP4_DONE,
                                                    'counters': ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled']}))
        cold = time_inn(page, data)
        print(f'  cold entry to the inn (both packs): {cold:.2f} s', flush=True)
        js = ("async () => { const c = await caches.open('lq-next-runtime-v1'); const keys = (await c.keys()).map(r => new URL(r.url).pathname);"
              " const want = %s; return want.filter(w => !keys.some(k => k.endsWith('/next/' + w))).length; }" % json.dumps(want))
        left, t0 = None, time.time()
        while time.time() - t0 < 120:
            left = page.evaluate(js)
            if left == 0:
                break
            page.wait_for_timeout(1000)
        print(f'  the worker runtime-cached the ep4 and ep5 packs ({len(want)} files, {left} missing) in {time.time() - t0:.0f} s', flush=True)
        page.reload(wait_until='load')
        boot(page)
        warm = time_inn(page, data)
        print(f'  warm entry to the inn (both packs): {warm:.2f} s', flush=True)
        ctx.close()
    finally:
        browser.close()
        pw.stop()
        server.shutdown()
    ok = cold < 8 and warm < 3 and not errors
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
        print('EP5_SAVES_HEADLESS:', 'PASS' if ok else 'FAIL (console errors)')
        if '--skip-timing' not in sys.argv:
            tok, cold, warm = part_timing()
            print(f'EP5_PACK_TIMING: {"PASS" if tok else "FAIL"} cold {cold:.2f} s, warm {warm:.2f} s (phone profile)')
            ok = ok and tok
        print(f'done in {time.time() - t:.0f} s')
        return 0 if ok else 1
    except Exception as e:  # noqa: BLE001
        print('EP5_SAVES_HEADLESS: FAIL', e)
        return 1


if __name__ == '__main__':
    sys.exit(main())
