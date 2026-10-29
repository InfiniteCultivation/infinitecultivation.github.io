// Offline support. Bump VERSION whenever app files change so phones pick up the update.
const VERSION = 'v18';
const CACHE = `cultivation-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// iPhone home-screen apps show a blank page if a service worker hands back a
// redirected response, so redirects are rebuilt as plain responses.
function clean(res) {
  if (!res || !res.redirected) return res;
  return res.blob().then((body) => new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Page loads: always go to the network; use the saved copy only when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(clean).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // App files: network first, keep a copy for offline.
  e.respondWith(
    fetch(req)
      .then(clean)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
