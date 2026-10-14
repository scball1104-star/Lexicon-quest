const CACHE='lexicon-quest-reforged-realms-v43';
const ASSETS=[...['region-1','town','battle','boss'].map(n=>'./assets/audio/'+n+'.mp3'),'./','./index.html','./rpg.css','./rpg-reforged.css','./rpg-data.js','./rpg-chapter1.js','./rpg-chapter2.js','./rpg-chapter3.js','./rpg-chapter4.js','./rpg-chapter5.js','./rpg-chapter6.js','./rpg-chapter7.js','./rpg-chapter8.js','./rpg-regions-ii.js','./rpg-environment-art.js','./rpg-engine.js','./rpg-reforged.js','./rpg-loot.js','./rpg-interiors.js','./rpg-townsfolk.js','./rpg-combat-ui.js','./rpg-ui.js','./classic.html','./style.css','./presentation.css','./exploration.css','./exploration.js','./audio.css','./soundtrack.js','./audio.js','./game.js','./presentation.js','./desktop.js','./visuals.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./assets/art/interior-sprites.png','./assets/art/townsfolk-sprites.png','./assets/art/world-sprites.png','./assets/art/party-sprites.png',...['environments','portraits','bosses','enemies'].map(n=>'./assets/art/'+n+'.webp'),...Array.from({length:8},(_,i)=>['./assets/cinematics/chapter-'+(i+1)+'.mp4','./assets/cinematics/boss-'+(i+1)+'.mp4']).flat()];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('lexicon-quest-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
async function byteRange(request){
 const cached=await caches.match(request.url);if(!cached||cached.status!==200)return fetch(request);
 const bytes=await cached.arrayBuffer(),size=bytes.byteLength,m=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range')||'');
 if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
 const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));const end=m[1]?Math.min(m[2]?Number(m[2]):size-1,size-1):size-1;
 if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
 return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('content-type')||'video/mp4','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 if(event.request.headers.has('range')){event.respondWith(byteRange(event.request).catch(()=>new Response('Scene unavailable offline',{status:503})));return}
 event.respondWith(fetch(event.request).then(response=>{if(response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{})}return response}).catch(async()=>await caches.match(event.request)||new Response('Content unavailable offline',{status:503})));
});
