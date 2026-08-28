/* ---------------------------------------------------------------
   RITMO FIJO DE PROTEÍNAS — no cambia nunca, ninguna semana.
   Es lo que permite que el aviso del freezer esté escrito de antemano.
   Día 0 = sábado ... día 6 = viernes.
   --------------------------------------------------------------- */

const RITMO = [
  { dia: 0, nombre: 'sábado',    almuerzo: 'camarones', cena: 'pollo'   },
  { dia: 1, nombre: 'domingo',   almuerzo: 'carne',     cena: 'pollo'   },
  { dia: 2, nombre: 'lunes',     almuerzo: 'picada',    cena: 'pollo'   },  // almuerzo = vianda
  { dia: 3, nombre: 'martes',    almuerzo: 'carne',     cena: 'pescado' },
  { dia: 4, nombre: 'miércoles', almuerzo: 'pollo',     cena: 'picada'  },
  { dia: 5, nombre: 'jueves',    almuerzo: 'pollo',     cena: 'carne'   },
  { dia: 6, nombre: 'viernes',   almuerzo: 'alacena',   cena: 'pollo'   }
];

/* El almuerzo del lunes se cocina el domingo a la noche: es vianda. */
const VIANDA = { dia: 2, comida: 'almuerzo', seCocina: 'domingo 20:00' };

/* El sábado no se descongela nada: se compra a las 10 y se come a la 1. */
const SABADO_FRESCO = ['camarones', 'pollo'];

/* Qué se baja del freezer cada noche a las 23:00. Índice = noche del día. */
const FREEZER = [
  { dia: 0, baja: ['pollo', 'carne', 'picada'], nota: 'la picada es para la vianda del lunes' },
  { dia: 1, baja: ['pollo'],                    nota: '' },
  { dia: 2, baja: ['carne', 'pescado'],         nota: '' },
  { dia: 3, baja: ['pollo', 'picada'],          nota: '' },
  { dia: 4, baja: ['pollo', 'carne'],           nota: '' },
  { dia: 5, baja: ['pollo'],                    nota: '' },
  { dia: 6, baja: [],                           nota: '' }
];

/* ---------------------------------------------------------------
   EL ARRANQUE — el plan no existe antes de esta fecha.
   Ese día se hace la primera compra (fresca y de alacena) y se carga
   todo: la app arranca con el inventario en cero.
   La primera semana es parcial: va del lunes 31 al viernes 4.
   --------------------------------------------------------------- */
const ARRANQUE = '2026-08-31';

/* Los hitos fijos de la semana. Los avisos reales viven en el calendario
   del iPhone; acá solo se muestran como referencia. */
const HITOS = [
  { dia: 0, hora: '10:00', texto: 'Compra semanal' },
  { dia: 0, hora: '11:00', texto: 'Fraccionar la proteína en porciones de 200 g y freezar' },
  { dia: 1, hora: '20:00', texto: 'Cocinar la vianda del lunes' },
  { dia: 4, hora: '10:00', texto: 'Reposición de hojas: rúcula, lechuga, espinaca y acelga' }
];
