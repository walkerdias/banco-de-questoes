const CACHE_NAME = "banco-questoes-dark-v2";
const FILES = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json"
  "icons/icon-192x192.png", // NOVO: Ícone 1
  "icons/icon-512x512.png"  // NOVO: Ícone 2
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});