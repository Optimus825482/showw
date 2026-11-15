const CACHE_NAME = "show-bufe-shell-v2";
const RUNTIME_STATIC_CACHE = "show-bufe-static-v2";
const PRECACHE_URLS = [
  "/offline.html",
  "/tanitim.html",
  "/manifest.webmanifest",
  "/icons/logo.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/sunum/hero-ecosystem.svg",
  "/sunum/workflow-diagram.svg",
  "/sunum/screen-adisyon.svg",
  "/sunum/screen-mutfak.svg",
  "/sunum/screen-bekleyenler.svg",
  "/sunum/screen-admin-rapor.svg",
  "/sunum/pwa-chrome-receipt.svg",
  "/sunum/architecture-coolify.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const validCaches = new Set([CACHE_NAME, RUNTIME_STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!validCaches.has(key)) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live adisyon, auth & printer API requests always bypass cache
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Immutable static bundles, icons & presentation assets: Cache-First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/sunum/") ||
    url.pathname === "/tanitim.html"
  ) {
    event.respondWith(
      (async () => {
        const precached =
          (await caches.match(request)) ||
          (await caches.match(url.pathname));
        if (precached) return precached;

        const cache = await caches.open(RUNTIME_STATIC_CACHE);
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })()
    );
    return;
  }

  // App pages / document navigations: Network-First with cached-page or offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage =
          (await caches.match(request)) ||
          (await caches.match(url.pathname));
        if (cachedPage) return cachedPage;
        const cachedOffline = await caches.match("/offline.html");
        return cachedOffline || Response.error();
      })
    );
  }
});
