/* Chapter V: Whispering Desert / Oracle Labyrinth. Authored 27x21 spatial puzzles. */
(function(root){
'use strict';
const region=4;
function map(f){const m={w:27,h:21,tiles:Array.from({length:21},()=>Array(27).fill('wall')),objects:[],title:['I - The Shifting Dunes','II - Gallery of False Horizons','III - The Well of Tomorrow'][f],flavor:['Sand flows between ancient courtyards. Three wind vanes can calm the dunes and open the sealed eastern corridor.','A prism gallery tests what the eye believes. Both the true crossword and three mirage lenses are needed to cross.','At the desert heart, the Oracle asks which memory deserves to survive. Speak the three traveler vows before the final threshold.'][f],decor:[]};
 const rect=(a,b,c,d,t)=>{for(let y=b;y<=d;y++)for(let x=a;x<=c;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;};
 const add=(id,type,x,y,label,extra={})=>m.objects.push({id:`4-${f}-${id}`,type,x,y,label,r:4,f,...extra});
 // A hub in the west, three northern/southern puzzle arms, and an eastern court
 // connected through one and only one one-tile gate at (19,9).
 rect(2,14,9,19,'sandstone');rect(3,8,6,15,'sandroad');rect(2,3,9,9,'sandstone');
 rect(7,5,17,7,'sandroad');rect(9,7,18,16,'sandstone');rect(8,14,10,16,'sandroad');
 rect(11,2,18,5,'mosaic');rect(17,9,20,9,'sandroad');rect(20,2,25,13,'sandstone');
 rect(20,10,25,13,'mosaic');rect(21,2,25,4,'mosaic');
 rect(2,12,4,13,'quicksand');rect(10,12,12,12,'quicksand');rect(15,7,16,7,'quicksand');
 rect(21,11,23,11,'quicksand');m.tiles[2][10]='dune';m.tiles[13][7]='dune';m.tiles[14][7]='sandstone';
 // Keep every door as a real chokepoint: no alternate path exists into east court.
 rect(19,8,19,10,'wall');m.tiles[9][19]='sandroad';
 add('back',f===0?'leave':'up',3,18,f===0?'Caravan Stair - Return to Saffron Haven':'Sunlit Stair - Previous Gallery');
 add('well','spring',7,18,'Oasis of Clear Water');
 add('chest','chest',3,4,'Traveler Cache',{reward:'gold'});
 add('enemy1','enemy',5,11,f===0?'Silt Reaver':f===1?'Horizon Shade':'Tomorrow Husk');
 add('enemy2','enemy',16,12,'Sand Stalker');add('enemy3','enemy',23,8,'Mirage Serpent');
 if(f===0){
  add('west','windVane',5,5,'Western Wind Vane',{goal:1});
  add('north','windVane',14,4,'Northern Wind Vane',{goal:2});
  add('south','windVane',14,14,'Southern Wind Vane',{goal:3});
  add('diagram','inscription',8,6,'Caravan Windchart',{text:'Align the three vanes to still the drifting sand. WEST points EAST, NORTH points SOUTH, SOUTH points WEST. The vanes cycle North, East, South, West.'});
  add('memory','oracleMemory',12,10,'The Unfinished Caravan',{scene:0});
  add('gate','door',19,9,'Gate of the Still Wind',{requires:'4-0-winds'});
  add('key','chest',15,3,'The Nomad Sun Key',{reward:'key'});
  add('down','down',24,3,'Spiral Stair - False Horizons');
 }else if(f===1){
  add('west','mirageLens',5,5,'Lens of the Oasis',{goal:1});
  add('north','mirageLens',14,4,'Lens of the Sky',{goal:2});
  add('south','mirageLens',14,14,'Lens of the Stars',{goal:1});
  add('diagram','inscription',8,6,'The Three Horizons',{text:'Each lens cycles BLANK (0), TRUE (1), FALSE (2). The Oasis is TRUE; the Sky is FALSE; the Stars are TRUE. Only when the lenses and the crossword agree does the eastern seal open.'});
  add('memory','oracleMemory',12,10,'The Map That Lied',{scene:1});
  add('crossword','trial',15,3,'Echo Warden Trial');
  add('gate','door',19,9,'Gate of the True Horizon',{requires:'4-1-horizon'});
  add('down','down',24,3,'Spiral Stair - Well of Tomorrow');
  add('record1','oracleRecord',5,7,'First Chronicle - The Departure',{order:1});
  add('record2','oracleRecord',13,12,'Second Chronicle - The Crossing',{order:2});
  add('record3','oracleRecord',22,12,'Third Chronicle - The Arrival',{order:3});
  add('cache','oracleCache',24,12,'Lost Traveler Reliquary');
 }else{
  rect(20,5,25,5,'wall');m.tiles[5][22]='sandroad';
  add('diagram','inscription',8,6,'The Three Traveler Vows',{text:'A traveler bears no one alone. First offer SHELTER. Then speak the TRUTH. Last grant a RETURN. The three vows bring the bridge into daylight.'});
  add('vow1','oracleVow',5,5,'First Vow - Shelter',{order:1});
  add('vow2','oracleVow',14,4,'Second Vow - Truth',{order:2});
  add('vow3','oracleVow',14,14,'Third Vow - Return',{order:3});
  add('memory','oracleMemory',12,10,'The Name Under the Sand',{scene:2});
  add('gate','door',19,9,'Gate of Returning',{requires:'4-2-vows'});
  add('keyhole','keydoor',22,5,'Nomad Sun Keyhole');
  add('boss','boss',24,3,'The Sand Oracle');
 }
 for(const [x,y,type] of [[4,8,'obelisk'],[22,6,'obelisk'],[12,8,'carpet'],[8,15,'copperlamp'],[17,14,'copperlamp']])m.decor.push({type,x,y});
 return m;
}
const api={dungeon:map};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQChapter5=api;
})(typeof window!=='undefined'?window:globalThis);
