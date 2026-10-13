"""Reuse browser context to inspect all eight styled town maps quickly."""
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
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mode,viewport,regions in [('desktop',{'width':1440,'height':960},[7]),('mobile',{'width':390,'height':844},[4,7])]:
  context=browser.new_context(viewport=viewport,is_mobile=(mode=='mobile'),has_touch=(mode=='mobile'))
  page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(content=css)
  page.evaluate('''()=>{window.__saves={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v;}}});}''')
  for f in ['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-regions-ii.js','rpg-engine.js','rpg-interiors.js','rpg-townsfolk.js','rpg-environment-art.js']:
   page.add_script_tag(content=(root/f).read_text())
  page.add_script_tag(content=ui)
  for region in regions:
   if page.locator('[data-action=menu]').count():
    page.locator('[data-action=menu]').first.click();page.locator('[data-action=title]').first.click()
   save=json.loads(json.dumps(fresh));save.update(place='town',region=region,x=12,y=10,gold=1000,cleared=list(range(region)))
   page.evaluate('''s=>{window.__saves['lexicon-realms-v3-0']=JSON.stringify(s)}''',save)
   # Re-render title to discover the newly imported save slot.
   page.reload() if False else None
   # Force title DOM rebuild via another available button event, if the stale title predates new save.
   if not page.locator('[data-action=load][data-id="0"]').count():
    page.locator('[data-action=help]').first.click()
    page.locator('[data-action=close]').first.click()
   page.locator('[data-action=load][data-id="0"]').first.click()
   page.wait_for_timeout(125)
   assert page.locator('#field').count()==1, f'missing canvas {mode}-{region}'
   assert page.locator('.focus-panel').count()==1, f'missing focus {mode}-{region}'
   assert not errors, f'errors {mode}-{region}: {errors}'
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'), f'horizontal overflow {mode}-{region}'
   page.screenshot(path=str(root/'previews'/f'environment-town-{region}-{mode}.png'),full_page=True)
   print('PASS',mode,region,'rendered, no errors/overflow',flush=True)
  page.close();context.close()
 browser.close()
