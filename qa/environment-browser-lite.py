"""Synthetic Chromium QA focused on the final town and mobile viewport. Asset images omitted for speed."""
from pathlib import Path
import json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
fresh=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./rpg-engine.js').fresh()))"],cwd=root,text=True))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for r,mode,viewport in [(7,'desktop',{'width':1440,'height':960}),(4,'mobile',{'width':390,'height':844}),(7,'mobile',{'width':390,'height':844})]:
  context=browser.new_context(viewport=viewport,is_mobile=mode=='mobile',has_touch=mode=='mobile')
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  save=json.loads(json.dumps(fresh));save.update(place='town',region=r,x=12,y=10,gold=400,cleared=list(range(r)))
  page.set_content('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(content=(root/'rpg.css').read_text())
  page.evaluate('''s=>{window.__saves={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v}}});}''',save)
  for fn in ['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-regions-ii.js','rpg-engine.js','rpg-interiors.js','rpg-townsfolk.js','rpg-environment-art.js','rpg-ui.js']:
   page.add_script_tag(content=(root/fn).read_text())
  page.locator('[data-action=load][data-id="0"]').first.click(timeout=10000)
  page.wait_for_timeout(250)
  assert page.locator('#field').count()==1,f'map {r}'
  assert not errors, f'JS errors {r}: {errors}'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'),f'overflow region {r} on {mode}'
  path=root/'previews'/f'environment-town-{r}-{mode}-lite.png';page.screenshot(path=str(path),full_page=False,timeout=15000)
  print('PASS',r,mode,'no JS errors/overflow',flush=True)
  page.close();context.close()
 browser.close()
