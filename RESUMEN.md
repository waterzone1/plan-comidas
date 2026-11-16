# Resumen del rediseño

La app nueva se llama **Qué como** y está en la raíz. La vieja quedó entera
en `/archivo-v1/`. Se hicieron los cinco pasos, incluido el juego.

## Qué revisar primero al despertarte

1. **Abrila en el iPhone** (la misma dirección de siempre). Si la tenías
   instalada, el ícono de inicio ya abre la app nueva; puede tardar una
   apertura en actualizarse. Yo la probé en un navegador de escritorio con
   tamaño de teléfono y en Edge sin ventana: **en un iPhone real no pude
   probarla**. Mirá sobre todo que nada quede tapado por la muesca o por la
   barra de abajo, y el juego en pantalla completa.
2. **La foto**: en cualquier plato, 📷 "Poner mi foto". Tiene que abrir la
   cámara y después reemplazar la ilustración en todos lados.
3. **"Pedir receta a Claude"**: que copie y que al pegar en Claude se vea
   bien.
4. **Los gramos de un par de platos que conozcas**, en los tres modos. Los
   números cierran contra los objetivos, pero vos sabés si la porción es
   razonable. Ojo con Subir: sube mucho el carbohidrato y baja la carne
   (está explicado en `DECISIONES.md`).
5. **Una partida del juego**, para ver si la dificultad se siente bien. Es
   lo único que no pude medir de verdad.

## Qué se hizo

- **Paso 0** — La v1 pasó a `/archivo-v1/` y sigue funcionando, con su
  service worker propio. Tus datos viejos no se tocaron.
- **Datos** — 107 platos base (las 26 recetas viejas incluidas) con sus
  carbohidratos, verduras y salsas compatibles; tabla de nutrientes por
  100 g; validador.
- **App** — inicio con plato del día, ocho formas de elegir, filtros
  combinables, ficha con gramos y macros por modo, fotos propias, listas de
  compras por sección y modo compra, modo claro y oscuro, instalable y sin
  señal.
- **Ilustraciones** — 31 dibujos SVG por tipo de plato, con el color de la
  proteína. Se ven todos juntos en `pruebas/galeria.html`.
- **Juego** — "Fuerza de voluntad": 43 cartas, 10 enemigos, 3 jefes,
  15 reliquias, 6 eventos, animaciones y sonido.

## Cómo se usa cada modo

Arriba a la derecha está siempre el objetivo: **Bajar / Mantener / Subir**.
Cambia los gramos y las calorías de todo.

| Modo | Qué hace |
|---|---|
| **Plato del día** | Tres platos distintos por día. Lo que votaste 👍 aparece más. |
| ⚡ **Express** | 15 minutos o menos y un solo recipiente (53 platos). |
| ⭐ **Los de siempre** | 21 clásicos + tus favoritos, ordenados por tus votos. |
| 🥦 **Tengo esto** | Tocás lo que hay ahora. ✅ lo podés hacer · 🟡 te falta una cosa (dice cuál y con qué reemplazarla). No guarda nada. |
| 🤤 **Antojo** | Ocho antojos; podés marcar varios. |
| 🧰 **Armador** | Proteína, estilo, carbohidrato, verduras, salsa, en cualquier orden. Lo que dejaría la lista vacía se apaga, y el contador de abajo va bajando. |
| 📚 **Explorar** | Todo, por proteína y por estilo. |
| 🍱 **Vianda** | Lo que rinde y viaja bien (50 platos). |
| 🍕 **Permitidos** | Fuera del plan, con sus calorías y la versión dentro del plan al lado. |

**Filtros** (en cualquier lista): ≤10 / ≤20 / ≤30 min, sin descongelar, air
fryer, horno, microondas, una sartén, poca vajilla, con salsa, nunca hecho,
favoritos, sin cocinar.

**En la ficha**: chips para cambiar carbohidrato, verduras (hasta tres) y
salsa; el nombre, los gramos y los macros se recalculan solos. ☆ favorito,
"Lo cociné" (cuenta las veces y pregunta 👍/👎), "Pedir receta a Claude" y
"Lista de compras de este plato".

**Compras**: la lista de un plato o la lista sugerida (sale de tus favoritos
y de lo que más cocinás, sin cantidades). Las dos se copian como texto o
pasan al **modo compra**, que se va tachando y queda guardado hasta que lo
reiniciás.

**El juego**: en Permitidos tocás "Quiero este" en uno o dos, y "Empezar la
expedición". Tocás una carta para leerla y otra vez para jugarla (o tocás al
enemigo si hay varios). Arriba de cada enemigo está lo que va a hacer.
Un intento por día; si ganás, queda desbloqueado hasta que toques "Ya lo
comí".

## Pruebas (todas pasan)

```bash
node pruebas/validar.js     # 107 platos, 25.755 combinaciones dentro de ±15%
node pruebas/simular.js     # la IA gana 28% en dificultad Normal
node pruebas/offline.js     # los dos service workers no se pisan
node pruebas/navegador.js   # sin errores de consola; abre sin señal
```

## Pendientes y cosas a saber

- **Sin probar en iPhone.** Es lo más importante que queda. En particular
  la cámara, el portapapeles y el sonido del juego dependen de Safari.
- **El balance del juego es una estimación.** La IA del simulador gana 28%
  en Normal; calculo que una persona atenta queda en 30–40%, pero hay que
  jugarlo. Si resulta fácil o difícil, los números están todos en
  `juego/datos.js` (arriba de todo de `DIFICULTADES` es lo más rápido).
- **Los valores nutricionales son aproximados** (tablas por 100 g,
  redondeados). Sirven para orientar la porción, no para llevar la cuenta.
- **El ícono de la app es el de antes.** No hice uno nuevo.
- **La cebada tarda 30 minutos**, así que casi nunca aparece sugerida en los
  modos rápidos. Si la hervís de antemano como antes, se puede bajar su
  tiempo en `datos/ingredientes.js`.
- **Las pruebas de la app vieja** (`archivo-v1/pruebas/reglas.js`) marcan 12
  fallas, las mismas que marcaban antes de moverla: dependen de las fechas
  de arranque de agosto. No las toqué.
- **No hay recetas paso a paso** adentro de la app, a propósito: para eso
  está el botón de pedirle la receta a Claude.

Todo lo que decidí por mi cuenta, y por qué, está en `DECISIONES.md`.
