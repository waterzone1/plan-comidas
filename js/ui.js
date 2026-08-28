/* ---------------------------------------------------------------
   UI — todo se dibuja a partir del plan calculado. Ninguna pantalla
   pide completar días anteriores ni bloquea nada por falta de registro.
   --------------------------------------------------------------- */

const UI = (() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const num = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');

  /* Antes del arranque no hay semanas: todo apunta a la primera. */
  const semanaDe = (fecha) => {
    const primera = U.ymd(U.inicioSemana(U.parse(ARRANQUE)));
    const ini = U.ymd(U.inicioSemana(fecha));
    return ini < primera ? primera : ini;
  };
  const planDe = (fecha) => Generador.planSemana(semanaDe(fecha));
  const slotsDe = (fecha) => {
    const p = planDe(fecha);
    const i = U.indiceDia(fecha, p.inicio);
    return p.slots.filter(s => s.dia === i);
  };
  const slotDe = (fecha, comida) => slotsDe(fecha).find(s => s.comida === comida);

  function cantidad(item) {
    if (item.cant === null || item.cant === undefined) return item.nota || '';
    if (item.un === 'g' && item.cant >= 1000) return U.g(item.cant);
    if (item.un === 'u') return item.cant + (item.cant === 1 ? ' unidad' : ' unidades');
    return num(item.cant) + (item.un ? ' ' + item.un : '');
  }

  /* ---------- líneas de gramos de un plato ---------- */
  function lineas(slot) {
    const out = [];
    const p = PROTEINAS[slot.grupo];
    if (slot.plato.proteinaTexto) {
      out.push({ n: 'De alacena', v: slot.plato.proteinaTexto, crudo: true });
    } else {
      out.push({ n: p.nombre + (p.detalle ? ' (' + p.detalle + ')' : ''), v: PORCION.proteina + ' g en crudo', crudo: true });
    }
    const b = BASES[slot.base];
    out.push({ n: b.nombre, v: b.cant + ' ' + b.unidad, crudo: true });
    out.push({ n: slot.guarnicion.nombre, v: slot.verduraG + ' g' });
    const por = Math.round(slot.verduraG / slot.guarnicion.verduras.length);
    if (slot.guarnicion.verduras.length > 1) out.push({ sub: por + ' g de cada una' });
    out.push({ n: 'Aceite de oliva', v: PORCION.aceite + ' g' });
    if (slot.plato.salsa) out.push({ n: 'Salsa', v: '~' + PORCION.salsa + ' g' });
    return out;
  }

  function htmlLineas(slot) {
    return lineas(slot).map(l => l.sub
      ? `<li class="sub">${esc(l.sub)}</li>`
      : `<li class="${l.crudo ? 'crudo' : ''}"><span>${esc(l.n)}</span><b>${esc(l.v)}</b></li>`
    ).join('');
  }

  /* ---------- tarjeta de comida ---------- */
  function cardComida(slot, opts) {
    opts = opts || {};
    const et = cap(slot.comida) + ' · ' + slot.grupo;
    const vianda = slot.dia === VIANDA.dia && slot.comida === VIANDA.comida;
    const dial = opts.acciones ? `
      <div class="dial">
        <div class="dial-txt">Verdura ${slot.verduraG} g${slot.verduraG !== PORCION.verduraDefault ? ' · ' + (slot.verduraG > PORCION.verduraDefault ? '+' : '') + Math.round((slot.verduraG - PORCION.verduraDefault) * PORCION.kcalPorGramoVerdura) + ' kcal' : ''}</div>
        <button data-act="verdura-menos" ${slot.verduraG <= PORCION.verduraMin ? 'disabled' : ''}>−</button>
        <button data-act="verdura-mas" ${slot.verduraG >= PORCION.verduraMax ? 'disabled' : ''}>+</button>
      </div>` : '';
    const acciones = opts.acciones ? `
      <div class="acciones">
        <button class="btn" data-act="cambiar">Cambiar plato</button>
        <button class="btn btn-emergencia" data-act="emergencia">No puedo hacer esto</button>
        <button class="btn btn-fantasma" data-act="saltar">${slot.saltado ? 'Sí comí acá' : 'No comí acá'}</button>
      </div>` : '';
    return `
    <article class="comida ${opts.suave ? 'suave' : ''} ${slot.saltado ? 'saltada' : ''}" data-slot="${slot.clave}" data-semana="${opts.semana || ''}">
      <div class="comida-cab">
        <span class="comida-et">${esc(et)}</span>
        <span class="comida-kcal">${slot.saltado ? 'sin contar' : slot.kcal + ' kcal'}</span>
      </div>
      <h2>${esc(slot.plato.nombre)}</h2>
      ${vianda ? '<p class="pill" style="margin-bottom:10px">Vianda · se cocina ' + (opts.arranque ? 'el mismo lunes a la mañana' : 'el domingo 20:00') + '</p>' : ''}
      ${!slot.proteinaOk ? '<p class="pill alerta" style="margin-bottom:10px">No entró ' + esc(slot.grupo) + ' esta semana</p>' : ''}
      <ul class="gramos">${htmlLineas(slot)}</ul>
      ${dial}
      ${acciones}
    </article>`;
  }

  /* ---------- freezer ---------- */
  function cardFreezer(dia, titulo) {
    const f = FREEZER[dia];
    const cuerpo = f.baja.length
      ? `<div class="qué">${titulo || 'Esta noche bajás del freezer'}: <b>${esc(f.baja.map(x => PROTEINAS[x].nombre.toLowerCase() + ' (200 g)').join(', '))}</b></div>
         ${f.nota ? '<div class="sub">' + esc(f.nota) + '</div>' : ''}`
      : `<div class="qué">Esta noche no hay que bajar nada del freezer</div>
         <div class="sub">Mañana es sábado: se compra a las 10 y se come fresco</div>`;
    return `<div class="card freezer"><div class="hora">23:00</div><div>${cuerpo}</div></div>`;
  }

  /* ================= ANTES DEL ARRANQUE ================= */
  /* El plan no existe antes del día uno. En vez de mostrar comidas que
     todavía no tocan, la app dice qué falta hacer para arrancar. */
  function antesDelArranque(ahora) {
    const dia = U.parse(ARRANQUE);
    const faltan = Math.round((dia - U.medianoche(ahora)) / 86400000);
    return `
      <div class="card" style="text-align:center;padding:26px 18px">
        <div class="kicker">Todavía no arranca</div>
        <h2 style="font-family:var(--serif);font-size:26px;margin:6px 0 8px">${esc(cap(U.fechaLarga(dia)))}</h2>
        <p style="color:var(--tenue);font-size:14.5px;margin:0">
          ${faltan === 1 ? 'Falta un día.' : 'Faltan ' + faltan + ' días.'}
          Ese lunes se hace la primera compra, se carga todo y arranca el plan.</p>
      </div>
      <div class="seccion"><h2>Para ese día</h2></div>
      <div class="menu-compras">
        ${mc('La lista de compras', 'Todo lo que hace falta para arrancar', 'compras')}
        ${mc('Fraccionado', 'Porcionar y freezar apenas volvés', 'fraccionado')}
      </div>
      <p class="vacio-msg" style="margin-top:14px">En Compras vas marcando lo que
        conseguís y al final apretás <b>Aceptar</b>: eso carga el inventario y quedan
        las diez comidas de la primera semana (lunes a viernes) listas.</p>`;
  }

  /* ================= HOY ================= */
  function hoy(ahora) {
    if (!Inventario.arrancado(ahora)) return antesDelArranque(ahora);
    const plan = planDe(ahora);
    const dia = U.indiceDia(ahora, plan.inicio);
    const slots = plan.slots.filter(s => s.dia === dia);
    let h = '';

    // avisos: nada de esto pide input, solo informa
    const sueltas = Inventario.porcionesSueltas(plan.inicio, ahora)
      .filter(x => x.slot.dia <= dia && x.proxima);
    sueltas.forEach(x => {
      h += `<div class="nota-card">Te quedó una porción de <b>${esc(x.grupo)}</b> descongelada.
            Usala en ${esc(U.DIAS[x.proxima.dia])} · ${esc(x.proxima.comida)}.</div>`;
    });
    const comp = Inventario.compensacion(plan.inicio, ahora)[dia];
    if (comp) {
      h += `<div class="nota-card">Sumá <b>~${comp} kcal</b> hoy para compensar la comida que te salteaste.
            Más base o más aceite, nunca menos comidas.</div>`;
    }
    const per = Inventario.perecederos(plan.inicio, ahora);
    if (per.length) {
      h += `<div class="nota-card info">Se está por vencer: <b>${per.map(p => esc(p.nombre.toLowerCase()) + ' (' + U.g(p.queda) + ')').join(', ')}</b>.</div>`;
    }

    slots.forEach(s => { h += cardComida(s, { acciones: true, semana: plan.inicio, arranque: plan.arranque }); });

    h += `<div class="seccion"><h2>Merienda</h2><span class="nota">${MERIENDA.kcal} kcal</span></div>
      <div class="card">
        <h3 style="font-family:var(--serif);font-size:19px;margin-bottom:4px">${esc(MERIENDA.titulo)}</h3>
        <div style="color:var(--tenue);font-size:14.5px">${esc(MERIENDA.detalle)}</div>
      </div>`;

    h += `<div class="seccion"><h2>Esta noche</h2></div>` + cardFreezer(dia);

    const hitos = HITOS.filter(x => x.dia === dia);
    if (hitos.length) {
      h += `<div class="card"><ul class="gramos">` +
        hitos.map(x => `<li><span>${esc(x.texto)}</span><b>${x.hora}</b></li>`).join('') +
        `</ul></div>`;
    }

    const totalDia = slots.reduce((a, s) => a + (s.saltado ? 0 : s.kcal), 0) + KCAL.desayuno + MERIENDA.kcal;
    h += `<p class="vacio-msg" style="text-align:center;margin-top:18px">
            ${totalDia} kcal en el día · desayuno libre aparte de ${KCAL.desayuno}</p>`;
    return h;
  }

  /* ================= PRÓXIMOS ================= */
  function proximos(ahora) {
    if (!Inventario.arrancado(ahora)) return antesDelArranque(ahora);
    const manana = U.sumarDias(ahora, 1);
    const planHoy = planDe(ahora);
    const diaHoy = U.indiceDia(ahora, planHoy.inicio);
    let h = '';

    h += `<div class="seccion"><h2>Mañana · ${esc(U.fechaLarga(manana))}</h2><span class="nota">firme</span></div>`;
    const planM = planDe(manana);
    slotsDe(manana).forEach(s => { h += cardComida(s, { semana: planM.inicio, arranque: planM.arranque }); });
    h += cardFreezer(diaHoy, 'Esta noche bajás para mañana');

    h += `<div class="seccion"><h2>Después</h2><span class="nota">todavía se puede mover</span></div><div class="card">`;
    for (let k = 2; k <= 3; k++) {
      const f = U.sumarDias(ahora, k);
      const ss = slotsDe(f);
      if (!ss.length) continue;
      h += `<div class="dia-chico"><div class="dia">${esc(U.DIAS_CORTO[(f.getDay() + 1) % 7])}</div><div class="platos">` +
        ss.map(s => `<div class="p">${esc(s.plato.nombre)}<br><em>${esc(BASES[s.base].nombre.toLowerCase())} · ${esc(s.guarnicion.nombre.toLowerCase())}</em></div>`).join('') +
        `</div></div>`;
    }
    h += `</div>`;

    const resto = [];
    for (let k = 4; k <= 8; k++) {
      const f = U.sumarDias(ahora, k);
      if (U.ymd(U.inicioSemana(f)) !== planHoy.inicio) break;
      resto.push(f);
    }
    if (resto.length) {
      h += `<div class="seccion"><h2>El resto de la semana</h2></div><div class="card tira">`;
      resto.forEach(f => {
        const ss = slotsDe(f);
        if (!ss.length) return;
        h += `<div class="dia-chico"><div class="dia">${esc(U.DIAS_CORTO[(f.getDay() + 1) % 7])}</div><div class="platos">` +
          ss.map(s => `<div class="p">${esc(s.plato.nombre)}</div>`).join('') +
          `</div></div>`;
      });
      h += `</div>`;
    } else {
      h += `<p class="vacio-msg">La semana termina el viernes. El sábado se genera la próxima con la compra.</p>`;
    }
    return h;
  }

  /* ================= INVENTARIO ================= */
  function inventario(ahora) {
    const plan = planDe(ahora);
    const arrancado = Inventario.arrancado(ahora);
    const est = Inventario.estado(plan.inicio, ahora);
    const ent = Estado.entradas();
    const compra = ent.length ? ent[ent.length - 1] : null;
    let h = '';

    if (!arrancado) {
      h += `<div class="nota-card">El plan arranca el <b>${esc(U.fechaLarga(U.parse(ARRANQUE)))}</b>.
            Hasta entonces el inventario está en cero: se carga ese día.</div>`;
    }

    h += `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px">
        <div>
          <div style="font-family:var(--serif);font-size:19px">${plan.arranque ? 'Primera compra' : 'Compra del sábado'}</div>
          <div style="color:var(--tenue2);font-size:13px">${compra
            ? 'Última compra: ' + esc(U.fechaLarga(U.parse(compra.fecha)))
            : 'Se llena desde Compras, marcando lo que comprás'}</div>
        </div>
      </div>
      <button class="btn btn-acento btn-full" data-act="ya-compre">Ir a Compras</button>
    </div>`;

    const per = Inventario.perecederos(plan.inicio, ahora);
    if (per.length) {
      h += `<div class="nota-card">Por vencer: ` +
        per.map(p => `<b>${esc(p.nombre.toLowerCase())}</b> ${U.g(p.queda)} (${p.diasRestantes <= 0 ? 'hoy' : p.diasRestantes === 1 ? 'mañana' : 'en ' + p.diasRestantes + ' días'})`).join(', ') +
        `</div>`;
    }

    const grupos = [
      ['Proteínas', est.items.filter(i => i.tipo === 'proteina')],
      ['Verduras', est.items.filter(i => i.tipo === 'verdura')],
      ['Bases frescas', est.items.filter(i => i.tipo === 'base')],
      ['Otros', est.items.filter(i => i.tipo === 'otro')]
    ];
    grupos.forEach(([tit, items]) => {
      if (!items.length) return;
      h += `<div class="seccion"><h2>${tit}</h2></div><div class="card"><ul class="inv">` +
        items.map(i => {
          const pct = i.total ? Math.max(0, Math.min(100, i.queda / i.total * 100)) : 0;
          const un = i.un === 'u' ? ' u' : i.un === 'L' ? ' L' : ' g';
          return `<li class="${i.queda <= 0.5 ? 'vacio' : ''}">
            <span class="n">${esc(i.nombre)}</span>
            <span class="c">${num(i.queda)}${un}</span>
            <span class="barra"><i style="width:${pct}%"></i></span></li>`;
        }).join('') + `</ul></div>`;
    });

    const desp = Inventario.despensa(plan.inicio, ahora);
    const cargada = Inventario.despensaCargada(ahora);
    h += `<div class="seccion"><h2>Despensa</h2><span class="nota">${cargada
      ? 'ciclo desde ' + esc(U.fechaLarga(U.parse(Inventario.cicloAlacena(ahora))))
      : 'sin cargar'}</span></div>
      <div class="card">` +
      (cargada ? '' : `<p class="vacio-msg" style="padding-bottom:8px">Vacía hasta que registres la compra de alacena.</p>`) +
      `<ul class="inv">` +
      desp.map(d => {
        const pct = d.total ? Math.max(0, Math.min(100, d.queda / d.total * 100)) : 0;
        return `<li class="${d.queda <= 0.5 ? 'vacio' : ''}">
          <span class="n">${esc(d.nombre)}</span>
          <span class="c">${num(d.queda)} ${esc(d.un)}</span>
          <span class="barra"><i style="width:${pct}%"></i></span></li>`;
      }).join('') + `</ul></div>`;

    const unaVez = COMPRA_ALACENA.filter(i => i.unaVez && Estado.unaVezHecho(i.id));
    if (unaVez.length) {
      // El tilde dice que lo tenés. Se destilda el que se haya acabado y ese
      // vuelve solo a la lista de compras.
      h += `<div class="seccion"><h2>Comprado una sola vez</h2>
          <span class="nota">tocá el que se te acabó</span></div>
        <div class="card">` +
        unaVez.map(i => `<button class="check on" data-act="reponer" data-id="${i.id}">
          <span class="caja">✓</span>
          <span class="txt">${esc(i.nombre)}<small>lo tenés · tocá si se acabó</small></span>
        </button>`).join('') +
        `</div>`;
    }

    h += `<hr class="sep">
      <button class="btn btn-fantasma btn-full" data-act="borrar">Borrar todo y empezar de cero</button>
      <p class="vacio-msg" style="text-align:center;margin-top:10px">archivos del <span id="sello">…</span></p>`;
    return h;
  }

  /* ================= COMPRAS =================
     Una sola pantalla. Cada renglón muestra lo que falta para volver a tener
     el ítem completo; lo que ya está lleno aparece marcado solo. Marcar y
     aceptar suma al inventario. */

  function comprasMenu(ahora) {
    const plan = planDe(ahora);
    const filas = Inventario.filasCompra(plan.inicio, ahora);
    const verTodo = !!Estado.tildes('compras')['todo'];
    const visibles = verTodo ? filas : filas.filter(f => !f.lleno || f.marca);
    const marcados = filas.filter(f => f.marca === 'ok');
    const faltan = filas.filter(f => !f.lleno).length;

    let h = `<div class="acciones" style="margin-top:0">
        <button class="btn ${verTodo ? '' : 'btn-acento'}" data-act="ver-falta">Lo que falta${faltan ? ' (' + faltan + ')' : ''}</button>
        <button class="btn ${verTodo ? 'btn-acento' : ''}" data-act="ver-todo">Ver todo</button>
      </div>`;

    if (!visibles.length) {
      h += `<p class="vacio-msg">No falta nada: el inventario está completo.</p>`;
      return h + extrasCompras(ahora, plan);
    }

    COMERCIOS.filter(c => visibles.some(f => f.comercio === c)).forEach(c => {
      const enSeccion = visibles.filter(f => f.comercio === c);
      const pendientes = enSeccion.filter(f => f.marca !== 'ok');
      h += `<div class="cab-seccion">
          <span class="comercio" style="margin:0">${esc(c)}</span>
          <button class="mini" data-act="marcar-seccion" data-valor="${pendientes.length ? 'ok' : ''}"
                  data-filas="${enSeccion.map(f => f.id).join(';')}">
            ${pendientes.length ? 'Marcar todo' : 'Desmarcar'}</button>
        </div><div class="card compras">`;
      enSeccion.forEach(f => { h += fila(f); });
      h += `</div>`;
    });

    h += `<div class="acciones">
        <button class="btn btn-acento btn-full" data-act="aceptar-compra" ${marcados.length ? '' : 'disabled'}>
          ${marcados.length ? 'Aceptar y sumar al inventario (' + marcados.length + ')' : 'Marcá lo que compraste'}</button>
      </div>
      <div class="acciones">
        <button class="btn" data-act="copiar-compra">Copiar lo que falta</button>
        <button class="btn btn-fantasma" data-act="reiniciar-compra">Desmarcar todo</button>
      </div>
      <p class="vacio-msg">Un toque marca <b>lo compré</b>, otro <b>no lo conseguí</b>.
        La cantidad que aparece es la que falta para completar; si comprás otra, escribila.
        Al aceptar, todo eso entra al inventario y los renglónes se vuelven a llenar solos
        a medida que las comidas lo consumen.</p>`;

    return h + extrasCompras(ahora, plan);
  }

  function fila(f) {
    const marca = f.marca === 'ok' ? 'ok' : f.marca === 'no' ? 'no' : f.lleno ? 'lleno' : '';
    // un renglon lleno muestra lo que hay; si lo marco igual, aparece el input
    const editable = f.cant !== null && f.marca !== 'no' && (!f.lleno || f.marca === 'ok');
    return `<div class="fila ${marca}" data-item="${esc(f.id)}">
        <button class="caja" data-act="marcar-item">${
          f.marca === 'ok' ? '✓' : f.marca === 'no' ? '✕' : f.lleno ? '·' : ''}</button>
        <span class="txt">${esc(f.nombre)}${f.detalle ? '<small>' + esc(f.detalle) + '</small>' : ''}</span>
        ${editable
          ? `<input class="cant-input" type="number" inputmode="decimal" step="any" min="0"
                    value="${f.cant}" data-act="cant"><span class="un">${esc(f.un)}</span>`
          : `<span class="un" style="min-width:auto">${f.marca === 'no' ? 'no había'
              : !f.lleno ? 'comprar'
              : f.cant === null ? 'ya lo tenés'
              : 'tenés ' + f.hay + ' ' + esc(f.un)}</span>`}
      </div>`;
  }

  /* Debajo de la compra: lo que falta con detalle y el fraccionado. */
  function extrasCompras(ahora, plan) {
    return `<div class="seccion"><h2>Además</h2></div>
      <div class="menu-compras">
        ${mc('Para qué comidas falta', 'El detalle de lo que no alcanza', 'falta')}
        ${mc('Fraccionado', 'Porcionar y freezar apenas volvés', 'fraccionado')}
      </div>`;
  }

  const mc = (t, s, id) => `<button class="mc" data-lista="${id}">
      <span class="t"><b>${esc(t)}</b><small>${esc(s)}</small></span><span class="fl">›</span></button>`;

  /* Arma una lista tildable a partir de ítems {id, nombre, cant, grupo, nota} */
  function lista(idLista, titulo, sub, grupos, extra) {
    const tildes = Estado.tildes(idLista);
    const todos = [];
    let h = `<button class="btn btn-fantasma" data-act="volver-compras" style="margin-bottom:10px">‹ Compras</button>
      <div class="seccion" style="margin-top:0"><h2>${esc(titulo)}</h2></div>`;
    if (sub) h += `<p class="vacio-msg" style="margin-top:-6px">${esc(sub)}</p>`;
    h += `<div class="card">`;
    grupos.forEach(g => {
      if (!g.items.length) return;
      h += `<div class="comercio">${esc(g.nombre)}</div>`;
      g.items.forEach(i => {
        todos.push(i.id);
        const on = !!tildes[i.id];
        h += `<button class="check ${on ? 'on' : ''}" data-tildar="${esc(i.id)}" data-lista="${idLista}">
          <span class="caja">${on ? '✓' : ''}</span>
          <span class="txt">${esc(i.nombre)}${i.nota ? '<small>' + esc(i.nota) + '</small>' : ''}</span>
          <span class="cant">${esc(i.cant || '')}</span></button>`;
      });
    });
    const completa = todos.length > 0 && todos.every(id => tildes[id]);
    h += `</div>
      <div class="acciones">
        <button class="btn" data-act="tildar-todo" data-lista="${idLista}" data-valor="${completa ? '0' : '1'}">
          ${completa ? 'Destildar todo' : 'Marcar todo'}</button>
        <button class="btn btn-acento" data-act="copiar" data-lista="${idLista}">Copiar como texto</button>
      </div>`;
    return h + (extra || '');
  }

  function porComercio(items) {
    return COMERCIOS.map(c => ({ nombre: c, items: items.filter(i => i.comercio === c) }));
  }

  function listaFalta(ahora) {
    const plan = planDe(ahora);
    const falta = Inventario.loQueFalta(plan.inicio, ahora);
    if (!falta.length) {
      return `<button class="btn btn-fantasma" data-act="volver-compras" style="margin-bottom:10px">‹ Compras</button>
        <div class="seccion" style="margin-top:0"><h2>Lo que falta</h2></div>
        <p class="vacio-msg">No falta nada para las comidas que quedan.</p>`;
    }
    const items = falta.map(f => ({
      id: 'x_' + (f.item.id || f.item.nombre),
      nombre: f.item.nombre,
      cant: (f.item.un === 'u' ? Math.ceil(f.cant) + ' u' : f.item.un === 'latas' ? Math.ceil(f.cant) + ' latas' : U.g(f.cant)),
      comercio: f.item.comercio || 'almacén',
      nota: f.comidas.length ? 'para ' + f.comidas.slice(0, 4).join(', ') : ''
    }));
    return lista('falta:' + plan.inicio, 'Lo que falta',
      'Inventario real contra las comidas que quedan', porComercio(items));
  }

  function listaFraccionado(ahora) {
    const plan = planDe(ahora);
    const items = [];
    FRACCIONADO.forEach(f => {
      if (!f.clave) { items.push({ id: f.id, nombre: f.texto, cant: '', nota: f.detalle }); return; }
      const n = plan.slots.filter(s => PROTEINAS[s.grupo].clave === f.clave).length;
      if (!n) return;
      const total = n * PORCION.proteina;
      const texto = f.freezar === false
        ? f.nombre + ' ' + U.g(total) + ' → a la heladera'
        : f.nombre + ' ' + U.g(total) + ' → ' + n + (n === 1 ? ' porción' : ' porciones') + ' de ' + PORCION.proteina + ' g';
      items.push({ id: f.id, nombre: texto, cant: '', nota: f.detalle });
    });
    return lista('fracc:' + plan.inicio, 'Fraccionado',
      plan.arranque ? 'El lunes, apenas volvés' : 'Sábado 11:00, apenas volvés',
      [{ nombre: 'tareas', items }]);
  }

  const SALTO = String.fromCharCode(10);

  /* Para copiar: solo lo que falta comprar, agrupado por comercio. */
  function textoFalta(ahora) {
    const plan = planDe(ahora || new Date());
    const filas = Inventario.filasCompra(plan.inicio, ahora || new Date())
      .filter(f => !f.lleno && f.marca !== 'ok' && f.marca !== 'no');
    if (!filas.length) return 'No falta nada.';
    const out = [];
    COMERCIOS.filter(c => filas.some(f => f.comercio === c)).forEach(c => {
      out.push(c.toUpperCase());
      filas.filter(f => f.comercio === c).forEach(f => {
        out.push('- ' + f.nombre + (f.cant === null ? '' : '  ' + f.cant + ' ' + f.un));
      });
      out.push('');
    });
    return out.join(SALTO).trim();
  }


  /* Texto plano para copiar, tanto de una lista como de la pantalla de compras. */
  function textoLista() {
    const out = [];
    document.querySelectorAll('#vista .comercio, #vista .check, #vista .fila').forEach(el => {
      if (el.classList.contains('comercio')) { out.push('', el.textContent.trim().toUpperCase()); return; }
      const t = el.querySelector('.txt').childNodes[0].textContent.trim();
      const inp = el.querySelector('.cant-input');
      const c = inp ? inp.value + ' ' + el.querySelector('.un').textContent.trim()
                    : (el.querySelector('.cant') || { textContent: '' }).textContent.trim();
      const marca = el.classList.contains('ok') || el.classList.contains('on') ? '[x] '
                  : el.classList.contains('no') ? '[-] ' : '[ ] ';
      out.push(marca + t + (c.trim() ? ' — ' + c.trim() : ''));
    });
    return out.join(SALTO).trim();
  }

  /* ================= hojas modales ================= */

  function hojaCambiar(inicio, slot) {
    const alt = Generador.alternativas(inicio, slot);
    let h = `<h2>Cambiar el ${esc(slot.comida)}</h2>
      <p class="sub">Siempre ${esc(slot.grupo)}: la proteína del día no cambia. Se reacomodan la base y la guarnición de acá en adelante.</p>`;
    h += alt.map(a => `<button class="opcion" data-elegir="${a.plato.id}">
        <span>${esc(a.plato.nombre)}
          <small>${a.plato.bases.map(b => BASES[b].nombre.toLowerCase()).slice(0, 4).join(', ')}${a.repetido ? ' · ya sale esta semana' : ''}</small>
        </span><span class="fl">›</span></button>`).join('');
    return h;
  }

  function hojaEmergencia(inicio, slot, alternativa) {
    if (!alternativa) return `<h2>No hay alternativa</h2><p class="sub">Quedate con el plato de hoy.</p>`;
    return `<h2>Probá con esto</h2>
      <p class="sub">La mejor opción de ${esc(slot.grupo)} con lo que queda.</p>
      <ul class="gramos" style="margin-bottom:16px">
        <li><span>Plato</span><b>${esc(alternativa.nombre)}</b></li>
        <li><span>Proteína</span><b>${PORCION.proteina} g en crudo</b></li>
      </ul>
      <div class="acciones">
        <button class="btn btn-acento" data-elegir="${alternativa.id}">Cambio a este</button>
        <button class="btn btn-fantasma" data-cerrar="1">Dejalo como estaba</button>
      </div>`;
  }

  return { hoy, proximos, inventario, comprasMenu, listaFalta, listaFraccionado,
           textoLista, textoFalta, hojaCambiar, hojaEmergencia,
           planDe, semanaDe, slotsDe, slotDe, esc };
})();
