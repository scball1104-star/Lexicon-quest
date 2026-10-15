"""Lexicon Quest v60: real Chromium smoke test, local web server only.
Runs on the isolated GitHub Actions branch; never touches Netlify.
"""
import json
import pathlib
import threading
import tempfile
import http.server
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
PREVIEWS=ROOT/'previews'
PREVIEWS.mkdir(exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):
        pass

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/index.html'
saved=json.loads((ROOT/'qa'/'frost-save-town.json').read_text())
saved.update(region=0,place='dungeon',floor=0,x=5,y=12,complete=False,cleared=[],flags={},journal=[],visited=[0],music=False)
saved['party'][0]['name']='Hero'
assert saved['party'][0]['hp']>0

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        for name,viewport,mobile in [
            ('desktop',{'width':1440,'height':960},False),
            ('mobile',{'width':390,'height':844},True)
        ]:
            context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,
                device_scale_factor=1,reduced_motion='reduce')
            context.add_init_script("localStorage.setItem('lexicon-realms-v3-0', "+json.dumps(json.dumps(saved))+");")
            page=context.new_page()
            page.set_default_timeout(16000)
            errors=[]
            page.on('pageerror',lambda err:errors.append(str(err)))
            page.goto(url,wait_until='domcontentloaded',timeout=45000)
            page.locator('[data-action="load"][data-id="0"]').click()
            page.wait_for_selector('.mapframe canvas#field')
            assert page.evaluate("window.LQV60WorldArt?.realms===8"),(name,'v60 world renderer missing')
            assert page.evaluate("window.LQV60Presentation?.version==='v60'"),(name,'v60 UI missing')
            assert page.evaluate("document.body.dataset.lqScene==='field'"),(name,'field presentation missing')
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4"),(name,'field overflow')
            page.screenshot(path=str(PREVIEWS/f'v60-{name}-field.png'),full_page=False,animations='disabled')
            page.locator('header [data-action="menu"]').click()
            page.wait_for_selector('.v60-menu-group')
            assert page.locator('.v60-menu-group').count()==3,(name,'field menu grouping')
            assert page.locator('.v60-menu-buttons [data-action="equipment"]').count()==1
            assert page.locator('.v60-menu-buttons [data-action="transfer"]').count()==1
            page.screenshot(path=str(PREVIEWS/f'v60-{name}-menu.png'),full_page=False,animations='disabled')
            page.locator('.modal [data-action="close"]').click()
            page.keyboard.press('ArrowUp')
            page.wait_for_selector('.battle-shell')
            stage=page.locator('.battle-stage')
            assert stage.locator('.v60-stage-caption').count()==1,(name,'cinematic caption')
            assert stage.locator('.tactical-enemy').count()>=2,(name,'enemy stage')
            assert page.evaluate("document.body.dataset.lqScene==='battle'"),(name,'battle presentation')
            assert page.evaluate("getComputedStyle(document.querySelector('.battle-stage')).backgroundImage.includes('environments.webp')"),(name,'scenic background')
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4"),(name,'battle overflow')
            page.screenshot(path=str(PREVIEWS/f'v60-{name}-battle.png'),full_page=False,animations='disabled')
            page.locator('[data-action="confirmAction"]').click()
            assert page.locator('.battle-result-strip').count()==1,(name,'damage and focus report')
            assert not errors,(name,'javascript errors',errors)
            print('PASS v60',name,'world canvas, menu, cinematic combat, saved input, overflow, visual screenshots')
            context.close()
        browser.close()
finally:
    server.shutdown()
