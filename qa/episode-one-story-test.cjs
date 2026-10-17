const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const LQ=require('../rpg-engine.js'),ctx=vm.createContext({LQ});
for(const f of ['rpg-reforged.js','rpg-loot.js','rpg-chapter1-director.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const g=new LQ.Game(),town=g.map(),tess=town.objects.find(o=>o.willowCourier);
assert.ok(tess);assert.match(g.interact(tess).title,/0\/3/);
const baker=town.objects.find(o=>o.ambientResident);const before=g.interact(baker).text;
assert.equal(g.s.flags['lq:bell:undefined'],undefined,'new residents do not pollute bell quest');
for(let f=0;f<3;f++){
 g.enter('dungeon',0,f);const m=g.map(),letter=m.objects.find(o=>o.willowLetter);
 assert.equal(letter.willowLetter,f+1);
 assert.equal(m.objects.filter(o=>o.x===letter.x&&o.y===letter.y).length,1,'letter does not overlap an authored object');
 const q=[{x:g.s.x,y:g.s.y}],seen=new Set();
 while(q.length){const at=q.shift(),key=at.x+','+at.y;if(seen.has(key))continue;seen.add(key);
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){const x=at.x+dx,y=at.y+dy;
   if(x>=0&&y>=0&&x<m.w&&y<m.h&&!g.blocked(x,y)&&!seen.has(x+','+y))q.push({x,y});
  }
 }
 assert.ok([...seen].some(k=>{const [x,y]=k.split(',').map(Number);return Math.abs(x-letter.x)+Math.abs(y-letter.y)<=1;}),'letter reachable without opening main gate');
 g.interact(letter);const count=g.s.journal.length;g.interact(letter);assert.equal(g.s.journal.length,count);
}
g.enter('town',0);g.interact(tess);assert.equal(g.s.flags['lq:letters:delivered'],true);
const item=g.s.loot.find(i=>i.source==='Letters for the Living');assert.ok(item);assert.equal(item.slot,'boots');assert.equal(item.stats.speed,5);
const n=g.s.loot.length;g.interact(tess);assert.equal(g.s.loot.length,n,'reward cannot be farmed');
assert.equal(g.equipLoot(item.id,2),true);assert.equal(g.speed(g.s.party[2]),15);
assert.ok(LQ.validSave(JSON.parse(JSON.stringify(g.s))));const restored=new LQ.Game(JSON.parse(JSON.stringify(g.s)));assert.equal(restored.s.flags['lq:letters:delivered'],true);assert.equal(restored.s.party[2].bootsId,item.id);g.s.cleared.push(0);assert.notEqual(g.interact(baker).text,before);
g.s.party.forEach(p=>{p.hp=p.maxhp=999;p.mp=p.maxmp=99;});
g.startBattle({id:'archive-test',r:0,type:'boss'});const b=g.battle,boss=b.enemies[0];boss.hp=Math.ceil(boss.maxhp*.5)+1;g.act('attack',0);
assert.equal(b.phase,1);assert.deepEqual(b.enemies.slice(1).map(e=>e.weak),['fire','pierce']);
b.round=2;const hp=boss.hp;assert.match(g.intent(boss),/Devour names/);g.enemyTurn();assert.equal(boss.hp,hp+20);
b.enemies.slice(1).forEach(e=>e.hp=0);b.actor=0;g.act('guard');assert.equal(b.phase,2);assert.equal(boss.weak,'fire');
assert.ok(!g.intent(boss).includes('Devour'));
const dot=new LQ.Game();dot.startBattle({id:'dot',r:0,type:'boss'});dot.battle.enemies[0].hp=95;dot.battle.enemies[0].burn=10;dot.battle.enemies[0].burnTurns=1;dot.enemyTurn();assert.equal(dot.battle.phase,1,'Burn crossing the phase threshold summons pages');
console.log('PASS Willowmere letter routes, repeat-safe rewards, resident aftermath, save reload, and Archivore page tactics');
