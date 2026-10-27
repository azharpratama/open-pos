const CACHE_NAME = 'openpos-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/login',
  '/kasir/pesan',
  '/kasir/antrian',
  '/kasir/stok',
  '/kasir/bonus',
  '/owner',
  '/owner/pembukuan',
  '/owner/karyawan',
  '/owner/shift',
  '/owner/menu',
  '/owner/inventory',
  '/owner/procurement'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best effort precache
      return Promise.allSettled(OFFLINE_URLS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // Skip API requests so SWR can handle offline gracefully
  if (url.pathname.startsWith('/api/')) return;

  // Network First for Navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(response => {
            if (response) return response;
            // Fallback matching
            if (url.pathname.startsWith('/owner')) return caches.match('/owner');
            return caches.match('/kasir/pesan');
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for everything else (JS, CSS, images, RSC payloads)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silently fail on network error, the cachedResponse will be used if it exists
      });
      return cachedResponse || fetchPromise;
    })
  );
});
