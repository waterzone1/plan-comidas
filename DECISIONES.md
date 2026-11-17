# Decisiones tomadas durante el rediseño

Trabajé sin preguntar, como pediste. Acá está cada cosa que tuve que decidir
por mi cuenta, con el porqué, para que puedas revertir lo que no te cierre.

## Antes de empezar

- **El repo.** La sesión estaba abierta en otro proyecto (el sistema
  odontológico), no en plan-comidas. Busqué en el disco la copia cuyo remoto
  es `waterzone1/plan-comidas` (`Desktop/Variado/Proyectos activos/Nutricion`)
  y trabajé ahí. Del otro repo no toqué nada.
- **Nombre.** La app nueva se llama **Qué como**. El nombre viejo ("Plan")
  describía justo lo que dejó de ser.
- **Commits.** Llevan la línea `Co-Authored-By` de Claude. Si preferís que no,
  decímelo y de acá en más no la pongo.

## Archivo de la v1

- Vive entera en `/archivo-v1/`, con su service worker y su manifest. Se abre
  desde Ajustes → "Abrir la app vieja".
- Su service worker borraba *todos* los cachés que no fueran el suyo: habría
  borrado el de la app nueva. Ahora cada uno borra solo los de su prefijo
  (`plan-v1-archivo-` y `quecomo-`). El de la raíz además limpia el `plan-v3`
  que había dejado la v1.
- Los datos de la v1 (`plan.comidas.v1` en localStorage) no se tocan: si abrís
  el archivo, tu inventario sigue ahí. La app nueva usa `v2:estado`,
  `v2:juego` y la base `v2:fotos`.

## Catálogo

- **107 platos base** (22 pollo, 14 carne, 12 picada, 7 cerdo, 9 merluza,
  7 trucha, 8 camarones, 10 huevo, 10 atún, 8 legumbres). Las 26 recetas de
  la v1 están todas; el validador lo comprueba.
- **Lo que cambió de las recetas viejas:**
  - "Tortilla de papa" ahora es *con jamón y queso*: con huevo solo no llega
    ni cerca a 50 g de proteína sin pasarse de calorías.
  - "Bola de lomo a la plancha" pasó a llamarse "Bife a la plancha".
  - "Pollo a la plancha con huevo" quedó como plato aparte.
  - Saqué la **verdura mixta congelada**: casi todas las mezclas traen
    zanahoria. Brócoli, espinaca, chauchas y coliflor sirven congelados.
  - El tomate perita se fusionó con el tomate.
- **Legumbres y huevo.** Con legumbres o huevo como única proteína no se
  puede llegar a 50 g en el modo Bajar (demasiadas calorías por gramo de
  proteína). Por eso esos platos llevan siempre un acompañante magro: atún,
  pollo, carne, cerdo o jamón. El grupo "Legumbres" son los platos donde la
  legumbre es la protagonista.
- **Prohibidos.** Además de zanahoria, picante, cilantro y romero, tomé como
  "especias fuertes": curry, comino, jengibre y mostaza. El ajo, el pimentón
  dulce y el orégano sí están (ya los usabas). El validador busca todas esas
  palabras en todo el catálogo, incluidos los nombres generados.
- **Sumé** cerdo (carré o solomillo), batata asada, papa al microondas y al
  horno, pan lactal, pan árabe, tortillas y tapa de tarta. Salsas nuevas:
  rosa, blanca, verdeo, queso crema, pesto, barbacoa, agridulce, maní, yogur,
  criolla, limón, ajillo y vino blanco. Tomate, crema, teriyaki y soja van
  primeras donde aplican.
- **El ícono de "Tengo esto"** es 🥦 y no 🥕: nada de zanahoria, ni dibujada.

## Porciones y macros

- Cada combinación se resuelve sola: la app prueba gramos de proteína y de
  carbohidrato y se queda con los que más se acercan a 50 g de proteína y a
  las kcal del modo (550 / 750 / 950). Desde la 2.1 lo hace **dentro de
  porciones normales** (ver "Versión 2.1" al final).
- La verdura cambia con el modo (más en Bajar, menos en Subir), el aceite
  también (1 cucharadita / 1 cucharada / hasta 2), y los extras fijos (queso,
  jamón) van al 75% en Bajar.
- **El validador revisa unas 28.000 combinaciones × modo y todas quedan
  dentro de ±15%** en kcal, y nunca cortas de proteína. Para lograrlo tuve
  que sacar algunas opciones de algunos platos (por ejemplo, palta en las
  milanesas).
- Proteínas y verduras se pesan **en crudo**; arroz, fideos, polenta y cebada
  **cocidos**, con el equivalente en seco al lado; la papa, en crudo.
- Valores por 100 g: USDA FoodData Central y tablas argentinas, redondeados.
  La carne picada está cargada como magra (150 kcal / 20,5 g).

## Modos y filtros

- **Express** = 15 minutos o menos *y un solo recipiente, contando el del
  carbohidrato*. Por eso un salteado con arroz no entra y sí entran wraps,
  platos con puré instantáneo, con legumbres de lata o con papa al
  microondas. Quedan 53 platos.
- Los filtros de equipo (air fryer, horno, microondas) miran el equipo del
  plato principal, no el del carbohidrato.
- Con filtros activos, la app cambia sola el carbohidrato o la salsa
  sugeridos para que el plato cumpla (ej. "≤ 10 min" te ofrece puré en vez
  de arroz).
- **Tengo esto**: la alacena (arroz, fideos, polenta, latas, salsas de
  frasco, aceite, condimentos, choclo y arvejas) se da por hecha. ✅ = con lo
  que tocaste alcanza; 🟡 = falta una sola cosa fresca. Dejé tocar hasta 6
  ingredientes en vez de 3.
- **Antojo**: marcar varios exige todos; si ninguno cumple todos, muestra los
  que cumplen alguno y lo avisa.
- **Los de siempre**: 21 curados + tus favoritos. Lo que votás 👎 sale de la
  lista (salvo que sea favorito).
- **Plato del día**: sale de la fecha, no repite los de ayer, son tres
  proteínas y tres estilos distintos, y lo que votaste 👍 aparece más. Se
  fija la primera vez que abrís la app en el día.
- **Permitidos**: se pueden elegir hasta dos por partida.

## Ficha, fotos y listas

- "Pedir receta a Claude" copia el pedido, lo muestra (por si el portapapeles
  falla) y ofrece abrir claude.ai.
- La foto usa la cámara directo (`capture`), se achica a 1200 px en JPEG 0,8
  y reemplaza la ilustración en todos lados.
- En las listas, lo que es de alacena no va en las secciones: aparece aparte
  como "Revisar que haya en casa". Los cereales se listan en gramos en seco.
- Sumar un segundo plato al modo compra acumula cantidades.
- Agregué una copia de seguridad en texto (Ajustes), que no estaba pedida:
  es lo único que protege tus favoritos si Safari borra los datos.

## El juego

- **Tono.** Sobrio: figuras geométricas, fondo oscuro, sin personajes. La
  vida es "Voluntad", el bloqueo "Calma", la fuerza "Convicción".
- **Estructura.** Combate, cruce (evento o tienda), combate, cruce (descanso
  o evento), combate difícil con reliquia, cruce (descanso o tienda), jefe.
  43 cartas (todas con versión mejorada), 10 enemigos, 3 jefes,
  15 reliquias, 6 eventos. Empezás con una reliquia al azar.
- **Dificultad.** Un postre o bebida solo = Leve; una comida = Normal; comida
  + postre = Alta; dos comidas = Brutal. Sube un escalón si ganaste en alguna
  de las últimas dos partidas, baja uno si perdiste las últimas dos, y dos si
  perdiste las últimas tres.
- **Un intento por día.** La partida se guarda después de cada acción, con el
  estado del azar adentro: recargar no cambia nada. Se puede salir y seguir
  más tarde el mismo día. Una partida sin terminar de un día anterior cuenta
  como derrota.
- **El premio.** Ganar desbloquea lo elegido hasta que toques "Ya lo comí"
  (o por 7 días).
- **Balance.** El simulador juega con una IA simple que gana **28% en Normal**
  (64% Leve, 13% Alta, 5% Brutal) en unos 34 turnos, que son 12 a 14 minutos.
  Esa IA no planifica ni arma sinergias, así que una persona atenta debería
  andar algo arriba: en el rango de 30–40% que pediste. Es una estimación:
  no hay forma de medirlo sin que juegues.
- El sonido arranca activado; se apaga desde el menú de pausa (☰).

## Pruebas

- `pruebas/validar.js` — catálogo, prohibidos, macros, nombres, secciones.
- `pruebas/simular.js` — balance del juego.
- `pruebas/offline.js` — los dos service workers, con dobles.
- `pruebas/navegador.js` — abre la app en Edge o Chrome sin ventana y
  comprueba consola limpia, service workers activos y uso sin señal. Lo
  agregué porque el navegador que yo uso para mirar la app no permite
  registrar service workers.

## Versión 2.1

### Porciones con sentido

- **El problema**: para llegar a las calorías la app estiraba lo único que
  podía estirar. Salían sándwiches de 8 rebanadas de pan, 80 g de pollo con
  600 g de polenta, o una tarta entera para uno. Los números cerraban; los
  platos no.
- **Qué cambió**: cada ingrediente tiene ahora un mínimo y un máximo de lo
  que entra en un plato de verdad (`lim` en `datos/ingredientes.js`): pollo
  120–250 g, carne 120–220 g, arroz cocido hasta 300 g, papa hasta 450 g,
  pan lactal hasta 4 rebanadas, tortillas 2 a 4, media tapa de tarta como
  mucho. Un sándwich nunca lleva menos de dos rebanadas (`lc` en el plato).
- **Si con eso no se llega al objetivo**, la app no infla nada: la ficha dice
  con qué completar (una fruta, un yogur, un puñado de frutos secos). Pasa
  casi solo en Subir (12% de las combinaciones), con platos livianos como
  sándwiches, wraps y milanesas.
- **La proteína nunca baja al subir de objetivo**: Mantener parte de los
  gramos de Bajar y Subir de los de Mantener; lo que crece es la guarnición.
  Pasarse un poco de 50 g de proteína no se castiga (quedan entre 50 y 65).
- Los sándwiches y wraps llevan la mitad de aceite, y los fríos de atún,
  nada: no tiene sentido "2 cucharadas de aceite" en un sándwich.
- El validador ahora falla si alguna porción se sale de esos límites, y con
  `-v` lista la porción más grande de cada cosa.

### Armador

- Elegir pollo + plancha + fideos dejaba en gris morrón, cebolla y
  champiñones. Causa: el armador solo ofrece lo que combina con los platos
  que quedan, y a los platos "a la plancha" yo les había cargado solo
  verduras "de guarnición" (brócoli, chauchas, ensalada); lo salteado estaba
  solo en los de wok y de salsa.
- Arreglo: las verduras salteadas (morrón, cebolla, champiñones) ahora
  también van al costado de cualquier plancha, y hay un plato nuevo, "Pollo
  a la plancha con fideos" con salsa (tomate, crema, rosa, pesto, queso
  crema). El armador explica que lo gris no combina con lo ya elegido.

### Desayuno

- 13 desayunos básicos (`DESAYUNOS` en `datos/recetario.js`), salados y
  dulces, con sus pasos. No pasan por el cálculo de platos: tienen
  cantidades fijas para cada objetivo (chica / media / grande), entre unas
  250 y 550 kcal.
- La estructura sale del plan de alimentación: una proteína (huevos, yogur,
  leche) + un hidrato (pan, avena, granola) + fruta, y más hidrato los días
  de más gasto.

### Recomendaciones

- 105 recetas puntuales tomadas del recetario de comidas saludables, con
  ingredientes y pasos resumidos con mis palabras. No llevan gramos por
  objetivo porque el recetario casi nunca da cantidades por porción.
- **Adaptadas**: a las que llevaban algo que no comés se lo saqué (marcadas
  "Adaptada"). No entraron las que dependían de eso: las de zanahoria
  (pastel, torta, pizza, mayonesa, alfajores, galletas, pancake, smoothie y
  licuado) y los garbanzos quedaron al pimentón dulce.
- Junté las casi repetidas (seis budines de banana → tres; cuatro trufas →
  tres) y saqué los polvos difíciles de conseguir (spirulina, moringa, maca)
  dejando la receta base.
- **Al catálogo, con gramos calculados, entraron 10 platos nuevos**: pollo a
  la naranja, pollo oriental, pollo a la plancha con fideos, berenjenas
  rellenas, papas rellenas de carne, lasaña de carne y espinaca, tarta de
  zapallitos, tortilla de acelga y arroz, revuelto de huevo y verduras al
  wok, y rollitos de zapallito con atún. Quedan 117. Las recetas de pura
  verdura (pizza de coliflor, rollitos de berenjena) quedaron solo en
  Recomendaciones: no llegan a 50 g de proteína sin cambiarlas.
- En el repo no se nombra de dónde sale el recetario ni se guardó ningún
  PDF: el repositorio es público.

### Plan de alimentación

- No se copió: es tuyo y tiene muchas cosas que no comés. Lo usé para tres
  cosas: la estructura de los desayunos, los topes de porción (250 g de
  pollo o cerdo, 200 g cocidos de arroz o fideos) y una equivalencia que
  quedó escrita en Ajustes: **día sin entrenar ≈ Bajar, día con
  entrenamiento ≈ Mantener** (sale de sumar las porciones del plan: unas 550
  y unas 750 kcal por comida).
- No hice: frutas como colación, "carne vacuna solo al mediodía y dos veces
  por semana", ni menú semanal. La app no lleva registro del día ni
  calendario, y eso lo pediste así.
