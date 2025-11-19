const CACHE_NAME = "banco-questoes-ghpages-v4"; // Mudei a versão para forçar atualização
const FILES = [
  "./",                 // IMPORTANTE: Cacheia a raiz do site (ex: /banco-de-questoes/)
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png"
];

// Instalação: Baixa os arquivos para o cache
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching arquivos...");
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting(); // Força o novo SW a assumir imediatamente
});

// Ativação: Limpa caches antigos para não ocupar espaço
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch: Intercepta as requisições
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Se estiver no cache, retorna o cache. Se não, tenta a rede.
      return response || fetch(e.request).catch(() => {
        // Se estiver offline e o arquivo não estiver no cache:
        // Retorna a página inicial se for uma navegação (opcional, mas útil)
        if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
      });
    })
  );
});
