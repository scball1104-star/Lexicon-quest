"""v65 extended visual audit: 8 regions x town/dungeon x desktop/mobile.
Runs against an ephemeral local webserver, never Netlify production.
Captures evidence and checks actual UI, accessible objective, no runtime
errors, screen overflow, content and rendering availability.
"""
import json,pathlib,http.server,threading
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
PREVIEWS=ROOT/'previews'
PREVIEWS.mkdir(exist_ok=True)
BASE=json.loads((ROOT/'qa'/'frost-save-town.json').read_text())
class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/index.html'
checks=0
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for region in range(8):
   for place in ('town','dungeon'):
    for mode,viewport,mobile in [('desktop',{'width':1440,'height':960},False),('mobile',{'width':390,'height':844},True)]:
     state=json.loads(json.dumps(BASE))
     state.update(region=region,place=place,floor=0,x=12 if place=='town' else 3,y=15 if place=='town' else 18,complete=False,cleared=list(range(region)),flags={},journal=[],visited=list(range(region+1)),music=False)
     context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,device_scale_factor=1,reduced_motion='reduce')
     context.add_init_script("localStorage.setItem('lexicon-realms-v3-0', "+json.dumps(json.dumps(state))+");")
     page=context.new_page()
     page.set_default_timeout(10000)
     errors=[]
     page.on('pageerror',lambda exc:errors.append(str(exc)))
     try:
      page.goto(URL,wait_until='domcontentloaded',timeout=30000)
      page.locator('[data-action="load"][data-id="0"]').click()
      page.wait_for_selector('canvas#field')
      assert page.evaluate("window.LQV65SceneArt?.regions?.length===8"),(region,place,mode,'scene module')
      assert page.locator('.v61-wayfinder').count()==1,(region,place,mode,'objective')
      assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),(region,place,mode,'horizontal overflow')
      assert page.locator('.location h2').inner_text().strip(),(region,place,mode,'location heading')
      assert not errors,(region,place,mode,errors)
      if region in (0,3,6,7):
       page.screenshot(path=str(PREVIEWS/f'v65-r{region}-{place}-{mode}.png'),full_page=False,animations='disabled')
      checks+=1
     finally:
      page.close();context.close()
  browser.close()
finally:
 server.shutdown()
print(f'PASS v65: {checks} local Chromium campaign views (8 regions x 2 scenes x 2 viewports), screenshot samples and no runtime overflow')
