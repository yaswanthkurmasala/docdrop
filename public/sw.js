/**
 * DocDrop Progressive Web App (PWA) Service Worker
 * Ensures offline document processing and instant execution in browser RAM.
 */

const CACHE_NAME = "docdrop-cache-v1";

const STATIC_PRECACHE = [
  "/",
  "/favicon.ico",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/pdf.worker.min.mjs",
  "/fonts/JetBrainsMonoNerdFont-Regular.ttf",
];

// Install: Cache essential app shell & client-side PDF engine worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn("[SW] Pre-caching non-fatal warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart caching strategy
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests or browser extension/external origins
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // 1. Critical PDF Engine Worker & Fonts: Cache-First (instant offline execution)
  if (
    url.pathname.endsWith("pdf.worker.min.mjs") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Navigation (HTML Pages): Network-First, fallback to cached App Shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/") || caches.match(request);
      })
    );
    return;
  }

  // 3. Next.js Static Bundles & Scripts: Stale-While-Revalidate
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});
