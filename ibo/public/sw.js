/* Service worker do ESDRAS — PWA (apenas em produção). */
const CACHE_STATIC = "esdras-static-v1";
const CACHE_PAGES = "esdras-pages-v1";
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith("esdras-")).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // nunca cachear dados

  // Navegações: rede primeiro, cache como fallback (evita conteúdo autenticado velho).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_PAGES).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || (await caches.match("/offline.html")) || Response.error();
        })
    );
    return;
  }

  // Estáticos: cache primeiro (URLs com hash não mudam), atualiza em segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const promise = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE_STATIC).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || promise;
    })
  );
});