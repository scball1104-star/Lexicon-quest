/* Lexicon Quest — walkable interiors. Pure module: no DOM, no save-schema changes. */
(function(root){
'use strict';
const THEMES=[
 {name:'Willowmere',wall:'#6d6c53',trim:'#b9a073',floor:'#91775a',rug:'#457365',light:'#ffe4a5',wood:'#765438',linen:'#e9d5aa'},
 {name:'Hollowmere',wall:'#5d6971',trim:'#b2bac0',floor:'#737782',rug:'#655b85',light:'#b8d8ec',wood:'#5a596b',linen:'#d9e1e8'},
 {name:'Emberpeak',wall:'#5d4c48',trim:'#c18b66',floor:'#756258',rug:'#824735',light:'#ffaf70',wood:'#694837',linen:'#dbc4a1'},
 {name:'Valewyn',wall:'#6b7b86',trim:'#c0c9c9',floor:'#738c91',rug:'#4b7393',light:'#a3e4e6',wood:'#576775',linen:'#d8e6e1'},
 {name:'Whispering Desert',wall:'#bc9774',trim:'#e5c696',floor:'#ba9875',rug:'#9c654f',light:'#f6dda6',wood:'#806047',linen:'#f4dfba'},
 {name:'Skybound Isles',wall:'#6996a3',trim:'#c1dce4',floor:'#95b4bf',rug:'#6288a3',light:'#f7f1bd',wood:'#5e8294',linen:'#e7f4ed'},
 {name:'Hollow North',wall:'#759ba7',trim:'#cfebee',floor:'#abc9d3',rug:'#567b94',light:'#c1f8fe',wood:'#607c8b',linen:'#effbff'},
 {name:'First Library',wall:'#9d9a8e',trim:'#dbc89f',floor:'#c4b69e',rug:'#705f70',light:'#f8e0a7',wood:'#725e51',linen:'#f5ead4'}
];
const ROOMS={
 inn:{name:'Resthouse',npc:['Innkeeper','Host','Keeper of the Hearth','Watchkeeper','Dune Host','Skyport Host','North Watchkeeper','Scriptorium Host'],hotspots:[
   {id:'counter',type:'service',x:9,y:5,label:'Speak to the innkeeper',text:'The innkeeper offers a safe bed and a full party rest.'},
   {id:'registry',type:'lore',x:4,y:7,label:'Read the guest register',text:'Travelers have marked the roads they survived, and left kind messages for those who follow.'},
   {id:'hearth',type:'feature',x:14,y:7,label:'Examine the hearth',text:'The quiet hearth gives the party a moment to listen to the town outside.'}
 ]},
 shop:{name:'Provision House',npc:['Shopkeeper','Quartermaster','Provisioner','Supply Officer','Caravan Outfitter','Sky Quartermaster','Ice Provisioner','Archive Keeper'],hotspots:[
   {id:'counter',type:'service',x:9,y:5,label:'Browse supplies',text:'The shopkeeper lays out Potions and Ethers for the next expedition.'},
   {id:'shelves',type:'lore',x:4,y:7,label:'Inspect the travel shelves',text:'Rope, dry food, field lanterns and weatherproof satchels fill the store.'},
   {id:'stock',type:'feature',x:14,y:7,label:'Examine the supply ledger',text:'A neat ledger notes which roads are safest for the next shipment.'}
 ]},
 forge:{name:'Weaponsmith',npc:['Blacksmith','Glass Smith','Bell Smith','Royal Armorer','Copper Smith','Windwright','Iceglass Smith','Glyphsmith'],hotspots:[
   {id:'counter',type:'service',x:9,y:5,label:'Speak to the smith',text:'The smith can reinforce each companion’s weapon or armor tier.'},
   {id:'anvil',type:'lore',x:4,y:7,label:'Examine the anvil',text:'Every repaired blade bears a small maker’s mark; each realm forges its own style.'},
   {id:'furnace',type:'feature',x:14,y:7,label:'Inspect the furnace',text:'Coal, copper and carefully controlled heat keep the forge alive.'}
 ]}
};
const inBounds=(room,x,y)=>x>=0&&y>=0&&x<room.w&&y<room.h;
function create(kind,region=0,label=''){
 if(!ROOMS[kind])throw Error('Unknown interior '+kind);
 const w=18,h=12,r=Math.max(0,Math.min(7,region|0));
 const tiles=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||x===w-1||y===0||y===h-1?'wall':'floor'));
 const put=(x,y,t)=>{if(inBounds({w,h},x,y))tiles[y][x]=t;};
 for(let y=6;y<=9;y++)for(let x=7;x<=11;x++)put(x,y,'rug');
 for(let x=6;x<=11;x++)put(x,4,'counter');
 for(let x=7;x<=10;x++)put(x,2,'backwall');
 if(kind==='inn'){
  for(const [ax,ay] of [[2,3],[13,3]])for(let y=ay;y<=ay+1;y++)for(let x=ax;x<=ax+2;x++)put(x,y,'bed');
  put(4,6,'table');put(13,6,'table');put(3,8,'stool');put(14,8,'stool');
 }else if(kind==='shop'){
  for(const x of [2,3,4,13,14,15])for(const y of [2,3])put(x,y,'shelf');
  put(3,6,'crate');put(14,6,'crate');put(3,8,'stool');put(14,8,'stool');
 }else{
  for(const x of [2,3,4,13,14,15])put(x,2,'rack');
  put(3,6,'anvil');put(14,6,'furnace');put(3,8,'stool');put(14,8,'stool');
 }
 put(9,11,'exit');put(8,11,'wall');put(9,10,'floor');
 const opts=ROOMS[kind];
 const extra=opts.hotspots.map(o=>({...o}));
 extra.push({id:'door',type:'exit',x:9,y:10,label:'Return to town',text:'Step outside to the town square.'});
 return {kind,region:r,label:label||opts.name,w,h,x:9,y:9,tiles,objects:extra,npc:opts.npc[r],flavor:opts.name};
}
function blocked(room,x,y){return !inBounds(room,x,y)||['wall','counter','backwall','bed','shelf','crate','rack','anvil','furnace','table','stool'].includes(room.tiles[y][x]);}
function step(room,dx,dy){const x=room.x+dx,y=room.y+dy;if(Math.abs(dx)+Math.abs(dy)!==1||blocked(room,x,y))return false;room.x=x;room.y=y;return true;}
function adjacent(room){return room.objects.filter(o=>Math.abs(o.x-room.x)+Math.abs(o.y-room.y)<=1).sort((a,b)=>(Math.abs(a.x-room.x)+Math.abs(a.y-room.y))-(Math.abs(b.x-room.x)+Math.abs(b.y-room.y))||({service:0,lore:1,feature:2,exit:3}[a.type]-{service:0,lore:1,feature:2,exit:3}[b.type]));}
function route(room,tx,ty){if(blocked(room,tx,ty))return null;const q=[[room.x,room.y,[]]],seen=new Set([room.x+','+room.y]);for(let head=0;head<q.length;head++){const [x,y,path]=q[head];if(x===tx&&y===ty)return path;for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||blocked(room,nx,ny))continue;seen.add(k);q.push([nx,ny,[...path,[dx,dy]]]);}}return null;}
const fill=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.floor(x),Math.floor(y),w,h);};
function draw(room,c,tick=0,citizenAtlas=null){
 const P=THEMES[room.region],unit=40;
 c.imageSmoothingEnabled=false;
 for(let y=0;y<room.h;y++)for(let x=0;x<room.w;x++){
  const px=x*unit,py=y*unit,t=room.tiles[y][x],v=(x*5+y*7)%5;
  fill(c,px,py,unit,unit,P.floor);fill(c,px,py+38,unit,2,'#00000014');
  if(t==='wall'){fill(c,px,py,unit,unit,P.wall);fill(c,px,py+4,unit,4,P.trim);fill(c,px+4,py+12,32,2,'#ffffff1b');if(y===0&&x%4===0){fill(c,px+14,py+19,13,16,'#223844');fill(c,px+17,py+21,7,12,P.light);}continue;}
  fill(c,px+4+v*3,py+8+v*6,7,2,'#00000018');
  if(t==='rug'){fill(c,px,py,unit,unit,P.rug);fill(c,px,py,unit,3,P.trim);fill(c,px+4,py+4,32,32,'#ffffff0c');}
  if(t==='counter'||t==='backwall'){fill(c,px,py+8,40,32,P.wood);fill(c,px,py+8,40,5,P.trim);fill(c,px+4,py+20,30,2,'#00000044');}
  if(t==='bed'){fill(c,px+2,py+2,36,34,P.wood);fill(c,px+5,py+5,30,26,P.linen);fill(c,px+5,py+22,30,10,P.rug);fill(c,px+8,py+6,20,7,'#ffffff8c');}
  if(t==='shelf'||t==='rack'){fill(c,px+2,py+3,36,34,P.wood);for(let i=0;i<3;i++){fill(c,px+3,py+10+i*9,34,3,P.trim);for(let j=0;j<4;j++){const col=t==='shelf'?['#8cb4a0','#ceb985','#bb8b87','#7b9bb7'][j]:'#b8c4c8';fill(c,px+6+j*7,py+4+i*9,5,7,col);}}}
  if(t==='crate'){fill(c,px+4,py+6,32,28,P.wood);fill(c,px+6,py+7,28,5,P.trim);fill(c,px+16,py+7,4,27,'#ffffff2e');}
  if(t==='table'||t==='stool'){fill(c,px+3,py+10,34,22,P.wood);fill(c,px+3,py+9,34,6,P.trim);fill(c,px+7,py+31,5,7,'#2e2521');fill(c,px+29,py+31,5,7,'#2e2521');}
  if(t==='anvil'){fill(c,px+5,py+17,30,12,'#c9d2cf');fill(c,px+9,py+12,22,5,'#9db4b6');fill(c,px+16,py+28,11,9,'#434c57');}
  if(t==='furnace'){fill(c,px+4,py+2,32,36,'#342e2d');fill(c,px+8,py+8,24,23,'#b65736');const flick=(tick+x+y)%3;fill(c,px+10,py+21-flick*2,20,8,'#ffce7c');fill(c,px+15,py+15-flick,10,9,'#ffefbd');}
  if(t==='exit'){fill(c,px,py,40,40,'#344e4e');fill(c,px+7,py+9,26,19,P.trim);fill(c,px+10,py+12,20,15,'#29383b');}
 }
 // Floor accents, furniture lighting and warm counter lamps.
 for(const x of [4,13]){const px=x*40,py=60;fill(c,px,py,5,5,P.light);fill(c,px-4,py-3,13,2,P.trim);}
 for(const o of room.objects){const px=o.x*40,py=o.y*40;if(o.id==='door')continue;
  if(o.type==='service'){fill(c,px+8,py+29,24,6,'#13192399');fill(c,px+11,py+11,18,13,P.linen);fill(c,px+10,py+22,20,15,room.kind==='inn'?'#406e80':room.kind==='shop'?'#776e42':'#7b4539');fill(c,px+14,py+7,12,7,'#443d34');fill(c,px+17,py+15,3,3,'#303030');}
  else if(o.type!=='exit'){fill(c,px+16,py+19,8,14,P.light);fill(c,px+18,py+10,4,7,P.trim);if((tick+px+py)%3===0)fill(c,px+15,py+8,10,4,'#ffffdd88');}
 }
 // Service attendant has a character-art walking cycle when the atlas is loaded.
 if(citizenAtlas?.complete&&citizenAtlas.naturalWidth&&typeof c.drawImage==='function'){
  const role=room.kind==='inn'?0:room.kind==='shop'?4:3;
  const frame=[0,1,2,1][tick%4];
  fill(c,8*40+12,3*40+34,24,5,'#090e1155');
  c.drawImage(citizenAtlas,(role*3+frame)*56,0,56,66,8*40-2,3*40-29,49,64);
 }else{
  fill(c,8*40+14,3*40+25,16,8,'#090e1155');fill(c,8*40+12,3*40+13,19,20,room.kind==='forge'?'#8e5548':room.kind==='shop'?'#869a66':'#6896a3');fill(c,8*40+15,3*40+5,14,12,P.linen);fill(c,8*40+16,3*40+2,14,5,'#3f352b');
 }
 // Player character, emphasizing direction by a blue cloak and bright head.
 const hx=room.x*40,hy=room.y*40;
 fill(c,hx+10,hy+33,22,5,'#10202b66');fill(c,hx+13,hy+17,16,19,'#4c82b8');fill(c,hx+16,hy+9,12,12,'#e4b98b');fill(c,hx+14,hy+7,16,6,'#3e332e');fill(c,hx+15,hy+34,5,5,'#233d58');fill(c,hx+24,hy+34,5,5,'#233d58');
 // Signifier above the service point, not hovering over every furnishing.
 fill(c,9*40+14,5*40-10,12,12,'#10252a');fill(c,9*40+17,5*40-7,6,6,P.light);
 if(typeof c.createRadialGradient==='function'){
  const gl=c.createRadialGradient(13.9*40,6.0*40,20,13.9*40,6*40,180);
  if(gl&&typeof gl.addColorStop==='function'){gl.addColorStop(0,room.kind==='forge'?'#e97f392b':'#ffe5ad20');gl.addColorStop(1,'#00000000');fill(c,10,10,0,0,P.wall);c.fillStyle=gl;c.fillRect(0,0,room.w*40,room.h*40);}
 }
}
const api={create,blocked,step,adjacent,route,draw,THEMES,ROOMS};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQInteriors=api;
})(typeof window!=='undefined'?window:globalThis);
