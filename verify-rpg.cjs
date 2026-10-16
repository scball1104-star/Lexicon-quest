const assert=require('node:assert/strict'),L=require('./rpg-engine.js');
let checks=0;
function check(t,msg){assert.ok(t,msg);checks++;}
const walkable=t=>!['wall','water','tree','mountain','house','dune','cloudbank','oasis','icewall','snowpine','ink','inkwall'].includes(t);
function flood(m,from,blocked=[]){const q=[from],seen=new Set([from.x+','+from.y]);while(q.length){const p=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=x+','+y;if(seen.has(k)||!m.tiles[y]?.[x]||!walkable(m.tiles[y][x])||blocked.includes(k))continue;seen.add(k);q.push({x,y});}}return seen;}
for(let r=0;r<8;r++){
const p=L.puzzle(r),cells=new Map(),runs=new Set();
for(const e of p.entries){runs.add(e.dir+':'+e.r+','+e.c+':'+e.answer);for(let i=0;i<e.answer.length;i++){const y=e.r+(e.dir==='D'?i:0),x=e.c+(e.dir==='A'?i:0),k=y+','+x;check(!cells.has(k)||cells.get(k)===e.answer[i],'crossing contradiction');cells.set(k,e.answer[i]);}}
check(p.entries.length>=6,'Too few crossword clues');
for(const [k] of cells){const [y,x]=k.split(',').map(Number);for(const d of ['A','D']){const dx=d==='A'?1:0,dy=d==='D'?1:0;if(cells.has((y-dy)+','+(x-dx)))continue;let a='',i=0;while(cells.has((y+dy*i)+','+(x+dx*i))){a+=cells.get((y+dy*i)+','+(x+dx*i));i++;}if(a.length>1)check(runs.has(d+':'+y+','+x+':'+a),'Unclued crossword run');}}
for(let f=0;f<3;f++){
const m=L.dungeonMap(r,f),start=m.objects.find(o=>o.type==='leave'||o.type==='up'),all=flood(m,start);
for(const o of m.objects)check(all.has(o.x+','+o.y),'Unreachable object '+o.id);
const door=m.objects.find(o=>o.type==='door'),closed=flood(m,start,[door.x+','+door.y]);
const end=m.objects.find(o=>o.type==='down'||o.type==='boss');
check(!closed.has(end.x+','+end.y),'Gate bypass '+r+'/'+f);
if(f===1){const seal=m.objects.find(o=>o.type==='crossword');check(closed.has(seal.x+','+seal.y),'Crossword inaccessible');}
if(f===2){const lock=m.objects.find(o=>o.type==='keydoor'),locked=flood(m,start,[lock.x+','+lock.y]);check(!locked.has(end.x+','+end.y),'Key bypass');}
}
}
const wm=L.worldMap(),connected=flood(wm,L.centers[0]);wm.objects.forEach(o=>check(connected.has(o.x+','+o.y),'World destination disconnected '+o.id));
const g=new L.Game();g.enter('dungeon',0,0);
const gold=g.s.gold,chest=g.objects().find(o=>o.type==='chest'&&o.reward==='key');g.interact(chest);check(g.s.flags.key0,'key pickup');
g.enter('dungeon',0,1);L.puzzle(0).entries.forEach(e=>check(g.solve(e.id,e.answer),'solve'));
check(g.s.flags.seal0,'seal unlock');const saved=JSON.parse(JSON.stringify(g.s));check(L.validSave(saved),'save roundtrip');
const p=g.s.party[0];g.startBattle({id:'test',r:0,type:'enemy'});const hp=g.battle.enemies[0].hp;g.act('attack',0);check(g.battle.enemies[0].hp<hp,'attack immediately damages without clue');check(p.mastery.sword===6,'weapon xp');
g.battle.actor=1;g.s.party[1].mp=0;const before=JSON.stringify(g.battle);check(!g.act('flare',0),'MP prevents action');check(g.battle.actor===1,'invalid action consumes no turn');
g.s.party[1].mp=30;g.s.party[0].hp=10;g.act('mend',0);check(g.s.party[0].hp>10,'target healing');
g.battle.actor=2;g.act('ward',0);check(g.s.party[2].skills.ward===3,'support skill xp');
g.battle=null;const blocked=new L.Game();blocked.s.place='world';blocked.s.x=23;blocked.s.y=12;blocked.move(1,0);check(blocked.s.x===23,'realm locked');
blocked.s.cleared=[0];blocked.move(1,0);check(blocked.s.x===24,'realm opens');
const campaign=new L.Game();
for(let r=0;r<8;r++){
campaign.s.region=r;
// Simulate the full encounter budget with healing at each floor spring.
for(let f=0;f<3;f++){campaign.rest();for(let n=0;n<3;n++){campaign.startBattle({id:r+'-'+f+'-test'+n,r,type:'enemy'});let turns=0;while(campaign.battle&&turns++<100){const b=campaign.battle,p=campaign.s.party[b.actor],target=b.enemies.findIndex(e=>e.hp>0);const low=campaign.s.party.findIndex(p=>p.hp>0&&p.hp<p.maxhp*.5);if(low>=0&&campaign.abilities(p).includes('mend')&&p.mp>=4)campaign.act('mend',low);else if(p.id===1&&p.mp>=4)campaign.act(r%2?'flare':'frost',target);else campaign.act('attack',target);}check(turns<100,'finite battle');check(campaign.s.place!=='town'||campaign.events.at(-1)?.includes('Victory'),'campaign defeat');}}
campaign.rest();campaign.startBattle({id:'boss'+r,r,type:'boss'});let turns=0;while(campaign.battle&&turns++<150){const b=campaign.battle,p=campaign.s.party[b.actor],low=campaign.s.party.findIndex(p=>p.hp>0&&p.hp<p.maxhp*.5);const priority=(r>=1&&r<=7)&&b.phase===1?b.enemies.findIndex((e,i)=>i>0&&e.hp>0):0;const target=priority<0?0:priority;if(low>=0&&campaign.abilities(p).includes('mend')&&p.mp>=4)campaign.act('mend',low);else if(p.id===1&&p.mp>=4)campaign.act(r%2?'flare':'frost',target);else campaign.act('attack',target);}
check(campaign.s.cleared.includes(r),'boss defeated '+r);
console.log('Region',r+1,'complete at level',campaign.s.party[0].level);
}
check(campaign.s.complete,'complete campaign');check(campaign.s.tools.length===3,'all tools granted');
console.log(checks+' checks passed: crossword geometry, 24 dungeon routes/gates, world connectivity, combat, progression, saves.');
