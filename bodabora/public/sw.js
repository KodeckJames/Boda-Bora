// Boda Bora service worker: offline app shell + push notifications.
// Bump VERSION to drop old caches after a deploy that changes cached assets.
const VERSION = "v4";
const SHELL_CACHE = `shell-${VERSION}`; // public pages, precached: work offline from first install
const PAGES_CACHE = `pages-${VERSION}`; // signed-in pages as visited; cleared on sign-out
const ASSET_CACHE = `assets-${VERSION}`; // content-hashed build files and icons
const LOCALES = ["en", "sw"];
// Final URLs (not /rider/ride, which redirects to a language) so cached pages can be served.
// Ride mode is public: it records to IndexedDB and only needs the network to upload.
const SHELL = LOCALES.flatMap((l) => [`/${l}`, `/${l}/rider/ride`, `/${l}/offline`]);
const isShell = (pathname) => SHELL.includes(pathname);

// The offline page in the language of the requested URL.
const offlineFor = (url) => {
  const first = new URL(url).pathname.split("/")[1];
  return `/${LOCALES.includes(first) ? first : "en"}/offline`;
};

// Scripts and styles a cached page needs, so it also runs offline (not just renders).
const assetsIn = (html) =>
  [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])].filter((u) => !u.includes("{"));

async function precache() {
  const shell = await caches.open(SHELL_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  await Promise.all(
    SHELL.map(async (path) => {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok || res.redirected) return; // never cache a redirect under the wrong URL
      const html = await res.clone().text();
      await shell.put(path, res);
      await Promise.all(
        assetsIn(html).map((u) =>
          assets.match(u).then((hit) => hit ?? fetch(u).then((r) => (r.ok ? assets.put(u, r) : undefined))).catch(() => {}),
        ),
      );
    }),
  );
}

// A cached copy of a page. Unprefixed URLs like /rider (the installed app's start_url, which the
// proxy redirects to a language when online) fall back to either language's cached copy.
async function cachedPage(pathname) {
  const hit = await caches.match(pathname);
  if (hit || LOCALES.includes(pathname.split("/")[1])) return hit;
  for (const l of LOCALES) {
    const localized = await caches.match(`/${l}${pathname === "/" ? "" : pathname}`);
    if (localized) return localized;
  }
  return undefined;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== PAGES_CACHE && k !== ASSET_CACHE)
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
  if (url.pathname.startsWith("/api/")) return;

  // Pages: network first so riders see fresh scores, cached copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Skip redirects (e.g. signed out → sign-in) so a page is never cached under the wrong URL.
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(isShell(url.pathname) ? SHELL_CACHE : PAGES_CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await cachedPage(url.pathname)) ?? caches.match(offlineFor(request.url))),
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
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
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
