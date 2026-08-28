/* ---------------------------------------------------------------
   COMPRAS — las cuatro listas fijas y las tareas de fraccionado.
   El orden de los comercios es el orden en que se recorren.
   clave: con qué ítem de inventario se corresponde (null = no se sigue).
   --------------------------------------------------------------- */

const COMERCIOS = ['pollería', 'carnicería', 'pescadería', 'verdulería', 'almacén'];

/* --- Botón 1: compra semanal del sábado. Idéntica todas las semanas. --- */
const COMPRA_SEMANAL = [
  { id: 'pollo',        nombre: 'Pechuga de pollo (suprema)',                     cant: 1200, un: 'g', comercio: 'pollería',   clave: 'pollo',       tipo: 'proteina' },

  { id: 'carne',        nombre: 'Carne magra (bola de lomo, nalga o cuadril)',    cant: 600,  un: 'g', comercio: 'carnicería', clave: 'carne',       tipo: 'proteina' },
  { id: 'picada',       nombre: 'Carne picada magra',                             cant: 400,  un: 'g', comercio: 'carnicería', clave: 'picada',      tipo: 'proteina' },

  { id: 'pescado',      nombre: 'Merluza o trucha',                               cant: 200,  un: 'g', comercio: 'pescadería', clave: 'pescado',     tipo: 'proteina' },
  { id: 'camarones',    nombre: 'Camarones',                                      cant: 200,  un: 'g', comercio: 'pescadería', clave: 'camarones',   tipo: 'proteina' },

  { id: 'cebolla',      nombre: 'Cebolla',                                        cant: 810,  un: 'g', comercio: 'verdulería', clave: 'cebolla',        tipo: 'verdura' },
  { id: 'morron',       nombre: 'Morrón rojo',                                    cant: 530,  un: 'g', comercio: 'verdulería', clave: 'morrón',         tipo: 'verdura' },
  { id: 'champinones',  nombre: 'Champiñones',                                    cant: 450,  un: 'g', comercio: 'verdulería', clave: 'champiñones',    tipo: 'verdura' },
  { id: 'brocoli',      nombre: 'Brócoli',                                        cant: 470,  un: 'g', comercio: 'verdulería', clave: 'brócoli',        tipo: 'verdura' },
  { id: 'repollitos',   nombre: 'Repollitos de Bruselas',                         cant: 370,  un: 'g', comercio: 'verdulería', clave: 'repollitos',     tipo: 'verdura' },
  { id: 'cherry',       nombre: 'Tomate cherry',                                  cant: 380,  un: 'g', comercio: 'verdulería', clave: 'cherry',         tipo: 'verdura' },
  { id: 'espinaca',     nombre: 'Espinaca',                                       cant: 230,  un: 'g', comercio: 'verdulería', clave: 'espinaca',       tipo: 'verdura' },
  { id: 'rucula',       nombre: 'Rúcula',                                         cant: 140,  un: 'g', comercio: 'verdulería', clave: 'rúcula',         tipo: 'verdura' },
  { id: 'tomate',       nombre: 'Tomate',                                         cant: 240,  un: 'g', comercio: 'verdulería', clave: 'tomate',         tipo: 'verdura' },
  { id: 'portobello',   nombre: 'Portobello',                                     cant: 120,  un: 'g', comercio: 'verdulería', clave: 'portobello',     tipo: 'verdura' },
  { id: 'perita',       nombre: 'Tomate perita',                                  cant: 130,  un: 'g', comercio: 'verdulería', clave: 'tomate perita',  tipo: 'verdura' },
  { id: 'papa',         nombre: 'Papa',                                           cant: 370,  un: 'g', comercio: 'verdulería', clave: 'papa',           tipo: 'base' },
  { id: 'fruta',        nombre: 'Fruta para la merienda',                         cant: 7,    un: 'u', comercio: 'verdulería', clave: 'fruta',          tipo: 'otro' },

  { id: 'congelados',   nombre: 'Verdura congelada (mixta, brócoli, espinaca)',   cant: 530, un: 'g', comercio: 'almacén',    clave: 'congelados',  tipo: 'verdura' },
  { id: 'leche',        nombre: 'Leche descremada',                               cant: 1.5,  un: 'L', comercio: 'almacén',    clave: 'leche',       tipo: 'otro' },
  { id: 'huevos',       nombre: 'Huevos',                                         cant: 6,    un: 'u', comercio: 'almacén',    clave: 'huevos',      tipo: 'otro' },
  { id: 'noquis',       nombre: 'Ñoquis frescos',                                 cant: 175,  un: 'g', comercio: 'almacén',    clave: 'noquis',      tipo: 'base' },
  { id: 'milanesas',    nombre: 'Milanesas de pollo',                             cant: 2,    un: 'u', comercio: 'almacén',    clave: 'milanesas',   tipo: 'otro', soloSiToca: true },
  { id: 'queso',        nombre: 'Queso rallado, mozzarella',                      cant: null, un: '',  comercio: 'almacén',    clave: null,          tipo: 'otro', nota: 'según haga falta' }
];

/* --- Botón 2: compra de alacena, cada 3 semanas.
   La primera es el día del arranque: la despensa empieza vacía. --- */
const FECHAS_ALACENA = ['2026-08-31', '2026-09-17', '2026-10-08', '2026-10-29'];

/* cant/un son la cantidad que entra al inventario; envase es cómo se pide en
   el comercio. Los de "una sola vez" no se siguen: cant null. */
const COMPRA_ALACENA = [
  // bases secas — el consumo real es de 348 g por ciclo; medio kilo deja margen
  { id: 'a_arroz',    nombre: 'Arroz largo fino',        cant: 500,  un: 'g',       envase: '1 paquete de 500 g', grupo: 'Bases secas',       clave: 'arroz' },
  { id: 'a_fideos',   nombre: 'Fideos secos',            cant: 500,  un: 'g',       envase: '1 paquete de 500 g', grupo: 'Bases secas',       clave: 'fideos' },
  { id: 'a_polenta',  nombre: 'Polenta instantánea',     cant: 500,  un: 'g',       envase: '1 paquete de 500 g', grupo: 'Bases secas',       clave: 'polenta' },
  { id: 'a_cebada',   nombre: 'Cebada perlada',          cant: 500,  un: 'g',       envase: '1 paquete de 500 g', grupo: 'Bases secas',       clave: 'cebada' },
  { id: 'a_pure',     nombre: 'Puré instantáneo',        cant: 200,  un: 'g',       envase: '1 caja de 200 g',    grupo: 'Bases secas',       clave: 'pure' },

  { id: 'a_garbanzos',nombre: 'Garbanzos',               cant: 4,    un: 'latas',   envase: '',                   grupo: 'Latas',             clave: 'legumbres' },
  { id: 'a_lentejas', nombre: 'Lentejas',                cant: 4,    un: 'latas',   envase: '',                   grupo: 'Latas',             clave: 'legumbres' },
  { id: 'a_porotos',  nombre: 'Porotos negros',          cant: 2,    un: 'latas',   envase: '',                   grupo: 'Latas',             clave: 'legumbres' },
  { id: 'a_atun',     nombre: 'Atún al agua',            cant: 3,    un: 'latas',   envase: '',                   grupo: 'Latas',             clave: 'atun' },

  { id: 'a_salsa',    nombre: 'Salsa de tomate o triturado', cant: 2600, un: 'g',   envase: '5 packs de 520 g',   grupo: 'Salsas y líquidos', clave: 'salsa' },
  { id: 'a_oliva',    nombre: 'Aceite de oliva',         cant: 1000, un: 'ml',      envase: '1 botella de 1 L',   grupo: 'Salsas y líquidos', clave: 'oliva' },
  { id: 'a_vino',     nombre: 'Vino blanco para cocinar',cant: 1,    un: 'botella', envase: '',                   grupo: 'Salsas y líquidos', clave: 'vino' },
  { id: 'a_soja',     nombre: 'Salsa de soja o teriyaki',cant: 500,  un: 'ml',      envase: '1 botella de 500 ml',grupo: 'Salsas y líquidos', clave: 'soja', unaVez: true, nota: 'dura ~11 semanas' },

  { id: 'a_proteina', nombre: 'Proteína en polvo',       cant: 1000, un: 'g',       envase: '1 kg',               grupo: 'Suplementos',       clave: 'proteinapolvo', nota: 'dura 6 semanas' },

  { id: 'a_extracto', nombre: 'Extracto de tomate',      cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_aceto',    nombre: 'Aceto',                   cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_miel',     nombre: 'Miel',                    cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_mayo',     nombre: 'Mayonesa light',          cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_mani',     nombre: 'Manteca de maní',         cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_caldo',    nombre: 'Caldo de verdura y de carne en cubo', cant: null, un: '', envase: '', grupo: 'Una sola vez', unaVez: true },
  { id: 'a_spray',    nombre: 'Aceite en spray',         cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_sesamo',   nombre: 'Semillas de sésamo',      cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_sal',      nombre: 'Sal y pimienta negra',    cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true },
  { id: 'a_ajo',      nombre: 'Ajo en polvo y cebolla en polvo', cant: null, un: '', envase: '', grupo: 'Una sola vez', unaVez: true },
  { id: 'a_pimenton', nombre: 'Pimentón dulce y orégano',cant: null, un: '', envase: '', grupo: 'Una sola vez',   unaVez: true }
];

/* --- Botón 3: reposición de hojas del miércoles.
   Sostiene las ensaladas del jueves y el viernes. La acelga entra solo acá:
   no se compra el sábado porque no llegaría viva al día que se usa. --- */
const COMPRA_HOJAS = [
  { id: 'h_rucula',  nombre: 'Rúcula',        cant: 150, un: 'g', comercio: 'verdulería', clave: 'rúcula' },
  { id: 'h_lechuga', nombre: 'Lechuga',       cant: 140, un: 'g', comercio: 'verdulería', clave: 'lechuga' },
  { id: 'h_acelga',  nombre: 'Acelga',        cant: 120, un: 'g', comercio: 'verdulería', clave: 'acelga' },
  { id: 'h_espinaca',nombre: 'Espinaca',      cant: 120, un: 'g', comercio: 'verdulería', clave: 'espinaca' },
  { id: 'h_cherry',  nombre: 'Tomate cherry', cant: 150, un: 'g', comercio: 'verdulería', clave: 'cherry' }
];

/* --- Botón 5: fraccionado, apenas volvés de la compra.
   Las porciones se cuentan desde el plan de la semana, así que en la
   semana del arranque (que es más corta) los números salen bien solos. --- */
const FRACCIONADO = [
  { id: 'f_pollo',     clave: 'pollo',     nombre: 'Pollo',     detalle: 'Cortar las pechugas al medio antes de freezar' },
  { id: 'f_carne',     clave: 'carne',     nombre: 'Carne',     detalle: '' },
  { id: 'f_picada',    clave: 'picada',    nombre: 'Picada',    detalle: '' },
  { id: 'f_pescado',   clave: 'pescado',   nombre: 'Pescado',   detalle: '' },
  { id: 'f_camarones', clave: 'camarones', nombre: 'Camarones', detalle: 'A la heladera, no al freezer: se comen hoy', freezar: false },
  { id: 'f_cebada',    clave: null,        nombre: 'Cebada perlada',
    texto: 'Cebada perlada: hervir una tanda para toda la semana',
    detalle: 'Tarda 25-40 min y va a la heladera. No entra en el límite de 30 min de una comida' }
];

/* Ítems de despensa que no vienen con la compra semanal y se siguen aparte.
   Cuánto entra de cada uno sale de COMPRA_ALACENA, no se repite acá. */
const DESPENSA = {
  arroz:         { nombre: 'Arroz',              un: 'g' },
  fideos:        { nombre: 'Fideos',             un: 'g' },
  polenta:       { nombre: 'Polenta',            un: 'g' },
  cebada:        { nombre: 'Cebada perlada',     un: 'g' },
  pure:          { nombre: 'Puré instantáneo',   un: 'g' },
  legumbres:     { nombre: 'Latas de legumbres', un: 'latas' },
  atun:          { nombre: 'Atún al agua',       un: 'latas' },
  salsa:         { nombre: 'Salsa de tomate',    un: 'g' },
  oliva:         { nombre: 'Aceite de oliva',    un: 'ml' },
  proteinapolvo: { nombre: 'Proteína en polvo',  un: 'g' }
};
