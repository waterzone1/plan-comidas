/* Simulador de balance del juego:  node pruebas/simular.js [partidas] [-v]

   Juega expediciones completas sin pantalla con una IA simple (cubre
   el daño que viene, pega con lo que sobra, elige cartas por una tabla
   de puntajes) y dice cuánto gana en cada dificultad, dónde pierde y
   cuánto dura. Sirve para ajustar los números de juego/datos.js.

   La IA juega peor que una persona atenta: no planifica el turno, no
   cuenta el mazo y no arma sinergias. Por eso el objetivo es que gane
   algo menos que el 30–40% buscado para un jugador atento. */

const { cargar } = require('./cargar');
const { Motor, JUEGO } = cargar(['juego/datos.js', 'juego/motor.js'], ['Motor', 'JUEGO']);
const { CARTAS, RELIQUIAS, DIFICULTADES } = JUEGO;

const PUNTAJE = {
  doble: 6, caminar: 7, tema: 6, realidad: 6, alacena: 5, reflejo: 6, constancia: 6, circuito: 7, timon: 3, todo: 5,
  heladera: 7, racha: 5, quiebre: 6, contodo: 6,
  plato: 6, dientes: 7, diez: 5, saciedad: 6, gondola: 6, muralla: 6, capas: 5, blindaje: 3, hierro: 8,
  mate: 6, exponer: 7, avisar: 6, aire: 6, ordenar: 3, dormir: 6, foco: 6, reencuadre: 5, semana: 7,
  motivacion: 8, postura: 8, rutina: 8, furia: 6, hidratacion: 8, disciplina: 7, ayuno: 6
};
const val = Motor.val;

function danioCarta(run, c, e) {
  const k = run.combate, d = CARTAS[c.id];
  if (!d.d) return 0;
  const G = { k, run };
  const base = d.dmg ? d.dmg(G, c.m) : val(d.d, c.m) + (c.extra || 0);
  const veces = d.veces ? d.veces(G, c.m, k.energia) : val(d.v || 1, c.m);
  const objetivos = d.todos ? Motor.vivos(k) : [e];
  return objetivos.reduce((a, o) => a + Math.min(o.hp + o.calma, Motor.danio(base, k, o) * veces), 0);
}

function calmaCarta(run, c) {
  const k = run.combate, d = CARTAS[c.id];
  if (!d.b) return 0;
  const b = d.blq ? d.blq({ k, run }, c.m) : val(d.b, c.m);
  return b > 0 ? b + (k.est.destreza || 0) : (c.id === 'blindaje' ? k.calma : 0);
}

const costoReal = (run, c) => { const co = Motor.costo(c); return co === 'X' ? run.combate.energia : co; };

function mejorObjetivo(run, c) {
  const k = run.combate, v = Motor.vivos(k);
  let mejor = v[0], puntos = -1;
  v.forEach(e => {
    const d = danioCarta(run, c, e);
    const it = Motor.intencion(run, e);
    const mata = d >= e.hp + e.calma;
    const p = (mata ? 1000 : 0) + (it ? it.d * it.v : 0) * 2 + d - e.hp * 0.05;
    if (p > puntos) { puntos = p; mejor = e; }
  });
  return mejor;
}

function turno(run) {
  let tope = 60;
  while (run.fase === 'combate' && tope-- > 0) {
    const k = run.combate;
    const mano = k.mano.filter(c => Motor.sePuedeJugar(run, c));
    if (!mano.length) break;
    const falta = Motor.amenaza(run) - k.calma;
    const ataques = mano.filter(c => CARTAS[c.id].d);
    const vidaTotal = Motor.vivos(k).reduce((a, e) => a + e.hp + e.calma, 0);

    let jugada = null;

    /* gratis y que dan cartas o energía: primero */
    jugada = mano.find(c => costoReal(run, c) === 0 && (CARTAS[c.id].rob || CARTAS[c.id].ene)) ||
      mano.find(c => ['mate', 'semana', 'aire'].includes(c.id) && k.energia >= 2) ||
      mano.find(c => c.id === 'ordenar' && k.mano.some(x => CARTAS[x.id].t === 'estorbo'));

    /* poderes temprano, si no nos están por matar */
    if (!jugada && (k.turno <= 3 || falta <= 0) && falta < run.hp * 0.5) jugada = mano.find(c => CARTAS[c.id].t === 'poder');

    /* si alcanza para terminar el combate, todo al ataque */
    const alcanza = ataques.reduce((a, c) => a + danioCarta(run, c, mejorObjetivo(run, c)), 0) >= vidaTotal;

    if (!jugada && falta > 0 && !alcanza) {
      const defensas = mano.filter(c => calmaCarta(run, c) > 0)
        .sort((a, b) => calmaCarta(run, b) / Math.max(1, costoReal(run, b)) - calmaCarta(run, a) / Math.max(1, costoReal(run, a)));
      if (defensas.length) jugada = defensas[0];
      else if (run.hp < run.maxHp * 0.7) jugada = mano.find(c => c.id === 'dormir');
    }

    if (!jugada && ataques.length) {
      const foco = mano.find(c => c.id === 'foco');
      if (foco && ataques.some(a => costoReal(run, a) <= k.energia - costoReal(run, foco))) jugada = foco;
      else {
        jugada = ataques.slice().sort((a, b) =>
          danioCarta(run, b, mejorObjetivo(run, b)) / Math.max(0.6, costoReal(run, b)) -
          danioCarta(run, a, mejorObjetivo(run, a)) / Math.max(0.6, costoReal(run, a)))[0];
      }
    }

    if (!jugada) jugada = mano.find(c => ['exponer', 'avisar'].includes(c.id)) ||
      mano.find(c => calmaCarta(run, c) > 0) ||
      mano.find(c => c.id === 'dormir' && run.hp < run.maxHp - 6) ||
      mano.find(c => c.id === 'excusa') ||
      mano.find(c => CARTAS[c.id].t === 'poder');
    if (!jugada) break;

    const e = Motor.pideObjetivo(jugada.id) ? mejorObjetivo(run, jugada) : null;
    if (!Motor.jugar(run, jugada.uid, e ? e.idx : undefined)) break;
  }
  if (run.fase === 'combate') Motor.terminarTurno(run);
}

function quitarAlgo(run) {
  const orden = ['antojo', 'culpa', 'excusa', 'no', 'respirar'];
  for (const id of orden) {
    const c = run.mazo.find(x => x.id === id && !x.m) || run.mazo.find(x => x.id === id);
    if (c) return Motor.quitarCarta(run, c.uid);
  }
  return Motor.quitarCarta(run, run.mazo[0].uid);
}

function mejorarAlgo(run) {
  const l = Motor.mejorables(run).sort((a, b) => (PUNTAJE[b.id] || 4) - (PUNTAJE[a.id] || 4));
  return l.length ? Motor.descansar(run, 'mejorar', l[0].uid) : Motor.descansar(run, 'curar');
}

function partida(semilla, dif) {
  const run = Motor.crear({ semilla, dif });
  let tope = 4000;
  while (run.fase !== 'fin' && tope-- > 0) {
    run.ev.length = 0;
    const vida = run.hp / run.maxHp;
    if (run.fase === 'mapa') {
      const n = Motor.nodo(run);
      if (n.t !== 'elegir') Motor.avanzar(run);
      else if (n.ops.includes('tienda') && n.ops.includes('evento')) Motor.avanzar(run, run.oro >= 75 ? 'tienda' : 'evento');
      else if (n.ops.includes('descanso') && n.ops.includes('evento')) Motor.avanzar(run, vida < 0.6 ? 'descanso' : 'evento');
      else Motor.avanzar(run, vida < 0.8 || run.oro < 100 ? 'descanso' : 'tienda');
    } else if (run.fase === 'combate') {
      turno(run);
    } else if (run.fase === 'recompensa') {
      let mejor = -1, p = 0;
      run.recompensa.cartas.forEach((c, i) => { if ((PUNTAJE[c.id] || 0) > p) { p = PUNTAJE[c.id]; mejor = i; } });
      Motor.elegirRecompensa(run, (run.mazo.length >= 18 && p < 7) || p < 5 ? null : mejor);
    } else if (run.fase === 'evento') {
      const id = run.evento.id;
      const op = id === 'oficina' ? (vida > 0.5 ? 1 : 0)
        : id === 'gimnasio' ? (vida > 0.6 ? 0 : 1)
        : id === 'super' ? 0
        : id === 'insomnio' ? (vida > 0.6 ? 0 : 1)
        : id === 'amigo' ? 0
        : (vida > 0.5 ? 0 : 1);
      Motor.eventoOpcion(run, op);
    } else if (run.fase === 'quitar') {
      quitarAlgo(run);
    } else if (run.fase === 'tienda') {
      const t = run.tienda;
      if (t.reliquia && !t.reliquia.vendida && run.oro >= t.reliquia.precio) Motor.comprar(run, 'reliquia');
      t.cartas.forEach((c, i) => { if (!c.vendida && (PUNTAJE[c.id] || 0) >= 7 && run.oro >= c.precio) Motor.comprar(run, 'carta', i); });
      if (t.quitar && run.oro >= t.quitar && Motor.comprar(run, 'quitar')) continue;
      Motor.salirTienda(run);
    } else if (run.fase === 'descanso') {
      if (vida < 0.6) Motor.descansar(run, 'curar'); else mejorarAlgo(run);
    }
  }
  return run;
}

const N = parseInt(process.argv[2], 10) || 1500;
const verboso = process.argv.includes('-v');

console.log('\nFuerza de voluntad — ' + N + ' partidas por dificultad, IA simple\n');
console.log('  dificultad   gana    turnos   muere en (c1 / c2 / c3 / jefe)        voluntad al ganar');
const porJefe = {}, porReliquia = {}, porEncuentro = {};
DIFICULTADES.forEach(dif => {
  let gana = 0, turnos = 0, vidaFinal = 0;
  const muere = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    const run = partida(1000 + i * 7919 + dif.id * 31, dif.id);
    const ok = run.resultado === 'victoria';
    turnos += run.turnos;
    if (ok) { gana++; vidaFinal += run.hp; }
    else muere[Math.min(3, Math.floor(run.paso / 2))]++;
    if (dif.id === 1) {
      const jefe = run.ruta[6].enc[0];
      (porJefe[jefe] = porJefe[jefe] || [0, 0])[ok ? 0 : 1]++;
      const r = run.reliquias[0];
      (porReliquia[r] = porReliquia[r] || [0, 0])[ok ? 0 : 1]++;
      if (!ok && run.paso < 6) { const e = run.ruta[run.paso].enc.join('+'); porEncuentro[e] = (porEncuentro[e] || 0) + 1; }
    }
  }
  const pc = x => (x / N * 100).toFixed(1).padStart(5) + '%';
  console.log('  ' + dif.n.padEnd(11) + pc(gana) + '   ' + (turnos / N).toFixed(1).padStart(5) + '    ' +
    muere.map(m => pc(m)).join(' ') + '      ' + (gana ? (vidaFinal / gana).toFixed(0) : '-'));
});

const tasa = o => Object.keys(o).sort((a, b) => o[b][0] / (o[b][0] + o[b][1]) - o[a][0] / (o[a][0] + o[a][1]))
  .map(k => '    ' + k.padEnd(14) + (o[k][0] / (o[k][0] + o[k][1]) * 100).toFixed(0).padStart(3) + '%  (' + (o[k][0] + o[k][1]) + ')').join('\n');
console.log('\n  En normal, según el jefe que toca:\n' + tasa(porJefe));
if (verboso) {
  console.log('\n  En normal, según la reliquia inicial:\n' + tasa(porReliquia));
  console.log('\n  En normal, derrotas antes del jefe por encuentro:');
  Object.keys(porEncuentro).sort((a, b) => porEncuentro[b] - porEncuentro[a]).forEach(k => console.log('    ' + k.padEnd(28) + porEncuentro[k]));
}
console.log('\n  Un turno lleva unos 20–25 segundos a una persona: ' +
  'multiplicá los turnos por eso para estimar la duración.\n');
