const CACHE_NAME = 'lmgch-portfolio-v3'; // Nueva versión limpia
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://jsdelivr.net'
];

// Instalación: Guarda SOLO los recursos locales estables
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Guardando estructura base en caché resiliente...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: Limpia de inmediato cualquier rastro de la caché rota anterior
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de Red de Alta Disponibilidad
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. Si el recurso está en la caché local, lo servimos de inmediato
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. Si no está en caché (como la imagen de Unsplash o las analíticas de Umami), intentamos ir a la red
        return fetch(event.request).then(networkResponse => {
          // Si la respuesta de red es válida y es de nuestra web, la guardamos dinámicamente para el futuro
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // 3. CAÍDA DE RED (Modo offline puro): Si el usuario intenta navegar por la web, le forzamos la estructura base
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});
