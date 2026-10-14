/* Willowmere | Rootbound Archive: 48px authored, deterministic first-region scene pass.
 * Pure canvas: no new collision, objects, story flags, assets or save migrations.
 */
(function(root){
'use strict';
const S=48;
const P={leaf:'#396347',grass:'#547b4e',grassLight:'#7c9b67',forest:'#31593e',road:'#c2ae82',roadLight:'#dec99c',roadDark:'#89785d',water:'#397e94',waterLight:'#a7d6d3',stone:'#a4ada1',stoneLight:'#d1cfb6',mortar:'#697872',wood:'#87694c',woodHi:'#ba986d',woodDark:'#493c36',wall:'#465159',shadow:'#263440',gold:'#f0d39a',moss:'#62816c'};
const fill=(c,x,y,w,h,v)=>{c.fillStyle=v;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
const h=(x,y,k=0)=>{let n=Math.imul(x+11,374761393)^Math.imul(y+17,668265263)^Math.imul(k+3,1274126177);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
function detail(c,x,y,tx,ty,n,colors){for(let i=0;i<n;i++){const v=h(tx,ty,i),dx=v%41+3,dy=(v>>>9)%41+3;fill(c,x+dx,y+dy,2+v%3,1+(v>>>7)%2,colors[(v>>>15)%colors.length]);}}
const at=(m,x,y)=>m?.tiles?.[y]?.[x];
function tile(c,x,y,t,region,tx,ty,tick,m,place,floor){
 if(region!==0||place!=='town'&&!(place==='dungeon'&&floor===0))return false;
 const outdoor=place==='town',v=h(tx,ty),n=(tick+tx*5+ty*3)%11;
 if(outdoor){
  if(['grass','meadow','flowers','garden','forest','moss','tree'].includes(t)){
   fill(c,x,y,S,S,t==='forest'?P.forest:t==='moss'?P.moss:t==='tree'?'#294f3b':t==='garden'?'#62824e':P.grass);
   detail(c,x,y,tx,ty,7,[P.grassLight,P.leaf,'#87a56b','#3c6a49']);
   if(t==='forest'||t==='tree'){
    fill(c,x+13,y+31,23,11,'#193e32');fill(c,x+21,y+22,9,23,P.woodDark);
    fill(c,x+7,y+10,35,26,'#24583e');fill(c,x+11,y+3,27,25,'#346f4b');fill(c,x+16,y+8,11,8,'#569261');
    fill(c,x+7,y+22,8,6,'#3b7d51');fill(c,x+30,y+17,11,8,'#417b50');
   }
   if(t==='flowers'||t==='garden'){
    for(let i=0;i<5;i++){const v=h(tx,ty,i),fx=x+(v%35)+6,fy=y+((v>>>9)%32)+6;fill(c,fx,fy,2,8,'#37674c');fill(c,fx-3,fy,8,3,['#f5d5a4','#f0adad','#dad0f0'][i%3]);fill(c,fx,fy-1,2,5,'#ffe9b3');}
   }
   return true;
  }
  if(['road','bridge','plaza','stone','wood'].includes(t)){
   const paved=t==='plaza'||t==='stone'||t==='bridge';
   fill(c,x,y,S,S,t==='wood'?'#886c52':paved?P.stone:P.road);
   if(t==='wood'){
    for(let i=0;i<4;i++){fill(c,x,y+i*12,48,2,P.woodDark);fill(c,x+((ty+i)%2?16:31),y+i*12,2,11,'#604933');fill(c,x+6,y+i*12+4,13,2,P.woodHi);}
   }else if(paved){
    for(let i=0;i<3;i++){let yy=y+i*16;fill(c,x,yy,48,2,P.mortar);fill(c,x+(i%2?30:16),yy,2,16,P.mortar);fill(c,x+5+(v%13),yy+6,9,2,P.stoneLight);}
    if(t==='bridge'){fill(c,x+2,y+2,4,44,'#655b49');fill(c,x+42,y+2,4,44,'#655b49');}
   }else{
    detail(c,x,y,tx,ty,7,[P.roadLight,P.roadDark,'#aa9772']);
    if(!['road','plaza','stone','bridge','wood'].includes(at(m,tx,ty-1)))fill(c,x,y,48,3,'#92825e');
    if(!['road','plaza','stone','bridge','wood'].includes(at(m,tx,ty+1)))fill(c,x,y+44,48,4,'#92825e');
    if(!['road','plaza','stone','bridge','wood'].includes(at(m,tx-1,ty)))fill(c,x,y,3,48,'#978560');
    if(!['road','plaza','stone','bridge','wood'].includes(at(m,tx+1,ty)))fill(c,x+45,y,3,48,'#978560');
   }
   return true;
  }
  if(t==='water'){
   fill(c,x,y,48,48,P.water);
   for(let i=0;i<3;i++){const xx=x+((h(tx,ty,i)+n*5)%37)+3;fill(c,xx,y+9+i*13,11,2,i%2?'#75c6c7':P.waterLight);}
   for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]])if(at(m,tx+dx,ty+dy)!=='water'&&at(m,tx+dx,ty+dy)!=='bridge'){if(dx===0)fill(c,x,y+(dy>0?42:1),48,3,'#c9c99e');else fill(c,x+(dx>0?44:1),y,3,48,'#a6bea1');}
   return true;
  }
  if(t==='house'){
   const above=at(m,tx,ty-1)==='house',below=at(m,tx,ty+1)==='house';
   fill(c,x,y,48,48,'#c7b28a');fill(c,x+2,y+4,44,5,'#efdec0');
   if(!above){fill(c,x-1,y+1,50,25,'#547777');fill(c,x+2,y+4,44,5,'#7b9b92');fill(c,x+5,y+11,38,5,'#396464');fill(c,x,y+23,48,5,P.woodDark);}
   else{fill(c,x,y,48,9,'#547777');fill(c,x+1,y+9,46,4,'#59736c');}
   if(below){fill(c,x+8,y+26,12,14,P.wood);fill(c,x+10,y+28,8,10,'#efc77d');fill(c,x+30,y+26,12,14,P.wood);fill(c,x+32,y+28,8,10,'#efc77d');}
   else{fill(c,x,y+40,48,6,P.woodDark);fill(c,x+4,y+37,40,3,'#e1ca9a');}
   if(at(m,tx-1,ty)!=='house')fill(c,x,y+27,3,17,'#745b49');
   if(at(m,tx+1,ty)!=='house')fill(c,x+45,y+27,3,17,'#745b49');
   return true;
  }
  return false;
 }
 // Rootbound Archive Floor I, warm sandstone over deep ink masonry.
 if(t==='wall'){
  fill(c,x,y,48,48,'#222e37');
  fill(c,x+2,y+2,44,44,'#485660');fill(c,x+4,y+5,40,36,'#5a6866');
  fill(c,x,y+23,48,3,'#293c42');fill(c,x+23+(ty%2?9:-9),y,3,24,'#34434c');
  fill(c,x+6,y+6,10,2,'#879381');fill(c,x+31,y+34,12,2,'#34434d');
  if(['floor','stone','wood','carpet','moss'].includes(at(m,tx,ty+1))){fill(c,x,y+38,48,8,'#1c2e32');fill(c,x,y+39,48,2,'#b7a981');fill(c,x+5,y+43,38,2,'#8d856c');}
  return true;
 }
 if(['floor','stone','wood','carpet','moss','rune'].includes(t)){
  const wood=t==='wood',moss=t==='moss',carpet=t==='carpet';
  fill(c,x,y,48,48,wood?'#80654b':carpet?'#73474f':moss?'#6d7569':'#929488');
  if(wood){for(let i=0;i<4;i++){fill(c,x,y+i*12,48,2,'#523e34');fill(c,x+12+((tx+i)%2)*18,y+i*12,2,11,'#644d3b');fill(c,x+4,y+i*12+5,27,1,'#a08360');}}
  else if(carpet){fill(c,x+2,y+2,44,44,'#854e57');fill(c,x+6,y+5,36,39,'#ad7a63');fill(c,x+8,y+7,32,35,'#6b3f50');fill(c,x+21,y+13,6,22,'#d7af7b');fill(c,x+13,y+21,22,6,'#b98f68');}
  else{for(let i=0;i<3;i++){fill(c,x,y+i*16,48,2,'#626c68');fill(c,x+(i%2?29:13),y+i*16,2,16,'#626c68');}
    detail(c,x,y,tx,ty,moss?10:4,moss?['#476455','#5a7b5c','#a4ad91']:['#b4b4a1','#707f79','#a49b82']);
    if(t==='rune'){fill(c,x+21,y+9,6,30,'#bd9c7a');fill(c,x+10,y+21,28,5,'#b39e88');}
  }
  // Contact shadow beside stone walls, but never obscure the walkable center.
  if(at(m,tx,ty-1)==='wall')fill(c,x,y,48,7,'#26363e70');
  if(at(m,tx-1,ty)==='wall')fill(c,x,y,6,48,'#26363e55');
  return true;
 }
 return false;
}
function lamp(c,x,y,tick){
 fill(c,x+20,y+21,7,24,'#423b34');fill(c,x+17,y+8,14,17,'#473e3a');fill(c,x+19,y+10,10,13,(tick%5<3)?'#ffd58c':'#e4ad6f');fill(c,x+16,y+6,16,4,'#94795a');fill(c,x+20,y+2,8,5,'#cbb37e');
}
function bookshelf(c,x,y){
 fill(c,x+4,y+4,40,44,'#322f33');fill(c,x+7,y+8,34,34,'#634835');
 for(let j=0;j<3;j++){fill(c,x+8,y+9+j*11,32,2,'#ac8b62');for(let i=0;i<6;i++){fill(c,x+9+i*5,y+11+j*11,3+(i%2),8,['#91a18e','#bd806b','#c8b28b','#707f8d'][((i+j)%4)]);}}
 fill(c,x+4,y+42,40,4,'#3d3032');
}
function pillar(c,x,y){fill(c,x+13,y+14,22,30,'#2b3539');fill(c,x+11,y+8,26,31,'#a1a396');fill(c,x+15,y+11,18,25,'#c3bda3');fill(c,x+9,y+35,30,8,'#565e5c');fill(c,x+12,y+5,24,6,'#d0c7aa');}
function service(c,x,y,o,tick){
 const which=o.type,roof=which==='inn'?'#547b7f':which==='shop'?'#87765d':'#715765',wall=which==='inn'?'#c9b28c':which==='shop'?'#c7bea4':'#9e9b93';
 fill(c,x-28,y+34,107,17,'#162d3290');
 fill(c,x-24,y-10,98,54,wall);
 fill(c,x-30,y-29,110,24,roof);fill(c,x-25,y-29,100,5,'#bac1a8');fill(c,x-27,y-12,104,6,'#393a3d');
 for(const dx of [-15,48]){fill(c,x+dx,y+4,17,20,'#684f43');fill(c,x+dx+3,y+7,11,13,which==='forge'?'#ef8b57':'#f2d08b');fill(c,x+dx+8,y+7,2,13,'#785d50');}
 fill(c,x+8,y+10,24,33,'#544334');fill(c,x+11,y+14,18,28,'#2f4544');fill(c,x+25,y+28,3,4,'#efcb85');
 fill(c,x+35,y-13,35,17,'#374b4c');fill(c,x+37,y-11,31,13,which==='inn'?'#457487':which==='shop'?'#977548':'#79515c');
 c.fillStyle='#fff0c6';c.textAlign='center';c.textBaseline='middle';c.font='bold 9px sans-serif';c.fillText(which==='inn'?'INN':which==='shop'?'SHOP':'SMITH',x+52,y-4);
 if(which==='forge'){fill(c,x+70,y+29,10,10,tick%3?'#f7ac60':'#ffd68c');fill(c,x+68,y+38,16,6,'#554642');}
 if(which==='inn')fill(c,x+13,y-24,15,5,'#e5d4a4');
}
function object(c,x,y,o,tick,place){
 if(place==='town'&&['inn','shop','forge'].includes(o.type)){service(c,x,y,o,tick);return true;}
 if(place!=='dungeon')return false;
 if(o.type==='lever'){fill(c,x+10,y+36,28,9,'#293a40');fill(c,x+16,y+29,16,8,'#9b8c74');fill(c,x+22,y+10,5,24,'#6f7471');fill(c,x+18,y+7,15,7,'#d4b878');return true;}
 if(o.type==='door'||o.type==='keydoor'){fill(c,x+3,y+1,42,47,'#2a3036');fill(c,x+8,y+5,32,43,'#796b5a');for(let j=0;j<3;j++)fill(c,x+12,y+10+j*12,24,4,'#56483e');fill(c,x+19,y+4,10,14,'#ceb477');return true;}
 if(o.type==='plate'){fill(c,x+5,y+31,38,11,'#4a585b');fill(c,x+12,y+34,24,6,'#c6a16c');return true;}
 if(o.type==='boulder'){fill(c,x+5,y+32,39,10,'#132a3077');fill(c,x+8,y+11,34,27,'#8c938b');fill(c,x+15,y+7,21,25,'#a5a89d');fill(c,x+14,y+17,21,4,'#d0bea0');return true;}
 if(o.type==='chest'){fill(c,x+8,y+28,32,14,'#593d31');fill(c,x+8,y+22,32,10,'#9e744d');fill(c,x+11,y+22,26,4,'#ccae77');fill(c,x+21,y+26,7,13,'#e0bd72');return true;}
 if(o.type==='spring'){fill(c,x+7,y+26,34,19,'#464e55');fill(c,x+11,y+29,26,11,'#6eb5a7');fill(c,x+16,y+22+(tick%3),17,7,'#b9e8ce');return true;}
 return false;
}
function overlay(c,m,cam,tick,place,floor){
 if(place==='town'){
  const lanterns=[[9,7],[15,7],[9,12],[15,12],[12,4],[12,16]];
  for(const [tx,ty] of lanterns){if(tx<cam.x-1||tx>cam.x+17||ty<cam.y-1||ty>cam.y+13)continue;lamp(c,(tx-cam.x)*48,(ty-cam.y)*48,tick);}
  // The square's own engraved stonework, visible before its interactable bell.
  const x=(12-cam.x)*48,y=(9-cam.y)*48;if(x>-60&&x<850&&y>-60&&y<700){fill(c,x+3,y+36,42,9,'#6d7166');fill(c,x+7,y+39,34,5,'#d9be83');}
 }else if(place==='dungeon'&&floor===0){
  const a=[[11,9],[18,9],[11,15],[18,15],[2,14],[9,14],[20,1],[25,1]];
  const b=[[2,3],[7,3],[11,2],[17,2],[20,2],[25,2],[22,11]];
  const l=[[3,17],[8,16],[12,9],[17,10],[16,3],[23,4],[20,8]];
  for(const [tx,ty] of b){if(tx<cam.x-1||tx>cam.x+17||ty<cam.y-1||ty>cam.y+13)continue;if(at(m,tx,ty)==='wall')continue;bookshelf(c,(tx-cam.x)*48,(ty-cam.y)*48);}
  for(const [tx,ty] of a){if(tx<cam.x-1||tx>cam.x+17||ty<cam.y-1||ty>cam.y+13)continue;if(at(m,tx,ty)==='wall')continue;pillar(c,(tx-cam.x)*48,(ty-cam.y)*48);}
  for(const [tx,ty] of l){if(tx<cam.x-1||tx>cam.x+17||ty<cam.y-1||ty>cam.y+13)continue;if(at(m,tx,ty)==='wall')continue;lamp(c,(tx-cam.x)*48,(ty-cam.y)*48,tick);}
 }
}
const api={tile,overlay,object,service,hash};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQWillowmereArt=api;
})(typeof window!=='undefined'?window:globalThis);
