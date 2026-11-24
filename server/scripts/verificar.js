// Desarrollado por: Agustín Insunsa

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..', '..');
const carpetas = ['server', 'erp-mock'];
let archivosRevisados = 0;

for (const carpeta of carpetas) {
  const directorio = path.join(raiz, carpeta);
  const pendientes = [directorio];
  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      if (entrada.name === 'node_modules' || entrada.name === 'uploads') continue;
      const ruta = path.join(actual, entrada.name);
      if (entrada.isDirectory()) {
        pendientes.push(ruta);
      } else if (entrada.name.endsWith('.js')) {
        execFileSync(process.execPath, ['--check', ruta], { stdio: 'pipe' });
        archivosRevisados += 1;
      }
    }
  }
}

for (const archivo of [
  'database/schema.sql',
  'database/seed.sql',
  'client/index.html',
  'client/src/main.jsx',
]) {
  if (!fs.existsSync(path.join(raiz, archivo))) {
    throw new Error(`Falta el archivo ${archivo}`);
  }
}

console.log(`Verificación correcta: ${archivosRevisados} archivos JavaScript revisados.`);
