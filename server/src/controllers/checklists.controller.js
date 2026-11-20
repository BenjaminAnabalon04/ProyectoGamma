const db = require('../db');

// Se obtiene la plantilla del checklist por id_checklist, o por id_hoja / tipo_servicio

async function obtenerChecklist(req, res) {
  const { id_checklist } = req.params;
  const { id_hoja, tipo_servicio } = req.query;

  try {
    let checklistRow = null;

    if (id_checklist) {
      const r = await db.query(
        `SELECT id_checklist, nombre, tipo_servicio, version
           FROM checklist
          WHERE id_checklist = $1 AND activo = TRUE`,
        [id_checklist]
      );
      checklistRow = r.rows[0] || null;
    } else if (id_hoja) {
      // Si viene id_hoja, se intenta primero el checklist de la hoja o el asociado al tipo_servicio de la orden
      const rHoja = await db.query(
        `SELECT hs.id_checklist, ot.tipo_servicio
           FROM hoja_servicio hs
           JOIN asignacion a ON hs.id_asignacion = a.id_asignacion
           JOIN orden_trabajo ot ON a.id_orden = ot.id_orden
          WHERE hs.id_hoja = $1`,
        [id_hoja]
      );

      if (rHoja.rows.length === 0) {
        return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });
      }

      const { id_checklist: checklistDeHoja, tipo_servicio: tipoOrden } = rHoja.rows[0];

      if (tipoOrden) {
        const rTipo = await db.query(
          `SELECT id_checklist, nombre, tipo_servicio, version
             FROM checklist
            WHERE LOWER(tipo_servicio) = LOWER($1) AND activo = TRUE
            ORDER BY version DESC, id_checklist ASC
            LIMIT 1`,
          [tipoOrden]
        );
        checklistRow = rTipo.rows[0] || null;
      }

      if (!checklistRow && checklistDeHoja) {
        const rId = await db.query(
          `SELECT id_checklist, nombre, tipo_servicio, version
             FROM checklist
            WHERE id_checklist = $1 AND activo = TRUE`,
          [checklistDeHoja]
        );
        checklistRow = rId.rows[0] || null;
      }
    } else if (tipo_servicio) {
      const rTipo = await db.query(
        `SELECT id_checklist, nombre, tipo_servicio, version
           FROM checklist
          WHERE LOWER(tipo_servicio) = LOWER($1) AND activo = TRUE
          ORDER BY version DESC, id_checklist ASC
          LIMIT 1`,
        [tipo_servicio]
      );
      checklistRow = rTipo.rows[0] || null;
    } else {
      return res.status(400).json({ mensaje: 'Debes indicar id_checklist, id_hoja o tipo_servicio' });
    }

    if (!checklistRow) {
      return res.status(404).json({ mensaje: 'No se encontró un checklist activo para ese servicio' });
    }

    const itemsRes = await db.query(
      `SELECT id_item, pregunta, obligatorio, orden
         FROM item_checklist
        WHERE id_checklist = $1
        ORDER BY orden ASC, id_item ASC`,
      [checklistRow.id_checklist]
    );

    // Si se pasó id_hoja, devolvemos también las respuestas ya guardadas de esa hoja
    let respuestasPrevias = [];
    if (id_hoja) {
      const rResp = await db.query(
        `SELECT id_item, resultado, observacion
           FROM respuesta_checklist
          WHERE id_hoja = $1`,
        [id_hoja]
      );
      respuestasPrevias = rResp.rows;
    }

    return res.json({
      id_checklist: Number(checklistRow.id_checklist),
      nombre: checklistRow.nombre,
      tipo_servicio: checklistRow.tipo_servicio,
      version: checklistRow.version,
      items: itemsRes.rows.map((it) => ({
        id_item: Number(it.id_item),
        pregunta: it.pregunta,
        obligatorio: Boolean(it.obligatorio),
        orden: it.orden,
      })),
      respuestas: respuestasPrevias.map((rp) => ({
        id_item: Number(rp.id_item),
        resultado: rp.resultado || '',
        observacion: rp.observacion || '',
      })),
    });
  } catch (error) {
    console.error('Error al obtener checklist:', error.message);
    return res.status(500).json({ mensaje: 'Error al cargar el checklist' });
  }
}

// Guarda o actualiza respuestas del checklist para una hoja de servicio
async function guardarRespuestas(req, res) {
  const { id_hoja } = req.params;
  const { respuestas } = req.body || {};

  if (!id_hoja) {
    return res.status(400).json({ mensaje: 'Falta id_hoja' });
  }

  if (!Array.isArray(respuestas)) {
    return res.status(400).json({ mensaje: 'El campo respuestas debe ser un arreglo' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Verificamos que la hoja exista.
    const hojaRes = await client.query(
      'SELECT id_hoja FROM hoja_servicio WHERE id_hoja = $1',
      [id_hoja]
    );
    if (hojaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'La hoja de servicio no existe' });
    }

    let guardadas = 0;

    for (const resp of respuestas) {
      if (!resp || resp.id_item == null) continue;

      const idItemNum = Number(resp.id_item);
      const resultadoLimpio =
        resp.resultado === undefined || resp.resultado === null
          ? null
          : String(resp.resultado).trim() || null;
      const observacionLimpia =
        resp.observacion === undefined || resp.observacion === null
          ? null
          : String(resp.observacion);

      // Obtenemos el texto oficial de la pregunta desde item_checklist
      const itemRes = await client.query(
        'SELECT pregunta FROM item_checklist WHERE id_item = $1',
        [idItemNum]
      );
      if (itemRes.rows.length === 0) continue;

      const preguntaTexto = itemRes.rows[0].pregunta;

      await client.query(
        `INSERT INTO respuesta_checklist (id_hoja, id_item, pregunta_texto, resultado, observacion)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_hoja, id_item)
         DO UPDATE SET
           pregunta_texto = EXCLUDED.pregunta_texto,
           resultado = EXCLUDED.resultado,
           observacion = EXCLUDED.observacion`,
        [id_hoja, idItemNum, preguntaTexto, resultadoLimpio, observacionLimpia]
      );

      guardadas += 1;
    }

    await client.query('COMMIT');
    return res.json({ guardadas });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar respuestas de checklist:', error.message);
    return res.status(500).json({ mensaje: 'No se pudieron guardar las respuestas del checklist' });
  } finally {
    client.release();
  }
}

module.exports = {
  obtenerChecklist,
  guardarRespuestas,
};