/* Prueba el service worker sin navegador:  node pruebas/offline.js

   - todo lo que carga index.html está en la lista que se guarda para
     usar sin señal, y todos esos archivos existen
   - al instalarse guarda todo
   - al activarse borra sus versiones viejas y el caché de la app v1 en
     la raíz, pero no toca el de /archivo-v1/ ni los de otras apps
   - con señal responde con la red; sin señal, con lo guardado
   - no se mete con los pedidos de /archivo-v1/                          */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const raiz = path.join(__dirname, '..');
const errores = [];
const ok = (cond, msg) => { if (!cond) errores.push(msg); };

function probar(carpeta, origenBase) {
  const fuente = fs.readFileSync(path.join(raiz, carpeta, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(raiz, carpeta, 'index.html'), 'utf8');

  const almacenes = new Map();
  const abrir = n => { if (!almacenes.has(n)) almacenes.set(n, new Map()); return almacenes.get(n); };
  const absoluta = u => new URL(typeof u === 'string' ? u : u.url, origenBase).href.split('?')[0];
  const caches = {
    open: async n => { const m = abrir(n); return { put: async (k, v) => { m.set(absoluta(k), v); }, match: async k => m.get(absoluta(k)) }; },
    keys: async () => Array.from(almacenes.keys()),
    delete: async n => almacenes.delete(n)
  };
  let conSenal = true;
  const pedidos = [];
  const respuesta = url => ({ ok: true, type: 'basic', url, clone() { return this; } });
  const manejadores = {};
  const ctx = {
    self: {
      location: new URL('sw.js', origenBase),
      addEventListener: (t, fn) => { manejadores[t] = fn; },
      skipWaiting: async () => {}, clients: { claim: async () => {} }
    },
    caches, URL, Promise, setTimeout, console,
    Request: function (u) { this.url = new URL(u, origenBase).href; },
    Response: { error: () => ({ ok: false, error: true }) },
    fetch: async u => { const url = absoluta(u); pedidos.push(url); if (!conSenal) throw new Error('sin señal'); return respuesta(url); }
  };
  vm.createContext(ctx);
  vm.runInContext(fuente, ctx, { filename: carpeta + '/sw.js' });
  const lista = vm.runInContext('ARCHIVOS', ctx), version = vm.runInContext('VERSION', ctx);

  /* lo que carga la página está en la lista y existe */
  const refs = Array.from(html.matchAll(/(?:src|href)="([^"#:]+)"/g)).map(m => m[1]).filter(r => !r.startsWith('..') && !r.endsWith('/'));
  refs.forEach(r => ok(lista.includes('./' + r), carpeta + ': ' + r + ' no está en la lista del service worker'));
  lista.filter(a => a !== './').forEach(a => ok(fs.existsSync(path.join(raiz, carpeta, a)), carpeta + ': falta el archivo ' + a));

  const esperar = async fn => { let p = Promise.resolve(); fn({ waitUntil: x => { p = x; } }); await p; };

  return (async () => {
    await esperar(manejadores.install);
    ok(abrir(version).size === lista.length, carpeta + ': al instalar guardó ' + abrir(version).size + ' de ' + lista.length);

    ['plan-v3', 'quecomo-v2-0', 'plan-v1-archivo-0', 'otra-app-v1'].forEach(abrir);
    const otro = carpeta === '.' ? 'plan-v1-archivo-1' : 'quecomo-v2-1';
    abrir(otro);
    await esperar(manejadores.activate);
    const quedan = Array.from(almacenes.keys());
    ok(quedan.includes(version), carpeta + ': borró su propio caché');
    ok(quedan.includes('otra-app-v1'), carpeta + ': borró el caché de otra app');
    ok(quedan.includes(otro), carpeta + ': borró el caché de la otra versión de la app (' + otro + ')');
    if (carpeta === '.') {
      ok(!quedan.includes('plan-v3'), 'raíz: no limpió el caché viejo de la v1');
      ok(!quedan.includes('quecomo-v2-0'), 'raíz: no limpió su versión anterior');
      ok(quedan.includes('plan-v1-archivo-0'), 'raíz: tocó un caché del archivo v1');
    } else {
      ok(!quedan.includes('plan-v1-archivo-0'), 'archivo: no limpió su versión anterior');
      ok(quedan.includes('quecomo-v2-0'), 'archivo: tocó un caché de la app nueva');
    }

    const pedir = async (ruta, modo) => {
      let r; const hecho = [];
      manejadores.fetch({
        request: { method: 'GET', url: new URL(ruta, origenBase).href, mode: modo || 'no-cors' },
        respondWith: p => { r = p; }, waitUntil: p => { hecho.push(p); }
      });
      const res = r ? await r : undefined;
      await Promise.all(hecho);
      return res;
    };

    conSenal = true;
    const principal = carpeta === '.' ? 'js/app.js' : 'js/app.js';
    const conRed = await pedir(principal);
    ok(conRed && conRed.ok, carpeta + ': con señal no respondió');
    conSenal = false;
    const sinRed = await pedir(principal);
    ok(sinRed && sinRed.ok, carpeta + ': sin señal no respondió con lo guardado');
    const pagina = await pedir('index.html?x=1', 'navigate');
    ok(pagina && pagina.ok, carpeta + ': sin señal no abre la página');
    if (carpeta === '.') {
      const ajeno = await pedir('archivo-v1/js/app.js');
      ok(ajeno === undefined, 'raíz: intercepta los pedidos de /archivo-v1/');
    }
    return { carpeta, version, archivos: lista.length };
  })();
}

(async () => {
  const a = await probar('.', 'https://ejemplo.test/plan-comidas/');
  const b = await probar('archivo-v1', 'https://ejemplo.test/plan-comidas/archivo-v1/');
  [a, b].forEach(x => console.log('  ' + (x.carpeta === '.' ? 'raíz' : x.carpeta).padEnd(12) + x.version.padEnd(22) + x.archivos + ' archivos'));
  if (errores.length) { console.log('\n✗ ' + errores.length + ' problema(s):'); errores.forEach(e => console.log(' - ' + e)); process.exit(1); }
  console.log('\n✓ Los dos service workers guardan todo, no se pisan y responden sin señal');
})();
