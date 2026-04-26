const APP_SHELL_CACHE = "t3code-app-shell-v2";
const APP_SHELL_URL = "/";
const APP_SHELL_ASSETS = [
  APP_SHELL_URL,
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/apple-touch-icon-dev.png",
  "/favicon.ico",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/favicon-dev.ico",
  "/favicon-dev-32x32.png",
  "/favicon-dev-16x16.png",
];

function isAppNavigation(request, url) {
  if (request.mode !== "navigate") {
    return false;
  }

  if (url.origin !== self.location.origin) {
    return false;
  }

  return !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/attachments/");
}

function shouldCacheNavigationResponse(request, url, response) {
  if (!response.ok || url.origin !== self.location.origin) {
    return false;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return request.mode === "navigate" && contentType.includes("text/html");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_ASSETS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== APP_SHELL_CACHE)
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isAppNavigation(request, url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (shouldCacheNavigationResponse(request, url, response)) {
            const cache = await caches.open(APP_SHELL_CACHE);
            await cache.put(APP_SHELL_URL, response.clone());
          }
          return response;
        } catch {
          const cachedShell = await caches.match(APP_SHELL_URL);
          return cachedShell ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin || !APP_SHELL_ASSETS.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }

      const response = await fetch(request);
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put(request, response.clone());
      return response;
    })(),
  );
});
