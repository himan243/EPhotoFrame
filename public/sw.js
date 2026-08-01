/* Sunstone Freshers Experience — offline-capable service worker.
 *
 * Strategy:
 *  - Static assets (_next/static, images, frames, config): cache-first.
 *  - Navigations: network-first, falling back to the cached app shell so the
 *    kiosk keeps working fully offline after the first load.
 *  - API routes are never cached.
 */
const CACHE = "sunstone-freshers-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isNavigate(req) {
  return req.mode === "navigate";
}

function isApi(req) {
  return req.url.includes("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || isApi(request)) return;

  // Navigations: network-first with app-shell fallback.
  if (isNavigate(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match("/");
          if (shell) return shell;
          return new Response("Offline — reload when back online.", { status: 503 });
        }),
    );
    return;
  }

  // Everything else: cache-first, revalidate in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && (request.url.includes("/_next/static") || request.url.includes("/frames/") || request.url.includes("/config/") || request.url.includes("/branding/") || request.url.includes("/icons/"))) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      });
    }),
  );
});
