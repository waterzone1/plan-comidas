/* Verifica las reglas del plan. Correr con:  node pruebas/reglas.js
   No hace falta navegador: carga los mismos archivos que la app. */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const raiz = path.join(__dirname, '..');
const archivos = ['datos/catalogo.js', 'datos/porciones.js', 'datos/ritmo.js', 'datos/compras.js',
                  'js/util.js', 'js/estado.js', 'js/generador.js', 'js/inventario.js'];

const store = {};
const ctx = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  console, Math, Date, JSON, Object, Array, Set, Number, String, Boolean, isNaN, parseInt
};
vm.createContext(ctx);
archivos.forEach(f => vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f }));

const api = vm.runInContext('({Generador, Estado, U, Inventario, PLATOS, GUARNICIONES, RITMO, BASES,' +
                            ' VERDURAS, PORCION, PROTEINAS, ARRANQUE, COMPRA_HOJAS, COMPRA_SEMANAL, FECHAS_ALACENA})', ctx);
const { Generador, Estado, U, Inventario, RITMO, BASES, VERDURAS, ARRANQUE, COMPRA_HOJAS } = api;

const HOJAS = {};
COMPRA_HOJAS.forEach(h => { HOJAS[h.clave] = (HOJAS[h.clave] || 0) + h.cant; });
const presupuesto = v => (VERDURAS[v].compra || 0) + (HOJAS[v] || 0);

let fallos = 0, chequeos = 0;
function ok(cond, msg, extra) {
  chequeos++;
  if (!cond) { fallos++; console.log('  FALLA: ' + msg + (extra ? '  ' + extra : '')); }
}

function verificarSemana(inicio, etiqueta, opciones) {
  const o = opciones || {};
  const plan = Generador.planSemana(inicio);
  const s = plan.slots;
  const comidas = o.comidas || 14;
  ok(s.length === comidas, etiqueta + ': ' + comidas + ' comidas', s.length);

  // nada antes del arranque
  s.forEach(x => ok(U.ymd(x.fecha) >= ARRANQUE, etiqueta + ': comida anterior al arranque', U.ymd(x.fecha)));

  // ritmo de proteínas intacto
  RITMO.filter(r => s.some(x => x.dia === r.dia)).forEach(r => {
    const a = s.find(x => x.dia === r.dia && x.comida === 'almuerzo');
    const c = s.find(x => x.dia === r.dia && x.comida === 'cena');
    ok(a.plato.grupo === r.almuerzo, etiqueta + ': ritmo almuerzo día ' + r.dia, a.plato.grupo + ' != ' + r.almuerzo);
    ok(c.plato.grupo === r.cena, etiqueta + ': ritmo cena día ' + r.dia, c.plato.grupo + ' != ' + r.cena);
  });

  // sin repetir platos ni guarniciones
  ok(new Set(s.map(x => x.plato.id)).size === s.length, etiqueta + ': platos sin repetir');
  ok(new Set(s.map(x => x.guarnicion.id)).size === s.length, etiqueta + ': guarniciones sin repetir');

  // vianda del lunes
  const lunes = s.find(x => x.dia === 2 && x.comida === 'almuerzo');
  if (lunes) ok(lunes.plato.tags.indexOf('vianda') >= 0, etiqueta + ': lunes almuerzo es vianda', lunes.plato.nombre);

  // alacena y desde-congelado, nunca al principio
  s.forEach(x => {
    if (x.plato.tags.indexOf('alacena') >= 0 || x.plato.tags.indexOf('desde-congelado') >= 0) {
      ok(x.dia >= 4, etiqueta + ': ' + x.plato.nombre + ' cae tarde', 'día ' + x.dia);
    }
  });

  // ventana de cada guarnición: ni antes de comprarla ni después de que se pase
  s.forEach(x => {
    const v = Generador.ventana(x.guarnicion, { corrimiento: plan.primerDia });
    ok(x.dia >= v.desde, etiqueta + ': ' + x.guarnicion.nombre + ' antes de tenerla', 'día ' + x.dia + ' < ' + v.desde);
    ok(x.dia < v.hasta, etiqueta + ': ' + x.guarnicion.nombre + ' ya vencida', 'día ' + x.dia + ' >= ' + v.hasta);
  });

  // freezer al final. Las de puro congelado van a los últimos días; las que
  // además llevan fresco perecedero mandan por su vida útil.
  s.filter(x => x.guarnicion.tags.indexOf('freezer') >= 0).forEach(x => {
    const minimo = x.guarnicion.vida >= 8 ? 4 : 1;
    ok(x.dia >= minimo, etiqueta + ': guarnición de freezer temprano',
       x.guarnicion.nombre + ' (vida ' + x.guarnicion.vida + ') día ' + x.dia);
  });

  // no repetir en la guarnición una verdura que el plato ya nombra
  s.forEach(x => {
    const choque = x.guarnicion.verduras.filter(v => x.plato.menciona.indexOf(v) >= 0);
    ok(choque.length === 0, etiqueta + ': ' + x.plato.nombre + ' repite ' + choque.join(','));
  });

  // base distinta en almuerzo y cena del mismo día, y siempre una que el plato acepte
  RITMO.filter(r => s.some(x => x.dia === r.dia)).forEach(r => {
    const a = s.find(x => x.dia === r.dia && x.comida === 'almuerzo');
    const c = s.find(x => x.dia === r.dia && x.comida === 'cena');
    ok(a.base !== c.base, etiqueta + ': bases distintas día ' + r.dia, a.base);
    ok(a.plato.bases.indexOf(a.base) >= 0, etiqueta + ': base válida ' + a.plato.nombre + '/' + a.base);
    ok(c.plato.bases.indexOf(c.base) >= 0, etiqueta + ': base válida ' + c.plato.nombre + '/' + c.base);
  });

  // reparto de bases dentro del cupo
  const usos = {};
  s.forEach(x => usos[x.base] = (usos[x.base] || 0) + 1);
  Object.keys(usos).forEach(b => {
    ok(usos[b] <= BASES[b].cupo + 1, etiqueta + ': base ' + b + ' usada ' + usos[b] + ' veces (cupo ' + BASES[b].cupo + ')');
  });

  // la verdura que pide la semana contra la que entra con las compras
  const gast = {};
  s.forEach(x => {
    const por = 350 / x.guarnicion.verduras.length;
    x.guarnicion.verduras.forEach(v => gast[v] = (gast[v] || 0) + por);
  });
  let falta = 0, peor = 0;
  Object.keys(gast).forEach(v => {
    const d = gast[v] - presupuesto(v);
    if (d > 0) { falta += d; peor = Math.max(peor, d); }
  });
  ok(falta <= (o.tolerancia || 220), etiqueta + ': la compra alcanza', Math.round(falta) + ' g cortos');
  ok(peor <= (o.peorMax || 140), etiqueta + ': el faltante no se concentra', Math.round(peor) + ' g en un solo ítem');
  ok(!s.some(x => x.guarnicion.verduras.some(v => presupuesto(v) === 0)),
     etiqueta + ': no usa verdura que no se compra');

  return plan;
}

console.log('== la primera semana arranca el lunes ==');
const semUno = U.ymd(U.inicioSemana(U.parse(ARRANQUE)));
const uno = verificarSemana(semUno, 'arranque', { comidas: 10, tolerancia: 0, peorMax: 0 });
ok(uno.arranque === true, 'la semana del arranque está marcada como tal');
ok(uno.slots.every(x => x.dia >= 2), 'no hay comidas el sábado ni el domingo previos');
ok(uno.slots[0].dia === 2 && uno.slots[0].comida === 'almuerzo', 'la primera comida es el almuerzo del lunes');
// se compra el mismo lunes: la verdura perecedera aguanta dos días más
const champi = uno.slots.filter(x => x.guarnicion.verduras.indexOf('champiñones') >= 0).map(x => x.dia);
ok(champi.every(d => d <= 5), 'los champiñones no pasan de los cuatro días desde la compra', champi.join(','));

console.log('== 12 semanas seguidas ==');
const base = U.parse('2026-09-05');
for (let w = 0; w < 12; w++) {
  verificarSemana(U.ymd(U.sumarDias(base, 7 * w)), 'sem ' + U.ymd(U.sumarDias(base, 7 * w)));
}

console.log('== la acelga y la lechuga solo después del miércoles ==');
let vecesAcelga = 0;
for (let w = 0; w < 12; w++) {
  const plan = Generador.planSemana(U.ymd(U.sumarDias(base, 7 * w)));
  plan.slots.forEach(x => {
    ['acelga', 'lechuga'].forEach(v => {
      if (x.guarnicion.verduras.indexOf(v) >= 0) {
        ok(x.dia >= 4, v + ' usada antes de la reposición del miércoles', x.guarnicion.nombre + ' día ' + x.dia);
        if (v === 'acelga') vecesAcelga++;
      }
    });
  });
}
ok(vecesAcelga > 0, 'la guarnición de acelga ahora sale alguna vez', vecesAcelga + ' veces en 12 semanas');
console.log('  acelga usada ' + vecesAcelga + ' veces en 12 semanas');

console.log('== determinismo ==');
const foto = (i) => JSON.stringify(Generador.planSemana(i).slots.map(s => [s.plato.id, s.base, s.guarnicion.id]));
const a1 = foto('2026-09-05');
Generador.limpiarCache();
ok(a1 === foto('2026-09-05'), 'el plan es el mismo si no cambian los hechos');

console.log('== faltantes en la compra ==');
Estado.registrarCompra('2026-09-05', ['portobello', 'noquis', 'champinones', 'papa']);
Generador.limpiarCache();
const planF = verificarSemana('2026-09-05', 'con faltantes', { tolerancia: 900, peorMax: 300 });
planF.slots.forEach(s => {
  ok(s.base !== 'ñoquis' && s.base !== 'papa', 'no usa base que no entró', s.base);
  ok(s.guarnicion.verduras.every(v => v !== 'portobello' && v !== 'champiñones'),
     'no usa verdura que no entró: ' + s.guarnicion.nombre);
});

console.log('== cambio el martes ==');
Estado.borrarTodo();
Generador.limpiarCache();
const antes = Generador.planSemana('2026-09-05');
const previo = antes.slots.map(s => ({ clave: s.clave, idx: s.idx, plato: s.plato.id, base: s.base, g: s.guarnicion.id, grupo: s.grupo }));
const objetivo = antes.slots.find(s => s.dia === 3 && s.comida === 'almuerzo');
const alts = Generador.alternativas('2026-09-05', objetivo);
ok(alts.length > 0, 'hay alternativas');
ok(alts.every(a => a.plato.grupo === objetivo.grupo), 'todas las alternativas son de la misma proteína');
Estado.cambiarPlato('2026-09-05', 3, 'almuerzo', alts[0].plato.id, antes.slots.filter(s => s.idx < objetivo.idx));
Generador.limpiarCache();
const despues = verificarSemana('2026-09-05', 'después del cambio', { tolerancia: 320, peorMax: 180 });

previo.forEach(f => {
  const nuevo = despues.slots.find(s => s.clave === f.clave);
  if (f.idx < objetivo.idx) {
    ok(nuevo.plato.id === f.plato && nuevo.base === f.base && nuevo.guarnicion.id === f.g,
       'no se tocó lo anterior: ' + f.clave);
  }
  ok(nuevo.grupo === f.grupo, 'la proteína del día no cambia: ' + f.clave);
});
ok(despues.slots.find(s => s.clave === objetivo.clave).plato.id === alts[0].plato.id, 'el plato cambiado es el elegido');
const posteriores = previo.filter(f => f.idx > objetivo.idx);
const intactos = posteriores.filter(f => {
  const n = despues.slots.find(s => s.clave === f.clave);
  return n.plato.id === f.plato && n.base === f.base && n.guarnicion.id === f.g;
});
console.log('  posteriores intactos: ' + intactos.length + ' de ' + posteriores.length + ' (se espera que algunos se reacomoden)');

console.log('== seis días sin abrir ==');
Estado.borrarTodo();
Generador.limpiarCache();
const septimo = U.sumarDias(U.parse('2026-09-05'), 6);
septimo.setHours(12, 0, 0, 0);
const planHoy = Generador.planSemana(U.ymd(U.inicioSemana(septimo)));
ok(U.indiceDia(septimo, planHoy.inicio) === 6, 'el séptimo día es viernes');
ok(planHoy.slots.filter(s => s.dia === 6).length === 2, 'hay almuerzo y cena sin haber marcado nada');
const inv = Inventario.estado(planHoy.inicio, septimo);
ok(inv.items.find(i => i.clave === 'pollo').gastado > 0,
   'la proteína se descontó según el plan, sin confirmaciones');

console.log('== la despensa arranca vacía ==');
ok(!Inventario.despensaCargada(U.parse(ARRANQUE)), 'sin compra de alacena registrada, la despensa está en cero');
const despVacia = Inventario.despensa(semUno, U.parse(ARRANQUE));
ok(despVacia.every(d => d.total === 0 && d.queda === 0), 'ningún ítem de despensa tiene stock inicial');
ok(despVacia.some(d => d.falta > 0), 'lo que hace falta esta semana aparece como faltante');
Estado.marcarAlacena(api.FECHAS_ALACENA[0]);
ok(Inventario.despensaCargada(U.parse(ARRANQUE)), 'después de registrar la compra, la despensa tiene stock');
ok(Inventario.despensa(semUno, U.parse(ARRANQUE)).every(d => d.total > 0), 'todos los ítems cargados');
Estado.borrarTodo();
Generador.limpiarCache();

console.log('== antes del arranque no hay plan ==');
ok(!Inventario.arrancado(U.sumarDias(U.parse(ARRANQUE), -1)), 'el día anterior todavía no arrancó');
ok(Inventario.arrancado(U.parse(ARRANQUE)), 'el día del arranque sí');
ok(Generador.planSemana(U.ymd(U.sumarDias(U.inicioSemana(U.parse(ARRANQUE)), -7))).slots.length === 0,
   'la semana anterior al arranque no tiene ninguna comida');

console.log('== perfil ==');
const t0 = Date.now();
for (let i = 0; i < 20; i++) { Generador.limpiarCache(); Generador.planSemana('2026-09-19'); }
console.log('  ' + ((Date.now() - t0) / 20).toFixed(1) + ' ms por semana (incluye 2 semanas de historial)');

console.log('\n' + (fallos ? fallos + ' fallas' : 'todo bien') + ' sobre ' + chequeos + ' chequeos');

Estado.borrarTodo();
Generador.limpiarCache();
[semUno, '2026-09-05'].forEach(sem => {
  console.log('\n--- semana del ' + sem + ' ---');
  Generador.planSemana(sem).slots.forEach(s => {
    console.log(('  ' + U.DIAS_CORTO[s.dia] + ' ' + s.comida).padEnd(16) + (s.grupo + '').padEnd(11) +
      s.plato.nombre.padEnd(36) + (s.base + '').padEnd(11) + s.guarnicion.nombre);
  });
});
process.exit(fallos ? 1 : 0);
