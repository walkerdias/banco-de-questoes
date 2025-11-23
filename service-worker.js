const CACHE_NAME = "banco-questoes-ghpages-v8.7-fixstats"; // Cache atualizado
const FILES = [
  "./",                 
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png"
];

// Instalação
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching arquivos v8.7..."); 
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting(); 
});

// Ativação e Limpeza
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log("Removendo cache antigo:", key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request).catch(() => {
        if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
      });
    })
  );
});