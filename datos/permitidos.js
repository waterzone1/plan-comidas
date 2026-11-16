/* ---------------------------------------------------------------
   PERMITIDOS — lo que queda fuera del plan. Editable a mano.

   kcal:  aproximadas, para la porción que dice "det"
   peso:  2 = comida completa, 1 = postre o bebida. La suma de lo
          elegido define la dificultad del juego.
   plan:  la versión dentro del plan (un plato del catálogo, con el
          carbohidrato o la salsa que más se le parece) o un texto.
   --------------------------------------------------------------- */

const PERMITIDOS = [
  { id: 'pizza',       n: 'Pizza',                    det: '4 porciones de muzzarella',        kcal: 1100, peso: 2, ic: '🍕',
    plan: { plato: 'pizzetas' }, nota: 'El mismo antojo de queso y masa crocante, con la mitad de calorías.' },
  { id: 'empanadas',   n: 'Empanadas',                det: '3 de carne',                       kcal: 850,  peso: 2, ic: '🥟',
    plan: { plato: 'tarta-carne' }, nota: 'El mismo relleno, con mucha menos masa.' },
  { id: 'sushi',       n: 'Sushi',                    det: '15 piezas con queso crema',        kcal: 800,  peso: 2, ic: '🍣',
    plan: { plato: 'trucha-sushi' }, nota: 'Todo lo del roll, en un bowl y sin arroz de más.' },
  { id: 'hamburguesa', n: 'Hamburguesa completa',     det: 'doble con cheddar y papas fritas', kcal: 1300, peso: 2, ic: '🍔',
    plan: { plato: 'hamburguesa' }, nota: 'Casera, con carne magra y sin fritas.' },
  { id: 'milanesa',    n: 'Milanesa con fritas',      det: 'napolitana grande con papas',      kcal: 1200, peso: 2, ic: '🍟',
    plan: { plato: 'mila-napo', c: 'papa_airfryer' }, nota: 'A la air fryer, con papas también a la air fryer.' },
  { id: 'lomito',      n: 'Lomito completo',          det: 'con huevo, jamón, queso y fritas', kcal: 1150, peso: 2, ic: '🥪',
    plan: { plato: 'lomito' }, nota: 'El sándwich solo, sin fritas ni agregados.' },
  { id: 'asado',       n: 'Asado',                    det: 'vacío, chorizo, pan y ensalada',   kcal: 1300, peso: 2, ic: '🍖',
    plan: { plato: 'carne-plancha', s: 'criolla' }, nota: 'Un buen bife con criolla y ensalada.' },
  { id: 'pastas',      n: 'Pastas rellenas con crema', det: 'sorrentinos con salsa de crema',  kcal: 950,  peso: 2, ic: '🍝',
    plan: { plato: 'pollo-pasta', c: 'noquis', s: 'crema' }, nota: 'Pasta con crema liviana y proteína de verdad.' },
  { id: 'pollo-frito', n: 'Pollo frito',              det: '4 piezas con papas',               kcal: 1100, peso: 2, ic: '🍗',
    plan: { plato: 'pollo-crocante' }, nota: 'Crocante de air fryer, sin aceite.' },
  { id: 'tacos',       n: 'Tacos o burrito',          det: 'de delivery, con todo',            kcal: 950,  peso: 2, ic: '🌮',
    plan: { plato: 'tacos-picada' }, nota: 'Los mismos tacos, armados en casa.' },
  { id: 'panchos',     n: 'Panchos',                  det: '2 con papas pay',                  kcal: 800,  peso: 2, ic: '🌭',
    plan: { plato: 'bondiola' }, nota: 'Un sándwich caliente con carne de verdad.' },
  { id: 'chaufa',      n: 'Comida china de delivery', det: 'chaw fan y arrolladitos',          kcal: 950,  peso: 2, ic: '🥡',
    plan: { plato: 'chaufa' }, nota: 'El mismo arroz salteado, con poco aceite.' },
  { id: 'papas',       n: 'Papas con cheddar',        det: 'porción grande con panceta',       kcal: 900,  peso: 2, ic: '🧀',
    plan: { plato: 'papa-rellena' }, nota: 'Papa, queso derretido y nada de fritura.' },
  { id: 'picada',      n: 'Picada de fiambres',       det: 'quesos, salame y pan',             kcal: 950,  peso: 2, ic: '🧆',
    plan: { plato: 'tostado' }, nota: 'Jamón y queso, pero en un tostado.' },

  { id: 'helado',      n: 'Helado',                   det: '¼ kg',                             kcal: 550,  peso: 1, ic: '🍨',
    plan: { texto: 'Yogur griego sin azúcar con fruta y un hilo de miel' } },
  { id: 'postre',      n: 'Postre',                   det: 'flan con dulce de leche o tiramisú', kcal: 450, peso: 1, ic: '🍮',
    plan: { texto: 'Yogur griego con una cucharadita de dulce de leche' } },
  { id: 'facturas',    n: 'Facturas',                 det: '3 medialunas',                     kcal: 600,  peso: 1, ic: '🥐',
    plan: { plato: 'tostadas-huevo' }, nota: 'Un desayuno salado que llena de verdad.' },
  { id: 'chocolate',   n: 'Chocolate',                det: 'una tableta de 100 g',             kcal: 540,  peso: 1, ic: '🍫',
    plan: { texto: 'Dos cuadraditos de chocolate amargo con un café' } },
  { id: 'alfajor',     n: 'Alfajor',                  det: 'triple',                           kcal: 300,  peso: 1, ic: '🍪',
    plan: { texto: 'Una fruta con una cucharada de manteca de maní' } },
  { id: 'torta',       n: 'Torta',                    det: 'una porción',                      kcal: 450,  peso: 1, ic: '🍰',
    plan: { texto: 'Yogur griego con fruta y un puñado de frutos secos' } },
  { id: 'cerveza',     n: 'Cerveza',                  det: '2 pintas',                         kcal: 420,  peso: 1, ic: '🍺',
    plan: { texto: 'Agua con gas, limón y mucho hielo' } },
  { id: 'pochoclos',   n: 'Pochoclos',                det: 'balde de cine',                    kcal: 600,  peso: 1, ic: '🍿',
    plan: { texto: 'Un puñado de pochoclo hecho en casa, sin manteca' } }
];
