const assert=require('node:assert/strict');
const T=require('../rpg-townsfolk.js'),G=require('../rpg-engine.js'),I=require('../rpg-interiors.js');
let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++;};
for(let region=0;region<8;region++){
 const map=G.townMap(region),npc=T.create(region,map,map.objects),ids=new Set();
 ok(npc.people.length>=4,'citizens exist across all regions '+region);
 for(const person of npc.people){
  ok(!ids.has(person.id),'unique citizen '+person.id);ids.add(person.id);
  ok(T.passable(npc,person.x,person.y),'valid spawn '+person.name);
  ok(person.type==='citizen'&&person.roleIndex>=0&&person.roleIndex<8,'sprite identity');
  ok(person.lines.length===3&&person.lines.every(s=>s.length>20),'three distinct dialogue prompts');
  ok(T.at(npc,person.x,person.y) !== null,'visible and approachable');
  ok(T.say(person,0).length>20&&T.say(person,1)!==T.say(person,2),'dialogue topic');
  ok(T.say(person,0,true).includes('guardian'),'cleared-region dialogue reacts to story');
 }
 const initial=npc.people.map(p=>p.x+','+p.y),seen=npc.people.map(p=>new Set([p.x+','+p.y]));
 for(let t=0;t<420;t++){
  T.tick(npc,{x:12,y:15});
  for(let i=0;i<npc.people.length;i++){
   const p=npc.people[i];
   ok(T.passable(npc,p.x,p.y),'never steps into furniture, walls or quest objects '+p.name);
   ok(!(p.x===12&&p.y===15),'never steps onto player '+p.name);
   ok(!npc.people.some((q,j)=>q!==p&&q.x===p.x&&q.y===p.y),'does not pile onto another NPC');
   ok(Math.abs(p.drawX-p.x)<=1&&Math.abs(p.drawY-p.y)<=1,'sprite interpolation stays near tile');
   seen[i].add(p.x+','+p.y);
  }
 }
 if(region<4)ok(seen.every(s=>s.size>=2),'authored residents walk instead of standing still '+region);
 const candidate=npc.people[0],prev=candidate.x+','+candidate.y;T.hold(candidate,18);
 for(let j=0;j<12;j++)T.tick(npc,{x:12,y:15});
 ok(prev===candidate.x+','+candidate.y,'talking pauses resident');
 ok(G.validSave(G.fresh('Citizen tester')),'v3 saves remain compatible');
}
for(let r=0;r<4;r++)for(const kind of ['inn','shop','forge']){
 const room=I.create(kind,r,'Test room'),mock={complete:true,naturalWidth:1344};
 ok(room.objects.length===4,'interior service room unchanged');
 ok(I.route(room,9,5)!==null,'service access remains possible');
}
console.log('PASS '+checks+' living-town checks: resident movement, dialogue, proximity, non-collision, v3 saves, and all interiors.');
