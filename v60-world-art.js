/* Lexicon Quest v60 — The Living Realms atmosphere renderer.
 * One small canvas pass on top of the authored terrain, behind characters and
 * interactables. Deterministic, zero image downloads, no save modifications.
 */
(function(root){
'use strict';
const W=816,H=624,T=48;
const REALMS=[
 {mote:'#e4f4b6',shine:'#ffe9b6',light:'#f6d89a',rain:false},
 {mote:'#cfddff',shine:'#b4cbff',light:'#c4cfe6',rain:false},
 {mote:'#fcb171',shine:'#ffd39d',light:'#f6a75c',rain:false},
 {mote:'#b9ece8',shine:'#b0f6ed',light:'#98d9db',rain:true},
 {mote:'#f5ddb0',shine:'#f8e6bb',light:'#efc687',rain:false},
 {mote:'#c3ebff',shine:'#d4f5ff',light:'#b3d8fd',rain:true},
 {mote:'#d9f6ff',shine:'#effcff',light:'#c3eaf3',rain:false},
 {mote:'#e9d6ff',shine:'#f3e6ff',light:'#d0b7ff',rain:false}
];
function hash(x,y,z){
 let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(z|0,1274126177))|0;
 n=Math.imul(n^(n>>>13),1274126177)|0;
 return (n^(n>>>16))>>>0;
}
function tint(c,x,y,size,color,opacity){
 if(!c?.createRadialGradient)return false;
 const g=c.createRadialGradient(x,y,0,x,y,size);
 if(!g?.addColorStop)return false;
 g.addColorStop(0,color+opacity);
 g.addColorStop(1,color+'00');
 c.fillStyle=g;
 c.fillRect(Math.round(x-size),Math.round(y-size),Math.round(size*2),Math.round(size*2));
 return true;
}
function draw(c,map,cam,s,tick=0,quiet=false){
 if(!c||typeof c.fillRect!=='function'||!map?.tiles||!cam||!s)return {motes:0,lamps:0};
 const r=Math.max(0,Math.min(7,Number(s.region)||0)),p=REALMS[r];
 const t=quiet?0:Math.max(0,Number(tick)||0);
 const x0=Math.floor(cam.x)-1,y0=Math.floor(cam.y)-1;
 let motes=0,lamps=0;
 if(typeof c.save==='function')c.save();
 try{
  // Ground glints follow genuine authored water, magic floors and grass.
  for(let y=y0;y<=y0+16;y++)for(let x=x0;x<=x0+20;x++){
   const tile=map.tiles[y]?.[x];
   if(!tile)continue;
   const n=hash(x,y,r),sx=Math.round((x-cam.x)*T),sy=Math.round((y-cam.y)*T);
   if(sx<-50||sx>W+48||sy<-50||sy>H+48)continue;
   if(['water','oasis','ink','river','canal'].includes(tile)&&n%5===0){
    c.fillStyle=p.shine+'72';
    const shimmer=quiet?0:((t>>3)+n)%14;
    c.fillRect(sx+6+shimmer,sy+12+(n%20),8+(n%8),1);
    c.fillRect(sx+12,sy+26+(n%12),4,1);
   }else if(['floor','marble','scriptmosaic','goldscript','mosaic','crystal','letterpath'].includes(tile)&&n%17===0){
    c.fillStyle=p.mote+'49';
    c.fillRect(sx+12+(n%24),sy+10+((n>>>4)%26),3,2);
   }else if(['grass','meadow','flowers','garden','skygrass','snow'].includes(tile)&&n%13===0){
    c.fillStyle=p.mote+'6a';
    c.fillRect(sx+12+(n%21),sy+12+(n%29),2,3);
   }
  }
  // Each biome breathes differently: woodland fireflies, forge embers,
  // rain in the river city and sky isles, polar flurries, manuscript sparks.
  const count=quiet?14:s.place==='dungeon'?23:34;
  for(let i=0;i<count;i++){
   const n=hash(i,r+11,267),xx=(n%W),yy=((n>>>10)%H);
   const driftX=quiet?0:Math.sin(t*.036+(n%37))*(r===2?14:7);
   const driftY=quiet?0:r===2?-((t*0.65+(n%61))%120)+60:Math.cos(t*.027+(n%29))*10;
   const x=Math.round((xx+driftX+W)%W),y=Math.round((yy+driftY+H)%H);
   if(r===3||r===5){
    // Discrete 1px weather strokes; translucent so they never hide exits.
    c.fillStyle=p.shine+'42';
    c.fillRect(x,y,1,7+(n%7));
   }else if(r===6){
    c.fillStyle=p.mote+'91';
    c.fillRect(x,y,2+(n%3===0?1:0),2);
    if(i%6===0)c.fillRect(x-3,y+1,8,1);
   }else if(r===2){
    c.fillStyle=i%3?p.mote+'9c':p.shine+'b2';
    c.fillRect(x,y,2+(n%3===0?1:0),3);
   }else{
    c.fillStyle=p.mote+(i%4===0?'ae':'66');
    c.fillRect(x,y,i%5===0?3:2,2);
    if(i%6===0){c.fillStyle=p.shine+'30';c.fillRect(x-2,y-2,6,6);}
   }
   motes++;
  }
  // Lamps follow actual town service buildings, not invented architecture.
  if(s.place==='town'&&Array.isArray(map.objects)){
   for(const o of map.objects){
    if(!['inn','shop','forge','bell','spring','hollowFountain','oracleShrine','skyBeacon'].includes(o.type))continue;
    const x=(o.x-cam.x)*T+24,y=(o.y-cam.y)*T+12;
    if(x<-90||x>W+90||y<-90||y>H+90)continue;
    const strength=o.type==='forge'?'#eeaa71':p.light;
    if(tint(c,x,y,56,strength,'27'))lamps++;
   }
  }
  if(s.place==='dungeon'&&(s.floor===1||s.floor===2)){
   const x=(s.x-cam.x)*T+24,y=(s.y-cam.y)*T+18;
   if(tint(c,x,y,130,p.light,'0d'))lamps++;
  }
 }finally{if(typeof c.restore==='function')c.restore();}
 return {motes,lamps};
}
const api=Object.freeze({draw,hash,realms:REALMS.length,tile:T});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV60WorldArt=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
