/* Prueba en un navegador de verdad, sin ventana:

     node pruebas/navegador.js ["ruta al chrome.exe o msedge.exe"]

   Levanta un servidor propio, abre la app en Chrome o Edge (headless,
   con un perfil temporal) y verifica:
   - que cada pantalla cargue sin errores en la consola
   - que el service worker de la raíz y el de /archivo-v1/ queden
     activos, cada uno con su alcance y su caché
   - que apagando el servidor la app siga abriendo (sin señal)
   No usa dependencias: habla con el navegador por su puerto de depuración. */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const raiz = path.join(__dirname, '..');
const CANDIDATOS = [
  process.argv[2],
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

const esperar = ms => new Promise(r => setTimeout(r, ms));
const errores = [];
const nota = (ok, txt) => { console.log('  ' + (ok ? '✓' : '✗') + ' ' + txt); if (!ok) errores.push(txt); };

function servidor() {
  const enchufes = new Set();
  const s = http.createServer((req, res) => {
    let ruta = decodeURIComponent(req.url.split('?')[0]);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = path.join(raiz, ruta);
    if (!archivo.startsWith(raiz) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(archivo).pipe(res);
  });
  s.on('connection', c => { enchufes.add(c); c.on('close', () => enchufes.delete(c)); });
  return new Promise(ok => s.listen(0, '127.0.0.1', () => ok({
    puerto: s.address().port,
    apagar: () => new Promise(r => { enchufes.forEach(c => c.destroy()); s.close(() => r()); })
  })));
}

async function main() {
  const exe = CANDIDATOS.find(c => fs.existsSync(c));
  if (!exe) { console.log('No encontré Chrome ni Edge. Pasá la ruta como argumento.'); process.exit(2); }
  const srv = await servidor();
  const base = 'http://localhost:' + srv.puerto + '/';
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'quecomo-'));
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const nav = spawn(exe, ['--headless=new', '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });

  let ws = null;
  const cerrar = async () => {
    try { if (ws) ws.close(); } catch (e) { /* nada */ }
    nav.kill();
    await srv.apagar().catch(() => {});
    await esperar(400);
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* queda en temp */ }
  };

  try {
    let destino = null;
    for (let i = 0; i < 40 && !destino; i++) {
      await esperar(250);
      try {
        const lista = await (await fetch('http://127.0.0.1:' + puerto + '/json/list')).json();
        destino = lista.find(t => t.type === 'page');
      } catch (e) { /* todavía no levantó */ }
    }
    if (!destino) throw new Error('el navegador no abrió el puerto de depuración');

    ws = new WebSocket(destino.webSocketDebuggerUrl);
    await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = () => mal(new Error('no pude conectarme')); });
    let id = 0;
    const pendientes = new Map(), consola = [];
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); return; }
      if (d.method === 'Runtime.exceptionThrown') consola.push('excepción: ' + (d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text));
      if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consola.push('console.error: ' + d.params.args.map(a => a.value || a.description).join(' '));
      if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') consola.push('log: ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
    };
    const cdp = (method, params) => new Promise(ok => { const n = ++id; pendientes.set(n, ok); ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
    const js = async expr => {
      const r = await cdp('Runtime.evaluate', { expression: '(async () => { ' + expr + ' })()', awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description);
      return r.result.result.value;
    };
    await cdp('Runtime.enable'); await cdp('Log.enable'); await cdp('Page.enable');

    console.log('\nNavegador: ' + path.basename(exe) + '\n');
    await cdp('Page.navigate', { url: base + 'index.html' });
    await esperar(1500);

    const sw = await js(`const r = await navigator.serviceWorker.ready; let n = 0;
      while (!navigator.serviceWorker.controller && n++ < 40) await new Promise(x => setTimeout(x, 100));
      const ks = await caches.keys(); const c = await caches.open(ks.find(k => k.startsWith('quecomo-')) || 'x');
      return { estado: r.active.state, alcance: new URL(r.scope).pathname, controla: !!navigator.serviceWorker.controller, caches: ks, guardados: (await c.keys()).length };`);
    nota(sw.estado === 'activated' && sw.alcance === '/', 'service worker de la raíz activo (alcance ' + sw.alcance + ')');
    nota(sw.guardados >= 20, 'guardó ' + sw.guardados + ' archivos para usar sin señal (' + sw.caches.join(', ') + ')');

    const rutas = ['', 'express', 'siempre', 'tengo', 'antojo', 'armador', 'explorar', 'vianda', 'permitidos', 'compras', 'ajustes', 'plato/pollo-wok', 'plato/bolognesa%7Cnoquis%7Ccebolla%7Ctomate',
      'plato/pollo-plancha-pasta', 'plato/atun-sandwich', 'desayuno', 'desayuno/revueltos', 'recomendaciones', 'recomendaciones/postre', 'receta/hummus', 'receta/r-pollo-naranja'];
    for (const r of rutas) {
      await js(`location.hash = '#/${r}'; await new Promise(x => setTimeout(x, 120)); return 1;`);
    }
    const pantallas = await js(`const out = {}; for (const r of ['express', 'explorar', 'vianda']) { location.hash = '#/' + r; await new Promise(x => setTimeout(x, 120)); out[r] = document.querySelectorAll('.plato').length; }
      location.hash = '#/'; await new Promise(x => setTimeout(x, 120)); out.modos = document.querySelectorAll('.modo-t').length; out.dia = document.querySelectorAll('.destacado').length; return out;`);
    nota(pantallas.modos === 10 && pantallas.dia === 3, 'inicio: ' + pantallas.dia + ' platos del día y ' + pantallas.modos + ' modos');
    nota(pantallas.express > 20 && pantallas.explorar > 80, 'listas: Express ' + pantallas.express + ', Explorar ' + pantallas.explorar + ', Vianda ' + pantallas.vianda);

    const fijas = await js(`const out = {}; location.hash = '#/desayuno'; await new Promise(x => setTimeout(x, 120)); out.des = document.querySelectorAll('.plato').length;
      location.hash = '#/recomendaciones'; await new Promise(x => setTimeout(x, 120)); out.reco = document.querySelectorAll('.plato').length;
      location.hash = '#/receta/hummus'; await new Promise(x => setTimeout(x, 120)); out.pasos = document.querySelectorAll('.pasos li').length;
      location.hash = '#/armador'; await new Promise(x => setTimeout(x, 120));
      for (const [a, id] of [['armar-g', 'pollo'], ['armar-e', 'plancha'], ['armar-c', 'fideos']]) { document.querySelector('[data-a="' + a + '"][data-id="' + id + '"]').click(); await new Promise(x => setTimeout(x, 60)); }
      out.verduras = ['morron', 'cebolla', 'champinon'].filter(v => !document.querySelector('[data-a="armar-v"][data-id="' + v + '"]').disabled).length;
      document.querySelector('[data-a="armar-limpiar"]').click(); return out;`);
    nota(fijas.des >= 10 && fijas.reco >= 30 && fijas.pasos >= 2, 'desayunos (' + fijas.des + ') y recomendaciones (' + fijas.reco + ' comidas) abren con sus pasos');
    nota(fijas.verduras === 3, 'armador: pollo + plancha + fideos deja elegir morrón, cebolla y champiñones');

    const juego = await js(`location.hash = '#/permitidos'; await new Promise(x => setTimeout(x, 150));
      document.querySelector('[data-a="elegir-permitido"]').click(); await new Promise(x => setTimeout(x, 100));
      document.querySelector('[data-a="jugar"]').click(); await new Promise(x => setTimeout(x, 300));
      const J = document.getElementById('juego'); J.querySelector('[data-j="ir"]').click(); await new Promise(x => setTimeout(x, 900));
      const c = J.querySelector('#j-mano .jc:not(.no)'); c.click(); await new Promise(x => setTimeout(x, 80));
      const ap = J.querySelector('.j-ene.apuntable'); if (ap) ap.click(); else J.querySelector('#j-mano .jc.sel').click();
      const libre = async () => { let n = 0; await new Promise(x => setTimeout(x, 150)); while (J.classList.contains('ocupado') && n++ < 120) await new Promise(x => setTimeout(x, 100)); };
      await libre(); J.querySelector('[data-j="fin-turno"]').click(); await libre();
      const fase = J.querySelector('.j-marco').className, mano = J.querySelectorAll('#j-mano .jc').length;
      localStorage.removeItem('v2:juego'); return { fase, mano };`);
    nota(/f-combate/.test(juego.fase) && juego.mano >= 5, 'juego: un turno completo de combate (' + juego.mano + ' cartas en la mano del turno 2)');

    await cdp('Page.navigate', { url: base + 'archivo-v1/index.html' });
    await esperar(1800);
    const v1 = await js(`const r = await navigator.serviceWorker.ready; return { alcance: new URL(r.scope).pathname, caches: await caches.keys(), pestanas: document.querySelectorAll('.tab').length, titulo: document.title };`);
    nota(v1.alcance === '/archivo-v1/' && v1.pestanas === 4, 'app vieja en /archivo-v1/ con su propio service worker (alcance ' + v1.alcance + ')');
    nota(v1.caches.some(k => k.startsWith('quecomo-')) && v1.caches.some(k => k.startsWith('plan-v1-archivo-')), 'los dos cachés conviven: ' + v1.caches.join(', '));

    nota(consola.length === 0, 'sin errores en la consola' + (consola.length ? ':\n      ' + consola.join('\n      ') : ''));

    await srv.apagar();
    consola.length = 0;
    await cdp('Page.navigate', { url: base + 'index.html' });
    await esperar(2600);
    const sin = await js(`return { modos: document.querySelectorAll('.modo-t').length, dia: document.querySelectorAll('.destacado').length, svg: document.querySelectorAll('.destacado svg').length };`).catch(e => ({ error: e.message }));
    nota(sin.modos === 10 && sin.dia === 3 && sin.svg === 3, 'con el servidor apagado la app nueva abre igual');
    await cdp('Page.navigate', { url: base + 'archivo-v1/index.html' });
    await esperar(2600);
    const sinV1 = await js(`return { pestanas: document.querySelectorAll('.tab').length };`).catch(e => ({ error: e.message }));
    nota(sinV1.pestanas === 4, 'con el servidor apagado la app vieja abre igual');
  } finally {
    await cerrar();
  }

  if (errores.length) { console.log('\n✗ ' + errores.length + ' problema(s)'); process.exit(1); }
  console.log('\n✓ La app carga sin errores, queda instalada y funciona sin señal');
}

main().catch(e => { console.log('\n✗ ' + e.message); process.exit(1); });
