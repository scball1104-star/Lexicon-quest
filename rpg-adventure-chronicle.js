/* Lexicon Quest v50 / Living Bestiary
 * Records encounters organically, without changing combat outcome or save version.
 */
(function(root){
'use strict';
const LQ=root.LQ;if(!LQ?.Game)return;
const Game=LQ.Game,baseStart=Game.prototype.startBattle,baseWin=Game.prototype.win;
function book(s){if(!s.encounters||typeof s.encounters!=='object'||Array.isArray(s.encounters))s.encounters={};return s.encounters;}
function key(e,r){return (r||0)+':'+String(e.name||'Unknown').slice(0,60);}
function add(s,r,e,defeated){
 if(!e?.name)return;
 const b=book(s),k=key(e,r);
 if(!b[k]&&Object.keys(b).length>=80)return;
 const a=b[k]||{name:e.name,region:r,seen:0,wins:0,weak:e.weak||'none',resist:e.resist||'none',role:e.role||'enemy'};
 if(!defeated)a.seen++;else a.wins++;
 a.weak=e.weak||a.weak;a.resist=e.resist||a.resist;a.role=e.role||a.role;
 b[k]=a;
}
Game.prototype.startBattle=function(o){
 const result=baseStart.call(this,o);
 if(this.battle)for(const e of this.battle.enemies)add(this.s,this.battle.origin.r,e,false);
 return result;
};
Game.prototype.win=function(){
 const b=this.battle,r=b?.origin?.r,enemies=b?.enemies?.map(e=>({...e}))||[];
 const result=baseWin.call(this);
 if(Number.isInteger(r))for(const e of enemies)add(this.s,r,e,true);
 return result;
};
function entries(s){return Object.values(book(s)).sort((a,b)=>a.region-b.region||b.wins-a.wins||a.name.localeCompare(b.name));}
function stats(s){const e=entries(s);return {discovered:e.length,defeated:e.reduce((n,x)=>n+x.wins,0),regions:new Set(e.map(x=>x.region)).size};}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function html(s,regions){
 const list=entries(s),sum=stats(s);
 return '<section class="lq-codex-overview"><strong>'+sum.discovered+' creatures documented</strong><span>'+sum.defeated+' victories · '+sum.regions+'/8 regions</span></section>'+
 (list.length?'<div class="lq-codex-list">'+list.map(e=>'<article class="lq-codex-entry"><span class="lq-codex-region">'+esc(regions[e.region]?.name||'Unknown region')+'</span><h3>'+esc(e.name)+'</h3><div class="lq-codex-stats"><span>Seen '+e.seen+'</span><span>Defeated '+e.wins+'</span><span>'+esc(e.role)+'</span></div><p><b>Weakness:</b> '+esc(e.weak)+' <b>Resists:</b> '+esc(e.resist)+'</p></article>').join('')+'</div>':'<p class="panel">Your bestiary is empty. Explore the roads and dungeons to discover their creatures.</p>');
}
LQ.chronicle={book,add,entries,stats,html};
})(typeof window!=='undefined'?window:globalThis);
