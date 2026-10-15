/* Lexicon Quest v66 | Creature Atelier
 * Eight hand-composed, recognizable pixel silhouettes, not palette swaps.
 * Three family accents, six animated poses and guardian crowns per realm.
 * Visual only; compatible with original v63 atlas render contract.
 */
(function(root){
'use strict';
const W=64,H=72,FRAMES=6;
const PALETTES=[
 {name:'Rootbound Sentinels',dark:'#1b392f',body:'#4d7151',light:'#88b573',glow:'#e1d797',metal:'#946f4e'},
 {name:'Silverglass Wraiths',dark:'#36364d',body:'#6d82a3',light:'#cad5e2',glow:'#e5d1ff',metal:'#9c93c7'},
 {name:'Cinder Beetles',dark:'#45272c',body:'#a85b3e',light:'#df8f51',glow:'#ffd37e',metal:'#5d4749'},
 {name:'Drowned Knights',dark:'#243c4c',body:'#487484',light:'#83bcb9',glow:'#c9f2df',metal:'#a5aba1'},
 {name:'Sand Stalkers',dark:'#534343',body:'#a07955',light:'#d7b78b',glow:'#f4e0b2',metal:'#80695b'},
 {name:'Storm Harriers',dark:'#394a68',body:'#6894ac',light:'#b1d4d7',glow:'#eaf0b5',metal:'#5c7190'},
 {name:'Frost Wolves',dark:'#394b65',body:'#7595a9',light:'#b6d9df',glow:'#e9faff',metal:'#6a8199'},
 {name:'Erasure Shades',dark:'#282c40',body:'#626077',light:'#a69bb1',glow:'#f1d4ac',metal:'#8e7897'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const idx=(v,n)=>((Math.floor(Number(v)||0)%n)+n)%n;
const block=(c,x,y,w,h,col)=>{if(w<=0||h<=0)return;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
function eye(c,x,y,p,w=3){block(c,x,y,w,3,p.glow);block(c,x+1,y,1,1,'#fffaf1');}
function shadow(c,w=40){block(c,Math.floor((W-w)/2),65,w,3,'#08152499');block(c,Math.floor((W-w)/2)+5,68,w-10,1,'#08152460');}
function vignette(c,p,variant,phase,boss){
 if(boss){
  block(c,9,9,46,3,p.glow+'50');
  block(c,11,12,42,2,p.metal);
  block(c,14,6,4,14,p.light);
  block(c,46,6,4,14,p.light);
  block(c,20,3,3,9,p.glow);
  block(c,41,3,3,9,p.glow);
 }
 if(variant===1){block(c,15,58,5,4,p.glow);block(c,44,56,4,3,p.glow);}
 if(variant===2){block(c,4,24,5,2,p.metal);block(c,54,18,5,2,p.metal);}
 if(phase===4){block(c,30,1,4,4,p.glow);block(c,29,5,6,2,p.glow+'a3');}
}
function roots(c,p,v,frame,boss){
 const sway=[0,1,1,0,-1,-1][frame],height=boss?7:0;
 shadow(c,42);
 for(let k=0;k<4;k++){
  const x=7+k*13;
  block(c,x,59+k%2*2,8,3,p.dark);block(c,x+2,53,5,8,p.metal);
 }
 block(c,20,33-height,23,27,p.dark);block(c,22,35-height,19,22,p.metal);
 for(let i=0;i<3;i++)block(c,25+i*6,36-height,2,21,p.body);
 block(c,19,42-height,6,8,p.body);block(c,42,43-height,6,7,p.body);
 block(c,17,23-height,30,22,p.dark);block(c,19,20-height,26,18,p.body);
 block(c,12+sway,14-height,40,17,p.light);block(c,6+sway,21-height,19,12,p.body);
 block(c,41+sway,21-height,17,12,p.body);
 for(let i=0;i<5;i++){
  const x=12+i*8+sway,y=11+(i%3)*2-height;
  block(c,x,y,8,6,i%2?p.body:p.light);
 }
 for(let i=0;i<3;i++){block(c,18+i*12,7-height+(i%2)*3,5,8,p.metal);}
 block(c,23,31-height,17,10,p.dark);
 eye(c,26,33-height,p);eye(c,36,33-height,p);
 if(v===1){block(c,13,39,7,14,p.light);block(c,46,39,6,14,p.light);}
 if(v===2){block(c,29,41,8,13,p.glow);}
}
function mirror(c,p,v,frame,boss){
 const sway=[0,1,2,1,0,-1][frame],lift=boss?6:0;
 shadow(c,28);block(c,15,62,33,2,p.glow+'40');
 block(c,23,23+sway-lift,18,32,p.dark);
 block(c,26,25+sway-lift,13,29,p.body);
 block(c,29,45+sway-lift,8,13,p.metal);
 for(let i=0;i<5;i++){
  const y=42+i*4+sway-lift,w=17+i%2*6;
  block(c,32-Math.floor(w/2),y,w,2,i%2?p.dark:p.body);
 }
 for(let k=0;k<4;k++){
  const sign=k%2?-1:1,x=sign>0?43+k*2:8+k*2;
  block(c,x,21+k*7+sway-lift,10,8,k%2?p.light:p.body);
  block(c,x+3,19+k*7+sway-lift,6,4,p.glow+'a0');
 }
 block(c,24,13+sway-lift,16,14,p.dark);
 block(c,26,14+sway-lift,12,10,p.light);
 eye(c,28,19+sway-lift,p,3);eye(c,35,19+sway-lift,p,3);
 for(let i=0;i<3;i++){
  const x=19+i*10+sway;
  block(c,x,6+i%2*3-lift,6,10,p.glow+'bd');
 }
 if(v===1)block(c,31,28-lift,3,18,p.glow);
 if(v===2){block(c,11,29,8,3,p.glow);block(c,47,34,9,3,p.glow);}
}
function forge(c,p,v,frame,boss){
 const pinch=[0,2,4,2,0,-2][frame],lift=boss?4:0;
 shadow(c,50);
 for(let k=0;k<3;k++){
  block(c,8+k*3,39+k*7,13,5,p.dark);block(c,42-k*2,40+k*7,14,5,p.dark);
 }
 block(c,11,38,43,20,p.dark);block(c,15,39,34,18,p.body);
 block(c,20,48,24,8,p.metal);block(c,23,49,18,4,p.glow+'8c');
 block(c,13,22+pinch/3-lift,39,21,p.dark);
 block(c,15,23+pinch/3-lift,35,16,p.body);
 block(c,19,20+pinch/3-lift,27,10,p.light);
 block(c,24,21+pinch/3-lift,17,4,p.glow+'b9');
 block(c,9,28-lift,10,13,p.dark);block(c,47,28-lift,9,13,p.dark);
 for(let i=0;i<3;i++){block(c,20+i*8,30-lift,4,4,p.glow);}
 block(c,25,11-lift,14,13,p.dark);block(c,27,14-lift,10,6,p.metal);
 eye(c,29,16-lift,p);eye(c,35,16-lift,p);
 if(v===1){block(c,17,36,6,13,p.glow);block(c,42,36,5,14,p.glow);}
 if(v===2){block(c,31,44,4,11,p.light);}
}
function drowned(c,p,v,frame,boss){
 const sway=[0,1,0,-1,0,1][frame],lift=boss?4:0;
 shadow(c,36);
 for(let i=0;i<2;i++){block(c,17+i*19,50,12,13,p.dark);block(c,19+i*19,52,9,10,p.metal);}
 block(c,15,28+sway-lift,35,29,p.dark);
 block(c,17,30+sway-lift,31,24,p.body);
 block(c,21,31+sway-lift,24,4,p.light);
 for(let i=0;i<3;i++){block(c,20+i*9,40+sway-lift,5,3,p.glow+'9c');}
 block(c,10,29+sway-lift,9,21,p.metal);block(c,47,29+sway-lift,10,21,p.metal);
 block(c,23,10+sway-lift,21,20,p.dark);
 block(c,25,12+sway-lift,17,15,p.metal);
 block(c,23,9+sway-lift,7,7,p.light);block(c,37,9+sway-lift,7,7,p.light);
 block(c,26,25+sway-lift,15,3,p.dark);
 eye(c,28,19+sway-lift,p);eye(c,37,19+sway-lift,p);
 block(c,17,18+sway-lift,7,7,p.body);block(c,44,18+sway-lift,7,7,p.body);
 if(v===1){block(c,2,17,4,40,p.metal);block(c,0,15,8,5,p.glow);}
 if(v===2){block(c,18,35,25,3,p.light);}
}
function dunes(c,p,v,frame,boss){
 const sway=[0,1,2,1,0,-1][frame],lift=boss?3:0;
 shadow(c,34);
 block(c,19,55,11,10,p.dark);block(c,36,55,11,10,p.dark);
 for(let i=0;i<4;i++)block(c,14+i*9,37+sway-lift,10,22+i%2*5,i%2?p.body:p.metal);
 block(c,15,22+sway-lift,36,22,p.dark);
 block(c,18,25+sway-lift,30,20,p.body);
 block(c,15,17+sway-lift,36,13,p.metal);
 block(c,18,11+sway-lift,29,17,p.dark);
 block(c,22,13+sway-lift,21,12,p.light);
 block(c,23,21+sway-lift,19,5,p.body);
 eye(c,27,19+sway-lift,p);eye(c,37,19+sway-lift,p);
 block(c,10,25+sway-lift,9,23,p.body);
 block(c,46,26+sway-lift,9,21,p.body);
 if(v===1){block(c,9,46,14,4,p.glow);block(c,44,45,13,4,p.glow);}
 if(v===2)for(let i=0;i<4;i++)block(c,24+i*5,32+sway,2,13,p.glow+'7f');
}
function harrier(c,p,v,frame,boss){
 const spread=[0,3,6,3,0,-2][frame],lift=boss?5:0;
 shadow(c,32);
 block(c,25,49-lift,6,15,p.dark);block(c,36,49-lift,6,15,p.dark);
 block(c,20,25-lift,25,29,p.dark);block(c,23,27-lift,20,25,p.body);
 block(c,25,34-lift,16,4,p.light);
 for(let i=0;i<5;i++){
  block(c,Math.max(1,17-i*3-spread),23+i*7-lift,12+spread/2,6,p.body);
  block(c,40+i*2+spread,22+i*7-lift,12,6,p.light);
 }
 block(c,25,13-lift,20,19,p.dark);block(c,29,13-lift,12,14,p.light);
 block(c,32,11-lift,5,8,p.glow);block(c,39,12-lift,6,8,p.metal);
 eye(c,31,21-lift,p);eye(c,38,21-lift,p);
 block(c,36,26-lift,11,4,p.glow);
 if(v===1){block(c,14,42,5,7,p.glow);block(c,47,45,5,7,p.glow);}
 if(v===2){block(c,28,52,4,11,p.metal);block(c,38,52,4,11,p.metal);}
}
function wolves(c,p,v,frame,boss){
 const sprint=[0,2,3,1,0,-2][frame],lift=boss?4:0;
 shadow(c,48);
 for(const dx of [12,23,39,49]){
  block(c,dx,42+sprint/2,8,21,p.dark);block(c,dx+1,44+sprint/2,6,13,p.body);
  block(c,dx+1,59+sprint/2,8,4,p.light);
 }
 block(c,15,31-lift,42,19,p.dark);block(c,17,33-lift,38,15,p.body);
 block(c,18,33-lift,27,5,p.light);
 block(c,4,35+sprint/2,16,7,p.body);block(c,1,29+sprint/2,9,7,p.light);
 block(c,32,19-lift,25,21,p.dark);block(c,35,21-lift,24,17,p.body);
 block(c,41,19-lift,8,7,p.light);
 block(c,52,21-lift,7,7,p.light);
 block(c,51,34-lift,13,7,p.light);
 block(c,57,34-lift,6,5,p.dark);
 block(c,57,30-lift,3,3,p.glow);
 eye(c,45,28-lift,p);
 if(v===1){block(c,34,19,8,5,p.glow);block(c,17,36,8,4,p.glow);}
 if(v===2){block(c,23,26,17,4,p.light);}
}
function shades(c,p,v,frame,boss){
 const sway=[0,1,2,1,0,-1][frame],lift=boss?6:0;
 shadow(c,30);
 for(let i=0;i<4;i++){
  block(c,13+i*10,37+sway-lift+(i%2)*3,10,22,p.dark);
  block(c,15+i*10,55+sway-lift+(i%2)*3,7,6,p.metal+'ad');
 }
 block(c,19,24+sway-lift,28,34,p.dark);
 block(c,23,27+sway-lift,22,29,p.body);
 block(c,28,29+sway-lift,12,24,p.metal);
 for(let i=0;i<5;i++)block(c,27,35+i*4+sway-lift,14-(i%3),1,p.glow);
 block(c,17,14+sway-lift,32,14,p.dark);
 block(c,22,12+sway-lift,23,17,p.body);
 block(c,26,16+sway-lift,17,8,p.light);
 eye(c,29,21+sway-lift,p);eye(c,37,21+sway-lift,p);
 for(let i=0;i<3;i++){
  const x=9+i*20,y=5+(i%2)*6+sway-lift;
  block(c,x,y,11,15,p.light+'af');
  for(let j=0;j<3;j++)block(c,x+2,y+3+j*4,7,1,p.dark);
 }
 if(v===1)block(c,9,43,12,5,p.glow);
 if(v===2)block(c,46,40,10,12,p.glow+'93');
}
const PAINTERS=[roots,mirror,forge,drowned,dunes,harrier,wolves,shades];
function paint(c,opts={}){
 const r=idx(opts.realm,8),v=idx(opts.variant,3),frame=idx(opts.frame,FRAMES);
 const p=PALETTES[r],boss=!!opts.boss;
 shadow(c,38);
 PAINTERS[r](c,p,v,frame,boss);
 vignette(c,p,v,frame,boss);
 return {realm:r,variant:v,frame,boss,kind:p.name};
}
function draw(c,x,y,opts={}){
 if(!c||typeof c.fillRect!=='function')return false;
 const width=opts.width||128,height=opts.height||144;
 if(typeof c.save==='function')c.save();
 try{
  if(typeof c.translate==='function')c.translate(x,y);
  if(typeof c.scale==='function')c.scale(width/W,height/H);
  paint(c,opts);
 }finally{if(typeof c.restore==='function')c.restore();}
 return true;
}
const api=Object.freeze({version:'v66',realms:PALETTES.map(p=>p.name),frames:FRAMES,variants:3,paint,draw});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV66Creatures=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
