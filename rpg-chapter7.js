/* Chapter VII: Hollow North / Frostbound Vault. Hand-authored spatial progression. */
(function(root){
'use strict';
function dungeon(f){
 const m={w:27,h:21,tiles:Array.from({length:21},()=>Array(27).fill('icewall')),objects:[],decor:[],
  title:['I - The Vanishing Steps','II - The Hall of Borrowed Light','III - The Stillheart Sanctum'][f],
  flavor:[
   'Old paths disappear beneath translucent snow. Set three sunward beacons to keep the ice bridge visible. Every step on black frost recalls a forgotten traveler.',
   'Mirror lamps bend sunlight through the ancient records. Restore the warmth circuits AND the crossed-word seal before the eastern frost door can open.',
   'The White Phantom keeps the village safe by burying everyone it fears losing. Remember Keeper Nox and recite the three promises to enter the Stillheart.'
  ][f]};
 const rect=(x1,y1,x2,y2,t)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;};
 const add=(id,type,x,y,label,extra={})=>m.objects.push({id:`6-${f}-${id}`,type,x,y,label,r:6,f,...extra});
 // A connected western vault spine, one heavily guarded eastern chokepoint.
 rect(2,14,9,19,'frostbrick');rect(2,8,6,15,'icepath');rect(2,3,9,9,'frostbrick');
 rect(6,5,17,7,'icepath');rect(9,7,18,16,'frostbrick');rect(8,14,11,16,'icepath');
 rect(11,2,18,5,'iceglass');rect(17,9,20,9,'icebridge');
 rect(20,2,25,13,'frostbrick');rect(20,10,25,13,'iceglass');rect(21,2,25,4,'iceglass');
 rect(3,12,4,13,'blackfrost');rect(10,12,12,12,'blackfrost');rect(15,7,16,7,'blackfrost');
 rect(21,11,23,11,'blackfrost');
 rect(19,8,19,10,'icewall');m.tiles[9][19]='icebridge';
 add('back',f===0?'leave':'up',3,18,f===0?'The Northward Stair - Return to Palehaven':'Ice Lift - Previous Gallery');
 add('spring','spring',7,18,'Thawlight Recovery Basin');
 add('cache','chest',3,4,'Winterwatch Provision Cache',{reward:'gold'});
 add('enemy1','enemy',5,11,'Frostbound Revenant');add('enemy2','enemy',16,12,'Hollow Ice Knight');add('enemy3','enemy',23,8,'Pale Lantern Shade');
 if(f===0){
  add('west','frostBeacon',5,5,'West Beacon - Sunrise',{goal:1});
  add('north','frostBeacon',14,4,'North Beacon - Noon',{goal:2});
  add('south','frostBeacon',14,14,'South Beacon - Dusk',{goal:3});
  add('chart','inscription',8,6,'Diagram of the Three Suns',{text:'The beacons rotate through OFF (0), SUNRISE (1), NOON (2), DUSK (3). WEST wakes at SUNRISE, NORTH holds NOON, SOUTH rests at DUSK. All three reveal the vanished bridge.'});
  add('memory','noxMemory',12,10,'A Gate Kept Open',{scene:0});
  add('gate','door',19,9,'Vanishing Bridge Seal',{requires:'6-0-light'});
  add('key','chest',15,3,'Stillheart Crystal Key',{reward:'key'});
  add('down','down',24,3,'Stair - Hall of Borrowed Light');
 }else if(f===1){
  add('west','frostLens',5,5,'West Lens - Receive',{goal:1});
  add('north','frostLens',14,4,'Crown Lens - Reflect',{goal:2});
  add('south','frostLens',14,14,'South Lens - Receive',{goal:1});
  add('chart','inscription',8,6,'Lightkeeper Refraction Record',{text:'The three glass lenses cycle DARK (0), RECEIVE (1), REFLECT (2). WEST receives, CROWN reflects, SOUTH receives. The crossed-word seal must ALSO be completed.'});
  add('memory','noxMemory',12,10,'The Name Left Outside',{scene:1});
  add('crossword','trial',15,3,'Echo Warden Trial');
  add('gate','door',19,9,'Borrowed Light Gate',{requires:'6-1-light'});
  add('down','down',24,3,'Stair - Stillheart Sanctum');
  add('record1','frostRecord',5,7,'Witness I - Open the Door',{order:1});
  add('record2','frostRecord',13,12,'Witness II - Share the Flame',{order:2});
  add('record3','frostRecord',22,12,'Witness III - Call the Lost',{order:3});
  add('reliquary','frostCache',24,12,'Keeper Emergency Reliquary');
 }else{
  rect(20,5,25,5,'icewall');m.tiles[5][22]='icebridge';
  add('vow1','frostVow',5,5,'Keeper Promise I - Shelter',{order:1});
  add('vow2','frostVow',14,4,'Keeper Promise II - Remember',{order:2});
  add('vow3','frostVow',14,14,'Keeper Promise III - Return',{order:3});
  add('charter','inscription',8,6,'The Keeper Charter',{text:'The true keeper must SHELTER the living, REMEMBER the absent, and RETURN when a lost voice calls.'});
  add('memory','noxMemory',12,10,'The Winter Nox Could Not End',{scene:2});
  add('gate','door',19,9,'Stillheart Promise Lock',{requires:'6-2-vows'});
  add('keyhole','keydoor',22,5,'Stillheart Crystal Keyhole');
  add('boss','boss',24,3,'The White Phantom');
 }
 for(const [x,y,type] of [[4,8,'crystal'],[22,6,'auroraobelisk'],[12,8,'frostfire'],[8,15,'crystal'],[17,14,'snowpine']])m.decor.push({type,x,y});
 return m;
}
const api={dungeon};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQChapter7=api;
})(typeof window!=='undefined'?window:globalThis);
