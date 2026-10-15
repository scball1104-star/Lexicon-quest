/* Lexicon Quest v63 — environmental detailing atlas.
 * Pixel-authored connected road masonry, market flourishes, weathered facades,
 * library glyphs and scene lighting. No map edits or collision changes.
 */
(function(root){
'use strict';
const THEMES=[
 {floral:'#d6c481',foliage:'#61945c',stone:'#cfbb91',shadow:'#223d37',metal:'#e9c985',light:'#fff2bb'},
 {floral:'#d8c4ec',foliage:'#648b93',stone:'#bbc6d6',shadow:'#30445d',metal:'#c7dff5',light:'#e9f3ff'},
 {floral:'#ffd27f',foliage:'#9a7460',stone:'#a99584',shadow:'#382d38',metal:'#f6c27d',light:'#ffe1a0'},
 {floral:'#a7e2cd',foliage:'#558b8e',stone:'#c5d1cc',shadow:'#31535f',metal:'#a9e3ef',light:'#dcf6e9'},
 {floral:'#f9dcac',foliage:'#ab8f5e',stone:'#ead4a4',shadow:'#765547',metal:'#fff1be',light:'#fff3d7'},
 {floral:'#efffe4',foliage:'#6fb0ad',stone:'#cfecf0',shadow:'#486889',metal:'#c2e1ff',light:'#fffade'},
 {floral:'#d5f9ff',foliage:'#86b6c5',stone:'#e8f7fc',shadow:'#6d8d9e',metal:'#bcefff',light:'#ffffff'},
 {floral:'#fbe7bd',foliage:'#899589',stone:'#e6d4b1',shadow:'#544f5b',metal:'#f0c982',light:'#faf4df'}
];
const ROAD=new Set(['road','stone','plaza','marble','sandroad','sandstone','skywalk','icepath','letterpath','planks','skybridge']);
const GARDEN=new Set(['grass','meadow','flowers','garden','skygrass','snow','vellum','sand']);
const WATER=new Set(['water','canal','river','oasis']);
const RECT=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};
const hash=(a,b,c=0)=>{let n=Math.imul(a+41,374761393)^Math.imul(b+17,668265263)^Math.imul(c+23,1274126177);n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;};
function detail(c,x,y,t,realm,tx,ty,m,place,tick=0){
 if(!c||!t||place==='world')return false;
 const p=THEMES[Math.max(0,Math.min(7,Number(realm)||0))],h=hash(tx,ty,realm),floor=m?.tiles||[];
 if(ROAD.has(t)){
  // Neighbor-aware cobbles tile seamlessly across crossroads and lanes.
  const up=ROAD.has(floor[ty-1]?.[tx]),dn=ROAD.has(floor[ty+1]?.[tx]);
  const left=ROAD.has(floor[ty]?.[tx-1]),right=ROAD.has(floor[ty]?.[tx+1]);
  if(!left){RECT(c,x,y,2,48,p.shadow+'66');RECT(c,x+2,y+3,2,40,p.stone+'89');}
  if(!right){RECT(c,x+46,y,2,48,p.shadow+'65');RECT(c,x+44,y+3,2,40,p.stone+'82');}
  if(!up){RECT(c,x,y,48,2,p.stone+'96');RECT(c,x+3,y+2,42,2,p.shadow+'55');}
  if(!dn){RECT(c,x,y+46,48,2,p.shadow+'66');RECT(c,x+3,y+44,42,2,p.stone+'72');}
  for(let i=0;i<5;i++){
   const bx=5+((h+i*19)%37),by=4+((h>>>i+i*11)%37);
   RECT(c,x+bx,y+by,5+i%3,1,(i%2?p.shadow:p.stone)+'5a');
   if(i<2&&t!=='planks')RECT(c,x+bx+2,y+by+2,1,3,p.shadow+'49');
  }
  if(['mosaic','scriptmosaic','frostmosaic','letterpath'].includes(t)||realm===7&&h%8===0){
   const mx=x+19,my=y+18;
   RECT(c,mx,my,9,2,p.metal+'b0');RECT(c,mx+4,my-3,2,11,p.metal+'a0');
  }
  return true;
 }
 if(GARDEN.has(t)){
  const qty=t==='flowers'||t==='garden'?4:2;
  for(let k=0;k<qty;k++){
   const cx=x+6+((h+k*19)%34),cy=y+8+((h>>>k+k*13)%30);
   RECT(c,cx,cy,2,5,p.foliage+'c0');RECT(c,cx-3,cy+1,4,2,p.foliage+'bd');
   if(t==='flowers'||t==='garden'||(h+k)%7===0){
    RECT(c,cx-2,cy-2,5,2,p.floral);RECT(c,cx,cy-4,2,6,p.light);
   }
  }
  if(realm===6||t==='snow')for(let j=0;j<3;j++){
   const xx=x+((h+j*13)%42),yy=y+((h+j*17)%44);
   RECT(c,xx,yy,5,1,'#ffffffd1');
  }
  return true;
 }
 if(WATER.has(t)){
  for(let j=0;j<3;j++){
   const shift=(Math.floor(tick/9)+j*7+tx*3+ty)%13;
   const yy=y+8+j*15;
   RECT(c,x+2+shift,yy,8+(j%2)*7,2,p.light+'a0');
   RECT(c,x+22+(shift%7),yy+4,7,1,p.stone+'71');
  }
  if(!WATER.has(floor[ty-1]?.[tx])){RECT(c,x,y,48,4,p.stone+'90');RECT(c,x+5,y+5,31,2,'#d2f9f68b');}
  if(!WATER.has(floor[ty+1]?.[tx]))RECT(c,x+5,y+43,38,3,p.stone+'82');
  return true;
 }
 if(t==='house'){
  const above=floor[ty-1]?.[tx],below=floor[ty+1]?.[tx],edgeL=floor[ty]?.[tx-1]!=='house',edgeR=floor[ty]?.[tx+1]!=='house';
  if(above!=='house'){
   // Shadow beneath eaves anchors timber to the world, with ridge and tile rows.
   RECT(c,x+2,y+24,44,4,p.shadow+'a1');
   for(let i=0;i<5;i++){RECT(c,x+3+i*9,y+8+(i%2),7,2,p.stone+'8c');}
   RECT(c,x+5,y+1,38,2,p.metal+'70');
  }else{
   RECT(c,x+3,y+9,42,2,p.shadow+'7a');
   RECT(c,x+5,y+12,3,22,p.metal+'75');
   RECT(c,x+39,y+12,3,22,p.metal+'75');
   if(h%3===0){
    RECT(c,x+15,y+17,18,17,p.shadow);
    RECT(c,x+17,y+19,14,12,p.light+'e0');
    RECT(c,x+23,y+19,2,12,p.shadow);
    RECT(c,x+17,y+23,14,2,p.shadow+'c0');
    RECT(c,x+18,y+20,4,3,'#fff4cfb5');
   }
  }
  if(edgeL)RECT(c,x+1,y+24,4,19,p.shadow+'d2');
  if(edgeR)RECT(c,x+43,y+24,4,19,p.shadow+'d2');
  if(below!=='house'){
   RECT(c,x+2,y+41,44,4,p.shadow+'d0');
   if(h%3===1){
    RECT(c,x+12,y+32,24,9,p.foliage);
    for(let i=0;i<4;i++)RECT(c,x+14+i*6,y+30+(i%2),3,4,p.floral);
   }
  }
  return true;
 }
 // Stone dungeon floors use subtle etched wear, not random procedural noise.
 if(['floor','marble','mosaic','scriptmosaic','frostmosaic','permafrost','icebrick','windstone','parchment','vellum'].includes(t)){
  if(h%3===0){
   RECT(c,x+7,y+12,16,1,p.stone+'72');RECT(c,x+22,y+12,1,5,p.shadow+'8a');
   RECT(c,x+28,y+31,13,1,p.shadow+'82');
  }
  if(place==='dungeon'&&h%11===0){
   RECT(c,x+20,y+18,8,2,p.metal+'72');RECT(c,x+23,y+14,2,10,p.metal+'75');
  }
  return true;
 }
 return false;
}
function props(c,m,cam,s,tick=0){
 if(!c||!m||!cam||!s||s.place==='world')return 0;
 const realm=Math.max(0,Math.min(7,Number(s.region)||0)),p=THEMES[realm];
 let count=0;
 const tile=m.tiles||[];
 for(let ty=Math.floor(cam.y);ty<Math.min(tile.length,Math.floor(cam.y)+14);ty++){
  for(let tx=Math.floor(cam.x);tx<Math.min(tile[ty]?.length||0,Math.floor(cam.x)+18);tx++){
   if(tx<0||ty<0)continue;
   const t=tile[ty]?.[tx],h=hash(tx,ty,realm);
   if((t==='road'||t==='plaza')&&h%29===0&&s.place==='town'){
    const x=(tx-cam.x)*48,y=(ty-cam.y)*48;
    RECT(c,x+39,y+11,3,25,p.shadow);
    RECT(c,x+36,y+8,9,4,p.metal);
    RECT(c,x+37,y+4,7,7,p.light);
    RECT(c,x+35,y+4,11,1,p.shadow);
    RECT(c,x+34,y+10,13,2,p.metal);
    count++;
   }
   if((t==='grass'||t==='meadow'||t==='garden')&&h%53===0&&s.place==='town'){
    const x=(tx-cam.x)*48,y=(ty-cam.y)*48;
    RECT(c,x+5,y+31,36,7,p.shadow+'b5');
    RECT(c,x+8,y+28,30,6,p.stone);
    for(let j=0;j<5;j++){
     RECT(c,x+10+j*5,y+22-(j%2),4,7,p.foliage);
     RECT(c,x+11+j*5,y+21-(j%2),2,2,p.floral);
    }
    count++;
   }
  }
 }
 return count;
}
const api={version:'v63',THEMES,ROAD,GARDEN,WATER,hash,detail,props};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV63World=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
