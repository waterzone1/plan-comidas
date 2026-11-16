/* ---------------------------------------------------------------
   PORCIONES — la matemática del plato. Editable a mano.
   Siempre en crudo o en seco, nunca cocido.
   --------------------------------------------------------------- */

const PORCION = {
  proteina: 200,        // g en crudo, por plato
  aceite: 12,           // g de aceite de oliva
  salsa: 100,           // g, cuando el plato la lleva
  verduraDefault: 350,  // g
  verduraMin: 250,
  verduraMax: 450,
  verduraPaso: 50,
  kcalPorGramoVerdura: 0.3,   // subir de 300 a 450 cuesta 45 kcal
  baseCocida: 175             // g cocidos que rinde cualquier base
};

const KCAL = {
  gasto: 2400,
  objetivoDeficit: 450,
  desayuno: 300,
  almuerzo: 679,
  merienda: 296,
  cena: 679,
  total: 1953,
  proteinaDiaria: 165   // g
};

const MERIENDA = {
  titulo: 'Batido y fruta',
  detalle: '1 scoop de proteína + 200 ml de leche descremada + 1 fruta',
  kcal: 296
};

/* Cada base rinde 175 g cocidos.
   cupo: cuántas veces por semana entra la base con la compra fija.
   clave: ítem de inventario que descuenta.                                  */

const BASES = {
  'arroz':     { nombre: 'Arroz largo fino',   cant: 58,  unidad: 'g en seco',   cupo: 2, clave: 'arroz' },
  'fideos':    { nombre: 'Fideos secos',       cant: 58,  unidad: 'g en seco',   cupo: 2, clave: 'fideos' },
  'polenta':   { nombre: 'Polenta',            cant: 58,  unidad: 'g en seco',   cupo: 2, clave: 'polenta' },
  'cebada':    { nombre: 'Cebada perlada',     cant: 58,  unidad: 'g en seco',   cupo: 2, clave: 'cebada' },
  'papa':      { nombre: 'Papa',               cant: 184, unidad: 'g en crudo',  cupo: 2, clave: 'papa' },
  'puré':      { nombre: 'Puré instantáneo',   cant: 33,  unidad: 'g en seco',   cupo: 2, clave: 'pure' },
  'ñoquis':    { nombre: 'Ñoquis frescos',     cant: 175, unidad: 'g',           cupo: 1, clave: 'noquis' },
  'legumbres': { nombre: 'Legumbres',          cant: 1,   unidad: 'lata escurrida', cupo: 1, clave: 'legumbres' }
};

/* Cuánto pesa la papa ya cocida, según el método. Solo informativo:
   la app siempre pide pesar los 184 g en crudo.                             */
const PAPA_COCIDA = { crudo: 455, hervida: 432, pure: 501, airfryer: 318 };

const PROTEINAS = {
  'pollo':     { nombre: 'Pollo',     detalle: 'pechuga',           clave: 'pollo' },
  'carne':     { nombre: 'Carne',     detalle: 'magra',             clave: 'carne' },
  'picada':    { nombre: 'Picada',    detalle: 'magra',             clave: 'picada' },
  'pescado':   { nombre: 'Pescado',   detalle: 'merluza o trucha',  clave: 'pescado' },
  'camarones': { nombre: 'Camarones', detalle: 'frescos',           clave: 'camarones' },
  'alacena':   { nombre: 'Alacena',   detalle: 'lata y huevo',      clave: null }
};
