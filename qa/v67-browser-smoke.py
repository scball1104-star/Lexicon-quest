"""Lexicon Quest v67: real Chromium smoke test, local web server only.
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
            page.wait_for_selector('.v61-wayfinder')
            assert page.evaluate("typeof window.LQWayfinder?.plan==='function'"),(name,'wayfinder unavailable')
            assert page.locator('.v61-wayfinder').count()==1,(name,'single quest card')
            if page.locator('.v61-wayfinder [data-action="toggleRoute"]').count():
                toggle=page.locator('.v61-wayfinder [data-action="toggleRoute"]')
                was=toggle.get_attribute('aria-pressed')
                toggle.click()
                assert page.locator('.v61-wayfinder [data-action="toggleRoute"]').get_attribute('aria-pressed')!=was,(name,'route toggles')
                page.locator('.v61-wayfinder [data-action="toggleRoute"]').click()
            assert page.evaluate("window.LQV60WorldArt?.realms===8"),(name,'v60 world renderer missing')
            assert page.evaluate("window.LQV60Presentation?.version==='v60'"),(name,'v60 presentation missing')
            assert page.evaluate("document.body.dataset.lqScene==='field'"),(name,'field presentation missing')
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4"),(name,'field overflow')
            page.screenshot(path=str(PREVIEWS/f'v67-{name}-field.png'),full_page=False,animations='disabled')
            page.locator('header [data-action="menu"]').click()
            page.wait_for_selector('.v60-menu-group')
            assert page.locator('.v60-menu-group').count()==3,(name,'field menu grouping')
            assert page.locator('.v60-menu-buttons [data-action="equipment"]').count()==1
            assert page.locator('.v60-menu-buttons [data-action="transfer"]').count()==1
            page.screenshot(path=str(PREVIEWS/f'v67-{name}-menu.png'),full_page=False,animations='disabled')
            page.locator('.modal [data-action="close"]').click()
            page.keyboard.press('ArrowUp')
            page.wait_for_selector('.battle-shell')
            stage=page.locator('.battle-stage')
            assert stage.locator('.v60-stage-caption').count()==1,(name,'cinematic caption')
            assert stage.locator('.tactical-enemy').count()>=2,(name,'enemy stage')
            assert page.evaluate("document.body.dataset.lqScene==='battle'"),(name,'battle presentation')
            assert page.evaluate("window.LQCombatStudio?.version==='v62'"),(name,'living combat module')
            assert page.locator('.v62-actor-avatar').count()==1,(name,'drawn active ally avatar')
            assert page.evaluate("window.LQV63Atlas?.metrics().enemyFrames===288"),(name,'v63 atlas active')
            assert page.locator('.v63-enemy-canvas').count()>=2,(name,'new region enemy sprites visible')
            assert page.evaluate("window.LQV64Architecture?.styles?.length===8"),(name,'eight region architectures ready')
            assert page.evaluate("window.LQV64Performance?.version==='v64'"),(name,'hero animation studio ready')
            assert page.evaluate("window.LQV65SceneArt?.version==='v65'"),(name,'curated scene art ready')
            assert stage.locator('.v65-scene-scenery').count()==1,(name,'authored combat scene behind UI')
            assert page.evaluate("window.LQV66Creatures?.version==='v66'"),(name,'curated v66 creature atlas available')
            assert page.evaluate("window.LQV67Counterplay?.version==='v67'"),(name,'retaliation director available')
            assert stage.locator('.v63-enemy-canvas').count()>=2,(name,'v66 monsters drawn on combat cards')
            assert page.evaluate("getComputedStyle(document.querySelector('.battle-stage')).backgroundImage.includes('environments.webp')"),(name,'scenic background')
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4"),(name,'battle overflow')
            page.screenshot(path=str(PREVIEWS/f'v67-{name}-battle.png'),full_page=False,animations='disabled')
            page.locator('[data-action="confirmAction"]').click()
            assert page.evaluate("document.body.dataset.lqScene==='battle'"),(name,'combat continues after an action')
            assert page.locator('.battle-result-strip').count()==1,(name,'damage and focus report')
            if name=='desktop':
                page.emulate_media(reduced_motion='no-preference')
                page.locator('[data-action="confirmAction"]').click()
                page.wait_for_selector('.v62-vfx',timeout=2500)
                assert page.locator('.v62-vfx').count()==1,(name,'single live canvas animation')
                page.screenshot(path=str(PREVIEWS/'v67-desktop-action-vfx.png'),full_page=False)
            # Deterministic browser check for the presentational layer. This does
            # not invoke game.act and cannot modify real party HP.
            if name=='desktop':
                page.emulate_media(reduced_motion='no-preference')
            rendered=page.evaluate("""() => window.LQV67Counterplay.decorate(
                document.querySelector('.battle-shell'),
                {originId:'browser-visual-test',at:Date.now(),action:'attack',party:[
                    {id:0,name:'Hero',delta:-19,mpDelta:0},
                    {id:1,name:'Mage',delta:-13,mpDelta:0}
                ],enemies:[]},0
            )""")
            assert rendered,(name,'retaliation director attaches to real battle DOM')
            assert page.locator('.v67-counterplay-report').count()==1,(name,'confirmed HP losses displayed')
            assert page.locator('.v67-floating-damage').count()==2,(name,'affected party members highlighted')
            if name=='desktop':
                page.wait_for_selector('.v67-reaction-canvas',timeout=2500)
                page.screenshot(path=str(PREVIEWS/'v67-desktop-counterplay.png'),full_page=False)
            else:
                assert page.locator('.v67-reaction-canvas').count()==0,(name,'reduced-motion skips moving canvas')
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+4"),(name,'impact readout avoids overflow')
            assert not errors,(name,'javascript errors',errors)
            print('PASS v67',name,'world canvas, menu, cinematic combat, saved input, overflow, visual screenshots')
            context.close()
        browser.close()
finally:
    server.shutdown()
