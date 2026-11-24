// Desarrollado por: Sergio

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const extensiones = new Set(['.js', '.jsx', '.css', '.sql']);
const carpetas = ['client/src', 'client/public', 'server/src', 'server/scripts', 'server/tests', 'erp-mock', 'database'];
const archivosSueltos = ['client/vite.config.js', 'client/eslint.config.js'];
const autorizacion = /Desarrollado por:|Responsable de la base de datos:|Integrado por:|Adaptado para despliegue por:|Colaboración:/;
const propiedadCss = /^--[a-zA-Z-]+\s*:/;
const selectorUniversal = /^\*\s*[{,]/;
const errores = [];
let revisados = 0;

function revisar(archivo) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  const lineas = contenido.split(/\r?\n/);
  revisados += 1;

  lineas.forEach((linea, indice) => {
    const recortada = linea.trim();
    if (!/^(\/\/|\/\*|\*|--)/.test(recortada)) return;
    if (propiedadCss.test(recortada)) return;
    if (selectorUniversal.test(recortada)) return;
    if (autorizacion.test(recortada)) return;
    errores.push(`${path.relative(raiz, archivo)}:${indice + 1}: ${recortada}`);
  });
}

function recorrer(carpeta) {
  const directorio = path.join(raiz, carpeta);
  if (!fs.existsSync(directorio)) return;

  const pendientes = [directorio];
  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'uploads', '.vite'].includes(entrada.name)) continue;
      const ruta = path.join(actual, entrada.name);
      if (entrada.isDirectory()) {
        pendientes.push(ruta);
      } else if (extensiones.has(path.extname(entrada.name))) {
        revisar(ruta);
      }
    }
  }
}

carpetas.forEach(recorrer);
archivosSueltos.forEach((archivo) => revisar(path.join(raiz, archivo)));

if (errores.length > 0) {
  console.error('Comentarios sin autoría encontrados:');
  errores.forEach((error) => console.error(`  ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Comentarios verificados: ${revisados} archivos, solo autoría permitida.`);
}
