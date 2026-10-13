(()=>{
'use strict';
const map=document.getElementById('map'),enemy=document.getElementById('sprite'),party=document.getElementById('party'),regional=document.getElementById('regionalGrid'),willow=document.getElementById('willowGrid');
if(!map||!enemy)return;

// Original procedural pixel-art character sheets. Each character has a two-frame walk/idle cycle.
const frames={
 hero:[
 ['....1111........','...122221.......','...122221.......','....2332........','...444444.......','..54444445......','..54444445......','...444444.......','...66..66.......','...66..66.......','..777..777......','..777..777......'],
 ['....1111........','...122221.......','...122221.......','....2332........','...444444.......','..54444445......','..54444445......','...444444.......','..66....66......','...66..66.......','...777..777.....','..777....777....']
 ],
 mira:[
 ['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..65555556......','..65555556......','...555555.......','....77.77.......','...77...77......','..888...888.....'],
 ['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..65555556......','..65555556......','...555555.......','...77...77......','....77.77.......','...888...888....']
 ],
 bram:[
 ['...111111.......','..12222221.......','..12233221.......','...244442........','..55555555......','.655555556......','.655555556......','..55555555......','..77....77......','..77....77......','.888....888.....'],
 ['...111111.......','..12222221.......','..12233221.......','...244442........','..55555555......','.655555556......','.655555556......','..55555555......','...77..77.......','..77....77......','..888..888......']
 ],
 npc:[['....1111........','...122221.......','...122221.......','....2222........','...555555.......','..55555555......','..55555555......','...555555.......','...66..66.......','...66..66.......']],
 residentGlass:[['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..65511556......','..65555556......','...555555.......','...77..77.......','..777..777......']],
 residentForge:[['....1111........','...122221.......','...122221.......','....2332........','..55555555......','..56666665......','..56611665......','...666666.......','...77..77.......','..777..777......']],
 residentTide:[['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..65555556......','..65511556......','...555555.......','...77..77.......','..777..777......']],
 residentSand:[['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..55566555......','..55666655......','...666666.......','...77..77.......','..777..777......']],
 residentSky:[['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..65555556......','..65555556......','...566665.......','...77..77.......','..777..777......']],
 residentFrost:[['....1111........','...122221.......','...122221.......','....2332........','..55555555......','..56666665......','..56666665......','...555555.......','...77..77.......','..777..777......']],
 residentLibrary:[['....1111........','...122221.......','...122221.......','....2332........','...555555.......','..65566556......','..65566556......','...555555.......','...77..77.......','..777..777......']],
 tree:[['.....33.........','...333333.......','..33333333......','...333333.......','..33333333......','...333333.......','....3333........','.....44.........','.....44.........','....4444........']],
 slime:[['................','................','.....3333.......','...33333333.....','..3333333333....','..3313331333....','..3333333333....','...33333333.....','....333333......','.....3333.......']],
 wraith:[['.....4444.......','....444444......','...44444444.....','...41144114.....','...44444444.....','..4444444444....','...44444444.....','....44..44......','...44....44.....']],
 wolf:[['...44.....44....','..4444...4444...','..4444444444....','...44444444.....','...44144144.....','...44444444.....','....433334......','....444444......','...44....44.....']],
 beetle:[['.....4444.......','....444444......','...44555544.....','..4455555544....','..4451551544....','..4455555544....','...44555544.....','....444444......','...44....44.....']],
 boss:[['......4444......','....44444444....','...4444444444...','..44411114444...','..44412214444...','...4444444444...','....44444444....','...4444444444...','..44.44..44.44..','.....44..44.....','....44....44....']],
 chest:[['................','................','..5555555555....','..5555555555....','..5444444455....','..5441144455....','..5441144455....','..5555555555....','..5555555555....']],
 shrine:[['......11........','.....1111.......','....111111......','...11111111.....','....111111......','.....1111.......','......11........','......44........','.....4444.......']],
 rune:[['.....4444.......','...44444444.....','..4411111144....','..4112222114....','..4122222214....','..4112222114....','..4411111144....','...44444444.....','.....4444.......']],
 shop:[['.....4444.......','....444444......','...44444444.....','..4444444444....','..5555555555....','..5511551155....','..5555555555....','..5555555555....','..5555555555....']],
 forest:[['...3333333......','..333333333.....','...3333333......','....33333.......','.....444........','.....444........','....44444.......']]
};
const palettes={
 hero:['','#edd5a2','#d8a07b','#4b3456','#3b5fb4','#bfb8d4','#283b6c','#e9e5c7'],
 mira:['','#efe0b5','#d7a081','#583d68','#4f4275','#6f57a8','#c7b5e8','#292340','#e9dcff'],
 bram:['','#e8d6b4','#b77f61','#523a37','#d7b47a','#5b6979','#8393a4','#2d3440','#c4cbd1'],
 npc:['','#e6cead','#bb8a66','#d9d5b4','#a1764d','#7c549d','#3e425e'],
 residentGlass:['','#e9d5bf','#c78e73','#4c536c','#dfeaf0','#799ab1','#b8d3df','#33485c'],
 residentForge:['','#e7c39c','#a96f51','#3f2d2a','#e19354','#7d3c2d','#46363b','#2d2a2c'],
 residentTide:['','#e6cfad','#ae8068','#314c62','#75c0cf','#3d7287','#b7dee3','#263f54'],
 residentSand:['','#e9ca97','#b9855f','#5d4334','#e5bd69','#a66f3e','#d8a858','#4d362b'],
 residentSky:['','#efdbb5','#be8768','#435c77','#8fc5e8','#5b8bb3','#d1ecff','#324b65'],
 residentFrost:['','#f0dcc0','#bd8e78','#475765','#d8e7f3','#93aec4','#f5fbff','#374958'],
 residentLibrary:['','#e9d5b3','#b98567','#4e3a5d','#8f72b2','#6a4f8d','#d7c4e6','#362944'],
 tree:['','#e3d693','#b3cf8e','#1e6749','#79573c'],slime:['','#162b2d','#f8e5b0','#71c993','#418766'],wraith:['','#efeaad','#d89f89','#6e669f','#4e437d'],wolf:['','#e4edea','#3b425b','#c5d8d8','#839ba8'],beetle:['','#eac97b','#8aa7a6','#343b57','#7d809a','#aeb3c5'],boss:['','#f9e59f','#f0b06c','#6f2c61','#37294e'],chest:['','#fff0a4','#a4ddcc','#f0d26b','#80502f','#c99647'],shrine:['','#f1df8a','#b8d9e3','#b8beef','#8a78b3'],rune:['','#fae5b0','#a3b9ea','#514273','#9985c5'],shop:['','#f5e8aa','#d8a76a','#755139','#bd915f','#876044'],forest:['','#fff0af','#baddad','#286b50','#70523c']
};
const residentKinds=['npc','residentGlass','residentForge','residentTide','residentSand','residentSky','residentFrost','residentLibrary'];
function drawRows(cv,kind,frameIndex=0){
 const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
 if(['hero','mira','bram','npc',...residentKinds.slice(1)].includes(kind)){drawCharacter(c,kind,frameIndex);return}
 const sheet=frames[kind]||frames.rune,rows=sheet[frameIndex%sheet.length],pal=palettes[kind]||palettes.rune;
 const scale=cv.width/16;c.save();c.scale(scale,scale);rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='.'&&pal[Number(v)]){c.fillStyle=pal[Number(v)];c.fillRect(x,y,1,1)}}));c.restore();
}
function drawCharacter(c,kind,frame){
 const hero=kind==='hero',mage=kind==='mira',guard=kind==='bram',pal=palettes[kind]||palettes.npc;
 const color=hero?'#426fab':mage?'#725399':guard?'#819098':pal[4]||'#5d795b',trim=hero?'#d9c394':mage?'#d9b9eb':guard?'#ddba78':'#d1bb88';
 const bob=frame%2,leg=frame%2?1:-1;
 const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y+bob,w,h)};
 r(9,24,5,6,'#162239');r(19,24,5,6,'#162239');r(8,29+leg,7,2,'#a3abb5');r(18,29-leg,7,2,'#a3abb5');
 r(7,12,20,16,'#172032');r(9,13,16,14,color);r(10,16,3,10,trim);r(21,16,2,10,'#263553');
 r(5,14,5,10,color);r(24,14,4,10,color);r(5,23,4,3,pal[2]);r(24,23,4,3,pal[2]);
 r(10,3,13,12,'#282338');r(12,5,9,9,pal[1]);r(13,8,8,6,pal[2]);r(13,5,8,4,pal[1]);
 r(10,2,12,5,mage?'#45304f':guard?'#5c534c':'#443134');r(9,4,4,7,mage?'#45304f':guard?'#5c534c':'#443134');
 r(13,9,2,2,'#101c31');r(19,9,2,2,'#101c31');r(14,9,1,1,'#d2e9eb');r(20,9,1,1,'#d2e9eb');r(16,13,3,1,'#b97b6a');
 r(8,14,6,4,trim);r(21,14,5,4,trim);r(10,14,3,1,'#f4e7c6');r(22,14,3,1,'#f4e7c6');r(11,24,12,2,'#675236');r(16,24,3,2,'#dfc888');
 if(hero){r(28,12,2,16,'#afb9c9');r(29,10,1,14,'#edf2df');r(26,23,6,2,'#dab978');r(28,25,2,4,'#6b4836')}
 if(mage){r(28,12,2,18,'#bb9b65');r(26,9,6,5,'#b7a0e1');r(28,7,2,8,'#e4d5fa');r(10,6,2,18,'#45304f')}
 if(guard){r(2,17,8,13,'#d2b37a');r(3,18,6,10,'#556d86');r(5,20,2,6,'#d2b37a');r(12,13,10,3,'#5c534c')}
 if(kind==='npc'){r(10,1,13,4,'#d9dfc9');r(11,12,11,6,'#d9dfc9');r(14,16,5,3,'#b8c3ac')}
}
function bitmap(kind,{animated=false,dir='right',frame=0}={}){const cv=document.createElement('canvas');cv.width=32;cv.height=32;cv.className='pixel-sprite';cv.dataset.kind=kind;cv.dataset.animated=animated?'yes':'no';cv.dataset.dir=dir;cv.setAttribute('aria-hidden','true');drawRows(cv,kind,frame);if(dir==='left')cv.style.transform='scaleX(-1)';return cv}

// Eight bespoke procedural terrain sets: Willowmere forest, Mirror Court, Emberpeak forge,
// Valewyn flood keep, desert observatory, floating isles, Hollow North, First Library.
const terrain=[
 {floor:['#47624d','#5c765a','#708765'],wall:['#2c3b33','#3d5042'],accent:'#8eae75',motif:'leaf'},
 {floor:['#596b79','#718690','#8297a1'],wall:['#2c3546','#47546b'],accent:'#c7e0e8',motif:'mirror'},
 {floor:['#6b493b','#7d5442','#8d604a'],wall:['#362923','#4e3228'],accent:'#e2874d',motif:'ember'},
 {floor:['#356779','#477e8d','#5593a0'],wall:['#233d4c','#31576a'],accent:'#91d1dc',motif:'water'},
 {floor:['#917b54','#a58c60','#b69b6a'],wall:['#514631','#67583b'],accent:'#d6ba75',motif:'star'},
 {floor:['#557b98','#6b91ad','#82a8c1'],wall:['#30465c','#3f607a'],accent:'#d3efff',motif:'cloud'},
 {floor:['#7d96a9','#96acbc','#aebfcb'],wall:['#455867','#5d7080'],accent:'#edf7ff',motif:'snow'},
 {floor:['#625277','#77638e','#8b74a1'],wall:['#332b40','#493b59'],accent:'#d8bdf0',motif:'rune'}
];
function terrainBitmap(biome,wall=false,variant=0){
 const cv=document.createElement('canvas');cv.width=32;cv.height=32;cv.className='pixel-tile terrain-underlay';cv.setAttribute('aria-hidden','true');
 const c=cv.getContext('2d'),t=terrain[biome]||terrain[0],p=wall?t.wall:t.floor;
 const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
 r(0,0,32,32,p[0]);
 if(wall){
  r(0,0,32,5,'#111c28');r(0,5,32,3,p[1]);
  for(let y=8;y<32;y+=8)for(let x=-((y/8)%2)*8;x<32;x+=16){r(x,y,15,7,p[1]);r(x+1,y,13,1,t.accent+'55');r(x,y+6,15,1,'#07101b66')}
  if(biome===0){r(0,5,32,5,'#284337');for(let x=0;x<32;x+=6)r(x,4,4,3,'#516e45')}
  if(biome===2){r(4,10,2,14,'#ee924955');r(22,4,1,20,'#ee924955')}
  return cv;
 }
 // Region-specific stone, grass, water channels, sand, decks, and snow.
 if(biome===0){for(let i=0;i<12;i++){const x=(i*13+variant*3)%31,y=(i*7+variant*5)%30;r(x,y,2,3,i%2?p[1]:p[2]);r(x+1,y-1,1,2,t.accent+'66')}}
 else if(biome===4){for(let y=4;y<32;y+=8){r((y+variant)%7,y,25,1,p[1]);r(8,y+1,17,1,t.accent+'33')}r(5+variant%20,12,2,1,p[2])}
 else if(biome===5){for(let x=0;x<32;x+=8){r(x,0,7,32,p[1]);r(x+1,0,1,32,t.accent+'22');r(x+6,0,1,32,'#17324566')}for(let x=3;x<32;x+=8){r(x,3,1,1,'#d3c392');r(x,27,1,1,'#d3c392')}}
 else if(biome===6){for(let i=0;i<10;i++)r((i*11+variant)%32,(i*7+variant)%32,3,2,i%2?p[1]:p[2]);r(5,9,8,1,'#edf7ff88');r(18,23,6,1,'#edf7ff55')}
 else{for(let y=0;y<32;y+=8)for(let x=-((y/8)%2)*8;x<32;x+=16){r(x,y,15,7,p[1]);r(x+1,y,13,1,t.accent+'44');r(x+1,y+6,13,1,'#17202b55')}if(biome===3){r(0,14,32,3,'#56adc166');r(2,15,9,1,'#b5e6ed88');r(18,16,12,1,'#b5e6ed44')}if(biome===7){r(7,8,4,1,t.accent);r(9,6,1,5,t.accent);r(23,24,1,5,t.accent+'66')}}
 return cv;
}
function objectBitmap(type){
 const cv=document.createElement('canvas');cv.width=32;cv.height=32;cv.className='tile-object';cv.setAttribute('aria-hidden','true');const c=cv.getContext('2d');
 const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
 const gold='#e1c48b',light='#f3e6c2',dark='#554839',blue='#90bfd5';
 if(type==='door'){r(6,3,20,27,'#36404b');r(9,6,14,24,'#745847');r(9,6,14,2,gold);r(20,18,2,2,gold);r(5,29,22,2,'#202936')}
 else if(type==='key'){r(6,6,10,10,gold);r(9,9,4,4,dark);r(14,14,3,12,gold);r(17,22,6,3,gold);r(17,18,4,2,gold)}
 else if(type==='lever'){r(8,23,18,5,'#768c96');r(12,17,9,7,'#3b5263');r(15,8,3,14,gold);r(12,5,9,5,'#d5997a')}
 else if(type==='mirror'){r(7,3,18,23,gold);r(10,6,12,17,'#7197b4');r(12,8,2,12,'#d1eaf5');r(14,26,4,3,gold);r(9,29,14,2,gold)}
 else if(type==='scroll'){r(8,5,17,21,light);r(5,4,20,4,gold);r(8,25,20,4,gold);for(let y=11;y<23;y+=4)r(11,y,10-(y%3),1,dark)}
 else if(type==='bridge'){r(1,7,30,19,'#856549');for(let x=3;x<32;x+=6)r(x,8,4,17,'#bc976f');r(0,3,32,3,dark);r(0,28,32,3,dark)}
 else if(type==='warning'){r(14,5,5,5,gold);r(10,10,13,6,gold);r(5,16,23,10,gold);r(15,10,3,9,dark);r(15,22,3,2,dark)}
 else{r(13,5,6,22,blue);r(8,11,16,10,blue);r(5,14,22,4,'#6d9cb8');r(14,7,4,17,light);r(11,13,10,4,light)}
 return cv;
}
function iconType(text){return /🚪|⬇|🔓/.test(text)?'door':/🔑/.test(text)?'key':/⚙|🎛/.test(text)?'lever':/📜|🔤|🔍/.test(text)?'scroll':/🪞/.test(text)?'mirror':/🌉|🌊/.test(text)?'bridge':/⚠/.test(text)?'warning':'crystal'}

function bossPortrait(biome){
 const cv=document.createElement('canvas');cv.width=24;cv.height=24;cv.className='pixel-sprite boss-portrait';cv.dataset.kind='bossPortrait';cv.dataset.animated='yes';cv.setAttribute('aria-hidden','true');const c=cv.getContext('2d');
 const sets=[['#2c1730','#743f78','#e4c768','#efe6bd'],['#233747','#63899c','#cce6ea','#9276ad'],['#3b201b','#9a472d','#ef8f4c','#f4d37d'],['#18374a','#286d81','#81d5dd','#d5f1e8'],['#443725','#9e7b47','#e5bf69','#efe1a9'],['#25364e','#477ca6','#a4d5f2','#e7f5ff'],['#304450','#6f91a7','#d7edf7','#ffffff'],['#2d2139','#68477e','#c58ede','#f2d7ff']];const p=sets[biome]||sets[0];
 c.fillStyle=p[0];c.fillRect(5,4,14,15);c.fillRect(7,2,10,3);c.fillRect(4,8,2,7);c.fillRect(18,8,2,7);c.fillStyle=p[1];c.fillRect(6,6,12,10);c.fillRect(8,17,8,4);
 c.fillStyle=p[2];if(biome===0){c.fillRect(7,4,2,5);c.fillRect(15,4,2,5);c.fillRect(5,2,2,3);c.fillRect(17,2,2,3)}else if(biome===1){c.fillRect(4,5,4,1);c.fillRect(16,5,4,1);c.fillRect(10,2,1,18);c.fillRect(12,2,1,18)}else if(biome===2){c.fillRect(7,1,2,5);c.fillRect(15,1,2,5);c.fillRect(3,3,3,3);c.fillRect(18,3,3,3)}else if(biome===3){c.fillRect(6,3,12,2);c.fillRect(5,18,14,2);c.fillRect(3,20,4,1);c.fillRect(17,20,4,1)}else if(biome===4){for(const [x,y] of [[6,3],[11,1],[16,4],[3,9],[20,10]])c.fillRect(x,y,1,1)}else if(biome===5){c.fillRect(3,6,4,2);c.fillRect(17,6,4,2);c.fillRect(2,10,3,1);c.fillRect(19,10,3,1)}else if(biome===6){c.fillRect(5,3,14,2);c.fillRect(4,15,16,2);c.fillRect(7,20,3,2);c.fillRect(14,20,3,2)}else{c.fillRect(3,3,2,16);c.fillRect(19,3,2,16);c.fillRect(7,1,10,2);c.fillRect(7,20,10,2)}
 c.fillStyle=p[3];c.fillRect(8,9,2,2);c.fillRect(14,9,2,2);c.fillRect(10,14,4,1);return cv}
function artFor(t,done){if(done)return null;return ({N:'npc',S:'shop',M:'slime',B:'boss',P:'rune',H:'shrine',Q:'npc',T:'chest',t:'tree',g:'forest'})[t]||null}
let lastHeroIndex=-1,lastDirection='right';
function repaintMap(){const biome=Math.max(0,Math.min(7,Number(map.dataset.biome)||0));let heroIndex=-1;[...map.children].forEach((cell,i)=>{if(cell.textContent.includes('🎤'))heroIndex=i});if(lastHeroIndex>=0&&heroIndex>=0){const d=heroIndex-lastHeroIndex;if(d===1)lastDirection='right';else if(d===-1)lastDirection='left';else if(Math.abs(d)>=12)lastDirection='down'}if(heroIndex>=0)lastHeroIndex=heroIndex;
 [...map.children].forEach((cell,i)=>{if(cell.querySelector('canvas'))return;const ch=cell.dataset.type,text=cell.textContent,hero=text.includes('🎤'),resident=text.includes('🧑‍🌾'),done=text===''&&'MBT'.includes(ch),kind=hero?'hero':resident?residentKinds[biome]:artFor(ch,done);cell.textContent='';cell.appendChild(terrainBitmap(biome,cell.classList.contains('wall'),i));if(kind)cell.appendChild(bitmap(kind,{animated:hero||resident,dir:hero?lastDirection:'right'}));else if(text.trim()&&!cell.classList.contains('wall'))cell.appendChild(objectBitmap(iconType(text)));cell.setAttribute('aria-label',hero?'Hero':resident?'Resident':ch==='N'?'Local guide':ch==='B'?'Chapter boss':cell.classList.contains('wall')?'Wall':ch==='D'?'Dungeon entrance':'Regional terrain');});}
function repaintEnemy(){
 if(!enemy.textContent.trim()||enemy.querySelector('.boss-art,.enemy-art'))return;
 const name=(document.getElementById('enemy')?.textContent||'').toUpperCase(),arena=document.querySelector('.battle-arena'),biome=Math.max(0,Math.min(7,Number(arena?.dataset.foeChapter??map.dataset.biome)||0));enemy.textContent='';
 const boss=arena?.dataset.boss==='yes',idx=boss?biome:/SLIME/.test(name)?0:/PHANTOM|WHITEOUT/.test(name)?7:/WRAITH|SPECTER|SHADE|DOPPEL/.test(name)?1:/WOLF/.test(name)?2:/BEETLE/.test(name)?3:/KNIGHT|SENTINEL/.test(name)?5:/ROC|WYVERN|HARRIER/.test(name)?6:4;
 const art=document.createElement('div');art.className=boss?'boss-art':'enemy-art';art.style.backgroundPosition=`${idx%4*100/3}% ${idx<4?0:100}%`;art.setAttribute('aria-hidden','true');if(!boss)art.style.filter=`hue-rotate(${[0,25,-15,115,30,170,185,230][biome]}deg) drop-shadow(0 13px 6px #0009)`;enemy.appendChild(art);
}
function repaintParty(){if(!party)return;party.querySelectorAll('.party-pixel').forEach(slot=>{if(slot.querySelector('canvas'))return;const n=slot.dataset.party,kind=n==='Mira'?'mira':n==='Bram'?'bram':'hero';slot.appendChild(bitmap(kind,{animated:true}))})}
function repaintTown(grid,chapter){
 if(!grid)return;[...grid.children].forEach((cell,i)=>{if(cell.querySelector('canvas'))return;const text=cell.textContent,hero=cell.classList.contains('hero'),resident=cell.classList.contains('resident')||/🧑|🧙/.test(text);cell.textContent='';cell.appendChild(terrainBitmap(chapter,cell.classList.contains('wall'),i));if(hero||resident){const sprite=bitmap(hero?'hero':residentKinds[Math.max(0,Math.min(7,chapter))],{animated:true});sprite.classList.add('tile-object');cell.appendChild(sprite)}else if(text.trim()){const kind=/🎁/.test(text)?'chest':/🌲|🌳/.test(text)?'tree':/🏪|🏠/.test(text)?'shop':null;if(kind){const sprite=bitmap(kind);sprite.classList.add('tile-object');cell.appendChild(sprite)}else cell.appendChild(objectBitmap(iconType(text)))}
 });
}
new MutationObserver(repaintMap).observe(map,{childList:true});new MutationObserver(repaintEnemy).observe(enemy,{childList:true,characterData:true});if(party)new MutationObserver(repaintParty).observe(party,{childList:true,subtree:true});
for(const id of ['regionalGrid','willowGrid','storyPlaceGrid','ruinGrid']){const grid=document.getElementById(id);if(grid)new MutationObserver(()=>repaintTown(grid,Number(document.body.dataset.region)||0)).observe(grid,{childList:true})}
repaintMap();repaintParty();
let frameTick=0;setInterval(()=>{if(document.hidden||document.body.dataset.motion==='off'||document.body.dataset.visualFx==='off')return;frameTick++;document.querySelectorAll('canvas.pixel-sprite[data-animated="yes"]').forEach(cv=>{const kind=cv.dataset.kind||'hero';if(kind==='bossPortrait')return;drawRows(cv,kind,frameTick);});},340);

const motionStyle=document.createElement('style');motionStyle.textContent=`
@keyframes lq-foe-lunge{50%{transform:translateX(-7px) scale(1.1)}}@keyframes lq-foe-skitter{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}@keyframes lq-foe-float{50%{transform:translateY(-7px)}}
@keyframes lq-hit{30%{transform:translateX(-5px);filter:brightness(1.8)}60%{transform:translateX(4px)}}@keyframes lq-heal{50%{filter:brightness(1.4) drop-shadow(0 0 8px #9ef1b2)}}@keyframes lq-guard{50%{box-shadow:inset 0 0 0 4px #9ed4ff,0 0 10px #82bfff}}@keyframes lq-silence{50%{filter:saturate(.25) brightness(1.25)}}
@keyframes lq-weather-drift{from{background-position:0 0}to{background-position:28px 45px}}@keyframes lq-weather-side{from{background-position:0 0}to{background-position:55px 12px}}
#map{position:relative}#map .pixel-sprite,.pixel-tile{image-rendering:pixelated;width:88%;height:88%}.pixel-tile{opacity:.96}#sprite .pixel-sprite{animation:lq-foe-float 1.25s steps(4,end) infinite}.boss-portrait{width:138px!important;height:138px!important}.party-pixel{display:inline-grid;width:28px;height:28px;vertical-align:middle;margin-right:5px}.party-pixel .pixel-sprite{width:28px;height:28px;image-rendering:pixelated}#sprite .pixel-sprite[data-creature=wolf]{animation:lq-foe-lunge 1.1s steps(3,end) infinite}#sprite .pixel-sprite[data-creature=beetle]{animation:lq-foe-skitter .65s steps(3,end) infinite}
.battle-arena[data-status="hit"]{animation:lq-hit .32s steps(3,end)}.battle-arena[data-status="heal"]{animation:lq-heal .52s steps(3,end)}.battle-arena[data-status="guard"]{animation:lq-guard .52s steps(3,end)}.battle-arena[data-status="silence"]{animation:lq-silence .52s steps(3,end)}
#map[data-weather-phase="1"]::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:8;opacity:.28;background-size:18px 18px;animation:lq-weather-drift 1.5s linear infinite}#map[data-weather="mist"][data-weather-phase="1"]::after{background:repeating-linear-gradient(0deg,#d8eef222 0 3px,transparent 3px 10px)}#map[data-weather="shimmer"][data-weather-phase="1"]::after{background:radial-gradient(circle,#e9fbff88 0 1px,transparent 2px);background-size:22px 22px}#map[data-weather="ash"][data-weather-phase="1"]::after{background:radial-gradient(circle,#f0b06a99 0 1px,transparent 2px);background-size:16px 16px}#map[data-weather="rain"][data-weather-phase="1"]::after{background:repeating-linear-gradient(110deg,transparent 0 8px,#a9e3ff55 9px 10px);animation:lq-weather-side .7s linear infinite}#map[data-weather="sand"][data-weather-phase="1"]::after{background:repeating-linear-gradient(12deg,transparent 0 10px,#e9ca7755 11px 12px);animation:lq-weather-side .8s linear infinite}#map[data-weather="wind"][data-weather-phase="1"]::after{background:repeating-linear-gradient(0deg,transparent 0 12px,#e8f7ff44 13px 14px);animation:lq-weather-side .6s linear infinite}#map[data-weather="snow"][data-weather-phase="1"]::after{background:radial-gradient(circle,#ffffffcc 0 1px,transparent 2px);background-size:14px 14px}#map[data-weather="motes"][data-weather-phase="1"]::after{background:radial-gradient(circle,#d6b4ff99 0 1px,transparent 2px);background-size:19px 19px}
@media(prefers-reduced-motion:reduce){#sprite .pixel-sprite,.battle-arena,#map::after{animation:none!important}}body[data-visual-fx="off"] #sprite .pixel-sprite,body[data-visual-fx="off"] #map::after{animation:none!important}body[data-visual-fx="off"] #map::after{display:none}
`;document.head.insertBefore(motionStyle,document.querySelector('link[href="presentation.css"]'));

const battleMessage=document.getElementById('battleMsg'),battleArena=document.querySelector('.battle-arena');if(battleMessage&&battleArena)new MutationObserver(()=>{const t=battleMessage.textContent||'';let fx=/heal|restore|mend/i.test(t)?'heal':/silence|interrupt|ritual collapses/i.test(t)?'silence':/guard|ward|barrier|brace/i.test(t)?'guard':/damage|strike|takes|attack/i.test(t)?'hit':'';if(!fx)return;battleArena.dataset.status=fx;setTimeout(()=>{if(battleArena.dataset.status===fx)delete battleArena.dataset.status},560)}).observe(battleMessage,{childList:true,characterData:true,subtree:true});
// Existing WebAudio themes remain intentionally synthesized and copyright-free.
const audio={ctx:null,enabled:false,interval:null,index:0,gain:.35};
const themes=[[196,246.94,293.66,369.99,329.63,293.66,246.94,196],[220,261.63,311.13,261.63,220,196,174.61,196],[164.81,196,246.94,329.63,293.66,246.94,196,164.81],[174.61,220,261.63,349.23,329.63,261.63,220,174.61],[146.83,174.61,220,293.66,261.63,220,174.61,146.83],[246.94,293.66,369.99,493.88,440,369.99,293.66,246.94],[130.81,155.56,196,233.08,196,174.61,155.56,130.81],[164.81,246.94,329.63,493.88,440,329.63,246.94,164.81]];
function tone(hz,dur=.16,volume=.022,type='triangle'){if(!audio.ctx)return;volume*=audio.gain;const t=audio.ctx.currentTime,osc=audio.ctx.createOscillator(),gain=audio.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(hz,t);gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.014);gain.gain.exponentialRampToValueAtTime(.001,t+dur);osc.connect(gain);gain.connect(audio.ctx.destination);osc.start(t);osc.stop(t+dur+.02)}
function step(){if(!audio.enabled||document.hidden||window.LexiconAudio&&!window.LexiconAudio.shouldSynthesize())return;const biome=Math.min(7,Math.max(0,Number(document.body.dataset.region)||0)),notes=themes[biome],dungeon=document.getElementById('ruins')&&!document.getElementById('ruins').classList.contains('hidden'),fighting=document.getElementById('combat')&&!document.getElementById('combat').classList.contains('hidden'),interior=['willowTown','regionalTown','storyPlace'].some(id=>{const e=document.getElementById(id);return e&&!e.classList.contains('hidden')}),motif=fighting?[392,311.13,349.23,261.63,392,440,311.13,493.88]:dungeon?[146.83,174.61,220,174.61,130.81,164.81,196,164.81]:notes,note=motif[audio.index++%motif.length];tone(note,fighting?.12:interior?.24:.19,fighting?.018:interior?.012:.022);
 if(document.body.dataset.audioMix!=='simple'){
  if(audio.index%4===0)tone(note/2,fighting?.22:.3,fighting?.012:.009,'square');
  if(interior&&audio.index%6===0)tone([98,110,123.47,130.81,146.83,164.81,174.61,196][biome],.42,.006,'sine');
  if(fighting){if(audio.index%2===0)tone(note/4,.07,.010,'square');if(audio.index%8===0)tone(note*2,.09,.007,'sawtooth')}
  else if(audio.index%4===0)tone(note*1.5,.11,.005,'sine');
 }
}
function setMusic(on){if(on){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio.ctx=audio.ctx||new C();audio.ctx.resume();audio.enabled=true;if(!audio.interval)audio.interval=setInterval(step,245)}catch(e){audio.enabled=false}}else{audio.enabled=false;if(audio.interval)clearInterval(audio.interval);audio.interval=null}musicButton.textContent=audio.enabled?'MUSIC: ON':'MUSIC: OFF'}
const musicButton=document.createElement('button');musicButton.type='button';musicButton.id='musicToggle';musicButton.textContent='MUSIC: OFF';musicButton.addEventListener('click',()=>window.LexiconAudio?window.LexiconAudio.toggleMusic():setMusic(!audio.enabled));const hubActions=document.getElementById('hubActions');if(hubActions){hubActions.prepend(musicButton);new MutationObserver(()=>{if(!hubActions.contains(musicButton))hubActions.prepend(musicButton)}).observe(hubActions,{childList:true});}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&audio.ctx)audio.ctx.suspend();else if(audio.enabled&&audio.ctx)audio.ctx.resume()});
window.LexiconSynth={set(on,volume){audio.gain=Math.max(0,Math.min(1,volume));if(audio.enabled!==on)setMusic(on)}};
window.LexiconAudio?.sync();
window.LexiconPixelArt={bitmap,terrainBitmap,objectBitmap};
})();
