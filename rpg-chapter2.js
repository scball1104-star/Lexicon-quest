/* Lexicon Quest — Chapter II: The Town Without a Name.
   Authored environment data and story encounters for Nameless Hollow / Court of Mirrors. */
(function(root){
'use strict';
const field=(w,h,fill)=>({w,h,tiles:Array.from({length:h},()=>Array(w).fill(fill)),objects:[],title:'',flavor:''});
function rect(m,x1,y1,x2,y2,t){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;}
function line(m,x1,y1,x2,y2,t){let x=x1,y=y1;for(;;){m.tiles[y][x]=t;if(x===x2&&y===y2)break;if(x!==x2)x+=Math.sign(x2-x);else y+=Math.sign(y2-y);}}
function add(m,f,id,type,x,y,label,extra={}){m.objects.push({id:`1-${f}-${id}`,type,x,y,label,r:1,f,...extra});}
function town(){
 const m=field(25,19,'grass');m.title='Nameless Hollow · The Unwritten Square';
 m.flavor='Pale roofs, empty signboards and a circular plaza make the hollow feel orderly yet haunted, like a town waiting for its true name to be spoken.';
 rect(m,0,0,24,0,'tree');rect(m,0,1,0,18,'tree');rect(m,24,1,24,18,'tree');
 rect(m,2,2,8,5,'stone');rect(m,16,2,22,5,'stone');rect(m,3,3,7,4,'house');rect(m,17,3,21,4,'house');
 rect(m,2,12,8,16,'meadow');rect(m,16,12,22,16,'garden');rect(m,3,13,7,14,'house');
 rect(m,9,7,15,12,'plaza');rect(m,10,3,14,5,'plaza');line(m,12,2,12,17,'road');line(m,2,10,22,10,'road');line(m,5,5,5,10,'road');line(m,19,5,19,10,'road');line(m,5,10,5,14,'road');line(m,19,10,19,15,'road');
 for(const [x,y] of [[8,8],[16,8],[8,13],[16,13],[10,6],[14,6],[18,14]])m.tiles[y][x]='flowers';
 add(m,0,'mayor','npc',12,5,'Mayor Elian');
 add(m,0,'inn','inn',5,5,'The Signless Inn');add(m,0,'shop','shop',19,5,'Hollow Provisioner');add(m,0,'forge','forge',5,14,'Silverglass Smithy');
 add(m,0,'guide','board',19,13,'Town notice board');add(m,0,'out','exit',12,17,'South Gate · To the Overworld');
 add(m,0,'lena','hollowResident',7,10,'Lena the Watchmaker',{clue:'lena',talk:'Our clocks strike at midnight, but the tower has no hands. The king took our reflections so that the Court could hold one final memory.'});
 add(m,0,'tovin','hollowResident',16,10,'Tovin the Ferryman',{clue:'tovin',talk:'I ferried a child to the Court years ago. She called herself Mira. She would not look in the water.'});
 add(m,0,'sister','hollowResident',19,15,'Sister Anwen',{clue:'anwen',talk:'The king gave up his own name to keep the town alive. Now he cannot remember why he made the sacrifice.'});
 add(m,0,'fountain','hollowFountain',12,10,'The Fountain of Faces');
 add(m,0,'notice','inscription',9,6,'The blank proclamation',{text:'Where our name once stood, a child drew a looking glass. Beneath it: WE ARE MORE THAN OUR REFLECTIONS.'});
 add(m,0,'monument','inscription',21,9,'An absent statue',{text:'The plinth is empty. Three signatures remain: the Watchmaker, the Ferryman, and the Sister.'});
 return m;
}
function dungeon(f){
 const m=field(27,21,'wall');
 m.title=['I · The Silverglass Antechamber','II · The Hall of Other Selves','III · The Unnamed Throne'][f];
 m.flavor=[
 'Silver light turns corners it should not. Three lenses control the passage ahead.',
 'Every portrait resembles someone the party once knew—except none of them can remember the sitter.',
 'The throne is empty in every reflection. The king waits behind the final glass.'
 ][f];
 // Carefully connected west, center, and east wings; the eastern bridge is a true choke point.
 rect(m,1,14,9,19,'stone');rect(m,4,9,6,15,'stone');rect(m,2,3,9,9,'wood');
 rect(m,8,5,15,6,'stone');rect(m,12,5,18,16,'rune');rect(m,11,2,18,6,'stone');
 rect(m,8,15,13,16,'rune');rect(m,17,9,20,9,'stone');rect(m,20,1,25,11,'rune');
 rect(m,21,11,25,13,'stone');rect(m,23,9,24,11,'stone');
 // Floor-to-floor navigation preserves consistent spatial landmarks.
 add(m,f,'back',f===0?'leave':'up',3,18,f===0?'Return to Nameless Hollow':'Stairs · Previous gallery');
 add(m,f,'spring','spring',7,18,'Mercurial Resting Pool');
 add(m,f,'chest','chest',3,4,f===0?'Watchmaker’s travel case':f===1?'Silvered supply coffer':'Royal supply cache',{reward:'gold'});
 add(m,f,'enemy1','enemy',5,11,f===0?'Reflection Wisp':f===1?'Glassbound Echo':'Faceless Knight');
 add(m,f,'enemy2','enemy',16,12,f===0?'Glass Sentinel':f===1?'Borrowed Shadow':'False Knight');
 add(m,f,'enemy3','enemy',23,8,'Shattered Reflection');
 if(f===0){
  add(m,f,'lens-west','mirror',5,5,'West Lens · At the Forge',{goal:1});
  add(m,f,'lens-north','mirror',15,3,'North Lens · At the Balcony',{goal:2});
  add(m,f,'lens-south','mirror',16,14,'South Lens · At the Mosaic',{goal:3});
  add(m,f,'diagram','inscription',8,7,'The silverglass inscription',{text:'The three lenses remember a journey: the WEST looks EAST; the NORTH looks SOUTH; the SOUTH looks WEST. Touch each lens to turn it clockwise (N → E → S → W).'});
  add(m,f,'mira','mirrorMemory',13,10,'Mira · The Child in the Window',{scene:0});
  add(m,f,'gate','door',19,9,'The Silverglass Lock',{requires:'1-0-beam'});
  add(m,f,'key','chest',15,4,'The King’s Mirror Key',{reward:'key'});
  add(m,f,'down','down',24,3,'Stairs · Hall of Other Selves');
 } else if(f===1){
  add(m,f,'portrait1','hollowPortrait',5,5,'Portrait · A Child at the River',{order:1});
  add(m,f,'portrait2','hollowPortrait',15,4,'Portrait · A Keeper in the Court',{order:2});
  add(m,f,'portrait3','hollowPortrait',14,14,'Portrait · A King Without a Crown',{order:3});
  add(m,f,'portrait-text','inscription',8,7,'Gallery inscription',{text:'A child crossed the river. A keeper opened the court. Only then did the king lay down his crown. Touch their portraits in that order to recover the gallery’s hidden memory.'});
  add(m,f,'mira','mirrorMemory',12,11,'Mira · The Forgotten Promise',{scene:1});
  add(m,f,'seal','trial',15,3,'Echo Warden Trial');
  add(m,f,'gate','door',19,9,'The Gate of True Names',{requires:'seal1'});
  add(m,f,'down','down',24,3,'Stairs · The Unnamed Throne');
  add(m,f,'gift','hollowCache',22,12,'Remembrance Cache');
 }else{
  // A second chokepoint protects the king independently of the bridge.
  rect(m,20,5,25,5,'wall');m.tiles[5][22]='rune';
  add(m,f,'inscription','inscription',7,5,'The King’s Last Decree',{text:'I surrender my name, not my heart. Should someone recall the three things that matter, break this throne and give the town its story back.'});
  add(m,f,'vow1','memoryVow',5,5,'First Vow · Belonging',{order:1});
  add(m,f,'vow2','memoryVow',14,4,'Second Vow · Mercy',{order:2});
  add(m,f,'vow3','memoryVow',15,14,'Third Vow · Courage',{order:3});
  add(m,f,'mira','mirrorMemory',13,11,'Mira · What She Finally Remembers',{scene:2});
  add(m,f,'gate','door',19,9,'Bridge of Forgotten Vows',{requires:'1-2-vow'});
  add(m,f,'lock','keydoor',22,5,'The Mirror Keyhole');
  add(m,f,'boss','boss',24,3,'The Nameless King');
 }
 return m;
}
const api={town,dungeon};if(typeof module!=='undefined')module.exports=api;else root.LQChapter2=api;
})(typeof window!=='undefined'?window:globalThis);
