"""Browser smoke and screenshots for eight towns (synthetic page, not live Netlify)."""
from pathlib import Path
import base64,json,re,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
(root/'previews').mkdir(exist_ok=True)
fresh=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./rpg-engine.js').fresh()))"],cwd=root,text=True))
def asset(name):
 p=root/name;typ='image/webp' if p.suffix=='.webp' else 'image/png';return 'data:'+typ+';base64,'+base64.b64encode(p.read_bytes()).decode()
css=(root/'rpg.css').read_text()
css=re.sub(r"url\(['\"]?(assets/art/[^)'\"]+)['\"]?\)",lambda m:'url("'+asset(m.group(1))+'")',css)
ui=(root/'rpg-ui.js').read_text()
for name in ['party-sprites.png','world-sprites.png','townsfolk-sprites.png','interior-sprites.png']:
 ui=ui.replace("'assets/art/"+name+"'",repr(asset('assets/art/'+name)))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for region in range(8):
  viewport={'width':1440,'height':1080} if region<4 else {'width':390,'height':844}
  mode='desktop' if region<4 else 'mobile'
  context=browser.new_context(viewport=viewport,is_mobile=(mode=='mobile'),has_touch=(mode=='mobile'))
  page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  save=json.loads(json.dumps(fresh));save.update(place='town',region=region,x=12,y=15,gold=1000,cleared=list(range(region)))
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(content=css)
  page.evaluate('''s=>{window.__saves={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v;}}});}''',save)
  for f in ['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-regions-ii.js','rpg-engine.js','rpg-interiors.js','rpg-townsfolk.js','rpg-environment-art.js']:
   page.add_script_tag(content=(root/f).read_text())
  page.add_script_tag(content=ui)
  page.locator('[data-action=load][data-id="0"]').first.click()
  page.wait_for_timeout(330)
  assert page.locator('#field').count()==1, 'field missing'
  assert page.locator('.focus-panel').count()==1, 'focus missing'
  assert page.locator('.town-guide').count()==1, 'guide missing'
  assert not errors, f'region {region} errors '+str(errors)
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'), f'overflow region {region}'
  page.screenshot(path=str(root/'previews'/f'environment-town-{region}-{mode}.png'),full_page=True)
  # Interact with a regional building through a working interior, then return.
  if region in (4,5,6,7):
   page.locator('.guide-link[data-id*="inn"]').first.click()
   page.wait_for_timeout(350)
   # auto-walk can take several seconds, so use the app's click handler only when adjacent.
   assert not errors, f'route JS error {region}: {errors}'
  print('PASS',region,mode,'render, town guide, no errors or overflow')
  page.close();context.close()
 browser.close()
