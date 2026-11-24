// Desarrollado por: Agustín Insunsa
// Responsable de la base de datos: Benjamín Anabalón
// Adaptado para despliegue por: Agustín Insunsa

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const usarUrl = Boolean(process.env.DATABASE_URL);
const sslActivo = procesarSsl();

function procesarSsl() {
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;
  return usarUrl ? /[?&]sslmode=require/i.test(process.env.DATABASE_URL) : false;
}

const configuracion = usarUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslActivo ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'gamma',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
    };

const pool = new Pool(configuracion);

module.exports = pool;
