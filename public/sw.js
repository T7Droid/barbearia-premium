const CACHE_NAME = 'kingbarber-v1';

self.addEventListener('install', (event) => {
  // PWA requirement: at least one fetch handler or cache something
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Minimal fetch handler to satisfy PWA requirements
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
