/* ---------------------------------------------------------------
   APP — ruteo, eventos y dibujado. Siempre se abre en Hoy.
   --------------------------------------------------------------- */

const App = (() => {
  const vista = document.getElementById('vista');
  const hoja = document.getElementById('hoja');
  const panel = document.getElementById('hoja-panel');
  const avisoEl = document.getElementById('aviso');

  let tab = 'hoy';
  let subvista = null;           // lista de compras abierta
  let ahora = new Date();
  let ultimoDia = U.ymd(ahora);

  const TITULOS = { hoy: 'Hoy', proximos: 'Próximos días', inventario: 'Inventario', compras: 'Compras' };

  /* Cuándo se subió esta versión de los archivos. Sirve para saber de un
     vistazo si el teléfono está mostrando algo viejo. */
  let sello = '';
  function mostrarSello() {
    const el = document.getElementById('sello');
    if (el && sello) el.textContent = sello;
  }
  fetch('js/app.js', { method: 'HEAD', cache: 'no-cache' })
    .then(r => {
      const lm = r.headers.get('last-modified');
      if (!lm) return;
      const d = new Date(lm);
      sello = d.getDate() + '/' + (d.getMonth() + 1) + ' ' +
              String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      mostrarSello();
    }).catch(() => {});

  /* Redibuja sin moverte de donde estabas. Solo se vuelve arriba cuando
     cambiás de pantalla, no cuando marcás algo en una lista larga. */
  function render(arriba) {
    const y = window.scrollY;
    ahora = new Date();
    document.getElementById('cab-fecha').textContent = U.fechaLarga(ahora);
    document.getElementById('cab-titulo').textContent = TITULOS[tab];
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('activo', b.dataset.tab === tab));

    let h = '';
    if (tab === 'hoy') h = UI.hoy(ahora);
    else if (tab === 'proximos') h = UI.proximos(ahora);
    else if (tab === 'inventario') h = UI.inventario(ahora);
    else if (tab === 'compras') {
      if (subvista === 'falta') h = UI.listaFalta(ahora);
      else if (subvista === 'fraccionado') h = UI.listaFraccionado(ahora);
      else h = UI.comprasMenu(ahora);
    }
    vista.innerHTML = h;
    mostrarSello();
    window.scrollTo(0, arriba ? 0 : y);
  }

  function refrescar(arriba) { Generador.limpiarCache(); render(arriba); }

  function ir(t) { tab = t; subvista = null; render(true); }

  function aviso(txt) {
    avisoEl.textContent = txt;
    avisoEl.classList.remove('oculto');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => avisoEl.classList.add('oculto'), 2200);
  }

  function abrirHoja(html) { panel.innerHTML = html; hoja.classList.remove('oculta'); }
  function cerrarHoja() { hoja.classList.add('oculta'); panel.innerHTML = ''; }

  /* Devuelve el slot al que pertenece un click dentro de una tarjeta. */
  function slotDe(el) {
    const card = el.closest('[data-slot]');
    if (!card) return null;
    const semana = card.dataset.semana || UI.semanaDe(new Date());
    const plan = Generador.planSemana(semana);
    return { plan, semana, slot: plan.slots.find(s => s.clave === card.dataset.slot) };
  }

  function aplicarCambio(semana, slot, idPlato) {
    const plan = Generador.planSemana(semana);
    const anteriores = plan.slots.filter(s => s.idx < slot.idx);
    Estado.cambiarPlato(semana, slot.dia, slot.comida, idPlato, anteriores);
    refrescar();
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      aviso('Lista copiada');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); aviso('Lista copiada'); }
      catch (e2) { aviso('No se pudo copiar'); }
      document.body.removeChild(ta);
    }
  }

  /* Marcar un renglón no redibuja la lista: se le cambia la clase y listo.
     Redibujar entera hacía saltar la página al principio. */
  function pintarFila(el, estado) {
    el.classList.remove('ok', 'no', 'lleno');
    if (estado) el.classList.add(estado);
    else if (el.dataset.lleno === '1') el.classList.add('lleno');
    el.querySelector('.caja').textContent =
      estado === 'ok' ? '✓' : estado === 'no' ? '✕' : (el.dataset.lleno === '1' ? '·' : '');
  }

  /* Los rótulos que dependen de cuántas cosas hay marcadas. */
  function actualizarCompras() {
    const filas = [].slice.call(vista.querySelectorAll('.fila'));
    if (!filas.length) return;
    const marcados = filas.filter(f => f.classList.contains('ok')).length;
    const aceptar = vista.querySelector('[data-act="aceptar-compra"]');
    if (aceptar) {
      aceptar.disabled = !marcados;
      aceptar.textContent = marcados
        ? 'Aceptar y sumar al inventario (' + marcados + ')'
        : 'Marcá lo que compraste';
    }
    vista.querySelectorAll('[data-act="marcar-seccion"]').forEach(b => {
      const pendiente = b.dataset.filas.split(';').some(id => {
        const f = vista.querySelector('.fila[data-item="' + id + '"]');
        return f && !f.classList.contains('ok');
      });
      b.dataset.valor = pendiente ? 'ok' : '';
      b.textContent = pendiente ? 'Marcar todo' : 'Desmarcar';
    });
  }

  /* ---------------- eventos ---------------- */
  document.getElementById('tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (b) ir(b.dataset.tab);
  });

  hoja.addEventListener('click', e => {
    if (e.target.dataset.cerrar || e.target.closest('[data-cerrar]')) { cerrarHoja(); return; }

    const elegir = e.target.closest('[data-elegir]');
    if (elegir && App._slot) {
      const { semana, slot } = App._slot;
      cerrarHoja();
      aplicarCambio(semana, slot, Number(elegir.dataset.elegir));
      aviso('Cambiado. Se reacomodó de acá en adelante');
    }
  });

  /* La cantidad se guarda mientras se escribe. Marcar una cantidad distinta
     ya cuenta como haber comprado ese item. */
  vista.addEventListener('change', e => {
    const inp = e.target.closest('[data-act="cant"]');
    if (!inp) return;
    const f = inp.closest('.fila');
    Estado.setCantidad(f.dataset.item, inp.value);
    if (!f.classList.contains('ok')) { pintarFila(f, 'ok'); actualizarCompras(); }
  });

  vista.addEventListener('click', e => {
    const t = e.target;

    const mc = t.closest('[data-lista]:not([data-tildar])');
    // los botones de lista también aparecen en la pantalla previa al arranque
    if (mc && mc.classList.contains('mc')) {
      tab = 'compras';
      subvista = mc.dataset.lista === 'compras' ? null : mc.dataset.lista;
      render(true);
      return;
    }

    const tildar = t.closest('[data-tildar]');
    if (tildar) {
      const on = !tildar.classList.contains('on');
      Estado.tildar(tildar.dataset.lista, tildar.dataset.tildar, on);
      tildar.classList.toggle('on', on);
      tildar.querySelector('.caja').textContent = on ? '✓' : '';
      return;
    }

    const btn = t.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;

    if (act === 'ver-falta') { Estado.tildar('compras', 'todo', false); render(true); return; }
    if (act === 'ver-todo')  { Estado.tildar('compras', 'todo', true);  render(true); return; }

    if (act === 'marcar-item') {
      const f = btn.closest('.fila');
      const estado = f.classList.contains('ok') ? 'no' : f.classList.contains('no') ? '' : 'ok';
      Estado.marcarItem(f.dataset.item, estado);
      pintarFila(f, estado);
      actualizarCompras();
      return;
    }
    if (act === 'marcar-seccion') {
      const ids = btn.dataset.filas.split(';');
      const valor = btn.dataset.valor || '';
      Estado.marcarVarios(ids, valor);
      ids.forEach(id => {
        const f = vista.querySelector('.fila[data-item="' + id + '"]');
        if (f) pintarFila(f, valor);
      });
      actualizarCompras();
      return;
    }
    if (act === 'aceptar-compra') {
      const r = Inventario.aceptarCompra(UI.semanaDe(new Date()), new Date());
      refrescar();
      const cuantos = Object.keys(r.items).length;
      aviso(cuantos ? cuantos + (cuantos === 1 ? ' ítem sumado' : ' ítems sumados') + ' al inventario'
                    : 'Anotado lo que no conseguiste');
      return;
    }
    if (act === 'copiar-compra') { copiar(UI.textoFalta()); return; }
    if (act === 'reiniciar-compra') {
      Estado.limpiarBorrador();
      render();
      return;
    }

    if (act === 'volver-compras') { subvista = null; render(true); return; }

    if (act === 'copiar') { copiar(UI.textoLista()); return; }
    if (act === 'tildar-todo') {
      const prender = btn.dataset.valor === '1';
      if (!prender) Estado.limpiarTildes(btn.dataset.lista);
      else vista.querySelectorAll('[data-tildar]').forEach(el => Estado.tildar(btn.dataset.lista, el.dataset.tildar, true));
      render();
      return;
    }

    if (act === 'ya-compre') { ir('compras'); return; }
    if (act === 'reponer') { Inventario.agotar(btn.dataset.id, new Date()); render(); aviso('Vuelve a la lista de compras'); return; }
    if (act === 'borrar') {
      if (confirm('¿Borrar compras, cambios y tildes? El plan se recalcula desde cero.')) {
        Estado.borrarTodo(); refrescar(); aviso('Listo, arranca de cero');
      }
      return;
    }

    const ctx = slotDe(btn);
    if (!ctx || !ctx.slot) return;
    const { semana, slot } = ctx;

    if (act === 'cambiar') { App._slot = ctx; abrirHoja(UI.hojaCambiar(semana, slot)); return; }
    if (act === 'emergencia') {
      App._slot = ctx;
      abrirHoja(UI.hojaEmergencia(semana, slot, Generador.emergencia(semana, slot)));
      return;
    }
    if (act === 'saltar') {
      Estado.saltar(semana, slot.dia, slot.comida, !slot.saltado);
      refrescar();
      aviso(!slot.saltado ? 'Anotado: hoy no comiste acá' : 'Vuelve a contar');
      return;
    }
    if (act === 'verdura-menos' || act === 'verdura-mas') {
      const paso = act === 'verdura-mas' ? PORCION.verduraPaso : -PORCION.verduraPaso;
      const g = Math.max(PORCION.verduraMin, Math.min(PORCION.verduraMax, slot.verduraG + paso));
      Estado.setVerdura(semana, slot.dia, slot.comida, g);
      refrescar();
      return;
    }
  });

  /* Si la app quedó abierta y cambió el día, se redibuja sola. */
  function chequearDia() {
    const hoy = U.ymd(new Date());
    if (hoy !== ultimoDia) { ultimoDia = hoy; refrescar(); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chequearDia(); });
  window.addEventListener('focus', chequearDia);
  setInterval(chequearDia, 60000);

  if ('serviceWorker' in navigator) {
    // si ya había un service worker y aparece uno nuevo, la app se recarga
    // sola una vez: así una versión nueva entra sin cerrar y abrir a mano
    const habia = !!navigator.serviceWorker.controller;
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habia || recargando) return;
      recargando = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        // al volver a la app, fijarse si hay versión nueva
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) reg.update().catch(() => {});
        });
      }).catch(() => {});
    });
  }

  render();
  mostrarSello();
  return { render, refrescar, ir };
})();
