const CACHE = 'camerashare-v1';
const PRECACHE = [
  '/',
  '/photographer.html',
  '/director.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never intercept: API calls, WebSocket upgrades, cross-origin
  if (url.pathname.startsWith('/api/') || e.request.headers.get('upgrade') === 'websocket') return;
  if (url.origin !== location.origin) return;

  // Cache-first for precached assets, network-first for everything else
  if (PRECACHE.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  }
});
