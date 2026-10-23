const CACHE='vika-static-v4';
const FILES=['./','./index.html','./style.css','./app.js','./content.js','./store.js','./scoring.js','./official.json','./expert-cases.json','./sources-data.json','./SOURCES.md','./reader.js','./boris.js','./reading.css','./reader-map.json','./classic-texts.json','./assets/boris.png','./vendor/pdfjs/pdf.min.mjs','./vendor/pdfjs/pdf.worker.min.mjs'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vika-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}return r;}).catch(()=>caches.match(e.request)));});
