"""Synthetic Chromium local UI inspection (not a live Netlify test)."""
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
for name in ['party-sprites.png','world-sprites.png','townsfolk-sprites.png']:
 ui=ui.replace("'assets/art/"+name+"'",repr(asset('assets/art/'+name)))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mode,region,pos,viewport in [('desktop',0,(6,10),{'width':1440,'height':960}),('mobile',2,(8,12),{'width':390,'height':844})]:
  context=browser.new_context(viewport=viewport,is_mobile=(mode=='mobile'),has_touch=(mode=='mobile'))
  page=context.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  save=json.loads(json.dumps(fresh));save.update(place='town',region=region,x=pos[0],y=pos[1],gold=1000,cleared=list(range(region)))
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(content=css)
  page.evaluate('''s=>{window.__saves={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v;}}});}''',save)
  for f in ['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-engine.js','rpg-interiors.js','rpg-townsfolk.js']:
   page.add_script_tag(content=(root/f).read_text())
  page.add_script_tag(content=ui)
  page.locator('[data-action=load][data-id="0"]').first.click()
  page.wait_for_timeout(400)
  assert page.locator('#field').count()==1,'town map missing'
  assert page.locator('.focus-panel').count()==1,'focus panel missing'
  assert page.locator('.citizen-nearby').count()>0,'resident not near spawn'
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'),'town horizontal overflow'
  page.screenshot(path=str(root/'previews'/f'townlife-{mode}-town.png'),full_page=True)
  # Dialogue branches (no quests or saves altered).
  page.locator('.citizen-nearby').first.click()
  assert page.locator('.modal .citizen-chat').count()==1,'citizen conversation missing'
  first=page.locator('.citizen-chat-text p').first.inner_text()
  page.locator('[data-action=citizenTopic][data-topic="1"]').click()
  second=page.locator('.citizen-chat-text p').first.inner_text()
  assert first!=second,'conversational responses did not change'
  page.locator('[data-action=citizenTopic][data-topic="2"]').click()
  third=page.locator('.citizen-chat-text p').first.inner_text()
  assert third!=second,'rumor branch did not change'
  page.screenshot(path=str(root/'previews'/f'townlife-{mode}-dialogue.png'),full_page=True)
  page.locator('.modal [data-action=close]').first.click()
  assert page.locator('#field').count()==1,'dialogue did not return to town'
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'),'conversation overflow'
  print('PASS',mode,'town view, 3 dialogue topics, no errors/overflow')
  page.close();context.close()
 browser.close()
