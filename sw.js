/* All resources are local to this site. A complete version is activated only
 * after every original-resolution model/texture has reached the local cache. */
importScripts('./offline-manifest.js');
const PREFIX = 'qingting-tour-';
const CACHE = PREFIX + self.TOUR_OFFLINE.version;
const scope = new URL(self.registration.scope);
const entries = self.TOUR_OFFLINE.files;
const index = new URL('index.html', scope).href;
const marker = new URL('.offline-ready', scope).href;
const resources = new Set(entries.map(file => new URL(file.path, scope).href));
const totalBytes = entries.reduce((sum, file) => sum + file.bytes, 0);
let completed = 0, savedBytes = 0;

async function announce(data) {
  for(const client of await self.clients.matchAll({type:'window', includeUncontrolled:true})) client.postMessage(data);
}

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const downloads = new AbortController();
  try {
    let next = 0;
    async function save() {
      while(next < entries.length && !downloads.signal.aborted) {
        const file = entries[next++], url = new URL(file.path, scope).href;
        // Revalidate the HTTP cache, so resources just used by the 3D scene can
        // be reused without downloading their bytes again, while updates stay fresh.
        const response = await fetch(new Request(url, {cache:'no-cache', credentials:'same-origin',signal:downloads.signal}));
        if(!response.ok) throw new Error(file.path + ': ' + response.status);
        const bytes = await response.clone().arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b=>b.toString(16).padStart(2,'0')).join('');
        if(bytes.byteLength !== file.bytes || digest !== file.sha256) throw new Error(file.path + ': 资源校验失败，请稍后重试');
        await cache.put(url,response);
        completed++;savedBytes += file.bytes;
        await announce({kind:'OFFLINE_PROGRESS',percent:Math.min(99,Math.floor(savedBytes/totalBytes*100)),completed,total:entries.length});
      }
    }
    const results = await Promise.allSettled([save().catch(error=>{downloads.abort();throw error;}),save().catch(error=>{downloads.abort();throw error;})]);
    const failed = results.find(result=>result.status === 'rejected');
    if(failed) throw failed.reason;
    await cache.put(marker,new Response(JSON.stringify({version:self.TOUR_OFFLINE.version,totalBytes}),{headers:{'Content-Type':'application/json'}}));
    // A first installation can start immediately. Updates wait for a deliberate
    // tap so the running tour never mixes scripts/textures from two versions.
    if(!self.registration.active) await self.skipWaiting();
    else await announce({kind:'UPDATE_READY',version:self.TOUR_OFFLINE.version});
  } catch(error) {
    await caches.delete(CACHE);
    await announce({kind:'OFFLINE_FAILED',message:String(error)});
    throw error;
  }
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  for(const name of await caches.keys()) if(name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
  await announce({kind:'OFFLINE_READY',version:self.TOUR_OFFLINE.version,totalBytes});
})()));

self.addEventListener('message', event => {
  if(event.data?.kind === 'APPLY_UPDATE') {event.waitUntil(self.skipWaiting());return;}
  if(event.data?.kind !== 'OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    if(await cache.match(marker)) event.source?.postMessage({kind:'OFFLINE_READY',version:self.TOUR_OFFLINE.version,totalBytes});
    else event.source?.postMessage({kind:'OFFLINE_PROGRESS',percent:Math.min(99,Math.floor(savedBytes/totalBytes*100)),completed,total:entries.length});
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request,url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if(request.mode === 'navigate') {
    const target = url.pathname === scope.pathname || url.pathname === new URL(index).pathname ? index : url.origin + url.pathname;
    event.respondWith((async () => (await caches.match(target,{cacheName:CACHE})) || fetch(request))());
  } else if(resources.has(url.href)) {
    event.respondWith((async () => (await caches.match(request,{cacheName:CACHE})) || fetch(request))());
  }
});
