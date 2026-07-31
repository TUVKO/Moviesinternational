const CACHE_NAME = 'wea-cache-v2';
const APP_SHELL = [
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for HTML pages (index.html, connect.html) so updates always show up.
// Cache-first only for static assets (logo, manifest) that rarely change.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') || url.includes('qrserver.com')) {
    return; // let these always go to the network
  }

  const isHTML = event.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/');

  if (isHTML) {
    // Network-first: always try to get the latest page, only fall back to cache if offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (logo, manifest, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached)
      );
    })
  );
});
