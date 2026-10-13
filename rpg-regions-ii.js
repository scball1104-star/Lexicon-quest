/* Lexicon Quest — authored public squares for the four northern/eastern realms.
 * Region 4–7 town layouts replace the old identical green crossroads.
 * These maps remain 25×19 and use the established v3 save schema.
 */
(function(root){
'use strict';
const names=['WHISPERING DESERT','SKYBOUND ISLES','HOLLOW NORTH','FIRST LIBRARY'];
const locations=[
 {title:'Saffron Haven · The Moonwell Caravanserai',flavor:'Copper domes flank the oasis. Market cloth snaps in dry wind while the nomad path leads north to the Oracle Labyrinth.'},
 {title:'Zephyr Landing · The Windward Docks',flavor:'An airy skyport of rope bridges, brass observatories and cloud gardens. Wind chimes mark safe crossings between islands.'},
 {title:'Palehaven · The Thawing Hearth',flavor:'Blue-ice ramparts shelter a little settlement. Aurora crystals warm the square as snow drifts over an ancient watch road.'},
 {title:'The Scriptorium · First Library Enclave',flavor:'The final inhabited street is built of marble pages and ink-dark canals. Book towers stand where houses should be.'}
];
const maker=(fill)=>({w:25,h:19,tiles:Array.from({length:19},()=>Array(25).fill(fill)),objects:[],decor:[],title:'',flavor:''});
function rect(m,x1,y1,x2,y2,t){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;}
function path(m,coords,t='road'){for(let i=0;i<coords.length-1;i++){let [x,y]=coords[i],[tx,ty]=coords[i+1];while(x!==tx||y!==ty){if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);}if(m.tiles[y]?.[x]!==undefined)m.tiles[y][x]=t;}}
function obj(m,r,id,type,x,y,label,extra={}){m.objects.push({id:`${r}-0-${id}`,type,x,y,label,r,f:0,...extra});}
function deco(m,type,x,y,extra={}){m.decor.push({type,x,y,...extra});}
function placeServices(m,r,names){obj(m,r,'inn','inn',5,6,names[0]);obj(m,r,'shop','shop',19,6,names[1]);obj(m,r,'forge','forge',5,14,names[2]);obj(m,r,'board','board',19,13,names[3]);obj(m,r,'elder','npc',12,5,names[4]);obj(m,r,'out','exit',12,17,names[5]);}
function frame(m,wall){rect(m,0,0,24,0,wall);rect(m,0,1,0,18,wall);rect(m,24,1,24,18,wall);}
function carveSquare(m,road,plaza){rect(m,11,2,13,17,road);rect(m,2,10,22,11,road);rect(m,9,8,15,12,plaza);path(m,[[5,6],[5,10]],road);path(m,[[19,6],[19,10]],road);path(m,[[5,14],[5,11]],road);path(m,[[19,13],[19,11]],road);}
function buildings(m,tile='house'){
 rect(m,2,2,8,4,tile);rect(m,16,2,22,4,tile);
 rect(m,2,12,7,13,tile);rect(m,17,15,22,16,tile);
}
function town4(){const r=4,m=maker('sand');Object.assign(m,locations[0]);frame(m,'dune');
 rect(m,2,2,9,7,'sandstone');rect(m,15,2,22,7,'sandstone');rect(m,2,12,8,16,'sandstone');rect(m,16,12,22,16,'sandstone');
 buildings(m);carveSquare(m,'sandroad','mosaic');
 rect(m,9,9,10,10,'oasis');rect(m,14,9,15,10,'oasis');
 rect(m,10,6,14,6,'sandroad');rect(m,16,13,21,13,'sandroad');
 for(const [x,y] of [[3,8],[7,8],[16,8],[21,9],[2,17],[22,17]])deco(m,'palm',x,y);
 for(const [x,y] of [[8,10],[16,10],[10,12],[14,12]])deco(m,'carpet',x,y);
 deco(m,'obelisk',12,9);deco(m,'market',4,8);deco(m,'market',20,8);deco(m,'copperlamp',10,7);deco(m,'copperlamp',14,7);
 placeServices(m,r,['Dune Lantern Rest','Saffron Caravan Supplies','Copperwind Smithy','The Sandstone Bulletin','Nomad Sel','South Caravan Trail · World Road']);
 obj(m,r,'moonwell','oracleShrine',12,10,'Moonwell of Unspoken Names');
 obj(m,r,'witness1','oracleWitness',7,10,'Yara - Caravan Keeper',{clue:'yara',talk:'The Sand Oracle once promised to see all journeys. Now it only sees the end of them. My father left his route to protect the missing.'});
 obj(m,r,'witness2','oracleWitness',17,10,'Kamal - Water Bearer',{clue:'kamal',talk:'The oasis water tells the truth when the wind grows still. A false horizon leads back to the same thirsty road.'});
 obj(m,r,'witness3','oracleWitness',19,15,'Nasrin - Star Reader',{clue:'nasrin',talk:'There are three vows in the old caravan law: Shelter, Truth, Return. Without a return, a journey is only exile.'});
 obj(m,r,'mural','inscription',19,15,'The Caravan Mural',{text:'A mosaic shows seven wandering stars returning to an eighth that has no symbol.'});
 return m;}
function town5(){const r=5,m=maker('skygrass');Object.assign(m,locations[1]);frame(m,'cloudbank');
 rect(m,1,2,8,7,'planks');rect(m,16,2,23,7,'planks');rect(m,1,12,8,16,'skygrass');rect(m,16,12,23,16,'skygrass');
 rect(m,2,2,8,4,'house');rect(m,16,2,22,4,'house');rect(m,2,12,7,13,'house');rect(m,17,15,22,16,'house');
 carveSquare(m,'skywalk','windstone');rect(m,8,3,9,7,'cloudbank');rect(m,15,3,16,7,'cloudbank');rect(m,7,8,8,9,'cloudbank');rect(m,16,8,17,9,'cloudbank');
 path(m,[[5,6],[5,10]],'skywalk');path(m,[[19,6],[19,10]],'skywalk');
 rect(m,7,10,8,11,'skybridge');rect(m,16,10,17,11,'skybridge');
 deco(m,'windsock',10,5);deco(m,'windsock',14,5);deco(m,'airship',12,8);deco(m,'rotor',6,8);deco(m,'rotor',20,8);
 for(const [x,y] of [[9,13],[15,13],[8,15],[16,15]])deco(m,'skyflower',x,y);
 placeServices(m,r,['The Cloudhouse Inn','Aeris Flight Provisions','Galewing Workshop','Skyport Departure Board','Captain Aeris','South Airstair · World Road']);
 obj(m,r,'crew1','skyWitness',7,10,'Liora - Wind Navigator',{clue:'liora',talk:'The Storm Scribe replaced our rescue beacons with false arrival times. My sister waited at the wrong dock until the clouds swallowed her signal.'});
 obj(m,r,'crew2','skyWitness',17,10,'Bennet - Rigging Master',{clue:'bennet',talk:'Our old rule: an honest captain turns back when a beacon calls. The Scribe erased the word RETURN from every flight plan.'});
 obj(m,r,'crew3','skyWitness',19,14,'Suri - Sky Cartographer',{clue:'suri',talk:'The wind rudders should point West-South, North-East, South-West. Aeris knows what happened on the last rescue run.'});
 obj(m,r,'beacon','skyBeacon',12,10,'Signal Beacon of Lost Flights');
 obj(m,r,'captainslog','inscription',12,10,'Captain’s Brass Skychart',{text:'The compass is broken into seven glyphs. A good pilot follows the wind, but a brave one learns to listen.'});
 obj(m,r,'flag','inscription',20,15,'Windward Flag',{text:'Three knots mean safe passage; one knot marks a storm warning. The sky has been forgetting the difference.'});
 return m;}
function town6(){const r=6,m=maker('snow');Object.assign(m,locations[2]);frame(m,'snowpine');
 rect(m,1,2,9,7,'permafrost');rect(m,15,2,23,7,'permafrost');rect(m,1,12,9,16,'icebrick');rect(m,15,12,23,16,'icebrick');
 buildings(m);carveSquare(m,'icepath','frostmosaic');
 rect(m,8,4,9,7,'icewall');rect(m,15,4,16,7,'icewall');
 path(m,[[5,6],[5,10]],'icepath');path(m,[[19,6],[19,10]],'icepath');
 for(const [x,y] of [[7,8],[17,8],[9,13],[15,13],[21,14]])deco(m,'crystal',x,y);
 deco(m,'auroraobelisk',12,9);deco(m,'snowpine',3,8);deco(m,'snowpine',21,8);deco(m,'frostfire',10,7);deco(m,'frostfire',14,7);
 placeServices(m,r,['Thawlight Lodge','Northwind Provisions','Glass-Ice Armory','Keeper’s Watch Notice','Keeper Nox','South Icegate · World Road']);
 obj(m,r,'glyph','inscription',10,9,'The Vanishing Mark',{text:'A hollow space between carved runes grows whenever a person’s name is forgotten.'});
 obj(m,r,'beacon','inscription',19,15,'The Northward Beacon',{text:'This beacon stood before snow had a name. Each returning traveler adds one shard of glass.'});
 return m;}
function town7(){const r=7,m=maker('vellum');Object.assign(m,locations[3]);frame(m,'inkwall');
 rect(m,1,2,9,7,'parchment');rect(m,15,2,23,7,'parchment');rect(m,1,12,9,16,'parchment');rect(m,15,12,23,16,'parchment');
 buildings(m);carveSquare(m,'letterpath','scriptmosaic');
 rect(m,8,5,9,7,'ink');rect(m,15,5,16,7,'ink');rect(m,8,12,9,13,'ink');rect(m,15,12,16,13,'ink');
 path(m,[[5,6],[5,10]],'letterpath');path(m,[[19,6],[19,10]],'letterpath');
 for(const [x,y] of [[4,8],[20,8],[3,16],[21,16]])deco(m,'booktower',x,y);
 deco(m,'pagefountain',12,9);deco(m,'quill',9,7);deco(m,'quill',15,7);deco(m,'goldscroll',10,13);deco(m,'goldscroll',14,13);
 placeServices(m,r,['Keeper’s Quiet Rooms','Bibliotheca Supplies','Glyphsmith Atelier','First Library Index','The First Keeper','South Margin · World Road']);
 obj(m,r,'codex','inscription',12,10,'The Living Codex',{text:'Every written life makes the First Library larger. The Eraser believes an empty page is a peaceful page.'});
 obj(m,r,'promise','inscription',19,15,'A Promise in Gold Leaf',{text:'A name remembered in kindness can never be used as a chain. This is the purpose of the Lexicon.'});
 return m;}
const api={town:r=>[town4,town5,town6,town7][r-4](),locations};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQRegionsII=api;
})(typeof window!=='undefined'?window:globalThis);
