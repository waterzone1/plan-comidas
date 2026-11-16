/* Service worker de la app nueva (raíz). Todo el catálogo viaja en los
   archivos, así que la app funciona entera sin señal.

   Estrategia: se le da a la red un segundo y medio. Si contesta, esa
   copia se guarda y se usa; si tarda o no hay señal, se usa la guardada.
   Así una versión nueva aparece sola al volver a abrir.

   La app vieja vive en /archivo-v1/ con su propio service worker: acá
   sus pedidos se dejan pasar sin tocar, y solo se borran los cachés
   propios (los "quecomo-") y el que había dejado la v1 en la raíz. */

const PREFIJO = 'quecomo-';
const VERSION = PREFIJO + 'v2-1';
const LIMITE = 1500;

const ARCHIVOS = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './datos/ingredientes.js',
  './datos/catalogo.js',
  './datos/permitidos.js',
  './js/nucleo.js',
  './js/ilustraciones.js',
  './js/estado.js',
  './js/app.js',
  './juego/juego.css',
  './juego/datos.js',
  './juego/motor.js',
  './juego/ui.js',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-180.png',
  './iconos/icono-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(ARCHIVOS.map(a =>
        fetch(new Request(a, { cache: 'reload' }))
          .then(r => (r && r.ok) ? c.put(a, r) : null)
          .catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

const esViejo = k => (k.startsWith(PREFIJO) && k !== VERSION) || /^plan-v\d+$/.test(k);

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(esViejo).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function clave(req) {
  const u = new URL(req.url);
  return u.origin + u.pathname;
}

async function responder(e) {
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(clave(e.request));

  const red = fetch(clave(e.request), { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
    if (r && r.ok && r.type === 'basic') cache.put(clave(e.request), r.clone());
    return r;
  }).catch(() => null);

  e.waitUntil(red);

  if (!guardado) {
    const r = await red;
    if (r) return r;
    return e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error();
  }

  const espera = new Promise(res => setTimeout(() => res(null), LIMITE));
  const r = await Promise.race([red, espera]);
  return r || guardado;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  const base = new URL('./', self.location).pathname;
  if (!u.pathname.startsWith(base) || u.pathname.startsWith(base + 'archivo-v1/')) return;
  e.respondWith(responder(e));
});
