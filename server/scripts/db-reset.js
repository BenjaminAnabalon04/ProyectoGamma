const fs = require('fs');
const path = require('path');
const db = require('../src/db');

// Este script se ejecuta con `npm run db:reset dentro de la carpeta del servidor` y reinicia la base de datos.
async function main() {
  const carpeta = path.join(__dirname, '..', '..', 'database');
  for (const archivo of ['schema.sql', 'seed.sql']) {
    const sql = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
    console.log(`Ejecutando ${archivo}...`);
    await db.query(sql);
  }
  console.log('Base de datos reiniciada: tablas y datos de prueba listos.');
}

main()
  .catch((error) => {
    console.error('Error al reiniciar la base de datos:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());