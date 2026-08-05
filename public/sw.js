// Paradise Resort PWA Service Worker
// Simple caching strategy: Network First, Cache Fallback

const CACHE_NAME = 'paradise-resort-v3-maison';
const GUEST_PAGES = [
  '/hotel/paradise-resort',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache essential guest pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching guest pages');
      // Cache pages one by one to avoid CORS issues
      return Promise.all(
        GUEST_PAGES.map(url => 
          cache.add(url).catch(err => console.log('[SW] Failed to cache:', url, err))
        )
      );
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

// Fetch event - Network First strategy (ONLY for guest hotel pages)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ONLY intercept guest hotel pages - let everything else pass through
  const isGuestPage = url.pathname.startsWith('/hotel/') && request.method === 'GET';
  
  if (!isGuestPage) {
    return; // Let browser handle normally (includes ALL API calls, admin pages, etc.)
  }

  // For guest hotel pages ONLY: Network First, Cache Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response and cache it
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
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
