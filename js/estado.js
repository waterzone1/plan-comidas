/* ---------------------------------------------------------------
   ESTADO — lo poco que la app recuerda. Nada de esto hay que
   mantenerlo al día: son gustos (favoritos, votos, veces hecho),
   la lista de compras en curso y las fotos propias.

   Todo vive en el teléfono: localStorage con prefijo "v2:" (para no
   chocar con la app vieja) y las fotos en IndexedDB.
   --------------------------------------------------------------- */

const Estado = (() => {
  const CLAVE = 'v2:estado';

  const vacio = () => ({
    version: 2,
    modo: 'mantener',     // bajar | mantener | subir
    tema: 'auto',         // auto | claro | oscuro
    favoritos: {},        // idPlato -> true
    votos: {},            // idPlato -> 1 | -1
    hechos: {},           // idPlato -> veces cocinado
    ultima: {},           // idPlato -> fecha de la última vez
    combos: {},           // idPlato -> última combinación elegida
    compra: { titulo: '', filas: [], listos: {} },   // modo compra
    sonido: true
  });

  let s = null;

  function cargar() {
    if (s) return s;
    try { s = Object.assign(vacio(), JSON.parse(localStorage.getItem(CLAVE) || '{}')); }
    catch (e) { s = vacio(); }
    if (!s.compra || !Array.isArray(s.compra.filas)) s.compra = vacio().compra;
    return s;
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(cargar())); } catch (e) { /* modo privado */ }
  }

  function cambiar(fn) { fn(cargar()); guardar(); }

  function exportar() { return JSON.stringify(cargar(), null, 1); }

  function importar(txt) {
    const o = JSON.parse(txt);
    if (!o || typeof o !== 'object' || o.version !== 2) throw new Error('No es una copia de esta app');
    s = Object.assign(vacio(), o);
    guardar();
  }

  function borrar() { s = vacio(); guardar(); }

  return { get: cargar, cambiar, guardar, exportar, importar, borrar };
})();

/* Fotos propias de los platos. Se guardan como JPEG ya comprimido. */
const Fotos = (() => {
  const BASE = 'v2:fotos', ALMACEN = 'fotos';
  const urls = {};
  let db = null;

  function abrir() {
    return new Promise((ok, mal) => {
      if (db) return ok(db);
      if (typeof indexedDB === 'undefined') return mal(new Error('sin IndexedDB'));
      const r = indexedDB.open(BASE, 1);
      const espera = setTimeout(() => mal(new Error('la base de fotos no responde')), 6000);
      r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
      r.onsuccess = () => {
        clearTimeout(espera);
        db = r.result;
        db.onversionchange = () => { db.close(); db = null; };
        db.onclose = () => { db = null; };
        ok(db);
      };
      r.onerror = () => { clearTimeout(espera); mal(r.error); };
      r.onblocked = () => { clearTimeout(espera); mal(new Error('la base de fotos está ocupada')); };
    });
  }

  function tx(modo, fn) {
    return abrir().then(d => new Promise((ok, mal) => {
      const t = d.transaction(ALMACEN, modo);
      const res = fn(t.objectStore(ALMACEN));
      t.oncomplete = () => ok(res && res.result);
      t.onerror = () => mal(t.error);
      t.onabort = () => mal(t.error);
    }));
  }

  /* Lee todas las fotos una vez al abrir y deja sus URLs listas. */
  function cargar() {
    return abrir().then(d => new Promise(ok => {
      const st = d.transaction(ALMACEN, 'readonly').objectStore(ALMACEN);
      const r = st.openCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (!c) return ok();
        urls[c.key] = URL.createObjectURL(c.value);
        c.continue();
      };
      r.onerror = () => ok();
    })).catch(() => {});
  }

  /* Achica a ~1200 px de lado mayor y pasa a JPEG 0.8. */
  function comprimir(archivo) {
    return new Promise((ok, mal) => {
      const img = new Image();
      const u = URL.createObjectURL(archivo);
      img.onload = () => {
        const MAX = 1200;
        const f = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * f);
        c.height = Math.round(img.naturalHeight * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(b => b ? ok(b) : mal(new Error('no se pudo comprimir')), 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(u); mal(new Error('no es una imagen')); };
      img.src = u;
    });
  }

  function guardar(id, archivo) {
    return comprimir(archivo).then(blob => tx('readwrite', st => st.put(blob, id)).then(() => {
      if (urls[id]) URL.revokeObjectURL(urls[id]);
      urls[id] = URL.createObjectURL(blob);
    }));
  }

  function quitar(id) {
    return tx('readwrite', st => st.delete(id)).then(() => {
      if (urls[id]) URL.revokeObjectURL(urls[id]);
      delete urls[id];
    });
  }

  function borrarTodas() {
    return tx('readwrite', st => st.clear()).then(() => {
      Object.keys(urls).forEach(k => { URL.revokeObjectURL(urls[k]); delete urls[k]; });
    });
  }

  return { cargar, guardar, quitar, borrarTodas, url: id => urls[id] || null, cuantas: () => Object.keys(urls).length };
})();
