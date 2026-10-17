/* Bounded terrain cache and display-clock scheduling. No game-state mutations. */
(function(root){
'use strict';
function surface(canvas,width,height,dpr=1){
 const ratio=Math.max(1,Number(dpr)||1),w=Math.round(width*ratio),h=Math.round(height*ratio);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const c=canvas.getContext('2d');
 c.setTransform(ratio,0,0,ratio,0,0);c.imageSmoothingEnabled=false;
 return c;
}
function clock(){
 let dirty=true,last=-Infinity;
 return {invalidate(){dirty=true;},frame(now,{visible=true,active=true,moving=false,reduced=false,interior=false}={}){
  if(!visible||!active){dirty=true;last=now;return false;}
  const elapsed=now-last,ambient=elapsed>=(interior?162:54);
  if(!dirty&&!moving&&(!ambient||reduced))return false;
  dirty=false;if(ambient)last=now;
  return {ambient};
 }};
}
function terrainCache(createCanvas){
 let buffer=null,key='',map=null;
 const stats={builds:0,blits:0};
 return {stats,invalidate(){key='';},draw(c,m,camera,state,dpr,paint){
  const x=Math.floor(camera.x),y=Math.floor(camera.y);
  // Include neighbor tiles: connected roofs and roads depend on adjacent cells.
  const next=[state.place,state.region,state.floor,x,y,dpr,m.tiles.map(r=>r.join(',')).join(';')].join('|');
  if(map!==m||key!==next){
   buffer=buffer||createCanvas();const ctx=surface(buffer,18*48,14*48,dpr);
   ctx.clearRect(0,0,18*48,14*48);
   for(let ty=y;ty<=y+13;ty++)for(let tx=x;tx<=x+17;tx++)paint(ctx,(tx-x)*48,(ty-y)*48,tx,ty);
   key=next;map=m;stats.builds++;
  }
  c.drawImage(buffer,0,0,buffer.width,buffer.height,Math.round((x-camera.x)*48),Math.round((y-camera.y)*48),18*48,14*48);stats.blits++;
 }};
}
const api={surface,clock,terrainCache};
if(typeof module!=='undefined')module.exports=api;else root.LQRender=api;
})(typeof globalThis!=='undefined'?globalThis:this);
