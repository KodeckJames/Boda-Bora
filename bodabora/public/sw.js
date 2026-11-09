// Boda Bora service worker: offline app shell + push notifications.
// Bump VERSION to drop old caches after a deploy that changes cached assets.
const VERSION = "v2";
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const LOCALES = ["en", "sw"];
// Final URLs (not /rider, which redirects to a language) so cached pages can be served.
const SHELL = LOCALES.flatMap((l) => [`/${l}/rider`, `/${l}/rider/ride`, `/${l}/offline`]);

// The offline page in the language of the requested URL.
const offlineFor = (url) => {
  const first = new URL(url).pathname.split("/")[1];
  return `/${LOCALES.includes(first) ? first : "en"}/offline`;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only same-origin GETs. API calls and uploads always go to the network.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages: network first so riders see fresh scores, cached copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match(offlineFor(request.url))),
    );
    return;
  }

  // Build assets and icons are content-hashed or static: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Boda Bora", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/rider" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/rider"));
});
