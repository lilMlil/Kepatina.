/* Ķepatiņa service worker: lets the installed iPhone app open and work without internet.
 * - index.html: network first, falls back to the saved copy when offline
 * - /assets/* (files with a hash in the name): cache first, they never change
 * - everything else from this site (icons, GIFs, manifest): saved copy at once, refreshed in background
 * - other sites (Supabase, maps, etc.) are never touched
 */
const VERSION = "kepatina-v1";
const SHELL = VERSION + "-shell";
const ASSETS = VERSION + "-assets";
const OTHER = VERSION + "-other";
const KEEP = [SHELL, ASSETS, OTHER];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-192.png"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function put(name, request, response) {
  if (response && response.status === 200 && response.type === "basic") {
    const cache = await caches.open(name);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Video / audio use Range requests, which the Cache API cannot answer.
  if (req.headers.has("range")) return;

  // Opening the app / reloading
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => put(SHELL, "./index.html", res))
        .catch(async () => (await caches.match("./index.html")) || (await caches.match("./")) || Response.error()),
    );
    return;
  }

  // Built files with a hash in the name
  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) => hit || fetch(req).then((res) => put(ASSETS, req, res)),
      ),
    );
    return;
  }

  // Icons, GIFs, manifest...
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => put(OTHER, req, res))
        .catch(() => hit || Response.error());
      return hit || network;
    }),
  );
});

// Tapping a notification brings the app to the front.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUninstalled: false }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    }),
  );
});
