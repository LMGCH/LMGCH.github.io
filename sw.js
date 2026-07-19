const CACHE_NAME = 'lmgch-portfolio-v2'; // Incrementamos la versión para forzar la actualización
const ASSETS_TO_CACHE = [
  './',
  'https://jsdelivr.net'
];

// Imagen externa conflictiva por CORS
const BANNER_IMAGE = 'https://unsplash.com';

// Instalación: Guarda los recursos locales seguros primero
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Guardando recursos locales seguros...');
        // Guardamos los recursos locales esenciales
        cache.addAll(ASSETS_TO_CACHE);
        
        // Guardamos la imagen externa forzando el modo 'no-cors' para evitar el bloqueo del navegador
        return cache.put(BANNER_IMAGE, new Response('', { status: 200, statusText: 'OK' }))
          .catch(() => fetch(new Request(BANNER_IMAGE, { mode: 'no-cors' }))
            .then(response => cache.put(BANNER_IMAGE, response))
          );
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: Limpieza automática de cachés obsoletas
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

// Estrategia de Red: Cache First con caída a Red (Network Fallback)
self.addEventListener('fetch', event => {
  // Ignoramos peticiones que no sean GET (como analíticas POST de umami)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Devuelve el recurso desde la caché si existe
        }
        
        // Si no está en caché, lo busca en la red de forma normal
        return fetch(event.request).then(networkResponse => {
          // Si la petición es válida y de nuestro propio sitio, la metemos dinámicamente en la caché para la próxima vez
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Si falla la red (Modo offline puro) y es el documento principal, fuerza la carga del index de la caché
          if (event.request.mode === 'navigate') {
            return caches.match('./');
          }
        });
      })
  );
});
