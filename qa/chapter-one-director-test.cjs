/* Chapter I complete experience: memories, dial sequence, inn-route respite,
 * original objects, guardian synergy, non-farmable rewards and save migration.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const LQ=require('../rpg-engine.js');
const context=vm.createContext({LQ,console});
for(const filename of ['rpg-reforged.js','rpg-loot.js','rpg-adventure-chronicle.js','rpg-polish-core.js','rpg-chapter1-director.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),context,{filename});
}
let checks=0;const ok=(x,message)=>{assert.ok(x,message);checks++;};
const C=LQ.chapterOne;
ok(C&&C.memory.length===3&&C.dials.length===3,'chapter-one adventure installed');
const g=new LQ.Game(LQ.fresh('Chapter Hero'));
const originalSave=JSON.parse(JSON.stringify(g.s));
const baseline=g.s.party.map(p=>({maxhp:p.maxhp,maxmp:p.maxmp}));
function setLocation(place,floor=0){g.s.place=place;g.s.floor=floor;}
function at(id){const o=g.map().objects.find(o=>o.id===id);ok(!!o,'find '+id);return o;}
const positions=[
 ['town','lq1-bell','lanternMemory'],
 ['world','lq1-road','lanternMemory'],
 ['dungeon','lq1-oath','lanternMemory']
];
for(const [place,id,type] of positions){
 setLocation(place);
 const o=at(id);
 ok(o.type===type,'correct object type '+id);
 ok(!g.blocked(o.x,o.y),'memory on walkable tile '+id);
 const before=C.status(g.s).memories;
 const dialog=g.interact(o);
 ok(dialog?.screen==='dialog','first interaction uses narrative dialogue '+id);
 ok(dialog.text.length>100,'memory contains meaningful story '+id);
 ok(C.status(g.s).memories===before+1,'new memory earned '+id);
 g.interact(o);
 ok(C.status(g.s).memories===before+1,'memory cannot be collected twice '+id);
}
ok(C.status(g.s).lantern&&C.status(g.s).memories===3,'third memory awakens Lantern blessing');
for(let i=0;i<3;i++){
 ok(g.s.party[i].maxhp===baseline[i].maxhp+8,'permanent HP increased once, companion '+i);
 ok(g.s.party[i].maxmp===baseline[i].maxmp+2,'permanent MP increased once, companion '+i);
}
ok(g.s.journal.some(x=>x.includes('Living Lantern restored')),'journal explains blessing');
const recovered=g.s.party.map(p=>p.maxhp);
setLocation('town');
g.interact(at('lq1-bell'));
ok(g.s.party.every((p,i)=>p.maxhp===recovered[i]),'revisiting a memory never stacks max HP');
setLocation('dungeon',0);
const map=g.map();
for(const d of C.dials){
 const o=at(d.id);
 ok(o.type==='catalogDial'&&!g.blocked(o.x,o.y),'catalog dial on accessible tile '+d.id);
 for(let j=0;j<d.goal;j++){
  const result=g.interact(o);ok(result?.screen==='dialog','dial turns have narrative feedback');
 }
 ok((g.s.flags['lq:ch1:dial:'+d.id]||0)===d.goal,'dial matched prescribed orientation '+d.id);
}
ok(C.status(g.s).dials===3&&C.status(g.s).catalog,'three-dial puzzle awards first clear');
const gold=g.s.gold,potions=g.s.potions,ethers=g.s.ethers;
ok(gold===originalSave.gold+135&&potions===originalSave.potions+2&&ethers===originalSave.ethers+1,'hidden catalog rewards exact quantities');
for(const d of C.dials){const o=at(d.id);for(let j=0;j<4;j++)g.interact(o);}
ok(g.s.gold===gold&&g.s.potions===potions&&g.s.ethers===ethers,'solved puzzle cannot farm rewards by cycling switches');
const diagram=at('lq1-diagram');
ok(diagram.type==='catalogDiagram','catalog clue marker exists');
ok(/Root.*EAST.*Lantern.*SOUTH.*Star.*WEST/.test(g.interact(diagram).text),'diagram clues match correct dial orientations');
setLocation('world');
const camp=at('lq1-camp');
ok(!g.blocked(camp.x,camp.y),'roadside rest on safe tile');
const party=g.s.party;
party[0].hp=Math.max(1,party[0].maxhp-40);
party[0].mp=Math.max(0,party[0].maxmp-10);
party[1].hp=0;
const hp=party[0].hp,mp=party[0].mp,remaining=g.s.potions;
const campResult=g.interact(camp);
ok(campResult.screen==='dialog'&&C.status(g.s).pathRested,'camp restores party once');
ok(party[0].hp>hp&&party[0].mp>mp,'camp restores both resources');
ok(party[1].hp===0,'camp cannot accidentally revive defeated companions');
ok(g.s.potions===remaining+1,'camp contains one practical potion');
g.interact(camp);
ok(g.s.potions===remaining+1,'camp does not duplicate potion reward');
const wrapped=JSON.parse(JSON.stringify(g.s));
ok(LQ.validSave(wrapped),'game save remains version-3 compatible');
const restored=new LQ.Game(wrapped);
ok(C.status(restored.s).total===6&&C.status(restored.s).lantern,'reload preserves all six story progress flags');
const before=new LQ.Game(LQ.fresh('Without Lantern'));
before.startBattle({id:'first-boss',type:'boss',r:0});
restored.startBattle({id:'first-boss',type:'boss',r:0});
ok(restored.battle.focus===before.battle.focus+15,'Lantern changes actual guardian Focus on combat entry');
restored.battle.enemies.forEach(e=>e.hp=0);restored.win();
ok(restored.s.cleared.includes(0),'original chapter guardian victory remains available');
ok(LQ.validSave(restored.s),'post-boss save remains valid');
for(let r=1;r<8;r++){
 const other=new LQ.Game({...LQ.fresh('Other'),region:r});
 ok(!other.map().objects.some(o=>o.id.startsWith('lq1')),'no Chapter I props leak into region '+r);
 ok(!other.s.flags['lq:ch1:catalog'],'no unexpected Chapter I flags in region '+r);
}
const draws=[];
const c=new Proxy({fillRect:(...v)=>draws.push(v)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
for(const o of [...C.memory,...C.dials,{id:'lq1-camp',type:'trailCamp',x:16,y:12},{id:'lq1-diagram',type:'catalogDiagram',x:12,y:12}]){
 const type=o.type|| (C.memory.includes(o)?'lanternMemory':'catalogDial');
 const target={...o,type};
 ok(C.draw(c,20,20,target,restored.s,12),'custom art for '+o.id);
}
ok(draws.length>50,'original pixel-art objects have actual drawing primitives');
const doc=C.progressHTML(restored.s,restored.objects(),restored.s.place,restored.s.floor);
ok(doc.includes('Chapter I')&&doc.includes('Catalog Diagram'),'quest tracker renders story progress');
const page=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../rpg-ui.js'),'utf8');
new Function(ui);
ok(page.indexOf('rpg-chapter1-director.js')>=0&&page.indexOf('rpg-chapter1-director.js')<page.indexOf('rpg-ui.js'),'Chapter I loads before the game interface');
ok(sw.includes('rpg-chapter1-director.js')&&sw.includes('rpg-chapter1-director.css'),'offline cache includes all Chapter I assets');
ok(ui.includes('ChapterOne.draw')&&ui.includes("chapterOne'"),'field objects and tracker are integrated into game UI');
ok(!ui.toLowerCase().includes('crossword'),'player interface remains crossword-free');
console.log('PASS '+checks+' Chapter I adventure assertions: exploration, six collectibles & puzzles, rewards, guardian bonus, mobile art, existing story, save safety.');
