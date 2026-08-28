/* ---------------------------------------------------------------
   ESTADO — los únicos hechos durables que guarda la app.
   Todo lo demás (el plan de la semana, el inventario, las listas)
   se calcula a partir de esto. Si acá no hay nada, la app igual
   funciona: se asume la compra de siempre y el plan que salga.
   --------------------------------------------------------------- */

const Estado = (() => {
  const CLAVE = 'plan.comidas.v1';

  /* Una compra registrada es siempre { fecha, faltantes: [ids], cant: {id: n} }.
     faltantes = lo que no conseguí; cant = solo lo que compré distinto de lo
     sugerido. Lo que no está en cant entró en la cantidad de la lista. */
  const vacio = () => ({
    compras: {},        // inicioSemana -> compra registrada (la semanal)
    hojas: {},          // inicioSemana -> compra registrada (reposición del miércoles)
    alacena: {},        // fecha      -> compra registrada (cada 3 semanas)
    cambios: {},        // inicioSemana -> { 'dia:comida' -> idPlato }
    fijados: {},        // inicioSemana -> { 'dia:comida' -> {plato, base, guarnicion} }
    saltados: {},       // inicioSemana -> ['dia:comida']
    verdura: {},        // inicioSemana -> { 'dia:comida' -> gramos }
    unaVez: [],         // ids de alacena ya comprados una vez
    tildes: {}          // idLista -> { idItem: true }
  });

  let s = null;

  /* Los formatos viejos se convierten al leer: hojas era true/false y
     alacena era una lista de fechas. */
  function migrar(st) {
    if (st.hojas === true || Array.isArray(st.hojas)) st.hojas = {};
    Object.keys(st.hojas || {}).forEach(k => {
      if (st.hojas[k] === true) st.hojas[k] = { fecha: k, estado: {}, cant: {} };
    });
    if (Array.isArray(st.alacena)) {
      const m = {};
      st.alacena.forEach(f => { m[f] = { fecha: f, estado: {}, cant: {} }; });
      st.alacena = m;
    }
    // el formato viejo guardaba solo los faltantes: lo demas se daba por comprado
    Object.keys(st.compras || {}).forEach(k => {
      const r = st.compras[k];
      if (r && !r.estado) {
        r.estado = {};
        (r.faltantes || []).forEach(id => { r.estado[id] = 'no'; });
        delete r.faltantes;
      }
      if (r && !r.cant) r.cant = {};
    });
    return st;
  }

  function cargar() {
    if (s) return s;
    try {
      s = migrar(Object.assign(vacio(), JSON.parse(localStorage.getItem(CLAVE) || '{}')));
    } catch (e) {
      s = vacio();
    }
    return s;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(cargar())); } catch (e) { /* modo privado */ }
  }

  const sub = (mapa, semana, def) => {
    const st = cargar();
    if (!st[mapa][semana]) st[mapa][semana] = def;
    return st[mapa][semana];
  };

  const MAPA = { semanal: 'compras', hojas: 'hojas', alacena: 'alacena' };

  /* El registro de una compra, creándolo si hace falta. */
  function registroVivo(tipo, clave) {
    const st = cargar()[MAPA[tipo]];
    if (!st[clave]) st[clave] = { fecha: U.ymd(new Date()), estado: {}, cant: {} };
    if (!st[clave].estado) st[clave].estado = {};
    if (!st[clave].cant) st[clave].cant = {};
    return st[clave];
  }

  /* Si no queda nada marcado, no hay registro: la compra no empezó. */
  function limpiarSiVacio(tipo, clave) {
    const st = cargar()[MAPA[tipo]];
    const r = st[clave];
    if (r && !Object.keys(r.estado).length) delete st[clave];
  }

  return {
    get: cargar,
    guardar,

    compra:   (sem) => cargar().compras[sem] || null,
    /* Lo que marqué explícitamente como "no lo conseguí". Es lo único de la
       compra que cambia el plan: lo que está sin marcar no lo condiciona. */
    faltantes: (sem) => {
      const r = cargar().compras[sem];
      if (!r || !r.estado) return [];
      return Object.keys(r.estado).filter(id => r.estado[id] === 'no');
    },
    cambios:  (sem) => cargar().cambios[sem] || {},
    fijados:  (sem) => cargar().fijados[sem] || {},
    saltados: (sem) => cargar().saltados[sem] || [],
    verduras: (sem) => cargar().verdura[sem] || {},
    hojas:    (sem) => cargar().hojas[sem] || null,
    alacena:  (fecha) => cargar().alacena[fecha] || null,
    hayAlgunaAlacena: () => Object.keys(cargar().alacena).length > 0,

    /* Las tres compras se registran igual, ítem por ítem y a medida que se
       compra. Cada ítem puede estar sin marcar, 'ok' (lo compré) o 'no' (no
       lo conseguí), y puede tener una cantidad distinta de la sugerida. */
    registro(tipo, clave) {
      const st = cargar()[MAPA[tipo]];
      return st[clave] || null;
    },
    marcarItem(tipo, clave, id, valor) {
      const r = registroVivo(tipo, clave);
      if (valor) r.estado[id] = valor; else { delete r.estado[id]; delete r.cant[id]; }
      r.fecha = U.ymd(new Date());
      if (tipo === 'semanal') delete cargar().fijados[clave];
      limpiarSiVacio(tipo, clave);
      guardar();
    },
    marcarVarios(tipo, clave, ids, valor) {
      const r = registroVivo(tipo, clave);
      ids.forEach(id => {
        if (valor) r.estado[id] = valor; else { delete r.estado[id]; delete r.cant[id]; }
      });
      r.fecha = U.ymd(new Date());
      if (tipo === 'semanal') delete cargar().fijados[clave];
      limpiarSiVacio(tipo, clave);
      guardar();
    },
    setCantidad(tipo, clave, id, n) {
      const r = registroVivo(tipo, clave);
      if (n === null || n === undefined || n === '') delete r.cant[id];
      else r.cant[id] = Number(n);
      if (!r.estado[id]) r.estado[id] = 'ok';   // cargar cantidad es haberlo comprado
      guardar();
    },
    limpiarRegistro(tipo, clave) {
      delete cargar()[MAPA[tipo]][clave];
      guardar();
    },
    /* Un cambio congela todo lo anterior y recalcula de ahí para adelante. */
    cambiarPlato(sem, dia, comida, idPlato, anteriores) {
      const fij = sub('fijados', sem, {});
      anteriores.forEach(sl => { fij[sl.clave] = { plato: sl.plato.id, base: sl.base, guarnicion: sl.guarnicion.id }; });
      sub('cambios', sem, {})[dia + ':' + comida] = idPlato;
      guardar();
    },
    saltar(sem, dia, comida, valor) {
      const lista = sub('saltados', sem, []);
      const k = dia + ':' + comida;
      const i = lista.indexOf(k);
      if (valor && i < 0) lista.push(k);
      if (!valor && i >= 0) lista.splice(i, 1);
      guardar();
    },
    setVerdura(sem, dia, comida, gramos) {
      sub('verdura', sem, {})[dia + ':' + comida] = gramos;
      guardar();
    },

    unaVezHecho: (id) => cargar().unaVez.indexOf(id) >= 0,
    marcarUnaVez(ids) {
      const st = cargar();
      ids.forEach(id => { if (st.unaVez.indexOf(id) < 0) st.unaVez.push(id); });
      guardar();
    },
    reponerUnaVez(id) {
      const st = cargar();
      const i = st.unaVez.indexOf(id);
      if (i >= 0) st.unaVez.splice(i, 1);
      guardar();
    },

    tildes: (lista) => cargar().tildes[lista] || {},
    tildar(lista, item, valor) {
      const t = sub('tildes', lista, {});
      if (valor) t[item] = true; else delete t[item];
      guardar();
    },
    limpiarTildes(lista) {
      delete cargar().tildes[lista];
      guardar();
    },

    alacenaHecha: (fecha) => !!cargar().alacena[fecha],

    borrarTodo() {
      s = vacio();
      guardar();
    }
  };
})();
