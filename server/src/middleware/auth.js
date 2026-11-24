// Desarrollado por: Agustín Insunsa

const jwt = require('jsonwebtoken');

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
    req.usuario = {
      id_usuario: Number(datos.id_usuario),
      rol: datos.rol,
      nombre: datos.nombre,
    };
    return next();
  } catch {
    return res.status(401).json({ mensaje: 'Sesión inválida o vencida' });
  }
}

function verificarRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'Falta el token de sesión' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para realizar esta acción' });
    }
    return next();
  };
}

module.exports = { verificarToken, verificarRol };
