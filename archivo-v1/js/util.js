/* Utilidades: fechas de la semana sábado→viernes, y azar determinista. */

const U = (() => {
  const DIAS = ['sábado', 'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
  const DIAS_CORTO = ['sáb', 'dom', 'lun', 'mar', 'mié', 'jue', 'vie'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const dosDig = (n) => String(n).padStart(2, '0');

  function ymd(d) {
    return d.getFullYear() + '-' + dosDig(d.getMonth() + 1) + '-' + dosDig(d.getDate());
  }
  function parse(s) {
    const [a, m, d] = s.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function sumarDias(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
  function medianoche(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  /* El sábado más reciente, incluido hoy si hoy es sábado. */
  function inicioSemana(d) {
    return sumarDias(medianoche(d), -((d.getDay() + 1) % 7));
  }
  /* Índice 0..6 dentro de la semana que arranca en inicioYmd. Puede dar
     fuera de rango si la fecha no pertenece a esa semana. */
  function indiceDia(fecha, inicioYmd) {
    const ms = medianoche(fecha) - parse(inicioYmd);
    return Math.round(ms / 86400000);
  }
  function fechaLarga(d) {
    return DIAS[(d.getDay() + 1) % 7] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  /* Azar determinista: la misma semilla da siempre la misma secuencia,
     así el plan es una función de los hechos y no de cuándo se calculó. */
  function rng(semilla) {
    let h = 2166136261 >>> 0;
    const s = String(semilla);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return function () {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const g = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace('.', ',') + ' kg'
                              : Math.round(n) + ' g');

  return { DIAS, DIAS_CORTO, MESES, ymd, parse, sumarDias, medianoche, inicioSemana,
           indiceDia, fechaLarga, rng, g };
})();
