/* Service worker de autodestrucción.
   Limpia el service worker viejo de next-pwa que servía chunks cacheados
   y rompía la app ("client-side exception" / ChunkLoadError).
   Cada navegador que tenga el SW viejo registrado, al volver a entrar,
   toma este, borra todos los caches, se desregistra y recarga limpio. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {}
      try {
        await self.registration.unregister();
      } catch (e) {}
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => client.navigate(client.url));
      } catch (e) {}
    })()
  );
});
