"""Synthetic Chromium render of the real UI with inlined release assets.
Host navigation is administratively blocked in this environment, so this is NOT a hosted-site smoke test.
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
  ext=filename.suffix.lower()
  typ='image/webp' if ext=='.webp' else 'image/png'
  cache[name]=f'data:{typ};base64,'+base64.b64encode(filename.read_bytes()).decode()
 return cache[name]
css=(root/'rpg.css').read_text()
css=re.sub(r"url\(['\"]?(assets/art/[^)'\"]+)['\"]?\)",lambda m:'url("'+asset(m.group(1))+'")',css)
ui=(root/'rpg-ui.js').read_text().replace("'assets/art/party-sprites.png'", "'"+asset('assets/art/party-sprites.png')+"'").replace("'assets/art/world-sprites.png'", "'"+asset('assets/art/world-sprites.png')+"'")
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for kind,viewport in [('desktop',{'width':1380,'height':900}),('mobile',{'width':390,'height':844})]:
  context=browser.new_context(viewport=viewport,is_mobile=(kind=='mobile'),has_touch=(kind=='mobile'))
  for scene in ['town','causeway','boss']:
   page=context.new_page();errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
   save=json.loads(json.dumps(base));save['cleared']=[0,1,2];save['region']=3;save['gold']=1100;save['party'][0]['level']=9
   save['place']='town' if scene=='town' else 'dungeon';save['floor']=2 if scene=='boss' else 0
   save['x'],save['y']=((12,15) if scene=='town' else (24,4) if scene=='boss' else (12,11))
   save['flags'].update({'talk3':True,'key3':True,'3-2-principles':True,'lq:vale:bond':True,'lq:vale:plan':'records'})
   page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
   page.add_style_tag(content=css)
   page.evaluate('''s=>{window.__saves={'lexicon-realms-v3-0':JSON.stringify(s)};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__saves[k]||null,setItem:(k,v)=>{window.__saves[k]=v;}}});}''',save)
   for f in ['rpg-data.js','rpg-chapter1.js','rpg-chapter2.js','rpg-chapter3.js','rpg-chapter4.js','rpg-engine.js','rpg-interiors.js']:
    page.add_script_tag(content=(root/f).read_text())
   page.add_script_tag(content=ui)
   page.locator('[data-action=load][data-id="0"]').first.click()
   if scene=='boss':
    page.keyboard.press('ArrowUp')
    assert 'Paper Regent' in page.locator('body').inner_text(), 'not in regent battle'
   else:
    txt=page.locator('body').inner_text()
    assert ('Valewyn' if scene=='town' else 'Tidegate Causeway') in txt
    assert page.locator('.quest-meter').count()>0
   page.wait_for_timeout(220)
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+8'),f'overflow {kind} {scene}'
   assert not errors, errors
   page.screenshot(path=str(preview/f'valewyn-{scene}-{kind}.png'),full_page=True)
   print(f'PASS {kind} {scene}: visual render, no runtime errors or horizontal overflow')
   page.close()
  context.close()
 browser.close()
