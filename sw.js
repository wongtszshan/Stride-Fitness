/* Stride PWA: network-first application shell, cache fallback offline */
const CACHE='stride-shell-v15';
const ASSETS=['./','./index.html','./css/style.css?v=20261115-9','./js/app.js?v=1.7.1','./icon.svg','./apple-touch-icon.png','./manifest.webmanifest','./version.json'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.allSettled(ASSETS.map(path=>cache.add(path)));
  }));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stride-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(async response=>{
    if(response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone()).catch(()=>{});}
    return response;
 }).catch(async ()=>await caches.match(req)||((req.mode==='navigate')?await caches.match('./index.html'):Response.error())));
});