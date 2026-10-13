"""Isolated Chromium UI smoke check. No network or asset server is needed."""
from pathlib import Path
import json,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
(root/'previews').mkdir(exist_ok=True)
fresh=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./rpg-engine.js').fresh()))"],cwd=root,text=True))
scripts=['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-chapter5.js','rpg-chapter6.js','rpg-regions-ii.js','rpg-engine.js','rpg-interiors.js','rpg-townsfolk.js','rpg-environment-art.js','rpg-ui.js']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for tag,place,f,x,y,w,h in [('zephyr-town-desktop','town',0,12,15,1370,880),('orrery-desktop','dungeon',1,12,10,1370,880),('storm-mobile','dungeon',2,12,10,390,844)]:
  context=browser.new_context(viewport={'width':w,'height':h},is_mobile=w<500,has_touch=w<500)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  save=json.loads(json.dumps(fresh));save.update(place=place,region=5,floor=f,x=x,y=y,gold=1000,cleared=[0,1,2,3,4],music=False)
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(content=(root/'rpg.css').read_text())
  page.evaluate('''s=>{const cache={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>cache[k]||null,setItem:(k,v)=>{cache[k]=v}}});}''',save)
  for script in scripts: page.add_script_tag(content=(root/script).read_text())
  page.locator('[data-action=load][data-id="0"]').first.click(timeout=15000)
  page.wait_for_timeout(200)
  assert page.locator('#field').count()==1,(tag,'field missing')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+8'),(tag,'horizontal overflow')
  assert not errors,(tag,errors)
  if place=='town':
   assert 'Zephyr' in page.locator('body').inner_text(),(tag,'town label')
  else:
   assert 'Storm' in page.locator('body').inner_text() or 'Orrery' in page.locator('body').inner_text(),(tag,'dungeon label')
  page.screenshot(path=str(root/'previews'/f'{tag}.png'),full_page=False,timeout=15000)
  print('PASS',tag,'canvas rendered, no JS errors or horizontal overflow',flush=True)
  page.close();context.close()
 browser.close()
