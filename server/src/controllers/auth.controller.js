// Desarrollado por: Agustín Insunsa

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { normalizarRut } = require('../utils/validacion');

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const MENSAJE_GENERICO = 'RUT o contraseña incorrectos';
const HASH_FANTASMA = bcrypt.hashSync('contrasena-fantasma', 10);

async function login(req, res) {
  const { rut, password } = req.body || {};
  const rutLimpio = normalizarRut(rut);
  const clave = password === undefined || password === null ? '' : String(password);

  if (!rutLimpio || !clave.trim()) {
    return res.status(400).json({ mensaje: 'Debes ingresar RUT y contraseña' });
  }

  try {
    const resultado = await db.query(
      `SELECT id_usuario, nombre, rol, password_hash, intentos_fallidos, bloqueado_hasta
         FROM usuario
        WHERE UPPER(REPLACE(REPLACE(REPLACE(rut, '.', ''), '-', ''), ' ', '')) = $1
          AND activo = TRUE`,
      [rutLimpio]
    );

    const usuario = resultado.rows[0];

    if (usuario?.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      return res.status(401).json({
        mensaje: `Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos. Intenta más tarde.`,
      });
    }

    const claveCorrecta = usuario
      ? await bcrypt.compare(clave, usuario.password_hash)
      : await bcrypt.compare(clave, HASH_FANTASMA);

    if (!usuario || !claveCorrecta) {
      if (usuario) {
        await db.query(
          `UPDATE usuario
              SET intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= $2 THEN 0
                                           ELSE intentos_fallidos + 1 END,
                  bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= $2
                                         THEN now() + ($3 || ' minutes')::interval
                                         ELSE bloqueado_hasta END
            WHERE id_usuario = $1`,
          [usuario.id_usuario, MAX_INTENTOS, String(MINUTOS_BLOQUEO)]
        );
      }
      return res.status(401).json({ mensaje: MENSAJE_GENERICO });
    }

    await db.query(
      'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = $1',
      [usuario.id_usuario]
    );

    if (!process.env.JWT_SECRET) {
      console.error('Falta JWT_SECRET en server/.env');
      return res.status(500).json({ mensaje: 'Error de configuración del servidor' });
    }

    const id_usuario = Number(usuario.id_usuario);
    const token = jwt.sign(
      { id_usuario, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      usuario: { id_usuario, nombre: usuario.nombre, rol: usuario.rol },
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo iniciar sesión' });
  }
}

async function perfil(req, res) {
  try {
    const resultado = await db.query(
      `SELECT id_usuario, rut, nombre, correo, rol, zona
         FROM usuario
        WHERE id_usuario = $1 AND activo = TRUE`,
      [req.usuario.id_usuario]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    const fila = resultado.rows[0];
    return res.json({
      id_usuario: Number(fila.id_usuario),
      rut: fila.rut,
      nombre: fila.nombre,
      correo: fila.correo,
      rol: fila.rol,
      zona: fila.zona,
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo obtener el perfil' });
  }
}

module.exports = { login, perfil };
