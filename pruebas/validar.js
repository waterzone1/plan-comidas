/* Valida el catálogo:  node pruebas/validar.js  [-v]

   - nada prohibido (zanahoria, picante, cilantro, romero, especias fuertes)
   - cada plato con sus referencias bien y al menos una combinación válida
   - macros de cada combinación dentro de ±15% del objetivo, en los tres modos
   - todo lo que se compra tiene sección
   - las 26 recetas de la app vieja siguen estando
   Sale con código 1 si algo falla. */

const { app } = require('./cargar');
const A = app();
const { N, INGREDIENTES: I, SALSAS, SECCIONES, PLATOS, PROTEINAS, ESTILOS, ANTOJOS, EQUIPOS, TRIOS, PERMITIDOS, PROHIBIDOS } = A;

const verboso = process.argv.includes('-v');
const errores = [];
const avisos = [];
const err = m => errores.push(m);

/* ---------- 1. prohibidos ---------- */
const letras = 'a-záéíóúüñ';
const reProhibido = new RegExp('(^|[^' + letras + '])(' + PROHIBIDOS.join('|') + ')(es|s)?($|[^' + letras + '])', 'i');
function revisarTexto(donde, obj) {
  JSON.stringify(obj, (k, v) => {
    if (typeof v === 'string' && reProhibido.test(v)) err('PROHIBIDO en ' + donde + ': "' + v + '"');
    return v;
  });
  Object.keys(obj).forEach(k => { if (reProhibido.test(k.replace(/_/g, ' '))) err('PROHIBIDO en ' + donde + ': clave "' + k + '"'); });
}
revisarTexto('ingredientes', I);
revisarTexto('salsas', SALSAS);
revisarTexto('platos', PLATOS);
revisarTexto('tríos', TRIOS);
PERMITIDOS.forEach(p => revisarTexto('permitidos (versión dentro del plan)', p.plan));

/* ---------- 2. referencias ---------- */
const secciones = new Set(SECCIONES.map(s => s.id));
Object.keys(I).forEach(id => {
  const x = I[id];
  if (!secciones.has(x.sec)) err('Ingrediente sin sección de compra: ' + id);
  if (!x.n) err('Ingrediente sin nombre: ' + id);
  if (x.t !== 'alac' && (typeof x.kcal !== 'number' || typeof x.p !== 'number')) err('Ingrediente sin nutrientes: ' + id);
  if ((x.t === 'prot' || x.t === 'carbo') && !(x.lim && x.lim[0] < x.lim[1])) err('Ingrediente sin límites: ' + id);
  if (x.t === 'verd' && !x.po) err('Verdura sin porción: ' + id);
});
Object.keys(SALSAS).forEach(id => {
  const s = SALSAS[id];
  s.comp.forEach(c => { if (!I[c]) err('Salsa ' + id + ': componente desconocido ' + c); });
  if (typeof s.kcal !== 'number' || typeof s.g !== 'number') err('Salsa sin nutrientes: ' + id);
});

const grupos = new Set(PROTEINAS.map(p => p.id));
const estilos = new Set(ESTILOS.map(e => e.id));
const antojos = new Set(ANTOJOS.map(a => a.id));
const ids = new Set();
const tipo = (id, t) => I[id] && I[id].t === t;

N.platos.forEach(d => {
  const w = m => err('Plato ' + d.id + ': ' + m);
  if (ids.has(d.id)) w('id repetido');
  ids.add(d.id);
  if (!grupos.has(d.g)) w('grupo desconocido ' + d.g);
  if (!estilos.has(d.e)) w('estilo desconocido ' + d.e);
  if (!I[d.ing] || !I[d.ing].lim) w('proteína desconocida o sin límites: ' + d.ing);
  if (!d.c.length) w('sin carbohidratos');
  d.c.forEach(c => { if (!tipo(c, 'carbo')) w('carbohidrato desconocido ' + c); });
  d.v.concat(d.vf).forEach(v => { if (!tipo(v, 'verd')) w('verdura desconocida ' + v); });
  d.vd.forEach(v => { if (!d.v.includes(v)) w('verdura por defecto que no es compatible: ' + v); });
  d.vf.forEach(v => { if (d.v.includes(v)) w('verdura fija repetida en compatibles: ' + v); });
  if (new Set(d.v).size !== d.v.length) w('verduras repetidas');
  if (!d.s.length) w('sin salsas');
  d.s.forEach(s => { if (!SALSAS[s]) w('salsa desconocida ' + s); });
  d.fijos.forEach(f => { if (!I[f.i] || !(f.g > 0)) w('ingrediente fijo mal: ' + f.i); });
  d.tags.forEach(t => { if (!antojos.has(t)) w('antojo desconocido ' + t); });
  d.eq.forEach(e => { if (!EQUIPOS[e]) w('equipo desconocido ' + e); });
  if (!(d.min > 0)) w('sin tiempo');
  if (d.vaj !== 'poca' && d.vaj !== 'media') w('vajilla mal');
  if (!d.il) w('sin ilustración');
  if (!N.valida(N.comboBase(d))) w('la combinación por defecto no es válida');
  if (d.vd.length + d.vf.length < 1) w('sin verdura por defecto');
});

/* ---------- 3. nombres ---------- */
const nombres = new Map();
N.platos.forEach(d => {
  d.c.forEach(c => d.s.forEach(s => {
    const k = N.comboDe(d, c, null, s);
    const n = N.nombre(k);
    if (/[{}]|  | con con | y y |,,| ,/.test(n) || n.trim() !== n) err('Nombre mal armado (' + d.id + '): "' + n + '"');
    if (reProhibido.test(n)) err('PROHIBIDO en nombre generado: "' + n + '"');
    const previo = nombres.get(n);
    if (previo && previo !== d.id) err('Dos platos generan el mismo nombre: "' + n + '" (' + previo + ' y ' + d.id + ')');
    nombres.set(n, d.id);
  }));
});

/* ---------- 4. macros ---------- */
const TOL = 0.15;
let combos = 0, fuera = 0;
const peores = [];
N.platos.forEach(d => {
  d.c.forEach(c => d.s.forEach(s => {
    const variantes = [d.vd].concat(d.v.map(v => [v]));
    if (d.v.length >= 3) variantes.push(d.v.slice().sort((a, b) => I[b].kcal * I[b].po - I[a].kcal * I[a].po).slice(0, 3 - d.vf.length));
    variantes.forEach(v => {
      const k = { p: d, c, v: v.slice(0, 3 - d.vf.length), s };
      if (!N.valida(k)) return;
      Object.keys(N.MODOS).forEach(m => {
        const por = N.porciones(k, m);
        const dk = por.kcal / por.kcalObjetivo - 1, dp = por.p / por.pObjetivo - 1;
        combos++;
        if (Math.abs(dk) > TOL || Math.abs(dp) > TOL) {
          fuera++;
          peores.push({ e: Math.max(Math.abs(dk), Math.abs(dp)), t: d.id + ' [' + c + ' / ' + s + ' / ' + (k.v.join('+') || '-') + '] ' + m + ': ' + Math.round(por.kcal) + ' kcal (' + pct(dk) + '), ' + Math.round(por.p) + ' g prot (' + pct(dp) + ')' });
        }
      });
    });
  }));
});
function pct(x) { return (x >= 0 ? '+' : '') + Math.round(x * 100) + '%'; }
if (fuera) {
  peores.sort((a, b) => b.e - a.e);
  const porPlato = {};
  peores.forEach(x => { const id = x.t.split(' ')[0] + ' ' + x.t.split('] ')[1].split(':')[0]; (porPlato[id] = porPlato[id] || []).push(x.t); });
  console.log('\nFuera de rango, por plato y modo:');
  Object.keys(porPlato).sort().forEach(id => console.log('  ' + String(porPlato[id].length).padStart(4) + '  ' + porPlato[id][0]));
  err(fuera + ' de ' + combos + ' combinaciones fuera de ±15%:\n   ' + peores.slice(0, verboso ? 400 : 25).map(x => x.t).join('\n   '));
}

/* ---------- 5. recetas de la app vieja ---------- */
const migradas = new Set(PLATOS.map(d => d.v1).filter(Boolean));
for (let i = 1; i <= 26; i++) if (!migradas.has(i)) err('Falta migrar el plato ' + i + ' de la app vieja');

/* ---------- 6. tamaño y cobertura ---------- */
if (PLATOS.length < 80 || PLATOS.length > 120) err('El catálogo tiene ' + PLATOS.length + ' platos (tiene que haber entre 80 y 120)');
PROTEINAS.forEach(p => { if (!N.platos.some(d => d.g === p.id)) err('Grupo sin platos: ' + p.id); });
ESTILOS.forEach(e => { if (!N.platos.some(d => d.e === e.id)) err('Estilo sin platos: ' + e.id); });
ANTOJOS.forEach(a => { if (N.buscar({ tags: [a.id] }).length < 4) err('Antojo con menos de 4 platos: ' + a.id); });

/* ---------- 7. permitidos ---------- */
PERMITIDOS.forEach(p => {
  if (!(p.kcal > 0) || !(p.peso > 0)) err('Permitido mal: ' + p.id);
  if (p.plan.plato) {
    const d = N.porId[p.plan.plato];
    if (!d) err('Permitido ' + p.id + ': plato del plan desconocido ' + p.plan.plato);
    else {
      if (p.plan.c && !d.c.includes(p.plan.c)) err('Permitido ' + p.id + ': carbohidrato incompatible');
      if (p.plan.s && !d.s.includes(p.plan.s)) err('Permitido ' + p.id + ': salsa incompatible');
    }
  } else if (!p.plan.texto) err('Permitido ' + p.id + ': sin versión dentro del plan');
});

/* ---------- 8. plato del día ---------- */
let previo = [];
const f0 = new Date('2026-11-16T12:00:00');
for (let i = 0; i < 60; i++) {
  const f = new Date(f0); f.setDate(f0.getDate() + i);
  const hoy = N.platoDelDia(N.ymd(f), {});
  const idsHoy = hoy.map(k => k.p.id);
  if (hoy.length !== 3 || new Set(idsHoy).size !== 3) err('Plato del día: no son 3 distintos el ' + N.ymd(f));
  if (idsHoy.some(x => previo.includes(x))) err('Plato del día: repite un plato de ayer el ' + N.ymd(f));
  if (hoy.some(k => !N.valida(k))) err('Plato del día: combinación inválida el ' + N.ymd(f));
  const otra = N.platoDelDia(N.ymd(f), {}).map(k => N.clave(k)).join();
  if (otra !== hoy.map(k => N.clave(k)).join()) err('Plato del día: no es determinista');
  previo = idsHoy;
}

/* ---------- 9. listas y receta ---------- */
N.platos.forEach(d => {
  const k = N.comboBase(d);
  const filas = N.comprasDeCombo(k, 'mantener');
  filas.forEach(x => { if (!secciones.has(x.sec)) err('Compra sin sección: ' + x.id + ' (' + d.id + ')'); });
  if (!N.porSeccion(filas).length && !N.deAlacena(filas).length) err('Lista de compras vacía: ' + d.id);
  const pr = N.promptReceta(k, 'bajar');
  if (!/zanahoria/.test(pr) || !/50 g de proteína/.test(pr)) err('Pedido de receta incompleto: ' + d.id);
});

/* ---------- informe ---------- */
const cuenta = f => N.buscar(f).length;
const linea = (a, b) => console.log('  ' + String(a).padEnd(34) + b);
console.log('\nCatálogo: ' + PLATOS.length + ' platos base, ' + combos + ' combinaciones×modo revisadas\n');
PROTEINAS.forEach(p => linea(p.n, N.platos.filter(d => d.g === p.id).length));
console.log('');
ESTILOS.forEach(e => linea(e.n, N.platos.filter(d => d.e === e.id).length));
console.log('');
linea('Express (≤15 min, 1 recipiente)', cuenta({ express: true }));
linea('Los de siempre', N.platos.filter(d => d.top).length);
linea('Vianda', cuenta({ via: true }));
linea('Sin descongelar', cuenta({ sd: true }));
linea('Sin cocinar / frío', cuenta({ frio: true }));
linea('≤ 10 min', cuenta({ t: 10 }));
linea('≤ 20 min', cuenta({ t: 20 }));
linea('≤ 30 min', cuenta({ t: 30 }));
linea('Air fryer', cuenta({ eq: ['airfryer'] }));
linea('Horno', cuenta({ eq: ['horno'] }));
linea('Microondas', cuenta({ eq: ['microondas'] }));
ANTOJOS.forEach(a => linea('Antojo: ' + a.n, cuenta({ tags: [a.id] })));

if (verboso) {
  console.log('\nNombres por defecto y macros (bajar / mantener / subir):');
  N.platos.forEach(d => {
    const k = N.comboBase(d);
    const ms = Object.keys(N.MODOS).map(m => { const r = N.redondeados(N.porciones(k, m)); return r.kcal + '/' + r.p; }).join('  ');
    console.log('  ' + N.nombre(k).padEnd(84) + N.tiempo(k) + "'  " + ms);
  });
}

avisos.forEach(a => console.log('AVISO: ' + a));
if (errores.length) {
  console.log('\n✗ ' + errores.length + ' problema(s):\n');
  errores.forEach(e => console.log(' - ' + e));
  process.exit(1);
}
console.log('\n✓ Catálogo válido');
