# Qué como

PWA personal para decidir **qué comer ahora**. Sin backend, sin cuentas, sin
registro de comidas, sin inventario: nada que haya que mantener al día. Todo
vive en el teléfono y funciona sin señal.

La app anterior (el plan semanal con inventario) quedó en
[`archivo-v1/`](archivo-v1/) y se abre desde Ajustes.

## Estructura

```
index.html            una sola página
app.css               clara y oscura, para una mano
manifest.webmanifest  instalable
sw.js                 guarda todo para usarla sin señal

datos/                lo que se edita a mano
  ingredientes.js       nutrientes por 100 g, secciones de compra, salsas
  catalogo.js           los platos base
  permitidos.js         lo que queda fuera del plan

js/
  nucleo.js           combinaciones, porciones, filtros, listas (sin pantalla)
  ilustraciones.js    los dibujos SVG
  estado.js           favoritos, votos, lista de compras y fotos
  app.js              pantallas y eventos

juego/                "Fuerza de voluntad"
  datos.js              cartas, enemigos, reliquias, eventos y balance
  motor.js              las reglas (sin pantalla)
  ui.js / juego.css     la pantalla

pruebas/
  validar.js          node pruebas/validar.js      catálogo y macros
  simular.js          node pruebas/simular.js      balance del juego
  offline.js          node pruebas/offline.js      service workers
  navegador.js        node pruebas/navegador.js    la app en un navegador real
  galeria.html        todas las ilustraciones juntas
```

## Correrla

```bash
python -m http.server 8080
```

Y abrir `http://localhost:8080`. Publicada en GitHub Pages se instala en el
iPhone desde Safari: compartir → "Agregar a inicio".

## Agregar un plato

Una entrada más en `datos/catalogo.js`: grupo de proteína, estilo,
carbohidratos, verduras y salsas compatibles, tiempo, equipo y antojos. El
encabezado del archivo explica cada campo. Después:

```bash
node pruebas/validar.js
```

Avisa si aparece algo prohibido, si falta una sección de compra o si alguna
combinación queda a más de ±15% de las calorías, corta de proteína, o con
alguna porción fuera de lo normal. Los desayunos y las recomendaciones
(recetas fijas, sin combinaciones) están en `datos/recetario.js`.

## Tocar el balance del juego

Todos los números están en `juego/datos.js`. Después de cambiarlos:

```bash
node pruebas/simular.js 3000 -v
```

## Publicar una versión nueva

Subir el número de `VERSION` en `sw.js` (`quecomo-v2-N`) cuando se agregan o
se sacan archivos. Para cambios de contenido no hace falta: el service worker
le da un segundo y medio a la red antes de usar su copia.

Las decisiones del rediseño están en [`DECISIONES.md`](DECISIONES.md).
