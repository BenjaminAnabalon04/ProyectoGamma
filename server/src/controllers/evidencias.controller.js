// Desarrollado por: Aaron Ponse
// Integrado por: Agustín Insunsa

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const db = require('../db');
const { esUuid, texto, hojaDelTecnico } = require('../utils/validacion');

const TAMANO_MAXIMO = 5 * 1024 * 1024;
const FORMATOS = new Set(['jpg', 'jpeg', 'png', 'webp']);

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
    url: `/uploads/${fila.clave_archivo}`,
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

  const buffer = Buffer.from(imagen.base64, 'base64');
  if (buffer.length === 0 || buffer.length > TAMANO_MAXIMO) {
    return res.status(400).json({ mensaje: 'La imagen debe pesar entre 1 byte y 5 MB' });
  }

  const extension = (texto(formato, 10) || imagen.formato || '').toLowerCase().replace('jpeg', 'jpg');
  if (!FORMATOS.has(extension)) {
    return res.status(400).json({ mensaje: 'Formato de imagen no admitido (jpg, png o webp)' });
  }

  const nombreFirmante = tipoLimpio === 'firma' ? texto(req.body?.nombre_firmante, 120) : null;
  const rutFirmante = tipoLimpio === 'firma' ? texto(req.body?.rut_firmante, 20) : null;
  if (tipoLimpio === 'firma' && (!nombreFirmante || !rutFirmante)) {
    return res
      .status(400)
      .json({ mensaje: 'La firma necesita nombre y RUT de quien firma' });
  }

  try {
    const hoja = await hojaDelTecnico(db, id_hoja, req.usuario.id_usuario);
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    const idEvidencia = id_evidencia || crypto.randomUUID();
    const previa = await db.query(
      `SELECT id_evidencia, id_hoja, tipo, clave_archivo, formato, fecha_captura
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
            latitud, longitud, nombre_firmante, rut_firmante, estado_carga)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'GUARDADO')
         RETURNING id_evidencia, id_hoja, tipo, clave_archivo, formato, fecha_captura`,
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
      `SELECT id_evidencia, id_hoja, tipo, clave_archivo, formato, fecha_captura,
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

module.exports = { registrarEvidencia, listarEvidencias };
