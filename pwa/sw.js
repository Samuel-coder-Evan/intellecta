/* ================================================
   Intellecta Service Worker v1.1
   Caches the app for offline use
   ================================================ */

const CACHE_NAME = 'intellecta-v2';
const ASSETS = [
  './intellecta.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&family=Noto+Sans+Tamil:wght@400;600;700&display=swap'
];

// ---- INSTALL: cache all assets ----
self.addEventListener('install', (event) => {
  console.log('[Intellecta SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Intellecta SW] Caching app assets');
      return cache.addAll(ASSETS.map(url => {
        // Use no-cors for cross-origin fonts
        if (url.startsWith('https://fonts')) {
          return new Request(url, { mode: 'no-cors' });
        }
        return url;
      })).catch(err => {
        console.log('[Intellecta SW] Cache partial fail (OK for fonts):', err);
      });
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE: clean old caches ----
self.addEventListener('activate', (event) => {
  console.log('[Intellecta SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[Intellecta SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      );
    })
  );
  self.clients.claim();
});

// ---- FETCH: serve from cache, fallback to network ----
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache
        return cachedResponse;
      }
      // Fetch from network and cache it
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback — serve main app
        if (event.request.destination === 'document') {
          return caches.match('./intellecta.html');
        }
      });
    })
  );
});

// ---- PUSH NOTIFICATIONS (ready for future use) ----
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Intellecta';
  const options = {
    body: data.body || 'Your IQ test results are ready!',
    icon: data.icon || './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './intellecta.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './intellecta.html')
  );
});
