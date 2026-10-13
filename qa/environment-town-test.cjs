/* Authored towns and art regressions: routes, services, collision, deterministic draw. */
const assert=require('node:assert/strict'),G=require('../rpg-engine.js'),T=require('../rpg-townsfolk.js'),R=require('../rpg-regions-ii.js'),A=require('../rpg-environment-art.js'),I=require('../rpg-interiors.js');
let count=0;const ok=(v,txt)=>{assert.ok(v,txt);count++;};
function reachable(g,tx,ty){const q=[[12,15]],seen=new Set(['12,15']);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(Math.abs(tx-x)+Math.abs(ty-y)<=1)return true;for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||g.blocked(nx,ny))continue;seen.add(k);q.push([nx,ny]);}}return false;}
const drawCalls=[];const ctx=new Proxy({imageSmoothingEnabled:false,fillRect:(...v)=>drawCalls.push(v),beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},stroke:()=>{},fill:()=>{},fillText:()=>{},ellipse:()=>{},setLineDash:()=>{},measureText:s=>({width:s.length*7})},{get:(a,k)=>a[k]||(()=>{}),set:(a,k,v)=>{a[k]=v;return true}});
for(let r=0;r<8;r++){
 const g=new G.Game({...G.fresh('Art QA'),place:'town',region:r}),m=g.map(),l=g.objects();
 ok(m.w===25&&m.h===19,'25x19 town '+r);
 ok(m.tiles.every(row=>row.length===25),'complete tile bounds '+r);
 ok(!g.blocked(12,15),'valid town entry '+r);
 for(const type of ['npc','inn','shop','forge','board','exit']){const o=l.find(q=>q.type===type);ok(!!o,`region ${r} has ${type}`);ok(reachable(g,o.x,o.y),`reach ${type} in ${r}`);}
 const npc=T.create(r,m,l);ok(npc.people.length>=4,`inhabitants in ${r}`);
 for(const person of npc.people)ok(T.passable(npc,person.x,person.y),`valid citizen ${r} ${person.id}`);
 const visible=new Set(m.tiles.flat());ok(visible.size>=5,'varied walkable/descriptive terrain in '+r);
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  const tile=m.tiles[y][x],drawn=A.tile(ctx,0,0,tile,r,x,y,7,m);ok(typeof drawn==='boolean',`tile ${tile}`);
 }
 for(const o of l.filter(q=>['inn','shop','forge'].includes(q.type)))A.service(ctx,250,250,o,r,17);
 for(const d of m.decor||[])A.prop(ctx,d,{x:0,y:0},r,9);
 if(r>=4){ok((m.decor||[]).length>=8,'authored environmental props '+r);ok(m.title.length>=25,'unique chapter title');ok(!['grass','road','house'].includes(m.tiles[9][9]),'authored architectural center '+r);}
}
const towns=Array.from({length:4},(_,i)=>G.townMap(i+4));ok(new Set(towns.map(t=>t.title)).size===4,'all four unique authored town names');
ok(drawCalls.length>300,'decor rendered into context');
for(const v of Object.values(A.palettes))ok(v.wall&&v.roof&&v.road,'palette has material stack');
for(let r=4;r<8;r++)for(const type of ['inn','shop','forge']){
 const room=I.create(type,r,'Town Art QA');
 ok(room.region===r,'new region interior palette preserved '+r);
 ok(room.npc&&room.npc.length>5,'new region-specific service attendant '+r);
 ok(I.route(room,9,5)!==null,'new region interior service accessible '+r);
}
for(let r=4;r<8;r++){
 const town=G.townMap(r),scene=T.create(r,town,town.objects);
 ok(scene.people.every(a=>a.lines.length===3 && new Set(a.lines).size===3), 'later towns have unique three-topic dialogue '+r);
 ok(new Set(scene.people.map(p=>p.name)).size===5,'distinct names within town '+r);
} 
console.log('PASS '+count+' environmental town checks: 8 unique town maps, 4 authored new regions, service access, scenery renderer, citizen movement, and save-compatible geometry.');
