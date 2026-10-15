/* Lexicon Quest v61 — Adventure Wayfinder.
 * Verified walkable routes, useful gate warnings, and a readable canvas trail.
 * Presentation-only. Does not alter path collision, saves, quest flags or battles.
 */
(function(root){
'use strict';
const TILE=48,STEP=[[0,-1],[1,0],[0,1],[-1,0]],ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>ESC[ch]);
const MECHANISMS=new Set(['lever','prism','mirror','forgeFan','heatValve','tideSluice','tidePump','windVane','mirageLens','skyVane','skyRelay','frostBeacon','frostLens','indexEngine','printingPlate','wardstone','catalogDial','plate','lanternMemory','finalVow','memoryVow']);
const SOLID=new Set(['enemy','boss','boulder','obstacle']);
function obstacle(g,objects,x,y){
 if(g.blocked(x,y))return true;
 const s=g.s,worldRegion=(root.LQ?.regionAt||g.regionAt);
 if(s.place==='world'&&typeof worldRegion==='function'&&typeof g.available==='function'&&!g.available(worldRegion(x,y)))return true;
 const o=objects.get(x+','+y);
 if(!o)return false;
 if(SOLID.has(o.type))return true;
 if(o.type==='door'&&!s.flags?.[o.requires])return true;
 if(o.type==='keydoor'&&!s.flags?.['key'+s.region])return true;
 if(o.type==='worldgate'&&!s.cleared?.includes(o.r))return true;
 return false;
}
function findPath(g,x,y,adjacent=true){
 if(!g?.s||typeof g.map!=='function'||typeof g.objects!=='function')return null;
 const m=g.map(),s=g.s;
 if(!m||!Number.isInteger(x)||!Number.isInteger(y))return null;
 const objects=new Map(g.objects().map(o=>[o.x+','+o.y,o]));
 const start=s.x+','+s.y,ends=new Set();
 const candidates=adjacent?[...STEP,[0,0]]:[[0,0]];
 for(const [dx,dy] of candidates){
  const tx=x+dx,ty=y+dy;
  if(tx>=0&&ty>=0&&tx<m.w&&ty<m.h&&!obstacle(g,objects,tx,ty))ends.add(tx+','+ty);
 }
 if(!ends.size)return null;
 const visited=new Map([[start,null]]),queue=[[s.x,s.y]];
 let finish=null;
 for(let cursor=0;cursor<queue.length&&cursor<=m.w*m.h;cursor++){
  const [cx,cy]=queue[cursor],key=cx+','+cy;
  if(ends.has(key)){finish=key;break;}
  for(const [dx,dy] of STEP){
   const nx=cx+dx,ny=cy+dy,k=nx+','+ny;
   if(nx<0||ny<0||nx>=m.w||ny>=m.h||visited.has(k)||obstacle(g,objects,nx,ny))continue;
   visited.set(k,key);queue.push([nx,ny]);
  }
 }
 if(finish===null)return null;
 const path=[];
 for(let key=finish;key!==null;key=visited.get(key)){
  const [a,b]=key.split(',').map(Number);
  path.push({x:a,y:b});
 }
 path.reverse();
 return path;
}
function detour(g,goal){
 const choices=g.objects().filter(o=>MECHANISMS.has(o.type)&&o.id!==goal?.id);
 let best=null;
 for(const o of choices){
  const path=findPath(g,o.x,o.y,true);
  if(!path)continue;
  const steps=path.length-1;
  // Prefer the nearest possible mechanism, but do not imply it solves the gate.
  if(!best||steps<best.steps)best={id:o.id,label:o.label||'Nearby mechanism',x:o.x,y:o.y,type:o.type,steps,path};
 }
 return best;
}
function plan(g){
 if(!g?.s||g.battle)return {status:'unavailable',label:'Explore',steps:null,path:[]};
 let guide=null;try{guide=g.guide();}catch{}
 const candidates=g.objects();
 const goal=guide&&candidates.find(o=>o.id===guide.id);
 if(!goal)return {status:'explore',label:guide?.label||'Explore this area',note:'Look for marked characters, stairways, and puzzle mechanisms.',steps:null,path:[],goal:null,guide};
 const path=findPath(g,goal.x,goal.y,true);
 const base={label:goal.label||guide.label||'Next objective',goal:{id:goal.id,x:goal.x,y:goal.y,type:goal.type},guide};
 if(path){
  const steps=path.length-1;
  return {...base,status:steps===0?'here':'ready',steps,path,note:steps===0?'You are beside your destination. Interact to continue.':'Follow the gold route. It avoids impassable terrain and locked doors.'};
 }
 const support=detour(g,goal);
 return {...base,status:'blocked',steps:null,path:[],support,note:support?'The main route is sealed. Investigate '+(support.label||'a nearby mechanism')+' or look for a key.':'The main route is sealed. Look for a key, switch, or another entrance.'};
}
function hud(p,show=true){
 if(!p||p.status==='unavailable')return '';
 const active=p.status==='ready'||p.status==='here';
 const label=active?(p.steps===0?'DESTINATION REACHED':p.steps+' WALKABLE STEPS'):p.status==='blocked'?'ROUTE BLOCKED':'EXPLORE';
 const action=active?'<button class="primary" data-action="goObjective">'+(p.steps===0?'Interact now':'Travel to goal')+'</button>':p.support?'<button class="primary" data-action="goSupport">Inspect nearby mechanism</button>':'';
 const toggle=active?'<button data-action="toggleRoute" aria-pressed="'+(show?'true':'false')+'">'+(show?'Hide route':'Show route')+'</button>':'';
 return '<section class="v61-wayfinder '+esc(p.status)+'" aria-label="Adventure route guidance"><div class="v61-wayfinder-icon" aria-hidden="true">✦</div><div class="v61-wayfinder-copy"><span class="v61-wayfinder-kicker">ADVENTURE WAYFINDER · '+esc(label)+'</span><strong>'+esc(p.label)+'</strong><p>'+esc(p.note||'')+'</p></div><div class="v61-wayfinder-actions">'+action+toggle+'</div></section>';
}
function draw(c,p,cam,tick=0,reduced=false){
 if(!c||!p||!p.path?.length||!cam||p.status==='blocked'||p.status==='explore')return false;
 const route=p.path;
 if(typeof c.beginPath!=='function'||typeof c.stroke!=='function')return false;
 if(typeof c.save==='function')c.save();
 try{
  const x=n=>(n-cam.x)*TILE+TILE/2,y=n=>(n-cam.y)*TILE+TILE/2;
  c.beginPath();c.moveTo(x(route[0].x),y(route[0].y));
  for(let i=1;i<route.length;i++)c.lineTo(x(route[i].x),y(route[i].y));
  c.lineWidth=8;c.lineCap='round';c.lineJoin='round';c.strokeStyle='#051522bd';c.stroke();
  c.lineWidth=3;c.strokeStyle='#f7d489db';
  if(typeof c.setLineDash==='function')c.setLineDash([9,8]);
  if('lineDashOffset' in c)c.lineDashOffset=reduced?0:-(tick%85)*.54;
  c.stroke();
  if(typeof c.setLineDash==='function')c.setLineDash([]);
  // The destination is a precise interactable, not an invented compass direction.
  const end=route[route.length-1],px=x(end.x),py=y(end.y);
  if(typeof c.arc==='function'){
   c.beginPath();c.arc(px,py,reduced?11:11+Math.sin(tick*.06)*2,0,Math.PI*2);
   c.strokeStyle='#fff0c0';c.lineWidth=2;c.stroke();
  }
  if(route.length>2){
   const mid=route[Math.min(route.length-1,Math.max(1,Math.floor(route.length*.62)))];
   if(typeof c.fillRect==='function'){c.fillStyle='#ffe5a0';c.fillRect(x(mid.x)-3,y(mid.y)-3,6,6);}
  }
 }finally{if(typeof c.restore==='function')c.restore();}
 return true;
}
const api=Object.freeze({plan,findPath,hud,draw,obstacle,version:'v61'});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQWayfinder=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
