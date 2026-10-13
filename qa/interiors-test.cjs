const assert=require('node:assert/strict'),L=require('../rpg-interiors.js'),G=require('../rpg-engine.js');
let checks=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);checks++;};
for(let region=0;region<4;region++)for(const kind of ['inn','shop','forge']){
 const room=L.create(kind,region,'Example '+kind),fresh=G.fresh('Test');
 ok(room.region===region&&room.kind===kind,'room identity');
 ok(room.w===18&&room.h===12,'dimensions');
 ok(room.objects.length===4,'three hotspots plus exit');
 ok(L.blocked(room,0,0)&&L.blocked(room,9,4),'walls and counter impassable');
 ok(!L.blocked(room,9,10),'door floor accessible');
 ok(!L.step(room,0,2),'non-cardinal movement rejected');
 for(const o of room.objects){
  const r=L.route(room,o.x,o.y);ok(!!r,'hotspot must be reachable '+o.id+' '+region+' '+kind);
  for(const [dx,dy] of r)ok(L.step(room,dx,dy),'route collision '+o.id);
  ok(L.adjacent(room).some(n=>n.id===o.id),'hotspot accessible '+o.id);
 }
 ok(G.validSave(fresh),'valid save unaffected');
}
const example=L.create('inn',0,'Lantern Inn');const route=L.route(example,8,4);ok(route===null,'cannot route onto counter');
const g=new G.Game();g.s.gold=100;
const before=g.s.gold;g.buy('inn');ok(g.s.gold===before-15,'inn purchase cost unchanged');
const save=JSON.parse(JSON.stringify(g.s));ok(G.validSave(save),'save compatibility');
console.log('PASS '+checks+' interior checks: 12 region-specific rooms, paths, fixtures, interaction reachability, upgrades and v3 save safety.');
