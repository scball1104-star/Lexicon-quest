/* Original modern-pixel presentation layer. Gameplay and save IDs stay in game.js. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const regions=['Willowmere','Nameless Hollow','Emberpeak','Valewyn','Whispering Desert','Skybound Isles','Hollow North','First Library'];
  const colors=['#a4d9b5','#bdd8f3','#ffb679','#8edee6','#e8ca8f','#b8deff','#dceaff','#d9b6fa'];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let chapter=0,screen='title',settings={},typing=null,timer=null,cinemaCleanup=null,returnFocus=null,history=[];
  const ambient=document.createElement('video');ambient.setAttribute('id','dialogAmbient');ambient.setAttribute('aria-hidden','true');ambient.setAttribute('preload','none');ambient.muted=true;ambient.loop=true;ambient.playsInline=true;document.querySelector('.dialog-scene').appendChild(ambient);let ambientSource=null;ambient.onerror=()=>{ambient.hidden=true};

  const portraitIndex=id=>({Scott:0,SCOTT:0,Mira:1,MIRA:1,Bram:2,BRAM:2,'Elder Mael':3,'Mayor Elian':3,'Regent Lyra':4,'VEX QUILL':5,'Master Orin':6,'Keeper Orin':6,'Captain Aeris':4,'Nomad Sel':4,'Keeper Nox':7,'The First Keeper':7})[id]??(/Mara|Edda|Iris|Lyra|Sel|Sera/i.test(id)?4:/smith|forge|Orin|Tobin/i.test(id)?6:/keeper|scribe|archiv/i.test(id)?7:3);
  function setPortrait(el,index){el.style.backgroundPosition=`${(index%4)*100/3}% ${index<4?0:100}%`;el.dataset.portrait=String(index)}
  function sync(data){
    chapter=Math.max(0,Math.min(7,Number(data.chapter)||0));screen=data.screen||screen;settings=data.settings||{};
    document.body.dataset.region=String(chapter);document.body.dataset.screen=screen;
    document.body.style.setProperty('--region-color',colors[chapter]);
    document.body.style.setProperty('--scene-x',chapter%2?'100%':'0%');
    document.body.style.setProperty('--scene-y',`${Math.floor(chapter/2)*100/3}%`);
    byId('sceneRegion').textContent=regions[chapter];
    const disabled=settings.visualFx===false||reduced.matches;
    document.body.dataset.motion=disabled?'off':'on';
    if(disabled&&typing)reveal();
    if(screen==='dialog'&&!disabled&&settings.cinematics!==false){const src='assets/cinematics/chapter-'+(chapter+1)+'.mp4';ambient.hidden=false;if(ambientSource!==src){ambient.src=src;ambientSource=src}const playing=ambient.play();playing?.catch?.(()=>{ambient.hidden=true})}else{ambient.pause();if(ambientSource!==null){ambient.removeAttribute('src');ambient.load();ambientSource=null}ambient.hidden=true}
  }
  function stopTyping(){if(timer!==null)clearTimeout(timer);timer=null}
  function reveal(){if(!typing)return false;stopTyping();byId('dialogText').textContent=typing.text;byId('dialog').classList.remove('is-typing');byId('next').textContent='CONTINUE ▸';typing=null;return true}
  function dialogue({id,name,text,index,total}){
    stopTyping();typing=null;
    const p=byId('dialogPortrait');setPortrait(p,portraitIndex(id));
    const narrator=['NARRATOR','SYSTEM','GUIDE','TOWN CRIER'].includes(id);
    byId('dialog').dataset.narrator=narrator?'yes':'no';
    byId('dialogRole').textContent=narrator?'THE CHRONICLE':id==='SCOTT'?'WORD KNIGHT':id==='MIRA'?'LEXICON MAGE':id==='BRAM'?'RUNE GUARDIAN':'VOICE OF '+regions[chapter].toUpperCase();
    byId('dialogProgress').textContent=`${index} / ${total}`;
    history.push({name,text});if(history.length>60)history.shift();
    byId('dialogAnnouncement').textContent=name+': '+text;
    const speed=settings.dialogueSpeed||'normal';
    if(speed==='instant'||settings.visualFx===false||reduced.matches){byId('dialogText').textContent=text;byId('next').textContent='CONTINUE ▸';return}
    byId('dialogText').textContent='';typing={text,characters:Array.from(text),cursor:0};byId('dialog').classList.add('is-typing');byId('next').textContent='SHOW FULL LINE ▸';
    const step=()=>{if(!typing)return;const t=typing;t.cursor=Math.min(t.characters.length,t.cursor+(speed==='fast'?3:2));byId('dialogText').textContent=t.characters.slice(0,t.cursor).join('');if(t.cursor>=t.characters.length){reveal();return}timer=setTimeout(step,speed==='fast'?18:28)};
    step();
  }
  function hideLog(){byId('dialogLog').hidden=true;byId('dialogLogToggle').setAttribute('aria-expanded','false');byId('dialogLogToggle').focus()}
  byId('dialogLogToggle').onclick=()=>{reveal();const log=byId('dialogLog'),list=byId('dialogLogEntries');list.replaceChildren();for(const entry of history){const row=document.createElement('p'),name=document.createElement('strong');name.textContent=entry.name+': ';row.append(name,document.createTextNode(entry.text));list.append(row)}log.hidden=false;byId('dialogLogToggle').setAttribute('aria-expanded','true');byId('dialogLogClose').focus();list.scrollTop=list.scrollHeight};
  byId('dialogLogClose').onclick=hideLog;
  function finishCinema(){if(cinemaCleanup)cinemaCleanup();cinemaCleanup=null;byId('sceneVideo').pause();byId('sceneVideo').removeAttribute('src');byId('sceneVideo').load();byId('lqCinematic').hidden=true;window.LexiconAudio?.sync();if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null}
  function cinema({chapter:ch,title,description,kind='event'}){
    finishCinema();reveal();returnFocus=document.activeElement;sync({chapter:ch,screen,settings});
    const overlay=byId('lqCinematic'),video=byId('sceneVideo'),play=byId('scenePlay'),status=byId('sceneStatus');
    overlay.dataset.kind=kind;overlay.hidden=false;window.LexiconAudio?.sync();byId('lqCinemaTitle').textContent=title;byId('lqCinemaDescription').textContent=description;
    byId('sceneRegionLabel').textContent=regions[chapter].toUpperCase();play.hidden=true;status.textContent='';
    byId('lqCinemaNext').textContent='CONTINUE / SKIP ▸';
    video.hidden=false;
    const cleanup=()=>{video.onended=null;video.onerror=null;video.onplaying=null;play.onclick=null};cinemaCleanup=cleanup;
    const motionOff=settings.visualFx===false||reduced.matches;
    if(motionOff||settings.cinematics===false){video.hidden=true;status.textContent=motionOff?'Still scene · reduced motion':'Still scene · videos disabled';byId('lqCinemaNext').focus();return}
    video.src=`assets/cinematics/${kind==='boss'?'boss':'chapter'}-${chapter+1}.mp4`;video.muted=true;video.playsInline=true;
    video.onended=()=>{status.textContent='Scene complete';play.hidden=false;play.textContent='REPLAY SCENE'};
    video.onerror=()=>{video.hidden=true;status.textContent='Scene artwork shown · video unavailable';play.hidden=true};
    video.onplaying=()=>{play.hidden=true;status.textContent=''};
    const run=()=>{video.currentTime=0;const promise=video.play();if(promise?.catch)promise.catch(()=>{play.hidden=false;play.textContent='PLAY SCENE';status.textContent='Tap Play to start the scene'})};
    play.onclick=run;run();byId('lqCinemaNext').focus();
  }
  function closeDialogue(){reveal();byId('dialogLog').hidden=true;byId('dialogLogToggle').setAttribute('aria-expanded','false')}
  // Capture before gameplay handlers so an overlay never moves the party underneath it.
  window.addEventListener('keydown',e=>{
    const modal=!byId('lqCinematic').hidden?byId('lqCinematic'):!byId('dialogLog').hidden?byId('dialogLog'):null;
    if(!modal)return;
    if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button')].filter(el=>!el.hidden&&!el.disabled);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}return}
    if(['Escape','Enter',' ','e','E'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(modal.id==='dialogLog')hideLog();else byId('lqCinemaNext').click();return}
    if(!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){reveal();byId('sceneVideo').pause()}});
  window.LexiconPresentation={sync,dialogue,reveal,cinema,finishCinema,closeDialogue,resetHistory(){history=[];closeDialogue()}};
  sync({chapter:0,screen:'title',settings:{}});
})();
