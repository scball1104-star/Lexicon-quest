/* Lexicon Quest v67 | Willowmere visual reconstruction.
 * Original pixel-authored canvas scenery over the existing 48px world grid.
 * No collision, save, quest, equipment, or enemy changes.
 */
(function(root){
'use strict';
const C={grass:'#517d54',light:'#719664',dark:'#315e49',leaf:'#447d58',canopy:'#8aaf75',deep:'#204b41',road:'#b5a27b',roadLight:'#d3bf94',roadDark:'#8d8169',edge:'#71805d',stone:'#aea996',stoneLight:'#dad0b5',stoneDark:'#777f79',mortar:'#717b76',wall:'#e1c9a1',wallLight:'#f2dcad',wood:'#695849',woodLight:'#b58f62',woodDark:'#3a3839',roof:'#497779',roofLight:'#7fac9c',roofDark:'#2b5660',gold:'#c6a675',warm:'#f6d3a0',water:'#376c79',foam:'#98d4ca',waterDark:'#254d66',flower:'#eabf9d',shadow:'#193a39'};
const roads=new Set(['road','plaza','stone','bridge','wood']),ground=new Set(['grass','meadow','flowers','garden','forest','moss','tree']);
const at=(m,x,y)=>m?.tiles?.[y]?.[x];
const h=(x,y,k=0)=>{let z=Math.imul(x+71,73856093)^Math.imul(y+43,19349663)^Math.imul(k+29,83492791);z=Math.imul(z^(z>>>15),2246822519);return(z^(z>>>13))>>>0;};
const q=(c,x,y,w,hh,color)=>{if(w<=0||hh<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(hh));};
function flowers(c,x,y,tx,ty,n=8){
 for(let i=0;i<n;i++){const z=h(tx,ty,i),sx=x+5+z%38,sy=y+6+(z>>>8)%36;
  q(c,sx,sy,2,5,i%3===0?C.light:C.deep);q(c,sx-2,sy+2,2,2,C.leaf);
  if(z%8===0){q(c,sx-2,sy-2,6,3,i%2?C.flower:'#ece0b4');q(c,sx,sy-3,3,2,C.warm);}
 }
}
function tree(c,x,y,tx,ty){const k=h(tx,ty),shift=k%3-1;
 q(c,x+8,y+32,34,9,'#15393489');q(c,x+21,y+22,10,24,C.woodDark);q(c,x+24,y+24,3,18,C.woodLight);
 q(c,x+5+shift,y+11,21,22,C.deep);q(c,x+25+shift,y+8,18,26,C.deep);
 q(c,x+11+shift,y+1,31,28,C.deep);q(c,x+7+shift,y+8,35,24,C.leaf);
 q(c,x+13+shift,y-2,28,19,'#5c9164');q(c,x+18+shift,y-6,18,12,C.canopy);
 q(c,x+5,y+16,12,8,C.light);q(c,x+32,y+12,10,8,'#6fa56c');
 for(let i=0;i<5;i++){const z=h(tx,ty,i+45);q(c,x+10+z%29,y+5+(z>>>9)%15,3,3,i%2?'#a4ba81':'#3f7b54');}
}
function greenery(c,x,y,t,tx,ty){
 q(c,x,y,48,48,t==='tree'||t==='forest'?C.dark:t==='moss'?'#5b8267':t==='garden'?'#597954':C.grass);
 q(c,x,y,48,4,'#83a57a23');q(c,x,y+39,48,9,'#23443a36');
 for(let i=0;i<3;i++){const k=h(tx,ty,i+20);q(c,x+k%40,y+(k>>>8)%39,7,4,i%2?'#8aaa6c40':'#264d4145');}
 flowers(c,x,y,tx,ty,t==='flowers'||t==='garden'?18:8);
 if(t==='tree'||t==='forest')tree(c,x,y,tx,ty);
 return true;
}
function path(c,x,y,t,tx,ty,m){
 const k=h(tx,ty);
 if(t==='wood'){
  q(c,x,y,48,48,'#846b53');for(let i=0;i<4;i++){q(c,x,y+i*12,48,2,C.woodDark);q(c,x+((tx+i)%2?14:33),y+i*12,2,11,C.woodDark);q(c,x+4,y+i*12+3,26,2,C.woodLight);}
 }else if(t==='stone'||t==='plaza'||t==='bridge'){
  q(c,x,y,48,48,C.stone);
  for(let i=0;i<3;i++){let yy=y+i*16;q(c,x,yy,48,2,C.mortar);q(c,x+(i%2?13:32),yy,2,15,C.mortar);q(c,x+5+(k+i*17)%16,yy+5,12,3,C.stoneLight);q(c,x+25+(k+i*11)%10,yy+11,9,2,C.stoneDark);}
  if(t==='bridge'){q(c,x+2,y+1,4,46,C.wood);q(c,x+42,y+1,4,46,C.wood);}
 }else{
  q(c,x,y,48,48,C.road);
  for(let j=0;j<3;j++){let yy=y+j*16;q(c,x,yy,48,2,C.roadDark);for(let i=0;i<3;i++){let xx=x+(i*17+j*9+tx*11)%49;q(c,xx,yy+4,10+i%2*4,2,i%2?C.roadLight:'#a39372');}}
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
   if(roads.has(at(m,tx+dx,ty+dy)))continue;
   if(dx===-1){q(c,x,y,3,48,C.edge);q(c,x+3,y+7,2,18,C.grass);}
   if(dx===1){q(c,x+45,y,3,48,C.edge);q(c,x+43,y+20,2,18,C.grass);}
   if(dy===-1){q(c,x,y,48,3,C.edge);q(c,x+11,y+3,15,2,C.grass);}
   if(dy===1){q(c,x,y+45,48,3,C.edge);q(c,x+22,y+43,15,2,C.grass);}
  }
 }
 return true;
}
function brook(c,x,y,tx,ty,tick,m){
 const k=h(tx,ty),flow=Math.floor(tick/7)%11;
 q(c,x,y,48,48,C.water);q(c,x,y+31,48,17,C.waterDark);
 for(let i=0;i<4;i++){let xx=x+(k+i*17+flow)%36,yy=y+5+i*11;q(c,xx,yy,10,2,i%2?C.foam:'#64aeba');q(c,xx+4,yy-2,5,1,'#c0ead6');}
 if(!['water','bridge'].includes(at(m,tx,ty-1))){q(c,x,y,48,5,C.stoneDark);q(c,x+2,y+2,43,2,C.stoneLight);}
 if(!['water','bridge'].includes(at(m,tx,ty+1))){q(c,x,y+42,48,6,C.stoneDark);q(c,x+3,y+44,42,2,C.stoneLight);}
 for(let side=0;side<2;side++){const left=side===0,nt=at(m,tx+(left?-1:1),ty);if(nt==='water'||nt==='bridge')continue;q(c,x+(left?0:44),y,4,48,C.stoneDark);q(c,x+(left?1:45),y+5,2,33,C.stoneLight);}
 return true;
}
function home(c,x,y,tx,ty,m){
 const above=at(m,tx,ty-1)==='house',below=at(m,tx,ty+1)==='house',left=at(m,tx-1,ty)==='house',right=at(m,tx+1,ty)==='house',k=h(tx,ty);
 q(c,x,y,48,48,C.wall);q(c,x+2,y+4,44,36,C.wallLight);q(c,x,y+40,48,8,C.woodDark);
 q(c,x+1,y+4,4,41,C.wood);q(c,x+43,y+4,4,41,C.wood);
 if(!above){
  q(c,x-1,y,50,26,C.roofDark);q(c,x+2,y+2,44,6,C.roofLight);q(c,x+4,y+10,40,9,C.roof);q(c,x+2,y+20,44,7,C.roofDark);
  for(let i=0;i<5;i++){q(c,x+i*10,y+9+i%2*2,9,2,'#b9d0ac81');q(c,x+i*10+2,y+16,5,2,'#294f567d');}
 }else{
  q(c,x,y,48,9,C.roofDark);q(c,x+3,y+4,42,3,C.roofLight);q(c,x+4,y+14,40,3,'#ad8862');
  for(let i=0;i<2;i++){let xx=x+8+i*19;q(c,xx,y+22,13,15,C.wood);q(c,xx+2,y+23,9,12,'#668f82');q(c,xx+4,y+24,5,8,C.warm);}
  q(c,x+22,y+21,4,17,C.wood);q(c,x+5,y+37,38,3,C.woodLight);
 }
 if(!left)q(c,x,y+25,3,21,C.woodDark);if(!right)q(c,x+45,y+25,3,21,C.woodDark);
 if(!below){q(c,x+2,y+40,44,4,C.wood);q(c,x+4,y+44,40,3,'#a68f72');if(k%3===0){q(c,x+12,y+38,24,4,C.leaf);q(c,x+17,y+36,4,4,C.flower);}}
 return true;
}
function tile(c,x,y,t,r,tx,ty,tick,m,place){
 if(!c||r!==0||place!=='town'&&place!=='world')return false;
 if(ground.has(t))return greenery(c,x,y,t,tx,ty);
 if(roads.has(t))return path(c,x,y,t,tx,ty,m);
 if(t==='water')return brook(c,x,y,tx,ty,tick,m);
 if(t==='house'&&place==='town')return home(c,x,y,tx,ty,m);
 return false;
}
function lantern(c,x,y,tick){
 q(c,x+13,y+31,22,6,'#133b3c70');q(c,x+21,y+7,6,30,C.woodDark);q(c,x+22,y+5,4,29,C.gold);q(c,x+17,y+6,15,3,C.woodDark);
 q(c,x+19,y-1,11,10,C.wood);q(c,x+21,y+1,7,7,Math.floor(tick/6)%3===1?'#fff0b3':C.warm);
 q(c,x+22,y,5,2,'#ece1bd');q(c,x+17,y+10,15,3,C.woodDark);
}
function planter(c,x,y,tx,ty){
 q(c,x+3,y+33,40,10,'#243f3b70');q(c,x+8,y+30,32,9,C.stone);q(c,x+10,y+27,28,5,C.stoneLight);q(c,x+12,y+23,24,6,C.leaf);
 for(let i=0;i<4;i++)q(c,x+13+i*6,y+20+(h(tx,ty,i)%3),4,5,i%2?C.flower:'#efe4bd');
}
function overlay(c,m,cam,tick,place){
 if(place!=='town')return {planters:0,lamps:0};
 let planters=0,lamps=0;const occupied=new Set((m.objects||[]).map(o=>o.x+','+o.y));
 for(let ty=Math.max(0,Math.floor(cam.y)-1);ty<Math.min(m.h,Math.ceil(cam.y+14));ty++)
 for(let tx=Math.max(0,Math.floor(cam.x)-1);tx<Math.min(m.w,Math.ceil(cam.x+18));tx++){
  if(occupied.has(tx+','+ty))continue;const t=at(m,tx,ty),k=h(tx,ty),x=(tx-cam.x)*48,y=(ty-cam.y)*48;
  if(['grass','meadow','garden'].includes(t)&&k%29===0){planter(c,x,y,tx,ty);planters++;}
  if(t==='road'&&k%53===0&&at(m,tx+1,ty)==='grass'){lantern(c,x+23,y-9,tick);lamps++;}
 }
 return {planters,lamps};
}
function service(c,x,y,o,tick){
 if(!o||!['inn','shop','forge'].includes(o.type))return false;
 const type=o.type,roof=type==='inn'?C.roof:type==='shop'?'#9a7b5a':'#7c6870',edge=type==='inn'?C.roofDark:type==='shop'?'#695a51':'#4c4853';
 const title=type==='inn'?'LANTERN INN':type==='shop'?'PROVISIONS':'MOSSFORGE',glow=type==='forge'?'#ffa576':C.warm;
 q(c,x-33,y+34,119,15,'#1535338c');q(c,x-30,y-3,113,45,'#c2aa8a');q(c,x-27,y+1,106,36,C.wall);
 for(let i=0;i<6;i++)q(c,x-27+i*17,y+9,2,24,'#b6a18058');
 q(c,x-38,y-31,128,29,edge);q(c,x-32,y-35,116,13,roof);q(c,x-27,y-30,106,5,'#d8b88d88');
 for(let i=0;i<9;i++){q(c,x-31+i*13,y-21+i%2,12,2,'#ffffff28');q(c,x-27+i*13,y-12,10,2,'#213f4e60');}
 q(c,x-35,y-5,122,6,C.woodDark);q(c,x-31,y-9,114,4,C.woodLight);
 for(const bx of [x-22,x+52]){q(c,bx,y+9,18,20,C.woodDark);q(c,bx+3,y+12,12,14,'#496e76');q(c,bx+4,y+13,10,10,glow);q(c,bx+8,y+12,2,14,'#644d43');q(c,bx+3,y+18,12,2,'#644d43');}
 q(c,x+8,y+8,28,34,C.woodDark);q(c,x+12,y+12,20,29,'#34483e');q(c,x+15,y+15,14,26,'#3a5452');q(c,x+29,y+26,3,4,C.warm);
 q(c,x+4,y-15,38,11,C.woodDark);q(c,x+6,y-13,34,8,'#304e52');q(c,x+8,y-11,30,5,C.gold);
 c.save?.();c.font='bold 7px system-ui';c.fillStyle='#182f36';c.textAlign='center';c.textBaseline='middle';c.fillText(title,x+23,y-8);c.restore?.();
 if(type==='inn'){q(c,x-1,y-29,13,7,C.warm);q(c,x+2,y-31,6,5,'#efe8cd');}
 if(type==='forge'){q(c,x+76,y+26,13,14,'#654842');q(c,x+78,y+26-tick%3,9,10,'#ec8153');q(c,x+80,y+29,5,4,'#ffe0a3');}
 if(type==='shop'){for(let i=0;i<3;i++){q(c,x+39+i*10,y+34,9,8,C.wood);q(c,x+41+i*10,y+30,5,6,'#b79d6f');}}
 return true;
}
const api={version:'v67',palette:C,tile,overlay,service,hash:h};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV67Willowmere=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);