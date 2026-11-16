/* ---------------------------------------------------------------
   FUERZA DE VOLUNTAD — motor. Reglas puras, sin pantalla.

   Toda la partida es un objeto plano (se guarda tal cual) y el azar
   sale de un generador con semilla que viaja adentro: recargar la
   página no cambia nada de lo que iba a pasar.

   Corre igual en el navegador y en Node (pruebas/simular.js).
   --------------------------------------------------------------- */

const Motor = (() => {

  const { CARTAS, MAZO_INICIAL, ENEMIGOS, ENCUENTROS, RELIQUIAS, EVENTOS, DIFICULTADES, PRECIOS, ORO, RAREZA } = JUEGO;
  const MANO_MAX = 10;

  /* ---------- azar con semilla ---------- */

  function rnd(run) {
    run.rng = (run.rng + 0x6D2B79F5) >>> 0;
    let t = run.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ent = (run, a, b) => a + Math.floor(rnd(run) * (b - a + 1));
  const elegir = (run, arr) => arr[Math.floor(rnd(run) * arr.length)];
  function mezclar(run, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(run) * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  const val = (x, m) => (Array.isArray(x) ? x[m ? 1 : 0] : x);
  const costo = (c) => val(CARTAS[c.id].c, c.m);
  const tiene = (run, id) => run.reliquias.includes(id);
  const vivos = k => k.enemigos.filter(e => e.hp > 0);
  const nueva = (run, id, m) => ({ id, m: m ? 1 : 0, uid: ++run.uid });
  const ev = (run, o) => { run.ev.push(o); };

  /* ---------- texto de las cartas ---------- */

  function texto(id, m) {
    const d = CARTAS[id], p = [];
    const n = (x, uno, muchos) => x + ' ' + (x === 1 ? uno : muchos);
    if (d.d && (val(d.d, m) > 0)) {
      const v = d.veces ? 1 : val(d.v || 1, m);
      p.push('Hacé ' + val(d.d, m) + ' de daño' + (v > 1 ? ' ' + v + ' veces' : '') + (d.todos ? ' a todos' : '') + '.');
    }
    if (d.b && val(d.b, m) > 0) p.push('Ganá ' + val(d.b, m) + ' de Calma.');
    if (d.vul) p.push('Aplica ' + val(d.vul, m) + ' de Expuesto' + (d.todos ? ' a todos' : '') + '.');
    if (d.deb) p.push('Aplica ' + val(d.deb, m) + ' de Débil.');
    if (d.fz) p.push('Ganá ' + val(d.fz, m) + ' de Convicción.');
    if (d.des) p.push('Ganá ' + val(d.des, m) + ' de Temple.');
    if (d.ene) p.push('Ganá ' + val(d.ene, m) + ' de energía.');
    if (d.cura) p.push('Recuperá ' + val(d.cura, m) + ' de Voluntad.');
    if (d.tx) p.push(d.tx(m));
    if (d.rob) p.push('Robá ' + n(val(d.rob, m), 'carta', 'cartas') + '.');
    if (d.ag && d.t !== 'estorbo') p.push('Se agota.');
    return p.join(' ');
  }

  const pideObjetivo = id => { const d = CARTAS[id]; return !d.todos && !!(d.d || d.vul || d.deb); };

  /* ---------- partida ---------- */

  function crear(o) {
    const dif = DIFICULTADES[o.dif] || DIFICULTADES[1];
    const run = {
      v: 1, rng: (o.semilla >>> 0) || 1, dif: dif.id, fecha: o.fecha || '', permitidos: o.permitidos || [],
      hp: dif.vol, maxHp: dif.vol, oro: ORO.inicial, uid: 0, mazo: [], reliquias: [],
      paso: 0, fase: 'mapa', combate: null, recompensa: null, evento: null, tienda: null, quitar: null,
      resultado: null, abandono: false, turnos: 0, ev: [], nota: ''
    };
    MAZO_INICIAL.forEach(id => run.mazo.push(nueva(run, id)));
    const eventos = mezclar(run, Object.keys(EVENTOS));
    run.ruta = [
      { t: 'combate', nivel: 1, enc: elegir(run, ENCUENTROS[1]) },
      { t: 'elegir', ops: ['evento', 'tienda'], evento: eventos[0] },
      { t: 'combate', nivel: 2, enc: elegir(run, ENCUENTROS[2]) },
      { t: 'elegir', ops: ['descanso', 'evento'], evento: eventos[1] },
      { t: 'combate', nivel: 3, enc: elegir(run, ENCUENTROS[3]) },
      { t: 'elegir', ops: ['descanso', 'tienda'] },
      { t: 'jefe', nivel: 4, enc: elegir(run, ENCUENTROS.jefe) }
    ];
    darReliquia(run);
    return run;
  }

  function darReliquia(run, id) {
    const libres = Object.keys(RELIQUIAS).filter(r => !run.reliquias.includes(r));
    if (!id) { if (!libres.length) return null; id = elegir(run, libres); }
    run.reliquias.push(id);
    if (id === 'vianda') { run.maxHp += 10; run.hp += 10; }
    return id;
  }

  function cartasAlAzar(run, n, rareza) {
    const ids = Object.keys(CARTAS).filter(id => CARTAS[id].r >= 1);
    const out = [];
    let intentos = 0;
    while (out.length < n && intentos++ < 200) {
      let r = rareza;
      if (!r) { const x = rnd(run) * 100; r = x < RAREZA[1] ? 1 : x < RAREZA[1] + RAREZA[2] ? 2 : 3; }
      const id = elegir(run, ids.filter(i => CARTAS[i].r === r));
      if (!out.some(c => c.id === id)) out.push({ id, m: 0 });
    }
    return out;
  }

  const nodo = run => run.ruta[run.paso];

  function seguir(run) {
    run.paso++;
    run.fase = 'mapa';
    run.evento = run.tienda = run.recompensa = run.quitar = null;
  }

  /* Entra al nodo actual. En los nodos de elección, opcion dice cuál. */
  function avanzar(run, opcion) {
    if (run.fase !== 'mapa') return false;
    const n = nodo(run);
    if (!n) return false;
    if (n.t === 'combate' || n.t === 'jefe') { empezarCombate(run, n.enc); return true; }
    if (!n.ops.includes(opcion)) return false;
    if (opcion === 'evento') { run.evento = { id: n.evento }; run.fase = 'evento'; }
    if (opcion === 'descanso') run.fase = 'descanso';
    if (opcion === 'tienda') {
      run.tienda = {
        cartas: cartasAlAzar(run, 3).map(c => Object.assign(c, { precio: PRECIOS.carta[CARTAS[c.id].r] + ent(run, 0, 8) })),
        reliquia: (() => { const l = Object.keys(RELIQUIAS).filter(r => !run.reliquias.includes(r)); return l.length ? { id: elegir(run, l), precio: PRECIOS.reliquia } : null; })(),
        quitar: PRECIOS.quitar
      };
      run.fase = 'tienda';
    }
    return true;
  }

  /* ---------- combate ---------- */

  function crearEnemigo(run, id, idx) {
    const d = ENEMIGOS[id], dif = DIFICULTADES[run.dif];
    const hp = Math.round(ent(run, d.hp[0], d.hp[1]) * dif.hp);
    return { id, idx, n: d.n, hp, maxHp: hp, calma: 0, est: {}, turnos: 0, mem: {}, mov: null };
  }

  function empezarCombate(run, enc) {
    const k = run.combate = {
      turno: 0, energia: 0, calma: 0, est: {}, pod: {},
      mano: [], robo: mezclar(run, run.mazo.map(c => ({ id: c.id, m: c.m, uid: c.uid }))), descarte: [], agotadas: [],
      ataquesTurno: 0, defensasTurno: 0, zapatillas: tiene(run, 'zapatillas'), ancla: tiene(run, 'ancla'),
      enemigos: [], frescos: {}
    };
    enc.forEach((id, i) => k.enemigos.push(crearEnemigo(run, id, i)));
    if (tiene(run, 'balanza')) k.est.fuerza = 1;
    if (tiene(run, 'tupper')) k.est.destreza = 1;
    if (tiene(run, 'auriculares')) k.enemigos.forEach(e => { e.est.vulnerable = 1; });
    run.fase = 'combate';
    ev(run, { t: 'combate' });
    empezarTurno(run);
  }

  function danio(base, de, a) {
    let d = base + (de.est.fuerza || 0);
    if (de.est.debil) d *= 0.75;
    if (a.est.vulnerable) d *= 1.5;
    return Math.max(0, Math.floor(d));
  }

  function pegarEnemigo(run, e, d) {
    if (e.hp <= 0) return;
    const abs = Math.min(e.calma, d);
    e.calma -= abs;
    e.hp = Math.max(0, e.hp - (d - abs));
    ev(run, { t: 'golpe', a: e.idx, n: d - abs, abs, muere: e.hp === 0 });
  }

  function perderVoluntad(run, n, directo) {
    const k = run.combate;
    let abs = 0;
    if (k && !directo) { abs = Math.min(k.calma, n); k.calma -= abs; }
    const real = n - abs;
    const antes = run.hp;
    run.hp = Math.max(0, run.hp - real);
    ev(run, { t: 'golpe', a: 'yo', n: real, abs });
    if (k && k.ancla && antes > run.maxHp / 2 && run.hp <= run.maxHp / 2 && run.hp > 0) { k.ancla = false; ganarCalma(run, 12, false); }
    if (run.hp <= 0) terminar(run, 'derrota');
  }

  function ganarCalma(run, n, conTemple) {
    const k = run.combate;
    n = Math.max(0, n + (conTemple ? (k.est.destreza || 0) : 0));
    if (!n) return;
    k.calma += n;
    ev(run, { t: 'calma', a: 'yo', n });
    if (k.pod.furia) { const v = vivos(k); if (v.length) pegarEnemigo(run, elegir(run, v), k.pod.furia); }
  }

  function atacar(run, e, base, veces) {
    const k = run.combate;
    for (let i = 0; i < veces; i++) {
      const objetivos = e ? [e] : vivos(k);
      objetivos.forEach(o => {
        if (o.hp <= 0) return;
        let b = base;
        if (k.zapatillas) { b += 8; k.zapatillas = false; }
        if (tiene(run, 'foto') && run.hp <= run.maxHp / 2) b += 3;
        pegarEnemigo(run, o, danio(b, k, o));
      });
    }
  }

  function robar(run, n) {
    const k = run.combate;
    let tope = 30;
    while (n > 0 && tope-- > 0) {
      if (!k.robo.length) {
        if (!k.descarte.length) break;
        k.robo = mezclar(run, k.descarte);
        k.descarte = [];
        ev(run, { t: 'barajar' });
      }
      const c = k.robo.pop();
      if (CARTAS[c.id].t === 'estorbo' && tiene(run, 'cepillo')) { k.agotadas.push(c); continue; }
      n--;
      if (k.mano.length >= MANO_MAX) k.descarte.push(c);
      else { k.mano.push(c); ev(run, { t: 'robo', uid: c.uid }); }
    }
  }

  /* Lo que las cartas con efecto especial pueden hacer. */
  function api(run) {
    const k = run.combate;
    return {
      run, k,
      yo: (estado, n) => { k.est[estado] = (k.est[estado] || 0) + n; },
      calmaDirecta: n => ganarCalma(run, n, false),
      maxVoluntad: n => { run.maxHp += n; run.hp += n; },
      limpiar: () => { delete k.est.vulnerable; delete k.est.debil; },
      agotarEstorbos: () => {
        const fuera = k.mano.filter(c => CARTAS[c.id].t === 'estorbo');
        k.mano = k.mano.filter(c => CARTAS[c.id].t !== 'estorbo');
        fuera.forEach(c => k.agotadas.push(c));
        if (fuera.length) robar(run, fuera.length);
      }
    };
  }

  function resolver(run, c, e, x) {
    const k = run.combate, d = CARTAS[c.id], m = c.m, G = api(run);
    if (d.d) {
      const base = d.dmg ? d.dmg(G, m) : val(d.d, m) + (c.extra || 0);
      const veces = d.veces ? d.veces(G, m, x) : val(d.v || 1, m);
      atacar(run, d.todos ? null : e, base, veces);
    }
    if (d.b) { const b = d.blq ? d.blq(G, m) : val(d.b, m); if (b > 0) ganarCalma(run, b, true); }
    const afectados = d.todos ? vivos(k) : (e && e.hp > 0 ? [e] : []);
    if (d.vul) afectados.forEach(o => { o.est.vulnerable = (o.est.vulnerable || 0) + val(d.vul, m); });
    if (d.deb) afectados.forEach(o => { o.est.debil = (o.est.debil || 0) + val(d.deb, m); });
    if (d.fz) k.est.fuerza = (k.est.fuerza || 0) + val(d.fz, m);
    if (d.des) k.est.destreza = (k.est.destreza || 0) + val(d.des, m);
    if (d.cura) { run.hp = Math.min(run.maxHp, run.hp + val(d.cura, m)); ev(run, { t: 'cura', n: val(d.cura, m) }); }
    if (d.pod) k.pod[d.pod[0]] = (k.pod[d.pod[0]] || 0) + val(d.pod[1], m);
    if (d.fx) d.fx(G, m, c, e);
    if (d.ene) k.energia += val(d.ene, m);
    if (d.rob) robar(run, val(d.rob, m));
  }

  function sePuedeJugar(run, c) {
    const k = run.combate;
    if (!k || run.fase !== 'combate') return false;
    const co = costo(c);
    if (co === null || co === undefined) return false;
    return co === 'X' || co <= k.energia;
  }

  function jugar(run, uid, objetivo) {
    const k = run.combate;
    if (!k || run.fase !== 'combate') return false;
    const i = k.mano.findIndex(c => c.uid === uid);
    if (i < 0) return false;
    const c = k.mano[i], d = CARTAS[c.id];
    if (!sePuedeJugar(run, c)) return false;
    let e = null;
    if (pideObjetivo(c.id)) {
      e = k.enemigos[objetivo];
      if (!e || e.hp <= 0) { const v = vivos(k); if (v.length === 1) e = v[0]; else return false; }
    }
    let co = costo(c), x = 0;
    if (co === 'X') { x = k.energia; co = k.energia; }
    k.energia -= co;
    k.mano.splice(i, 1);
    ev(run, { t: 'carta', id: c.id, uid: c.uid, a: e ? e.idx : null });

    let veces = 1;
    if (d.t === 'ataque' && k.est.doble) { veces = 2; k.est.doble--; }
    for (let r = 0; r < veces && run.fase === 'combate'; r++) resolver(run, c, e, x);

    if (d.t === 'ataque') {
      k.ataquesTurno++;
      if (tiene(run, 'mancuerna') && k.ataquesTurno % 3 === 0) k.est.fuerza = (k.est.fuerza || 0) + 1;
    }
    if (d.t === 'defensa') {
      k.defensasTurno++;
      if (tiene(run, 'abanico') && k.defensasTurno % 3 === 0 && run.fase === 'combate') ganarCalma(run, 4, false);
    }
    if (d.t === 'poder') { /* queda en juego */ }
    else if (d.ag) k.agotadas.push(c);
    else k.descarte.push(c);

    comprobarFin(run);
    return true;
  }

  function empezarTurno(run) {
    const k = run.combate;
    k.turno++; run.turnos++;
    if (k.est.retener) k.est.retener--; else k.calma = 0;
    if (k.est.reserva) { k.calma += k.est.reserva; k.est.reserva = 0; }
    if (k.turno === 1 && tiene(run, 'diario')) k.calma += 8;
    k.ataquesTurno = 0; k.defensasTurno = 0; k.est.doble = 0;
    k.energia = Math.max(0, 3 + (k.pod.ayuno || 0) - (k.est.cansado ? 1 : 0) + (k.turno === 1 && tiene(run, 'alarma') ? 1 : 0));
    k.est.cansado = 0;
    ev(run, { t: 'turno', n: k.turno });
    if (k.pod.ayuno) { perderVoluntad(run, 2 * k.pod.ayuno, true); if (run.fase !== 'combate') return; }
    if (k.pod.disciplina) k.est.fuerza = (k.est.fuerza || 0) + k.pod.disciplina;
    vivos(k).forEach(e => { e.mov = ENEMIGOS[e.id].sig(e, k); });
    robar(run, 5 + (k.pod.hidratacion || 0) + (k.turno === 1 && tiene(run, 'botella') ? 2 : 0));
  }

  function actuar(run, e) {
    const k = run.combate, dif = DIFICULTADES[run.dif];
    const mv = ENEMIGOS[e.id].mov[e.mov];
    if (!mv) return;
    ev(run, { t: 'mov', a: e.idx, n: mv.n });
    if (mv.d) {
      for (let i = 0; i < (mv.v || 1) && run.fase === 'combate'; i++) perderVoluntad(run, danio(Math.round(mv.d * dif.dmg), e, k));
      if (run.fase !== 'combate') return;
    }
    if (mv.b) { e.calma += mv.b; ev(run, { t: 'calma', a: e.idx, n: mv.b }); }
    if (mv.fz) e.est.fuerza = (e.est.fuerza || 0) + mv.fz;
    if (mv.todosFz) vivos(k).forEach(o => { o.est.fuerza = (o.est.fuerza || 0) + mv.todosFz; });
    if (mv.cura) e.hp = Math.min(e.maxHp, e.hp + mv.cura);
    if (mv.vul) { k.est.vulnerable = (k.est.vulnerable || 0) + mv.vul; k.frescos.vulnerable = true; }
    if (mv.deb) { k.est.debil = (k.est.debil || 0) + mv.deb; k.frescos.debil = true; }
    if (mv.cans) k.est.cansado = 1;
    if (mv.carta) {
      for (let i = 0; i < mv.carta[1]; i++) {
        const c = nueva(run, mv.carta[0]);
        if (mv.carta[2] === 'robo') k.robo.splice(ent(run, 0, k.robo.length), 0, c);
        else if (mv.carta[2] === 'mano' && k.mano.length < MANO_MAX) k.mano.push(c);
        else k.descarte.push(c);
      }
      ev(run, { t: 'estorbo', id: mv.carta[0], n: mv.carta[1] });
    }
    if (mv.inv && vivos(k).length < 4) {
      const nuevo = crearEnemigo(run, mv.inv, k.enemigos.length);
      nuevo.recien = true;
      k.enemigos.push(nuevo);
      ev(run, { t: 'invoca', a: nuevo.idx });
    }
  }

  function terminarTurno(run) {
    const k = run.combate;
    if (!k || run.fase !== 'combate') return false;
    if (k.pod.rutina) ganarCalma(run, k.pod.rutina, false);
    if (tiene(run, 'termo') && k.energia > 0) ganarCalma(run, 3 * k.energia, false);
    comprobarFin(run);
    if (run.fase !== 'combate') return true;
    const culpas = k.mano.filter(c => c.id === 'culpa').length;
    if (culpas) { perderVoluntad(run, 2 * culpas, true); if (run.fase !== 'combate') return true; }
    k.descarte.push.apply(k.descarte, k.mano);
    k.mano = [];
    ev(run, { t: 'enemigos' });

    k.frescos = {};
    const turno = k.enemigos.slice();
    for (const e of turno) {
      if (e.hp <= 0) continue;
      e.calma = 0;
      actuar(run, e);
      if (run.fase !== 'combate') return true;
    }
    k.enemigos.forEach(e => {
      if (e.hp <= 0) return;
      if (e.recien) { e.recien = false; return; }
      if (e.est.vulnerable) e.est.vulnerable--;
      if (e.est.debil) e.est.debil--;
      e.turnos++;
    });
    ['vulnerable', 'debil'].forEach(s => { if (k.est[s] && !k.frescos[s]) k.est[s]--; });
    comprobarFin(run);
    if (run.fase === 'combate') empezarTurno(run);
    return true;
  }

  function comprobarFin(run) {
    const k = run.combate;
    if (!k || run.fase !== 'combate' || vivos(k).length) return;
    const n = nodo(run);
    run.combate = null;
    if (n.t === 'jefe') { terminar(run, 'victoria'); return; }
    const oro = ent(run, ORO.combate[n.nivel][0], ORO.combate[n.nivel][1]);
    run.oro += oro;
    if (tiene(run, 'lista')) run.hp = Math.min(run.maxHp, run.hp + 6);
    run.recompensa = { oro, cartas: cartasAlAzar(run, 3), reliquia: n.nivel === 3 ? darReliquia(run) : null };
    run.fase = 'recompensa';
    ev(run, { t: 'ganado' });
  }

  function terminar(run, resultado) {
    run.fase = 'fin';
    run.resultado = resultado;
    run.combate = resultado === 'victoria' ? null : run.combate;
    ev(run, { t: 'fin', r: resultado });
  }

  function abandonar(run) {
    if (run.fase === 'fin') return false;
    run.abandono = true;
    terminar(run, 'derrota');
    return true;
  }

  /* Lo que el enemigo va a hacer: para mostrarlo arriba de su cabeza. */
  function intencion(run, e) {
    const k = run.combate, mv = ENEMIGOS[e.id].mov[e.mov];
    if (!mv) return null;
    return {
      n: mv.n, i: mv.i, v: mv.v || 1, b: mv.b || 0,
      d: mv.d ? danio(Math.round(mv.d * DIFICULTADES[run.dif].dmg), e, k) : 0
    };
  }

  function amenaza(run) {
    const k = run.combate;
    return vivos(k).reduce((a, e) => { const it = intencion(run, e); return a + (it ? it.d * it.v : 0); }, 0);
  }

  /* ---------- entre combates ---------- */

  function elegirRecompensa(run, i) {
    if (run.fase !== 'recompensa') return false;
    const c = run.recompensa.cartas[i];
    if (c) run.mazo.push(nueva(run, c.id, c.m));
    seguir(run);
    return true;
  }

  const mejorables = run => run.mazo.filter(c => !c.m && CARTAS[c.id].t !== 'estorbo');

  function recorrido(run) {
    const notas = [];
    return {
      notas,
      azar: () => rnd(run),
      perder: n => { run.hp = Math.max(1, run.hp - n); notas.push('−' + n + ' de Voluntad'); },
      curar: n => { const a = run.hp; run.hp = Math.min(run.maxHp, run.hp + n); notas.push('+' + (run.hp - a) + ' de Voluntad'); },
      maxVoluntad: n => { run.maxHp += n; run.hp += n; notas.push('+' + n + ' de Voluntad máxima'); },
      oro: n => { run.oro += n; notas.push('+' + n + ' de oro'); },
      sumar: id => { run.mazo.push(nueva(run, id)); notas.push('Sumaste ' + CARTAS[id].n); },
      reliquia: () => { const id = darReliquia(run); if (id) notas.push('Reliquia: ' + RELIQUIAS[id].n); },
      mejorarAzar: n => {
        for (let i = 0; i < n; i++) {
          const l = mejorables(run);
          if (!l.length) break;
          const c = elegir(run, l); c.m = 1;
          notas.push('Mejoraste ' + CARTAS[c.id].n);
        }
      },
      ofrecer: r => { run.recompensa = { oro: 0, cartas: cartasAlAzar(run, 3, r), reliquia: null }; run.fase = 'recompensa'; },
      quitar: () => { run.quitar = { vuelve: 'mapa' }; run.fase = 'quitar'; }
    };
  }

  function eventoOpcion(run, i) {
    if (run.fase !== 'evento') return false;
    const op = EVENTOS[run.evento.id].ops[i];
    if (!op) return false;
    const R = recorrido(run);
    op.fx(R);
    run.nota = R.notas.join(' · ');
    if (run.fase === 'evento') seguir(run);
    return true;
  }

  function quitarCarta(run, uid) {
    if (run.fase !== 'quitar') return false;
    const i = run.mazo.findIndex(c => c.uid === uid);
    if (i < 0) return false;
    run.nota = 'Sacaste ' + CARTAS[run.mazo[i].id].n;
    run.mazo.splice(i, 1);
    if (run.quitar.vuelve === 'tienda') { run.quitar = null; run.fase = 'tienda'; }
    else seguir(run);
    return true;
  }

  function comprar(run, tipo, i) {
    const t = run.tienda;
    if (run.fase !== 'tienda' || !t) return false;
    if (tipo === 'carta') {
      const c = t.cartas[i];
      if (!c || c.vendida || run.oro < c.precio) return false;
      run.oro -= c.precio; c.vendida = true; run.mazo.push(nueva(run, c.id, c.m));
      return true;
    }
    if (tipo === 'reliquia') {
      if (!t.reliquia || t.reliquia.vendida || run.oro < t.reliquia.precio) return false;
      run.oro -= t.reliquia.precio; t.reliquia.vendida = true; darReliquia(run, t.reliquia.id);
      return true;
    }
    if (tipo === 'quitar') {
      if (!t.quitar || run.oro < t.quitar) return false;
      run.oro -= t.quitar; t.quitar = 0;
      run.quitar = { vuelve: 'tienda' }; run.fase = 'quitar';
      return true;
    }
    return false;
  }

  function salirTienda(run) {
    if (run.fase !== 'tienda') return false;
    seguir(run);
    return true;
  }

  function descansar(run, que, uid) {
    if (run.fase !== 'descanso') return false;
    if (que === 'curar') {
      const a = run.hp;
      run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3));
      run.nota = '+' + (run.hp - a) + ' de Voluntad';
    } else {
      const c = run.mazo.find(x => x.uid === uid);
      if (!c || c.m || CARTAS[c.id].t === 'estorbo') return false;
      c.m = 1;
      run.nota = 'Mejoraste ' + CARTAS[c.id].n;
    }
    seguir(run);
    return true;
  }

  /* ---------- dificultad ---------- */

  /* peso: suma de los pesos de los permitidos elegidos (pizza = 2,
     pizza + postre = 3). historial: resultados anteriores, del más
     viejo al más nuevo ('victoria' | 'derrota'). */
  function dificultadPara(peso, historial) {
    let d = peso <= 1 ? 0 : peso === 2 ? 1 : peso === 3 ? 2 : 3;
    const h = (historial || []).slice(-3);
    const ult = h.slice(-2);
    let ajuste = 0;
    if (ult.includes('victoria')) ajuste = 1;
    else if (ult.length === 2 && ult.every(r => r === 'derrota')) ajuste = h.length === 3 && h[0] === 'derrota' ? -2 : -1;
    return { base: d, ajuste, dif: Math.max(0, Math.min(3, d + ajuste)) };
  }

  return {
    crear, avanzar, jugar, terminarTurno, abandonar, sePuedeJugar, pideObjetivo, intencion, amenaza,
    elegirRecompensa, eventoOpcion, quitarCarta, comprar, salirTienda, descansar, mejorables,
    dificultadPara, texto, costo, val, vivos, nodo, danio
  };
})();
