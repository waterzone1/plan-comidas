/* ---------------------------------------------------------------
   INVENTARIO — se descuenta según lo que el plan dice que se va a
   comer, no según lo que el usuario confirme. La confirmación es
   opcional y solo sirve para corregir desvíos.
   --------------------------------------------------------------- */

const Inventario = (() => {
  const HORA = { almuerzo: 13, cena: 21 };

  const momento = (slot) => {
    const d = new Date(slot.fecha.getFullYear(), slot.fecha.getMonth(), slot.fecha.getDate());
    d.setHours(HORA[slot.comida], 0, 0, 0);
    return d;
  };
  const yaPaso = (slot, ahora) => momento(slot) <= ahora;

  /* Qué consume una comida. */
  function consumo(slot) {
    const b = BASES[slot.base];
    const verduras = {};
    const por = slot.verduraG / slot.guarnicion.verduras.length;
    slot.guarnicion.verduras.forEach(v => { verduras[v] = (verduras[v] || 0) + por; });
    return {
      proteina: PROTEINAS[slot.grupo].clave ? { clave: PROTEINAS[slot.grupo].clave, cant: PORCION.proteina } : null,
      base: { clave: b.clave, cant: b.cant },
      verduras
    };
  }

  /* La compra de la semana. Normalmente es la lista fija; en la semana del
     arranque son solo diez comidas, así que se ajusta a lo que se va a comer
     de verdad en vez de comprar de más. */
  function compraDe(inicio) {
    const plan = Generador.planSemana(inicio);
    const hayMila = plan.slots.some(s => s.plato.tags.indexOf('desde-congelado') >= 0);
    const lista = COMPRA_SEMANAL.filter(i => !i.soloSiToca || hayMila);
    if (plan.slots.length === 14) return lista.map(i => Object.assign({}, i));

    const dias = 7 - plan.primerDia;
    const r10 = (x) => Math.ceil(x / 10) * 10;
    const usoVerdura = {};
    let papa = 0, noquis = 0;
    plan.slots.forEach(s => {
      const por = PORCION.verduraDefault / s.guarnicion.verduras.length;
      s.guarnicion.verduras.forEach(v => { usoVerdura[v] = (usoVerdura[v] || 0) + por; });
      if (s.base === 'papa') papa++;
      if (s.base === 'ñoquis') noquis++;
    });
    const hojas = {};
    COMPRA_HOJAS.forEach(h => { hojas[h.clave] = (hojas[h.clave] || 0) + h.cant; });

    return lista.map(i => {
      const it = Object.assign({}, i);
      if (i.cant === null) return it;
      if (i.tipo === 'proteina') {
        it.cant = plan.slots.filter(s => PROTEINAS[s.grupo].clave === i.clave).length * PORCION.proteina;
      } else if (i.clave === 'papa') {
        it.cant = papa * BASES['papa'].cant;
      } else if (i.clave === 'noquis') {
        it.cant = noquis * BASES['ñoquis'].cant;
      } else if (i.clave === 'fruta') {
        it.cant = dias;
      } else if (i.clave === 'leche') {
        it.cant = Math.ceil(dias * 0.2 * 10) / 10;
      } else if (VERDURAS[i.clave]) {
        it.cant = r10(Math.max(0, (usoVerdura[i.clave] || 0) - (hojas[i.clave] || 0)) * 1.05);
      }
      return it;
    }).filter(i => i.cant === null || i.cant > 0);
  }

  /* ---------------- el stock ----------------
     El inventario es lo que entró con las compras aceptadas menos lo que se
     fueron llevando las comidas que ya pasaron. No depende de confirmar cada
     comida: se descuenta según el plan. */

  /* Cuánto tendría que haber de cada cosa: la compra de la semana más la
     reposición del miércoles mas lo que trae un ciclo de alacena. */
  function objetivos(inicio, ahora) {
    const obj = {};
    const sumar = (items) => items.forEach(i => {
      if (!i.clave || i.cant === null) return;
      obj[i.clave] = (obj[i.clave] || 0) + i.cant;
    });
    sumar(compraDe(inicio));
    sumar(COMPRA_HOJAS);
    sumar(COMPRA_ALACENA.filter(i => i.cant !== null));
    return obj;
  }

  /* Todo lo que entró con las compras aceptadas hasta ahora. */
  function entradas(ahora) {
    ahora = ahora || new Date();
    const hay = {};
    Estado.entradas().forEach(e => {
      if (U.parse(e.fecha) > U.medianoche(ahora)) return;
      Object.keys(e.items).forEach(k => { hay[k] = (hay[k] || 0) + Number(e.items[k]); });
    });
    return hay;
  }

  /* Lo que ya se comieron las comidas pasadas, desde la primera compra. */
  function consumido(ahora) {
    ahora = ahora || new Date();
    const gasto = {};
    const lista = Estado.entradas();
    if (!lista.length) return gasto;
    const primera = lista.map(e => e.fecha).sort()[0];
    let sem = U.inicioSemana(U.parse(primera));
    if (U.parse(ARRANQUE) > sem) sem = U.inicioSemana(U.parse(ARRANQUE));
    for (let w = 0; w < 30; w++) {
      const inicio = U.ymd(U.sumarDias(sem, 7 * w));
      if (U.parse(inicio) > U.medianoche(ahora)) break;
      const plan = Generador.planSemana(inicio);
      plan.slots.forEach(sl => {
        if (sl.saltado || !yaPaso(sl, ahora)) return;
        const c = consumo(sl);
        if (c.proteina) gasto[c.proteina.clave] = (gasto[c.proteina.clave] || 0) + c.proteina.cant;
        gasto[c.base.clave] = (gasto[c.base.clave] || 0) + c.base.cant;
        Object.keys(c.verduras).forEach(v => { gasto[v] = (gasto[v] || 0) + c.verduras[v]; });
      });
      // merienda: una fruta y 200 ml de leche por cada merienda ya pasada.
      // Cuenta desde las 17:00, que es cuando se toma.
      const hoyIdx = U.indiceDia(ahora, inicio);
      const cuenta = hoyIdx - plan.primerDia + (ahora.getHours() >= 17 ? 1 : 0);
      const dias = Math.min(7 - plan.primerDia, Math.max(0, cuenta));
      gasto['fruta'] = (gasto['fruta'] || 0) + dias;
      gasto['leche'] = (gasto['leche'] || 0) + dias * 0.2;
    }
    return gasto;
  }

  /* Cuánto hay de cada cosa ahora mismo. */
  function stock(ahora) {
    const hay = entradas(ahora);
    const gasto = consumido(ahora);
    const out = {};
    Object.keys(hay).forEach(k => { out[k] = hay[k]; });
    Object.keys(gasto).forEach(k => { out[k] = (out[k] || 0) - gasto[k]; });
    Object.keys(out).forEach(k => { out[k] = Math.max(0, Math.round(out[k] * 10) / 10); });
    return out;
  }

  /* La foto completa: cuánto hay, cuánto tendría que haber y cuánto falta. */
  function situacion(inicio, ahora) {
    ahora = ahora || new Date();
    const obj = objetivos(inicio, ahora);
    const st = stock(ahora);
    const out = {};
    Object.keys(obj).forEach(k => {
      const hay = st[k] || 0;
      out[k] = { objetivo: obj[k], hay, falta: Math.max(0, Math.round((obj[k] - hay) * 10) / 10) };
    });
    return out;
  }

  function heladeraCargada() { return Estado.hayEntradas(); }

  /* Estado del inventario fresco a una fecha dada. */
  function estado(inicio, ahora) {
    ahora = ahora || new Date();
    const plan = Generador.planSemana(inicio);
    const sit = situacion(inicio, ahora);
    const items = [];
    compraDe(inicio).forEach(i => {
      if (!i.clave || i.cant === null) return;
      const s = sit[i.clave] || { objetivo: i.cant, hay: 0, falta: i.cant };
      const info = VERDURAS[i.clave];
      const corre = info && info.desde > 0 ? 0 : plan.primerDia;
      const vida = info ? info.vida + corre : null;
      items.push({
        id: i.id, nombre: i.nombre, un: i.un, tipo: i.tipo, comercio: i.comercio,
        clave: i.clave, total: s.objetivo, queda: s.hay, falta: s.falta,
        vida, vence: vida ? U.sumarDias(U.parse(inicio), vida) : null,
        desde: info ? info.desde + (info.desde > 0 ? 0 : plan.primerDia) : 0
      });
    });
    return { items, plan, situacion: sit };
  }

  /* Perecederos: lo que se vence pronto y todavía queda. */
  function perecederos(inicio, ahora) {
    ahora = ahora || new Date();
    const est = estado(inicio, ahora);
    const hoy = U.indiceDia(ahora, inicio);
    return est.items
      .filter(i => i.vida !== null && i.vida < 90 && i.queda >= 60)   // menos que eso no es un aviso, son restos
      .map(i => ({ ...i, diasRestantes: i.vida - hoy }))
      .filter(i => i.diasRestantes <= 2)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }

  /* Lo que falta: la diferencia entre lo que hay y lo que tendría que haber,
     con las comidas que lo necesitan. */
  function loQueFalta(inicio, ahora) {
    ahora = ahora || new Date();
    const est = estado(inicio, ahora);
    const porItem = {};
    est.items.forEach(i => {
      if (i.falta > 0.5) porItem[i.clave] = { item: i, cant: i.falta, comidas: [] };
    });
    despensa(inicio, ahora).forEach(d => {
      if (d.falta > 0.5) porItem[d.clave] = {
        item: { nombre: d.nombre, un: d.un, comercio: 'almacén' }, cant: d.falta, comidas: [] };
    });
    est.plan.slots.forEach(s => {
      if (s.saltado || yaPaso(s, ahora)) return;
      const c = consumo(s);
      const etiqueta = U.DIAS_CORTO[s.dia] + ' ' + s.comida;
      const marcar = (k) => { if (porItem[k]) porItem[k].comidas.push(etiqueta); };
      if (c.proteina) marcar(c.proteina.clave);
      marcar(c.base.clave);
      Object.keys(c.verduras).forEach(marcar);
    });
    return Object.keys(porItem).map(k => porItem[k]).filter(x => x.cant > 0.5);
  }

  /* Despensa: se sigue por ciclo de alacena (cada 3 semanas). */
  function cicloAlacena(ahora) {
    ahora = ahora || new Date();
    // manda lo que se registró, no lo que estaba planeado: si marqué la
    // compra, la despensa está llena aunque la fecha prevista sea posterior
    const hechas = Object.keys(Estado.get().alacena).sort();
    const yaFue = hechas.filter(f => U.parse(f) <= U.medianoche(ahora));
    if (yaFue.length) return yaFue[yaFue.length - 1];
    if (hechas.length) return hechas[0];
    const previstas = FECHAS_ALACENA.filter(f => U.parse(f) <= U.medianoche(ahora));
    return previstas.length ? previstas[previstas.length - 1] : FECHAS_ALACENA[0];
  }

  /* La próxima compra de alacena, o la última si ya pasaron todas. */
  function proximaAlacena(ahora) {
    ahora = ahora || new Date();
    return FECHAS_ALACENA.find(f => U.parse(f) >= U.medianoche(ahora)) ||
           FECHAS_ALACENA[FECHAS_ALACENA.length - 1];
  }

  /* Antes de la primera compra de alacena registrada la despensa está vacía:
     la app arranca sin nada cargado. */
  function despensaCargada() {
    return Estado.hayEntradas();
  }

  function despensa(inicio, ahora) {
    ahora = ahora || new Date();
    const sit = situacion(inicio, ahora);
    return Object.keys(DESPENSA).map(k => {
      const d = DESPENSA[k];
      const s = sit[k] || { objetivo: 0, hay: 0, falta: 0 };
      return { clave: k, nombre: d.nombre, un: d.un, total: s.objetivo,
               queda: s.hay, falta: s.falta, cargada: Estado.hayEntradas() };
    });
  }

  /* Una porción quedó descongelada porque no comí acá: dónde usarla. */
  function porcionesSueltas(inicio, ahora) {
    ahora = ahora || new Date();
    const plan = Generador.planSemana(inicio);
    const out = [];
    plan.slots.forEach(s => {
      if (!s.saltado || !PROTEINAS[s.grupo].clave) return;
      if (RITMO[s.dia] && s.dia === 0 && SABADO_FRESCO.indexOf(s.grupo) >= 0) return; // el sábado va fresco
      const proxima = plan.slots.find(o => o.idx > s.idx && o.grupo === s.grupo && !o.saltado && !yaPaso(o, ahora));
      out.push({ slot: s, grupo: s.grupo, proxima: proxima || null });
    });
    return out.filter(x => x.proxima);
  }

  /* Las calorías de una comida salteada se reparten en los días siguientes:
     entre 100 y 150 por día, nunca compensando con menos comidas. */
  function compensacion(inicio, ahora) {
    ahora = ahora || new Date();
    const plan = Generador.planSemana(inicio);
    const porDia = {};
    plan.slots.filter(s => s.saltado).forEach(s => {
      const dias = 4;
      let porcion = Math.round(s.kcal / dias);
      porcion = Math.max(100, Math.min(150, porcion));
      for (let k = 1; k <= dias; k++) {
        const d = s.dia + k;
        if (d > 6) break;
        porDia[d] = (porDia[d] || 0) + porcion;
      }
    });
    return porDia;
  }

  /* ¿Ya arrancó el plan? Antes del arranque no hay nada que mostrar. */
  const arrancado = (ahora) => U.medianoche(ahora || new Date()) >= U.parse(ARRANQUE);

  /* Los renglones de la pantalla de compras: cada ítem con lo que falta para
     volver a tenerlo completo. Lo que ya está lleno queda marcado solo. */
  function filasCompra(inicio, ahora) {
    ahora = ahora || new Date();
    const sit = situacion(inicio, ahora);
    const restante = {};
    Object.keys(sit).forEach(k => { restante[k] = sit[k].falta; });
    const b = Estado.borrador();

    const fuentes = [
      { tipo: 'semanal', items: compraDe(inicio).filter(i => i.clave) },
      { tipo: 'hojas',   items: COMPRA_HOJAS },
      { tipo: 'alacena', items: COMPRA_ALACENA.filter(i => !(i.unaVez && Estado.unaVezHecho(i.id))) }
    ];

    const filas = [];
    fuentes.forEach(f => f.items.forEach(i => {
      let falta = 0;
      if (i.clave && i.cant !== null) {
        // si varios ítems comparten un mismo item de inventario (las latas de
        // legumbres, por ejemplo) el faltante se reparte entre ellos
        falta = Math.min(restante[i.clave] || 0, i.cant);
        restante[i.clave] = (restante[i.clave] || 0) - falta;
      } else if (i.cant === null) {
        falta = Estado.unaVezHecho(i.id) ? 0 : 1;   // los de una sola vez
      }
      const lleno = falta < 0.5;
      filas.push({
        tipo: f.tipo, id: i.id, nombre: i.nombre, un: i.un || '',
        comercio: i.comercio || 'almacén',
        detalle: [i.envase, i.nota].filter(Boolean).join(' · '),
        objetivo: i.cant, falta: Math.round(falta * 10) / 10, lleno,
        hay: i.clave && sit[i.clave] ? sit[i.clave].hay : 0,
        marca: b.estado[i.id] || '',
        cant: (i.id in b.cant) ? b.cant[i.id]
            : (i.cant === null ? null : (lleno ? i.cant : Math.max(1, Math.round(falta))))
      });
    }));
    return filas;
  }

  /* Aceptar: lo marcado como comprado entra al inventario de una. */
  function aceptarCompra(inicio, ahora) {
    const filas = filasCompra(inicio, ahora);
    const items = {};
    const noConseguidos = [];
    const unaVez = [];
    filas.forEach(f => {
      if (f.marca === 'no') { noConseguidos.push(f.id); return; }
      if (f.marca !== 'ok') return;
      if (f.cant === null) { unaVez.push(f.id); return; }
      const clave = clavesPorItem[f.id];
      if (clave) items[clave] = (items[clave] || 0) + Number(f.cant);
      if (esUnaVez[f.id]) unaVez.push(f.id);
    });
    Estado.agregarEntrada(items);
    if (unaVez.length) Estado.marcarUnaVez(unaVez);
    Estado.registrarNoConseguido(inicio, noConseguidos);
    Estado.limpiarBorrador();
    return { items, noConseguidos: noConseguidos.length, unaVez: unaVez.length };
  }

  /* Índices para no recorrer los catálogos a cada rato. */
  const clavesPorItem = {};
  const esUnaVez = {};
  [COMPRA_SEMANAL, COMPRA_HOJAS, COMPRA_ALACENA].forEach(lista => lista.forEach(i => {
    if (i.clave) clavesPorItem[i.id] = i.clave;
    if (i.unaVez) esUnaVez[i.id] = true;
  }));

  return { consumo, entradas, consumido, stock, situacion, objetivos, compraDe, heladeraCargada,
           estado, perecederos, loQueFalta, despensa, despensaCargada,
           cicloAlacena, proximaAlacena, filasCompra, aceptarCompra, porcionesSueltas, compensacion,
           momento, yaPaso, arrancado };
})();
