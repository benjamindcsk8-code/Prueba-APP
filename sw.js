const CACHE_NAME = 'facturas-panel-v2';
const CORE_ASSETS = ['./dashboard_facturas.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Solo cachea el shell de la app. Los iframes (Sheet, Drive, Dashboard)
// siempre se piden en vivo a Google/GitHub, nunca desde caché.
//
// El documento HTML principal usa estrategia "network-first": siempre intenta
// traer la version mas nueva del servidor primero, y solo si no hay internet
// usa la copia guardada. Esto evita que quede pegada una version vieja
// despues de subir cambios (como paso antes).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
