/* Willowmere: authored chapter-one environments and narrative objects.
   Maps are pure data; this module has no DOM or save dependencies. */
(function(root){
'use strict';
const open=t=>!['tree','water','mountain','wall','house'].includes(t);
function field(w,h,fill){return {w,h,tiles:Array.from({length:h},()=>Array(w).fill(fill)),objects:[],title:'',flavor:''};}
function rect(m,x1,y1,x2,y2,t){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(x>=0&&y>=0&&x<m.w&&y<m.h)m.tiles[y][x]=t;}
function line(m,x1,y1,x2,y2,t){let x=x1,y=y1;for(;;){m.tiles[y][x]=t;if(x===x2&&y===y2)break;if(x!==x2)x+=Math.sign(x2-x);else y+=Math.sign(y2-y);}}
function obj(m,id,type,x,y,label,extra={}){m.objects.push({id,type,x,y,label,r:0,...extra});}
function add(m,f,id,type,x,y,label,extra={}){obj(m,`0-${f}-${id}`,type,x,y,label,{f,...extra});}
function world(m){
  // Rework the first region as a deliberately laid-out valley, not random noise.
  rect(m,2,2,23,22,'grass');
  for(let y=3;y<=21;y++)for(let x=3;x<=22;x++){
    if((x<8&&y<11)||(x>18&&y>15)||(x<9&&y>18))m.tiles[y][x]='forest';
    if((x+y*7)%23===0)m.tiles[y][x]='flowers';
  }
  rect(m,3,3,7,7,'water');rect(m,4,8,7,9,'water');
  rect(m,3,16,21,16,'water');rect(m,11,16,13,16,'bridge');
  rect(m,4,19,8,21,'tree');rect(m,18,18,22,20,'tree');
  // An east-west King's Road and a northbound Archive pilgrimage route.
  line(m,7,12,23,12,'road');line(m,12,12,12,15,'road');
  line(m,18,12,18,6,'road');line(m,12,12,18,12,'road');
  line(m,12,15,12,20,'road');line(m,7,12,7,14,'road');
  line(m,7,14,12,14,'road');line(m,9,8,9,12,'road');line(m,9,8,12,8,'road');
  line(m,12,8,12,12,'road');line(m,18,6,18,10,'road');
  rect(m,10,10,14,14,'meadow');line(m,12,10,12,15,'road');line(m,10,12,18,12,'road');
  rect(m,16,4,20,7,'moss');line(m,18,6,18,12,'road');
  m.objects.filter(o=>o.r===0).forEach(o=>m.tiles[o.y][o.x]='road');
  obj(m,'willow-sign','sign',15,10,'Fork in the Old Road',{text:'NORTH: ROOTBOUND ARCHIVE. WEST: WILLOWMERE. Beyond the eastern milestone, the roads have begun to forget their names.'});
  obj(m,'willow-stone','inscription',9,8,'The first milestone',{text:'A weathered stone reads: Every name is a promise that something will not be forgotten.'});
  obj(m,'willow-fieldcache','secret',7,14,'Hollow tree cache',{reward:'field'});
  m.title='Willowmere Valley';
  return m;
}
function town(){
 const m=field(25,19,'grass');m.title='Willowmere · Lantern Square';
 m.flavor='A warm riverside hamlet of cottages, flowerbeds and lantern posts. The square is easy to read at a glance, with clear lanes to every service.';
 rect(m,0,0,24,0,'tree');rect(m,0,1,0,18,'tree');rect(m,24,1,24,18,'tree');
 rect(m,9,1,15,2,'water');rect(m,11,1,13,3,'bridge');
 rect(m,2,2,8,5,'stone');rect(m,16,2,22,5,'stone');rect(m,3,3,7,4,'house');rect(m,17,3,21,4,'house');
 rect(m,2,12,9,16,'meadow');rect(m,16,12,22,16,'garden');rect(m,3,13,8,14,'house');
 rect(m,9,7,15,11,'plaza');line(m,12,3,12,17,'road');line(m,2,10,22,10,'road');line(m,5,5,5,10,'road');line(m,19,5,19,10,'road');line(m,5,10,5,14,'road');line(m,19,10,19,15,'road');
 rect(m,9,4,15,5,'wood');
 for(const [x,y] of [[8,8],[16,8],[8,12],[16,12],[20,14],[18,15],[6,15]])m.tiles[y][x]='flowers';
 add(m,0,'elder','npc',12,6,'Elder Mael');
 add(m,0,'inn','inn',4,6,'The Lantern Inn');add(m,0,'shop','shop',20,6,'Willowmere Goods');add(m,0,'forge','forge',5,15,'Mossforge Smithy');
 add(m,0,'board','board',15,11,'Village notice board');add(m,0,'out','exit',12,17,'South Gate · To the Overworld');
 add(m,0,'pip','resident',7,10,'Pip the Bellringer',{clue:'pip',talk:'The Thirteenth Bell only rings when the town remembers who it rings for.'});
 add(m,0,'edda','resident',8,6,'Edda the Gardener',{clue:'edda',talk:'The elder says flowers keep names alive. I planted one for each family by the river.'});
 add(m,0,'iris','resident',19,13,'Iris the Archivist',{clue:'iris',talk:'The archive door only opens for a name spoken with care. We used to know them all.'});
 add(m,0,'bell','bell',12,9,'The Thirteenth Bell');add(m,0,'plaque','inscription',16,10,'Willowmere plaque',{text:'A bell remembers every hand that has ever rung it. When the final note sounds, forgotten names return.'});
 add(m,0,'garden','inscription',21,15,'Garden dedication',{text:'These beds honor the first caretakers of Willowmere, who planted lantern blossoms beside the river road.'});add(m,0,'lantern','lantern',9,10,'A memory lantern');
 return m;
}
function dungeon(f){
  const names=['I · The Catalog Halls','II · Gallery of Unspoken Words','III · The Reliquary'];
  const m=field(27,21,'wall');m.title=names[f];
  m.flavor=['The library is older than Willowmere. Paper rustles behind its locked doors.','Forgotten words drift through the gallery as pale constellations.','The records end here. Something has been feeding on the missing names.'][f];
  const room=(x1,y1,x2,y2,t='floor')=>rect(m,x1,y1,x2,y2,t);
  const add=(id,type,x,y,label,extra={})=>obj(m,`0-${f}-${id}`,type,x,y,label,{f,...extra});
  if(f===0){
    room(1,14,9,19,'stone');room(2,3,8,9,'moss');room(11,9,18,16,'stone');
    room(11,2,18,6,'wood');room(20,1,25,11,'stone');
    room(4,9,6,15,'stone');room(8,15,12,15,'stone');
    room(8,5,14,5,'wood');room(13,5,15,11,'stone');room(17,9,20,9,'stone');
    room(2,11,4,13,'moss');room(4,12,5,14,'moss');
    room(22,11,25,13,'wood');room(23,9,24,11,'stone');
    rect(m,15,13,17,14,'carpet');
    add('back','leave',3,18,'Return to Willowmere Valley');
    add('heal','spring',7,18,'Restoring Font');
    add('treasure','chest',3,4,'Dusty archivist’s coffer',{reward:'gold'});
    add('enemy1','enemy',5,11,'Ink Slime');add('enemy2','enemy',16,12,'Binding Wisp');add('enemy3','enemy',23,8,'Ink Slime');
    add('block','boulder',13,10,'Pushable catalog stone');add('plate','plate',15,10,'Bronze reading plate');
    add('switch','lever',6,5,'Stacks lever');add('door','door',19,9,'Iron catalog gate',{requires:'0-0-switch'});
    add('key','chest',14,3,'Archive guardian key',{reward:'key'});
    add('next','down',24,3,'Stairs · Gallery of Unspoken Words');
    add('lore','inscription',12,5,'The Catalog Promise',{text:'When the first names were written, the Keepers promised never to erase a soul—even those who made mistakes.'});
    add('alcove','inscription',23,12,'Marginalia',{text:'A scratched warning: The beast below devours remembered names. Steel cuts its body. Memory denies its hunger.'});
  }else if(f===1){
    room(1,14,9,19,'stone');room(2,5,9,10,'wood');room(11,9,18,16,'rune');
    room(11,2,18,8,'stone');room(20,1,25,11,'rune');
    room(4,9,6,15,'stone');room(8,15,12,15,'stone');
    room(8,8,12,9,'wood');room(13,7,15,11,'rune');room(17,9,20,9,'rune');
    room(2,2,7,4,'moss');room(4,4,5,7,'moss');
    room(21,11,25,13,'stone');room(23,9,24,11,'stone');
    add('back','up',3,18,'Stairs · Catalog Halls');
    add('heal','spring',7,18,'Memory Font');
    add('treasure','chest',3,3,'A sealed scholar’s chest',{reward:'gold'});
    add('enemy1','enemy',5,11,'Paper Wraith');add('enemy2','enemy',16,12,'Inkbound Sentinel');add('enemy3','enemy',23,8,'Paper Wraith');
    add('seal','crossword',14,3,'Crossword Tablet · Eight Intersecting Names');
    add('sealdoor','door',19,9,'Gate of Intersecting Names',{requires:'seal0'});
    add('tool','obstacle',5,7,'Binding vines',{tool:'axe'});
    add('next','down',24,3,'Stairs · The Reliquary');
    add('prismLeft','prism',12,5,'West Memory Prism',{goal:2});
    add('prismRight','prism',17,5,'East Memory Prism',{goal:1});
    add('prismChest','prismChest',4,3,'Starlight Reliquary');
    add('lore','inscription',15,7,'The Keeper’s Diagram',{text:'The WEST prism points SOUTH, the EAST prism points EAST. Align both beams to unseal the Starlight Reliquary. The crossword tablet opens the main gate.'});
  }else{
    room(1,14,9,19,'rune');room(2,3,8,9,'stone');room(11,8,18,16,'carpet');
    room(11,2,17,6,'wood');room(20,1,25,10,'rune');
    room(4,9,6,15,'stone');room(8,15,12,15,'rune');
    room(8,5,14,5,'wood');room(13,5,15,11,'rune');room(17,9,20,9,'rune');
    room(20,5,25,5,'wall');room(22,5,22,5,'rune');
    room(21,11,25,13,'stone');room(23,9,24,11,'stone');
    add('back','up',3,18,'Stairs · Gallery of Unspoken Words');
    add('heal','spring',7,18,'Last Sanctuary');
    add('treasure','chest',3,4,'Keeper’s final offering',{reward:'gold'});
    add('enemy1','enemy',5,11,'Inkguard');add('enemy2','enemy',15,12,'Forgotten Knight');add('enemy3','enemy',23,8,'Inkguard');
    add('switch','lever',6,5,'Reliquary bridge lever');add('door','door',19,9,'Bridge of Pages',{requires:'0-2-switch'});
    add('lock','keydoor',22,5,'Guardian keyhole');
    add('boss','boss',24,3,'The Archivore');
    add('oath1','wardstone',12,3,'Keeper’s Oath · The Past');
    add('oath2','wardstone',16,5,'Keeper’s Oath · The Present');
    add('oath3','wardstone',15,14,'Keeper’s Oath · The Future');
    add('lore','inscription',16,9,'Broken Chronicle',{text:'The Archivore was not born a monster. It was commanded to forget. Perhaps the one holding the list still walks free.'});
  }
  return m;
}
const api={world,town,dungeon,open};if(typeof module!=='undefined')module.exports=api;else root.LQChapter1=api;
})(typeof window!=='undefined'?window:globalThis);
