const db = require('../db');

// Responde que el servidor está vivo.
function estado(req, res) {
  res.json({ status: 'ok', mensaje: 'API de Gamma funcionando' });
}

// Consulta la base de datos para comprobar que la conexión funciona.
async function estadoBaseDeDatos(req, res) {
  try {
    const resultado = await db.query('SELECT COUNT(*)::int AS total FROM orden_trabajo');
    res.json({
      status: 'ok',
      mensaje: 'Base de datos conectada',
      ordenes_en_base: resultado.rows[0].total,
    });
  } catch (error) {
    // El detalle del error queda en la terminal; al cliente se le da un mensaje general.
    console.error('Error de base de datos:', error.message);
    res.status(500).json({ status: 'error', mensaje: 'No se pudo consultar la base de datos' });
  }
}

module.exports = { estado, estadoBaseDeDatos };