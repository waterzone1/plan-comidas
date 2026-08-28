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

  function render() {
    ahora = new Date();
    document.getElementById('cab-fecha').textContent = U.fechaLarga(ahora);
    document.getElementById('cab-titulo').textContent = TITULOS[tab];
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('activo', b.dataset.tab === tab));

    let h = '';
    if (tab === 'hoy') h = UI.hoy(ahora);
    else if (tab === 'proximos') h = UI.proximos(ahora);
    else if (tab === 'inventario') h = UI.inventario(ahora);
    else if (tab === 'compras') {
      if (subvista === 'semanal') h = UI.listaSemanal(ahora);
      else if (subvista === 'hojas') h = UI.listaHojas(ahora);
      else if (subvista === 'alacena') h = UI.listaAlacena(ahora);
      else if (subvista === 'falta') h = UI.listaFalta(ahora);
      else if (subvista === 'fraccionado') h = UI.listaFraccionado(ahora);
      else h = UI.comprasMenu(ahora);
    }
    vista.innerHTML = h;
    window.scrollTo(0, 0);
  }

  function refrescar() { Generador.limpiarCache(); render(); }

  function ir(t) { tab = t; subvista = null; render(); }

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

  /* ---------------- eventos ---------------- */
  document.getElementById('tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (b) ir(b.dataset.tab);
  });

  hoja.addEventListener('click', e => {
    if (e.target.dataset.cerrar || e.target.closest('[data-cerrar]')) { cerrarHoja(); return; }

    const conseguido = e.target.closest('[data-conseguido]');
    if (conseguido) {
      conseguido.classList.toggle('on');
      conseguido.querySelector('.caja').textContent = conseguido.classList.contains('on') ? '✓' : '';
      return;
    }

    const todos = e.target.closest('[data-act="conseguido-todo"]');
    if (todos) {
      const prender = todos.dataset.valor === '1';
      panel.querySelectorAll('[data-conseguido]').forEach(el => {
        el.classList.toggle('on', prender);
        el.querySelector('.caja').textContent = prender ? '✓' : '';
      });
      return;
    }

    const confirmar = e.target.closest('[data-act="confirmar-compra"]');
    if (confirmar) {
      const faltantes = [];
      panel.querySelectorAll('[data-conseguido]').forEach(el => {
        if (!el.classList.contains('on')) faltantes.push(el.dataset.conseguido);
      });
      Estado.registrarCompra(confirmar.dataset.semana, faltantes);
      cerrarHoja();
      tab = 'hoy'; subvista = null;
      refrescar();
      aviso('Semana generada' + (faltantes.length ? ' sin ' + faltantes.length + ' ítem(s)' : ''));
      return;
    }

    const elegir = e.target.closest('[data-elegir]');
    if (elegir && App._slot) {
      const { semana, slot } = App._slot;
      cerrarHoja();
      aplicarCambio(semana, slot, Number(elegir.dataset.elegir));
      aviso('Cambiado. Se reacomodó de acá en adelante');
    }
  });

  vista.addEventListener('click', e => {
    const t = e.target;

    const mc = t.closest('[data-lista]:not([data-tildar])');
    // los botones de lista también aparecen en la pantalla previa al arranque
    if (mc && mc.classList.contains('mc')) { tab = 'compras'; subvista = mc.dataset.lista; render(); return; }

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

    if (act === 'volver-compras') { subvista = null; render(); return; }

    if (act === 'copiar') { copiar(UI.textoLista(btn.dataset.lista)); return; }
    if (act === 'tildar-todo') {
      const prender = btn.dataset.valor === '1';
      if (!prender) Estado.limpiarTildes(btn.dataset.lista);
      else vista.querySelectorAll('[data-tildar]').forEach(el => Estado.tildar(btn.dataset.lista, el.dataset.tildar, true));
      render();
      return;
    }

    if (act === 'ya-compre') {
      abrirHoja(UI.hojaCompra(UI.semanaDe(new Date())));
      return;
    }
    if (act === 'hojas') {
      const sem = UI.semanaDe(new Date());
      Estado.registrarHojas(sem, !Estado.hojas(sem));
      refrescar();
      return;
    }
    if (act === 'alacena-hecha') {
      Estado.marcarAlacena(btn.dataset.fecha);
      Estado.marcarUnaVez(COMPRA_ALACENA.filter(i => i.unaVez).map(i => i.id));
      tab = 'inventario'; subvista = null;
      refrescar();
      aviso('Despensa cargada. Lo de una sola vez ya no vuelve a aparecer');
      return;
    }
    if (act === 'reponer') { Estado.reponerUnaVez(btn.dataset.id); render(); aviso('Vuelve a la lista de alacena'); return; }
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
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  render();
  return { render, refrescar, ir };
})();
