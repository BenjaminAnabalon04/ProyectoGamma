// Desarrollado por: Agustín Insunsa

const db = require('../db');
const { enteroPositivo, texto } = require('../utils/validacion');

const CAMPOS_ORDEN = `
  o.id_orden,
  a.id_asignacion,
  o.codigo_orden_erp,
  o.titulo,
  o.descripcion,
  o.tipo_servicio,
  o.prioridad,
  o.fecha_programada,
  o.estado,
  c.razon_social AS cliente,
  e.nombre AS equipo,
  e.codigo_qr AS codigo_qr_equipo,
  e.numero_serie,
  e.numero_ficha,
  e.horometro_actual,
  e.ultima_mantencion,
  e.ubicacion,
  e.estado_general,
  h.estado_servicio,
  h.estado_envio_erp,
  h.id_hoja AS id_hoja_servicio,
  h.fecha_inicio AS fecha_inicio_servicio,
  h.fecha_fin AS fecha_fin_servicio,
  pr.estado AS presupuesto_estado
`;

const UNION_ORDEN = `
  FROM asignacion a
  JOIN orden_trabajo o ON o.id_orden = a.id_orden
  JOIN cliente c ON c.id_cliente = o.id_cliente
  LEFT JOIN equipo e ON e.id_equipo = o.id_equipo
  LEFT JOIN LATERAL (
    SELECT hs.estado_servicio, hs.estado_envio_erp, hs.id_hoja,
           hs.fecha_inicio, hs.fecha_fin
      FROM hoja_servicio hs
     WHERE hs.id_asignacion = a.id_asignacion
     ORDER BY hs.fecha_inicio DESC NULLS LAST, hs.id_hoja DESC
     LIMIT 1
  ) h ON TRUE
  LEFT JOIN LATERAL (
    SELECT p.estado
      FROM presupuesto p
     WHERE p.id_hoja = h.id_hoja
     ORDER BY p.fecha_creacion DESC
     LIMIT 1
  ) pr ON TRUE
`;

function convertir(fila) {
  let estado = fila.estado;
  if (fila.estado_servicio === 'EN_EJECUCION') {
    estado = 'EN_EJECUCION';
  } else if (
    fila.estado_servicio === 'FINALIZADO' &&
    (fila.presupuesto_estado === 'ENVIADO' || fila.presupuesto_estado === 'EN_COSTEO')
  ) {
    estado = 'EN_REVISION';
  } else if (
    fila.estado_envio_erp === 'ENVIADO' ||
    fila.estado_envio_erp === 'SINCRONIZADO' ||
    (fila.estado_servicio === 'FINALIZADO' && fila.presupuesto_estado === 'APROBADO')
  ) {
    estado = 'COMPLETADO';
  } else if (fila.estado_servicio === 'FINALIZADO') {
    estado = 'FINALIZADO';
  }

  return {
    id_orden: Number(fila.id_orden),
    id_asignacion: Number(fila.id_asignacion),
    codigo_orden_erp: fila.codigo_orden_erp,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    tipo_servicio: fila.tipo_servicio,
    prioridad: fila.prioridad,
    fecha_programada: fila.fecha_programada,
    estado,
    estado_servicio: fila.estado_servicio || null,
    estado_envio_erp: fila.estado_envio_erp || null,
    presupuesto_estado: fila.presupuesto_estado || null,
    id_hoja: fila.id_hoja_servicio || null,
    fecha_inicio_servicio: fila.fecha_inicio_servicio || null,
    fecha_fin_servicio: fila.fecha_fin_servicio || null,
    cliente: fila.cliente,
    equipo: fila.equipo,
    codigo_qr_equipo: fila.codigo_qr_equipo,
    numero_serie: fila.numero_serie,
    numero_ficha: fila.numero_ficha,
    horometro_actual: fila.horometro_actual === null ? null : Number(fila.horometro_actual),
    ultima_mantencion: fila.ultima_mantencion,
    ubicacion: fila.ubicacion,
    estado_general: fila.estado_general,
  };
}

async function misTrabajos(req, res) {
  try {
    const resultado = await db.query(
      `SELECT ${CAMPOS_ORDEN}
         ${UNION_ORDEN}
        WHERE a.id_tecnico = $1 AND a.activa = TRUE
        ORDER BY o.fecha_programada ASC NULLS LAST, o.id_orden ASC`,
      [req.usuario.id_usuario]
    );
    res.json(resultado.rows.map(convertir));
  } catch (error) {
    console.error('Error al obtener órdenes:', error.message);
    res.status(500).json({ mensaje: 'No se pudieron obtener las órdenes' });
  }
}

async function obtenerOrden(req, res) {
  const idOrden = enteroPositivo(req.params.id_orden);
  if (!idOrden) return res.status(400).json({ mensaje: 'id_orden no es válido' });

  try {
    const resultado = await db.query(
      `SELECT ${CAMPOS_ORDEN}
         ${UNION_ORDEN}
        WHERE a.id_tecnico = $1 AND a.activa = TRUE AND o.id_orden = $2`,
      [req.usuario.id_usuario, idOrden]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }
    return res.json(convertir(resultado.rows[0]));
  } catch (error) {
    console.error('Error al obtener orden:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo obtener la orden' });
  }
}

async function obtenerPorQr(req, res) {
  const codigo = texto(req.params.codigo, 60);
  if (!codigo) return res.status(400).json({ mensaje: 'Código QR no válido' });

  try {
    const resultado = await db.query(
      `SELECT ${CAMPOS_ORDEN}
         ${UNION_ORDEN}
        WHERE a.id_tecnico = $1 AND a.activa = TRUE
          AND (e.codigo_qr = $2 OR o.codigo_orden_erp = $2)
        ORDER BY o.id_orden ASC
        LIMIT 1`,
      [req.usuario.id_usuario, codigo]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No hay una orden asignada con ese código QR' });
    }
    return res.json(convertir(resultado.rows[0]));
  } catch (error) {
    console.error('Error al buscar orden por QR:', error.message);
    return res.status(500).json({ mensaje: 'No se pudo buscar la orden' });
  }
}

module.exports = { misTrabajos, obtenerOrden, obtenerPorQr };
