// Doktori Service Worker — cache-first for static assets, network-first for navigation
const CACHE = "doktori-v1";
const STATIC_PATHS = ["/", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_PATHS).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Don't cache API calls
  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for Next.js static assets and PWA icons
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon-")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for navigation, fallback to cache, then to / (root)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/offline").then((off) => off || caches.match("/")))
        )
    );
  }
});
