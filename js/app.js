/* ---------------------------------------------------------------
   APP — pantallas, ruteo y eventos. Todo se redibuja desde el
   estado: no hay nada que mantener sincronizado a mano.
   --------------------------------------------------------------- */

(() => {
  'use strict';

  const VERSION = '2.0';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const E = () => Estado.get();
  const I = N.I;

  const vista = $('#vista'), elTitulo = $('#titulo'), elAtras = $('#atras');

  /* Lo que la pantalla recuerda mientras la app está abierta (no se guarda). */
  const ui = {
    filtros: { t: null, eq: [] },
    tengo: [],
    antojos: [],
    armador: { g: null, e: null, c: null, v: [], s: null },
    abiertos: {},
    hoja: null,
    recienHecho: null,
    permitidos: []
  };

  /* ================= utilidades de pantalla ================= */

  let avisoT = null;
  function aviso(txt) {
    const a = $('#aviso');
    a.textContent = txt;
    a.classList.remove('oculto');
    clearTimeout(avisoT);
    avisoT = setTimeout(() => a.classList.add('oculto'), 2400);
  }

  function copiar(txt) {
    const plan = () => {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, txt.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok ? Promise.resolve() : Promise.reject(new Error('sin portapapeles'));
    };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).catch(plan);
    return plan();
  }

  function aplicarTema() {
    const t = E().tema;
    const oscuro = t === 'oscuro' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', oscuro ? '#0e1014' : '#f6f2ea');
  }

  const plural = (n, uno, muchos) => n + ' ' + (n === 1 ? uno : (muchos || uno + 's'));
  const hoy = () => N.ymd(new Date());
  const fechaLarga = () => new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  function hace(fecha) {
    if (!fecha) return '';
    const d = Math.round((new Date(hoy() + 'T12:00:00') - new Date(fecha + 'T12:00:00')) / 86400000);
    return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : 'hace ' + d + ' días';
  }

  const ETIQUETA = {
    pollo: 'Pollo', carne: 'Carne', picada: 'Carne picada', cerdo: 'Cerdo', merluza: 'Merluza', trucha: 'Trucha',
    camarones: 'Camarones', huevo: 'Huevos', atun: 'Atún', mila_pollo: 'Milanesas de pollo', mila_carne: 'Milanesas de carne',
    papa: 'Papa', batata: 'Batata', mozzarella: 'Queso', jamon: 'Jamón', crema: 'Crema', yogur: 'Yogur',
    queso_crema: 'Queso crema', ricota: 'Ricota', noquis: 'Ñoquis', tortillas: 'Tortillas', pan: 'Pan',
    pan_lactal: 'Pan lactal', pan_arabe: 'Pan árabe', tapa_tarta: 'Tapa de tarta', pesto: 'Pesto'
  };
  const etiqueta = id => ETIQUETA[id] || N.mayus((I[id] && I[id].n) || id);

  /* ================= piezas ================= */

  function imagen(d, clase) {
    const u = Fotos.url(d.id);
    if (u) return '<div class="img ' + (clase || '') + '"><img src="' + u + '" alt="" loading="lazy"></div>';
    return '<div class="img ilu ' + (clase || '') + '" style="--tinte:' + N.GRUPO[d.g].color + '">' + ILUS.svg(d.il, N.GRUPO[d.g].color) + '</div>';
  }

  const enlace = k => '#/plato/' + encodeURIComponent(N.clave(k));

  function meta(k) {
    const r = N.redondeados(N.porciones(k, E().modo));
    return '<span>⏱ ' + N.tiempo(k) + '′</span><span>≈ ' + r.kcal + ' kcal</span><span>' + r.p + ' g prot</span>';
  }

  function tarjeta(k, extra) {
    const d = k.p, e = E();
    const marcas = (e.favoritos[d.id] ? '<span class="marca fav" title="Favorito">★</span>' : '') +
      (e.votos[d.id] > 0 ? '<span class="marca">👍</span>' : e.votos[d.id] < 0 ? '<span class="marca">👎</span>' : '');
    return '<a class="plato" href="' + enlace(k) + '">' + imagen(d, 'mini') +
      '<div class="plato-tx"><h3>' + esc(N.nombrePrincipal(k)) + '</h3>' +
      '<p class="acomp">' + esc(N.acompanamiento(k)) + '</p>' +
      '<p class="meta">' + meta(k) + '</p>' + (extra || '') + '</div>' +
      (marcas ? '<div class="marcas">' + marcas + '</div>' : '') + '</a>';
  }

  function tarjetaGrande(k) {
    const d = k.p;
    return '<a class="destacado" href="' + enlace(k) + '">' + imagen(d, 'ancha') +
      '<div class="destacado-tx"><span class="kicker" style="color:' + N.GRUPO[d.g].color + '">' + esc(N.GRUPO[d.g].n) + ' · ' + esc(N.ESTILO[d.e].n) + '</span>' +
      '<h3>' + esc(N.nombrePrincipal(k)) + '</h3><p class="acomp">' + esc(N.acompanamiento(k)) + '</p>' +
      '<p class="meta">' + meta(k) + '</p></div></a>';
  }

  function listaTarjetas(ks, extra) {
    return '<div class="lista">' + ks.map(k => tarjeta(k, extra ? extra(k) : '')).join('') + '</div>';
  }

  function nada(txt, sub) {
    return '<div class="nada"><p>' + esc(txt) + '</p>' + (sub ? '<p class="tenue">' + sub + '</p>' : '') + '</div>';
  }

  /* ================= filtros ================= */

  const CHIPS = [
    { id: 't10', n: '≤ 10′' }, { id: 't20', n: '≤ 20′' }, { id: 't30', n: '≤ 30′' },
    { id: 'sd', n: '🧊 Sin descongelar' },
    { id: 'airfryer', n: '🌀 Air fryer' }, { id: 'horno', n: '♨️ Horno' }, { id: 'microondas', n: '📡 Microondas' },
    { id: 'sarten', n: '🍳 Una sartén' }, { id: 'vajilla', n: '🧽 Poca vajilla' }, { id: 'salsa', n: '🥫 Con salsa' },
    { id: 'nunca', n: '🆕 Nunca hecho' }, { id: 'favs', n: '⭐ Favoritos' }, { id: 'frio', n: '❄️ Sin cocinar' }
  ];
  const EQ = ['airfryer', 'horno', 'microondas'];

  function chipActivo(id) {
    const f = ui.filtros;
    if (id[0] === 't' && /^t\d+$/.test(id)) return f.t === +id.slice(1);
    if (EQ.includes(id)) return f.eq.includes(id);
    return !!f[id];
  }

  function alternarChip(id) {
    const f = ui.filtros;
    if (/^t\d+$/.test(id)) { const n = +id.slice(1); f.t = f.t === n ? null : n; }
    else if (EQ.includes(id)) f.eq = f.eq.includes(id) ? f.eq.filter(x => x !== id) : f.eq.concat(id);
    else f[id] = !f[id];
  }

  function hayFiltros() { return CHIPS.some(c => chipActivo(c.id)); }

  function barraFiltros(ocultar) {
    const fuera = ocultar || [];
    return '<div class="filtros" id="filtros">' +
      (hayFiltros() ? '<button class="chip limpiar" data-a="limpiar-filtros">✕ Limpiar</button>' : '') +
      CHIPS.filter(c => !fuera.includes(c.id)).map(c =>
        '<button class="chip' + (chipActivo(c.id) ? ' on' : '') + '" data-a="filtro" data-id="' + c.id + '">' + c.n + '</button>').join('') +
      '</div>';
  }

  /* Los filtros de la barra más los propios del modo. */
  function filtrosCon(base) {
    const f = Object.assign({}, ui.filtros, base || {});
    f.eq = ui.filtros.eq.concat((base && base.eq) || []);
    if (base && base.t && ui.filtros.t) f.t = Math.min(base.t, ui.filtros.t);
    return f;
  }

  const ordenes = {
    gusto: (a, b) => N.puntaje(b.p, E()) - N.puntaje(a.p, E()) || N.tiempo(a) - N.tiempo(b),
    tiempo: (a, b) => N.tiempo(a) - N.tiempo(b) || N.puntaje(b.p, E()) - N.puntaje(a.p, E())
  };

  function cuenta(n) { return '<p class="cuenta"><b>' + n + '</b> ' + (n === 1 ? 'plato' : 'platos') + '</p>'; }

  /* ================= pantallas ================= */

  const MODOS = [
    { r: 'express',    ic: '⚡', n: 'Express',         d: '15 minutos, un solo recipiente' },
    { r: 'siempre',    ic: '⭐', n: 'Los de siempre',  d: 'Clásicos rápidos y tus favoritos' },
    { r: 'tengo',      ic: '🥦', n: 'Tengo esto',      d: 'Tocá lo que hay y ves qué sale' },
    { r: 'antojo',     ic: '🤤', n: 'Antojo',          d: 'Con salsa, crocante, gratinado…' },
    { r: 'armador',    ic: '🧰', n: 'Armador',         d: 'Elegí paso a paso' },
    { r: 'explorar',   ic: '📚', n: 'Explorar',        d: 'Todo el catálogo' },
    { r: 'vianda',     ic: '🍱', n: 'Vianda',          d: 'Rinden y viajan bien' },
    { r: 'permitidos', ic: '🍕', n: 'Permitidos',      d: 'Fuera del plan: hay que ganárselos' }
  ];

  function delDia() {
    const f = hoy(), e = E();
    if (!e.dia || e.dia.fecha !== f) {
      const ks = N.platoDelDia(f, e);
      Estado.cambiar(s => { s.dia = { fecha: f, claves: ks.map(N.clave) }; });
    }
    return E().dia.claves.map(N.desdeClave).filter(Boolean);
  }

  function vInicio() {
    return '<section class="bloque"><div class="bloque-cab"><h2>Plato del día</h2><span class="tenue">' + esc(fechaLarga()) + '</span></div>' +
      '<div class="carrusel">' + delDia().map(tarjetaGrande).join('') + '</div></section>' +
      '<section class="bloque"><div class="bloque-cab"><h2>¿Cómo elegimos hoy?</h2></div><div class="modos">' +
      MODOS.map(m => '<a class="modo-t m-' + m.r + '" href="#/' + m.r + '"><span class="modo-ic">' + m.ic + '</span><b>' + m.n + '</b><span class="tenue">' + m.d + '</span></a>').join('') +
      '</div></section>';
  }

  function vLista(base, opt) {
    const ks = N.buscar(filtrosCon(base), E(), opt.fuente).sort(ordenes[opt.orden || 'gusto']);
    return '<p class="intro">' + opt.intro + '</p>' + barraFiltros(opt.ocultar) + cuenta(ks.length) +
      (ks.length ? listaTarjetas(ks) : nada('Ningún plato cumple todo eso.', 'Probá sacando algún filtro.'));
  }

  function vExplorar() {
    const f = filtrosCon(null), e = E();
    const pocos = hayFiltros() && N.buscar(f, e).length <= 12;
    let total = 0;
    const grupos = PROTEINAS.map(p => {
      const estilos = ESTILOS.map(es => {
        const ks = N.buscar(Object.assign({}, f, { g: p.id, e: es.id }), e);
        return ks.length ? { es, ks } : null;
      }).filter(Boolean);
      const n = estilos.reduce((a, x) => a + x.ks.length, 0);
      total += n;
      if (!n) return '';
      const abierto = (ui.abiertos[p.id] || pocos) ? ' open' : '';
      return '<details class="grupo" data-g="' + p.id + '"' + abierto + '><summary><span class="punto" style="background:' + p.color + '"></span>' +
        '<b>' + p.ic + ' ' + esc(p.n) + '</b><span class="tenue">' + n + '</span></summary>' +
        estilos.map(x => '<h4 class="estilo">' + x.es.ic + ' ' + esc(x.es.n) + '</h4>' + listaTarjetas(x.ks)).join('') + '</details>';
    }).join('');
    return '<p class="intro">Todo el catálogo, por proteína y por estilo.</p>' + barraFiltros() + cuenta(total) +
      (total ? grupos : nada('Ningún plato cumple todo eso.', 'Probá sacando algún filtro.'));
  }

  function chipsDe(ids, activos, accion, opt) {
    opt = opt || {};
    return '<div class="chips">' + ids.map(id =>
      '<button class="chip' + (activos.includes(id) ? ' on' : '') + '" data-a="' + accion + '" data-id="' + id + '"' +
      (opt.inactivo && opt.inactivo(id) ? ' disabled' : '') + '>' + esc((opt.nombre || etiqueta)(id)) + '</button>').join('') + '</div>';
  }

  function vTengo() {
    const o = N.opcionesTengo();
    const res = ui.tengo.length ? N.tengo(ui.tengo, filtrosCon(null), E()) : [];
    const ok = res.filter(r => r.ok).length;
    const pie = r => r.ok
      ? '<p class="estado ok">✅ Lo podés hacer</p>'
      : '<p class="estado falta">🟡 Te falta: <b>' + esc(r.falta) + '</b>' + (r.reemplazo ? ' · se reemplaza con ' + esc(r.reemplazo) : '') + '</p>';
    return '<p class="intro">Tocá lo que tenés <b>ahora</b>. No se guarda nada: es solo para esta vez. Lo de alacena (arroz, fideos, latas, salsas) se da por hecho.</p>' +
      '<h3 class="sub">Proteínas</h3>' + chipsDe(o.prot, ui.tengo, 'tengo') +
      '<h3 class="sub">Verduras</h3>' + chipsDe(o.verd, ui.tengo, 'tengo') +
      '<h3 class="sub">Heladera y panes</h3>' + chipsDe(o.otros, ui.tengo, 'tengo') +
      (ui.tengo.length
        ? '<a class="flotante" href="#/tengo" data-a="bajar"><b>' + res.length + '</b> ' + (res.length === 1 ? 'plato' : 'platos') + ' ↓</a>' +
          '<div class="resultado"><div class="bloque-cab"><h2>Sale esto</h2><button class="link" data-a="tengo-limpiar">Empezar de nuevo</button></div>' +
          barraFiltros() +
          '<p class="cuenta"><b>' + ok + '</b> para hacer ya · <b>' + (res.length - ok) + '</b> con un faltante</p>' +
          (res.length ? '<div class="lista">' + res.map(r => tarjeta(r.k, pie(r))).join('') + '</div>'
            : nada('Con eso solo no sale ningún plato.', 'Sumá una proteína o alguna verdura más.')) + '</div>'
        : '');
  }

  function vAntojo() {
    let ks = [], nota = '';
    if (ui.antojos.length) {
      ks = N.buscar(filtrosCon({ tags: ui.antojos }), E());
      if (!ks.length && ui.antojos.length > 1) {
        const vistos = {};
        ui.antojos.forEach(t => N.buscar(filtrosCon({ tags: [t] }), E()).forEach(k => { vistos[k.p.id] = k; }));
        ks = Object.values(vistos);
        nota = '<p class="tenue chico">Ninguno cumple todos a la vez: estos cumplen al menos uno.</p>';
      }
      ks.sort(ordenes.gusto);
    }
    return '<p class="intro">¿De qué tenés ganas? Podés marcar más de uno.</p><div class="antojos">' +
      ANTOJOS.map(a => '<button class="antojo' + (ui.antojos.includes(a.id) ? ' on' : '') + '" data-a="antojo" data-id="' + a.id + '">' +
        '<span class="modo-ic">' + a.ic + '</span><b>' + esc(a.n) + '</b>' + (a.nota ? '<span class="tenue">' + esc(a.nota) + '</span>' : '') + '</button>').join('') + '</div>' +
      (ui.antojos.length
        ? '<div class="resultado">' + barraFiltros(['salsa']) + cuenta(ks.length) + nota +
          (ks.length ? listaTarjetas(ks) : nada('Nada con esa combinación y esos filtros.')) + '</div>'
        : '');
  }

  function vArmador() {
    const sel = ui.armador, e = E(), f = filtrosCon(null);
    const cumple = s => N.armador(s).filter(d => N.sugerir(d, f, e, N.comboArmador(d, s)));
    const quedan = cumple(sel);
    const prueba = (campo, id) => {
      const s = Object.assign({}, sel, { v: sel.v.slice() });
      if (campo === 'v') { if (s.v.includes(id)) return true; s.v.push(id); } else s[campo] = id;
      return cumple(s).length > 0;
    };
    const fila = (titulo, campo, ids, nombre, paso) => {
      const activos = campo === 'v' ? sel.v : (sel[campo] ? [sel[campo]] : []);
      return '<div class="paso"><h3 class="sub"><span class="num">' + paso + '</span>' + titulo + '</h3>' +
        chipsDe(ids, activos, 'armar-' + campo, { nombre, inactivo: id => !activos.includes(id) && !prueba(campo, id) }) + '</div>';
    };
    const carbos = [], verduras = [], salsas = [];
    N.platos.forEach(d => {
      d.c.forEach(c => { if (!carbos.includes(c)) carbos.push(c); });
      d.v.concat(d.vf).forEach(v => { if (!verduras.includes(v)) verduras.push(v); });
      d.s.forEach(s => { if (s !== 'nada' && s !== 'caldo' && !salsas.includes(s)) salsas.push(s); });
    });
    const algo = sel.g || sel.e || sel.c || sel.v.length || sel.s;
    const ks = quedan.map(d => N.sugerir(d, f, e, N.comboArmador(d, sel))).filter(Boolean).sort(ordenes.gusto);
    return '<p class="intro">Elegí en el orden que quieras. Abajo va quedando lo que cumple.</p>' +
      fila('Proteína', 'g', PROTEINAS.map(p => p.id), id => N.GRUPO[id].ic + ' ' + N.GRUPO[id].n, 1) +
      fila('Estilo', 'e', ESTILOS.map(x => x.id), id => N.ESTILO[id].ic + ' ' + N.ESTILO[id].n, 2) +
      fila('Carbohidrato', 'c', carbos, id => N.mayus(I[id].n), 3) +
      fila('Verduras', 'v', verduras, id => N.mayus(I[id].n), 4) +
      fila('Salsa', 's', salsas, id => SALSAS[id].n, 5) +
      '<div class="resultado" id="armador-res"><div class="bloque-cab"><h2><span class="contador">' + ks.length + '</span> ' + (ks.length === 1 ? 'plato' : 'platos') + '</h2>' +
      (algo ? '<button class="link" data-a="armar-limpiar">Empezar de nuevo</button>' : '') + '</div>' +
      barraFiltros() + (ks.length ? listaTarjetas(ks) : nada('No queda ningún plato.', 'Sacá alguna elección.')) + '</div>' +
      '<a class="flotante" href="#/armador" data-a="bajar"><b>' + ks.length + '</b> ' + (ks.length === 1 ? 'plato' : 'platos') + ' ↓</a>';
  }

  /* ---------- ficha ---------- */

  const ROL_IC = { proteina: '🥩', carbo: '🍚', verdura: '🥬', extra: '🧀' };

  function vPlato(arg) {
    const k = N.desdeClave(arg);
    if (!k) return nada('No encontré ese plato.', '<a href="#/explorar">Ver el catálogo</a>');
    const d = k.p, e = E(), g = N.GRUPO[d.g];
    const por = N.porciones(k, e.modo), r = N.redondeados(por), m = N.MODOS[e.modo];
    const foto = Fotos.url(d.id);
    const eq = N.equipo(k).map(x => EQUIPOS[x].ic + ' ' + EQUIPOS[x].n);
    const pildoras = ['⏱ ' + N.tiempo(k) + ' min'].concat(eq.length ? eq : ['❄️ Sin cocinar'])
      .concat(N.esExpress(k) ? ['⚡ Express'] : [])
      .concat([d.vaj === 'poca' ? '🧽 Poca vajilla' : '🧽 Vajilla media'])
      .concat(d.via ? ['🍱 Sirve de vianda'] : [])
      .concat(d.sd ? ['🧊 Sin descongelar'] : []);
    const filas = por.items.map(it => '<li><span class="rol">' + (it.id === 'huevo' ? '🥚' : ROL_IC[it.rol]) + '</span>' + esc(N.mayus(it.txt)) + '</li>')
      .concat(por.salsa.g ? ['<li><span class="rol">🥫</span>Salsa ' + esc(por.salsa.n.toLowerCase()) + ' <span class="tenue">≈ ' + por.salsa.g + ' g</span></li>'] : [])
      .concat(por.aceite ? ['<li><span class="rol">🥄</span>' + esc(N.mayus(N.textoAceite(por.aceite))) + '</li>'] : []);

    const maxV = N.MAX_VERDURAS - d.vf.length;
    const opciones =
      (d.c.length > 1 ? '<h3 class="sub">Carbohidrato</h3><div class="chips">' + d.c.map(c =>
        '<button class="chip' + (c === k.c ? ' on' : '') + '" data-a="cambiar" data-campo="c" data-id="' + c + '">' + esc(N.mayus(I[c].n)) + '</button>').join('') + '</div>' : '') +
      (d.v.length ? '<h3 class="sub">Verduras <span class="tenue">' + (maxV > 1 ? 'hasta ' + maxV : 'una') + '</span></h3><div class="chips">' +
        d.vf.map(v => '<button class="chip on fijo" disabled>' + esc(N.mayus(I[v].n)) + '</button>').join('') +
        d.v.map(v => '<button class="chip' + (k.v.includes(v) ? ' on' : '') + '" data-a="cambiar" data-campo="v" data-id="' + v + '">' + esc(N.mayus(I[v].n)) + '</button>').join('') + '</div>' : '') +
      (d.s.length > 1 ? '<h3 class="sub">Salsa</h3><div class="chips">' + d.s.map(s =>
        '<button class="chip' + (s === k.s ? ' on' : '') + '" data-a="cambiar" data-campo="s" data-id="' + s + '">' + esc(SALSAS[s].n) + '</button>').join('') + '</div>' : '');

    const veces = e.hechos[d.id] || 0, voto = e.votos[d.id] || 0;
    const preguntar = ui.recienHecho === d.id && !voto;

    return '<article class="ficha" data-clave="' + esc(N.clave(k)) + '">' +
      '<div class="hero">' + imagen(d, 'hero-img') +
        '<button class="hero-b fav' + (e.favoritos[d.id] ? ' on' : '') + '" data-a="fav" aria-label="Favorito">' + (e.favoritos[d.id] ? '★' : '☆') + '</button>' +
        '<div class="hero-pie"><button class="hero-p" data-a="foto">📷 ' + (foto ? 'Cambiar foto' : 'Poner mi foto') + '</button>' +
        (foto ? '<button class="hero-p" data-a="quitar-foto">Quitar</button>' : '') + '</div></div>' +
      '<span class="kicker" style="color:' + g.color + '">' + esc(g.n) + ' · ' + esc(N.ESTILO[d.e].n) + '</span>' +
      '<h2 class="nombre">' + esc(N.nombre(k)) + '</h2>' +
      '<div class="pildoras">' + pildoras.map(p => '<span>' + p + '</span>').join('') + '</div>' +
      '<div class="macros"><div><b>≈ ' + r.kcal + '</b><span>kcal</span></div><div><b>≈ ' + r.p + ' g</b><span>proteína</span></div>' +
        '<div class="obj"><b>' + m.n + '</b><span>objetivo ' + m.kcal + ' kcal</span></div></div>' +
      '<h3 class="sub">Para 1 persona <span class="tenue">cantidades aproximadas</span></h3><ul class="gramos">' + filas.join('') + '</ul>' +
      '<div class="variantes"><div class="bloque-cab"><h2>Cambiar la combinación</h2></div>' + opciones + '</div>' +
      '<div class="acciones">' +
        '<button class="boton primario" data-a="receta">👨‍🍳 Pedir receta a Claude</button>' +
        '<button class="boton" data-a="compra-plato">🛒 Lista de compras de este plato</button>' +
        '<button class="boton" data-a="hecho">✅ Lo cociné' + (veces ? ' <span class="tenue">· ' + veces + (veces === 1 ? ' vez' : ' veces') + ', ' + hace(e.ultima[d.id]) + '</span>' : '') + '</button>' +
      '</div>' +
      '<div class="votos' + (preguntar ? ' pregunta' : '') + '"><span>' + (preguntar ? '¿Cómo salió?' : '¿Te gusta este plato?') + '</span>' +
        '<button class="voto' + (voto > 0 ? ' on' : '') + '" data-a="voto" data-v="1" aria-label="Me gustó">👍</button>' +
        '<button class="voto' + (voto < 0 ? ' on' : '') + '" data-a="voto" data-v="-1" aria-label="No me gustó">👎</button></div>' +
      (veces > 1 ? '<button class="link centro" data-a="deshacer-hecho">Restar una vez</button>' : '') +
      '</article>';
  }

  /* ---------- compras ---------- */

  function vCompras() {
    const c = E().compra;
    let h = '';
    if (c.filas.length) {
      const listos = c.filas.filter(x => c.listos[x.id]).length;
      const renglon = x => '<li class="item' + (c.listos[x.id] ? ' listo' : '') + '" data-a="tachar" data-id="' + esc(x.id) + '">' +
        '<span class="tilde">' + (c.listos[x.id] ? '✓' : '') + '</span><span class="item-n">' + esc(x.n) + '</span>' +
        (x.cant ? '<span class="item-c">' + esc(x.cant) + '</span>' : '') + '</li>';
      const al = N.deAlacena(c.filas);
      h += '<section class="bloque"><div class="bloque-cab"><h2>Modo compra</h2><span class="tenue">' + listos + ' de ' + c.filas.length + '</span></div>' +
        (c.titulo ? '<p class="tenue chico">' + esc(c.titulo) + '</p>' : '') +
        '<div class="progreso"><i style="width:' + Math.round(listos / c.filas.length * 100) + '%"></i></div>' +
        N.porSeccion(c.filas).map(g => '<h3 class="seccion">' + g.sec.ic + ' ' + esc(g.sec.n) + '</h3><ul class="items">' + g.items.map(renglon).join('') + '</ul>').join('') +
        (al.length ? '<h3 class="seccion">🏠 Revisar que haya en casa</h3><ul class="items alacena">' + al.map(renglon).join('') + '</ul>' : '') +
        '<div class="acciones"><button class="boton" data-a="copiar-compra">📋 Copiar lo que falta</button>' +
        '<button class="boton peligro" data-a="reiniciar-compra">Reiniciar la lista</button></div></section>';
    } else {
      h += '<section class="bloque"><div class="bloque-cab"><h2>Modo compra</h2></div>' +
        nada('No hay ninguna lista en curso.', 'Armala desde un plato (“Lista de compras de este plato”) o con la lista sugerida de abajo.') + '</section>';
    }
    const sug = N.listaSugerida(E());
    h += '<section class="bloque"><div class="bloque-cab"><h2>Lista sugerida</h2></div>' +
      '<p class="intro">Qué conviene tener en casa, según ' + esc(sug.origen) + '. Sin cantidades: no es un plan de la semana.</p>' +
      '<p class="tenue chico">Sale de: ' + sug.platos.map(d => esc(N.nombrePrincipal(N.comboBase(d)))).join(' · ') + '</p>' +
      '<div class="acciones"><button class="boton primario" data-a="ver-sugerida">Ver la lista sugerida</button></div></section>';
    return h;
  }

  function hojaCompras(titulo, filas, origen) {
    const al = N.deAlacena(filas);
    return '<div class="hoja-cab"><h2>🛒 Lista de compras</h2><button class="cerrar" data-a="cerrar-hoja" aria-label="Cerrar">✕</button></div>' +
      '<p class="tenue chico">' + esc(titulo) + '</p>' +
      N.porSeccion(filas).map(g => '<h3 class="seccion">' + g.sec.ic + ' ' + esc(g.sec.n) + '</h3><ul class="items quieta">' +
        g.items.map(x => '<li class="item"><span class="item-n">' + esc(x.n) + '</span>' + (x.cant ? '<span class="item-c">' + esc(x.cant) + '</span>' : '') + '</li>').join('') + '</ul>').join('') +
      (al.length ? '<p class="alacena-nota"><b>Revisar que haya en casa:</b> ' + esc(al.map(x => x.n.toLowerCase()).join(', ')) + '.</p>' : '') +
      '<div class="acciones"><button class="boton primario" data-a="copiar-lista">📋 Copiar como texto</button>' +
      '<button class="boton" data-a="a-modo-compra">' + (E().compra.filas.length && origen === 'plato' ? '➕ Sumar al modo compra' : '✔️ Pasar al modo compra') + '</button></div>';
  }

  /* ---------- permitidos ---------- */

  function vPermitidos() {
    const juego = typeof JuegoUI !== 'undefined' ? JuegoUI : null;
    const est = juego ? juego.estado() : null;
    const versionPlan = p => {
      if (p.plan.texto) return '<div class="plan"><span class="plan-t">Dentro del plan</span><p>' + esc(p.plan.texto) + '</p></div>';
      const d = N.porId[p.plan.plato];
      const k = N.comboDe(d, p.plan.c, null, p.plan.s);
      const r = N.redondeados(N.porciones(k, E().modo));
      return '<a class="plan" href="' + enlace(k) + '"><span class="plan-t">Dentro del plan</span><p><b>' + esc(N.nombrePrincipal(k)) + '</b> · ≈ ' + r.kcal + ' kcal →</p>' +
        (p.nota ? '<p class="tenue chico">' + esc(p.nota) + '</p>' : '') + '</a>';
    };
    const cab = juego ? juego.cartel(ui.permitidos) : '';
    return '<p class="intro">Esto queda <b>fuera del plan</b>. Se puede mirar siempre; para comerlo hay que ganárselo.</p>' + cab +
      '<div class="permitidos">' + PERMITIDOS.map(p => {
        const elegido = ui.permitidos.includes(p.id);
        const libre = est && est.desbloqueado && est.desbloqueado.includes(p.id);
        return '<div class="permitido' + (elegido ? ' on' : '') + (libre ? ' libre' : '') + '">' +
          '<div class="permitido-cab"><span class="permitido-ic">' + p.ic + '</span><div><h3>' + esc(p.n) + '</h3><p class="tenue chico">' + esc(p.det) + '</p></div>' +
          '<div class="permitido-k"><b>≈ ' + p.kcal + '</b><span>kcal</span></div></div>' +
          '<span class="sello">' + (libre ? '🔓 Ganado' : 'Fuera del plan') + '</span>' + versionPlan(p) +
          (juego && !libre ? '<button class="boton chico' + (elegido ? ' primario' : '') + '" data-a="elegir-permitido" data-id="' + p.id + '">' + (elegido ? '✓ Elegido' : 'Quiero este') + '</button>' : '') +
          '</div>';
      }).join('') + '</div>';
  }

  /* ---------- ajustes ---------- */

  function vAjustes() {
    const e = E();
    const seg = (campo, ops) => '<div class="seg">' + ops.map(o =>
      '<button class="' + (e[campo] === o[0] ? 'on' : '') + '" data-a="ajuste" data-campo="' + campo + '" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
    const nFav = Object.keys(e.favoritos).length, nHechos = Object.values(e.hechos).reduce((a, b) => a + b, 0);
    return '<section class="bloque"><div class="bloque-cab"><h2>Objetivo</h2></div>' +
      '<p class="intro">Cada plato apunta a unos ' + N.PROTEINA_OBJETIVO + ' g de proteína. Las calorías dependen del objetivo: Bajar ≈ ' + N.MODOS.bajar.kcal + ', Mantener ≈ ' + N.MODOS.mantener.kcal + ', Subir ≈ ' + N.MODOS.subir.kcal + '.</p>' +
      seg('modo', [['bajar', 'Bajar'], ['mantener', 'Mantener'], ['subir', 'Subir']]) + '</section>' +
      '<section class="bloque"><div class="bloque-cab"><h2>Apariencia</h2></div>' + seg('tema', [['auto', 'Automática'], ['claro', 'Clara'], ['oscuro', 'Oscura']]) + '</section>' +
      '<section class="bloque"><div class="bloque-cab"><h2>Tus datos</h2></div>' +
      '<p class="intro">Todo queda en este teléfono: ' + plural(nFav, 'favorito') + ', ' + plural(nHechos, 'plato cocinado', 'platos cocinados') + ' y ' + plural(Fotos.cuantas(), 'foto') + '.</p>' +
      '<div class="acciones"><button class="boton" data-a="exportar">📤 Copiar una copia de seguridad</button>' +
      '<button class="boton" data-a="importar">📥 Restaurar una copia</button>' +
      '<button class="boton peligro" data-a="borrar-fotos">Borrar mis fotos</button>' +
      '<button class="boton peligro" data-a="borrar-todo">Borrar favoritos, votos y listas</button></div></section>' +
      '<section class="bloque"><div class="bloque-cab"><h2>Sobre la app</h2></div>' +
      '<p class="intro">' + N.platos.length + ' platos base. Las cantidades y las calorías son aproximadas (±10%): salen de tablas de nutrientes por 100 g (USDA y tablas argentinas), con la proteína pesada en crudo.</p>' +
      '<p class="intro">Nunca aparece zanahoria, picante, cilantro, romero ni especias fuertes.</p>' +
      '<div class="acciones"><a class="boton" href="archivo-v1/">🗄️ Abrir la app vieja (plan semanal)</a></div>' +
      '<p class="tenue chico centro" id="sello">Versión ' + VERSION + '</p></section>';
  }

  /* ================= ruteo ================= */

  const RUTAS = {
    '':         { t: 'Qué como', tab: 'inicio', v: vInicio },
    express:    { t: 'Express', v: () => vLista({ express: true }, { orden: 'tiempo', ocultar: ['t20', 't30', 'sarten'], intro: 'Listos en 15 minutos o menos y con un solo recipiente.' }) },
    siempre:    { t: 'Los de siempre', v: () => vLista({}, { fuente: N.losDeSiempre(E()), intro: 'Los clásicos que salen bien, más tus favoritos. Lo que votaste 👍 sube; lo que votaste 👎 se va.' }) },
    vianda:     { t: 'Vianda', v: () => vLista({ via: true }, { intro: 'Rinden, se recalientan bien y viajan sin desarmarse.' }) },
    tengo:      { t: 'Tengo esto', v: vTengo },
    antojo:     { t: 'Antojo', v: vAntojo },
    armador:    { t: 'Armador', v: vArmador },
    explorar:   { t: 'Explorar', tab: 'explorar', v: vExplorar },
    permitidos: { t: 'Permitidos', tab: 'permitidos', v: vPermitidos },
    compras:    { t: 'Compras', tab: 'compras', v: vCompras },
    ajustes:    { t: 'Ajustes', tab: 'ajustes', v: vAjustes },
    plato:      { t: 'Plato', v: vPlato }
  };

  let ruta = { nombre: '', arg: '' }, rutaPrevia = null;

  function leerRuta() {
    const h = location.hash.replace(/^#\/?/, '');
    const i = h.indexOf('/');
    const nombre = i === -1 ? h : h.slice(0, i);
    let arg = i === -1 ? '' : h.slice(i + 1);
    try { arg = decodeURIComponent(arg); } catch (e) { /* queda como está */ }
    return RUTAS[nombre] ? { nombre, arg } : { nombre: '', arg: '' };
  }

  function render(mismaPantalla) {
    const r = RUTAS[ruta.nombre];
    const barra = $('#filtros'), desliz = barra ? barra.scrollLeft : 0;
    elTitulo.textContent = r.t;
    elAtras.hidden = !!r.tab;
    document.body.dataset.ruta = ruta.nombre || 'inicio';
    vista.innerHTML = r.v(ruta.arg);
    $$('#tabs .tab').forEach(t => t.classList.toggle('activo', t.dataset.tab === r.tab));
    $$('#modo button').forEach(b => b.classList.toggle('on', b.dataset.modo === E().modo));
    if (mismaPantalla) { const b = $('#filtros'); if (b) b.scrollLeft = desliz; }
    else window.scrollTo(0, 0);
    ajustarFlotante();
  }

  function navegar() {
    const nueva = leerRuta();
    const misma = nueva.nombre === ruta.nombre && nueva.nombre === 'plato' && rutaPrevia !== null &&
      N.desdeClave(nueva.arg) && N.desdeClave(ruta.arg) && N.desdeClave(nueva.arg).p === N.desdeClave(ruta.arg).p;
    rutaPrevia = ruta;
    ruta = nueva;
    cerrarHoja();
    render(misma);
  }

  /* ================= hoja inferior ================= */

  function abrirHoja(html, datos) {
    ui.hoja = datos || {};
    $('#hoja-panel').innerHTML = html;
    $('#hoja').classList.remove('oculta');
    document.body.classList.add('con-hoja');
    $('#hoja-panel').scrollTop = 0;
  }
  function cerrarHoja() {
    ui.hoja = null;
    $('#hoja').classList.add('oculta');
    document.body.classList.remove('con-hoja');
  }

  /* ================= acciones ================= */

  const comboActual = () => (ruta.nombre === 'plato' ? N.desdeClave(ruta.arg) : null);

  function cambiarCombo(campo, id) {
    const k = comboActual(); if (!k) return;
    const d = k.p;
    let { c, s } = k, v = k.v.slice();
    if (campo === 'c') c = id;
    if (campo === 's') s = id;
    if (campo === 'v') {
      if (v.includes(id)) {
        if (v.length + d.vf.length <= 1) { aviso('Tiene que quedar al menos una verdura'); return; }
        v = v.filter(x => x !== id);
      } else {
        const max = N.MAX_VERDURAS - d.vf.length;
        if (v.length >= max) v = v.slice(1);
        v.push(id);
      }
    }
    const nuevo = { p: d, c, v, s };
    Estado.cambiar(e => { e.combos[d.id] = N.clave(nuevo); });
    history.replaceState(null, '', enlace(nuevo));
    ruta.arg = N.clave(nuevo);
    render(true);
  }

  function pasarACompra(titulo, filas, sumar) {
    Estado.cambiar(e => {
      if (sumar && e.compra.filas.length) {
        e.compra.filas = N.sumarCompras(e.compra.filas, filas);
        e.compra.titulo = 'Varios platos';
      } else {
        e.compra = { titulo, filas: filas.map(x => Object.assign({}, x)), listos: {} };
      }
    });
  }

  const ACCIONES = {
    'filtro': el => { alternarChip(el.dataset.id); render(true); },
    'limpiar-filtros': () => { ui.filtros = { t: null, eq: [] }; render(true); },

    'tengo': el => {
      const id = el.dataset.id;
      if (ui.tengo.includes(id)) ui.tengo = ui.tengo.filter(x => x !== id);
      else if (ui.tengo.length >= 6) { aviso('Hasta 6 cosas: con 1 a 3 suele alcanzar'); return; }
      else ui.tengo.push(id);
      render(true);
    },
    'tengo-limpiar': () => { ui.tengo = []; render(true); window.scrollTo(0, 0); },

    'antojo': el => {
      const id = el.dataset.id;
      ui.antojos = ui.antojos.includes(id) ? ui.antojos.filter(x => x !== id) : ui.antojos.concat(id);
      render(true);
    },

    'armar-g': el => { ui.armador.g = ui.armador.g === el.dataset.id ? null : el.dataset.id; render(true); },
    'armar-e': el => { ui.armador.e = ui.armador.e === el.dataset.id ? null : el.dataset.id; render(true); },
    'armar-c': el => { ui.armador.c = ui.armador.c === el.dataset.id ? null : el.dataset.id; render(true); },
    'armar-s': el => { ui.armador.s = ui.armador.s === el.dataset.id ? null : el.dataset.id; render(true); },
    'armar-v': el => {
      const id = el.dataset.id, v = ui.armador.v;
      ui.armador.v = v.includes(id) ? v.filter(x => x !== id) : v.concat(id).slice(-3);
      render(true);
    },
    'armar-limpiar': () => { ui.armador = { g: null, e: null, c: null, v: [], s: null }; render(true); window.scrollTo(0, 0); },
    'bajar': (el, ev) => {
      ev.preventDefault();
      const r = $('.resultado');
      if (r) window.scrollTo({ top: r.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
    },

    'cambiar': el => cambiarCombo(el.dataset.campo, el.dataset.id),

    'fav': () => {
      const k = comboActual(); if (!k) return;
      Estado.cambiar(e => { if (e.favoritos[k.p.id]) delete e.favoritos[k.p.id]; else e.favoritos[k.p.id] = true; });
      aviso(E().favoritos[k.p.id] ? 'Guardado en favoritos' : 'Fuera de favoritos');
      render(true);
    },
    'voto': el => {
      const k = comboActual(); if (!k) return;
      const v = +el.dataset.v;
      Estado.cambiar(e => { if (e.votos[k.p.id] === v) delete e.votos[k.p.id]; else e.votos[k.p.id] = v; });
      ui.recienHecho = null;
      render(true);
    },
    'hecho': () => {
      const k = comboActual(); if (!k) return;
      Estado.cambiar(e => { e.hechos[k.p.id] = (e.hechos[k.p.id] || 0) + 1; e.ultima[k.p.id] = hoy(); e.combos[k.p.id] = N.clave(k); });
      ui.recienHecho = k.p.id;
      aviso('Anotado. ¿Cómo salió?');
      render(true);
      const v = $('.votos'); if (v) v.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    'deshacer-hecho': () => {
      const k = comboActual(); if (!k) return;
      Estado.cambiar(e => { e.hechos[k.p.id] = Math.max(0, (e.hechos[k.p.id] || 0) - 1); if (!e.hechos[k.p.id]) { delete e.hechos[k.p.id]; delete e.ultima[k.p.id]; } });
      render(true);
    },

    'receta': () => {
      const k = comboActual(); if (!k) return;
      const txt = N.promptReceta(k, E().modo, 1);
      const mostrar = ok => abrirHoja(
        '<div class="hoja-cab"><h2>👨‍🍳 Pedido de receta</h2><button class="cerrar" data-a="cerrar-hoja" aria-label="Cerrar">✕</button></div>' +
        '<p class="' + (ok ? 'estado ok' : 'estado falta') + '">' + (ok ? '✅ Copiado. Pegalo en Claude.' : 'No pude copiarlo solo: mantené apretado el texto y copialo.') + '</p>' +
        '<textarea class="prompt" readonly>' + esc(txt) + '</textarea>' +
        '<div class="acciones"><button class="boton" data-a="copiar-prompt">📋 Copiar de nuevo</button>' +
        '<a class="boton primario" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a></div>', { texto: txt });
      copiar(txt).then(() => mostrar(true), () => mostrar(false));
    },
    'copiar-prompt': () => { if (ui.hoja && ui.hoja.texto) copiar(ui.hoja.texto).then(() => aviso('Copiado'), () => aviso('No se pudo copiar')); },

    'compra-plato': () => {
      const k = comboActual(); if (!k) return;
      const filas = N.comprasDeCombo(k, E().modo);
      const titulo = N.nombre(k);
      abrirHoja(hojaCompras(titulo, filas, 'plato'), { titulo, filas, origen: 'plato' });
    },
    'ver-sugerida': () => {
      const sug = N.listaSugerida(E());
      const titulo = 'Lista sugerida — qué tener en casa';
      abrirHoja(hojaCompras(titulo, sug.filas, 'sugerida'), { titulo, filas: sug.filas, origen: 'sugerida' });
    },
    'copiar-lista': () => {
      if (!ui.hoja) return;
      copiar(N.textoCompras(ui.hoja.titulo, ui.hoja.filas)).then(() => aviso('Lista copiada'), () => aviso('No se pudo copiar'));
    },
    'a-modo-compra': () => {
      if (!ui.hoja) return;
      pasarACompra(ui.hoja.titulo, ui.hoja.filas, ui.hoja.origen === 'plato');
      cerrarHoja();
      aviso('Lista lista en Compras');
      if (ruta.nombre === 'compras') render(true); else location.hash = '#/compras';
    },
    'tachar': el => {
      const id = el.dataset.id;
      Estado.cambiar(e => { if (e.compra.listos[id]) delete e.compra.listos[id]; else e.compra.listos[id] = true; });
      const c = E().compra, listo = !!c.listos[id];
      el.classList.toggle('listo', listo);
      $('.tilde', el).textContent = listo ? '✓' : '';
      const n = c.filas.filter(x => c.listos[x.id]).length;
      const cab = $('.bloque-cab .tenue'); if (cab) cab.textContent = n + ' de ' + c.filas.length;
      const barra = $('.progreso i'); if (barra) barra.style.width = Math.round(n / c.filas.length * 100) + '%';
      if (n === c.filas.length) aviso('¡Compra completa!');
    },
    'copiar-compra': () => {
      const c = E().compra;
      const faltan = c.filas.filter(x => !c.listos[x.id]);
      if (!faltan.length) { aviso('Ya está todo tachado'); return; }
      copiar(N.textoCompras(c.titulo || 'Lista de compras', faltan)).then(() => aviso('Copiado lo que falta'), () => aviso('No se pudo copiar'));
    },
    'reiniciar-compra': () => {
      if (!confirm('¿Borrar la lista de compras en curso?')) return;
      Estado.cambiar(e => { e.compra = { titulo: '', filas: [], listos: {} }; });
      render(true);
    },

    'foto': () => { $('#in-foto').click(); },
    'quitar-foto': () => {
      const k = comboActual(); if (!k) return;
      Fotos.quitar(k.p.id).then(() => { aviso('Volvió la ilustración'); render(true); }, () => aviso('No se pudo quitar'));
    },

    'elegir-permitido': el => {
      const id = el.dataset.id;
      if (ui.permitidos.includes(id)) ui.permitidos = ui.permitidos.filter(x => x !== id);
      else if (ui.permitidos.length >= 2) { aviso('Hasta dos: uno solo ya cuesta'); return; }
      else ui.permitidos.push(id);
      render(true);
    },
    'jugar': () => {
      if (typeof JuegoUI === 'undefined') return;
      JuegoUI.abrir(ui.permitidos.slice(), () => { ui.permitidos = []; render(true); });
    },
    'comido': () => { if (typeof JuegoUI !== 'undefined') { JuegoUI.consumir(); render(true); } },

    'ajuste': el => {
      Estado.cambiar(e => { e[el.dataset.campo] = el.dataset.v; });
      aplicarTema();
      render(true);
    },
    'exportar': () => copiar(Estado.exportar()).then(() => aviso('Copia de seguridad copiada: pegala en Notas'), () => aviso('No se pudo copiar')),
    'importar': () => abrirHoja(
      '<div class="hoja-cab"><h2>📥 Restaurar una copia</h2><button class="cerrar" data-a="cerrar-hoja" aria-label="Cerrar">✕</button></div>' +
      '<p class="intro">Pegá acá el texto de la copia de seguridad. Reemplaza favoritos, votos y listas (las fotos no viajan en la copia).</p>' +
      '<textarea class="prompt" id="txt-importar" placeholder="{ ... }"></textarea>' +
      '<div class="acciones"><button class="boton primario" data-a="importar-ok">Restaurar</button></div>'),
    'importar-ok': () => {
      try { Estado.importar($('#txt-importar').value); cerrarHoja(); aplicarTema(); render(true); aviso('Copia restaurada'); }
      catch (e) { aviso('Ese texto no es una copia válida'); }
    },
    'borrar-fotos': () => {
      if (!confirm('¿Borrar todas tus fotos? Vuelven las ilustraciones.')) return;
      Fotos.borrarTodas().then(() => { aviso('Fotos borradas'); render(true); }, () => aviso('No se pudieron borrar'));
    },
    'borrar-todo': () => {
      if (!confirm('¿Borrar favoritos, votos, veces cocinado y la lista de compras? No se puede deshacer.')) return;
      const { modo, tema } = E();
      Estado.borrar();
      Estado.cambiar(e => { e.modo = modo; e.tema = tema; });
      render(true);
      aviso('Listo, empezás de cero');
    },

    'cerrar-hoja': cerrarHoja
  };

  /* ================= eventos ================= */

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = ACCIONES[el.dataset.a];
    if (fn) fn(el, ev);
  });

  $('#modo').addEventListener('click', ev => {
    const b = ev.target.closest('[data-modo]');
    if (!b) return;
    Estado.cambiar(e => { e.modo = b.dataset.modo; });
    render(true);
    aviso('Objetivo: ' + N.MODOS[b.dataset.modo].n + ' · ≈ ' + N.MODOS[b.dataset.modo].kcal + ' kcal por plato');
  });

  elAtras.addEventListener('click', () => {
    if (rutaPrevia && history.length > 1) history.back();
    else location.hash = '#/';
  });

  vista.addEventListener('toggle', ev => {
    const d = ev.target;
    if (d.matches && d.matches('details.grupo')) ui.abiertos[d.dataset.g] = d.open;
  }, true);

  $('#in-foto').addEventListener('change', ev => {
    const archivo = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    const k = comboActual();
    if (!archivo || !k) return;
    aviso('Guardando la foto…');
    Fotos.guardar(k.p.id, archivo).then(() => { aviso('Foto guardada'); render(true); }, () => aviso('No se pudo guardar la foto'));
  });

  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') cerrarHoja(); });
  window.addEventListener('hashchange', navegar);
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => aplicarTema();
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  }

  /* El contador flotante del armador se esconde cuando la lista ya se ve. */
  function ajustarFlotante() {
    const f = $('.flotante'), r = $('.resultado');
    if (f && r) f.classList.toggle('oculto', r.getBoundingClientRect().top < window.innerHeight - 140);
  }
  window.addEventListener('scroll', ajustarFlotante, { passive: true });

  /* Si quedó abierta y cambió el día, el plato del día se renueva solo. */
  let diaVisto = hoy();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && hoy() !== diaVisto) { diaVisto = hoy(); if (ruta.nombre === '') render(true); }
  });

  /* ================= service worker ================= */

  if ('serviceWorker' in navigator) {
    const habia = !!navigator.serviceWorker.controller;
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!habia || recargando) return;
      if (document.body.classList.contains('jugando')) return;
      recargando = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      }).catch(() => {});
    });
  }

  /* ================= arranque ================= */

  window.App = { render: () => render(true), aviso, copiar, esc, ui };

  aplicarTema();
  ruta = leerRuta();
  render(false);
  Fotos.cargar().then(() => { if (Fotos.cuantas()) render(true); });
  if (typeof JuegoUI !== 'undefined') JuegoUI.retomar();
})();
