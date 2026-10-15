/* v60 Option A regression tests — presentation behavior, menu integrity,
 * realm themes and static deployment integration. No browser dependency.
 */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let passed=0;
function check(value,label){assert.ok(value,label);passed++;}
function element(tag='div',action=''){
 const item={
  tagName:tag.toUpperCase(),
  dataset:action?{action}:{},
  children:[],
  parentNode:null,
  textContent:'',
  className:'',
  classes:new Set(),
  attributes:{},
  classList:{
   add(x){item.classes.add(x)},
   toggle(x,on){if(on)item.classes.add(x);else item.classes.delete(x);}
  },
  setAttribute(key,value){item.attributes[key]=value},
  appendChild(child){
   if(child.parentNode){const previous=child.parentNode.children;const at=previous.indexOf(child);if(at>=0)previous.splice(at,1);}
   item.children.push(child);child.parentNode=item;return child;
  },
  append(...nodes){for(const node of nodes)item.appendChild(node)},
  matches(selector){return selector==='button'&&tag==='button';}
 };
 return item;
}
const doc={
 readyState:'loading',
 addEventListener(){},
 createElement:tag=>element(tag),
 body:{dataset:{},style:{props:{},setProperty(key,value){this.props[key]=value}}},
 getElementById(){return currentApp}
};
let currentApp=null;
const sandbox={document:doc,matchMedia:()=>({matches:false}),module:{exports:{}},MutationObserver:function(){},console};
vm.runInNewContext(read('v60-premium.js'),sandbox,{filename:'v60-premium.js'});
const v60=sandbox.module.exports;
check(v60.version==='v60','v60 presentation module exports a version');
check(v60.realms.length===8,'all eight realms are named');
check(new Set(Array.from(v60.realms)).size===8,'realm names are unique');
check(v60.realmFromText('Rootbound Archive')===0,'chapter 1 dungeon');
check(v60.realmFromText('Court of Mirrors')===1,'chapter 2 dungeon');
check(v60.realmFromText('Forge of Ash')===2,'chapter 3 dungeon');
check(v60.realmFromText('Sunken Keep')===3,'chapter 4 dungeon');
check(v60.realmFromText('Oracle Labyrinth')===4,'chapter 5 dungeon');
check(v60.realmFromText('Storm Observatory')===5,'chapter 6 dungeon');
check(v60.realmFromText('Frostbound Vault')===6,'chapter 7 dungeon');
check(v60.realmFromText('First Library')===7,'chapter 8 dungeon');
check(v60.classifyReport('Last action +27 HP')==='heal','pure healing summary');
check(v60.classifyReport('Last action −42 HP')==='damage','damage summary');
function fakeApp(map){return{querySelector(selector){return map[selector]||null;},querySelectorAll(selector){return map[selector]||[];}};}
currentApp=fakeApp({'.titlepage':element()});
v60.decorate();
check(doc.body.dataset.lqScene==='title','title has dedicated visual scene');
currentApp=fakeApp({'.shell':element(),'.location h2':{textContent:'Forge of Ash'}});
v60.decorate();
check(doc.body.dataset.lqScene==='field','exploration recognized');
check(doc.body.dataset.lqRealm==='2','exploration identifies dungeon palette');
const stage=element();
stage.className='battle-stage tactical-stage realm-6';
stage.querySelector=selector=>selector==='.enemy-art.boss'?element():selector==='.v60-stage-caption'?stage.children.find(el=>el.className==='v60-stage-caption')||null:null;
currentApp=fakeApp({
 '.battle-shell':element(),
 '.battle-stage':stage,
 '.battle-heading-side span':{textContent:'Hollow North'},
 '.battle-heading .eyebrow':{textContent:'Guardian battle · Round 1 · Phase 1'},
 '.battle-heading h2':{textContent:'Mira’s turn'}
});
v60.decorate();
check(doc.body.dataset.lqScene==='battle','combat scene recognized');
check(doc.body.dataset.lqRealm==='6','combat class overrides ambiguous text');
check(stage.attributes.role==='group','battle stage accessible role');
check(stage.children.length===1,'one cinematic region caption');
check(stage.children[0].textContent.includes('Hollow North'),'caption references realm');
v60.decorate();
check(stage.children.length===1,'redecorating does not duplicate caption');
check(stage.classes.has('v60-boss'),'boss battle receives classification');
const menu=element(),cards=element(),title={textContent:'Field menu'};
const actions=['equipment','relics','loot','codex','chapterOne','journal','atlas','recoverField','transfer','help','reset','townRecall','title','otherAction'];
actions.forEach(a=>cards.appendChild(element('button',a)));
menu.querySelector=selector=>selector==='.modal-head h2'?title:selector==='.cards'?cards:null;
cards.querySelectorAll=selector=>selector===':scope > button[data-action]'?cards.children.filter(n=>n.tagName==='BUTTON'):[];
const app=fakeApp({'.titlepage':element(),'.modal[role="dialog"]':menu});
currentApp=app;
v60.decorate();
check(menu.dataset.v60Menu==='done','field menu enhanced');
check(cards.children.length===4,'three category groups and fallback group');
const collection=cards.children.flatMap(group=>group.children.filter(child=>child.className==='v60-menu-buttons').flatMap(grid=>grid.children));
check(collection.length===actions.length,'all actions remain in menu');
check(new Set(collection).size===actions.length,'menu action nodes are preserved, not cloned');
check(collection.some(b=>b.dataset.action==='otherAction'),'unknown future action remains accessible');
const css=read('v60-premium.css'),html=read('index.html'),sw=read('sw.js'),netlify=read('netlify.toml');
check((css.match(/\{/g)||[]).length===(css.match(/\}/g)||[]).length,'CSS braces balanced');
check(css.includes('prefers-reduced-motion:reduce'),'reduced motion override included');
check(css.includes('max-width:700px'),'mobile layout included');
check(css.includes('.v60-menu-buttons'),'new menu is styled');
check(css.includes('.v60-stage-caption'),'battle captions styled');
check(html.includes('href="v60-premium.css"'),'premium CSS in playable entry');
check(html.includes('src="v60-premium.js"'),'premium JS in playable entry');
check(html.indexOf('v60-premium.css')>html.indexOf('rpg-cinematic-director.css'),'premium styles override earlier styles');
check(html.indexOf('v60-premium.js')>html.indexOf('rpg-ui.js'),'presentation boot follows game');
check(sw.includes("'./v60-premium.css'")&&sw.includes("'./v60-premium.js'"),'service worker includes new assets');
check(sw.includes("!url.startsWith('./assets/cinematics/')"),'cinematics do not bulk-download on cache revision');
check(sw.includes("!url.startsWith('./assets/audio/')"),'music does not bulk-download on cache revision');
check(netlify.includes('node qa/v60-premium-test.cjs'),'full build executes this quality gate');
check(!read('v60-premium.js').includes('localStorage.setItem'),'decorator cannot write save slots');
check(!read('v60-premium.js').includes('.act('),'decorator cannot change combat outcomes');
console.log('PASS '+passed+' v60 premium foundation QA checks: all eight realms, clean menu, cinematic labels, accessibility, cache, existing controls, integration and save safety.');
