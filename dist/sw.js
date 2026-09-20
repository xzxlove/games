importScripts('./precache.js', './shared/media-range.js');
const FAMILY = `playroom:${new URL('./', self.location).pathname}:`;
const CACHE = FAMILY + self.PLAYROOM_VERSION;
const ASSETS = self.PLAYROOM_ASSETS;
const urls = new Set(ASSETS.map(p => new URL(p, self.location).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => (key.startsWith(FAMILY) && key !== CACHE) || (new URL(self.registration.scope).pathname === '/' && /^melon-club-v[12]$/.test(key))).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url); url.search = ''; url.hash = '';
  if (event.request.method !== 'GET' || !urls.has(url.href)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && response.status !== 206 && !response.redirected) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(url.href, copy)));
      }
      return response;
    } catch {
      const cached = await caches.match(url.href);
      return cached ? self.playroomRangeResponse(cached, event.request.headers.get('Range')) : Response.error();
    }
  })());
});
