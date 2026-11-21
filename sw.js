/* Service worker de Mi Nómina · Turnos
   Guarda la app completa en el dispositivo para que funcione sin conexión.
   Al publicar una versión nueva basta con cambiar CACHE: el navegador
   descarta la anterior y se queda con la nueva. */

const CACHE = "minomina-v10";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      /* Si algún archivo suelto fallara, la instalación no debe caerse
         entera: la app es un solo HTML y con él basta para arrancar. */
      .then(function (c) {
        return Promise.all(ARCHIVOS.map(function (a) {
          return c.add(a).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(claves.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const origen = new URL(req.url).origin;

  /* Las tipografías vienen de Google. Se guardan la primera vez que hay
     cobertura para que la app no dependa de internet después; si nunca se
     llegan a descargar, el navegador usa las del sistema y no pasa nada. */
  if (origen === "https://fonts.googleapis.com" || origen === "https://fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then(function (r) {
        return r || fetch(req).then(function (resp) {
          const copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
          return resp;
        }).catch(function () { return r; });
      })
    );
    return;
  }
  if (origen !== self.location.origin) return;

  /* Navegación: se intenta la red para recoger una versión nueva y, si no
     hay cobertura, se sirve la copia guardada. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(function (resp) {
          const copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put("./index.html", copia); });
          return resp;
        })
        .catch(function () {
          return caches.match("./index.html").then(function (r) {
            return r || caches.match("./");
          });
        })
    );
    return;
  }

  /* El resto (iconos, manifest): primero lo guardado, que no cambia. */
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (resp) {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resp;
      });
    })
  );
});
