// ============================================================
// Service Worker v2 — SocialHub PWA
// Network-first for API, Stale-while-revalidate for static
// ============================================================

const CACHE_VERSION = 'socialhub-v4';
const STATIC_ASSETS = [
    '/',
    '/fb-autoposter.html',
    '/manifest.json',
    '/assets/app.js',
    '/modules/collab/socket-client.js',
    '/modules/collab/presence-ui.js',
    '/modules/collab/notification-ui.js'
];

const OFFLINE_PAGE = '/offline.html';

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(async (cache) => {
            // Cache static assets (non-blocking for optional files)
            const results = await Promise.allSettled(
                STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
            );
            console.log('[SW] Cached static assets:', results.filter(r => r.status === 'fulfilled').length);
        })
    );
    self.skipWaiting();
});

// ── Activate (clean old caches) ─────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
    );
    self.clients.claim();
});

// ── Fetch Strategy ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Socket.IO / WebSocket requests
    if (url.pathname.startsWith('/socket.io')) return;
    if (url.pathname.startsWith('/ws')) return;

    // ── API: Network First (with offline fallback) ──────────
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful GET API responses for offline
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached API response if offline
                    return caches.match(event.request).then(cached => {
                        if (cached) return cached;
                        return new Response(
                            JSON.stringify({ error: true, message: 'Offline — no cached data' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
        return;
    }

    // ── Static Assets: Stale While Revalidate ───────────────
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_VERSION).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // If both cache and network fail, show offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_PAGE);
                    }
                    return null;
                });

            return cachedResponse || fetchPromise;
        })
    );
});

// ── Push Notifications (future use) ─────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'SocialHub', {
            body: data.body || '',
            icon: data.icon || '🚀',
            badge: '🔔',
            data: data.url || '/'
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});
