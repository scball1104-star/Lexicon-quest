/* Lexicon Quest v60 — presentation director.
 * Adds interface structure, scene identification and transient motion to the
 * existing eight-chapter RPG. No save-schema, balance, combat or input changes.
 */
(function(root){
'use strict';
const doc=root.document;
if(!doc)return;
const REALMS=[
 {name:'Willowmere',aliases:['Willowmere','Rootbound Archive'],accent:'#80c8a7'},
 {name:'Nameless Hollow',aliases:['Nameless Hollow','Hollowmere','Court of Mirrors','Silverglass'],accent:'#b8c3e8'},
 {name:'Emberpeak',aliases:['Emberpeak','Forge of Ash'],accent:'#eeb282'},
 {name:'Valewyn',aliases:['Valewyn','Sunken Keep'],accent:'#8bd5d2'},
 {name:'Whispering Desert',aliases:['Whispering Desert','Oracle Labyrinth','Sunpath'],accent:'#e7c78a'},
 {name:'Skybound Isles',aliases:['Skybound Isles','Storm Observatory','Aeris'],accent:'#aacded'},
 {name:'Hollow North',aliases:['Hollow North','Frostbound Vault'],accent:'#b5e5ef'},
 {name:'First Library',aliases:['First Library'],accent:'#d4b8e8'}
];
const state={screen:'none',battleId:'',report:'',turn:'',updates:0,menuUpdates:0};
const motionQuery=typeof root.matchMedia==='function'?root.matchMedia('(prefers-reduced-motion: reduce)'):null;
const reduced=()=>!!motionQuery?.matches;
function realmFromText(text){
 const name=String(text||'').toLowerCase();
 for(let i=0;i<REALMS.length;i++)if(REALMS[i].aliases.some(alias=>name.includes(alias.toLowerCase())))return i;
 return 0;
}
function sceneOf(app){
 if(app.querySelector('.battle-shell'))return 'battle';
 if(app.querySelector('.interior-shell'))return 'interior';
 if(app.querySelector('.shell'))return 'field';
 if(app.querySelector('.titlepage'))return 'title';
 return 'unknown';
}
function realmOf(app,scene){
 if(scene==='battle'){
  const classes=app.querySelector('.battle-stage')?.className||'';
  const found=classes.match(/(?:^|\s)realm-(\d+)(?:\s|$)/);
  if(found)return Math.max(0,Math.min(7,Number(found[1])));
  return realmFromText(app.querySelector('.battle-heading-side span')?.textContent);
 }
 return realmFromText([
  app.querySelector('.location h2')?.textContent,
  app.querySelector('.mapbadge')?.textContent,
  app.querySelector('.interior-heading .eyebrow')?.textContent
 ].join(' '));
}
function battleSignature(app){
 const region=app.querySelector('.battle-heading-side span')?.textContent||'';
 const actors=Array.from(app.querySelectorAll('.battle-stage .enemy-name')).map(n=>n.textContent).join('|');
 const type=(app.querySelector('.battle-heading .eyebrow')?.textContent||'').replace(/Round\s+\d+(?:\s+·\s+Phase\s+\d+)?/i,'').trim();
 return region+'|'+type+'|'+actors;
}
function classifyReport(report){
 const text=String(report||'');
 return /(\+\d+\s+HP|healed|restore)/i.test(text)&&!/(−\d+\s+HP|damage)/i.test(text)?'heal':'damage';
}
function applyBattle(app,index){
 const stage=app.querySelector('.battle-stage');
 if(!stage)return;
 const id=battleSignature(app),report=app.querySelector('.battle-result-strip')?.textContent?.trim()||'';
 const turn=app.querySelector('.battle-heading h2')?.textContent||'';
 const entering=state.screen!=='battle'||state.battleId!==id;
 const boss=!!stage.querySelector('.enemy-art.boss');
 stage.classList.toggle('v60-boss',boss);
 stage.setAttribute('role','group');
 stage.setAttribute('aria-label',REALMS[index].name+' enemy targets');
 if(!stage.querySelector('.v60-stage-caption')){
  const caption=doc.createElement('span');
  caption.className='v60-stage-caption';
  caption.textContent=REALMS[index].name+' · '+(boss?'Guardian arena':'Encounter');
  caption.setAttribute('aria-hidden','true');
  stage.appendChild(caption);
 }
 if(!reduced()){
  if(entering)stage.classList.add('v60-stage-enter');
  else if(report&&report!==state.report){
   stage.classList.add(classifyReport(report)==='heal'?'v60-stage-heal':'v60-stage-impact');
   const flash=doc.createElement('span');
   flash.className='v60-impact-glint';
   flash.setAttribute('aria-hidden','true');
   stage.appendChild(flash);
  }
 }
 if(boss&&entering){
  const eyebrow=app.querySelector('.battle-heading .eyebrow');
  if(eyebrow)eyebrow.classList.add('v60-guardian-label');
 }
 state.battleId=id;
 state.report=report;
 state.turn=turn;
 state.updates++;
}
const MENU_GROUPS=[
 {name:'Party & progression',description:'Strengthen the three heroes',actions:['equipment','relics','loot','codex']},
 {name:'Journey',description:'Track your quest and explore',actions:['chapterOne','journal','atlas','recoverField']},
 {name:'System',description:'Save, guidance, and safe travel',actions:['transfer','help','reset','townRecall','title','finaleReopen']}
];
function decorateMenu(app){
 const modal=app.querySelector('.modal[role="dialog"]');
 if(!modal||modal.dataset.v60Menu==='done')return;
 const title=modal.querySelector('.modal-head h2')?.textContent?.trim()||'';
 if(title!=='Field menu')return;
 const cards=modal.querySelector('.cards');
 if(!cards)return;
 const buttons=Array.from(cards.querySelectorAll(':scope > button[data-action]'));
 if(!buttons.length)return;
 cards.classList.add('v60-menu-grid');
 for(const group of MENU_GROUPS){
  const picked=buttons.filter(b=>group.actions.includes(b.dataset.action));
  if(!picked.length)continue;
  const section=doc.createElement('section');
  section.className='v60-menu-group';
  const heading=doc.createElement('div');
  heading.className='v60-menu-heading';
  const h3=doc.createElement('h3');
  h3.textContent=group.name;
  const small=doc.createElement('small');
  small.textContent=group.description;
  heading.append(h3,small);
  const grid=doc.createElement('div');
  grid.className='v60-menu-buttons';
  picked.forEach(b=>grid.appendChild(b));
  section.append(heading,grid);
  cards.appendChild(section);
 }
 // Future actions remain accessible rather than silently disappearing.
 const rest=Array.from(cards.children).filter(b=>b.matches?.('button'));
 if(rest.length){
  const section=doc.createElement('section');
  section.className='v60-menu-group';
  const heading=doc.createElement('h3');heading.textContent='Other';
  section.appendChild(heading);
  const grid=doc.createElement('div');grid.className='v60-menu-buttons';
  rest.forEach(b=>grid.appendChild(b));
  section.appendChild(grid);cards.appendChild(section);
 }
 modal.dataset.v60Menu='done';
 state.menuUpdates++;
}
function decorate(){
 const app=doc.getElementById('app');
 if(!app)return;
 const scene=sceneOf(app),index=realmOf(app,scene);
 doc.body.dataset.lqScene=scene;
 doc.body.dataset.lqRealm=String(index);
 doc.body.style.setProperty('--v60-accent',REALMS[index].accent);
 doc.body.style.setProperty('--v60-scene-x',index%2?'100%':'0%');
 doc.body.style.setProperty('--v60-scene-y',(Math.floor(index/2)*100/3)+'%');
 decorateMenu(app);
 if(scene==='battle')applyBattle(app,index);
 else{state.screen=scene;state.battleId='';state.report='';state.turn='';}
 state.screen=scene;
}
function mount(){
 const app=doc.getElementById('app');
 if(!app)return false;
 decorate();
 if(typeof root.MutationObserver==='function'){
  const observer=new root.MutationObserver(records=>{
   // Only root child changes are observed. Decorator-created descendants
   // do not retrigger our observer and cannot cause an infinite loop.
   if(records.some(r=>r.type==='childList'))decorate();
  });
  observer.observe(app,{childList:true,subtree:false});
 }
 return true;
}
const api=Object.freeze({version:'v60',realms:REALMS.map(r=>r.name),realmFromText,sceneOf,realmOf,classifyReport,decorate,mount});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV60Presentation=api;
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
