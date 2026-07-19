const CACHE_NAME = 'lmgch-portfolio-v1';
// Lista de recursos estáticos esenciales que blindaremos en la caché local
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://jsdelivr.net',
  'https://unsplash.com'
];

// Evento de Instalación: Se ejecuta la primera vez que visitan la web y guarda todo en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Guardando recursos esenciales en la caché resiliente...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Evento de Activación: Limpia cachés antiguas si actualizamos la web en el futuro
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento Fetch: Intercepta las peticiones de red. Si no hay internet, sirve el contenido desde la caché
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si el recurso está en caché, lo devolvemos instantáneamente (Resiliencia activa)
        if (cachedResponse) {
          return cachedResponse;
        }
        // Si no está, intentamos buscarlo en la red normal
        return fetch(event.request).catch(() => {
          // Aquí podríamos retornar una página por defecto de error offline si la tuviéramos
          console.log('⚠️ Red caída. Recurso no disponible offline:', event.request.url);
        });
      })
  );
});
