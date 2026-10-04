const CACHE_NAME = 'hearthplan-shell-v2';
const APP_SHELL = [
  './', './index.html', './styles.css?v=5', './portability.js?v=1', './app.js?v=6', './pwa.js?v=1',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone())));
          return response;
        })
        .catch(() => caches.match('./index.html').then(response => response || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(async response => {
        if (response.ok) await caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      });
      return cached || network.catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }));
    })
  );
});
