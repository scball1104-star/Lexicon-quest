"""Synthetic Chromium visual + interaction check of real UI and Canvas interiors.
Not a hosted Netlify deployment test.
"""
from pathlib import Path
import re,base64,json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
preview=root/'previews';preview.mkdir(exist_ok=True)
base=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./rpg-engine.js').fresh()))"],cwd=root,text=True))
cache={}
def asset(name):
 if name not in cache:
  filename=root/name
  ext=filename.suffix.lower();typ='image/webp' if ext=='.webp' else 'image/png'
  cache[name]=f'data:{typ};base64,'+base64.b64encode(filename.read_bytes()).decode()
 return cache[name]
css=(root/'rpg.css').read_text()
css=re.sub(r"url\(['\"]?(assets/art/[^)'\"]+)['\"]?\)",'none',css)
ui=(root/'rpg-ui.js').read_text().replace("'assets/art/party-sprites.png'","''").replace("'assets/art/world-sprites.png'","''")
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for kind,viewport in [('desktop',{'width':1420,'height':1050}),('mobile',{'width':390,'height':844})]:
  context=browser.new_context(viewport=viewport,is_mobile=(kind=='mobile'),has_touch=(kind=='mobile'))
  for region,service in ([(0,'inn'),(1,'shop')] if kind=='desktop' else [(2,'forge'),(3,'inn')]):
   save=json.loads(json.dumps(base));save['cleared']=list(range(region));save['region']=region;save['place']='town';save['gold']=1000
   spawn={'inn':(4,7),'shop':(19,6),'forge':(5,15)}
   if region==3:spawn['inn']=(5,9)
   save['x'],save['y']=spawn[service]
   page=context.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
   page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
   page.add_style_tag(content=css)
   page.evaluate('''s=>{window.__saves={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v;}}});}''',save)
   for f in ['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-engine.js','rpg-interiors.js']:
    page.add_script_tag(content=(root/f).read_text())
   page.add_script_tag(content=ui)
   page.locator('[data-action=load][data-id="0"]').first.click()
   # Open actual service from the town map; more reliable than selecting arbitrary Nearby item.
   service_btn=page.locator(f'[data-action=use][data-id="{region}-0-{service}"]')
   assert service_btn.count()>0, f'Not near {region}-{service} in town'
   service_btn.first.click()
   assert page.locator('#interiorField').count()==1, 'interior not loaded'
   assert page.locator('.interior-quicklist button').count()==3, 'hotspot list absent'
   assert not errors, errors
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'), f'overflow {kind} {region} {service}'
   page.wait_for_timeout(280)
   page.screenshot(path=str(preview/f'interior-{region}-{service}-{kind}.png'),full_page=True)
   # Auto-walk through the room; should open the appropriate service interface.
   page.locator('[data-action="interiorGoto"][data-x="9"][data-y="5"]').first.click()
   page.wait_for_timeout(950)
   assert page.locator('.modal').count()==1, f'counter did not open {kind} {region} {service}'
   assert (page.locator('[data-action=buy]').count()>0 if service!='forge' else page.locator('[data-action=upgrade]').count()>0),'service action missing'
   assert not errors, errors
   page.locator('[data-action=close]').first.click()
   assert page.locator('#interiorField').count()==1,'modal close exited the room unexpectedly'
   page.locator('[data-action=interiorExit]').first.click()
   assert page.locator('#field').count()==1, 'exit failed to restore town'
   assert not errors,errors
   print(f'PASS {kind} region {region+1} {service}: room, visual, service, town return, no runtime errors/overflow')
   page.close()
  context.close()
 browser.close()
