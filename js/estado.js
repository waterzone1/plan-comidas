/* ---------------------------------------------------------------
   ESTADO — los únicos hechos durables que guarda la app.
   Todo lo demás (el plan de la semana, el inventario, las listas)
   se calcula a partir de esto. Si acá no hay nada, la app igual
   funciona: se asume la compra de siempre y el plan que salga.
   --------------------------------------------------------------- */

const Estado = (() => {
  const CLAVE = 'plan.comidas.v1';

  const vacio = () => ({
    compras: {},        // inicioSemana -> { fecha, faltantes: [idItem] }
    hojas: {},          // inicioSemana -> true (se hizo la reposición del miércoles)
    cambios: {},        // inicioSemana -> { 'dia:comida' -> idPlato }
    fijados: {},        // inicioSemana -> { 'dia:comida' -> {plato, base, guarnicion} }
    saltados: {},       // inicioSemana -> ['dia:comida']
    verdura: {},        // inicioSemana -> { 'dia:comida' -> gramos }
    unaVez: [],         // ids de alacena ya comprados una vez
    tildes: {},         // idLista -> { idItem: true }
    alacena: []         // fechas de alacena ya compradas
  });

  let s = null;

  function cargar() {
    if (s) return s;
    try {
      s = Object.assign(vacio(), JSON.parse(localStorage.getItem(CLAVE) || '{}'));
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
    faltantes:(sem) => (cargar().compras[sem] || {}).faltantes || [],
    cambios:  (sem) => cargar().cambios[sem] || {},
    fijados:  (sem) => cargar().fijados[sem] || {},
    saltados: (sem) => cargar().saltados[sem] || [],
    verduras: (sem) => cargar().verdura[sem] || {},
    hojas:    (sem) => !!cargar().hojas[sem],

    registrarCompra(sem, faltantes) {
      cargar().compras[sem] = { fecha: U.ymd(new Date()), faltantes: faltantes.slice() };
      // una compra nueva rehace la semana entera
      delete cargar().fijados[sem];
      guardar();
    },
    registrarHojas(sem, hecho) {
      if (hecho) cargar().hojas[sem] = true; else delete cargar().hojas[sem];
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

    alacenaHecha: (fecha) => cargar().alacena.indexOf(fecha) >= 0,
    marcarAlacena(fecha) {
      const st = cargar();
      if (st.alacena.indexOf(fecha) < 0) st.alacena.push(fecha);
      guardar();
    },

    borrarTodo() {
      s = vacio();
      guardar();
    }
  };
})();
