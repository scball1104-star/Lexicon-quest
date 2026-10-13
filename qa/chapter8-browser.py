"""In-memory Chromium visual and final-choice smoke test (not hosted iPhone Safari)."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
scripts=re.findall(r'<script\s+src="([^"]+)"',(ROOT/'index.html').read_text())
css=(ROOT/'rpg.css').read_text()
base=json.loads((ROOT/'qa/frost-save-town.json').read_text())
base.update(region=7,place='town',floor=0,x=12,y=15,complete=False,cleared=list(range(7)),flags={},journal=[],visited=list(range(8)))
for i,(name,screen,region,floor,viewport) in enumerate([
 ('town','town',7,0,{'width':1350,'height':1050}),
 ('library-floor1','dungeon',7,0,{'width':1350,'height':1050}),
 ('library-floor2','dungeon',7,1,{'width':390,'height':844}),
 ('library-floor3','dungeon',7,2,{'width':390,'height':844}),
 ('choice','dungeon',7,2,{'width':390,'height':844})]):
 save=json.loads(json.dumps(base));save['place']=screen;save['floor']=floor
 if screen=='dungeon':save['x']=3;save['y']=18
 if name=='choice':save['complete']=True;save['cleared']=list(range(8));save['flags']={'lq:first:keeperDefeated':True}
 storage=json.dumps(json.dumps(save))
 helper="<script>const SAVES={'lexicon-realms-v3-0':"+storage+"};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>SAVES[k]||null,setItem:(k,v)=>SAVES[k]=v}});</script>"
 html='<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style></head><body><div id="app"></div>'+helper
 html+=''.join('<script>'+(ROOT/script).read_text().replace('</script>','<\\/script>')+'</script>' for script in scripts)+'</body></html>'
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  page=browser.new_page(viewport=viewport,device_scale_factor=1)
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.set_content(html,wait_until='domcontentloaded',timeout=30000)
  page.locator('[data-action="load"][data-id="0"]').click(timeout=8000)
  page.wait_for_timeout(130)
  if name=='choice':
   page.locator('[data-action="menu"]').first.click(timeout=8000)
   assert page.locator('[data-action="finaleReopen"]').count()==1,'Final decision inaccessible after dismissed'
   page.locator('[data-action="finaleReopen"]').click()
   assert page.locator('[data-action="finaleChoice"]').count()==2,'Missing ending buttons'
   page.locator('[data-action="finaleChoice"][data-id="choose"]').click()
   assert 'Right to Choose' in page.locator('.modal-head').inner_text(),'Epilogue not shown'
  else:
   assert page.locator('#field').count()==1,name
   assert 'Scriptorium' in page.locator('.location').inner_text() if name=='town' else 'First Library' in page.locator('.scene-flavor').inner_text() or 'Catalog' in page.locator('.location').inner_text() or 'Palimpsest' in page.locator('.location').inner_text() or 'Unwritten' in page.locator('.location').inner_text(),name
  assert not errors,(name,errors)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),name
  out=ROOT/'previews'/f'first-library-{name}.png';out.parent.mkdir(exist_ok=True)
  (page.locator('.modal') if name=='choice' else page.locator('.shell')).screenshot(path=str(out),timeout=14000)
  print('PASS',name,'=>',out)
  browser.close()
