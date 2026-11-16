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
  las kcal del modo (550 / 750 / 950).
- La verdura cambia con el modo (más en Bajar, menos en Subir), el aceite
  también (1 cucharadita / 1 cucharada / hasta 2), y los extras fijos (queso,
  jamón) van al 75% en Bajar.
- **El validador revisa 25.755 combinaciones × modo y todas quedan dentro de
  ±15%** en kcal y en proteína. Para lograrlo tuve que sacar algunas opciones
  de algunos platos (por ejemplo, palta en las milanesas).
- Un efecto que puede sorprender: en **Subir** la carne *baja* y el
  carbohidrato sube mucho (ej. 140 g de pollo con 400 g de arroz cocido). Es
  correcto: el objetivo de proteína es fijo y el arroz también aporta. Si
  preferís que en Subir suba también la proteína, es cambiar un número
  (`PROTEINA_OBJETIVO` por modo en `js/nucleo.js`).
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
