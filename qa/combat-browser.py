"""Desktop + mobile Chromium UI QA for the tactical combat presentation. No network required."""
from pathlib import Path
import json,re,base64
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
scripts=re.findall(r'<script\s+src="([^"]+)"',(ROOT/'index.html').read_text())
css=(ROOT/'rpg.css').read_text()
for asset in ['environments','enemies','bosses','portraits']:
    data=base64.b64encode((ROOT/'assets'/'art'/f'{asset}.webp').read_bytes()).decode('ascii')
    css=css.replace(f"url('assets/art/{asset}.webp')",f'url(data:image/webp;base64,{data})')
base=json.loads((ROOT/'qa/frost-save-town.json').read_text())
base.update(region=0,place='dungeon',floor=0,x=5,y=12,complete=False,cleared=[],flags={},journal=[],visited=[0])
base['party'][0]['name']='Hero'
for name,viewport in [('desktop',{'width':1320,'height':990}),('mobile',{'width':390,'height':844})]:
    save=json.dumps(json.dumps(base))
    helper='<script>const SAVES={"lexicon-realms-v3-0":'+save+'};Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>SAVES[k]||null,setItem:(k,v)=>SAVES[k]=v}});</script>'
    html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="app"></div>'+helper
    html+=''.join('<script>'+(ROOT/s).read_text().replace('</script>','<\\/script>')+'</script>' for s in scripts)+'</body></html>'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
        page=browser.new_page(viewport=viewport,device_scale_factor=1, reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded',timeout=45000)
        page.locator('[data-action="load"][data-id="0"]').click(timeout=15000)
        page.keyboard.press('ArrowUp')
        page.wait_for_timeout(150)
        assert page.locator('.battle-shell').count()==1,(name,page.locator('body').inner_text()[:200])
        assert page.locator('.battle-brief').count()==1,name
        assert page.locator('.battle-turn-order .order-person').count()==4,name
        assert page.locator('.tactical-enemy').count()>=2,name
        assert page.locator('.battle-preview').count()==1,name
        assert page.locator('.battle-confirm [data-action="confirmAction"]').count()==1,name
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),(name,'overflow')
        pth=ROOT/'previews'/f'tactical-battle-{name}.png';pth.parent.mkdir(exist_ok=True)
        page.screenshot(path=str(pth),full_page=True,timeout=15000,animations='disabled')
        page.locator('[data-action="battleTips"]').click(timeout=15000)
        assert page.locator('.combat-help-grid section').count()==4,name
        page.locator('[data-action="close"]').first.click()
        page.locator('[data-action="confirmAction"]').click(timeout=15000)
        assert page.locator('.battle-result-strip').count()==1,name
        assert page.locator('.battle-result.damage').count()>=1,name
        assert page.locator('.battle-turn-order .order-person.current').inner_text().find('Mira')>=0,name
        assert not errors,(name,errors)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),name
        print('PASS',name,'battle scene, intent chips, walkthrough modal, confirm action, damage feed, no overflow/errors',pth)
        browser.close()
