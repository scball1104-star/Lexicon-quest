'use strict';
const assert=require('node:assert/strict'),L=require('../rpg-engine.js');let n=0;
const check=(v,msg)=>{assert.ok(v,msg);n++};
function reach(m,point,forbidden=[]){const todo=[point],seen=new Set();while(todo.length){const v=todo.pop(),k=v.x+','+v.y;if(seen.has(k)||forbidden.includes(k))continue;if(['wall','water','tree','dune','mountain'].includes(m.tiles[v.y]?.[v.x])||!m.tiles[v.y]?.[v.x])continue;seen.add(k);for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]])todo.push({x:v.x+dx,y:v.y+dy});}return seen;}
const g=new L.Game();g.s.cleared=[0,1,2,3];g.enter('town',4);const town=g.map(),tReach=reach(town,{x:12,y:15});
check(town.title.includes('Saffron Haven'),'town location');
for(const o of town.objects)check(tReach.has(o.x+','+o.y),'town reachable '+o.label);
const witnesses=town.objects.filter(o=>o.type==='oracleWitness');check(witnesses.length===3,'three caravan witnesses');
const shrine=town.objects.find(o=>o.type==='oracleShrine');check(!!shrine,'Moonwell exists');
check(g.interact(shrine).text.includes('0/3'),'shrine gated');
for(const q of witnesses)check(g.interact(q).screen==='dialog','testimony '+q.clue);
const gold=g.s.gold,ethers=g.s.ethers;
check(g.interact(shrine).screen==='dialog','shrine responds');check(g.s.flags['lq:oracle:moonwell'],'moonwell active');check(g.s.gold===gold+100&&g.s.ethers===ethers+2,'one time town reward');
g.interact(shrine);check(g.s.gold===gold+100,'no Moonwell farming');
check(g.objective().includes('Oracle Labyrinth'),'chapter town guide');
check(g.interact(town.objects.find(o=>o.type==='npc')).screen==='dialog','Nomad Sel dialogue');
const memories=[];
for(let f=0;f<3;f++){
 const map=L.dungeonMap(4,f),entry=map.objects.find(o=>o.type==='leave'||o.type==='up'),gate=map.objects.find(o=>o.type==='door'),end=map.objects.find(o=>o.type==='down'||o.type==='boss'),open=reach(map,entry),closed=reach(map,entry,[gate.x+','+gate.y]);
 check(!!map.title&&!!map.flavor,'floor title '+f);
 check(map.objects.length>=12,'authored objects '+f);
 for(const o of map.objects)check(open.has(o.x+','+o.y),'floor object reachable '+o.id);
 check(!closed.has(end.x+','+end.y),'cannot bypass gate '+f);
 if(f===2){const lock=map.objects.find(o=>o.type==='keydoor');check(!reach(map,entry,[lock.x+','+lock.y]).has(end.x+','+end.y),'key required');}
 memories.push(map.objects.find(o=>o.type==='oracleMemory'));
}
g.enter('dungeon',4,0);let m=g.map();const vanes=m.objects.filter(o=>o.type==='windVane');check(vanes.length===3,'three vanes');
g.s.x=18;g.s.y=9;g.move(1,0);check(g.s.x===18,'closed wind gate collision');
g.s.x=10;g.s.y=11;const hp=g.s.party[0].hp;g.move(0,1);check(g.s.party[0].hp===hp-2,'Moonwell sand protection');g.move(0,-1);g.move(0,1);check(g.s.party[0].hp===hp-2,'sand damage once per tile');
for(const o of vanes)for(let j=0;j<o.goal;j++)g.interact(o);
check(g.s.flags['4-0-winds'],'vanes open gate');check(g.map().tiles[12][10]==='sandstone','dunes visibly settle');g.s.x=18;g.s.y=9;g.move(1,0);check(g.s.x===19,'gate traversable');
g.interact(m.objects.find(o=>o.reward==='key'));check(g.s.flags.key4,'Nomad Sun Key acquired');
g.enter('dungeon',4,1);m=g.map();check(m.tiles[12][10]==='quicksand','gallery has dangerous sand until complete');const lenses=m.objects.filter(o=>o.type==='mirageLens');check(lenses.length===3,'three mirage lenses');
g.s.x=18;g.s.y=9;g.move(1,0);check(g.s.x===18,'false horizon gate closed');
for(const o of lenses)for(let j=0;j<o.goal;j++)g.interact(o);
check(g.s.flags['lq:oracle:lensesAligned']&&!g.s.flags['4-1-horizon'],'lenses alone do not open');
for(const word of L.puzzle(4).entries)check(g.solve(word.id,word.answer),'word '+word.id);
check(g.s.flags.seal4&&g.s.flags['4-1-horizon'],'crossword + lens opens');check(g.map().tiles[12][10]==='mosaic','horizon changes terrain');
const alt=new L.Game();alt.s.cleared=[0,1,2,3];alt.enter('dungeon',4,1);for(const w of L.puzzle(4).entries)alt.solve(w.id,w.answer);check(!alt.s.flags['4-1-horizon'],'crossword alone insufficient');for(const o of alt.map().objects.filter(o=>o.type==='mirageLens'))for(let j=0;j<o.goal;j++)alt.interact(o);check(alt.s.flags['4-1-horizon'],'opposite puzzle order works');
const records=m.objects.filter(o=>o.type==='oracleRecord');g.interact(records.find(o=>o.order===3));check(!g.s.flags['lq:oracle:chronicles'],'wrong record order not accepted');for(const o of records.sort((a,b)=>a.order-b.order))g.interact(o);check(g.s.flags['lq:oracle:chronicles'],'chronicles complete');const cache=m.objects.find(o=>o.type==='oracleCache'),before=g.s.gold;g.interact(cache);check(g.s.gold===before+200,'optional reward');g.interact(cache);check(g.s.gold===before+200,'reward nonrepeatable');
g.enter('dungeon',4,2);m=g.map();const vows=m.objects.filter(o=>o.type==='oracleVow');g.interact(vows.find(o=>o.order===2));check(!g.s.flags['4-2-vows'],'out of order vow rejected');for(const o of vows.sort((a,b)=>a.order-b.order))g.interact(o);check(g.s.flags['4-2-vows'],'vows open gate');g.s.x=18;g.s.y=9;g.move(1,0);check(g.s.x===19,'vow gate traversable');
for(const obj of memories)check(g.interact(obj).screen==='dialog','memory '+obj.scene);check(g.s.flags['lq:oracle:bond'],'Sel bond');
const boss=m.objects.find(o=>o.type==='boss');g.startBattle(boss);check(g.battle.ward===2&&g.battle.focus===55&&g.battle.selIntervention,'memory + Moonwell rewards');const b=g.battle,oracle=b.enemies[0];check(oracle.weak==='ice','ice weakness');oracle.hp=Math.floor(oracle.maxhp*.72)+1;g.act('attack',0);check(b.phase===1&&b.oracleVeil,'false future phase');check(b.enemies.length===3,'two adds');b.actor=0;oracle.hp=Math.ceil(oracle.maxhp*.35);g.act('attack',0);check(oracle.hp>=Math.ceil(oracle.maxhp*.34),'shield caps health');b.actor=0;b.focus=100;g.act('resonance');check(oracle.hp>=Math.ceil(oracle.maxhp*.34),'resonance cannot bypass shield');for(let i=1;i<=2;i++){b.enemies[i].hp=1;b.actor=0;g.act('attack',i);}check(b.phase===2&&!b.oracleVeil,'shield released');oracle.hp=Math.floor(oracle.maxhp*.3)+1;b.actor=0;g.act('attack',0);check(b.phase===3&&oracle.charge,'charged finale');b.actor=2;b.round=2;g.act('guard');check(!b.selIntervention,'Sel intervention triggers');check(b.log.some(x=>x.includes('CARAVAN COMPASS')),'intervention logged');oracle.hp=1;b.actor=0;g.act('attack',0);check(g.s.cleared.includes(4),'oracle defeated');check(g.s.tools.includes('hammer'),'hammer acquired');check(g.scene?.title.includes('Chapter V Complete'),'chapter end scene');check(g.s.journal.some(x=>x.includes('Zephyr Landing')),'next region teased');check(L.validSave(JSON.parse(JSON.stringify(g.s))),'v3 save format unchanged');
console.log('PASS '+n+' Oracle Labyrinth checks: town quest, three maps, gate physics, quicksand, puzzle dual conditions, bonus cache, memory, boss phases, saves.');
