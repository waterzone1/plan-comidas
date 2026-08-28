/* ---------------------------------------------------------------
   GENERADOR — el plan es una función determinista de los hechos.
   Entradas: inicio de semana, faltantes de la compra, cambios
   explícitos, slots fijados y lo que salió las dos semanas anteriores.
   Salida: las 14 comidas de sábado a viernes.

   Nada acá depende de que el usuario haya confirmado nada.
   --------------------------------------------------------------- */

const Generador = (() => {
  const INF = 1e9;
  const COMIDAS = ['almuerzo', 'cena'];
  const clave = (dia, comida) => dia + ':' + comida;
  const plato = (id) => PLATOS.find(p => p.id === id);
  const guarn = (id) => GUARNICIONES.find(g => g.id === id);
  const tiene = (o, t) => o.tags.indexOf(t) >= 0;

  let cache = {};
  const limpiarCache = () => { cache = {}; };

  /* --- disponibilidad según lo que efectivamente entró --- */
  function disponibilidad(faltantes) {
    const falta = new Set(faltantes);
    const bases = {};
    Object.keys(BASES).forEach(b => {
      const item = COMPRA_SEMANAL.find(i => i.clave === BASES[b].clave);
      bases[b] = !(item && falta.has(item.id));
    });
    const verduras = {};
    Object.keys(VERDURAS).forEach(v => {
      const item = COMPRA_SEMANAL.find(i => i.clave === v);
      verduras[v] = item ? !falta.has(item.id) : true;
    });
    const proteinas = {};
    Object.keys(PROTEINAS).forEach(p => {
      const item = COMPRA_SEMANAL.find(i => i.clave === p);
      proteinas[p] = item ? !falta.has(item.id) : true;
    });
    // gramos de verdura con los que cuenta la semana: la compra del sábado
    // más la reposición de hojas del miércoles, que es parte del plan fijo
    const gramos = {};
    Object.keys(VERDURAS).forEach(v => {
      gramos[v] = verduras[v] ? VERDURAS[v].compra : 0;
    });
    COMPRA_HOJAS.forEach(h => {
      if (gramos[h.clave] !== undefined) gramos[h.clave] += h.cant;
    });
    return { bases, verduras, proteinas, gramos };
  }

  /* --- esqueleto de la semana: el ritmo fijo de proteínas ---
     La primera semana empieza el día del arranque, no el sábado: los días
     anteriores no existen y no consumen nada. */
  function esqueleto(inicio) {
    const primero = Math.max(0, U.indiceDia(U.parse(ARRANQUE), inicio));
    const out = [];
    RITMO.forEach(r => {
      if (r.dia < primero) return;
      COMIDAS.forEach(c => {
        out.push({
          dia: r.dia,
          nombreDia: r.nombre,
          comida: c,
          clave: clave(r.dia, c),
          idx: r.dia * 2 + (c === 'almuerzo' ? 0 : 1),
          grupo: r[c],
          plato: null, base: null, guarnicion: null
        });
      });
    });
    return out;
  }

  /* --- asignación golosa global: elige siempre el par más barato --- */
  function asignarGloboso(slots, opciones, costo, aplicar) {
    const libres = slots.slice();
    const pool = opciones.slice();
    while (libres.length && pool.length) {
      let mejor = null;
      for (let i = 0; i < libres.length; i++) {
        for (let j = 0; j < pool.length; j++) {
          const c = costo(libres[i], pool[j]);
          if (c >= INF) continue;
          if (!mejor || c < mejor.c) mejor = { c, i, j };
        }
      }
      if (!mejor) break;
      aplicar(libres[mejor.i], pool[mejor.j]);
      libres.splice(mejor.i, 1);
      pool.splice(mejor.j, 1);
    }
    return libres; // los que quedaron sin asignar
  }

  /* ================= 1. platos ================= */
  function elegirPlatos(slots, ctx) {
    const usados = new Set();

    // fijados (lo que ya pasó y no se toca) y cambios explícitos
    slots.forEach(s => {
      const fj = ctx.fijados[s.clave];
      if (fj && plato(fj.plato) && plato(fj.plato).grupo === s.grupo) {
        s.plato = plato(fj.plato); s.fijo = true; usados.add(s.plato.id);
      }
    });
    slots.forEach(s => {
      const cb = ctx.cambios[s.clave];
      const p = cb && plato(cb);
      if (p && p.grupo === s.grupo) {           // regla dura: misma proteína
        if (s.plato) usados.delete(s.plato.id);
        s.plato = p; s.cambiado = true; usados.add(p.id);
      }
    });

    const grupos = {};
    slots.forEach(s => { (grupos[s.grupo] = grupos[s.grupo] || []).push(s); });

    // los grupos con menos platos disponibles se resuelven primero
    const orden = Object.keys(grupos).sort((a, b) =>
      PLATOS.filter(p => p.grupo === a).length - PLATOS.filter(p => p.grupo === b).length);

    orden.forEach(gr => {
      const pendientes = grupos[gr].filter(s => !s.plato);
      if (!pendientes.length) return;

      let pool = PLATOS.filter(p => p.grupo === gr && !usados.has(p.id) &&
        p.bases.some(b => ctx.disp.bases[b]));
      if (pool.length < pendientes.length) {   // sin margen: se permite repetir
        pool = pool.concat(PLATOS.filter(p => p.grupo === gr && usados.has(p.id)));
      }
      // los platos con menos bases se colocan primero
      pool.sort((a, b) => a.bases.length - b.bases.length);

      asignarGloboso(pendientes, pool,
        (s, p) => costoPlato(s, p, ctx, usados),
        (s, p) => { s.plato = p; usados.add(p.id); });
    });

    // red de seguridad: ninguna ranura puede quedar vacía
    slots.forEach(s => {
      if (!s.plato) {
        const cand = PLATOS.filter(p => p.grupo === s.grupo);
        s.plato = cand[Math.floor(ctx.rnd() * cand.length)] || PLATOS[0];
      }
    });
  }

  function costoPlato(s, p, ctx, usados) {
    // el almuerzo del lunes es la vianda que se cocina el domingo
    if (s.dia === VIANDA.dia && s.comida === VIANDA.comida && !tiene(p, 'vianda')) return INF;

    let c = ctx.rnd() * 4;
    if (tiene(p, 'alacena') || tiene(p, 'desde-congelado')) c += Math.max(0, 4 - s.dia) * 12;
    const h = ctx.hist.platos[p.id];
    if (h === 1) c += 30; else if (h === 2) c += 14;
    if (usados.has(p.id)) c += 500;
    // que la vianda no se gaste en un día cualquiera
    if (tiene(p, 'vianda') && !(s.dia === VIANDA.dia && s.comida === VIANDA.comida)) c += 6;
    return c;
  }

  /* ================= 2. bases ================= */
  function elegirBases(slots, ctx) {
    const usos = {};
    Object.keys(BASES).forEach(b => usos[b] = 0);

    slots.forEach(s => {
      const fj = ctx.fijados[s.clave];
      if (fj && !s.cambiado && fj.base && s.plato.bases.indexOf(fj.base) >= 0) {
        s.base = fj.base; usos[fj.base]++;
      }
    });

    const pendientes = slots.filter(s => !s.base);
    // primero las ranuras con menos opciones
    pendientes.sort((a, b) => {
      const ca = a.plato.bases.filter(x => ctx.disp.bases[x]).length || a.plato.bases.length;
      const cb = b.plato.bases.filter(x => ctx.disp.bases[x]).length || b.plato.bases.length;
      return ca - cb || a.idx - b.idx;
    });

    pendientes.forEach(s => {
      let cand = s.plato.bases.filter(b => ctx.disp.bases[b]);
      if (!cand.length) { cand = s.plato.bases.slice(); s.baseSinStock = true; }

      const otra = slots.find(o => o.dia === s.dia && o !== s);
      // el puntaje se calcula una sola vez por candidata: si el azar entrara
      // dentro del comparador, el orden dejaría de ser determinista
      const puntajes = cand.map(b => {
        let c = (usos[b] / BASES[b].cupo) * 12 + ctx.rnd() * 2;
        if (usos[b] >= BASES[b].cupo) c += 30;
        if (otra && otra.base === b) c += 200;   // nunca la misma base dos veces en el día
        return { base: b, c };
      });
      puntajes.sort((a, b) => a.c - b.c);
      s.base = puntajes[0].base;
      usos[s.base]++;
    });
  }

  /* ================= 3. guarniciones ================= */
  /* Dos etapas: un reparto goloso de toda la semana y después una pasada
     de mejora sobre el costo global. Elegir lo mejor de cada día por
     separado deja todo lo flojo para el final; esto reparte de una. */
  function elegirGuarniciones(slots, ctx) {
    const usadas = new Set();
    const gastado = {};
    Object.keys(VERDURAS).forEach(v => gastado[v] = 0);

    const consumir = (g) => {
      const por = PORCION.verduraDefault / g.verduras.length;
      g.verduras.forEach(v => { gastado[v] = (gastado[v] || 0) + por; });
    };

    slots.forEach(s => {
      const fj = ctx.fijados[s.clave];
      if (fj && !s.cambiado && guarn(fj.guarnicion)) {
        s.guarnicion = guarn(fj.guarnicion);
        usadas.add(s.guarnicion.id);
        consumir(s.guarnicion);
      }
    });

    let libres = slots.filter(s => !s.guarnicion);
    let pool = GUARNICIONES.filter(g => !usadas.has(g.id));

    while (libres.length && pool.length) {
      let mejor = null;
      for (let i = 0; i < libres.length; i++) {
        for (let j = 0; j < pool.length; j++) {
          const c = costoGuarnicion(libres[i], pool[j], ctx, gastado);
          if (!mejor || c < mejor.c) mejor = { c, i, j };
        }
      }
      const s = libres[mejor.i], g = pool[mejor.j];
      s.guarnicion = g;
      consumir(g);
      libres.splice(mejor.i, 1);
      pool.splice(mejor.j, 1);
    }
    libres.forEach(s => { s.guarnicion = GUARNICIONES[0]; });

    mejorarGuarniciones(slots, ctx);
  }

  /* Ventana de días en la que una guarnición se puede hacer: desde que está
     toda su verdura hasta que se pasa la más perecedera. El corrimiento es
     para la semana del arranque, donde se compra dos días más tarde. */
  function ventana(g, ctx) {
    let desde = 0, hasta = 99;
    g.verduras.forEach(v => {
      const info = VERDURAS[v] || { desde: 0, vida: 99 };
      const corre = info.desde > 0 ? 0 : ctx.corrimiento;   // la reposición del
      desde = Math.max(desde, info.desde + corre);          // miércoles no se corre
      hasta = Math.min(hasta, info.vida + corre);
    });
    return { desde, hasta };
  }

  /* Lo que cuesta una guarnición en un día, sin mirar el presupuesto. */
  function costoBase(s, g, ctx) {
    let c = 0;
    const v = ventana(g, ctx);

    // perecedero primero: lo que no llega a ese día se descarta
    if (s.dia >= v.hasta) c += (s.dia - v.hasta + 1) * 120;
    // y lo que todavía no está comprado, tampoco
    if (s.dia < v.desde) c += (v.desde - s.dia) * 120;
    // y aun dentro de lo que llega, lo más frágil va antes
    c += Math.min(v.hasta, 12) * s.dia * 0.45;

    // el freezer se reserva para el final; el empujón fuerte es para el
    // arranque de la semana, después manda la vida útil de cada guarnición
    if (tiene(g, 'freezer')) c += 10 + Math.max(0, 4 - s.dia) * 25;

    // urgencia pide guarnición rápida
    if (tiene(s.plato, 'urgencia') && !tiene(g, 'rápida')) c += 14;

    // no repetir una verdura que el plato ya nombra
    if (g.verduras.some(v => s.plato.menciona.indexOf(v) >= 0)) c += 250;

    // "en la salsa" solo tiene sentido si el plato lleva salsa
    if (tiene(g, 'en-salsa') && !s.plato.salsa) c += 60;

    // verdura que no entró: no se usa
    g.verduras.forEach(v => { if (!(ctx.disp.gramos[v] > 0)) c += 5000; });

    const h = ctx.hist.guarniciones[g.id];
    if (h === 1) c += 12; else if (h === 2) c += 5;

    return c;
  }

  /* Costo del goloso: el del día más el precio de escasez de cada verdura
     sobre el stock que va quedando. */
  function costoGuarnicion(s, g, ctx, gastado) {
    let c = costoBase(s, g, ctx) + ctx.rnd() * 3;
    const por = PORCION.verduraDefault / g.verduras.length;
    g.verduras.forEach(v => {
      const hay = ctx.disp.gramos[v] || 0;
      if (hay <= 0) return;
      const queda = hay - (gastado[v] || 0);
      if (queda < por) c += 250 + Math.min((por - queda) / hay, 1) * 900;
      else c += Math.min((por / Math.max(queda - por / 2, 1)) * 45, 240);
    });
    return c;
  }

  /* Cuánta verdura se pide de más en toda la semana. En la semana del
     arranque hay menos comidas, pero la compra es la misma: no se toca. */
  function costoPresupuesto(slots, ctx) {
    const uso = {};
    slots.forEach(s => {
      const por = PORCION.verduraDefault / s.guarnicion.verduras.length;
      s.guarnicion.verduras.forEach(v => { uso[v] = (uso[v] || 0) + por; });
    });
    let c = 0;
    Object.keys(uso).forEach(v => {
      const hay = ctx.disp.gramos[v] || 0;
      // cuadrático: es mejor que falten 100 g de dos verduras que 200 de una
      if (uso[v] > hay) c += Math.pow(uso[v] - hay, 2) * 0.014 + (uso[v] - hay) * 0.6;
    });
    return c;
  }

  const costoTotal = (slots, ctx) =>
    slots.reduce((a, s) => a + costoBase(s, s.guarnicion, ctx), 0) + costoPresupuesto(slots, ctx);

  /* Pasada de mejora sobre la semana entera: cambiar una guarnición por otra
     sin usar, o intercambiar dos días, si baja el costo total. */
  function mejorarGuarniciones(slots, ctx) {
    const movibles = slots.filter(s => !ctx.fijados[s.clave] || s.cambiado);
    if (movibles.length < 2) return;
    const usadas = new Set(slots.map(s => s.guarnicion.id));
    const banco = GUARNICIONES.filter(g => !usadas.has(g.id));
    let mejor = costoTotal(slots, ctx);

    for (let vuelta = 0; vuelta < 6; vuelta++) {
      let cambio = false;

      for (let k = 0; k < movibles.length; k++) {
        for (let i = 0; i < banco.length; i++) {
          const s = movibles[k], previa = s.guarnicion;
          s.guarnicion = banco[i];
          const c = costoTotal(slots, ctx);
          if (c < mejor - 0.5) { mejor = c; banco[i] = previa; cambio = true; }
          else s.guarnicion = previa;
        }
      }

      for (let i = 0; i < movibles.length; i++) {
        for (let j = i + 1; j < movibles.length; j++) {
          const a = movibles[i], b = movibles[j];
          const t = a.guarnicion; a.guarnicion = b.guarnicion; b.guarnicion = t;
          const c = costoTotal(slots, ctx);
          if (c < mejor - 0.5) { mejor = c; cambio = true; }
          else { const t2 = a.guarnicion; a.guarnicion = b.guarnicion; b.guarnicion = t2; }
        }
      }

      if (!cambio) break;
    }
  }

  /* ================= historial de las dos semanas previas ================= */
  function historial(inicio, prof) {
    const platos = {}, guarniciones = {};
    if (prof > 0) return { platos, guarniciones };
    for (let w = 1; w <= 2; w++) {
      const prev = U.ymd(U.sumarDias(U.parse(inicio), -7 * w));
      const pl = planSemana(prev, prof + 1);
      pl.slots.forEach(s => {
        if (platos[s.plato.id] === undefined) platos[s.plato.id] = w;
        if (guarniciones[s.guarnicion.id] === undefined) guarniciones[s.guarnicion.id] = w;
      });
    }
    return { platos, guarniciones };
  }

  /* ================= el plan de una semana ================= */
  function planSemana(inicio, prof) {
    prof = prof || 0;
    const memo = inicio + '|' + prof;
    if (cache[memo]) return cache[memo];

    const faltantes = Estado.faltantes(inicio);
    const primero = Math.max(0, U.indiceDia(U.parse(ARRANQUE), inicio));
    const ctx = {
      inicio,
      // en la semana del arranque se compra el mismo día que se empieza
      corrimiento: primero,
      disp: disponibilidad(faltantes),
      fijados: Estado.fijados(inicio),
      cambios: Estado.cambios(inicio),
      hist: historial(inicio, prof),
      rnd: U.rng(inicio + '|' + faltantes.slice().sort().join(',') + '|' +
                 JSON.stringify(Estado.cambios(inicio)))
    };

    const slots = esqueleto(inicio);
    elegirPlatos(slots, ctx);
    elegirBases(slots, ctx);
    elegirGuarniciones(slots, ctx);

    const saltados = Estado.saltados(inicio);
    const verduras = Estado.verduras(inicio);
    slots.forEach(s => {
      s.saltado = saltados.indexOf(s.clave) >= 0;
      s.verduraG = verduras[s.clave] || PORCION.verduraDefault;
      s.kcal = Math.round(KCAL.almuerzo + (s.verduraG - PORCION.verduraDefault) * PORCION.kcalPorGramoVerdura);
      s.proteinaOk = ctx.disp.proteinas[s.grupo] !== false;
      s.fecha = U.sumarDias(U.parse(inicio), s.dia);
    });

    const plan = { inicio, slots, faltantes, disp: ctx.disp,
                   arranque: primero > 0, primerDia: primero };
    cache[memo] = plan;
    return plan;
  }

  /* Alternativas para cambiar un plato: siempre de la misma proteína. */
  function alternativas(inicio, slot) {
    const plan = planSemana(inicio);
    const usados = new Set(plan.slots.filter(s => s.clave !== slot.clave).map(s => s.plato.id));
    const disp = plan.disp;
    const esVianda = slot.dia === VIANDA.dia && slot.comida === VIANDA.comida;

    return PLATOS
      .filter(p => p.grupo === slot.grupo && p.id !== slot.plato.id)
      .filter(p => !esVianda || tiene(p, 'vianda'))
      .map(p => {
        let c = 0;
        if (usados.has(p.id)) c += 100;
        if (!p.bases.some(b => disp.bases[b])) c += 60;
        if (tiene(p, 'urgencia')) c -= 6;
        if (tiene(p, 'desde-congelado')) c += 8;
        return { plato: p, costo: c, repetido: usados.has(p.id) };
      })
      .sort((a, b) => a.costo - b.costo);
  }

  /* Botón de emergencia: una sola alternativa, la mejor con lo que quede. */
  function emergencia(inicio, slot) {
    const alt = alternativas(inicio, slot).filter(a => !a.repetido);
    const lista = alt.length ? alt : alternativas(inicio, slot);
    return lista.length ? lista[0].plato : null;
  }

  return { planSemana, alternativas, emergencia, limpiarCache, clave, disponibilidad, ventana };
})();
