/* Lexicon Quest — shared professional-art loader.
 * Re-adopts the commercial-grade sheets in assets/art that the Reforged build
 * had abandoned for programmatic fillRect: region backgrounds, enemies, bosses,
 * character portraits. Pure presentation; no save/collision/gameplay effects.
 * Guarded for headless/Node QA (no Image constructor) — every call no-ops there.
 */
(function(root){
'use strict';
const BASE='assets/art/';
// [cols, rows] grids. environments is 2x4 landscape; the figure sheets are 4x2.
const GRID={environments:[2,4],enemies:[4,2],bosses:[4,2],portraits:[4,2]};
const FILES={environments:'environments.webp',enemies:'enemies.webp',bosses:'bosses.webp',portraits:'portraits.webp'};
// Figure sheets are NOT strictly region-ordered; map region -> cell index.
// environments IS region-ordered (verified: 0=Willowmere..7=First Library).
const ENEMY_CELL=[0,1,3,5,4,6,2,7];   // region -> enemies.png cell
const cache={};
const waiters={};
const hasImage=typeof root!=='undefined'&&typeof root.Image!=='undefined';
function fire(name){const q=waiters[name];if(q){waiters[name]=null;for(const cb of q){try{cb();}catch(e){}}}}
function load(name){
 if(!hasImage||cache[name])return cache[name]||null;
 const im=new root.Image();
 im._ready=false;
 try{im.decoding='async';}catch(e){}
 im.onload=()=>{im._ready=true;fire(name);};
 im.onerror=()=>{};
 im.src=BASE+FILES[name];
 cache[name]=im;
 return im;
}
function preload(){for(const k in FILES)load(k);}
function ready(name){const im=cache[name];return !!(im&&im._ready&&im.naturalWidth);}
function whenReady(name,cb){if(ready(name)){cb();return;}(waiters[name]||(waiters[name]=[])).push(cb);load(name);}
function cell(name,index){
 if(!ready(name))return null;
 const im=cache[name],g=GRID[name]||[1,1],cols=g[0],rows=g[1],n=cols*rows;
 const sw=im.naturalWidth/cols,sh=im.naturalHeight/rows,i=((Math.floor(index)%n)+n)%n;
 return {img:im,sx:(i%cols)*sw,sy:Math.floor(i/cols)*sh,sw,sh};
}
function draw(ctx,name,index,dx,dy,dw,dh,fit){
 const cl=cell(name,index);if(!cl||!ctx||!ctx.drawImage)return false;
 try{
  ctx.imageSmoothingEnabled=true;
  if(fit==='contain'){ // preserve aspect, center within box (for transparent figures)
   const s=Math.min(dw/cl.sw,dh/cl.sh),w=cl.sw*s,h=cl.sh*s;
   ctx.drawImage(cl.img,cl.sx,cl.sy,cl.sw,cl.sh,dx+(dw-w)/2,dy+(dh-h),w,h);
  }else{
   ctx.drawImage(cl.img,cl.sx,cl.sy,cl.sw,cl.sh,dx,dy,dw,dh);
  }
 }catch(e){return false;}
 return true;
}
const bg=(ctx,region,dx,dy,dw,dh)=>draw(ctx,'environments',region,dx,dy,dw,dh);
const enemy=(ctx,region,dx,dy,dw,dh)=>draw(ctx,'enemies',ENEMY_CELL[((region%8)+8)%8],dx,dy,dw,dh,'contain');
const boss=(ctx,region,dx,dy,dw,dh)=>draw(ctx,'bosses',region,dx,dy,dw,dh,'contain');
const portrait=(ctx,index,dx,dy,dw,dh)=>draw(ctx,'portraits',index,dx,dy,dw,dh);
const api={preload,ready,whenReady,cell,draw,bg,enemy,boss,portrait,GRID,ENEMY_CELL};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQArt=api;
preload();
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this);
