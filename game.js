const CLUES=[
["EMBER","A glowing fragment left after a fire","A small piece that continues to glow after flames die",1,"nature"],
["RUNE","An ancient symbol associated with magic","A character from an old alphabet often used in fantasy",1,"magic"],
["RELIC","An object surviving from an earlier age","An ancient object preserved from the past",1,"history"],
["ANVIL","A heavy metal block used by a smith","A blacksmith's heavy work surface",1,"craft"],
["ORACLE","A source believed to reveal hidden knowledge","A figure associated with prophecy",2,"magic"],
["PHANTOM","A ghostly apparition","Something seen like a ghost",2,"creature"],
["SCROLL","A rolled manuscript","A roll of parchment bearing writing",1,"writing"],
["CIPHER","A secret system of writing","A code used to disguise information",2,"writing"],
["TORCH","A portable burning light","A handheld source of flame and light",1,"object"],
["SHIELD","Defensive equipment carried in battle","Something held to block attacks",1,"battle"],
["CRYPT","An underground burial chamber","A stone chamber used for burial",2,"place"],
["LEGEND","A traditional story handed down over time","A story of famous heroes or events",1,"story"],
["MEMORY","The faculty used to remember information","What the mind retains from experience",1,"mind"],
["KINGDOM","A realm ruled by a monarch","A territory governed by a king or queen",1,"realm"],
["ARCHIVE","A collection of historical records","A place where old records are preserved",2,"writing"],
["MIRROR","A reflective surface","An object that shows your reflection",1,"object"],
["RIDDLE","A puzzling question requiring thought","A question designed to be solved",1,"word"],
["THRONE","A ceremonial seat for a ruler","The seat of a king or queen",1,"realm"],
["TEMPLE","A building devoted to worship","A sacred building used for worship",1,"place"],
["BEACON","A light or signal used as a guide","A guiding signal visible from afar",2,"object"],
["SENTINEL","A guard stationed to keep watch","A person or thing that keeps watch",2,"battle"],
["SANCTUM","A sacred or private place","A protected sacred chamber",2,"place"],
["COMPASS","An instrument that shows direction","A tool whose needle can point north",1,"object"],
["CHRONICLE","A factual account arranged in time order","A written record of events over time",3,"writing"],
["MANTLE","A cloak or covering","A loose sleeveless cloak",2,"object"],
["CITADEL","A fortified stronghold","A fortress protecting a city",2,"place"],
["GRIFFIN","A mythical beast with eagle and lion features","A creature that is part eagle and part lion",2,"creature"],
["WYVERN","A dragon-like winged creature","A two-legged draconic monster",2,"creature"],
["POTION","A liquid with magical or medicinal effect","A drink that may restore health",1,"magic"],
["TAVERN","An inn or public house","A place serving drink and lodging",1,"place"],
["FORGE","A smith's workshop or furnace","Where a blacksmith heats and shapes metal",1,"craft"],
["QUILL","A feather used as a writing pen","An old-fashioned pen made from a feather",1,"writing"],
["GLYPH","A carved or written symbol","A symbolic mark or character",2,"writing"],
["SCEPTER","A ceremonial staff carried by royalty","A ruler's ornamental staff",2,"realm"],
["LABYRINTH","A complicated maze","A network of confusing passages",3,"place"],
["DESTINY","A predetermined course of events","Another word for fate",2,"story"],
["VILLAGE","A small settlement","A community smaller than a town",1,"place"],
["BEAST","A large or dangerous animal","A creature, especially a wild one",1,"creature"],
["CROWN","A royal headpiece","A monarch's ceremonial headwear",1,"realm"],
["SPELL","Words or actions used to produce magic","A magical formula or incantation",1,"magic"],
["ARMOR","Protective equipment worn in battle","Battle gear designed to protect the body",1,"battle"],
["QUEST","A heroic journey or mission","A mission undertaken by an adventurer",1,"story"],
["SWORD","A weapon with a blade and hilt","A long bladed weapon",1,"battle"],
["DRAGON","A legendary reptilian beast","A mythical creature often said to breathe fire",1,"creature"],
["FOREST","A large area covered with trees","Woodland containing many trees",1,"nature"],
["FLAME","The visible burning part of a fire","A tongue of fire",1,"nature"],
["SHADOW","A dark shape caused when light is blocked","A dark outline cast by an object",1,"nature"],
["FANG","A long pointed tooth","A sharp canine tooth of a beast",1,"creature"],
["HOWL","A long loud cry made by a wolf","The drawn-out call of a wolf",1,"creature"],
["MANA","Magical energy used for spells","A fantasy resource often represented by MP",1,"magic"],
["ELIXIR","A magical or medicinal liquid","A powerful restorative potion",2,"magic"],
["PRISM","A transparent object that splits light","A glass shape that separates light into colors",2,"object"],
["TOME","A large scholarly book","A large or heavy book",1,"writing"],
["SCRIPT","Written text","A written version of words or dialogue",1,"writing"],
["INDEX","An alphabetical list of topics","A list helping readers locate material in a book",2,"writing"],
["CODEX","An ancient manuscript in book form","An old handwritten book",2,"writing"],
["INK","Colored fluid used for writing","Liquid used in pens and printing",1,"writing"],
["PARCHMENT","A writing material used before modern paper","Prepared skin once used for manuscripts",3,"writing"],
["SCRIBE","A professional copyist or writer","A person who copied documents by hand",2,"writing"],
["WARDEN","A person responsible for guarding a place","A guardian or keeper",2,"battle"],
["VAULT","A secure chamber","A strong room for valuables",1,"place"],
["SIGIL","A magical or symbolic sign","An emblem with mystical meaning",2,"magic"],
["ALTAR","A raised structure used in worship","A sacred table or platform",1,"place"],
["MONARCH","A king or queen","A sovereign ruler",2,"realm"],
["PROPHECY","A prediction of future events","A foretelling of what will happen",2,"story"],
["RITUAL","A prescribed ceremonial action","A formal sequence of ceremonial acts",2,"magic"],
["PORTAL","A magical or grand entrance","A doorway or gateway",1,"place"],
["CAVERN","A large cave","A natural underground chamber",1,"place"],
["SHRINE","A sacred place dedicated to a figure or deity","A holy place for devotion",2,"place"],
["BANNER","A flag or standard","A large cloth bearing a symbol",1,"realm"],
["HELMET","Protective headgear","Armor worn on the head",1,"battle"],
["DAGGER","A short pointed weapon","A short knife used as a weapon",1,"battle"],
["AMULET","A charm worn for protection","A small object worn as a protective charm",2,"magic"],
["TALISMAN","An object believed to have magical power","A charm thought to bring luck or protection",3,"magic"],
["ENIGMA","Something mysterious or difficult to understand","A puzzle or mystery",2,"word"],
["DOMAIN","A territory or sphere of control","Land under a ruler's authority",2,"realm"],
["WRAITH","A ghostlike spirit","A spectral apparition",2,"creature"],
["SPECTER","A ghost or apparition","A frightening ghostlike figure",2,"creature"],
["OMEN","An event believed to predict the future","A sign of something to come",2,"story"],
["ECHO","A sound heard again after reflection","A repeated sound returning to its source",1,"nature"],
["FABLE","A short story often teaching a lesson","A tale that may use animals to teach a moral",2,"story"],
["VERDICT","A formal decision or judgment","The decision reached after considering a case",3,"word"],
["TORRENT","A strong fast-moving stream","A sudden powerful flow of water",2,"nature"],
["GROTTO","A small picturesque cave","A small cave or cavern",2,"place"],
["PILLAR","A tall vertical support","A column supporting a structure",1,"place"],
["KEYSTONE","The central locking stone of an arch","The crucial piece holding an arch together",3,"craft"],
["HARBOR","A sheltered place for ships","Protected water where vessels can anchor",1,"place"],
["MARSH","Wet low-lying land","A soggy area dominated by grasses",1,"nature"],
["SUMMIT","The highest point of a mountain","A mountain's top",1,"nature"],
["RAVINE","A deep narrow valley","A steep-sided gorge",2,"nature"],
["CINDER","A partly burned piece of coal or wood","A blackened fragment left by fire",2,"nature"],
["FURNACE","An enclosed structure for intense heat","A chamber used for heating or smelting",2,"craft"],
["HAMMER","A tool used for striking","A handled tool with a heavy head",1,"craft"],
["THREAD","A thin strand used for sewing","A fine length of fiber",1,"craft"],
["LOOM","A frame used for weaving","A machine or frame on which cloth is woven",2,"craft"],
["VELLUM","Fine parchment made from animal skin","A high-quality writing material used in old books",3,"writing"],
["MARGIN","The blank border around printed text","The empty edge around a page",2,"writing"],
["VERSE","A line or group of lines in poetry","Writing arranged in poetic lines",2,"writing"],
["STANZA","A grouped set of lines in a poem","A verse paragraph in poetry",2,"writing"],
["PROLOGUE","An introductory section of a story","The opening section before the main narrative",3,"story"],
["EPILOGUE","A concluding section of a story","A closing section after the main narrative",3,"story"],
["HERALD","A messenger who announces important news","An official bearer of proclamations",2,"realm"],
["REGENT","A person who rules for a monarch","A temporary ruler acting for a sovereign",3,"realm"],
["VASSAL","A person owing allegiance to a lord","A subordinate bound to a feudal ruler",3,"realm"],
["KEEP","The fortified central tower of a castle","The strongest tower inside a fortress",2,"place"],
["MOAT","A defensive ditch around a castle","A water-filled ditch surrounding a fortification",1,"place"]
].map(([a,c1,c2,d,cat])=>({a,c:[c1,c2],d,cat}));
(()=>{'use strict';
const root=document.getElementById('app'),$=s=>root.querySelector(s),V=id=>$(id).classList.remove('hidden'),H=id=>$(id).classList.add('hidden');
const CHAPTERS=[
{name:'WILLOWMERE',title:'The Missing Name',npc:'Elder Mael',portrait:'🧙',intro:'Words are vanishing from the books of Willowmere. Even familiar objects are losing their names.',talk:'A book without words, a road without a name. Find Mira at the old Archive and restore the seal before the town disappears.',boss:'THE ARCHIVORE',emoji:'👁️',anchor:'ARCHIVE',reward:'Lexicon Fragment',ending:'The Archivore was following a written list. Someone is orchestrating the erasures.'},
{name:'NAMELESS HOLLOW',title:'The Town Without a Name',npc:'Mayor Elian',portrait:'🎩',intro:'You reach a town whose residents cannot remember what it is called. Blank signs stand in the streets.',talk:'Our names are fading. The Mirror Court is stealing reflections and memories. Please, find the Nameless King.',boss:'THE NAMELESS KING',emoji:'👑',anchor:'MIRROR',reward:'Mirror Sigil',ending:'The town remembers its name: Hollowmere. Far away, the mountains begin to smolder.'},
{name:'EMBERPEAK',title:'The Forge of Ash',npc:'Master Orin',portrait:'🔨',intro:'The great forge has fallen silent and the miners speak only in whispers.',talk:'Our flame is alive, but no one remembers how to tend it. Wake the Ember Heart.',boss:'THE CINDER WARDEN',emoji:'🔥',anchor:'CINDER',reward:'Ember Heart',ending:'The forge reawakens. A royal messenger arrives with news from the eastern kingdom.'},
{name:'VALEWYN',title:'The Empty Throne',npc:'Regent Lyra',portrait:'👸',intro:'The royal chronicles contain blank pages, and courtiers disagree about who rules the kingdom.',talk:'The crown has been erased from the royal seal. Enter the Sunken Keep and find the lost king’s oath.',boss:'THE PAPER REGENT',emoji:'♛',anchor:'KINGDOM',reward:'Royal Oath',ending:'The kingdom’s history returns. A desert oracle calls your names across the sea.'},
{name:'WHISPERING DESERT',title:'The Last Prophecy',npc:'Nomad Sel',portrait:'🧕',intro:'Ancient inscriptions change every night. The wind seems to speak in forgotten languages.',talk:'The Oracle is trapped in a storm of unsaid words. Free her before the last prophecy vanishes.',boss:'THE SAND ORACLE',emoji:'🦂',anchor:'ORACLE',reward:'Prophecy Shard',ending:'The prophecy tells of a library above the clouds. You need a sky compass to reach it.'},
{name:'SKYBOUND ISLES',title:'Words on the Wind',npc:'Captain Aeris',portrait:'🧑‍✈️',intro:'You soar between floating islands where the winds carry broken sentences.',talk:'The navigation glyphs are dissolving. Restore the Sky Compass and we can reach the Hollow North.',boss:'THE STORM SCRIBE',emoji:'🌩️',anchor:'COMPASS',reward:'Sky Compass',ending:'The airship crosses the clouds. Below lies a land already half erased.'},
{name:'HOLLOW NORTH',title:'The Vanishing World',npc:'Keeper Nox',portrait:'🧙',intro:'Mountains flicker in and out of being. Villages have become gaps in the map.',talk:'The Eraser has nearly reached the First Library. Only the names you recovered can hold reality together.',boss:'THE WHITE PHANTOM',emoji:'👻',anchor:'PHANTOM',reward:'First Key',ending:'A staircase of written light leads into the First Library itself.'},
{name:'FIRST LIBRARY',title:'The Last Word',npc:'The First Keeper',portrait:'📜',intro:'At the center of existence stands a library whose pages contain every possible name.',talk:'The Eraser was once the First Keeper. He believes forgetting is mercy. Show him why the world deserves to remember.',boss:'THE ERASER',emoji:'🌑',anchor:'DESTINY',reward:'Living Lexicon',ending:'You restore the First Lexicon. The world remembers its stories—and begins writing new ones.'}
];
const MAPS=[
 ['############','#..g.......#','#..N.......#','#......T...#','#...t......#','#..M..P....#','#........B.#','#..S..Q.H..#','############'],
 ['############','#.....t....#','#..N..g....#','#.t.....T..#','#..........#','#..M..P....#','#..t.....B.#','#..S..Q.H..#','############'],
 ['############','#.....g....#','#..N.......#','#......T...#','#....t.....#','#..M..P.t..#','#........B.#','#..S..Q.H..#','############'],
 ['############','#..t.......#','#..N.......#','#......T...#','#.....g....#','#..M..P....#','#.....t..B.#','#..S..Q.H..#','############'],
 ['############','#......t...#','#..N..g....#','#......T...#','#...t......#','#..M..P....#','#........B.#','#..S..Q.H..#','############'],
 ['############','#...t......#','#..N.......#','#....g.T...#','#..........#','#..M..P....#','#..t.....B.#','#..S..Q.H..#','############'],
 ['############','#..g.......#','#..N.......#','#......T...#','#....t.....#','#..M..P....#','#......t.B.#','#..S..Q.H..#','############'],
 ['############','#..........#','#..N..g....#','#......T...#','#...t......#','#..M..P....#','#........B.#','#..S..Q.H..#','############']
];
// One optional dungeon entrance per region. Keep saved stage coordinates unchanged.
MAPS.forEach(rows=>{const r=rows[4].split('');r[9]='D';rows[4]=r.join('')});
function map(){return MAPS[state.chapter]}
const WEATHER=['🌿','🌫️','🔥','🏰','🏜️','☁️','❄️','📖'];
const WORLD_WEATHER=['mist','shimmer','ash','rain','sand','wind','snow','motes'];
const OPTIONAL_TASKS=[
 ['Recover Pell’s missing verses','Scribe Pell','The ink in my chronicle has scattered. Please restore the lost stanza.','VERSE'],
 ['Remember the old town bell','Bellkeeper Iona','The name of our ancient bell has vanished. Can you restore its tone?','ECHO'],
 ['Repair the ember furnace','Apprentice Renn','The smiths need a word to restart the furnace.','FURNACE'],
 ['Reaffirm the royal oath','Court Herald','The king’s forgotten symbol holds our oath.','SCEPTER'],
 ['Find the desert waymarker','Desert Guide','Travelers are lost without this guiding light.','BEACON'],
 ['Restore the cloud charts','Navigator Lyra','The sky charts are missing their most important direction.','COMPASS'],
 ['Recover the watchman’s name','Last Sentinel','The watcher forgot what to call his own post.','SENTINEL'],
 ['Write the closing chapter','First Scribe','Even endings deserve to be remembered.','EPILOGUE']
];
const icons={N:'🧙',T:'🎁',M:'👾',P:'📜',B:'👹',S:'🏪',Q:'❗',H:'✨',g:'🌳',t:'🌳'};
const shops=[['Potion',15],['Ether',22],['Phoenix Feather',65],['Steel Wordblade',90],['Guardian Mantle',100],['Vanguard Crest',140],['Warden Seal',140],['Sage Prism',140]];
const EQUIPMENT_STYLES={vanguard:{name:'Vanguard Crest',desc:'Scott: +20% word damage; larger enemy counterattacks'},warden:{name:'Warden Seal',desc:'Allies take 25% less damage; dungeon hazards reduced'},sage:{name:'Sage Prism',desc:'Mira magic costs 1 MP less; better clue hints'}};
const REGION_AFFINITIES=[
 {resist:'ARCANE',weak:'BLADE'},{resist:'BLADE',weak:'ARCANE'},{resist:'RUNE',weak:'ARCANE'},{resist:'BLADE',weak:'RUNE'},
 {resist:'ARCANE',weak:'RUNE'},{resist:'RUNE',weak:'BLADE'},{resist:'BLADE',weak:'ARCANE'},{resist:'ARCANE',weak:'BLADE'}
];
const BOSS_RITUALS=['Catalog of Silence','Mirror Coronation','Furnace Invocation','Drowned Decree','Hourglass Reversal','Gale Litany','Whiteout Census','Final Redaction'];
const BOSS_HAZARDS=[
 'Ink seals the party’s momentum.','Mirror shards return a fraction of careless force.','Furnace heat scorches every living ally.','Rising water weakens recovery magic.',
 'Sand veils the next clue.','A gale scatters accumulated Flow.','Whiteout numbs the strongest spellcaster.','Erasure strips a resource from the page.'
];
const ELITE_RULES=[
 {label:'PRECISION INDEX',hint:'Typed answers pierce the Errant Index; ordinary answers are heavily reduced.',type:'typed'},
 {label:'MIRROR RHYTHM',hint:'Alternate typed and choice answers. Repeating the same style feeds the reflection.',type:'alternate'},
 {label:'COALHEART PRESSURE',hint:'Build at least 3 FLOW before striking for full damage.',type:'flow'},
 {label:'DROWNED RITUAL',hint:'Interrupt its decree with a correct typed word before the ritual resolves.',type:'ritual'},
 {label:'HOURGLASS CHAIN',hint:'Maintain a 3-word chain to escape the loop and deal full damage.',type:'chain'},
 {label:'STORM SILENCE',hint:'Mira’s Silence Glyph exposes the Harrier.',type:'silence'},
 {label:'MEMORY PROVOCATION',hint:'Bram’s Taunt forces the Rememberer to reveal its core.',type:'taunt'},
 {label:'THREE TESTIMONIES',hint:'Use each companion’s signature technique before the Judge fully yields.',type:'triad'}
];
const FORGE_RECIPES=[
 {id:'edge',name:'Tempered Lexicon Edge',shards:2,gold:100,desc:'+1 permanent weapon proficiency',apply(){state.weapon+=1}},
 {id:'aegis',name:'Runic Aegis Plate',shards:2,gold:100,desc:'+1 permanent armor',apply(){state.armor+=1}},
 {id:'loom',name:'Mana Loom',shards:2,gold:120,desc:'+2 max MP for the active party',apply(){for(const n of state.party){state.maxmp[n]+=2;state.mp[n]=state.maxmp[n]}}}
];
function equipmentStyle(){return state?.equipmentStyle||'none'}
function combatEnemyArt(){if(!battle)return;const c=state.chapter;const types=['ink','glass','ember','tide','sand','sky','frost','void'];const el=document.querySelector('.battle-arena');if(el){el.dataset.foeBiome=types[c]||'ink';el.dataset.foeChapter=String(c);el.dataset.boss=battle.boss?'yes':'no';el.dataset.speed=state?.battleSpeed||'normal';}}
function attackElement(actorName,kind){if(actorName==='Mira')return 'ARCANE';if(actorName==='Bram')return 'RUNE';return kind==='special'?'RUNE':'BLADE'}
function affinityMultiplier(element){const a=REGION_AFFINITIES[state.chapter]||REGION_AFFINITIES[0];return element===a.weak?1.25:element===a.resist?.75:1}
function enemyStance(){if(!battle)return 'BALANCED';const cycle=['ASSAULT','GUARD','FOCUS'];return cycle[Math.floor((battle.round-1)/2)%cycle.length]}
function eliteIndex(){return battle?ELITE_HUNTS.findIndex(h=>h[0]===battle.name):-1}
function eliteRule(){const i=eliteIndex();return i>=0?ELITE_RULES[i]:null}
function capstoneBonus(p){return state.lv>=20?1:0}

let state=null,saveSlots=[null,null,null],slot=0,screen='title',dialog=[],afterDialog=null,battle=null,cross=null,selected=null,questChallenge=null;
// Keep stable party IDs for combat, sprites, and legacy saves; names are display data.
function cleanHeroName(value){return typeof value==='string'?Array.from(value.normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'').trim().replace(/\s+/g,' ')).slice(0,20).join(''):''}
function heroName(){return cleanHeroName(state?.heroName)||'Scott'}
function heroText(value){return String(value).replace(/\bScott\b|\bSCOTT\b/g,match=>match==='SCOTT'?heroName().toUpperCase():heroName())}
function heroHTML(value){
 // Substitute only text nodes, leaving stable data-party attributes intact.
 const html=String(value);if(!/\bScott\b|\bSCOTT\b/.test(html))return html;
 const template=document.createElement('template');template.innerHTML=html;
 const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
 while(walker.nextNode())walker.currentNode.textContent=heroText(walker.currentNode.textContent);
 return template.innerHTML;
}
function chooseHeroName(){
 screen='character';H('#title');H('#slots');H('#game');V('#character');
 $('#heroNameInput').value='';$('#heroNameError').textContent='';
 $('#heroNameInput').focus();
}
function award(name){if(!state)return;state.achievements=state.achievements||[];if(!state.achievements.includes(name)){state.achievements.push(name);beep(740,0.16)}}
let audioContext=null;function beep(hz=480,seconds=.055){if(!state?.sound||(window.LexiconAudio?.effectsGain()??1)===0)return;try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();const osc=audioContext.createOscillator(),vol=audioContext.createGain();osc.type='square';osc.frequency.value=hz;vol.gain.value=.023*(window.LexiconAudio?.effectsGain()??1);osc.connect(vol).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+seconds)}catch(e){}}
function read(){try{for(let i=0;i<3;i++)saveSlots[i]=JSON.parse(localStorage.getItem('lq_full_slot_'+i)||'null')}catch(e){}}
function write(){if(!state)return false;try{state.phoenixFeathers=Math.max(0,Number(state.phoenixFeathers)||0);state.sanctuaryBlessings=state.sanctuaryBlessings||{};state.milestoneNotices=state.milestoneNotices||[];state.battleSpeed=['normal','fast'].includes(state.battleSpeed)?state.battleSpeed:'normal';state.forgeShards=Math.max(0,Number(state.forgeShards)||0);state.forgeQuest=state.forgeQuest||{started:false,completed:false,crafted:[],shardsInitialized:false};state.forgeQuest.crafted=Array.isArray(state.forgeQuest.crafted)?state.forgeQuest.crafted:[];state.production=state.production||{rivalSeen:{},companionArcs:{Mira:0,Bram:0},ceremonies:{},rescues:{},timedEvents:{},visualFx:true,audioMix:'layered'};state.production.rivalSeen=state.production.rivalSeen||{};state.production.companionArcs=state.production.companionArcs||{Mira:0,Bram:0};state.production.ceremonies=state.production.ceremonies||{};state.production.rescues=state.production.rescues||{};state.production.timedEvents=state.production.timedEvents||{};state.production.visualFx=state.production.visualFx!==false;state.production.audioMix=['simple','layered'].includes(state.production.audioMix)?state.production.audioMix:'layered';localStorage.setItem('lq_full_slot_'+slot,JSON.stringify(state));saveSlots[slot]=JSON.parse(JSON.stringify(state));$('#continue').disabled=false;return true}catch(e){return false}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function fresh(){return{heroName:'Scott',chapter:0,x:5,y:7,lv:1,xp:0,gold:45,potions:3,ethers:2,weapon:1,armor:0,party:['Scott'],hp:{Scott:48,Mira:37,Bram:65},maxhp:{Scott:48,Mira:37,Bram:65},mp:{Scott:12,Mira:25,Bram:9},maxmp:{Scott:12,Mira:25,Bram:9},stages:{},history:[],misses:{},weaponXp:0,quill:false,completed:false,achievements:[],steps:0,streak:0,bestStreak:0,defeated:0,questWords:[],sound:true,flow:0,bestiary:{},lore:[],equipmentStyle:'none',ownedStyles:[],phoenixFeathers:0,sanctuaryBlessings:{},milestoneNotices:[],bossReplayWins:0,activeSeconds:0,encounterWins:{},specialUses:{},classPaths:{},battleSpeed:'normal',forgeShards:0,forgeQuest:{started:false,completed:false,crafted:[],shardsInitialized:false},production:{rivalSeen:{},companionArcs:{Mira:0,Bram:0},ceremonies:{},rescues:{},timedEvents:{},visualFx:true,audioMix:'layered'}}}
function milestone(message){
 state.milestoneNotices=state.milestoneNotices||[];
 if(!state.milestoneNotices.includes(message)){state.milestoneNotices.push(message);if(state.milestoneNotices.length>32)state.milestoneNotices.shift()}
}
function regionalReputation(i){
 const st=state.stages?.[i]||{};let score=0;
 if(st.boss)score+=2;if(st.quest)score++;if(st.saga?.step===3)score+=2;
 if(st.eliteHunt)score++;if(st.ruins?.completed)score++;
 if(st.regionalTown?.ending||st.willowTown?.completed)score+=2;
 if(st.regionalTown?.crisis?.ending)score+=2;
 return {score,rank:score>=9?'LEGEND':score>=6?'CHAMPION':score>=3?'ALLY':'UNKNOWN'};
}
function postBossEpilogue(){
 if(state.chapter!==0||!stage().boss)return false;
 const st=stage();if(st.willowEpilogue)return false;
 st.willowEpilogue=true;milestone('Willowmere remembered the first victory.');
 state.lore=state.lore||[];
 state.lore.push('Willowmere epilogue: At dawn, the innkeeper relit every lantern. The bell rang once for each name the Archivore could not erase.');
 state.gold+=30;write();return true;
}
function stage(){return state.stages[state.chapter]||(state.stages[state.chapter]={npc:false,chest:false,monster:false,puzzle:false,boss:false,quest:false,shrine:false,puzzleData:null})}
function title(){window.LexiconExplore?.onView('title');window.LexiconPresentation?.closeDialogue();window.LexiconPresentation?.sync({chapter:0,screen:'title',settings:{}});H('#character');screen='title';V('#title');H('#slots');H('#game');window.LexiconAudio?.sync()}
function view(v){window.LexiconExplore?.onView(v);if(v!=='dialog')window.LexiconPresentation?.closeDialogue();H('#character');screen=v;H('#title');H('#slots');V('#game');['world','dialog','combat','cross','hub','shop','questScreen','transfer','ruins','storyPlace','willowTown','regionalTown'].forEach(n=>n===v?V('#'+n):H('#'+n));update()}
const RECOMMENDED_LEVELS=[1,3,5,7,9,12,15,18];
function recommendedLevel(ch=state.chapter){return RECOMMENDED_LEVELS[Math.max(0,Math.min(7,ch))]}
function xpCurveMultiplier(){const delta=recommendedLevel()-state.lv;return delta>=3?1.25:delta<=-4?.85:1}
function need(){return 50*state.lv+20*(state.lv-1)**2}
function update(){if(!state)return;window.LexiconPresentation?.sync({chapter:state.chapter,screen,settings:state.production});window.LexiconAudio?.sync();state.production=state.production||{rivalSeen:{},companionArcs:{Mira:0,Bram:0},ceremonies:{},rescues:{},timedEvents:{},visualFx:true,audioMix:'layered'};document.body.dataset.visualFx=state.production.visualFx===false?'off':'on';document.body.dataset.audioMix=state.production.audioMix||'layered';state.flow=Math.max(0,Math.min(5,Number(state.flow)||0));$('#heroHudName').textContent=heroName().toUpperCase();$('#level').textContent=state.lv;$('#gold').textContent=state.gold+'G';$('#hp').textContent=`${heroName()} HP ${state.hp.Scott}/${state.maxhp.Scott} · MP ${state.mp.Scott}/${state.maxmp.Scott}`;$('#hpbar').style.width=100*state.hp.Scott/state.maxhp.Scott+'%';$('#xp').textContent=`XP ${state.xp}/${need()} · Weapon P${state.weapon}`;$('#xpfill').style.width=Math.max(0,Math.min(100,100*state.xp/need()))+'%';$('#area').textContent=CHAPTERS[state.chapter].name;$('#chapter').textContent=`Ch ${state.chapter+1}: ${CHAPTERS[state.chapter].title}`;$('#quest').textContent=stage().boss?'Chapter complete — advance':stage().puzzle?'Defeat the boss':stage().npc?'Restore the crossword seal':'Speak with the local guide'}
function say(t){$('#message').textContent=heroText(t)}
let dialogueTotal=0;
function story(lines,done){dialog=lines.slice();dialogueTotal=lines.length;afterDialog=done||null;view('dialog');next()}
function next(){
 if(window.LexiconPresentation?.reveal())return;
 if(!dialog.length){let f=afterDialog;afterDialog=null;view(battle?'combat':'world');if(f)f();return}
 const x=dialog.shift(),name=heroText(x[0]),text=heroText(x[2]);$('#speaker').textContent=name;$('#portrait').textContent=x[1];$('#dialogText').textContent=text;
 window.LexiconPresentation?.dialogue({id:x[0],name,text,index:dialogueTotal-dialog.length,total:dialogueTotal});
}
function renderQuest(){
 const q=questChallenge;if(!q)return;
 $('#questTitle').textContent=q.objective;
 $('#questContext').textContent=q.npc+': '+q.request;
 const bank=CLUES.find(c=>c.a===q.answer);
 $('#questClue').textContent=bank?bank.c[0]:'Restore the missing word.';
 $('#questHint').textContent=q.fails?'Hint: '+hint(q.answer,q.fails):'Enter the missing word to restore it.';
 $('#questAnswer').value='';
}
function solveQuest(){
 const q=questChallenge;if(!q)return;
 const v=$('#questAnswer').value.trim().toUpperCase().replace(/[^A-Z]/g,'');
 if(v===q.answer){
  const st=stage();st.quest=true;state.gold+=70+state.chapter*20;state.potions+=2;
  award('Helper of '+CHAPTERS[state.chapter].name);questChallenge=null;
  view('world');draw();say('Side quest restored! +Gold and 2 Potions.');write();
 }else{
  q.fails++;$('#questHint').textContent='Not quite. '+hint(q.answer,q.fails);$('#questAnswer').select();
 }
}
function openTransfer(){view('transfer');$('#transferText').value='';$('#transferStatus').textContent='Export a save code or paste a code to import into this chronicle slot.'}
function codeForSave(){
 const data={format:'LQ_SAVE',version:1,payload:state};
 // UTF-8 safe, works for the story's non-ASCII characters.
 const bytes=new TextEncoder().encode(JSON.stringify(data));let binary='';
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary)
}
function importSave(raw){
 try{
  const v=raw.trim();if(!v||v.length>250000)throw Error('Invalid code length');
  const text=new TextDecoder().decode(Uint8Array.from(atob(v),c=>c.charCodeAt(0)));
  const data=JSON.parse(text);if(data?.format!=='LQ_SAVE'||data.version!==1)throw Error('Unrecognized save format');
  const z=data.payload;
  if(!z||!Number.isInteger(z.chapter)||z.chapter<0||z.chapter>=CHAPTERS.length||
     !Number.isInteger(z.lv)||z.lv<1||z.lv>30||!Array.isArray(z.party)||
     !z.party.includes('Scott')||!z.hp||!z.maxhp||!z.mp||!z.maxmp||
     !z.stages||!z.history||!z.misses||typeof z.gold!=='number'||
     !Number.isFinite(z.gold)||z.gold<0||!Number.isInteger(z.x)||!Number.isInteger(z.y)||
     z.x<1||z.x>10||z.y<1||z.y>7)throw Error('Invalid save data');
  for(const n of z.party){if(!['Scott','Mira','Bram'].includes(n)||!Number.isFinite(z.hp[n])||!Number.isFinite(z.maxhp[n])||!Number.isFinite(z.mp[n])||!Number.isFinite(z.maxmp[n]))throw Error('Invalid party');}
  // Only allow familiar serialized fields. Prevent strange payloads entering the game's own rendering.
  z.heroName=cleanHeroName(z.heroName)||'Scott';z.party=[...new Set(z.party)];z.history=z.history.slice(-55);z.achievements=Array.isArray(z.achievements)?z.achievements.filter(x=>typeof x==='string').slice(0,50):[];
  z.sound=z.sound!==false;z.stages=(z.stages&&typeof z.stages==='object'&&!Array.isArray(z.stages))?z.stages:{};z.encounterWins=z.encounterWins||{};z.classPaths=z.classPaths||{};z.activeSeconds=Number.isFinite(z.activeSeconds)?Math.max(0,z.activeSeconds):0;z.steps=Number.isFinite(z.steps)?Math.max(0,Math.min(10000000,z.steps)):0;z.battleSpeed=['normal','fast'].includes(z.battleSpeed)?z.battleSpeed:'normal';z.forgeShards=Math.max(0,Number(z.forgeShards)||0);z.forgeQuest=z.forgeQuest||{started:false,completed:false,crafted:[],shardsInitialized:false};z.forgeQuest.crafted=Array.isArray(z.forgeQuest.crafted)?z.forgeQuest.crafted:[];z.production=z.production||{rivalSeen:{},companionArcs:{Mira:0,Bram:0},ceremonies:{},rescues:{},timedEvents:{},visualFx:true,audioMix:'layered'};z.production.rivalSeen=z.production.rivalSeen||{};z.production.companionArcs=z.production.companionArcs||{Mira:0,Bram:0};z.production.ceremonies=z.production.ceremonies||{};z.production.rescues=z.production.rescues||{};z.production.timedEvents=z.production.timedEvents||{};z.production.visualFx=z.production.visualFx!==false;z.production.audioMix=['simple','layered'].includes(z.production.audioMix)?z.production.audioMix:'layered';
  return z;
 }catch(e){return null}
}
function start(name='Scott'){window.LexiconPresentation?.resetHistory();state=fresh();state.heroName=cleanHeroName(name)||'Scott';view('world');draw();const c=CHAPTERS[0];const opening=()=>story([['NARRATOR','📖','The world was spoken into being. Every river and kingdom was anchored by its name.'],['NARRATOR','📖',c.intro],['SCOTT','⚔️','Something is stealing our words. I intend to find out why.']],()=>{say('Talk to Elder Mael (🧙), then explore. Press A on a tile to interact.');write()});cinematic('THE FIRST LOST WORD','At the edge of Willowmere, an ordinary evening becomes the beginning of your chronicle.',opening,'chapter')} 
// Living-world residents use deterministic step-based patrols; no timers or extra save fields required.
const TOWN_RESIDENTS=[
 ['Tessa the Baker','The ovens smelled of rain this morning. That should not be possible.'],
 ['Pell the Messenger','My letters keep arriving with blank names on the envelopes.'],
 ['Orin the Tinker','A good repair holds until the world remembers why it broke.'],
 ['Seren the Gardener','Plants lean toward things that have been spoken kindly.'],
 ['Dax the Cartographer','A map is only trustworthy while the places agree to stay put.'],
 ['Lio the Apprentice','Every cloud has a word. I am collecting the ones we can still say.'],
 ['Nessa the Watcher','Fresh footsteps have appeared outside the watch post. No one came through.'],
 ['Edda the Binder','A book can lose its title and still keep its heart.']
];
function residentPositions(){
 const steps=state.steps||0, tiles=map(), candidates=[];
 for(let y=1;y<8;y++)for(let x=1;x<11;x++)if(tiles[y][x]==='.'&&!(x===state.x&&y===state.y))candidates.push({x,y});
 if(!candidates.length)return [];
 const a=candidates[(Math.floor(steps/3)+state.chapter*11)%candidates.length];
 const b=candidates[(Math.floor(steps/5)+state.chapter*19+Math.floor(candidates.length/2))%candidates.length];
 return [a,...(a.x===b.x&&a.y===b.y?[]:[b])];
}
function worldResidentTalk(){
 const people=residentPositions();const i=people.findIndex(p=>p.x===state.x&&p.y===state.y);
 // A resident shares a story when the player arrives on its former location or asks nearby.
 const st=stage(), npc=TOWN_RESIDENTS[state.chapter], complete=st.saga?.step===3;
 const lines=[npc[1],complete?'You brought back something this place had almost forgotten. People are starting to say the missing names again.':'Our streets feel stranger each day. The story location may hold an answer.',st.boss?'The town will remember the battle you won here.':'Even the guards are watching the old ruins now.'];
 const n=(st.townTalks||0)%lines.length;st.townTalks=(st.townTalks||0)+1;
 story([[npc[0], '🧑‍🌾',lines[n]]],()=>{write();draw()});
}
function townSquare(){
 const st=stage(), npc=TOWN_RESIDENTS[state.chapter], restored=st.saga?.step===3, won=st.boss;
 const lines=[['NARRATOR','🏘️','The square of '+CHAPTERS[state.chapter].name+' is alive with footsteps, shop bells, and voices.'],[npc[0],'🧑‍🌾',restored?'The quest changed the town. Listen: people have begun remembering the names they lost.':npc[1]],['TOWN CRIER','📯',won?'The chapter threat has passed. Lanterns will burn tonight in thanks.':'The roads are uneasy. Our people are looking for someone brave enough to investigate.']];
 if(restored&&!st.townGift){st.townGift=true;state.gold+=35;lines.push(['TOWN CRIER','🎁','The neighbors pooled 35 gold to thank you for restoring their memories.'])}
 story(lines,()=>{write();draw()});
}
function draw(){if(!state)return;if(window.LexiconExplore){update();window.LexiconExplore.show('world');return}$('#map').dataset.biome=String(state.chapter);$('#map').dataset.weather=WORLD_WEATHER[state.chapter];$('#map').dataset.weatherPhase=String(Math.floor((state.steps||0)/18)%2);let s='',st=stage(),tiles=map();for(let y=0;y<9;y++)for(let x=0;x<12;x++){let ch=tiles[y][x],ico=icons[ch]||'',cls=ch==='#'?'wall':ch==='.'?'':ch==='t'||ch==='g'?'forest':'road';if(ch==='N')ico=CHAPTERS[state.chapter].portrait;if(ch==='D')ico='⬇️';if(ch==='Q'&&st.quest)ico='✅';if(ch==='Q'&&st.saga?.step===3)ico='🌟';if(ch==='H'&&st.shrine)ico='🔹';if(ch==='g')ico=WEATHER[state.chapter];if(ch==='t')ico='🌲';if(ch==='M'&&st.monster)ico='';if(ch==='T'&&st.chest)ico='';if(ch==='P'&&st.puzzle)ico='✅';if(ch==='B'&&st.boss)ico='';if(ch==='.'&&st.saga?.step===3&&((x*7+y*11+state.chapter)%23===0))ico='🌼';if(ch==='.'&&st.boss&&((x*5+y*3+state.chapter)%29===0))ico='🏮';if(ch==='.'&&residentPositions().some(r=>r.x===x&&r.y===y))ico='🧑‍🌾';if(x===state.x&&y===state.y)ico='🧑‍🎤';s+=`<div class="tile ${cls}" data-type="${ch}" aria-label="${ico==='🧑‍🌾'?'Resident':ch==='#'?'Wall':ch==='.'?'Floor':'Landmark'}">${ico}</div>`}$('#map').innerHTML=s;update()}
function move(dx,dy){if(screen!=='world')return;if(window.LexiconExplore?.handles('world')){window.LexiconExplore.move(dx,dy);return}const nx=state.x+dx,ny=state.y+dy,tiles=map(),residentHere=residentPositions().some(r=>r.x===nx&&r.y===ny);if(!tiles[ny]||tiles[ny][nx]==='#'){say('That way is blocked.');return}state.x=nx;state.y=ny;state.steps=(state.steps||0)+1;draw();if(residentHere){worldResidentTalk();return}const ch=tiles[ny][nx];if(ch!=='.'&&ch!=='g'&&ch!=='t')action();else say('You explore '+CHAPTERS[state.chapter].name+'.')}
let explorationLegacyAction=false;
function action(){if(screen!=='world')return;if(!explorationLegacyAction&&window.LexiconExplore?.handles('world')){window.LexiconExplore.interact();return}const ch=map()[state.y][state.x],st=stage(),c=CHAPTERS[state.chapter];if(ch==='D'){enterRuins();return}if(ch==='N'){st.npc=true;const extra=[];if(state.chapter===0&&!state.party.includes('Mira')){state.party.push('Mira');extra.push(['MIRA','🔮','I will join you. My spells can reveal letters and heal our party.'])}if(state.chapter===1&&!state.party.includes('Bram')){state.party.push('Bram');extra.push(['BRAM','🛡️','I am Bram. My shield and Guard Word will protect the party.'])}story([[c.npc,c.portrait,c.talk],...extra],()=>{say('Quest updated: restore the local crossword seal.');write()});return}
if(ch==='Q'){
 const [objective,npc,request,answer]=OPTIONAL_TASKS[state.chapter];
 if(st.quest){say('Side quest completed: '+objective+'.');return}
 questChallenge={objective,npc,request,answer,fails:0};
 view('questScreen');renderQuest();return
 }
  if(ch==='H'){
 if(st.shrine){say('The word shrine is quiet now.');return}
 story([['WORD SHRINE','✨','A memory from an earlier age emerges. The party is blessed with renewed spirit.'],['MIRA','🔮','Every restored word brings back one small piece of the world. I wonder who is keeping count.'],['SCOTT','⚔️','Whoever is erasing them will have to get through us first.']],()=>{st.shrine=true;for(const p of state.party){state.hp[p]=state.maxhp[p];state.mp[p]=state.maxmp[p]}state.ethers++;say('Shrine restored HP/MP and granted an Ether.');write();draw()});return
 }
 if(ch==='T'){if(!st.chest){st.chest=true;state.gold+=45+state.chapter*15;state.potions+=2;state.ethers++;if(state.chapter===2)state.quill=true;say('Treasure! +Gold, 2 Potions and 1 Ether.'+(state.quill?' Quillfox joined!':''));write()}else say('The treasure chest is empty.');return}
if(ch==='M'){if(!st.monster)fight('WANDERING '+['SLIME','WRAITH','WOLF','BEETLE','SPECTER','WYVERN','PHANTOM','SHADE'][state.chapter],false);else say('This path is safe now.');return}
if(ch==='P'){if(!st.npc){say('Speak with the local guide before attempting the seal.');return}if(!st.puzzle)openCross(false);else say('The crossword seal is restored.');return}
if(ch==='B'){if(!st.puzzle){say('The boss is protected by an unresolved Across/Down seal.');return}if(!st.boss)cinematic(CHAPTERS[state.chapter].boss,BOSS_SCENES[state.chapter].line,()=>fight(c.boss,true));else if(state.completed){fight('ECHO OF THE ERASER',true);return}else advanceChapter();return}
if(ch==='S'){openShop();return}say('Nothing unusual here.')}
function advanceChapter(){const c=CHAPTERS[state.chapter];if(state.chapter===CHAPTERS.length-1){state.completed=true;const ending=()=>story([['SCOTT','⚔️','Every name has returned. The world remembers.'],['MIRA','🔮','And now its next story belongs to us.'],['NARRATOR','📖','THE END — LEXICON QUEST: THE FORGOTTEN WORDS'],['SYSTEM','🏆','The Echo Gauntlet is unlocked: return to the final map and challenge the guardian again for higher scores.']],()=>{say('Campaign complete! Replay the final boss or begin a new chronicle.');write()});cinematic('THE WORLD REMEMBERS','The rescued words return to the Living Lexicon. A new story begins.',ending,'chapter');return}
state.chapter++;state.x=5;state.y=7;state.streak=0;write();const nextC=CHAPTERS[state.chapter];const arrival=()=>story([['NARRATOR','📖',c.ending],['NARRATOR','🗺️',`CHAPTER ${state.chapter+1}: ${nextC.title.toUpperCase()}`],['NARRATOR','📖',nextC.intro],['SCOTT','⚔️',CHAPTER_BEATS[state.chapter].warning]],()=>{draw();say('A new region opens. Speak with the local guide.');write()});cinematic('CHAPTER '+(state.chapter+1)+' · '+nextC.name,nextC.intro,arrival,'chapter')}
const CLASS_MILESTONES=[{level:1,scott:'Squire',mira:'Apprentice',bram:'Guardian'},{level:5,scott:'Rune Knight',mira:'Spellweaver',bram:'Iron Sentinel'},{level:10,scott:'Wordblade',mira:'Oracle',bram:'Rune Bastion'},{level:16,scott:'Lexicon Champion',mira:'Archmage',bram:'Oathkeeper'},{level:20,scott:'Runesovereign',mira:'Lexicon Sage',bram:'Aegis Eternal'}];
function classTitle(p){const m=CLASS_MILESTONES.filter(x=>state.lv>=x.level).at(-1);return m[p.toLowerCase()]}
function skillLevel(p){return p==='Scott'?5:p==='Mira'?5:5}
function skillCost(p){return p==='Scott'?3:p==='Mira'?5:4}
function skillName(p){return p==='Scott'?'RUNE CLEAVE':p==='Mira'?'ECHO STORM':'OATH BARRIER'}
// Persistent class disciplines: meaningful player choices at levels 10 and 16.
const CLASS_PATHS={Scott:[['duelist','DUELIST · +25% word damage'],['captain','CAPTAIN · guarding builds Flow']],Mira:[['oracle','ORACLE · Echo Storm also heals'],['channeler','CHANNELER · spell MP costs reduced']],Bram:[['bulwark','BULWARK · barriers cut more damage'],['keeper','KEEPER · barriers restore more HP']]};
function classPath(p){return(state.classPaths||{})[p]||''}
function pathBonus(p,kind){const path=classPath(p);return path===kind}
function classProgress(){view('hub');const panel=$('#hubDetails'),actions=$('#hubActions');actions.innerHTML='';panel.innerHTML=heroHTML('<h3>CLASS DISCIPLINES</h3><p>At level 10, choose one permanent discipline for each companion. Level 16 strengthens that choice. Level 20 grants a capstone evolution: Scott gains +10% damage, Mira reduces technique MP costs by 1, and Bram grants the party 10% incoming-damage resistance.</p>');
 for(const p of state.party){const choices=CLASS_PATHS[p];const row=document.createElement('p');row.textContent=heroText(p+' · '+classTitle(p)+' · '+(classPath(p)||'Discipline not chosen'));panel.appendChild(row);if(state.lv>=10&&!classPath(p))for(const [id,label] of choices){const btn=document.createElement('button');btn.textContent=heroText(p+' — '+label);btn.onclick=()=>{state.classPaths=state.classPaths||{};state.classPaths[p]=id;write();classProgress()};actions.appendChild(btn)}}
 const back=document.createElement('button');back.textContent='RETURN TO PARTY MENU';back.onclick=openHub;actions.appendChild(back);
}
// Optional elite hunts provide authored regional objectives and pacing, once per region.
const ELITE_HUNTS=[['Errant Index','A runaway catalog has begun stealing the names of living children.'],['Mirror Usurper','A counterfeit reflection challenges the party to remember who they are.'],['Coalheart Devourer','An ember-fed predator has trapped the last forge apprentices.'],['Drowned Chancellor','A waterlogged decree condemns the innocent to silence.'],['Hourglass Reaver','An outlaw rewrites the dates of entire lives.'],['Stormbound Harrier','A hunter steals the letters from every wind-carried message.'],['Pale Rememberer','The frost preserves the wrong version of the past.'],['Unwritten Judge','A forgotten judge is trying to erase the final testimony of the party.']];
// Regional story quests: optional three-stage investigations, independent of quick errands.
// Data-driven episodes allow new stories without changing existing save slots.
const STORY_QUESTS=[
 {title:'The Names Beneath the Well',person:'Elder Mael',opening:'Three children remember a lullaby, but not their mother. The village well repeats one name at dusk.',places:['The well echoes whenever a villager speaks the truth.','Pell found a blank line in the birth register.','The Archive stamped every lost name with the same crescent seal.'],wrong:'The well cannot preserve a lie. Search the register for what has been removed.',word:'MOTHER',clue:'A child’s name for the person who gave them life (6)',end:'The missing woman was not forgotten by choice. She sacrificed her own name to hide the children from the Archivore.',choice:['Read her name aloud to the village','Seal her name safely in the Book'],outcomes:['The village remembers her sacrifice; the children finally know whom to thank.','The Book preserves her identity until the threat to her children has passed.']},
 {title:'The Bell That Rang Twice',person:'Bellkeeper Iona',opening:'At midnight a second bell rings from a tower that no longer exists.',places:['A reflection shows the bell tower before it vanished.','The bellkeeper’s ledger records two tolls for one funeral.','A silver shard hums when held toward the old square.'],wrong:'A bell repeats sound after it is struck. Think of a returning sound.',word:'ECHO',clue:'A sound that returns from a distant surface (4)',end:'The phantom bell is a warning left by the last bellkeeper, who foresaw the king’s theft of names.',choice:['Ring a warning for the whole town','Quietly tell the surviving families'],outcomes:['The warning spreads, and the town begins guarding its records.','The families protect the story without alerting the Mirror Usurper.']},
 {title:'Ashes of the Apprentice',person:'Apprentice Renn',opening:'Renn believes the forge consumed his teacher. A single steel letter remains in the ashes.',places:['Cooling tongs have been bent toward the furnace’s locked side chamber.','A chalk formula mentions a fire that remembers promises.','The apprentice’s journal contains an unfinished farewell.'],wrong:'Fire makes metal pliable; what makes it hard again?',word:'TEMPER',clue:'Harden metal using controlled heating and cooling (6)',end:'The master walked into the furnace to keep its living flame from spreading. His final lesson was restraint.',choice:['Reignite the master’s ceremonial forge','Let the old flame rest and build a new hearth'],outcomes:['Renn honors the master through careful craft and a renewed forge.','Renn accepts the loss and teaches a safer generation of smiths.']},
 {title:'The Last Royal Witness',person:'Court Herald',opening:'A royal witness has been declared nonexistent. The empty courtroom still records footsteps.',places:['The witness stand bears three deliberate scratches.','A drowned decree has the royal seal but no signature.','The court mural shows a hand raised in sworn testimony.'],wrong:'What does a witness promise before giving testimony?',word:'OATH',clue:'A solemn promise made before giving testimony (4)',end:'The vanished witness exposed the Paper Regent’s false succession. Their testimony can restore the true history.',choice:['Publish the testimony in the market','Preserve it for a lawful public hearing'],outcomes:['Citizens begin demanding answers from the remaining court.','The testimony becomes the foundation for a fair succession hearing.']},
 {title:'Letters in the Sand',person:'Desert Guide',opening:'A caravan’s letters arrive before the travelers who wrote them, each dated tomorrow.',places:['A trail of glass beads points away from the false oasis.','The observatory chart is shifted by one lost sunrise.','A sealed note warns that the messenger knows the future.'],wrong:'A traveler uses this instrument to keep true direction.',word:'COMPASS',clue:'Instrument used to navigate by direction (7)',end:'The messages came from an earlier caravan caught in a loop of missing days. You break the loop by fixing its story.',choice:['Return the letters to their families','Archive them as a warning for travelers'],outcomes:['Families recover final words they thought were lost forever.','Future caravans learn to recognize the false oasis.']},
 {title:'The Navigator’s Promise',person:'Navigator Lyra',opening:'An airship returns without a crew. Its flight chart contains a route that is not on any map.',places:['The ship’s ropes are tied in the old rescue pattern.','Wind vanes point toward the underside of the islands.','A captain’s message ends in the middle of a sentence.'],wrong:'Maps show the route; what does a navigator plot through the clouds?',word:'COURSE',clue:'The intended direction of travel for a ship (6)',end:'The crew guided refugees to safety through a forbidden air passage. Their names were traded for calm winds.',choice:['Mark the hidden route for everyone','Entrust the route to trained rescuers'],outcomes:['The sky lanes open to new travelers, with warning beacons installed.','Lyra organizes an air-rescue corps to guard the passage.']},
 {title:'The Frostbound Letter',person:'Last Sentinel',opening:'A soldier’s letter has survived a century of storms, but its addressee has vanished.',places:['An abandoned watchpost has fresh candle soot.','The frozen mailbox contains a second, unsent letter.','A memorial lists the living among the dead.'],wrong:'A letter written to someone is a form of what?',word:'MESSAGE',clue:'Information sent from one person to another (7)',end:'The sentinel remained to protect a valley after everyone forgot that anyone lived there. His oath is finally witnessed.',choice:['Carry the letter south to its family','Leave a permanent record at the watchpost'],outcomes:['The family gains proof that their ancestor kept his promise.','Travelers read the true history at the restored watchpost.']},
 {title:'The Page That Would Not Burn',person:'First Scribe',opening:'The last blank page resists every attempt to erase it. It contains a single question: What should be remembered?',places:['The first shelf holds contradictory accounts of the same victory.','A child’s drawing survives among a thousand ruined histories.','The Eraser’s oldest marginal note is written in regret.'],wrong:'A story handed down from one generation to another becomes a what?',word:'LEGACY',clue:'Something handed down from the past to future generations (6)',end:'The first scribes learned that remembrance is not the same as innocence. Their Book must hold joy and wrongdoing alike.',choice:['Record the truth, including its pain','Protect the vulnerable before revealing the truth'],outcomes:['The Book keeps the world’s complete, imperfect story.','The Book preserves the truth while protecting those still at risk.']}
];
function sagaProgress(){const st=stage();return st.saga||(st.saga={step:0,leads:[],fails:0,choice:null})}

// Eight independently explorable story-quest locations. Position and interactions persist per chapter.
const STORY_LOCATIONS=[
 {name:'The Moonwell',theme:'🌿',map:['#########','#1..#..2#','#...#...#','#...D...#','#.......#','#.N...3.#','#...#...#','#..E....#','#########']},
 {name:'The Absent Belfry',theme:'🪞',map:['#########','#2.....1#','#.###.#.#','#...D...#','#.#...#.#','#...N...#','#.#...3.#','#E......#','#########']},
 {name:'The Abandoned Hearth',theme:'🔥',map:['#########','#1..#...#','#...#2..#','#...D...#','#.......#','#.###.#.#','#.N...3.#','#..E....#','#########']},
 {name:'The Drowned Court',theme:'💧',map:['#########','#.1.....#','#...#...#','#2..D...#','#...#...#','#...N...#','#.3.....#','#E......#','#########']},
 {name:'The Starless Oasis',theme:'⭐',map:['#########','#..1....#','#.###...#','#...D..2#','#.......#','#..N.#..#','#.3.....#','#E......#','#########']},
 {name:'The Empty Airship',theme:'🌬️',map:['#########','#1......#','#...###.#','#2..D...#','#...#...#','#.N.....#','#...3...#','#..E....#','#########']},
 {name:'The Sentinel Post',theme:'❄️',map:['#########','#.1.....#','#..###..#','#...D...#','#2......#','#..#N...#','#....3..#','#E......#','#########']},
 {name:'The Unburned Annex',theme:'📚',map:['#########','#1....2.#','#.###...#','#...D...#','#.......#','#...N.#.#','#.3.....#','#..E....#','#########']}
];
let questPlacePos=null;
function storyPlaceState(){const sp=sagaProgress();if(!sp.location)sp.location={x:3,y:7,door:false,conversations:0};return sp.location}
function enterStoryPlace(){
 if(!state)return;
 const q=STORY_QUESTS[state.chapter],sp=sagaProgress();
 if(sp.step>0){sagaBoard();return}
 const pos=storyPlaceState();questPlacePos=pos;
 view('storyPlace');document.getElementById('storyPlaceTitle').textContent=STORY_LOCATIONS[state.chapter].name;
 document.getElementById('storyPlaceSub').textContent=q.title+' · '+sp.leads.length+'/3 clues recovered';
 renderStoryPlace();
}
function storyPlaceTile(x,y){return STORY_LOCATIONS[state.chapter].map[y]?.[x]||'#'}
function renderStoryPlace(){
 if(!state||screen!=='storyPlace')return;
 const q=STORY_QUESTS[state.chapter],sp=sagaProgress(),pos=storyPlaceState(),location=STORY_LOCATIONS[state.chapter];
 document.getElementById('storyPlaceSub').textContent=q.title+' · '+sp.leads.length+'/3 clues recovered';
 let out='';
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){
  const ch=storyPlaceTile(x,y),hero=pos.x===x&&pos.y===y;
  const icons={'#':'','.' :'','D':pos.door?'◈':'🚪','N':'🧙','1':'📜','2':'🔍','3':'✨','E':'🚪'};
  const done=['1','2','3'].includes(ch)&&sp.leads.includes(Number(ch)-1);
  const villager=ch==='.'&&((x*3+y*7+state.chapter)%17===((pos.conversations||0)+Math.floor((pos.walkSteps||0)/2))%17);const symbol=hero?'🧑‍🎤':done?'✓':villager?'🧑‍🌾':icons[ch]||'';
  const klass=ch==='#'?'wall':ch==='D'&&!pos.door?'wall':'floor';
  out+=`<div class="story-cell ${klass} ${hero?'hero':''}" aria-label="${hero?'Party':ch==='N'?q.person:ch==='E'?'Exit':done?'Evidence found':'Exploration tile'}">${symbol}</div>`;
 }
 document.getElementById('storyPlaceGrid').innerHTML=out;
}
function storyPlaceMove(dx,dy){
 if(screen!=='storyPlace')return;
 const pos=storyPlaceState(),nx=pos.x+dx,ny=pos.y+dy,ch=storyPlaceTile(nx,ny);
 if(ch==='#'||(ch==='D'&&!pos.door)){storyPlaceMessage(ch==='D'?'The sealed passage requires the caretaker’s help.':'A wall blocks the route.');return}
 pos.x=nx;pos.y=ny;pos.walkSteps=(pos.walkSteps||0)+1;write();renderStoryPlace();
 if(ch==='E'){leaveStoryPlace();return}
 if('123N'.includes(ch))storyPlaceAction();
}
function storyPlaceMessage(message){document.getElementById('storyPlaceMessage').textContent=heroText(message)}
function storyPlaceAction(){
 if(screen!=='storyPlace')return;
 const q=STORY_QUESTS[state.chapter],sp=sagaProgress(),pos=storyPlaceState(),ch=storyPlaceTile(pos.x,pos.y);
 if(ch==='N'){
  pos.conversations=(pos.conversations||0)+1;
  if(!pos.door){pos.door=true;storyPlaceMessage(q.person+': '+q.opening+' The sealed corridor is open. Search for all three traces.');}
  else if(sp.leads.length===3)storyPlaceMessage(q.person+': You have the evidence. Return to the quest journal and restore the missing word.');
  else storyPlaceMessage(q.person+': '+(3-sp.leads.length)+' trace(s) still missing. Your investigation matters.');
  write();renderStoryPlace();return;
 }
 if('123'.includes(ch)){
  const i=Number(ch)-1;
  if(!sp.leads.includes(i)){sp.leads.push(i);state.lore=state.lore||[];state.lore.push(q.title+': '+q.places[i]);state.gold+=8;write();renderStoryPlace();}
  storyPlaceMessage(q.places[i]+(sp.leads.length===3?' All evidence recovered! Return to the quest journal.':''));return;
 }
 if(ch==='E'){leaveStoryPlace();return}
 if(ch==='.'&&((pos.x*3+pos.y*7+state.chapter)%17===((pos.conversations||0)+Math.floor((pos.walkSteps||0)/2))%17)){
  pos.conversations=(pos.conversations||0)+1;
  storyPlaceMessage('LOCAL RESIDENT: '+(sp.step===3?'The memories you restored have changed this place forever.':sp.leads.length===3?'You found every trace. The journal will help you reconstruct the truth.':'Some people vanished, but their stories are still written in the walls.'));
  write();renderStoryPlace();return;
 }
 storyPlaceMessage('Explore the room. Talk with '+q.person+' and investigate marked objects.');
}
function leaveStoryPlace(){write();sagaBoard()}

function sagaBoard(){
 view('hub');const q=STORY_QUESTS[state.chapter],sp=sagaProgress();const details=$('#hubDetails'),actions=$('#hubActions');actions.innerHTML='';
 const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;actions.appendChild(b)};
 const back=()=>add('RETURN TO PARTY MENU',openHub);
 if(sp.step>=3){details.innerHTML='<h3>'+q.title+'</h3><p><b>COMPLETED · '+q.person+'</b></p><p>'+q.end+'</p><p>'+q.outcomes[sp.choice||0]+'</p><p>Evidence recovered: '+sp.leads.length+'/3</p>';back();return}
 if(sp.step===0){details.innerHTML='<h3>STORY QUEST · '+q.title+'</h3><p><b>'+q.person+':</b> '+q.opening+'</p><p>Investigate all three traces. Clues are recorded in your Chronicle.</p><p>Evidence: '+sp.leads.length+'/3</p>';
 add('EXPLORE THE QUEST LOCATION',()=>enterStoryPlace());
 if(sp.leads.length===3)add('RECONSTRUCT THE MISSING WORD',()=>{sp.step=1;write();sagaBoard()});back();return}
 if(sp.step===1){details.innerHTML='<h3>'+q.title+' · RECONSTRUCTION</h3><p>'+q.clue+'</p><p>Use the evidence gathered to restore the missing word.</p><p id="sagaHint">'+(sp.fails?'Hint: '+hint(q.word,sp.fails):'')+'</p>';const input=document.createElement('input');input.id='sagaAnswer';input.placeholder='Enter missing word';input.setAttribute('aria-label','Missing story word');input.autocomplete='off';details.appendChild(input);
 const submit=()=>{if(input.value.trim().toUpperCase()===q.word){sp.step=2;state.lore=state.lore||[];state.lore.push(q.title+': The word '+q.word+' was restored.');gainXP(45+state.chapter*12);write();sagaBoard()}else{sp.fails++;$('#sagaHint').textContent='Hint: '+hint(q.word,sp.fails)+' '+q.wrong;write();input.select()}};input.onkeydown=e=>{if(e.key==='Enter')submit()};add('RESTORE WORD',submit);back();return}
 details.innerHTML='<h3>'+q.title+' · FINALE</h3><p>'+q.end+'</p><p><b>How should the party respond?</b></p>';q.choice.forEach((line,i)=>add(line,()=>{sp.choice=i;sp.step=3;state.gold+=70+state.chapter*25;state.ethers+=2;gainXP(100+state.chapter*22);state.lore=state.lore||[];state.lore.push(q.title+': '+q.outcomes[i]);award('Restorer of Stories');write();sagaBoard()}));back();
}
function huntBoard(){view('hub');const h=ELITE_HUNTS[state.chapter],done=!!stage().eliteHunt;$('#hubDetails').innerHTML='<h3>REGIONAL ELITE HUNT</h3><p><b>'+h[0]+'</b></p><p>'+h[1]+'</p><p>One optional named encounter per region. Victory awards bonus XP, gold, and a permanent Chronicle record.</p><p>'+ (done?'HUNT COMPLETED':'HUNT AVAILABLE · Heal and prepare first.')+'</p>';const a=$('#hubActions');a.innerHTML='';if(!done){const b=document.createElement('button');b.textContent='CHALLENGE '+h[0].toUpperCase();b.onclick=()=>{fight(h[0],false);battle.eliteHunt=true;battle.hp+=35+state.chapter*15;battle.max=battle.hp;combatRender();battleMsg(h[1])};a.appendChild(b)}const back=document.createElement('button');back.textContent='RETURN TO PARTY MENU';back.onclick=openHub;a.appendChild(back)}
function pacingInfo(){const secs=Math.max(0,Number(state.activeSeconds)||0);const cleared=Object.values(state.stages||{}).filter(x=>x.boss).length;const ruins=Object.values(state.stages||{}).filter(x=>x.ruins?.completed).length;return `PLAYTIME ${Math.floor(secs/3600)}h ${Math.floor(secs%3600/60)}m · CHAPTERS ${cleared}/8 · RUINS ${ruins}/8 · VICTORIES ${state.defeated||0}`}
function gainXP(n){
 n=Math.max(0,Math.round(n*xpCurveMultiplier()));state.xp+=n;let ups=0;
 while(state.lv<30&&state.xp>=need()){
  state.lv++;ups++;
  for(const p of ['Scott','Mira','Bram']){
   state.maxhp[p]+=p==='Bram'?10:8;
   state.maxmp[p]+=p==='Mira'?3:2;
   state.hp[p]=state.maxhp[p];state.mp[p]=state.maxmp[p];
  }
 }
 if(ups){
  milestone('Party reached level '+state.lv);
  state.pendingLevelNotice=`LEVEL UP! Party reached level ${state.lv}. HP/MP restored.`;
  if(state.lv>=5&&!state.classUp){state.classUp=true;award('Rune Knight Initiate')} const classMilestone=CLASS_MILESTONES.find(x=>x.level===state.lv);if(classMilestone)state.pendingLevelNotice+=` New class titles: ${classTitle('Scott')}, ${classTitle('Mira')}, ${classTitle('Bram')}.`; if(state.lv>=5&&state.lv-ups<5)state.pendingLevelNotice+=' New party techniques unlocked!'
 }
 update();return ups;
}
function takeLevelNotice(){const v=state.pendingLevelNotice||'';state.pendingLevelNotice='';return v}

function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function question(){const blocked=new Set(state.history.slice(-55));let pool=CLUES.filter(x=>!blocked.has(x.a));if(!pool.length){state.history=[];pool=CLUES}let q=pool[Math.floor(Math.random()*pool.length)];state.history.push(q.a);if(state.history.length>80)state.history.splice(0,state.history.length-80);let wrong=shuffle(CLUES.filter(x=>x.a!==q.a&&Math.abs(x.a.length-q.a.length)<3).map(x=>x.a)).slice(0,3);while(wrong.length<3){const x=CLUES[Math.floor(Math.random()*CLUES.length)].a;if(x!==q.a&&!wrong.includes(x))wrong.push(x)}return{answer:q.a,text:q.c[Math.floor(Math.random()*2)],options:shuffle([q.a,...wrong])}}
function hint(w,n){if(n===1)return`Starts with ${w[0]}.`;if(n===2)return`${w.length} letters: ${w[0]}${'_'.repeat(Math.max(0,w.length-2))}${w.at(-1)}`;return w.slice(0,Math.ceil(w.length*.65))+'…'}
const BOSS_SCENES=[
 {title:'THE ARCHIVORE',line:'The books open to empty pages. From the bindings, a hunger takes shape.',mid:'The Archivore tears its own name from the catalog. Ink rains down like ash.',victory:'The first lost names return to Willowmere, one whispered memory at a time.'},
 {title:'THE NAMELESS KING',line:'An empty throne casts a shadow with a face that looks like yours.',mid:'Every reflection speaks a different answer. Only one belongs to the true king.',victory:'The hollow throne remembers those who once guarded it.'},
 {title:'THE CINDER SCRIBE',line:'At the center of the forge, a living quill writes letters in molten metal.',mid:'The quill splits into burning fragments. The furnace begins counting backward.',victory:'Words return to the anvils; the city can forge its future again.'},
 {title:'THE DROWNED REGENT',line:'A silver crown floats in the still water, then a figure rises beneath it.',mid:'Water climbs the columns as the old ruler calls the drowned court to witness.',victory:'The river releases the history trapped beneath the keep.'},
 {title:'THE STAR EATER',line:'The ceiling darkens and one constellation after another goes silent.',mid:'A black star opens at the monster’s heart, swallowing the last points of light.',victory:'The stars regain their names. The sky is a map once more.'},
 {title:'THE GALE OF SILENCE',line:'The wind stops. In the silence, a voice whispers from every direction.',mid:'The creature becomes a storm of syllables that cannot be spoken.',victory:'A single clear note passes through the isles and the winds begin again.'},
 {title:'THE HOLLOW WARDEN',line:'A sentinel built from forgotten promises blocks the road north.',mid:'Its armor cracks and the faces of forgotten travelers shine through.',victory:'The lost travelers can finally be remembered.'},
 {title:'THE ERASER',line:'At the First Library, an unwritten page rises above the world.',mid:'The Eraser reveals its final form: a space where no name can survive.',victory:'The First Lexicon opens. Each rescued word takes its rightful place.'}
];
let cinematicContinue=null;
function cinematic(title,description,after,kind='boss'){
 const overlay=document.getElementById('lqCinematic');
 if(!overlay){after();return}
 cinematicContinue=after;
 if(window.LexiconPresentation)window.LexiconPresentation.cinema({chapter:state.chapter,title:heroText(title),description:heroText(description),kind});
 else{document.getElementById('lqCinemaTitle').textContent=heroText(title);document.getElementById('lqCinemaDescription').textContent=heroText(description);overlay.hidden=false;document.getElementById('lqCinemaNext').focus()}
}
document.getElementById('lqCinemaNext')?.addEventListener('click',()=>{
 if(document.getElementById('lqCinematic').hidden)return;
 window.LexiconPresentation?.finishCinema();document.getElementById('lqCinematic').hidden=true;
 const fn=cinematicContinue;cinematicContinue=null;if(fn)fn();
});
function bossRitual(){
 if(!battle?.boss)return;
 const phase=state.chapter%4;
 if(phase===0){battle.ward+=1;battleMsg('The Ink Ward is restored: break it with precise strikes.');}
 else if(phase===1){battle.mirrorTurns=2;battleMsg('MIRROR CURSE: typed answers deal extra damage for two rounds.');}
 else if(phase===2){for(const p of state.party)state.mp[p]=Math.max(0,state.mp[p]-2);battleMsg('ARCANE DRAIN: the party loses 2 MP.');}
 else {battle.guard=true;battleMsg('THE WARDEN BRACES: prepare for a counterattack.');}
}
const ENCOUNTER_ROSTER=[
 ['Ink Slime','Catalog Wraith','Binding Golem'],['Glass Beetle','Doppel Wraith','Mirror Knight'],
 ['Cinder Wolf','Ember Beetle','Ash Golem'],['Drowned Wraith','Tide Slime','Reef Sentinel'],
 ['Dune Beetle','Dust Wolf','Sand Specter'],['Gale Wraith','Cloud Slime','Thunder Roc'],
 ['Frost Wolf','Whiteout Shade','Ice Sentinel'],['Void Wraith','Erasure Golem','Null Specter']
];
function encounterVariety(name,boss){if(boss)return name; if(/guardian|patrol/i.test(name)||ELITE_HUNTS.some(h=>h[0]===name)||RESCUE_ENCOUNTERS.some(h=>h[0]===name))return name;const roster=ENCOUNTER_ROSTER[state.chapter]||ENCOUNTER_ROSTER[0];const counts=state.encounterWins||{};const last=state.lastEnemy||'';const choices=roster.filter(x=>x!==last);choices.sort((a,b)=>(counts[a]||0)-(counts[b]||0));const next=choices[0]||roster[0];state.lastEnemy=next;return next}
function regionalAlliance(){
 if(!state||state.chapter===0)return null;
 const t=stage().regionalTown;
 const aftermath=t?.crisis?.ending;return t?.ending==='public'?{name:aftermath?'Public testimony + aftermath':'Public testimony',hp:aftermath==='reveal'?.70:.86,ward:0,heal:aftermath==='shelter'?1:0}:
 t?.ending==='sheltered'?{name:aftermath?'Sheltered records + aftermath':'Sheltered records',hp:aftermath==='reveal'?.78:.94,ward:aftermath==='shelter'?2:1,heal:1}:null;
}
function bossAllianceText(){const a=regionalAlliance();return a?'TOWN ALLY · '+a.name+' · '+(a.name==='Public testimony'?'boss vitality reduced':'party granted sanctuary ward'):'No regional alliance yet — restore the regional town to earn aid.'}
function fight(name,boss){if(boss&&stage().boss&&!state.completed){say('This guardian has been defeated. Continue to the next chapter from the boss marker.');return}name=encounterVariety(name,boss);document.querySelector('.battle-arena')?.classList.remove('lq-frenzy');state.flow=0;state.bestiary=state.bestiary||{};state.bestiary[name]=(state.bestiary[name]||0)+1;const isElite=ELITE_HUNTS.some(h=>h[0]===name),baseEnemyHP=boss?130+state.chapter*70:45+state.chapter*12,hpScale=state.difficulty==='story'?.85:state.difficulty==='veteran'?1.15:1,scaledEnemyHP=Math.max(1,Math.round(baseEnemyHP*hpScale));battle={log:[],name,boss,hp:scaledEnemyHP,max:scaledEnemyHP,actor:0,round:1,question:null,typed:false,power:0,miss:0,guard:false,locked:false,ward:boss&&state.chapter%3===0?2:0,phase:0,chain:0,adds:(boss||isElite)?2:0,stun:0,taunt:null,counter:false,ritual:null,ritualInterrupted:false,specialSeen:{},lastAnswerMode:null,healPenalty:1,blind:0};if(boss){const ally=regionalAlliance();if(ally){battle.hp=battle.max=Math.round(battle.max*ally.hp);battle.alliance=ally.name; battle.allianceRegion=CHAPTERS[state.chapter].name;if(ally.heal){battle.sanctuaryWard=true}}}view('combat');$('#enemy').textContent=name;$('#sprite').textContent=boss?CHAPTERS[state.chapter].emoji:'👾';combatRender();combatEnemyArt();const rule=isElite?eliteRule():null;battleMsg(boss?CHAPTER_BEATS[state.chapter].warning+' '+bossAllianceText():(rule?'ELITE RULE · '+rule.label+': '+rule.hint:'Choose a command to begin. Correct words charge FLOW.'))}
function actor(){
 const n=state.party.length;
 for(let i=0;i<n;i++){
  const name=state.party[(battle.actor+i)%n];
  if((state.hp[name]||0)>0)return name;
 }
 return state.party[0];
}
function battleDefeat(){window.LexiconAudio?.playSting('defeat');
 const escapedRuin=!!ruinBattleOrigin;
 if(battle)state.recentCombat=(battle.log||[]).slice(-12);battle=null;ruinBattleOrigin=null;state.flow=0;state.streak=0;
 const loss=Math.min(state.gold,25+state.chapter*15);
 state.gold-=loss;
 for(const p of state.party){
  state.hp[p]=Math.max(12,Math.ceil(state.maxhp[p]*.45));
  state.mp[p]=Math.ceil(state.maxmp[p]*.35);
 }
 if(escapedRuin&&ruin){ruin.room=0;ruin.x=1;ruin.y=7;view('ruins');drawRuin();ruinSay(`The party was overwhelmed. A guiding memory carried you to the dungeon entrance. Lost ${loss}G; partial HP/MP restored.`)}
 else{view('world');draw();say(`The party was overwhelmed. You regroup at the last safe path. Lost ${loss}G; partial HP/MP restored.`)}
 write();
}

function commandHelp(key,a){
 const specialCost=Math.max(1,skillCost(a)-(a==='Mira'&&pathBonus(a,'channeler')?2:0)-(state.lv>=20&&a==='Mira'?1:0));
 const help={
 attack:['0 MP',a==='Mira'?'Answer a multiple-choice clue to cast a stronger magic word attack. Correct answers build FLOW and CHAIN.':'Answer a multiple-choice clue to deal damage and build FLOW and CHAIN.'],
 power:['0 MP','Type the answer for a stronger attack. Correct typed answers interrupt charging rituals.'+(a==='Scott'&&state.lv<2?' Unlocks at level 2.':'')],
 riposte:['2 MP','Brace to reduce the next enemy hit. Counter for '+(10+state.lv*2)+' damage if the hero is struck.'],
 reveal:[(equipmentStyle()==='sage'?1:2)+' MP','Reveal more letters of the current clue without ending the turn. Starts a clue if needed.'],
 heal:[(equipmentStyle()==='sage'?3:4)+' MP','Restore up to '+Math.round((35+state.lv*2+(state.lv>=20?8:0))*(battle.healPenalty||1))+' HP to the ally with the lowest HP percentage. Target is chosen automatically. Ends the turn.'],
 silence:['4 MP','Cancel a charging ritual and suppress the next enemy action. Ends the turn.'],
 prism:['6 MP','Deal '+(14+state.lv*3+(state.lv>=20?8:0))+' direct damage and remove all enemy echoes. No clue required. Ends the turn.'],
 shield:['2 MP','Reduce the next enemy hit by half. Ends the turn.'],
 taunt:['2 MP','Force enemy attacks onto Bram while the taunt lasts, with reduced damage. Brace against the next hit. Ends the turn.'],
 guard:['0 MP','Reduce the next enemy hit by half. Ends the turn.'],
 item:['1 Potion · '+state.potions+' left','Restore up to 30 HP to the acting hero. Ends the turn.'],
 revive:['1 Feather · '+(state.phoenixFeathers||0)+' left','Revive the first fallen ally at 40% maximum HP. Ends the turn.'],
 run:['0 MP','Escape this regular encounter immediately. Resets FLOW. Unavailable in boss battles.'],
 special:[specialCost+' MP',a==='Scott'?'Type a clue answer for a powerful word attack. Can interrupt a charging ritual.':a==='Mira'?'Deal '+(18+state.lv*4+(pathBonus('Mira','channeler')?state.lv*2:0))+' direct damage and restore 1 MP to each living ally.'+(pathBonus('Mira','oracle')?' Also heal living allies.':'')+' Ends the turn.':'Heal every living ally and brace to reduce the next enemy hit. Class training improves these effects. Ends the turn.']
 };return help[key]||['',''];
}
function combatRender(){
 if(!battle)return;
 const affinity=REGION_AFFINITIES[state.chapter]||REGION_AFFINITIES[0],intent=enemyIntent(),stance=enemyStance(),rule=eliteRule();
 $('#tempo').textContent='FLOW '+(state.flow||0)+'/5 · CHAIN '+(battle.chain||0)+(battle.adds?' · ADDS '+battle.adds:'');
 $('#foeIntent').textContent=(battle.boss?'BOSS · ':'')+'NEXT: '+(battle.ritual?'RITUAL · '+battle.ritual.name:intent.name)+(intent.step===2?' · HEAVY STRIKE':intent.drain?' · MP DRAIN':'')+' · '+stance+(battle.sanctuaryWard?' · ALLY WARD READY':'')+(battle.phase?' · SECOND PHASE':'')+' · RESIST '+affinity.resist+' · WEAK '+affinity.weak+(rule?' · '+rule.label:'')+' · '+({armored:'ARMORED',drainer:'SOUL DRAIN',feral:'FERAL',skitter:'ERRATIC',normal:'ARCANE'}[enemyTrait()]);
 $('#enemyHP').textContent=`HP ${Math.max(0,battle.hp)}/${battle.max}${battle.adds?' · '+battle.adds+' echo'+(battle.adds===1?'':'es'):''}`;
 $('#party').innerHTML=heroHTML(state.party.map(p=>`<div class="member ${actor()===p?'active':''}"><span class="party-pixel" data-party="${p}" aria-hidden="true"></span><b>${p}</b><small> · ${classTitle(p)}</small><div>HP ${state.hp[p]}/${state.maxhp[p]}</div><div>MP ${state.mp[p]}/${state.maxmp[p]}</div></div>`).join(''));
 $('#commands').innerHTML='';const a=actor(),opts=a==='Scott'?[['attack','ATTACK'],['power','POWER WORD'],['riposte','RIPOSTE · 2MP'],['item','POTION'],['revive','PHOENIX FEATHER'],['guard','DEFEND']]:a==='Mira'?[['attack','LEXI BOLT'],['reveal','REVEAL'],['heal','MEND'],['silence','SILENCE GLYPH · 4MP'],['prism','PRISM BURST · 6MP'],['guard','DEFEND']]:[['attack','RUNE STRIKE'],['power','BREAK WORD'],['shield','GUARD WORD'],['taunt','TAUNT · 2MP'],['guard','DEFEND']];
 if(state.lv>=skillLevel(a))opts.push(['special',skillName(a)+' · '+Math.max(1,skillCost(a)-(state.lv>=20&&a==='Mira'?1:0))+'MP']);if(!battle.boss)opts.push(['run','RUN']);
 for(const [key,label] of opts){const b=document.createElement('button'),help=commandHelp(key,a),name=document.createElement('strong'),cost=document.createElement('span'),desc=document.createElement('small');b.className='battle-command';name.textContent=label.replace(/ · \d+MP$/,'');cost.className='command-cost';cost.textContent=help[0];desc.textContent=help[1];b.appendChild(name);b.appendChild(cost);b.appendChild(desc);b.onclick=()=>command(key);$('#commands').appendChild(b)}
 update();combatEnemyArt();
}
function battleMsg(m){$('#battleMsg').textContent=heroText(m);if(battle){battle.log=battle.log||[];battle.log.push('R'+battle.round+': '+m);if(battle.log.length>16)battle.log.shift();}}
function beginClue(typed,power){battle.question=question();battle.typed=typed;battle.power=power;battle.miss=0;$('#question').textContent=battle.blind?'The sandstorm obscures part of the clue: '+battle.question.text.slice(0,Math.max(12,Math.floor(battle.question.text.length*.58)))+'…':battle.question.text;if(battle.blind)battle.blind=0;$('#answers').innerHTML='';H('#typeForm');$('#hint').textContent='';if(typed){V('#typeForm');$('#typeAnswer').value='';$('#typeAnswer').focus()}else for(const answer of battle.question.options){const b=document.createElement('button');b.className='answer';b.textContent=answer;b.onclick=()=>strike(answer);$('#answers').appendChild(b)}}
function command(c){if(!battle||battle.locked)return;const a=actor();
 if(c==='riposte'){if(state.mp.Scott<2){battleMsg('Not enough MP.');return}state.mp.Scott-=2;battle.counter=true;battle.guard=true;battleMsg('Scott prepares a riposte. If struck, he will counterattack.');advance();return}
 if(c==='silence'){if(state.mp.Mira<4){battleMsg('Not enough MP.');return}state.mp.Mira-=4;battle.stun=Math.max(battle.stun,1);battle.ritual=null;battle.ritualInterrupted=true;battleMsg('Mira inscribes Silence Glyph. The next enemy action is suppressed and any ritual collapses.');advance();return}
 if(c==='prism'){if(state.mp.Mira<6){battleMsg('Not enough MP.');return}state.mp.Mira-=6;const addHits=battle.adds||0;const damage=14+state.lv*3+(state.lv>=20?8:0);battle.hp=Math.max(0,battle.hp-damage);battle.adds=0;battle.specialSeen.Mira=true;battleMsg('Prism Burst strikes every target for '+damage+' and disperses '+addHits+' echo'+(addHits===1?'':'es')+'.');if(battle.hp===0){victory();return}advance();return}
 if(c==='taunt'){if(state.mp.Bram<2){battleMsg('Not enough MP.');return}state.mp.Bram-=2;battle.taunt='Bram';battle.guard=true;battle.specialSeen.Bram=true;battleMsg('Bram challenges the enemy. The next attack is forced onto him with reduced damage.');advance();return}
 if(c==='special'){
 if(state.lv<skillLevel(a)){battleMsg('Unlocks at level 5.');return}
 const cost=Math.max(1,skillCost(a)-(a==='Mira'&&pathBonus(a,'channeler')?2:0)-(state.lv>=20&&a==='Mira'?1:0));if(state.mp[a]<cost){battleMsg('Not enough MP for '+skillName(a)+'.');return}
 state.mp[a]-=cost;state.specialUses=state.specialUses||{};state.specialUses[a]=(state.specialUses[a]||0)+1;battle.specialSeen[a]=true;
 if(a==='Bram'){battle.guard=true;battle.barrier=pathBonus('Bram','bulwark')?(state.lv>=16?0.32:0.42):.5;for(const p of state.party)if(state.hp[p]>0)state.hp[p]=Math.min(state.maxhp[p],state.hp[p]+Math.ceil(state.maxhp[p]*(pathBonus('Bram','keeper')?(state.lv>=16?.22:.15):.08)));battleMsg('Bram fortifies the entire party.');advance();return}
 if(a==='Mira'){battle.hp=Math.max(0,battle.hp-(18+state.lv*4+(pathBonus('Mira','channeler')?state.lv*2:0)));if(pathBonus('Mira','oracle'))for(const p of state.party)if(state.hp[p]>0)state.hp[p]=Math.min(state.maxhp[p],state.hp[p]+(state.lv>=16?22:12));for(const p of state.party)if(state.hp[p]>0)state.mp[p]=Math.min(state.maxmp[p],state.mp[p]+1);battleMsg('Mira casts Echo Storm.');if(battle.hp===0){victory();return}advance();return}
 beginClue(true,28+state.lv*2);return
 }if(c==='revive'){const fallen=state.party.find(p=>state.hp[p]===0);if(!fallen){battleMsg('No ally needs revival.');return}if(!(state.phoenixFeathers>0)){battleMsg('You need a Phoenix Feather from the shop.');return}state.phoenixFeathers--;state.hp[fallen]=Math.max(1,Math.ceil(state.maxhp[fallen]*.4));battleMsg(fallen+' returns to battle.');advance();return}if(c==='run'){state.flow=0;battle=null;if(ruinBattleOrigin){returnToRuin('You evade the guardian.')}else{view('world');draw();say('You escaped.')}return}if(c==='guard'){battle.guard=true;if(a==='Scott'&&pathBonus('Scott','captain'))state.flow=Math.min(5,(state.flow||0)+(state.lv>=16?2:1));advance();return}if(c==='shield'){if(state.mp.Bram<2){battleMsg('Not enough MP.');return}state.mp.Bram-=2;battle.guard=true;advance();return}if(c==='item'){if(state.potions===0){battleMsg('No Potions remain.');return}state.potions--;state.hp[a]=Math.min(state.maxhp[a],state.hp[a]+30);advance();return}if(c==='heal'){const cost=equipmentStyle()==='sage'?3:4;if(state.mp.Mira<cost){battleMsg('Not enough MP.');return}state.mp.Mira-=cost;const target=state.party.slice().sort((a,b)=>state.hp[a]/state.maxhp[a]-state.hp[b]/state.maxhp[b])[0];state.hp[target]=Math.min(state.maxhp[target],state.hp[target]+Math.round((35+state.lv*2+(state.lv>=20?8:0))*(battle.healPenalty||1)));advance();return}if(c==='reveal'){const cost=equipmentStyle()==='sage'?1:2;if(state.mp.Mira<cost){battleMsg('Not enough MP.');return}state.mp.Mira-=cost;if(!battle.question)beginClue(false,0);battle.miss++;$('#hint').textContent='Mira reveals: '+hint(battle.question.answer,battle.miss+(equipmentStyle()==='sage'?2:1));combatRender();return}if(c==='power'&&a==='Scott'&&state.lv<2){battleMsg('Power Word unlocks at level 2.');return}beginClue(c==='power',c==='power'?12:c==='attack'&&a==='Mira'?5:0)}
function eliteDamageModifier(typed){const r=eliteRule();if(!r)return 1;const type=r.type;if(type==='typed')return typed?1:.25;if(type==='alternate'){const ok=battle.lastAnswerMode===null||battle.lastAnswerMode!==typed;battle.lastAnswerMode=typed;return ok?1:.40}if(type==='flow')return (state.flow||0)>=3?1:.40;if(type==='chain')return (battle.chain||0)>=3?1:.45;if(type==='silence')return battle.ritualInterrupted||battle.stun?1:.45;if(type==='taunt')return battle.taunt||battle.specialSeen.Bram?1:.45;if(type==='triad')return ['Scott','Mira','Bram'].every(n=>!state.party.includes(n)||battle.specialSeen[n])?1:.35;return 1}
function strike(a){
 if(!battle?.question||battle.locked)return;const q=battle.question,p=actor();
 if(a.trim().toUpperCase()===q.answer){
  state.streak=(state.streak||0)+1;battle.chain=(battle.chain||0)+1;state.flow=Math.min(5,(state.flow||0)+1+(battle.chain>0&&battle.chain%3===0?1:0));state.bestStreak=Math.max(state.bestStreak||0,state.streak);if(state.streak===10)award('Ten-Word Streak');
  const element=attackElement(p,battle.power>=20?'special':battle.typed?'power':'attack');let damage=Math.round((13+state.lv*3+state.weapon*2+battle.power+(state.classUp&&p==='Scott'?7:0)+(p==='Mira'?4:0)+Math.floor((state.flow||0)*2.5))*(1+Math.random()*.2));
  damage=Math.round(damage*affinityMultiplier(element));if(battle.chain>=6)damage=Math.round(damage*1.30);else if(battle.chain>=3)damage=Math.round(damage*1.15);
  if(p==='Scott'&&equipmentStyle()==='vanguard')damage=Math.round(damage*1.20);if(p==='Scott'&&state.lv>=20)damage=Math.round(damage*1.10);if(enemyTrait()==='armored'&&!battle.typed)damage=Math.max(1,Math.round(damage*.82));if(p==='Scott'&&pathBonus('Scott','duelist'))damage=Math.round(damage*(state.lv>=16?1.4:1.25));
  if(enemyStance()==='GUARD')damage=Math.round(damage*.78);damage=Math.max(1,Math.round(damage*eliteDamageModifier(battle.typed)));
  if(battle.ritual&&battle.typed){battleMsg('RITUAL INTERRUPTED! The precise word shatters '+battle.ritual.name+'.');battle.ritual=null;battle.ritualInterrupted=true;damage=Math.round(damage*1.25)}
  if(battle.boss&&state.chapter%3===0&&battle.ward>0){battle.ward--;damage=Math.max(2,Math.floor(damage*.35));battleMsg('INK WARD absorbs much of the strike! '+battle.ward+' layers remain.')}else if(battle.boss&&state.chapter%3===1&&battle.typed){damage=Math.round(damage*1.55)}
  battle.hp=Math.max(0,battle.hp-damage);
  if(battle.boss&&!battle.phase&&battle.hp>0&&battle.hp<=battle.max*.48){battle.phase=1;state.flow=Math.max(0,state.flow-1);if(state.chapter%3===0)battle.ward+=1;else if(state.chapter%3===2){for(const name of state.party)state.mp[name]=Math.max(0,state.mp[name]-3)}battleMsg(CHAPTER_BEATS[state.chapter].phase+(battle.alliance?' · Your town alliance remains with you.':''));bossRitual();document.querySelector('.battle-arena')?.classList.add('lq-frenzy');beep(210,.24)}
  if(p==='Scott'){state.weaponXp+=battle.typed?10:6;if(state.weaponXp>=100){state.weapon++;state.weaponXp-=100}}
  battleMsg(`${p} strikes for ${damage} ${element} damage!${battle.chain>=3?' CHAIN '+battle.chain+'!':''}${battle.phase===1?' The enemy has entered its final phase.':''}${state.flow===5?' FLOW MAX · Resonance bonus active!':''}`);battle.question=null;$('#question').textContent='';$('#answers').innerHTML='';H('#typeForm');if(battle.hp<=0){victory();return}advance();
 }else{
  state.streak=0;battle.chain=0;state.flow=Math.max(0,(state.flow||0)-2);battle.miss++;const dmg=battle.guard?0:Math.max(1,Math.round((5+state.chapter-Math.floor(state.armor/2))*(equipmentStyle()==='warden'?.75:equipmentStyle()==='vanguard'?1.15:1)));battle.guard=false;state.hp[p]=Math.max(0,state.hp[p]-dmg);if(state.party.every(x=>state.hp[x]===0)){battleDefeat();return}$('#hint').textContent=`Miss. ${hint(q.answer,battle.miss+(state.quill?1:0))}`;battleMsg(`${p} takes ${dmg} counter damage. The word chain breaks.`);combatRender()
 }
}
// Region-specific enemy patterns. The intent is visible before the third party turn resolves.
const ENEMY_PATTERNS=[
 {name:'Ink Barrage',moves:['Ink Scratch','Binding Script','Ink Barrage'],power:[0,2,5],drain:0},
 {name:'Reflected Strike',moves:['Glass Slash','Doubt Whisper','Reflected Strike'],power:[1,2,5],drain:0},
 {name:'Cinder Eruption',moves:['Spark','Burning Brand','Cinder Eruption'],power:[1,3,6],drain:0},
 {name:'Drowning Wave',moves:['Cold Spray','Rising Tide','Drowning Wave'],power:[0,2,6],drain:0},
 {name:'Sandstorm',moves:['Grit','Drying Wind','Sandstorm'],power:[0,3,5],drain:1},
 {name:'Gale Burst',moves:['Wind Cut','Static Crackle','Gale Burst'],power:[1,2,5],drain:1},
 {name:'Whiteout',moves:['Frost Bite','Numbing Air','Whiteout'],power:[1,3,6],drain:1},
 {name:'Final Erasure',moves:['Paper Cut','Name Drain','Final Erasure'],power:[2,3,7],drain:2}
];
function enemyTrait(){if(!battle)return 'normal';const n=battle.name;return /GOLEM|SENTINEL|KNIGHT|CHANCELLOR|JUDGE|INDEX/i.test(n)?'armored':/WRAITH|SPECTER|SHADE|PHANTOM|USURPER|REMEMBERER/i.test(n)?'drainer':/WOLF|ROC|HARRIER|DEVOURER|REAVER/i.test(n)?'feral':/BEETLE|SLIME/i.test(n)?'skitter':'normal'}
function enemyIntent(){if(!battle)return null;const pattern=ENEMY_PATTERNS[state.chapter]||ENEMY_PATTERNS[0];const step=(battle.round-1)%3;return{pattern,step,name:pattern.moves[step],power:pattern.power[step],drain:pattern.drain&&step===1?pattern.drain:0}}
function startEnemyRitual(){if(!battle||(battle.ritual)||!(battle.boss||eliteRule()))return;const elite=eliteRule();if(battle.round%4!==0&&elite?.type!=='ritual')return;battle.ritual={name:battle.boss?BOSS_RITUALS[state.chapter]:'Drowned Decree',power:6+state.chapter};battle.ritualInterrupted=false;battleMsg('RITUAL CHARGING · '+battle.ritual.name+'. A correct typed word or Silence Glyph can interrupt it.')}
function resolveEnemyRitual(){if(!battle?.ritual)return false;const living=state.party.filter(n=>state.hp[n]>0),target=living[Math.floor(Math.random()*living.length)],dmg=Math.max(4,battle.ritual.power+Math.floor(state.chapter/2));state.hp[target]=Math.max(0,state.hp[target]-dmg);state.flow=Math.max(0,(state.flow||0)-2);battleMsg(battle.name+' completes '+battle.ritual.name+'! '+target+' takes '+dmg+' and FLOW falls.');battle.ritual=null;if(state.party.every(x=>state.hp[x]===0)){battleDefeat();return true}return true}
function applyBossHazard(){if(!battle?.boss||battle.round%3!==0)return;let text=BOSS_HAZARDS[state.chapter];if(state.chapter===0){state.flow=Math.max(0,(state.flow||0)-1)}else if(state.chapter===1){battle.mirrorHazard=true}else if(state.chapter===2){for(const n of state.party)if(state.hp[n]>0)state.hp[n]=Math.max(1,state.hp[n]-3-state.chapter)}else if(state.chapter===3){battle.healPenalty=.65}else if(state.chapter===4){battle.blind=1}else if(state.chapter===5){state.flow=0}else if(state.chapter===6){const n=state.party.slice().sort((a,b)=>state.mp[b]-state.mp[a])[0];state.mp[n]=Math.max(0,state.mp[n]-3)}else if(state.chapter===7){if(state.ethers>0)state.ethers--;else state.flow=Math.max(0,state.flow-2)}battleMsg('BOSS HAZARD · '+text)}
function advance(){
 if(!battle)return;battle.actor++;
 if(battle.actor%state.party.length===0){
  if(battle.stun>0){battle.stun--;battleMsg(battle.name+' is silenced and loses its action.');battle.round++;startEnemyRitual();combatRender();return}
  if(resolveEnemyRitual()){if(!battle)return;battle.round++;startEnemyRitual();combatRender();return}
  const intent=enemyIntent(),living=state.party.filter(x=>state.hp[x]>0);let p=battle.taunt&&state.hp[battle.taunt]>0?battle.taunt:living[Math.floor(Math.random()*living.length)];const trait=enemyTrait(),stance=enemyStance();const base=7+state.chapter*2-state.armor+intent.power+(battle.boss?3:0)+(trait==='feral'&&battle.hp<=battle.max/2?4:0)+(trait==='skitter'&&battle.round%3===0?3:0)+(stance==='ASSAULT'?3:0);
  let dmg=Math.max(1,Math.round(base*(equipmentStyle()==='warden'?.75:equipmentStyle()==='vanguard'?1.15:1)*(state.difficulty==='story'?.75:state.difficulty==='veteran'?1.30:1)*(state.lv>=20?.90:1)));
  if(battle.guard)dmg=Math.max(1,Math.floor(dmg*(battle.barrier||.5)));if(battle.taunt==='Bram'&&p==='Bram')dmg=Math.max(1,Math.floor(dmg*.65));battle.barrier=null;if(battle.sanctuaryWard){dmg=Math.max(1,Math.floor(dmg*.40));battle.sanctuaryWard=false}
  battle.guard=false;state.hp[p]=Math.max(0,state.hp[p]-dmg);
  let counterText='';if(battle.counter&&p==='Scott'){const rip=10+state.lv*2;battle.hp=Math.max(0,battle.hp-rip);battle.counter=false;counterText=' Scott ripostes for '+rip+'!'}
  battle.taunt=null;if(state.party.every(x=>state.hp[x]===0)){battleDefeat();return}if(battle.hp<=0){battleMsg('Scott’s counterattack ends the battle!');victory();return}
  if(intent.drain||(trait==='drainer'&&battle.round%3===0)||stance==='FOCUS'){const target=state.party.find(x=>state.mp[x]>0);if(target)state.mp[target]=Math.max(0,state.mp[target]-(intent.drain||1))}
  let addDamage=0;if(battle.adds>0){addDamage=Math.min(5,battle.adds);const addTarget=state.party.filter(x=>state.hp[x]>0)[0];state.hp[addTarget]=Math.max(0,state.hp[addTarget]-addDamage)}
  battleMsg(`${battle.name} uses ${intent.name} on ${p} for ${dmg}.${intent.drain||trait==='drainer'&&battle.round%3===0||stance==='FOCUS'?' Magic energy is drained.':''}${addDamage?' Echoes add '+addDamage+' damage.':''}${counterText}`);
  battle.round++;applyBossHazard();startEnemyRitual();if(state.party.every(x=>state.hp[x]===0)){battleDefeat();return}
 }else battleMsg(`${actor()} takes the next turn.`);
 battle.question=null;$('#question').textContent='';$('#answers').innerHTML='';H('#typeForm');combatRender();
}

function victory(){window.LexiconAudio?.playSting('victory');state.flow=0;const b=battle;state.recentCombat=(b.log||[]).slice(-12);if(b.rescue){const p=productionState(),key=String(b.rescueChapter??state.chapter);if(!p.rescues[key]){p.rescues[key]=true;state.gold+=55+(b.rescueChapter??state.chapter)*8;state.potions+=1;gainXP(65+(b.rescueChapter??state.chapter)*18);milestone(CHAPTERS[b.rescueChapter??state.chapter].name+' town rescue completed');}}if(b.eliteHunt){stage().eliteHunt=true;state.gold+=90+state.chapter*35;gainXP(100+state.chapter*45);state.forgeShards=(state.forgeShards||0)+1;state.lore=state.lore||[];state.lore.push('Elite hunt cleared: '+ELITE_HUNTS[state.chapter][0]+' · recovered a Rune Shard.');milestone('Rune Shard recovered from '+ELITE_HUNTS[state.chapter][0]);}state.encounterWins=state.encounterWins||{};state.encounterWins[b.name]=(state.encounterWins[b.name]||0)+1;battle=null;if(ruinBattleOrigin&&!b.boss){const origin=ruinBattleOrigin;ruinBattleOrigin=null;const rs=ruinState();rs.patrols=rs.patrols||{};rs.patrols[origin.id]=true;state.gold+=20+state.chapter*8;gainXP(35+state.chapter*12);if(screen==='dialog'){const previous=afterDialog;afterDialog=()=>{if(previous)previous();if(screen!=='dialog'){view('ruins');drawRuin();ruinSay('Guardian defeated! The route is clear. '+takeLevelNotice());write()}}}else{view('ruins');drawRuin();ruinSay('Guardian defeated! +XP and gold. The route is clear. '+takeLevelNotice())}write();return}state.defeated=(state.defeated||0)+1;if(state.defeated===1)award('First Victory');view('world');const st=stage();if(b.boss){document.querySelector('.battle-arena')?.classList.remove('lq-frenzy');if(state.completed){state.bossReplayWins=(state.bossReplayWins||0)+1;say('Echo Gauntlet cleared! The triumph is recorded (replays do not award unlimited gold).');draw();write();return}if(st.boss){say('This guardian was already defeated; no additional chapter reward.');draw();write();return}st.boss=true;milestone(CHAPTERS[state.chapter].name+' boss defeated');state.relics=state.relics||[];if(!state.relics.includes(CHAPTERS[state.chapter].reward))state.relics.push(CHAPTERS[state.chapter].reward);state.gold+=100+state.chapter*35;gainXP(150+state.chapter*80);say(`${b.name} defeated! Tap the boss tile to advance. `+(b.alliance?'The townsfolk lent their strength. ':'')+takeLevelNotice());cinematic('THE NAME IS RESTORED',BOSS_SCENES[state.chapter].victory,()=>{draw();write()},'chapter')}else{st.monster=true;state.gold+=25+state.chapter*7;gainXP(45+state.chapter*12);say((b.rescue?'TOWN RESCUE COMPLETE! The resident is safe. ':b.eliteHunt?'ELITE HUNT COMPLETE! Bonus XP, gold and Chronicle evidence recovered. ':'Victory! The path is clear. ')+takeLevelNotice())}draw();write()}
function validateCrosswordPuzzle(p){
 const errors=[],cells=new Map(),hits=new Map(),runs=new Set();
 if(!p||!Array.isArray(p.entries))return{ok:false,intersections:0,errors:['Missing entries']};
 for(const e of p.entries){
  if(!/^[A-Z]{3,}$/.test(e.answer)||!['A','D'].includes(e.dir)){errors.push('Invalid entry');continue}
  const signature=e.dir+':'+e.r+','+e.c+':'+e.answer;if(runs.has(signature))errors.push('Duplicate entry');runs.add(signature);
  for(let i=0;i<e.answer.length;i++){const r=e.r+(e.dir==='D'?i:0),c=e.c+(e.dir==='A'?i:0),k=r+','+c;if(r<0||r>=p.height||c<0||c>=p.width)errors.push('Out of bounds');if(cells.has(k)&&cells.get(k)!==e.answer[i])errors.push('Contradiction');cells.set(k,e.answer[i]);hits.set(k,(hits.get(k)||0)+1)}
 }
 for(const [key] of cells){const [r,c]=key.split(',').map(Number);for(const dir of ['A','D']){const dr=dir==='D'?1:0,dc=dir==='A'?1:0;if(cells.has((r-dr)+','+(c-dc)))continue;let word='',i=0;while(cells.has((r+dr*i)+','+(c+dc*i))){word+=cells.get((r+dr*i)+','+(c+dc*i));i++}if(word.length>1&&!runs.has(dir+':'+r+','+c+':'+word))errors.push('Unclued '+dir+' run at '+key)}}
 const visited=new Set(),queue=cells.size?[[...cells.keys()][0]]:[];while(queue.length){const k=queue.pop();if(visited.has(k))continue;visited.add(k);const [r,c]=k.split(',').map(Number);for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=(r+dr)+','+(c+dc);if(cells.has(next)&&!visited.has(next))queue.push(next)}}if(visited.size!==cells.size)errors.push('Disconnected grid');
 const intersections=[...hits.values()].filter(n=>n===2).length;if(!intersections||!p.entries.some(e=>e.dir==='A')||!p.entries.some(e=>e.dir==='D'))errors.push('Missing crossings');return{ok:errors.length===0,intersections,errors}
}
function makePuzzle(){
 const st=stage();if(st.puzzleData?.version===2&&validateCrosswordPuzzle(st.puzzleData).ok)return st.puzzleData;
 const oldAnswers=new Set((st.puzzleData?.entries||[]).filter(e=>(st.cross||[]).includes(e.id)).map(e=>e.answer));
 const anchor=CHAPTERS[state.chapter].anchor;let best=null;
 for(let attempt=0;attempt<24;attempt++){
  const size=15,p={version:2,width:size,height:size,entries:[]},cells=new Map();
  function place(e){p.entries.push(e);for(let i=0;i<e.answer.length;i++){const k=(e.r+(e.dir==='D'?i:0))+','+(e.c+(e.dir==='A'?i:0));const cell=cells.get(k)||{letter:e.answer[i],dirs:[]};cell.dirs.push(e.dir);cells.set(k,cell)}}
  place({answer:anchor,dir:'A',r:7,c:Math.floor((size-anchor.length)/2),clue:CLUES.find(q=>q.a===anchor)?.c[0]||'Key word of this chapter'});
  const used=new Set([anchor]);
  for(const q of shuffle(CLUES.filter(q=>q.a.length>=3&&q.a.length<=10))){
   if(used.has(q.a))continue;const options=[];
   for(const [key,cell] of cells){if(cell.dirs.length!==1)continue;const [r,c]=key.split(',').map(Number),dir=cell.dirs[0]==='A'?'D':'A',dr=dir==='D'?1:0,dc=dir==='A'?1:0;
    for(let ix=0;ix<q.a.length;ix++){if(q.a[ix]!==cell.letter)continue;const rr=r-dr*ix,cc=c-dc*ix,endR=rr+dr*(q.a.length-1),endC=cc+dc*(q.a.length-1);if(rr<0||cc<0||endR>=size||endC>=size||cells.has((rr-dr)+','+(cc-dc))||cells.has((endR+dr)+','+(endC+dc)))continue;
     let valid=true,hits=0;for(let j=0;j<q.a.length;j++){const y=rr+dr*j,x=cc+dc*j,v=cells.get(y+','+x);if(v){if(v.letter!==q.a[j]||v.dirs.includes(dir)){valid=false;break}hits++}else if(cells.has((y-dc)+','+(x-dr))||cells.has((y+dc)+','+(x+dr))){valid=false;break}}
     if(valid)options.push({answer:q.a,clue:q.c[0],dir,r:rr,c:cc,hits});
    }
   }
   if(options.length){options.sort((a,b)=>b.hits-a.hits);place(options[0]);used.add(q.a)}if(p.entries.length>=12)break;
  }
  if(!best||p.entries.length>best.entries.length)best=p;if(best.entries.length>=12)break;
 }
 const minR=Math.min(...best.entries.map(e=>e.r)),minC=Math.min(...best.entries.map(e=>e.c));for(const e of best.entries){e.r-=minR;e.c-=minC;delete e.hits}best.height=Math.max(...best.entries.map(e=>e.r+(e.dir==='D'?e.answer.length:1)));best.width=Math.max(...best.entries.map(e=>e.c+(e.dir==='A'?e.answer.length:1)));
 best.entries.sort((a,b)=>a.r-b.r||a.c-b.c||a.dir.localeCompare(b.dir));let n=0,last='';for(const e of best.entries){const k=e.r+','+e.c;if(k!==last){n++;last=k}e.number=n;e.id=n+e.dir}
 if(!validateCrosswordPuzzle(best).ok)throw Error('Invalid crossword layout');st.puzzleData=best;st.cross=best.entries.filter(e=>st.puzzle||oldAnswers.has(e.answer)).map(e=>e.id);write();return best
}
function openCross(){cross=makePuzzle();selected=null;view('cross');crossDraw();$('#selectedClue').textContent='Select an Across or Down clue, or click a white square.';$('#crossAnswer').value=''}
function chooseCross(e){selected=e;crossDraw();$('#selectedClue').textContent=e.number+' '+(e.dir==='A'?'Across':'Down')+' · '+e.clue;$('#crossHint').textContent='';$('#crossAnswer').value='';$('#crossAnswer').maxLength=e.answer.length;$('#crossAnswer').focus()}
function crossDraw(){
 const p=cross,solved=stage().cross||[],cells={},nums={};for(const e of p.entries){nums[e.r+','+e.c]=e.number;for(let i=0;i<e.answer.length;i++){const k=(e.r+(e.dir==='D'?i:0))+','+(e.c+(e.dir==='A'?i:0));cells[k]=cells[k]||{letter:'',entries:[]};cells[k].entries.push(e);if(solved.includes(e.id))cells[k].letter=e.answer[i]}}
 $('#puzzleName').textContent=CHAPTERS[state.chapter].title+' · SEAL';$('#puzzleProgress').textContent=solved.length+'/'+p.entries.length;const grid=$('#crossgrid');grid.style.gridTemplateColumns='repeat('+p.width+',minmax(0,1fr))';grid.innerHTML='';
 for(let r=0;r<p.height;r++)for(let c=0;c<p.width;c++){const k=r+','+c,cell=cells[k],el=document.createElement(cell?'button':'div');el.className='sq'+(cell?'':' off')+(cell?.entries.includes(selected)?' selected':'');if(cell){el.type='button';el.setAttribute('aria-label','Row '+(r+1)+', column '+(c+1)+', '+(cell.letter||'blank')+'. '+cell.entries.map(e=>e.number+' '+(e.dir==='A'?'Across':'Down')).join(', '));el.onclick=()=>{const i=cell.entries.indexOf(selected);chooseCross(cell.entries[(i+1)%cell.entries.length])};el.innerHTML=(nums[k]?'<small>'+nums[k]+'</small>':'')+cell.letter}else el.setAttribute('aria-hidden','true');grid.appendChild(el)}
 $('#clueList').innerHTML='';for(const dir of ['A','D']){const heading=document.createElement('h3');heading.textContent=dir==='A'?'Across':'Down';$('#clueList').appendChild(heading);for(const e of p.entries.filter(e=>e.dir===dir)){const b=document.createElement('button');b.className=e===selected?'cross-clue-active':'';b.setAttribute('aria-pressed',String(e===selected));b.textContent=(solved.includes(e.id)?'✓ ':'')+e.number+'. '+e.clue+' ('+e.answer.length+')';b.onclick=()=>chooseCross(e);$('#clueList').appendChild(b)}}
}
function solve(){if(!selected)return;const a=$('#crossAnswer').value.trim().toUpperCase(),st=stage();if(a===selected.answer){st.cross=st.cross||[];if(!st.cross.includes(selected.id))st.cross.push(selected.id);crossDraw();write();$('#crossHint').textContent='Correct. The intersecting letters return.';if(st.cross.length===cross.entries.length){st.puzzle=true;view('world');draw();say('The crossword seal is restored. The boss is vulnerable!');gainXP(55+state.chapter*25);write()}}else{const id=state.chapter+'_'+selected.id;state.misses[id]=(state.misses[id]||0)+1;$('#crossHint').textContent='Hint: '+hint(selected.answer,state.misses[id]);$('#crossAnswer').select()}}
function openHub(){view('hub');$('#hubDetails').innerHTML=heroHTML(`<p><b>Party level ${state.lv}</b> · ${state.gold} gold · Sword proficiency ${state.weapon}</p><p>Scott ${state.hp.Scott}/${state.maxhp.Scott} HP · ${state.mp.Scott} MP</p>${state.party.includes('Mira')?`<p>Mira ${state.hp.Mira}/${state.maxhp.Mira} HP · ${state.mp.Mira} MP</p>`:''}${state.party.includes('Bram')?`<p>Bram ${state.hp.Bram}/${state.maxhp.Bram} HP · ${state.mp.Bram} MP</p>`:''}<p>Potions ${state.potions} · Ethers ${state.ethers} · Phoenix Feathers ${state.phoenixFeathers||0} · Armor ${state.armor} · Rune Shards ${state.forgeShards||0}</p><p>Quest: ${$('#quest').textContent}</p><p>Chapters cleared: ${state.chapter}/8 · Steps ${state.steps||0} · Battles ${state.defeated||0}</p><p>Relics: ${(state.relics||[]).join(', ')||'None yet'}</p><p>Equipped specialization: ${EQUIPMENT_STYLES[equipmentStyle()]?.name||'None'} · ${EQUIPMENT_STYLES[equipmentStyle()]?.desc||'Visit the forge to specialize'}</p><p>${pacingInfo()}</p><p>Class evolution: ${state.party.map(p=>p+' — '+classTitle(p)).join(' · ')}</p><p>Skills used: ${Object.values(state.specialUses||{}).reduce((a,b)=>a+b,0)} · Elite hunts: ${Object.values(state.stages||{}).filter(x=>x.eliteHunt).length}/8</p><p>Best word streak: ${state.bestStreak||0} · Achievements: ${(state.achievements||[]).join(', ')||'None yet'}</p><p>Side quest: ${stage().quest?'Completed':OPTIONAL_TASKS[state.chapter][0]} · Story quest: ${stage().saga?.step===3?'Completed':(stage().saga?.step||0)+'/3 acts'}</p>`);const b=$('#hubActions');b.innerHTML='';for(const [name,fn] of [['CINEMATIC GALLERY',()=>showSceneGallery()],['VISUAL & DIALOGUE SETTINGS',()=>showVisualSettings()],['CONTROLS & MAP LEGEND',()=>showGameLegend()],['RELEASE HEALTH & SETTINGS',()=>showReleaseHealth()],['BATTLE HISTORY',()=>showBattleHistory()],['EXPORT PLAYTEST REPORT',()=>exportPlaytestReport()],['REGIONAL ALLIANCE & PROGRESS',()=>showRegionalStatus()],['EXPLORE REGIONAL TOWN · WALKABLE',()=>state.chapter===0?enterWillowTown():enterRegionalTown()],['VISIT TOWN SQUARE · LIVING WORLD',()=>state.chapter===0?enterWillowTown():enterRegionalTown()],['CLASS DISCIPLINES · LEVEL 10+',()=>classProgress()],['RUNIC FORGE · RECIPES & UPGRADES',()=>forgeBoard()],['TACTICAL BESTIARY · WEAKNESSES',()=>showTacticalBestiary()],['REGIONAL ELITE HUNT',()=>huntBoard()],['REGIONAL STORY QUEST · 3 ACTS',()=>sagaBoard()],['EXPLORE STORY LOCATION',()=>enterStoryPlace()],['PARTY CAMP · STORY SCENE',()=>showCamp()],['MIRA · PERSONAL CAMP ARC',()=>companionArc('Mira')],['BRAM · PERSONAL CAMP ARC',()=>companionArc('Bram')],['VEX QUILL · RIVAL ENCOUNTER',()=>rivalArc()],['RESTORATION CEREMONY',()=>restorationCeremony()],['TOWN RESCUE ENCOUNTER',()=>startTownRescue()],['COMMUNITY RELAY · NONPUNITIVE TIMER',()=>timedTownEvent()],['AUDIO & SOUNDTRACK',()=>window.LexiconAudio?.openSettings()],['ART & AUDIO WORKSHOP',()=>presentationSettings()],['BOOK OF NAMES · LORE',()=>loreChronicle()],['EXPLORE REGIONAL RUINS',()=>enterRuins()],['REGIONAL REPUTATION & MILESTONES',()=>showReputationLedger()],['SANCTUARY BLESSING · 1 / REGION',()=>takeSanctuaryBlessing()],['WILLOWMERE VICTORY EPILOGUE',()=>{const first=postBossEpilogue();openHub();if(first)$('#hubDetails').innerHTML+='<p>The bells of Willowmere ring for the remembered. You receive 30G.</p>';else $('#hubDetails').innerHTML+='<p>Available once after defeating the Chapter I Archivore.</p>'}],['CAMPAIGN PACING REPORT',()=>{const chapters=CHAPTERS.map((c,i)=>{const st=state.stages[i]||{};return `<p>${i+1}. ${c.name}: ${st.boss?'✓ Boss':'· Boss pending'} / ${st.ruins?.completed?'✓ Ruins':'· Ruins pending'} / ${st.quest?'✓ Side quest':'· Side quest pending'} / ${st.eliteHunt?'✓ Elite hunt':'· Elite hunt pending'} / ${st.saga?.step===3?'✓ Story quest':'· Story quest pending'}</p>`}).join('');$('#hubDetails').innerHTML='<h3>CAMPAIGN PROGRESS</h3><p>'+pacingInfo()+'</p><p>Time reflects active foreground sessions on this device; it is not a projected total.</p>'+chapters+'<p>Distinct enemy victories: '+Object.keys(state.encounterWins||{}).length+'</p>'; }],['JOURNAL & BESTIARY',()=>{const st=stage(),q=OPTIONAL_TASKS[state.chapter];$('#hubDetails').innerHTML='<h3>ADVENTURER JOURNAL</h3><p><b>Current objective:</b> '+$('#quest').textContent+'</p><p><b>Region:</b> '+CHAPTERS[state.chapter].name+' · '+CHAPTERS[state.chapter].title+'</p><p><b>Side quest:</b> '+q[0]+' — '+(st.quest?'Complete':'Open')+'</p><p><b>Archive seal:</b> '+(st.cross||[]).length+' restored entries</p><p><b>Monsters encountered:</b></p>'+Object.entries(state.bestiary||{}).map(([n,count])=>{const a=REGION_AFFINITIES[state.chapter]||REGION_AFFINITIES[0];return '<p>'+n+' × '+count+' · '+enemyTraitForName(n)+' · weak '+a.weak+' / resists '+a.resist+'</p>'}).join('')+'<p>Return to menu via RETURN TO WORLD.</p>'; }],['USE POTION',()=>{if(state.potions>0){state.potions--;state.hp.Scott=Math.min(state.maxhp.Scott,state.hp.Scott+30)}openHub()}],['USE ETHER',()=>{if(state.ethers>0){state.ethers--;state.mp.Scott=Math.min(state.maxmp.Scott,state.mp.Scott+10)}openHub()}],['REST AT INN · 15G',()=>{if(state.gold>=15){state.gold-=15;for(const p of state.party){state.hp[p]=state.maxhp[p];state.mp[p]=state.maxmp[p]}}openHub()}],['TOGGLE SOUND',()=>{state.sound=!state.sound;openHub()}],['TRANSFER SAVE',()=>openTransfer()],['SAVE GAME',()=>{const ok=write();$('#hubDetails').innerHTML+=`<div class="toast">${ok?'Saved successfully.':'Storage unavailable. Check browser settings.'}</div>`}],['SAVE & TITLE',()=>{write();title()}]]){const btn=document.createElement('button');btn.textContent=name;btn.onclick=fn;b.appendChild(btn)}}
function regionalShopPricing(name,base){
 const st=stage();let mult=1,label='standard price';
 if(state.chapter===0&&st.willowTown?.completed){mult=.90;label='Willowmere ally price'}
 else if(state.chapter>0&&st.regionalTown?.ending){const sheltered=st.regionalTown.ending==='sheltered',consumable=['Potion','Ether','Phoenix Feather'].includes(name);mult=sheltered&&consumable?.80:.90;label=sheltered?'keeper network price':'public restoration price';if(st.regionalTown?.crisis?.ending)mult=Math.max(.70,mult-.05)}
 return {cost:Math.max(1,Math.round(base*mult)),label,mult}
}
function openShop(){
 view('shop');const goods=$('#shopGoods');goods.innerHTML='';const status=document.createElement('p');status.className='muted';const sample=regionalShopPricing('Potion',15);status.textContent=sample.mult<1?'Regional choices unlocked discounted merchant prices.':'Restore the local community to unlock ally pricing.';goods.appendChild(status);
 for(const [name,baseCost] of shops){const pricing=regionalShopPricing(name,baseCost),cost=pricing.cost,row=document.createElement('div');row.className='shoprow row';const span=document.createElement('span');span.textContent=name+' · '+cost+'G'+(cost<baseCost?' · ally discount':'');const btn=document.createElement('button');btn.textContent='BUY';const styleName=name==='Vanguard Crest'?'vanguard':name==='Warden Seal'?'warden':name==='Sage Prism'?'sage':null;const owned=styleName&&(state.ownedStyles||[]).includes(styleName);btn.textContent=owned?(equipmentStyle()===styleName?'EQUIPPED':'EQUIP'):'BUY';btn.disabled=owned?equipmentStyle()===styleName:state.gold<cost;
  btn.onclick=()=>{if(owned){state.equipmentStyle=styleName;openShop();write();return}if(state.gold<cost)return;state.gold-=cost;if(name==='Potion')state.potions++;if(name==='Ether')state.ethers++;if(name==='Phoenix Feather')state.phoenixFeathers=(state.phoenixFeathers||0)+1;if(name==='Steel Wordblade')state.weapon+=2;if(name==='Guardian Mantle')state.armor+=2;if(styleName){state.ownedStyles=state.ownedStyles||[];if(!state.ownedStyles.includes(styleName))state.ownedStyles.push(styleName);state.equipmentStyle=styleName}openShop();write()};row.append(span,btn);goods.appendChild(row)
 }
}

function slotsUI(newGame){screen='slots';V('#slots');H('#title');H('#game');$('#slotHeading').textContent=newGame?'START A NEW CHRONICLE':'CONTINUE A CHRONICLE';$('#slotList').innerHTML='';for(let i=0;i<3;i++){const s=saveSlots[i],b=document.createElement('button');b.textContent=`SLOT ${i+1} · ${s?`${cleanHeroName(s.heroName)||'Scott'} · Lv ${s.lv} — Chapter ${s.chapter+1}`:'EMPTY'}`;b.disabled=!newGame&&!s;b.onclick=()=>{slot=i;if(newGame)chooseHeroName();else{state=clone(s);view('world');draw();say('Welcome back. Your chronicle was restored.')}};$('#slotList').appendChild(b)}}

// Five-room authored dungeon routes. Two alternating layouts support eight chapters.
// Progress is additive in stage().ruins, preserving older saves.

// Production batch: recurring rival, companion arcs, ceremonies, rescues, secrets, timed events, and presentation controls.
const RIVAL_SCENES=[
 ['A FEATHER IN THE ROAD','Vex Quill steps from behind a willow and steals a page Scott had not noticed was missing.','VEX QUILL','If a name can be stolen, perhaps it never belonged to you.'],
 ['THE OTHER SCOTT','Vex waits inside a mirror that reflects everyone except himself.','VEX QUILL','Reflections are honest only when they disagree with you.'],
 ['ASH SIGNATURE','A black feather survives inside Emberpeak’s hottest furnace.','VEX QUILL','The Archivore burns records. I burn excuses. We are not the same.'],
 ['THE DROWNED LETTER','Vex returns a royal letter he could have sold, then refuses to explain why.','VEX QUILL','Some words are too dangerous to destroy and too dangerous to keep.'],
 ['FALSE CONSTELLATION','Vex has rearranged three star markers to point away from a buried village.','VEX QUILL','A lie that saves lives is still a lie. Decide whether that matters.'],
 ['THE EMPTY SEAT','An airship carries a reserved seat with Vex’s name, though nobody remembers booking it.','VEX QUILL','The sky routes are being rewritten. I prefer to choose where I vanish.'],
 ['THE NAME UNDER ICE','Vex carves his own name into the frozen road, then watches half the letters disappear.','VEX QUILL','Now you understand why I keep moving.'],
 ['THE LAST MARGIN','Vex arrives at the First Library carrying the first page he stole in Willowmere.','VEX QUILL','I kept one thing from the Eraser: your beginning. You keep the ending.']
];
const COMPANION_ARCS={
 Mira:[
  ['MIRA','🔮','When I was an apprentice, I memorized spells because I was afraid understanding them would change me.'],
  ['MIRA','🔮','The Oracle path is not about predicting the future. It is about admitting every answer has a cost.'],
  ['MIRA','🔮','I can hear the missing words now. They sound less like ghosts and more like people knocking on a door.'],
  ['MIRA','🔮','When this is over, I want to teach. Not spells first. Questions first.']
 ],
 Bram:[
  ['BRAM','🛡️','Guardians are taught to stand still. I became good at it. Too good.'],
  ['BRAM','🛡️','Valewyn fell while I was following an order that no longer made sense. I still hear that order sometimes.'],
  ['BRAM','🛡️','Protecting people is not the same as protecting walls. I wish somebody had told me sooner.'],
  ['BRAM','🛡️','After the First Library, I am finding a kitchen with strong walls and weak soup. That is my retirement plan.']
 ]
};
const RESTORATION_CEREMONIES=[
 'Willowmere hangs a lantern for every recovered name.','Glasswake turns its mirrors toward the town instead of the palace.',
 'Cinderhaven strikes the memorial anvil once for each apprentice.','Tidemark rings the witness bell above the restored waterline.',
 'Starfall redraws the safe roads beneath a sky of paper stars.','Aerieport launches streamers from every repaired mooring.',
 'Snowrest lights the road beacons from hearth to hearth.','Indexhaven opens a blank public ledger and asks every resident to write one line.'
];
const RESCUE_ENCOUNTERS=[
 ['Inkbound Kidnapper','A courier has been cornered beside the Moonwell.'],['Mirror Pursuer','A glasskeeper is trapped by a reflection that attacks first.'],
 ['Furnace Hound','Workers are pinned behind a burst of living cinders.'],['Canal Reaver','A ferry carrying families is being dragged toward the floodgate.'],
 ['Dune Stalker','A lost caravan is surrounded at the edge of the old road.'],['Storm Roc','A rigger hangs from a snapped line beneath the docks.'],
 ['Whiteout Shade','A census party has vanished twenty paces beyond the final beacon.'],['Margin Wraith','A junior librarian is trapped inside a sentence that keeps shortening.']
];
const TIMED_EVENT_NAMES=['Lantern Delivery','Mirror Bell Relay','Cooling Run','Floodgate Warning','Caravan Signal','Mooring Race','Beacon Circuit','Index Recall'];
function productionState(){state.production=state.production||{rivalSeen:{},companionArcs:{Mira:0,Bram:0},ceremonies:{},rescues:{},timedEvents:{},visualFx:true,audioMix:'layered'};state.production.rivalSeen=state.production.rivalSeen||{};state.production.companionArcs=state.production.companionArcs||{Mira:0,Bram:0};state.production.ceremonies=state.production.ceremonies||{};state.production.rescues=state.production.rescues||{};state.production.timedEvents=state.production.timedEvents||{};return state.production}
function rivalArc(){const p=productionState(),key=String(state.chapter),scene=RIVAL_SCENES[state.chapter];if(p.rivalSeen[key]){openHub();const q=document.createElement('p');q.textContent='Vex Quill has already crossed your path in this chapter. '+scene[3];$('#hubDetails').append(q);return}p.rivalSeen[key]=true;state.lore=state.lore||[];state.lore.push('Vex Quill · '+scene[0]+': '+scene[1]);if(Object.keys(p.rivalSeen).length===8)award('The Quill in the Margin');milestone('Vex Quill · '+scene[0]);write();story([['NARRATOR','🪶',scene[1]],[scene[2],'🪶',scene[3]],['SCOTT','⚔️',state.chapter===7?'Then help us write it.':'I still cannot decide whether he is helping.']],()=>{openHub()})}
function companionArc(person){const p=productionState(),current=p.companionArcs[person]||0,unlock=Math.min(4,Math.floor(state.chapter/2)+1);if(current>=4){openHub();const q=document.createElement('p');q.textContent=person+'’s camp arc is complete.';$('#hubDetails').append(q);return}if(current>=unlock){openHub();const q=document.createElement('p');q.textContent=person+' has nothing more to say yet. Continue the journey.';$('#hubDetails').append(q);return}const scene=COMPANION_ARCS[person][current];story([scene],()=>{p.companionArcs[person]=current+1;if(current+1===4){award(person+' · Camp Arc Complete');state.maxmp[person]+=2;state.mp[person]=state.maxmp[person];milestone(person+' resolved a personal camp arc.')}write();openHub()})}
function townRestored(ch=state.chapter){const st=state.stages[ch]||{};return ch===0?!!st.willowTown?.completed:!!st.regionalTown?.ending}
function restorationCeremony(){const p=productionState(),key=String(state.chapter);if(!townRestored()){openHub();$('#hubDetails').innerHTML+='<p>Restore this region’s town before a ceremony can be held.</p>';return}if(p.ceremonies[key]){openHub();$('#hubDetails').innerHTML+='<p>The restoration ceremony has already been witnessed here.</p>';return}p.ceremonies[key]=true;state.gold+=40+state.chapter*8;for(const n of state.party){state.hp[n]=state.maxhp[n];state.mp[n]=state.maxmp[n]}milestone(CHAPTERS[state.chapter].name+' restoration ceremony');write();story([['TOWN CRIER','🏮',RESTORATION_CEREMONIES[state.chapter]],['MIRA','✨','A ceremony cannot restore the past. It can decide what people carry forward.'],['BRAM','🛡️','And apparently it can include free food.']],()=>openHub())}
function startTownRescue(){const p=productionState(),key=String(state.chapter),r=RESCUE_ENCOUNTERS[state.chapter];if(p.rescues[key]){openHub();$('#hubDetails').innerHTML+='<p>The regional rescue has already been completed.</p>';return}fight(r[0],false);if(battle){battle.rescue=true;battle.rescueChapter=state.chapter;battleMsg('TOWN RESCUE · '+r[1])}}
function timedTownEvent(){const p=productionState(),key=String(state.chapter);let e=p.timedEvents[key];if(e?.done){openHub();$('#hubDetails').innerHTML+=`<p>${TIMED_EVENT_NAMES[state.chapter]} completed${e.quick?' with the quick-response bonus.':'.'}</p>`;return}if(!townRestored()){openHub();$('#hubDetails').innerHTML+='<p>Restore the local town before its community relay becomes available.</p>';return}if(!e){e=p.timedEvents[key]={start:state.activeSeconds||0,sites:[],done:false};write();openHub();$('#hubDetails').innerHTML+=`<p>${TIMED_EVENT_NAMES[state.chapter]} started. Visit three town landmarks. There is a small bonus for finishing within three active minutes, but the event never fails.</p>`;return}openHub();$('#hubDetails').innerHTML+=`<p>${TIMED_EVENT_NAMES[state.chapter]} is active · ${e.sites.length}/3 checkpoints. There is no failure timer.</p>`}
function presentationSettings(){const p=productionState();view('hub');const el=$('#hubDetails'),a=$('#hubActions');el.replaceChildren();a.replaceChildren();const h=document.createElement('h3');h.textContent='ART & AUDIO WORKSHOP';el.append(h);const info=document.createElement('p');info.textContent='Procedural 16-bit sprites, regional tile palettes, animated walk frames, and layered chiptune motifs are active in this edition.';el.append(info);const fx=document.createElement('button');fx.textContent='PIXEL MOTION · '+(p.visualFx?'ON':'OFF');fx.onclick=()=>{p.visualFx=!p.visualFx;write();update();presentationSettings()};const mix=document.createElement('button');mix.textContent='MUSIC MIX · '+String(p.audioMix||'layered').toUpperCase();mix.onclick=()=>{p.audioMix=p.audioMix==='layered'?'simple':'layered';write();update();presentationSettings()};const back=document.createElement('button');back.textContent='RETURN TO CHRONICLE';back.onclick=openHub;a.append(fx,mix,back)}
function timedLandmarkCheckpoint(room){const p=productionState(),e=p.timedEvents[String(state.chapter)];if(!e||e.done)return '';e.sites=e.sites||[];if(!e.sites.includes(room))e.sites.push(room);if(e.sites.length>=3){const elapsed=Math.max(0,(state.activeSeconds||0)-e.start);e.done=true;e.quick=elapsed<=180;state.gold+=e.quick?70:40;state.potions+=1;milestone(TIMED_EVENT_NAMES[state.chapter]+' completed'+(e.quick?' quickly':''));write();return ` ${TIMED_EVENT_NAMES[state.chapter]} complete${e.quick?' — quick-response bonus!':''}`;}write();return ` ${TIMED_EVENT_NAMES[state.chapter]} checkpoint ${e.sites.length}/3.`}
// Chapter-specific dramatic beats and optional party conversations.
const CHAPTER_BEATS=[
 {warning:'The Archivore gathers the names of everyone in Willowmere.',phase:'The catalog burns. Unwritten letters shield the creature.',camp:['Scott: I thought a lost word was only an inconvenience.','Mira: A lost name is a person the world might stop recognizing.','Bram: Then we make sure nobody is forgotten.']},
 {warning:'A pale reflection speaks with your voice before you open your mouth.',phase:'The Nameless King splits the battlefield into false reflections.',camp:['Mira: I saw myself standing on the other side of the glass.','Scott: Did she seem friendly?','Bram: She was holding a sword. Draw your own conclusions.']},
 {warning:'The forge counts each heartbeat like a hammer against iron.',phase:'The furnace flares; molten runes circle the enemy.',camp:['Bram: A smith must know when to strike and when to let metal cool.','Scott: You sound unusually thoughtful.','Mira: Enjoy it. It never lasts.']},
 {warning:'Every stone in the drowned keep whispers a different oath.',phase:'The ruined throne rises from the flood, drawing power from the past.',camp:['Scott: Who ruled this place before the water came?','Bram: Someone who believed walls would last forever.','Mira: Words outlast walls. At least, they used to.']},
 {warning:'The stars on the ceiling begin to blink out one by one.',phase:'The heavens invert; gravity and memory pull in opposite directions.',camp:['Mira: Three constellations have vanished since we arrived.','Bram: Perhaps it is cloudy.','Scott: We are underground, Bram.']},
 {warning:'Your footsteps ring beneath an empty sky.',phase:'A gale tears the boss apart and reforms it in a storm of syllables.',camp:['Scott: Do you ever wonder what we would be without the Lexicon?','Mira: Unnamed, perhaps. Not meaningless.','Bram: Still hungry. Some things never change.']},
 {warning:'Even the shadows forget what cast them.',phase:'The hollow cold strips a layer of protection from the party.',camp:['Bram: I remember someone we have never met.','Mira: Maybe the world remembers through you.','Scott: Then listen carefully.']},
 {warning:'The First Library opens its final unwritten page.',phase:'The Eraser abandons its disguise. Every restored word shines around you.',camp:['Mira: We have brought the names this far.','Bram: Whatever waits, it does not face you alone.','Scott: Then let us write the ending together.']}
];
function showCamp(){
 const lines=CHAPTER_BEATS[state.chapter].camp;
 const speaker=['SCOTT','MIRA','BRAM'],portrait=['⚔️','🔮','🛡️'];
 story(lines.map((line,i)=>[speaker[i],portrait[i],line.replace(/^[^:]+:\s*/, '')]),()=>{
   state.campVisits=state.campVisits||{};state.campVisits[state.chapter]=(state.campVisits[state.chapter]||0)+1;
   if(state.campVisits[state.chapter]===1){state.mp.Scott=Math.min(state.maxmp.Scott,state.mp.Scott+3);say('The party grows closer. Scott recovers 3 MP.')}write();
 });
}
function loreChronicle(){
 const collected=state.relics||[];
 const st=stage(), beat=CHAPTER_BEATS[state.chapter];
 const body=document.createElement('div');body.className='panel';
 const title=document.createElement('h3');title.textContent='THE BOOK OF NAMES';body.append(title);
 const txt=document.createElement('p');txt.textContent=CHAPTERS[state.chapter].intro;body.append(txt);
 const objective=document.createElement('p');objective.textContent='Current threat: '+beat.warning;body.append(objective);
 const progress=document.createElement('p');progress.textContent='Relics recovered: '+collected.length+' of 8 · Archive words restored here: '+(st.cross||[]).length;body.append(progress);
 const list=document.createElement('p');list.textContent=collected.length?collected.join(' • '):'No boss relics recovered yet.';body.append(list);
 const visits=document.createElement('p');visits.textContent='Camp conversations heard in this chapter: '+((state.campVisits||{})[state.chapter]||0);body.append(visits);
 if(state.chapter===0 && Array.isArray(state.lore) && state.lore.length){const notes=document.createElement('p');notes.textContent=heroText('Recovered Archive pages: '+state.lore.length+' · '+state.lore.map(x=>x.split(':')[0]).join(', '));body.append(notes)}$('#hubDetails').replaceChildren(body);
}
const RUIN_NAMES=['The Whispering Cellar','The Mirror Undercroft','Ashen Forge Tunnels','The Sunken Keep','Buried Observatory','The Windward Hold','The Fading Caverns','The Index Below'];
const RUIN_LORE=[
 ['Pell copied an erased name into the cellar wall.','Mira: The writing is older than Willowmere.','Bram: A lock remembers what a key does.'],
 ['Every mirror reflects a different hour.','Scott: I saw someone walking behind us.','Mira: No. You saw who used to walk here.'],
 ['Heat glows beneath cold cinders.','Bram: That forge has no fuel.','Mira: The missing word is burning instead.'],
 ['Floodwater conceals the royal crest.','Bram: I guarded this kingdom once.','Scott: Then why are its banners blank?'],
 ['Dust covers an astronomical dial.','Mira: The stars are rearranging.','Bram: I preferred them where they were.'],
 ['Wind rattles an ancient skylock.','Scott: The floor moves with the clouds.','Mira: That is what worries me.'],
 ['The stone flickers at the edge of vision.','Bram: Count the doors while they exist.','Scott: We will remember the route.'],
 ['The oldest page is still being written.','Mira: Someone began this long ago.','Scott: Then we can end it.']
];
const RUIN_ROUTES=[
 [
 ['#########','#.......#','#.###...#','#...S...#','#.###.#.#','#.......#','#.##.##.#','#......G#','#########'],
 ['#########','#.......#','#.#####.#','#...L...#','#.#.###.#','#...K...#','#.#####.#','#......G#','#########'],
 ['#########','#.......#','#.###.#.#','#...P...#','#.###.#.#','#.......#','#.###.#.#','#......G#','#########'],
 ['#########','#..T....#','#.###.#.#','#...H...#','#.###.#.#','#.......#','#.#####.#','#......G#','#########'],
 ['#########','#.......#','#.###.#.#','#...F...#','#.###.#.#','#.......#','#.......#','#......G#','#########']
 ],
 [
 ['#########','#.......#','#.#.###.#','#...S...#','#.#.###.#','#.......#','#.##.##.#','#......G#','#########'],
 ['#########','#.......#','#.#.###.#','#...L...#','#.###.#.#','#...K...#','#.#.###.#','#......G#','#########'],
 ['#########','#.......#','#.###.#.#','#..P....#','#.#.###.#','#.......#','#.###.#.#','#......G#','#########'],
 ['#########','#.......#','#..T..#.#','#.###.#.#','#...H...#','#.###.#.#','#.......#','#......G#','#########'],
 ['#########','#.......#','#.###.#.#','#...F...#','#.###.#.#','#.......#','#.###.#.#','#......G#','#########']
 ]
];


// Chapters II-VIII: individually staged six-chamber ruins. Each chamber keeps a
// traversable south aisle while north alcoves hold different interactions.
const REGIONAL_DUNGEONS=[
 null,
 {name:'The Shattered Mirror Court',roomNames:['Hall of Unclaimed Faces','The Split Reflection','The Tarnished Gallery','The Faceless Tribunal','The Mirror of Names','The Remembering Door'],
  scenes:['A mirror shows a stranger standing where Scott should be.','Silver filings trace a lever hidden behind reversed writing.','An iron gate reflects a corridor that does not exist.','The court demands proof that a reflection and a person are not the same.','A name broken into two parts hangs in the glass.','Mayor Elian’s childhood name shines behind the last door.'],
  echoes:[['REFLECTION','An image returned by a mirror'],['IDENTITY','Who a person is, beyond their appearance']],reward:'Shard of Self'},
 {name:'The Emberpeak Crucible',roomNames:['Cold Bellows','The Tongs and Hammer','Molten Aqueduct','The Tempering Trial','The Ember Heart','Cinder Treasury'],
  scenes:['The furnace is cold, but its shadow still burns.','Bram finds a lever fashioned from a blacksmith’s tongs.','The cooling channels block the way to the inner forge.','The anvil speaks only when the correct materials are named.','A half-made sword remembers the fire that shaped it.','The first smith’s oath is stamped upon a steel leaf.'],
  echoes:[['TEMPER','To strengthen metal through carefully controlled heating'],['KINDLE','To start or ignite a fire']],reward:'Tempered Lexicon Blade'},
 {name:'Valewyn Sunken Keep',roomNames:['Drowned Courtyard','Hall of Empty Banners','The Sluice Gate','Court of Witnesses','The Broken Coronation','Oathkeeper Vault'],
  scenes:['Water rises over a crest no historian recognizes.','A torn banner is tied to the old lever.','The sluice gate groans above the royal chamber.','Voices disagree about an oath sworn centuries ago.','A crown sinks whenever anyone claims to be its owner.','A tablet records a promise made to the people, not the throne.'],
  echoes:[['OATH','A solemn promise'],['LOYALTY','Faithful support or allegiance']],reward:'Witness Seal'},
 {name:'The Desert Star Observatory',roomNames:['Buried Sundial','Hall of Shifting Sand','The Astral Lock','The Wind Testament','The Last Constellation','The Prophecy Lens'],
  scenes:['A sundial casts a shadow even underground.','The lever is buried beneath sand flowing upward.','A stone door rotates to follow a star that has vanished.','Wind speaks an answer before anyone asks a question.','The night sky contains an empty shape where a star belonged.','A lens records a future that has yet to be written.'],
  echoes:[['CONSTELLATION','A recognized pattern of stars'],['HORIZON','The apparent line where earth and sky meet']],reward:'Star Chart Fragment'},
 {name:'The Windward Skyhold',roomNames:['The Hanging Dock','Compass Engine','The Suspended Causeway','The Wind Trial','Lost Navigation Room','Sky Charter Vault'],
  scenes:['The skyhold sways in a wind that has no source.','Copper vanes bend toward a lever beneath the deck.','An air bridge exists only when its destination is remembered.','Four winds carry incomplete sentences around a bell.','The captain’s maps point toward a city the crew forgot.','The original flight charter is folded inside a crystal box.'],
  echoes:[['CURRENT','A flow of water or air'],['NAVIGATE','To plan and direct a route']],reward:'First Flight Charter'},
 {name:'The Fading North Catacombs',roomNames:['The Unseen Stair','Chamber of Footprints','The Disappearing Gate','The Last Hearth','The Boundary of Being','The Witness Stone'],
  scenes:['The staircase briefly vanishes beneath the party.','Footprints remain where their owners no longer exist.','A gate disappears whenever the party looks away.','An empty home still feels warm and inhabited.','The cold erases the edge between stone and nothingness.','A witness carved names into stone until the stone forgot him.'],
  echoes:[['EXISTENCE','The state of being real'],['REMEMBER','To bring something back into the mind']],reward:'Witness of the North'},
 {name:'The First Library — Root Index',roomNames:['Hall of First Letters','The Original Quill','The Unwritten Lock','Pages of Mercy','The Choice of Names','The Living Index'],
  scenes:['Here the first letters of every living name hover in the air.','A writing tool moves without hand or ink.','The lock has no key; only a meaning can open it.','A torn page asks whether forgetting can ever be kindness.','Scott must decide whether a painful memory is worth preserving.','The original index contains a blank page reserved for the future.'],
  echoes:[['CHOICE','An act of deciding between alternatives'],['FREEDOM','The condition of being able to act or choose']],reward:'Leaf of the First Lexicon'}
];
const REGIONAL_ROOM_PATTERNS=[
 ['#########','#..C....#','#.##.##.#','#...N...#','#.###.#.#','#.......#','#.#.###.#','#......G#','#########'],
 ['#########','#..S....#','#.#.#.#.#','#...L...#','#.###.#.#','#.......#','#.#.###.#','#......G#','#########'],
 ['#########','#..R....#','#.#.##..#','#...K...#','#.##.#..#','#.......#','#.#.###.#','#......G#','#########'],
 ['#########','#...P...#','#..#.#..#','#...Y...#','#.##.##.#','#.......#','#.##.#..#','#......G#','#########'],
 ['#########','#..N....#','#.###.#.#','#...H...#','#.#.###.#','#.......#','#.#.###.#','#......G#','#########'],
 ['#########','#...C...#','#..#.#..#','#...F...#','#.##.##.#','#.......#','#.#.###.#','#......G#','#########']
];
// Different wall placements, alcove orientations and objects per region.
const REGIONAL_ROUTES=REGIONAL_DUNGEONS.map((data,chapter)=>{
 if(!data)return null;
 return REGIONAL_ROOM_PATTERNS.map((base,room)=>base.map((line,y)=>{
  if(y===0||y===8||y===7)return line;
  let out=room===4?line.replace('N','Z'):line;
  if((chapter+room)%3===0&&y===2)out=out.slice(0,5)+'.'+out.slice(6);
  if((chapter+room)%4===0&&y===4)out=out.slice(0,6)+'.'+out.slice(7);
  if(chapter%2===0&&y===1)out=out.replace('..C','C..').replace('..S','S..');
  return out;
 }));
});
// Distinct interactive regional trials, designed for touch screens and save compatibility.
const SIGNATURE_TRIALS={
 1:{name:'THE MIRROR OF SELF',story:'The mirror can only reveal the true path when its fragments are seen from the other side.',kind:'mirror',
   challenge:'Read the mirrored inscription and enter the original word.',answer:'IDENTITY',mirror:'YTITNEDI',hint:'The word means who a person truly is.'},
 2:{name:'EMBERPEAK TEMPERING',story:'The sword blank needs the right heat and cooling rhythm. Overheating destroys its remembered name.',kind:'forge',
   challenge:'Set the furnace to 600 degrees, then choose WATER to temper the blade.',heat:600,choice:'WATER',hint:'A controlled medium heat followed by a quick water quench.'},
 3:{name:'THE SUNKEN SLUICE',story:'Three sluice valves control the rising water. Flow must be led away from the old crown.',kind:'sluice',
   challenge:'Open the EAST and SOUTH valves, but keep NORTH closed.',answer:'011',hint:'North is sealed; the other two channels must drain.'},
 4:{name:'THE STAR OBSERVATORY',story:'Stars once guided a road which maps no longer remember.',kind:'stars',
   challenge:'Align the lens to WEST, where the vanished constellation first appeared.',answer:'WEST',hint:'The sunset points the way.'},
 5:{name:'THE SKYHOLD WIND BRIDGE',story:'A suspended causeway swings between directions as the wind changes.',kind:'wind',
   challenge:'Set the sails to EAST, NORTH, EAST to stabilize the bridge.',answer:'EAST,NORTH,EAST',hint:'Start toward sunrise, turn toward the pole star, then return toward sunrise.'},
 6:{name:'THE VANISHING FOOTSTEPS',story:'Only paths remembered by witnesses remain solid underfoot.',kind:'north',
   challenge:'Choose the sequence of surviving footprints: 2, 4, 1.',answer:'2,4,1',hint:'The middle path, then the far right, then the leftmost.'},
 7:{name:'THE FIRST LIBRARY CHOICE',story:'The First Lexicon asks whether an unhappy memory should be erased or preserved.',kind:'library',
   challenge:'The oath is to preserve truth, even when it hurts. Select REMEMBER.',answer:'REMEMBER',hint:'Saving the world means keeping its history.'}
};
function signatureProgress(){const rs=ruinState();if(!rs.signature||typeof rs.signature!=='object')rs.signature={};return rs.signature}
function openSignatureTrial(){
 const info=SIGNATURE_TRIALS[state.chapter];if(!info)return;
 const progress=signatureProgress();let box=document.getElementById('signatureTrial');
 if(!box){
   box=document.createElement('section');box.id='signatureTrial';box.className='panel signature-trial';
   $('#ruins').appendChild(box);
 }
 function makeButton(label,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',handler);return b}
 box.replaceChildren();box.hidden=false;
 const h=document.createElement('h3');h.className='gold';h.textContent=info.name;box.appendChild(h);
 const narrative=document.createElement('p');narrative.textContent=info.story;box.appendChild(narrative);
 const task=document.createElement('p');task.textContent=info.challenge;box.appendChild(task);
 const feedback=document.createElement('p');feedback.className='gold';feedback.setAttribute('aria-live','polite');box.appendChild(feedback);
 const controls=document.createElement('div');controls.className='signature-controls';box.appendChild(controls);
 const fail=()=>{progress.misses=(progress.misses||0)+1;feedback.textContent='Not yet. Hint: '+info.hint;write()};
 const done=()=>{progress.complete=true;progress.misses=0;state.gold+=65+state.chapter*10;
   state.lore=state.lore||[];if(!state.lore.includes(info.name+' solved'))state.lore.push(info.name+' solved');
   box.hidden=true;ruinSay(info.name+' restored! Received gold and the next door is open.');drawRuin();write()};
 if(info.kind==='mirror'){
   const cue=document.createElement('div');cue.className='signature-visual';cue.textContent='◀ '+info.mirror+' ▶';controls.appendChild(cue);
   const input=document.createElement('input');input.autocomplete='off';input.placeholder='ORIGINAL WORD';input.setAttribute('aria-label','Unmirrored word');controls.appendChild(input);
   controls.appendChild(makeButton('RESTORE',()=>input.value.trim().toUpperCase()===info.answer?done():fail()));
 }else if(info.kind==='forge'){
   const temp=document.createElement('label');temp.textContent='Furnace temperature: 400°';
   const slider=document.createElement('input');slider.type='range';slider.min='200';slider.max='1000';slider.step='100';slider.value='400';slider.setAttribute('aria-label','Furnace temperature');
   slider.addEventListener('input',()=>temp.textContent='Furnace temperature: '+slider.value+'°');controls.append(temp,slider);
   ['WATER','OIL','AIR'].forEach(v=>controls.appendChild(makeButton('QUENCH: '+v,()=>Number(slider.value)===info.heat&&v===info.choice?done():fail())));
 }else if(info.kind==='sluice'){
   const vals=[false,false,false];const display=document.createElement('p');display.className='signature-visual';controls.appendChild(display);
   function upd(){display.textContent=['NORTH','EAST','SOUTH'].map((n,i)=>n+': '+(vals[i]?'OPEN':'CLOSED')).join(' · ')}upd();
   ['NORTH','EAST','SOUTH'].forEach((n,i)=>controls.appendChild(makeButton('TOGGLE '+n,()=>{vals[i]=!vals[i];upd()})));
   controls.appendChild(makeButton('ENGAGE SLUICE',()=>vals.map(v=>v?'1':'0').join('')===info.answer?done():fail()));
 }else if(info.kind==='stars'){
   const dirs=['NORTH','EAST','SOUTH','WEST'];let i=0;const display=document.createElement('p');display.className='signature-visual';controls.appendChild(display);
   function upd(){display.textContent='✦ LENS POINTS '+dirs[i]}upd();
   controls.appendChild(makeButton('ROTATE ◀',()=>{i=(i+3)%4;upd()}));controls.appendChild(makeButton('ROTATE ▶',()=>{i=(i+1)%4;upd()}));
   controls.appendChild(makeButton('ALIGN STAR',()=>dirs[i]===info.answer?done():fail()));
 }else if(info.kind==='wind'||info.kind==='north'){
   let picks=[];const display=document.createElement('p');display.className='signature-visual';controls.appendChild(display);
   function upd(){display.textContent='PATH: '+(picks.join(' → ')||'—')}upd();
   const options=info.kind==='wind'?['NORTH','EAST','SOUTH','WEST']:['1','2','3','4'];
   options.forEach(v=>controls.appendChild(makeButton(v,()=>{if(picks.length<3){picks.push(v);upd()}})));
   controls.appendChild(makeButton('RESET',()=>{picks=[];upd()}));
   controls.appendChild(makeButton('CONFIRM PATH',()=>picks.join(',')===info.answer?done():fail()));
 }else if(info.kind==='library'){
   ['REMEMBER','ERASE'].forEach(v=>controls.appendChild(makeButton(v,()=>v===info.answer?done():fail())));
 }
 const close=makeButton('RETURN TO DUNGEON',()=>box.hidden=true);box.appendChild(close);
}

let echoOverlay=null;
function echoState(){const rs=ruinState();rs.echoes=Array.isArray(rs.echoes)?rs.echoes:[];rs.echoMistakes=Number(rs.echoMistakes)||0;return rs}
function openRegionalEcho(){
 const data=REGIONAL_DUNGEONS[state.chapter];if(!data)return;
 const rs=echoState();let box=document.getElementById('regionalEcho');
 if(!box){
  box=document.createElement('section');box.id='regionalEcho';box.className='panel';
  box.innerHTML='<h3 class="gold">REGIONAL MEMORY TRIAL</h3><p id="regionalEchoStory"></p><p id="regionalEchoClue"></p><form id="regionalEchoForm" class="row"><input id="regionalEchoInput" autocomplete="off" aria-label="Restore missing word" placeholder="ANSWER" style="flex:1;min-width:0"><button type="submit">RESTORE</button></form><p id="regionalEchoHint" class="gold" aria-live="polite"></p><button id="regionalEchoClose" type="button">RETURN TO DUNGEON</button>';
  $('#ruins').append(box);
  box.querySelector('#regionalEchoClose').onclick=()=>{box.hidden=true};
  box.querySelector('#regionalEchoForm').onsubmit=e=>{
   e.preventDefault();const info=REGIONAL_DUNGEONS[state.chapter],progress=echoState(),step=progress.echoes.length;
   if(step>=info.echoes.length){box.hidden=true;return}
   const [answer]=info.echoes[step],value=box.querySelector('#regionalEchoInput').value.trim().toUpperCase();
   if(value===answer){
    progress.echoes.push(answer);progress.echoMistakes=0;
    state.lore=state.lore||[];state.lore.push(info.name+': restored '+answer);
    if(progress.echoes.length===info.echoes.length){
     state.gold+=80+state.chapter*15;state.ethers+=1;progress.echoComplete=true;
     ruinSay(info.reward+' recovered! Earned an Ether and gold.');box.hidden=true;drawRuin();write();return;
    }
    drawRegionalEcho(box);write();return;
   }
   progress.echoMistakes++;
   const n=progress.echoMistakes;
   box.querySelector('#regionalEchoHint').textContent=n===1?'Hint: first letter '+answer[0]:n===2?'Pattern: '+answer[0]+'_'.repeat(Math.max(0,answer.length-2))+answer.at(-1):'Strong hint: '+answer.slice(0,Math.ceil(answer.length*.65))+'…';
  };
 }
 box.hidden=false;drawRegionalEcho(box);
}
function drawRegionalEcho(box){
 const d=REGIONAL_DUNGEONS[state.chapter],rs=echoState(),step=rs.echoes.length;
 box.querySelector('#regionalEchoStory').textContent=d.roomNames[3]+' · Memory '+(step+1)+' of '+d.echoes.length;
 box.querySelector('#regionalEchoClue').textContent=d.echoes[step]?.[1]||'All words restored.';
 box.querySelector('#regionalEchoHint').textContent='';box.querySelector('#regionalEchoInput').value='';box.querySelector('#regionalEchoInput').focus();
}

// Chapter I benchmark dungeon: seven bespoke chambers with distinct pacing,
// investigation clues, a branching archive mechanism, and a final reliquary.
const FIRST_ARCHIVE_ROOMS=[
 ['#########','#...C...#','#.###.#.#','#...N...#','#.###.#.#','#.......#','#.##.##.#','#......G#','#########'],
 ['#########','#.P.....#','#.###.#.#','#...S...#','#.#.#.#.#','#...L...#','#.#.###.#','#......G#','#########'],
 ['#########','#......T#','#.#####.#','#..K....#','#.###.#.#','#...R...#','#.#.###.#','#......G#','#########'],
 ['#########','#..C....#','#.#.###.#','#...P...#','#.#.###.#','#.......#','#.##.##.#','#......G#','#########'],
 ['#########','#...H...#','#.###.#.#','#.......#','#.#.###.#','#...N...#','#.##.##.#','#......G#','#########'],
 ['#########','#..T....#','#.#.###.#','#...L...#','#.#.#.#.#','#.....R.#','#.##.##.#','#......G#','#########'],
 ['#########','#.......#','#.###.#.#','#...F...#','#.###.#.#','#...C...#','#.##.##.#','#......G#','#########']
];
const FIRST_ARCHIVE_SCENES=[
 'THE MISSING CATALOG · Pages litter the marble floor. A childlike handwriting reads: “If my name vanishes, will I still be here?”',
 'THE SCRIBE’S WORKSHOP · Quills scratch across empty parchment by themselves. A brass lever holds the inner gate.',
 'THE RESONANCE HALL · An iron door cuts through the stacks. The letters on its hinges match the lever behind you.',
 'THE CROSSING CHAMBER · Across and Down inscriptions converge on a living seal. Broken words can be restored.',
 'THE MEMORY CHAPEL · Someone has laid flowers for a person no one can remember. An ancient healing plate still glows.',
 'THE INDEX OF THE LOST · A hidden margin describes a collector that feeds on names. Two mechanisms guard the last room.',
 'THE RELIQUARY · A list of stolen names is etched into the last stone. One entry is still fresh: WILLOWMERE.'
];
const RUIN_SIGILS=[['ARCHIVE','A collection of old records'],['MIRROR','A reflective surface'],['EMBER','A glowing remnant of a fire'],['THRONE','A royal ceremonial seat'],['COMPASS','A device indicating direction'],['BEACON','A guiding signal light'],['MEMORY','What the mind retains'],['SCRIPT','Written text']];
let ruin=null;

// Chapter I: the chapel is a scene rather than a free healing tile.
// Answers are intentionally familiar vocabulary; the narrative is the reward.
const CHAPEL_MEMORIES=[
 {answer:'MOTHER',clue:'A parent whose name the child in the catalog tried to remember.',line:"A child's handwriting reappears: “She always read to me at bedtime.”"},
 {answer:'PROMISE',clue:'A commitment one person makes to another.',line:'Beneath the flowers: “I promised I would remember, even when the town forgot.”'},
 {answer:'HOME',clue:'The place where you belong, not merely where you sleep.',line:'The chapel windows brighten. “A name can vanish. Love does not.”'}
];
function chapelProgress(){const rs=ruinState();if(!Array.isArray(rs.memories))rs.memories=[];rs.memoryMistakes=rs.memoryMistakes||0;return rs}
function chapelOverlay(){
 const rs=chapelProgress();
 let box=document.getElementById('memoryChapel');
 if(!box){
  box=document.createElement('div');box.id='memoryChapel';box.className='panel';
  box.style.marginTop='10px';
  box.innerHTML='<strong class="gold">THE MEMORY CHAPEL · THREE ECHOES</strong><p id="memoryStory" class="muted"></p><p id="memoryClue"></p><form id="memoryForm" class="row"><input id="memoryInput" style="flex:1;min-width:0" autocomplete="off" placeholder="RESTORE A WORD" aria-label="Memory answer"><button type="submit">REMEMBER</button></form><p id="memoryHint" class="gold" aria-live="polite"></p><button id="memoryClose" type="button">RETURN TO CHAPEL</button>';
  $('#ruins').appendChild(box);
  box.querySelector('#memoryClose').onclick=()=>{box.hidden=true};
  box.querySelector('#memoryForm').onsubmit=e=>{
   e.preventDefault();const progress=chapelProgress(),step=progress.memories.length;
   if(step>=CHAPEL_MEMORIES.length){box.hidden=true;return}
   const data=CHAPEL_MEMORIES[step],value=box.querySelector('#memoryInput').value.trim().toUpperCase();
   if(value===data.answer){
     progress.memories.push(data.answer);progress.memoryMistakes=0;
     state.lore=state.lore||[];
     state.lore.push('Memory Chapel: '+data.line);
     if(progress.memories.length===CHAPEL_MEMORIES.length){
      progress.plate=true;for(const member of state.party){state.hp[member]=state.maxhp[member];state.mp[member]=state.maxmp[member]}
      state.gold+=75;award('Keeper of Memories');
      ruinSay('Three names restored. The entire party recovers HP and MP; 75G found beneath the memorial.');
      box.hidden=true;drawRuin();write();return;
     }
     box.querySelector('#memoryHint').textContent=data.line;write();renderMemoryChapel(box);return;
   }
   progress.memoryMistakes++;const n=progress.memoryMistakes;
   box.querySelector('#memoryHint').textContent='Hint: '+(n===1?'Starts with '+data.answer[0]+'.':n===2?data.answer[0]+'_'.repeat(data.answer.length-2)+data.answer.at(-1):data.answer.slice(0,Math.ceil(data.answer.length*.7))+'…');
   box.querySelector('#memoryInput').select();
  };
 }
 box.hidden=false;renderMemoryChapel(box);
}
function renderMemoryChapel(box){
 const rs=chapelProgress(),step=rs.memories.length;
 box.querySelector('#memoryStory').textContent='Echo '+(step+1)+' of '+CHAPEL_MEMORIES.length+'. Flowers lie beneath a portrait whose face has faded. The words you restore will remain in the Book of Names.';
 box.querySelector('#memoryClue').textContent=CHAPEL_MEMORIES[step]?.clue||'All memories restored.';
 box.querySelector('#memoryInput').value='';box.querySelector('#memoryInput').focus();
}
function ruinState(){const st=stage();const rs=st.ruins||(st.ruins={room:0,opened:[],switch:false,completed:false});rs.opened=Array.isArray(rs.opened)?rs.opened:[];rs.room=Math.max(0,Math.min(state.chapter===0?6:5,Number(rs.room)||0));rs.sigil=!!rs.sigil;rs.plate=!!rs.plate;return rs}
function ruinRooms(){return state.chapter===0?FIRST_ARCHIVE_ROOMS:REGIONAL_ROUTES[state.chapter]}
function enterRuins(){const rs=ruinState();ruin={room:rs.completed?0:rs.room,x:1,y:7,steps:0};view('ruins');drawRuin();ruinSay('Explore the chambers. Investigate the records, solve the mechanisms, and claim the final relic.');}
// Spatial chapter mechanisms. Room 3's approach becomes a traversable environment puzzle.
// These states live in the existing per-chapter ruins save record.
const PHYSICAL_MECHANICS={
 1:{title:'THE LOOKING-GLASS CAUSEWAY',kind:'mirror',help:'The real bridge follows its reflection. Rotate the mirror until the illuminated path crosses the chasm.',label:'MIRROR ORIENTATION',states:['Reflection faces WEST','Reflection faces NORTH','Reflection faces EAST','Reflection faces SOUTH'],correct:2},
 3:{title:'THE SUNKEN KEEP PUMPHOUSE',kind:'water',help:'The sluice is flooded. Lower the water twice to expose its submerged stones.',label:'WATER LEVEL',states:['HIGH · submerged','MID · stones visible','LOW · safe crossing'],correct:2},
 5:{title:'THE WINDWARD ROTUNDA',kind:'rotation',help:'Turn the room until the bridge joins the east passage. The north and south doors are decoys.',label:'ROOM ALIGNMENT',states:['NORTH · bridge misaligned','EAST · exit linked','SOUTH · bridge misaligned','WEST · bridge misaligned'],correct:1}
};
function physicalState(){
 const rs=ruinState();if(!rs.physical||typeof rs.physical!=='object')rs.physical={};
 const p=rs.physical;if(!Number.isFinite(p.setting))p.setting=0;
 p.setting=Math.max(0,Math.min(3,Math.trunc(p.setting)));
 return p;
}
function physicalMechanic(){return state.chapter>0&&ruin&&ruin.room===2?PHYSICAL_MECHANICS[state.chapter]:null}
function physicalReady(){const info=physicalMechanic();return !info||physicalState().setting===info.correct}
function physicalTile(x,y){
 const info=physicalMechanic();if(!info)return null;
 if(y===7&&x===3)return 'O'; // Interactable mechanism reachable from entrance
 if(x===4&&y>=1&&y<=7){
  const original=ruinRooms()[ruin.room]?.[y]?.[x]||'#';
  return original==='#'?'#':physicalReady()?'=':'B';
 } // Chasm runs from north wall to south wall; no detour around the bridge
 return null;
}
function openPhysical(){
 const info=physicalMechanic();if(!info)return;
 let box=document.getElementById('physicalMechanism');
 if(!box){
  box=document.createElement('section');box.id='physicalMechanism';box.className='panel physical-mechanism';
  box.innerHTML='<strong id="physicalTitle"></strong><p id="physicalHelp"></p><div class="physical-display" id="physicalDisplay" aria-live="polite"></div><div class="physical-actions"><button type="button" id="physicalBack">◀ TURN / LOWER</button><button type="button" id="physicalNext">TURN / ADJUST ▶</button></div><p id="physicalFeedback" aria-live="polite"></p><button type="button" id="physicalClose">RETURN TO ROOM</button>';
  $('#ruins').appendChild(box);
  box.querySelector('#physicalBack').onclick=()=>adjustPhysical(-1);
  box.querySelector('#physicalNext').onclick=()=>adjustPhysical(1);
  box.querySelector('#physicalClose').onclick=()=>{box.hidden=true;drawRuin()};
 }
 box.hidden=false;box.querySelector('#physicalTitle').textContent=info.title;
 box.querySelector('#physicalHelp').textContent=info.help;
 showPhysical();
}
function showPhysical(){
 const box=document.getElementById('physicalMechanism'),info=physicalMechanic();if(!box||!info)return;
 const setting=physicalState().setting;
 box.querySelector('#physicalDisplay').textContent=info.label+': '+info.states[setting];
 box.querySelector('#physicalFeedback').textContent=physicalReady()?'The stones form a safe bridge. Walk EAST through the passage.':'The east crossing is blocked. Adjust the mechanism.';
 box.querySelector('#physicalBack').textContent=info.kind==='water'?'RAISE WATER':'ROTATE LEFT';
 box.querySelector('#physicalNext').textContent=info.kind==='water'?'LOWER WATER':'ROTATE RIGHT';
 box.querySelector('#physicalBack').disabled=info.kind==='water'&&setting===0;
 box.querySelector('#physicalNext').disabled=info.kind==='water'&&setting===2;
}
function adjustPhysical(delta){
 const info=physicalMechanic();if(!info)return;
 const p=physicalState();p.setting=info.kind==='water'?Math.max(0,Math.min(2,p.setting+delta)):(p.setting+delta+4)%4;
 p.touched=true;p.solved=p.solved||physicalReady();
 showPhysical();drawRuin();write();
}

// Dungeon encounter positions and hazards are deterministic and save-aware.
// Each chapter has distinct environmental effects and a unique treasure relic.
const DUNGEON_FEATURES=[
 {hazard:'Ink spill',damage:3,relic:'Catalog Keeper Charm',enemy:'INK WRAITH'},
 {hazard:'Shattered reflection',damage:3,relic:'Silver Reflection Pin',enemy:'GLASS SHADE'},
 {hazard:'Burning cinders',damage:5,relic:'Crucible Ember',enemy:'CINDER GOLEM'},
 {hazard:'Deep water',damage:3,relic:'Royal Floodgate Crest',enemy:'DROWNED GUARD'},
 {hazard:'Scouring sand',damage:4,relic:'Astral Compass',enemy:'DUNE SENTINEL'},
 {hazard:'Gale blast',damage:4,relic:'Windward Feather',enemy:'SKY WRAITH'},
 {hazard:'Fading frost',damage:5,relic:'Witness Crystal',enemy:'HOLLOW SPECTER'},
 {hazard:'Erasure field',damage:6,relic:'First Letter Pendant',enemy:'INDEX KEEPER'}
];
let ruinBattleOrigin=null;
function dungeonFeatures(){return DUNGEON_FEATURES[state.chapter]}
function patrolId(){return state.chapter+':'+ruin.room}
function patrolPosition(){
 if(ruin.room===0||ruin.room===ruinRooms().length-1)return null;
 // One stationary guardian per intermediate chamber. Off the southern aisle.
 const points=[[6,3],[6,5],[7,5],[6,3],[7,4]];
 const q=points[(ruin.room-1)%points.length];
 return {x:q[0],y:q[1],id:patrolId()};
}
function patrolActive(){const pt=patrolPosition();return pt&&!ruinState().patrols?.[pt.id]?pt:null}
function hazardAt(x,y){
 if(ruin.room===0||ruin.room===ruinRooms().length-1)return false;
 return x===2&&y===5&&ruinTile(x,y)!=='#';
}
function returnToRuin(message){
 ruinBattleOrigin=null;
 if(!ruin){view('world');draw();say(message);return}
 view('ruins');drawRuin();ruinSay(message);
}
function dungeonBattle(pt){
 ruinBattleOrigin={id:pt.id,room:ruin.room};
 fight(dungeonFeatures().enemy,false);
 battleMsg('A dungeon guardian protects this chamber! Defeat it for XP and a cleared route.');
}
function hiddenReward(){
 const rs=ruinState();rs.relicRewards=rs.relicRewards||{};
 const id=state.chapter+':'+ruin.room;
 if(rs.relicRewards[id]){ruinSay('This hidden cache has already been recovered.');return}
 rs.relicRewards[id]=true;
 const item=dungeonFeatures().relic;
 state.relics=state.relics||[];
 if(!state.relics.includes(item))state.relics.push(item);
 state.ethers+=1;
 ruinSay('SECRET DISCOVERY: '+item+' and an Ether. Added to the Book of Names.');
 award('Dungeon Explorer');write();drawRuin();
}

function ruinTile(x,y){return physicalTile(x,y)||ruinRooms()[ruin.room]?.[y]?.[x]||'#'}
function ruinKey(ch){return ruin.room+':'+ch}
function drawRuin(){
 if(!ruin||!state)return;
 const rs=ruinState(),room=ruinRooms()[ruin.room];
 $('#ruinTitle').textContent=RUIN_NAMES[state.chapter];$('#ruinRoom').textContent='ROOM '+(ruin.room+1)+'/'+ruinRooms().length;
 $('#ruinStory').textContent=heroText(state.chapter===0?FIRST_ARCHIVE_SCENES[ruin.room]:REGIONAL_DUNGEONS[state.chapter].roomNames[ruin.room]+' · '+REGIONAL_DUNGEONS[state.chapter].scenes[ruin.room]);
 const grid=$('#ruinGrid');grid.innerHTML='';grid.style.gridTemplateColumns='repeat(9,minmax(0,1fr))';
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){
  const ch=ruinTile(x,y),el=document.createElement('div');el.className='ruin-cell '+(ch==='#'?'wall':'floor');
  let ico=({'S':'🔑','L':'⚙️','K':'🚪','G':'🚪','T':'🎁','P':'🔤','H':'✨','F':'💠','C':'📜','N':'🕯️','R':'🔍','Y':'🪞','Z':'✨','O':'🎛️','B':'🌊','=':'🌉'})[ch]||'';
  if((ch==='S'||ch==='T'||ch==='F'||ch==='C'||ch==='N'||ch==='R')&&rs.opened.includes(ruinKey(ch)))ico='';
  if(ch==='L'&&rs.switch)ico='🔓';if(ch==='P'&&rs.sigil)ico='✅';if(ch==='H'&&rs.plate)ico='✅';if(ch==='Y'&&rs.echoComplete)ico='✅';if(ch==='Z'&&rs.signature?.complete)ico='✅';
  const patrol=patrolActive();if(patrol&&patrol.x===x&&patrol.y===y)ico='👁️';if(hazardAt(x,y))ico='⚠️';if(ruin.room>0&&ruin.room<ruinRooms().length-1&&x===7&&y===2)ico=ruinState().relicRewards?.[state.chapter+':'+ruin.room]?'':'✦';if(x===ruin.x&&y===ruin.y){ico='⚔️';el.classList.add('hero')}
  el.textContent=ico;grid.appendChild(el);
 }
}
function ruinMove(dx,dy){
 if(screen!=='ruins'||!ruin)return;
 const nx=ruin.x+dx,ny=ruin.y+dy,ch=ruinTile(nx,ny);
 if(ch==='#'){ruinSay('Stone blocks the passage.');return}
 if(ch==='B'){ruinSay('The passage is physically blocked. Operate the mechanism just to the WEST.');return}
 if(ch==='K'&&!ruinState().switch){ruinSay('The iron door is locked. Find the lever.');return}
 const patrol=patrolActive();if(patrol&&patrol.x===nx&&patrol.y===ny){dungeonBattle(patrol);return}
 ruin.x=nx;ruin.y=ny;ruin.steps++;if(hazardAt(nx,ny)){const target=state.party[(ruin.steps+state.chapter)%state.party.length];const loss=Math.max(1,Math.round(dungeonFeatures().damage*(equipmentStyle()==='warden'?.65:1)));state.hp[target]=Math.max(1,state.hp[target]-loss);ruinSay(dungeonFeatures().hazard+'! '+target+' loses '+loss+' HP.');}drawRuin();
 if(ch==='G'){ruinAdvance();return}
 if(ruin.room>0&&ruin.room<ruinRooms().length-1&&nx===7&&ny===2){hiddenReward();return}if('SLTPHFCNRYZO'.includes(ch))ruinAction();else if(!hazardAt(nx,ny))ruinSay('Your footsteps echo through the ancient stone.');
}
function ruinSay(t){$('#ruinMessage').textContent=heroText(t)}
function ruinAction(){
 if(!ruin||screen!=='ruins')return;
 const ch=ruinTile(ruin.x,ruin.y),rs=ruinState(),key=ruinKey(ch);
 if(ruin.room>0&&ruin.room<ruinRooms().length-1&&ruin.x===7&&ruin.y===2){hiddenReward();return}
 if(ch==='O'){openPhysical();return}
 if(ch==='Z'&&state.chapter>0&&!signatureProgress().complete){openSignatureTrial();return}
 if(ch==='Z'&&signatureProgress().complete){ruinSay('The regional mechanism has been restored.');return}
 if(ch==='Y'&&state.chapter>0&&!rs.echoComplete){openRegionalEcho();return}
 if(ch==='Y'&&rs.echoComplete){ruinSay('The memory trial has been restored.');return}
 if(ch==='S'&&!rs.opened.includes(key)){rs.opened.push(key);state.ethers++;ruinSay('A small rune key and an Ether lie beneath a loose stone.');write()}
 else if(ch==='L'){rs.switch=!rs.switch;ruinSay(rs.switch?'You pull the lever. An iron latch releases.':'The latch closes again.');write()}
 else if(ch==='K')ruinSay(rs.switch?'The door has been unlocked.':'The door is still locked.');
 else if(ch==='P'&&!rs.sigil){ruinSay('The sigil has forgotten one word. Press RESTORE below to solve it.');openRuinSigil();return}
 else if(ch==='H'&&!rs.plate){if(state.chapter===0){chapelOverlay();return}rs.plate=true;for(const p of state.party){state.hp[p]=Math.min(state.maxhp[p],state.hp[p]+15)}ruinSay('The memory plate glows. The party recovers 15 HP.');write()}
 else if(ch==='T'&&!rs.opened.includes(key)){rs.opened.push(key);state.gold+=75+state.chapter*20;state.potions+=2;ruinSay('Hidden cache: two Potions and precious coin!');write()}
 else if(ch==='C'&&!rs.opened.includes(key)){rs.opened.push(key);state.lore=state.lore||[];state.lore.push(state.chapter===0?'Archive fragment '+(ruin.room+1)+': '+FIRST_ARCHIVE_SCENES[ruin.room]:REGIONAL_DUNGEONS[state.chapter].name+': '+REGIONAL_DUNGEONS[state.chapter].scenes[ruin.room]);ruinSay('A unique page from this region enters the Book of Names.');write()}
 else if(ch==='N'&&!rs.opened.includes(key)){rs.opened.push(key);ruinSay(ruin.room===4?'Mira: “The flowers remain, even if the name is gone. Someone still cared.”':'Scott: “This place feels less like a library and more like a memorial.”');write()}
 else if(ch==='R'&&!rs.opened.includes(key)){rs.opened.push(key);state.gold+=30;ruinSay('Bram uncovers a hidden index and 30G behind a loose stone.');write()}
 else if(ch==='F'&&!rs.opened.includes(key)){rs.opened.push(key);state.ethers+=2;ruinSay('You recover two Ethers and a sealed fragment of the Lexicon.');write()}
 else ruinSay('You examine the stones. Old letters have been rubbed nearly smooth.');
 drawRuin();
}
function openRuinSigil(){
 const data=RUIN_SIGILS[state.chapter];
 let box=document.getElementById('ruinSigilBox');
 if(!box){
  box=document.createElement('div');box.id='ruinSigilBox';box.className='panel';
  box.innerHTML='<strong class="gold">RESTORE THE SIGIL</strong><p id="ruinSigilClue"></p><form id="ruinSigilForm" class="row"><input id="ruinSigilInput" style="flex:1;min-width:0" placeholder="ANSWER" autocomplete="off" aria-label="Sigil word"><button type="submit">RESTORE</button></form><p id="ruinSigilHint" class="gold" aria-live="polite"></p><button type="button" id="ruinSigilClose">BACK TO RUINS</button>';
  $('#ruins').appendChild(box);
  box.querySelector('#ruinSigilForm').onsubmit=e=>{
   e.preventDefault();
   const answer=box.querySelector('#ruinSigilInput').value.trim().toUpperCase();
   const word=RUIN_SIGILS[state.chapter][0],rs=ruinState();
   if(answer===word){rs.sigil=true;box.hidden=true;ruinSay('The rune recognizes its name.');write();drawRuin()}
   else{
    rs.sigilMiss=(rs.sigilMiss||0)+1;
    const n=rs.sigilMiss;
    box.querySelector('#ruinSigilHint').textContent=n===1?'Hint: '+word[0]+'…':n===2?'Pattern: '+word[0]+'_'.repeat(word.length-2)+word.at(-1):'Strong hint: '+word.slice(0,Math.ceil(word.length*.6))+'…';
   }
  };
  box.querySelector('#ruinSigilClose').onclick=()=>{box.hidden=true};
 }
 box.hidden=false;
 box.querySelector('#ruinSigilClue').textContent=data[1]+' ('+data[0].length+' letters)';
 box.querySelector('#ruinSigilInput').value='';box.querySelector('#ruinSigilHint').textContent='';
 box.querySelector('#ruinSigilInput').focus();
}
function ruinAdvance(){
 const rs=ruinState();
 if(ruin.room===(state.chapter===0?2:1)&&!rs.switch){ruinSay('The next chamber remains sealed until the lever is pulled.');return}
 if(ruin.room===(state.chapter===0?3:2)&&!rs.sigil){ruinSay('A missing word holds the passage shut. Restore the rune sigil.');return}
 if(state.chapter===0&&ruin.room===4&&!rs.plate){ruinSay('Restore the three echoes in the Memory Chapel before leaving.');return}
 if(state.chapter>0&&ruin.room===2&&!physicalReady()){ruinSay('The east passage is physically disconnected. Align the mechanism.');return}
 if(state.chapter>0&&ruin.room===3&&!echoState().echoComplete){ruinSay('The passage remains sealed until both regional memories are restored.');return}
 if(state.chapter>0&&ruin.room===4&&!signatureProgress().complete){ruinSay('The final passage requires the region’s unique mechanism. Find the glowing trial sigil.');return}
 if(ruin.room<ruinRooms().length-1){ruin.room++;rs.room=ruin.room;ruin.x=1;ruin.y=7;ruinSay(state.chapter===0?FIRST_ARCHIVE_SCENES[ruin.room]:REGIONAL_DUNGEONS[state.chapter].scenes[ruin.room]);drawRuin();write();return}
 if(state.chapter===0 && !(state.lore||[]).some(x=>x.startsWith('Archive fragment '))){ruinSay('The final reliquary requires at least one recovered catalog page. Search the archive.');return}
 if(!rs.completed){rs.completed=true;state.gold+=150+state.chapter*35;state.armor++;award('Ruin Delver');write()}
 ruin=null;
 const chars=[['NARRATOR','📖',state.chapter===0?RUIN_LORE[state.chapter][0]:REGIONAL_DUNGEONS[state.chapter].scenes[5]],['SCOTT','⚔️','The ruins were not abandoned. Someone used them to store stolen names.']];
 if(state.party.includes('Mira'))chars.push(['MIRA','🔮',RUIN_LORE[state.chapter][1]]);
 if(state.party.includes('Bram'))chars.push(['BRAM','🛡️',RUIN_LORE[state.chapter][2]]);
 chars.push(['SYSTEM','🏆',ruinRooms().length+' chambers cleared! Earned gold, improved armor, and the Ruin Delver achievement.']);
 story(chars,()=>{say('The ruins have been cleared. Their secrets remain in your journal.');draw();write()});
}
$('#ruinLeave').onclick=()=>{ruin=null;const box=document.getElementById('ruinSigilBox');if(box)box.hidden=true;const chapel=document.getElementById('memoryChapel');if(chapel)chapel.hidden=true;const regional=document.getElementById('regionalEcho');if(regional)regional.hidden=true;const signature=document.getElementById('signatureTrial');if(signature)signature.hidden=true;const physical=document.getElementById('physicalMechanism');if(physical)physical.hidden=true;view('world');draw();say('You return from the ruins. Progress is preserved.')};
$('#ruinAction').onclick=ruinAction;
root.querySelectorAll('[data-ruindir]').forEach(b=>b.onclick=()=>{const [dx,dy]=b.dataset.ruindir.split(',').map(Number);ruinMove(dx,dy)});

$('#questForm').onsubmit=e=>{e.preventDefault();solveQuest()};
$('#questBack').onclick=()=>{questChallenge=null;view('world');draw()};
$('#transferExport').onclick=()=>{try{$('#transferText').value=codeForSave();$('#transferStatus').textContent='Save code ready. Select and copy it to transfer to another device.'}catch(e){$('#transferStatus').textContent='Unable to export this chronicle.'}};
$('#transferImport').onclick=()=>{const z=importSave($('#transferText').value);if(!z){$('#transferStatus').textContent='Invalid or unsupported save code. No data was changed.';return}state=z;const ok=write();view('world');draw();say(ok?'Imported! This slot now contains your transferred chronicle.':'Imported in memory. Persistent save unavailable on this browser.')};
$('#transferBack').onclick=()=>openHub();document.getElementById('storyPlaceAction').onclick=storyPlaceAction;document.getElementById('storyPlaceExit').onclick=leaveStoryPlace;root.querySelectorAll('[data-story-dir]').forEach(b=>b.onclick=()=>{const d=b.dataset.storyDir.split(',').map(Number);storyPlaceMove(d[0],d[1])});
$('#heroNameForm').onsubmit=e=>{e.preventDefault();const name=cleanHeroName($('#heroNameInput').value);if(!name){$('#heroNameError').textContent='Enter a name for your hero.';$('#heroNameInput').focus();return}start(name)};
$('#heroNameBack').onclick=()=>{H('#character');slotsUI(true)};
$('#new').onclick=()=>slotsUI(true);$('#continue').onclick=()=>slotsUI(false);$('#how').onclick=()=>storyIntro();function storyIntro(){const dummy=state;state=fresh();story([['GUIDE','📜','Use the directional pad, arrow keys, or WASD to move. On PC, press E/Space to interact or click adjacent tiles.'],['GUIDE','⚔️','Solve word clues to attack. Misses reveal hints. Your party earns XP and levels up.'],['GUIDE','🧩','Complete Across and Down crossword seals to face each chapter boss.'],['GUIDE','🏘️','Walkable towns contain allies. Completing a regional restoration changes its boss encounter.'],['GUIDE','💾','Use MENU → SAVE GAME. Each device gets its own three save slots.']],()=>{state=dummy;title()})}
$('#slotBack').onclick=title;$('#next').onclick=next;$('#action').onclick=action;$('#menuBtn').onclick=openHub;$('#hubExit').onclick=()=>{view('world');draw()};$('#shopExit').onclick=()=>{view('world');draw()};$('#crossForm').onsubmit=e=>{e.preventDefault();solve()};$('#exitCross').onclick=()=>{view('world');draw()};$('#typeForm').onsubmit=e=>{e.preventDefault();strike($('#typeAnswer').value)};root.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{const d=b.dataset.dir.split(',').map(Number);move(d[0],d[1])});root.addEventListener('keydown',e=>{if(screen==='storyPlace'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};e.preventDefault();storyPlaceMove(...d[e.key]);return}if(screen!=='world'||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(dirs[e.key]){e.preventDefault();move(...dirs[e.key])}else if(e.key==='Enter'){e.preventDefault();action()}});

// Willowmere's walkable reference town. Stored on the chapter stage, compatible with prior saves.
const WILLOW_ROOMS={
 square:{name:'Willowmere · Lantern Square',map:['#############','#..G.....F..#','#...........#','#...##......#','#...........#','#..I.....W..#','#...........#','#.....A.....#','######E######'],doors:{G:'garden',I:'inn',W:'workshop',A:'archive'}},
 inn:{name:'The Paper Lantern Inn',map:['###########','#..B......#','#.........#','#.........#','#....T....#','#.........#','#####E#####']},
 workshop:{name:'Mara’s Letterpress',map:['###########','#..F......#','#.........#','#....T....#','#.........#','#.........#','#####E#####']},
 archive:{name:'Hall of Remembered Names',map:['###########','#....C....#','#.........#','#..L......#','#.........#','#.........#','#####E#####']},
 garden:{name:'Moonwell Garden',map:['###########','#...M.....#','#.........#','#..R......#','#.........#','#.........#','#####E#####']}
};
const WILLOW_NPCS={
 square:[{name:'Tobin the Bellkeeper',icon:'🔔',base:[8,2],line:'The lanterns have forgotten the name of the person who lit them.'},{name:'Pip the Courier',icon:'🧒',base:[2,4],line:'Mara once printed a poem about the Moonwell. It went missing.'}],
 inn:[{name:'Edda the Innkeeper',icon:'👩‍🍳',base:[3,2],line:'People need a warm meal as much as a heroic speech.'}],
 workshop:[{name:'Mara the Printer',icon:'👩‍🔧',base:[3,2],line:'My press will not print until we find the lost dedication.'}],
 archive:[{name:'Keeper Orin',icon:'🧙',base:[6,2],line:'A book without a name still deserves to be remembered.'}],
 garden:[{name:'Iris the Gardener',icon:'🧑‍🌾',base:[7,2],line:'The Moonwell once carried a wish for every family.'}]
};
let willowPos={room:'square',x:6,y:7};
function willowProgress(){let st=stage();return st.willowTown||(st.willowTown={room:'square',x:6,y:7,discoveries:[],completed:false,steps:0})}
function willowMessage(t){document.getElementById('willowMessage').textContent=t}
const WILLOW_TALES={
 'Tobin the Bellkeeper':['Some mornings the bell rings without remembering why.','The old bell is sounding again. This time it remembers everyone.'],
 'Pip the Courier':['A letter with no addressee is the saddest thing I carry.','I can deliver the dedication to every family now!'],
 'Edda the Innkeeper':['A traveler left a note by the hearth. No name, only gratitude.','People have begun signing the guestbook again.'],
 'Mara the Printer':['Ink can preserve a town, if the town remembers what matters.','The restored dedication is the first thing I shall print tomorrow.'],
 'Keeper Orin':['Three fragments, three places, one promise.','The Hall has opened a new register for every resident.'],
 'Iris the Gardener':['The Moonwell keeps secrets in the ribbons beneath the roses.','Fresh lantern flowers have bloomed beside the water.']
};
function willowSetMoment(key,message){const w=willowProgress();w.moments=w.moments||[];if(!w.moments.includes(key)){w.moments.push(key);willowMessage(message);write();return true}return false}
function willowScene(){const w=willowProgress();if(!w.completed||w.celebrationSeen)return;w.celebrationSeen=true;w.shadowEvent=w.shadowEvent||{stage:1,witnesses:[],resolved:false};write();story([['NARRATOR','🏮','Night settles over Lantern Square. One by one, a hundred paper lanterns wake, each carrying a remembered name.'],['PIP','✉️','Listen! The bell is ringing out the names, not just the hour.'],['MARA','📜','No name is ever truly alone. That is the promise Willowmere almost forgot.'],['MIRA','✨','We did not just repair a machine. We gave the town back its stories.'],['BRAM','🛡️','Then there is something worth defending.'],['TOBIN','🔔','Wait. The bell has struck thirteen. A name is disappearing from the town register right now.'],['MARA','📜','The Archivore has followed our lanterns. We need three witnesses before the ink dries.']],()=>{view('willowTown');drawWillowTown();willowMessage('The dedication is restored. Residents now have new things to say.');write()})}

// The Thirteenth Bell: persistent, multi-location Willowmere story event.
const WILLOW_WITNESSES={'Pip the Courier':'The letters had the same blank signature, but I heard the name ELIAN whispered by the fountain.','Edda the Innkeeper':'The stranger signed the guestbook ELIAN, then the ink vanished. I remember the face.','Iris the Gardener':'The Moonwell reflected ELIAN even when every other surface went dark.'};
function willowShadow(){const w=willowProgress();if(!w.shadowEvent&&w.completed)w.shadowEvent={stage:1,witnesses:[],resolved:false};return w.shadowEvent||null}
function willowShadowStatus(){const e=willowShadow();if(!e)return 'The town remembers';if(e.resolved)return 'THE THIRTEENTH BELL · '+(e.choice==='shelter'?'NAME SHELTERED':'NAME PROCLAIMED');return 'THE THIRTEENTH BELL · '+(e.witnesses||[]).length+'/3 WITNESSES'}
function willowWitness(npc){const e=willowShadow();if(!e||e.resolved||!WILLOW_WITNESSES[npc.name])return false;e.witnesses=e.witnesses||[];if(!e.witnesses.includes(npc.name)){e.witnesses.push(npc.name);willowMessage(npc.name+': “'+WILLOW_WITNESSES[npc.name]+'” ('+e.witnesses.length+'/3 witnesses)');write();drawWillowTown();return true}willowMessage(npc.name+': “My testimony is safe with you. '+(e.witnesses.length===3?'Keeper Orin awaits at the Hall.':'Find the other witnesses.')+'”');return true}
function willowShadowFinale(){const e=willowShadow();if(!e||e.resolved||e.witnesses.length<3){willowMessage('The Hall needs testimony from Pip, Edda, and Iris before its lost name can be restored.');return}const panel=document.getElementById('willowEventChoice');panel.hidden=false;panel.innerHTML='<strong>THE THIRTEENTH BELL</strong><p>The erased register reveals ELIAN, keeper of the original lanterns. How will the party protect this name from the Archivore?</p><button id="lqShelter">Shelter Elian in the Book</button> <button id="lqProclaim">Ring the bell and proclaim Elian</button>';
 document.getElementById('lqShelter').onclick=()=>willowShadowResolve('shelter');document.getElementById('lqProclaim').onclick=()=>willowShadowResolve('proclaim');}
function willowShadowResolve(choice){const e=willowShadow();if(!e||e.resolved||e.witnesses.length!==3)return;e.resolved=true;e.choice=choice;e.stage=3;state.gold+=90;state.ethers+=1;state.potions+=2;award('The Thirteenth Bell');document.getElementById('willowEventChoice').hidden=true;write();story([['NARRATOR','🔔','The shadow of the Archivore reaches from the register, stealing letters from the walls.'],['ORIN','📖',choice==='shelter'?'We shall protect Elian’s name until the danger passes.':'Then every family will speak Elian’s name. The Archivore cannot silence us all.'],['MIRA','✨','A name is not just ink. It is a promise held by people who remember.'],['BRAM','🛡️','The creature now knows we are here. Let it come.'],['NARRATOR','🏮','The thirteenth bell fades. Willowmere stands together. Earned 90 gold, one Ether, and two Potions.']],()=>{view('willowTown');drawWillowTown();willowMessage('THE THIRTEENTH BELL completed. The town is changed; the Archivore awaits beyond Willowmere.');write()})}
function willowNpcPositions(room){const n=WILLOW_NPCS[room]||[];const turn=Math.floor((willowProgress().steps||0)/4);return n.map((v,i)=>({...v,x:Math.min(WILLOW_ROOMS[room].map[0].length-2,v.base[0]+((turn+i)%3===1?1:0)),y:v.base[1]}))}
function enterWillowTown(){document.getElementById('willowEventChoice').hidden=true;if(state.chapter!==0){townSquare();return}let w=willowProgress();willowPos={room:WILLOW_ROOMS[w.room]?w.room:'square',x:w.x??6,y:w.y??7};view('willowTown');drawWillowTown();willowMessage(w.completed?'The restored lanterns glow with names the town once lost.':'Visit the residents. Search the workshop, archive, and Moonwell garden for three lost fragments.')}
function drawWillowTown(){if(window.LexiconExplore){update();window.LexiconExplore.show('willowTown');const w=willowProgress();$('#willowTitle').textContent=WILLOW_ROOMS[willowPos.room].name;$('#willowStatus').textContent='Lantern fragments '+w.discoveries.length+'/3 · '+(w.completed?willowShadowStatus():'Speak to residents and visit the workshop, archive, and garden.');return}const w=willowProgress(),r=WILLOW_ROOMS[willowPos.room],npcs=willowNpcPositions(willowPos.room);document.getElementById('willowTitle').textContent=r.name;document.getElementById('willowStatus').textContent=`Lanterns ${w.discoveries.length}/3 · ${w.completed?'RESTORED':'UNLIT'} · ${w.completed?willowShadowStatus():'Residents follow their own routines'}`;
 const icons={G:'🌿',I:'🏠',W:'⚒️',A:'📚',E:'🚪',B:'🛏️',F:'📜',T:'🛎️',C:'📖',L:'🗝️',M:'💧',R:'🌹'};
 document.getElementById('willowGrid').dataset.chapter='0';document.getElementById('willowGrid').dataset.room=willowPos.room;document.getElementById('willowGrid').dataset.restored=w.completed?'yes':'no';document.getElementById('willowGrid').dataset.shadow=willowShadow()?.resolved?'saved':w.completed?'active':'quiet';
 document.getElementById('willowGrid').style.gridTemplateColumns=`repeat(${r.map[0].length},minmax(0,1fr))`;
 let html='';for(let y=0;y<r.map.length;y++)for(let x=0;x<r.map[y].length;x++){const t=r.map[y][x],npc=npcs.find(n=>n.x===x&&n.y===y),here=willowPos.x===x&&willowPos.y===y;let icon=here?'🧑‍🎤':npc?npc.icon:t==='#'?'':icons[t]||(w.completed&&t==='.'&&(x+y)%13===0?'🏮':'');html+=`<div class="willow-cell ${t==='#'?'wall':''} ${here?'hero':''} ${npc?'resident':''} ${w.completed&&t==='.'&&(x+y)%13===0?'lantern':''}" aria-label="${npc?npc.name:here?'Hero':t==='E'?'Exit':t==='.'?'Path':'Town feature'}">${icon}</div>`}document.getElementById('willowGrid').innerHTML=html;}
function willowMove(dx,dy){if(screen!=='willowTown')return;if(window.LexiconExplore?.handles('willowTown')){window.LexiconExplore.move(dx,dy);return}document.getElementById('willowEventChoice').hidden=true;const r=WILLOW_ROOMS[willowPos.room],nx=willowPos.x+dx,ny=willowPos.y+dy;const t=r.map[ny]?.[nx];if(!t||t==='#'){willowMessage('A building or wall blocks the path.');return}const npc=willowNpcPositions(willowPos.room).find(n=>n.x===nx&&n.y===ny);if(npc){willowTalk(npc);return}willowPos.x=nx;willowPos.y=ny;let w=willowProgress();w.steps++;if(t==='E'){if(willowPos.room==='square'){w.room='square';w.x=6;w.y=7;write();view('world');draw();say('You leave the Willowmere town square.');return}willowPos={room:'square',x:6,y:6};willowMessage('You return to Lantern Square.')}else if(willowPos.room==='square'&&r.doors[t]){const target=r.doors[t];willowPos={room:target,x:5,y:WILLOW_ROOMS[target].map.length-2};willowMessage('You enter '+WILLOW_ROOMS[target].name+'.')}else if(t!=='.'){willowInspect(t)}w.room=willowPos.room;w.x=willowPos.x;w.y=willowPos.y;drawWillowTown();write()}
function willowTalk(npc){const w=willowProgress();if(npc.name.startsWith('Mara')&&w.discoveries.length===3&&!w.completed){w.completed=true;state.gold+=125;state.ethers+=2;award('Lanterns of Willowmere');write();drawWillowTown();willowScene();return}if(w.completed&&willowWitness(npc))return;if(w.completed&&npc.name==='Keeper Orin'&&willowShadow()&&!willowShadow().resolved){willowShadowFinale();return}const tale=WILLOW_TALES[npc.name]||[npc.line,npc.line];const extra=!w.completed&&w.discoveries.length===3?' Bring the fragments to Mara in the workshop.':'';story([[npc.name,npc.icon,tale[w.completed?1:0]+extra]],()=>{view('willowTown');drawWillowTown();willowMessage(npc.name+': “'+tale[w.completed?1:0]+'”'+extra)});if(w.completed&&npc.name.startsWith('Tobin'))willowSetMoment('bell','Tobin rings the restored bell. Its chime echoes through the square.')}
function willowInspect(tile){const w=willowProgress();if(w.completed&&tile==='C'&&willowShadow()&&!willowShadow().resolved){willowShadowFinale();return}const finds={F:['Press Rubbing','A paper rubbing reveals the first lines of a dedication.'],L:['Archive Ledger','The archive ledger preserves a forgotten surname.'],R:['Moonwell Ribbon','A ribbon holds the closing line of the lantern dedication.']};let found=finds[tile];if(found){if(w.discoveries.includes(found[0])){willowMessage('You already recovered '+found[0]+'.');return}w.discoveries.push(found[0]);willowMessage('Recovered '+found[0]+'. '+found[1]+' ('+w.discoveries.length+'/3)'+(w.discoveries.length===3?' Return to Mara in the letterpress.':''));write();return}if(tile==='T'){if(state.gold>=15){state.gold-=15;for(const p of state.party){state.hp[p]=state.maxhp[p];state.mp[p]=state.maxmp[p]}willowMessage('Edda offers a room and a warm meal. Party restored for 15 gold.')}else willowMessage('Edda offers a seat, but an overnight room costs 15 gold.');return}if(tile==='C'||tile==='M'){willowMessage(w.completed?'The inscription glows: “No name is ever truly alone.”':'The inscription has three missing fragments. Search the town.');return}willowMessage('You examine the '+tile+'. There is history in every corner of Willowmere.')}
function willowAction(){if(screen!=='willowTown')return;if(window.LexiconExplore?.handles('willowTown')){window.LexiconExplore.interact();return}const nearby=willowNpcPositions(willowPos.room).find(n=>Math.abs(n.x-willowPos.x)+Math.abs(n.y-willowPos.y)===1);if(nearby){willowTalk(nearby);return}const r=WILLOW_ROOMS[willowPos.room],t=r.map[willowPos.y][willowPos.x];willowInspect(t)}
document.querySelectorAll('[data-willow-dir]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.willowDir.split(',').map(Number);willowMove(x,y)});
document.getElementById('willowAction').onclick=willowAction;
document.getElementById('willowExit').onclick=()=>{const w=willowProgress();w.room=willowPos.room;w.x=willowPos.x;w.y=willowPos.y;write();view('world');draw()};
window.addEventListener('keydown',e=>{if(screen!=='willowTown'||['INPUT','TEXTAREA'].includes(e.target.tagName))return;const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(d[e.key]){e.preventDefault();willowMove(...d[e.key])}else if(e.key==='Enter'){e.preventDefault();willowAction()}});

read();$('#continue').disabled=!saveSlots.some(Boolean);
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Foreground-only session clock; persist with normal save operations.
let lqLastActiveTick=Date.now();
setInterval(()=>{const now=Date.now();const elapsed=Math.max(0,Math.min(15,(now-lqLastActiveTick)/1000));lqLastActiveTick=now;if(state&&!document.hidden&&screen!=='title'&&screen!=='slots'&&screen!=='character')state.activeSeconds=(Number(state.activeSeconds)||0)+elapsed;},5000);
document.addEventListener('visibilitychange',()=>{lqLastActiveTick=Date.now();});


// Regional town campaign: seven authored hubs, three interconnected scenes each.
// New state lives under stage().regionalTown; existing saves remain readable.
const REGIONAL_TOWNS=[
 null,
 {name:'Glasswake',site:'Mirror Court',color:'silver',rooms:['Reflection Plaza','House of Doubles','Bell Observatory'],people:['Yara the Glasskeeper','Noll the Clocksmith','Sera the Bellringer'],icons:['🪞','🛠️','🔔'],items:['Silver Petition','Cracked Portrait','Silent Chime'],secret:'The same citizen appears in two contradictory municipal records.',threat:'The Nameless King has erased the distinction between one life and its reflection.',ending:['Let both names survive; a person may contain contradictions.','Seal the false reflection so the original may remember.']},
 {name:'Cinderhaven',site:'Emberpeak',color:'ember',rooms:['Coalmarket','The Cooling House','Forge Memorial'],people:['Dara the Smelter','Kett the Apprentice','Old Fen the Mason'],icons:['⚒️','🧑‍🏭','🧓'],items:['Burned Ledger','Cooling Sigil','Scorched Ribbon'],secret:'The forge was extinguished deliberately to protect the apprentices.',threat:'The Cinder Warden demands that the townsfolk surrender their histories as fuel.',ending:['Reignite the memorial forge for every apprentice.','Preserve the last ember in the town archive.']},
 {name:'Tidemark',site:'Valewyn',color:'tide',rooms:['Canal Square','Sluice Keeper’s Lodge','Drowned Chapel'],people:['Hale the Ferryman','Minta the Locksmith','Sister Vey'],icons:['🚣','🔑','🕯️'],items:['Ferry Register','Rusty Valve Token','Royal Vow'],secret:'The last witness survived beneath the waterline.',threat:'The Paper Regent intends to drown every record of the royal succession.',ending:['Raise the witness bell so the whole city may hear.','Carry the testimony into the protected archive.']},
 {name:'Starfall',site:'Whispering Desert',color:'sand',rooms:['Caravan Crossroads','The Shade Tent','Astronomer’s Yard'],people:['Adira the Cartographer','Rafi the Waterkeeper','Numa the Stargazer'],icons:['🧭','🏺','🔭'],items:['Broken Compass','Hidden Cistern Map','Star Etching'],secret:'The missing constellation is a map to a buried sanctuary.',threat:'The Sand Oracle has buried the names of those who led travelers home.',ending:['Mark the sanctuary for all travelers.','Guard its location until the storm passes.']},
 {name:'Aerieport',site:'Skybound Isles',color:'sky',rooms:['Airship Landing','Ropewalk Workshop','Wind Shrine'],people:['Captain Vale','Pico the Rigger','Eris the Windreader'],icons:['🧑‍✈️','🪢','🌬️'],items:['Lost Flight Log','Snapped Cable','Windward Seal'],secret:'The missing airship was diverted to save a settlement below the clouds.',threat:'The Storm Scribe is rewriting the sky routes to isolate the floating towns.',ending:['Publish the true routes on the landing boards.','Entrust the route to the shrine’s keepers.']},
 {name:'Snowrest',site:'Hollow North',color:'frost',rooms:['Winter Commons','Lampmaker’s Hut','The Last Hearth'],people:['Asta the Scout','Bo the Lampmaker','Grandmother Nyx'],icons:['🧣','🏮','👵'],items:['Warm Wool Scrap','Frost Lantern','Family Register'],secret:'The families remembered one another through the long silent winter.',threat:'The White Phantom is removing the footpaths and the names of those who walked them.',ending:['Light every road beacon and reunite the families.','Keep the final lantern burning in the common hall.']},
 {name:'Indexhaven',site:'First Library',color:'violet',rooms:['Scholar’s Walk','Unbinding Studio','The Public Index'],people:['Archivist Tern','Sable the Binder','Rho the Custodian'],icons:['📚','🪡','🗝️'],items:['Uncut Quire','Binding Thread','Forbidden Index'],secret:'The original record was deliberately left unfinished so its ending could be chosen.',threat:'The Eraser is gathering every unfinished name into the final blank page.',ending:['Open the index and return the words to everyone.','Guard the original so the world can write its own ending.']}
];
const REGIONAL_LAYOUTS=[
 ['###########','#...1.....#','#.........#','#...#.....#','#.........#','#.....2...#','#####E#####'],
 ['###########','#.........#','#..1......#','#.........#','#......2..#','#.........#','#####E#####'],
 ['###########','#......1..#','#.........#','#...#.....#','#..2......#','#.........#','#####E#####']
];
// Each settlement has its own walkable arrangement, local landmark, and environmental story.
// The original room indices and evidence indices stay unchanged for backward-compatible saves.
const REGIONAL_LANDMARKS=[null,
 [{icon:'🪞',name:'Unclaimed Reflection',before:'Your reflection hesitates. The Nameless King has been stealing the space between a name and its echo.',after:'The mirror now shows the faces of everyone who was forgotten.'},{icon:'🔔',name:'Clockwork Bell',before:'Its hands point to thirteen; the bell refuses to strike.',after:'The bell rings for both names, as it should.'},{icon:'💠',name:'Prism Window',before:'A silver beam splits into two shadows.',after:'Both shadows reunite in one clear light.'}],
 [{icon:'🔥',name:'Slumbering Furnace',before:'The furnace is cold, but its coals whisper the apprentices’ names.',after:'Warmth returns without consuming anyone’s history.'},{icon:'🪣',name:'Cooling Basin',before:'A basin of water bears the marks of an emergency evacuation.',after:'Fresh water cools the forge safely.'},{icon:'⚒️',name:'Memorial Anvil',before:'The apprentices’ initials have been hammered from its surface.',after:'The recovered initials shine in the metal.'}],
 [{icon:'🌊',name:'Flood Marker',before:'The waterline has climbed over the names of the city founders.',after:'The marker reveals the recovered names above the tide.'},{icon:'⚙️',name:'Sluice Wheel',before:'A wheel ticks as water leaks through its damaged seal.',after:'The channels run clear around the repaired wheel.'},{icon:'🕯️',name:'Witness Candle',before:'The candle continues to burn below the waterline.',after:'The candle burns beside a restored royal vow.'}],
 [{icon:'🧭',name:'Caravan Compass',before:'The needle points toward a star no longer visible.',after:'The compass once again points home.'},{icon:'🏺',name:'Buried Cistern',before:'A hollow echo suggests cool water below the sand.',after:'Travelers have marked the cistern for those who follow.'},{icon:'🌠',name:'Star Dial',before:'Several stars are missing from its ring.',after:'The missing constellation is etched into the dial.'}],
 [{icon:'🛩️',name:'Empty Mooring',before:'A rope swings where the rescue airship should be.',after:'The true flight path is painted onto the mooring post.'},{icon:'🪢',name:'Rope Winch',before:'The winch rattles in winds that have no name.',after:'The lines hum steadily through the sky.'},{icon:'🌬️',name:'Wind Vane',before:'The vane points toward a route erased by the Storm Scribe.',after:'Its arrows guide travelers safely again.'}],
 [{icon:'❄️',name:'Snowbound Signpost',before:'All four arrows point into the same white emptiness.',after:'The village roads bear their old names.'},{icon:'🏮',name:'Beacon Lamp',before:'A frozen lantern holds the last trace of a family’s route.',after:'Its glow reaches the next beacon through the snow.'},{icon:'🪵',name:'Family Hearth',before:'The hearth is cold, though names are carved inside its stones.',after:'Families gather around the restored hearth.'}],
 [{icon:'📖',name:'Blank Pedestal',before:'The monument’s inscription has been erased before it could be written.',after:'Every visitor can add a line to its story.'},{icon:'🪡',name:'Binding Loom',before:'Loose pages collect under the loom, waiting for a rightful ending.',after:'The pages are bound without closing the book.'},{icon:'🗃️',name:'Open Index',before:'The index contains an empty entry for every living person.',after:'The index has space for every future name.'}]
];
const REGIONAL_FLOOR_VARIANTS=[null,
 ['mirror','mirror','glass'],['forge','workshop','coal'],['canal','lodge','chapel'],
 ['market','tent','stars'],['dock','rope','wind'],['snow','lamp','hearth'],['books','ink','vault']
];
const REGIONAL_TOWN_MAP_PATTERNS=[
 ['###########','#...1.....#','#.........#','#...#.....#','#.........#','#.....2...#','#####E#####'],
 ['###########','#.........#','#..1......#','#.........#','#......2..#','#.........#','#####E#####'],
 ['###########','#......1..#','#.........#','#...#.....#','#..2......#','#.........#','#####E#####']
];
function regionalMap(room){const ch=state.chapter,base=REGIONAL_TOWN_MAP_PATTERNS[room].map(r=>r.split(''));
 // Keep the entrances, evidence, caretaker, and passage tiles clear. Add a different
 // architectural silhouette to each room without trapping players behind scenery.
 const walls=[[[7,2],[7,3]],[[8,2],[8,3]],[[2,4],[3,4]],[[6,2],[6,3]],[[7,4],[8,4]],[[2,2],[2,3]],[[6,4],[7,4]]];
 const pair=walls[(ch+room*3)%walls.length],v=stage().regionalTown,secret=!!v?.secretPaths?.includes(room);
 for(const [i,[x,y]] of pair.entries()){if(i===0&&secret)continue;if(base[y]?.[x]==='.')base[y][x]='#'}
 // Unique inspectable centerpiece always sits on reachable floor in the lower-right.
 if(base[4][8]==='.')base[4][8]='3';else if(base[5][8]==='.')base[5][8]='3';else base[5][7]='3';
 return base.map(r=>r.join(''));
}
let regionalPos={room:0,x:5,y:5};
function regionalData(){return REGIONAL_TOWNS[state.chapter]}
function regionalState(){const st=stage();return st.regionalTown||(st.regionalTown={room:0,x:5,y:5,clues:[],talked:[],steps:0,ending:null,celebration:false})}
function regionalSecretCell(room){const walls=[[[7,2],[7,3]],[[8,2],[8,3]],[[2,4],[3,4]],[[6,2],[6,3]],[[7,4],[8,4]],[[2,2],[2,3]],[[6,4],[7,4]]];return walls[(state.chapter+room*3)%walls.length][0]}
function regionalMsg(t){document.getElementById('regionalMessage').textContent=t}
function enterRegionalTown(){if(state.chapter===0)return enterWillowTown();const v=regionalState();regionalPos={room:Math.max(0,Math.min(2,v.room||0)),x:v.x??5,y:v.y??5};view('regionalTown');drawRegionalTown();regionalMsg(v.ending?'The town remembers the choice you made. Residents greet you as a friend.':'Explore three connected locations. Interview each resident and recover three records.');}
function regionalResident(room){const d=regionalData();return {name:d.people[room],icon:d.icons[room]}}
function regionalResidentPos(room){
 const v=regionalState(),map=regionalMap(room);let desired=[3,3];
 if(v.crisis?.ending){desired=[[7,2],[6,4],[2,5]][room]||[3,3]}
 else if(v.ending){desired=[[6,2],[7,4],[2,4]][room]||[3,3]}
 const valid=([x,y])=>map[y]?.[x]&&map[y][x]==='.';
 if(valid(desired))return desired;if(valid([3,3]))return[3,3];
 for(let y=1;y<map.length-1;y++)for(let x=1;x<10;x++)if(valid([x,y]))return[x,y];return[3,3]
}
function drawRegionalTown(){if(screen!=='regionalTown')return;if(window.LexiconExplore){update();window.LexiconExplore.show('regionalTown');const d=regionalData(),v=regionalState();$('#regionalTitle').textContent=d.name+' · '+d.rooms[regionalPos.room];$('#regionalStatus').textContent=v.clues.length+'/3 records · '+v.talked.length+'/3 witnesses · '+(v.ending?'RESTORED · revisit landmarks for the aftermath':'Interview residents and recover records in all three locations.');return}const d=regionalData(),v=regionalState(),r=regionalPos.room,map=regionalMap(r),npc=regionalResident(r);document.getElementById('regionalTitle').textContent=d.name+' · '+d.rooms[r];document.getElementById('regionalStatus').textContent=`${v.clues.length}/3 records · ${v.talked.length}/3 witnesses · ${v.ending?'RESTORED · ALLIANCE ACTIVE':'THREATENED'} · ${d.site} · ${(v.landmarks||[]).length}/3 landmarks · ${(v.clues.length+v.talked.length)}/6 investigation · ${(v.crisis?.sites||[]).length}/3 aftermath sites · ${v.crisis?.ending?'AFTERMATH RESOLVED':'Aftermath available after restoration'}`;const grid=document.getElementById('regionalGrid');grid.dataset.theme=d.color;grid.dataset.chapter=String(state.chapter);grid.dataset.room=REGIONAL_FLOOR_VARIANTS[state.chapter][r];grid.dataset.restored=v.ending?'yes':'no';grid.style.gridTemplateColumns='repeat(11,minmax(0,1fr))';let html='';const npos=regionalResidentPos(r);for(let y=0;y<map.length;y++)for(let x=0;x<11;x++){const t=map[y][x],here=x===regionalPos.x&&y===regionalPos.y,resident=x===npos[0]&&y===npos[1],symbol=here?'🧑‍🎤':resident?npc.icon:t==='1'?'📜':t==='2'?'✨':t==='E'?'🚪':t==='3'?REGIONAL_LANDMARKS[state.chapter][r].icon:t==='#'?'':'',cls=t==='#'?'wall':here?'hero':resident?'resident':t==='1'||t==='2'?'clue':t==='3'?'landmark':'';html+=`<div class="regional-cell ${cls}" aria-label="${here?'Hero':resident?npc.name:t==='E'?'Door':t==='1'?'Record':t==='2'?'Passage':t==='3'?REGIONAL_LANDMARKS[state.chapter][r].name:'Path'}">${symbol}</div>`}grid.innerHTML=html;document.getElementById('regionalChoice').hidden=true;}
function regionalSave(){const v=regionalState();v.room=regionalPos.room;v.x=regionalPos.x;v.y=regionalPos.y;write()}
function regionalMove(dx,dy){if(screen!=='regionalTown')return;if(window.LexiconExplore?.handles('regionalTown')){window.LexiconExplore.move(dx,dy);return}const x=regionalPos.x+dx,y=regionalPos.y+dy,map=regionalMap(regionalPos.room),tile=map[y]?.[x];if(!tile||tile==='#'){regionalMsg('The path is blocked.');return}{const [rx,ry]=regionalResidentPos(regionalPos.room);if(x===rx&&y===ry){regionalTalk();return}}regionalPos.x=x;regionalPos.y=y;const v=regionalState();v.steps++;v.secretCaches=v.secretCaches||[];const secret=regionalSecretCell(regionalPos.room);if(v.secretPaths?.includes(regionalPos.room)&&x===secret[0]&&y===secret[1]&&!v.secretCaches.includes(regionalPos.room)){v.secretCaches.push(regionalPos.room);state.gold+=18+state.chapter*3;state.ethers+=1;regionalMsg('SECRET PASSAGE · You find an emergency cache: gold and one Ether.');}
 if(tile==='E'){if(regionalPos.room===0){regionalSave();view('world');draw();return}regionalPos={room:0,x:5,y:5};regionalMsg('You return to '+regionalData().rooms[0]+'.')}
 else if(tile==='1')regionalInspect();else if(tile==='3'){regionalLandmark();}else if(tile==='2'){if(regionalPos.room===0){regionalPos={room:1,x:5,y:5};regionalMsg('You enter '+regionalData().rooms[1]+'.')}else if(regionalPos.room===1){regionalPos={room:2,x:5,y:5};regionalMsg('You enter '+regionalData().rooms[2]+'.')}else{regionalPos={room:0,x:5,y:5};regionalMsg('A hidden stair returns to the main square.')}}
 regionalSave();drawRegionalTown();}
function regionalLandmark(){const r=regionalPos.room,v=regionalState(),site=REGIONAL_LANDMARKS[state.chapter][r];v.landmarks=v.landmarks||[];v.secretPaths=v.secretPaths||[];let extra='';if(!v.landmarks.includes(r)){v.landmarks.push(r);regionalSave();}if(v.ending&&!v.secretPaths.includes(r)){v.secretPaths.push(r);extra+=' A concealed interior passage clicks open nearby.';}if(v.ending)extra+=timedLandmarkCheckpoint(r);regionalMsg(site.name+': '+(v.ending?site.after:site.before)+(v.ending?' '+crisisObserve(r):'')+extra);regionalSave();drawRegionalTown();}
function regionalInspect(){const v=regionalState(),d=regionalData(),r=regionalPos.room;if(!v.clues.includes(r)){v.clues.push(r);regionalMsg('Recovered '+d.items[r]+'. '+(r===2?d.secret:'A lost piece of the regional history is preserved.'));regionalSave()}else regionalMsg('You already recorded '+d.items[r]+'.'); if(v.clues.length===3&&v.talked.length===3&&!v.ending)regionalMsg('All testimony recovered. Return to the first town square and interact with its resident to settle the crisis.')}
function regionalTalk(){const d=regionalData(),v=regionalState(),r=regionalPos.room;if(!v.talked.includes(r)){v.talked.push(r);regionalSave()}if(v.ending){if(r===0&&crisisDecision())return;const ending=v.ending==='public'?'our witnesses speak every recovered name aloud':'our keepers shelter the recovered records';const line=(stage().boss?'The chapter guardian is defeated. The town is rebuilding. ':'')+'Because of your choice, '+ending+'. '+(stage().boss?'Your victory will be remembered.':'Our support will aid you in the boss battle.');story([[d.people[r],regionalResident(r).icon,line]],()=>{view('regionalTown');drawRegionalTown();regionalMsg(d.people[r]+': “'+line+'”')});return}if(v.talked.length===3&&v.clues.length===3&&r===0){regionalFinale();return}const line=r===0?d.threat:r===1?'I know another witness in the next building. Keep searching.':d.secret;story([[d.people[r],regionalResident(r).icon,line]],()=>{view('regionalTown');drawRegionalTown();regionalMsg(d.people[r]+': “'+line+'” ('+v.talked.length+'/3 witnesses)')});}
function regionalFinale(){const d=regionalData(),p=document.getElementById('regionalChoice');p.hidden=false;p.innerHTML='';const h=document.createElement('strong');h.textContent='A CHOICE FOR '+d.name.toUpperCase();const para=document.createElement('p');para.textContent=d.threat+' The town asks how its recovered story should be protected.';p.append(h,para);d.ending.forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>regionalResolve(i===0?'public':'sheltered');p.appendChild(b)})}
function regionalResolve(choice){const v=regionalState();if(v.ending||v.clues.length!==3||v.talked.length!==3)return;v.ending=choice;state.gold+=110;state.ethers+=2;v.allianceUnlocked=true;award('Restored '+regionalData().name);regionalSave();document.getElementById('regionalChoice').hidden=true;story([['NARRATOR','📜',regionalData().secret],['MIRA','✨','The truth changes when the people who lived it can speak.'],['BRAM','🛡️','And now they have a place worth defending.'],['NARRATOR','🏮',regionalData().name+' begins to heal. Received 110 gold and two Ethers.']],()=>{view('regionalTown');drawRegionalTown();regionalMsg('THE TOWN IS RESTORED. Its people will remember your decision.');regionalSave()})}
function showRegionalStatus(){
 const st=stage(),rt=st.regionalTown,ru=st.ruins;
 const entries=[
  ['Chapter',`${state.chapter+1}/8 · ${CHAPTERS[state.chapter].name}`],
  ['Guide',st.npc?'Met':'Not yet'],['Crossword',st.puzzle?'Restored':'Unfinished'],
  ['Boss',st.boss?'Defeated':'Threat remains'],['Ruins',ru?.completed?'Cleared':'Explorable'],
  ['Story',st.saga?.step===3?'Finished':'In progress'],['Elite',st.eliteHunt?'Cleared':'Available'],
  ['Town',state.chapter===0?(st.willowTown?.completed?'Lanterns restored':'Help the residents'):(rt?.ending?'Restored':'Restore the records')],
  ['Alliance',state.chapter===0?'Willowmere watches over you':bossAllianceText()],['Town aftermath',state.chapter===0?'Willowmere bell event':(rt?.crisis?.ending?'Resolved · '+rt.crisis.ending:(rt?.crisis?.sites?.length||0)+'/3 landmarks')],
  ['Playtime',pacingInfo()]
 ];
 const el=document.getElementById('hubDetails');el.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='REGIONAL ALLIANCE & PROGRESS';el.append(heading);
 for(const [label,value] of entries){const q=document.createElement('p');const b=document.createElement('b');b.textContent=label+': ';q.append(b,document.createTextNode(value));el.append(q)}
 const next=document.createElement('p');next.textContent=st.boss?'This chapter is clear. Explore remaining quests or advance from the boss tile.':!st.npc?'Find the regional guide on the overworld.':!st.puzzle?'Restore the crossword seal.':'Prepare your party and challenge the chapter boss.';el.append(next);
}
function regionalAction(){if(screen!=='regionalTown')return;if(window.LexiconExplore?.handles('regionalTown')){window.LexiconExplore.interact();return}const r=regionalPos.room,m=regionalMap(r),x=regionalPos.x,y=regionalPos.y;const [rx,ry]=regionalResidentPos(r);if(Math.abs(x-rx)+Math.abs(y-ry)<=1){regionalTalk();return}const tile=m[y][x];if(tile==='1'){regionalInspect();return}if(tile==='3'){regionalLandmark();return}if(regionalState().clues.length===3&&regionalState().talked.length===3&&r===0){regionalFinale();return}regionalMsg('Seek the marked records and speak to the resident in each location.')}
document.querySelectorAll('[data-regional-dir]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.regionalDir.split(',').map(Number);regionalMove(x,y)});
document.getElementById('regionalAction').onclick=regionalAction;
document.getElementById('regionalExit').onclick=()=>{regionalSave();view('world');draw()};
window.addEventListener('keydown',e=>{if(screen!=='regionalTown'||['INPUT','TEXTAREA'].includes(e.target.tagName))return;const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(d[e.key]){e.preventDefault();regionalMove(...d[e.key])}else if(e.key==='Enter'){e.preventDefault();regionalAction()}});


// REGION AFTERMATH: a second, physically explored, optional quest per regional town.
const REGION_CRISIS=[
 null,
 {name:'The Double at Dusk',opening:'The mirror has begun reflecting people who are not there.',sites:['Retune the mirror to the witness\'s true voice.','Catch a counterfeit reflection in the belfry.','Recover the last unbroken silver plate.'],choice:['Seal the false reflection','Let the townsfolk name it'],finish:['The counterfeit is trapped, leaving the boss exposed.','Witnesses reveal the truth, granting the party protection.']},
 {name:'The Cold Forge Strike',opening:'The surviving smiths refuse to reopen the cursed furnace.',sites:['Count the missing smiths in the kiln.','Relight the apprentice\'s quenching station.','Find the workers\' oath beneath the anvil.'],choice:['Honor the workers\' oath','Reforge the missing names'],finish:['The furnace turns against the Cinder Scribe.','The smiths send protective runes into battle.']},
 {name:'The Evacuation of Tidemark',opening:'The old canal gates have opened while families shelter below.',sites:['Mark the safe waterline.','Warn the ferrymen at the old quay.','Retrieve the evacuation register.'],choice:['Open the high-water escape','Restore the lost evacuation bell'],finish:['The torrent weakens the drowned court.','The rescued families lend the party a ward.']},
 {name:'The Caravan of False Stars',opening:'A caravan follows a prophecy that points to empty desert.',sites:['Compare the caravan compass.','Realign the roadside star dial.','Read the map left by the missing guide.'],choice:['Expose the false constellation','Preserve the travelers\' secret route'],finish:['The Star Eater loses its hidden strength.','The caravan guards prepare a celestial ward.']},
 {name:'The Lost Navigator',opening:'An airship drifts above Aerieport with no crew at the helm.',sites:['Repair the mooring beacon.','Retrieve the navigator\'s wind chart.','Signal the empty airship at dusk.'],choice:['Ground the phantom airship','Guide it to a safe harbor'],finish:['The sky guardian\'s winds fall silent.','The rescued crew shields the party.']},
 {name:'The Winter Census',opening:'The census omits every home swallowed by the whiteout.',sites:['Locate the buried boundary stone.','Restore the hearth\'s family list.','Count the footprints at the northern gate.'],choice:['Publicly recite the missing families','Preserve their names in the hearth'],finish:['The Hollow Warden loses its forgotten armor.','The families rally to guard their rescuers.']},
 {name:'The Forbidden Appendix',opening:'A new appendix in the First Library erases every reader.',sites:['Decode the blank pedestal.','Recover the uncut index leaf.','Seal the damaged catalog of promises.'],choice:['Publish the missing appendix','Keep a protected copy'],finish:['The Eraser is forced to remember its own name.','The librarians weave a final sanctuary ward.']}
];
function crisisProgress(){return stage().regionalTown?.crisis||{sites:[],ending:null}}
function crisisObserve(room){
 const v=regionalState();if(!v.ending||state.chapter===0)return '';
 v.crisis=v.crisis||{sites:[],ending:null};const c=REGION_CRISIS[state.chapter];
 if(v.crisis.ending)return c.finish[v.crisis.ending==='reveal'?0:1];
 if(v.crisis.sites.includes(room))return 'Crisis evidence already recovered here. '+v.crisis.sites.length+'/3.';
 v.crisis.sites.push(room);regionalSave();
 return c.sites[room]+' ('+v.crisis.sites.length+'/3 aftermath traces).'+(v.crisis.sites.length===3?' Return to the first town resident to settle the crisis.':'');
}
function crisisDecision(){
 const v=regionalState(),c=REGION_CRISIS[state.chapter];if(!v.ending||v.crisis?.ending||v.crisis?.sites?.length!==3)return false;
 const panel=document.getElementById('regionalChoice');panel.replaceChildren();panel.hidden=false;
 const heading=document.createElement('h3');heading.textContent=c.name;const intro=document.createElement('p');intro.textContent=c.opening;panel.append(heading,intro);
 c.choice.forEach((label,i)=>{const btn=document.createElement('button');btn.textContent=label;btn.type='button';btn.onclick=()=>{
  if(v.crisis.ending)return;v.crisis.ending=i===0?'reveal':'shelter';
  state.gold+=85+state.chapter*12;state.ethers++;gainXP(90+state.chapter*22);
  state.lore=state.lore||[];state.lore.push(c.name+': '+c.finish[i]);
  award('Aftermath · '+regionalData().name);regionalSave();panel.hidden=true;
  drawRegionalTown();regionalMsg(c.finish[i]+' Your choice will change the regional boss battle. Earned gold, XP and an Ether. '+takeLevelNotice());
 };panel.appendChild(btn)});return true;
}

function enemyTraitForName(n){return /GOLEM|SENTINEL|KNIGHT|CHANCELLOR|JUDGE|INDEX/i.test(n)?'ARMORED':/WRAITH|SPECTER|SHADE|PHANTOM|USURPER|REMEMBERER/i.test(n)?'DRAINER':/WOLF|ROC|HARRIER|DEVOURER|REAVER/i.test(n)?'FERAL':/BEETLE|SLIME/i.test(n)?'SKITTER':'ARCANE'}
function showTacticalBestiary(){
 view('hub');const el=$('#hubDetails'),a=$('#hubActions');el.replaceChildren();a.replaceChildren();const h=document.createElement('h3');h.textContent='TACTICAL BESTIARY';el.append(h);const affinity=REGION_AFFINITIES[state.chapter]||REGION_AFFINITIES[0];
 const intro=document.createElement('p');intro.textContent=heroText(`${CHAPTERS[state.chapter].name}: foes resist ${affinity.resist} and are weak to ${affinity.weak}. Scott’s normal attacks are BLADE, Mira uses ARCANE, and Bram uses RUNE.`);el.append(intro);
 const seen=Object.entries(state.bestiary||{});if(!seen.length){const p=document.createElement('p');p.textContent='No enemies recorded yet.';el.append(p)}
 for(const [name,count] of seen){const p=document.createElement('p');p.textContent=`${name} × ${count} · ${enemyTraitForName(name)} · weak ${affinity.weak} · resists ${affinity.resist}`;el.append(p)}
 const back=document.createElement('button');back.textContent='RETURN TO CHRONICLE';back.onclick=openHub;a.append(back);
}
function forgeBoard(){
 view('hub');state.forgeQuest=state.forgeQuest||{started:false,completed:false,crafted:[]};state.forgeQuest.crafted=state.forgeQuest.crafted||[];
 const cleared=Object.values(state.stages||{}).filter(st=>st.eliteHunt).length;if(!state.forgeQuest.shardsInitialized){state.forgeShards=(state.forgeShards||0)+cleared;state.forgeQuest.shardsInitialized=true}if(cleared>0&&!state.forgeQuest.started)state.forgeQuest.started=true;
 const el=$('#hubDetails'),a=$('#hubActions');el.replaceChildren();a.replaceChildren();const h=document.createElement('h3');h.textContent='RUNIC FORGE';el.append(h);
 const p=document.createElement('p');p.textContent=state.forgeQuest.started?`Rune Shards: ${state.forgeShards||0}. Elite hunts recover shards. Craft one masterwork to complete the forge apprenticeship.`:'The forge awakens after your first elite hunt.';el.append(p);
 if(state.forgeQuest.started)for(const r of FORGE_RECIPES){const made=state.forgeQuest.crafted.includes(r.id),row=document.createElement('p');row.textContent=`${made?'✓ ':''}${r.name} · ${r.shards} shards + ${r.gold}G · ${r.desc}`;el.append(row);const b=document.createElement('button');b.textContent=made?'CRAFTED':'CRAFT '+r.name.toUpperCase();b.disabled=made||(state.forgeShards||0)<r.shards||state.gold<r.gold;b.onclick=()=>{if(b.disabled)return;state.forgeShards-=r.shards;state.gold-=r.gold;r.apply();state.forgeQuest.crafted.push(r.id);if(!state.forgeQuest.completed){state.forgeQuest.completed=true;gainXP(120);award('Runic Apprentice');milestone('Runic Forge apprenticeship completed')}write();forgeBoard()};a.append(b)}
 const back=document.createElement('button');back.textContent='RETURN TO CHRONICLE';back.onclick=openHub;a.append(back);write();
}
function showBattleHistory(){
 view('hub');const el=document.getElementById('hubDetails');el.replaceChildren();
 const h=document.createElement('h3');h.textContent='RECENT BATTLE HISTORY';el.appendChild(h);
 for(const line of state.recentCombat||['No completed encounters recorded yet.']){
  const p=document.createElement('p');p.textContent=heroText(line);el.appendChild(p);
 }
 const back=document.createElement('button');back.textContent='BACK TO CHRONICLE';back.onclick=openHub;
 document.getElementById('hubActions').replaceChildren(back);
}
function encounterAudit(){const all=ENCOUNTER_ROSTER.flat(),unique=new Set(all);return {regions:ENCOUNTER_ROSTER.length,total:all.length,unique:unique.size,eachRegionHasThree:ENCOUNTER_ROSTER.every(r=>r.length===3&&new Set(r).size===3)}}
function showReleaseHealth(){
 view('hub');const el=document.getElementById('hubDetails'),a=document.getElementById('hubActions');el.replaceChildren();a.replaceChildren();
 const h=document.createElement('h3');h.textContent='DIAGNOSTICS & BATTLE DIFFICULTY';el.append(h);
 const report=[`Edition: Boss Atmosphere & Campaign QA / Roadmap batch`, `Save slot: ${slot+1}/3`, `Chapter: ${state.chapter+1}/8`, `Hero level: ${state.lv}`,
 `Current difficulty: ${(state.difficulty||'standard').toUpperCase()}`, `Save bytes: ${JSON.stringify(state).length}`,`Recorded quests: ${Object.keys(state.stages||{}).length}`,`Combat log entries: ${(state.recentCombat||[]).length}`,
 `Chapter state valid: ${state.chapter>=0&&state.chapter<CHAPTERS.length?'YES':'NO'}`,
 `Party HP bounded: ${state.party.every(p=>state.hp[p]>=0&&state.hp[p]<=state.maxhp[p])?'YES':'CHECK'}`,`Encounter roster audit: ${encounterAudit().unique}/24 unique · ${encounterAudit().eachRegionHasThree?'PASS':'CHECK'}`,`Recommended level: ${recommendedLevel()} · XP curve ×${xpCurveMultiplier().toFixed(2)}`,`Crossword validator: ${stage().puzzleData?validateCrosswordPuzzle(stage().puzzleData).ok?'PASS':'CHECK':'not generated'}`];
 report.forEach(line=>{const p=document.createElement('p');p.textContent=heroText(line);el.appendChild(p)});
 for(const [mode,label] of [['story','STORY · gentler incoming damage'],['standard','STANDARD · classic balance'],['veteran','VETERAN · stronger enemy attacks']]){
  const b=document.createElement('button');b.textContent=(state.difficulty===mode?'✓ ':'')+label;b.onclick=()=>{state.difficulty=mode;write();showReleaseHealth()};a.appendChild(b);
 }
 for(const [speed,label] of [['normal','BATTLE PACE · NORMAL'],['fast','BATTLE PACE · FAST']]){const q=document.createElement('button');q.textContent=(state.battleSpeed===speed?'✓ ':'')+label;q.onclick=()=>{state.battleSpeed=speed;write();showReleaseHealth()};a.appendChild(q)}
 const b=document.createElement('button');b.textContent='RETURN TO CHRONICLE';b.onclick=openHub;a.appendChild(b);
}
function playtestReport(){
 const milestones=CHAPTERS.map((c,i)=>{const st=state.stages[i]||{};return {chapter:i+1,name:c.name,boss:!!st.boss,ruins:!!st.ruins?.completed,story:st.saga?.step===3,town:i===0?!!st.willowTown?.completed:!!st.regionalTown?.ending,aftermath:!!st.regionalTown?.crisis?.ending,elite:!!st.eliteHunt}});
 return {edition:'Boss Atmosphere & Campaign QA / Roadmap batch',collectedAt:new Date().toISOString(),difficulty:state.difficulty||'standard',battleSpeed:state.battleSpeed||'normal',forgeShards:state.forgeShards||0,forgeCrafted:state.forgeQuest?.crafted||[],playtimeSeconds:state.activeSeconds||0,
 level:state.lv,steps:state.steps||0,wins:state.defeated||0,streak:state.bestStreak||0,clueHistorySize:(state.history||[]).length,
 achievements:state.achievements||[],milestones,enemyVictories:state.encounterWins||{},recentCombat:state.recentCombat||[]};
}
function exportPlaytestReport(){
 try{const blob=new Blob([JSON.stringify(playtestReport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lexicon-quest-playtest-chapter-'+(state.chapter+1)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 catch(e){const el=document.getElementById('hubDetails');const p=document.createElement('p');p.textContent='Report download unavailable on this device: '+e.message;el.append(p)}
}

function showReputationLedger(){
 view('hub');const el=$('#hubDetails'),a=$('#hubActions');el.replaceChildren();a.replaceChildren();
 const h=document.createElement('h3');h.textContent='REGIONAL REPUTATION & MILESTONES';el.append(h);
 CHAPTERS.forEach((c,i)=>{const r=regionalReputation(i),p=document.createElement('p');p.textContent=`${i+1}. ${c.name} · ${r.rank} (${r.score}/11)`;el.append(p)});
 const h2=document.createElement('h4');h2.textContent='RECENT MILESTONES';el.append(h2);
 for(const line of (state.milestoneNotices||[]).slice(-12).reverse()){const p=document.createElement('p');p.textContent=heroText(line);el.append(p)}
 const b=document.createElement('button');b.textContent='RETURN TO CHRONICLE';b.onclick=openHub;a.append(b);
}
function takeSanctuaryBlessing(){
 const chapter=state.chapter, key=String(chapter);state.sanctuaryBlessings=state.sanctuaryBlessings||{};
 const used=!!state.sanctuaryBlessings[key];
 if(!used){state.sanctuaryBlessings[key]=true;for(const p of state.party){state.hp[p]=state.maxhp[p];state.mp[p]=state.maxmp[p]}state.potions++;milestone(CHAPTERS[chapter].name+' sanctuary blessing received');write()}
 openHub();const p=document.createElement('p');p.textContent=used?'This region’s one-time blessing was already claimed.':'The sanctuary restores the party and grants one Potion. This blessing can only be claimed once in this region.';$('#hubDetails').append(p);
}
function showGameLegend(){
 view('hub');const details=document.getElementById('hubDetails'),actions=document.getElementById('hubActions');details.replaceChildren();actions.replaceChildren();
 const h=document.createElement('h3');h.textContent='CONTROLS & EXPLORATION LEGEND';details.append(h);
 const lines=[
 '▲ ◀ ▼ ▶ — move a tile; A — interact with a nearby object or person.',
 'N / 🧙 — regional guide; 📜 — crossword seal; 👹 — chapter boss; ⬇️ — regional ruins.',
 '❗ — optional word quest; 🏪 — shop; ✨ — sanctuary; 🎁 — treasure.',
 'Regional towns: 📜 lost record, ✨ connecting passage, 🚪 exit, decorated landmark — investigation.',
 'After town restoration, visit all THREE landmarks again to discover its aftermath crisis.',
 'During battle, enemies telegraph their next attack. Correct answers build FLOW; missed words reveal progressively stronger hints.',
 'In the Chronicle: SAVE GAME preserves progress on this device; TRANSFER SAVE moves a code between devices.'
 ];
 for(const line of lines){const p=document.createElement('p');p.textContent=heroText(line);details.append(p)}
 const b=document.createElement('button');b.textContent='RETURN TO CHRONICLE';b.onclick=openHub;actions.appendChild(b);
}


function showVisualSettings(){
 view('hub');const p=productionState(),details=$('#hubDetails'),actions=$('#hubActions');details.replaceChildren();actions.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='VISUAL & DIALOGUE SETTINGS';details.append(heading);
 const info=document.createElement('p');info.textContent='Text never advances automatically. Press Continue once to reveal a line, then again to advance. Scenes can always be skipped. Reduced-motion preferences show still artwork.';details.append(info);
 for(const [label,fn] of [
  ['DIALOGUE SPEED · '+(p.dialogueSpeed||'normal').toUpperCase(),()=>{const modes=['normal','fast','instant'];p.dialogueSpeed=modes[(modes.indexOf(p.dialogueSpeed||'normal')+1)%3];write();showVisualSettings()}],
  ['SCENE VIDEOS · '+(p.cinematics===false?'OFF':'ON'),()=>{p.cinematics=p.cinematics===false;write();showVisualSettings()}],
  ['VISUAL MOTION · '+(p.visualFx===false?'OFF':'ON'),()=>{p.visualFx=p.visualFx===false;write();update();showVisualSettings()}],
  ['RETURN TO CHRONICLE',openHub]
 ]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;actions.append(b)}
}
function showSceneGallery(){
 view('hub');const details=$('#hubDetails'),actions=$('#hubActions');details.replaceChildren();actions.replaceChildren();const h=document.createElement('h3');h.textContent='CHRONICLE SCENES';details.append(h);
 const info=document.createElement('p');info.textContent='Revisit places you have reached. Guardian scenes unlock after a victory.';details.append(info);
 for(let ch=0;ch<=state.chapter;ch++)for(const kind of ['chapter','boss']){if(kind==='boss'&&!state.stages[ch]?.boss)continue;const b=document.createElement('button');b.textContent=(ch+1)+'. '+CHAPTERS[ch].name+(kind==='boss'?' · GUARDIAN':' · ARRIVAL');b.onclick=()=>{cinematicContinue=()=>{update();showSceneGallery()};window.LexiconPresentation?.cinema({chapter:ch,title:kind==='boss'?CHAPTERS[ch].boss:CHAPTERS[ch].name,description:kind==='boss'?BOSS_SCENES[ch].line:CHAPTERS[ch].intro,kind})};actions.append(b)}
 const back=document.createElement('button');back.textContent='RETURN TO CHRONICLE';back.onclick=openHub;actions.append(back);
}

// Supported desktop-control bridge. Keeps the game state private while allowing
// an optional keyboard/mouse layer to invoke the same gameplay actions as touch.
window.LexiconDesktopAPI={
 get screen(){return screen},
 move(dx,dy){
  if(screen==='world')return move(dx,dy);
  if(screen==='ruins')return ruinMove(dx,dy);
  if(screen==='storyPlace')return storyPlaceMove(dx,dy);
  if(screen==='willowTown')return willowMove(dx,dy);
  if(screen==='regionalTown')return regionalMove(dx,dy);
 },
 interact(){
  if(screen==='world')return action();
  if(screen==='ruins')return ruinAction();
  if(screen==='storyPlace')return storyPlaceAction();
  if(screen==='willowTown')return willowAction();
  if(screen==='regionalTown')return regionalAction();
  if(screen==='dialog')return document.getElementById('next')?.click();
 },
 openChronicle(){if(screen==='world')return openHub()},
 position(kind){
  if(kind==='world'&&state)return{x:state.x,y:state.y};
  if(kind==='ruins'&&ruin)return{x:ruin.x,y:ruin.y};
  if(kind==='storyPlace'){const p=storyPlaceState();return{x:p.x,y:p.y}}
  if(kind==='willowTown'&&willowPos)return{x:willowPos.x,y:willowPos.y};
  if(kind==='regionalTown'&&regionalPos)return{x:regionalPos.x,y:regionalPos.y};
  return null;
 },
 columns(kind){
  if(kind==='world')return 12;
  if(kind==='ruins'||kind==='storyPlace')return 9;
  if(kind==='regionalTown')return 11;
  if(kind==='willowTown')return WILLOW_ROOMS[willowPos.room]?.map?.[0]?.length||11;
  return 0;
 }
};

// All expanded-map interactions call the original campaign functions through this bridge.
window.LexiconAudioBridge={state:()=>state,screen:()=>screen,boss:()=>!!battle?.boss,save:write,openSettings:()=>view('hub'),closeSettings:openHub};
window.LexiconExplorationBridge={
 state:()=>state,screen:()=>screen,save:write,heroName,stage,openMenu:openHub,
 chapterName:()=>CHAPTERS[state.chapter].name,bossName:()=>CHAPTERS[state.chapter].boss,guideName:()=>CHAPTERS[state.chapter].npc,townName:()=>state.chapter===0?'Willowmere':REGIONAL_TOWNS[state.chapter].name,
 townSpec(){if(state.chapter===0)return {name:'Willowmere · Lantern Square',room:willowPos.room,rooms:[],items:[],npcs:Object.entries(WILLOW_NPCS).flatMap(([room,npcs])=>npcs.map(n=>({...n,room})))};const d=regionalData();return {...d,room:regionalPos.room,npcs:d.people.map((name,room)=>({name,icon:d.icons[room],room}))}},
 message(text){if(screen==='willowTown')willowMessage(text);else if(screen==='regionalTown')regionalMsg(text);else say(text)},
 step(kind){state.steps=(state.steps||0)+1;if(kind==='willowTown')willowProgress().steps++;if(kind==='regionalTown')regionalState().steps++},
 worldEvent(type){for(let y=0;y<map().length;y++){const x=map()[y].indexOf(type);if(x<0)continue;state.x=x;state.y=y;explorationLegacyAction=true;try{action()}finally{explorationLegacyAction=false}if(screen==='world')draw();return}},
 enterTown(){state.chapter===0?enterWillowTown():enterRegionalTown()},
 exitTown(){if(screen==='willowTown'){const w=willowProgress();w.room=willowPos.room;w.x=willowPos.x;w.y=willowPos.y}else regionalSave();write();view('world');draw();say('You return to the regional roads.')},
 room(kind,room){if(kind==='willowTown'){const r=WILLOW_ROOMS[room]?room:'square';willowPos={room:r,x:r==='square'?6:5,y:r==='square'?7:5};const w=willowProgress();w.room=r;w.x=willowPos.x;w.y=willowPos.y;view('willowTown');drawWillowTown()}else{regionalPos={room:Math.max(0,Math.min(2,Number(room)||0)),x:5,y:5};regionalSave();view('regionalTown');drawRegionalTown()}write()},
 townTalk(kind,npc){if(kind==='willowTown')willowTalk(npc);else regionalTalk()},
 evidence(){regionalInspect();drawRegionalTown()},landmark(){regionalLandmark()},inspect(tile){willowInspect(tile);drawWillowTown()},
 secret(){const r=regionalPos.room,v=regionalState();if(!v.secretPaths?.includes(r)){regionalMsg('The concealed passage is sealed. Restore the town, then inspect its landmark.');return}v.secretCaches=v.secretCaches||[];if(v.secretCaches.includes(r)){regionalMsg('The emergency cache has already been collected.');return}v.secretCaches.push(r);state.gold+=18+state.chapter*3;state.ethers++;regionalSave();write();update();regionalMsg('SECRET PASSAGE · You find an emergency cache: gold and one Ether.')},
 cache(gold){state.gold+=gold;state.potions++;write();this.message('Traveler’s cache found: '+gold+' gold and one Potion.');update()},
 chat(name,text,kind){story([[name,'📜',text]],()=>{view(kind);kind==='willowTown'?drawWillowTown():drawRegionalTown()})},
 rest(kind){if(state.gold<15){this.message('A night at the inn costs 15 gold.');return}state.gold-=15;for(const p of state.party){state.hp[p]=state.maxhp[p];state.mp[p]=state.maxmp[p]}write();window.LexiconAudio?.playSting('rest');story([['INNKEEPER','🛏️','A warm meal and a quiet night. Your whole party is restored. Paid 15 gold.']],()=>{view(kind);kind==='willowTown'?drawWillowTown():drawRegionalTown();this.message('The party is fully rested. Safe travels!')})},
 shop(kind){openShop();$('#shopExit').onclick=()=>{view(kind);kind==='willowTown'?drawWillowTown():drawRegionalTown();$('#shopExit').onclick=()=>{view('world');draw()}}},
 forge(kind){forgeBoard();const b=document.createElement('button');b.textContent='RETURN TO THE PROVISIONER';b.onclick=()=>{view(kind);kind==='willowTown'?drawWillowTown():drawRegionalTown()};$('#hubActions').append(b)}
};

})();
