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

  /* ¿Se marcó algo de la compra de esta semana? */
  function heladeraCargada(inicio) {
    return !!Estado.compra(inicio) || !!Estado.hojas(inicio);
  }

  /* Suma al inventario lo que se marcó como comprado, con la cantidad que se
     haya cargado. Lo que está sin marcar no entra: el inventario refleja lo
     que confirmé, no lo que la lista suponía. */
  function sumar(hay, items, registro) {
    items.forEach(i => {
      if (!i.clave || i.cant === null) return;
      if (!(i.clave in hay)) hay[i.clave] = 0;
      if (!registro || registro.estado[i.id] !== 'ok') return;
      hay[i.clave] += (i.id in registro.cant) ? Number(registro.cant[i.id]) : i.cant;
    });
    return hay;
  }

  /* Lo que entró esta semana, ítem por ítem. */
  function entradas(inicio) {
    const hay = {};
    sumar(hay, compraDe(inicio), Estado.compra(inicio));
    sumar(hay, COMPRA_HOJAS, Estado.hojas(inicio));
    return hay;
  }

  /* Estado del inventario fresco a una fecha dada. */
  function estado(inicio, ahora) {
    ahora = ahora || new Date();
    const plan = Generador.planSemana(inicio);
    const hay = entradas(inicio);
    const consumido = {};
    const pendiente = {};

    plan.slots.forEach(s => {
      const destino = yaPaso(s, ahora) ? consumido : pendiente;
      if (s.saltado) return;   // no comí acá: no descuenta
      const c = consumo(s);
      if (c.proteina) destino[c.proteina.clave] = (destino[c.proteina.clave] || 0) + c.proteina.cant;
      destino[c.base.clave] = (destino[c.base.clave] || 0) + c.base.cant;
      Object.keys(c.verduras).forEach(v => { destino[v] = (destino[v] || 0) + c.verduras[v]; });
    });

    // merienda: una fruta y 200 ml de leche por día del plan ya transcurrido
    const diasTotales = 7 - plan.primerDia;
    const diasPasados = Math.min(diasTotales,
      Math.max(0, U.indiceDia(ahora, inicio) + 1 - plan.primerDia));
    consumido['fruta'] = diasPasados;
    consumido['leche'] = diasPasados * 0.2;
    pendiente['fruta'] = diasTotales - diasPasados;
    pendiente['leche'] = (diasTotales - diasPasados) * 0.2;

    const items = [];
    compraDe(inicio).forEach(i => {
      if (!i.clave || i.cant === null) return;
      const total = hay[i.clave] || 0;
      const gastado = consumido[i.clave] || 0;
      const queda = Math.max(0, total - gastado);
      // la ventana se corre con la compra: en la semana del arranque se compra
      // el lunes, así que lo perecedero aguanta dos días más
      const info = VERDURAS[i.clave];
      const corre = info && info.desde > 0 ? 0 : plan.primerDia;
      const vida = info ? info.vida + corre : null;
      items.push({
        id: i.id, nombre: i.nombre, un: i.un, tipo: i.tipo, comercio: i.comercio,
        clave: i.clave, total, queda, gastado,
        pendiente: pendiente[i.clave] || 0,
        falta: Math.max(0, (pendiente[i.clave] || 0) - queda),
        vida,
        vence: vida ? U.sumarDias(U.parse(inicio), vida) : null,
        desde: info ? info.desde + (info.desde > 0 ? 0 : plan.primerDia) : 0,
        sinStock: total === 0
      });
    });

    return { items, consumido, pendiente, plan };
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

  /* Botón 4 — lo que falta: inventario real contra las comidas que quedan. */
  function loQueFalta(inicio, ahora) {
    ahora = ahora || new Date();
    const est = estado(inicio, ahora);
    const plan = est.plan;
    const porItem = {};

    est.items.forEach(i => {
      if (i.falta > 0.5) porItem[i.clave] = { item: i, cant: i.falta, comidas: [] };
    });

    // despensa: bases secas y latas
    const desp = despensa(inicio, ahora);
    desp.forEach(d => {
      if (d.falta > 0) {
        porItem[d.clave] = { item: { nombre: d.nombre, un: d.un, comercio: 'almacén' }, cant: d.falta, comidas: [] };
      }
    });

    plan.slots.forEach(s => {
      if (s.saltado || yaPaso(s, ahora)) return;
      const c = consumo(s);
      const etiqueta = U.DIAS_CORTO[s.dia] + ' ' + (s.comida === 'almuerzo' ? 'almuerzo' : 'cena');
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
    return Estado.hayAlgunaAlacena();
  }

  function despensa(inicio, ahora) {
    ahora = ahora || new Date();
    const cargada = despensaCargada(ahora);
    const desde = U.inicioSemana(U.parse(cicloAlacena(ahora)));
    const gastado = {};
    const pendiente = {};
    for (let w = 0; w < 4; w++) {
      const sem = U.ymd(U.sumarDias(desde, 7 * w));
      if (U.parse(sem) > U.sumarDias(U.medianoche(ahora), 7)) break;
      if (U.sumarDias(U.parse(sem), 6) < U.parse(ARRANQUE)) continue;
      const plan = Generador.planSemana(sem);
      plan.slots.forEach(s => {
        if (s.saltado) return;
        const b = BASES[s.base];
        if (!DESPENSA[b.clave]) return;
        const destino = yaPaso(s, ahora) ? gastado : pendiente;
        destino[b.clave] = (destino[b.clave] || 0) + b.cant;
      });
    }
    // lo que entró de despensa sale de la compra de alacena registrada
    const entro = {};
    if (cargada) sumar(entro, COMPRA_ALACENA, Estado.alacena(cicloAlacena(ahora)));

    return Object.keys(DESPENSA).map(k => {
      const d = DESPENSA[k];
      const total = entro[k] || 0;
      const queda = Math.max(0, total - (gastado[k] || 0));
      return {
        clave: k, nombre: d.nombre, un: d.un, total,
        queda, pendiente: pendiente[k] || 0, cargada,
        falta: Math.max(0, (pendiente[k] || 0) - queda)
      };
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

  /* Las tres compras que se pueden registrar, con sus ítems y lo que ya se
     registró de cada una. Es lo que dibuja la pantalla de Compras. */
  function fuentes(inicio, ahora) {
    ahora = ahora || new Date();
    const fecha = proximaAlacena(ahora);
    return [
      { tipo: 'semanal', clave: inicio, nombre: 'Compra semanal',
        cuando: Generador.planSemana(inicio).arranque ? 'la primera, el lunes' : 'sábado',
        items: compraDe(inicio).filter(i => i.clave),
        registro: Estado.compra(inicio) },
      { tipo: 'hojas', clave: inicio, nombre: 'Reposición de hojas',
        cuando: 'miércoles',
        items: COMPRA_HOJAS,
        registro: Estado.hojas(inicio) },
      { tipo: 'alacena', clave: fecha, nombre: 'Alacena',
        cuando: U.fechaLarga(U.parse(fecha)),
        items: COMPRA_ALACENA.filter(i => !(i.unaVez && Estado.unaVezHecho(i.id))),
        registro: Estado.alacena(fecha) }
    ];
  }

  return { consumo, entradas, compraDe, heladeraCargada, estado, perecederos, loQueFalta, despensa, despensaCargada,
           cicloAlacena, proximaAlacena, fuentes, porcionesSueltas, compensacion, momento, yaPaso, arrancado };
})();
