# Plan de comidas

PWA personal, sin backend, sin cuentas, sin sincronización. Todo el estado
vive en el `localStorage` del teléfono y todo el catálogo viaja en el bundle,
así que funciona en avión.

## La idea de fondo

El plan **no es un registro acumulado, es una función determinista**. Se
calcula cada vez, a partir de cinco hechos durables:

1. la fecha de la última compra semanal y qué no se consiguió,
2. los cambios de plato explícitos,
3. las ranuras congeladas por esos cambios (lo que ya pasó no se toca),
4. los días marcados como "no comí acá",
5. los ajustes de verdura.

Si no se abre la app durante seis días, al séptimo muestra el plan correcto
del séptimo día. Si nunca se marca nada, funciona igual, indefinidamente. Si
no se aprieta "ya compré", se asume la compra de siempre.

## El arranque

El plan empieza el **lunes 31 de agosto de 2026** (`ARRANQUE`, en
`datos/ritmo.js`). Antes de esa fecha la app no muestra comidas: muestra qué
hay que comprar para arrancar.

La primera semana es parcial —lunes a viernes, diez comidas— porque el ciclo
normal va de sábado a viernes. Eso la app lo maneja solo:

- la primera compra se calcula sobre esas diez comidas, no sobre catorce
  (800 g de pollo en vez de 1.200, sin camarones, cinco frutas),
- el fraccionado cuenta las porciones que salen de esa compra,
- la verdura perecedera aguanta dos días más, porque se compra el lunes y no
  el sábado,
- el almuerzo del lunes sigue siendo vianda, pero la app avisa que esa vez se
  cocina el mismo lunes a la mañana y no el domingo.

**La despensa arranca vacía.** Hasta que no se registre la primera compra de
alacena (también el 31 de agosto), la app no da por sentado que haya arroz,
latas ni aceite: todo aparece como faltante.

Para mover la fecha alcanza con cambiar `ARRANQUE` y, si hace falta, la
primera fecha de `FECHAS_ALACENA` en `datos/compras.js`.

## Las dos compras de verdura

La verdura entra en dos momentos y la app lo tiene en cuenta al armar la
semana:

- **Sábado**: todo lo que aguanta desde el arranque de la semana.
- **Miércoles**: rúcula, lechuga, espinaca, acelga y cherry. Es lo que
  sostiene las ensaladas del jueves y el viernes.

La **acelga y la lechuga entran solo el miércoles**, así que las guarniciones
que las llevan nunca caen antes de ese día. Es lo que hace que "Acelga,
espinaca y cebolla" pueda salir: comprada el sábado no llegaría viva.

Las cantidades de las dos listas están calculadas para que la compra sea
exactamente lo que las catorce comidas consumen, con un 5% de margen solo en
lo que aguanta (cebolla, morrón, repollitos, congelados). Lo perecedero va
justo, porque de más se pudre. El congelado bajó de 1.200 a 530 g: solo
cuatro guarniciones lo usan y el resto quedaba en el freezer.

Si cambiás el catálogo de guarniciones, las cantidades hay que recalcularlas:
son un punto fijo entre lo que se compra y lo que el generador elige.

## Compras e inventario

El inventario es un **stock que corre**: cada compra aceptada suma, y las
comidas del plan van restando a medida que pasan. No hace falta confirmar
ninguna comida: se descuenta solo.

La pantalla de Compras muestra, de cada cosa, **lo que falta para volver a
tenerla completa**, agrupado por comercio en el orden en que se recorren los
locales. Lo que ya está completo aparece apagado, con un punto y el texto
"tenés tanto".

- Un toque en el cuadrito marca **lo compré**; otro, **no lo conseguí**; otro
  lo deja sin marcar.
- La cantidad que aparece es la que falta. Si comprás otra, se escribe y entra
  esa.
- Cada sección tiene **Marcar todo**.
- **Aceptar y sumar al inventario** es lo que hace entrar todo lo marcado.
  Hasta ese momento nada se toca.
- **Copiar lo que falta** copia solo los renglones pendientes, sin lo que ya
  tenés ni lo que ya marcaste.

Ejemplo: comés el almuerzo del lunes (bolognesa con fideos). El inventario
descuenta 200 g de picada, 58 g de fideos y la verdura de la guarnición, y
esos renglones vuelven a aparecer en Compras con exactamente esa cantidad.

Lo único de la compra que cambia el plan de la semana es lo que marcás como
**no lo conseguí**. Comprar o no comprar nunca mueve los platos.

## Estructura

```
index.html            una sola pantalla, cuatro pestañas
app.css               oscura, angosta, para una mano
manifest.webmanifest  instalable en la pantalla de inicio
sw.js                 cachea todo para que ande sin señal

datos/                el catálogo — esto es lo que se edita a mano
  catalogo.js           26 platos, 25 guarniciones, ventanas de las verduras
  porciones.js          gramajes, kcal, bases y sus equivalencias
  ritmo.js              el ritmo fijo de proteínas, el freezer y el arranque
  compras.js            las listas de compra y la despensa

js/
  util.js             fechas de la semana sábado→viernes y azar determinista
  estado.js           los hechos durables, nada más
  generador.js        el algoritmo de las 14 comidas
  inventario.js       consumo, perecederos, compras y lo que falta
  ui.js               el dibujo de cada pantalla
  app.js              ruteo y eventos

pruebas/reglas.js     verifica las reglas del plan (node pruebas/reglas.js)
```

## Correrlo

```bash
python -m http.server 8080
```

Y abrir `http://localhost:8080`.

Para instalarlo en el iPhone hace falta servirlo por **HTTPS** (iOS no
instala PWAs desde HTTP salvo en localhost, y localhost no aplica desde el
teléfono). Cualquier host estático sirve: GitHub Pages, Netlify, Cloudflare
Pages. No hay nada que exponer: la app no manda datos a ningún lado.

Después, en Safari: compartir → "Agregar a inicio". Se abre sin barra de
navegador.

## Editar el catálogo

Los cuatro archivos de `datos/` son listas planas, sin lógica adentro.
Agregar un plato es agregar una línea con su grupo de proteína, las bases que
acepta y sus tags. Lo mismo con las guarniciones.

Editás, guardás y listo: la versión nueva aparece sola. El service worker le
da a la red un segundo y medio antes de usar su copia, y si detecta una
versión nueva la app se recarga una vez sola. Abajo de todo en Inventario
figura la fecha de los archivos que estás viendo, para poder confirmarlo.

Y correr las pruebas:

```bash
node pruebas/reglas.js
```

Verifican, sobre doce semanas seguidas más la del arranque, que el ritmo de
proteínas quede intacto, que no se repita ningún plato ni guarnición, que la
vianda del lunes aguante desde el domingo, que ninguna guarnición se use
antes de tener su verdura ni después de que se pase, que las de freezer
caigan al final, que las bases no se repitan dentro del mismo día, que la
compra alcance para las catorce comidas y que un cambio del martes no toque
nada anterior.

## Lo que la app no hace, a propósito

Recetas, login, sincronización, registro de calorías comida por comida,
desayuno, notificaciones push, gráficos de progreso.
