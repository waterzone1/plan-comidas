/* ---------------------------------------------------------------
   CATÁLOGO — platos, guarniciones y vida útil de las verduras.
   Este archivo está pensado para editarse a mano. No tiene lógica.
   --------------------------------------------------------------- */

/* Bases posibles: arroz, fideos, ñoquis, polenta, cebada, papa, puré, legumbres
   Tags de plato:   urgencia | olla | vianda | desde-congelado | alacena
   menciona:        verduras que el nombre del plato ya nombra
                    (para no repetirlas en la guarnición)
   salsa:           si el plato lleva ~100 g de salsa                        */

const PLATOS = [
  /* ---------- pollo (10) ---------- */
  { id: 1,  nombre: 'Pollo al wok con soja y sésamo',        grupo: 'pollo',     bases: ['arroz','fideos','cebada'],                                  tags: [],                     menciona: [],              salsa: false },
  { id: 2,  nombre: 'Pollo al ajillo con vino blanco',       grupo: 'pollo',     bases: ['arroz','fideos','cebada','papa','polenta','puré','ñoquis'], tags: [],                     menciona: [],              salsa: false },
  { id: 3,  nombre: 'Pollo a la portuguesa',                 grupo: 'pollo',     bases: ['arroz','fideos','cebada','papa','polenta','puré','ñoquis'], tags: [],                     menciona: [],              salsa: true  },
  { id: 4,  nombre: 'Pollo con salsa blanca y champiñones',  grupo: 'pollo',     bases: ['arroz','fideos','cebada','papa','polenta','puré','ñoquis'], tags: [],                     menciona: ['champiñones'], salsa: true  },
  { id: 5,  nombre: 'Pollo a la plancha con huevo',          grupo: 'pollo',     bases: ['arroz','papa','polenta','puré'],                            tags: ['urgencia'],           menciona: [],              salsa: false },
  { id: 6,  nombre: 'Arroz con pollo',                       grupo: 'pollo',     bases: ['arroz'],                                                    tags: ['olla'],               menciona: [],              salsa: false },
  { id: 7,  nombre: 'Pollo al horno',                        grupo: 'pollo',     bases: ['cebada','papa','polenta','puré'],                           tags: [],                     menciona: [],              salsa: false },
  { id: 8,  nombre: 'Milanesa de pollo a la air fryer',      grupo: 'pollo',     bases: ['arroz','cebada','papa','polenta','puré'],                   tags: ['desde-congelado'],    menciona: [],              salsa: false },
  { id: 9,  nombre: 'Milanesa napolitana',                   grupo: 'pollo',     bases: ['arroz','fideos','papa','polenta','puré'],                   tags: ['desde-congelado'],    menciona: [],              salsa: true  },
  { id: 10, nombre: 'Guiso de lentejas con pollo',           grupo: 'pollo',     bases: ['arroz','legumbres'],                                        tags: ['olla','vianda'],      menciona: [],              salsa: false },

  /* ---------- carne vacuna (6) ---------- */
  { id: 11, nombre: 'Salteado de carne con soja',            grupo: 'carne',     bases: ['arroz','fideos','cebada'],                                  tags: [],                     menciona: [],              salsa: false },
  { id: 12, nombre: 'Carne a la cacerola',                   grupo: 'carne',     bases: ['arroz','cebada','papa','polenta','puré'],                   tags: ['olla','vianda'],      menciona: [],              salsa: true  },
  { id: 13, nombre: 'Carne al horno con cebolla',            grupo: 'carne',     bases: ['cebada','papa','polenta'],                                  tags: [],                     menciona: ['cebolla'],     salsa: false },
  { id: 14, nombre: 'Bola de lomo a la plancha',             grupo: 'carne',     bases: ['arroz','papa','polenta','puré'],                            tags: ['urgencia'],           menciona: [],              salsa: false },
  { id: 15, nombre: 'Carne con champiñones al vino',         grupo: 'carne',     bases: ['arroz','fideos','cebada','papa','polenta','puré','ñoquis'], tags: [],                     menciona: ['champiñones'], salsa: true  },
  { id: 16, nombre: 'Carne en salsa de tomate',              grupo: 'carne',     bases: ['arroz','fideos','cebada','papa','polenta','puré','ñoquis'], tags: [],                     menciona: ['tomate','tomate perita'], salsa: true },

  /* ---------- carne picada (3) ---------- */
  { id: 17, nombre: 'Bolognesa',                             grupo: 'picada',    bases: ['arroz','fideos','polenta','ñoquis'],                        tags: ['vianda'],             menciona: [],              salsa: true  },
  { id: 18, nombre: 'Pastel de papa',                        grupo: 'picada',    bases: ['puré'],                                                     tags: ['vianda'],             menciona: [],              salsa: false },
  { id: 19, nombre: 'Picada con bechamel',                   grupo: 'picada',    bases: ['arroz','fideos','polenta','ñoquis'],                        tags: [],                     menciona: [],              salsa: true  },

  /* ---------- pescado (3) ---------- */
  { id: 20, nombre: 'Merluza a la plancha',                  grupo: 'pescado',   bases: ['arroz','papa','polenta','puré'],                            tags: ['urgencia'],           menciona: [],              salsa: false },
  { id: 21, nombre: 'Merluza al ajillo',                     grupo: 'pescado',   bases: ['arroz','fideos','cebada','papa','polenta','puré'],          tags: [],                     menciona: [],              salsa: false },
  { id: 22, nombre: 'Trucha a la plancha',                   grupo: 'pescado',   bases: ['arroz','cebada','papa','puré'],                             tags: [],                     menciona: [],              salsa: false },

  /* ---------- camarones (2) ---------- */
  { id: 23, nombre: 'Camarones al ajillo',                   grupo: 'camarones', bases: ['arroz','fideos','papa','polenta','puré','ñoquis'],          tags: [],                     menciona: [],              salsa: false },
  { id: 24, nombre: 'Camarones al wok con soja',             grupo: 'camarones', bases: ['arroz','fideos','cebada'],                                  tags: [],                     menciona: [],              salsa: false },

  /* ---------- alacena (2) ---------- */
  { id: 25, nombre: 'Garbanzos con atún y huevo',            grupo: 'alacena',   bases: ['arroz','legumbres'],                                        tags: ['urgencia','alacena'], menciona: [],              salsa: false, proteinaTexto: '1 lata de garbanzos + 1 lata de atún + 1 huevo' },
  { id: 26, nombre: 'Tortilla de papa',                      grupo: 'alacena',   bases: ['papa'],                                                     tags: ['alacena'],            menciona: [],              salsa: false, proteinaTexto: '3 huevos' }
];

/* Tags de guarnición: rápida | cruda | en-salsa | freezer
   vida: primer día en que la verdura más perecedera ya no sirve, contado
         desde el sábado de compra. Sale de VERDURAS (es el mínimo de las
         que lleva); está acá para poder leerlo de un vistazo.
   min:  minutos de preparación                                              */

const GUARNICIONES = [
  { id: 1,  nombre: 'Morrón, cebolla y brócoli',                    verduras: ['morrón','cebolla','brócoli'],           vida: 6,  min: 12, tags: [] },
  { id: 2,  nombre: 'Champiñones, portobello y espinaca',           verduras: ['champiñones','portobello','espinaca'],  vida: 4,  min: 10, tags: ['rápida'] },
  { id: 3,  nombre: 'Morrón, cebolla y champiñones',                verduras: ['morrón','cebolla','champiñones'],       vida: 4,  min: 12, tags: [] },
  { id: 4,  nombre: 'Brócoli, morrón y champiñones al sésamo',      verduras: ['brócoli','morrón','champiñones'],       vida: 4,  min: 14, tags: [] },
  { id: 5,  nombre: 'Repollitos, cebolla y morrón',                 verduras: ['repollitos','cebolla','morrón'],        vida: 10, min: 15, tags: [] },
  { id: 6,  nombre: 'Brócoli, morrón y cebolla al horno',           verduras: ['brócoli','morrón','cebolla'],           vida: 6,  min: 20, tags: [] },
  { id: 7,  nombre: 'Repollitos, cebolla y tomate perita al horno', verduras: ['repollitos','cebolla','tomate perita'], vida: 8,  min: 25, tags: [] },
  { id: 8,  nombre: 'Champiñones, portobello y morrón al horno',    verduras: ['champiñones','portobello','morrón'],    vida: 4,  min: 20, tags: [] },
  { id: 9,  nombre: 'Brócoli, repollitos y cebolla dorados',        verduras: ['brócoli','repollitos','cebolla'],       vida: 6,  min: 22, tags: [] },
  { id: 10, nombre: 'Tomate perita, cebolla y morrón asados',       verduras: ['tomate perita','cebolla','morrón'],     vida: 8,  min: 25, tags: [] },
  { id: 11, nombre: 'Brócoli y repollitos con cherry crudo',        verduras: ['brócoli','repollitos','cherry'],        vida: 6,  min: 12, tags: [] },
  { id: 12, nombre: 'Acelga, espinaca y cebolla',                   verduras: ['acelga','espinaca','cebolla'],          vida: 8,  min: 12, tags: [] },
  { id: 13, nombre: 'Brócoli al vapor',                             verduras: ['brócoli'],                              vida: 6,  min: 8,  tags: ['rápida'] },
  { id: 14, nombre: 'Rúcula, cherry y champiñones',                 verduras: ['rúcula','cherry','champiñones'],        vida: 4,  min: 5,  tags: ['cruda','rápida'] },
  { id: 15, nombre: 'Lechuga, tomate y cebolla',                    verduras: ['lechuga','tomate','cebolla'],           vida: 6,  min: 6,  tags: ['cruda','rápida'] },
  { id: 16, nombre: 'Espinaca, cherry y champiñones',               verduras: ['espinaca','cherry','champiñones'],      vida: 4,  min: 5,  tags: ['cruda','rápida'] },
  { id: 17, nombre: 'Repollitos fileteados, rúcula y cherry',       verduras: ['repollitos','rúcula','cherry'],         vida: 6,  min: 8,  tags: ['cruda','rápida'] },
  { id: 18, nombre: 'Lechuga, rúcula, tomate y palta',              verduras: ['lechuga','rúcula','tomate'],            vida: 6,  min: 6,  tags: ['cruda','rápida'] },
  { id: 19, nombre: 'Rúcula con cherry y aceto',                    verduras: ['rúcula','cherry'],                      vida: 6,  min: 3,  tags: ['cruda','rápida'] },
  { id: 20, nombre: 'Tomate, cebolla y morrón en la salsa',         verduras: ['tomate','cebolla','morrón'],            vida: 6,  min: 0,  tags: ['en-salsa','rápida'] },
  { id: 21, nombre: 'Espinaca, champiñones y tomate en la salsa',   verduras: ['espinaca','champiñones','tomate'],      vida: 4,  min: 0,  tags: ['en-salsa','rápida'] },
  { id: 22, nombre: 'Verdura mixta y espinaca al wok',              verduras: ['congelados'],                           vida: 99, min: 10, tags: ['freezer','rápida'] },
  { id: 23, nombre: 'Brócoli congelado, morrón y cebolla',          verduras: ['congelados','morrón','cebolla'],        vida: 10, min: 20, tags: ['freezer'] },
  { id: 24, nombre: 'Verdura mixta al vapor con cherry',            verduras: ['congelados','cherry'],                  vida: 6,  min: 10, tags: ['freezer','rápida'] },
  { id: 25, nombre: 'Espinaca congelada, champiñones y tomate',     verduras: ['congelados','champiñones','tomate'],     vida: 4,  min: 12, tags: ['freezer'] }
];

/* Ventana de uso de cada verdura, en días contados desde el sábado de compra
   (día 0 = sábado).

   desde: primer día en que se puede usar. 0 para todo lo que entra el sábado;
          4 para la acelga y la lechuga, que vienen solo en la reposición del
          miércoles y por eso sirven para las ensaladas del final de semana.
   vida:  primer día en que ya no sirve.
   compra: gramos que entran con la compra semanal del sábado
          (0 = no está en esa lista; ver COMPRA_HOJAS).

   Rúcula y espinaca llegan a 8 porque el miércoles se reponen; sin esa compra
   de mitad de semana durarían 6 y 4. */

const VERDURAS = {
  'rúcula':        { desde: 0, vida: 8,  compra: 140 },
  'lechuga':       { desde: 4, vida: 8,  compra: 0   },
  'espinaca':      { desde: 0, vida: 8,  compra: 230 },
  'acelga':        { desde: 4, vida: 8,  compra: 0   },
  'champiñones':   { desde: 0, vida: 4,  compra: 450 },
  'portobello':    { desde: 0, vida: 4,  compra: 120 },
  'brócoli':       { desde: 0, vida: 6,  compra: 470 },
  'cherry':        { desde: 0, vida: 6,  compra: 380 },
  'tomate':        { desde: 0, vida: 6,  compra: 240 },
  'tomate perita': { desde: 0, vida: 8,  compra: 130 },
  'morrón':        { desde: 0, vida: 10, compra: 530 },
  'repollitos':    { desde: 0, vida: 12, compra: 370 },
  'cebolla':       { desde: 0, vida: 14, compra: 810 },
  'congelados':    { desde: 0, vida: 99, compra: 530 }
};
