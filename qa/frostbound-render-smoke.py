"""Visual smoke test using an in-memory HTML page; not a hosted-device test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
ROOT=Path(__file__).resolve().parent.parent
index=(ROOT/'index.html').read_text()
scripts=re.findall(r'<script\s+src="([^"]+)"',index)
css=(ROOT/'rpg.css').read_text()
print('Scripts loaded:',scripts)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for kind,viewport in [('town',{'width':1380,'height':1020}),('dungeon',{'width':390,'height':844})]:
  save=json.loads((ROOT/'qa'/f'frost-save-{kind}.json').read_text())
  before='<script>const SAVES={"lexicon-realms-v3-0":'+json.dumps(json.dumps(save))+'};Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>SAVES[k]||null,setItem:(k,v)=>SAVES[k]=v}});</script>'
  html='<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style></head><body><div id="app"></div>'+before
  html+=''.join('<script>'+ (ROOT/script).read_text().replace('</script>','<\\/script>')+'</script>' for script in scripts)
  html+='</body></html>'
  context=browser.new_context(viewport=viewport)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded',timeout=20000)
  page.locator('[data-action="load"][data-id="0"]').click(timeout=8000)
  page.wait_for_timeout(200)
  assert page.locator('#field').count()==1,kind
  assert (('Palehaven' in page.locator('.location').inner_text()) if kind=='town' else ('Vanishing' in page.locator('.location').inner_text())),kind
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),kind
  out=ROOT/'previews'/f'frostbound-{kind}-smoke.png';out.parent.mkdir(exist_ok=True)
  page.locator('.shell').screenshot(path=str(out),timeout=12000)
  print('PASS',kind,'screenshot',out)
  context.close()
 browser.close()
