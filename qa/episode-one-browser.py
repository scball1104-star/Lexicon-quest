"""Real desktop/mobile verification against a local server; never visits production."""
import http.server
import json
import pathlib
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'previews'
OUT.mkdir(exist_ok=True)
save = json.loads(subprocess.check_output(
    ['node', '-e', "console.log(JSON.stringify(require('./rpg-engine.js').fresh('Hero')))"], cwd=ROOT))
save.update(place='dungeon', region=0, floor=0, x=5, y=12, music=False)
save['loot'] = [{'id': 100, 'name': 'Courier Boots', 'slot': 'boots', 'stat': 'guard',
                 'bonus': 1, 'stats': {'speed': 5}, 'rarity': 1, 'region': 0, 'source': 'QA'}]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Quiet)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for name, width, height, dpr in [('desktop', 1440, 960, 1), ('mobile', 390, 844, 2)]:
            context = browser.new_context(viewport={'width': width, 'height': height},
                                          device_scale_factor=dpr, is_mobile=name=='mobile',
                                          has_touch=name=='mobile', reduced_motion='reduce')
            context.add_init_script("localStorage.setItem('lexicon-realms-v3-0', " + json.dumps(json.dumps(save)) + ");")
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda err: errors.append(str(err)))
            page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='domcontentloaded')
            page.locator('[data-action="load"][data-id="0"]').click()
            page.wait_for_selector('#field')
            assert page.locator('#field').evaluate('(c)=>c.width') == 816*dpr
            assert page.locator('#field').evaluate('(c)=>c.height') == 624*dpr
            assert page.locator('#field').evaluate('(c)=>c.getContext("2d").getImageData(100,100,1,1).data[3]') > 0
            page.screenshot(path=str(OUT / f'episode-one-{name}-field.png'))
            page.locator('header [data-action="menu"]').click()
            page.locator('.modal [data-action="loot"]').click()
            page.locator('[data-equip="0"]').select_option('axe')
            page.locator('[data-action="equipLoot"][data-id="100"][data-member="1"]').click()
            assert 'Courier Boots' in page.locator('.gear-party').inner_text()
            page.screenshot(path=str(OUT / f'episode-one-{name}-gear.png'))
            page.locator('.modal [data-action="close"]').click()
            page.keyboard.press('ArrowUp')
            page.wait_for_selector('.battle-shell')
            assert page.locator('.v63-enemy-canvas').count() == 0, 'professional art must remain unobscured'
            assert 'enemies.webp' in page.locator('.enemy-art').first.evaluate('(e)=>getComputedStyle(e).backgroundImage')
            page.locator('[data-action="ability"][data-id="venom"]').click()
            page.locator('[data-action="confirmAction"]').click()
            page.locator('[data-action="ability"][data-id="guard"]').click()
            page.locator('[data-action="confirmAction"]').click()
            page.locator('[data-action="ability"][data-id="rally"]').click()
            page.locator('[data-action="confirmAction"]').click()
            assert 'Round 2' in page.locator('.battle-heading').inner_text()
            assert 'Rally 1' in page.locator('.battle-heading').inner_text()
            assert 'Poison' in page.locator('.tactical-enemy').first.inner_text()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 4'), 'mobile horizontal overflow'
            page.screenshot(path=str(OUT / f'episode-one-{name}-combat.png'))
            assert not errors, errors
            print('PASS', name, 'DPR, rendered field, gear, weapon switch, poison, Rally, art and overflow')
            context.close()
        browser.close()
finally:
    server.shutdown()
