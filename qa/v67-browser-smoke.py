"""v67 Chromium real-browser acceptance suite. Never modifies Netlify production."""
import copy, hashlib, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
PREVIEWS=ROOT/'previews'
PREVIEWS.mkdir(exist_ok=True)
BASE=json.loads((ROOT/'qa'/'frost-save-town.json').read_text())
checks=0
def check(value,msg):
 global checks
 assert value,msg
 checks+=1
class Quiet(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(server.server_port)+'/index.html'
def context_for(browser,view,mobile,place):
 s=copy.deepcopy(BASE)
 s.update(name='Hero',region=0,place=place,floor=0,complete=False,cleared=[],flags={},journal=[],visited=[0],music=False)
 s['party'][0]['name']='Hero'
 if place=='town':s.update(x=12,y=15)
 elif place=='world':s.update(x=12,y=13,world={'x':12,'y':13})
 else:s.update(x=5,y=12)
 ctx=browser.new_context(viewport=view,is_mobile=mobile,has_touch=mobile,device_scale_factor=1,reduced_motion='reduce')
 ctx.add_init_script("localStorage.setItem('lexicon-realms-v3-0',"+json.dumps(json.dumps(s))+");")
 page=ctx.new_page()
 page.set_default_timeout(18000)
 errors=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.goto(url,wait_until='domcontentloaded',timeout=60000)
 page.locator('[data-action="load"][data-id="0"]').click()
 page.wait_for_selector('canvas#field')
 return ctx,page,errors
def snapshot(page,label):
 file=PREVIEWS/('v67-'+label+'.png')
 page.screenshot(path=str(file),full_page=False,animations='disabled')
 check(file.stat().st_size>12000,'nonblank screenshot '+label)
 return hashlib.sha256(file.read_bytes()).hexdigest()[:12]
def pixels(page):
 return page.evaluate("""() => {
 const c=document.querySelector('canvas#field'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const colors=new Set();let opaque=0,green=0;
 for(let y=0;y<c.height;y+=13)for(let x=0;x<c.width;x+=13){
  const i=(y*c.width+x)*4,r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
  colors.add([r>>3,g>>3,b>>3].join('/'));if(a>200)opaque++;
  if(g>r*1.08&&g>b*.95)green++;
 }
 return {colors:colors.size,opaque,green};
 }""")
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for mode,view,mobile in [('desktop',{'width':1440,'height':960},False),('mobile',{'width':390,'height':844},True)]:
   context,page,errors=context_for(browser,view,mobile,'town')
   check(page.evaluate("window.LQV67Willowmere?.version==='v67'"),'v67 module available '+mode)
   check(page.evaluate("document.body.dataset.lqScene==='field'"),'field scene '+mode)
   check(page.locator('.v61-wayfinder').count()==1,'quest HUD '+mode)
   check(page.locator('[data-action="interact"]').count()>=1,'interaction buttons '+mode)
   check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),'town viewport '+mode)
   sample=pixels(page)
   check(sample['colors']>30 and sample['opaque']>1500,'visible nonblank town art '+mode+' '+str(sample))
   page.evaluate("""() => {window.__v67Tiles=0;const paint=window.LQV67Willowmere.tile;
    window.LQV67Willowmere.tile=(...args)=>{window.__v67Tiles++;return paint(...args);};}""")
   page.keyboard.press('ArrowLeft')
   check(page.evaluate('window.__v67Tiles>0'),'v67 renders actual gameplay terrain '+mode)
   shot=snapshot(page,mode+'-willowmere')
   page.locator('header [data-action="menu"]').click()
   page.wait_for_selector('.v60-menu-group')
   check(page.locator('.v60-menu-group').count()==3,'organized field menu '+mode)
   check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),'menu viewport '+mode)
   snapshot(page,mode+'-menu')
   page.locator('.modal [data-action="close"]').click()
   check(not errors,'no town/menu runtime exceptions '+mode+str(errors))
   print('PASS',mode,'Willowmere pixels',sample,'screenshot sha',shot)
   context.close()
   context,page,errors=context_for(browser,view,mobile,'world')
   sample=pixels(page)
   check(sample['colors']>25 and sample['opaque']>1500,'visible overworld '+mode+str(sample))
   check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),'overworld viewport '+mode)
   snapshot(page,mode+'-overworld')
   check(not errors,'overworld runtime '+mode+str(errors))
   context.close()
   context,page,errors=context_for(browser,view,mobile,'dungeon')
   page.keyboard.press('ArrowUp')
   page.wait_for_selector('.battle-shell',timeout=12000)
   check(page.locator('.tactical-enemy').count()>=2,'combat foes '+mode)
   check(page.locator('.v65-scene-scenery').count()==1,'battle scenery '+mode)
   check(page.locator('.v63-enemy-canvas').count()>=2,'drawn enemies '+mode)
   check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),'combat viewport '+mode)
   snapshot(page,mode+'-battle')
   page.locator('[data-action="confirmAction"]').click()
   check(page.locator('.battle-result-strip').count()==1,'combat action feedback '+mode)
   check(not errors,'combat runtime '+mode+str(errors))
   print('PASS',mode,'overworld and combat screens')
   context.close()
  browser.close()
finally:
 server.shutdown()
print('PASS v67',checks,'browser assertions, 8 screenshot captures')
