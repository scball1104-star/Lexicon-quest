/* Chapter VIII: The First Library. Authored spatial dungeon + final story. */
(function(root){
'use strict';
function dungeon(f){
 const m={w:27,h:21,tiles:Array.from({length:21},()=>Array(27).fill('inkwall')),objects:[],decor:[],
 title:['I · The Catalog of Lost Lives','II · The Palimpsest Galleries','III · The Unwritten Page'][f],
 flavor:[
 'Every erased name is stored in a separate alcove. The Index Engines can expose the hidden passage, but spilled ink eats at living memories. The record is not as impartial as it claims.',
 'The Library revises its own pages. Restore the three printing plates and the intersecting DESTINY crossword to reach the original charter. Neither task can replace the other.',
 'At the last page, a Keeper can no longer separate remembrance from the right to change. Read Mira, Bram and your own witness lines; the Eraser has been waiting to hear an answer.'
 ][f]};
 const rect=(x1,y1,x2,y2,t)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;};
 const add=(id,type,x,y,label,extra={})=>m.objects.push({id:`7-${f}-${id}`,type,x,y,label,r:7,f,...extra});
 // Authored circulation ring with western galleries, one central lock,
 // and a physically disconnected east annex when the lock is closed.
 rect(2,14,9,19,'parchment');rect(2,8,6,15,'letterpath');rect(2,3,9,9,'parchment');
 rect(6,5,17,7,'letterpath');rect(9,7,18,16,'vellum');rect(8,14,11,16,'letterpath');
 rect(11,2,18,5,'scriptmosaic');rect(17,9,20,9,'letterpath');
 rect(20,2,25,13,'parchment');rect(20,10,25,13,'scriptmosaic');rect(21,2,25,4,'scriptmosaic');
 rect(19,8,19,10,'inkwall');m.tiles[9][19]='goldscript';
 for(const [x,y] of [[3,12],[4,12],[10,12],[11,12],[15,7],[16,7],[21,11],[22,11]])m.tiles[y][x]='redaction';
 add('back',f===0?'leave':'up',3,18,f===0?'Library Entrance · Return to Scriptorium':'Previous Gallery · West Lift');
 add('spring','spring',7,18,'Restoring Fountain of Names');
 add('cache','chest',3,4,'Forgotten Traveler Satchel',{reward:'gold'});
 add('enemy1','enemy',5,11,'Catalog Wraith');add('enemy2','enemy',16,12,'The Unnamed Sentry');add('enemy3','enemy',23,8,'Inkbound Librarian');
 if(f===0){
  add('west','indexEngine',5,5,'Index of Persons · NAME',{goal:1});
  add('north','indexEngine',14,4,'Index of Histories · MEMORY',{goal:2});
  add('south','indexEngine',14,14,'Index of Futures · CHOICE',{goal:3});
  add('diagram','inscription',8,6,'The Indexing Rule',{text:'An archive must first NAME (1) a person, then MEMORY (2) of their past, then CHOICE (3) of their future. Set WEST to NAME, NORTH to MEMORY, SOUTH to CHOICE to expose the hidden page-bridge.'});
  add('memory','keeperMemory',12,10,'The First Keeper’s Impossible Order',{scene:0});
  add('gate','door',19,9,'Sealed Catalog Passage',{requires:'7-0-index'});
  add('key','chest',15,3,'The Original Ink Key',{reward:'key'});
  add('down','down',24,3,'Stair · Palimpsest Galleries');
 }else if(f===1){
  add('west','printingPlate',5,5,'West Plate · WITNESS',{goal:1});
  add('north','printingPlate',14,4,'Crown Plate · RESTORE',{goal:2});
  add('south','printingPlate',14,14,'South Plate · OPEN',{goal:1});
  add('diagram','inscription',8,6,'The Printer’s Contract',{text:'The plates turn through BLANK (0), WITNESS (1), RESTORE (2). Set WEST to WITNESS, CROWN to RESTORE and SOUTH to WITNESS to set an honest text. Complete the crossword too.'});
  add('memory','keeperMemory',12,10,'The First Alteration',{scene:1});
  add('crossword','trial',15,3,'Echo Warden Trial');
  add('gate','door',19,9,'Palimpsest Seal',{requires:'7-1-text'});
  add('down','down',24,3,'Stair · The Unwritten Page');
  add('record1','firstRecord',5,7,'Evidence I · The Names',{order:1});
  add('record2','firstRecord',13,12,'Evidence II · The Order',{order:2});
  add('record3','firstRecord',22,12,'Evidence III · The Correction',{order:3});
  add('reliquary','firstCache',24,12,'Archive of Uncensored Lives');
 }else{
  rect(20,5,25,5,'inkwall');m.tiles[5][22]='goldscript';
  add('vow1','finalVow',5,5,'Mira’s Promise · SEE',{order:1});
  add('vow2','finalVow',14,4,'Bram’s Promise · SHELTER',{order:2});
  add('vow3','finalVow',14,14,'Your Promise · CHOOSE',{order:3});
  add('charter','inscription',8,6,'Charter of the Living Lexicon',{text:'First SEE the truth of a person. Then SHELTER their right to exist. Finally let them CHOOSE the name and future that they carry. A name is never a chain.'});
  add('memory','keeperMemory',12,10,'The Book the Keeper Hid',{scene:2});
  add('gate','door',19,9,'Unwritten Promise Lock',{requires:'7-2-promises'});
  add('keyhole','keydoor',22,5,'Original Ink Keyhole');
  add('boss','boss',24,3,'The Eraser · First Keeper');
 }
 for(const [x,y,type] of [[4,8,'booktower'],[22,6,'quill'],[12,8,'pagefountain'],[8,15,'goldscroll'],[17,14,'booktower']])m.decor.push({type,x,y});
 return m;
}
const api={dungeon};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQChapter8=api;
})(typeof window!=='undefined'?window:globalThis);
