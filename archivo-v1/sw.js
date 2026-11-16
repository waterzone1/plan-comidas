/* Service worker: todo el catálogo viaja en el bundle, así que la app
   funciona entera en avión.

   Estrategia: se le da a la red un segundo y medio para contestar. Si
   contesta, esa copia se guarda y se usa; si tarda más o no hay señal, se
   usa la copia guardada. Así editar un archivo de datos alcanza para verlo
   en la próxima apertura, sin tener que avisarle nada al service worker,
   y sin señal la app abre igual. */

const PREFIJO = 'plan-v1-archivo-';
const VERSION = PREFIJO + '1';
const LIMITE = 1500;   // ms que se espera a la red antes de usar el caché

const ARCHIVOS = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './datos/catalogo.js',
  './datos/porciones.js',
  './datos/ritmo.js',
  './datos/compras.js',
  './js/util.js',
  './js/estado.js',
  './js/generador.js',
  './js/inventario.js',
  './js/ui.js',
  './js/app.js',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-180.png',
  './iconos/icono-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      // cache: 'reload' para bajarlos de la red y no del caché del navegador
      .then(c => Promise.all(ARCHIVOS.map(a =>
        fetch(new Request(a, { cache: 'reload' }))
          .then(r => (r && r.ok) ? c.put(a, r) : null)
          .catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIJO) && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* La clave del caché ignora el ?loquesea: index.html?x=1 es el mismo archivo. */
function clave(req) {
  const u = new URL(req.url);
  return u.origin + u.pathname;
}

async function responder(e) {
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(clave(e.request));

  // cache: 'no-cache' obliga a preguntarle al servidor si el archivo cambió.
  // Sin esto el navegador contesta con su propia copia vieja y editar un
  // archivo no se notaría nunca. Si no cambió, el servidor devuelve un 304
  // y no viaja nada.
  const red = fetch(clave(e.request), { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
    if (r && r.ok && r.type === 'basic') cache.put(clave(e.request), r.clone());
    return r;
  }).catch(() => null);

  // que la copia se termine de guardar aunque ya hayamos contestado con el caché
  e.waitUntil(red);

  if (!guardado) {
    const r = await red;
    if (r) return r;
    // sin señal y sin copia: si es una navegación, al menos la pantalla
    return e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error();
  }

  const espera = new Promise(res => setTimeout(() => res(null), LIMITE));
  const r = await Promise.race([red, espera]);
  return r || guardado;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(responder(e));
});
