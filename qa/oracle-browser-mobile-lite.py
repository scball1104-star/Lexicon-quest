from pathlib import Path
import json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
(root/'previews').mkdir(exist_ok=True)
fresh=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./rpg-engine.js').fresh()))"],cwd=root,text=True))
scripts=['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-chapter5.js','rpg-regions-ii.js','rpg-engine.js','rpg-interiors.js','rpg-townsfolk.js','rpg-environment-art.js','rpg-ui.js']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 cases=[('mobile','dungeon',1,390,844)]
 for mode,place,f,w,h in cases:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=(mode=='mobile'),has_touch=(mode=='mobile'))
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  save=json.loads(json.dumps(fresh));save.update(place=place,region=4,floor=f,x=12,y=10,gold=1200,cleared=[0,1,2,3],music=False)
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(content=(root/'rpg.css').read_text())
  page.evaluate('''s=>{window.__saves={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v}}});}''',save)
  for fn in scripts:page.add_script_tag(content=(root/fn).read_text())
  page.locator('[data-action=load][data-id="0"]').first.click(timeout=15000)
  page.wait_for_timeout(250)
  assert page.locator('#field').count()==1,(mode,place,f,'map missing')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+8'),(mode,place,f,'horizontal overflow')
  assert not errors,(mode,place,f,errors)
  path=root/'previews'/f'oracle-{mode}-{place}-floor{f}.png';page.screenshot(path=str(path),full_page=False,timeout=15000)
  print('PASS',mode,place,f,'no JS errors or overflow',flush=True)
  if place=='dungeon' and f==2 and mode=='desktop':
   page.locator('[data-action=title]').count() if False else None
  page.close();ctx.close()
 browser.close()
