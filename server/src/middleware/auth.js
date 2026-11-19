const jwt = require('jsonwebtoken');

// Revisa el encabezado "Authorization: Bearer <token>".
// Si el token es válido, deja los datos del usuario en req.usuario y sigue.
function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Falta el token de sesión' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en server/.env');
    return res.status(500).json({ mensaje: 'Error de configuración del servidor' });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id_usuario: datos.id_usuario, rol: datos.rol };
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Sesión inválida o vencida' });
  }
}

module.exports = { verificarToken };