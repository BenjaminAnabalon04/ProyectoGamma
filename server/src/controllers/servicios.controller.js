// Desarrollado por: Agustín Insunsa

const db = require('../db');
const { esUuid, enteroPositivo, texto, hojaDelTecnico } = require('../utils/validacion');

const RESULTADOS_PERMITIDOS = ['OPERATIVO', 'REQUIERE_SEGUIMIENTO', 'FUERA_DE_SERVICIO'];

function normalizarResultado(valor) {
  const limpio = texto(valor, 30);
  if (!limpio) return { valido: true, valor: null };
  const valorNormalizado = limpio.toUpperCase().replace(/[\s-]+/g, '_');
  return {
    valido: RESULTADOS_PERMITIDOS.includes(valorNormalizado),
    valor: valorNormalizado,
  };
}

function respuestaHoja(hoja) {
  return {
    id_hoja: hoja.id_hoja,
    id_checklist: Number(hoja.id_checklist),
    estado_servicio: hoja.estado_servicio,
    fecha_inicio: hoja.fecha_inicio,
  };
}

async function iniciar(req, res) {
  const { id_hoja, id_asignacion, id_dispositivo } = req.body || {};
  const idAsignacion = enteroPositivo(id_asignacion);

  if (!esUuid(id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }
  if (!idAsignacion) {
    return res.status(400).json({ mensaje: 'id_asignacion no es válido' });
  }

  try {
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
      return res.json(respuestaHoja(hoja));
    }

    const chk = await db.query(
      `SELECT id_checklist
         FROM checklist
        WHERE LOWER(tipo_servicio) = LOWER($1) AND activo = TRUE
        ORDER BY version DESC, id_checklist ASC
        LIMIT 1`,
      [asignacion.tipo_servicio]
    );
    if (chk.rows.length === 0) {
      return res
        .status(404)
        .json({ mensaje: 'No hay un checklist activo para este tipo de servicio' });
    }

    const nueva = await db.query(
      `INSERT INTO hoja_servicio (id_hoja, id_asignacion, id_checklist, fecha_inicio, id_dispositivo)
       VALUES ($1, $2, $3, now(), $4)
       RETURNING id_hoja, id_checklist, estado_servicio, fecha_inicio`,
      [id_hoja, idAsignacion, chk.rows[0].id_checklist, texto(id_dispositivo, 60)]
    );

    return res.status(201).json(respuestaHoja(nueva.rows[0]));
  } catch (error) {
    console.error('Error al iniciar servicio:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo iniciar el servicio' });
  }
}

async function obtenerHoja(req, res) {
  try {
    const hoja = await hojaDelTecnico(db, req.params.id_hoja, req.usuario.id_usuario, {
      permitirEnviada: true,
    });
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    const [respuestas, consumos, evidencias] = await Promise.all([
      db.query(
        `SELECT id_item, pregunta_texto, resultado, observacion
           FROM respuesta_checklist
          WHERE id_hoja = $1
          ORDER BY id_item`,
        [hoja.id_hoja]
      ),
      db.query(
        `SELECT cm.id_consumo, cm.id_material, m.nombre, m.unidad_medida, cm.cantidad
           FROM consumo_material cm
           JOIN material m ON m.id_material = cm.id_material
          WHERE cm.id_hoja = $1
          ORDER BY cm.fecha_registro, cm.id_consumo`,
        [hoja.id_hoja]
      ),
      db.query(
        `SELECT id_evidencia, tipo, clave_archivo, formato, nombre_firmante, rut_firmante
           FROM evidencia
          WHERE id_hoja = $1
          ORDER BY fecha_captura, id_evidencia`,
        [hoja.id_hoja]
      ),
    ]);

    const detalle = await db.query(
      `SELECT o.id_orden, o.codigo_orden_erp, o.titulo, o.tipo_servicio,
              c.razon_social AS cliente, e.nombre AS equipo
         FROM orden_trabajo o
         JOIN cliente c ON c.id_cliente = o.id_cliente
         LEFT JOIN equipo e ON e.id_equipo = o.id_equipo
        WHERE o.id_orden = $1`,
      [hoja.id_orden]
    );

    return res.json({
      ...respuestaHoja(hoja),
      id_asignacion: Number(hoja.id_asignacion),
      fecha_fin: hoja.fecha_fin,
      estado_envio_erp: hoja.estado_envio_erp,
      codigo_hoja_erp: hoja.codigo_hoja_erp,
      horometro_servicio: hoja.horometro_servicio,
      actividades: hoja.actividades,
      observaciones_tecnicas: hoja.observaciones_tecnicas,
      resultado: hoja.resultado,
      orden: detalle.rows[0] || null,
      respuestas: respuestas.rows,
      consumos: consumos.rows.map((consumo) => ({
        ...consumo,
        id_consumo: consumo.id_consumo,
        id_material: Number(consumo.id_material),
        cantidad: Number(consumo.cantidad),
      })),
      evidencias: evidencias.rows.map((evidencia) => ({
        ...evidencia,
        url: `/uploads/${evidencia.clave_archivo}`,
      })),
    });
  } catch (error) {
    console.error('Error al obtener hoja:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo obtener la hoja de servicio' });
  }
}

async function finalizar(req, res) {
  const { horometro_servicio, actividades, observaciones_tecnicas, resultado } = req.body || {};
  const resultadoValidado = normalizarResultado(resultado);

  if (!esUuid(req.params.id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }
  if (!resultadoValidado.valido) {
    return res.status(400).json({ mensaje: 'El resultado indicado no es válido' });
  }

  let horometro = null;
  if (horometro_servicio !== undefined && horometro_servicio !== null && horometro_servicio !== '') {
    horometro = Number(horometro_servicio);
    if (!Number.isFinite(horometro) || horometro < 0) {
      return res.status(400).json({ mensaje: 'El horómetro no es válido' });
    }
  }

  try {
    const hoja = await hojaDelTecnico(db, req.params.id_hoja, req.usuario.id_usuario);
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    if (hoja.estado_servicio === 'FINALIZADO') {
      return res.json({ id_hoja: hoja.id_hoja, estado_servicio: 'FINALIZADO' });
    }

    const faltantesRes = await db.query(
      `SELECT i.pregunta
         FROM item_checklist i
         LEFT JOIN respuesta_checklist r
                ON r.id_item = i.id_item AND r.id_hoja = $1
        WHERE i.id_checklist = $2
          AND i.obligatorio = TRUE
          AND (r.resultado IS NULL OR TRIM(r.resultado) = '')
        ORDER BY i.orden`,
      [hoja.id_hoja, hoja.id_checklist]
    );

    if (faltantesRes.rows.length > 0) {
      return res.status(400).json({
        mensaje: 'Faltan ítems obligatorios del checklist',
        faltantes: faltantesRes.rows.map((fila) => fila.pregunta),
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
      [
        hoja.id_hoja,
        horometro,
        texto(actividades, 4000),
        texto(observaciones_tecnicas, 4000),
        resultadoValidado.valor,
      ]
    );

    return res.json({
      id_hoja: hoja.id_hoja,
      estado_servicio: cierre.rows[0].estado_servicio,
      fecha_fin: cierre.rows[0].fecha_fin,
    });
  } catch (error) {
    console.error('Error al finalizar servicio:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo finalizar el servicio' });
  }
}

async function enviar(req, res) {
  if (!esUuid(req.params.id_hoja)) {
    return res.status(400).json({ mensaje: 'id_hoja debe ser un UUID válido' });
  }

  try {
    const hoja = await hojaDelTecnico(db, req.params.id_hoja, req.usuario.id_usuario, {
      permitirEnviada: true,
    });
    if (!hoja) return res.status(404).json({ mensaje: 'Hoja de servicio no encontrada' });

    if (hoja.estado_servicio !== 'FINALIZADO') {
      return res.status(409).json({ mensaje: 'Solo se puede enviar un servicio finalizado' });
    }

    if (hoja.estado_envio_erp === 'ENVIADO' || hoja.estado_envio_erp === 'SINCRONIZADO') {
      return res.json({
        estado_envio_erp: hoja.estado_envio_erp,
        codigo_hoja_erp: hoja.codigo_hoja_erp,
      });
    }
    const conteoEvidencias = await db.query(
      `SELECT COUNT(*) FILTER (WHERE tipo = 'foto')::int  AS fotos,
              COUNT(*) FILTER (WHERE tipo = 'firma')::int AS firmas
         FROM evidencia
        WHERE id_hoja = $1`,
      [hoja.id_hoja]
    );
    const fotos = conteoEvidencias.rows[0]?.fotos || 0;
    const firmas = conteoEvidencias.rows[0]?.firmas || 0;
    if (fotos < 1 || firmas < 1) {
      return res.status(409).json({
        mensaje: 'Debes adjuntar al menos una foto y una firma antes de enviar al ERP',
        faltantes: [
          ...(fotos < 1 ? ['al menos una foto'] : []),
          ...(firmas < 1 ? ['la firma del cliente'] : []),
        ],
      });
    }

    const completo = await db.query(
      `SELECT h.fecha_inicio, h.fecha_fin, h.horometro_servicio, h.actividades,
              h.observaciones_tecnicas, h.resultado, o.codigo_orden_erp, o.titulo
         FROM hoja_servicio h
         JOIN asignacion a ON a.id_asignacion = h.id_asignacion
         JOIN orden_trabajo o ON o.id_orden = a.id_orden
        WHERE h.id_hoja = $1`,
      [hoja.id_hoja]
    );

    const [respuestas, consumos, evidencias] = await Promise.all([
      db.query(
        `SELECT id_item, pregunta_texto, resultado, observacion
           FROM respuesta_checklist
          WHERE id_hoja = $1
          ORDER BY id_item`,
        [hoja.id_hoja]
      ),
      db.query(
        `SELECT m.codigo_material_erp, m.nombre, cm.cantidad, m.unidad_medida
           FROM consumo_material cm
           JOIN material m ON m.id_material = cm.id_material
          WHERE cm.id_hoja = $1
          ORDER BY cm.fecha_registro`,
        [hoja.id_hoja]
      ),
      db.query(
        `SELECT tipo, clave_archivo, formato, fecha_captura, latitud, longitud,
                nombre_firmante, rut_firmante
           FROM evidencia
          WHERE id_hoja = $1
          ORDER BY fecha_captura`,
        [hoja.id_hoja]
      ),
    ]);

    const paquete = {
      id_hoja: hoja.id_hoja,
      ...completo.rows[0],
      respuestas: respuestas.rows,
      consumos: consumos.rows,
      evidencias: evidencias.rows,
    };

    let respuestaErp;
    try {
      const resp = await fetch(`${process.env.ERP_URL || 'http://localhost:4000'}/erp/servicios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paquete),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`El ERP respondió ${resp.status}`);
      respuestaErp = await resp.json();
      if (!respuestaErp?.recibido) throw new Error('El ERP no confirmó la recepción');
    } catch (errorErp) {
      console.error('Error al enviar al ERP:', errorErp.message);
      await db.query(
        "UPDATE hoja_servicio SET estado_envio_erp = 'ERROR' WHERE id_hoja = $1",
        [hoja.id_hoja]
      );
      return res.status(502).json({
        mensaje: 'No se pudo enviar al ERP. Puedes reintentar.',
        estado_envio_erp: 'ERROR',
      });
    }

    await db.query(
      `UPDATE hoja_servicio
          SET estado_envio_erp = 'ENVIADO',
              codigo_hoja_erp = $2,
              fecha_envio_erp = now()
        WHERE id_hoja = $1`,
      [hoja.id_hoja, texto(respuestaErp.codigo_hoja_erp, 40)]
    );

    return res.json({
      estado_envio_erp: 'ENVIADO',
      codigo_hoja_erp: respuestaErp.codigo_hoja_erp,
    });
  } catch (error) {
    console.error('Error al enviar servicio:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo enviar el servicio' });
  }
}

module.exports = { iniciar, obtenerHoja, finalizar, enviar };
