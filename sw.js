const CACHE_NAME = 'lmgch-resilient-v12'; // Subimos a la v12
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json', // Añadimos el manifiesto a la caché
  '/icon-192.png',   // Añadimos el icono 192
  '/icon-512.png',   // Añadimos el icono 512
  'https://cdn.jsdelivr.net/npm/devicon@2.17.0/devicon.min.css'
];


// 1. Instalación: Guardamos en caché estrictamente el esqueleto local
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Almacenando esqueleto HTML inmune...');
        // Usamos rutas absolutas limpias para evitar confusiones con las almohadillas (#) del menú
        return cache.addAll(['/index.html']);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activación: Limpieza radical de las cachés conflictivas anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Eliminando rastro de caché conflictiva:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción Inteligente: Evitar peticiones y salvar la carga
self.addEventListener('fetch', event => {
  // Regla de oro: Ignorar peticiones que no sean GET (como el tracking de Umami)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ¡EVITAMOS SU PETICIÓN! Si la petición va a LinkedIn, Google Drive o APIs externas, 
  // dejamos que el navegador la maneje de forma ordinaria sin interferir ni cachear.
  if (url.hostname.includes('linkedin.com') || url.hostname.includes('google.com') || url.hostname.includes('umami')) {
    return; 
  }

  // Para el resto (nuestro HTML y estilos esenciales), aplicamos estrategia de rescate
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si hay internet y la respuesta es nuestra, guardamos una copia fresca en caché
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // COBERTURA DE FALLOS (Modo Offline Activo):
        // Si la red se cae por completo, servimos el index.html guardado pase lo que pase
        return caches.match('/index.html') || caches.match('/');
      })
  );
});

