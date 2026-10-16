/* Lexicon Quest: Chapter IV — Valewyn / The Sunken Keep.
 * Authored maps and declarative objects. Mechanics live in rpg-engine.js.
 */
(function(root){
'use strict';
const field=(w,h,fill)=>({w,h,tiles:Array.from({length:h},()=>Array(w).fill(fill)),objects:[],title:'',flavor:''});
function rect(m,x1,y1,x2,y2,t){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;}
function add(m,f,id,type,x,y,label,extra={}){m.objects.push({id:`3-${f}-${id}`,type,x,y,label,r:3,f,...extra});}
function town(){
 const m=field(25,19,'marble');m.title='Valewyn · Drowned Crown Plaza';
 m.flavor='Canals, bridges and bright marble walks give the city a proper civic silhouette. Even under rain, the square now reads like a late-SNES capital hub.';
 rect(m,0,0,24,0,'wall');rect(m,0,1,0,18,'wall');rect(m,24,1,24,18,'wall');
 rect(m,2,3,8,7,'water');rect(m,16,3,22,7,'water');rect(m,3,4,5,5,'bridge');rect(m,19,4,21,5,'bridge');
 rect(m,2,12,6,15,'plaza');rect(m,18,12,22,15,'plaza');rect(m,3,13,5,14,'bridge');rect(m,19,13,21,14,'bridge');
 rect(m,11,2,13,17,'carpet');rect(m,8,8,16,12,'plaza');rect(m,2,9,22,11,'marble');rect(m,4,8,6,10,'marble');rect(m,18,8,20,10,'marble');rect(m,5,10,5,15,'marble');rect(m,19,10,19,15,'marble');
 rect(m,2,1,7,2,'house');rect(m,17,1,22,2,'house');
 add(m,0,'regent','npc',12,5,'Regent Lyra');
 add(m,0,'inn','inn',5,8,'Floodwatch Inn');add(m,0,'shop','shop',19,8,'Riverbank Provisioner');add(m,0,'forge','forge',5,14,'Crown Guard Forge');add(m,0,'board','board',19,13,'Flood emergency orders');
 add(m,0,'out','exit',12,17,'South Bridge · World Road');
 add(m,0,'witness1','valewynWitness',8,10,'Nessa · Ferry Captain',{clue:'nessa',talk:'The tide gates were closed while families waited on the banks. The decree bears the Paper Regent’s seal, not Lyra’s.'});
 add(m,0,'witness2','valewynWitness',17,10,'Dorian · Royal Scribe',{clue:'dorian',talk:'The last true king signed a relief charter for the river quarter. The charter was copied, altered and then hidden below the Keep.'});
 add(m,0,'witness3','valewynWitness',19,15,'Orel · Canal Engineer',{clue:'orel',talk:'The flood could be eased by opening a civilian spillway, or the archival wing could be protected with its own pump. There is power for only one first.'});
 add(m,0,'relief','civicPlan',9,12,'Council Switch · Shelter the River Quarter',{plan:'shelter'});
 add(m,0,'records','civicPlan',15,12,'Council Switch · Protect the Public Records',{plan:'records'});
 add(m,0,'statue','inscription',12,8,'Valewyn’s Empty Coronation',{text:'A crown without a name is a shadow. The law is meant to shelter the people, not to drown them in ink.'});
 return m;
}
function base(f){
 const m=field(27,21,'wall');m.title=['I · Tidegate Causeway','II · Archives Below Water','III · Chamber of the Last Decree'][f];
 m.flavor=[
 'Three tidal locks steer water through the foundations. The east gate will not budge until the current is balanced.',
 'An old crossword tablet seals the public archive. Three pumps must return water to their designated channels.',
 'The Regent has made law into a weapon. Recover the true testimony, then pronounce the three principles of justice.'
 ][f];
 // Separate intake, archive and eastern annex, with a single guarded causeway joining them.
 rect(m,2,14,9,19,'marble');rect(m,3,8,6,15,'stone');rect(m,2,3,9,9,'marble');
 rect(m,7,5,17,7,'bridge');rect(m,9,7,18,16,'stone');rect(m,8,14,10,16,'marble');
 rect(m,11,2,18,5,'plaza');rect(m,17,9,20,9,'bridge');rect(m,20,2,25,13,'marble');
 rect(m,20,10,25,13,'plaza');rect(m,21,2,25,4,'carpet');
 rect(m,2,12,4,13,'flood');rect(m,10,12,12,12,'flood');rect(m,15,7,16,7,'flood');
 rect(m,21,11,23,11,'flood');
 // A canal is visible but not traversable. Flood tiles, unlike water, are traversable hazards.
 m.tiles[2][10]='water';m.tiles[13][7]='water';m.tiles[14][7]='marble';
 add(m,f,'back',f===0?'leave':'up',3,18,f===0?'Lift Bridge · Return to Valewyn':'Floodgate Stair · Previous Level');
 add(m,f,'well','spring',7,18,'Sanctuary Alcove');
 add(m,f,'chest','chest',3,4,'Waterproof Guard Chest',{reward:'gold'});
 add(m,f,'enemy1','enemy',5,11,f===0?'Drowned Watch':f===1?'Inkbound Barrister':'Royal Paper Guard');
 add(m,f,'enemy2','enemy',16,12,f===0?'Sluice Specter':f===1?'Gutter Phantom':'Blank Decree');
 add(m,f,'enemy3','enemy',23,8,'Waterlogged Sentinel');
 return m;
}
function dungeon(f){
 const m=base(f);
 if(f===0){
  add(m,f,'sluice-west','tideSluice',5,5,'West Sluice · Intake',{goal:2});
  add(m,f,'sluice-north','tideSluice',14,4,'North Sluice · Drain',{goal:1});
  add(m,f,'sluice-south','tideSluice',15,14,'South Sluice · Overflow',{goal:3});
  add(m,f,'diagram','inscription',8,6,'Tidal Engineer’s Plan',{text:'Lock marks cycle CALM (0), LOW (1), HIGH (2), RELEASE (3). To relieve the Keep: WEST INTAKE = HIGH; NORTH DRAIN = LOW; SOUTH OVERFLOW = RELEASE.'});
  add(m,f,'lyra','lyraMemory',12,10,'Lyra · The Flooded Audience',{scene:0});
  add(m,f,'gate','door',19,9,'Eastern Tidegate',{requires:'3-0-tide'});
  add(m,f,'key','chest',15,3,'Sunken Seal Key',{reward:'key'});
  add(m,f,'down','down',24,3,'Flood Stair · Submerged Archive');
 }else if(f===1){
  add(m,f,'pump-west','tidePump',5,5,'West Pump · Intake',{goal:1});
  add(m,f,'pump-core','tidePump',14,4,'Central Pump · Purge',{goal:2});
  add(m,f,'pump-south','tidePump',14,14,'South Pump · Intake',{goal:1});
  add(m,f,'diagram','inscription',8,6,'The Archive Pump Blueprint',{text:'Restore both the crossword and the water routing. WEST PUMP: INTAKE. CENTRAL PUMP: PURGE. SOUTH PUMP: INTAKE. Pumps cycle: STOP → INTAKE → PURGE → STOP.'});
  add(m,f,'lyra','lyraMemory',12,10,'Lyra · The Altered Charter',{scene:1});
  add(m,f,'crossword','trial',15,3,'Echo Warden Trial');
  add(m,f,'gate','door',19,9,'Archive Floodlock',{requires:'3-1-archive'});
  add(m,f,'down','down',24,3,'Royal Stair · Last Decree Chamber');
  add(m,f,'testimony1','royalRecord',5,7,'First Record · The Petition',{order:1});
  add(m,f,'testimony2','royalRecord',13,12,'Second Record · The Forgery',{order:2});
  add(m,f,'testimony3','royalRecord',22,12,'Third Record · The Crown',{order:3});
  add(m,f,'cache','royalCache',24,12,'Public Archive Coffer');
 }else{
  // The final keydoor is a real, one-tile crossing of an otherwise continuous wall.
  rect(m,20,5,25,5,'wall');m.tiles[5][22]='marble';
  add(m,f,'diagram','inscription',8,6,'The Three Principles',{text:'The true charter reads: FIRST THE VOICE (hear the people); THEN THE TRUTH (preserve the evidence); LAST THE MERCY (protect the living). Pronounce these principles in order.'});
  add(m,f,'principle1','royalPrinciple',5,5,'First Principle · Voice',{order:1});
  add(m,f,'principle2','royalPrinciple',14,4,'Second Principle · Truth',{order:2});
  add(m,f,'principle3','royalPrinciple',14,14,'Third Principle · Mercy',{order:3});
  add(m,f,'lyra','lyraMemory',12,10,'Lyra · The Oath Remembered',{scene:2});
  add(m,f,'gate','door',19,9,'Hall of Royal Petitions',{requires:'3-2-principles'});
  add(m,f,'keyhole','keydoor',22,5,'Sunken Seal Keyhole');
  add(m,f,'boss','boss',24,3,'The Paper Regent');
 }
 return m;
}
const api={town,dungeon};if(typeof module!=='undefined')module.exports=api;else root.LQChapter4=api;
})(typeof window!=='undefined'?window:globalThis);
