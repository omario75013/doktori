// Doktori service worker — offline support
// Versioned cache so we can invalidate older releases.
const CACHE = "doktori-v1";
const STATIC_PATTERNS = [/\/_next\/static\//, /\/icon-\d+\.png$/, /\/apple-touch-icon\.png$/, /\/favicon-\d+x\d+\.png$/];
const OFFLINE_FALLBACK = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Best-effort: prime the offline fallback.
      try { await cache.add(new Request(OFFLINE_FALLBACK, { cache: "reload" })); } catch {}
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isStatic(url) {
  return STATIC_PATTERNS.some((re) => re.test(url.pathname));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first for static assets
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Network-first with cache fallback for navigations
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // Stash homepage as offline fallback when we can
          if (res && res.status === 200 && url.pathname === "/") {
            const cache = await caches.open(CACHE);
            cache.put(OFFLINE_FALLBACK, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          const fallback = await cache.match(OFFLINE_FALLBACK);
          if (fallback) return fallback;
          return new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })()
    );
  }
});
