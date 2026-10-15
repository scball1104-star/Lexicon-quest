/* Lexicon Quest v62 — original bestiary pixel atlas.
 * Eight realm-specific enemy families × four class silhouettes (hunter, mender,
 * warder, guardian). Authored in canvas primitives: no externally sourced art,
 * no generated images, and no changes to combat or save state.
 */
(function(root){
'use strict';
const SIZE=96;
const REALMS=[
 {name:'Rootbound',shadow:'#1c332f',body:'#425d3b',mid:'#70975a',light:'#a9be7a',eye:'#cbf3ad',iron:'#7d7360',sigil:'#dbcd8f'},
 {name:'Silverglass',shadow:'#233447',body:'#4e657d',mid:'#84a1b2',light:'#c6d7dd',eye:'#efddfb',iron:'#738ba4',sigil:'#d1b5ee'},
 {name:'Cinder',shadow:'#45272b',body:'#724436',mid:'#b8693d',light:'#f5b76e',eye:'#fff0b8',iron:'#81838b',sigil:'#ed8c57'},
 {name:'Drowned',shadow:'#203e4c',body:'#39717a',mid:'#72a6a0',light:'#a7d2be',eye:'#b7fff1',iron:'#6a8e91',sigil:'#e4dfad'},
 {name:'Sunpath',shadow:'#4d4034',body:'#786246',mid:'#b89662',light:'#e8c68e',eye:'#fff0c1',iron:'#a17b5d',sigil:'#b0e4e3'},
 {name:'Storm',shadow:'#2d3d55',body:'#536881',mid:'#88a9ba',light:'#d2e0d5',eye:'#d7f6ff',iron:'#9a9ab5',sigil:'#f2dfaa'},
 {name:'Stillheart',shadow:'#2c485a',body:'#5685a0',mid:'#92c1d5',light:'#d8f0f2',eye:'#fff',iron:'#a8b7d3',sigil:'#b5fbff'},
 {name:'Unwritten',shadow:'#332b45',body:'#65516e',mid:'#a08dab',light:'#dccad7',eye:'#fff7df',iron:'#8373a7',sigil:'#eea8d6'}
];
function rect(c,x,y,w,h,color){
 if(!c||typeof c.fillRect!=='function'||w<=0||h<=0)return;
 c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function poly(c,coords,color){
 if(!c?.beginPath||!coords?.length)return;
 c.fillStyle=color;c.beginPath();c.moveTo(Math.round(coords[0][0]),Math.round(coords[0][1]));
 for(let i=1;i<coords.length;i++)c.lineTo(Math.round(coords[i][0]),Math.round(coords[i][1]));
 c.closePath();c.fill();
}
function eye(c,x,y,p,boss){
 rect(c,x,y,boss?7:5,3,p.eye);rect(c,x+2,y,2,1,'#fff');
}
function stamp(c,region,p,cx,cy){
 const glow=p.sigil;
 switch(region){
  case 0: // Rootbound: living branches, leaf armor and heartwood.
   poly(c,[[20,42],[15,32],[17,24],[10,21],[14,19],[22,23],[27,35]],p.body);
   poly(c,[[76,42],[81,32],[79,24],[86,21],[82,19],[74,23],[69,35]],p.body);
   rect(c,19,26,7,2,p.light);rect(c,71,26,7,2,p.light);
   poly(c,[[46,36],[50,30],[54,37],[50,44]],glow);break;
  case 1: // Silverglass: fractured mirrored armor and crystalline crest.
   poly(c,[[19,47],[6,30],[29,35],[30,41]],p.mid);
   poly(c,[[77,47],[90,30],[67,35],[66,41]],p.mid);
   poly(c,[[48,8],[39,26],[48,22],[57,26]],p.light);
   poly(c,[[45,37],[54,32],[51,46]],glow);break;
  case 2: // Cinder: glowing magma vents and hammer-sized cheek guards.
   poly(c,[[21,44],[9,31],[12,18],[29,35]],p.mid);
   poly(c,[[75,44],[87,31],[84,18],[67,35]],p.mid);
   rect(c,16,29,5,9,p.eye);rect(c,76,29,5,9,p.eye);
   poly(c,[[48,38],[43,46],[49,43],[53,48],[56,36]],glow);break;
  case 3: // Drowned: water-worn fins, barnacle crown and sea-glass cuirass.
   poly(c,[[26,37],[11,27],[22,49]],p.mid);
   poly(c,[[70,37],[85,27],[74,49]],p.mid);
   poly(c,[[36,21],[30,13],[41,18],[48,9],[55,18],[65,13],[59,22]],p.light);
   rect(c,45,38,7,3,glow);break;
  case 4: // Sunpath: ceremonial scarab wings and desert sun disc.
   poly(c,[[29,39],[5,28],[10,55],[31,57]],p.mid);
   poly(c,[[67,39],[91,28],[86,55],[65,57]],p.mid);
   poly(c,[[48,10],[55,20],[48,26],[41,20]],glow);
   rect(c,46,38,5,10,p.light);break;
  case 5: // Storm: winged cuirass and wing-like wind vanes.
   poly(c,[[26,41],[8,12],[18,21],[12,18],[20,39]],p.mid);
   poly(c,[[70,41],[88,12],[78,21],[84,18],[76,39]],p.mid);
   poly(c,[[48,8],[58,25],[49,19],[38,25]],p.light);
   rect(c,45,37,7,4,glow);break;
  case 6: // Stillheart: jagged frozen tusks, aurora shard crown.
   poly(c,[[26,36],[13,14],[15,37],[8,34],[18,51]],p.light);
   poly(c,[[70,36],[83,14],[81,37],[88,34],[78,51]],p.light);
   poly(c,[[48,3],[41,23],[48,17],[55,23]],glow);
   rect(c,45,38,7,4,p.eye);break;
  case 7: // Unwritten: folded manuscript wings and unstable glyphs.
   poly(c,[[27,36],[4,24],[12,43],[8,53],[29,47]],p.mid);
   poly(c,[[69,36],[92,24],[84,43],[88,53],[67,47]],p.mid);
   poly(c,[[48,9],[36,18],[48,22],[60,18]],p.light);
   rect(c,46,35,4,11,glow);break;
 }
}
function classGear(c,role,p,boss){
 const rim='#192936';
 if(role==='mender'){
  rect(c,73,30,5,48,rim);rect(c,74,29,3,48,p.iron);
  poly(c,[[76,18],[85,25],[80,34],[72,34],[67,25]],p.light);
  rect(c,74,24,5,5,p.sigil);
  poly(c,[[37,61],[48,56],[59,61],[56,68],[40,68]],p.light);
 }else if(role==='warder'){
  poly(c,[[14,51],[31,45],[32,71],[23,81],[13,67]],rim);
  poly(c,[[17,53],[28,51],[28,70],[23,76],[17,64]],p.iron);
  rect(c,20,57,5,3,p.sigil);rect(c,21,62,3,8,p.light);
  rect(c,74,49,4,25,p.light);
 }else if(role==='hunter'){
  poly(c,[[75,30],[79,34],[64,73],[59,77],[62,68]],rim);
  poly(c,[[74,33],[76,35],[63,72],[61,71]],p.light);
  rect(c,75,29,5,9,p.iron);
  poly(c,[[18,37],[27,32],[30,40],[22,44]],p.mid);
 }else if(role==='guardian'||boss){
  poly(c,[[48,9],[54,18],[65,17],[59,27],[67,32],[48,31],[29,32],[37,27],[31,17],[42,18]],p.light);
  poly(c,[[48,14],[51,26],[45,26]],p.sigil);
  rect(c,14,44,9,24,p.iron);
  rect(c,73,44,9,24,p.iron);
 }
}
function renderFrame(c,realm=0,role='hunter',boss=false,seed=0){
 if(!c?.fillRect)return false;
 const region=((Math.floor(Number(realm)||0)%8)+8)%8,p=REALMS[region];
 const armor=role==='guardian'||boss,huge=armor?3:0;
 if(typeof c.save==='function')c.save();
 try{
  // A true silhouette, with separately designed realm heraldry.
  poly(c,[[30,38],[37,32],[59,32],[66,38],[78,65],[75,85],[22,85],[18,65]],'#17232e');
  poly(c,[[32,40],[43,35],[54,35],[65,40],[71,76],[24,76]],p.body);
  poly(c,[[30,56],[23,78],[30,82],[39,72],[48,85],[58,72],[67,82],[73,77],[64,52]],p.shadow);
  poly(c,[[42,50],[54,50],[62,75],[48,82],[34,75]],p.mid);
  poly(c,[[45,56],[51,56],[55,72],[48,77],[41,72]],p.body);
  // Pierced metal belt and pauldrons.
  rect(c,32,48,11,5,p.iron);rect(c,53,48,11,5,p.iron);
  rect(c,36,69,25,5,p.shadow);
  rect(c,45,69,7,5,p.sigil);
  poly(c,[[27,36],[35,31],[41,42],[34,52],[24,49]],p.iron);
  poly(c,[[69,36],[61,31],[55,42],[62,52],[72,49]],p.iron);
  rect(c,27,37,9,4,p.mid);rect(c,61,37,9,4,p.mid);
  // Hooded skull and recognizable face.
  poly(c,[[33,22],[41,16],[55,16],[63,22],[64,37],[55,46],[41,46],[32,37]],p.shadow);
  poly(c,[[39,20],[56,20],[61,27],[59,37],[53,41],[42,41],[36,35],[36,28]],p.body);
  poly(c,[[38,25],[57,25],[56,35],[48,39],[40,35]],p.shadow);
  poly(c,[[39,23],[46,20],[57,24],[58,28],[39,28]],p.mid);
  rect(c,43,30,4+huge,4,p.eye);
  rect(c,52,30,4+huge,4,p.eye);
  rect(c,47,36,4,2,p.light);
  rect(c,31,60,4,14,p.body);rect(c,62,60,4,14,p.body);
  stamp(c,region,p,48,48);
  // Realm sigils over the chest but behind weapons.
  if(region!==2){
   poly(c,[[47,52],[54,57],[48,65],[42,57]],p.sigil);
   rect(c,47,55,3,7,p.shadow);
  }
  classGear(c,role,p,boss);
  // Different monster variants have recognizable helm geometry.
  const variety=Math.abs(Math.floor(Number(seed)||0))%3;
  if(variety===1){
   poly(c,[[32,27],[28,18],[39,24]],p.light);
   poly(c,[[64,27],[68,18],[57,24]],p.light);
  }else if(variety===2){
   rect(c,37,22,22,5,p.light);
   rect(c,39,24,18,3,p.shadow);
   rect(c,46,18,5,4,p.sigil);
  }
  if(armor){
   rect(c,40,12,16,5,p.iron);
   rect(c,46,8,4,9,p.sigil);
   rect(c,19,55,5,21,p.light);
   rect(c,72,55,5,21,p.light);
  }
  return true;
 }finally{if(typeof c.restore==='function')c.restore();}
}
function classification(card){
 const label=card?.querySelector?.('.lq-foe-reading b')?.textContent?.toLowerCase()||'';
 if(/guardian/.test(label)||card?.querySelector?.('.enemy-art.boss'))return 'guardian';
 if(/healer|mender|support/.test(label))return 'mender';
 if(/defend|warder|protect/.test(label))return 'warder';
 return 'hunter';
}
function attach(stage){
 if(!stage?.querySelectorAll||!root.document)return 0;
 const realm=Math.min(7,Math.max(0,Number(stage.className.match(/(?:^|\s)realm-(\d+)(?:\s|$)/)?.[1]||0)));
 let done=0;
 for(const [i,card] of [...stage.querySelectorAll('.tactical-enemy')].entries()){
  const art=card.querySelector('.enemy-art');
  if(!art||art.querySelector('.v62-foe-canvas'))continue;
  const sprite=root.document.createElement('canvas');
  sprite.className='v62-foe-canvas';
  sprite.width=SIZE;sprite.height=SIZE;
  sprite.setAttribute('aria-hidden','true');
  const cx=sprite.getContext('2d');
  if(!cx||!renderFrame(cx,realm,classification(card),art.classList.contains('boss'),i))continue;
  art.appendChild(sprite);
  art.classList.add('v62-foe-painted');
  done++;
 }
 return done;
}
const api=Object.freeze({version:'v62',SIZE,REALMS,renderFrame,classification,attach});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQFoeAtlas=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
