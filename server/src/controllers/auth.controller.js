const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const MAX_INTENTOS = 5;
const MENSAJE_GENERICO = 'RUT o contraseña incorrectos';

// Quita puntos, guion y espacios: "11.111.111-1" y "111111111" se tratan igual.
function normalizarRut(rut) {
  return String(rut).replace(/[.\-\s]/g, '').toUpperCase();
}

async function login(req, res) {
  const { rut, password } = req.body || {};

  if (!rut || !password) {
    return res.status(400).json({ mensaje: 'Debes ingresar RUT y contraseña' });
  }

  try {
    // Busca al usuario comparando el RUT sin puntos ni guion.
    const resultado = await db.query(
      `SELECT id_usuario, nombre, rol, password_hash, intentos_fallidos, bloqueado_hasta
         FROM usuario
        WHERE UPPER(REPLACE(REPLACE(rut, '.', ''), '-', '')) = $1
          AND activo = TRUE`,
      [normalizarRut(rut)]
    );

    const usuario = resultado.rows[0];

    // Mensaje genérico: no se revela si el RUT existe o no.
    if (!usuario) {
      return res.status(401).json({ mensaje: MENSAJE_GENERICO });
    }

    // Cuenta bloqueada por demasiados intentos.
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      return res.status(401).json({
        mensaje: 'Cuenta bloqueada temporalmente por demasiados intentos. Intenta más tarde.',
      });
    }

    const claveCorrecta = await bcrypt.compare(password, usuario.password_hash);

    if (!claveCorrecta) {
      // Suma un intento; al llegar a 5 bloquea 15 minutos y reinicia el contador.
      await db.query(
        `UPDATE usuario
            SET intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= $2 THEN 0
                                         ELSE intentos_fallidos + 1 END,
                bloqueado_hasta   = CASE WHEN intentos_fallidos + 1 >= $2
                                         THEN now() + interval '15 minutes'
                                         ELSE bloqueado_hasta END
          WHERE id_usuario = $1`,
        [usuario.id_usuario, MAX_INTENTOS]
      );
      return res.status(401).json({ mensaje: MENSAJE_GENERICO });
    }

    // Clave correcta: limpia los intentos fallidos y el bloqueo.
    await db.query(
      'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = $1',
      [usuario.id_usuario]
    );

    if (!process.env.JWT_SECRET) {
      console.error('Falta JWT_SECRET en server/.env');
      return res.status(500).json({ mensaje: 'Error de configuración del servidor' });
    }

    // PostgreSQL devuelve los BIGINT como texto, por eso el Number().
    const id_usuario = Number(usuario.id_usuario);

    const token = jwt.sign({ id_usuario, rol: usuario.rol }, process.env.JWT_SECRET, {
      expiresIn: '8h',
    });

    res.json({
      token,
      usuario: { id_usuario, nombre: usuario.nombre, rol: usuario.rol },
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ mensaje: 'No se pudo iniciar sesión' });
  }
}

module.exports = { login };