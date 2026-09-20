const CACHE = 'melon-club-v2';
const ASSETS = ['./', './index.html', './style.css', './game.js', './physics.js', './assets/arena.png', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './manifest.webmanifest'];
const urls = new Set(ASSETS.map(p => new URL(p, self.location).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('melon-club-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !urls.has(event.request.url)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
