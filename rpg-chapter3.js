/* Lexicon Quest: Chapter III — Emberpeak, Forge of Ash. Authored maps and content. */
(function(root){
'use strict';
const field=(w,h,fill)=>({w,h,tiles:Array.from({length:h},()=>Array(w).fill(fill)),objects:[],title:'',flavor:''});
function rect(m,x1,y1,x2,y2,t){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;}
function line(m,x1,y1,x2,y2,t){let x=x1,y=y1;for(;;){m.tiles[y][x]=t;if(x===x2&&y===y2)break;if(x!==x2)x+=Math.sign(x2-x);else y+=Math.sign(y2-y);}}
function add(m,f,id,type,x,y,label,extra={}){m.objects.push({id:`2-${f}-${id}`,type,x,y,label,r:2,f,...extra});}
function town(){
 const m=field(25,19,'ash');m.title='Emberpeak · Bellows Square';
 m.flavor='Ash drifts between iron-roofed workshops, ember pits and metal walks. The service district reads cleanly, like a forge-town version of a JRPG hub.';
 rect(m,0,0,24,0,'wall');rect(m,0,1,0,18,'wall');rect(m,24,1,24,18,'wall');
 rect(m,2,2,9,6,'stone');rect(m,16,2,22,6,'stone');rect(m,3,3,7,4,'house');rect(m,18,3,21,4,'house');
 rect(m,2,12,9,16,'metal');rect(m,16,12,22,16,'metal');rect(m,3,12,7,13,'house');
 rect(m,11,2,13,17,'road');rect(m,2,9,22,11,'road');rect(m,8,8,16,12,'metal');
 rect(m,2,7,6,8,'ember');rect(m,18,7,22,8,'ember');line(m,5,5,5,10,'road');line(m,19,5,19,10,'road');line(m,5,11,5,14,'road');line(m,19,11,19,15,'road');
 for(const [x,y] of [[9,7],[15,7],[8,13],[16,13]])m.tiles[y][x]='metal';
 add(m,0,'elder','npc',12,5,'Foreman Veyra');add(m,0,'inn','inn',5,5,'Coal Lantern Inn');add(m,0,'shop','shop',19,5,'Ventworks Supplies');add(m,0,'forge','forge',5,14,'Emberpeak Weaponsmith');add(m,0,'board','board',19,13,'Forge safety board');add(m,0,'out','exit',12,17,'South Lift · World Road');
 add(m,0,'witness1','emberWitness',7,10,'Ilya the Bell Founder',{clue:'ilya',talk:'The forge bells were tuned by Bram’s mother. When one stopped, the Warden ordered every record of her name burned.'});
 add(m,0,'witness2','emberWitness',16,10,'Rook the Mine Surveyor',{clue:'rook',talk:'I mapped three pressure regulators. Hot exhaust must flow to the east, cool air to the north, and the return line west.'});
 add(m,0,'witness3','emberWitness',19,15,'Sella the Apprentice',{clue:'sella',talk:'Bram carried miners out of the collapse. The Warden called it treason because the furnaces stopped for an hour.'});
 add(m,0,'coolant','coolantStation',12,10,'Emergency Coolant Station');
 add(m,0,'notice','inscription',9,6,'The Smelter Proclamation',{text:'A bell rings for each craft: the one who shapes, the one who remembers, and the one who returns. The hearth cannot run without all three.'});
 add(m,0,'memorial','inscription',21,9,'Names Etched in Iron',{text:'One inscription has been hammered flat. Bram pauses before it, unable to speak.'});
 return m;
}
function dungeon(f){
 const m=field(27,21,'wall');m.title=['I · The Cinder Liftworks','II · The Ventilation Galleries','III · The Heartforge Crucible'][f];
 m.flavor=[
 'Three regulators control the lift blast-gate; glowing seams in the floor burn unwary travelers.',
 'The air itself is a puzzle. Restore the word seal and route three ventilation fans to clear the furnace passage.',
 'The forge remembers every bell ever cast here. Three strikes of the old oath will reopen the crucible.'
 ][f];
 // Hand-carved three-zone mine with separate western/upper service passages and an east choke point.
 rect(m,2,14,9,19,'metal');rect(m,4,8,6,15,'stone');rect(m,2,3,9,9,'stone');
 rect(m,8,5,17,7,'metal');rect(m,9,7,18,16,'stone');rect(m,8,14,10,16,'metal');
 rect(m,11,2,18,5,'stone');rect(m,17,9,20,9,'bridge');rect(m,20,2,25,13,'metal');
 rect(m,21,11,25,13,'ash');rect(m,23,9,24,11,'bridge');
 rect(m,11,11,13,11,'ember');rect(m,16,8,17,9,'ember');rect(m,21,7,23,7,'ember');
 add(m,f,'back',f===0?'leave':'up',3,18,f===0?'Mine Cart · Return to Emberpeak':'Ore Lift · Previous Level');
 add(m,f,'spring','spring',7,18,'Cooling Water Reservoir');
 add(m,f,'chest','chest',3,4,'Miner’s Supply Trunk',{reward:'gold'});
 add(m,f,'enemy1','enemy',5,11,f===0?'Ashbound Miner':f===1?'Soot Phantom':'Forge Defender');
 add(m,f,'enemy2','enemy',16,12,f===0?'Cinder Beetle':f===1?'Bellows Specter':'Molten Armor');
 add(m,f,'enemy3','enemy',23,8,'Furnace Construct');
 if(f===0){
  add(m,f,'valve-west','heatValve',5,5,'West · Exhaust Valve',{goal:1});
  add(m,f,'valve-north','heatValve',14,4,'North · Cooling Valve',{goal:2});
  add(m,f,'valve-return','heatValve',15,14,'South · Return Valve',{goal:3});
  add(m,f,'diagram','inscription',8,6,'The Furnace Flow Diagram',{text:'Pressure paths: WEST EXHAUST → EAST (1); NORTH COOLING → SOUTH (2); SOUTH RETURN → WEST (3). Each brass valve turns clockwise: N, E, S, W.'});
  add(m,f,'bram','bramMemory',12,10,'Bram · The Collapsed Mine',{scene:0});
  add(m,f,'gate','door',19,9,'Blast Gate of Cinder',{requires:'2-0-pressure'});
  add(m,f,'key','chest',15,3,'Crucible Hook Key',{reward:'key'});
  add(m,f,'down','down',24,3,'Ore Lift · Ventilation Galleries');
 }else if(f===1){
  add(m,f,'fan-west','forgeFan',5,5,'Intake Fan · West',{goal:1});
  add(m,f,'fan-core','forgeFan',14,4,'Turbine Fan · Core',{goal:2});
  add(m,f,'fan-return','forgeFan',14,14,'Return Fan · South',{goal:1});
  add(m,f,'diagram','inscription',8,6,'The Ventilation Blueprint',{text:'Clear the furnace smoke with WEST FAN = INTAKE, CORE FAN = EXHAUST, SOUTH FAN = INTAKE. Each fan cycles: Still → Intake → Exhaust → Still. The crossword seal and fans must both be restored.'});
  add(m,f,'bram','bramMemory',12,10,'Bram · The Bell-Forging Oath',{scene:1});
  add(m,f,'crossword','trial',15,3,'Echo Warden Trial');
  add(m,f,'gate','door',19,9,'Ventilation Pressure Door',{requires:'2-1-ventClear'});
  add(m,f,'down','down',24,3,'Ore Lift · Heartforge Crucible');
  add(m,f,'ledger1','oreLedger',5,7,'Foundry Ledger · The First Bell',{order:1});
  add(m,f,'ledger2','oreLedger',13,12,'Foundry Ledger · The Second Bell',{order:2});
  add(m,f,'ledger3','oreLedger',22,12,'Foundry Ledger · The Last Bell',{order:3});
  add(m,f,'cache','forgeCache',24,12,'Apprentice’s Forged Cache');
 }else{
  rect(m,20,5,25,5,'wall');m.tiles[5][22]='metal';
  add(m,f,'inscription','inscription',8,6,'The Three Hammer Strikes',{text:'A forge is not ruled by fire: FIRST THE HAND (work); THEN THE HEART (mercy); LAST THE HOME (return). Sound the strikes in that order, or the sequence begins anew.'});
  add(m,f,'strike1','forgeOath',5,5,'First Strike · The Hand',{order:1});
  add(m,f,'strike2','forgeOath',14,4,'Second Strike · The Heart',{order:2});
  add(m,f,'strike3','forgeOath',14,14,'Third Strike · The Home',{order:3});
  add(m,f,'bram','bramMemory',12,10,'Bram · The Name Under Ash',{scene:2});
  add(m,f,'gate','door',19,9,'The Bell Gate',{requires:'2-2-oath'});
  add(m,f,'keyhole','keydoor',22,5,'Crucible Hook Keyhole');
  add(m,f,'boss','boss',24,3,'The Cinder Warden');
 }
 return m;
}
const api={town,dungeon};if(typeof module!=='undefined')module.exports=api;else root.LQChapter3=api;
})(typeof window!=='undefined'?window:globalThis);
