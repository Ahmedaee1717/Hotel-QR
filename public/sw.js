// Paradise Resort PWA Service Worker
// Simple caching strategy: Network First, Cache Fallback

const CACHE_NAME = 'paradise-resort-v1';
const GUEST_PAGES = [
  '/hotel/paradise-resort',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css'
];

// Install event - cache essential guest pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching guest pages');
      return cache.addAll(GUEST_PAGES);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API calls, admin pages, staff tools - always fetch fresh
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/waiter') ||
    url.pathname.startsWith('/kitchen') ||
    url.pathname.startsWith('/front-desk') ||
    url.pathname.includes('wrangler') ||
    request.method !== 'GET'
  ) {
    return; // Let browser handle normally
  }

  // For guest pages: Network First, Cache Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response and cache it
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // No cache, return offline page
          return new Response(
            `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - Paradise Resort</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #016e8f 0%, #00d4aa 100%);
                  color: white;
                  text-align: center;
                  padding: 20px;
                }
                .container {
                  max-width: 400px;
                }
                h1 {
                  font-size: 2rem;
                  margin-bottom: 1rem;
                }
                p {
                  font-size: 1.1rem;
                  opacity: 0.9;
                }
                button {
                  margin-top: 2rem;
                  padding: 0.75rem 2rem;
                  font-size: 1rem;
                  background: white;
                  color: #016e8f;
                  border: none;
                  border-radius: 0.5rem;
                  cursor: pointer;
                  font-weight: 600;
                }
                button:hover {
                  opacity: 0.9;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>📡 You're Offline</h1>
                <p>Paradise Resort needs an internet connection to load this page.</p>
                <button onclick="location.reload()">Try Again</button>
              </div>
            </body>
            </html>
            `,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        });
      })
  );
});
