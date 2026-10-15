/* Lexicon Quest v63 — original animated sprite atelier.
 * Hand-authored pixel procedures: 3 heroes x 4 directions x 6 poses,
 * 8 realm families x 3 enemy casts x 6 poses (+ guardian silhouettes).
 * Canvases are cached; no external assets, no game-state mutation.
 */
(function(root){
'use strict';
const W=64,H=72,FRAMES=6,DIRS=['down','left','right','up'];
const REALMS=[
 {name:'Verdant',body:'#47796c',lit:'#9db78a',shade:'#213f3b',trim:'#dec885',eye:'#f3dfa3',kind:'roots'},
 {name:'Silverglass',body:'#777c9e',lit:'#cdd1e8',shade:'#343d69',trim:'#a5d2ea',eye:'#f0eaff',kind:'mirror'},
 {name:'Ashforge',body:'#ad6446',lit:'#e49c68',shade:'#492f35',trim:'#ffd292',eye:'#ffb35a',kind:'forge'},
 {name:'Tidebound',body:'#467b87',lit:'#96d7d0',shade:'#28505e',trim:'#d2e9db',eye:'#9af7f6',kind:'tide'},
 {name:'Sundune',body:'#b18a5a',lit:'#f2d39a',shade:'#594a49',trim:'#f4e5b5',eye:'#d5baff',kind:'oracle'},
 {name:'Stormwing',body:'#6a96a8',lit:'#c1dbea',shade:'#374c7d',trim:'#d6d8ff',eye:'#f4f5ba',kind:'sky'},
 {name:'Winterbound',body:'#81b0bd',lit:'#e1f3f1',shade:'#445d79',trim:'#d8ebff',eye:'#a4d9fc',kind:'frost'},
 {name:'Scriptborn',body:'#8e7f8e',lit:'#dec8b2',shade:'#484761',trim:'#ead7a1',eye:'#d1c1ff',kind:'lexicon'}
];
const cache=new Map(),enemyCache=new Map();
const safe=n=>Number.isFinite(Number(n))?Number(n):0;
const wrap=(n,len)=>(Math.floor(safe(n))%len+len)%len;
const rect=(c,x,y,w,h,col)=>{if(w<=0||h<=0)return;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function pixels(c,p,pose=0,boss=false,slot=0){
 const swing=pose===1?-2:pose===3?2:0,lift=pose===2?-2:0,cast=pose===4,guard=pose===5;
 const off=boss?-4:0;
 const outline='#15212c',left=slot===1?-3:0,right=slot===2?3:0;
 // Cast shadow anchors art to arena and avoids floating rectangular placeholders.
 rect(c,14,64,36,3,'#09172575');rect(c,20,67,26,1,'#09172552');
 // Distinct independent legs/feet; pose changes are literal pixel frames.
 rect(c,19+swing,51+lift,11,12,outline);rect(c,35-swing,51+lift,11,12,outline);
 rect(c,21+swing,54+lift,7,7,p.shade);rect(c,37-swing,54+lift,7,7,p.shade);
 rect(c,17+swing,61+lift,14,3,p.trim);rect(c,34-swing,61+lift,15,3,p.trim);
 // Silhouette mantle / carapace / ornate robe.
 rect(c,17+left,24+off+lift,31+right,31,outline);
 rect(c,19+left,26+off+lift,27+right,26,p.body);
 rect(c,23+left,26+off+lift,18+right,21,p.lit);
 rect(c,20,45+lift,25,5,p.shade);
 for(let i=0;i<3;i++)rect(c,19+i*8,47+lift,5,2,p.trim);
 // Arms animate separately. Warden shoulder angles read at phone size.
 rect(c,9,28+lift,11,8,outline);rect(c,44,28+lift,11,8,outline);
 rect(c,10,30+lift+(guard?4:0),9,16,p.body);
 rect(c,45,30+lift+(cast?-7:guard?4:0),9,16,p.body);
 rect(c,12,33+lift,5,6,p.lit);rect(c,47,33+lift+(cast?-6:0),5,6,p.lit);
 rect(c,19,24+lift,5,9,p.trim);rect(c,41,24+lift,5,9,p.trim);
 // Helmet/face (separate negative space and glowing readable eyes).
 rect(c,21,9+off+lift,25,19,outline);rect(c,23,11+off+lift,21,15,p.shade);
 rect(c,25,14+off+lift,17,9,p.body);rect(c,27,19+off+lift,4,3,p.eye);rect(c,37,19+off+lift,4,3,p.eye);
 rect(c,32,24+off+lift,4,3,p.trim);
 // Belly emblem changes with monster archetype.
 if(slot===0){
   rect(c,28,35+lift,8,8,p.shade);rect(c,30,33+lift,4,12,p.eye);
 }else if(slot===1){
   rect(c,25,36+lift,14,7,p.trim);rect(c,29,35+lift,6,10,p.shade);
   rect(c,26,39+lift,3,3,p.eye);
 }else{
   rect(c,25,34+lift,14,13,p.shade);rect(c,29,35+lift,6,9,p.eye);
   rect(c,31,32+lift,2,18,p.trim);
 }
 if(boss){
   rect(c,22,5+off+lift,5,9,p.trim);rect(c,37,5+off+lift,5,9,p.trim);
   rect(c,28,1+off+lift,9,6,p.eye);
   rect(c,16,14+off+lift,7,7,p.shade);rect(c,43,14+off+lift,7,7,p.shade);
 }
 // Region-specific heads and arms are not palette swaps.
 switch(p.kind){
  case 'roots':
   rect(c,10,13+lift,10,4,p.lit);rect(c,45,13+lift,11,4,p.lit);
   rect(c,8,10+lift,5,10,p.body);rect(c,50,7+lift,4,12,p.body);
   rect(c,17,5+lift,7,8,p.shade);rect(c,40,5+lift,7,8,p.shade);
   for(let k=0;k<3;k++){rect(c,10+k*10,8+lift+(k%2)*3,7,4,p.lit);rect(c,42+k*5,7+lift+(k%2)*4,8,3,p.lit);}
   rect(c,15,49+lift,5,10,p.shade);rect(c,46,49+lift,5,10,p.shade);break;
  case 'mirror':
   rect(c,16,6+lift,6,13,p.trim);rect(c,45,7+lift,6,13,p.trim);
   rect(c,13,17+lift,8,6,p.lit);rect(c,48,15+lift,9,6,p.lit);
   rect(c,28,8+off+lift,10,2,p.trim);
   for(let k=0;k<3;k++){rect(c,12+k*13,44+lift+k,8,9,k%2?p.body:p.shade);}
   break;
  case 'forge':
   rect(c,19,4+lift,26,7,p.shade);rect(c,24,5+lift,15,3,p.trim);
   rect(c,14,22+lift,7,5,p.trim);rect(c,43,22+lift,7,5,p.trim);
   rect(c,28,35+lift,8,10,'#ea763d');rect(c,30,37+lift,4,5,p.eye);
   rect(c,7,42+lift,13,8,p.shade);rect(c,47,40+lift,12,8,p.shade);break;
  case 'tide':
   rect(c,11,15+lift,12,6,p.lit);rect(c,44,12+lift,11,8,p.lit);
   rect(c,15,9+lift,7,7,p.body);rect(c,45,8+lift,6,7,p.body);
   rect(c,25,7+lift,13,3,p.trim);rect(c,21,52+lift,24,3,p.eye);
   for(let i=0;i<4;i++)rect(c,21+i*7,48+lift+(i%2)*3,5,5,p.trim);break;
  case 'oracle':
   rect(c,18,4+lift,29,8,p.shade);rect(c,25,2+lift,14,7,p.trim);
   rect(c,21,12+lift,22,8,p.trim);rect(c,23,16+lift,18,6,p.shade);
   rect(c,14,43+lift,8,17,p.lit);rect(c,42,43+lift,8,17,p.lit);
   rect(c,30,31+lift,4,14,p.eye);break;
  case 'sky':
   for(let i=0;i<4;i++){rect(c,2+i*3,16+i*7+lift,19,5,p.lit);rect(c,44+i*3,37-i*7+lift,19,5,p.trim);}
   rect(c,29,3+lift,6,11,p.eye);rect(c,22,8+lift,8,5,p.lit);
   break;
  case 'frost':
   rect(c,14,9+lift,7,12,p.lit);rect(c,44,7+lift,7,14,p.lit);
   rect(c,18,5+lift,7,8,p.trim);rect(c,42,5+lift,7,8,p.trim);
   for(let i=0;i<4;i++){rect(c,10+i*12,24+lift,7,4,'#e5f8fa');rect(c,13+i*12,46+lift,6,3,p.lit);}
   break;
  case 'lexicon':
   rect(c,17,5+lift,30,7,p.trim);rect(c,15,8+lift,6,24,p.lit);rect(c,46,8+lift,6,24,p.lit);
   for(let i=0;i<5;i++)rect(c,22,31+lift+i*4,22,2,i%2?p.trim:p.eye);
   rect(c,31,3+lift,3,11,p.eye);break;
 }
 if(cast){rect(c,49,14+lift,7,6,p.eye);rect(c,52,10+lift,3,4,p.trim);}
 if(guard){rect(c,5,27+lift,14,21,p.shade);rect(c,7,29+lift,10,17,p.trim);rect(c,10,32+lift,4,10,p.lit);}
}
function makeCanvas(w,h){
 const doc=root.document||typeof document!=='undefined'&&document;
 if(!doc?.createElement)return null;
 const cv=doc.createElement('canvas');cv.width=w;cv.height=h;return cv;
}
function enemyFrame(realm=0,variant=0,boss=false,frame=0){
 const key=[wrap(realm,8),wrap(variant,3),boss?1:0,wrap(frame,FRAMES)].join('/');
 if(enemyCache.has(key))return enemyCache.get(key);
 const canvas=makeCanvas(W,H);
 if(!canvas)return null;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 pixels(ctx,REALMS[wrap(realm,8)],wrap(frame,FRAMES),!!boss,wrap(variant,3));
 enemyCache.set(key,canvas);
 return canvas;
}
function drawEnemy(c,x,y,opts={}){
 const realm=wrap(opts.realm,8),variant=wrap(opts.variant,3);
 const frame=wrap(opts.frame,FRAMES),boss=!!opts.boss;
 const cv=enemyFrame(realm,variant,boss,frame);
 if(cv&&typeof c.drawImage==='function'){
  c.imageSmoothingEnabled=false;c.drawImage(cv,x,y,opts.width||128,opts.height||144);
  return true;
 }
 // Node QA and older browsers retain a deterministic direct renderer.
 c.save?.();c.translate?.(x,y);c.scale?.((opts.width||128)/W,(opts.height||144)/H);
 pixels(c,REALMS[realm],frame,boss,variant);
 c.restore?.();
 return true;
}
function renderHero(c,id=0,dir='down',frame=0,pose='walk'){
 const base=root.LQSpriteAtlas;if(!base?.renderFrame)return false;
 const direction=DIRS.includes(dir)?dir:'down';
 const p=wrap(frame,FRAMES),walk=p%4;
 base.renderFrame(c,id,direction,walk);
 const n=wrap(id,3),b=p===2?-1:p===3?1:0;
 const accent=['#f7d286','#eac3ff','#b7e6a4'][n],shade=['#244c91','#735181','#375e57'][n];
 // Additional readable wearable identity, cape hems, metallic edging and idle poses.
 rect(c,7,12+b,1,6,accent);rect(c,12,13+b,1,6,accent);
 rect(c,7,18+b,6,1,shade);rect(c,8,20+b,5,1,accent);
 if(n===0){
   rect(c,6,14+b,2,7,shade);rect(c,13,14+b,2,7,'#6ca8d5');
   rect(c,8,13+b,4,2,accent);rect(c,11,9,1,1,'#f8e8cd');
 }else if(n===1){
   rect(c,7,6,1,9,'#d6a3b7');rect(c,13,6,1,9,'#d6a3b7');
   rect(c,9,13+b,3,2,accent);rect(c,9,2,3,1,accent);
 }else{
   rect(c,7,11+b,6,2,'#b9d8b6');rect(c,6,15+b,2,4,shade);
   rect(c,9,18+b,3,1,accent);rect(c,8,3,4,2,'#8b6a4a');
 }
 // Action/focus poses use compatible original 20x24 source resolution.
 if(p===4){rect(c,1,9,4,2,accent);rect(c,2,7,2,7,'#f3e2b7');rect(c,3,5,2,2,accent);}
 if(p===5){rect(c,2,12,5,8,shade);rect(c,3,13,3,6,accent);}
 return true;
}
function heroFrame(id,dir,frame){
 const key=[wrap(id,3),dir,wrap(frame,FRAMES)].join('/');
 if(cache.has(key))return cache.get(key);
 const cv=makeCanvas(20,24),c=cv?.getContext?.('2d');if(!c)return null;
 renderHero(c,id,dir,frame);
 cache.set(key,cv);return cv;
}
function drawHero(c,x,y,options={}){
 const dir=DIRS.includes(options.dir)?options.dir:'down',id=wrap(options.id,3);
 const moving=!!options.walking;
 const frame=Number.isInteger(options.pose)?wrap(options.pose,FRAMES):moving?1+wrap(Math.floor(safe(options.phase)*3),3):0;
 const art=heroFrame(id,dir,frame);
 if(!art||!c.drawImage){
  return root.LQSpriteAtlas?.draw?.(c,x,y,options)||null;
 }
 // Match existing map sprite placement exactly (48px tiles).
 rect(c,x+11,y+41,28,5,'#06121a7a');
 c.imageSmoothingEnabled=false;c.drawImage(art,Math.round(x+4),Math.round(y-1),40,48);
 return {id,dir,frame,walking:moving};
}
function metrics(){return {heroFrames:3*DIRS.length*FRAMES,enemyFrames:8*3*FRAMES*2,cachedHeroes:cache.size,cachedEnemies:enemyCache.size,realms:REALMS.length,version:'v63'};}
const api={W,H,FRAMES,DIRS,REALMS,renderHero,heroFrame,drawHero,enemyFrame,drawEnemy,metrics,pixels};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV63Atlas=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
