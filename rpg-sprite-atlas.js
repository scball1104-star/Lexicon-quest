/* Lexicon Quest / Reforged Realms
 * Original authored 20x24 pixel characters. Four facings x four frames x three
 * companion silhouettes, cached into tiny canvas frames where supported.
 * No copyrighted assets, network dependencies, or save-state modifications.
 */
(function(root){
'use strict';
const W=20,H=24,FRAMES=4,DIRS=['down','left','right','up'];
const CAST=[
 {skin:'#ecc39c',skinShadow:'#ca9676',hair:'#372d38',hairLight:'#6e4b43',dark:'#203651',cloth:'#477bb7',clothLight:'#78acd4',clothShadow:'#28527b',edge:'#132636',metal:'#d7e5e6',shine:'#f8f1cb',gold:'#d8b76e',pants:'#546579',boots:'#303c49',eye:'#222b35',role:'blade'},
 {skin:'#e8b99a',skinShadow:'#c48d77',hair:'#5a3550',hairLight:'#9d6470',dark:'#3c2c52',cloth:'#9271ba',clothLight:'#c3a7d6',clothShadow:'#624783',edge:'#31263b',metal:'#ceb3f6',shine:'#ffe5cd',gold:'#dec4a0',pants:'#514565',boots:'#32304b',eye:'#2e2440',role:'staff'},
 {skin:'#cda17e',skinShadow:'#ad7658',hair:'#45342c',hairLight:'#886648',dark:'#2f4b45',cloth:'#739b8a',clothLight:'#b4c8aa',clothShadow:'#496e63',edge:'#25342f',metal:'#b9cfd1',shine:'#f8e3ac',gold:'#d6ab65',pants:'#515c54',boots:'#303d42',eye:'#252d2c',role:'axe'}
];
const cache=new Map();
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const makePalette=(id)=>CAST[((id%CAST.length)+CAST.length)%CAST.length];
function renderFrame(c,id=0,dir='down',frame=0){
 const p=makePalette(id);const back=dir==='up',side=dir==='left'||dir==='right',flip=dir==='left';
 const f=((Math.floor(frame)%FRAMES)+FRAMES)%FRAMES;
 const leg=f===1?-2:f===3?2:0,arm=f===1?2:f===3?-2:0,bounce=f===2?-1:0;
 const r=(x,y,w,h,color)=>{if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(flip?W-x-w:x,y+bounce,w,h);};
 // Boots, toes and cloth sway are controlled by individual walking frames.
 r(5+leg,20,4,3,p.boots);r(11-leg,20,4,3,p.boots);
 r(5+leg,22,5,1,p.edge);r(10-leg,22,5,1,p.edge);
 r(6+leg,18,3,3,p.pants);r(11-leg,18,3,3,p.pants);
 // Three recognizable outfits: adventurer's cape, scholar's mantle and guard tabard.
 r(4,13,12,8,p.dark);r(3+arm,14,3,7,p.clothShadow);r(14-arm,14,3,7,p.clothShadow);
 r(5,11,10,8,p.edge);r(6,12,8,7,p.clothShadow);
 r(6,13,7,5,p.cloth);r(7,13,2,6,p.clothLight);
 if(id===0){r(8,12,5,6,p.cloth);r(8,16,5,2,p.gold);r(9,17,2,2,p.metal);}
 else if(id===1){r(8,11,5,8,p.clothLight);r(9,12,3,6,p.cloth);r(9,17,2,2,p.shine);r(6,17,8,1,p.gold);}
 else{r(8,11,5,8,p.cloth);r(7,13,7,2,p.clothLight);r(8,17,5,2,p.gold);r(9,18,2,1,p.metal);}
 // Shoulders and swinging hands
 r(4-arm,12,3,4,p.cloth);r(13+arm,12,3,4,p.cloth);
 r(4-arm,15,2,3,p.skinShadow);r(14+arm,15,2,3,p.skin);
 r(6,10,8,3,p.skinShadow);r(7,10,6,2,p.gold);
 // Distinct hair contours, ears, eyes and head direction
 r(6,3,8,9,p.edge);r(7,4,7,9,p.skinShadow);
 if(back){
  r(6,4,8,9,p.hair);r(7,5,5,5,p.hairLight);
  r(6,10,8,3,p.hair);r(7,12,6,2,p.gold);
 }else if(side){
  r(7,5,7,7,p.skin);r(6,3,8,4,p.hair);r(6,4,3,8,p.hair);
  r(8,5,5,2,p.hairLight);r(13,8,1,2,p.eye);
  r(12,10,2,1,p.skinShadow);
 }else{
  r(7,5,6,7,p.skin);r(6,4,8,4,p.hair);r(6,6,2,6,p.hair);
  r(7,4,6,2,p.hairLight);r(8,8,1,1,p.eye);r(12,8,1,1,p.eye);
  r(9,11,3,1,p.skinShadow);
 }
 if(id===1){r(5,4,2,10,p.hair);r(13,4,2,9,p.hairLight);}
 if(id===2){r(6,3,8,2,p.hair);r(5,6,2,2,p.hairLight);r(7,1,5,3,p.hair);}
 if(id===0){r(8,2,4,2,p.hairLight);r(11,3,4,2,p.hair);}
 // Named silhouette pieces are visible from all four angles.
 if(p.role==='blade'){
  r(side?2:16,9,2,11,p.edge);r(side?2:16,7,2,12,p.metal);
  r(side?2:16,7,1,8,p.shine);r(side?0:14,15,6,2,p.gold);
  r(side?2:16,17,2,5,p.dark);
 }else if(p.role==='staff'){
  r(16,4,2,20,p.edge);r(16,6,2,15,p.gold);
  r(15,1,4,6,p.metal);r(16,0,2,4,p.shine);
  r(14,4,6,2,p.clothLight);
 }else{
  r(16,9,2,13,p.edge);r(16,10,2,12,p.gold);
  r(15,7,4,5,p.metal);r(14,8,2,4,p.shine);
  r(15,11,4,2,p.edge);
 }
 // Cloak hem motif and glints convey an actual piece of gear.
 r(5,19,10,1,p.clothLight);r(6,20,7,1,p.clothShadow);
 return true;
}
function frameCanvas(id,dir,frame){
 const key=id+'|'+dir+'|'+frame;
 if(cache.has(key))return cache.get(key);
 const doc=typeof document!=='undefined'?document:root.document;
 if(!doc?.createElement)return null;
 const canvas=doc.createElement('canvas');if(!canvas||typeof canvas.getContext!=='function')return null;
 canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 renderFrame(ctx,id,dir,frame);cache.set(key,canvas);
 return canvas;
}
function draw(c,x,y,options={}){
 const id=Number.isFinite(+options.id)?Math.floor(+options.id):0;
 const dir=DIRS.includes(options.dir)?options.dir:'down';
 const walking=!!options.walking;
 const frame=walking?1+(Math.floor(Number(options.phase||0)*3)%3+3)%3:0;
 const sx=Math.round(x+4),sy=Math.round(y-1);
 const art=frameCanvas(id,dir,frame);
 c.fillStyle='#06121a7a';
 c.fillRect(Math.round(x+11),Math.round(y+41),28,5);
 c.fillStyle='#2d485452';c.fillRect(Math.round(x+15),Math.round(y+44),20,2);
 if(art&&typeof c.drawImage==='function'){
  c.imageSmoothingEnabled=false;
  c.drawImage(art,sx,sy,40,48);
 }else{
  // Node QA / older embedded WebViews can draw without an offscreen canvas.
  const pctx={
   set fillStyle(v){c.fillStyle=v;},
   fillRect(a,b,w,h){c.fillRect(sx+a*2,sy+b*2,w*2,h*2);}
  };
  renderFrame(pctx,id,dir,frame);
 }
 return {id,dir,frame,walking};
}
function metrics(){return {cachedFrames:cache.size,maxFrames:CAST.length*DIRS.length*FRAMES.length,logicalWidth:W,logicalHeight:H};}
const api={W,H,FRAMES,DIRS,CAST,draw,renderFrame,frameCanvas,metrics};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQSpriteAtlas=api;
})(typeof window!=='undefined'?window:globalThis);
