/* ---------------------------------------------------------------
   FUERZA DE VOLUNTAD — pantalla. Dibuja la partida, anima lo que
   pasó y la guarda después de cada acción (clave "v2:juego"), así
   que cerrar o recargar no sirve para volver atrás.

   Un intento por día. Ganar desbloquea los permitidos elegidos.
   --------------------------------------------------------------- */

const JuegoUI = (() => {

  const CLAVE = 'v2:juego';
  const { CARTAS, ENEMIGOS, RELIQUIAS, EVENTOS, DIFICULTADES } = JUEGO;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const raiz = () => document.getElementById('juego');
  const $ = s => raiz().querySelector(s);

  let D = null, run = null, sel = null, ocupado = false, alCerrar = null, panel = null, repartir = false, eligiendo = null;

  /* ================= guardado ================= */

  const hoy = () => N.ymd(new Date());
  function leer() {
    if (D) return D;
    try { D = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { D = {}; }
    D.historial = D.historial || [];
    return D;
  }
  function guardar() {
    const d = leer();
    d.run = run && run.fase !== 'fin' ? Object.assign({}, run, { ev: [] }) : null;
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* modo privado */ }
  }
  function dias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }

  function estado() {
    const d = leer(), f = hoy();
    let cambio = false;
    if (d.run && d.run.fecha !== f) {
      d.historial.push({ fecha: d.run.fecha, res: 'derrota', dif: d.run.dif, permitidos: d.run.permitidos, abandono: true });
      d.run = null; run = null; cambio = true;
    }
    if (d.desbloqueo && dias(d.desbloqueo.fecha, f) > 7) { d.desbloqueo = null; cambio = true; }
    if (cambio) try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* nada */ }
    const deHoy = d.historial.filter(h => h.fecha === f);
    return {
      enCurso: !!d.run,
      jugoHoy: deHoy.length > 0,
      ultimo: deHoy[deHoy.length - 1] || null,
      desbloqueado: d.desbloqueo ? d.desbloqueo.ids : null,
      historial: d.historial
    };
  }

  function dificultad(ids) {
    const peso = ids.reduce((a, id) => a + ((PERMITIDOS.find(p => p.id === id) || {}).peso || 0), 0);
    return Motor.dificultadPara(peso, leer().historial.map(h => h.res));
  }

  const nombrePermitidos = ids => N.unir(ids.map(id => (PERMITIDOS.find(p => p.id === id) || { n: id }).n.toLowerCase()));

  /* El cartel que va arriba de la lista de permitidos. */
  function cartel(seleccion) {
    const e = estado();
    const caja = (clase, cuerpo) => '<div class="cartel ' + clase + '">' + cuerpo + '</div>';
    if (e.desbloqueado) {
      return caja('ganado', '<h3>🔓 Te lo ganaste</h3><p>Hoy podés comer <b>' + esc(nombrePermitidos(e.desbloqueado)) + '</b>. Disfrutalo sin culpa.</p>' +
        '<button class="boton chico" data-a="comido">Ya lo comí</button>');
    }
    if (e.enCurso) {
      return caja('', '<h3>⚔️ Tenés una expedición en curso</h3><p>Sigue donde la dejaste: no hay vuelta atrás.</p>' +
        '<button class="boton primario" data-a="jugar">Continuar</button>');
    }
    if (e.jugoHoy) {
      const u = e.ultimo;
      return caja('', '<h3>' + (u.res === 'victoria' ? '✅ Hoy ya ganaste tu permitido' : '🔒 Hoy no se pudo') + '</h3><p>' +
        (u.res === 'victoria' ? 'Mañana hay otro intento.' : 'Perdiste la expedición de hoy' + (u.abandono ? ' (abandonar cuenta como derrota)' : '') + '. Mañana hay otro intento.') + '</p>');
    }
    if (!seleccion.length) {
      return caja('', '<h3>🔒 Fuerza de voluntad</h3><p>Elegí hasta dos permitidos y ganá una expedición de cartas para desbloquearlos. Son unos 10 a 15 minutos y hay <b>un solo intento por día</b>.</p>');
    }
    const df = dificultad(seleccion), dif = DIFICULTADES[df.dif];
    const porque = df.ajuste > 0 ? ' · subió porque ganaste hace poco' : df.ajuste < 0 ? ' · bajó porque venís perdiendo' : '';
    return caja('', '<h3>⚔️ Jugar por ' + esc(nombrePermitidos(seleccion)) + '</h3>' +
      '<p>Dificultad <b>' + dif.n + '</b>' + porque + '. Un solo intento por día; abandonar cuenta como derrota.</p>' +
      '<button class="boton primario" data-a="jugar">Empezar la expedición</button>');
  }

  /* ================= sonido ================= */

  let actx = null;
  const conSonido = () => Estado.get().sonido !== false;
  function tono(tipo, f0, f1, dur, vol, cuando) {
    if (!actx) return;
    const t = actx.currentTime + (cuando || 0);
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function ruido(dur, vol) {
    if (!actx) return;
    const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(actx.destination);
    s.start();
  }
  function sfx(nombre) {
    if (!conSonido()) return;
    try {
      if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
      if (nombre === 'carta') tono('triangle', 620, 880, 0.07, 0.05);
      else if (nombre === 'golpe') { ruido(0.12, 0.22); tono('sine', 150, 55, 0.16, 0.25); }
      else if (nombre === 'herida') { ruido(0.18, 0.3); tono('sawtooth', 110, 45, 0.24, 0.16); }
      else if (nombre === 'calma') tono('sine', 480, 720, 0.14, 0.09);
      else if (nombre === 'tapa') tono('square', 300, 220, 0.06, 0.04);
      else if (nombre === 'turno') tono('sine', 392, 523, 0.18, 0.06);
      else if (nombre === 'mejora') { tono('triangle', 523, 0, 0.12, 0.07); tono('triangle', 659, 0, 0.12, 0.07, 0.09); tono('triangle', 784, 0, 0.2, 0.07, 0.18); }
      else if (nombre === 'victoria') [523, 659, 784, 1047].forEach((f, i) => tono('triangle', f, 0, 0.3, 0.09, i * 0.13));
      else if (nombre === 'derrota') [330, 262, 196, 147].forEach((f, i) => tono('sawtooth', f, 0, 0.36, 0.06, i * 0.17));
    } catch (e) { /* sin audio */ }
  }

  /* ================= dibujos ================= */

  const ICONO = {
    ataque: '<svg viewBox="0 0 24 24"><path d="M4 20l3-1 11-11V4h-4L3 15l1 5zm2-2l-1-1" fill="currentColor"/><path d="M14 4l6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    defensa: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.600-2-8-6-8-11V5z" fill="currentColor"/></svg>',
    habilidad: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>',
    poder: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.300 6.900.800-5.100 4.700 1.400 6.800L12 17.200 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z" fill="currentColor"/></svg>',
    estorbo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.500"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="2.500"/></svg>'
  };
  const TIPO = { ataque: 'Ataque', defensa: 'Defensa', habilidad: 'Habilidad', poder: 'Poder', estorbo: 'Estorbo' };

  function poligono(lados, r, giro) {
    const p = [];
    for (let i = 0; i < lados; i++) {
      const a = (giro + i * 360 / lados - 90) * Math.PI / 180;
      p.push((60 + r * Math.cos(a)).toFixed(1) + ',' + (60 + r * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  }
  function arte(id) {
    const a = ENEMIGOS[id].arte, jefe = ENEMIGOS[id].jefe;
    const capas = [[52, 0, 0.1, 1.5], [40, a.g, 0.18, 2], [27, a.g * 2, 0.3, 2.500], [13, a.g * 3, 0.9, 0]];
    return '<svg viewBox="0 0 120 120" class="j-arte" aria-hidden="true">' +
      (jefe ? '<circle cx="60" cy="60" r="57" fill="none" stroke="' + a.c + '" stroke-opacity=".35" stroke-width="1.500" stroke-dasharray="3 5"/>' : '') +
      capas.map(c => '<polygon points="' + poligono(a.l, c[0], c[1]) + '" fill="' + a.c + '" fill-opacity="' + c[2] + '" stroke="' + a.c + '" stroke-width="' + c[3] + '" stroke-linejoin="round"/>').join('') +
      '<circle cx="60" cy="60" r="4.500" fill="#0b0d12"/></svg>';
  }

  function resumen(c) {
    const d = CARTAS[c.id], m = c.m, p = [];
    if (d.d && Motor.val(d.d, m) > 0) { const v = d.veces ? 1 : Motor.val(d.v || 1, m); p.push('<b class="r-d">' + (Motor.val(d.d, m) + (c.extra || 0)) + (v > 1 ? '×' + v : '') + '</b>'); }
    if (d.b && Motor.val(d.b, m) > 0) p.push('<b class="r-b">' + Motor.val(d.b, m) + '</b>');
    return p.join('');
  }

  function cartaHTML(c, o) {
    o = o || {};
    const d = CARTAS[c.id], co = Motor.costo(c);
    const clases = ['jc', 't-' + d.t, c.m ? 'mej' : '', o.grande ? 'grande' : '', o.clase || ''].join(' ');
    return '<button class="' + clases + '"' + (o.attr || '') + (o.estilo ? ' style="' + o.estilo + '"' : '') + '>' +
      (co === null || co === undefined ? '' : '<span class="jc-costo">' + co + '</span>') +
      '<span class="jc-nombre">' + esc(d.n) + (c.m ? '+' : '') + '</span>' +
      '<span class="jc-icono">' + ICONO[d.t] + '</span>' +
      (o.grande ? '<span class="jc-texto">' + esc(Motor.texto(c.id, c.m)) + '</span>' : '<span class="jc-res">' + resumen(c) + '</span>') +
      '<span class="jc-tipo">' + TIPO[d.t] + '</span>' + (o.pie || '') + '</button>';
  }

  const ESTADOS = {
    fuerza: ['Convicción', 'bueno'], destreza: ['Temple', 'bueno'], vulnerable: ['Expuesto', 'malo'], debil: ['Débil', 'malo'],
    cansado: ['Cansado', 'malo'], reserva: ['Calma guardada', 'bueno'], retener: ['Calma firme', 'bueno'], doble: ['Doble ataque', 'bueno']
  };
  const PODERES = { rutina: 'Rutina', furia: 'Furia serena', hidratacion: 'Hidratación', disciplina: 'Disciplina', ayuno: 'Hambre controlada' };
  function chips(est, propio) {
    return Object.keys(est).filter(k => est[k] > 0 && ESTADOS[k]).map(k => {
      const malo = ESTADOS[k][1] === 'malo';
      return '<span class="j-chip ' + ((malo === !!propio) ? 'malo' : 'bueno') + '">' + ESTADOS[k][0] + ' ' + est[k] + '</span>';
    }).join('');
  }

  /* ================= pantallas ================= */

  function barra() {
    return '<div class="j-top"><div class="j-vida"><span class="j-vida-t">Voluntad</span><div class="j-bar"><i id="j-bar-yo" style="width:' + Math.max(0, run.hp / run.maxHp * 100) + '%"></i></div>' +
      '<b id="j-hp-yo">' + run.hp + '</b><span class="j-max">/ ' + run.maxHp + '</span></div>' +
      '<span class="j-oro">◈ ' + run.oro + '</span>' +
      '<button class="j-btn-top" data-j="menu" aria-label="Menú">☰</button></div>' +
      '<div class="j-reliquias">' + run.reliquias.map(r => '<button class="j-rel" data-j="reliquia" data-id="' + r + '">' + RELIQUIAS[r].ic + '</button>').join('') +
      '<button class="j-mazo" data-j="mazo">Mazo ' + run.mazo.length + '</button></div>';
  }

  const NODO_IC = { combate: '⚔️', elegir: '◆', jefe: '☠️' };
  function vMapa() {
    const n = Motor.nodo(run);
    const camino = '<div class="j-camino">' + run.ruta.map((x, i) =>
      '<span class="j-nodo' + (i < run.paso ? ' hecho' : i === run.paso ? ' actual' : '') + (x.t === 'jefe' ? ' jefe' : '') + '">' + NODO_IC[x.t] + '</span>').join('<i></i>') + '</div>';
    let cuerpo = '';
    if (n.t === 'elegir') {
      const OPC = {
        evento: ['❓', 'Algo pasa', 'Un imprevisto con dos salidas.'],
        tienda: ['◈', 'Tienda', 'Comprar cartas, una reliquia o sacar una carta. Tenés ' + run.oro + ' de oro.'],
        descanso: ['☾', 'Descanso', 'Recuperar el 30% de la Voluntad o mejorar una carta.']
      };
      cuerpo = '<h2>¿Por dónde seguís?</h2><div class="j-opciones">' + n.ops.map(o =>
        '<button class="j-opcion" data-j="ir" data-op="' + o + '"><span class="j-opcion-ic">' + OPC[o][0] + '</span><b>' + OPC[o][1] + '</b><span>' + OPC[o][2] + '</span></button>').join('') + '</div>';
    } else {
      const jefe = n.t === 'jefe';
      cuerpo = '<h2>' + (jefe ? 'El jefe' : 'Combate ' + n.nivel + ' de 3') + '</h2><div class="j-previa">' +
        n.enc.map(id => '<div class="j-previa-e' + (jefe ? ' jefe' : '') + '">' + arte(id) + '<b>' + esc(ENEMIGOS[id].n) + '</b></div>').join('') + '</div>' +
        '<button class="j-boton" data-j="ir">' + (jefe ? 'Enfrentar al jefe' : 'Entrar al combate') + '</button>';
    }
    const jefeFinal = run.ruta[6].enc[0];
    return barra() + '<div class="j-centro">' + camino +
      (run.nota ? '<p class="j-nota">' + esc(run.nota) + '</p>' : '') + cuerpo +
      (n.t !== 'jefe' ? '<p class="j-pista">Al final espera <b>' + esc(ENEMIGOS[jefeFinal].n) + '</b>.</p>' : '') + '</div>';
  }

  function intencionHTML(e) {
    const it = Motor.intencion(run, e);
    if (!it) return '';
    const ic = it.i.indexOf('ataque') === 0 ? ICONO.ataque : it.i === 'defensa' ? ICONO.defensa : it.i === 'mejora' ? ICONO.poder : ICONO.habilidad;
    const num = it.d ? '<b>' + it.d + (it.v > 1 ? '×' + it.v : '') + '</b>' : '';
    return '<div class="j-int i-' + it.i.replace('+', ' i-') + '" id="j-int-' + e.idx + '">' + ic + num + '<span>' + esc(it.n) + '</span></div>';
  }

  function vCombate() {
    const k = run.combate;
    const cs = sel ? k.mano.find(c => c.uid === sel) : null;
    const pide = cs && Motor.pideObjetivo(cs.id) && Motor.vivos(k).length > 1;
    const enemigos = k.enemigos.map(e => {
      if (e.hp <= 0) return '';
      const jefe = ENEMIGOS[e.id].jefe;
      return '<button class="j-ene' + (jefe ? ' jefe' : '') + (pide ? ' apuntable' : '') + '" data-j="enemigo" data-idx="' + e.idx + '" id="j-e-' + e.idx + '">' +
        intencionHTML(e) + arte(e.id) + '<span class="j-ene-n">' + esc(e.n) + '</span>' +
        '<span class="j-bar"><i id="j-bar-e' + e.idx + '" style="width:' + (e.hp / e.maxHp * 100) + '%"></i></span>' +
        '<span class="j-ene-hp"><b id="j-hp-e' + e.idx + '">' + e.hp + '</b> / ' + e.maxHp + (e.calma ? ' <span class="j-escudo" id="j-cal-e' + e.idx + '">' + e.calma + '</span>' : '') + '</span>' +
        '<span class="j-chips">' + chips(e.est, false) + '</span></button>';
    }).join('');
    const n = k.mano.length;
    const mano = k.mano.map((c, i) => {
      const puede = Motor.sePuedeJugar(run, c);
      return cartaHTML(c, {
        clase: (c.uid === sel ? 'sel ' : '') + (puede ? '' : 'no ') + (repartir ? 'entra' : ''),
        attr: ' data-j="carta" data-uid="' + c.uid + '"',
        estilo: (repartir ? 'animation-delay:' + (i * 55) + 'ms;' : '') + (i > 0 && n > 1 ? 'margin-left:min(4px,calc((100% - ' + n + ' * var(--cw))/' + (n - 1) + '))' : '')
      });
    }).join('');
    const pod = Object.keys(k.pod).map(p => '<span class="j-chip poder">' + PODERES[p] + (k.pod[p] > 1 ? ' ' + k.pod[p] : '') + '</span>').join('');
    const detalle = cs
      ? '<b>' + esc(CARTAS[cs.id].n) + (cs.m ? '+' : '') + '</b> ' + esc(Motor.texto(cs.id, cs.m)) +
        '<em>' + (!Motor.sePuedeJugar(run, cs) ? (Motor.costo(cs) === null ? 'No se puede jugar.' : 'No alcanza la energía.') : pide ? 'Tocá un enemigo.' : 'Tocala de nuevo para jugarla.') + '</em>'
      : '<span class="j-ayuda">Tocá una carta para leerla. Arriba de cada enemigo está lo que va a hacer.</span>';
    const amenaza = Motor.amenaza(run);
    return barra() +
      '<div class="j-enemigos n' + Motor.vivos(k).length + '" data-j="fondo">' + enemigos + '</div>' +
      '<div class="j-yo" id="j-yo"><span class="j-escudo grande' + (k.calma ? '' : ' vacio') + '" id="j-cal-yo">' + k.calma + '</span>' +
        '<span class="j-chips">' + chips(k.est, true) + pod + '</span>' +
        (amenaza ? '<span class="j-amenaza' + (amenaza > k.calma ? ' pasa' : '') + '">Vienen ' + amenaza + '</span>' : '') + '</div>' +
      '<div class="j-detalle" data-j="fondo">' + detalle + '</div>' +
      '<div class="j-mano" id="j-mano">' + mano + '</div>' +
      '<div class="j-pie"><span class="j-energia" id="j-energia"><b>' + k.energia + '</b></span>' +
        '<span class="j-pilas">Robo ' + k.robo.length + ' · Descarte ' + k.descarte.length + '</span>' +
        '<button class="j-boton fin" data-j="fin-turno">Terminar turno</button></div>';
  }

  function vRecompensa() {
    const r = run.recompensa;
    return barra() + '<div class="j-centro"><h2>' + (r.oro ? 'Combate ganado' : 'Elegí una carta') + '</h2>' +
      (r.oro ? '<p class="j-nota">+' + r.oro + ' de oro' + (r.reliquia ? ' · Reliquia: ' + RELIQUIAS[r.reliquia].ic + ' ' + esc(RELIQUIAS[r.reliquia].n) : '') + '</p>' : '') +
      (r.reliquia ? '<p class="j-pista">' + esc(RELIQUIAS[r.reliquia].tx) + '</p>' : '') +
      '<p class="j-pista">Sumá una carta a tu mazo, o seguí sin ninguna.</p>' +
      '<div class="j-grilla">' + r.cartas.map((c, i) => cartaHTML(c, { grande: 1, attr: ' data-j="premio" data-i="' + i + '"' })).join('') + '</div>' +
      '<button class="j-boton sec" data-j="premio" data-i="-1">Seguir sin carta</button></div>';
  }

  function vEvento() {
    const e = EVENTOS[run.evento.id];
    return barra() + '<div class="j-centro"><h2>' + esc(e.n) + '</h2><p class="j-relato">' + esc(e.tx) + '</p><div class="j-opciones col">' +
      e.ops.map((o, i) => '<button class="j-opcion" data-j="evento" data-i="' + i + '"><b>' + esc(o.t) + '</b><span>' + esc(o.d) + '</span></button>').join('') + '</div></div>';
  }

  function vTienda() {
    const t = run.tienda;
    return barra() + '<div class="j-centro"><h2>Tienda</h2><p class="j-pista">Tenés <b>◈ ' + run.oro + '</b>.</p><div class="j-grilla">' +
      t.cartas.map((c, i) => cartaHTML(c, {
        grande: 1, clase: c.vendida ? 'vendida' : run.oro < c.precio ? 'cara' : '',
        attr: ' data-j="comprar" data-tipo="carta" data-i="' + i + '"', pie: '<span class="jc-precio">' + (c.vendida ? 'Comprada' : '◈ ' + c.precio) + '</span>'
      })).join('') + '</div><div class="j-opciones col">' +
      (t.reliquia ? '<button class="j-opcion' + (t.reliquia.vendida || run.oro < t.reliquia.precio ? ' apagada' : '') + '" data-j="comprar" data-tipo="reliquia"><b>' + RELIQUIAS[t.reliquia.id].ic + ' ' + esc(RELIQUIAS[t.reliquia.id].n) +
        ' <em>' + (t.reliquia.vendida ? 'Comprada' : '◈ ' + t.reliquia.precio) + '</em></b><span>' + esc(RELIQUIAS[t.reliquia.id].tx) + '</span></button>' : '') +
      '<button class="j-opcion' + (!t.quitar || run.oro < t.quitar ? ' apagada' : '') + '" data-j="comprar" data-tipo="quitar"><b>Sacar una carta del mazo <em>' + (t.quitar ? '◈ ' + t.quitar : 'Hecho') + '</em></b><span>Un mazo más chico roba mejor.</span></button>' +
      '</div><button class="j-boton" data-j="salir-tienda">Seguir camino</button></div>';
  }

  function vDescanso() {
    if (eligiendo === 'mejorar') return vElegirCarta('Mejorar una carta', Motor.mejorables(run), 'mejorar', true);
    const cura = Math.min(run.maxHp - run.hp, Math.round(run.maxHp * 0.3));
    return barra() + '<div class="j-centro"><h2>Descanso</h2><p class="j-relato">Un rato de calma antes de seguir.</p><div class="j-opciones col">' +
      '<button class="j-opcion" data-j="descansar"><b>☾ Dormir</b><span>Recuperás ' + cura + ' de Voluntad.</span></button>' +
      '<button class="j-opcion' + (Motor.mejorables(run).length ? '' : ' apagada') + '" data-j="elegir-mejora"><b>✦ Practicar</b><span>Mejorás una carta para siempre.</span></button></div></div>';
  }

  function vElegirCarta(titulo, cartas, accion, mejora) {
    return barra() + '<div class="j-centro"><h2>' + titulo + '</h2>' +
      (eligiendo ? '<button class="j-boton sec" data-j="volver">Volver</button>' : '') +
      '<div class="j-grilla">' + cartas.map(c => cartaHTML(mejora ? { id: c.id, m: 1, uid: c.uid } : c, { grande: 1, attr: ' data-j="' + accion + '" data-uid="' + c.uid + '"' })).join('') + '</div></div>';
  }

  function vFin() {
    const gano = run.resultado === 'victoria';
    return '<div class="j-centro fin ' + (gano ? 'gano' : 'perdio') + '"><div class="j-fin-arte">' + arte(run.ruta[6].enc[0]) + '</div>' +
      '<h2>' + (gano ? 'Te lo ganaste' : run.abandono ? 'Abandonaste' : 'Esta vez no') + '</h2>' +
      '<p class="j-relato">' + (gano
        ? 'Hoy podés comer <b>' + esc(nombrePermitidos(run.permitidos)) + '</b>. Sin culpa: fue una decisión, no un impulso.'
        : 'Hoy no hay permitido. Mañana hay otro intento, y si venís perdiendo la dificultad baja.') + '</p>' +
      '<p class="j-pista">' + run.turnos + ' turnos · dificultad ' + DIFICULTADES[run.dif].n + '</p>' +
      '<button class="j-boton" data-j="cerrar">' + (gano ? 'Ir a buscarlo' : 'Volver a la app') + '</button></div>';
  }

  function vPanel() {
    if (!panel) return '';
    let c = '';
    if (panel === 'menu') {
      c = '<h2>Pausa</h2><div class="j-opciones col">' +
        '<button class="j-opcion" data-j="sonido"><b>' + (conSonido() ? '🔊 Sonido activado' : '🔇 Sonido apagado') + '</b><span>Tocá para cambiarlo.</span></button>' +
        '<button class="j-opcion" data-j="salir"><b>Salir y seguir después</b><span>La partida queda guardada tal cual está. Vale por hoy.</span></button>' +
        '<button class="j-opcion peligro" data-j="abandonar"><b>Abandonar</b><span>Cuenta como derrota: hoy no hay permitido.</span></button></div>';
    } else if (panel === 'mazo') {
      const lista = run.mazo.slice().sort((a, b) => CARTAS[a.id].t.localeCompare(CARTAS[b.id].t) || CARTAS[a.id].n.localeCompare(CARTAS[b.id].n));
      c = '<h2>Tu mazo · ' + run.mazo.length + '</h2><div class="j-grilla">' + lista.map(x => cartaHTML(x, { grande: 1 })).join('') + '</div>';
    } else if (panel.reliquia) {
      const r = RELIQUIAS[panel.reliquia];
      c = '<h2>' + r.ic + ' ' + esc(r.n) + '</h2><p class="j-relato">' + esc(r.tx) + '</p>';
    }
    return '<div class="j-panel"><div class="j-panel-in">' + c + '<button class="j-boton sec" data-j="cerrar-panel">Cerrar</button></div></div>';
  }

  function render() {
    if (!run) return;
    const f = run.fase;
    const html = f === 'mapa' ? vMapa() : f === 'combate' ? vCombate() : f === 'recompensa' ? vRecompensa() : f === 'evento' ? vEvento()
      : f === 'tienda' ? vTienda() : f === 'descanso' ? vDescanso() : f === 'quitar' ? vElegirCarta('Sacar una carta del mazo', run.mazo, 'quitar', false) : vFin();
    raiz().innerHTML = '<div class="j-marco f-' + f + '">' + html + '</div>' + vPanel();
    repartir = false;
  }

  /* ================= animación de lo que pasó ================= */

  function flotante(sobre, txt, clase) {
    const el = typeof sobre === 'string' ? $(sobre) : sobre;
    if (!el) return;
    const r = el.getBoundingClientRect(), base = raiz().getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'j-flota ' + (clase || '');
    f.textContent = txt;
    f.style.left = (r.left - base.left + r.width / 2 + (Math.random() * 30 - 15)) + 'px';
    f.style.top = (r.top - base.top + r.height * 0.35) + 'px';
    raiz().appendChild(f);
    setTimeout(() => f.remove(), 900);
  }
  function sacudir(el, clase) {
    if (!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
  }

  function animar(evs, vis, fin) {
    let i = 0, enemigo = false;
    const paso = () => {
      if (i >= evs.length) { fin(); return; }
      const e = evs[i++];
      let espera = 0;
      if (e.t === 'carta') { sfx('carta'); espera = 70; }
      else if (e.t === 'enemigos') { enemigo = true; espera = 260; }
      else if (e.t === 'mov') { sacudir($('#j-e-' + e.a), 'actua'); const it = $('#j-int-' + e.a); if (it) it.classList.add('ahora'); espera = 330; }
      else if (e.t === 'golpe') {
        if (e.a === 'yo') {
          vis.hp -= e.n;
          const t = $('#j-hp-yo'), b = $('#j-bar-yo');
          if (t) t.textContent = Math.max(0, vis.hp);
          if (b) b.style.width = Math.max(0, vis.hp / run.maxHp * 100) + '%';
          if (e.n > 0) { flotante('#j-yo', '−' + e.n, 'danio'); sacudir($('.j-marco'), 'tiembla'); sfx('herida'); }
          else if (e.abs) { flotante('#j-yo', 'Bloqueado', 'calma'); sfx('tapa'); }
          if (e.abs) { const c = $('#j-cal-yo'); if (c) c.textContent = Math.max(0, (+c.textContent || 0) - e.abs); }
          espera = 230;
        } else {
          const el = $('#j-e-' + e.a);
          vis.e[e.a] = (vis.e[e.a] || 0) - e.n;
          const t = $('#j-hp-e' + e.a), b = $('#j-bar-e' + e.a), en = run.combate && run.combate.enemigos[e.a];
          if (t) t.textContent = Math.max(0, vis.e[e.a]);
          if (b && vis.max[e.a]) b.style.width = Math.max(0, vis.e[e.a] / vis.max[e.a] * 100) + '%';
          flotante(el, e.n > 0 ? '−' + e.n : 'Bloqueado', e.n > 0 ? 'danio' : 'calma');
          sacudir(el, 'golpeado');
          sfx(e.n > 0 ? 'golpe' : 'tapa');
          if (e.muere && el) el.classList.add('muerto');
          void en;
          espera = enemigo ? 200 : 130;
        }
      }
      else if (e.t === 'calma') { flotante(e.a === 'yo' ? '#j-yo' : '#j-e-' + e.a, '+' + e.n, 'calma'); sfx('calma'); espera = 110; }
      else if (e.t === 'cura') { flotante('#j-yo', '+' + e.n, 'cura'); sfx('mejora'); espera = 150; }
      else if (e.t === 'estorbo') { flotante('#j-yo', '+' + e.n + ' ' + CARTAS[e.id].n, 'malo'); espera = 240; }
      else if (e.t === 'turno') { repartir = true; if (e.n > 1) sfx('turno'); espera = 120; }
      else if (e.t === 'ganado') { sfx('mejora'); espera = 420; }
      else if (e.t === 'fin') { sfx(e.r); espera = 520; }
      if (espera) setTimeout(paso, espera); else paso();
    };
    paso();
  }

  function accion(fn) {
    if (ocupado || !run) return;
    const k = run.combate;
    const vis = { hp: run.hp, e: {}, max: {} };
    if (k) k.enemigos.forEach(e => { vis.e[e.idx] = e.hp; vis.max[e.idx] = e.maxHp; });
    run.ev.length = 0;
    const antes = run.fase;
    const ok = fn();
    if (ok === false) return;
    const evs = run.ev.splice(0);
    const termino = run.fase === 'fin' && antes !== 'fin';
    if (termino) cerrarPartida();
    guardar();
    ocupado = true;
    raiz().classList.add('ocupado');
    animar(evs, vis, () => { ocupado = false; raiz().classList.remove('ocupado'); sel = null; render(); });
  }

  function cerrarPartida() {
    const d = leer();
    d.historial.push({ fecha: run.fecha, res: run.resultado, dif: run.dif, permitidos: run.permitidos, abandono: !!run.abandono, turnos: run.turnos });
    if (d.historial.length > 60) d.historial = d.historial.slice(-60);
    if (run.resultado === 'victoria') d.desbloqueo = { fecha: hoy(), ids: run.permitidos.slice() };
  }

  /* ================= eventos de pantalla ================= */

  function jugarSeleccion(idx) {
    const uid = sel;
    accion(() => {
      if (!Motor.jugar(run, uid, idx)) { App.aviso('No se puede jugar ahora'); return false; }
      return true;
    });
  }

  const ACC = {
    'ir': el => accion(() => Motor.avanzar(run, el.dataset.op)),
    'carta': el => {
      const uid = +el.dataset.uid, k = run.combate;
      if (!k) return;
      const c = k.mano.find(x => x.uid === uid);
      if (!c) return;
      if (sel === uid && Motor.sePuedeJugar(run, c)) {
        if (Motor.pideObjetivo(c.id) && Motor.vivos(k).length > 1) { App.aviso('Tocá un enemigo'); return; }
        jugarSeleccion(undefined);
        return;
      }
      sel = uid; sfx('tapa'); render();
    },
    'enemigo': el => {
      const k = run.combate;
      if (!k || !sel) return;
      const c = k.mano.find(x => x.uid === sel);
      if (c && Motor.sePuedeJugar(run, c) && Motor.pideObjetivo(c.id)) jugarSeleccion(+el.dataset.idx);
    },
    'fondo': (el, ev) => { if (sel && ev.target === el) { sel = null; render(); } },
    'fin-turno': () => { sel = null; accion(() => Motor.terminarTurno(run)); },
    'premio': el => accion(() => Motor.elegirRecompensa(run, +el.dataset.i < 0 ? null : +el.dataset.i)),
    'evento': el => accion(() => Motor.eventoOpcion(run, +el.dataset.i)),
    'comprar': el => accion(() => {
      if (!Motor.comprar(run, el.dataset.tipo, +el.dataset.i)) { App.aviso('No alcanza el oro'); return false; }
      sfx('mejora'); return true;
    }),
    'salir-tienda': () => accion(() => Motor.salirTienda(run)),
    'descansar': () => accion(() => Motor.descansar(run, 'curar')),
    'elegir-mejora': () => { if (Motor.mejorables(run).length) { eligiendo = 'mejorar'; render(); } },
    'volver': () => { eligiendo = null; render(); },
    'mejorar': el => { eligiendo = null; accion(() => Motor.descansar(run, 'mejorar', +el.dataset.uid)); sfx('mejora'); },
    'quitar': el => accion(() => Motor.quitarCarta(run, +el.dataset.uid)),
    'menu': () => { panel = 'menu'; render(); },
    'mazo': () => { panel = 'mazo'; render(); },
    'reliquia': el => { panel = { reliquia: el.dataset.id }; render(); },
    'cerrar-panel': () => { panel = null; render(); },
    'sonido': () => { Estado.cambiar(e => { e.sonido = !conSonido(); }); sfx('calma'); render(); },
    'salir': () => { panel = null; cerrar(); },
    'abandonar': () => {
      if (!confirm('¿Abandonar la expedición? Cuenta como derrota y hoy no hay otro intento.')) return;
      panel = null;
      accion(() => Motor.abandonar(run));
    },
    'cerrar': () => cerrar()
  };

  function alTocar(ev) {
    const el = ev.target.closest('[data-j]');
    if (!el || !run) return;
    if (ocupado && !['menu', 'cerrar-panel'].includes(el.dataset.j)) return;
    const fn = ACC[el.dataset.j];
    if (fn) fn(el, ev);
  }

  /* ================= abrir y cerrar ================= */

  function mostrar() {
    const r = raiz();
    if (!r.dataset.listo) { r.addEventListener('click', alTocar); r.dataset.listo = '1'; }
    r.classList.remove('oculto');
    document.body.classList.add('jugando');
    sel = null; panel = null; eligiendo = null; ocupado = false;
    r.classList.remove('ocupado');
    render();
  }

  function cerrar() {
    raiz().classList.add('oculto');
    raiz().innerHTML = '';
    document.body.classList.remove('jugando');
    if (run && run.fase === 'fin') run = null;
    const fn = alCerrar; alCerrar = null;
    if (fn) fn();
  }

  function abrir(seleccion, cb) {
    const e = estado(), d = leer();
    alCerrar = cb || null;
    if (e.enCurso) { run = d.run; run.ev = []; mostrar(); return; }
    if (e.desbloqueado) { App.aviso('Ya tenés un permitido ganado'); return; }
    if (e.jugoHoy) { App.aviso('Hoy ya jugaste: mañana hay otro intento'); return; }
    if (!seleccion || !seleccion.length) { App.aviso('Elegí al menos un permitido'); return; }
    const semilla = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    run = Motor.crear({ semilla, dif: dificultad(seleccion).dif, fecha: hoy(), permitidos: seleccion.slice(0, 2) });
    guardar();
    sfx('turno');
    mostrar();
  }

  function consumir() {
    const d = leer();
    d.desbloqueo = null;
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* nada */ }
  }

  /* Al abrir la app no se fuerza nada: el cartel de Permitidos avisa. */
  function retomar() { estado(); }

  return { estado, cartel, abrir, consumir, retomar, dificultad };
})();
