/* Lexicon Quest v64 | Architectural World Director
 * Deterministic, region-authored architectural detail. Draws only within
 * existing world geometry; it NEVER changes collision, objects or quest data.
 * Source resolution: 48x48 overworld tiles, 40x40 indoor tiles.
 */
(function(root){
'use strict';
const TILE=48,ROOM_TILE=40,MAX_SCONCES=14;
const STYLES=Object.freeze([
 {name:'Willowmere',material:'oak and limestone',roof:'#58776d',roofEdge:'#b8c797',stone:'#b7b59c',face:'#ccbea0',beam:'#514c40',edge:'#304944',accent:'#e2c987',glow:'#ffe2a1',motif:'leaf'},
 {name:'Hollowmere',material:'silverglass and slate',roof:'#526981',roofEdge:'#a4aeca',stone:'#96a7ba',face:'#b2bfcd',beam:'#515b71',edge:'#3c485f',accent:'#d4c8e6',glow:'#d0e8f9',motif:'mirror'},
 {name:'Emberpeak',material:'basalt and copper',roof:'#754c44',roofEdge:'#e3a16d',stone:'#8f7a76',face:'#ac8774',beam:'#563f3d',edge:'#41343b',accent:'#ffc07a',glow:'#ffb765',motif:'forge'},
 {name:'Valewyn',material:'sea marble and bronze',roof:'#4a7078',roofEdge:'#acd8d0',stone:'#a6c1c0',face:'#bed7d1',beam:'#52767d',edge:'#2c5960',accent:'#f2dca8',glow:'#a4f2e0',motif:'wave'},
 {name:'Saffron Haven',material:'sandstone and glazed tile',roof:'#ac7457',roofEdge:'#f0c792',stone:'#cfb18c',face:'#e6c9a0',beam:'#997453',edge:'#8f694d',accent:'#ffecbb',glow:'#ffe7a8',motif:'sun'},
 {name:'Zephyr Landing',material:'skywood and brass',roof:'#607d9c',roofEdge:'#c0daeb',stone:'#9bbdc6',face:'#c6dfe2',beam:'#5f7890',edge:'#415c80',accent:'#fbdd9a',glow:'#d2eeff',motif:'wind'},
 {name:'Palehaven',material:'glacial stone and iron',roof:'#7894a9',roofEdge:'#e3f4ff',stone:'#acc5d2',face:'#d6e8ec',beam:'#6b8b9e',edge:'#537386',accent:'#edfbff',glow:'#daffff',motif:'snow'},
 {name:'The Scriptorium',material:'vellum and gilded granite',roof:'#7c7484',roofEdge:'#dfc6a0',stone:'#c2b7a7',face:'#e5d6b9',beam:'#6c6371',edge:'#4d4c5e',accent:'#f4d99d',glow:'#f3e6c1',motif:'script'}
]);
const SOLID=new Set(['wall','icewall','inkwall','snowpine','mountain','cliff','blackwall']);
const FLOORS=new Set(['floor','stone','plaza','road','marble','mosaic','parchment','vellum','letterpath','scriptmosaic','frostmosaic','icepath','iceglass','icebridge','sandstone','sandroad','skywalk','skybridge','skyplank','stormglass','wood','moss','carpet','rune','goldscript','windstone','permafrost','frostbrick']);
const HOUSE='house';
const rgba=(hex,opacity='ff')=>hex+opacity;
const rect=(c,x,y,w,h,color)=>{if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const hash=(x,y,seed=0)=>{let v=Math.imul((x|0)+177,374761393)^Math.imul((y|0)+509,668265263)^Math.imul((seed|0)+11,1274126177);v=Math.imul(v^(v>>>13),1274126177);return(v^(v>>>16))>>>0;};
const palette=r=>STYLES[Math.max(0,Math.min(7,Number(r)||0))];
function motif(c,x,y,r,scale=1,tick=0,quiet=false){
 const p=palette(r),w=Math.max(1,scale),t=quiet?0:Math.round(tick)%8;
 const box=(dx,dy,ww,hh,col=p.accent)=>rect(c,x+dx*w,y+dy*w,ww*w,hh*w,col);
 switch(p.motif){
 case 'leaf':
  box(2,2,3,7);box(0,3,2,3,p.roofEdge);box(5,3,2,3,p.roofEdge);box(1,1,5,2,p.accent);break;
 case 'mirror':
  box(1,1,6,7,p.edge);box(2,2,4,5,p.roofEdge);box(3,3,2,3,p.glow);break;
 case 'forge':
  box(3,1,2,3,p.glow);box(2,4,4,3,p.accent);box(1,7,6,1,p.roofEdge);break;
 case 'wave':
  box(0,4,3,2);box(2,3,3,2,p.roofEdge);box(4,5,3,2);box(5,2,2,2,p.glow);break;
 case 'sun':
  box(2,2,4,4,p.glow);box(0,3,2,2);box(6,3,2,2);box(3,0,2,2);box(3,6,2,2);break;
 case 'wind':
  box(0,2,6,2);box(2,4,6,2,p.roofEdge);box(5,1,3,1,p.glow);break;
 case 'snow':
  box(3,0,2,8);box(0,3,8,2);box(1,1,2,2,p.glow);box(5,5,2,2,p.glow);break;
 case 'script':
  box(1,1,6,1,p.roofEdge);box(1,3,5,1);box(2,5,5,1,p.glow);box(1,7,3,1);break;
 }
 if(!quiet&&t===0)box(7,0,1,1,p.glow);
}
function house(c,x,y,r,tx,ty,map){
 const p=palette(r),tiles=map.tiles;
 const top=tiles[ty-1]?.[tx]!==HOUSE,down=tiles[ty+1]?.[tx]!==HOUSE;
 const left=tiles[ty]?.[tx-1]!==HOUSE,right=tiles[ty]?.[tx+1]!==HOUSE;
 const n=hash(tx,ty,r);
 // Connected roof ornament and bevel, never a randomly broken rooftop.
 if(top){
  rect(c,x+2,y+2,44,3,p.roofEdge);
  rect(c,x+4,y+6,40,2,rgba(p.edge,'99'));
  for(let k=0;k<4;k++){
   rect(c,x+6+k*10,y+10+(k%2),7,2,rgba(p.roofEdge,'b6'));
   rect(c,x+10+k*10,y+14,2,6,rgba(p.edge,'99'));
  }
  if(n%5===0){rect(c,x+32,y-4,5,12,p.beam);rect(c,x+30,y-4,9,3,p.stone);}
 }else{
  // A row of timber uprights anchors second story windows.
  for(const dx of [3,42])rect(c,x+dx,y+6,3,30,p.beam);
  rect(c,x+4,y+8,40,3,rgba(p.roofEdge,'6c'));
  if(n%3!==0){
   rect(c,x+12,y+14,24,19,p.beam);
   rect(c,x+14,y+16,20,15,p.roof);
   rect(c,x+16,y+18,16,11,p.glow);
   rect(c,x+23,y+18,2,11,p.beam);
   rect(c,x+16,y+23,16,2,p.beam);
   rect(c,x+17,y+19,5,3,rgba('#ffffff','60'));
   rect(c,x+11,y+34,26,3,p.roofEdge);
  }else{
   // A tiled relief: this region-specific crest makes towns legible.
   rect(c,x+17,y+17,14,15,p.beam);rect(c,x+19,y+19,10,11,p.face);
   motif(c,x+20,y+20,r,1,0,true);
  }
 }
 if(left){rect(c,x+1,y+24,3,18,p.edge);rect(c,x+4,y+25,2,16,p.roofEdge);}
 if(right){rect(c,x+44,y+24,3,18,p.edge);rect(c,x+42,y+25,2,16,p.roofEdge);}
 if(down){
  rect(c,x+2,y+39,44,5,p.beam);
  rect(c,x+4,y+37,40,2,p.roofEdge);
  for(let i=0;i<4;i++)rect(c,x+7+i*10,y+44,6,1,rgba(p.face,'b5'));
 }
 if(r===2&&top){
  // Copper forge vents
  rect(c,x+11,y+3,7,10,p.beam);rect(c,x+9,y+2,11,3,p.roofEdge);
  rect(c,x+13,y-2,3,4,rgba(p.glow,'8c'));
 }
 if(r===5&&top){rect(c,x+19,y+3,3,14,p.accent);rect(c,x+22,y+2,7,4,p.roofEdge);}
 if(r===6&&top){rect(c,x+5,y+4,38,2,'#ffffffa3');rect(c,x+11,y+6,6,5,p.glow);}
 if(r===7&&down){for(let i=0;i<3;i++)rect(c,x+8+i*13,y+34,9,1,p.accent);}
 return true;
}
function dungeonWall(c,x,y,r,tx,ty,map){
 const p=palette(r),n=hash(tx,ty,r),below=map.tiles[ty+1]?.[tx];
 const exposed=!!below&&!SOLID.has(below)&&below!==HOUSE;
 // Only adorn *existing* solid wall tiles, preserving collision and line of sight.
 rect(c,x+2,y+3,44,2,rgba(p.roofEdge,'76'));
 rect(c,x+1,y+39,46,3,rgba(p.edge,'a8'));
 rect(c,x+4,y+43,40,3,p.edge);
 for(let i=0;i<3;i++){
  rect(c,x+3+13*i,y+8,11,1,rgba(p.stone,'9f'));
  if((i+tx+ty)%2===0)rect(c,x+6+13*i,y+15,1,14,rgba(p.roofEdge,'67'));
 }
 if(n%4===0){
  rect(c,x+17,y+15,14,18,p.edge);
  rect(c,x+19,y+17,10,14,p.stone);
  motif(c,x+20,y+18,r,1,0,true);
 }
 if(exposed){
  rect(c,x+2,y+32,44,5,rgba(p.beam,'a0'));
  rect(c,x+5,y+34,38,2,p.roofEdge);
  for(let k=0;k<3;k++)rect(c,x+7+k*15,y+36,10,2,rgba(p.face,'8c'));
 }
 if(r===0&&n%5===0){rect(c,x+7,y+4,4,20,p.roof);rect(c,x+6,y+5,2,22,p.roofEdge);}
 if(r===1&&n%4===0){rect(c,x+10,y+4,4,12,p.roofEdge);rect(c,x+13,y+8,10,2,p.glow);}
 if(r===2){rect(c,x+4,y+36,40,2,rgba(p.glow,'63'));}
 if(r===3&&n%3===0){for(let k=0;k<3;k++)rect(c,x+9+k*11,y+6+k*7,7,1,p.roofEdge);}
 if(r===4&&n%3===0){rect(c,x+3,y+15,42,2,p.stone);rect(c,x+12,y+7,24,2,p.accent);}
 if(r===5&&n%5===0){rect(c,x+22,y+5,3,31,p.roofEdge);rect(c,x+13,y+10,21,3,p.accent);}
 if(r===6&&n%4===0){rect(c,x+11,y+6,7,23,p.roofEdge);rect(c,x+34,y+4,6,28,p.glow);}
 if(r===7&&n%5===0){for(let k=0;k<5;k++)rect(c,x+9,y+9+k*6,29-(k%2)*5,1,p.accent);}
 return true;
}
function floor(c,x,y,r,tx,ty,type){
 const p=palette(r),n=hash(tx,ty,r);
 if(n%3===0){
  rect(c,x+5,y+29,11,1,rgba(p.edge,'54'));
  rect(c,x+20,y+18,15,1,rgba(p.stone,'63'));
 }
 if(n%19===0){
  rect(c,x+21,y+21,8,1,rgba(p.accent,'a0'));
  rect(c,x+24,y+18,2,8,rgba(p.accent,'8c'));
 }
 if(r===2&&n%11===0){rect(c,x+4,y+38,14,2,rgba(p.glow,'54'));}
 if(r===3&&n%9===0){rect(c,x+14,y+34,18,1,rgba(p.glow,'58'));}
 if(r===4&&n%9===0){rect(c,x+7,y+30,12,1,rgba(p.accent,'68'));}
 if(r===6&&n%10===0){rect(c,x+28,y+9,8,1,rgba(p.glow,'a1'));}
 if(r===7&&n%7===0){
  rect(c,x+9,y+10,12,1,rgba(p.edge,'82'));
  rect(c,x+14,y+13,16,1,rgba(p.accent,'69'));
 }
 return true;
}
function tile(c,x,y,type,r,tx,ty,map,place){
 if(!c||!map?.tiles||!type||place==='world')return false;
 if(type===HOUSE&&place==='town')return house(c,x,y,r,tx,ty,map);
 if(SOLID.has(type)&&place==='dungeon')return dungeonWall(c,x,y,r,tx,ty,map);
 if(place==='dungeon'&&FLOORS.has(type))return floor(c,x,y,r,tx,ty,type);
 return false;
}
function wallSconce(c,x,y,p,style,tick,quiet){
 const offset=quiet?0:Math.floor(tick/9)%3;
 // Tiny wall-mounted prop; all pixels remain within an impassable tile.
 rect(c,x+20,y+24,8,4,p.beam);
 rect(c,x+23,y+16,2,9,p.accent);
 rect(c,x+18,y+13,12,4,p.stone);
 rect(c,x+20,y+7-offset,8,8,p.glow);
 rect(c,x+22,y+5-offset,4,6,'#fff5d6');
 if(style==='torch'){rect(c,x+24,y+3-offset,2,5,rgba(p.glow,'99'));}
}
function dress(c,map,camera,s,tick=0,quiet=false){
 if(!c||!map?.tiles||!camera||!s||s.place==='world')return {sconces:0,crests:0};
 const p=palette(s.region),minX=Math.max(0,Math.floor(camera.x)-1),maxX=Math.min(map.w||map.tiles[0]?.length||0,Math.ceil(camera.x)+18),minY=Math.max(0,Math.floor(camera.y)-1),maxY=Math.min(map.h||map.tiles.length,Math.ceil(camera.y)+14);
 let sconces=0,crests=0;
 const objects=new Set((map.objects||[]).map(o=>o.x+','+o.y));
 for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
  const t=map.tiles[y]?.[x],n=hash(x,y,s.region),px=Math.round((x-camera.x)*TILE),py=Math.round((y-camera.y)*TILE);
  if(objects.has(x+','+y))continue;
  if(s.place==='dungeon'&&SOLID.has(t)&&FLOORS.has(map.tiles[y+1]?.[x])&&n%9===0&&sconces<MAX_SCONCES){
   wallSconce(c,px,py,p,s.region===2?'torch':'lamp',tick,quiet);
   sconces++;
  }
  if(s.place==='town'&&t===HOUSE&&map.tiles[y-1]?.[x]===HOUSE&&n%8===0){
   // Hanging district crests only on existing buildings, not walkable paths.
   rect(c,px+4,py+11,3,19,p.beam);
   rect(c,px+5,py+10,22,2,p.roofEdge);
   rect(c,px+8,py+13,15,18,p.roof);
   rect(c,px+10,py+14,11,2,p.accent);
   motif(c,px+12,py+19,s.region,.8,0,true);
   crests++;
  }
 }
 return {sconces,crests};
}
function light(c,map,camera,s,tick=0,quiet=false){
 if(!c?.createRadialGradient||!map?.tiles||!camera||!s)return 0;
 const p=palette(s.region);
 let count=0;
 const add=(sx,sy,size,color)=>{
  if(count>=14||sx<-70||sx>886||sy<-70||sy>694)return;
  const g=c.createRadialGradient(sx,sy,4,sx,sy,size);
  if(!g?.addColorStop)return;
  g.addColorStop(0,rgba(color,'22'));g.addColorStop(.38,rgba(color,'0d'));g.addColorStop(1,rgba(color,'00'));
  c.fillStyle=g;c.fillRect(sx-size,sy-size,2*size,2*size);count++;
 };
 if(s.place==='dungeon'){
  const h=map.h||map.tiles.length,w=map.w||map.tiles[0].length;
  for(let y=Math.max(0,Math.floor(camera.y));y<Math.min(h,Math.ceil(camera.y)+13);y++)for(let x=Math.max(0,Math.floor(camera.x));x<Math.min(w,Math.ceil(camera.x)+17);x++){
   if(count>=12)break;
   if(!SOLID.has(map.tiles[y]?.[x])||!FLOORS.has(map.tiles[y+1]?.[x])||hash(x,y,s.region)%9!==0)continue;
   add((x-camera.x)*TILE+24,(y-camera.y)*TILE+17,58,p.glow);
  }
 }
 if(s.place==='town'){
  for(const o of map.objects||[]){
   if(!['inn','shop','forge','copperlamp','frostfire','market'].includes(o.type))continue;
   add((o.x-camera.x)*TILE+24,(o.y-camera.y)*TILE+16,o.type==='forge'?84:56,p.glow);
  }
 }
 return count;
}
function interior(c,room,tick=0,quiet=false){
 if(!c||!room?.tiles||!room.kind)return 0;
 const p=palette(room.region),r=room.region||0;
 let ornaments=0;
 // Fine edge treatment on existing tiled floor and structural furniture.
 for(let y=0;y<room.h;y++)for(let x=0;x<room.w;x++){
  const t=room.tiles[y]?.[x],px=x*ROOM_TILE,py=y*ROOM_TILE,h=hash(x,y,r);
  if(t==='wall'){
   rect(c,px+1,py+1,38,2,rgba(p.roofEdge,'7a'));
   rect(c,px+3,py+31,34,2,rgba(p.edge,'83'));
   if(y===0&&x%3===1){rect(c,px+12,py+9,16,24,p.edge);rect(c,px+14,py+10,12,19,p.face);motif(c,px+17,py+16,r,1,0,true);ornaments++;}
  }else if(t==='rug'){
   rect(c,px+3,py+3,34,2,rgba(p.accent,'a0'));
   rect(c,px+3,py+35,34,2,rgba(p.accent,'a0'));
   rect(c,px+3,py+3,2,34,rgba(p.accent,'aa'));
   rect(c,px+35,py+3,2,34,rgba(p.accent,'aa'));
   if(h%5===0){rect(c,px+16,py+15,8,1,p.accent);rect(c,px+19,py+12,2,9,p.accent);}
  }else if(t==='counter'||t==='backwall'){
   rect(c,px+2,py+10,36,2,rgba(p.roofEdge,'a9'));
   rect(c,px+4,py+26,32,2,rgba(p.edge,'8a'));
   if(x%3===0)rect(c,px+16,py+17,8,8,p.edge);
  }else if(t==='shelf'||t==='rack'){
   if(y===2){rect(c,px+5,py+7,4,8,rgba(p.accent,'b7'));rect(c,px+12,py+8,3,7,rgba(p.roofEdge,'c1'));}
  }else if(t==='bed'){
   rect(c,px+5,py+7,24,2,rgba('#ffffff','75'));
  }else if(t==='furnace'){
   rect(c,px+10,py+17,21,2,rgba(p.glow,'c6'));
  }
 }
 // Service crest is a fixed sign on the back wall, not an interactable object.
 const bx=9*ROOM_TILE+12,by=ROOM_TILE+6;
 rect(c,bx-4,by-4,25,24,p.beam);rect(c,bx-2,by-2,21,20,p.roof);
 motif(c,bx+4,by+3,r,1,quiet?0:tick,quiet);
 // The central carpet has a craft seal unique to the interior type.
 const cx=9*ROOM_TILE+5,cy=7*ROOM_TILE+5;
 if(room.kind==='inn'){rect(c,cx+5,cy+10,23,2,rgba(p.accent,'8e'));rect(c,cx+10,cy+6,13,10,rgba(p.accent,'8a'));}
 else if(room.kind==='shop'){rect(c,cx+11,cy+4,14,14,rgba(p.roofEdge,'65'));rect(c,cx+13,cy+6,10,10,rgba(p.accent,'6e'));}
 else{rect(c,cx+7,cy+9,22,3,rgba(p.glow,'8a'));rect(c,cx+13,cy+2,9,15,rgba(p.glow,'7a'));}
 return ornaments;
}
const api=Object.freeze({version:'v64',styles:STYLES,tile,dress,light,interior,hash,motif,solid:SOLID,floors:FLOORS});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV64Architecture=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
