/* Chapter VI: Skybound Isles / Storm Observatory. Authored 27x21 dungeon maps. */
(function(root){
'use strict';
function dungeon(f){
 const m={w:27,h:21,tiles:Array.from({length:21},()=>Array(27).fill('cloudbank')),objects:[],decor:[],
  title:['I - The Windward Causeways','II - The Orrery of Broken Signals','III - The Eye of the Storm'][f],
  flavor:[
   'Floating decks and exposed wind lanes wrap around the observatory. Tune three weather vanes to anchor the eastern span.',
   'An orrery once carried messages between the isles. Reconnect its signal relays and solve the crossed sky-chart words.',
   'The Storm Scribe overwrites every honest flight with a perfect but false chart. Restore the three pilot vows to reach its eye.'
  ][f]};
 const rect=(x1,y1,x2,y2,t)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;};
 const add=(id,type,x,y,label,extra={})=>m.objects.push({id:`5-${f}-${id}`,type,x,y,label,r:5,f,...extra});
 // Three connected western balconies feed a single eastern stormbridge chokepoint.
 // Hazard clouds remain walkable as gust lanes; cloudbank is a true solid/void tile.
 rect(2,14,9,19,'skyplank');rect(2,8,6,15,'skywalk');rect(2,3,9,9,'skyplank');
 rect(6,5,17,7,'skywalk');rect(9,7,18,16,'skyplank');rect(8,14,11,16,'skywalk');
 rect(11,2,18,5,'stormglass');rect(17,9,20,9,'skybridge');
 rect(20,2,25,13,'skyplank');rect(20,10,25,13,'stormglass');rect(21,2,25,4,'stormglass');
 // Three shock-gust strips deal first-step-only nonlethal damage while unsuppressed.
 rect(3,12,4,13,'gustlane');rect(10,12,12,12,'gustlane');rect(15,7,16,7,'gustlane');
 rect(21,11,23,11,'gustlane');
 // An eastern gate remains the ONLY route between the western and eastern platforms.
 rect(19,8,19,10,'cloudbank');m.tiles[9][19]='skybridge';
 add('back',f===0?'leave':'up',3,18,f===0?'Airstair - Return to Zephyr Landing':'Updraft Lift - Previous Deck');
 add('spring','spring',7,18,'Breeze-Sheltered Recovery Alcove');
 add('cache','chest',3,4,'Star-Sail Supply Coffer',{reward:'gold'});
 add('enemy1','enemy',5,11,f===0?'Gale Sprite':f===1?'Signal Wraith':'Storm-Marked Page');
 add('enemy2','enemy',16,12,'Lightning Manta');
 add('enemy3','enemy',23,8,'Storm Harrier');
 if(f===0){
  add('west','skyVane',5,5,'West Wind Rudder',{goal:2});
  add('north','skyVane',14,4,'North Wind Rudder',{goal:1});
  add('south','skyVane',14,14,'South Wind Rudder',{goal:3});
  add('chart','inscription',8,6,'Weatherwright Compass',{text:'Three compass rudders turn North (0), East (1), South (2), West (3). WEST faces SOUTH, NORTH faces EAST, SOUTH faces WEST. All three stabilize the crossing.'});
  add('memory','aerisMemory',12,10,'The Captain Who Turned Back',{scene:0});
  add('gate','door',19,9,'Suspension Bridge Lock',{requires:'5-0-rudders'});
  add('key','chest',15,3,'Sky Compass Key',{reward:'key'});
  add('down','down',24,3,'Lift - Orrery of Broken Signals');
 }else if(f===1){
  add('west','skyRelay',5,5,'West Relay - Receiver',{goal:1});
  add('north','skyRelay',14,4,'Crown Relay - Amplifier',{goal:2});
  add('south','skyRelay',14,14,'South Relay - Receiver',{goal:1});
  add('chart','inscription',8,6,'Lost Signal Diagram',{text:'The three relays cycle OFF (0), RECEIVE (1), AMPLIFY (2). WEST receives, CROWN amplifies, SOUTH receives. The crossword must ALSO be restored.'});
  add('memory','aerisMemory',12,10,'The Name Removed From the Crew',{scene:1});
  add('crossword','crossword',15,3,'Crossword of the Broken Sky Chart');
  add('gate','door',19,9,'Orrery Signal Gate',{requires:'5-1-signals'});
  add('down','down',24,3,'Lift - The Eye of the Storm');
  add('log1','skyRecord',5,7,'Log I - Departure',{order:1});
  add('log2','skyRecord',13,12,'Log II - Distress',{order:2});
  add('log3','skyRecord',22,12,'Log III - Rescue',{order:3});
  add('reliquary','skyCache',24,12,'Sky Sailors Emergency Locker');
 }else{
  // Keyhole separates the northern dais from the entrance to the east chamber.
  rect(20,5,25,5,'cloudbank');m.tiles[5][22]='skybridge';
  add('vow1','skyVow',5,5,'Pilot Oath I - Anchor',{order:1});
  add('vow2','skyVow',14,4,'Pilot Oath II - Listen',{order:2});
  add('vow3','skyVow',14,14,'Pilot Oath III - Return',{order:3});
  add('chart','inscription',8,6,'The Last Pilot Charter',{text:'Before chasing the horizon, ANCHOR your people. LISTEN for those the charts omit. Finally RETURN for anyone the sky has abandoned.'});
  add('memory','aerisMemory',12,10,'The Fifth Voice of the Fleet',{scene:2});
  add('gate','door',19,9,'Bridge of the Pilot Oath',{requires:'5-2-vows'});
  add('keyhole','keydoor',22,5,'Sky Compass Keyhole');
  add('boss','boss',24,3,'The Storm Scribe');
 }
 for(const [x,y,type] of [[4,8,'windsock'],[22,6,'rotor'],[12,8,'windstone'],[8,15,'skyflower'],[17,14,'skyflower']])m.decor.push({type,x,y});
 return m;
}
const api={dungeon};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQChapter6=api;
})(typeof window!=='undefined'?window:globalThis);
