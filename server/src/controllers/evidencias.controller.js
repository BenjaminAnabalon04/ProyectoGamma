// Desarrollado por: Aaron Ponse
// Integrado por: Agustín Insunsa

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const db = require('../db');
const { esUuid, texto, hojaDelTecnico, rutValido } = require('../utils/validacion');

const TAMANO_MAXIMO = 5 * 1024 * 1024;
const FORMATOS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const TIPOS_CONTENIDO = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function extraerImagen(archivo) {
  const contenido = typeof archivo === 'string' ? archivo.trim() : '';
  const conPrefijo = contenido.match(
    /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i
  );

  if (conPrefijo) {
    return { base64: conPrefijo[2], formato: conPrefijo[1].toLowerCase() };
  }
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(contenido) && contenido.length % 4 === 0) {
    return { base64: contenido, formato: null };
  }
  return null;
}

function detectarFormato(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

function coordenada(valor, minimo, maximo) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

function responderEvidencia(fila) {
  return {
    id_evidencia: fila.id_evidencia,
    id_hoja: fila.id_hoja,
    tipo: fila.tipo,
    clave_archivo: fila.clave_archivo,
    formato: fila.formato,
    sha256: fila.sha256 ?? null,
    url: `/evidencias/${fila.id_evidencia}/archivo`,
    fecha_captura: fila.fecha_captura,
  };
}

async function registrarEvidencia(req, res) {
  const { id_hoja, id_evidencia, tipo, formato } = req.body || {};
  const tipoLimpio = texto(tipo, 10)?.toLowerCase();

  if (!esUuid(id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }
  if (id_evidencia !== undefined && !esUuid(id_evidencia)) {
    return res.status(400).json({ mensaje: 'id_evidencia debe ser un UUID válido' });
  }
  if (tipoLimpio !== 'foto' && tipoLimpio !== 'firma') {
    return res.status(400).json({ mensaje: "tipo debe ser 'foto' o 'firma'" });
  }

  const imagen = extraerImagen(req.body?.archivo);
  if (!imagen) {
    return res.status(400).json({ mensaje: 'La imagen debe venir en base64 (data URL)' });
  }

  const nombreFirmante = tipoLimpio === 'firma' ? texto(req.body?.nombre_firmante, 120) : null;
  const rutFirmante = tipoLimpio === 'firma' ? texto(req.body?.rut_firmante, 20) : null;
  if (tipoLimpio === 'firma' && (!nombreFirmante || !rutFirmante)) {
    return res
      .status(400)
      .json({ mensaje: 'La firma necesita nombre y RUT de quien firma' });
  }
  if (tipoLimpio === 'firma' && !rutValido(rutFirmante)) {
    return res.status(400).json({ mensaje: 'El RUT del firmante no es válido' });
  }

  const buffer = Buffer.from(imagen.base64, 'base64');
  if (buffer.length === 0 || buffer.length > TAMANO_MAXIMO) {
    return res.status(400).json({ mensaje: 'La imagen debe pesar entre 1 byte y 5 MB' });
  }

  const detectado = detectarFormato(buffer);
  if (!detectado) {
    return res.status(400).json({ mensaje: 'El archivo no es una imagen JPG, PNG o WEBP válida' });
  }

  const declarado = (texto(formato, 10) || imagen.formato || '').toLowerCase().replace('jpeg', 'jpg');
  if (declarado && !FORMATOS.has(declarado)) {
    return res.status(400).json({ mensaje: 'Formato de imagen no admitido (jpg, png o webp)' });
  }
  if (declarado && declarado !== detectado) {
    return res
      .status(400)
      .json({ mensaje: 'El formato declarado no coincide con el contenido del archivo' });
  }

  const extension = detectado;
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  try {
    const hoja = await hojaDelTecnico(db, id_hoja, req.usuario.id_usuario);
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    const idEvidencia = id_evidencia || crypto.randomUUID();
    const previa = await db.query(
      `SELECT id_evidencia, id_hoja, tipo, clave_archivo, formato, sha256, fecha_captura
         FROM evidencia
        WHERE id_evidencia = $1`,
      [idEvidencia]
    );

    if (previa.rows.length > 0) {
      const fila = previa.rows[0];
      if (fila.id_hoja !== id_hoja || fila.tipo !== tipoLimpio) {
        return res.status(409).json({ mensaje: 'Ese id_evidencia ya pertenece a otro registro' });
      }
      return res.json(responderEvidencia(fila));
    }

    const claveArchivo = `${idEvidencia}.${extension}`;
    const rutaArchivo = path.join(process.env.UPLOADS_DIR, claveArchivo);
    await fs.writeFile(rutaArchivo, buffer);

    try {
      const insercion = await db.query(
        `INSERT INTO evidencia
           (id_evidencia, id_hoja, id_usuario, tipo, clave_archivo, formato,
            latitud, longitud, nombre_firmante, rut_firmante, estado_carga, sha256)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'GUARDADO', $11)
         RETURNING id_evidencia, id_hoja, tipo, clave_archivo, formato, sha256, fecha_captura`,
        [
          idEvidencia,
          id_hoja,
          req.usuario.id_usuario,
          tipoLimpio,
          claveArchivo,
          extension,
          coordenada(req.body?.latitud, -90, 90),
          coordenada(req.body?.longitud, -180, 180),
          nombreFirmante,
          rutFirmante,
          sha256,
        ]
      );
      return res.status(201).json(responderEvidencia(insercion.rows[0]));
    } catch (errorDb) {
      await fs.unlink(rutaArchivo).catch(() => {});
      throw errorDb;
    }
  } catch (error) {
    console.error('Error al guardar evidencia:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo guardar la evidencia' });
  }
}

async function listarEvidencias(req, res) {
  if (!esUuid(req.params.id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }

  try {
    const hoja = await hojaDelTecnico(db, req.params.id_hoja, req.usuario.id_usuario, {
      permitirEnviada: true,
    });
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    const resultado = await db.query(
      `SELECT id_evidencia, id_hoja, tipo, clave_archivo, formato, sha256, fecha_captura,
              latitud, longitud, nombre_firmante, rut_firmante
         FROM evidencia
        WHERE id_hoja = $1
        ORDER BY fecha_captura, id_evidencia`,
      [req.params.id_hoja]
    );
    return res.json(resultado.rows.map(responderEvidencia));
  } catch (error) {
    console.error('Error al listar evidencias:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron obtener las evidencias' });
  }
}

async function descargarArchivo(req, res) {
  const { id_evidencia } = req.params;
  if (!esUuid(id_evidencia)) {
    return res.status(400).json({ mensaje: 'id_evidencia debe ser un UUID válido' });
  }

  try {
    const resultado = await db.query(
      `SELECT e.clave_archivo, e.formato, a.id_tecnico
         FROM evidencia e
         JOIN hoja_servicio hs ON hs.id_hoja = e.id_hoja
         JOIN asignacion a ON a.id_asignacion = hs.id_asignacion
        WHERE e.id_evidencia = $1`,
      [id_evidencia]
    );

    const fila = resultado.rows[0];
    if (!fila) return res.status(404).json({ mensaje: 'Evidencia no encontrada' });

    const esAdmin = req.usuario.rol === 'administrador';
    if (!esAdmin && Number(fila.id_tecnico) !== Number(req.usuario.id_usuario)) {
      return res.status(404).json({ mensaje: 'Evidencia no encontrada' });
    }

    const nombreArchivo = path.basename(fila.clave_archivo);
    const contenido = await fs.readFile(path.join(process.env.UPLOADS_DIR, nombreArchivo));

    res.setHeader('Content-Type', TIPOS_CONTENIDO[fila.formato] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
    return res.send(contenido);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    console.error('Error al leer evidencia:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo leer la evidencia' });
  }
}

module.exports = { registrarEvidencia, listarEvidencias, descargarArchivo };