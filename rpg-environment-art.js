/* Eight-region authored pixel scenery. Canvas-only, asset-free and deterministic.
 * Layered tile renderer is independent of collision, scene state, or save data.
 */
(function(root){
'use strict';
const palettes=[
 {ground:'#547c51',light:'#91ab71',dark:'#375b42',road:'#bea779',edge:'#8c7456',stone:'#aab29c',roof:'#586f86',roofHi:'#8fa4a8',wall:'#b89d75',wood:'#6b513c',glass:'#f4cf85',metal:'#c7b57c'},
 {ground:'#687880',light:'#a0b3b6',dark:'#455760',road:'#aeb1b1',edge:'#738086',stone:'#b6bbc1',roof:'#4a5d73',roofHi:'#93a7b4',wall:'#8b9ca4',wood:'#596272',glass:'#a9c5dc',metal:'#c9d4d5'},
 {ground:'#81604e',light:'#c28c59',dark:'#493732',road:'#bd936d',edge:'#7b5742',stone:'#8e8781',roof:'#514349',roofHi:'#88666a',wall:'#906f62',wood:'#55443b',glass:'#ffae69',metal:'#bca991'},
 {ground:'#597a78',light:'#acd0c8',dark:'#315c61',road:'#9cb0b4',edge:'#547c8a',stone:'#c3d1ce',roof:'#4e6c89',roofHi:'#acc1c6',wall:'#adbbc1',wood:'#586e75',glass:'#c2f5f1',metal:'#d1c79e'},
 {ground:'#c6a474',light:'#ebcb92',dark:'#98794c',road:'#d8b47d',edge:'#b18a61',stone:'#d7b88f',roof:'#966551',roofHi:'#d4a06c',wall:'#edcba0',wood:'#805b40',glass:'#ffe7aa',metal:'#efc77c'},
 {ground:'#6da7ad',light:'#cbece6',dark:'#477b91',road:'#9bb8c4',edge:'#627b9b',stone:'#e1eee3',roof:'#5c6eaf',roofHi:'#b0b9e3',wall:'#a2c8cf',wood:'#5b7093',glass:'#f8f3c4',metal:'#e4d7a8'},
 {ground:'#aecfd5',light:'#f0ffff',dark:'#749ba8',road:'#c5dae0',edge:'#87a9b3',stone:'#e7f7f8',roof:'#617d98',roofHi:'#cfdfeb',wall:'#b7d4da',wood:'#607887',glass:'#b6f3f7',metal:'#ddebef'},
 {ground:'#c9b79d',light:'#f1e9d1',dark:'#7e7b77',road:'#e3d3b1',edge:'#aba08d',stone:'#efdebd',roof:'#4d6676',roofHi:'#c6bca3',wall:'#bdb8ad',wood:'#544b49',glass:'#ffe9ae',metal:'#d8c393'}
];
const fill=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
const line=(c,x1,y1,x2,y2,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1+.5,y1+.5);c.lineTo(x2+.5,y2+.5);c.stroke();};
const noise=(x,y,s=0)=>(((x*17+y*41+s*11)*1103515245+12345)>>>0)%97;
function tile(c,x,y,t,r,tx,ty,tick,m){
 const p=palettes[r]||palettes[0],phase=(tick+tx*3+ty)%4,n=noise(tx,ty);
 const groundTypes=['sand','sandstone','sandroad','dune','oasis','mosaic','skygrass','planks','skywalk','skybridge','windstone','cloudbank','snow','permafrost','icebrick','icepath','frostmosaic','icewall','snowpine','vellum','parchment','letterpath','scriptmosaic','ink','inkwall','house'];
 if(!groundTypes.includes(t)&&t!=='road'&&t!=='plaza'&&t!=='stone'&&t!=='meadow'&&t!=='garden'&&t!=='flowers'&&t!=='water'&&t!=='marble')return false;
 // Establish a coherent ground field with broken-up dithering, then read-aligned seams.
 const floor=t==='house'?p.wall:['oasis','ink','cloudbank'].includes(t)?p.dark:
  ['dune','icewall','snowpine','inkwall'].includes(t)?p.dark:
  ['road','sandroad','skywalk','icepath','letterpath','skybridge','planks'].includes(t)?p.road:
  ['mosaic','windstone','frostmosaic','scriptmosaic','stone','plaza','sandstone','permafrost','icebrick','parchment'].includes(t)?p.stone:
  ['snow','vellum'].includes(t)?p.light:p.ground;
 fill(c,x,y,48,48,floor);
 if(t==='house'){
  const above=m?.tiles?.[ty-1]?.[tx],below=m?.tiles?.[ty+1]?.[tx],left=m?.tiles?.[ty]?.[tx-1],right=m?.tiles?.[ty]?.[tx+1];
  const top=above!=='house',bottom=below!=='house',sideL=left!=='house',sideR=right!=='house';
  fill(c,x,y,48,48,p.wall);fill(c,x+2,y+3,44,2,'#ffffff28');
  if(top){fill(c,x,y+1,48,21,p.roof);fill(c,x+2,y+4,44,5,p.roofHi);fill(c,x+5,y+10,38,3,'#11233722');fill(c,x,y+21,48,5,p.wood);}
  else{fill(c,x,y,48,8,p.roof);fill(c,x,y+8,48,3,p.roofHi);fill(c,x+12,y+18,16,17,p.wood);fill(c,x+15,y+20,10,13,p.glass);fill(c,x+18,y+19,3,16,p.wood);fill(c,x+12,y+26,16,2,p.wood);}
  if(bottom){fill(c,x,y+40,48,7,p.wood);fill(c,x+4,y+37,40,3,p.roofHi);}
  if(sideL)fill(c,x,y+26,4,21,p.wood);
  if(sideR)fill(c,x+44,y+26,4,21,p.wood);
  if(r===4&&top){fill(c,x+14,y-1,20,5,p.roofHi);}if(r===5&&top){fill(c,x+22,y+1,4,11,p.metal);}if(r===6&&top){fill(c,x+6,y+2,11,4,'#e1f2ff');}if(r===7&&top){fill(c,x+9,y+1,29,5,'#d4b889');}
  return true;
 }
 const sharp=['stone','plaza','sandstone','mosaic','windstone','permafrost','icebrick','frostmosaic','parchment','scriptmosaic','marble'].includes(t);
 if(sharp){
  fill(c,x,y+24,48,2,p.edge);fill(c,x+((ty&1)?28:14),y,2,24,p.edge);
  if(n%3===0)fill(c,x+5,y+10,10,2,p.light);
  if(n%4===1)fill(c,x+28,y+34,13,2,'#00000018');
  if(['mosaic','windstone','frostmosaic','scriptmosaic'].includes(t)){
   const core=r===4?'#e6d18e':r===5?'#92d0d4':r===6?'#7fc5d2':'#d8bf80';
   fill(c,x+16,y+14,16,3,p.edge);fill(c,x+22,y+8,4,26,p.edge);fill(c,x+19,y+19,10,10,core);fill(c,x+22,y+22,4,4,p.dark);
  }
 }
 if(['road','sandroad','skywalk','icepath','letterpath','skybridge','planks'].includes(t)){
  for(let i=0;i<3;i++){const sx=(i*17+n)%39+3,sy=(i*13+tx*7+ty*5)%37+4;fill(c,x+sx,y+sy,6,2,p.edge);}
  if(r===5||t==='planks'||t==='skybridge'){for(let i=0;i<4;i++){fill(c,x+1,y+i*12,46,2,p.wood);fill(c,x+5+(ty+i)%4,y+i*12+6,3,3,p.metal);}}
  if(r===7||t==='letterpath'){for(let i=0;i<2;i++){fill(c,x+8+i*23,y+8+((ty+i)%3)*10,8,2,'#8d7e69');fill(c,x+11+i*23,y+9+((ty+i)%3)*10,2,4,p.edge);}}
 }
 if(['sand','dune','sandstone','sandroad'].includes(t)){
  for(let i=0;i<4;i++){const bx=(n+i*13)%42+2,by=(n+i*17)%42+2;fill(c,x+bx,y+by,4+(i%2)*2,2,i%2?p.light:p.edge);}
  if(t==='dune'){for(let i=0;i<3;i++){fill(c,x+4+i*13,y+12+i*10,25,2,'#e3bc83');fill(c,x+10+i*13,y+16+i*10,15,2,p.ground);}}
 }
 if(['skygrass','snow','vellum','meadow','garden','flowers'].includes(t)){
  for(let i=0;i<6;i++){const bx=(n*3+i*11)%43+2,by=(n*2+i*19)%40+3;fill(c,x+bx,y+by,2+i%2,3,i%2?p.light:p.dark);}
  if(t==='snow')for(let i=0;i<3;i++)fill(c,x+5+i*14,y+9+(n+i*9)%26,6,2,'#ffffffaa');
  if(t==='vellum')for(let i=0;i<2;i++)fill(c,x+7,y+13+i*13,32,1,'#8f806b66');
 }
 if(t==='oasis'||t==='ink'||t==='cloudbank'||t==='water'){
  const aqua=t==='ink'?'#293a4e':t==='oasis'?'#377d80':t==='cloudbank'?'#3f7793':'#3b8c9a';
  fill(c,x,y,48,48,aqua);
  if(t==='cloudbank'){
   fill(c,x+5,y+21,35,14,'#d9eaf1');fill(c,x+11,y+11,25,16,'#f0faff');fill(c,x+18,y+5,13,9,'#ffffff');fill(c,x+3,y+33,40,6,'#a2d4e2');
  }else{
   for(let i=0;i<3;i++){let bx=((i*17+tx*7+phase*3)%42)+2;fill(c,x+bx,y+10+i*13,18,2,t==='ink'?'#8199b0':t==='oasis'?'#93d5c7':'#a0e2e3');}
  }
 }
 if(t==='icewall'||t==='icebrick'||t==='frostmosaic'||t==='icepath'||t==='permafrost'){
  if((n+tick)%6===0)fill(c,x+18,y+11,7,2,'#edffff');
  if(t==='icewall'){fill(c,x+4,y+3,40,40,'#8ab3c3');fill(c,x+4,y+3,40,7,'#deeff9');fill(c,x+27,y+8,3,35,'#5d8a9a');}
 }
 if(['inkwall','snowpine'].includes(t)){
  fill(c,x+5,y+5,38,39,p.dark);fill(c,x+8,y+1,32,8,p.roof);fill(c,x+10,y+10,28,6,p.metal);fill(c,x+18,y+18,12,21,t==='snowpine'?'#aecbd0':'#a1907c');
 }
 return true;
}
function prop(c,o,cam,r,tick){const p=palettes[r]||palettes[0],x=(o.x-cam.x)*48,y=(o.y-cam.y)*48; if(x < -120||x>850||y<-120||y>680)return;
 const type=o.type;
 if(type==='palm'){fill(c,x+21,y+23,7,28,p.wood);for(let i=0;i<5;i++){let xx=x+5+i*8;fill(c,xx,y+10+Math.abs(i-2)*3,24,5,'#4a805b');fill(c,xx+6,y+8+Math.abs(i-2)*3,12,3,'#a0be75');}return;}
 if(type==='market'){fill(c,x+4,y+15,40,24,p.wood);for(let i=0;i<5;i++)fill(c,x+5+i*8,y+5,8,12,i%2?'#d0ac6f':'#9e6657');fill(c,x+8,y+32,32,5,'#e3ca9d');return;}
 if(type==='copperlamp'||type==='frostfire'){fill(c,x+21,y+14,5,34,p.wood);fill(c,x+15,y+9,17,15,'#463e40');fill(c,x+17,y+11,13,10,((tick+o.x)%4<2)?p.glass:p.light);return;}
 if(type==='obelisk'||type==='auroraobelisk'||type==='pagefountain'){fill(c,x+6,y+36,36,9,p.edge);fill(c,x+12,y+29,24,7,p.metal);fill(c,x+17,y+5,14,26,type==='obelisk'?'#c79a6b':type==='auroraobelisk'?'#9bd4e0':'#e6d2ae');fill(c,x+20,y+10,8,14,((tick+o.y)%6<3)?p.glass:p.light);return;}
 if(type==='rotor'||type==='windsock'){fill(c,x+21,y+8,6,35,p.metal);if(type==='rotor'){fill(c,x+10,y+10,30,6,p.roofHi);fill(c,x+24,y+1,6,30,p.roofHi);}else{fill(c,x+24,y+8,25,8,'#d8d6b0');fill(c,x+32,y+12,17,4,p.roof);}return;}
 if(type==='airship'){fill(c,x+2,y+13,44,16,p.roof);fill(c,x+7,y+10,33,9,p.roofHi);fill(c,x+16,y+28,18,13,p.wood);fill(c,x+22,y+18,7,5,p.glass);return;}
 if(type==='skyflower'){fill(c,x+23,y+25,3,13,p.dark);for(let i=0;i<4;i++){fill(c,x+14+i*5,y+18+((i+tick)%2),7,6,i%2?'#f7f0b6':'#cca6d0');}return;}
 if(type==='snowpine'){fill(c,x+21,y+20,7,25,p.wood);for(let i=0;i<3;i++){fill(c,x+10+i*3,y+5+i*11,29-i*6,13,p.roof);fill(c,x+15+i*2,y+7+i*9,20-i*4,3,'#e9fcff');}return;}
 if(type==='crystal'){fill(c,x+7,y+35,35,6,p.dark);fill(c,x+18,y+6,13,34,'#7bc9d7');fill(c,x+20,y+10,4,22,'#d7faff');fill(c,x+7,y+19,12,17,'#9fdce6');return;}
 if(type==='booktower'){fill(c,x+9,y+5,30,39,p.wood);for(let i=0;i<4;i++){fill(c,x+11,y+7+i*9,26,3,p.metal);for(let j=0;j<4;j++)fill(c,x+13+j*6,y+11+i*9,4,5,['#8e7c87','#e4c27a','#66888a','#bd9271'][j]);}return;}
 if(type==='quill'||type==='goldscroll'){fill(c,x+12,y+24,28,10,p.wood);fill(c,x+16,y+20,20,6,p.light);fill(c,x+29,y+6,4,22,p.metal);fill(c,x+22,y+6,11,9,p.glass);return;}
 if(type==='carpet'){fill(c,x+3,y+27,42,17,'#a45f57');fill(c,x+5,y+30,38,3,'#f1bf86');fill(c,x+19,y+35,12,5,'#d9ae78');}
}
function service(c,x,y,o,r,tick){
 const p=palettes[r]||palettes[0],kind=o.type;
 const roof=kind==='inn'?p.roof:kind==='shop'?p.roofHi:p.wood;
 // Low, distinctive two-tile façade with a centered door and a hanging sign.
 fill(c,x-19,y+38,90,12,'#07121a66');
 fill(c,x-23,y-15,95,60,p.wall);
 fill(c,x-24,y-32,97,27,roof);fill(c,x-19,y-32,87,6,p.roofHi);fill(c,x-26,y-4,101,9,p.wood);
 if(r===4){fill(c,x-9,y-43,18,13,p.roofHi);fill(c,x+34,y-43,18,13,p.roofHi);}
 if(r===5){fill(c,x+41,y-52,5,22,p.metal);fill(c,x+32,y-48,22,6,p.roofHi);}
 if(r===6){fill(c,x-24,y-30,97,5,'#f1ffff');fill(c,x+2,y-39,16,8,'#e9f9ff');}
 if(r===7){for(let i=0;i<4;i++)fill(c,x-22+i*24,y-28,2,23,p.metal);}
 fill(c,x-10,y+12,26,34,p.wood);fill(c,x-6,y+15,18,29,'#20323b');fill(c,x+5,y+29,3,3,p.glass);
 for(const xx of [x-21,x+43]){fill(c,xx,y+3,18,21,p.wood);fill(c,xx+3,y+6,12,15,kind==='forge'?'#ffb46b':p.glass);fill(c,xx+8,y+6,2,15,p.wood);}
 fill(c,x+22,y-13,38,18,'#172931');fill(c,x+24,y-11,34,14,kind==='inn'?'#557d9d':kind==='shop'?'#ab8951':'#956b5e');
 c.font='bold 9px system-ui';c.fillStyle='#f9eccd';c.textAlign='center';c.textBaseline='middle';c.fillText(kind==='inn'?'INN':kind==='shop'?'SUPPLY':'FORGE',x+41,y-4);
 const gl=(tick+o.x+o.y)%4<2;
 if(kind==='forge'){fill(c,x+55,y+25,12,13,gl?'#ffca75':'#f98e54');fill(c,x+58,y+20,6,8,'#ffd89c');}
 if(kind==='inn'){fill(c,x-5,y-25,17,5,'#f0e1b1');fill(c,x+2,y-23,3,3,'#7a9eac');}
 if(kind==='shop'){fill(c,x-9,y-23,22,3,'#dccb9a');}
}
const api={palettes,tile,prop,service};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQEnvironmentArt=api;
})(typeof window!=='undefined'?window:globalThis);
