const CACHE_VERSION = "k3981-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./bauler-runs.html",
  "./fort-rankings.html",
  "./kvk-contributions.html",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/bauler.js",
  "./assets/js/config.js",
  "./assets/js/data-table.js",
  "./assets/js/notifications.js",
  "./assets/js/pwa.js",
  "./assets/js/utils.js",
  "./assets/img/reaper-mark.svg",
  "./site.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.includes("/push/onesignal/")) {
    return;
  }

  if (requestUrl.pathname.includes("/data/snapshots/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    throw error;
  }
}
