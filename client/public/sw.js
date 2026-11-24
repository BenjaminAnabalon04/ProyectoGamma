// Desarrollado por: Robert Ramírez

const NOMBRE_CACHE = 'gamma-shell-v1';
const RECURSOS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(RECURSOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((clave) => clave !== NOMBRE_CACHE).map((clave) => caches.delete(clave)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const solicitud = evento.request;
  const url = new URL(solicitud.url);

  if (solicitud.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  evento.respondWith(
    fetch(solicitud)
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(NOMBRE_CACHE).then((cache) => cache.put(solicitud, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const guardada = await caches.match(solicitud);
        return guardada || caches.match('/index.html');
      })
  );
});
