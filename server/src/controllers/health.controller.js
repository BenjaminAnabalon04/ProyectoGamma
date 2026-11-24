// Desarrollado por: Agustín Insunsa

const db = require('../db');

function estado(req, res) {
  res.json({ status: 'ok', mensaje: 'API de Gamma funcionando' });
}

async function estadoBaseDeDatos(req, res) {
  try {
    const resultado = await db.query('SELECT COUNT(*)::int AS total FROM orden_trabajo');
    res.json({
      status: 'ok',
      mensaje: 'Base de datos conectada',
      ordenes_en_base: resultado.rows[0].total,
    });
  } catch (error) {
    console.error('Error de base de datos:', error.message);
    res.status(500).json({ status: 'error', mensaje: 'No se pudo consultar la base de datos' });
  }
}

async function estadoErp(req, res) {
  try {
    const respuesta = await fetch(`${process.env.ERP_URL || 'http://localhost:4000'}/erp/estado`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!respuesta.ok) throw new Error(`ERP respondió ${respuesta.status}`);
    const datos = await respuesta.json();
    res.json({ status: 'ok', mensaje: 'ERP simulado conectado', ...datos });
  } catch (error) {
    console.error('Error al consultar el ERP:', error.message);
    res.status(500).json({ status: 'error', mensaje: 'No se pudo conectar con el ERP simulado' });
  }
}

module.exports = { estado, estadoBaseDeDatos, estadoErp };
