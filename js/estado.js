/* ---------------------------------------------------------------
   ESTADO — los únicos hechos durables que guarda la app.
   Todo lo demás (el plan de la semana, el inventario, las listas)
   se calcula a partir de esto. Si acá no hay nada, la app igual
   funciona: se asume la compra de siempre y el plan que salga.
   --------------------------------------------------------------- */

const Estado = (() => {
  const CLAVE = 'plan.comidas.v1';

  /* El inventario es un stock que corre: cada compra aceptada es un evento
     que suma, y las comidas del plan van restando. La lista de compras
     muestra la diferencia entre lo que hay y lo que tendría que haber. */
  const vacio = () => ({
    entradas: [],       // [{ fecha, items: {clave: cantidad} }] compras aceptadas
    borrador: null,     // lo marcado que todavía no se aceptó
    compras: {},        // inicioSemana -> { fecha, estado: {id:'no'} } lo que no conseguí
    hojas: {},          // (formato viejo, se conserva para no perder datos)
    alacena: {},        // fecha -> compra de alacena aceptada
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
    if (Array.isArray(st.alacena)) st.alacena = {};
    if (!Array.isArray(st.entradas)) st.entradas = [];
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
    hayEntradas: () => cargar().entradas.length > 0,

    /* --- el borrador: lo que voy marcando mientras compro --- */
    borrador() {
      const st = cargar();
      if (!st.borrador) st.borrador = { estado: {}, cant: {} };
      return st.borrador;
    },
    marcarItem(id, valor) {
      const b = this.borrador();
      if (valor) b.estado[id] = valor; else { delete b.estado[id]; delete b.cant[id]; }
      guardar();
    },
    marcarVarios(ids, valor) {
      const b = this.borrador();
      ids.forEach(id => {
        if (valor) b.estado[id] = valor; else { delete b.estado[id]; delete b.cant[id]; }
      });
      guardar();
    },
    setCantidad(id, n) {
      const b = this.borrador();
      if (n === null || n === undefined || n === '') delete b.cant[id];
      else b.cant[id] = Number(n);
      if (!b.estado[id]) b.estado[id] = 'ok';   // cargar una cantidad es haberlo comprado
      guardar();
    },
    limpiarBorrador() {
      cargar().borrador = { estado: {}, cant: {} };
      guardar();
    },

    /* --- aceptar: lo marcado entra al inventario --- */
    entradas: () => cargar().entradas,
    agregarEntrada(items) {
      if (!Object.keys(items).length) return;
      cargar().entradas.push({ fecha: U.ymd(new Date()), items: Object.assign({}, items) });
      guardar();
    },
    /* Lo que no conseguí es de la semana, porque es lo que cambia el plan. */
    registrarNoConseguido(sem, ids) {
      const st = cargar();
      if (!ids.length) { delete st.compras[sem]; guardar(); return; }
      const estado = {};
      ids.forEach(id => { estado[id] = 'no'; });
      st.compras[sem] = { fecha: U.ymd(new Date()), estado };
      delete st.fijados[sem];
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

    borrarTodo() {
      s = vacio();
      guardar();
    }
  };
})();
