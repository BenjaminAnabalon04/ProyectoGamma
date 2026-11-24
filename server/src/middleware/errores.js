// Desarrollado por: Agustín Insunsa

function noEncontrado(req, res) {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
}

function manejadorErrores(error, req, res, next) {
  console.error('Error no controlado:', error.message);
  if (error.status === 400 || error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la petición no es válido' });
  }
  return res
    .status(500)
    .json({ mensaje: 'Error interno del servidor. Intenta nuevamente más tarde.' });
}

module.exports = { noEncontrado, manejadorErrores };
