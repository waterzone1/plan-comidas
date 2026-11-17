/* Muestra los gramos de uno o más platos en los tres objetivos:
     node pruebas/porciones.js pollo-plancha atun-sandwich            */

const { app } = require('./cargar');
const { N } = app();
const ids = process.argv.slice(2);
ids.forEach(id => {
  const d = N.porId[id];
  d.c.slice(0, 3).forEach(c => {
    const k = N.comboDe(d, c, null, null);
    console.log('\n' + N.nombre(k));
    ['bajar', 'mantener', 'subir'].forEach(m => {
      const por = N.porciones(k, m), r = N.redondeados(por);
      console.log('  ' + m.padEnd(9) + r.kcal + ' kcal ' + r.p + ' g | ' + por.items.filter(i => i.rol !== 'verdura').map(i => i.txt).join(' · ') +
        ' · aceite ' + por.aceite + (por.completar.length ? '  ➕ ' + N.textoCompletar(por) + ' → ' + r.kcalTotal + '/' + r.pTotal : ''));
    });
  });
});
