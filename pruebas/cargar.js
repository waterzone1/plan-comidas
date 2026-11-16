/* Carga los archivos de la app en un contexto aislado, igual que los
   carga el navegador (uno atrás del otro, compartiendo los const). */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const raiz = path.join(__dirname, '..');

function cargar(archivos, exportar) {
  const ctx = { console };
  vm.createContext(ctx);
  archivos.forEach(f => vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f }));
  return vm.runInContext('({' + exportar.join(',') + '})', ctx);
}

const DATOS = ['datos/ingredientes.js', 'datos/catalogo.js', 'datos/permitidos.js', 'js/nucleo.js'];
const NOMBRES = ['N', 'INGREDIENTES', 'SALSAS', 'SECCIONES', 'PLATOS', 'PROTEINAS', 'ESTILOS',
  'ANTOJOS', 'EQUIPOS', 'TRIOS', 'PERMITIDOS', 'PROHIBIDOS', 'REEMPLAZOS'];

module.exports = { raiz, cargar, app: () => cargar(DATOS, NOMBRES) };
