const db = require('../db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/v1/servicios  -> inicia un servicio (crea la hoja de servicio).
async function iniciar(req, res) {
  const { id_hoja, id_asignacion } = req.body || {};
  const idAsignacion = Number(id_asignacion);

  if (!UUID_REGEX.test(String(id_hoja || ''))) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }
  if (!Number.isInteger(idAsignacion) || idAsignacion <= 0) {
    return res.status(400).json({ mensaje: 'id_asignacion no es válido' });
  }

  try {
    // La asignación debe existir, estar activa y ser del técnico que hace la petición.
    const asig = await db.query(
      `SELECT a.id_tecnico, a.activa, ot.tipo_servicio
         FROM asignacion a
         JOIN orden_trabajo ot ON ot.id_orden = a.id_orden
        WHERE a.id_asignacion = $1`,
      [idAsignacion]
    );
    const asignacion = asig.rows[0];

    if (
      !asignacion ||
      !asignacion.activa ||
      Number(asignacion.id_tecnico) !== req.usuario.id_usuario
    ) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }

    // Si el celular reenvía el mismo id_hoja, se devuelve la que ya existe (no se duplica).
    const existente = await db.query(
      `SELECT id_hoja, id_asignacion, id_checklist, estado_servicio, fecha_inicio
         FROM hoja_servicio
        WHERE id_hoja = $1`,
      [id_hoja]
    );
    if (existente.rows.length > 0) {
      const hoja = existente.rows[0];
      if (Number(hoja.id_asignacion) !== idAsignacion) {
        return res.status(409).json({ mensaje: 'Ese id_hoja ya pertenece a otro servicio' });
      }
      return res.json({
        id_hoja: hoja.id_hoja,
        id_checklist: Number(hoja.id_checklist),
        estado_servicio: hoja.estado_servicio,
        fecha_inicio: hoja.fecha_inicio,
      });
    }

    // El checklist se elige según el tipo de servicio de la orden.
    const chk = await db.query(
      `SELECT id_checklist
         FROM checklist
        WHERE LOWER(tipo_servicio) = LOWER($1) AND activo = TRUE
        ORDER BY version DESC, id_checklist ASC
        LIMIT 1`,
      [asignacion.tipo_servicio]
    );
    if (chk.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No hay un checklist activo para este tipo de servicio' });
    }

    const nueva = await db.query(
      `INSERT INTO hoja_servicio (id_hoja, id_asignacion, id_checklist, fecha_inicio)
       VALUES ($1, $2, $3, now())
       RETURNING id_hoja, id_checklist, estado_servicio, fecha_inicio`,
      [id_hoja, idAsignacion, chk.rows[0].id_checklist]
    );
    const hoja = nueva.rows[0];

    res.status(201).json({
      id_hoja: hoja.id_hoja,
      id_checklist: Number(hoja.id_checklist),
      estado_servicio: hoja.estado_servicio,
      fecha_inicio: hoja.fecha_inicio,
    });
  } catch (error) {
    console.error('Error al iniciar servicio:', error.message);
    res.status(500).json({ mensaje: 'No se pudo iniciar el servicio' });
  }
}

//

// PUT /api/v1/servicios/:id_hoja/finalizar  -> cierra la hoja de servicio.
async function finalizar(req, res) {
  const { id_hoja } = req.params;
  const { horometro_servicio, actividades, observaciones_tecnicas, resultado } = req.body || {};

  if (!UUID_REGEX.test(String(id_hoja))) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }

  let horometro = null;
  if (horometro_servicio !== undefined && horometro_servicio !== null && horometro_servicio !== '') {
    horometro = Number(horometro_servicio);
    if (!Number.isFinite(horometro) || horometro < 0) {
      return res.status(400).json({ mensaje: 'El horómetro no es válido' });
    }
  }

  try {
    // La hoja debe existir y ser de una asignación del técnico que hace la petición.
    const hojaRes = await db.query(
      `SELECT hs.id_checklist, hs.estado_servicio, a.id_tecnico
         FROM hoja_servicio hs
         JOIN asignacion a ON a.id_asignacion = hs.id_asignacion
        WHERE hs.id_hoja = $1`,
      [id_hoja]
    );
    const hoja = hojaRes.rows[0];

    if (!hoja || Number(hoja.id_tecnico) !== req.usuario.id_usuario) {
      return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });
    }

    // Si ya estaba finalizada, se responde igual (así un reintento no falla).
    if (hoja.estado_servicio === 'FINALIZADO') {
      return res.json({ id_hoja, estado_servicio: 'FINALIZADO' });
    }

    // Ítems obligatorios del checklist que no tienen respuesta.
    const faltantesRes = await db.query(
      `SELECT i.pregunta
         FROM item_checklist i
         LEFT JOIN respuesta_checklist r
                ON r.id_item = i.id_item AND r.id_hoja = $1
        WHERE i.id_checklist = $2
          AND i.obligatorio = TRUE
          AND (r.resultado IS NULL OR TRIM(r.resultado) = '')
        ORDER BY i.orden`,
      [id_hoja, hoja.id_checklist]
    );

    if (faltantesRes.rows.length > 0) {
      return res.status(400).json({
        mensaje: 'Faltan ítems obligatorios del checklist',
        faltantes: faltantesRes.rows.map((f) => f.pregunta),
      });
    }

    const cierre = await db.query(
      `UPDATE hoja_servicio
          SET fecha_fin = now(),
              estado_servicio = 'FINALIZADO',
              horometro_servicio = $2,
              actividades = $3,
              observaciones_tecnicas = $4,
              resultado = $5
        WHERE id_hoja = $1
        RETURNING estado_servicio, fecha_fin`,
      [id_hoja, horometro, actividades ?? null, observaciones_tecnicas ?? null, resultado ?? null]
    );

    res.json({
      id_hoja,
      estado_servicio: cierre.rows[0].estado_servicio,
      fecha_fin: cierre.rows[0].fecha_fin,
    });
  } catch (error) {
    console.error('Error al finalizar servicio:', error.message);
    res.status(500).json({ mensaje: 'No se pudo finalizar el servicio' });
  }
}

module.exports = { iniciar, finalizar };