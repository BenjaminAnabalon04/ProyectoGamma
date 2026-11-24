// Desarrollado por: Agustín Insunsa
// Colaboración: Benjamin Anabalón (D2)

const db = require('../db');
const { enteroPositivo, esUuid, hojaDelTecnico } = require('../utils/validacion');

async function plantillaPorTipo(dbClient, tipoServicio) {
  const resultado = await dbClient.query(
    `SELECT id_checklist, nombre, tipo_servicio, version
       FROM checklist
      WHERE LOWER(tipo_servicio) = LOWER($1) AND activo = TRUE
      ORDER BY version DESC, id_checklist ASC
      LIMIT 1`,
    [tipoServicio]
  );
  return resultado.rows[0] || null;
}

async function plantillaPorId(dbClient, idChecklist) {
  const resultado = await dbClient.query(
    `SELECT id_checklist, nombre, tipo_servicio, version
       FROM checklist
      WHERE id_checklist = $1 AND activo = TRUE`,
    [idChecklist]
  );
  return resultado.rows[0] || null;
}

async function obtenerChecklist(req, res) {
  const { id_checklist } = req.params;
  const { id_hoja, tipo_servicio } = req.query;
  const idChecklistParam = enteroPositivo(id_checklist);

  try {
    let checklist = null;
    let respuestasPrevias = [];

    if (id_hoja) {
      const hoja = await hojaDelTecnico(db, id_hoja, req.usuario.id_usuario, {
        permitirEnviada: true,
      });
      if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

      checklist = await plantillaPorId(db, hoja.id_checklist);
      if (!checklist && hoja.tipo_servicio) {
        checklist = await plantillaPorTipo(db, hoja.tipo_servicio);
      }

      const respuestas = await db.query(
        `SELECT id_item, resultado, observacion
           FROM respuesta_checklist
          WHERE id_hoja = $1`,
        [id_hoja]
      );
      respuestasPrevias = respuestas.rows;
    } else if (idChecklistParam) {
      checklist = await plantillaPorId(db, idChecklistParam);
    } else if (tipo_servicio) {
      checklist = await plantillaPorTipo(db, String(tipo_servicio).trim());
    } else {
      return res
        .status(400)
        .json({ mensaje: 'Debes indicar id_checklist, id_hoja o tipo_servicio' });
    }

    if (!checklist) {
      return res.status(404).json({ mensaje: 'No se encontró un checklist activo' });
    }

    const items = await db.query(
      `SELECT id_item, pregunta, obligatorio, orden
         FROM item_checklist
        WHERE id_checklist = $1
        ORDER BY orden ASC, id_item ASC`,
      [checklist.id_checklist]
    );

    return res.json({
      id_checklist: Number(checklist.id_checklist),
      nombre: checklist.nombre,
      tipo_servicio: checklist.tipo_servicio,
      version: checklist.version,
      items: items.rows.map((item) => ({
        id_item: Number(item.id_item),
        pregunta: item.pregunta,
        obligatorio: Boolean(item.obligatorio),
        orden: Number(item.orden),
      })),
      respuestas: respuestasPrevias.map((respuesta) => ({
        id_item: Number(respuesta.id_item),
        resultado: respuesta.resultado || '',
        observacion: respuesta.observacion || '',
      })),
    });
  } catch (error) {
    console.error('Error al obtener checklist:', error.message);
    return res.status(500).json({ mensaje: 'Error al cargar el checklist' });
  }
}

async function guardarRespuestas(req, res) {
  const { id_hoja } = req.params;
  const { respuestas } = req.body || {};

  if (!esUuid(id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }
  if (!Array.isArray(respuestas)) {
    return res.status(400).json({ mensaje: 'El campo respuestas debe ser un arreglo' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const hoja = await hojaDelTecnico(client, id_hoja, req.usuario.id_usuario);
    if (!hoja) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });
    }

    let guardadas = 0;

    for (const respuesta of respuestas) {
      const idItem = enteroPositivo(respuesta?.id_item);
      if (!idItem) continue;

      const item = await client.query(
        `SELECT id_item, pregunta
           FROM item_checklist
          WHERE id_item = $1 AND id_checklist = $2`,
        [idItem, hoja.id_checklist]
      );
      if (item.rows.length === 0) continue;

      const resultado =
        respuesta.resultado === undefined || respuesta.resultado === null
          ? null
          : String(respuesta.resultado).trim().slice(0, 30) || null;
      const observacion =
        respuesta.observacion === undefined || respuesta.observacion === null
          ? null
          : String(respuesta.observacion).slice(0, 2000) || null;

      await client.query(
        `INSERT INTO respuesta_checklist (id_hoja, id_item, pregunta_texto, resultado, observacion)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_hoja, id_item)
         DO UPDATE SET
           pregunta_texto = EXCLUDED.pregunta_texto,
           resultado = EXCLUDED.resultado,
           observacion = EXCLUDED.observacion`,
        [id_hoja, idItem, item.rows[0].pregunta, resultado, observacion]
      );
      guardadas += 1;
    }

    await client.query('COMMIT');
    return res.json({ guardadas });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar respuestas de checklist:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron guardar las respuestas' });
  } finally {
    client.release();
  }
}

module.exports = { obtenerChecklist, guardarRespuestas };
