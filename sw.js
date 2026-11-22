/* Tavupeli — Offline PWA Service Worker
 * Precaches core app files and dynamically caches any images/fonts added later.
 */
const CACHE_NAME = 'tavupeli-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './words.js',
  './art.js',
  './audio.js',
  './board.js',
  './app.js',
  './gallery.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isMedia = /\/(img|fonts)\//.test(url.pathname);

  if (isMedia) {
    // Stale-while-revalidate for images & fonts (never caches 404s)
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then(res => {
          if (res && res.ok) {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(() => cached);
        return cached || networkPromise;
      })
    );
  } else {
    // Network-first with offline cache fallback for HTML/CSS/JS
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
