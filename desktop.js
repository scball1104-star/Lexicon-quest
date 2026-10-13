/* Lexicon Quest desktop controls: keyboard + mouse, layered on top of touch controls. */
(() => {
  'use strict';
  const app=document.getElementById('app');
  if(!app)return;
  const api=()=>window.LexiconDesktopAPI;
  const currentScreen=()=>api()?.screen||'title';
  const finePointer=window.matchMedia?window.matchMedia('(hover:hover) and (pointer:fine)'):{matches:true};
  const editing=target=>{const tag=target&&target.tagName;return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(target&&target.isContentEditable)};
  const visible=el=>!!(el&&!el.disabled&&!el.hidden&&el.getClientRects().length&&!el.closest('.hidden'));

  const help=document.createElement('aside');
  help.id='desktopHelp';help.className='desktop-help';help.setAttribute('aria-label','Desktop controls');
  help.innerHTML=`<button type="button" id="desktopHelpToggle" class="desktop-help-toggle" aria-expanded="true" title="Toggle desktop controls (?)">KEYBOARD</button><div id="desktopHelpBody" class="desktop-help-body"><div><kbd>WASD</kbd>/<kbd>↑↓←→</kbd> Move</div><div><kbd>E</kbd>/<kbd>Space</kbd> Interact</div><div><kbd>Shift</kbd> Run · <kbd>G</kbd> Area map</div><div><kbd>M</kbd> Chronicle</div><div><kbd>1–9</kbd> Choices / battle commands</div><div><kbd>Esc</kbd> Back</div><div><kbd>?</kbd> Toggle this guide</div><small>Mouse: click a destination to walk. Click buttons, clues, and choices.</small></div>`;
  document.body.appendChild(help);
  const helpToggle=help.querySelector('#desktopHelpToggle'),helpBody=help.querySelector('#desktopHelpBody');
  const setHelp=open=>{help.classList.toggle('collapsed',!open);helpBody.hidden=!open;helpToggle.setAttribute('aria-expanded',open?'true':'false')};
  const rememberHelp=()=>{try{localStorage.setItem('lq_desktop_help',help.classList.contains('collapsed')?'closed':'open')}catch(_){}};
  try{if(localStorage.getItem('lq_desktop_help')==='closed')setHelp(false)}catch(_){}
  helpToggle.addEventListener('click',()=>{setHelp(help.classList.contains('collapsed'));rememberHelp()});

  function currentContainer(){const ids={title:'#title',slots:'#slots',character:'#character',world:'#world',dialog:'#dialog',combat:'#combat',cross:'#cross',ruins:'#ruins',storyPlace:'#storyPlace',willowTown:'#willowTown',regionalTown:'#regionalTown',questScreen:'#questScreen',transfer:'#transfer',hub:'#hub',shop:'#shop'};return document.querySelector(ids[currentScreen()]||'#app')}
  function choiceButtons(){
    const screen=currentScreen();
    if(screen==='dialog')return [document.getElementById('next'),document.getElementById('dialogLogToggle')].filter(visible);
    if(screen==='combat'){const answers=Array.from(document.querySelectorAll('#answers button')).filter(visible);if(answers.length)return answers;return Array.from(document.querySelectorAll('#commands button')).filter(visible)}
    if(screen==='cross'){const clues=Array.from(document.querySelectorAll('#clueList button')).filter(visible);if(clues.length)return clues}
    const root=currentContainer();return Array.from((root||app).querySelectorAll('button')).filter(b=>visible(b)&&!b.closest('#desktopHelp'));
  }

  let hotkeyQueued=false;
  function refreshHotkeys(){hotkeyQueued=false;document.querySelectorAll('.pc-hotkey').forEach(b=>{b.classList.remove('pc-hotkey');b.removeAttribute('data-hotkey')});if(!finePointer.matches)return;choiceButtons().slice(0,9).forEach((b,i)=>{b.classList.add('pc-hotkey');b.dataset.hotkey=String(i+1)})}
  function queueHotkeys(){if(hotkeyQueued)return;hotkeyQueued=true;requestAnimationFrame(refreshHotkeys)}
  new MutationObserver(queueHotkeys).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled']});queueHotkeys();

  const dirForKey=key=>({ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],W:[0,-1],s:[0,1],S:[0,1],a:[-1,0],A:[-1,0],d:[1,0],D:[1,0]})[key];
  const explorationScreens=['world','ruins','storyPlace','willowTown','regionalTown'];
  function goBack(){const selectors={hub:'#hubExit',shop:'#shopExit',cross:'#exitCross',questScreen:'#questBack',transfer:'#transferBack',storyPlace:'#storyPlaceExit',willowTown:'#willowExit',regionalTown:'#regionalExit',slots:'#slotBack',character:'#heroNameBack',ruins:'#ruinLeave'};const btn=document.querySelector(selectors[currentScreen()]||'__none__');if(visible(btn))btn.click()}

  window.addEventListener('keydown',e=>{
    if(e.defaultPrevented)return;
    const screen=currentScreen();
    if(!editing(e.target)&&e.key==='?'){e.preventDefault();setHelp(help.classList.contains('collapsed'));rememberHelp();return}
    if(editing(e.target))return;
    const dir=dirForKey(e.key);
    if(dir&&explorationScreens.includes(screen)){e.preventDefault();api()?.move(dir[0],dir[1]);return}
    if((e.key==='e'||e.key==='E'||e.key===' ')&&(explorationScreens.includes(screen)||screen==='dialog')){e.preventDefault();api()?.interact();return}
    if((e.key==='Enter'||e.key===' ')&&screen==='dialog'){e.preventDefault();api()?.interact();return}
    if((e.key==='m'||e.key==='M')&&screen==='world'){e.preventDefault();api()?.openChronicle();return}
    if(e.key==='Escape'&&['hub','shop','cross','questScreen','transfer','storyPlace','willowTown','regionalTown','slots','character','ruins'].includes(screen)){e.preventDefault();goBack();return}
    if(/^[1-9]$/.test(e.key)){const b=choiceButtons()[Number(e.key)-1];if(b){e.preventDefault();b.click();queueHotkeys();return}}
    if(screen==='cross'&&(e.key==='/'||e.key==='f'||e.key==='F')){e.preventDefault();document.getElementById('crossAnswer')?.focus();return}
    if(screen==='combat'&&(e.key==='/'||e.key==='f'||e.key==='F')){const input=document.getElementById('typeAnswer');if(visible(input)){e.preventDefault();input.focus()}}
  },false);

  // Fine-pointer convenience: click current tile to interact, or an adjacent tile to move.
  function gridClick(containerId,selector,kind){
    const grid=document.getElementById(containerId);if(!grid)return;
    grid.addEventListener('click',e=>{
      if(!finePointer.matches)return;
      const cell=e.target.closest(selector);if(!cell||!grid.contains(cell))return;
      const cells=Array.from(grid.querySelectorAll(selector)),idx=cells.indexOf(cell),pos=api()?.position(kind),cols=api()?.columns(kind);
      if(idx<0||!pos||!cols)return;
      const x=idx%cols,y=Math.floor(idx/cols),dx=x-pos.x,dy=y-pos.y;
      if(dx===0&&dy===0){api()?.interact();return}
      if(Math.abs(dx)+Math.abs(dy)===1)api()?.move(dx,dy);
    });
  }
  gridClick('map','.tile','world');
  gridClick('ruinGrid','.ruin-cell','ruins');
  gridClick('storyPlaceGrid','.story-cell','storyPlace');
  gridClick('willowGrid','.willow-cell','willowTown');
  gridClick('regionalGrid','.regional-cell','regionalTown');

  const syncPointer=()=>help.hidden=!finePointer.matches;syncPointer();
  if(finePointer.addEventListener)finePointer.addEventListener('change',syncPointer);else if(finePointer.addListener)finePointer.addListener(syncPointer);
})();
