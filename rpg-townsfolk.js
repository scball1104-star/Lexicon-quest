/* Lexicon Quest — Living Citizens. All ambient state is presentation-only.
   Quest NPCs and collision/quest logic remain owned by rpg-engine.js. */
(function(root){
'use strict';
const ROLES=['baker','courier','gardener','smith','scholar','sailor','guard','child'];
const PEOPLE=[
 [
  ['marnie','Marnie the Baker','baker',6,9,[[6,9],[7,9],[7,8],[6,8]],'The rye loaves are almost ready. It feels wrong to bake thirteen and only remember twelve guests.','The inn ordered extra bread. Travelers are still finding their way into Willowmere.','Pip has been counting the missing chimes by the old bell.'],
  ['tess','Tess the Courier','courier',13,13,[[13,13],[14,13],[14,12],[13,12]],'I carry letters that arrive addressed to people no one remembers.','My satchel takes me between the Lantern Inn and the south road.','Elder Mael is the one to ask about the Rootbound Archive.'],
  ['rell','Rell the Groundskeeper','gardener',17,14,[[17,14],[18,14],[18,15],[17,15]],'The lantern blossoms grew faster after the first rain.','Edda planted flowers for names that did not fit on the memorial.','Those small lilies by the bell? Someone is still caring for them.'],
  ['quill','Quill the Scribe','scholar',17,9,[[17,9],[17,8],[18,8],[18,9]],'Every book here loses the same line of writing.','I copy a name twice now, one for me and one for the village.','The archivist Iris has the old catalogue, if she can find its key.'],
  ['fenn','Fenn the Riverhand','sailor',11,4,[[11,4],[11,5],[10,5],[10,4]],'Water keeps its own kind of memory.','The bridge creaks when the river rises. Listen before you cross.','The Rootbound Archive sits beyond the east road, higher than the floodplain.']
 ],
 [
  ['vessa','Vessa the Glassblower','smith',8,9,[[8,9],[8,8],[7,8],[7,9]],'Sometimes the glass reflects a place before I enter it.','A perfect mirror still shows the wrong name if the viewer forgets it.','Lena knows the clocktower and Tovin remembers the river.'],
  ['nico','Nico the Errand Boy','child',13,13,[[13,13],[14,13],[14,14],[13,14]],'I drew a crown on every blank sign. The grownups hated it.','I race from the square to the silverglass workshop.','Sister Anwen says a name is a promise, not a title.'],
  ['orla','Orla the Keeper','scholar',17,14,[[17,14],[18,14],[18,15],[17,15]],'There are three portraits in the Court, but the middle frame is empty.','I have kept a blank ledger for years, waiting for someone to write in it.','The fountain listens when all three witnesses have spoken.'],
  ['sava','Sava the Weaver','baker',7,14,[[7,14],[8,14],[8,15],[7,15]],'We leave the name-space empty in every embroidered coat.','I have thread of silver, grey, and colors I no longer know.','The Court of Mirrors lies up the eastern road.'],
  ['corin','Corin the Watchman','guard',14,8,[[14,8],[15,8],[15,9],[14,9]],'I have stood this watch for a year I cannot name.','The square is safe, even if the reflections look uneasy.','The mayor waits at the north of the square.']
 ],
 [
  ['taro','Taro the Riveter','smith',8,11,[[8,11],[8,12],[9,12],[9,11]],'If the pressure runs high, the whole rail will sing.','I work the cool side of the Foundry. The deep bell has gone silent.','Rook mapped the regulators. His notes can save your boots.'],
  ['miri','Miri the Runner','courier',13,14,[[13,14],[14,14],[14,13],[13,13]],'Deliveries never stop even when the bells do.','I take the apprentices meals between shifts.','Ask Sella who pulled the miners out of the collapse.'],
  ['bess','Bess the Cook','baker',7,9,[[7,9],[8,9],[8,10],[7,10]],'Ash gets into everything, except a pot with a good lid.','The Coal Lantern serves three stews: hot, hotter, and safe.','Ilya can tell you how Bram’s mother tuned the first bell.'],
  ['harl','Harl the Surveyor','scholar',17,10,[[17,10],[17,11],[18,11],[18,10]],'The ground shifts when the furnace exhales.','I write the pressure readings before the soot erases them.','An emergency coolant station sits right in the square.'],
  ['rusk','Rusk the Watch','guard',16,13,[[16,13],[17,13],[17,14],[16,14]],'The mine gates have been shut from inside.','There is no safe shift while the Warden runs the lifts.','Frost cools hot metal. It can cool a guardian too.']
 ],
 [
  ['nilo','Nilo the Ferryhand','sailor',8,9,[[8,9],[7,9],[7,10],[8,10]],'The water was lower yesterday. My landing is still under the tide.','I keep a boat ready for the lower quarter.','The council needs all three witness statements before it can help.'],
  ['ada','Ada the Courier','courier',13,14,[[13,14],[14,14],[14,13],[13,13]],'Royal notices arrive stamped and dry. The streets do not.','I carry petitions from the river families to the palace.','Nessa knows which gate closed first.'],
  ['vance','Vance the Guard','guard',17,9,[[17,9],[17,8],[18,8],[18,9]],'It is hard to enforce a law that changes in the rain.','We raised the sandbags twice this morning.','A decree with the wrong seal is not a royal command.'],
  ['linn','Linn the Archivist','scholar',15,14,[[15,14],[16,14],[16,15],[15,15]],'I carry records to high shelves whenever the canal rises.','The charter had an open gate drawn over the last line.','Dorian can recognize the true hand of the king.'],
  ['sori','Sori the Apprentice','child',9,8,[[9,8],[9,9],[10,9],[10,8]],'I can jump across the narrow stones when the tide is low.','The palace has the best echo for a whistle.','Orel says there is enough power for one district first.']
 ]
];
const LATER_CITIZENS=[
 [
  ['nadir','Nadir the Waterbearer','sailor',7,9,[[7,9],[7,8],[8,8],[8,9]],'Moonwell water tastes different every dusk. The Oracle used to call that a blessing.','I carry clay jars between the market and the caravan houses.','The obelisk is older than the road; Nomad Sel knows why it is still standing.'],
  ['yasmin','Yasmin the Cloth Merchant','baker',17,9,[[17,9],[18,9],[18,8],[17,8]],'My copper awnings keep the sun off travelers and their stories.','Saffron cloth is valuable because it holds color after a hundred storms.','If the dunes change at night, follow the star carved into the east wall.'],
  ['omar','Omar the Pathkeeper','guard',8,13,[[8,13],[9,13],[9,14],[8,14]],'I mark safe stones before every caravan leaves at dawn.','The moonwell bridge is narrow. Keep to the paved path.','The Oracle Labyrinth lies beyond the northern desert road.'],
  ['laleh','Laleh the Stargazer','scholar',17,13,[[17,13],[16,13],[16,14],[17,14]],'The constellation has one star too few; I have kept an empty space in my charts.','I measure the changes in the night inscriptions.','Nomad Sel still remembers the shape of the missing prophecy.'],
  ['hassan','Hassan the Copperwright','smith',12,3,[[12,3],[13,3],[13,4],[12,4]],'The smiths can hear a sandstorm coming through their anvils.','I tune little bells so caravans can find the way home.','The copper path is calmer just before the night wind arrives.']
 ],
 [
  ['ilex','Ilex the Windwright','smith',7,9,[[7,9],[7,10],[8,10],[8,9]],'The rigging hums today; there is a change brewing above the islands.','I mend skybridge joints and check every brass pin twice.','Captain Aeris alone knows the safe airstairs to the Storm Observatory.'],
  ['nova','Nova the Deckhand','sailor',17,9,[[17,9],[18,9],[18,10],[17,10]],'Clouds underfoot make even old sailors nervous at first.','I check the cargo nets when the afternoon winds build.','A falling compass needle points to broken navigation glyphs.'],
  ['piri','Piri the Messenger','courier',8,13,[[8,13],[9,13],[9,14],[8,14]],'Letters arrive here tied to birds with silver ribbons.','I sort the letters at the landing before the ships depart.','An old sky chart lies somewhere below the northern deck.'],
  ['thea','Thea the Cloud Gardener','gardener',17,13,[[17,13],[16,13],[16,14],[17,14]],'Flowers float where the rain catches beneath the wind rails.','I collect dew for the potted gardens along the dock.','The wind chimes are quiet whenever the navigation glyphs fade.'],
  ['ren','Ren the Sky Watch','guard',12,3,[[12,3],[13,3],[13,4],[12,4]],'I watch the cloudbanks for storms with no horizon.','The flight board gets another warning every few hours.','Talk to Captain Aeris before choosing a route beyond the harbor.']
 ],
 [
  ['bryn','Bryn the Frost Keeper','guard',7,9,[[7,9],[7,10],[8,10],[8,9]],'The watchfires turn pale blue when a page vanishes from the map.','I tend the north gate and keep the pathways clear of ice.','Keeper Nox can explain why the snow hides gaps in the world.'],
  ['eira','Eira the Glassblower','smith',17,9,[[17,9],[18,9],[18,10],[17,10]],'My iceglass never breaks in cold, only when the story inside is forgotten.','I make lantern lenses from aurora crystals.','The northern beacon still shines if you speak your name beside it.'],
  ['sol','Sol the Trail Scout','courier',8,13,[[8,13],[9,13],[9,14],[8,14]],'Some paths disappear while I am walking them. I leave twine markers now.','I carry bundles to the watch tower before dark.','The Frostbound Vault is hidden beyond the ice road.'],
  ['maera','Maera the Herbalist','gardener',17,13,[[17,13],[16,13],[16,14],[17,14]],'Even the winter moss can tell whether a traveler will return.','I keep warm infusions for the south-bound patrols.','Look for the crystals near the watch road. They mark safer ice.'],
  ['torr','Torr the Northern Scribe','scholar',12,3,[[12,3],[13,3],[13,4],[12,4]],'I write the missing streets in a book so they remain in memory.','Keeper Nox taught me to press names into iceglass.','Our oldest page names the White Phantom, then stops mid-sentence.']
 ],
 [
  ['iona','Iona the Indexer','scholar',7,9,[[7,9],[7,10],[8,10],[8,9]],'Every new book creates another shelf. The final hall is growing again.','I keep the living catalogue by author, place and vow.','The First Keeper knows what the Eraser believed forgetting would accomplish.'],
  ['quinn','Quinn the Page Runner','courier',17,9,[[17,9],[18,9],[18,10],[17,10]],'Pages drift out of the stacks when nobody is looking.','I carry fresh ink and binding cord between the library wings.','The marble letters on the road spell a warning when read backwards.'],
  ['sorel','Sorel the Restorer','smith',8,13,[[8,13],[9,13],[9,14],[8,14]],'A broken binding can be repaired. A lost name needs a friend.','I restore torn volumes at the Glyphsmith Atelier.','The Eraser was not always the enemy; read the oldest histories.'],
  ['arun','Arun the Candlekeeper','baker',17,13,[[17,13],[16,13],[16,14],[17,14]],'These candles burn with the light of remembered kindness.','I watch the lamps along the script-road as the sun sets.','A new flame appears whenever someone tells the truth.'],
  ['meya','Meya the First Student','child',12,3,[[12,3],[13,3],[13,4],[12,4]],'I found a book with only the first word written. The rest was waiting for me.','I practise reading the old glyphs before class.','The First Keeper sometimes leaves a blank page for visitors to fill.']
 ]
];
function registry(region){return region<4?PEOPLE[region]:LATER_CITIZENS[region-4];}
const BLOCKED=new Set(['wall','tree','house','water','mountain','dune','cloudbank','oasis','icewall','snowpine','ink','inkwall']);
function passable(scene,x,y){return x>=1&&y>=1&&x<scene.map.w-1&&y<scene.map.h-1&&!BLOCKED.has(scene.map.tiles[y]?.[x])&&!scene.staticObstacles.has(x+','+y);}
function nearest(scene,x,y){if(passable(scene,x,y))return [x,y];for(let d=1;d<Math.max(scene.map.w,scene.map.h);d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++){if(Math.abs(dx)+Math.abs(dy)!==d)continue;if(passable(scene,x+dx,y+dy))return [x+dx,y+dy];}return null;}
function create(region,map,objects){
 const scene={region,map,staticObstacles:new Set(objects.filter(o=>o.type!=='exit').map(o=>o.x+','+o.y)),people:[],ticks:0};
 registry(region).forEach((data,i)=>{
  const [id,name,role,x,y,rawPatrol,hello,work,hint]=data;
  const spawn=nearest(scene,x,y);if(!spawn)return;
  const patrol=rawPatrol.map(([px,py])=>nearest(scene,px,py)).filter(Boolean).filter((a,j,arr)=>j===0||a[0]!==arr[j-1][0]||a[1]!==arr[j-1][1]);
  const actor={id:'citizen:'+region+':'+id,name,label:name,role,roleIndex:ROLES.indexOf(role),type:'citizen',x:spawn[0],y:spawn[1],drawX:spawn[0],drawY:spawn[1],facing:i%4,frame:0,phase:0,delay:i+1,waypoints:patrol.length?patrol:[spawn],waypoint:0,paused:0,lines:[hello,work,hint],idleLine:hello.split('.')[0]+'.',meetings:0};
  scene.people.push(actor);
 });
 return scene;
}
function shortestStep(scene,actor,tx,ty,player){
 const q=[[actor.x,actor.y,null]],seen=new Set([actor.x+','+actor.y]);
 for(let i=0;i<q.length;i++){
  const [x,y,first]=q[i];if(x===tx&&y===ty)return first;
  for(const [dx,dy,dir] of [[0,1,0],[-1,0,1],[1,0,2],[0,-1,3]]){
   const nx=x+dx,ny=y+dy,k=nx+','+ny;
   if(seen.has(k)||!passable(scene,nx,ny)||(player?.x===nx&&player?.y===ny)||scene.people.some(other=>other!==actor&&other.x===nx&&other.y===ny))continue;
   seen.add(k);q.push([nx,ny,first||[dx,dy,dir]]);
  }
 }
 return null;
}
function tick(scene,player){
 if(!scene)return;
 scene.ticks++;
 for(const actor of scene.people){
  actor.drawX+=(actor.x-actor.drawX)*.55;actor.drawY+=(actor.y-actor.drawY)*.55;
  if(actor.paused>0){actor.paused--;actor.frame=0;continue;}
  if(--actor.delay>0)continue;
  actor.delay=3+(actor.roleIndex%3);
  if(scene.ticks%13===0){actor.paused=3+(actor.roleIndex%3);continue;}
  let goal=actor.waypoints[actor.waypoint%actor.waypoints.length];
  if(actor.x===goal[0]&&actor.y===goal[1]){actor.waypoint=(actor.waypoint+1)%actor.waypoints.length;goal=actor.waypoints[actor.waypoint];}
  const step=shortestStep(scene,actor,goal[0],goal[1],player);
  if(!step){actor.delay=2;continue;}
  actor.x+=step[0];actor.y+=step[1];actor.facing=step[2];actor.frame=(actor.frame+1)%3;actor.drawX=Math.max(actor.x-.96,Math.min(actor.x+.96,actor.drawX));actor.drawY=Math.max(actor.y-.96,Math.min(actor.y+.96,actor.drawY));
 }
}
function near(scene,player,dist=1){return scene?scene.people.filter(o=>Math.abs(o.x-player.x)+Math.abs(o.y-player.y)<=dist).sort((a,b)=>Math.abs(a.x-player.x)+Math.abs(a.y-player.y)-(Math.abs(b.x-player.x)+Math.abs(b.y-player.y))):[];}
function at(scene,x,y){return scene?.people.find(o=>o.x===x&&o.y===y)||null;}
function hold(actor,ticks=40){if(actor)actor.paused=Math.max(actor.paused||0,ticks);}
function draw(scene,c,atlas,camera,player,tickCount=0){
 if(!scene||!atlas?.complete||!atlas.naturalWidth||typeof c.drawImage!=='function')return;
 c.imageSmoothingEnabled=false;
 for(const a of scene.people){
  if(a.drawX<camera.x-1||a.drawY<camera.y-1||a.drawX>=camera.x+18||a.drawY>=camera.y+14)continue;
  const x=(a.drawX-camera.x)*48,y=(a.drawY-camera.y)*48;
  const walk=Math.abs(a.drawX-a.x)+Math.abs(a.drawY-a.y)>.035;
  const frame=walk?(a.frame%3):1;
  c.fillStyle='#08151b7a';c.beginPath?.();
  if(c.ellipse){c.beginPath();c.ellipse(x+24,y+40,17,6,0,0,Math.PI*2);c.fill();}
  else c.fillRect(x+8,y+37,30,5);
  const sx=(a.roleIndex*3+frame)*56,dy=y-18+((tickCount+a.roleIndex)%7===0?1:0);
  if(a.facing===1){c.save();c.translate(x+48,0);c.scale(-1,1);c.drawImage(atlas,sx,0,56,66,-2,dy,52,61);c.restore();}
  else c.drawImage(atlas,sx,0,56,66,x-2,dy,52,61);
 }
}
function say(actor,topic=0,cleared=false){
 if(!actor)return '';
 if(cleared)return actor.name.split(' ')[0]+': The guardian is gone. We can finally rebuild without fearing that old silence. '+actor.lines[Math.min(2,topic)];
 return actor.lines[Math.max(0,Math.min(2,topic))];
}
const api={create,tick,near,at,hold,say,draw,passable,ROLES,PEOPLE};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQTownsfolk=api;
})(typeof window!=='undefined'?window:globalThis);
