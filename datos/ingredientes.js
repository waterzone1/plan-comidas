/* ---------------------------------------------------------------
   INGREDIENTES — tabla de nutrientes y de compra. Editable a mano.

   kcal y p (proteína) son por 100 g, tal como se pesa el ingrediente:
   las proteínas y las verduras en crudo, los cereales ya cocidos.
   Valores aproximados, redondeados, tomados de USDA FoodData Central
   y de tablas argentinas (ARGENFOODS). La app los muestra con "≈".

   sec:   sección de la lista de compras
   al:    1 = está siempre en la alacena (no cuenta como faltante)
   u:     unidad natural (huevo, lata, tortilla) con su peso en gramos
   lim:   mínimo y máximo de gramos que puede proponer la app: lo que
          entra en un plato de verdad (nunca 80 g de pollo ni 8 rebanadas
          de pan). Si con eso no se llega al objetivo, la app propone
          completar con algo de COMPLEMENTOS
   paso:  redondeo de los gramos
   --------------------------------------------------------------- */

const SECCIONES = [
  { id: 'verduleria',  n: 'Verdulería',             ic: '🥬' },
  { id: 'carniceria',  n: 'Carnicería',             ic: '🥩' },
  { id: 'polleria',    n: 'Pollería',               ic: '🍗' },
  { id: 'pescaderia',  n: 'Pescadería',             ic: '🐟' },
  { id: 'almacen',     n: 'Supermercado / almacén', ic: '🛒' }
];

const INGREDIENTES = {

  /* ---------- proteínas (en crudo) ---------- */
  pollo:      { t: 'prot', n: 'pechuga de pollo',                      kcal: 114, p: 23,   sec: 'polleria',   lim: [120, 250] },
  carne:      { t: 'prot', n: 'carne magra (nalga, bola de lomo o cuadril)', kcal: 125, p: 21.5, sec: 'carniceria', lim: [120, 220] },
  picada:     { t: 'prot', n: 'carne picada magra',                    kcal: 150, p: 20.5, sec: 'carniceria', lim: [120, 220] },
  cerdo:      { t: 'prot', n: 'carré o solomillo de cerdo',            kcal: 140, p: 21.5, sec: 'carniceria', lim: [120, 250] },
  merluza:    { t: 'prot', n: 'filet de merluza',                      kcal: 82,  p: 17.5, sec: 'pescaderia', lim: [150, 300] },
  trucha:     { t: 'prot', n: 'filet de trucha',                       kcal: 141, p: 20,   sec: 'pescaderia', lim: [120, 250] },
  camarones:  { t: 'prot', n: 'camarones pelados',                     kcal: 85,  p: 18,   sec: 'pescaderia', lim: [120, 300] },
  huevo:      { t: 'prot', n: 'huevos',                                kcal: 143, p: 12.6, sec: 'almacen',    lim: [100, 200], paso: 50, u: { g: 50, s: 'huevo', pl: 'huevos' } },
  atun:       { t: 'prot', n: 'atún al natural',                       kcal: 116, p: 25.5, sec: 'almacen',    lim: [120, 180],  paso: 60, u: { g: 120, s: 'lata', pl: 'latas', frac: 1 } },
  mila_pollo: { t: 'prot', n: 'milanesas de pollo',                    kcal: 160, p: 18,   sec: 'polleria',   lim: [120, 240], paso: 60, u: { g: 120, s: 'milanesa', pl: 'milanesas' } },
  mila_carne: { t: 'prot', n: 'milanesas de carne',                    kcal: 175, p: 18.5, sec: 'carniceria', lim: [120, 240], paso: 60, u: { g: 120, s: 'milanesa', pl: 'milanesas' } },

  /* ---------- extras con proteína ---------- */
  jamon:         { t: 'extra', n: 'jamón cocido magro',          kcal: 105, p: 18,  sec: 'almacen', magro: 1, lim: [40, 120] },
  mozzarella:    { t: 'extra', n: 'mozzarella o queso cremoso',  kcal: 280, p: 22,  sec: 'almacen' },
  ricota:        { t: 'extra', n: 'ricota magra',                kcal: 140, p: 11,  sec: 'almacen' },
  queso_rallado: { t: 'extra', n: 'queso rallado',               kcal: 390, p: 33,  sec: 'almacen', al: 1 },
  pan_rallado:   { t: 'extra', n: 'pan rallado',                 kcal: 395, p: 13,  sec: 'almacen', al: 1 },
  sesamo:        { t: 'extra', n: 'semillas de sésamo',          kcal: 573, p: 18,  sec: 'almacen', al: 1 },
  aceite:        { t: 'extra', n: 'aceite de oliva',             kcal: 884, p: 0,   sec: 'almacen', al: 1 },

  /* ---------- carbohidratos ----------
     med:  cómo se pesa ('cocido', 'crudo', 'listo' o '' si va por unidad)
     seco: factor para pasar a gramos en seco (lo que se compra y se hierve)
     min:  minutos que suma; olla: 1 si necesita un recipiente aparte
     tit:  cómo se escribe cuando encabeza el nombre del plato            */
  arroz:        { t: 'carbo', n: 'arroz',            tit: 'Arroz',     kcal: 130, p: 2.7, med: 'cocido', seco: 0.36, min: 18, olla: 1, eq: 'hornalla',   lim: [80, 300],  sec: 'almacen', al: 1 },
  fideos:       { t: 'carbo', n: 'fideos',           tit: 'Fideos',    kcal: 157, p: 5.8, med: 'cocidos', seco: 0.45, min: 12, olla: 1, eq: 'hornalla',   lim: [80, 300],  sec: 'almacen', al: 1 },
  noquis:       { t: 'carbo', n: 'ñoquis',           tit: 'Ñoquis',    kcal: 160, p: 4,   med: '',       min: 6,  olla: 1, eq: 'hornalla',   lim: [100, 350], sec: 'almacen', nc: 'ñoquis frescos' },
  polenta:      { t: 'carbo', n: 'polenta',          tit: 'Polenta',   kcal: 72,  p: 1.7, med: 'cocida', seco: 0.2,  min: 5,  olla: 1, eq: 'hornalla',   lim: [120, 450], sec: 'almacen', al: 1, nc: 'polenta instantánea' },
  cebada:       { t: 'carbo', n: 'cebada perlada',   tit: 'Cebada',    kcal: 123, p: 2.3, med: 'cocida', seco: 0.33, min: 30, olla: 1, eq: 'hornalla',   lim: [80, 300],  sec: 'almacen', al: 1 },
  pure:         { t: 'carbo', n: 'puré',             tit: 'Puré',      kcal: 90,  p: 2,   med: 'listo',  seco: 0.19, min: 3,  olla: 0, eq: '',           lim: [100, 400], sec: 'almacen', al: 1, nc: 'puré instantáneo', secoN: 'de copos' },
  papa_hervida: { t: 'carbo', n: 'papas hervidas',   tit: 'Papas',     kcal: 77,  p: 2,   med: 'crudo',  min: 20, olla: 1, eq: 'hornalla',   lim: [100, 450], sec: 'verduleria', ck: 'papa' },
  papa_micro:   { t: 'carbo', n: 'papa al microondas', tit: 'Papa',    kcal: 77,  p: 2,   med: 'crudo',  min: 9,  olla: 0, eq: 'microondas', lim: [100, 450], sec: 'verduleria', ck: 'papa' },
  papa_airfryer:{ t: 'carbo', n: 'papas en air fryer', tit: 'Papas',   kcal: 82,  p: 2,   med: 'crudo',  min: 20, olla: 0, eq: 'airfryer',   lim: [100, 450], sec: 'verduleria', ck: 'papa' },
  papa_horno:   { t: 'carbo', n: 'papas al horno',   tit: 'Papas',     kcal: 82,  p: 2,   med: 'crudo',  min: 30, olla: 0, eq: 'horno',      lim: [100, 450], sec: 'verduleria', ck: 'papa' },
  batata:       { t: 'carbo', n: 'batata asada',     tit: 'Batata',    kcal: 90,  p: 1.6, med: 'crudo',  min: 22, olla: 0, eq: 'airfryer',   lim: [100, 400], sec: 'verduleria' },
  lentejas:     { t: 'carbo', n: 'lentejas',         tit: 'Lentejas',  kcal: 116, p: 9,   med: 'escurridas', min: 0, olla: 0, eq: '',        lim: [100, 350], sec: 'almacen', al: 1, u: { g: 230, s: 'lata', pl: 'latas' }, nc: 'lentejas en lata' },
  garbanzos:    { t: 'carbo', n: 'garbanzos',        tit: 'Garbanzos', kcal: 135, p: 7.5, med: 'escurridos', min: 0, olla: 0, eq: '',        lim: [100, 350], sec: 'almacen', al: 1, u: { g: 230, s: 'lata', pl: 'latas' }, nc: 'garbanzos en lata' },
  porotos:      { t: 'carbo', n: 'porotos',          tit: 'Porotos',   kcal: 130, p: 8.7, med: 'escurridos', min: 0, olla: 0, eq: '',        lim: [100, 350], sec: 'almacen', al: 1, u: { g: 230, s: 'lata', pl: 'latas' }, nc: 'porotos en lata' },
  tortillas:    { t: 'carbo', n: 'tortillas de trigo', tit: 'Tortillas', kcal: 300, p: 8, med: '',       min: 0,  olla: 0, eq: '',           lim: [60, 120],  paso: 30, sec: 'almacen', u: { g: 30, s: 'tortilla', pl: 'tortillas' }, nc: 'tortillas de trigo (rapiditas)' },
  pan:          { t: 'carbo', n: 'pan',              tit: 'Pan',       kcal: 270, p: 9,   med: '',       min: 0,  olla: 0, eq: '',           lim: [70, 140],  paso: 70, sec: 'almacen', u: { g: 70, s: 'pan', pl: 'panes' }, nc: 'pan de hamburguesa o figazza' },
  pan_lactal:   { t: 'carbo', n: 'pan lactal',       tit: 'Tostadas',  kcal: 255, p: 8.5,  med: '',       min: 0,  olla: 0, eq: '',           lim: [28, 112],  paso: 28, sec: 'almacen', u: { g: 28, s: 'rebanada', pl: 'rebanadas' }, nc: 'pan lactal o integral' },
  pan_arabe:    { t: 'carbo', n: 'pan árabe',        tit: 'Pan árabe', kcal: 265, p: 9,   med: '',       min: 0,  olla: 0, eq: '',           lim: [60, 120],  paso: 30, sec: 'almacen', u: { g: 60, s: 'pan árabe', pl: 'panes árabes' } },
  lasana:       { t: 'carbo', n: 'láminas de lasaña', tit: 'Lasaña',  kcal: 355, p: 12,  med: 'en seco', min: 0, olla: 0, eq: '',           lim: [40, 100], sec: 'almacen' },
  tapa_tarta:   { t: 'carbo', n: 'masa de tarta',    tit: 'Tarta',     kcal: 300, p: 7,   med: '',       min: 0,  olla: 0, eq: '',           lim: [55, 110],  paso: 55, sec: 'almacen', u: { g: 220, s: 'tapa', pl: 'tapas', frac: 1 }, nc: 'tapa de tarta' },

  /* ---------- verduras (en crudo) ----------
     po: gramos típicos cuando es una de las tres verduras del plato
     tope: máximo de gramos (lo que nunca va en cantidad)
     cr: 1 si se come cruda                                               */
  morron:     { t: 'verd', n: 'morrón',                 kcal: 31,  p: 1,   po: 80,  sec: 'verduleria', cr: 1 },
  cebolla:    { t: 'verd', n: 'cebolla',                kcal: 40,  p: 1.1, po: 70,  sec: 'verduleria', cr: 1 },
  brocoli:    { t: 'verd', n: 'brócoli',                kcal: 34,  p: 2.8, po: 120, sec: 'verduleria', cg: 1 },
  champinon:  { t: 'verd', n: 'champiñones',            kcal: 22,  p: 3.1, po: 100, sec: 'verduleria', cr: 1 },
  portobello: { t: 'verd', n: 'portobello',             kcal: 22,  p: 2.1, po: 100, sec: 'verduleria' },
  espinaca:   { t: 'verd', n: 'espinaca',               kcal: 23,  p: 2.9, po: 80,  sec: 'verduleria', cr: 1, cg: 1 },
  rucula:     { t: 'verd', n: 'rúcula',                 kcal: 25,  p: 2.6, po: 30, tope: 60,  sec: 'verduleria', cr: 1 },
  lechuga:    { t: 'verd', n: 'lechuga',                kcal: 15,  p: 1.4, po: 60,  sec: 'verduleria', cr: 1 },
  tomate:     { t: 'verd', n: 'tomate',                 kcal: 18,  p: 0.9, po: 120, sec: 'verduleria', cr: 1 },
  cherry:     { t: 'verd', n: 'tomates cherry',         kcal: 18,  p: 0.9, po: 100, sec: 'verduleria', cr: 1 },
  repollitos: { t: 'verd', n: 'repollitos de Bruselas', kcal: 43,  p: 3.4, po: 120, sec: 'verduleria' },
  acelga:     { t: 'verd', n: 'acelga',                 kcal: 19,  p: 1.8, po: 100, sec: 'verduleria' },
  zapallito:  { t: 'verd', n: 'zapallito',              kcal: 17,  p: 1.2, po: 150, sec: 'verduleria' },
  berenjena:  { t: 'verd', n: 'berenjena',              kcal: 25,  p: 1,   po: 120, sec: 'verduleria' },
  chaucha:    { t: 'verd', n: 'chauchas',               kcal: 31,  p: 1.8, po: 120, sec: 'verduleria', cg: 1 },
  coliflor:   { t: 'verd', n: 'coliflor',               kcal: 25,  p: 1.9, po: 120, sec: 'verduleria', cg: 1 },
  repollo:    { t: 'verd', n: 'repollo',                kcal: 25,  p: 1.3, po: 100, sec: 'verduleria', cr: 1 },
  calabaza:   { t: 'verd', n: 'calabaza',               kcal: 45,  p: 1,   po: 150, sec: 'verduleria' },
  esparrago:  { t: 'verd', n: 'espárragos',             kcal: 20,  p: 2.2, po: 100, sec: 'verduleria' },
  puerro:     { t: 'verd', n: 'puerro',                 kcal: 61,  p: 1.5, po: 60, tope: 80,  sec: 'verduleria' },
  verdeo:     { t: 'verd', n: 'cebolla de verdeo',      kcal: 32,  p: 1.8, po: 25, tope: 40,  sec: 'verduleria', cr: 1 },
  pepino:     { t: 'verd', n: 'pepino',                 kcal: 15,  p: 0.7, po: 80,  sec: 'verduleria', cr: 1 },
  palta:      { t: 'verd', n: 'palta',                  kcal: 160, p: 2,   po: 50, tope: 50,  sec: 'verduleria', cr: 1 },
  choclo:     { t: 'verd', n: 'choclo',                 kcal: 86,  p: 3.2, po: 60, tope: 60,  sec: 'almacen',    cr: 1, al: 1, nc: 'choclo en lata o congelado' },
  arveja:     { t: 'verd', n: 'arvejas',                kcal: 81,  p: 5.4, po: 60, tope: 80,  sec: 'almacen',    cr: 1, al: 1, nc: 'arvejas en lata o congeladas' },

  /* ---------- lo que se compra para las salsas (sin nutrientes propios:
     las salsas tienen los suyos en SALSAS) ---------- */
  pure_tomate:    { t: 'alac', n: 'puré o triturado de tomate',     sec: 'almacen', al: 1 },
  crema:          { t: 'alac', n: 'crema de leche liviana',         sec: 'almacen' },
  queso_crema:    { t: 'alac', n: 'queso crema light',              sec: 'almacen' },
  yogur:          { t: 'alac', n: 'yogur natural o griego sin azúcar', sec: 'almacen' },
  leche:          { t: 'alac', n: 'leche descremada',               sec: 'almacen', al: 1 },
  manteca:        { t: 'alac', n: 'manteca',                        sec: 'almacen', al: 1 },
  salsa_soja:     { t: 'alac', n: 'salsa de soja',                  sec: 'almacen', al: 1 },
  salsa_teriyaki: { t: 'alac', n: 'salsa teriyaki',                 sec: 'almacen', al: 1 },
  salsa_bbq:      { t: 'alac', n: 'salsa barbacoa',                 sec: 'almacen', al: 1 },
  mayonesa:       { t: 'alac', n: 'mayonesa light',                 sec: 'almacen', al: 1 },
  miel:           { t: 'alac', n: 'miel',                           sec: 'almacen', al: 1 },
  vino:           { t: 'alac', n: 'vino blanco para cocinar',       sec: 'almacen', al: 1 },
  caldo:          { t: 'alac', n: 'caldo en cubo o en polvo',       sec: 'almacen', al: 1 },
  pesto:          { t: 'alac', n: 'pesto de albahaca (frasco)',     sec: 'almacen' },
  manteca_mani:   { t: 'alac', n: 'manteca de maní',                sec: 'almacen', al: 1 },
  vinagre:        { t: 'alac', n: 'vinagre o aceto',                sec: 'almacen', al: 1 },
  ajo:            { t: 'alac', n: 'ajo',                            sec: 'verduleria', al: 1 },
  limon:          { t: 'alac', n: 'limón',                          sec: 'verduleria', al: 1 },
  naranja:        { t: 'alac', n: 'naranjas para jugo',             sec: 'verduleria' },
  maicena:        { t: 'alac', n: 'maicena',                        sec: 'almacen', al: 1 }
};

/* ---------- salsas ----------
   g:    gramos por plato; kcal y p por 100 g de la salsa ya hecha
   frag: cómo entra en el nombre del plato
   sal:  1 si cuenta como "con salsa" (0 = jugoso, pero no es una salsa)
   comp: qué hay que tener para hacerla                                   */
const SALSAS = {
  tomate:      { n: 'Tomate',        frag: 'en salsa de tomate',   g: 130, kcal: 32,  p: 1.4, sal: 1, comp: ['pure_tomate', 'ajo'] },
  crema:       { n: 'Crema',         frag: 'a la crema',           g: 50,  kcal: 195, p: 2.5, sal: 1, comp: ['crema'] },
  rosa:        { n: 'Rosa',          frag: 'en salsa rosa',        g: 110, kcal: 85,  p: 1.8, sal: 1, comp: ['pure_tomate', 'crema'] },
  blanca:      { n: 'Blanca',        frag: 'en salsa blanca',      g: 100, kcal: 95,  p: 3.6, sal: 1, comp: ['leche', 'manteca'] },
  teriyaki:    { n: 'Teriyaki',      frag: 'teriyaki',             g: 30,  kcal: 90,  p: 6,   sal: 1, comp: ['salsa_teriyaki'] },
  soja:        { n: 'Soja',          frag: 'con soja',             g: 20,  kcal: 55,  p: 8,   sal: 1, comp: ['salsa_soja'] },
  agridulce:   { n: 'Agridulce',     frag: 'agridulce',            g: 30,  kcal: 180, p: 3,   sal: 1, comp: ['miel', 'salsa_soja', 'vinagre'] },
  mani:        { n: 'Maní',          frag: 'con salsa de maní',    g: 25,  kcal: 400, p: 16,  sal: 1, comp: ['manteca_mani', 'salsa_soja'] },
  vino:        { n: 'Vino blanco',   frag: 'al vino blanco',       g: 60,  kcal: 45,  p: 0.3, sal: 1, comp: ['vino', 'ajo'] },
  portuguesa:  { n: 'Portuguesa',    frag: 'a la portuguesa',      g: 130, kcal: 36,  p: 1.3, sal: 1, comp: ['pure_tomate', 'ajo'] },
  verdeo:      { n: 'Verdeo',        frag: 'al verdeo',            g: 60,  kcal: 170, p: 2.5, sal: 1, comp: ['crema', 'verdeo'] },
  queso_crema: { n: 'Queso crema',   frag: 'con queso crema',      g: 50,  kcal: 180, p: 8,   sal: 1, comp: ['queso_crema'] },
  pesto:       { n: 'Pesto',         frag: 'al pesto',             g: 20,  kcal: 450, p: 5,   sal: 1, comp: ['pesto'] },
  naranja:     { n: 'Naranja',       frag: 'a la naranja',         g: 90,  kcal: 70,  p: 1.2, sal: 1, comp: ['naranja', 'salsa_soja', 'maicena', 'ajo'] },
  barbacoa:    { n: 'Barbacoa',      frag: 'a la barbacoa',        g: 30,  kcal: 170, p: 1,   sal: 1, comp: ['salsa_bbq'] },
  yogur:       { n: 'Yogur',         frag: 'con salsa de yogur',   g: 80,  kcal: 62,  p: 8,   sal: 1, comp: ['yogur', 'limon'] },
  criolla:     { n: 'Criolla',       frag: 'con salsa criolla',    g: 80,  kcal: 50,  p: 0.9, sal: 0, comp: ['tomate', 'cebolla', 'vinagre'] },
  limon:       { n: 'Limón',         frag: 'al limón',             g: 15,  kcal: 250, p: 0.5, sal: 0, comp: ['limon', 'manteca'] },
  ajillo:      { n: 'Ajillo',        frag: 'al ajillo',            g: 15,  kcal: 330, p: 1,   sal: 0, comp: ['ajo'] },
  mayo:        { n: 'Mayonesa',      frag: 'con mayonesa',         g: 15,  kcal: 330, p: 1,   sal: 0, comp: ['mayonesa'] },
  nada:        { n: 'Sin salsa',     frag: '',                     g: 0,   kcal: 0,   p: 0,   sal: 0, comp: [] },
  caldo:       { n: 'Caldo',         frag: '',                     g: 150, kcal: 5,   p: 0.5, sal: 0, comp: ['caldo'] }
};

/* Con qué se completa un plato que, con porciones normales, queda corto
   para el objetivo. La app nunca infla el pan o el arroz para llegar:
   propone sumar algo de esto al costado. kcal y p son por unidad. */
const COMPLEMENTOS = [
  { id: 'fruta',  n: '1 fruta',                        kcal: 80,  p: 1 },
  { id: 'yogur',  n: '1 yogur natural sin azúcar',     kcal: 90,  p: 7 },
  { id: 'nueces', n: '1 puñado de nueces o almendras', kcal: 130, p: 4 },
  { id: 'huevo',  n: '1 huevo duro',                   kcal: 72,  p: 6 },
  { id: 'queso',  n: '1 porción de queso (30 g)',      kcal: 85,  p: 7 },
  { id: 'leche',  n: '1 vaso de leche descremada',     kcal: 90,  p: 8 },
  { id: 'pan',    n: '1 rebanada de pan',              kcal: 70,  p: 2.4 }
];

/* Con qué se puede reemplazar lo que falta ("Tengo esto"). */
const REEMPLAZOS = {
  pollo: 'cerdo o carne magra',
  carne: 'cerdo o pollo',
  cerdo: 'pollo o carne magra',
  picada: 'pollo o carne cortados bien chiquitos',
  merluza: 'trucha u otro filet de pescado blanco',
  trucha: 'merluza o salmón rosado',
  camarones: 'pollo en cubitos',
  atun: 'caballa en lata o pollo desmenuzado',
  huevo: null,
  mila_pollo: 'milanesas de carne',
  mila_carne: 'milanesas de pollo',
  crema: 'queso crema o un chorro de leche',
  queso_crema: 'crema o yogur natural',
  yogur: 'queso crema aflojado con limón',
  mozzarella: 'cualquier queso que derrita',
  jamon: 'paleta o pechuga de pavo',
  ricota: 'queso crema',
  pesto: 'aceite de oliva, ajo y albahaca u orégano',
  tortillas: 'pan árabe',
  pan_arabe: 'tortillas de trigo',
  pan: 'pan lactal o pan árabe',
  pan_lactal: 'cualquier pan',
  noquis: 'fideos',
  tapa_tarta: null,
  papa: 'batata o puré instantáneo',
  batata: 'papa o calabaza'
};

/* Lo que no entra nunca, en ninguna parte del catálogo. Lo usa el validador. */
const PROHIBIDOS = ['zanahoria', 'ají', 'aji', 'chili', 'chile', 'picante', 'cilantro', 'romero',
  'curry', 'comino', 'jalapeño', 'tabasco', 'sriracha', 'wasabi', 'cayena', 'jengibre', 'mostaza'];
